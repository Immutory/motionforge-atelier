import React from 'react';
import { WARKOP_SPOTS, WARKOP_SPOT_META, WarkopSet, type NamedBox, type Vec3 } from '../../engine';

/**
 * Milik agent set-designer (standar Atelier v2.1).
 * Menggunakan set GLB resmi `<WarkopSet />` (`public/sets/warkop.glb`) dengan `showGround={false}` di `<Stage>`,
 * serta mengekspor kontrak spasial (`STARTER_SPOTS`, `STARTER_OBSTACLES`) terkalibrasi terhadap AABB aktual `warkop.glb`.
 */
export const STARTER_SPOTS = {
  utoh: [-0.55, 0, -0.35] as Vec3,
  rara: [0.42, 0, -0.35] as Vec3,
  counterKeeper: [
    WARKOP_SPOTS.counterKeeper[0],
    WARKOP_SPOT_META.counterKeeper?.ergonomicBaseY ?? 0.44,
    WARKOP_SPOTS.counterKeeper[2],
  ] as Vec3,
  /** Gelas bawaan `WK_TableCup1` di meja kiri `warkop.glb` (sasaran shot macro-prop). */
  tableProp: [-1.45, 0.83, 0.18] as Vec3,
};

/** Tabel AABB furnitur kunci (diukur langsung dari `public/sets/warkop.glb`) untuk Fase 3.5 Spatial Audit. */
export const STARTER_OBSTACLES: NamedBox[] = [
  { name: 'WK_CounterTop', min: [-2.34, 0.9, -1.95], max: [2.34, 0.97, -1.09] },
  { name: 'WK_TableL_Top', min: [-2.41, 0.71, -0.11], max: [-1.09, 0.77, 0.61] },
  { name: 'WK_BenchL_Top', min: [-2.36, 0.42, 0.72], max: [-1.14, 0.475, 1.04] },
  { name: 'WK_TableR_Top', min: [1.09, 0.71, -0.11], max: [2.41, 0.77, 0.61] },
];

export const SetPieces: React.FC<{ lightId?: string }> = ({ lightId = 'noon' }) => {
  return <WarkopSet lightId={lightId} />;
};
