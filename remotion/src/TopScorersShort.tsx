import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";

// ─── Data (same players as the 4K version) ───────────────────────────────────
const TOP_SCORERS = [
  {
    rank: 1, name: "Cristiano Ronaldo", goals: 914, country: "Portugal", color: "#FF4757",
    photo: "https://upload.wikimedia.org/wikipedia/commons/9/9c/President_Donald_Trump_meets_with_Cristiano_Ronaldo_in_the_Oval_Office_%2854933344262%29_%28cropped_and_rotated%29.jpg",
  },
  {
    rank: 2, name: "Lionel Messi", goals: 858, country: "Argentina", color: "#2ED573",
    photo: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg",
  },
  {
    rank: 3, name: "Josef Bican", goals: 805, country: "Chequia", color: "#A29BFE",
    photo: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Josef_Bican_1940.jpg",
  },
  {
    rank: 4, name: "Romario", goals: 772, country: "Brasil", color: "#FFA502",
    photo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Rom%C3%A1rio_at_announcement_of_Brazil_as_2014_FIFA_World_Cup_host_2007-10-30_%28cropped%29.jpg",
  },
  {
    rank: 5, name: "Pelé", goals: 767, country: "Brasil", color: "#1E90FF",
    photo: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Pele_con_brasil_%28cropped%29.jpg",
  },
  {
    rank: 6, name: "Gerd Müller", goals: 735, country: "Alemania", color: "#FF6B81",
    photo: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Gerd_M%C3%BCller_c1973_%28cropped%29.jpg",
  },
  {
    rank: 7, name: "Ferenc Puskás", goals: 729, country: "Hungría", color: "#ECCC68",
    photo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Ferenc_Puskas_en_1965.jpg",
  },
  {
    rank: 8, name: "Eusébio", goals: 727, country: "Portugal", color: "#00CEC9",
    photo: "https://upload.wikimedia.org/wikipedia/commons/5/55/Eusebio_en_1973.jpg",
  },
  {
    rank: 9, name: "Jimmy Jones", goals: 647, country: "Irlanda", color: "#55EFC4",
    photo: "https://upload.wikimedia.org/wikipedia/commons/7/75/Jimmy_jones.jpg",
  },
  {
    rank: 10, name: "Sándor Kocsis", goals: 576, country: "Hungría", color: "#FD79A8",
    photo: "https://upload.wikimedia.org/wikipedia/commons/6/69/Kocsis_S%C3%A1ndor_Fortepan_261526.jpg",
  },
];

const MAX_GOALS = TOP_SCORERS[0].goals;
const STAGGER_DELAY = 18;
const BAR_DURATION = 35;

// ─── Layout constants for 1080×1920 ──────────────────────────────────────────
const LEFT_PAD = 36;
const RANK_AREA_WIDTH = 56;
const PHOTO_SIZE = 120;
const PHOTO_GAP = 10;
const NAME_AREA_WIDTH = 230;
// 36 + 56 + 120 + 10 + 230 + 14 = 466
const BAR_START_X = LEFT_PAD + RANK_AREA_WIDTH + PHOTO_SIZE + PHOTO_GAP + NAME_AREA_WIDTH + 14;
const CHART_TOP = 220;
const CHART_BOTTOM_PAD = 50;

