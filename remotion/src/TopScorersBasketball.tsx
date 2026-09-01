import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";

// ─── Data (NBA All-Time Top Scorers) ─────────────────────────────────────────
const TOP_SCORERS = [
  {
    rank: 1, name: "LeBron James", points: 40474, team: "Lakers / Cavaliers", color: "#FDB927",
    photo: "https://upload.wikimedia.org/wikipedia/commons/b/bf/LeBron_James_-_51959723161_%28cropped%29.jpg",
  },
  {
    rank: 2, name: "Kareem Abdul-Jabbar", points: 38387, team: "Lakers / Bucks", color: "#552583",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Kareem_Abdul-Jabbar_May_2014.jpg/500px-Kareem_Abdul-Jabbar_May_2014.jpg",
  },
  {
    rank: 3, name: "Karl Malone", points: 36928, team: "Jazz", color: "#002B5C",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NBA_HOF%E2%80%99er_Karl_Malone_visits_Barksdale_%289%29_%28cropped%29.jpg/500px-NBA_HOF%E2%80%99er_Karl_Malone_visits_Barksdale_%289%29_%28cropped%29.jpg",
  },
  {
    rank: 4, name: "Kobe Bryant", points: 33643, team: "Lakers", color: "#FDB927",
    photo: "https://upload.wikimedia.org/wikipedia/commons/5/56/Kobe_Bryant_2014.jpg",
  },
  {
    rank: 5, name: "Michael Jordan", points: 32292, team: "Bulls", color: "#CE1141",
    photo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Michael_Jordan_in_2014.jpg",
  },
  {
    rank: 6, name: "Dirk Nowitzki", points: 31560, team: "Mavericks", color: "#00538C",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Dirk_Nowitzki_2_%28cropped%29.jpg/500px-Dirk_Nowitzki_2_%28cropped%29.jpg",
  },
  {
    rank: 7, name: "Wilt Chamberlain", points: 31419, team: "Warriors / Lakers", color: "#FFC72C",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Wilt_Chamberlain_1960_%28cropped%29_%28cropped%29.jpg/500px-Wilt_Chamberlain_1960_%28cropped%29_%28cropped%29.jpg",
  },
  {
    rank: 8, name: "Kevin Durant", points: 28924, team: "Suns / Thunder", color: "#E56020",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Kevin_Durant%2C_Paris_2024_%28cropped%29.jpg/500px-Kevin_Durant%2C_Paris_2024_%28cropped%29.jpg",
  },
  {
    rank: 9, name: "Shaquille O'Neal", points: 28596, team: "Lakers / Magic", color: "#552583",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/TechCrunch_Disrupt_2023_-_Day_1_%28cropped%29.jpg/500px-TechCrunch_Disrupt_2023_-_Day_1_%28cropped%29.jpg",
  },
  {
    rank: 10, name: "Carmelo Anthony", points: 28289, team: "Knicks / Nuggets", color: "#F58426",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Carmelo_Anthony_at_2025_NBA_All_Star_Weekend_%28cropped%29.jpg/500px-Carmelo_Anthony_at_2025_NBA_All_Star_Weekend_%28cropped%29.jpg",
  },
];

const MAX_POINTS = TOP_SCORERS[0].points;
const STAGGER_DELAY = 18;
const BAR_DURATION = 35;

// ─── Layout constants for 1080×1920 ──────────────────────────────────────────
const LEFT_PAD = 36;
const RANK_AREA_WIDTH = 56;
const PHOTO_SIZE = 120;
const PHOTO_GAP = 10;
const NAME_AREA_WIDTH = 230;
const BAR_START_X = LEFT_PAD + RANK_AREA_WIDTH + PHOTO_SIZE + PHOTO_GAP + NAME_AREA_WIDTH + 14;
const CHART_TOP = 220;
const CHART_BOTTOM_PAD = 50;

