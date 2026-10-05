import { useState } from 'react';
import api from '../services/api';
import { rubricError } from '../services/rubric';

const input = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', color: '#0f172a', fontSize: 13 };
const button = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13 };

function levels(max) {
  return [
    ['Beginning', 0, 0.49, 'Little or no demonstration of this criterion.'],
    ['Developing', 0.49, 0.69, 'Partial demonstration with significant gaps.'],
    ['Proficient', 0.69, 0.89, 'Mostly meets the criterion with minor gaps.'],
    ['Excellent', 0.89, 1, 'Fully and accurately meets this criterion.'],
  ].map(([label, low, high, description]) => ({ label, description, min_points: +(max * low).toFixed(2), max_points: +(max * high).toFixed(2) }));
}

export default function RubricEditor({ value, onChange, question, courseId, assessmentId, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [objective, setObjective] = useState('');
  const [instructions, setInstructions] = useState('');
  const change = (next) => onChange({ ...next, total_points: Number(question.points) });
  const update = (index, patch) => change({ ...value, criteria: value.criteria.map((c, i) => i === index ? { ...c, ...patch } : c) });
  const updateLevel = (ci, li, patch) => update(ci, { levels: value.criteria[ci].levels.map((l, i) => i === li ? { ...l, ...patch } : l) });
  const move = (index, offset) => {
    const criteria = [...value.criteria];
    [criteria[index], criteria[index + offset]] = [criteria[index + offset], criteria[index]];
    change({ ...value, criteria });
  };
  const template = () => {
    const specs = [
      ['Content Accuracy', 25, 'Accurately explains the concepts relevant to the question in the reference.'],
      ['Use of Source Evidence', 25, 'Uses specific, relevant evidence from the attached source and connects it to claims.'],
      ['Analysis / Reasoning', 20, 'Explains reasoning and connections required by the question.'],
      ['Completeness', 15, 'Addresses exactly the requested scope and number of examples; no extra requirements.'],
      ['Organization', 10, 'Presents a coherent, logically ordered response.'],
      ['Grammar / Clarity', 5, 'Communicates clearly with understandable language.'],
    ];
    let remaining = Math.round(Number(question.points) * 100);
    const criteria = specs.map(([criterion, weight, description], i) => {
      const cents = i === specs.length - 1 ? remaining : Math.floor(Number(question.points) * weight);
      remaining -= cents;
      return { criterion, description, max_points: cents / 100, levels: levels(cents / 100) };
    });
    change({ title: 'Essay Grading Rubric', source: 'manual', criteria });
  };
  const generate = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/courses/${courseId}/assessments/${assessmentId}/rubric/generate`, {
        question_text: question.question_text, points: Number(question.points),
        reference_text: question.reference_text || null, reference_lesson_id: question.reference_lesson_id || null,
        instructions, learning_objective: objective,
      });
      change(data.rubric);
      if (data.reference_truncated) setError('The source is longer than the supported limit. Review the rubric against the full document before saving.');
    } catch (err) { setError(err.response?.data?.message || 'Could not generate a rubric.'); }
    finally { setBusy(false); }
  };
  const validation = rubricError(value, question.points);
  const total = value?.criteria?.reduce((sum, c) => sum + Number(c.max_points || 0), 0) || 0;

  return (
    <fieldset disabled={disabled || busy} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, color: '#334155', background: '#f8fafc', minWidth: 0 }}>
      <legend style={{ fontWeight: 700, padding: '0 6px' }}>Grading Rubric</legend>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <button type="button" style={button} onClick={() => change({ title: 'Essay Grading Rubric', source: 'manual', criteria: [{ criterion: '', description: '', max_points: Number(question.points), levels: levels(Number(question.points)) }] })}>Create Rubric Manually</button>
        <button type="button" style={{ ...button, background: '#166534', color: '#fff' }} onClick={generate}>{busy ? 'Generating...' : value?.source === 'ai_generated' ? 'Regenerate Rubric with AI' : 'Generate Rubric with AI'}</button>
        <button type="button" style={button} onClick={template}>Use Default Template</button>
      </div>
      <details style={{ marginBottom: 10, fontSize: 13 }}>
        <summary>Optional instructions and learning objective for AI generation</summary>
        <label>Instructions<textarea style={input} value={instructions} onChange={e => setInstructions(e.target.value)} /></label>
        <label>Learning objective<input style={input} value={objective} onChange={e => setObjective(e.target.value)} /></label>
      </details>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {value && <>
        <p style={{ fontSize: 12 }}>Review and edit this rubric. It becomes active only when you save the question or rubric.</p>
        <label style={{ fontSize: 13 }}>Rubric title<input style={input} value={value.title || ''} onChange={e => change({ ...value, title: e.target.value })} /></label>
        <p style={{ fontWeight: 700, color: validation ? '#b91c1c' : '#166534' }}>Total: {total.toFixed(2)} / {Number(question.points).toFixed(2)}</p>
        {value.criteria.map((c, ci) => (
          <div key={ci} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <strong style={{ flex: 1 }}>Criterion {ci + 1}</strong>
              <button type="button" style={button} disabled={ci === 0} aria-label="Move criterion up" onClick={() => move(ci, -1)}>↑</button>
              <button type="button" style={button} disabled={ci === value.criteria.length - 1} aria-label="Move criterion down" onClick={() => move(ci, 1)}>↓</button>
              <button type="button" style={button} onClick={() => change({ ...value, criteria: value.criteria.filter((_, i) => i !== ci) })}>Remove</button>
            </div>
            <label>Name<input style={input} value={c.criterion} onChange={e => update(ci, { criterion: e.target.value })} /></label>
            <label>Description<textarea style={input} value={c.description} onChange={e => update(ci, { description: e.target.value })} /></label>
            <label>Maximum points<input type="number" min="0.01" step="0.01" style={input} value={c.max_points} onChange={e => update(ci, { max_points: e.target.value })} /></label>
            <details open style={{ marginTop: 10 }}>
              <summary>Performance levels</summary>
              {(c.levels || []).map((l, li) => (
                <div key={li} style={{ borderLeft: '3px solid #cbd5e1', paddingLeft: 10, marginTop: 10 }}>
                  <label>Label<input style={input} value={l.label} onChange={e => updateLevel(ci, li, { label: e.target.value })} /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label>From<input type="number" min="0" step="0.01" style={input} value={l.min_points} onChange={e => updateLevel(ci, li, { min_points: e.target.value })} /></label>
                    <label>To<input type="number" min="0" step="0.01" style={input} value={l.max_points} onChange={e => updateLevel(ci, li, { max_points: e.target.value })} /></label>
                  </div>
                  <label>Description<textarea style={input} value={l.description} onChange={e => updateLevel(ci, li, { description: e.target.value })} /></label>
                  <button type="button" style={button} onClick={() => update(ci, { levels: c.levels.filter((_, i) => i !== li) })}>Remove level</button>
                </div>
              ))}
              <button type="button" style={button} onClick={() => update(ci, { levels: [...(c.levels || []), { label: '', description: '', min_points: 0, max_points: c.max_points }] })}>Add level</button>
            </details>
          </div>
        ))}
        <button type="button" style={button} onClick={() => change({ ...value, criteria: [...value.criteria, { criterion: '', description: '', max_points: 1, levels: levels(1) }] })}>Add criterion</button>
        <button type="button" style={{ ...button, marginLeft: 8 }} onClick={() => onChange(null)}>Remove rubric from draft</button>
        {validation && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{validation}</p>}
      </>}
    </fieldset>
  );
}
