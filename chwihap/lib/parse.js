// 붙여넣은 지침 원문을 조문 단위로 나눕니다.
'use strict';

const ARTICLE_RE = /^\s*(제\s*\d+\s*조(?:\s*의\s*\d+)?)\s*(\([^)]*\))?/;
const HEADING_RE = /^\s*(제\s*\d+\s*(?:편|장|절|관))(\s|$)/;
const APPENDIX_RE = /^\s*(부\s*칙|\[?별표\s*\d*\]?|\[?별지\s*(?:제\s*\d+\s*호)?\s*서식\]?)/;

function labelOf(text) {
  const first = String(text || '').split('\n')[0].trim();
  let m = first.match(ARTICLE_RE);
  if (m) return (m[1].replace(/\s+/g, '') + (m[2] ? m[2].trim() : '')).slice(0, 60);
  m = first.match(HEADING_RE);
  if (m) return first.slice(0, 40);
  m = first.match(APPENDIX_RE);
  if (m) return first.slice(0, 40);
  return first.slice(0, 24) + (first.length > 24 ? '…' : '');
}

function parseArticles(input) {
  const text = String(input || '').replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  const lines = text.split('\n');
  const hasArticles = lines.some((l) => ARTICLE_RE.test(l));
  const blocks = [];
  let cur = null;
  const flush = () => {
    if (cur) {
      const body = cur.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (body) blocks.push(body);
    }
    cur = null;
  };

  if (hasArticles) {
    for (const line of lines) {
      if (ARTICLE_RE.test(line) || HEADING_RE.test(line) || APPENDIX_RE.test(line)) {
        flush();
        cur = [line];
        if (HEADING_RE.test(line)) flush();
      } else {
        if (!cur) cur = [];
        cur.push(line);
      }
    }
    flush();
  } else {
    // 조문 번호가 없는 문서는 빈 줄 기준 문단으로 나눕니다.
    for (const line of lines) {
      if (!line.trim()) flush();
      else {
        if (!cur) cur = [];
        cur.push(line);
      }
    }
    flush();
  }

  return blocks.map((body) => ({
    label: labelOf(body),
    text: body,
    heading: HEADING_RE.test(body.split('\n')[0]) && body.split('\n').length === 1,
  }));
}

module.exports = { parseArticles, labelOf };
