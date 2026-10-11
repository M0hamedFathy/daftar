/* ---------------------------------------------------------------------------
   Today: timers, "since last", quick log, last 24 hours, totals, routine,
   this week's plan, what's coming, tip. Plus the night screen.
--------------------------------------------------------------------------- */

function ranges(a) {
  const formula = S.profile.feed === 'formula';
  const m = a ? a.cmonths : 0;
  return {
    feeds: formula ? [6, 8] : [8, 12],
    feedsTxt: formula ? 'نحو 6 إلى 8 في هذا العمر' : '8 إلى 12 طبيعي، وأكثر في أيام الطفرة',
    wet: 6,
    sleep: m < 4 ? [14, 17] : m < 12 ? [12, 16] : [11, 14],
  };
}
function planNow(a) {
  const w = a ? a.cweek : 6;
  if (PLAN_WEEKS[w]) return Object.assign({ title: 'الأسبوع ' + w + ' من عمره', week: w }, PLAN_WEEKS[w]);
  const m = a ? a.cmonths : 0;
  const b = PLAN_MONTHS.find((p) => m >= p.from && m < p.to) || PLAN_MONTHS[PLAN_MONTHS.length - 1];
  return Object.assign({ tummy: b.goal[0] ? b.goal[0] + ' إلى ' + b.goal[1] + ' دقيقة' : '' }, b);
}
function dayStats(key) {
  const a = keyMs(key), b = addDays(a, 1), t = Math.min(b, Date.now());
  const feeds = eventsIn(a, b, ['breast', 'bottle']).filter((e) => e.s >= a);
  const dia = eventsIn(a, b, ['diaper']).filter((e) => e.s >= a);
  let sleepMs = 0, nightMs = 0, longest = 0;
  for (const e of eventsIn(a, b, ['sleep'])) {
    const ov = overlap(e.s, e.e || t, a, b); sleepMs += ov; longest = Math.max(longest, (e.e || t) - e.s);
    nightMs += overlap(e.s, e.e || t, a, a + 7 * HOUR) + overlap(e.s, e.e || t, a + 19 * HOUR, b);
  }
  const tm = S.timers.sleep;
  if (tm && tm.s && key === today()) { const ov = overlap(tm.s, Date.now(), a, b); sleepMs += ov; nightMs += overlap(tm.s, Date.now(), a, a + 7 * HOUR) + overlap(tm.s, Date.now(), a + 19 * HOUR, b); }
  const tummy = eventsIn(a, b, ['tummy']).filter((e) => e.s >= a);
  const bottles = feeds.filter((e) => e.t === 'bottle');
  return {
    feeds: feeds.length, breast: feeds.length - bottles.length, bottles: bottles.length,
    breastMs: sum(feeds.filter((e) => e.t === 'breast').map(breastMs)),
    ml: sum(bottles.map((e) => Number((e.d && e.d.ml) || 0))),
    wet: dia.filter((e) => e.d && e.d.wet).length, dirty: dia.filter((e) => e.d && e.d.dirty).length, diapers: dia.length,
    sleepMs, nightMs, dayMs: sleepMs - nightMs, longest,
    tummyMs: sum(tummy.map((e) => (e.e || e.s) - e.s)), tummyN: tummy.length,
    pumpMl: sum(eventsIn(a, b, ['pump']).filter((e) => e.s >= a).map((e) => Number((e.d && e.d.ml) || 0))),
  };
}

