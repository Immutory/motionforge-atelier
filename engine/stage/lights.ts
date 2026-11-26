import type { Vec3 } from '../core/easing';

export type ToneConfig = {
  /** Pengali linear RGB untuk sisi terkena matahari. */
  lit: Vec3;
  /** Pengali linear RGB untuk sisi bayangan (siang tetap jenuh, sunset violet-biru). */
  shade: Vec3;
  /** Tambahan cahaya angkat di area bayangan agar warna gelap tidak hancur ke hitam. */
  lift: Vec3;
  /** Porsi cosine modeling N·L di sisi terang (0 = flat cel, 1 = full Lambert). */
  lambert: number;
  /** Faktor sisi vertikal vs hadap atas (up-facing sedikit lebih terang). */
  sideK: number;
  /** Lebar terminator N·L menuju penuh terang. */
  term: number;
  /** Bobot kontribusi cahaya lokal (`<pointLight>`/`<spotLight>`) dengan Reinhard soft-clamp (default `1.0`). */
  localLight?: number;
};

export type CardLightConfig = {
  /** Tint warna cahaya scene pada billboard karakter (linear RGB). */
  tint: Vec3;
  /** Lantai kecerahan saat karakter masuk bayangan cast shadow (0.82-0.90). */
  shadeFloor: number;
  /** Gradasi gelap di sisi bayangan kepala. */
  headGrad: number;
  /** Gradasi gelap di sisi bayangan torso. */
  bodyGrad: number;
  /** Tint sisi bayangan karakter (biasanya lavender halus). */
  sideTint: Vec3;
  /** Warna multiply blob bayangan di lantai bawah kaki karakter. */
  blob: Vec3;
  /** true = kartu melempar bayangan panjang (cocok untuk golden/sunset). */
  castShadow: boolean;
};

export type LightPreset = {
  id: string;
  sky: {
    top: string;
    horizon: string;
    /** 4 stop warna langit dari horizon (0°) ke zenit (derajat di `elevations`). */
    stops: [string, string, string, string];
    elevations: [number, number, number];
  };
  fog: { color: string; near: number; far: number };
  key: { color: string; intensity: number; azimuth: number; elevation: number; cameraRelative?: boolean };
  fill: { color: string; intensity: number };
  ambient: { color: string; intensity: number };
  tone: ToneConfig;
  card: CardLightConfig;
  shadow: { bias: number; normalBias: number; range: number; radius?: number };
  /** Warna cakram matahari emissive (opsional, untuk golden/sunset). */
  sunDisc?: string;
};

/**
 * Lima preset cahaya yang dikalibrasi untuk produksi animasi 2.5D:
 * `noon` (Siang Cerah), `amber` (Sore / Golden Hour), `dusk` (Senja), `night` (Malam Kampung Hangat), & `neon`.
 */
