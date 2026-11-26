import type { LightPreset } from '../stage/lights';

export {
  GlbSet,
  classifyGlbSurface,
  shouldHideGlbNode,
  type GlbSetProps,
  type GlbSurfaceClass,
  type GlbSurfaceParams,
  type TimeOfDayMode,
} from './GlbSet';
export { filterSetBoxes, findSetBox, type SetBoxesManifest } from './boxes';
export {
  WarkopSet,
  WARKOP_SPOTS,
  WARKOP_SPOT_META,
  WARKOP_LAMP_NODES,
  type SpotMeta,
  type WorldSetProps,
} from './WarkopSet';
export { KostSet, KOST_SPOTS, KOST_SPOT_META, type KostSetProps } from './KostSet';
export { KampusSet, KAMPUS_SPOTS, KAMPUS_SPOT_META, type KampusSetProps } from './KampusSet';
export {
  KampungSet,
  KAMPUNG_SPOTS,
  KAMPUNG_SPOT_META,
  KAMPUNG_MODES,
  type KampungSetProps,
  type KampungTimeMode,
} from './KampungSet';

export type SetPresetId = 'warkop' | 'kost' | 'kampus' | 'kampung';

export const SET_PRESETS: Record<SetPresetId, { id: SetPresetId; name: string; glb: string; blend: string }> = {
  warkop: {
    id: 'warkop',
    name: 'Warkop Ngoding 24 Jam (PBR Textured)',
    glb: 'sets/warkop.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
  kost: {
    id: 'kost',
    name: 'Kamar Kost Anak S1 TI (PBR Textured)',
    glb: 'sets/kost.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
  kampus: {
    id: 'kampus',
    name: 'Lab Komputer S1 Teknik Informatika (PBR Textured)',
    glb: 'sets/kampus.glb',
    blend: 'assets/sets/blend/bang_utoh_sets.blend',
  },
  kampung: {
    id: 'kampung',
    name: 'Perkampungan Kos, Warkop & Kampus Bang Utoh (Unified PBR World)',
    glb: 'sets/kampung.glb',
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
