import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';

export const CountUp: React.FC<{
	value: number;
	startFrame: number;
	duration: number;
	prefix?: string;
	suffix?: string;
	decimals?: number;
}> = ({ value, startFrame, duration, prefix = '', suffix = '', decimals = 0 }) => {
	const frame = useCurrentFrame();

	const animatedValue = interpolate(
		frame,
		[startFrame, startFrame + duration],
		[0, value],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.bezier(0.16, 1, 0.3, 1),
		}
	);

	// Overshoot effect
	const overshootProgress = interpolate(
		frame,
		[startFrame + duration * 0.8, startFrame + duration, startFrame + duration * 1.2],
		[1, 1.05, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const finalValue = animatedValue * overshootProgress;

	return (
		<span>
			{prefix}
			{finalValue.toLocaleString(undefined, {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			})}
			{suffix}
		</span>
	);
};
