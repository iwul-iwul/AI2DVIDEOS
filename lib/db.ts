// SQLite storage for the idea queue and production jobs.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Idea, Job, Script, Stage, VideoProps } from "./types";

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
  `);
  // Jobs interrupted by a server restart can't resume; mark them failed.
  db.prepare(
    `UPDATE jobs SET stage = 'failed', error = 'Interrupted by a server restart.' WHERE stage NOT IN ('done', 'failed')`,
  ).run();
  return db;
}

export const db = (): Database.Database => (g.__reelhouseDb ??= open());

type IdeaRow = { id: number; topic: string; title: string; hook: string; angle: string; status: Idea["status"]; created_at: string };
type JobRow = {
  id: number;
  idea_id: number;
  stage: Job["stage"];
  progress: number;
  script: string | null;
  video: string | null;
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
  createdAt: r.created_at,
});

const toJob = (r: JobRow): Job => ({
  id: r.id,
  ideaId: r.idea_id,
  stage: r.stage,
  progress: r.progress,
  script: r.script ? (JSON.parse(r.script) as Script) : null,
  video: r.video ? (JSON.parse(r.video) as VideoProps) : null,
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
  patch: Partial<{ stage: Job["stage"]; progress: number; script: Script; video: VideoProps; error: string }>,
): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = ?`);
    vals.push(k === "script" || k === "video" ? JSON.stringify(v) : v);
  }
  if (!sets.length) return;
  db()
    .prepare(`UPDATE jobs SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`)
    .run(...vals, id);
}

export const videoPath = (jobId: number) => path.join(RENDER_DIR, `job-${jobId}.mp4`);
