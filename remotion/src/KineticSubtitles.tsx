import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

export interface WordTiming {
  word: string;
  startFrame: number;
  endFrame: number;
}

interface Burst {
  words: WordTiming[];
  chunkStart: number;
  chunkEnd: number;
}

const CHUNK_SIZE = 3;

export const KineticSubtitles: React.FC<{ words: WordTiming[]; highlightColor?: string }> = ({
  words = [],
  highlightColor = '#FFE500',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bursts = useMemo(() => {
    const res: Burst[] = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
        // Adelanto anticipatorio de 2 frames en el inicio de la ráfaga
        const rawStart = chunk[0].startFrame;
        const rawEnd = chunk[chunk.length - 1].endFrame;
        res.push({
          words: chunk,
          chunkStart: Math.max(0, rawStart - 2),
          chunkEnd: rawEnd,
        });
      }
    }
    return res;
  }, [words]);

  const activeBurst = bursts.find((b) => frame >= b.chunkStart && frame < b.chunkEnd);
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
      {activeBurst.words.map((w, idx) => {
        // Anticipatory Lead-In: La palabra despierta 2 fotogramas antes del audio
        const activationFrame = Math.max(0, w.startFrame - 2);
        const isActive = frame >= activationFrame && frame < w.endFrame;
        const hasPassed = frame >= w.endFrame;

        // Física elástica compensada en el frame exacto de ataque
        const pop = spring({
          frame: Math.max(0, frame - activationFrame),
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
