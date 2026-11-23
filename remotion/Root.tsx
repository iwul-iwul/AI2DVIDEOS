import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH, type VideoProps } from "../lib/types";
import { designScenes } from "../lib/agents/art";
import { demoScript } from "../lib/agents/demo";
import { Short } from "./Short";

const sample: VideoProps = {
  title: "Sample",
  scenes: designScenes(demoScript({ title: "3 habits that make you 10x faster", hook: "", angle: "", topic: "productivity" })),
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={Short}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    durationInFrames={1}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(
        1,
        props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0),
      ),
    })}
  />
);
