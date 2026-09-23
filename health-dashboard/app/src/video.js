/* 순위 애니메이션 → 동영상 파일 (발표용)
   - 캔버스에 「막대 순위」를 연도별로 그리며 순위 자리·막대 길이를 부드럽게 보간(연도 재생과 같은 움직임)
   - 1순위: WebCodecs VideoEncoder(H.264) + mp4-muxer → .mp4 (파워포인트·카카오톡·유튜브 어디서나 재생)
   - 2순위(브라우저가 H.264 인코딩을 못 하면): MediaRecorder → .webm (크롬·엣지·유튜브 재생, 파워포인트는 최신 버전만)
   척도는 전 연도 공통 최댓값(gmax)이라 해가 갈수록 막대가 길어지는 모습이 그대로 남는다. */
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { download, safe } from "./export";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // easeInOutCubic
const fmtV = (v, unit) => (v == null ? "–" : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("ko-KR") : (Math.round(v * 10) / 10).toFixed(1))) + (unit || "");

/**
 * @param {object} o
 *  o.title      지표명            o.subtitle  "표준화율 · 높을수록 양호 · 양호한 순"
 *  o.poolName   "서울특별시 시군구"  o.years   [2008,…]
 *  o.frames     {year: [{c, name, v}]} 각 연도의 순위순 목록(1위부터)
 *  o.selCode    선택 지역 코드(붉은 막대)   o.gmax  공통 척도 최댓값   o.unit  단위
 *  o.topN       화면에 담을 순위 수(0 = 전체)  o.width/height  영상 크기  o.fps
 *  o.holdMs     연도마다 머무는 시간  o.moveMs  전환 시간  o.source 출처 한 줄
 *  o.onProgress (0~1)
 */
