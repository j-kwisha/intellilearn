import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentPublication, toApiDate, toLocalInput } from '../src/services/assessmentDates.js';
import { formatGrade, escapeHtml } from '../src/services/gradePrint.js';

test('Manila dates open on the selected local day, with UTC transport', () => {
  assert.equal(toApiDate('2026-10-09'), '2026-10-08T16:00:00.000Z');
  assert.equal(toApiDate('2026-10-09', true), '2026-10-09T15:59:59.000Z');
  assert.equal(toApiDate('2026-10-09T08:30'), '2026-10-09T00:30:00.000Z');
  assert.equal(toLocalInput('2026-10-09T00:30:00.000Z'), '2026-10-09T08:30');
  assert.equal(toApiDate(''), null);
});

test('scheduling publishes without the manual checkbox and clearing the schedule preserves draft choice', () => {
  assert.equal(assessmentPublication({ available_from: '2026-10-10T00:00', is_published: false }), true);
  assert.equal(assessmentPublication({ available_from: '2026-10-11T09:00', is_published: false }), true);
  assert.equal(assessmentPublication({ available_from: '', is_published: false }), false);
  assert.equal(assessmentPublication({ available_from: '', is_published: true }), true);
});

test('grades from Laravel decimal strings print safely, including zero and missing values', () => {
  assert.equal(formatGrade('85.50'), '85.50');
  assert.equal(formatGrade('0.00'), '0.00');
  assert.equal(formatGrade(90), '90.00');
  assert.equal(formatGrade(null), '\u2014');
  assert.equal(formatGrade('invalid'), '\u2014');
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
