import React from 'react';
import type { Vec3 } from '../core/easing';
import { GlbSet, type GlbSetProps } from './GlbSet';

/** Titik posisi siap pakai untuk menaruh karakter di WarkopSet (Three.js: Y=up, -Z=belakang). */
export const WARKOP_SPOTS = {
  /** Tengah depan konter — spot utama Bang Utoh monolog/berdiri. */
  center: [-0.08, 0, -0.35] as Vec3,
  /** Di belakang konter warkop sisi tengah-kanan (cocok untuk Bu Siti / penjual warkop, bebas termos). */
  behindCounter: [0.58, 0, -2.08] as Vec3,
  /** Duduk/berdiri di samping meja pelanggan kiri. */
  leftTable: [-1.18, 0, 0.35] as Vec3,
  /** Duduk/berdiri di samping meja pelanggan kanan. */
  rightTable: [1.05, 0, 0.25] as Vec3,
};

export type WorldSetProps = Omit<GlbSetProps, 'src'> & {
  /** Mode pencahayaan untuk menyesuaikan intensitas lampu bohlam & neon box (`noon` vs `amber`/`dusk`/`neon`). */
  lightId?: string;
};

/**
 * Set Dunia 3D: Warkop Ngoding 24 Jam Indonesia (dimodelkan di Blender 5.3 -> `public/sets/warkop.glb`).
 * Memuat konter kayu, etalase kaca gorengan, tumpukan mie instan, termos, toples kerupuk,
 * kanopi terpal hijau-krem, neon box "WARKOP 24 JAM", 3 bohlam gantung, dan meja-bangku bakso.
 */
export const WarkopSet: React.FC<WorldSetProps> = ({ lightId = 'noon', glowScale, ...rest }) => {
  const autoGlow = glowScale ?? (lightId === 'noon' ? 0.9 : 1.35);
  return <GlbSet src="sets/warkop.glb" glowScale={autoGlow} {...rest} />;
};
