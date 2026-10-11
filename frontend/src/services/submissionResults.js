// Hidden scores are omitted by Laravel, while ungraded scores may be null.
// Neither response represents a zero or permits correctness/feedback to be shown.
export function canViewSubmissionScore(submission) {
  if (submission.status !== 'graded' || ['pending', 'grading_error'].includes(submission.grading_status)) return false;
  return ['score', 'percentage', 'total_points'].every(field => {
    const value = submission[field];
    return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
      && Number.isFinite(Number(value));
  });
}
