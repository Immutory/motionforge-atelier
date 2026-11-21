import { DEFAULT_POST, GRADE_PRESETS, LIGHTS, type LightPreset, type PostParams } from '../../engine';

/** Milik agent light-colorist. Preset cahaya dipilih per shot lewat Shot.light. */
export const LOOK = {
  ground: '#d9c59b',
};

export const lightFor = (id: string): LightPreset =>
  (LIGHTS as Record<string, LightPreset>)[id] ?? LIGHTS.noon;

/** Parameter post dasar. */
export const POST: PostParams = {
  ...DEFAULT_POST,
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
