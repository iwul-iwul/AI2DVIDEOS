"use client";

import React from "react";

export type RoomId = "producer" | "qa" | "research" | "script" | "art" | "edit" | "voice" | "ship";

export interface RoomInfo {
  id: RoomId;
  name: string;
  agent: string;
  role: string;
}

export const ROOMS: RoomInfo[] = [
  { id: "producer", name: "Producer's Office", agent: "Bea", role: "Runs the autopilot and picks the next story" },
  { id: "qa", name: "QA Lab", agent: "Vera", role: "Checks and fixes each story before it is drawn" },
  { id: "research", name: "Research Desk", agent: "Pip", role: "Pitches short story ideas" },
  { id: "script", name: "Script Room", agent: "Quill", role: "Writes the story, cast and dialogue" },
  { id: "art", name: "Art Studio", agent: "Dot", role: "Stages each scene and camera move" },
  { id: "edit", name: "Edit Bay", agent: "Splice", role: "Animates and renders the MP4" },
  { id: "voice", name: "Sound Booth", agent: "Echo", role: "Records the narrator and character voices" },
  { id: "ship", name: "Shipping Dock", agent: "Hatch", role: "Packs the video with a caption" },
];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LAYOUT: Record<RoomId, Box> = {
  producer: { x: 40, y: 170, w: 400, h: 240 },
  qa: { x: 460, y: 170, w: 400, h: 240 },
  research: { x: 40, y: 430, w: 400, h: 240 },
  script: { x: 460, y: 430, w: 400, h: 240 },
  art: { x: 40, y: 690, w: 400, h: 240 },
  edit: { x: 460, y: 690, w: 400, h: 240 },
  voice: { x: 40, y: 950, w: 400, h: 240 },
  ship: { x: 460, y: 950, w: 400, h: 240 },
};

const WALLS: Record<RoomId, [string, string]> = {
  voice: ["#3a3a5c", "#2c2c48"],
  producer: ["#9a3b4f", "#7d2f40"],
  qa: ["#2f8a7a", "#246e61"],
  research: ["#2f6f8f", "#245873"],
  script: ["#8a5a9e", "#6f4782"],
  art: ["#c0704a", "#a35c3a"],
  edit: ["#3d4f8a", "#2f3d6e"],
  ship: ["#4f7a52", "#3f6442"],
};

const LOOKS: Record<RoomId, { skin: string; hair: string; shirt: string }> = {
  voice: { skin: "#e8b48a", hair: "#ef476f", shirt: "#ffd166" },
  producer: { skin: "#a86b4c", hair: "#2b1a12", shirt: "#f4f1de" },
  qa: { skin: "#f6d1b5", hair: "#c9a227", shirt: "#8338ec" },
  research: { skin: "#f2c9a0", hair: "#3b2a20", shirt: "#ffd166" },
  script: { skin: "#8d5a3b", hair: "#1d1d1d", shirt: "#ef476f" },
  art: { skin: "#ffdbb8", hair: "#e85d75", shirt: "#06d6a0" },
  edit: { skin: "#c68a5e", hair: "#f4f1de", shirt: "#118ab2" },
  ship: { skin: "#e0ac82", hair: "#7a4b2a", shirt: "#ff9f1c" },
};

