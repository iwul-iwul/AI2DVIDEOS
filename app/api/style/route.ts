import { NextResponse } from "next/server";
import { getStoryStyle, setStoryStyle } from "@/lib/style";
import { STORY_STYLES, type StoryStyle } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Choose the kind of story the studio makes: hook or cozy. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { style?: unknown };
  if (typeof body.style !== "string" || !STORY_STYLES.includes(body.style as StoryStyle)) {
    return NextResponse.json({ error: `style must be one of ${STORY_STYLES.join(", ")}.` }, { status: 400 });
  }
  setStoryStyle(body.style as StoryStyle);
  return NextResponse.json({ style: getStoryStyle() });
}
