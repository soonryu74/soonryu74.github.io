/* 아트셀라 — 공통 동작 (자료 읽기·머리말·작품 카드) */
const ART = (function () {
  let cache = null;

  async function load() {
    if (cache) return cache;
    const [artists, works, exhibitions] = await Promise.all([
      fetch('data/artists.json').then(r => r.json()),
      fetch('data/works.json').then(r => r.json()),
      fetch('data/exhibitions.json').then(r => r.json())
    ]);
    const byArtist = Object.fromEntries(artists.artists.map(a => [a.id, a]));
    const byWork = Object.fromEntries(works.works.map(w => [w.id, w]));
    cache = { artists: artists.artists, works: works.works, exhibitions: exhibitions.exhibitions, byArtist, byWork };
    return cache;
  }

  const NAV = [
    ['index.html', '홈'],
    ['exhibition.html', '전시'],
    ['gallery.html', '작품'],
    ['artists.html', '작가'],
    ['about.html', '소개·문의']
  ];

  function header(current) {
    const links = NAV.map(([href, label]) =>
      `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('');
    return `<header class="site-header"><div class="nav-inner">
      <a class="brand" href="index.html"><span class="mark">아트셀라</span><span class="en">ARTSELAH</span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="sitenav">메뉴</button>
      <nav class="site-nav" id="sitenav">${links}</nav>
    </div></header>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="wrap cols">
      <div>
        <h4>아트셀라 ARTSELAH</h4>
        <p>작가의 작업실과 보는 사람 사이를 잇는 온라인 전시 공간입니다.</p>
        <p>작품 문의는 작품 상세 화면의 「문의하기」로 받습니다.</p>
      </div>
      <div>
        <h4>관람</h4>
        <p><a href="exhibition.html">전시 일정</a></p>
        <p><a href="gallery.html">작품 아카이브</a></p>
        <p><a href="artists.html">참여 작가</a></p>
      </div>
      <div>
        <h4>안내</h4>
        <p>모든 작품은 작가의 동의를 받아 게시합니다.</p>
        <p>작품 사진의 무단 사용을 금합니다.</p>
        <p class="credit">기획·제작 — 지음 <span style="letter-spacing:.18em">JIEUM</span> · 2026.09</p>
      </div>
    </div></footer>`;
  }

  function chrome(current) {
    document.body.insertAdjacentHTML('afterbegin', header(current));
    document.body.insertAdjacentHTML('beforeend', footer());
    const btn = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-nav');
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  /* 사진이 있으면 사진, 없으면 자리그림 */
  function visual(work, artist) {
    return work.image
      ? `<img src="${work.image}" alt="${work.title}" loading="lazy">`
      : artSVG(work, artist);
  }

  function won(n) {
    if (!n) return null;
    return n.toLocaleString('ko-KR') + '원';
  }

  function priceLabel(work) {
    if (work.status === '판매완료') return '판매완료';
    if (work.status === '비매품') return '비매품';
    if (!work.price) return '가격 문의';
    return won(work.price);
  }

  function statusBadge(work) {
    if (work.status === '전시중') return '<span class="badge on">전시중</span>';
    if (work.status === '판매완료') return '<span class="badge sold">판매완료</span>';
    if (work.status === '비매품') return '<span class="badge">비매품</span>';
    return '';
  }

  function card(work, artist) {
    return `<a class="card" href="work.html?id=${work.id}">
      <span class="frame"><span class="canvas">${visual(work, artist)}</span></span>
      <span class="meta">
        <span class="wt">${work.title} ${statusBadge(work)}</span>
        <span class="wa">${artist.name} · ${work.year}</span>
        <span class="wp">${priceLabel(work)}</span>
      </span>
    </a>`;
  }

  function param(key) {
    return new URLSearchParams(location.search).get(key);
  }

  function period(e) {
    const f = d => d.slice(0, 10).replace(/-/g, '.').replace(/^20/, '');
    return f(e.from) + ' – ' + f(e.to);
  }

  return { load, chrome, card, visual, won, priceLabel, statusBadge, param, period };
})();
