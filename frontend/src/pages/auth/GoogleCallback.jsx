import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { getAuthSession } from '../../services/authSession';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const session = getAuthSession();
    const captured = session.snapshot();
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const pendingLink = JSON.parse(sessionStorage.getItem('googleProfileLink') || 'null');
        if (params.get('state')?.startsWith('link_')) {
          if (!pendingLink || params.get('state') !== pendingLink.state) {
            throw new Error('Google connection could not be verified. Please try again.');
          }
          sessionStorage.removeItem('googleProfileLink');
          if (params.get('error')) throw new Error('Google connection was cancelled. Your existing profile is unchanged.');
          const { data } = await api.post('/auth/google/link', {
            code: params.get('code'), state: params.get('state'),
          }).catch((err) => { throw new Error(err.response?.data?.message || 'Failed to import Google profile.'); });
          if (!session.updateUser(data.user, captured)) throw new Error('Your login changed. Please connect Google again.');
          const returnTo = pendingLink.returnTo;
          window.location.replace(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/login');
          return;
        }
        sessionStorage.removeItem('googleProfileLink');
        
        // Call backend callback endpoint with the full URL
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/google/callback${location.search}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Authentication failed');
        }

        // Store token and user data
        if (data.token) {
          if (!session.isCurrent(captured)) throw new Error('Your login changed. Please sign in again.');
          session.set(data.token, data.user);

          // Force reload to ensure auth context picks up the new token
          window.location.replace(data.user.role === 'admin'
            ? '/admin' 
            : data.user.role === 'instructor' 
            ? '/instructor' 
            : '/student');
        } else {
          throw new Error('No token received from server');
        }
      } catch (err) {
        console.error('Google callback error:', err);
        setError(err.message || 'Failed to complete Google authentication');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, location.search]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '32px 40px',
          maxWidth: 400,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', margin: '0 0 12px' }}>
            Authentication Failed
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: 20 }}>
            {error}
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Loading Spinner */}
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #E5E7EB',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', margin: '0 0 8px' }}>
          Completing sign in...
        </h2>
        <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>
          Please wait while we authenticate your account
        </p>
      </div>
    </div>
  );
}
