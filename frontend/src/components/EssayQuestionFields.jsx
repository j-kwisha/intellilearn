import { useState } from 'react';
import api from '../services/api';
import RubricEditor from './RubricEditor';

export default function EssayQuestionFields({ question, onChange, courseId, assessmentId, lessons = [] }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = { width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#64748b' }}>AI grading requires a saved rubric and readable reference content. Otherwise the essay waits for instructor grading with no AI feedback.</p>
      <label>Reference lesson
        <select style={input} value={question.reference_lesson_id || ''} onChange={e => onChange({ reference_lesson_id: e.target.value })}>
          <option value="">No lesson selected — manual grading unless reference text is provided</option>
          {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </label>
      <label>Upload reference (PDF, DOCX or TXT)
        <input type="file" accept=".pdf,.docx,.txt" disabled={uploading} style={input} onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true); setError('');
          const data = new FormData(); data.append('reference_file', file);
          try {
            const response = await api.post(`/courses/${courseId}/upload-reference-text`, data);
            onChange({ reference_text: response.data.extracted_text, reference_file: response.data.reference_file });
          } catch (err) { setError(err.response?.data?.message || 'Could not extract reference content.'); }
          finally { setUploading(false); }
        }} />
      </label>
      {uploading && <p>Extracting reference text...</p>}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      <label>Reference content (takes priority over the selected lesson)
        <textarea rows={5} maxLength={24000} style={input} value={question.reference_text || ''} onChange={e => onChange({ reference_text: e.target.value, reference_file: null })} />
      </label>
      <RubricEditor value={question.rubric || null} onChange={rubric => onChange({ rubric })} question={question} courseId={courseId} assessmentId={assessmentId} disabled={uploading} />
    </div>
  );
}
