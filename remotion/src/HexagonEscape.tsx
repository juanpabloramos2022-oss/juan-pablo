import React, { useMemo } from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Sequence,
} from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from "@remotion/google-fonts/Outfit";

const { fontFamily } = loadFont();

const NUM_RINGS = 20;
const BALL_RADIUS = 40;
const RING_THICKNESS = 15;
const GAP_SIZE = Math.PI / 3; // 60 degrees, exactly one side
const BASE_ROTATION_SPEED = 0.0001;
const INITIAL_BALL_SPEED = 30;
// Max substeps per frame — prevents the ball from tunneling through rings at high speed
const MAX_SUBSTEPS = 8;

const SFX_BOUNCE = "https://remotion.media/switch.wav";
const SFX_ESCAPE = "https://remotion.media/whoosh.wav";
const SFX_WIN = "https://remotion.media/ding.wav";
const SFX_LOSS = "https://remotion.media/windows-xp-error.wav";

interface SimulationState {
	ballX: number;
	ballY: number;
	ringsAlive: boolean[];
	ringAngles: number[];
	ringsEscaped: number;
	escapeFrame: number;
}

// Flat-top hexagon so the top side is horizontal and centered at 0 degrees.
// Vertices are at 30, 90, 150, 210, 270, 330 degrees mathematically.
const HEXAGON_CLIP_PATH = 'polygon(75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%, 25% 6.7%)';

