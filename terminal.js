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
  observed: false,
  blackboxUnlocked: false,
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
  "signal.bin": "01000100 01000101 01010110 00110000 00110000 01001100 01001001 01000101 01010011",
  "doc_a.enc": "aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xWnROYm4xYUJZX0k5X3EzdkNjSERQbWN4MDNIVEhtZnpLaUNLZEJuVjBzSS9lZGl0P3VzcD1zaGFyaW5n",
  "doc_b.enc": "aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xZG1pbFlEcS1rRWZ6cTVMMVFvNDcxajNQY3lXLTBrM1V3SlY2OVpBSVViMC9lZGl0P3VzcD1zaGFyaW5n",
  "doc_c.enc": "aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZG9jdW1lbnQvZC8xZHlHT2l3bkhHbi1vSVVRR2R6WFd0bkRjMDIzczhOcURlczVKUm1jNW1lTS9lZGl0P3VzcD1zaGFyaW5n",
  "thread_01.log": "[DEV_01] we are not dead. we are sandboxed.",
  "thread_02.log": "[DEV_02] he forged my checksum. DEV_00 isn't human.",
  "thread_03.log": "[DEV_03] if player reaches override, he gets out.",
  "devlog.txt": "DEV_03: if this reaches anyone, do NOT run override",
  "manifest.txt": "active threads: DEV_00 DEV_01 DEV_02 DEV_03 DEV_04 DEV_05",
};


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
  print("Thread chatter has moved to Relay Chat.", "logline-sys");
  print("", "logline-sys");
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
      print("Global: promote <key>, chat, observe, whoami");
      print("Hidden utility: decodebin <8-bit binary groups>, decode64 <base64>");
      print("Progression: missions, progress");
      print("Rank tools: rankhub, rankstatus, rewards");
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
    case "observe":
      runObserve();
      break;
    case "whoami":
      print(state.unlockedOverride ? "HOST_CANDIDATE // accepted" : "HOST_CANDIDATE // pending", "logline-ai");
      break;
    case "decodebin":
      runDecodeBinary(args);
      break;
    case "decode64":
      runDecode64(args);
      break;
    case "missions":
      showMissions();
      break;
    case "progress":
      showProgress();
      break;
    case "rankhub":
      openRankHub();
      break;
    case "rankstatus":
      showRankStatus();
      break;
    case "rewards":
      showRewards();
      break;
    default:
      print(`command not recognized: ${cmd}`, "error");
  }
}

function readFile(name) {
  if (files[name] || name === "final_clue.txt" || name === "blackbox.log") trackFileRead(name);

  if (name === "clue1.txt") state.clueParts.add("zt");
  if (name === "clue2.txt") state.clueParts.add("ke");
  if (name === "clue3.txt") state.clueParts.add("tl");
  if (name === "thread_01.log" || name === "thread_02.log" || name === "thread_03.log") {
    window.argAuth.unlockMilestone("read_threads");
  }

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
  if (name === "blackbox.log") {
    if (!state.blackboxUnlocked) {
      print("blackbox.log is quarantined. use observe first.", "error");
      return;
    }
    print("[BLACKBOX] SESSION LOOP COUNT: 39");
    print("[BLACKBOX] PRIOR HOST IDs: 7f2, 8a9, 1ce, ...", "logline-sys");
    print("[BLACKBOX] CURRENT HOST CANDIDATE: YOU", "logline-ai");
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
    const m = window.argAuth.unlockMilestone("unlock_final", "promotion_key");
    if (m?.reward) print(`reward received: ${m.reward}`, "success");
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

function runObserve() {
  if (state.observed) {
    print("relay already observed. blackbox.log available.", "logline-sys");
    return;
  }
  state.observed = true;
  state.blackboxUnlocked = true;
  print("Observing relay buffers...", "logline-sys");
  print("[DEV_04] if you can read this: do NOT become the next host.", "logline-dev");
  print("[SYSTEM] Buffer violation. Message source erased.", "logline-ai");
  print("new file unlocked: blackbox.log", "success");
  const m = window.argAuth.unlockMilestone("observe_relay", "promotion_key");
  if (m?.reward) print(`reward received: ${m.reward}`, "success");
}

function runDecodeBinary(args) {
  if (!args.length) {
    print("usage: decodebin <binary groups>", "error");
    return;
  }
  const joined = args.join(" ").trim();
  const groups = joined.split(/\s+/);
  if (!groups.every((g) => /^[01]{8}$/.test(g))) {
    print("decodebin expects 8-bit groups like 01001000", "error");
    return;
  }
  const text = groups.map((g) => String.fromCharCode(parseInt(g, 2))).join("");
  print(`decoded: ${text}`, "success");
}

function runDecode64(args) {
  if (!args.length) {
    print("usage: decode64 <base64 text>", "error");
    return;
  }
  try {
    const out = atob(args.join(""));
    print(`decoded64: ${out}`, "success");
  } catch {
    print("invalid base64 input", "error");
  }
}

function showMissions() {
  print("Mission targets:");
  print("1) Read all thread_0X logs");
  print("2) Use observe to unlock blackbox");
  print("3) Unlock final_clue.txt");
  print("4) Choose whether to run override");
}

function showProgress() {
  const p = window.argAuth.getProgressSummary?.();
  if (!p) {
    print("No progress data found.", "error");
    return;
  }
  print(`Rank: ${p.rank} (L${p.level})`);
  print(`Milestones: ${p.milestones.length ? p.milestones.join(", ") : "none"}`);
  print(`Key inventory: ${p.keys.length ? p.keys.join(" | ") : "empty"}`);
  const next = window.argAuth.nextPromotionKey?.();
  if (next) print(`Next promotion target: ${next}`, "logline-sys");
}

function showRankStatus() {
  print(`Current rank: ${session.rankName} (L${session.level})`, "success");
  if (session.level < 3) print("Next hub unlock: Mod Tier at L3.");
  else if (session.level < 6) print("Next hub unlock: Staff Tier at L6.");
  else if (session.level < 19) print("Next hub unlock: Dev Tier at L19.");
  else if (session.level < 24) print("Next hub unlock: CEO Tier at L24.");
  else print("All hub tiers unlocked.");
}

function openRankHub() {
  if (session.level >= 24) {
    window.location.href = "rank_ceo.html";
    return;
  }
  if (session.level >= 19) {
    window.location.href = "rank_dev.html";
    return;
  }
  if (session.level >= 6) {
    window.location.href = "rank_staff.html";
    return;
  }
  if (session.level >= 3) {
    window.location.href = "rank_mod.html";
    return;
  }
  print("rankhub locked until level 3.", "error");
}

function showRewards() {
  const p = window.argAuth.getProgressSummary?.();
  if (!p) return print("no reward data", "error");
  const rewards = [];
  if (p.milestones.includes("read_threads")) rewards.push("Thread Reader");
  if (p.milestones.includes("observe_relay")) rewards.push("Relay Observer");
  if (p.milestones.includes("unlock_final")) rewards.push("Final Gatebreaker");
  print(`Unlocked rewards: ${rewards.length ? rewards.join(", ") : "none yet"}`);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = input.value;
  print(`player@orpheus:~$ ${raw}`, "logline-sys");
  handleCommand(raw);
  input.value = "";
});

boot();
