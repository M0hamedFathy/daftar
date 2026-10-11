/* ---------------------------------------------------------------------------
   Health: growth (WHO), vaccines (Egypt schedule + optional + custom),
   milestones (CDC), doctor (appointments, questions, report file).
--------------------------------------------------------------------------- */

const HTABS = [['growth', 'النمو'], ['vax', 'التطعيمات'], ['ms', 'التطور'], ['doc', 'الطبيب']];
VIEWS.health = function () {
  let h = '<section class="subtabs" aria-label="أقسام الصحة">' + HTABS.map(([id, l]) => '<button data-act="htab" data-v="' + id + '" aria-pressed="' + (UI.htab === id) + '">' + l + '</button>').join('') + '</section>';
  h += ({ growth: hGrowth, vax: hVax, ms: hMs, doc: hDoc }[UI.htab] || hGrowth)();
  return h;
};
ACTS.htab = (el) => { UI.htab = el.dataset.v; render(); };

/* ------------------------------------------------------------------ growth */
function growthRows() { return live(S.growth).slice().sort((a, b) => keyMs(b.date) - keyMs(a.date)); }
function hGrowth() {
  const rows = growthRows(), sex = S.profile.sex;
  const ind = UI.gind;
  const pts = rows.filter((r) => r[ind]).map((r) => { const d = measureAgeDays(r.date), z = growthZ(ind, r[ind], d, sex); return { d: Math.max(0, d), v: r[ind], tip: '<b>' + fDateS(keyMs(r.date)) + '</b><br>' + num(r[ind], GROWTH_IND[ind].d) + ' ' + GROWTH_IND[ind].unit + (z ? '، المئين ' + Math.round(z.p) : '') }; });
  const a = ageInfo(S.profile);
  const maxD = Math.min(730, Math.max(183, Math.ceil(((a ? Math.max(0, a.cdays) : 0) + 75) / 30.4375) * 30.4375));
  let h = '<section class="card"><div class="h2" style="margin-bottom:8px">المنحنى<button class="more" data-act="log" data-type="growth">إضافة قياس</button></div>' +
    '<div class="seg" style="margin-bottom:8px">' + Object.keys(GROWTH_IND).map((k) => '<button data-act="gind" data-v="' + k + '" aria-pressed="' + (ind === k) + '">' + GROWTH_IND[k].label + '</button>').join('') + '</div>' +
    (WHO ? chartGrowth(ind, sex, pts, maxD) : '<p class="sm">جداول منظمة الصحة العالمية غير متاحة في هذه النسخة.</p>') +
    '<div class="legend" style="margin-top:6px"><span><i style="background:var(--accent);border-radius:50%"></i>قياساته</span><span><i style="background:var(--mute);height:2px"></i>المئين 50</span><span><i style="background:transparent;border-top:1px dashed var(--mute);height:0"></i>المئينات 3 و15 و85 و97</span></div>' +
    '<p class="xs mute" style="margin-top:6px">العمر بالشهور على المحور الأفقي، من اليمين إلى اليسار. معايير منظمة الصحة العالمية لنمو الطفل (' + (sex === 'f' ? 'البنات' : 'الأولاد') + ')' + (S.profile.due ? '، بالعمر المصحَّح' : '') + '. المهم أن يسير على مسار ثابت تقريبًا؛ القفز بين المسارات أو الهبوط يُناقش مع الطبيب.</p></section>';
  if (!rows.length) h += '<section class="card soft"><p class="sm">لا قياسات بعد. أضيفوا وزن الولادة وقياسات زيارات الطبيب لتظهر على المنحنى.</p></section>';
  else h += '<section class="card flat"><div class="list">' + rows.map((r) => {
    const d = measureAgeDays(r.date);
    const parts = ['w', 'l', 'h'].filter((k) => r[k]).map((k) => { const z = growthZ(k, r[k], d, sex); return GROWTH_IND[k].label + ' ' + num(r[k], GROWTH_IND[k].d) + ' ' + GROWTH_IND[k].unit + (z ? ' (م' + Math.round(z.p) + ')' : ''); });
    return '<button class="item" data-act="edit-growth" data-id="' + r.id + '"><i class="dot bg-health">' + ic('ruler') + '</i><span class="grow"><span class="t">' + fDateY(keyMs(r.date)) + '</span><span class="s">' + esc(parts.join('، ')) + '</span></span><span class="when">' + esc(ageAt(d)) + '</span></button>';
  }).join('') + '</div><p class="xs mute" style="margin-top:4px">«م» تعني المئين: م50 أي في منتصف الأطفال الأصحاء في عمره.</p></section>';
  return h;
}
function ageAt(d) { if (d < 0) return ''; if (d < 98) return pl(Math.floor(d / 7), U.week); return pl(Math.floor(d / 30.4375), U.month); }
ACTS.gind = (el) => { UI.gind = el.dataset.v; render(); };

