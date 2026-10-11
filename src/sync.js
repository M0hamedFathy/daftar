/* ---------------------------------------------------------------------------
   Cloud: optional sign-in and two-phone sync through Firebase (free plan).
   Local data stays the source of truth; the cloud is a shared copy.
   Active only in the hosted app (BUILD 'pwa'). The project settings come from
   Firebase Hosting itself (/__/firebase/init.json), so none are kept in the code.

   Firestore layout
     users/{uid}                 { fid }
     codes/{CODE}                { fid, by }
     families/{fid}              { owner, code, name }
     families/{fid}/members/{uid}{ name, email, code? }
     families/{fid}/items/{key}  { k, v, u, t: serverTime, by: device }
   Sync: push records whose u is newer than what was last pushed; pull items
   whose server time t is newer than the last pull. Last writer wins by u.
--------------------------------------------------------------------------- */

const SYNC = { state: 'off', user: null, fid: null, code: '', err: '', busy: false, lastSync: 0, members: [] };
const REC_KINDS = ['events', 'growth', 'journal', 'appts', 'qs', 'vaxCustom'];
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let FB = null, _pollT = null, _pushT = null;

function cloudSupported() {
  return BUILD === 'pwa' && /^https?:$/.test(location.protocol);
}
/* settings for the Firebase project: built in for tests, otherwise served by Firebase Hosting */
async function cloudConfig() {
  let cfg = (typeof CLOUD !== 'undefined' && CLOUD) ? Object.assign({}, CLOUD) : null;
  if (!cfg) {
    try {
      const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('no config');
      cfg = await r.json();
      lsSet('tifli.fbcfg', JSON.stringify(cfg));
    } catch (e) {
      try { cfg = JSON.parse(lsGet('tifli.fbcfg') || ''); } catch (e2) { cfg = null; }
    }
  }
  if (!cfg || !cfg.apiKey) throw new Error('no config');
  // sign-in pages are served from this same site, which keeps Google sign-in working in Safari and installed apps
  if (/\.(web\.app|firebaseapp\.com)$/.test(location.hostname)) cfg.authDomain = location.host;
  return cfg;
}
async function fbLoad() {
  if (FB) return FB;
  const cfg = await cloudConfig();
  const base = new URL('fb/', document.baseURI).href;
  const [appM, authM, fsM] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore-lite.js'),
  ]);
  const app = appM.initializeApp(cfg);
  FB = { app, auth: authM.getAuth(app), db: fsM.getFirestore(app), A: authM, F: fsM };
  return FB;
}

/* ------------------------------------------------------------------ marks (per family, per device) */
function marksKey() { return 'tifli.sync.' + SYNC.fid; }
function marks() { try { return JSON.parse(lsGet(marksKey()) || '') || { pushed: {}, lastT: 0 }; } catch (e) { return { pushed: {}, lastT: 0 }; } }
function saveMarks(m) { lsSet(marksKey(), JSON.stringify(m)); }

/* ------------------------------------------------------------------ start */
async function cloudInit(force) {
  if (!cloudSupported()) { SYNC.state = 'off'; return; }
  if (!force && lsGet('tifli.cloud') !== '1') { SYNC.state = 'out'; return; }   // never signed in: load nothing
  if (FB && SYNC.state !== 'loading' && SYNC.state !== 'out') return;
  SYNC.state = 'loading'; softRender();
  try { await fbLoad(); }
  catch (e) { SYNC.state = 'error'; SYNC.err = 'تعذّر تحميل مكوّنات الحساب. تأكدوا من الاتصال بالإنترنت ثم حاولوا مرة أخرى.'; softRender(); return; }
  try { await FB.A.getRedirectResult(FB.auth); } catch (e) { SYNC.err = authMsg(e); }
  if (!FB._watch) {
    FB._watch = true;
    FB.A.onAuthStateChanged(FB.auth, (u) => {
      SYNC.user = u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null;
      if (!u) { stopPolling(); SYNC.fid = null; SYNC.state = 'out'; softRender(); return; }
      afterSignIn();
    });
  }
}
async function afterSignIn() {
  lsSet('tifli.cloud', '1');
  const { F, db } = FB, uid = SYNC.user.uid;
  try {
    const us = await F.getDoc(F.doc(db, 'users', uid));
    const fid = us.exists() ? us.data().fid : null;
    if (!fid) { SYNC.state = 'join'; softRender(); return; }
    const fs = await F.getDoc(F.doc(db, 'families', fid));
    if (!fs.exists()) { SYNC.state = 'join'; softRender(); return; }
    SYNC.fid = fid; SYNC.code = fs.data().code || ''; SYNC.state = 'ok'; SYNC.err = '';
    await syncNow();
    startPolling();
  } catch (e) { SYNC.state = 'error'; SYNC.err = fsMsg(e); softRender(); }
}

