// One-click launcher: gets everything ready, starts Reelhouse and opens it in the browser.
// Started by "Start Reelhouse.bat" (Windows) or "Start Reelhouse.command" (Mac).
// Safe to run every time: steps that are already done are skipped.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const win = process.platform === "win32";
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const URL_ = `http://localhost:${PORT}`;

const say = (msg) => console.log(`\n== ${msg}`);
const warn = (msg) => console.log(`\n!! ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win, ...opts });
  return r.status === 0;
}

function has(cmd) {
  return spawnSync(cmd, ["--version"], { stdio: "ignore", shell: win }).status === 0;
}

async function ollamaTags() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok ? ((await res.json()).models ?? []).map((m) => m.name) : null;
  } catch {
    return null;
  }
}

function openBrowser(url) {
  const [cmd, args] = win ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
  child.unref();
}

/** Newest modification time of the app's source, to know when a rebuild is needed. */
function newestSource() {
  let newest = 0;
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else newest = Math.max(newest, fs.statSync(p).mtimeMs);
    }
  };
  for (const d of ["app", "components", "lib", "remotion"]) walk(d);
  for (const f of ["package.json", "next.config.ts", "instrumentation.ts"]) if (fs.existsSync(f)) newest = Math.max(newest, fs.statSync(f).mtimeMs);
  return newest;
}

async function main() {
  console.log("Starting Reelhouse. The first time takes a while (downloads); after that it's quick.");

  // 1. The app itself.
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    warn(`Reelhouse needs Node.js 20 or newer (you have ${process.versions.node}). Opening the download page.`);
    openBrowser("https://nodejs.org");
    process.exit(1);
  }
  const lock = fs.existsSync("package-lock.json") ? fs.statSync("package-lock.json").mtimeMs : 0;
  const installed = fs.existsSync("node_modules/.package-lock.json") ? fs.statSync("node_modules/.package-lock.json").mtimeMs : -1;
  if (installed < lock) {
    say("Installing the app (a few minutes, first time only)...");
    if (!run("npm", ["install", "--no-audit", "--no-fund"])) {
      warn("npm install failed. Check your internet connection and try again.");
      process.exit(1);
    }
  }

  // 2. The story writer (Ollama).
  let tags = await ollamaTags();
  if (!tags && has("ollama")) {
    say("Starting Ollama...");
    const ollama = spawn("ollama", ["serve"], { stdio: "ignore", detached: true, shell: win });
    ollama.on("error", () => {});
    ollama.unref();
    for (let i = 0; i < 20 && !tags; i++) {
      await sleep(1000);
      tags = await ollamaTags();
    }
  }
  if (!tags) {
    warn("Ollama isn't installed or isn't running, so stories will use the simple demo templates. Install it from https://ollama.com/download, then start Reelhouse again.");
  } else if (!tags.some((t) => t === OLLAMA_MODEL || t === `${OLLAMA_MODEL}:latest`)) {
    say(`Downloading the story-writing model ${OLLAMA_MODEL} (about 4.7 GB, first time only)...`);
    if (!run("ollama", ["pull", OLLAMA_MODEL])) warn("The model download didn't finish. Reelhouse will use demo stories until it does.");
  }

  // 3. Voices (Piper).
  const piper = path.join(".venv", win ? "Scripts" : "bin", win ? "piper.exe" : "piper");
  const voicesReady = fs.existsSync("voices") && fs.readdirSync("voices").filter((f) => f.endsWith(".onnx")).length >= 2;
  if (process.env.REELHOUSE_VOICE !== "0" && (!fs.existsSync(piper) || !voicesReady)) {
    say("Installing the voices (about 200 MB, first time only)...");
    if (!run(process.execPath, ["scripts/setup-voice.mjs"], { shell: false })) {
      warn("Voices couldn't be installed, so videos will have music but no narration. Usually Python is missing: get it from https://www.python.org/downloads/ (on Windows tick 'Add python.exe to PATH'), then start Reelhouse again.");
    }
  }

  // 4. Build when the code changed.
  const built = fs.existsSync(".next/BUILD_ID") ? fs.statSync(".next/BUILD_ID").mtimeMs : 0;
  if (built < newestSource()) {
    say("Preparing the app (a minute or two)...");
    if (!run("npm", ["run", "build"])) {
      warn("The build failed. Please send the messages above to whoever set this up.");
      process.exit(1);
    }
  }

  // 5. Start and open the browser.
  say(`Reelhouse is starting at ${URL_}`);
  const server = spawn("npm", ["start", "--", "-p", String(PORT)], { stdio: "inherit", shell: win });
  const stop = () => {
    server.kill();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.on("exit", (code) => {
    if (code) warn(`Reelhouse stopped (code ${code}). If port ${PORT} is busy, close the other Reelhouse window and try again.`);
    process.exit(code ?? 0);
  });

  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    try {
      const res = await fetch(`${URL_}/api/state`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        openBrowser(URL_);
        console.log(`\nReelhouse is running at ${URL_}`);
        console.log("Keep this window open while you use it (autopilot only works while it's open).");
        console.log("To stop Reelhouse, close this window or press Ctrl + C.\n");
        return;
      }
    } catch {
      // still starting
    }
  }
  warn(`Reelhouse didn't answer yet. Try opening ${URL_} in your browser.`);
}

main();
