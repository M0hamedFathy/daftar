/* ---------------------------------------------------------------------------
   Charts: small SVG builders. Time always runs right to left (Arabic reading
   order): the oldest day on the right, now on the left. Colours come from CSS
   classes so both themes work; every mark has a tooltip and a table twin.
--------------------------------------------------------------------------- */

const CH = { W: 340 };

function hLabel(h) { h = ((h % 24) + 24) % 24; return h === 0 ? '12ص' : h < 12 ? h + 'ص' : h === 12 ? '12م' : (h - 12) + 'م'; }
function tipAttr(html) { return ' data-tip="' + esc(html) + '"'; }

/* bar with rounded data end (top) */
function barPath(x, y, w, h, r) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
}

function niceMax(v, steps = 4) {
  if (!(v > 0)) return steps;
  const raw = v / steps, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) * mag;
  return n * steps;
}

/* Stacked bars. cols: [{label, tip, vals: [..per series]}], series: [{cls, label}] */
function chartBars(cols, series, o = {}) {
  const W = CH.W, H = o.h || 168, pr = 34, pl = 6, pt = 10, pb = 26;
  const pw = W - pr - pl, ph = H - pt - pb;
  const tot = cols.map((c) => sum(c.vals.map((v) => v || 0)));
  const max = niceMax(Math.max(o.minMax || 0, ...(o.band ? [o.band[1]] : []), ...tot));
  const y = (v) => pt + ph - (v / max) * ph;
  let s = '';
  // goal band
  if (o.band && o.band[0] !== null) {
    const b0 = Math.min(o.band[0], max), b1 = Math.min(o.band[1] || o.band[0], max);
    s += '<rect class="band" x="' + pl + '" y="' + y(b1) + '" width="' + pw + '" height="' + Math.max(2, y(b0) - y(b1)) + '"/>';
  }
  // grid + y labels (on the right, the start side)
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, yy = y(v);
    s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr + 4) + '" y1="' + yy + '" y2="' + yy + '"/>';
    s += '<text x="' + (W - pr + 8) + '" y="' + (yy + 3.5) + '" text-anchor="start">' + (o.fmtY ? o.fmtY(v) : num(v, 1)) + '</text>';
  }
  const n = cols.length, slot = pw / n, bw = Math.min(24, Math.max(3, slot * 0.62));
  const every = n <= 8 ? 1 : n <= 16 ? 2 : n <= 35 ? 5 : Math.ceil(n / 7);
  cols.forEach((c, i) => {
    const cx = W - pr - slot * (i + 0.5), x = cx - bw / 2;      // i = 0 is the oldest, drawn at the right
    let acc = 0;
    const segs = c.vals.map((v, k) => ({ v: v || 0, k })).filter((g) => g.v > 0);
    segs.forEach((g, j) => {
      const y0 = y(acc + g.v), h = y(acc) - y0;
      const top = j === segs.length - 1;
      s += top ? '<path class="' + series[g.k].cls + '" d="' + barPath(x, y0, bw, h, 4) + '"/>'
               : '<rect class="' + series[g.k].cls + '" x="' + x + '" y="' + y0 + '" width="' + bw + '" height="' + h + '"/>';
      if (!top) s += '<line x1="' + x + '" x2="' + (x + bw) + '" y1="' + y0 + '" y2="' + y0 + '" stroke="var(--surface)" stroke-width="1.5"/>';
      acc += g.v;
    });
    if ((n - 1 - i) % every === 0) s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" direction="rtl">' + esc(c.label) + '</text>';
    s += '<rect class="hit" x="' + (cx - slot / 2) + '" y="' + pt + '" width="' + slot + '" height="' + ph + '"' + tipAttr(c.tip) + '/>';
  });
  s += '<line class="axis" x1="' + pl + '" x2="' + (W - pr + 4) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
  return '<svg class="chart" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">' + s + '</svg>';
}

