import React from 'react';
import { interpolate, Img } from 'remotion';
import { MotionRecipeProps } from '../types/MotionRecipe';

export const RecipeKenBurns: React.FC<MotionRecipeProps> = ({ t, assets }) => {
  const scale = interpolate(t, [0, 1], [1, 1.15]);
  const translateY = interpolate(t, [0, 1], [0, -35]);

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Img 
        src={assets.imageUrl} 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateY(${translateY}px)`,
          willChange: 'transform',
        }} 
      />
    </div>
  );
};
