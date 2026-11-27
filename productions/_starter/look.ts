import { GRADE_PRESETS, LIGHTS, POST_HYBRID_25D, indoorLight, type LightPreset, type PostParams } from '../../engine';

/** Milik agent light-colorist (standar Atelier v4.0 — 2.5D Volumetric 360° + Soft-Lit Polish). */
export const LOOK = {
  ground: '#d9c59b',
};

export const lightFor = (id: string): LightPreset => {
  const base = indoorLight((LIGHTS as Record<string, LightPreset>)[id] ?? LIGHTS.noon);
  return {
    ...base,
    tone: { ...base.tone, localLight: 1.0 },
    // Aktifkan full silhouette castShadow (lantai + dinding belakang gaya (1).mp4) pada preset default starter.
    card: { ...base.card, castShadow: true },
  };
};

/** Parameter post dasar v3.0: hybrid 2,5D (outline dunia tipis, karakter 2D pop, shallow DOF lembut). */
export const POST: PostParams = {
  ...POST_HYBRID_25D,
};

/** Parameter post per shot: sinkronkan warna kabut tinta dan preset grade dengan cahaya aktif. */
export function postFor(lightId: string, blur: number, focus: number): PostParams {
  const light = lightFor(lightId);
  const grade = (GRADE_PRESETS as Record<string, typeof GRADE_PRESETS.noon>)[lightId] ?? GRADE_PRESETS.noon;
  return {
    ...POST,
    ink: {
      ...POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur,
    focus,
    grade,
  };
}
