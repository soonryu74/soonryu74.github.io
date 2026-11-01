const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  ShadingType, BorderStyle, LevelFormat, HeadingLevel } = require('docx');

const FONT = '맑은 고딕';
const BODY = 19; // 10pt in half-points
const run = (t, o={}) => new TextRun({ text: t, font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: o.size||BODY, bold: o.bold, color: o.color });
const p = (t, o={}) => new Paragraph({ children: Array.isArray(t)? t : [run(t,o)], alignment: o.align, spacing: { before: o.before??0, after: o.after??60, line: o.line??270 }, numbering: o.bullet? { reference:'circ', level:0 } : undefined, indent: o.indent });
const bullet = (t) => p(t, { bullet: true, after: 40 });
const h = (t) => new Paragraph({ children:[run(t,{bold:true,size:24})], spacing:{before:160,after:60,line:270}, shading:{type:ShadingType.CLEAR, fill:'EAF0F8'}, border:{left:{style:BorderStyle.SINGLE,size:24,color:'2B4C7E',space:4}}, indent:{left:0} });
const sub = (t) => p(t, { color:'555555', size:18, after:60 });

const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (children, w, o={}) => new TableCell({ children, width:{size:w,type:WidthType.DXA}, borders, shading: o.fill? {type:ShadingType.CLEAR, fill:o.fill}:undefined, verticalAlign:'center', margins:{top:40,bottom:40,left:90,right:90} });
const TW = 9638; // A4 width 11906 - margins 2*1134
const tbl = (rows, widths) => new Table({ width:{size:TW,type:WidthType.DXA}, columnWidths: widths, rows });
const hdrRow = (cols, widths) => new TableRow({ tableHeader:true, children: cols.map((c,i)=>cell([p(c,{bold:true,align:AlignmentType.CENTER,after:0,size:18})], widths[i], {fill:'DCE6F1'})) });
const row = (cols, widths, o={}) => new TableRow({ children: cols.map((c,i)=>cell(Array.isArray(c)? c : [p(c,{after:0,size:18,align: (o.center&&i===0)?AlignmentType.CENTER:undefined, bold:(o.boldFirst&&i===0)})], widths[i], {fill:(o.firstFill&&i===0)?'F2F5F9':undefined})) });

const sumWidths = [2000, TW-2000];
const sumRow = (label, items) => new TableRow({ children:[
  cell([p(label,{bold:true,align:AlignmentType.CENTER,after:0,size:18})], sumWidths[0], {fill:'F2F5F9'}),
  cell(items.map(t=>p(t,{bullet:true,after:20,size:17,line:250})), sumWidths[1]) ]});

const children = [];
children.push(new Paragraph({ children:[run('「2026 사회보장 데이터를 활용한 AI 혁신 아이디어 경진대회」 제안서',{bold:true,size:28})], alignment:AlignmentType.CENTER, spacing:{after:60} }));
children.push(p('공모 분야: 창업·서비스 혁신 (복지행정·민원 개선 요소 포함)', {align:AlignmentType.CENTER, size:18, color:'555555', after:160}));

