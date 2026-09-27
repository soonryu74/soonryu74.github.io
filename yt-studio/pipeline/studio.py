#!/usr/bin/env python3
"""유튜브 자동화 스튜디오 — 명령어 한 줄로 주제 → 대본 → 음성 → 영상 → 썸네일 → 업로드.

  python studio.py doctor                  준비 상태 점검
  python studio.py plan "주제"             대본(project.json) 만들기
  python studio.py make projects/폴더      영상·썸네일·자막 만들기
  python studio.py upload projects/폴더    유튜브에 (비공개로) 올리기
  python studio.py auto "주제" [--upload]  위 세 단계를 한 번에
  python studio.py batch topics.txt        주제 목록을 차례로 처리 (예약 실행용)
  python studio.py voices                  쓸 수 있는 한국어 목소리 보기

  [SaGA 일터아카데미 캠페인]
  python studio.py column 녹음.mp3 --title "…" --name "…"      극동방송 1분 칼럼 → 쇼츠
  python studio.py miracle 녹음.mp3 --title "…"                  극동방송 칼럼 → '3분 미라클'형 가로 영상
  python studio.py clip 강의.mp4 --series dean --count 3         긴 강의 → 핵심 쇼츠
  python studio.py referral init / referral make                 추천 영상 0~7번 틀 만들기 / 영상 만들기
  python studio.py compose 장면대본.json                          장면 대본 하나로 영상 만들기
  python studio.py thumb 사진.jpg --quote "…*강조*…"              새롭게하소서형 썸네일
  python studio.py transcribe 파일                                받아쓰기만 (자막 파일)
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

if sys.platform == "win32":  # 윈도우 콘솔에서 한글이 깨지지 않게
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass

from ytauto import assemble, llm, media, thumbs, tts, visuals
from ytauto.config import HERE, load_config
from ytauto.fonts import font_set
from ytauto.prompts import build_plan_prompt, check_title, extract_json, normalize_plan

PROJECTS = HERE / "projects"


def slugify(text: str) -> str:
    s = re.sub(r"[^\w가-힣]+", "-", text).strip("-")
    return s[:40] or "video"


def project_path(arg: str) -> Path:
    p = Path(arg)
    if p.is_dir():
        p = p / "project.json"
    if not p.exists():
        cand = PROJECTS / arg / "project.json"
        if cand.exists():
            return cand
        sys.exit(f"project.json 을 찾지 못했어요: {arg}")
    return p


# ── 1. 대본 ────────────────────────────────────────────────
def cmd_plan(args, cfg) -> Path:
    fmt = "shorts" if args.shorts else "long"
    print(f"▶ 대본 작성 중… ({cfg['llm']['provider']}, {'쇼츠' if args.shorts else f'{args.minutes:g}분'})")
    messages = build_plan_prompt(args.topic, fmt, args.minutes, args.audience,
                                 cfg.get("persona", ""), args.extra)
    last_err = None
    for attempt in range(3):  # 작은 로컬 모델은 JSON 을 가끔 틀리므로 다시 시도
        try:
            plan = normalize_plan(extract_json(llm.chat(messages, cfg["llm"])), args.topic, fmt)
            break
        except (ValueError, json.JSONDecodeError) as e:
            last_err = e
            print(f"  ! 대본 형식이 어긋나 다시 시도합니다 ({attempt + 1}/3): {e}")
    else:
        sys.exit(f"대본을 만들지 못했어요: {last_err}")
    folder = PROJECTS / f"{dt.date.today():%Y%m%d}-{slugify(args.topic)}"
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / "project.json"
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✔ 제목: {plan['title']}")
    for c in plan["title_candidates"]:
        bad = check_title(c)
        print(f"   · {c}" + (f"   ← 금지어: {', '.join(bad)}" if bad else ""))
    print(f"✔ 장면 {len(plan['scenes'])}개 → {out}")
    print("  (project.json 을 메모장으로 열어 대본을 고친 뒤 make 를 실행해도 됩니다)")
    return folder


# ── 2. 제작 ────────────────────────────────────────────────
def _voice_for(scene: dict, idx: int, work: Path, tcfg: dict) -> tuple[Path, list]:
    mp3 = work / "voice" / f"scene{idx:02d}.mp3"
    meta = mp3.with_suffix(".json")
    key = hashlib.md5(json.dumps([scene["narration"], tcfg], sort_keys=True,
                                 ensure_ascii=False).encode()).hexdigest()
    if mp3.exists() and meta.exists():
        saved = json.loads(meta.read_text(encoding="utf-8"))
        if saved.get("key") == key:  # 대본이 그대로면 다시 만들지 않는다
            return mp3, [tuple(c) for c in saved["cues"]]
    cues = tts.synthesize(scene["narration"], mp3, tcfg)
    meta.write_text(json.dumps({"key": key, "cues": cues}, ensure_ascii=False), encoding="utf-8")
    return mp3, cues


def _still_of(path: Path, work: Path) -> Path | None:
    """썸네일에 쓸 메인 화면. 영상이면 1초 지점 한 장면을 캡처한다."""
    if path.suffix.lower() in visuals.IMAGE_EXT:
        return path
    if path.suffix.lower() in visuals.VIDEO_EXT:
        out = work / "frames" / "main_still.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            media.run(["-ss", "1", "-i", str(path), "-frames:v", "1", "-q:v", "2", str(out)])
            return out
        except RuntimeError:
            return None
    return None


def _main_image_override(project: dict, work: Path) -> Path | None:
    p = project.get("thumbnail_image")
    if not p:
        return None
    p = Path(p).expanduser()
    p = p if p.is_absolute() else work / p
    return _still_of(p, work) if p.exists() else None


def _chapters(starts: list[tuple[float, str]], total: float) -> str:
    """유튜브 챕터 규칙: 00:00 시작, 3개 이상, 각 10초 이상. 안 맞으면 넣지 않는다."""
    ends = [t for t, _ in starts[1:]] + [total]
    if len(starts) < 3 or any(e - t < 10 for (t, _), e in zip(starts, ends)):
        return ""
    rows = []
    for t, name in starts:
        m, s = divmod(int(t), 60)
        rows.append(f"{m:02d}:{s:02d} {name}")
    return "\n".join(rows)


def cmd_make(args, cfg) -> Path:
    pj = project_path(args.project)
    work = pj.parent
    project = json.loads(pj.read_text(encoding="utf-8"))
    fmt = project.get("format", "long")
    if args.fresh:
        for sub in ("visuals", "voice", "scenes", "captions", "frames"):
            shutil.rmtree(work / sub, ignore_errors=True)
    fonts = font_set(cfg)
    channel = cfg.get("channel_name", "")
    scenes = project["scenes"]
    n = len(scenes)
    parts, srt, chapter_marks, t0 = [], [], [], 0.0
    main_image = _main_image_override(project, work)
    for i, sc in enumerate(scenes, 1):
        print(f"▶ 장면 {i}/{n}: {sc.get('keyword') or sc['narration'][:20]}")
        voice, cues = _voice_for(sc, i, work, cfg["tts"])
        bg = visuals.make_visual(sc, i, n, work, fmt, cfg, fonts, channel)
        if main_image is None and "_card" not in bg.name:
            main_image = _still_of(bg, work)
        clip, dur, chunks = assemble.build_scene(i, bg, voice, cues, work, fmt, cfg, fonts)
        parts.append(clip)
        chapter_marks.append((t0, sc.get("keyword") or sc["narration"][:18]))
        srt += [(t0 + a, t0 + b, text) for a, b, text in chunks]
        t0 += dur
    video = work / ("shorts.mp4" if fmt == "shorts" else "video.mp4")
    print("▶ 장면 이어 붙이는 중…")
    assemble.concat(parts, video, cfg["video"].get("bgm_path", ""), cfg["video"].get("bgm_volume", 0.12))
    assemble.write_srt(srt, work / "subtitles.srt")
    if main_image is None and project.get("thumbnail_visual") and \
            cfg["visual"]["provider"] not in ("card", "folder"):
        pic = visuals.make_visual({"visual": project["thumbnail_visual"]}, 0, n, work, "long", cfg,
                                  fonts, channel)
        main_image = None if "_card" in pic.name else _still_of(pic, work)
    thumb_files = thumbs.make_variants(work, project, fonts, cfg["thumbnail"], main_image, channel)

    desc = project.get("description", "")
    chapters = _chapters(chapter_marks, t0) if fmt == "long" else ""
    if chapters:
        desc += "\n\n" + chapters
    if fmt == "shorts" and "#Shorts" not in desc:
        desc += "\n\n#Shorts"
    footer = cfg["upload"].get("description_footer", "")
    if footer:
        desc += "\n\n" + footer
    tags = project.get("tags", [])
    desc += "\n\n" + " ".join("#" + t.replace(" ", "") for t in tags[:3])
    meta = {"title": project["title"], "description": desc.strip(), "tags": tags}
    (work / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (work / "업로드정보.txt").write_text(
        f"[제목]\n{meta['title']}\n\n[설명]\n{meta['description']}\n\n[태그]\n{', '.join(tags)}\n",
        encoding="utf-8")
    m, s = divmod(int(t0), 60)
    print(f"✔ 완성: {video}  ({m}분 {s}초)")
    print(f"✔ 썸네일 {len(thumb_files)}종: {', '.join(p.name for p in thumb_files)}\n✔ 자막: {work / 'subtitles.srt'}\n✔ 제목·설명: {work / '업로드정보.txt'}")
    return work


# ── 3. 업로드 ──────────────────────────────────────────────
def cmd_upload(args, cfg) -> str:
    from ytauto.upload import upload
    work = project_path(args.project).parent
    video = next((p for p in (work / "video.mp4", work / "shorts.mp4") if p.exists()), None)
    if not video:
        sys.exit("영상이 아직 없어요. 먼저 make 를 실행해 주세요.")
    meta = json.loads((work / "meta.json").read_text(encoding="utf-8"))
    privacy = "public" if args.public else None
    vid = upload(video, meta, cfg["upload"], work / "thumbnail.jpg", work / "subtitles.srt",
                 privacy, args.publish_at)
    (work / "uploaded.txt").write_text(f"https://youtu.be/{vid}\n", encoding="utf-8")
    return vid


def cmd_auto(args, cfg):
    folder = cmd_plan(args, cfg)
    args.project, args.fresh = str(folder), False
    cmd_make(args, cfg)
    if args.upload:
        cmd_upload(args, cfg)


def cmd_batch(args, cfg):
    topics_file = Path(args.topics)
    done_file = PROJECTS / "_batch_done.txt"
    done = set(done_file.read_text(encoding="utf-8").splitlines()) if done_file.exists() else set()
    todo = [l.strip() for l in topics_file.read_text(encoding="utf-8").splitlines()
            if l.strip() and not l.strip().startswith("#") and l.strip() not in done]
    if not todo:
        print("새로 만들 주제가 없어요.")
        return
    for topic in todo[: args.limit]:
        print(f"\n━━ {topic} ━━")
        args.topic = topic
        try:
            cmd_auto(args, cfg)
        except SystemExit as e:
            print(f"  ✖ 건너뜀: {e}")
            continue
        except Exception as e:
            print(f"  ✖ 오류로 건너뜀: {e}")
            continue
        PROJECTS.mkdir(exist_ok=True)
        with open(done_file, "a", encoding="utf-8") as f:
            f.write(topic + "\n")


# ── 점검 ──────────────────────────────────────────────────
def cmd_doctor(args, cfg):
    ok = lambda m: print("  ✔ " + m)
    bad = lambda m: print("  ✖ " + m)
    print("준비 상태 점검")
    (ok if sys.version_info >= (3, 10) else bad)(f"파이썬 {sys.version.split()[0]} (3.10 이상 필요)")
    try:
        ok(f"ffmpeg: {media.ffmpeg_exe()}")
    except Exception as e:
        bad(str(e))
    try:
        fs = font_set(cfg)
        ok("글꼴: " + " · ".join(f"{k}={Path(v).name}" for k, v in fs.items()))
    except Exception as e:
        bad(f"한글 글꼴: {e}")
    L = cfg["llm"]
    if L["provider"] in ("lmstudio", "ollama", "openai-compatible"):
        try:
            models = llm.list_models(L)
            ok(f"로컬 AI 연결 ({L['base_url']}): 모델 {len(models)}개 {models[:3]}")
        except Exception as e:
            bad(f"로컬 AI 연결 안 됨 ({L['base_url']}) — 서버를 켜 주세요. ({type(e).__name__})")
    else:
        ok(f"대본 AI: {L['provider']}")
    try:
        import edge_tts  # noqa: F401
        ok("음성(edge-tts) 준비됨")
    except ImportError:
        bad("edge-tts 없음: pip install edge-tts")
    try:
        import googleapiclient  # noqa: F401
        from ytauto.upload import CLIENT_SECRET
        (ok if CLIENT_SECRET.exists() else bad)(
            "유튜브 업로드 키(client_secret.json) " + ("있음" if CLIENT_SECRET.exists() else "없음 — 업로드할 때만 필요"))
    except ImportError:
        print("  · 업로드 패키지 없음 (업로드할 때만 필요)")
    print(f"  · 장면 그림 방식: {cfg['visual']['provider']}")


def cmd_voices(args, cfg):
    for v in asyncio.run(tts.korean_voices()):
        print(" ", v)


# ── SaGA 캠페인 ────────────────────────────────────────────
SAGA = PROJECTS / "saga"


def _read_text(p: str) -> str:
    if not p:
        return ""
    q = Path(p)
    return q.read_text(encoding="utf-8") if q.exists() else p


def cmd_column(args, cfg):
    from ytauto import column
    stem = Path(args.audio).stem
    work = SAGA / args.series / slugify(args.out or stem)
    print(f"▶ 칼럼 영상 만들기: {args.audio}")
    out = column.make(args.audio, work, cfg, font_set(cfg), args.title, args.name, args.role, args.photo,
                      _read_text(args.script), args.images, args.series, "long" if args.wide else "shorts")
    print(f"✔ 완성: {out}")
    _series_thumbs(work, args, cfg)


def cmd_miracle(args, cfg):
    from ytauto import miracle, series
    work = SAGA / args.series / slugify(args.out or Path(args.audio).stem)
    print(f"▶ 3분 미라클형 가로 영상: {args.audio}")
    fonts = font_set(cfg)
    english = "auto" if args.english == "auto" else _read_text(args.english)
    out = miracle.make(args.audio, work, cfg, fonts, args.title, args.series, args.series_title, args.name,
                       args.role, args.photo, _read_text(args.script), args.images, english, args.visual,
                       args.bug, args.music)
    print(f"✔ 완성: {out}")
    scenes = json.loads((work / "scenes.json").read_text(encoding="utf-8"))
    bg = Path(args.shot) if args.shot else next((Path(s["bg"]) for s in scenes[1:] if s.get("bg")), None)
    th = miracle.miracle_thumbnail(work / "thumb_miracle.jpg", args.thumb or args.title, fonts, bg,
                                   args.series_title, args.ghost, series.get(args.series)["theme"])
    print(f"✔ 썸네일: {th}")


def _series_thumbs(work: Path, args, cfg):
    """썸네일(가로)도 함께: --quote 가 있으면 새롭게하소서형."""
    from ytauto import series
    if not getattr(args, "quote", ""):
        return
    proj = {"title": args.title, "thumbnail_quote": args.quote.replace("\\n", "\n"),
            "thumbnail_name": args.name, "thumbnail_role": args.role,
            "thumbnail_kicker": getattr(args, "kicker", "") or ""}
    shot = Path(args.shot) if getattr(args, "shot", "") else None
    tcfg = dict(cfg["thumbnail"], logo_text="SaGA 일터아카데미")
    files = thumbs.make_variants(work, proj, font_set(cfg), tcfg, shot, "", series.get(args.series)["theme"])
    print("✔ 썸네일: " + ", ".join(f.name for f in files))


def cmd_clip(args, cfg):
    from ytauto import clipper
    work = SAGA / args.series / slugify(args.out or Path(args.video).stem)
    print(f"▶ 강의에서 쇼츠 뽑기: {args.video} ({args.count}편)")
    outs = clipper.make(args.video, work, cfg, font_set(cfg), args.series, args.count, args.name, args.role,
                        args.fit, args.crop_x, _read_text(args.script), args.source_url,
                        "long" if args.wide else "shorts")
    print("✔ 완성:\n  " + "\n  ".join(str(o) for o in outs))
    print(f"  구간·제목을 바꾸려면 {work / 'clips.json'} 을 고치고 같은 명령을 다시 실행하세요.")


def cmd_referral(args, cfg):
    from ytauto import compose, referral
    root = SAGA / "referral"
    if args.action == "init":
        files = referral.init(root)
        print(f"✔ 장면 대본 {len(files)}개: {root / 'recipes'}")
        print(f"  필요한 촬영·사진 목록: {root / 'media' / '필요한_파일.txt'}")
        return
    recipes = sorted((root / "recipes").glob("*.json"))
    if not recipes:
        sys.exit("먼저 python studio.py referral init 을 실행해 주세요.")
    if args.only:
        keep = {k.strip() for k in args.only.split(",")}
        recipes = [r for r in recipes if r.stem.split("_")[0] in keep]
    fmts = ["shorts", "long"] if args.format == "both" else [args.format]
    for r in recipes:
        for fmt in fmts:
            print(f"▶ {r.stem} ({'세로' if fmt == 'shorts' else '가로'})")
            print(f"  ✔ {compose.render(r, cfg, font_set(cfg), fmt)}")


def cmd_compose(args, cfg):
    from ytauto import compose
    fmts = ["shorts", "long"] if args.format == "both" else [args.format]
    for fmt in fmts:
        print(f"✔ {compose.render(Path(args.recipe), cfg, font_set(cfg), fmt)}")


def cmd_thumb(args, cfg):
    from ytauto import series
    out_dir = Path(args.out or ".")
    proj = {"title": args.quote.replace("*", ""), "thumbnail_quote": args.quote.replace("\\n", "\n"),
            "thumbnail_name": args.name, "thumbnail_role": args.role, "thumbnail_kicker": args.kicker,
            "thumbnail_side": args.side, "thumbnail_text": args.quote.replace("*", "")}
    if args.notes:
        proj["thumbnail_notes"] = [{"text": t, "x": 0.72, "y": 0.16 + 0.1 * i} for i, t in enumerate(args.notes.split("|"))]
    tcfg = dict(cfg["thumbnail"], logo_text=args.logo)
    files = thumbs.make_variants(out_dir, proj, font_set(cfg), tcfg, Path(args.photo) if args.photo else None,
                                 "", series.get(args.series)["theme"])
    print("✔ " + ", ".join(str(f) for f in files))


def cmd_transcribe(args, cfg):
    from ytauto import transcribe as tr
    from ytauto.assemble import write_srt
    cues = tr.transcribe(args.file, cfg.get("transcribe", {}), _read_text(args.script))
    out = Path(args.file).with_suffix(".srt")
    write_srt(cues, out)
    print(f"✔ {out}  ({len(cues)}문장)")


def cmd_cheer(args, cfg):
    from ytauto import cheer
    work = SAGA / args.series / slugify(args.out or Path(args.videos[0]).stem)
    at = [[float(x) for x in grp.split(",") if x] for grp in args.at.split("/")] if args.at else None
    print(f"▶ 응원 릴레이 쇼츠: {', '.join(args.videos)}")
    out = cheer.make(args.videos, work, cfg, font_set(cfg), args.label, args.title, args.shout, args.sub,
                     args.series, args.fit, args.crop_x, args.outro, args.between, args.tag, args.tag_role,
                     "long" if args.wide else "shorts", at, args.music, not args.no_sfx, args.music_volume)
    print(f"✔ 완성: {out}")


def cmd_facecheck(args, cfg):
    from ytauto import faces
    v = Path(args.video)
    base = v.with_suffix("") / "base.mp4"
    if not base.exists():
        cands = list(v.parent.glob(v.stem + "*/base.mp4")) + list(v.parent.glob("*/base.mp4"))
        base = cands[0] if cands else None
    if not base:
        sys.exit("비교할 원본(base.mp4)을 찾지 못했어요. 이 도구로 만든 영상만 검사할 수 있어요.")
    bad, n = faces.verify(str(base), str(v))
    print(f"{n}프레임 검사 → " + ("얼굴을 가린 순간 없음 ✔" if not bad else
          "얼굴을 가린 순간: " + ", ".join(f"{t}초({p}%)" for t, p in bad[:15])))


def main():
    ap = argparse.ArgumentParser(description="유튜브 자동화 스튜디오")
    ap.add_argument("--config", help="설정 파일 경로 (기본: pipeline/config.json)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def plan_opts(p):
        p.add_argument("--shorts", action="store_true", help="세로 쇼츠로 만들기")
        p.add_argument("--minutes", type=float, default=5, help="가로 영상 목표 길이(분)")
        p.add_argument("--audience", default="", help="주 시청자 (예: 50대 직장인)")
        p.add_argument("--extra", default="", help="추가 요청 사항")

    p = sub.add_parser("plan", help="주제로 대본 만들기")
    p.add_argument("topic")
    plan_opts(p)
    p = sub.add_parser("make", help="대본으로 영상 만들기")
    p.add_argument("project")
    p.add_argument("--fresh", action="store_true", help="음성·그림을 처음부터 다시 만들기")
    p = sub.add_parser("upload", help="유튜브에 올리기 (기본 비공개)")
    p.add_argument("project")
    p.add_argument("--public", action="store_true", help="바로 공개로 올리기")
    p.add_argument("--publish-at", default=None, help="예약 공개 시각 예: 2026-10-01T09:00:00+09:00")

    for name in ("auto", "batch"):
        p = sub.add_parser(name, help="plan → make (→ upload) 한 번에" if name == "auto"
                           else "주제 목록 파일을 차례로 처리")
        p.add_argument("topics" if name == "batch" else "topic")
        plan_opts(p)
        p.add_argument("--upload", action="store_true", help="만든 뒤 바로 업로드(비공개)")
        p.add_argument("--public", action="store_true")
        p.add_argument("--publish-at", default=None)
        if name == "batch":
            p.add_argument("--limit", type=int, default=1, help="한 번에 만들 영상 수 (기본 1)")

    sp = sub.add_parser("column", help="녹음 파일 → 칼럼 쇼츠")
    sp.add_argument("audio")
    sp.add_argument("--title", required=True, help='화면 위 제목. 줄바꿈 \\n, 강조 *단어*')
    sp.add_argument("--name", default="", help="칼럼니스트 이름")
    sp.add_argument("--role", default="", help="직함")
    sp.add_argument("--photo", default="", help="칼럼니스트 사진")
    sp.add_argument("--script", default="", help="원고 파일(.txt) — 있으면 자막이 정확해요")
    sp.add_argument("--images", default="", help="장면 사진 폴더(선택)")
    sp.add_argument("--series", default="column")
    sp.add_argument("--out", default="", help="결과 폴더 이름")
    sp.add_argument("--wide", action="store_true", help="가로(16:9)로 만들기")
    sp.add_argument("--quote", default="", help="썸네일 인용 문구(선택)")
    sp.add_argument("--shot", default="", help="썸네일 배경 사진(선택)")
    sp.add_argument("--kicker", default="")

    sp = sub.add_parser("miracle", help="녹음 파일 → '3분 미라클'형 가로 영상")
    sp.add_argument("audio")
    sp.add_argument("--title", required=True, help="타이틀 화면 아래 제목")
    sp.add_argument("--series-title", default="극동방송 1분 칼럼", help="타이틀 화면 큰 글씨")
    sp.add_argument("--name", default="")
    sp.add_argument("--role", default="")
    sp.add_argument("--photo", default="", help="첫 장면에 쓸 칼럼니스트 사진(선택)")
    sp.add_argument("--script", default="", help="원고 파일(.txt)")
    sp.add_argument("--images", default="", help="장면 사진 폴더(있으면 AI 그림 대신)")
    sp.add_argument("--english", default="", help="영어 원고 파일(한 줄 = 한 문장) 또는 auto(AI 번역)")
    sp.add_argument("--visual", default="ai", choices=["ai", "abstract"], help="장면 그림: ai · abstract(추상 배경)")
    sp.add_argument("--bug", default="극동방송 × SaGA", help="왼쪽 위 채널 표시")
    sp.add_argument("--music", default="auto", help="auto · none · 음악파일")
    sp.add_argument("--series", default="column")
    sp.add_argument("--out", default="")
    sp.add_argument("--thumb", default="", help="썸네일 제목(3줄, \\n 로 줄바꿈, *강조*)")
    sp.add_argument("--ghost", default="", help="썸네일 옅은 영어 단어(예: MONDAY)")
    sp.add_argument("--shot", default="", help="썸네일 배경 사진(선택)")

    sp = sub.add_parser("clip", help="긴 강의 → 쇼츠 여러 편")
    sp.add_argument("video")
    sp.add_argument("--series", default="lecture", help="lecture(강의) · dean(학장 특강) · intro · scic · trip")
    sp.add_argument("--count", type=int, default=3)
    sp.add_argument("--name", default="", help="강사 이름")
    sp.add_argument("--role", default="")
    sp.add_argument("--fit", default="blur", choices=["blur", "crop", "cover"],
                    help="blur: 화면 전체를 흐린 배경 위에 / crop: 화자만 세로로 크게")
    sp.add_argument("--crop-x", type=float, default=0.5, help="crop 때 화자 위치 0(왼쪽)~1(오른쪽)")
    sp.add_argument("--script", default="")
    sp.add_argument("--source-url", default="", help="원본 강의 주소(설명란용)")
    sp.add_argument("--out", default="")
    sp.add_argument("--wide", action="store_true")

    sp = sub.add_parser("referral", help="추천 영상 0~7번")
    sp.add_argument("action", choices=["init", "make"])
    sp.add_argument("--only", default="", help="예: 0,1,3")
    sp.add_argument("--format", default="shorts", choices=["shorts", "long", "both"])

    sp = sub.add_parser("compose", help="장면 대본 JSON → 영상")
    sp.add_argument("recipe")
    sp.add_argument("--format", default="shorts", choices=["shorts", "long", "both"])

    sp = sub.add_parser("thumb", help="새롭게하소서형 썸네일")
    sp.add_argument("photo", nargs="?", default="")
    sp.add_argument("--quote", required=True, help='인용 문구. 줄바꿈 \\n, 강조 *단어*')
    sp.add_argument("--name", default="")
    sp.add_argument("--role", default="")
    sp.add_argument("--kicker", default="", help="사연 한 줄")
    sp.add_argument("--notes", default="", help="반응 자막, | 로 구분")
    sp.add_argument("--side", default="left", choices=["left", "right"], help="글자 쪽")
    sp.add_argument("--series", default="referral")
    sp.add_argument("--logo", default="SaGA 일터아카데미")
    sp.add_argument("--out", default="")


    sp = sub.add_parser("cheer", help="응원 릴레이 영상 → 외칠 때마다 큰 글자 쇼츠")
    sp.add_argument("videos", nargs="+")
    sp.add_argument("--shout", required=True, help='외치는 말. 강조 *단어*')
    sp.add_argument("--sub", default="", help="아래 작은 글씨 (예: 영어 구호)")
    sp.add_argument("--label", default="", help="위 꼬리표")
    sp.add_argument("--title", default="", help="위 제목(선택). 인물 얼굴을 가리면 비워 두세요")
    sp.add_argument("--tag", default="", help="손글씨 이름표 (예: 교회 이름)")
    sp.add_argument("--tag-role", default="")
    sp.add_argument("--outro", default="", help="마지막 화면 큰 글씨")
    sp.add_argument("--between", default="한 번 *더*!", help="영상 사이 1초 화면 (빈칸이면 없음)")
    sp.add_argument("--series", default="intro")
    sp.add_argument("--fit", default="auto", choices=["auto", "crop", "blur", "cover"])
    sp.add_argument("--crop-x", type=float, default=0.5)
    sp.add_argument("--at", default="", help="외침 시각 직접 지정: 영상별 쉼표, 영상 사이 / (예: 1,3.8/1.4,5.5)")
    sp.add_argument("--music", default="auto", help="auto(기본 응원 리듬) · none(없음) · 음악 파일 경로")
    sp.add_argument("--music-volume", type=float, default=0.2, help="배경음 크기 (말할 때는 자동으로 더 줄어요)")
    sp.add_argument("--no-sfx", action="store_true", help="효과음 끄기")
    sp.add_argument("--out", default="")
    sp.add_argument("--wide", action="store_true")
    sp = sub.add_parser("facecheck", help="완성 영상에서 글자가 얼굴을 가렸는지 검사")
    sp.add_argument("video")

    sp = sub.add_parser("transcribe", help="받아쓰기 → .srt")
    sp.add_argument("file")
    sp.add_argument("--script", default="")
    sub.add_parser("doctor", help="준비 상태 점검")
    sub.add_parser("voices", help="한국어 목소리 목록")

    args = ap.parse_args()
    cfg = load_config(args.config)
    {"plan": cmd_plan, "make": cmd_make, "upload": cmd_upload, "auto": cmd_auto,
     "batch": cmd_batch, "doctor": cmd_doctor, "voices": cmd_voices, "column": cmd_column, "miracle": cmd_miracle,
     "clip": cmd_clip, "referral": cmd_referral, "compose": cmd_compose, "thumb": cmd_thumb,
     "transcribe": cmd_transcribe, "cheer": cmd_cheer, "facecheck": cmd_facecheck}[args.cmd](args, cfg)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n중단했어요.")
    except llm.LLMError as e:
        sys.exit(f"✖ {e}")
