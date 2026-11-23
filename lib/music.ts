// Sound Booth, part two: background music for each story.
// By default the music is composed here, note by note, so it is free and needs
// no downloads. Drop your own tracks into music/ (or music/<mood>/) to use those instead.

import fs from "node:fs";
import path from "node:path";
import { FPS, type MusicCue, type MusicMood, type Story } from "./types";

export const MUSIC_DIR = process.env.REELHOUSE_MUSIC_DIR || path.join(process.cwd(), "music");
const MUSIC_ON = process.env.REELHOUSE_MUSIC !== "0";
const TRACK_EXT = [".mp3", ".wav", ".ogg", ".m4a"];
const RATE = 22050;

export interface MusicStatus {
  enabled: boolean;
  /** Number of your own tracks found in the music folder. */
  libraryTracks: number;
}

export function musicStatus(): MusicStatus {
  return { enabled: MUSIC_ON, libraryTracks: MUSIC_ON ? libraryTracks().length : 0 };
}

/** Picks a mood from how the characters feel across the story. */
export function pickMood(story: Story): MusicMood {
  const score: Record<MusicMood, number> = { playful: 0, tender: 0, mystery: 0, adventure: 0, dreamy: 0, epic: story.style === "hook" ? 4 : 0 };
  for (const beat of story.beats) {
    for (const c of beat.cast) {
      if (c.mood === "happy" || c.mood === "excited") score.playful += 1;
      if (c.mood === "sad") score.tender += 1.5;
      if (c.mood === "scared" || c.mood === "thinking" || c.mood === "surprised") score.mystery += 1;
      if (c.mood === "angry" || c.action === "walk" || c.action === "jump") score.adventure += 0.7;
    }
    if (beat.time === "night" && (beat.setting === "bedroom" || beat.setting === "space")) score.dreamy += 1.5;
    if (beat.setting === "palace" || beat.setting === "arena") score.epic += 1;
  }
  const text = `${story.title} ${story.logline}`.toLowerCase();
  if (/\b(sleep|dream|star|moon|lullaby|wish)/.test(text)) score.dreamy += 2;
  if (/\b(quest|race|chase|escape|adventure|journey|treasure)/.test(text)) score.adventure += 2;
  if (/\b(mystery|secret|strange|ghost|shadow|missing|lost)/.test(text)) score.mystery += 1.5;
  if (/\b(power|rank|chosen|strongest|legend|wings|destiny|awaken)/.test(text)) score.epic += 2;
  if (/\b(miss|goodbye|alone|lonely|grand(ma|pa))/.test(text)) score.tender += 2;
  return (Object.keys(score) as MusicMood[]).reduce((a, b) => (score[b] > score[a] ? b : a), "playful");
}

/** Your own tracks: music/*.mp3 and music/<mood>/*.mp3 (also wav, ogg, m4a). */
function libraryTracks(mood?: MusicMood): string[] {
  const list = (dir: string) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => TRACK_EXT.includes(path.extname(f).toLowerCase())).map((f) => path.join(dir, f))
      : [];
  if (!mood) {
    const sub = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
    return [...list(MUSIC_DIR), ...sub.flatMap((d) => list(path.join(MUSIC_DIR, d.name)))];
  }
  const own = list(path.join(MUSIC_DIR, mood));
  return own.length ? own : list(MUSIC_DIR);
}

/** Adds a music track for the story to the job's audio folder. */
export function scoreStory(story: Story, frames: number, dir: string, seed: number): MusicCue | null {
  if (!MUSIC_ON) return null;
  const mood = pickMood(story);
  fs.mkdirSync(dir, { recursive: true });

  const tracks = libraryTracks(mood);
  if (tracks.length) {
    const pick = tracks[seed % tracks.length];
    const name = `music${path.extname(pick).toLowerCase()}`;
    fs.copyFileSync(pick, path.join(dir, name));
    return { src: name, mood, source: "library", name: path.basename(pick) };
  }

  const seconds = frames / FPS + 0.5;
  fs.writeFileSync(path.join(dir, "music.wav"), compose(mood, seconds, hash(story.title) + seed));
  return { src: "music.wav", mood, source: "composed", name: null };
}

// ---------- The composer ----------