export const HexagonEscape: React.FC = () => {
	const { fps, durationInFrames, width, height } = useVideoConfig();
	const frame = useCurrentFrame();
	const centerX = width / 2;
	const centerY = height / 2;

	const ringRadii = useMemo(() => Array.from({ length: NUM_RINGS }, (_, i) => 250 + i * 40), []);

	const simulation = useMemo(() => {
		const states: SimulationState[] = [];
		const bounces: number[] = [];
		const escapes: number[] = [];
		const deathFrames: number[] = new Array(NUM_RINGS).fill(-1);

		let ballX = 0;
		let ballY = 0;
		let ballVX = INITIAL_BALL_SPEED * Math.cos(Math.PI / 4 + 0.1);
		let ballVY = INITIAL_BALL_SPEED * Math.sin(Math.PI / 4 + 0.1);

		const ringsAlive = new Array(NUM_RINGS).fill(true);
		let rotationDirection = 1;
		let ringsEscaped = 0;
		let escapeFrame = -1;

		const ringRotationSpeeds = ringRadii.map((r) => (r * BASE_ROTATION_SPEED) * 0.5 + 0.01);
		const currentRingAngles = new Array(NUM_RINGS).fill(-Math.PI / 2);

		let lastBounceFrame = -10;

		for (let f = 0; f < durationInFrames; f++) {
			if (ringsEscaped < NUM_RINGS && f < 1800) {
				// Advance all ring angles by one frame
				for (let i = 0; i < NUM_RINGS; i++) {
					if (ringsAlive[i]) {
						currentRingAngles[i] += ringRotationSpeeds[i] * rotationDirection;
					}
				}

				// Substep loop: resolve all collisions within this single frame step.
				let remainingT = 1.0;

				for (let substep = 0; substep < MAX_SUBSTEPS && remainingT > 1e-9; substep++) {
					// Find the innermost alive ring
					let ringIdx = -1;
					for (let i = 0; i < NUM_RINGS; i++) {
						if (ringsAlive[i]) { ringIdx = i; break; }
					}

					if (ringIdx === -1) {
						ballX += ballVX * remainingT;
						ballY += ballVY * remainingT;
						remainingT = 0;
						break;
					}

					const ringR = ringRadii[ringIdx];
					const collisionR = ringR - BALL_RADIUS;

					// Solve |pos + t*vel|² = collisionR² for t ∈ [0, remainingT]
					const a = ballVX * ballVX + ballVY * ballVY;
					const bCoef = 2 * (ballX * ballVX + ballY * ballVY);
					const cCoef = ballX * ballX + ballY * ballY - collisionR * collisionR;
					const disc = bCoef * bCoef - 4 * a * cCoef;

					if (disc < 0 || a < 1e-10) {
						// No intersection — move freely for the rest of this frame
						ballX += ballVX * remainingT;
						ballY += ballVY * remainingT;
						remainingT = 0;
						break;
					}

					const sqrtDisc = Math.sqrt(disc);
					// t_exit: larger root — time the ball exits the ring (ball inside → c ≤ 0)
					// t_enter: smaller root — time the ball re-enters from outside (error recovery)
					const tExit = (-bCoef + sqrtDisc) / (2 * a);
					const tEnter = (-bCoef - sqrtDisc) / (2 * a);

					let tHit = -1;
					if (cCoef <= 0) {
						// Ball inside ring: detect the outward exit
						if (tExit >= 0 && tExit <= remainingT) tHit = tExit;
					} else {
						// Ball outside ring (floating-point drift recovery): detect inward re-entry
						if (tEnter >= 0 && tEnter <= remainingT) tHit = tEnter;
					}

					if (tHit < 0) {
						// No collision in remaining time — finish the frame
						ballX += ballVX * remainingT;
						ballY += ballVY * remainingT;
						remainingT = 0;
						break;
					}

					// Move ball exactly to the collision point
					const hitX = ballX + tHit * ballVX;
					const hitY = ballY + tHit * ballVY;

					// Ring angle at the moment of impact
					const timeAfterHit = remainingT - tHit;
					const ringAngleAtHit = currentRingAngles[ringIdx] - ringRotationSpeeds[ringIdx] * rotationDirection * timeAfterHit;

					const hitAngle = Math.atan2(hitY, hitX);
					const normalizedBallAngle = ((hitAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
					const normalizedGapAngle = ((ringAngleAtHit % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
					let angleDiff = Math.abs(normalizedBallAngle - normalizedGapAngle);
					if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

					// Consume the time up to the hit; the substep loop handles the rest
					remainingT = timeAfterHit;

					const nx = hitX / collisionR;
					const ny = hitY / collisionR;

					if (angleDiff < GAP_SIZE / 2) {
						// ── Escape through the gap ──
						ringsAlive[ringIdx] = false;
						deathFrames[ringIdx] = f;
						rotationDirection *= -1;
						ringsEscaped++;
						escapes.push(f);
						if (ringsEscaped === NUM_RINGS) escapeFrame = f;

						const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
						ballVX = nx * (speed + 1.5);
						ballVY = ny * (speed + 1.5);
						ballX = hitX + nx * 0.01;
						ballY = hitY + ny * 0.01;
					} else {
						// ── Bounce off the ring wall ──
						if (f - lastBounceFrame > 8) { bounces.push(f); lastBounceFrame = f; }
						const dot = ballVX * nx + ballVY * ny;
						ballVX = ballVX - 2 * dot * nx;
						ballVY = ballVY - 2 * dot * ny;
						ballX = hitX - nx * 0.01;
						ballY = hitY - ny * 0.01;
					}
				}
			} else {
				ballX += ballVX * 0.1;
				ballY += ballVY * 0.1;
			}

			states.push({
				ballX, ballY, ringsAlive: [...ringsAlive], ringAngles: [...currentRingAngles], ringsEscaped, escapeFrame,
			});
		}

		return { states, bounces, escapes, deathFrames };
	}, [durationInFrames, ringRadii]);

	const currentState = simulation.states[frame] || simulation.states[simulation.states.length - 1];
	const { ballX, ballY, ringAngles, ringsEscaped, escapeFrame } = currentState;
	const timeLeft = Math.max(0, 60 - frame / fps);
	const showResult = ringsEscaped === NUM_RINGS || frame >= 1800;
	const isWin = ringsEscaped === NUM_RINGS;
	const isLoss = !isWin && frame >= 1800;

	return (
		<AbsoluteFill style={{ backgroundColor: 'black', color: 'white', fontFamily, overflow: 'hidden' }}>
			{simulation.bounces
				.filter((bf) => frame >= bf && frame < bf + 30)
				.map((bf) => (
					<Sequence key={`b-${bf}`} from={bf} durationInFrames={30}>
						<Audio src={SFX_BOUNCE} volume={0.4} />
					</Sequence>
				))}
			{simulation.escapes
				.filter((ef) => frame >= ef && frame < ef + 45)
				.map((ef) => (
					<Sequence key={`e-${ef}`} from={ef} durationInFrames={45}>
						<Audio src={SFX_ESCAPE} volume={0.7} />
					</Sequence>
				))}
			{isWin && escapeFrame !== -1 && (
				<Sequence from={escapeFrame} durationInFrames={120}>
					<Audio src={SFX_WIN} volume={1} />
				</Sequence>
			)}
			{isLoss && (
				<Sequence from={1800} durationInFrames={120}>
					<Audio src={SFX_LOSS} volume={1} />
				</Sequence>
			)}

			<AbsoluteFill style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)', zIndex: 5, pointerEvents: 'none' }} />

			{/* UI */}
			<div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)', width: '94%', padding: '70px 30px', backgroundColor: 'rgba(255, 255, 255, 0.07)', backdropFilter: 'blur(30px)', borderRadius: '60px', border: '1px solid rgba(255, 255, 255, 0.15)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: showResult ? 0.3 : 1 }}>
				<div style={{ textAlign: 'center', fontSize: 80, fontWeight: '900', color: 'white' }}>¿Podrá escapar la pelota en menos de un minuto?</div>
				<div style={{ marginTop: 35, fontSize: 65, color: '#00ffcc', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '25px' }}>
					<span style={{ padding: '12px 35px', backgroundColor: '#00ffcc', color: 'black', borderRadius: '20px' }}>{NUM_RINGS - ringsEscaped}</span> ANILLOS
				</div>
			</div>

			{/* Scene */}
			<div style={{ position: 'absolute', left: centerX, top: centerY, width: 0, height: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: showResult ? 0.2 : 1 }}>
				{[...ringRadii].map((_, idx) => idx).reverse().map((i) => {
					const radius = ringRadii[i];
					const deathF = simulation.deathFrames[i];
					const angle = ringAngles[i];
					if (deathF !== -1 && frame >= deathF) {
						if (frame > deathF + 15) return null;
						return (
                            <div key={i} style={{ 
                                position: 'absolute', width: radius * 2, height: radius * 2, 
                                opacity: interpolate(frame, [deathF, deathF + 15], [1, 0]), 
                                filter: 'blur(5px)',
                                transform: `rotate(${angle + Math.PI / 2}rad) scale(${interpolate(frame, [deathF, deathF + 15], [1, 1.2])})`
                            }}>
                                <div style={{ 
                                    width: '100%', height: '100%', 
                                    backgroundColor: `hsl(${i * 18}, 90%, 60%)`, 
                                    clipPath: HEXAGON_CLIP_PATH,
                                    display: 'flex', justifyContent: 'center', alignItems: 'center' 
                                }}>
                                    <div style={{ width: (radius - RING_THICKNESS) * 2, height: (radius - RING_THICKNESS) * 2, backgroundColor: 'black', clipPath: HEXAGON_CLIP_PATH }} />
                                </div>
                            </div>
                        );
					}
					const gapDeg = (GAP_SIZE * 180) / Math.PI;
					return (
						<div key={i} style={{ 
                            position: 'absolute', width: radius * 2, height: radius * 2, 
                            filter: `drop-shadow(0 0 15px hsl(${i * 18}, 90%, 60%))`
                        }}>
							<div style={{ 
                                width: '100%', height: '100%', 
                                clipPath: HEXAGON_CLIP_PATH, 
                                backgroundImage: `conic-gradient(transparent 0deg, transparent ${gapDeg / 2}deg, hsl(${i * 18}, 90%, 60%) ${gapDeg / 2}deg, hsl(${i * 18}, 90%, 60%) ${360 - gapDeg / 2}deg, transparent ${360 - gapDeg / 2}deg, transparent 360deg)`, 
                                transform: `rotate(${angle + Math.PI / 2}rad)`, 
                                display: 'flex', justifyContent: 'center', alignItems: 'center' 
                            }}>
							    <div style={{ width: (radius - RING_THICKNESS) * 2, height: (radius - RING_THICKNESS) * 2, backgroundColor: 'black', clipPath: HEXAGON_CLIP_PATH }} />
                            </div>
						</div>
					);
				})}
				<div style={{ 
                    position: 'absolute', left: ballX - BALL_RADIUS, top: ballY - BALL_RADIUS, 
                    width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, 
                    filter: 'drop-shadow(0 0 15px white)', 
                    zIndex: 100 
                }}>
                    <div style={{ 
                        width: '100%', height: '100%', 
                        backgroundColor: 'white', 
                        clipPath: HEXAGON_CLIP_PATH 
                    }} />
                </div>
			</div>

			{/* Timer */}
			<div style={{ position: 'absolute', bottom: 350, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10, opacity: showResult ? 0 : 1 }}>
				<div style={{ fontSize: 40, fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>TIEMPO RESTANTE</div>
				<div style={{ fontSize: 220, fontWeight: '900', color: timeLeft < 10 ? '#ff3333' : 'white' }}>{timeLeft.toFixed(2)}s</div>
			</div>

			{/* Result */}
			{showResult && (
				<AbsoluteFill style={{ zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
					<div style={{ fontSize: 250, fontWeight: '900', color: isWin ? '#00ffcc' : '#ff3333', textShadow: isWin ? '0 0 50px #00ffcc' : '0 0 50px #ff3333', textAlign: 'center' }}>
						{isWin ? '¡ESCAPASTE!' : '¡FALLASTE!'}
					</div>
				</AbsoluteFill>
			)}
		</AbsoluteFill>
	);
};
