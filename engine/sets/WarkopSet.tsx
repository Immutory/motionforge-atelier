import React from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { GlbSet, type GlbSetProps } from './GlbSet';

const LAMP_SUFFIXES = ['-1.35', '0.0', '1.35'] as const;
const LAMP_PIVOT_X = [-1.35, 0, 1.35] as const;
const LAMP_PIVOT_Y = 2.87;
const LAMP_PARTS = ['WK_LampCord_', 'WK_LampShade_', 'WK_LampBulb_'] as const;
/** Nama node Blender (mentah) kabel/kap/bohlam per lampu gantung, urut x = -1.35, 0.0, 1.35. */
export const WARKOP_LAMP_NODES: ReadonlyArray<readonly string[]> = LAMP_SUFFIXES.map((suf) =>
  LAMP_PARTS.map((prefix) => `${prefix}${suf}`),
);

/**
 * Titik posisi siap pakai untuk menaruh karakter di WarkopSet (Three.js: Y=up, -Z=belakang).
 * Semua angka diverifikasi raycast ke `public/sets/warkop.glb` (lantai `WK_Floor` y = 0,
 * permukaan `WK_TableL_Top` y = 0,77, dudukan `WK_BenchL_Top` y = 0,475).
 * Spot karakter: y = telapak di lantai; pakai `stance: 'sit'` untuk spot duduk (badan turun ke dudukan).
 */
export const WARKOP_SPOTS = {
  /** Tengah depan konter — spot utama Bang Utoh monolog/berdiri. */
  center: [-0.08, 0, -0.35] as Vec3,
  /**
   * @deprecated Hanya 0,13 m dari `WK_CounterTop` (badan menembus tepi konter). Dibiarkan karena dipakai
   * `productions/charlab/SetLabProduction.tsx`; produksi baru pakai `counterKeeper`.
   */
  behindCounter: [0.58, 0, -2.08] as Vec3,
  /** Berdiri di belakang konter (Bu Siti / penjual): 0,27 m dari `WK_CounterTop`, bebas rak belakang & papan menu. */
  counterKeeper: [0.1, 0, -2.22] as Vec3,
  /**
   * Duduk di bangku panjang `WK_BenchL` menghadap meja kiri (`stance: 'sit'`). Dudukan 0,475 m,
   * tepi depan `WK_TableL_Top` 0,27 m di depan badan. Berhadapan dengan `laptopTable`.
   */
  leftTable: [-1.58, 0, 0.88] as Vec3,
  /** Titik laptop di permukaan meja kiri (y = 0,77), tepi dekat bangku. Asumsi tapak laptop 0,32 × 0,22 m. */
  laptopTable: [-1.56, 0.77, 0.49] as Vec3,
  /**
   * Kucing duduk di atas meja kiri, di kanan laptop (y = 0,77 tepat di `WK_TableL_Top`).
   * Jarak ≥ 0,15 m ke tapak laptop dan gelas `WK_TableCup1`; tetap 0,11 m di dalam tepi meja.
   */
  catTable: [-1.2, 0.77, 0.43] as Vec3,
  /**
   * @deprecated Hanya 0,16 m dari `WK_StoolBlue1_Seat`. Dibiarkan karena dipakai
   * `productions/charlab/SetLabProduction.tsx`; produksi baru pakai `rightTableSeat`.
   */
  rightTable: [1.05, 0, 0.25] as Vec3,
  /** Duduk di bangku merah `WK_StoolRed2` menghadap meja kanan (`stance: 'sit'`), 0,27 m dari `WK_TableR_Top`. */
  rightTableSeat: [1.92, 0, 0.88] as Vec3,
};

/** Metadata spasial & ergonomi spot (v2.0): dipakai `checkCounterVisibility`, `sitHeight`, & audit `set-designer`. */
export type SpotMeta = {
  /** Tinggi permukaan dudukan bangku/kursi (m) untuk spot duduk (`stance: 'sit'`). */
  seatY?: number;
  /** Tinggi permukaan meja/konter di depan karakter (m). */
  tableTopY?: number;
  /** Tinggi puncak konter penghalang (m) di depan penjaga/kasir. */
  counterTopY?: number;
  /** Ketinggian pijakan ergonomis `pos[1]` (m) agar dada atas, bahu, & lengan tampil utuh di atas konter (≥ 0,32 m). */
  ergonomicBaseY?: number;
  /** Catatan clearance/orientasi resmi. */
  note?: string;
};

