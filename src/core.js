/* ---------------------------------------------------------------------------
   Core: formatting, dates, state, persistence, merge, export/import, WHO math.
--------------------------------------------------------------------------- */

const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
const APP_ID = 'tifli';
const FORMAT = 1;

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = (o) => JSON.parse(JSON.stringify(o));
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (a) => a.reduce((x, y) => x + y, 0);

function num(n, d = 1) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  const f = Math.pow(10, d);
  const r = Math.round(n * f) / f;
  return r.toLocaleString('en-US', { maximumFractionDigits: d });
}

/* Arabic number + noun agreement. f = [one, two, plural(3-10), accusative(11-99), genitive(100s)] */
const U = {
  day: ['يوم واحد', 'يومان', 'أيام', 'يومًا', 'يوم'],
  week: ['أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعًا', 'أسبوع'],
  month: ['شهر واحد', 'شهران', 'شهور', 'شهرًا', 'شهر'],
  hour: ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة', 'ساعة'],
  minute: ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة', 'دقيقة'],
  time: ['مرة واحدة', 'مرتان', 'مرات', 'مرة', 'مرة'],
  record: ['سجل واحد', 'سجلان', 'سجلات', 'سجلًا', 'سجل'],
};
function pl(n, f) {
  n = Math.round(n);
  const r = n % 100;
  if (n === 0) return '0 ' + f[4];
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  if (r >= 3 && r <= 10) return n + ' ' + f[2];
  if (r >= 11 && r <= 99) return n + ' ' + f[3];
  return n + ' ' + f[4];
}

