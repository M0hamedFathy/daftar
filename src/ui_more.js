/* ---------------------------------------------------------------------------
   More: plan and routine, memories, expenses, parents, backup and transfer,
   settings, about. Plus first-run setup and sample data.
--------------------------------------------------------------------------- */

const MORE = [
  ['faith', 'hands-praying', 'bg-faith', 'الإيمان والتنشئة', 'الأذكار بنصّها، وأدعية الذرية، وما نغرسه في عمره، وسنن المولود والمناسبات'],
  ['cloud', 'cloud-arrow-up', 'bg-sleep', 'الحساب والمزامنة', 'احفظوا الدفتر في حسابكم، وشاركوه بين موبايل الأم والأب'],
  ['backup', 'file-arrow-down', 'bg-diaper', 'النسخ الاحتياطي والنقل', 'ملف أو كود، لنقل البيانات يدويًا أو حفظها'],
  ['plan', 'flag', 'bg-play', 'الخطة والروتين', 'خطة الأسابيع، وتعديل روتين اليوم'],
  ['journal', 'camera', 'bg-faith', 'الذكريات', '«أول مرة» والصور والملاحظات'],
  ['parents', 'hand-heart', 'bg-mind', 'الوالدان', 'المزاج والنوم، ومتى تطلبون المساعدة'],
  ['money', 'wallet', 'bg-money', 'المصروفات', 'بالبند والشهر'],
  ['settings', 'gear', 'bg-note', 'الإعدادات', 'بيانات الطفل، والمظهر، والمسح'],
  ['about', 'info', 'bg-note', 'عن الدفتر', 'المصادر، والخصوصية، والدليل المطبوع'],
];
VIEWS.more = function () {
  if (UI.more && MV[UI.more]) return '<button class="back" data-act="more-back">' + ic('caret-right') + 'المزيد</button>' + MV[UI.more]();
  return '<section class="card flat"><div class="menu">' + MORE.map(([id, i, bg, t, s]) =>
    '<button data-act="more" data-v="' + id + '"><i class="' + bg + '">' + ic(i) + '</i><span><span class="t">' + t + '</span><span class="s">' + s + '</span></span>' + ic('caret-left', 'go') + '</button>').join('') + '</div></section>';
};
ACTS.more = (el) => { UI.more = el.dataset.v; render(); window.scrollTo(0, 0); };
ACTS['more-back'] = () => { UI.more = null; render(); };
const MV = {};

/* ------------------------------------------------------------------ plan and routine */
MV.plan = function () {
  const a = ageInfo(S.profile), cw = a ? a.cweek : 0;
  let h = routineHtml(today()) + planHtml(a) + tipHtml();
  h += '<section class="card"><h3>الأسابيع 6 إلى 12</h3><div class="tablewrap"><table class="tb"><thead><tr><th>الأسبوع</th><th>وقت البطن</th><th>أفكار</th><th>ترقّب</th></tr></thead><tbody>' +
    Object.keys(PLAN_WEEKS).map((w) => { const p = PLAN_WEEKS[w]; return '<tr' + (Number(w) === cw ? ' style="background:var(--play-t)"' : '') + '><td>' + w + '</td><td style="white-space:normal;min-width:120px">' + esc(p.tummy) + '</td><td style="white-space:normal;min-width:160px">' + p.items.map(esc).join('<br>') + '</td><td style="white-space:normal;min-width:120px">' + esc(p.watch) + '</td></tr>'; }).join('') +
    '</tbody></table></div><p class="xs mute" style="margin-top:6px">تدرّج مقترح بين توصيات الأكاديمية الأمريكية لطب الأطفال ومنظمة الصحة العالمية، لا توصية رسمية. في الأيام الصعبة اكتفوا بالحد الأدنى.</p></section>';
  h += '<section class="card"><div class="h2" style="margin-bottom:4px">بنود روتين اليوم<button class="more" data-act="rt-reset">الافتراضي</button></div>' +
    S.routine.items.map((it) => '<div class="rt"><div class="r"><label class="grow row" style="gap:8px"><input type="checkbox" data-chg="rt-on" data-id="' + it.id + '"' + (it.off ? '' : ' checked') + ' style="width:22px;height:22px;accent-color:var(--accent)"><span class="nm">' + esc(it.label) + '</span></label>' +
      '<button class="pm" data-act="rt-t" data-id="' + it.id + '" data-v="-1" aria-label="تقليل الهدف">' + ic('minus') + '</button><span class="ct">' + it.target + '</span><button class="pm" data-act="rt-t" data-id="' + it.id + '" data-v="1" aria-label="زيادة الهدف">' + ic('plus') + '</button></div></div>').join('') +
    '<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="rt-add">' + ic('plus') + 'بند جديد</button></div></section>';
  return h;
};
CHG['rt-on'] = (el) => { const it = S.routine.items.find((i) => i.id === el.dataset.id); if (it) { it.off = !el.checked; S.routine.u = Date.now(); save(); } };
ACTS['rt-t'] = (el) => { const it = S.routine.items.find((i) => i.id === el.dataset.id); if (it) { it.target = clamp(it.target + Number(el.dataset.v), 1, 12); S.routine.u = Date.now(); save(); render(); } };
ACTS['rt-reset'] = () => { S.routine.items = clone(ROUTINE_DEFAULT); S.routine.u = Date.now(); save(); render(); toast('عاد الروتين إلى البنود الافتراضية'); };
ACTS['rt-add'] = () => openSheet({ kind: 'rtadd', st: { label: '', target: '1' } });
SHEETS.rtadd = (sh) => ({ title: 'بند جديد في الروتين', icon: 'list-checks', bg: 'bg-play', body: fIn('label', 'البند', 'text', 'placeholder="مثال: تمرين اليدين" autofocus') + fStep('target', 'كم مرة في اليوم؟', 1, 'مرة', 1) + errHtml(sh.st), foot: '<button class="btn pri" data-act="rt-save">' + ic('check') + 'إضافة</button>' });
ACTS['rt-save'] = () => {
  const st = UI.sheet.st, l = String(st.label || '').trim();
  if (!l) { st._err = 'اكتبوا اسم البند.'; renderSheet(); return; }
  S.routine.items.push({ id: 'c' + uid(), label: l, target: clamp(Math.round(numv('target') || 1), 1, 12), icon: 'star' }); S.routine.u = Date.now(); save(); closeSheet(); render();
};

