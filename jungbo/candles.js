/* 중보기도 나눔터 — 화면 뒤 장면 (촛불 탁자 · 기도굴 · 성전)
   html[data-scene] = candles | grotto | temple. 밝은 모드(data-sky=day)면 숨긴다.
   정지 요소는 한 번만 그리고(still), 흔들리는 불빛만 매 장 다시 그린다. 화면이 안 보이면 멈춘다. */
(function () {
  'use strict';
  var cv = document.getElementById('candles'); if (!cv) return;
  var ctx = cv.getContext('2d', { alpha: false });
  var still = document.createElement('canvas'), sctx = still.getContext('2d');
  var layer = document.createElement('canvas'), lctx = layer.getContext('2d');   // 성전 창문처럼 밝기만 바꿔 겹치는 층
  var W = 0, H = 0, DPR = 1, near = [], far = [], rays = [], raf = 0, last = 0, on = false, scene = 'candles', phone = false;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  function currentScene() { var s = document.documentElement.getAttribute('data-scene'); return s === 'grotto' || s === 'temple' ? s : 'candles'; }

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight; scene = currentScene(); phone = W < 700;
    [cv, still, layer].forEach(function (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    [ctx, sctx, lctx].forEach(function (g) { g.setTransform(DPR, 0, 0, DPR, 0, 0); });
    near = []; far = []; rays = [];
    if (scene === 'grotto') layoutGrotto(); else if (scene === 'temple') layoutTemple(); else layoutCandles();
    near.sort(function (a, b) { return a.y - b.y; });
    drawStill();
  }
  function mkCandle(x, y, s) { return { x: x, y: y, s: s, ph: rnd(0, 6.28), sp: rnd(0.9, 1.5), ph2: rnd(0, 6.28), sp2: rnd(3, 5), gust: 0, sway: 0 }; }

  /* ── 장면 1: 촛불 탁자 ─────────────────────────────── */
  function layoutCandles() {
    // 먼 초(보케): 위쪽 띠에 넓게 — 말씀 뒤로 빛망울이 떠 있다
    far = [];
    var nf = phone ? 26 : 60;
    for (var i = 0; i < nf; i++) {
      var d = Math.random();   // 0 = 아주 멀다
      far.push({ x: rnd(-10, W + 10), y: H * (0.06 + 0.42 * Math.pow(d, 1.3)), r: 4 + 13 * d, a: 0.14 + 0.42 * d,
        ph: rnd(0, 6.28), sp: rnd(0.6, 1.4), warm: rnd(0, 1) });
    }
    // 가까운 초(또렷): 아래쪽·양 옆에 크게, 서로 겹치지 않게
    near = [];
    var nn = phone ? 10 : 16, tries = 0;
    while (near.length < nn && tries++ < 600) {
      var t = Math.random();                       // 0 = 중간 거리, 1 = 아주 가깝다
      var s = (phone ? 0.75 : 0.9) + 1.0 * t;      // 크기 배율 (1 = 유리컵 폭 26px)
      var y = H * (0.50 + 0.48 * t), x = rnd(10, W - 10);
      // 휴대폰: 처음 4개는 위쪽 말씀 띠 양옆에 작게 — 글 뒤에 숨지 않고 보이는 초
      if (phone && near.length < 4) { s = rnd(0.5, 0.72); y = H * rnd(0.16, 0.46); x = near.length % 2 ? rnd(W * .78, W - 14) : rnd(14, W * .22); }
      // 가운데 글 기둥(최대 600px) 안은 피한다 — 큰 화면에서 글 뒤로 초가 숨지 않게
      if (!phone && Math.abs(x - W / 2) < 330) continue;
      var ok = true;
      for (var j = 0; j < near.length; j++) { var c = near[j]; if (Math.abs(c.x - x) < (c.s + s) * 22 && Math.abs(c.y - y) < (c.s + s) * 30) { ok = false; break; } }
      if (!ok) continue;
      near.push({ x: x, y: y, s: s, ph: rnd(0, 6.28), sp: rnd(0.9, 1.5), ph2: rnd(0, 6.28), sp2: rnd(3, 5), gust: 0, sway: 0 });
    }
  }
  function drawStillCandles(g) {
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#05090a'); bg.addColorStop(.5, '#070e0c'); bg.addColorStop(1, '#0a0906');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 탁자 수평선 근처의 아주 옅은 온기
    var warm = g.createRadialGradient(W / 2, H * .62, 0, W / 2, H * .62, Math.max(W, H) * .7);
    warm.addColorStop(0, 'rgba(120,70,20,.10)'); warm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = warm; g.fillRect(0, 0, W, H);
    near.forEach(function (c) {
      // 탁자에 비친 컵 (뒤집어서 옅게) → 그 위에 컵
      g.save(); g.translate(c.x, c.y); g.scale(1, -.9); g.globalAlpha = .22; drawGlass(g, 0, 0, c.s); g.restore();
      drawGlass(g, c.x, c.y, c.s);
    });
    // 가장자리 어둡게
    var v = g.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .25, W / 2, H * .5, Math.max(W, H) * .8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    }

  /* ── 장면 2: 기도굴 — 천장의 종유석, 안쪽으로 깊어지는 바위 터널, 촛불이 비추는 안쪽 벽과 바닥 ── */
  var cave = { cx: 0, cy: 0, R: 0 };
  function layoutGrotto() {
    cave.cx = W / 2; cave.cy = phone ? H * .40 : H * .52; cave.R = phone ? W * .42 : Math.min(W, H) * .30;
    // 촛불: 안쪽 바닥 선반 위 (휴대폰은 글 카드 바로 위, 큰 화면은 가운데 글 기둥 양옆)
    if (phone) {
      near.push(mkCandle(W * .30, cave.cy + cave.R * .42, 0.85)); near.push(mkCandle(W * .50, cave.cy + cave.R * .50, 0.95)); near.push(mkCandle(W * .70, cave.cy + cave.R * .42, 0.85));
      near.push(mkCandle(W * .12, cave.cy + cave.R * .95, 1.1)); near.push(mkCandle(W * .88, cave.cy + cave.R * .95, 1.1));
    } else {
      near.push(mkCandle(W / 2 - 90, cave.cy + cave.R * .55, 1.0)); near.push(mkCandle(W / 2, cave.cy + cave.R * .62, 1.1)); near.push(mkCandle(W / 2 + 90, cave.cy + cave.R * .55, 1.0));
      near.push(mkCandle(W * .14, H * .86, 1.5)); near.push(mkCandle(W * .24, H * .93, 1.3)); near.push(mkCandle(W * .86, H * .86, 1.5)); near.push(mkCandle(W * .76, H * .93, 1.3));
    }
  }
  // 울퉁불퉁한 고리 (바위 터널의 한 겹)
  function ringPath(g, cx, cy, R, ph, yStretch) {
    g.beginPath();
    for (var i = 0; i <= 72; i++) {
      var th = (i / 72) * Math.PI * 2;
      var r = R * (1 + .09 * Math.sin(3 * th + ph) + .06 * Math.sin(7 * th + ph * 1.7) + .035 * Math.sin(13 * th + ph * .6));
      var x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r * (yStretch || 1);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
  function stalactite(g, x, top, len, w, lit) {
    var tip = x + rnd(-w * .3, w * .3);
    var gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, lit ? 'rgba(92,68,42,1)' : 'rgba(40,30,20,1)'); gr.addColorStop(.55, 'rgba(26,19,13,1)'); gr.addColorStop(1, 'rgba(10,7,5,1)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - w / 2, top); g.quadraticCurveTo(x - w * .22, top + len * .55, tip, top + len); g.quadraticCurveTo(x + w * .22, top + len * .55, x + w / 2, top); g.closePath(); g.fill();
    // 끝에 맺힌 물방울 반짝
    if (Math.random() < .5) { g.fillStyle = 'rgba(200,190,170,.35)'; g.beginPath(); g.arc(tip, top + len + 2, 1.6, 0, Math.PI * 2); g.fill(); }
  }
  function drawStillGrotto(g) {
    g.fillStyle = '#050403'; g.fillRect(0, 0, W, H);
    var cx = cave.cx, cy = cave.cy, R = cave.R;
    // 터널: 바깥 고리부터 안쪽으로, 안쪽일수록 밝다 (멀리 보이는 안쪽 벽)
    var rings = 8, ph = rnd(0, 6.28);
    for (var i = rings; i >= 1; i--) {
      var k = i / rings;                                    // 1 = 바깥, 작을수록 안쪽
      var rr = R * (0.35 + 1.9 * k * k);
      var c = [Math.round(14 + 70 * (1 - k)), Math.round(10 + 52 * (1 - k)), Math.round(6 + 34 * (1 - k))];
      g.fillStyle = 'rgb(' + c.join(',') + ')';
      ringPath(g, cx, cy, rr, ph + i * .9, 1.05); g.fill();
      // 고리 가장자리: 빛을 받는 윗면(위쪽은 밝게, 아래쪽은 그늘)
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.stroke();
      g.save(); g.clip();
      var lit = g.createLinearGradient(0, cy - rr, 0, cy + rr);
      lit.addColorStop(0, 'rgba(0,0,0,.35)'); lit.addColorStop(.5, 'rgba(120,85,45,.10)'); lit.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = lit; g.fillRect(0, 0, W, H);
      g.restore();
    }
    // 바위 결: 고리를 따라 도는 짧은 줄무늬
    g.lineWidth = 1;
    for (var n = 0; n < (phone ? 500 : 1100); n++) {
      var th = rnd(0, 6.28), rad = rnd(R * .4, R * 2.6);
      var x = cx + Math.cos(th) * rad, y = cy + Math.sin(th) * rad * 1.05;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      var L = rnd(6, 26), dark = Math.random() < .6;
      g.strokeStyle = dark ? 'rgba(0,0,0,' + rnd(.15, .45).toFixed(2) + ')' : 'rgba(170,130,80,' + rnd(.05, .14).toFixed(2) + ')';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(th + 1.57) * L, y + Math.sin(th + 1.57) * L * .6); g.stroke();
    }
    // 갈라진 틈
    g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.6;
    for (var k2 = 0; k2 < (phone ? 10 : 22); k2++) {
      var sx = rnd(0, W), sy = rnd(0, H * .9); g.beginPath(); g.moveTo(sx, sy);
      for (var m = 0; m < 6; m++) { sx += rnd(-30, 30); sy += rnd(8, 40); g.lineTo(sx, sy); } g.stroke();
    }
    // 천장 종유석 (가운데 쪽이 길고 밝은 면이 빛을 받는다)
    var ns = phone ? 11 : 22;
    for (var t = 0; t < ns; t++) {
      var x2 = (t + rnd(.2, .8)) / ns * W, nearC = 1 - Math.min(1, Math.abs(x2 - cx) / (W * .5));
      stalactite(g, x2, -4, rnd(30, 70) + nearC * rnd(40, 120), rnd(18, 46), x2 < cx);
    }
    for (var t2 = 0; t2 < ns; t2++) stalactite(g, rnd(0, W), -4, rnd(14, 40), rnd(8, 18), Math.random() < .5);
    // 바닥: 촛불이 놓인 울퉁불퉁한 바위 바닥 (살짝 밝은 띠)
    var floorY = phone ? cy + R * .55 : cy + R * .7;
    var fg = g.createLinearGradient(0, floorY - 10, 0, floorY + 60);
    fg.addColorStop(0, 'rgba(90,66,40,0)'); fg.addColorStop(.3, 'rgba(90,66,40,.45)'); fg.addColorStop(1, 'rgba(30,22,14,0)');
    g.fillStyle = fg; g.fillRect(0, floorY - 10, W, 70);
    // 석순 (바닥 양옆)
    [[W * .06, 1], [W * .93, 0]].forEach(function (q) {
      g.save(); g.translate(q[0], H + 6); g.scale(1, -1); stalactite(g, 0, 0, rnd(60, 130), rnd(30, 60), q[1] === 1); g.restore();
    });
    // 촛불 (선반 위)
    near.forEach(function (c) {
      g.fillStyle = 'rgba(70,52,34,.95)'; g.beginPath(); g.ellipse(c.x, c.y + 2 * c.s, 26 * c.s, 5 * c.s, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(c.x, c.y); g.scale(1, -.45); g.globalAlpha = .16; drawGlass(g, 0, 0, c.s); g.restore();
      drawGlass(g, c.x, c.y, c.s);
    });
    // 가운데 안쪽 벽에 머무는 따뜻한 빛 (정지), 가장자리는 깊은 어둠
    var warm = g.createRadialGradient(cx, cy + R * .3, 0, cx, cy + R * .3, R * 1.6);
    warm.addColorStop(0, 'rgba(255,170,80,.22)'); warm.addColorStop(.5, 'rgba(255,150,60,.08)'); warm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = warm; g.fillRect(0, 0, W, H);
    var v = g.createRadialGradient(cx, cy, R * .6, cx, cy, Math.max(W, H) * .85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }

  /* ── 장면 3: 성전 — 스테인드글라스 창에서 빛줄기가 내려오고 제단 초가 켜져 있다 ── */
  var win = { x: 0, y: 0, w: 0, h: 0 };
  function layoutTemple() {
    win.w = phone ? W * .46 : Math.min(W * .3, 380); win.h = win.w * 1.7; win.x = W / 2 - win.w / 2; win.y = phone ? 24 : 30;
    var n = phone ? 5 : 7, cx = W / 2, spread = phone ? W * .36 : 260;
    for (var i = 0; i < n; i++) { var t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; near.push(mkCandle(cx + t * spread, H * (phone ? .93 : .9) - Math.abs(t) * 14, (phone ? .8 : 1.1) - Math.abs(t) * .2)); }
    for (var r = 0; r < (phone ? 5 : 8); r++) rays.push({ x: win.x + rnd(0, win.w), ang: rnd(-.5, .5), w: rnd(30, 90), ph: rnd(0, 6.28), sp: rnd(.15, .4), a: rnd(.05, .12) });
  }
  var PANES = ['#2b4c8c', '#8c2b3a', '#c48a2a', '#2f7a4f', '#5a3b8c', '#2b6d8c', '#b4532a'];
  function drawWindow(g, a) {
    g.save(); g.globalAlpha = a; g.translate(win.x, win.y);
    var w = win.w, h = win.h, r = w / 2;
    // 창틀 모양: 위가 둥근 아치
    g.beginPath(); g.moveTo(0, h); g.lineTo(0, r); g.arc(r, r, r, Math.PI, 0); g.lineTo(w, h); g.closePath(); g.clip();
    // 유리: 격자 조각, 각 조각 안쪽이 밝다
    var cols = 5, rows = 9, cw = w / cols, ch = h / rows;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var cross = (i === 2 && j >= 1 && j <= 6) || (j === 3 && i >= 1 && i <= 3);
      var col = cross ? '#e2b253' : PANES[(i * 3 + j * 5) % PANES.length];
      var gr = g.createRadialGradient(i * cw + cw / 2, j * ch + ch / 2, 0, i * cw + cw / 2, j * ch + ch / 2, cw);
      gr.addColorStop(0, col); gr.addColorStop(1, cross ? '#8a5f1a' : '#111');
      g.fillStyle = gr; g.fillRect(i * cw, j * ch, cw, ch);
    }
    // 납선
    g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 2.5;
    for (var ii = 1; ii < cols; ii++) { g.beginPath(); g.moveTo(ii * cw, 0); g.lineTo(ii * cw, h); g.stroke(); }
    for (var jj = 1; jj < rows; jj++) { g.beginPath(); g.moveTo(0, jj * ch); g.lineTo(w, jj * ch); g.stroke(); }
    g.restore();
    // 돌 창틀
    g.save(); g.translate(win.x, win.y); g.strokeStyle = 'rgba(190,170,130,.55)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, h); g.lineTo(0, r); g.arc(r, r, r, Math.PI, 0); g.lineTo(w, h); g.stroke(); g.restore();
  }
  function drawStillTemple(g) {
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070a14'); bg.addColorStop(.6, '#0a0d16'); bg.addColorStop(1, '#0d0b08');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 기둥 (양옆)
    [[W * .06, 1], [W * .94 - (phone ? 26 : 46), 1]].forEach(function (p) {
      var pw = phone ? 26 : 46, px = p[0];
      var pg = g.createLinearGradient(px, 0, px + pw, 0);
      pg.addColorStop(0, 'rgba(60,55,45,.0)'); pg.addColorStop(.3, 'rgba(120,108,86,.35)'); pg.addColorStop(.6, 'rgba(70,62,50,.35)'); pg.addColorStop(1, 'rgba(40,36,30,0)');
      g.fillStyle = pg; g.fillRect(px, 0, pw, H);
    });
    // 바닥(제단 앞 돌바닥)과 제단 선
    var fl = g.createLinearGradient(0, H * .82, 0, H);
    fl.addColorStop(0, 'rgba(60,50,38,0)'); fl.addColorStop(1, 'rgba(60,50,38,.35)');
    g.fillStyle = fl; g.fillRect(0, H * .82, W, H * .18);
    g.fillStyle = 'rgba(120,100,70,.35)'; g.fillRect(W * .15, near[0].y + 2, W * .7, 3);
    near.forEach(function (c) { g.save(); g.translate(c.x, c.y); g.scale(1, -.6); g.globalAlpha = .15; drawGlass(g, 0, 0, c.s); g.restore(); drawGlass(g, c.x, c.y, c.s); });
    // 창문은 따로 층에 그려 두고 매 장 밝기만 바꿔 얹는다
    lctx.clearRect(0, 0, W, H); drawWindow(lctx, 1);
    var v = g.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .3, W / 2, H * .5, Math.max(W, H) * .8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }

  function drawStill() {
    if (scene === 'grotto') drawStillGrotto(sctx); else if (scene === 'temple') drawStillTemple(sctx); else drawStillCandles(sctx);
  }

  // 유리컵 (낮은 원통) 안에 알루미늄 티라이트 — x,y 는 컵 바닥 가운데. 단위 = s 배율
  function drawGlass(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    var hw = 13, h = 20, ry = 4.5;
    // 탁자에 비친 컵 (바로 아래, 아래로 갈수록 사라진다)
    var rf = g.createLinearGradient(0, 0, 0, 26);
    rf.addColorStop(0, 'rgba(255,190,110,.20)'); rf.addColorStop(.5, 'rgba(255,170,90,.08)'); rf.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = rf; g.fillRect(-hw, 0, hw * 2, 26);
    // 유리 몸통 (투명, 안쪽 불빛)
    var body = g.createLinearGradient(0, -h, 0, 0);
    body.addColorStop(0, 'rgba(255,200,120,.06)'); body.addColorStop(1, 'rgba(255,150,60,.18)');
    g.fillStyle = body;
    g.beginPath(); g.moveTo(-hw, -h); g.lineTo(-hw, -3); g.quadraticCurveTo(-hw, 0, -hw + 3, 0); g.lineTo(hw - 3, 0); g.quadraticCurveTo(hw, 0, hw, -3); g.lineTo(hw, -h); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.20)'; g.lineWidth = .9; g.stroke();
    // 알루미늄 컵 (유리 안, 조금 작게)
    var aw = hw - 3, ah = 8;
    var al = g.createLinearGradient(-aw, 0, aw, 0);
    al.addColorStop(0, 'rgba(120,110,95,.9)'); al.addColorStop(.3, 'rgba(225,215,195,.95)'); al.addColorStop(.55, 'rgba(170,160,140,.95)'); al.addColorStop(1, 'rgba(95,88,76,.9)');
    g.fillStyle = al;
    g.beginPath(); g.moveTo(-aw, -ah - 3); g.lineTo(-aw, -3); g.ellipse(0, -3, aw, ry * .8, 0, Math.PI, 0, true); g.lineTo(aw, -ah - 3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(235,225,205,.95)'; g.beginPath(); g.ellipse(0, -ah - 3, aw, ry * .8, 0, 0, Math.PI * 2); g.fill();   // 컵 테두리
    // 밀랍: 불 가까운 가운데가 녹아 밝다
    var wax = g.createRadialGradient(0, -ah - 3, 0, 0, -ah - 3, aw);
    wax.addColorStop(0, 'rgba(255,240,200,1)'); wax.addColorStop(.6, 'rgba(255,215,150,.95)'); wax.addColorStop(1, 'rgba(240,195,130,.9)');
    g.fillStyle = wax; g.beginPath(); g.ellipse(0, -ah - 3, aw - 1.2, ry * .8 - .6, 0, 0, Math.PI * 2); g.fill();
    // 심지
    g.lineCap = 'round'; g.strokeStyle = '#2a1a0c'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, -ah - 3); g.lineTo(0, -13.5); g.stroke();
    // 유리 하이라이트
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-hw + 3, -h + 4); g.lineTo(-hw + 3, -4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.20)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hw - 3.2, -h + 5); g.lineTo(hw - 3.2, -5); g.stroke();
    // 유리 윗 테두리 (앞 반원 밝게, 뒤 반원 옅게)
    g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -h, hw, ry, 0, 0, Math.PI); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(0, -h, hw, ry, 0, Math.PI, Math.PI * 2); g.stroke();
    g.restore();
  }

  /* 불꽃 — 원점이 심지 끝. h: 높이, w: 반폭. 실제 촛불처럼 네 겹:
     ① 바깥 주황 테두리(옅음) ② 노란 불꽃 ③ 흰 심 ④ 심지 둘레 어두운 심 + 파란 밑불 */
  function tear(g, h, w, yTop, yBot) {   // 물방울 모양 (yBot 아래 끝, yTop 위 끝, 둘 다 음수 방향이 위)
    g.beginPath(); g.moveTo(0, yBot);
    g.bezierCurveTo(w * 1.5, yBot - (yBot - yTop) * .22, w * 1.1, yBot - (yBot - yTop) * .64, 0, yTop);
    g.bezierCurveTo(-w * 1.1, yBot - (yBot - yTop) * .64, -w * 1.5, yBot - (yBot - yTop) * .22, 0, yBot);
  }
  function drawFlame(g, h, w) {
    var a0 = g.globalAlpha;
    // ① 바깥 테두리: 옅은 주황, 조금 더 크다
    g.globalAlpha = a0 * .35;
    var o = g.createLinearGradient(0, 3, 0, -h * 1.08);
    o.addColorStop(0, 'rgba(255,90,20,.6)'); o.addColorStop(.5, 'rgba(255,140,40,.7)'); o.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = o; tear(g, h, w * 1.22, -h * 1.08, 3); g.fill();
    // ② 노란 불꽃
    g.globalAlpha = a0;
    var f = g.createLinearGradient(0, 2, 0, -h);
    f.addColorStop(0, 'rgba(255,120,30,.9)'); f.addColorStop(.25, 'rgba(255,170,45,1)'); f.addColorStop(.6, 'rgba(255,215,95,1)'); f.addColorStop(.9, 'rgba(255,235,160,1)'); f.addColorStop(1, 'rgba(255,200,80,.5)');
    g.fillStyle = f; tear(g, h, w, -h, 2); g.fill();
    // ③ 흰 심 (가운데, 위로 길게)
    var c = g.createLinearGradient(0, 0, 0, -h * .72);
    c.addColorStop(0, 'rgba(255,245,210,0)'); c.addColorStop(.35, 'rgba(255,252,235,.95)'); c.addColorStop(.8, 'rgba(255,255,250,.9)'); c.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = c; tear(g, h, w * .5, -h * .74, -h * .05); g.fill();
    // ④ 심지 둘레 어두운 심 (불꽃 아래 가운데, 반투명 갈색)
    g.globalAlpha = a0 * .55;
    var d = g.createLinearGradient(0, 1, 0, -h * .34);
    d.addColorStop(0, 'rgba(90,40,10,.9)'); d.addColorStop(1, 'rgba(120,60,20,0)');
    g.fillStyle = d; tear(g, h, w * .36, -h * .34, 1); g.fill();
    // 파란 밑불
    g.globalAlpha = a0 * .7; g.fillStyle = 'rgba(90,140,255,.9)';
    g.beginPath(); g.ellipse(0, 0, w * .55, h * .07, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = a0;
  }

  function drawNearCandles(t, lightScale) {
    var LS = lightScale || 1;
    ctx.globalCompositeOperation = 'lighter';
    near.forEach(function (c) {
      var breath = .5 + .5 * Math.sin(t * c.sp + c.ph);
      var q = Math.sin(t * c.sp2 * 2.1 + c.ph2) * Math.sin(t * c.sp2 * .7 + c.ph);
      if (Math.random() < .01) c.gust = rnd(-1, 1);
      c.gust *= .92;
      c.sway += ((q * .06 + c.gust * .12) - c.sway) * .3;
      var k = .8 + .2 * breath + .12 * Math.abs(q);
      var s = c.s, fx = c.x, fy = c.y - 13.5 * s;          // 심지 끝
      var h = (24 + 7 * breath + 4 * Math.abs(q)) * s, w = (6.2 - 1.2 * breath) * s;

      // 큰 은은한 빛 + 불꽃 둘레 밝은 빛
      ctx.globalAlpha = .07 * k;
      var g1 = ctx.createRadialGradient(fx, fy - h * .4, 0, fx, fy - h * .4, h * 4.2 * LS);
      g1.addColorStop(0, 'rgba(255,170,80,1)'); g1.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(fx, fy - h * .4, h * 4.2 * LS, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .34 * k;
      var g2 = ctx.createRadialGradient(fx, fy - h * .45, 0, fx, fy - h * .45, h * 1.25);
      g2.addColorStop(0, 'rgba(255,205,120,1)'); g2.addColorStop(.5, 'rgba(255,170,80,.5)'); g2.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(fx, fy - h * .45, h * 1.25, 0, Math.PI * 2); ctx.fill();
      // 탁자 위 납작한 빛 웅덩이
      ctx.globalAlpha = .18 * k;
      ctx.save(); ctx.translate(c.x, c.y + 2 * s); ctx.scale(1, .28);
      var g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 3.2);
      g3.addColorStop(0, 'rgba(255,180,90,1)'); g3.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(0, 0, h * 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // 탁자에 비친 불꽃: 컵 바닥(c.y)을 거울로 뒤집는다 → 심지 끝이 c.y + 13.5s 에 온다. 옆으로 세 번 겹쳐 흐리게
      ctx.save(); ctx.translate(c.x, c.y + 13.5 * s); ctx.scale(1, -.9);
      for (var r = -1; r <= 1; r++) { ctx.save(); ctx.translate(r * 1.6 * s, 0); ctx.rotate(-c.sway * .5); ctx.globalAlpha = .08 * k; drawFlame(ctx, h * .92, w * 1.1); ctx.restore(); }
      ctx.restore();
      // 불꽃
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(c.sway);
      ctx.globalAlpha = 1; drawFlame(ctx, h, w); ctx.restore();
    });
  }
  function drawBokeh(t) {
    // 먼 빛망울 (보케): 테두리가 또렷한 둥근 빛
    ctx.globalCompositeOperation = 'lighter';
    far.forEach(function (b) {
      var k = .72 + .28 * Math.sin(t * b.sp + b.ph);
      var a = b.a * k, r = b.r;
      var gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      var c1 = b.warm > .5 ? '255,205,120' : '255,185,95';
      gr.addColorStop(0, 'rgba(' + c1 + ',' + (a * .55) + ')');
      gr.addColorStop(.72, 'rgba(' + c1 + ',' + (a * .62) + ')');
      gr.addColorStop(.93, 'rgba(255,170,80,' + (a * .95) + ')');   // 밝은 테두리
      gr.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    });

  }

  function frame(now) {
    raf = 0;
    if (!on) return;
    if (now - last < 33) { raf = requestAnimationFrame(frame); return; }   // 약 30fps
    last = now;
    var t = now / 1000;
    ctx.drawImage(still, 0, 0, W, H);
    if (scene === 'temple') {
      // 창문: 천천히 숨 쉬는 밝기 + 빛줄기
      ctx.globalAlpha = (phone ? .55 : .82) + .15 * Math.sin(t * .5); ctx.drawImage(layer, 0, 0, W, H); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      var glow = ctx.createRadialGradient(W / 2, win.y + win.h * .5, 0, W / 2, win.y + win.h * .5, win.w * 1.4);
      glow.addColorStop(0, 'rgba(226,178,83,' + (0.10 + 0.04 * Math.sin(t * .5)).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(226,178,83,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      rays.forEach(function (r) {
        var a = r.a * (0.6 + 0.4 * Math.sin(t * r.sp + r.ph));
        var top = win.y + win.h * .3, bottom = H * 1.05, dx = Math.tan(r.ang) * (bottom - top);
        var gr = ctx.createLinearGradient(0, top, 0, bottom);
        gr.addColorStop(0, 'rgba(255,230,170,' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(r.x - r.w * .15, top); ctx.lineTo(r.x + r.w * .15, top); ctx.lineTo(r.x + dx + r.w, bottom); ctx.lineTo(r.x + dx - r.w, bottom); ctx.closePath(); ctx.fill();
      });
      drawNearCandles(t, 1);
    } else if (scene === 'grotto') {
      drawNearCandles(t, 2.2);   // 바위에 넓게 일렁이는 빛
    } else {
      drawBokeh(t);
      drawNearCandles(t, 1);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (on) return; on = true; last = 0; if (reduced) { frame(1000); on = false; return; } if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sync() {
    var dark = document.documentElement.getAttribute('data-sky') !== 'day';
    if (currentScene() !== scene) layout();
    cv.hidden = !dark;
    if (dark && document.visibilityState === 'visible') start(); else stop();
    if (reduced && dark) frame(1000);
  }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); if (reduced) frame(1000); }, 150); });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sky', 'data-scene'] });
  layout(); sync();
})();