/* ------------------------------------------------------------------ dates */
const fmt = (opts, loc = 'ar-EG-u-nu-latn') => { try { return new Intl.DateTimeFormat(loc, opts); } catch (e) { return new Intl.DateTimeFormat('ar', opts); } };
const TF = fmt({ hour: 'numeric', minute: '2-digit' });
const DF = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const DFY = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const DFS = fmt({ day: 'numeric', month: 'short' });
const DFW = fmt({ weekday: 'short' });
const MF = fmt({ month: 'long', year: 'numeric' });
let HIJ = null;
try { HIJ = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { HIJ = null; }

const fTime = (ms) => TF.format(new Date(ms));
const fDate = (ms) => DF.format(new Date(ms));
const fDateY = (ms) => DFY.format(new Date(ms));
const fDateS = (ms) => DFS.format(new Date(ms));
const fHijri = (ms) => { try { return HIJ ? HIJ.format(new Date(ms)) : ''; } catch (e) { return ''; } };

function sod(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function dayKey(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function keyMs(k) { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); }
function addDays(ms, n) { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
function addMonths(ms, n) {
  const d = new Date(ms); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last)); return d.getTime();
}
function toLocalInput(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function fromLocalInput(v) { if (!v) return null; const t = new Date(v).getTime(); return isNaN(t) ? null : t; }

function dur(ms, withSec = false) {
  ms = Math.max(0, ms);
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  if (h) return h + ' س ' + (m ? m + ' د' : '');
  if (m) return m + ' د' + (withSec && s ? ' ' + s + ' ث' : '');
  return s + ' ث';
}
function clock(ms) {
  ms = Math.max(0, ms);
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
}
function since(ms, now = Date.now()) {
  const d = Math.max(0, now - ms);
  if (d < MIN) return 'لحظات';
  if (d < HOUR) return Math.floor(d / MIN) + ' د';
  if (d < DAY) { const h = Math.floor(d / HOUR), m = Math.floor((d % HOUR) / MIN); return h + ' س' + (m ? ' ' + m + ' د' : ''); }
  return pl(Math.floor(d / DAY), U.day);
}
function ago(ms, now = Date.now()) {
  const d = now - ms;
  if (d < MIN) return 'الآن';
  if (d < HOUR) return 'منذ ' + pl(Math.floor(d / MIN), U.minute);
  const h = Math.floor(d / HOUR), m = Math.floor((d % HOUR) / MIN);
  if (h < 24) return 'منذ ' + h + ' س' + (m ? ' ' + m + ' د' : '');
  return 'منذ ' + pl(Math.floor(d / DAY), U.day);
}

/* Age from a birth day key. Corrected age uses the due date when it is later than birth. */
function ageInfo(profile, at = Date.now()) {
  if (!profile || !profile.birth) return null;
  const b = keyMs(profile.birth), t = sod(at);
  const days = Math.round((t - b) / DAY);
  const bd = new Date(b), td = new Date(t);
  let months = (td.getFullYear() - bd.getFullYear()) * 12 + (td.getMonth() - bd.getMonth());
  if (td.getDate() < bd.getDate()) months--;
  let cdays = days;
  if (profile.due) {
    const gap = Math.round((keyMs(profile.due) - b) / DAY);
    if (gap > 7) cdays = days - gap;
  }
  return { days, weeks: Math.floor(days / 7), wd: days % 7, week: Math.floor(days / 7) + 1, months: Math.max(0, months),
           cdays, cweek: Math.floor(Math.max(0, cdays) / 7) + 1, cmonths: Math.max(0, cdays) / 30.4375 };
}
function ageText(a) {
  if (!a) return '';
  if (a.days < 0) return 'لم يولد بعد';
  if (a.days < 14) return 'عمره ' + pl(a.days, U.day);
  if (a.days < 92) return 'عمره ' + pl(a.weeks, U.week) + (a.wd ? ' و' + pl(a.wd, U.day) : '');
  const md = Math.round((sod(Date.now()) - addMonths(keyMs(S.profile.birth), a.months)) / DAY);
  return 'عمره ' + pl(a.months, U.month) + (md > 0 ? ' و' + pl(md, U.day) : '');
}

/* ------------------------------------------------------------------ state */
let S = null;            // the live state
let DEVICE = null;       // this install's id (never overwritten by an import)

function blankState() {
  return {
    app: APP_ID, v: FORMAT, created: Date.now(),
    profile: null,
    events: [], growth: [], vaxCustom: [], appts: [], qs: [], journal: [],
    vax: {}, ms: {},
    routine: { items: clone(ROUTINE_DEFAULT), u: 0, log: {} },
    timers: {},
    settings: { theme: 'auto', schedule: 'eg', currency: 'ج.م', adhkar: true, lastBackup: 0, hard: {}, u: 0 },
  };
}
function normalize(st) {
  const b = blankState();
  const o = Object.assign(b, st || {});
  for (const k of ['events', 'growth', 'vaxCustom', 'appts', 'qs', 'journal']) if (!Array.isArray(o[k])) o[k] = [];
  for (const k of ['vax', 'ms', 'timers']) if (!o[k] || typeof o[k] !== 'object') o[k] = {};
  o.routine = Object.assign({ items: clone(ROUTINE_DEFAULT), u: 0, log: {} }, o.routine || {});
  if (!Array.isArray(o.routine.items) || !o.routine.items.length) o.routine.items = clone(ROUTINE_DEFAULT);
  o.settings = Object.assign(blankState().settings, o.settings || {});
  return o;
}
const live = (arr) => arr.filter((r) => !r.x);
const now = () => Date.now();

/* ------------------------------------------------------------------ persistence */
const STORE = { kind: 'none', ok: false, persisted: false, error: '' };
const LS_KEY = 'tifli.state.v1', LS_DEV = 'tifli.device';
let _idb = null;

function idbOpen() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('tifli', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      setTimeout(() => rej(new Error('idb timeout')), 4000);
    } catch (e) { rej(e); }
  });
}
function idbGet(key) {
  return new Promise((res, rej) => {
    try { const tx = _idb.transaction('kv', 'readonly'); const q = tx.objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }
    catch (e) { rej(e); }
  });
}
function idbPut(key, val) {
  return new Promise((res, rej) => {
    try { const tx = _idb.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }
    catch (e) { rej(e); }
  });
}
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

