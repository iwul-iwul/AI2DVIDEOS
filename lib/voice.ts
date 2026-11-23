// Sound Booth: records voiceover with Piper, a free, open-source text-to-speech engine
// that runs on your own computer. The narrator uses one voice; characters get their
// own voices from a multi-speaker model when it's installed.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";
import type { Story } from "./types";

/** Piper from REELHOUSE_PIPER, else the copy `npm run setup:voice` installs in .venv, else whatever is on PATH. */
function findPiper(): string {
  if (process.env.REELHOUSE_PIPER) return process.env.REELHOUSE_PIPER;
  for (const p of [path.join(process.cwd(), ".venv", "bin", "piper"), path.join(process.cwd(), ".venv", "Scripts", "piper.exe")]) {
    if (fs.existsSync(p)) return p;
  }
  return "piper";
}
const PIPER = findPiper();
export const VOICES_DIR = process.env.REELHOUSE_VOICES_DIR || path.join(process.cwd(), "voices");
export const NARRATOR_VOICE = process.env.PIPER_NARRATOR_VOICE || "en_US-lessac-medium";
export const CHARACTER_VOICE = process.env.PIPER_CHARACTER_VOICE || "en_US-libritts_r-medium";
export const AUDIO_DIR = path.join(DATA_DIR, "audio");

/** Speaker ids from the multi-speaker model, spread out so characters sound different. */
const CHARACTER_SPEAKERS = [3, 61, 128, 207, 340, 512];

export interface VoiceStatus {
  enabled: boolean;
  piper: boolean;
  narrator: boolean;
  characters: boolean;
  note: string | null;
}

export interface Clip {
  file: string;
  seconds: number;
}

export interface BeatAudio {
  narration: Clip | null;
  line: Clip | null;
}

const modelPath = (name: string) => path.join(VOICES_DIR, `${name}.onnx`);

let piperOk: { at: number; ok: boolean } | null = null;

function run(args: string[], input?: string, timeoutMs = 120_000): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    let stderr = "";
    let child;
    try {
      child = spawn(PIPER, args, { stdio: ["pipe", "ignore", "pipe"] });
    } catch (err) {
      resolve({ code: -1, stderr: String(err) });
      return;
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stderr?.on("data", (d) => (stderr += String(d)));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: String(err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stderr });
    });
    if (input !== undefined) child.stdin?.end(input);
    else child.stdin?.end();
  });
}

async function piperInstalled(): Promise<boolean> {
  if (piperOk && Date.now() - piperOk.at < 60_000) return piperOk.ok;
  const { code } = await run(["--help"], undefined, 15_000);
  piperOk = { at: Date.now(), ok: code === 0 };
  return piperOk.ok;
}

export async function voiceStatus(): Promise<VoiceStatus> {
  if (process.env.REELHOUSE_VOICE === "0") {
    return { enabled: false, piper: false, narrator: false, characters: false, note: "Voiceover is turned off (REELHOUSE_VOICE=0)." };
  }
  const piper = await piperInstalled();
  const narrator = fs.existsSync(modelPath(NARRATOR_VOICE));
  const characters = fs.existsSync(modelPath(CHARACTER_VOICE));
  let note: string | null = null;
  if (!piper) note = "Piper isn't installed, so videos are silent. See the setup guide.";
  else if (!narrator) note = `The narrator voice "${NARRATOR_VOICE}" isn't in the voices folder, so videos are silent.`;
  else if (!characters) note = `Characters share the narrator's voice. Add "${CHARACTER_VOICE}" to give each one their own.`;
  return { enabled: piper && narrator, piper, narrator, characters, note };
}

/** Reads a WAV header to get its length in seconds. */
export function wavSeconds(file: string): number {
  const buf = fs.readFileSync(file);
  let byteRate = 0;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(offset + 16);
    if (id === "data") return byteRate ? Math.min(size, buf.length - offset - 8) / byteRate : 0;
    offset += 8 + size + (size % 2);
  }
  return 0;
}

async function speak(text: string, out: string, model: string, speaker?: number, lengthScale?: number): Promise<Clip> {
  const args = ["--model", modelPath(model), "--output_file", out];
  if (speaker !== undefined) args.push("--speaker", String(speaker));
  if (lengthScale !== undefined) args.push("--length_scale", String(lengthScale));
  const { code, stderr } = await run(args, text.replace(/\s+/g, " ").trim() + "\n");
  if (code !== 0 || !fs.existsSync(out)) throw new Error(`Piper failed: ${stderr.trim().split("\n").pop() ?? `exit ${code}`}`);
  return { file: path.basename(out), seconds: wavSeconds(out) };
}

/** How many speakers a Piper voice has, from its .onnx.json config. */
function speakerCount(model: string): number {
  try {
    const cfg = JSON.parse(fs.readFileSync(`${modelPath(model)}.json`, "utf8")) as { num_speakers?: number };
    return cfg.num_speakers ?? 1;
  } catch {
    return 1;
  }
}

export const jobAudioDir = (jobId: number) => path.join(AUDIO_DIR, `job-${jobId}`);

/** Records every narration and dialogue line. Returns one entry per beat. */
export async function recordVoices(jobId: number, story: Story, status: VoiceStatus): Promise<BeatAudio[]> {
  const dir = jobAudioDir(jobId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const multi = status.characters ? speakerCount(CHARACTER_VOICE) : 1;
  const voiceFor = (who: number): { model: string; speaker?: number; lengthScale?: number } => {
    if (status.characters) {
      const ids = multi > 1 ? CHARACTER_SPEAKERS.map((s) => s % multi) : [0];
      return { model: CHARACTER_VOICE, speaker: multi > 1 ? ids[who % ids.length] : undefined };
    }
    // One voice for everyone: vary the pace a little so characters are told apart.
    return { model: NARRATOR_VOICE, lengthScale: [0.92, 1.12, 1.0][who % 3] };
  };

  const out: BeatAudio[] = [];
  for (const [i, beat] of story.beats.entries()) {
    const narration = beat.narration.trim() ? await speak(beat.narration, path.join(dir, `n${i}.wav`), NARRATOR_VOICE) : null;
    let line: Clip | null = null;
    if (beat.speaker >= 0 && beat.line.trim()) {
      const v = voiceFor(beat.speaker);
      line = await speak(beat.line, path.join(dir, `l${i}.wav`), v.model, v.speaker, v.lengthScale);
    }
    out.push({ narration, line });
  }
  return out;
}
