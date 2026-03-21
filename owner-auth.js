(function () {
  const USERNAME = "owner";
  const SALT = "orpheus-owner-salt-v1";
  const EXPECTED_PARTS = [
    "d9d29b496379b836de9a212e8ca47182",
    "d6cafcee280d1984bc232fc9288f6011",
  ];
  const EXPECTED = EXPECTED_PARTS.join("");
  const AUTH_KEY = "orpheus_owner_auth_until";
  const LOCK_KEY = "orpheus_owner_lockout";
  const ATTEMPT_KEY = "orpheus_owner_attempts";

  async function sha256Hex(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function isLocked() {
    const lockUntil = Number(localStorage.getItem(LOCK_KEY) || "0");
    return Date.now() < lockUntil ? lockUntil : 0;
  }

  function setLock(minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(LOCK_KEY, String(until));
    return until;
  }

  function setAuth(hours) {
    const until = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(AUTH_KEY, String(until));
    sessionStorage.setItem(AUTH_KEY, String(until));
  }

  async function verify(user, pass) {
    if (user !== USERNAME) return false;
    const digest = await sha256Hex(`${SALT}:${pass}`);
    return digest === EXPECTED;
  }

  const form = document.getElementById("owner-login-form");
  if (!form) return;

  const msg = document.getElementById("ownerAuthMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const lockUntil = isLocked();
    if (lockUntil) {
      msg.textContent = `Locked. Try again after ${new Date(lockUntil).toLocaleTimeString()}.`;
      return;
    }

    const user = document.getElementById("ownerUser").value.trim().toLowerCase();
    const pass = document.getElementById("ownerPass").value;

    const ok = await verify(user, pass);
    if (ok) {
      localStorage.setItem(ATTEMPT_KEY, "0");
      setAuth(8);
      window.location.href = "owner.html";
      return;
    }

    const attempts = Number(localStorage.getItem(ATTEMPT_KEY) || "0") + 1;
    localStorage.setItem(ATTEMPT_KEY, String(attempts));

    if (attempts >= 5) {
      const until = setLock(15);
      localStorage.setItem(ATTEMPT_KEY, "0");
      msg.textContent = `Too many failed attempts. Locked until ${new Date(until).toLocaleTimeString()}.`;
      return;
    }

    msg.textContent = `Invalid credentials. Attempts remaining: ${5 - attempts}.`;
  });
})();
