/* CET-6 · 阅读层运行脚本：译文/高亮/答案开关、阅读进度、回到顶部、锚点展开
   真题页与真题试卷页外链引用；每日文章页在构建时内联进页面（桌面单文件也要能跑）。
   body[data-remember] 的页面会把「藏译文 / 藏答案」记在本机，翻上一套下一套时保持。 */
(function () {
  'use strict';
  var body = document.body;
  var STORE = 'cet6-read-prefs';
  var remember = body.hasAttribute('data-remember');

  var TOGGLES = {
    zh: { cls: 'no-zh', on: '显示译文', off: '隐藏译文' },
    fill: { cls: 'no-fill', on: '显示答案', off: '隐藏答案' },
    mark: { cls: 'no-mark', on: '显示高亮', off: '隐藏高亮' }
  };

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    body.classList.toggle('scrolled', y > 6);
    body.classList.toggle('deep', y > 480);
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

  /* 打开/关闭一个开关，并同步按钮的 aria-pressed 与文字 */
  function apply(key, on) {
    var t = TOGGLES[key];
    if (!t) return null;
    body.classList.toggle(t.cls, !!on);
    var b = document.querySelector('[data-act="' + key + '"]');
    if (b) {
      b.setAttribute('aria-pressed', String(!!on));
      var lab = b.querySelector('.lab');
      if (lab) lab.textContent = on ? t.on : t.off;
    }
    return !!on;
  }

  function savePrefs() {
    if (!remember) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({
        zh: body.classList.contains('no-zh'),
        fill: body.classList.contains('no-fill')
      }));
    } catch (e) { /* 隐私模式或 file:// 下忽略 */ }
  }

  function loadPrefs() {
    if (!remember) return;
    var p = null;
    try { p = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return; }
    if (!p) return;
    apply('zh', p.zh);
    apply('fill', p.fill);
  }
  loadPrefs();

  /* 按钮：data-act = zh | fill | mark | open | close | top；吸顶导航的 .topbtn 也回顶 */
  document.addEventListener('click', function (e) {
    var tb = e.target.closest ? e.target.closest('.topbtn') : null;
    if (tb) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (TOGGLES[act]) {
      apply(act, !body.classList.contains(TOGGLES[act].cls));
      savePrefs();
    } else if (act === 'open') {
      document.querySelectorAll('details.setblk').forEach(function (d) { d.open = true; });
    } else if (act === 'close') {
      document.querySelectorAll('details.setblk').forEach(function (d) { d.open = false; });
    } else if (act === 'top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* 锚点：展开祖先 details 再滚动（真题原锚点形如 #2023-06-1-A，选择器非法时跳过） */
  function openHash() {
    if (!location.hash) return;
    var el = null;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (err) { return; }
    if (!el) return;
    var d = el.closest('details');
    if (d) d.open = true;
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  addEventListener('hashchange', openHash);
  openHash();
})();
