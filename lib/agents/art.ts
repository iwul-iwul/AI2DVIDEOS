// Art Studio: turns the Script Room's story beats into timed, staged scenes.
// Deterministic on purpose: same story in, same look out.

import { FPS, type Scene, type Story, type VideoProps } from "../types";

const CAMERAS: Scene["camera"][] = ["push", "pan-left", "still", "pan-right"];

/** Reading time: about 3 words per second for narration plus dialogue, with a floor and a ceiling. */
function secondsFor(narration: string, line: string): number {
  const words = `${narration} ${line}`.split(/\s+/).filter(Boolean).length;
  return Math.min(8, Math.max(3, words / 3 + 1.2));
}

export function designVideo(story: Story): VideoProps {
  const scenes: Scene[] = story.beats.map((beat, i) => ({
    ...beat,
    // Keep the cast valid and on screen.
    cast: beat.cast.filter((c) => c.who >= 0 && c.who < story.characters.length).slice(0, 3),
    speaker: beat.speaker >= 0 && beat.speaker < story.characters.length ? beat.speaker : -1,
    camera: CAMERAS[i % CAMERAS.length],
    durationInFrames: Math.round(secondsFor(beat.narration, beat.line) * FPS),
  }));
  return {
    title: story.title,
    characters: story.characters.slice(0, 3),
    titleFrames: Math.round(2.2 * FPS),
    endFrames: Math.round(2.5 * FPS),
    scenes,
  };
}

export const totalFrames = (v: VideoProps) => v.titleFrames + v.endFrames + v.scenes.reduce((s, x) => s + x.durationInFrames, 0);
