/* اختبارات الواجهة والتدفقات — تحتاج jsdom:  npm i jsdom  ثم  node --test tests/ */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['core.js', 'store.js', 'ui.js', 'ui-forms.js', 'ui-tabs.js', 'app.js'];

function build() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  SCRIPTS.forEach(function (f) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    html = html.replace('<script src="' + f + '"></script>', '<script>\n' + code + '\n</script>');
  });
  const vc = new (require('jsdom').VirtualConsole)();
  const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', e => errors.push(String(e)));
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
  dom.window.scrollTo = function () { };
  dom.window.URL.createObjectURL = function () { return 'blob:x'; };
  dom.window.URL.revokeObjectURL = function () { };
  dom.window.__errors = errors;
  return dom;
}
function fill(w, id, v) { const e = w.document.getElementById(id); assert.ok(e, 'العنصر ' + id + ' مش موجود'); e.value = String(v); }
function click(w, id) { const e = w.document.getElementById(id); assert.ok(e, 'الزرار ' + id + ' مش موجود'); e.click(); }

function setup() {
  const dom = build();
  const w = dom.window;
  const S = () => w.Store.S;
  // 3 إناث + 2 ذكور
  ['1', '2', '3'].forEach(function (n) {
    w.UI.doeForm(); fill(w, 'f1', n); w.UI.saveDoe('');
  });
  ['A', 'B'].forEach(function (n) {
    w.UI.buckForm(); fill(w, 'f1', n); fill(w, 'f4', '4.5'); w.UI.saveBuck('');
  });
  return { dom, w, S };
}

test('التشغيل: الغلاف والتبويبات كلها بتتعرض', () => {
  const { w, dom } = setup();
  assert.equal(dom.window.document.querySelectorAll('nav button').length, 6);
  assert.equal(w.Store.S.does.length, 3);
  assert.equal(w.Store.S.bucks.length, 2);
  const combos = [['home'], ['herd', 'does'], ['herd', 'bucks'], ['herd', 'batches'], ['herd', 'cages'],
    ['log', 'all'], ['health', 'inj'], ['health', 'meds'], ['health', 'vax'], ['health', 'dead'],
    ['money', 'sales'], ['money', 'exp'], ['money', 'clients'], ['money', 'report'],
    ['more', 'feed'], ['more', 'settings'], ['more', 'backup'], ['more', 'sync']];
  combos.forEach(function (c) {
    w.UI.go(c[0], c[1]);
    const html = w.document.getElementById('app').innerHTML;
    assert.ok(html.length > 40, 'تبويب ' + c.join('/') + ' فاضي');
    assert.ok(!/حصل خطأ في العرض/.test(html), 'خطأ في تبويب ' + c.join('/'));
  });
  const real = dom.window.__errors.filter(e => !/scrollTo/.test(e));
  assert.deepEqual(real, [], 'مفيش أخطاء جافاسكريبت');
});

test('منع تكرار رقم الأنثى', () => {
  const { w } = setup();
  w.UI.doeForm(); fill(w, 'f1', '1'); w.UI.saveDoe('');
  assert.equal(w.Store.S.does.length, 3, 'الرقم المكرر مايتضافش');
});

test('إضافة أرقام كتير: من/إلى ونطاقات', () => {
  const { w } = setup();
  w.UI.bulkDoes(); fill(w, 'f1', 10); fill(w, 'f2', 14); w.UI.saveBulk();
  assert.equal(w.Store.S.does.length, 8);
  w.UI.bulkDoes(); fill(w, 'f3', '20,21-23'); w.UI.saveBulk();
  assert.equal(w.Store.S.does.length, 12);
  assert.ok(w.Store.S.does.some(d => d.num === '22'));
});