// ─── Portrait football pitch SVG ─────────────────────────────────────────────
// Portrait = goals at top/bottom, center line is horizontal
const FootballPitchPortrait: React.FC<{ width: number; height: number }> = ({
  width: W, height: H,
}) => {
  // Treat W=68m (field width), H=105m (field length)
  const scaleX = W / 68;
  const scaleY = H / 105;
  const m = 15;
  const cx = W / 2;
  const cy = H / 2;

  const penDepth = 16.5 * scaleY;
  const penHW = 20.16 * scaleX;
  const goalDepth = 5.5 * scaleY;
  const goalHW = 9.16 * scaleX;
  const circleR = 9.15 * ((scaleX + scaleY) / 2);
  const spotDist = 11 * scaleY;
  // Horizontal half-extent of arc at penalty area edge
  const arcHalfX = 7.31 * scaleX;
  const cornerR = Math.max(10, 1 * ((scaleX + scaleY) / 2));
  const goalNetHW = 3.66 * scaleX;
  const goalNetH = 2 * scaleY;

  const lc = "rgba(255,255,255,0.85)";
  const sw = 3;

  // Vertical stripes for portrait pitch
  const stripeCount = 14;
  const stripeW = W / stripeCount;

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={0} width={W} height={H} fill="#1A5E13" />

      {/* Alternating vertical stripes */}
      {Array.from({ length: stripeCount }).map((_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x={i * stripeW} y={0} width={stripeW} height={H} fill="#1F6E17" />
        ) : null
      )}

      {/* Outer boundary */}
      <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Center line (horizontal) */}
      <line x1={m} y1={cy} x2={W - m} y2={cy} stroke={lc} strokeWidth={sw} />

      {/* Center circle + spot */}
      <circle cx={cx} cy={cy} r={circleR} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={6} fill={lc} />

      {/* ── TOP side (near top goal) ── */}
      <rect x={cx - penHW} y={m} width={penHW * 2} height={penDepth} fill="none" stroke={lc} strokeWidth={sw} />
      <rect x={cx - goalHW} y={m} width={goalHW * 2} height={goalDepth} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={cx} cy={m + spotDist} r={6} fill={lc} />
      {/* Top arc (bulges downward into field) */}
      <path
        d={`M ${cx - arcHalfX} ${m + penDepth} A ${9.15 * scaleX} ${9.15 * scaleY} 0 0 0 ${cx + arcHalfX} ${m + penDepth}`}
        fill="none" stroke={lc} strokeWidth={sw}
      />
      <rect x={cx - goalNetHW} y={m - goalNetH} width={goalNetHW * 2} height={goalNetH}
        fill="rgba(255,255,255,0.1)" stroke={lc} strokeWidth={sw} />

      {/* ── BOTTOM side ── */}
      <rect x={cx - penHW} y={H - m - penDepth} width={penHW * 2} height={penDepth} fill="none" stroke={lc} strokeWidth={sw} />
      <rect x={cx - goalHW} y={H - m - goalDepth} width={goalHW * 2} height={goalDepth} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={cx} cy={H - m - spotDist} r={6} fill={lc} />
      {/* Bottom arc (bulges upward into field) */}
      <path
        d={`M ${cx - arcHalfX} ${H - m - penDepth} A ${9.15 * scaleX} ${9.15 * scaleY} 0 0 1 ${cx + arcHalfX} ${H - m - penDepth}`}
        fill="none" stroke={lc} strokeWidth={sw}
      />
      <rect x={cx - goalNetHW} y={H - m} width={goalNetHW * 2} height={goalNetH}
        fill="rgba(255,255,255,0.1)" stroke={lc} strokeWidth={sw} />

      {/* ── Corner arcs ── */}
      <path d={`M ${m} ${m + cornerR} A ${cornerR} ${cornerR} 0 0 1 ${m + cornerR} ${m}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${W - m - cornerR} ${m} A ${cornerR} ${cornerR} 0 0 1 ${W - m} ${m + cornerR}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${m} ${H - m - cornerR} A ${cornerR} ${cornerR} 0 0 0 ${m + cornerR} ${H - m}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${W - m - cornerR} ${H - m} A ${cornerR} ${cornerR} 0 0 0 ${W - m} ${H - m - cornerR}`} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Dark overlay */}
      <rect x={0} y={0} width={W} height={H} fill="rgba(0,5,18,0.70)" />
    </svg>
  );
};

// ─── Circular player photo ────────────────────────────────────────────────────
const PlayerAvatar: React.FC<{ src: string; size: number; color: string; opacity: number }> = ({
  src, size, color, opacity,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      border: `4px solid ${color}`,
      boxShadow: `0 0 22px ${color}88`,
      flexShrink: 0,
      opacity,
    }}
  >
    <Img
      src={src}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
    />
  </div>
);

// ─── Single bar row ───────────────────────────────────────────────────────────
type Scorer = (typeof TOP_SCORERS)[0];

