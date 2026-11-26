import { DEFAULT_POST, LIGHTS, type GradeParams, type LightPreset, type PostParams, type Vec3 } from '../../engine';

/** Milik agent light-colorist. Mood siang cerah soft-lit ala download.mp4 di Minimarket & ATM Rawa Sari. */
export const LOOK = { ground: '#5c6068' };
export const EP05_LIGHT_ID = 'ep05-siang';

const baseDay = LIGHTS.noon;

export const EP05_LIGHT: LightPreset = {
  ...baseDay,
  id: EP05_LIGHT_ID,
  fog: { ...baseDay.fog, near: 26, far: 165 },
  fill: { color: '#fff3d6', intensity: 0.72 },
  ambient: { color: '#dbeafe', intensity: 0.62 },
  tone: { ...baseDay.tone, localLight: 0 },
  card: {
    ...baseDay.card,
    tint: [1.0, 0.99, 0.96],
    shadeFloor: 0.88,
    sideTint: [0.88, 0.92, 1.0],
  },
};

export const lightFor = (_id: string): LightPreset => EP05_LIGHT;

export type Practical = { name: string; position: Vec3; color: string; intensity: number; distance: number; decay: number };

/** Pantulan aspal siang lembut agar wajah di bawah kanopi minimarket tetap cerah tanpa over-bloom. */
export const APRON_BOUNCE: Practical = {
  name: 'EP05_ApronBounce',
  position: [-31.2, 1.35, 5.2],
  color: '#fff8eb',
  intensity: 0.85,
  distance: 6.5,
  decay: 1.6,
};

export const PRACTICALS: readonly Practical[] = [APRON_BOUNCE];

export const EP05_GRADE: GradeParams = {
  ...DEFAULT_POST.grade,
  lift: [0.008, 0.01, 0.012],
  gain: [1.02, 1.01, 0.99],
  contrast: 1.04,
  saturation: 1.08,
  tintS: [0.0, 0.004, 0.012],
  tintH: [0.012, 0.008, -0.004],
  vignette: [0.14, 0.34],
};

export const POST: PostParams = {
  ...DEFAULT_POST,
  bloom: { ...DEFAULT_POST.bloom, strength: DEFAULT_POST.bloom.strength * 0.75 },
};

export function postFor(blur: number, focus: number): PostParams {
  return {
    ...POST,
    ink: { ...POST.ink, fogColor: EP05_LIGHT.fog.color, fogNear: EP05_LIGHT.fog.near, fogFar: EP05_LIGHT.fog.far },
    blur,
    focus,
    grade: EP05_GRADE,
  };
}
