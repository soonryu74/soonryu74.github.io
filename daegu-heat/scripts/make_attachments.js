// 붙임 4(AI 프롬프트 활용 내역서)·붙임 5(공공데이터 사용 내역서) DOCX: node scripts/make_attachments.js <out4.docx> <out5.docx>
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, BorderStyle } = require('docx');
const FONT = '맑은 고딕';
const run = (t, o = {}) => new TextRun({ text: t, font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: o.size || 19, bold: o.bold, color: o.color });
const p = (t, o = {}) => new Paragraph({ children: [run(t, o)], alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 60, line: 270 } });
const border = { style: BorderStyle.SINGLE, size: 4, color: '999999' }; const borders = { top: border, bottom: border, left: border, right: border };
const TW = 9638;
const cell = (ch, w, o = {}) => new TableCell({ children: ch, width: { size: w, type: WidthType.DXA }, borders, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined, verticalAlign: 'center', margins: { top: 50, bottom: 50, left: 90, right: 90 } });
const tbl = (rows, widths) => new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, rows });
const row = (cols, w, o = {}) => new TableRow({ cantSplit: true, children: cols.map((c, i) => cell((Array.isArray(c) ? c : [c]).map(t => p(t, { after: 20, size: 17, bold: o.boldFirst && i === 0 })), w[i], { fill: (o.firstFill && i === 0) || o.fillAll ? 'F3F3F3' : undefined })) });
const mk = (children) => new Document({ styles: { default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: 19 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }] });

