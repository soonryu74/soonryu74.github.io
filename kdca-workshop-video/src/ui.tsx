import React from "react";
import "@fontsource/noto-serif-kr/700.css";
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const FONT = "Pretendard, sans-serif";
export const C = {
  bg: "#050b18",
  ink: "#f4f7fb",
  dim: "rgba(244,247,251,0.62)",
  faint: "rgba(244,247,251,0.14)",
  world: "#ffb547",
  us: "#35d0ba",
};

// 폰트 로딩 (렌더 전에 반드시 완료)
const weights: [string, string][] = [
  ["Light", "300"],
  ["Medium", "500"],
  ["Bold", "700"],
  ["Black", "900"],
];
if (typeof document !== "undefined") {
  const handle = delayRender("fonts");
  Promise.all(
    weights.map(([name, weight]) => {
      const f = new FontFace("Pretendard", `url(${staticFile(`fonts/Pretendard-${name}.woff2`)})`, { weight });
      return f.load().then((l) => document.fonts.add(l));
    })
  )
    .then(() => document.fonts.load('700 80px "Noto Serif KR"', "(意論)音心言侖"))
    .then(() => continueRender(handle));
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** 0→1 등장 스프링 */
export const useIn = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

/** 구간 끝에서 1→0 */
export const useOut = (dur: number, len = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - len, dur], [1, 0], clamp);
};

/** 움직이는 배경: 그라데이션 + 격자 + 떠다니는 입자 */
export const Backdrop: React.FC<{ color: string; frame: number }> = ({ color, frame }) => {
  const dots = React.useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return { x: r(1) * 1920, y: r(2) * 1080, s: 2 + r(3) * 5, v: 0.15 + r(4) * 0.5, p: r(5) * 6.28 };
      }),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -200,
          background: `radial-gradient(900px 700px at ${30 + Math.sin(frame / 140) * 8}% ${35 + Math.cos(frame / 170) * 8}%, ${color}55, transparent 70%), radial-gradient(1000px 800px at ${75 + Math.cos(frame / 160) * 8}% ${70 + Math.sin(frame / 130) * 8}%, #1b3a8a66, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage: `linear-gradient(${C.faint} 1px, transparent 1px), linear-gradient(90deg, ${C.faint} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `${-(frame * 0.4) % 96}px 0`,
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 78%)",
        }}
      />
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x + Math.sin(frame / 60 + d.p) * 24,
            top: (((d.y - frame * d.v) % 1080) + 1080) % 1080,
            width: d.s,
            height: d.s,
            borderRadius: 99,
            background: i % 3 === 0 ? color : "#fff",
            opacity: 0.12 + 0.2 * Math.abs(Math.sin(frame / 40 + d.p)),
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 320px 80px rgba(0,0,0,0.75)" }} />
    </div>
  );
};

/** 숫자가 굴러가는 연도 표시 */
export const Odometer: React.FC<{ value: number; size: number; color?: string }> = ({ value, size, color = C.ink }) => {
  const digits = [1000, 100, 10, 1].map((p) => {
    // 각 자리의 연속 값 (자리올림 시 함께 굴러감)
    const base = Math.floor(value / p) % 10;
    const carry = p === 1 ? value - Math.floor(value) : Math.max(0, (value % p) - (p - 1));
    return base + carry;
  });
  const h = size * 1.04;
  return (
    <div style={{ display: "flex", height: h, overflow: "hidden", fontFamily: FONT, fontWeight: 900, fontSize: size, color, letterSpacing: -size * 0.03, lineHeight: `${h}px`, fontVariantNumeric: "tabular-nums" }}>
      {digits.map((d, i) => (
        <div key={i} style={{ transform: `translateY(${-d * h}px)`, width: size * 0.62, textAlign: "center" }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, j) => (
            <div key={j} style={{ height: h }}>
              {n}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/** 아래에서 위로 닦아 올라오는 글줄 */
export const Rise: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const p = useIn(delay);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 105}%)`, opacity: Math.min(1, p * 2) }}>{children}</div>
    </div>
  );
};

/** 내레이션 자막 (한국어 + 영어) */
export const Caption: React.FC<{ text: string; en?: string; frames: number }> = ({ text, en, frames }) => {
  const frame = useCurrentFrame();
  const parts = text.split("|");
  const ens = (en ?? "").split("|");
  // 글자 수 비율로 구간 분할
  const total = parts.reduce((a, p) => a + p.length, 0);
  let idx = 0;
  let acc = 0;
  let startAt = 0;
  for (let i = 0; i < parts.length; i++) {
    const end = acc + (parts[i].length / total) * frames;
    if (frame >= acc) {
      idx = i;
      startAt = acc;
    }
    acc = end;
  }
  const o = Math.min(interpolate(frame - startAt, [0, 8], [0, 1], clamp), interpolate(frame, [frames - 6, frames + 4], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ background: "rgba(3,8,18,0.82)", padding: "10px 30px 12px", borderRadius: 10, textAlign: "center", maxWidth: 1640 }}>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 34, color: C.ink, letterSpacing: -0.3 }}>{parts[idx]}</div>
        {ens[idx] ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 23, color: "rgba(244,247,251,0.66)", marginTop: 3 }}>{ens[idx]}</div> : null}
      </div>
    </div>
  );
};
