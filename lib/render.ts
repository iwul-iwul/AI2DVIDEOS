// Edit Bay: renders a designed video to MP4 with Remotion.

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

export async function renderVideo(
  props: VideoProps,
  outputLocation: string,
  onProgress: (p: number) => void,
): Promise<void> {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const url = await getServeUrl();
  const browserExecutable = process.env.REMOTION_BROWSER || null;
  const composition = await selectComposition({ serveUrl: url, id: "Story", inputProps: props, browserExecutable });
  await renderMedia({
    composition,
    serveUrl: url,
    codec: "h264",
    outputLocation,
    inputProps: props,
    browserExecutable,
    onProgress: ({ progress }) => onProgress(progress),
  });
}
