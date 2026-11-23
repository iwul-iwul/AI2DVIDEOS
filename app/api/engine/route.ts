import { NextResponse } from "next/server";
import { ENGINE_CHOICES, engineStatus, setEngineChoice, type EngineChoice } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Choose which AI writes the stories: auto, ollama, claude or demo. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { choice?: unknown };
  if (typeof body.choice !== "string" || !ENGINE_CHOICES.includes(body.choice as EngineChoice)) {
    return NextResponse.json({ error: `choice must be one of ${ENGINE_CHOICES.join(", ")}.` }, { status: 400 });
  }
  setEngineChoice(body.choice as EngineChoice);
  return NextResponse.json({ engine: await engineStatus() });
}
