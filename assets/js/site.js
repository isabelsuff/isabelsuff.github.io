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

    /* translate vertical wheel into horizontal scroll — but release the
       wheel back to the page at either end so the footer stays reachable */
    function onWheel(e) {
      if (!horizontal.matches) return;
      // let real horizontal intent (trackpad swipe) pass through natively
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      var max = rail.scrollWidth - rail.clientWidth;
      var atEnd = rail.scrollLeft >= max - 2;
      var atStart = rail.scrollLeft <= 2;
      if ((atEnd && e.deltaY > 0) || (atStart && e.deltaY < 0)) return;

      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    }
    rail.addEventListener('wheel', onWheel, { passive: false });

    /* keyboard */
    rail.addEventListener('keydown', function (e) {
      if (!horizontal.matches) return;
      var step = rail.clientWidth * 0.8;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { rail.scrollLeft += step; e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { rail.scrollLeft -= step; e.preventDefault(); }
      if (e.key === 'Home') { rail.scrollLeft = 0; e.preventDefault(); }
      if (e.key === 'End') { rail.scrollLeft = rail.scrollWidth; e.preventDefault(); }
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

    /* parallax drift on the mockups */
    if (!reduced) {
      var shots = rail.querySelectorAll('.card__shot img');
      rail.addEventListener('scroll', function () {
        if (!horizontal.matches) return;
        window.requestAnimationFrame(function () {
          shots.forEach(function (img) {
            var card = img.closest('.panel');
            if (!card) return;
            var rect = card.getBoundingClientRect();
            var off = (rect.left + rect.width / 2 - window.innerWidth / 2) / window.innerWidth;
            img.style.setProperty('--px', (off * -22).toFixed(2) + 'px');
          });
        });
      }, { passive: true });
    }
  }

  /* ---------- custom cursor ---------- */
  function initCursor() {
    if (!fine || reduced) return;
    var el = document.createElement('div');
    el.className = 'cursor';
    el.innerHTML = '<span class="cursor__label"></span>';
    document.body.appendChild(el);
    var label = el.querySelector('.cursor__label');

    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var cx = x, cy = y;

    document.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; });

    (function loop() {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)';
      window.requestAnimationFrame(loop);
    })();

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
      nums.forEach(function (n) { n.textContent = n.getAttribute('data-count'); });
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

  /* ---------- boot ---------- */
  function boot() {
    initReveals();
    initGallery();
    initCursor();
    initPhaseNav();
    initCounters();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
