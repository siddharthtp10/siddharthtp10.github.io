/* ==========================================================================
   Siddharth S — Portfolio
   Vanilla JS. GSAP + ScrollTrigger + Lenis are optional enhancements:
   if any CDN fails, the page still works as a static document.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = reducedMQ.matches;
  var introDelay = 0;
  var lenis = null;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function initTheme() {
    var btn = $('.theme-toggle');
    if (!btn) return;
    function label() {
      btn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    label();
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  }

  /* ---------- Masthead: hide on scroll down, progress line, active nav ---------- */
  // Anchor jumps (and loading a URL with a #hash) keep the masthead visible for a moment
  var keepHeadUntil = location.hash ? Date.now() + 2500 : 0;
  function holdMasthead(ms) { keepHeadUntil = Date.now() + ms; var h = $('.masthead'); if (h) h.classList.remove('is-hidden'); }

  function initMasthead() {
    var head = $('.masthead');
    var bar = $('.progress span');
    var running = $('.running-head');
    var marks = $$('[data-running]');
    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      var jumped = Math.abs(y - lastY) > 400;
      head.classList.toggle('is-scrolled', y > 40);
      if (jumped || Date.now() < keepHeadUntil) head.classList.remove('is-hidden');
      else if (y > 120 && y > lastY + 4) head.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 120) head.classList.remove('is-hidden');
      if (head.contains(document.activeElement)) head.classList.remove('is-hidden');
      lastY = y;

      // Running head: the deepest chapter or section whose top has passed 40% of the viewport
      if (running) {
        var label = '';
        var line = window.innerHeight * 0.4;
        for (var i = 0; i < marks.length; i++) {
          var r = marks[i].getBoundingClientRect();
          if (r.top <= line && r.bottom > line) label = marks[i].getAttribute('data-running');
        }
        if (running.textContent !== label) running.textContent = label;
        running.classList.toggle('is-on', !!label);
      }

      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    head.addEventListener('focusin', function () { head.classList.remove('is-hidden'); });
    update();

    // Active nav link for the section in view
    var links = $$('[data-nav]');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('data-nav')] = a; });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          a.classList.add('is-active');
        } else {
          a.classList.remove('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }

  /* ---------- Smooth anchor scrolling (works with or without Lenis) ---------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (id === '#top') { scrollToTop(); history.replaceState(null, '', location.pathname + location.search); return; }
      holdMasthead(2000);
      var offset = id === '#top' ? 0 : -($('.masthead__bar').offsetHeight + 8);
      if (lenis) {
        // #top is the fixed masthead: its "position" is wherever the reader already is, so scroll to 0
        lenis.scrollTo(id === '#top' ? 0 : target, { offset: id === '#top' ? 0 : offset, duration: 1.2 });
      } else {
        var y = target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: id === '#top' ? 0 : y, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
      if (id !== '#top') {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      history.replaceState(null, '', id);
    });
  }

  /* ---------- Mobile menu (native <dialog>, Esc closes) ---------- */
  function initMenu() {
    var dialog = $('#menu');
    var open = $('.menu-toggle');
    if (!dialog || !open || typeof dialog.showModal !== 'function') return;
    var close = $('.menu__close', dialog);
    open.addEventListener('click', function () {
      dialog.showModal();
      open.setAttribute('aria-expanded', 'true');
      if (lenis) lenis.stop();
    });
    var leftViaLink = false;
    function shut() {
      // Restart smooth scrolling before the anchor handler runs, or Lenis ignores the jump
      if (lenis) lenis.start();
      if (dialog.open) dialog.close();
    }
    close.addEventListener('click', shut);
    $$('a', dialog).forEach(function (a) {
      a.addEventListener('click', function () { leftViaLink = true; shut(); });
    });
    dialog.addEventListener('close', function () {
      open.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.start();
      // After following a link, focus stays on the target section instead of returning to the button
      if (!leftViaLink) open.focus();
      leftViaLink = false;
    });
  }

  /* ---------- Copy email ---------- */
  function initCopy() {
    var btn = $('[data-copy]');
    var status = $('[data-copy-status]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done() {
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        if (status) status.textContent = 'Email address copied to clipboard';
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('is-done');
          if (status) status.textContent = '';
        }, 2000);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------- Scenes: walkthroughs and replays driven by data-at / data-off / data-lit ----------
     Each [data-scene] holds its final state in the HTML (what no-JS and reduced-motion
     visitors see). Here a clock that only runs while the scene is on screen replays it:
     elements appear at data-at, leave at data-off, light up at data-lit, and commands
     marked data-type are typed out. The scene loops after data-dur + data-hold seconds. */
  function initScenes() {
    $$('[data-scene]').forEach(function (scene) {
      var dur = Number(scene.getAttribute('data-dur')) || 10;
      var hold = Number(scene.getAttribute('data-hold')) || 3;
      var toggle = $('.rec__toggle', scene);
      var follow = $('.term', scene); // keeps the newest line in view when the terminal fills up
      var items = $$('[data-at], [data-off], [data-lit]', scene).map(function (el) {
        var typed = el.hasAttribute('data-type') ? $('.t-typed', el) : null;
        return {
          el: el,
          at: el.hasAttribute('data-at') ? Number(el.getAttribute('data-at')) : -1,
          off: el.hasAttribute('data-off') ? Number(el.getAttribute('data-off')) : Infinity,
          lit: el.hasAttribute('data-lit') ? Number(el.getAttribute('data-lit')) : Infinity,
          typed: typed,
          text: typed ? typed.textContent : '',
          shown: null, litOn: null, typedLen: -1
        };
      });
      scene.classList.add('is-js');

      function render(t) {
        var grew = false;
        items.forEach(function (it) {
          var show = t >= it.at && t < it.off;
          if (show !== it.shown) { it.el.classList.toggle('is-off', !show); it.shown = show; if (show) grew = true; }
          var lit = t >= it.lit;
          if (lit !== it.litOn) { it.el.classList.toggle('is-lit', lit); it.litOn = lit; }
          if (it.typed) {
            var n = Math.max(0, Math.min(it.text.length, Math.floor((t - it.at) / 0.032)));
            if (n !== it.typedLen) {
              it.typed.textContent = it.text.slice(0, n);
              it.el.classList.toggle('is-typing', n < it.text.length && show);
              it.typedLen = n; grew = true;
            }
          }
        });
        if (follow && grew) follow.scrollTop = follow.scrollHeight;
      }

      if (prefersReduced || !window.requestAnimationFrame) { render(dur + 1); return; }

      var t = 0, last = 0, raf = 0, running = false, onScreen = false, userPaused = false;
      function frame(now) {
        t += Math.min((now - last) / 1000, 0.1); last = now;
        if (t > dur + hold) { t = 0; scene.classList.remove('is-fading'); scene.dispatchEvent(new CustomEvent('scene:loop')); }
        else if (t > dur + hold - 0.6) scene.classList.add('is-fading');
        render(t);
        raf = requestAnimationFrame(frame);
      }
      function update() {
        var should = onScreen && !userPaused && !document.hidden;
        if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
        else if (!should && running) { running = false; cancelAnimationFrame(raf); }
        toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        toggle.setAttribute('aria-label', toggle.getAttribute('aria-label').replace(/^(Play|Pause)/, userPaused ? 'Play' : 'Pause'));
      }
      render(0);
      scene.addEventListener('scene:restart', function () { t = 0; scene.classList.remove('is-fading'); render(0); });
      toggle.hidden = false;
      toggle.addEventListener('click', function () { userPaused = !userPaused; update(); });
      document.addEventListener('visibilitychange', update);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; update(); }, { threshold: 0.35 }).observe(scene);
      } else { onScreen = true; update(); }
    });
  }

  /* ---------- Scene tabs: one window, two walkthroughs ----------
     Without JavaScript both figures are shown in turn. With it, one shows at a time; when a
     walkthrough finishes, the next tab opens on its own until the visitor picks one. */
  function initSceneTabs() {
    var tabs = $('[data-scene-tabs]');
    if (!tabs) return;
    var btns = $$('[data-tab]', tabs);
    var chosen = false;
    tabs.hidden = false;
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Walkthroughs');
    function panel(b) { return document.getElementById(b.getAttribute('data-tab')); }
    function select(i, focus) {
      btns.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        panel(b).hidden = !on;
        if (on) {
          var sc = $('[data-scene]', panel(b));
          if (sc) sc.dispatchEvent(new CustomEvent('scene:restart'));
          if (focus) b.focus();
        }
      });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    btns.forEach(function (b, i) {
      b.setAttribute('role', 'tab');
      b.id = 'tab-' + b.getAttribute('data-tab');
      b.setAttribute('aria-controls', b.getAttribute('data-tab'));
      panel(b).setAttribute('role', 'tabpanel');
      panel(b).setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', function () { chosen = true; select(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); chosen = true;
        select((i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length, true);
      });
      var sc = $('[data-scene]', panel(b));
      if (sc) sc.addEventListener('scene:loop', function () { if (!chosen) select((i + 1) % btns.length); });
    });
    select(0);
  }

  /* ---------- Opening intro: a light beam splits the screen open ----------
     Plays on every load; skipped for reduced motion and deep links (#section).
     Returns how long the hero intro should wait. */
  function initIntro() {
    if (prefersReduced || location.hash) return 0;
    var el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="intro__half intro__half--top"></span><span class="intro__half intro__half--bot"></span><span class="intro__beam"></span>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-beam'); }); });
    setTimeout(function () { el.classList.add('is-open'); }, 1000);
    setTimeout(function () { el.remove(); }, 2200);
    return 0.8; // the hero text rises while the screen opens
  }

  /* ---------- Floating project deck: cards drift with the cursor at different depths ---------- */
  function initDeck() {
    var deck = $('[data-deck]');
    if (deck && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { deck.classList.toggle('is-idle', !e[0].isIntersecting); }).observe(deck);
    }
    if (!deck || prefersReduced || !window.matchMedia('(hover: hover) and (min-width: 861px)').matches) return;
    var cards = $$('.deck__card', deck);
    deck.addEventListener('pointermove', function (e) {
      var r = deck.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach(function (c) {
        var d = Number(c.getAttribute('data-depth')) || 1;
        c.style.translate = (x * 36 * d).toFixed(1) + 'px ' + (y * 24 * d).toFixed(1) + 'px';
      });
    });
    deck.addEventListener('pointerleave', function () { cards.forEach(function (c) { c.style.translate = ''; }); });
  }

  /* ---------- Hero background: a rolling release across three availability zones ----------
     A perspective floor of pods in three zones. Each release sweeps through the zones one at a
     time (far rows first), and now and then a pod restarts and comes back. Drawn once, still,
     for reduced motion; paused whenever the hero is off screen. */
  function initHeroField() {
    var canvas = $('[data-hero-field]');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var media = canvas.parentNode;
    var GREEN = '67,217,155', STEEL = '111,143,176', MUTED = '154,166,161';
    var ZONES = ['ap-south-1a', 'ap-south-1b', 'ap-south-1c'];
    var COLS = 4, ROWS = 11, Z0 = 3.2, DZ = 1.25, HC = 3;
    var nodes = [];
    ZONES.forEach(function (_, zi) {
      var cx = (zi - 1) * 2.2;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        nodes.push({ zi: zi, r: r, c: c, x: cx + (c - 1.5) * 0.5, z: Z0 + r * DZ, e: 0, at: -1, down: 0 });
      }
    });
    function at(zi, r, c) { return nodes[(zi * ROWS + r) * COLS + c]; }

    // Soft green glow sprite, drawn with globalAlpha instead of per-frame shadows
    var glow = document.createElement('canvas'); glow.width = glow.height = 64;
    var g = glow.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(' + GREEN + ',.9)'); rg.addColorStop(.35, 'rgba(' + GREEN + ',.25)'); rg.addColorStop(1, 'rgba(' + GREEN + ',0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);

    var W = 0, H = 0, cx = 0, hy = 0, f = 0, sway = 0, narrow = false;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = media.clientWidth; H = media.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      narrow = W < 860;
      cx = W * (narrow ? 0.5 : 0.68);
      hy = H * (narrow ? 0.36 : 0.04);
      f = (H * 1.04 - hy) * Z0 / HC;
      if (narrow) f *= 0.82;
    }
    var dz = 0; // scroll dolly: the camera moves forward over the floor as the hero scrolls away
    function depth(z) { return Math.max(z - dz, 0.8); }
    function px(x, z) { return cx + f * (x + sway) / depth(z); }
    function py(z) { return hy + f * HC / depth(z); }

    // Releases: zone by zone, far rows first, so the wave rolls toward the viewer
    var period = 5.2, nextRelease = 0.6, count = 0, packets = [];
    function release(t) {
      count++;
      ZONES.forEach(function (_, zi) {
        var start = t + zi * 1.05;
        packets.push({ zi: zi, t0: start - 0.15, dur: 0.95 });
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          at(zi, r, c).at = start + (ROWS - 1 - r) * 0.09 + Math.random() * 0.06;
        }
      });
      if (count % 3 === 2) { // one pod restarts, then rejoins
        var n = nodes[Math.floor(Math.random() * nodes.length)];
        n.down = t + period * 0.75; n.at = -1;
      }
    }

    function line(x1, z1, x2, z2, color, a, w) {
      ctx.strokeStyle = 'rgba(' + color + ',' + a + ')'; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(px(x1, z1), py(z1)); ctx.lineTo(px(x2, z2), py(z2)); ctx.stroke();
    }

    function draw(t, dt) {
      ctx.clearRect(0, 0, W, H);
      var zFar = Z0 + (ROWS - 1) * DZ;

      // Zones: faint outlines and labels at the far edge
      ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ZONES.forEach(function (name, zi) {
        var c = (zi - 1) * 2.2, x1 = c - 1.02, x2 = c + 1.02, za = Z0 - 0.7, zb = zFar + 0.6;
        ctx.beginPath();
        ctx.moveTo(px(x1, za), py(za)); ctx.lineTo(px(x1, zb), py(zb)); ctx.lineTo(px(x2, zb), py(zb)); ctx.lineTo(px(x2, za), py(za)); ctx.closePath();
        ctx.fillStyle = 'rgba(' + GREEN + ',.025)'; ctx.fill();
        ctx.strokeStyle = 'rgba(' + GREEN + ',.13)'; ctx.lineWidth = 1; ctx.stroke();
        if (narrow) return; // on phones the labels would sit behind the headline
        ctx.fillStyle = 'rgba(' + MUTED + ',.5)';
        ctx.fillText(name, px(c, zb + 0.4), py(zb + 0.4) - 8);
      });

      // Node state
      nodes.forEach(function (n) {
        if (n.at >= 0 && t >= n.at) { n.e = 1; n.at = -1; }
        if (n.down && t >= n.down) { n.down = 0; n.e = 1; }
        n.e *= Math.exp(-dt / 1.5);
      });

      // Links within each zone
      nodes.forEach(function (n) {
        var right = n.c < COLS - 1 ? at(n.zi, n.r, n.c + 1) : null, back = n.r < ROWS - 1 ? at(n.zi, n.r + 1, n.c) : null;
        [right, back].forEach(function (m) {
          if (!m) return;
          var lit = Math.min(n.e, m.e), w = 0.6 + 1.2 * (Z0 / Math.min(n.z, m.z));
          line(n.x, n.z, m.x, m.z, MUTED, 0.07, w * 0.6);
          if (lit > 0.02) line(n.x, n.z, m.x, m.z, GREEN, lit * 0.55, w);
        });
      });

      // Release packets: a streak down the zone's centre, just ahead of the wave
      packets = packets.filter(function (p) {
        var k = (t - p.t0) / p.dur; if (k > 1.15) return false; if (k < 0) return true;
        var c = (p.zi - 1) * 2.2, z1 = zFar + 0.6 - (zFar - Z0 + 1.3) * Math.min(k, 1), z2 = Math.min(z1 + 1.6, zFar + 0.6);
        var gr = ctx.createLinearGradient(px(c, z1), py(z1), px(c, z2), py(z2));
        var a = k > 1 ? 1 - (k - 1) / 0.15 : 1;
        gr.addColorStop(0, 'rgba(' + GREEN + ',' + 0.9 * a + ')'); gr.addColorStop(1, 'rgba(' + GREEN + ',0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 2.2 * Z0 / z1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px(c, z1), py(z1)); ctx.lineTo(px(c, z2), py(z2)); ctx.stroke();
        return true;
      });

      // Pods, far to near
      for (var i = ROWS - 1; i >= 0; i--) {
        for (var zi = 0; zi < ZONES.length; zi++) for (var c = 0; c < COLS; c++) {
          var n = at(zi, i, c), s = Z0 / n.z, x = px(n.x, n.z), y = py(n.z), r = 1.3 + 2.8 * s;
          if (n.down) { // restarting: hollow steel ring
            ctx.strokeStyle = 'rgba(' + STEEL + ',.85)'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
            continue;
          }
          if (n.e > 0.02) {
            var gs = r * (6 + 6 * n.e); ctx.globalAlpha = n.e;
            ctx.drawImage(glow, x - gs, y - gs, gs * 2, gs * 2); ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(' + GREEN + ',' + n.e * 0.45 + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x, y, r * (1.5 + (1 - n.e) * 3), 0, Math.PI * 2); ctx.stroke();
          }
          var base = 0.22 + 0.5 * s;
          ctx.fillStyle = n.e > 0.02 ? 'rgba(' + GREEN + ',' + Math.min(1, base + n.e) + ')' : 'rgba(' + MUTED + ',' + base + ')';
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    resize();
    media.classList.add('has-field');

    if (prefersReduced) { // one still frame: the release half-way through the middle zone
      var still = function () {
        resize();
        nodes.forEach(function (n) { n.e = n.zi === 0 ? 0.35 : n.zi === 1 ? (n.r > 4 ? 0.9 - (ROWS - 1 - n.r) * 0.1 : 0) : 0; n.at = -1; n.down = 0; });
        draw(0, 0);
      };
      still();
      window.addEventListener('resize', still);
      return;
    }

    var running = false, last = 0, t = 0, onScreen = true, raf = 0;
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
      sway = Math.sin(t * 0.08) * 0.35;
      dz += ((window.__heroDolly || 0) * 3.4 - dz) * 0.12;
      if (t >= nextRelease) { release(t); nextRelease = t + period; }
      draw(t, dt);
      raf = requestAnimationFrame(frame);
    }
    function update() {
      var should = onScreen && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    // Re-measure whenever the hero itself changes size (fonts loading, content reflow), not only on window resize
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(media);
    else window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; update(); }, { threshold: 0 }).observe(media);
    }
    update();
  }

  /* ---------- Skills map: link each skill to where it was used ---------- */
  function initSkillmap() {
    var map = $('[data-skillmap]');
    if (!map) return;
    var skills = $$('.skill', map);
    var ctxs = $$('.ctx', map);
    var hint = $('[data-skillmap-hint]', map);
    var status = $('[data-skillmap-status]', map);
    var defaultHint = hint.textContent;
    var pinned = null;
    var names = {};
    ctxs.forEach(function (c) { names[c.getAttribute('data-ctx-id')] = c.querySelector('b').textContent; });

    function idsOf(skill) { return (skill.getAttribute('data-ctx') || '').split(' ').filter(Boolean); }
    function clear() {
      skills.forEach(function (k) { k.classList.remove('is-hot', 'is-dim'); });
      ctxs.forEach(function (c) { c.classList.remove('is-on', 'is-off'); });
    }
    function show(el) {
      clear();
      if (!el) { hint.textContent = defaultHint; return; }
      var msg;
      if (el.classList.contains('skill')) {
        var ids = idsOf(el);
        el.classList.add('is-hot');
        ctxs.forEach(function (c) { c.classList.add(ids.indexOf(c.getAttribute('data-ctx-id')) > -1 ? 'is-on' : 'is-off'); });
        msg = ids.length
          ? el.textContent + ': ' + ids.map(function (i) { return names[i]; }).join(', ') + '.'
          : el.textContent + ': on my resume, not tied to a project on this page.';
      } else {
        var id = el.getAttribute('data-ctx-id');
        var used = skills.filter(function (k) { return idsOf(k).indexOf(id) > -1; });
        el.classList.add('is-on');
        ctxs.forEach(function (c) { if (c !== el) c.classList.add('is-off'); });
        skills.forEach(function (k) { k.classList.add(used.indexOf(k) > -1 ? 'is-hot' : 'is-dim'); });
        msg = names[id] + ': ' + used.length + ' skills highlighted.';
      }
      hint.textContent = msg;
    }
    function restore() { show(pinned); }
    function bind(el) {
      el.addEventListener('mouseenter', function () { show(el); });
      el.addEventListener('focus', function () { show(el); });
      el.addEventListener('mouseleave', restore);
      el.addEventListener('blur', restore);
      el.addEventListener('click', function () {
        var same = pinned === el;
        skills.concat(ctxs).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        pinned = same ? null : el;
        if (pinned) pinned.setAttribute('aria-pressed', 'true');
        show(pinned);
        status.textContent = pinned ? hint.textContent : 'Selection cleared.';
        toastShow(status.textContent);
      });
    }
    skills.forEach(bind);
    ctxs.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); bind(c); });

    // Phones: the panel is not pinned, so a tapped skill's connections also show briefly at the bottom
    var toast = document.createElement('p'), toastTimer = 0;
    toast.className = 'skillmap__toast';
    toast.setAttribute('aria-hidden', 'true'); // the live region above already announces it
    document.body.appendChild(toast);
    function toastShow(text) {
      if (!window.matchMedia('(max-width: 860px)').matches) return;
      toast.textContent = text;
      toast.classList.add('is-shown');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-shown'); }, 3800);
    }
  }

  /* ---------- Hero: delivery-loop illustration (slow loop, paused off-screen) ---------- */
  function initLoop(gsap) {
    var loop = $('[data-loop]');
    if (!loop) return;
    var token = $('.loop__token', loop);
    var bar = $('.loop__progress', loop);
    var nodes = $$('.loop__nodes li', loop);
    var stops = nodes.map(function (n) { return parseFloat(getComputedStyle(n).getPropertyValue('--at')); });
    var state = { v: 0 };
    loop.classList.add('is-live');
    function render() {
      token.style.left = (state.v * 100) + '%';
      bar.style.transform = 'scaleX(' + state.v + ')';
      nodes.forEach(function (n, i) { n.classList.toggle('is-hit', state.v >= stops[i] - 0.002); });
    }
    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1, delay: 1.8, paused: true });
    tl.set(state, { v: 0, onComplete: render })
      .to(token, { opacity: 1, duration: 0.4 })
      .to(state, { v: 1, duration: 7, ease: 'power1.inOut', onUpdate: render })
      .to(token, { opacity: 0, duration: 0.5 }, '+=0.6')
      .to(bar, { opacity: 0, duration: 0.6 }, '<')
      .set(bar, { opacity: 1 });
    render();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { e[0].isIntersecting ? tl.play() : tl.pause(); }).observe(loop);
    } else { tl.play(); }
  }

  /* ---------- The record: before/after bars grow on enter ---------- */
  function initBars(gsap) {
    $$('[data-ba]').forEach(function (row) {
      var before = $('.ba__bar--before', row);
      var after = $('.ba__bar--after', row);
      gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%', once: true } })
        .from(before, { scaleX: 0, duration: 0.7, ease: 'power2.out' })
        .from(after, { scaleX: 0, duration: 1.1, ease: 'power3.out' }, '-=0.2');
    });
  }

  /* ---------- Project flows: steps light up in order as you scroll ---------- */
  function initFlows(gsap, ST) {
    var flow = $('[data-flow]');
    if (flow) {
      var steps = $$('.flow__step', flow), arrows = $$('i', flow);
      ST.create({ trigger: flow, start: 'top 88%', end: 'top 45%', scrub: true, onUpdate: function (self) {
        var n = Math.round(self.progress * steps.length);
        steps.forEach(function (st, i) { st.classList.toggle('is-on', i < n); });
        arrows.forEach(function (a, i) { a.classList.toggle('is-on', i < n - 1); });
      } });
    }
    var fig = $('[data-botflow]');
    if (!fig) return;
    var token = $('.bot__token', fig);
    var rects = $$('.bot__step', fig);
    var xs = [75, 245, 415, 615];
    var mboxes = $$('.bot__mflow .ms__box', fig);
    var state = { p: 0 };
    function render() {
      var x = xs[0] + (xs[3] - xs[0]) * state.p;
      token.setAttribute('cx', x);
      rects.forEach(function (r, i) { r.classList.toggle('is-on', x >= xs[i] - 1); });
      var n = Math.round(state.p * mboxes.length);
      mboxes.forEach(function (b, i) { b.classList.toggle('is-on', i < Math.max(1, n)); });
    }
    gsap.set(token, { opacity: 1 });
    gsap.to(state, { p: 1, ease: 'none', onUpdate: render, scrollTrigger: { trigger: fig, start: 'top 85%', end: 'top 35%', scrub: 0.6 } });
    render();
  }

  /* ---------- Split heading into masked lines ---------- */
  function splitLines(el) {
    if (!el.__original) el.__original = el.innerHTML;
    el.innerHTML = el.__original;

    var words = [];
    function walk(node, wrapTag) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          // Split on ordinary whitespace only, so a non-breaking space keeps words together
          var parts = child.textContent.split(/([ \t\n\r]+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'w';
            s.textContent = p;
            if (wrapTag) s.setAttribute('data-wrap', wrapTag);
            frag.appendChild(s);
            words.push(s);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child, child.tagName.toLowerCase());
        }
      });
    }
    walk(el, null);

    var lines = [];
    var lastTop = null;
    words.forEach(function (w) {
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(w);
    });

    el.innerHTML = '';
    lines.forEach(function (lineWords) {
      var line = document.createElement('span');
      line.className = 'line';
      var inner = document.createElement('span');
      inner.className = 'line-inner';
      lineWords.forEach(function (w, i) {
        var node = document.createTextNode(w.textContent);
        var tag = w.getAttribute('data-wrap');
        if (tag) { var wrap = document.createElement(tag); wrap.appendChild(node); node = wrap; }
        inner.appendChild(node);
        if (i < lineWords.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      line.appendChild(inner);
      el.appendChild(line);
    });
    el.style.visibility = 'visible';
    return $$('.line-inner', el);
  }

  function splitInto(el, unit) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = '';
    var pieces = unit === 'char' ? Array.from(text) : text.split(/(\s+)/);
    return pieces.map(function (p) {
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(p)); return null; }
      var s = document.createElement('span');
      s.className = unit === 'char' ? 'char' : 'word';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = p;
      el.appendChild(s);
      return s;
    }).filter(Boolean);
  }

  /* ---------- Motion layer ---------- */
  function initMotion() {
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // Lenis smooth scroll, driven by GSAP's ticker
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    var EASE = 'power3.out';

    // Hero intro
    var heroTitle = $('.hero__title');
    var heroLines = splitLines(heroTitle);
    var intro = gsap.timeline({ delay: 0.15 + introDelay });
    intro
      .to('[data-hero-fade].eyebrow', { opacity: 1, y: 0, duration: 0.8, ease: EASE })
      .from(heroLines, { yPercent: 105, duration: 1, ease: EASE, stagger: 0.09 }, '<0.05')
      .to('[data-hero-rule]', { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, '-=0.6')
      .to('.hero [data-hero-fade]:not(.eyebrow)', { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08 }, '-=0.55');

    window.addEventListener('resize', debounce(function () {
      splitLines(heroTitle);
      ST.refresh();
    }, 200));

    // Pin first, so triggers further down account for its spacing
    initDiagram(gsap, ST);

    // Scroll cue fades once the reader starts
    gsap.to('.scroll-cue', { opacity: 0, scrollTrigger: { start: 0, end: 80, scrub: true } });
    var cue = $('.scroll-cue');
    if (cue) ST.create({ start: 80, onEnter: function () { cue.classList.add('is-gone'); }, onLeaveBack: function () { cue.classList.remove('is-gone'); } });

    // Generic reveals
    ST.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        // Landing mid-page (a #link or a reload) enters everything above at once: show those
        // instantly so on-screen content isn't queued behind them in the stagger
        var above = els.filter(function (el) { return el.getBoundingClientRect().bottom <= 0; });
        var rest = els.filter(function (el) { return above.indexOf(el) === -1; });
        if (above.length) gsap.set(above, { opacity: 1, y: 0, overwrite: true });
        if (rest.length) gsap.to(rest, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.12, overwrite: true });
      }
    });
    $$('[data-rule]').forEach(function (r) {
      gsap.to(r, { scaleX: 1, duration: 1, ease: 'power2.inOut', scrollTrigger: { trigger: r, start: 'top 90%', once: true } });
    });

    // Visual upgrades
    initLoop(gsap);
    initBars(gsap);
    initFlows(gsap, ST);

    // Stats count-up
    $$('[data-count]').forEach(function (el) {
      var end = Number(el.getAttribute('data-count'));
      var obj = { v: 0 };
      el.textContent = '0';
      gsap.to(obj, {
        v: end,
        duration: 1.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v); }
      });
    });

    // Mission pull-quote: scrubbed word reveal
    var quote = $('[data-words] p');
    if (quote) {
      var words = splitInto(quote, 'word');
      gsap.fromTo(words, { opacity: 0.15 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: quote, start: 'top 75%', end: 'top 35%', scrub: 0.6 }
      });
    }

    // Story timeline
    var tl = $('.timeline');
    if (tl) {
      gsap.fromTo('.timeline__line', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 }
      });
      $$('.timeline__item', tl).forEach(function (item) {
        ST.create({ trigger: item, start: 'top 62%', onEnter: function () { item.classList.add('is-on'); }, onLeaveBack: function () { item.classList.remove('is-on'); } });
      });
    }

    // Paper → ink inversion before contact, then the headline
    var contact = $('.contact');
    if (contact) {
      gsap.fromTo('.contact__bg', { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: contact, start: 'top 95%', end: 'top 55%', scrub: true }
      });
      var title = $('[data-chars]');
      var chars = splitInto(title, 'char');
      title.style.visibility = 'visible';
      gsap.from(chars, {
        yPercent: 60, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.03,
        scrollTrigger: { trigger: title, start: 'top 80%', once: true }
      });
      gsap.from('.contact__line, .contact__email, .contact__links', {
        opacity: 0, y: 16, duration: 0.9, ease: EASE, stagger: 0.1,
        scrollTrigger: { trigger: title, start: 'top 75%', once: true }
      });
    }

    // Cinematic layer: hero dolly, scenes rising into view, chapter numerals, contact push-in
    var hero = $('.hero');
    if (hero) {
      ST.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: function (self) { window.__heroDolly = self.progress; } });
      gsap.to('.hero__title', { yPercent: -22, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
    $$('.scene').forEach(function (frame) {
      gsap.fromTo(frame, { rotateX: 12, scale: 0.93, opacity: 0.35, transformPerspective: 1400, transformOrigin: '50% 100%' }, {
        rotateX: 0, scale: 1, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top 98%', end: 'top 50%', scrub: 0.6 }
      });
    });
    $$('.chapter__head').forEach(function (head) {
      var num = $('.chapter__num', head), title = $('.chapter__title', head);
      if (num) gsap.fromTo(num, { yPercent: 35, opacity: 0 }, { yPercent: -15, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: head, start: 'top 95%', end: 'bottom 20%', scrub: true } });
      if (title) gsap.fromTo(title, { clipPath: 'inset(0% 0% 100% 0%)', y: 40 }, {
        clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.1, ease: EASE, clearProps: 'clipPath,transform',
        scrollTrigger: { trigger: head, start: 'top 85%', once: true } });
    });
    var band = $('[data-band]');
    if (band) {
      var accent = band.getAttribute('data-accent');
      var bw = splitInto(band, 'word');
      var accentWords = (accent || '').split(/\s+/);
      bw.forEach(function (w) { if (accentWords.indexOf(w.textContent) !== -1) w.classList.add('grad'); });
      gsap.fromTo(bw, { opacity: 0.12, y: 24 }, { opacity: 1, y: 0, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: band, start: 'top 80%', end: 'center 50%', scrub: 0.6 } });
    }
    $$('.deck__card').forEach(function (c) {
      var d = Number(c.getAttribute('data-depth')) || 1;
      if (window.matchMedia('(min-width: 861px)').matches) {
        gsap.fromTo(c, { y: 90 * d }, { y: -50 * d, ease: 'none',
          scrollTrigger: { trigger: '.deck', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      }
    });

    if (contact) {
      gsap.fromTo('.contact__title', { scale: 0.82, transformOrigin: '0% 50%' }, { scale: 1, ease: 'none',
        scrollTrigger: { trigger: contact, start: 'top bottom', end: 'top 25%', scrub: 0.6 } });
    }

    // Fonts can change line breaks: refresh once they are in
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { splitLines(heroTitle); ST.refresh(); });
    }

  }

  function initDiagram(gsap, ST) {
    var dg = $('[data-diagram]');
    if (!dg) return;
    var captions = $$('[data-step-caption]', dg);
    var steps = captions.map(function (c) { return Number(c.getAttribute('data-step-caption')); });
    var mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', function () {
      var svg = $('.dg__svg', dg);
      var draws = $$('.dg-draw', svg);
      var texts = $$('text', svg);
      var fades = $$('.dg-az, .dg-dash', svg);
      gsap.set(draws, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(texts.concat(fades), { opacity: 0 });
      dg.classList.add('is-live');

      function setActive(i) {
        captions.forEach(function (c, idx) { c.classList.toggle('is-active', idx === i); });
      }
      setActive(0);

      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: dg,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: function (self) {
            setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999)));
          }
        }
      });
      steps.forEach(function (n) {
        var g = $$('.dg-step[data-step="' + n + '"]', svg);
        var d = [], t = [], f = [];
        g.forEach(function (grp) {
          d = d.concat($$('.dg-draw', grp));
          t = t.concat($$('text', grp));
          f = f.concat($$('.dg-az, .dg-dash', grp));
        });
        var label = 's' + n;
        tl.addLabel(label);
        tl.to(d, { strokeDashoffset: 0, duration: 1, stagger: 0.04 }, label);
        if (f.length) tl.to(f, { opacity: 1, duration: 0.6 }, label + '+=0.3');
        tl.to(t, { opacity: 1, duration: 0.5, stagger: 0.02 }, label + '+=0.4');
      });
      tl.to({}, { duration: 0.4 }); // a short hold on the finished diagram

      return function () {
        dg.classList.remove('is-live');
        captions.forEach(function (c) { c.classList.remove('is-active'); });
        gsap.set(draws.concat(texts, fades), { clearProps: 'all' });
      };
    });
  }

  /* ---------- Cursor spotlight on cards and scenes ---------- */
  function initSpotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    $$('.pillar, .cert, .scene, .metric').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('pointerleave', function () { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
    });
  }

  /* ---------- Dynamic facts: years of experience, copyright year, last updated ----------
     The HTML holds today's values as a fallback; these keep them true as time passes. */
  function initDynamic() {
    var now = new Date();
    var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    $$('[data-years-since]').forEach(function (el) {
      var parts = el.getAttribute('data-years-since').split('-');
      var start = new Date(Number(parts[0]), Number(parts[1] || 1) - 1, 1);
      var years = now.getFullYear() - start.getFullYear() - (now.getMonth() < start.getMonth() ? 1 : 0);
      if (!(years > 0)) return;
      var word = WORDS[years] || String(years);
      el.textContent = el.getAttribute('data-years-style') === 'word-cap' ? word.charAt(0).toUpperCase() + word.slice(1) : String(years);
    });
    $$('[data-year]').forEach(function (el) { el.textContent = String(now.getFullYear()); });
    // The server's Last-Modified date for this page, i.e. when it was last deployed
    var mod = new Date(document.lastModified);
    if (!isNaN(mod) && Math.abs(now - mod) > 60000) {
      $$('[data-updated]').forEach(function (el) { el.textContent = mod.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); });
    }
  }

  /* ---------- Back to top: one gentle, eased glide (longer pages take a little longer) ---------- */
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function scrollToTop() {
    var y = window.scrollY || 0;
    var wordmark = $('.wordmark');
    holdMasthead(2600);
    var done = function () { if (wordmark) wordmark.focus({ preventScroll: true }); };
    if (prefersReduced || y < 2) { window.scrollTo(0, 0); done(); return; }
    var duration = Math.min(2.2, Math.max(1.1, 0.8 + y / 6000));
    if (lenis) lenis.scrollTo(0, { duration: duration, easing: easeInOutCubic, onComplete: done });
    else {
      var start = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - start) / (duration * 1000));
        window.scrollTo(0, Math.round(y * (1 - easeInOutCubic(k))));
        if (k < 1) requestAnimationFrame(step); else done();
      })(start);
    }
  }

  /* Floating button: appears after the first screen; its ring fills with reading progress */
  function initToTop() {
    var btn = $('[data-to-top]');
    if (!btn) return;
    var ring = $('.ring', btn), ticking = false;
    // At the very bottom the footer's own "Back to top" link takes over, so the button steps aside
    var footerInView = false, footer = $('.footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { footerInView = e[0].isIntersecting; update(); }).observe(footer);
    }
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY || 0;
      btn.classList.toggle('is-shown', y > window.innerHeight * 0.9 && !footerInView);
      if (ring) ring.style.strokeDashoffset = String(1 - (max > 0 ? Math.min(1, y / max) : 0));
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    btn.addEventListener('click', scrollToTop);
    update();
  }

  /* ---------- The record: tap or click a figure to open its detail (hover does it on desktop) ---------- */
  function initMetrics() {
    var tiles = $$('.metric');
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        var open = !t.classList.contains('is-open');
        tiles.forEach(function (o) { o.classList.remove('is-open'); o.setAttribute('aria-expanded', 'false'); });
        t.classList.toggle('is-open', open);
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    window.__siteReady = true;
    introDelay = initIntro();
    initDynamic();
    initTheme();
    initMasthead();
    initAnchors();
    initMenu();
    initCopy();
    initScenes();
    initSceneTabs();
    initSkillmap();
    initHeroField();
    initSpotlight();
    initDeck();
    initToTop();
    initMetrics();

    var canAnimate = !prefersReduced && window.gsap && window.ScrollTrigger;
    if (canAnimate) {
      try { initMotion(); }
      catch (e) { root.classList.remove('motion'); }
    } else {
      root.classList.remove('motion');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
