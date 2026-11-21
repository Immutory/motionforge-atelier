import { DEFAULT_POST, LIGHTS, type LightPreset, type PostParams } from '../../engine';

/** Milik agent light-colorist. Preset cahaya dipilih per shot lewat Shot.light. */
export const LOOK = {
  ground: '#cdb98f',
};

export const lightFor = (id: string): LightPreset =>
  (LIGHTS as Record<string, LightPreset>)[id] ?? LIGHTS.noon;

/** Parameter post dasar. Blur dan fokus diisi per frame dari DOF di shots.ts. */
export const POST: PostParams = {
  ...DEFAULT_POST,
  grade: { lift: [0, 0, 0.012], gain: [1.01, 1, 0.98], contrast: 1.05, saturation: 1.05 },
};
