import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTS, ACT_CARD, FPS, OPENING, OUTRO, OUTRO_FROM, SEGS, TOTAL, YEAR_SEGS, YearItem, Act, actFrom } from "./data";
import cues from "./narration.json";
import durations from "./durations.json";
import { Backdrop, C, Caption, FONT, Odometer, Rise, clamp, ease, useIn, useOut } from "./ui";

/* ───────────────────────── 오프닝 (뉴스 스타일) ───────────────────────── */

const FLASH: [number, string][] = [
  [2008, "숭례문"],
  [2010, "밴쿠버의 금빛"],
  [2012, "강남스타일"],
  [2014, "그해 봄"],
  [2016, "알파고"],
  [2018, "평창"],
  [2019, "기생충"],
  [2021, "누리호"],
  [2022, "월드컵 16강"],
  [2024, "노벨문학상"],
];
const FLASH_LEN = 24;
const TITLE_AT = FLASH.length * FLASH_LEN; // 240
const CONCEPT_AT = 540;

/** 워크샵 컨셉: 감염병위기관리국 의논(意論)하다 */
const HANJA = '"Noto Serif KR", serif';
const Concept: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows: [string, [string, string][]][] = [
    ["意", [["音", "소리 음"], ["心", "마음 심"]]],
    ["論", [["言", "말씀 언"], ["侖", "둥글 륜"]]],
  ];
  const head = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: interpolate(frame, [0, 14], [0, 1], clamp) }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 12, color: C.world, opacity: head }}>2026 워크샵</div>
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 60, color: C.ink, letterSpacing: -1.5, marginTop: 18, opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>감염병위기관리국</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4, overflow: "hidden", paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", transform: `translateY(${(1 - spring({ frame: frame - 14, fps, config: { damping: 200 } })) * 110}%)` }}>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: C.us, letterSpacing: -5 }}>의논</span>
          <span style={{ fontFamily: HANJA, fontWeight: 700, fontSize: 96, color: C.ink, margin: "0 14px" }}>(意論)</span>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: C.ink, letterSpacing: -5 }}>하다</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 110, marginTop: 34 }}>
        {rows.map(([whole, parts], r) => {
          const at = 50 + r * 34;
          const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 120 } });
          const merge = spring({ frame: frame - at - 22, fps, config: { damping: 200 } });
          return (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, p * 2) }}>
              <div style={{ fontFamily: HANJA, fontWeight: 700, fontSize: 124, color: C.us, lineHeight: 1, transform: `scale(${0.7 + merge * 0.3})`, opacity: merge, textShadow: `0 0 50px ${C.us}88` }}>{whole}</div>
              <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 60, color: C.dim, opacity: merge }}>=</div>
              {parts.map(([h, k], i) => (
                <React.Fragment key={i}>
                  {i === 1 ? <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 56, color: C.dim }}>+</div> : null}
                  <div style={{ textAlign: "center", transform: `translateY(${(1 - p) * (i === 0 ? -50 : 50)}px)` }}>
                    <div style={{ fontFamily: HANJA, fontWeight: 700, fontSize: 92, color: C.ink, lineHeight: 1.05 }}>{h}</div>
                    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: C.world, marginTop: 8, letterSpacing: -0.5 }}>{k}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 42, color: C.ink, marginTop: 54, letterSpacing: -1, opacity: interpolate(frame, [128, 152], [0, 1], clamp) }}>
        마음의 소리를, 둥글게 모여 말하다
      </div>
    </AbsoluteFill>
  );
};

