// Giveaway draw machine: animated globe of numbered balls, a winning ball drops down the chute,
// then the prizes pop out of the tray. Fills every element with [data-draw-machine]. CSS-only animation.
(function () {
  var PRIZES = [ // November Giveaway: 1st, 2nd, 3rd
    '/assets/gifts/giveaway/prize-1-flyer.jpg',
    '/assets/gifts/giveaway/prize-2-flyer.jpg',
    '/assets/gifts/giveaway/prize-3-flyer-v2.jpg',
  ];
  var BALLS = ['12', '07', '33', '85', '41', '99', '26', '58', '114', '67'];
  var WINNERS = ['07', '41', '85'];

  var css = `
  .dm { container-type: inline-size; position: relative; width: 100%; aspect-ratio: 1/1; overflow: hidden;
    background: radial-gradient(ellipse at 50% 35%, rgba(255,92,154,.35), transparent 62%), #120d0f; }
  .dm * { position: absolute; box-sizing: border-box; }
  .dm-cab { inset: 5% 15% 3% 15%; border-radius: 12cqw 12cqw 4cqw 4cqw; border: .6cqw solid #ff8fb8;
    background: linear-gradient(180deg, #2a1820, #140c10); box-shadow: 0 0 4cqw rgba(255,92,154,.55), inset 0 0 3cqw rgba(255,92,154,.25); }
  .dm-sign { top: 8%; left: 0; right: 0; text-align: center; font: 700 6.4cqw/1 'Cormorant Garamond', serif; letter-spacing: .4cqw;
    color: #ffd3e2; text-shadow: 0 0 1.6cqw #ff5c9a, 0 0 4cqw #ff5c9a; animation: dm-flicker 4s infinite; }
  .dm-globe { left: 23%; top: 17%; width: 54%; aspect-ratio: 1/1; border-radius: 50%; overflow: hidden;
    border: .6cqw solid rgba(255,211,226,.7); background: radial-gradient(circle at 32% 28%, rgba(255,255,255,.35), rgba(255,255,255,.04) 38%, rgba(255,92,154,.12) 70%, rgba(0,0,0,.35)); }
  .dm-globe::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.5), transparent 22%); }
  .dm-ball { width: 11cqw; height: 11cqw; border-radius: 50%; display: grid; place-items: center; font: 700 3.6cqw/1 Poppins, sans-serif; color: #2a1820;
    background: radial-gradient(circle at 35% 30%, #fff, #ffd3e2 55%, #e8a5bd); box-shadow: inset -.8cqw -.8cqw 1.4cqw rgba(0,0,0,.25);
    animation: dm-tumble var(--d, 2s) ease-in-out infinite; animation-delay: var(--w, 0s); }
  .dm-ball.p { background: radial-gradient(circle at 35% 30%, #fff, #ff8fb8 55%, #e2477f); color: #fff; }
  .dm-ball.g { background: radial-gradient(circle at 35% 30%, #fff7d6, #e5c46b 55%, #b38a2e); }
  .dm-neck { left: 45%; width: 10%; top: 69%; height: 9%; background: linear-gradient(90deg, #3a2430, #5a3646, #3a2430); border: .4cqw solid rgba(255,143,184,.5); }
  .dm-tray { left: 28%; right: 28%; top: 78%; height: 13%; border-radius: 2cqw; background: #07050a; border: .5cqw solid rgba(255,143,184,.6); box-shadow: inset 0 1.5cqw 2cqw rgba(0,0,0,.8); }
  .dm-push { left: 0; right: 0; top: 92%; text-align: center; font: 700 2.8cqw/1 Poppins, sans-serif; letter-spacing: 1cqw; color: #ff8fb8; }
  .dm-drop { left: 44.5%; top: 63%; opacity: 0; animation: dm-drop 9s infinite; animation-delay: var(--w); }
  .dm-prize { left: 33%; top: 46%; width: 34%; aspect-ratio: 1/1; object-fit: cover; border-radius: 3cqw; opacity: 0;
    border: .6cqw solid #ffd3e2; box-shadow: 0 0 5cqw rgba(255,92,154,.8); animation: dm-prize 9s infinite; animation-delay: var(--w); }
  .dm-win { left: 0; right: 0; top: 36%; text-align: center; opacity: 0; font: 700 3.4cqw/1 Poppins, sans-serif; letter-spacing: .6cqw; color: #fff;
    text-shadow: 0 0 2cqw #ff5c9a; animation: dm-prize 9s infinite; animation-delay: var(--w); }
  .dm-spark { color: #ffd3e2; font-size: 4cqw; animation: dm-twinkle 2.2s infinite; animation-delay: var(--w); text-shadow: 0 0 2cqw #ff5c9a; }
  @keyframes dm-tumble {
    0%, 100% { transform: translate(0, 0) rotate(0); }
    25% { transform: translate(60%, -140%) rotate(120deg); }
    50% { transform: translate(-50%, -60%) rotate(220deg); }
    75% { transform: translate(-80%, -170%) rotate(300deg); } }
  @keyframes dm-drop {
    0% { opacity: 0; transform: translateY(-40%) scale(.6); }
    3% { opacity: 1; }
    11% { opacity: 1; transform: translateY(160%) scale(1); }
    14% { transform: translateY(150%) scale(1.25); }
    20%, 100% { opacity: 0; transform: translateY(160%) scale(1); } }
  @keyframes dm-prize {
    0%, 10% { opacity: 0; transform: translateY(60%) scale(.3); }
    16% { opacity: 1; transform: translateY(-8%) scale(1.06); }
    19%, 30% { opacity: 1; transform: translateY(0) scale(1); }
    35%, 100% { opacity: 0; transform: translateY(-20%) scale(.9); } }
  @keyframes dm-twinkle { 0%, 100% { opacity: .15; transform: scale(.6); } 50% { opacity: 1; transform: scale(1.1); } }
  @keyframes dm-flicker { 0%, 100% { opacity: 1; } 47% { opacity: 1; } 48% { opacity: .55; } 49% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .dm * { animation: none !important; } .dm-prize:first-of-type, .dm-win:first-of-type { opacity: 1; } }
  `;

  function markup() {
    var balls = BALLS.map(function (n, i) {
      var x = 6 + (i % 5) * 17, y = 58 + Math.floor(i / 5) * 18; // resting pile at the bottom of the globe
      return '<i class="dm-ball' + (i % 3 === 1 ? ' p' : i % 4 === 3 ? ' g' : '') + '" style="left:' + x + '%;top:' + y + '%;--d:' + (1.6 + (i % 4) * .3) + 's;--w:-' + (i * .37).toFixed(2) + 's">' + n + '</i>';
    }).join('');
    var drops = WINNERS.map(function (n, i) { return '<i class="dm-ball p dm-drop" style="--w:' + i * 3 + 's">' + n + '</i>'; }).join('');
    var prizes = PRIZES.map(function (src, i) { return '<img class="dm-prize" src="' + src + '" alt="" loading="lazy" style="--w:' + i * 3 + 's">'; }).join('');
    var wins = WINNERS.map(function (n, i) { return '<span class="dm-win" style="--w:' + i * 3 + 's">#' + n + ' WINS</span>'; }).join('');
    var sparks = [[12, 30, 0], [84, 24, .7], [80, 70, 1.3], [14, 76, 1.9]].map(function (s) { return '<span class="dm-spark" style="left:' + s[0] + '%;top:' + s[1] + '%;--w:' + s[2] + 's">✦</span>'; }).join('');
    return '<div class="dm" aria-hidden="true"><div class="dm-cab"></div><div class="dm-sign">GIVEAWAY</div><div class="dm-globe">' + balls + '</div>' +
      '<div class="dm-neck"></div><div class="dm-tray"></div><div class="dm-push">PUSH</div>' + drops + prizes + wins + sparks + '</div>';
  }

  if (!document.getElementById('dm-css')) {
    var style = document.createElement('style'); style.id = 'dm-css'; style.textContent = css; document.head.appendChild(style);
  }
  window.fillDrawMachines = function () {
    document.querySelectorAll('[data-draw-machine]:empty').forEach(function (el) { el.innerHTML = markup(); });
  };
  window.fillDrawMachines();
})();
