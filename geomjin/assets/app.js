/* 검진맵 — 공용 스크립트: 헤더/푸터 주입, 모바일 내비, 글자 크기, 유틸 */
(function () {
  var root = document.documentElement;
  try { var fs = localStorage.getItem('gm_fs'); if (fs) root.setAttribute('data-fs', fs); } catch (e) {}

  var NAV = [
    ['index.html', '홈'],
    ['yeoksa.html', '연혁 1953→2026'],
    ['beopryeong.html', '법령 체계'],
    ['gibonbeop.html', '건강검진기본법'],
    ['silsi-gijun.html', '실시기준 고시'],
    ['gaejeong.html', '개정 diff'],
    ['hangmok.html', '검진 항목·주기'],
    ['nae-geomjin.html', '내 검진 찾기'],
    ['daesang.html', '대상별 상세'],
    ['haeoe.html', '해외 가이드라인'],
    ['gigwan.html', '검진기관·B2B'],
    ['about.html', '원칙·출처']
  ];

  function here() { return location.pathname.split('/').pop() || 'index.html'; }

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
      '<span class="spacer"></span><span>법령·고시 기준일 2026-09 · 광고 없음</span>' +
      '</div></div>' +
      '<header class="site-header"><div class="nav-inner">' +
      '<a class="brand" href="index.html"><span class="mark">검</span>검진맵 <span class="tag">건강검진 법·제도·항목 한눈에</span></a>' +
      '<button class="nav-toggle" aria-label="메뉴" aria-expanded="false">☰ 메뉴</button>' +
      '<nav class="site-nav">' + links + '</nav>' +
      '</div></header>';
  }

  function footer() {
    return '<footer class="site-footer"><div class="footer-inner">' +
      '<h4>검진맵 · 건강검진 종합 플랫폼</h4>' +
      '<div class="footer-links">' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + '</a>'; }).join('') + '<a href="../">← 메인 사이트</a></div>' +
      '<div class="footer-note">본 사이트는 법제처 국가법령정보센터, 보건복지부·질병관리청·국민건강보험공단 공식 자료와 각국 정부·전문기관 가이드라인 원문을 정리한 일반 정보입니다. 법령·고시·검진 항목은 매년 바뀌므로 실제 검진·청구·행정 처리 전 원문과 공단 안내를 확인하세요. 진단·치료 권고가 아닙니다.' +
      '<br>© 2026 검진맵 · 정리: 서순려 · 문의: soonryu74@gmail.com</div>' +
      '</div></footer>';
  }

  function mount() {
    var h = document.getElementById('site-header'); if (h) h.innerHTML = header();
    var f = document.getElementById('site-footer'); if (f) f.innerHTML = footer();
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
        try { localStorage.setItem('gm_fs', v); } catch (e) {}
        document.querySelectorAll('.a11y-btn[data-fs]').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.GM = {
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },
    law: function (name, jo) {
      // 국가법령정보센터 검색 링크 (조문 포함)
      var q = encodeURIComponent(name + (jo ? ' ' + jo : ''));
      return 'https://www.law.go.kr/LSW/lsSc.do?menuId=1&query=' + q;
    },
    kindLabel: { law: '법률', sys: '제도', item: '항목', cancer: '암검진', gosi: '고시' },
    kindClass: { law: 'navy', sys: 'teal', item: 'green', cancer: 'purple', gosi: 'amber' }
  };
})();