/* ------------------------------------------------------------------ vaccines */
function vaxList() {
  if (!S.profile) return [];
  const b = keyMs(S.profile.birth), t = sod(Date.now());
  const out = [];
  for (const v of VAX_EG) {
    const due = addMonths(b, v.m), rec = S.vax[v.id] || {};
    let state = 'later';
    if (rec.date) state = 'done'; else if (rec.skip) state = 'skip';
    else if (due < t - 14 * DAY) state = due < t - 45 * DAY ? 'check' : 'late'; else if (due <= t + 14 * DAY) state = due <= t ? 'due' : 'soon';
    out.push({ id: v.id, m: v.m, name: v.name, dose: v.dose, due, state, date: rec.date, custom: false });
  }
  for (const c of live(S.vaxCustom)) {
    const due = c.due ? keyMs(c.due) : null;
    let state = c.date ? 'done' : due && due < t - 14 * DAY ? 'late' : due && due <= t + 14 * DAY ? (due <= t ? 'due' : 'soon') : 'later';
    out.push({ id: c.id, m: due ? Math.max(0, Math.round((due - b) / (30.4375 * DAY))) : 99, name: c.name, dose: c.dose || 'إضافي', due, state, date: c.date, custom: true });
  }
  return out.sort((x, y) => (x.due || 9e15) - (y.due || 9e15));
}
function inDays(ms) {
  const d = Math.round((sod(ms) - sod(Date.now())) / DAY);
  if (d === 0) return '(اليوم)'; if (d === 1) return '(غدًا)'; if (d > 1) return '(بعد ' + pl(d, U.day) + ')'; return '';
}
function hVax() {
  const L = vaxList();
  const groups = {};
  for (const v of L) { const g = v.m === 99 ? 'بلا موعد محدد' : v.m === 0 ? 'عند الولادة' : 'عند ' + pl(v.m, U.month); (groups[g] = groups[g] || []).push(v); }
  const icon = { done: 'check', due: 'syringe', soon: 'clock', late: 'warning', later: 'circle', skip: 'minus', check: 'question' };
  let h = '<section class="card soft"><p class="sm">جدول وزارة الصحة المصرية كما نُشر في 2026، محسوبًا من تاريخ الولادة. المواعيد قد تتغير، فاعتمدوا كارت التطعيم ومكتب الصحة. اضغطوا على التطعيم لتسجيله.</p></section>';
  h += '<section class="card flat">';
  for (const g of Object.keys(groups)) {
    h += '<div class="vgroup"><h3>' + esc(g) + '</h3>' + groups[g].map((v) => {
      const ds = v.state === 'done' ? 'أُعطي ' + fDateS(keyMs(v.date)) : v.state === 'skip' ? 'لن يُعطى أو أُعطي في مكان آخر'
        : v.state === 'check' ? 'موعده كان ' + fDateS(v.due) + '. إن كان أُعطي فسجّلوه من كارت التطعيم'
        : v.due ? (v.state === 'late' ? 'موعده كان ' + fDateS(v.due) + '، راجعوا الطبيب أو مكتب الصحة' : 'موعده ' + fDateS(v.due) + ' ' + inDays(v.due)) : '';
      return '<button class="vx item" data-act="vax" data-id="' + v.id + '" data-c="' + (v.custom ? 1 : 0) + '"><span class="st ' + v.state + '">' + ic(icon[v.state]) + '</span><span class="grow"><span class="nm">' + esc(v.name) + '</span><br><span class="ds">' + esc(v.dose) + '، ' + esc(ds) + '</span></span></button>';
    }).join('') + '</div>';
  }
  h += '</section><section class="card"><h3>تطعيمات اختيارية</h3>' + VAX_OPTIONAL.map((o) => '<p class="sm"><b>' + esc(o.name) + ':</b> ' + esc(o.hint) + '</p>').join('') +
    '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="vax-add">' + ic('plus') + 'إضافة تطعيم</button></div></section>';
  return h;
}
ACTS.vax = (el) => {
  const id = el.dataset.id, custom = el.dataset.c === '1';
  const v = vaxList().find((x) => x.id === id); if (!v) return;
  openSheet({ kind: 'vax', st: { id, custom, date: v.date || today(), name: v.name, dose: v.dose, due: v.due ? dayKey(v.due) : '' } });
};
ACTS['vax-add'] = () => openSheet({ kind: 'vax', st: { id: '', custom: true, date: '', name: '', dose: '', due: today() } });
SHEETS.vax = (sh) => {
  const st = sh.st, isNew = st.custom && !st.id;
  let body = '';
  if (st.custom) body += fIn('name', 'اسم التطعيم') + fIn('dose', 'الجرعة', 'text', 'placeholder="الأولى، الثانية…"') + fIn('due', 'الموعد', 'date');
  else body += '<p class="sm"><b>' + esc(st.name) + '</b>، ' + esc(st.dose) + '</p>';
  body += fIn('date', 'تاريخ إعطائه (اتركوه فارغًا إن لم يُعطَ بعد)', 'date') + errHtml(st);
  const rec = !st.custom ? S.vax[st.id] : null;
  return {
    title: isNew ? 'إضافة تطعيم' : 'تسجيل تطعيم', icon: 'syringe', bg: 'bg-health', body,
    foot: (!st.custom && rec && (rec.date || rec.skip) ? '<button class="btn" data-act="vax-clear">إلغاء التسجيل</button>' : '') +
          (!st.custom && !(rec && rec.skip) ? '<button class="btn" data-act="vax-skip">لن يُعطى</button>' : '') +
          (st.custom && !isNew ? '<button class="btn danger" data-act="vax-del">' + ic('trash') + 'حذف</button>' : '') +
          '<button class="btn pri" data-act="vax-save">' + ic('check') + 'حفظ</button>',
  };
};
ACTS['vax-save'] = () => {
  const st = UI.sheet.st;
  if (st.custom) {
    if (!String(st.name || '').trim()) { st._err = 'اكتبوا اسم التطعيم.'; renderSheet(); return; }
    const rec = st.id ? S.vaxCustom.find((c) => c.id === st.id) : null;
    const data = { name: String(st.name).trim(), dose: String(st.dose || '').trim(), due: st.due || '', date: st.date || '' };
    if (rec) updRec(rec, data); else { S.vaxCustom.push(Object.assign({ id: uid(), u: Date.now() }, data)); save(); }
  } else {
    S.vax[st.id] = { date: st.date || '', skip: false, u: Date.now() }; save();
  }
  closeSheet(); render(); toast('حُفظ التطعيم');
};
ACTS['vax-skip'] = () => { const st = UI.sheet.st; S.vax[st.id] = { date: '', skip: true, u: Date.now() }; save(); closeSheet(); render(); };
ACTS['vax-clear'] = () => { const st = UI.sheet.st; S.vax[st.id] = { date: '', skip: false, u: Date.now() }; save(); closeSheet(); render(); };
ACTS['vax-del'] = () => { const st = UI.sheet.st; const rec = S.vaxCustom.find((c) => c.id === st.id); if (rec) delRec(rec); closeSheet(); render(); };