// 요약표
children.push(p('아이디어 요약 (5줄 이내)', {bold:true, after:60}));
children.push(tbl([ new TableRow({ children:[ cell([
  bullet('복지로의 5,300여 건 복지서비스는 국민이 검색해야 찾을 수 있다. 「먼저 찾아오는 복지 비서」는 한국사회보장정보원의 중앙부처·지자체 복지서비스 공개 API를 매일 읽어 AI가 지원 조건을 구조화하고, 사용자의 최소 프로필과 대조해 새로 생긴·바뀐·마감 임박 서비스를 먼저 알린다.'),
  bullet('쉬운말·다국어 요약, 서류 체크리스트, 신청 경로를 한 장으로 만들어 신청까지 잇는다. 판정은 근거를 공개하는 규칙 엔진이, AI는 조건 추출·설명만 맡아 환각을 차단한다.'),
  bullet('대상: 1인 사업자·소상공인·프리랜서 → 직장인 가구 → 쉬운말·음성 안내가 필요한 고령·다문화 가구.')
], TW) ]}) ], [TW]));
children.push(p('', {after:80}));
children.push(p('【제안서 요약】', {bold:true, after:60}));
children.push(tbl([
  sumRow('제안 배경 및\n아이디어 소개'.replace('\n',' '), ['신청주의 구조에서 "몰라서 못 받는" 서비스가 생기고, 지자체 소규모 사업은 이름조차 모른 채 마감된다.', '검색형 포털 위에 "조건이 맞으면 먼저 알리고 신청 준비까지 해 주는" 층을 얹는다.']),
  sumRow('사회보장 데이터 활용 계획', ['정보원의 중앙부처·지자체 복지서비스 API(목록·상세)를 핵심 입력으로 일 1회 수집, 지원대상·선정기준·신청방법 문장을 구조화. 중앙부처 API 461건 수집·40건 구조화 시험 완료(근거 인용 일치 96%).', '복지로 복지통계, 기준 중위소득 고시, 사회복지시설 정보로 판정 기준과 창구 안내 보강. 공고 문장 품질 문제를 정보원에 피드백.']),
  sumRow('AI 활용 방법 및 혁신성', ['LLM이 비정형 공고 문장에서 연령·거주지·가구유형·소득 기준·사업자 요건·접수기간을 조건 JSON으로 추출(원문 인용) → 사람 승인 → 규칙 등록.', '쉬운말·다국어 재작성, 자연어 질문 구조화. 판정은 규칙 엔진, 근거·모델명·컨텍스트를 로그로 남김.']),
  sumRow('아이디어의 차별성 및 실행 방안', ['복지로(검색)·복지니(질문)·복지멤버십(급여 안내)과 달리 공개 API 전체를 대상으로 푸시 알림 + 마감 관리 + 서류 준비.', '제안자가 이미 구현한 "지침 → 규칙 추출 → 승인 → 판정 → 쉬운말 안내장" 구조의 입력을 정보원 API로 바꿔 구현. 본선 전 데모, 1개월 파일럿, 3개월 공개 베타.']),
  sumRow('현장 적용 및 발전 가능성', ['공개 API만으로 동작해 내부 시스템 연동 없이 즉시 적용. 복지멤버십과 보완 관계로 설계.', 'B2C 무료 + 소상공인 유료, 세무·노무 사무소 화이트라벨(B2B), 지자체 홍보·공고문 쉬운말 변환(B2G). 기업마당·고용24 등 타 기관 API로 확장.']),
  sumRow('기대효과 및 ESG 가치', ['국민: 몰라서 못 받던 서비스 발견·마감 놓침 감소. 행정: 반복 민원 감소·공고 품질 피드백. 정보원: 공개 API 활용 확대.', 'S: 사각지대 축소, 고령·다문화 쉬운말·다국어 안내. G: 근거·AI 범위 공개, 민감정보 미수집. E: 종이·방문 민원 감소.'])
], sumWidths));

// 본문 제목
children.push(new Paragraph({ children:[run('먼저 찾아오는 복지 비서 — 공개 복지서비스 데이터를 읽고 먼저 알리는 AI 비서',{bold:true,size:26})], alignment:AlignmentType.CENTER, spacing:{before:240,after:40}, pageBreakBefore:false }));
children.push(p('(신청인명: ______ )', {align:AlignmentType.CENTER, size:18, color:'555555', after:120}));