/** A small studio worker, standing at (x, y) = feet position. */
const Worker: React.FC<{ id: RoomId; x: number; y: number; working: boolean }> = ({ id, x, y, working }) => {
  const look = LOOKS[id];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={working ? "worker worker-busy" : "worker"}>
        <ellipse cx="0" cy="2" rx="22" ry="5" fill="#000" opacity="0.2" />
        <rect x="-11" y="-30" width="9" height="30" rx="4" fill="#2b2d42" />
        <rect x="2" y="-30" width="9" height="30" rx="4" fill="#2b2d42" />
        <rect x="-18" y="-72" width="36" height="46" rx="14" fill={look.shirt} stroke="#1b1b2f" strokeWidth="3" />
        <g className={working ? "arm arm-busy" : "arm"}>
          <rect x="14" y="-66" width="9" height="30" rx="4.5" fill={look.shirt} stroke="#1b1b2f" strokeWidth="2.5" />
        </g>
        <circle cx="0" cy="-92" r="22" fill={look.skin} stroke="#1b1b2f" strokeWidth="3" />
        <path d="M-22 -96 Q-20 -120 0 -118 Q22 -120 22 -96 Q12 -106 -22 -96z" fill={look.hair} stroke="#1b1b2f" strokeWidth="2.5" />
        <g className="eyes">
          <circle cx="-8" cy="-90" r="3" fill="#1b1b2f" />
          <circle cx="8" cy="-90" r="3" fill="#1b1b2f" />
        </g>
        <path d="M-6 -80 Q0 -75 6 -80" stroke="#1b1b2f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {working && (
        <g className="bubble" transform="translate(18 -150)">
          <rect x="0" y="0" width="52" height="30" rx="15" fill="#fff" stroke="#1b1b2f" strokeWidth="2.5" />
          <circle className="dot d1" cx="15" cy="15" r="4" fill="#1b1b2f" />
          <circle className="dot d2" cx="26" cy="15" r="4" fill="#1b1b2f" />
          <circle className="dot d3" cx="37" cy="15" r="4" fill="#1b1b2f" />
        </g>
      )}
    </g>
  );
};

const Desk: React.FC<{ x: number; y: number; w?: number }> = ({ x, y, w = 140 }) => (
  <g>
    <rect x={x} y={y} width={w} height="14" rx="4" fill="#c58b5a" stroke="#1b1b2f" strokeWidth="3" />
    <rect x={x + 10} y={y + 14} width="10" height="46" fill="#8c5a33" />
    <rect x={x + w - 20} y={y + 14} width="10" height="46" fill="#8c5a33" />
  </g>
);

const Monitor: React.FC<{ x: number; y: number; w?: number; h?: number; children?: React.ReactNode }> = ({
  x,
  y,
  w = 70,
  h = 46,
  children,
}) => (
  <g>
    <rect x={x + w / 2 - 5} y={y + h} width="10" height="12" fill="#1b1b2f" />
    <rect x={x} y={y} width={w} height={h} rx="5" fill="#1b1b2f" />
    <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="3" fill="#bde0fe" />
    {children}
  </g>
);