/* ------------------------------------------------------------------ milestones */
function hMs() {
  const a = ageInfo(S.profile), m = a ? a.cmonths : 0;
  const cur = MILESTONES.find((x) => x.m >= m - 0.25) || MILESTONES[MILESTONES.length - 1];
  const idx = MILESTONES.indexOf(cur);
  const show = MILESTONES.slice(Math.max(0, idx - 1), idx + 2);
  let h = '<section class="card soft"><p class="sm">علامات «تعلّم العلامات، تصرّف مبكرًا» من مراكز مكافحة الأمراض الأمريكية: ما يفعله ثلاثة أطفال من كل أربعة أو أكثر عند ذلك العمر. ليست امتحانًا. سجّلوا ما ترونه، وإن قلقتم من شيء أو فقد مهارة كان يفعلها فلا تنتظروا: كلّموا الطبيب.</p></section>';
  for (const g of show) {
    const done = g.items.filter((_, i) => S.ms[g.m + ':' + i] && S.ms[g.m + ':' + i].date).length;
    h += '<section class="card"><div class="h2" style="margin-bottom:4px">عند ' + pl(g.m, U.month) + (g === cur ? ' <span class="chip" style="min-height:26px;padding:2px 9px;font-size:11.5px">المحطة القادمة</span>' : '') + '<span class="more" style="text-decoration:none;color:var(--mute)">' + done + '/' + g.items.length + '</span></div>';
    let lastDom = '';
    g.items.forEach(([dom, txt], i) => {
      const key = g.m + ':' + i, rec = S.ms[key];
      if (dom !== lastDom) { h += '<p class="xs mute" style="margin-top:6px">' + DOMAINS[dom] + '</p>'; lastDom = dom; }
      h += '<label class="check"><input type="checkbox" data-chg="ms" data-key="' + key + '"' + (rec && rec.date ? ' checked' : '') + '><span class="grow sm">' + esc(txt) + (rec && rec.date ? ' <span class="xs mute">(' + fDateS(keyMs(rec.date)) + ')</span>' : '') + '</span></label>';
    });
    h += '</section>';
  }
  h += '<section class="card"><p class="sm">باقي المحطات حتى عمر سنتين تظهر هنا تلقائيًا مع نموه.</p></section>';
  return h;
}
CHG.ms = (el) => { S.ms[el.dataset.key] = { date: el.checked ? today() : '', u: Date.now() }; save(); render(); };

