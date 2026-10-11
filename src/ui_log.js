/* ---------------------------------------------------------------------------
   Logging sheets: one form per event type, used for new entries and edits.
--------------------------------------------------------------------------- */

const LOG_ORDER = [
  ['breast', 'رضاعة طبيعية'], ['bottle', 'ببرونة'], ['pump', 'شفط حليب'], ['diaper', 'حفاض'], ['sleep', 'نوم'], ['tummy', 'وقت البطن'],
  ['bath', 'استحمام'], ['temp', 'حرارة'], ['med', 'دواء أو فيتامين'], ['symptom', 'عرض صحي'], ['growth', 'وزن وطول'], ['note', 'ملاحظة'],
  ['mood', 'مزاج الوالدين'], ['exp', 'مصروف'], ['journal', 'ذكرى أو صورة'],
];
const LOG_ICON = { growth: ['ruler', 'bg-health'], journal: ['camera', 'bg-faith'] };

/* default time for a new entry: now, or the chosen past day at the current clock time */
function defaultTime() {
  if (UI.tab === 'hist' && UI.day && UI.day !== today()) {
    const d = new Date(keyMs(UI.day)), n = new Date(); d.setHours(n.getHours(), n.getMinutes(), 0, 0); return d.getTime();
  }
  return Date.now();
}

ACTS.log = (el) => {
  const t = el.dataset.type;
  if (!t) return openSheet({ kind: 'pick' });
  openLog(t);
};
function openLog(type, ev) {
  if (type === 'growth') return openSheet({ kind: 'growth', st: growthInit(ev) });
  if (type === 'journal') return openSheet({ kind: 'journal', st: journalInit(ev) });
  const st = LOG[type].init(ev);
  openSheet({ kind: 'log', type, ev: ev || null, st });
}
ACTS.edit = (el) => {
  const ev = findEvent(el.dataset.id);
  if (ev) openLog(ev.t, ev);
};

SHEETS.pick = () => ({
  title: 'تسجيل جديد', icon: 'plus', bg: 'bg-note',
  body: '<div class="pick">' + LOG_ORDER.map(([t, l]) => {
    const [i, bg] = LOG_ICON[t] || [TYPES[t].icon, BG[t]];
    return '<button class="qb" data-act="pick" data-type="' + t + '"><i class="' + bg + '">' + ic(i) + '</i>' + l + '</button>';
  }).join('') + '</div>',
});
ACTS.pick = (el) => { closeSheet(); openLog(el.dataset.type); };

SHEETS.log = (sh) => {
  const L = LOG[sh.type];
  const body = L.body(sh.st, sh.ev);
  const foot = L.foot ? L.foot(sh.st, sh.ev) : stdFoot(sh.ev);
  return { title: (sh.ev ? 'تعديل: ' : '') + TYPES[sh.type].label, icon: TYPES[sh.type].icon, bg: BG[sh.type], body, foot };
};
function stdFoot(ev) {
  return (ev ? '<button class="btn danger' + (UI.sheet.st._del ? ' armed' : '') + '" data-act="del">' + ic('trash') + (UI.sheet.st._del ? 'اضغطوا مرة أخرى للحذف' : 'حذف') + '</button>' : '') +
    '<button class="btn pri" data-act="save">' + ic('check') + 'حفظ</button>';
}
ACTS.save = () => {
  const sh = UI.sheet; if (!sh) return;
  const L = LOG[sh.type];
  const err = L.check ? L.check(sh.st) : '';
  if (err) { sh.st._err = err; renderSheet(); return; }
  const out = L.save(sh.st);          // {s, e, d, n}
  if (sh.ev) { updRec(sh.ev, out); closeSheet(); render(); toast('حُفظ التعديل'); }
  else { const ev = addEvent(sh.type, out.s, out.e, out.d, out.n); closeSheet(); render(); toast('سُجّل: ' + TYPES[sh.type].label + (evDetail(ev) ? '، ' + evDetail(ev) : ''), () => delRec(ev)); }
};
ACTS.del = () => {
  const sh = UI.sheet; if (!sh) return;
  if (!sh.st._del) { sh.st._del = 1; renderSheet(); return; }
  const target = sh.ev || sh.rec;
  if (sh.kind === 'growth' && sh.rec) delRec(sh.rec);
  else if (sh.kind === 'journal' && sh.rec) delRec(sh.rec);
  else if (target) delRec(target);
  closeSheet(); render(); toast('حُذف السجل', () => { target.x = 0; target.u = Date.now(); save(); });
};
/* inputs show minutes only; keep the exact time when the field was left as prefilled */
function t0(k, ms) { const o = {}; o[k] = toLocalInput(ms); o['_t0' + k] = ms; return o; }
function tval(st, k) { const v = st[k], t = st['_t0' + k]; if (t && v === toLocalInput(t)) return t; return fromLocalInput(v); }
const errHtml = (st) => (st._err ? '<p class="hint warn">' + esc(st._err) + '</p>' : '');
function timeField(k = 's', label = 'الوقت') {
  const sh = UI.sheet, st = sh.st;
  if (sh.ev || st['_showT' + k]) return fIn(k, label, 'datetime-local');
  const t = tval(st, k), nowish = t && Math.abs(Date.now() - t) < 2 * MIN;
  const txt = nowish ? 'الآن' : (t ? (sod(t) === sod(Date.now()) ? fTime(t) : fDateS(t) + '، ' + fTime(t)) : '');
  return '<div class="trow"><span class="lab">' + label + '</span><b>' + txt + '</b><button class="link" data-act="show" data-k="_showT' + k + '">تغيير</button></div>';
}
function noteField() {
  const sh = UI.sheet;
  if ((sh.ev && sh.st.n) || sh.st._showN) return fArea('n', 'ملاحظة');
  return '<button class="link" data-act="show" data-k="_showN">+ إضافة ملاحظة</button>';
}
ACTS.show = (el) => { UI.sheet.st[el.dataset.k] = 1; renderSheet(); };

