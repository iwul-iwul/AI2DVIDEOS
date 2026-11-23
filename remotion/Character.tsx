import React from "react";
import type { Accessory, CharacterColor, Mood } from "../lib/types";

export const BODY_COLORS: Record<CharacterColor, string> = {
  yellow: "#ffd23f",
  pink: "#ff8fab",
  blue: "#5fa8ff",
  green: "#6bd68f",
  orange: "#ff9f43",
  purple: "#b28dff",
  red: "#ff6b6b",
  teal: "#3ccfcf",
};

const INK = "#1b1b2f";

/**
 * A round, flat 2D story character drawn on a 200x240 grid (feet at the bottom).
 * `t` is time in seconds for blinking and arm motion. `flip` faces it left.
 */
export const Character: React.FC<{
  color: CharacterColor;
  accessory: Accessory;
  mood: Mood;
  size: number;
  t: number;
  flip?: boolean;
  talking?: boolean;
  /** Small per-character variation so a cast doesn't look identical. */
  variant?: number;
}> = ({ color, accessory, mood, size, t, flip, talking, variant = 0 }) => {
  const fill = BODY_COLORS[color];
  const blink = (t + variant * 0.9) % 3.4 > 3.25;
  const wave = Math.sin(t * 8) * 14;
  const tall = variant % 2 === 0 ? 0 : 14;
  const top = 50 - tall;

  // Arms
  let leftArm = "M58 140 Q38 160 42 180";
  let rightArm = "M142 140 Q162 160 158 180";
  if (mood === "excited" || mood === "happy") {
    leftArm = `M58 130 Q30 ${92 + wave} 34 ${72 + wave}`;
    if (mood === "excited") rightArm = `M142 130 Q170 ${92 - wave} 166 ${72 - wave}`;
  } else if (mood === "thinking") {
    rightArm = "M142 136 Q150 114 122 108";
  } else if (mood === "angry") {
    leftArm = "M58 140 Q44 128 64 120";
    rightArm = "M142 140 Q156 128 136 120";
  } else if (mood === "scared" || mood === "surprised") {
    leftArm = "M58 130 Q30 110 40 90";
    rightArm = "M142 130 Q170 110 160 90";
  } else if (mood === "sad") {
    leftArm = "M58 144 Q50 170 54 190";
    rightArm = "M142 144 Q150 170 146 190";
  }

  // Eyes
  const eyeY = top + 56;
  const eyes = blink ? (
    <path d={`M74 ${eyeY}h16M110 ${eyeY}h16`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
  ) : mood === "happy" || mood === "excited" ? (
    <path
      d={`M74 ${eyeY + 3} q8 -12 16 0 M110 ${eyeY + 3} q8 -12 16 0`}
      stroke={INK}
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
    />
  ) : (
    <>
      <circle cx="82" cy={eyeY} r={mood === "surprised" || mood === "scared" ? 11 : 9} fill={INK} />
      <circle cx="118" cy={eyeY} r={mood === "surprised" || mood === "scared" ? 11 : 9} fill={INK} />
      <circle cx="85" cy={eyeY - 3} r="3" fill="#fff" />
      <circle cx="121" cy={eyeY - 3} r="3" fill="#fff" />
    </>
  );

  const brows =
    mood === "angry" ? (
      <path d={`M70 ${eyeY - 20} l20 8 M130 ${eyeY - 20} l-20 8`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    ) : mood === "sad" || mood === "scared" ? (
      <path d={`M72 ${eyeY - 14} l18 -6 M128 ${eyeY - 14} l-18 -6`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    ) : mood === "thinking" ? (
      <path d={`M110 ${eyeY - 20} q10 -6 18 0`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
    ) : null;

  // Mouth (opens and closes while talking)
  const mY = top + 86;
  const open = talking ? Math.abs(Math.sin(t * 14)) : 0;
  let mouth: React.ReactNode;
  if (talking) {
    mouth = <ellipse cx="100" cy={mY} rx="12" ry={3 + open * 10} fill={INK} />;
  } else if (mood === "sad") {
    mouth = <path d={`M86 ${mY + 6} Q100 ${mY - 8} 114 ${mY + 6}`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
  } else if (mood === "surprised" || mood === "scared") {
    mouth = <ellipse cx="100" cy={mY} rx="9" ry="12" fill={INK} />;
  } else if (mood === "angry") {
    mouth = <path d={`M86 ${mY + 2} h28`} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
  } else if (mood === "excited") {
    mouth = <path d={`M82 ${mY - 6} Q100 ${mY + 22} 118 ${mY - 6} Z`} fill={INK} />;
  } else if (mood === "thinking") {
    mouth = <path d={`M90 ${mY} q10 -4 20 2`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
  } else {
    mouth = <path d={`M84 ${mY - 4} Q100 ${mY + 12} 116 ${mY - 4}`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
  }

  let hat: React.ReactNode = null;
  switch (accessory) {
    case "hat":
      hat = (
        <>
          <rect x="62" y={top - 12} width="76" height="14" rx="6" fill="#2b2d42" stroke={INK} strokeWidth={4} />
          <rect x="76" y={top - 48} width="48" height="40" rx="6" fill="#2b2d42" stroke={INK} strokeWidth={4} />
          <rect x="76" y={top - 22} width="48" height="8" fill="#ef476f" />
        </>
      );
      break;
    case "bow":
      hat = (
        <g transform={`translate(128 ${top + 2})`}>
          <path d="M0 0 L-22 -14 L-22 14 Z M0 0 L22 -14 L22 14 Z" fill="#ef476f" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <circle r="7" fill="#ef476f" stroke={INK} strokeWidth={4} />
        </g>
      );
      break;
    case "glasses":
      hat = (
        <g fill="none" stroke={INK} strokeWidth={4}>
          <circle cx="82" cy={eyeY} r="17" />
          <circle cx="118" cy={eyeY} r="17" />
          <path d={`M99 ${eyeY} h2`} />
        </g>
      );
      break;
    case "crown":
      hat = (
        <path
          d={`M66 ${top + 4} L70 ${top - 34} L86 ${top - 14} L100 ${top - 40} L114 ${top - 14} L130 ${top - 34} L134 ${top + 4} Z`}
          fill="#ffd166"
          stroke={INK}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      );
      break;
    case "scarf":
      hat = (
        <>
          <rect x="52" y={top + 108} width="96" height="18" rx="9" fill="#ef476f" stroke={INK} strokeWidth={4} />
          <rect x="112" y={top + 118} width="18" height="40" rx="6" fill="#ef476f" stroke={INK} strokeWidth={4} />
        </>
      );
      break;
  }

  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" style={{ overflow: "visible" }}>
      <g transform={flip ? "translate(200 0) scale(-1 1)" : undefined}>
        <ellipse cx="100" cy="232" rx="54" ry="7" fill={INK} opacity={0.18} />
        <path d={leftArm} stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={rightArm} stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d="M78 206v22M122 206v22" stroke={INK} strokeWidth={10} strokeLinecap="round" />
        <rect x="50" y={top} width="100" height={162 + tall} rx="50" fill={fill} stroke={INK} strokeWidth={6} />
        <ellipse cx="100" cy={top + 120 + tall / 2} rx="30" ry="26" fill="#fff" opacity={0.35} />
        <circle cx="68" cy={eyeY + 22} r="8" fill="#ff8fa3" opacity={0.6} />
        <circle cx="132" cy={eyeY + 22} r="8" fill="#ff8fa3" opacity={0.6} />
        {eyes}
        {brows}
        {mouth}
        {hat}
        {mood === "scared" && (
          <path d={`M150 ${top + 20} q6 12 0 18 q-6 -6 0 -18`} fill="#8ecae6" stroke={INK} strokeWidth={3} />
        )}
      </g>
    </svg>
  );
};
