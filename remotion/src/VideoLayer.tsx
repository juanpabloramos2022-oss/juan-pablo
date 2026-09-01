import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, staticFile } from 'remotion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VideoLayer: React.FC<{ scene: any }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const durationInFrames = scene.durationInFrames || 150;
  const fx = scene.remotion_fx || {};
  const move = fx.camera_movement || 'crash_zoom_in';
  const trans = fx.transition_out || 'flash_white';

  const scaleIn = interpolate(frame, [0, durationInFrames], [1, 1.18], { extrapolateRight: 'clamp' });
  const scaleOut = interpolate(frame, [0, durationInFrames], [1.18, 1], { extrapolateRight: 'clamp' });
  const translateX = interpolate(frame, [0, durationInFrames], [-20, 20], { extrapolateRight: 'clamp' });

  let transform = `scale(${scaleIn})`;
  if (move === 'pan_zoom_out') transform = `scale(${scaleOut})`;
  if (move === 'pan_diagonal') transform = `scale(1.15) translate3d(${translateX}px, ${translateX * 0.4}px, 0)`;
  if (move === 'shake') {
    const decay = interpolate(frame, [0, Math.min(45, durationInFrames)], [1, 0], { extrapolateRight: 'clamp' });
    const shakeX = Math.sin(frame * 3.5) * 16 * decay;
    const shakeY = Math.cos(frame * 4.2) * 16 * decay;
    transform = `scale(1.22) translate3d(${shakeX}px, ${shakeY}px, 0)`;
  }
  if (move === 'macro_drift') {
    transform = `scale(1.10) translate3d(${-translateX * 0.5}px, 0, 0)`;
  }

  // Transiciones de salida (últimos 8 frames)
  const transStart = Math.max(0, durationInFrames - 8);
  let opacity = 1;
  let flashOpacity = 0;
  let blur = 0;

  if (frame >= transStart) {
    if (trans === 'fade') {
      opacity = interpolate(frame, [transStart, durationInFrames], [1, 0], { extrapolateRight: 'clamp' });
    } else if (trans === 'blur_fade') {
      opacity = interpolate(frame, [transStart, durationInFrames], [1, 0], { extrapolateRight: 'clamp' });
      blur = interpolate(frame, [transStart, durationInFrames], [0, 8], { extrapolateRight: 'clamp' });
    } else if (trans === 'flash_white') {
      flashOpacity = interpolate(frame, [transStart, durationInFrames], [0, 0.85], { extrapolateRight: 'clamp' });
    }
  }

  const grainSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img
        src={staticFile(`images/escena_${scene.id}.png`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : 'none',
          transform,
          willChange: 'transform, opacity',
        }}
      />
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity: flashOpacity, pointerEvents: 'none' }} />
      )}
      {(fx.overlay === 'vignette_heavy' || fx.visual_overlay === 'vignette_heavy') && (
        <AbsoluteFill style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 120%)', pointerEvents: 'none' }} />
      )}
      {(fx.overlay === 'grain_cinematic' || fx.visual_overlay === 'grain_cinematic') && (
        <AbsoluteFill style={{ backgroundImage: `url("${grainSvg}")`, opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
      )}
    </AbsoluteFill>
  );
};
