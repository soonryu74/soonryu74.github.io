#!/usr/bin/env python3
"""SaGA 영상 제작실 — 내 컴퓨터에서 여는 웹 화면.

    python app.py        (Mac: python3 app.py)

브라우저가 자동으로 열립니다 (http://127.0.0.1:7860). 이 컴퓨터에서만 접속할 수 있어요.
"""
from __future__ import annotations

import contextlib
import datetime as dt
import io
import json
import queue
import re
import sys
import threading
import traceback
import uuid
import webbrowser
from pathlib import Path

if sys.platform == "win32":
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass

from flask import Flask, abort, jsonify, request, send_file

from ytauto import faces, llm, media, series
from ytauto.config import HERE, load_config
from ytauto.fonts import font_set

PROJECTS = HERE / "projects"
SAGA = PROJECTS / "saga"
UPLOADS = PROJECTS / "app_uploads"
WEB = HERE / "web"
PORT = 7860

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 ** 3  # 4GB

CFG = load_config()
_FONTS: dict | None = None


def fonts() -> dict:
    global _FONTS
    if _FONTS is None:
        _FONTS = font_set(CFG)
    return _FONTS


def slug(text: str) -> str:
    s = re.sub(r"[^\w가-힣]+", "-", text or "").strip("-")
    return s[:40] or dt.datetime.now().strftime("%m%d-%H%M")


# ── 작업 대기열 ────────────────────────────────────────────
class Job:
    def __init__(self, kind: str, title: str):
        self.id = uuid.uuid4().hex[:10]
        self.kind, self.title = kind, title
        self.status = "대기 중"
        self.log: list[str] = []
        self.outputs: list[dict] = []
        self.created = dt.datetime.now().strftime("%H:%M:%S")
        self.extra: dict = {}

    def dict(self):
        return {"id": self.id, "kind": self.kind, "title": self.title, "status": self.status,
                "log": self.log[-60:], "outputs": self.outputs, "created": self.created, "extra": self.extra}


JOBS: dict[str, Job] = {}
Q: queue.Queue = queue.Queue()


class _Tee(io.TextIOBase):
    def __init__(self, job: Job):
        self.job, self.buf = job, ""

    def write(self, s):
        sys.__stdout__.write(s)
        self.buf += s
        while "\n" in self.buf:
            line, self.buf = self.buf.split("\n", 1)
            if line.strip() and "WARN" not in line:
                self.job.log.append(line.rstrip())
        return len(s)


def _out(path: Path, label: str = "") -> dict:
    p = Path(path).resolve()
    kind = "video" if p.suffix.lower() in (".mp4", ".mov") else "image" if p.suffix.lower() in (".jpg", ".png") else "file"
    return {"url": "/files/" + p.relative_to(PROJECTS.resolve()).as_posix(), "name": p.name, "kind": kind,
            "label": label}


def worker():
    while True:
        job, fn = Q.get()
        job.status = "진행 중"
        try:
            with contextlib.redirect_stdout(_Tee(job)):
                result = fn(job) or []
            job.outputs = [_out(p, lbl) for p, lbl in result]
            job.status = "완료"
        except SystemExit as e:
            job.log.append(f"✖ {e}")
            job.status = "실패"
        except Exception as e:
            job.log.append(f"✖ 오류: {e}")
            job.log += traceback.format_exc().splitlines()[-4:]
            job.status = "실패"
        finally:
            Q.task_done()


def submit(kind: str, title: str, fn) -> Job:
    job = Job(kind, title)
    JOBS[job.id] = job
    Q.put((job, fn))
    return job


def _save_uploads(field: str, folder: Path) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    out = []
    for f in request.files.getlist(field):
        if not f or not f.filename:
            continue
        name = re.sub(r"[\\/:*?\"<>|]+", "_", Path(f.filename).name)
        p = folder / name
        f.save(p)
        out.append(p)
    return out


def _form(name: str, default: str = "") -> str:
    return (request.form.get(name) or default).strip()


