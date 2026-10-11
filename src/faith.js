/* ---------------------------------------------------------------------------
   Faith and upbringing: the adhkar to read at night, du'a for children, what
   to plant at his age, the newborn sunan, and the coming Hijri occasions.
   Quran text is verbatim from the Tanzil edition; each hadith names its source.
--------------------------------------------------------------------------- */

const QURAN = {"kursi": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ", "ikhlas": ["قُلْ هُوَ اللَّهُ أَحَدٌ", "اللَّهُ الصَّمَدُ", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ"], "falaq": ["قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", "مِن شَرِّ مَا خَلَقَ", "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ"], "nas": ["قُلْ أَعُوذُ بِرَبِّ النَّاسِ", "مَلِكِ النَّاسِ", "إِلَٰهِ النَّاسِ", "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", "مِنَ الْجِنَّةِ وَالنَّاسِ"]};
const BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const TAWIDH = 'أُعيذك بكلمات الله التامّة، من كل شيطان وهامّة، ومن كل عين لامّة';

const DUAS_Q = [["رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً إِنَّكَ سَمِيعُ الدُّعَاءِ", "آل عمران: 38", "دعاء زكريا عليه السلام"], ["رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا", "الفرقان: 74", "من دعاء عباد الرحمن"], ["رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ", "إبراهيم: 40", "دعاء إبراهيم عليه السلام"], ["وَأَصْلِحْ لِي فِي ذُرِّيَّتِي إِنِّي تُبْتُ إِلَيْكَ وَإِنِّي مِنَ الْمُسْلِمِينَ", "الأحقاف: 15", ""], ["رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ", "الصافات: 100", "دعاء إبراهيم عليه السلام"], ["رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِن ذُرِّيَّتِنَا أُمَّةً مُّسْلِمَةً لَّكَ", "البقرة: 128", "دعاء إبراهيم وإسماعيل عليهما السلام"], ["وَاجْنُبْنِي وَبَنِيَّ أَن نَّعْبُدَ الْأَصْنَامَ", "إبراهيم: 35", ""], ["وَإِنِّي أُعِيذُهَا بِكَ وَذُرِّيَّتَهَا مِنَ الشَّيْطَانِ الرَّجِيمِ", "آل عمران: 36", "دعاء امرأة عمران لمولودتها"]];
const DUAS_S = [
  ['اللهم إني أحبه فأحبه، وأحبب من يحبه', 'دعا به النبي ﷺ للحسن (رواه مسلم)'],
  ['اللهم أكثر ماله وولده، وبارك له فيما أعطيته', 'دعا به لأنس (متفق عليه)'],
  ['اللهم فقّهه في الدين', 'دعا به لابن عباس (رواه البخاري)'],
];

/* [icon, when, words, source or note] */
const ADHKAR_DAY = [
  ['sun-horizon', 'حين يستيقظ', 'الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور', 'رواه البخاري'],
  ['hands-praying', 'صباحًا ومساءً، ثلاثًا', 'بسم الله الذي لا يضرّ مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم', 'رواه أبو داود والترمذي'],
  ['drop', 'الرضعة والطعام', '«بسم الله» في أولها، و«الحمد لله» في آخرها', ''],
  ['speaker-high', 'بعد الأذان', 'اللهم ربّ هذه الدعوة التامة، والصلاة القائمة، آتِ محمدًا الوسيلة والفضيلة، وابعثه مقامًا محمودًا الذي وعدته', 'رواه البخاري'],
  ['door-open', 'الخروج من البيت', 'بسم الله، توكلت على الله، ولا حول ولا قوة إلا بالله', 'رواه أبو داود والترمذي'],
  ['sparkle', 'حين يُعجبكما', 'ما شاء الله، لا قوة إلا بالله', 'والدعاء له بالبركة'],
  ['moon', 'عند المغرب', 'أدخلاه البيت، وأغلقا الأبواب مع ذكر اسم الله', '«فكُفّوا صبيانكم» (متفق عليه)'],
  ['moon-stars', 'رضعة الثلث الأخير', 'أشرف أوقات الدعاء: ادعيا له', '«من يدعوني فأستجيب له» (متفق عليه)'],
  ['first-aid-kit', 'حين يمرض', 'اللهم ربّ الناس، أذهب البأس، اشفِ أنت الشافي، لا شفاء إلا شفاؤك، شفاءً لا يغادر سقمًا', 'متفق عليه، والطبيب معها لا بدلًا منها'],
];

