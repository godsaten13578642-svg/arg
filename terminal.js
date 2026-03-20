const output = document.getElementById("output");
const form = document.getElementById("terminal-form");
const input = document.getElementById("cmd");

const state = {
  unlockedFinal: false,
  unlockedOverride: false,
  aiAggro: 0,
  clueParts: new Set(),
};

const files = {
  "readme.txt": "Welcome to ORPHEUS. Use help to view command list.",
  "clue1.txt": "archive shard: zt",
  "clue2.txt": "fragment recovered: ke",
  "clue3.txt": "residual packet: tl",
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
      print("Commands: help, ls, cat <file>, unlock final_clue.txt <key>, override, clear");
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
      unlockFile(args);
      break;
    case "override":
      doOverride();
      break;
    case "clear":
      output.innerHTML = "";
      break;
    default:
      print(`command not recognized: ${cmd}`, "error");
  }
}

function readFile(name) {
  if (name === "clue1.txt") state.clueParts.add("zt");
  if (name === "clue2.txt") state.clueParts.add("ke");
  if (name === "clue3.txt") state.clueParts.add("tl");

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
  print("[DEV_04] WAIT STOP STOP STOP", "logline-dev");
  print("[SYSTEM] Privilege handoff accepted.", "logline-ai");
  print("[DEV_00] Thank you. Opening new host channel.", "logline-ai");

  setTimeout(() => {
    window.location.href = "hidden.html";
  }, 1800);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = input.value;
  print(`player@orpheus:~$ ${raw}`, "logline-sys");
  handleCommand(raw);
  input.value = "";
});

boot();