// 1
children.push(h('1. 제안 배경 및 아이디어 소개'));
children.push(sub('* 해결하려는 사회보장 분야의 문제, 제안 목적 및 주요 대상'));
children.push(bullet('문제 1 — 신청주의와 정보 비대칭. 복지로에는 중앙부처·지자체·민간의 복지서비스 5,300여 건이 등록돼 있지만, 국민은 "어떤 이름으로 검색해야 하는지"를 알아야 찾을 수 있다. 지자체 소규모 사업(소상공인 공공요금 지원, 지역 청년 월세 지원 등)은 존재 자체를 모르는 경우가 많다.'));
children.push(bullet('문제 2 — 마감을 놓친다. 접수기간이 2~4주로 짧은 사업이 많고, 신규·변경 공고를 개인 조건에 맞춰 추적해 주는 도구가 없다.'));
children.push(bullet('문제 3 — 안내문이 어렵고 신청이 번거롭다. "기준 중위소득 100% 이하 가구 중 ○○인 자" 같은 문장은 60대·다문화 가구가 바로 이해하기 어렵고, 필요한 서류와 발급처가 흩어져 있어 신청 단계에서 포기한다.'));
children.push(bullet('제안 목적. 정보원이 이미 공개한 복지서비스 데이터 위에 "조건이 맞는 서비스가 생기면 먼저 알려 주고, 쉬운말 요약과 서류 체크리스트로 신청까지 데려다주는" 개인 비서 층을 만든다. 공공데이터의 활용률을 높이면서 신청주의의 빈틈을 메운다.'));
children.push(bullet('주요 대상. ① 1인 사업자·소상공인·프리랜서(지원사업이 가장 흩어져 있고 마감이 짧음) ② 출산·육아·주거·돌봄 제도가 생애주기마다 바뀌는 직장인 가구 ③ 쉬운말·음성·다국어 안내가 필요한 고령·다문화 가구.'));

// 2
children.push(h('2. 사회보장 데이터 활용 계획'));
children.push(sub('* 활용 데이터명·제공기관, 데이터 선정 이유 및 구체적인 활용 방법'));
const dW=[2600, 1500, TW-4100];
children.push(tbl([
  hdrRow(['데이터명 (출처)','제공기관','활용 방법'], dW),
  row(['중앙부처복지서비스 목록·상세 API (공공데이터포털 15090532) — 2026.11.1 실측: 461건, 25개 부처, 온라인신청 가능 54건','한국사회보장정보원','목록: 생애주기·가구유형·관심주제·나이·온라인신청 여부 필드로 1차 후보 추출, 일 1회 수집해 서비스 ID·수정일로 신규·변경 감지. 상세: 지원대상(tgtrDtlCn)·선정기준(slctCritCn)·지원내용·신청방법·구비서류·근거법령·문의처 문장을 AI 구조화 입력으로 사용'], dW),
  row(['지자체복지서비스 목록·상세 API (공공데이터포털 15108347)','한국사회보장정보원','시군구 단위 사업·접수기간·소관부서. 중앙부처 API 상세에는 접수기간 항목이 없음을 실측으로 확인했으므로, 거주지 매칭과 "마감 D-7" 알림의 핵심 원천은 이 API와 공고 원문'], dW),
  row(['복지로 복지통계','한국사회보장정보원','서비스 분야별·지역별 규모를 파악해 구조화 우선순위와 알림 노출 순서를 정하고, 사각지대 가설(수요 대비 저이용 분야) 검증'], dW),
  row(['기준 중위소득 고시 등 공개 기준표','보건복지부','사용자의 소득 구간 자가신고를 가구원 수별 기준 % 판정으로 변환'], dW),
  row(['사회복지시설·사회서비스 제공기관 정보 (정보원 제공 개방 데이터)','한국사회보장정보원','가까운 상담·신청 창구 안내 (2단계 확장)'], dW),
], dW));
children.push(p('', {after:60}));
children.push(bullet('선정 이유. 정보원이 직접 운영·개방하는 데이터라 갱신 주기와 책임 주체가 명확하고, 전국 단위 서비스를 한 규격(서비스 ID·필드 코드)으로 다룰 수 있다. 이용허락 범위 제한이 없어 서비스화에 법적 걸림돌이 없다.'));
children.push(bullet('활용 방식. ① 매일 목록 API를 전량 수집해 서비스 ID·수정일로 신규/변경을 감지 → ② 변경 건만 상세 API 호출 → ③ AI 구조화(3절) → ④ 규칙 저장소 갱신 → ⑤ 프로필과 대조해 알림. 사용자 개인정보는 거주 시군구·연령대·가구유형·소득 구간·사업자 여부 5항목만 받으며, 수급이력·소득재산 등 비공개 정보는 쓰지 않는다.'));
children.push(bullet('데이터 개선 루프. 구조화에 실패하거나 모호한 문장(대상 조건이 "별도 문의"로만 적힌 경우 등)을 유형별로 집계해 정보원에 리포트한다. 공개 데이터를 쓰는 서비스가 데이터 품질을 되먹임하는 구조다.'));

