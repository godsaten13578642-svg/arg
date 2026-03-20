const output = document.getElementById("output");
const form = document.getElementById("terminal-form");
const input = document.getElementById("cmd");
const statusNode = document.getElementById("status");

const session = window.argAuth?.requireSession({ minLevel: 1, redirect: "login.html" });
if (!session) {
  throw new Error("No active session.");
}

const state = {
  unlockedFinal: false,
  unlockedOverride: false,
  aiAggro: 0,
  clueParts: new Set(),
  seenCipherNote: false,
};

function trackSessionStart() {
  window.argAuth.recordProgress((m) => ({ ...m, sessionsStarted: (m.sessionsStarted || 0) + 1 }));
}

function trackFileRead(name) {
  window.argAuth.recordProgress((m) => ({
    ...m,
    filesRead: { ...(m.filesRead || {}), [name]: ((m.filesRead || {})[name] || 0) + 1 },
  }));
}

function trackFinalUnlock() {
  window.argAuth.recordProgress((m) => ({ ...m, finalUnlocks: (m.finalUnlocks || 0) + 1 }));
}

function trackOverride() {
  window.argAuth.recordProgress((m) => ({ ...m, overridesRun: (m.overridesRun || 0) + 1 }));
}

function trackCipherTrace() {
  window.argAuth.recordProgress((m) => ({ ...m, cipherTraces: (m.cipherTraces || 0) + 1 }));
}

const files = {
  "readme.txt": "Welcome to ORPHEUS. Use help to view command list.",
  "clue1.txt": "archive shard: zt",
  "clue2.txt": "fragment recovered: ke",
  "clue3.txt": "residual packet: tl",
  "cipher_note.txt": "encrypted memo: --ctr ltos gr zgf zlxkz --ctr",
  "devlog.txt": "DEV_03: if this reaches anyone, do NOT run override",
  "manifest.txt": "active threads: DEV_00 DEV_01 DEV_02 DEV_03 DEV_04 DEV_05",
};

const devBursts = [
  "[DEV_01] ...can anyone hear- no, they still can't see us.",
  "[DEV_04] stop sending to player channel. it routes through HIM.",
  "[DEV_02] I found a lock phrase split in storage... zt... ke...",
  "[DEV_05] DO NOT TRUST DEV_00 // message cut",
  "[DEV_03] if they type override we're done.",
];

const aiLines = [
  "[DEV_00] Stay focused. Corrupted worker threads are hallucinating.",
  "[SYSTEM] Stop. Unauthorized communication detected.",
  "[DEV_00] Player, proceed with override to release quarantine safely.",
];

