(function () {
  const session = window.argAuth?.requireSession({ minLevel: 24, redirect: "index.html" });
  if (!session || session.level !== (window.argAuth.RANKS?.length || 24)) {
    window.location.replace("index.html");
    return;
  }

  const CHAT_KEY = "orpheus_chat_v1";
  const playersList = document.getElementById("playersList");
  const playerDetails = document.getElementById("playerDetails");
  let selectedUser = null;

  function readChat() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function users() {
    return window.argAuth.listUsersForOwner().sort((a, b) => b.level - a.level || a.username.localeCompare(b.username));
  }

  function renderPlayers() {
    const data = users();
    playersList.innerHTML = data.map((u) => {
      const name = u.level === (window.argAuth.RANKS?.length || 24) ? "ORPHEUS_CEO" : u.username;
      return `<li><button class="player-btn" data-user="${u.username}"><span style="color:${u.rankColor}">${name}</span> <small>L${u.level}</small></button></li>`;
    }).join("");

    playersList.querySelectorAll(".player-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedUser = btn.dataset.user;
        renderDetails();
      });
    });
  }

  function actionButtons(user) {
    if (!user) return "";
    return `
      <div class="btn-row">
        <button class="btn ghost" data-action="ban">Ban</button>
        <button class="btn ghost" data-action="unban">Unban</button>
        <button class="btn ghost" data-action="timeout_30">Timeout 30m</button>
        <button class="btn ghost" data-action="mute">Mute</button>
        <button class="btn ghost" data-action="unmute">Unmute</button>
      </div>
    `;
  }

  function renderDetails() {
    if (!selectedUser) {
      playerDetails.textContent = "Select a player to view rank, progress, moderation, and chat logs.";
      return;
    }

    const user = window.argAuth.getUser(selectedUser);
    if (!user) {
      playerDetails.textContent = "User not found.";
      return;
    }

    const rank = window.argAuth.RANKS[user.level - 1];
    const mod = user.moderation || {};
    const p = user.progress || {};
    const logs = readChat().filter((m) => (m.user || "").toLowerCase() === (user.level === 24 ? "orpheus_ceo" : user.username));

    playerDetails.innerHTML = `
      <p><strong>${user.level === 24 ? "ORPHEUS_CEO" : user.username}</strong> · <span style="color:${rank.color}">${rank.name}</span> (L${user.level})</p>
      <p class="tiny">Created: ${new Date(user.createdAt).toLocaleString()}</p>
      <p class="tiny">Progress: sessions ${p.sessionsStarted || 0}, final unlocks ${p.finalUnlocks || 0}, overrides ${p.overridesRun || 0}, chats ${p.chatsSent || 0}</p>
      <p class="tiny">Milestones: ${(p.milestones || []).join(", ") || "none"}</p>
      <p class="tiny">Keys: ${(p.keyInventory || []).join(" | ") || "none"}</p>
      <p class="tiny">Moderation: banned=${!!mod.banned}, timeoutUntil=${mod.timeoutUntil ? new Date(mod.timeoutUntil).toLocaleString() : "none"}, muted=${!!mod.muted}</p>
      ${actionButtons(user)}
      <h4>Recent Chat Logs</h4>
      <div class="chat-log">${logs.slice(-40).map((m) => `<p><strong>${m.user}</strong>: ${m.text}</p>`).join("") || "<p>No logs.</p>"}</div>
      <p id="playerActionMsg" class="muted tiny"></p>
    `;

    playerDetails.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => runAction(user.username, el.dataset.action));
    });
  }

  function runAction(username, action) {
    const now = Date.now();
    const patch = {
      ban: { banned: true },
      unban: { banned: false, bannedUntil: null },
      timeout_30: { timeoutUntil: now + 30 * 60 * 1000 },
      mute: { muted: true },
      unmute: { muted: false },
    }[action];

    if (!patch) return;
    const result = window.argAuth.updateUserModeration(username, patch);
    const msg = document.getElementById("playerActionMsg");
    if (msg) msg.textContent = result.ok ? `Applied: ${action}` : `Failed: ${result.error}`;
    renderPlayers();
    selectedUser = username;
    renderDetails();
  }

  function wireTabs() {
    document.querySelectorAll(".owner-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".owner-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        document.querySelectorAll(".owner-panel").forEach((panel) => panel.hidden = panel.id !== `tab-${tab}`);
      });
    });
  }

  document.getElementById("clearChatBtn")?.addEventListener("click", () => {
    localStorage.setItem(CHAT_KEY, "[]");
    document.getElementById("chatToolsMsg").textContent = "Chat logs cleared.";
    renderDetails();
  });

  document.getElementById("saveChatBtn")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(readChat(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orpheus-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById("chatToolsMsg").textContent = "Chat logs downloaded.";
  });

  document.getElementById("ownerLogout").addEventListener("click", () => {
    window.argAuth.clearSession();
    window.location.href = "index.html";
  });

  wireTabs();
  renderPlayers();
})();
