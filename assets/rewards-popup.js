fetch('/api/rewards-public', { cache: 'no-store' }).then(response => response.ok ? response.json() : { enabled: false }).then(({ enabled }) => {
  if (!enabled) return;
  const link = document.createElement('a');
  link.href = '/account.html'; link.textContent = 'Cartel Cash'; link.className = 'rewards-link';
  document.body.append(link);
  const until = Number(localStorage.getItem('lc_rewards_dismissed_until') || 0);
  if (until > Date.now()) return;
  const dialog = document.createElement('div');
  dialog.className = 'rewards-popup'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-label', 'Join Cartel Cash');
  dialog.innerHTML = '<button type="button" class="rewards-close" aria-label="Dismiss Cartel Cash offer">×</button><p class="rewards-eyebrow">LASH CARTEL</p><h2>Join Cartel Cash</h2><p>Sign in with your email and earn points when you shop.</p><a href="/account.html" class="rewards-join">Join Cartel Cash</a><p class="rewards-note">Promotional emails are optional when you sign up.</p>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => {
    localStorage.setItem('lc_rewards_dismissed_until', String(Date.now() + 14 * 86400000));
    dialog.remove();
  });
}).catch(() => {});
