// 엑셀(xlsx)·워드(docx)·한글(hwpx) 내보내기. 외부 라이브러리 없이 XML을 직접 씁니다.
'use strict';
const fs = require('fs');
const path = require('path');
const { makeZip } = require('./zip');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const KIND_LABEL = { modify: '개정', delete: '삭제', new: '신설', same: '' };
const TYPE_LABEL = { modify: '수정', delete: '삭제', new: '신설' };
const STATUS_LABEL = { draft: '작성중', pending: '검토대기', accepted: '채택', rejected: '불채택', hold: '보류' };

// ───────────────────────── 엑셀 ─────────────────────────
function colName(i) {
  let s = '';
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function xlsxCell(ref, value, style) {
  if (Array.isArray(value)) {
    const runs = value
      .filter((p) => p.s)
      .map((p) => p.mark
        ? `<r><rPr><u/><b/><color rgb="FF1D4ED8"/><sz val="10"/><rFont val="맑은 고딕"/></rPr><t xml:space="preserve">${esc(p.s)}</t></r>`
        : `<r><rPr><sz val="10"/><rFont val="맑은 고딕"/></rPr><t xml:space="preserve">${esc(p.s)}</t></r>`)
      .join('');
    return `<c r="${ref}" s="${style}" t="inlineStr"><is>${runs || '<t></t>'}</is></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function xlsxSheet(header, rows, widths) {
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const all = [header, ...rows];
  const body = all
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => xlsxCell(colName(ci) + (ri + 1), v, ri === 0 ? 2 : 1)).join('')}</row>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${colName(header.length - 1)}${all.length}"/><pageSetup paperSize="9" orientation="landscape"/></worksheet>`;
}

function buildXlsx({ rows, reasons, proposals, finalArticles, deptName }) {
  const sheets = [
    {
      name: '신구대비표',
      xml: xlsxSheet(
        ['조문', '구분', '현행', '개정안', '개정 사유 (제안 부서)'],
        rows.map((r) => [r.label, KIND_LABEL[r.kind], r.oldSide, r.newSide, (reasons[r.id] || []).join('\n')]),
        [16, 7, 55, 55, 35]
      ),
    },
    {
      name: '부서의견',
      xml: xlsxSheet(
        ['번호', '조문', '부서', '작성자', '유형', '제안 내용', '제안 사유', '처리 결과', '처리 사유', '제출일시'],
        proposals.map((p, i) => [String(i + 1), p.articleLabel, deptName(p.deptId), p.author || '', TYPE_LABEL[p.type], p.type === 'delete' ? '(삭제 제안)' : p.text, p.reason || '', STATUS_LABEL[p.status], p.decisionReason || '', p.submittedAt ? p.submittedAt.replace('T', ' ').slice(0, 16) : '']),
        [6, 16, 12, 10, 7, 55, 30, 9, 30, 16]
      ),
    },
    {
      name: '최종본',
      xml: xlsxSheet(['조문', '내용'], finalArticles.map((a) => [a.label, a.text]), [16, 100]),
    },
  ];
  const entries = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames>${sheets.map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!$A$1:$A$1</definedName>`).join('')}</definedNames></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font><font><b/><sz val="10"/><name val="맑은 고딕"/><family val="3"/><charset val="129"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF999999"/></left><right style="thin"><color rgb="FF999999"/></right><top style="thin"><color rgb="FF999999"/></top><bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
  ];
  return makeZip(entries);
}

// ───────────────────────── 워드 ─────────────────────────
const W_FONT = '<w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕" w:hAnsi="맑은 고딕"/>';

function wRuns(parts, size) {
  const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  const out = [];
  for (const p of parts) {
    if (!p.s) continue;
    const rPr = `<w:rPr>${W_FONT}${p.mark ? '<w:b/><w:u w:val="single"/><w:color w:val="1D4ED8"/>' : ''}${p.bold ? '<w:b/>' : ''}${sz}</w:rPr>`;
    p.s.split('\n').forEach((line, i) => {
      if (i > 0) out.push(`<w:r>${rPr}<w:br/></w:r>`);
      if (line) out.push(`<w:r>${rPr}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`);
    });
  }
  return out.join('');
}

function wPara(parts, opts) {
  opts = opts || {};
  const pPr = `<w:pPr><w:spacing w:before="0" w:after="${opts.after == null ? 60 : opts.after}" w:line="300" w:lineRule="auto"/>${opts.center ? '<w:jc w:val="center"/>' : ''}${opts.pageBreak ? '<w:pageBreakBefore/>' : ''}</w:pPr>`;
  return `<w:p>${pPr}${wRuns(parts, opts.size || 20)}</w:p>`;
}

function wCell(parts, width, header) {
  const shade = header ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF7"/>' : '';
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}</w:tcPr>${wPara(parts.map((p) => (header ? { ...p, bold: true } : p)), { center: header, after: 0, size: 19 })}</w:tc>`;
}

function buildDocx({ title, subtitle, rows, reasons, finalArticles }) {
  const widths = [1800, 5600, 5600, 2400];
  const border = '<w:top w:val="single" w:sz="4" w:color="888888"/><w:left w:val="single" w:sz="4" w:color="888888"/><w:bottom w:val="single" w:sz="4" w:color="888888"/><w:right w:val="single" w:sz="4" w:color="888888"/><w:insideH w:val="single" w:sz="4" w:color="888888"/><w:insideV w:val="single" w:sz="4" w:color="888888"/>';
  const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${['조문', '현 행', '개 정 안', '개정 사유'].map((h, i) => wCell([{ s: h }], widths[i], true)).join('')}</w:tr>`;
  const body = rows
    .map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${wCell([{ s: r.label }], widths[0])}${wCell(r.oldSide, widths[1])}${wCell(r.newSide, widths[2])}${wCell([{ s: (reasons[r.id] || []).join('\n') }], widths[3])}</w:tr>`)
    .join('');
  const table = `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b)}" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${head}${body}</w:tbl>`;
  const finalPart = [
    wPara([{ s: `${title} (최종 개정본)`, bold: true }], { center: true, size: 28, after: 200, pageBreak: true }),
    ...finalArticles.map((a) => wPara([{ s: a.text }], { after: 120 })),
  ].join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${wPara([{ s: `${title} 신·구조문 대비표`, bold: true }], { center: true, size: 28, after: 80 })}${wPara([{ s: subtitle }], { center: true, size: 18, after: 200 })}${rows.length ? table : wPara([{ s: '변경된 조문이 없습니다.' }])}${wPara([{ s: '' }])}${finalPart}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="600" w:footer="600" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return makeZip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    { name: 'word/document.xml', data: doc },
  ]);
}

