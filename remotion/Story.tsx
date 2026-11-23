import React from "react";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Character as CharacterT, Scene, VideoProps } from "../lib/types";
import { Background, GROUND_Y } from "./Backgrounds";
import { Character } from "./Character";

const { fontFamily } = loadFont("normal", { weights: ["600", "700"], subsets: ["latin"] });
const FONT = `${fontFamily}, 'Arial Rounded MT Bold', Arial, sans-serif`;
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

const SceneView: React.FC<{ scene: Scene; characters: CharacterT[]; audioBase: string | null }> = ({ scene, characters, audioBase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = scene.durationInFrames;
  const progress = frame / d;
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const cam =
    scene.camera === "push"
      ? `scale(${1 + progress * 0.08})`
      : scene.camera === "pan-left"
        ? `scale(1.08) translateX(${20 - progress * 40}px)`
        : scene.camera === "pan-right"
          ? `scale(1.08) translateX(${-20 + progress * 40}px)`
          : "scale(1.02)";

  const cast = scene.cast.filter((c) => characters[c.who]).slice(0, 3);
  const xs = castX(cast.length);
  const hasLine = scene.speaker >= 0 && !!characters[scene.speaker] && !!scene.line;
  const lineDelay = scene.lineStart ?? 10;
  const talkEnd = scene.lineAudio ? lineDelay + scene.lineAudio.frames : lineDelay + 8 + scene.line.split(/\s+/).length * 7;

  return (
    <AbsoluteFill style={{ opacity: fadeIn, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: cam, transformOrigin: "50% 70%" }}>
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
        <Sequence from={6} layout="none">
          <Audio src={`${audioBase}${scene.narrationAudio.src}`} />
        </Sequence>
      )}
      {audioBase && hasLine && scene.lineAudio && (
        <Sequence from={lineDelay} layout="none">
          <Audio src={`${audioBase}${scene.lineAudio.src}`} />
        </Sequence>
      )}
      <Narration text={scene.narration} />
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

const EndCard: React.FC<{ characters: CharacterT[] }> = ({ characters }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  const t = frame / fps;
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

/** The full vertical short story: title card, scenes, end card. */
export const StoryVideo: React.FC<VideoProps> = ({ title, characters, scenes, titleFrames, endFrames, audioBase }) => {
  let from = titleFrames;
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      <Sequence durationInFrames={titleFrames}>
        <TitleCard title={title} scene={scenes[0]} />
      </Sequence>
      {scenes.map((scene, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            <SceneView scene={scene} characters={characters} audioBase={audioBase ?? null} />
          </Sequence>
        );
        from += scene.durationInFrames;
        return seq;
      })}
      <Sequence from={from} durationInFrames={endFrames}>
        <EndCard characters={characters} />
      </Sequence>
    </AbsoluteFill>
  );
};
