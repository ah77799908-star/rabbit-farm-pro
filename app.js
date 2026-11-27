/* app.js — التشغيل، زر + السريع، التصدير والاستيراد */
(function (root) {
  'use strict';
  var Core = root.Core, Store = root.Store, UI = root.UI;
  var esc = Core.esc, today = Core.today, num = Core.num;

  UI.quick = function () {
    var items = [
      ['💕 تزاوج', 'UI.matingForm()'],
      ['🍼 ولادة', 'UI.birthForm()'],
      ['✂️ فطام', 'UI.weanForm()'],
      ['💰 بيع', 'UI.saleForm()'],
      ['🧾 مصروف', 'UI.expForm()'],
      ['💉 حقنة', 'UI.injForm()'],
      ['💊 دواء', 'UI.medForm()'],
      ['🌾 علف', 'UI.feedLogForm()'],
      ['🐰 أنثى جديدة', 'UI.doeForm()'],
      ['🐇 ذكر جديد', 'UI.buckForm()']
    ];
    UI.sheet('تسجيل سريع', '<div class="acts">' + items.map(function (it) {
      return '<button class="btn" onclick="UI.closeS();' + it[1] + '">' + it[0] + '</button>';
    }).join('') + '</div>');
  };

  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 1000);
  }
  UI.download = download;

  UI.exportData = function () {
    var s = Store.S;
    s.lastBackup = today();
    Store.save();
    download('rabbits-' + today() + '.json', JSON.stringify(s), 'application/json');
    UI.render();
    UI.toast('اتحفظت النسخة');
  };

  UI.importData = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var obj;
      try { obj = JSON.parse(r.result); } catch (e) { return UI.toast('الملف مش صالح'); }
      UI.confirm('هيتم استبدال البيانات الحالية بالنسخة دي (وهنحفظ نسخة تلقائية قبلها).', function () {
        try {
          Store.importData(obj);
          UI.render(); UI.toast('تم الاسترجاع');
        } catch (e) { UI.toast('الملف مش نسخة صحيحة'); }
      });
    };
    r.readAsText(f);
    input.value = '';
  };

  UI.restoreAuto = function () {
    UI.confirm('ترجع للنسخة التلقائية الأخيرة؟', function () {
      if (Store.restoreAuto()) { UI.render(); UI.toast('رجعت النسخة التلقائية'); }
      else UI.toast('مفيش نسخة تلقائية');
    });
  };

  UI.wipe = function () {
    UI.confirm('هتمسح كل البيانات على الجهاز ده. متأكد؟', function () {
      Store.snapshot('قبل المسح');
      Store.S = Store.blank();
      Store.save();
      UI.render();
      UI.toast('اتمسحت — تقدر ترجعها من النسخة التلقائية');
    }, 'أيوة، امسح');
  };

  /* ---------- CSV ---------- */
  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function csvOf(headers, rows) {
    return '\ufeff' + [headers].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }
  UI.exportCSV = function () {
    var s = Store.S;
    var rows = [];
    var H = ['النوع', 'التاريخ', 'البيان', 'الحيوان/العميل', 'العدد', 'الوزن كجم', 'سعر الكيلو', 'المبلغ', 'ملاحظات'];
    (s.does || []).forEach(function (d) {
      rows.push(['أنثى', d.created || '', 'رقم ' + d.num, d.num, 1, '', '', '', d.note || '']);
    });
    (s.bucks || []).forEach(function (b) {
      var w = UI.lastBuckWeight(b);
      rows.push(['ذكر', b.created || '', 'رقم ' + b.num, b.num, 1, w || '', '', '', b.note || '']);
    });
    (s.matings || []).forEach(function (m) {
      rows.push(['تزاوج', m.date, 'أنثى ' + Core.doeNum(s, m.doe) + ' × ' + (Core.animalLabel(s, m.buck) || '؟'), '', '', '', '', '',
        { pending: 'منتظرة', pregnant: 'حامل', born: 'ولدت', failed: 'فشلت' }[m.result] || m.result]);
    });
    (s.births || []).forEach(function (b) {
      rows.push(['ولادة', b.date, 'أنثى ' + Core.doeNum(s, b.doe), '', b.alive, '', '', '', 'نافق ' + (b.dead || 0) + (b.weaned ? ' • فُطم ' + b.weanedCount : '')]);
    });
    (s.batches || []).forEach(function (b) {
      rows.push(['دفعة فطام', b.date, 'دفعة ' + (b.num || ''), b.doe ? 'أم ' + Core.doeNum(s, b.doe) : '', Core.batchLive(b), '', '', '', 'الأصل ' + b.count + ' • نافق ' + (b.dead || 0) + ' • مباع ' + (b.sold || 0)]);
    });
    (s.sales || []).forEach(function (x) {
      var c = x.cust ? Core.custOf(s, x.cust) : null;
      rows.push(['بيع', x.date, c ? c.name : 'نقدي', c ? c.name : '', x.count, x.weight || '', x.kilo || '', x.total, x.paid === false ? 'آجل' : 'مدفوع']);
    });
    (s.expenses || []).forEach(function (x) {
      rows.push(['مصروف', x.date, x.cat, '', '', '', '', x.amount, x.note || '']);
    });
    (s.payments || []).forEach(function (x) {
      var c = Core.custOf(s, x.cust);
      rows.push(['دفعة عميل', x.date, c ? c.name : '', c ? c.name : '', '', '', '', x.amount, x.note || '']);
    });
    (s.feedLog || []).forEach(function (x) {
      var f = (s.feed || []).find(function (y) { return y.id === x.feedId; });
      rows.push(['علف مستهلك', x.date, f ? f.name : '', '', x.kg, '', '', x.cost || '', x.note || '']);
    });
    (s.inj || []).forEach(function (x) {
      rows.push(['حقنة', x.date, x.name, '', '', '', '', '', (x.dose || '') + (x.next ? ' • الجاية ' + x.next : '')]);
    });
    (s.meds || []).forEach(function (x) {
      rows.push(['دواء', x.date, x.name, '', '', '', '', '', (x.dose || '') + (x.end ? ' • لحد ' + x.end : '')]);
    });
    (s.vaxLog || []).forEach(function (x) {
      rows.push(['تحصين', x.date, x.name, 'دفعة ' + Core.batchName(s, x.ref), '', '', '', '', '']);
    });
    (s.deaths || []).forEach(function (x) {
      rows.push(['نافق', x.date, x.kind === 'batch' ? 'دفعة ' + Core.batchName(s, x.ref) : Core.animalLabel(s, x.ref), '', x.count || 1, '', '', '', x.cause || '']);
    });
    download('rabbits-' + today() + '.csv', csvOf(H, rows), 'text/csv;charset=utf-8');
    UI.toast('اتصدّر ملف Excel');
  };

  /* ---------- تشغيل ---------- */
  function boot() {
    Store.load();
    UI.render();
    if (Store.syncCode()) Store.syncPull(false);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') Store.syncPull(false);
    });
    window.addEventListener('online', function () { Store.syncPull(false); });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  boot();
})(typeof window !== 'undefined' ? window : globalThis);
