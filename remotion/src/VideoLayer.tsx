import React from 'react';
import { Series, Img, useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import scriptData from '../public/script.json';

const AnimatedImage: React.FC<{ sceneIndex: number; durationInFrames: number }> = ({ sceneIndex, durationInFrames }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const imgPath = staticFile(`images/escena_${sceneIndex}.png`);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#000000', overflow: 'hidden' }}>
      <Img
        src={imgPath}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          willChange: 'transform',
        }}
        onError={(e) => {
          console.warn(`[VideoLayer] Imagen no disponible para escena ${sceneIndex}`, e);
        }}
      />
    </div>
  );
};

export const VideoLayer: React.FC = () => {
  const { fps } = useVideoConfig();

  // Soporta tanto array directo como objeto con propiedad scenes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scenes: any[] = [];
  if (Array.isArray(scriptData)) {
    scenes = scriptData;
  } else if (scriptData && Array.isArray((scriptData as unknown as { scenes: unknown[] }).scenes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scenes = (scriptData as any).scenes;
  } else {
    scenes = Array.from({ length: 12 }, (_, i) => ({ scene_number: i + 1, durationInSeconds: 5.29 }));
  }

  return (
    <Series>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {scenes.map((scene: any, idx: number) => {
        const durationSec = scene.durationInSeconds || scene.duracion || (63.53 / scenes.length) || 5.29;
        const durationInFrames = Math.max(1, Math.round(durationSec * fps));
        return (
          <Series.Sequence key={idx} durationInFrames={durationInFrames}>
            <AnimatedImage sceneIndex={idx + 1} durationInFrames={durationInFrames} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
