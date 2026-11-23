// Which kind of story the studio makes. "hook" follows the fast, first-person
// "in a world where..." format; "cozy" is the original gentle tale.

import { getSetting, saveSetting } from "./db";
import { STORY_STYLES, type StoryStyle } from "./types";

export function getStoryStyle(): StoryStyle {
  const env = process.env.REELHOUSE_STYLE as StoryStyle | undefined;
  if (env && STORY_STYLES.includes(env)) return env;
  const saved = getSetting<StoryStyle>("storyStyle");
  return saved && STORY_STYLES.includes(saved) ? saved : "hook";
}

export function setStoryStyle(style: StoryStyle): void {
  if (STORY_STYLES.includes(style)) saveSetting("storyStyle", style);
}

/** What each style asks of the writers. */
export const STYLE_GUIDE: Record<StoryStyle, { pitch: string; write: string; beats: string; narration: string; line: string }> = {
  hook: {
    pitch:
      "You develop ideas for 60 to 90 second animated short stories posted as vertical videos, in the style that hooks viewers on TikTok, Reels and Shorts: a first-person narrator, an invented world with a clear rule everyone lives by (\"everyone gets their power on their 13th birthday\", \"your rank is decided by the color of your shadow\"), a hero who is the ordinary underdog, a big reveal that shocks everyone, and a cliffhanger that makes people want part 2. Characters are simple 2D cartoons, at most 3 per scene. Keep them original and suitable for all ages, with no real people or brands.",
    write:
      "You are the head writer of an animated short-story channel. You write 60 to 90 second stories for vertical video, told by a first-person narrator (the hero, saying \"I\") over fast-cut 2D scenes with big captions. Structure: (1) open with the world's rule in the very first line, (2) explain the ranks or stakes in two or three quick beats, (3) the hero is the ordinary one everyone overlooks, (4) the big day arrives and others get impressive results, (5) the hero's turn: a reveal far beyond anyone else, shown with shocked reactions, (6) end on a cliffhanger line that sets up part 2. Each beat is one short spoken sentence, like a caption. Use dialogue rarely, only for a short reaction line. Original, all ages, no real people or brands.",
    beats: "12 to 18 beats following the structure: rule, stakes, underdog, big day, reveal, reactions, cliffhanger",
    narration: "What the narrator (the hero, in first person) says over this shot: one short sentence, 4 to 12 words",
    line: "A short reaction line, under 8 words. Usually empty.",
  },
  cozy: {
    pitch:
      "You develop ideas for 30 to 45 second animated short stories posted as vertical videos. Stories star simple, round cartoon characters, need at most 3 characters, and land a clear emotional payoff or twist in under a minute. Keep them original and suitable for all ages.",
    write:
      "You are the head writer of an animated short-story channel. You write 30 to 45 second stories for vertical video, told through narrator captions and short speech bubbles over simple 2D scenes. Every beat moves the story. Show emotion through the characters' moods and actions. End on the payoff, not on a moral lecture. Keep it original and suitable for all ages.",
    beats: "5 to 8 beats: setup, rising problem, turn, payoff",
    narration: "Narrator caption, under 16 words. Can be empty if the dialogue carries the beat.",
    line: "What the speaker says, under 14 words. Empty when speaker is -1.",
  },
};

export const MAX_BEATS: Record<StoryStyle, number> = { hook: 18, cozy: 8 };
