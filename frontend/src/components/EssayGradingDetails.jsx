export default function EssayGradingDetails({ answer, grade, onChange }) {
  const evaluation = answer.ai_evaluation;
  const snapshot = answer.rubric_snapshot;
  const gradingError = answer.grading_status === 'grading_error';
  if (!snapshot) return gradingError ? <p role="alert">Automatic grading failed ({answer.grading_error_code}). Review the essay configuration or grade manually.</p> : null;
  const scores = grade?.criterion_scores;
  const setCriterion = (id, value) => {
    const initial = answer.teacher_criterion_scores || Object.fromEntries(snapshot.criteria.map(c => [c.id, evaluation?.criteria?.find(r => r.criterion_id === c.id)?.awarded_points ?? 0]));
    const next = { ...(scores || initial), [id]: value };
    const total = Object.values(next).reduce((sum, points) => sum + Number(points || 0), 0);
    onChange({ criterion_scores: next, points_earned: total.toFixed(2) });
  };
  return (
    <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: 10, padding: 14, margin: '12px 0', color: '#334155' }}>
      <h4 style={{ margin: '0 0 8px' }}>{snapshot.title}</h4>
      {gradingError && <p role="alert">Automatic grading failed ({answer.grading_error_code}). Review the configuration or grade manually.</p>}
      <p><strong>Original AI score: {evaluation?.total_score ?? 'Pending'} / {snapshot.total_points}</strong></p>
      <p>Final score: {answer.points_earned ?? 'Pending'}{answer.instructor_override ? ' (teacher override)' : ''}</p>
      {snapshot.criteria.map(c => {
        const row = evaluation?.criteria?.find(r => r.criterion_id === c.id);
        return <div key={c.id} style={{ borderTop: '1px solid #e2e8f0', padding: '10px 0' }}>
          <strong>{c.criterion}</strong>
          <p style={{ margin: '4px 0' }}>AI: {row?.awarded_points ?? 'Pending'} / {c.max_points}</p>
          {row?.feedback && <p style={{ margin: '4px 0', fontSize: 13 }}>{row.feedback}</p>}
          {onChange && <label style={{ fontSize: 13 }}>Teacher points
            <input type="number" min="0" max={c.max_points} step="0.01" value={scores?.[c.id] ?? answer.teacher_criterion_scores?.[c.id] ?? row?.awarded_points ?? ''}
              onChange={e => setCriterion(c.id, e.target.value)}
              style={{ width: 90, marginLeft: 8, border: '1px solid #cbd5e1', padding: 6, borderRadius: 6, background: '#fff', color: '#334155' }} />
          </label>}
        </div>;
      })}
      {scores && <button type="button" onClick={() => onChange({ criterion_scores: undefined })} style={{ padding: 6 }}>Use overall score override instead</button>}
      {evaluation && <>
        <strong>Overall AI Feedback</strong><p>{evaluation.overall_feedback}</p>
        <strong>Strengths</strong><ul>{evaluation.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
        <strong>Areas for Improvement</strong><ul>{evaluation.areas_for_improvement.map((item, i) => <li key={i}>{item}</li>)}</ul>
        <p style={{ fontSize: 12 }}>Model: {evaluation.ai_model || 'No AI call (blank answer)'} · Graded: {evaluation.graded_at}</p>
      </>}
      <details><summary>Reference used for grading</summary>
        <p>{answer.reference_snapshot?.file?.filename || (answer.reference_snapshot?.lesson_id ? `Lesson ${answer.reference_snapshot.lesson_id}` : 'Attached reference text')}</p>
        {answer.reference_snapshot?.truncated && <p>Reference was truncated to the supported limit.</p>}
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto', fontSize: 12 }}>{answer.reference_snapshot?.text}</pre>
      </details>
    </div>
  );
}
