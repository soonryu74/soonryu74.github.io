const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak,
        Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = require("docx");

const KO = { ascii: "Batang", eastAsia: "Batang", hAnsi: "Batang" };
const GO = { ascii: "Malgun Gothic", eastAsia: "Malgun Gothic", hAnsi: "Malgun Gothic" };

const P = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { line: 320, lineRule: "auto", before: o.before || 0, after: o.after ?? 140 },
  indent: o.indent,
  children: [new TextRun({ text, size: o.size || 20, bold: o.bold, color: o.color, font: o.font || KO })],
});
const RUNS = (parts, o = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 320, lineRule: "auto", before: o.before || 0, after: o.after ?? 140 },
  children: parts.map(([t, b]) => new TextRun({ text: t, size: 20, bold: !!b, font: KO })),
});
const H1 = (t) => new Paragraph({
  spacing: { before: 360, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "1F3864" } },
  children: [new TextRun({ text: t, size: 26, bold: true, color: "1F3864", font: GO })],
});
const H2 = (t) => new Paragraph({
  spacing: { before: 280, after: 120 },
  children: [new TextRun({ text: t, size: 22, bold: true, color: "2E4A70", font: GO })],
});
const QUOTE = (t) => new Paragraph({
  spacing: { before: 160, after: 200, line: 320 },
  indent: { left: 400, right: 400 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: "8A6D3B", space: 12 } },
  children: [new TextRun({ text: t, size: 20, italics: true, color: "444444", font: KO })],
});
const BULLET = (t) => new Paragraph({
  spacing: { after: 90, line: 300 }, indent: { left: 340, hanging: 200 },
  children: [new TextRun({ text: "· " + t, size: 20, font: KO })],
});

function infoTable(rows) {
  return new Table({
    columnWidths: [1800, 7400],
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: 1800, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "F2EDE2" },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: k, size: 19, bold: true, font: GO, color: "5C4A2A" })] })] }),
      new TableCell({ width: { size: 7400, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: v, size: 19, font: KO })] })] }),
    ]})),
  });
}

const c = [];

