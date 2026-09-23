/* 아트셀라 — 작품 자리그림 생성기
   실제 사진이 없는 작품은 여기서 만든 SVG를 대신 보여 준다.
   work.image 값이 있으면 앱이 사진을 쓰고 이 파일은 쓰이지 않는다.
   같은 seed 는 언제나 같은 그림을 만든다(새로고침해도 안 바뀜). */

function rng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* "91 × 72.7 cm" 같은 표기에서 가로세로 비율을 읽는다. 못 읽으면 4:5 */
function ratioOf(size) {
  const m = String(size || '').match(/([\d.]+)\s*[×x]\s*([\d.]+)/);
  if (!m) return 0.8;
  const w = parseFloat(m[1]), h = parseFloat(m[2]);
  if (!w || !h) return 0.8;
  return Math.min(1.6, Math.max(0.55, w / h));
}

function mix(a, b, t) {
  const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const h = n => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(r1 + (r2 - r1) * t) + h(g1 + (g2 - g1) * t) + h(b1 + (b2 - b1) * t);
}

const STYLES = {
  layers(r, W, H, c) {
    let s = `<rect width="${W}" height="${H}" fill="${mix(c[0], '#fffaf2', .72)}"/>`;
    for (let i = 0; i < 14; i++) {
      const y = r() * H * 0.95, h = H * (0.05 + r() * 0.22);
      const col = [c[0], c[1], c[2]][Math.floor(r() * 3)];
      const sk = (r() - 0.5) * H * 0.06;
      s += `<path d="M0 ${y.toFixed(1)} L${W} ${(y + sk).toFixed(1)} L${W} ${(y + sk + h).toFixed(1)} L0 ${(y + h).toFixed(1)} Z" fill="${col}" opacity="${(0.10 + r() * 0.2).toFixed(2)}"/>`;
    }
    s += `<ellipse cx="${(W * (.3 + r() * .4)).toFixed(0)}" cy="${(H * (.3 + r() * .4)).toFixed(0)}" rx="${(W * .3).toFixed(0)}" ry="${(H * .22).toFixed(0)}" fill="${c[0]}" opacity="0.22"/>`;
    return s;
  },
  mist(r, W, H, c, uid) {
    let s = `<rect width="${W}" height="${H}" fill="${c[2]}"/>`;
    const horizon = H * (0.5 + r() * 0.2);
    s += `<rect width="${W}" height="${horizon}" fill="${mix(c[2], '#ffffff', .5)}"/>`;
    for (let i = 0; i < 5; i++) {
      const base = horizon - i * H * 0.06 - r() * H * 0.04;
      let d = `M0 ${H} L0 ${base.toFixed(1)}`;
      for (let x = 0; x <= W; x += W / 12) {
        d += ` L${x.toFixed(0)} ${(base - Math.sin((x / W) * 3.1 + i) * H * 0.045 - r() * H * 0.02).toFixed(1)}`;
      }
      d += ` L${W} ${H} Z`;
      s += `<path d="${d}" fill="${mix(c[0], c[1], i / 5)}" opacity="${(0.85 - i * 0.13).toFixed(2)}"/>`;
    }
    for (let i = 0; i < 6; i++) {
      s += `<rect x="0" y="${(r() * horizon).toFixed(0)}" width="${W}" height="${(H * 0.03).toFixed(0)}" fill="#ffffff" opacity="${(0.12 + r() * 0.18).toFixed(2)}"/>`;
    }
    // 수평선 아래 — 물빛과 낮게 깔린 안개
    for (let i = 0; i < 14; i++) {
      const y = horizon + (H - horizon) * (i / 14) + r() * H * 0.01;
      s += `<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${(H * (0.004 + r() * 0.02)).toFixed(1)}" fill="${i % 3 ? '#ffffff' : c[1]}" opacity="${(0.05 + r() * 0.16).toFixed(2)}"/>`;
    }
    s += `<rect x="0" y="${horizon.toFixed(0)}" width="${W}" height="${(H - horizon).toFixed(0)}" fill="url(#mg-${uid})"/>`;
    return `<defs><linearGradient id="mg-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.22"/></linearGradient></defs>` + s;
  },
  lines(r, W, H, c) {
    let s = `<rect width="${W}" height="${H}" fill="${c[2]}"/>`;
    const cx = W * 0.5, cy = H * 0.56, rr = W * 0.17;
    const table = cy + rr * 0.95;
    // 바탕의 옅은 결
    for (let i = 0; i < 26; i++) {
      const y = r() * H, len = W * (0.1 + r() * 0.35), x = r() * (W - len);
      s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + len).toFixed(1)}" y2="${(y + (r() - .5) * 6).toFixed(1)}" stroke="${c[1]}" stroke-width="0.6" opacity="${(0.08 + r() * 0.14).toFixed(2)}"/>`;
    }
    // 탁자 선
    s += `<line x1="0" y1="${table.toFixed(1)}" x2="${W}" y2="${(table + (r() - .5) * 8).toFixed(1)}" stroke="${c[0]}" stroke-width="1.6" opacity="0.55"/>`;
    // 사물 세 덩이
    const objs = [[cx - rr * 1.5, rr * 0.62], [cx, rr], [cx + rr * 1.35, rr * 0.48]];
    objs.forEach(([ox, orr], k) => {
      const top = table - orr * (1.5 + r() * 0.6);
      for (let p = 0; p < 7; p++) {
        const j = (r() - .5) * 3;
        s += `<path d="M${(ox - orr + j).toFixed(1)} ${(top + j).toFixed(1)}
              C${(ox - orr * 1.15 + j).toFixed(1)} ${(table - orr * 0.1).toFixed(1)} ${(ox + orr * 1.15 + j).toFixed(1)} ${(table - orr * 0.1).toFixed(1)} ${(ox + orr + j).toFixed(1)} ${(top + j).toFixed(1)}"
              fill="none" stroke="${c[0]}" stroke-width="${(0.6 + r() * 0.8).toFixed(2)}" opacity="${(0.3 + r() * 0.45).toFixed(2)}" stroke-linecap="round"/>`;
      }
      s += `<ellipse cx="${ox.toFixed(1)}" cy="${top.toFixed(1)}" rx="${orr.toFixed(1)}" ry="${(orr * 0.24).toFixed(1)}" fill="none" stroke="${c[0]}" stroke-width="1" opacity="0.5"/>`;
      // 그늘
      for (let p = 0; p < 16; p++) {
        const a = Math.PI * (0.15 + r() * 0.7);
        const x = ox + Math.cos(a) * orr * (0.2 + r() * 0.75);
        const y = top + (table - top) * (0.15 + r() * 0.8);
        s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 5 + r() * 9).toFixed(1)}" y2="${(y + 5 + r() * 9).toFixed(1)}" stroke="${c[0]}" stroke-width="0.7" opacity="${(0.12 + r() * 0.3).toFixed(2)}"/>`;
      }
    });
    return s;
  },
  vessel(r, W, H, c, uid) {
    let s = `<rect width="${W}" height="${H}" fill="${mix(c[2], '#ffffff', .35)}"/>`;
    const cx = W / 2, top = H * 0.16, bot = H * 0.9;
    const belly = W * (0.30 + r() * 0.06), neck = W * (0.10 + r() * 0.04), foot = W * (0.13 + r() * 0.03);
    const d = `M${cx - neck} ${top} C${cx - belly} ${top + (bot - top) * .3} ${cx - belly} ${bot - (bot - top) * .25} ${cx - foot} ${bot}
               L${cx + foot} ${bot} C${cx + belly} ${bot - (bot - top) * .25} ${cx + belly} ${top + (bot - top) * .3} ${cx + neck} ${top} Z`;
    s += `<path d="${d}" fill="${c[2]}"/>`;
    s += `<path d="${d}" fill="url(#vg-${uid})" />`;
    s += `<ellipse cx="${cx}" cy="${top}" rx="${neck}" ry="${(neck * 0.3).toFixed(1)}" fill="${mix(c[1], '#000000', .25)}" opacity="0.5"/>`;
    for (let i = 0; i < 4; i++) {
      s += `<ellipse cx="${(cx + (r() - .5) * belly).toFixed(0)}" cy="${(top + (bot - top) * (0.25 + r() * 0.5)).toFixed(0)}" rx="${(belly * (0.2 + r() * 0.3)).toFixed(0)}" ry="${(H * (0.04 + r() * 0.07)).toFixed(0)}" fill="${c[1]}" opacity="${(0.10 + r() * 0.16).toFixed(2)}"/>`;
    }
    s += `<ellipse cx="${cx}" cy="${(bot + H * .012).toFixed(0)}" rx="${(foot * 1.7).toFixed(0)}" ry="${(H * .012).toFixed(0)}" fill="${c[1]}" opacity="0.28"/>`;
    return `<defs><linearGradient id="vg-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c[1]}" stop-opacity="0.35"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${c[1]}" stop-opacity="0.28"/></linearGradient></defs>` + s;
  },
  waves(r, W, H, c) {
    let s = `<rect width="${W}" height="${H}" fill="${c[2]}"/>`;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const y = H * (0.12 + (i / n) * 0.82);
      const amp = H * (0.006 + (i / n) * 0.03) * (0.6 + r() * 0.8);
      let d = `M0 ${y.toFixed(1)}`;
      for (let x = 0; x <= W; x += W / 16) {
        d += ` Q${(x + W / 32).toFixed(1)} ${(y + (r() - .5) * amp * 4).toFixed(1)} ${(x + W / 16).toFixed(1)} ${y.toFixed(1)}`;
      }
      s += `<path d="${d}" fill="none" stroke="${mix(c[0], c[1], i / n)}" stroke-width="${(1 + (i / n) * 3.2).toFixed(2)}" opacity="${(0.35 + (i / n) * 0.5).toFixed(2)}"/>`;
    }
    s += `<rect width="${W}" height="${(H * 0.12).toFixed(0)}" fill="${mix(c[1], '#ffffff', .6)}"/>`;
    return s;
  },
  threads(r, W, H, c) {
    let s = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    const n = 60;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W + (r() - .5) * (W / n);
      const top = H * r() * 0.25, bot = H * (0.75 + r() * 0.25);
      s += `<line x1="${x.toFixed(1)}" y1="${top.toFixed(1)}" x2="${(x + (r() - .5) * W * 0.04).toFixed(1)}" y2="${bot.toFixed(1)}" stroke="${r() > 0.82 ? c[2] : c[1]}" stroke-width="${(0.4 + r() * 1.1).toFixed(2)}" opacity="${(0.25 + r() * 0.65).toFixed(2)}"/>`;
    }
    s += `<ellipse cx="${(W * (0.3 + r() * 0.4)).toFixed(0)}" cy="${(H * 0.2).toFixed(0)}" rx="${(W * 0.42).toFixed(0)}" ry="${(H * 0.26).toFixed(0)}" fill="${c[2]}" opacity="0.16"/>`;
    return s;
  },
  blocks(r, W, H, c) {
    let s = `<rect width="${W}" height="${H}" fill="${mix(c[1], '#fffdf6', .62)}"/>`;
    for (let i = 0; i < 9; i++) {
      const w = W * (0.16 + r() * 0.4), h = H * (0.1 + r() * 0.35);
      s += `<rect x="${(r() * (W - w)).toFixed(0)}" y="${(r() * (H - h)).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${(W * 0.01).toFixed(0)}" fill="${[c[0], c[1], c[2]][Math.floor(r() * 3)]}" opacity="${(0.25 + r() * 0.45).toFixed(2)}"/>`;
    }
    const dw = W * 0.18, dh = H * 0.3;
    s += `<rect x="${(W * 0.5 - dw / 2).toFixed(0)}" y="${(H - dh * 1.05).toFixed(0)}" width="${dw.toFixed(0)}" height="${dh.toFixed(0)}" fill="${c[0]}" opacity="0.95"/>`;
    return s;
  },
  stone(r, W, H, c, uid) {
    let s = `<rect width="${W}" height="${H}" fill="${mix(c[2], '#ffffff', .45)}"/>`;
    const cx = W / 2, cy = H * 0.56, rx = W * 0.33, ry = H * 0.3;
    // 깎은 돌의 윤곽 — 꼭짓점을 잡은 뒤 중점끼리 곡선으로 이어 모서리를 둥글린다
    const pts = 14, P = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const k = 0.84 + r() * 0.26;
      P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let d = 'M' + mid(P[pts - 1], P[0]).map(n => n.toFixed(1)).join(' ');
    for (let i = 0; i < pts; i++) {
      const m = mid(P[i], P[(i + 1) % pts]);
      d += ` Q${P[i][0].toFixed(1)} ${P[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    }
    s += `<path d="${d} Z" fill="${c[0]}"/>`;
    s += `<path d="${d} Z" fill="url(#sg-${uid})"/>`;
    for (let i = 0; i < 20; i++) {
      s += `<circle cx="${(cx + (r() - .5) * rx * 1.5).toFixed(1)}" cy="${(cy + (r() - .5) * ry * 1.5).toFixed(1)}" r="${(1 + r() * 4).toFixed(1)}" fill="${c[1]}" opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>`;
    }
    s += `<ellipse cx="${cx}" cy="${(cy + ry * 1.02).toFixed(0)}" rx="${(rx * 1.1).toFixed(0)}" ry="${(H * 0.022).toFixed(0)}" fill="${c[1]}" opacity="0.3"/>`;
    return `<defs><radialGradient id="sg-${uid}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.25"/></radialGradient></defs>` + s;
  }
};

/* 작품 한 점의 자리그림 SVG 문자열을 돌려준다 */
function artSVG(work, artist) {
  const ratio = ratioOf(work.size);
  const W = 400, H = Math.round(W / ratio);
  const c = (artist && artist.palette) || ['#8a8178', '#bcb4aa', '#efece6'];
  const draw = STYLES[work.style] || STYLES.layers;
  const body = draw(rng(work.seed || 1), W, H, c, work.id || work.seed);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${work.title} 자리그림" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}
