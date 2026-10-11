/* 独立游戏美术资产包 · 全流程工作台 — 交互逻辑 */
(function () {
  'use strict';

  var KEY = 'apwb_v1';
  var memory = {};
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return memory; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { memory = state; }
  }

  /* ---------- 清单勾选 ---------- */
  var cbs = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-k]'));
  cbs.forEach(function (cb) {
    cb.checked = !!state['c_' + cb.getAttribute('data-k')];
    cb.addEventListener('change', function () {
      state['c_' + cb.getAttribute('data-k')] = cb.checked;
      save();
      refreshProgress();
    });
  });

  function refreshProgress() {
    // 分组计数
    Array.prototype.forEach.call(document.querySelectorAll('.card.group'), function (card) {
      var items = card.querySelectorAll('input[type="checkbox"]');
      var done = card.querySelectorAll('input[type="checkbox"]:checked');
      var cnt = card.querySelector('.gcount');
      if (cnt && items.length) cnt.textContent = done.length + '/' + items.length;
    });
    // 阶段进度
    var totalAll = 0, doneAll = 0;
    Array.prototype.forEach.call(document.querySelectorAll('section.phase[data-phase]'), function (sec) {
      var ph = sec.getAttribute('data-phase');
      var items = sec.querySelectorAll('input[type="checkbox"]');
      var done = sec.querySelectorAll('input[type="checkbox"]:checked');
      totalAll += items.length;
      doneAll += done.length;
      var pct = items.length ? Math.round(done.length / items.length * 100) : 0;
      var fill = document.querySelector('[data-phase-fill="' + ph + '"]');
      var pctEl = document.querySelector('[data-phase-pct="' + ph + '"]');
      var prog = document.querySelector('[data-phprog="' + ph + '"]');
      if (fill) fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      if (prog) prog.textContent = done.length + ' / ' + items.length;
    });
    var overall = totalAll ? Math.round(doneAll / totalAll * 100) : 0;
    document.getElementById('overallFill').style.width = overall + '%';
    document.getElementById('overallLabel').textContent = '总进度 ' + overall + '%';
  }

  /* ---------- 字段持久化 ---------- */
  function fields() { return document.querySelectorAll('[data-s]'); }
  Array.prototype.forEach.call(fields(), function (el) {
    var k = 'f_' + el.getAttribute('data-s');
    if (state[k] !== undefined) el.value = state[k];
    el.addEventListener('input', function () {
      state[k] = el.value;
      save();
      var mode = el.getAttribute('data-calc');
      if (mode === 'price') calcPrice();
      if (mode === 'goal') calcGoal();
      if (el.id.indexOf('m_') === 0) calcMetrics();
    });
  });

  function num(id) {
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? 0 : v;
  }
  function fmt(n) {
    if (!isFinite(n)) return '–';
    return Math.round(n * 100) / 100;
  }

  /* ---------- 定价计算器 ---------- */
  function calcPrice() {
    var cost = num('c_hours') * num('c_rate') + num('c_cost');
    var fee = Math.min(Math.max(num('c_fee'), 0), 90) / 100;
    var price = num('c_price');
    var net = price * (1 - fee);

    document.getElementById('o_cost').textContent = cost > 0 ? '¥' + fmt(cost) : '–';

    var lo = cost * 2.2, hi = cost * 3.5;
    document.getElementById('o_range').textContent = cost > 0 ? '¥' + fmt(lo) + ' ~ ' + fmt(hi) : '–';

    var netEl = document.getElementById('o_net');
    if (price > 0) {
      netEl.textContent = '¥' + fmt(net);
      netEl.parentElement.classList.toggle('green', net > 0);
    } else { netEl.textContent = '–'; }

    var be = document.getElementById('o_breakeven');
    if (price > 0 && net > 0) {
      be.textContent = Math.ceil(cost / net) + ' 单';
    } else { be.textContent = '–'; }
  }

  /* ---------- 收入目标倒推 ---------- */
  function calcGoal() {
    var target = num('g_target');
    var price = num('g_price');
    var fee = Math.min(Math.max(num('g_fee'), 0), 90) / 100;
    var net = price * (1 - fee);

    var gs = document.getElementById('o_gsales');
    if (target > 0 && net > 0) gs.textContent = Math.ceil(target / net) + ' 单';
    else gs.textContent = '–';

    var gd = document.getElementById('o_gdaily');
    if (target > 0 && net > 0) gd.textContent = fmt(Math.ceil(target / net) / 30) + ' 单/天';
    else gd.textContent = '–';

    var gv = document.getElementById('o_gviews');
    if (target > 0 && net > 0) {
      var sales = Math.ceil(target / net);
      gv.textContent = Math.ceil(sales / 0.02).toLocaleString() + ' 次';
    } else { gv.textContent = '–'; }
  }

  /* ---------- 复盘数据指标 ---------- */
  function calcMetrics() {
    var pv = num('m_pv'), sales = num('m_sales'), rev = num('m_rev'), refund = num('m_refund');
    document.getElementById('m_conv').textContent = pv > 0 ? fmt(sales / pv * 100) + '%' : '–';
    document.getElementById('m_aov').textContent = sales > 0 ? '¥' + fmt(rev / sales) : '–';
    document.getElementById('m_refrate').textContent = sales > 0 ? fmt(refund / sales * 100) + '%' : '–';
  }

  /* ---------- 复盘生成器 ---------- */
  function lines(t) {
    return (t || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function mdList(arr) {
    return arr.length ? arr.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') : '（待补充）';
  }
  document.getElementById('r_gen').addEventListener('click', function () {
    var pkg = document.getElementById('m_pkg').value.trim() || '未命名资产包';
    var period = document.getElementById('m_period').value.trim() || '本期';
    var pv = num('m_pv'), sales = num('m_sales'), rev = num('m_rev'), refund = num('m_refund');
    var conv = pv > 0 ? fmt(sales / pv * 100) + '%' : '–';
    var out =
      '# 资产包复盘：' + pkg + '（' + period + '）\n\n' +
      '## 核心数据\n' +
      '- 浏览量：' + (pv || '–') + '　收藏：' + (num('m_fav') || '–') + '\n' +
      '- 销量：' + (sales || '–') + ' 单　收入：¥' + (rev || '0') + '\n' +
      '- 转化率：' + conv + '　退款：' + (refund || '0') + ' 单\n\n' +
      '## 做得好\n' + mdList(lines(document.getElementById('r_good').value)) + '\n\n' +
      '## 待改进\n' + mdList(lines(document.getElementById('r_bad').value)) + '\n\n' +
      '## 下一包行动\n' + mdList(lines(document.getElementById('r_next').value)) + '\n';
    document.getElementById('r_out').textContent = out;
  });

  /* ---------- 复制按钮 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy'));
      if (!target) return;
      var text = target.textContent;

      // 视觉反馈：点击立即显示，与复制结果解耦
      var old = btn.textContent;
      btn.textContent = '已复制';
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = old; }, 1400);

      // 执行复制：优先 Clipboard API，失败回退 execCommand
      function legacyCopy() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        return ok;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { legacyCopy(); });
      } else {
        legacyCopy();
      }
    });
  });

  /* ---------- 重置 ---------- */
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (confirm('确定清空所有勾选进度与填写数据吗？此操作不可恢复。')) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    }
  });

  /* ---------- 初始化 ---------- */
  refreshProgress();
  calcPrice();
  calcGoal();
  calcMetrics();
})();
