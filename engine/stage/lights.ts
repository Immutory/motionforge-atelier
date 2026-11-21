import type { Vec3 } from '../core/easing';

export type LightPreset = {
  id: string;
  sky: { top: string; horizon: string };
  fog: { color: string; near: number; far: number };
  key: { color: string; intensity: number; azimuth: number; elevation: number };
  fill: { color: string; intensity: number };
  ambient: { color: string; intensity: number };
};

/** Empat preset awal. Nilai ini titik mulai, bukan hukum. Tuning-nya milik agent light-colorist. */
export const LIGHTS: Record<'noon' | 'amber' | 'dusk' | 'neon', LightPreset> = {
  noon: {
    id: 'noon',
    sky: { top: '#4a86d8', horizon: '#bcd3ee' },
    fog: { color: '#bcd3ee', near: 30, far: 280 },
    key: { color: '#fff1d6', intensity: 2.2, azimuth: 70, elevation: 50 },
    fill: { color: '#7fa2d6', intensity: 0.55 },
    ambient: { color: '#9db8e0', intensity: 0.55 },
  },
  amber: {
    id: 'amber',
    sky: { top: '#f4b36a', horizon: '#ffd9a0' },
    fog: { color: '#f6cf9c', near: 22, far: 240 },
    key: { color: '#ffb36b', intensity: 2.4, azimuth: 8, elevation: 10 },
    fill: { color: '#6e6bb0', intensity: 0.7 },
    ambient: { color: '#8a78a8', intensity: 0.5 },
  },
  dusk: {
    id: 'dusk',
    sky: { top: '#2b2a5c', horizon: '#c9708f' },
    fog: { color: '#7a5a86', near: 18, far: 200 },
    key: { color: '#ff9fb0', intensity: 1.5, azimuth: 120, elevation: 6 },
    fill: { color: '#4a58a8', intensity: 0.8 },
    ambient: { color: '#5a4f96', intensity: 0.5 },
  },
  neon: {
    id: 'neon',
    sky: { top: '#0b0f2a', horizon: '#26104a' },
    fog: { color: '#1a0f3a', near: 12, far: 120 },
    key: { color: '#6cf0ff', intensity: 1.2, azimuth: 40, elevation: 30 },
    fill: { color: '#ff4fd8', intensity: 1.0 },
    ambient: { color: '#3a2a7a', intensity: 0.45 },
  },
};

export const sunPosition = (azimuthDeg: number, elevationDeg: number, dist = 60): Vec3 => {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist];
};