/* ------------------------------------------------------------------ journal */
MV.journal = function () {
  const rows = live(S.journal).slice().sort((a, b) => keyMs(b.date) - keyMs(a.date) || b.u - a.u);
  let h = '<section class="sec"><h2>الذكريات<button class="more" data-act="log" data-type="journal">إضافة</button></h2></section>';
  if (!rows.length) return h + '<section class="card soft"><p class="sm">أول ابتسامة، أول نزهة، أول مرة رفع رأسه… ما يُكتب اليوم في دقيقة يصير بعد سنوات أثمن ما في الدفتر.</p></section>';
  return h + '<section class="card flat">' + rows.map((j) => '<button class="jr item" data-act="edit-journal" data-id="' + j.id + '" style="display:grid">' + (j.photo ? '<img src="' + j.photo + '" alt="">' : '<span class="ph">' + ic('star') + '</span>') +
    '<span><span class="t">' + esc(j.title || 'ذكرى') + '</span><br><span class="s">' + fDateY(keyMs(j.date)) + '</span><br><span class="sm">' + esc((j.text || '').slice(0, 140)) + '</span></span></button>').join('') + '</section>';
};

/* ------------------------------------------------------------------ parents */
MV.parents = function () {
  const ms = live(S.events).filter((e) => e.t === 'mood').sort((a, b) => b.s - a.s).slice(0, 14);
  let h = '<section class="card mind" style="background:var(--surface)"><h3>' + ic('hand-heart') + ' أنتما أيضًا</h3><p class="sm">سجّلا مزاجكما ونومكما من وقت لآخر. ليس للتقييم، بل لتريا الصورة: أيام صعبة كثيرة متتالية تعني أن الوقت حان لطلب المساعدة، من الأهل أو من الطبيب.</p>' +
    '<div class="btns" style="margin-top:8px"><button class="btn sm pri" data-act="log" data-type="mood">' + ic('smiley') + 'تسجيل اليوم</button></div></section>';
  if (ms.length) h += '<section class="card flat"><div class="list">' + ms.map((e) => '<button class="item" data-act="edit" data-id="' + e.id + '"><i class="dot bg-mind">' + ic(MOODS[(e.d.v || 3) - 1][0]) + '</i><span class="grow"><span class="t">' + (e.d.who === 'f' ? 'الأب' : 'الأم') + '، ' + MOODS[(e.d.v || 3) - 1][1] + '</span><span class="s">' + (e.d.slept ? 'نوم ' + num(e.d.slept, 1) + ' س' : '') + (e.n ? (e.d.slept ? '، ' : '') + esc(e.n) : '') + '</span></span><span class="when">' + fDateS(e.s) + '</span></button>').join('') + '</div></section>';
  h += '<section class="card warn"><h3>متى تطلبون المساعدة؟</h3><p class="sm">إن استمر الحزن أو القلق أو فقدان الاهتمام أكثر من أسبوعين، أو اشتد، فتحدّثوا مع الطبيب: ليس ضعفًا ولا تقصيرًا، وله علاج فعّال. ويصيب الاكتئاب حول الولادة الآباء أيضًا. وعند أي فكرة بإيذاء النفس أو الطفل: اطلبوا المساعدة الطبية فورًا، ولا يبقَ صاحبها وحده.</p></section>';
  h += '<section class="card soft"><h3>نوبات الليل</h3><p class="sm">كتلة نوم متصلة للأم كل يوم، ولو ثلاث ساعات، أريح من نوم متقطع طوال الليل. الأب يتولى ما بعد الرضعة: التجشئة والحفاض والنقل إلى السرير.</p></section>';
  return h;
};

/* ------------------------------------------------------------------ money */
MV.money = function () {
  const ev = live(S.events).filter((e) => e.t === 'exp').sort((a, b) => b.s - a.s);
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const thisM = ev.filter((e) => e.s >= m0.getTime());
  const byCat = {}; thisM.forEach((e) => { byCat[e.d.cat] = (byCat[e.d.cat] || 0) + Number(e.d.amt || 0); });
  const cur = esc(S.settings.currency);
  let h = '<section class="sec"><h2>المصروفات<button class="more" data-act="log" data-type="exp">إضافة</button></h2></section>';
  h += '<section class="kpis"><div class="kpi"><b>' + num(sum(thisM.map((e) => Number(e.d.amt || 0))), 0) + ' ' + cur + '</b><span>' + MF.format(m0) + '</span></div><div class="kpi"><b>' + num(sum(ev.map((e) => Number(e.d.amt || 0))), 0) + ' ' + cur + '</b><span>منذ بدء التسجيل</span></div></section>';
  if (Object.keys(byCat).length) h += '<section class="card"><h3>هذا الشهر بالبند</h3>' + Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).map((c) => '<div class="row" style="justify-content:space-between;padding:4px 0"><span class="sm">' + esc(c) + '</span><b class="tn">' + num(byCat[c], 0) + ' ' + cur + '</b></div>').join('') + '</section>';
  if (!ev.length) h += '<section class="card soft"><p class="sm">سجّلوا الحفاضات والحليب والكشوف لتعرفوا تكلفة الشهر. جدول الميزانية في الدليل المطبوع يساعد على التخطيط.</p></section>';
  else h += '<section class="card flat"><div class="list">' + ev.slice(0, 60).map((e) => '<button class="item" data-act="edit" data-id="' + e.id + '"><i class="dot bg-money">' + ic('wallet') + '</i><span class="grow"><span class="t">' + esc(e.d.cat || 'مصروف') + '</span><span class="s">' + esc(e.n || '') + '</span></span><span class="when">' + num(e.d.amt, 0) + ' ' + cur + '<br>' + fDateS(e.s) + '</span></button>').join('') + '</div></section>';
  return h;
};

