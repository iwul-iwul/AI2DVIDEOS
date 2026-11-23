// Demo mode: template-based pitches and stories so the whole studio works
// without a Claude API key. Output is generic but the pipeline is real.

import type { Story } from "../types";

export interface IdeaInput {
  topic: string;
  title: string;
  hook: string;
  angle: string;
}

export function demoIdeas(topic: string): Omit<IdeaInput, "topic">[] {
  const t = topic.trim() || "a small robot";
  return [
    {
      title: `The Lost Star`,
      hook: `When a star falls into the forest, ${t} has one night to send it home.`,
      angle: "Heartwarming adventure. Twist: the star was never lost, it wanted a friend.",
    },
    {
      title: `The Last Slice`,
      hook: `Two best friends, one slice of cake, and ${t} caught in the middle.`,
      angle: "Comedy. Twist: they both give it away and end up sharing.",
    },
    {
      title: `Night Shift`,
      hook: `Everyone thinks the city sleeps at night. ${t.charAt(0).toUpperCase() + t.slice(1)} knows better.`,
      angle: "Cozy mystery. Twist: the noises are friends throwing a surprise party.",
    },
  ];
}

/** A short demo story. It uses the idea's title and logline so each run feels tied to the pitch. */
export function demoScript(idea: IdeaInput): Story {
  return {
    title: idea.title,
    logline: idea.hook,
    characters: [
      { name: "Mo", color: "yellow", accessory: "scarf" },
      { name: "Lumi", color: "purple", accessory: "bow" },
    ],
    beats: [
      {
        setting: "bedroom",
        time: "night",
        narration: idea.hook,
        cast: [{ who: 0, mood: "thinking", action: "idle" }],
        speaker: 0,
        line: "Something feels different tonight...",
      },
      {
        setting: "forest",
        time: "night",
        narration: "A soft glow led Mo deep into the forest.",
        cast: [{ who: 0, mood: "scared", action: "walk" }],
        speaker: -1,
        line: "",
      },
      {
        setting: "forest",
        time: "night",
        narration: "And there, under the tallest tree, sat someone new.",
        cast: [
          { who: 0, mood: "surprised", action: "jump" },
          { who: 1, mood: "sad", action: "enter" },
        ],
        speaker: 1,
        line: "Please don't run. I'm a little lost.",
      },
      {
        setting: "city",
        time: "night",
        narration: "They searched the whole city together.",
        cast: [
          { who: 0, mood: "excited", action: "walk" },
          { who: 1, mood: "happy", action: "walk" },
        ],
        speaker: 0,
        line: "We'll find your way home. I promise!",
      },
      {
        setting: "beach",
        time: "sunset",
        narration: "But when the sun came up, Lumi didn't want to leave.",
        cast: [
          { who: 0, mood: "happy", action: "idle" },
          { who: 1, mood: "excited", action: "jump" },
        ],
        speaker: 1,
        line: "Maybe home is wherever my friend is.",
      },
    ],
    caption: `${idea.title}: a tiny story about finding a friend. What should happen next?`,
    hashtags: ["#shortstory", "#animation", "#storytime", "#2danimation"],
  };
}