async function loadState() {
  let data = null;
  try { _idb = await idbOpen(); data = await idbGet('state'); STORE.kind = 'idb'; STORE.ok = true; }
  catch (e) { _idb = null; STORE.error = String(e && e.message || e); }
  if (!data) {
    const raw = lsGet(LS_KEY);
    if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    if (!_idb) { STORE.kind = lsSet('tifli.probe', '1') ? 'ls' : 'none'; STORE.ok = STORE.kind !== 'none'; }
  }
  DEVICE = lsGet(LS_DEV) || (data && data._device) || uid();
  lsSet(LS_DEV, DEVICE);
  S = normalize(data);
  S._device = DEVICE;
  try { if (navigator.storage && navigator.storage.persisted) STORE.persisted = await navigator.storage.persisted(); } catch (e) {}
  return S;
}

let _saveT = null, _saving = Promise.resolve();
let DEMO = false;         // sample data on screen: never written to storage
function save(immediate = false) {
  if (DEMO) return;
  clearTimeout(_saveT);
  const run = () => { _saving = _saving.then(writeState).catch(() => {}); };
  if (immediate) run(); else _saveT = setTimeout(run, 250);
}
async function writeState() {
  if (!S) return;
  S._device = DEVICE;
  S.saved = now();
  let ok = false;
  if (_idb) { try { await idbPut('state', S); ok = true; } catch (e) { STORE.error = String(e && e.message || e); } }
  // a light mirror in localStorage (without photos) so a lost IndexedDB is recoverable
  try {
    const light = Object.assign({}, S, { journal: S.journal.map((j) => (j.photo ? Object.assign({}, j, { photo: '' }) : j)) });
    const txt = JSON.stringify(light);
    if (txt.length < 4.5e6) ok = lsSet(LS_KEY, txt) || ok;
  } catch (e) {}
  STORE.ok = ok;
  if (typeof cloudAfterSave === 'function') cloudAfterSave();
  if (ok && !STORE.persisted && navigator.storage && navigator.storage.persist && (S.events.length > 3)) {
    try { STORE.persisted = await navigator.storage.persist(); } catch (e) {}
  }
}

/* ------------------------------------------------------------------ records */
function addEvent(type, s, e, d = {}, n = '') {
  const ev = { id: uid(), t: type, s, e: e || null, d, n: n || '', u: now(), by: DEVICE };
  S.events.push(ev); save(); return ev;
}
function updRec(rec, patch) { Object.assign(rec, patch, { u: now() }); save(); }
function delRec(rec) { rec.x = 1; rec.u = now(); save(); }
function findEvent(id) { return S.events.find((e) => e.id === id); }

/* events overlapping [a, b) */
function eventsIn(a, b, types) {
  const out = [];
  for (const ev of S.events) {
    if (ev.x) continue;
    if (types && !types.includes(ev.t)) continue;
    const e = ev.e || ev.s;
    if (ev.s < b && e >= a) out.push(ev);
  }
  return out.sort((x, y) => y.s - x.s);
}
function lastEvent(types) {
  let best = null;
  for (const ev of S.events) if (!ev.x && types.includes(ev.t) && (!best || ev.s > best.s)) best = ev;
  return best;
}
const overlap = (s, e, a, b) => Math.max(0, Math.min(e, b) - Math.max(s, a));
function breastMs(ev) {
  if (ev.d && Array.isArray(ev.d.segs) && ev.d.segs.length) return sum(ev.d.segs.map((g) => Math.max(0, (g.e || g.s) - g.s)));
  return ev.e ? ev.e - ev.s : 0;
}

