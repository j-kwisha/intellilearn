import { useEffect, useState } from 'react';
import api from '../services/api';
import { markNotificationsSeen, readSeenNotifications, unreadNotifications } from '../services/studentNotifications';

export default function useStudentNotifications(user, open) {
  const userId = user?.role === 'student' ? user.id : null;
  const [state, setState] = useState({ userId: null, feed: [], loading: true, error: '', unreadCount: 0 });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let fetching = false;
    const controller = new AbortController();
    let seen = readSeenNotifications(localStorage, userId);
    const refresh = async () => {
      if (fetching || document.visibilityState === 'hidden') return;
      fetching = true;
      try {
        const response = await api.get('/student/feed', { timeout: 15000, signal: controller.signal });
        if (cancelled) return;
        const feed = response.data.feed;
        if (!Array.isArray(feed)) throw new Error('Invalid notification feed');
        // Only mark items seen after they have been successfully fetched for the open panel.
        if (open) seen = markNotificationsSeen(localStorage, userId, feed, seen);
        setState({ userId, feed, loading: false, error: '', unreadCount: unreadNotifications(feed, seen) });
      } catch {
        if (!cancelled) setState(previous => ({
          ...(previous.userId === userId ? previous : { userId, feed: [], unreadCount: 0 }),
          loading: false, error: 'Unable to load notifications. Please try again.',
        }));
      } finally {
        fetching = false;
      }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, open, retry]);

  return {
    ...(state.userId === userId ? state : { feed: [], loading: true, error: '', unreadCount: 0 }),
    refresh: () => setRetry(value => value + 1),
  };
}
