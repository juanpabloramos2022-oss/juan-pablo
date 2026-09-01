import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Img,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

export interface RemotionFx {
  transition_in?: 'whip_right' | 'zoom_in' | 'glitch' | 'fade';
  camera_movement?: 'pan_zoom' | 'subtle_drift' | 'shake_impact';
  transformOrigin?: string;
  animation_type?: string;
  scale_start?: number;
  scale_end?: number;
  drift_x?: number;
  kinetic_emphasis?: string;
  accent_color?: string;
  overlay_style?: 'film_grain' | 'vignette_dark' | 'hud_tech' | 'none';
}

export interface SceneVisualItem {
  sceneNumber: number;
  fromFrame: number;
  durationInFrames: number;
  imageSrc?: string;
  videoSrc?: string;
  niche?: string;
  fx?: RemotionFx;
}

interface VideoLayerProps {
  scenes: SceneVisualItem[];
}

const SingleSceneClip: React.FC<{
  item: SceneVisualItem;
}> = ({ item }) => {
  const frame = useCurrentFrame();
  const fx = item.fx || {};
  const transIn = fx.transition_in || 'zoom_in';
  const camMove = fx.animation_type || fx.camera_movement || 'pan_zoom';
  const overlayStyle = fx.overlay_style || 'vignette_dark';
  const accentColor = fx.accent_color || '#FFE500';
  const transformOrigin = fx.transformOrigin || '50% 50%';

  // 1. TRANSICIONES DE ENTRADA (Clamped estrictamente para evitar reflows de CPU)
  let transScale = 1.0;
  let transOpacity = 1.0;
  let transTranslateX = 0;
  let glitchFilter = 'none';

  if (transIn === 'zoom_in') {
    transScale = interpolate(frame, [0, 12], [1.14, 1.0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    transOpacity = interpolate(frame, [0, 5], [0.6, 1.0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (transIn === 'whip_right') {
    transTranslateX = interpolate(frame, [0, 9], [600, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    transOpacity = interpolate(frame, [0, 4], [0.4, 1.0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (transIn === 'glitch') {
    if (frame < 8) {
      transTranslateX = (frame % 2 === 0 ? 14 : -14) * (1 - frame / 8);
      glitchFilter =
        frame % 3 === 0
          ? 'invert(0.15) hue-rotate(90deg) contrast(1.5)'
          : 'contrast(1.3) saturate(1.8)';
    }
  } else if (transIn === 'fade') {
    transOpacity = interpolate(frame, [0, 10], [0.0, 1.0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  // 2. CINETISMO PROCEDURAL Y MOVIMIENTO DE CÁMARA (Interpolaciones Clamped)
  const duration = Math.max(1, item.durationInFrames);
  const scaleStart = fx.scale_start ?? 1.0;
  const scaleEnd = fx.scale_end ?? 1.15;
  const driftXPercent = fx.drift_x ?? 0;

  let camScale = 1.0;
  let camTranslateX = 0;
  let camTranslateY = 0;

  if (camMove === 'pan_zoom') {
    camScale = interpolate(frame, [0, duration], [scaleStart, scaleEnd], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (camMove === 'subtle_drift') {
    camScale = interpolate(frame, [0, duration], [scaleStart, scaleEnd], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    camTranslateX = interpolate(frame, [0, duration], [0, driftXPercent * 10], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (camMove === 'shake_impact') {
    if (frame < 10) {
      const decay = Math.max(0, 1 - frame / 10);
      camTranslateX = Math.sin(frame * 3.2) * 12 * decay;
      camTranslateY = Math.cos(frame * 2.8) * 8 * decay;
    }
  }

  const finalScale = transScale * camScale;
  const finalTranslateX = transTranslateX + camTranslateX;
  const finalTranslateY = camTranslateY;

  const imgSrc = item.imageSrc || `images/escena_${item.sceneNumber}.png`;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000000' }}>
      {/* Capa Visual con aceleración GPU (willChange, transform puro) */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transformOrigin,
          transform: `scale(${finalScale}) translate3d(${finalTranslateX}px, ${finalTranslateY}px, 0px)`,
          opacity: transOpacity,
          filter: glitchFilter,
          willChange: 'transform, opacity',
        }}
      >
        {item.videoSrc ? (
          <Video
            src={staticFile(item.videoSrc)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            muted
          />
        ) : (
          <Img
            src={staticFile(imgSrc)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              console.warn(`[VideoLayer] No se pudo cargar imagen ${imgSrc}, usando fallback`, e);
            }}
          />
        )}
      </div>

      {/* 3. CAPAS DE SUPERPOSICIÓN CINEMÁTICA */}
      {overlayStyle === 'vignette_dark' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {overlayStyle === 'film_grain' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 4px)',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {overlayStyle === 'hud_tech' && (
        <div
          style={{
            position: 'absolute',
            inset: 30,
            border: `1px solid ${accentColor}33`,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 24,
              height: 24,
              borderTop: `3px solid ${accentColor}`,
              borderLeft: `3px solid ${accentColor}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 24,
              height: 24,
              borderTop: `3px solid ${accentColor}`,
              borderRight: `3px solid ${accentColor}`,
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const VideoLayer: React.FC<VideoLayerProps> = ({ scenes }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {scenes.map((scene) => (
        <Sequence
          key={`scene-${scene.sceneNumber}`}
          from={scene.fromFrame}
          durationInFrames={scene.durationInFrames}
        >
          <SingleSceneClip item={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
