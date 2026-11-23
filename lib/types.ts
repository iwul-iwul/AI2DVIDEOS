// Shared types for the studio pipeline and the story video composition.

export const SETTINGS = ["forest", "city", "bedroom", "space", "beach", "castle", "cafe", "classroom"] as const;
export type Setting = (typeof SETTINGS)[number];

export const MOODS = ["happy", "sad", "surprised", "angry", "thinking", "excited", "scared"] as const;
export type Mood = (typeof MOODS)[number];

export const ACTIONS = ["idle", "enter", "jump", "shake", "walk"] as const;
export type Action = (typeof ACTIONS)[number];

export const COLORS = ["yellow", "pink", "blue", "green", "orange", "purple", "red", "teal"] as const;
export type CharacterColor = (typeof COLORS)[number];

export const ACCESSORIES = ["none", "hat", "bow", "glasses", "crown", "scarf"] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const TIMES = ["day", "sunset", "night"] as const;
export type TimeOfDay = (typeof TIMES)[number];

/** An idea sitting in the queue, produced by the Research Desk (story pitch). */
export interface Idea {
  id: number;
  topic: string;
  title: string;
  /** One-line logline. */
  hook: string;
  /** Genre and the twist that makes it worth watching. */
  angle: string;
  status: "queued" | "in_production" | "done" | "skipped";
  /** Failed production attempts so far. */
  attempts: number;
  createdAt: string;
}

export interface Character {
  name: string;
  color: CharacterColor;
  accessory: Accessory;
}

export interface CastMember {
  /** Index into Story.characters. */
  who: number;
  mood: Mood;
  action: Action;
}

/** One story beat, written by the Script Room. */
export interface Beat {
  setting: Setting;
  time: TimeOfDay;
  /** Narrator caption, shown at the bottom. */
  narration: string;
  /** Characters on screen, left to right. */
  cast: CastMember[];
  /** Optional line of dialogue. speaker is an index into Story.characters, or -1 for none. */
  speaker: number;
  line: string;
}

export interface Story {
  title: string;
  logline: string;
  characters: Character[];
  beats: Beat[];
  caption: string;
  hashtags: string[];
}

export interface AudioCue {
  /** File name inside the job's audio folder. */
  src: string;
  frames: number;
}

/** A beat with timing, produced by the Art Studio and drawn by Remotion. */
export interface Scene extends Beat {
  durationInFrames: number;
  /** Frame (within the scene) where the dialogue line starts. */
  lineStart: number;
  narrationAudio: AudioCue | null;
  lineAudio: AudioCue | null;
  /** Camera move for this scene. */
  camera: "push" | "pan-left" | "pan-right" | "still";
}

export interface VideoProps {
  title: string;
  characters: Character[];
  titleFrames: number;
  endFrames: number;
  scenes: Scene[];
  /** Base URL the renderer loads voice files from; null for a silent video. */
  audioBase: string | null;
  [key: string]: unknown;
}

export const STAGES = ["script", "qa", "voice", "art", "edit", "ship"] as const;
export type Stage = (typeof STAGES)[number];

export interface Job {
  id: number;
  ideaId: number;
  stage: Stage | "done" | "failed";
  /** 0 to 1, used by the Edit Bay while rendering. */
  progress: number;
  script: Story | null;
  video: VideoProps | null;
  qa: QaReport | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** What the QA Lab found and did before a story was rendered. */
export interface QaReport {
  verdict: "approved" | "fixed" | "rejected";
  issues: string[];
}

export interface AutopilotSettings {
  enabled: boolean;
  /** The channel brief: what kind of stories this channel makes. */
  brief: string;
  storiesPerDay: number;
  /** ISO time of the next scheduled story, or null. */
  nextRunAt: string | null;
}

export type AutopilotPhase = "idle" | "researching" | "picking" | "producing";

export type Agent = "autopilot" | "research" | "producer" | "script" | "qa" | "voice" | "art" | "edit" | "ship";

export interface Activity {
  id: number;
  at: string;
  agent: Agent;
  message: string;
  level: "info" | "warn" | "error";
}