def _check_faces(final: Path, base: Path, job: Job):
    try:
        bad, n = faces.verify(str(base), str(final))
        msg = "얼굴을 가린 순간 없음 ✔" if not bad else "얼굴을 가린 순간: " + ", ".join(f"{t}초" for t, _ in bad[:8])
        job.extra.setdefault("facecheck", []).append(f"{final.name}: {n}프레임 검사 → {msg}")
        print(f"  얼굴 검사: {msg}")
    except Exception as e:
        print(f"  얼굴 검사를 건너뜀 ({e})")


def _frame_at(video: Path, t: float, out: Path) -> Path | None:
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        media.run(["-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "2", str(out)])
        return out
    except Exception:
        return None


def _covers(job: Job, video: Path, out_dir: Path, plan: list, theme: dict, need_face: bool = False) -> list:
    """쇼츠 표지를 영상과 함께 자동으로. plan: [(파일이름, style, kw), ...]"""
    from ytauto import covers
    res = []
    try:
        shot = covers.best_frame(video, out_dir / "_frames" / "cover_src.jpg", need_face=need_face)
        for name, style, kw in plan:
            o = covers.shorts_cover(out_dir / f"{name}.jpg", style, fonts(), shot, theme=theme, **kw)
            res.append((o, f"쇼츠 표지 · {name.split('_', 1)[-1]}"))
    except Exception as e:
        print(f"  쇼츠 표지를 건너뜀 ({type(e).__name__}: {e})")
    return res


# ── 화면 ─────────────────────────────────────────────────
@app.get("/")
def index():
    return send_file(WEB / "index.html")


@app.get("/files/<path:rel>")
def files(rel):
    p = (PROJECTS / rel).resolve()
    if not str(p).startswith(str(PROJECTS.resolve())) or not p.is_file():
        abort(404)
    return send_file(p, as_attachment=request.args.get("dl") == "1", conditional=True)


@app.get("/api/status")
def status():
    info = {"ffmpeg": True, "fonts": True, "whisper": True, "faces": True, "ai": False, "ai_url": CFG["llm"]["base_url"],
            "ai_provider": CFG["llm"]["provider"], "series": {k: v["name"] for k, v in series.SERIES.items()}}
    try:
        media.ffmpeg_exe()
    except Exception:
        info["ffmpeg"] = False
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        info["whisper"] = False
    try:
        import cv2  # noqa: F401
    except ImportError:
        info["faces"] = False
    if CFG["llm"]["provider"] in ("lmstudio", "ollama", "openai-compatible"):
        try:
            info["ai"] = bool(llm.list_models(CFG["llm"]))
        except Exception:
            info["ai"] = False
    else:
        info["ai"] = CFG["llm"]["provider"] != "manual"
    return jsonify(info)


@app.get("/api/jobs")
def jobs():
    return jsonify([j.dict() for j in reversed(list(JOBS.values()))][:30])


@app.get("/api/job/<jid>")
def job(jid):
    j = JOBS.get(jid)
    return jsonify(j.dict()) if j else (jsonify({"error": "없는 작업"}), 404)


# ── 1. 응원 릴레이 ────────────────────────────────────────
@app.post("/api/cheer")
def api_cheer():
    from ytauto import cheer, thumbs
    name = slug(_form("name") or _form("tag") or "응원")
    up = UPLOADS / f"cheer-{name}-{uuid.uuid4().hex[:4]}"
    videos = _save_uploads("videos", up / "videos")
    if not videos:
        return jsonify({"error": "영상을 한 개 이상 올려 주세요."}), 400
    music_files = _save_uploads("music_file", up / "music")
    logo_img = _save_uploads("logo_image", up / "logo")
    badge = _form("badge")
    music = _form("music", "auto")
    if music == "file":
        music = str(music_files[0]) if music_files else "none"
    p = {k: _form(k) for k in ("shout", "sub", "label", "title", "tag", "tag_role", "outro", "series", "fit")}
    if not p["shout"]:
        return jsonify({"error": "외치는 말을 적어 주세요."}), 400
    effects = _form("effects", "1") == "1"
    make_thumb = _form("thumb", "1") == "1"

    def run(job):
        work = SAGA / (p["series"] or "intro") / name
        out = cheer.make([str(v) for v in videos], work, CFG, fonts(), p["label"], p["title"], p["shout"], p["sub"],
                         p["series"] or "intro", p["fit"] or "auto", 0.5, p["outro"], "한 번 *더*!", p["tag"],
                         p["tag_role"], "shorts", None, music, effects)
        res = [(out, "완성 쇼츠")]
        _check_faces(out, work / "base.mp4", job)
        # 확정 표지(일터가 선교다): 외친 사람들 얼굴 모음 9:16 → 영상 맨 앞 0.6초에도 붙인다
        from ytauto import brandkit
        key = p["series"] or "intro"
        try:
            ev = json.loads((work / "events.json").read_text(encoding="utf-8"))
            cov = brandkit.relay_cover(work / "base.mp4", ev, work / "쇼츠표지" / "대표표지_얼굴모음.jpg", fonts(),
                                       p["shout"], p["sub"], series.get(key)["theme"])
            if cov:
                res.append((cov, "대표 표지 · 얼굴 모음 9:16 (확정 틀)"))
                if brandkit.preset(key).get("prepend"):
                    from ytauto import shorts
                    wc = shorts.with_cover(out, cov, out.with_name(out.stem + "_표지포함.mp4"))
                    res.insert(0, (wc, "완성 쇼츠 · 표지 포함 (올릴 때 첫 장면을 표지로)"))
        except Exception as e:
            print(f"  대표 표지를 건너뜀 ({type(e).__name__}: {e})")
        who = " · ".join(x for x in (p["tag"], p["tag_role"]) if x)
        res += _covers(job, work / "base.mp4", work / "쇼츠표지", [
            ("표지_말풍선", "bubble", dict(big=p["shout"], who=who)),
            ("표지_자막상자", "box", dict(hook=p["label"] or who, big=p["shout"]))],
            series.get(p["series"] or "intro")["theme"])
        if make_thumb:
            ev = json.loads((work / "events.json").read_text(encoding="utf-8"))
            t = (ev[len(ev) // 2][0] + 0.4) if ev else 1.0
            shot = _frame_at(work / "base.mp4", t, work / "thumb_shot.jpg")
            src_shot = _frame_at(videos[0], 1.0, work / "thumb_src.jpg") if videos else None
            use = src_shot if src_shot and media.video_size(str(videos[0]))[0] > media.video_size(str(videos[0]))[1] else shot
            proj = {"title": p["shout"].replace("*", ""), "thumbnail_quote": p["shout"] + ("\n" + p["sub"] if p["sub"] else ""),
                    "thumbnail_name": p["tag"], "thumbnail_role": p["tag_role"], "thumbnail_kicker": p["label"],
                    "thumbnail_text": p["shout"].replace("*", ""), "thumbnail_label": p["tag"], "thumbnail_sub": p["sub"],
                    "thumbnail_name_xy": [0.05, 0.07], "thumbnail_hook": p["label"], "thumbnail_big": p["shout"],
                    "thumbnail_badge": badge}
            th = series.get(p["series"] or "intro")["theme"]
            tc = dict(CFG["thumbnail"], logo_text="", logo_image=str(logo_img[0]) if logo_img else "")
            for f in thumbs.make_variants(work, proj, fonts(), tc, use, "", th):
                res.append((f, "썸네일"))
        return res

    j = submit("응원 릴레이", p["shout"].replace("*", ""), run)
    return jsonify({"id": j.id})


# ── 2. 극동방송 칼럼 ──────────────────────────────────────
@app.post("/api/column")
def api_column():
    from ytauto import column, thumbs
    audio = _save_uploads("audio", UPLOADS / "column")
    if not audio:
        return jsonify({"error": "녹음 파일을 올려 주세요."}), 400
    title = _form("title")
    if not title:
        return jsonify({"error": "화면 위 제목을 적어 주세요."}), 400
    name = slug(_form("out") or audio[0].stem)
    up = UPLOADS / f"column-{name}"
    photo = _save_uploads("photo", up)
    pics = _save_uploads("images", up / "scenes")
    script_files = _save_uploads("script_file", up)
    script = _form("script")
    if not script and script_files:
        script = script_files[0].read_text(encoding="utf-8", errors="replace")
    shot = _save_uploads("shot", up / "shot")
    p = {k: _form(k) for k in ("name", "role", "quote", "series", "format", "english", "visual", "bug", "thumb", "ghost")}
    fmt = p["format"] or "shorts"

    def run(job):
        res = []
        work = SAGA / (p["series"] or "column") / name
        if fmt in ("shorts", "both"):
            out = column.make(str(audio[0]), work, CFG, fonts(), title, p["name"], p["role"],
                              str(photo[0]) if photo else "", script, str(up / "scenes") if pics else "",
                              p["series"] or "column", "shorts")
            res += [(out, "완성 쇼츠"), (work / "자막.srt", "자막 파일 (고칠 수 있어요)")]
            _check_faces(out, work / "parts" / "base.mp4", job)
            from ytauto import covers
            th_c = series.get(p["series"] or "column")["theme"]
            res += _covers(job, work / "parts" / "base.mp4", work / "쇼츠표지", [
                ("표지_질문답", "answer", dict(hook=p["name"] or "극동방송 1분 칼럼", big=covers.star_word(title),
                                             target="극동방송 1분 칼럼")),
                ("표지_자막상자", "box", dict(hook="극동방송 1분 칼럼", big=title))], th_c)
            job.extra["srt"] = str((work / "자막.srt").relative_to(PROJECTS))
            if p["quote"]:
                proj = {"title": title.replace("*", ""), "thumbnail_quote": p["quote"], "thumbnail_name": p["name"],
                        "thumbnail_role": p["role"], "thumbnail_text": title.replace("*", "")}
                bg = shot[0] if shot else (photo[0] if photo else None)
                for f in thumbs.make_variants(work, proj, fonts(), dict(CFG["thumbnail"], logo_text="SaGA 일터아카데미"),
                                              bg, "", series.get(p["series"] or "column")["theme"]):
                    res.append((f, "썸네일"))
        if fmt in ("miracle", "both"):
            from ytauto import miracle
            mw = work.with_name(work.name + "-가로")
            print("▶ 3분 미라클형 가로 영상")
            out = miracle.make(str(audio[0]), mw, CFG, fonts(), title.replace("\\n", " "), p["series"] or "column",
                               "극동방송 1분 칼럼", p["name"], p["role"], str(photo[0]) if photo else "", script,
                               str(up / "scenes") if pics else "", p["english"], p["visual"] or "ai",
                               p["bug"] or "극동방송 × SaGA")
            res += [(out, "완성 가로 영상 (3분 미라클형)"), (mw / "자막.srt", "가로 영상 자막 (고칠 수 있어요)")]
            if (mw / "subtitles_en.srt").exists():
                res.append((mw / "subtitles_en.srt", "영어 자막 파일 (유튜브에 따로 올릴 수 있어요)"))
            _check_faces(out, mw / "parts" / "base.mp4", job)
            scenes = json.loads((mw / "scenes.json").read_text(encoding="utf-8"))
            bg = shot[0] if shot else next((Path(s["bg"]) for s in scenes[1:] if s.get("bg")), None)
            th = miracle.miracle_thumbnail(mw / "thumb_miracle.jpg", p["thumb"] or title, fonts(), bg,
                                           "극동방송 1분 칼럼", p["ghost"], series.get(p["series"] or "column")["theme"])
            res.append((th, "썸네일 (3분 미라클형)"))
            if fmt == "miracle":
                job.extra["srt"] = str((mw / "자막.srt").relative_to(PROJECTS))
        return res

    j = submit("극동방송 칼럼", title.replace("*", "").replace("\\n", " "), run)
    return jsonify({"id": j.id})


@app.get("/api/text/<path:rel>")
def get_text(rel):
    p = (PROJECTS / rel).resolve()
    if not str(p).startswith(str(PROJECTS.resolve())) or not p.is_file():
        abort(404)
    return jsonify({"text": p.read_text(encoding="utf-8")})


@app.post("/api/text/<path:rel>")
def put_text(rel):
    p = (PROJECTS / rel).resolve()
    if not str(p).startswith(str(PROJECTS.resolve())) or p.suffix not in (".srt", ".json", ".txt"):
        abort(403)
    p.write_text(request.get_json()["text"], encoding="utf-8")
    return jsonify({"ok": True})


# ── 3. 강의에서 쇼츠 ──────────────────────────────────────
@app.post("/api/clip")
def api_clip():
    from ytauto import clipper
    vids = _save_uploads("video", UPLOADS / "lecture")
    if not vids:
        return jsonify({"error": "강의 영상을 올려 주세요."}), 400
    p = {k: _form(k) for k in ("series", "name", "role", "fit", "source_url", "script")}
    count = int(_form("count", "3") or 3)
    name = slug(_form("out") or vids[0].stem)

    def run(job):
        work = SAGA / (p["series"] or "lecture") / name
        outs = clipper.make(str(vids[0]), work, CFG, fonts(), p["series"] or "lecture", count, p["name"], p["role"],
                            p["fit"] or "blur", 0.5, p["script"], p["source_url"], "shorts")
        res = []
        clips = json.loads((work / "clips.json").read_text(encoding="utf-8"))
        th_l = series.get(p["series"] or "lecture")["theme"]
        for i, o in enumerate(outs):
            base = o.with_suffix("").parent / f"clip{int(o.stem.split('_')[-1]):02d}" / "base.mp4"
            _check_faces(o, base, job)
            res.append((o, "쇼츠"))
            t = clips[i].get("title", "") if i < len(clips) else ""
            if t:
                res += _covers(job, base, work / "쇼츠표지", [
                    (f"표지{i + 1:02d}_자막상자", "box",
                     dict(hook=" · ".join(x for x in (p["name"], series.get(p["series"] or "lecture")["name"]) if x), big=t))],
                    th_l)
        job.extra["clips"] = str((work / "clips.json").relative_to(PROJECTS))
        job.extra["rerun"] = {"video": str(vids[0]), **p, "count": count, "out": name}
        return res + [(work / "업로드정보.txt", "제목·원본 구간 정보")]

    j = submit("강의 쇼츠", f"{vids[0].stem} → {count}편", run)
    return jsonify({"id": j.id})


@app.post("/api/clip/rerun")
def api_clip_rerun():
    from ytauto import clipper
    d = request.get_json()
    p = d["params"]
    clips_rel = d["clips"]
    (PROJECTS / clips_rel).write_text(json.dumps(d["data"], ensure_ascii=False, indent=1), encoding="utf-8")

    def run(job):
        work = (PROJECTS / clips_rel).parent
        outs = clipper.make(p["video"], work, CFG, fonts(), p["series"] or "lecture", int(p["count"]), p["name"],
                            p["role"], p["fit"] or "blur", 0.5, p.get("script", ""), p.get("source_url", ""), "shorts")
        job.extra["clips"] = clips_rel
        job.extra["rerun"] = p
        return [(o, "쇼츠") for o in outs]

    j = submit("강의 쇼츠 (다시)", p["out"], run)
    return jsonify({"id": j.id})


# ── 4. 추천 영상 0~7번 ────────────────────────────────────
REF = SAGA / "referral"


@app.get("/api/referral")
def ref_list():
    from ytauto import referral
    if not (REF / "recipes").exists():
        referral.init(REF)
    out = []
    for f in sorted((REF / "recipes").glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for b in data.get("beats", []):
            if b.get("src"):
                b["_exists"] = (REF / b["src"]).exists()
        vids = [_out(v) for v in sorted((REF / "output").glob(f"{f.stem}_*.mp4"))] if (REF / "output").exists() else []
        out.append({"key": f.stem, "recipe": data, "videos": vids})
    return jsonify(out)


@app.post("/api/referral/<key>")
def ref_save(key):
    f = REF / "recipes" / f"{key}.json"
    if not f.exists():
        abort(404)
    data = request.get_json()
    for b in data.get("beats", []):
        b.pop("_exists", None)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return jsonify({"ok": True})


@app.post("/api/referral/<key>/media")
def ref_media(key):
    target = request.form.get("src", "")
    if not target.startswith("media/") or ".." in target:
        abort(400)
    fs = request.files.get("file")
    if not fs:
        return jsonify({"error": "파일이 없어요"}), 400
    dest = REF / target
    # 올린 파일 확장자가 다르면 대본의 src 도 바꾼다
    ext = Path(fs.filename).suffix.lower()
    if ext and ext != dest.suffix.lower():
        dest = dest.with_suffix(ext)
        rf = REF / "recipes" / f"{key}.json"
        data = json.loads(rf.read_text(encoding="utf-8"))
        for b in data["beats"]:
            if b.get("src") == target:
                b["src"] = dest.relative_to(REF).as_posix()
        rf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    dest.parent.mkdir(parents=True, exist_ok=True)
    fs.save(dest)
    return jsonify({"ok": True, "src": dest.relative_to(REF).as_posix()})


@app.post("/api/referral/<key>/make")
def ref_make(key):
    from ytauto import compose
    fmt = (request.get_json(silent=True) or {}).get("format", "shorts")
    f = REF / "recipes" / f"{key}.json"
    if not f.exists():
        abort(404)

    def run(job):
        res = []
        for fm in (["shorts", "long"] if fmt == "both" else [fmt]):
            print(f"▶ {key} ({'세로' if fm == 'shorts' else '가로'})")
            out = compose.render(f, CFG, fonts(), fm)
            _check_faces(out, REF / "output" / f"{key}_{fm}" / "base.mp4", job)
            res.append((out, "세로 쇼츠" if fm == "shorts" else "가로 영상"))
            if fm == "shorts":
                r = json.loads(f.read_text(encoding="utf-8"))
                cta = (series.brand(CFG).get("cta") or [""])[0]
                res += _covers(job, REF / "output" / f"{key}_{fm}" / "base.mp4", REF / "output" / f"{key}_표지", [
                    ("표지_카드", "card", dict(target=r.get("label", ""), big=r.get("title", ""), stamp="60초", cta=cta)),
                    ("표지_자막상자", "box", dict(hook=r.get("label", ""), big=r.get("title", "")))],
                    series.get("referral")["theme"], need_face=True)
        return res

    j = submit("추천 영상", key, run)
    return jsonify({"id": j.id})


# ── 5. 썸네일 ────────────────────────────────────────────
@app.get("/api/brandkit")
def brandkit_list():
    from ytauto import brandkit
    return jsonify(brandkit.PRESETS)


@app.post("/api/thumb")
def api_thumb():
    from ytauto import thumbs
    up = UPLOADS / f"thumb-{uuid.uuid4().hex[:6]}"
    photo = _save_uploads("photo", up)
    logo_img = _save_uploads("logo_image", up / "logo")
    p = {k: _form(k) for k in ("quote", "name", "role", "kicker", "notes", "side", "series", "logo",
                               "hook", "big", "badge", "layout", "channel", "logo_text", "doodle")}
    person = _save_uploads("person", up / "person")
    if p["layout"] == "kit":
        from ytauto import brandkit
        q = {k[2:]: _form(k) for k in ("k_series", "k_big", "k_hook", "k_who", "k_role", "k_target", "k_sub",
                                        "k_day", "k_total", "k_places")}
        if not q["big"]:
            return jsonify({"error": "큰 말을 적어 주세요."}), 400
        kphotos = _save_uploads("k_photos", up / "kit")
        key = q.pop("series") or "intro"

        def run_kit(job):
            out_dir = SAGA / "thumbnails" / (series.get(key)["name"] + "_" + slug(q["big"].replace("*", "").replace("\\n", " ")))
            return brandkit.make(key, out_dir, fonts(), CFG, kphotos, q)

        j = submit("고정 틀 썸네일", series.get(key)["name"] + " · " + q["big"].replace("*", "").replace("\\n", " "), run_kit)
        return jsonify({"id": j.id})
    if p["layout"] == "shorts":
        from ytauto import covers
        q = {k: _form(k) for k in ("s_big", "s_hook", "s_who", "s_target", "s_answer", "s_stamp", "s_series")}
        if not q["s_big"]:
            return jsonify({"error": "큰 말을 적어 주세요."}), 400

        def run_sh(job):
            out_dir = SAGA / "thumbnails" / ("쇼츠_" + slug(q["s_big"].replace("*", "").replace("\\n", " ")))
            th = series.get(q["s_series"] or "referral")["theme"]
            ph = photo[0] if photo else None
            m = re.search(r"\*([^*]+)\*", q["s_big"])
            answer = q["s_answer"] or (m.group(1) if m else q["s_big"].replace("*", "").split("\n")[-1])
            cta = (series.brand(CFG).get("cta") or [""])[0]
            plan = [("1_말풍선", "bubble", dict(big=q["s_big"], who=q["s_who"])),
                    ("2_자막상자", "box", dict(hook=q["s_hook"], big=q["s_big"])),
                    ("3_질문답", "answer", dict(hook=q["s_hook"], big=answer, target=q["s_target"])),
                    ("4_카드", "card", dict(target=q["s_target"], big=q["s_big"], stamp=q["s_stamp"], cta=cta))]
            res = []
            for name, style, kw in plan:
                o = covers.shorts_cover(out_dir / f"{name}.jpg", style, fonts(), ph, theme=th, **kw)
                res.append((o, f"쇼츠 표지 · {name.split('_')[1]}"))
            return res

        j = submit("쇼츠 표지", q["s_big"].replace("*", "").replace("\n", " "), run_sh)
        return jsonify({"id": j.id})
    if p["layout"] == "showcase":
        if not p["big"]:
            return jsonify({"error": "큰 두 줄 문구를 적어 주세요."}), 400

        def run_sc(job):
            out_dir = SAGA / "thumbnails" / slug(p["big"].replace("*", "").replace("!", ""))
            keys = [p["series"] or "nomore"] + [k for k in ("nomore", "intro", "dean", "column") if k != (p["series"] or "nomore")]
            res = []
            for i, k in enumerate(keys[:3]):
                o = out_dir / ("thumbnail.jpg" if i == 0 else f"thumbnail_{i + 1}.jpg")
                thumbs.showcase_thumbnail(o, p["big"], fonts(), photo[0] if photo else None, p["hook"],
                                          str(logo_img[0]) if logo_img else "", p["logo_text"], p["badge"],
                                          str(person[0]) if person else "", p["channel"], series.get(k)["theme"],
                                          doodles=[{"text": t.strip(), "x": 0.02, "y": 0.17 + 0.12 * j, "rot": -7}
                                                   for j, t in enumerate(p["doodle"].split("|")) if t.strip()])
                res.append((o, f"장면 카드형 · {series.get(k)['name']} 색"))
            return res

        j = submit("썸네일", p["big"].replace("*", "").replace("!", "").replace("\n", " "), run_sc)
        return jsonify({"id": j.id})
    if not p["quote"]:
        return jsonify({"error": "인용 문구를 적어 주세요."}), 400

    def run(job):
        out_dir = SAGA / "thumbnails" / slug(p["quote"].replace("*", ""))
        proj = {"title": p["quote"].replace("*", ""), "thumbnail_quote": p["quote"], "thumbnail_name": p["name"],
                "thumbnail_role": p["role"], "thumbnail_kicker": p["kicker"], "thumbnail_side": p["side"] or "left",
                "thumbnail_text": p["quote"].replace("*", "").replace("\n", " "),
                "thumbnail_hook": p["hook"], "thumbnail_big": p["big"], "thumbnail_badge": p["badge"]}
        if p["notes"]:
            proj["thumbnail_notes"] = [{"text": t.strip(), "x": 0.72, "y": 0.14 + 0.1 * i}
                                       for i, t in enumerate(p["notes"].split("|")) if t.strip()]
        files = thumbs.make_variants(out_dir, proj, fonts(), dict(CFG["thumbnail"], logo_text=p["logo"],
                                                                  logo_image=str(logo_img[0]) if logo_img else ""),
                                     photo[0] if photo else None, "", series.get(p["series"] or "referral")["theme"])
        return [(f, "썸네일") for f in files]

    j = submit("썸네일", p["quote"].replace("*", "").replace("\n", " "), run)
    return jsonify({"id": j.id})


def main():
    threading.Thread(target=worker, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}"
    print(f"\n  SaGA 영상 제작실이 열렸어요 → {url}\n  (이 창을 닫으면 제작실도 꺼집니다)\n")
    if "--no-browser" not in sys.argv:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)


if __name__ == "__main__":
    main()