/* what to plant at each age; `to` is the first month of the next stage */
const FAITH_STAGES = [
  { to: 3, title: 'حتى 3 أشهر', can: 'يميّز صوتيكما ويهدأ بهما، ويتابع الوجوه، ويبدأ الابتسام.',
    items: ['القرآن بصوتكما وهو في حضنكما.', 'التعويذ عند كل نوم.', '«بسم الله» بصوت مسموع عند الرضعة والتغيير والحمّام.', 'ردّدا الأذان وهو في حضنكما.'] },
  { to: 6, title: 'من 3 إلى 6 أشهر', can: 'يضحك ويناغي، ويحب الإيقاع والتكرار.',
    items: ['تسبيح بإيقاع لطيف أثناء التدليك واللعب.', '«سبحان الله!» حين ينظر إلى ضوء أو شجرة أو مطر.', 'ابتسامتكما مع «بسم الله» حتى ترتبط بالفرح.'] },
  { to: 9, title: 'من 6 إلى 9 أشهر', can: 'يجلس، ويبدأ الطعام، ويقلق من الغرباء، ويفهم نبرة الصوت.',
    items: ['«بسم الله» قبل أول لقمة، و«الحمد لله» بعد آخرها.', 'إطعامه باليمين ما أمكن.', 'صلة الرحم بلطف، بلا إجبار على الحمل.', '«ما شاء الله» حين يفرحكما بمهارة جديدة.'] },
  { to: 12, title: 'من 9 إلى 12 شهرًا', can: 'يقلّد الحركات، ويلوّح ويصفّق ويشير، وقد ينطق كلمة أو اثنتين.',
    items: ['رفع اليدين مع «يا رب» حين تدعوان أمامه.', 'التلويح مع «السلام عليكم».', 'يجلس آمنًا قربكما في الصلاة، وقد يقلّد السجود.', 'لتكن «الله» من أكثر الكلمات التي يسمعها.'] },
  { to: 24, title: 'من سنة إلى سنتين', can: 'يقلّد ما يرى، وتزيد كلماته شهرًا بعد شهر.',
    items: ['يربط النعم بالله: «هذا من الله».', 'يقلّد الركوع والسجود بجانبكما، فلا تنهراه إن مرّ أمامكما.', '«بسم الله» والأكل باليمين، والسلام مع التلويح.'] },
  { to: 36, title: 'من 2 إلى 3 سنوات', can: 'يتكلم بجمل قصيرة، ويحب القصص والتكرار.',
    items: ['الله يحبه ويرزقه ويراه، بكلمات قليلة دافئة.', 'كلمات من الفاتحة وقصار السور سماعًا.', 'قصة قصيرة كل ليلة، وآداب الطعام والنوم.'] },
  { to: 72, title: 'من 3 إلى 6 سنوات', can: 'يسأل كثيرًا ويحفظ بسهولة.',
    items: ['حفظ الفاتحة وقصار السور وأذكار اليوم.', 'قصص الأنبياء وسيرة النبي ﷺ.', 'الصدق والأمانة والصدقة بيده، والإجابة عن أسئلته بلا تخويف.'] },
  { to: 84, title: 'من 6 إلى 7 سنوات', can: 'يستطيع تعلّم الوضوء والصلاة.',
    items: ['تعليم الصلاة وتحبيبها، والصلاة معه.', 'صيام ساعات تدريبًا.', 'الحياء وحفظ اللسان وصلة الرحم.'] },
  { to: 9999, title: 'من السابعة', can: '«مروا أولادكم بالصلاة وهم أبناء سبع سنين» (رواه أبو داود).',
    items: ['أمر بالصلاة برفق ومتابعة يومية وتشجيع.', 'حفظ ما تيسّر من القرآن.', 'مسؤوليات صغيرة، والوفاء بالوعد.'] },
];

