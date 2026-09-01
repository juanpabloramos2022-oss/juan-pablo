import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { BarChart } from './components/BarChart';
import { LineChart } from './components/LineChart';

interface Scene2Props {
	bars: { name: string; value: number }[];
	lineChart: { day: string; value: number }[];
}

export const Scene2: React.FC<Scene2Props> = ({ bars, lineChart }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<AbsoluteFill className="flex flex-col p-24 bg-transparent" style={{ opacity }}>
			<div className="flex justify-between items-center mb-16">
				<h2 className="text-white text-8xl font-black sporty-text italic">Performance Breakdown</h2>
				<div className="bg-[#ccff00] px-6 py-2 skew-x-[-15deg] border-r-8 border-white">
					<span className="text-black font-black text-xl uppercase tracking-widest skew-x-[15deg]">Live Metrics</span>
				</div>
			</div>

			<div className="flex gap-16 h-full items-center">
				<div className="flex-1 bg-white/5 border-l-8 border-[#ccff00] rounded-none p-12 backdrop-blur-md shadow-2xl h-[600px] flex flex-col justify-center skew-x-[-2deg]">
					<div className="skew-x-[2deg]">
						<h3 className="text-[#ccff00] text-2xl font-black mb-12 uppercase tracking-tighter italic">Product Distribution</h3>
						<BarChart bars={bars} />
					</div>
				</div>

				<div className="flex-1 bg-white/5 border-r-8 border-[#ccff00] rounded-none p-12 backdrop-blur-md shadow-2xl h-[600px] flex flex-col justify-center overflow-hidden skew-x-[2deg]">
					<div className="skew-x-[-2deg]">
						<h3 className="text-[#ccff00] text-2xl font-black mb-12 uppercase tracking-tighter italic">Revenue Velocity</h3>
						<LineChart data={lineChart} />
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
