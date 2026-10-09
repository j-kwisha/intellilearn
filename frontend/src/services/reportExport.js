export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheet programs must treat user-supplied names as text, not formulas.
  if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportCsv(report, section) {
  const course = report.options.courses.find(c => String(c.id) === String(report.filters.course_id));
  const instructor = report.options.instructors.find(i => String(i.id) === String(report.filters.instructor_id));
  const rows = [
    ['IntelliLearn Academic Reports', section],
    ['Generated at', report.generated_at],
    ['Course filter', course?.name || 'All courses'],
    ['Instructor filter', instructor ? `${instructor.first_name} ${instructor.last_name}` : 'All instructors'],
    ['Deadline from (UTC)', report.filters.from || 'Any'], ['Deadline to (UTC)', report.filters.to || 'Any'], [],
  ];
  if (section === 'courses') {
    rows.push(['Course', 'Code', 'Instructor', 'Students', 'Average best graded score (%)', 'Submitted', 'Expected',
      'Submission rate (%)', 'Overdue missing', 'Pending grading', 'Grading errors']);
    report.courses.forEach(c => rows.push([c.name, c.code, c.instructor_name, c.student_count, c.average_score,
      c.submitted_count, c.expected_count, c.submission_rate, c.missed_assessments, c.pending_grading, c.grading_errors]));
  } else if (section === 'students') {
    rows.push(['Student', 'Email', 'Course', 'Average best graded score (%)', 'Overdue missing', 'Submission rate (%)',
      'AI risk status', 'AI risk probability (%)', 'Attention reasons', 'AI reasons']);
    report.students.forEach(s => rows.push([s.student_name, s.email, s.course_name, s.average_score, s.missed_assessments,
      s.submission_rate, s.risk_status, s.risk_probability, s.attention_reasons.join('; '), s.risk_reasons.join('; ')]));
  } else {
    rows.push(['Metric', 'Count']);
    Object.entries(report.overview).forEach(([key, value]) => rows.push([key.replaceAll('_', ' '), value]));
    rows.push([], ['Grading metric', 'Count']);
    Object.entries(report.grading).forEach(([key, value]) => rows.push([key.replaceAll('_', ' '), value]));
  }
  rows.push([], ['Calculation notes', 'Active student enrollments; published assessments only. Best graded attempt per student/assessment. Ungraded work excluded from averages. Future and paper-based assessments excluded from expected online submissions. Missing counts only past deadlines after enrollment. Activity for AI is distinct submission days, not actual login counts.']);
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
