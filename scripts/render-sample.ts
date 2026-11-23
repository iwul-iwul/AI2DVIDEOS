// Renders the demo script to data/renders/sample.mp4 without starting the app.
import path from "node:path";
import fs from "node:fs";
import { designScenes } from "../lib/agents/art";
import { demoScript } from "../lib/agents/demo";
import { renderVideo } from "../lib/render";

const script = demoScript({ topic: "productivity", title: "3 habits that make you 10x faster", hook: "Habit #3 changed everything.", angle: "" });
const out = path.join(process.cwd(), "data", "renders", "sample.mp4");
fs.mkdirSync(path.dirname(out), { recursive: true });
let last = -1;
renderVideo({ title: script.title, scenes: designScenes(script) }, out, (p) => {
  const pct = Math.floor(p * 10) * 10;
  if (pct !== last) {
    last = pct;
    console.log(`rendering ${pct}%`);
  }
}).then(() => console.log(`done: ${out}`));