const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = Math.min(FLASH.length - 1, Math.floor(frame / FLASH_LEN));
  const lf = frame - i * FLASH_LEN;
  const punch = spring({ frame: lf, fps, config: { damping: 14, stiffness: 220 } });
  const inFlash = frame < TITLE_AT;
  const tf = frame - TITLE_AT;
  const words = ["그 세상,", "그 시간,", "그리고 우리"];
  const out = interpolate(frame, [OPENING - 14, OPENING], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop color={inFlash ? "#c8102e" : "#2b6fff"} frame={frame} />
      {inFlash ? (
        <AbsoluteFill>
          {/* 뉴스 속보 바 */}
          <div style={{ position: "absolute", top: 70, left: 90, display: "flex", alignItems: "center", gap: 18, fontFamily: FONT }}>
            <div style={{ background: "#e11d2e", color: "#fff", fontWeight: 900, fontSize: 34, padding: "8px 22px", letterSpacing: 4 }}>NEWS</div>
            <div style={{ width: 16, height: 16, borderRadius: 99, background: "#e11d2e", opacity: frame % 20 < 10 ? 1 : 0.25 }} />
            <div style={{ color: C.dim, fontWeight: 500, fontSize: 30, letterSpacing: 6 }}>대한민국 · 2007 — 2026</div>
          </div>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 170,
                lineHeight: 1,
                color: "transparent",
                WebkitTextStroke: "3px rgba(255,255,255,0.55)",
                transform: `scale(${1.25 - punch * 0.25})`,
                letterSpacing: -4,
                marginBottom: 24,
              }}
            >
              {FLASH[i][0]}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 190,
                color: C.ink,
                letterSpacing: -4,
                transform: `translateY(${(1 - punch) * 60}px) scale(${0.9 + punch * 0.1})`,
                opacity: Math.min(1, lf / 3),
                textShadow: "0 12px 60px rgba(0,0,0,0.7)",
              }}
            >
              {FLASH[i][1]}
            </div>
          </AbsoluteFill>
          {/* 장면 전환 플래시 */}
          <AbsoluteFill style={{ background: "#fff", opacity: interpolate(lf, [0, 5], [0.55, 0], clamp) }} />
          {/* 하단 티커 */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 86, background: "rgba(225,29,46,0.92)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 20, whiteSpace: "nowrap", fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#fff", transform: `translateX(${-frame * 9}px)`, letterSpacing: 1 }}>
              {new Array(3).fill(YEAR_SEGS.map((s) => `${s.item.year}  ${s.item.world[0]}`).join("   ◆   ")).join("   ◆   ")}
            </div>
          </div>
        </AbsoluteFill>
      ) : frame >= CONCEPT_AT ? (
        <Sequence from={CONCEPT_AT}>
          <Concept />
        </Sequence>
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: interpolate(frame, [CONCEPT_AT - 14, CONCEPT_AT], [1, 0], clamp) }}>
          <AbsoluteFill style={{ background: "#fff", opacity: interpolate(tf, [0, 14], [0.9, 0], clamp) }} />
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 40, letterSpacing: 18, color: C.world, opacity: interpolate(tf, [10, 30], [0, 1], clamp), marginBottom: 36 }}>
            2007 ~ 2026
          </div>
          <div style={{ display: "flex", gap: 34, fontFamily: FONT, fontWeight: 900, fontSize: 128, letterSpacing: -4 }}>
            {words.map((w, k) => {
              const p = spring({ frame: tf - 24 - k * 22, fps, config: { damping: 200 } });
              return (
                <div key={k} style={{ overflow: "hidden", paddingBottom: 14 }}>
                  <div style={{ transform: `translateY(${(1 - p) * 110}%)`, color: k === 2 ? C.us : C.ink }}>{w}</div>
                </div>
              );
            })}
          </div>
          <div style={{ width: interpolate(tf, [70, 120], [0, 760], { ...clamp, easing: ease }), height: 4, background: `linear-gradient(90deg, ${C.world}, ${C.us})`, marginTop: 30, borderRadius: 4 }} />
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 40, color: C.dim, marginTop: 40, opacity: interpolate(tf, [110, 140], [0, 1], clamp), letterSpacing: -0.5 }}>
            세상은 얼마나 변했고, 그 사이 우리는 어디까지 왔을까
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "rgba(244,247,251,0.45)", marginTop: 18, opacity: interpolate(tf, [125, 155], [0, 1], clamp), letterSpacing: 8 }}>
            THE WORLD, THE TIME, AND US
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ───────────────────────── 막 제목 카드 ───────────────────────── */

