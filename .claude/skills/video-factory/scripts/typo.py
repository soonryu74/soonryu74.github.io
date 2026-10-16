"""타이포 쇼츠 — 글자가 튀어나오고 · 닦여 나오고 · 밀려 들어오고 · 숫자가 올라가고 · 도장이 찍히는 키네틱 타이포 영상.
사용: python typo.py script.json
script.json:
{
 "out": "타이포.mp4", "aspect": "9:16",            // 또는 "16:9"
 "bg": "navy",                                     // "navy" 또는 배경 사진 경로(어둡게 깔림)
 "accent": [242,193,78],
 "bgm": "음악.mp3", "bgm_volume": 0.25,            // 선택. 나레이션 나올 때 자동으로 낮춤
 "scenes": [
  {"type":"title", "kicker":"2027 · 7기 모집", "lines":["직장을","그만두지 않고","*1년*"], "dur":3.2},
  {"type":"pop",   "text":"단어가 하나씩 *튀어나옵니다*", "dur":2.6},
  {"type":"wipe",  "lines":["한 줄씩","*닦이듯* 나옵니다"], "dur":2.6},
  {"type":"slide", "lines":["왼쪽에서","오른쪽에서 *번갈아*"], "dur":2.6},
  {"type":"count", "to":230, "suffix":"명", "label":"전국 다섯 권역", "dur":2.6},
  {"type":"list",  "title":"*3단계*면 끝", "items":["반복 찾기","말로 시키기","확인만 하기"], "dur":3.6},
  {"type":"stamp", "text":"전형료 면제", "sub":"10.1 ~ 11.30", "dur":2.4},
  {"type":"end",   "lines":["지금 *신청*하세요"], "logo":"로고.png", "dur":3.0}
 ]
}
장면마다 "voice": "줄.wav" 를 주면 장면 시작 0.25초 뒤에 그 음성을 얹고, 장면 길이를 음성+0.6초 이상으로 늘린다(싱크 자동).
*별표* 안은 강조색. 쇼츠는 유튜브 UI 를 피해 세로 260~1560 안에 글자를 둔다."""
from __future__ import annotations

import math
import random
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from common import FPS, GOLD, NAVY, WHITE, DIM, F, ff, fit_cover, load, navy_bg, rich_len, wrap

XF = 0.22   # 장면 들고 나는 페이드


def back(x: float) -> float:
    x = max(0.0, min(1.0, x)); c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def out3(x: float) -> float:
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3


class Stage:
    def __init__(self, aspect: str, accent):
        self.vert = aspect == "9:16"
        self.W, self.H = (1080, 1920) if self.vert else (1920, 1080)
        self.X0 = 90 if self.vert else 160
        self.top, self.bot = (260, 1560) if self.vert else (120, 960)
        self.maxw = self.W - 2 * self.X0
        self.big, self.mid, self.small = (156, 118, 52) if self.vert else (128, 96, 42)
        self.accent = tuple(accent)
        self.cache: dict = {}

    def text(self, s: str, kind: str, size: int, color=WHITE, accent=None) -> Image.Image:
        acc = accent or self.accent
        key = (s, kind, size, color, acc)
        if key in self.cache:
            return self.cache[key]
        f = F(kind, size)
        w = int(rich_len(s, f)) + 24; h = int(size * 1.35) + 20
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        x = 6
        for i, part in enumerate(s.split("*")):
            if not part:
                continue
            d.text((x + 4, 10), part, font=f, fill=(0, 0, 0, 150))
            d.text((x, 4), part, font=f, fill=acc if i % 2 else color, stroke_width=0 if (i % 2 and acc == NAVY) else 2, stroke_fill=NAVY)
            x += f.getlength(part)
        self.cache[key] = im
        return im

    def fitsize(self, lines: list[str], kind: str, size: int) -> int:
        while size > 40 and max(rich_len(l, F(kind, size)) for l in lines) > self.maxw:
            size -= 6
        return size


