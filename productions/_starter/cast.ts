import type { ActorPose, CastPresetId, CharacterSpec, Vec3 } from '../../engine';
import { blinkLidAt, talkAt } from '../../engine';
import { FPS, SHOCK_FRAME } from './shots';
import { WORDS } from './words';

export type Actor = {
  id: string;
  preset: CastPresetId;
  overrides?: Partial<CharacterSpec>;
  base: Vec3;
  facing: number;
  height?: number;
};

/** Milik agent character-animator. Cetak biru langsung memakai Modular Rig 9 Karakter Indonesia di engine/cast/ (Pemeran Utama #1: Bolohoutoh alias Bang Utoh). */
export const ACTORS: Actor[] = [
  { id: 'a', preset: 'bangUtoh', base: [-1.0, 0, 0.15], facing: 0.35, height: 1.96 },
  { id: 'b', preset: 'rara', base: [1.02, 0, 0.15], facing: -0.35, height: 1.9 },
];

export function poseFor(actorId: string, frame: number): ActorPose {
  const actor = ACTORS.find((a) => a.id === actorId) ?? ACTORS[0];
  const seed = actorId === 'a' ? 1 : 2;
  const after = frame - SHOCK_FRAME;
  const shocked = actorId === 'a' && after >= 0 && after < 70;
  const speaking = actorId === 'a' && !shocked;

  return {
    face: shocked ? 'shock' : speaking ? 'happy' : 'neutral',
    blink: blinkLidAt(frame, seed, FPS, actorId === 'a' ? [SHOCK_FRAME] : []),
    talk: speaking ? talkAt(WORDS, frame, FPS) : 0,
    stance: 'stand',
    leftArm: shocked ? 'raise' : actorId === 'a' ? 'hip' : 'hold',
    rightArm: shocked ? 'raise' : actorId === 'a' ? 'hold' : 'hip',
    leftProp: actorId === 'b' ? 'mic' : 'none',
    rightProp: shocked ? 'none' : actorId === 'a' ? 'laptop' : 'none',
    lean: Math.sin(frame / 16 + seed) * 1.1,
    facing: actor.facing,
  };
}
