import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { assessmentPublication, toApiDate } from '../../services/assessmentDates';
import EssayQuestionFields from '../../components/EssayQuestionFields';
import { rubricError } from '../../services/rubric';
import PdfQuizImport from '../../components/PdfQuizImport';
import TestBankBuilder from '../../components/TestBankBuilder';

const formatRetryTime = (seconds) => seconds >= 3600
  ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function InstructorCreateAssessmentPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState('form'); // 'form' | 'questions' | 'import_pdf'
  const [assessmentId, setAssessmentId] = useState(null);
  const [assessmentTitle, setAssessmentTitle] = useState('');

  // Assessment form — total_points removed (auto-calculated from questions)
  const [form, setForm] = useState({
    title: '', description: '', lesson_id: '', type: 'quiz', topic: '',
    time_limit_minutes: '', max_attempts: 1, is_published: false,
    available_from: '', due_date: '', score_visibility: 'immediate', assessment_stage: 'regular',
    passing_score: '', allow_late_submissions: false, shuffle_questions: false,
  });
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const publishOnCompletion = assessmentPublication(form);

  // Questions
  const [questions, setQuestions] = useState([newQuestion()]);
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState('');
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [savedQuestionError, setSavedQuestionError] = useState('');
  const [quizDraftLoading, setQuizDraftLoading] = useState(false);
  const [quizDraftError, setQuizDraftError] = useState('');
  const [quizDraftCount, setQuizDraftCount] = useState(5);
  const [quizDraftRetrySeconds, setQuizDraftRetrySeconds] = useState(0);
  const [quizDraftRetryUntil, setQuizDraftRetryUntil] = useState(0);
  const [quizDraftRetryEstimated, setQuizDraftRetryEstimated] = useState(true);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [questionBankMessage, setQuestionBankMessage] = useState('');
  const [lessonSourceSaving, setLessonSourceSaving] = useState(false);
  const [lessonLoadError, setLessonLoadError] = useState('');

  const [pdfImport, setPdfImport] = useState(null);
  const [pdfImportPending, setPdfImportPending] = useState(false);
  const [pdfImportReviewed, setPdfImportReviewed] = useState(false);

  // Lessons list for essay reference picker
  const [lessons, setLessons] = useState([]);
  useEffect(() => {
    setLessonLoadError('');
    api.get(`/courses/${courseId}/lessons`)
      .then(res => setLessons(Array.isArray(res.data.lessons) ? res.data.lessons : []))
      .catch(err => setLessonLoadError(err.response?.data?.message || 'Could not load lessons for this course.'));
  }, [courseId]);

  const handleLessonSourceChange = async (lessonId) => {
    const previousLessonId = form.lesson_id;
    setForm(previous => ({ ...previous, lesson_id: lessonId }));
    setQuizDraftError('');
    if (!assessmentId) return;
    setLessonSourceSaving(true);
    try {
      await api.put(`/courses/${courseId}/assessments/${assessmentId}`, { lesson_id: lessonId || null });
    } catch (err) {
      setForm(previous => ({ ...previous, lesson_id: previousLessonId }));
      setQuizDraftError(err.response?.data?.message || 'Could not save the lesson link. Please try again.');
    } finally {
      setLessonSourceSaving(false);
    }
  };

  useEffect(() => {
    if (!quizDraftRetryUntil) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((quizDraftRetryUntil - Date.now()) / 1000));
      setQuizDraftRetrySeconds(remaining);
      if (remaining === 0) setQuizDraftRetryUntil(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quizDraftRetryUntil]);

  function newQuestion() {
    return { 
      question_text: '', 
      type: 'multiple_choice', 
      options: ['', '', '', ''], 
      correct_answer: '', 
      points: 1,
      matching_pairs: [{ left_item: '', right_item: '' }, { left_item: '', right_item: '' }],
      reference_lesson_id: '',
      reference_text: '', reference_file: null, rubric: null,
    };
  }

  const validateAssessmentForm = () => {
    if (!form.title.trim()) return 'Assessment title is required.';
    if (!form.type) return 'Please select an assessment type.';
    if (!form.max_attempts || parseInt(form.max_attempts) < 1) return 'Max attempts must be at least 1.';
    if (!form.score_visibility) return 'Please select a score visibility option.';
    return null;
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    const validationError = validateAssessmentForm();
    if (validationError) { setError(validationError); return; }

    setSaving(true); setError('');
    try {
      const data = { ...form };
      // Paper-based now describes the source: students take the imported quiz online.
      if (data.type === 'paper_based') data.type = 'quiz';
      if (!data.time_limit_minutes) delete data.time_limit_minutes;
      data.passing_score = data.passing_score === '' ? null : Number(data.passing_score);
      data.available_from = toApiDate(data.available_from);
      data.due_date = toApiDate(data.due_date, true);
      data.lesson_id = data.lesson_id || null;
      // Keep setup private; Done publishes the completed assessment automatically.
      data.is_published = false;
      if (!assessmentId) data.defer_publication = true;

      let created;
      if (assessmentId) {
        const res = await api.put(`/courses/${courseId}/assessments/${assessmentId}`, data);
        created = res.data.assessment;
      } else {
        const res = await api.post(`/courses/${courseId}/assessments`, data);
        created = res.data.assessment;
        setAssessmentId(created.id);
      }
      setAssessmentTitle(created.title);

      if (!assessmentId && addToCalendar && form.due_date) {
        await api.post(`/courses/${courseId}/calendar`, {
          title: `📝 ${created.title}`,
          event_type: form.type === 'long_exam' ? 'exam' : 'quiz',
          start_date: data.due_date,
          description: `${data.type.replace(/_/g, ' ')}`,
          color: form.type === 'long_exam' ? '#ef4444' : '#f59e0b',
        });
      }

      setStep(form.type === 'paper_based' && !pdfImport ? 'import_pdf' : 'questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  const handlePdfImported = async (draft) => {
    const description = [form.description, draft.instructions].filter(Boolean).join('\n\n');
    if (description !== form.description) {
      await api.put(`/courses/${courseId}/assessments/${assessmentId}`, { description });
      setForm(previous => ({ ...previous, description }));
    }
    setQuestions(draft.questions.map(question => ({ ...newQuestion(), ...question })));
    setPdfImport(draft);
    setPdfImportPending(true);
    setPdfImportReviewed(false);
    setQError('');
    setStep('questions');
  };

  const generateQuizDraft = async () => {
    if (!form.lesson_id || !assessmentId) return;
    setQuizDraftLoading(true);
    setQuizDraftError('');
    try {
      const response = await api.post(`/courses/${courseId}/assessments/${assessmentId}/generate-quiz-draft`, {
        lesson_id: Number(form.lesson_id), question_count: Number(quizDraftCount),
      });
      setQuestions((response.data.questions || []).map(question => ({ ...newQuestion(), ...question })));
      setQError('Review and edit this AI-generated draft before saving it.');
      setQuizDraftRetryUntil(0);
      setQuizDraftRetrySeconds(0);
    } catch (err) {
      const status = err.response?.status;
      const suppliedWait = Number(err.response?.data?.retry_after_seconds ?? err.response?.headers?.['retry-after']);
      const retryAfter = Number.isFinite(suppliedWait) && suppliedWait > 0
        ? Math.ceil(suppliedWait) : (status === 429 || status === 503 ? 60 : 0);
      if (retryAfter > 0) {
        setQuizDraftRetrySeconds(retryAfter);
        setQuizDraftRetryUntil(Date.now() + retryAfter * 1000);
        setQuizDraftRetryEstimated(err.response?.data?.retry_estimated !== false);
      }
      setQuizDraftError(err.response?.data?.message || (status === 429 || status === 503
        ? 'The AI provider is busy or has reached a temporary request limit. Wait before trying again.'
        : 'Could not generate a question draft from this lesson.'));
    } finally {
      setQuizDraftLoading(false);
    }
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts, correct_answer: q.correct_answer && q.correct_answer === q.options[optIdx] ? value : q.correct_answer };
    }));
  };

  const addOption = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeOption = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.filter((_, oi) => oi !== optIdx), correct_answer: q.correct_answer === q.options[optIdx] ? '' : q.correct_answer };
    }));
  };

  const addMatchingPair = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIdx ? { ...q, matching_pairs: [...q.matching_pairs, { left_item: '', right_item: '' }] } : q
    ));
  };

  const removeMatchingPair = (qIdx, pairIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      if (q.matching_pairs.length <= 2) return q; // Keep at least 2 pairs
      return { ...q, matching_pairs: q.matching_pairs.filter((_, pi) => pi !== pairIdx) };
    }));
  };

  // For matching, right_item IS the correct_match — update both together
  const updateMatchingPair = (qIdx, pairIdx, field, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const pairs = [...q.matching_pairs];
      pairs[pairIdx] = { ...pairs[pairIdx], [field]: value };
      return { ...q, matching_pairs: pairs };
    }));
  };

  const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);
  const removeQuestion = (idx) => { if (questions.length > 1) setQuestions(prev => prev.filter((_, i) => i !== idx)); };

  const deleteSavedQuestion = async (question) => {
    if (deletingQuestionId !== null || qSaving) return;
    if (!window.confirm('Delete this saved question?')) return;
    setDeletingQuestionId(question.id);
    setSavedQuestionError('');
    try {
      await api.delete(`/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`);
      setSavedQuestions(previous => previous.filter(saved => saved.id !== question.id));
    } catch (err) {
      setSavedQuestionError(err.response?.data?.message || 'Could not delete the saved question. Please try again.');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleSaveQuestions = async () => {
    if (qSaving) return;
    setQSaving(true); setQError('');
    if (pdfImportPending && !pdfImportReviewed) {
      setQError('Review the imported questions against your PDF and confirm the review before saving.'); setQSaving(false); return;
    }
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { setQError(`Question ${i + 1} is missing the question text.`); setQSaving(false); return; }
      if (!q.points || parseFloat(q.points) <= 0) { setQError(`Question ${i + 1} needs a valid points value.`); setQSaving(false); return; }
      if (q.type === 'multiple_choice') {
        const filled = q.options.filter(o => o.trim() !== '');
        if (filled.length < 2) { setQError(`Question ${i + 1}: Multiple choice needs at least 2 options.`); setQSaving(false); return; }
        if (!q.correct_answer.trim() || !filled.includes(q.correct_answer)) { setQError(`Question ${i + 1}: Please select the correct answer.`); setQSaving(false); return; }
      }
      if (q.type === 'true_false' && !q.correct_answer) { setQError(`Question ${i + 1}: Please select True or False as the answer.`); setQSaving(false); return; }
      if (q.type === 'matching') {
        if (!q.matching_pairs || q.matching_pairs.length < 2) {
          setQError(`Question ${i + 1}: Matching questions need at least 2 pairs.`); setQSaving(false); return;
        }
        for (let j = 0; j < q.matching_pairs.length; j++) {
          const pair = q.matching_pairs[j];
          if (!pair.left_item.trim() || !pair.right_item.trim()) {
            setQError(`Question ${i + 1}, Pair ${j + 1}: Term and Definition must be filled.`); setQSaving(false); return;
          }
        }
      }
    }

    try {
      const cleaned = questions.map(q => {
        const out = { ...q, points: parseFloat(q.points) };
        if (q.type === 'essay' && q.rubric) {
          const error = rubricError(q.rubric, q.points); if (error) throw new Error(error);
          out.rubric = { ...q.rubric, total_points: Number(q.points) };
        } else if (q.type !== 'essay') delete out.rubric;
        if (q.type === 'essay') { 
          delete out.options; 
          delete out.correct_answer; 
          delete out.matching_pairs;
          if (!out.reference_lesson_id) delete out.reference_lesson_id;
          if (!out.reference_text) delete out.reference_text;
        }
        else if (q.type === 'short_answer') { 
          delete out.options; 
          delete out.matching_pairs;
        }
        else if (q.type === 'true_false') { 
          out.options = ['True', 'False']; 
          delete out.matching_pairs;
        }
        else if (q.type === 'matching') {
          delete out.options;
          delete out.correct_answer;
          // Set correct_match = right_item for each pair automatically
          out.matching_pairs = q.matching_pairs.map(p => ({
            left_item: p.left_item,
            right_item: p.right_item,
            correct_match: p.right_item,  // correct match is always the right column value
          }));
        }
        else { 
          out.options = q.options.filter(o => o.trim() !== ''); 
          delete out.matching_pairs;
          delete out.reference_lesson_id;
          delete out.reference_text;
        }
        return out;
      });
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/questions/bulk`, { questions: cleaned });
      setSavedQuestions(prev => [...prev, ...res.data.questions]);
      setQuestions([newQuestion()]);
      setPdfImportPending(false);
    } catch (err) {
      setQError(err.response?.data?.message || err.message || 'Failed to save questions.');
    } finally {
      setQSaving(false);
    }
  };

  const handleFinish = async () => {
    const setFinishError = setQError;
    setFinishError('');
    if (pdfImportPending) {
      setFinishError('Review and save the imported questions before finishing.'); return;
    }
    if (publishOnCompletion && savedQuestions.length === 0) {
      setFinishError('Save at least one question before publishing.');
      return;
    }
    setFinishing(true);
    try {
      await api.put(`/courses/${courseId}/assessments/${assessmentId}`, { is_published: publishOnCompletion });
      navigate(`/instructor/courses/${courseId}`);
    } catch (err) {
      setFinishError(err.response?.data?.message || 'Failed to finish assessment. Please try again.');
    } finally {
      setFinishing(false);
    }
  };

  const S = {
    input: {
      width: '100%', padding: '11px 14px',
      border: '1.5px solid #e2e8f0', borderRadius: '10px',
      fontSize: '0.9rem', outline: 'none', fontFamily: "'DM Sans', sans-serif",
      color: '#0f172a', background: 'white', boxSizing: 'border-box',
    },
    inputError: {
      width: '100%', padding: '11px 14px',
      border: '1.5px solid #f87171', borderRadius: '10px',
      fontSize: '0.9rem', outline: 'none', fontFamily: "'DM Sans', sans-serif",
      color: '#0f172a', background: 'white', boxSizing: 'border-box',
    },
    label: {
      display: 'block', fontSize: '0.85rem', fontWeight: 700,
      color: '#334155', marginBottom: 6,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    btn: {
      background: '#0d9488', color: 'white', border: 'none',
      borderRadius: '10px', padding: '11px 24px',
      fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    btnGhost: {
      background: 'white', color: '#475569',
      border: '1.5px solid #e2e8f0', borderRadius: '10px',
      padding: '11px 24px', fontSize: '0.9rem', fontWeight: 600,
      cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
  };

  const typeLabel = { 
    multiple_choice: 'Multiple Choice', 
    true_false: 'True / False', 
    short_answer: 'Short Answer', 
    essay: 'Essay',
    matching: 'Matching'
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <button onClick={() => navigate(`/instructor/courses/${courseId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Course
      </button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {step === 'form' ? 'Create New Assessment' : `Add Questions — ${assessmentTitle}`}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 28 }}>
        {step === 'form' ? 'Set up the assessment details, then add your questions.' : 'Add questions one batch at a time. Click Save Questions to confirm each batch.'}
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        {[
          'Assessment Details',
          form.type === 'paper_based' ? 'Import and Review Questions' : 'Add Questions'
        ].map((label, i) => {
          const active = (i === 0 && step === 'form') || (i === 1 && (step === 'questions' || step === 'import_pdf'));
          const done = i === 0 && (step === 'questions' || step === 'import_pdf');
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#10b981' : active ? '#0d9488' : '#e2e8f0',
                color: done || active ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
              }}>{done ? '✓' : i + 1}</div>
              <span style={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? '#0f172a' : '#94a3b8' }}>{label}</span>
              {i === 0 && <div style={{ width: 40, height: 2, background: (step === 'questions' || step === 'import_pdf') ? '#10b981' : '#e2e8f0', borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Assessment details */}
      {step === 'form' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{error}</div>}
          <form onSubmit={handleCreateAssessment} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={S.label}>Assessment Title *</label>
              <input
                style={!form.title.trim() && error ? S.inputError : S.input}
                type="text"
                placeholder="e.g. Quiz 1 — HTML Basics"
                value={form.title}
                required
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Type *</label>
                <select style={{ ...S.input, background: 'white' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="quiz">Quiz</option>
                  <option value="long_exam">Long Exam</option>
                  <option value="individual_activity">Individual Activity</option>
                  <option value="paper_based">📄 Paper-Based (Import quiz from PDF)</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Topic Tag</label>
                <input style={S.input} type="text" placeholder="e.g. html_basics" value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })} />
              </div>
            </div>

            <label style={S.label}>Instructions / description
              <textarea style={S.input} rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
            </label>
            <label style={S.label}>Linked lesson
              <select style={S.input} value={form.lesson_id} onChange={e => setForm({...form, lesson_id:e.target.value})}>
                <option value="">No linked lesson</option>
                {lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Assessment use</label>
                <select style={S.input} value={form.assessment_stage} onChange={e => setForm({ ...form, assessment_stage: e.target.value })}>
                  <option value="regular">Regular graded activity</option>
                  <option value="pre_test">Pre-test (stored, excluded from course grade)</option>
                  <option value="post_test">Post-test (stored, excluded from course grade)</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Passing score (%)</label>
                <input style={S.input} type="number" min="0" max="100" step="0.1" placeholder="Optional" value={form.passing_score} onChange={e => setForm({ ...form, passing_score: e.target.value })} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm({ ...form, shuffle_questions: e.target.checked })} />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>Randomize question order for each student attempt</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.allow_late_submissions} onChange={e => setForm({ ...form, allow_late_submissions: e.target.checked })} />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>Accept submissions after the due date</span>
            </label>
            {/* Total Points removed — auto-calculated from question points */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Time Limit (min)</label>
                <input style={S.input} type="number" min={1} placeholder="No limit" value={form.time_limit_minutes}
                  onChange={e => setForm({ ...form, time_limit_minutes: e.target.value })} />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Leave blank for no time limit.</p>
              </div>
              <div>
                <label style={S.label}>Max Attempts *</label>
                <input
                  style={!form.max_attempts && error ? S.inputError : S.input}
                  type="number"
                  min={1}
                  value={form.max_attempts}
                  required
                  onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, padding: '10px 14px', fontSize: '0.83rem', color: '#0f766e' }}>
              💡 Total points will be automatically calculated based on the points assigned to each question.
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={publishOnCompletion} disabled={Boolean(form.available_from)} onChange={e => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0d9488' }} />
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                {form.available_from ? 'Scheduled assessment — publishes automatically when you finish' : 'Publish when finished (visible to students)'}
              </span>
            </label>

            {/* Score Visibility */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                👁️ Score Visibility *
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { value: 'immediate', label: '✓ Show immediately', desc: 'Students see scores right after grading' },
                  { value: 'instructor_release', label: '🔒 Release manually', desc: 'You control when students see scores' },
                  { value: 'hidden', label: '🚫 Hide from students', desc: 'Students cannot see scores' }
                ].map(option => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '12px', border: `1.5px solid ${form.score_visibility === option.value ? '#0d9488' : '#e2e8f0'}`, borderRadius: 10, background: form.score_visibility === option.value ? '#f0fdfa' : 'white', transition: 'all 0.2s' }}>
                    <input 
                      type="radio" 
                      name="score_visibility" 
                      value={option.value}
                      checked={form.score_visibility === option.value}
                      onChange={e => setForm({ ...form, score_visibility: e.target.value })}
                      style={{ accentColor: '#0d9488', marginTop: 4, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{option.label}</p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Scheduling */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                📅 Schedule
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Available From</label>
                  <input style={S.input} type="datetime-local" value={form.available_from}
                    onChange={e => setForm({ ...form, available_from: e.target.value })} />
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>When students can start, in your local time. Setting this publishes automatically when you finish.</p>
                </div>
                <div>
                  <label style={S.label}>Due Date</label>
                  <input style={S.input} type="datetime-local" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Deadline for submissions.</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 14 }}>
                <input type="checkbox" checked={addToCalendar} onChange={e => setAddToCalendar(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0d9488' }} />
                <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                  Add due date to students' calendar
                </span>
              </label>
              {addToCalendar && !form.due_date && (
                <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: 6 }}>⚠ Set a due date above to add it to the calendar.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : assessmentId ? 'Save Changes →' : 'Create & Add Questions →'}
              </button>
              <button type="button" onClick={() => navigate(`/instructor/courses/${courseId}`)} style={S.btnGhost}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Questions */}
      {step === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc' }}>
            <strong>Build questions</strong>
            <p style={{ margin: '4px 0 16px', fontSize: 12, color: '#64748b' }}>Generate a reviewable draft from a lesson or reuse questions from earlier assessments in this course.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' }}>
                <div><strong style={{ fontSize: 13 }}>Question bank</strong><p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Choose earlier assessments and the total number of questions to reuse.</p></div>
                <button type="button" onClick={() => { setQuestionBankMessage(''); setShowQuestionBank(true); }} disabled={!assessmentId} style={{ ...S.btnGhost, borderColor: '#0d9488', color: '#0f766e' }}>Build from Question Bank</button>
                {questionBankMessage && <p role="status" style={{ color: '#0f766e', margin: 0, fontSize: 12 }}>{questionBankMessage}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' }}>
                <div><strong style={{ fontSize: 13 }}>Draft from lesson</strong><p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>AI uses readable lesson files. Review the questions and answers before saving.</p></div>
                <label style={{ fontSize: 12, color: '#334155' }}>Lesson to use
                  <select style={{ ...S.input, marginTop: 5, background: 'white' }} value={form.lesson_id} disabled={lessonSourceSaving || lessons.length === 0} onChange={e => handleLessonSourceChange(e.target.value)}>
                    <option value="">Choose a lesson…</option>
                    {lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, color: '#334155' }}>Questions
                  <input type="number" min="1" max="20" value={quizDraftCount} onChange={e => setQuizDraftCount(e.target.value)} style={{ ...S.input, width: 88, marginTop: 5 }} />
                </label>
                <button type="button" onClick={generateQuizDraft} disabled={quizDraftLoading || lessonSourceSaving || quizDraftRetrySeconds > 0 || !form.lesson_id || !assessmentId} style={{ ...S.btn, alignSelf: 'flex-start', opacity: quizDraftLoading || lessonSourceSaving || quizDraftRetrySeconds > 0 ? 0.65 : 1 }}>{lessonSourceSaving ? 'Saving lesson…' : quizDraftLoading ? 'Generating…' : quizDraftRetrySeconds > 0 ? `Try again in ${formatRetryTime(quizDraftRetrySeconds)}` : 'Generate Draft from Lesson'}</button>
                {quizDraftRetrySeconds > 0 && <span style={{ fontSize: 12, color: '#475569' }}>{quizDraftRetryEstimated ? 'Suggested retry in' : 'AI provider says retry in'} {formatRetryTime(quizDraftRetrySeconds)}{quizDraftRetryEstimated ? ' (estimate; the service may need longer).' : '.'}</span>}
                {lessonLoadError && <span role="alert" style={{ fontSize: 12, color: '#b91c1c' }}>{lessonLoadError} Refresh the page and try again.</span>}
                {!lessonLoadError && lessons.length === 0 && <span style={{ fontSize: 12, color: '#b45309' }}>There are no lessons in this course yet. Add a lesson first.</span>}
                {!form.lesson_id && lessons.length > 0 && <span style={{ fontSize: 12, color: '#b45309' }}>Choose a lesson above to enable AI question drafting.</span>}
                {quizDraftError && <p role="alert" style={{ color: '#b91c1c', margin: 0, fontSize: 12 }}>{quizDraftError}</p>}
              </div>
            </div>
          </div>
          {showQuestionBank && <TestBankBuilder courseId={courseId} assessmentId={assessmentId} onClose={() => setShowQuestionBank(false)} onImported={imported => {
            setSavedQuestions(previous => [...previous, ...imported]);
            setQuestionBankMessage(`${imported.length} question${imported.length === 1 ? '' : 's'} added from the question bank. They are saved to this draft assessment.`);
            setQError('');
            setShowQuestionBank(false);
          }} />}

          {pdfImport && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-900">Imported from {pdfImport.filename}</h3>
              <p className="text-sm text-slate-700">The questions below are copied from your PDF. Check all wording, choices, question types, answers and points. Headings and instructions were added to the assessment description, which you can edit.</p>
              <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">{pdfImport.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
              <details><summary className="cursor-pointer font-semibold text-sm text-teal-800">View extracted source text (instructor only)</summary>
                <pre className="mt-3 whitespace-pre-wrap break-words max-h-80 overflow-auto p-3 bg-white border border-teal-200 rounded-lg text-sm text-slate-800">{pdfImport.extracted_text}</pre>
              </details>
              {pdfImportPending && <label className="flex items-start gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={pdfImportReviewed} onChange={event => setPdfImportReviewed(event.target.checked)} className="mt-1 accent-teal-700" />
                I have checked the imported questions against the PDF and reviewed the answers and points.
              </label>}
            </div>
          )}

          {/* Saved questions summary */}
          {savedQuestions.length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1px solid #bbf7d0', padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#14532d', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ✓ {savedQuestions.length} Question{savedQuestions.length > 1 ? 's' : ''} Saved
                <span style={{ fontWeight: 500, color: '#166534', marginLeft: 10, fontSize: '0.85rem' }}>
                  · {savedQuestions.reduce((sum, q) => sum + parseFloat(q.points || 0), 0)} pts total
                </span>
              </h3>
              {savedQuestionError && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 12px' }}>{savedQuestionError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedQuestions.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #d1fae5' }}>
                    <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '0.85rem', minWidth: 24 }}>Q{i + 1}</span>
                    <span style={{ flex: '1 1 180px', fontSize: '0.875rem', color: '#0f172a' }}>{q.question_text}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 99 }}>{typeLabel[q.type]}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>{q.points} pts</span>
                    <button type="button" onClick={() => deleteSavedQuestion(q)} disabled={deletingQuestionId !== null || qSaving} aria-label={`Delete saved question ${i + 1}`} style={{ background: 'none', border: 'none', cursor: deletingQuestionId !== null || qSaving ? 'wait' : 'pointer', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, padding: '4px 0', opacity: (deletingQuestionId !== null && deletingQuestionId !== q.id) || qSaving ? 0.5 : 1 }}>{deletingQuestionId === q.id ? 'Deleting…' : 'Delete'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question builder */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                New Questions
              </h3>
            </div>

            {qError && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{qError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '0.9rem' }}>Question {savedQuestions.length + idx + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>Remove</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <textarea style={{ ...S.input, resize: 'none' }} rows={2} placeholder="Enter your question here..."
                      value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={S.label}>Question Type</label>
                        <select style={{ ...S.input, background: 'white' }} value={q.type}
                          onChange={e => updateQuestion(idx, 'type', e.target.value)}>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="essay">Essay</option>
                          <option value="matching">Matching</option>
                          <option value="enumeration">Enumeration (multiple answers)</option>
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>Points</label>
                        <input style={S.input} type="number" min={0.01} step={0.01}
                          value={q.points} onChange={e => updateQuestion(idx, 'points', e.target.value)} />
                      </div>
                    </div>

                    {/* Multiple choice options */}
                    {q.type === 'multiple_choice' && (
                      <div>
                        <label style={S.label}>Answer Choices</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {q.options.map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="radio" name={`correct-${idx}`} checked={q.correct_answer === opt && opt !== ''}
                                onChange={() => { if (opt.trim()) updateQuestion(idx, 'correct_answer', opt); }}
                                style={{ accentColor: '#0d9488', width: 16, height: 16, flexShrink: 0 }} title="Mark as correct answer" />
                              <input style={{ ...S.input, flex: 1 }} type="text" placeholder={`Option ${oi + 1}`}
                                value={opt} onChange={e => updateOption(idx, oi, e.target.value)} />
                              {q.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(idx, oi)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', padding: '0 4px' }}>✕</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addOption(idx)}
                            style={{ background: 'none', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                            + Add Option
                          </button>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>Click the radio button next to the correct answer.</p>
                      </div>
                    )}

                    {/* True/False */}
                    {q.type === 'true_false' && (
                      <div>
                        <label style={S.label}>Correct Answer</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {['True', 'False'].map(val => (
                            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 20px', border: `1.5px solid ${q.correct_answer === val ? '#0d9488' : '#e2e8f0'}`, borderRadius: 10, background: q.correct_answer === val ? '#f0fdfa' : 'white', fontWeight: 600, fontSize: '0.9rem', color: q.correct_answer === val ? '#0d9488' : '#475569' }}>
                              <input type="radio" name={`tf-${idx}`} value={val} checked={q.correct_answer === val}
                                onChange={() => updateQuestion(idx, 'correct_answer', val)} style={{ accentColor: '#0d9488' }} />
                              {val}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Short answer */}
                    {q.type === 'short_answer' && (
                      <div>
                        <label style={S.label}>Expected Answer (for auto-grading)</label>
                        <input style={S.input} type="text" placeholder="Exact answer (case-insensitive match)"
                          value={q.correct_answer} onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)} />
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>Leave blank if you want to grade manually.</p>
                      </div>
                    )}

                    {q.type === 'enumeration' && (
                      <div>
                        <label style={S.label}>Expected answers (one per line; partial credit per correct item)</label>
                        <textarea style={S.input} rows={3} placeholder={'First expected answer\nSecond expected answer'} value={q.correct_answer} onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)} />
                      </div>
                    )}

                    {q.type === 'essay' && (
                      <EssayQuestionFields question={q} onChange={patch => setQuestions(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item))} courseId={courseId} assessmentId={assessmentId} lessons={lessons} />
                    )}

                    {q.type === 'matching' && (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 8, borderRadius: '8px 8px 0 0', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                          <div style={{ padding: '8px 14px', background: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}>
                            <label style={{ ...S.label, margin: 0, fontSize: '0.8rem', color: '#475569' }}>Term</label>
                          </div>
                          <div style={{ padding: '8px 14px', background: '#f1f5f9' }}>
                            <label style={{ ...S.label, margin: 0, fontSize: '0.8rem', color: '#475569' }}>Definition</label>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                          {q.matching_pairs && q.matching_pairs.map((pair, pi) => (
                            <div key={pi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 0, borderTop: pi === 0 ? 'none' : '1px solid #e2e8f0', background: pi % 2 === 0 ? 'white' : '#fafafa' }}>
                              <input
                                style={{ ...S.input, borderRadius: 0, border: 'none', borderRight: '1px solid #e2e8f0', background: 'transparent' }}
                                type="text"
                                placeholder={`Term ${pi + 1}`}
                                value={pair.left_item}
                                onChange={e => updateMatchingPair(idx, pi, 'left_item', e.target.value)}
                              />
                              <input
                                style={{ ...S.input, borderRadius: 0, border: 'none', background: 'transparent' }}
                                type="text"
                                placeholder={`Definition ${pi + 1}`}
                                value={pair.right_item}
                                onChange={e => updateMatchingPair(idx, pi, 'right_item', e.target.value)}
                              />
                              {q.matching_pairs.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeMatchingPair(idx, pi)}
                                  style={{ background: 'none', border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', color: '#94a3b8', padding: '0 12px', fontSize: '1rem' }}
                                  title="Remove pair"
                                >✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addMatchingPair(idx)}
                          style={{ marginTop: 8, background: 'none', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, width: '100%' }}
                        >
                          + Add Row
                        </button>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6, background: '#f8fafc', padding: '8px 12px', borderRadius: 6 }}>
                          💡 Students will match each term to its correct definition. Grading is automatic.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={addQuestion}
                style={{ background: '#f0fdf4', color: '#0d9488', border: '1.5px dashed #6ee7b7', borderRadius: 10, padding: '11px 24px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                + Add Another Question
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button onClick={handleSaveQuestions} disabled={qSaving}
                style={{ ...S.btn, opacity: qSaving ? 0.7 : 1 }}>
                {qSaving ? 'Saving...' : '✓ Save Questions'}
              </button>
            </div>
          </div>

          {/* Done */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleFinish} disabled={finishing || qSaving} style={S.btn}>
              {finishing ? 'Saving...' : '✓ Done — Back to Course'}
            </button>
            <button onClick={() => setStep('form')} style={S.btnGhost}>
              ← Edit Assessment Details
            </button>
          </div>
        </div>
      )}

      {step === 'import_pdf' && (
        <div className="space-y-4">
          <PdfQuizImport courseId={courseId} assessmentId={assessmentId} onImported={handlePdfImported} />
          <button type="button" onClick={() => setStep('form')} style={S.btnGhost}>Edit Assessment Details</button>
        </div>
      )}
    </div>
  );
}