def accent_words(text: str) -> list[str]:
    """«*두 단어* 강조»를 단어별로 나눌 때 강조 표시를 단어마다 다시 붙인다"""
    out, on = [], False
    for w in text.split(" "):
        segs, cur = [], ""
        for ch in w:
            if ch == "*":
                if cur:
                    segs.append((cur, on)); cur = ""
                on = not on
            else:
                cur += ch
        if cur:
            segs.append((cur, on))
        out.append("".join(f"*{c}*" if a else c for c, a in segs))
    return out


def put(frame: Image.Image, im: Image.Image, x: float, y: float, scale=1.0, alpha=1.0, rot=0.0, anchor="lt") -> None:
    if alpha <= 0.01 or scale <= 0.01:
        return
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    if alpha < 1.0:
        a = im.getchannel("A").point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    if anchor == "c":
        x, y = x - im.width / 2, y - im.height / 2
    elif anchor == "lc":
        y = y - im.height / 2
    frame.alpha_composite(im, (int(x), int(y)))


def block_y(st: Stage, heights: list[int], gap: int) -> list[float]:
    total = sum(heights) + gap * (len(heights) - 1)
    y = st.top + (st.bot - st.top - total) / 2
    out = []
    for h in heights:
        out.append(y); y += h + gap
    return out


# ───────── 한글 자모 (IME 처럼 한 획씩 조립) ─────────
CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"


def jamo_stages(ch: str) -> list[str]:
    """'한' → ['ㅎ', '하', '한'] — 초성 → 초성+중성 → 완성"""
    o = ord(ch) - 0xAC00
    if not 0 <= o < 11172:
        return [ch]
    cho, jung, jong = o // 588, (o % 588) // 28, o % 28
    st = [CHO[cho], chr(0xAC00 + cho * 588 + jung * 28)]
    if jong:
        st.append(ch)
    return st


def typed(text: str, n: float, jamo: bool) -> str:
    """앞에서부터 n 단계만큼 친 글자(별표 강조 표시는 유지)"""
    out, k = "", 0.0
    for ch in text:
        if ch == "*":
            out += ch; continue
        stages = jamo_stages(ch) if jamo else [ch]
        if n - k >= len(stages):
            out += ch; k += len(stages)
        else:
            i = int(n - k)
            if i >= 1:
                out += stages[min(i, len(stages)) - 1]
            break
    if out.count("*") % 2:
        out += "*"
    return out


def total_steps(text: str, jamo: bool) -> int:
    return sum(len(jamo_stages(c)) if jamo else 1 for c in text if c != "*")


DECODE_POOL = "가나다라마바사아자차카타파하#%&@*+=<>01"

# ───────── 오토샘 모션 메뉴: 코드 · 이름 → 장면 종류 ─────────
MENU = {
    "O01": ("title", "여는 제목"), "O02": ("end", "끝 화면"),
    "T01": ("type", "타자 치기"), "T02": ("jamo", "한글 자모 타자"), "T03": ("slam", "글자 쾅"),
    "T04": ("pop", "단어 튀어나오기"), "T05": ("rise", "단어 올라오기"), "T06": ("decode", "해독 글자"),
    "T07": ("wipe", "줄 닦기"), "T08": ("slide", "좌우에서 밀기"), "T09": ("highlight", "형광펜 칠하기"),
    "T10": ("underline", "밑줄 긋기"), "T11": ("strike", "지우고 고쳐 쓰기"), "T12": ("stack", "우르르 쌓기"),
    "T13": ("wave", "물결 글자"), "T14": ("quote", "인용 카드"),
    "N01": ("count", "숫자 올라가기"), "N02": ("list", "목록 차례로"), "B01": ("stamp", "도장 쾅"),
}
NAMES = {name: kind for kind, name in MENU.values()}


def resolve(kind: str) -> str:
    """'T03' · '글자 쾅' · 'slam' 어느 것으로 써도 장면 종류로"""
    if kind in MENU:
        return MENU[kind][0]
    return NAMES.get(kind, kind)


