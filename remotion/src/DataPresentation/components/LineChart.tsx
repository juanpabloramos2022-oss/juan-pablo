import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { evolvePath } from '@remotion/paths';

interface LineChartProps {
	data: { day: string; value: number }[];
}

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const width = 800;
	const height = 400;
	const padding = 40;

	const maxValue = Math.max(...data.map((d) => d.value));
	const minValue = Math.min(...data.map((d) => d.value));

	const points = data.map((d, i) => ({
		x: padding + (i * (width - 2 * padding)) / (data.length - 1),
		y: height - padding - ((d.value - minValue) * (height - 2 * padding)) / (maxValue - minValue),
	}));

	const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

	const progress = interpolate(frame, [45, 90], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.bezier(0.16, 1, 0.3, 1),
	});

	const { strokeDasharray, strokeDashoffset } = evolvePath(progress, path);

	return (
		<div className="relative w-full h-full flex items-center justify-center">
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
				{/* Grid lines */}
				{[0, 0.25, 0.5, 0.75, 1].map((p) => (
					<line
						key={p}
						x1={padding}
						y1={padding + p * (height - 2 * padding)}
						x2={width - padding}
						y2={padding + p * (height - 2 * padding)}
						stroke="rgba(204, 255, 0, 0.1)"
						strokeWidth="1"
					/>
				))}

				{/* The line */}
				<path
					d={path}
					fill="none"
					stroke="url(#lineGradient)"
					strokeWidth="8"
					strokeLinecap="butt"
					strokeLinejoin="miter"
					strokeDasharray={strokeDasharray}
					strokeDashoffset={strokeDashoffset}
					className="drop-shadow-[0_0_20px_rgba(204,255,0,0.6)]"
				/>

				{/* Gradient definition */}
				<defs>
					<linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="#ccff00" />
						<stop offset="100%" stopColor="#88aa00" />
					</linearGradient>
				</defs>

				{/* Data points */}
				{points.map((p, i) => {
					const pointProgress = interpolate(
						frame,
						[45 + (i * 30) / data.length, 45 + (i * 30) / data.length + 10],
						[0, 1],
						{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
					);

					return (
						<rect
							key={i}
							x={p.x - 5}
							y={p.y - 5}
							width={10 * pointProgress}
							height={10 * pointProgress}
							fill="#ccff00"
							className="shadow-lg"
							transform={`rotate(45 ${p.x} ${p.y})`}
						/>
					);
				})}
			</svg>
		</div>
	);
};