test('التزاوج: تسجيل، تاريخ ولادة متوقع، منع النسب', () => {
  const { w, S } = setup();
  const d = S().does[0], b = S().bucks[0];
  w.UI.matingForm(d.id); fill(w, 'f1', d.id); fill(w, 'f2', b.id); fill(w, 'f3', '2026-11-01'); w.UI.saveMating();
  assert.equal(S().matings.length, 1);
  assert.equal(w.Core.status(S(), d.id).due, '2026-12-02');
  // نجعل الذكر أبًا للأنثى → لازم يمنع
  d.sire = b.id;
  w.UI.matingForm(); fill(w, 'f1', d.id); fill(w, 'f2', b.id); fill(w, 'f3', '2026-11-05'); w.UI.saveMating();
  assert.equal(S().matings.length, 1, 'التزاوج بين الأقارب لازم يتمنع');
});

test('الولادة والفطام: دفعة تتكون بالأرقام الصح', () => {
  const { w, S } = setup();
  const d = S().does[0], b = S().bucks[0];
  w.UI.matingForm(); fill(w, 'f1', d.id); fill(w, 'f2', b.id); fill(w, 'f3', '2026-11-01'); w.UI.saveMating();
  w.UI.birthForm(d.id); fill(w, 'f1', d.id); fill(w, 'f2', '2026-12-02'); fill(w, 'f3', 8); fill(w, 'f4', 1); w.UI.saveBirth();
  assert.equal(S().births.length, 1);
  assert.equal(S().matings[0].result, 'born');
  assert.equal(w.Core.status(S(), d.id).k, 'nurs');
  w.UI.weanForm(d.id); fill(w, 'f3', 7); fill(w, 'f4', 650); fill(w, 'f5', '5'); w.UI.saveWean();
  assert.equal(S().batches.length, 1);
  const bt = S().batches[0];
  assert.equal(bt.count, 7);
  assert.equal(bt.num, '5');
  assert.equal(w.Core.batchLastWeight(bt), 650);
  assert.equal(S().births[0].weaned, true);
  assert.equal(w.Core.status(S(), d.id).k, 'free');
});

test('الدفعة: وزن، نافق، بيع يخصم من الموجود', () => {
  const { w, S } = setup();
  const d = S().does[0];
  w.UI.batchForm(); fill(w, 'f2', '2026-11-01'); fill(w, 'f3', 10); fill(w, 'f1', '7'); w.UI.saveBatch('');
  const bt = S().batches[0];
  w.UI.weighBatch(bt.id); fill(w, 'f2', 1900); w.UI.saveBatchWeight(bt.id);
  assert.equal(w.Core.batchReady(bt, S()), true, 'الجاهزية عند 1900 جم');
  w.UI.deadBatch(bt.id); fill(w, 'f1', 1); w.UI.saveDeadBatch(bt.id);
  assert.equal(w.Core.batchLive(bt), 9);
  w.UI.saleForm({ batch: bt.id }); fill(w, 'f2', 4); fill(w, 'f6', 7.6); fill(w, 'f7', 100); w.UI.calcSale(); w.UI.saveSale();
  assert.equal(S().sales.length, 1);
  assert.equal(S().sales[0].total, 760);
  assert.equal(bt.sold, 4);
  assert.equal(w.Core.batchLive(bt), 5);
  assert.equal(S().deaths.length, 1);
});

test('الفلوس: مصروف وربح وعميل آجل ودفعة', () => {
  const { w, S } = setup();
  w.UI.custForm(); fill(w, 'f1', 'محمود'); fill(w, 'f2', '01000000000'); w.UI.saveCust('');
  const c = S().custs[0];
  w.UI.saleForm({ cust: c.id }); fill(w, 'f2', 3); fill(w, 'f3', 900); w.UI.setPaid(0); w.UI.saveSale();
  assert.equal(S().sales[0].paid, false);
  assert.equal(w.Core.custBalance(S(), c.id), 900);
  w.UI.payForm(c.id); fill(w, 'f2', 400); w.UI.savePay(c.id);
  assert.equal(w.Core.custBalance(S(), c.id), 500);
  w.UI.expForm(); fill(w, 'f3', 300); fill(w, 'f2', 'علف'); w.UI.saveExp('');
  const m = w.Core.money(S(), w.Core.today().slice(0, 7));
  assert.equal(m.salesSum, 900);
  assert.equal(m.expSum, 300);
  assert.equal(m.profit, 600);
});

