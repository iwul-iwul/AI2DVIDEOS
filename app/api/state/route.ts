import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/agents/claude";
import { autopilotPhase, startAutopilot } from "@/lib/autopilot";
import { getAutopilot, listActivity, listIdeas, listJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  startAutopilot(); // no-op once running; covers servers started without instrumentation
  return NextResponse.json({
    demo: isDemoMode(),
    ideas: listIdeas(),
    jobs: listJobs(),
    autopilot: { ...getAutopilot(), phase: autopilotPhase() },
    activity: listActivity(30),
  });
}