/* routine counts: log[day][item][device] = [n, u] */
function routineItem(id) { return S.routine.items.find((i) => i.id === id) || ROUTINE_MIN.find((i) => i.id === id); }
function routineCount(day, item) {
  const it = routineItem(item);
  if (it && it.auto === 'tummy') return eventsIn(keyMs(day), addDays(keyMs(day), 1), ['tummy']).filter((e) => e.s >= keyMs(day)).length;
  if (it && it.auto === 'wet') return eventsIn(keyMs(day), addDays(keyMs(day), 1), ['diaper']).filter((e) => e.s >= keyMs(day) && e.d && e.d.wet).length;
  if (it && it.auto === 'vitd') return eventsIn(keyMs(day), addDays(keyMs(day), 1), ['med']).filter((e) => /فيتامين\s*د/.test((e.d && e.d.name) || '')).length;
  const rec = ((S.routine.log[day] || {})[item]) || {};
  return sum(Object.values(rec).map((v) => (Array.isArray(v) ? v[0] : 0)));
}
function routineBump(day, item, delta) {
  const L = S.routine.log;
  L[day] = L[day] || {}; L[day][item] = L[day][item] || {};
  const cur = L[day][item][DEVICE] ? L[day][item][DEVICE][0] : 0;
  const total = routineCount(day, item);
  if (delta < 0 && total <= 0) return;
  let n = cur + delta;
  if (n < 0) n = 0;
  L[day][item][DEVICE] = [n, now()];
  save();
}

/* ------------------------------------------------------------------ merge (idempotent) */
function mergeArr(a = [], b = []) {
  const m = new Map(a.map((r) => [r.id, r]));
  for (const r of b) { if (!r || !r.id) continue; const c = m.get(r.id); if (!c || (r.u || 0) > (c.u || 0)) m.set(r.id, r); }
  return [...m.values()];
}
function mergeMap(a = {}, b = {}) {
  const o = Object.assign({}, a);
  for (const k of Object.keys(b)) { if (!o[k] || ((b[k] && b[k].u) || 0) > ((o[k] && o[k].u) || 0)) o[k] = b[k]; }
  return o;
}
function mergeState(A, B) {
  B = normalize(B);
  const R = normalize(clone(A));
  for (const k of ['events', 'growth', 'vaxCustom', 'appts', 'qs', 'journal']) R[k] = mergeArr(A[k], B[k]);
  R.vax = mergeMap(A.vax, B.vax);
  R.ms = mergeMap(A.ms, B.ms);
  if ((B.routine.u || 0) > (A.routine.u || 0)) R.routine.items = clone(B.routine.items);
  const L = R.routine.log;
  for (const day of Object.keys(B.routine.log || {})) {
    L[day] = L[day] || {};
    for (const item of Object.keys(B.routine.log[day])) {
      L[day][item] = L[day][item] || {};
      for (const dev of Object.keys(B.routine.log[day][item])) {
        const v = B.routine.log[day][item][dev], c = L[day][item][dev];
        if (!c || (v && v[1] > c[1])) L[day][item][dev] = v;
      }
    }
  }
  if (B.profile && (!A.profile || (B.profile.u || 0) > (A.profile.u || 0))) R.profile = clone(B.profile);
  const keepBackup = A.settings.lastBackup;
  if ((B.settings.u || 0) > (A.settings.u || 0)) R.settings = Object.assign({}, B.settings);
  R.settings.lastBackup = keepBackup;
  R.timers = A.timers || {};
  return R;
}
function countRecords(st) {
  return live(st.events).length + live(st.growth).length + live(st.journal).length + live(st.appts).length + Object.keys(st.vax || {}).length;
}

