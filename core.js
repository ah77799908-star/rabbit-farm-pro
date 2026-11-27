/* core.js — منطق الحسابات والتحليلات (بدون واجهة، قابل للاختبار) */
(function (root) {
  'use strict';
  var DAY = 86400000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    if (!s || typeof s !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
    if (isNaN(d.getTime())) return null;
    if (d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }
  function addDays(s, n) {
    var d = parse(s); if (!d) return '';
    d.setDate(d.getDate() + (parseInt(n, 10) || 0));
    return today(d);
  }
  function diffDays(a, b) {
    var x = parse(a), y = parse(b);
    if (!x || !y) return null;
    return Math.round((x - y) / DAY);
  }
  function fmt(s) { var d = parse(s); if (!d) return '—'; return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function monthOf(s) { return (s || '').slice(0, 7); }
  function monthLabel(m) {
    var names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var p = (m || '').split('-');
    return names[(+p[1] || 1) - 1] + ' ' + (p[0] || '');
  }
  function ageDays(born, t) { return born ? diffDays(t || today(), born) : null; }
  function ageText(born, t) {
    var d = ageDays(born, t); if (d === null) return '';
    if (d < 0) return '';
    if (d < 60) return d + ' يوم';
    var mo = Math.floor(d / 30.4);
    return mo + ' شهر';
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function num(v) {
    var n = +v; if (!isFinite(n)) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sum(arr, key) { return (arr || []).reduce(function (a, x) { return a + (+x[key] || 0); }, 0); }
  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- الحيوانات ---------- */
  function byId(S, id) {
    var a = (S.does || []).find(function (d) { return d.id === id; });
    if (a) return a;
    return (S.bucks || []).find(function (b) { return b.id === id; }) || null;
  }
  function doeOf(S, id) { return (S.does || []).find(function (d) { return d.id === id; }) || null; }
  function doeNum(S, id) { var d = doeOf(S, id); return d ? d.num : '؟'; }
  function animalLabel(S, id) { var a = byId(S, id); return a ? a.num : '؟'; }
  function activeDoes(S) { return (S.does || []).filter(function (d) { return !d.out; }); }
  function activeBucks(S) { return (S.bucks || []).filter(function (b) { return !b.out; }); }

  /* ---------- حالة الأنثى ---------- */
  function openMating(S, doeId) {
    return (S.matings || []).filter(function (m) {
      return m.doe === doeId && m.result !== 'failed' && m.result !== 'born';
    }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0] || null;
  }
  function openBirth(S, doeId) {
    return (S.births || []).filter(function (b) {
      return b.doe === doeId && !b.weaned && (+b.alive || 0) > 0;
    }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0] || null;
  }
  function status(S, doeId) {
    var m = openMating(S, doeId);
    if (m) return { k: 'preg', m: m, due: addDays(m.date, S.set.gest), confirmed: m.result === 'pregnant' };
    var b = openBirth(S, doeId);
    if (b) return { k: 'nurs', b: b, wean: addDays(b.date, S.set.wean) };
    return { k: 'free' };
  }

  /* ---------- الدفعات ---------- */
  function batchLive(b) { return Math.max(0, (+b.count || 0) - (+b.dead || 0) - (+b.sold || 0)); }
  function batchWeights(b) { return (b.ws || []).slice().sort(function (x, y) { return x.d.localeCompare(y.d); }); }
  function batchLastWeight(b) { var a = batchWeights(b); return a.length ? +a[a.length - 1].g || 0 : 0; }
  function batchGain(b) {
    var a = batchWeights(b); if (a.length < 2) return null;
    var n = diffDays(a[a.length - 1].d, a[0].d);
    return n > 0 ? round1((a[a.length - 1].g - a[0].g) / n) : null;
  }
  function batchAge(b, S, t) {
    var bd = birthDateOfBatch(S, b);
    return bd ? diffDays(t || today(), bd) : null;
  }
  function birthDateOfBatch(S, b) {
    if (b.birthId) {
      var x = (S.births || []).find(function (y) { return y.id === b.birthId; });
      if (x && x.date) return x.date;
    }
    if (b.born) return b.born;
    return null;
  }
  function batchReady(b, S) { return !b.closed && batchLive(b) > 0 && batchLastWeight(b) >= (S.set.wtarget || 1800); }

  /* ---------- التنبيهات ---------- */
  function alerts(S, t) {
    t = t || today();
    var A = [];
    function push(p, c, i, txt, go) { A.push({ p: p, c: c, i: i, txt: txt, go: go || null }); }

    activeDoes(S).forEach(function (d) {
      var s = status(S, d.id);
      if (s.k === 'preg') {
        var left = diffDays(s.due, t), since = diffDays(t, s.m.date);
        if (left < 0) push(0, 'r', '⚠️', 'الأنثى ' + d.num + ': متأخرة ' + (-left) + ' يوم عن الولادة', { tab: 'herd', sub: 'does', id: d.id });
        else if (left <= 3) push(1, 'o', '🍼', 'الأنثى ' + d.num + ': الولادة ' + (left === 0 ? 'النهاردة' : 'بعد ' + left + ' يوم') + ' (' + fmt(s.due) + ')', { tab: 'herd', sub: 'does', id: d.id });
        else if (since >= S.set.nest) push(2, 'o', '📦', 'الأنثى ' + d.num + ': جهّز بيت الولادة', { tab: 'herd', sub: 'does', id: d.id });
        if (!s.confirmed && since >= S.set.palp && since <= S.set.palp + 5)
          push(3, 'b', '🔍', 'الأنثى ' + d.num + ': جس الحمل (يوم ' + since + ')', { tab: 'herd', sub: 'does', id: d.id });
      }
      if (s.k === 'nurs') {
        var wl = diffDays(s.wean, t);
        if (wl <= 0) push(2, 'b', '✂️', 'الأنثى ' + d.num + ': الفطام ' + (wl < 0 ? '(متأخر ' + (-wl) + ' يوم)' : 'النهاردة'), { tab: 'herd', sub: 'does', id: d.id });
        else if (wl <= 3) push(4, 'b', '✂️', 'الأنثى ' + d.num + ': الفطام بعد ' + wl + ' يوم', { tab: 'herd', sub: 'does', id: d.id });
      }
    });

    (S.inj || []).forEach(function (x) {
      if (!x.next || x.done) return;
      var left = diffDays(x.next, t);
      var who = x.target === 'all' ? 'كل الأرانب' : (x.target === 'batch' ? 'دفعة ' + batchName(S, x.ref) : 'الأنثى ' + animalLabel(S, x.ref));
      if (left < 0) push(1, 'r', '💉', 'حقنة ' + x.name + ' (' + who + '): متأخرة ' + (-left) + ' يوم', { tab: 'health', sub: 'inj' });
      else if (left <= 3) push(4, 'o', '💉', 'حقنة ' + x.name + ' (' + who + '): ' + (left === 0 ? 'النهاردة' : 'بعد ' + left + ' يوم'), { tab: 'health', sub: 'inj' });
    });

    var wd = new Date((t) + 'T12:00:00').getDay();
    (S.meds || []).forEach(function (x) {
      if (!medActive(x, t)) return;
      if (medDays(x).indexOf(wd) < 0) return;
      var who = x.target === 'all' ? 'كل الأرانب' : (x.target === 'batch' ? 'دفعة ' + batchName(S, x.ref) : 'الأنثى ' + animalLabel(S, x.ref));
      push(5, 'b', '💊', 'دواء النهاردة: ' + x.name + ' (' + who + ')', { tab: 'health', sub: 'meds' });
    });

    vaxDue(S, t).forEach(function (v) {
      push(v.overdue ? 1 : 6, v.overdue ? 'r' : 'o', '🧪',
        'تحصين ' + v.name + ' — دفعة ' + v.batch + (v.overdue ? ' متأخر ' + (-v.left) + ' يوم' : (v.left === 0 ? ' النهاردة' : ' بعد ' + v.left + ' يوم')),
        { tab: 'health', sub: 'vax' });
    });

    (S.feed || []).forEach(function (f) {
      if (f.stockKg != null && +f.stockKg <= (f.low != null ? +f.low : (S.set.feedLow || 20)))
        push(3, 'r', '🌾', 'العلف «' + f.name + '» قرب يخلص (' + num(f.stockKg) + ' كجم)', { tab: 'more', sub: 'feed' });
    });

    (S.custs || []).forEach(function (c) {
      var bal = custBalance(S, c.id);
      if (bal <= 0) return;
      var old = oldestDebtDays(S, c.id, t);
      if (old !== null && old >= (S.set.debtDays || 30))
        push(6, 'o', '💸', 'على ' + c.name + ' فلوس من ' + old + ' يوم (' + num(bal) + ' ج)', { tab: 'money', sub: 'clients', id: c.id });
    });

    return A.sort(function (a, b) { return a.p - b.p; });
  }

  function batchName(S, id) {
    var b = (S.batches || []).find(function (x) { return x.id === id; });
    return b ? (b.num || fmt(b.date)) : '؟';
  }

  /* ---------- برنامج التحصين ---------- */
  function vaxDue(S, t) {
    t = t || today();
    var out = [];
    (S.batches || []).forEach(function (b) {
      if (b.closed || batchLive(b) <= 0) return;
      var bd = birthDateOfBatch(S, b);
      if (!bd) return;
      (S.vax || []).forEach(function (v) {
        if (!v.name || !(+v.ageDays > 0)) return;
        var due = addDays(bd, v.ageDays);
        var left = diffDays(due, t);
        if (left > 7 || left < -30) return;
        var done = (S.vaxLog || []).some(function (l) { return l.ref === b.id && l.name === v.name && l.date >= due; });
        if (done) return;
        out.push({ batch: b.num || fmt(b.date), batchId: b.id, name: v.name, due: due, left: left, overdue: left < 0 });
      });
    });
    return out;
  }

  /* ---------- الأدوية ---------- */
  var DAYS = [[6, 'السبت'], [0, 'الأحد'], [1, 'الاثنين'], [2, 'الثلاثاء'], [3, 'الأربعاء'], [4, 'الخميس'], [5, 'الجمعة']];
  function medDays(x) { return (x.days && x.days.length) ? x.days : [0, 1, 2, 3, 4, 5, 6]; }
  function medActive(x, t) { return !(x.end && x.end < t) && (!x.date || x.date <= t); }

  /* ---------- النسب ---------- */
  function parentsOf(S, id) {
    var a = byId(S, id);
    return a ? [a.sire, a.dam].filter(Boolean) : [];
  }
  function relation(S, aId, bId) {
    if (!aId || !bId) return 'unknown';
    if (aId === bId) return 'self';
    var pa = parentsOf(S, aId), pb = parentsOf(S, bId);
    if (pa.indexOf(bId) >= 0 || pb.indexOf(aId) >= 0) return 'parent';
    var shared = pa.filter(function (x) { return pb.indexOf(x) >= 0; });
    if (shared.length) return shared.length === 2 ? 'sibling' : 'half';
    var ga = pa.reduce(function (acc, p) { return acc.concat(parentsOf(S, p)); }, []);
    var gb = pb.reduce(function (acc, p) { return acc.concat(parentsOf(S, p)); }, []);
    if (ga.indexOf(bId) >= 0 || gb.indexOf(aId) >= 0) return 'grandparent';
    if (ga.filter(function (x) { return gb.indexOf(x) >= 0; }).length) return 'cousin';
    return 'ok';
  }
  var REL_TEXT = {
    self: 'نفس الحيوان', parent: 'أصل وفرع (أب/ابنة أو أم/ابن)', sibling: 'إخوة (أب وأم واحد)',
    half: 'إخوة من أب أو أم', grandparent: 'جد/جدة', cousin: 'أنساب بعيدة', ok: '', unknown: ''
  };
  function relationBlocked(rel) { return rel === 'self' || rel === 'parent' || rel === 'sibling' || rel === 'half'; }

  /* ---------- الفلوس ---------- */
  function custOf(S, id) { return (S.custs || []).find(function (c) { return c.id === id; }) || null; }
  function saleDebt(s) { return s.paid === false ? (+s.total || 0) : 0; }
  function custBalance(S, id) {
    var debt = (S.sales || []).filter(function (s) { return s.cust === id; }).reduce(function (a, s) { return a + saleDebt(s); }, 0);
    var paid = (S.payments || []).filter(function (p) { return p.cust === id; }).reduce(function (a, p) { return a + (+p.amount || 0); }, 0);
    return Math.round((debt - paid) * 100) / 100;
  }
  function oldestDebtDays(S, id, t) {
    var ds = (S.sales || []).filter(function (s) { return s.cust === id && s.paid === false; }).map(function (s) { return s.date; }).sort();
    if (!ds.length) return null;
    return diffDays(t || today(), ds[0]);
  }
  function money(S, month) {
    var inM = function (d) { return !month || (d || '').slice(0, 7) === month; };
    var sales = (S.sales || []).filter(function (x) { return inM(x.date); });
    var exp = (S.expenses || []).filter(function (x) { return inM(x.date); });
    var byCat = {};
    exp.forEach(function (e) { var k = e.cat || 'أخرى'; byCat[k] = (byCat[k] || 0) + (+e.amount || 0); });
    var salesSum = sum(sales, 'total'), expSum = sum(exp, 'amount');
    var kg = sales.reduce(function (a, s) { return a + (+s.weight || 0); }, 0);
    var cnt = sales.reduce(function (a, s) { return a + (+s.count || 0); }, 0);
    return {
      salesSum: salesSum, expSum: expSum, profit: Math.round((salesSum - expSum) * 100) / 100,
      byCat: byCat, kg: Math.round(kg * 100) / 100, cnt: cnt,
      pricePerKg: kg ? Math.round(salesSum / kg * 100) / 100 : 0,
      avgPerRabbit: cnt ? Math.round(salesSum / cnt * 100) / 100 : 0
    };
  }
  function monthsWithData(S) {
    var set = {};
    ['sales', 'expenses'].forEach(function (k) {
      (S[k] || []).forEach(function (x) { if (x.date) set[x.date.slice(0, 7)] = 1; });
    });
    var arr = Object.keys(set).sort().reverse();
    var cur = today().slice(0, 7);
    if (arr.indexOf(cur) < 0) arr.unshift(cur);
    return arr;
  }

  /* ---------- إحصاءات ---------- */
  function doeStats(S, id) {
    var ms = (S.matings || []).filter(function (m) { return m.doe === id; });
    var bs = (S.births || []).filter(function (b) { return b.doe === id; });
    var done = ms.filter(function (m) { return m.result === 'failed' || m.result === 'born'; });
    var born = bs.reduce(function (a, b) { return a + (+b.alive || 0) + (+b.dead || 0); }, 0);
    var alive = bs.reduce(function (a, b) { return a + (+b.alive || 0); }, 0);
    var weaned = bs.reduce(function (a, b) { return a + (+b.weanedCount || 0); }, 0);
    var lastBirth = bs.map(function (b) { return b.date; }).sort().pop() || '';
    var lastMate = ms.map(function (m) { return m.date; }).sort().pop() || '';
    return {
      matings: ms.length, births: bs.length, born: born, alive: alive, weaned: weaned,
      successRate: done.length ? Math.round(bs.length / done.length * 100) : null,
      avgLitter: bs.length ? round1(born / bs.length) : 0,
      survival: born ? Math.round(weaned / born * 100) : null,
      lastBirth: lastBirth, lastMate: lastMate,
      sinceBirth: lastBirth ? diffDays(today(), lastBirth) : null
    };
  }
  function buckStats(S, id) {
    var b = byId(S, id); if (!b) return null;
    var ms = (S.matings || []).filter(function (m) { return m.buck === id; });
    var bs = (S.births || []).filter(function (x) { return x.buck === id; });
    var done = ms.filter(function (m) { return m.result !== 'pending'; });
    var ok = ms.filter(function (m) { return m.result === 'born' || m.result === 'pregnant'; }).length;
    var kids = bs.reduce(function (a, x) { return a + (+x.alive || 0); }, 0);
    return {
      matings: ms.length, pending: ms.length - done.length, ok: ok,
      rate: done.length ? Math.round(ok / done.length * 100) : null,
      kids: kids, avgLitter: bs.length ? round1(kids / bs.length) : 0,
      last: ms.map(function (m) { return m.date; }).sort().pop() || ''
    };
  }
  function herd(S, t) {
    t = t || today();
    var preg = 0, nurs = 0, kits = 0, weaned = 0, ready = 0;
    activeDoes(S).forEach(function (d) {
      var s = status(S, d.id);
      if (s.k === 'preg') preg++;
      if (s.k === 'nurs') nurs++;
    });
    (S.births || []).forEach(function (b) { if (!b.weaned) kits += (+b.alive || 0); });
    (S.batches || []).forEach(function (b) {
      if (b.closed) return;
      weaned += batchLive(b);
      if (batchReady(b, S)) ready += batchLive(b);
    });
    return { does: activeDoes(S).length, bucks: activeBucks(S).length, preg: preg, nurs: nurs, kits: kits, weaned: weaned, ready: ready };
  }
  function report(S, month) {
    var m = money(S, month);
    var births = (S.births || []).filter(function (b) { return !month || b.date.slice(0, 7) === month; });
    var matings = (S.matings || []).filter(function (x) { return !month || x.date.slice(0, 7) === month; });
    var settled = matings.filter(function (x) { return x.result !== 'pending'; });
    var conceived = settled.filter(function (x) { return x.result === 'born' || x.result === 'pregnant'; }).length;
    var bornKits = births.reduce(function (a, b) { return a + (+b.alive || 0) + (+b.dead || 0); }, 0);
    var deadKits = births.reduce(function (a, b) { return a + (+b.dead || 0); }, 0);
    var perDoe = activeDoes(S).map(function (d) {
      var st = doeStats(S, d.id);
      return { id: d.id, num: d.num, births: st.births, born: st.born, weaned: st.weaned, avgLitter: st.avgLitter, survival: st.survival };
    }).sort(function (a, b) { return b.weaned - a.weaned; });
    return {
      money: m, matings: matings.length, births: births.length, bornKits: bornKits, deadKits: deadKits,
      conception: settled.length ? Math.round(conceived / settled.length * 100) : null,
      avgLitter: births.length ? round1(bornKits / births.length) : 0,
      mortality: bornKits ? Math.round(deadKits / bornKits * 1000) / 10 : 0,
      perDoe: perDoe
    };
  }

  var api = {
    DAY: DAY, today: today, parse: parse, addDays: addDays, diffDays: diffDays, fmt: fmt, monthOf: monthOf,
    monthLabel: monthLabel, ageDays: ageDays, ageText: ageText, uid: uid, num: num, esc: esc, sum: sum, round1: round1,
    byId: byId, doeOf: doeOf, doeNum: doeNum, animalLabel: animalLabel, activeDoes: activeDoes, activeBucks: activeBucks,
    openMating: openMating, openBirth: openBirth, status: status,
    batchLive: batchLive, batchLastWeight: batchLastWeight, batchGain: batchGain, batchAge: batchAge,
    birthDateOfBatch: birthDateOfBatch, batchReady: batchReady, batchName: batchName,
    alerts: alerts, vaxDue: vaxDue, DAYS: DAYS, medDays: medDays, medActive: medActive,
    parentsOf: parentsOf, relation: relation, REL_TEXT: REL_TEXT, relationBlocked: relationBlocked,
    custOf: custOf, saleDebt: saleDebt, custBalance: custBalance, oldestDebtDays: oldestDebtDays,
    money: money, monthsWithData: monthsWithData,
    doeStats: doeStats, buckStats: buckStats, herd: herd, report: report
  };
  root.Core = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
