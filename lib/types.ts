// Shared types for the studio pipeline and the video composition.

export const ICONS = [
  "bulb",
  "chart",
  "clock",
  "star",
  "check",
  "rocket",
  "heart",
  "chat",
  "warning",
  "money",
] as const;
export type IconName = (typeof ICONS)[number];

export const MOODS = ["happy", "thinking", "excited", "pointing"] as const;
export type Mood = (typeof MOODS)[number];

export const SHOT_KINDS = ["hook", "point", "list", "outro"] as const;
export type ShotKind = (typeof SHOT_KINDS)[number];

/** An idea sitting in the queue, produced by the Research Desk. */
export interface Idea {
  id: number;
  topic: string;
  title: string;
  hook: string;
  angle: string;
  status: "queued" | "in_production" | "done";
  createdAt: string;
}

/** One shot of the script, produced by the Script Room. */
export interface Shot {
  kind: ShotKind;
  /** Big text shown on screen. Short. */
  onScreen: string;
  /** Supporting line (caption under the big text, or list items joined by "|"). */
  line: string;
  icon: IconName;
  mood: Mood;
}

export interface Script {
  title: string;
  shots: Shot[];
  caption: string;
  hashtags: string[];
}

export interface Palette {
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
  card: string;
}

/** A fully designed scene, produced by the Art Studio and drawn by Remotion. */
export interface Scene extends Shot {
  durationInFrames: number;
  palette: Palette;
  layout: "center" | "left" | "right";
}

export interface VideoProps {
  title: string;
  scenes: Scene[];
  [key: string]: unknown;
}

export const STAGES = ["script", "art", "edit", "ship"] as const;
export type Stage = (typeof STAGES)[number];

export interface Job {
  id: number;
  ideaId: number;
  stage: Stage | "done" | "failed";
  /** 0 to 1, used by the Edit Bay while rendering. */
  progress: number;
  script: Script | null;
  video: VideoProps | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
