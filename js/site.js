/* Page script. The engine (scrollcraft.js) pins the architecture act and runs
   the quiet reveals; this file adds the two things that belong to this page
   only: the diagram build and the folio. Everything here is enhancement: with
   the script missing, the page is complete and the diagram is finished. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var arch = document.querySelector('.arch');

  // Reduced motion: no pin at all. The act becomes an ordinary section, so the
  // reader gets the finished drawing and the full numbered list, same as no-JS.
  if (reduce && arch) arch.removeAttribute('data-sc-act');

  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  /* ------------------------------------------------------- diagram build --
     Six layers, in the order the repo builds them. Scroll position inside the
     pinned act is the only input, so scrolling back up takes the platform
     apart in reverse, exactly. */
  if (arch && !reduce) {
    var STEPS = 6;
    var LEAD = 0.015;      // a breath before the first stroke
    var SLOT = 0.15;       // scroll given to each layer
    var DRAW = 0.105;      // of which this much is drawing; the rest is reading
    var layers = [].slice.call(arch.querySelectorAll('.dg .L'));
    var caps = [].slice.call(arch.querySelectorAll('.cap'));
    var legend = [].slice.call(arch.querySelectorAll('.arch__legend li'));
    var last = -1, lastP = -1;

    // Phone camera. The tall drawing holds the wide one's full detail, so it
    // is taller than its pinned window; the viewBox follows the layer being
    // built, then pulls back to the whole platform. Keyframes come from the
    // drawing itself (data-camera). Pure function of p, so it reverses too.
    var tall = arch.querySelector('.dg-tall');
    var cam = tall && JSON.parse(tall.getAttribute('data-camera') || 'null');
    var FULL = tall && tall.getAttribute('viewBox');
    var VB = FULL && FULL.split(' ').map(Number);
    var smooth = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
    var camera = function (p) {
      if (!cam || !tall.clientWidth || getComputedStyle(tall).display === 'none') return;
      var a = cam[0], b = cam[cam.length - 1], k;
      for (k = 0; k < cam.length - 1; k++) {
        if (p >= cam[k][0] && p <= cam[k + 1][0]) { a = cam[k]; b = cam[k + 1]; break; }
      }
      if (p < cam[0][0]) b = a;
      var t = b === a ? 1 : smooth((p - a[0]) / (b[0] - a[0]));
      var x = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t;
      var w = a[3] + (b[3] - a[3]) * t, h = a[4] + (b[4] - a[4]) * t;
      // widen the rect to the window's shape, keeping it centred
      var aspect = tall.clientWidth / tall.clientHeight;
      if (w / h < aspect) { var nw = h * aspect; x -= (nw - w) / 2; w = nw; }
      else { var nh = w / aspect; y -= (nh - h) / 2; h = nh; }
      // and keep it on the drawing where it can be
      if (w <= VB[2]) x = Math.min(Math.max(x, 0), VB[2] - w); else x = (VB[2] - w) / 2;
      if (h <= VB[3]) y = Math.min(Math.max(y, 0), VB[3] - h); else y = (VB[3] - h) / 2;
      tall.setAttribute('viewBox', [x, y, w, h].map(function (n) { return n.toFixed(1); }).join(' '));
    };

    var update = function () {
      if (!arch.classList.contains('sc-act--pinned')) {
        if (tall && FULL) tall.setAttribute('viewBox', FULL);
        return;
      }
      var r = arch.getBoundingClientRect();
      var travel = Math.max(r.height - window.innerHeight, 1);
      var p = clamp(-r.top / travel);
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;

      camera(p);

      var active = 0;
      for (var i = 0; i < STEPS; i++) if (p >= LEAD + i * SLOT) active = i;

      layers.forEach(function (g) {
        var n = +g.getAttribute('data-layer') - 1;
        var lp = clamp((p - (LEAD + n * SLOT)) / DRAW);
        // strokes lead, words follow, so a box is drawn before it is labelled
        g.style.setProperty('--draw', clamp(lp * 1.5).toFixed(3));
        g.style.setProperty('--ink', clamp((lp - 0.35) / 0.65).toFixed(3));
        g.classList.toggle('is-current', n === active && lp > 0);
      });

      if (active !== last) {
        last = active;
        caps.forEach(function (c) { c.classList.toggle('is-active', +c.getAttribute('data-step') === active); });
        legend.forEach(function (l) {
          var s = +l.getAttribute('data-step');
          l.classList.toggle('is-active', s === active);
          l.classList.toggle('is-done', s < active);
        });
      }
    };

    var queued = false;
    var onScroll = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { lastP = -1; onScroll(); }, { passive: true });
    // the engine pins on mount and again once fonts settle
    requestAnimationFrame(function () { lastP = -1; update(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastP = -1; update(); });
  }

  /* --------------------------------------------------------- theme toggle --
     Two states, starting from whatever the system says. A choice is saved
     and re-applied by the inline script in <head> before first paint. */
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    var root = document.documentElement;
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    var isDark = function () {
      var t = root.getAttribute('data-theme');
      return t ? t === 'dark' : systemDark.matches;
    };
    var sync = function () {
      var dark = isDark();
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      // the browser chrome follows an explicit choice too
      var colour = getComputedStyle(root).getPropertyValue('--paper').trim();
      [].forEach.call(document.querySelectorAll('meta[name="theme-color"]'), function (m) {
        if (root.hasAttribute('data-theme')) m.setAttribute('content', colour);
      });
    };
    toggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
    // a system change only matters while the reader has not chosen
    var onSystem = function () { if (!root.hasAttribute('data-theme')) sync(); };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onSystem);
    toggle.hidden = false;
    sync();
  }

  /* ---------------------------------------------------------------- folio --
     Marks the chapter in view and lets the running head follow the ground. */
  var folio = document.querySelector('.folio');
  var now = document.querySelector('.folio__now');
  var links = [].slice.call(document.querySelectorAll('.folio__nav a'));
  var chapters = [].slice.call(document.querySelectorAll('.chapter'));
  if (folio && chapters.length) {
    var setFolio = function () {
      // the chapter under a line 25% down the viewport, or the folio's own
      // height on a phone, where the running head sits over the top edge
      var probe = window.innerWidth >= 1100 ? window.innerHeight * 0.25 : 24;
      var current = chapters[0];
      for (var i = 0; i < chapters.length; i++) {
        if (chapters[i].getBoundingClientRect().top <= probe) current = chapters[i];
      }
      var id = current.id;
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      if (now) now.textContent = current.getAttribute('data-chapter') || '';
      // which ground is under the running head itself
      var edge = window.innerWidth >= 1100 ? window.innerHeight * 0.5 : 24;
      var under = chapters[0];
      for (var j = 0; j < chapters.length; j++) {
        if (chapters[j].getBoundingClientRect().top <= edge) under = chapters[j];
      }
      folio.setAttribute('data-ground', under.classList.contains('ground-ink') ? 'ink' : 'paper');
    };
    var fq = false;
    window.addEventListener('scroll', function () {
      if (fq) return; fq = true;
      requestAnimationFrame(function () { fq = false; setFolio(); });
    }, { passive: true });
    window.addEventListener('resize', setFolio, { passive: true });
    setFolio();
  }
})();
