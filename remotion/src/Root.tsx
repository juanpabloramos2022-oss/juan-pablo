import React from 'react';
import { Composition } from 'remotion';
import { TikTokVideo } from './TikTokVideo';
import scriptData from '../public/script.json';

export const Root: React.FC = () => {
  const FPS = 30;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenes = Array.isArray(scriptData) ? scriptData : (scriptData as any).scenes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalFrames = scenes.reduce((acc: number, curr: any) => acc + (curr.durationInFrames || 150), 0);
  const durationInFrames = Math.max(30, totalFrames);

  return (
    <>
      <Composition
        id="TikTokComp"
        component={TikTokVideo}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};

export const RemotionRoot = Root;
