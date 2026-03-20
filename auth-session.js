(function () {
  const USERS_KEY = "orpheus_users_v1";
  const SESSION_KEY = "orpheus_session_v2";
  const PROMOTION_KEYS = {
    "mod-ascend-73": { role: "moderator", level: 2 },
    "admin-root-11": { role: "admin", level: 3 }
  };

  const OWNER_SEED = {
    username: "owner",
    passwordHash: "d9d29b496379b836de9a212e8ca47182d6cafcee280d1984bc232fc9288f6011",
    role: "owner",
    level: 4,
  };

  async function sha256Hex(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function baseProgress() {
    return {
      sessionsStarted: 0,
      filesRead: {},
      finalUnlocks: 0,
      overridesRun: 0,
      cipherTraces: 0,
      chatsSent: 0,
      lastSeenAt: null,
    };
  }

  function readUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const users = raw ? JSON.parse(raw) : {};
      if (!users[OWNER_SEED.username]) {
        users[OWNER_SEED.username] = { ...OWNER_SEED, promotions: [], progress: baseProgress(), createdAt: Date.now() };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      return users;
    } catch {
      const users = { [OWNER_SEED.username]: { ...OWNER_SEED, promotions: [], progress: baseProgress(), createdAt: Date.now() } };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return users;
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

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

  function setSession(user, hours = 8) {
    const session = {
      username: user.username,
      role: user.role,
      level: user.level,
      displayName: user.role === "owner" ? "ORPHEUS_CEO" : user.username,
      expiresAt: Date.now() + hours * 60 * 60 * 1000,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  async function signup(username, password) {
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) return { ok: false, error: "Username must be 3-20 chars (a-z, 0-9, _)." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

    const users = readUsers();
    if (users[clean]) return { ok: false, error: "Username already exists." };

    const passwordHash = await sha256Hex(`orpheus:${clean}:${password}`);
    users[clean] = {
      username: clean,
      passwordHash,
      role: "observer",
      level: 1,
      promotions: [],
      progress: baseProgress(),
      createdAt: Date.now(),
    };
    writeUsers(users);
    return { ok: true };
  }

  async function authenticate(username, password) {
    const clean = username.trim().toLowerCase();
    const users = readUsers();
    const user = users[clean];
    if (!user) return null;

    const hash = clean === OWNER_SEED.username
      ? await sha256Hex(`orpheus-owner-salt-v1:${password}`)
      : await sha256Hex(`orpheus:${clean}:${password}`);

    if (hash !== user.passwordHash) return null;
    return setSession(user);
  }

  function requireSession({ minLevel = 1, redirect = "index.html" } = {}) {
    const session = getSession();
    if (!session || session.level < minLevel) {
      window.location.replace(`${redirect}?next=${encodeURIComponent(window.location.pathname.split('/').pop())}`);
      return null;
    }
    return session;
  }

  function recordProgress(updateFn) {
    const session = getSession();
    if (!session) return;
    const users = readUsers();
    const user = users[session.username];
    if (!user) return;
    user.progress = updateFn(user.progress || baseProgress()) || user.progress;
    user.progress.lastSeenAt = new Date().toISOString();
    users[session.username] = user;
    writeUsers(users);
    setSession(user);
  }

  function promoteCurrent(key) {
    const session = getSession();
    if (!session) return { ok: false, error: "No active session." };
    const promo = PROMOTION_KEYS[key];
    if (!promo) return { ok: false, error: "Invalid promotion key." };

    const users = readUsers();
    const user = users[session.username];
    if (!user) return { ok: false, error: "User not found." };
    if (user.level >= promo.level) return { ok: false, error: "Promotion already applied." };

    user.role = promo.role;
    user.level = promo.level;
    user.promotions = [...(user.promotions || []), key];
    users[session.username] = user;
    writeUsers(users);
    setSession(user);

    return { ok: true, role: user.role, level: user.level };
  }

  function listUsersForOwner() {
    const session = getSession();
    if (!session || session.role !== "owner") return [];
    const users = readUsers();
    return Object.values(users).map((u) => ({
      username: u.username,
      role: u.role,
      level: u.level,
      createdAt: u.createdAt,
      progress: u.progress || baseProgress(),
    }));
  }

  window.argAuth = {
    getSession,
    clearSession,
    signup,
    authenticate,
    requireSession,
    recordProgress,
    promoteCurrent,
    listUsersForOwner,
    readUsers,
  };
})();