// ───────────────────────── 한글(HWPX) ─────────────────────────
// 한컴 표준 뼈대(lib/hwpx-template)에 글자·테두리 모양을 더하고 본문(section0)만 새로 씁니다.
const TPL = path.join(__dirname, 'hwpx-template');
const CP_BOLD = 7;
const CP_MARK = 8;
const CP_TITLE = 9;
const BF_CELL = 3;
const BF_HEAD = 4;

function hwpxHeader() {
  let h = fs.readFileSync(path.join(TPL, 'Contents/header.xml'), 'utf8');
  const base = h.match(/<hh:charPr id="0"[\s\S]*?<\/hh:charPr>/)[0];
  const variant = (id, height, extra, underline, color) =>
    base
      .replace('id="0"', `id="${id}"`)
      .replace('height="1000"', `height="${height}"`)
      .replace('textColor="#000000"', `textColor="${color || '#000000'}"`)
      .replace('<hh:underline type="NONE" shape="SOLID" color="#000000"/>', `${extra}<hh:underline type="${underline ? 'BOTTOM' : 'NONE'}" shape="SOLID" color="${color || '#000000'}"/>`);
  const addChars = variant(CP_BOLD, 1000, '<hh:bold/>', false) + variant(CP_MARK, 1000, '<hh:bold/>', true, '#1D4ED8') + variant(CP_TITLE, 1500, '<hh:bold/>', false);
  h = h.replace(/<hh:charProperties itemCnt="(\d+)">/, (m, n) => `<hh:charProperties itemCnt="${Number(n) + 3}">`);
  h = h.replace('</hh:charProperties>', addChars + '</hh:charProperties>');
  const line = (side) => `<hh:${side} type="SOLID" width="0.12 mm" color="#000000"/>`;
  const bf = (id, fill) => `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>${line('leftBorder')}${line('rightBorder')}${line('topBorder')}${line('bottomBorder')}<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/><hc:fillBrush><hc:winBrush faceColor="${fill}" hatchColor="#999999" alpha="0"/></hc:fillBrush></hh:borderFill>`;
  h = h.replace(/<hh:borderFills itemCnt="(\d+)">/, (m, n) => `<hh:borderFills itemCnt="${Number(n) + 2}">`);
  h = h.replace('</hh:borderFills>', bf(BF_CELL, 'none') + bf(BF_HEAD, '#E8EEF7') + '</hh:borderFills>');
  return h;
}

let pid = 1;
function hRuns(parts, cp) {
  return parts
    .filter((p) => p.s)
    .map((p) => `<hp:run charPrIDRef="${p.mark ? CP_MARK : p.bold ? CP_BOLD : cp || 0}"><hp:t>${esc(p.s)}</hp:t></hp:run>`)
    .join('');
}

