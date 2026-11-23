import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/agents/claude";
import { listIdeas, listJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ demo: isDemoMode(), ideas: listIdeas(), jobs: listJobs() });
}
