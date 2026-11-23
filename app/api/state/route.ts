import { NextResponse } from "next/server";
import { autopilotPhase, startAutopilot } from "@/lib/autopilot";
import { getAutopilot, listActivity, listIdeas, listJobs } from "@/lib/db";
import { engineStatus } from "@/lib/engine";
import { voiceStatus } from "@/lib/voice";

export const dynamic = "force-dynamic";

export async function GET() {
  startAutopilot(); // no-op once running; covers servers started without instrumentation
  const [engine, voice] = await Promise.all([engineStatus(), voiceStatus()]);
  return NextResponse.json({
    engine,
    voice,
    ideas: listIdeas(),
    jobs: listJobs(),
    autopilot: { ...getAutopilot(), phase: autopilotPhase() },
    activity: listActivity(30),
  });
}
