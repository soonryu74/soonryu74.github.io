/* 추천 규칙 검증 — 1차 지시서 T01~T04
 * 실행: node tests/care-rules.test.js
 */
const fs = require('fs');
global.window = global;
eval(fs.readFileSync(__dirname + '/../dolbom/assets/care-rules.js', 'utf8'));

const S = o => Object.assign(
  { who:null, duration:null, mobility:null, cognition:null, needs:new Set(), context:new Set() }, o);
const titles = st => recommendCare(st).map(c => c.title).join(' | ');
const bodies = st => recommendCare(st).map(c => c.body).join(' ');

let pass = 0, fail = 0;
function check(id, desc, cond, detail){
  if (cond) { pass++; console.log(`  PASS  ${id}  ${desc}`); }
  else { fail++; console.log(`  FAIL  ${id}  ${desc}\n        ${detail}`); }
}

// ── T01 65세 미만·단기 수술 회복·노인성 질병 없음 → 장기요양 단정 없이 상담·대안
{
  const st = S({ who:'patient', duration:'short', mobility:'partial' });
  const t = titles(st), j = judgeLtc(st);
  check('T01','장기요양 대상이라고 단정하지 않음', j === 'short_term', `judge=${j}`);
  check('T01','등급 신청을 추천하지 않음', !/등급 신청 상담/.test(t), t);
  check('T01','대안(통합돌봄 등) 경로 제시', /통합돌봄/.test(t), t);
}

// ── T02 고령·지속적 돌봄·등급 없음 → 등급 상담과 통합돌봄 상담을 구분
{
  const st = S({ who:'senior', duration:'long', mobility:'most' });
  const t = titles(st);
  check('T02','장기요양 등급 상담 안내', /등급 신청 상담/.test(t), t);
  check('T02','통합돌봄 상담을 따로 안내', /통합돌봄 상담/.test(t), t);
  check('T02','"6개월 기다려라"로 읽히지 않게 명시', /기다린 뒤 신청하라는 뜻이 아닙니다/.test(bodies(st)), '문구 없음');
  check('T02','자격을 확정하지 않음', /공단의 방문조사와 등급판정위원회/.test(bodies(st)), '문구 없음');
}

// ── T03 방문간호 필요 → 개인 구직 목록이 아니라 제공기관 안내
{
  const st = S({ who:'senior', duration:'long', needs:new Set(['medical']) });
  const cards = recommendCare(st);
  const links = cards.map(c => c.link).join(' ');
  check('T03','개인 구직 목록(gujik)으로 보내지 않음', !/gujik/.test(links), links);
  check('T03','면허 제공기관 경로 안내', /제공기관을 통해야/.test(titles(st)), titles(st));
  check('T03','방문간호/가정간호/방문진료 구분 제시',
        /방문간호/.test(bodies(st)) && /가정간호/.test(bodies(st)) && /방문진료/.test(bodies(st)), '구분 누락');
}

// ── T04 잘 모르겠어요 → 빈 결과 없이 다음 질문·공식 상담
{
  const st = S({ who:'unknown', duration:'unknown' });
  const cards = recommendCare(st);
  check('T04','결과가 비어 있지 않음', cards.length > 0, `len=${cards.length}`);
  check('T04','상담 경로 제시', /상담/.test(titles(st)), titles(st));
  check('T04','자격을 단정하지 않음', !/신청 대상입니다/.test(bodies(st)), '단정 문구 발견');
}

// ── 추가: 어떤 입력에서도 의료 선택 시 개인 구직으로 보내지 않는지 전수 확인
{
  const whos = ['senior','disease','patient','disabled','unknown',null];
  const durs = ['long','short','unknown',null];
  let bad = 0;
  for (const w of whos) for (const d of durs) {
    const st = S({ who:w, duration:d, needs:new Set(['medical']) });
    if (recommendCare(st).some(c => /gujik/.test(c.link))) bad++;
  }
  check('T03+','의료 선택 모든 조합에서 구직 링크 없음', bad === 0, `위반 ${bad}건`);
}

// ── 추가: 어떤 입력에도 빈 결과가 없어야 함
{
  const whos = ['senior','disease','patient','disabled','unknown',null];
  let empty = 0;
  for (const w of whos) if (recommendCare(S({who:w})).length === 0) empty++;
  check('T04+','어떤 선택에도 빈 결과 없음', empty === 0, `빈 결과 ${empty}건`);
}

console.log(`\n통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
