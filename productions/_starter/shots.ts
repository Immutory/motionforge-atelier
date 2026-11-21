import { reactionFrame, type CamKey, type Kick, type Shot } from '../../engine';
import { WORDS } from './words';

export const FPS = 30;

/** Milik agent cinematographer. Semua waktu dalam frame pada 30 fps. */
export const SHOTS: Shot[] = [
  { id: 'wide-two', from: 0, to: 90, light: 'noon', note: 'Pembuka: dua karakter, dunia dan langit terbaca jelas' },
  { id: 'medium-react', from: 90, to: 160, light: 'amber', note: 'Reaksi karakter A di golden hour, latar blur lembut' },
  { id: 'macro-prop', from: 160, to: 220, light: 'amber', note: 'Insert prop lentera kuningan di atas meja' },
];

export const CAMS: CamKey[] = [
  { frame: 0, pose: { pos: [0, 1.95, 7.2], look: [0, 1.5, -1.2], fov: 38, roll: 0 } },
  { frame: 90, cut: true, pose: { pos: [-1.15, 1.55, 3.1], look: [-0.95, 1.25, 0], fov: 34, roll: 2.5 } },
  { frame: 160, cut: true, pose: { pos: [0.32, 1.28, 0.35], look: [0.42, 1.0, -1.17], fov: 32, roll: -2 } },
];

/** Kata pukulan: indeks 5 ("mengejutkan") di words.json. Kick mendarat tepat di kata itu. */
export const PUNCH_WORD = 5;
export const SHOCK_FRAME = reactionFrame(WORDS, PUNCH_WORD, FPS, 0);
export const KICKS: Kick[] = [{ frame: SHOCK_FRAME, strength: 0.04 }];

/** Blur latar per shot (0 = tajam, 1 = penuh). Wide tajam, close-up dan insert berkabut thin-lens. */
export const DOF: Record<string, number> = {
  'wide-two': 0,
  'medium-react': 0.7,
  'macro-prop': 1.0,
};
