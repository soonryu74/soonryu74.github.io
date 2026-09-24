/* 제작 크레딧 — 페이지 맨 아래에 붙는다.
   문구·날짜는 site-config.json 의 credit 에서만 관리한다(이 파일에는 날짜가 없다).
   발간호(issues/*.html)·발간 목록은 scripts/render_newsletter_issues.py 가 같은 값을 읽어 HTML에 바로 넣는다.
   스타일은 paper.css 의 .site-credit 하나를 공용으로 쓴다. */
(function () {
  var me = document.currentScript;
  var cfgUrl = new URL('site-config.json', (me && me.src) || location.href).href;
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function render(c) {
    c = c || {};
    var by = c.by || '지음웍스', url = c.url || 'https://jieumworks.com';
    var dom = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    var el = document.querySelector('.site-credit') || document.createElement('div');
    el.className = 'site-credit';
    el.innerHTML = '기획·제작 ' + esc(by) + ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">' +
      esc(dom) + '</a>' + (c.date ? ' · ' + esc(c.date) : '');
    if (!el.parentNode) document.body.appendChild(el);
  }
  function go() {
    var done = false;
    fetch(cfgUrl, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (cfg) { done = true; render(cfg && cfg.credit); })
      .catch(function () { if (!done) render(null); });   /* 설정을 못 읽어도(오프라인 등) 날짜 없이 표시 */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
