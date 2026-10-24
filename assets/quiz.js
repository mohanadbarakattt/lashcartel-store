import { recommend } from '/lib/quiz.js';

const root = document.getElementById('lash-match');
const panel = document.getElementById('quiz-panel');
const toggle = document.getElementById('quiz-toggle');
const data = await fetch('/data/quiz.json').then(r => r.json());
const stock = await fetch('/api/stock').then(r => r.ok ? r.json() : {}).catch(() => ({}));
let answers = [];
let index = 0;

function make(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderQuestion() {
  panel.replaceChildren();
  const q = data.questions[index];
  panel.append(make('p', `Question ${index + 1} of 5`, 'quiz-progress'));
  const heading = make('h3', q.text);
  heading.id = 'quiz-question';
  panel.append(heading);
  const options = make('div', '', 'quiz-options');
  for (const value of q.options) {
    const button = make('button', value, 'quiz-option');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(answers[index] === value));
    button.addEventListener('click', () => {
      answers[index] = value;
      if (index < 4) { index++; renderQuestion(); }
      else renderResult();
    });
    options.append(button);
  }
  panel.append(options);
  if (index > 0) {
    const back = make('button', 'Back', 'quiz-back');
    back.type = 'button';
    back.addEventListener('click', () => { index--; renderQuestion(); });
    panel.append(back);
  }
}

function renderResult() {
  panel.replaceChildren();
  const name = recommend(answers);
  const result = data.results[name];
  const layout = make('div', '', 'quiz-result');
  const image = document.createElement('img');
  image.src = result.image;
  image.alt = name;
  const copy = make('div');
  copy.append(make('p', 'Your lash match', 'quiz-progress'), make('h3', name), make('p', result.explanation));
  if (result.soldOut && stock['pretty-ambition'] !== true) {
    copy.append(make('p', 'Sold Out. The next batch is on its way.'));
    const form = document.createElement('form');
    form.className = 'quiz-notify';
    form.innerHTML = '<label for="quiz-email">Notify Me When Back in Stock</label><input id="quiz-email" name="email" type="email" required autocomplete="email" placeholder="Email address"><p>We’ll only email you about this restock.</p><button type="submit" class="btn btn-primary">Notify me</button><p class="quiz-status" role="status"></p>';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const status = form.querySelector('.quiz-status');
      const response = await fetch('/api/stock-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.elements.email.value, product: name }) });
      status.textContent = response.ok ? 'You’re on the list, Baddie. We’ll email you when she’s back.' : 'This service is not ready yet. Please try again later.';
    });
    copy.append(form, make('p', 'Prefer a DIY kit? Explore the Natural or Volume styles.'));
  } else {
    const link = make('a', 'Shop Your Lash Match', 'btn btn-primary');
    link.href = result.url;
    copy.append(link);
  }
  const retake = make('button', 'Retake Quiz', 'quiz-back');
  retake.type = 'button';
  retake.addEventListener('click', () => { answers = []; index = 0; renderQuestion(); });
  copy.append(retake);
  layout.append(image, copy);
  panel.append(layout);
}

toggle.addEventListener('click', () => {
  const open = panel.hidden;
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Close Lash Match Quiz' : 'Start Lash Match Quiz';
  if (open) renderQuestion();
});
