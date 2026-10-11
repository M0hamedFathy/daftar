/* ---------------------------------------------------------------------------
   UI base: view state, icons, labels, render loop, ticking clocks, sheets,
   toasts, files (save/share), and one delegated event handler.
--------------------------------------------------------------------------- */

const UI = {
  tab: 'home', day: null, filter: 'all', range: 7, htab: 'growth', gind: 'w', more: null,
  sheet: null, night: false, toast: null, tables: {}, nightMsg: '',
};

function ic(n, cls = '') {
  const id = n.startsWith('i-') ? n : 'p-' + n;
  return '<svg class="ic' + (n.startsWith('i-') ? ' cu' : '') + (cls ? ' ' + cls : '') + '" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
}

const BG = { breast: 'bg-feed', bottle: 'bg-feed', pump: 'bg-feed', diaper: 'bg-diaper', sleep: 'bg-sleep', tummy: 'bg-play', bath: 'bg-care',
  temp: 'bg-health', med: 'bg-health', symptom: 'bg-health', note: 'bg-note', mood: 'bg-mind', exp: 'bg-money' };
const SIDE = { L: 'اليسار', R: 'اليمين' };
const SIDE_S = { L: 'يسار', R: 'يمين' };
const MOODS = [['smiley-sad', 'صعب جدًا'], ['smiley-nervous', 'متعب'], ['smiley-meh', 'عادي'], ['smiley', 'جيد'], ['smiley-wink', 'ممتاز']];
const lab = (arr, id) => { const o = arr.find((x) => x.id === id); return o ? o.label : ''; };
const today = () => dayKey(Date.now());

function mins(ms) { return Math.round(ms / MIN); }
function hm(ms) {          // "3 س 20 د" for totals
  const m = Math.round(ms / MIN); const h = Math.floor(m / 60), r = m % 60;
  if (!h) return r + ' د';
  return h + ' س' + (r ? ' ' + r + ' د' : '');
}
function sideMs(segs, side, t = Date.now()) { return sum((segs || []).filter((g) => g.side === side).map((g) => Math.max(0, (g.e || t) - g.s))); }

function evDetail(ev) {
  const d = ev.d || {};
  switch (ev.t) {
    case 'breast': {
      const L = sideMs(d.segs, 'L'), R = sideMs(d.segs, 'R');
      const parts = [];
      if (L) parts.push('يسار ' + mins(L) + ' د'); if (R) parts.push('يمين ' + mins(R) + ' د');
      return parts.join('، ') || (ev.e ? hm(ev.e - ev.s) : '');
    }
    case 'bottle': return (d.ml ? d.ml + ' مل' : '') + (d.kind ? '، ' + (d.kind === 'bm' ? 'لبن أم' : 'صناعي') : '');
    case 'pump': return (d.ml ? d.ml + ' مل' : '') + (d.side ? '، ' + ({ L: 'يسار', R: 'يمين', B: 'الاثنين' }[d.side]) : '');
    case 'diaper': {
      const k = d.wet && d.dirty ? 'مبلل ومتسخ' : d.dirty ? 'متسخ' : d.wet ? 'مبلل' : 'جاف';
      const c = d.color ? ' (' + lab(STOOL, d.color) + ')' : '';
      return k + c;
    }
    case 'sleep': return [ev.e ? hm(ev.e - ev.s) : '', lab(SLEEP_LOC, d.loc), lab(SLEEP_HOW, d.how)].filter(Boolean).join('، ');
    case 'tummy': return [ev.e ? hm(ev.e - ev.s) : '', lab(TUMMY_POS, d.pos)].filter(Boolean).join('، ');
    case 'temp': return d.c ? num(d.c, 1) + '°' + (d.method ? '، ' + d.method : '') : '';
    case 'med': return [d.name, d.dose].filter(Boolean).join('، ');
    case 'symptom': return d.name || '';
    case 'mood': return [(d.who === 'f' ? 'الأب' : 'الأم'), d.v ? MOODS[d.v - 1][1] : '', d.slept ? 'نوم ' + num(d.slept, 1) + ' س' : ''].filter(Boolean).join('، ');
    case 'exp': return (d.amt ? num(d.amt, 2) + ' ' + esc(S.settings.currency) : '') + (d.cat ? '، ' + d.cat : '');
    default: return '';
  }
}
function evWhen(ev) { return ev.e && ev.e - ev.s > MIN ? fTime(ev.s) + ' – ' + fTime(ev.e) : fTime(ev.s); }