/* Pattern: one row per day, 24 hours from right (00:00) to left (24:00). rows: [{label, sleeps:[[a,b]], feeds:[t], bottles:[t], day0}] */
function chartPattern(rows) {
  const W = CH.W, pr = 56, pl = 6, top = 18, rh = 14, gap = 7;
  const H = top + rows.length * (rh + gap) + 6, pw = W - pr - pl;
  const X = (frac) => W - pr - frac * pw;
  let s = '';
  // night shading 19:00 to 07:00
  s += '<rect class="band" x="' + X(1) + '" y="' + top + '" width="' + (X(19 / 24) - X(1)) + '" height="' + (H - top - 4) + '"/>';
  s += '<rect class="band" x="' + X(7 / 24) + '" y="' + top + '" width="' + (X(0) - X(7 / 24)) + '" height="' + (H - top - 4) + '"/>';
  for (const h of [0, 6, 12, 18, 24]) {
    s += '<line class="grid" x1="' + X(h / 24) + '" x2="' + X(h / 24) + '" y1="' + (top - 3) + '" y2="' + (H - 4) + '"/>';
    s += '<text x="' + X(h / 24) + '" y="' + (top - 6) + '" text-anchor="middle" direction="rtl">' + hLabel(h) + '</text>';
  }
  rows.forEach((r, i) => {
    const y0 = top + i * (rh + gap) + 2;
    s += '<text x="' + (W - 2) + '" y="' + (y0 + rh - 3) + '" text-anchor="start" direction="rtl">' + esc(r.label) + '</text>';
    for (const [a, b] of r.sleeps) {
      const fa = clamp((a - r.day0) / DAY, 0, 1), fb = clamp((b - r.day0) / DAY, 0, 1);
      if (fb <= fa) continue;
      const x = X(fb), w = Math.max(1.5, X(fa) - X(fb));
      s += '<rect class="f-sleep" x="' + x + '" y="' + y0 + '" width="' + w + '" height="' + rh + '" rx="3"' +
           tipAttr('<b>نوم</b> ' + fTime(a) + ' – ' + fTime(b) + ' (' + dur(b - a) + ')') + '/>';
    }
    for (const t of r.feeds) {
      const f = (t - r.day0) / DAY; if (f < 0 || f > 1) continue;
      s += '<circle class="f-feed" cx="' + X(f) + '" cy="' + (y0 + rh / 2) + '" r="3.6" stroke="var(--surface)" stroke-width="1.5"' + tipAttr('<b>رضاعة</b> ' + fTime(t)) + '/>';
    }
    for (const t of r.bottles) {
      const f = (t - r.day0) / DAY; if (f < 0 || f > 1) continue;
      s += '<circle class="f-bottle" cx="' + X(f) + '" cy="' + (y0 + rh / 2) + '" r="3.6" stroke="var(--surface)" stroke-width="1.5"' + tipAttr('<b>ببرونة</b> ' + fTime(t)) + '/>';
    }
  });
  return '<svg class="chart" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="نمط النوم والرضاعة على مدار اليوم">' + s + '</svg>';
}

/* Last 24 hours as one strip, now at the left end. */
function chart24(t1) {
  const W = CH.W, H = 74, pr = 8, pl = 8, y0 = 18, rh = 22, pw = W - pr - pl;
  const t0 = t1 - DAY;
  const X = (t) => W - pr - ((t - t0) / DAY) * pw;
  let s = '<rect class="band" x="' + pl + '" y="' + y0 + '" width="' + pw + '" height="' + rh + '" rx="6"/>';
  // hour ticks every 3 hours on the clock
  const first = new Date(t0); first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + HOUR; t < t1; t += HOUR) {
    const h = new Date(t).getHours();
    if (h % 3) continue;
    s += '<line class="grid" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + (y0 - 2) + '" y2="' + (y0 + rh + 14) + '"/>';
    s += '<text x="' + X(t) + '" y="' + (y0 - 6) + '" text-anchor="middle" direction="rtl">' + hLabel(h) + '</text>';
  }
  for (const ev of eventsIn(t0, t1, ['sleep'])) {
    const a = Math.max(ev.s, t0), b = Math.min(ev.e || t1, t1);
    if (b <= a) continue;
    s += '<rect class="f-sleep" x="' + X(b) + '" y="' + y0 + '" width="' + Math.max(2, X(a) - X(b)) + '" height="' + rh + '" rx="5"' +
         tipAttr('<b>نوم</b> ' + fTime(ev.s) + ' – ' + (ev.e ? fTime(ev.e) : 'الآن') + ' (' + dur((ev.e || t1) - ev.s) + ')') + '/>';
  }
  const tm = S.timers && S.timers.sleep;
  if (tm && tm.s) {
    const a = Math.max(tm.s, t0);
    s += '<rect class="f-sleep-l" x="' + X(t1) + '" y="' + y0 + '" width="' + Math.max(2, X(a) - X(t1)) + '" height="' + rh + '" rx="5"' + tipAttr('<b>نائم الآن</b> منذ ' + fTime(tm.s)) + '/>';
  }
  for (const ev of eventsIn(t0, t1, ['breast', 'bottle'])) {
    if (ev.s < t0) continue;
    const cls = ev.t === 'bottle' ? 'f-bottle' : 'f-feed';
    s += '<circle class="' + cls + '" cx="' + X(ev.s) + '" cy="' + (y0 + rh / 2) + '" r="5" stroke="var(--surface)" stroke-width="2"' + tipAttr('<b>' + TYPES[ev.t].label + '</b> ' + fTime(ev.s) + ' ' + evDetail(ev)) + '/>';
  }
  for (const ev of eventsIn(t0, t1, ['diaper'])) {
    if (ev.s < t0) continue;
    const cls = ev.d && ev.d.dirty ? 'f-dirty' : 'f-wet';
    s += '<rect class="' + cls + '" x="' + (X(ev.s) - 3.5) + '" y="' + (y0 + rh + 5) + '" width="7" height="7" rx="2"' + tipAttr('<b>حفاض</b> ' + fTime(ev.s) + ' ' + evDetail(ev)) + '/>';
  }
  s += '<line class="now" x1="' + X(t1) + '" x2="' + X(t1) + '" y1="' + (y0 - 4) + '" y2="' + (y0 + rh + 4) + '"/>';
  s += '<text x="' + X(t1) + '" y="' + (H - 4) + '" text-anchor="end" direction="rtl" class="lbl-in">الآن</text>';
  s += '<text x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="start" direction="rtl">قبل 24 ساعة</text>';
  return '<svg class="chart" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="آخر 24 ساعة">' + s + '</svg>';
}

