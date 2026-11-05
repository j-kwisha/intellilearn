import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function StudentRiskCheckPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [practice, setPractice] = useState(null);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [practiceCourseId, setPracticeCourseId] = useState(null);

  const loadPractice = async (courseId) => {
    if (!courseId) return;
    setPracticeBusy(true);
    setPracticeCourseId(courseId);
    setPractice(null);
    setError('');
    setPracticeResult(null);
    setPracticeAnswers({});
    try {
      const response = await api.get('/student/practice', { params: { course_id: courseId } });
      setPractice({ courseId, questions: response.data.questions || [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your practice quiz.');
    } finally {
      setPracticeBusy(false);
    }
  };

  const submitPractice = async () => {
    if (!practice?.questions?.length) return;
    setPracticeBusy(true);
    try {
      const response = await api.post('/student/practice', {
        course_id: practice.courseId,
        answers: practice.questions.map(question => ({ question_id: question.id, answer_text: practiceAnswers[question.id] || '' })),
      });
      setPracticeResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit practice answers.');
    } finally {
      setPracticeBusy(false);
    }
  };

  useEffect(() => {
    api.get('/ai/my-risk')
      .then((res) => setResults(res.data.results || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load risk data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="dashboard-main">
        <header className="dashboard-title-row">
          <div>
            <h1>My Risk Status</h1>
            <p className="dashboard-subtitle">AI-based analysis of your academic performance per course.</p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{error}</div>
        )}

        {results.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No enrolled courses found.
          </div>
        )}

        <div className="space-y-4">
          {results.map((item, idx) => (
            <div key={idx} className={`bg-white rounded-xl border-2 p-6 ${
              item.at_risk === true ? 'border-red-300' :
              item.at_risk === false ? 'border-emerald-300' : 'border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{item.course?.name}</h3>
                  <p className="text-sm text-slate-500">{item.course?.code}</p>
                </div>
                <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${
                  item.at_risk === true ? 'bg-red-100 text-red-700' :
                  item.at_risk === false ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'not_assessed' ? 'bg-slate-100 text-slate-500' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {item.at_risk === true ? '⚠️ At Risk' :
                   item.at_risk === false ? '✅ Not At Risk' :
                   item.status === 'not_assessed' ? '📊 Not Assessed Yet' : 'N/A'}
                </span>
              </div>
              <button type="button" className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60" disabled={practiceBusy} onClick={() => loadPractice(item.course?.id)}>
                {practiceBusy && practiceCourseId === item.course?.id ? 'Loading…' : 'Practice missed questions'}
              </button>

              {/* Not assessed message */}
              {item.status === 'not_assessed' && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  📊 Risk assessment requires at least one quiz submission or activity. Complete some assessments for your risk status to be calculated.
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
                <MetricCard label="Quiz Avg" value={`${item.metrics?.quiz_avg ?? 0}%`} />
                <MetricCard label="Logins" value={item.metrics?.login_count ?? 0} />
                <MetricCard label="Submission Rate" value={`${((item.metrics?.submission_rate ?? 0) * 100).toFixed(0)}%`} />
                <MetricCard label="Missed Tasks" value={item.metrics?.missed_tasks ?? 0} />
              </div>

              {/* Risk probability */}
              {item.risk_probability !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Risk Level</span>
                    <span>{(item.risk_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${item.at_risk ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(item.risk_probability * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Reasons */}
              {item.reasons?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Contributing factors:</p>
                  <ul className="space-y-1">
                    {item.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                        <span>•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {practiceBusy && practiceCourseId === item.course?.id && (
                <p className="mt-4 text-sm text-indigo-600" role="status">Loading missed questions for {item.course?.name}…</p>
              )}

              {practice?.courseId === item.course?.id && (
                <section className="mt-5 bg-indigo-50/60 rounded-xl border border-indigo-200 p-5 space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <h2 className="font-bold text-slate-800">Practice Quiz · Missed questions</h2>
                      <p className="text-xs text-slate-500 mt-1">{item.course?.name}</p>
                    </div>
                    <button type="button" onClick={() => setPractice(null)} className="text-slate-500 hover:text-slate-800">Close</button>
                  </div>
                  {practice.questions.length === 0 ? <p className="text-sm text-slate-600">No missed auto-graded quiz questions are recorded for this course yet. Practice questions come from completed attempts with incorrect answers; overdue or unsubmitted assessments count as missed tasks but do not have answers to practice.</p> : practice.questions.map((question, index) => <div key={question.id} className="border-t border-indigo-100 pt-3">
                    <p className="text-sm font-medium">{index + 1}. {question.question_text}</p>
                    {question.assessment_title && <p className="mt-1 text-xs text-slate-500">From: {question.assessment_title}</p>}
                    {question.type === 'multiple_choice' || question.type === 'true_false' ? <select className="mt-2 w-full border rounded-lg p-2 bg-white" value={practiceAnswers[question.id] || ''} onChange={e => setPracticeAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}><option value="">Choose an answer</option>{Object.values(question.options || {}).map(option => <option key={option} value={option}>{option}</option>)}</select> : <textarea className="mt-2 w-full border rounded-lg p-2 bg-white" rows={question.type === 'enumeration' ? 3 : 1} placeholder={question.type === 'enumeration' ? 'One answer per line' : 'Your answer'} value={practiceAnswers[question.id] || ''} onChange={e => setPracticeAnswers(prev => ({ ...prev, [question.id]: e.target.value }))} />}
                  </div>)}
                  {practice.questions.length > 0 && !practiceResult && <button type="button" disabled={practiceBusy} onClick={submitPractice} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">{practiceBusy ? 'Checking…' : 'Check practice answers'}</button>}
                  {practiceResult && <p className="p-3 rounded-lg bg-white text-indigo-800 font-semibold">Practice result: {practiceResult.attempt.correct_count} / {practiceResult.attempt.question_count} correct ({practiceResult.attempt.percentage}%). This does not affect your course grade.</p>}
                </section>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-bold text-slate-800">{value}</p>
    </div>
  );
}
