import React from 'react';
import type { Vec3 } from '../core/easing';
import { LIGHTS, type LightPreset } from '../stage/lights';
import { GlbSet, type GlbSetProps, type TimeOfDayMode } from './GlbSet';

export type KampungTimeMode = 'siang' | 'sore' | 'malam';

/** Preset pencahayaan siap pakai untuk 1 set `<KampungSet />` Kampung Rawa Sari RT 04. */
export const KAMPUNG_MODES: Record<
  KampungTimeMode,
  {
    light: LightPreset;
    timeOfDay: TimeOfDayMode;
    glowScale: number;
    streetLightIntensity: number;
    warkopLightIntensity: number;
  }
> = {
  siang: {
    light: LIGHTS.noon,
    timeOfDay: 'day',
    glowScale: 0.92,
    streetLightIntensity: 0,
    warkopLightIntensity: 0.4,
  },
  sore: {
    light: LIGHTS.amber,
    timeOfDay: 'golden',
    glowScale: 1.32,
    streetLightIntensity: 1.6,
    warkopLightIntensity: 2.2,
  },
  malam: {
    light: LIGHTS.night,
    timeOfDay: 'night',
    glowScale: 1.55,
    streetLightIntensity: 4.8,
    warkopLightIntensity: 5.5,
  },
};

export type KampungSetProps = Omit<GlbSetProps, 'src'> & {
  /** Mode suasana kampung: `'siang'` (Siang Cerah), `'sore'` (Golden Hour), atau `'malam'` (Malam Hari Hangat). */
  mode?: KampungTimeMode;
  /** Kompatibilitas dengan ID preset cahaya (`'noon'` | `'amber'` | `'dusk'` | `'night'` | `'neon'`). */
  lightId?: string;
};

/** Titik berdiri karakter (Vec3, Three.js Y-up) di Kampung Rawa Sari RT 04 (`<KampungSet />`, 160m × 140m):
 *  Menggabungkan Rumah Kos Bang Utoh (`x=-12.2m`), Warkop Ngoding 24 Jam (`x=0m`), Gedung Kampus S1 TI (`x=+12.6m`),
 *  Masjid Al-Khawarizmi (`x=-23.0m`), Gapura Kampung Rawa Sari RT 04 (`x=-17.5m`), Ruko, dan Lapangan Olahraga.
 */
export const KAMPUNG_SPOTS = {
  /** Di tengah jalan aspal depan Warkop Ngoding 24 Jam */
  streetCenter: [0.0, 0, 6.5] as Vec3,
  /** Di bawah Gapura Kampung Rawa Sari RT 04 (sisi barat jalan) */
  gapuraEntrance: [-17.5, 0, 6.5] as Vec3,
  /** Di depan teras Kos Putra Rawa Sari 2 Lantai */
  kostTerrace: [-12.2, 0.14, 2.75] as Vec3,
  /** Tepat di depan pintu Kamar 01 Bang Utoh (Lantai 1 Kos Putra Rawa Sari) */
  kostDoor01: [-14.85, 0.14, 2.55] as Vec3,
  /** Tepat di depan pintu Kamar 02 (Lantai 1 Kos Putra Rawa Sari) */
  kostDoor02: [-11.05, 0.14, 2.55] as Vec3,
  /** Di gerbang depan Kos Putra Rawa Sari menuju jalan kampung */
  kostGate: [-12.2, 0, 4.05] as Vec3,
  /** Di balkon Lantai 2 Kos Putra Rawa Sari (depan kamar 03–05) */
  kostBalcony2: [-12.2, 3.48, 2.72] as Vec3,
  /** Di dalam Kamar Kos Bang Utoh (depan meja dual-monitor) */
  kostDesk: [-12.2, 0, -0.3] as Vec3,
  /** Di depan meja panjang Warkop 24 Jam */
  warkopFront: [-1.2, 0, 1.35] as Vec3,
  /** Di depan etalase gorengan Warkop 24 Jam */
  warkopCounter: [0.85, 0, 0.35] as Vec3,
  /** Di atas atap kanopi kiri Warkop 24 Jam (spot kucing tidur/duduk di sebelah papan neon) */
  warkopCanopyLeft: [-2.14, 2.8, -0.3] as Vec3,
  /** Di atas atap kanopi kanan Warkop 24 Jam (spot kucing duduk di sebelah papan neon) */
  warkopCanopyRight: [2.14, 2.8, -0.3] as Vec3,
  /** Di halaman depan Gedung Kampus S1 Teknik Informatika (dekat tiang bendera) */
  kampusPlaza: [12.6, 0, 3.2] as Vec3,
  /** Di dalam Lab Komputer Kampus S1 TI */
  kampusLab: [12.6, 0, 0.5] as Vec3,
  /** Di depan Booth ATM & Plaza Masjid / Minimarket 24 Jam (Ruko Barat) */
  atmMinimarket: [-28.15, 0, 3.2] as Vec3,
  /** Di Area Pedagang Rawa Sari (dekat Gerobak Bakmie Ayam Tio, Es Buah Mbak Yuni & Meja Payung) */
  areaPedagang: [-11.75, 0.04, 15.65] as Vec3,
  /** Di dekat Gerobak Bakmie Ayam Tio (alias kompatibilitas `gerobakNasgor`) */
  gerobakNasgor: [-13.45, 0.04, 17.65] as Vec3,
  /** Di belakang sisi kompor & dandang gerobak Bakmie Ayam Tio (posisi Tio memasak & melayani tanpa terhalang etalase) */
  bakmieTioVendor: [-13.02, 0.04, 18.38] as Vec3,
  /** Di depan gerobak Bakmie Ayam Tio (posisi pembeli memesan) */
  bakmieTioCustomer: [-12.55, 0.04, 16.65] as Vec3,
  /** Di belakang sisi mesin serut es gerobak Es Buah & Campur Mbak Yuni (posisi Mbak Yuni melayani tanpa terhalang etalase) */
  esBuahYuniVendor: [-9.62, 0.04, 18.38] as Vec3,
  /** Di depan gerobak Es Buah & Campur Mbak Yuni (posisi pembeli memesan) */
  esBuahYuniCustomer: [-10.95, 0.04, 16.65] as Vec3,
  /** Di Tempat Khusus Parkir Motor berkanopi (10 Motor Bebek) */
  parkirMotor: [12.9, 0, 15.0] as Vec3,
  /** Di depan Pos Ronda RT 04 (Taman Seberang Jalan) */
  posRonda: [-12.8, 0, 11.0] as Vec3,
  /** Titik jaga & patroli Pak Ujang (Satpam Kampung) di sisi timur Pos Ronda RT 04, jelas & tidak menghalangi jalan */
  pakUjangPatrol: [-10.85, 0, 11.4] as Vec3,
  /** Di tengah Lapangan Basket / Futsal Mini Kampung (Taman Seberang Jalan) */
  lapanganBasket: [0.0, 0, 15.6] as Vec3,
  /** Di Halte Bus Kampus & Gerobak Bakso (Sisi Timur Kampus) */
  halteKampus: [19.8, 0, 3.3] as Vec3,
  /** Di Pos Satpam & Palang Parkir Gerbang Kampus */
  posSatpam: [19.5, 0, 0.2] as Vec3,
} as const;

