/* CET-6 词汇站 · 共享运行层 */
(function (global) {
  'use strict';
  const LS = n => 'cet6-day-' + n;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ── 进度存取：key 与原版一致 cet6-day-N ── */
  const doneCache = new Map();
  function daySet(d) {
    if (!doneCache.has(d)) {
      let o = {};
      try { o = JSON.parse(localStorage.getItem(LS(d)) || '{}') || {}; } catch (e) { o = {}; }
      doneCache.set(d, new Set(Object.keys(o).filter(k => o[k])));
    }
    return doneCache.get(d);
  }
  function saveDay(d) {
    const o = {};
    daySet(d).forEach(w => { o[w] = true; });
    try { localStorage.setItem(LS(d), JSON.stringify(o)); } catch (e) {}
  }
  function toggle(d, w, on) {
    const s = daySet(d);
    const next = (on === undefined) ? !s.has(w) : !!on;
    next ? s.add(w) : s.delete(w);
    saveDay(d);
    return next;
  }
  function countDay(d) { return daySet(d).size; }

  /* ── 数字滚动 ── */
  function countTo(el, to, dur) {
    dur = dur || 620;
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to || reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ── 词条渲染：item = [n, w, ipa, [[pos, ...defs], ...], aid?] ── */
  function rowHtml(day, item, i, opts) {
    opts = opts || {};
    const [n, w, ipa, senses, aid] = item;
    const on = daySet(day).has(w);
    const sensesHtml = senses.map(s => {
      const pos = s[0], defs = s.slice(1);
      const body = defs.length
        ? defs.map(esc).join('<span class="sep">·</span>')
        : '<span style="color:var(--faint)">—</span>';
      return `<div class="sline"><span class="pos">${esc(pos)}</span><span class="defs">${body}</span></div>`;
    }).join('');
    const aidHtml = (opts.showAid && aid) ? `<div class="aid">${esc(aid)}</div>` : '';
    return `<div class="wrow${on ? ' done' : ''}${opts.blur ? ' hide' : ''}" style="--i:${Math.min(i || 0, 26)}" data-w="${esc(w)}">
      <div>
        <div class="head"><span class="w">${esc(w)}</span><span class="ipa">${esc(ipa)}</span></div>
        <div class="senses">${sensesHtml}</div>${aidHtml}
      </div>
      <button class="mark" data-d="${day}" data-w="${esc(w)}" aria-label="标记已会">✓</button>
    </div>`;
  }

  /* ── 闪卡组件 ── */
  function createFlash(root, deck, opts) {
    opts = opts || {};
    let ci = 0, flip = false, pool = deck.slice();
    const $ = s => root.querySelector(s);
    const card = $('#fcard');
    function draw() {
      if (!pool.length) {
        $('#fw').textContent = '没有词';
        $('#fi').textContent = '';
        $('#bw').textContent = '';
        $('#bi').textContent = '';
        $('#bm').textContent = '';
        return;
      }
      const r = pool[ci % pool.length];
      const [d, n, w, ipa, senses] = r;
      const sub = (ipa || '') + '　·　Day ' + String(d).padStart(2, '0');
      $('#fw').textContent = w; $('#fi').textContent = sub;
      $('#bw').textContent = w; $('#bi').textContent = sub;
      $('#bm').textContent = senses.map(s => s[0] + ' ' + s.slice(1).join('、')).join('\n');
      $('#fmeta').textContent = (ci % pool.length + 1) + ' / ' + pool.length + (opts.label ? '　' + opts.label() : '');
    }
    function advance(known) {
      const r = pool[ci % pool.length];
      if (r) {
        toggle(r[0], r[2], known);
        if (opts.onChange) opts.onChange(r[0]);
      }
      ci++; flip = false; card.classList.remove('flip');
      setTimeout(draw, 60);
    }
    card.onclick = () => { flip = !flip; card.classList.toggle('flip', flip); };
    card.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); card.onclick(); } };
    $('#fYes').onclick = () => advance(true);
    $('#fNo').onclick = () => advance(false);
    $('#fShuffle').onclick = () => { pool.sort(() => Math.random() - .5); ci = 0; flip = false; card.classList.remove('flip'); draw(); };
    if ($('#fClose')) $('#fClose').onclick = () => root.classList.remove('on');
    if ($('#fWeak')) $('#fWeak').onclick = () => {
      const weak = !opts.weakActive;
      opts.weakActive = weak;
      pool = weak ? deck.filter(r => !daySet(r[0]).has(r[2])) : deck.slice();
      if (!pool.length) pool = deck.slice();
      ci = 0; flip = false; card.classList.remove('flip');
      $('#fWeak').textContent = weak ? '练全部' : '只练未熟';
      draw();
    };
    draw();
    return { redraw: draw, open() { ci = 0; flip = false; card.classList.remove('flip'); draw(); } };
  }

  /* ── 卡片错峰入场 ── */
  function revealCards(sel) {
    const cards = [].slice.call(document.querySelectorAll(sel));
    // 兜底：观察器不可用或回调被裁掉时，卡片绝不能停在 opacity:0
    setTimeout(() => cards.forEach(c => c.classList.add('in')), 900);
    if (reduce || !('IntersectionObserver' in window)) { cards.forEach(c => c.classList.add('in')); return; }
    const io = new IntersectionObserver(es => {
      es.forEach(en => {
        if (!en.isIntersecting) return;
        const i = cards.indexOf(en.target);
        setTimeout(() => en.target.classList.add('in'), Math.min(i, 22) * 38);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    cards.forEach(c => io.observe(c));
  }

  document.addEventListener('scroll', () => {
    document.body.classList.toggle('scrolled', scrollY > 6);
  }, { passive: true });

  global.W = { LS, esc, reduce, sleep, daySet, saveDay, toggle, countDay, countTo, rowHtml, createFlash, revealCards };
})(window);
