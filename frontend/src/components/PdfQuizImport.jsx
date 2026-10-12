import { useState } from 'react';
import api from '../services/api';

export default function PdfQuizImport({ courseId, assessmentId, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const importPdf = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!file || !file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setError('Select a PDF quiz file.'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('The PDF must be 10 MB or smaller.'); return; }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await api.post(`/courses/${courseId}/assessments/${assessmentId}/import-pdf`, data);
      await onImported(response.data);
    } catch (failure) {
      setError(failure.response?.data?.errors?.file?.[0] || failure.response?.data?.message || 'Could not import this PDF. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={importPdf} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Import existing quiz from PDF</h3>
        <p className="text-sm text-slate-600 mt-2">Copy the questions and choices already written in your PDF into an online quiz. No AI generation or rewriting.</p>
      </div>
      <p className="text-sm text-slate-600">Use a text-based PDF up to 10 MB, with numbered questions (1. or 1)) and labeled choices (A. or A)). You will review the imported text, answers and points before saving.</p>
      <div>
        <label htmlFor="quiz-pdf-file" className="block text-sm font-semibold text-slate-700 mb-2">Quiz PDF</label>
        <input id="quiz-pdf-file" type="file" accept=".pdf,application/pdf" disabled={loading}
          onChange={event => { setFile(event.target.files?.[0] || null); setError(''); }}
          className="block w-full text-sm text-slate-800 border border-slate-300 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600" />
      </div>
      <p className="text-sm text-slate-600">Only answers explicitly printed in the PDF are imported. If there is no answer key, enter the correct answers yourself. Scanned pages and diagrams need manual review.</p>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      <button type="submit" disabled={loading || !file}
        className="px-5 py-3 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? 'Extracting questions...' : 'Extract Questions from PDF'}
      </button>
    </form>
  );
}
