// The production line: Script Room -> Art Studio -> Edit Bay -> Shipping Dock.
// Research happens earlier, when ideas are added to the queue.

import { designScenes } from "./agents/art";
import { writeScript } from "./agents/claude";
import { createJob, getIdea, setIdeaStatus, updateJob, videoPath } from "./db";
import { renderVideo } from "./render";
import type { Job } from "./types";

let running = Promise.resolve();

/** Start producing an idea. Jobs run one at a time so renders don't fight for CPU. */
export function startProduction(ideaId: number): Job {
  const idea = getIdea(ideaId);
  if (!idea) throw new Error(`No idea with id ${ideaId}.`);
  const job = createJob(ideaId, "script");
  setIdeaStatus(ideaId, "in_production");
  running = running.then(() => produce(job.id, ideaId));
  return job;
}

async function produce(jobId: number, ideaId: number): Promise<void> {
  const idea = getIdea(ideaId)!;
  try {
    // Script Room
    const script = await writeScript(idea);
    updateJob(jobId, { script, stage: "art" });

    // Art Studio
    const scenes = designScenes(script);
    const video = { title: script.title, scenes };
    updateJob(jobId, { video, stage: "edit" });

    // Edit Bay
    let last = 0;
    await renderVideo(video, videoPath(jobId), (p) => {
      if (p - last >= 0.02 || p === 1) {
        last = p;
        updateJob(jobId, { progress: p });
      }
    });

    // Shipping Dock: caption and hashtags are already on the script; the file is ready.
    updateJob(jobId, { stage: "ship", progress: 1 });
    await new Promise((r) => setTimeout(r, 1200));
    updateJob(jobId, { stage: "done" });
    setIdeaStatus(ideaId, "done");
  } catch (err) {
    console.error(`[reelhouse] job ${jobId} failed`, err);
    updateJob(jobId, { stage: "failed", error: err instanceof Error ? err.message : String(err) });
    setIdeaStatus(ideaId, "queued");
  }
}