/* ------------------------------------------------------------------ render */
function applyTheme() {
  const t = S && S.settings ? S.settings.theme : 'auto';
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
}
const VIEWS = {};
function render() {
  applyTheme();
  const root = document.getElementById('app');
  if (!S.profile) {
    root.innerHTML = viewOnboard();
  } else {
    const v = VIEWS[UI.tab] || VIEWS.home;
    root.innerHTML = viewTop() + '<main id="main">' + v() + '</main>' + viewNav() +
      '<button class="fab" data-act="log" aria-label="تسجيل جديد">' + ic('plus') + '</button>';
  }
  renderSheet(); renderNight(); renderToast();
}
function viewTop() {
  const a = ageInfo(S.profile);
  const name = S.profile.name || 'طفلنا';
  const c = a && a.cdays !== a.days && a.cdays >= 0 ? '، والمصحَّح ' + (a.cdays < 92 ? pl(Math.floor(a.cdays / 7), U.week) : pl(Math.floor(a.cmonths), U.month)) : '';
  const late = cloudNeedsAttention();
  const cl = cloudSupported() ? (SYNC.state === 'ok' ? 'cloud-check' : 'cloud-arrow-up') : 'cloud-check';
  return '<header class="top"><div class="badge" aria-hidden="true">' + esc(name.trim().charAt(0) || 'ط') + '</div>' +
    '<div class="who"><h1>' + esc(name) + '</h1><p>' + esc(ageText(a)) + c + '</p></div>' +
    '<button class="ibtn' + (late ? ' dot' : '') + '" data-act="go-cloud" aria-label="الحساب والنسخ الاحتياطي">' + ic(cl) + '</button>' +
    '<button class="ibtn" data-act="night" aria-label="وضع الليل">' + ic('moon-stars') + '</button></header>';
}
function viewNav() {
  const tabs = [['home', 'house', 'اليوم'], ['hist', 'list-bullets', 'السجل'], ['stats', 'chart-bar', 'الإحصاءات'], ['health', 'heartbeat', 'الصحة'], ['more', 'dots-three-outline', 'المزيد']];
  return '<nav class="nav" aria-label="الأقسام"><div class="in">' + tabs.map(([k, i, l]) =>
    '<button data-act="tab" data-v="' + k + '"' + (UI.tab === k ? ' aria-current="page"' : '') + '>' + ic(i) + '<span>' + l + '</span></button>').join('') + '</div></nav>';
}
function needBackup() {
  if (DEMO) return false;
  const n = live(S.events).length;
  return n >= 15 && Date.now() - (S.settings.lastBackup || 0) > 7 * DAY;
}

/* ticking: clocks and "ago" labels update in place every second */
let _lastDay = null;
function tick() {
  const t = Date.now();
  if (_lastDay && _lastDay !== dayKey(t)) { _lastDay = dayKey(t); render(); return; }
  _lastDay = dayKey(t);
  document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = clock(t - Number(el.dataset.clock)); });
  document.querySelectorAll('[data-ago]').forEach((el) => { el.textContent = ago(Number(el.dataset.ago), t); });
  document.querySelectorAll('[data-since]').forEach((el) => { el.textContent = since(Number(el.dataset.since), t); });
  document.querySelectorAll('[data-side]').forEach((el) => {
    const T = S.timers.breast; if (!T) return;
    el.textContent = clock(sideMs(T.segs, el.dataset.side, t));
  });
  document.querySelectorAll('[data-btot]').forEach((el) => {
    const T = S.timers.breast; if (!T) return;
    el.textContent = clock(sideMs(T.segs, 'L', t) + sideMs(T.segs, 'R', t));
  });
}

