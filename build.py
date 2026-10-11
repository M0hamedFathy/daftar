# -*- coding: utf-8 -*-
"""Build دفتر الرضيع.

    python3 build.py             public/          the site Firebase Hosting serves
    python3 build.py --single    dist/daftar.html one offline file with everything inside (no sign-in)
    python3 build.py --mock      dist/mock/       the site wired to the local test server (see test/)

Only the Python standard library is needed.
"""
import base64, hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
ASSETS = os.path.join(HERE, 'assets')
VERSION = '1.0'
ORDER = ['data.js', 'core.js', 'charts.js', 'ui_base.js', 'ui_home.js', 'ui_log.js', 'ui_hist.js', 'ui_health.js',
         'ui_more.js', 'faith.js', 'sync.js', 'main.js']
FIREBASE = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore-lite.js']
APP_ICONS = ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png']
FONTS = [('Alexandria', 'alexandria', w, ('arabic', 'latin')) for w in (600, 700, 800)] + \
        [('IBM Plex Sans Arabic', 'ibm-plex-sans-arabic', w, ('arabic', 'latin')) for w in (400, 500, 600, 700)] + \
        [('Amiri Quran', 'amiri-quran', 400, ('arabic',))]
AR_RANGE = ('U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, '
            'U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC')
LA_RANGE = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, '
            'U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
SHELL = '<div id="app"></div><div id="sheet"></div><div id="night"></div><div id="toast"></div>'
NOSCRIPT = '<noscript><p style="padding:16px;font:16px sans-serif">يحتاج دفتر الرضيع إلى تشغيل جافاسكربت في المتصفح.</p></noscript>'
HEAD = ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="color-scheme" content="light dark"><title>دفتر الرضيع</title>')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def font_files():
    return ['%s-%s-%d-normal.woff2' % (slug, sub, w) for _, slug, w, subs in FONTS for sub in subs]


def font_css(embed):
    css = []
    for fam, slug, w, subs in FONTS:
        for sub, rng in (('arabic', AR_RANGE), ('latin', LA_RANGE)):
            if sub not in subs:
                continue
            fn = '%s-%s-%d-normal.woff2' % (slug, sub, w)
            if embed:
                with open(os.path.join(ASSETS, 'fonts', fn), 'rb') as f:
                    src = 'url(data:font/woff2;base64,%s) format("woff2")' % base64.b64encode(f.read()).decode()
            else:
                src = 'url(fonts/%s) format("woff2")' % fn
            css.append('@font-face{font-family:"%s";font-style:normal;font-weight:%d;font-display:swap;src:%s;unicode-range:%s}'
                       % (fam, w, src, rng))
    return '\n'.join(css)


def icon_sprite(js):
    icons = json.loads(read(os.path.join(ASSETS, 'icons.json')))
    missing = sorted(set(re.findall(r"ic\('([a-z0-9-]+)'", js)) - set(icons))
    if missing:
        print('icons missing from assets/icons.json:', ', '.join(missing))
    syms = ''.join('<symbol id="%s" viewBox="0 0 256 256">%s</symbol>' % (n if n.startswith('i-') else 'p-' + n, inner)
                   for n, inner in sorted(icons.items()))
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">%s</svg>' % syms


def js_bundle(build, cloud=None):
    parts = []
    for fn in ORDER:
        s = read(os.path.join(SRC, fn))
        if fn == 'data.js':
            s = s.replace('/*WHO_LMS*/null', read(os.path.join(ASSETS, 'who-lms.json')).strip())
        parts.append('/* ---- %s ---- */\n%s' % (fn, s))
    head = "'use strict';\nconst BUILD = '%s';\nconst APP_VER = '%s';\nconst CLOUD = %s;\n" % (
        build, VERSION, json.dumps(cloud) if cloud else 'null')
    return head + '\n'.join(parts)


def app_css():
    return read(os.path.join(SRC, 'app.css')) + '\nbody{direction:rtl}\n'


