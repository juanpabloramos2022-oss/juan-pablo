import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate, staticFile, Img } from 'remotion';

export const BarChart: React.FC<{ bars: { name: string; value: number }[] }> = ({ bars }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const maxValue = Math.max(...bars.map((b) => b.value));

	return (
		<div className="flex flex-col gap-8 w-full">
			{bars.map((bar, i) => {
				const growth = spring({
					frame,
					fps,
					delay: i * 5 + 30,
					config: { damping: 10, stiffness: 100 }, // Snappier
				});

				const width = (bar.value / maxValue) * 100 * growth;
				const productImage = staticFile(`products/product_${i + 1}.png`);

				return (
					<div key={bar.name} className="flex flex-col gap-2">
						<div className="flex justify-between items-end">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 overflow-hidden p-1">
									<Img
										src={productImage}
										className="w-full h-full object-contain"
									/>
								</div>
								<span className="text-white text-2xl sporty-text">{bar.name}</span>
							</div>
							<span className="text-[#ccff00] text-2xl font-black italic">{Math.round(growth * bar.value)}</span>
						</div>
						<div className="h-10 w-full bg-white/5 rounded-none skew-x-[-12deg] overflow-hidden border border-white/10">
							<div
								className="h-full bg-gradient-to-r from-[#ccff00] to-[#88aa00] shadow-[0_0_20px_rgba(204,255,0,0.4)]"
								style={{
									width: `${width}%`,
								}}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
};
