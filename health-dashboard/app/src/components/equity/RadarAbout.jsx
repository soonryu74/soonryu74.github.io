import { INDICATORS, HC_POOL, YEARS_ALL, SIDOS, label } from "../../data";
import { CORE, WEIGHTS } from "../../lib/equity";
import CONTACT from "../../../../data/contact.json";
import REV from "../../../../data/reviews.json";
import VS from "../../../../data/validation_summary.json";
import { isSurvey } from "../../data";
import UsabilityFeedback from "../UsabilityFeedback";

/* English overview (MIT Solve / international reviewers). Every number below is computed from the loaded data — nothing is typed in by hand.
   States only what exists today: a working Korean deployment. No users, partners, impact, revenue or AI-performance claims. */
const DOMAIN_EN = [
  ["Health behaviors (smoking, alcohol, physical activity, diet and obesity)", ["흡연", "음주", "신체활동", "식생활·비만"]],
  ["Mental and oral health", ["정신건강", "구강건강"]],
  ["Chronic disease awareness and management", ["만성질환"]],
  ["Prevention and safety", ["예방·안전"]],
  ["Health care use and screening", ["의료이용", "의료이용·검진", "암검진"]],
  ["Mortality (age-standardized)", ["사망률(표준화)"]],
  ["Notifiable infectious diseases", ["감염병 발생률"]],
  ["Health system resources", ["보건의료자원"]],
  ["Population, social, economic and environmental context", ["인구·사회·경제", "환경·안전"]],
  ["Healthy life expectancy", ["건강수명"]],
  ["Area deprivation index", ["지역박탈"]],
];
const STEPS = [["Data", "Official statistics for every local jurisdiction, 2008 onward"], ["Compare", "Each area against the national median and its peers"], ["Identify gaps", "Direction-aware gaps, ranks and recent trends"], ["Prioritize", "Indicators flagged for local review — not a diagnosis"], ["Review evidence", "Linked official guidance (Korean plans, WHO, NICE, CPSTF)"], ["Act", "Local teams decide, with context and professional review"]];

