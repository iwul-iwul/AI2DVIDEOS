import React from "react";
import type { Setting, TimeOfDay } from "../lib/types";

/** Characters stand on this line (in the 1080x1920 frame). */
export const GROUND_Y = 1560;
const W = 1080;
const H = 1920;
const G = GROUND_Y;
const INK = "#1b1b2f";

const SKY: Record<TimeOfDay, [string, string]> = {
  day: ["#7cc6f2", "#d4f0ff"],
  sunset: ["#ff8a65", "#ffd6a5"],
  night: ["#0b1d3a", "#2e3f6b"],
};

const Sky: React.FC<{ time: TimeOfDay; id: string }> = ({ time, id }) => (
  <>
    <defs>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={SKY[time][0]} />
        <stop offset="1" stopColor={SKY[time][1]} />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill={`url(#sky-${id})`} />
    {time === "night" && <Stars count={40} maxY={G - 300} />}
    {time === "night" ? (
      <circle cx="820" cy="660" r="70" fill="#fff6d5" />
    ) : (
      <circle cx="820" cy={time === "sunset" ? 1000 : 660} r="90" fill={time === "sunset" ? "#ffb347" : "#ffe066"} />
    )}
  </>
);

const Stars: React.FC<{ count: number; maxY: number }> = ({ count, maxY }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <circle key={i} cx={(i * 337) % W} cy={(i * 211) % maxY} r={i % 3 === 0 ? 4 : 2.5} fill="#fff" opacity={0.85} />
    ))}
  </>
);

/** Dims indoor scenes at night and warms them at sunset. */
const Tint: React.FC<{ time: TimeOfDay }> = ({ time }) =>
  time === "day" ? null : <rect width={W} height={H} fill={time === "night" ? "#0b1d3a" : "#ff8a65"} opacity={time === "night" ? 0.35 : 0.12} />;

const Window: React.FC<{ x: number; y: number; w: number; h: number; time: TimeOfDay; id: string }> = ({ x, y, w, h, time, id }) => (
  <g>
    <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Sky time={time} id={`win-${id}`} />
    </svg>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke="#f4f1de" strokeWidth={18} />
    <path d={`M${x + w / 2} ${y} v${h} M${x} ${y + h / 2} h${w}`} stroke="#f4f1de" strokeWidth={10} />
  </g>
);

function Forest({ time }: { time: TimeOfDay }) {
  const tree = (x: number, s: number, c: string) => (
    <g key={x} transform={`translate(${x} ${G}) scale(${s})`}>
      <rect x="-18" y="-120" width="36" height="120" fill="#7a4e2d" />
      <path d="M-120 -100 L0 -420 L120 -100Z" fill={c} stroke={INK} strokeWidth={5} />
      <path d="M-100 -240 L0 -520 L100 -240Z" fill={c} stroke={INK} strokeWidth={5} />
    </g>
  );
  return (
    <>
      <Sky time={time} id="forest" />
      <ellipse cx="200" cy={G + 40} rx="700" ry="380" fill="#74c69d" />
      <ellipse cx="900" cy={G + 60} rx="600" ry="320" fill="#52b788" />
      {[80, 330, 620, 960].map((x, i) => tree(x, 0.8 + (i % 2) * 0.25, i % 2 ? "#2d6a4f" : "#40916c"))}
      <rect y={G} width={W} height={H - G} fill="#95d5b2" />
      <rect y={G} width={W} height="12" fill="#2d6a4f" opacity={0.4} />
      {[150, 480, 820].map((x) => (
        <g key={x}>
          <circle cx={x} cy={G + 120} r="14" fill="#ff8fab" />
          <circle cx={x} cy={G + 120} r="6" fill="#ffd166" />
        </g>
      ))}
    </>
  );
}

