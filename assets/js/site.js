/* ============================================================
   Isabel Sufficool — portfolio
   Motion: reveals, horizontal gallery, cursor, phase nav
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- reveal on scroll ---------- */
  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- horizontal gallery ----------
     Paging, not per-frame scrolling. The previous version eased
     rail.scrollLeft on every animation frame and then read offsetLeft /
     offsetWidth / getBoundingClientRect() in the same frame, forcing a
     synchronous layout each time. Now a wheel gesture picks a panel and
     the browser animates there natively, and all geometry is cached. */
  function initGallery() {
    var rail = document.querySelector('.gallery');
    if (!rail) return;

    var horizontal = window.matchMedia('(min-width: 861px) and (hover: hover)');
    var panels = Array.prototype.slice.call(rail.querySelectorAll('.panel'));
    var fill = document.querySelector('.rail__fill');
    var count = document.querySelector('.rail__count');
    var prevBtn = document.querySelector('[data-nav="prev"]');
    var nextBtn = document.querySelector('[data-nav="next"]');
    var shots = Array.prototype.slice.call(rail.querySelectorAll('.card__shot img'));

    /* ---- cached geometry: measured on load and resize only ---- */
    var geo = [], railW = 0, maxX = 0;
    function measure() {
      railW = rail.clientWidth;
      maxX = Math.max(0, rail.scrollWidth - railW);
      geo = panels.map(function (p) {
        return { left: p.offsetLeft, width: p.offsetWidth, on: p.getAttribute('data-on'),
                 stage: p.getAttribute('data-stage'), index: p.getAttribute('data-index') };
      });
    }

    function clamp(i) { return Math.max(0, Math.min(panels.length - 1, i)); }

    function indexAt(x) {
      var mid = x + railW / 2;
      for (var i = 0; i < geo.length; i++) {
        if (geo[i].left <= mid && geo[i].left + geo[i].width >= mid) return i;
      }
      return x <= 0 ? 0 : panels.length - 1;
    }

    function targetFor(i) {
      var g = geo[i];
      return Math.max(0, Math.min(maxX, g.left - (railW - g.width) / 2));
    }

    function goTo(i, instant) {
      i = clamp(i);
      rail.scrollTo({ left: targetFor(i), behavior: (instant || reduced) ? 'auto' : 'smooth' });
    }

    /* ---- paint: no layout reads, only cached values ---- */
    var lastPx = [];
    function paint() {
      var x = rail.scrollLeft;
      if (fill) fill.style.width = (maxX > 0 ? (x / maxX) * 100 : 0).toFixed(2) + '%';

      var i = indexAt(x), g = geo[i];
      if (g.stage) document.documentElement.style.setProperty('--stage', g.stage);
      if (g.on) document.documentElement.setAttribute('data-stage-on', g.on);
      if (count && g.index) count.textContent = g.index;
      if (prevBtn) prevBtn.disabled = x <= 2;
      if (nextBtn) nextBtn.disabled = x >= maxX - 2;

      if (!reduced && horizontal.matches) {
        var center = x + railW / 2;
        for (var j = 0; j < shots.length; j++) {
          var host = shots[j].closest('.panel');
          if (!host) continue;
          var k = panels.indexOf(host);
          if (k < 0) continue;
          var pc = geo[k].left + geo[k].width / 2;
          var px = ((pc - center) / railW) * -22;
          if (lastPx[j] === undefined || Math.abs(px - lastPx[j]) > 0.5) {
            shots[j].style.setProperty('--px', px.toFixed(1) + 'px');
            lastPx[j] = px;
          }
        }
      }
    }

    var ticking = false;
    rail.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(function () { ticking = false; paint(); }); }
    }, { passive: true });

    /* ---- wheel: one gesture moves one panel ---- */
    var lock = false;
    rail.addEventListener('wheel', function (e) {
      if (!horizontal.matches) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // real sideways swipe: let it through

      var x = rail.scrollLeft;
      if ((x >= maxX - 2 && e.deltaY > 0) || (x <= 2 && e.deltaY < 0)) return; // release to the page

      e.preventDefault();
      if (lock || Math.abs(e.deltaY) < 4) return;
      lock = true;
      goTo(indexAt(x) + (e.deltaY > 0 ? 1 : -1));
      setTimeout(function () { lock = false; }, 420);
    }, { passive: false });

    /* ---- arrows ---- */
    function step(dir) { return function () { goTo(indexAt(rail.scrollLeft) + dir); }; }
    if (prevBtn) prevBtn.addEventListener('click', step(-1));
    if (nextBtn) nextBtn.addEventListener('click', step(1));

    /* ---- keyboard ---- */
    rail.addEventListener('keydown', function (e) {
      if (!horizontal.matches) return;
      var i = indexAt(rail.scrollLeft);
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { goTo(i + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { goTo(i - 1); e.preventDefault(); }
      else if (e.key === 'Home') { goTo(0); e.preventDefault(); }
      else if (e.key === 'End') { goTo(panels.length - 1); e.preventDefault(); }
    });

    /* ---- stacked (mobile): paint each panel, stage cannot morph ---- */
    function syncStacked() {
      var stacked = !horizontal.matches;
      panels.forEach(function (p) {
        p.style.backgroundColor = stacked ? (p.getAttribute('data-stage') || '') : '';
      });
      if (stacked) document.documentElement.removeAttribute('data-stage-on');
    }

    function refresh() { measure(); syncStacked(); paint(); }
    refresh();
    window.addEventListener('resize', refresh);
    if (horizontal.addEventListener) horizontal.addEventListener('change', refresh);
  }

  /* ---------- custom cursor ---------- */
  function initCursor() {
    if (!fine || reduced) return;
    var el = document.createElement('div');
    el.className = 'cursor';
    el.innerHTML = '<span class="cursor__label"></span>';
    document.body.appendChild(el);
    var label = el.querySelector('.cursor__label');

    /* Pinned to the pointer, not eased toward it. The previous 0.18 lerp
       made the ring trail behind the cursor, so moving rightward across a
       card left it sitting to the left of what you were pointing at. */
    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var queued = false;

    function place() {
      queued = false;
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    }

    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      el.classList.add('is-live');
      if (!queued) { queued = true; window.requestAnimationFrame(place); }
    }, { passive: true });

    document.querySelectorAll('[data-cursor]').forEach(function (target) {
      target.addEventListener('mouseenter', function () {
        el.classList.add('is-lg');
        label.textContent = target.getAttribute('data-cursor');
      });
      target.addEventListener('mouseleave', function () {
        el.classList.remove('is-lg');
        label.textContent = '';
      });
    });
  }

  /* ---------- phase nav (case studies) ---------- */
  function initPhaseNav() {
    var nav = document.querySelector('.phase-nav');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- count-up on outcome stats ---------- */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) {
        // keep the suffix — the animated path appends it, this one must too
        n.textContent = n.getAttribute('data-count') + (n.getAttribute('data-suffix') || '');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var target = el.getAttribute('data-count');
        var suffix = el.getAttribute('data-suffix') || '';
        var num = parseFloat(target);
        if (isNaN(num)) { el.textContent = target; return; }
        var start = performance.now();
        var dur = 1100;
        (function step(now) {
          var t = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(num * eased) + suffix;
          if (t < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- boot ----------
     Each init is isolated: one failure must not leave the page blank,
     since `html.js .reveal` keeps content hidden until JS un-hides it. */
  function revealEverything() {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  function boot() {
    var steps = [initReveals, initGallery, initCursor, initPhaseNav, initCounters];
    for (var i = 0; i < steps.length; i++) {
      try { steps[i](); }
      catch (err) {
        if (window.console) console.error('site.js: ' + steps[i].name + ' failed', err);
        if (steps[i] === initReveals) revealEverything();
      }
    }
  }
  // last resort: if nothing has revealed shortly after load, the observer
  // never ran — show everything rather than leave the page blank
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (document.querySelector('.reveal') && !document.querySelector('.reveal.in')) {
        revealEverything();
      }
    }, 600);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
