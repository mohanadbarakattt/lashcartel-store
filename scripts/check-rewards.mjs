import assert from 'node:assert/strict';
import { purchasePoints, rewardDiscount } from '../lib/rewards.js';

assert.equal(purchasePoints(4895, 0), 48);
assert.equal(purchasePoints(9790, 979), 88);
assert.equal(rewardDiscount(0, 0, 10000), 0);
assert.equal(rewardDiscount(100, 100, 4895), 500);
assert.equal(rewardDiscount(500, 600, 4895), 2500);
assert.throws(() => rewardDiscount(100, 99, 4895), /not available/);
assert.throws(() => rewardDiscount(50, 100, 4895), /not available/);
assert.throws(() => rewardDiscount(100, 100, 500), /exceeds/);
assert.throws(() => rewardDiscount(200, 200, 900), /exceeds/);
console.log('Cartel Cash maths and redemption limits passed.');
