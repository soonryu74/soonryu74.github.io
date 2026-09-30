"""2026 비전트립(튀르키예 & 그리스) 9편 — 파랑 종이 배경 여행 일지 썸네일 + (영상이 있으면) 표지 붙인 영상.
사용: cd yt-studio/pipeline && python jobs/비전트립/run.py [일차 …]
  · 사진은 유튜브가 공개하는 장면 이미지(i.ytimg.com …/maxres1~3.jpg)를 받아 쓴다 (영상 다운로드 불필요).
  · projects/saga/trip/src/day{N}.mp4 가 있으면 썸네일을 맨 앞 0.6초에 붙인 …_표지포함.mp4 도 만든다.
    (영상은 유튜브 스튜디오 → 콘텐츠 → ⋮ → 다운로드 로 받아 그 이름으로 넣어 두면 된다.)"""
import sys
from pathlib import Path
import requests
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ytauto import shorts
from ytauto.config import load_config
from ytauto.diary import diary_thumbnail
from ytauto.fonts import font_set

DAYS = [  # (유튜브 ID, 큰 사진, 작은 사진, 장소, 손글씨 한 줄)
    ("OS0_-WPg19o", 1, 3, "튀르키예로\n*출발*!", "소명 리부팅, 여정의 시작"),
    ("50e0sagShWQ", 2, 3, "*갑바도기아*", "우리가 간다!"),
    ("oTnXOROrvG4", 3, 2, "*라오디게아*\n히에라볼리", "요한계시록 일곱 교회"),
    ("Jo_oFkrk0bo", 2, 3, "빌라델비아\n사데\n*에베소*", "요한계시록 일곱 교회"),
    ("bPpl1CqnZYw", 2, 1, "*고린도*\n아테네", "바울의 발자취"),
    ("nx6urWLhvf0", 2, 3, "*메테오라*\n수도원", "하늘 위의 수도원"),
    ("TRGkSi57bX8", 3, 2, "베뢰아\n*데살로니가*\n네압볼리", "바울의 발자취"),
    ("2hpUa60hgqc", 3, 2, "*빌립보*\n루디아 세례터\n바울의 감옥", "바울의 발자취"),
    ("jpTIYt9kDeI", 1, 2, "*이스탄불*\n아야 소피아", "9일 여정의 마지막 날"),
]
BG = ("#0A1A33", "#2B5C97")  # 확정 배경: 짙은 남색 → 파랑 종이 질감 (2026-09-30)
# 구글 드라이브 '비전트립' 폴더의 파일 이름 → 일차 (2026-09-30 확인). src/ 에 이 이름 그대로 넣어도 된다.
SRC_ALIASES = {
    "2026_09_30 13_27.mp4": 1, "2026_09_30 13_27 (1).mp4": 2, "2026_09_30 13_27 (2).mp4": 3,
    "2026_09_30 13_27 (3).mp4": 4, "2026_09_30 13_29.mp4": 5, "2026_09_30 13_30.mp4": 6,
    "2026_09_30 13_33.mp4": 7, "2026_09_30 13_31.mp4": 8, "2026_09_30 13_31 (1).mp4": 9,
}


def source_video(R: Path, day: int) -> Path | None:
    """src/day{N}.mp4 가 있으면 그것, 없으면 드라이브 파일 이름으로 찾는다."""
    p = R / "src" / f"day{day}.mp4"
    if p.exists():
        return p
    for name, d in SRC_ALIASES.items():
        if d == day and (R / "src" / name).exists():
            return R / "src" / name
    return None


def frame(vid: str, n: int, out: Path) -> Path:
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        for name in (f"maxres{n}", f"sd{n}", f"hq{n}"):
            r = requests.get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg", timeout=30)
            if r.status_code == 200 and len(r.content) > 3000:
                out.write_bytes(r.content)
                break
    return out


if __name__ == "__main__":
    cfg = load_config(None)
    F = font_set(cfg)
    R = Path("projects/saga/trip")
    only = [int(a) for a in sys.argv[1:]]
    for i, (vid, big, small, places, kicker) in enumerate(DAYS, 1):
        if only and i not in only:
            continue
        W = R / f"day{i}"
        p1 = frame(vid, big, W / "frames" / f"maxres{big}.jpg")
        p2 = frame(vid, small, W / "frames" / f"maxres{small}.jpg")
        th = diary_thumbnail(W / f"day{i}_썸네일_가로.jpg", i, len(DAYS), places, F, p1, p2, kicker=kicker, bg=BG)
        print("THUMB", th, flush=True)
        src = source_video(R, i)
        if src:
            out = shorts.with_cover(src, th, W / f"day{i}_표지포함.mp4")
            print("VIDEO", out, flush=True)
