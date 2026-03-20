(function () {
  const session = window.argAuth?.requireSession({ minLevel: 24, redirect: "index.html" });
  if (!session || session.level !== (window.argAuth.RANKS?.length || 24)) {
    window.location.replace("index.html");
    return;
  }

  const rows = document.getElementById("users-body");
  const users = window.argAuth.listUsersForOwner();

  rows.innerHTML = users.map((u) => {
    const p = u.progress || {};
    const lastSeen = p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString() : "never";
    const name = u.level === (window.argAuth.RANKS?.length || 24) ? "ORPHEUS_CEO" : u.username;
    return `<tr>
      <td>${name}</td>
      <td style="color:${u.rankColor}">${u.rankName}</td>
      <td>${u.level}</td>
      <td>${p.sessionsStarted || 0}</td>
      <td>${p.finalUnlocks || 0}</td>
      <td>${p.overridesRun || 0}</td>
      <td>${p.chatsSent || 0}</td>
      <td>${lastSeen}</td>
    </tr>`;
  }).join("");

  document.getElementById("ownerLogout").addEventListener("click", () => {
    window.argAuth.clearSession();
    window.location.href = "index.html";
  });
})();
