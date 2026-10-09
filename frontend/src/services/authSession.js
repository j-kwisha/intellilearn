const SESSION_KEY = 'intellilearn_auth_session';
const emptySession = { token: null, user: null };

function parseSession(value) {
  try {
    const session = JSON.parse(value);
    return session && typeof session.token === 'string' && session.token
      ? { token: session.token, user: session.user || null } : { ...emptySession };
  } catch {
    return { ...emptySession };
  }
}

export function createAuthSession(tabStorage, persistentStorage) {
  let version = 0;

  const read = () => {
    let value = tabStorage.getItem(SESSION_KEY);
    if (value === null) {
      // Restore an existing login once. After that, this tab owns its session.
      value = persistentStorage.getItem(SESSION_KEY);
      if (value === null) {
        let user = null;
        try { user = JSON.parse(persistentStorage.getItem('user')); } catch { /* Ignore an invalid legacy profile. */ }
        value = JSON.stringify({ token: persistentStorage.getItem('token'), user });
      }
      tabStorage.setItem(SESSION_KEY, value);
    }
    return parseSession(value);
  };

  const write = session => {
    const value = JSON.stringify(session);
    tabStorage.setItem(SESSION_KEY, value);
    persistentStorage.setItem(SESSION_KEY, value);
    persistentStorage.removeItem('token');
    persistentStorage.removeItem('user');
  };

  const snapshot = () => ({ token: read().token, version });
  const isCurrent = captured => captured.token === read().token && captured.version === version;

  return {
    read,
    snapshot,
    isCurrent,
    getToken: () => read().token,
    set(token, user = null) {
      if (!token || typeof token !== 'string') throw new Error('No authentication token received.');
      version++;
      write({ token, user });
    },
    updateUser(user, captured) {
      if (captured && !isCurrent(captured)) return false;
      const session = read();
      if (!session.token || !user?.id || (session.user?.id && session.user.id !== user.id)) return false;
      write({ ...session, user });
      return true;
    },
    clear(captured) {
      if (captured && !isCurrent(captured)) return false;
      const token = read().token;
      version++;
      // An explicit empty session prevents this tab from restoring another tab's login.
      tabStorage.setItem(SESSION_KEY, JSON.stringify(emptySession));
      if (parseSession(persistentStorage.getItem(SESSION_KEY)).token === token) {
        persistentStorage.removeItem(SESSION_KEY);
      }
      if (persistentStorage.getItem('token') === token) {
        persistentStorage.removeItem('token');
        persistentStorage.removeItem('user');
      }
      return true;
    },
  };
}

let browserSession;
export function getAuthSession() {
  browserSession ||= createAuthSession(sessionStorage, localStorage);
  return browserSession;
}