// ---- 붙임 4 ----
const A = [];
A.push(p('[붙임 4] AI 프롬프트 활용 내역서(서식)', { size: 17, color: '666666' }));
A.push(new Paragraph({ children: [run('AI 프롬프트 활용 내역서', { bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
const w2 = [2000, TW - 2000];
A.push(tbl([
  row(['접수번호', '※ 미기재'], w2, { boldFirst: true, firstFill: true }),
  row(['주요 사용 AI', 'Claude (Anthropic, Claude Code 환경에서 대화형 사용) — 아이디어 구상·기획서 초안·행동 문장 작성. Python(pandas 없이 표준 라이브러리)·JavaScript로 데이터 집계와 규칙 엔진은 직접 작성.'], w2, { boldFirst: true, firstFill: true }),
  row(['활용 목적', '[ ] 데이터 수집·전처리 및 분석 코드 작성   [■] 아이디어 구상 및 기획서 작성   [■] 시각화 그래픽 및 이미지 생성(화면 설계·행동 문장)   [ ] 기타'], w2, { boldFirst: true, firstFill: true }),
], w2));
A.push(p('', { after: 80 }));
A.push(p('AI 활용 내역 및 프롬프트 상세내용', { bold: true, size: 22, after: 60 }));
const cases = [
  ['사례 1', '기획서 아이디어 도출 및 차별화 요소 검증', '"대구 기후·환경·탄소중립 공공데이터 AI 활용대회 부문 1 주제 후보 3개를 공고 배점(데이터·AI 활용 30, 주제 적합 25, 독창성·실현성 25, 파급 20)에 맞춰 제안해줘. 대구 공공데이터로 바로 구현 가능한 것만."', 'AI가 제안한 후보(① 폭염·미세먼지 먼저 알리는 건강 비서 ② 구·군별 분리배출 규칙 안내 ③ 도심 열섬 나무심기 우선순위 지도) 중 ①을 채택. 민간 앱과 겹치는 ②, 분석 부담이 큰 ③은 제외. 채택 이유(질병관리청 감시 통계와 연결, 기상청 2026 특보 개편 수칙 활용)는 제안자가 보강.'],
  ['사례 2', '제안서 구조화 및 초안 작성', '"붙임 6 서식(아이디어 개요/세부 추진방안/실현 가능성 및 기대효과/자유 기재) 구조로 10쪽 이내 제안서를 써줘. 질병관리청 온열질환 감시 데이터 대구 집계(2025년 140건, 실외 작업장 57건, 65세 이상 26%)와 행정동 인구(152개 동)를 근거로 넣고, 판정은 규칙 엔진·AI는 쉬운말 설명으로 역할을 나눠라. 수치는 실측만 쓰고 추정은 \'설계값·검증 전\'으로 표시해라."', '초안을 받아 사례 3종, 점수 가중치 표, 한계 문단을 제안자가 수정·확정. 본문의 모든 수치는 내려받은 CSV(공공데이터포털 15149889, 15097972) 집계 결과와 대조해 확인.'],
  ['사례 3', '조건별 행동 문장(쉬운말) 작성', '"기상청 2026 폭염특보 개편 안내(중단·이동·확인 수칙, 열대야 체크리스트) 원문 범위 안에서, 실외 작업자·독거 어르신·영유아 부모 세 조건에 맞는 \'오늘 할 일\' 문장을 60대 눈높이 한 문장씩 써줘. 원문에 없는 의학 조언은 넣지 마라."', '생성 문장을 규칙 엔진의 조건별 템플릿(데모 js/engine.js)으로 저장해 매 알림마다 생성하지 않도록 설계. 혈압약·당뇨 관련 문장은 일반 보건 지침 범위로 제한하고 "진단 아님·119" 고지를 모든 화면에 표시.'],
];
const w4 = [1200, TW - 1200];
for (const [n, pur, pr, use] of cases) {
  A.push(tbl([
    row([n, [`[활용 목적] ${pur}`, `[입력 프롬프트] ${pr}`, `[활용 및 보완 내용] ${use}`]], w4, { boldFirst: true, firstFill: true }),
  ], w4));
  A.push(p('', { after: 60 }));
}
A.push(p('※ 원본 데이터 집계(CSV→JSON)와 규칙 엔진 코드는 AI 생성이 아닌 제안자 작성이며, 증빙 요구 시 대화 기록·코드 저장소를 제출할 수 있음.', { size: 16, color: '666666' }));

// ---- 붙임 5 ----
const Bq = [];
Bq.push(p('[붙임 5] 공공데이터 사용 내역서(서식)', { size: 17, color: '666666' }));
Bq.push(new Paragraph({ children: [run('공공데이터 사용 내역서', { bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
Bq.push(tbl([
  row(['접수번호', '※ 미기재'], w2, { boldFirst: true, firstFill: true }),
  row(['활용 데이터 수', '총 ( 6 )개 데이터셋 활용 (확보·집계 완료 2개, 오픈API 활용신청 3개, 기준 문서 1개)'], w2, { boldFirst: true, firstFill: true }),
  row(['주요 제공기관', '질병관리청, 행정안전부, 기상청, 한국환경공단'], w2, { boldFirst: true, firstFill: true }),
], w2));
Bq.push(p('', { after: 80 }));
const w5 = [600, 3300, 1700, TW - 5600];
const H = new TableRow({ tableHeader: true, cantSplit: true, children: ['연번', '공공데이터명', '제공기관', '데이터 출처 URL'].map((c, i) => cell([p(c, { bold: true, align: AlignmentType.CENTER, after: 0, size: 17 })], w5[i], { fill: 'E0E0E0' })) });
const D = [
  ['1', '질병관리청_온열질환 감시 데이터_20250925 (2011~2025 응급실 감시 신고: 발생일자·성별·나이·발생시도·시군구·실내외·장소) — 대구 750건 집계', '질병관리청', 'https://www.data.go.kr/data/15149889/fileData.do'],
  ['2', '행정안전부_지역별(행정동) 성별 연령별 주민등록 인구수_20260930 — 대구 152개 행정동 65·75세 이상 비율', '행정안전부', 'https://www.data.go.kr/data/15097972/fileData.do'],
  ['3', '행정안전부_무더위쉼터 (오픈API: 시설구분·주소·수용인원·냉방기 보유)', '행정안전부', 'https://www.data.go.kr/data/15138456/openapi.do'],
  ['4', '기상청_기상특보 조회서비스 (오픈API: 폭염주의보·경보·중대경보, 열대야주의보)', '기상청', 'https://www.data.go.kr/data/15000415/openapi.do'],
  ['5', '한국환경공단_에어코리아_대기오염정보 (오픈API: 대구 측정소 20곳 PM2.5·오존)', '한국환경공단', 'https://www.data.go.kr/data/15073861/openapi.do'],
  ['6', '기상청 폭염중대경보 및 열대야주의보 안내 (2026.6 특보 개편 기준·행동수칙)', '기상청', 'https://testweather.kma.go.kr/w/resources/pdf/heat_wave_night_brochure.pdf'],
];
Bq.push(tbl([H, ...D.map(r => row(r, w5))], w5));
Bq.push(p('', { after: 60 }));
Bq.push(p('※ 1·2번은 공공데이터포털에서 내려받아 집계했으며(이용허락범위 제한 없음), 원자료 값은 바꾸지 않고 필드 선택·집계만 수행. 3~5번은 같은 포털에서 활용신청 후 실시간 호출 예정. 확장 단계 후보: 대구 D-데이터허브(data.daegu.go.kr) 녹지·공원, 온실가스종합정보센터(gir.go.kr) 지역 인벤토리.', { size: 16, color: '666666' }));

Promise.all([Packer.toBuffer(mk(A)), Packer.toBuffer(mk(Bq))]).then(([a, b]) => { fs.writeFileSync(process.argv[2], a); fs.writeFileSync(process.argv[3], b); console.log('written'); });
