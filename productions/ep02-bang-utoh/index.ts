import type { ProductionMeta } from '../types';
import { FPS, SHOTS } from './shots';

export { Ep02BangUtohProduction } from './Production';

export const ep02BangUtohMeta: ProductionMeta = {
  id: 'ep02-bang-utoh',
  title: 'EP #2 Bang Utoh (Short 9:16)',
  width: 1080,
  height: 1920,
  fps: FPS,
  durationInFrames: SHOTS[SHOTS.length - 1].to,
};
