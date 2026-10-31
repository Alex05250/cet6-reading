/* CET-6 · 站点层运行脚本：主页入场/滚动、目录页渲染 */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 导航描边 */
  function onScroll() {
    document.body.classList.toggle('scrolled', (window.scrollY || 0) > 6);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 错峰入场 */
  function reveal(sel) {
    var els = [].slice.call(document.querySelectorAll(sel));
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 1200);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = els.indexOf(en.target);
        setTimeout(function () { en.target.classList.add('in'); }, Math.min(i, 8) * 70);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 指针光泽 */
  function sheen(sel) {
    var wrap = document.querySelector(sel);
    if (!wrap) return;
    wrap.addEventListener('pointermove', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* 数字滚动 */
  function countTo(el, to) {
    var from = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10) || 0;
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    if (from === to || reduce) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / 720), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  document.querySelectorAll('.tile-num b[data-count]').forEach(function (el) {
    var to = parseInt(el.getAttribute('data-count'), 10);
    if (!isNaN(to)) countTo(el, to);
  });

  reveal('.tile');
  reveal('.rowline');
  sheen('.tiles');

  /* 每日目录 / 首页最新一期：读 manifest.json */
  var list = document.getElementById('list');
  var live = document.getElementById('liveDay');
  if (!list && !live) return;

  fetch('manifest.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (rows) { render(rows || []); })
    .catch(function () { render([]); });

  function render(rows) {
    rows = (rows || []).filter(function (r) { return r && r.day; });
    rows.sort(function (a, b) { return (+b.day) - (+a.day); });

    if (live) {
      if (rows.length) {
        var t = rows[0];
        live.innerHTML = '最新 · Day ' + String(t.day).padStart(2, '0') + ' · ' +
          esc(t.date || '') + '<br>' + esc((t.title || '').slice(0, 62));
      } else {
        live.textContent = '等待第一篇';
      }
    }

    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="empty">还没有文章 · 每天 15:00 生成</div>';
      return;
    }
    list.innerHTML = rows.map(function (r) {
      var d = String(r.day).padStart(2, '0');
      return '<a class="rowline" href="cet6-day' + d + '.html">' +
        '<span class="dnum"><em>Day</em>' + d + '</span>' +
        '<span class="rmain"><strong>' + esc(r.title || '未命名') + '</strong>' +
        '<span class="rmeta">' + esc(r.date || '') + ' · 词汇嵌入 ' + esc(r.cover || '—') + '</span></span>' +
        '<span class="rgo">阅读 <svg class="arw" width="12" height="12" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 6l6 6-6 6"/></svg></span></a>';
    }).join('');
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
})();
