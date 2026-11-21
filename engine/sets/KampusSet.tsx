import React from 'react';
import type { Vec3 } from '../core/easing';
import { GlbSet, type GlbSetProps } from './GlbSet';

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