const ActCard: React.FC<{ act: Act }> = ({ act }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200 } });
  const out = useOut(ACT_CARD, 10);
  const wipe = interpolate(frame, [0, 16], [0, 100], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ opacity: out, clipPath: `inset(0 ${100 - wipe}% 0 0)`, background: "rgba(3,7,16,0.94)", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ position: "absolute", fontFamily: FONT, fontWeight: 900, fontSize: 760, color: "transparent", WebkitTextStroke: `2px ${act.color}33`, transform: `translateX(${(1 - p) * 120}px)`, lineHeight: 1 }}>
        {act.no}
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, letterSpacing: 14, color: act.color, transform: `translateY(${(1 - p) * 30}px)`, opacity: p }}>
        제 {act.no} 막 · {act.range}
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 124, color: C.ink, letterSpacing: -4, marginTop: 20, overflow: "hidden", paddingBottom: 12 }}>
        <div style={{ transform: `translateY(${(1 - spring({ frame: frame - 8, fps, config: { damping: 200 } })) * 110}%)` }}>{act.name}</div>
      </div>
      <div style={{ height: 5, width: interpolate(frame, [14, 50], [0, 520], { ...clamp, easing: ease }), background: act.color, marginTop: 22, borderRadius: 4 }} />
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 32, letterSpacing: 10, color: C.dim, marginTop: 26, opacity: interpolate(frame, [20, 40], [0, 1], clamp) }}>{act.en}</div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 연도 장면 (좌: 세상 / 우: 우리) ───────────────────────── */

const WorldCard: React.FC<{ text: string; i: number; dur: number; lead: boolean }> = ({ text, i, dur, lead }) => {
  const p = useIn(8 + i * 9, 26);
  const out = useOut(dur - i * 2, 10);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: lead ? "38px 36px" : "32px 36px",
        background: lead ? "linear-gradient(90deg, rgba(255,181,71,0.2), rgba(255,181,71,0.04))" : "rgba(255,255,255,0.05)",
        borderLeft: `6px solid ${lead ? C.world : "rgba(255,181,71,0.45)"}`,
        borderRadius: 6,
        transform: `translateX(${(1 - p) * -140 + (1 - out) * -60}px)`,
        opacity: Math.min(1, p * 1.5) * out,
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: C.world, opacity: 0.9, width: 44 }}>0{i + 1}</div>
      <div style={{ fontFamily: FONT, fontWeight: lead ? 700 : 500, fontSize: lead ? 50 : 41, color: C.ink, letterSpacing: -1.2, lineHeight: 1.25, wordBreak: "keep-all" }}>{text}</div>
    </div>
  );
};

