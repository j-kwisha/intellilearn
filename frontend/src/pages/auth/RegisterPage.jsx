import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { connectGoogleProfile } from '../../services/googleProfile';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const result = await register(form);
      if (result.requires_verification) setRegistered(true);
      else navigate('/student');
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else setErrors({ general: [err.response?.data?.message || 'Registration failed.'] });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // Call backend to get Google OAuth URL
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/redirect`);
      const data = await response.json();
      
      if (data.url) {
        // Redirect user to Google OAuth
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Google signup failed:', err);
      setErrors({ general: ['Failed to initiate Google signup. Please try again.'] });
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

  if (registered) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ width: '100%', maxWidth: 480 }}>
          <h2>Check your email</h2>
          <p>Your account is created. Open the verification email before signing in.</p>
          <p>Optionally connect the Google account for {form.email} to use its name and profile photo.</p>
          {errors.general && <p role="alert">{errors.general[0]}</p>}
          <button className="btn-primary" disabled={loading} onClick={async () => {
            setLoading(true);
            try { await connectGoogleProfile('/login'); }
            catch (err) {
              setErrors({ general: [err.response?.data?.message || 'Could not connect Google. Please try again.'] });
              setLoading(false);
            }
          }}>{loading ? 'Connecting...' : 'Connect Google'}</button>
          <p><Link to="/login">Skip for now and go to sign in</Link></p>
        </div>
      </div>
    );
  }

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

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
            <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>OR</span>
            <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            style={{
              width:'100%',
              background:'white',
              border:'1.5px solid #E2E8F0',
              borderRadius:12,
              padding:'12px',
              fontSize:14,
              fontWeight:600,
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:10,
              transition:'all .2s',
              boxShadow:'0 2px 8px rgba(0,0,0,.05)',
              color:'#1F2937'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

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
