import React from "react";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadCaptionFont } from "@remotion/google-fonts/Anton";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Character as CharacterT, Scene, VideoProps } from "../lib/types";
import { Background, GROUND_Y } from "./Backgrounds";
import { Character } from "./Character";

const { fontFamily } = loadFont("normal", { weights: ["600", "700"], subsets: ["latin"] });
const FONT = `${fontFamily}, 'Arial Rounded MT Bold', Arial, sans-serif`;
const { fontFamily: captionFamily } = loadCaptionFont("normal", { weights: ["400"], subsets: ["latin"] });
const CAPTION_FONT = `${captionFamily}, Impact, 'Arial Black', sans-serif`;
const INK = "#1b1b2f";
const CHAR_SIZE = 330;

function castX(n: number): number[] {
  if (n <= 1) return [540];
  if (n === 2) return [300, 780];
  return [190, 540, 890];
}

/** Narrator caption that types itself out. */
const Narration: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const shown = Math.floor(interpolate(frame, [4, 4 + text.length * 0.9], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 170,
        left: 70,
        right: 70,
        background: "rgba(27,27,47,0.82)",
        borderRadius: 36,
        padding: "34px 44px",
        border: "5px solid rgba(255,255,255,0.9)",
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: 54, lineHeight: 1.25, color: "#fff", fontWeight: 600, position: "relative" }}>
        <span style={{ visibility: "hidden" }}>{text}</span>
        <span style={{ position: "absolute", inset: 0 }}>{text.slice(0, shown)}</span>
      </div>
    </div>
  );
};

const STOP = new Set("a an the and but or of to in on at for with from by is was were be been am are it its it's i i'm my me we our you your he she they them his her their that this then than so as into up out just all one didn't don't wasn't couldn't can't won't".split(" "));

