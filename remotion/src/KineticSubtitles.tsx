import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import timecodesData from '../public/timecodes.json';

export interface WordTiming {
  word: string;
  startFrame: number;
  endFrame: number;
}

interface Burst {
  words: WordTiming[];
  startFrame: number;
  endFrame: number;
}

const MAX_WORDS = 3;

export const KineticSubtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const words = (timecodesData as any[]) || [];

  const bursts = useMemo(() => {
    const res: Burst[] = [];
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      const chunk = words.slice(i, i + MAX_WORDS);
      if (chunk.length > 0) {
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        const sFrame = first.startFrame ?? first.start_frame ?? Math.floor((first.start ?? 0) * fps);
        const eFrame = last.endFrame ?? last.end_frame ?? Math.ceil((last.end ?? 0) * fps);

        res.push({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          words: chunk.map((w: any) => ({
            word: w.word,
            startFrame: w.startFrame ?? w.start_frame ?? Math.floor((w.start ?? 0) * fps),
            endFrame: w.endFrame ?? w.end_frame ?? Math.ceil((w.end ?? 0) * fps),
          })),
          startFrame: sFrame,
          endFrame: Math.max(sFrame + 1, eFrame),
        });
      }
    }
    return res;
  }, [words, fps]);

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
      {activeBurst.words.map((w, idx) => {
        const isActive = frame >= w.startFrame && frame < w.endFrame;
        const hasPassed = frame >= w.endFrame;

        const pop = spring({
          frame: Math.max(0, frame - w.startFrame),
          fps,
          config: { damping: 12, mass: 0.7, stiffness: 220 },
        });

        const scale = isActive ? 1 + pop * 0.18 : 1;
        const color = isActive ? '#FFE500' : hasPassed ? '#E0E0E0' : '#FFFFFF';
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
