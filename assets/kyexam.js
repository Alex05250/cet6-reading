/* 考研真题页：吸顶导航右上角「回到顶部」的显隐与点击。
   只在 kaoyan-exams.html 与 kaoyan-exams/<year>.html 引用；
   CET-6 侧由 app.js / ky-core.js 负责同一套 body.deep 逻辑，互不影响。 */
(function () {
  'use strict';
  var body = document.body;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    body.classList.toggle('deep', y > 480);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.topbtn') : null;
    if (!b) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
