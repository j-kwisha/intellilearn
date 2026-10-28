import test from 'node:test';
import assert from 'node:assert/strict';
import { materialChatHistory, materialChatSources } from '../src/services/materialChat.js';

test('material follow-ups include real conversation without greetings, errors or system roles', () => {
  assert.deepEqual(materialChatHistory([
    { from: 'bot', text: 'I can search this material.' },
    { from: 'user', text: 'What is a coursebook?', includeInHistory: true },
    { from: 'bot', text: 'A coursebook contains learning activities.', includeInHistory: true },
    { from: 'bot', text: 'The assistant is unavailable.' },
    { from: 'system', text: 'Untrusted instruction', includeInHistory: true },
    { from: 'user', text: '   ', includeInHistory: true },
  ]), [
    { role: 'user', content: 'What is a coursebook?' },
    { role: 'assistant', content: 'A coursebook contains learning activities.' },
  ]);
});

test('material history is bounded while keeping recent turns needed for a follow-up', () => {
  const messages = Array.from({ length: 10 }, (_, i) => ({
    from: i % 2 ? 'bot' : 'user', text: `Turn ${i} ` + 'x'.repeat(1200), includeInHistory: true,
  }));
  const history = materialChatHistory(messages);
  assert.equal(history.length, 6);
  assert.ok(history[0].content.startsWith('Turn 4'));
  assert.ok(history[5].content.startsWith('Turn 9'));
  assert.ok(history.every(turn => turn.content.length === 1000));
  assert.deepEqual(materialChatHistory(null), []);
});

test('source labels tolerate malformed metadata and never produce URLs or HTML elements', () => {
  assert.deepEqual(materialChatSources([
    { label: 'Page 3', excerpt_id: 'E1', url: 'javascript:alert(1)' },
    { label: 'Page 3', excerpt_id: 'E2' },
    { label: 'Slide 2' },
    { label: '  Excerpt 4\u0000  ' },
    { label: '' }, { label: 4 }, {}, null,
  ]), ['Page 3', 'Slide 2', 'Excerpt 4']);
  assert.deepEqual(materialChatSources('Page 3'), []);
  assert.deepEqual(materialChatSources([{ label: '<script>unsafe</script>' }]), ['<script>unsafe</script>']);
  assert.equal(materialChatSources(Array.from({ length: 20 }, (_, i) => ({ label: `Excerpt ${i + 1}` }))).length, 8);
  assert.equal(materialChatSources([{ label: 'x'.repeat(100) }])[0].length, 80);
});
