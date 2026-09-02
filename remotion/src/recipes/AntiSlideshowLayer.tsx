import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { OVERLAY_REGISTRY } from '../ComponentesAuxiliares';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AntiSlideshowLayer: React.FC<{ scene: any }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);

  // Layer 7: CameraRig Unificado
  const cameraY = interpolate(t, [0, 1], [0, -25]);
  const cameraScale = interpolate(t, [0, 1], [1.02, 1.08]);

  const OverlayComp = OVERLAY_REGISTRY[scene.overlay || scene.remotion_fx?.overlay || 'ninguno'];

  return (
    <AbsoluteFill style={{
      backgroundColor: '#0a0a0a',
      transform: `scale(${cameraScale}) translate3d(0, ${cameraY}px, 0)`,
      willChange: 'transform'
    }}>
      {/* Layer 1: Fondo Ambiental Desenfocado */}
      <AbsoluteFill style={{ transform: 'scale(1.2) translate3d(0,0,0)', filter: 'blur(30px) brightness(0.35)' }}>
        <Img src={staticFile(`images/escena_${scene.id}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>

      {/* Layer 3: Sujeto Principal */}
      <AbsoluteFill style={{
        justifyContent: 'center',
        alignItems: 'center',
        transform: `scale(${interpolate(t, [0, 1], [1, 1.12])}) translate3d(0,0,0)`,
        willChange: 'transform'
      }}>
        <Img
          src={staticFile(`images/escena_${scene.id}.png`)}
          style={{
            maxHeight: '85%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 25px 35px rgba(0,0,0,0.85))'
          }}
        />
      </AbsoluteFill>

      {/* Layer 5: Overlays y Badges */}
      {OverlayComp && <OverlayComp texto={scene.overlayText || scene.remotion_fx?.overlay_text} />}
    </AbsoluteFill>
  );
};
