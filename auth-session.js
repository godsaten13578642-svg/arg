(function () {
  const SESSION_KEY = "orpheus_session_v1";

  const ACCOUNTS = {
    observer: { password: "relay", role: "observer", level: 1 },
    moderator: { password: "patchroute", role: "moderator", level: 2 },
    admin: { password: "overridekey", role: "admin", level: 3 }
  };

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.expiresAt || Date.now() > session.expiresAt) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function setSession(username, role, level, hours = 4) {
    const session = {
      username,
      role,
      level,
      issuedAt: Date.now(),
      expiresAt: Date.now() + hours * 60 * 60 * 1000,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function authenticate(username, password) {
    const record = ACCOUNTS[username.toLowerCase()];
    if (!record) return null;
    if (record.password !== password) return null;
    return setSession(username.toLowerCase(), record.role, record.level);
  }

  function requireSession({ minLevel = 1, redirect = "login.html" } = {}) {
    const session = getSession();
    if (!session || session.level < minLevel) {
      window.location.replace(`${redirect}?next=${encodeURIComponent(window.location.pathname.split('/').pop())}`);
      return null;
    }
    return session;
  }

  window.argAuth = {
    getSession,
    setSession,
    clearSession,
    authenticate,
    requireSession,
  };
})();
