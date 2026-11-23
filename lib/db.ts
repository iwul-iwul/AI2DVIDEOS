// SQLite storage for the idea queue and production jobs.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Activity, Agent, AutopilotSettings, Idea, Job, QaReport, Story, Stage, VideoProps } from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const RENDER_DIR = path.join(DATA_DIR, "renders");

const g = globalThis as unknown as { __reelhouseDb?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(RENDER_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "reelhouse.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      hook TEXT NOT NULL,
      angle TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_id INTEGER NOT NULL REFERENCES ideas(id),
      stage TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      script TEXT,
      video TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      agent TEXT NOT NULL,
      message TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info'
    );
  `);
  // Columns added after the first release.
  for (const sql of [
    `ALTER TABLE ideas ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE jobs ADD COLUMN qa TEXT`,
  ]) {
    try {
      db.exec(sql);
    } catch {
      /* column already exists */
    }
  }
  // Jobs interrupted by a server restart can't resume; mark them failed and requeue their ideas.
  db.prepare(
    `UPDATE jobs SET stage = 'failed', error = 'Interrupted by a server restart.' WHERE stage NOT IN ('done', 'failed')`,
  ).run();
  db.prepare(`UPDATE ideas SET status = 'queued' WHERE status = 'in_production'`).run();
  return db;
}

export const db = (): Database.Database => (g.__reelhouseDb ??= open());

type IdeaRow = {
  id: number;
  topic: string;
  title: string;
  hook: string;
  angle: string;
  status: Idea["status"];
  attempts: number;
  created_at: string;
};
type JobRow = {
  id: number;
  idea_id: number;
  stage: Job["stage"];
  progress: number;
  script: string | null;
  video: string | null;
  qa: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const toIdea = (r: IdeaRow): Idea => ({
  id: r.id,
  topic: r.topic,
  title: r.title,
  hook: r.hook,
  angle: r.angle,
  status: r.status,
  attempts: r.attempts,
  createdAt: r.created_at,
});

const toJob = (r: JobRow): Job => ({
  id: r.id,
  ideaId: r.idea_id,
  stage: r.stage,
  progress: r.progress,
  script: r.script ? (JSON.parse(r.script) as Story) : null,
  video: r.video ? (JSON.parse(r.video) as VideoProps) : null,
  qa: r.qa ? (JSON.parse(r.qa) as QaReport) : null,
  error: r.error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function listIdeas(): Idea[] {
  return (db().prepare(`SELECT * FROM ideas ORDER BY id DESC LIMIT 50`).all() as IdeaRow[]).map(toIdea);
}

export function getIdea(id: number): Idea | null {
  const r = db().prepare(`SELECT * FROM ideas WHERE id = ?`).get(id) as IdeaRow | undefined;
  return r ? toIdea(r) : null;
}

export function addIdeas(topic: string, ideas: { title: string; hook: string; angle: string }[]): Idea[] {
  const insert = db().prepare(`INSERT INTO ideas (topic, title, hook, angle) VALUES (?, ?, ?, ?)`);
  const ids = db().transaction(() => ideas.map((i) => Number(insert.run(topic, i.title, i.hook, i.angle).lastInsertRowid)))();
  return ids.map((id) => getIdea(id)!);
}

export function setIdeaStatus(id: number, status: Idea["status"]): void {
  db().prepare(`UPDATE ideas SET status = ? WHERE id = ?`).run(status, id);
}

/** Count a failed attempt; returns the new total. */
export function addIdeaAttempt(id: number): number {
  db().prepare(`UPDATE ideas SET attempts = attempts + 1 WHERE id = ?`).run(id);
  return getIdea(id)?.attempts ?? 0;
}

export function queuedIdeas(): Idea[] {
  return (db().prepare(`SELECT * FROM ideas WHERE status = 'queued' ORDER BY id ASC`).all() as IdeaRow[]).map(toIdea);
}

/** Every title the studio has pitched, newest first, for avoiding repeats. */
export function pastTitles(limit = 200): string[] {
  return (db().prepare(`SELECT title FROM ideas ORDER BY id DESC LIMIT ?`).all(limit) as { title: string }[]).map((r) => r.title);
}

// ---- Settings ----

export function getSetting<T>(key: string): T | null {
  const r = db().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return r ? (JSON.parse(r.value) as T) : null;
}

export function saveSetting(key: string, value: unknown): void {
  db()
    .prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, JSON.stringify(value));
}

const DEFAULT_AUTOPILOT: AutopilotSettings = {
  enabled: false,
  brief: "",
  storiesPerDay: 2,
  nextRunAt: null,
};

export function getAutopilot(): AutopilotSettings {
  const r = db().prepare(`SELECT value FROM settings WHERE key = 'autopilot'`).get() as { value: string } | undefined;
  return { ...DEFAULT_AUTOPILOT, ...(r ? (JSON.parse(r.value) as Partial<AutopilotSettings>) : {}) };
}

export function saveAutopilot(patch: Partial<AutopilotSettings>): AutopilotSettings {
  const next = { ...getAutopilot(), ...patch };
  db()
    .prepare(`INSERT INTO settings (key, value) VALUES ('autopilot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(JSON.stringify(next));
  return next;
}

// ---- Activity log ----

export function logActivity(agent: Agent, message: string, level: Activity["level"] = "info"): void {
  db().prepare(`INSERT INTO activity (agent, message, level) VALUES (?, ?, ?)`).run(agent, message, level);
  if (level !== "info") console.warn(`[reelhouse:${agent}] ${message}`);
}

export function listActivity(limit = 40): Activity[] {
  return db().prepare(`SELECT * FROM activity ORDER BY id DESC LIMIT ?`).all(limit) as Activity[];
}

export function listJobs(): Job[] {
  return (db().prepare(`SELECT * FROM jobs ORDER BY id DESC LIMIT 50`).all() as JobRow[]).map(toJob);
}

export function getJob(id: number): Job | null {
  const r = db().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as JobRow | undefined;
  return r ? toJob(r) : null;
}

export function createJob(ideaId: number, stage: Stage): Job {
  const id = Number(db().prepare(`INSERT INTO jobs (idea_id, stage) VALUES (?, ?)`).run(ideaId, stage).lastInsertRowid);
  return getJob(id)!;
}

export function updateJob(
  id: number,
  patch: Partial<{ stage: Job["stage"]; progress: number; script: Story; video: VideoProps; qa: QaReport; error: string }>,
): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = ?`);
    vals.push(k === "script" || k === "video" || k === "qa" ? JSON.stringify(v) : v);
  }
  if (!sets.length) return;
  db()
    .prepare(`UPDATE jobs SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`)
    .run(...vals, id);
}

export const videoPath = (jobId: number) => path.join(RENDER_DIR, `job-${jobId}.mp4`);
