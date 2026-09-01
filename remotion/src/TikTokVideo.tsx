import React from 'react';
import { AbsoluteFill } from 'remotion';
import { VideoLayer, SceneVisualItem } from './VideoLayer';
import { AudioLayer } from './AudioLayer';
import { KineticSubtitles, WordTimecode } from './KineticSubtitles';
import { RetentionBar } from './RetentionBar';

export interface TikTokVideoProps {
  timecodes?: WordTimecode[];
  scenes?: SceneVisualItem[];
  audioFileName?: string;
  hasBackgroundMusic?: boolean;
}

let fallbackTimecodes: WordTimecode[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fallbackTimecodes = require('../public/timecodes.json');
} catch {
  // Sin timecodes en caché
}

let fallbackScenes: SceneVisualItem[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const scriptData = require('../public/script.json');
  if (scriptData && Array.isArray(scriptData.scenes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fallbackScenes = scriptData.scenes.map((s: any, idx: number) => ({
      sceneNumber: s.scene_number || idx + 1,
      fromFrame: idx * 150,
      durationInFrames: 150,
      imageSrc: s.image_filename ? `images/${s.image_filename}` : undefined,
      fx: s.remotion_fx,
    }));
  }
} catch {
  // fallback visual seguro
}

if (fallbackScenes.length === 0) {
  fallbackScenes = [
    {
      sceneNumber: 1,
      fromFrame: 0,
      durationInFrames: 150,
      imageSrc: 'images/escena_1.png',
      fx: {
        transformOrigin: '50% 50%',
        animation_type: 'pan_zoom',
        scale_start: 1.0,
        scale_end: 1.15,
      },
    },
  ];
}

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  timecodes = fallbackTimecodes,
  scenes = fallbackScenes,
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
      {/* Capa 1: VideoLayer (z-index 10) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <VideoLayer scenes={scenes} />
      </div>

      {/* Capa 2: AudioLayer (locución) */}
      <AudioLayer
        fileName={audioFileName}
        hasBackgroundMusic={hasBackgroundMusic}
      />

      {/* Capa 3: KineticSubtitles ÚNICO (z-index 50) con paddingBottom: '400px' */}
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
        <KineticSubtitles timecodes={timecodes} />
      </div>

      {/* Capa 4: RetentionBar (z-index 9999) en top: 0 */}
      <RetentionBar />
    </AbsoluteFill>
  );
};
