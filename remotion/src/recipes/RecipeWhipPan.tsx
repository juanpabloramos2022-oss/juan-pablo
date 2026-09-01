import React from 'react';
import { interpolate, Easing, Img } from 'remotion';
import { MotionRecipeProps } from '../types/MotionRecipe';

export const RecipeWhipPan: React.FC<MotionRecipeProps> = ({ t, assets }) => {
  const translateX = interpolate(t, [0, 0.2, 0.8, 1], [1080, 0, 0, -1080], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div style={{ width: '100%', height: '100%', transform: `translateX(${translateX}px)`, willChange: 'transform' }}>
      <Img src={assets.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};
