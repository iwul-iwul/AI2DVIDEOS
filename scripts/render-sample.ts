// Renders the demo story to data/renders/sample.mp4 without starting the app.
import path from "node:path";
import fs from "node:fs";
import { designVideo } from "../lib/agents/art";
import { demoScript } from "../lib/agents/demo";
import { renderVideo } from "../lib/render";

const story = demoScript({
  topic: "friendship",
  title: "The Lost Star",
  hook: "When a star falls into the forest, Mo has one night to send it home.",
  angle: "",
});
const out = path.join(process.cwd(), "data", "renders", "sample.mp4");
fs.mkdirSync(path.dirname(out), { recursive: true });
let last = -1;
renderVideo(designVideo(story), out, (p) => {
  const pct = Math.floor(p * 10) * 10;
  if (pct !== last) {
    last = pct;
    console.log(`rendering ${pct}%`);
  }
}).then(() => console.log(`done: ${out}`));
