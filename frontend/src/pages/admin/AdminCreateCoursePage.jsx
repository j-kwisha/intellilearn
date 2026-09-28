import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminCreateCoursePage() {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    instructor_id: '',
    semester: '',
    section: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Fetch instructors for the dropdown
    api.get('/admin/users')
      .then((res) => {
        const inst = res.data.users.filter((u) => u.role === 'instructor');
        setInstructors(inst);
      })
      .catch(() => setInstructors([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setErrors({});

    try {
      await api.post('/courses', {
        ...form,
        instructor_id: parseInt(form.instructor_id),
      });
      navigate('/admin/courses');
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || 'Failed to create course.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `adm-form-input${errors[field] ? ' adm-form-input--error' : ''}`;

  const labelStyle = {
    display: 'block',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--adm-ink)',
    marginBottom: '6px',
  };

  const errorStyle = { color: '#e0453c', fontSize: '12px', marginTop: '4px', fontFamily: 'Inter, sans-serif' };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/admin/courses')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--adm-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '14px', padding: 0 }}
        >
          ← Back to courses
        </button>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '28px', color: 'var(--adm-ink)', margin: 0 }}>
          Create New Course
        </h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--adm-muted)', margin: '4px 0 0' }}>
          Fill in the details to create a new course.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fdecea', color: '#e0453c', fontSize: '14px', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fbbcba', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>
          {error}
        </div>
      )}

      <div className="adm-form-card" style={{ padding: '28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Course Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass('name')} placeholder="e.g. Social and Professional Issues II" required />
            {errors.name && <p style={errorStyle}>{errors.name[0]}</p>}
          </div>

          <div>
            <label style={labelStyle}>Course Code</label>
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputClass('code')} placeholder="e.g. SPI2-2026-A" required />
            {errors.code && <p style={errorStyle}>{errors.code[0]}</p>}
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass('description')} placeholder="Course description (optional)" rows={3}
              style={{ resize: 'vertical' }} />
          </div>

          <div>
            <label style={labelStyle}>Assign Instructor</label>
            <select value={form.instructor_id} onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
              className={inputClass('instructor_id')} required>
              <option value="">Select an instructor…</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.first_name} {inst.last_name} ({inst.email})
                </option>
              ))}
            </select>
            {errors.instructor_id && <p style={errorStyle}>{errors.instructor_id[0]}</p>}
            {instructors.length === 0 && (
              <p style={{ ...errorStyle, color: 'var(--adm-amber-600)' }}>
                No instructors found. Create an instructor account first in User Management.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Semester</label>
              <input type="text" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className={inputClass('semester')} placeholder="e.g. 2nd Semester 2025-2026" required />
              {errors.semester && <p style={errorStyle}>{errors.semester[0]}</p>}
            </div>
            <div>
              <label style={labelStyle}>Section</label>
              <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                className={inputClass('section')} placeholder="e.g. BSIT-3A" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="submit" disabled={saving} className="adm-new-course-btn" style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating…' : 'Create Course'}
            </button>
            <button type="button" onClick={() => navigate('/admin/courses')}
              style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1.5px solid var(--adm-line)', borderRadius: '999px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
