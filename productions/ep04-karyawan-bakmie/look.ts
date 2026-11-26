import { DEFAULT_POST, GRADE_PRESETS, LIGHTS, type GradeParams, type LightPreset, type PostParams, type Vec3 } from '../../engine';

/** Milik agent light-colorist. Mood malam konsisten dengan EP03 (malam berikutnya di Area Pedagang Rawa Sari). */
export const LOOK = { ground: '#3a3a44' };
export const EP04_LIGHT_ID = 'ep04-malam';

const night = LIGHTS.night;

export const EP04_LIGHT: LightPreset = {
  ...night,
  id: EP04_LIGHT_ID,
  fog: { ...night.fog, near: 14, far: 120 },
  fill: { color: '#ffb46a', intensity: 0.76 },
  ambient: { color: '#2d3d6e', intensity: 0.52 },
  tone: { ...night.tone, localLight: 0 },
  card: {
    ...night.card,
    tint: [1.0, 0.94, 0.86],
    shadeFloor: 0.86,
    sideTint: [0.72, 0.74, 0.98],
  },
};

export const lightFor = (_id: string): LightPreset => EP04_LIGHT;

export type Practical = { name: string; position: Vec3; color: string; intensity: number; distance: number; decay: number };

export const GEROBAK_BULB: Practical = {
  name: 'EP04_GerobakBulbKey',
  position: [-13.45, 1.86, 17.57],
  color: '#ffcf86',
  intensity: 3.25,
  distance: 5.8,
  decay: 1.4,
};

export const BENCH_BOUNCE: Practical = {
  name: 'EP04_BenchBounce',
  position: [-13.2, 1.15, 16.45],
  color: '#ffb877',
  intensity: 0.95,
  distance: 2.8,
  decay: 1.6,
};

export const TIO_EAST_FILL: Practical = {
  name: 'EP04_TioEastFill',
  position: [-11.85, 1.65, 17.15],
  color: '#ffc680',
  intensity: 1.25,
  distance: 3.4,
  decay: 1.5,
};

export const PRACTICALS: readonly Practical[] = [GEROBAK_BULB, BENCH_BOUNCE, TIO_EAST_FILL];

export const EP04_GRADE: GradeParams = {
  ...GRADE_PRESETS.dusk,
  lift: [0.016, 0.014, 0.034],
  gain: [1.04, 1.0, 0.98],
  contrast: 1.07,
  saturation: 1.06,
  tintS: [0.0, 0.004, 0.03],
  tintH: [0.02, 0.008, -0.006],
  vignette: [0.22, 0.38],
};

export const POST: PostParams = {
  ...DEFAULT_POST,
  bloom: { ...DEFAULT_POST.bloom, strength: DEFAULT_POST.bloom.strength * 1.15 },
};

export function postFor(blur: number, focus: number): PostParams {
  return {
    ...POST,
    ink: { ...POST.ink, fogColor: EP04_LIGHT.fog.color, fogNear: EP04_LIGHT.fog.near, fogFar: EP04_LIGHT.fog.far },
    blur,
    focus,
    grade: EP04_GRADE,
  };
}