test('الحذف والتراجع', () => {
  const { w, S } = setup();
  const d = S().does[0];
  w.UI.delItem('does', d.id, 'أنثى');
  click(w, 'cfy');                       // تأكيد الحذف
  assert.equal(S().does.length, 2);
  assert.equal(w.Store.undoStack.length, 1);
  w.Store.undo();
  assert.equal(S().does.length, 3, 'التراجع بيرجّع العنصر');
});

test('الصحة: حقنة بدفعة تالية، دواء أيام، تحصين', () => {
  const { w, S } = setup();
  w.UI.injForm(); fill(w, 'f1', 'فيتامين'); fill(w, 'f3', '2026-11-01'); fill(w, 'f5', '2026-11-20'); w.UI.saveInj();
  assert.equal(S().inj.length, 1);
  assert.equal(S().inj[0].target, 'all');
  const A = w.Core.alerts(S(), '2026-11-27');
  assert.ok(A.some(a => /حقنة فيتامين/.test(a.txt)));
  w.UI.medForm(); fill(w, 'f1', 'مضاد'); fill(w, 'f3', '2026-11-01'); w.UI.saveMed();
  assert.equal(S().meds.length, 1);
  assert.equal(S().meds[0].days.length, 7);
  w.UI.vaxForm(); fill(w, 'f1', 'تحصين أول'); fill(w, 'f2', 30); w.UI.saveVax('');
  assert.equal(S().vax.length, 1);
});

test('العلف: استهلاك يخصم من المخزون ويحسب التكلفة', () => {
  const { w, S } = setup();
  w.UI.feedForm(); fill(w, 'f1', 'بيليه'); fill(w, 'f2', 20); fill(w, 'f3', 100); w.UI.saveFeed('');
  const f = S().feed[0];
  w.UI.feedLogForm(); fill(w, 'f1', f.id); fill(w, 'f2', 30); w.UI.saveFeedLog();
  assert.equal(f.stockKg, 70);
  assert.equal(S().feedLog[0].cost, 600);
});

test('النسخة الاحتياطية: تصدير ثم استرجاع', () => {
  const { w, S } = setup();
  const snapshot = JSON.parse(JSON.stringify(S()));
  S().does.push({ id: 'x1', num: '99' });
  w.Store.save();
  w.Store.importData(snapshot);
  assert.equal(w.Store.S.does.length, 3, 'الاسترجاع رجّع البيانات القديمة');
  assert.ok(w.Store.autoBackup(), 'اتعملت نسخة تلقائية قبل الاسترجاع');
});

test('الإعدادات: تغيير مدة الحمل يأثر على الولادة المتوقعة', () => {
  const { w, S } = setup();
  const d = S().does[0], b = S().bucks[0];
  w.UI.matingForm(); fill(w, 'f1', d.id); fill(w, 'f2', b.id); fill(w, 'f3', '2026-11-01'); w.UI.saveMating();
  w.UI.setNum('gest', 32);
  assert.equal(w.Core.status(S(), d.id).due, '2026-12-03');
});

test('حماية: رقم سالب أو فاضي في النماذج مايكسرش التطبيق', () => {
  const { w, S } = setup();
  w.UI.saleForm(); fill(w, 'f2', ''); w.UI.saveSale();
  assert.equal(S().sales.length, 0);
  w.UI.expForm(); fill(w, 'f3', -5); w.UI.saveExp('');
  assert.equal(S().expenses.length, 0);
  w.UI.batchForm(); fill(w, 'f3', 0); w.UI.saveBatch('');
  assert.equal(S().batches.length, 0);
  w.UI.go('home');
  assert.ok(w.document.getElementById('app').innerHTML.length > 100);
});
