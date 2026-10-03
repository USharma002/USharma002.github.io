/* Shared theme sync for embedded visualisations.
 *
 * The blog's dark mode is a manual toggle (body.dark), not just an OS
 * preference, so an iframe cannot rely on prefers-color-scheme alone. This
 * reads the parent page's *rendered* background brightness and applies the
 * matching palette, falling back to the media query if the parent is not
 * reachable (e.g. the file opened standalone).
 *
 * A widget declares its palettes before loading this script:
 *
 *   <script>window.__vizTheme = {
 *     dark:  { '--bg': '#1a1b1f', '--text': '#e5e7eb' },
 *     light: { '--bg': '#f8f9fa', '--text': '#374151' }
 *   };</script>
 *   <script src="/interactive/_theme.js"></script>
 *
 * Widgets that repaint a canvas should listen for the `viz-theme` event.
 */
(function () {
  var root = document.documentElement;

  function parentIsDark() {
    try {
      var body = window.parent && window.parent.document && window.parent.document.body;
      if (body) {
        var rgb = getComputedStyle(body).backgroundColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          // ITU-R BT.601 luma
          var luma = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
          return luma < 128;
        }
      }
    } catch (e) { /* cross-origin or detached: fall through */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  var last = null;

  function apply() {
    var dark = parentIsDark();
    if (dark === last) return;
    last = dark;

    root.classList.toggle('viz-dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';

    var palettes = window.__vizTheme;
    if (palettes) {
      var pal = dark ? palettes.dark : palettes.light;
      for (var k in pal) {
        if (Object.prototype.hasOwnProperty.call(pal, k)) root.style.setProperty(k, pal[k]);
      }
    }
    window.dispatchEvent(new CustomEvent('viz-theme', { detail: { dark: dark } }));
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { requestAnimationFrame(apply); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // The blog's toggle mutates a class on the parent <body>; watch for it.
  try {
    var pb = window.parent && window.parent.document && window.parent.document.body;
    if (pb && window.MutationObserver) {
      new MutationObserver(function () { requestAnimationFrame(apply); })
        .observe(pb, { attributes: true, attributeFilter: ['class'] });
    }
  } catch (e) { /* cross-origin: media query listener above still covers it */ }
})();
