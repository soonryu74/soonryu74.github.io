/* 중보기도 나눔터 — 촛불 테이블 (화면 뒤 바탕)
   검은 유리 탁자 위에 유리컵 티라이트. 가까운 초는 또렷하게(불꽃 심 흰빛, 유리 반사, 탁자에 비친 반영),
   먼 초는 사진 배경처럼 둥근 빛망울(보케)로 흐려진다. 초마다 제각기 흔들린다.
   정지 요소(유리컵·탁자)는 한 번만 그리고 불꽃·빛만 매 장 다시 그린다. 화면이 안 보이면 멈춘다. */
(function () {
  'use strict';
  var cv = document.getElementById('candles'); if (!cv) return;
  var ctx = cv.getContext('2d', { alpha: false });
  var still = document.createElement('canvas'), sctx = still.getContext('2d');
  var W = 0, H = 0, DPR = 1, near = [], far = [], raf = 0, last = 0, on = false;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = still.width = Math.round(W * DPR); cv.height = still.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var phone = W < 700;
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
    near.sort(function (a, b) { return a.y - b.y; });
    drawStill();
  }

  /* 정지 층: 탁자 + 유리컵 + 초 */
  function drawStill() {
    var g = sctx;
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

  function frame(now) {
    raf = 0;
    if (!on) return;
    if (now - last < 33) { raf = requestAnimationFrame(frame); return; }   // 약 30fps
    last = now;
    var t = now / 1000;
    ctx.drawImage(still, 0, 0, W, H);

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

    // 가까운 초: 빛 → 반영 → 불꽃
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
      var g1 = ctx.createRadialGradient(fx, fy - h * .4, 0, fx, fy - h * .4, h * 4.2);
      g1.addColorStop(0, 'rgba(255,170,80,1)'); g1.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(fx, fy - h * .4, h * 4.2, 0, Math.PI * 2); ctx.fill();
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
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); if (reduced) frame(1000); }, 150); });
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sky'] });
  layout(); sync();
})();
