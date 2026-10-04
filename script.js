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
      holdMasthead(2000);
      var offset = id === '#top' ? 0 : -($('.masthead__bar').offsetHeight + 8);
      if (lenis) {
        lenis.scrollTo(target, { offset: offset, duration: 1.2 });
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

  /* ---------- Recordings: lazy-load, play only when visible ----------
     A figure is "pending" until real <source data-src> elements are added.
     Swapping in a recording needs no JS or layout changes. */
  function initRecordings() {
    var saveData = navigator.connection && navigator.connection.saveData;
    $$('[data-rec]').forEach(function (fig) {
      var video = $('video', fig);
      var toggle = $('.rec__toggle', fig);
      var sources = $$('source[data-src]', video);
      if (!sources.length) return; // still pending: poster + "Recording coming"

      fig.classList.remove('is-pending');
      video.removeAttribute('aria-hidden');
      toggle.hidden = false;
      var loaded = false;
      var userPaused = prefersReduced || saveData;
      var visible = false;

      function load() {
        if (loaded) return;
        sources.forEach(function (s) { s.src = s.getAttribute('data-src'); });
        video.load();
        loaded = true;
      }
      function sync() {
        var paused = video.paused;
        toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
        toggle.setAttribute('aria-label', paused ? 'Play recording' : 'Pause recording');
      }
      function play() {
        load();
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }

      video.addEventListener('play', sync);
      video.addEventListener('pause', sync);
      sync();

      toggle.addEventListener('click', function () {
        if (video.paused) { userPaused = false; play(); }
        else { userPaused = true; video.pause(); }
      });

      if (!('IntersectionObserver' in window)) { if (!userPaused) play(); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible && !userPaused) play();
          else if (!visible && !video.paused) video.pause();
        });
      }, { threshold: 0.4 }).observe(fig);

      // Warm up the source slightly before it is needed
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting && !userPaused) { load(); obs.disconnect(); }
      }, { rootMargin: '400px 0px' }).observe(fig);
    });
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
    function px(x, z) { return cx + f * (x + sway) / z; }
    function py(z) { return hy + f * HC / z; }

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
      if (t >= nextRelease) { release(t); nextRelease = t + period; }
      draw(t, dt);
      raf = requestAnimationFrame(frame);
    }
    function update() {
      var should = onScreen && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    window.addEventListener('resize', resize);
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
      });
    }
    skills.forEach(bind);
    ctxs.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); bind(c); });
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
    var intro = gsap.timeline({ delay: 0.15 });
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

  /* ---------- Boot ---------- */
  function init() {
    window.__siteReady = true;
    initTheme();
    initMasthead();
    initAnchors();
    initMenu();
    initCopy();
    initRecordings();
    initSkillmap();
    initHeroField();

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
