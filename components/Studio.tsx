"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { CharacterColor, Idea, Job } from "@/lib/types";
import { Building, ROOMS, type RoomId } from "./Building";

interface State {
  demo: boolean;
  ideas: Idea[];
  jobs: Job[];
}

const STAGE_ROOM: Partial<Record<Job["stage"], RoomId>> = {
  script: "script",
  art: "art",
  edit: "edit",
  ship: "ship",
};

const SWATCH: Record<CharacterColor, string> = {
  yellow: "#ffd23f",
  pink: "#ff8fab",
  blue: "#5fa8ff",
  green: "#6bd68f",
  orange: "#ff9f43",
  purple: "#b28dff",
  red: "#ff6b6b",
  teal: "#3ccfcf",
};

const isActive = (j: Job) => j.stage !== "done" && j.stage !== "failed";

export default function Studio() {
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState<RoomId>("research");
  const [topic, setTopic] = useState("");
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusJobId, setFocusJobId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setState((await res.json()) as State);
    } catch {
      /* the next poll will try again */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [refresh]);

  const jobs = state?.jobs ?? [];
  const ideas = state?.ideas ?? [];
  const activeJob = jobs.find(isActive) ?? null;
  const focusJob = jobs.find((j) => j.id === focusJobId) ?? activeJob ?? jobs[0] ?? null;
  const activeRoom: RoomId | null = researching ? "research" : activeJob ? (STAGE_ROOM[activeJob.stage] ?? null) : null;
  const ideaById = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const finished = jobs.filter((j) => j.stage === "done");

  async function research(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setResearching(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Research failed.");
      setTopic("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
    }
  }

  async function produce(ideaId: number) {
    setError(null);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId }),
    });
    const body = (await res.json()) as { job?: Job; error?: string };
    if (!res.ok || !body.job) {
      setError(body.error ?? "Could not start production.");
      return;
    }
    setFocusJobId(body.job.id);
    setSelected("script");
    await refresh();
  }

  const room = ROOMS.find((r) => r.id === selected)!;

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <span className="brand-reel" aria-hidden />
          <div>
            <h1>Reelhouse</h1>
            <p>Click a room to see what its agent is doing.</p>
          </div>
        </div>
        {state && (
          <span className={`mode ${state.demo ? "mode-demo" : "mode-live"}`} title={state.demo ? "No Claude API key found. Research and scripts use templates." : "Research and scripts are written by Claude."}>
            {state.demo ? "Demo mode" : "Live: Claude"}
          </span>
        )}
      </header>

      <main className="layout">
        <section className="stage">
          <Building active={activeRoom} selected={selected} onSelect={setSelected} />
        </section>

        <aside className="side">
          <section className="panel" aria-live="polite">
            <div className="panel-head">
              <div>
                <h2>{room.name}</h2>
                <p className="muted">
                  {room.agent} · {room.role}
                </p>
              </div>
              {activeRoom === room.id && <span className="pill pill-hot">Working</span>}
            </div>

            {error && <p className="error">{error}</p>}

            {selected === "research" && (
              <form onSubmit={research} className="research-form">
                <label htmlFor="topic">What should the next stories be about?</label>
                <div className="row">
                  <input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. a shy robot who wants to dance"
                    maxLength={200}
                    disabled={researching}
                  />
                  <button type="submit" disabled={researching || !topic.trim()}>
                    {researching ? "Pitching…" : "Pitch stories"}
                  </button>
                </div>
                <p className="muted small">Story pitches land in the queue below. Press Produce on one to turn it into a video.</p>
              </form>
            )}

            {selected !== "research" && !focusJob && <p className="muted">Nothing here yet. Produce an idea from the queue to get this room working.</p>}

            {selected === "script" && focusJob && (
              <JobHeader job={focusJob} idea={ideaById.get(focusJob.ideaId)}>
                {focusJob.script ? (
                  <>
                    <p className="muted small">{focusJob.script.logline}</p>
                    <div className="cast">
                      {focusJob.script.characters.map((c, i) => (
                        <span key={i} className="cast-chip">
                          <span className="swatch" style={{ background: SWATCH[c.color] }} />
                          {c.name}
                          {c.accessory !== "none" && <span className="muted"> · {c.accessory}</span>}
                        </span>
                      ))}
                    </div>
                    <ol className="shots">
                      {focusJob.script.beats.map((b, i) => (
                        <li key={i}>
                          <span className="tag">
                            {b.setting} · {b.time}
                          </span>
                          {b.narration && <span>{b.narration}</span>}
                          {b.speaker >= 0 && b.line && (
                            <span className="line">
                              <strong>{focusJob.script!.characters[b.speaker]?.name}:</strong> “{b.line}”
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="muted">{focusJob.stage === "failed" ? "No script." : "Quill is writing the story…"}</p>
                )}
              </JobHeader>
            )}

            {selected === "art" && focusJob && (
              <JobHeader job={focusJob} idea={ideaById.get(focusJob.ideaId)}>
                {focusJob.video ? (
                  <div className="scenes">
                    {focusJob.video.scenes.map((s, i) => (
                      <div key={i} className={`scene-card scene-${s.time}`}>
                        <span className="scene-n">{i + 1}</span>
                        <strong>{s.setting}</strong>
                        <span className="small">
                          {s.cast.map((c) => focusJob.video!.characters[c.who]?.name).join(", ")}
                          <br />
                          {(s.durationInFrames / 30).toFixed(1)}s · {s.camera}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Dot is waiting for the story.</p>
                )}
              </JobHeader>
            )}

            {selected === "edit" && focusJob && (
              <JobHeader job={focusJob} idea={ideaById.get(focusJob.ideaId)}>
                {focusJob.stage === "edit" && (
                  <div className="progress" role="progressbar" aria-valuenow={Math.round(focusJob.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${Math.round(focusJob.progress * 100)}%` }} />
                    <span>Rendering {Math.round(focusJob.progress * 100)}%</span>
                  </div>
                )}
                {(focusJob.stage === "ship" || focusJob.stage === "done") && (
                  <video className="player" src={`/api/videos/${focusJob.id}`} controls playsInline />
                )}
                {(focusJob.stage === "script" || focusJob.stage === "art") && <p className="muted">Splice is waiting for the scenes.</p>}
              </JobHeader>
            )}

            {selected === "ship" &&
              (finished.length === 0 ? (
                <p className="muted">No finished videos yet.</p>
              ) : (
                <ul className="shipped">
                  {finished.map((j) => (
                    <ShippedVideo key={j.id} job={j} />
                  ))}
                </ul>
              ))}
          </section>

          <section className="panel queue">
            <div className="panel-head">
              <h2>Story queue</h2>
              <span className="muted small">{ideas.filter((i) => i.status === "queued").length} waiting</span>
            </div>
            {ideas.length === 0 ? (
              <p className="muted">The queue is empty. Ask the Research Desk for story pitches.</p>
            ) : (
              <ul>
                {ideas.map((idea) => {
                  const job = jobs.find((j) => j.ideaId === idea.id);
                  return (
                    <li key={idea.id} className={`idea idea-${idea.status}`}>
                      <div className="idea-text">
                        <strong>{idea.title}</strong>
                        <span className="muted small">{idea.hook}</span>
                        {job?.stage === "failed" && <span className="error small">Last try failed: {job.error}</span>}
                      </div>
                      {idea.status === "queued" && (
                        <button onClick={() => produce(idea.id)} disabled={!!activeJob} title={activeJob ? "One video at a time for now." : undefined}>
                          Produce
                        </button>
                      )}
                      {idea.status === "in_production" && <span className="pill pill-hot">In production</span>}
                      {idea.status === "done" && job && (
                        <button
                          className="ghost"
                          onClick={() => {
                            setFocusJobId(job.id);
                            setSelected("ship");
                          }}
                        >
                          Done
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

function JobHeader({ job, idea, children }: { job: Job; idea?: Idea; children: React.ReactNode }) {
  return (
    <div className="job">
      <p className="job-title">
        <strong>{job.script?.title ?? idea?.title ?? `Job ${job.id}`}</strong>
        <span className={`pill pill-${job.stage}`}>{job.stage === "done" ? "Done" : job.stage === "failed" ? "Failed" : `At ${job.stage}`}</span>
      </p>
      {job.stage === "failed" && <p className="error">{job.error}</p>}
      {children}
    </div>
  );
}

function ShippedVideo({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false);
  const caption = job.script ? `${job.script.caption}\n\n${job.script.hashtags.join(" ")}` : "";
  return (
    <li className="ship-item">
      <video src={`/api/videos/${job.id}#t=1.2`} controls playsInline preload="metadata" />
      <div className="ship-meta">
        <strong>{job.script?.title}</strong>
        <p className="small caption">{caption}</p>
        <div className="row">
          <a className="button" href={`/api/videos/${job.id}?download`}>
            Download MP4
          </a>
          <button
            className="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(caption);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? "Copied" : "Copy caption"}
          </button>
        </div>
      </div>
    </li>
  );
}
