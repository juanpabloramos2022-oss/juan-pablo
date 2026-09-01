import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";

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

const LEFT_PAD = 100;
const RANK_AREA_WIDTH = 130;
const PHOTO_SIZE = 100;
const PHOTO_GAP = 20;
const NAME_AREA_WIDTH = 450;
// 100 + 130 + 100 + 20 + 450 + 30 = 830
const BAR_START_X = LEFT_PAD + RANK_AREA_WIDTH + PHOTO_SIZE + PHOTO_GAP + NAME_AREA_WIDTH + 30;
const CHART_TOP = 370;
const CHART_BOTTOM_PAD = 90;

// ─── Football pitch SVG background ───────────────────────────────────────────
const FootballPitch: React.FC<{ width: number; height: number }> = ({ width: W, height: H }) => {
  const scaleX = W / 105;
  const scaleY = H / 68;
  const m = 20; // boundary margin

  const cx = W / 2;
  const cy = H / 2;

  const penDepth = 16.5 * scaleX;
  const penHW = 20.16 * scaleY;
  const goalDepth = 5.5 * scaleX;
  const goalHW = 9.16 * scaleY;
  const circleR = 9.15 * scaleY;
  const spotDist = 11 * scaleX;
  const arcHalfY = Math.sqrt(Math.max(0, (9.15 * scaleY) ** 2 - (5.5 * scaleX) ** 2));
  const cornerR = Math.max(24, 1 * scaleY);
  const goalHalfH = 3.66 * scaleY;
  const goalW = 2.5 * scaleX;

  const lc = "rgba(255,255,255,0.85)";
  const sw = 5;

  const stripeCount = 12;
  const stripeH = H / stripeCount;

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {/* Base */}
      <rect x={0} y={0} width={W} height={H} fill="#1A5E13" />

      {/* Alternating grass stripes */}
      {Array.from({ length: stripeCount }).map((_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x={0} y={i * stripeH} width={W} height={stripeH} fill="#1F6E17" />
        ) : null
      )}

      {/* Outer boundary */}
      <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Center line */}
      <line x1={cx} y1={m} x2={cx} y2={H - m} stroke={lc} strokeWidth={sw} />

      {/* Center circle + spot */}
      <circle cx={cx} cy={cy} r={circleR} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={9} fill={lc} />

      {/* ── Left side ── */}
      <rect x={m} y={cy - penHW} width={penDepth} height={penHW * 2} fill="none" stroke={lc} strokeWidth={sw} />
      <rect x={m} y={cy - goalHW} width={goalDepth} height={goalHW * 2} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={m + spotDist} cy={cy} r={9} fill={lc} />
      <path
        d={`M ${m + penDepth} ${cy - arcHalfY} A ${9.15 * scaleX} ${9.15 * scaleY} 0 0 1 ${m + penDepth} ${cy + arcHalfY}`}
        fill="none" stroke={lc} strokeWidth={sw}
      />
      {/* Left goal */}
      <rect x={m - goalW} y={cy - goalHalfH} width={goalW} height={goalHalfH * 2}
        fill="rgba(255,255,255,0.1)" stroke={lc} strokeWidth={sw} />

      {/* ── Right side ── */}
      <rect x={W - m - penDepth} y={cy - penHW} width={penDepth} height={penHW * 2} fill="none" stroke={lc} strokeWidth={sw} />
      <rect x={W - m - goalDepth} y={cy - goalHW} width={goalDepth} height={goalHW * 2} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={W - m - spotDist} cy={cy} r={9} fill={lc} />
      <path
        d={`M ${W - m - penDepth} ${cy - arcHalfY} A ${9.15 * scaleX} ${9.15 * scaleY} 0 0 0 ${W - m - penDepth} ${cy + arcHalfY}`}
        fill="none" stroke={lc} strokeWidth={sw}
      />
      {/* Right goal */}
      <rect x={W - m} y={cy - goalHalfH} width={goalW} height={goalHalfH * 2}
        fill="rgba(255,255,255,0.1)" stroke={lc} strokeWidth={sw} />

      {/* ── Corner arcs ── */}
      <path d={`M ${m} ${m + cornerR} A ${cornerR} ${cornerR} 0 0 1 ${m + cornerR} ${m}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${W - m - cornerR} ${m} A ${cornerR} ${cornerR} 0 0 1 ${W - m} ${m + cornerR}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${m} ${H - m - cornerR} A ${cornerR} ${cornerR} 0 0 0 ${m + cornerR} ${H - m}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${W - m - cornerR} ${H - m} A ${cornerR} ${cornerR} 0 0 0 ${W - m} ${H - m - cornerR}`} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Dark overlay for chart readability */}
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
      boxShadow: `0 0 24px ${color}88`,
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

  // rank 10 (index 9) → delay 0 first; rank 1 (index 0) → delay last
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

  const BAR_HEIGHT = Math.round(rowHeight * 0.60);
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
        <span style={{ fontSize: 52, fontWeight: 900, color: scorer.color, fontFamily: "Arial Black, Arial, sans-serif" }}>
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
        opacity: labelOpacity, paddingRight: 20,
      }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: "white", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {scorer.name}
        </div>
        <div style={{ fontSize: 24, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>
          {scorer.country}
        </div>
      </div>

      {/* Bar track */}
      <div style={{
        position: "absolute", left: BAR_START_X, top: barOffsetY,
        width: barMaxWidth, height: BAR_HEIGHT,
        backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
      }} />

      {/* Animated bar */}
      <div style={{
        position: "absolute", left: BAR_START_X, top: barOffsetY,
        width: Math.max(0, currentBarWidth), height: BAR_HEIGHT,
        background: `linear-gradient(90deg, ${scorer.color}99 0%, ${scorer.color} 100%)`,
        borderRadius: 14, boxShadow: `0 0 50px ${scorer.color}55`,
      }} />

      {/* Goals counter (right edge of bar) */}
      <div style={{
        position: "absolute",
        left: BAR_START_X + currentBarWidth,
        top: barOffsetY, height: BAR_HEIGHT,
        transform: "translateX(-100%)",
        display: "flex", alignItems: "center", paddingRight: 24,
        opacity: goalsOpacity, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {displayedGoals.toLocaleString()}
        </span>
        <span style={{ fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginLeft: 10 }}>
          goles
        </span>
      </div>
    </div>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const TopScorers: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleY = interpolate(frame, [0, 24], [40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const chartAreaHeight = height - CHART_TOP - CHART_BOTTOM_PAD;
  const rowHeight = Math.floor(chartAreaHeight / TOP_SCORERS.length);
  const barMaxWidth = width - BAR_START_X - 160;

  return (
    <AbsoluteFill style={{ fontFamily: "Arial, sans-serif", overflow: "hidden" }}>

      {/* ── Football pitch background ── */}
      <FootballPitch width={width} height={height} />

      {/* Subtle vertical guide lines for bar scale */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.06 }} width={width} height={height}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f}
            x1={BAR_START_X + f * barMaxWidth} y1={CHART_TOP}
            x2={BAR_START_X + f * barMaxWidth} y2={height - CHART_BOTTOM_PAD}
            stroke="white" strokeWidth={3}
          />
        ))}
      </svg>

      {/* ── Title ── */}
      <div style={{ position: "absolute", top: 60 + titleY, left: LEFT_PAD, right: 160, opacity: titleOpacity }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: "white", letterSpacing: -3, lineHeight: 1.05, fontFamily: "Arial Black, Arial, sans-serif" }}>
          TOP 10 GOLEADORES
        </div>
        <div style={{ fontSize: 42, fontWeight: 400, color: "rgba(255,255,255,0.45)", marginTop: 14, letterSpacing: 8, textTransform: "uppercase" }}>
          Histórico del Fútbol Mundial
        </div>
        <div style={{ marginTop: 18, width: 300, height: 4, background: "linear-gradient(90deg, #FF4757, transparent)", borderRadius: 2 }} />
      </div>

      {/* ── Bars ── */}
      {TOP_SCORERS.map((scorer, index) => (
        <Bar key={scorer.rank} scorer={scorer} index={index} rowHeight={rowHeight} barMaxWidth={barMaxWidth} />
      ))}
    </AbsoluteFill>
  );
};
