// Two phones, one family: sign-up, family code, join, two-way sync, edits, deletes, offline.
// usage: python3 build.py --mock && node test/mockserver.js & (cd dist/mock && python3 -m http.server 8766) &
//        node test/sync_e2e.js http://localhost:8766/ /tmp/shots
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [, , URL0, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
let step = 0;
function check(c, m) { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) errors.push(m); }
async function ctl(body) { const r = await fetch('http://localhost:8790/control', { method: 'POST', body: JSON.stringify(body) }); return r.json(); }
async function shot(p, name) { step++; await sleep(200); await p.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + name + '.png') }); }
async function phone(browser, label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar-EG', timezoneId: 'Africa/Cairo', isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(label + ' pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(label + ' console: ' + m.text()); });
  return p;
}
const count = (p, f) => p.evaluate(f);

(async () => {
  await ctl({ reset: true, down: false });
  const browser = await chromium.launch();
  const A = await phone(browser, 'mother'), B = await phone(browser, 'father');

  // --- mother starts the notebook and logs a few things
  await A.goto(URL0); await A.waitForSelector('.onb');
  await shot(A, 'A-onboarding');
  await A.fill('#o-name', 'آدم');
  await A.click('[data-act="onb-go"]'); await A.waitForSelector('.since');
  await A.click('.qb[data-type="diaper"]'); await A.waitForSelector('.sheet'); await A.click('.sheet [data-act="dia"][data-v="wet"]');
  await A.click('.qb[data-type="bottle"]'); await A.waitForSelector('.sheet'); await A.click('.sheet [data-act="save"]');
  await A.click('[data-act="sl-quick"]'); await sleep(1100); await A.click('[data-act="sl-stop"]');
  await shot(A, 'A-home');
  check(await count(A, () => live(S.events).length) === 3, 'mother has 3 records before signing in');

  // --- mother signs up and starts the family
  await A.click('[data-act="go-cloud"]'); await A.waitForSelector('#au-email');
  await shot(A, 'A-signin');
  await A.fill('#au-email', 'mom@test.com'); await A.fill('#au-pass', 'secret1');
  await A.click('[data-act="auth-email"][data-v="new"]');
  await A.waitForSelector('[data-act="fam-create"]', { timeout: 8000 });
  await shot(A, 'A-join-or-create');
  await A.click('[data-act="fam-create"]');
  await A.waitForSelector('.famcode', { timeout: 8000 });
  const code = (await A.textContent('.famcode')).trim();
  await shot(A, 'A-family-code');
  check(/^[A-Z2-9]{6}$/.test(code), 'family code shown: ' + code);
  let dump = await (await fetch('http://localhost:8790/dump')).json();
  const items = Object.keys(dump.docs).filter((k) => k.includes('/items/'));
  check(items.filter((k) => k.includes('/items/r_events_')).length === 3, 'mother\'s 3 records are in the cloud');
  check(items.some((k) => k.endsWith('/items/profile')), 'baby profile is in the cloud');

  // --- father opens the app on his phone, signs in, types the code
  await B.goto(URL0); await B.waitForSelector('.onb');
  await B.click('[data-act="open-auth"]'); await B.waitForSelector('.sheet #au-email');
  await B.fill('#au-email', 'dad@test.com'); await B.fill('#au-pass', 'secret2');
  await B.click('.sheet [data-act="auth-email"][data-v="new"]');
  await B.waitForSelector('.sheet #join-code', { timeout: 8000 });
  check(await B.$('.sheet [data-act="fam-create"]') === null, 'a phone without data can only join');
  await B.fill('#join-code', code.toLowerCase());
  await shot(B, 'B-join');
  await B.click('.sheet [data-act="fam-join"]');
  await B.waitForSelector('.since', { timeout: 8000 });
  await shot(B, 'B-home-after-join');
  check(await count(B, () => S.profile && S.profile.name) === 'آدم', 'father sees the baby\'s profile');
  check(await count(B, () => live(S.events).length) === 3, 'father sees the mother\'s 3 records');

  // --- father logs a diaper; mother pulls it
  await B.click('.qb[data-type="diaper"]'); await B.waitForSelector('.sheet'); await B.click('.sheet [data-act="dia"][data-v="dirty"]');
  await sleep(2200);                                    // debounce then push
  await A.evaluate(() => syncNow()); await sleep(400);
  check(await count(A, () => live(S.events).filter((e) => e.t === 'diaper').length) === 2, 'mother receives the father\'s diaper');

  // --- mother edits that diaper, father receives the edit
  const did = await B.evaluate(() => S.events.find((e) => e.t === 'diaper' && e.d.dirty).id);
  await A.evaluate((id) => { const e = S.events.find((x) => x.id === id); updRec(e, { d: { wet: true, dirty: true, color: 'green' } }); }, did);
  await sleep(2200);
  await B.evaluate(() => syncNow()); await sleep(400);
  check(await B.evaluate((id) => S.events.find((x) => x.id === id).d.color, did) === 'green', 'father receives the mother\'s edit');

  // --- delete on father, gone on mother
  await B.evaluate(() => { const e = S.events.find((x) => x.t === 'bottle'); delRec(e); });
  await sleep(2200);
  await A.evaluate(() => syncNow()); await sleep(400);
  check(await count(A, () => live(S.events).filter((e) => e.t === 'bottle').length) === 0, 'a delete reaches the other phone');

  // --- routine ticks from both phones add up
  await A.evaluate(() => routineBump(today(), 'cards', 1));
  await B.evaluate(() => routineBump(today(), 'cards', 1));
  await sleep(2200);
  await A.evaluate(() => syncNow()); await B.evaluate(() => syncNow()); await A.evaluate(() => syncNow()); await sleep(300);
  check(await A.evaluate(() => routineCount(today(), 'cards')) === 2 && await B.evaluate(() => routineCount(today(), 'cards')) === 2, 'routine counts from both phones add up');

  // --- a newborn sunan ticked on one phone shows on the other
  await A.evaluate(() => { S.sunan.tahnik = { date: today(), u: Date.now() }; save(); });
  await sleep(2200);
  await B.evaluate(() => syncNow()); await sleep(400);
  check(await B.evaluate(() => !!(S.sunan.tahnik && S.sunan.tahnik.date)), 'a newborn sunan reaches the other phone');

  // --- offline: father logs while the cloud is down, it arrives later
  await ctl({ down: true });
  await B.click('.qb[data-type="diaper"]'); await B.waitForSelector('.sheet'); await B.click('.sheet [data-act="dia"][data-v="wet"]');
  await sleep(2200);
  check(await count(B, () => live(S.events).filter((e) => e.t === 'diaper').length) === 3, 'father can log offline');
  await ctl({ down: false });
  await B.evaluate(() => syncNow()); await sleep(300);
  await A.evaluate(() => syncNow()); await sleep(300);
  check(await count(A, () => live(S.events).filter((e) => e.t === 'diaper').length) === 3, 'offline record arrives after reconnecting');

  // --- reload keeps the sign-in and keeps syncing
  await B.reload(); await B.waitForSelector('.since'); await sleep(1500);
  check(await B.evaluate(() => SYNC.state) === 'ok', 'father is still signed in after reopening');
  await B.click('[data-act="go-cloud"]'); await sleep(500);
  await shot(B, 'B-account');

  // --- reads stay small: a no-change sync costs about one read
  const r0 = (await ctl({})).reads;
  await A.evaluate(() => syncNow()); await sleep(200);
  const r1 = (await ctl({})).reads;
  check(r1 - r0 <= 2, 'a sync with nothing new costs ' + (r1 - r0) + ' read(s)');

  // --- a stranger with a wrong code is refused
  const C = await phone(browser, 'stranger');
  await C.goto(URL0); await C.waitForSelector('.onb');
  await C.click('[data-act="open-auth"]'); await C.waitForSelector('.sheet #au-email');
  await C.fill('#au-email', 'x@test.com'); await C.fill('#au-pass', 'secret3');
  await C.click('.sheet [data-act="auth-email"][data-v="new"]');
  await C.waitForSelector('.sheet #join-code', { timeout: 8000 });
  await C.fill('#join-code', 'ZZZZZZ'); await C.click('.sheet [data-act="fam-join"]'); await sleep(500);
  check(/غير موجود/.test(await C.textContent('.sheet')), 'wrong code is refused with a clear message');

  await browser.close();
  console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
})();
