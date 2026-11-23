// The production line: Script Room -> QA Lab -> Sound Booth -> Art Studio -> Edit Bay -> Shipping Dock.
// Research happens earlier, when ideas are added to the queue.

import fs from "node:fs";
import path from "node:path";
import { designVideo, totalFrames } from "./agents/art";
import { reviewStory, writeScript } from "./agents/brain";
import { checkStory } from "./agents/qa";
import {
  addIdeaAttempt,
  createJob,
  getIdea,
  getJob,
  logActivity,
  setIdeaStatus,
  updateJob,
  videoPath,
} from "./db";
import { renderVideo } from "./render";
import { scoreStory } from "./music";
import { jobAudioDir, recordVoices, voiceStatus, type BeatAudio } from "./voice";
import type { Idea, Job, QaReport, Story } from "./types";

/** A failed idea goes back in the queue until it has failed this many times, then it is skipped. */
export const MAX_ATTEMPTS = 2;

export const OUTPUT_DIR = process.env.REELHOUSE_OUTPUT_DIR || path.join(process.cwd(), "output");

// Shared across module copies (Next.js can load this file more than once).
const g = globalThis as unknown as { __reelhouseLine?: Promise<unknown> };

/** Start producing an idea. Jobs run one at a time so renders don't fight for CPU. */
export function startProduction(ideaId: number): { job: Job; done: Promise<Job> } {
  const idea = getIdea(ideaId);
  if (!idea) throw new Error(`No idea with id ${ideaId}.`);
  const job = createJob(ideaId, "script");
  setIdeaStatus(ideaId, "in_production");
  const done = (g.__reelhouseLine ?? Promise.resolve()).then(() => produce(job.id, idea)).then(() => getJob(job.id)!);
  g.__reelhouseLine = done.catch(() => undefined);
  return { job, done };
}

async function qaPass(jobId: number, draft: Story): Promise<Story> {
  const rules = checkStory(draft);
  const issues = [...rules.fixes];
  if (rules.blockers.length) {
    const report: QaReport = { verdict: "rejected", issues: [...issues, ...rules.blockers] };
    updateJob(jobId, { qa: report });
    throw new Error(`QA rejected the story: ${rules.blockers.join(" ")}`);
  }

  let story = rules.story;
  const review = await reviewStory(story);
  if (review.reject) {
    updateJob(jobId, { qa: { verdict: "rejected", issues: [...issues, ...review.issues] } });
    throw new Error(`QA rejected the story: ${review.issues.join(" ") || "unsuitable or unfixable."}`);
  }
  issues.push(...review.issues);
  if (review.fixed) {
    // The editor's rewrite goes through the rule checks too.
    const again = checkStory(review.fixed);
    if (!again.blockers.length) story = again.story;
    else issues.push("The editor's rewrite broke a rule, so the original story was kept.");
  }
  const report: QaReport = { verdict: issues.length ? "fixed" : "approved", issues };
  updateJob(jobId, { qa: report, script: story });
  logActivity("qa", issues.length ? `Fixed ${issues.length} issue${issues.length > 1 ? "s" : ""} in "${story.title}".` : `Approved "${story.title}" as written.`);
  return story;
}

/** Shipping Dock: copy the finished video and its caption into the output folder. */
function exportVideo(jobId: number, story: Story): string {
  const day = new Date().toISOString().slice(0, 10);
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "story";
  const dir = path.join(OUTPUT_DIR, `${day}_${jobId}_${slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(videoPath(jobId), path.join(dir, "video.mp4"));
  fs.writeFileSync(path.join(dir, "caption.txt"), `${story.caption}\n\n${story.hashtags.join(" ")}\n`);
  fs.writeFileSync(path.join(dir, "story.json"), JSON.stringify(story, null, 2));
  return dir;
}

async function produce(jobId: number, idea: Idea): Promise<void> {
  try {
    // Script Room
    const draft = await writeScript(idea);
    updateJob(jobId, { script: draft, stage: "qa" });
    logActivity("script", `Wrote "${draft.title}": ${draft.characters.length} characters, ${draft.beats.length} beats.`);

    // QA Lab
    const story = await qaPass(jobId, draft);
    updateJob(jobId, { stage: "voice" });

    // Sound Booth
    let voices: BeatAudio[] | undefined;
    const vs = await voiceStatus();
    if (vs.enabled) {
      voices = await recordVoices(jobId, story, vs);
      const n = voices.reduce((sum, v) => sum + (v.narration ? 1 : 0) + (v.line ? 1 : 0), 0);
      logActivity("voice", `Recorded ${n} voice lines for "${story.title}".`);
    } else {
      logActivity("voice", `No voiceover for "${story.title}": ${vs.note ?? "voice is off."}`, "warn");
    }
    updateJob(jobId, { stage: "art" });

    // Art Studio
    const video = designVideo(story, voices);
    logActivity("art", `Staged ${video.scenes.length} scenes for "${story.title}".`);

    // Sound Booth scores it once the length is known.
    try {
      video.music = scoreStory(story, totalFrames(video), jobAudioDir(jobId), jobId);
      if (video.music) {
        logActivity(
          "voice",
          video.music.source === "library"
            ? `Picked your track "${video.music.name}" for "${story.title}" (${video.music.mood}).`
            : `Composed ${video.music.mood} background music for "${story.title}".`,
        );
      }
    } catch (err) {
      logActivity("voice", `No background music for "${story.title}": ${err instanceof Error ? err.message : String(err)}`, "warn");
    }
    updateJob(jobId, { video, stage: "edit" });

    // Edit Bay
    let last = 0;
    await renderVideo(
      video,
      videoPath(jobId),
      (p) => {
        if (p - last >= 0.02 || p === 1) {
          last = p;
          updateJob(jobId, { progress: p });
        }
      },
      voices || video.music ? jobAudioDir(jobId) : undefined,
    );
    logActivity("edit", `Rendered "${story.title}".`);

    // Shipping Dock
    updateJob(jobId, { stage: "ship", progress: 1 });
    const dir = exportVideo(jobId, story);
    logActivity("ship", `Packed "${story.title}" into ${path.relative(process.cwd(), dir) || dir}.`);
    updateJob(jobId, { stage: "done" });
    setIdeaStatus(idea.id, "done");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[reelhouse] job ${jobId} failed`, err);
    updateJob(jobId, { stage: "failed", error: message });
    const attempts = addIdeaAttempt(idea.id);
    if (attempts >= MAX_ATTEMPTS) {
      setIdeaStatus(idea.id, "skipped");
      logActivity("autopilot", `"${idea.title}" failed ${attempts} times and was skipped: ${message}`, "error");
    } else {
      setIdeaStatus(idea.id, "queued");
      logActivity("autopilot", `"${idea.title}" failed and went back in the queue for one more try: ${message}`, "warn");
    }
  }
}
