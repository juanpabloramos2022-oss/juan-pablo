import React from 'react';
import { Composition } from 'remotion';
import { TikTokVideo } from './TikTokVideo';
import scriptData from '../public/script.json';

export const Root: React.FC = () => {
  const FPS = 30;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawScenes = Array.isArray(scriptData) ? scriptData : (scriptData as any)?.scenes || [];

  // Calcula la duración exacta sumando los durationInFrames de cada escena en Series
  const dynamicDurationInFrames = rawScenes.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? rawScenes.reduce((acc: number, curr: any) => acc + Math.max(1, Math.round((curr.durationInSeconds || 5.0) * FPS)), 0)
    : 1800;

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