VIEWS.home = function () {
  const a = ageInfo(S.profile), k = today(), st = dayStats(k), R = ranges(a);
  let h = '';
  if (DEMO) h += '<div class="card demo">' + ic('sparkle') + '<p><b>بيانات تجريبية</b> لتروا كيف يعمل الدفتر. لا يُحفظ منها شيء.</p><button class="btn sm" data-act="demo-end">ابدأ بطفلي</button></div>';
  h += safetyNetHtml();
  h += timersHtml();
  h += sinceHtml();
  h += bigButtons();
  h += '<section class="card"><div class="h2" style="margin-bottom:8px">اليوم حتى الآن<button class="more" data-act="tab" data-v="stats">التفاصيل</button></div>' +
    '<div class="nums">' +
    '<div><b>' + st.feeds + '</b><span>رضعات</span></div>' +
    '<div><b>' + st.wet + '</b><span>مبلل</span></div>' +
    '<div><b>' + st.dirty + '</b><span>متسخ</span></div>' +
    '<div><b>' + hm(st.sleepMs) + '</b><span>نوم</span></div></div>' +
    '<p class="xs mute" style="margin:6px 0 8px">المعتاد في عمره: ' + R.feeds[0] + ' إلى ' + R.feeds[1] + ' رضعة، و6 حفاضات مبللة أو أكثر في اليوم.</p>' +
    chart24(Date.now()) +
    '<div class="legend" style="margin-top:6px"><span><i style="background:var(--c-sleep)"></i>نوم</span><span><i style="background:var(--c-feed);border-radius:50%"></i>رضاعة</span><span><i style="background:var(--c-bottle);border-radius:50%"></i>ببرونة</span><span><i style="background:var(--c-wet)"></i>حفاض</span></div></section>';
  h += dayPlanHtml(a, k);
  h += upcomingHtml(a, true);
  return h;
};

/* the six things logged every day; sleep and tummy time start and stop with one tap */
function bigButtons() {
  const sl = S.timers.sleep, tm = S.timers.tummy, B = S.timers.breast;
  const btn = (act, type, cls, icon, label, on) => '<button class="qb lg ' + cls + (on ? ' on' : '') + '" data-act="' + act + '" data-type="' + type + '"><i>' + ic(icon) + '</i>' + label + '</button>';
  return '<section class="quick six">' +
    btn('log', 'breast', 'feed', 'i-breast', B ? 'الرضعة الجارية' : 'رضاعة', !!B) +
    btn('log', 'bottle', 'feed', 'i-bottle', 'ببرونة') +
    btn('log', 'diaper', 'diaper', 'i-diaper', 'حفاض') +
    (sl ? btn('sl-stop', 'sleep', 'sleep', 'sun', 'صحا', true) : btn('sl-quick', 'sleep', 'sleep', 'moon-stars', 'نام')) +
    (tm ? btn('tm-stop', 'tummy', 'play', 'check', 'إنهاء البطن', true) : btn('tm-quick', 'tummy', 'play', 'i-tummy', 'وقت البطن')) +
    btn('log', '', 'note', 'dots-three-outline', 'غير ذلك') + '</section>';
}
ACTS['sl-quick'] = () => {
  S.timers.sleep = { s: Date.now(), loc: '', how: '' }; save(); render();
  toast('بدأ عدّاد النوم. اضغطوا «صحا» حين يستيقظ.', () => { delete S.timers.sleep; save(); });
};
ACTS['tm-quick'] = () => {
  S.timers.tummy = { s: Date.now(), pos: '' }; save(); render();
  toast('بدأ وقت البطن.', () => { delete S.timers.tummy; save(); });
};