function RoomArt({ id, b, working }: { id: RoomId; b: Box; working: boolean }) {
  const floor = b.y + b.h - 30;
  switch (id) {
    case "producer":
      return (
        <>
          {/* schedule board */}
          <rect x={b.x + 24} y={b.y + 56} width="150" height="110" rx="6" fill="#f8f9fa" stroke="#1b1b2f" strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={b.x + 36} y={b.y + 68 + i * 24} width="14" height="14" rx="3" fill={i < 2 ? "#06d6a0" : "#dee2e6"} stroke="#1b1b2f" strokeWidth="2" />
              <rect x={b.x + 58} y={b.y + 72 + i * 24} width={80 - i * 10} height="6" rx="3" fill="#adb5bd" />
            </g>
          ))}
          {/* clapperboard */}
          <g transform={`translate(${b.x + 330} ${b.y + 70})`}>
            <rect width="56" height="40" fill="#2b2d42" stroke="#1b1b2f" strokeWidth="3" />
            <g className={working ? "clap" : undefined}>
              <rect y="-14" width="56" height="12" fill="#f8f9fa" stroke="#1b1b2f" strokeWidth="3" />
              <path d="M10 -14 l8 12 M26 -14 l8 12 M42 -14 l8 12" stroke="#1b1b2f" strokeWidth="3" />
            </g>
          </g>
          <Desk x={b.x + 200} y={floor - 60} w={170} />
          {/* big chair */}
          <rect x={b.x + 230} y={floor - 120} width="50" height="64" rx="12" fill="#ef476f" stroke="#1b1b2f" strokeWidth="3" />
          <Monitor x={b.x + 300} y={floor - 118} w={60} h={40}>
            <circle cx={b.x + 330} cy={floor - 98} r="10" fill="#06d6a0" className={working ? "thump" : undefined} />
          </Monitor>
          <Worker id={id} x={b.x + 190} y={floor} working={working} />
        </>
      );
    case "qa":
      return (
        <>
          {/* checklist */}
          <rect x={b.x + 30} y={b.y + 56} width="120" height="140" rx="8" fill="#fff8e6" stroke="#1b1b2f" strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path
                className={working ? "tick" : undefined}
                style={{ animationDelay: `${i * 0.3}s` }}
                d={`M${b.x + 42} ${b.y + 82 + i * 28} l6 6 l10 -12`}
                stroke="#06d6a0"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <rect x={b.x + 66} y={b.y + 80 + i * 28} width="70" height="6" rx="3" fill="#adb5bd" />
            </g>
          ))}
          <Desk x={b.x + 200} y={floor - 60} w={170} />
          {/* magnifier */}
          <g className={working ? "scan" : undefined}>
            <circle cx={b.x + 290} cy={floor - 100} r="22" fill="#bde0fe" fillOpacity="0.6" stroke="#1b1b2f" strokeWidth="5" />
            <path d={`M${b.x + 306} ${floor - 84} l20 20`} stroke="#1b1b2f" strokeWidth="8" strokeLinecap="round" />
          </g>
          <rect x={b.x + 230} y={floor - 72} width="44" height="10" fill="#fff" stroke="#1b1b2f" strokeWidth="2" />
          <Worker id={id} x={b.x + 180} y={floor} working={working} />
        </>
      );
    case "research":
      return (
        <>
          {/* bookshelf */}
          <rect x={b.x + 20} y={b.y + 60} width="110" height="150" fill="#7a4e2d" stroke="#1b1b2f" strokeWidth="3" />
          {[0, 1, 2].map((row) =>
            ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#f78c6b", "#8338ec"].map((c, i) => (
              <rect key={`${row}-${i}`} x={b.x + 28 + i * 16} y={b.y + 72 + row * 46} width="12" height={34 - (i % 3) * 4} fill={c} />
            )),
          )}
          {/* globe */}
          <circle cx={b.x + 345} cy={b.y + 120} r="22" fill="#4cc9f0" stroke="#1b1b2f" strokeWidth="3" />
          <path d={`M${b.x + 333} ${b.y + 110} q10 6 6 16 q8 4 14 -6`} fill="#80ed99" />
          <rect x={b.x + 340} y={b.y + 142} width="10" height="24" fill="#1b1b2f" />
          <Desk x={b.x + 180} y={floor - 60} w={160} />
          <Monitor x={b.x + 225} y={floor - 118}>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                className={working ? "bar-grow" : undefined}
                style={{ animationDelay: `${i * 0.15}s` }}
                x={b.x + 236 + i * 12}
                y={floor - 82 - i * 6}
                width="8"
                height={8 + i * 6}
                fill="#ef476f"
              />
            ))}
          </Monitor>
          <Worker id={id} x={b.x + 160} y={floor} working={working} />
        </>
      );
    case "script":
      return (
        <>
          {/* corkboard */}
          <rect x={b.x + 30} y={b.y + 60} width="150" height="100" rx="6" fill="#d4a373" stroke="#1b1b2f" strokeWidth="3" />
          {["#ffd166", "#90e0ef", "#f4acb7", "#caffbf", "#ffd166", "#bdb2ff"].map((c, i) => (
            <rect
              key={i}
              className={working ? "note-wiggle" : undefined}
              style={{ animationDelay: `${i * 0.2}s` }}
              x={b.x + 42 + (i % 3) * 46}
              y={b.y + 70 + Math.floor(i / 3) * 44}
              width="34"
              height="34"
              fill={c}
            />
          ))}
          {/* lamp */}
          <path d={`M${b.x + 350} ${floor - 60} v-50 l-18 -14`} stroke="#1b1b2f" strokeWidth="4" fill="none" />
          <path d={`M${b.x + 312} ${floor - 120} l24 -6 l6 22 z`} fill="#ffd166" stroke="#1b1b2f" strokeWidth="3" />
          <Desk x={b.x + 200} y={floor - 60} w={170} />
          {/* laptop */}
          <path d={`M${b.x + 250} ${floor - 62} h70 l-8 -40 h-54 z`} fill="#adb5bd" stroke="#1b1b2f" strokeWidth="3" />
          {working &&
            [0, 1, 2].map((i) => (
              <rect key={i} className="type-line" style={{ animationDelay: `${i * 0.3}s` }} x={b.x + 266} y={floor - 94 + i * 9} width="36" height="4" fill="#1b1b2f" />
            ))}
          <Worker id={id} x={b.x + 180} y={floor} working={working} />
        </>
      );
    case "art":
      return (
        <>
          {/* easel */}
          <path d={`M${b.x + 230} ${floor} l30 -150 l30 150 M${b.x + 260} ${floor - 150} v150`} stroke="#8c5a33" strokeWidth="6" fill="none" />
          <rect x={b.x + 200} y={b.y + 50} width="120" height="96" fill="#fff" stroke="#1b1b2f" strokeWidth="3" />
          <circle className={working ? "paint-pop" : undefined} cx={b.x + 236} cy={b.y + 90} r="18" fill="#ef476f" />
          <rect className={working ? "paint-pop" : undefined} style={{ animationDelay: "0.4s" }} x={b.x + 258} y={b.y + 74} width="40" height="30" fill="#06d6a0" />
          <path className={working ? "paint-pop" : undefined} style={{ animationDelay: "0.8s" }} d={`M${b.x + 220} ${b.y + 136} l20 -22 l20 22 z`} fill="#ffd166" />
          {/* plant */}
          <rect x={b.x + 340} y={floor - 40} width="34" height="40" fill="#e07a5f" stroke="#1b1b2f" strokeWidth="3" />
          <path d={`M${b.x + 357} ${floor - 40} q-26 -30 -10 -60 q10 30 10 60 q0 -40 24 -56 q-6 36 -24 56`} fill="#52b788" stroke="#1b1b2f" strokeWidth="2.5" />
          {/* palette */}
          <ellipse cx={b.x + 80} cy={b.y + 110} rx="44" ry="30" fill="#f4d6a0" stroke="#1b1b2f" strokeWidth="3" />
          {["#ef476f", "#118ab2", "#ffd166", "#06d6a0"].map((c, i) => (
            <circle key={c} cx={b.x + 58 + i * 15} cy={b.y + 102 + (i % 2) * 12} r="6" fill={c} />
          ))}
          <Worker id={id} x={b.x + 150} y={floor} working={working} />
        </>
      );
    case "edit":
      return (
        <>
          <Desk x={b.x + 150} y={floor - 60} w={220} />
          <Monitor x={b.x + 170} y={b.y + 50} w={180} h={100}>
            {[0, 1, 2].map((i) => (
              <rect key={i} x={b.x + 182} y={b.y + 100 + i * 14} width={60 + ((i * 37) % 90)} height="9" rx="3" fill={["#ef476f", "#ffd166", "#06d6a0"][i]} />
            ))}
            <rect className={working ? "playhead" : undefined} x={b.x + 200} y={b.y + 58} width="3" height="84" fill="#fff" />
            <rect x={b.x + 182} y={b.y + 60} width="70" height="34" rx="3" fill="#3a0ca3" />
          </Monitor>
          {/* speaker */}
          <rect x={b.x + 50} y={floor - 110} width="50" height="110" rx="8" fill="#2b2d42" stroke="#1b1b2f" strokeWidth="3" />
          <circle className={working ? "thump" : undefined} cx={b.x + 75} cy={floor - 40} r="16" fill="#8d99ae" />
          <circle cx={b.x + 75} cy={floor - 85} r="9" fill="#8d99ae" />
          <Worker id={id} x={b.x + 130} y={floor} working={working} />
        </>
      );
    case "voice":
      return (
        <>
          {/* foam panels */}
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <path
                key={`${r}-${c}`}
                d={`M${b.x + 30 + c * 30} ${b.y + 60 + r * 30} l15 -24 l15 24z`}
                fill={(r + c) % 2 ? "#4a4a70" : "#55557d"}
              />
            )),
          )}
          {/* on-air sign */}
          <rect x={b.x + 250} y={b.y + 56} width="110" height="34" rx="8" fill={working ? "#ef476f" : "#6c757d"} stroke="#1b1b2f" strokeWidth="3" />
          <text x={b.x + 305} y={b.y + 79} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800" fontFamily="var(--font-display)">
            ON AIR
          </text>
          {/* mic stand */}
          <path d={`M${b.x + 250} ${floor} v-90`} stroke="#1b1b2f" strokeWidth="5" />
          <path d={`M${b.x + 234} ${floor} h32`} stroke="#1b1b2f" strokeWidth="6" strokeLinecap="round" />
          <rect x={b.x + 238} y={floor - 122} width="24" height="38" rx="12" fill="#adb5bd" stroke="#1b1b2f" strokeWidth="3" />
          {working &&
            [0, 1, 2].map((i) => (
              <path
                key={i}
                className="sound-wave"
                style={{ animationDelay: `${i * 0.25}s` }}
                d={`M${b.x + 276 + i * 14} ${floor - 118} q10 15 0 30`}
                stroke="#ffd166"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            ))}
          {/* script stand */}
          <rect x={b.x + 320} y={floor - 100} width="44" height="30" fill="#fff" stroke="#1b1b2f" strokeWidth="3" />
          <path d={`M${b.x + 342} ${floor - 70} v70`} stroke="#1b1b2f" strokeWidth="4" />
          <Worker id={id} x={b.x + 200} y={floor} working={working} />
        </>
      );
    case "ship":
      return (
        <>
          {/* shelves */}
          <rect x={b.x + 230} y={b.y + 100} width="150" height="8" fill="#7a4e2d" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={b.x + 240 + i * 45} y={b.y + 68} width="36" height="32" fill="#d4a373" stroke="#1b1b2f" strokeWidth="2.5" />
          ))}
          {/* conveyor */}
          <rect x={b.x + 140} y={floor - 40} width="240" height="16" rx="8" fill="#495057" stroke="#1b1b2f" strokeWidth="3" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={b.x + 156 + i * 52} cy={floor - 32} r="5" fill="#adb5bd" />
          ))}
          <rect x={b.x + 160} y={floor - 24} width="10" height="24" fill="#495057" />
          <rect x={b.x + 350} y={floor - 24} width="10" height="24" fill="#495057" />
          <g transform={`translate(${b.x + 160} ${floor - 82})`}>
            <g className={working ? "parcel parcel-move" : "parcel"}>
              <rect width="54" height="42" fill="#d4a373" stroke="#1b1b2f" strokeWidth="3" />
              <path d="M0 0 L27 14 L54 0" fill="none" stroke="#1b1b2f" strokeWidth="2" />
              <path d="M20 20 l10 6 l-10 6z" fill="#ef476f" />
            </g>
          </g>
          <Worker id={id} x={b.x + 90} y={floor} working={working} />
        </>
      );
  }
}