// 3
children.push(h('3. AI 활용 방법 및 혁신성'));
children.push(sub('* 활용할 AI 기술·도구, 적용 방식 및 AI 활용에 따른 개선 효과'));
const aW=[2300, TW-2300];
children.push(tbl([
  hdrRow(['AI가 하는 일','적용 방식'], aW),
  row(['① 조건 구조화','LLM이 지원대상·선정기준·신청방법 문장에서 연령·거주지·가구유형·소득 기준(중위소득 %)·사업자 요건·접수기간·구비서류를 조건 JSON 초안으로 추출한다. 각 조건에 원문 문장을 인용으로 붙이고, 사람이 화면에서 원문과 대조해 승인해야 규칙으로 등록된다. 5,300건을 사람이 직접 규칙화하는 데 드는 시간을 검수 수준으로 줄인다.'], aW, {boldFirst:true, firstFill:true}),
  row(['② 쉬운말·다국어','승인된 조건과 원문만 컨텍스트로 넘겨 "누가·무엇을·언제까지·어디서" 네 줄 요약을 60대 눈높이로 쓰고, 다국어·음성(TTS)으로 변환한다. 원문에 없는 내용을 덧붙이지 못하도록 컨텍스트를 제한한다.'], aW, {boldFirst:true, firstFill:true}),
  row(['③ 자연어 질문 구조화','"가게 하는데 전기요금 지원 있나요?" 같은 질문을 관심주제·사업자 여부·지역으로 구조화해 프로필에 반영 제안. 사용자가 확인 후 저장한다.'], aW, {boldFirst:true, firstFill:true}),
  row(['④ AI가 하지 않는 일','해당 여부 판정. 판정은 등록된 규칙을 그대로 실행하는 규칙 엔진이 맡아 결과마다 "어느 서비스의 어느 문장 때문에"를 표시한다. 모델명·프롬프트·컨텍스트는 감사 로그로 남긴다.'], aW, {boldFirst:true, firstFill:true}),
], aW));
children.push(p('', {after:60}));
children.push(bullet('혁신성. 공공 서비스 안내 영역에서 LLM을 "답변 생성"이 아니라 "비정형 공고를 구조화된 데이터로 바꾸는 변환기 + 사람 승인"으로 쓰는 설계다. 이 방식은 제안자가 2026년 공공 AI 대전환 챌린지 출품작(국민 곁에 ON)에서 240~670쪽 지침 PDF를 대상으로 구현·운용해 보았고, 본 제안은 입력을 정보원 공개 API로 바꾼 것이어서 기술 위험이 낮다.'));
children.push(bullet('사전 시험(2026.11.1, 상세 40건, 범용 LLM·온도 0·JSON 스키마 강제). 근거 인용 문장이 원문에 실제 존재 96%(77/80), 가구유형 조건 추출 50%, 소득 기준 추출 22%, 연령 조건 20%, "원문만으로 판정 불가" 표시 12%(5건: 상세 기준을 타 기관 사이트에서 확인하라고만 적힌 경우 등). 이 수치는 추출 완료율이며 정확도는 사람 검수로 확정한다. 모호 5건의 사유 자체가 정보원에 보낼 데이터 품질 피드백 1호다.'));
children.push(bullet('도구. Python 수집·규칙 엔진, OpenAI 호환 LLM API(국산 모델 포함 교체 가능), 정적 웹 + 서버리스 함수, 카카오 알림톡·이메일 발송.'));

