import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function InstructorCreateAssessmentPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState('form'); // 'form' | 'questions'
  const [assessmentId, setAssessmentId] = useState(null);
  const [assessmentTitle, setAssessmentTitle] = useState('');

  // Assessment form
  const [form, setForm] = useState({
    title: '', type: 'quiz', topic: '',
    total_points: 100, time_limit_minutes: '', max_attempts: 1, is_published: true,
    available_from: '', due_date: '',
  });
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Questions
  const [questions, setQuestions] = useState([newQuestion()]);
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState('');
  const [savedQuestions, setSavedQuestions] = useState([]);

  function newQuestion() {
    return { question_text: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', points: '' };
  }

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const data = { ...form };
      if (!data.time_limit_minutes) delete data.time_limit_minutes;
      if (!data.available_from) delete data.available_from;
      if (!data.due_date) delete data.due_date;
      const res = await api.post(`/courses/${courseId}/assessments`, data);
      const created = res.data.assessment;
      setAssessmentId(created.id);
      setAssessmentTitle(created.title);

      // Add to student calendars if toggled
      if (addToCalendar && form.due_date) {
        await api.post(`/courses/${courseId}/calendar`, {
          title: `📝 ${created.title}`,
          event_type: form.type === 'long_exam' ? 'exam' : 'quiz',
          start_date: form.due_date,
          description: `${form.type.replace(/_/g, ' ')} — ${form.total_points} pts`,
          color: form.type === 'long_exam' ? '#ef4444' : '#f59e0b',
        });
      }

      setStep('questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assessment.');
    } finally {
      setSaving(false);
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
      return { ...q, options: opts };
    }));
  };

  const addOption = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const removeOption = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.filter((_, oi) => oi !== optIdx) };
    }));
  };

  const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);
  const removeQuestion = (idx) => { if (questions.length > 1) setQuestions(prev => prev.filter((_, i) => i !== idx)); };

  const handleSaveQuestions = async () => {
    setQSaving(true); setQError('');
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { setQError(`Question ${i + 1} is missing the question text.`); setQSaving(false); return; }
      if (!q.points || parseFloat(q.points) <= 0) { setQError(`Question ${i + 1} needs a valid points value.`); setQSaving(false); return; }
      if (q.type === 'multiple_choice') {
        const filled = q.options.filter(o => o.trim() !== '');
        if (filled.length < 2) { setQError(`Question ${i + 1}: Multiple choice needs at least 2 options.`); setQSaving(false); return; }
        if (!q.correct_answer.trim()) { setQError(`Question ${i + 1}: Please select the correct answer.`); setQSaving(false); return; }
      }
      if (q.type === 'true_false' && !q.correct_answer) { setQError(`Question ${i + 1}: Please select True or False as the answer.`); setQSaving(false); return; }
    }

    try {
      const cleaned = questions.map(q => {
        const out = { ...q, points: parseFloat(q.points) };
        if (q.type === 'essay') { delete out.options; delete out.correct_answer; }
        else if (q.type === 'short_answer') { delete out.options; }
        else if (q.type === 'true_false') { out.options = ['True', 'False']; }
        else { out.options = q.options.filter(o => o.trim() !== ''); }
        return out;
      });
      const res = await api.post(`/courses/${courseId}/assessments/${assessmentId}/questions/bulk`, { questions: cleaned });
      setSavedQuestions(prev => [...prev, ...res.data.questions]);
      setQuestions([newQuestion()]);
    } catch (err) {
      setQError(err.response?.data?.message || 'Failed to save questions.');
    } finally {
      setQSaving(false);
    }
  };

  const S = {
    input: {
      width: '100%', padding: '11px 14px',
      border: '1.5px solid #e2e8f0', borderRadius: '10px',
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

  const typeLabel = { multiple_choice: 'Multiple Choice', true_false: 'True / False', short_answer: 'Short Answer', essay: 'Essay' };

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
        {['Assessment Details', 'Add Questions'].map((label, i) => {
          const active = (i === 0 && step === 'form') || (i === 1 && step === 'questions');
          const done = i === 0 && step === 'questions';
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
              {i === 0 && <div style={{ width: 40, height: 2, background: step === 'questions' ? '#10b981' : '#e2e8f0', borderRadius: 2 }} />}
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
              <input style={S.input} type="text" placeholder="e.g. Quiz 1 — HTML Basics" value={form.title} required
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Type *</label>
                <select style={{ ...S.input, background: 'white' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="quiz">Quiz</option>
                  <option value="long_exam">Long Exam</option>
                  <option value="individual_activity">Individual Activity</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Topic Tag</label>
                <input style={S.input} type="text" placeholder="e.g. html_basics" value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={S.label}>Total Points</label>
                <input style={S.input} type="number" min={1} value={form.total_points}
                  onChange={e => setForm({ ...form, total_points: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={S.label}>Time Limit (min)</label>
                <input style={S.input} type="number" min={1} placeholder="No limit" value={form.time_limit_minutes}
                  onChange={e => setForm({ ...form, time_limit_minutes: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Max Attempts</label>
                <input style={S.input} type="number" min={1} value={form.max_attempts}
                  onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) })} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0d9488' }} />
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>Publish immediately (visible to students)</span>
            </label>

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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>When students can start taking this.</p>
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
                {saving ? 'Creating...' : 'Create & Add Questions →'}
              </button>
              <button type="button" onClick={() => navigate(`/instructor/courses/${courseId}`)} style={S.btnGhost}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Questions */}
      {step === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Saved questions summary */}
          {savedQuestions.length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: 16, border: '1px solid #bbf7d0', padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#14532d', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ✓ {savedQuestions.length} Question{savedQuestions.length > 1 ? 's' : ''} Saved
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedQuestions.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 8, padding: '10px 14px', border: '1px solid #d1fae5' }}>
                    <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '0.85rem', minWidth: 24 }}>Q{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem', color: '#0f172a' }}>{q.question_text}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 99 }}>{typeLabel[q.type]}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>{q.points} pts</span>
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
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>Points</label>
                        <input style={S.input} type="number" min={0.01} step={0.5} placeholder="e.g. 10"
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

                    {q.type === 'essay' && (
                      <p style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, margin: 0 }}>
                        Essay questions are graded manually by the instructor.
                      </p>
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
            <button onClick={() => navigate(`/instructor/courses/${courseId}`)} style={S.btn}>
              ✓ Done — Back to Course
            </button>
            <button onClick={() => setStep('form')} style={S.btnGhost}>
              ← Edit Assessment Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
