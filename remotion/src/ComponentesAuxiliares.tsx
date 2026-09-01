import React from 'react';
import { useCurrentFrame } from 'remotion';

export const OVERLAY_REGISTRY: Record<string, React.FC<{ texto?: string }>> = {
  alerta_roja_neon: ({ texto = "¡ATENCIÓN!" }) => {
    const frame = useCurrentFrame();
    const pulse = Math.sin(frame / 5) * 0.5 + 0.5;
    return (
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          padding: '16px 36px',
          border: `3px solid rgba(255, 0, 85, ${pulse})`,
          boxShadow: `0 0 30px rgba(255, 0, 85, ${pulse * 0.8})`,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          fontSize: '48px',
          color: '#FFFFFF',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          zIndex: 50,
          borderRadius: '12px',
          pointerEvents: 'none',
        }}
      >
        {texto}
      </div>
    );
  },
  marco_cinematico: () => (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        boxShadow: 'inset 0 0 140px rgba(0,0,0,0.92)',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    />
  ),
  ninguno: () => null,
};