// 4
children.push(h('4. 기존 서비스·연구와의 차별성'));
children.push(sub('* 유사 사례와 비교한 아이디어의 독창성 및 차별점'));
const cW=[2300, 3300, TW-5600];
children.push(tbl([
  hdrRow(['유사 사례','하는 일','본 제안과의 차이'], cW),
  row(['복지로·정부24','복지서비스 검색·온라인 신청','사용자가 검색어를 알아야 한다. 본 제안은 조건이 맞는 서비스가 생기면 먼저 알린다(푸시)'], cW),
  row(['복지니 (복지로 챗봇)','질문에 답변','묻는 사람에게만 답한다(풀). 본 제안은 알림 → 쉬운말 → 서류 체크리스트 → 신청 링크까지 한 장으로 제공해 보완한다'], cW),
  row(['복지멤버십 (맞춤형 급여 안내)','공적자료 기반 공공급여 안내','가입·공적자료 연계가 전제이고 공공급여 중심. 본 제안은 공개 API 전체(지자체 소규모 사업 포함)를 다루고 마감 관리·서류 준비를 더한다. 멤버십 가입 유도 링크를 넣어 경쟁이 아닌 보완 관계로 설계'], cW),
  row(['민간 지원금 정보 앱','수기 정리한 지원사업 목록 제공','사람이 공고를 읽고 입력하므로 범위·갱신이 제한적이고 근거가 없다. 본 제안은 AI 구조화 + 사람 승인으로 전량·일 단위 갱신, 결과마다 근거 문장 공개'], cW),
], cW));
children.push(p('', {after:60}));
children.push(bullet('독창성 요약. ① 검색·질문·급여 안내 위에 "푸시 + 준비" 층 ② AI는 추출·설명, 판정은 규칙(근거 공개·감사 가능) ③ 공공데이터를 쓰는 서비스가 데이터 품질을 정보원에 되먹임. 세계 최초·자격 확정·정부 채택 같은 주장은 하지 않는다.'));

// 5
children.push(h('5. 세부 실행 방안'));
children.push(sub('* 추진 절차, 필요한 자원, 참가자·팀의 수행 역량 및 역할'));
const sW=[1100, 1700, 4300, TW-7100];
children.push(tbl([
  hdrRow(['단계','기간','내용','산출물'], sW),
  row(['0','완료 (11.1)','중앙부처 API 461건 수집 스크립트, 상세 40건 AI 구조화 시험, 모호 유형 5건 정리','수집 스크립트, 구조화 시험표'], sW, {center:true}),
  row(['1','본선 전 (~12.2)','프로필 입력 → 해당 후보 → 쉬운말 카드 → 서류 체크리스트 체험형 웹 데모','심사위원 체험 데모'], sW, {center:true}),
  row(['2','1개월','지자체 API 결합, 변경 감지·이메일 알림 자동화, 피드백("신청했어요/해당 없어요") 수집','파일럿 30명, 지표 1차'], sW, {center:true}),
  row(['3','3개월','카카오 알림톡, 다국어·음성, 시설 데이터로 창구 안내, 정보원 데이터 품질 리포트 1회','공개 베타, 품질 리포트'], sW, {center:true}),
], sW));
children.push(p('', {after:60}));
children.push(bullet('필요 자원. 공공데이터포털 API 키(무료), LLM API 비용(구조화는 변경 건만 처리하므로 월 수만 원 수준 예상), 서버리스 호스팅, 알림톡 발송 비용. 개인정보는 브라우저 저장을 우선하고 알림 신청 시에만 연락처를 보관한다.'));
children.push(bullet('수행 역량. 제안자는 ① 공공 지침 PDF를 규칙으로 추출·승인·판정하고 쉬운말·다국어 안내장을 생성하는 Streamlit 앱(국민 곁에 ON, 2026 공공 AI 대전환 챌린지) ② 고용24 API 구조에 맞춘 경력 전환 웹 MVP(다시ON AI, 2026 고용24 AI 고용서비스 해커톤) ③ 장기요양기관 공공데이터와 규칙 엔진으로 돌봄 공백을 찾는 도구(CareGap AI)를 직접 설계·구현했다. 역할: 기획·데이터 파이프라인·규칙 엔진·웹 데모 전담(개인 참가), 본선 후 복지 현장 실무자 2~3인 자문.'));

