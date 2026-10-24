import { matchFaq, FALLBACK } from '/lib/faq-match.js';

const launcher = document.getElementById('chat-launcher');
const dialog = document.getElementById('chat-dialog');
const log = document.getElementById('chat-log');
const input = document.getElementById('chat-input');
const data = await fetch('/data/faq.json').then(r => r.json());

function append(role, message, links = []) {
  const item = document.createElement('div');
  item.className = `chat-message ${role}`;
  const p = document.createElement('p');
  p.textContent = message;
  item.append(p);
  for (const { label, url } of links) {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = url;
    item.append(a);
  }
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

function ask(question) {
  if (!question.trim()) return;
  append('customer', question);
  const matches = matchFaq(question);
  if (!matches.length) {
    append('bot', FALLBACK, [{ label: 'Contact us', url: '/contact' }]);
    fetch('/api/faq-unmatched', { method: 'POST' }).catch(() => {});
  } else {
    for (const id of matches) {
      const faq = data.find(item => item.id === id);
      append('bot', `${matches.length > 1 ? faq.question + ' ' : ''}${faq.answer}`, faq.url ? [{ label: faq.url.includes('lash-match') ? 'Find your lash match' : 'View product', url: faq.url }] : []);
    }
  }
}

export function openChat() {
  dialog.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  if (!log.children.length) append('bot', 'Hey Baddie! Ask me about applying, removing or caring for your Lash Cartel lashes.');
  input.focus();
}

function closeChat() {
  dialog.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  launcher.focus();
}

document.getElementById('chat-close').addEventListener('click', closeChat);
dialog.addEventListener('keydown', event => { if (event.key === 'Escape') closeChat(); });
document.getElementById('chat-form').addEventListener('submit', event => {
  event.preventDefault();
  ask(input.value);
  input.value = '';
  input.focus();
});
document.querySelectorAll('[data-chat-question]').forEach(button => button.addEventListener('click', () => ask(button.dataset.chatQuestion)));
