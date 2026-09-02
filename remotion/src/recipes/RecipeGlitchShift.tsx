import React from 'react';
import { useCurrentFrame } from 'remotion';

export const RecipeGlitchShift: React.FC<{ children: React.ReactNode; triggerFrame?: number }> = ({ children, triggerFrame = 0 }) => {
  const frame = useCurrentFrame();
  const isGlitching = frame >= triggerFrame && frame <= triggerFrame + 5;
  const shiftX = isGlitching ? (frame % 2 === 0 ? '12px' : '-12px') : '0px';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      {isGlitching && (
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.75,
          filter: 'drop-shadow(6px 0 0 #00F0FF) drop-shadow(-6px 0 0 #FF0055)',
          transform: `translate3d(${shiftX}, 0, 0)`,
          willChange: 'transform',
        }}>
          {children}
        </div>
      )}
    </div>
  );
};
