import assert from 'node:assert/strict';
import { dueStage } from '../lib/cart-schedule.js';

const now = Date.parse('2026-10-25T00:00:00Z');
const base = { consent:true, purchased_at:null, unsubscribed_at:null, reminders_sent:0, updated_at:new Date(now - 2*3600000).toISOString() };
assert.equal(dueStage(base, now), 0);
assert.equal(dueStage({ ...base, updated_at:new Date(now - 7199000).toISOString() }, now), -1);
assert.equal(dueStage({ ...base, reminders_sent:1, updated_at:new Date(now - 24*3600000).toISOString() }, now), 1);
assert.equal(dueStage({ ...base, reminders_sent:2, updated_at:new Date(now - 72*3600000).toISOString() }, now), 2);
assert.equal(dueStage({ ...base, reminders_sent:3 }, now), -1);
assert.equal(dueStage({ ...base, consent:false }, now), -1);
assert.equal(dueStage({ ...base, purchased_at:new Date(now).toISOString() }, now), -1);
assert.equal(dueStage({ ...base, unsubscribed_at:new Date(now).toISOString() }, now), -1);
console.log('Cart reminder schedule and stop conditions passed.');
