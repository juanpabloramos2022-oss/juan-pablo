import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { CountUp } from './components/CountUp';

interface Scene3Props {
	highlight: { text: string; value: number; suffix?: string };
}

export const Scene3: React.FC<Scene3Props> = ({ highlight }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const entry = spring({
		frame,
		fps,
		config: { damping: 10, stiffness: 120 },
	});

	const opacity = entry;
	const scale = interpolate(entry, [0, 1], [0.4, 1], { extrapolateRight: 'clamp' });

	// Pulse effect for the background glow
	const pulse = interpolate(
		Math.sin(frame / 8),
		[-1, 1],
		[0.4, 0.8]
	);

	return (
		<AbsoluteFill className="flex items-center justify-center bg-transparent overflow-hidden">
			{/* Animated Background Pulse */}
			<div
				className="absolute w-[1200px] h-[1200px] rounded-full bg-[#ccff00]/10 blur-[150px]"
				style={{
					opacity: pulse * entry,
					transform: `scale(${1 + Math.sin(frame / 15) * 0.2})`,
				}}
			/>

			{/* Speed lines effect */}
			<AbsoluteFill className="opacity-20">
				{[...Array(20)].map((_, i) => (
					<div
						key={i}
						className="absolute h-1 bg-[#ccff00]"
						style={{
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
							width: `${200 + Math.random() * 300}px`,
							transform: `translateX(${interpolate(frame, [0, 60], [-500, 1500])}px) skewX(-45deg)`,
						}}
					/>
				))}
			</AbsoluteFill>

			<div
				className="relative text-center flex flex-col items-center gap-4"
				style={{
					opacity,
					transform: `scale(${scale})`,
				}}
			>
				<div className="bg-[#ccff00] px-12 py-3 skew-x-[-20deg] shadow-[0_0_40px_rgba(204,255,0,0.4)]">
					<span className="text-black text-4xl font-black uppercase tracking-tighter skew-x-[20deg] italic">Top Achievement</span>
				</div>

				<h2 className="text-white text-7xl font-black sporty-text italic neon-glow mt-8 max-w-5xl leading-none tracking-tighter">
					{highlight.text}
				</h2>

				<div className="text-[#ccff00] text-[22rem] font-black leading-none drop-shadow-[0_0_60px_rgba(204,255,0,0.5)] italic tracking-tighter">
					<CountUp
						value={highlight.value}
						startFrame={10}
						duration={50}
						suffix={highlight.suffix}
						decimals={highlight.value % 1 === 0 ? 0 : 1}
					/>
				</div>

				<div
					className="mt-4 w-full h-4 bg-white/10 skew-x-[-15deg] overflow-hidden"
					style={{ width: '600px' }}
				>
					<div
						className="h-full bg-[#ccff00] shadow-[0_0_20px_#ccff00]"
						style={{
							width: interpolate(frame, [0, 50], [0, 100], { extrapolateRight: 'clamp' }) + '%',
						}}
					/>
				</div>
			</div>
		</AbsoluteFill>
	);
};
