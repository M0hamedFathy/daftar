// Test double for firebase-auth.js, backed by test/mockserver.js.
const SERVER = 'http://localhost:8790';
const subs = [];
let cur = null;
try { cur = JSON.parse(localStorage.getItem('mock.auth') || 'null'); } catch (e) { cur = null; }
function emit() { for (const f of subs) f(cur); }
function keep(u) { cur = u; if (u) localStorage.setItem('mock.auth', JSON.stringify(u)); else localStorage.removeItem('mock.auth'); emit(); return { user: u }; }
async function call(path, body) {
  const r = await fetch(SERVER + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) { const e = new Error(j.error); e.code = j.error; throw e; }
  return j;
}
export function __uid() { return cur ? cur.uid : null; }
export function getAuth(app) { return { app }; }
export class GoogleAuthProvider { setCustomParameters() {} }
export function onAuthStateChanged(auth, cb) { subs.push(cb); setTimeout(() => cb(cur), 0); return () => {}; }
export async function createUserWithEmailAndPassword(auth, email, password) { return keep((await call('/auth/signup', { email, password })).user); }
export async function signInWithEmailAndPassword(auth, email, password) { return keep((await call('/auth/signin', { email, password })).user); }
export async function signInWithPopup() { return keep((await call('/auth/signup', { email: 'g' + Date.now() + '@gmail.test', password: 'google', displayName: 'Google User' })).user); }
export async function signInWithRedirect() { const e = new Error('redirect'); e.code = 'auth/operation-not-supported-in-this-environment'; throw e; }
export async function getRedirectResult() { return null; }
export async function sendPasswordResetEmail() { return; }
export async function signOut() { keep(null); }
