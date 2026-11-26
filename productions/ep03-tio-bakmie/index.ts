import type { ProductionMeta } from '../types';
import { FPS, SHOTS } from './shots';

export { Ep03TioBakmieProduction } from './Production';

export const ep03TioBakmieMeta: ProductionMeta = {
  id: 'ep03-tio-bakmie',
  title: 'EP #3 Curhat ke Abang Bakmie (Short 9:16)',
  width: 1080,
  height: 1920,
  fps: FPS,
  durationInFrames: SHOTS[SHOTS.length - 1].to,
};
