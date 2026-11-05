import { useLayoutEffect, useState } from 'react';

const GUEST_KEY = 'intellilearn-site-theme-guest';

export default function useSiteTheme(userId, isStudent = false) {
  const storageKey = userId == null ? GUEST_KEY : `intellilearn-site-theme-user-${userId}`;
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved === 'dark';
      if (isStudent) {
        const legacy = localStorage.getItem(`intellilearn-student-theme-${userId}`);
        if (legacy) return legacy === 'dark';
      }
      return localStorage.getItem(GUEST_KEY) === 'dark';
    } catch { return false; }
  });

  useLayoutEffect(() => {
    document.body.dataset.siteTheme = darkMode ? 'dark' : 'light';
    if (isStudent) document.body.dataset.studentTheme = darkMode ? 'dark' : 'light';
    try { localStorage.setItem(storageKey, darkMode ? 'dark' : 'light'); }
    catch { /* The current page still responds when storage is unavailable. */ }
    return () => {
      delete document.body.dataset.siteTheme;
      delete document.body.dataset.studentTheme;
    };
  }, [darkMode, isStudent, storageKey]);

  return [darkMode, () => setDarkMode(value => !value)];
}
