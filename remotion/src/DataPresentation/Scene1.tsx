import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { KPI } from './components/KPI';

interface Scene1Props {
	title: string;
	subtitle: string;
	kpis: { label: string; value: number; prefix?: string; suffix?: string }[];
}

export const Scene1: React.FC<Scene1Props> = ({ title, subtitle, kpis }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
	const titleTranslateY = interpolate(frame, [0, 15], [40, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.quad),
	});

	return (
		<AbsoluteFill className="flex flex-col items-center justify-center px-24 bg-transparent">
			<div
				className="text-center mb-24"
				style={{
					opacity: titleOpacity,
					transform: `translateY(${titleTranslateY}px)`,
				}}
			>
				<h1 className="text-white text-[12rem] font-black sporty-text italic tracking-tighter neon-glow leading-none">{title}</h1>
				<div className="mt-4 inline-block bg-[#ccff00] px-8 py-2 skew-x-[-15deg]">
					<p className="text-black text-3xl font-black uppercase tracking-widest skew-x-[15deg]">{subtitle}</p>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-12 w-full max-w-7xl">
				{kpis.map((kpi, i) => (
					<KPI key={kpi.label} {...kpi} index={i} />
				))}
			</div>
		</AbsoluteFill>
	);
};
