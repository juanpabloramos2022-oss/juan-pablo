import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordPage } from "./SubtitleCaption";

const ACTIVE_COLOR = "#FFE500";
const INACTIVE_COLOR = "#FFFFFF";

export const CaptionPage: React.FC<{ page: WordPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 100,
        paddingLeft: 32,
        paddingRight: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 18px",
          padding: "20px 32px",
          borderRadius: 20,
          background: "rgba(0,0,0,0.45)",
        }}
      >
        {page.words.map((word, i) => {
          const isActive =
            word.startMs <= absoluteTimeMs && word.endMs > absoluteTimeMs;

          return (
            <span
              key={i}
              style={{
                fontSize: 72,
                fontWeight: 900,
                fontFamily: "Arial Black, Arial, sans-serif",
                color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                textShadow: isActive
                  ? "0 0 24px rgba(255,229,0,0.7), 0 4px 16px rgba(0,0,0,0.9)"
                  : "0 4px 16px rgba(0,0,0,0.9)",
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
                display: "inline-block",
                transform: isActive ? "scale(1.08)" : "scale(1)",
                transition: "transform 0s",
                textTransform: "uppercase",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