/* ------------------------------------------------------------------ doctor */
function hDoc() {
  const ap = live(S.appts).slice().sort((x, y) => y.s - x.s);
  const qs = live(S.qs).slice().sort((x, y) => (x.done - y.done) || (y.u - x.u));
  let h = '<section class="card health"><h3>' + ic('file-arrow-down') + ' تقرير للطبيب</h3><p class="sm">ملف واحد فيه آخر 7 أيام (الرضاعة والنوم والحفاضات)، والقياسات بالمئين، والتطعيمات، والأدوية والأعراض والحرارة، وأسئلتكم.</p>' +
    '<div class="btns" style="margin-top:8px"><button class="btn sm pri" data-act="report">' + ic('download-simple') + 'حفظ التقرير</button></div></section>';
  h += '<section class="card"><div class="h2" style="margin-bottom:4px">أسئلة للزيارة القادمة<button class="more" data-act="q-add">إضافة</button></div>';
  if (!qs.length) h += '<p class="sm mute">اكتبوا السؤال لحظة يخطر لكم، حتى لا يضيع في الزيارة.</p>';
  h += qs.map((q) => '<label class="check"><input type="checkbox" data-chg="q" data-id="' + q.id + '"' + (q.done ? ' checked' : '') + '><span class="grow sm"' + (q.done ? ' style="text-decoration:line-through;color:var(--mute)"' : '') + '>' + esc(q.text) + '</span><button class="ibtn" style="width:34px;height:34px" data-act="q-del" data-id="' + q.id + '" aria-label="حذف السؤال">' + ic('trash') + '</button></label>').join('') + '</section>';
  h += '<section class="card"><div class="h2" style="margin-bottom:4px">المواعيد<button class="more" data-act="ap-add">إضافة</button></div>';
  if (!ap.length) h += '<p class="sm mute">لا مواعيد مسجّلة.</p>';
  h += '<div class="list">' + ap.map((x) => '<button class="item" data-act="ap-edit" data-id="' + x.id + '"><i class="dot bg-health">' + ic('stethoscope') + '</i><span class="grow"><span class="t">' + esc(x.what || 'موعد') + '</span><span class="s">' + esc(x.who || '') + '</span></span><span class="when">' + fDateS(x.s) + '<br>' + fTime(x.s) + '</span></button>').join('') + '</div></section>';
  return h;
}
CHG.q = (el) => { const q = S.qs.find((x) => x.id === el.dataset.id); if (q) { updRec(q, { done: el.checked ? 1 : 0 }); render(); } };
ACTS['q-add'] = () => openSheet({ kind: 'q', st: { text: '' } });
ACTS['q-del'] = (el) => { const q = S.qs.find((x) => x.id === el.dataset.id); if (q) { delRec(q); render(); } };
SHEETS.q = (sh) => ({ title: 'سؤال للطبيب', icon: 'chat-circle-text', bg: 'bg-health', body: fArea('text', 'السؤال', 'مثال: هل الزيادة في الوزن مناسبة؟') + errHtml(sh.st), foot: '<button class="btn pri" data-act="q-save">' + ic('check') + 'حفظ</button>' });
ACTS['q-save'] = () => { const t = String(UI.sheet.st.text || '').trim(); if (!t) { UI.sheet.st._err = 'اكتبوا السؤال.'; renderSheet(); return; } S.qs.push({ id: uid(), text: t, done: 0, u: Date.now() }); save(); closeSheet(); render(); };
ACTS['ap-add'] = () => openSheet({ kind: 'ap', st: { s: toLocalInput(addDays(Date.now(), 7)), what: 'متابعة دورية', who: '' } });
ACTS['ap-edit'] = (el) => { const x = S.appts.find((a) => a.id === el.dataset.id); if (x) openSheet({ kind: 'ap', st: { s: toLocalInput(x.s), what: x.what, who: x.who, _id: x.id } }); };
SHEETS.ap = (sh) => ({
  title: sh.st._id ? 'تعديل الموعد' : 'موعد جديد', icon: 'calendar-check', bg: 'bg-health',
  body: fIn('what', 'الموعد', 'text', 'placeholder="متابعة، تطعيم، تحليل…"') + fIn('who', 'الطبيب أو المكان') + fIn('s', 'الوقت', 'datetime-local') + errHtml(sh.st),
  foot: (sh.st._id ? '<button class="btn danger" data-act="ap-del">' + ic('trash') + 'حذف</button>' : '') + '<button class="btn pri" data-act="ap-save">' + ic('check') + 'حفظ</button>',
});
ACTS['ap-save'] = () => {
  const st = UI.sheet.st, s = fromLocalInput(st.s);
  if (!s) { st._err = 'اختاروا وقت الموعد.'; renderSheet(); return; }
  const data = { s, what: String(st.what || '').trim(), who: String(st.who || '').trim() };
  const x = st._id ? S.appts.find((a) => a.id === st._id) : null;
  if (x) updRec(x, data); else { S.appts.push(Object.assign({ id: uid(), u: Date.now(), done: 0 }, data)); save(); }
  closeSheet(); render(); toast('حُفظ الموعد');
};
ACTS['ap-del'] = () => { const x = S.appts.find((a) => a.id === UI.sheet.st._id); if (x) delRec(x); closeSheet(); render(); };

