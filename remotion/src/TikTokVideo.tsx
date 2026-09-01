import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoLayer } from './VideoLayer';
import { AudioLayer } from './AudioLayer';
import { KineticSubtitles } from './KineticSubtitles';
import { RetentionBar } from './RetentionBar';

export interface TikTokVideoProps {
  audioFileName?: string;
  hasBackgroundMusic?: boolean;
}

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  audioFileName = 'audio_narracion.mp3',
  hasBackgroundMusic = false,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        width: 1080,
        height: 1920,
        overflow: 'hidden',
      }}
    >
      {/* Capa 1: VideoLayer secuencial con Series (z-index 10) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <VideoLayer />
      </div>

      {/* Capa 2: AudioLayer con staticFile (locución) */}
      <AudioLayer
        fileName={audioFileName}
        hasBackgroundMusic={hasBackgroundMusic}
      />

      {/* Capa 3: KineticSubtitles ÚNICO con timecodes directos (z-index 50) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingBottom: '400px',
          pointerEvents: 'none',
        }}
      >
        <KineticSubtitles />
      </div>

      {/* Capa 4: RetentionBar (z-index 9999) en top: 0 */}
      <RetentionBar />
    </AbsoluteFill>
  );
};
