# 말씀 챈트송 리릭비디오 제작 도구

음원 + 말씀카드 → 1920×1080 리릭비디오(MP4). 가사 싱크는 AI 음성인식 + 강제정렬로 자동 계산한다.

## 준비 (새 환경에서 한 번)

```bash
sudo apt-get install -y ffmpeg fonts-noto-cjk
python3 -m pip install faster-whisper pillow numpy
```

## 한 편 만들기

```bash
mkdir -p series/C1-4 && cp 음원.mp3 series/C1-4/source.mp3
# 1) lyrics.json 작성 — 제목·뱃지·로고글자·배색·절별 출처/테마/가사 (| 로 의미 단위 줄바꿈)
python3 transcribe_words.py series/C1-4      # 2) 단어 타임스탬프 (편당 10~15분)
# 3) 출력된 전사를 보고 structure.json 작성 — 절 순서·반복 횟수·곡 길이·마지막 가사 끝 시각
python3 align.py series/C1-4                 # 4) 가사 ↔ 음성 정렬 → cuespec.json
python3 make_video.py series/C1-4 "제목_말씀챈트송_1-4절.mp4"   # 5) 렌더링
python3 verify.py series/C1-4 "series/C1-4/제목_말씀챈트송_1-4절.mp4"  # 6) 검증 시트
```

## 파일

| 파일 | 역할 |
|---|---|
| `render.py` | 화면 디자인 (안내화면·가사화면·간주·목차) |
| `transcribe_words.py` | Whisper large-v3 단어 단위 전사 → `words.json` |
| `patch_words.py` | 전사가 통째로 건너뛴 구간만 재전사해 채워 넣기 |
| `align.py` | 순서 보장 DP 정렬 → `cuespec.json` (낭독 횟수 자동 판정, 놓친 낭독 복원, 전환 0.35초 지연) |
| `make_video.py` | 프레임 생성 + ffmpeg 인코딩 |
| `verify.py` | 절마다 안내화면·첫 줄을 캡처한 확인용 시트 |

## 주의 (실제로 겪은 문제)

- **반복 횟수는 반드시 전사로 확인.** 눈대중으로 정하면 뒤가 전부 밀린다.
- large-v3 가 똑같은 반복 구간을 통째로 건너뛸 때가 있다(A 1-4절 2절 4·5회차). 전사에 큰 공백이 있으면 `patch_words.py <폴더> <시작초> <끝초>`.
- 첫 화면은 0초부터 시작해야 한다(`make_video.py`가 강제). 아니면 영상 전체가 앞당겨진다.
- 테마 pill 문구는 말씀카드 원본 그대로 쓴다.

## 완성 목록

| 폴더 | 제목 | 비고 |
|---|---|---|
| A1-4 | 새로운 삶 1-4절 | 1절 4회 · 2절 5회 · 3절 3회 · 4절 2회, 2절 구간 patch 필요(113~170초) |
| A5-8 | 새로운 삶 5-8절 | 각 3회 |
| A9-12 | 새로운 삶 9-12절 | 각 3회 |
| B1-4 | 그리스도를 전파함 1-4절 | 각 3회 |
| B5-8 | 그리스도를 전파함 5-8절 | 6절만 2회 |
| B9-12 | 그리스도를 전파함 9-12절 | 각 3회, 11절 낭독 ASR 누락 → 공백복원 |
