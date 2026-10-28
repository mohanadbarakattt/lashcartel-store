import assert from 'node:assert/strict';
import { recommend } from '../lib/quiz.js';

const base = ['Everyday wear', 'Natural and subtle', 'I’ve worn lashes a few times', 'Long-lasting wear', 'DIY lash kits with bond and seal'];
const testCases = [
  [[], 'DIY Cluster Lash Kit — Natural'],
  [[1, 'Soft and wispy'], 'DIY Cluster Lash Kit — Natural'],
  [[1, 'Full and fluffy'], 'DIY Cluster Lash Kit — Volume'],
  [[1, 'Bold and dramatic'], 'DIY Cluster Lash Kit — Volume'],
  [[1, 'I’m not sure!'], 'DIY Cluster Lash Kit — Natural'],
  [[1, 'I’m not sure!'], 'DIY Cluster Lash Kit — Natural'],
  [[[1, 'I’m not sure!'], [3, 'Maximum volume and glamour']], 'DIY Cluster Lash Kit — Volume'],
  [[[1, 'Natural and subtle'], [3, 'Maximum volume and glamour']], 'DIY Cluster Lash Kit — Natural'],
  [[[1, 'Full and fluffy'], [3, 'Natural-looking results']], 'DIY Cluster Lash Kit — Volume'],
  [[[4, 'Pre-glued lashes for easy application'], [1, 'Bold and dramatic']], 'Pretty Ambition'],
  [[[4, 'Pre-glued lashes for easy application'], [2, 'Complete beginner']], 'Pretty Ambition'],
  [[[4, 'I’m not sure, help me choose!'], [2, 'Complete beginner']], 'Pretty Ambition'],
  [[[4, 'I’m not sure, help me choose!'], [3, 'Quick and easy application']], 'Pretty Ambition'],
  [[[4, 'I’m not sure, help me choose!'], [1, 'Full and fluffy']], 'DIY Cluster Lash Kit — Volume'],
  [[[4, 'I’m not sure, help me choose!'], [1, 'Soft and wispy']], 'DIY Cluster Lash Kit — Natural'],
  [[[0, 'Night out'], [1, 'Full and fluffy']], 'DIY Cluster Lash Kit — Volume'],
];
for (const [changes, expected] of testCases) {
  const answers = [...base];
  const pairs = changes.length && typeof changes[0] === 'number' ? [changes] : changes;
  for (const [index, value] of pairs) answers[index] = value;
  assert.equal(recommend(answers), expected);
}
console.log(`${testCases.length} quiz paths passed.`);
