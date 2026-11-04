// Captures influencer referral links (?ref=CODE) and remembers the code for 30 days.
(function () {
  var KEY = 'lc_ref', DAYS = 30;
  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.code && Date.now() - v.ts < DAYS * 864e5) return v; } catch (_) {}
    return null;
  }
  function save(code, typed) {
    try { localStorage.setItem(KEY, JSON.stringify({ code: code, ts: Date.now(), typed: !!typed })); } catch (_) {}
    document.cookie = 'lc_ref=' + encodeURIComponent(code) + '; Max-Age=' + DAYS * 86400 + '; Path=/; SameSite=Lax';
  }
  window.LC_REFERRAL = {
    get: function () { var v = read(); return v ? v.code : ''; },
    set: function (code) { save(String(code).trim().toUpperCase(), true); },
    clear: function () { try { localStorage.removeItem(KEY); } catch (_) {} document.cookie = 'lc_ref=; Max-Age=0; Path=/'; },
  };
  var params = new URLSearchParams(location.search);
  var ref = (params.get('ref') || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(ref)) return;
  var counted = 'lc_ref_click_' + ref;
  save(ref, false);
  try { if (localStorage.getItem(counted)) return; localStorage.setItem(counted, '1'); } catch (_) {}
  fetch('/api/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: ref }), keepalive: true }).catch(function () {});
})();
