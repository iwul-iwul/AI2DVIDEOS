// Art Studio: turns the Script Room's shot list into designed 2D scenes.
// Deterministic on purpose: same script in, same look out.

import { FPS, type Palette, type Scene, type Script } from "../types";

export const PALETTES: Palette[] = [
  { bg: "#ffe9a8", bg2: "#ffc46b", ink: "#2a1b3d", accent: "#ff6b6b", card: "#fff8e6" },
  { bg: "#c9f2e7", bg2: "#7ad3c1", ink: "#12343b", accent: "#ffb703", card: "#f1fffb" },
  { bg: "#dcd6ff", bg2: "#a99bff", ink: "#1f1747", accent: "#ff7eb6", card: "#f6f4ff" },
  { bg: "#ffd6d6", bg2: "#ff9f9f", ink: "#3b1218", accent: "#4dabf7", card: "#fff4f4" },
  { bg: "#d4f1ff", bg2: "#8fd3ff", ink: "#0b2545", accent: "#ffd23f", card: "#f2fbff" },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Reading time: about 3.2 words per second, with a floor and a ceiling. */
function secondsFor(text: string, kind: string): number {
  const words = text.split(/[\s|]+/).filter(Boolean).length;
  const base = kind === "hook" ? 2.6 : kind === "outro" ? 3 : 2.4;
  return Math.min(7, Math.max(base, words / 3.2 + 1));
}

export function designScenes(script: Script): Scene[] {
  const start = hash(script.title) % PALETTES.length;
  const layouts: Scene["layout"][] = ["center", "right", "left"];
  return script.shots.map((shot, i) => {
    const palette = PALETTES[(start + i) % PALETTES.length];
    const seconds = secondsFor(`${shot.onScreen} ${shot.line}`, shot.kind);
    return {
      ...shot,
      palette,
      layout: shot.kind === "hook" || shot.kind === "outro" ? "center" : layouts[i % layouts.length],
      durationInFrames: Math.round(seconds * FPS),
    };
  });
}
