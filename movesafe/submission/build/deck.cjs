// MoveSafe AI 7분 발표자료 생성 — node deck.cjs
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const Md = require('react-icons/md');
const { applyTheme } = require('/root/.claude/skills/synced/8f8aae3c-e761-4276-b503-4035b8cf1bfa_4e1d0549-674e-4081-809d-65f48771afc0/pptx/scripts/apply_theme.js');

const THEME = {
  name: 'MoveSafe',
  headFontFace: 'Malgun Gothic', bodyFontFace: 'Malgun Gothic',
  colors: { dk1: '0F172A', lt1: 'FFFFFF', dk2: '0B6E4F', lt2: 'F4F6F8', accent1: '0B6E4F', accent2: 'C2410C', accent3: 'F59E0B', accent4: '22D3EE', accent5: '64748B', accent6: '15803D', hlink: '0B6E4F', folHlink: '64748B' },
};
const URL = 'https://soonryu74.github.io/movesafe/';

async function icon(Comp, color = 'FFFFFF') {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { size: 256, color: '#' + color }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}
const img = (f) => path.join(__dirname, f);

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = '서순려'; pres.title = 'MoveSafe AI — 부상 예방 폼 코치'; pres.subject = '2026 경기스포츠산업 공모전';
  const C = pres.SchemeColor;

  pres.defineSlideMaster({
    title: 'DARK', background: { color: THEME.colors.dk1 },
    objects: [{ text: { text: 'MoveSafe AI · 2026 경기스포츠산업 공모전', options: { x: 0.5, y: 5.2, w: 6, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } }],
    slideNumber: { x: 9.2, y: 5.2, w: 0.5, h: 0.3, fontSize: 10, color: C.accent5 },
  });
  pres.defineSlideMaster({
    title: 'CONTENT', background: { color: THEME.colors.lt1 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 9, h: 0.75, fontSize: 28, bold: true, color: C.text1, margin: 0, valign: 'middle' }, text: '제목' } },
      { text: { text: 'MoveSafe AI · 2026 경기스포츠산업 공모전 · 경기력 향상 기술', options: { x: 0.5, y: 5.2, w: 7, h: 0.3, fontSize: 9, color: C.accent5, margin: 0 } } },
    ],
    slideNumber: { x: 9.2, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: C.accent5 },
  });

  const I = {
    knee: await icon(Md.MdAccessibilityNew), land: await icon(Md.MdDownload), lunge: await icon(Md.MdSwapHoriz),
    cam: await icon(Md.MdVideocam), lock: await icon(Md.MdLockOutline), fact: await icon(Md.MdFactCheck), food: await icon(Md.MdRestaurant),
    user: await icon(Md.MdDirectionsRun), school: await icon(Md.MdSchool), heal: await icon(Md.MdHealing), group: await icon(Md.MdGroups),
    money: await icon(Md.MdSavings), pill: await icon(Md.MdMedication), water: await icon(Md.MdWaterDrop), warn: await icon(Md.MdWarningAmber), next: await icon(Md.MdTimeline),
  };
  const circleIcon = (s, data, x, y, d = 0.6, fill = C.accent1) => {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    s.addImage({ data, x: x + d * 0.2, y: y + d * 0.2, w: d * 0.6, h: d * 0.6 });
  };
  const card = (s, x, y, w, h, fill = C.background2) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12, shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 90, opacity: 0.12 } });
  const frame = (s, file, x, y, w, h) => { s.addShape(pres.ShapeType.roundRect, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, fill: { color: C.text1 }, line: { color: C.text1 }, rectRadius: 0.1 }); s.addImage({ path: img(file), x, y, w, h, rounding: false }); };
  const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontSize: 14, color: C.text1, valign: 'top', ...o });

  // 1 제목
  pres.addSection({ title: '소개' });
  let s = pres.addSlide({ masterName: 'DARK', sectionTitle: '소개' });
  T(s, 'MoveSafe AI', { x: 0.6, y: 1.1, w: 6.5, h: 1.0, fontSize: 54, bold: true, color: C.background1 });
  T(s, '카메라 하나로 부상 위험 동작을 잡아내는 폼 코치 · 스포츠 영양 가이드', { x: 0.6, y: 2.15, w: 6.3, h: 0.9, fontSize: 20, color: C.accent4 });
  T(s, '2026 경기스포츠산업 공모전 · 경기력 향상 기술 (스마트 트레이닝 · 부상 예방 · 재활 · 뉴트리션)', { x: 0.6, y: 3.15, w: 6.3, h: 0.6, fontSize: 13, color: C.background2 });
  T(s, '서순려 · 보건학 · 출시 전 MVP (실제 동작 · 설치·가입 없음)', { x: 0.6, y: 3.8, w: 6.3, h: 0.4, fontSize: 13, color: C.accent5 });
  T(s, URL, { x: 0.6, y: 4.35, w: 6.3, h: 0.4, fontSize: 14, color: C.accent3, bold: true });
  s.addImage({ path: img('qr-movesafe.png'), x: 7.5, y: 1.4, w: 2.0, h: 2.0 });
  T(s, '지금 열어보기', { x: 7.5, y: 3.45, w: 2.0, h: 0.3, fontSize: 11, color: C.accent5, align: 'center' });
  s.addNotes('안녕하세요. MoveSafe AI 는 웹캠만으로 스쿼트·런지·점프 착지 자세를 분석해 부상 위험 동작을 그 자리에서 알려주고, 근거 있는 예방 루틴과 영양 가이드를 주는 웹 서비스입니다. 영상은 기기 밖으로 나가지 않습니다.');

  // 2 문제
  pres.addSection({ title: '문제와 사용자' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '문제와 사용자' });
  s.addText('코치가 없는 시간에 부상 위험 동작이 쌓인다', { placeholder: 'title' });
  const probs = [
    ['무릎 안쪽 모임', '스쿼트·착지에서 무릎이 안으로 들어가는 동작. 전방십자인대·슬개대퇴 통증의 잘 알려진 위험 요인', I.knee],
    ['딱딱한 착지', '무릎을 거의 굽히지 않고 받는 착지. 충격이 인대에 그대로 실린다', I.land],
    ['쏠린 런지·비대칭', '한쪽 다리에 부하가 몰리고 몸통이 기운다. 회피·근력 차이 신호', I.lunge],
  ];
  probs.forEach(([h, d, ic], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.35, 2.9, 2.45); circleIcon(s, ic, x + 0.25, 1.6, 0.65, C.accent2); T(s, h, { x: x + 0.25, y: 2.4, w: 2.4, h: 0.4, fontSize: 17, bold: true }); T(s, d, { x: x + 0.25, y: 2.85, w: 2.45, h: 0.9, fontSize: 12, color: C.accent5 }); });
  T(s, '본인은 느끼지 못하고, 코치는 훈련 시간의 일부에만 옆에 있다. 혼자 운동하는 생활체육인에게는 아예 없다.', { x: 0.5, y: 4.1, w: 9, h: 0.8, fontSize: 16, bold: true, color: C.accent1 });
  s.addNotes('하지 부상의 상당수는 접촉 없이 일어납니다. 무릎이 안으로 모이는 착지, 뻣뻣한 착지, 한쪽으로 쏠린 런지는 잘 알려진 위험 동작이지만 본인은 느끼지 못합니다. 코치가 옆에 있는 시간은 훈련 시간의 일부일 뿐이고, 생활체육인에게는 아예 없습니다.');

  // 3 사용자
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '문제와 사용자' });
  s.addText('누가, 어떤 장면에서 쓰나', { placeholder: 'title' });
  const users = [
    ['생활체육인', '혼자 하는 홈트·헬스장 스쿼트를 폰 거치대 하나로 점검', I.user],
    ['학생 선수 · 지도자', '팀 워밍업 전 착지 스크리닝, 반복된 문제만 골라 보완 운동', I.school],
    ['재활 후 복귀자', '복귀 운동 중 좌우 비대칭·회피 동작을 스스로 확인 (의료진 상담과 병행)', I.heal],
    ['학교 · 클럽', '설치·계정 없이 링크로 배포. 영상이 외부로 나가지 않아 도입 장벽이 낮음', I.group],
  ];
  users.forEach(([h, d, ic], i) => { const y = 1.3 + i * 0.95; circleIcon(s, ic, 0.5, y, 0.6); T(s, h, { x: 1.3, y: y - 0.02, w: 4.6, h: 0.35, fontSize: 16, bold: true }); T(s, d, { x: 1.3, y: y + 0.33, w: 4.7, h: 0.55, fontSize: 12, color: C.accent5 }); });
  frame(s, 'shot-mobile.png', 6.6, 1.3, 1.65, 3.6);
  T(s, '모바일 390px 화면', { x: 6.5, y: 4.95, w: 1.9, h: 0.25, fontSize: 9, color: C.accent5, align: 'center' });
  s.addNotes('쓰는 사람은 혼자 운동하는 생활체육인, 학생 선수, 여러 명을 봐야 하는 지도자, 수술 후 운동을 다시 시작하는 사람입니다. 설치·가입 없이 링크 하나로 씁니다.');

  // 4 작동 원리
  pres.addSection({ title: '제품' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '제품' });
  s.addText('브라우저 안에서 끝나는 처리 흐름', { placeholder: 'title' });
  const steps = ['카메라 · 영상 파일', '관절 33개 추정\n(MediaPipe Pose)', '지표 계산\n무릎각 · 간격비 · 기울기', '규칙 판정\n문헌 기반 임계값', '즉시 피드백 ·\n리포트 · 루틴'];
  steps.forEach((t, i) => { const x = 0.5 + i * 1.85; s.addShape(pres.ShapeType.roundRect, { x, y: 1.3, w: 1.6, h: 0.95, fill: { color: i === 1 ? C.accent1 : C.background2 }, line: { color: i === 1 ? C.accent1 : C.background2 }, rectRadius: 0.1 }); T(s, t, { x: x + 0.08, y: 1.33, w: 1.44, h: 0.9, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: i === 1 ? C.background1 : C.text1 }); if (i < 4) T(s, '›', { x: x + 1.6, y: 1.5, w: 0.25, h: 0.5, fontSize: 24, color: C.accent5, align: 'center' }); });
  frame(s, 'live-valgus-stage.png', 0.5, 2.5, 3.6, 2.45);
  const pts = [['무릎 안쪽 쏠림', '무릎 간격 ÷ 발목 간격 < 0.80 → 무릎 선이 빨갛게, 단서 문장 표시'], ['영상 전송 없음', '추정·판정 모두 기기 안. 서버·계정·API 키 없음'], ['반복마다 점수', '반복(렙) 자동 감지 → 100점에서 문제별 감점 → 세션 리포트']];
  pts.forEach(([h, d], i) => { const y = 2.55 + i * 0.8; circleIcon(s, [I.knee, I.lock, I.fact][i], 4.4, y, 0.5); T(s, h, { x: 5.05, y: y - 0.02, w: 4.4, h: 0.3, fontSize: 14, bold: true }); T(s, d, { x: 5.05, y: y + 0.28, w: 4.45, h: 0.5, fontSize: 11, color: C.accent5 }); });
  s.addNotes('브라우저 안에서 구글의 오픈소스 자세 추정 모델이 33개 관절을 찾습니다. 거기서 무릎 각도, 무릎·발목 간격비, 몸통 기울기, 좌우 차이, 착지 순간 무릎 굴곡을 계산하고, 문헌 참고 임계값으로 판정합니다. 서버가 없고 영상이 전송되지 않는 것이 구조적 장점입니다.');

  // 5 지표·근거
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '제품' });
  s.addText('지표와 선별 기준 — 전부 화면 안에 공개', { placeholder: 'title' });
  const hdr = { bold: true, color: 'FFFFFF', fill: { color: THEME.colors.accent1 }, fontSize: 11 };
  const rows = [
    [{ text: '지표', options: hdr }, { text: '계산', options: hdr }, { text: '선별 기준', options: hdr }, { text: '참고 근거', options: hdr }],
    ['무릎 굴곡각', '엉덩관절–무릎–발목 3D 각도', '≤100° 충분 · >120° 얕음', '깊이는 정보 표시'],
    ['무릎 안쪽 쏠림', '무릎 간격 ÷ 발목 간격 (KASR), 안쪽 변위 ÷ 골반 폭', 'KASR < 0.80 또는 변위 ≥ 15%', '드롭 수직 점프 2D 스크리닝 문헌'],
    ['착지 충격 흡수', '착지 후 0.3초 내 최소 무릎각', '>140° 딱딱한 착지', '착지 역학 · ACL 부하 문헌'],
    ['몸통 기울기 · 좌우차', '어깨–골반 선 각도, 최저점 좌우 무릎각 차', '>10° · >15°', '한쪽 부하 쏠림 신호'],
    ['루틴 추천', '반복의 30% 이상 같은 문제 → 해당 루틴', '둔근 · 착지 · 가동성 · 코어 · 한다리', 'FIFA 11+ · JOSPT 2018 · PEP'],
  ];
  s.addTable(rows, { x: 0.5, y: 1.25, w: 9, colW: [1.7, 3.0, 2.3, 2.0], fontSize: 11, color: THEME.colors.dk1, border: { type: 'solid', color: 'DDE3E9', pt: 0.75 }, fill: { color: 'FFFFFF' }, rowH: 0.48, valign: 'middle', autoPage: false });
  T(s, '점수 = 100 − 감점(안쪽 쏠림 30 · 딱딱한 착지 30 · 얕음 20 · 기울기 15 · 비대칭 15). 임계값은 선별용 출발점이며 임상 기준·진단이 아닙니다.', { x: 0.5, y: 4.35, w: 9, h: 0.6, fontSize: 11, color: C.accent5 });
  s.addNotes('임계값은 착지 과제 스크리닝 문헌과 FIFA 11+, 미국 물리치료학회 무릎 인대 지침을 참고한 선별 기준입니다. 진단이 아니라는 점을 화면마다 적었습니다. 정직하게 쓰는 것이 이 제품의 원칙입니다.');

  // 6 시연
  pres.addSection({ title: '시연' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '시연' });
  s.addText('시연 (90초) — 스쿼트 · 착지 · 리포트', { placeholder: 'title' });
  frame(s, 'live-valgus-stage.png', 0.5, 1.3, 3.0, 2.25); T(s, '① 스쿼트 — 무릎 모임 즉시 단서', { x: 0.5, y: 3.6, w: 3.0, h: 0.3, fontSize: 11, bold: true });
  frame(s, 'live-landing-stage.png', 3.65, 1.3, 3.0, 2.25); T(s, '② 점프 착지 — 딱딱한 착지 판정', { x: 3.65, y: 3.6, w: 3.0, h: 0.3, fontSize: 11, bold: true });
  frame(s, 'live-valgus-panel.png', 6.85, 1.3, 2.25, 2.25); T(s, '③ 반복 점수 · 지표 · 리포트', { x: 6.85, y: 3.6, w: 2.4, h: 0.3, fontSize: 11, bold: true });
  T(s, '카메라를 못 쓰는 환경이면 "샘플 재생"(합성 골격, DEMO 표시)으로 같은 흐름을 보입니다. 화면 캡처는 DEMO 샘플입니다.', { x: 0.5, y: 4.1, w: 9, h: 0.5, fontSize: 11, color: C.accent5 });
  s.addNotes('(실제 시연) 카메라를 켜고 스쿼트 3회 — 2회 바르게, 1회 무릎을 모으며. 점프 착지 2회. 세션 리포트 열기. 영양 페이지로 이동해 체중 입력과 도핑 확인.');

  // 7 영양
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '제품' });
  s.addText('영양 모듈 — 지침 범위를 내 체중으로', { placeholder: 'title' });
  frame(s, 'shot-nutrition-top.png', 0.5, 1.3, 5.1, 2.5);
  frame(s, 'live-doping.png', 0.5, 3.9, 5.1, 1.2);
  const nut = [['탄수화물 · 단백질 · 수분', '체중·훈련량·목표 → ACSM·AND·DC 2016 공동 성명 범위, 땀 손실 계산(ACSM 2007)', I.water], ['근거 있는 보충제 5종', '카페인 · 크레아틴 · 베타알라닌 · 질산염 · 중탄산 — AIS A군 · IOC 2018, 체중별 용량', I.pill], ['도핑 주의 성분 확인', '감기약·보충제·한약 성분 → WADA 2026 분류(상시/경기기간/모니터링). 최종 확인은 KADA 로 연결', I.warn]];
  nut.forEach(([h, d, ic], i) => { const y = 1.35 + i * 1.2; circleIcon(s, ic, 5.9, y, 0.55); T(s, h, { x: 6.6, y: y - 0.02, w: 3.0, h: 0.3, fontSize: 14, bold: true }); T(s, d, { x: 6.6, y: y + 0.3, w: 2.95, h: 0.85, fontSize: 11, color: C.accent5 }); });
  s.addNotes('두 번째 모듈은 영양입니다. 체중·훈련량·목표를 넣으면 미국스포츠의학회 공동 성명의 탄수화물·단백질·수분 범위를 계산하고, 근거가 가장 강한 보충제 5종의 체중별 용량, 그리고 감기약·보충제 속 도핑 주의 성분을 세계도핑방지기구 분류로 알려줍니다. 최종 확인은 KADA 로 연결합니다.');

  // 8 차별성·실현성
  pres.addSection({ title: '차별성과 실현성' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '차별성과 실현성' });
  s.addText('왜 다른가, 왜 바로 쓸 수 있나', { placeholder: 'title' });
  const diff = [['영상이 기기를 떠나지 않는다', '서버·계정 없음. 학교·클럽이 개인정보 걱정 없이 링크로 배포', I.lock], ['근거와 한계가 화면 안에', '임계값·출처·감점 규칙 공개, 코드 공개 → 지도자가 기준을 조정·검증', I.fact], ['운영비 0, 복사해서 자체 호스팅', '정적 파일. 폴더 하나로 어느 기관 서버에도 올림', I.money]];
  diff.forEach(([h, d, ic], i) => { const x = 0.5 + i * 3.05; card(s, x, 1.3, 2.9, 2.05); circleIcon(s, ic, x + 0.25, 1.45, 0.55); T(s, h, { x: x + 0.25, y: 2.08, w: 2.5, h: 0.62, fontSize: 13, bold: true }); T(s, d, { x: x + 0.25, y: 2.72, w: 2.5, h: 0.55, fontSize: 10.5, color: C.accent5 }); });
  const stats = [['14', '단위 테스트'], ['18', 'E2E 테스트 (390·1440px)'], ['0', '서버 · 설치 · API 키'], ['3', '운동 (스쿼트·런지·착지)']];
  stats.forEach(([n, l], i) => { const x = 0.5 + i * 2.3; T(s, n, { x, y: 3.55, w: 2.1, h: 0.8, fontSize: 40, bold: true, color: C.accent1 }); T(s, l, { x, y: 4.35, w: 2.1, h: 0.4, fontSize: 11, color: C.accent5 }); });
  s.addNotes('차별점 세 가지. 영상이 기기를 떠나지 않아 학교·클럽에서 쓰기 쉽습니다. 모든 임계값·출처·한계가 화면 안에 있고 코드는 공개돼 재현됩니다. 서버가 없어 운영비가 거의 0이고, 어떤 클럽도 폴더를 복사해 자체 호스팅할 수 있습니다. 이미 동작하는 MVP 이고 단위·E2E 테스트가 있습니다.');

  // 9 한계·다음 단계
  pres.addSection({ title: '마무리' });
  s = pres.addSlide({ masterName: 'DARK', sectionTitle: '마무리' });
  T(s, '정직한 한계, 그리고 다음 단계', { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 28, bold: true, color: C.background1 });
  T(s, '한계', { x: 0.5, y: 1.3, w: 4.2, h: 0.4, fontSize: 16, bold: true, color: C.accent3 });
  T(s, [
    { text: '2D 정면 영상 — 카메라 각도·거리에 민감', options: { bullet: true, breakLine: true } },
    { text: '임계값은 선별용, 실제 사용자 보정 전', options: { bullet: true, breakLine: true } },
    { text: '도입·사용자 실적 없음. 의료 진단 아님', options: { bullet: true } },
  ], { x: 0.5, y: 1.75, w: 4.2, h: 1.8, fontSize: 13, color: C.background2, paraSpaceAfter: 6 });
  T(s, '다음 단계', { x: 5.2, y: 1.3, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: C.accent4 });
  T(s, [
    { text: '동호회·학생 선수 촬영 테스트로 임계값 보정', options: { bullet: { type: 'number' }, breakLine: true } },
    { text: '측면 뷰(무릎 전방 이동·허리 굴곡) 추가', options: { bullet: { type: 'number' }, breakLine: true } },
    { text: '지도자용 다인 리포트 · 클럽 자체 호스팅 패키지', options: { bullet: { type: 'number' } } },
  ], { x: 5.2, y: 1.75, w: 4.3, h: 1.8, fontSize: 13, color: C.background2, paraSpaceAfter: 6 });
  T(s, '코치가 없는 시간에도 안전하게 움직이게.', { x: 0.5, y: 3.75, w: 6.2, h: 0.5, fontSize: 20, bold: true, color: C.background1 });
  T(s, URL, { x: 0.5, y: 4.3, w: 6.2, h: 0.4, fontSize: 14, color: C.accent3, bold: true });
  s.addImage({ path: img('qr-movesafe.png'), x: 7.9, y: 3.3, w: 1.6, h: 1.6 });
  s.addNotes('한계도 분명합니다. 좌표 없는 2D 추정, 선별용 임계값, 도입 실적 없음. 다음 단계는 실제 사용자 촬영으로 임계값 보정, 측면 뷰, 지도자용 다인 리포트입니다. 코치가 없는 시간에도 안전하게 움직이게 하는 것, 그게 MoveSafe 의 목표입니다. 감사합니다.');

  const out = path.join(__dirname, 'MoveSafeAI_발표자료_서순려.pptx');
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('wrote', out);
})();
