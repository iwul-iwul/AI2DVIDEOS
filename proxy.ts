// Password protection for when Reelhouse runs on a server.
// Set REELHOUSE_PASSWORD (and optionally REELHOUSE_USER, default "reelhouse") to turn it on.
// On your own computer, leave it unset.
import { NextResponse, type NextRequest } from "next/server";

function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const password = process.env.REELHOUSE_PASSWORD;
  if (!password) return NextResponse.next();
  const user = process.env.REELHOUSE_USER || "reelhouse";
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep >= 0 && same(decoded.slice(0, sep), user) && same(decoded.slice(sep + 1), password)) return NextResponse.next();
  }
  return new NextResponse("Reelhouse needs a password.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Reelhouse", charset="UTF-8"' },
  });
}

export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
