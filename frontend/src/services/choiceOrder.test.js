import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderedChoices } from './choiceOrder.js';

test('choice order is stable within an attempt and varies across attempts without changing answers', () => {
  const question = { id: 42, type: 'multiple_choice', options: ['A', 'B', 'C', 'D', 'E'] };
  const original = [...question.options];
  const orders = new Set();
  for (let attempt = 1; attempt <= 12; attempt++) {
    const order = orderedChoices(question, attempt, true);
    assert.deepEqual(order, orderedChoices(question, attempt, true));
    assert.deepEqual([...order].sort(), [...original].sort());
    orders.add(order.join(','));
  }
  assert.ok(orders.size > 1);
  assert.deepEqual(question.options, original);
  assert.deepEqual(orderedChoices(question, 1, false), original);
  assert.deepEqual(orderedChoices({ ...question, type: 'true_false' }, 1, true), original);
});
