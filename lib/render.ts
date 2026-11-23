// Edit Bay: renders a designed video to MP4 with Remotion.

import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { VideoProps } from "./types";

let serveUrl: Promise<string> | null = null;

/** Bundle the Remotion project once per server process. */
function getServeUrl(): Promise<string> {
  serveUrl ??= import("@remotion/bundler")
    .then(({ bundle }) => bundle({ entryPoint: path.join(process.cwd(), "remotion", "index.ts") }))
    .catch((err) => {
      serveUrl = null;
      throw err;
    });
  return serveUrl;
}

const AUDIO_TYPES: Record<string, string> = { ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4" };

/** Serves one folder of voice and music files on localhost while the renderer runs. */
function serveAudio(dir: string): Promise<{ base: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    const name = path.basename(decodeURIComponent((req.url ?? "/").split("?")[0]));
    const file = path.join(dir, name);
    const type = AUDIO_TYPES[path.extname(name).toLowerCase()];
    if (!type || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Content-Length": fs.statSync(file).size });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ base: `http://127.0.0.1:${port}/`, close: () => server.close() });
    });
  });
}

export async function renderVideo(
  props: VideoProps,
  outputLocation: string,
  onProgress: (p: number) => void,
  audioDir?: string,
): Promise<void> {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const url = await getServeUrl();
  const browserExecutable = process.env.REMOTION_BROWSER || null;
  const audio = audioDir && fs.existsSync(audioDir) ? await serveAudio(audioDir) : null;
  try {
    const inputProps: VideoProps = { ...props, audioBase: audio?.base ?? null };
    const composition = await selectComposition({ serveUrl: url, id: "Story", inputProps, browserExecutable });
    await renderMedia({
      composition,
      serveUrl: url,
      codec: "h264",
      outputLocation,
      inputProps,
      browserExecutable,
      onProgress: ({ progress }) => onProgress(progress),
    });
  } finally {
    audio?.close();
  }
}