// 줄바꿈마다 문단을 나눕니다(조각의 밑줄 표시는 유지).
function hParas(parts, opts) {
  opts = opts || {};
  const lines = [[]];
  for (const p of parts) {
    String(p.s).split('\n').forEach((seg, i) => {
      if (i > 0) lines.push([]);
      if (seg) lines[lines.length - 1].push({ ...p, s: seg });
    });
  }
  return lines
    .map((ls, i) => `<hp:p id="${pid++}" paraPrIDRef="0" styleIDRef="0" pageBreak="${opts.pageBreak && i === 0 ? 1 : 0}" columnBreak="0" merged="0">${hRuns(ls, opts.cp) || `<hp:run charPrIDRef="${opts.cp || 0}"/>`}</hp:p>`)
    .join('');
}

function hCell(parts, col, row, width, header) {
  const content = hParas(header ? parts.map((p) => ({ ...p, bold: true })) : parts);
  return `<hp:tc name="" header="${header ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${header ? BF_HEAD : BF_CELL}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${header ? 'CENTER' : 'TOP'}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${content}</hp:subList><hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${width}" height="1600"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
}

function hTable(rows, reasons) {
  const widths = [6000, 14500, 14500, 7520]; // 합계 42520 = A4 본문 폭
  const head = ['조문', '현 행', '개 정 안', '개정 사유'];
  const trs = [
    `<hp:tr>${head.map((h, i) => hCell([{ s: h }], i, 0, widths[i], true)).join('')}</hp:tr>`,
    ...rows.map((r, ri) => `<hp:tr>${[[{ s: r.label }], r.oldSide, r.newSide, [{ s: (reasons[r.id] || []).join('\n') }]].map((c, ci) => hCell(c, ci, ri + 1, widths[ci], false)).join('')}</hp:tr>`),
  ];
  return `<hp:p id="${pid++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:tbl id="${1000 + pid}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${trs.length}" colCnt="4" cellSpacing="0" borderFillIDRef="${BF_CELL}" noAdjust="0"><hp:sz width="42520" widthRelTo="ABSOLUTE" height="${1600 * trs.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs.join('')}</hp:tbl></hp:run></hp:p>`;
}

function buildHwpx({ title, subtitle, rows, reasons, finalArticles }) {
  pid = 1;
  const sec = fs.readFileSync(path.join(TPL, 'Contents/section0.xml'), 'utf8');
  const cut = sec.indexOf('</hp:ctrl></hp:run>') + '</hp:ctrl></hp:run>'.length;
  const bodyParts = [
    hParas([{ s: subtitle }]),
    hParas([{ s: '' }]),
    rows.length ? hTable(rows, reasons) : hParas([{ s: '변경된 조문이 없습니다.' }]),
    hParas([{ s: `${title} (최종 개정본)` }], { pageBreak: true, cp: CP_TITLE }),
    hParas([{ s: '' }]),
    ...finalArticles.map((a) => hParas([{ s: a.text }]) + hParas([{ s: '' }])),
  ].join('');
  const section = sec.slice(0, cut) + `<hp:run charPrIDRef="${CP_TITLE}"><hp:t>${esc(title + ' 신·구조문 대비표')}</hp:t></hp:run></hp:p>` + bodyParts + '</hs:sec>';

  const hpf = fs
    .readFileSync(path.join(TPL, 'Contents/content.hpf'), 'utf8')
    .replace('<opf:title/>', `<opf:title>${esc(title)}</opf:title>`)
    .replace(/synthetic-fixture-author/g, '취합도우미')
    .replace(/(CreatedDate|ModifiedDate)" content="text">[^<]*/g, `$1" content="text">${new Date().toISOString().slice(0, 19)}Z`);

  const read = (p) => fs.readFileSync(path.join(TPL, p));
  const preview = [title, subtitle, ...finalArticles.map((a) => a.text)].join('\r\n').slice(0, 1000);
  return makeZip([
    { name: 'mimetype', data: read('mimetype'), store: true },
    { name: 'version.xml', data: read('version.xml') },
    { name: 'Contents/header.xml', data: hwpxHeader() },
    { name: 'Contents/section0.xml', data: section },
    { name: 'Preview/PrvText.txt', data: preview },
    { name: 'settings.xml', data: read('settings.xml') },
    { name: 'Preview/PrvImage.png', data: read('Preview/PrvImage.png') },
    { name: 'META-INF/container.rdf', data: read('META-INF/container.rdf') },
    { name: 'Contents/content.hpf', data: hpf },
    { name: 'META-INF/container.xml', data: read('META-INF/container.xml') },
    { name: 'META-INF/manifest.xml', data: read('META-INF/manifest.xml') },
  ]);
}

module.exports = { buildXlsx, buildDocx, buildHwpx, STATUS_LABEL, TYPE_LABEL };
