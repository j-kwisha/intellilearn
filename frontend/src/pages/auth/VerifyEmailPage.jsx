import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logo from '../../assets/logo.png';
import loginBg from '../../assets/login_bg.png';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const s = searchParams.get('status');
    if (s === 'success' || s === 'already') setStatus('success');
    else if (s === 'error') setStatus('error');
    else setStatus('error'); // no status param = direct navigation, not a valid link
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
    }}>
      <nav style={{
        height: 68, background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(203,213,225,0.5)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 48px',
      }}>
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={logo} alt="IntelliLearn" style={{ height: 40, objectFit: 'contain' }} />
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20, padding: '48px 40px',
          boxShadow: '0 8px 40px rgba(23,56,97,0.14)',
          textAlign: 'center',
        }}>
          {status === 'loading' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#173861', marginBottom: 8 }}>Verifying...</h2>
              <p style={{ fontSize: 14, color: '#64748b' }}>Please wait while we verify your email.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#173861', marginBottom: 10 }}>Email Verified!</h2>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
                Your account is now active. You can log in and start learning.
              </p>
              <Link to="/login" style={{
                display: 'inline-block', background: '#173861', color: 'white',
                borderRadius: 10, padding: '12px 32px', fontWeight: 700,
                fontSize: 14, textDecoration: 'none',
              }}>Go to Login</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#173861', marginBottom: 10 }}>Verification Failed</h2>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
                This link is invalid or has expired. Log in and request a new verification email.
              </p>
              <Link to="/login" style={{
                display: 'inline-block', background: '#173861', color: 'white',
                borderRadius: 10, padding: '12px 32px', fontWeight: 700,
                fontSize: 14, textDecoration: 'none',
              }}>Back to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
