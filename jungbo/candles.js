/* 중보기도 나눔터 — 촛불 테이블 (화면 뒤 바탕)
   어두운 탁자 위에 낮은 티라이트(작은 알루미늄 컵 초)가 가득 켜져 있다. 초마다 제각기 흔들린다.
   컵·초는 한 번만 그려 두고(정지 층), 불꽃과 빛무리만 매 장 다시 그린다. 화면이 안 보이면 멈춘다. */
(function () {
  'use strict';
  var cv = document.getElementById('candles'); if (!cv) return;
  var ctx = cv.getContext('2d', { alpha: false });
  var still = document.createElement('canvas'), sctx = still.getContext('2d');
  var glowSprite = document.createElement('canvas'), coreSprite = document.createElement('canvas');
  var W = 0, H = 0, DPR = 1, candles = [], raf = 0, last = 0, on = false;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sprite(c, size, stops) {
    c.width = c.height = size;
    var g = c.getContext('2d'), r = size / 2, grd = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
  }
  sprite(glowSprite, 256, [[0, 'rgba(255,190,90,.55)'], [.25, 'rgba(255,160,60,.22)'], [.6, 'rgba(255,120,40,.06)'], [1, 'rgba(255,100,30,0)']]);
  sprite(coreSprite, 64, [[0, 'rgba(255,250,225,1)'], [.35, 'rgba(255,220,140,.85)'], [.7, 'rgba(255,170,70,.25)'], [1, 'rgba(255,150,50,0)']]);

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = still.width = Math.round(W * DPR); cv.height = still.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 초 놓기: 멀수록(위쪽) 작고 촘촘, 가까울수록(아래쪽) 크다. 가운데 위쪽은 글이 오니 비워 둔다
    candles = [];
    var n = Math.round(Math.min(110, Math.max(45, (W * H) / 9000)));
    var tries = 0;
    while (candles.length < n && tries++ < n * 40) {
      var t = Math.pow(Math.random(), .75);            // 0 = 먼 곳, 1 = 가까운 곳
      var y = H * (0.30 + 0.72 * t), s = 0.45 + 1.15 * t;  // 크기 배율
      var x = rnd(-20, W + 20);
      var ok = true;
      for (var i = 0; i < candles.length; i++) {
        var c = candles[i], dx = c.x - x, dy = (c.y - y) * 2.2, min = (c.s + s) * 16;
        if (dx * dx + dy * dy < min * min) { ok = false; break; }
      }
      if (!ok) continue;
      candles.push({ x: x, y: y, s: s, ph: rnd(0, 6.28), sp: rnd(0.8, 1.6), ph2: rnd(0, 6.28), sp2: rnd(2.5, 4.5), tilt: 0, j: 0, hue: rnd(-6, 6) });
    }
    candles.sort(function (a, b) { return a.y - b.y; });
    drawStill();
  }

  // 정지 층: 탁자 + 컵 + 초
  function drawStill() {
    var g = sctx;
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#07100d'); bg.addColorStop(.45, '#0b1711'); bg.addColorStop(1, '#17150f');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 탁자 결 (아주 은은한 가로 띠)
    g.globalAlpha = .06; g.fillStyle = '#3a2a16';
    for (var yy = H * .45; yy < H; yy += 7) g.fillRect(0, yy, W, 1);
    g.globalAlpha = 1;
    candles.forEach(function (c) {
      var s = c.s, cx = c.x, cy = c.y, rw = 11 * s, rh = 3.2 * s, hgt = 7 * s;
      // 컵 (알루미늄): 아래 몸통 + 위 테두리 타원
      var body = g.createLinearGradient(cx - rw, 0, cx + rw, 0);
      body.addColorStop(0, '#5b5347'); body.addColorStop(.35, '#b8ab93'); body.addColorStop(.6, '#8c806c'); body.addColorStop(1, '#4a4238');
      g.fillStyle = body;
      g.beginPath(); g.moveTo(cx - rw, cy); g.lineTo(cx - rw, cy + hgt); g.ellipse(cx, cy + hgt, rw, rh, 0, Math.PI, 0, true); g.lineTo(cx + rw, cy); g.closePath(); g.fill();
      g.fillStyle = '#d9cfbb'; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); g.fill();      // 테두리
      g.fillStyle = '#efe6cf'; g.beginPath(); g.ellipse(cx, cy, rw * .86, rh * .8, 0, 0, Math.PI * 2); g.fill(); // 초 (밀랍)
      g.fillStyle = '#2a211a'; g.fillRect(cx - .6 * s, cy - 3.5 * s, 1.2 * s, 3.5 * s);   // 심지
    });
    // 가장자리 어둡게
    var v = g.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .3, W / 2, H * .55, Math.max(W, H) * .85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }

  function frame(now) {
    raf = 0;
    if (!on) return;
    if (now - last < 33) { raf = requestAnimationFrame(frame); return; }   // 약 30fps
    last = now;
    var t = now / 1000;
    ctx.drawImage(still, 0, 0, W, H);
    // 빛무리 (더해서 섞는다)
    ctx.globalCompositeOperation = 'lighter';
    candles.forEach(function (c) {
      // 흔들림: 느린 숨 + 빠른 떨림 + 가끔 툭 (바람)
      var breath = Math.sin(t * c.sp + c.ph) * .5 + .5;
      var quiver = Math.sin(t * c.sp2 * 2.3 + c.ph2) * Math.sin(t * c.sp2 + c.ph) ;
      if (Math.random() < .012) c.j = rnd(-1, 1);
      c.j *= .9;
      c.tilt += ((quiver * .35 + c.j * .8) - c.tilt) * .25;
      var k = .78 + breath * .22 + Math.abs(quiver) * .1;   // 밝기
      var s = c.s, cx = c.x, cy = c.y - 3.5 * s;
      var gr = 150 * s * (0.9 + 0.2 * k);
      ctx.globalAlpha = .9 * k;
      ctx.drawImage(glowSprite, cx - gr / 2, cy - gr / 2 + 12 * s, gr, gr);
      // 탁자 위 비침 (납작한 빛)
      ctx.globalAlpha = .35 * k;
      ctx.drawImage(glowSprite, cx - gr * .9, cy + 4 * s - gr * .2, gr * 1.8, gr * .4);
      // 불꽃
      var fh = (16 + 6 * breath + 3 * Math.abs(quiver)) * s, fw = (5.2 - 1.2 * breath) * s;
      ctx.save(); ctx.translate(cx, cy + 2 * s); ctx.rotate(c.tilt * .35);
      ctx.globalAlpha = .95;
      var fl = ctx.createLinearGradient(0, 0, 0, -fh);
      fl.addColorStop(0, 'rgba(255,140,40,.95)'); fl.addColorStop(.35, 'rgba(255,200,90,.95)'); fl.addColorStop(.75, 'rgba(255,240,190,.9)'); fl.addColorStop(1, 'rgba(255,255,240,.0)');
      ctx.fillStyle = fl;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(fw * 1.3, -fh * .25, fw * 1.1, -fh * .6, 0, -fh);
      ctx.bezierCurveTo(-fw * 1.1, -fh * .6, -fw * 1.3, -fh * .25, 0, 0); ctx.fill();
      // 불꽃 속 파란 심
      ctx.globalAlpha = .55; ctx.fillStyle = 'rgba(120,170,255,.9)';
      ctx.beginPath(); ctx.ellipse(0, -fh * .12, fw * .45, fh * .14, 0, 0, Math.PI * 2); ctx.fill();
      // 불꽃 가운데 가장 밝은 점
      ctx.globalAlpha = .9; var cs = 26 * s * (0.9 + 0.25 * k);
      ctx.drawImage(coreSprite, -cs / 2, -fh * .45 - cs / 2, cs, cs);
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (on) return; on = true; last = 0; if (reduced) { frame(1000); on = false; return; } if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sync() {
    var dark = document.documentElement.getAttribute('data-sky') !== 'day';
    cv.hidden = !dark;
    if (dark && document.visibilityState === 'visible') start(); else stop();
  }
  window.addEventListener('resize', function () { layout(); if (on && reduced) frame(1000); });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sky'] });
  layout(); sync();
})();
