import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ── Inline question editor (for published assessments) ──────────────────────
function EditQuestionModal({ question, courseId, assessmentId, onClose, onSaved }) {
  const [form, setForm] = useState({
    question_text: question.question_text || '',
    type: question.type || 'multiple_choice',
    points: question.points || '',
    correct_answer: question.correct_answer || '',
    options: Array.isArray(question.options)
      ? [...question.options]
      : question.options
        ? Object.values(question.options)
        : ['', '', '', ''],
    matching_pairs: question.matching_pairs?.length
      ? question.matching_pairs.map(p => ({ left_item: p.left_item, right_item: p.right_item }))
      : [{ left_item: '', right_item: '' }, { left_item: '', right_item: '' }],
    reference_lesson_id: question.reference_lesson_id || '',
    reference_text: question.reference_text || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    api.get(`/courses/${courseId}/lessons`)
      .then(res => setLessons(res.data.lessons || []))
      .catch(() => {});
  }, [courseId]);

  const updatePair = (pi, field, val) => {
    const pairs = [...form.matching_pairs];
    pairs[pi] = { ...pairs[pi], [field]: val };
    setForm(f => ({ ...f, matching_pairs: pairs }));
  };
  const addPair = () => setForm(f => ({ ...f, matching_pairs: [...f.matching_pairs, { left_item: '', right_item: '' }] }));
  const removePair = (pi) => {
    if (form.matching_pairs.length <= 2) return;
    setForm(f => ({ ...f, matching_pairs: f.matching_pairs.filter((_, i) => i !== pi) }));
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        question_text: form.question_text,
        type: form.type,
        points: parseFloat(form.points),
      };
      if (form.type === 'multiple_choice') {
        payload.options = form.options.filter(o => o.trim() !== '');
        payload.correct_answer = form.correct_answer;
      } else if (form.type === 'true_false') {
        payload.options = ['True', 'False'];
        payload.correct_answer = form.correct_answer;
      } else if (form.type === 'short_answer') {
        payload.correct_answer = form.correct_answer;
      } else if (form.type === 'essay') {
        if (form.reference_lesson_id) payload.reference_lesson_id = form.reference_lesson_id;
        if (form.reference_text) payload.reference_text = form.reference_text;
      } else if (form.type === 'matching') {
        payload.matching_pairs = form.matching_pairs.map(p => ({
          left_item: p.left_item,
          right_item: p.right_item,
          correct_match: p.right_item,
        }));
      }
      await api.put(`/courses/${courseId}/assessments/${assessmentId}/questions/${question.id}`, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">Edit Question</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Question Text</label>
            <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
              <select style={{ ...inputStyle, background: 'white' }} value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
                <option value="matching">Matching</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Points</label>
              <input type="number" min={1} step={1} style={inputStyle}
                value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
            </div>
          </div>

          {/* Multiple choice */}
          {form.type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Options (select correct)</label>
              <div className="space-y-2">
                {form.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name="edit-correct" checked={form.correct_answer === opt && opt !== ''}
                      onChange={() => { if (opt.trim()) setForm(f => ({ ...f, correct_answer: opt })); }}
                      style={{ accentColor: '#0d9488', flexShrink: 0 }} />
                    <input type="text" style={{ ...inputStyle, flex: 1 }} value={opt}
                      onChange={e => {
                        const opts = [...form.options]; opts[oi] = e.target.value;
                        setForm(f => ({ ...f, options: opts }));
                      }} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Click the radio button to mark the correct answer.</p>
            </div>
          )}

          {/* True/False */}
          {form.type === 'true_false' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correct Answer</label>
              <div className="flex gap-3">
                {['True', 'False'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 18px', border: `1.5px solid ${form.correct_answer === v ? '#0d9488' : '#e2e8f0'}`, borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', color: form.correct_answer === v ? '#0d9488' : '#475569', background: form.correct_answer === v ? '#f0fdfa' : 'white' }}>
                    <input type="radio" name="edit-tf" value={v} checked={form.correct_answer === v}
                      onChange={() => setForm(f => ({ ...f, correct_answer: v }))}
                      style={{ accentColor: '#0d9488' }} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Short answer */}
          {form.type === 'short_answer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expected Answer</label>
              <input type="text" style={inputStyle} placeholder="Leave blank to grade manually"
                value={form.correct_answer} onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))} />
            </div>
          )}

          {/* Essay */}
          {form.type === 'essay' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">Essay questions are graded by AI. Set a reference material below (optional).</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">📚 Reference Lesson</label>
                <select style={{ ...inputStyle, background: 'white' }}
                  value={form.reference_lesson_id || ''}
                  onChange={e => setForm(f => ({ ...f, reference_lesson_id: e.target.value }))}>
                  <option value="">— Use all course materials (default) —</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>Lesson {l.order + 1}: {l.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">📎 Or upload reference file</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Create FormData and upload file
                        const formData = new FormData();
                        formData.append('reference_file', file);
                        
                        // Upload and extract text
                        api.post(`/courses/${courseId}/upload-reference-text`, formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        })
                        .then(res => {
                          if (res.data.extracted_text) {
                            setForm(f => ({ ...f, reference_text: res.data.extracted_text }));
                          }
                        })
                        .catch(err => {
                          console.error('File upload failed:', err);
                          alert('File upload failed. Please try again.');
                        });
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                      cursor-pointer"
                  />
                  {form.reference_text && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border">
                      <strong>Extracted text preview:</strong>
                      <div className="mt-1 max-h-24 overflow-y-auto text-xs text-slate-500">
                        {form.reference_text.substring(0, 200)}
                        {form.reference_text.length > 200 && '...'}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Upload PDF/DOC to extract text for AI grading. Takes priority over lesson reference above.</p>
              </div>
            </div>
          )}

          {/* Matching pairs */}
          {form.type === 'matching' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Matching Pairs</label>
              {/* Column headers */}
              <div className="grid grid-cols-2 gap-0 rounded-t-lg overflow-hidden border border-slate-200">
                <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500 border-r border-slate-200">Term</div>
                <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500">Definition</div>
              </div>
              <div className="border border-t-0 border-slate-200 rounded-b-lg overflow-hidden">
                {form.matching_pairs.map((pair, pi) => (
                  <div key={pi} className={`grid gap-0 ${form.matching_pairs.length > 2 ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-2'} ${pi > 0 ? 'border-t border-slate-100' : ''}`}>
                    <input type="text" style={{ ...inputStyle, borderRadius: 0, border: 'none', borderRight: '1px solid #e2e8f0' }}
                      placeholder={`Term ${pi + 1}`} value={pair.left_item}
                      onChange={e => updatePair(pi, 'left_item', e.target.value)} />
                    <input type="text" style={{ ...inputStyle, borderRadius: 0, border: 'none' }}
                      placeholder={`Definition ${pi + 1}`} value={pair.right_item}
                      onChange={e => updatePair(pi, 'right_item', e.target.value)} />
                    {form.matching_pairs.length > 2 && (
                      <button type="button" onClick={() => removePair(pi)}
                        style={{ border: 'none', borderLeft: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 10px' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addPair}
                className="w-full mt-2 border-2 border-dashed border-slate-300 rounded-xl p-2 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors">
                + Add Row
              </button>
              <p className="text-xs text-slate-400 mt-1.5 bg-slate-50 p-2 rounded-lg">💡 Students will match each term to its definition. Grading is automatic.</p>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="bg-slate-100 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Question Form ────────────────────────────────────────────────────────
function newBlankQ() {
  return { question_text: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', points: 1,
    matching_pairs: [{ left_item: '', right_item: '' }, { left_item: '', right_item: '' }],
    reference_lesson_id: '', reference_text: '' };
}

function AddQuestionForm({ courseId, assessmentId, onSuccess, onClose }) {
  const [questions, setQuestions] = useState([newBlankQ()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    api.get(`/courses/${courseId}/lessons`)
      .then(res => setLessons(res.data.lessons || []))
      .catch(() => {});
  }, [courseId]);

  const updateQ = (i, f, v) => setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [f]: v } : q));
  const updateOpt = (qi, oi, v) => setQuestions(p => p.map((q, i) => {
    if (i !== qi) return q; const o = [...q.options]; o[oi] = v; return { ...q, options: o };
  }));
  const updatePair = (qi, pi, field, v) => setQuestions(p => p.map((q, i) => {
    if (i !== qi) return q;
    const pairs = [...q.matching_pairs]; pairs[pi] = { ...pairs[pi], [field]: v }; return { ...q, matching_pairs: pairs };
  }));
  const addPair = (qi) => setQuestions(p => p.map((q, i) => i === qi ? { ...q, matching_pairs: [...q.matching_pairs, { left_item: '', right_item: '' }] } : q));
  const removePair = (qi, pi) => setQuestions(p => p.map((q, i) => {
    if (i !== qi || q.matching_pairs.length <= 2) return q;
    return { ...q, matching_pairs: q.matching_pairs.filter((_, idx) => idx !== pi) };
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const cleaned = questions.map(q => {
        const out = { ...q, points: parseFloat(q.points) };
        if (q.type === 'essay') { 
          delete out.options; 
          delete out.correct_answer; 
          delete out.matching_pairs;
          if (!out.reference_lesson_id) delete out.reference_lesson_id;
          if (!out.reference_text) delete out.reference_text;
        }
        else if (q.type === 'short_answer') { delete out.options; delete out.matching_pairs; }
        else if (q.type === 'true_false') { out.options = ['True', 'False']; delete out.matching_pairs; }
        else if (q.type === 'matching') { 
          delete out.options; 
          delete out.correct_answer;
          out.matching_pairs = q.matching_pairs.map(p => ({
            left_item: p.left_item,
            right_item: p.right_item,
            correct_match: p.right_item,
          }));
        }
        else { out.options = out.options.filter(o => o.trim() !== ''); delete out.matching_pairs; }
        return out;
      });
      await api.post(`/courses/${courseId}/assessments/${assessmentId}/questions/bulk`, { questions: cleaned });
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const IS = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' };

  return (
    <div className="bg-white rounded-xl border border-teal-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm">Add New Question(s)</h3>
      {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Question {idx + 1}</span>
              {questions.length > 1 && <button type="button" onClick={() => setQuestions(p => p.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
            </div>
            <textarea rows={2} placeholder="Question text" required value={q.question_text}
              onChange={e => updateQ(idx, 'question_text', e.target.value)}
              style={{ ...IS, resize: 'vertical' }} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select style={IS} value={q.type} onChange={e => updateQ(idx, 'type', e.target.value)}>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay</option>
                  <option value="matching">Matching</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Points</label>
                <input type="number" min={1} step={1} required placeholder="e.g. 10" value={q.points}
                  onChange={e => updateQ(idx, 'points', e.target.value)} style={IS} />
              </div>
            </div>

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Options (click radio = correct answer)</label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${idx}`} checked={q.correct_answer === opt && opt !== ''}
                      onChange={() => { if (opt.trim()) updateQ(idx, 'correct_answer', opt); }}
                      style={{ accentColor: '#0d9488', flexShrink: 0 }} />
                    <input type="text" placeholder={`Option ${oi + 1}`} value={opt}
                      onChange={e => updateOpt(idx, oi, e.target.value)} style={{ ...IS, flex: 1 }} />
                  </div>
                ))}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="flex gap-3">
                {['True', 'False'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 16px', border: `1.5px solid ${q.correct_answer === v ? '#0d9488' : '#e2e8f0'}`, borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', color: q.correct_answer === v ? '#0d9488' : '#475569', background: q.correct_answer === v ? '#f0fdfa' : 'white' }}>
                    <input type="radio" name={`tf-${idx}`} value={v} checked={q.correct_answer === v}
                      onChange={() => updateQ(idx, 'correct_answer', v)} style={{ accentColor: '#0d9488' }} />
                    {v}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'short_answer' && (
              <input type="text" placeholder="Expected answer (leave blank to grade manually)"
                value={q.correct_answer} onChange={e => updateQ(idx, 'correct_answer', e.target.value)} style={IS} />
            )}
            {q.type === 'essay' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200">Essay questions are graded by AI. Set a reference material below (optional).</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">📚 Reference Lesson</label>
                  <select style={{ ...IS, background: 'white' }}
                    value={q.reference_lesson_id || ''}
                    onChange={e => updateQ(idx, 'reference_lesson_id', e.target.value)}>
                    <option value="">— Use all course materials (default) —</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>Lesson {l.order + 1}: {l.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">📝 Or paste reference text</label>
                  <textarea rows={3} style={{ ...IS, resize: 'vertical' }}
                    placeholder="Paste text the AI should use to grade this question..."
                    value={q.reference_text || ''}
                    onChange={e => updateQ(idx, 'reference_text', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-0.5">Takes priority over the lesson reference.</p>
                </div>
              </div>
            )}
            {q.type === 'matching' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Matching Pairs</label>
                <div className="grid grid-cols-2 gap-0 rounded-t-lg overflow-hidden border border-slate-200">
                  <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500 border-r border-slate-200">Term</div>
                  <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500">Definition</div>
                </div>
                <div className="border border-t-0 border-slate-200 rounded-b-lg overflow-hidden">
                  {q.matching_pairs.map((pair, pi) => (
                    <div key={pi} className={`grid gap-0 ${q.matching_pairs.length > 2 ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-2'} ${pi > 0 ? 'border-t border-slate-100' : ''}`}>
                      <input type="text" style={{ ...IS, borderRadius: 0, border: 'none', borderRight: '1px solid #e2e8f0' }}
                        placeholder={`Term ${pi + 1}`} value={pair.left_item}
                        onChange={e => updatePair(idx, pi, 'left_item', e.target.value)} />
                      <input type="text" style={{ ...IS, borderRadius: 0, border: 'none' }}
                        placeholder={`Definition ${pi + 1}`} value={pair.right_item}
                        onChange={e => updatePair(idx, pi, 'right_item', e.target.value)} />
                      {q.matching_pairs.length > 2 && (
                        <button type="button" onClick={() => removePair(idx, pi)}
                          style={{ border: 'none', borderLeft: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 10px' }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addPair(idx)}
                  className="w-full mt-2 border-2 border-dashed border-slate-300 rounded-xl p-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  + Add Row
                </button>
                <p className="text-xs text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg">💡 Students match each term to its definition. Grading is automatic.</p>
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={() => setQuestions(p => [...p, newBlankQ()])}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          + Add Another Question
        </button>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : `Save ${questions.length} Question${questions.length > 1 ? 's' : ''}`}
          </button>
          <button type="button" onClick={onClose}
            className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

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
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

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
          {/* Add Question button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddQuestion(v => !v)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              {showAddQuestion ? '✕ Cancel' : '+ Add Question'}
            </button>
          </div>

          {/* Inline add question form */}
          {showAddQuestion && (
            <AddQuestionForm
              courseId={courseId}
              assessmentId={assessmentId}
              onSuccess={() => { setShowAddQuestion(false); fetchAll(); }}
              onClose={() => setShowAddQuestion(false)}
            />
          )}

          {(!assessment.questions || assessment.questions.length === 0) ? (
            <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              No questions yet. Click "+ Add Question" above to get started.
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
                  <button onClick={() => setEditingQuestion(q)}
                    className="text-xs text-teal-500 hover:text-teal-700 shrink-0">Edit</button>
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

      {/* Edit Question Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          courseId={courseId}
          assessmentId={assessmentId}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => { setEditingQuestion(null); fetchAll(); }}
        />
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
