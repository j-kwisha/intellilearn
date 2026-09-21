import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function StudentQuizPage() {
  const { courseId, assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/courses/${courseId}/assessments/${assessmentId}`)
      .then((res) => setAssessment(res.data.assessment))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, assessmentId]);

  const startQuiz = async () => {
    try {
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/start`);
      // Reload assessment to ensure questions are fresh
      const assessmentRes = await api.get(`/courses/${courseId}/assessments/${assessmentId}`);
      setAssessment(assessmentRes.data.assessment);
      setSubmission(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start assessment.');
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const answerArray = Object.entries(answers).map(([questionId, answerText]) => ({
      question_id: parseInt(questionId),
      answer_text: answerText,
    }));

    try {
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/submit`, {
        submission_id: submission.id,
        answers: answerArray,
      });
      setResult(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (!assessment) return <p className="text-slate-500">Assessment not found.</p>;

  // Show results
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className={`rounded-2xl p-8 text-center ${
          result.percentage >= 75 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className="text-2xl font-bold text-slate-800">
            {result.status === 'graded' ? 'Results' : 'Submitted!'}
          </h2>
          {result.status === 'graded' ? (
            <>
              <p className={`text-5xl font-bold mt-4 ${
                result.percentage >= 75 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {result.percentage}%
              </p>
              <p className="text-slate-600 mt-2">
                {result.score} / {result.total_points} points
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {result.percentage >= 75 ? 'Great job!' : 'Keep studying — you can do better!'}
              </p>
            </>
          ) : (
            <p className="text-slate-600 mt-4">
              Your essay answers are pending review by the instructor.
            </p>
          )}
        </div>

        {/* AI Feedback Panel */}
        <AiFeedbackPanel submissionId={result.id} />

        {/* AI Recommendations — shown when score is below 75% */}
        {result.status === 'graded' && result.percentage < 75 && (
          <AiRecommendationsPanel
            quizAvg={result.percentage}
            topic={assessment.topic}
          />
        )}

        {/* Show answers */}
        {result.answers && (
          <div className="space-y-3">
            {result.answers.map((answer, idx) => (
              <div key={answer.id} className={`bg-white rounded-xl border p-5 ${
                answer.is_correct === true ? 'border-emerald-200' :
                answer.is_correct === false ? 'border-red-200' : 'border-slate-200'
              }`}>
                <p className="text-sm font-medium text-slate-800">
                  Q{idx + 1}: {answer.question?.question_text}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Your answer: <span className="font-medium">{answer.answer_text}</span>
                </p>
                {answer.is_correct !== null && (
                  <p className={`text-xs mt-1 font-medium ${
                    answer.is_correct ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {answer.is_correct ? '✓ Correct' : '✗ Incorrect'} — {answer.points_earned ?? 0} pts
                  </p>
                )}
                {answer.points_earned === null && answer.question?.type === 'essay' && (
                  <p className="text-xs mt-1 font-medium text-amber-600">
                    ⏳ Pending instructor review
                  </p>
                )}
                {answer.ai_feedback && (
                  <p className={`text-xs mt-2 p-2 rounded ${
                    answer.ai_feedback.includes('Pending instructor') || answer.ai_feedback.includes('failed')
                      ? 'text-amber-700 bg-amber-50 border border-amber-200'
                      : 'text-indigo-600 bg-indigo-50'
                  }`}>
                    💬 {answer.ai_feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate(`/student/courses/${courseId}`)}
          className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium
            hover:bg-slate-200 transition-colors"
        >
          Back to course
        </button>
      </div>
    );
  }

  // Show start screen
  if (!submission) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800">{assessment.title}</h2>
          <div className="flex justify-center gap-4 mt-4 text-sm text-slate-500">
            <span>{assessment.questions?.length} questions</span>
            <span>{assessment.total_points} points</span>
            {assessment.time_limit_minutes && <span>⏱ {assessment.time_limit_minutes} min</span>}
          </div>
          {assessment.description && (
            <p className="text-sm text-slate-600 mt-4">{assessment.description}</p>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mt-4 border border-red-100">
              {error}
            </div>
          )}
          <button
            onClick={startQuiz}
            className="mt-6 bg-indigo-600 text-white px-8 py-2.5 rounded-lg text-sm font-semibold
              hover:bg-indigo-700 transition-colors"
          >
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  // Show questions
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800">{assessment.title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Answer all questions, then click Submit.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {assessment.questions?.map((q, idx) => (
        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-800">
            <span className="text-indigo-600 font-bold mr-2">Q{idx + 1}.</span>
            {q.question_text}
          </p>
          <p className="text-xs text-slate-400 mt-1">{q.points} points · {q.type.replace('_', ' ')}</p>

          <div className="mt-4">
            {(q.type === 'multiple_choice' || q.type === 'true_false') && q.options ? (
              <div className="space-y-2">
                {Object.values(q.options).map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${answers[q.id] === option
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => handleAnswer(q.id, option)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            ) : q.type === 'essay' ? (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                rows={5}
                placeholder="Write your answer here..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  placeholder-slate-400 resize-none"
              />
            ) : (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  placeholder-slate-400"
              />
            )}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold
          hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Answers'}
      </button>
    </div>
  );
}

// ── AI Feedback Panel ──────────────────────────────────────────
function AiFeedbackPanel({ submissionId }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post('/ai/quiz-feedback', { submission_id: submissionId })
      .then((res) => setFeedback(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-500 animate-pulse">
      Generating AI feedback...
    </div>
  );

  if (!feedback) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-indigo-800">🤖 AI Feedback</p>
      <p className="text-sm text-indigo-700">{feedback.summary}</p>

      {feedback.weak_topics?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-indigo-600 mb-1">Weak areas:</p>
          <div className="flex flex-wrap gap-2">
            {feedback.weak_topics.map((t, i) => (
              <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}

      {feedback.suggestions?.length > 0 && (
        <ul className="space-y-1">
          {feedback.suggestions.map((s, i) => (
            <li key={i} className="text-xs text-indigo-600 flex items-start gap-1.5">
              <span className="mt-0.5">→</span> {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── AI Recommendations Panel ───────────────────────────────
function AiRecommendationsPanel({ quizAvg, topic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post('/ai/recommend', { quiz_avg: quizAvg, topic: topic || '' })
      .then(res => { if (res.data.needs_recommendation) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [quizAvg, topic]);

  if (loading || !data) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-amber-800">📚 Personalized Learning Recommendations</p>
      <p className="text-sm text-amber-700">{data.message}</p>
      <div className="space-y-2">
        {data.recommendations.map((r, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
            <p className="text-sm font-medium text-slate-800">{r.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
            {r.type !== 'tip' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{r.type}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