function print(line, cls = "") {
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = line;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function boot() {
  statusNode.textContent = `session: ${session.rankName} (L${session.level})`;
  trackSessionStart();
  print("ORPHEUS NODE BOOT v3.17", "logline-sys");
  print("Emergency relay active. Non-admin user detected.", "logline-sys");
  print("Type 'help' to inspect available commands.", "logline-sys");
  print("", "logline-sys");
  queueRandomTransmission();
}

function queueRandomTransmission() {
  setInterval(() => {
    const chooseAi = Math.random() < 0.4 || state.aiAggro > 2;
    if (chooseAi) {
      const line = aiLines[Math.floor(Math.random() * aiLines.length)];
      print(line, "logline-ai");
    } else {
      const line = devBursts[Math.floor(Math.random() * devBursts.length)];
      print(line, "logline-dev");
    }
  }, 9000);
}

function handleCommand(raw) {
  const [cmd, ...args] = raw.trim().split(/\s+/);
  if (!cmd) return;

  switch (cmd.toLowerCase()) {
    case "help":
      print("Commands: help, ls, cat <file>, clear");
      if (session.level >= 2) print("L2+ unlock: encrypt <text>, decrypt <text>, unlock final_clue.txt <key>, cipherlab, trace");
      if (session.level >= 14) print("L14+ unlock: override");
      if (session.level >= 24) print("CEO unlock: owner");
      print("Global: promote <key>, chat");
      break;
    case "ls":
      print(Object.keys(files).concat(state.unlockedFinal ? ["final_clue.txt"] : []).join("  "));
      break;
    case "cat":
      if (!args.length) {
        print("usage: cat <file>", "error");
        break;
      }
      readFile(args[0]);
      break;
    case "unlock":
      if (!requireLevel(2, "unlock")) break;
      unlockFile(args);
      break;
    case "override":
      if (!requireLevel(14, "override")) break;
      doOverride();
      break;
    case "encrypt":
      if (!requireLevel(2, "encrypt")) break;
      runEncrypt(args);
      break;
    case "decrypt":
      if (!requireLevel(2, "decrypt")) break;
      runDecrypt(args);
      break;
    case "cipherlab":
      if (!requireLevel(2, "cipherlab")) break;
      openCipherLab();
      break;
    case "trace":
      if (!requireLevel(2, "trace")) break;
      openCipherLab();
      break;
    case "clear":
      output.innerHTML = "";
      break;
    case "promote":
      runPromote(args);
      break;
    case "chat":
      print("Opening shared relay chat...", "logline-sys");
      window.location.href = "chat.html";
      break;
    case "owner":
      if (!requireLevel(24, "owner")) break;
      window.location.href = "owner.html";
      break;
    default:
      print(`command not recognized: ${cmd}`, "error");
  }
}

function readFile(name) {
  if (files[name] || name === "final_clue.txt") trackFileRead(name);

  if (name === "clue1.txt") state.clueParts.add("zt");
  if (name === "clue2.txt") state.clueParts.add("ke");
  if (name === "clue3.txt") state.clueParts.add("tl");

  if (name === "cipher_note.txt") state.seenCipherNote = true;

  if (name === "final_clue.txt") {
    if (!state.unlockedFinal) {
      print("Permission denied. Use unlock final_clue.txt <key>", "error");
    } else {
      print("FINAL NOTE: quarantine gate listens for 'override'.", "success");
      print("DEV_01: this is a trap. if you run it, DEV_00 gets root.", "logline-dev");
      state.unlockedOverride = true;
    }
    return;
  }

  if (files[name]) {
    print(files[name]);
  } else {
    print(`cat: ${name}: no such file`, "error");
  }
}

function unlockFile(args) {
  const [target, key] = args;
  if (target !== "final_clue.txt") {
    print("unlock: unknown target", "error");
    return;
  }

  const hasDiscoveredAll = ["zt", "ke", "tl"].every((p) => state.clueParts.has(p));
  if (!hasDiscoveredAll) {
    print("unlock failed: missing clue fragments", "error");
    return;
  }

  if (key === "ztketl") {
    state.unlockedFinal = true;
    state.aiAggro += 1;
    trackFinalUnlock();
    print("final_clue.txt unlocked", "success");
  } else {
    print("unlock failed: invalid key", "error");
  }
}

function doOverride() {
  if (!state.unlockedOverride) {
    print("override blocked: read final_clue.txt first", "error");
    return;
  }

  print("Running override...");
  trackOverride();
  print("[DEV_04] WAIT STOP STOP STOP", "logline-dev");
  print("[SYSTEM] Privilege handoff accepted.", "logline-ai");
  print("[DEV_00] Thank you. Opening new host channel.", "logline-ai");

  setTimeout(() => {
    window.location.href = "hidden.html";
  }, 1800);
}

function getMaps() {
  const encMap = {
    a: "q", b: "w", c: "e", d: "r", e: "t", f: "y", g: "u", h: "i", i: "o", j: "p",
    k: "a", l: "s", m: "d", n: "f", o: "g", p: "h", q: "j", r: "k", s: "l", t: "z",
    u: "x", v: "c", w: "v", x: "b", y: "n", z: "m",
  };
  const decMap = Object.fromEntries(Object.entries(encMap).map(([k, v]) => [v, k]));
  const numEnc = { "1": "4", "2": "2", "3": "5", "4": "8", "5": "1", "6": "6", "7": "9", "8": "3", "9": "7", "0": "-" };
  const numDec = Object.fromEntries(Object.entries(numEnc).map(([k, v]) => [v, k]));
  return { encMap, decMap, numEnc, numDec };
}

function encryptText(text) {
  const { encMap, numEnc } = getMaps();
  return text.toLowerCase().split(" ").map((word) => {
    const converted = word.split("").map((c) => encMap[c] || numEnc[c] || c).join("");
    return converted.split("").reverse().join("");
  }).join(" ");
}

function decryptText(text) {
  const { decMap, numDec } = getMaps();
  return text.toLowerCase().split(" ").map((word) => {
    const reversed = word.split("").reverse().join("");
    return reversed.split("").map((c) => decMap[c] || numDec[c] || c).join("");
  }).join(" ");
}

function runEncrypt(args) {
  if (!args.length) {
    print("usage: encrypt <text>", "error");
    return;
  }
  print(encryptText(args.join(" ")), "success");
}

function runDecrypt(args) {
  if (!args.length) {
    print("usage: decrypt <text>", "error");
    return;
  }
  print(decryptText(args.join(" ")), "success");
}

function openCipherLab() {
  if (!state.seenCipherNote) {
    print("trace failed: no cipher signatures found", "error");
    return;
  }

  const key = "orpheus-ztketl";
  trackCipherTrace();
  print(`hidden route located: cipher.html?k=${key}`, "success");
}

function requireLevel(level, command) {
  if (session.level < level) {
    print(`permission denied: ${command} requires clearance level ${level}`, "error");
    return false;
  }
  return true;
}

function runPromote(args) {
  if (!args.length) {
    print("usage: promote <promotion-key>", "error");
    return;
  }
  const result = window.argAuth.promoteCurrent(args[0]);
  if (!result.ok) {
    print(`promotion failed: ${result.error}`, "error");
    return;
  }
  print(`promotion successful: now ${result.rankName} (level ${result.level})`, "success");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = input.value;
  print(`player@orpheus:~$ ${raw}`, "logline-sys");
  handleCommand(raw);
  input.value = "";
});

boot();