const YearScene: React.FC<{ item: YearItem; act: Act; dur: number }> = ({ item, act, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = useOut(dur, 10);
  const org = item.year >= 2020 && !(item.year === 2020 && frame < (item.extra?.at ?? 0)) ? "질병관리청" : "질병관리본부";
  const lines = item.title.split("\n");
  const start = 44; // 우측(우리)은 세상 뉴스 뒤에 등장
  const sweep = interpolate(frame, [start, start + 26], [-30, 130], clamp);
  const ex = item.extra;
  const exP = ex ? spring({ frame: frame - ex.at, fps, config: { damping: 12, stiffness: 130 } }) : 0;
  const ring = ex ? interpolate(frame - ex.at, [0, 40], [0, 1], clamp) : 0;

  return (
    <AbsoluteFill>
      {/* 좌: 그 세상 */}
      <div style={{ position: "absolute", left: 90, top: 300, width: 810, display: "flex", flexDirection: "column", gap: 28 }}>
        {item.world.map((w, i) => (
          <WorldCard key={i} text={w} i={i} dur={dur} lead={i === 0} />
        ))}
      </div>

      {/* 우: 그리고 우리 */}
      <div style={{ position: "absolute", left: 1030, top: 286, width: 810, opacity: out, transform: `translateX(${(1 - out) * 60}px)` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, opacity: useIn(start - 6), marginBottom: 22 }}>
          <div style={{ width: 14, height: 14, borderRadius: 99, background: act.color, boxShadow: `0 0 20px ${act.color}` }} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: act.color, letterSpacing: 2 }}>{org}</div>
        </div>
        <div style={{ position: "relative" }}>
          {lines.map((l, i) => (
            <Rise key={i} delay={start + i * 7} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 82, lineHeight: 1.16, color: C.ink, letterSpacing: -3 }}>
              {l}
            </Rise>
          ))}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${sweep - 14}%, rgba(255,255,255,0.35) ${sweep}%, transparent ${sweep + 14}%)`, mixBlendMode: "overlay", pointerEvents: "none" }} />
        </div>
        <div style={{ height: 5, width: interpolate(frame, [start + 16, start + 46], [0, 150], { ...clamp, easing: ease }), background: act.color, margin: "26px 0 24px", borderRadius: 4 }} />
        <Rise delay={start + 22} style={{ fontFamily: FONT, fontWeight: 500, fontSize: 36, color: C.dim, letterSpacing: -0.8, lineHeight: 1.35 }}>
          {item.sub}
        </Rise>

        {item.stat ? (
          <div style={{ marginTop: 24, display: "flex", alignItems: "baseline", gap: 18, opacity: interpolate(frame, [start + 40, start + 55], [0, 1], clamp) }}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1, color: act.color, letterSpacing: -6, fontVariantNumeric: "tabular-nums", textShadow: `0 0 60px ${act.color}88` }}>
              {Math.round(interpolate(frame, [start + 40, start + 100], [item.stat.from ?? 0, item.stat.value], { ...clamp, easing: ease }))}
              <span style={{ fontSize: 64, letterSpacing: -2 }}>{item.stat.unit}</span>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: C.ink, letterSpacing: -0.8 }}>{item.stat.label}</div>
          </div>
        ) : null}

        {ex && frame >= ex.at ? (
          <div style={{ marginTop: 30, position: "relative", display: "inline-block" }}>
            <div style={{ position: "absolute", inset: -8, border: `3px solid ${act.color}`, borderRadius: 16, transform: `scale(${1 + ring * 0.22})`, opacity: 1 - ring }} />
            <div style={{ transform: `scale(${0.6 + exP * 0.4})`, transformOrigin: "left center", opacity: Math.min(1, exP * 2), background: `linear-gradient(135deg, ${act.color}, ${act.color}aa)`, padding: "22px 36px 24px", borderRadius: 12, boxShadow: `0 18px 70px ${act.color}66` }}>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 68, color: "#04101f", letterSpacing: -2, lineHeight: 1.1 }}>{ex.big}</div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 29, color: "#04101fcc", marginTop: 8, letterSpacing: -0.5 }}>{ex.small}</div>
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 연대기 본편 (상단 연도 · 하단 타임라인 고정) ───────────────────────── */

const Chronicle: React.FC = () => {
  const frame = useCurrentFrame(); // 0 = 본편 시작
  const { fps } = useVideoConfig();
  const abs = frame + OPENING;
  // 현재 연도(연속 값): 연도 장면이 시작될 때 굴러 넘어감
  let yearVal = 2007;
  let cur = YEAR_SEGS[0];
  for (const s of YEAR_SEGS) {
    if (abs >= s.from - 6) {
      const p = spring({ frame: abs - (s.from - 6), fps, config: { damping: 200 }, durationInFrames: 22 });
      yearVal = s.item.year - 1 + p;
      cur = s;
    }
  }
  yearVal = Math.max(2007, yearVal);
  const prog = interpolate(abs, [YEAR_SEGS[0].from, OUTRO_FROM], [0, 1], clamp);
  // 타임라인 위 위치: 연도 기준
  const tl = (yearVal - 2007) / 19;
  const intro = interpolate(frame, [0, 20], [0, 1], clamp);
  const outro = interpolate(abs, [OUTRO_FROM - 12, OUTRO_FROM], [1, 0], clamp);
  const color = cur.act.color;
  const isClinic = cur.item.year >= 2020 && !(cur.item.year === 2020 && abs - cur.from < (cur.item.extra?.at ?? 0));

  return (
    <AbsoluteFill style={{ opacity: outro }}>
      <Backdrop color={color} frame={abs} />

      {/* 상단: 좌우 라벨 + 중앙 연도 */}
      <div style={{ position: "absolute", top: 64, left: 90, opacity: intro }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 56, color: C.world, letterSpacing: -1.5 }}>그 세상</div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.dim, letterSpacing: 6, marginTop: 4 }}>대한민국 뉴스 · THE WORLD</div>
      </div>
      <div style={{ position: "absolute", top: 64, right: 90, textAlign: "right", opacity: intro }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 56, color: color, letterSpacing: -1.5 }}>그리고 우리</div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.dim, letterSpacing: 6, marginTop: 4 }}>{isClinic ? "질병관리청 · KDCA" : "질병관리본부 · KCDC"}</div>
      </div>
      <div style={{ position: "absolute", top: 36, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: intro }}>
        <div style={{ padding: "0 34px", borderBottom: `5px solid ${color}`, filter: `drop-shadow(0 10px 40px ${color}88)` }}>
          <Odometer value={yearVal} size={190} />
        </div>
      </div>

      {/* 중앙 분할선 */}
      <div style={{ position: "absolute", left: 959, top: 320, width: 2, height: 520, background: `linear-gradient(${C.faint}, ${color}, ${C.faint})`, opacity: intro }} />
      <div style={{ position: "absolute", left: 952, top: 320 + ((abs * 3) % 520), width: 16, height: 16, borderRadius: 99, background: color, boxShadow: `0 0 24px ${color}`, opacity: 0.9 * intro }} />

      {/* 장면들 */}
      {SEGS.map((s) =>
        s.kind === "year" ? (
          <Sequence key={s.item.year} from={s.from - OPENING} durationInFrames={s.dur} layout="none">
            <YearScene item={s.item} act={s.act} dur={s.dur} />
          </Sequence>
        ) : null
      )}

      {/* 하단 타임라인 */}
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 134, height: 60, opacity: intro }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 4, background: C.faint, borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 0, width: `${tl * 100}%`, top: 20, height: 4, background: `linear-gradient(90deg, ${C.world}, ${color})`, borderRadius: 4 }} />
        {YEAR_SEGS.map((s, i) => {
          const done = s.item.year <= yearVal + 0.01;
          const now = s.item.year === cur.item.year;
          return (
            <div key={i} style={{ position: "absolute", left: `${(i / 19) * 100}%`, top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
              <div style={{ margin: "14px auto 0", width: now ? 18 : 10, height: now ? 18 : 10, marginTop: now ? 13 : 17, borderRadius: 99, background: done ? color : "rgba(255,255,255,0.3)", boxShadow: now ? `0 0 22px ${color}` : "none" }} />
              <div style={{ fontFamily: FONT, fontWeight: now ? 900 : 500, fontSize: now ? 24 : 19, color: now ? C.ink : "rgba(244,247,251,0.4)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
                {now || ((i % 3 === 0 || i === 19) && Math.abs(s.item.year - cur.item.year) > 1) ? (now ? s.item.year : `’${String(s.item.year).slice(2)}`) : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${prog * 100}%`, background: color, opacity: 0.8 }} />

      {/* 막 제목 카드 (본편 위에 덮임) */}
      {SEGS.map((s) =>
        s.kind === "act" ? (
          <Sequence key={"a" + s.act.no} from={s.from - OPENING} durationInFrames={s.dur}>
            <ActCard act={s.act} />
          </Sequence>
        ) : null
      )}
    </AbsoluteFill>
  );
};