/* one card for the day's plan; "يوم صعب" swaps it for the guide's minimum */
function dayPlanHtml(a, k) {
  const hard = !!(S.settings.hard || {})[k];
  const p = planNow(a);
  let h = '<section class="card play"><div class="h2" style="margin-bottom:4px">' + (hard ? 'الحد الأدنى يكفي اليوم' : esc(p.title)) +
    '<button class="chip" style="margin-inline-start:auto" data-act="hard" aria-pressed="' + hard + '">' + ic('lifebuoy') + 'يوم صعب</button></div>';
  if (hard) {
    h += '<div class="rt">' + ROUTINE_MIN.map((it) => routineRow(k, it)).join('') + '</div><p class="xs mute" style="margin-top:6px">وقت البطن والكروت والتمارين يمكن أن تنتظر بلا ذنب.</p>';
  } else {
    const items = S.routine.items.filter((i) => !i.off && (S.settings.adhkar || !/^adhkar/.test(i.id)));
    const done = items.filter((it) => routineCount(k, it.id) >= it.target).length;
    h += '<p class="sm">' + (p.tummy ? '<b>وقت البطن:</b> ' + esc(p.tummy) + '. ' : '') + '<b>فكرة اليوم:</b> ' + esc(p.items[Math.floor(sod(Date.now()) / DAY) % p.items.length]) + '.</p>' +
      '<div class="row" style="margin-top:10px"><span class="sm grow">روتين اليوم: ' + done + ' من ' + items.length + '</span><button class="btn sm" data-act="go-more" data-v="plan">الروتين والخطة</button></div>';
  }
  return h + '</section>';
}
function routineRow(k, it) {
  const n = routineCount(k, it.id), done = n >= it.target;
  const auto = it.auto ? '<span class="auto">' + (it.auto === 'tummy' ? 'من جلسات وقت البطن' : it.auto === 'wet' ? 'من الحفاضات المسجّلة' : 'من الأدوية المسجّلة') + '</span>' : '';
  const pips = it.target > 1 && it.target <= 6 ? ' <span class="pips">' + Array.from({ length: it.target }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</span>' : '';
  const ctl = it.auto ? '<span class="ct' + (done ? ' done' : '') + '">' + n + '/' + it.target + '</span>'
    : it.target === 1 ? '<button class="pm tick' + (done ? ' on' : '') + '" data-act="rt" data-id="' + it.id + '" data-v="' + (done ? -1 : 1) + '" aria-label="' + (done ? 'إلغاء' : 'تم') + '" aria-pressed="' + done + '">' + ic('check') + '</button>'
    : '<span class="ct' + (done ? ' done' : '') + '">' + n + '/' + it.target + '</span><button class="pm" data-act="rt" data-id="' + it.id + '" data-v="-1" aria-label="نقص">' + ic('minus') + '</button><button class="pm plus" data-act="rt" data-id="' + it.id + '" data-v="1" aria-label="زيادة">' + ic('plus') + '</button>';
  return '<div class="r"><span class="nm">' + esc(it.label) + pips + (auto ? '<br>' + auto : '') + '</span>' + ctl + '</div>';
}

/* reminder that only appears when data has no safety net yet */
function safetyNetHtml() {
  if (DEMO) return '';
  if (cloudSupported() && SYNC.state === 'ok') return '';
  const n = live(S.events).length;
  if (n < 15) return '';
  if (cloudSupported()) {
    if (Date.now() - (S.settings.cloudNag || 0) < 3 * DAY) return '';
    return '<div class="card sleep"><h3>' + ic('cloud-arrow-up') + ' احفظوا الدفتر في حسابكم</h3><p class="sm">سجّلوا الدخول مرة واحدة، فيُحفظ كل شيء ويظهر على موبايل الأم والأب معًا.</p>' +
      '<div class="btns" style="margin-top:8px"><button class="btn sm pri" data-act="go-more" data-v="cloud">تسجيل الدخول</button><button class="btn sm ghost" data-act="cloud-later">لاحقًا</button></div></div>';
  }
  if (!needBackup()) return '';
  return '<div class="card warn"><h3>' + ic('warning') + ' لم تُحفظ نسخة احتياطية منذ أسبوع</h3><p class="sm">البيانات على هذا الموبايل فقط. احفظوا نسخة وأرسلوها لأنفسكم على واتساب.</p><div class="btns" style="margin-top:8px"><button class="btn sm pri" data-act="go-backup">احفظ نسخة الآن</button></div></div>';
}
ACTS['cloud-later'] = () => { S.settings.cloudNag = Date.now(); save(); render(); };

function sinceHtml() {
  const lf = lastEvent(['breast', 'bottle']), ld = lastEvent(['diaper']), ls = lastEvent(['sleep']);
  const lb = lastEvent(['breast']);
  const next = lb && lb.d && lb.d.last ? (lb.d.last === 'L' ? 'R' : 'L') : null;
  const sl = S.timers.sleep;
  const tile = (cls, type, icon, label, v, d) => '<button class="tile ' + cls + '" data-act="log" data-type="' + type + '"><span class="k"><i>' + ic(icon) + '</i></span><span class="l">' + label + '</span>' + v + '<span class="d">' + d + '</span></button>';
  const t1 = tile('feed', 'breast', 'i-breast', 'منذ آخر رضعة', lf ? '<span class="v" data-since="' + lf.s + '">' + since(lf.s) + '</span>' : '<span class="v">–</span>',
    lf ? esc(evDetail(lf)) + (next ? '<br><b>التالي: ' + SIDE[next] + '</b>' : '') : 'لم تُسجَّل بعد');
  const t2 = tile('diaper', 'diaper', 'i-diaper', 'منذ آخر حفاض', ld ? '<span class="v" data-since="' + ld.s + '">' + since(ld.s) + '</span>' : '<span class="v">–</span>',
    ld ? esc(evDetail(ld)) : 'لم يُسجَّل بعد');
  let t3;
  if (sl && sl.s) t3 = tile('sleep on', 'sleep', 'moon-stars', 'نائم منذ', '<span class="v" data-clock="' + sl.s + '">' + clock(Date.now() - sl.s) + '</span>', fTime(sl.s) + (sl.loc ? '، ' + lab(SLEEP_LOC, sl.loc) : ''));
  else t3 = tile('sleep', 'sleep', 'moon-stars', ls ? 'صاحٍ منذ' : 'النوم', ls ? '<span class="v" data-since="' + (ls.e || ls.s) + '">' + since(ls.e || ls.s) + '</span>' : '<span class="v">–</span>',
    ls ? 'آخر نومة ' + hm((ls.e || ls.s) - ls.s) : 'لم يُسجَّل بعد');
  return '<section class="since">' + t1 + t2 + t3 + '</section>';
}

function timersHtml() {
  let h = '';
  const B = S.timers.breast, Sl = S.timers.sleep, Tm = S.timers.tummy;
  if (B) {
    const cur = B.segs[B.segs.length - 1], run = cur && !cur.e;
    h += '<section class="timer feed"><div class="lbl">' + ic('i-breast') + 'رضاعة ' + (run ? 'من ' + SIDE[cur.side] : '(متوقفة مؤقتًا)') + '</div>' +
      '<div class="clock" data-btot="1">' + clock(sideMs(B.segs, 'L') + sideMs(B.segs, 'R')) + '</div>' +
      '<div class="sides">' + ['R', 'L'].map((sd) => '<button class="side" data-act="bt-side" data-v="' + sd + '" aria-pressed="' + (run && cur.side === sd) + '">' + SIDE[sd] + '<small data-side="' + sd + '">' + clock(sideMs(B.segs, sd)) + '</small></button>').join('') + '</div>' +
      '<div class="btns">' + (run ? '<button class="btn sm" data-act="bt-pause">' + ic('pause') + 'إيقاف مؤقت</button>' : '') + '<button class="btn sm pri" data-act="bt-finish">' + ic('check') + 'انتهت الرضعة</button><button class="btn sm ghost" data-act="bt-cancel">إلغاء</button></div></section>';
  }
  if (Sl) {
    h += '<section class="timer sleep"><div class="lbl">' + ic('moon-stars') + 'نائم منذ ' + fTime(Sl.s) + (Sl.loc ? '، ' + lab(SLEEP_LOC, Sl.loc) : '') + '</div>' +
      '<div class="clock" data-clock="' + Sl.s + '">' + clock(Date.now() - Sl.s) + '</div>' +
      '<div class="btns"><button class="btn sm pri" data-act="sl-stop">' + ic('sun') + 'صحا الآن</button><button class="btn sm" data-act="log" data-type="sleep">' + ic('pencil-simple') + 'تفاصيل</button><button class="btn sm ghost" data-act="sl-cancel">إلغاء</button></div></section>';
  }
  if (Tm) {
    h += '<section class="timer play"><div class="lbl">' + ic('i-tummy') + 'وقت البطن' + (Tm.pos ? '، ' + lab(TUMMY_POS, Tm.pos) : '') + '</div>' +
      '<div class="clock" data-clock="' + Tm.s + '">' + clock(Date.now() - Tm.s) + '</div>' +
      '<div class="btns"><button class="btn sm pri" data-act="tm-stop">' + ic('check') + 'انتهى</button><button class="btn sm ghost" data-act="tm-cancel">إلغاء</button></div></section>';
  }
  return h;
}

function routineHtml(k) {
  const items = S.routine.items.filter((i) => !i.off && (S.settings.adhkar || !/^adhkar/.test(i.id)));
  return '<section class="card"><div class="h2" style="margin-bottom:4px">روتين اليوم</div><div class="rt">' + items.map((it) => routineRow(k, it)).join('') + '</div>' +
    '<p class="xs mute" style="margin-top:6px">قائمة اختيارات لا واجبات. يوم فيه اثنان أو ثلاثة منها يوم جيد.</p></section>';
}
function planHtml(a) {
  const p = planNow(a);
  return '<section class="card play"><h3>' + ic('flag') + ' ' + esc(p.title) + '</h3>' +
    (p.tummy ? '<p class="sm"><b>وقت البطن:</b> ' + esc(p.tummy) + '</p>' : '') +
    '<ul class="sm" style="margin:6px 0 4px;padding-inline-start:18px">' + p.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>' +
    '<p class="sm"><b>ترقّبوا:</b> ' + esc(p.watch) + '</p><p class="xs mute" style="margin-top:6px">اختاروا شيئًا واحدًا اليوم. الخطة قائمة اختيارات، لا واجبات.</p></section>';
}
function upcomingHtml(a, onlyNear) {
  const L = vaxList();
  const now0 = sod(Date.now());
  const late = L.filter((v) => v.state === 'late' || v.state === 'due');
  const nextDue = L.filter((v) => v.state !== 'done' && v.state !== 'skip' && v.state !== 'check' && v.due >= now0).sort((x, y) => x.due - y.due);
  const group = nextDue.length ? nextDue.filter((v) => sod(v.due) === sod(nextDue[0].due)) : [];
  const unk = L.filter((v) => v.state === 'check').length;
  const ap = live(S.appts).filter((x) => !x.done && x.s >= now0).sort((x, y) => x.s - y.s).slice(0, 2);
  if (onlyNear) {
    const near = (group.length && group[0].due - now0 <= 14 * DAY) || late.length || ap.some((x) => x.s - Date.now() <= 7 * DAY);
    if (!near) return '';
  }
  let h = '<section class="card health"><div class="h2" style="margin-bottom:4px">القادم<button class="more" data-act="go-health" data-v="vax">التطعيمات</button></div>';
  for (const v of late.filter((x) => x.state === 'late' || sod(x.due) < now0).slice(0, 2)) h += '<p class="sm">' + ic('syringe') + ' <b>' + esc(v.name) + '</b>: موعده كان ' + fDateS(v.due) + '. إن أُعطي فسجّلوه، وإلا فاسألوا مكتب الصحة.</p>';
  if (group.length) h += '<p class="sm">' + ic('syringe') + ' <b>تطعيمات ' + fDateS(group[0].due) + ' ' + inDays(group[0].due) + ':</b> ' + group.map((v) => esc(v.name)).join('، ') + '</p>';
  for (const x of ap) h += '<p class="sm">' + ic('calendar-check') + ' <b>' + esc(x.what || 'موعد') + '</b>: ' + fDateS(x.s) + ' ' + fTime(x.s) + '</p>';
  if (unk) h += '<p class="xs mute" style="margin-top:4px">' + pl(unk, ['تطعيم واحد سابق', 'تطعيمان سابقان', 'تطعيمات سابقة', 'تطعيمًا سابقًا', 'تطعيم سابق']) + ' بلا تسجيل. سجّلوها من الكارت حين تتذكرون.</p>';
  if (!group.length && !ap.length && !late.length) h += '<p class="sm">لا مواعيد قادمة مسجّلة.</p>';
  return h + '</section>';
}
function tipHtml() {
  const i = Math.floor(sod(Date.now()) / DAY) % TIPS.length;
  const [k, t] = TIPS[i];
  return '<section class="card soft"><h3>' + ic('lightbulb') + ' فكرة اليوم <span class="xs mute">(' + TIP_KIND[k] + ')</span></h3><p class="sm">' + esc(t) + '</p></section>';
}

/* ------------------------------------------------------------------ timer actions */
function btStart(side) { S.timers.breast = { segs: [{ side, s: Date.now(), e: null }] }; save(); }
ACTS['bt-side'] = (el) => {
  const side = el.dataset.v, t = Date.now();
  const T = S.timers.breast;
  if (!T) btStart(side);
  else {
    const cur = T.segs[T.segs.length - 1];
    if (cur && !cur.e && cur.side === side) return;
    if (cur && !cur.e) cur.e = t;
    T.segs.push({ side, s: t, e: null }); save();
  }
  render();
};
ACTS['bt-pause'] = () => { const T = S.timers.breast; if (!T) return; const cur = T.segs[T.segs.length - 1]; if (cur && !cur.e) cur.e = Date.now(); save(); render(); };
ACTS['bt-finish'] = () => {
  const T = S.timers.breast; if (!T) return;
  const t = Date.now(); const cur = T.segs[T.segs.length - 1]; if (cur && !cur.e) cur.e = t;
  const segs = T.segs.filter((g) => g.e - g.s >= 1000);
  delete S.timers.breast;
  if (!segs.length) { save(); closeSheet(); render(); return; }
  const ev = addEvent('breast', segs[0].s, segs[segs.length - 1].e, { segs, last: segs[segs.length - 1].side });
  closeSheet(); render(); toast('سُجّلت الرضعة: ' + evDetail(ev), () => delRec(ev));
};
ACTS['bt-cancel'] = () => { delete S.timers.breast; save(); closeSheet(); render(); };
ACTS['sl-start'] = () => {
  const st = (UI.sheet && UI.sheet.st) || {};
  S.timers.sleep = { s: Date.now(), loc: st.loc || '', how: st.how || '' }; save(); closeSheet(); render(); toast('بدأ عدّاد النوم');
};
ACTS['sl-stop'] = () => {
  const T = S.timers.sleep; if (!T) return;
  const st = UI.sheet && UI.sheet.kind === 'log' && UI.sheet.type === 'sleep' ? UI.sheet.st : {};
  const s = (st.s ? tval(st, 's') : null) || T.s;
  const ev = addEvent('sleep', Math.min(s, Date.now() - MIN), Date.now(), { loc: st.loc || T.loc || '', how: st.how || T.how || '' });
  delete S.timers.sleep; save(); closeSheet(); render(); toast('سُجّلت النومة: ' + hm(ev.e - ev.s), () => delRec(ev));
};
ACTS['sl-cancel'] = () => { delete S.timers.sleep; save(); closeSheet(); render(); };
ACTS['tm-start'] = () => { const st = (UI.sheet && UI.sheet.st) || {}; S.timers.tummy = { s: Date.now(), pos: st.pos || '' }; save(); closeSheet(); render(); };
ACTS['tm-stop'] = () => {
  const T = S.timers.tummy; if (!T) return;
  const ev = addEvent('tummy', T.s, Math.max(Date.now(), T.s + 1000), { pos: T.pos || '' });
  delete S.timers.tummy; save(); closeSheet(); render(); toast('سُجّل وقت البطن: ' + hm(ev.e - ev.s), () => delRec(ev));
};
ACTS['tm-cancel'] = () => { delete S.timers.tummy; save(); render(); };
ACTS.rt = (el) => { routineBump(today(), el.dataset.id, Number(el.dataset.v)); render(); };
ACTS.hard = () => {
  const k = today(); S.settings.hard = S.settings.hard || {};
  if (S.settings.hard[k]) delete S.settings.hard[k]; else S.settings.hard[k] = 1;
  S.settings.u = Date.now(); save(); render();
};
ACTS['go-health'] = (el) => { UI.tab = 'health'; UI.htab = el.dataset.v || 'growth'; render(); window.scrollTo(0, 0); };
ACTS['go-more'] = (el) => { UI.tab = 'more'; UI.more = el.dataset.v; render(); window.scrollTo(0, 0); };

/* ------------------------------------------------------------------ night screen */
ACTS.night = () => { UI.night = true; UI.nightMsg = ''; render(); };
ACTS['night-x'] = () => { UI.night = false; render(); };
function renderNight() {
  const host = document.getElementById('night');
  if (!host) return;
  if (!UI.night || !S.profile) { host.innerHTML = ''; return; }
  const lf = lastEvent(['breast', 'bottle']), B = S.timers.breast, Sl = S.timers.sleep;
  const lb = lastEvent(['breast']);
  const next = lb && lb.d && lb.d.last ? (lb.d.last === 'L' ? 'R' : 'L') : null;
  const cur = B ? B.segs[B.segs.length - 1] : null, run = cur && !cur.e;
  const recent = S.events.filter((e) => !e.x).sort((x, y) => y.s - x.s).slice(0, 3);
  let h = '<div class="night" role="dialog" aria-label="وضع الليل"><div class="nin">' +
    '<div class="nh"><h2>' + ic('moon-stars') + ' وضع الليل</h2><button class="x" data-act="night-x" aria-label="خروج من وضع الليل">' + ic('x') + '</button></div>';
  if (B) h += '<div class="big"><b data-btot="1">' + clock(sideMs(B.segs, 'L') + sideMs(B.segs, 'R')) + '</b><span>رضاعة ' + (run ? 'من ' + SIDE[cur.side] : 'متوقفة') + '</span></div>';
  else if (Sl) h += '<div class="big"><b data-clock="' + Sl.s + '">' + clock(Date.now() - Sl.s) + '</b><span>نائم منذ ' + fTime(Sl.s) + '</span></div>';
  else h += '<div class="big"><b data-ago="' + (lf ? lf.s : 0) + '">' + (lf ? ago(lf.s) : '–') + '</b><span>' + (lf ? 'آخر رضعة، ' + esc(evDetail(lf)) : 'لا رضعات مسجّلة') + (next ? '. التالي: ' + SIDE[next] : '') + '</span></div>';
  h += '<div class="ng">' + ['R', 'L'].map((sd) => '<button class="nb' + (run && cur.side === sd ? ' hot' : '') + '" data-act="bt-side" data-v="' + sd + '">' + ic('i-breast') + SIDE[sd] +
       '<small' + (B ? ' data-side="' + sd + '"' : '') + '>' + (B ? clock(sideMs(B.segs, sd)) : (next === sd ? 'التالي' : '')) + '</small></button>').join('') + '</div>';
  if (B) h += '<button class="nb wide" data-act="bt-finish">' + ic('check') + 'انتهت الرضعة</button>';
  h += '<div class="ng">' +
    (Sl ? '<button class="nb hot" data-act="sl-stop">' + ic('sun') + 'صحا</button>' : '<button class="nb" data-act="night-sleep">' + ic('moon') + 'نام</button>') +
    '<button class="nb" data-act="night-bottle">' + ic('i-bottle') + 'ببرونة<small>' + lastBottleMl() + ' مل</small></button>' +
    '<button class="nb" data-act="night-diaper" data-v="wet">' + ic('drop') + 'حفاض مبلل</button>' +
    '<button class="nb" data-act="night-diaper" data-v="dirty">' + ic('i-diaper') + 'حفاض متسخ</button></div>' +
    '<p class="ntoast" role="status">' + esc(UI.nightMsg || '') + '</p>' +
    '<div class="nlist">' + recent.map((e) => '<span>' + fTime(e.s) + '، ' + TYPES[e.t].label + (evDetail(e) ? '، ' + esc(evDetail(e)) : '') + '</span>').join('') + '</div>' +
    '</div></div>';
  host.innerHTML = h;
}
function lastBottleMl() { const b = lastEvent(['bottle']); return (b && b.d && b.d.ml) || 90; }
ACTS['night-sleep'] = () => { S.timers.sleep = { s: Date.now(), loc: '', how: '' }; save(); UI.nightMsg = 'بدأ عدّاد النوم'; render(); };
ACTS['night-bottle'] = () => {
  const lb = lastEvent(['bottle']);
  const ev = addEvent('bottle', Date.now(), null, { ml: lastBottleMl(), kind: (lb && lb.d && lb.d.kind) || 'f' });
  UI.nightMsg = 'سُجّلت ببرونة ' + ev.d.ml + ' مل. للتعديل افتحوا السجل.'; render();
};
ACTS['night-diaper'] = (el) => {
  const dirty = el.dataset.v === 'dirty';
  addEvent('diaper', Date.now(), null, { wet: true, dirty });
  UI.nightMsg = dirty ? 'سُجّل حفاض متسخ' : 'سُجّل حفاض مبلل'; render();
};