export const LIGHTS: Record<'noon' | 'amber' | 'dusk' | 'night' | 'neon', LightPreset> = {
  noon: {
    id: 'noon',
    sky: {
      top: '#2a7fe6',
      horizon: '#d8ecf7',
      stops: ['#d8ecf7', '#8ccbf8', '#4aa3f2', '#2a7fe6'],
      elevations: [3, 12, 30],
    },
    fog: { color: '#c4ddf4', near: 25, far: 420 },
    key: { color: '#fff3e0', intensity: 2.3, azimuth: 52, elevation: 48 },
    fill: { color: '#8ab0e6', intensity: 0.45 },
    ambient: { color: '#b8d0ee', intensity: 0.65 },
    tone: {
      lit: [1.42, 1.36, 1.26],
      shade: [0.76, 0.7, 0.84],
      lift: [0.01, 0.01, 0.02],
      lambert: 0.46,
      sideK: 0.85,
      term: 0.3,
    },
    card: {
      tint: [1.02, 0.99, 0.97],
      shadeFloor: 0.88,
      headGrad: 0.06,
      bodyGrad: 0.16,
      sideTint: [0.92, 0.9, 0.96],
      blob: [0.6, 0.56, 0.62],
      castShadow: true,
    },
    shadow: { bias: -0.0003, normalBias: 0.018, range: 16, radius: 3.0 },
  },
  amber: {
    id: 'amber',
    sky: {
      top: '#8c78c4',
      horizon: '#ffd08a',
      stops: ['#ffd08a', '#ffad7e', '#e9849a', '#8c78c4'],
      elevations: [4, 14, 32],
    },
    fog: { color: '#f4c68c', near: 20, far: 360 },
    // Backlight hangat dari kanan-belakang (cameraRelative az 18°, el 14°) -> bayangan panjang violet ke arah kamera.
    key: { color: '#ffab5e', intensity: 3.4, azimuth: 18, elevation: 14, cameraRelative: true },
    fill: { color: '#6e6bb0', intensity: 0.55 },
    ambient: { color: '#9c86b8', intensity: 0.55 },
    tone: {
      lit: [1.44, 0.9, 0.6],
      shade: [0.24, 0.26, 0.66],
      lift: [0.04, 0.032, 0.08],
      lambert: 0.35,
      sideK: 0.82,
      term: 0.1,
    },
    card: {
      tint: [1.04, 0.92, 0.82],
      shadeFloor: 0.88,
      headGrad: 0.08,
      bodyGrad: 0.2,
      sideTint: [0.84, 0.78, 0.96],
      blob: [0.54, 0.5, 0.72],
      castShadow: true,
    },
    shadow: { bias: -0.0006, normalBias: 0.03, range: 18, radius: 3.0 },
    sunDisc: '#ffd9a0',
  },
  dusk: {
    id: 'dusk',
    sky: {
      top: '#201e4a',
      horizon: '#d9849a',
      stops: ['#d9849a', '#9a5a8e', '#4d3b7a', '#201e4a'],
      elevations: [5, 16, 36],
    },
    fog: { color: '#8a5c88', near: 18, far: 260 },
    key: { color: '#ff9fb0', intensity: 2.0, azimuth: 32, elevation: 12, cameraRelative: true },
    fill: { color: '#4a58a8', intensity: 0.7 },
    ambient: { color: '#5a4f96', intensity: 0.55 },
    tone: {
      lit: [1.26, 0.82, 0.9],
      shade: [0.26, 0.28, 0.62],
      lift: [0.03, 0.025, 0.06],
      lambert: 0.35,
      sideK: 0.8,
      term: 0.14,
    },
    card: {
      tint: [0.98, 0.88, 0.96],
      shadeFloor: 0.86,
      headGrad: 0.09,
      bodyGrad: 0.22,
      sideTint: [0.76, 0.72, 0.96],
      blob: [0.48, 0.44, 0.66],
      castShadow: true,
    },
    shadow: { bias: -0.0005, normalBias: 0.025, range: 18, radius: 3.0 },
  },
  night: {
    id: 'night',
    sky: {
      top: '#060a18',
      horizon: '#1a274c',
      stops: ['#1a274c', '#131d3d', '#0b122b', '#060a18'],
      elevations: [5, 16, 38],
    },
    fog: { color: '#121c38', near: 18, far: 210 },
    // Moonlight biru-perak lembut dari atas-belakang + ambient gelap agar lampu jalan & Warkop menyala kontras.
    key: { color: '#8ab4f8', intensity: 1.15, azimuth: 38, elevation: 34 },
    fill: { color: '#ffae5c', intensity: 0.55 },
    ambient: { color: '#263664', intensity: 0.42 },
    tone: {
      lit: [0.68, 0.78, 1.05],
      shade: [0.16, 0.2, 0.38],
      lift: [0.02, 0.024, 0.048],
      lambert: 0.42,
      sideK: 0.78,
      term: 0.16,
    },
    card: {
      tint: [0.88, 0.9, 1.02],
      shadeFloor: 0.82,
      headGrad: 0.1,
      bodyGrad: 0.24,
      sideTint: [0.64, 0.7, 0.96],
      blob: [0.32, 0.34, 0.52],
      castShadow: false,
    },
    shadow: { bias: -0.0004, normalBias: 0.022, range: 18, radius: 2.8 },
  },
  neon: {
    id: 'neon',
    sky: {
      top: '#080a22',
      horizon: '#2d145c',
      stops: ['#2d145c', '#1f0e46', '#120b34', '#080a22'],
      elevations: [5, 16, 35],
    },
    fog: { color: '#1a0f3a', near: 12, far: 140 },
    key: { color: '#6cf0ff', intensity: 1.8, azimuth: 45, elevation: 32 },
    fill: { color: '#ff4fd8', intensity: 0.9 },
    ambient: { color: '#3a2a7a', intensity: 0.5 },
    tone: {
      lit: [0.88, 1.32, 1.48],
      shade: [0.36, 0.2, 0.56],
      lift: [0.025, 0.015, 0.055],
      lambert: 0.4,
      sideK: 0.78,
      term: 0.15,
    },
    card: {
      tint: [0.9, 0.96, 1.04],
      shadeFloor: 0.84,
      headGrad: 0.1,
      bodyGrad: 0.24,
      sideTint: [0.75, 0.65, 0.98],
      blob: [0.42, 0.36, 0.62],
      castShadow: false,
    },
    shadow: { bias: -0.0004, normalBias: 0.02, range: 14, radius: 2.8 },
  },
};

export const sunPosition = (azimuthDeg: number, elevationDeg: number, dist = 60): Vec3 => {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist];
};

/**
 * Hitung posisi matahari relatif terhadap arah pandang kamera:
 * az = 0° (lurus di depan kamera / backlight), +90° (sisi kanan layar), 180° (di belakang kamera).
 */
export function cameraRelativeSun(
  camPos: Vec3,
  camLook: Vec3,
  azimuthDeg: number,
  elevationDeg: number,
  dist = 60,
): Vec3 {
  let fx = camLook[0] - camPos[0];
  let fz = camLook[2] - camPos[2];
  const len = Math.hypot(fx, fz) || 1;
  fx /= len;
  fz /= len;
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  // Di Three.js kanan layar di bidang XZ adalah (-fz, fx).
  const hx = fx * Math.cos(az) - fz * Math.sin(az);
  const hz = fz * Math.cos(az) + fx * Math.sin(az);
  const c = Math.cos(el);
  return [camLook[0] + hx * c * dist, Math.sin(el) * dist, camLook[2] + hz * c * dist];
}
