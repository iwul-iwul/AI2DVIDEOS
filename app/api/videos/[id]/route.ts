import fs from "node:fs";
import { Readable } from "node:stream";
import { getJob, videoPath } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Serve a finished MP4. Supports range requests so the browser can seek. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const job = Number.isInteger(id) ? getJob(id) : null;
  const file = job ? videoPath(id) : null;
  if (!file || !fs.existsSync(file)) return new Response("Not found", { status: 404 });

  const size = fs.statSync(file).size;
  const download = new URL(req.url).searchParams.has("download");
  const name = `${(job!.script?.title ?? `reelhouse-${id}`).replace(/[^\w\- ]+/g, "").trim() || `reelhouse-${id}`}.mp4`;
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
  };

  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = fs.createReadStream(file, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
