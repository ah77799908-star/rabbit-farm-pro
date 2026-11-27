/* ui-forms.js — كل نماذج التسجيل والحفظ والحذف */
(function (root) {
  'use strict';
  var Core = root.Core, Store = root.Store, UI = root.UI;
  var esc = Core.esc, fmt = Core.fmt, num = Core.num, today = Core.today, V = function (id) { return UI.V(id); };
  var S = function () { return Store.S; };

  /* ---------- قوائم مساعدة ---------- */
  function doeOpts(sel) {
    return Core.activeDoes(S()).sort(function (a, b) { return String(a.num).localeCompare(String(b.num), undefined, { numeric: true }); })
      .map(function (d) { return [d.id, d.num]; });
  }
  function buckOpts(sel) {
    var arr = Core.activeBucks(S()).map(function (b) { return [b.id, b.num]; });
    return arr.length ? arr : [['', 'مفيش ذكور مسجلة']];
  }
  function cageOpts(sel) {
    return [['', 'بدون']].concat((S().cages || []).map(function (c) { return [c.id, c.name]; }));
  }
  function targetOpts(t, ref) {
    var arr = [['all', 'كل الأرانب']];
    Core.activeDoes(S()).forEach(function (d) { arr.push(['doe:' + d.id, 'أنثى ' + d.num]); });
    Core.activeBucks(S()).forEach(function (b) { arr.push(['buck:' + b.id, 'ذكر ' + b.num]); });
    (S().batches || []).filter(function (b) { return !b.closed; }).forEach(function (b) { arr.push(['batch:' + b.id, 'دفعة ' + (b.num || fmt(b.date))]); });
    var want = t && ref ? t + ':' + ref : 'all';
    return { opts: arr, val: arr.some(function (o) { return o[0] === want; }) ? want : 'all' };
  }
  function parseTarget(v) {
    var p = String(v || 'all').split(':');
    return p.length > 1 ? { target: p[0], ref: p[1] } : { target: 'all', ref: '' };
  }
  UI.parseTarget = parseTarget;

  /* ---------- إناث ---------- */
  UI.doeForm = function (id) {
    var d = id ? Core.doeOf(S(), id) : null;
    UI.sheet(d ? '✏️ تعديل الأنثى ' + esc(d.num) : '🐰 أنثى جديدة',
      UI.field('رقم الأنثى', 'f1', 'text', d ? d.num : '', 'placeholder="مثال: 12"') +
      UI.field('السلالة / اللون (اختياري)', 'f2', 'text', d ? d.breed : '') +
      UI.field('تاريخ الميلاد (اختياري)', 'f3', 'date', d ? d.born : '') +
      UI.select('القفص', 'f4', cageOpts(), d ? d.cage : '') +
      UI.select('الأب (لو معروف)', 'f5', [['', 'مش معروف']].concat(buckOpts()), d ? d.sire : '') +
      UI.select('الأم (لو معروفة)', 'f6', [['', 'مش معروفة']].concat(doeOpts()), d ? d.dam : '') +
      UI.field('ملاحظات (اختياري)', 'f7', 'text', d ? d.note : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveDoe(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveDoe = function (id) {
    var n = V('f1'); if (!n) return UI.toast('اكتب رقم الأنثى');
    var s = S();
    if ((s.does || []).some(function (d) { return String(d.num) === n && d.id !== id; })) return UI.toast('الرقم ده موجود بالفعل');
    var d = id ? Core.doeOf(s, id) : null;
    if (!d) { d = { id: Core.uid(), num: n, created: today() }; s.does.push(d); }
    d.num = n; d.breed = V('f2'); d.born = V('f3'); d.cage = V('f4');
    d.sire = V('f5'); d.dam = V('f6'); d.note = V('f7');
    Store.save(); UI.closeS(); UI.render(); UI.toast(id ? 'تم التعديل' : 'اتضافت الأنثى ' + n);
  };
  UI.bulkDoes = function () {
    UI.sheet('➕ إضافة أرقام كتير',
      '<div class="m">اكتب من رقم لرقم، أو أرقام مفصولة بفاصلة.</div>' +
      UI.field('من', 'f1', 'number', '') + UI.field('إلى', 'f2', 'number', '') +
      UI.field('أو أرقام (مثال: 3,7,12-15)', 'f3', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveBulk()">إضافة</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBulk = function () {
    var nums = [];
    var a = +V('f1'), b = +V('f2');
    if (a && b && b >= a && b - a <= 500) { for (var i = a; i <= b; i++) nums.push(String(i)); }
    if (V('f3')) {
      V('f3').split(/[,\u060C\s]+/).forEach(function (part) {
        var m = /^(\d+)-(\d+)$/.exec(part);
        if (m) { for (var j = +m[1]; j <= +m[2] && j - +m[1] < 200; j++) nums.push(String(j)); }
        else if (/^\d+$/.test(part)) nums.push(String(+part));
      });
    }
    if (!nums.length) return UI.toast('اكتب أرقام صحيحة');
    var s = S(), added = 0;
    nums.forEach(function (n) {
      if (!(s.does || []).some(function (d) { return String(d.num) === n; })) { s.does.push({ id: Core.uid(), num: n, created: today() }); added++; }
    });
    Store.save(); UI.closeS(); UI.render(); UI.toast('اتضاف ' + added + ' أنثى');
  };
  UI.doeOut = function (id) {
    var d = Core.doeOf(S(), id); if (!d) return;
    if (d.out) {
      UI.confirm('ترجّع الأنثى ' + d.num + ' للخدمة؟', function () {
        d.out = false; d.outWhy = ''; Store.save(); UI.closeS(); UI.render(); UI.toast('رجعت للخدمة');
      });
      return;
    }
    UI.sheet('🚫 إخراج الأنثى ' + esc(d.num),
      UI.field('السبب (مباعة / نافقة / استبعاد)', 'f1', 'text', '') +
      UI.field('التاريخ', 'f2', 'date', today()) +
      '<div class="acts"><button class="btn d" onclick="UI.saveDoeOut(\'' + id + '\')">تأكيد</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveDoeOut = function (id) {
    var d = Core.doeOf(S(), id); if (!d) return;
    d.out = true; d.outWhy = V('f1') || 'خارج الخدمة'; d.outDate = V('f2') || today();
    S().deaths.push({ id: Core.uid(), date: d.outDate, kind: 'doe', ref: id, count: 1, cause: d.outWhy });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };

  /* ---------- ذكور ---------- */
  UI.buckForm = function (id) {
    var b = id ? Core.byId(S(), id) : null;
    UI.sheet(b ? '✏️ تعديل الذكر ' + esc(b.num) : '🐇 ذكر جديد',
      UI.field('اسم / رقم الذكر', 'f1', 'text', b ? b.num : '') +
      UI.field('السلالة / اللون (اختياري)', 'f2', 'text', b ? b.breed : '') +
      UI.field('تاريخ الميلاد (اختياري)', 'f3', 'date', b ? b.born : '') +
      UI.field('الوزن الحالي (كجم)', 'f4', 'number', b ? (UI.lastBuckWeight(b) || '') : '') +
      UI.field('تاريخ الوزن', 'f5', 'date', today()) +
      UI.select('القفص', 'f6', cageOpts(), b ? b.cage : '') +
      UI.select('الأب (لو معروف)', 'f7', [['', 'مش معروف']].concat(buckOpts()), b ? b.sire : '') +
      UI.select('الأم (لو معروفة)', 'f8', [['', 'مش معروفة']].concat(doeOpts()), b ? b.dam : '') +
      UI.field('ملاحظات (اختياري)', 'f9', 'text', b ? b.note : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveBuck(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBuck = function (id) {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم أو رقم الذكر');
    var s = S(), b = id ? Core.byId(s, id) : null;
    if ((s.bucks || []).some(function (x) { return x.num === n && x.id !== id; })) return UI.toast('الاسم ده موجود');
    if (!b) { b = { id: Core.uid(), num: n, ws: [], created: today() }; s.bucks.push(b); }
    b.num = n; b.breed = V('f2'); b.born = V('f3'); b.cage = V('f6');
    b.sire = V('f7'); b.dam = V('f8'); b.note = V('f9');
    var k = +V('f4'); b.ws = b.ws || [];
    if (k > 0 && V('f5')) { var e = b.ws.find(function (x) { return x.d === V('f5'); }); if (e) e.k = k; else b.ws.push({ d: V('f5'), k: k }); }
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم الحفظ');
  };
  UI.weighBuck = function (id) {
    UI.sheet('⚖️ وزن جديد', UI.field('التاريخ', 'f1', 'date', today()) +
      UI.field('الوزن (كجم)', 'f2', 'number', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveBuckWeight(\'' + id + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBuckWeight = function (id) {
    var k = +V('f2'); if (!k || !V('f1')) return UI.toast('اكتب الوزن والتاريخ');
    var b = Core.byId(S(), id); b.ws = b.ws || [];
    var e = b.ws.find(function (x) { return x.d === V('f1'); }); if (e) e.k = k; else b.ws.push({ d: V('f1'), k: k });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل الوزن');
  };
  UI.toggleBuckOut = function (id) {
    var b = Core.byId(S(), id);
    if (b.out) { b.out = false; b.outWhy = ''; Store.save(); UI.render(); return UI.toast('رجع للخدمة'); }
    UI.sheet('🚫 إخراج الذكر ' + esc(b.num), UI.field('السبب', 'f1', 'text', '') +
      '<div class="acts"><button class="btn d" onclick="UI.saveBuckOut(\'' + id + '\')">تأكيد</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBuckOut = function (id) {
    var b = Core.byId(S(), id); b.out = true; b.outWhy = V('f1') || 'خارج الخدمة'; b.outDate = today();
    S().deaths.push({ id: Core.uid(), date: today(), kind: 'buck', ref: id, count: 1, cause: b.outWhy });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };

  /* ---------- تزاوج ---------- */
  UI.matingForm = function (doeId) {
    var s = S();
    if (!Core.activeDoes(s).length) return UI.toast('ضيف إناث الأول');
    if (!Core.activeBucks(s).length) return UI.toast('ضيف ذكور الأول (تبويب الأرانب ← الذكور)');
    UI.sheet('💕 تسجيل تزاوج',
      UI.select('الأنثى', 'f1', doeOpts(), doeId || '') +
      UI.select('الذكر', 'f2', buckOpts(), '') +
      UI.field('التاريخ', 'f3', 'date', today()) +
      '<div id="rel" class="m"></div><div class="m" id="est"></div>' +
      '<div class="acts"><button class="btn" onclick="UI.saveMating()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
    var upd = function () {
      var d = V('f1'), b = V('f2'), dt = V('f3') || today();
      document.getElementById('est').textContent = 'الولادة المتوقعة: ' + fmt(Core.addDays(dt, s.set.gest));
      var rel = Core.relation(s, d, b), box = document.getElementById('rel');
      if (rel === 'ok' || rel === 'unknown') { box.innerHTML = ''; return; }
      box.innerHTML = '<span class="tag ' + (Core.relationBlocked(rel) ? 'r' : 'o') + '">⚠️ ' + esc(Core.REL_TEXT[rel] || '') + '</span>';
    };
    document.getElementById('f1').onchange = upd; document.getElementById('f2').onchange = upd; document.getElementById('f3').onchange = upd;
    upd();
  };
  UI.saveMating = function () {
    var s = S(), d = V('f1'), b = V('f2'), dt = V('f3');
    if (!dt) return UI.toast('اختار التاريخ');
    var rel = Core.relation(s, d, b);
    if (Core.relationBlocked(rel)) return UI.toast('مينفعش: ' + (Core.REL_TEXT[rel] || 'نسب قريب'));
    var open = Core.openMating(s, d);
    var go = function () {
      if (open) open.result = 'failed';
      s.matings.push({ id: Core.uid(), doe: d, buck: b, date: dt, result: 'pending', created: today() });
      Store.save(); UI.closeS(); UI.render();
      UI.toast('تم — الولادة المتوقعة ' + fmt(Core.addDays(dt, s.set.gest)));
    };
    if (open) UI.confirm('الأنثى عليها تزاوج مفتوح بتاريخ ' + fmt(open.date) + '. نسجّل تزاوج جديد ونلغي القديم؟', go);
    else go();
  };

  /* ---------- ولادة ---------- */
  UI.birthForm = function (doeId) {
    var s = S();
    if (!Core.activeDoes(s).length) return UI.toast('ضيف إناث الأول');
    var pre = doeId ? Core.status(s, doeId) : null;
    UI.sheet('🍼 تسجيل ولادة',
      UI.select('الأنثى', 'f1', doeOpts(), doeId || '') +
      UI.field('تاريخ الولادة', 'f2', 'date', today()) +
      UI.field('عدد الأحياء', 'f3', 'number', pre && pre.k === 'preg' && pre.m ? '' : '') +
      UI.field('عدد النافق', 'f4', 'number', '0') +
      UI.field('ملاحظات (اختياري)', 'f5', 'text', '') +
      '<div class="m" id="wb"></div>' +
      '<div class="acts"><button class="btn" onclick="UI.saveBirth()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
    var upd = function () {
      var dt = V('f2') || today();
      document.getElementById('wb').textContent = 'الفطام المتوقع: ' + fmt(Core.addDays(dt, s.set.wean));
    };
    document.getElementById('f2').onchange = upd; upd();
  };
  UI.saveBirth = function () {
    var s = S(), d = V('f1'), dt = V('f2'), a = +V('f3') || 0, x = +V('f4') || 0;
    if (!dt) return UI.toast('اختار تاريخ الولادة');
    if (a + x === 0) return UI.toast('اكتب عدد الصغار');
    var m = Core.openMating(s, d);
    if (m) m.result = 'born';
    s.births.push({
      id: Core.uid(), doe: d, matingId: m ? m.id : null, buck: m ? m.buck : '',
      date: dt, alive: a, dead: x, weaned: false, note: V('f5'), created: today()
    });
    Store.save(); UI.closeS(); UI.render(); UI.toast('مبروك 🎉 الفطام المتوقع ' + fmt(Core.addDays(dt, s.set.wean)));
  };

  /* ---------- فطام ---------- */
  UI.weanForm = function (doeId) {
    var s = S();
    var open = (s.births || []).filter(function (b) { return !b.weaned && (+b.alive || 0) > 0; });
    if (!open.length) return UI.toast('مفيش ولادات مستنية فطام');
    var sel = open.filter(function (b) { return b.doe === doeId; })[0] || open[0];
    UI.sheet('✂️ تسجيل فطام',
      UI.select('الولادة', 'f1', open.map(function (b) {
        return [b.id, 'أم ' + Core.doeNum(s, b.doe) + ' — ' + fmt(b.date) + ' (' + b.alive + ')'];
      }), sel.id) +
      UI.field('تاريخ الفطام', 'f2', 'date', today()) +
      UI.field('عدد الصغار اللي اتفطموا', 'f3', 'number', sel.alive) +
      UI.field('متوسط الوزن (جرام)', 'f4', 'number', '') +
      UI.field('رقم الدفعة / القفص', 'f5', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveWean()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
    document.getElementById('f1').onchange = function () {
      var b = s.births.find(function (y) { return y.id === V('f1'); });
      if (b) document.getElementById('f3').value = b.alive;
    };
  };
  UI.saveWean = function () {
    var s = S(), b = (s.births || []).find(function (x) { return x.id === V('f1'); });
    if (!b) return UI.toast('اختار الولادة');
    var dt = V('f2') || today(), cnt = +V('f3') || 0;
    if (cnt < 0 || cnt > (+b.alive || 0)) return UI.toast('العدد أكبر من الأحياء');
    b.weaned = true; b.weanDate = dt; b.weanedCount = cnt;
    var id = Core.uid();
    var batch = { id: id, num: V('f5'), birthId: b.id, doe: b.doe, date: dt, count: cnt, m: 0, f: 0, cage: '', ws: [], dead: 0, sold: 0, closed: false, created: today() };
    var g = +V('f4'); if (g > 0) batch.ws.push({ d: dt, g: g });
    s.batches.push(batch);
    Store.save(); UI.closeS(); UI.sub.herd = 'batches'; UI.tab = 'herd'; UI.render();
    UI.toast('اتسجلت دفعة فطام (' + cnt + ' أرنب)');
  };

  /* ---------- دفعات ---------- */
  UI.batchForm = function (id) {
    var s = S(), b = id ? (s.batches || []).find(function (x) { return x.id === id; }) : null;
    UI.sheet(b ? '✏️ تعديل الدفعة' : '🍼 دفعة فطام جديدة',
      UI.field('رقم الدفعة / القفص', 'f1', 'text', b ? b.num : '', 'placeholder="مثال: 5"') +
      UI.field('تاريخ الفطام', 'f2', 'date', b ? b.date : today()) +
      UI.field('العدد', 'f3', 'number', b ? b.count : '') +
      UI.field('متوسط الوزن (جرام)', 'f4', 'number', b ? (Core.batchLastWeight(b) || '') : '', 'placeholder="مثال: 650"') +
      UI.field('تاريخ الوزن', 'f5', 'date', today()) +
      UI.select('من أم', 'f6', [['', '—']].concat(doeOpts()), b ? b.doe : '') +
      '<div class="two">' + UI.field('ذكور', 'f7', 'number', b ? b.m : '') + UI.field('إناث', 'f8', 'number', b ? b.f : '') + '</div>' +
      UI.select('القفص', 'f9', cageOpts(), b ? b.cage : '') +
      UI.field('ملاحظات', 'f10', 'text', b ? b.note : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveBatch(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBatch = function (id) {
    var s = S(), c = +V('f3'), dt = V('f2');
    if (!dt) return UI.toast('اختار تاريخ الفطام');
    if (!c || c < 1) return UI.toast('اكتب العدد');
    var b = id ? (s.batches || []).find(function (x) { return x.id === id; }) : null;
    if (!b) { b = { id: Core.uid(), ws: [], dead: 0, sold: 0, closed: false, created: today() }; s.batches.push(b); }
    b.num = V('f1'); b.date = dt; b.count = c; b.doe = V('f6'); b.m = +V('f7') || 0; b.f = +V('f8') || 0;
    b.cage = V('f9'); b.note = V('f10');
    var g = +V('f4'); b.ws = b.ws || [];
    if (g > 0 && V('f5')) { var e = b.ws.find(function (x) { return x.d === V('f5'); }); if (e) e.g = g; else b.ws.push({ d: V('f5'), g: g }); }
    Store.save(); UI.closeS(); UI.tab = 'herd'; UI.sub.herd = 'batches'; UI.render(); UI.toast('تم الحفظ');
  };
  UI.weighBatch = function (id) {
    UI.sheet('⚖️ وزن جديد', UI.field('التاريخ', 'f1', 'date', today()) +
      UI.field('متوسط وزن الأرنب (جرام)', 'f2', 'number', '', 'placeholder="مثال: 900"') +
      '<div class="acts"><button class="btn" onclick="UI.saveBatchWeight(\'' + id + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveBatchWeight = function (id) {
    var g = +V('f2'); if (!g || !V('f1')) return UI.toast('اكتب الوزن والتاريخ');
    var b = (S().batches || []).find(function (x) { return x.id === id; }); b.ws = b.ws || [];
    var e = b.ws.find(function (x) { return x.d === V('f1'); }); if (e) e.g = g; else b.ws.push({ d: V('f1'), g: g });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل الوزن');
  };
  UI.deadBatch = function (id) {
    UI.sheet('☠️ نافق', UI.field('عدد النافق', 'f1', 'number', '1') +
      UI.field('السبب (اختياري)', 'f2', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveDeadBatch(\'' + id + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveDeadBatch = function (id) {
    var n = +V('f1'), b = (S().batches || []).find(function (x) { return x.id === id; });
    if (!n || n < 1) return UI.toast('اكتب العدد');
    if (n > Core.batchLive(b)) return UI.toast('العدد أكبر من الموجود');
    b.dead = (+b.dead || 0) + n;
    S().deaths.push({ id: Core.uid(), date: today(), kind: 'batch', ref: id, count: n, cause: V('f2') });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };

  /* ---------- بيع ---------- */
  UI.saleForm = function (opt) {
    opt = opt || {};
    var s = S(), custs = (s.custs || []).map(function (c) { return [c.id, c.name]; });
    UI.sheet('💰 تسجيل بيع',
      UI.field('التاريخ', 'f1', 'date', today()) +
      UI.field('عدد الأرانب', 'f2', 'number', '1') +
      UI.field('الوزن الإجمالي (كجم)', 'f6', 'number', '', 'oninput="UI.calcSale()"') +
      UI.field('سعر الكيلو', 'f7', 'number', '', 'oninput="UI.calcSale()"') +
      UI.field('الإجمالي', 'f3', 'number', '') +
      '<div class="m">لو كتبت الوزن وسعر الكيلو الإجمالي يتحسب لوحده.</div>' +
      UI.select('العميل', 'f4', [['', 'بيع نقدي / بدون عميل']].concat(custs), opt.cust || '') +
      UI.select('من أم', 'f5', [['', '—']].concat(doeOpts()), opt.doe || '') +
      UI.select('من دفعة', 'f8', [['', '—']].concat((s.batches || []).filter(function (b) { return !b.closed; })
        .map(function (b) { return [b.id, 'دفعة ' + (b.num || fmt(b.date)) + ' (' + Core.batchLive(b) + ')']; })), opt.batch || '') +
      '<label>الدفع</label><div class="chips"><button type="button" class="on" id="paidBtn" onclick="UI.setPaid(1)">مدفوع</button>' +
      '<button type="button" id="debtBtn" onclick="UI.setPaid(0)">آجل</button></div>' +
      '<div class="acts"><button class="btn" onclick="UI.saveSale()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
    UI._paid = 1;
  };
  UI.setPaid = function (v) {
    UI._paid = v;
    var a = document.getElementById('paidBtn'), b = document.getElementById('debtBtn');
    if (a) a.className = v ? 'on' : '';
    if (b) b.className = v ? '' : 'on';
  };
  UI.calcSale = function () {
    var w = +V('f6'), k = +V('f7');
    if (w && k) document.getElementById('f3').value = Math.round(w * k * 100) / 100;
  };
  UI.saveSale = function () {
    var s = S(), c = +V('f2'), dt = V('f1');
    if (!dt) return UI.toast('اختار التاريخ');
    if (!c || c < 1) return UI.toast('اكتب عدد الأرانب');
    var w = +V('f6') || 0, k = +V('f7') || 0, total = +V('f3') || 0;
    if (!total && w && k) total = Math.round(w * k * 100) / 100;
    if (!total) return UI.toast('اكتب الإجمالي أو الوزن وسعر الكيلو');
    var batchId = V('f8'), batch = batchId ? (s.batches || []).find(function (b) { return b.id === batchId; }) : null;
    if (batch) {
      if (c > Core.batchLive(batch)) return UI.toast('الدفعة فيها ' + Core.batchLive(batch) + ' بس');
      batch.sold = (+batch.sold || 0) + c;
      if (Core.batchLive(batch) === 0) batch.closed = true;
      if (!w) { var lw = Core.batchLastWeight(batch); if (lw) w = Math.round(lw * c) / 1000; }
    }
    s.sales.push({
      id: Core.uid(), date: dt, count: c, weight: w, kilo: k, total: total,
      cust: V('f4'), doe: V('f5'), batch: batchId, paid: !!UI._paid, note: '', created: today()
    });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل بيع ' + num(total) + ' ' + s.set.currency);
  };

  /* ---------- مصروفات ---------- */
  var CATS = ['علف', 'أدوية وتحصين', 'شراء أرانب', 'عمالة', 'كهرباء ومياه', 'أقفاص وتجهيزات', 'نقل', 'أخرى'];
  UI.expForm = function (id) {
    var e = id ? (S().expenses || []).find(function (x) { return x.id === id; }) : null;
    UI.sheet(e ? '✏️ تعديل مصروف' : '🧾 مصروف جديد',
      UI.field('التاريخ', 'f1', 'date', e ? e.date : today()) +
      UI.select('النوع', 'f2', CATS.map(function (c) { return [c, c]; }), e ? e.cat : 'علف') +
      UI.field('المبلغ', 'f3', 'number', e ? e.amount : '') +
      UI.field('البيان (اختياري)', 'f4', 'text', e ? e.note : '', 'placeholder="مثال: 3 شكاير علف"') +
      '<div class="acts"><button class="btn" onclick="UI.saveExp(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveExp = function (id) {
    var s = S(), amt = +V('f3'), dt = V('f1');
    if (!dt) return UI.toast('اختار التاريخ');
    if (!amt || amt <= 0) return UI.toast('اكتب المبلغ');
    var e = id ? (s.expenses || []).find(function (x) { return x.id === id; }) : null;
    if (!e) { e = { id: Core.uid(), created: today() }; s.expenses.push(e); }
    e.date = dt; e.cat = V('f2'); e.amount = amt; e.note = V('f4');
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل المصروف');
  };

  /* ---------- عملاء ودفعات ---------- */
  UI.custForm = function (id) {
    var c = id ? Core.custOf(S(), id) : null;
    UI.sheet(c ? '✏️ تعديل العميل' : '👤 عميل جديد',
      UI.field('الاسم', 'f1', 'text', c ? c.name : '') +
      UI.field('التليفون (اختياري)', 'f2', 'tel', c ? c.phone : '') +
      UI.field('ملاحظات (اختياري)', 'f3', 'text', c ? c.note : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveCust(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveCust = function (id) {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم العميل');
    var s = S(), c = id ? Core.custOf(s, id) : null;
    if (!c) { c = { id: Core.uid(), created: today() }; s.custs.push(c); }
    c.name = n; c.phone = V('f2'); c.note = V('f3');
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم الحفظ');
  };
  UI.payForm = function (custId) {
    var s = S(), bal = Core.custBalance(s, custId);
    UI.sheet('💵 تسجيل دفعة',
      '<div class="m">المتبقي على العميل: <b>' + num(bal) + ' ' + esc(s.set.currency) + '</b></div>' +
      UI.field('التاريخ', 'f1', 'date', today()) +
      UI.field('المبلغ', 'f2', 'number', bal > 0 ? bal : '') +
      UI.field('ملاحظات (اختياري)', 'f3', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.savePay(\'' + custId + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.savePay = function (custId) {
    var amt = +V('f2');
    if (!amt || amt <= 0) return UI.toast('اكتب المبلغ');
    S().payments.push({ id: Core.uid(), date: V('f1') || today(), cust: custId, amount: amt, note: V('f3') });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل الدفعة');
  };

  /* ---------- صحة ---------- */
  UI.injForm = function (opt) {
    opt = opt || {};
    var tt = targetOpts(opt.target, opt.ref);
    UI.sheet('💉 تسجيل حقنة',
      UI.field('اسم الحقنة', 'f1', 'text', '', 'placeholder="مثال: فيتامين / مضاد حيوي"') +
      UI.select('لمين', 'f2', tt.opts, tt.val) +
      UI.field('التاريخ', 'f3', 'date', today()) +
      UI.field('الجرعة (اختياري)', 'f4', 'text', '', 'placeholder="مثال: 0.5 مل"') +
      UI.field('موعد الجرعة الجاية (اختياري)', 'f5', 'date', '') +
      UI.field('ملاحظات (اختياري)', 'f6', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveInj()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveInj = function () {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم الحقنة');
    if (!V('f3')) return UI.toast('اختار التاريخ');
    var t = parseTarget(V('f2'));
    S().inj.push({ id: Core.uid(), name: n, target: t.target, ref: t.ref, date: V('f3'), dose: V('f4'), next: V('f5'), note: V('f6'), done: false });
    Store.save(); UI.closeS(); UI.tab = 'health'; UI.sub.health = 'inj'; UI.render(); UI.toast('تم التسجيل');
  };
  UI.doneInj = function (id) {
    var x = (S().inj || []).find(function (y) { return y.id === id; });
    if (!x) return;
    x.done = true; x.doneDate = today();
    Store.save(); UI.render(); UI.toast('تم');
  };
  UI.medForm = function (opt) {
    opt = opt || {};
    var tt = targetOpts(opt.target, opt.ref);
    UI.sheet('💊 تسجيل دواء',
      UI.field('اسم الدواء', 'f1', 'text', '') +
      UI.select('لمين', 'f2', tt.opts, tt.val) +
      UI.field('تاريخ البدء', 'f3', 'date', today()) +
      UI.field('الجرعة (اختياري)', 'f4', 'text', '', 'placeholder="مثال: نص قرص يوميا"') +
      '<label>أيام الأسبوع</label><div class="chips wrap">' +
      Core.DAYS.map(function (d) {
        return '<label class="chk"><input type="checkbox" class="dk" value="' + d[0] + '" checked>' + d[1] + '</label>';
      }).join('') + '</div>' +
      UI.field('تاريخ الانتهاء (اختياري)', 'f5', 'date', '') +
      UI.field('ملاحظات (اختياري)', 'f6', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveMed()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveMed = function () {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم الدواء');
    if (!V('f3')) return UI.toast('اختار التاريخ');
    var days = Array.prototype.slice.call(document.querySelectorAll('.dk:checked')).map(function (e) { return +e.value; });
    if (!days.length) return UI.toast('اختار يوم واحد على الأقل');
    var t = parseTarget(V('f2'));
    S().meds.push({ id: Core.uid(), name: n, target: t.target, ref: t.ref, date: V('f3'), days: days, dose: V('f4'), end: V('f5'), note: V('f6') });
    Store.save(); UI.closeS(); UI.tab = 'health'; UI.sub.health = 'meds'; UI.render(); UI.toast('تم التسجيل');
  };
  UI.vaxForm = function (id) {
    var v = id ? (S().vax || []).find(function (x) { return x.id === id; }) : null;
    UI.sheet('🧪 بند في برنامج التحصين',
      UI.field('اسم التحصين', 'f1', 'text', v ? v.name : '', 'placeholder="مثال: تحصين الأرانب"') +
      UI.field('العمر (بالأيام من الولادة)', 'f2', 'number', v ? v.ageDays : '') +
      UI.field('ملاحظات (اختياري)', 'f3', 'text', v ? v.note : '') +
      '<div class="m">البرنامج بيتطبق على الدفعات اللي ليها تاريخ ولادة معروف.</div>' +
      '<div class="acts"><button class="btn" onclick="UI.saveVax(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveVax = function (id) {
    var n = V('f1'), a = +V('f2');
    if (!n) return UI.toast('اكتب اسم التحصين');
    if (!a || a <= 0) return UI.toast('اكتب العمر بالأيام');
    var s = S(), v = id ? (s.vax || []).find(function (x) { return x.id === id; }) : null;
    if (!v) { v = { id: Core.uid() }; s.vax.push(v); }
    v.name = n; v.ageDays = a; v.note = V('f3');
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };
  UI.vaxLogForm = function (batchId, name) {
    var s = S();
    var batches = (s.batches || []).filter(function (b) { return !b.closed; });
    UI.sheet('🧪 تسجيل تحصين',
      UI.select('الدفعة', 'f1', batches.length ? batches.map(function (b) { return [b.id, 'دفعة ' + (b.num || fmt(b.date))]; }) : [['', 'مفيش دفعات']], batchId || '') +
      UI.field('اسم التحصين', 'f2', 'text', name || '') +
      UI.field('التاريخ', 'f3', 'date', today()) +
      UI.field('ملاحظات (اختياري)', 'f4', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveVaxLog()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveVaxLog = function () {
    var n = V('f2'); if (!n) return UI.toast('اكتب اسم التحصين');
    S().vaxLog.push({ id: Core.uid(), ref: V('f1'), name: n, date: V('f3') || today(), note: V('f4') });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم تسجيل التحصين');
  };

  /* ---------- أقفاص وعلف ---------- */
  UI.cageForm = function (id) {
    var c = id ? (S().cages || []).find(function (x) { return x.id === id; }) : null;
    UI.sheet(c ? '✏️ تعديل القفص' : '🏠 قفص / عنبر جديد',
      UI.field('الاسم / الرقم', 'f1', 'text', c ? c.name : '', 'placeholder="مثال: عنبر 1 - قفص 3"') +
      UI.field('السعة (عدد الأقفاص/الحيوانات)', 'f2', 'number', c ? c.cap : '') +
      UI.field('ملاحظات', 'f3', 'text', c ? c.note : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveCage(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveCage = function (id) {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم القفص');
    var s = S(), c = id ? (s.cages || []).find(function (x) { return x.id === id; }) : null;
    if (!c) { c = { id: Core.uid() }; s.cages.push(c); }
    c.name = n; c.cap = +V('f2') || 0; c.note = V('f3');
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };
  UI.feedForm = function (id) {
    var f = id ? (S().feed || []).find(function (x) { return x.id === id; }) : null;
    UI.sheet(f ? '✏️ تعديل نوع العلف' : '🌾 نوع علف جديد',
      UI.field('الاسم', 'f1', 'text', f ? f.name : '', 'placeholder="مثال: علف بيليه 16%"') +
      UI.field('سعر الكيلو', 'f2', 'number', f ? f.kgPrice : '') +
      UI.field('المخزون الحالي (كجم)', 'f3', 'number', f ? f.stockKg : '') +
      UI.field('حد التنبيه (كجم)', 'f4', 'number', f && f.low != null ? f.low : '') +
      '<div class="acts"><button class="btn" onclick="UI.saveFeed(\'' + (id || '') + '\')">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveFeed = function (id) {
    var n = V('f1'); if (!n) return UI.toast('اكتب اسم العلف');
    var s = S(), f = id ? (s.feed || []).find(function (x) { return x.id === id; }) : null;
    if (!f) { f = { id: Core.uid() }; s.feed.push(f); }
    f.name = n; f.kgPrice = +V('f2') || 0; f.stockKg = +V('f3') || 0; f.low = V('f4') === '' ? null : +V('f4');
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم');
  };
  UI.feedLogForm = function () {
    var s = S(), feeds = s.feed || [];
    if (!feeds.length) return UI.toast('ضيف نوع علف الأول');
    UI.sheet('🌾 تسجيل استهلاك علف',
      UI.select('نوع العلف', 'f1', feeds.map(function (f) { return [f.id, f.name]; }), feeds[0].id) +
      UI.field('الكمية (كجم)', 'f2', 'number', '') +
      UI.field('التاريخ', 'f3', 'date', today()) +
      UI.field('ملاحظات', 'f4', 'text', '') +
      '<div class="acts"><button class="btn" onclick="UI.saveFeedLog()">حفظ</button>' +
      '<button class="btn s" onclick="UI.closeS()">إلغاء</button></div>');
  };
  UI.saveFeedLog = function () {
    var kg = +V('f2'); if (!kg || kg <= 0) return UI.toast('اكتب الكمية');
    var s = S(), f = (s.feed || []).find(function (x) { return x.id === V('f1'); });
    if (!f) return UI.toast('اختار نوع العلف');
    f.stockKg = Math.max(0, (+f.stockKg || 0) - kg);
    s.feedLog.push({ id: Core.uid(), date: V('f3') || today(), feedId: f.id, kg: kg, cost: Math.round(kg * (+f.kgPrice || 0) * 100) / 100, note: V('f4') });
    Store.save(); UI.closeS(); UI.render(); UI.toast('تم — فاضل ' + num(f.stockKg) + ' كجم');
  };

  /* ---------- حذف ---------- */
  UI.delItem = function (coll, id, label) {
    UI.confirm('حذف ' + (label || '') + '؟ هينفع ترجعها من زر التراجع.', function () {
      Store.remove(coll, id, label);
      UI.closeS(); UI.render();
      UI.toast('اتحذف ' + (label || ''), 'تراجع', function () {
        Store.undo(); UI.render(); UI.toast('رجع تاني');
      });
    }, 'أيوة، احذف');
  };
})(typeof window !== 'undefined' ? window : globalThis);