const SUNAN = [
  { id: 'tahnik', label: 'التحنيك', note: 'قليل من التمر الليّن على حنكه مع الدعاء بالبركة (متفق عليه).' },
  { id: 'name', label: 'التسمية باسم حسن', note: '«أحب أسمائكم إلى الله عبد الله وعبد الرحمن» (رواه مسلم).' },
  { id: 'aqiqa', label: 'العقيقة', note: 'يوم السابع، وتجوز بعده في أي يوم، ومع الأضحية في ذبيحة واحدة كما أفتت دار الإفتاء المصرية.' },
  { id: 'hair', label: 'حلق الشعر والتصدّق بوزنه فضة', note: 'بمقص أو ماكينة لا الموس، فجلده رقيق.' },
  { id: 'khitan', label: 'الختان', note: 'عند طبيب، وبعد فحص يتأكد من عدم وجود مانع.' },
];

/* Hijri month and day; `show` is how many days before to mention it on the home screen */
const HIJRI_EVENTS = [
  { m: 9, d: 1, title: 'رمضان', show: 7,
    note: 'للأم المرضع رخصة الفطر إن خافت على نفسها أو على رضيعها، وعليها القضاء. وإن صامت فلتراقب الحفاضات المبللة: 6 أو أكثر في اليوم.' },
  { m: 9, d: 21, title: 'العشر الأواخر', show: 1, note: '«اللهم إنك عفو تحب العفو فاعفُ عني» (رواه الترمذي).' },
  { m: 10, d: 1, title: 'عيد الفطر', show: 5, note: 'زكاة الفطر عنه قبل صلاة العيد. وجنّباه الزحام والألعاب النارية.' },
  { m: 12, d: 1, title: 'العشر من ذي الحجة', show: 3, note: 'من نوى الأضحية أمسك عن شعره وأظفاره (رواه مسلم)، وأكثِرا من الذكر والتكبير.' },
  { m: 12, d: 9, title: 'يوم عرفة', show: 2, note: 'صيامه «يكفّر السنة التي قبله والسنة التي بعده» (رواه مسلم)، ولا حرج على المرضع إن شقّ عليها.' },
  { m: 12, d: 10, title: 'عيد الأضحى', show: 3, note: 'الشاة الواحدة تجزئ عنكم جميعًا، والعقيقة معها إن لم تُذبح.' },
  { m: 1, d: 1, title: 'رأس السنة الهجرية', show: 1, note: 'وقت لمراجعة عاداتكما الإيمانية في البيت.' },
  { m: 1, d: 10, title: 'عاشوراء', show: 2, note: 'صيامه «يكفّر السنة التي قبله» (رواه مسلم)، ومعه التاسع.' },
];

/* ------------------------------------------------------------------ Hijri dates (Umm al-Qura, by the browser) */
let _hFmt;
function hijriOf(ms) {
  try {
    if (_hFmt === undefined) {
      const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
      _hFmt = /islamic/.test(f.resolvedOptions().calendar) ? f : null;
    }
    if (!_hFmt) return null;
    const p = {};
    for (const x of _hFmt.formatToParts(new Date(ms))) p[x.type] = x.value;
    const y = parseInt(p.year, 10), m = parseInt(p.month, 10), d = parseInt(p.day, 10);
    return y && m && d ? { y, m, d } : null;
  } catch (e) { return null; }
}
function hijriLabel(ms) { try { return HIJ ? HIJ.format(new Date(ms)) : ''; } catch (e) { return ''; } }
let _occ = { day: '', list: [] };
function nextOccasions(n = 3) {
  const k = today();
  if (_occ.day === k && _occ.list.length >= n) return _occ.list.slice(0, n);
  const out = [], start = sod(Date.now());
  for (let i = 0; i < 400 && out.length < n; i++) {
    const t = addDays(start, i), h = hijriOf(t + 12 * HOUR);
    if (!h) return [];
    for (const ev of HIJRI_EVENTS) if (ev.m === h.m && ev.d === h.d) out.push({ ev, t, days: i, h });
  }
  _occ = { day: k, list: out };
  return out;
}
function whenLabel(days) {
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غدًا';
  return 'بعد ' + pl(days, U.day);
}
function ageAtLabel(t) {
  const a = ageInfo(S.profile, t);
  if (!a || a.days < 0) return '';
  if (a.days < 92) return 'وعمره ' + pl(a.weeks, U.week);
  return 'وعمره ' + pl(a.months, U.month);
}
function faithStage(months) { return FAITH_STAGES.find((s) => months < s.to) || FAITH_STAGES[FAITH_STAGES.length - 1]; }

