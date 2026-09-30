"""SaGA 일터선교&글로벌네트워크아카데미 7기(2027학년도) 모집 홍보 영상 — 장면 대본.\n\n원칙(해외·국내 모집 영상 조사 반영, 2026-09-30):\n· 첫 3초는 정체성 질문(주일의 믿음이 월요일에도 살아 있는가) → 긴장 → 약속 → 증거 → 사실 카드 → 행동 하나.\n· 내레이션은 정체성 문장만, 숫자·자격·연락처는 카드와 설명란에.\n· 일정(접수·개강·등록금)은 미정이라 넣지 않는다. 확정되면 FACT 카드 sub 와 설명란에 추가.\n· AI 장면에는 얼굴을 넣지 않는다(뒷모습·손·사물·풍경). 실제 촬영분이 생기면 clip 으로 바꿔 끼운다.\n"""
from __future__ import annotations

# ── AI 장면 재료: 이름 → (종류, 프롬프트)   종류: veo(8초 영상) | img(그림)
MEDIA: dict[str, tuple[str, str]] = {
    "v_seoul_dawn": ("veo", "Cinematic aerial drone shot of Seoul at dawn, Han river and Lotte tower, office windows lighting up "
                            "one by one as the sun rises, soft golden light, slow forward push, photorealistic, no people, no text"),
    "v_hands_work": ("veo", "Cinematic close-up of a person's hands at a bright office desk in morning light: typing on a laptop, "
                            "then writing in a notebook beside a cup of coffee and a small open bible, shallow depth of field, "
                            "no face visible, no text, warm natural light, slow gentle camera drift"),
    "v_seminar": ("veo", "Cinematic slow dolly through a modern bright seminar room before class: wooden tables, notebooks and pens "
                         "laid out, a glass of water, morning sun through tall windows, empty chairs, no people, no text"),
    "v_walk_sunrise": ("veo", "Cinematic wide shot from behind of a small group of adults in smart-casual clothes walking together "
                              "along an ancient stone road among Greek ruins at golden hour, long shadows, faces not visible, "
                              "slow tracking shot, warm light, no text"),
    "i_commute": ("img", "commuters seen from behind on a crowded Seoul subway platform on a grey Monday morning, blurred motion, "
                         "cool tones, no faces visible, cinematic"),
    "i_desk_bible": ("img", "an open bible beside a laptop and a mug on an office desk, soft morning window light, still life"),
    "i_shop": ("img", "a small neighborhood cafe counter at opening time, espresso machine steaming, chairs still up, warm light, no people"),
    "i_clinic": ("img", "a clean modern clinic consultation room in the morning, stethoscope on the desk, sunlight through blinds, no people"),
    "i_globe": ("img", "a desk globe beside a laptop showing a world map of glowing connection lines, night office, warm lamp light, no people"),
    "i_whiteboard": ("img", "a startup office whiteboard covered with sticky notes and a hand-drawn business plan, morning light, no people"),
    "i_bag_evening": ("img", "a worn leather briefcase, a notebook and a phone on a desk in warm evening light, city lights outside the window"),
    "i_books": ("img", "a stack of theology and business books with a coffee cup on a wooden table, soft natural light, no text legible"),
}

FACULTY = "폴 스티븐스 · 마이클 리브스 · 전광식 · 김선일\n오정현 · 이돈주 · 유종성 · 최형근"
CURRICULUM = "1학기 *온전론* · 기독교 세계관 · 성경적 일터신학\n2학기 성경적 경영 · *글로벌 네트워킹*\n3학기 *BAM* · Christian-EMBA · 선교전략"
CONTACT = "saga121.com  ·  카카오톡 ‘사랑글로벌아카데미’  ·  02-3495-8300"

