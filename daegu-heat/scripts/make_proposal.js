// 제안서(붙임 6) DOCX 생성: node scripts/make_proposal.js <imgDir> <out.docx>
const fs = require('fs'); const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, BorderStyle, LevelFormat, ImageRun, PageBreak } = require('docx');
const IMG = process.argv[2]; const OUT = process.argv[3];
const FONT = '맑은 고딕'; const BODY = 19;
const run = (t, o = {}) => new TextRun({ text: t, font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: o.size || BODY, bold: o.bold, color: o.color });
const p = (t, o = {}) => new Paragraph({ children: Array.isArray(t) ? t : [run(t, o)], alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 60, line: o.line ?? 270 }, numbering: o.bullet ? { reference: 'b', level: 0 } : undefined });
const bullet = t => p(t, { bullet: true, after: 40 });
const h1 = t => new Paragraph({ children: [run('■ ' + t, { bold: true, size: 26 })], spacing: { before: 240, after: 100, line: 300 }, shading: { type: ShadingType.CLEAR, fill: 'FDEAE2' }, border: { left: { style: BorderStyle.SINGLE, size: 30, color: 'B4411F', space: 4 } } });
const h2 = t => p(t, { bold: true, size: 22, before: 160, after: 60, color: 'B4411F' });
const sub = t => p(t, { color: '666666', size: 17, after: 60 });
const border = { style: BorderStyle.SINGLE, size: 4, color: '999999' }; const borders = { top: border, bottom: border, left: border, right: border };
const TW = 9638;
const cell = (ch, w, o = {}) => new TableCell({ children: ch, width: { size: w, type: WidthType.DXA }, borders, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined, verticalAlign: 'center', margins: { top: 40, bottom: 40, left: 90, right: 90 } });
const tbl = (rows, widths) => new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, rows });
const hdr = (cols, w) => new TableRow({ tableHeader: true, cantSplit: true, children: cols.map((c, i) => cell([p(c, { bold: true, align: AlignmentType.CENTER, after: 0, size: 17 })], w[i], { fill: 'F3D9CC' })) });
const row = (cols, w, o = {}) => new TableRow({ cantSplit: true, children: cols.map((c, i) => cell([p(c, { after: 0, size: 17, bold: o.boldFirst && i === 0, align: o.center && i === 0 ? AlignmentType.CENTER : undefined })], w[i], { fill: o.firstFill && i === 0 ? 'FAF3EE' : undefined })) });
const img = (file, wCm, cap) => { const b = fs.readFileSync(path.join(IMG, file)); const IS = require('image-size'); const szf = typeof IS === 'function' ? IS : (IS.imageSize || IS.default); const { width, height } = szf(b); const w = Math.round(wCm * 37.8), h = Math.round(w * height / width); return [new Paragraph({ children: [new ImageRun({ data: b, type: 'png', transformation: { width: w, height: h } })], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 } }), p(cap, { align: AlignmentType.CENTER, size: 16, color: '666666', after: 120 })]; };

