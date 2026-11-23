// The studio's "brain": which AI writes pitches and stories.
// Ollama (free, open models on your own computer) is the default.
// Claude is optional and used when chosen or when Ollama isn't running.
// Demo mode uses templates so the studio works with no AI at all.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getSetting, saveSetting } from "./db";

export const ENGINE_CHOICES = ["auto", "ollama", "claude", "demo"] as const;
export type EngineChoice = (typeof ENGINE_CHOICES)[number];
export type Engine = "ollama" | "claude" | "demo";

export const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const CLAUDE_MODEL = "claude-opus-5-5";

export interface EngineStatus {
  choice: EngineChoice;
  engine: Engine;
  /** Human-readable model name, e.g. "qwen2.5:7b". */
  model: string;
  ollama: { running: boolean; hasModel: boolean };
  claudeKey: boolean;
  /** Why the engine differs from the choice, if it does. */
  note: string | null;
}

const hasClaudeKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export function getEngineChoice(): EngineChoice {
  const env = process.env.REELHOUSE_ENGINE as EngineChoice | undefined;
  if (env && ENGINE_CHOICES.includes(env)) return env;
  if (process.env.REELHOUSE_DEMO === "1") return "demo";
  const saved = getSetting<EngineChoice>("engine");
  return saved && ENGINE_CHOICES.includes(saved) ? saved : "auto";
}

export function setEngineChoice(choice: EngineChoice): void {
  saveSetting("engine", choice);
  cache = null;
}

let cache: { at: number; ollama: EngineStatus["ollama"] } | null = null;

async function probeOllama(): Promise<EngineStatus["ollama"]> {
  if (cache && Date.now() - cache.at < 15_000) return cache.ollama;
  let ollama = { running: false, hasModel: false };
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const body = (await res.json()) as { models?: { name: string; model?: string }[] };
      const names = (body.models ?? []).flatMap((m) => [m.name, m.model ?? ""]);
      const want = OLLAMA_MODEL.includes(":") ? OLLAMA_MODEL : `${OLLAMA_MODEL}:latest`;
      ollama = { running: true, hasModel: names.includes(want) || names.includes(OLLAMA_MODEL) };
    }
  } catch {
    /* not running */
  }
  cache = { at: Date.now(), ollama };
  return ollama;
}

export async function engineStatus(): Promise<EngineStatus> {
  const choice = getEngineChoice();
  const ollama = await probeOllama();
  const claudeKey = hasClaudeKey();
  const ollamaReady = ollama.running && ollama.hasModel;
  const missingModel = `Ollama is running but the model "${OLLAMA_MODEL}" isn't downloaded. Run: ollama pull ${OLLAMA_MODEL}`;

  let engine: Engine = "demo";
  let note: string | null = null;
  if (choice === "demo") engine = "demo";
  else if (choice === "ollama") {
    engine = ollamaReady ? "ollama" : "demo";
    if (!ollamaReady) note = ollama.running ? missingModel : "Ollama isn't running, so templates are used instead.";
  } else if (choice === "claude") {
    engine = claudeKey ? "claude" : "demo";
    if (!claudeKey) note = "No Claude API key is set, so templates are used instead.";
  } else if (ollamaReady) engine = "ollama";
  else if (claudeKey) engine = "claude";
  else {
    engine = "demo";
    note = ollama.running ? missingModel : "Ollama isn't running and no Claude key is set, so templates are used.";
  }
  const model = engine === "ollama" ? OLLAMA_MODEL : engine === "claude" ? CLAUDE_MODEL : "templates";
  return { choice, engine, model, ollama, claudeKey, note };
}

export async function currentEngine(): Promise<Engine> {
  return (await engineStatus()).engine;
}

// ---- Asking for structured answers ----

let claude: Anthropic | null = null;

async function askClaude<T extends z.ZodType>(system: string, prompt: string, schema: T): Promise<z.infer<T>> {
  const response = await (claude ??= new Anthropic()).beta.messages.parse({
    model: CLAUDE_MODEL,
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

async function askOllama<T extends z.ZodType>(system: string, prompt: string, schema: T): Promise<z.infer<T>> {
  const format = z.toJSONSchema(schema);
  const messages = [
    { role: "system", content: `${system}\n\nAnswer with JSON only, matching the given schema.` },
    { role: "user", content: prompt },
  ];
  let lastError = "";
  // Small local models sometimes miss the format; give them one correction.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, format, stream: false, options: { temperature: 0.8, num_ctx: 8192 } }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    if (!res.ok) throw new Error(`Ollama returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { message?: { content?: string } };
    const text = body.message?.content ?? "";
    try {
      return schema.parse(JSON.parse(text)) as z.infer<T>;
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 400) : String(err);
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: `That didn't match the schema: ${lastError}\nReply again with corrected JSON only.` });
    }
  }
  throw new Error(`The local model's answer didn't match the expected format (${OLLAMA_MODEL}).`);
}

/** Ask the current engine for an answer shaped like `schema`. Callers handle "demo" themselves. */
export async function ask<T extends z.ZodType>(engine: Engine, system: string, prompt: string, schema: T): Promise<z.infer<T>> {
  if (engine === "claude") return askClaude(system, prompt, schema);
  if (engine === "ollama") return askOllama(system, prompt, schema);
  throw new Error("Demo mode has no AI to ask.");
}