// ─── Portrait basketball court SVG ───────────────────────────────────────────
const BasketballCourtPortrait: React.FC<{ width: number; height: number }> = ({
  width: W, height: H,
}) => {
  // Approximate standard court ratios (50ft wide x 94ft long)
  const scaleX = W / 50;
  const scaleY = H / 94;
  const m = 15;
  const cx = W / 2;
  const cy = H / 2;

  const paintW = 16 * scaleX;
  const paintH = 19 * scaleY;
  const ftCircleR = 6 * ((scaleX + scaleY) / 2);
  const threePtArcH = 23.75 * scaleY;
  const cornerThreeDist = 3 * scaleX;
  
  const lc = "rgba(255, 140, 0, 0.4)"; // Faded orange lines
  const sw = 3;

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {/* Background (Dark Hardwood Style) */}
      <rect x={0} y={0} width={W} height={H} fill="#130D08" />
      
      {/* Vertical subtle wood planks */}
      {Array.from({ length: 15 }).map((_, i) => (
        <rect key={i} x={i * (W/15)} y={0} width={W/15 - 2} height={H} fill="#18110B" />
      ))}

      {/* Outer boundary */}
      <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Center line */}
      <line x1={m} y1={cy} x2={W - m} y2={cy} stroke={lc} strokeWidth={sw} />

      {/* Center circles */}
      <circle cx={cx} cy={cy} r={6 * scaleX} fill="none" stroke={lc} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={2 * scaleX} fill={lc} />

      {/* ── TOP COURT ── */}
      {/* Paint */}
      <rect x={cx - paintW / 2} y={m} width={paintW} height={paintH} fill="#CE1141" fillOpacity={0.05} stroke={lc} strokeWidth={sw} />
      <path d={`M ${cx - ftCircleR} ${m + paintH} A ${ftCircleR} ${ftCircleR} 0 0 0 ${cx + ftCircleR} ${m + paintH}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${cx - ftCircleR} ${m + paintH} A ${ftCircleR} ${ftCircleR} 0 0 1 ${cx + ftCircleR} ${m + paintH}`} fill="none" stroke={lc} strokeWidth={sw} strokeDasharray="5,5" />
      {/* 3pt line */}
      <path d={`M ${m + cornerThreeDist} ${m} L ${m + cornerThreeDist} ${m + 14 * scaleY} A ${threePtArcH} ${threePtArcH} 0 0 0 ${W - m - cornerThreeDist} ${m + 14 * scaleY} L ${W - m - cornerThreeDist} ${m}`} fill="none" stroke={lc} strokeWidth={sw} />

      {/* ── BOTTOM COURT ── */}
      {/* Paint */}
      <rect x={cx - paintW / 2} y={H - m - paintH} width={paintW} height={paintH} fill="#CE1141" fillOpacity={0.05} stroke={lc} strokeWidth={sw} />
      <path d={`M ${cx - ftCircleR} ${H - m - paintH} A ${ftCircleR} ${ftCircleR} 0 0 1 ${cx + ftCircleR} ${H - m - paintH}`} fill="none" stroke={lc} strokeWidth={sw} />
      <path d={`M ${cx - ftCircleR} ${H - m - paintH} A ${ftCircleR} ${ftCircleR} 0 0 0 ${cx + ftCircleR} ${H - m - paintH}`} fill="none" stroke={lc} strokeWidth={sw} strokeDasharray="5,5" />
      {/* 3pt line */}
      <path d={`M ${m + cornerThreeDist} ${H - m} L ${m + cornerThreeDist} ${H - m - 14 * scaleY} A ${threePtArcH} ${threePtArcH} 0 0 1 ${W - m - cornerThreeDist} ${H - m - 14 * scaleY} L ${W - m - cornerThreeDist} ${H - m}`} fill="none" stroke={lc} strokeWidth={sw} />

      {/* Dark overlay */}
      <rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0.5)" />
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
      backgroundColor: "#222"
    }}
  >
    <Img
      src={src}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
      onError={(e) => {
        // Fallback if wikipedia image is missing
        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Player&background=random`;
      }}
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
  const currentBarWidth = barProgress * (scorer.points / MAX_POINTS) * barMaxWidth;
  const displayedPoints = Math.round(barProgress * scorer.points);

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

      {/* Name + Team */}
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
          {scorer.team}
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

      {/* Points counter */}
      <div style={{
        position: "absolute",
        left: BAR_START_X + currentBarWidth,
        top: barOffsetY, height: BAR_HEIGHT,
        transform: "translateX(-100%)",
        display: "flex", alignItems: "center", paddingRight: 14,
        opacity: goalsOpacity, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
          {displayedPoints.toLocaleString()}
        </span>
        <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginLeft: 6 }}>
          pts
        </span>
      </div>
    </div>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const TopScorersBasketball: React.FC = () => {
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

      {/* Portrait basketball court */}
      <BasketballCourtPortrait width={width} height={height} />

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
          ANOTADORES
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.45)", marginTop: 8, letterSpacing: 5, textTransform: "uppercase" }}>
          NBA Histórico
        </div>
        <div style={{ marginTop: 12, width: 160, height: 3, background: "linear-gradient(90deg, #FDB927, transparent)", borderRadius: 2 }} />
      </div>

      {/* Bars */}
      {TOP_SCORERS.map((scorer, index) => (
        <Bar key={scorer.rank} scorer={scorer} index={index} rowHeight={rowHeight} barMaxWidth={barMaxWidth} />
      ))}
    </AbsoluteFill>
  );
};
