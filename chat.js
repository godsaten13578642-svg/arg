(function () {
  const session = window.argAuth?.requireSession({ minLevel: 1, redirect: "index.html" });
  if (!session) return;

  const CHAT_KEY = "orpheus_chat_v1";
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  function readChat() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeChat(messages) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-250)));
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
    const messages = readChat();
    messages.push({ user: session.displayName, rankKey: session.rankKey, rankColor: session.rankColor, text, at: Date.now() });
    writeChat(messages);
    window.argAuth.recordProgress((p) => ({ ...p, chatsSent: (p.chatsSent || 0) + 1 }));
    input.value = "";
    render();
  });

  setInterval(render, 1500);
  render();

  const legendList = (window.argAuth.RANKS || []).map((r, idx) =>
    `<li style="color:${r.color}"><span class="rank-dot" style="background:${r.color}"></span> ${r.name} (L${idx + 1})</li>`
  ).join("");
  const legendNode = document.getElementById("rankLegendList");
  if (legendNode) legendNode.innerHTML = legendList;

  const modal = document.getElementById("rankInfoModal");
  const openBtn = document.getElementById("rankInfoBtn");
  const closeBtn = document.getElementById("rankInfoClose");

  openBtn?.addEventListener("click", () => {
    if (!modal) return;
    modal.hidden = false;
  });

  closeBtn?.addEventListener("click", () => {
    if (!modal) return;
    modal.hidden = true;
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
})();
