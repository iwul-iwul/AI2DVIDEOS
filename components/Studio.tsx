"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Activity, AutopilotPhase, AutopilotSettings, CharacterColor, Idea, Job, TrendReport } from "@/lib/types";
import { Building, ROOMS, type RoomId } from "./Building";

interface State {
  engine: {
    choice: "auto" | "ollama" | "claude" | "demo";
    engine: "ollama" | "claude" | "demo";
    model: string;
    ollama: { running: boolean; hasModel: boolean };
    claudeKey: boolean;
    note: string | null;
  };
  voice: { enabled: boolean; piper: boolean; narrator: boolean; characters: boolean; note: string | null };
  ideas: Idea[];
  jobs: Job[];
  autopilot: AutopilotSettings & { phase: AutopilotPhase };
  activity: Activity[];
  trends: TrendReport | null;
}

const STAGE_ROOM: Partial<Record<Job["stage"], RoomId>> = {
  voice: "voice",
  qa: "qa",
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
  const [selected, setSelected] = useState<RoomId>("producer");
  const [topic, setTopic] = useState("");
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusJobId, setFocusJobId] = useState<number | null>(null);
  const [scouting, setScouting] = useState(false);

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
  const phase = state?.autopilot.phase ?? "idle";
  const activeRoom: RoomId | null =
    scouting || phase === "scouting"
      ? "scout"
      : researching || phase === "researching"
      ? "research"
      : activeJob
        ? (STAGE_ROOM[activeJob.stage] ?? null)
        : phase === "picking"
          ? "producer"
          : null;
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
          <span
            className={`mode ${state.engine.engine === "demo" ? "mode-demo" : "mode-live"}`}
            title={state.engine.note ?? "The AI that writes the stories. Change it in the Producer's Office."}
          >
            {state.engine.engine === "ollama" ? `Ollama · ${state.engine.model}` : state.engine.engine === "claude" ? "Claude" : "Demo mode"}
            {state.voice.enabled ? " · Voice on" : " · Silent"}
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

            {selected === "producer" && state && <AutopilotPanel state={state} onChange={refresh} />}

            {selected === "scout" && state && (
              <div className="job">
                <div className="row">
                  <button
                    disabled={scouting || phase === "scouting"}
                    onClick={async () => {
                      setScouting(true);
                      try {
                        await fetch("/api/trends", { method: "POST" });
                        await refresh();
                      } finally {
                        setScouting(false);
                      }
                    }}
                  >
                    {scouting || phase === "scouting" ? "Scouting…" : "Check trends now"}
                  </button>
                  <span className="muted small">
                    {state.trends ? `Last checked ${new Date(state.trends.fetchedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Not checked yet"}
                  </span>
                </div>
                <p className="muted small">
                  Juno reads this week&apos;s top posts in r/aivideo, r/animation, r/WritingPrompts and r/shortstories, plus Google Trends. On autopilot Juno checks every 12 hours, and the Research Desk uses these themes in its pitches.
                </p>
                {state.trends ? (
                  <>
                    <ol className="shots">
                      {state.trends.themes.map((t, i) => (
                        <li key={i}>
                          <strong>{t.theme}</strong>
                          <span className="muted small">{t.why}</span>
                          {t.examples.slice(0, 2).map((e, k) => (
                            <a key={k} className="small trend-link" href={e.url} target="_blank" rel="noreferrer">
                              {e.source}: {e.title}
                            </a>
                          ))}
                        </li>
                      ))}
                    </ol>
                    <p className="muted small">
                      {state.trends.itemCount} posts from {state.trends.sourcesOk.join(", ") || "no sources"}.
                      {state.trends.errors.length > 0 && ` Couldn't reach: ${state.trends.errors.map((e) => e.split(":")[0]).join(", ")}.`}
                    </p>
                  </>
                ) : (
                  <p className="muted">No trend report yet. Press Check trends now, or switch on autopilot.</p>
                )}
              </div>
            )}

            {selected === "voice" && state && (
              <div className="job">
                <p>
                  <span className={state.voice.enabled ? "dot-ok" : "dot-off"} /> Voiceover is{" "}
                  <strong>{state.voice.enabled ? (state.voice.characters ? "on, with a voice for each character" : "on, with one voice") : "off"}</strong>.
                </p>
                {state.voice.note && <p className="muted small">{state.voice.note}</p>}
                {focusJob?.video && (
                  <ul className="issues small">
                    {focusJob.video.scenes.map((sc, i) => (
                      <li key={i}>
                        Scene {i + 1}: {sc.narrationAudio ? `narration ${(sc.narrationAudio.frames / 30).toFixed(1)}s` : "no narration audio"}
                        {sc.lineAudio ? `, ${focusJob.video!.characters[sc.speaker]?.name ?? "line"} ${(sc.lineAudio.frames / 30).toFixed(1)}s` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selected === "qa" && focusJob && (
              <JobHeader job={focusJob} idea={ideaById.get(focusJob.ideaId)}>
                {focusJob.qa ? (
                  <>
                    <p>
                      <span className={`pill pill-qa-${focusJob.qa.verdict}`}>
                        {focusJob.qa.verdict === "approved" ? "Approved as written" : focusJob.qa.verdict === "fixed" ? "Fixed and approved" : "Rejected"}
                      </span>
                    </p>
                    {focusJob.qa.issues.length > 0 && (
                      <ul className="issues">
                        {focusJob.qa.issues.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="muted">{focusJob.stage === "script" ? "Vera is waiting for the story." : "No QA report for this story."}</p>
                )}
              </JobHeader>
            )}

            {selected !== "research" && selected !== "producer" && selected !== "voice" && selected !== "scout" && !focusJob && <p className="muted">Nothing here yet. Produce an idea from the queue to get this room working.</p>}

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
                      {idea.status === "skipped" && <span className="pill pill-failed">Skipped</span>}
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

const PER_DAY = [1, 2, 3, 4, 6, 8, 12, 24];

function fmtTime(iso: string | null): string {
  if (!iso) return "not scheduled";
  const d = new Date(iso);
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  const clock = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (mins <= 0) return "now";
  if (mins < 60) return `${clock} (in ${mins} min)`;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${clock}`;
}

const AGENT_NAMES: Record<Activity["agent"], string> = {
  autopilot: "Autopilot",
  scout: "Juno",
  research: "Pip",
  producer: "Bea",
  script: "Quill",
  qa: "Vera",
  art: "Dot",
  edit: "Splice",
  voice: "Echo",
  ship: "Hatch",
};

function AutopilotPanel({ state, onChange }: { state: State; onChange: () => Promise<void> }) {
  const ap = state.autopilot;
  const [brief, setBrief] = useState(ap.brief);
  const [perDay, setPerDay] = useState(ap.storiesPerDay);
  const [saving, setSaving] = useState(false);
  const dirty = brief.trim() !== ap.brief || perDay !== ap.storiesPerDay;

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch("/api/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  const status =
    ap.phase === "scouting"
      ? "Checking what's trending…"
      : ap.phase === "researching"
      ? "Pitching new stories…"
      : ap.phase === "picking"
        ? "Picking the next story…"
        : ap.phase === "producing"
          ? "Making a story…"
          : ap.enabled
            ? `Next story: ${fmtTime(ap.nextRunAt)}`
            : "Off. Stories are only made when you press Produce.";

  return (
    <div className="autopilot">
      <div className="ap-row">
        <button
          className={`switch ${ap.enabled ? "switch-on" : ""}`}
          role="switch"
          aria-checked={ap.enabled}
          disabled={saving}
          onClick={() => save({ enabled: !ap.enabled, brief, storiesPerDay: perDay })}
        >
          <span className="knob" />
          <span className="switch-label">{ap.enabled ? "Autopilot on" : "Autopilot off"}</span>
        </button>
        {ap.enabled && ap.phase === "idle" && (
          <button className="ghost" disabled={saving} onClick={() => save({ runNow: true })}>
            Make one now
          </button>
        )}
      </div>
      <p className="ap-status">{status}</p>

      <label htmlFor="brief">Channel brief</label>
      <textarea
        id="brief"
        rows={3}
        maxLength={600}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g. Cozy, funny stories about animals and their friendships, for all ages."
      />
      <div className="row">
        <label htmlFor="perday" className="inline">
          Stories per day
        </label>
        <select id="perday" value={perDay} onChange={(e) => setPerDay(Number(e.target.value))}>
          {PER_DAY.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button disabled={!dirty || saving} onClick={() => save({ brief, storiesPerDay: perDay })}>
          Save
        </button>
      </div>

      <div className="setup">
        <h3>Studio setup</h3>
        <div className="setup-row">
          <label htmlFor="engine" className="inline">
            Story writer
          </label>
          <select
            id="engine"
            value={state.engine.choice}
            disabled={saving}
            onChange={async (e) => {
              setSaving(true);
              try {
                await fetch("/api/engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: e.target.value }) });
                await onChange();
              } finally {
                setSaving(false);
              }
            }}
          >
            <option value="auto">Automatic (Ollama, then Claude, then demo)</option>
            <option value="ollama">Ollama (free, on this computer)</option>
            <option value="claude">Claude (needs an API key)</option>
            <option value="demo">Demo templates</option>
          </select>
        </div>
        <div className="setup-row small">
          <span className={state.engine.ollama.running && state.engine.ollama.hasModel ? "dot-ok" : "dot-off"} />
          Ollama {state.engine.ollama.running ? (state.engine.ollama.hasModel ? "ready" : "running, model not downloaded") : "not running"}
          <span className={state.engine.claudeKey ? "dot-ok" : "dot-off"} />
          Claude key {state.engine.claudeKey ? "found" : "not set"}
        </div>
        <div className="setup-row small">
          <span className={state.voice.enabled ? "dot-ok" : "dot-off"} />
          Voiceover {state.voice.enabled ? (state.voice.characters ? "on, with character voices" : "on, one voice") : "off"}
        </div>
        {(state.engine.note || state.voice.note) && (
          <p className="muted small">{[state.engine.note, state.voice.note].filter(Boolean).join(" ")}</p>
        )}
      </div>

      <h3>Activity</h3>
      {state.activity.length === 0 ? (
        <p className="muted small">Nothing yet. Turn on autopilot and the agents will log what they do here.</p>
      ) : (
        <ul className="log">
          {state.activity.map((a) => (
            <li key={a.id} className={`log-${a.level}`}>
              <time className="muted small">{new Date(a.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
              <strong>{AGENT_NAMES[a.agent]}</strong> <span>{a.message}</span>
            </li>
          ))}
        </ul>
      )}
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
