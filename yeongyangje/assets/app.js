/* 근거영양 — 공용 스크립트: 헤더/푸터 주입, 모바일 내비, 글자 크기 */
(function () {
  var root = document.documentElement;
  try { var fs = localStorage.getItem('ebn_fs'); if (fs) root.setAttribute('data-fs', fs); } catch (e) {}

  var NAV = [
    ['index.html', '홈'],
    ['gyeollon.html', '핵심 결론'],
    ['seongbun.html', '성분별 근거'],
    ['yeongu.html', '연구 DB'],
    ['chucheon.html', '내게 맞는 영양제'],
    ['jepum.html', '제품 고르는 법'],
    ['rnd.html', 'R&D·연구'],
    ['about.html', '원칙·소개']
  ];

  function here() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function header() {
    var cur = here();
    var links = NAV.map(function (n) {
      return '<a href="' + n[0] + '"' + (n[0] === cur ? ' class="on"' : '') + '>' + n[1] + '</a>';
    }).join('');
    return '<div class="a11y-bar"><div class="a11y-inner">' +
      '<span>글자 크기</span>' +
      '<button class="a11y-btn" data-fs="">보통</button>' +
      '<button class="a11y-btn" data-fs="lg">크게</button>' +
      '<button class="a11y-btn" data-fs="xl">더 크게</button>' +
      '<span class="spacer"></span><span>근거 갱신 2026-09 · 광고·협찬 없음</span>' +
      '</div></div>' +
      '<header class="site-header"><div class="nav-inner">' +
      '<a class="brand" href="index.html"><span class="mark">EB</span>근거영양 <span class="tag">연구로 고르는 영양제</span></a>' +
      '<button class="nav-toggle" aria-label="메뉴" aria-expanded="false">☰ 메뉴</button>' +
      '<nav class="site-nav">' + links + '</nav>' +
      '</div></header>';
  }

  function footer() {
    return '<footer class="site-footer"><div class="footer-inner">' +
      '<h4>근거영양 · Evidence-Based Nutrition Lab</h4>' +
      '<div class="footer-links">' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + '</a>'; }).join('') + '</div>' +
      '<div class="footer-note">본 사이트는 공개된 임상연구·공식 기관 자료를 정리한 일반 정보이며 진단·처방이 아닙니다. 질환이 있거나 약을 복용 중이면 영양제 시작 전에 의사·약사와 상의하세요. ' +
      '인용 연구는 각 항목의 원문 링크(PubMed·학술지·NIH·식약처)를 통해 직접 확인할 수 있습니다. ' +
      '이해상충: 현재 제품 판매·광고·협찬이 없으며, 향후 판매를 시작하면 해당 페이지에 명시합니다. © 2026 근거영양.</div>' +
      '</div></footer>';
  }

  function mount() {
    var h = document.getElementById('site-header');
    var f = document.getElementById('site-footer');
    if (h) h.outerHTML = header();
    if (f) f.outerHTML = footer();

    var tg = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.site-nav');
    if (tg && nav) tg.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    var cur = root.getAttribute('data-fs') || '';
    document.querySelectorAll('.a11y-btn[data-fs]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-fs') === cur);
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-fs');
        if (v) root.setAttribute('data-fs', v); else root.removeAttribute('data-fs');
        try { localStorage.setItem('ebn_fs', v); } catch (e) {}
        document.querySelectorAll('.a11y-btn[data-fs]').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  // 공용 유틸
  window.EBN = {
    gradeLabel: { A: 'A · 대규모 RCT 다수 일관', B: 'B · RCT 또는 메타분석 근거', C: 'C · 관찰연구·소규모·혼재', D: 'D · 효과 없음(잘 설계된 연구)', X: 'X · 유해 근거' },
    verdictLabel: { rec: '권장', cond: '조건부 권장', opt: '선택(효과 작음)', no: '비권장(효과 없음)', avoid: '피하세요(유해)' },
    verdictClass: { rec: 'rec', cond: 'cond', opt: 'opt', no: 'no', avoid: 'avoid' },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  };
})();
