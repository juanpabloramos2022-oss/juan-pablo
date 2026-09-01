import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import timecodesData from '../public/timecodes.json';

interface WordTimecode {
  word: string;
  start: number;
  end: number;
}

export const KineticSubtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timecodes = timecodesData as unknown as WordTimecode[];

  if (!timecodes || !Array.isArray(timecodes) || timecodes.length === 0) {
    return null;
  }

  const currentTime = frame / fps;

  // Búsqueda estricta defensiva
  const activeWordObj = timecodes.find(
    (t) => t && typeof t.start === 'number' && typeof t.end === 'number' && currentTime >= t.start && currentTime < t.end
  );

  if (!activeWordObj || !activeWordObj.word) {
    return null;
  }

  const wordRelativeFrame = Math.max(0, Math.round((currentTime - activeWordObj.start) * fps));

  const scale = interpolate(wordRelativeFrame, [0, 7], [0.85, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        color: '#FFFFFF',
        fontSize: '75px',
        fontWeight: '900',
        textTransform: 'uppercase',
        fontFamily: 'Montserrat, sans-serif',
        textAlign: 'center',
        WebkitTextStroke: '3px #000000',
        textShadow: '6px 6px 0px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.5)',
        margin: '0 40px',
      }}
    >
      {activeWordObj.word}
    </div>
  );
};
