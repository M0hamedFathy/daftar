/* ---------------------------------------------------------------------------
   History (one day at a time) and Statistics (days, weeks, months).
--------------------------------------------------------------------------- */

const FILTERS = [['all', 'الكل'], ['feed', 'رضاعة'], ['sleep', 'نوم'], ['diaper', 'حفاضات'], ['play', 'نشاط'], ['health', 'صحة'], ['other', 'أخرى']];
function catOf(t) { const c = TYPES[t].cat; return ['feed', 'sleep', 'diaper', 'play', 'health'].includes(c) ? c : 'other'; }

VIEWS.hist = function () {
  const k = UI.day || today(), a = keyMs(k), b = addDays(a, 1);
  const isToday = k === today();
  let evs = eventsIn(a, b).filter((e) => e.s >= a || (e.e && e.e > a));
  if (UI.filter !== 'all') evs = evs.filter((e) => catOf(e.t) === UI.filter);
  const st = dayStats(k);
  let h = '<section class="daynav"><button class="ibtn" data-act="day" data-v="-1" aria-label="اليوم السابق">' + ic('caret-right') + '</button>' +
    '<div class="d"><b>' + (isToday ? 'اليوم، ' : '') + fDate(a) + '</b><span>' + fHijri(a) + '</span></div>' +
    '<button class="ibtn" data-act="day" data-v="1" aria-label="اليوم التالي"' + (isToday ? ' disabled style="opacity:.35"' : '') + '>' + ic('caret-left') + '</button></section>';
  h += '<section class="kpis">' +
    '<div class="kpi"><b>' + st.feeds + '</b><span>عدد الرضعات' + (st.bottles ? '، منها ' + st.bottles + ' ببرونة' : '') + '</span></div>' +
    '<div class="kpi"><b>' + hm(st.sleepMs) + '</b><span>نوم في هذا اليوم</span></div>' +
    '<div class="kpi"><b>' + st.wet + ' مبلل</b><span>و' + st.dirty + ' متسخ</span></div>' +
    '<div class="kpi"><b>' + mins(st.tummyMs) + ' د</b><span>وقت البطن</span></div></section>';
  h += '<section class="subtabs" aria-label="تصفية">' + FILTERS.map(([id, l]) => '<button data-act="filter" data-v="' + id + '" aria-pressed="' + (UI.filter === id) + '">' + l + '</button>').join('') + '</section>';
  if (isToday) {
    const T = []; if (S.timers.breast) T.push(['breast', 'رضاعة جارية', S.timers.breast.segs[0].s]); if (S.timers.sleep) T.push(['sleep', 'نائم الآن', S.timers.sleep.s]); if (S.timers.tummy) T.push(['tummy', 'وقت البطن الآن', S.timers.tummy.s]);
    if (T.length) h += '<section class="card flat"><div class="list">' + T.map(([t, l, s]) => '<button class="item" data-act="log" data-type="' + t + '"><i class="dot ' + BG[t] + '">' + ic(TYPES[t].icon) + '</i><span class="grow"><span class="t">' + l + '</span><span class="s">منذ ' + fTime(s) + '</span></span><span class="when" data-clock="' + s + '">' + clock(Date.now() - s) + '</span></button>').join('') + '</div></section>';
  }
  if (!evs.length) h += '<section class="card soft"><p class="sm">لا سجلات ' + (UI.filter === 'all' ? '' : 'من هذا النوع ') + 'في هذا اليوم. اضغطوا زر الإضافة لتسجيل شيء بأثر رجعي.</p></section>';
  else h += '<section class="card flat"><div class="list">' + evs.map((e) => '<button class="item" data-act="edit" data-id="' + e.id + '"><i class="dot ' + BG[e.t] + '">' + ic(TYPES[e.t].icon) + '</i>' +
    '<span class="grow"><span class="t">' + TYPES[e.t].label + '</span><span class="s">' + esc(evDetail(e)) + (e.n ? (evDetail(e) ? '، ' : '') + esc(e.n) : '') + '</span></span><span class="when">' + evWhen(e) + '</span></button>').join('') + '</div></section>';
  return h;
};
ACTS.day = (el) => {
  const k = UI.day || today(); const n = addDays(keyMs(k), Number(el.dataset.v));
  if (n > Date.now()) return;
  UI.day = dayKey(n); render();
};
ACTS.filter = (el) => { UI.filter = el.dataset.v; render(); };

