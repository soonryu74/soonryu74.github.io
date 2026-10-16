"""오토샘 모션 메뉴 — 코드마다 미리보기 영상(360×640)과 menu.json 을 만든다(메뉴판 페이지 재료).
사용: python menu.py OUTDIR [코드 …]      (코드 생략 = 전부)
결과: OUTDIR/<코드>.mp4 · <코드>.jpg · menu.json"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import typo  # noqa: E402
from common import ff  # noqa: E402

# 코드: (예시 장면, 주문 예문, 어울리는 곳)
ITEMS = {
    "O01": ({"type": "title", "kicker": "오토샘 · 영상 자동화", "lines": ["강의 30분이", "쇼츠 *10개*로"], "dur": 3.0}, "첫 장면은 O01 여는 제목으로", "쇼츠 첫 1초 · 강의 홍보"),
    "O02": ({"type": "end", "lines": ["여러분도", "*할 수 있어요*"], "dur": 2.8}, "마지막은 O02 끝 화면으로", "마무리 인사 · 구독 안내"),
    "T01": ({"type": "type", "lines": ["회의록 정리,", "*AI에게* 맡기세요"], "dur": 3.0}, "이 문장은 T01 타자 치듯", "업무 자동화 · 화면 시연 느낌"),
    "T02": ({"type": "jamo", "lines": ["한글이 *한 획씩*", "조립됩니다"], "dur": 3.2}, "제목을 T02 한글 자모 타자로", "한글 강조 · 어르신 대상 친근함"),
    "T03": ({"type": "slam", "text": "*무료*", "sub": "설치도 가입도 없이", "dur": 2.6}, "‘무료’는 T03 글자 쾅 (한 편에 한 번만)", "핵심 한 단어 · 반전"),
    "T04": ({"type": "pop", "text": "편집 몰라도 *이거면 끝*", "dur": 2.6}, "T04 단어 튀어나오기로", "짧은 훅 문장"),
    "T05": ({"type": "rise", "lines": ["찍기만 하세요", "나머지는 *AI가*"], "dur": 2.6}, "두 줄을 T05 단어 올라오기로", "차분한 설명 · 신뢰 톤"),
    "T06": ({"type": "decode", "lines": ["숨겨진 *꿀조합*", "공개합니다"], "dur": 2.8}, "T06 해독 글자로 공개하듯", "숨겨진 기능 · 비밀 공개"),
    "T07": ({"type": "wipe", "lines": ["받아쓰기 · 명장면", "*자막*까지 한 번에"], "dur": 2.6}, "T07 줄 닦기로", "기능 나열"),
    "T08": ({"type": "slide", "lines": ["왼쪽에서", "오른쪽에서 *번갈아*"], "dur": 2.6}, "T08 좌우에서 밀기로", "대비 · 전후 비교"),
    "T09": ({"type": "highlight", "lines": ["월요일 *두 시간*을", "*5분*으로"], "dur": 2.8}, "숫자에 T09 형광펜", "숫자·결과 강조"),
    "T10": ({"type": "underline", "lines": ["핵심은", "*고르기만* 하는 것"], "dur": 2.6}, "‘고르기만’에 T10 밑줄", "강의 요점"),
    "T11": ({"type": "strike", "wrong": "편집은 기술", "right": "편집은 *반복*", "dur": 3.0}, "T11 지우고 고쳐 쓰기로", "고정관념 뒤집기"),
    "T12": ({"type": "stack", "text": "*자동화*", "dur": 2.6}, "T12 우르르 쌓기로", "한 단어 제목 · 재미"),
    "T13": ({"type": "wave", "text": "*꿀조합*", "dur": 2.6}, "T13 물결 글자로", "가벼운 분위기 · 쇼츠 끝"),
    "T14": ({"type": "quote", "text": "반복은 AI에게 넘기고, 우리는 고르기만 하면 됩니다", "by": "오토샘", "dur": 3.2}, "이 말은 T14 인용 카드로", "명언 · 후기 · 강의 한 줄"),
    "N01": ({"type": "count", "to": 120, "suffix": "분", "label": "한 달에 아끼는 편집 시간", "dur": 2.8}, "120분은 N01 숫자 올라가기로", "성과 · 통계"),
    "N02": ({"type": "list", "title": "*3단계*면 끝", "items": ["영상 올리기", "명장면 고르기", "확인하고 OK"], "dur": 3.4}, "단계는 N02 목록 차례로", "방법 · 순서"),
    "B01": ({"type": "stamp", "text": "오늘 공개", "sub": "설치 없이 바로", "dur": 2.6}, "끝에 B01 도장 쾅", "마감 · 공지 · 결론"),
}


def main(out_dir: str, codes: list[str]) -> None:
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    rows = []
    for code in (codes or list(ITEMS)):
        scene, order, where = ITEMS[code]
        kind, name = typo.MENU[code]
        sc = dict(scene); sc["type"] = code
        spec = out / f"_{code}.json"
        spec.write_text(json.dumps({"out": f"_{code}_full.mp4", "aspect": "9:16", "bg": "navy", "scenes": [sc]}, ensure_ascii=False), encoding="utf-8")
        full = typo.main(str(spec))
        ff(["-i", str(full), "-vf", "scale=360:640:flags=lanczos", "-c:v", "libx264", "-crf", "30", "-preset", "medium", "-an",
            "-movflags", "+faststart", str(out / f"{code}.mp4")])
        ff(["-ss", f"{scene['dur'] * 0.8:.2f}", "-i", str(full), "-frames:v", "1", "-vf", "scale=360:640", "-q:v", "4", str(out / f"{code}.jpg")])
        full.unlink(); spec.unlink()
        snippet = {k: v for k, v in scene.items() if k != "type"}
        rows.append({"code": code, "name": name, "kind": kind, "order": order, "where": where,
                     "scene": {"type": code, **snippet}})
        print("MENU", code, name, flush=True)
    (out / "menu.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print("DONE", out / "menu.json", len(rows), flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
