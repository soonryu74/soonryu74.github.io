// 눈치 MVP 테스트 — 모델 호출을 가로채서 앱 로직만 검증한다. API 키 없이 돌아간다.
//   npm i playwright && node nunchi/test/run.js
// 브라우저는 PW_CHROME 환경변수로 지정할 수 있다(미지정 시 playwright 기본 크로미움).
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const APP_FILE = path.join(__dirname, '..', 'index.html');
const APP = 'file://' + APP_FILE;
const CHROME = process.env.PW_CHROME || undefined;

let pass = 0, fail = 0;
const ok = (n, c, extra='') => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, extra)); };

// what the mocked model returns, per mode
const MOCK = {
  dial: { lines: [
    {korean:'나 내일 못 가', why:'friend'},{korean:'선배, 저 내일 못 갈 것 같아요', why:'senior'},
    {korean:'저 내일 못 갈 것 같아요', why:'coworker'},{korean:'죄송합니다, 내일은 어려울 것 같습니다', why:'stranger'},
    {korean:'사장님, 죄송합니다. 내일은 참석이 어려울 것 같습니다', why:'boss'} ] },
  chat: '네, 알겠습니다. 혹시 성함이 어떻게 되세요?',
  review: { cards: [
    // 1) legit small fix  → must survive
    {kind:'wrong', label:'particle · 조사', original:'배가 아파요', fixed:'배를 아파요', why:'x'},
    // 2) odd, word order  → must survive
    {kind:'odd', label:'word order · 어순', original:'배가 아파요 어제부터', fixed:'어제부터 배가 아파요', alternative:'어제부터 배가 좀 아파요', why:'y'},
    // 3) OVERCORRECTION  → must be dropped (whole sentence rewritten)
    {kind:'odd', label:'style', original:'배 아파요', fixed:'제가 어제 저녁부터 복통이 심해서 병원에 방문하게 되었습니다', why:'z'} ] }
};
let lastBody = null, mode = 'dial';