/* ------------------------------------------------------------------ backup and transfer */
MV.backup = function () {
  const n = countRecords(S), lb = S.settings.lastBackup;
  const kind = { idb: 'ذاكرة المتصفح (IndexedDB) مع نسخة إضافية', ls: 'ذاكرة المتصفح (localStorage)', none: 'غير متاح في هذه الصفحة' }[STORE.kind] || '';
  let h = '<section class="card ' + (STORE.ok ? 'soft' : 'warn') + '"><h3>' + ic(STORE.ok ? 'shield-check' : 'warning') + ' أين تُحفظ البيانات؟</h3>' +
    '<p class="sm">على هذا الجهاز وفي هذا المتصفح فقط: ' + kind + '. لا تُرسل إلى أي خادم. ' + (STORE.persisted ? 'والمتصفح وعد بعدم مسحها تلقائيًا.' : 'وقد يمسحها المتصفح إن امتلأت الذاكرة أو مُسحت بيانات المواقع.') + '</p>' +
    '<p class="sm" style="margin-top:6px"><b>' + pl(n, U.record) + '</b>. آخر نسخة احتياطية: ' + (lb ? ago(lb) : 'لم تُحفظ بعد') + '.</p>' +
    (DEMO ? '<p class="hint warn">أنتم في البيانات التجريبية. النسخ الاحتياطي يعمل بعد أن تبدؤوا بطفلكم.</p>' : '') + '</section>';
  h += '<section class="card"><h3>' + ic('file-arrow-down') + ' حفظ نسخة احتياطية</h3><p class="sm">ملف واحد فيه كل شيء، حتى الصور. احفظوه، أو أرسلوه لأنفسكم على واتساب أو البريد.</p><div class="btns" style="margin-top:8px">' +
    '<button class="btn pri" data-act="bk-file"' + (DEMO ? ' disabled' : '') + '>' + ic('download-simple') + 'حفظ الملف</button>' +
    (canShareFiles() ? '<button class="btn" data-act="bk-share"' + (DEMO ? ' disabled' : '') + '>' + ic('share-network') + 'مشاركة (واتساب…)</button>' : '') + '</div></section>';
  h += '<section class="card"><h3>' + ic('copy') + ' كود النسخة</h3><p class="sm">نص مضغوط تنسخونه وتلصقونه في رسالة، ثم تلصقونه في الموبايل الآخر. مناسب حين لا يمكن حفظ الملفات. لا يحمل الصور.</p>' +
    '<div class="btns" style="margin-top:8px"><button class="btn" data-act="bk-code"' + (DEMO ? ' disabled' : '') + '>' + ic('copy') + 'إنشاء الكود ونسخه</button></div>' + (UI.code ? '<div class="f" style="margin-top:8px"><textarea class="in code" id="code-out" readonly rows="4">' + esc(UI.code) + '</textarea>' +
    '<p class="xs mute">' + num(UI.code.length / 1024, 1) + ' ك.ب. ' + (UI.code.length < 6000 ? '<a class="link" href="https://wa.me/?text=' + encodeURIComponent(UI.code) + '" target="_blank" rel="noopener">إرسال عبر واتساب</a>' : 'طويل على رابط واتساب: انسخوه والصقوه في الرسالة، أو استخدموا الملف.') + '</p></div>' : '') + '</section>';
  h += '<section class="card"><h3>' + ic('file-arrow-up') + ' استيراد على هذا الجهاز</h3><p class="sm">افتحوا ملف النسخة أو الصقوا الكود. ستُعرض عليكم المقارنة قبل أي تغيير.</p>' +
    '<div class="btns" style="margin-top:8px"><label class="btn filebtn">' + ic('file-arrow-up') + 'اختيار ملف النسخة<input type="file" accept=".json,.txt,application/json,text/plain" data-file="import" aria-label="اختيار ملف النسخة"></label></div>' +
    '<div class="f" style="margin-top:8px"><textarea class="in code" id="code-in" rows="3" placeholder="الصقوا كود النسخة هنا (يبدأ بـ DAFTAR)"></textarea></div>' +
    '<div class="btns" style="margin-top:8px"><button class="btn" data-act="imp-code">' + ic('clipboard-text') + 'قراءة الكود</button></div></section>';
  h += '<section class="card"><h3>' + ic('table') + ' جداول للإكسل</h3><p class="sm">ملف مضغوط فيه جداول CSV: السجلات، والقياسات، والتطعيمات، والمصروفات، والذكريات.</p><div class="btns" style="margin-top:8px"><button class="btn" data-act="bk-csv"' + (DEMO ? ' disabled' : '') + '>' + ic('download-simple') + 'حفظ الجداول</button></div></section>';
  h += '<section class="card soft"><h3>موبايل الأم وموبايل الأب</h3><ol class="sm" style="padding-inline-start:18px;margin:4px 0 0">' +
    '<li>من الموبايل الأول: «حفظ الملف» أو «مشاركة»، وأرسلوه على واتساب.</li><li>على الموبايل الثاني: افتحوا الدفتر، ثم «استيراد» واختاروا الملف.</li><li>اختاروا «دمج»: يُضاف الجديد فقط ولا يتكرر شيء، فكرروا ذلك متى شئتم في الاتجاهين.</li></ol>' +
    '<p class="xs mute" style="margin-top:6px">على اللابتوب: افتحوا ملف الدفتر (HTML) في المتصفح، ثم استوردوا الملف نفسه.</p></section>';
  return h;
};
async function backupText() { return JSON.stringify(exportObject()); }
ACTS['bk-file'] = async () => {
  const txt = await backupText();
  const r = await saveFile('دفتر-الرضيع-' + stamp() + '.json', txt, 'application/json');
  if (r === 'saved') { S.settings.lastBackup = Date.now(); save(); render(); toast('حُفظت النسخة. أرسلوها لأنفسكم على واتساب أو البريد.'); }
};
ACTS['bk-share'] = async () => {
  const txt = await backupText();
  if (await shareFile('دفتر-الرضيع-' + stamp() + '.json', txt, 'application/json')) { S.settings.lastBackup = Date.now(); save(); render(); }
};
ACTS['bk-code'] = async () => {
  const light = exportObject(); light.data.journal = light.data.journal.map((j) => Object.assign({}, j, { photo: '' }));
  const code = await encodeCode(JSON.stringify(light));
  UI.code = code;
  const ok = await copyText(code);
  S.settings.lastBackup = Date.now(); save(); render();
  const ta = document.getElementById('code-out'); if (ta && !ok) { ta.focus(); ta.select(); }
  toast(ok ? 'نُسخ الكود. الصقوه في رسالة لأنفسكم.' : 'حدّدوا الكود وانسخوه يدويًا.');
};
ACTS['bk-csv'] = async () => {
  const E = live(S.events).sort((a, b) => a.s - b.s);
  const files = [
    { name: 'events.csv', data: csv([['النوع', 'البداية', 'النهاية', 'المدة بالدقائق', 'التفاصيل', 'ملاحظة']].concat(E.map((e) => [TYPES[e.t].label, toLocalInput(e.s).replace('T', ' '), e.e ? toLocalInput(e.e).replace('T', ' ') : '', e.e ? Math.round((e.e - e.s) / MIN) : '', evDetail(e), e.n || '']))) },
    { name: 'growth.csv', data: csv([['التاريخ', 'الوزن كجم', 'الطول سم', 'محيط الرأس سم']].concat(growthRows().map((r) => [r.date, r.w || '', r.l || '', r.h || '']))) },
    { name: 'vaccines.csv', data: csv([['التطعيم', 'الجرعة', 'الموعد', 'أُعطي في']].concat(vaxList().map((v) => [v.name, v.dose, v.due ? dayKey(v.due) : '', v.date || '']))) },
    { name: 'expenses.csv', data: csv([['التاريخ', 'البند', 'المبلغ', 'ملاحظة']].concat(E.filter((e) => e.t === 'exp').map((e) => [dayKey(e.s), e.d.cat, e.d.amt, e.n || '']))) },
    { name: 'journal.csv', data: csv([['التاريخ', 'العنوان', 'التفاصيل']].concat(live(S.journal).map((j) => [j.date, j.title, j.text]))) },
  ];
  const r = await saveFile('دفتر-الرضيع-جداول-' + stamp() + '.zip', zip(files), 'application/zip');
  if (r === 'saved') toast('حُفظت الجداول');
};
FILES.import = (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => { try { await startImport(String(rd.result)); } catch (e) { toast(e.message || 'تعذّرت قراءة الملف.'); } };
  rd.onerror = () => toast('تعذّرت قراءة الملف.');
  rd.readAsText(f);
};
ACTS['imp-code'] = async () => {
  const ta = document.getElementById('code-in'); const v = ta ? ta.value : '';
  if (!v.trim()) { toast('الصقوا الكود أولًا.'); return; }
  try { await startImport(await decodeCode(v)); } catch (e) { toast(e.message && /دفتر|فارغ/.test(e.message) ? e.message : 'الكود غير مكتمل أو غير صحيح. انسخوه كاملًا وحاولوا مرة أخرى.'); }
};
async function startImport(text) {
  const inc = parseImport(text);
  const merged = mergeState(S, inc);
  const before = countRecords(S), after = countRecords(merged);
  openSheet({ kind: 'imp', inc, merged, st: { before, after, incN: countRecords(inc), name: (inc.profile && inc.profile.name) || '' } });
}
SHEETS.imp = (sh) => {
  const st = sh.st, same = !S.profile || !sh.inc.profile || (S.profile.birth === sh.inc.profile.birth);
  return {
    title: 'استيراد نسخة', icon: 'file-arrow-up', bg: 'bg-sleep',
    body: '<p class="sm">النسخة' + (st.name ? ' الخاصة ب<b>' + esc(st.name) + '</b>' : '') + ' فيها ' + pl(st.incN, U.record) + '. على هذا الجهاز الآن ' + pl(st.before, U.record) + '.</p>' +
      '<div class="hint ok"><b>دمج:</b> يصبح المجموع ' + pl(st.after, U.record) + '. يُضاف الجديد ويُحدَّث المعدّل، ولا يتكرر شيء.</div>' +
      '<div class="hint warn"><b>استبدال:</b> تُمسح بيانات هذا الجهاز وتحل محلها النسخة كما هي.</div>' +
      (!same ? '<p class="hint warn">تاريخ الولادة في النسخة يختلف عن هذا الجهاز. تأكدوا أنها للطفل نفسه.</p>' : ''),
    foot: '<button class="btn danger' + (st._rep ? ' armed' : '') + '" data-act="imp-replace">' + (st._rep ? 'تأكيد الاستبدال' : 'استبدال') + '</button><button class="btn pri" data-act="imp-merge">' + ic('arrows-left-right') + 'دمج</button>',
  };
};
function finishImport(next, msg) {
  const timers = S.timers; DEMO = false;
  S = normalize(next); S._device = DEVICE; S.timers = timers || {};
  save(true); closeSheet(); UI.code = ''; UI.tab = 'home'; UI.more = null; render(); toast(msg);
}
ACTS['imp-merge'] = () => finishImport(UI.sheet.merged, 'تم الدمج');
ACTS['imp-replace'] = () => {
  const sh = UI.sheet; if (!sh.st._rep) { sh.st._rep = 1; renderSheet(); return; }
  const next = clone(sh.inc); next.settings.lastBackup = S.settings.lastBackup; finishImport(next, 'تم الاستبدال');
};

