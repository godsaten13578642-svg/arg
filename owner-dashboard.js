(function () {
  const AUTH_KEY = "orpheus_owner_auth_until";
  const METRIC_KEY = "orpheus_metrics_v1";

  const authUntil = Number(sessionStorage.getItem(AUTH_KEY) || "0");
  if (!authUntil || Date.now() > authUntil) {
    window.location.href = "owner-login.html";
    return;
  }

  const data = (() => {
    try {
      return JSON.parse(localStorage.getItem(METRIC_KEY) || "{}");
    } catch {
      return {};
    }
  })();

  document.getElementById("sessionsStarted").textContent = String(data.sessionsStarted || 0);
  document.getElementById("finalUnlocks").textContent = String(data.finalUnlocks || 0);
  document.getElementById("overridesRun").textContent = String(data.overridesRun || 0);
  document.getElementById("cipherTraces").textContent = String(data.cipherTraces || 0);
  document.getElementById("lastSeenAt").textContent = data.lastSeenAt ? new Date(data.lastSeenAt).toLocaleString() : "never";

  const fileReads = data.fileReads || {};
  const list = document.getElementById("fileReads");
  const entries = Object.entries(fileReads).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    list.innerHTML = "<li>No file activity yet.</li>";
  } else {
    list.innerHTML = entries.map(([file, count]) => `<li><code>${file}</code>: ${count}</li>`).join("");
  }

  document.getElementById("ownerLogout").addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = "owner-login.html";
  });
})();
