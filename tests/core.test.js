/* اختبارات منطق الحسابات — node --test tests/ */
const test = require('node:test');
const assert = require('node:assert');
const Core = require('../core.js');

function baseState() {
  const s = {
    v: 1,
    set: { gest: 31, palp: 14, nest: 28, wean: 35, wtarget: 1800, feedLow: 20, debtDays: 30, currency: 'ج' },
    does: [], bucks: [], matings: [], births: [], batches: [], sales: [], expenses: [], payments: [],
    custs: [], inj: [], meds: [], vax: [], vaxLog: [], feed: [], feedLog: [], cages: [], deaths: []
  };
  return s;
}
function doe(s, num, extra) { const d = Object.assign({ id: 'd' + num, num: String(num) }, extra || {}); s.does.push(d); return d; }
function buck(s, num, extra) { const b = Object.assign({ id: 'b' + num, num: String(num), ws: [] }, extra || {}); s.bucks.push(b); return b; }

test('حساب التواريخ: جمع الأيام عبر الشهور والسنين', () => {
  assert.equal(Core.addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(Core.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(Core.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(Core.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(Core.addDays('2024-02-28', 1), '2024-02-29', 'سنة كبيسة');
  assert.equal(Core.addDays('', 5), '');
});

test('حساب التواريخ: الفرق بالأيام والفورمات', () => {
  assert.equal(Core.diffDays('2026-11-30', '2026-11-27'), 3);
  assert.equal(Core.diffDays('2026-11-27', '2026-11-30'), -3);
  assert.equal(Core.diffDays('2027-01-01', '2026-12-31'), 1);
  assert.equal(Core.fmt('2026-11-27'), '27/11/2026');
  assert.equal(Core.fmt('bad'), '—');
  assert.equal(Core.parse('2026-02-30'), null, 'تاريخ غير موجود');
});

test('حالة الأنثى: فاضية ← حامل ← مرضعة ← فاضية', () => {
  const s = baseState(); const d = doe(s, 1); const b = buck(s, 10);
  assert.equal(Core.status(s, d.id).k, 'free');
  s.matings.push({ id: 'm1', doe: d.id, buck: b.id, date: '2026-11-01', result: 'pending' });
  const st = Core.status(s, d.id);
  assert.equal(st.k, 'preg');
  assert.equal(st.due, '2026-12-02', '31 يوم حمل');
  s.matings[0].result = 'born';
  s.births.push({ id: 'bi1', doe: d.id, buck: b.id, date: '2026-12-02', alive: 7, dead: 1, weaned: false });
  const st2 = Core.status(s, d.id);
  assert.equal(st2.k, 'nurs');
  assert.equal(st2.wean, '2027-01-06', '35 يوم فطام');
  s.births[0].weaned = true;
  assert.equal(Core.status(s, d.id).k, 'free');
});

test('التنبيهات: ولادة قريبة، متأخرة، جس حمل، فطام', () => {
  const s = baseState(); const d = doe(s, 5); const b = buck(s, 1);
  s.matings.push({ id: 'm1', doe: d.id, buck: b.id, date: '2026-11-10', result: 'pending' });
  let A = Core.alerts(s, '2026-11-24'); // يوم 14 → جس الحمل
  assert.ok(A.some(a => /جس الحمل/.test(a.txt)), 'لازم ينبه لجس الحمل يوم 14');
  A = Core.alerts(s, '2026-12-13'); // الولادة كانت 12-11 → متأخرة يومين
  assert.ok(A.some(a => /متأخرة/.test(a.txt)));
  A = Core.alerts(s, '2026-12-09'); // فاضل يومين
  assert.ok(A.some(a => /الولادة بعد 2 يوم/.test(a.txt)), 'تنبيه الولادة القريبة');
  s.matings[0].result = 'born';
  s.births.push({ id: 'bi', doe: d.id, date: '2026-12-01', alive: 6, dead: 0, weaned: false });
  A = Core.alerts(s, '2027-01-05');
  assert.ok(A.some(a => /الفطام/.test(a.txt)), 'تنبيه الفطام');
});

test('التنبيهات: دواء اليوم + حقنة متأخرة + علف قرب يخلص', () => {
  const s = baseState();
  s.meds.push({ id: 'md1', name: 'فيتامين', target: 'all', ref: '', date: '2026-11-01', days: [5], dose: 'نص قرص' }); // الجمعة=5
  s.inj.push({ id: 'i1', name: 'مضاد', target: 'all', ref: '', date: '2026-11-01', next: '2026-11-20', done: false });
  s.feed.push({ id: 'f1', name: 'بيليه', stockKg: 5, kgPrice: 20 });
  const A = Core.alerts(s, '2026-11-27'); // جمعة
  assert.ok(A.some(a => /دواء النهاردة/.test(a.txt)));
  assert.ok(A.some(a => /حقنة مضاد/.test(a.txt) && /متأخرة/.test(a.txt)));
  assert.ok(A.some(a => /قرب يخلص/.test(a.txt)));
});

test('التحصين: مستحق حسب عمر الدفعة', () => {
  const s = baseState();
  s.vax.push({ id: 'v1', name: 'تحصين أول', ageDays: 30 });
  s.births.push({ id: 'bi1', date: '2026-11-01', alive: 5, dead: 0, weaned: false });
  s.batches.push({ id: 'bt1', num: '1', birthId: 'bi1', date: '2026-11-20', count: 5, ws: [], dead: 0, sold: 0, closed: false });
  let due = Core.vaxDue(s, '2026-11-30'); // عمر 29 يوم
  assert.equal(due.length, 1);
  assert.equal(due[0].due, '2026-12-01');
  due = Core.vaxDue(s, '2026-12-05');
  assert.ok(due[0].overdue, 'متأخر');
  s.vaxLog.push({ id: 'l1', ref: 'bt1', name: 'تحصين أول', date: '2026-12-02' });
  assert.equal(Core.vaxDue(s, '2026-12-05').length, 0, 'اتعمل خلاص');
});

test('النسب: إخوة وأصل وفرع وأجداد', () => {
  const s = baseState();
  const dad = buck(s, 1), mom = doe(s, 2);
  const son = buck(s, 3, { sire: dad.id, dam: mom.id });
  const daughter = doe(s, 4, { sire: dad.id, dam: mom.id });
  const halfSis = doe(s, 5, { sire: dad.id });
  const stranger = doe(s, 6);
  assert.equal(Core.relation(s, son.id, daughter.id), 'sibling');
  assert.equal(Core.relation(s, dad.id, daughter.id), 'parent');
  assert.equal(Core.relation(s, daughter.id, dad.id), 'parent');
  assert.equal(Core.relation(s, son.id, halfSis.id), 'half');
  assert.equal(Core.relation(s, daughter.id, stranger.id), 'ok');
  assert.equal(Core.relation(s, daughter.id, daughter.id), 'self');
  assert.ok(Core.relationBlocked('sibling'));
  assert.ok(!Core.relationBlocked('cousin'));
});

test('حسابات الفلوس: مبيعات ومصروفات وربح وسعر كيلو', () => {
  const s = baseState();
  s.sales.push({ id: 's1', date: '2026-11-05', count: 10, weight: 20, kilo: 100, total: 2000, paid: true });
  s.sales.push({ id: 's2', date: '2026-11-20', count: 5, weight: 9, kilo: 110, total: 990, paid: false, cust: 'c1' });
  s.sales.push({ id: 's3', date: '2026-10-20', count: 2, weight: 4, kilo: 100, total: 400 });
  s.expenses.push({ id: 'e1', date: '2026-11-02', cat: 'علف', amount: 1200 });
  s.expenses.push({ id: 'e2', date: '2026-11-10', cat: 'أدوية وتحصين', amount: 300 });
  const m = Core.money(s, '2026-11');
  assert.equal(m.salesSum, 2990);
  assert.equal(m.expSum, 1500);
  assert.equal(m.profit, 1490);
  assert.equal(m.kg, 29);
  assert.equal(m.cnt, 15);
  assert.equal(m.pricePerKg, Math.round(2990 / 29 * 100) / 100);
  assert.equal(m.byCat['علف'], 1200);
  const all = Core.money(s, '');
  assert.equal(all.salesSum, 3390, 'كل الشهور');
});

test('حساب العميل: آجل ودفعات', () => {
  const s = baseState();
  s.custs.push({ id: 'c1', name: 'محمود' });
  s.sales.push({ id: 's1', date: '2026-10-01', cust: 'c1', total: 500, paid: false });
  s.sales.push({ id: 's2', date: '2026-11-01', cust: 'c1', total: 300, paid: true });
  assert.equal(Core.custBalance(s, 'c1'), 500);
  s.payments.push({ id: 'p1', date: '2026-11-05', cust: 'c1', amount: 200 });
  assert.equal(Core.custBalance(s, 'c1'), 300);
  assert.equal(Core.oldestDebtDays(s, 'c1', '2026-11-15'), 45);
  const A = Core.alerts(s, '2026-11-15');
  assert.ok(A.some(a => /محمود/.test(a.txt)), 'تنبيه مديونية قديمة');
});

test('إحصاء الأنثى والذكر', () => {
  const s = baseState(); const d = doe(s, 7); const b = buck(s, 2);
  s.matings.push({ id: 'm1', doe: d.id, buck: b.id, date: '2026-08-01', result: 'born' });
  s.matings.push({ id: 'm2', doe: d.id, buck: b.id, date: '2026-09-01', result: 'failed' });
  s.matings.push({ id: 'm3', doe: d.id, buck: b.id, date: '2026-10-01', result: 'born' });
  s.births.push({ id: 'bi1', doe: d.id, buck: b.id, date: '2026-09-01', alive: 6, dead: 2, weaned: true, weanedCount: 5 });
  s.births.push({ id: 'bi2', doe: d.id, buck: b.id, date: '2026-11-01', alive: 8, dead: 0, weaned: false });
  const ds = Core.doeStats(s, d.id);
  assert.equal(ds.births, 2);
  assert.equal(ds.born, 16);
  assert.equal(ds.weaned, 5);
  assert.equal(ds.avgLitter, 8);
  assert.equal(ds.successRate, 67);
  assert.equal(ds.survival, 31);
  const bs = Core.buckStats(s, b.id);
  assert.equal(bs.matings, 3);
  assert.equal(bs.kids, 14);
  assert.equal(bs.rate, 67);
});

test('الدفعات: الموجود والوزن والزيادة والجاهزية', () => {
  const s = baseState();
  const bt = { id: 'bt1', count: 10, dead: 1, sold: 2, ws: [{ d: '2026-11-01', g: 600 }, { d: '2026-11-11', g: 900 }], closed: false };
  s.batches.push(bt);
  assert.equal(Core.batchLive(bt), 7);
  assert.equal(Core.batchLastWeight(bt), 900);
  assert.equal(Core.batchGain(bt), 30);
  assert.equal(Core.batchReady(bt, s), false);
  bt.ws.push({ d: '2026-11-20', g: 1850 });
  assert.equal(Core.batchReady(bt, s), true);
  bt.closed = true;
  assert.equal(Core.batchReady(bt, s), false);
});

test('تقرير الشهر: إخصاب ومتوسط بطن ونفوق', () => {
  const s = baseState(); const d = doe(s, 1); const b = buck(s, 1);
  s.matings.push({ id: 'm1', doe: d.id, buck: b.id, date: '2026-11-01', result: 'born' });
  s.matings.push({ id: 'm2', doe: d.id, buck: b.id, date: '2026-11-10', result: 'failed' });
  s.matings.push({ id: 'm3', doe: d.id, buck: b.id, date: '2026-11-20', result: 'pending' });
  s.births.push({ id: 'bi1', doe: d.id, date: '2026-11-05', alive: 8, dead: 2 });
  const r = Core.report(s, '2026-11');
  assert.equal(r.matings, 3);
  assert.equal(r.conception, 50, 'اتحسبت على المتسجل بس');
  assert.equal(r.avgLitter, 10);
  assert.equal(r.mortality, 20);
  assert.equal(r.perDoe.length, 1);
});

test('القطيع: العدادات', () => {
  const s = baseState();
  const d1 = doe(s, 1), d2 = doe(s, 2); const b = buck(s, 1);
  s.matings.push({ id: 'm1', doe: d1.id, buck: b.id, date: '2026-11-01', result: 'pending' });
  s.births.push({ id: 'bi1', doe: d2.id, date: '2026-11-10', alive: 5, dead: 0, weaned: false });
  s.batches.push({ id: 'bt1', count: 4, ws: [{ d: '2026-11-01', g: 1900 }], dead: 0, sold: 0, closed: false });
  const h = Core.herd(s, '2026-11-15');
  assert.equal(h.does, 2); assert.equal(h.bucks, 1);
  assert.equal(h.preg, 1); assert.equal(h.nurs, 1); assert.equal(h.kits, 5);
  assert.equal(h.weaned, 4); assert.equal(h.ready, 4);
});

test('استيراد نسخة البرنامج القديم', () => {
  require('../core.js');
  require('../store.js');
  const Store = globalThis.Store;
  const old = {
    does: [{ id: 'd1', num: '1', note: '' }, { id: 'd2', num: '2', note: 'هدية' }],
    bucks: ['A'],
    bk: [{ id: 'bk_A', name: 'A', ws: [{ d: '2026-11-01', k: 4.5 }], out: false, breed: 'نيوزيلندي' }],
    matings: [{ id: 'm1', doe: 'd1', buck: 'A', date: '2026-11-01', result: 'born' }],
    births: [{ id: 'bi1', doe: 'd1', buck: 'A', date: '2026-12-02', alive: 7, dead: 1, weaned: true, weanDate: '2027-01-06', weanedCount: 7 }],
    wean: [{ id: 'w1', num: '3', date: '2027-01-06', count: 7, doe: 'd1', ws: [{ d: '2027-01-06', g: 640 }], dead: 0, sold: 0, closed: false }],
    sales: [{ id: 's1', date: '2027-02-01', count: 3, total: 900, buyer: 'محمود', doe: 'd1', weight: 8, kilo: 112 }],
    inj: [{ id: 'i1', name: 'فيتامين', doe: 'd1', date: '2026-11-02', dose: '0.5', next: '2026-12-02' }],
    meds: [{ id: 'md1', name: 'مضاد', doe: '', date: '2026-11-02', days: [0, 3] }],
    set: { gest: 31, palp: 14, nest: 28, wean: 35, wtarget: 1800 }
  };
  global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
  const res = Store.importOld(old);
  assert.equal(res.does, 2);
  assert.equal(res.bucks, 1);
  assert.equal(Store.S.bucks[0].num, 'A');
  assert.equal(Store.S.matings[0].buck, 'bk_A', 'اسم الذكر اتحوّل لـ id');
  assert.equal(Store.S.births[0].weanedCount, 7);
  assert.equal(Store.S.batches[0].count, 7);
  assert.equal(Store.S.sales[0].cust.length > 0, true, 'اتعمل عميل من اسم المشتري');
  assert.equal(Store.S.sales[0].paid, true);
  assert.equal(Store.S.inj[0].target, 'doe');
  assert.equal(Store.S.meds[0].target, 'all');
  assert.equal(Store.S.set.wtarget, 1800);
  assert.equal(Store.S.does[1].note, 'هدية');
});
