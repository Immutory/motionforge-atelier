import React from 'react';
import type { Vec3 } from '../core/easing';
import { GlbSet, type GlbSetProps } from './GlbSet';
import type { SpotMeta } from './WarkopSet';

/** Titik posisi siap pakai untuk menaruh karakter di KampusSet (Three.js: Y=up, -Z=belakang). */
export const KAMPUS_SPOTS = {
  /** Lorong tengah depan papan tulis — spot utama presentasi Bang Utoh. */
  presenter: [0.08, 0, -1.35] as Vec3,
  /** Tengah lorong lab (jarak medium ke kamera). */
  aisle: [0, 0, -0.25] as Vec3,
  /** Sisi kiri lorong depan papan tulis (bebas dari meja lab). */
  lecturer: [-0.82, 0, -1.62] as Vec3,
  /** Sisi kanan lorong depan lab (bebas dari kaki meja komputer). */
  rightLab: [0.76, 0, -0.35] as Vec3,
  /**
   * Berdiri di sisi kiri meja dosen `KP2_LectDesk` (0,35 m dari meja), di sebelah `catDesk`.
   * Pakai ini bila dosen/asisten harus satu frame dengan kucing di meja; `lecturer` ada 2,9 m dari meja.
   */
  lecturerDesk: [1.7, 0, -2.45] as Vec3,
  /**
   * Kucing duduk di atas meja dosen (y = 0,76 tepat di permukaan `KP2_LectDesk`, raycast kampus.glb),
   * ujung kiri meja menghadap lorong. 0,25 m dari kertas di meja dan 0,25 m dari tepi kiri meja.
   */
  catDesk: [2.3, 0.76, -2.55] as Vec3,
};

/** Metadata spasial & ergonomi spot Lab Komputer Kampus (v2.0). */
export const KAMPUS_SPOT_META: Partial<Record<keyof typeof KAMPUS_SPOTS, SpotMeta>> = {
  lecturerDesk: {
    tableTopY: 0.76,
    note: 'Berdiri 0,35 m di sisi kiri KP2_LectDesk (y=0,76 m); cek checkBillboardSweep agar lengan tidak menyapu meja.',
  },
  catDesk: {
    tableTopY: 0.76,
    note: 'Tepat di atas daun meja KP2_LectDesk (y=0,76 m), ≥ 0,25 m dari kertas dan tepi meja.',
  },
  presenter: {
    note: 'Lorong tengah depan papan tulis; cek checkSafeFraming agar papan nama LAB KOMPUTER FIK 2.1 tidak terpotong.',
  },
};

export type KampusSetProps = Omit<GlbSetProps, 'src'> & {
  lightId?: string;
};

/**
 * Set Dunia 3D: Lab Komputer & Ruang Kelas S1 Teknik Informatika (dimodelkan di Blender 5.3 -> `public/sets/kampus.glb`).
 * Memuat papan tulis lebar + flowchart algoritma, jam dinding, lambang TI, AC split, proyektor gantung,
 * meja dosen, 4 workstation PC lab menyala + kursi biru, jendela koridor, dan pintu kelas.
 */
export const KampusSet: React.FC<KampusSetProps> = ({ lightId = 'noon', glowScale, ...rest }) => {
  const autoGlow = glowScale ?? (lightId === 'noon' ? 0.95 : 1.25);
  return <GlbSet src="sets/kampus.glb" glowScale={autoGlow} {...rest} />;
};
