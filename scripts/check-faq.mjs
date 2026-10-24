import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchFaq } from '../lib/faq-match.js';

const faq = JSON.parse(readFileSync(new URL('../data/faq.json', import.meta.url), 'utf8'));
assert.equal(faq.length, 13);
const cases = [
  [1, 'How long do pre-glued lashes last?'], [1, 'Pretty Ambition wear duration?'], [1, 'How many days do press on lashes stay on?'],
  [2, 'Can I keep pre glued lashes longer than seven days?'], [2, 'What if they hold more than 7 days?'], [2, 'Wear Pretty Ambition past 7 days?'],
  [3, 'Do I need separate lash glue?'], [3, 'Do pre-glued lashes require bond?'], [3, 'Have to buy adhesive?'],
  [4, 'Can I shower with my lashes?'], [4, 'Can I wash my face?'], [4, 'Can the lashes get wet?'],
  [5, 'Can I reuse these lashes?'], [5, 'Are the clusters reusable?'], [5, 'Can I wear them again?'],
  [6, 'How long do DIY lash kits last?'], [6, 'Volume lash kit wear time?'], [6, 'Classic lashes last how many days?'],
  [7, 'What is included in the DIY kit?'], [7, 'What comes with the kit?'], [7, 'What is inside the box?'],
  [8, 'DIY or pre-glued?'], [8, 'What is the difference between DIY and press on?'], [8, 'Compare the lash types'],
  [9, 'Are DIY kits good for beginners?'], [9, 'Is a DIY kit okay first time?'], [9, 'I am new to lashes, can I use the DIY kit?'],
  [10, 'How do I remove DIY lashes?'], [10, 'How do I take off my DIY lashes?'], [10, 'How can I get off my Volume lashes?'],
  [11, 'Can I sleep with them on?'], [11, 'Can I wear lashes overnight?'], [11, 'Can I go to bed wearing lashes?'],
  [12, 'Which lashes should I choose as a beginner?'], [12, 'Find my lash match'], [12, 'What do you recommend for a first time wearer?'],
  [13, 'Will clusters damage my natural lashes?'], [13, 'Can lashes harm my own lashes?'], [13, 'Do these ruin natural lashes?'],
];
for (const [id, question] of cases) assert.ok(matchFaq(question).includes(id), `${question} should match ${id}`);
assert.deepEqual(matchFaq('How long do they last?'), [1, 6]);
assert.deepEqual(matchFaq('How long does Pretty Ambition last?'), [1]);
assert.deepEqual(matchFaq('How long does my DIY kit last?'), [6]);
assert.deepEqual(matchFaq('How do I remove pre-glued lashes?'), []);
assert.deepEqual(matchFaq('What is the weather tomorrow?'), []);
console.log(`${cases.length + 5} FAQ matching cases passed.`);
