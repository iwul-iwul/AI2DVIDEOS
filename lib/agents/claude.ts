// Research Desk (story pitches) and Script Room (story writer), powered by Claude with structured outputs.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ACCESSORIES, ACTIONS, COLORS, MOODS, SETTINGS, TIMES, type Story } from "../types";
import { demoIdeas, demoScript, type IdeaInput } from "./demo";

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

const PitchSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().describe("Story title, 2 to 5 words"),
        hook: z.string().describe("Logline: one sentence, under 25 words, that makes you want to watch"),
        angle: z.string().describe("Genre and the twist or emotional payoff, one sentence"),
      }),
    )
    .describe("3 to 5 distinct story pitches"),
});

export async function researchIdeas(topic: string): Promise<Omit<IdeaInput, "topic">[]> {
  if (isDemoMode()) return demoIdeas(topic);
  const out = await ask(
    "You develop ideas for 30 to 45 second animated short stories posted as vertical videos (TikTok, Reels, Shorts). Stories star simple, round cartoon characters, need at most 3 characters, and must land a clear emotional payoff or twist in under a minute. Keep them original and suitable for all ages.",
    `Theme or prompt from the creator: ${topic}\n\nPitch 3 to 5 different short stories. Vary the genre (for example comedy, heartwarming, mystery, adventure, spooky-cute).`,
    PitchSchema,
  );
  return out.ideas.slice(0, 5);
}

const StorySchema = z.object({
  title: z.string(),
  logline: z.string(),
  characters: z
    .array(
      z.object({
        name: z.string().describe("Short, memorable first name"),
        color: z.enum(COLORS),
        accessory: z.enum(ACCESSORIES),
      }),
    )
    .describe("1 to 3 characters. Give each a different color."),
  beats: z
    .array(
      z.object({
        setting: z.enum(SETTINGS),
        time: z.enum(TIMES),
        narration: z.string().describe("Narrator caption, under 16 words. Can be empty if the dialogue carries the beat."),
        cast: z
          .array(
            z.object({
              who: z.number().int().describe("Index into characters"),
              mood: z.enum(MOODS),
              action: z.enum(ACTIONS).describe("enter = slides in, walk = moving, jump = bouncing with emotion, shake = trembling or angry"),
            }),
          )
          .describe("Characters on screen in this beat, 1 to 3, left to right"),
        speaker: z.number().int().describe("Index of the character who speaks in this beat, or -1 for no dialogue"),
        line: z.string().describe("What the speaker says, under 14 words. Empty when speaker is -1."),
      }),
    )
    .describe("5 to 8 beats: setup, rising problem, turn, payoff"),
  caption: z.string().describe("Post caption, one or two sentences, ends with a question to the viewer"),
  hashtags: z.array(z.string()).describe("3 to 6 hashtags, each starting with #"),
});

export async function writeScript(idea: IdeaInput): Promise<Story> {
  if (isDemoMode()) return demoScript(idea);
  const out = await ask(
    "You are the head writer of an animated short-story channel. You write 30 to 45 second stories for vertical video, told through narrator captions and short speech bubbles over simple 2D scenes. Every beat moves the story. Show emotion through the characters' moods and actions. End on the payoff, not on a moral lecture. Keep it original and suitable for all ages.",
    `Write this story.\n\nTheme: ${idea.topic}\nTitle: ${idea.title}\nLogline: ${idea.hook}\nGenre and twist: ${idea.angle}`,
    StorySchema,
  );
  if (!out.characters.length) throw new Error("The story came back with no characters.");
  const beats = out.beats.slice(0, 8);
  if (beats.length < 3) throw new Error("The story came back with too few beats.");
  return { ...out, characters: out.characters.slice(0, 3), beats };
}
