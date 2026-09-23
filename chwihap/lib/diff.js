// 단어 단위 비교 + 신구대비표 계산. 서버(Node)와 브라우저가 같은 파일을 씁니다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Diff = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function tokenize(s) {
    return String(s || '').match(/\s+|[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]+|[^\s0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/g) || [];
  }

  // 결과: [{ t: 'eq' | 'del' | 'ins', s: '문자열' }]
  function diff(a, b) {
    const A = tokenize(a);
    const B = tokenize(b);
    let pre = 0;
    while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
    let suf = 0;
    while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
    const a2 = A.slice(pre, A.length - suf);
    const b2 = B.slice(pre, B.length - suf);
    const ops = [];
    const push = (t, s) => {
      if (!s) return;
      const last = ops[ops.length - 1];
      if (last && last.t === t) last.s += s;
      else ops.push({ t, s });
    };
    push('eq', A.slice(0, pre).join(''));
    const n = a2.length;
    const m = b2.length;
    if (n * m > 4000000) {
      push('del', a2.join(''));
      push('ins', b2.join(''));
    } else {
      const w = m + 1;
      const L = new Uint32Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          L[i * w + j] = a2[i] === b2[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (a2[i] === b2[j]) { push('eq', a2[i]); i++; j++; }
        else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) { push('del', a2[i]); i++; }
        else { push('ins', b2[j]); j++; }
      }
      while (i < n) push('del', a2[i++]);
      while (j < m) push('ins', b2[j++]);
    }
    push('eq', A.slice(A.length - suf).join(''));
    return tidy(ops);
  }

  // 공백만 같은 조각은 변경 구간에 흡수해 밑줄이 끊기지 않게 합니다.
  function tidy(ops) {
    const out = [];
    for (let k = 0; k < ops.length; k++) {
      const o = ops[k];
      const prev = out[out.length - 1];
      const next = ops[k + 1];
      if (o.t === 'eq' && /^\s+$/.test(o.s) && prev && prev.t !== 'eq' && next && next.t !== 'eq') {
        out.push({ t: 'del', s: o.s }, { t: 'ins', s: o.s });
        continue;
      }
      out.push({ ...o });
    }
    // 연속된 변경 구간은 "삭제 한 덩어리 → 추가 한 덩어리"로 모아 읽기 쉽게 합니다.
    const merged = [];
    let del = '';
    let ins = '';
    const flush = () => {
      if (del) merged.push({ t: 'del', s: del });
      if (ins) merged.push({ t: 'ins', s: ins });
      del = '';
      ins = '';
    };
    for (const o of out) {
      if (o.t === 'del') del += o.s;
      else if (o.t === 'ins') ins += o.s;
      else {
        flush();
        const last = merged[merged.length - 1];
        if (last && last.t === 'eq') last.s += o.s;
        else merged.push(o);
      }
    }
    flush();
    return merged;
  }

  // 현행 쪽/개정안 쪽 조각으로 나눕니다. mark=true 인 부분에 밑줄을 긋습니다.
  function sides(a, b) {
    const ops = diff(a, b);
    const oldSide = [];
    const newSide = [];
    for (const o of ops) {
      if (o.t === 'eq') { oldSide.push({ s: o.s, mark: false }); newSide.push({ s: o.s, mark: false }); }
      else if (o.t === 'del') oldSide.push({ s: o.s, mark: true });
      else newSide.push({ s: o.s, mark: true });
    }
    return { ops, oldSide, newSide };
  }

  // 두 시점의 조문 목록(스냅샷)으로 신구대비표 행을 만듭니다.
  // from/to: [{ id, label, text, deleted }]
  function compare(from, to, opts) {
    opts = opts || {};
    const fromMap = new Map(from.map((a) => [a.id, a]));
    const toIds = new Set(to.map((a) => a.id));
    const rows = [];
    const emit = (a, b) => {
      const oldAlive = a && !a.deleted;
      const newAlive = b && !b.deleted;
      if (!oldAlive && !newAlive) return;
      if (oldAlive && newAlive) {
        if (a.text === b.text) {
          if (opts.all) rows.push({ id: b.id, label: b.label, kind: 'same', oldSide: [{ s: a.text, mark: false }], newSide: [{ s: '(현행과 같음)', mark: false }] });
          return;
        }
        const sd = sides(a.text, b.text);
        rows.push({ id: b.id, label: b.label, kind: 'modify', oldSide: sd.oldSide, newSide: sd.newSide });
      } else if (oldAlive) {
        rows.push({ id: a.id, label: a.label, kind: 'delete', oldSide: [{ s: a.text, mark: true }], newSide: [{ s: '<삭 제>', mark: false }] });
      } else {
        rows.push({ id: b.id, label: b.label, kind: 'new', oldSide: [{ s: '<신 설>', mark: false }], newSide: [{ s: b.text, mark: true }] });
      }
    };
    // 새 시점 순서를 따르되, 새 시점에 없는 조문은 원래 앞 조문 뒤에 끼워 넣습니다.
    const orphansAfter = new Map();
    let prevId = null;
    for (const a of from) {
      if (!toIds.has(a.id)) {
        if (!orphansAfter.has(prevId)) orphansAfter.set(prevId, []);
        orphansAfter.get(prevId).push(a);
      } else prevId = a.id;
    }
    (orphansAfter.get(null) || []).forEach((a) => emit(a, null));
    for (const b of to) {
      emit(fromMap.get(b.id), b);
      (orphansAfter.get(b.id) || []).forEach((a) => emit(a, null));
    }
    return rows;
  }

  function plain(parts) {
    return parts.map((p) => p.s).join('');
  }

  return { tokenize, diff, sides, compare, plain };
});
