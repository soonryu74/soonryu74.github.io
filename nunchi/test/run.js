// 눈치 MVP 테스트 — 모델 호출을 가로채서 앱 로직만 검증한다. API 키 없이 돌아간다.
//   npm i playwright && node nunchi/test/run.js
// 브라우저는 PW_CHROME 환경변수로 지정할 수 있다(미지정 시 playwright 기본 크로미움).
// index.html 의 PROXY 상수는 배포값이 들어 있으므로, 1단계(직접 호출)와 2단계(서버) 모두
// PROXY 만 바꾼 임시 사본으로 검증한다.
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const APP_FILE = path.join(__dirname, '..', 'index.html');
const CHROME = process.env.PW_CHROME || undefined;

let pass = 0, fail = 0;
const ok = (n, c, extra='') => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, extra)); };

// PROXY 상수만 바꾼 사본을 임시 폴더에 만든다
function copyWith(proxy){
  const src = fs.readFileSync(APP_FILE, 'utf8');
  if(!/const PROXY = '[^']*';/.test(src)) throw new Error('PROXY constant not found in index.html');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nunchi-')), 'app.html');
  fs.writeFileSync(out, src.replace(/const PROXY = '[^']*';/, `const PROXY = '${proxy}';`));
  return 'file://' + out;
}
const APP = copyWith('');

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
let lastBody = null, lastUrl = '', mode = 'dial';

