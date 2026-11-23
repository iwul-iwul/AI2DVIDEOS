// Art Studio: turns story beats (and their recorded voice lines) into timed, staged scenes.
// Deterministic on purpose: same story in, same look out.

import { FPS, type AudioCue, type Scene, type Story, type VideoProps } from "../types";

const CAMERAS: Scene["camera"][] = ["push", "pan-left", "still", "pan-right"];
const NARRATION_START = 6;
const GAP = 8;
const TAIL = 18;

/** Reading time: about 3 words per second for narration plus dialogue, with a floor and a ceiling. */
function readingFrames(narration: string, line: string): number {
  const words = `${narration} ${line}`.split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(8, Math.max(3, words / 3 + 1.2)) * FPS);
}

export interface BeatVoice {
  narration: { file: string; seconds: number } | null;
  line: { file: string; seconds: number } | null;
}

const cue = (c: { file: string; seconds: number } | null): AudioCue | null =>
  c && c.seconds > 0 ? { src: c.file, frames: Math.ceil(c.seconds * FPS) } : null;

export function designVideo(story: Story, voices?: BeatVoice[]): VideoProps {
  const scenes: Scene[] = story.beats.map((beat, i) => {
    const narrationAudio = cue(voices?.[i]?.narration ?? null);
    const lineAudio = cue(voices?.[i]?.line ?? null);
    const lineStart = narrationAudio ? NARRATION_START + narrationAudio.frames + GAP : 10;
    const voiced = Math.max(
      narrationAudio ? NARRATION_START + narrationAudio.frames + TAIL : 0,
      lineAudio ? lineStart + lineAudio.frames + TAIL : 0,
    );
    return {
      ...beat,
      // Keep the cast valid and on screen.
      cast: beat.cast.filter((c) => c.who >= 0 && c.who < story.characters.length).slice(0, 3),
      speaker: beat.speaker >= 0 && beat.speaker < story.characters.length ? beat.speaker : -1,
      camera: CAMERAS[i % CAMERAS.length],
      durationInFrames: Math.max(readingFrames(beat.narration, beat.line), voiced),
      lineStart,
      narrationAudio,
      lineAudio,
    };
  });
  return {
    title: story.title,
    characters: story.characters.slice(0, 3),
    titleFrames: Math.round(2.2 * FPS),
    endFrames: Math.round(2.5 * FPS),
    scenes,
    audioBase: null,
  };
}

export const totalFrames = (v: VideoProps) => v.titleFrames + v.endFrames + v.scenes.reduce((s, x) => s + x.durationInFrames, 0);
export { NARRATION_START };
