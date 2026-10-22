// 기술 및 제품 자료 PDF — node techdoc.mjs (서비스 링크·QR·화면·검증·기술 사양)
import { chromium } from '/home/user/soonryu74.github.io/movesafe/node_modules/@playwright/test/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const b64 = (f) => `data:image/png;base64,${readFileSync(path.join(here, f)).toString('base64')}`;
const font = `file:///root/.fonts/NotoSansKR-Regular.ttf`;
const URL = 'https://soonryu74.github.io/movesafe/';
const fig = (f, cap, w = '100%') => `<figure style="width:${w}"><img src="${b64(f)}"><figcaption>${cap}</figcaption></figure>`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{font-family:"NSK";src:url("${font}");}
@page{size:A4;margin:16mm 14mm;}
body{font-family:"NSK","Malgun Gothic",sans-serif;color:#18212b;font-size:10.5pt;line-height:1.55;margin:0}
h1{font-size:22pt;margin:0 0 4px;color:#0b6e4f}
h2{font-size:14pt;margin:18px 0 6px;border-bottom:2px solid #dde3e9;padding-bottom:3px;break-after:avoid}
.sub{color:#5c6773;margin:0 0 10px}
table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:6px 0}
th,td{border:1px solid #dde3e9;padding:5px 7px;text-align:left;vertical-align:top}
th{background:#f1f4f7}
.box{display:flex;gap:16px;align-items:center;border:1px solid #dde3e9;border-radius:10px;padding:10px 14px;margin:8px 0}
.box img{width:110px;height:110px}
.url{font-size:13pt;font-weight:700;color:#0b6e4f;word-break:break-all}
figure{margin:8px 0;break-inside:avoid}
figure img{width:100%;border:1px solid #dde3e9;border-radius:6px}
figcaption{font-size:9pt;color:#5c6773;margin-top:3px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.muted{color:#5c6773;font-size:9.5pt}
ul{margin:4px 0;padding-left:18px}
.pb{break-before:page}
</style></head><body>
<h1>MoveSafe AI — 기술 및 제품 자료</h1>
<p class="sub">2026 경기스포츠산업 공모전 · 경기력 향상 기술(스마트 트레이닝·부상 예방·재활·뉴트리션) · 제출자 서순려 · 2026-10-22</p>

<div class="box"><img src="${b64('qr-movesafe.png')}"><div><div class="muted">서비스 링크 (설치·가입 없음, 웹 브라우저에서 바로 실행)</div><div class="url">${URL}</div><div class="muted">카메라 사용은 HTTPS 에서 브라우저가 권한을 묻습니다. 카메라 없이도 "샘플 재생"(합성 골격, DEMO 표시)으로 전체 흐름을 체험할 수 있습니다. 영양 페이지: ${URL}nutrition.html · 근거·한계: ${URL}about.html</div></div></div>

<h2>1. 제품 개요</h2>
<table><tr><th style="width:22%">항목</th><th>내용</th></tr>
<tr><td>한 줄</td><td>웹캠으로 스쿼트·런지·점프 착지 자세를 브라우저 안에서 분석해 부상 위험 동작을 즉시 알려주고 예방 루틴을 주는 폼 코치 + 스포츠 영양 가이드</td></tr>
<tr><td>사용자</td><td>생활체육인, 학생 선수, 동호회·학교 지도자, 수술·부상 후 복귀자</td></tr>
<tr><td>폼 코치</td><td>관절 33개 실시간 추적 → 무릎 굴곡각, 무릎/발목 간격비(KASR), 무릎 안쪽 변위, 몸통 기울기, 좌우 비대칭, 착지 후 0.3초 내 최소 무릎각 → 반복(렙) 자동 감지, 점수·단서, 세션 리포트, 문제별 루틴(FIFA 11+·JOSPT 2018·PEP 기반)</td></tr>
<tr><td>영양</td><td>체중·훈련량·목표 → 탄수화물·단백질·수분 범위(ACSM·AND·DC 2016, ACSM 2007), 땀 손실 계산, 보충제 5종 체중별 용량(AIS A군·IOC 2018), 도핑 주의 성분 23개(WADA 2026 분류, KADA 연결)</td></tr>
<tr><td>입력 모드</td><td>① 실시간 카메라 ② 영상 파일 업로드 ③ 합성 샘플 동작 6종(DEMO)</td></tr>
<tr><td>상태</td><td>출시 전 MVP, 동작함. 도입·사용자·수상 실적 없음. 의료 진단·치료·재활 처방 아님(선별·교육용)</td></tr></table>

<h2>2. 화면</h2>
${fig('live-home.png', '그림 1. 폼 코치 첫 화면(1440px). 분석 화면 + 이번 세션 패널. 상단 배지: 영상 전송 없음 · MediaPipe Pose · 규칙 기반 피드백', '80%')}
<div class="grid">${fig('live-valgus-stage.png', '그림 2. 스쿼트 최저점 — 무릎/발목 간격비 0.23으로 무릎 선이 빨갛게 표시(DEMO 샘플)')}${fig('live-landing-stage.png', '그림 3. 점프 착지 샘플 — 착지 후 최소 무릎각으로 딱딱한 착지 판정(DEMO 샘플)')}</div>
<div class="grid">${fig('live-valgus-panel.png', '그림 4. 반복 점수·플래그·단서, 지표(최저점), 기준 안내')}${fig('shot-landing-report.png', '그림 5. 세션 리포트 — 반복별 표, 반복된 문제, 추천 루틴(출처 표기)')}</div>
<div class="pb"></div>
${fig('shot-nutrition-top.png', '그림 6. 영양 페이지 — 체중·훈련량·목표 입력, 땀 손실 계산, 하루 목표 범위와 타이밍')}
${fig('live-doping.png', '그림 7. 도핑 주의 성분 확인 — 입력: "종합감기약(슈도에페드린), 프리워크아웃(히게나민), 벤토린 흡입, 커피"')}
${fig('shot-about.png', '그림 8. 근거·한계·개인정보 페이지 — 지표 산식·임계값·출처·재현 방법')}

<h2>3. 기술 사양</h2>
<table><tr><th style="width:22%">항목</th><th>내용</th></tr>
<tr><td>자세 추정</td><td>Google MediaPipe Pose Landmarker(Tasks Vision 0.10.14, lite 모델, Apache-2.0). 브라우저 WASM/GPU, 2D 정규화 좌표 + 3D world 좌표(미터)</td></tr>
<tr><td>분석 엔진</td><td>순수 JavaScript 모듈(<code>pose-metrics.js</code>, <code>exercise-rules.js</code>, <code>nutrition.js</code>). 반복 감지 상태기계(무릎 최소각 140°↓→160°↑), 착지 감지(골반 높이 기준선 대비 4% 상승 후 복귀), 지수이동평균 스무딩</td></tr>
<tr><td>프론트엔드</td><td>HTML/CSS/ES 모듈. 빌드·프레임워크 없음. 반응형(390~1440px), 키보드 조작, 건너뛰기 링크, 오류·미검출·관절 가림 상태 안내</td></tr>
<tr><td>배포</td><td>GitHub Pages 정적 호스팅. 폴더 복사만으로 어느 기관 서버에도 자체 호스팅 가능. 서버·DB·계정·API 키 없음</td></tr>
<tr><td>개인정보</td><td>영상·관절 좌표·입력값을 전송·저장하지 않음(기기 내 처리). 외부 요청은 모델·라이브러리 다운로드(cdn.jsdelivr.net, storage.googleapis.com)뿐</td></tr>
<tr><td>데이터 근거</td><td>루틴: FIFA 11+(Soligard 2008 BMJ, Thorborg 2017 BJSM), JOSPT 2018 무릎 인대 지침, PEP. 영양: Thomas/Erdman/Burke 2016 공동 성명, ACSM 2007, AIS Framework, IOC 2018 consensus, WADA 2026 Prohibited List</td></tr></table>

<h2>4. 검증</h2>
<table><tr><th style="width:30%">검증</th><th>결과 (2026-10-22)</th></tr>
<tr><td>단위 테스트(node --test)</td><td>14/14 통과 — 각도 산식, 합성 골격 재현(서기 180°·깊은 스쿼트 90°·외반 KASR&lt;0.8), 샘플 6종 플래그, 영양 산식·도핑 매칭</td></tr>
<tr><td>E2E(Playwright, 390·1440px)</td><td>18/18 통과 — 샘플 재생 3종 파이프라인, 키보드 조작, 카메라 거부 안내, 영양 계산·도핑 확인, 근거 페이지, 데이터 실패 안내. 라이브 주소에서 재실행 통과</td></tr>
<tr><td>카메라 경로 스모크</td><td>가짜 카메라 장치로 모델 로드·루프 동작 확인(약 16~20초 로드, JS 오류 0)</td></tr>
<tr><td>미검증(정직 표기)</td><td>실제 사람 촬영 검증(조명·각도·옷에 따른 오탐), 임계값의 사용자 보정, 임상 검증</td></tr></table>

<h2>5. 한계와 다음 단계</h2>
<ul><li>2D 정면 추정이라 카메라 높이·각도에 민감. 3D 모션캡처·힘판을 대신하지 않음.</li><li>임계값은 문헌 참고 선별 기준이며 부상 예측을 주장하지 않음. 통증·수술 후에는 의료진 상담.</li><li>다음 단계: 동호회·학생 선수 촬영 테스트로 임계값 보정 → 측면 뷰 → 지도자용 다인 리포트 → 클럽 자체 호스팅 패키지.</li></ul>
<p class="muted">소스·테스트·문서 공개 저장소: https://github.com/soonryu74/soonryu74.github.io (폴더 movesafe/). 이 문서의 화면 캡처는 합성 샘플(DEMO) 재생 화면이며 실제 사람 데이터가 아닙니다.</p>
</body></html>`;
writeFileSync(path.join(here, 'techdoc.html'), html);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('file://' + path.join(here, 'techdoc.html'));
await page.waitForTimeout(500);
const out = path.join(here, 'MoveSafeAI_기술제품자료_서순려.pdf');
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', out);
