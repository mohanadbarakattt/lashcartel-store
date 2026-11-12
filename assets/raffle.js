// Fills raffle banners from /data/raffle.json. Any element with data-raffle="prize|draw|line" is updated;
// containers with data-raffle-box are hidden when the raffle is disabled.
(function () {
  function fmtDate(d) {
    try { return new Date(d + 'T12:00:00+11:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }); } catch (_) { return d; }
  }
  fetch('/data/raffle.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    if (!c) return;
    if (!c.enabled) { document.querySelectorAll('[data-raffle-box]').forEach(function (el) { el.hidden = true; el.style.display = 'none'; }); return; }
    var prize = c.prize ? 'Prize: ' + c.prize : 'Prize revealed soon';
    var draw = c.drawDate ? 'Draw date: ' + fmtDate(c.drawDate) : 'Draw date announced soon';
    document.querySelectorAll('[data-raffle="prize"]').forEach(function (el) { el.textContent = prize; });
    document.querySelectorAll('[data-raffle="draw"]').forEach(function (el) { el.textContent = draw; });
    document.querySelectorAll('[data-raffle="notify"]').forEach(function (el) { el.textContent = c.winnerNotification || 'How the winner is contacted will be announced with the draw date.'; });
    document.querySelectorAll('[data-raffle="open"]').forEach(function (el) { el.textContent = c.entriesOpen ? fmtDate(c.entriesOpen) : 'announced soon'; });
    document.querySelectorAll('[data-raffle="close"]').forEach(function (el) { el.textContent = c.entriesClose ? fmtDate(c.entriesClose) : 'the draw date (to be announced)'; });
  }).catch(function () {});
})();
