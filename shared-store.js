(function () {
  const API_BASE = "/api/state/";
  const POLL_MS = 2000;
  const timers = new Map();

  function envelope(value, fallback) {
    if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) return value;
    return { value: fallback, updatedAt: 0 };
  }

  function readCache(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function writeCache(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("orpheus:shared-update", { detail: { key, value } }));
    return value;
  }

  function normalize(key, incoming, fallback) {
    const base = envelope(readCache(key, null), fallback);
    const next = envelope(incoming, fallback);
    return next.updatedAt >= base.updatedAt ? next : base;
  }

  async function request(key, options = {}) {
    const response = await fetch(`${API_BASE}${encodeURIComponent(key)}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      ...options,
    });
    if (!response.ok) throw new Error(`Shared store request failed: ${response.status}`);
    return response.json();
  }

  async function pull(key, fallback) {
    const cached = envelope(readCache(key, { value: fallback, updatedAt: 0 }), fallback);
    try {
      const result = await request(key);
      const merged = normalize(key, result?.item || cached, fallback);
      writeCache(key, merged);
      return merged.value;
    } catch {
      return cached.value;
    }
  }

  function set(key, value) {
    const payload = { value, updatedAt: Date.now() };
    writeCache(key, payload);
    request(key, { method: "PUT", body: JSON.stringify(payload) }).catch(() => {});
    return value;
  }

  function getCached(key, fallback) {
    return envelope(readCache(key, { value: fallback, updatedAt: 0 }), fallback).value;
  }

  function subscribe(key, fallback, callback) {
    const handler = (event) => {
      if (event.key !== key) return;
      callback(getCached(key, fallback));
    };
    window.addEventListener("storage", handler);
    window.addEventListener("orpheus:shared-update", (event) => {
      if (event.detail?.key !== key) return;
      callback(getCached(key, fallback));
    });

    if (!timers.has(key)) {
      timers.set(key, window.setInterval(() => {
        pull(key, fallback).then(callback).catch(() => {});
      }, POLL_MS));
    }
  }

  window.argStore = { pull, set, getCached, subscribe };
})();
