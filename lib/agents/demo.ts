// Demo mode: template-based pitches and stories so the whole studio works
// without a Claude API key. Output is generic but the pipeline is real.

import type { Beat, Mood, Action, Setting, Story, StoryStyle, TimeOfDay } from "../types";

export interface IdeaInput {
  topic: string;
  title: string;
  hook: string;
  angle: string;
}

export function demoIdeas(topic: string, style: StoryStyle = "cozy"): Omit<IdeaInput, "topic">[] {
  if (style === "hook") return hookIdeas(topic);
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
export function demoScript(idea: IdeaInput, style: StoryStyle = "cozy"): Story {
  if (style === "hook") return hookScript(idea);
  return {
    style: "cozy",
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

const DEMO_HEROES = ["Owl", "Snail", "Dragon", "Robot", "Cloud", "Cactus", "Penguin", "Comet", "Fox", "Teapot"];

/** Demo stand-in for the Research Desk on autopilot: rotates through heroes so titles don't repeat. */
export function demoPitchesFromBrief(pastTitles: string[], trends: string[] = [], style: StoryStyle = "cozy"): IdeaInput[] {
  if (style === "hook") {
    const used = new Set(pastTitles.map((t) => t.toLowerCase()));
    for (let round = 0; round < 50; round++) {
      const suffix = round ? ` ${round + 1}` : "";
      const fresh = hookIdeas(trends[round % Math.max(1, trends.length)] ?? "")
        .map((i) => ({ ...i, topic: trends[round % Math.max(1, trends.length)] ?? "underdog reveal", title: i.title + suffix }))
        .filter((i) => !used.has(i.title.toLowerCase()));
      if (fresh.length) return fresh;
    }
    return [];
  }
  const used = new Set(pastTitles.map((t) => t.toLowerCase()));
  for (let round = 0; round < DEMO_HEROES.length * 3; round++) {
    const hero = DEMO_HEROES[(pastTitles.length + round) % DEMO_HEROES.length];
    const suffix = round >= DEMO_HEROES.length ? ` ${Math.floor(round / DEMO_HEROES.length) + 1}` : "";
    // When the scout found trends, tag the pitches with one (templates can't rewrite the story around it).
    const topic = trends[round % Math.max(1, trends.length)] ?? `a curious ${hero.toLowerCase()}`;
    const ideas = demoIdeas(`a curious ${hero.toLowerCase()}`).map((i, n) => ({
      ...i,
      topic,
      angle: trends.length ? `${i.angle} Inspired by the trend: ${topic}.` : i.angle,
      title: [`${hero} and the Lost Star`, `The Last Slice for ${hero}`, `${hero}'s Night Shift`][n] + suffix,
    }));
    const fresh = ideas.filter((i) => !used.has(i.title.toLowerCase()));
    if (fresh.length) return fresh;
  }
  return [];
}

// ---- Hook style: first-person underdog stories with a reveal and a cliffhanger ----

function hookIdeas(topic: string): Omit<IdeaInput, "topic">[] {
  const inspired = topic.trim() ? ` Inspired by: ${topic.trim()}.` : "";
  return [
    {
      title: "The Zero-Star Kid",
      hook: "Everyone gets their star mark on their 12th birthday. I was sure mine would be empty.",
      angle: `Fantasy underdog. Twist: every star in the sky answers to me.${inspired}`,
    },
    {
      title: "Shadowless",
      hook: "In our city, the color of your shadow decides your rank. I never had a shadow at all.",
      angle: `Fantasy reveal. Twist: my shadow was so big it covered the whole city.${inspired}`,
    },
    {
      title: "The Last Feather",
      hook: "On graduation day, every student of the Sky Academy grows wings. Mine were late.",
      angle: `Sky fantasy. Twist: one single feather, and the Grandmaster bows.${inspired}`,
    },
  ];
}

const b = (setting: Setting, time: TimeOfDay, narration: string, cast: [number, Mood, Action][], speaker = -1, line = ""): Beat => ({
  setting,
  time,
  narration,
  cast: cast.map(([who, mood, action]) => ({ who, mood, action })),
  speaker,
  line,
});

function hookScript(idea: IdeaInput): Story {
  return {
    style: "hook",
    title: idea.title,
    logline: idea.hook,
    characters: [
      { name: "Kai", color: "teal", accessory: "scarf" },
      { name: "Rex", color: "red", accessory: "crown" },
      { name: "Elder Sol", color: "yellow", accessory: "glasses" },
    ],
    beats: [
      b("palace", "day", "Everyone in my world gets their mark at twelve.", [[1, "happy", "idle"], [0, "thinking", "idle"]]),
      b("palace", "day", "One star means ordinary. Three stars means hero.", [[2, "thinking", "idle"]]),
      b("arena", "day", "And five stars? That hasn't happened in a hundred years.", [[1, "excited", "jump"]]),
      b("classroom", "day", "Ever since I was small, I dreamed of being a hero.", [[0, "happy", "idle"]]),
      b("classroom", "day", "But I was the weakest kid in every class.", [[0, "sad", "idle"], [1, "angry", "idle"]], 1, "Give up, Kai."),
      b("bedroom", "night", "The night before my birthday, I couldn't sleep.", [[0, "scared", "shake"]]),
      b("palace", "day", "Then the ceremony finally arrived.", [[2, "thinking", "enter"]]),
      b("palace", "day", "Rex went first. Four stars. The crowd went wild.", [[1, "excited", "jump"]]),
      b("arena", "day", "Everyone was sure I'd get one star. Maybe zero.", [[1, "happy", "idle"], [0, "sad", "idle"]]),
      b("palace", "day", "But when my turn came...", [[0, "scared", "walk"]]),
      b("palace", "night", "The whole sky went dark.", [[0, "surprised", "shake"], [2, "surprised", "jump"]]),
      b("space", "night", "And every star in it started moving toward me.", [[0, "surprised", "idle"]]),
      b("palace", "night", "The Elder dropped his staff.", [[2, "scared", "shake"]], 2, "Impossible..."),
      b("arena", "night", "I didn't have five stars. I had all of them.", [[0, "excited", "jump"], [1, "surprised", "shake"]]),
      b("palace", "night", "But instead of cheering, everyone stepped away from me.", [[0, "thinking", "idle"], [1, "scared", "idle"]]),
    ],
    caption: `${idea.title}: what happens when the weakest kid gets every star? Part 2?`,
    hashtags: ["#story", "#animation", "#underdog", "#fantasy", "#part1"],
  };
}
