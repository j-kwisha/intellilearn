import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, reportCsv } from '../src/services/reportExport.js';

test('CSV preserves commas, quotes and newlines and protects against spreadsheet formulas', () => {
  assert.equal(csvCell('Security, "Principles"\nCourse'), '"Security, ""Principles""\nCourse"');
  for (const value of ['=HYPERLINK("bad")', '+cmd', '-cmd', '@SUM(A1)', '  =1', '\tformula']) {
    assert.ok(csvCell(value).startsWith('"\''));
  }
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(0), '"0"');
});

test('student CSV includes filters, generated time and explicit unknown AI status without converting missing scores to zero', () => {
  const csv = reportCsv({ generated_at: '2026-10-10T12:00:00Z', filters: { course_id: 1, from: '2026-10-01' },
    options: { courses: [{ id: 1, name: 'Information Security' }], instructors: [] },
    students: [{ student_name: 'Student', email: 'student@example.test', course_name: 'Information Security', average_score: null,
      missed_assessments: 1, submission_rate: 0, risk_status: 'unavailable', risk_probability: null,
      attention_reasons: ['Overdue submission'], risk_reasons: [] }] }, 'students');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Course filter","Information Security"'));
  assert.ok(csv.includes('2026-10-10T12:00:00Z'));
  assert.ok(csv.includes('"Information Security","","1","0","unavailable",""'));
});
