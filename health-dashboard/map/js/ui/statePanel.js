// 한국판: 시도 패널(건강 지표 + 인구가 많은 시군구). 원본(usaciv)의 경제 패널 대신 ui/healthPanel.js 를 쓴다.
import { css } from "../color.js";
import { showPanel } from "./infoPanel.js";
import { stateHtml } from "./healthPanel.js";

/**
 * Opens the panel for 시도 `idx` (index into world.json states / states.json).
 * ctx: {w, nation, states (states.json or null), cities, onClose, onPedia, onCity(city)}
 */
export function openStatePanel(idx, ctx) {
  const { w } = ctx;
  const geo = w.raw.states[idx] || {};
  let st = ctx.states?.[idx];
  if (st && geo.fips && st.fips && st.fips !== geo.fips) st = ctx.states.find((s) => s.fips === geo.fips);
  st = st || { ...geo };
  const h = stateHtml(st, ctx.cities || []);
  showPanel({
    kind: "state",
    stripe: css(w.stateColor[idx] || [190, 190, 190]),
    title: st.name || geo.name || "",
    sub: h.sub,
    headExtra: h.head,
    sections: h.sections,
    foot: h.foot,
    onClose: ctx.onClose,
    onPedia: ctx.onPedia,
    wire(panel) {
      panel.querySelectorAll("[data-city]").forEach((b) => {
        b.onclick = () => {
          const c = ctx.cities.find((x) => x.id === b.dataset.city);
          if (c) ctx.onCity(c);
        };
      });
    },
  });
}