function City({ time }: { time: TimeOfDay }) {
  const lit = time === "night" ? "#ffe066" : "#bde0fe";
  const blocks = [
    { x: -20, w: 240, h: 700, c: "#577590" },
    { x: 230, w: 200, h: 900, c: "#4d908e" },
    { x: 440, w: 260, h: 620, c: "#f3722c" },
    { x: 710, w: 180, h: 980, c: "#43aa8b" },
    { x: 900, w: 200, h: 760, c: "#90be6d" },
  ];
  return (
    <>
      <Sky time={time} id="city" />
      {blocks.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={G - b.h} width={b.w} height={b.h} fill={b.c} stroke={INK} strokeWidth={5} />
          {Array.from({ length: Math.floor(b.h / 110) }, (_, r) =>
            [0, 1].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={b.x + 30 + c * (b.w / 2 - 10)}
                y={G - b.h + 40 + r * 110}
                width={b.w / 2 - 60}
                height="60"
                fill={(r + c + b.x) % 3 === 0 && time !== "night" ? "#8ecae6" : lit}
                opacity={time === "night" && (r + c) % 3 === 1 ? 0.25 : 1}
              />
            )),
          )}
        </g>
      ))}
      <rect y={G} width={W} height={H - G} fill="#6c757d" />
      <rect y={G} width={W} height="40" fill="#adb5bd" />
      {[100, 400, 700, 1000].map((x) => (
        <rect key={x} x={x - 60} y={G + 200} width="120" height="16" fill="#f8f9fa" />
      ))}
    </>
  );
}

function Bedroom({ time }: { time: TimeOfDay }) {
  return (
    <>
      <rect width={W} height={H} fill="#cdb4db" />
      <rect y="0" width={W} height="40" fill="#b392ac" />
      <Window x={620} y={520} w={340} h={420} time={time} id="bed" />
      <rect x="110" y="600" width="200" height="260" fill="#ffc8dd" stroke={INK} strokeWidth={5} />
      <circle cx="210" cy="700" r="50" fill="#ffafcc" />
      <path d={`M150 820 l60 -60 l60 60z`} fill="#bde0fe" />
      {/* bed */}
      <rect x="560" y={G - 200} width="480" height="160" rx="20" fill="#a2d2ff" stroke={INK} strokeWidth={6} />
      <rect x="980" y={G - 300} width="60" height="300" rx="12" fill="#7a4e2d" stroke={INK} strokeWidth={6} />
      <rect x="600" y={G - 250} width="150" height="70" rx="30" fill="#fff" stroke={INK} strokeWidth={5} />
      <rect y={G} width={W} height={H - G} fill="#9c6644" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i * 190} y={G} width="6" height={H - G} fill="#7f5539" />
      ))}
      <Tint time={time} />
    </>
  );
}

function Space({ time }: { time: TimeOfDay }) {
  void time;
  return (
    <>
      <rect width={W} height={H} fill="#10002b" />
      <Stars count={90} maxY={G} />
      <circle cx="800" cy="520" r="200" fill="#ff9e00" stroke={INK} strokeWidth={6} />
      <ellipse cx="800" cy="520" rx="320" ry="60" fill="none" stroke="#ffd166" strokeWidth={18} />
      <circle cx="220" cy="300" r="60" fill="#4cc9f0" stroke={INK} strokeWidth={5} />
      <path d={`M0 ${G} Q270 ${G - 60} 540 ${G} T1080 ${G} V${H} H0Z`} fill="#adb5bd" />
      {[160, 520, 860].map((x) => (
        <ellipse key={x} cx={x} cy={G + 140} rx="70" ry="22" fill="#868e96" />
      ))}
    </>
  );
}

function Beach({ time }: { time: TimeOfDay }) {
  return (
    <>
      <Sky time={time} id="beach" />
      <rect y={G - 380} width={W} height="380" fill={time === "night" ? "#1d3557" : "#219ebc"} />
      {[0, 1, 2].map((r) => (
        <path
          key={r}
          d={`M0 ${G - 300 + r * 100} q90 -30 180 0 t180 0 t180 0 t180 0 t180 0 t180 0`}
          stroke="#fff"
          strokeWidth={8}
          fill="none"
          opacity={0.5}
        />
      ))}
      <path d={`M0 ${G - 40} Q540 ${G - 90} 1080 ${G - 30} V${H} H0Z`} fill="#ffd6a5" />
      <g transform={`translate(140 ${G - 40})`}>
        <path d="M0 0 q20 -200 60 -420" stroke="#7a4e2d" strokeWidth={28} fill="none" strokeLinecap="round" />
        {[-60, -20, 20, 60, 100].map((a) => (
          <path key={a} d={`M60 -420 q${a * 2} -40 ${a * 3.4} 70`} stroke="#2d6a4f" strokeWidth={26} fill="none" strokeLinecap="round" />
        ))}
      </g>
      <rect y={G} width={W} height={H - G} fill="#fec89a" />
    </>
  );
}

