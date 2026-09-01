import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const KineticSubtitles: React.FC<{ words: any[]; highlightColor: string }> = ({ words = [], highlightColor = '#FFE500' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bursts = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = [];
    const maxWords = 3;
    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords);
      if (chunk.length > 0) {
        list.push({
          words: chunk,
          startFrame: chunk[0].startFrame ?? 0,
          endFrame: chunk[chunk.length - 1].endFrame ?? 150,
        });
      }
    }
    return list;
  }, [words]);

  const activeBurst = bursts.find((b) => frame >= b.startFrame && frame < b.endFrame);
  if (!activeBurst) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        padding: '0 40px',
        width: '100%',
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {activeBurst.words.map((w: any, idx: number) => {
        const isActive = frame >= w.startFrame && frame < w.endFrame;
        const hasPassed = frame >= w.endFrame;

        const pop = spring({
          frame: Math.max(0, frame - w.startFrame),
          fps,
          config: { damping: 12, mass: 0.7, stiffness: 220 },
        });

        const scale = isActive ? 1 + pop * 0.18 : 1;
        const color = isActive ? highlightColor : hasPassed ? '#E0E0E0' : '#FFFFFF';
        const rotate = isActive ? (idx % 2 === 0 ? '-2deg' : '2deg') : '0deg';

        return (
          <span
            key={idx}
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 900,
              fontSize: '78px',
              textTransform: 'uppercase',
              color,
              transform: `scale(${scale}) rotate(${rotate})`,
              transformOrigin: 'center center',
              WebkitTextStroke: '3.5px #000000',
              textShadow: '6px 6px 0px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.5)',
              display: 'inline-block',
              willChange: 'transform, color',
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