// ─── 표지 ───
c.push(
  new Paragraph({ text: "", spacing: { before: 2600 } }),
  P("출 간 기 획 서", { align: AlignmentType.CENTER, size: 22, color: "8A6D3B", font: GO }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 160 },
    children: [new TextRun({ text: "역학조사관", size: 72, bold: true, font: KO })] }),
  P("제1권 — 전설의 훈련단", { align: AlignmentType.CENTER, size: 26, color: "444444" }),
  P("서 해 원", { align: AlignmentType.CENTER, size: 24, bold: true, before: 700 }),
  new Paragraph({ text: "", spacing: { before: 900 } }),
  P("장편소설 · 200자 원고지 580매 · 2권 완고 보유", { align: AlignmentType.CENTER, size: 18, color: "777777" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ─── 1. 작품 개요 ───
c.push(H1("1. 작품 개요"));
c.push(infoTable([
  ["제목", "역학조사관 — 제1권 전설의 훈련단"],
  ["지은이", "서해원"],
  ["분류", "한국 장편소설 / 사회파 · 직업 서사"],
  ["분량", "200자 원고지 580매 (약 11만 6천 자, 25장)"],
  ["집필 상태", "완고. 제2권 「일천일야」(670매) 역시 완고 보유"],
  ["시대 배경", "1998년 ~ 2020년 (제2권은 2020 ~ 2023년)"],
]));

c.push(H2("로그라인"));
c.push(QUOTE("팩스로 전염병을 관리하던 나라에서, 한 사람이 \"현장에 가겠다\"고 말했다. 그가 데려간 다섯 명이 이 나라의 방역을 만들었다."));

c.push(H2("작품 소개"));
c.push(P("1998년, 국립보건원 방역국에 첫 여성 국장이 부임한다. 전염병을 다루는 나라의 방역국이 병이 도는 땅을 일 년에 두 번 밟던 시절이었다. 그는 취임 첫날 걸려 온 전화 한 통에 관용차를 두고 낡은 승합차로 서해안에 내려간다. 그리고 거기서 다섯 명을 모은다."));
c.push(P("『역학조사관』은 그 다섯 사람이 콜레라와 장티푸스, 사스와 메르스를 통과하며 이 나라의 방역 체계를 만들어 온 22년의 기록이다. 영웅담이 아니다. 숫자를 감추고 싶은 사람들과 숫자를 지키려는 사람들이 부딪치는 이야기이고, 이겨도 표가 나지 않고 지면 전부의 탓이 되는 직업에 관한 이야기다."));

// ─── 2. 줄거리 ───
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("2. 줄거리"));

c.push(H2("제1부 · 독수리 오형제 (1998 ~ 2002)"));
c.push(P("쉰일곱의 강선혜가 국립보건원 방역국장으로 부임한다. 스물여덟 해 만의 첫 여성 국장이었고, 복도에서는 \"위에서 뭘 잘못 눌렀나\"라는 말이 돌았다. 그는 취임 첫 간부회의에서 묻는다. 지금 이 시간 우리나라에서 감염병이 돌고 있는 곳이 어디입니까. 아무도 답하지 못한다. 지자체가 보내고 싶은 것만 팩스로 오던 시절이었다."));
c.push(P("그때 충남 서산의 공중보건의 민구용이 보고 체계를 세 단계 건너뛰고 전화를 건다. 쌀뜨물 같은 설사, 급격한 탈수, 같은 잔칫상. 강선혜는 콜레라를 직감하고 그날로 내려간다. 절차대로면 닷새가 걸리는 일이었다. 그 현장에서 그는 세 사람을 알아본다 — 회의 내내 침묵하며 이미 서해에 가 있던 감염관리 담당 서문일, 몸으로 수족관을 막은 공보의 민구용, 그리고 검사 인맥으로 국경 밖 정보를 물어 오는 표상철."));
c.push(P("강선혜는 직제에 없는 조직을 만든다. 예산도 사무실도 없이, 파견 명령서 다섯 장으로 시작한 상설 조사 인력. 사람들은 그들을 훈련단이라 불렀다. 다섯 번째 자리는 지하 자료실에 있던 한지원이 채운다. 그들은 전국 보건소 244곳의 직통 번호를 두 달에 걸쳐 따고, 외국 지침을 번역하며 매뉴얼 없는 나라에서 매뉴얼을 만들기 시작한다."));

c.push(H2("제2부 · SARS 100일 전쟁 (2003)"));
c.push(P("광둥에서 소문이 올라온다. 병원 폐쇄, 식초 품절. 표상철의 홍콩 후배가 보내오는 팩스는 사소한 것까지 전부였고, 그 사소함이 세계보건기구의 공식 경보보다 빨랐다. 훈련단은 경보가 나오기 두 달 전에 사례정의 초안을 쓰고 검사법을 확보한다."));
c.push(P("첫 진짜 환자는 검역대를 무사히 통과한다. 체온 36.8도로 게이트를 걸어 나가 리무진 버스를 타고 집으로 갔다. 체온계 여섯 개의 방벽이 그를 붙잡지 못했다. 두 번째 환자는 병원에서 사흘을 돌았다 — 문진표 해외 방문란에 홍콩을 적지 않았기 때문이다. 거짓말이 아니라, 딸 결혼 준비로 다녀온 나흘이 본인에게는 여행이 아니라 볼일이었기 때문이다."));
c.push(P("그리고 같은 날 세 도시에서 세 통의 전화가 온다. 훈련단은 병원을 지키고, 봉쇄의 기술을 만들고, 백일을 버틴다. 한국은 사스 사망자 0명으로 유행을 통과한다. 원장은 소원을 하나 들어주겠다고 말한다. 강선혜는 엿새 중 이틀을 고민한다. 무엇을 요구할 것인가가 아니라 어디까지 요구할 것인가를."));

c.push(H2("제3부 · 창설과 성장통 (2004 ~ 2014)"));
c.push(P("질병관리본부라는 여섯 글자가 화강암에 새겨진다. 그러나 임시 조직일 때는 규칙이 없어 자유로웠는데, 정규 기관이 되자 규칙이 사람보다, 일보다, 병보다 먼저 도착한다."));
c.push(P("강선혜는 2005년에 정년퇴임한다. 슬라이드에는 서산도 사스도 없었다. 인사 기록에 남는 것은 직책과 연도뿐이고, 현장은 기록되지 않는 곳에서 이루어졌다. 표상철은 제네바로 떠나고, 민구용은 본부장 임기를 마친 뒤에도 자문역이라는 직함으로 현장에 남는다. 조직은 커지고, 사람은 흩어지고, 십 년이 지난다."));

c.push(H2("제4부 · 메르스의 굴욕 (2015 ~ 2020)"));
c.push(P("첫 단추가 잘못 끼워진다. 사례정의가 병을 너무 좁게 정의하고 있었다. 열네 번째 환자는 자기가 위험한 곳에 있었다는 사실조차 모른 채 걸어서 응급실에 들어간다. 병원 이름이 공개되지 않았기 때문이다. 알려 주지 않은 위험은 그 사람에게 없는 위험이었다."));
c.push(P("민구용이 격리병동 복도에서 쓰러진다. 접촉자 통보 전화를 마치고 일어서다가, 명단 서류를 가슴에 끌어안은 채로. 확진 186명, 사망 38명, 격리 1만 6천여 명. 사스 모범국은 중동 밖 최대 발생국이 된다."));
c.push(P("한지원이 백서를 쓴다. 방어의 문법으로 쓰인 답변 자료에 전부 줄을 긋고, 사실이면서 쓸모없는 문장들을 걷어낸다. 그리고 개혁안 세 줄을 관철한다 — 역학조사관을 직업으로 만든다, 첫 선발은 백 명, 교육을 정식 커리큘럼으로 세운다. 세 줄을 쓰는 데 넉 달이 걸린 것이 아니라, 세 줄이 세 줄로 살아남게 하는 데 넉 달이 걸렸다."));
c.push(P("원서는 2,400장이 온다. 메르스로 그렇게 욕을 먹은 조직에 백 명을 뽑는 자리로. 2016년 5월, 입교식 강당 단상에 의자 다섯 개가 놓인다. 훈련단 다섯이 18년 만에 한 무대에 나란히 앉는 날이다. 그리고 2019년 12월, 강당 벽에 그들의 젊은 시절 사진 다섯 장이 걸린다. 백 명 중 몇이 그 사진을 올려다보던 그 겨울, 우한에서 원인 불명 폐렴이 보고된다."));

// ─── 3. 인물 ───
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("3. 주요 인물"));
[["강선혜", "1998년 국립보건원 첫 여성 방역국장. 결핵과에서 시작해 28년. 평생 목소리를 높여 본 적이 거의 없다. 목소리 큰 사람들 사이에서 작게 말하는 법을 익히는 데 28년이 걸렸다 — 작게 말하면 들으려는 사람이 몸을 기울이고, 기울인 몸은 잘 잊지 않기 때문이다."],
 ["서문일", "감염관리 담당 내과의. 원칙만 따지다 승진에서 두 번 밀렸다. 회의에서 말하지 않는 사람이지만 침묵한 것이 아니라 계산하고 있었다. 훗날 본부장."],
 ["민구용", "서산의 공중보건의로 등장. 보고 체계를 세 단계 건너뛴 전화 한 통으로 이야기를 연다. 전화로 사람을 사귀는 데 천재적이었고, 끝내 현장을 떠나지 못했다. 메르스 격리병동 복도에서 쓰러진다."],
 ["표상철", "검사와 국제 인맥. 사스를 두 달 먼저 본 사람. 마닐라로, 다시 제네바로 떠나지만 왕복 티켓으로 떠난다."],
 ["한지원", "지하 자료실에서 다섯 번째 자리로. 메르스의 수장으로 취임해 굴욕의 백서를 쓰고, 개혁안을 관철하고, 백 명을 뽑아 가르치고 떠난다."],
].forEach(([n, d]) => { c.push(H2(n)); c.push(P(d)); });