/* ------------------------------------------------------------------ toast */
let _toastT = null;
function toast(msg, undo) {
  UI.toast = { msg, undo };
  renderToast();
  clearTimeout(_toastT);
  _toastT = setTimeout(() => { UI.toast = null; renderToast(); }, undo ? 6000 : 3200);
  if (UI.night) { UI.nightMsg = msg; renderNight(); }
}
function renderToast() {
  const host = document.getElementById('toast');
  if (!host) return;
  if (!UI.toast || UI.night) { host.innerHTML = ''; return; }
  host.innerHTML = '<div class="toast' + (UI.sheet ? ' top' : '') + '" role="status">' + ic('check-circle') + '<span class="grow">' + esc(UI.toast.msg) + '</span>' +
    (UI.toast.undo ? '<button class="link" data-act="undo">تراجع</button>' : '') + '</div>';
}

/* ------------------------------------------------------------------ sheets */
const SHEETS = {};
function openSheet(obj) { UI.sheet = Object.assign({ st: {} }, obj); renderSheet(true); }
function closeSheet() { UI.sheet = null; renderSheet(); if (UI.pendingRender) { UI.pendingRender = false; render(); } }
function renderSheet(fresh) {
  const host = document.getElementById('sheet');
  if (!host) return;
  if (!UI.sheet) { host.innerHTML = ''; document.body.style.overflow = ''; return; }
  const prev = host.querySelector('.bd');
  const top = prev && !fresh ? prev.scrollTop : 0;
  const v = SHEETS[UI.sheet.kind](UI.sheet);
  host.innerHTML = '<div class="scrim" data-act="close"></div>' +
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(v.title) + '" style="z-index:' + (UI.night ? 91 : 51) + '">' +
    '<div class="hd"><h2>' + (v.icon ? '<i class="' + (v.bg || 'bg-note') + '">' + ic(v.icon) + '</i>' : '') + esc(v.title) + '</h2>' +
    '<button class="ibtn" data-act="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
    '<div class="bd">' + v.body + '</div>' + (v.foot ? '<div class="ft">' + v.foot + '</div>' : '') + '</div>';
  if (UI.night) host.querySelector('.scrim').style.zIndex = 90;
  document.body.style.overflow = 'hidden';
  const bd = host.querySelector('.bd'); if (bd) bd.scrollTop = top;
  if (fresh) { const f = host.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 60); }
}
/* form helpers: inputs carry data-k and mirror their value into UI.sheet.st */
const stv = (k, d = '') => (UI.sheet && UI.sheet.st[k] !== undefined ? UI.sheet.st[k] : d);
function fIn(k, label, type = 'text', attrs = '') {
  return '<div class="f"><label for="f-' + k + '">' + label + '</label><input class="in" id="f-' + k + '" data-k="' + k + '" type="' + type + '" value="' + esc(stv(k)) + '" ' + attrs + '></div>';
}
function fArea(k, label, ph = '') {
  return '<div class="f"><label for="f-' + k + '">' + label + '</label><textarea class="in" id="f-' + k + '" data-k="' + k + '" placeholder="' + esc(ph) + '">' + esc(stv(k)) + '</textarea></div>';
}
function fChips(k, label, opts, cls = '') {   // opts: [{id,label,sw?}]
  const cur = stv(k);
  return '<div class="f">' + (label ? '<span class="lab">' + label + '</span>' : '') + '<div class="chips ' + cls + '">' + opts.map((o) =>
    '<button type="button" class="chip" data-act="set" data-k="' + k + '" data-v="' + esc(o.id) + '" aria-pressed="' + (String(cur) === String(o.id)) + '">' +
    (o.sw ? '<i class="sw" style="background:' + o.sw + '"></i>' : '') + esc(o.label) + '</button>').join('') + '</div></div>';
}
function fSeg(k, opts) {
  const cur = stv(k);
  return '<div class="seg" role="group">' + opts.map((o) => '<button type="button" data-act="set" data-k="' + k + '" data-v="' + esc(o.id) + '" aria-pressed="' + (String(cur) === String(o.id)) + '">' + esc(o.label) + '</button>').join('') + '</div>';
}
function fStep(k, label, step, unit, min = 0, dec = 0) {
  return '<div class="f"><span class="lab">' + label + '</span><div class="step">' +
    '<button type="button" data-act="step" data-k="' + k + '" data-v="' + step + '" data-min="' + min + '" data-dec="' + dec + '" aria-label="زيادة">+</button>' +
    '<input class="in" id="f-' + k + '" data-k="' + k + '" inputmode="decimal" value="' + esc(stv(k)) + '" aria-label="' + esc(label) + '">' +
    '<button type="button" data-act="step" data-k="' + k + '" data-v="' + (-step) + '" data-min="' + min + '" data-dec="' + dec + '" aria-label="نقص">−</button>' +
    '</div><div class="unit">' + unit + '</div></div>';
}
const numv = (k) => {
  const s = String(stv(k)).trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.');
  const v = parseFloat(s); return isNaN(v) ? null : v;
};

