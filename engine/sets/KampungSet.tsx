import React from 'react';
import type { Vec3 } from '../core/easing';
import { LIGHTS, type LightPreset } from '../stage/lights';
import { GlbSet, type GlbSetProps, type TimeOfDayMode } from './GlbSet';
import type { SpotMeta } from './WarkopSet';

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

/** Titik berdiri karakter (Vec3, Three.js Y-up) di Kampung Rawa Sari RT 04 v2 (`<KampungSet />`, 264m × 220m):
 *  Rumah Kos Bang Utoh (`x=-12.2m`), Warkop Ngoding 24 Jam (`x=0m`), Gedung Kampus FIK 3 lantai (`x=7..22.8m`),
 *  Masjid Al-Khawarizmi (`x=-23.0m`), Gapura (`x=-17.5m`), Ruko, Lapangan, Kompleks SD + SMA (`x=90..128m`),
 *  serta sisi barat: kali, bengkel, warung kelontong, rumah warga, musala (`x<-86m`).
 *  Denah lengkap: `assets/sets/ZONING_KAMPUNG_V2.md`. Lantai kampus: y = 0.15 / 4.15 / 8.15, sekolah: 0.15 / 3.75 / 7.35.
 */
export const KAMPUNG_SPOTS = {
  /** Di tengah jalan aspal depan Warkop Ngoding 24 Jam */
  streetCenter: [0.0, 0, 6.5] as Vec3,
  /** Di bawah Gapura Kampung Rawa Sari RT 04 (sisi barat jalan) */
  gapuraEntrance: [-17.5, 0, 6.5] as Vec3,
  /** Di depan teras Kos Putra Rawa Sari 2 Lantai */
  kostTerrace: [-12.43, 0.13, 2.65] as Vec3,
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
  /** Di dalam Lab Komputer Gedung FIK (lantai 2, lorong tengah); sama dengan `kampusLab2` */
  kampusLab: [19.4, 4.15, -9.0] as Vec3,
  /** Lobi Gedung FIK lantai 1 (depan meja resepsionis) */
  kampusLobby: [12.75, 0.15, -5.0] as Vec3,
  /** Kelas 2A Gedung FIK (lantai 2, antara kursi kuliah dan papan tulis) */
  kampusKelas2A: [12.75, 4.15, -6.8] as Vec3,
  /** Lab Komputer Gedung FIK lantai 2 (lorong tengah) */
  kampusLab2: [19.4, 4.15, -9.0] as Vec3,
  /** Lab Jaringan/Server Gedung FIK lantai 3 */
  kampusLab3: [19.4, 8.15, -8.5] as Vec3,
  /** Ruang Dosen Gedung FIK lantai 3 */
  kampusRuangDosen: [12.75, 8.15, -5.0] as Vec3,
  /** Selasar terbuka depan Gedung FIK lantai 2 */
  kampusSelasar2: [14.5, 4.15, -1.5] as Vec3,
  /** Selasar terbuka depan Gedung FIK lantai 3 */
  kampusSelasar3: [14.5, 8.15, -1.5] as Vec3,
  /** Di depan Booth ATM & Plaza Masjid / Minimarket 24 Jam (Ruko Barat) */
  atmMinimarket: [-28.15, 0, 3.2] as Vec3,
  /** Di Area Pedagang Rawa Sari (dekat Gerobak Bakmie Ayam Tio, Es Buah Mbak Yuni & Meja Payung) */
  areaPedagang: [-11.46, 0.04, 16.34] as Vec3,
  /** Di dekat Gerobak Bakmie Ayam Tio (alias kompatibilitas `gerobakNasgor`) */
  gerobakNasgor: [-13.16, 0.04, 18.34] as Vec3,
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
  posRonda: [-12.98, 0, 10.82] as Vec3,
  /** Titik jaga & patroli Pak Ujang (Satpam Kampung) di sisi timur Pos Ronda RT 04, jelas & tidak menghalangi jalan */
  pakUjangPatrol: [-10.85, 0, 11.4] as Vec3,
  /** Di tengah Lapangan Basket / Futsal Mini Kampung (Taman Seberang Jalan) */
  lapanganBasket: [0.0, 0, 15.6] as Vec3,
  /** Di atas peron Halte Bus Kampus (trotoar depan plaza FIK, sisi timur), di depan bangku */
  halteKampus: [19.8, 0.16, 3.3] as Vec3,
  /** Di sisi timur Pos Satpam kampus (plaza FIK), antara pos dan tiang bendera */
  posSatpam: [19.15, 0.08, 0.75] as Vec3,
  /** Gerbang bersama Kompleks SD + SMA Rawa Sari */
  sekolahGerbang: [109.0, 0.1, 2.5] as Vec3,
  /** Tengah lapangan upacara sekolah (depan tiang bendera) */
  lapanganUpacara: [109.0, 0.05, -7.0] as Vec3,
  /** Kelas 1 SD (lantai 1, antara meja murid dan papan tulis) */
  sdKelas1: [95.25, 0.15, -25.2] as Vec3,
  /** Kelas X-1 SMA (lantai 1, antara meja murid dan papan tulis) */
  smaKelas1: [111.9, 0.15, -25.2] as Vec3,
  /** Lab IPA SMA (lantai 2) */
  smaLabIpa: [117.3, 3.75, -26.0] as Vec3,
  /** Kantin sekolah (belakang gedung, sisi SD) */
  kantinSekolah: [94.2, 0.1, -29.6] as Vec3,
  /** Pertigaan Jl. Rawa Sari Raya × Jl. Pendidikan (traffic light) */
  pertigaanPendidikan: [86.8, 0, 6.5] as Vec3,
  /** Tengah Jl. Kampung 2 (jalan sejajar di utara) */
  jalanKampung2: [0.0, 0, -17.5] as Vec3,
  /** Di atas jembatan kecil kali (Jl. Kampung 2) */
  jembatanKali: [-98.5, 0, -17.5] as Vec3,
  /** Gang Gapura (penghubung jalan utama ke Jl. Kampung 2) */
  gangGapura: [-18.15, 0.03, -8.0] as Vec3,
  /** Gang Timur (sisi timur Gedung FIK) */
  gangTimur: [25.5, 0.03, -8.0] as Vec3,
  /** Depan Bengkel Motor Jaya (trotoar utara) */
  bengkelMotor: [-91.0, 0.1, 3.0] as Vec3,
  /** Depan Warung Kelontong Bu Sri (trotoar selatan) */
  warungKelontong: [-92.0, 0.1, 10.4] as Vec3,
  /** Depan pagar rumah warga sisi barat kali (trotoar utara) */
  rumahWargaBarat: [-118.0, 0.1, 2.8] as Vec3,
  /** Jalan setapak taman depan Musala Al-Ikhlas */
  musalaTaman: [-113.3, 0.08, -23.0] as Vec3,
} as const;