/* ------------------------------------------------------------------ sign in / out */
function installedApp() {
  try { return !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
}
async function signGoogle() {
  await cloudInit(true); if (!FB) return;
  const p = new FB.A.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  const viaRedirect = () => { lsSet('tifli.cloud', '1'); return FB.A.signInWithRedirect(FB.auth, p); };
  if (installedApp()) { await viaRedirect(); return; }      // pop-up windows are unreliable in an installed app
  try { await FB.A.signInWithPopup(FB.auth, p); }
  catch (e) {
    const c = e && e.code;
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
    if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') { await viaRedirect(); return; }
    throw e;
  }
}
async function signEmail(email, pass, create) {
  await cloudInit(true); if (!FB) return;
  email = String(email || '').trim();
  if (create) await FB.A.createUserWithEmailAndPassword(FB.auth, email, pass);
  else await FB.A.signInWithEmailAndPassword(FB.auth, email, pass);
}
async function resetPass(email) { await cloudInit(true); if (FB) await FB.A.sendPasswordResetEmail(FB.auth, String(email || '').trim()); }
async function signOutCloud() {
  if (!FB) return;
  stopPolling(); await FB.A.signOut(FB.auth);
  lsSet('tifli.cloud', '0'); SYNC.fid = null; SYNC.state = 'out'; softRender();
}

/* ------------------------------------------------------------------ family */
function newCode() { const a = new Uint32Array(6); crypto.getRandomValues(a); return Array.from(a, (x) => CODE_ABC[x % CODE_ABC.length]).join(''); }
function normCode(s) {
  return String(s || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
}
async function createFamily() {
  const { F, db } = FB, uid = SYNC.user.uid;
  let code = newCode();
  for (let i = 0; i < 4 && (await F.getDoc(F.doc(db, 'codes', code))).exists(); i++) code = newCode();
  const fid = F.doc(F.collection(db, 'families')).id;
  await F.setDoc(F.doc(db, 'families', fid), { owner: uid, code, name: (S.profile && S.profile.name) || '', created: F.serverTimestamp() });
  await F.setDoc(F.doc(db, 'families', fid, 'members', uid), { name: SYNC.user.name, email: SYNC.user.email, joined: F.serverTimestamp() });
  await F.setDoc(F.doc(db, 'codes', code), { fid, by: uid, created: F.serverTimestamp() });
  await F.setDoc(F.doc(db, 'users', uid), { fid });
  SYNC.fid = fid; SYNC.code = code; SYNC.state = 'ok';
  saveMarks({ pushed: {}, lastT: 0 });
  await syncNow(); startPolling();
}
async function joinFamily(raw) {
  const { F, db } = FB, uid = SYNC.user.uid, code = normCode(raw);
  if (code.length !== 6) throw new Error('الكود 6 حروف وأرقام. انسخوه كما يظهر في الموبايل الآخر.');
  const c = await F.getDoc(F.doc(db, 'codes', code));
  if (!c.exists()) throw new Error('هذا الكود غير موجود. تأكدوا منه من الموبايل الآخر.');
  const fid = c.data().fid;
  try { await F.setDoc(F.doc(db, 'families', fid, 'members', uid), { code, name: SYNC.user.name, email: SYNC.user.email, joined: F.serverTimestamp() }); }
  catch (e) { if (!(await F.getDoc(F.doc(db, 'families', fid, 'members', uid))).exists()) throw e; }
  await F.setDoc(F.doc(db, 'users', uid), { fid });
  // the family's copy wins for the baby's details and settings on a phone that joins
  if (S.profile) S.profile.u = 1;
  S.settings.u = 1; S.routine.u = 1;
  SYNC.fid = fid; SYNC.code = code; SYNC.state = 'ok';
  saveMarks({ pushed: {}, lastT: 0 });
  await syncNow(); startPolling();
}
async function loadMembers() {
  if (!FB || !SYNC.fid) return;
  try { const q = await FB.F.getDocs(FB.F.collection(FB.db, 'families', SYNC.fid, 'members')); SYNC.members = q.docs.map((d) => d.data()); }
  catch (e) { SYNC.members = []; }
}

/* ------------------------------------------------------------------ push / pull */
function cleanJSON(v) { return JSON.parse(JSON.stringify(v)); }
function collectChanges(P) {
  const out = [];
  const add = (key, k, v, u, id) => { if ((u || 0) > (P[key] || 0)) out.push([key, id === undefined ? { k, v, u: u || 0 } : { k, id, v, u: u || 0 }]); };
  for (const k of REC_KINDS) for (const r of S[k] || []) if (r && r.id) add('r_' + k + '_' + r.id, k, r, r.u);
  for (const [id, rec] of Object.entries(S.vax || {})) if (rec) add('vax_' + id, 'vax', rec, rec.u, id);
  for (const [id, rec] of Object.entries(S.ms || {})) if (rec) add('ms_' + id.replace(/[^A-Za-z0-9_-]/g, '-'), 'ms', rec, rec.u, id);
  for (const [id, rec] of Object.entries(S.sunan || {})) if (rec) add('sn_' + id, 'sunan', rec, rec.u, id);
  // routine ticks: one document per day per phone, so two phones never overwrite each other
  for (const [day, items] of Object.entries((S.routine && S.routine.log) || {})) {
    const mine = {}; let u = 0;
    for (const [item, devs] of Object.entries(items)) { const v = devs && devs[DEVICE]; if (Array.isArray(v)) { mine[item] = v; u = Math.max(u, v[1] || 0); } }
    if (u) add('rt_' + day + '_' + DEVICE, 'rt', mine, u, day);
  }
  if (S.profile) add('profile', 'profile', S.profile, S.profile.u);
  const st = Object.assign({}, S.settings); delete st.theme; delete st.lastBackup; delete st.cloudNag;
  add('settings', 'settings', st, S.settings.u);
  add('routine', 'routine', S.routine.items, S.routine.u);
  return out;
}
async function pushChanges() {
  if (SYNC.state !== 'ok' || !FB || SYNC.pushing) return 0;
  const M = marks(), ch = collectChanges(M.pushed);
  if (!ch.length) return 0;
  SYNC.pushing = true;
  const { F, db } = FB;
  try {
    let i = 0;
    while (i < ch.length) {
      const batch = F.writeBatch(db), part = [];
      let bytes = 0;
      while (i < ch.length && part.length < 400 && (bytes < 3e6 || !part.length)) {
        const [key, data] = ch[i++], clean = cleanJSON(data);
        bytes += JSON.stringify(clean).length;
        batch.set(F.doc(db, 'families', SYNC.fid, 'items', key), Object.assign(clean, { t: F.serverTimestamp(), by: DEVICE }));
        part.push([key, data.u]);
      }
      await batch.commit();
      for (const [key, u] of part) M.pushed[key] = Math.max(M.pushed[key] || 0, u);
      saveMarks(M);
    }
    SYNC.err = '';
    return ch.length;
  } finally { SYNC.pushing = false; }
}
function applyRemote(key, x, M) {
  const u = x.u || 0;
  let ch = false;
  if (REC_KINDS.includes(x.k)) {
    const arr = S[x.k], v = x.v; if (!v || !v.id) return false;
    const i = arr.findIndex((r) => r.id === v.id);
    if (i < 0) { arr.push(v); ch = true; } else if (u > (arr[i].u || 0)) { arr[i] = v; ch = true; }
  } else if (x.k === 'vax' || x.k === 'ms' || x.k === 'sunan') {
    const map = S[x.k] = S[x.k] || {}, cur = map[x.id];
    if (!cur || u > (cur.u || 0)) { map[x.id] = x.v; ch = true; }
  } else if (x.k === 'rt') {
    const L = S.routine.log, dev = x.by; L[x.id] = L[x.id] || {};
    for (const item of Object.keys(x.v || {})) {
      const v = x.v[item]; L[x.id][item] = L[x.id][item] || {};
      const c = L[x.id][item][dev];
      if (Array.isArray(v) && (!c || v[1] > c[1])) { L[x.id][item][dev] = v; ch = true; }
    }
  } else if (x.k === 'profile') {
    if (!S.profile || u > (S.profile.u || 0)) { S.profile = x.v; ch = true; }
  } else if (x.k === 'settings') {
    if (u > (S.settings.u || 0)) { const keep = { theme: S.settings.theme, lastBackup: S.settings.lastBackup, cloudNag: S.settings.cloudNag }; S.settings = Object.assign({}, S.settings, x.v, keep); ch = true; }
  } else if (x.k === 'routine') {
    if (u > (S.routine.u || 0) && Array.isArray(x.v)) { S.routine.items = x.v; S.routine.u = u; ch = true; }
  }
  M.pushed[key] = Math.max(M.pushed[key] || 0, u);
  return ch;
}
async function pullChanges() {
  if (SYNC.state !== 'ok' || !FB) return 0;
  const { F, db } = FB, M = marks();
  const q = F.query(F.collection(db, 'families', SYNC.fid, 'items'), F.where('t', '>', F.Timestamp.fromMillis(M.lastT || 0)));
  const snap = await F.getDocs(q);
  let maxT = M.lastT || 0, changed = 0;
  snap.forEach((d) => { const x = d.data(); const t = x.t && x.t.toMillis ? x.t.toMillis() : 0; if (t > maxT) maxT = t; if (applyRemote(d.id, x, M)) changed++; });
  M.lastT = maxT; saveMarks(M);
  if (changed) await writeState();
  return changed;
}
async function syncNow() {
  if (SYNC.state !== 'ok' || SYNC.busy) return;
  SYNC.busy = true;
  try {
    const got = await pullChanges();
    await pushChanges();
    SYNC.lastSync = Date.now(); SYNC.err = '';
    if (got) softRender(); else updateCloudBadge();
  } catch (e) { SYNC.err = fsMsg(e); updateCloudBadge(); }
  finally { SYNC.busy = false; }
}
function startPolling() {
  stopPolling();
  _pollT = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 45000);
}
function stopPolling() { clearInterval(_pollT); _pollT = null; }
/* called after every local save */
function cloudAfterSave() {
  if (SYNC.state !== 'ok') return;
  clearTimeout(_pushT);
  _pushT = setTimeout(() => { pushChanges().then(() => { SYNC.lastSync = Date.now(); updateCloudBadge(); }).catch((e) => { SYNC.err = fsMsg(e); updateCloudBadge(); }); }, 1500);
}

/* ------------------------------------------------------------------ messages */
function authMsg(e) {
  const c = (e && e.code) || '';
  return ({
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/missing-password': 'اكتبوا كلمة المرور.',
    'auth/weak-password': 'كلمة المرور 6 أحرف على الأقل.',
    'auth/email-already-in-use': 'هذا البريد له حساب بالفعل. اضغطوا «دخول».',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحين.',
    'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحين.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد. اضغطوا «حساب جديد».',
    'auth/too-many-requests': 'محاولات كثيرة. انتظروا دقائق ثم حاولوا مرة أخرى.',
    'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
    'auth/unauthorized-domain': 'هذا الرابط غير مضاف في إعدادات Firebase (Authorized domains).',
    'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة في إعدادات Firebase.',
  })[c] || (e && e.message && /[؀-ۿ]/.test(e.message) ? e.message : 'تعذّر تسجيل الدخول' + (c ? ' (' + c + ')' : '') + '.');
}
function fsMsg(e) {
  const c = (e && e.code) || '';
  if (e && e.message && /[؀-ۿ]/.test(e.message)) return e.message;
  return ({
    'permission-denied': 'لا توجد صلاحية. تأكدوا من الكود، ومن نشر قواعد Firestore كما هي.',
    'unavailable': 'لا يوجد اتصال الآن. ستتم المزامنة تلقائيًا حين يعود.',
    'resource-exhausted': 'وصلتم إلى الحد المجاني لليوم. تعود المزامنة تلقائيًا غدًا، والبيانات محفوظة على الموبايل.',
    'failed-precondition': 'قاعدة البيانات غير جاهزة. تأكدوا من إنشاء Firestore في المشروع.',
    'not-found': 'قاعدة البيانات غير موجودة. أنشئوا Firestore في المشروع.',
  })[c] || 'تعذّرت المزامنة' + (c ? ' (' + c + ')' : '') + '. ستُعاد المحاولة.';
}

/* ------------------------------------------------------------------ rendering helpers */
function softRender() {
  const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (UI.sheet && UI.sheet.kind !== 'auth') { UI.pendingRender = true; updateCloudBadge(); return; }
  if (typing && UI.sheet) { UI.pendingRender = true; return; }
  render();
}
function updateCloudBadge() {
  const b = document.querySelector('[data-act="go-cloud"]');
  if (!b) return;
  b.classList.toggle('dot', cloudNeedsAttention());
}
function cloudNeedsAttention() {
  if (!cloudSupported()) return needBackup();
  if (SYNC.state === 'ok') return !!SYNC.err;
  return live(S.events).length >= 15;
}