# ── 풀버전 (16:9, 약 2분 30초)
FULL = {
    "series": "recruit", "voice": "ko-KR-InJoonNeural",
    "title": "당신의 일터도\n*선교지*입니다", "label": "SaGA 7기 모집",
    "beats": [
        {"type": "clip", "src": "media/v_seoul_dawn_crop.mp4", "captions": "",
         "say": "월요일 아침, 서울의 창문들이 하나씩 켜집니다. 오늘도 수많은 그리스도인이 일터로 나갑니다."},
        {"type": "image", "src": "media/i_commute.jpg",
         "say": "그런데 이상하지요. 주일에 뜨겁던 믿음이, 월요일 사무실 문 앞에서는 작아집니다."},
        {"type": "card", "text": "주일의 믿음은\n월요일에도 *살아* 있습니까?", "dur": 3.5},
        {"type": "image", "src": "media/i_desk_bible.jpg",
         "say": "성경은 일을 저주라고 말하지 않습니다. 일은 에덴에서부터 있었던 축복이고, 하나님은 지금도 일하십니다."},
        {"type": "image", "src": "media/i_shop.jpg",
         "say": "그렇다면 당신의 책상과 매장, 진료실과 교실은 이미 선교지입니다."},
        {"type": "card", "text": "사랑글로벌아카데미\n일터선교 & 글로벌네트워크아카데미", "sub": "1년 · 3학기 · 온라인과 오프라인 병행",
         "say": "사랑글로벌아카데미 일터선교 글로벌네트워크아카데미는, 일터에서 예수님의 제자로 사는 법을 1년 동안 훈련하는 과정입니다."},
        {"type": "card", "text": "사랑의교회 40년\n*제자훈련*의 토대 위에", "sub": "신학 · 경영 · 선교 전략을 한자리에서",
         "say": "사랑의교회 사십 년 제자훈련의 토대 위에, 신학과 경영, 선교 전략을 한자리에서 배웁니다."},
        {"type": "clip", "src": "media/v_seminar.mp4", "captions": "",
         "say": "1학기에는 온전론과 기독교 세계관, 성경적 일터신학으로 기초를 세우고,"},
        {"type": "image", "src": "media/i_globe.jpg",
         "say": "2학기에는 성경적 경영과 글로벌 네트워킹으로 시야를 넓히며,"},
        {"type": "image", "src": "media/i_whiteboard.jpg",
         "say": "3학기에는 비즈니스 애즈 미션과 크리스천 이엠비에이로, 내 일터에 맞는 선교 전략과 포트폴리오를 완성합니다."},
        {"type": "card", "text": "함께하는 교수진", "sub": FACULTY,
         "say": "리젠트 칼리지의 폴 스티븐스, 영국 유니온 신학교의 마이클 리브스를 비롯한 국내외 교수진이 함께합니다."},
        {"type": "clip", "src": "media/v_walk_sunrise.mp4", "captions": "",
         "say": "그리고 혼자 걷지 않습니다. 먼저 이 길을 걸은 동문 공동체와, 바울의 발자취를 따라가는 비전트립까지."},
        {"type": "clip", "src": "media/v_hands_work.mp4", "captions": "",
         "say": "직장을 그만두지 않아도 됩니다. 온라인과 오프라인 수업이 함께 열려, 일하면서 배웁니다."},
        {"type": "card", "text": "누구를 위한 과정인가", "sub": "기업 CEO · 직장인 · 전문직 · 공직자\n창업을 준비하는 청년 · 인생 후반전을 준비하는 분",
         "say": "회사를 운영하는 대표님, 월요일이 무거운 직장인, 전문직과 공직자, 창업을 꿈꾸는 청년, 그리고 인생 후반전을 준비하는 분까지."},
        {"type": "card", "text": "지원 자격", "sub": "세례(입교) 후 3년 이상 · 학사 이상 (특별한 경우 예외 가능)\n직업·직분 제한 없음",
         "say": "세례받은 지 삼 년이 지난 분이라면, 어떤 직업이든 지원할 수 있습니다."},
        {"type": "card", "text": "2027학년도\n*7기* 모집", "sub": CONTACT,
         "say": "2027학년도 7기를 모집합니다. 자세한 일정은 홈페이지 saga121.com 에서 확인하세요. 당신의 다음 이야기가, 당신의 일터에서 시작됩니다."},
        {"type": "outro", "text": "당신의 일터도\n*선교지*입니다", "dur": 5},
    ],
}

# ── 쇼츠 1: 질문형 (35초) — 한 사람, 한 질문, 한 문장
SHORT_Q = {
    "series": "recruit", "voice": "ko-KR-InJoonNeural",
    "title": "나는 오늘도\n*선교지*로 출근합니다", "label": "SaGA 7기 모집",
    "beats": [
        {"type": "card", "text": "주일의 믿음,\n월요일에도\n*살아* 있습니까?", "dur": 3,
         "say": "주일의 믿음, 월요일에도 살아 있습니까?"},
        {"type": "image", "src": "media/s_commute.jpg",
         "say": "출근길에서 작아지는 믿음. 많은 분이 그렇게 느낍니다."},
        {"type": "image", "src": "media/s_desk_bible.jpg",
         "say": "그런데 성경은 일을 저주가 아니라 축복이라고 말합니다. 하나님이 지금도 일하시기 때문입니다."},
        {"type": "image", "src": "media/s_bag_evening.jpg",
         "say": "그렇다면 당신의 책상, 당신의 일터는 이미 선교지입니다."},
        {"type": "card", "text": "일터에서 제자로 사는 법\n*1년* 훈련", "sub": "사랑글로벌아카데미 일터선교&글로벌네트워크아카데미",
         "say": "사랑글로벌아카데미에서 일터의 제자로 사는 법을 1년 동안 함께 배웁니다."},
        {"type": "outro", "text": "2027학년도\n*7기* 모집", "dur": 4},
    ],
}

