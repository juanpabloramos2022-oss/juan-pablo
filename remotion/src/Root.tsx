import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { TikTokVideo, TikTokVideoProps } from "./TikTokVideo";
import { TopScorersShort } from "./TopScorersShort";
import { BallEscape } from "./BallEscape";
import { HexagonEscape } from "./HexagonEscape";
import { SubtitleGenerator } from "./SubtitleCaption";
import { RawVideoSubtitles } from "./RawVideoSubtitles";
import { DataVideo } from "./DataPresentation";

// Props por defecto para composición de TikTok
let initialTikTokProps: TikTokVideoProps = {
  audioFileName: "audio_narracion.mp3",
  hasBackgroundMusic: false,
};

let defaultDurationFrames = 1800;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tcs = require("../public/timecodes.json");
  if (Array.isArray(tcs) && tcs.length > 0) {
    const lastTc = tcs[tcs.length - 1];
    if (lastTc.end) {
      defaultDurationFrames = Math.max(30, Math.ceil(lastTc.end * 30));
    }
  }
} catch {
  // fallback
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Composición Raíz Principal para TikTok V33.7 (1080x1920 @ 30fps) */}
      <Composition
        id="Root"
        component={TikTokVideo}
        durationInFrames={defaultDurationFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={initialTikTokProps}
        calculateMetadata={async ({ props, defaultProps }) => {
          const typedProps = (props || {}) as TikTokVideoProps;
          const typedDefault = (defaultProps || {}) as TikTokVideoProps;
          const merged: TikTokVideoProps = { ...typedDefault, ...typedProps };
          let totalFrames = defaultDurationFrames;
          if (merged.scenes && merged.scenes.length > 0) {
            const lastScene = merged.scenes[merged.scenes.length - 1];
            totalFrames = Math.max(30, lastScene.fromFrame + lastScene.durationInFrames);
          }
          if (merged.timecodes && merged.timecodes.length > 0) {
            const lastTc = merged.timecodes[merged.timecodes.length - 1];
            if (lastTc.end) {
              totalFrames = Math.max(totalFrames, Math.ceil(lastTc.end * 30));
            }
          }
          return {
            durationInFrames: totalFrames,
            props: merged,
          };
        }}
      />

      {/* Composición TikTokComp para compatibilidad con V33.8 */}
      <Composition
        id="TikTokComp"
        component={TikTokVideo}
        durationInFrames={defaultDurationFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={initialTikTokProps}
        calculateMetadata={async ({ props, defaultProps }) => {
          const typedProps = (props || {}) as TikTokVideoProps;
          const typedDefault = (defaultProps || {}) as TikTokVideoProps;
          const merged: TikTokVideoProps = { ...typedDefault, ...typedProps };
          let totalFrames = defaultDurationFrames;
          if (merged.scenes && merged.scenes.length > 0) {
            const lastScene = merged.scenes[merged.scenes.length - 1];
            totalFrames = Math.max(30, lastScene.fromFrame + lastScene.durationInFrames);
          }
          if (merged.timecodes && merged.timecodes.length > 0) {
            const lastTc = merged.timecodes[merged.timecodes.length - 1];
            if (lastTc.end) {
              totalFrames = Math.max(totalFrames, Math.ceil(lastTc.end * 30));
            }
          }
          return {
            durationInFrames: totalFrames,
            props: merged,
          };
        }}
      />

      {/* Composiciones de Referencia de Hans Acha */}
      <Composition
        id="DataPresentation"
        component={DataVideo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RawVideoSubtitles"
        component={RawVideoSubtitles}
        durationInFrames={1917}
        fps={30}
        width={768}
        height={1376}
      />
      <Composition
        id="SubtitleGenerator"
        component={SubtitleGenerator}
        durationInFrames={1715}
        fps={30}
        width={768}
        height={1376}
      />
      <Composition
        id="BallEscape"
        component={BallEscape}
        durationInFrames={1950}
        fps={30}
        width={2160}
        height={3840}
      />
      <Composition
        id="HexagonEscape"
        component={HexagonEscape}
        durationInFrames={1950}
        fps={30}
        width={2160}
        height={3840}
      />
      <Composition
        id="TopScorersShort"
        component={TopScorersShort}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