export default function RadarAbout({ onGo, sel }) {
  const byDom = (doms) => INDICATORS.filter((i) => doms.includes(i.domain) || (doms.includes("건강수명") && i.id.startsWith("HLE_"))).length;
  const y0 = YEARS_ALL[0], y1 = YEARS_ALL[YEARS_ALL.length - 1];
  const nSurvey = INDICATORS.filter(isSurvey).length;
  const demo = [["Indicator Analysis", "analysis"], ["Regional Profile", "profile"], ["Regional Comparison", "compare"], ["Hotspot", "hot"]];
  return (
    <div className="radar" lang="en">
      <section className="card radar-hero">
        <div className="radar-kicker">Health Equity Radar</div>
        <h2>From local health data to local action.</h2>
        <p>A working decision-support tool that helps public-health teams find local health disparities hidden by regional averages, and see which health issues in which areas to review first.</p>
        <div className="radar-stats">
          <div title="All indicators loaded in the app, counted from the data files (docs/DATA_VALIDATION.md)."><b>{INDICATORS.length}</b><span>indicators</span><small>{nSurvey} survey + {INDICATORS.length - nSurvey} administrative</small></div>
          <div title="Korea Community Health Survey units (one per public health centre area). Only the survey indicators are available at this level."><b>{HC_POOL.length}</b><span>survey units</span><small>for the {nSurvey} survey indicators</small></div>
          <div title="Municipalities (si·gun·gu): 226 local governments + 2 Jeju administrative cities + Sejong. Used for mortality, screening and other administrative data."><b>{VS.regions.municipalities_active}</b><span>municipalities</span><small>for the other {INDICATORS.length - nSurvey} indicators</small></div>
          <div title="Provinces and metropolitan cities."><b>{SIDOS.length}</b><span>provinces</span><small>all indicators</small></div>
          <div title="Earliest and latest year with data; coverage differs by source."><b>{y0}–{y1}</b><span>years of data</span><small>range differs by source</small></div>
        </div>
        <p className="muted radar-note">Numbers are not multiplied or added across levels: survey indicators are compared across {HC_POOL.length} survey units, administrative indicators across {VS.regions.municipalities_active} municipalities. Verified {VS.generated} — see <a href="docs/DATA_VALIDATION.md" target="_blank" rel="noopener noreferrer">data validation</a>.</p>
        <div className="radar-demo radar-cta">
          <button type="button" className="hc-cta" onClick={() => onGo("profile-en")}>Explore the live Health Equity Radar{sel ? ` — ${label(sel)}` : ""} →</button>
          <a className="themebtn" href="#methodology" onClick={(e) => { e.preventDefault(); document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth" }); }}>How priorities are identified</a>
          <UsabilityFeedback lang="en" context="radar overview" />
        </div>
        <p className="muted">Current deployment: <b>Republic of Korea only</b>. The site interface is in Korean; this page and the Health Equity Priority card (English mode) are in English. Live at <a href={CONTACT.site} target="_blank" rel="noreferrer">{CONTACT.site.replace(/^https?:\/\//, "")}</a>. A separate <a href="global/">Global prototype</a> applies the same screening → priority → why → action framework between countries using World Bank open data.</p>
      </section>

      <div className="grid2">
        <section className="card">
          <h3>What it does</h3>
          <ul className="radar-list">
            <li>Shows every indicator for every local jurisdiction against the national median, with maps, rankings, trends and gap charts.</li>
            <li>For a selected area, lists up to three <b>indicators to review first</b> (one per domain), each with the reasons computed from the data and links to official prevention guidance.</li>
            <li>Separates what the data can say (level, gap, position, trend, deprivation context) from what it cannot (causes, programme effects).</li>
            <li>Discloses sources, survey uncertainty (95% confidence intervals, unstable estimates) and known limitations on screen.</li>
          </ul>
        </section>
        <section className="card">
          <h3>Current deployment</h3>
          <ul className="radar-list">
            <li>Republic of Korea · {HC_POOL.length} survey units of the Korea Community Health Survey (one per public health centre area) · {SIDOS.length} provinces</li>
            <li>{INDICATORS.length} indicators ({nSurvey} survey indicators at survey-unit level; {INDICATORS.length - nSurvey} administrative indicators at municipality level, {VS.regions.municipalities_active} municipalities) · {y0}–{y1}</li>
            {DOMAIN_EN.map(([en, doms]) => { const n = byDom(doms); return n ? <li key={en}>{en} — {n}</li> : null; })}
          </ul>
        </section>
      </div>

      <section className="card">
        <h3>Workflow</h3>
        <ol className="radar-flow">{STEPS.map(([t, d], i) => <li key={t}><b>{t}</b><span>{d}</span>{i < STEPS.length - 1 && <i aria-hidden="true">→</i>}</li>)}</ol>
      </section>

      <div className="grid2">
        <section className="card" id="methodology">
          <h3>How the review priority is computed</h3>
          <ul className="radar-list">
            <li>Default candidates: {CORE.length} directional indicators of the Korea Community Health Survey (compared across {HC_POOL.length} units, with standard errors). A wider view adds mortality, screening and other jurisdiction-level data.</li>
            <li>Every indicator carries a <code>direction</code> (lower_is_better / higher_is_better / context). Gaps are flipped so that “unfavourable” is always positive.</li>
            <li>Internal technical score = gap {WEIGHTS.gap * 100}% + relative position {WEIGHTS.rank * 100}% + recent trend {WEIGHTS.trend * 100}% + deprivation {WEIGHTS.dep * 100}%. Missing parts are dropped and the remaining weights renormalized — never set to zero. It is not an official index; the interface shows only a tier.</li>
            <li>Tiers: Review first · Monitor · Relatively favourable · Insufficient data. An estimate whose 95% CI includes the national median, or whose relative standard error exceeds 20%, is never placed in “Review first”.</li>
          </ul>
        </section>
        <section className="card">
          <h3>Safety and limitations</h3>
          <ul className="radar-list">
            <li>Decision support, not medical diagnosis.</li>
            <li>No automated causal claims — deprivation and indicators are shown side by side, never as cause and effect.</li>
            <li>Survey uncertainty must be considered; adjacent ranks may not differ meaningfully.</li>
            <li>Local rankings should not be read as precise league tables.</li>
            <li>No programme input/output data are included, so the tool cannot evaluate programme performance or effects.</li>
            <li>Policy actions require local context and professional review.</li>
            <li>Not built: disease prediction, policy-effect prediction, chatbots, personal health data entry, accounts, or AI-generated policy.</li>
          </ul>
        </section>
      </div>

      <section className="card">
        <h3>Independent review</h3>
        {(() => {
          const pub = REV.reviews.filter((r) => r.status !== "withdrawn");
          const scopes = [...new Set(pub.flatMap((r) => r.scope || []))].length;
          return <p className="desc">{pub.length
            ? `${pub.length} external review${pub.length > 1 ? "s" : ""} published, covering ${scopes} of ${Object.keys(REV.scopes).length} review scopes. Each record names the reviewer, the scope checked and the software build reviewed.`
            : `${REV.pending?.active ? "Review requests are in progress; no" : "No"} reviews have been published yet.`} Reviews are unpaid and published only with the reviewer’s consent; they are review opinions, not certification. The record is on the 자료원 (Sources) tab.</p>;
        })()}
      </section>

      <section className="card">
        <h3>Designed to be adapted</h3>
        <p className="desc">The priority logic is a small set of pure functions separated from the Korean data (indicator direction, gaps, trends, scoring, plain-language reasons), with unit tests. Applying it elsewhere would need that country’s indicator tables, indicator metadata (direction, unit, source), a comparison group and boundary files. This describes the structure only — there is no deployment outside Korea today.</p>
      </section>

      <section className="card">
        <h3>Demo — open the live screens</h3>
        <div className="radar-demo">
          {demo.map(([t, v]) => <button key={v} type="button" className="hc-cta" onClick={() => onGo(v)}>{t} →</button>)}
        </div>
        <p className="desc">Screens open in Korean{sel ? ` for ${label(sel)}` : ""}. Data sources: Korea Disease Control and Prevention Agency (Community Health Survey), national cause-of-death statistics, National Health Insurance Service statistics, and others listed on the 자료원 (Sources) tab.</p>
      </section>
    </div>
  );
}