/* ------------------------------------------------------------------ files */
async function saveFile(name, data, mime) {
  try {
    const blob = new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch (e) { toast('تعذّر حفظ الملف.'); return 'error'; }
}
function canShareFiles() {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })); } catch (e) { return false; }
}
async function shareFile(name, data, mime) {
  try { await navigator.share({ files: [new File([data], name, { type: mime })], title: name }); return true; }
  catch (e) { if (e && e.name === 'AbortError') return false; toast('تعذّرت المشاركة. احفظوا الملف ثم أرسلوه.'); return false; }
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}
function stamp() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

/* ------------------------------------------------------------------ actions */
const ACTS = {};
document.addEventListener('click', (e) => {
  const tipT = e.target.closest('[data-tip]');
  if (tipT) { showTip(tipT, e.clientX, e.clientY); e.stopPropagation(); } else hideTip();
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const f = ACTS[el.dataset.act];
  if (f) { e.preventDefault(); f(el, e); }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.k && UI.sheet) { UI.sheet.st[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; if (UI.sheet.live) UI.sheet.live(); }
  if (el.dataset && el.dataset.chg && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.file && FILES[el.dataset.file]) FILES[el.dataset.file](el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (UI.sheet) closeSheet(); else if (UI.night) { UI.night = false; render(); } }
});
const CHG = {}, FILES = {};

ACTS.tab = (el) => { UI.tab = el.dataset.v; if (UI.tab === 'more') UI.more = null; if (UI.tab === 'hist' && !UI.day) UI.day = today(); render(); window.scrollTo(0, 0); };
ACTS.close = () => closeSheet();
ACTS.set = (el) => {
  const k = el.dataset.k, v = el.dataset.v;
  UI.sheet.st[k] = v;
  if (UI.sheet.onset) UI.sheet.onset(k, v);
  renderSheet();
};
ACTS.step = (el) => {
  const k = el.dataset.k, dec = Number(el.dataset.dec || 0), min = Number(el.dataset.min || 0);
  const cur = numv(k) || 0; const v = Math.max(min, cur + Number(el.dataset.v));
  UI.sheet.st[k] = v.toFixed(dec);
  const inp = document.getElementById('f-' + k); if (inp) inp.value = UI.sheet.st[k];
  if (UI.sheet.live) UI.sheet.live();
};
ACTS.undo = () => {
  const u = UI.toast && UI.toast.undo; UI.toast = null;
  if (u) { u(); render(); }
};
ACTS['go-backup'] = () => { UI.tab = 'more'; UI.more = 'backup'; render(); window.scrollTo(0, 0); };
ACTS['go-cloud'] = () => { UI.tab = 'more'; UI.more = cloudSupported() ? 'cloud' : 'backup'; render(); window.scrollTo(0, 0); };
