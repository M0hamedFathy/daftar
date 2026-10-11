// Test double for firebase-firestore-lite.js, backed by test/mockserver.js.
import { __uid } from './firebase-auth.js';
const SERVER = 'http://localhost:8790';
class DocRef { constructor(path) { this.path = path; this.id = path.split('/').pop(); } }
class ColRef { constructor(path) { this.path = path; this.id = path.split('/').pop(); } }
const SENT = { __sentinel: 'serverTimestamp' };
export class Timestamp { constructor(ms) { this._ms = ms; } toMillis() { return this._ms; } static fromMillis(ms) { return new Timestamp(ms); } }
export function getFirestore(app) { return { app }; }
export function collection(db, ...segs) { return new ColRef(segs.join('/')); }
export function doc(a, ...segs) {
  if (a instanceof ColRef && !segs.length) return new DocRef(a.path + '/' + Math.random().toString(36).slice(2, 12));
  return new DocRef((a instanceof ColRef ? a.path + '/' : '') + segs.join('/'));
}
export function serverTimestamp() { return SENT; }
function enc(v) {
  if (v === SENT) return { __st: 1 };
  if (v instanceof Timestamp) return { __ts: v._ms };
  if (v === undefined) throw Object.assign(new Error('Unsupported field value: undefined'), { code: 'invalid-argument' });
  if (Array.isArray(v)) { if (v.some(Array.isArray)) throw Object.assign(new Error('Nested arrays are not supported'), { code: 'invalid-argument' }); return v.map(enc); }
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = enc(v[k]); return o; }
  return v;
}
function dec(v) {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === 'object') { if (Object.keys(v).length === 1 && '__ts' in v) return new Timestamp(v.__ts); const o = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; }
  return v;
}
async function call(op, body) {
  body.uid = __uid();
  let r;
  try { r = await fetch(SERVER + '/fs/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw Object.assign(new Error('offline'), { code: 'unavailable' }); }
  const j = await r.json();
  if (j.error) throw Object.assign(new Error(j.error), { code: j.error });
  return j;
}
class Snap { constructor(id, d) { this.id = id; this._d = d; } exists() { return this._d != null; } data() { return this._d == null ? undefined : dec(this._d); } }
export async function getDoc(ref) { const j = await call('get', { path: ref.path }); return new Snap(ref.id, j.data); }
export async function setDoc(ref, data) { await call('set', { writes: [{ path: ref.path, data: enc(data) }] }); }
export function where(field, op, value) { return { field, op, value }; }
export function query(col, ...cons) { return { col, cons }; }
export async function getDocs(q) {
  const col = q instanceof ColRef ? q : q.col, cons = q instanceof ColRef ? [] : q.cons;
  const j = await call('query', { path: col.path, cons: cons.map((c) => ({ field: c.field, op: c.op, value: enc(c.value) })) });
  const docs = j.docs.map((d) => new Snap(d.id, d.data));
  return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) };
}
export function writeBatch(db) {
  const w = [];
  return { set(ref, data) { w.push({ path: ref.path, data: enc(data) }); return this; }, async commit() { if (w.length > 500) throw Object.assign(new Error('too many writes'), { code: 'invalid-argument' }); await call('set', { writes: w }); } };
}