/* ------------------------------------------------------------------ home: a short line when an occasion is near */
function faithHomeHtml() {
  if (DEMO || !S.settings.adhkar) return '';
  const h = hijriOf(Date.now() + 0);
  if (h && h.m === 9) {
    const k = today(), wet = eventsIn(keyMs(k), addDays(keyMs(k), 1), ['diaper']).filter((e) => e.s >= keyMs(k) && e.d && e.d.wet).length;
    return '<section class="card faith"><div class="h2" style="margin-bottom:4px">رمضان، اليوم ' + h.d +
      '<button class="more" data-act="go-more" data-v="faith">الإيمان</button></div>' +
      '<p class="sm">حفاضات مبللة اليوم: <b>' + wet + '</b>. ستّ أو أكثر علامة على أن اللبن يكفيه؛ وإن قلّت والأم صائمة فالفطر أولى.</p></section>';
  }
  const o = nextOccasions(1)[0];
  if (!o || o.days > o.ev.show) return '';
  return '<section class="card faith"><div class="h2" style="margin-bottom:4px">' + esc(o.ev.title) + ' ' + whenLabel(o.days) +
    '<button class="more" data-act="go-more" data-v="faith">الإيمان</button></div><p class="sm">' + esc(o.ev.note) + '</p></section>';
}

/* ------------------------------------------------------------------ the screen */
const ayahNo = (n) => ' <span class="an">﴿' + String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) + '﴾</span> ';
const surahHtml = (name, verses) => '<h4>' + name + '</h4><p class="qt">' + BASMALA + '</p><p class="qt">' +
  verses.map((v, i) => v + ayahNo(i + 1)).join('') + '</p>';

