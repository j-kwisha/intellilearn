import { useEffect, useState } from 'react';
import api from '../services/api';

export default function TestBankBuilder({ courseId, assessmentId, onClose, onImported }) {
  const [sources, setSources] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/courses/${courseId}/test-bank/sources`)
      .then(response => setSources((response.data.assessments || []).filter(item => item.id !== Number(assessmentId))))
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load reusable questions.'))
      .finally(() => setLoading(false));
  }, [courseId, assessmentId]);

  const selectedTotal = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const importQuestions = async () => {
    const selections = Object.entries(counts)
      .filter(([, count]) => Number(count) > 0)
      .map(([id, count]) => ({ assessment_id: Number(id), count: Number(count) }));
    if (!selections.length) { setError('Choose at least one question from another assessment.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await api.post(`/courses/${courseId}/assessments/${assessmentId}/question-bank`, { sources: selections });
      onImported(response.data.questions || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || Object.values(requestError.response?.data?.errors || {}).flat().join(' ') || 'Could not add the selected questions.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="question-bank-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div><h2 id="question-bank-title" className="text-lg font-bold">Build from question bank</h2><p className="mt-1 text-sm text-slate-500">Randomly select objective questions from other assessments in this course. Essay questions are excluded.</p></div>
        <button type="button" onClick={onClose} aria-label="Close question bank" className="text-slate-500">✕</button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading assessments…</p> : <div className="max-h-80 space-y-2 overflow-y-auto">
        {sources.map(source => <label key={source.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
          <span><span className="block text-sm font-medium">{source.title}</span><span className="text-xs text-slate-500">{source.eligible_question_count} reusable objective questions</span></span>
          <input aria-label={`Questions from ${source.title}`} type="number" min="0" max={source.eligible_question_count} disabled={!source.eligible_question_count} value={counts[source.id] || ''}
            onChange={event => setCounts(current => ({ ...current, [source.id]: Math.min(Number(event.target.value) || 0, source.eligible_question_count) }))}
            className="w-24 rounded-md border border-slate-300 px-3 py-2" />
        </label>)}
        {sources.length === 0 && <p className="text-sm text-slate-500">No other assessments are available in this course yet.</p>}
      </div>}
      <div className="flex items-center justify-between border-t pt-4"><span className="text-sm font-semibold">Total selected: {selectedTotal}</span><div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
        <button type="button" disabled={saving || loading || selectedTotal === 0} onClick={importQuestions} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Adding…' : 'Add selected questions'}</button>
      </div></div>
    </div>
  </div>;
}
