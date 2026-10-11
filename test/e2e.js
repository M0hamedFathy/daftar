// End-to-end check of دفتر الرضيع on a phone-sized screen.
// usage: python3 build.py && (cd public && python3 -m http.server 8765) &  node test/e2e.js http://localhost:8765/ /tmp/shots
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [, , URL0, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let step = 0;
async function shot(page, name) { step++; await sleep(250); await page.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + name + '.png'), fullPage: false }); }
async function shotFull(page, name) { step++; await sleep(250); await page.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + name + '.png'), fullPage: true }); }
function check(cond, msg) { if (!cond) { errors.push('ASSERT: ' + msg); console.log('FAIL', msg); } else console.log('ok  ', msg); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar-EG', timezoneId: 'Africa/Cairo', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(URL0);
  await page.waitForSelector('.onb');
  await shot(page, 'onboarding');
  // horizontal overflow check
  const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(ow <= 0, 'no horizontal scroll on onboarding (' + ow + ')');

  await page.fill('#o-name', 'آدم');
  await page.click('[data-act="onb-go"]');
  await page.waitForSelector('.since');
  await shot(page, 'home-empty');

  // breast timer: right, then left, then finish
  await page.click('.qb[data-type="breast"]');
  await page.waitForSelector('.sheet');
  await shot(page, 'breast-sheet');
  await page.click('.sheet .side[data-v="R"]');
  await sleep(1300);
  await page.click('.sheet .side[data-v="L"]');
  await sleep(1300);
  await shot(page, 'breast-running');
  await page.click('.sheet [data-act="bt-finish"]');
  await sleep(200);
  let n = await page.evaluate(() => S.events.filter((e) => e.t === 'breast').length);
  check(n === 1, 'breast feed saved');
  const segs = await page.evaluate(() => S.events.find((e) => e.t === 'breast').d.segs.length);
  check(segs === 2, 'breast feed has two sides');

  // diaper: open sheet, tap "both"
  await page.click('.qb[data-type="diaper"]');
  await page.waitForSelector('.sheet');
  await page.click('.sheet [data-act="show"][data-k="_showC"]');
  await page.click('.sheet [data-act="set"][data-k="color"][data-v="yellow"]');
  await page.click('.sheet [data-act="dia"][data-v="both"]');
  n = await page.evaluate(() => S.events.filter((e) => e.t === 'diaper' && e.d.dirty && e.d.wet && e.d.color === 'yellow').length);
  check(n === 1, 'diaper (both, yellow) saved');

  // bottle
  await page.click('.qb[data-type="bottle"]');
  await page.waitForSelector('.sheet');
  await page.click('.sheet [data-act="step"][data-v="10"]');
  await page.click('.sheet [data-act="save"]');
  n = await page.evaluate(() => (S.events.find((e) => e.t === 'bottle') || {}).d);
  check(n && n.ml === 100, 'bottle saved with 100 ml');

  // sleep timer with a location, then stop
  await page.click('[data-act="sl-quick"]');
  await sleep(1200);
  await shot(page, 'home-sleeping');
  await page.click('.timer.sleep [data-act="log"][data-type="sleep"]');
  await page.waitForSelector('.sheet');
  await page.click('.sheet [data-k="loc"][data-v="chest"]');
  await shot(page, 'sleep-sheet-hint');
  check(await page.$('.sheet .hint') !== null, 'sleep location shows a gentle hint');
  await page.click('.sheet [data-act="sl-stop"]');
  n = await page.evaluate(() => S.events.filter((e) => e.t === 'sleep' && e.d.loc === 'chest').length);
  check(n === 1, 'sleep saved with location');

  // temperature warning under 3 months
  await page.click('.fab');
  await page.waitForSelector('.sheet');
  await page.click('.sheet [data-act="pick"][data-type="temp"]');
  await page.waitForSelector('.sheet #f-c');
  await page.fill('#f-c', '38.2');
  await sleep(100);
  const warn = await page.textContent('#temp-warn');
  check(/فورًا/.test(warn), 'fever warning shown for a young baby');
  await page.click('.sheet [data-act="save"]');

  // past entry from history: a manual feed yesterday
  await page.click('.nav [data-v="hist"]');
  await page.click('[data-act="day"][data-v="-1"]');
  await page.click('.fab');
  await page.waitForSelector('.sheet');
  await page.click('.sheet [data-act="pick"][data-type="breast"]');
  await page.waitForSelector('.sheet #f-mL');
  await page.click('.sheet [data-act="save"]');
  n = await page.evaluate(() => S.events.filter((e) => e.t === 'breast' && e.s < sod(Date.now())).length);
  check(n === 1, 'manual feed saved on the previous day');
  await shot(page, 'history-yesterday');

  // growth
  await page.click('.nav [data-v="health"]');
  await page.click('[data-act="log"][data-type="growth"]');
  await page.waitForSelector('.sheet #f-w');
  await page.fill('#f-w', '4.9');
  await page.fill('#f-l', '56.5');
  await page.fill('#f-h', '38.4');
  await sleep(100);
  check(/المئين/.test(await page.textContent('#g-prev')), 'growth percentile preview');
  await page.click('.sheet [data-act="save-growth"]');
  await shotFull(page, 'growth');
  await page.click('[data-act="htab"][data-v="vax"]');
  await shotFull(page, 'vaccines');
  await page.click('[data-act="htab"][data-v="ms"]');
  await shot(page, 'milestones');
  await page.click('[data-act="htab"][data-v="doc"]');
  await shot(page, 'doctor');

  // stats
  await page.click('.nav [data-v="stats"]');
  await shotFull(page, 'stats');
  await page.click('[data-act="tbl"][data-v="feeds"]');
  check(await page.$('table.tb') !== null, 'feeds chart has a table view');

  // backup round trip and merge idempotency
  const rt = await page.evaluate(async () => {
    const txt = JSON.stringify(exportObject());
    const inc = parseImport(txt);
    const m1 = mergeState(S, inc), m2 = mergeState(m1, inc);
    const code = await encodeCode(txt), back = await decodeCode(code);
    return { a: countRecords(S), b: countRecords(m1), c: countRecords(m2), same: back === txt, codeLen: code.length, prefix: code.slice(0, 8) };
  });
  check(rt.a === rt.b && rt.b === rt.c, 'merge is idempotent (' + rt.a + '/' + rt.b + '/' + rt.c + ')');
  check(rt.same, 'backup code round trip (' + rt.prefix + ', ' + rt.codeLen + ' chars)');

  // merge of two phones: a record made on another device is added once
  const two = await page.evaluate(() => {
    const other = clone(S); other.events.push({ id: 'other1', t: 'diaper', s: Date.now() - 600000, e: null, d: { wet: true }, n: '', u: Date.now(), by: 'phone2' });
    const m = mergeState(S, other); const m2 = mergeState(m, other);
    return [live(m.events).length - live(S.events).length, live(m2.events).length - live(S.events).length];
  });
  check(two[0] === 1 && two[1] === 1, 'second phone record merged once');

  // night screen
  await page.click('.nav [data-v="home"]');
  await page.click('[data-act="night"]');
  await page.waitForSelector('.night');
  await page.click('.night [data-act="night-diaper"][data-v="wet"]');
  await shot(page, 'night');
  await page.click('.night [data-act="night-x"]');

  // backup screen
  await page.click('[data-act="go-cloud"]');
  await shotFull(page, 'backup');

  // home with data
  await page.click('.nav [data-v="home"]');
  await shotFull(page, 'home-data');

  // faith screen: tawidh, adhkar, du'a, his stage, newborn sunan, Hijri occasions
  await page.click('.nav [data-v="more"]');
  await page.click('[data-act="more"][data-v="faith"]');
  await page.waitForSelector('.dk.big');
  check(/أعيذك|أُعيذك/.test(await page.textContent('.dk.big')), 'faith screen shows the tawidh');
  check(await page.$$eval('details.fold', (d) => d.length) >= 4, 'adhkar and du\'a are folded sections');
  await page.click('[data-chg="sunan"][data-id="aqiqa"]');
  check(await page.evaluate(() => !!(S.sunan.aqiqa && S.sunan.aqiqa.date)), 'a newborn sunan can be ticked');
  await shotFull(page, 'faith');
  check(await page.evaluate(() => S.routine.items.filter((i) => /^adhkar_/.test(i.id)).length) === 4, 'four faith items in the routine');
  const mig = await page.evaluate(() => { const o = normalize({ routine: { items: [{ id: 'adhkar_am', label: 'تعويذ الصباح', target: 1 }, { id: 'tummy', label: 'x', target: 4 }], u: 0, log: {} } }); return [o.routine.items.length, o.routine.items[0].label]; });
  check(mig[0] === 5 && mig[1] === 'أذكار الصباح وتعويذه', 'older notebooks receive the new faith items');
  const occ = await page.evaluate(() => nextOccasions(3).map((o) => o.ev.title + ' ' + dayKey(o.t)));
  check(occ.length === 3, 'next Hijri occasions: ' + occ.join('، '));

  // persistence across reload
  const before = await page.evaluate(() => live(S.events).length);
  await sleep(600);
  await page.reload();
  await page.waitForSelector('.since');
  const after = await page.evaluate(() => live(S.events).length);
  check(before === after && after > 5, 'data persists after reload (' + before + ' → ' + after + ')');
  const kind = await page.evaluate(() => STORE.kind);
  console.log('storage:', kind);

  // sample data in a fresh context, light + dark
  for (const scheme of ['light', 'dark']) {
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, locale: 'ar-EG', timezoneId: 'Africa/Cairo', isMobile: true, hasTouch: true });
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => errors.push('pageerror(' + scheme + '): ' + e.message));
    p2.on('console', (m) => { if (m.type() === 'error') errors.push('console(' + scheme + '): ' + m.text()); });
    await p2.goto(URL0);
    await p2.waitForSelector('.onb');
    await p2.click('[data-act="demo"]');
    await p2.waitForSelector('.since');
    await shot(p2, 'demo-home-' + scheme);
    await shotFull(p2, 'demo-home-full-' + scheme);
    await p2.click('.nav [data-v="stats"]');
    await shotFull(p2, 'demo-stats-' + scheme);
    await p2.click('.nav [data-v="health"]');
    await shot(p2, 'demo-growth-' + scheme);
    const ow2 = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(ow2 <= 0, 'no horizontal scroll in sample data (' + scheme + ')');
    const saved = await p2.evaluate(() => (localStorage.getItem('tifli.state.v1') || '').length);
    check(saved === 0, 'sample data is never saved (' + scheme + ')');
    await c2.close();
  }
  await browser.close();
  console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
})();
