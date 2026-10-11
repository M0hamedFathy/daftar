/* ---------------------------------------------------------------------------
   Boot.
--------------------------------------------------------------------------- */
(async function boot() {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
  try { await loadState(); } catch (e) { S = normalize(null); DEVICE = DEVICE || uid(); S._device = DEVICE; }
  _lastDay = today();
  render();
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(true);
    else render();
  });
  window.addEventListener('pagehide', () => save(true));
  cloudInit(false);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  if (BUILD === 'pwa' && 'serviceWorker' in navigator && location.protocol === 'https:') {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) return;                       // first install: nothing to refresh
      if (!UI.sheet) location.reload(); else toast('نسخة أحدث من الدفتر جاهزة. أغلقوه وافتحوه لتظهر.');
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
