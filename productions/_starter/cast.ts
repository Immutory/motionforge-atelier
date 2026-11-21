import type { BeanLook, BeanPose, Vec3 } from '../../engine';
import { DEFAULT_LOOK } from '../../engine';
import { SHOCK_FRAME } from './shots';

export type Actor = { id: string; look: BeanLook; base: Vec3 };

/** Milik agent character-animator. Dua tokoh contoh, ganti dengan tokohmu sendiri. */
export const ACTORS: Actor[] = [
  { id: 'a', look: DEFAULT_LOOK, base: [-0.9, 0, 0] },
  { id: 'b', look: { ...DEFAULT_LOOK, outfit: '#4aa3a0', pants: '#5a3b4a' }, base: [0.9, 0, 0] },
];

/** Kedipan 4 frame dengan jeda berbeda per aktor, supaya tidak serempak. */
export const blinkAt = (frame: number, seed: number) => {
  const period = 52 + seed * 17;
  return frame % period < 4;
};

export function poseFor(actorId: string, frame: number): BeanPose {
  const seed = actorId === 'a' ? 1 : 2;
  const after = frame - SHOCK_FRAME;
  const shocked = actorId === 'a' && after >= 0 && after < 70;
  return {
    face: shocked ? 'shock' : 'neutral',
    blink: blinkAt(frame, seed),
    armsUp: shocked ? Math.min(1, after / 10) * 0.8 : 0,
    step: 0,
    lean: Math.sin(frame / 14 + seed) * 1.2,
  };
}