function Castle({ time }: { time: TimeOfDay }) {
  const tower = (x: number, h: number) => (
    <g key={x}>
      <rect x={x} y={G - h} width="160" height={h} fill="#adb5bd" stroke={INK} strokeWidth={6} />
      <path d={`M${x - 20} ${G - h} L${x + 80} ${G - h - 180} L${x + 180} ${G - h}Z`} fill="#7b2cbf" stroke={INK} strokeWidth={6} />
      <path d={`M${x + 80} ${G - h - 180} v-80`} stroke={INK} strokeWidth={6} />
      <path d={`M${x + 80} ${G - h - 260} l70 25 l-70 25z`} fill="#ef476f" />
      <rect x={x + 55} y={G - h + 80} width="50" height="80" rx="25" fill={time === "night" ? "#ffe066" : INK} />
    </g>
  );
  return (
    <>
      <Sky time={time} id="castle" />
      <ellipse cx="540" cy={G + 80} rx="900" ry="300" fill="#74c69d" />
      {tower(80, 760)}
      {tower(840, 760)}
      <rect x="230" y={G - 560} width="620" height="560" fill="#ced4da" stroke={INK} strokeWidth={6} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={240 + i * 88} y={G - 610} width="60" height="60" fill="#ced4da" stroke={INK} strokeWidth={6} />
      ))}
      <path d={`M440 ${G} v-200 a100 100 0 0 1 200 0 v200z`} fill="#7a4e2d" stroke={INK} strokeWidth={6} />
      <rect y={G} width={W} height={H - G} fill="#b7b7a4" />
    </>
  );
}

function Cafe({ time }: { time: TimeOfDay }) {
  return (
    <>
      <rect width={W} height={H} fill="#ffe8d6" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 90} y="0" width="45" height={G} fill="#ffd7ba" />
      ))}
      <rect x="120" y="420" width="400" height="300" rx="12" fill="#344e41" stroke="#7a4e2d" strokeWidth={16} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="160" y={470 + i * 60} width={200 + ((i * 70) % 120)} height="16" rx="8" fill="#f8f9fa" opacity={0.8} />
      ))}
      <Window x={640} y={420} w={340} h={360} time={time} id="cafe" />
      {/* counter */}
      <rect x="-20" y={G - 260} width="1120" height="40" fill="#7f5539" stroke={INK} strokeWidth={6} />
      <rect x="-20" y={G - 220} width="1120" height="220" fill="#b08968" stroke={INK} strokeWidth={6} />
      <g transform={`translate(780 ${G - 360})`}>
        <rect width="120" height="100" rx="10" fill="#adb5bd" stroke={INK} strokeWidth={5} />
        <path d="M30 -20 q10 -30 0 -50 M60 -20 q10 -30 0 -50 M90 -20 q10 -30 0 -50" stroke="#fff" strokeWidth={6} fill="none" opacity={0.8} />
      </g>
      <rect y={G} width={W} height={H - G} fill="#e9edc9" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={i * 180 + ((i % 2) * 90)} y={G + 60} width="90" height="90" fill="#ccd5ae" />
      ))}
      <Tint time={time} />
    </>
  );
}

function Classroom({ time }: { time: TimeOfDay }) {
  return (
    <>
      <rect width={W} height={H} fill="#caf0f8" />
      <rect x="90" y="380" width="680" height="440" rx="10" fill="#2d6a4f" stroke="#7a4e2d" strokeWidth={20} />
      <path d="M150 480 h220 M150 560 h340 M150 640 h160" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.85} />
      <circle cx="900" cy="460" r="70" fill="#fff" stroke={INK} strokeWidth={6} />
      <path d="M900 460 v-45 M900 460 l30 18" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <rect x="70" y={G - 180} width="300" height="24" fill="#c58b5a" stroke={INK} strokeWidth={5} />
      <rect x="90" y={G - 156} width="16" height="156" fill="#7a4e2d" />
      <rect x="334" y={G - 156} width="16" height="156" fill="#7a4e2d" />
      <rect x="720" y={G - 180} width="300" height="24" fill="#c58b5a" stroke={INK} strokeWidth={5} />
      <rect x="740" y={G - 156} width="16" height="156" fill="#7a4e2d" />
      <rect x="984" y={G - 156} width="16" height="156" fill="#7a4e2d" />
      <rect y={G} width={W} height={H - G} fill="#adb5bd" />
      <Tint time={time} />
    </>
  );
}

export const Background: React.FC<{ setting: Setting; time: TimeOfDay }> = ({ setting, time }) => {
  const C = { forest: Forest, city: City, bedroom: Bedroom, space: Space, beach: Beach, castle: Castle, cafe: Cafe, classroom: Classroom }[setting];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <C time={time} />
    </svg>
  );
};
