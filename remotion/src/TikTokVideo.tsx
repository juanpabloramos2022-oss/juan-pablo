import React from 'react';
import { AbsoluteFill, Series, Audio, staticFile } from 'remotion';
import { VideoLayer } from './VideoLayer';
import { KineticSubtitles } from './KineticSubtitles';
import { RetentionBar } from './RetentionBar';
import scriptData from '../public/script.json';

export const TikTokVideo: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawScenes = Array.isArray(scriptData) ? scriptData : (scriptData as any).scenes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenes = rawScenes.length > 0 ? rawScenes : (scriptData as any)?.scenes || [];
  const fps = 30;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <RetentionBar />
      <Series>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {scenes.map((scene: any) => {
          const durSec = scene.durationInSeconds || 5.0;
          const durationInFrames = Math.max(1, Math.round(durSec * fps));
          const sceneId = scene.id || scene.scene_number || 1;
          const audioFileName = `audio/audio_${sceneId}.mp3`;
          const highlightColor = scene.remotion_fx?.text_highlight_color || '#FFE500';

          return (
            <Series.Sequence key={sceneId} durationInFrames={durationInFrames}>
              <VideoLayer scene={scene} durationInFrames={durationInFrames} />
              <Audio src={staticFile(audioFileName)} volume={1.0} />
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
