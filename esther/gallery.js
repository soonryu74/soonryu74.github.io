/* ───────── 갤러리 액자 목록 (한/영 공용) ─────────
   새 작가나 전시를 추가하려면 아래에 한 덩어리씩 넣으면 됩니다.
   type : 'artist'(작가) 또는 'show'(전시)
   img  : 작품 사진 주소 (비워 두면 붓결 그림 위에 glyph 글자로 표시)
   glyph: 사진이 없을 때 액자 안 글자,  small: true 면 영문용 작은 글씨
   link : 누르면 열릴 홈페이지 / 기사 / 이력 주소                         */
const WORKS = [
  { type:'artist', glyph:'息', link:'https://www.ohjiyoon.com/',
    ko:{ name:'오지윤 OH JIYOON', note:'현대미술가 · 아트 매니지먼트' },
    en:{ name:'OH JIYOON', note:'Contemporary Artist · Art Management' } },
  { type:'show', glyph:'尊<br>嚴', link:'https://www.businesskorea.co.kr/news/articleView.html?idxno=277796',
    ko:{ name:'尊嚴 — 숨결의 정수', note:'2026 · 하나은행 PLACE 1, 서울' },
    en:{ name:'尊嚴 — l\'essence du souffle', note:'2026 · Hana Bank PLACE 1, Seoul' } },
  { type:'show', glyph:'Blue<br>Ocean', small:true, link:'https://www.heraldk.com/article/2026050517292658262',
    ko:{ name:'61회 베니스 비엔날레', note:'2026 · 탄자니아 국가관 · DIGNITY-Blue Ocean' },
    en:{ name:'61st Venice Biennale', note:'2026 · Tanzania Pavilion · DIGNITY-Blue Ocean' } },
  { type:'show', glyph:'DIGNITY', small:true, link:'https://www.ohjiyoon.com/',
    ko:{ name:'DIGNITY 미디어월', note:'2026 · 신세계백화점 본점 외벽' },
    en:{ name:'DIGNITY Media Wall', note:'2026 · Shinsegae Main Store Facade' } },
  { type:'show', glyph:'Venice<br>2024', small:true, link:'https://www.ohjiyoon.com/',
    ko:{ name:'60회 베니스 비엔날레', note:'2024 · 방글라데시 국가관' },
    en:{ name:'60th Venice Biennale', note:'2024 · Bangladesh Pavilion' } },
];

(() => {
  const L = document.documentElement.lang === 'en' ? 'en' : 'ko';
  const T = {
    ko:{ view:'View Story →', next:['다음 작가의<br>자리입니다','Next Artist','함께할 이야기를 기다립니다'], contact:'Contact →' },
    en:{ view:'View Story →', next:['A place for<br>the next artist','Next Artist','Awaiting the next story'], contact:'Contact →' },
  }[L];

  const art = w => w.img
    ? `<div class="art"><img src="${w.img}" alt="${w[L].name}" loading="lazy"></div>`
    : `<div class="art stroke"><span class="glyph${w.small ? ' sm' : ''}">${w.glyph}</span></div>`;

  document.getElementById('frames').innerHTML = WORKS.map(w => `
    <a class="piece rv" data-type="${w.type}" href="${w.link}" target="_blank" rel="noopener">
      <div class="frame"><div class="mat">${art(w)}</div></div>
      <div class="plaque"><b>${w[L].name}</b><span>${w[L].note}</span></div>
      <span class="go en">${T.view}</span>
    </a>`).join('') + `
    <a class="piece rv" data-type="all" href="#contact">
      <div class="frame"><div class="mat"><div class="art empty"><span class="glyph">${T.next[0]}</span></div></div></div>
      <div class="plaque"><b>${T.next[1]}</b><span>${T.next[2]}</span></div>
      <span class="go en">${T.contact}</span>
    </a>`;

  document.getElementById('filters').addEventListener('click', e => {
    const f = e.target.dataset.f; if (!f) return;
    document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('on', b === e.target));
    document.querySelectorAll('.piece').forEach(p =>
      p.classList.toggle('hide', f !== 'all' && p.dataset.type !== f && p.dataset.type !== 'all'));
  });

  /* 사진이 아직 없으면 금색 '朴' 모노그램으로 대신 */
  const ph = document.querySelector('.portrait .ph');
  const img = ph && ph.querySelector('img');
  if (img) {
    const fail = () => ph.classList.add('fallback');
    if (img.complete && !img.naturalWidth) fail(); else img.addEventListener('error', fail);
  }

  const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  const nav = document.getElementById('nav');
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 60), { passive:true });
})();

/* ───────── 의뢰 버튼 → 문의서 자동 선택, 문의 내용 복사 후 인스타그램 DM 열기 ───────── */
(() => {
  const form = document.getElementById('inquiry'); if (!form) return;
  const en = document.documentElement.lang === 'en';
  document.querySelectorAll('[data-ask]').forEach(b => b.addEventListener('click', () => {
    form.kind.value = b.dataset.ask;
    document.getElementById('contact').scrollIntoView({ behavior:'smooth' });
    setTimeout(() => form.name.focus({ preventScroll:true }), 700);
  }));
  const toast = document.getElementById('toast');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = form;
    const text = en
      ? `[Inquiry] ${f.kind.value}\nName: ${f.name.value}\nContact: ${f.reach.value}\n\n${f.msg.value}`
      : `[문의] ${f.kind.value}\n성함: ${f.name.value}\n연락처: ${f.reach.value}\n\n${f.msg.value}`;
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    toast.textContent = en ? 'Copied — paste it into the Instagram message.' : '문의 내용이 복사되었습니다. 인스타그램 메시지에 붙여 넣어 주세요.';
    toast.classList.add('on'); setTimeout(() => toast.classList.remove('on'), 3500);
    setTimeout(() => window.open('https://ig.me/m/artist_artdirector_park', '_blank', 'noopener'), 900);
  });
})();
