import React from 'react';
import type { Vec3 } from '../core/easing';
import { GlbSet, type GlbSetProps } from './GlbSet';
import type { SpotMeta } from './WarkopSet';

/** Titik posisi siap pakai untuk menaruh karakter di KostSet (Three.js: Y=up, -Z=belakang). */
export const KOST_SPOTS = {
  /** Tengah karpet depan meja ngoding — spot utama Bang Utoh berdiri/bicara. */
  center: [0.35, 0, -0.25] as Vec3,
  /** Dekat meja dual-monitor. */
  desk: [0.1, 0, -1.05] as Vec3,
  /** Dekat kasur sisi kiri. */
  bedside: [-0.95, 0, 0.05] as Vec3,
  /** Sisi kanan dekat galon & kipas angin. */
  rightSide: [1.22, 0, 0.05] as Vec3,
};

/** Metadata spasial & ergonomi spot Kamar Kost (v3.0, terkalibrasi AABB kost.glb). */
export const KOST_SPOT_META: Partial<Record<keyof typeof KOST_SPOTS, SpotMeta>> = {
  desk: {
    seatY: 0.49,
    tableTopY: 0.79,
    note: 'Depan meja dual-monitor KS_DeskTop (maxY=0,79 m) dan kursi gaming KS_ChairSeat (maxY=0,49 m).',
  },
  bedside: {
    seatY: 0.54,
    note: 'Tepi kasur sisi kiri (terkalibrasi AABB kost.glb: KS_Mattress maxY = 0,54 m, KS_Blanket maxY = 0,58 m).',
  },
};

export type KostSetProps = Omit<GlbSetProps, 'src'> & {
  lightId?: string;
};

/**
 * Set Dunia 3D: Kamar Kost Anak S1 Teknik Informatika (dimodelkan di Blender 5.3 -> `public/sets/kost.glb`).
 * Memuat meja dual-monitor kode menyala, PC tower RGB, kursi gaming, kasur + guling,
 * jendela berteralis, poster </> S1 Informatika, papan sticky notes deadline, rak mie instan, galon & kipas angin.
 */
export const KostSet: React.FC<KostSetProps> = ({ lightId = 'dusk', glowScale, ...rest }) => {
  const autoGlow = glowScale ?? (lightId === 'noon' ? 0.95 : 1.35);
  return <GlbSet src="sets/kost.glb" glowScale={autoGlow} {...rest} />;
};
