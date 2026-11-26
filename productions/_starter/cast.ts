import type { ActorPose, CastPresetId, CharacterSpec, Vec3 } from '../../engine';
import { blinkLidAt, resolve25DView, talkGated } from '../../engine';
import { STARTER_SPOTS } from './set';
import { FPS, SHOCK_FRAME } from './shots';
import { NONVERBAL, rmsAt, wordsOf, type VoiceSpeaker } from './words';

export type Actor = {
  id: VoiceSpeaker;
  preset: CastPresetId;
  overrides?: Partial<CharacterSpec>;
  base: Vec3;
  /** Arah hadap dunia (derajat, 0 = +Z, +90 = +X) untuk `resolve25DView`. */
  worldYaw: number;
  facing: number;
  height?: number;
  /** Opsional: radius setengah sisi kursi bila duduk (`seatRadius` anti-tembus kursi). */
  seatRadius?: number;
};

/**
 * Milik agent character-animator (standar Atelier v3.0 — 2.5D Reference Edition).
 * Memakai Modular Rig 13 Karakter Indonesia (`CAST_PRESETS` termasuk `ebot`) + 3 Kucing 2D (`CAT_PRESETS`),
 * 1 siluet vektor utuh bervolume 2,5D (spherical face parallax, 8-arah via `resolve25DView`, interaksi prop 3D
 * via `actorHandWorldPos`, kedip 4-frame `blinkLidAt`, dan lip-sync RMS-gated `talkGated`).
 */
export const ACTORS: Actor[] = [
  { id: 'bangUtoh', preset: 'bangUtoh', base: STARTER_SPOTS.utoh, worldYaw: 25, facing: 0.35, height: 1.96 },
  { id: 'rara', preset: 'rara', base: STARTER_SPOTS.rara, worldYaw: -25, facing: -0.35, height: 1.88 },
];

const UTOH_WORDS = wordsOf('bangUtoh');
const RARA_WORDS = wordsOf('rara');

export function poseFor(actorId: VoiceSpeaker, frame: number, camPos?: Vec3): ActorPose {
  const actor = ACTORS.find((a) => a.id === actorId) ?? ACTORS[0];
  const seed = actorId === 'bangUtoh' ? 1 : 2;
  const after = frame - SHOCK_FRAME;
  const shocked = actorId === 'bangUtoh' && after >= 0 && after < 70;
  const speakerWords = actorId === 'bangUtoh' ? UTOH_WORDS : RARA_WORDS;
  const talk = shocked
    ? 0
    : talkGated(speakerWords, frame, {
        fps: FPS,
        rms: (f) => rmsAt(actorId, f, FPS),
        events: NONVERBAL.filter((e) => e.speaker === actorId),
      });
  const isSpeaking = typeof talk !== 'number' && talk.open > 0;
  const v25 = camPos ? resolve25DView(actor.base, actor.worldYaw, camPos) : null;

  return {
    face: shocked ? 'shock' : isSpeaking ? 'happy' : 'neutral',
    blink: blinkLidAt(frame, seed, FPS, actorId === 'bangUtoh' ? [SHOCK_FRAME] : []),
    talk,
    stance: 'stand',
    view: v25?.view ?? 'threeQuarter',
    // Tangan kanan Bang Utoh memegang prop 3D cangkir kopi via `actorHandWorldPos` (tanpa prop 2D ganda!)
    leftArm: shocked ? 'raise' : isSpeaking ? 'hip' : 'rest',
    rightArm: shocked ? 'raise' : actorId === 'bangUtoh' ? 'hold' : isSpeaking ? 'point' : 'rest',
    leftProp: 'none',
    rightProp: 'none',
    lean: isSpeaking ? Math.sin(frame / 14 + seed) * 1.4 : 0,
    headTilt: shocked ? -5 : isSpeaking ? Math.sin(frame / 18 + seed) * 2 : 0,
    facing: v25?.facing ?? actor.facing,
  };
}
