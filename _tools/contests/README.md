# 공모전 상황판 자동 갱신

노션 공개 DB(AI 공모전 자동 수집)를 매일 읽어 claude.ai 상황판(Artifact)의 데이터를 바꿉니다.
`_tools/`는 밑줄로 시작해서 지킬 사이트에는 게시되지 않습니다.

## 흐름

1. `scrape_notion.mjs` — 헤드리스 크로미움으로 노션 표를 열고, 화면에 보이는 30줄씩 스크롤하며
   줄(block id)별로 열 이름 기준으로 모읍니다. 10줄 미만이면 실패로 끝나 기존 데이터를 지킵니다.
2. `classify.py` — 마감 지난 것 제거, 중복 제거, 상금 최대 표기(만원), 1차 판정
   (지원 가능 · 확인 필요 · 제외), 태그(AI 명시 · 숏폼 · 직접 촬영 · 큰 상금), 추천 표시,
   처음 본 날(`firstSeen`, 최근 3일 = 신규)을 붙여 `feed.json`을 만듭니다.
3. 결과를 상황판 데이터베이스의 `feed/latest` 문서 하나에 통째로 씁니다.
   우리 진행 현황은 `ops/pipeline` 문서이며, 자동 갱신은 이 문서를 건드리지 않습니다.

```bash
node _tools/contests/scrape_notion.mjs notion_raw.json
python3 _tools/contests/classify.py notion_raw.json feed.json --prev prev_feed.json
```

## 인증서

크로미움은 리눅스에서 NSS 저장소(`~/.pki/nssdb`)의 인증서를 씁니다. 원격 세션의 프록시 인증서는
바뀔 수 있으니 실행 전에 현재 인증서를 등록합니다. 인증서 검사를 끄는 옵션은 쓰지 않습니다.

```bash
command -v certutil || apt-get install -y -q libnss3-tools
certutil -A -d sql:$HOME/.pki/nssdb -n "ccr-agent-proxy-$(date +%Y%m%d%H%M)" -t "C,," -i /root/.ccr/agent-proxy-ca.crt
```

## 판정의 한계

판정은 공모전 이름과 요약에 나온 낱말만 봅니다. '확인 필요'와 신규 고액 공모전은 요강 원문을 열어
나이·지역·직업 제한과 직접 촬영 필수 여부를 사람이(또는 매일 도는 세션이) 확인해야 합니다.