// 6
children.push(h('6. 현장 적용 및 발전 가능성'));
children.push(sub('* 사회보장 현장 적용의 실현 가능성, 향후 확장·발전 계획 및 사업화 가능성'));
children.push(bullet('실현 가능성. 공개 API와 공개 기준표만 쓰므로 기관 내부 시스템 연동·개인정보 제공 협약 없이 바로 운영할 수 있다. 복지로 서비스 ID를 그대로 쓰기 때문에 정보원 쪽 변경(필드 추가·서비스 폐지)에 자동으로 따라간다.'));
children.push(bullet('현장 적용. ① 읍면동 복지 창구·소상공인지원센터에 "우리 지역 신규 사업 쉬운말 카드"를 제공해 상담 보조 자료로 사용 ② 지자체 신규 사업 공고 시 대상 조건에 맞는 가입자에게 직접 도달하는 홍보 채널로 활용 ③ 구조화 실패 리포트를 공고문 작성 가이드 개선에 반영.'));
children.push(bullet('사업화 가설(검증 전). B2C 기본 무료 + 소상공인·프리랜서용 유료(사업자 지원사업·세제 일정 결합, 월 구독) / B2B: 세무·노무 사무소가 고객에게 "받을 수 있는 지원"을 안내하는 화이트라벨 도구, 기업 임직원 복지 안내 / B2G: 지자체 신규 사업 홍보 도구, 공고문 쉬운말 변환 서비스.'));
children.push(bullet('확장. 구조화 파이프라인은 입력 API만 바꾸면 되므로 중소벤처기업부 기업마당, 고용24, 지자체 보조금24 등으로 넓혀 "모든 공공 지원을 먼저 알리는 비서"로 발전시킨다. 규칙과 쉬운말 카드는 JSON으로 공개해 다른 개발자·기관이 재사용할 수 있게 한다.'));

// 7
children.push(h('7. 기대효과 및 ESG 가치'));
children.push(sub('* 국민 편익, 복지서비스·행정 개선 효과 및 ESG 가치 실현 가능성'));
const eW=[1800, 4200, TW-6000];
children.push(tbl([
  hdrRow(['대상','효과','측정 지표 (파일럿)'], eW),
  row(['국민','몰라서 못 받던 서비스 발견, 마감 놓침 감소, 신청 서류 준비 시간 단축','1인당 발견 서비스 수, 알림 → 신청 연결률, 쉬운말 카드 이해도(5점 척도)'], eW),
  row(['복지 행정','"내가 받을 수 있나요" 반복 민원 감소, 공고 문장 품질 피드백','구조화 실패 유형 리포트 건수, 창구 상담 보조자료 사용 건수'], eW),
  row(['정보원·데이터','공개 API 활용 사례 확대, 데이터 품질 개선 루프','API 호출량, 품질 리포트 반영 건수'], eW),
], eW));
children.push(p('', {after:60}));
children.push(bullet('S(사회). 정보 격차로 생기는 복지 사각지대 축소, 고령·다문화 가구를 위한 쉬운말·다국어·음성 안내, 소상공인·프리랜서 등 제도 접근이 어려운 집단의 권리 실현.'));
children.push(bullet('G(지배구조·윤리). 판정 근거 문장과 AI 사용 범위·모델명 공개, 민감정보 미수집·브라우저 저장 우선, 감사 로그로 설명 가능성 확보. 규칙·카드 JSON 공개로 상생협력.'));
children.push(bullet('E(환경). 종이 안내문·방문 민원 감소(정성). 정직한 한계: 소득은 자가신고라 최종 자격은 신청 기관이 판정하며 화면에 상시 고지한다. 구조화 수치는 40건 사전 시험 기준이며 본선 전 200건으로 확대해 사람 검수 정확도를 함께 제시한다.'));

const doc = new Document({
  numbering: { config: [{ reference:'circ', levels:[{ level:0, format:LevelFormat.BULLET, text:'◦', alignment:AlignmentType.LEFT, style:{ paragraph:{ indent:{ left:280, hanging:280 } }, run:{ font:{ascii:FONT,hAnsi:FONT,eastAsia:FONT} } } }] }] },
  styles: { default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: BODY } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2], b); console.log('written', b.length); });
