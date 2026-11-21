import type { LightPreset } from '../stage/lights';

export { GlbSet, type GlbSetProps } from './GlbSet';
export { WarkopSet, WARKOP_SPOTS, type WorldSetProps } from './WarkopSet';
export { KostSet, KOST_SPOTS, type KostSetProps } from './KostSet';
export { KampusSet, KAMPUS_SPOTS, type KampusSetProps } from './KampusSet';

export type SetPresetId = 'warkop' | 'kost' | 'kampus';

export const SET_PRESETS: Record<SetPresetId, { id: SetPresetId; name: string; glb: string; blend: string }> = {
  warkop: {
    id: 'warkop',
    name: 'Warkop Ngoding 24 Jam',
    glb: 'sets/warkop.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
  kost: {
    id: 'kost',
    name: 'Kamar Kost Anak S1 TI',
    glb: 'sets/kost.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
  kampus: {
    id: 'kampus',
    name: 'Lab Komputer S1 Teknik Informatika',
    glb: 'sets/kampus.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
};

/**
 * Sesuaikan preset cahaya untuk set interior/semi-interior (Warkop/Kost/Kampus) agar
 * sumber cahaya utama datang dari sisi depan-atas ruangan (tidak terblokir dinding belakang).
 */
export function indoorLight(base: LightPreset, azimuth = 36, elevation = 46): LightPreset {
  return {
    ...base,
    key: {
      ...base.key,
      azimuth,
      elevation,
      cameraRelative: false,
    },
    shadow: {
      ...base.shadow,
      range: 10,
      bias: -0.0004,
      normalBias: 0.02,
    },
  };
}
