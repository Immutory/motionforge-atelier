import { moveSettle, reactionFrame, storyDolly, type CamKey, type Kick, type Shot, type Vec3 } from '../../engine';
import { STARTER_SPOTS } from './set';
import { WORDS } from './words';

export const FPS = 30;

/**
 * Milik agent cinematographer (standar Atelier v3.0 — Reference Cinema Camera).
 * Semua waktu dalam frame pada 30 fps; hold dialog memakai `creepRate: 0` & `roll: 0` (nol slow zoom monoton).
 * Shot `medium-react` memakai sedikit high-angle (pitch > 12°) untuk mendemonstrasikan kompensasi `tiltX` 2,5D.
 */
export const SHOTS: Shot[] = [
  { id: 'wide-two', from: 0, to: 90, light: 'noon', note: 'Pembuka: Move -> Settle dua karakter 2,5D di Warkop 24 Jam' },
  { id: 'medium-react', from: 90, to: 160, light: 'amber', note: 'High-angle reaksi Bang Utoh (kompensasi tiltX + shadow) di golden hour' },
  { id: 'macro-prop', from: 160, to: 220, light: 'amber', note: 'Insert gelas 3D WK_TableCup1 di meja kiri Warkop (storyDolly -> settle)' },
];

export const CAMS: CamKey[] = [
  ...moveSettle(
    0,
    { pos: [0.15, 1.54, 4.45], look: [-0.06, 1.24, -0.35], fov: 42, roll: 0 },
    { pos: [-0.06, 1.52, 4.15], look: [-0.06, 1.24, -0.35], fov: 42, roll: 0 },
    24,
  ),
  {
    frame: 90,
    cut: true,
    creepRate: 0,
    // High-angle halus (pitch ~18° di atas mata) untuk mengaktifkan kompensasi tiltX anti-gepeng berporos telapak y = 0.
    pose: { pos: [-0.15, 2.3, 2.35], look: [-0.55, 1.32, -0.35], fov: 36, roll: 0 },
  },
  ...storyDolly(
    160,
    { pos: [-0.95, 1.15, 1.15], look: STARTER_SPOTS.tableProp, fov: 30, roll: 0 },
    { pos: [-1.05, 1.1, 0.98], look: STARTER_SPOTS.tableProp, fov: 28, roll: 0 },
    20,
    0,
    'dolly',
  ),
];

/** Kata pukulan: indeks 5 ("mengejutkan") di words.json (aman bila words.json dipersingkat / dikosongkan). */
export const PUNCH_WORD = 5;
const PUNCH_IDX = WORDS.length > 0 ? Math.min(PUNCH_WORD, WORDS.length - 1) : -1;
export const SHOCK_FRAME = PUNCH_IDX >= 0 ? reactionFrame(WORDS, PUNCH_IDX, FPS, 2) : 90;
export const KICKS: Kick[] = [{ frame: PUNCH_IDX >= 0 ? reactionFrame(WORDS, PUNCH_IDX, FPS, 0) : 90, strength: 0.04, length: 8 }];

/** Blur latar per shot (0 = tajam, 1 = penuh). Wide tajam, medium dan insert memakai thin-lens DOF. */
export const DOF: Record<string, number> = {
  'wide-two': 0,
  'medium-react': 0.65,
  'macro-prop': 0.95,
};

/** Titik fokus dunia (meter) per shot — dipakai `viewAxisFocus(pose.pos, pose.look, DOF_TARGET[shot.id])`. */
export const DOF_TARGET: Record<string, Vec3> = {
  'wide-two': [-0.06, 1.24, -0.35],
  'medium-react': [-0.55, 1.35, -0.35],
  'macro-prop': STARTER_SPOTS.tableProp,
};