/* ───────────────────────── 엔딩 ───────────────────────── */

const N5_AT = 240;
const N6_AT = 600;
const END_AT = 780;

const Shield: React.FC<{ p: number; glow: number }> = ({ p, glow }) => {
  const len = 1500;
  return (
    <svg width={420} height={480} viewBox="0 0 420 480" style={{ filter: `drop-shadow(0 0 ${30 + glow * 50}px ${C.us}${glow > 0.5 ? "cc" : "66"})` }}>
      <path d="M210 20 L390 86 V230 C390 340 318 420 210 460 C102 420 30 340 30 230 V86 Z" fill={`rgba(53,208,186,${0.1 * glow})`} stroke={C.us} strokeWidth={8} strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      <path d="M210 150 V310 M130 230 H290" stroke={C.ink} strokeWidth={22} strokeLinecap="round" strokeDasharray={330} strokeDashoffset={330 * (1 - glow)} opacity={0.95} />
    </svg>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], clamp);
  const fadeOut = interpolate(frame, [OUTRO - 60, OUTRO - 10], [1, 0], clamp);

  // 1) 20년의 기록이 흘러 올라감
  const wallO = interpolate(frame, [0, 20, 190, 225], [0, 1, 1, 0], clamp);
  const cnt = Math.round(interpolate(frame, [20, 150], [0, 20], { ...clamp, easing: ease }));
  // 2) 방패 + 핵심 메시지
  const sh = interpolate(frame, [215, 300], [0, 1], { ...clamp, easing: ease });
  const glow = interpolate(frame, [N5_AT + 165, N5_AT + 215], [0, 1], clamp);
  const msgO = interpolate(frame, [215, 235, 555, 580], [0, 1, 1, 0], clamp);
  const beats: [number, string, boolean][] = [
    [N5_AT + 4, "세상이 바뀌고, 숱한 위기가 찾아올 때", false],
    [N5_AT + 109, "질병관리청은 언제나", false],
    [N5_AT + 169, "국민의 가장 가까운 방패였습니다", true],
  ];
  // 3) 당신이 있었습니다
  const youO = interpolate(frame, [585, 605, 760, 782], [0, 1, 1, 0], clamp);
  const youP = spring({ frame: frame - N6_AT, fps, config: { damping: 200 }, durationInFrames: 50 });
  // 4) 엔드 카드
  const ef = frame - END_AT;

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, background: "#000" }}>
      <Backdrop color={C.us} frame={frame + 4000} />

      {/* 1 */}
      <AbsoluteFill style={{ opacity: wallO }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.5, maskImage: "linear-gradient(transparent, black 25%, black 75%, transparent)", WebkitMaskImage: "linear-gradient(transparent, black 25%, black 75%, transparent)" }}>
          {[0, 1].map((col) => (
            <div key={col} style={{ position: "absolute", left: col === 0 ? 90 : 1290, width: 540, top: 900 - frame * (5.2 + col * 0.9), textAlign: col === 0 ? "left" : "right" }}>
              {YEAR_SEGS.filter((_, i) => i % 2 === col).map((s) => (
                <div key={s.item.year} style={{ marginBottom: 70 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: s.act.color }}>{s.item.year}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.ink, letterSpacing: -1.2, lineHeight: 1.25, wordBreak: "keep-all" }}>{s.item.title.replace("\n", " ")}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 36, color: C.dim, letterSpacing: 10 }}>2007 → 2026</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 330, color: C.ink, lineHeight: 1.05, letterSpacing: -12, fontVariantNumeric: "tabular-nums", textShadow: "0 0 90px rgba(53,208,186,0.5)" }}>
            {cnt}
            <span style={{ fontSize: 130, letterSpacing: -4, color: C.us }}>년</span>
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: C.ink, opacity: interpolate(frame, [110, 135], [0, 1], clamp), letterSpacing: -1 }}>
            질병관리본부에서, 질병관리청으로
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.dim, letterSpacing: 6, marginTop: 14, opacity: interpolate(frame, [120, 145], [0, 1], clamp) }}>20 YEARS · FROM KCDC TO KDCA</div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 2 */}
      <AbsoluteFill style={{ opacity: msgO, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 90 }}>
        <div style={{ transform: `scale(${0.92 + glow * 0.08})` }}>
          <Shield p={sh} glow={glow} />
        </div>
        <div style={{ width: 1060 }}>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: C.dim, letterSpacing: 1, position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", opacity: glow }}>
            Whenever the world changed and crisis came, the KDCA was the nation’s closest shield.
          </div>
          {beats.map(([at, text, strong], i) => {
            const p = spring({ frame: frame - at, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 10 }}>
                <div style={{ fontFamily: FONT, fontWeight: strong ? 900 : 500, fontSize: strong ? 80 : 54, color: strong ? C.us : C.ink, letterSpacing: strong ? -3 : -1.5, lineHeight: 1.3, transform: `translateY(${(1 - p) * 110}%)` }}>{text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* 3 */}
      <AbsoluteFill style={{ opacity: youO, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 64, color: C.dim, letterSpacing: -1.5, opacity: youP }}>그 모든 시간에,</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 132, color: C.ink, letterSpacing: interpolate(youP, [0, 1], [10, -4]), marginTop: 10, opacity: interpolate(frame, [N6_AT + 34, N6_AT + 60], [0, 1], clamp), textShadow: "0 0 80px rgba(53,208,186,0.55)" }}>
          당신이 있었습니다
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: C.dim, letterSpacing: 3, marginTop: 34, opacity: interpolate(frame, [N6_AT + 50, N6_AT + 75], [0, 1], clamp) }}>Through all of it, there was you.</div>
      </AbsoluteFill>

      {/* 4 */}
      {ef >= 0 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: interpolate(ef, [0, 30], [0, 1], clamp) }}>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 38, letterSpacing: 18, color: C.world }}>2007 ~ 2026 ~</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 110, letterSpacing: -4, color: C.ink, marginTop: 26 }}>
            그 세상, 그 시간, <span style={{ color: C.us }}>그리고 우리</span>
          </div>
          <div style={{ width: interpolate(ef, [20, 80], [0, 760], { ...clamp, easing: ease }), height: 4, background: `linear-gradient(90deg, ${C.world}, ${C.us})`, marginTop: 30, borderRadius: 4 }} />
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 44, color: C.dim, marginTop: 44, letterSpacing: -1, opacity: interpolate(ef, [70, 110], [0, 1], clamp) }}>
            다음 페이지는, 우리가 함께 씁니다
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "rgba(244,247,251,0.45)", marginTop: 22, letterSpacing: 6, opacity: interpolate(ef, [90, 130], [0, 1], clamp) }}>
            KOREA DISEASE CONTROL AND PREVENTION AGENCY
          </div>
          <div style={{ position: "absolute", bottom: 70, fontFamily: FONT, fontWeight: 500, fontSize: 26, color: "rgba(244,247,251,0.6)", opacity: interpolate(ef, [100, 140], [0, 1], clamp) }}>
            이 영상은 AI로 제작되었습니다 (영상 · 내레이션 · 음악)
          </div>
        </AbsoluteFill>
      ) : null}

    </AbsoluteFill>
  );
};

