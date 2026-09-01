import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, staticFile } from 'remotion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VideoLayer: React.FC<{ scene: any; durationInFrames: number }> = ({ scene, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fx = scene.remotion_fx || {};
  const move = fx.camera_movement || 'crash_zoom_in';
  const trans = fx.transition_out || 'flash_white';

  // --- MOTORES DE CÁMARA (GPU / translate3d) ---
  let scale = 1.15;
  let translateX = 0;
  let translateY = 0;

  if (move === 'crash_zoom_in') {
    scale = interpolate(frame, [0, durationInFrames], [1.1, 1.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (move === 'pan_zoom_out') {
    scale = interpolate(frame, [0, durationInFrames], [1.3, 1.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    translateX = interpolate(frame, [0, durationInFrames], [-25, 25], { extrapolateRight: 'clamp' });
  } else if (move === 'pan_diagonal') {
    scale = 1.2;
    translateX = interpolate(frame, [0, durationInFrames], [-20, 20], { extrapolateRight: 'clamp' });
    translateY = interpolate(frame, [0, durationInFrames], [15, -15], { extrapolateRight: 'clamp' });
  } else if (move === 'shake') {
    scale = 1.25;
    const decay = interpolate(frame, [0, Math.min(45, durationInFrames)], [1, 0], { extrapolateRight: 'clamp' });
    translateX = Math.sin(frame * 3.5) * 18 * decay;
    translateY = Math.cos(frame * 4.2) * 18 * decay;
  } else {
    // macro_drift
    scale = interpolate(frame, [0, durationInFrames], [1.08, 1.16], { extrapolateRight: 'clamp' });
    translateX = interpolate(frame, [0, durationInFrames], [0, -15], { extrapolateRight: 'clamp' });
  }

  // --- TRANSICIÓN DE SALIDA ---
  const transStart = Math.max(0, durationInFrames - 8);
  let opacity = 1;
  let flashOpacity = 0;
  let blurAmount = 0;
  if (frame >= transStart) {
    if (trans === 'fade') {
      opacity = interpolate(frame, [transStart, durationInFrames], [1, 0], { extrapolateRight: 'clamp' });
    } else if (trans === 'flash_white') {
      flashOpacity = interpolate(frame, [transStart, durationInFrames], [0, 0.85], { extrapolateRight: 'clamp' });
    } else if (trans === 'blur_fade') {
      opacity = interpolate(frame, [transStart, durationInFrames], [1, 0.1], { extrapolateRight: 'clamp' });
      blurAmount = interpolate(frame, [transStart, durationInFrames], [0, 12], { extrapolateRight: 'clamp' });
    }
  }

  const sceneId = scene.id || scene.scene_number || 1;
  const imageSrc = staticFile(`images/escena_${sceneId}.png`);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={imageSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
          transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity: flashOpacity, pointerEvents: 'none' }} />
      )}
      {fx.visual_overlay === 'vignette_heavy' && (
        <AbsoluteFill style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 120%)', pointerEvents: 'none' }} />
      )}
      {fx.visual_overlay === 'grain_cinematic' && (
        <AbsoluteFill
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