const C = [];
// ---- 서식 머리 ----
C.push(p('[붙임 6] 아이디어 제안서(서식)[부문1]', { size: 17, color: '666666', after: 40 }));
C.push(new Paragraph({ children: [run('아이디어 제안서', { bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
const hw = [1700, TW - 1700];
C.push(tbl([
  row(['접수번호', '※ 미기재'], hw, { boldFirst: true, firstFill: true }),
  row(['공 모 명', '제1회 대구광역시 기후·환경·탄소중립 공공데이터 AI 활용대회'], hw, { boldFirst: true, firstFill: true }),
  row(['성명', '서순려'], hw, { boldFirst: true, firstFill: true }),
  row(['연 락 처', '010-9943-1124 / soonryu74@gmail.com'], hw, { boldFirst: true, firstFill: true }),
  row(['아이디어 제목', '대구 더위·미세먼지 건강 비서 — 폭염·미세먼지 위험을 사람마다 다르게 계산해 먼저 알리는 공공데이터 AI 서비스'], hw, { boldFirst: true, firstFill: true }),
], hw));

// ---- 1. 아이디어 개요 ----
C.push(h1('아이디어 개요'));
C.push(h2('1) 배경: 폭염 문자는 모두에게 똑같이 오지만, 위험은 사람마다 다르다'));
C.push(bullet('대구 온열질환자는 2024년 67명에서 2025년 140명으로 2.1배가 되었다(질병관리청 온열질환 응급실감시, 발생지역 기준). 2025년 대구 140건 중 실외 발생이 87%(122건), 실외 작업장이 41%(57건)였고, 7월(72건)·8월(45건) 낮 시간에 집중됐다. 2011~2025년 누적 750건의 36%가 65세 이상이다.'));
C.push(bullet('대구 152개 행정동 중 군위군 면 지역은 65세 이상 비율이 55~61%, 달성군 하빈면 49%다(행정안전부 주민등록 인구, 2026.9.30). 같은 폭염경보라도 성서공단의 54세 배관공, 효령면의 81세 독거 어르신, 태전동의 8개월 아기 부모가 받아야 할 메시지는 다르다.'));
C.push(bullet('그런데 지금의 안내는 시·구 단위 재난문자, 미세먼지 앱, 날씨 앱이 따로 울린다. 수신자는 "그래서 나는 오늘 뭘 해야 하나"를 스스로 조합해야 하고, 가장 취약한 사람일수록 조합할 힘이 없다.'));
C.push(bullet('2026년 6월 기상청은 폭염특보를 3단계(주의보 체감 33℃·경보 35℃·중대경보 체감 38℃ 또는 기온 39℃)로 개편하고 열대야주의보를 신설하면서 "중단(Stop)·이동(Move)·확인(Check)" 행동수칙을 제시했다. 이 수칙을 개인별로 번역해 전달할 도구가 필요하다.'));
C.push(h2('2) 핵심 과제와 아이디어'));
C.push(bullet('공개된 네 가지 공공데이터(기상청 특보, 에어코리아 대기질, 행정안전부 무더위쉼터, 행정동 인구+질병관리청 온열질환 통계)를 매시간 읽어, 시민이 한 번 입력한 최소 조건(나이·질환·하는 일·사는 동·독거·냉방기 유무)과 겹쳐 "지금 나의 단계"(관심·주의·위험)를 계산한다. 판정은 공개된 규칙이 하고, AI는 기상청 행동수칙과 통계를 조건별 쉬운말·다국어 문장으로 바꾼다.'));
C.push(bullet('단계가 바뀔 때만 알린다. 알림에는 오늘 할 일 3가지, 가장 가까운 열린 무더위쉼터, 혼자 사는 분이면 보호자에게 보내는 안부 확인 요청이 함께 간다. 탄소중립과의 연결: 낮 2~5시 집 냉방 대신 쉼터·도서관 이용을 권해 전력 피크를 분산하고, 행정동별 쉼터 이용·피크 분산 효과를 탄소중립지원센터에 되먹인다.'));
C.push(h2('3) 기대효과 요약'));
C.push(bullet('시민: 내 조건에 맞는 한 줄 행동으로 온열질환·미세먼지 노출을 줄인다. 행정: 행정동 단위 위험 지도와 쉼터 수요를 실시간으로 본다. 센터: 폭염·탄소중립 홍보를 "내 동네 내 이야기"로 바꾸는 채널을 얻는다. 모든 입력이 공개 API라 즉시 구현·확장 가능하며, 작동하는 웹 데모를 이미 만들어 첨부 화면으로 제시한다.'));

// ---- 2. 세부 추진방안 ----
C.push(h1('세부 추진방안'));
C.push(h2('1) 서비스 작동 흐름'));
C.push(...img('diagram.png', 16.5, '[그림 1] 데이터 흐름: ① 공공데이터 수집 → ② 규칙 엔진 판정 → ③ AI 쉬운말 알림 → ④ 센터·대구시 되먹임'));
C.push(h2('2) 활용 공공데이터와 전처리'));
const dW = [2900, 1500, TW - 4400];
C.push(tbl([
  hdr(['공공데이터 (출처)', '제공기관·주기', '전처리·활용 방법'], dW),
  row(['기상청_기상특보 조회서비스 API (공공데이터포털 15000415)', '기상청 · 매시간', '대구 특보구역의 폭염주의보·경보·중대경보·열대야주의보 발효 여부와 통보문을 읽어 환경 점수 입력. 2026년 개편 기준(체감 33/35/38℃, 밤최저 25℃) 적용'], dW),
  row(['한국환경공단_에어코리아_대기오염정보 API (15073861)', '한국환경공단 · 매시간', '대구 도시대기 측정소 20곳(수창동·본동·태전동 등)의 PM2.5·오존 등급. 사용자 행정동에서 가장 가까운 측정소 매핑'], dW),
  row(['행정안전부_무더위쉼터 API (15138456)', '행정안전부 · 일 1회', '시설구분·주소·수용인원·냉방기 보유 → 좌표 변환 후 거리순 정렬. 운영시간(경로당·주민센터·은행·야간쉼터)은 구·군 공고에서 AI가 구조화해 보강'], dW),
  row(['행정안전부_지역별(행정동) 성별 연령별 주민등록 인구수 (15097972) — 2026.9.30 실측 확보', '행정안전부 · 월 1회', '대구 152개 행정동의 65세·75세 이상, 0~4세 인구 비율 산출 → 행정동 취약도, 지역 위험 지도'], dW),
  row(['질병관리청_온열질환 감시 데이터 2011~2025 (15149889) — 대구 750건 실측 확보', '질병관리청 · 연 1회', '발생 장소(실외 작업장·길가·논밭·집)·시간·연령·구군 집계 → 개인 취약 가중치와 행동 문장의 근거. 연보 발간 시 갱신'], dW),
  row(['대구 D-데이터허브 녹지·공원, 온실가스종합정보센터 지역 인벤토리 (확장)', '대구광역시·환경부', '행정동 녹지율 보조 지표, 쉼터 이용↔전력 피크 분산 효과 추정의 배출계수'], dW),
], dW));
C.push(p('', { after: 40 }));
C.push(bullet('규칙: 원자료 값은 바꾸지 않고 집계·필드 선택만 한다. 모든 출처·라이선스(이용허락범위 제한 없음)를 붙임 5에 기재한다. 개인정보는 이름·주소·병명을 받지 않고 조건만 받으며, 알림 신청 시에만 연락처를 보관한다.'));
C.push(h2('3) 판정 규칙 (규칙 엔진, 공개)'));
const rW = [2300, TW - 2300];
C.push(tbl([
  hdr(['항목', '점수와 근거'], rW),
  row(['환경 점수', '폭염주의보 +2, 경보 +3, 중대경보 +4 / 열대야주의보 +1 / PM2.5 나쁨 +2, 매우나쁨 +3 / 오존 나쁨 +1 / 낮 12~17시 +1 (대구 온열질환 발생이 가장 많은 시간대)'], rW, { boldFirst: true, firstFill: true }),
  row(['개인 취약 점수', '75세 이상 +3, 65세 이상 +2 (누적 36%가 65세 이상) / 실외 작업 +3 (2025년 41%가 실외 작업장) / 실외 운동 +2, 도보 이동 +1 / 심뇌혈관·당뇨·신장·정신질환·이뇨제 복용 각 +2 / 호흡기질환 +2 (미세먼지·오존) / 임신·영유아 돌봄 +2 / 독거 +2 / 냉방기 없음 +2'], rW, { boldFirst: true, firstFill: true }),
  row(['단계 계산', '총점 = 환경 × (1 + 취약/6). 5 이상 "주의", 9 이상 "위험". 폭염중대경보에 취약 조건이 하나라도 있으면 바로 "위험". 특보·나쁨이 없으면 "관심" 이상으로 올리지 않는다(과잉 경보 방지).'], rW, { boldFirst: true, firstFill: true }),
  row(['근거 공개', '결과 화면에 환경·개인 항목별 점수와 이유를 모두 표시한다. 가중치는 설계값이며 보건소·현장 실무자 검토로 조정한다(JSON 한 파일).'], rW, { boldFirst: true, firstFill: true }),
], rW));
C.push(p('', { after: 40 }));
C.push(h2('4) AI 활용 방법'));
C.push(bullet('쉬운말·다국어 행동 문장: 규칙이 조건에 맞는 행동 항목(예: 실외 작업자 + 경보 → 12~17시 회피, 1시간마다 휴식)을 고르면, AI(LLM)가 기상청 행동수칙·온열질환 통계 원문만 컨텍스트로 받아 60대 눈높이의 한 문장과 다국어(베트남어·중국어 등 외국인 노동자 언어)로 바꾼다. 원문 범위 밖의 내용은 쓰지 못하게 컨텍스트를 제한하고, 생성 문장은 사람이 검수한 뒤 템플릿으로 저장해 재사용한다(매 알림마다 생성하지 않아 비용·환각 위험을 낮춤).'));
C.push(bullet('공고·지침 구조화: 구·군이 공고하는 무더위쉼터 운영시간·야간 개방·주말 개방 정보는 PDF·게시글로 흩어져 있다. AI가 문장에서 시설명·시간·기간을 추출해 초안을 만들고 사람이 승인해 쉼터 데이터에 보강한다. 제안자는 같은 방식(지침 PDF → 규칙 추출 → 승인)을 다른 공공 AI 과제에서 구현·운용한 경험이 있다.'));
C.push(bullet('자연어 질문: "오늘 밭일 나가도 돼요?" 같은 질문을 조건(실외 작업·시간대)으로 구조화해 프로필에 반영 제안. 판정은 여전히 규칙이 한다.'));
C.push(bullet('AI가 하지 않는 일: 위험 단계 판정, 의학적 진단. 모델명·프롬프트·컨텍스트는 로그로 남기고(붙임 4), 화면에 "참고용, 진단 아님, 어지럼·구토 시 119"를 상시 표시한다.'));
C.push(h2('5) 알림·쉼터·안부 확인 설계'));
C.push(bullet('알림 시점: ① 내 단계가 바뀔 때(특보 발효·해제, 농도 등급 변화) ② 매일 11시 "가장 더운 시간 전" ③ 열대야주의보 시 밤 준비 ④ 혼자 사는 분은 보호자에게 안부 확인 요청(기상청 수칙 3단계 "확인"의 자동화). 응답이 없으면 동의한 경우 동 행정복지센터 돌봄 담당에게 전달.'));
C.push(bullet('쉼터: 행정안전부 쉼터 API를 거리순으로 보여 주되, "지금 열려 있는지"를 운영시간 데이터로 표시한다. 야간·주말에 열린 곳(은행·편의점·24시 쉼터)을 우선 노출한다.'));
C.push(bullet('채널: 카카오톡 알림톡, 문자, 앱 푸시. 스마트폰이 없는 어르신은 보호자 대리 수신과 경로당 게시용 "오늘 우리 동 단계" 인쇄 카드로 보완한다.'));
C.push(h2('6) 스토리보드 (작동 데모 화면)'));
C.push(...img('home.png', 15.5, '[화면 1] 홈: 사례 3종 원클릭, "왜 대구인가" 실측 수치'));
C.push(...img('c_worker.png', 15.5, '[화면 2] 결과: 달서구 야외 배관공 사례 — 단계·환경·행정동 고령 비율·오늘 할 일'));
C.push(...img('c_score.png', 15.5, '[화면 3] 점수 근거: 환경 점수와 개인 취약 점수를 항목별로 공개'));
C.push(...img('c_alert.png', 15.5, '[화면 4] 알림 미리보기: 단계 변화·11시 사전 알림·안부 확인·밤 준비·탄소중립 연결'));
C.push(h2('7) 기술 구성과 일정'));
const sW = [1100, 1700, 4300, TW - 7100];
C.push(tbl([
  hdr(['단계', '기간', '내용', '산출물'], sW),
  row(['0', '완료 (11월)', '온열질환 감시·행정동 인구 실데이터 확보·집계, 규칙 엔진, 사례 3종 웹 데모(정적 웹, 서버 없음)', '데모 URL, 집계 JSON'], sW, { center: true }),
  row(['1', '1개월', '기상청 특보·에어코리아·쉼터 API 연결(활용신청 완료), 매시간 수집 자동화(GitHub Actions), 쉼터 운영시간 AI 구조화', '실시간 판정, 쉼터 지도'], sW, { center: true }),
  row(['2', '2개월', '카카오 알림톡·안부 확인, 다국어 카드, 행정동 위험 지도(센터용), 구·군 보건소 실무자 5명 규칙 검토', '파일럿 100가구'], sW, { center: true }),
  row(['3', '2027년 여름', '폭염대책기간(5.15~9.30) 실운영, 쉼터 이용↔전력 피크 분산 효과 측정, 연보로 가중치 갱신', '운영 보고서'], sW, { center: true }),
], sW));
C.push(p('', { after: 40 }));
C.push(bullet('기술: Python 수집·집계, JavaScript 규칙 엔진(브라우저에서 실행, 서버 비용 없음), OpenAI 호환 LLM API(국산 모델로 교체 가능), 정적 웹 + 서버리스 함수. 모든 코드와 규칙 JSON을 공개 저장소에 둔다.'));

// ---- 3. 실현 가능성 및 기대효과 ----
C.push(h1('실현 가능성 및 기대효과'));
C.push(h2('1) 실현 가능성'));
C.push(bullet('데이터: 다섯 가지 핵심 데이터가 모두 공공데이터포털에 개방돼 있고 이용허락 제한이 없다. 이 중 두 가지(온열질환 감시 33,360건, 행정동 인구 3,619개 동)는 이미 내려받아 대구 집계를 끝냈고, 나머지 세 API는 활용신청 절차만 남았다.'));
C.push(bullet('구현: 규칙 엔진과 화면이 정적 웹으로 이미 작동한다. 실시간 연결은 API 호출을 붙이는 작업이며, 알림톡 비용(건당 10원 안팎)과 LLM 비용(템플릿 재사용으로 월 수만 원) 외 서버 비용이 거의 없다.'));
C.push(bullet('현장 적용: 탄소중립지원센터·구군 보건소·동 행정복지센터가 이미 수행하는 폭염 취약계층 안부 전화를 "오늘 단계가 오른 가구" 순으로 정렬해 주는 보조 도구로 바로 쓸 수 있다. 시민 대상 서비스와 행정 대상 지도를 같은 데이터로 만든다.'));
C.push(h2('2) 시민 편익'));
C.push(bullet('"오늘 나는 무엇을 하면 되는가"가 한 문장으로 온다. 실외 노동자에게는 휴식 시간, 어르신에게는 가장 가까운 열린 쉼터, 아기 부모에게는 미세먼지와 더위 중 무엇을 먼저 피할지. 전 시민 동일 문자가 아니라 내 단계가 바뀔 때만 와서 알림 피로가 적다.'));
C.push(bullet('혼자 사는 어르신은 보호자가 멀리 있어도 "오늘 전화 한 통"이 자동으로 요청된다. 기상청이 중대경보 수칙에서 "독거노인·이웃에게 전화하는 것이 생명을 구하는 가장 빠른 방법"이라 한 그 행동을 시스템이 떠올려 준다.'));
C.push(h2('3) 기후·탄소중립 효과'));
C.push(bullet('적응: 폭염·미세먼지 건강 피해를 줄이는 것은 기후위기 적응의 핵심 과제다. 대구는 온열질환이 2년 새 2.1배가 된 도시이고, 2026년 전국 추정 사망자는 36명으로 전년보다 늘었다.'));
C.push(bullet('감축: 폭염일 전력 피크는 냉방이 만든다. 낮 2~5시 집 냉방 대신 쉼터·도서관 이용을 권하고 "냉방 26℃ + 선풍기"를 함께 안내하면 피크가 분산된다. 행정동별 쉼터 이용 수와 한전 시간대 전력 통계를 결합해 분산 효과를 추정하고, 센터의 탄소중립 홍보 자료로 제공한다.'));
C.push(h2('4) 센터·대구시 활용 가치'));
C.push(bullet('행정동 위험 지도: 단계가 오른 가구 수·쉼터 수요를 지도로 보여 주어 이동형 쉼터 버스 경로, 살수차, 경로당 연장 운영 결정에 쓴다.'));
C.push(bullet('홍보·교육: 사례 3종과 쉬운말 카드는 그대로 시민 교육 자료가 된다. 수상작 저작권 조항에 따라 센터가 복제·배포·2차 저작에 무상 활용할 수 있도록 공개 저장소로 제공한다.'));
C.push(bullet('데이터 품질 되먹임: 쉼터 운영시간 누락·오류, 측정소 결측을 집계해 행정안전부·환경공단·대구시에 리포트한다.'));
C.push(h2('5) 지속가능성과 정직한 한계'));
C.push(bullet('지속: 규칙은 JSON 한 파일이라 매년 질병관리청 연보와 기상청 기준 변경을 반영하기 쉽다. 입력 API만 바꾸면 한파·미세먼지 비상저감조치로 확장된다.'));
C.push(bullet('한계: 가중치는 설계값이며 효과는 아직 측정 전이다. 파일럿 지표(알림 후 쉼터 이용률, 안부 확인 응답률, 사용자 이해도)를 2027년 여름에 확보한다. 특보·농도 실시간 연결은 API 승인 후이며, 데모의 날씨 상황은 시나리오 입력임을 화면에 표시했다. 무더위쉼터 목록은 데이터 연결 전이라 빈칸으로 두고 가짜 목록을 넣지 않았다.'));

// ---- 4. 자유 기재 ----
C.push(h1('(자유 기재) 실측 데이터 요약·수행 역량·확장'));
C.push(h2('1) 대구 온열질환 실측 (질병관리청 감시 데이터, 발생지역 기준)'));
const eW = [2000, 2600, TW - 4600];
C.push(tbl([
  hdr(['구분', '2025년 (140건)', '비고'], eW),
  row(['구·군', '달서구 45, 달성군 21, 동구 20, 남구 14, 중구 14, 북구 8, 수성구 8, 서구 8, 군위군 2', '달서구·달성군·동구가 61%'], eW),
  row(['발생 장소', '실외 작업장 57, 길가 18, 실외 기타 14, 논밭 11, 운동장·공원 11, 실내 작업장 9, 주거지 주변 8, 집 6', '실외 122건(87%)'], eW),
  row(['월', '5월 5, 6월 17, 7월 72, 8월 45, 9월 1', '7~8월 84%'], eW),
  row(['연령', '20대 17, 30대 19, 40대 18, 50대 29, 60대 34, 70대 10, 80대 10, 90대 1', '65세 이상 26% (누적 36%)'], eW),
  row(['연도 추이', '2018년 122 → 2023년 59 → 2024년 67 → 2025년 140', '전국 2025년 4,460명'], eW),
], eW));
C.push(p('', { after: 40 }));
C.push(h2('2) 대구 행정동 고령 인구 (행정안전부, 2026.9.30)'));
C.push(bullet('대구 전체 65세 이상 541,795명 / 2,345,828명(23.1%). 152개 행정동 중 65세 이상 비율 상위: 군위군 산성면 61.3%, 의흥면 60.6%, 삼국유사면 60.3%, 우보면 59.7%, 소보면 57.6%, 효령면 54.7%, 부계면 54.1%, 달성군 하빈면 48.8%. 반면 달서구 이곡1동은 19.7%로, 같은 폭염경보에서도 동별 우선순위가 다르다.'));
C.push(h2('3) 수행 역량'));
C.push(bullet('제안자는 질병관리청 수도권질병대응센터 만성질환사업과 보건연구관으로, 온열질환·만성질환 감시와 건강 지표 분석을 업무로 다룬다. 개인 프로젝트로 ① 공공 지침 PDF를 규칙으로 추출·승인·판정하고 쉬운말·다국어 안내장을 생성하는 앱(2026 공공 AI 대전환 챌린지 출품) ② 고용24 API 기반 경력 전환 웹 MVP(2026 고용24 AI 해커톤) ③ 지역 건강프로파일 대시보드(질병관리청 지역사회건강조사 171개 지표, 258개 지역)를 설계·구현했다. 이번 데모도 같은 방식으로 혼자 설계·구현했다.'));
C.push(h2('4) 확장 계획'));
C.push(bullet('한파·미세먼지 비상저감조치·오존주의보로 입력 확장(같은 규칙 구조). 외국인 노동자 다국어 카드(달성군·성서공단). 경로당·사업장 단위 "우리 집단 단계" 게시판. 다른 광역시로 이식(행정동 인구·특보구역 코드만 교체).'));
C.push(p('※ 사용 공공데이터 목록·URL은 붙임 5, AI 프롬프트 활용 내역은 붙임 4에 기재. 데모 소스와 집계 JSON은 공개 저장소(soonryu74.github.io/daegu-heat)에 둔다.', { size: 16, color: '666666', before: 120 }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 280, hanging: 280 } }, run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT } } } }] }] },
  styles: { default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT }, size: BODY } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: C }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('written', b.length); });
