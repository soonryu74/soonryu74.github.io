/* SportsGap · 예산 배분 실시간 시뮬레이터
   - 계산: 웹 워커(백그라운드 스레드)에서 시설을 한 곳씩 투입하며 31개 시군 접근성 지수를 다시 계산
   - 그림: SVG 지도 재착색 + 캔버스 그래프 2개
   - 재생: 계산 결과를 단계별로 저장해 두고 되감기(기록 재생)
   지수 정의는 본 앱과 같다: 대상(65세 이상 + 등록장애인) 1만 명당 공급 점수를 경기도 평균(=100)과 비교. */
(function () {
  'use strict';
  var D = window.SG_SIM_DATA;
  var root = document.getElementById('sg-sim');
  if (!D || !root || typeof Worker === 'undefined') return;

  var R = D.regions, N = R.length;
  var GRADES = [
    { max: 60, cls: 'lv1', label: '매우 부족' },
    { max: 85, cls: 'lv2', label: '부족' },
    { max: 115, cls: 'lv3', label: '보통' },
    { max: 150, cls: 'lv4', label: '양호' },
    { max: Infinity, cls: 'lv5', label: '충분' }
  ];
  function grade(v) { for (var i = 0; i < GRADES.length; i++) if (v < GRADES[i].max) return GRADES[i]; return GRADES[4]; }
  var css = getComputedStyle(document.documentElement);
  function cv(name, fb) { return (css.getPropertyValue(name) || fb).trim(); }
  var COLORS = { lv1: cv('--lv1', '#b9442c'), lv2: cv('--lv2', '#e58a4e'), lv3: cv('--lv3', '#f2e3b8'), lv4: cv('--lv4', '#9fcdb3'), lv5: cv('--lv5', '#3f8f6e'),
    ink: cv('--ink', '#16241f'), muted: cv('--muted', '#5f6b66'), line: cv('--line', '#d9e2dc'), green: cv('--green', '#185c4a'), blue: '#1d4ed8', gold: cv('--gold', '#f2b33d') };
  var fmt = function (n) { return Math.round(n).toLocaleString('ko-KR'); };

  /* ---------- 웹 워커 (백그라운드 계산) ---------- */
  var workerSrc = [
    'self.onmessage=function(e){',
    ' var gen=e.data.gen,R=e.data.regions,p=e.data.params,n=R.length;',
    ' function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}',
    ' function run(pert,keep){',
    '  var target=new Float64Array(n),supply=new Float64Array(n),alloc=new Int32Array(n),T=0,S=0,i;',
    '  for(i=0;i<n;i++){target[i]=(R[i].age65*p.wA+R[i].disabled*p.wD)*(pert?pert[i]:1);supply[i]=R[i].supply;T+=target[i];S+=supply[i];}',
    '  var avg=T?S/(T/1e4):1,idx=new Float32Array(n);',
    '  function one(i){return target[i]?supply[i]/(target[i]/1e4)/avg*100:0;}',
    '  for(i=0;i<n;i++)idx[i]=one(i);',
    '  function snap(){var mn=1e9,mx=-1e9,sum=0,below=0;for(var k=0;k<n;k++){var v=idx[k];if(v<mn)mn=v;if(v>mx)mx=v;sum+=v;if(v<100)below++;}return{min:mn,max:mx,mean:sum/n,below:below};}',
    '  var hist=[],frames=keep?[new Float32Array(idx)]:null,to;hist.push(snap());hist[0].to=-1;',
    '  for(var s=0;s<p.steps;s++){',
    '   to=0;',
    '   if(p.strategy==="lowest"){var mn=1e9;for(i=0;i<n;i++)if(idx[i]<mn){mn=idx[i];to=i;}}',
    '   else if(p.strategy==="pop"){var best=-1e18;for(i=0;i<n;i++){var v=target[i]/T*(s+1)-alloc[i];if(v>best||(v===best&&idx[i]<idx[to])){best=v;to=i;}}}',
    '   else{var least=1e9;for(i=0;i<n;i++){if(alloc[i]<least||(alloc[i]===least&&idx[i]<idx[to])){least=alloc[i];to=i;}}}',
    '   supply[to]+=p.unit;alloc[to]++;idx[to]=one(to);',
    '   var h=snap();h.to=to;hist.push(h);if(keep)frames.push(new Float32Array(idx));',
    '  }',
    '  return{hist:hist,frames:frames,alloc:alloc};',
    ' }',
    ' var base=run(null,true);',
    ' var lo=null,hi=null;',
    ' if(p.mc>0){',
    '  var rand=rng(p.seed),L=p.steps+1;lo=new Float32Array(L).fill(1e9);hi=new Float32Array(L).fill(-1e9);',
    '  for(var k=0;k<p.mc;k++){',
    '   var pert=new Float64Array(n);for(var i=0;i<n;i++)pert[i]=1+(rand()*2-1)*p.jitter;',
    '   var r=run(pert,false);',
    '   for(var s=0;s<L;s++){var v=r.hist[s].min;if(v<lo[s])lo[s]=v;if(v>hi[s])hi[s]=v;}',
    '   if(k%25===24)self.postMessage({gen:gen,progress:(k+1)/p.mc});',
    '  }',
    ' }',
    ' var flat=new Float32Array(base.frames.length*n);for(var f=0;f<base.frames.length;f++)flat.set(base.frames[f],f*n);',
    ' var msg={gen:gen,done:true,n:n,hist:base.hist,frames:flat,alloc:base.alloc,lo:lo,hi:hi};',
    ' var tr=[flat.buffer,base.alloc.buffer];if(lo){tr.push(lo.buffer,hi.buffer);}',
    ' self.postMessage(msg,tr);',
    '};'
  ].join('\n');
  var worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    map: $('sg-map'), play: $('sg-play'), step: $('sg-step'), reset: $('sg-reset'), prog: $('sg-prog'),
    stepn: $('sg-stepn'), stepmax: $('sg-stepmax'), stats: $('sg-stats'), scrub: $('sg-scrub'), meta: $('sg-meta'), live: $('sg-live'),
    chart: $('sg-chart'), bars: $('sg-bars'), chips: $('sg-chips'),
    budget: $('sg-budget'), cost: $('sg-cost'), wA: $('sg-wa'), wD: $('sg-wd'), mc: $('sg-mc'), jitter: $('sg-jitter'), speed: $('sg-speed'), strategy: $('sg-strategy')
  };
  var outs = {}; ['budget', 'cost', 'wA', 'wD', 'mc', 'jitter', 'speed'].forEach(function (k) { outs[k] = el[k].parentNode.querySelector('output'); });

  /* SVG 지도 만들기 */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var mapG = [], mapNum = [], mapAdd = [];
  (function buildMap() {
    var frag = document.createDocumentFragment();
    R.forEach(function (r, i) {
      var g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'rg lv3'); g.setAttribute('data-name', r.name);
      var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', r.d); g.appendChild(p);
      var t = document.createElementNS(SVGNS, 'title'); g.appendChild(t);
      frag.appendChild(g); mapG[i] = g;
    });
    R.forEach(function (r, i) {
      var g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'lbl');
      var t1 = document.createElementNS(SVGNS, 'text'); t1.setAttribute('x', r.cx); t1.setAttribute('y', r.cy - 10); t1.textContent = r.name;
      var t2 = document.createElementNS(SVGNS, 'text'); t2.setAttribute('x', r.cx); t2.setAttribute('y', r.cy + 10); t2.setAttribute('class', 'num');
      var t3 = document.createElementNS(SVGNS, 'text'); t3.setAttribute('x', r.cx); t3.setAttribute('y', r.cy + 27); t3.setAttribute('class', 'add');
      g.appendChild(t1); g.appendChild(t2); g.appendChild(t3); frag.appendChild(g); mapNum[i] = t2; mapAdd[i] = t3;
    });
    el.map.appendChild(frag);
  })();

  /* ---------- 상태 ---------- */
  var gen = 0, result = null, cur = 0, playing = false, lastT = 0, acc = 0, timer = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function params() {
    var budget = +el.budget.value, cost = +el.cost.value;
    var unitEl = root.querySelector('input[name="sg-unit"]:checked');
    return {
      budget: budget, cost: cost, steps: Math.max(0, Math.floor(budget / cost)),
      unit: unitEl ? +unitEl.value : 2, strategy: el.strategy.value,
      wA: +el.wA.value, wD: +el.wD.value, mc: +el.mc.value, jitter: +el.jitter.value / 100, seed: 20260101
    };
  }
  function showOutputs() {
    outs.budget.textContent = fmt(el.budget.value) + '억원';
    outs.cost.textContent = fmt(el.cost.value) + '억원';
    outs.wA.textContent = '×' + (+el.wA.value).toFixed(2);
    outs.wD.textContent = '×' + (+el.wD.value).toFixed(2);
    outs.mc.textContent = el.mc.value === '0' ? '끔' : fmt(el.mc.value) + '회';
    outs.jitter.textContent = '±' + el.jitter.value + '%';
    outs.speed.textContent = el.speed.value + '단계/초';
  }

  function compute() {
    var p = params(); gen++;
    el.live.textContent = '계산 중'; el.live.classList.add('busy');
    worker.postMessage({ gen: gen, regions: R.map(function (r) { return { age65: r.age65, disabled: r.disabled, supply: r.supply }; }), params: p });
  }
  worker.onmessage = function (e) {
    var m = e.data; if (m.gen !== gen) return;
    if (!m.done) { el.live.textContent = '검증 ' + Math.round(m.progress * 100) + '%'; return; }
    result = m; result.params = params();
    el.live.textContent = '실시간'; el.live.classList.remove('busy');
    var L = m.hist.length - 1;
    el.stepmax.textContent = fmt(L); el.scrub.max = L; el.prog.max = Math.max(1, L);
    cur = 0; drawChart(); seek(0);
    if (!reduced) startPlay(); else stopPlay();
  };

  /* ---------- 단계 이동 / 재생 ---------- */
  function frame(s) { var n = result.n; return result.frames.subarray(s * n, s * n + n); }
  function seek(s) {
    if (!result) return;
    var L = result.hist.length - 1; s = Math.max(0, Math.min(L, s)); cur = s;
    var idx = frame(s), h = result.hist[s], p = result.params;
    var added = new Int32Array(N); for (var k = 1; k <= s; k++) added[result.hist[k].to]++;
    for (var i = 0; i < N; i++) {
      var g = grade(idx[i]);
      mapG[i].setAttribute('class', 'rg ' + g.cls + (h.to === i ? ' hit' : ''));
      mapG[i].firstChild.nextSibling.textContent = R[i].name + ' · 지수 ' + Math.round(idx[i]) + ' (' + g.label + ') · 추가 ' + added[i] + '곳';
      mapNum[i].textContent = Math.round(idx[i]);
      mapAdd[i].textContent = added[i] ? '+' + added[i] : '';
    }
    el.stepn.textContent = fmt(s); el.scrub.value = s; el.prog.value = s;
    el.meta.textContent = '투입 ' + fmt(s) + '곳 · ' + fmt(s * p.cost) + '억원 사용';
    var gap = h.max - h.min;
    el.stats.innerHTML =
      '<div>이번 투입<b>' + (h.to >= 0 ? R[h.to].name : '—') + '</b></div>' +
      '<div>최하위 지수<b class="' + (h.min < 60 ? 'warn' : '') + '">' + h.min.toFixed(1) + '</b></div>' +
      '<div>평균 지수<b>' + h.mean.toFixed(1) + '</b></div>' +
      '<div>100 미만 시군<b>' + h.below + '곳</b></div>' +
      '<div>최대–최소 격차<b>' + gap.toFixed(0) + '</b></div>' +
      '<div>투입 시설<b>' + fmt(s) + '곳</b></div>' +
      '<div>사용 예산<b>' + fmt(s * p.cost) + '억원</b></div>' +
      '<div>남은 예산<b>' + fmt(p.budget - s * p.cost) + '억원</b></div>';
    drawMarker(); drawBars(idx, h.to, added);
  }
  function tick(t) {
    if (!playing) return;
    var dt = Math.min(0.25, (t - lastT) / 1000); lastT = t; acc += dt * (+el.speed.value);
    var n = Math.floor(acc); if (n > 0) { acc -= n; seek(cur + n); }
    if (cur >= result.hist.length - 1) { stopPlay(); return; }
    timer = requestAnimationFrame(tick);
  }
  function startPlay() {
    if (!result || result.hist.length < 2) return;
    if (cur >= result.hist.length - 1) seek(0);
    playing = true; acc = 0; lastT = performance.now(); el.play.textContent = '⏸ 일시정지'; el.play.setAttribute('aria-pressed', 'true');
    cancelAnimationFrame(timer); timer = requestAnimationFrame(tick);
  }
  function stopPlay() { playing = false; cancelAnimationFrame(timer); el.play.textContent = '▶ 재생'; el.play.setAttribute('aria-pressed', 'false'); }
  el.play.addEventListener('click', function () { playing ? stopPlay() : startPlay(); });
  el.step.addEventListener('click', function () { stopPlay(); seek(cur + 1); });
  el.reset.addEventListener('click', function () { stopPlay(); seek(0); startPlay(); });
  el.scrub.addEventListener('input', function () { stopPlay(); seek(+el.scrub.value); });

  /* ---------- 캔버스: 단계별 지수 그래프 ---------- */
  var chartBox = null;
  function setupCanvas(c, h) {
    var dpr = window.devicePixelRatio || 1, w = c.clientWidth || 600;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var ctx = c.getContext('2d', { willReadFrequently: true }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx: ctx, w: w, h: h };
  }
  var chartBase = null;
  function drawChart() {
    if (!result) return;
    var cv2 = setupCanvas(el.chart, 260), ctx = cv2.ctx, W = cv2.w, H = cv2.h;
    var hist = result.hist, L = hist.length - 1, pad = { l: 40, r: 12, t: 14, b: 36 };
    var ymax = 0, ymin = 1e9;
    hist.forEach(function (h) { ymax = Math.max(ymax, h.mean, h.min); ymin = Math.min(ymin, h.min); });
    if (result.hi) for (var i = 0; i <= L; i++) { ymax = Math.max(ymax, result.hi[i]); ymin = Math.min(ymin, result.lo[i]); }
    ymax = Math.max(110, Math.ceil(ymax / 10) * 10 + 5); ymin = Math.max(0, Math.floor(ymin / 10) * 10 - 5);
    var X = function (s) { return pad.l + (L ? s / L : 0) * (W - pad.l - pad.r); };
    var Y = function (v) { return pad.t + (1 - (v - ymin) / (ymax - ymin)) * (H - pad.t - pad.b); };
    chartBox = { X: X, Y: Y, L: L, pad: pad, W: W, H: H };
    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px ' + cv('--font', 'sans-serif'); ctx.fillStyle = COLORS.muted; ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1;
    for (var v = Math.ceil(ymin / 20) * 20; v <= ymax; v += 20) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(v, pad.l - 6, Y(v) + 4);
    }
    var xt = L > 0 ? Math.max(1, Math.round(L / 6 / 10) * 10 || 1) : 1;
    ctx.textAlign = 'center';
    for (var s = 0; s <= L; s += xt) ctx.fillText(fmt(s), X(s), H - pad.b + 16);
    ctx.fillText('투입 시설 수 (곳)', (pad.l + W - pad.r) / 2, H - 3);
    ctx.save(); ctx.translate(12, (pad.t + H - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('지수', 0, 0); ctx.restore();
    // 불확실성 띠
    if (result.lo) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(result.hi[0]));
      for (i = 1; i <= L; i++) ctx.lineTo(X(i), Y(result.hi[i]));
      for (i = L; i >= 0; i--) ctx.lineTo(X(i), Y(result.lo[i]));
      ctx.closePath(); ctx.fillStyle = 'rgba(29,78,216,.12)'; ctx.fill();
    }
    // 100 기준선
    ctx.setLineDash([4, 4]); ctx.strokeStyle = COLORS.ink; ctx.beginPath(); ctx.moveTo(pad.l, Y(100)); ctx.lineTo(W - pad.r, Y(100)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right'; ctx.fillStyle = COLORS.muted; ctx.fillText('경기도 평균 = 100', W - pad.r - 2, Y(100) - 4);
    // 평균(초록 점선), 최하위(파랑)
    ctx.lineWidth = 2; ctx.strokeStyle = COLORS.green; ctx.setLineDash([6, 4]); ctx.beginPath();
    hist.forEach(function (h, i) { i ? ctx.lineTo(X(i), Y(h.mean)) : ctx.moveTo(X(i), Y(h.mean)); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.blue; ctx.beginPath();
    hist.forEach(function (h, i) { i ? ctx.lineTo(X(i), Y(h.min)) : ctx.moveTo(X(i), Y(h.min)); }); ctx.stroke();
    // 범례
    ctx.textAlign = 'left'; ctx.fillStyle = COLORS.ink;
    ctx.fillStyle = COLORS.blue; ctx.fillRect(pad.l + 4, pad.t, 14, 3); ctx.fillStyle = COLORS.ink; ctx.fillText('최하위 시군 지수', pad.l + 22, pad.t + 4);
    ctx.fillStyle = COLORS.green; ctx.fillRect(pad.l + 124, pad.t, 14, 3); ctx.fillStyle = COLORS.ink; ctx.fillText('31개 시군 평균', pad.l + 142, pad.t + 4);
    if (result.lo) { ctx.fillStyle = 'rgba(29,78,216,.25)'; ctx.fillRect(pad.l + 234, pad.t - 3, 14, 9); ctx.fillStyle = COLORS.ink; ctx.fillText('인구 흔들림 범위', pad.l + 252, pad.t + 4); }
    chartBase = ctx.getImageData(0, 0, el.chart.width, el.chart.height);
    // 요약 칩
    var last = hist[L], p = result.params, reach = -1;
    for (i = 0; i <= L; i++) if (hist[i].below === 0) { reach = i; break; }
    el.chips.innerHTML =
      '<span class="sg-chip">끝 단계 최하위 <b>' + last.min.toFixed(1) + '</b></span>' +
      '<span class="sg-chip">끝 단계 100 미만 <b>' + last.below + '곳</b></span>' +
      '<span class="sg-chip">모든 시군 100 이상 <b>' + (reach < 0 ? '예산 내 미달성' : fmt(reach) + '곳 · ' + fmt(reach * p.cost) + '억원') + '</b></span>' +
      (result.lo ? '<span class="sg-chip">검증 ' + fmt(p.mc) + '회 · 끝 단계 최하위 범위 <b>' + result.lo[L].toFixed(0) + '–' + result.hi[L].toFixed(0) + '</b></span>' : '');
  }
  function drawMarker() {
    if (!result || !chartBase || !chartBox) return;
    var ctx = el.chart.getContext('2d', { willReadFrequently: true }), dpr = window.devicePixelRatio || 1;
    ctx.putImageData(chartBase, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var h = result.hist[cur], x = chartBox.X(cur);
    ctx.strokeStyle = COLORS.muted; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, chartBox.pad.t); ctx.lineTo(x, chartBox.H - chartBox.pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(x, chartBox.Y(h.min), 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.green; ctx.beginPath(); ctx.arc(x, chartBox.Y(h.mean), 3.5, 0, Math.PI * 2); ctx.fill();
  }
  function chartSeek(ev) {
    if (!chartBox) return;
    var r = el.chart.getBoundingClientRect(), x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    var s = Math.round((x - chartBox.pad.l) / (chartBox.W - chartBox.pad.l - chartBox.pad.r) * chartBox.L);
    stopPlay(); seek(s);
  }
  el.chart.addEventListener('click', chartSeek);
  el.chart.addEventListener('mousemove', function (ev) { if (ev.buttons === 1) chartSeek(ev); });
  el.chart.addEventListener('touchmove', function (ev) { chartSeek(ev); }, { passive: true });

  /* ---------- 캔버스: 시군별 막대 ---------- */
  function drawBars(idx, hit, added) {
    var cv2 = setupCanvas(el.bars, el.bars.clientHeight || 470), ctx = cv2.ctx, W = cv2.w, H = cv2.h;
    var order = []; for (var i = 0; i < N; i++) order.push(i);
    order.sort(function (a, b) { return idx[a] - idx[b]; });
    var pad = { l: 64, r: 44, t: 8, b: 6 }, rowH = (H - pad.t - pad.b) / N, vmax = Math.max(160, Math.ceil(idx[order[N - 1]] / 20) * 20);
    var X = function (v) { return pad.l + v / vmax * (W - pad.l - pad.r); };
    ctx.clearRect(0, 0, W, H); ctx.font = '11px ' + cv('--font', 'sans-serif');
    ctx.strokeStyle = COLORS.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(100), pad.t); ctx.lineTo(X(100), H - pad.b); ctx.stroke(); ctx.setLineDash([]);
    order.forEach(function (i, k) {
      var y = pad.t + k * rowH, v = idx[i], g = grade(v);
      ctx.fillStyle = COLORS[g.cls]; ctx.fillRect(pad.l, y + 1.5, Math.max(1, X(v) - pad.l), rowH - 3);
      if (hit === i) { ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.strokeRect(pad.l, y + 1.5, Math.max(1, X(v) - pad.l), rowH - 3); }
      ctx.fillStyle = COLORS.ink; ctx.textAlign = 'right'; ctx.fillText(R[i].name, pad.l - 6, y + rowH / 2 + 4);
      ctx.textAlign = 'left'; ctx.fillStyle = COLORS.ink; ctx.fillText(Math.round(v) + (added[i] ? ' (+' + added[i] + ')' : ''), X(v) + 4, y + rowH / 2 + 4);
    });
  }

  /* ---------- 입력 → 재계산 ---------- */
  var deb = null;
  function onInput() { showOutputs(); clearTimeout(deb); deb = setTimeout(compute, 120); }
  ['budget', 'cost', 'wA', 'wD', 'mc', 'jitter', 'strategy'].forEach(function (k) { el[k].addEventListener('input', onInput); el[k].addEventListener('change', onInput); });
  root.querySelectorAll('input[name="sg-unit"]').forEach(function (r) { r.addEventListener('change', onInput); });
  el.speed.addEventListener('input', showOutputs);
  window.addEventListener('resize', function () { if (result) { drawChart(); seek(cur); } });

  /* ---------- 격차 지도 화면(#/map)에서만 보이기 ---------- */
  var started = false;
  function route() {
    var on = /^#\/map(\/|$)/.test(location.hash);
    root.hidden = !on;
    if (on && !started) { started = true; showOutputs(); compute(); }
    if (!on) stopPlay();
  }
  window.addEventListener('hashchange', route);
  route();
})();