# ── 쇼츠 2: 선언문형 (45초) — "우리는 믿습니다"
SHORT_CREED = {
    "series": "recruit", "voice": "ko-KR-InJoonNeural",
    "title": "우리는\n*믿습니다*", "label": "SaGA 7기 모집",
    "beats": [
        {"type": "card", "text": "우리는 믿습니다", "dur": 2.5, "say": "우리는 믿습니다."},
        {"type": "image", "src": "media/s_desk_bible.jpg",
         "say": "일은 타락의 형벌이 아니라, 창조 때부터 있던 축복이라는 것을."},
        {"type": "image", "src": "media/s_commute.jpg",
         "say": "회의실과 병동과 작업장에도 하나님이 이미 계시다는 것을."},
        {"type": "image", "src": "media/s_globe.jpg",
         "say": "한 사람의 정직한 일이 도시를 바꾸고, 열방을 잇는다는 것을."},
        {"type": "card", "text": "무엇을 믿을지가 아니라\n*어떻게 살아낼지*를", "sub": "일터에서, 함께 배웁니다",
         "say": "그래서 우리는 무엇을 믿을지가 아니라, 일터에서 어떻게 살아낼지를 함께 배웁니다."},
        {"type": "card", "text": "당신의 일터도\n*선교지*입니다", "sub": "사랑글로벌아카데미 일터선교&글로벌네트워크아카데미",
         "say": "당신의 일터도 선교지입니다."},
        {"type": "card", "text": "2027학년도 *7기* 모집", "sub": "saga121.com", "say": "사랑글로벌아카데미 7기, saga121.com 에서 만나요."},
        {"type": "outro", "text": "당신의 일터도\n*선교지*입니다", "dur": 4},
    ],
}

# ── 쇼츠 3: 지원 방법 30초 — 절차 영상은 따로 (조회수가 높은 유형)
SHORT_HOWTO = {
    "series": "recruit", "voice": "ko-KR-SunHiNeural",
    "title": "7기 지원,\n*이렇게* 하세요", "label": "SaGA 7기 모집",
    "beats": [
        {"type": "card", "text": "일터선교아카데미\n7기 지원 방법", "dur": 2.5, "say": "일터선교 글로벌네트워크아카데미 7기, 지원은 이렇게 하세요."},
        {"type": "card", "text": "① 지원 자격", "sub": "세례(입교) 후 3년 이상\n학사 이상 (특별한 경우 예외 가능)",
         "say": "첫째, 지원 자격. 세례 또는 입교 후 삼 년이 지난 분, 학사 이상이면 됩니다. 특별한 경우 예외도 있습니다."},
        {"type": "card", "text": "② 온라인 원서", "sub": "saga121.com → 입학전형 → 입학신청",
         "say": "둘째, 홈페이지 saga121.com 에서 입학전형, 입학신청으로 들어가 원서를 입력합니다."},
        {"type": "card", "text": "③ 제출 서류", "sub": "신앙간증문 · 목회자 추천서 · 세례(출석)교인증명서 · 졸업증명서",
         "say": "셋째, 신앙간증문과 목회자 추천서, 세례교인증명서와 졸업증명서를 교학처에 보냅니다."},
        {"type": "card", "text": "④ 서류 → 면접", "sub": "1차 서류전형 합격자 대상 면접 · 개별 안내",
         "say": "넷째, 서류전형을 통과하면 면접 안내를 개별로 받습니다."},
        {"type": "card", "text": "궁금한 점은\n*카카오톡*으로", "sub": "카카오톡 채널 ‘사랑글로벌아카데미’ · 02-3495-8300",
         "say": "일정과 궁금한 점은 카카오톡 사랑글로벌아카데미 채널로 물어보세요."},
        {"type": "outro", "text": "2027학년도\n*7기* 모집", "dur": 4},
    ],
}

RECIPES = {"풀버전": FULL, "쇼츠1_질문": SHORT_Q, "쇼츠2_선언": SHORT_CREED, "쇼츠3_지원방법": SHORT_HOWTO}