/** Metadata spasial & ergonomi spot kunci Kampung Rawa Sari RT 04 (v2.0). */
export const KAMPUNG_SPOT_META: Partial<Record<keyof typeof KAMPUNG_SPOTS, SpotMeta>> = {
  warkopCounter: {
    counterTopY: 1.04,
    ergonomicBaseY: 0.44,
    note: 'Konter luar Warkop di dunia Kampung; gunakan ergonomicBaseY saat penjaga berdiri di balik konter.',
  },
  bakmieTioVendor: {
    counterTopY: 0.92,
    ergonomicBaseY: 0.34,
    note: 'Sisi dandang gerobak Bakmie Tio (bebas etalase); cek checkCounterVisibility jika berdiri di balik gerobak.',
  },
  esBuahYuniVendor: {
    counterTopY: 0.92,
    ergonomicBaseY: 0.34,
    note: 'Sisi mesin serut gerobak Es Buah Mbak Yuni.',
  },
  halteKampus: {
    seatY: 0.45,
    note: 'Peron halte bus kampus depan plaza FIK (bangku tunggu seatY ≈ 0,45 m).',
  },
};

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
          {/* v2: kanopi lobi Gedung FIK, gerbang sekolah, bengkel, dan warung kelontong */}
          <pointLight position={[12.85, 3.0, 0.6]} color="#e8f1ff" intensity={preset.warkopLightIntensity * 0.6} distance={12} decay={1.6} />
          <pointLight position={[109.0, 4.0, 3.2]} color="#ffd27d" intensity={preset.warkopLightIntensity * 0.6} distance={14} decay={1.6} />
          <pointLight position={[-91.0, 3.6, 0.5]} color="#fff1d0" intensity={preset.warkopLightIntensity * 0.65} distance={12} decay={1.6} />
          <pointLight position={[-92.0, 2.8, 12.6]} color="#ffd88c" intensity={preset.warkopLightIntensity * 0.6} distance={10} decay={1.6} />
        </>
      )}
    </group>
  );
};