(async () => {
  const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const p = await b.newPage({ viewport:{width:900,height:1000} });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));

  await p.route('**/generativelanguage.googleapis.com/**', async route => {
    lastBody = JSON.parse(route.request().postData());
    const payload = mode === 'chat' ? MOCK.chat : JSON.stringify(MOCK[mode]);
    await route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ candidates:[{ content:{ parts:[{ text: payload }] } }] }) });
  });

  await p.goto(APP);
  await p.evaluate(() => localStorage.setItem('nunchi.key','TEST-KEY'));
  await p.reload(); await p.waitForTimeout(400);

  console.log('\n[1] opens with a worked example, no key needed');
  ok('dial shows 5 rungs at rest', (await p.locator('#dial-out .rung').count()) === 5);
  ok('key button shows connected state', (await p.locator('#keybtn').textContent()).includes('✓'));

  console.log('\n[2] relationship dial');
  mode = 'dial';
  await p.fill('#dial-input', "I can't come tomorrow.");
  await p.click('#dial-go'); await p.waitForTimeout(350);
  ok('renders returned lines', (await p.locator('#dial-out .rung .ko').first().textContent()).includes('나 내일 못 가'));
  ok('asks for exactly 5 speech levels', /five listeners/.test(lastBody.systemInstruction.parts[0].text));
  ok('uses JSON schema mode', lastBody.generationConfig.responseMimeType === 'application/json');
  ok('highlighted rung follows the slider', (await p.locator('#dial-out .rung.on .who').textContent()).trim() === 'Boss');
  await p.fill('#dial-range', '0');
  await p.dispatchEvent('#dial-range','input'); await p.waitForTimeout(150);
  ok('slider moves the highlight', (await p.locator('#dial-out .rung.on .who').textContent()).trim() === 'Close friend');

  console.log('\n[3] situation roleplay');
  mode = 'chat';
  await p.click('#tab-chat'); await p.waitForTimeout(150);
  ok('opens mid-scene, not empty', (await p.locator('#log .msg').count()) === 1);
  await p.fill('#say', '배가 아파요 어제부터');
  await p.click('#send'); await p.waitForTimeout(400);
  ok('learner turn + model turn both rendered', (await p.locator('#log .msg').count()) === 3);
  const sys = lastBody.systemInstruction.parts[0].text;
  ok('never corrects mid-conversation', /NEVER correct/.test(sys));
  ok('TOPIK level is passed to the model', /TOPIK level 2/.test(sys));
  await p.selectOption('#level','4');
  await p.fill('#say','네, 있어요'); await p.click('#send'); await p.waitForTimeout(400);
  ok('level change reaches the model', /TOPIK level 4/.test(lastBody.systemInstruction.parts[0].text));
  ok('scene switch resets the log', await (async () => {
    await p.click('#scenes button[data-id="landlord"]'); await p.waitForTimeout(150);
    return (await p.locator('#log .msg').count()) === 1;
  })());

  console.log('\n[4] review cards + overcorrection guard');
  mode = 'review';
  await p.click('#scenes button[data-id="clinic"]'); await p.waitForTimeout(100);
  await p.fill('#say','배가 아파요 어제부터'); mode='chat'; await p.click('#send'); await p.waitForTimeout(350);
  mode = 'review';
  await p.click('#end-chat'); await p.waitForTimeout(450);
  ok('switches to the review tab', !(await p.locator('#p-review').isHidden()));
  const cards = await p.locator('#cards .rcard').count();
  ok('3 suggestions in → 2 cards out (1 overcorrection dropped)', cards === 2, `got ${cards}`);
  ok('tells the learner what was dropped', /1 suggestion/.test(await p.locator('#kept').textContent()));
  ok('keeps WRONG / ODD distinction', (await p.locator('#cards .rcard.err').count()) === 1 && (await p.locator('#cards .rcard.odd').count()) === 1);
  ok('review only sees learner turns via B: prefix', /B: 배가 아파요 어제부터/.test(lastBody.contents[0].parts[0].text));

  console.log('\n[5] failure paths');
  await p.unroute('**/generativelanguage.googleapis.com/**');
  await p.route('**/generativelanguage.googleapis.com/**', r => r.fulfill({ status:400, contentType:'application/json',
    body: JSON.stringify({ error:{ message:'API key not valid. Please pass a valid API key.' } }) }));
  await p.click('#tab-dial'); await p.click('#dial-go'); await p.waitForTimeout(350);
  ok('bad key produces a fixable message', /API key was rejected/.test(await p.locator('#dial-status').textContent()));
  ok('example content survives the error', (await p.locator('#dial-out .rung').count()) === 5);
  await p.evaluate(() => localStorage.removeItem('nunchi.key'));
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#dial-go'); await p.waitForTimeout(250);
  ok('no key → tells them where the button is', /Add an API key/.test(await p.locator('#dial-status').textContent()));

  ok('no uncaught JS errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // ── 2단계(서버 프록시) 모드 ───────────────────────────────
  await proxyMode();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

// PROXY 상수만 바꾼 사본을 임시 폴더에 만들어 서버 모드를 검증한다
function proxyCopy(){
  const src = fs.readFileSync(APP_FILE, 'utf8')
    .replace("const PROXY = '';", "const PROXY = 'https://example.supabase.co/functions/v1/nunchi';");
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nunchi-')), 'proxy.html');
  fs.writeFileSync(out, src);
  return out;
}

async function proxyMode(){

  const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  let seen=null;
  await p.route('**/example.supabase.co/**', async r => {
    seen = JSON.parse(r.request().postData());
    await r.fulfill({status:200, contentType:'application/json', body: JSON.stringify({ text:'네, 알겠습니다. 성함이 어떻게 되세요?' })});
  });
  await p.goto('file://' + proxyCopy());
  await p.waitForTimeout(300);
  console.log('\n[proxy mode]');
  ok('API key button is hidden', await p.locator('#keybtn').isHidden());
  ok('privacy line switches to server wording', /stored anonymously/.test(await p.locator('#privacy').textContent()));
  await p.click('#tab-chat'); await p.fill('#say','배가 아파요'); await p.click('#send'); await p.waitForTimeout(400);
  ok('calls the proxy, not Google', !!seen);
  ok('sends mode/scene/level', seen.mode==='chat' && seen.scene==='clinic' && seen.level==='2', JSON.stringify(seen && {m:seen.mode,s:seen.scene,l:seen.level}));
  ok('sends an anonymous device id', typeof seen.device==='string' && seen.device.length>8);
  ok('never sends an API key', !JSON.stringify(seen).toLowerCase().includes('key'));
  ok('renders the proxy reply', (await p.locator('#log .msg').count())===3);
  await p.unroute('**/example.supabase.co/**');
  await p.route('**/example.supabase.co/**', r => r.fulfill({status:429, contentType:'application/json', body: JSON.stringify({error:'오늘 사용량을 다 쓰셨어요. 내일 다시 만나요.'})}));
  await p.fill('#say','네'); await p.click('#send'); await p.waitForTimeout(400);
  ok('shows the server message on quota limit', /사용량/.test(await p.locator('#chat-status').textContent()));
  ok('no JS errors', errs.length===0, errs.join('|'));
  await b.close();
}

