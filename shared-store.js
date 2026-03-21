(function () {
  const API_BASE = "/api/state/";
  const FIREBASE_ROOT = (window.ORPHEUS_FIREBASE_DB_URL || "").trim();
  const POLL_MS = 2000;
  const EVENT_URL = '/api/events';
  const timers = new Map();
  const listeners = new Map();
  const streamSources = new Map();


  let eventSource = null;

  function normalizeRoot(value) {
    return (value || "").trim().replace(/\/$/, "");
  }

  function isFirebaseMode() {
    return !!normalizeRoot(FIREBASE_ROOT);
  }

  function getApiRoot() {
    const configured = window.ORPHEUS_SHARED_API_BASE || window.location.origin;
    return normalizeRoot(configured || window.location.origin);
  }

  function keyUrl(key) {
    if (isFirebaseMode()) return `${normalizeRoot(FIREBASE_ROOT)}/orpheus/${encodeURIComponent(key)}.json`;
    return `${getApiRoot()}${API_BASE}${encodeURIComponent(key)}`;
  }

  function notify(key, fallback) {
    const cbs = listeners.get(key) || [];
    const value = getCached(key, fallback);
    cbs.forEach((callback) => callback(value));
  }

  function ensureEventSource(key, fallback) {
    if (isFirebaseMode()) {
      if (streamSources.has(key) || typeof EventSource !== "function") return;
      const source = new EventSource(keyUrl(key));
      const refresh = () => {
        pull(key, fallback).then(() => notify(key, fallback)).catch(() => {});
      };
      source.addEventListener("put", refresh);
      source.addEventListener("patch", refresh);
      source.onerror = () => {};
      streamSources.set(key, source);
      return;
    }

    if (eventSource || typeof EventSource !== "function") return;
    eventSource = new EventSource(`${getApiRoot()}${EVENT_URL}`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (!payload?.key) return;
        const merged = envelope(payload.item, null);
        if (!merged) return;
        writeCache(payload.key, merged);
        notify(payload.key, merged.value);
      } catch {}
    };
    eventSource.onerror = () => {};
  }

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
    const response = await fetch(keyUrl(key), {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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
      const incoming = isFirebaseMode() ? result : (result?.item || cached);
      const merged = normalize(key, incoming || cached, fallback);
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
    const customHandler = (event) => {
      if (event.detail?.key !== key) return;
      callback(getCached(key, fallback));
    };
    window.addEventListener("storage", handler);
    window.addEventListener("orpheus:shared-update", customHandler);

    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(callback);
    ensureEventSource(key, fallback);

    if (!timers.has(key)) {
      timers.set(key, window.setInterval(() => {
        pull(key, fallback).then(() => notify(key, fallback)).catch(() => {});
      }, POLL_MS));
    }
  }

  window.argStore = { pull, set, getCached, subscribe };
})();
