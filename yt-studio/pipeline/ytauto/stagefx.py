"""무대 조명 움직임 — 정지 그림을 '공연 중인 무대'처럼.

한 장면 그림 위에
  · 천천히 움직이는 카메라 (밀고 들어가기 / 옆으로 흐르기 — 장면마다 다르게)
  · 좌우로 흔들리는 조명 빛줄기 두 개 (무대 위 조명기에서 떨어지는 빛)
  · 흐르는 무대 연기(헤이즈)
  · 빛 속에 떠다니는 먼지
  · 은은하게 숨 쉬는 밝기
를 얹는다. 모두 코드로 그리므로 추가 비용·외부 서비스가 없다.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from . import media

W, H = 1920, 1080
FPS = 30


def _haze(out: Path) -> Path:
    """가로로 긴 연기 무늬 (흰색 + 투명도)."""
    rnd = random.Random(7)
    w, h = W * 2, H
    small = Image.new("L", (w // 16, h // 16))
    small.putdata([rnd.randint(0, 255) for _ in range(small.width * small.height)])
    cloud = small.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(60))
    # 가장자리를 이어 붙여도 티 나지 않게 좌우를 섞는다
    flip = cloud.transpose(Image.FLIP_LEFT_RIGHT)
    mask = Image.linear_gradient("L").rotate(90).resize((w, h))
    cloud = Image.composite(cloud, flip, mask)
    vert = Image.linear_gradient("L").resize((w, h)).point(lambda v: int(80 + v * 0.7))  # 아래쪽이 짙게
    alpha = Image.eval(Image.merge("L", [cloud]), lambda v: max(0, v - 90) * 1.1)
    alpha = Image.composite(alpha, Image.new("L", (w, h), 0), vert)
    img = Image.new("RGBA", (w, h), (230, 232, 245, 0))
    img.putalpha(alpha.point(lambda v: int(min(255, v) * 0.55)))
    img.save(out)
    return out


def _beam(out: Path, spread: float = 0.16, tint=(255, 244, 220)) -> Path:
    """가운데(원점)에서 아래로 떨어지는 빛 원뿔. 3840×2160, 원점 = 그림 가운데."""
    w, h = W * 2, H * 2
    cx, cy = w // 2, h // 2
    a = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(a)
    length = H * 1.25
    half = math.tan(spread) * length
    for k in range(18, 0, -1):  # 가운데가 밝고 가장자리가 부드러운 원뿔
        f = k / 18
        d.polygon([(cx, cy), (cx - half * f, cy + length), (cx + half * f, cy + length)], fill=int(10 + 8 * (18 - k)))
    a = a.filter(ImageFilter.GaussianBlur(28))
    fade = Image.new("L", (w, h), 0)  # 멀어질수록 옅게
    fd = ImageDraw.Draw(fade)
    for y in range(cy, h):
        fd.line((0, y, w, y), fill=int(255 * max(0.0, 1 - (y - cy) / length) ** 0.7))
    a = Image.composite(a, Image.new("L", (w, h), 0), fade)
    img = Image.new("RGBA", (w, h), tint + (0,))
    img.putalpha(a.point(lambda v: int(v * 0.85)))
    img.save(out)
    return out


def _dust(out: Path, sec: float = 6.0) -> Path:
    """떠다니는 먼지 (검은 바탕 흰 점, 알파로 씀) — 반복 재생해도 이어지게."""
    rnd = random.Random(3)
    frames = out.parent / "dust_frames"
    frames.mkdir(parents=True, exist_ok=True)
    n = int(sec * FPS)
    pts = [(rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(1.2, 3.4), rnd.uniform(-8, 8), rnd.uniform(-14, -4),
            rnd.uniform(0, 6.28)) for _ in range(140)]
    for i in range(n):
        t = i / n
        im = Image.new("L", (W // 2, H // 2), 0)
        d = ImageDraw.Draw(im)
        for x, y, r, vx, vy, ph in pts:
            xx = (x + vx * t * sec * 4) % W / 2
            yy = (y + vy * t * sec * 4) % H / 2
            b = int(120 + 120 * math.sin(ph + t * 6.283))
            d.ellipse((xx - r / 2, yy - r / 2, xx + r / 2, yy + r / 2), fill=b)
        im.filter(ImageFilter.GaussianBlur(0.8)).save(frames / f"d{i:03d}.png")
    media.run(["-framerate", str(FPS), "-i", str(frames / "d%03d.png"), "-vf", f"scale={W}:{H}",
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(out)])
    return out


def _rays(out: Path) -> Path:
    """위에서 쏟아지는 무지개빛 광선 (성령·주의 음성 장면)."""
    import colorsys
    rnd = random.Random(11)
    w, h = W, H
    a = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ox, oy = w // 2, -int(h * 0.25)
    for i in range(46):
        ang = math.radians(rnd.uniform(-58, 58))
        half = math.radians(rnd.uniform(0.6, 2.4))
        L = h * 1.6
        pts = [(ox, oy), (ox + L * math.sin(ang - half), oy + L * math.cos(ang - half)),
               (ox + L * math.sin(ang + half), oy + L * math.cos(ang + half))]
        r, g, b = colorsys.hsv_to_rgb(rnd.random(), 0.45 if i % 3 else 0.0, 1.0)
        lay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(lay).polygon(pts, fill=(int(r * 255), int(g * 255), int(b * 255), rnd.randint(40, 110)))
        a.alpha_composite(lay)
    core = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(core).ellipse((ox - 520, oy - 200, ox + 520, oy + 620), fill=(255, 250, 235, 190))
    a.alpha_composite(core.filter(ImageFilter.GaussianBlur(120)))
    a = a.filter(ImageFilter.GaussianBlur(10))
    a.save(out)
    return out


def assets(folder: Path) -> dict:
    folder.mkdir(parents=True, exist_ok=True)
    a = {"haze": folder / "haze.png", "beam": folder / "beam.png", "beam_warm": folder / "beam_warm.png",
         "dust": folder / "dust.mp4", "rays": folder / "rays.png"}
    if not a["rays"].exists():
        _rays(a["rays"])
    if not a["haze"].exists():
        _haze(a["haze"])
    if not a["beam"].exists():
        _beam(a["beam"], 0.15, (225, 235, 255))
    if not a["beam_warm"].exists():
        _beam(a["beam_warm"], 0.19, (255, 226, 170))
    if not a["dust"].exists():
        _dust(a["dust"])
    return a


# 카메라 움직임 네 가지 (장면마다 돌려 가며)
MOVES = [
    ("1.00+0.10*on/{N}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),                 # 천천히 밀고 들어가기
    ("1.18", "(iw-iw/zoom)*(0.15+0.7*on/{N})", "ih/2-(ih/zoom/2)"),               # 왼→오 흐르기
    ("1.22-0.12*on/{N}", "iw/2-(iw/zoom/2)", "(ih-ih/zoom)*0.35"),                # 가까이서 빠지기
    ("1.18", "(iw-iw/zoom)*(0.85-0.7*on/{N})", "(ih-ih/zoom)*0.45"),              # 오→왼 흐르기
]


LB = 804  # 2.39:1 영화 화면 높이 (위아래 검은 띠)


def piece(out: Path, img: Path, dur: float, k: int, A: dict, warm: bool = False, letterbox: bool = False,
          burst: bool = False, beams: bool = True) -> Path:
    """그림 한 장 → dur 초짜리 '살아 있는' 조각 (소리 없음 = 무음 트랙).
    letterbox: 영화처럼 위아래 검은 띠 · burst: 위에서 쏟아지는 무지개빛 광선 (성령·주의 음성)"""
    out.parent.mkdir(parents=True, exist_ok=True)
    N = max(1, int(dur * FPS))
    z, x, y = (e.replace("{N}", str(N)) for e in MOVES[k % len(MOVES)])
    ph = k * 1.7
    beam = str(A["beam_warm"] if warm else A["beam"])
    left, right = int(W * 0.30), int(W * 0.72)
    f = (
        f"[0:v]scale={int(W * 1.3)}:{int(H * 1.3)},zoompan=z='{z}':x='{x}':y='{y}':d=1:s={W}x{H}:fps={FPS},"
        f"eq=brightness='0.035*sin(t*1.9+{ph:.2f})':eval=frame,setsar=1,format=yuva420p[bg];"
        f"[1:v]format=rgba,crop={W}:{H}:x='mod(t*38+{k * 211},{W})':y=0[hz];"
        f"[4:v]format=gray,trim=duration={dur:.3f},setpts=PTS-STARTPTS[dg];"
        f"color=c=white:s={W}x{H}:r={FPS}:d={dur:.3f}[wh];[wh][dg]alphamerge,colorchannelmixer=aa=0.55[du];"
    )
    if beams:
        f += (f"[2:v]format=rgba,rotate='0.20*sin(t*0.55+{ph:.2f})':c=none:ow=iw:oh=ih,crop={W}:{H}:{W - left}:{H}[b1];"
            f"[3:v]format=rgba,rotate='-0.22*sin(t*0.47+{ph + 1.3:.2f})':c=none:ow=iw:oh=ih,crop={W}:{H}:{W - right}:{H}[b2];"
              "[bg][b1]overlay=0:0[v1];[v1][b2]overlay=0:0[v2];")
    else:
        f += "[bg]null[v2];"
    f += "[v2][hz]overlay=0:0[v3];[v3][du]overlay=0:0[v4];"
    last = "v4"
    if burst:
        fi, fo = min(1.0, dur * 0.2), min(1.6, dur * 0.3)
        f += (f"[6:v]format=rgba,fade=t=in:st=0.2:d={fi:.2f}:alpha=1,"
              f"fade=t=out:st={max(0.5, dur - fo - 0.2):.2f}:d={fo:.2f}:alpha=1[ry];[v4][ry]overlay=0:0[v5];")
        last = "v5"
    if letterbox:
        f += f"[{last}]crop={W}:{LB}:0:{(H - LB) // 2},pad={W}:{H}:0:{(H - LB) // 2}:black,format=yuv420p[v]"
    else:
        f += f"[{last}]format=yuv420p[v]"
    media.run(["-loop", "1", "-t", f"{dur:.3f}", "-i", str(img),
               "-loop", "1", "-t", f"{dur:.3f}", "-i", str(A["haze"]),
               "-loop", "1", "-t", f"{dur:.3f}", "-i", beam,
               "-loop", "1", "-t", f"{dur:.3f}", "-i", beam,
               "-stream_loop", "-1", "-t", f"{dur:.3f}", "-i", str(A["dust"]),
               "-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo",
               "-loop", "1", "-t", f"{dur:.3f}", "-i", str(A["rays"]),
               "-filter_complex", f, "-map", "[v]", "-map", "5:a",
               "-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
               "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
               "-color_range", "tv", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(out)])
    return out
