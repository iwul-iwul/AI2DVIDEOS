import { NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const job = getJob(Number((await ctx.params).id));
  return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
