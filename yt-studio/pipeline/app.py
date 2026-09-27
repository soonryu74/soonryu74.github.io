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
    p = {k: _form(k) for k in ("name", "role", "quote", "series")}

    def run(job):
        work = SAGA / (p["series"] or "column") / name
        out = column.make(str(audio[0]), work, CFG, fonts(), title, p["name"], p["role"],
                          str(photo[0]) if photo else "", script, str(up / "scenes") if pics else "",
                          p["series"] or "column", "shorts")
        res = [(out, "완성 쇼츠"), (work / "자막.srt", "자막 파일 (고칠 수 있어요)")]
        _check_faces(out, work / "parts" / "base.mp4", job)
        if p["quote"]:
            proj = {"title": title.replace("*", ""), "thumbnail_quote": p["quote"], "thumbnail_name": p["name"],
                    "thumbnail_role": p["role"], "thumbnail_text": title.replace("*", "")}
            bg = shot[0] if shot else (photo[0] if photo else None)
            for f in thumbs.make_variants(work, proj, fonts(), dict(CFG["thumbnail"], logo_text="SaGA 일터아카데미"),
                                          bg, "", series.get(p["series"] or "column")["theme"]):
                res.append((f, "썸네일"))
        job.extra["srt"] = str((work / "자막.srt").relative_to(PROJECTS))
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
        for o in outs:
            _check_faces(o, o.with_suffix("").parent / f"clip{int(o.stem.split('_')[-1]):02d}" / "base.mp4", job)
        job.extra["clips"] = str((work / "clips.json").relative_to(PROJECTS))
        job.extra["rerun"] = {"video": str(vids[0]), **p, "count": count, "out": name}
        return [(o, "쇼츠") for o in outs] + [(work / "업로드정보.txt", "제목·원본 구간 정보")]

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
        return res

    j = submit("추천 영상", key, run)
    return jsonify({"id": j.id})


# ── 5. 썸네일 ────────────────────────────────────────────
@app.post("/api/thumb")
def api_thumb():
    from ytauto import thumbs
    up = UPLOADS / f"thumb-{uuid.uuid4().hex[:6]}"
    photo = _save_uploads("photo", up)
    logo_img = _save_uploads("logo_image", up / "logo")
    p = {k: _form(k) for k in ("quote", "name", "role", "kicker", "notes", "side", "series", "logo",
                               "hook", "big", "badge")}
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
