// Research Desk and Script Room, powered by Claude with structured outputs.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ICONS, MOODS, SHOT_KINDS, type Script } from "../types";
import { demoIdeas, demoScript, type DemoIdeaInput } from "./demo";

const MODEL = "claude-opus-5-5";

/**
 * Live mode needs a credential. REELHOUSE_DEMO=1 forces demo mode;
 * REELHOUSE_DEMO=0 forces live mode (for an `ant auth login` profile).
 */
export function isDemoMode(): boolean {
  if (process.env.REELHOUSE_DEMO === "1") return true;
  if (process.env.REELHOUSE_DEMO === "0") return false;
  return !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

async function ask<T extends z.ZodType>(system: string, prompt: string, schema: T): Promise<z.infer<T>> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("Claude ran out of room before finishing.");
  if (!response.parsed_output) throw new Error("Claude's answer did not match the expected format.");
  return response.parsed_output as z.infer<T>;
}

const IdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().describe("Short video title, under 60 characters"),
        hook: z.string().describe("First spoken line, under 15 words, creates curiosity"),
        angle: z.string().describe("One sentence on the approach that makes this video worth watching"),
      }),
    )
    .describe("3 to 5 ideas"),
});

export async function researchIdeas(topic: string): Promise<Omit<DemoIdeaInput, "topic">[]> {
  if (isDemoMode()) return demoIdeas(topic);
  const out = await ask(
    "You are the research lead at a short-form video studio. You find angles for 15 to 45 second vertical videos (TikTok, Reels, Shorts) that are useful, specific and honest. Avoid clickbait claims you can't back up.",
    `Topic: ${topic}\n\nPropose 3 to 5 distinct video ideas for this topic.`,
    IdeasSchema,
  );
  return out.ideas.slice(0, 5);
}

const ScriptSchema = z.object({
  title: z.string(),
  shots: z
    .array(
      z.object({
        kind: z.enum(SHOT_KINDS),
        onScreen: z.string().describe("Big on-screen text, 2 to 7 words"),
        line: z
          .string()
          .describe("Supporting sentence under 14 words. For a 'list' shot: 2 to 4 short items separated by ' | '"),
        icon: z.enum(ICONS),
        mood: z.enum(MOODS).describe("How the host character reacts in this shot"),
      }),
    )
    .describe("4 to 7 shots: first is 'hook', last is 'outro'"),
  caption: z.string().describe("Post caption, one or two sentences, ends with a question"),
  hashtags: z.array(z.string()).describe("3 to 6 hashtags, each starting with #"),
});

export async function writeScript(idea: DemoIdeaInput): Promise<Script> {
  if (isDemoMode()) return demoScript(idea);
  const out = await ask(
    "You are the head writer at a short-form video studio. You write punchy, accurate scripts for 15 to 45 second vertical animated videos with a cartoon host. Every shot must earn its place. Keep on-screen text short enough to read at a glance.",
    `Write the script for this video.\n\nTopic: ${idea.topic}\nTitle: ${idea.title}\nHook: ${idea.hook}\nAngle: ${idea.angle}`,
    ScriptSchema,
  );
  const shots = out.shots.slice(0, 7);
  if (shots.length < 2) throw new Error("The script came back with too few shots.");
  return { ...out, shots };
}