export async function renderRankVideo(o) {
  const W = o.width || 1280, fps = o.fps || 30;
  const years = o.years;
  const nAll = Math.max(...years.map((y) => (o.frames[y] || []).length));
  const topN = o.topN && o.topN < nAll ? o.topN : nAll;
  const selExtra = 1;                                             // 선택 지역이 topN 밖일 때 맨 아래 한 줄
  const TOP = 118, BOT = 48, LEFT = 24, RIGHT = 24;
  const rowsShown = topN + (o.selCode ? selExtra : 0);
  let rowH = o.height ? Math.floor((o.height - TOP - BOT) / rowsShown) : 26;
  rowH = Math.max(6, Math.min(30, rowH));
  const H = o.height || Math.ceil((TOP + BOT + rowsShown * rowH) / 2) * 2;
  const labelW = rowH >= 12 ? 200 : 0, valW = rowH >= 12 ? 84 : 0;
  const barX = LEFT + labelW, barW = W - barX - RIGHT - valW;
  const showText = rowH >= 12;
  const font = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";

  // 연도별 code → {rank, v, name}
  const byYear = {};
  for (const y of years) { const m = new Map(); (o.frames[y] || []).forEach((r, i) => m.set(r.c, { rank: i, v: r.v, name: r.name })); byYear[y] = m; }
  const codes = new Set(); for (const y of years) for (const c of byYear[y].keys()) codes.add(c);

  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  const C = { bg: "#fcfcfb", ink: "#0b0b0b", mut: "#52514e", track: "#ededea", bar: "#cfe3fb", barMe: "#f5a58f", meLine: "#d8402a", blue: "#2a78d6", grid: "#e3e2de" };

  const drawFrame = (yi, p, yearLabel) => {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // 제목
    ctx.fillStyle = C.ink; ctx.font = `700 ${W >= 1000 ? 30 : 22}px ${font}`; ctx.textBaseline = "alphabetic";
    ctx.fillText(o.title, LEFT, 44);
    ctx.fillStyle = C.mut; ctx.font = `400 ${W >= 1000 ? 15 : 12}px ${font}`;
    ctx.fillText(`${o.poolName} 순위 · ${o.subtitle} · 막대 길이 = 값(0 기준, ${years[0]}~${years[years.length - 1]} 공통 척도)`, LEFT, 70);
    // 연도(우상단)
    ctx.textAlign = "right"; ctx.fillStyle = C.blue; ctx.font = `900 ${W >= 1000 ? 64 : 44}px ${font}`;
    ctx.fillText(String(yearLabel), W - RIGHT, 78); ctx.textAlign = "left";
    // 척도 눈금(0 · 최대)
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75, 1]) { const x = barX + barW * f; ctx.beginPath(); ctx.moveTo(x, TOP - 8); ctx.lineTo(x, H - BOT + 4); ctx.stroke(); }
    ctx.fillStyle = C.mut; ctx.font = `400 11px ${font}`; ctx.textAlign = "right";
    ctx.fillText(fmtV(o.gmax, o.unit), barX + barW, TOP - 12); ctx.textAlign = "left";
    // 막대 — 두 연도 사이 보간
    const yA = years[yi], yB = years[Math.min(yi + 1, years.length - 1)];
    const A = byYear[yA], B = byYear[yB];
    const items = [];
    for (const c of codes) {
      const a = A.get(c), b = B.get(c);
      if (!a && !b) continue;
      const ra = a ? a.rank : (b.rank + 3), rb = b ? b.rank : (a.rank + 3);
      const va = a ? a.v : 0, vb = b ? b.v : 0;
      const rank = ra + (rb - ra) * p, v = va + (vb - va) * p;
      const alpha = (a && b) ? 1 : (a ? 1 - p : p);
      const me = c === o.selCode;
      let y;
      if (rank < topN - 0.5) y = TOP + rank * rowH;                       // topN 안(전환 중 반쯤 들어온 것까지)
      else if (me) y = TOP + topN * rowH + 4;                              // 선택 지역은 topN 밖이어도 맨 아래에
      else continue;
      items.push({ c, name: (a || b).name, v, rank, y, alpha, me, outside: me && rank >= topN - 0.5 });
    }
    items.sort((x, y) => x.y - y.y);
    for (const it of items) {
      ctx.globalAlpha = Math.max(0, Math.min(1, it.alpha));
      const h = rowH - Math.max(1, Math.round(rowH * 0.12));
      ctx.fillStyle = C.track; roundRect(ctx, barX, it.y, barW, h, 3); ctx.fill();
      const bw = Math.max(1, (barW * it.v) / o.gmax);
      ctx.fillStyle = it.me ? C.barMe : C.bar; roundRect(ctx, barX, it.y, bw, h, 3); ctx.fill();
      if (it.me) { ctx.strokeStyle = C.meLine; ctx.lineWidth = 2; roundRect(ctx, barX + 1, it.y + 1, barW - 2, h - 2, 3); ctx.stroke(); }
      if (showText) {
        const fs = Math.min(15, Math.max(10, rowH - 9));
        ctx.font = `${it.me ? 700 : 500} ${fs}px ${font}`; ctx.textBaseline = "middle";
        ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.fillText(String(Math.round(it.rank) + 1), LEFT + 30, it.y + h / 2);
        ctx.fillStyle = C.ink; ctx.textAlign = "left";
        const nm = it.outside ? `${it.name} (${Math.round(it.rank) + 1}위)` : it.name;
        ctx.fillText(clipText(ctx, nm, labelW - 40), LEFT + 36, it.y + h / 2);
        ctx.textAlign = "left"; ctx.fillText(fmtV(it.v, ""), barX + barW + 8, it.y + h / 2);
      }
      ctx.globalAlpha = 1;
    }
    if (o.selCode && topN < nAll) { ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(LEFT, TOP + topN * rowH + 1); ctx.lineTo(W - RIGHT, TOP + topN * rowH + 1); ctx.stroke(); }
    // 바닥 출처
    ctx.fillStyle = C.mut; ctx.font = `400 12px ${font}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`${o.source || ""}${topN < nAll ? ` · 상위 ${topN}개만 표시(전체 ${nAll}개)` : ""}`, LEFT, H - 18);
  };

  // 프레임 시간표: 첫 연도 hold → (move → hold) × … → 마지막 연도 긴 hold
  const hold = o.holdMs ?? 900, move = o.moveMs ?? 900, lastHold = (o.holdMs ?? 900) + 1600;
  const plan = [];
  for (let i = 0; i < years.length; i++) {
    plan.push({ yi: i, p: 0, ms: i === years.length - 1 ? lastHold : hold, label: years[i] });
    if (i < years.length - 1) plan.push({ yi: i, move: true, ms: move, label: years[i + 1] });
  }
  const totalMs = plan.reduce((s, x) => s + x.ms, 0);
  const totalFrames = Math.ceil((totalMs / 1000) * fps);
  const frameAt = (k) => {
    let t = (k / fps) * 1000;
    for (const seg of plan) { if (t <= seg.ms) return { yi: seg.yi, p: seg.move ? ease(t / seg.ms) : 0, label: seg.label }; t -= seg.ms; }
    const last = plan[plan.length - 1]; return { yi: last.yi, p: 0, label: last.label };
  };

  // ── 인코딩 ──
  const supportsWC = typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
  let avc = null;
  if (supportsWC) {
    for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42001f"]) {
      try { const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 6_000_000, framerate: fps }); if (r.supported) { avc = codec; break; } } catch { /* noop */ }
    }
  }
  if (avc) {
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: fps }, fastStart: "in-memory" });
    let err = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
    enc.configure({ codec: avc, width: W, height: H, bitrate: 6_000_000, framerate: fps, avc: { format: "avc" } });
    for (let k = 0; k < totalFrames; k++) {
      const f = frameAt(k); drawFrame(f.yi, f.p, f.label);
      const vf = new VideoFrame(canvas, { timestamp: Math.round((k * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: k % (fps * 2) === 0 }); vf.close();
      if (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
      if (err) throw err;
      if (k % 5 === 0) o.onProgress?.(k / totalFrames);
    }
    await enc.flush(); enc.close(); muxer.finalize();
    o.onProgress?.(1);
    return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), ext: "mp4", width: W, height: H, seconds: totalMs / 1000 };
  }
  // ── 대체: MediaRecorder(WebM), 실시간 그리기 ──
  if (typeof MediaRecorder === "undefined" || !canvas.captureStream) throw new Error("이 브라우저는 영상 저장을 지원하지 않습니다. 크롬·엣지에서 시도해 주세요.");
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("이 브라우저는 영상 저장을 지원하지 않습니다. 크롬·엣지에서 시도해 주세요.");
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise((res) => { rec.onstop = res; });
  rec.start(200);
  const t0 = performance.now();
  await new Promise((res) => {
    const tick = () => {
      const k = Math.min(totalFrames - 1, Math.floor(((performance.now() - t0) / 1000) * fps));
      const f = frameAt(k); drawFrame(f.yi, f.p, f.label); o.onProgress?.(k / totalFrames);
      if (k >= totalFrames - 1) { setTimeout(res, 300); return; }
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); await done; o.onProgress?.(1);
  return { blob: new Blob(chunks, { type: "video/webm" }), ext: "webm", width: W, height: H, seconds: totalMs / 1000 };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr); ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
}
function clipText(ctx, s, maxW) {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s; while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

export { download as saveBlob };
