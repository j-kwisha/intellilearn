import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewSubmissionScore } from '../src/services/submissionResults.js';

const graded = { status: 'graded', grading_status: 'graded', score: '16.00', total_points: '20.00', percentage: '80.00' };

test('omitted hidden or unreleased scores cannot render grades, correctness or AI feedback', () => {
  assert.equal(canViewSubmissionScore({ status: 'graded', grading_status: 'graded', answers: [{}] }), false);
  for (const field of ['score', 'total_points', 'percentage']) {
    const incomplete = { ...graded };
    delete incomplete[field];
    assert.equal(canViewSubmissionScore(incomplete), false);
    for (const value of [null, '', ' ', 'invalid', false, Infinity]) {
      assert.equal(canViewSubmissionScore({ ...graded, [field]: value }), false);
    }
  }
});

test('partial scores and grading errors cannot appear as completed results', () => {
  assert.equal(canViewSubmissionScore({ ...graded, status: 'submitted', grading_status: 'pending' }), false);
  assert.equal(canViewSubmissionScore({ ...graded, status: 'submitted', grading_status: 'grading_error' }), false);
  assert.equal(canViewSubmissionScore({ ...graded, grading_status: 'grading_error' }), false);
  assert.equal(canViewSubmissionScore({ ...graded, status: 'in_progress' }), false);
});

test('released grades and actual zero scores remain visible, including Laravel decimal strings', () => {
  assert.equal(canViewSubmissionScore(graded), true);
  assert.equal(canViewSubmissionScore({ ...graded, score: '0.00', percentage: '0.00' }), true);
  assert.equal(canViewSubmissionScore({ ...graded, score: 0, percentage: 0 }), true);
});