// ─── 4. 기획 의도 ───
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("4. 기획 의도와 차별점"));
c.push(H2("왜 지금 이 이야기인가"));
c.push(P("우리는 3년 동안 매일 브리핑을 기다리며 살았다. 확진자 수, 동선, 접촉자. 그 숫자 뒤에 사람이 있다는 것은 알았지만, 그 숫자를 만드는 사람이 있다는 것은 자주 잊었다. 이 소설은 그 사람들의 이야기다."));
c.push(P("코로나를 다룬 논픽션과 수기는 이미 많다. 그러나 K-방역이 어디서 왔는지를 — 1998년의 팩스 한 대에서 2020년의 상황실까지 — 하나의 서사로 꿴 장편은 아직 없다. 이 작품은 그 빈자리를 겨냥한다."));

c.push(H2("이 작품의 강점"));
[["설명이 한 줄로 끝나는 기획", "\"질병관리청 역학조사관 3세대의 22년 연대기.\" 편집 회의에서 더 설명할 필요가 없는 소재다."],
 ["전 국민이 통과한 경험", "독자가 이미 배경 지식을 갖고 있다. 사스, 메르스, 코로나는 설명이 필요 없는 공유 기억이며, 소설은 그 기억의 뒷면을 보여 준다."],
 ["직업 서사의 밀도", "사례정의, 접촉자 추적, 검체 이송, 브리핑 문장 하나를 두고 벌어지는 갈등까지 — 실무의 결이 살아 있다."],
 ["영웅담을 거부하는 태도", "이 소설에서 악은 검은 오라를 두르고 오지 않는다. 효율화, 협업, 지원 같은 좋은 단어의 얼굴로 온다. 안타고니스트는 마지막까지 자신을 나쁘다고 여기지 않는다."],
 ["여성 서사이면서 여성 서사에 갇히지 않음", "1998년 첫 여성 국장의 이야기로 시작하지만, 성별은 조건이지 주제가 아니다."],
].forEach(([t, d]) => c.push(RUNS([[t + " — ", true], [d, false]], { after: 120 })));

