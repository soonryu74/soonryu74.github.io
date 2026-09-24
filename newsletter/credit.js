/* 제작 크레딧 — site-config.json 의 credit 을 읽어 [data-credit] 요소에 채운다.
   문구·날짜는 그 파일에서만 바꾼다. 못 읽으면 날짜 없는 기본 문구를 보여 준다. */
(function () {
  var el = document.querySelector('[data-credit]');
  if (!el) return;
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, '') : '';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fill(c) {
    c = c || {};
    var text = c.text || '기획·제작 지음웍스', site = c.site || 'jieumworks.com', url = c.url || 'https://jieumworks.com';
    el.innerHTML = esc(text) + ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(site) + '</a>' + (c.date ? ' · ' + esc(c.date) : '');
  }
  fill();
  fetch(base + 'site-config.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.credit) fill(j.credit); })
    .catch(function () {});
})();