def draw_scene(st: Stage, sc: dict, t: float, frame: Image.Image) -> None:
    k = resolve(sc["type"]); X0 = st.X0
    if k == "title":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.big)
        ims = [st.text(l, "black", sz) for l in lines]
        kick = st.text(sc.get("kicker", ""), "semi", st.small, GOLD) if sc.get("kicker") else None
        ys = block_y(st, ([kick.height] if kick else []) + [im.height for im in ims], 18)
        if kick:
            put(frame, kick, X0, ys[0], alpha=out3(t / 0.4)); ys = ys[1:]
        for i, (im, y) in enumerate(zip(ims, ys)):
            p = (t - 0.25 - i * 0.28) / 0.45
            put(frame, im, X0 + 30 * (1 - out3(p)), y, scale=0.85 + 0.15 * back(p), alpha=out3(p))
    elif k == "pop":
        sz = st.mid; f = F("black", sz)
        words = accent_words(sc["text"])
        rows, cur = [], []
        for w in words:
            if cur and rich_len(" ".join(cur + [w]), f) > st.maxw:
                rows.append(cur); cur = [w]
            else:
                cur.append(w)
        rows.append(cur)
        ys = block_y(st, [int(sz * 1.35) + 20] * len(rows), 10); n = 0
        for r, y in zip(rows, ys):
            x = X0
            for w in r:
                im = st.text(w, "black", sz)
                p = (t - 0.15 - n * 0.16) / 0.38
                put(frame, im, x + im.width / 2, y + im.height / 2, scale=0.4 + 0.6 * back(p), alpha=out3(p * 1.6), anchor="c")
                x += rich_len(w, f) + f.getlength(" "); n += 1
    elif k == "wipe":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid)
        ims = [st.text(l, "black", sz) for l in lines]
        ys = block_y(st, [im.height for im in ims], 14)
        for i, (im, y) in enumerate(zip(ims, ys)):
            p = out3((t - 0.15 - i * 0.45) / 0.55)
            if p <= 0:
                continue
            w = max(1, int(im.width * p)); part = im.crop((0, 0, w, im.height))
            put(frame, part, X0, y)
            ImageDraw.Draw(frame).rectangle((X0 + w - 4, y + 10, X0 + w + 2, y + im.height - 10), fill=st.accent + (int(255 * (1 - p)),))
    elif k == "slide":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid)
        ims = [st.text(l, "black", sz) for l in lines]
        ys = block_y(st, [im.height for im in ims], 14)
        for i, (im, y) in enumerate(zip(ims, ys)):
            p = out3((t - 0.1 - i * 0.35) / 0.5); side = -1 if i % 2 == 0 else 1
            x = X0 if side < 0 else st.W - X0 - im.width
            put(frame, im, x + side * 260 * (1 - p), y, alpha=p)
    elif k == "count":
        p = out3((t - 0.1) / max(0.6, sc.get("dur", 2.5) * 0.55))
        num = f"{int(round(sc['to'] * p)):,}{sc.get('suffix', '')}"
        im = st.text("*" + num + "*", "black", int(st.big * 1.5))
        lab = st.text(sc.get("label", ""), "bold", st.small + 8, DIM) if sc.get("label") else None
        ys = block_y(st, [im.height] + ([lab.height] if lab else []), 10)
        put(frame, im, X0, ys[0], scale=0.9 + 0.1 * back(p))
        if lab:
            put(frame, lab, X0, ys[1], alpha=out3((t - 0.5) / 0.4))
    elif k == "list":
        items = sc["items"]; sz = st.fitsize(items, "bold", st.mid - 18)
        ttl = st.text(sc.get("title", ""), "black", st.mid) if sc.get("title") else None
        ims = [st.text(f"{i + 1}. {it}", "bold", sz) for i, it in enumerate(items)]
        ys = block_y(st, ([ttl.height + 20] if ttl else []) + [im.height for im in ims], 22)
        if ttl:
            p = out3(t / 0.45); put(frame, ttl, X0 - 40 * (1 - p), ys[0], alpha=p); ys = ys[1:]
        d = ImageDraw.Draw(frame)
        for i, (im, y) in enumerate(zip(ims, ys)):
            p = (t - 0.45 - i * 0.4) / 0.4
            if p <= 0:
                continue
            a = out3(p)
            d.rounded_rectangle((X0 - 24, y - 6, X0 - 24 + int((st.maxw + 48) * a), y + im.height + 2), 18, fill=(20, 30, 56, int(220 * a)))
            put(frame, im, X0 + 10, y, scale=0.9 + 0.1 * back(p), alpha=a)
    elif k == "stamp":
        sz = st.fitsize([sc["text"]], "black", st.big)
        im = st.text(sc["text"], "black", sz, st.accent)
        box = Image.new("RGBA", (im.width + 70, im.height + 50), (0, 0, 0, 0))
        ImageDraw.Draw(box).rounded_rectangle((4, 4, box.width - 5, box.height - 5), 22, outline=st.accent + (255,), width=10)
        box.alpha_composite(im, (35, 25))
        p = (t - 0.2) / 0.28
        cy = (st.top + st.bot) / 2 - (60 if sc.get("sub") else 0)
        if p > 0:
            sh = 6 * math.sin(t * 60) * max(0, 1 - (t - 0.48) / 0.25) if t > 0.48 else 0
            put(frame, box, st.W / 2 + sh, cy, scale=1.0 + 0.7 * (1 - out3(p)), alpha=min(1, p * 2), rot=-7, anchor="c")
        if sc.get("sub"):
            sub = st.text(sc["sub"], "bold", st.small + 10, WHITE)
            put(frame, sub, st.W / 2, cy + box.height / 2 + 90, alpha=out3((t - 0.7) / 0.4), anchor="c")
    elif k in ("type", "jamo"):
        jm = k == "jamo" or sc.get("jamo", False)
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid)
        steps = [total_steps(l, jm) for l in lines]
        rate = sc.get("rate", 22 if jm else 14)  # 초당 단계
        ys = block_y(st, [int(sz * 1.35) + 20] * len(lines), 12)
        n_all = max(0.0, t - 0.2) * rate; done = 0
        for i, (l, y) in enumerate(zip(lines, ys)):
            n = n_all - done; done += steps[i] + 3
            if n <= 0:
                break
            part = typed(l, n, jm)
            if part.strip("*"):
                im = st.text(part, "black", sz); put(frame, im, X0, y)
                cur_x = X0 + rich_len(part, F("black", sz)) + 10
            else:
                cur_x = X0 + 6
            if n < steps[i] + 3 and int(t * 2.4) % 2 == 0:  # 깜빡이는 커서
                ImageDraw.Draw(frame).rectangle((cur_x, y + 14, cur_x + 8, y + sz * 1.2), fill=st.accent + (255,))
    elif k == "slam":
        sz = st.fitsize([sc["text"]], "black", int(st.big * 1.15))
        im = st.text(sc["text"], "black", sz)
        p = (t - 0.15) / 0.2
        if p > 0:
            sh = (14 * math.sin(t * 70) * max(0.0, 1 - (t - 0.35) / 0.3)) if t > 0.35 else 0
            put(frame, im, st.W / 2 + sh, (st.top + st.bot) / 2 + sh * 0.5, scale=1 + 2.2 * (1 - out3(p)), alpha=min(1, p * 3), anchor="c")
            fl = max(0.0, 1 - (t - 0.35) / 0.25) if t > 0.35 else 0
            if fl > 0:
                frame.alpha_composite(Image.new("RGBA", frame.size, (255, 255, 255, int(150 * fl))))
        if sc.get("sub"):
            sub = st.text(sc["sub"], "bold", st.small + 10, WHITE)
            put(frame, sub, st.W / 2, (st.top + st.bot) / 2 + im.height * 0.75, alpha=out3((t - 0.8) / 0.4), anchor="c")
    elif k == "rise":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid); f = F("black", sz)
        ys = block_y(st, [int(sz * 1.35) + 20] * len(lines), 12); n = 0
        for l, y in zip(lines, ys):
            x = X0
            for w in accent_words(l):
                im = st.text(w, "black", sz); p = out3((t - 0.15 - n * 0.12) / 0.45)
                if p > 0:
                    h = int(im.height * p) or 1
                    crop = im.crop((0, 0, im.width, h))
                    put(frame, crop, x, y + im.height - h)
                x += rich_len(w, f) + f.getlength(" "); n += 1
    elif k == "decode":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid)
        ys = block_y(st, [int(sz * 1.35) + 20] * len(lines), 12)
        rnd = random.Random(int(t * 18)); idx = 0
        for l, y in zip(lines, ys):
            out = ""
            for ch in l:
                if ch in "* ":
                    out += ch; continue
                lock = 0.25 + idx * 0.06; idx += 1
                out += ch if t >= lock + 0.35 else (rnd.choice(DECODE_POOL) if t >= lock else "")
            if out.count("*") % 2:
                out += "*"
            if out.strip("* "):
                put(frame, st.text(out, "black", sz), X0, y)
    elif k in ("highlight", "underline"):
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid); f = F("black", sz)
        d = ImageDraw.Draw(frame)
        ys = block_y(st, [int(sz * 1.35) + 20] * len(lines), 16)
        for i, (l, y) in enumerate(zip(lines, ys)):
            a = out3((t - 0.1 - i * 0.2) / 0.35)
            segs = l.split("*")
            base = st.text(l if k == "underline" else l.replace("*", ""), "black", sz)
            navy = st.text(l, "black", sz, WHITE, NAVY) if k == "highlight" else None
            cuts, x = [], 0.0
            for j, seg in enumerate(segs):
                w = f.getlength(seg)
                if j % 2 and seg:
                    p = out3((t - 0.6 - i * 0.25) / 0.45)
                    if p > 0:
                        bx0, bx1 = X0 + x - 6, X0 + x - 6 + (w + 12) * p
                        if k == "highlight":
                            d.rectangle((bx0, y + sz * 0.22, bx1, y + sz * 1.28), fill=st.accent + (255,))
                            cuts.append((int(bx0 - X0), int(bx1 - X0)))
                        else:
                            d.rounded_rectangle((X0 + x, y + sz * 1.2, X0 + x + w * p, y + sz * 1.2 + 10), 5, fill=st.accent + (255,))
                x += w
            if cuts:  # 칠이 지나간 곳: 흰 글자를 비우고 같은 자리에 남색 글자
                base = base.copy(); bd = ImageDraw.Draw(base)
                for c0, c1 in cuts:
                    bd.rectangle((max(0, c0), 0, c1, base.height), fill=(0, 0, 0, 0))
            put(frame, base, X0, y, alpha=a)
            for c0, c1 in cuts:
                c0 = max(0, c0)
                put(frame, navy.crop((c0, 0, min(navy.width, c1), navy.height)), X0 + c0, y, alpha=a)
    elif k == "strike":
        sz = st.fitsize([sc["wrong"], sc["right"]], "black", st.mid); f = F("black", sz)
        wr = st.text(sc["wrong"], "black", sz, DIM); rt = st.text(sc["right"], "black", sz)
        ys = block_y(st, [wr.height, rt.height], 30)
        put(frame, wr, X0, ys[0], alpha=out3((t - 0.1) / 0.3))
        p = out3((t - 0.7) / 0.35)
        if p > 0:
            ww = rich_len(sc["wrong"], f)
            ImageDraw.Draw(frame).rectangle((X0 - 6, ys[0] + sz * 0.62, X0 - 6 + (ww + 12) * p, ys[0] + sz * 0.62 + 12), fill=(232, 80, 80, 255))
        q = (t - 1.15) / 0.4
        put(frame, rt, X0 + 40 * (1 - out3(q)), ys[1], scale=0.9 + 0.1 * back(q), alpha=out3(q))
    elif k == "stack":
        sz = st.fitsize([sc["text"]], "black", st.big); f = F("black", sz)
        chars = [c for c in sc["text"].replace("*", "")]
        tw = rich_len(sc["text"], f); x = (st.W - tw) / 2; y0 = (st.top + st.bot) / 2 - sz / 2
        acc_on, acc = False, []
        for c in sc["text"]:
            if c == "*":
                acc_on = not acc_on; continue
            acc.append(acc_on)
        for i, (c, on) in enumerate(zip(chars, acc)):
            w = f.getlength(c)
            if c != " ":
                p = (t - 0.1 - i * 0.07) / 0.5
                if p > 0:
                    yy = y0 - 700 * (1 - min(1, p)) ** 2 if p < 1 else y0 - 26 * math.sin(min(1, (p - 1) * 3) * math.pi) * max(0, 1 - (p - 1) * 3)
                    put(frame, st.text(("*" + c + "*") if on else c, "black", sz), x, yy, alpha=min(1, p * 4))
            x += w
    elif k == "wave":
        sz = st.fitsize([sc["text"]], "black", st.big); f = F("black", sz)
        tw = rich_len(sc["text"], f); x = (st.W - tw) / 2; y0 = (st.top + st.bot) / 2 - sz / 2
        on, i = False, 0
        for c in sc["text"]:
            if c == "*":
                on = not on; continue
            w = f.getlength(c)
            if c != " ":
                a = out3((t - 0.1 - i * 0.05) / 0.3)
                yy = y0 + 34 * math.sin(t * 5 - i * 0.55)
                put(frame, st.text(("*" + c + "*") if on else c, "black", sz), x, yy, alpha=a)
            x += w; i += 1
    elif k == "quote":
        sz = st.mid - 20; lines = wrap(sc["text"], F("bold", sz), st.maxw - 40)
        ims = [st.text(l, "bold", sz) for l in lines]
        by = sc.get("by"); by_im = st.text("— " + by, "semi", st.small, DIM) if by else None
        hts = [180] + [im.height for im in ims] + ([by_im.height + 30] if by_im else [])
        ys = block_y(st, hts, 10)
        q = st.text("“", "black", 260, st.accent)
        put(frame, q, X0 - 10, ys[0] - 40, alpha=out3(t / 0.35), scale=0.8 + 0.2 * back(t / 0.45))
        for i, (im, y) in enumerate(zip(ims, ys[1:])):
            p = out3((t - 0.35 - i * 0.22) / 0.45); put(frame, im, X0 + 20, y + 20 * (1 - p), alpha=p)
        if by_im:
            put(frame, by_im, X0 + 20, ys[-1] + 30, alpha=out3((t - 0.9) / 0.4))
    elif k == "end":
        lines = sc["lines"]; sz = st.fitsize(lines, "black", st.mid)
        ims = [st.text(l, "black", sz) for l in lines]
        logo = None
        if sc.get("logo"):
            lg = Image.open(sc["logo"]).convert("RGBA"); lw = int(st.W * (0.32 if st.vert else 0.16))
            logo = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        hts = [im.height for im in ims] + ([logo.height + 40] if logo else [])
        ys = block_y(st, hts, 16)
        for i, (im, y) in enumerate(zip(ims, ys)):
            p = out3((t - 0.1 - i * 0.25) / 0.5)
            put(frame, im, st.W / 2, y + im.height / 2 + 40 * (1 - p), alpha=p, anchor="c")
        if logo:
            put(frame, logo, st.W / 2, ys[-1] + 40 + logo.height / 2, alpha=out3((t - 0.6) / 0.5), anchor="c")


