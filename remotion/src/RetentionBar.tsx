import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const RetentionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(Math.max(frame / durationInFrames, 0), 1);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '5px',
        backgroundColor: 'transparent',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #FF0055 0%, #FFE500 100%)',
          boxShadow: '0px 1px 6px rgba(255, 0, 85, 0.4)',
        }}
      />
    </div>
  );
};
