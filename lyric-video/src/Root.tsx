import React from "react";
import { Composition } from "remotion";
import { LyricVideo } from "./LyricVideo";
import { DURATION_IN_FRAMES } from "./lib/time";
import { FPS, W, H } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LyricVideo"
        component={LyricVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ debug: false }}
      />
    </>
  );
};
