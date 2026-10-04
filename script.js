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
        gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.12, overwrite: true });
      }
    });
    $$('[data-rule]').forEach(function (r) {
      gsap.to(r, { scaleX: 1, duration: 1, ease: 'power2.inOut', scrollTrigger: { trigger: r, start: 'top 90%', once: true } });
    });

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
