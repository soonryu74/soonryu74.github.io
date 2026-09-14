/* 뉴스레터 → 이메일 본문 만들기
   메일 프로그램은 외부 CSS를 읽지 못하므로, 표 구조 + 인라인 서식으로 다시 그립니다.
   발간본 페이지와 뉴스레터 메이커가 함께 씁니다. */
(function (w) {
  const PALETTE = {
    outbreak: { brand: '#1b3fb0', accent: '#bf560c', soft: '#fdf1e3' },
    phsm:     { brand: '#0d6e6d', accent: '#bf560c', soft: '#fdf1e3' },
    chronic:  { brand: '#146c3a', accent: '#bf560c', soft: '#fdf1e3' },
    climate:  { brand: '#0d5c8c', accent: '#bf560c', soft: '#fdf1e3' }
  };
  const SECS = {
    outbreak: ['발생 상황', '상황 평가', '국내 관련성 · 권고'],
    phsm:     ['연구 · 정책 동향', '핵심 쟁점과 근거', '분과위 시사점 · 토론거리'],
    chronic:  ['주요 동향', '근거 해석', '국내 적용 시사점'],
    climate:  ['기후 · 건강 동향', '감시체계와 근거', '국내 대응 시사점']
  };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";

  function bullets(items, c) {
    return (items || []).map(x =>
      `<tr><td style="padding:0 0 8px 0;font:400 15px/1.75 ${FONT};color:#3d4753">
         <span style="color:${c.accent};font-weight:700">·</span> ${esc(x)}</td></tr>`).join('');
  }

  function section(title, items, c) {
    if (!items || !items.length) return '';
    return `<tr><td style="padding:14px 0 4px 0">
        <div style="font:700 12px/1.4 ${FONT};letter-spacing:.09em;color:${c.accent};
          border-bottom:1px solid ${c.soft};padding-bottom:5px;margin-bottom:9px">${esc(title)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bullets(items, c)}</table>
      </td></tr>`;
  }

  function html(data) {
    const kind = data.kind || 'outbreak';
    const c = PALETTE[kind] || PALETTE.outbreak;
    const secs = SECS[kind] || SECS.outbreak;
    const m = data.meta || {}, d = data.draft || {};
    const dateTxt = (m.date || '').replace(/-/g, '.') + (m.date ? '.' : '');

    const stats = (d.stats || []).length ? `
      <tr><td style="padding:0 0 18px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="border-top:1px solid #dde2e9;border-bottom:1px solid #dde2e9"><tr>
          ${d.stats.slice(0, 4).map(s => `
            <td width="${Math.floor(100 / Math.min(4, d.stats.length))}%" valign="top" style="padding:12px 10px 13px 0">
              <div style="font:800 19px/1.2 ${FONT};color:${c.accent}">${esc(s.v)}</div>
              <div style="font:400 12px/1.45 ${FONT};color:#3d4753;padding-top:3px">${esc(s.l)}</div>
            </td>`).join('')}
        </tr></table>
      </td></tr>` : '';

    const issues = `
      <tr><td style="padding:0 0 22px 0">
        <div style="font:800 12px/1.4 ${FONT};letter-spacing:.11em;color:#6d7885;padding-bottom:8px">목차</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${(d.topics || []).map((t, i) => `
          <tr><td style="padding:9px 0;border-bottom:1px solid #eef1f5">
            <span style="font:800 14px/1.5 ${FONT};color:${c.accent}">${i + 1}</span>
            <span style="font:700 15px/1.5 ${FONT};color:${c.brand};padding-left:6px">${esc(t.name)}</span>
            ${t.tag ? `<span style="font:700 11px/1.4 ${FONT};color:#6d7885;border:1px solid #dde2e9;
              border-radius:3px;padding:1px 6px;margin-left:6px">${esc(t.tag)}</span>` : ''}
            ${t.headline ? `<div style="font:400 14px/1.6 ${FONT};color:#3d4753;padding-top:3px">${esc(t.headline)}</div>` : ''}
            ${(t.sources || []).length ? `<div style="font:700 12px/1.5 ${FONT};color:${c.accent};padding-top:3px">출처 ${esc(t.sources.join(' · '))}</div>` : ''}
          </td></tr>`).join('')}
        </table>
      </td></tr>`;

    const topics = (d.topics || []).map((t, i) => `
      <tr><td style="padding:22px 0 6px 0;border-top:1px solid #dde2e9">
        <div style="font:800 13px/1.4 ${FONT};color:${c.accent}">${i + 1}</div>
        <div style="font:800 20px/1.35 ${FONT};color:${c.brand};padding-top:2px">${esc(t.name)}
          ${t.en ? `<span style="font:400 12px/1.4 ${FONT};color:#6d7885">${esc(t.en)}</span>` : ''}</div>
        ${(t.sources || []).length ? `<div style="font:400 12px/1.5 ${FONT};color:#6d7885;padding-top:4px">출처 <b style="color:${c.accent}">${esc(t.sources.join(' · '))}</b></div>` : ''}
        ${t.headline ? `<div style="font:600 15px/1.6 ${FONT};color:#191f28;border-left:3px solid ${c.accent};
          padding:2px 0 2px 12px;margin-top:10px">${esc(t.headline)}</div>` : ''}
      </td></tr>
      ${section(secs[0], t.situation, c)}
      ${section(secs[1], t.assess, c)}
      ${section(secs[2], t.korea, c)}
      <tr><td style="padding:8px 0 20px 0">
        <div style="font:700 12px/1.5 ${FONT};color:#6d7885;padding-bottom:4px">출처</div>
        ${(t.refs || []).map((r, n) => {
          const [head, link] = r.split(' — ');
          return `<div style="font:400 12px/1.6 ${FONT};color:#6d7885;padding-bottom:3px">${n + 1}. ${esc(head)}
            ${link ? `<a href="${esc(link)}" style="color:${c.accent}">원문</a>` : ''}</div>`;
        }).join('')}
      </td></tr>`).join('');

    const sub = data.subscribe || {};
    const qrAbs = data._qr_abs || '';
    const subscribe = sub.url ? `
      <tr><td style="padding:4px 0 24px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background:${c.soft};border:1px solid #dde2e9;border-left:4px solid ${c.accent}">
          <tr>
            ${qrAbs ? `<td width="120" valign="top" style="padding:16px 0 16px 16px">
              <img src="${esc(qrAbs)}" width="104" height="104" alt="구독 QR"
                style="display:block;background:#fff;padding:5px;border:1px solid #dde2e9"></td>` : ''}
            <td valign="middle" style="padding:16px">
              <div style="font:800 15px/1.4 ${FONT};color:${c.brand}">${esc(sub.label || '뉴스레터 구독')}</div>
              <div style="font:400 13px/1.6 ${FONT};color:#3d4753;padding:4px 0 10px 0">${esc(sub.note || '')}</div>
              <a href="${esc(sub.url)}" style="display:inline-block;background:${c.brand};color:#fff;
                text-decoration:none;font:700 13px/1 ${FONT};padding:11px 18px;border-radius:6px">구독하고 지난 호 보기</a>
            </td>
          </tr>
        </table>
      </td></tr>` : '';

    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title || '뉴스레터')} ${esc(m.issue || '')}</title></head>
<body style="margin:0;padding:0;background:#eef1f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:20px 0">
 <tr><td align="center">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0"
    style="width:640px;max-width:100%;background:#ffffff;border:1px solid #dde2e9;border-top:6px solid ${c.brand}">
   <tr><td style="padding:30px 34px 26px 34px">
     <div style="font:700 12px/1.4 ${FONT};letter-spacing:.08em;color:${c.accent}">${esc(m.org || '')}</div>
     <div style="font:800 27px/1.25 ${FONT};color:${c.brand};padding:10px 0 8px 0">${esc(m.title || '')}</div>
     <div style="font:400 12px/1.5 ${FONT};color:#6d7885">${esc(m.issue || '')}${m.issue && dateTxt ? ' · ' : ''}${esc(dateTxt)}${m.editor ? ' · 작성 ' + esc(m.editor) : ''}</div>
     ${d.tagline ? `<div style="font:500 17px/1.6 ${FONT};color:#3d4753;padding-top:14px">${esc(d.tagline)}</div>` : ''}
   </td></tr>
   <tr><td style="padding:0 34px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${stats}${issues}
       ${d.intro ? `<tr><td style="padding:0 0 20px 0;font:400 15px/1.8 ${FONT};color:#3d4753;
         border-left:3px solid ${c.soft};padding-left:14px;white-space:pre-line">${esc(d.intro)}</td></tr>` : ''}
       ${topics}
       ${subscribe}
     </table>
   </td></tr>
   <tr><td style="padding:16px 34px 26px 34px;border-top:1px solid #dde2e9">
     <div style="font:400 12px/1.6 ${FONT};color:#6d7885">
       본 뉴스레터는 각 기관의 공개 자료와 학술 문헌을 정리한 것으로, 원문의 내용이 우선합니다.<br>
       ${esc(m.org || '')}${m.editor ? ' · ' + esc(m.editor) : ''}</div>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
  }

  function text(data) {
    const m = data.meta || {}, d = data.draft || {};
    const lines = [`${m.title || ''} ${m.issue || ''}`.trim(), m.org || '', ''];
    if (d.tagline) lines.push(d.tagline, '');
    (d.topics || []).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.name}${t.tag ? ' [' + t.tag + ']' : ''}`);
      if (t.headline) lines.push('   ' + t.headline);
      (t.summary || []).forEach(s => lines.push('   - ' + s));
      lines.push('');
    });
    return lines.join('\n');
  }

  async function copy(data) {
    const h = html(data), t = text(data);
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([h], { type: 'text/html' }),
        'text/plain': new Blob([t], { type: 'text/plain' })
      })]);
      return '서식 그대로 복사했습니다. 메일 쓰기 창에 붙여넣으세요.';
    } catch (e) {
      await navigator.clipboard.writeText(t);
      return '글자만 복사했습니다(서식 복사는 이 브라우저에서 막혀 있습니다).';
    }
  }

  function download(data) {
    const m = data.meta || {};
    const name = ((m.title || '뉴스레터').replace(/\s+/g, '') + '_' + (m.issue || '').replace(/[^\w가-힣]+/g, '') + '_메일본문.html');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html(data)], { type: 'text/html;charset=utf-8' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function mailto(data) {
    const m = data.meta || {};
    const subject = `[${m.issue || ''}] ${m.title || ''}`.trim();
    const body = text(data).slice(0, 1500);
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  w.NLEmail = { html, text, copy, download, mailto, PALETTE, SECS };
})(window);
