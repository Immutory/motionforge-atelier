import { DEFAULT_POST, GRADE_PRESETS, LIGHTS, type GradeParams, type LightPreset, type PostParams, type Vec3 } from '../../engine';

/**
 * Milik agent light-colorist. EP03 hanya punya satu suasana: malam hangat di Area Pedagang Rawa Sari.
 * Sumber cahaya bermotivasi:
 * - KEY: bohlam gerobak Tio (`KG_Grb_BakmieTio_LampBulb`, sudah dinyalakan `KampungSet mode="malam"`), diperkuat
 *   praktikal `GEROBAK_BULB` di posisi bohlam yang sama supaya wajah di bangku & di balik gerobak terbaca.
 * - RIM: cahaya bulan biru-perak dari preset `night` + lampu jalan sodium jauh.
 * - Aksen: bohlam gerobak es buah Mbak Yuni di kanan frame.
 * Cahaya tidak pernah berubah di tengah shot (satu preset untuk seluruh episode).
 */
export const LOOK = { ground: '#3a3a44' };

export const EP03_LIGHT_ID = 'ep03-malam';

const night = LIGHTS.night;

/** Preset malam EP03: ambient sedikit dinaikkan & kartu karakter lebih hangat agar tokoh terpisah dari latar gelap. */
export const EP03_LIGHT: LightPreset = {
  ...night,
  id: EP03_LIGHT_ID,
  fog: { ...night.fog, near: 14, far: 120 },
  fill: { color: '#ffb46a', intensity: 0.75 },
  ambient: { color: '#2d3d6e', intensity: 0.5 },
  tone: { ...night.tone, localLight: 0 },
  card: {
    ...night.card,
    tint: [1.0, 0.94, 0.86],
    shadeFloor: 0.86,
    sideTint: [0.72, 0.74, 0.98],
  },
};

export const lightFor = (_id: string): LightPreset => EP03_LIGHT;

/** Lampu praktis tambahan (urutan tetap, tidak pernah ditambah/dikurangi di tengah render). */
export type Practical = { name: string; position: Vec3; color: string; intensity: number; distance: number; decay: number };

export const GEROBAK_BULB: Practical = {
  name: 'EP03_GerobakBulbKey',
  position: [-13.45, 1.86, 17.57],
  color: '#ffcf86',
  intensity: 3.2,
  distance: 5.5,
  decay: 1.4,
};

/** Pantulan hangat dari dandang/etalase ke wajah pelanggan di bangku (fill rendah, masih bermotivasi bohlam). */
export const BENCH_BOUNCE: Practical = {
  name: 'EP03_BenchBounce',
  position: [-13.2, 1.15, 16.45],
  color: '#ffb877',
  intensity: 0.9,
  distance: 2.6,
  decay: 1.6,
};

export const PRACTICALS: readonly Practical[] = [GEROBAK_BULB, BENCH_BOUNCE];

/** Grade malam: turunan `dusk` dengan bayangan biru dan highlight bohlam hangat. */
export const EP03_GRADE: GradeParams = {
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

/** Parameter post per shot: kabut tinta & grade selalu dari preset malam EP03. */
export function postFor(blur: number, focus: number): PostParams {
  return {
    ...POST,
    ink: { ...POST.ink, fogColor: EP03_LIGHT.fog.color, fogNear: EP03_LIGHT.fog.near, fogFar: EP03_LIGHT.fog.far },
    blur,
    focus,
    grade: EP03_GRADE,
  };
}
