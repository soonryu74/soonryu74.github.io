// Extension loader. Each entry is a folder under web/js/ext/ whose index.js exports install(app) (sync or async).
// `app` is the API object built in main.js (also window.__app). A missing folder is fine: it is reported with
// console.info and skipped, so an extension can be left out without breaking the app. A failing install() is logged
// as an error and does not stop the others. Modules are fetched in parallel and installed in list order.
// layers/: static map layers (roads, rail, ports, forts, wonders, trade routes) and their toggles.
const MODULES = []; // 한국판: City View·Advisors·Layers(미국 자료 전용)는 넣지 않음

export async function installExtensions(app, list = MODULES) {
  const loads = list.map((spec) => import(spec).then((m) => ({ m }), (err) => ({ err })));
  const installed = [];
  for (let k = 0; k < list.length; k++) {
    const spec = list[k];
    const { m, err } = await loads[k];
    if (err) {
      console.info(`extension ${spec} not loaded (${err.message || err})`);
      continue;
    }
    if (typeof m.install !== "function") {
      console.info(`extension ${spec} has no install(app); skipped`);
      continue;
    }
    try {
      await m.install(app);
      installed.push(spec);
    } catch (e) {
      console.error(`extension ${spec} failed to install`, e);
    }
  }
  app.extensions = installed;
  app.emit?.("extensions", installed);
  return installed;
}
