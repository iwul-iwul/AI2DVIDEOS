// Autopilot: keeps the studio making stories on a schedule with no clicks.
// Each run: refill the queue from the channel brief, let the Producer pick a
// pitch, and send it down the production line.

import { pickBestIdea, pitchFromBrief } from "./agents/brain";
import { freshTrends } from "./trends";
import { addIdeas, getAutopilot, listJobs, logActivity, pastTitles, queuedIdeas, saveAutopilot } from "./db";
import { startProduction } from "./pipeline";
import type { AutopilotPhase, AutopilotSettings } from "./types";

/** Keep at least this many pitches waiting. */
const MIN_QUEUE = 3;
const TICK_MS = 20_000;

interface Runtime {
  timer?: NodeJS.Timeout;
  busy: boolean;
  phase: AutopilotPhase;
}

const g = globalThis as unknown as { __reelhouseAutopilot?: Runtime };
const rt = (g.__reelhouseAutopilot ??= { busy: false, phase: "idle" });

export const autopilotPhase = (): AutopilotPhase => rt.phase;

export const intervalMs = (perDay: number) => Math.round((24 * 60 * 60 * 1000) / Math.min(48, Math.max(1, perDay)));

/** Apply a settings change from the UI. Turning autopilot on schedules a run right away. */
export function updateAutopilot(patch: Partial<Pick<AutopilotSettings, "enabled" | "brief" | "storiesPerDay">>): AutopilotSettings {
  const before = getAutopilot();
  const next: Partial<AutopilotSettings> = { ...patch };
  if (patch.brief !== undefined) next.brief = patch.brief.trim().slice(0, 600);
  if (patch.storiesPerDay !== undefined) next.storiesPerDay = Math.min(48, Math.max(1, Math.round(patch.storiesPerDay)));
  if (patch.enabled && !before.enabled) {
    next.nextRunAt = new Date().toISOString();
    logActivity("autopilot", "Autopilot switched on.");
  } else if (patch.enabled === false && before.enabled) {
    next.nextRunAt = null;
    logActivity("autopilot", "Autopilot switched off. A story already in production will finish.");
  }
  const saved = saveAutopilot(next);
  if (saved.enabled) void tick();
  return saved;
}

/** Run the next story now instead of waiting for the schedule. */
export function runNow(): AutopilotSettings {
  const saved = saveAutopilot({ nextRunAt: new Date().toISOString() });
  void tick();
  return saved;
}

export function startAutopilot(): void {
  if (rt.timer) return;
  rt.timer = setInterval(() => void tick(), TICK_MS);
  rt.timer.unref?.();
  void tick();
}

async function tick(): Promise<void> {
  const settings = getAutopilot();
  if (!settings.enabled || rt.busy) return;
  if (settings.nextRunAt && Date.parse(settings.nextRunAt) > Date.now()) return;
  // A story someone started by hand is still going; wait for it.
  if (listJobs().some((j) => j.stage !== "done" && j.stage !== "failed")) return;

  rt.busy = true;
  try {
    await runOnce(settings);
  } catch (err) {
    logActivity("autopilot", `Run stopped: ${err instanceof Error ? err.message : String(err)}. Trying again at the next slot.`, "error");
  } finally {
    rt.phase = "idle";
    rt.busy = false;
    const latest = getAutopilot();
    if (latest.enabled) {
      const next = new Date(Date.now() + intervalMs(latest.storiesPerDay)).toISOString();
      saveAutopilot({ nextRunAt: next });
    }
  }
}

async function runOnce(settings: AutopilotSettings): Promise<void> {
  // 1. Research Desk refills the queue.
  if (queuedIdeas().length < MIN_QUEUE) {
    rt.phase = "scouting";
    const report = await freshTrends();
    rt.phase = "researching";
    const pitches = await pitchFromBrief(settings.brief, pastTitles(), report?.themes.map((t) => t.theme) ?? []);
    if (pitches.length) {
      for (const p of pitches) addIdeas(p.topic, [p]);
      logActivity("research", `Pitched ${pitches.length} new stories: ${pitches.map((p) => `"${p.title}"`).join(", ")}.`);
    } else {
      logActivity("research", "Couldn't come up with any new pitches this time.", "warn");
    }
  }

  const waiting = queuedIdeas();
  if (!waiting.length) {
    logActivity("autopilot", "Nothing in the queue to produce.", "warn");
    return;
  }

  // 2. Producer picks.
  rt.phase = "picking";
  const pick = await pickBestIdea(waiting.slice(0, 12), settings.brief);
  const idea = waiting.find((i) => i.id === pick.id)!;
  logActivity("producer", `Picked "${idea.title}". ${pick.reason}`);

  // 3. Production line (QA, render, export, retry bookkeeping happen inside).
  rt.phase = "producing";
  let job = await startProduction(idea.id).done;
  // One immediate retry if it failed and went back in the queue.
  if (job.stage === "failed" && queuedIdeas().some((i) => i.id === idea.id)) {
    logActivity("autopilot", `Retrying "${idea.title}".`);
    job = await startProduction(idea.id).done;
  }
  if (job.stage === "done") logActivity("autopilot", `Finished "${job.script?.title ?? idea.title}".`);
}
