import type { ProductionMeta } from '../types';
import { FPS, SHOTS } from './shots';

export { StarterProduction } from './Production';

export const starterMeta: ProductionMeta = {
  id: 'starter',
  title: 'Starter',
  width: 1080,
  height: 1920,
  fps: FPS,
  durationInFrames: SHOTS[SHOTS.length - 1].to,
};