c.push(H2("독자층"));
c.push(BULLET("주 독자: 30~50대. 사회파 장편과 직업 서사를 읽는 층. 정유정 『28』(은행나무, 2013)처럼 재난을 정면으로 다룬 한국 장편의 독자."));
c.push(BULLET("확장 독자: 보건·의료·공공 부문 종사자, 코로나 3년을 겪은 일반 독자."));
c.push(BULLET("2차 시장: 영상화. 3세대 인물 구도와 시대별 에피소드 구조가 시리즈물 각색에 적합하다."));

// ─── 5. 구성 ───
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("5. 구성과 후속권"));
c.push(H2("제1권 「전설의 훈련단」 — 본 투고분 (580매)"));
c.push(BULLET("1부 독수리 오형제 (4장) · 2부 SARS 100일 전쟁 (7장)"));
c.push(BULLET("3부 창설과 성장통 (4장) · 4부 메르스의 굴욕 (10장)"));
c.push(P("1998년 콜레라에서 2020년 1월까지. 단독으로 완결된 서사이며, 마지막 장이 제2권의 첫 장면과 맞물린다.", { after: 200 }));

c.push(H2("제2권 「일천일야」 — 완고 보유 (670매)"));
c.push(P("2020년 1월부터 2023년까지, 코로나 3년의 천 일. 백서를 읽고 자란 2016년 기수가 주인공이 된다. 7부 41장 구성으로 이미 완고 상태이며, 제1권의 성과를 보고 협의할 수 있다."));
c.push(QUOTE("두 권을 관통하는 것은 백서다. 한 세대가 실패를 기록하고, 다음 세대가 그 기록을 읽고 자라 다시 기록을 남긴다. 문장은 사람보다 오래 살아서 후배의 새벽까지 걸어온다."));

// ─── 6. 저자 ───
c.push(H1("6. 저자 소개"));
c.push(P("서해원"));
c.push(P("[ 이력 한두 줄을 여기에 넣으세요. 예: 보건·의료 분야에서 ○년간 일했습니다 / 공공 정책 자료를 다루는 일을 해왔습니다. 소재와의 접점이 있으면 반드시 적으시는 편이 좋습니다. ]", { color: "999999" }));
c.push(P("[ 집필 계기를 한 줄. 예: 2020년 겨울 매일 브리핑을 보다가, 저 숫자를 만드는 사람들의 이야기를 쓰기로 했습니다. ]", { color: "999999" }));
c.push(P("연락처 · 이메일 [ ] / 전화 [ ]", { before: 200 }));

// ─── 7. 목차 ───
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("7. 제1권 목차"));
const book = JSON.parse(fs.readFileSync("book.json", "utf-8"));
book.volumes[0].parts.forEach(pt => {
  c.push(new Paragraph({ spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: pt.title, size: 21, bold: true, font: GO, color: "2E4A70" })] }));
  pt.chapters.forEach(ch => c.push(new Paragraph({
    spacing: { after: 40 }, indent: { left: 300 },
    children: [new TextRun({ text: ch.title, size: 19, font: KO })] })));
});

const doc = new Document({
  creator: "서해원", title: "역학조사관 출간기획서",
  styles: { default: { document: { run: { font: KO, size: 20 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 },
    margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } }, children: c }],
});
Packer.toBuffer(doc).then(b => {
  fs.writeFileSync("역학조사관_출간기획서.docx", b);
  console.log("saved", b.length, "bytes");
});