/* WHO percentile curves with the baby's measurements. ind: w|l|h */
const PCT_Z = [[-1.881, '3'], [-1.036, '15'], [0, '50'], [1.036, '85'], [1.881, '97']];
function chartGrowth(ind, sex, pts, maxDays) {
  if (!WHO) return '';
  const tab = WHO[GROWTH_IND[ind].key][sex === 'f' ? '2' : '1'];
  const W = CH.W, H = 220, pr = 34, pl = 26, pt = 12, pb = 26, pw = W - pr - pl, ph = H - pt - pb;
  const d1 = maxDays;
  const curves = PCT_Z.map(([z]) => { const a = []; for (let d = 0; d <= d1; d += Math.max(3, Math.round(d1 / 60))) a.push([d, atZ(z, lmsAt(tab, d))]); a.push([d1, atZ(z, lmsAt(tab, d1))]); return a; });
  let lo = Math.min(...curves[0].map((p) => p[1]), ...pts.map((p) => p.v)), hi = Math.max(...curves[4].map((p) => p[1]), ...pts.map((p) => p.v));
  const span = hi - lo; lo = Math.max(0, lo - span * 0.04); hi = hi + span * 0.04;
  const X = (d) => W - pr - (d / d1) * pw, Y = (v) => pt + ph - ((v - lo) / (hi - lo)) * ph;
  let s = '';
  const step = ind === 'w' ? (hi - lo > 8 ? 2 : 1) : (hi - lo > 30 ? 5 : 2);
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
    s += '<text x="' + (W - pr + 6) + '" y="' + (Y(v) + 3.5) + '" text-anchor="start">' + v + '</text>';
  }
  const months = d1 / 30.4375, mstep = months > 12 ? 3 : months > 6 ? 2 : 1;
  for (let m = 0; m <= months + 0.01; m += mstep) {
    const d = m * 30.4375;
    s += '<line class="grid" x1="' + X(d) + '" x2="' + X(d) + '" y1="' + pt + '" y2="' + (pt + ph) + '"/>';
    s += '<text x="' + X(d) + '" y="' + (H - 8) + '" text-anchor="middle">' + Math.round(m) + '</text>';
  }
  curves.forEach((c, i) => {
    s += '<path class="ln ' + (i === 2 ? 'p50' : 'pb') + '" d="' + c.map((p, j) => (j ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('') + '"/>';
    const last = c[c.length - 1];
    s += '<text x="' + (X(last[0]) - 3) + '" y="' + (Y(last[1]) + 3.5) + '" text-anchor="end">' + PCT_Z[i][1] + '</text>';
  });
  const sp = pts.slice().sort((a, b) => a.d - b.d);
  if (sp.length > 1) s += '<path class="ln me" d="' + sp.map((p, j) => (j ? 'L' : 'M') + X(p.d).toFixed(1) + ',' + Y(p.v).toFixed(1)).join('') + '"/>';
  for (const p of sp) s += '<circle class="pt" cx="' + X(p.d) + '" cy="' + Y(p.v) + '" r="5"' + tipAttr(p.tip) + '/>';
  return '<svg class="chart" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(GROWTH_IND[ind].label) + ' مقارنة بمعايير منظمة الصحة العالمية">' + s + '</svg>';
}

/* tooltip behaviour (one shared element) */
let _tipEl = null;
function showTip(target, x, y) {
  if (!_tipEl) { _tipEl = document.createElement('div'); _tipEl.className = 'tip'; document.body.appendChild(_tipEl); }
  _tipEl.innerHTML = target.getAttribute('data-tip');
  _tipEl.hidden = false;
  const r = _tipEl.getBoundingClientRect();
  let left = x - r.width / 2, top = y - r.height - 14;
  left = clamp(left, 8, window.innerWidth - r.width - 8);
  if (top < 8) top = y + 18;
  _tipEl.style.left = left + 'px'; _tipEl.style.top = top + 'px';
}
function hideTip() { if (_tipEl) _tipEl.hidden = true; }