/* ------------------------------------------------------------------ settings */
MV.settings = function () {
  const P = S.profile;
  return '<section class="card"><h3>بيانات الطفل</h3><p class="sm">' + esc(P.name || 'بلا اسم') + '، ' + (P.sex === 'f' ? 'بنت' : 'ولد') + '، وُلد ' + fDateY(keyMs(P.birth)) + (P.due ? '، والموعد المتوقع كان ' + fDateY(keyMs(P.due)) : '') + '.</p>' +
    '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="prof-edit">' + ic('pencil-simple') + 'تعديل</button></div></section>' +
    '<section class="card"><h3>المظهر</h3><div class="seg" style="margin-top:6px">' + [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']].map(([k, l]) => '<button data-act="theme" data-v="' + k + '" aria-pressed="' + (S.settings.theme === k) + '">' + l + '</button>').join('') + '</div></section>' +
    '<section class="card"><h3>الروتين</h3><label class="check"><input type="checkbox" data-chg="adhkar"' + (S.settings.adhkar ? ' checked' : '') + '><span class="grow sm">إظهار البنود الإيمانية في روتين اليوم (الأذكار والتعويذ والقرآن)، وتنبيه المناسبات الهجرية</span></label>' +
    '<div class="f" style="margin-top:6px"><label for="cur">العملة</label><input class="in" id="cur" data-chg="cur" value="' + esc(S.settings.currency) + '"></div></section>' +
    '<section class="card warn"><h3>مسح كل البيانات من هذا الجهاز</h3><p class="sm">لا يمكن التراجع. احفظوا نسخة احتياطية أولًا. اكتبوا كلمة <b>امسح</b> للتأكيد.</p><div class="f" style="margin-top:8px"><input class="in" id="wipe-in" autocomplete="off"></div><div class="btns" style="margin-top:8px"><button class="btn danger" data-act="wipe">' + ic('trash') + 'مسح البيانات</button></div></section>';
};
ACTS.theme = (el) => { S.settings.theme = el.dataset.v; S.settings.u = Date.now(); save(); render(); };
CHG.adhkar = (el) => { S.settings.adhkar = el.checked; S.settings.u = Date.now(); save(); };
CHG.cur = (el) => { S.settings.currency = el.value.trim().slice(0, 8) || 'ج.م'; S.settings.u = Date.now(); save(); };
ACTS.wipe = async () => {
  const v = (document.getElementById('wipe-in') || {}).value || '';
  if (v.trim() !== 'امسح') { toast('اكتبوا كلمة «امسح» أولًا.'); return; }
  DEMO = false; S = normalize(null); S._device = DEVICE; await writeState(); UI.tab = 'home'; UI.more = null; render(); toast('مُسحت البيانات');
};
ACTS['prof-edit'] = () => { const P = S.profile; openSheet({ kind: 'prof', st: { name: P.name || '', sex: P.sex || 'm', birth: P.birth, due: P.due || '', feed: P.feed || 'breast', _edit: 1 } }); };
SHEETS.prof = (sh) => ({ title: 'بيانات الطفل', icon: 'baby', bg: 'bg-sleep', body: profForm(sh.st), foot: '<button class="btn pri" data-act="prof-save">' + ic('check') + 'حفظ</button>' });
function profForm(st) {
  return fIn('name', 'الاسم', 'text', 'autocomplete="off"') + fSeg('sex', [{ id: 'm', label: 'ولد' }, { id: 'f', label: 'بنت' }]) +
    fIn('birth', 'تاريخ الولادة', 'date') +
    '<div class="f"><span class="lab">الرضاعة الآن</span>' + fSeg('feed', [{ id: 'breast', label: 'طبيعية' }, { id: 'mixed', label: 'مختلطة' }, { id: 'formula', label: 'صناعية' }]) + '</div>' +
    fIn('due', 'الموعد المتوقع للولادة (اختياري، للمولود قبل موعده)', 'date') +
    '<p class="xs mute">إن وُلد قبل موعده بأكثر من أسبوع يحسب الدفتر عمره المصحَّح للتطور والنمو، أما التطعيمات فمن تاريخ الولادة الفعلي.</p>' + errHtml(st);
}
function profCheck(st) {
  const b = st.birth ? keyMs(st.birth) : NaN;
  if (!st.birth || isNaN(b)) return 'اختاروا تاريخ الولادة.';
  if (b > Date.now()) return 'تاريخ الولادة في المستقبل. راجعوه.';
  if (Date.now() - b > 5 * 365 * DAY) return 'الدفتر مصمم للسنوات الأولى. راجعوا تاريخ الولادة.';
  return '';
}
ACTS['prof-save'] = () => {
  const st = UI.sheet.st, err = profCheck(st);
  if (err) { st._err = err; renderSheet(); return; }
  S.profile = Object.assign({}, S.profile, { name: String(st.name || '').trim(), sex: st.sex, birth: st.birth, due: st.due || '', feed: st.feed, u: Date.now() });
  save(); closeSheet(); render(); toast('حُفظت البيانات');
};

/* ------------------------------------------------------------------ about */
MV.about = function () {
  return '<section class="card"><h3>دفتر الرضيع</h3><p class="sm">رفيق «دليل تنمية الرضيع» المطبوع: تسجيل في ثوانٍ، ولوحة تتابعون منها اليوم والأسبوع والشهر. الإصدار ' + APP_VER + '.</p></section>' +
    '<section class="card soft"><h3>الخصوصية</h3><p class="sm">كل البيانات على أجهزتكم فقط. لا حسابات ولا خوادم ولا إعلانات. النقل بين الأجهزة يتم بملف أو كود ترسلونه أنتم.</p></section>' +
    '<section class="card soft"><h3>المصادر</h3><ul class="sm" style="padding-inline-start:18px;margin:4px 0 0"><li>معايير نمو الطفل، منظمة الصحة العالمية (2006).</li><li>علامات التطور «تعلّم العلامات، تصرّف مبكرًا»، مراكز مكافحة الأمراض الأمريكية (2022).</li><li>جدول التطعيمات، وزارة الصحة والسكان المصرية (كما نُشر في 2026).</li><li>توصيات النوم الآمن والرضاعة، الأكاديمية الأمريكية لطب الأطفال، وNHS، وLullaby Trust.</li></ul></section>' +
    '<section class="card warn"><h3>تنبيه</h3><p class="sm">الدفتر للمتابعة والتنظيم، وليس تشخيصًا ولا بديلًا عن الطبيب. عند القلق أو ظهور علامات خطر اتصلوا بطبيب الأطفال. الإسعاف في مصر 123.</p></section>';
};

/* ------------------------------------------------------------------ first run */
function viewOnboard() {
  const st = UI.onb || (UI.onb = { name: '', sex: 'm', birth: '2026-08-27', due: '', feed: 'mixed' });
  const field = (k, label, type, attrs = '') => '<div class="f"><label for="o-' + k + '">' + label + '</label><input class="in" id="o-' + k + '" data-ok="' + k + '" type="' + type + '" value="' + esc(st[k] || '') + '" ' + attrs + '></div>';
  const seg = (k, opts) => '<div class="seg">' + opts.map(([v, l]) => '<button type="button" data-act="onb-set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (st[k] === v) + '">' + l + '</button>').join('') + '</div>';
  return '<div class="onb"><div class="brand"><div class="logo">' + ic('i-bottle') + '</div><div><h1>دفتر الرضيع</h1><p class="mute sm">رفيق الدليل المطبوع</p></div></div>' +
    '<div class="strip" aria-hidden="true"><i style="background:var(--feed)"></i><i style="background:var(--play)"></i><i style="background:var(--diaper)"></i><i style="background:var(--health)"></i><i style="background:var(--mind)"></i><i style="background:var(--faith)"></i><i style="background:var(--money)"></i><i style="background:var(--sleep)"></i></div>' +
    '<p class="lead">سجّلوا الرضاعة والنوم والحفاضات بلمسة، حتى في الثالثة فجرًا، وتابعوا كل شيء باليوم والأسبوع والشهر.</p>' +
    '<section class="card"><div class="sec">' + field('name', 'اسم الطفل', 'text', 'autocomplete="off" placeholder="الاسم"') +
    seg('sex', [['m', 'ولد'], ['f', 'بنت']]) +
    field('birth', 'تاريخ الولادة', 'date') +
    (st._due ? field('due', 'الموعد المتوقع للولادة', 'date') : '<button class="link" data-act="onb-set" data-k="_due" data-v="1">وُلد قبل موعده؟</button>') +
    (UI.onbErr ? '<p class="hint warn">' + esc(UI.onbErr) + '</p>' : '') +
    '<button class="btn pri block" data-act="onb-go">' + ic('check') + 'ابدأ</button></div></section>' +
    (cloudSupported() ? '<section class="card sleep"><h3>الدفتر بدأ على موبايل آخر؟</h3><p class="sm">سجّلوا الدخول واكتبوا كود العائلة، فتظهر كل البيانات هنا.</p><div class="btns" style="margin-top:8px"><button class="btn pri" data-act="open-auth">' + ic('cloud-arrow-up') + 'تسجيل الدخول</button></div></section>' : '') +
    (UI.onbImp ? '<section class="card soft"><h3>استيراد نسخة</h3><div class="btns" style="margin-top:8px"><label class="btn filebtn">' + ic('file-arrow-up') + 'اختيار ملف النسخة<input type="file" accept=".json,.txt,application/json,text/plain" data-file="import" aria-label="اختيار ملف النسخة"></label></div>' +
      '<div class="f" style="margin-top:8px"><textarea class="in code" id="code-in" rows="2" placeholder="أو الصقوا الكود هنا"></textarea></div><div class="btns" style="margin-top:8px"><button class="btn" data-act="imp-code">قراءة الكود</button></div></section>'
      : '<button class="link" data-act="onb-set" data-k="_imp" data-v="1" style="align-self:center">عندي ملف نسخة احتياطية</button>') +
    '<button class="btn ghost block" data-act="demo">' + ic('sparkle') + 'جرّبوه أولًا ببيانات تجريبية</button></div>';
}
document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.ok; if (k && UI.onb) UI.onb[k] = e.target.value; });
ACTS['onb-set'] = (el) => { if (el.dataset.k === '_imp') UI.onbImp = true; else UI.onb[el.dataset.k] = el.dataset.v; render(); };
ACTS['onb-go'] = () => {
  const st = UI.onb, err = profCheck(st);
  if (err) { UI.onbErr = err; render(); return; }
  UI.onbErr = '';
  S.profile = { name: String(st.name || '').trim(), sex: st.sex, birth: st.birth, due: st.due || '', feed: st.feed, u: Date.now() };
  save(true); UI.tab = 'home'; render(); toast('أهلًا بكم. ابدؤوا بتسجيل آخر رضعة.');
};

