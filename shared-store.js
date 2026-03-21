(function () {
  const hasGun = typeof window.Gun === "function";
  const scope = "orpheus_arg_global_v1";
  const peers = [
    "https://gun-manhattan.herokuapp.com/gun",
    "https://gun-us.herokuapp.com/gun",
  ];
  const gun = hasGun ? window.Gun({ peers, localStorage: false, radisk: false }) : null;

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
    if (next.updatedAt >= base.updatedAt) return next;
    return base;
  }

  async function pull(key, fallback) {
    const cached = envelope(readCache(key, { value: fallback, updatedAt: 0 }), fallback);
    if (!gun) return cached.value;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        resolve(payload.value);
      };

      const timer = setTimeout(() => finish(cached), 1200);
      gun.get(scope).get(key).once((data) => {
        clearTimeout(timer);
        if (!data || typeof data !== "object") {
          finish(cached);
          return;
        }
        const merged = normalize(key, { value: data.value ?? fallback, updatedAt: Number(data.updatedAt) || 0 }, fallback);
        writeCache(key, merged);
        finish(merged);
      });
    });
  }

  function set(key, value) {
    const payload = { value, updatedAt: Date.now() };
    writeCache(key, payload);
    if (gun) gun.get(scope).get(key).put(payload);
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

    if (gun) {
      gun.get(scope).get(key).on((data) => {
        if (!data || typeof data !== "object") return;
        const merged = normalize(key, { value: data.value ?? fallback, updatedAt: Number(data.updatedAt) || 0 }, fallback);
        writeCache(key, merged);
        callback(merged.value);
      });
    }
  }

  window.argStore = { pull, set, getCached, subscribe };
})();
