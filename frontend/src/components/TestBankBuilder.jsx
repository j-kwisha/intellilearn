import { useEffect, useState } from 'react';
import api from '../services/api';

export default function TestBankBuilder({ courseId, assessmentId, onClose, onImported }) {
  const [sources, setSources] = useState([]);
  const [requestedTotal, setRequestedTotal] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/courses/${courseId}/test-bank/sources`)
      .then(response => setSources((response.data.assessments || []).filter(item => item.id !== Number(assessmentId))))
      .catch(requestError => setError(requestError.response?.data?.message || 'Could not load reusable questions.'))
      .finally(() => setLoading(false));
  }, [courseId, assessmentId]);

  const bankSources = sources.filter(source => Number(source.eligible_question_count) > 0).slice(0, 10);
  const availableTotal = bankSources.reduce((sum, source) => sum + Math.min(50, Math.max(0, Number(source.eligible_question_count) || 0)), 0);
  const selectedTotal = Math.min(Math.max(0, Number(requestedTotal) || 0), availableTotal);
  const allocation = (() => {
    const result = bankSources.map(source => ({
      assessment_id: Number(source.id),
      title: source.title,
      available: Math.min(50, Math.max(0, Number(source.eligible_question_count) || 0)),
      count: 0,
    })).filter(source => source.available > 0);
    let remaining = selectedTotal;
    while (remaining > 0) {
      let placed = false;
      for (const source of result) {
        if (remaining === 0) break;
        if (source.count < source.available) {
          source.count += 1;
          remaining -= 1;
          placed = true;
        }
      }
      if (!placed) break;
    }
    return result;
  })();

  const importQuestions = async () => {
    const selections = allocation.filter(source => source.count > 0)
      .map(({ assessment_id, count }) => ({ assessment_id, count }));
    if (!selections.length) { setError('Enter how many questions you need.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await api.post(`/courses/${courseId}/assessments/${assessmentId}/question-bank`, { sources: selections });
      onImported(response.data.questions || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || Object.values(requestError.response?.data?.errors || {}).flat().join(' ') || 'Could not add questions from the bank.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="question-bank-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div><h2 id="question-bank-title" className="text-lg font-bold">Build from question bank</h2><p className="mt-1 text-sm text-slate-500">Choose a total. Questions are spread across earlier assessments, with a random selection from each. Essay questions are excluded.</p></div>
        <button type="button" onClick={onClose} aria-label="Close question bank" className="text-slate-500">×</button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading assessments…</p> : <>
        <label className="block text-sm font-medium">Total questions needed
          <input aria-label="Total questions needed" type="number" min="1" max={Math.max(1, availableTotal)} value={requestedTotal}
            onChange={event => setRequestedTotal(event.target.value)} className="ml-3 w-28 rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <p className="text-xs text-slate-500">Up to {availableTotal} eligible questions can be selected across {bankSources.length} assessments.</p>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {allocation.map(source => <div key={source.assessment_id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <span><span className="block text-sm font-medium">{source.title}</span><span className="text-xs text-slate-500">{source.available} eligible questions available</span></span>
            <span className="text-sm font-semibold text-teal-700">{source.count} selected</span>
          </div>)}
          {sources.length === 0 && <p className="text-sm text-slate-500">No other assessments are available in this course yet.</p>}
          {sources.length > 0 && allocation.length === 0 && <p className="text-sm text-slate-500">No reusable objective questions are available yet.</p>}
        </div>
      </>}
      {!loading && Number(requestedTotal) > availableTotal && availableTotal > 0 && <p role="status" className="text-sm text-amber-700">Only {availableTotal} eligible questions are available, so all {availableTotal} will be selected.</p>}
      <div className="flex items-center justify-between border-t pt-4"><span className="text-sm font-semibold">Total selected: {selectedTotal}</span><div className="flex gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
        <button type="button" disabled={saving || loading || selectedTotal === 0} onClick={importQuestions} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Adding…' : 'Add questions'}</button>
      </div></div>
    </div>
  </div>;
}
