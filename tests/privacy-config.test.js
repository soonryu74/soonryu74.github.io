/* dolbom/assets/privacy-config.js 검증
 * 실행: node tests/privacy-config.test.js
 *
 * 확인하려는 것
 *  - 운영 주체·보유기간·문의처가 비어 있으면 '준비됨'으로 판정하지 않는다.
 *  - 값이 비어 있을 때 임의의 사업자 정보·법적 고지를 만들어 쓰지 않는다.
 *  - 값이 채워지면 네 항목이 그대로 안내문에 들어간다.
 */
const fs = require('fs');
const path = require('path');

global.window = global;
new Function(fs.readFileSync(path.join(__dirname, '..', 'dolbom', 'assets', 'privacy-config.js'), 'utf8'))();

let pass = 0, fail = 0;
function ok(name, cond, note){
  if (cond) { pass++; console.log('  PASS ', name); }
  else { fail++; console.log('  FAIL ', name, note ? '— ' + note : ''); }
}
function el(){ return { innerHTML: '' }; }

console.log('\n[기본 상태 — 운영 정보 미확정]');
ok('P01  기본값은 준비 안 됨', window.privacyReady() === false);

const e1 = el();
window.renderPrivacyNotice(e1, { 수집항목: '이름, 연락처' });
ok('P02  미확정 안내가 표시된다', /확정되지 않았습니다/.test(e1.innerHTML));
ok('P03  없는 사업자 정보를 만들지 않는다',
   !/사업자등록번호\s*\d/.test(e1.innerHTML) && !/@/.test(e1.innerHTML));
ok('P04  최소 입력 권고를 안내한다', /최소한의 정보/.test(e1.innerHTML));

console.log('\n[일부만 채운 상태]');
const 조합 = [
  ['version만',  { version: '2026-10-01', 운영주체: '', 보유기간: '', 문의처: '' }],
  ['운영주체 누락', { version: '2026-10-01', 운영주체: '', 보유기간: '3개월', 문의처: 'a@b.c' }],
  ['보유기간 누락', { version: '2026-10-01', 운영주체: '○○', 보유기간: '', 문의처: 'a@b.c' }],
  ['문의처 누락',  { version: '2026-10-01', 운영주체: '○○', 보유기간: '3개월', 문의처: '' }],
  ['version 누락', { version: '', 운영주체: '○○', 보유기간: '3개월', 문의처: 'a@b.c' }]
];
for (const [label, cfg] of 조합){
  window.PRIVACY = cfg;
  ok('P05  ' + label + ' → 준비 안 됨', window.privacyReady() === false);
}

console.log('\n[네 값이 모두 채워진 상태]');
window.PRIVACY = {
  version:  '2026-10-01',
  운영주체: '테스트 운영자',
  보유기간: '안내 후 3개월 또는 철회 시 즉시 파기',
  문의처:   'privacy@example.test'
};
ok('P06  준비됨으로 판정', window.privacyReady() === true);

const e2 = el();
window.renderPrivacyNotice(e2, { 수집항목: '표시 이름, 연락 방법', 목적: '디렉토리 공개' });
for (const v of ['2026-10-01', '테스트 운영자', '안내 후 3개월', 'privacy@example.test', '표시 이름, 연락 방법', '디렉토리 공개']){
  ok('P07  안내문에 "' + v + '" 포함', e2.innerHTML.includes(v));
}
ok('P08  미확정 문구는 사라진다', !/확정되지 않았습니다/.test(e2.innerHTML));

const e3 = el();
window.renderPrivacyNotice(e3, { 수집항목: '<script>x</script>' });
ok('P09  수집항목을 이스케이프한다', !/<script>/.test(e3.innerHTML));

ok('P10  el 이 없어도 예외가 나지 않는다', (()=>{ try { window.renderPrivacyNotice(null, {}); return true; } catch(e){ return false; } })());

console.log('\n통과 ' + pass + ' · 실패 ' + fail + '\n');
process.exit(fail ? 1 : 0);
