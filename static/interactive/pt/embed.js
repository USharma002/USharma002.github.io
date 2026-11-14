// Shared runtime for the path-tracing widgets.
//  - follows the parent page's light/dark theme live (no polling)
//  - exposes the palette as CSS variables and as PT.c for canvas drawing
//  - reports whether the iframe is on screen, so animations can pause
(function () {
  const root = document.documentElement;
  const PT = window.PT = { dark: false, c: {}, visible: true };
  const themeFns = [], visFns = [];
  const PAL = {
    light: { text: '#1f1f1f', muted: '#6c6c6c', border: '#e3e3e3', faint: '#f4f4f4',
             accent: '#b45309', accent2: '#0e7490', c3: '#2e7d32', c4: '#6d28d9', bad: '#b91c1c' },
    dark:  { text: '#dadadb', muted: '#9b9c9d', border: '#3a3b3e', faint: '#26272a',
             accent: '#e69138', accent2: '#3fb5d4', c3: '#66bb6a', c4: '#b39ddb', bad: '#ef5350' }
  };
  let pdoc = null;
  try { if (window.parent !== window) pdoc = window.parent.document; } catch (e) { pdoc = null; }

  function lum(rgb) { const m = rgb.match(/\d+(\.\d+)?/g); return m ? (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000 : 255; }
  function apply() {
    let bg = null, dark;
    if (pdoc && pdoc.body) {
      bg = getComputedStyle(pdoc.body).backgroundColor;
      if (!bg || /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = getComputedStyle(pdoc.documentElement).backgroundColor;
    }
    if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) dark = lum(bg) < 128;
    else { dark = matchMedia('(prefers-color-scheme: dark)').matches; bg = dark ? 'rgb(29, 30, 32)' : 'rgb(255, 255, 255)'; }
    const p = PAL[dark ? 'dark' : 'light'];
    const changed = dark !== PT.dark || bg !== PT.c.bg;
    PT.dark = dark;
    PT.c = Object.assign({ bg }, p);
    root.style.setProperty('--bg', bg);
    for (const k in p) root.style.setProperty('--' + k, p[k]);
    root.style.colorScheme = dark ? 'dark' : 'light';
    if (changed) themeFns.forEach(f => f(PT.c));
  }
  PT.onTheme = f => { themeFns.push(f); };
  PT.onVisible = f => { visFns.push(f); };
  // rgba helper for canvas fills: PT.alpha('#e69138', 0.3)
  PT.alpha = (hex, a) => {
    if (hex.startsWith('rgb')) { const m = hex.match(/\d+(\.\d+)?/g); return `rgba(${m[0]},${m[1]},${m[2]},${a})`; }
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  // HiDPI canvas: sizes the backing store to CSS size x devicePixelRatio, returns the 2D context
  PT.fit = (canvas, w, h) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w == null) { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; }
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  apply();
  if (pdoc) {
    const mo = new window.parent.MutationObserver(apply);
    mo.observe(pdoc.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    mo.observe(pdoc.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    try {
      const io = new window.parent.IntersectionObserver(es => {
        const v = es[es.length - 1].isIntersecting;
        if (v !== PT.visible) { PT.visible = v; visFns.forEach(f => f(v)); }
      }, { rootMargin: '150px' });
      if (window.frameElement) io.observe(window.frameElement);
    } catch (e) {}
  } else {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  }
  document.addEventListener('visibilitychange', () => {
    const v = !document.hidden; if (v !== PT.visible) { PT.visible = v; visFns.forEach(f => f(v)); }
  });
})();
