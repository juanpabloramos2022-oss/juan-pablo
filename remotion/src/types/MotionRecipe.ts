export interface MotionRecipeProps {
  frame: number;
  durationInFrames: number;
  t: number;
  assets: {
    imageUrl: string;
    text: string;
    emotion?: string;
  };
  theme?: {
    primaryColor: string;
    fontFamily: string;
  };
}