/* ------------------------------------------------------------------ export / import */
function exportObject() {
  const data = clone(S);
  delete data.timers;
  return { app: APP_ID, format: FORMAT, exportedAt: new Date().toISOString(), device: DEVICE, data };
}
function parseImport(text) {
  let obj = null;
  text = String(text || '').trim();
  if (!text) throw new Error('الملف فارغ.');
  try { obj = JSON.parse(text); } catch (e) { throw new Error('هذا ليس ملف نسخة احتياطية من دفتر الرضيع.'); }
  const data = obj && obj.app === APP_ID ? obj.data : (obj && obj.events && obj.routine ? obj : null);
  if (!data) throw new Error('هذا ليس ملف نسخة احتياطية من دفتر الرضيع.');
  return normalize(data);
}
async function encodeCode(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      const buf = new Uint8Array(await new Response(cs).arrayBuffer());
      return 'DAFTAR1:' + b64(buf);
    } catch (e) {}
  }
  return 'DAFTAR0:' + b64(bytes);
}
async function decodeCode(code) {
  code = String(code || '').replace(/\s+/g, '');
  if (code.startsWith('DAFTAR1:')) {
    const bytes = unb64(code.slice(8));
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(ds).text();
  }
  if (code.startsWith('DAFTAR0:')) return new TextDecoder().decode(unb64(code.slice(8)));
  return code; // maybe raw JSON
}
function b64(bytes) { let s = ''; const ch = 0x8000; for (let i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s); }
function unb64(s) { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

/* ------------------------------------------------------------------ CSV + ZIP */
function csv(rows) {
  const q = (v) => { v = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(files) { // files: [{name, data: string|Uint8Array}] -> Uint8Array (stored, no compression)
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
        dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
    c.setUint32(38, 0, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const csize = sum(central.map((p) => p.length));
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)];
  const out = new Uint8Array(sum(all.map((p) => p.length))); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

/* ------------------------------------------------------------------ WHO growth math */
function lmsAt(tab, d) {
  if (!tab || !tab.length) return null;
  if (d <= tab[0][0]) return tab[0].slice(1);
  for (let i = 1; i < tab.length; i++) {
    if (d <= tab[i][0]) {
      const a = tab[i - 1], b = tab[i], f = (d - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  return tab[tab.length - 1].slice(1);
}
const atZ = (z, [L, M, Sg]) => (Math.abs(L) < 1e-9 ? M * Math.exp(Sg * z) : M * Math.pow(1 + L * Sg * z, 1 / L));
function zOf(x, lms, restricted) {
  const [L, M, Sg] = lms;
  let z = Math.abs(L) < 1e-9 ? Math.log(x / M) / Sg : (Math.pow(x / M, L) - 1) / (L * Sg);
  if (restricted && Math.abs(z) > 3) {
    if (z > 3) { const s3 = atZ(3, lms), s23 = s3 - atZ(2, lms); z = 3 + (x - s3) / s23; }
    else { const s3 = atZ(-3, lms), s23 = atZ(-2, lms) - s3; z = -3 + (x - s3) / s23; }
  }
  return z;
}
function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
const pctOf = (z) => 50 * (1 + erf(z / Math.SQRT2));
const GROWTH_IND = {
  w: { key: 'wfa', label: 'الوزن', unit: 'كجم', d: 2, restricted: true },
  l: { key: 'lfa', label: 'الطول', unit: 'سم', d: 1, restricted: false },
  h: { key: 'hcfa', label: 'محيط الرأس', unit: 'سم', d: 1, restricted: false },
};
function growthZ(ind, value, ageDays, sex) {
  if (!WHO || value === null || value === undefined || value === '' || ageDays < 0 || ageDays > 1856) return null;
  const tab = WHO[GROWTH_IND[ind].key][sex === 'f' ? '2' : '1'];
  const lms = lmsAt(tab, ageDays);
  if (!lms) return null;
  const z = zOf(Number(value), lms, GROWTH_IND[ind].restricted);
  return { z, p: pctOf(z) };
}
function measureAgeDays(dateKey) {
  if (!S.profile) return 0;
  let d = Math.round((keyMs(dateKey) - keyMs(S.profile.birth)) / DAY);
  if (S.profile.due) { const gap = Math.round((keyMs(S.profile.due) - keyMs(S.profile.birth)) / DAY); if (gap > 7) d -= gap; }
  return d;
}