export const Building: React.FC<{
  active: RoomId | null;
  selected: RoomId;
  onSelect: (id: RoomId) => void;
}> = ({ active, selected, onSelect }) => (
  <svg className="building" viewBox="0 0 900 1250" role="group" aria-label="Reelhouse studio building">
    {/* sky details */}
    <circle cx="820" cy="60" r="26" fill="var(--sun)" />
    {/* roof and sign */}
    <path d="M20 160 L60 110 H840 L880 160 Z" fill="#3d2c2e" stroke="#1b1b2f" strokeWidth="4" />
    <rect x="300" y="40" width="300" height="70" rx="14" fill="#1b1b2f" />
    <g transform="translate(345 75)">
      <g className="reel">
        <circle r="24" fill="#ffd166" stroke="#fff" strokeWidth="3" />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 13} cy={Math.sin((a * Math.PI) / 180) * 13} r="5" fill="#1b1b2f" />
        ))}
      </g>
    </g>
    <text x="380" y="88" fill="#ffd166" fontSize="34" fontWeight="900" fontFamily="var(--font-display)" letterSpacing="2">
      REELHOUSE
    </text>
    {/* outer wall */}
    <rect x="20" y="160" width="860" height="1050" fill="#5c3d3a" stroke="#1b1b2f" strokeWidth="4" />
    {/* rooms */}
    {ROOMS.map((room) => {
      const b = LAYOUT[room.id];
      const working = active === room.id;
      const [wall, shade] = WALLS[room.id];
      const isSel = selected === room.id;
      return (
        <g
          key={room.id}
          className={`room${isSel ? " room-selected" : ""}${working ? " room-working" : ""}`}
          role="button"
          tabIndex={0}
          aria-label={`${room.name}: ${room.agent}. ${room.role}`}
          aria-pressed={isSel}
          onClick={() => onSelect(room.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(room.id);
            }
          }}
        >
          <clipPath id={`clip-${room.id}`}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} />
          </clipPath>
          <g clipPath={`url(#clip-${room.id})`}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={wall} />
            <rect x={b.x} y={b.y + b.h - 30} width={b.w} height="30" fill={shade} />
            <rect x={b.x} y={b.y + b.h - 34} width={b.w} height="4" fill="#1b1b2f" opacity="0.4" />
            {/* ceiling light */}
            <rect x={b.x + b.w / 2 - 30} y={b.y} width="60" height="8" fill="#fff8dc" />
            <path
              className="light-cone"
              d={`M${b.x + b.w / 2 - 30} ${b.y + 8} L${b.x + b.w / 2 - 110} ${b.y + b.h - 30} H${b.x + b.w / 2 + 110} L${b.x + b.w / 2 + 30} ${b.y + 8}Z`}
              fill="#fff8dc"
              opacity={working ? 0.22 : 0.08}
            />
            <RoomArt id={room.id} b={b} working={working} />
          </g>
          {/* name plate */}
          <rect x={b.x + 10} y={b.y + 12} width={room.name.length * 10 + 24} height="28" rx="8" fill="#1b1b2f" opacity="0.85" />
          <text x={b.x + 22} y={b.y + 32} fill="#fff" fontSize="15" fontWeight="800" fontFamily="var(--font-display)" letterSpacing="1">
            {room.name.toUpperCase()}
          </text>
          {working && (
            <g>
              <rect x={b.x + b.w - 112} y={b.y + 12} width="100" height="28" rx="14" fill="#ef476f" />
              <circle className="live-dot" cx={b.x + b.w - 96} cy={b.y + 26} r="5" fill="#fff" />
              <text x={b.x + b.w - 84} y={b.y + 31} fill="#fff" fontSize="13" fontWeight="800" fontFamily="var(--font-display)">
                WORKING
              </text>
            </g>
          )}
          <rect className="room-outline" x={b.x} y={b.y} width={b.w} height={b.h} fill="none" rx="2" />
        </g>
      );
    })}
    {/* sidewalk */}
    <rect x="0" y="1210" width="900" height="40" fill="#6c757d" />
    <rect x="0" y="1210" width="900" height="6" fill="#495057" />
  </svg>
);