/* ───────────────────────── 오디오 ───────────────────────── */

const A1 = actFrom(1);
const A2 = actFrom(2);
const A3 = actFrom(3);
const scopeFrom = (scope: string) =>
  scope === "opening" ? 0 : scope === "outro" ? OUTRO_FROM : scope.startsWith("act") ? actFrom(Number(scope.slice(3))) : YEAR_SEGS.find((s) => String(s.item.year) === scope)!.from;
const CUES = (cues as { id: string; scope: string; at: number; ko: string; en: string }[]).map((c) => ({
  ...c,
  from: scopeFrom(c.scope) + c.at,
  len: (durations as Record<string, number>)[c.id],
}));
const duck = (abs: number) => {
  let d = 1;
  for (const c of CUES) {
    d = Math.min(d, interpolate(abs, [c.from - 12, c.from, c.from + c.len, c.from + c.len + 18], [1, 0.3, 0.3, 1], clamp));
  }
  return d;
};

const Music: React.FC<{ file: string; from: number; dur: number; startSec: number; vol: number; fadeIn?: number; fadeOut?: number }> = ({ file, from, dur, startSec, vol, fadeIn = 15, fadeOut = 30 }) => (
  <Sequence from={from} durationInFrames={dur} layout="none">
    <Audio
      src={staticFile(`audio/${file}.mp3`)}
      startFrom={Math.round(startSec * FPS)}
      volume={(f) => vol * duck(f + from) * Math.min(interpolate(f, [0, fadeIn], [0, 1], clamp), interpolate(f, [dur - fadeOut, dur], [1, 0], clamp))}
    />
  </Sequence>
);

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Sequence durationInFrames={OPENING}>
      <Opening />
    </Sequence>
    <Sequence from={OPENING} durationInFrames={OUTRO_FROM - OPENING}>
      <Chronicle />
    </Sequence>
    <Sequence from={OUTRO_FROM} durationInFrames={OUTRO}>
      <Outro />
    </Sequence>

    {/* AI 제작 표기 (상시) */}
    <div style={{ position: "absolute", top: 16, right: 28, fontFamily: FONT, fontWeight: 500, fontSize: 20, color: "rgba(244,247,251,0.6)", letterSpacing: 0.5 }}>AI로 제작되었습니다</div>

    {/* 음악: 뉴스 오프닝 → 메인 비트 → (2015 피아노) → 메인 비트 → 클라이맥스 */}
    <Music file="m1_news" from={0} dur={560} startSec={0} vol={0.6} fadeIn={2} />
    <Music file="m2_beat" from={530} dur={A2 - 530 + 15} fadeIn={40} startSec={0} vol={0.55} />
    <Music file="m3_climax" from={A2} dur={A3 - A2 + 15} startSec={0} vol={0.9} fadeIn={30} />
    <Music file="m2_beat" from={A3} dur={OUTRO_FROM - A3 + 20} startSec={58} vol={0.55} fadeOut={45} />
    <Music file="m3_climax" from={OUTRO_FROM - 10} dur={TOTAL - OUTRO_FROM + 10} startSec={134.5} vol={0.85} fadeIn={30} fadeOut={60} />

    {CUES.map((c) => (
      <Sequence key={c.id} from={c.from} durationInFrames={c.len + 4} layout="none">
        <Audio src={staticFile(`audio/${c.id}.mp3`)} volume={1.7} />
        {c.scope === "outro" ? null : <Caption text={c.ko} en={c.en} frames={c.len} />}
      </Sequence>
    ))}
  </AbsoluteFill>
);

void ACTS;
