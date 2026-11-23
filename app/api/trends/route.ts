import { NextResponse } from "next/server";
import { scoutTrends } from "@/lib/trends";

export const dynamic = "force-dynamic";

/** Ask the Trend Scout to check its sources now. */
export async function POST() {
  const report = await scoutTrends();
  return NextResponse.json({ trends: report });
}
