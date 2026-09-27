"""7기 모집 추천 영상 0~7번 장면 대본 틀.  `studio.py referral init` 이 recipes/ 에 JSON 으로 풀어 놓는다.

사실 확인이 필요한 문장(일정·비용)은 넣지 않았다. 확정되면 outro 의 text 나 config 의 brand.cta 에 넣는다.
"""
from __future__ import annotations

import json
from pathlib import Path

JOURNEY = "1학기 *온전론* · 기독교 세계관\n2학기 성경적 경영 · 글로벌 네트워킹\n3학기 *BAM* · Christian-MBA"

PERSONAS = [
    # key, 호명, 제목, 꼬리표, 공감 대사, 강조 대사, 증인 힌트
    ("1_경영자", "회사를 운영하시는\n*대표님*께 드리는 60초", "회사도\n*사역*이 될 수 있을까", "대표님께 드리는 60초",
     "이익과 신앙이 따로 논다고 느끼신 적 있으신가요?",
     "성경적 경영과 비즈니스 선교, 크리스천 MBA까지. 회사를 하나님 나라의 도구로 세우는 법을 함께 배웁니다.",
     "경영자 동문: 회사 운영이 어떻게 달라졌는지 한 문장"),
    ("2_직장인", "월요일이 무거운\n*직장인* 성도님께", "월요일에도\n*제자*입니다", "직장인께 드리는 60초",
     "주일의 믿음이 월요일 사무실에서는 사라지는 것 같을 때가 있죠.",
     "일터가 곧 예배의 자리라는 성경적 일터신학을 차근차근 배웁니다.",
     "직장인 동문: 출근길이 어떻게 바뀌었는지"),
    ("3_전문직", "전문성을 가진\n*당신*께 드리는 질문", "내 실력이\n*사명*이 될 때", "전문직께 드리는 60초",
     "실력은 쌓였는데, 이 실력이 어디를 향해야 하는지 고민되신 적 있나요?",
     "영역별 선교전략과 포트폴리오로, 내 전문 분야에서 할 일을 구체적으로 세웁니다.",
     "의료·교육·IT 동문: 전문 분야에서 시작한 일"),
    ("4_은퇴준비", "은퇴 이후를 준비하시는\n*장로님·권사님*께", "은퇴 뒤\n*두 번째 소명*", "인생 후반전을 위한 60초",
     "은퇴 뒤의 시간을 어떻게 쓸지, 요즘 많이 생각하시죠.",
     "평생의 경험이 다음 세대를 세우는 일로 이어지도록, 동문 공동체와 함께 길을 찾습니다.",
     "시니어 동문: 멘토링·SCIC 활동 이야기"),
    ("5_청년창업", "창업을 꿈꾸는\n*청년*에게", "창업도\n*선교*가 될까", "청년 창업가를 위한 60초",
     "사명과 사업을 함께 할 수 있을까, 한 번쯤 고민해 보셨을 거예요.",
     "비즈니스 선교, BAM을 배우고 먼저 걸어간 선배들의 네트워크를 만납니다.",
     "청년·창업 동문: 창업/스타트업 그룹 이야기"),
    ("6_교회리더", "성도들의 월요일을\n함께 고민하시는 *리더*께", "교회 밖\n*월요일*을 가르치다", "교회 리더께 드리는 60초",
     "성도들이 교회 밖에서 어떻게 살아야 할지, 가르치기 쉽지 않으시죠.",
     "온전론과 일터신학으로, 일터의 제자를 세우는 리더가 됩니다.",
     "제직 동문: 교회 안에서 달라진 섬김"),
    ("7_글로벌", "세계를 무대로\n일하시는 *당신*께", "어디서 일하든\n*선교사*입니다", "글로벌 비즈니스인을 위한 60초",
     "해외 현장에서 믿음을 지키는 일, 결코 쉽지 않습니다.",
     "폴 스티븐스 교수 등 국제 강사진과 함께 일터선교를 배우고, 세계의 동역자와 연결됩니다.",
     "해외 경험 동문 또는 비전트립 장면"),
]


def persona_recipe(key, call, title, label, empathy, promise, witness) -> dict:
    return {
        "series": "referral", "title": title, "label": label,
        "beats": [
            {"type": "card", "text": call, "dur": 2.5},
            {"type": "image", "src": f"media/{key}_공감.jpg", "hint": "그 사람의 월요일 장면 (사무실·출근길·현장)",
             "say": empathy},
            {"type": "clip", "src": f"media/{key}_동문.mp4", "start": "0:00", "end": "0:15",
             "hint": witness, "name": "동문 이름", "role": "○기 동문", "captions": "auto", "dur": 12},
            {"type": "card", "text": JOURNEY, "sub": "사랑글로벌아카데미 일터선교&글로벌네트워크아카데미",
             "say": promise},
            {"type": "outro", "text": "7기와 *함께*하세요"},
        ],
    }


ZERO = {
    "series": "referral", "title": "떠오르는\n*한 사람*에게", "label": "재학생·동문께 부탁드립니다",
    "beats": [
        {"type": "card", "text": "이 과정을 들으며\n떠오른 *한 사람*이 있나요?", "dur": 3,
         "say": "이 과정을 들으며 떠오른 한 사람이 있으신가요?"},
        {"type": "clip", "src": "media/0_동문1.mp4", "start": "0:00", "end": "0:06",
         "hint": "동문 1: 저는 ○○에게 보냈어요", "captions": "auto", "dur": 5},
        {"type": "clip", "src": "media/0_동문2.mp4", "start": "0:00", "end": "0:06",
         "hint": "동문 2: 저는 ○○에게 보냈어요", "captions": "auto", "dur": 5},
        {"type": "clip", "src": "media/0_동문3.mp4", "start": "0:00", "end": "0:06",
         "hint": "동문 3: 저는 ○○에게 보냈어요", "captions": "auto", "dur": 5},
        {"type": "card", "text": "7개 영상 중\n그분께 맞는 *하나*를\n골라 보내 주세요",
         "say": "일곱 개의 영상 중 그분께 맞는 하나를 골라, 카카오톡으로 보내 주세요."},
        {"type": "outro", "text": "한 사람의 추천이\n*한 사람*을 세웁니다"},
    ],
}

MEDIA_README = """이 폴더에 장면 파일을 넣으면 다음 실행 때 자동으로 들어갑니다.
파일이 없으면 '[촬영 예정]' 화면으로 대신 만들어져서, 촬영 전에도 전체 흐름을 볼 수 있어요.

필요한 파일 (recipes/*.json 의 "src" 와 이름이 같아야 합니다)
"""


def init(root: Path) -> list[Path]:
    rec = root / "recipes"
    med = root / "media"
    rec.mkdir(parents=True, exist_ok=True)
    med.mkdir(parents=True, exist_ok=True)
    files = []
    items = [("0_추천부탁", ZERO)] + [(p[0], persona_recipe(*p)) for p in PERSONAS]
    needed = []
    for key, data in items:
        f = rec / f"{key}.json"
        if not f.exists():
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        files.append(f)
        needed += [f"- {b['src']}  ← {b.get('hint', '')}" for b in data["beats"] if b.get("src")]
    (med / "필요한_파일.txt").write_text(MEDIA_README + "\n".join(needed) + "\n", encoding="utf-8")
    return files
