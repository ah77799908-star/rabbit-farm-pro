/* ui.js — الهيكل والواجهة: الغلاف، الرئيسية، الأرانب */
(function (root) {
  'use strict';
  var Core = root.Core, Store = root.Store;
  var S = function () { return Store.S; };
  var esc = Core.esc, fmt = Core.fmt, num = Core.num, today = Core.today;

  var UI = {
    tab: 'home',
    sub: { herd: 'does', log: 'all', health: 'inj', money: 'sales', more: 'reports' },
    q: '',
    moneyMonth: '',
    get S() { return Store.S; }
  };
  root.UI = UI;

  /* ---------- عناصر مساعدة ---------- */
  UI.toast = function (m, actionLabel, fn) {
    var e = document.createElement('div');
    e.className = 'toast';
    var span = document.createElement('span');
    span.textContent = m;
    e.appendChild(span);
    if (actionLabel && fn) {
      var b = document.createElement('button');
      b.className = 'toast-btn';
      b.textContent = actionLabel;
      b.onclick = function () { e.remove(); fn(); };
      e.appendChild(b);
    }
    document.body.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.remove(); }, actionLabel ? 6000 : 2200);
    return e;
  };

  UI.sheet = function (title, body, wide) {
    UI.closeS();
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.id = 'sh';
    bg.onclick = function (ev) { if (ev.target === bg) UI.closeS(); };
    var inner = document.createElement('div');
    inner.className = 'sheet' + (wide ? ' wide' : '');
    inner.innerHTML = '<div class="sheet-grip"></div><h2>' + title + '</h2>' + body;
    bg.appendChild(inner);
    document.body.appendChild(bg);
    return bg;
  };
  UI.closeS = function () { var e = document.getElementById('sh'); if (e) e.remove(); };

  UI.confirm = function (msg, onYes, yesLabel) {
    UI.sheet('تأكيد', '<p style="margin:0 0 14px">' + esc(msg) + '</p>' +
      '<div class="acts"><button class="btn d" id="cfy">' + esc(yesLabel || 'أيوة، كمّل') + '</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
    document.getElementById('cfy').onclick = function () { UI.closeS(); onYes(); };
  };

  UI.V = function (id) { var e = document.getElementById(id); return e ? String(e.value == null ? '' : e.value).trim() : ''; };
  UI.field = function (label, id, type, val, extra) {
    return '<label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '"' +
      (type === 'number' ? ' inputmode="decimal"' : '') + ' value="' + esc(val == null ? '' : val) + '" ' + (extra || '') + '>';
  };
  UI.select = function (label, id, opts, val, extra) {
    return '<label for="' + id + '">' + label + '</label><select id="' + id + '" ' + (extra || '') + '>' +
      opts.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
  };
  UI.chips = function (items, active, onclickFn) {
    return '<div class="chips">' + items.map(function (it) {
      return '<button class="' + (it[0] === active ? 'on' : '') + '" onclick="' + onclickFn + '(\'' + it[0] + '\')">' + it[1] + '</button>';
    }).join('') + '</div>';
  };

  /* ---------- الغلاف ---------- */
  var TABS = [
    ['home', '🏠', 'الرئيسية'],
    ['herd', '🐰', 'الأرانب'],
    ['log', '📒', 'السجل'],
    ['health', '💉', 'الصحة'],
    ['money', '💰', 'الفلوس'],
    ['more', '⚙️', 'المزيد']
  ];

  UI.go = function (tab, sub) {
    if (tab) UI.tab = tab;
    if (sub) UI.sub[tab] = sub;
    UI.q = '';
    UI.render();
    window.scrollTo(0, 0);
  };

  UI.render = function () {
    var s = S(), h = Core.herd(s);
    document.getElementById('sub').textContent =
      h.does + ' أنثى • ' + h.bucks + ' ذكر • ' + h.kits + ' صغير • ' + h.weaned + ' فطام';
    document.getElementById('nav').innerHTML = TABS.map(function (t) {
      return '<button class="' + (UI.tab === t[0] ? 'on' : '') + '" onclick="UI.go(\'' + t[0] + '\')"><i>' + t[1] + '</i>' + t[2] + '</button>';
    }).join('');
    var view = {
      home: UI.home, herd: UI.herdTab, log: UI.logTab, health: UI.healthTab, money: UI.moneyTab, more: UI.moreTab
    }[UI.tab];
    var el = document.getElementById('app');
    try {
      el.innerHTML = view ? view() : '';
    } catch (e) {
      el.innerHTML = '<div class="card"><b>حصل خطأ في العرض</b><div class="m">' + esc(e.message) + '</div>' +
        '<button class="btn s" onclick="UI.render()">حاول تاني</button></div>';
      if (root.console) console.error(e);
    }
    window.scrollTo(0, 0);
  };

  UI.syncLabel = function () {
    var e = document.getElementById('syncst');
    if (!e) return;
    e.textContent = {
      off: 'مقفولة', idle: 'مفعّلة', busy: 'جاري المزامنة…',
      ok: 'تمت المزامنة ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      err: 'مفيش اتصال — هيحاول تاني'
    }[Store.syncState] || 'مقفولة';
  };

  /* ---------- الرئيسية ---------- */
  UI.home = function () {
    var s = S(), h = Core.herd(s), t = today();
    var A = Core.alerts(s, t), mo = t.slice(0, 7), m = Core.money(s, mo);
    var out = '<div class="grid">' +
      stat(h.does, 'أنثى شغالة') + stat(h.preg, 'حامل/ملقحة') + stat(h.nurs, 'مرضعة') +
      stat(h.kits, 'صغير مع أمه') + stat(h.weaned, 'فطام في العنبر') + stat(h.ready, 'جاهز للبيع') +
      '</div>';

    out += '<div class="card profit"><h3>💰 الشهر ده (' + Core.monthLabel(mo) + ')</h3>' +
      '<div class="row"><span>مبيعات</span><b>' + num(m.salesSum) + ' ' + esc(s.set.currency) + '</b></div>' +
      '<div class="row"><span>مصروفات</span><b class="r">' + num(m.expSum) + ' ' + esc(s.set.currency) + '</b></div>' +
      '<div class="row"><span><b>الصافي</b></span><b class="' + (m.profit >= 0 ? 'g' : 'r') + '">' + num(m.profit) + ' ' + esc(s.set.currency) + '</b></div>' +
      '</div>';

    out += '<div class="card"><h3>🔔 التنبيهات (' + A.length + ')</h3>' +
      (A.length ? A.map(function (a) {
        return '<div class="row tap" onclick=\'UI.jump(' + JSON.stringify(a.go || {}).replace(/'/g, "\\'") + ')\'><span>' + a.i + ' ' + esc(a.txt) + '</span><span class="tag ' + a.c + '">›</span></div>';
      }).join('') : '<div class="empty">مفيش تنبيهات النهاردة 👌</div>') + '</div>';

    var soon = Core.activeDoes(s).map(function (d) { return { d: d, st: Core.status(s, d.id) }; })
      .filter(function (x) { return x.st.k === 'preg'; })
      .sort(function (a, b) { return a.st.due.localeCompare(b.st.due); }).slice(0, 5);
    if (soon.length) {
      out += '<div class="card"><h3>📅 ولادات قريبة</h3>' + soon.map(function (x) {
        var left = Core.diffDays(x.st.due, t);
        return '<div class="row tap" onclick="UI.doeView(\'' + x.d.id + '\')"><b>' + esc(x.d.num) + '</b>' +
          '<span class="m">' + (left >= 0 ? 'بعد ' + left + ' يوم' : 'متأخرة ' + (-left) + ' يوم') + '</span>' +
          '<span class="tag o">' + fmt(x.st.due) + '</span></div>';
      }).join('') + '</div>';
    }

    var readyB = (s.batches || []).filter(function (b) { return Core.batchReady(b, s); }).slice(0, 4);
    if (readyB.length) {
      out += '<div class="card"><h3>✅ دفعات جاهزة للبيع</h3>' + readyB.map(function (b) {
        return '<div class="row tap" onclick="UI.batchView(\'' + b.id + '\')"><span>دفعة ' + esc(b.num || fmt(b.date)) + '</span>' +
          '<span class="m">' + Core.batchLive(b) + ' أرنب • ' + Core.batchLastWeight(b) + ' جم</span></div>';
      }).join('') + '</div>';
    }

    if (!h.does && !h.bucks) {
      out += '<div class="card empty">ابدأ بإضافة الإناث والذكور من تبويب <b>الأرانب</b> أو من زر <b>+</b> تحت.</div>';
    }
    return out;
  };
  function stat(v, l) { return '<div class="stat"><b>' + num(v) + '</b><span>' + l + '</span></div>'; }

  UI.jump = function (go) {
    if (!go || !go.tab) return;
    UI.go(go.tab, go.sub);
    if (go.id) {
      if (go.tab === 'herd' && go.sub === 'does') UI.doeView(go.id);
      if (go.tab === 'money' && go.sub === 'clients') UI.custView(go.id);
    }
  };

  /* ---------- تبويب الأرانب ---------- */
  UI.herdTab = function () {
    var s = S();
    var sub = UI.sub.herd;
    var head = UI.chips([['does', 'الإناث'], ['bucks', 'الذكور'], ['batches', 'الدفعات'], ['cages', 'الأقفاص']], sub, 'UI.herdSub');
    if (sub === 'does') return head + UI.doesList();
    if (sub === 'bucks') return head + UI.bucksList();
    if (sub === 'batches') return head + UI.batchesList();
    return head + UI.cagesList();
  };
  UI.herdSub = function (k) { UI.sub.herd = k; UI.q = ''; UI.render(); };

  UI.doesList = function () {
    var s = S(), f = UI.filter || 'all';
    var list = Core.activeDoes(s).concat((s.does || []).filter(function (d) { return d.out; }));
    list = list.filter(function (d) {
      if (UI.q && String(d.num).indexOf(UI.q) < 0) return false;
      if (f === 'all') return true;
      if (f === 'out') return !!d.out;
      if (d.out) return false;
      return Core.status(s, d.id).k === f;
    });
    list.sort(function (a, b) { return String(a.num).localeCompare(String(b.num), undefined, { numeric: true }); });
    var chips = UI.chips([['all', 'الكل'], ['preg', 'حامل'], ['nurs', 'مرضعة'], ['free', 'فاضية'], ['out', 'خارج الخدمة']], f, 'UI.setFilter');
    var h = '<input class="search" placeholder="🔎 دوّر برقم الأنثى" value="' + esc(UI.q) + '" oninput="UI.search(this.value)">' + chips;
    h += list.length ? '<div class="card">' + list.map(function (d) {
      var st = Core.status(s, d.id);
      var tag = d.out ? '<span class="tag x">خارج الخدمة</span>' :
        st.k === 'preg' ? '<span class="tag o">حامل • ' + fmt(st.due) + '</span>' :
          st.k === 'nurs' ? '<span class="tag b">مرضعة (' + st.b.alive + ')</span>' : '<span class="tag">فاضية</span>';
      var cage = d.cage ? '<span class="m">• ' + esc(cageName(s, d.cage)) + '</span>' : '';
      return '<div class="row tap" onclick="UI.doeView(\'' + d.id + '\')"><b class="big">' + esc(d.num) + '</b>' + cage + tag + '</div>';
    }).join('') + '</div>' : '<div class="empty">مفيش نتايج</div>';
    h += '<button class="btn wide" onclick="UI.doeForm()">+ إضافة أنثى</button>' +
      '<button class="btn s wide mt8" onclick="UI.bulkDoes()">+ إضافة أرقام كتير مرة واحدة</button>';
    return h;
  };
  UI.setFilter = function (f) { UI.filter = f; UI.render(); };
  UI.search = function (v) {
    UI.q = v;
    clearTimeout(UI._qt);
    UI._qt = setTimeout(function () {
      UI.render();
      var e = document.querySelector('.search');
      if (e) { e.focus(); var n = e.value.length; e.setSelectionRange(n, n); }
    }, 300);
  };
  function cageName(s, id) { var c = (s.cages || []).find(function (x) { return x.id === id; }); return c ? c.name : '؟'; }
  UI.cageName = cageName;

  UI.bucksList = function () {
    var s = S(), t = today();
    var act = Core.activeBucks(s), outB = (s.bucks || []).filter(function (b) { return b.out; });
    var h = '<div class="grid">' + stat(act.length, 'ذكور شغالة') +
      stat(act.reduce(function (a, b) { return a + (Core.buckStats(s, b.id).matings); }, 0), 'تزاوجات') +
      stat(act.reduce(function (a, b) { return a + (Core.buckStats(s, b.id).kids); }, 0), 'صغار') + '</div>';
    h += '<button class="btn wide mt8" onclick="UI.buckForm()">+ إضافة ذكر</button>';
    h += act.concat(outB).map(function (b) {
      var st = Core.buckStats(s, b.id), w = lastBuckWeight(b);
      return '<div class="card"><div class="row" style="border:0"><span><b>🐇 ' + esc(b.num) + '</b>' +
        (b.out ? ' <span class="tag x">خارج الخدمة' + (b.outWhy ? ' — ' + esc(b.outWhy) : '') + '</span>' : '') +
        '<div class="m">' + [b.breed, b.cage ? 'قفص ' + esc(cageName(s, b.cage)) : '', w ? 'الوزن ' + w + ' كجم' : '', b.born ? 'عمره ' + Core.ageText(b.born, t) : ''].filter(Boolean).join(' • ') + '</div></span>' +
        '<span class="tag b">' + st.matings + ' تزاوج</span></div>' +
        '<div class="m">نجح ' + st.ok + (st.rate !== null ? ' (' + st.rate + '%)' : '') + (st.pending ? ' • منتظر ' + st.pending : '') +
        ' • صغار ' + st.kids + (st.avgLitter ? ' • متوسط ' + st.avgLitter : '') +
        (st.last ? '<br>آخر تزاوج ' + fmt(st.last) : '') + '</div>' +
        '<div class="chips wrap mt6"><button onclick="UI.buckView(\'' + b.id + '\')">👁 التفاصيل</button>' +
        '<button onclick="UI.buckForm(\'' + b.id + '\')">✏️ تعديل</button>' +
        '<button onclick="UI.weighBuck(\'' + b.id + '\')">⚖️ وزن</button>' +
        (b.out ? '<button onclick="UI.toggleBuckOut(\'' + b.id + '\')">↩️ رجوع للخدمة</button>' : '<button onclick="UI.toggleBuckOut(\'' + b.id + '\')">🚫 خارج الخدمة</button>') +
        '</div></div>';
    }).join('');
    if (!s.bucks.length) h += '<div class="card empty">لسه مفيش ذكور</div>';
    return h;
  };
  function lastBuckWeight(b) { var a = (b.ws || []).slice().sort(function (x, y) { return x.d.localeCompare(y.d); }); return a.length ? a[a.length - 1].k : 0; }
  UI.lastBuckWeight = lastBuckWeight;

  UI.batchesList = function () {
    var s = S(), t = today();
    var act = (s.batches || []).filter(function (b) { return !b.closed; });
    var closed = (s.batches || []).filter(function (b) { return b.closed; });
    var live = act.reduce(function (a, b) { return a + Core.batchLive(b); }, 0);
    var tot = (s.batches || []).reduce(function (a, b) { return a + (+b.count || 0); }, 0);
    var dead = (s.batches || []).reduce(function (a, b) { return a + (+b.dead || 0); }, 0);
    var ws = act.filter(function (b) { return Core.batchLive(b) > 0 && Core.batchLastWeight(b) > 0; });
    var wsum = ws.reduce(function (a, b) { return a + Core.batchLive(b); }, 0);
    var avg = wsum ? Math.round(ws.reduce(function (a, b) { return a + Core.batchLastWeight(b) * Core.batchLive(b); }, 0) / wsum) : 0;
    var h = '<div class="grid">' + stat(live, 'فطام حالياً') + stat(avg ? avg + ' جم' : '—', 'متوسط الوزن') +
      stat(act.length, 'دفعات شغالة') + stat(tot ? Math.round(dead / tot * 1000) / 10 + '%' : '0%', 'نسبة النفوق') + '</div>';
    h += '<button class="btn wide mt8" onclick="UI.batchForm()">+ تسجيل دفعة فطام</button>';
    h += '<div class="m mt6">الجاهز للبيع: ' + num(s.set.wtarget) + ' جم أو أكتر (تتغير من المزيد ← الإعدادات).</div>';
    h += act.concat(closed).map(function (b) {
      var lw = Core.batchLastWeight(b), gn = Core.batchGain(b), age = Core.batchAge(b, s, t), ready = Core.batchReady(b, s);
      return '<div class="card"><div class="row" style="border:0"><span><b>دفعة ' + esc(b.num || fmt(b.date)) + '</b> ' +
        (b.closed ? '<span class="tag x">منتهية</span>' : ready ? '<span class="tag o">جاهزة للبيع</span>' : '') +
        '<div class="m">فطام ' + fmt(b.date) + (age !== null ? ' • عمرها ' + age + ' يوم' : '') +
        (b.doe ? ' • من أم ' + esc(Core.doeNum(s, b.doe)) : '') + (b.cage ? ' • ' + esc(cageName(s, b.cage)) : '') + '</div></span>' +
        '<span class="tag b">' + Core.batchLive(b) + ' / ' + b.count + '</span></div>' +
        '<div class="m">' + (lw ? 'آخر وزن <b>' + lw + ' جم</b>' : 'لسه ماتوزنش') +
        (gn !== null ? ' • زيادة ' + gn + ' جم/يوم' : '') +
        (b.dead ? ' • نافق ' + b.dead : '') + (b.sold ? ' • مباع ' + b.sold : '') +
        (b.m || b.f ? ' • ذكور ' + (b.m || 0) + ' / إناث ' + (b.f || 0) : '') + '</div>' +
        '<div class="chips wrap mt6"><button onclick="UI.batchView(\'' + b.id + '\')">👁 التفاصيل</button>' +
        '<button onclick="UI.weighBatch(\'' + b.id + '\')">⚖️ وزن</button>' +
        '<button onclick="UI.saleForm({batch:\'' + b.id + '\'})">💰 بيع</button>' +
        '<button onclick="UI.batchForm(\'' + b.id + '\')">✏️ تعديل</button></div></div>';
    }).join('');
    if (!s.batches.length) h += '<div class="card empty">لسه مفيش دفعات فطام</div>';
    return h;
  };

  UI.cagesList = function () {
    var s = S();
    var rows = (s.cages || []).map(function (c) {
      var does = (s.does || []).filter(function (d) { return d.cage === c.id && !d.out; }).length;
      var bucks = (s.bucks || []).filter(function (b) { return b.cage === c.id && !b.out; }).length;
      var batches = (s.batches || []).filter(function (b) { return b.cage === c.id && !b.closed; });
      var kits = batches.reduce(function (a, b) { return a + Core.batchLive(b); }, 0);
      var used = does + bucks + batches.length;
      var pct = c.cap ? Math.min(100, Math.round(used / c.cap * 100)) : 0;
      return '<div class="card"><div class="row" style="border:0"><span><b>🏠 ' + esc(c.name) + '</b>' +
        (c.note ? '<div class="m">' + esc(c.note) + '</div>' : '') + '</span>' +
        '<span class="tag ' + (c.cap && used > c.cap ? 'r' : 'b') + '">' + used + ' / ' + (c.cap || '∞') + '</span></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="m mt6">إناث ' + does + ' • ذكور ' + bucks + ' • دفعات ' + batches.length + ' (' + kits + ' أرنب)</div>' +
        '<div class="chips wrap mt6"><button onclick="UI.cageForm(\'' + c.id + '\')">✏️ تعديل</button>' +
        '<button onclick="UI.delItem(\'cages\',\'' + c.id + '\',\'قفص\')">🗑️ حذف</button></div></div>';
    }).join('');
    var noCage = (s.does || []).filter(function (d) { return !d.cage && !d.out; }).length +
      (s.bucks || []).filter(function (b) { return !b.cage && !b.out; }).length;
    return '<button class="btn wide" onclick="UI.cageForm()">+ إضافة قفص / عنبر</button>' +
      (noCage ? '<div class="m mt6">فيه ' + noCage + ' حيوان مش متحددله قفص (من صفحة الحيوان).</div>' : '') +
      (rows || '<div class="card empty">لسه مفيش أقفاص مسجلة</div>');
  };

  /* ---------- صفحات الحيوان ---------- */
  UI.doeView = function (id) {
    var s = S(), d = Core.doeOf(s, id); if (!d) return;
    var st = Core.status(s, id), stats = Core.doeStats(s, id);
    var ms = (s.matings || []).filter(function (m) { return m.doe === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var bs = (s.births || []).filter(function (b) { return b.doe === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var body = '<div class="row" style="border:0"><span>' +
      (st.k === 'preg' ? '<span class="tag o">حامل — ولادة ' + fmt(st.due) + '</span>' :
        st.k === 'nurs' ? '<span class="tag b">مرضعة — فطام ' + fmt(st.wean) + '</span>' : '<span class="tag">فاضية</span>') +
      (d.out ? ' <span class="tag x">خارج الخدمة</span>' : '') + '</span>' +
      '<span class="m">' + [d.breed, d.cage ? 'قفص ' + esc(cageName(s, d.cage)) : '', d.born ? 'عمرها ' + Core.ageText(d.born) : ''].filter(Boolean).join(' • ') + '</span></div>' +
      '<div class="grid mt6">' + stat(stats.births, 'ولادات') + stat(stats.weaned, 'فطام') + stat(stats.avgLitter || 0, 'متوسط البطن') + stat(stats.survival === null ? '—' : stats.survival + '%', 'نسبة البقاء') + '</div>' +
      '<div class="acts mt8"><button class="btn" onclick="UI.matingForm(\'' + id + '\')">💕 تزاوج</button>' +
      '<button class="btn" onclick="UI.birthForm(\'' + id + '\')">🍼 ولادة</button>' +
      '<button class="btn s" onclick="UI.weanForm(\'' + id + '\')">✂️ فطام</button>' +
      '<button class="btn s" onclick="UI.injForm({target:\'doe\',ref:\'' + id + '\'})">💉 حقنة</button>' +
      '<button class="btn s" onclick="UI.medForm({target:\'doe\',ref:\'' + id + '\'})">💊 دواء</button>' +
      '<button class="btn s" onclick="UI.doeForm(\'' + id + '\')">✏️ تعديل</button></div>' +
      '<div class="card"><h3>🍼 الولادات (' + bs.length + ')</h3>' + (bs.length ? bs.map(function (b) {
        return '<div class="row"><span>' + fmt(b.date) + '<div class="m">الأب ' + esc(Core.animalLabel(s, b.buck) || '؟') + '</div></span>' +
          '<span>' + b.alive + ' حي' + (b.dead ? ' / ' + b.dead + ' نافق' : '') +
          (b.weaned ? ' <span class="tag b">فُطم ' + b.weanedCount + '</span>' : '') + '</span></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      '<div class="card"><h3>💕 التزاوجات (' + ms.length + ')</h3>' + (ms.length ? ms.map(function (m) {
        return '<div class="row"><span>' + fmt(m.date) + ' × ' + esc(Core.animalLabel(s, m.buck) || '؟') + '</span>' +
          '<span class="tag ' + (m.result === 'pending' ? 'o' : m.result === 'failed' ? 'r' : '') + '">' +
          ({ pending: 'منتظرة', pregnant: 'حامل', born: 'ولدت', failed: 'فشلت' }[m.result] || m.result) + '</span></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      (d.note ? '<div class="card m">📝 ' + esc(d.note) + '</div>' : '') +
      '<div class="acts mt8"><button class="btn d" onclick="UI.doeOut(\'' + id + '\')">' + (d.out ? '↩️ رجوع للخدمة' : '🚫 خارج الخدمة / نافقة') + '</button>' +
      '<button class="btn s" onclick="UI.closeS()">إغلاق</button></div>';
    UI.sheet('🐰 الأنثى ' + esc(d.num), body, true);
  };

  UI.buckView = function (id) {
    var s = S(), b = Core.byId(s, id); if (!b) return;
    var st = Core.buckStats(s, id);
    var ms = (s.matings || []).filter(function (m) { return m.buck === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var bs = (s.births || []).filter(function (x) { return x.buck === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var body = '<div class="grid">' + stat(st.matings, 'تزاوج') + stat(st.rate === null ? '—' : st.rate + '%', 'نسبة النجاح') +
      stat(st.kids, 'صغار') + stat(st.avgLitter || 0, 'متوسط البطن') + '</div>' +
      '<div class="acts mt8"><button class="btn" onclick="UI.matingForm()">💕 تزاوج</button>' +
      '<button class="btn s" onclick="UI.buckForm(\'' + id + '\')">✏️ تعديل</button>' +
      '<button class="btn s" onclick="UI.weighBuck(\'' + id + '\')">⚖️ وزن</button></div>' +
      '<div class="card"><h3>آخر التزاوجات</h3>' + (ms.length ? ms.slice(0, 8).map(function (m) {
        return '<div class="row"><span>' + fmt(m.date) + ' × ' + esc(Core.doeNum(s, m.doe)) + '</span>' +
          '<span class="tag ' + (m.result === 'pending' ? 'o' : m.result === 'failed' ? 'r' : '') + '">' +
          ({ pending: 'منتظرة', pregnant: 'حامل', born: 'ولدت', failed: 'فشلت' }[m.result] || m.result) + '</span></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      '<div class="card"><h3>الولادات</h3>' + (bs.length ? bs.slice(0, 8).map(function (x) {
        return '<div class="row"><span>' + fmt(x.date) + ' — أم ' + esc(Core.doeNum(s, x.doe)) + '</span><span>' + x.alive + ' حي</span></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      (b.note ? '<div class="card m">📝 ' + esc(b.note) + '</div>' : '') +
      '<div class="acts mt8"><button class="btn d" onclick="UI.delItem(\'bucks\',\'' + id + '\',\'ذكر\')">🗑️ حذف</button>' +
      '<button class="btn s" onclick="UI.closeS()">إغلاق</button></div>';
    UI.sheet('🐇 الذكر ' + esc(b.num), body, true);
  };

  UI.batchView = function (id) {
    var s = S(), b = (s.batches || []).find(function (x) { return x.id === id; }); if (!b) return;
    var ws = Core.batchWeights(b).slice().reverse();
    var body = '<div class="grid">' + stat(Core.batchLive(b), 'موجود') + stat(b.count, 'الأصل') +
      stat(b.dead || 0, 'نافق') + stat(b.sold || 0, 'مباع') + '</div>' +
      '<div class="m mt6">فطام ' + fmt(b.date) + (b.doe ? ' • أم ' + esc(Core.doeNum(s, b.doe)) : '') +
      (b.cage ? ' • ' + esc(cageName(s, b.cage)) : '') + '</div>' +
      '<div class="acts mt8"><button class="btn" onclick="UI.weighBatch(\'' + id + '\')">⚖️ وزن</button>' +
      '<button class="btn" onclick="UI.saleForm({batch:\'' + id + '\'})">💰 بيع</button>' +
      '<button class="btn d" onclick="UI.deadBatch(\'' + id + '\')">☠️ نافق</button>' +
      '<button class="btn s" onclick="UI.batchForm(\'' + id + '\')">✏️ تعديل</button></div>' +
      '<div class="card"><h3>⚖️ الأوزان</h3>' + (ws.length ? ws.map(function (w) {
        return '<div class="row"><span>' + fmt(w.d) + '</span><b>' + w.g + ' جم</b></div>';
      }).join('') : '<div class="m">لسه ماتوزنش</div>') + '</div>' +
      '<div class="acts mt8"><button class="btn s" onclick="UI.closeS()">إغلاق</button></div>';
    UI.sheet('🍼 دفعة ' + esc(b.num || fmt(b.date)), body, true);
  };

  UI.custView = function (id) {
    var s = S(), c = Core.custOf(s, id); if (!c) return;
    var sales = (s.sales || []).filter(function (x) { return x.cust === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var pays = (s.payments || []).filter(function (x) { return x.cust === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var bal = Core.custBalance(s, id);
    var body = '<div class="row" style="border:0"><span><b>' + esc(c.name) + '</b>' +
      (c.phone ? '<div class="m">📞 ' + esc(c.phone) + '</div>' : '') + '</span>' +
      '<span class="tag ' + (bal > 0 ? 'r' : 'b') + '">' + (bal > 0 ? 'عليه ' + num(bal) : 'مسدد') + '</span></div>' +
      '<div class="acts mt8"><button class="btn" onclick="UI.payForm(\'' + id + '\')">💵 تسجيل دفعة</button>' +
      '<button class="btn s" onclick="UI.saleForm({cust:\'' + id + '\'})">💰 بيع له</button>' +
      '<button class="btn s" onclick="UI.custForm(\'' + id + '\')">✏️ تعديل</button></div>' +
      '<div class="card"><h3>المبيعات (' + sales.length + ')</h3>' + (sales.length ? sales.map(function (x) {
        return '<div class="row"><span>' + fmt(x.date) + ' — ' + x.count + ' أرنب<div class="m">' +
          (x.weight ? x.weight + ' كجم' : '') + (x.paid === false ? ' • آجل' : ' • مدفوع') + '</div></span><b>' + num(x.total) + '</b></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      '<div class="card"><h3>الدفعات (' + pays.length + ')</h3>' + (pays.length ? pays.map(function (x) {
        return '<div class="row"><span>' + fmt(x.date) + (x.note ? ' — ' + esc(x.note) : '') + '</span><b>' + num(x.amount) + '</b></div>';
      }).join('') : '<div class="m">لا يوجد</div>') + '</div>' +
      '<div class="acts mt8"><button class="btn s" onclick="UI.closeS()">إغلاق</button></div>';
    UI.sheet('👤 ' + esc(c.name), body, true);
  };
})(typeof window !== 'undefined' ? window : globalThis);