/** Which word in a caption chunk gets the highlight: numbers and names first, then the longest meaningful word. */
function keyWord(words: string[], names: Set<string>): number {
  let best = -1;
  let score = 0;
  words.forEach((w, i) => {
    const bare = w.toLowerCase().replace(/[^a-z0-9']/g, "");
    if (!bare || STOP.has(bare)) return;
    const s = /\d/.test(bare) ? 100 : names.has(bare) ? 90 : bare.length;
    if (s > score && (s >= 5 || /\d/.test(bare))) {
      score = s;
      best = i;
    }
  });
  return best;
}

/** Hook style: big captions, a few words at a time, timed across the narration, with one key word highlighted. */
const HookCaption: React.FC<{ text: string; start: number; span: number; names: Set<string>; top: number }> = ({ text, start, span, names, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const chunks: string[][] = [];
  for (const w of words) {
    const last = chunks[chunks.length - 1];
    if (last && last.length < 3 && last.join(" ").length + w.length < 16 && !/[.,!?…]$/.test(last[last.length - 1])) last.push(w);
    else chunks.push([w]);
  }
  // Each chunk starts in proportion to the words before it.
  let seen = 0;
  const starts = chunks.map((c) => {
    const at = start + (seen / words.length) * span;
    seen += c.length;
    return at;
  });
  let idx = 0;
  for (let i = 0; i < chunks.length; i++) if (frame >= starts[i]) idx = i;
  if (frame < starts[0]) return null;
  const chunk = chunks[idx];
  const hi = keyWord(chunk, names);
  const pop = spring({ frame: frame - starts[idx], fps, config: { damping: 10, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", top, left: 50, right: 50, textAlign: "center", transform: `scale(${0.75 + 0.25 * pop})` }}>
      <span
        style={{
          fontFamily: CAPTION_FONT,
          fontSize: 118,
          lineHeight: 1.08,
          textTransform: "uppercase",
          color: "#fff",
          WebkitTextStroke: `10px ${INK}`,
          paintOrder: "stroke fill",
          textShadow: `0 8px 0 ${INK}`,
          letterSpacing: 1,
        }}
      >
        {chunk.map((w, i) => (
          <span key={i} style={{ color: i === hi ? "#ffd60a" : "#fff" }}>
            {w}
            {i < chunk.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </div>
  );
};

const Bubble: React.FC<{ name: string; line: string; x: number; delay: number }> = ({ name, line, x, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 160 } });
  const width = 800;
  const left = Math.min(1080 - 50 - width, Math.max(50, x - width / 2));
  const tailX = Math.min(width - 70, Math.max(70, x - left));
  const bottom = 1920 - (GROUND_Y - CHAR_SIZE * 1.2 + 10);
  return (
    <div
      style={{
        position: "absolute",
        left,
        width,
        bottom,
        transform: `scale(${s})`,
        transformOrigin: `${tailX}px 100%`,
        opacity: s,
      }}
    >
      <div style={{ background: "#fff", border: `6px solid ${INK}`, borderRadius: 44, padding: "28px 38px", position: "relative" }}>
        <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "#ef476f", textTransform: "uppercase", letterSpacing: 2 }}>{name}</div>
        <div style={{ fontFamily: FONT, fontSize: 56, lineHeight: 1.18, color: INK, fontWeight: 600 }}>{line}</div>
      </div>
      <svg width="60" height="48" style={{ position: "absolute", left: tailX - 30, top: "100%", marginTop: -6 }} viewBox="0 0 60 48">
        <path d="M6 0 L30 44 L54 0" fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <rect x="9" y="0" width="42" height="6" fill="#fff" />
      </svg>
    </div>
  );
};

const SceneView: React.FC<{ scene: Scene; characters: CharacterT[]; audioBase: string | null; hook: boolean }> = ({ scene, characters, audioBase, hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = scene.durationInFrames;
  const progress = frame / d;
  // Hook style uses hard cuts; cozy fades in.
  const fadeIn = hook ? 1 : interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const punch = hook ? 1 + 0.05 * Math.max(0, 1 - frame / 6) : 1;
  const narrationStart = scene.narrationStart ?? 6;

  const cam =
    scene.camera === "close"
      ? `scale(${(1.4 + progress * 0.08) * punch})`
      : scene.camera === "push"
      ? `scale(${1 + progress * 0.08})`
      : scene.camera === "pan-left"
        ? `scale(1.08) translateX(${20 - progress * 40}px)`
        : scene.camera === "pan-right"
          ? `scale(1.08) translateX(${-20 + progress * 40}px)`
          : "scale(1.02)";
  const camera = scene.camera === "close" ? cam : `${cam} scale(${punch})`;

  const cast = scene.cast.filter((c) => characters[c.who]).slice(0, 3);
  const xs = castX(cast.length);
  const hasLine = scene.speaker >= 0 && !!characters[scene.speaker] && !!scene.line;
  const lineDelay = scene.lineStart ?? 10;
  const talkEnd = scene.lineAudio ? lineDelay + scene.lineAudio.frames : lineDelay + 8 + scene.line.split(/\s+/).length * 7;

  return (
    <AbsoluteFill style={{ opacity: fadeIn, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: camera, transformOrigin: scene.camera === "close" ? "50% 74%" : "50% 70%" }}>
        <Background setting={scene.setting} time={scene.time} />
        {cast.map((c, i) => {
          const ch = characters[c.who];
          let x = xs[i];
          let y = 0;
          if (c.action === "enter") {
            const s = spring({ frame: frame - i * 6, fps, config: { damping: 14 } });
            x += (1 - s) * (x < 540 ? -700 : 700);
          } else if (c.action === "jump") {
            y = -Math.abs(Math.sin(t * 5 + i)) * 70;
          } else if (c.action === "shake") {
            x += Math.sin(t * 45) * 7;
          } else if (c.action === "walk") {
            x += (progress - 0.5) * (x <= 540 ? 120 : -120);
            y = -Math.abs(Math.sin(t * 9)) * 12;
          } else {
            y = Math.sin(t * 2.5 + i) * 5;
          }
          const flip = cast.length > 1 && xs[i] > 540;
          const talking = hasLine && scene.speaker === c.who && frame > lineDelay && frame < talkEnd;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - CHAR_SIZE / 2,
                top: GROUND_Y + 50 - CHAR_SIZE * 1.2 + y,
              }}
            >
              <Character
                color={ch.color}
                accessory={ch.accessory}
                mood={c.mood}
                size={CHAR_SIZE}
                t={t}
                flip={flip}
                talking={talking}
                variant={c.who}
              />
            </div>
          );
        })}
      </AbsoluteFill>
      {audioBase && scene.narrationAudio && (
        <Sequence from={narrationStart} layout="none">
          <Audio src={`${audioBase}${scene.narrationAudio.src}`} />
        </Sequence>
      )}
      {audioBase && hasLine && scene.lineAudio && (
        <Sequence from={lineDelay} layout="none">
          <Audio src={`${audioBase}${scene.lineAudio.src}`} />
        </Sequence>
      )}
      {hook ? (
        <HookCaption
          text={scene.narration}
          start={narrationStart}
          span={scene.narrationAudio ? scene.narrationAudio.frames : Math.max(10, (hasLine ? lineDelay : d) - narrationStart - 8)}
          names={new Set(characters.map((c) => c.name.toLowerCase()))}
          top={hasLine ? 470 : 820}
        />
      ) : (
        <Narration text={scene.narration} />
      )}
      {hasLine && (
        <Bubble
          name={characters[scene.speaker].name}
          line={scene.line}
          x={xs[Math.max(0, cast.findIndex((c) => c.who === scene.speaker))] ?? 540}
          delay={lineDelay}
        />
      )}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ title: string; scene?: Scene }> = ({ title, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 3, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill>
      {scene && <Background setting={scene.setting} time={scene.time} />}
      <AbsoluteFill style={{ background: "rgba(27,27,47,0.55)", justifyContent: "center", alignItems: "center", padding: 80 }}>
        <div style={{ fontFamily: FONT, fontSize: 40, color: "#ffd166", letterSpacing: 6, fontWeight: 700, opacity: s }}>A REELHOUSE STORY</div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 118,
            lineHeight: 1.05,
            color: "#fff",
            fontWeight: 700,
            textAlign: "center",
            marginTop: 30,
            transform: `scale(${0.7 + s * 0.3})`,
            opacity: s,
            textShadow: `0 8px 0 ${INK}`,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ characters: CharacterT[]; hook: boolean }> = ({ characters, hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  const t = frame / fps;
  if (hook) {
    return (
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #3a2e6b, #0d0b1f)", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: CAPTION_FONT,
            fontSize: 210,
            color: "#ffd60a",
            textTransform: "uppercase",
            WebkitTextStroke: `12px ${INK}`,
            paintOrder: "stroke fill",
            transform: `scale(${s})`,
          }}
        >
          Part 2?
        </div>
        <div style={{ fontFamily: CAPTION_FONT, fontSize: 64, color: "#fff", textTransform: "uppercase", marginTop: 30, opacity: interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" }) }}>
          Follow so you don&apos;t miss it
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(170deg, #ffd166, #ff8fab)", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 150, fontWeight: 700, color: INK, transform: `scale(${s})` }}>The End</div>
      <div style={{ display: "flex", gap: 10, marginTop: 50 }}>
        {characters.slice(0, 3).map((c, i) => (
          <Character key={i} color={c.color} accessory={c.accessory} mood="happy" size={220} t={t} variant={i} />
        ))}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 52, fontWeight: 600, color: INK, marginTop: 40, opacity: interpolate(frame, [15, 25], [0, 1], { extrapolateRight: "clamp" }) }}>
        Follow for the next story
      </div>
    </AbsoluteFill>
  );
};

/** Music sits under the story and dips while someone is speaking. */
function musicVolume(scenes: Scene[], titleFrames: number, total: number): (f: number) => number {
  const voiced: [number, number][] = [];
  let start = titleFrames;
  for (const s of scenes) {
    const n = s.narrationStart ?? 6;
    if (s.narrationAudio) voiced.push([start + n, start + n + s.narrationAudio.frames]);
    if (s.lineAudio && s.speaker >= 0 && s.line.trim()) voiced.push([start + s.lineStart, start + s.lineStart + s.lineAudio.frames]);
    start += s.durationInFrames;
  }
  const FULL = voiced.length ? 0.32 : 0.5;
  const UNDER = 0.1;
  const RAMP = 8;
  return (f) => {
    let d = Infinity;
    for (const [a, b] of voiced) d = Math.min(d, f < a ? a - f : f > b ? f - b : 0);
    const level = UNDER + (FULL - UNDER) * Math.min(1, d / RAMP);
    const fade = Math.min(1, f / 15, (total - f) / 45);
    return Math.max(0, level * fade);
  };
}

/** The full vertical short story: title card, scenes, end card. */
export const StoryVideo: React.FC<VideoProps> = ({ title, characters, scenes, titleFrames, endFrames, audioBase, music, style }) => {
  const hook = style === "hook";
  let from = titleFrames;
  const total = titleFrames + endFrames + scenes.reduce((s, x) => s + x.durationInFrames, 0);
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {audioBase && music && <Audio src={`${audioBase}${music.src}`} loop volume={musicVolume(scenes, titleFrames, total)} />}
      {titleFrames > 0 && (
        <Sequence durationInFrames={titleFrames}>
          <TitleCard title={title} scene={scenes[0]} />
        </Sequence>
      )}
      {scenes.map((scene, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            <SceneView scene={scene} characters={characters} audioBase={audioBase ?? null} hook={hook} />
          </Sequence>
        );
        from += scene.durationInFrames;
        return seq;
      })}
      <Sequence from={from} durationInFrames={endFrames}>
        <EndCard characters={characters} hook={hook} />
      </Sequence>
    </AbsoluteFill>
  );
};
