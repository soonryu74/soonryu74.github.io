"""타임라인 내보내기 — 하이라이트 컷 목록을 편집 프로그램이 여는 파일로.
사용: python timeline.py plan.json            (highlight.py 와 같은 plan · snap 도 같게 적용)
결과: out 옆에 <이름>_컷.xml (FCP7 XML: FilmCraft · 프리미어 · 다빈치 리졸브)
              <이름>_컷.otio (OpenTimelineIO: FilmCraft · 다빈치 · 기타)
원본 영상을 원본 크기 그대로 컷만 이어 놓은 «러프 컷»이다. 세로 배치(stack/center/fit)는 들어가지 않는다 —
배치까지 된 결과는 highlight.py 의 mp4, 컷 길이 · 순서 · 색 · 음량을 손으로 다듬을 때 이 파일을 연다."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from common import FPS, load, probe


def frames(t: float) -> int:
    return int(round(t * FPS))


def fcp7_xml(name: str, src: Path, info: dict, cuts: list[tuple[float, float, str]]) -> str:
    rate = f"<rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>"
    dur = frames(info["duration"])
    w, h = info["w"] or 1920, info["h"] or 1080
    url = escape(src.resolve().as_uri())
    fileblock_full = (f'<file id="file-1"><name>{escape(src.name)}</name><pathurl>{url}</pathurl>{rate}<duration>{dur}</duration>'
                      f"<media><video><samplecharacteristics><width>{w}</width><height>{h}</height></samplecharacteristics></video>"
                      + ("<audio><channelcount>2</channelcount></audio>" if info["audio"] else "") + "</media></file>")
    v, a, pos = [], [], 0
    for i, (s, e, memo) in enumerate(cuts, 1):
        fi, fo = frames(s), frames(e)
        st, en = pos, pos + (fo - fi)
        fb = fileblock_full if i == 1 else '<file id="file-1"/>'
        label = escape(memo or f"컷 {i}")
        v.append(f'<clipitem id="v{i}"><name>{label}</name><duration>{dur}</duration>{rate}'
                 f"<start>{st}</start><end>{en}</end><in>{fi}</in><out>{fo}</out>{fb}"
                 + (f'<link><linkclipref>v{i}</linkclipref></link><link><linkclipref>a{i}</linkclipref></link>' if info["audio"] else "")
                 + "</clipitem>")
        if info["audio"]:
            a.append(f'<clipitem id="a{i}"><name>{label}</name><duration>{dur}</duration>{rate}'
                     f'<start>{st}</start><end>{en}</end><in>{fi}</in><out>{fo}</out><file id="file-1"/>'
                     f"<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack></clipitem>")
        pos = en
    fmt = (f"<format><samplecharacteristics>{rate}<width>{w}</width><height>{h}</height>"
           f"<pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>")
    audio = f"<audio><track>{''.join(a)}</track></audio>" if a else ""
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5">'
            f'<sequence id="seq-1"><name>{escape(name)}</name><duration>{pos}</duration>{rate}'
            f"<media><video>{fmt}<track>{''.join(v)}</track></video>{audio}</media></sequence></xmeml>\n")


def otio(name: str, src: Path, info: dict, cuts: list[tuple[float, float, str]]) -> dict:
    rt = lambda t: {"OTIO_SCHEMA": "RationalTime.1", "rate": float(FPS), "value": float(frames(t))}  # noqa: E731
    ref = {"OTIO_SCHEMA": "ExternalReference.1", "target_url": src.resolve().as_uri(),
           "available_range": {"OTIO_SCHEMA": "TimeRange.1", "start_time": rt(0), "duration": rt(info["duration"])}}

    def track(kind: str) -> dict:
        clips = [{"OTIO_SCHEMA": "Clip.2", "name": memo or f"컷 {i}", "media_references": {"DEFAULT_MEDIA": ref},
                  "active_media_reference_key": "DEFAULT_MEDIA",
                  "source_range": {"OTIO_SCHEMA": "TimeRange.1", "start_time": rt(s), "duration": rt(e - s)}}
                 for i, (s, e, memo) in enumerate(cuts, 1)]
        return {"OTIO_SCHEMA": "Track.1", "name": kind[0] + "1", "kind": kind, "children": clips}

    tracks = [track("Video")] + ([track("Audio")] if info["audio"] else [])
    return {"OTIO_SCHEMA": "Timeline.1", "name": name,
            "tracks": {"OTIO_SCHEMA": "Stack.1", "name": "tracks", "children": tracks}}


def write(src: str | Path, out_mp4: str | Path, cuts: list[tuple[float, float, str]]) -> tuple[Path, Path]:
    """highlight.py 가 잘라 낸 실제 구간(snap 반영)을 받아 두 파일을 쓴다."""
    src, out_mp4 = Path(src), Path(out_mp4)
    info = probe(src)
    name = out_mp4.stem
    x = out_mp4.with_name(name + "_컷.xml"); x.write_text(fcp7_xml(name, src, info, cuts), encoding="utf-8")
    o = out_mp4.with_name(name + "_컷.otio"); o.write_text(json.dumps(otio(name, src, info, cuts), ensure_ascii=False, indent=1), encoding="utf-8")
    return x, o


def main(plan_path: str) -> None:
    from highlight import snap
    pl = load(plan_path)
    root = Path(plan_path).resolve().parent
    P = lambda p: (root / p).resolve() if not Path(p).is_absolute() else Path(p)  # noqa: E731
    src, out = P(pl["src"]), P(pl["out"])
    has_audio = probe(src)["audio"]
    cuts = []
    for c in pl["cuts"]:
        s, e = float(c[0]), float(c[1])
        if pl.get("snap", True) and has_audio:
            s, e = snap(str(src), s, e)
        cuts.append((s, e, c[2] if len(c) > 2 else ""))
    for p in write(src, out, cuts):
        print("DONE", p)


if __name__ == "__main__":
    main(sys.argv[1])