def build_site(out, cloud=None, firebase_dir=None):
    """The installable web app: index.html, app.js, app.css, fonts, icons, Firebase SDK and an offline cache."""
    shutil.rmtree(out, ignore_errors=True)
    js = js_bundle('pwa', cloud)
    sprite = icon_sprite(js)
    write(os.path.join(out, 'app.js'), js)
    write(os.path.join(out, 'app.css'), font_css(False) + '\n' + app_css())
    for fn in font_files():
        os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
        shutil.copy(os.path.join(ASSETS, 'fonts', fn), os.path.join(out, 'fonts', fn))
    os.makedirs(os.path.join(out, 'icons'), exist_ok=True)
    for fn in APP_ICONS:
        shutil.copy(os.path.join(ASSETS, 'app-icons', fn), os.path.join(out, 'icons', fn))
    os.makedirs(os.path.join(out, 'fb'), exist_ok=True)
    for fn in FIREBASE:
        shutil.copy(os.path.join(firebase_dir or os.path.join(HERE, 'vendor', 'firebase'), fn), os.path.join(out, 'fb', fn))
    write(os.path.join(out, 'index.html'),
          HEAD.replace('<title>', '<meta name="theme-color" content="#6A4FDB"><meta name="apple-mobile-web-app-capable" content="yes">'
                       '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="دفتر الرضيع">'
                       '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icon-192.png">'
                       '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><title>') +
          '<link rel="stylesheet" href="app.css"></head><body>\n%s\n%s%s\n<script src="app.js"></script>\n</body></html>\n'
          % (sprite, SHELL, NOSCRIPT))
    manifest = {
        'name': 'دفتر الرضيع', 'short_name': 'دفتر الرضيع', 'lang': 'ar', 'dir': 'rtl', 'id': './',
        'start_url': './', 'scope': './', 'display': 'standalone', 'background_color': '#F3F2F7', 'theme_color': '#6A4FDB',
        'description': 'تسجيل الرضاعة والنوم والحفاضات والنمو والتطعيمات، ولوحة متابعة باليوم والأسبوع والشهر.',
        'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                  {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                  {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
    }
    write(os.path.join(out, 'manifest.webmanifest'), json.dumps(manifest, ensure_ascii=False, indent=1))
    files = ['index.html', 'app.css', 'app.js', 'manifest.webmanifest'] + ['icons/' + f for f in APP_ICONS] + \
            ['fonts/' + f for f in font_files()] + ['fb/' + f for f in FIREBASE]
    h = hashlib.sha1()
    for f in files:
        with open(os.path.join(out, f), 'rb') as fh:
            h.update(fh.read())
    write(os.path.join(out, 'sw.js'), SW % (h.hexdigest()[:10], json.dumps(['./'] + files)))
    return js


# offline cache: everything the app needs is stored on first visit; a new build replaces it as a whole
SW = """const CACHE = 'daftar-%s';
const FILES = %s;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.startsWith('/__/')) return;   // sign-in pages and settings always come from the network
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).then((res) => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
"""


def build_single(path):
    js = js_bundle('html')
    write(path, HEAD + '\n<style>\n%s\n%s\n</style></head><body>\n%s\n%s%s\n<script>\n%s\n</script>\n</body></html>\n'
          % (font_css(True), app_css(), icon_sprite(js), SHELL, NOSCRIPT, js))


def main():
    if '--mock' in sys.argv:
        build_site(os.path.join(HERE, 'dist', 'mock'), {'apiKey': 'mock', 'authDomain': 'mock', 'projectId': 'mock', 'appId': 'mock'},
                   os.path.join(HERE, 'test', 'mockfb'))
        print('built dist/mock')
        return
    js = build_site(os.path.join(HERE, 'public'))
    print('built public/  (app.js %d KB)' % round(len(js.encode()) / 1024))
    if '--single' in sys.argv:
        build_single(os.path.join(HERE, 'dist', 'daftar.html'))
        print('built dist/daftar.html')


if __name__ == '__main__':
    main()