MV.faith = function () {
  const a = ageInfo(S.profile);
  const st = faithStage(a ? Math.max(0, Math.floor(Math.max(0, a.cdays) / 30.4375)) : 0);
  const next = FAITH_STAGES[FAITH_STAGES.indexOf(st) + 1];
  const occ = nextOccasions(3);
  const hl = hijriLabel(Date.now());
  let h = '';
  h += '<section class="card faith"><h3>' + ic('hands-praying') + ' ما نغرسه الآن <span class="xs mute">(' + esc(st.title) + ')</span></h3>' +
    '<p class="xs mute" style="margin-bottom:6px">' + esc(st.can) + '</p><ul class="dots">' + st.items.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
    (next ? '<p class="xs mute" style="margin-top:6px">التالي (' + esc(next.title) + '): ' + esc(next.items[0]) + '</p>' : '') + '</section>';
  h += '<section class="card"><h3>التعويذ</h3><p class="dk big">«' + TAWIDH + '»</p>' +
    '<p class="xs mute">كان النبي ﷺ يعوّذ بها الحسن والحسين (رواه البخاري). في الصباح والمساء وعند النوم، أو كلما حملتماه.</p></section>';
  h += '<section class="card"><h3>' + ic('moon-stars') + ' أذكار النوم</h3>' +
    '<details class="fold"><summary>آية الكرسي</summary><p class="qt">' + QURAN.kursi + ayahNo(255) + '</p>' +
    '<p class="xs mute">من قرأها عند نومه «لن يزال عليك من الله حافظ» (رواه البخاري).</p></details>' +
    '<details class="fold"><summary>المعوّذات</summary>' + surahHtml('سورة الإخلاص', QURAN.ikhlas) + surahHtml('سورة الفلق', QURAN.falaq) + surahHtml('سورة الناس', QURAN.nas) +
    '<p class="xs mute">ثلاثًا صباحًا ومساءً «تكفيك من كل شيء» (رواه أبو داود والترمذي).</p></details>' +
    '<p class="xs mute" style="margin-top:6px">ولكما عند النوم: «باسمك اللهم أموت وأحيا» (رواه البخاري). والرضيع ينام على ظهره دائمًا.</p></section>';
  h += '<section class="card flat"><h3 style="margin-bottom:2px">أذكار اليوم معه</h3><div class="list">' + ADHKAR_DAY.map(([i, w, t, src]) =>
    '<div class="item" style="align-items:flex-start"><i class="dot bg-faith">' + ic(i) + '</i><span class="grow"><span class="t">' + esc(w) + '</span>' +
    '<span class="dk">' + esc(t) + '</span>' + (src ? '<span class="s">' + esc(src) + '</span>' : '') + '</span></div>').join('') + '</div></section>';
  h += '<section class="card"><h3>أدعية للذرية</h3><details class="fold" open><summary>من القرآن</summary>' +
    DUAS_Q.map(([t, r, who]) => '<p class="qt">﴿' + t + '﴾</p><p class="xs mute" style="margin-bottom:8px">' + esc(r) + (who ? '، ' + esc(who) : '') + '</p>').join('') + '</details>' +
    '<details class="fold"><summary>من دعاء النبي ﷺ للصغار</summary>' +
    DUAS_S.map(([t, n]) => '<p class="dk">«' + esc(t) + '»</p><p class="xs mute" style="margin-bottom:8px">' + esc(n) + '</p>').join('') +
    '<p class="xs mute">ودعوة الوالد لولده من الدعوات المستجابات (رواه ابن ماجه). ولا تدعوا عليه في لحظة غضب (رواه مسلم).</p></details></section>';
  h += '<section class="card"><h3>سنن المولود</h3>' + SUNAN.map((x) => {
    const rec = (S.sunan || {})[x.id], done = !!(rec && rec.date);
    return '<label class="check"><input type="checkbox" data-chg="sunan" data-id="' + x.id + '"' + (done ? ' checked' : '') + '><span class="grow"><b class="sm">' + esc(x.label) + '</b>' +
      (done ? ' <span class="xs mute">(' + fDateS(keyMs(rec.date)) + ')</span>' : '') + '<br><span class="xs mute">' + esc(x.note) + '</span></span></label>';
  }).join('') + '<p class="xs mute" style="margin-top:6px">ما فات منها لا يثقل عليكما.</p></section>';
  if (occ.length) {
    h += '<section class="card flat"><h3 style="margin-bottom:2px">المناسبات القادمة' + (hl ? ' <span class="xs mute">(اليوم ' + esc(hl) + ')</span>' : '') + '</h3><div class="list">' +
      occ.map((o) => '<div class="item" style="align-items:flex-start"><i class="dot bg-faith">' + ic('moon') + '</i><span class="grow"><span class="t">' + esc(o.ev.title) + '</span>' +
        '<span class="s">' + fDateS(o.t) + ' ' + whenLabel(o.days) + ' ' + ageAtLabel(o.t) + '</span><span class="s">' + esc(o.ev.note) + '</span></span></div>').join('') +
      '</div><p class="xs mute" style="margin-top:6px">بتقويم أم القرى، وقد يختلف يومًا بحسب رؤية الهلال.</p></section>';
  }
  h += '<p class="xs mute" style="text-align:center;margin-top:4px">التفاصيل والأدلة في الجزء السادس من الدليل المطبوع.</p>';
  return h;
};
CHG.sunan = (el) => {
  S.sunan = S.sunan || {};
  S.sunan[el.dataset.id] = { date: el.checked ? today() : '', u: Date.now() };
  save(); render();
};
