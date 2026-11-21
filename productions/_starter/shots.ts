import { reactionFrame, type CamKey, type Kick, type Shot } from '../../engine';
import { WORDS } from './words';

export const FPS = 30;

/** Milik agent cinematographer. Semua waktu dalam frame pada 30 fps. */
export const SHOTS: Shot[] = [
  { id: 'wide-two', from: 0, to: 90, light: 'noon', note: 'Pembuka: dua karakter, dunia terbaca jelas' },
  { id: 'medium-react', from: 90, to: 160, light: 'amber', note: 'Reaksi karakter A, cahaya berubah hangat' },
  { id: 'macro-prop', from: 160, to: 220, light: 'amber', note: 'Insert prop dekat' },
];

export const CAMS: CamKey[] = [
  { frame: 0, pose: { pos: [0, 2.4, 9], look: [0, 1.1, 0], fov: 38, roll: 0 } },
  { frame: 90, cut: true, pose: { pos: [-1.2, 1.5, 3.6], look: [-0.9, 1.2, 0], fov: 34, roll: 3 } },
  { frame: 160, cut: true, pose: { pos: [0.6, 0.9, 2.2], look: [0.9, 0.7, 0], fov: 30, roll: -4 } },
];

/** Kata pukulan: indeks 5 ("mengejutkan") di words.json. Kick mendarat tepat di kata itu. */
export const PUNCH_WORD = 5;
export const SHOCK_FRAME = reactionFrame(WORDS, PUNCH_WORD, FPS, 0);
export const KICKS: Kick[] = [{ frame: SHOCK_FRAME, strength: 0.05 }];

/** Blur latar per shot (0 = tajam, 1 = penuh). Wide tajam, close-up dan insert berkabut. */
export const DOF: Record<string, number> = {
  'wide-two': 0,
  'medium-react': 0.6,
  'macro-prop': 1,
};
