import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  Video,
  staticFile,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import type { Caption } from "@remotion/captions";
import { CaptionPage } from "./CaptionPage";
import type { WordPage } from "./SubtitleCaption";

function mergeToWords(captions: Caption[]): { text: string; startMs: number; endMs: number }[] {
  const words: { text: string; startMs: number; endMs: number }[] = [];
  for (const token of captions) {
    const isWordStart =
      token.text.startsWith(" ") ||
      token.text.startsWith("¿") ||
      token.text.startsWith("¡") ||
      words.length === 0;

    if (isWordStart) {
      const clean = token.text.trim();
      if (clean.length > 0) {
        words.push({ text: clean, startMs: token.startMs, endMs: token.endMs });
      }
    } else {
      const last = words[words.length - 1];
      if (last) {
        last.text += token.text;
        last.endMs = token.endMs;
      }
    }
  }
  return words.filter((w) => w.text.length > 0);
}

function createPages(
  words: { text: string; startMs: number; endMs: number }[],
  maxWordsPerPage: number,
): WordPage[] {
  const pages: WordPage[] = [];
  for (let i = 0; i < words.length; i += maxWordsPerPage) {
    const chunk = words.slice(i, i + maxWordsPerPage);
    pages.push({
      words: chunk,
      startMs: chunk[0].startMs,
      endMs: chunk[chunk.length - 1].endMs,
    });
  }
  return pages;
}

export const RawVideoSubtitles: React.FC = () => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps, durationInFrames } = useVideoConfig();

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile("captions-raw.json"));
      const data: Caption[] = await response.json();
      setCaptions(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, cancelRender, handle]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  const pages = useMemo<WordPage[]>(() => {
    if (!captions) return [];
    const words = mergeToWords(captions);
    return createPages(words, 3);
  }, [captions]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video src={staticFile("raw_video.mp4")} />

      {captions &&
        pages.map((page, index) => {
          const nextPage = pages[index + 1] ?? null;
          const startFrame = Math.floor((page.startMs / 1000) * fps);
          const endFrame = nextPage
            ? Math.floor((nextPage.startMs / 1000) * fps)
            : durationInFrames;
          const duration = Math.max(1, endFrame - startFrame);

          return (
            <Sequence key={index} from={startFrame} durationInFrames={duration}>
              <CaptionPage page={page} />
            </Sequence>
          );
        })}
    </AbsoluteFill>
  );
};
