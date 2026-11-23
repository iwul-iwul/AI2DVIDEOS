import React from "react";
import type { Mood } from "../lib/types";

/**
 * The on-screen host: a round, flat 2D character.
 * `t` is time in seconds, used for blinking and idle bobbing.
 */
export const Mascot: React.FC<{ mood: Mood; color: string; ink: string; size: number; t: number }> = ({
  mood,
  color,
  ink,
  size,
  t,
}) => {
  const blink = t % 3.2 > 3.05;
  const bob = Math.sin(t * 4) * 3;
  const armWave = Math.sin(t * 8) * 14;

  const leftArm =
    mood === "excited" ? `M58 120 Q30 ${80 + armWave} 34 ${60 + armWave}` : "M58 130 Q36 150 40 170";
  const rightArm =
    mood === "pointing"
      ? "M142 122 Q170 110 192 96"
      : mood === "excited"
        ? `M142 120 Q170 ${80 - armWave} 166 ${60 - armWave}`
        : mood === "thinking"
          ? "M142 128 Q150 104 120 96"
          : "M142 130 Q164 150 160 170";

  const mouth =
    mood === "thinking" ? (
      <ellipse cx="100" cy="132" rx="7" ry="8" fill={ink} />
    ) : mood === "excited" ? (
      <path d="M82 124 Q100 152 118 124 Z" fill={ink} />
    ) : (
      <path d="M84 126 Q100 142 116 126" stroke={ink} strokeWidth={5} fill="none" strokeLinecap="round" />
    );

  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <g transform={`translate(0 ${bob})`}>
        <ellipse cx="100" cy="212" rx="50" ry="6" fill={ink} opacity={0.15} transform={`translate(0 ${-bob})`} />
        <path d={leftArm} stroke={ink} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d={rightArm} stroke={ink} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M76 190v16M124 190v16" stroke={ink} strokeWidth={9} strokeLinecap="round" />
        <rect x="50" y="40" width="100" height="156" rx="50" fill={color} stroke={ink} strokeWidth={6} />
        <path d="M100 40 V22" stroke={ink} strokeWidth={5} />
        <circle cx="100" cy="18" r="8" fill="#fff" stroke={ink} strokeWidth={5} />
        {blink ? (
          <>
            <path d="M74 98h16M110 98h16" stroke={ink} strokeWidth={5} strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="82" cy="98" r="9" fill={ink} />
            <circle cx="118" cy="98" r="9" fill={ink} />
            <circle cx="85" cy="95" r="3" fill="#fff" />
            <circle cx="121" cy="95" r="3" fill="#fff" />
          </>
        )}
        <circle cx="68" cy="118" r="7" fill="#ff8fa3" opacity={0.7} />
        <circle cx="132" cy="118" r="7" fill="#ff8fa3" opacity={0.7} />
        {mouth}
      </g>
    </svg>
  );
};