/* ------------------------------------------------------------------ sample data */
ACTS.demo = () => { DEMO = true; S = demoState(); UI.tab = 'home'; render(); window.scrollTo(0, 0); };
ACTS['demo-end'] = async () => {
  DEMO = false; S = normalize(null); S._device = DEVICE;
  UI.tab = 'home'; UI.more = null; render();
};
function demoState() {
  const st = normalize(null); st._device = DEVICE;
  const t = Date.now(), birth = addDays(sod(t), -45);
  st.profile = { name: 'يوسف', sex: 'm', birth: dayKey(birth), due: '', feed: 'mixed', u: t };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const E = []; const add = (type, s, e, d) => E.push({ id: uid() + E.length, t: type, s, e: e || null, d, n: '', u: t, by: DEVICE });
  const locs = ['chest', 'crib', 'side', 'arms', 'bed', 'nest', 'pram'];
  const lw = [0.3, 0.22, 0.18, 0.12, 0.1, 0.05, 0.03];
  const pickLoc = () => { let r = rnd(), a = 0; for (let i = 0; i < locs.length; i++) { a += lw[i]; if (r <= a) return locs[i]; } return 'crib'; };
  let cur = addDays(sod(t), -13) + 6 * HOUR, side = 'L';
  while (cur < t - 40 * MIN) {
    const h = new Date(cur).getHours();
    if (rnd() < 0.18 && h >= 9 && h <= 22) add('bottle', cur, null, { ml: [60, 70, 80, 90][Math.floor(rnd() * 4)], kind: rnd() < 0.5 ? 'bm' : 'f' });
    else {
      const a = (6 + rnd() * 10) * MIN, b = rnd() < 0.7 ? (4 + rnd() * 9) * MIN : 0;
      const segs = [{ side, s: cur, e: cur + a }]; if (b) segs.push({ side: side === 'L' ? 'R' : 'L', s: cur + a, e: cur + a + b });
      add('breast', cur, cur + a + b, { segs, last: segs[segs.length - 1].side }); side = segs[segs.length - 1].side === 'L' ? 'R' : 'L';
    }
    if (rnd() < 0.85) add('diaper', cur + 20 * MIN, null, { wet: true, dirty: rnd() < 0.3, color: rnd() < 0.3 ? 'yellow' : '' });
    const night = h >= 21 || h < 6, evening = h >= 18 && h < 22;
    const sl = night ? (100 + rnd() * 120) * MIN : (25 + rnd() * 70) * MIN;
    const ss = cur + (night ? 30 : 55 + rnd() * 30) * MIN;
    if (ss + sl < t - 10 * MIN) add('sleep', ss, ss + sl, { loc: night ? (rnd() < 0.5 ? 'side' : rnd() < 0.6 ? 'chest' : 'bed') : pickLoc(), how: rnd() < 0.55 ? 'feed' : rnd() < 0.7 ? 'held' : 'self' });
    if (!night && rnd() < 0.45 && ss > cur + 30 * MIN) add('tummy', cur + 25 * MIN, cur + 25 * MIN + (2 + rnd() * 4) * MIN, { pos: rnd() < 0.6 ? 'chest' : 'floor' });
    cur = (ss + sl < t ? ss + sl : cur + 150 * MIN) + (evening ? 10 : 15 + rnd() * 25) * MIN;
  }
  for (let d = 13; d >= 0; d--) { const day = addDays(sod(t), -d); if (day + 10 * HOUR < t) add('med', day + 10 * HOUR, null, { name: 'فيتامين د', dose: 'نقطة' }); if (d % 3 === 0 && day + 19 * HOUR < t) add('bath', day + 19 * HOUR, null, {}); }
  add('mood', addDays(sod(t), -2) + 14 * HOUR, null, { who: 'm', v: 2, slept: 4 });
  add('mood', addDays(sod(t), -1) + 22 * HOUR, null, { who: 'f', v: 3, slept: 5.5 });
  add('exp', addDays(sod(t), -3) + 13 * HOUR, null, { amt: 450, cat: 'حفاضات ومناديل' });
  add('exp', addDays(sod(t), -6) + 18 * HOUR, null, { amt: 300, cat: 'كشف طبيب' });
  st.events = E;
  st.growth = [
    { id: 'g1', date: dayKey(birth), w: 3.3, l: 50, h: 34.5, u: t },
    { id: 'g2', date: dayKey(addDays(birth, 14)), w: 3.65, l: 52, h: 36, u: t },
    { id: 'g3', date: dayKey(addDays(birth, 30)), w: 4.3, l: 54.5, h: 37.4, u: t },
    { id: 'g4', date: dayKey(addDays(birth, 44)), w: 4.85, l: 56.5, h: 38.3, u: t },
  ];
  st.vax = { hepb0: { date: dayKey(birth), u: t }, opv0: { date: dayKey(birth), u: t }, bcg: { date: dayKey(addDays(birth, 3)), u: t } };
  st.ms = { '2:1': { date: dayKey(addDays(sod(t), -5)), u: t }, '2:0': { date: dayKey(addDays(sod(t), -9)), u: t }, '2:4': { date: dayKey(addDays(sod(t), -3)), u: t } };
  st.qs = [{ id: 'q1', text: 'هل الزيادة في الوزن مناسبة؟', done: 0, u: t }, { id: 'q2', text: 'متى نبدأ اللهّاية؟', done: 0, u: t }];
  st.journal = [{ id: 'j1', date: dayKey(addDays(sod(t), -4)), title: 'أول ابتسامة', text: 'ابتسم لأبيه بعد الحمّام.', photo: '', u: t }];
  st.timers = { sleep: { s: t - 38 * MIN, loc: 'chest', how: 'feed' } };
  return st;
}