export const WARKOP_SPOT_META: Partial<Record<keyof typeof WARKOP_SPOTS, SpotMeta>> = {
  counterKeeper: {
    counterTopY: 0.97,
    ergonomicBaseY: 0.44,
    note: 'Terkalibrasi AABB warkop.glb: WK_CounterTop maxY = 0,97 m, pijakan kasir WK_CounterPallet topY = 0,44 m (lolos checkCounterVisibility).',
  },
  leftTable: {
    seatY: 0.475,
    tableTopY: 0.77,
    note: 'Bangku kayu WK_BenchL_Top (y=0,475 m) menghadap WK_TableL_Top (y=0,77 m). Cek checkBillboardSweep saat kamera OTS.',
  },
  rightTableSeat: {
    seatY: 0.483,
    tableTopY: 0.77,
    note: 'Kursi merah WK_StoolRed2_Seat (maxY=0,483 m) menghadap WK_TableR_Top (y=0,77 m).',
  },
  laptopTable: {
    tableTopY: 0.77,
    note: 'Permukaan WK_TableL_Top. Sembunyikan WK_TableCup1 bila menaruh prop gelas kustom di dekat laptop.',
  },
  catTable: {
    tableTopY: 0.77,
    note: 'Permukaan WK_TableL_Top, ≥ 0,15 m dari tapak laptop & gelas bawaan.',
  },
};

export type WorldSetProps = Omit<GlbSetProps, 'src'> & {
  /** Mode pencahayaan untuk menyesuaikan intensitas lampu bohlam & neon box (`noon` vs `amber`/`dusk`/`neon`). */
  lightId?: string;
  /** Sudut ayunan (radian di sumbu Z) untuk 3 lampu gantung di x = -1.35, 0.0, 1.35 (pivot plafon y = 2.87, z = -0.68). */
  bulbSwings?: readonly [number, number, number];
};

/**
 * Set Dunia 3D: Warkop Ngoding 24 Jam Indonesia (dimodelkan di Blender 5.3 -> `public/sets/warkop.glb`).
 * Memuat konter kayu, etalase kaca gorengan, tumpukan mie instan, termos, toples kerupuk,
 * kanopi terpal hijau-krem, neon box "WARKOP 24 JAM", 3 bohlam gantung, dan meja-bangku bakso.
 */
export const WarkopSet: React.FC<WorldSetProps> = ({
  lightId = 'noon',
  glowScale,
  bulbSwings,
  onUpdate,
  updateKey,
  ...rest
}) => {
  const autoGlow = glowScale ?? (lightId === 'noon' ? 0.9 : 1.35);

  const swingKey = bulbSwings ? bulbSwings.map((a) => a.toFixed(4)).join(',') : 'rest';
  const mergedUpdateKey = updateKey ? `${swingKey}|${updateKey}` : swingKey;
  const handleUpdate = (root: THREE.Group) => {
    for (let i = 0; i < 3; i++) {
      const px = LAMP_PIVOT_X[i];
      const a = bulbSwings ? bulbSwings[i] : 0;
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);
      for (const raw of WARKOP_LAMP_NODES[i]) {
        // GLTFLoader menyaring nama node (`PropertyBinding.sanitizeNodeName` membuang `.`), jadi
        // `WK_LampBulb_-1.35` dari Blender termuat sebagai `WK_LampBulb_-135`. Cari keduanya.
        const obj =
          root.getObjectByName(raw) ?? root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(raw));
        if (!obj) continue;
        let restPos = obj.userData.__restPos as THREE.Vector3 | undefined;
        if (!bulbSwings) {
          if (restPos) {
            obj.position.copy(restPos);
            obj.rotation.z = 0;
          }
          continue;
        }
        if (!restPos) {
          restPos = obj.position.clone();
          obj.userData.__restPos = restPos;
        }
        const L = LAMP_PIVOT_Y - restPos.y;
        obj.position.set(px + sinA * L, LAMP_PIVOT_Y - cosA * L, restPos.z);
        obj.rotation.z = a;
      }
    }
    onUpdate?.(root);
  };

  return (
    <GlbSet
      src="sets/warkop.glb"
      glowScale={autoGlow}
      onUpdate={handleUpdate}
      updateKey={mergedUpdateKey}
      {...rest}
    />
  );
};
