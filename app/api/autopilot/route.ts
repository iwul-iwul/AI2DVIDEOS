import { NextResponse } from "next/server";
import { autopilotPhase, runNow, updateAutopilot } from "@/lib/autopilot";

export const dynamic = "force-dynamic";

/** Change autopilot settings, or { runNow: true } to make the next story right away. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    enabled?: unknown;
    brief?: unknown;
    storiesPerDay?: unknown;
    runNow?: unknown;
  };
  const patch: Parameters<typeof updateAutopilot>[0] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.brief === "string") patch.brief = body.brief;
  if (typeof body.storiesPerDay === "number" && Number.isFinite(body.storiesPerDay)) patch.storiesPerDay = body.storiesPerDay;
  let settings = updateAutopilot(patch);
  if (body.runNow === true) settings = runNow();
  return NextResponse.json({ autopilot: { ...settings, phase: autopilotPhase() } });
}
