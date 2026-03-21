(function () {
  const session = window.argAuth?.requireSession({ minLevel: 1, redirect: "index.html" });
  if (!session) return;

  const CHAT_KEY = "orpheus_chat_v1";
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  const sharedStore = window.argStore;

  function normalizeChat(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.messages)) return payload.messages;
    return Object.values(payload?.items || {}).sort((a, b) => (a.at || 0) - (b.at || 0));
  }

  function serializeChat(messages) {
    return {
      items: messages.slice(-250).reduce((acc, message) => {
        const id = message.id || `${message.user || "user"}-${message.at || Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        acc[id] = { ...message, id };
        return acc;
      }, {}),
    };
  }

  function readChat() {
    return normalizeChat(sharedStore?.getCached(CHAT_KEY, { items: {} }));
  }

  function writeChat(messages) {
    sharedStore?.set(CHAT_KEY, serializeChat(messages));
  }

  function render() {
    const messages = readChat();
    log.innerHTML = messages.map((m) => {
      const color = m.rankColor || "#9fd9ff";
      return `<p><strong style="color:${color}">${m.user}</strong>: ${m.text}</p>`;
    }).join("");
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const userRecord = window.argAuth.getCurrentUser ? window.argAuth.getCurrentUser() : null;
    if (userRecord?.moderation?.muted) {
      alert("You are muted.");
      return;
    }
    const messages = readChat();
    messages.push({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, user: session.displayName, rankKey: session.rankKey, rankColor: session.rankColor, text, at: Date.now() });
    writeChat(messages);
    window.argAuth.recordProgress((p) => ({ ...p, chatsSent: (p.chatsSent || 0) + 1 }));
    input.value = "";
    render();
  });

  setInterval(render, 1500);
  window.addEventListener("storage", (event) => {
    if (event.key === CHAT_KEY || event.key === "orpheus_session_v3") render();
  });
  sharedStore?.pull(CHAT_KEY, { items: {} }).then(render);
  sharedStore?.subscribe(CHAT_KEY, { items: {} }, render);
  render();

  const legendList = (window.argAuth.RANKS || []).map((r, idx) =>
    `<li style="color:${r.color}"><span class="rank-dot" style="background:${r.color}"></span> ${r.name} (L${idx + 1})</li>`
  ).join("");
  const legendNode = document.getElementById("rankLegendList");
  if (legendNode) legendNode.innerHTML = legendList;

  const closeBtn = document.getElementById("rankInfoClose");
  closeBtn?.addEventListener("click", () => {
    const panel = closeBtn.closest("details");
    if (panel) panel.open = false;
  });
})();
