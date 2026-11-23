import { NextResponse } from "next/server";
import { researchIdeas } from "@/lib/agents/claude";
import { addIdeas } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Research Desk: turn a topic into queued video ideas. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { topic?: unknown };
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 200) : "";
  if (!topic) return NextResponse.json({ error: "Give the Research Desk a topic first." }, { status: 400 });
  try {
    const ideas = addIdeas(topic, await researchIdeas(topic));
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("[reelhouse] research failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Research failed." }, { status: 502 });
  }
}
