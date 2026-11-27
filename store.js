/* store.js — البيانات والحفظ والنسخ الاحتياطي والمزامنة */
(function (root) {
  'use strict';
  var Core = root.Core;
  var KEY = 'rabbitpro.v1';
  var AUTOKEY = 'rabbitpro.autobackup';
  var SCODE = 'rabbitpro.sync';

  var COLLECTIONS = ['does', 'bucks', 'matings', 'births', 'batches', 'sales', 'expenses', 'payments', 'custs',
    'inj', 'meds', 'vax', 'vaxLog', 'feed', 'feedLog', 'cages', 'deaths'];

  var DEFAULTS = {
    v: 1,
    set: { gest: 31, palp: 14, nest: 28, wean: 35, wtarget: 1800, feedLow: 20, debtDays: 30, currency: 'ج' },
    lastBackup: null
  };

  function blank() {
    var s = JSON.parse(JSON.stringify(DEFAULTS));
    COLLECTIONS.forEach(function (k) { s[k] = []; });
    return s;
  }

  function migrate(s) {
    if (!s || typeof s !== 'object') return blank();
    COLLECTIONS.forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    s.set = Object.assign({}, DEFAULTS.set, s.set || {});
    Object.keys(DEFAULTS.set).forEach(function (k) {
      if (!(k in s.set)) s.set[k] = DEFAULTS.set[k];
      if (k !== 'currency') s.set[k] = +s.set[k] || DEFAULTS.set[k];
    });
    s.v = 1;
    return s;
  }

  var Store = {
    KEY: KEY, AUTOKEY: AUTOKEY, SCODE: SCODE, COLLECTIONS: COLLECTIONS, DEFAULTS: DEFAULTS,
    blank: blank, migrate: migrate,
    S: null,
    undoStack: [],

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
      var s = null;
      try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
      Store.S = migrate(s);
      return Store.S;
    },
    rawSave: function () {
      try { localStorage.setItem(KEY, JSON.stringify(Store.S)); return true; }
      catch (e) { return false; }
    },
    save: function () {
      Store.S.ts = Date.now();
      var ok = Store.rawSave();
      if (!ok && root.UI && root.UI.toast) root.UI.toast('تعذر الحفظ على الجهاز — المساحة مليانة');
      if (typeof Store.syncQueue === 'function') Store.syncQueue();
      return ok;
    },

    /* ---- حذف مع إمكانية التراجع ---- */
    remove: function (coll, id, label) {
      var arr = Store.S[coll] || [];
      var i = arr.findIndex(function (x) { return x.id === id; });
      if (i < 0) return false;
      var item = arr.splice(i, 1)[0];
      Store.undoStack.push({ coll: coll, item: item, label: label || '', at: Date.now() });
      if (Store.undoStack.length > 10) Store.undoStack.shift();
      Store.save();
      return true;
    },
    undo: function () {
      var u = Store.undoStack.pop();
      if (!u) return null;
      (Store.S[u.coll] = Store.S[u.coll] || []).push(u.item);
      Store.save();
      return u;
    },
    undoLast: function () { return Store.undoStack.length ? Store.undoStack[Store.undoStack.length - 1] : null; },

    /* ---- نسخة تلقائية قبل العمليات الخطرة ---- */
    snapshot: function (why) {
      try {
        localStorage.setItem(AUTOKEY, JSON.stringify({ at: Date.now(), why: why || '', data: Store.S }));
      } catch (e) { /* لا مساحة */ }
    },
    autoBackup: function () {
      try { var r = localStorage.getItem(AUTOKEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    },
    restoreAuto: function () {
      var b = Store.autoBackup();
      if (!b || !b.data) return false;
      Store.S = migrate(b.data);
      Store.save();
      return true;
    },

    /* ---- استيراد ---- */
    importData: function (obj) {
      if (!obj || typeof obj !== 'object' || !Array.isArray(obj.does)) throw new Error('bad');
      Store.snapshot('قبل الاسترجاع');
      Store.S = migrate(obj);
      Store.S.ts = Date.now();
      Store.rawSave();
      return true;
    },

    /* ---- مزامنة (Supabase عام، مفتاح منشور، البيانات مشفرة باسم الكود) ---- */
    SB_URL: 'https://bgwbbqcuntidvmwdppax.supabase.co',
    SB_KEY: 'sb_publishable_T2ERNz8uQYuC4I1XWFdi4w_ZV9Yu7pV',
    syncState: 'off',
    _t: null,
    _busy: false,
    syncCode: function () { try { return localStorage.getItem(SCODE) || ''; } catch (e) { return ''; } },
    syncHash: function (code) {
      var enc = new TextEncoder().encode('rabbitpro:' + String(code).trim());
      return root.crypto.subtle.digest('SHA-256', enc).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    },
    rpc: function (fn, body) {
      return fetch(Store.SB_URL + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { 'apikey': Store.SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
      });
    },
    mergeAll: function (a, b) {
      var o = JSON.parse(JSON.stringify(a));
      COLLECTIONS.forEach(function (k) {
        o[k] = o[k] || [];
        (b[k] || []).forEach(function (x) {
          if (!o[k].some(function (y) { return y.id === x.id; })) o[k].push(x);
        });
      });
      o.set = Object.assign({}, b.set || {}, a.set || {});
      return o;
    },
    syncPush: function () {
      var c = Store.syncCode(); if (!c) return Promise.resolve(false);
      return Store.syncHash(c).then(function (h) { return Store.rpc('rf_put', { h: h, d: Store.S }); }).then(function () { return true; });
    },
    syncPull: function (first) {
      var c = Store.syncCode();
      if (!c || Store._busy) return Promise.resolve(false);
      Store._busy = true;
      Store.syncState = 'busy';
      var done = function (st) { Store._busy = false; Store.syncState = st; if (root.UI && root.UI.syncLabel) root.UI.syncLabel(); };
      return Store.syncHash(c).then(function (h) {
        return Store.rpc('rf_get', { h: h }).then(function (r) {
          if (r && r.data) {
            var rd = migrate(r.data);
            if (first) {
              Store.S = Store.mergeAll(Store.S, rd); Store.S.ts = Date.now(); Store.rawSave();
              return Store.syncPush().then(function () { done('ok'); if (root.UI) root.UI.render(); });
            }
            if ((rd.ts || 0) > (Store.S.ts || 0)) {
              Store.S = rd; Store.rawSave(); done('ok');
              if (root.UI) root.UI.render();
            } else if ((Store.S.ts || 0) > (rd.ts || 0)) {
              return Store.syncPush().then(function () { done('ok'); });
            }
          } else {
            Store.S.ts = Store.S.ts || Date.now();
            return Store.syncPush().then(function () { done('ok'); });
          }
          done('ok');
        });
      }).catch(function () { done('err'); return false; });
    },
    syncQueue: function () {
      if (!Store.syncCode()) return;
      clearTimeout(Store._t);
      Store._t = setTimeout(function () {
        Store.syncState = 'busy'; if (root.UI && root.UI.syncLabel) root.UI.syncLabel();
        Store.syncPush().then(function () {
          Store.syncState = 'ok';
        }).catch(function () { Store.syncState = 'err'; })
          .then(function () { if (root.UI && root.UI.syncLabel) root.UI.syncLabel(); });
      }, 1500);
    },
    syncOn: function (code) {
      try { localStorage.setItem(SCODE, String(code).trim()); } catch (e) { return Promise.resolve(false); }
      Store.syncState = 'idle';
      return Store.syncPull(true);
    },
    syncOff: function () {
      try { localStorage.removeItem(SCODE); } catch (e) { }
      Store.syncState = 'off';
    }
  };

  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