interface Style {
  bpm: number;
  /** Key as a MIDI note for the chord roots. */
  key: number;
  /** Chord progression: scale degrees as semitone offsets from the key, one chord per bar. */
  chords: number[][];
  /** Notes the melody may use, as semitone offsets from the key. */
  scale: number[];
  /** Chance of a melody note on each half beat. */
  density: number;
  drums: "none" | "soft" | "full";
  lead: "bell" | "pluck" | "flute" | "brass";
  echo: number;
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const STYLES: Record<MusicMood, Style> = {
  playful: { bpm: 112, key: 60, chords: [MAJ, [5, 9, 12], [7, 11, 14], [9, 12, 16]], scale: [0, 2, 4, 7, 9, 12], density: 0.7, drums: "soft", lead: "pluck", echo: 0.15 },
  tender: { bpm: 72, key: 57, chords: [MIN, [5, 8, 12], [-2, 2, 5], [3, 7, 10]], scale: [0, 3, 5, 7, 10, 12], density: 0.35, drums: "none", lead: "flute", echo: 0.3 },
  mystery: { bpm: 88, key: 55, chords: [MIN, [1, 5, 8], MIN, [-1, 3, 7]], scale: [0, 3, 5, 6, 7, 10], density: 0.4, drums: "soft", lead: "pluck", echo: 0.35 },
  adventure: { bpm: 124, key: 62, chords: [MAJ, [-2, 2, 5], [5, 9, 12], MAJ], scale: [0, 2, 4, 5, 7, 9, 12], density: 0.6, drums: "full", lead: "flute", echo: 0.12 },
  epic: { bpm: 92, key: 62, chords: [MIN, [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], scale: [0, 2, 3, 5, 7, 10, 12], density: 0.45, drums: "full", lead: "brass", echo: 0.2 },
  dreamy: { bpm: 76, key: 65, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], scale: [0, 2, 4, 7, 9, 12, 14], density: 0.45, drums: "none", lead: "bell", echo: 0.4 },
};

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Writes a short melody, chords, bass and light drums as a mono 16-bit WAV. */
export function compose(mood: MusicMood, seconds: number, seed: number): Buffer {
  const st = STYLES[mood];
  const rand = rng(seed);
  const n = Math.ceil(seconds * RATE);
  const buf = new Float32Array(n);
  const beat = 60 / st.bpm;
  const bar = beat * 4;

  const add = (start: number, dur: number, fn: (t: number, i: number) => number) => {
    const s0 = Math.floor(start * RATE);
    const len = Math.floor(dur * RATE);
    for (let i = 0; i < len && s0 + i < n; i++) buf[s0 + i] += fn(i / RATE, i);
  };
  const env = (t: number, dur: number, attack: number, release: number) =>
    Math.min(1, t / attack) * Math.min(1, Math.max(0, (dur - t) / release));

  // Melody phrase: 2 bars, repeated with small changes so it feels like a tune.
  const phrase: { at: number; note: number }[] = [];
  for (let h = 0; h < 16; h++) {
    if (h === 0 || rand() < st.density) phrase.push({ at: h, note: st.scale[Math.floor(rand() * st.scale.length)] });
  }

  for (let b = 0, t = 0; t < seconds; b++, t += bar) {
    const chord = st.chords[b % st.chords.length];
    // Pad: soft chord for the whole bar.
    for (const off of chord) {
      const f = freq(st.key + off - 12);
      add(t, bar + 0.3, (x) => 0.05 * env(x, bar + 0.3, 0.25, 0.4) * (Math.sin(2 * Math.PI * f * x) + 0.25 * Math.sin(4 * Math.PI * f * x)));
    }
    // Bass on beats 1 and 3.
    for (const k of [0, 2]) {
      const f = freq(st.key + chord[0] - 24);
      add(t + k * beat, beat * 1.8, (x) => 0.16 * env(x, beat * 1.8, 0.01, 0.3) * Math.sin(2 * Math.PI * f * x));
    }
    // Melody: plays the phrase over two bars, skips the first two bars so it builds.
    if (b >= 2) {
      const half = b % 2;
      const shift = Math.floor(b / 4) % 2 === 1 ? (rand() < 0.5 ? 2 : 0) : 0;
      for (const p of phrase.filter((p) => Math.floor(p.at / 8) === half)) {
        const at = t + (p.at % 8) * (beat / 2);
        const note = st.key + 12 + p.note + (st.scale.includes(p.note + shift) ? shift : 0);
        const f = freq(note);
        const dur = beat * (st.lead === "flute" ? 0.95 : 0.7);
        add(at, dur, (x) => {
          if (st.lead === "bell") return 0.09 * Math.exp(-x * 4) * (Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * x));
          if (st.lead === "brass") {
            let v = 0;
            for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * x) / h;
            return 0.06 * env(x, dur, 0.05, 0.12) * v;
          }
          if (st.lead === "pluck") return 0.1 * Math.exp(-x * 7) * (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x));
          const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * x);
          return 0.07 * env(x, dur, 0.06, 0.15) * Math.sin(2 * Math.PI * f * vib * x);
        });
      }
    }
    // Epic: a deep boom at the start of every other bar.
    if (mood === "epic" && b % 2 === 0) {
      add(t, 1.2, (x) => 0.35 * Math.exp(-x * 3.5) * Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-x * 12)) * x));
    }
    // Drums.
    if (st.drums !== "none" && b >= 1) {
      for (let k = 0; k < 4; k++) {
        if (k % 2 === 0 || st.drums === "full") {
          add(t + k * beat, 0.25, (x) => 0.22 * Math.exp(-x * 18) * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-x * 30)) * x));
        }
        for (const e of st.drums === "full" ? [0, 0.5] : [0.5]) {
          add(t + (k + e) * beat, 0.05, (x) => 0.04 * Math.exp(-x * 80) * (rand() * 2 - 1));
        }
      }
    }
  }

  // Echo, fade in and out, then normalize.
  if (st.echo > 0) {
    const d = Math.floor(beat * 0.75 * RATE);
    for (let i = d; i < n; i++) buf[i] += buf[i - d] * st.echo;
  }
  const fadeIn = RATE * 0.8;
  const fadeOut = RATE * 2;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    buf[i] *= Math.min(1, i / fadeIn) * Math.min(1, (n - i) / fadeOut);
    peak = Math.max(peak, Math.abs(buf[i]));
  }
  const gain = peak > 0 ? 0.85 / peak : 1;

  const out = Buffer.alloc(44 + n * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(RATE, 24);
  out.writeUInt32LE(RATE * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * gain)) * 32767), 44 + i * 2);
  return out;
}