def wav_len(p: str) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def main(script_path: str) -> Path:
    sp = load(script_path)
    root = Path(script_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    out = Path(P(sp["out"]))
    st = Stage(sp.get("aspect", "9:16"), sp.get("accent", GOLD))
    scenes = sp["scenes"]
    starts, t = [], 0.0
    for sc in scenes:
        if sc.get("logo"):
            sc["logo"] = P(sc["logo"])
        if sc.get("voice"):
            sc["voice"] = P(sc["voice"]); sc["dur"] = max(sc.get("dur", 2.5), wav_len(sc["voice"]) + 0.85)
        sc.setdefault("dur", 2.6)
        starts.append(t); t += sc["dur"]
    total = t
    if sp.get("bg", "navy") == "navy":
        bg0 = navy_bg((st.W + 120, st.H + 200), grid=60).convert("RGB")
    else:
        ph = fit_cover(Image.open(P(sp["bg"])).convert("RGB"), (st.W + 120, st.H + 200))
        ph = ImageEnhance.Brightness(ph.filter(ImageFilter.GaussianBlur(2))).enhance(0.42).convert("RGBA")
        ph.alpha_composite(Image.new("RGBA", ph.size, NAVY + (110,))); bg0 = ph.convert("RGB")
    silent = out.with_name(out.stem + "_silent.mp4")
    proc = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{st.W}x{st.H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "17", "-preset", "medium",
                             "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE)
    n = int(round(total * FPS))
    for fi in range(n):
        tt = fi / FPS
        z = tt / total  # 배경 천천히 당기기
        bx, by = int(60 * z), int(100 * z)
        frame = bg0.crop((bx, by, bx + st.W, by + st.H)).convert("RGBA")
        i = max(j for j, s0 in enumerate(starts) if s0 <= tt + 1e-6)
        sc = scenes[i]; lt = tt - starts[i]
        layer = Image.new("RGBA", (st.W, st.H), (0, 0, 0, 0))
        draw_scene(st, sc, lt, layer)
        a = min(1.0, lt / XF, (sc["dur"] - lt) / XF) if i != len(scenes) - 1 else min(1.0, lt / XF)
        if a < 1.0:
            layer.putalpha(layer.getchannel("A").point(lambda v: int(v * max(0.0, a))))
        frame.alpha_composite(layer)
        proc.stdin.write(frame.convert("RGB").tobytes())
        if fi % (FPS * 5) == 0:
            print(f"  {tt:5.1f}/{total:.1f}s 장면{i + 1} {sc['type']}", flush=True)
    proc.stdin.close(); proc.wait()
    # 소리: 장면별 음성 + 배경음(말할 때 낮춤)
    ins, fil, labels = [], "", []
    voices = [(starts[i] + 0.25, sc["voice"]) for i, sc in enumerate(scenes) if sc.get("voice")]
    for k, (t0, v) in enumerate(voices):
        ins += ["-i", v]; fil += f"[{k + 1}:a]aresample=48000,adelay={int(t0 * 1000)}|{int(t0 * 1000)}[v{k}];"; labels.append(f"[v{k}]")
    if sp.get("bgm"):
        bi = len(voices) + 1; ins += ["-stream_loop", "-1", "-i", P(sp["bgm"])]
        vol = sp.get("bgm_volume", 0.25)
        if voices:
            expr = "+".join(f"between(t,{t0 - 0.2:.2f},{t0 + wav_len(v) + 0.2:.2f})" for t0, v in voices)
            fil += f"[{bi}:a]aresample=48000,volume='{vol}*if(gt({expr},0),0.35,1)':eval=frame,afade=t=out:st={total - 1.5:.2f}:d=1.5[m];"
        else:
            fil += f"[{bi}:a]aresample=48000,volume={vol},afade=t=out:st={total - 1.5:.2f}:d=1.5[m];"
        labels.append("[m]")
    if labels:
        fil += "".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,apad,atrim=0:{total:.2f}[a]"
        ff(["-i", str(silent), *ins, "-filter_complex", fil, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac",
            "-b:a", "192k", "-t", f"{total:.2f}", "-movflags", "+faststart", str(out)])
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
