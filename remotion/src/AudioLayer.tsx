import React, { useEffect, useState } from 'react';
import { Audio, staticFile, delayRender, continueRender } from 'remotion';

export interface AudioLayerProps {
  fileName?: string;
  hasBackgroundMusic?: boolean;
}

export const AudioLayer: React.FC<AudioLayerProps> = ({
  fileName = "audio_narracion.mp3",
  hasBackgroundMusic = false,
}) => {
  const [handle] = useState(() => delayRender(`Loading audio: ${fileName}`));
  let src = '';
  try {
    src = staticFile(fileName);
  } catch (err) {
    console.error(`[AudioLayer] Error al resolver staticFile para ${fileName}:`, err);
  }

  useEffect(() => {
    if (handle) {
      const timer = setTimeout(() => {
        continueRender(handle);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [handle]);

  return (
    <>
      {src ? (
        <Audio
          src={src}
          volume={1.0}
          onLoadedData={() => continueRender(handle)}
          onCanPlay={() => continueRender(handle)}
          onError={(e) => {
            console.error(`[AudioLayer] Error cargando audio:`, e);
            continueRender(handle);
          }}
        />
      ) : null}
      {hasBackgroundMusic && (
        <Audio src={staticFile("music_loop.mp3")} volume={0.12} />
      )}
    </>
  );
};
