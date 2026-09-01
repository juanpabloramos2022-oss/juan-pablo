import React from 'react';
import { Composition } from 'remotion';
import { TikTokVideo } from './TikTokVideo';
import scriptData from '../public/script.json';

export const Root: React.FC = () => {
  const FPS = 30;

  // Calcula la duración sumando las escenas de script.json o usando fallback a 63.53s
  let totalSeconds = 63.53;
  if (Array.isArray(scriptData)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    totalSeconds = scriptData.reduce((acc: number, curr: any) => acc + (curr.durationInSeconds || curr.duracion || 5), 0);
  } else if (scriptData && Array.isArray((scriptData as unknown as { scenes: unknown[] }).scenes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scenes = (scriptData as any).scenes;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    totalSeconds = scenes.reduce((acc: number, curr: any) => acc + (curr.durationInSeconds || curr.duracion || (63.53 / scenes.length)), 0);
  }

  const dynamicDurationInFrames = Math.max(30, Math.ceil(totalSeconds * FPS));

  return (
    <>
      <Composition
        id="TikTokComp"
        component={TikTokVideo}
        durationInFrames={dynamicDurationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Root"
        component={TikTokVideo}
        durationInFrames={dynamicDurationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};

export const RemotionRoot = Root;
