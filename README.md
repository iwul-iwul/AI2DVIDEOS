# Reelhouse

A 2D studio building where each room is an AI agent that does one real step of making a short vertical video. You click a room to see what its agent is doing, feed topics to the Research Desk, and press **Produce** on an idea to send it down the line. Out comes a 1080×1920 MP4 with an animated 2D host, captions and a ready-to-paste post caption.

![The studio](docs/studio.png)

| Room | Agent | What it does |
| --- | --- | --- |
| Research Desk | Pip | Turns a topic into 3 to 5 video ideas (title, hook, angle) and adds them to the queue |
| Script Room | Quill | Writes a 4 to 7 shot script: on-screen text, supporting line, icon and host mood per shot |
| Art Studio | Dot | Designs each scene: palette, layout and timing from reading speed |
| Edit Bay | Splice | Animates the scenes with Remotion and renders the MP4 |
| Shipping Dock | Hatch | Serves the finished video for download, with caption and hashtags |

![Frames from a rendered video](docs/sample-frames.png)

## Run it

Needs Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to use Claude
npm run dev                  # http://localhost:3000
```

Without an API key the app runs in **demo mode**: research and scripts come from templates, but scene design and rendering are real. With a key, the Research Desk and Script Room use Claude (`claude-opus-5-5`) with structured outputs.

The first render bundles the video project, so it takes a little longer. A 20-second video took about a minute on a 4-core machine. Remotion downloads a headless Chrome the first time unless you point `REMOTION_BROWSER` at one.

Other scripts:

- `npm run studio` opens Remotion Studio to tweak the video look live.
- `npm run render:sample` renders the demo script to `data/renders/sample.mp4` without the app.
- `npm run typecheck`

## How it fits together

- `app/` Next.js app router: the studio page and the API (`/api/state`, `/api/ideas`, `/api/jobs`, `/api/videos/:id`).
- `components/Building.tsx` the SVG building, rooms and animated workers.
- `components/Studio.tsx` room panels and the idea queue; polls `/api/state`.
- `lib/agents/` Research and Script (Claude or demo templates) and Art (deterministic scene design).
- `lib/pipeline.ts` runs one job at a time: script, art, edit, ship.
- `remotion/` the video composition: scenes, 2D host character and icons.
- `data/` SQLite database and rendered MP4s (git-ignored).

## Not yet built

- Voiceover (needs a TTS service) and background music.
- Posting straight to TikTok, Reels or Shorts (each platform needs app approval).
- Live web research for the Research Desk.

Remotion is free for individuals and small companies; larger companies need a [company license](https://www.remotion.dev/license).
