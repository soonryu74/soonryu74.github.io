# -*- coding: utf-8 -*-
"""말씀 챈트송 리릭비디오 빌더
사용법:  python3 make_video.py series/A5-8 "출력파일명.mp4"
필요 파일: <dir>/lyrics.json, <dir>/cuespec.json, <dir>/source.mp3
"""
import json, os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render

FPS, ANIM = 30, 0.40

def build_cues(spec):
    dur = spec["duration"]
    cues = []
    if spec.get("intro") is not None:
        cues.append({"t": 0.0, "e": float(spec["intro"]), "kind": "intro"})
    for n, (s, e) in spec["refs"].items():
        cues.append({"t": s, "e": e, "kind": "ref", "v": int(n)})
    for n, blocks in spec["blocks"].items():
        for blk in blocks:
            for i in range(len(blk) - 1):
                cues.append({"t": blk[i], "e": blk[i + 1], "kind": "line", "v": int(n), "i": i})
    for s, e, nxt in spec.get("interludes", []):
        cues.append({"t": s, "e": e, "kind": "gap", "next": nxt})
    if spec.get("outro") is not None:
        cues.append({"t": float(spec["outro"]), "e": dur, "kind": "outro"})
    cues.sort(key=lambda c: c["t"])
    cues[0]["t"] = 0.0          # 첫 화면은 반드시 0초부터 — 아니면 영상 전체가 앞당겨진다
    for i in range(len(cues) - 1):
        cues[i]["e"] = cues[i + 1]["t"]
    cues[-1]["e"] = dur
    return cues

def main(d, out):
    data = json.load(open(f"{d}/lyrics.json"))
    spec = json.load(open(f"{d}/cuespec.json"))
    V = {v["n"]: v for v in data["verses"]}
    th = data.get("theme")
    if th:
        render.set_theme(tuple(th["logo"]), tuple(th["badge_fg"]), tuple(th["badge_bg"]))

    cues = build_cues(spec)
    json.dump(cues, open(f"{d}/cues.json", "w"), ensure_ascii=False, indent=1)
    print(f"{len(cues)} cues / {cues[-1]['e']:.2f}s")

    fdir = f"{d}/frames"
    if os.path.isdir(fdir): shutil.rmtree(fdir)
    os.makedirs(fdir)
    bases = render.make_bases(data["title"], data["badge"], data.get("letter", "A"))
    bases_by_v = {v["n"]: bases[(i % 5) + 1] for i, v in enumerate(data["verses"])}

    def base_for(c):
        if c["kind"] in ("intro", "outro"): return bases["intro"]
        n = c.get("v") or c.get("next")
        return bases_by_v.get(n, bases[1])

    def draw(c, p):
        b = base_for(c)
        if c["kind"] == "intro": return render.draw_intro(b, data, int(255 * p))
        if c["kind"] == "outro": return render.draw_intro(b, data, 255)
        if c["kind"] == "ref":   return render.draw_ref(b, V[c["v"]], p)
        if c["kind"] == "gap":   return render.draw_gap(b, c.get("next"), data["verses"], p)
        return render.draw_line(b, V[c["v"]], V[c["v"]]["lines"][c["i"]], p)

    seq, idx = [], 0
    for ci, c in enumerate(cues):
        dur = c["e"] - c["t"]
        nf = max(1, min(int(ANIM * FPS), int(dur * FPS) - 1))
        for k in range(nf):
            fn = f"{fdir}/f{idx:05d}.png"
            draw(c, (k + 1) / nf).save(fn, compress_level=1)
            seq.append([fn, 1 / FPS]); idx += 1
        rest = dur - nf / FPS
        if rest > 0: seq[-1][1] += rest
        print(f"  cue {ci+1}/{len(cues)} {c['kind']}", flush=True)

    with open(f"{d}/concat.txt", "w") as f:
        for fn, t in seq:
            f.write(f"file '{os.path.abspath(fn)}'\nduration {t:.5f}\n")
        f.write(f"file '{os.path.abspath(seq[-1][0])}'\n")

    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-f", "concat", "-safe", "0", "-i", f"{d}/concat.txt",
                    "-i", f"{d}/source.mp3", "-map", "0:v", "-map", "1:a",
                    "-vf", "fps=30,format=yuv420p",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                    "-profile:v", "high", "-level", "4.1",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-movflags", "+faststart", "-shortest", f"{d}/{out}"], check=True)
    shutil.rmtree(fdir)
    os.remove(f"{d}/concat.txt")
    print("DONE:", f"{d}/{out}")

if __name__ == "__main__":
    main(sys.argv[1].rstrip("/"), sys.argv[2])