function resolveMode(mode?: KampungTimeMode, lightId?: string): KampungTimeMode {
  if (mode) return mode;
  if (lightId === 'noon') return 'siang';
  if (lightId === 'amber') return 'sore';
  if (lightId === 'night' || lightId === 'dusk' || lightId === 'neon') return 'malam';
  return 'sore';
}

/**
 * Dunia 3D Terpadu `<KampungSet />` — **Kampung Rawa Sari RT 04** (`public/sets/kampung.glb`, `160m × 140m`):
 * - Mendukung **3 mode pencahayaan penuh**: `mode="siang"` (Siang Cerah), `mode="sore"` (Golden Hour), & `mode="malam"` (Malam Hangat).
 * - Saat `sore` dan `malam`, lampu jalan, traffic light, lampu Warkop, neon sign, & jendela gedung otomatis menyala hangat
 *   dilengkapi *point light pools* yang menerangi jalan aspal, gerobak kaki lima, dan karakter 2D.
 */
export const KampungSet: React.FC<KampungSetProps> = ({
  mode,
  lightId,
  glowScale,
  timeOfDay,
  ...rest
}) => {
  const resolved = resolveMode(mode, lightId);
  const preset = KAMPUNG_MODES[resolved];
  const activeTime = timeOfDay ?? preset.timeOfDay;
  const activeGlow = glowScale ?? preset.glowScale;

  // Koordinat Three.js (Y = tinggi, Z = -BlenderY) untuk lampu praktis saat Golden Hour & Malam
  const streetLampPositions: Vec3[] = [
    [-30, 5.2, 4.4],
    [-20, 5.2, 4.4],
    [-10, 5.2, 4.4],
    [0, 5.2, 4.4],
    [10, 5.2, 4.4],
    [20, 5.2, 4.4],
  ];

  return (
    <group name="KampungRawaSariRoot">
      <GlbSet src="sets/kampung.glb" glowScale={activeGlow} timeOfDay={activeTime} {...rest} />

      {/* Lampu Jalan Hangat (Sodium-Gold) menyala saat Sore & Malam */}
      {preset.streetLightIntensity > 0 &&
        streetLampPositions.map((pos, idx) => (
          <pointLight
            key={`street-lamp-${idx}`}
            position={pos}
            color={resolved === 'malam' ? '#ffbe62' : '#ffcf7d'}
            intensity={preset.streetLightIntensity}
            distance={18}
            decay={1.6}
          />
        ))}

      {/* Lampu Hangat Teras Warkop 24 Jam, Kos Putra Rawa Sari Lantai 1 & 2, Gapura Rawa Sari & Pos Ronda */}
      {preset.warkopLightIntensity > 0 && (
        <>
          <pointLight position={[0, 2.8, 1.4]} color="#ffd27d" intensity={preset.warkopLightIntensity} distance={14} decay={1.5} />
          <pointLight position={[-12.2, 2.7, 2.5]} color="#ffcb7a" intensity={preset.warkopLightIntensity * 0.85} distance={12} decay={1.6} />
          <pointLight position={[-12.2, 5.8, 2.85]} color="#ffcf82" intensity={preset.warkopLightIntensity * 0.72} distance={12} decay={1.6} />
          <pointLight position={[-17.5, 4.4, 6.45]} color="#ffbe6a" intensity={preset.warkopLightIntensity * 0.7} distance={13} decay={1.6} />
          <pointLight position={[-12.8, 2.2, 12.4]} color="#ffd588" intensity={preset.warkopLightIntensity * 0.75} distance={11} decay={1.6} />
          {/* Lampu Hangat Gerobak Bakmie Ayam Tio & Es Buah Mbak Yuni di Area Pedagang Rawa Sari */}
          <pointLight position={[-13.45, 1.9, 17.55]} color="#ffd480" intensity={preset.warkopLightIntensity * 0.72} distance={8} decay={1.6} />
          <pointLight position={[-10.05, 1.9, 17.55]} color="#ffebc2" intensity={preset.warkopLightIntensity * 0.72} distance={8} decay={1.6} />
        </>
      )}
    </group>
  );
};
