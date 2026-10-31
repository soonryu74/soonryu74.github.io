#!/usr/bin/env python3
"""
render.py — .pptx → PDF → 슬라이드별 PNG (시각 QA·썸네일 추출)

  python3 render.py deck.pptx                 # deck-01.png, deck-02.png … (가로 1600px)
  python3 render.py deck.pptx --thumb 1       # 1번 슬라이드를 1280×720 PNG로 (유튜브 썸네일)
  python3 render.py deck.pptx --outdir qa/    # 출력 폴더 지정
  python3 render.py deck.pptx --sheet         # 전체 슬라이드 한 장 요약 이미지(contact sheet)도 생성

LibreOffice(soffice)와 pdftoppm(poppler-utils)이 필요하다. 이 샌드박스에서는 둘 다 설치되어 있다.
bare `soffice`는 샌드박스에서 멈출 수 있어 임시 프로필 + headless 플러그인으로 실행한다.
"""
import argparse
import glob
import os
import subprocess
import sys
import tempfile


def to_pdf(pptx, outdir):
    env = dict(os.environ, SAL_USE_VCLPLUGIN="svp")
    with tempfile.TemporaryDirectory(prefix="lo_profile_") as prof:
        cmd = ["soffice", f"-env:UserInstallation=file://{prof}", "--headless",
               "--convert-to", "pdf", "--outdir", outdir, pptx]
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=240)
    pdf = os.path.join(outdir, os.path.splitext(os.path.basename(pptx))[0] + ".pdf")
    if not os.path.exists(pdf):
        sys.exit(f"PDF 변환 실패:\n{r.stdout}\n{r.stderr}")
    return pdf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--outdir")
    ap.add_argument("--thumb", type=int, help="이 번호의 슬라이드를 1280×720 PNG로 추출")
    ap.add_argument("--width", type=int, default=1600, help="QA용 PNG 가로 픽셀(기본 1600)")
    ap.add_argument("--sheet", action="store_true")
    a = ap.parse_args()

    base = os.path.splitext(os.path.basename(a.pptx))[0]
    outdir = a.outdir or os.path.dirname(os.path.abspath(a.pptx))
    os.makedirs(outdir, exist_ok=True)
    pdf = to_pdf(a.pptx, outdir)

    if a.thumb:
        out = os.path.join(outdir, f"{base}-thumbnail")
        subprocess.run(["pdftoppm", "-png", "-f", str(a.thumb), "-l", str(a.thumb), "-singlefile",
                        "-scale-to-x", "1280", "-scale-to-y", "720", pdf, out], check=True)
        print(f"썸네일: {out}.png (1280×720)")
        return

    for f in glob.glob(os.path.join(outdir, f"{base}-*.png")):
        os.remove(f)
    subprocess.run(["pdftoppm", "-png", "-scale-to-x", str(a.width), "-scale-to-y", "-1", pdf,
                    os.path.join(outdir, base)], check=True)
    pngs = sorted(glob.glob(os.path.join(outdir, f"{base}-*.png")))
    print(f"PNG {len(pngs)}장 → {outdir}")
    for p in pngs:
        print("  ", os.path.basename(p))

    if a.sheet and pngs:
        from PIL import Image
        thumbs = [Image.open(p) for p in pngs]
        tw = 640
        th = int(tw * thumbs[0].height / thumbs[0].width)
        cols = 3
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * (tw + 16) + 16, rows * (th + 16) + 16), (235, 239, 245))
        for i, im in enumerate(thumbs):
            im = im.convert("RGB").resize((tw, th))
            r, c = divmod(i, cols)
            sheet.paste(im, (16 + c * (tw + 16), 16 + r * (th + 16)))
        sp = os.path.join(outdir, f"{base}-sheet.png")
        sheet.save(sp)
        print("요약 이미지:", sp)


if __name__ == "__main__":
    main()