(async () => {
  const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const p = await b.newPage({ viewport:{width:900,height:1000} });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));

  await p.route('**/generativelanguage.googleapis.com/**', async route => {
    lastBody = JSON.parse(route.request().postData()); lastUrl = route.request().url();
    const payload = mode === 'chat' ? MOCK.chat : JSON.stringify(MOCK[mode]);
    await route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ candidates:[{ content:{ parts:[{ text: payload }] } }] }) });
  });

  await p.goto(APP);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('nunchi.key','TEST-KEY'); localStorage.setItem('nunchi.model','gemini-omni-flash-preview'); });
  await p.reload(); await p.waitForTimeout(400);

  console.log('\n[1] opens with a worked example, no key needed');
  ok('dial shows 5 rungs at rest', (await p.locator('#dial-out .rung').count()) === 5);
  ok('key button shows connected state', (await p.locator('#keybtn').textContent()).includes('✓'));
  ok('UI defaults to English', (await p.getAttribute('html','lang')) === 'en' && /Relationship dial/.test(await p.locator('#tab-dial').textContent()));
  ok('review queue starts empty and unbadged', await p.locator('#queue-count').isHidden());

  console.log('\n[2] relationship dial');
  mode = 'dial';
  await p.fill('#dial-input', "I can't come tomorrow.");
  await p.click('#dial-go'); await p.waitForTimeout(350);
  ok('renders returned lines', (await p.locator('#dial-out .rung .ko').first().textContent()).includes('나 내일 못 가'));
  ok('asks for exactly 5 speech levels', /five listeners/.test(lastBody.systemInstruction.parts[0].text));
  ok('asks for the "why" in English while the UI is English', /plain English/.test(lastBody.systemInstruction.parts[0].text));
  ok('uses JSON schema mode', lastBody.generationConfig.responseMimeType === 'application/json');
  ok('retired preview model name is sent as the GA text model', /models\/gemini-3\.8-flash:/.test(lastUrl), lastUrl);
  ok('Gemini 3 calls set thinking to low', lastBody.generationConfig.thinkingConfig && lastBody.generationConfig.thinkingConfig.thinkingLevel === 'low', JSON.stringify(lastBody.generationConfig));
  ok('Gemini 3 calls send no temperature', !('temperature' in lastBody.generationConfig), JSON.stringify(lastBody.generationConfig));
  ok('highlighted rung follows the slider', (await p.locator('#dial-out .rung.on .who').textContent()).trim() === 'Boss');
  await p.fill('#dial-range', '0');
  await p.dispatchEvent('#dial-range','input'); await p.waitForTimeout(150);
  ok('slider moves the highlight', (await p.locator('#dial-out .rung.on .who').textContent()).trim() === 'Close friend');

  console.log('\n[3] situation roleplay');
  mode = 'chat';
  await p.click('#tab-chat'); await p.waitForTimeout(150);
  ok('opens mid-scene, not empty', (await p.locator('#log .msg').count()) === 1);
  ok('offers 8 scenes', (await p.locator('#scenes button').count()) === 8, String(await p.locator('#scenes button').count()));
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
  await p.click('#scenes button[data-id="interview"]'); await p.waitForTimeout(150);
  ok('new scene (job interview) opens in character', /자기소개/.test(await p.locator('#log .msg').first().textContent()));
  await p.fill('#say','안녕하세요'); await p.click('#send'); await p.waitForTimeout(400);
  ok('new scene role reaches the model', /interviewer/.test(lastBody.systemInstruction.parts[0].text));
  for(const id of ['realty','dinner','courier']){
    await p.click(`#scenes button[data-id="${id}"]`); await p.waitForTimeout(100);
  }
  ok('every new scene has an opening line', (await p.locator('#log .msg').first().textContent()).length > 5);

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

  console.log('\n[5] spaced review queue');
  ok('kept cards are saved to the queue', /2 card\(s\) saved/.test(await p.locator('#kept').textContent()), await p.locator('#kept').textContent());
  ok('tab badge shows 2 due', (await p.locator('#queue-count').textContent()) === '2' && !(await p.locator('#queue-count').isHidden()));
  await p.click('#tab-queue'); await p.waitForTimeout(150);
  const asked = (await p.locator('#queue .qcard .ask').textContent()).trim();
  ok('shows the learner\'s own sentence first', asked === '배가 아파요' || asked === '배가 아파요 어제부터', asked);
  ok('the fix is hidden until revealed', await p.locator('#q-answer').isHidden());
  await p.click('#q-reveal'); await p.waitForTimeout(100);
  ok('reveal shows the repaired sentence', !(await p.locator('#q-answer').isHidden()) && /배/.test(await p.locator('#q-answer .now').textContent()));
  await p.click('#q-ok'); await p.waitForTimeout(100);
  ok('"Got it" schedules the card for tomorrow', (await p.locator('#queue-count').textContent()) === '1' &&
     await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('nunchi.queue')); const c = q.find(x => x.step === 1); return !!c && c.due > Date.now() + 20*3600*1000; }));
  await p.click('#q-reveal'); await p.waitForTimeout(80); await p.click('#q-again'); await p.waitForTimeout(100);
  ok('"Again" keeps the card in today\'s pile', (await p.locator('#queue-count').textContent()) === '1' && (await p.locator('#queue .qcard').count()) === 1);
  ok('queue summary counts due vs saved', /1 due now · 2 saved/.test(await p.locator('#queue-sum').textContent()), await p.locator('#queue-sum').textContent());
  await p.reload(); await p.waitForTimeout(300);
  ok('queue survives a reload', (await p.locator('#queue-count').textContent()) === '1');
  await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('nunchi.queue')); q.forEach(c => c.due = Date.now() - 1000); localStorage.setItem('nunchi.queue', JSON.stringify(q)); });
  await p.reload(); await p.waitForTimeout(300);
  ok('cards whose date has come are due again', (await p.locator('#queue-count').textContent()) === '2');
  await p.click('#tab-queue'); await p.click('#q-del'); await p.waitForTimeout(100);
  ok('remove drops one card', (await p.locator('#queue-count').textContent()) === '1' && await p.evaluate(() => JSON.parse(localStorage.getItem('nunchi.queue')).length === 1));
  mode = 'review'; await p.click('#tab-chat'); await p.fill('#say','배가 아파요 어제부터'); mode='chat'; await p.click('#send'); await p.waitForTimeout(300);
  mode = 'review'; await p.click('#end-chat'); await p.waitForTimeout(400);
  ok('re-reviewing the same sentence does not duplicate a saved card', await p.evaluate(() => JSON.parse(localStorage.getItem('nunchi.queue')).length === 2));
  await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('nunchi.queue')); q.forEach(c => c.due = Date.now() + 5*864e5); localStorage.setItem('nunchi.queue', JSON.stringify(q)); });
  await p.click('#tab-queue'); await p.waitForTimeout(100);
  ok('nothing due → says when the next card returns', /Nothing due/.test(await p.locator('#queue').textContent()) && /in 5 day/.test(await p.locator('#queue').textContent()), await p.locator('#queue').textContent());

  console.log('\n[6] failure paths');
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

  console.log('\n[7] Korean UI');
  await p.click('#langbtn'); await p.waitForTimeout(150);
  ok('toggle flips the page to Korean', (await p.getAttribute('html','lang')) === 'ko' && /^관계 다이얼/.test((await p.locator('#tab-dial').textContent()).trim()));
  ok('dynamic text follows: dial label', (await p.locator('#dial-label').textContent()).trim() === '사장님');
  ok('dynamic text follows: rung names', (await p.locator('#dial-out .rung.on .who').textContent()).trim() === '사장님');
  ok('dynamic text follows: example explanations', /사과/.test(await p.locator('#dial-out .rung.on .why').textContent()));
  ok('dynamic text follows: scene buttons', (await p.locator('#scenes button[data-id="clinic"]').textContent()).trim() === '병원 접수');
  ok('dynamic text follows: review example', /틀린 곳은 없어요/.test(await p.locator('#cards').textContent()));
  ok('status messages follow', await (async () => { await p.click('#dial-go'); await p.waitForTimeout(200); return /API 키를 넣어/.test(await p.locator('#dial-status').textContent()); })());
  await p.reload(); await p.waitForTimeout(300);
  ok('language choice is remembered', (await p.getAttribute('html','lang')) === 'ko');
  await p.evaluate(() => localStorage.setItem('nunchi.key','TEST-KEY'));
  await p.unroute('**/generativelanguage.googleapis.com/**');
  await p.route('**/generativelanguage.googleapis.com/**', async route => {
    lastBody = JSON.parse(route.request().postData());
    await route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ candidates:[{ content:{ parts:[{ text: JSON.stringify(MOCK.dial) }] } }] }) });
  });
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#dial-go'); await p.waitForTimeout(300);
  ok('Korean UI asks the model for Korean explanations', /simple Korean/.test(lastBody.systemInstruction.parts[0].text));
  await p.click('#langbtn'); await p.waitForTimeout(100);
  ok('toggle flips back to English', (await p.getAttribute('html','lang')) === 'en' && (await p.locator('#dial-label').textContent()).trim() === 'Boss · 사장님');

  ok('no uncaught JS errors', errs.length === 0, errs.join(' | '));
  await b.close();

  // ── 2단계(서버 프록시) 모드 ───────────────────────────────
  await proxyMode();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

async function proxyMode(){
  const b = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  let seen=null;
  await p.route('**/example.supabase.co/**', async r => {
    seen = JSON.parse(r.request().postData());
    await r.fulfill({status:200, contentType:'application/json', body: JSON.stringify({ text:'네, 알겠습니다. 성함이 어떻게 되세요?' })});
  });
  await p.goto(copyWith('https://example.supabase.co/functions/v1/nunchi'));
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(300);
  console.log('\n[proxy mode]');
  ok('shipped index.html points at the deployed Edge Function', /const PROXY = 'https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/nunchi';/.test(fs.readFileSync(APP_FILE,'utf8')));
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
  await p.unroute('**/example.supabase.co/**');
  await p.route('**/example.supabase.co/**', r => r.fulfill({status:503, contentType:'application/json', body: JSON.stringify({error:'서버에 모델 키가 아직 없어요. 운영자가 GEMINI_API_KEY를 넣으면 바로 됩니다.'})}));
  await p.fill('#say','네'); await p.click('#send'); await p.waitForTimeout(400);
  ok('shows the server message when the key is not set yet', /모델 키가 아직/.test(await p.locator('#chat-status').textContent()));
  ok('no JS errors', errs.length===0, errs.join('|'));
  await b.close();
}
