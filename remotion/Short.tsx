import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Scene, VideoProps } from "../lib/types";
import { Icon } from "./Icons";
import { Mascot } from "./Mascot";

const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

/** Words pop in one after another. */
const PopText: React.FC<{ text: string; color: string; size: number; delay?: number; align?: "center" | "left" }> = ({
  text,
  color,
  size,
  delay = 0,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.08,
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0 ${size * 0.28}px`,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * 3, fps, config: { damping: 12, stiffness: 180 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - s) * 40}px) scale(${0.6 + s * 0.4})`,
              opacity: s,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Slow-drifting flat shapes behind every scene. */
const Backdrop: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = scene.palette;
  const shapes = [
    { x: 0.12, y: 0.18, r: 120, sp: 0.6 },
    { x: 0.86, y: 0.3, r: 80, sp: 0.9 },
    { x: 0.2, y: 0.82, r: 160, sp: 0.4 },
    { x: 0.8, y: 0.9, r: 100, sp: 0.7 },
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${p.bg} 0%, ${p.bg2} 100%)` }}>
      {shapes.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x * width - s.r + Math.sin((frame / 30) * s.sp + i) * 30,
            top: s.y * height - s.r + Math.cos((frame / 30) * s.sp + i) * 30,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: i % 2 ? "50%" : 40,
            background: p.accent,
            opacity: 0.16,
            transform: `rotate(${frame * s.sp}deg)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = scene.palette;
  const t = frame / fps;
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [scene.durationInFrames - 8, scene.durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const iconPop = spring({ frame: frame - 6, fps, config: { damping: 9 } });

  const items = scene.kind === "list" ? scene.line.split("|").map((x) => x.trim()).filter(Boolean) : [];

  const mascotSide = scene.layout === "left" ? "flex-start" : scene.layout === "right" ? "flex-end" : "center";

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <Backdrop scene={scene} />
      <AbsoluteFill
        style={{
          padding: "200px 80px 120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transform: `translateY(${(1 - enter) * 80}px)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "center" }}>
          {scene.kind !== "list" && (
            <div style={{ transform: `scale(${iconPop}) rotate(${Math.sin(t * 2) * 6}deg)` }}>
              <Icon name={scene.icon} color={p.accent} ink={p.ink} size={scene.kind === "hook" ? 220 : 180} />
            </div>
          )}
          <PopText text={scene.onScreen} color={p.ink} size={scene.kind === "hook" ? 112 : 92} delay={4} />
          {scene.kind === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%", marginTop: 20 }}>
              {items.map((it, i) => {
                const s = spring({ frame: frame - 14 - i * 10, fps, config: { damping: 13 } });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 28,
                      background: p.card,
                      borderRadius: 32,
                      padding: "26px 34px",
                      border: `6px solid ${p.ink}`,
                      transform: `translateX(${(1 - s) * -600}px)`,
                      opacity: s,
                    }}
                  >
                    <Icon name="check" color={p.accent} ink={p.ink} size={80} />
                    <span style={{ fontFamily: FONT, fontSize: 58, color: p.ink, fontWeight: 900 }}>{it}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            scene.line && (
              <div
                style={{
                  background: p.card,
                  border: `6px solid ${p.ink}`,
                  borderRadius: 36,
                  padding: "30px 40px",
                  opacity: interpolate(frame, [12, 22], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: 60, lineHeight: 1.2, color: p.ink, textAlign: "center" }}>
                  {scene.line}
                </div>
              </div>
            )
          )}
        </div>
        <div style={{ display: "flex", justifyContent: mascotSide }}>
          <Mascot mood={scene.mood} color={p.accent} ink={p.ink} size={480} t={t} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The full vertical short: scenes in sequence plus a progress bar. */
export const Short: React.FC<VideoProps> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  let from = 0;
  const ink = scenes[0]?.palette.ink ?? "#1b1b2f";
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {scenes.map((scene, i) => {
        const seq = (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            <SceneView scene={scene} />
          </Sequence>
        );
        from += scene.durationInFrames;
        return seq;
      })}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 90,
          right: 90,
          height: 14,
          borderRadius: 7,
          background: "rgba(255,255,255,0.4)",
          border: `3px solid ${ink}`,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: "100%", background: ink }} />
      </div>
    </AbsoluteFill>
  );
};
