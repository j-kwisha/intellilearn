import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function InstructorCreateLessonPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Step: 'form' | 'upload'
  const [step, setStep] = useState('form');
  const [lessonId, setLessonId] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');

  // Lesson form state
  const [form, setForm] = useState({ title: '', description: '', topic: '', is_published: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Materials state
  const [materials, setMaterials] = useState([]);
  const [matForm, setMatForm] = useState({ title: '', type: 'pdf' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await api.post(`/courses/${courseId}/lessons`, form);
      setLessonId(res.data.lesson.id);
      setLessonTitle(res.data.lesson.title);
      setStep('upload');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lesson.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadError('Please select a file.'); return; }
    setUploading(true); setUploadError(''); setUploadProgress(0);

    const data = new FormData();
    data.append('title', matForm.title);
    data.append('type', matForm.type);
    data.append('file', file);

    try {
      const res = await api.post(`/courses/${courseId}/lessons/${lessonId}/materials`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setMaterials(prev => [...prev, res.data.material]);
      setMatForm({ title: '', type: 'pdf' });
      setFile(null);
      // Reset file input
      document.getElementById('lesson-file-input').value = '';
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Delete this file?')) return;
    await api.delete(`/courses/${courseId}/lessons/${lessonId}/materials/${materialId}`);
    setMaterials(prev => prev.filter(m => m.id !== materialId));
  };

  const handleDone = () => {
    navigate(`/instructor/courses/${courseId}`);
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
      transition: 'background 0.2s',
    },
    btnGhost: {
      background: 'white', color: '#475569',
      border: '1.5px solid #e2e8f0', borderRadius: '10px',
      padding: '11px 24px', fontSize: '0.9rem', fontWeight: 600,
      cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate(`/instructor/courses/${courseId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Course
      </button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {step === 'form' ? 'Create New Lesson' : `Upload Materials — ${lessonTitle}`}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 28 }}>
        {step === 'form'
          ? 'Fill in the lesson details below, then upload your files on the next step.'
          : 'Upload PDF or DOCX files for this lesson. You can add multiple files.'}
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        {['Lesson Details', 'Upload Files'].map((label, i) => {
          const active = (i === 0 && step === 'form') || (i === 1 && step === 'upload');
          const done = i === 0 && step === 'upload';
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
              {i === 0 && <div style={{ width: 40, height: 2, background: step === 'upload' ? '#10b981' : '#e2e8f0', borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Lesson form */}
      {step === 'form' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{error}</div>}
          <form onSubmit={handleCreateLesson} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={S.label}>Lesson Title *</label>
              <input style={S.input} type="text" placeholder="e.g. Introduction to HTML" value={form.title} required
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Description</label>
              <textarea style={{ ...S.input, resize: 'none' }} rows={3} placeholder="Brief description of this lesson..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Topic Tag</label>
              <input style={S.input} type="text" placeholder="e.g. html_basics, data_privacy"
                value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>Used for AI recommendations. Use underscores for multi-word topics.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0d9488' }} />
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>Publish immediately (visible to students)</span>
            </label>
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create Lesson & Continue →'}
              </button>
              <button type="button" onClick={() => navigate(`/instructor/courses/${courseId}`)} style={S.btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Upload files */}
      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload form */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add a File</h3>
            {uploadError && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>{uploadError}</div>}
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>File Title *</label>
                  <input style={S.input} type="text" placeholder="e.g. Week 1 Module" value={matForm.title} required
                    onChange={e => setMatForm({ ...matForm, title: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>File Type</label>
                  <select style={{ ...S.input, background: 'white' }} value={matForm.type}
                    onChange={e => setMatForm({ ...matForm, type: e.target.value })}>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word Document (DOCX)</option>
                    <option value="ppt">PowerPoint (PPT)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Select File *</label>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}>
                  <input type="file" id="lesson-file-input" accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  <label htmlFor="lesson-file-input" style={{ cursor: 'pointer' }}>
                    {file ? (
                      <p style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.9rem' }}>📎 {file.name}</p>
                    ) : (
                      <>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Click to select or drag & drop a file</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>PDF, DOCX, PPT — Max 100MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              {uploading && uploadProgress > 0 && (
                <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#0d9488', height: '100%', width: `${uploadProgress}%`, transition: 'width 0.3s', borderRadius: 99 }} />
                </div>
              )}
              <button type="submit" disabled={uploading} style={{ ...S.btn, alignSelf: 'flex-start', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? `Uploading ${uploadProgress}%...` : '+ Upload File'}
              </button>
            </form>
          </div>

          {/* Uploaded files list */}
          {materials.length > 0 && (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Uploaded Files ({materials.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {materials.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '1.4rem' }}>{m.type === 'pdf' ? '📄' : m.type === 'docx' ? '📝' : '📎'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{m.title}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{m.type}</p>
                    </div>
                    <button onClick={() => handleDeleteMaterial(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done button */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleDone} style={S.btn}>
              ✓ Done — Back to Course
            </button>
            <button onClick={() => setStep('form')} style={S.btnGhost}>
              ← Edit Lesson Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
