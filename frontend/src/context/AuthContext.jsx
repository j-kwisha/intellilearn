import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getAuthSession } from '../services/authSession';

import { AuthContext } from './AuthContextStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAuthSession().getToken()));
  const authOperation = useRef(0);
  const displayedToken = useRef(getAuthSession().getToken());

  // Check if user is logged in on app load
  useEffect(() => {
    const session = getAuthSession();
    const captured = session.snapshot();
    let cancelled = false;
    if (captured.token) {
      api.get('/me')
        .then((res) => {
          if (cancelled || !session.isCurrent(captured)) return;
          if (session.updateUser(res.data.user, captured)) {
            // Verification-only credentials must not restore a student dashboard.
            setUser(res.data.user.role === 'student' && !res.data.user.email_verified_at ? null : res.data.user);
          } else if (session.clear(captured)) {
            displayedToken.current = null;
            setUser(null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled && session.clear(captured)) {
            displayedToken.current = null;
            setUser(null);
            setLoading(false);
          }
        })
        .finally(() => { if (!cancelled && session.isCurrent(captured)) setLoading(false); });
    }
    // A browser Back restore must not reuse user/data state from an older login.
    const restore = event => {
      if (event.persisted && session.getToken() !== displayedToken.current) window.location.reload();
    };
    window.addEventListener('pageshow', restore);
    return () => { cancelled = true; window.removeEventListener('pageshow', restore); };
  }, []);

  const login = async (email, password) => {
    const operation = ++authOperation.current;
    let res;
    try { res = await api.post('/login', { email, password }); }
    catch (error) {
      if (operation === authOperation.current && error.response?.data?.requires_verification) {
        getAuthSession().set(error.response.data.token);
        displayedToken.current = error.response.data.token;
        setUser(null);
        setLoading(false);
      }
      throw error;
    }
    if (operation !== authOperation.current) throw new Error('This sign-in was cancelled. Please sign in again.');
    // If requires_verification, don't set user — return the response for the UI to handle
    if (res.data.requires_verification) {
      // Store token so resend verification can be called
      getAuthSession().set(res.data.token);
      displayedToken.current = res.data.token;
      setUser(null);
      setLoading(false);
      return res.data;
    }
    getAuthSession().set(res.data.token, res.data.user);
    displayedToken.current = res.data.token;
    setUser(res.data.user);
    setLoading(false);
    return res.data.user;
  };

  const register = async (data) => {
    const operation = ++authOperation.current;
    const res = await api.post('/register', data);
    if (operation !== authOperation.current) throw new Error('This registration was cancelled. Please try again.');
    // If requires_verification, store token for resend but do NOT log user in
    if (res.data.requires_verification) {
      getAuthSession().set(res.data.token);
      displayedToken.current = res.data.token;
      setUser(null);
      setLoading(false);
      return res.data;
    }
    if (res.data.token) {
      getAuthSession().set(res.data.token, res.data.user);
      displayedToken.current = res.data.token;
      setUser(res.data.user);
      setLoading(false);
    }
    return res.data;
  };

  const logout = async () => {
    ++authOperation.current;
    const session = getAuthSession();
    const captured = session.snapshot();
    session.clear(captured);
    displayedToken.current = null;
    setUser(null);
    setLoading(false);
    try {
      if (captured.token) await api.post('/logout', {}, { headers: { Authorization: `Bearer ${captured.token}` } });
    } catch {
      // Even if API fails, clear local state
    }
  };

  const updateUser = (profile, captured) => {
    const session = getAuthSession();
    if (!captured || !session.isCurrent(captured)) return false;
    const updated = { ...session.read().user, ...profile };
    if (!session.updateUser(updated, captured)) return false;
    setUser(updated);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
