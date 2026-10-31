/* CET-6 · 阅读层运行脚本：译文/高亮开关、阅读进度、回到顶部、锚点展开
   真题页外链引用；每日文章页在构建时内联进页面（桌面单文件也要能跑）。 */
(function () {
  'use strict';
  var body = document.body;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    body.classList.toggle('scrolled', y > 6);
    var bar = document.querySelector('.rdbar i');
    if (bar) {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    }
    var top = document.getElementById('topBtn');
    if (top) top.classList.toggle('on', y > 700);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 按钮：data-act = zh | mark | open | close */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'zh') {
      var off = body.classList.toggle('no-zh');
      b.setAttribute('aria-pressed', String(off));
      var lab = b.querySelector('.lab');
      if (lab) lab.textContent = off ? '显示译文' : '隐藏译文';
    } else if (act === 'mark') {
      var off2 = body.classList.toggle('no-mark');
      b.setAttribute('aria-pressed', String(off2));
      var lab2 = b.querySelector('.lab');
      if (lab2) lab2.textContent = off2 ? '显示高亮' : '隐藏高亮';
    } else if (act === 'open') {
      document.querySelectorAll('details.setblk').forEach(function (d) { d.open = true; });
    } else if (act === 'close') {
      document.querySelectorAll('details.setblk').forEach(function (d) { d.open = false; });
    } else if (act === 'top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* 锚点：展开祖先 details 再滚动 */
  function openHash() {
    if (!location.hash) return;
    var el = null;
    try { el = document.querySelector(location.hash); } catch (err) { return; }
    if (!el) return;
    var d = el.closest('details');
    if (d) d.open = true;
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  addEventListener('hashchange', openHash);
  openHash();
})();
