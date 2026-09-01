import React from 'react';
import { AbsoluteFill, Series, Audio, staticFile } from 'remotion';
import { VideoLayer } from './VideoLayer';
import { KineticSubtitles } from './KineticSubtitles';
import { RetentionBar } from './RetentionBar';
import scriptData from '../public/script.json';

export const TikTokVideo: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenes = Array.isArray(scriptData) ? scriptData : (scriptData as any).scenes || [];

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <RetentionBar />
      <Series>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {scenes.map((scene: any) => {
          const durationInFrames = Math.max(1, scene.durationInFrames || 150);
          const highlightColor = scene.remotion_fx?.emotional_color || scene.remotion_fx?.text_highlight_color || '#FFE500';

          return (
            <Series.Sequence key={scene.id} durationInFrames={durationInFrames}>
              <VideoLayer scene={scene} />
              <Audio src={staticFile(`audio/audio_${scene.id}.mp3`)} volume={1.0} />
              <AbsoluteFill
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: '400px',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                <KineticSubtitles words={scene.words || []} highlightColor={highlightColor} />
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
