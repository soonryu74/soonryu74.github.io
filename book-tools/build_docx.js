// book.json → 역학조사관_원고.docx
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, TableOfContents, SectionType,
} = require("docx");

const book = JSON.parse(fs.readFileSync("book.json", "utf-8"));

const KO = { ascii: "Batang", eastAsia: "Batang", hAnsi: "Batang" };

// 인라인 마크다운(**굵게**, *기울임*) → TextRun[]
function runs(text, extra = {}) {
  const out = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0, m;
  const push = (t, bold, italics) => {
    if (t) out.push(new TextRun({ text: t, bold, italics, ...extra }));
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) push(tok.slice(2, -2), true);
    else push(tok.slice(1, -1), undefined, true);
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

function bodyPara(block) {
  if (block.type === "dateline") {
    return [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: runs(block.text, { italics: true, color: "555555" }),
    })];
  }
  // 단락 내 강제 줄바꿈은 별도 문단으로
  return block.text.split("\n").map((line, i) => new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 200 }, // 1글자 들여쓰기(약)
    spacing: { line: 360, lineRule: "auto" },
    children: runs(line),
  }));
}

const children = [];

// 표제지
children.push(
  new Paragraph({ text: "", spacing: { before: 4000 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "장 편 소 설", size: 24, color: "7a6a4a" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 600, after: 400 },
    children: [new TextRun({ text: book.title, bold: true, size: 88 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: book.subtitle, size: 26, color: "444444" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 3000 },
    children: [new TextRun({ text: book.edition, size: 20, color: "777777" })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 목차
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "차   례", bold: true, size: 32 })],
  }),
  new TableOfContents("차례", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

for (const vol of book.volumes) {
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
    alignment: AlignmentType.CENTER, spacing: { before: 4400, after: 400 },
    children: [new TextRun({ text: vol.title, bold: true, size: 40 })],
  }));
  for (const part of vol.parts) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2, pageBreakBefore: true,
      alignment: AlignmentType.CENTER, spacing: { before: 4400, after: 400 },
      children: [new TextRun({ text: part.title, bold: true, size: 30 })],
    }));
    for (const ch of part.chapters) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3, pageBreakBefore: true,
        alignment: AlignmentType.CENTER, spacing: { before: 600, after: 600 },
        children: [new TextRun({ text: ch.title, bold: true, size: 26 })],
      }));
      for (const b of ch.blocks) children.push(...bodyPara(b));
    }
  }
}

const doc = new Document({
  creator: book.author,
  title: book.title,
  description: book.subtitle + " — " + book.edition,
  styles: {
    default: {
      document: { run: { font: KO, size: 21 } }, // 10.5pt
      heading1: { run: { font: KO, color: "000000" } },
      heading2: { run: { font: KO, color: "000000" } },
      heading3: { run: { font: KO, color: "000000" } },
    },
  },
  features: { updateFields: true },
  sections: [{
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("역학조사관_원고.docx", buf);
  console.log("saved 역학조사관_원고.docx", buf.length, "bytes");
});
