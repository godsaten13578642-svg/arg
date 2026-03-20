(function () {
  const USERS_KEY = "orpheus_users_v1";
  const SESSION_KEY = "orpheus_session_v3";

  const RANKS = [
    { key: "recruit", name: "Recruit", color: "#9fd9ff" },
    { key: "jr_mod", name: "Jr. Mod", color: "#88f58c" },
    { key: "mod", name: "Mod", color: "#6eea74" },
    { key: "sr_mod", name: "Sr. Mod", color: "#51d85a" },
    { key: "jr_staff", name: "Jr. Staff", color: "#ffe08a" },
    { key: "staff", name: "Staff", color: "#ffd166" },
    { key: "sr_staff", name: "Sr. Staff", color: "#ffbb4d" },
    { key: "jr_recruiter", name: "Jr. Recruiter", color: "#d8b4ff" },
    { key: "recruiter", name: "Recruiter", color: "#c58cff" },
    { key: "sr_recruiter", name: "Sr. Recruiter", color: "#af6dff" },
    { key: "jr_trainer", name: "Jr. Trainer", color: "#90f5f0" },
    { key: "trainer", name: "Trainer", color: "#58e7df" },
    { key: "sr_trainer", name: "Sr. Trainer", color: "#39cec7" },
    { key: "head_mod", name: "Head Mod", color: "#ff9ca3" },
    { key: "head_staff", name: "Head Staff", color: "#ff858f" },
    { key: "head_recruiter", name: "Head Recruiter", color: "#ff6f7d" },
    { key: "head_trainer", name: "Head Trainer", color: "#ff5a6c" },
    { key: "jr_dev", name: "Jr. Dev", color: "#9ab0ff" },
    { key: "dev", name: "Dev", color: "#7f95ff" },
    { key: "sr_dev", name: "Sr. Dev", color: "#667fff" },
    { key: "head_dev", name: "Head Dev", color: "#4b67ff" },
    { key: "co_owner", name: "Co Owner", color: "#ff8de1" },
    { key: "invester", name: "Invester", color: "#ff74c8" },
    { key: "ceo", name: "CEO", color: "#ff5a7a" },
  ];

  const OWNER_SEED = {
    username: "orpheus_ceo",
    passwordHash: "d9d29b496379b836de9a212e8ca47182d6cafcee280d1984bc232fc9288f6011",
    level: RANKS.length,
  };

  function rankFor(level) {
    return RANKS[Math.max(1, Math.min(level, RANKS.length)) - 1];
  }

  async function sha256Hex(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function baseProgress() {
    return { sessionsStarted: 0, filesRead: {}, finalUnlocks: 0, overridesRun: 0, cipherTraces: 0, chatsSent: 0, lastSeenAt: null };
  }

  function readUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const users = raw ? JSON.parse(raw) : {};
      // Migrate legacy owner username to ORPHEUS_CEO account slug.
      if (users.owner && !users[OWNER_SEED.username]) {
        users[OWNER_SEED.username] = users.owner;
        delete users.owner;
      }
      const existingOwner = users[OWNER_SEED.username] || {};
      users[OWNER_SEED.username] = {
        ...existingOwner,
        ...OWNER_SEED,
        username: OWNER_SEED.username,
        level: OWNER_SEED.level,
        passwordHash: OWNER_SEED.passwordHash,
        promotions: existingOwner.promotions || [],
        progress: existingOwner.progress || baseProgress(),
        createdAt: existingOwner.createdAt || Date.now(),
      };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return users;
    } catch {
      const users = { [OWNER_SEED.username]: { ...OWNER_SEED, promotions: [], progress: baseProgress(), createdAt: Date.now() } };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return users;
    }
  }

  function writeUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

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
    } catch { return null; }
  }

  function setSession(user, hours = 8) {
    const rank = rankFor(user.level);
    const session = {
      username: user.username,
      level: user.level,
      rankKey: rank.key,
      rankName: rank.name,
      rankColor: rank.color,
      displayName: user.level === RANKS.length ? "ORPHEUS_CEO" : user.username,
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

    users[clean] = { username: clean, passwordHash, level: 1, promotions: [], progress: baseProgress(), createdAt: Date.now() };
    writeUsers(users);
    return { ok: true };
  }

  async function authenticate(username, password) {
    const clean = username.trim().toLowerCase();
    const users = readUsers();
    const resolvedUsername = clean === "owner" ? OWNER_SEED.username : clean;
    const user = users[resolvedUsername];
    if (!user) return null;

    const hash = resolvedUsername === OWNER_SEED.username
      ? await sha256Hex(`orpheus-owner-salt-v1:${password}`)
      : await sha256Hex(`orpheus:${resolvedUsername}:${password}`);

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

  function expectedPromotionKey(level) {
    const next = rankFor(level + 1);
    return `promote:${next.key}:orpheus`;
  }

  function promoteCurrent(key) {
    const session = getSession();
    if (!session) return { ok: false, error: "No active session." };
    const users = readUsers();
    const user = users[session.username];
    if (!user) return { ok: false, error: "User not found." };
    if (user.level >= RANKS.length) return { ok: false, error: "Already max rank." };

    if (key !== expectedPromotionKey(user.level)) {
      return { ok: false, error: "Invalid key for your next rank." };
    }

    user.level += 1;
    user.promotions = [...(user.promotions || []), key];
    users[session.username] = user;
    writeUsers(users);
    const nextRank = rankFor(user.level);
    setSession(user);

    return { ok: true, level: user.level, rankName: nextRank.name };
  }

  function listUsersForOwner() {
    const session = getSession();
    if (!session || session.level !== RANKS.length) return [];
    const users = readUsers();
    return Object.values(users).map((u) => ({
      username: u.username,
      level: u.level,
      rankName: rankFor(u.level).name,
      rankColor: rankFor(u.level).color,
      createdAt: u.createdAt,
      progress: u.progress || baseProgress(),
    }));
  }

  window.argAuth = {
    RANKS,
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