const Bar: React.FC<{ scorer: Scorer; index: number; rowHeight: number; barMaxWidth: number }> = ({
  scorer, index, rowHeight, barMaxWidth,
}) => {
  const frame = useCurrentFrame();

  const barDelay = (TOP_SCORERS.length - 1 - index) * STAGGER_DELAY;

  const barProgress = interpolate(frame, [barDelay, barDelay + BAR_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const labelOpacity = interpolate(frame, [barDelay, barDelay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const goalsOpacity = interpolate(frame, [barDelay + BAR_DURATION * 0.4, barDelay + BAR_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const BAR_HEIGHT = Math.round(rowHeight * 0.62);
  const barOffsetY = (rowHeight - BAR_HEIGHT) / 2;
  const currentBarWidth = barProgress * (scorer.goals / MAX_GOALS) * barMaxWidth;
  const displayedGoals = Math.round(barProgress * scorer.goals);

  return (
    <div style={{ position: "absolute", top: CHART_TOP + index * rowHeight, left: 0, right: 0, height: rowHeight }}>

      {/* Rank */}
      <div style={{
        position: "absolute", left: LEFT_PAD, top: barOffsetY,
        width: RANK_AREA_WIDTH, height: BAR_HEIGHT,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: labelOpacity,
      }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: scorer.color, fontFamily: "Arial Black, Arial, sans-serif" }}>
          #{scorer.rank}
        </span>
      </div>

      {/* Player photo */}
      <div style={{
        position: "absolute", left: LEFT_PAD + RANK_AREA_WIDTH, top: barOffsetY,
        width: PHOTO_SIZE, height: BAR_HEIGHT,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PlayerAvatar src={scorer.photo} size={PHOTO_SIZE} color={scorer.color} opacity={labelOpacity} />
      </div>

      {/* Name + country */}
      <div style={{
        position: "absolute",
        left: LEFT_PAD + RANK_AREA_WIDTH + PHOTO_SIZE + PHOTO_GAP,
        top: barOffsetY,
        width: NAME_AREA_WIDTH, height: BAR_HEIGHT,
        display: "flex", flexDirection: "column", justifyContent: "center",
        opacity: labelOpacity, paddingRight: 10,
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "white", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {scorer.name}
        </div>
        <div style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginTop: 3, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {scorer.country}
        </div>
      </div>

      {/* Bar track */}
      <div style={{
        position: "absolute", left: BAR_START_X, top: barOffsetY,
        width: barMaxWidth, height: BAR_HEIGHT,
        backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10,
      }} />

      {/* Animated bar */}
      <div style={{
        position: "absolute", left: BAR_START_X, top: barOffsetY,
        width: Math.max(0, currentBarWidth), height: BAR_HEIGHT,
        background: `linear-gradient(90deg, ${scorer.color}99 0%, ${scorer.color} 100%)`,
        borderRadius: 10, boxShadow: `0 0 30px ${scorer.color}55`,
      }} />

      {/* Goals counter */}
      <div style={{
        position: "absolute",
        left: BAR_START_X + currentBarWidth,
        top: barOffsetY, height: BAR_HEIGHT,
        transform: "translateX(-100%)",
        display: "flex", alignItems: "center", paddingRight: 14,
        opacity: goalsOpacity, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
          {displayedGoals.toLocaleString()}
        </span>
        <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginLeft: 6 }}>
          goles
        </span>
      </div>
    </div>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const TopScorersShort: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleY = interpolate(frame, [0, 24], [30, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const chartAreaHeight = height - CHART_TOP - CHART_BOTTOM_PAD;
  const rowHeight = Math.floor(chartAreaHeight / TOP_SCORERS.length);
  const barMaxWidth = width - BAR_START_X - 40;

  return (
    <AbsoluteFill style={{ fontFamily: "Arial, sans-serif", overflow: "hidden" }}>

      {/* Portrait football pitch */}
      <FootballPitchPortrait width={width} height={height} />

      {/* Subtle vertical guide lines */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.06 }} width={width} height={height}>
        {[0.33, 0.66, 1].map((f) => (
          <line key={f}
            x1={BAR_START_X + f * barMaxWidth} y1={CHART_TOP}
            x2={BAR_START_X + f * barMaxWidth} y2={height - CHART_BOTTOM_PAD}
            stroke="white" strokeWidth={2}
          />
        ))}
      </svg>

      {/* Title */}
      <div style={{ position: "absolute", top: 50 + titleY, left: LEFT_PAD, right: 40, opacity: titleOpacity }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: "white", letterSpacing: -1.5, lineHeight: 1.05, fontFamily: "Arial Black, Arial, sans-serif" }}>
          TOP 10
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "white", letterSpacing: -1.5, lineHeight: 1.05, fontFamily: "Arial Black, Arial, sans-serif" }}>
          GOLEADORES
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.45)", marginTop: 8, letterSpacing: 5, textTransform: "uppercase" }}>
          Histórico Mundial
        </div>
        <div style={{ marginTop: 12, width: 160, height: 3, background: "linear-gradient(90deg, #FF4757, transparent)", borderRadius: 2 }} />
      </div>

      {/* Bars */}
      {TOP_SCORERS.map((scorer, index) => (
        <Bar key={scorer.rank} scorer={scorer} index={index} rowHeight={rowHeight} barMaxWidth={barMaxWidth} />
      ))}
    </AbsoluteFill>
  );
};
