#!/usr/bin/env python3
"""유튜브 자동화 스튜디오 — 명령어 한 줄로 주제 → 대본 → 음성 → 영상 → 썸네일 → 업로드.

  python studio.py doctor                  준비 상태 점검
  python studio.py plan "주제"             대본(project.json) 만들기
  python studio.py make projects/폴더      영상·썸네일·자막 만들기
  python studio.py upload projects/폴더    유튜브에 (비공개로) 올리기
  python studio.py auto "주제" [--upload]  위 세 단계를 한 번에
  python studio.py batch topics.txt        주제 목록을 차례로 처리 (예약 실행용)
  python studio.py voices                  쓸 수 있는 한국어 목소리 보기
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
    sub.add_parser("doctor", help="준비 상태 점검")
    sub.add_parser("voices", help="한국어 목소리 목록")

    args = ap.parse_args()
    cfg = load_config(args.config)
    {"plan": cmd_plan, "make": cmd_make, "upload": cmd_upload, "auto": cmd_auto,
     "batch": cmd_batch, "doctor": cmd_doctor, "voices": cmd_voices}[args.cmd](args, cfg)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\n중단했어요.")
    except llm.LLMError as e:
        sys.exit(f"✖ {e}")
