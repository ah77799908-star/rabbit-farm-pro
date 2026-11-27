/* ui-tabs.js — السجل والصحة والفلوس والمزيد */
(function (root) {
  'use strict';
  var Core = root.Core, Store = root.Store, UI = root.UI;
  var esc = Core.esc, fmt = Core.fmt, num = Core.num, today = Core.today;
  var S = function () { return Store.S; };
  var stat = function (v, l) { return '<div class="stat"><b>' + num(v) + '</b><span>' + l + '</span></div>'; };
  function money0() { return esc(S().set.currency || 'ج'); }
  function targetName(x) {
    if (x.target === 'all') return 'كل الأرانب';
    if (x.target === 'batch') return 'دفعة ' + Core.batchName(S(), x.ref);
    var a = Core.byId(S(), x.ref);
    return a ? (x.target === 'doe' ? 'أنثى ' : 'ذكر ') + a.num : '؟';
  }

  /* ---------- السجل ---------- */
  UI.logTab = function () {
    var s = S(), f = UI.sub.log || 'all', E = [];
    (s.matings || []).forEach(function (m) {
      E.push({
        date: m.date, kind: 'mating', i: '💕', t: 'تزاوج ' + Core.doeNum(s, m.doe) + ' × ' + (Core.animalLabel(s, m.buck) || '؟'),
        tag: { pending: 'منتظرة', pregnant: 'حامل', born: 'ولدت', failed: 'فشلت' }[m.result] || '',
        cls: m.result === 'failed' ? 'r' : m.result === 'pending' ? 'o' : ''
      });
    });
    (s.births || []).forEach(function (b) {
      E.push({
        date: b.date, kind: 'birth', i: '🍼', t: 'ولادة ' + Core.doeNum(s, b.doe) + ': ' + b.alive + ' حي' + (b.dead ? ' + ' + b.dead + ' نافق' : ''),
        tag: b.weaned ? 'فُطم ' + b.weanedCount : '', cls: b.weaned ? 'b' : ''
      });
    });
    (s.batches || []).forEach(function (b) {
      E.push({ date: b.date, kind: 'wean', i: '✂️', t: 'دفعة فطام ' + (b.num || '') + ': ' + b.count + ' أرنب', tag: Core.batchLive(b) + ' موجود', cls: 'b' });
    });
    (s.sales || []).forEach(function (x) {
      E.push({
        date: x.date, kind: 'money', i: '💰', t: 'بيع ' + x.count + ' أرنب' + (x.cust ? ' لـ ' + esc(Core.custOf(s, x.cust) ? Core.custOf(s, x.cust).name : '') : '') + ' — ' + num(x.total) + ' ' + money0(),
        tag: x.paid === false ? 'آجل' : '', cls: x.paid === false ? 'r' : ''
      });
    });
    (s.expenses || []).forEach(function (x) {
      E.push({ date: x.date, kind: 'money', i: '🧾', t: 'مصروف ' + x.cat + (x.note ? ' — ' + esc(x.note) : '') + ': ' + num(x.amount) + ' ' + money0(), tag: '', cls: 'r' });
    });
    (s.deaths || []).forEach(function (x) {
      var who = x.kind === 'batch' ? 'دفعة ' + Core.batchName(s, x.ref) : (x.kind === 'doe' ? 'أنثى ' + Core.animalLabel(s, x.ref) : 'ذكر ' + Core.animalLabel(s, x.ref));
      E.push({ date: x.date, kind: 'death', i: '☠️', t: 'نافق ' + (x.count > 1 ? x.count + ' من ' : '') + who + (x.cause ? ' — ' + esc(x.cause) : ''), tag: '', cls: 'r' });
    });
    E.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var list = f === 'all' ? E : E.filter(function (x) { return x.kind === f; });
    var chips = UI.chips([['all', 'الكل'], ['mating', 'تزاوج'], ['birth', 'ولادة'], ['wean', 'فطام'], ['money', 'فلوس'], ['death', 'نافق']], f, 'UI.logSub');
    var shown = list.slice(0, 150);
    var h = chips + (shown.length ? '<div class="card">' + shown.map(function (e) {
      return '<div class="row"><span>' + e.i + ' ' + e.t + '<div class="m">' + fmt(e.date) + '</div></span>' +
        (e.tag ? '<span class="tag ' + (e.cls || '') + '">' + esc(e.tag) + '</span>' : '') + '</div>';
    }).join('') + '</div>' + (list.length > 150 ? '<div class="m">بيظهر آخر 150 حدث من ' + list.length + '</div>' : '')
      : '<div class="empty">لسه مفيش تسجيلات</div>');
    return h;
  };
  UI.logSub = function (k) { UI.sub.log = k; UI.render(); };

  /* ---------- الصحة ---------- */
  UI.healthTab = function () {
    var sub = UI.sub.health || 'inj';
    var head = UI.chips([['inj', 'الحقن'], ['meds', 'الأدوية'], ['vax', 'التحصين'], ['dead', 'النافق']], sub, 'UI.healthSub');
    var body = sub === 'inj' ? injView() : sub === 'meds' ? medsView() : sub === 'vax' ? vaxView() : deadView();
    return head + body;
  };
  UI.healthSub = function (k) { UI.sub.health = k; UI.render(); };

  function injView() {
    var s = S(), t = today();
    var I = (s.inj || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var h = '<button class="btn wide" onclick="UI.injForm()">+ تسجيل حقنة</button>';
    h += I.length ? I.map(function (x) {
      var left = x.next ? Core.diffDays(x.next, t) : null;
      return '<div class="card"><div class="row" style="border:0"><span><b>' + esc(x.name) + '</b> <span class="m">• ' + esc(targetName(x)) + '</span>' +
        '<div class="m">' + fmt(x.date) + (x.dose ? ' • الجرعة ' + esc(x.dose) : '') + (x.note ? ' • ' + esc(x.note) : '') + '</div>' +
        (x.next ? '<div class="m">الجرعة الجاية ' + fmt(x.next) + (left < 0 ? ' (متأخرة)' : '') + '</div>' : '') + '</span>' +
        '<span>' + (x.done ? '<span class="tag b">تمت</span>' : x.next ? '<button class="btn s sm" onclick="UI.doneInj(\'' + x.id + '\')">تمت</button>' : '') +
        '</span></div><div class="chips wrap mt6"><button onclick="UI.delItem(\'inj\',\'' + x.id + '\',\'حقنة\')">🗑️ حذف</button></div></div>';
    }).join('') : '<div class="card empty">لسه مفيش حقن مسجلة</div>';
    return h;
  }

  function medsView() {
    var s = S(), t = today(), wd = new Date(t + 'T12:00:00').getDay();
    var M = (s.meds || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    var h = '<button class="btn wide" onclick="UI.medForm()">+ تسجيل دواء</button>';
    h += M.length ? M.map(function (x) {
      var active = Core.medActive(x, t);
      return '<div class="card"><div class="row" style="border:0"><span><b>' + esc(x.name) + '</b> <span class="m">• ' + esc(targetName(x)) + '</span>' +
        '<div class="m">' + fmt(x.date) + (x.end ? ' ← ' + fmt(x.end) : '') + ' • ' +
        (Core.medDays(x).length === 7 ? 'كل يوم' : Core.DAYS.filter(function (d) { return Core.medDays(x).indexOf(d[0]) >= 0; }).map(function (d) { return d[1]; }).join('، ')) +
        (x.dose ? ' • ' + esc(x.dose) : '') + '</div></span>' +
        '<span>' + (active ? '<span class="tag o">جاري</span>' : '<span class="tag x">خلص</span>') + '</span></div>' +
        '<div class="chips wrap mt6"><button onclick="UI.delItem(\'meds\',\'' + x.id + '\',\'دواء\')">🗑️ حذف</button></div></div>';
    }).join('') : '<div class="card empty">لسه مفيش أدوية</div>';

    h += '<div class="card"><h3>🗓️ جدول الأسبوع</h3>' + Core.DAYS.map(function (d) {
      var L = M.filter(function (x) { return Core.medDays(x).indexOf(d[0]) >= 0 && Core.medActive(x, t); });
      return '<div class="row" style="align-items:flex-start' + (d[0] === wd ? ';background:var(--g2);border-radius:10px' : '') + '">' +
        '<b style="min-width:74px">' + d[1] + (d[0] === wd ? ' (النهاردة)' : '') + '</b>' +
        '<span style="flex:1">' + (L.length ? L.map(function (x) {
          return '<div>💊 ' + esc(x.name) + (x.dose ? ' <span class="m">' + esc(x.dose) + '</span>' : '') + ' <span class="m">• ' + esc(targetName(x)) + '</span></div>';
        }).join('') : '<span class="m">—</span>') + '</span></div>';
    }).join('') + '</div>';
    return h;
  }

  function vaxView() {
    var s = S(), t = today(), due = Core.vaxDue(s, t);
    var h = '<div class="card"><h3>📋 برنامج التحصين</h3>' +
      '<div class="m">حدّد التحصينات وأعمارها، والبرنامج ينبهك لكل دفعة لوحدها.</div>' +
      ((s.vax || []).length ? (s.vax || []).map(function (v) {
        return '<div class="row"><span><b>' + esc(v.name) + '</b><div class="m">عند عمر ' + v.ageDays + ' يوم' + (v.note ? ' • ' + esc(v.note) : '') + '</div></span>' +
          '<span><button class="btn s sm" onclick="UI.vaxForm(\'' + v.id + '\')">✏️</button> ' +
          '<button class="btn d sm" onclick="UI.delItem(\'vax\',\'' + v.id + '\',\'بند تحصين\')">🗑️</button></span></div>';
      }).join('') : '<div class="m">لسه مفيش برنامج. اضغط + وحدد أول تحصين.</div>') +
      '<button class="btn wide mt8" onclick="UI.vaxForm()">+ إضافة تحصين للبرنامج</button></div>';

    h += '<div class="card"><h3>⏰ المستحق</h3>' + (due.length ? due.map(function (v) {
      return '<div class="row"><span>🧪 ' + esc(v.name) + ' — دفعة ' + esc(v.batch) +
        '<div class="m">' + (v.left < 0 ? 'متأخر ' + (-v.left) + ' يوم' : v.left === 0 ? 'النهاردة' : 'بعد ' + v.left + ' يوم') + ' • ' + fmt(v.due) + '</div></span>' +
        '<button class="btn s sm" onclick="UI.vaxLogForm(\'' + v.batchId + '\',\'' + esc(v.name) + '\')">تسجيل</button></div>';
    }).join('') : '<div class="m">مفيش تحصين مستحق دلوقتي</div>') + '</div>';

    h += '<div class="card"><h3>✅ اللي اتعمل</h3>' +
      ((s.vaxLog || []).length ? (s.vaxLog || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 20).map(function (x) {
        return '<div class="row"><span>' + esc(x.name) + ' — دفعة ' + esc(Core.batchName(s, x.ref)) + '<div class="m">' + fmt(x.date) + '</div></span>' +
          '<button class="btn d sm" onclick="UI.delItem(\'vaxLog\',\'' + x.id + '\',\'تحصين\')">🗑️</button></div>';
      }).join('') : '<div class="m">لسه مفيش</div>') + '</div>';
    return h;
  }

  function deadView() {
    var s = S(), t = today();
    var D = (s.deaths || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var month = t.slice(0, 7);
    var thisMonth = D.filter(function (x) { return x.date.slice(0, 7) === month; });
    var h = '<div class="grid">' + stat(thisMonth.reduce(function (a, x) { return a + (+x.count || 0); }, 0), 'نافق الشهر ده') +
      stat(D.reduce(function (a, x) { return a + (+x.count || 0); }, 0), 'إجمالي النافق') + '</div>';
    h += D.length ? '<div class="card">' + D.slice(0, 60).map(function (x) {
      var who = x.kind === 'batch' ? 'دفعة ' + Core.batchName(s, x.ref) : (x.kind === 'doe' ? 'أنثى ' : 'ذكر ') + Core.animalLabel(s, x.ref);
      return '<div class="row"><span>☠️ ' + esc(who) + (x.cause ? ' — ' + esc(x.cause) : '') +
        '<div class="m">' + fmt(x.date) + ' • ' + (x.count || 1) + ' أرنب</div></span>' +
        '<button class="btn d sm" onclick="UI.delItem(\'deaths\',\'' + x.id + '\',\'سجل نافق\')">🗑️</button></div>';
    }).join('') + '</div>' : '<div class="card empty">مفيش نافق مسجل</div>';
    return h;
  }

  /* ---------- الفلوس ---------- */
  UI.moneyTab = function () {
    var s = S(), sub = UI.sub.money || 'sales';
    var months = Core.monthsWithData(s);
    if (months.indexOf(UI.moneyMonth) < 0) UI.moneyMonth = months[0];
    var m = Core.money(s, UI.moneyMonth);
    var head = UI.chips([['sales', 'المبيعات'], ['exp', 'المصروفات'], ['clients', 'العملاء'], ['report', 'التقارير']], sub, 'UI.moneySub');
    var top = '<div class="card"><div class="row" style="border:0"><b>💰 ' + Core.monthLabel(UI.moneyMonth) + '</b>' +
      UI.select('', 'moSel', months.map(function (x) { return [x, Core.monthLabel(x)]; }), UI.moneyMonth, 'onchange="UI.setMonth(this.value)" style="width:auto;padding:6px;font-size:13px"') + '</div>' +
      '<div class="grid3"><div class="stat"><b>' + num(m.salesSum) + '</b><span>مبيعات</span></div>' +
      '<div class="stat"><b class="r">' + num(m.expSum) + '</b><span>مصروفات</span></div>' +
      '<div class="stat"><b class="' + (m.profit >= 0 ? 'g' : 'r') + '">' + num(m.profit) + '</b><span>الصافي</span></div></div></div>';
    var body = sub === 'sales' ? salesView(m) : sub === 'exp' ? expView(m) : sub === 'clients' ? clientsView() : reportView();
    return head + top + body;
  };
  UI.moneySub = function (k) { UI.sub.money = k; UI.render(); };
  UI.setMonth = function (v) { UI.moneyMonth = v; UI.render(); };

  function salesView(m) {
    var s = S();
    var L = (s.sales || []).filter(function (x) { return (x.date || '').slice(0, 7) === UI.moneyMonth; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var h = '<div class="card"><h3>📊 ملخص الشهر</h3><div class="m">' + m.cnt + ' أرنب • ' + num(m.kg) + ' كجم • متوسط ' +
      num(m.pricePerKg) + ' ' + money0() + '/كجم</div></div>';
    h += '<button class="btn wide" onclick="UI.saleForm()">+ تسجيل بيع</button>';
    h += L.length ? '<div class="card">' + L.map(function (x) {
      var c = x.cust ? Core.custOf(s, x.cust) : null;
      return '<div class="row"><span>' + x.count + ' أرنب' + (c ? ' — ' + esc(c.name) : '') +
        '<div class="m">' + fmt(x.date) + (x.weight ? ' • ' + x.weight + ' كجم' : '') + (x.kilo ? ' × ' + x.kilo : '') +
        (x.doe ? ' • أم ' + esc(Core.doeNum(s, x.doe)) : '') + (x.paid === false ? ' • آجل' : '') + '</div></span>' +
        '<span><b>' + num(x.total) + '</b> <button class="btn d sm" onclick="UI.delItem(\'sales\',\'' + x.id + '\',\'بيع\')">🗑️</button></span></div>';
    }).join('') + '</div>' : '<div class="empty">مفيش مبيعات الشهر ده</div>';
    return h;
  }

  function expView(m) {
    var s = S();
    var L = (s.expenses || []).filter(function (x) { return (x.date || '').slice(0, 7) === UI.moneyMonth; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var cats = Object.keys(m.byCat);
    var h = cats.length ? '<div class="card"><h3>توزيع المصروفات</h3>' + cats.sort(function (a, b) { return m.byCat[b] - m.byCat[a]; }).map(function (c) {
      var pct = m.expSum ? Math.round(m.byCat[c] / m.expSum * 100) : 0;
      return '<div class="row"><span>' + esc(c) + '</span><b>' + num(m.byCat[c]) + ' (' + pct + '%)</b></div>';
    }).join('') + '</div>' : '';
    h += '<button class="btn wide" onclick="UI.expForm()">+ تسجيل مصروف</button>';
    h += L.length ? '<div class="card">' + L.map(function (x) {
      return '<div class="row"><span>' + esc(x.cat) + (x.note ? '<div class="m">' + esc(x.note) + '</div>' : '') +
        '<div class="m">' + fmt(x.date) + '</div></span>' +
        '<span><b>' + num(x.amount) + '</b> <button class="btn d sm" onclick="UI.delItem(\'expenses\',\'' + x.id + '\',\'مصروف\')">🗑️</button></span></div>';
    }).join('') + '</div>' : '<div class="empty">مفيش مصروفات الشهر ده</div>';
    return h;
  }

  function clientsView() {
    var s = S();
    var L = (s.custs || []).map(function (c) { return { c: c, bal: Core.custBalance(s, c.id) }; });
    var totalDebt = L.reduce(function (a, x) { return a + Math.max(0, x.bal); }, 0);
    var h = '<div class="grid">' + stat(L.length, 'عملاء') + stat(totalDebt, 'فلوس عند العملاء') + '</div>';
    h += '<button class="btn wide mt8" onclick="UI.custForm()">+ عميل جديد</button>';
    h += L.length ? '<div class="card">' + L.sort(function (a, b) { return b.bal - a.bal; }).map(function (x) {
      return '<div class="row tap" onclick="UI.custView(\'' + x.c.id + '\')"><span><b>' + esc(x.c.name) + '</b>' +
        (x.c.phone ? '<div class="m">📞 ' + esc(x.c.phone) + '</div>' : '') + '</span>' +
        '<span class="tag ' + (x.bal > 0 ? 'r' : 'b') + '">' + (x.bal > 0 ? 'عليه ' + num(x.bal) : 'مسدد') + '</span></div>';
    }).join('') + '</div>' : '<div class="empty">مفيش عملاء مسجلين</div>';
    return h;
  }

  function reportView() {
    var s = S(), r = Core.report(s, UI.moneyMonth), m = r.money;
    var h = '<div class="card"><h3>📈 نتايج الشهر</h3>' +
      '<div class="row"><span>تزاوجات</span><b>' + r.matings + '</b></div>' +
      '<div class="row"><span>نسبة الإخصاب</span><b>' + (r.conception === null ? '—' : r.conception + '%') + '</b></div>' +
      '<div class="row"><span>ولادات</span><b>' + r.births + '</b></div>' +
      '<div class="row"><span>صغار اتولدو</span><b>' + r.bornKits + '</b></div>' +
      '<div class="row"><span>متوسط البطن</span><b>' + (r.avgLitter || 0) + '</b></div>' +
      '<div class="row"><span>نفوق قبل الفطام</span><b>' + r.mortality + '%</b></div>' +
      '<div class="row"><span>سعر الكيلو</span><b>' + num(m.pricePerKg) + ' ' + money0() + '</b></div>' +
      '<div class="row"><span>متوسط الأرنب</span><b>' + num(m.avgPerRabbit) + ' ' + money0() + '</b></div>' +
      '<div class="row"><span>صافي الربح</span><b class="' + (m.profit >= 0 ? 'g' : 'r') + '">' + num(m.profit) + ' ' + money0() + '</b></div></div>';

    var feedCost = (s.feedLog || []).filter(function (x) { return (x.date || '').slice(0, 7) === UI.moneyMonth; })
      .reduce(function (a, x) { return a + (+x.cost || 0); }, 0);
    if (feedCost) h += '<div class="card"><h3>🌾 تكلفة العلف المستهلك</h3><div class="row"><span>الشهر ده</span><b>' + num(feedCost) + ' ' + money0() + '</b></div>' +
      (m.kg ? '<div class="m">يعني ' + num(Math.round(feedCost / m.kg * 100) / 100) + ' ' + money0() + ' علف لكل كيلو لحمة اتباع</div>' : '') + '</div>';

    var top = r.perDoe.filter(function (d) { return d.births > 0; });
    h += '<div class="card"><h3>🐰 إنتاج الإناث</h3>' + (top.length ? top.slice(0, 12).map(function (d, i) {
      return '<div class="row tap" onclick="UI.doeView(\'' + d.id + '\')"><span>' + (i === 0 ? '🥇 ' : '') + esc(d.num) +
        '<div class="m">' + d.births + ' ولادة • ' + d.born + ' مولود • متوسط ' + d.avgLitter + '</div></span>' +
        '<span class="tag b">فطام ' + d.weaned + '</span></div>';
    }).join('') : '<div class="m">لسه مفيش ولادات</div>') + '</div>';

    h += '<div class="card"><button class="btn s wide" onclick="UI.exportCSV()">📊 تصدير كل الحسابات (CSV)</button></div>';
    return h;
  }

  /* ---------- المزيد ---------- */
  UI.moreTab = function () {
    var sub = UI.sub.more || 'feed';
    var head = UI.chips([['feed', 'العلف'], ['settings', 'الإعدادات'], ['backup', 'النسخ'], ['sync', 'المزامنة']], sub, 'UI.moreSub');
    return head + (sub === 'feed' ? feedView() : sub === 'settings' ? settingsView() : sub === 'backup' ? backupView() : syncView());
  };
  UI.moreSub = function (k) { UI.sub.more = k; UI.render(); };

  function feedView() {
    var s = S(), mo = today().slice(0, 7);
    var used = (s.feedLog || []).filter(function (x) { return (x.date || '').slice(0, 7) === mo; });
    var kg = used.reduce(function (a, x) { return a + (+x.kg || 0); }, 0);
    var cost = used.reduce(function (a, x) { return a + (+x.cost || 0); }, 0);
    var h = '<div class="grid">' + stat(kg, 'كجم الشهر ده') + stat(cost, 'تكلفة الشهر') + '</div>';
    h += '<button class="btn wide mt8" onclick="UI.feedForm()">+ نوع علف</button>' +
      '<button class="btn s wide mt8" onclick="UI.feedLogForm()">- تسجيل استهلاك</button>';
    h += (s.feed || []).length ? (s.feed || []).map(function (f) {
      var low = (+f.stockKg || 0) <= (f.low != null ? f.low : (s.set.feedLow || 20));
      return '<div class="card"><div class="row" style="border:0"><span><b>🌾 ' + esc(f.name) + '</b>' +
        '<div class="m">' + num(f.kgPrice) + ' ' + money0() + '/كجم</div></span>' +
        '<span class="tag ' + (low ? 'r' : 'b') + '">' + num(f.stockKg) + ' كجم</span></div>' +
        '<div class="chips wrap mt6"><button onclick="UI.feedForm(\'' + f.id + '\')">✏️ تعديل</button>' +
        '<button onclick="UI.delItem(\'feed\',\'' + f.id + '\',\'نوع علف\')">🗑️ حذف</button></div></div>';
    }).join('') : '<div class="card empty">لسه مفيش أنواع علف مسجلة</div>';
    var log = (s.feedLog || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 15);
    if (log.length) h += '<div class="card"><h3>آخر الاستهلاك</h3>' + log.map(function (x) {
      var f = (s.feed || []).find(function (y) { return y.id === x.feedId; });
      return '<div class="row"><span>' + esc(f ? f.name : '؟') + ' — ' + num(x.kg) + ' كجم<div class="m">' + fmt(x.date) + '</div></span>' +
        '<button class="btn d sm" onclick="UI.delItem(\'feedLog\',\'' + x.id + '\',\'استهلاك\')">🗑️</button></div>';
    }).join('') + '</div>';
    return h;
  }

  function settingsView() {
    var s = S();
    var rows = [
      ['gest', 'مدة الحمل (يوم)'], ['palp', 'جس الحمل بعد (يوم)'], ['nest', 'تجهيز بيت الولادة بعد (يوم)'],
      ['wean', 'الفطام بعد الولادة (يوم)'], ['wtarget', 'وزن الجاهز للبيع (جرام)'],
      ['feedLow', 'تنبيه العلف لما يقل عن (كجم)'], ['debtDays', 'تنبيه فلوس العميل بعد (يوم)']
    ];
    return '<div class="card"><h3>⏱️ الأرقام والمواعيد</h3><div class="m">دي تقديرات شائعة — عدّلها حسب خبرتك.</div>' +
      rows.map(function (r) {
        return '<label>' + r[1] + '</label><input type="number" inputmode="numeric" value="' + s.set[r[0]] +
          '" onchange="UI.setNum(\'' + r[0] + '\',this.value)">';
      }).join('') +
      '<label>رمز العملة</label><input value="' + esc(s.set.currency) + '" onchange="UI.setCurrency(this.value)"></div>' +
      '<div class="card"><h3>📦 البيانات</h3><div class="m">' +
      (S().does || []).length + ' أنثى • ' + (S().bucks || []).length + ' ذكر • ' + (S().matings || []).length + ' تزاوج • ' +
      (S().births || []).length + ' ولادة • ' + (S().batches || []).length + ' دفعة • ' + (S().sales || []).length + ' بيع • ' +
      (S().expenses || []).length + ' مصروف</div></div>';
  }
  UI.setNum = function (k, v) {
    var n = +v;
    if (!n || n < 0) return UI.toast('رقم غير صالح');
    S().set[k] = n; Store.save(); UI.render();
  };
  UI.setCurrency = function (v) { S().set.currency = v || 'ج'; Store.save(); UI.render(); };

  function backupView() {
    var s = S(), auto = Store.autoBackup();
    return '<div class="card"><h3>💾 نسخة احتياطية</h3>' +
      '<div class="m">آخر نسخة يدوية: ' + (s.lastBackup ? fmt(s.lastBackup) : 'لسه محصلتش') + '<br>' +
      'خد نسخة كل فترة وابعتھا لنفسك على واتساب، حتى مع المزامنة.</div>' +
      '<div class="acts mt8"><button class="btn" onclick="UI.exportData()">⬇️ حفظ نسخة</button>' +
      '<button class="btn s" onclick="document.getElementById(\'imp\').click()">⬆️ استرجاع نسخة</button></div>' +
      '<input type="file" id="imp" accept=".json,application/json" hidden onchange="UI.importData(this)"></div>' +
      '<div class="card"><h3>♻️ نسخة تلقائية</h3>' +
      (auto ? '<div class="m">آخر نسخة تلقائية: ' + new Date(auto.at).toLocaleString('ar-EG') + (auto.why ? ' — ' + esc(auto.why) : '') + '</div>' +
        '<button class="btn s wide mt8" onclick="UI.restoreAuto()">استرجاع النسخة التلقائية</button>'
        : '<div class="m">لسه مفيش نسخة تلقائية. بتتعمل لوحدها قبل أي استرجاع.</div>') + '</div>' +
      '<div class="card"><button class="btn s wide" onclick="UI.exportCSV()">📊 تصدير Excel (CSV)</button></div>' +
      '<div class="card"><h3>🧹 مسح البيانات</h3><div class="m">يمسح كل حاجة على الجهاز ده (بعد ما ياخد نسخة تلقائية).</div>' +
      '<button class="btn d wide mt8" onclick="UI.wipe()">مسح كل البيانات</button></div>';
  }

  function syncView() {
    var on = !!Store.syncCode();
    return '<div class="card"><h3>🔄 مزامنة بين الأجهزة</h3>' +
      '<div class="m">الحالة: <b id="syncst">' + ({ off: 'مقفولة', idle: 'مفعّلة', busy: 'جاري المزامنة…', ok: 'تمام', err: 'مفيش اتصال' }[Store.syncState] || 'مقفولة') + '</b><br>' +
      'اكتب نفس كود المزامنة على الجهازين وهتشوف نفس البيانات على الاتنين.</div>' +
      '<div class="acts mt8">' + (on ?
        '<button class="btn" onclick="Store.syncPull(false)">🔄 مزامنة دلوقتي</button>' +
        '<button class="btn d" onclick="UI.syncOff()">إيقاف</button>' :
        '<button class="btn" onclick="UI.syncOn()">تفعيل المزامنة</button>') + '</div></div>' +
      '<div class="card m">المزامنة بتحمي من نسيان النسخ، بس مش بديل عنها. الكود اللي تكتبه هو المفتاح — لو نسيته مش هتوصل لبياناتك على جهاز تاني.</div>';
  }
  UI.syncOn = function () {
    UI.sheet('🔄 تفعيل المزامنة', UI.field('كود المزامنة (8 حروف على الأقل)', 'f1', 'text', '', 'placeholder="جملة طويلة تخصك"') +
      '<div class="m">اكتب نفس الكود بالظبط على الجهاز التاني.</div>' +
      '<div class="acts"><button class="btn" onclick="UI.doSyncOn()">تفعيل</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.doSyncOn = function () {
    var c = UI.V('f1');
    if (!c || c.length < 8) return UI.toast('الكود لازم 8 حروف على الأقل');
    UI.closeS(); UI.toast('جاري المزامنة…');
    Store.syncOn(c).then(function () { UI.render(); UI.toast('المزامنة اتفعلت'); });
  };
  UI.syncOff = function () {
    UI.confirm('إيقاف المزامنة على الجهاز ده؟ بياناتك هتفضل عليه.', function () {
      Store.syncOff(); UI.render(); UI.toast('اتقفلت');
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
