import { NextResponse } from "next/server";
import { startProduction } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** Send a queued idea down the production line. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { ideaId?: unknown };
  const ideaId = Number(body.ideaId);
  if (!Number.isInteger(ideaId)) return NextResponse.json({ error: "ideaId is required." }, { status: 400 });
  try {
    return NextResponse.json({ job: startProduction(ideaId) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start." }, { status: 404 });
  }
}