/* ------------------------------------------------------------------ stats */
const RANGES = [[7, '7 أيام'], [30, '30 يومًا'], [90, '3 شهور'], [0, 'الكل']];
function statDays(n) {
  const t = sod(Date.now());
  let start = n ? addDays(t, -(n - 1)) : t;
  if (!n) {
    const first = Math.min(...live(S.events).map((e) => e.s), t);
    start = Math.max(sod(first), S.profile ? keyMs(S.profile.birth) : sod(first));
  }
  const out = [];
  for (let d = start; d <= t; d = addDays(d, 1)) out.push(dayKey(d));
  return out;
}
function bucketize(keys) {      // more than a month: weekly buckets; more than four months: monthly; values are per-day averages
  if (keys.length > 120) {
    const by = {};
    for (const k of keys) { const m = k.slice(0, 7); (by[m] = by[m] || []).push(k); }
    return Object.keys(by).sort().map((m) => ({ keys: by[m], label: fmt({ month: 'short' }).format(new Date(keyMs(m + '-01'))), title: MF.format(new Date(keyMs(m + '-01'))) }));
  }
  if (keys.length <= 31) return keys.map((k) => ({ keys: [k], label: keys.length <= 8 ? DFW.format(new Date(keyMs(k))) : String(new Date(keyMs(k)).getDate()), title: fDate(keyMs(k)) }));
  const out = [];
  for (let i = 0; i < keys.length; i += 7) { const g = keys.slice(i, i + 7); out.push({ keys: g, label: fDateS(keyMs(g[0])), title: 'أسبوع ' + fDateS(keyMs(g[0])) + ' – ' + fDateS(keyMs(g[g.length - 1])) }); }
  return out;
}
VIEWS.stats = function () {
  const keys = statDays(UI.range);
  const per = {}; keys.forEach((k) => { per[k] = dayStats(k); });
  const B = bucketize(keys), weekly = keys.length > 31;
  const avg = (f) => sum(keys.map((k) => f(per[k]))) / keys.length;
  const avgB = (g, f) => sum(g.keys.map((k) => f(per[k]))) / g.keys.length;
  const unit = weekly ? 'متوسط اليوم في ' : '';
  let h = '<section class="subtabs" aria-label="المدة">' + RANGES.map(([n, l]) => '<button data-act="range" data-v="' + n + '" aria-pressed="' + (UI.range === n) + '">' + l + '</button>').join('') + '</section>';
  // feed intervals (average gap between feed starts) over the range
  const fs = eventsIn(keyMs(keys[0]), addDays(keyMs(keys[keys.length - 1]), 1), ['breast', 'bottle']).map((e) => e.s).sort((x, y) => x - y);
  const gaps = fs.slice(1).map((t, i) => t - fs[i]).filter((g) => g < 8 * HOUR);
  const longestAll = Math.max(0, ...keys.map((k) => per[k].longest));
  h += '<section class="kpis">' +
    '<div class="kpi"><b>' + num(avg((s) => s.feeds), 1) + '</b><span>متوسط عدد الرضعات في اليوم</span></div>' +
    '<div class="kpi"><b>' + (gaps.length ? hm(sum(gaps) / gaps.length) : '–') + '</b><span>متوسط ما بين بداية رضعة والتي تليها</span></div>' +
    '<div class="kpi"><b>' + hm(avg((s) => s.sleepMs)) + '</b><span>متوسط النوم في اليوم</span></div>' +
    '<div class="kpi"><b>' + (longestAll ? hm(longestAll) : '–') + '</b><span>أطول نومة متصلة في هذه المدة</span></div>' +
    '<div class="kpi"><b>' + num(avg((s) => s.wet), 1) + '</b><span>متوسط الحفاضات المبللة في اليوم</span></div>' +
    '<div class="kpi"><b>' + Math.round(avg((s) => s.tummyMs / MIN)) + ' د</b><span>متوسط وقت البطن في اليوم</span></div></section>';

  const tableBtn = (id) => '<button class="more" data-act="tbl" data-v="' + id + '">' + (UI.tables[id] ? 'رسم' : 'جدول') + '</button>';
  const block = (id, title, chart, legend, rows, head) => '<section class="card"><div class="h2" style="margin-bottom:6px">' + title + tableBtn(id) + '</div>' +
    (UI.tables[id] ? '<div class="tablewrap"><table class="tb"><thead><tr>' + head.map((x) => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
                   : chart + (legend ? '<div class="legend" style="margin-top:6px">' + legend + '</div>' : '')) + '</section>';
  const lg = (pairs) => pairs.map(([c, l]) => { const [v, extra] = c.split(';'); return '<span><i style="background:var(' + v + ')' + (extra ? ';' + extra : '') + '"></i>' + l + '</span>'; }).join('');
  const rowsRev = B.slice().reverse();

  // feeds
  const fCols = B.map((g) => { const br = avgB(g, (s) => s.breast), bo = avgB(g, (s) => s.bottles); return { label: g.label, vals: [br, bo], tip: '<b>' + g.title + '</b><br>' + unit + 'رضاعة طبيعية: ' + num(br, 1) + '<br>ببرونة: ' + num(bo, 1) + (weekly ? '' : '<br>دقائق الثدي: ' + mins(per[g.keys[0]].breastMs) + '، ببرونة: ' + per[g.keys[0]].ml + ' مل') }; });
  h += block('feeds', 'الرضعات' + (weekly ? ' (متوسط اليوم)' : ''), chartBars(fCols, [{ cls: 'f-feed' }, { cls: 'f-bottle' }], { band: ranges(ageInfo(S.profile)).feeds, aria: 'عدد الرضعات' }),
    lg([['--c-feed', 'طبيعية'], ['--c-bottle', 'ببرونة'], ['--surface2', 'المدى المعتاد']]),
    rowsRev.map((g) => [g.title, num(avgB(g, (s) => s.breast), 1), num(avgB(g, (s) => s.bottles), 1), Math.round(avgB(g, (s) => s.breastMs / MIN)), Math.round(avgB(g, (s) => s.ml))]),
    ['اليوم', 'طبيعية', 'ببرونة', 'دقائق الثدي', 'مل ببرونة']);
  // sleep
  const sCols = B.map((g) => { const n = avgB(g, (s) => s.nightMs / HOUR), d = avgB(g, (s) => s.dayMs / HOUR); return { label: g.label, vals: [n, d], tip: '<b>' + g.title + '</b><br>' + unit + 'نوم الليل (7م إلى 7ص): ' + hm(n * HOUR) + '<br>نوم النهار: ' + hm(d * HOUR) + '<br>المجموع: ' + hm((n + d) * HOUR) }; });
  h += block('sleep', 'النوم بالساعات', chartBars(sCols, [{ cls: 'f-sleep' }, { cls: 'f-sleep-l' }], { band: ranges(ageInfo(S.profile)).sleep, fmtY: (v) => num(v, 0), aria: 'ساعات النوم' }),
    lg([['--c-sleep', 'ليلًا'], ['--c-sleep;opacity:.45', 'نهارًا'], ['--surface2', 'المعتاد لعمره']]),
    rowsRev.map((g) => [g.title, hm(avgB(g, (s) => s.nightMs)), hm(avgB(g, (s) => s.dayMs)), hm(avgB(g, (s) => s.sleepMs)), hm(Math.max(...g.keys.map((k) => per[k].longest)))]),
    ['اليوم', 'ليلًا', 'نهارًا', 'المجموع', 'أطول نومة']);
  // pattern (last 7 or 14 days)
  const pk = keys.slice(-Math.min(keys.length, UI.range === 7 ? 7 : 14));
  const prow = pk.slice().reverse().map((k) => {
    const a = keyMs(k), b = addDays(a, 1);
    const sl = eventsIn(a, b, ['sleep']).map((e) => [e.s, e.e || Math.min(Date.now(), b)]);
    if (k === today() && S.timers.sleep) sl.push([S.timers.sleep.s, Date.now()]);
    return { label: DFW.format(new Date(a)) + ' ' + new Date(a).getDate(), day0: a, sleeps: sl, feeds: eventsIn(a, b, ['breast']).map((e) => e.s), bottles: eventsIn(a, b, ['bottle']).map((e) => e.s) };
  });
  h += '<section class="card"><div class="h2" style="margin-bottom:2px">شكل اليوم والليلة</div><p class="xs mute" style="margin-bottom:6px">كل سطر يوم، من منتصف الليل (يمين) إلى منتصف الليل التالي (يسار). المظلل هو الليل.</p>' +
    chartPattern(prow) + '<div class="legend" style="margin-top:6px">' + lg([['--c-sleep', 'نوم']]) + '<span><i style="background:var(--c-feed);border-radius:50%"></i>رضاعة</span><span><i style="background:var(--c-bottle);border-radius:50%"></i>ببرونة</span></div></section>';
  // where he slept
  const locMs = {};
  for (const e of eventsIn(keyMs(keys[0]), addDays(keyMs(keys[keys.length - 1]), 1), ['sleep'])) { const l = (e.d && e.d.loc) || 'none'; locMs[l] = (locMs[l] || 0) + ((e.e || e.s) - e.s); }
  const tot = sum(Object.values(locMs));
  if (tot > 0) {
    const pal = { crib: 'var(--c-sleep)', side: 'var(--c-wet)', chest: 'var(--c-feed)', bed: 'var(--c-bottle)', nest: 'var(--c-dirty)', arms: 'var(--mind)', pram: 'var(--health)', none: 'var(--surface2)' };
    const names = Object.assign({ none: 'لم يُحدَّد' }, Object.fromEntries(SLEEP_LOC.map((l) => [l.id, l.label])));
    const ord = Object.keys(locMs).sort((x, y) => locMs[y] - locMs[x]);
    h += '<section class="card"><div class="h2" style="margin-bottom:6px">أين نام في هذه المدة؟</div><div class="hbar">' +
      ord.map((l) => '<i style="width:' + (100 * locMs[l] / tot).toFixed(1) + '%;background:' + pal[l] + '"' + tipAttr('<b>' + names[l] + '</b> ' + Math.round(100 * locMs[l] / tot) + '٪، ' + hm(locMs[l])) + '></i>').join('') + '</div>' +
      '<div class="legend" style="margin-top:8px">' + ord.map((l) => '<span><i style="background:' + pal[l] + '"></i>' + names[l] + ' ' + Math.round(100 * locMs[l] / tot) + '٪</span>').join('') + '</div>' +
      '<p class="xs mute" style="margin-top:6px">للمتابعة لا للحكم. إن كان النوم معكما يتكرر، فصفحة «إذا نام معكما» في الدليل تقول كيف يكون أقل خطرًا.</p></section>';
  }
  // diapers
  const dCols = B.map((g) => { const w = avgB(g, (s) => s.wet), d = avgB(g, (s) => s.dirty); return { label: g.label, vals: [w, d], tip: '<b>' + g.title + '</b><br>' + unit + 'مبلل: ' + num(w, 1) + '<br>متسخ: ' + num(d, 1) }; });
  h += block('diapers', 'الحفاضات', chartBars(dCols, [{ cls: 'f-wet' }, { cls: 'f-dirty' }], { aria: 'عدد الحفاضات' }), lg([['--c-wet', 'مبلل'], ['--c-dirty', 'متسخ']]),
    rowsRev.map((g) => [g.title, num(avgB(g, (s) => s.wet), 1), num(avgB(g, (s) => s.dirty), 1)]), ['اليوم', 'مبلل', 'متسخ']);
  // tummy time
  const tCols = B.map((g) => { const m = avgB(g, (s) => s.tummyMs / MIN); return { label: g.label, vals: [m], tip: '<b>' + g.title + '</b><br>' + unit + 'وقت البطن: ' + Math.round(m) + ' دقيقة' }; });
  const goal = planNow(ageInfo(S.profile)).goal;
  h += block('tummy', 'وقت البطن بالدقائق', chartBars(tCols, [{ cls: 'f-tummy' }], { band: goal && goal[0] ? goal : null, fmtY: (v) => num(v, 0), aria: 'دقائق وقت البطن' }),
    lg([['--c-tummy', 'دقائق'], ['--surface2', 'الهدف التقريبي لعمره']]), rowsRev.map((g) => [g.title, Math.round(avgB(g, (s) => s.tummyMs / MIN)), num(avgB(g, (s) => s.tummyN), 1)]), ['اليوم', 'دقائق', 'جلسات']);
  if (!live(S.events).length) h = '<section class="card soft"><p class="sm">ستظهر الرسوم هنا بعد أن تسجّلوا بعض الرضعات والنوم والحفاضات.</p></section>' + h;
  return h;
};
ACTS.range = (el) => { UI.range = Number(el.dataset.v); render(); };
ACTS.tbl = (el) => { const id = el.dataset.v; UI.tables[id] = !UI.tables[id]; render(); };
