import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export interface WordTimecode {
  word: string;
  start: number;
  end: number;
}

interface KineticSubtitlesProps {
  timecodes: WordTimecode[];
}

export const KineticSubtitles: React.FC<KineticSubtitlesProps> = ({ timecodes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Búsqueda estricta: tiempo en segundos (frame / fps)
  const currentTime = frame / fps;
  const activeWordObj = timecodes.find(
    (t) => currentTime >= t.start && currentTime < t.end
  );

  if (!activeWordObj) return null;

  const wordRelativeFrame = Math.max(0, Math.round((currentTime - activeWordObj.start) * fps));

  const scale = spring({
    fps,
    frame: wordRelativeFrame,
    config: { damping: 12, mass: 0.5, stiffness: 150 },
  });

  const opacity = interpolate(wordRelativeFrame, [0, 2], [0.4, 1.0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
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