/* the doctor's report: a self-contained HTML file */
function reportHtml() {
  const P = S.profile, a = ageInfo(P);
  const days = []; for (let i = 6; i >= 0; i--) days.push(dayKey(addDays(sod(Date.now()), -i)));
  const rows = days.map((k) => { const s = dayStats(k); return '<tr><td>' + fDate(keyMs(k)) + '</td><td>' + s.feeds + '</td><td>' + s.bottles + (s.ml ? ' (' + s.ml + ' مل)' : '') + '</td><td>' + mins(s.breastMs) + '</td><td>' + hm(s.sleepMs) + '</td><td>' + hm(s.longest) + '</td><td>' + s.wet + '</td><td>' + s.dirty + '</td></tr>'; }).join('');
  const gr = growthRows().map((r) => { const d = measureAgeDays(r.date); return '<tr><td>' + fDateY(keyMs(r.date)) + '</td>' + ['w', 'l', 'h'].map((k) => { const z = r[k] ? growthZ(k, r[k], d, P.sex) : null; return '<td>' + (r[k] ? num(r[k], GROWTH_IND[k].d) + (z ? ' (المئين ' + Math.round(z.p) + ')' : '') : '–') + '</td>'; }).join('') + '</tr>'; }).join('');
  const since = Date.now() - 14 * DAY;
  const health = eventsIn(since, Date.now() + 1, ['med', 'symptom', 'temp']).map((e) => '<li>' + fDateS(e.s) + ' ' + fTime(e.s) + ': ' + TYPES[e.t].label + '، ' + esc(evDetail(e)) + (e.n ? '، ' + esc(e.n) : '') + '</li>').join('');
  const vx = vaxList().filter((v) => v.state === 'done' || v.state === 'due' || v.state === 'late' || v.state === 'soon').map((v) => '<li>' + esc(v.name) + ' (' + esc(v.dose) + '): ' + (v.state === 'done' ? 'أُعطي ' + fDateS(keyMs(v.date)) : 'موعده ' + fDateS(v.due)) + '</li>').join('');
  const qs = live(S.qs).filter((q) => !q.done).map((q) => '<li>' + esc(q.text) + '</li>').join('');
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تقرير ' + esc(P.name || '') + '</title>' +
    '<style>body{font:14px/1.6 "IBM Plex Sans Arabic",Tahoma,sans-serif;margin:24px;color:#111;max-width:860px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 6px;border-bottom:2px solid #111;padding-bottom:4px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:5px 7px;text-align:right}th{background:#f1f1f1}.m{color:#555;font-size:12.5px}</style></head><body>' +
    '<h1>تقرير متابعة: ' + esc(P.name || 'الطفل') + '</h1><p class="m">' + (P.sex === 'f' ? 'بنت' : 'ولد') + '، تاريخ الولادة ' + fDateY(keyMs(P.birth)) + '، ' + esc(ageText(a)) + (P.due ? '، الموعد المتوقع ' + fDateY(keyMs(P.due)) : '') + '. أُعدّ في ' + fDateY(Date.now()) + ' من «دفتر الرضيع»، والأرقام كما سجّلها الوالدان.</p>' +
    '<h2>آخر 7 أيام</h2><table><thead><tr><th>اليوم</th><th>رضعات</th><th>منها ببرونة</th><th>دقائق الثدي</th><th>نوم</th><th>أطول نومة</th><th>مبلل</th><th>متسخ</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<h2>القياسات (معايير منظمة الصحة العالمية)</h2>' + (gr ? '<table><thead><tr><th>التاريخ</th><th>الوزن (كجم)</th><th>الطول (سم)</th><th>محيط الرأس (سم)</th></tr></thead><tbody>' + gr + '</tbody></table>' : '<p>لا قياسات.</p>') +
    '<h2>التطعيمات</h2>' + (vx ? '<ul>' + vx + '</ul>' : '<p>لا شيء مسجّل.</p>') +
    '<h2>أدوية وأعراض وحرارة (آخر 14 يومًا)</h2>' + (health ? '<ul>' + health + '</ul>' : '<p>لا شيء مسجّل.</p>') +
    '<h2>أسئلة الوالدين</h2>' + (qs ? '<ul>' + qs + '</ul>' : '<p>لا أسئلة.</p>') + '</body></html>';
}
ACTS.report = async () => {
  const r = await saveFile('تقرير-' + (S.profile.name || 'الطفل') + '-' + stamp() + '.html', reportHtml(), 'text/html');
  if (r === 'saved') toast('حُفظ التقرير');
};
