import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, spring, staticFile } from 'remotion';
import { OVERLAY_REGISTRY } from './ComponentesAuxiliares';

const CAMERA_REGISTRY: Record<string, (f: number, fps: number, dur: number) => string> = {
  crash_zoom_in: (f, fps) => `scale(${1 + spring({ frame: f, fps, config: { damping: 14, mass: 0.8, stiffness: 220 } }) * 0.28})`,
  vertigo_dolly_zoom: (f, _fps, dur) => `scale(${1.12 + (f / Math.max(1, dur)) * 0.22}) translate3d(0, 0, 0)`,
  slow_creepy_crawl: (f, _fps, dur) => `scale(${1.08 + (f / Math.max(1, dur)) * 0.12}) translate3d(0, ${-(f / Math.max(1, dur)) * 25}px, 0)`,
  whip_pan_left: (f, fps) => `scale(1.15) translate3d(${spring({ frame: f, fps, config: { damping: 20 } }) * -60 + 60}px, 0, 0)`,
  earthquake_shake: (f) => {
    const shakeX = Math.sin(f * 3.5) * 16;
    const shakeY = Math.cos(f * 4.2) * 16;
    return `scale(1.22) translate3d(${shakeX}px, ${shakeY}px, 0)`;
  },
  estatico: () => `scale(1.05)`,
  // Aliases retrocompatibles para escenas previas de Factoria
  pan_zoom_out: (f, _fps, dur) => `scale(${1.25 - (f / Math.max(1, dur)) * 0.15}) translate3d(0, 0, 0)`,
  shake: (f) => {
    const shakeX = Math.sin(f * 3.5) * 16;
    const shakeY = Math.cos(f * 4.2) * 16;
    return `scale(1.22) translate3d(${shakeX}px, ${shakeY}px, 0)`;
  },
  macro_drift: (f, _fps, dur) => `scale(${1.08 + (f / Math.max(1, dur)) * 0.12}) translate3d(0, ${-(f / Math.max(1, dur)) * 25}px, 0)`,
  pan_diagonal: (f, _fps, dur) => `scale(1.15) translate3d(${(f / Math.max(1, dur)) * 40 - 20}px, ${(f / Math.max(1, dur)) * 30 - 15}px, 0)`,
};

const LIGHTING_REGISTRY: Record<string, (f: number) => string> = {
  red_alert_pulse: (f) => `contrast(1.2) brightness(${1 + Math.sin(f / 4) * 0.2}) saturate(1.8)`,
  dark_vignette_pulse: (f) => `contrast(1.25) brightness(${0.8 + Math.sin(f / 10) * 0.15})`,
  chromatic_aberration_glitch: (f) => (f % 12 < 2 ? `hue-rotate(60deg) contrast(1.4)` : `none`),
  limpio: () => `none`,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VideoLayer: React.FC<{ scene: any }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const camKey = scene.camara || scene.remotion_fx?.camera_movement || 'crash_zoom_in';
  const lightKey = scene.iluminacion || scene.remotion_fx?.lighting || 'limpio';
  const overlayKey = scene.overlay || scene.remotion_fx?.overlay || 'ninguno';

  const transformStyle = (CAMERA_REGISTRY[camKey] || CAMERA_REGISTRY.estatico)(frame, fps, durationInFrames);
  const filterStyle = (LIGHTING_REGISTRY[lightKey] || LIGHTING_REGISTRY.limpio)(frame);
  const OverlayComponent = OVERLAY_REGISTRY[overlayKey];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
      <Img
        src={staticFile(`images/escena_${scene.id}.png`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          willChange: 'transform, filter',
          transform: transformStyle,
          filter: filterStyle,
          transformOrigin: 'center center',
        }}
      />
      {OverlayComponent && <OverlayComponent texto={scene.overlayText} />}
    </div>
  );
};
