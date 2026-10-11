// Tiny stand-in for Firebase Auth + Firestore used by the sync tests. Enforces the same rules as firestore.rules.
const http = require('http');
const users = new Map();      // email -> {uid, email, password, displayName}
const docs = new Map();       // path -> data
let last = 0, down = false, reads = 0, writes = 0;
const now = () => (last = Math.max(Date.now(), last + 1));
const isMember = (uid, fid) => !!uid && docs.has('families/' + fid + '/members/' + uid);
function fill(v, ts) {
  if (Array.isArray(v)) return v.map((x) => fill(x, ts));
  if (v && typeof v === 'object') { if (v.__st === 1 && Object.keys(v).length === 1) return { __ts: ts }; const o = {}; for (const k of Object.keys(v)) o[k] = fill(v[k], ts); return o; }
  return v;
}
function canRead(uid, path) {
  const p = path.split('/');
  if (!uid) return false;
  if (p[0] === 'users') return p[1] === uid;
  if (p[0] === 'codes') return p.length === 2;
  if (p[0] === 'families') return isMember(uid, p[1]);
  return false;
}
function canWrite(uid, path, data, exists) {
  const p = path.split('/');
  if (!uid) return false;
  if (p[0] === 'users' && p.length === 2) return p[1] === uid;
  if (p[0] === 'codes' && p.length === 2) {
    if (exists) return false;
    const fam = docs.get('families/' + data.fid);
    return data.by === uid && fam && fam.owner === uid && fam.code === p[1];
  }
  if (p[0] === 'families' && p.length === 2) {
    if (!exists) return data.owner === uid;
    const cur = docs.get(path);
    return isMember(uid, p[1]) && data.owner === cur.owner && data.code === cur.code;
  }
  if (p[0] === 'families' && p[2] === 'members' && p.length === 4) {
    if (exists) return false;
    const fam = docs.get('families/' + p[1]);
    return p[3] === uid && fam && (fam.owner === uid || data.code === fam.code);
  }
  if (p[0] === 'families' && p[2] === 'items' && p.length === 4) return isMember(uid, p[1]);
  return false;
}
function json(res, o) { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }); res.end(JSON.stringify(o)); }
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, {});
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let b = {}; try { b = JSON.parse(body || '{}'); } catch (e) {}
    const url = req.url;
    if (url === '/control') { if ('down' in b) down = !!b.down; if (b.reset) { users.clear(); docs.clear(); } return json(res, { ok: true, reads, writes, docs: docs.size }); }
    if (url === '/dump') return json(res, { docs: Object.fromEntries(docs), reads, writes });
    if (down) return json(res, { error: url.startsWith('/auth') ? 'auth/network-request-failed' : 'unavailable' });
    if (url === '/auth/signup') {
      if (users.has(b.email)) return json(res, { error: 'auth/email-already-in-use' });
      if (String(b.password || '').length < 6) return json(res, { error: 'auth/weak-password' });
      const u = { uid: 'u' + Math.random().toString(36).slice(2, 10), email: b.email, displayName: b.displayName || '' };
      users.set(b.email, Object.assign({ password: b.password }, u)); return json(res, { user: u });
    }
    if (url === '/auth/signin') {
      const u = users.get(b.email);
      if (!u || u.password !== b.password) return json(res, { error: 'auth/invalid-credential' });
      return json(res, { user: { uid: u.uid, email: u.email, displayName: u.displayName } });
    }
    if (url === '/fs/get') {
      if (!canRead(b.uid, b.path)) return json(res, { error: 'permission-denied' });
      reads++; return json(res, { data: docs.has(b.path) ? docs.get(b.path) : null });
    }
    if (url === '/fs/set') {
      for (const w of b.writes) if (!canWrite(b.uid, w.path, w.data, docs.has(w.path))) return json(res, { error: 'permission-denied' });
      const ts = now();
      for (const w of b.writes) { docs.set(w.path, fill(w.data, ts)); writes++; }
      return json(res, { ok: true });
    }
    if (url === '/fs/query') {
      const p = b.path.split('/');
      if (!(p[0] === 'families' && (p[2] === 'items' || p[2] === 'members') && isMember(b.uid, p[1]))) return json(res, { error: 'permission-denied' });
      const out = [];
      for (const [path, data] of docs) {
        const q = path.split('/');
        if (q.length !== p.length + 1 || !path.startsWith(b.path + '/')) continue;
        let ok = true;
        for (const c of b.cons) {
          const v = data[c.field], x = c.value;
          const vv = v && v.__ts !== undefined ? v.__ts : v, xx = x && x.__ts !== undefined ? x.__ts : x;
          if (vv === undefined) { ok = false; break; }
          if (c.op === '>' && !(vv > xx)) ok = false; if (c.op === '>=' && !(vv >= xx)) ok = false; if (c.op === '==' && vv !== xx) ok = false;
        }
        if (ok) out.push({ id: q[q.length - 1], data });
      }
      reads += Math.max(1, out.length);
      return json(res, { docs: out });
    }
    json(res, { error: 'not-found' });
  });
}).listen(8790, () => console.log('mock firebase on :8790'));
