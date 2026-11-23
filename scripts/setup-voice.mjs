// One-command voice setup: installs Piper (free, open-source text-to-speech) into .venv
// and downloads the narrator and character voices into ./voices.
// Needs Python 3.9 or newer. Run with: npm run setup:voice
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VOICES = [process.env.PIPER_NARRATOR_VOICE || "en_US-lessac-medium", process.env.PIPER_CHARACTER_VOICE || "en_US-libritts_r-medium"];
const win = process.platform === "win32";
const venvPython = path.join(".venv", win ? "Scripts" : "bin", win ? "python.exe" : "python");

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  return r.status === 0;
}

function findPython() {
  for (const [cmd, args] of [["python3", []], ["python", []], ["py", ["-3"]]]) {
    const r = spawnSync(cmd, [...args, "--version"], { encoding: "utf8" });
    if (r.status === 0) return [cmd, args];
  }
  return null;
}

if (!fs.existsSync(venvPython)) {
  const py = findPython();
  if (!py) {
    console.error("\nPython wasn't found. Install it from https://www.python.org/downloads/ (tick 'Add python.exe to PATH' on Windows), then run this again.");
    process.exit(1);
  }
  if (!run(py[0], [...py[1], "-m", "venv", ".venv"])) process.exit(1);
}
if (!run(venvPython, ["-m", "pip", "install", "--upgrade", "piper-tts"])) process.exit(1);
fs.mkdirSync("voices", { recursive: true });
if (!run(venvPython, ["-m", "piper.download_voices", ...VOICES, "--download-dir", "voices"])) process.exit(1);
console.log("\nVoices are ready. Restart Reelhouse and the Sound Booth will show 'Voiceover on'.");
