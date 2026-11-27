// 한국판: 시군구 패널(건강 지표). 원본(usaciv)의 경제 패널 대신 ui/healthPanel.js 의 내용을 띄운다.
import { css } from "../color.js";
import { showPanel, hidePanel } from "./infoPanel.js";
import { cityHtml } from "./healthPanel.js";

/**
 * ctx: {w, nation, onClose, onPedia, onState(stateIndex)}
 */
export function openCityPanel(city, ctx) {
  const { w } = ctx;
  const owner = city.cell != null ? w.raw.owner[city.cell] : -1;
  const col = css(w.stateColor[owner] || [190, 190, 190]);
  const h = cityHtml(city);
  const sidoBtn = owner >= 0 && ctx.onState
    ? `<div class="chips"><button class="chip" data-state="${owner}">${w.raw.states[owner].name} 보기</button></div>`
    : "";
  showPanel({
    kind: "city",
    stripe: col,
    title: city.name,
    sub: h.sub + sidoBtn,
    headExtra: h.head,
    sections: h.sections,
    foot: h.foot,
    onClose: ctx.onClose,
    onPedia: ctx.onPedia,
    wire(panel) {
      panel.querySelectorAll("[data-state]").forEach((b) => (b.onclick = () => ctx.onState(+b.dataset.state)));
    },
  });
}

export const closeCityPanel = hidePanel;
