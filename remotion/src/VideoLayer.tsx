import React from 'react';
import { AbsoluteFill, Series, Img, useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import scriptData from '../public/script.json';

const grainSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`;

const CinematicScene: React.FC<{ sceneIndex: number; durationInFrames: number; directive: string }> = ({
  sceneIndex,
  durationInFrames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  directive,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Zoom agresivo y paneo cinematográfico
  const scale = interpolate(frame, [0, durationInFrames], [1.15, 1.32], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const panX = interpolate(frame, [0, durationInFrames], [-20, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const panY = interpolate(frame, [0, durationInFrames], [10, -15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Camera Shake en los primeros 1.5s (45 frames)
  const shakeDuration = fps * 1.5;
  const isShake = frame < shakeDuration;
  const decay = isShake ? 1 - frame / shakeDuration : 0;
  const shakeX = Math.sin(frame * 3.5) * 16 * decay;
  const shakeY = Math.cos(frame * 4.2) * 16 * decay;

  // 3. Flash blanco de corte (6 frames)
  const flashOpacity = interpolate(frame, [0, 6], [0.75, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={staticFile(`images/escena_${sceneIndex}.png`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${panX + shakeX}px, ${panY + shakeY}px)`,
          willChange: 'transform',
        }}
        onError={(e) => {
          console.warn(`[VideoLayer] Imagen no disponible para escena ${sceneIndex}`, e);
        }}
      />
      {/* Flash blanco de corte */}
      <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity: flashOpacity, pointerEvents: 'none' }} />

      {/* Viñeta cinematográfica */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 120%)',
          pointerEvents: 'none',
        }}
      />

      {/* Micro-grano procedural */}
      <AbsoluteFill
        style={{
          backgroundImage: `url("${grainSvg}")`,
          opacity: 0.12,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
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
    scenes = Array.from({ length: 12 }, (_, i) => ({ scene_number: i + 1, durationInSeconds: 5.25 }));
  }

  return (
    <Series>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {scenes.map((scene: any, idx: number) => {
        const durSec = scene.durationInSeconds || scene.duracion || (63.05 / scenes.length) || 5.25;
        const durationInFrames = Math.max(1, Math.round(durSec * fps));
        return (
          <Series.Sequence key={idx} durationInFrames={durationInFrames}>
            <CinematicScene
              sceneIndex={idx + 1}
              durationInFrames={durationInFrames}
              directive={scene.remotion_fx?.animation_type || scene.remotion_fx?.camera_movement || 'pan_zoom'}
            />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
