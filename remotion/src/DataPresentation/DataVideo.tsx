import React from 'react';
import { AbsoluteFill, Series, useVideoConfig, interpolate, useCurrentFrame } from 'remotion';
import { Scene1 } from './Scene1';
import { Scene2 } from './Scene2';
import { Scene3 } from './Scene3';
import data from '../../assets/data.json';

export const DataVideo: React.FC = () => {
	const { fps, durationInFrames, width, height } = useVideoConfig();
	const frame = useCurrentFrame();

	const sceneDuration = 5 * fps;

	return (
		<AbsoluteFill className="bg-[#050505] overflow-hidden">
			{/* High-Performance Background */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at ${50 + Math.sin(frame / 40) * 10}% ${50 + Math.cos(frame / 50) * 10}%, #111 0%, #000 100%)`,
				}}
			/>

			{/* Sporty Mesh/Grid Texture */}
			<AbsoluteFill
				style={{
					backgroundImage: `linear-gradient(rgba(204, 255, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(204, 255, 0, 0.03) 1px, transparent 1px)`,
					backgroundSize: '20px 20px',
					opacity: 0.8,
				}}
			/>

			{/* Subtle Vignette with Neon Hint */}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%)',
				}}
			/>

			<Series>
				<Series.Sequence durationInFrames={sceneDuration}>
					<Scene1 title={data.title} subtitle={data.subtitle} kpis={data.kpis} />
				</Series.Sequence>
				<Series.Sequence durationInFrames={sceneDuration}>
					<Scene2 bars={data.bars} lineChart={data.lineChart} />
				</Series.Sequence>
				<Series.Sequence durationInFrames={sceneDuration}>
					<Scene3 highlight={data.highlight} />
				</Series.Sequence>
			</Series>
		</AbsoluteFill>
	);
};
