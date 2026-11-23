// The writing agents: Research Desk, Producer, Script Room and the QA editor.
// Each asks the current engine (Ollama, Claude, or demo templates) for structured answers.

import { z } from "zod";
import { ask, currentEngine } from "../engine";
import { getStoryStyle, MAX_BEATS, STYLE_GUIDE } from "../style";
import { ACCESSORIES, ACTIONS, COLORS, MOODS, SETTINGS, TIMES, type Idea, type Story, type StoryStyle } from "../types";
import { demoIdeas, demoPitchesFromBrief, demoScript, type IdeaInput } from "./demo";

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
  const engine = await currentEngine();
  const style = getStoryStyle();
  if (engine === "demo") return demoIdeas(topic, style);
  const out = await ask(
    engine,
    STYLE_GUIDE[style].pitch,
    `Theme or prompt from the creator: ${topic}\n\nPitch 3 to 5 different short stories.${style === "hook" ? " Each logline should state the world's rule and hint at the underdog's reveal." : " Vary the genre (for example comedy, heartwarming, mystery, adventure, spooky-cute)."}`,
    PitchSchema,
  );
  return out.ideas.slice(0, 5);
}

const storySchema = (style: StoryStyle) => z.object({
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
        narration: z.string().describe(STYLE_GUIDE[style].narration),
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
        line: z.string().describe(STYLE_GUIDE[style].line),
      }),
    )
    .describe(STYLE_GUIDE[style].beats),
  caption: z.string().describe("Post caption, one or two sentences, ends with a question to the viewer"),
  hashtags: z.array(z.string()).describe("3 to 6 hashtags, each starting with #"),
});

export async function writeScript(idea: IdeaInput): Promise<Story> {
  const engine = await currentEngine();
  const style = getStoryStyle();
  if (engine === "demo") return demoScript(idea, style);
  const out = await ask(
    engine,
    STYLE_GUIDE[style].write,
    `Write this story.\n\nTheme: ${idea.topic}\nTitle: ${idea.title}\nLogline: ${idea.hook}\nGenre and twist: ${idea.angle}${
      style === "hook" ? "\n\nSettings palace (a grand hall of columns and gold) and arena (a stadium with a crowd) suit ceremonies, trials and reveals." : ""
    }`,
    storySchema(style),
  );
  if (!out.characters.length) throw new Error("The story came back with no characters.");
  const beats = out.beats.slice(0, MAX_BEATS[style]);
  if (beats.length < 3) throw new Error("The story came back with too few beats.");
  return { ...out, style, characters: out.characters.slice(0, 3), beats };
}

// ---- Autopilot agents ----

const DEFAULT_BRIEF: Record<StoryStyle, string> = {
  hook: "Fantasy and sci-fi worlds with a rule everyone lives by, an underdog hero, a jaw-dropping reveal and a cliffhanger. All ages.",
  cozy: "Heartwarming and funny short stories for all ages.",
};

const BriefPitchSchema = z.object({
  ideas: z
    .array(
      z.object({
        theme: z.string().describe("The theme this story explores, a few words"),
        title: z.string().describe("Story title, 2 to 5 words"),
        hook: z.string().describe("Logline: one sentence, under 25 words"),
        angle: z.string().describe("Genre and the twist or emotional payoff, one sentence"),
      }),
    )
    .describe("4 to 6 pitches with varied themes and genres"),
});

/** Research Desk on autopilot: invents themes from the channel brief and pitches stories, avoiding past titles. */
export async function pitchFromBrief(brief: string, pastTitles: string[], trends: string[] = []): Promise<IdeaInput[]> {
  const used = new Set(pastTitles.map((t) => t.trim().toLowerCase()));
  const engine = await currentEngine();
  const style = getStoryStyle();
  if (engine === "demo") return demoPitchesFromBrief(pastTitles, trends, style);
  const out = await ask(
    engine,
    `${STYLE_GUIDE[style].pitch} Never reuse a title or premise the channel has already made.`,
    `Channel brief: ${brief || DEFAULT_BRIEF[style]}\n\nTitles already used (do not repeat these or close variations):\n${pastTitles.slice(0, 120).join("\n") || "(none yet)"}${
      trends.length
        ? `\n\nTrending right now, found by the channel's trend scout (use them as inspiration where they fit the brief; make at least half the pitches ride one of these trends, in an original way):\n${trends.map((t) => `- ${t}`).join("\n")}`
        : ""
    }\n\nPitch 4 to 6 new stories that fit the brief.`,
    BriefPitchSchema,
  );
  return out.ideas
    .filter((i) => !used.has(i.title.trim().toLowerCase()))
    .map((i) => ({ topic: i.theme, title: i.title, hook: i.hook, angle: i.angle }));
}

const PickSchema = z.object({
  id: z.number().int().describe("id of the pitch to make next"),
  reason: z.string().describe("One sentence on why this pitch is the strongest"),
});

/** Producer: picks the strongest waiting pitch. */
export async function pickBestIdea(ideas: Idea[], brief: string): Promise<{ id: number; reason: string }> {
  const engine = await currentEngine();
  if (ideas.length === 1 || engine === "demo") return { id: ideas[0].id, reason: "Oldest pitch in the queue." };
  const out = await ask(
    engine,
    "You are the producer of an animated short-story channel. You pick which pitch to make next: the one most likely to hook a viewer in the first two seconds, hold them to the end and get shared, while fitting the channel brief.",
    `Channel brief: ${brief || DEFAULT_BRIEF[getStoryStyle()]}\n\nWaiting pitches:\n${ideas
      .map((i) => `id ${i.id}: "${i.title}". ${i.hook} (${i.angle})`)
      .join("\n")}`,
    PickSchema,
  );
  const valid = ideas.find((i) => i.id === out.id);
  return valid ? out : { id: ideas[0].id, reason: "The producer named a pitch that isn't waiting, so it took the oldest one." };
}

const ReviewSchema = z.object({
  approved: z.boolean().describe("true if the story works as is"),
  issues: z.array(z.string()).describe("Each real problem, one short sentence each. Empty if none."),
  fixed: storySchema("cozy").nullable().describe("A corrected full story if there were fixable issues, otherwise null"),
  reject: z.boolean().describe("true only if the story is unfixable or unsuitable for all ages"),
});

/** QA Lab: the AI editor reviews the story for plot holes, pacing and suitability, and fixes it once. */
export async function reviewStory(story: Story): Promise<{ approved: boolean; issues: string[]; fixed: Story | null; reject: boolean }> {
  const engine = await currentEngine();
  if (engine === "demo") return { approved: true, issues: [], fixed: null, reject: false };
  const style = story.style ?? "cozy";
  try {
    const out = await ask(
    engine,
    `You are the story editor for an animated short-story channel (${style === "hook" ? "60 to 90 second vertical videos told by a first-person narrator, ending on a cliffhanger" : "30 to 45 second vertical videos"}, all ages). Check the story for: plot holes, characters who act or speak without being introduced, a missing payoff, beats that don't move the story, text too long to read in a few seconds, and anything not suitable for all ages. Be practical: only flag real problems. If you can fix them, return the full corrected story in the same format, keeping what works.`,
    `Story JSON:\n${JSON.stringify(story)}`,
    ReviewSchema,
  );
    return { ...out, fixed: out.fixed ? { ...out.fixed, style } : null };
  } catch (err) {
    // The rule checks already ran; a failed editor pass shouldn't stop the story.
    const why = err instanceof Error ? err.message : String(err);
    return { approved: true, issues: [`The editor pass couldn't run (${why}); rule checks only.`], fixed: null, reject: false };
  }
}
