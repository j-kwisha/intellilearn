import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate('/student');
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else setErrors({ general: [err.response?.data?.message || 'Registration failed.'] });
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-input"
        style={errors[key] ? { borderColor: '#EF4444' } : {}}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        required
      />
      {errors[key] && (
        <p style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: 4 }}>
          {errors[key][0]}
        </p>
      )}
    </div>
  );

  return (
    <div className="auth-page">
      <div style={{
        position: 'fixed', top: -80, right: -80, width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(76,59,207,0.07)', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.8rem', fontWeight: 800,
            color: '#fff', letterSpacing: '-0.02em',
          }}>
            <span style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 900, color: 'white',
              boxShadow: '0 4px 14px rgba(139,92,246,0.5)',
            }}>IL</span>
            Intellilearn
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: '0.875rem' }}>
            Create your account to get started
          </p>
        </div>

        <div className="auth-card">
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.35rem', fontWeight: 800,
            color: 'var(--text-dark)', marginBottom: 24, marginTop: 0,
          }}>
            Create account ✨
          </h2>

          {errors.general && (
            <div style={{
              background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem',
              padding: '12px 14px', borderRadius: 10, marginBottom: 18, border: '1px solid #FECACA',
            }}>
              {errors.general[0]}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {field('first_name', 'First name', 'text', 'Juan')}
              {field('last_name', 'Last name', 'text', 'dela Cruz')}
            </div>
            {field('email', 'Email address', 'email', 'you@omsc.edu.ph')}
            {field('password', 'Password', 'password', '••••••••')}
            {field('password_confirmation', 'Confirm password', 'password', '••••••••')}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: '12px' }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 24, marginBottom: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--purple-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