const LOG = {
  breast: {
    init(ev) {
      if (ev) {
        const segs = (ev.d && ev.d.segs) || [];
        return { ...t0('s', ev.s), mL: String(Math.round(sideMs(segs, 'L') / MIN)), mR: String(Math.round(sideMs(segs, 'R') / MIN)),
          first: (segs[0] && segs[0].side) || 'L', n: ev.n || '', mode: 'manual' };
      }
      const lb = lastEvent(['breast']);
      return { ...t0('s', defaultTime()), mL: '10', mR: '10', first: lb && lb.d && lb.d.last === 'L' ? 'R' : 'L', n: '', mode: UI.tab === 'hist' && UI.day !== today() ? 'manual' : 'timer' };
    },
    body(st, ev) {
      const T = S.timers.breast;
      if (!ev && T) {
        const cur = T.segs[T.segs.length - 1], run = cur && !cur.e;
        return '<div class="timer feed" style="box-shadow:none"><div class="lbl">' + (run ? 'ترضع الآن من ' + SIDE[cur.side] : 'متوقفة مؤقتًا: اختاري الثدي للمتابعة') + '</div>' +
          '<div class="clock" data-btot="1">' + clock(sideMs(T.segs, 'L') + sideMs(T.segs, 'R')) + '</div>' +
          '<div class="sides">' + ['R', 'L'].map((sd) => '<button class="side" data-act="bt-side" data-v="' + sd + '" aria-pressed="' + (run && cur.side === sd) + '">' + SIDE[sd] + '<small data-side="' + sd + '">' + clock(sideMs(T.segs, sd)) + '</small></button>').join('') + '</div></div>' +
          '<p class="hint">اضغطي على الثدي الآخر عند التبديل. إن نام أثناء الرضاعة فاضغطي «انتهت الرضعة» حين يتركه.</p>';
      }
      const lb = lastEvent(['breast']);
      const next = lb && lb.d && lb.d.last ? (lb.d.last === 'L' ? 'R' : 'L') : null;
      let h = '';
      if (!ev && st.mode === 'timer') {
        h += '<p class="sm">' + (next ? 'آخر رضعة انتهت ب' + SIDE[lb.d.last] + '، فالتالي <b>' + SIDE[next] + '</b>.' : 'من أي ثدي تبدئين؟') + '</p>' +
          '<div class="sides">' + ['R', 'L'].map((sd) => '<button class="side big" data-act="bt-side" data-v="' + sd + '" aria-pressed="' + (next === sd) + '">' + SIDE[sd] + (next === sd ? '<small>التالي</small>' : '') + '</button>').join('') + '</div>' +
          '<button class="link" data-act="set" data-k="mode" data-v="manual">أو سجّلي رضعة سابقة بالدقائق</button>';
        return h;
      }
      if (!ev) h += '<button class="link" data-act="set" data-k="mode" data-v="timer">العودة إلى المؤقت</button>';
      h += timeField('s', 'بدأت') +
        '<div class="g2">' + fStep('mR', 'اليمين', 1, 'دقيقة') + fStep('mL', 'اليسار', 1, 'دقيقة') + '</div>' +
        fChips('first', 'بدأت ب', [{ id: 'R', label: 'اليمين' }, { id: 'L', label: 'اليسار' }]) + noteField() + errHtml(st);
      return h;
    },
    foot(st, ev) { if (!ev && (S.timers.breast || st.mode === 'timer')) return S.timers.breast ? '<button class="btn ghost" data-act="bt-cancel">إلغاء</button><button class="btn pri" data-act="bt-finish">' + ic('check') + 'انتهت الرضعة</button>' : ''; return stdFoot(ev); },
    check(st) { const s = tval(st, 's'); if (!s) return 'اختاروا وقت البداية.'; if ((numv('mL') || 0) + (numv('mR') || 0) <= 0) return 'أدخلوا دقائق ثدي واحد على الأقل.'; return ''; },
    save(st) {
      const s = tval(st, 's'), mL = (numv('mL') || 0) * MIN, mR = (numv('mR') || 0) * MIN;
      const order = st.first === 'R' ? [['R', mR], ['L', mL]] : [['L', mL], ['R', mR]];
      const segs = []; let t = s;
      for (const [side, ms] of order) if (ms > 0) { segs.push({ side, s: t, e: t + ms }); t += ms; }
      return { s, e: t, d: { segs, last: segs[segs.length - 1].side }, n: st.n || '' };
    },
  },
  bottle: {
    init(ev) {
      if (ev) return { ...t0('s', ev.s), ml: String((ev.d && ev.d.ml) || ''), kind: (ev.d && ev.d.kind) || 'f', n: ev.n || '' };
      const lb = lastEvent(['bottle']);
      return { ...t0('s', defaultTime()), ml: String((lb && lb.d && lb.d.ml) || 90), kind: (lb && lb.d && lb.d.kind) || (S.profile.feed === 'breast' ? 'bm' : 'f'), n: '' };
    },
    body(st) {
      return fStep('ml', 'الكمية', 10, 'مل') + fSeg('kind', [{ id: 'bm', label: 'لبن أم' }, { id: 'f', label: 'صناعي' }]) + timeField() + noteField() + errHtml(st);
    },
    check() { const v = numv('ml'); if (!v || v <= 0) return 'أدخلوا الكمية بالمللي.'; if (v > 400) return 'الكمية تبدو كبيرة جدًا. راجعوها.'; return ''; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { ml: Math.round(numv('ml')), kind: st.kind }, n: st.n || '' }; },
  },
  pump: {
    init(ev) { return ev ? { ...t0('s', ev.s), ml: String((ev.d && ev.d.ml) || ''), side: (ev.d && ev.d.side) || 'B', n: ev.n || '' } : { ...t0('s', defaultTime()), ml: '60', side: 'B', n: '' }; },
    body(st) { return fStep('ml', 'الكمية', 10, 'مل') + fChips('side', 'من', [{ id: 'R', label: 'اليمين' }, { id: 'L', label: 'اليسار' }, { id: 'B', label: 'الاثنين' }]) + timeField() + noteField() + errHtml(st); },
    check() { const v = numv('ml'); return v && v > 0 ? '' : 'أدخلوا الكمية بالمللي.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { ml: Math.round(numv('ml')), side: st.side }, n: st.n || '' }; },
  },
  diaper: {
    init(ev) {
      if (ev) { const d = ev.d || {}; return { ...t0('s', ev.s), kind: d.wet && d.dirty ? 'both' : d.dirty ? 'dirty' : d.wet ? 'wet' : 'dry', color: d.color || '', n: ev.n || '' }; }
      return { ...t0('s', defaultTime()), kind: 'wet', color: '', n: '' };
    },
    body(st, ev) {
      const dirty = st.kind === 'dirty' || st.kind === 'both';
      const col = STOOL.find((c) => c.id === st.color);
      let h = '';
      if (!ev) h += '<p class="sm mute">اضغطوا النوع فيُحفظ فورًا.</p>';
      h += '<div class="g3">' + [['wet', 'مبلل', 'drop'], ['dirty', 'متسخ', 'i-diaper'], ['both', 'الاثنين', 'i-diaper']].map(([k, l, i]) =>
        '<button class="qb diaper lg" data-act="' + (ev ? 'set' : 'dia') + '" data-k="kind" data-v="' + k + '" aria-pressed="' + (st.kind === k) + '" style="' + (st.kind === k && ev ? 'background:var(--diaper-t)' : '') + '"><i>' + ic(i) + '</i>' + l + '</button>').join('') + '</div>';
      if (ev || st._showC || st.color) {
        h += fChips('color', 'لون البراز', STOOL.map((c) => ({ id: c.id, label: c.label, sw: c.sw })));
        if (col && col.warn) h += '<p class="hint warn">' + esc(col.warn) + '</p>';
      } else h += '<button class="link" data-act="show" data-k="_showC">لون البراز؟</button>';
      h += timeField() + noteField();
      if (ev) h += fChips('kind', 'النوع', [{ id: 'wet', label: 'مبلل' }, { id: 'dirty', label: 'متسخ' }, { id: 'both', label: 'الاثنين' }, { id: 'dry', label: 'جاف' }]);
      return h;
    },
    foot(st, ev) { return ev ? stdFoot(ev) : ''; },
    save(st) { const k = st.kind; return { s: tval(st, 's') || Date.now(), e: null, d: { wet: k === 'wet' || k === 'both', dirty: k === 'dirty' || k === 'both', color: (k === 'dirty' || k === 'both') ? st.color || '' : '' }, n: st.n || '' }; },
  },
  sleep: {
    init(ev) {
      if (ev) return { ...t0('s', ev.s), ...t0('e', ev.e || ev.s), loc: (ev.d && ev.d.loc) || '', how: (ev.d && ev.d.how) || '', n: ev.n || '' };
      const T = S.timers.sleep;
      if (T) return { ...t0('s', T.s), loc: T.loc || '', how: T.how || '', n: '' };
      const t = defaultTime();
      return { ...t0('s', t - HOUR), ...t0('e', t), loc: '', how: '', n: '', mode: UI.tab === 'hist' && UI.day !== today() ? 'manual' : 'timer' };
    },
    body(st, ev) {
      const T = S.timers.sleep;
      const loc = SLEEP_LOC.find((l) => l.id === st.loc);
      const where = fChips('loc', 'أين ينام؟ (اختياري)', SLEEP_LOC) + (loc && loc.hint ? '<p class="hint">' + esc(loc.hint) + '</p>' : '') +
        (ev || st.how || st._showH ? fChips('how', 'كيف نام؟', SLEEP_HOW) : '<button class="link" data-act="show" data-k="_showH">كيف نام؟</button>');
      if (!ev && T) return '<div class="timer sleep" style="box-shadow:none"><div class="lbl">نائم منذ ' + fTime(T.s) + '</div><div class="clock" data-clock="' + T.s + '">' + clock(Date.now() - T.s) + '</div></div>' +
        timeField('s', 'نام') + where;
      if (!ev && st.mode === 'timer') return where + '<button class="link" data-act="set" data-k="mode" data-v="manual">أو سجّلوا نومة سابقة</button>';
      return (ev ? '' : '<button class="link" data-act="set" data-k="mode" data-v="timer">العودة إلى العدّاد</button>') +
        '<div class="g2">' + fIn('s', 'نام', 'datetime-local') + fIn('e', 'صحا', 'datetime-local') + '</div>' + where + noteField() + errHtml(st);
    },
    foot(st, ev) {
      if (!ev && S.timers.sleep) return '<button class="btn ghost" data-act="sl-cancel">إلغاء</button><button class="btn pri" data-act="sl-stop">' + ic('sun') + 'صحا الآن</button>';
      if (!ev && st.mode === 'timer') return '<button class="btn pri" data-act="sl-start">' + ic('moon') + 'ابدأ عدّاد النوم</button>';
      return stdFoot(ev);
    },
    onset(k) { const T = S.timers.sleep; if (T && (k === 'loc' || k === 'how')) { T[k] = UI.sheet.st[k]; save(); } },
    check(st) { const s = tval(st, 's'), e = tval(st, 'e'); if (!s || !e) return 'اختاروا وقت النوم والاستيقاظ.'; if (e <= s) return 'وقت الاستيقاظ يجب أن يكون بعد وقت النوم.'; if (e - s > 16 * HOUR) return 'النومة أطول من 16 ساعة. راجعوا التاريخ.'; return ''; },
    save(st) { return { s: tval(st, 's'), e: tval(st, 'e'), d: { loc: st.loc || '', how: st.how || '' }, n: st.n || '' }; },
  },
  tummy: {
    init(ev) {
      if (ev) return { ...t0('s', ev.s), m: String(Math.max(1, Math.round(((ev.e || ev.s) - ev.s) / MIN))), pos: (ev.d && ev.d.pos) || '', n: ev.n || '' };
      return { ...t0('s', defaultTime()), m: '3', pos: 'chest', n: '', mode: UI.tab === 'hist' && UI.day !== today() ? 'manual' : 'timer' };
    },
    body(st, ev) {
      const pos = fChips('pos', 'الوضعية', TUMMY_POS);
      if (!ev && S.timers.tummy) { const T = S.timers.tummy; return '<div class="timer play" style="box-shadow:none"><div class="clock" data-clock="' + T.s + '">' + clock(Date.now() - T.s) + '</div></div>'; }
      if (!ev && st.mode === 'timer') return pos + '<p class="sm mute">جلسات قصيرة متكررة. إن بكى فقصّروها، وجلسات الصدر تُحسب.</p><button class="link" data-act="set" data-k="mode" data-v="manual">أو سجّلوا جلسة سابقة</button>';
      return (ev ? '' : '<button class="link" data-act="set" data-k="mode" data-v="timer">العودة إلى المؤقت</button>') + fStep('m', 'المدة', 1, 'دقيقة', 1) + pos + timeField() + noteField() + errHtml(st);
    },
    foot(st, ev) {
      if (!ev && S.timers.tummy) return '<button class="btn ghost" data-act="tm-cancel">إلغاء</button><button class="btn pri" data-act="tm-stop">' + ic('check') + 'انتهى</button>';
      if (!ev && st.mode === 'timer') return '<button class="btn pri" data-act="tm-start">' + ic('play') + 'ابدأ</button>';
      return stdFoot(ev);
    },
    check() { const m = numv('m'); return m && m > 0 ? '' : 'أدخلوا المدة بالدقائق.'; },
    save(st) { const s = tval(st, 's') || Date.now(); return { s, e: s + numv('m') * MIN, d: { pos: st.pos || '' }, n: st.n || '' }; },
  },
  bath: {
    init(ev) { return ev ? { ...t0('s', ev.s), n: ev.n || '' } : { ...t0('s', defaultTime()), n: '' }; },
    body() { return timeField() + noteField(); },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: {}, n: st.n || '' }; },
  },
  temp: {
    init(ev) { return ev ? { ...t0('s', ev.s), c: String((ev.d && ev.d.c) || ''), method: (ev.d && ev.d.method) || 'إبط', n: ev.n || '' } : { ...t0('s', defaultTime()), c: '37.0', method: 'إبط', n: '' }; },
    body(st) {
      UI.sheet.live = () => { const el = document.getElementById('temp-warn'); if (el) el.innerHTML = tempWarn(); };
      return fStep('c', 'الحرارة', 0.1, 'درجة مئوية', 30, 1) + '<div id="temp-warn" aria-live="polite">' + tempWarn() + '</div>' + fChips('method', 'طريقة القياس', [{ id: 'إبط', label: 'تحت الإبط' }, { id: 'شرج', label: 'شرجي' }, { id: 'أذن', label: 'الأذن' }, { id: 'جبهة', label: 'الجبهة' }]) + timeField() + noteField() + errHtml(st);
    },
    onset() {},
    check() { const c = numv('c'); return c && c > 30 && c < 44 ? '' : 'أدخلوا الحرارة بالدرجة المئوية.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { c: Math.round(numv('c') * 10) / 10, method: st.method }, n: st.n || '' }; },
  },
  med: {
    init(ev) { return ev ? { ...t0('s', ev.s), name: (ev.d && ev.d.name) || '', dose: (ev.d && ev.d.dose) || '', n: ev.n || '' } : { ...t0('s', defaultTime()), name: 'فيتامين د', dose: '', n: '' }; },
    body(st) {
      return '<div class="chips">' + MED_PRESETS.map((m) => '<button class="chip" data-act="set" data-k="name" data-v="' + esc(m) + '" aria-pressed="' + (st.name === m) + '">' + esc(m) + '</button>').join('') + '</div>' +
        fIn('name', 'الاسم') + fIn('dose', 'الجرعة', 'text', 'placeholder="كما وصفها الطبيب"') + timeField() + noteField() +
        '<p class="hint">لا دواء لرضيع إلا بوصف الطبيب وبالجرعة التي حددها لوزنه.</p>' + errHtml(st);
    },
    check(st) { return String(st.name || '').trim() ? '' : 'اكتبوا اسم الدواء.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { name: String(st.name).trim(), dose: String(st.dose || '').trim() }, n: st.n || '' }; },
  },
  symptom: {
    init(ev) { return ev ? { ...t0('s', ev.s), name: (ev.d && ev.d.name) || '', n: ev.n || '' } : { ...t0('s', defaultTime()), name: '', n: '' }; },
    body(st) {
      return fChips('name', 'العرض', SYMPTOMS.map((x) => ({ id: x, label: x }))) + timeField() + fArea('n', 'التفاصيل', 'متى بدأ؟ كم مرة؟ ماذا لاحظتم؟') +
        '<p class="hint">علامات تستدعي الطبيب فورًا: صعوبة في التنفس، أو زرقة، أو خمول شديد، أو رفض الرضاعة، أو قلة الحفاضات المبللة كثيرًا، أو حرارة 38 أو أكثر قبل 3 شهور.</p>' + errHtml(st);
    },
    check(st) { return st.name ? '' : 'اختاروا العرض.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { name: st.name }, n: st.n || '' }; },
  },
  note: {
    init(ev) { return ev ? { ...t0('s', ev.s), n: ev.n || '' } : { ...t0('s', defaultTime()), n: '' }; },
    body(st) { return fArea('n', 'الملاحظة', 'ما الذي تريدون تذكّره؟') + timeField() + errHtml(st); },
    check(st) { return String(st.n || '').trim() ? '' : 'اكتبوا الملاحظة.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: {}, n: String(st.n).trim() }; },
  },
  mood: {
    init(ev) { return ev ? { ...t0('s', ev.s), who: (ev.d && ev.d.who) || 'm', v: String((ev.d && ev.d.v) || 3), slept: ev.d && ev.d.slept ? String(ev.d.slept) : '', n: ev.n || '' } : { ...t0('s', defaultTime()), who: 'm', v: '3', slept: '', n: '' }; },
    body(st) {
      return fSeg('who', [{ id: 'm', label: 'الأم' }, { id: 'f', label: 'الأب' }]) +
        '<div class="f"><span class="lab">كيف الحال اليوم؟</span><div class="faces">' + MOODS.map(([i, l], k) => '<button data-act="set" data-k="v" data-v="' + (k + 1) + '" aria-pressed="' + (String(st.v) === String(k + 1)) + '">' + ic(i) + l + '</button>').join('') + '</div></div>' +
        fStep('slept', 'ساعات النوم في آخر 24 ساعة (اختياري)', 0.5, 'ساعة', 0, 1) + fArea('n', 'ملاحظة (اختياري)', 'ما الذي أتعبك؟ وما الذي ساعد؟') +
        '<p class="hint">حزن أو قلق يستمر أكثر من أسبوعين ليس ضعفًا، وله علاج. تحدّثوا مع الطبيب.</p>';
    },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { who: st.who, v: Number(st.v) || 3, slept: numv('slept') || 0 }, n: st.n || '' }; },
  },
  exp: {
    init(ev) { return ev ? { ...t0('s', ev.s), amt: String((ev.d && ev.d.amt) || ''), cat: (ev.d && ev.d.cat) || EXP_CATS[0], n: ev.n || '' } : { ...t0('s', defaultTime()), amt: '', cat: EXP_CATS[0], n: '' }; },
    body(st) { return fIn('amt', 'المبلغ (' + esc(S.settings.currency) + ')', 'text', 'inputmode="decimal" autofocus') + fChips('cat', 'البند', EXP_CATS.map((c) => ({ id: c, label: c }))) + timeField('s', 'التاريخ') + noteField() + errHtml(st); },
    check() { const v = numv('amt'); return v && v > 0 ? '' : 'أدخلوا المبلغ.'; },
    save(st) { return { s: tval(st, 's') || Date.now(), e: null, d: { amt: numv('amt'), cat: st.cat }, n: st.n || '' }; },
  },
};
function tempWarn() {
  const c = numv('c'), a = ageInfo(S.profile);
  if (c && c >= 38) return a && a.days < 91 ? '<p class="hint warn">حرارة 38 أو أكثر قبل عمر 3 شهور: اتصلوا بالطبيب فورًا.</p>' : '<p class="hint warn">حرارة 38 أو أكثر: راقبوا علامات الخطر واسألوا الطبيب، خصوصًا إن رفض الرضاعة أو بدا خاملًا.</p>';
  if (c && c < 36) return '<p class="hint warn">حرارة أقل من 36: دفّئوه وأعيدوا القياس، وإن بقيت منخفضة أو بدا خاملًا فاتصلوا بالطبيب.</p>';
  return '';
}
ACTS.dia = (el) => {
  const sh = UI.sheet; if (!sh) return;
  sh.st.kind = el.dataset.v;
  const out = LOG.diaper.save(sh.st);
  const ev = addEvent('diaper', out.s, null, out.d, out.n);
  closeSheet(); render(); toast('سُجّل حفاض: ' + evDetail(ev), () => delRec(ev));
};

/* ------------------------------------------------------------------ growth measurement */
function growthInit(rec) {
  return rec ? { date: rec.date, w: rec.w ? String(rec.w) : '', l: rec.l ? String(rec.l) : '', h: rec.h ? String(rec.h) : '', _rec: rec.id }
             : { date: today(), w: '', l: '', h: '' };
}
function growthPrev() {
  const st = UI.sheet.st, ageD = S.profile ? measureAgeDays(st.date || today()) : 0;
  const pv = ['w', 'l', 'h'].map((k) => { const v = numv(k); if (!v) return ''; const r = growthZ(k, v, ageD, S.profile.sex); return r ? '<p class="sm">' + GROWTH_IND[k].label + ': المئين ' + Math.round(r.p) + '</p>' : ''; }).join('');
  return pv ? '<div class="hint ok">' + pv + '</div>' : '';
}
SHEETS.growth = (sh) => {
  const st = sh.st;
  sh.live = () => { const el = document.getElementById('g-prev'); if (el) el.innerHTML = growthPrev(); };
  return {
    title: st._rec ? 'تعديل القياس' : 'وزن وطول', icon: 'ruler', bg: 'bg-health',
    body: fIn('date', 'تاريخ القياس', 'date') + '<div class="g3">' + fIn('w', 'الوزن (كجم)', 'text', 'inputmode="decimal" placeholder="4.85"') + fIn('l', 'الطول (سم)', 'text', 'inputmode="decimal" placeholder="56"') + fIn('h', 'محيط الرأس (سم)', 'text', 'inputmode="decimal" placeholder="38"') + '</div>' +
      '<div id="g-prev" aria-live="polite">' + growthPrev() + '</div><p class="hint">القياس الأدق في عيادة الطبيب. المئين يقارن طفلكم بمعايير منظمة الصحة العالمية، والأهم هو مسار النمو لا رقم واحد.</p>' + errHtml(st),
    foot: (st._rec ? '<button class="btn danger' + (st._del ? ' armed' : '') + '" data-act="del">' + ic('trash') + (st._del ? 'اضغطوا مرة أخرى للحذف' : 'حذف') + '</button>' : '') + '<button class="btn pri" data-act="save-growth">' + ic('check') + 'حفظ</button>',
  };
};
ACTS['save-growth'] = () => {
  const st = UI.sheet.st;
  const w = numv('w'), l = numv('l'), h = numv('h');
  if (!st.date) { st._err = 'اختاروا التاريخ.'; renderSheet(); return; }
  if (!w && !l && !h) { st._err = 'أدخلوا قياسًا واحدًا على الأقل.'; renderSheet(); return; }
  if ((w && (w < 1 || w > 25)) || (l && (l < 35 || l > 120)) || (h && (h < 25 || h > 60))) { st._err = 'راجعوا الأرقام: الوزن بالكيلوجرام والطول ومحيط الرأس بالسنتيمتر.'; renderSheet(); return; }
  const rec = st._rec ? S.growth.find((g) => g.id === st._rec) : null;
  const data = { date: st.date, w: w || null, l: l || null, h: h || null };
  if (rec) updRec(rec, data); else { S.growth.push(Object.assign({ id: uid(), u: Date.now() }, data)); save(); }
  closeSheet(); render(); toast('حُفظ القياس');
};
ACTS['edit-growth'] = (el) => { const rec = S.growth.find((g) => g.id === el.dataset.id); if (rec) openSheet({ kind: 'growth', st: growthInit(rec), rec }); };

/* ------------------------------------------------------------------ journal (firsts, notes, photos) */
function journalInit(rec) {
  return rec ? { date: rec.date, title: rec.title || '', text: rec.text || '', photo: rec.photo || '', _rec: rec.id } : { date: today(), title: '', text: '', photo: '' };
}
SHEETS.journal = (sh) => {
  const st = sh.st;
  return {
    title: st._rec ? 'تعديل الذكرى' : 'ذكرى أو صورة', icon: 'camera', bg: 'bg-faith',
    body: fIn('date', 'التاريخ', 'date') + '<div class="chips">' + ['أول ابتسامة', 'أول ضحكة', 'رفع رأسه', 'أول نزهة', 'أول تطعيم', 'تقلّب'].map((t) => '<button class="chip" data-act="set" data-k="title" data-v="' + t + '" aria-pressed="' + (st.title === t) + '">' + t + '</button>').join('') + '</div>' +
      fIn('title', 'العنوان') + fArea('text', 'التفاصيل', 'ماذا حدث؟ من كان حاضرًا؟') +
      '<div class="f"><span class="lab">صورة (اختياري)</span>' + (st.photo ? '<img class="photo-prev" src="' + st.photo + '" alt="">' : '') +
      '<div class="btns"><label class="btn filebtn">' + ic('camera') + (st.photo ? 'تغيير الصورة' : 'اختيار صورة') + '<input type="file" accept="image/*" data-file="photo" aria-label="اختيار صورة"></label></div></div>' +
      '<p class="hint">تُصغَّر الصورة وتُحفظ داخل الدفتر وفي ملف النسخة الاحتياطية. «كود النسخة» لا يحمل الصور.</p>' + errHtml(st),
    foot: (st._rec ? '<button class="btn danger' + (st._del ? ' armed' : '') + '" data-act="del">' + ic('trash') + (st._del ? 'اضغطوا مرة أخرى للحذف' : 'حذف') + '</button>' : '') + '<button class="btn pri" data-act="save-journal">' + ic('check') + 'حفظ</button>',
  };
};
FILES.photo = (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const m = 900, k = Math.min(1, m / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    UI.sheet.st.photo = c.toDataURL('image/jpeg', 0.72); URL.revokeObjectURL(url); renderSheet();
  };
  img.onerror = () => { UI.sheet.st._err = 'تعذّرت قراءة الصورة.'; renderSheet(); };
  img.src = url;
};
ACTS['save-journal'] = () => {
  const st = UI.sheet.st;
  if (!String(st.title || '').trim() && !String(st.text || '').trim() && !st.photo) { st._err = 'اكتبوا عنوانًا أو تفاصيل، أو أضيفوا صورة.'; renderSheet(); return; }
  const rec = st._rec ? S.journal.find((j) => j.id === st._rec) : null;
  const data = { date: st.date || today(), title: String(st.title || '').trim(), text: String(st.text || '').trim(), photo: st.photo || '' };
  if (rec) updRec(rec, data); else { S.journal.push(Object.assign({ id: uid(), u: Date.now() }, data)); save(); }
  closeSheet(); render(); toast('حُفظت الذكرى');
};
ACTS['edit-journal'] = (el) => { const rec = S.journal.find((j) => j.id === el.dataset.id); if (rec) openSheet({ kind: 'journal', st: journalInit(rec), rec }); };
