import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH, type VideoProps } from "../lib/types";
import { designVideo, totalFrames } from "../lib/agents/art";
import { demoScript } from "../lib/agents/demo";
import { StoryVideo } from "./Story";

const sample: VideoProps = designVideo(
  demoScript({ topic: "friendship", title: "The Lost Star", hook: "When a star falls into the forest, Mo has one night to send it home.", angle: "" }),
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Story"
    component={StoryVideo}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    durationInFrames={1}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, totalFrames(props)) })}
  />
);
