#!/usr/bin/env python3
"""질병관리청식 보고서 HWPX 생성기 — 요약보고(yoyak) 생성기의 변형.

질병관리청 실무부서 보고(계획·결과보고)의 첫 장 형식을 따른다(2025년 배포 PDF 관찰):

  ┌──────────────────────────────────────────────────────────┐
  │ ┌──────────────────────────────────────────────────────┐ │
  │ │           보 고 서 제 목 (박스, 굵게, 가운데)         │ │  ← 검은 테두리 박스
  │ └──────────────────────────────────────────────────────┘ │
  │ □ 소제목                                                 │
  │   ○ (일시) 항목                                          │
  │      - 세부                                              │
  │       ※ 참고                                             │
  │                      - 1 -                               │  ← 꼬리말 쪽번호
  └──────────────────────────────────────────────────────────┘

결재선·기관명 머리·색 띠가 없다. 글머리는 □ ○ - ⇒ ※ 다.
마크다운 문법은 yoyak.py 와 같다(프런트매터 `기관`·`결재`는 무시).

    python3 scripts/kdca_report.py 보고.md -o 보고.hwpx
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL_DIR / "scripts"))
import yoyak as Y  # noqa: E402
from hwpx_helpers import NS_DECL, next_id, reset_id  # noqa: E402

PREFIX = {"h1": "□ ", "item": "  ○ ", "sub": "     - ", "concl": "  ⇒ ", "note": "    ※ "}
BF_TITLE_BOX = "12"            # patched_header 가 추가한다
TITLE_BOX_H = 3400
FOOTER_H = 1500                # 5.3mm


def patched_header(ls: int) -> str:
    x = Y.patched_header(ls)
    box = ('<hh:borderFill id="12" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">'
           '<hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>'
           '<hh:leftBorder type="SOLID" width="0.4 mm" color="#000000"/>'
           '<hh:rightBorder type="SOLID" width="0.4 mm" color="#000000"/>'
           '<hh:topBorder type="SOLID" width="0.4 mm" color="#000000"/>'
           '<hh:bottomBorder type="SOLID" width="0.4 mm" color="#000000"/>'
           '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/></hh:borderFill>')
    assert '<hh:borderFills itemCnt="11">' in x
    x = x.replace('<hh:borderFills itemCnt="11">', '<hh:borderFills itemCnt="12">')
    x = x.replace('</hh:borderFills>', box + '</hh:borderFills>')
    return x


def title_box(title: str) -> str:
    w = Y.BODY_W
    ch = 2000                                        # CP_TITLE 20pt
    usable = w - Y.CELL_M[0] - Y.CELL_M[1]
    lines = max(1, -(-Y.text_width(title, ch) // usable))
    h = lines * round(ch * 1.6) + 1000
    row = f'<hp:tr>{Y.cell(0, 0, w, h, BF_TITLE_BOX, [Y.text_para(Y.PP_TITLE, Y.CP_TITLE, title)])}</hp:tr>'
    tbl = Y.table([row], 1, 1, w, h, BF_TITLE_BOX, outmargin=(0, 0, 0, 0))
    return Y.para(Y.PP_TITLE, f'<hp:run charPrIDRef="{Y.CP_BODY}">{tbl}</hp:run>')


def footer_para() -> str:
    """꼬리말: '- N -' 가운데. fill_hwpx.py 의 봉투 구조를 따른다."""
    inner = (f'<hp:run charPrIDRef="{Y.CP_NOTE}"><hp:t>- </hp:t></hp:run>'
             f'<hp:run charPrIDRef="{Y.CP_NOTE}"><hp:ctrl><hp:autoNum num="1" numType="PAGE">'
             f'<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar="" supscript="0"/>'
             f'</hp:autoNum></hp:ctrl><hp:t> -</hp:t></hp:run>')
    footer = (f'<hp:footer id="{next_id()}" applyPageType="BOTH"><hp:subList id="" textDirection="HORIZONTAL" '
              f'lineWrap="BREAK" vertAlign="BOTTOM" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" '
              f'textHeight="0" hasTextRef="0" hasNumRef="0">'
              f'<hp:p id="{next_id()}" paraPrIDRef="{Y.PP_TITLE}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
              f'{inner}</hp:p></hp:subList></hp:footer>')
    return Y.para(Y.PP_PLAIN, f'<hp:run charPrIDRef="{Y.CP_BODY}"><hp:ctrl>{footer}</hp:ctrl></hp:run>')


def build_section(meta: dict, title: str, blocks: list, images: list) -> str:
    reset_id(1000000000)
    P = ['<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>', f'<hs:sec {NS_DECL}>']
    sec = Y.sec_pr(footer=FOOTER_H)
    P.append(f'<hp:p id="{next_id()}" paraPrIDRef="{Y.PP_PLAIN}" styleIDRef="0" pageBreak="0" '
             f'columnBreak="0" merged="0"><hp:run charPrIDRef="{Y.CP_BODY}">{sec}{Y.col_pr()}<hp:t/></hp:run></hp:p>')
    P.append(footer_para())
    P.append(title_box(title))
    P.append(Y.spacer())
    first_h1 = True
    for b in blocks:
        t = b[0]
        if t == "h1":
            if not first_h1:
                P.append(Y.spacer())
            first_h1 = False
            P.append(Y.text_para(Y.PP_H1, Y.CP_H1, PREFIX["h1"] + b[1]))
        elif t == "item":
            P.append(Y.text_para(Y.PP_ITEM, Y.CP_BODY, PREFIX["item"] + b[1]))
        elif t == "sub":
            P.append(Y.text_para(Y.PP_SUB, Y.CP_BODY, PREFIX["sub"] + b[1]))
        elif t == "concl":
            P.append(Y.text_para(Y.PP_CONCL, Y.CP_CONCL, PREFIX["concl"] + b[1]))
        elif t == "note":
            P.append(Y.text_para(Y.PP_NOTE, Y.CP_NOTE, PREFIX["note"] + b[1]))
        elif t == "para":
            P.append(Y.text_para(Y.PP_BODY, Y.CP_BODY, b[1]))
        elif t == "table":
            P.append(Y.content_table(b[1]))
        elif t == "pagebreak":
            P.append(Y.para(Y.PP_PLAIN, f'<hp:run charPrIDRef="{Y.CP_BODY}"><hp:t/></hp:run>').replace('pageBreak="0"', 'pageBreak="1"'))
        elif t == "image":
            ip = Path(b[2])
            if not ip.is_absolute():
                ip = meta.get("_base", Path(".")) / ip
            if not ip.exists():
                raise SystemExit(f"그림 파일이 없다: {ip}")
            pw, ph = Y.image_px(ip)
            w = min(Y.BODY_W, pw * 75)
            h = round(w * ph / pw)
            iid = f"image{len(images) + 1}"
            images.append((iid, ip))
            P.append(Y.para(Y.PP_PLAIN, f'<hp:run charPrIDRef="{Y.CP_BODY}">{Y.pic(iid, w, h, "CENTER")}<hp:t/></hp:run>'))
    P.append("</hs:sec>")
    return "\n".join(P)


def generate_text(text: str, out: Path, *, base_dir: Path = Path("."), metadata_date: str | None = None) -> Path:
    meta, body = Y.parse_front_matter(text)
    meta["_base"] = Path(base_dir)
    title, blocks = Y.parse_body(body)
    if not title:
        raise SystemExit("제목이 없다 — `# 제목` 줄을 넣어라")
    images: list = []
    section = build_section(meta, title, blocks, images)
    header = patched_header(int(meta.get("줄간격") or Y.LINE_SPACING))
    Y.write_hwpx(out, header, section, title, images, metadata_date or meta.get("보고일", ""))
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="질병관리청식 보고서 HWPX 생성")
    ap.add_argument("md", type=Path)
    ap.add_argument("-o", "--output", type=Path, required=True)
    ap.add_argument("--metadata-date", default=None)
    a = ap.parse_args()
    generate_text(a.md.read_text(encoding="utf-8"), a.output, base_dir=a.md.parent, metadata_date=a.metadata_date)
    print(a.output)


if __name__ == "__main__":
    main()
