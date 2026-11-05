import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AssessmentSchedule from '../../components/AssessmentSchedule';
import { canViewSubmissionScore } from '../../services/submissionResults';
import { useNavigationGuard } from '../../context/NavigationGuardContextStore';
import { getAuthSession } from '../../services/authSession.js';

export default function StudentQuizPage() {
  const { courseId, assessmentId } = useParams();
  const navigate = useNavigate();
  const { registerGuard, clearGuard } = useNavigationGuard();
  const [assessment, setAssessment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [saveState, setSaveState] = useState('saved');
  const [lowDataMode, setLowDataMode] = useState(() => localStorage.getItem('intellilearn-low-data') === 'true');
  const [timerWarningOpen, setTimerWarningOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const lastSyncedAnswers = useRef({});
  const timerWarningShown = useRef(false);
  const timerExpired = useRef(false);

  const startedAt = submission?.started_at ? Date.parse(submission.started_at) : NaN;
  const timeLimitSeconds = Number(assessment?.time_limit_minutes) * 60;
  const remainingSeconds = Number.isFinite(startedAt) && timeLimitSeconds > 0
    ? Math.max(0, Math.ceil((startedAt + timeLimitSeconds * 1000 - currentTime) / 1000))
    : null;

  const lockAttempt = useCallback(() => api.post(`/courses/${courseId}/assessments/${assessmentId}/lock`, {
    submission_id: submission.id,
    answers: Object.entries(answers).map(([question_id, answer_text]) => ({ question_id: Number(question_id), answer_text })),
  }), [courseId, assessmentId, submission, answers]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    timerWarningShown.current = false;
    timerExpired.current = false;
    setTimerWarningOpen(false);
  }, [submission?.id]);

  useEffect(() => {
    if (remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= 60 && !timerWarningShown.current) {
      timerWarningShown.current = true;
      setTimerWarningOpen(true);
    }
  }, [remainingSeconds]);

  useEffect(() => {
    api.get(`/courses/${courseId}/assessments/${assessmentId}`)
      .then((res) => setAssessment(res.data.assessment))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, assessmentId]);

  // Warn on browser close/refresh AND intercept back button
  useEffect(() => {
    if (!submission || result) return;

    // Browser close / tab refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Leaving will lock this attempt. Your instructor will need to unlock access before you can continue.';
      return e.returnValue;
    };

    // Browser back button — push a dummy state so back button triggers popstate
    window.history.pushState(null, '', window.location.href);
    const handlePopState = async () => {
      const confirmed = window.confirm(
        'Leave Assessment?\n\nYour current answers have been saved, but you will not be able to retake this assessment once you leave — unless the instructor allows multiple attempts.\n\nClick "Cancel" to stay, or "OK" to leave.'
      );
      if (confirmed) {
        try { await lockAttempt(); }
        catch (lockError) { setError(lockError.response?.data?.message || 'Could not lock your attempt. Please try again.'); return; }
        navigate(`/student/courses/${courseId}`);
      } else {
        // Re-push state so back button can be intercepted again
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [submission, result, courseId, navigate, lockAttempt]);

  // Register nav guard so sidebar/menu links also trigger warning
  useEffect(() => {
    if (submission && !result) {
      registerGuard(() => ({
        blocked: true,
        onProceed: lockAttempt,
        message: 'Leave Assessment?\n\nYour current answers have been saved, but you will not be able to retake this assessment once you leave — unless the instructor allows multiple attempts.\n\nClick "Cancel" to stay, or "OK" to leave.',
      }));
    } else {
      clearGuard();
    }
    return () => clearGuard();
  }, [submission, result, lockAttempt, registerGuard, clearGuard]);

  useEffect(() => {
    if (!submission || result) return;
    const lockOnPageHide = () => {
      const token = getAuthSession().snapshot().token;
      const baseURL = api.defaults.baseURL.replace(/\/$/, '');
      fetch(`${baseURL}/courses/${courseId}/assessments/${assessmentId}/lock`, {
        method: 'POST', keepalive: true,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submission.id, answers: Object.entries(answers).map(([question_id, answer_text]) => ({ question_id: Number(question_id), answer_text })) }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', lockOnPageHide);
    return () => window.removeEventListener('pagehide', lockOnPageHide);
  }, [submission, result, answers, courseId, assessmentId]);

  const startQuiz = async () => {
    try {
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/start`);
      setSubmission(res.data.submission);
      const serverAnswers = Object.fromEntries((res.data.submission.answers || []).map(answer => [answer.question_id, answer.answer_text ?? '']));
      const localKey = `intellilearn-activity-${res.data.submission.id}`;
      let localAnswers = {};
      try { localAnswers = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch { localAnswers = {}; }
      const restoredAnswers = { ...serverAnswers, ...localAnswers };
      lastSyncedAnswers.current = { ...serverAnswers };
      setAnswers(restoredAnswers);
      if (res.data.submission.question_order?.length) {
        const order = new Map(res.data.submission.question_order.map((id, idx) => [Number(id), idx]));
        setAssessment(current => ({ ...current, questions: [...(current?.questions || [])].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999)) }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start assessment.');
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Local persistence is immediate; server autosave is debounced and resumes on reconnection.
  useEffect(() => {
    if (!submission || result) return undefined;
    const key = `intellilearn-activity-${submission.id}`;
    try { localStorage.setItem(key, JSON.stringify(answers)); } catch { /* device storage may be full */ }
    const changed = Object.entries(answers).filter(([id, value]) => lastSyncedAnswers.current[id] !== value);
    if (!changed.length) return undefined;
    const timer = window.setTimeout(async () => {
      if (!navigator.onLine) { setSaveState('offline'); return; }
      setSaveState('saving');
      try {
        for (const [questionId, answerText] of changed) {
          await api.put(`/courses/${courseId}/assessments/${assessmentId}/autosave`, {
            submission_id: submission.id, question_id: Number(questionId), answer_text: answerText,
          });
          lastSyncedAnswers.current[questionId] = answerText;
        }
        setSaveState('saved');
      } catch {
        setSaveState(navigator.onLine ? 'retry' : 'offline');
      }
    }, lowDataMode ? 1800 : 600);
    return () => window.clearTimeout(timer);
  }, [answers, submission, result, courseId, assessmentId, lowDataMode]);

  useEffect(() => {
    const retrySave = () => {
      if (submission && !result) {
        Object.entries(answers).filter(([questionId, answerText]) => lastSyncedAnswers.current[questionId] !== answerText).forEach(([questionId, answerText]) => {
          api.put(`/courses/${courseId}/assessments/${assessmentId}/autosave`, {
            submission_id: submission.id, question_id: Number(questionId), answer_text: answerText,
          }).then(() => { lastSyncedAnswers.current[questionId] = answerText; setSaveState('saved'); }).catch(() => setSaveState('retry'));
        });
      }
    };
    window.addEventListener('online', retrySave);
    return () => window.removeEventListener('online', retrySave);
  }, [submission, result, answers, courseId, assessmentId]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    // Include blank responses too: timed submissions must work even if a student
    // has not answered any questions or has left some unfinished.
    const answerArray = (assessment?.questions || []).map(question => ({
      question_id: Number(question.id),
      answer_text: answers[question.id] ?? '',
    }));

    try {
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/submit`, {
        submission_id: submission.id,
        answers: answerArray,
      });
      setResult(res.data.submission);
      localStorage.removeItem(`intellilearn-activity-${submission.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, assessment?.questions, assessmentId, courseId, submission, submitting]);

  useEffect(() => {
    if (remainingSeconds !== 0 || !submission || result || submitting || timerExpired.current) return;
    timerExpired.current = true;
    setTimerWarningOpen(false);
    handleSubmit();
  }, [remainingSeconds, submission, result, submitting, handleSubmit]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (!assessment) return <p className="text-slate-500">Assessment not found.</p>;

  // Paper-based assessment — just show the file viewer
  if (assessment.type === 'paper_based') {
    const fileUrl = assessment.file_url;
    const isPdf = assessment.file_path?.toLowerCase().endsWith('.pdf') || fileUrl?.includes('.pdf');
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{assessment.title}</h2>
            <p className="text-sm text-slate-500 mt-1">📄 Paper-based assessment — view the file below and answer on paper.</p>
            <AssessmentSchedule assessment={assessment} />
          </div>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
              Download
            </a>
          )}
        </div>
        {fileUrl ? (
          <div style={{ height: 'calc(100vh - 200px)', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isPdf ? (
              <iframe src={fileUrl} title={assessment.title} style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                title={assessment.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
            <p className="text-slate-400">No file uploaded for this assessment yet.</p>
          </div>
        )}
        <button onClick={() => navigate(`/student/courses/${courseId}`)}
          className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
          ← Back to course
        </button>
      </div>
    );
  }

  // Show results
  if (result) {
    const isPending = result.status === 'submitted' || result.status === 'in_progress';
    // Only show answer correctness if score is visible to the student
    const answersVisible = canViewSubmissionScore(result);
    const hiddenTitle = result.grading_status === 'grading_error' ? 'Grading Error'
      : isPending ? 'Pending Grade'
      : assessment.score_visibility === 'hidden' ? 'Score Hidden'
      : assessment.score_visibility === 'instructor_release' ? 'Awaiting Grade Release' : 'Score Unavailable';

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className={`rounded-2xl p-8 text-center ${
          !answersVisible
            ? 'bg-slate-50 border border-slate-200'
            : result.percentage >= 75
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className="text-2xl font-bold text-slate-800">
            {isPending ? 'Submitted!' : 'Results'}
          </h2>
          {answersVisible ? (
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
                {assessment.passing_score != null ? `${result.percentage >= Number(assessment.passing_score) ? 'Passed' : 'Not passed'} · Passing score ${assessment.passing_score}%` : (result.percentage >= 75 ? 'Great job!' : 'Keep studying — you can do better!')}
              </p>
            </>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-3xl font-bold text-slate-400">{hiddenTitle}</p>
              <p className="text-slate-500 text-sm mt-2">
                {result.grading_status === 'grading_error'
                  ? 'Your submission was saved, but automatic grading failed. Please contact your instructor.'
                  : isPending
                  ? 'Your answers are pending review by the instructor.'
                  : assessment.score_visibility === 'hidden'
                  ? 'Your submission has been graded. Scores and feedback are hidden by your instructor.'
                  : assessment.score_visibility === 'instructor_release'
                  ? 'Your score will be visible once the instructor releases the grades.'
                  : 'Your score is currently unavailable. Please contact your instructor.'}
              </p>
            </div>
          )}
        </div>

        {/* AI Feedback Panel - only show if score is visible */}
        {answersVisible && <AiFeedbackPanel submissionId={result.id} />}

        {/* AI Recommendations — shown when score is below 75% and visible */}
        {answersVisible && result.percentage < 75 && (
          <AiRecommendationsPanel
            quizAvg={result.percentage}
            topic={assessment.topic}
          />
        )}

        {/* Show answers - only if score is visible */}
        {answersVisible && result.answers && (
          <div className="space-y-3">
            {result.answers.map((answer, idx) => {
              const isMatching = answer.question?.type === 'matching';
              let matchingAnswers = [];
              if (isMatching) {
                try {
                  const parsed = JSON.parse(answer.answer_text || '{}');
                  matchingAnswers = Object.entries(parsed).map(([pairId, selection]) => ({ pairId, selection }));
                } catch { matchingAnswers = []; }
              }

              return (
              <div key={answer.id} className={`bg-white rounded-xl border p-5 ${
                answer.is_correct === true ? 'border-emerald-200' :
                answer.is_correct === false ? 'border-red-200' : 'border-slate-200'
              }`}>
                <p className="text-sm font-medium text-slate-800">
                  Q{idx + 1}: {answer.question?.question_text}
                </p>
                {isMatching && matchingAnswers.length > 0 ? (
                  <div className="text-sm text-slate-600 mt-3 space-y-1">
                    <p className="font-medium text-slate-700">Your matches:</p>
                    <div className="space-y-1">
                      {answer.question?.matching_pairs?.map((pair) => {
                        const selected = matchingAnswers.find(m => m.pairId === pair.id.toString());
                        const correct = selected?.selection === pair.correct_match;
                        return (
                          <div key={pair.id} className="text-xs text-slate-600">
                            <span className="font-medium">{pair.left_item}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className={correct ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                              {selected?.selection || '(not answered)'}
                            </span>
                            <span className="ml-2">{correct ? '✓' : '✗'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 mt-2">
                    Your answer: <span className="font-medium">{answer.answer_text}</span>
                  </p>
                )}
                {typeof answer.is_correct === 'boolean' && (
                  <p className={`text-xs mt-1 font-medium ${answer.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                    {answer.is_correct ? '✓ Correct' : '✗ Incorrect'} — {answer.points_earned ?? 0} pts
                  </p>
                )}
                {answer.points_earned === null && answer.question?.type === 'essay' && (
                  <p className="text-xs mt-1 font-medium text-amber-600">{answer.grading_status === 'grading_error' ? 'Automatic grading failed; contact your instructor.' : '⏳ Pending instructor review'}</p>
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
              );
            })}
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

  const dateMessage = assessment.available_from && currentTime < Date.parse(assessment.available_from)
    ? 'This assessment is not open yet.'
    : !assessment.allow_late_submissions && assessment.due_date && currentTime >= Date.parse(assessment.due_date)
      ? 'The deadline for this assessment has passed.' : '';

  // Show start screen
  if (!submission) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800">{assessment.title}</h2>
          {assessment.assessment_stage && assessment.assessment_stage !== 'regular' && <p className="text-xs mt-2 text-indigo-600">{assessment.assessment_stage === 'pre_test' ? 'Pre-test' : 'Post-test'} · Stored for knowledge-gain reporting; excluded from your course grade.</p>}
          <div className="flex justify-center gap-4 mt-4 text-sm text-slate-500">
            <span>{assessment.questions?.length} questions</span>
            <span>{assessment.total_points} points</span>
            {assessment.time_limit_minutes && <span>⏱ {assessment.time_limit_minutes} min</span>}
          </div>
          {assessment.description && (
            <p className="text-sm text-slate-600 mt-4">{assessment.description}</p>
          )}
          <AssessmentSchedule assessment={assessment} className="mt-4 justify-center text-sm text-slate-600" />
          {(error || dateMessage) && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mt-4 border border-red-100">
              {error || dateMessage}
            </div>
          )}
          <button
            onClick={startQuiz}
            disabled={Boolean(dateMessage)}
            className="mt-6 bg-indigo-600 text-white px-8 py-2.5 rounded-lg text-sm font-semibold
              hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      {remainingSeconds !== null && (
        <div className="sticky top-20 z-30 -mb-2 flex justify-end pointer-events-none">
          <div className={`pointer-events-auto rounded-xl border px-4 py-2 shadow-lg ${remainingSeconds <= 60
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-white border-indigo-200 text-slate-800'}`} aria-live="polite">
            <span className="text-xs font-medium mr-2">Time remaining</span>
            <span className="font-mono font-bold tabular-nums">{formatRemainingTime(remainingSeconds)}</span>
          </div>
        </div>
      )}

      {timerWarningOpen && remainingSeconds !== null && remainingSeconds > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="assessment-time-warning-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="assessment-time-warning-title" className="text-lg font-bold text-amber-700">One minute remaining</h2>
            <p className="mt-2 text-sm text-slate-600">Your assessment will be submitted automatically when the timer reaches zero.</p>
            <p className="mt-3 font-mono text-2xl font-bold text-slate-900">{formatRemainingTime(remainingSeconds)}</p>
            <button type="button" onClick={() => setTimerWarningOpen(false)} className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Continue assessment
            </button>
          </div>
        </div>
      )}

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Assessment in Progress</p>
          <p className="text-xs text-amber-700 mt-1">
            If you leave this page, your saved attempt will lock. Your instructor must unlock it for you before you can continue.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800">{assessment.title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Answer all questions, then click Submit.
        </p>
        <button type="button" onClick={() => setLowDataMode(previous => { const next = !previous; localStorage.setItem('intellilearn-low-data', String(next)); return next; })} className="mt-3 text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700">
          Low-data mode: {lowDataMode ? 'On' : 'Off'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="text-xs text-slate-500" aria-live="polite">
        {saveState === 'saving' ? 'Saving answers…' : saveState === 'offline' ? 'Offline — answers saved on this device; they will sync when you reconnect.' : saveState === 'retry' ? 'Could not sync yet — your answers remain saved on this device.' : 'Answers autosaved'}
      </div>
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
            ) : q.type === 'matching' && q.matching_pairs ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 mb-3">Match each item on the left with the correct item on the right:</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 w-2/5">Item</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Matches with</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.matching_pairs.map((pair, pairIdx) => {
                        // Parse existing answer JSON if any
                        const currentAnswers = answers[q.id] ? JSON.parse(answers[q.id] || '{}') : {};
                        
                        return (
                          <tr key={pair.id} className={pairIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-t border-slate-100">
                              {pair.left_item}
                            </td>
                            <td className="px-4 py-3 border-t border-slate-100">
                              <select
                                value={currentAnswers[pair.id] || ''}
                                onChange={(e) => {
                                  const newAnswers = { ...currentAnswers, [pair.id]: e.target.value };
                                  handleAnswer(q.id, JSON.stringify(newAnswers));
                                }}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
                                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                  bg-white"
                              >
                                <option value="">-- Select a match --</option>
                                {q.matching_pairs.map((rightPair) => (
                                  <option key={rightPair.id} value={rightPair.right_item}>
                                    {rightPair.right_item}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : q.type === 'enumeration' ? (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                rows={3}
                placeholder="Enter one answer per line"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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
        onClick={() => setConfirmSubmitOpen(true)}
        disabled={submitting}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold
          hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Answers'}
      </button>
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-submit-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="confirm-submit-title" className="text-lg font-bold text-slate-900">Submit your answers now?</h2>
            <p className="mt-2 text-sm text-slate-600">Submitting ends this attempt. {assessment?.max_attempts === 1 ? 'This assessment allows one attempt. To try again, ask your instructor to unlock access for you.' : 'You may have attempts remaining according to the assessment settings.'}</p>
            {assessment?.questions?.filter(question => !String(answers[question.id] || '').trim()).length > 0 && <p className="mt-2 text-sm font-semibold text-amber-700">You still have {assessment.questions.filter(question => !String(answers[question.id] || '').trim()).length} unanswered question(s).</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmSubmitOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Continue answering</button>
              <button type="button" disabled={submitting} onClick={() => { setConfirmSubmitOpen(false); handleSubmit(); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Yes, submit now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Feedback Panel ──────────────────────────────────────────
function formatRemainingTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

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
