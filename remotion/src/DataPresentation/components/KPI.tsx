import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CountUp } from './CountUp';

interface KPIProps {
	label: string;
	value: number;
	prefix?: string;
	suffix?: string;
	index: number;
}

export const KPI: React.FC<KPIProps> = ({ label, value, prefix, suffix, index }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const entry = spring({
		frame,
		fps,
		delay: index * 5,
		config: {
			damping: 10,
			stiffness: 120,
		},
	});

	const opacity = entry;
	const scale = 0.8 + entry * 0.2;
	const translateY = 30 * (1 - entry);

	// Simple icons based on label
	const getIcon = () => {
		if (label.toLowerCase().includes('ingresos')) {
			return (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#ccff00]">
					<line x1="12" y1="1" x2="12" y2="23" />
					<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
				</svg>
			);
		}
		if (label.toLowerCase().includes('usuarios')) {
			return (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#ccff00]">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
					<path d="M16 3.13a4 4 0 0 1 0 7.75" />
				</svg>
			);
		}
		return (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#ccff00]">
				<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
				<polyline points="17 6 23 6 23 12" />
			</svg>
		);
	};

	return (
		<div
			className="bg-white/5 border-l-4 border-[#ccff00] rounded-none p-8 backdrop-blur-md shadow-2xl flex flex-col gap-4 skew-x-[-4deg]"
			style={{
				opacity,
				transform: `scale(${scale}) translateY(${translateY}px) skewX(-4deg)`,
			}}
		>
			<div className="bg-[#ccff00]/20 w-12 h-12 rounded-none flex items-center justify-center skew-x-[4deg]">
				{getIcon()}
			</div>
			<div className="flex flex-col skew-x-[4deg]">
				<span className="text-white/60 text-xl font-black sporty-text">{label}</span>
				<span className="text-white text-7xl font-black mt-2 italic">
					<CountUp
						value={value}
						startFrame={index * 5 + 10}
						duration={40}
						prefix={prefix}
						suffix={suffix}
						decimals={value % 1 === 0 ? 0 : 1}
					/>
				</span>
			</div>
		</div>
	);
};