/* ------------------------------------------------------------------ account and sync */
MV.cloud = function () { return cloudPanel(false); };
SHEETS.auth = () => ({ title: 'الحساب والمزامنة', icon: 'cloud-arrow-up', bg: 'bg-sleep', body: cloudPanel(true) });
ACTS['open-auth'] = () => { openSheet({ kind: 'auth' }); cloudInit(true); };
function cloudPanel(inSheet) {
  if (!cloudSupported()) {
    return '<section class="card soft"><h3>' + ic('cloud-arrow-up') + ' الحفظ في الحساب</h3><p class="sm">تسجيل الدخول والمزامنة بين موبايل الأم والأب متاحان في نسخة الدفتر على رابطكم الخاص. في هذه النسخة احفظوا نسخة احتياطية وانقلوها بالملف أو الكود.</p>' +
      '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="go-backup">النسخ الاحتياطي والنقل</button></div></section>';
  }
  const st = SYNC.state, U = SYNC.user;
  let h = '';
  if (st === 'loading') h += '<section class="card soft"><p class="sm">' + ic('hourglass') + ' جارٍ التحميل…</p></section>';
  if (st === 'off' || st === 'out' || st === 'loading' && !U) {
    const f = UI.authForm || (UI.authForm = { email: '', pass: '', mode: 'in' });
    h += '<section class="card"><h3>' + ic('cloud-arrow-up') + ' احفظوا الدفتر في حسابكم</h3><p class="sm">حين تسجّلون الدخول يُحفظ كل شيء في حسابكم، ويظهر على موبايل الأم والأب معًا ويتحدّث تلقائيًا. والدفتر يظل يعمل بلا إنترنت.</p>' +
      '<div class="btns" style="margin-top:10px"><button class="btn block" data-act="auth-google">' + ic('google-logo') + 'الدخول بحساب جوجل</button></div>' +
      '<p class="xs mute" style="margin:10px 0 6px;text-align:center">أو بالبريد الإلكتروني</p>' +
      '<div class="f"><label for="au-email">البريد الإلكتروني</label><input class="in" id="au-email" type="email" autocomplete="email" dir="ltr" value="' + esc(f.email) + '"></div>' +
      '<div class="f" style="margin-top:8px"><label for="au-pass">كلمة المرور</label><input class="in" id="au-pass" type="password" autocomplete="' + (f.mode === 'new' ? 'new-password' : 'current-password') + '" dir="ltr" value="' + esc(f.pass) + '"></div>' +
      (SYNC.err ? '<p class="hint warn" style="margin-top:8px">' + esc(SYNC.err) + '</p>' : '') +
      '<div class="btns" style="margin-top:10px"><button class="btn pri" data-act="auth-email" data-v="in">دخول</button><button class="btn" data-act="auth-email" data-v="new">حساب جديد</button></div>' +
      '<button class="link" data-act="auth-reset">نسيت كلمة المرور</button></section>';
  } else if (st === 'join') {
    h += '<section class="card"><h3>' + ic('users-three') + ' أهلًا ' + esc(U && (U.name || U.email) || '') + '</h3><p class="sm">خطوة أخيرة: هل هذا أول موبايل للدفتر، أم تنضمون لدفتر بدأه الطرف الآخر؟</p>' +
      '<div class="f" style="margin-top:10px"><label for="join-code">عندكم كود من الموبايل الآخر؟</label><input class="in" id="join-code" dir="ltr" autocomplete="off" placeholder="مثال: K7MP3Q" style="text-transform:uppercase;letter-spacing:3px;font:700 20px/1.2 var(--font-d);text-align:center"></div>' +
      '<div class="btns" style="margin-top:8px"><button class="btn pri" data-act="fam-join">' + ic('users-three') + 'انضمام بالكود</button></div>' +
      (S.profile ? '<p class="xs mute" style="margin:12px 0 6px;text-align:center">أو</p><div class="btns"><button class="btn" data-act="fam-create">' + ic('plus') + 'هذا أول موبايل: ابدأ دفتر العائلة</button></div>' : '') +
      (SYNC.err ? '<p class="hint warn" style="margin-top:8px">' + esc(SYNC.err) + '</p>' : '') +
      '<button class="link" data-act="auth-out">تسجيل الخروج</button></section>';
  } else if (st === 'ok') {
    const when = SYNC.lastSync ? ago(SYNC.lastSync) : 'لم تتم بعد';
    h += '<section class="card health"><h3>' + ic('cloud-check') + ' الدفتر محفوظ في الحساب</h3><p class="sm">' + esc(U ? (U.email || U.name) : '') + '. آخر مزامنة: <span data-ago="' + (SYNC.lastSync || 0) + '">' + when + '</span>.</p>' +
      (SYNC.err ? '<p class="hint warn" style="margin-top:8px">' + esc(SYNC.err) + '</p>' : '') +
      '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="sync-now">' + ic('arrows-clockwise') + 'مزامنة الآن</button></div></section>' +
      '<section class="card"><h3>كود العائلة</h3><p class="sm">على الموبايل الآخر: افتحوا الدفتر، وسجّلوا الدخول بحساب آخر، ثم اكتبوا هذا الكود.</p>' +
      '<p class="famcode" dir="ltr">' + esc(SYNC.code) + '</p>' +
      '<div class="btns"><button class="btn sm" data-act="code-copy">' + ic('copy') + 'نسخ الكود</button>' +
      '<a class="btn sm" href="https://wa.me/?text=' + encodeURIComponent('كود دفتر الرضيع: ' + SYNC.code + '\n' + location.href.split('#')[0]) + '" target="_blank" rel="noopener">' + ic('whatsapp-logo') + 'إرسال على واتساب</a></div>' +
      '<p class="xs mute" style="margin-top:8px">من معه الكود وحساب يمكنه رؤية الدفتر، فلا تشاركوه إلا مع الأسرة.</p>' +
      (SYNC.members.length ? '<p class="sm" style="margin-top:8px"><b>على الدفتر الآن:</b> ' + SYNC.members.map((m) => esc(m.name || m.email || 'عضو')).join('، ') + '</p>' : '') + '</section>' +
      '<section class="card soft"><button class="link" data-act="auth-out">تسجيل الخروج من هذا الموبايل</button><p class="xs mute">البيانات تبقى على الموبايل، وتعود المزامنة حين تسجّلون الدخول مرة أخرى.</p></section>';
    if (!SYNC.members.length && !SYNC._mLoading) { SYNC._mLoading = true; loadMembers().then(() => { SYNC._mLoading = false; if (SYNC.members.length) softRender(); }); }
  } else if (st === 'error') {
    h += '<section class="card warn"><h3>' + ic('warning') + ' تعذّرت المزامنة</h3><p class="sm">' + esc(SYNC.err) + '</p><div class="btns" style="margin-top:8px"><button class="btn sm" data-act="cloud-retry">حاولوا مرة أخرى</button><button class="btn sm ghost" data-act="auth-out">تسجيل الخروج</button></div></section>';
  }
  if (!inSheet) h += '<section class="card soft"><p class="sm">لنقل البيانات يدويًا أو حفظ نسخة على الموبايل: <button class="link" data-act="go-backup">النسخ الاحتياطي والنقل</button></p></section>';
  return h;
}
function authFields() {
  const f = UI.authForm || (UI.authForm = { email: '', pass: '', mode: 'in' });
  const e = document.getElementById('au-email'), p = document.getElementById('au-pass');
  if (e) f.email = e.value; if (p) f.pass = p.value;
  return f;
}
async function cloudAction(fn) {
  SYNC.err = ''; SYNC.busyUI = true;
  try { await fn(); } catch (e) { SYNC.err = e && e.code && String(e.code).startsWith('auth/') ? authMsg(e) : fsMsg(e); }
  SYNC.busyUI = false;
  if (SYNC.user && UI.authForm) UI.authForm.pass = '';
  if (UI.sheet && UI.sheet.kind === 'auth') { if (SYNC.state === 'ok' && S.profile) { closeSheet(); render(); } else renderSheet(); } else render();
}
ACTS['auth-google'] = () => cloudAction(signGoogle);
ACTS['auth-email'] = (el) => {
  const f = authFields(); f.mode = el.dataset.v;
  if (!/^\S+@\S+\.\S+$/.test(f.email)) { SYNC.err = 'اكتبوا البريد الإلكتروني كاملًا.'; UI.sheet ? renderSheet() : render(); return; }
  if (String(f.pass).length < 6) { SYNC.err = 'كلمة المرور 6 أحرف على الأقل.'; UI.sheet ? renderSheet() : render(); return; }
  cloudAction(() => signEmail(f.email, f.pass, f.mode === 'new'));
};
ACTS['auth-reset'] = () => {
  const f = authFields();
  if (!/^\S+@\S+\.\S+$/.test(f.email)) { SYNC.err = 'اكتبوا بريدكم أولًا ثم اضغطوا «نسيت كلمة المرور».'; UI.sheet ? renderSheet() : render(); return; }
  cloudAction(async () => { await resetPass(f.email); toast('أرسلنا رابط تغيير كلمة المرور إلى بريدكم.'); });
};
ACTS['auth-out'] = () => cloudAction(signOutCloud);
ACTS['fam-create'] = () => cloudAction(createFamily);
ACTS['fam-join'] = () => { const v = (document.getElementById('join-code') || {}).value || ''; cloudAction(() => joinFamily(v)); };
ACTS['sync-now'] = () => cloudAction(syncNow);
ACTS['cloud-retry'] = () => cloudAction(async () => { SYNC.state = 'out'; await cloudInit(true); });
ACTS['code-copy'] = async () => { const ok = await copyText(SYNC.code); toast(ok ? 'نُسخ الكود' : 'الكود: ' + SYNC.code); };
