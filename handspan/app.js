/* 한뼘(HANDSPAN) — 모든 화면이 함께 쓰는 작은 도구들
   의존성 없음. JSON 읽기, 돈 표시, mm→등급, 표지 그리기, 장바구니(localStorage). */
window.HS = (function () {
  'use strict';

  /* 이 파일이 있는 폴더. studio/ 처럼 한 단계 아래 화면도 같은 데이터를 쓴다. */
  var base = (function () {
    var s = document.currentScript, src = s ? (s.getAttribute('src') || '') : '';
    return src.replace(/app\.js(\?.*)?$/, '');
  })();

  /* ── 규격 ──────────────────────────────────────────── */
  var TIERS = [
    { key: 'kong',   name: '콩', en: 'S', max: 76,  note: '豆本·MBS 규격' },
    { key: 'son',    name: '손', en: 'M', max: 148, note: '손바닥책' },
    { key: 'ppyeom', name: '뼘', en: 'L', max: 190, note: '한 뼘' }
  ];
  var LIMIT_MM = 190;
  function longEdge(w, h) { return Math.max(Number(w) || 0, Number(h) || 0); }
  function tierOf(w, h) {
    var L = longEdge(w, h);
    if (L <= 0) return null;
    for (var i = 0; i < TIERS.length; i++) if (L <= TIERS[i].max) return TIERS[i];
    return null;  // 한 뼘을 넘는다
  }
  function tierBadge(w, h) {
    var t = tierOf(w, h);
    if (!t) return '<span class="badge" style="color:var(--accent-dk)">입점 불가</span>';
    return '<span class="badge tier-' + t.key + '">' + t.name + '</span>';
  }

  var FLAG = { KR: '🇰🇷', JP: '🇯🇵', TW: '🇹🇼', US: '🇺🇸', DE: '🇩🇪', HK: '🇭🇰', GB: '🇬🇧' };
  var COUNTRY = { KR: '한국', JP: '일본', TW: '대만', US: '미국', DE: '독일', HK: '홍콩', GB: '영국' };
  var GENRES = ['시', '짧은 소설', '에세이', '그림', '사진', '레시피', '지도', '언어', '아이', '신앙', '굿즈'];
  var METHODS = ['수제', '소량 인쇄', 'POD', '디지털'];

  /* ── 수수료·배송 (기획안 7·9절의 숫자. 바뀌면 여기만 고친다) ── */
  var FEE = { A: 0.15, B: 0.12 };
  var TRACK_A_DISCOUNT_CAP = 0.15;   // 도서정가제 상한(할인 10% + 혜택 5%)
  var TRACK_A_PRICE_DISCOUNT = 0.10; // 가격 할인분
  var FREE_SHIP_QTY = 3;             // 같은 작가 3권부터 무료배송
  var SHIPPING = [
    { key: 'jundeunggi', name: '우체국 준등기 (우편함)', fee: 1800, zone: 'KR', note: '기본. 200g, 우편함 투함' },
    { key: 'cu',         name: 'CU 알뜰택배',             fee: 1800, zone: 'KR', note: '편의점 수령' },
    { key: 'gs25',       name: 'GS25 반값택배',           fee: 1900, zone: 'KR', note: '편의점 수령' },
    { key: 'deunggi',    name: '등기소포',                 fee: 4000, zone: 'KR', note: '집까지, 추적' },
    { key: 'jp',         name: '일본 K-Packet 100g',      fee: 4550, zone: 'JP' },
    { key: 'tw',         name: '대만 K-Packet 100g',      fee: 4330, zone: 'TW' },
    { key: 'hk',         name: '홍콩 K-Packet 100g',      fee: 4160, zone: 'HK' },
    { key: 'us',         name: '미국 K-Packet 100g',      fee: 8090, zone: 'US', note: '관세 대납 수수료 별도 (2026.7 우편 de minimis 정지)' }
  ];
  var OPTIONS = { card: 1000 }; // 손글씨 카드 +1,000원. 책갈피는 무료.

  /* ── 돈 ────────────────────────────────────────────── */
  function won(n) { return Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원'; }
  function money(amount, cur) {
    var n = Number(amount) || 0;
    if (cur === 'JPY') return '¥' + n.toLocaleString('ja-JP');
    if (cur === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (cur === 'EUR') return '€' + n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (cur === 'TWD') return 'NT$' + n.toLocaleString('en-US');
    return won(n);
  }
  /* 판매가(원). 트랙 A는 정가에서 10% 할인한 값을 판매가로 본다. */
  function sellPrice(book) {
    if (book.track === 'A') return Math.round(book.price_krw * (1 - TRACK_A_PRICE_DISCOUNT) / 10) * 10;
    return book.price_krw;
  }
  function priceHTML(book) {
    if (book.currency && book.currency !== 'KRW') {
      return money(book.price, book.currency) + ' <span class="eq">≈ ' + won(book.krw_equiv || book.price_krw) + '</span>';
    }
    if (book.track === 'A') {
      return won(sellPrice(book)) + ' <span class="eq">정가 ' + won(book.price_krw) + '</span>';
    }
    return won(book.price_krw);
  }

  /* ── 데이터 ─────────────────────────────────────────── */
  var cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    cache[name] = fetch(base + 'data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name + '.json을 읽지 못했습니다 (' + r.status + ')');
      return r.json();
    });
    return cache[name];
  }
  /* books + artists를 한 번에. 각 책에 .artist를 붙여 준다. */
  function loadCatalog() {
    return Promise.all([load('books'), load('artists')]).then(function (r) {
      var books = r[0], artists = r[1], byId = {};
      artists.forEach(function (a) { byId[a.id] = a; });
      books.forEach(function (b) {
        b.artist = byId[b.author_id] || { name: '작가 미상', country: b.country };
        b.tier = tierOf(b.width_mm, b.height_mm);
        b.long_mm = longEdge(b.width_mm, b.height_mm);
      });
      return { books: books, artists: artists, artistById: byId };
    });
  }

  /* ── HTML 도우미 ────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text; el.className = 'msg show ' + (kind || 'ok');
  }

  /* 표지 색이 어두우면 글자를 밝게 */
  function isDark(hex) {
    var h = (hex || '#cccccc').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
  }
  /* CSS로 그리는 표지. mm 단위 실제 비율을 지킨다.
     scale을 주지 않으면 CSS 변수 --mm(화면 폭에 따라 1~1.35px)을 쓴다. */
  function coverHTML(book, opt) {
    opt = opt || {};
    var w = book.width_mm, h = book.height_mm;
    var size = opt.scale
      ? 'width:' + (w * opt.scale) + 'px;height:' + (h * opt.scale) + 'px;'
      : 'width:calc(var(--mm) * ' + w + ');height:calc(var(--mm) * ' + h + ');';
    var color = opt.color || book.cover_color;
    var fs = Math.max(7, Math.min(16, Math.round(w * (opt.scale || 1.2) / 7)));
    var showText = w * (opt.scale || 1) >= 44;
    var cls = 'cover ' + (isDark(color) ? 'light' : 'dark') + (book.digital ? ' digital' : '') + (opt.cls ? ' ' + opt.cls : '');
    var inner = showText
      ? '<span class="t" style="font-size:' + fs + 'px">' + esc(book.title) + '</span>' +
        (h * (opt.scale || 1) >= 70 ? '<span class="a">' + esc(book.artist ? book.artist.name : '') + '</span>' : '')
      : '';
    var tag = opt.href ? 'a' : 'div';
    return '<' + tag + (opt.href ? ' href="' + esc(opt.href) + '"' : '') + ' class="' + cls + '" style="' + size + 'background:' + esc(color) + '" title="' + esc(book.title) + ' · ' + w + '×' + h + 'mm">' + inner + '</' + tag + '>';
  }
  /* 진열용 카드 */
  function cardHTML(book) {
    var href = base + 'book.html?id=' + encodeURIComponent(book.id);
    var a = book.artist || {};
    var soldOut = !book.digital && book.stock <= 0;
    return '<div class="book-card">' +
      '<div class="stand">' + coverHTML(book, { href: href }) + '</div>' +
      '<div class="meta">' +
        '<a class="title" href="' + href + '">' + esc(book.title) + '</a>' +
        '<div class="author">' + esc(a.name || '') + ' <span class="muted">' + (FLAG[book.country] || '') + '</span></div>' +
        '<div class="size">' + tierBadge(book.width_mm, book.height_mm) + '<span>' + book.width_mm + '×' + book.height_mm + 'mm</span>' +
          (book.track === 'A' ? '<span class="badge isbn">ISBN</span>' : '') +
          (book.digital ? '<span class="badge digital">디지털</span>' : '') +
          (book.edition ? '<span class="badge edition">' + esc(book.edition) + '</span>' : '') + '</div>' +
        '<div class="price">' + priceHTML(book) + '</div>' +
        (soldOut ? '<div class="sold">품절</div>' : (book.stock <= 3 && !book.digital ? '<div class="sold">' + book.stock + '권 남음</div>' : '')) +
      '</div></div>';
  }

  /* ── 장바구니 (브라우저에만 저장. 결제는 다음 단계) ───────── */
  var CART_KEY = 'handspan-cart';
  function cartGet() {
    try { var v = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function cartSet(lines) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch (e) { /* 사생활 보호 모드 등 */ }
    updateCartCount();
  }
  function cartAdd(line) {
    var lines = cartGet();
    var key = JSON.stringify([line.book_id, line.cover, line.bookmark, line.card, line.extra]);
    var hit = lines.filter(function (l) { return JSON.stringify([l.book_id, l.cover, l.bookmark, l.card, l.extra]) === key; })[0];
    if (hit) hit.qty += line.qty; else lines.push(line);
    cartSet(lines);
    return lines;
  }
  function cartRemove(i) { var lines = cartGet(); lines.splice(i, 1); cartSet(lines); return lines; }
  function cartClear() { cartSet([]); }
  function cartCount() { return cartGet().reduce(function (n, l) { return n + (l.qty || 0) + (l.extra ? (l.qty || 0) : 0); }, 0); }
  function updateCartCount() {
    $$('[data-cart-count]').forEach(function (el) { var n = cartCount(); el.textContent = n; el.style.display = n ? '' : 'none'; });
  }
  /* 다른 폼(선서·福袋·입점 신청)이 저장할 때 쓰는 작은 보관함 */
  function stash(key, value) {
    try { var all = JSON.parse(localStorage.getItem(key) || '[]'); all.push(value); localStorage.setItem(key, JSON.stringify(all)); return true; }
    catch (e) { return false; }
  }

  /* ── 머리말·꼬리말 ───────────────────────────────────── */
  var NAV = [
    { href: 'shop.html', label: '책 보기', key: 'shop' },
    { href: 'index.html#weekly', label: '이번 주 한 권', key: 'weekly' },
    { href: 'box.html#pick', label: '골라주는 세 권', key: 'pick' },
    { href: 'box.html#fukubukuro', label: '福袋', key: 'fuku' },
    { href: 'join.html', label: '작가로 입점', key: 'join' },
    { href: 'studio/index.html', label: '로그인', key: 'login' }
  ];
  function mountHeader(active) {
    var el = $('#site-top'); if (!el) return;
    el.className = 'site-top';
    el.innerHTML = '<div class="in">' +
      '<a class="wordmark" href="' + base + 'index.html"><span class="ko">한뼘</span><span class="en">HANDSPAN</span></a>' +
      '<nav class="site-nav" aria-label="주요 메뉴">' +
        NAV.map(function (n) { return '<a href="' + base + n.href + '"' + (n.key === active ? ' class="on"' : '') + '>' + n.label + '</a>'; }).join('') +
        '<a class="cart' + (active === 'cart' ? ' on' : '') + '" href="' + base + 'cart.html">장바구니<span class="n" data-cart-count style="display:none">0</span></a>' +
      '</nav></div>';
    updateCartCount();
  }
  function mountFooter() {
    var el = $('#site-foot'); if (!el) return;
    el.className = 'site-foot';
    el.innerHTML = '<div class="in">' +
      '<div><div class="wordmark" style="margin-bottom:8px"><span class="ko" style="font-size:20px">한뼘</span><span class="en">HANDSPAN</span></div>' +
        '<p>한 뼘(장변 190mm) 안에 들어오는 책만 파는 곳입니다. 수수료·정산일·보류 사유를 전부 공개합니다.</p>' +
        '<div class="placeholder">사업자 정보 미기재 — 아직 통신판매업 신고 전인 시안입니다.<br>' +
        '상호 · 대표 · 사업자등록번호 · 통신판매업 신고번호 · 주소 · 연락처: 오픈 전 기재 예정</div></div>' +
      '<div><h4>통신판매중개자 고지</h4>' +
        '<p>한뼘은 통신판매중개자이며 통신판매의 당사자가 아닙니다. 책의 주문·배송·환불 의무는 각 작가에게 있고, 작가의 신원 정보는 결제 전 화면에 표시됩니다(전자상거래법 20조, 2026.7.21 개정 반영 예정).</p>' +
        '<p>청약철회 7일. 디지털 책과 개봉한 福袋는 철회가 제한될 수 있으며, 상품 화면에 미리 적습니다.</p></div>' +
      '<div><h4>언어</h4><div class="lang" role="group" aria-label="언어 선택">' +
        '<button type="button" class="on" data-lang="ko">한국어</button><button type="button" data-lang="en">English</button><button type="button" data-lang="ja">日本語</button></div>' +
        '<p style="margin-top:8px">영어·일본어 화면은 2단계에서 엽니다. 지금은 한국어만 보입니다.</p>' +
        '<p style="margin-top:12px"><a href="' + base + 'join.html">작가로 입점</a> · <a href="' + base + 'studio/index.html">작가 스튜디오</a> · <a href="' + base + 'README.md">이 시안에 대해</a></p></div>' +
      '</div>';
    $$('.site-foot .lang button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.site-foot .lang button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (b.dataset.lang !== 'ko') alert('이 언어 화면은 아직 준비 중입니다. 지금은 한국어로 보여 드립니다.');
      });
    });
  }
  function mount(active) { mountHeader(active); mountFooter(); }

  return {
    base: base, TIERS: TIERS, LIMIT_MM: LIMIT_MM, FLAG: FLAG, COUNTRY: COUNTRY, GENRES: GENRES, METHODS: METHODS,
    FEE: FEE, TRACK_A_DISCOUNT_CAP: TRACK_A_DISCOUNT_CAP, TRACK_A_PRICE_DISCOUNT: TRACK_A_PRICE_DISCOUNT,
    FREE_SHIP_QTY: FREE_SHIP_QTY, SHIPPING: SHIPPING, OPTIONS: OPTIONS,
    tierOf: tierOf, tierBadge: tierBadge, longEdge: longEdge,
    won: won, money: money, sellPrice: sellPrice, priceHTML: priceHTML,
    load: load, loadCatalog: loadCatalog,
    esc: esc, $: $, $$: $$, qs: qs, say: say, isDark: isDark, coverHTML: coverHTML, cardHTML: cardHTML,
    cart: { get: cartGet, set: cartSet, add: cartAdd, remove: cartRemove, clear: cartClear, count: cartCount, refresh: updateCartCount },
    stash: stash, mount: mount
  };
})();
