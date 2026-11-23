// Demo mode: template-based research and scripts so the whole studio works
// without a Claude API key. Output is generic but the pipeline is real.

import type { Script } from "../types";

export interface DemoIdeaInput {
  topic: string;
  title: string;
  hook: string;
  angle: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function demoIdeas(topic: string): Omit<DemoIdeaInput, "topic">[] {
  const t = topic.trim() || "your niche";
  return [
    {
      title: `3 ${t} mistakes beginners make`,
      hook: `You're probably making mistake #2 right now.`,
      angle: "Myth-busting list with a quick fix for each mistake.",
    },
    {
      title: `The 60-second guide to ${t}`,
      hook: `Everything you need to know about ${t} in one minute.`,
      angle: "Fast explainer with one key takeaway.",
    },
    {
      title: `${cap(t)}: what nobody tells you`,
      hook: `Nobody talks about this side of ${t}.`,
      angle: "Contrarian take backed by one surprising fact.",
    },
  ];
}

export function demoScript(idea: DemoIdeaInput): Script {
  const t = idea.topic || "this";
  return {
    title: idea.title,
    shots: [
      { kind: "hook", onScreen: idea.title, line: idea.hook || "Stay till the end.", icon: "bulb", mood: "excited" },
      { kind: "point", onScreen: "Start small", line: `Pick one part of ${t} and do it daily.`, icon: "clock", mood: "pointing" },
      { kind: "point", onScreen: "Track it", line: "What you measure gets better.", icon: "chart", mood: "thinking" },
      {
        kind: "list",
        onScreen: "Quick wins",
        line: "Set a timer | Batch the boring stuff | Review every Friday",
        icon: "check",
        mood: "happy",
      },
      { kind: "outro", onScreen: "Follow for part 2", line: "Save this so you don't forget.", icon: "heart", mood: "excited" },
    ],
    caption: `${idea.title}. Which tip are you trying first?`,
    hashtags: [`#${t.replace(/\s+/g, "")}`, "#tips", "#learnontiktok", "#shorts"],
  };
}
