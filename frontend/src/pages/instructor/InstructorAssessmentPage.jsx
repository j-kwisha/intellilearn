import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function InstructorAssessmentPage() {
  const { courseId, assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [tab, setTab] = useState('questions');
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grading, setGrading] = useState(false);
  const [grades, setGrades] = useState({});
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState('');

  const fetchAll = () => {
    Promise.all([
      api.get(`/courses/${courseId}/assessments/${assessmentId}`),
      api.get(`/courses/${courseId}/assessments/${assessmentId}/submissions`),
    ])
      .then(([aRes, sRes]) => {
        setAssessment(aRes.data.assessment);
        setSubmissions(sRes.data.submissions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [courseId, assessmentId]);

  const openGrading = async (submission) => {
    const res = await api.get(`/courses/${courseId}/assessments/${assessmentId}/submissions/${submission.id}`);
    const full = res.data.submission;
    setSelectedSubmission(full);
    // Pre-fill grades with existing points_earned
    const initial = {};
    full.answers?.forEach((a) => {
      initial[a.question_id] = { points_earned: a.points_earned ?? '', ai_feedback: a.ai_feedback ?? '' };
    });
    setGrades(initial);
    setGrading(true);
  };

  const saveGrades = async () => {
    setGradeSaving(true); setGradeError('');
    try {
      const gradeArray = Object.entries(grades).map(([qId, g]) => ({
        question_id: parseInt(qId),
        points_earned: parseFloat(g.points_earned) || 0,
        ai_feedback: g.ai_feedback || '',
      }));
      await api.put(`/courses/${courseId}/assessments/${assessmentId}/submissions/${selectedSubmission.id}/grade`, {
        grades: gradeArray,
      });
      setGrading(false);
      fetchAll();
    } catch (err) {
      setGradeError(err.response?.data?.message || 'Failed to save grades.');
    } finally {
      setGradeSaving(false);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!confirm('Delete this question?')) return;
    await api.delete(`/courses/${courseId}/assessments/${assessmentId}/questions/${questionId}`);
    fetchAll();
  };

  const togglePublish = async () => {
    await api.put(`/courses/${courseId}/assessments/${assessmentId}`, {
      is_published: !assessment.is_published,
    });
    fetchAll();
  };

  const releaseScores = async () => {
    if (!confirm('Release scores for all students in this assessment?')) return;
    try {
      await api.post(`/courses/${courseId}/assessments/${assessmentId}/release-scores`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release scores.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>
  );

  if (!assessment) return <p className="text-slate-500">Assessment not found.</p>;

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;
  const avgScore = submissions.length
    ? (submissions.filter(s => s.percentage != null).reduce((sum, s) => sum + parseFloat(s.percentage), 0) /
       (submissions.filter(s => s.percentage != null).length || 1)).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate(`/instructor/courses/${courseId}`)}
              className="text-xs text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">
              ← Back to course
            </button>
            <h2 className="text-xl font-bold text-slate-800">{assessment.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                {assessment.type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400">{assessment.questions?.length || 0} questions · {assessment.total_points} pts</span>
              {assessment.time_limit_minutes && <span className="text-xs text-slate-400">⏱ {assessment.time_limit_minutes} min</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${assessment.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {assessment.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
          <button onClick={togglePublish}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors shrink-0 ${
              assessment.is_published
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}>
            {assessment.is_published ? 'Unpublish' : 'Publish'}
          </button>
          {assessment.score_visibility === 'instructor_release' && !assessment.scores_released_at && (
            <button onClick={releaseScores}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-colors shrink-0 bg-blue-600 text-white hover:bg-blue-700">
              🔓 Release Scores
            </button>
          )}
          {assessment.score_visibility === 'instructor_release' && assessment.scores_released_at && (
            <div className="text-sm px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              ✓ Scores Released
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{submissions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Submissions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pending Review</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">{avgScore ?? '—'}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Avg Score</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {['questions', 'results'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors
              ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
            {t === 'results' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Questions tab */}
      {tab === 'questions' && (
        <div className="space-y-3">
          {(!assessment.questions || assessment.questions.length === 0) ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No questions yet. Go back to the course and use "+ Add Questions".
            </p>
          ) : (
            assessment.questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="text-teal-600 font-bold mr-2">Q{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                        {q.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">{q.points} pts</span>
                    </div>
                    {q.options && (
                      <div className="mt-3 space-y-1">
                        {Object.entries(q.options).map(([key, val]) => (
                          <p key={key} className={`text-xs px-3 py-1.5 rounded-lg ${
                            q.correct_answer === key
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'bg-slate-50 text-slate-600'
                          }`}>
                            {key}. {val} {q.correct_answer === key && '✓'}
                          </p>
                        ))}
                      </div>
                    )}
                    {q.correct_answer && !q.options && (
                      <p className="text-xs text-emerald-600 mt-2">Answer: {q.correct_answer}</p>
                    )}
                  </div>
                  <button onClick={() => deleteQuestion(q.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No submissions yet.
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Student</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Attempt</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Score</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600">Submitted</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {s.user?.first_name} {s.user?.last_name}
                        <p className="text-xs text-slate-400 font-normal">{s.user?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">#{s.attempt_number}</td>
                      <td className="px-5 py-3">
                        {s.percentage != null ? (
                          <span className={`font-semibold ${parseFloat(s.percentage) >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {s.percentage}%
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                        {s.score != null && <p className="text-xs text-slate-400">{s.score}/{s.total_points} pts</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                          s.status === 'graded' ? 'bg-emerald-50 text-emerald-700' :
                          s.status === 'submitted' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => openGrading(s)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                          {s.status === 'submitted' ? 'Grade' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grading Modal */}
      {grading && selectedSubmission && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">
                  {selectedSubmission.user?.first_name} {selectedSubmission.user?.last_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attempt #{selectedSubmission.attempt_number} · {selectedSubmission.status}
                </p>
              </div>
              <button onClick={() => setGrading(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {gradeError && <p className="text-red-500 text-sm">{gradeError}</p>}
              {selectedSubmission.answers?.map((answer, idx) => (
                <div key={answer.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-800">
                    Q{idx + 1}: {answer.question?.question_text}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{answer.question?.type?.replace(/_/g, ' ')} · {answer.question?.points} pts</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Student's answer:</p>
                    <p className="text-sm text-slate-800">{answer.answer_text || <span className="italic text-slate-400">No answer</span>}</p>
                  </div>
                  {answer.question?.correct_answer && (
                    <p className="text-xs text-emerald-600">Correct answer: {answer.question.correct_answer}</p>
                  )}
                  {/* Auto-graded */}
                  {answer.is_correct !== null && answer.question?.type !== 'essay' ? (
                    <p className={`text-xs font-medium ${answer.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                      {answer.is_correct ? '✓ Correct' : '✗ Incorrect'} — {answer.points_earned} pts
                    </p>
                  ) : (
                    /* Manual grading fields */
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-500 w-24 shrink-0">Points earned:</label>
                        <input
                          type="number"
                          min={0}
                          max={answer.question?.points}
                          value={grades[answer.question_id]?.points_earned ?? ''}
                          onChange={(e) => setGrades((prev) => ({
                            ...prev,
                            [answer.question_id]: { ...prev[answer.question_id], points_earned: e.target.value }
                          }))}
                          className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder={`/ ${answer.question?.points}`}
                        />
                      </div>
                      <div className="flex items-start gap-3">
                        <label className="text-xs text-slate-500 w-24 shrink-0 mt-1.5">Feedback:</label>
                        <textarea
                          rows={2}
                          value={grades[answer.question_id]?.ai_feedback ?? ''}
                          onChange={(e) => setGrades((prev) => ({
                            ...prev,
                            [answer.question_id]: { ...prev[answer.question_id], ai_feedback: e.target.value }
                          }))}
                          placeholder="Optional feedback..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={saveGrades} disabled={gradeSaving}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {gradeSaving ? 'Saving...' : 'Save Grades'}
              </button>
              <button onClick={() => setGrading(false)}
                className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
