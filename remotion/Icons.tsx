import React from "react";
import type { IconName } from "../lib/types";

/** Flat 2D icons drawn on a 100x100 grid. */
export const Icon: React.FC<{ name: IconName; color: string; ink: string; size: number }> = ({
  name,
  color,
  ink,
  size,
}) => {
  const s = { stroke: ink, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  let body: React.ReactNode;
  switch (name) {
    case "bulb":
      body = (
        <>
          <path d="M50 12c-17 0-29 13-29 28 0 11 6 18 12 24v10h34V64c6-6 12-13 12-24 0-15-12-28-29-28z" fill={color} {...s} />
          <rect x="36" y="78" width="28" height="10" rx="4" fill={ink} />
        </>
      );
      break;
    case "chart":
      body = (
        <>
          <rect x="14" y="54" width="16" height="32" rx="3" fill={color} {...s} />
          <rect x="42" y="36" width="16" height="50" rx="3" fill={color} {...s} />
          <rect x="70" y="16" width="16" height="70" rx="3" fill={color} {...s} />
        </>
      );
      break;
    case "clock":
      body = (
        <>
          <circle cx="50" cy="50" r="36" fill={color} {...s} />
          <path d="M50 28v24l14 10" fill="none" {...s} />
        </>
      );
      break;
    case "star":
      body = (
        <path
          d="M50 10l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z"
          fill={color}
          {...s}
        />
      );
      break;
    case "check":
      body = (
        <>
          <circle cx="50" cy="50" r="38" fill={color} {...s} />
          <path d="M32 51l12 12 24-26" fill="none" {...s} strokeWidth={8} />
        </>
      );
      break;
    case "rocket":
      body = (
        <>
          <path d="M50 8c16 12 22 32 18 54H32C28 40 34 20 50 8z" fill={color} {...s} />
          <circle cx="50" cy="36" r="8" fill="#fff" {...s} />
          <path d="M32 62l-12 16 18-4M68 62l12 16-18-4" fill={color} {...s} />
          <path d="M42 70l8 20 8-20" fill="#ffb347" {...s} />
        </>
      );
      break;
    case "heart":
      body = (
        <path
          d="M50 86S14 64 14 38c0-12 9-22 21-22 7 0 12 4 15 9 3-5 8-9 15-9 12 0 21 10 21 22 0 26-36 48-36 48z"
          fill={color}
          {...s}
        />
      );
      break;
    case "chat":
      body = (
        <>
          <path d="M14 20h72v46H44L26 82V66H14z" fill={color} {...s} />
          <circle cx="34" cy="43" r="4" fill={ink} />
          <circle cx="50" cy="43" r="4" fill={ink} />
          <circle cx="66" cy="43" r="4" fill={ink} />
        </>
      );
      break;
    case "warning":
      body = (
        <>
          <path d="M50 12l40 72H10z" fill={color} {...s} />
          <path d="M50 38v22" {...s} strokeWidth={8} />
          <circle cx="50" cy="72" r="4" fill={ink} />
        </>
      );
      break;
    case "money":
      body = (
        <>
          <rect x="10" y="26" width="80" height="48" rx="8" fill={color} {...s} />
          <circle cx="50" cy="50" r="12" fill="#fff" {...s} />
        </>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {body}
    </svg>
  );
};
