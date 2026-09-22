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

  /* ---------- horizontal gallery ---------- */
  function initGallery() {
    var rail = document.querySelector('.gallery');
    if (!rail) return;

    var horizontal = window.matchMedia('(min-width: 861px) and (hover: hover)');
    var panels = Array.prototype.slice.call(rail.querySelectorAll('.panel'));
    var fill = document.querySelector('.rail__fill');
    var count = document.querySelector('.rail__count');
    var shots = rail.querySelectorAll('.card__shot img');

    /* Wheel -> horizontal.
       Previously this wrote rail.scrollLeft on every wheel event, which
       fought `scroll-snap-type: mandatory` and made reversing direction
       stutter. Now the wheel only moves a target and one rAF loop eases
       toward it, so snapping never competes with the input. */
    var target = rail.scrollLeft;
    var animating = false;

    function maxScroll() { return rail.scrollWidth - rail.clientWidth; }

    function ease() {
      var diff = target - rail.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        rail.scrollLeft = target;
        animating = false;
        rail.classList.remove('is-gliding');
        return;
      }
      rail.scrollLeft += diff * 0.16;
      window.requestAnimationFrame(ease);
    }

    function glide(delta) {
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (!animating) {
        animating = true;
        rail.classList.add('is-gliding');
        window.requestAnimationFrame(ease);
      }
    }

    function onWheel(e) {
      if (!horizontal.matches) return;
      // let real horizontal intent (trackpad swipe) pass through natively
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      var atEnd = rail.scrollLeft >= maxScroll() - 2;
      var atStart = rail.scrollLeft <= 2;
      if ((atEnd && e.deltaY > 0) || (atStart && e.deltaY < 0)) {
        animating = false;
        target = rail.scrollLeft;
        return; // release the wheel to the page so the footer stays reachable
      }

      e.preventDefault();
      // resync if the user scrolled by other means since the last glide
      if (!animating) target = rail.scrollLeft;
      glide(e.deltaY * 1.1);
    }
    rail.addEventListener('wheel', onWheel, { passive: false });

    // a real horizontal swipe scrolls natively; keep our target in step
    rail.addEventListener('scroll', function () {
      if (!animating) target = rail.scrollLeft;
    }, { passive: true });

    /* keyboard */
    rail.addEventListener('keydown', function (e) {
      if (!horizontal.matches) return;
      var step = rail.clientWidth * 0.8;
      if (!animating) target = rail.scrollLeft;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { glide(step); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { glide(-step); e.preventDefault(); }
      if (e.key === 'Home') { target = 0; glide(0); e.preventDefault(); }
      if (e.key === 'End') { target = maxScroll(); glide(0); e.preventDefault(); }
    });

    /* progress + background morph */
    var ticking = false;
    function update() {
      ticking = false;
      var max = rail.scrollWidth - rail.clientWidth;
      var pct = max > 0 ? rail.scrollLeft / max : 0;
      if (fill) fill.style.width = (pct * 100).toFixed(2) + '%';

      // which panel is centred
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var active = null;
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (p.offsetLeft <= mid && p.offsetLeft + p.offsetWidth >= mid) { active = p; break; }
      }
      if (!active) return;

      var stage = active.getAttribute('data-stage');
      if (stage) document.documentElement.style.setProperty('--stage', stage);

      var idx = active.getAttribute('data-index');
      if (count && idx) count.textContent = idx;

      panels.forEach(function (p) { p.classList.toggle('is-active', p === active); });

      // parallax, folded into this same frame rather than a second listener
      if (!reduced && horizontal.matches) {
        for (var j = 0; j < shots.length; j++) {
          var img = shots[j];
          var host = img.closest('.panel');
          if (!host) continue;
          var r = host.getBoundingClientRect();
          var off = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth;
          img.style.setProperty('--px', (off * -22).toFixed(2) + 'px');
        }
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    /* stacked (mobile) mode: the stage can't morph, so paint each panel */
    function syncStacked() {
      var stacked = !horizontal.matches;
      panels.forEach(function (p) {
        p.style.backgroundColor = stacked ? (p.getAttribute('data-stage') || '') : '';
      });
    }
    syncStacked();
    if (horizontal.addEventListener) horizontal.addEventListener('change', syncStacked);

    rail.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
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
