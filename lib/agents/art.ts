// Art Studio: turns story beats (and their recorded voice lines) into timed, staged scenes.
// Deterministic on purpose: same story in, same look out.

import { FPS, type AudioCue, type Scene, type Story, type VideoProps } from "../types";

const CAMERAS: Scene["camera"][] = ["push", "pan-left", "still", "pan-right"];
const HOOK_CAMERAS: Scene["camera"][] = ["push", "close", "pan-left", "close", "pan-right", "push"];

/** Timing per style: the hook style cuts fast, the cozy style lingers. */
const PACE = {
  cozy: { start: 6, gap: 8, tail: 18, min: 3, max: 8, pad: 1.2 },
  hook: { start: 3, gap: 4, tail: 7, min: 1.8, max: 5, pad: 0.6 },
};
const NARRATION_START = PACE.cozy.start;

/** Reading time: about 3 words per second for narration plus dialogue, with a floor and a ceiling. */
function readingFrames(narration: string, line: string, pace: (typeof PACE)["cozy"]): number {
  const words = `${narration} ${line}`.split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(pace.max, Math.max(pace.min, words / 3 + pace.pad)) * FPS);
}

export interface BeatVoice {
  narration: { file: string; seconds: number } | null;
  line: { file: string; seconds: number } | null;
}

const cue = (c: { file: string; seconds: number } | null): AudioCue | null =>
  c && c.seconds > 0 ? { src: c.file, frames: Math.ceil(c.seconds * FPS) } : null;

export function designVideo(story: Story, voices?: BeatVoice[]): VideoProps {
  const style = story.style ?? "cozy";
  const pace = PACE[style];
  const scenes: Scene[] = story.beats.map((beat, i) => {
    const narrationAudio = cue(voices?.[i]?.narration ?? null);
    const lineAudio = cue(voices?.[i]?.line ?? null);
    const lineStart = narrationAudio
      ? pace.start + narrationAudio.frames + pace.gap
      : style === "hook"
        ? Math.round(readingFrames(beat.narration, "", pace) * 0.6)
        : 10;
    const voiced = Math.max(
      narrationAudio ? pace.start + narrationAudio.frames + pace.tail : 0,
      lineAudio ? lineStart + lineAudio.frames + pace.tail : 0,
    );
    // Hook style: close-ups on big emotions.
    const big = beat.cast.some((c) => c.mood === "surprised" || c.mood === "scared" || c.mood === "excited");
    const camera = style === "hook" ? (big && beat.cast.length <= 2 ? "close" : HOOK_CAMERAS[i % HOOK_CAMERAS.length]) : CAMERAS[i % CAMERAS.length];
    return {
      ...beat,
      // Keep the cast valid and on screen.
      cast: beat.cast.filter((c) => c.who >= 0 && c.who < story.characters.length).slice(0, 3),
      speaker: beat.speaker >= 0 && beat.speaker < story.characters.length ? beat.speaker : -1,
      camera,
      durationInFrames: Math.max(readingFrames(beat.narration, beat.line, pace), voiced),
      narrationStart: pace.start,
      lineStart,
      narrationAudio,
      lineAudio,
    };
  });
  return {
    title: story.title,
    characters: story.characters.slice(0, 3),
    // The hook style opens straight on the first line to grab viewers in the first second.
    titleFrames: style === "hook" ? 0 : Math.round(2.2 * FPS),
    endFrames: Math.round((style === "hook" ? 2 : 2.5) * FPS),
    style,
    scenes,
    audioBase: null,
  };
}

export const totalFrames = (v: VideoProps) => v.titleFrames + v.endFrames + v.scenes.reduce((s, x) => s + x.durationInFrames, 0);
export { NARRATION_START };
