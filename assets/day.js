/* CET-6 词汇站 · 单天页：词表 / 闪卡 / 测验 / 助记 */
(function () {
  'use strict';
  const D = window.DAY_DATA;                 // [day, start, end, count, review, items, aids]
  const [DAY, START, END, COUNT, REVIEW, ITEMS, AIDS] = D;
  const $ = s => document.querySelector(s);

  /* ── 进度 ── */
  function refresh(animate) {
    const k = W.countDay(DAY);
    animate ? W.countTo($('#dDone'), k) : ($('#dDone').textContent = k);
    $('#dBar').style.width = (100 * k / COUNT).toFixed(1) + '%';
    $('#dPct').textContent = (Math.round(100 * k / COUNT)) + '%';
    // 分组 summary 同步
    document.querySelectorAll('details.group').forEach(g => {
      const gd = +g.dataset.g, part = ITEMS.slice(gd * 46, gd * 46 + 46);
      const n = part.filter(it => W.daySet(DAY).has(it[1])).length;
      const meta = g.querySelector('.gmeta');
      if (meta) meta.textContent = `${n}/${part.length} 已会`;
      const bar = g.querySelector('.gbar i');
      if (bar) bar.style.width = (100 * n / part.length).toFixed(0) + '%';
    });
    syncClear();
  }

  /* ── 词表 ── */
  const GROUP = 46;
  let blurred = false, built = new Set();

  function buildGroups() {
    const host = $('#groups');
    const parts = [];
    for (let i = 0; i < ITEMS.length; i += GROUP) {
      const g = i / GROUP;
      const part = ITEMS.slice(i, i + GROUP);
      const n = part.filter(x => W.daySet(DAY).has(x[1])).length;
      const w = (100 * n / part.length).toFixed(0);
      parts.push('<details class="group" data-g="' + g + '">'
        + '<summary><span class="gname">第 ' + (g + 1) + ' 组</span>'
        + '<span class="gmeta">' + n + '/' + part.length + ' 已会</span>'
        + '<span class="gbar"><i style="width:' + w + '%"></i></span>'
        + '<span class="chev">▶</span></summary>'
        + '<div class="rows" style="padding:0" data-host="' + g + '"></div>'
        + '</details>');
    }
    host.innerHTML = parts.join('');
    host.querySelectorAll('details.group').forEach(el => {
      el.addEventListener('toggle', () => {
        if (!el.open) return;
        const g = +el.dataset.g;
        if (built.has(g)) return;
        const part = ITEMS.slice(g * GROUP, g * GROUP + GROUP);
        el.querySelector('[data-host]').innerHTML =
          part.map((it, i) => W.rowHtml(DAY, it, i, { blur: blurred })).join('');
        built.add(g);
      });
    });
    // 默认展开第一组
    host.querySelector('details.group').open = true;
    host.querySelector('details.group').dispatchEvent(new Event('toggle'));
  }

  $('#blurBtn').onclick = () => {
    blurred = !blurred;
    $('#blurBtn').textContent = blurred ? '显示释义' : '遮住释义';
    document.querySelectorAll('.wrow').forEach(r => {
      r.classList.toggle('hide', blurred);
      r.classList.remove('show');
    });
  };

  /* ── 清空本页打勾（带回撤销）── */
  const clearBtn = $('#clearBtn');
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.innerHTML = '<span class="tmsg"></span><button class="tact" type="button"></button>';
  document.body.appendChild(toastEl);
  let toastTimer = 0;

  function hideToast() { toastEl.classList.remove('on'); }
  function toast(msg, actLabel, act) {
    toastEl.querySelector('.tmsg').textContent = msg;
    const b = toastEl.querySelector('.tact');
    b.textContent = actLabel || '';
    b.hidden = !actLabel;
    b.onclick = () => { hideToast(); if (act) act(); };
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, actLabel ? 7000 : 2600);
  }

  function syncClear() {
    clearBtn.disabled = !W.countDay(DAY);
  }

  function paintTicks() {
    const set = W.daySet(DAY);
    document.querySelectorAll('#groups .wrow').forEach(r => {
      r.classList.toggle('done', set.has(r.dataset.w));
    });
  }

  clearBtn.onclick = () => {
    const had = W.clearDay(DAY);
    if (!had.length) return;
    paintTicks();
    flash.reset();
    refresh(true);
    toast('已清空本页 ' + had.length + ' 个勾', '撤销', () => {
      W.addWords(DAY, had);
      paintTicks();
      flash.reset();
      refresh(true);
    });
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('.mark'); if (!b) return;
    const on = W.toggle(DAY, b.dataset.w);
    b.closest('.wrow').classList.toggle('done', on);
    refresh(true);
  });
  document.addEventListener('click', e => {
    const r = e.target.closest('.wrow.hide');
    if (r && !e.target.closest('button')) r.classList.toggle('show');
  });

  /* ── 闪卡 ── */
  const deck = ITEMS.map(it => [DAY, it[0], it[1], it[2], it[3]]);
  const flash = W.createFlash($('#p-card'), deck, { onChange: () => refresh(true) });

  /* ── 测验 ── */
  let qs = [], qi = 0, score = 0;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };

  function buildQuiz() {
    const pool = shuffle(ITEMS.slice()).slice(0, Math.min(10, ITEMS.length));
    qs = pool.map(it => {
      const others = shuffle(ITEMS.filter(x => x[1] !== it[1])).slice(0, 3);
      return { it, opts: shuffle([it].concat(others)) };
    });
    qi = 0; score = 0;
    $('#qAgain').style.display = 'none';
    drawQuiz();
  }

  const shortDef = it => {
    const s = it[3][0];
    const txt = s.slice(1).slice(0, 2).join('、');
    return s[0] + ' ' + (txt || '—');
  };

  function drawQuiz() {
    if (qi >= qs.length) {
      $('#qmeta').textContent = '完成';
      $('#qword').textContent = score + ' / ' + qs.length + ' 正确';
      $('#qipa').textContent = '';
      $('#opts').innerHTML = '';
      $('#score').textContent = score === qs.length ? '全对。可以收工了。' : '错的那几个去「卡片自测」再过一遍。';
      $('#qAgain').style.display = '';
      return;
    }
    const { it, opts } = qs[qi];
    $('#qmeta').textContent = `第 ${qi + 1} / ${qs.length} 题　·　得分 ${score}`;
    $('#qword').textContent = it[1];
    $('#qipa').textContent = it[2];
    $('#opts').innerHTML = opts.map(o =>
      `<button class="opt" data-w="${W.esc(o[1])}">${W.esc(shortDef(o))}</button>`).join('');
    $('#score').textContent = '';
    $('#opts').querySelectorAll('.opt').forEach(btn => {
      btn.onclick = () => {
        const right = btn.dataset.w === it[1];
        if (right) { score++; btn.classList.add('right'); W.toggle(DAY, it[1], true); }
        else {
          btn.classList.add('wrong');
          W.toggle(DAY, it[1], false);
          $('#opts').querySelectorAll('.opt').forEach(x => {
            if (x.dataset.w === it[1]) x.classList.add('right');
          });
        }
        refresh(true);
        $('#opts').querySelectorAll('.opt').forEach(x => x.disabled = true);
        setTimeout(() => { qi++; drawQuiz(); }, right ? 320 : 1100);
      };
    });
  }
  $('#qAgain').onclick = buildQuiz;

  /* ── 助记 ── */
  function buildAids() {
    const A = AIDS || {};
    let h = '';
    if (A.roots && A.roots.length) {
      h += '<h3>同词根成组</h3>' + A.roots.map(g =>
        `<div class="aidbox"><div class="head"><em>${W.esc(g.root)}</em> → ${W.esc(g.mean)}</div>
         <div class="ws">${(g.words || []).map(W.esc).join(' · ')}</div></div>`).join('');
    }
    if (A.confuse && A.confuse.length) {
      h += '<h3>形近易混</h3><div class="aidbox">' + A.confuse.map(p =>
        `<div class="pair"><b>${W.esc(p.a)}</b> ${W.esc(p.am)} ↔ <b>${W.esc(p.b)}</b> ${W.esc(p.bm)}</div>`).join('') + '</div>';
    }
    if (A.suffixes && A.suffixes.length) {
      h += '<h3>后缀家族</h3>' + A.suffixes.map(g =>
        `<div class="aidbox"><div class="head"><em>${W.esc(g.suffix)}</em> → ${W.esc(g.mean)}</div>
         <div class="ws">${(g.words || []).map(W.esc).join(' · ')}</div></div>`).join('');
    }
    h += '<h3>今日回顾</h3><div class="aidbox"><div class="ws">' +
      (REVIEW && REVIEW.length
        ? '回顾 Day ' + REVIEW.join('、Day ') + '：只看那些未打勾的词，每天十分钟就够。'
        : '今天是第一天，不用回顾，把节奏跑起来。') + '</div></div>';
    $('#aids').innerHTML = h;
  }

  /* ── 标签切换 ── */
  const panels = { list: $('#p-list'), card: $('#p-card'), quiz: $('#p-quiz'), aid: $('#p-aid') };
  document.querySelectorAll('.tabs button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      Object.keys(panels).forEach(k => panels[k].classList.toggle('on', k === b.dataset.t));
      if (b.dataset.t === 'card') flash.redraw();
      if (b.dataset.t === 'quiz' && !qs.length) buildQuiz();
      scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  /* ── 启动 ── */
  buildGroups();
  buildAids();
  refresh(true);
})();
