import {
  blinkLidAt,
  clamp,
  computeWalkState,
  lerp3,
  resolve25DView,
  smootherstep,
  springPop,
  strikeEnvelope,
  talkGated,
  type ActorPose,
  type CastPresetId,
  type CatPose,
  type CharacterSpec,
  type Expression,
  type TalkEvent,
  type TalkSample,
  type Vec3,
} from '../../engine';
import { EP05_SPOTS, KARDUS_BELANG_HALF, seatCardPos, type SetState, type TallyMode } from './set';
import { EP05_FRAMES, NONVERBAL, lineById, rmsAt, wordFrame, wordsOf, type VoiceSpeaker } from './words';

/**
 * Milik agent character-animator (Atelier v3.5). EP05 "Parkir Gratis 0 Rupiah, Tapi Keluarnya Bayar 10 Ribu?!"
 * - Menggunakan resolve25DView (8-arah smooth turn termasuk backThreeQuarter) & computeWalkState (2-Bone Leg IK + gait: 'planted').
 * - Utoh berjalan presentasi (B2), inspeksi korban (B3/B4), victory strut (B5), dan kembali ke pose f0 untuk loop mulus.
 * - Ebot condong menulis papan kapur & melangkah menghadang Bang Udin.
 * - Bang Udin & Raka diparkir miring 3/4 di atas motor 3D dengan foot-drop comedy (sitHeight 0,58 -> 0,45) pada setiap tapak.
 * - Pak Budi turun dari motor lalu mendorong mundur dengan kedua tangan di setang & langkah planted.
 */
export const FPS = 30;
export const BREATH_PERIOD = 90;

export type Ep05HumanId = 'bangUtoh' | 'ebot' | 'bangUdin' | 'raka' | 'pakBudi';
export type Ep05Actor = { id: Ep05HumanId; preset: CastPresetId; overrides?: Partial<CharacterSpec>; height: number };

export const ACTORS: Ep05Actor[] = [
  { id: 'bangUtoh', preset: 'bangUtoh', height: 1.96 },
  { id: 'ebot', preset: 'ebot', height: 1.88 },
  { id: 'bangUdin', preset: 'bangUdin', height: 1.92 },
  { id: 'raka', preset: 'raka', height: 1.86 },
  { id: 'pakBudi', preset: 'pakBudi', height: 1.94 },
];

export const BELANG_HEIGHT = 0.52;

const L = (id: string) => lineById(id);
const inLine = (id: string, f: number, pad = 0) => f >= L(id).startFrame - pad && f <= L(id).endFrame + pad;
const ease = (f: number, a: number, b: number) => smootherstep((f - a) / Math.max(1, b - a));
const nearSeam = (f: number) => f < 8 || f >= EP05_FRAMES - 8;

export const EP05_PLAK_FRAME = 10;
export const EP05_PAN_SYARAT_FROM = 62;

export const EP05_UDIN_FROM = L('UD1').startFrame - 8;
export const EP05_UDIN_PARKED = L('UD1').startFrame + 24;
export const EP05_UDIN_TAPS: readonly [number, number, number] = [
  L('UD2').startFrame + 32,
  L('UD2').startFrame + 48,
  L('UD2').startFrame + 64,
];
export const EP05_UDIN_TO = L('R1').startFrame - 8;

export const EP05_RAKA_FROM = L('R1').startFrame - 6;
export const EP05_RAKA_PARKED = L('R1').startFrame + 28;
export const EP05_RAKA_TAPS: readonly [number, number, number, number, number] = [
  L('R2').startFrame + 22,
  L('R2').startFrame + 36,
  L('R2').startFrame + 50,
  L('R2').startFrame + 64,
  L('R2').startFrame + 78,
];
export const EP05_RAKA_TO = L('E6').startFrame - 6;

export const EP05_TALLY80_FROM = L('E6').startFrame - 6;
export const EP05_UTOH_BOS_FROM = L('U3').startFrame - 4;

export const EP05_PAKBUDI_FROM = L('U4').startFrame - 6;
export const EP05_PAKBUDI_STEP_OFF = L('U4').startFrame + 14;
export const EP05_PAKBUDI_PUSH_START = L('U4').startFrame + 30;
export const EP05_PAKBUDI_PUSH_END = L('PB1').startFrame + 24;
export const EP05_U5_SHOCK_FRAME = L('U5').startFrame - 2;

export const EP05_SURAT_FROM = L('PB2').endFrame - 42;
export const EP05_SURAT_IMPACT = EP05_SURAT_FROM + 4;
export const EP05_SURAT_TO = L('E7').startFrame - 4;
export const EP05_U6_SHOCK_FRAME = L('U6').startFrame - 2;

export const EP05_BELANG_FROM = L('B1').startFrame - 12;
export const EP05_LOOP_POSE_FROM = L('U7').startFrame - 8;

const WORDS_BY: Record<VoiceSpeaker, ReturnType<typeof wordsOf>> = {
  bangUtoh: wordsOf('bangUtoh'),
  ebot: wordsOf('ebot'),
  bangUdin: wordsOf('bangUdin'),
  raka: wordsOf('raka'),
  pakBudi: wordsOf('pakBudi'),
  belang: wordsOf('belang'),
};
const eventsOf = (s: VoiceSpeaker): TalkEvent[] => NONVERBAL.filter((e) => e.speaker === s);

export function talkFor(speaker: VoiceSpeaker, frame: number): TalkSample {
  return talkGated(WORDS_BY[speaker], frame, {
    rms: (f) => rmsAt(speaker, f),
    events: eventsOf(speaker),
    fps: FPS,
    leadFrames: 1,
    silence: 0.04,
  });
}

export function motorStateAt(frame: number): { active: SetState['activeMotor']; pos: Vec3; yaw: number; roll: number } {
  // Beat 3: Motor Bang Udin (parkir diagonal 3/4 agar siluet motor & box ojol terbaca jelas!)
  if (frame >= EP05_UDIN_FROM && frame < EP05_UDIN_TO) {
    let pos: Vec3 = EP05_SPOTS.motorPark;
    let yaw = Math.PI - 0.45;
    if (frame < EP05_UDIN_PARKED) {
      const t = ease(frame, EP05_UDIN_FROM, EP05_UDIN_PARKED);
      pos = lerp3(EP05_SPOTS.motorEnter, EP05_SPOTS.motorPark, t);
      yaw = (Math.PI - 0.92) + t * 0.47;
    } else if (frame >= EP05_UDIN_TAPS[0] - 8 && frame < L('E4').startFrame) {
      pos = lerp3(EP05_SPOTS.motorPark, EP05_SPOTS.motorExit, ease(frame, EP05_UDIN_TAPS[0] - 8, EP05_UDIN_TAPS[2] + 10));
    } else if (frame >= L('E4').startFrame) {
      pos = EP05_SPOTS.motorExit;
    }
    let roll = 0;
    for (let i = 0; i < EP05_UDIN_TAPS.length; i++) {
      const env = strikeEnvelope(frame, EP05_UDIN_TAPS[i], { windup: 4, hold: 4, follow: 6 });
      if (env.phase !== 'idle') {
        roll += (i % 2 === 0 ? 1 : -1) * env.value * 0.26;
        yaw += (i % 2 === 0 ? 1 : -1) * env.value * 0.12;
      }
    }
    return { active: 'udin', pos, yaw, roll };
  }

  // Beat 4: Motor Raka (merah sporty, parkir diagonal 3/4 + oleng freestyle)
  if (frame >= EP05_RAKA_FROM && frame < EP05_RAKA_TO) {
    let pos: Vec3 = EP05_SPOTS.motorPark;
    let yaw = Math.PI - 0.42;
    if (frame < EP05_RAKA_PARKED) {
      const t = ease(frame, EP05_RAKA_FROM, EP05_RAKA_PARKED);
      pos = lerp3(EP05_SPOTS.motorEnter, EP05_SPOTS.motorPark, t);
      yaw = (Math.PI - 0.9) + t * 0.48;
    } else if (frame >= EP05_RAKA_TAPS[0] - 8 && frame < L('E5').startFrame) {
      pos = lerp3(EP05_SPOTS.motorPark, EP05_SPOTS.motorExit, ease(frame, EP05_RAKA_TAPS[0] - 8, EP05_RAKA_TAPS[4] + 10));
    } else if (frame >= L('E5').startFrame) {
      pos = EP05_SPOTS.motorExit;
    }
    let roll = 0;
    for (let i = 0; i < EP05_RAKA_TAPS.length; i++) {
      const env = strikeEnvelope(frame, EP05_RAKA_TAPS[i], { windup: 3, hold: 3, follow: 6 });
      if (env.phase !== 'idle') {
        roll += (i % 2 === 0 ? -1 : 1) * env.value * 0.3;
        yaw += (i % 2 === 0 ? -1 : 1) * env.value * 0.14;
      }
    }
    return { active: 'raka', pos, yaw, roll };
  }

  // Beat 6–7: Motor Pak Budi (didorong mundur lurus sambil jalan kaki)
  if (frame >= EP05_PAKBUDI_FROM && frame < EP05_BELANG_FROM) {
    let pos: Vec3 = EP05_SPOTS.motorPark;
    if (frame >= EP05_PAKBUDI_PUSH_START && frame <= EP05_PAKBUDI_PUSH_END) {
      pos = lerp3(EP05_SPOTS.motorPark, EP05_SPOTS.motorExit, ease(frame, EP05_PAKBUDI_PUSH_START, EP05_PAKBUDI_PUSH_END));
    } else if (frame > EP05_PAKBUDI_PUSH_END) {
      pos = EP05_SPOTS.motorExit;
    }
    return { active: 'pakBudi', pos, yaw: Math.PI, roll: 0 };
  }

  return { active: 'none', pos: EP05_SPOTS.motorPark, yaw: Math.PI, roll: 0 };
}

function utohPos(frame: number): Vec3 {
  if (frame < EP05_PAN_SYARAT_FROM) {
    return lerp3(EP05_SPOTS.utohPlak, EP05_SPOTS.utohDefault, ease(frame, 0, 24));
  }
  if (frame >= L('U2').startFrame - 8 && frame < EP05_UDIN_FROM) {
    const go = ease(frame, L('U2').startFrame - 8, L('U2').startFrame + 24);
    const back = ease(frame, L('E2').endFrame - 18, EP05_UDIN_FROM);
    return lerp3(EP05_SPOTS.utohDefault, EP05_SPOTS.utohPitch, clamp(go - back, 0, 1));
  }
  if (frame >= EP05_UTOH_BOS_FROM && frame < EP05_PAKBUDI_FROM + 18) {
    const go = ease(frame, EP05_UTOH_BOS_FROM, EP05_UTOH_BOS_FROM + 20);
    const back = ease(frame, EP05_PAKBUDI_FROM + 2, EP05_PAKBUDI_FROM + 18);
    return lerp3(EP05_SPOTS.utohDefault, EP05_SPOTS.utohPitch, clamp(go - back, 0, 1));
  }
  if (frame >= EP05_LOOP_POSE_FROM) {
    return lerp3(EP05_SPOTS.utohDefault, EP05_SPOTS.utohPlak, ease(frame, EP05_LOOP_POSE_FROM, EP05_FRAMES - 12));
  }
  return EP05_SPOTS.utohDefault;
}

function ebotPos(frame: number): Vec3 {
  if (inLine('E3', frame, 14)) {
    const go = ease(frame, L('E3').startFrame - 14, L('E3').startFrame + 6);
    const back = ease(frame, L('E3').endFrame, L('E3').endFrame + 14);
    return lerp3(EP05_SPOTS.ebotDefault, EP05_SPOTS.ebotStop, clamp(go - back, 0, 1));
  }
  const writeLines = ['E2', 'E4', 'E5', 'E7'] as const;
  let w = 0;
  for (const id of writeLines) {
    const l = L(id);
    if (frame >= l.startFrame - 10 && frame <= l.endFrame + 10) {
      const go = ease(frame, l.startFrame - 10, l.startFrame + 2);
      const back = ease(frame, l.endFrame - 2, l.endFrame + 10);
      w = Math.max(w, clamp(go - back, 0, 1));
    }
  }
  if (w > 0) return lerp3(EP05_SPOTS.ebotDefault, EP05_SPOTS.ebotWrite, w);
  return EP05_SPOTS.ebotDefault;
}

function pakBudiPos(frame: number): Vec3 | null {
  if (frame < EP05_PAKBUDI_FROM || frame >= EP05_BELANG_FROM) return null;
  if (frame < EP05_PAKBUDI_STEP_OFF) return EP05_SPOTS.pakBudiSeat;
  if (frame < EP05_PAKBUDI_PUSH_START) {
    return lerp3(EP05_SPOTS.pakBudiSeat, EP05_SPOTS.pakBudiPushStart, ease(frame, EP05_PAKBUDI_STEP_OFF, EP05_PAKBUDI_PUSH_START));
  }
  if (frame <= EP05_PAKBUDI_PUSH_END) {
    return lerp3(EP05_SPOTS.pakBudiPushStart, EP05_SPOTS.pakBudiPushEnd, ease(frame, EP05_PAKBUDI_PUSH_START, EP05_PAKBUDI_PUSH_END));
  }
  if (frame >= L('PB2').startFrame - 8) {
    return lerp3(EP05_SPOTS.pakBudiPushEnd, EP05_SPOTS.pakBudiHandover, ease(frame, L('PB2').startFrame - 8, L('PB2').startFrame + 16));
  }
  return EP05_SPOTS.pakBudiPushEnd;
}

export function actorPositionAt(id: Ep05HumanId, frame: number, _camPos?: Vec3): Vec3 | null {
  if (id === 'bangUtoh') return utohPos(frame);
  if (id === 'ebot') return ebotPos(frame);
  if (id === 'bangUdin') {
    if (frame < EP05_UDIN_FROM || frame >= EP05_UDIN_TO) return null;
    const m = motorStateAt(frame);
    return [m.pos[0], 0, m.pos[2] + 0.14];
  }
  if (id === 'raka') {
    if (frame < EP05_RAKA_FROM || frame >= EP05_RAKA_TO) return null;
    const m = motorStateAt(frame);
    return [m.pos[0], 0, m.pos[2] + 0.14];
  }
  return pakBudiPos(frame);
}

export function belangPositionAt(frame: number, camPos?: Vec3): Vec3 {
  void frame;
  return seatCardPos(EP05_SPOTS.belangSeat, KARDUS_BELANG_HALF, camPos);
}

export function utohPoseAt(frame: number, camPos: Vec3): ActorPose {
  const yawDeg =
    frame < EP05_PAN_SYARAT_FROM
      ? 24
      : inLine('U2', frame, 4)
        ? -38
        : frame >= EP05_UTOH_BOS_FROM && frame < EP05_PAKBUDI_FROM
          ? -22
          : frame >= EP05_LOOP_POSE_FROM
            ? 24
            : -18;
  const walk = computeWalkState(utohPos, frame, 1.96, camPos, { fps: FPS, idleYawDeg: yawDeg });
  const br = Math.sin((2 * Math.PI * frame) / BREATH_PERIOD);
  const plakEnv = strikeEnvelope(frame, EP05_PLAK_FRAME, { windup: 4, hold: 6, follow: 8 });

  const base: ActorPose = {
    view: walk.view,
    facing: walk.facing,
    face: 'neutral',
    blink: nearSeam(frame) ? 0.25 : blinkLidAt(frame, 13, FPS, [EP05_U5_SHOCK_FRAME, EP05_U6_SHOCK_FRAME]),
    talk: talkFor('bangUtoh', frame),
    stance: walk.stance,
    gait: walk.gait,
    walkPhase: walk.walkPhase,
    leftArm: walk.moving ? walk.leftArm : 'hip',
    rightArm: walk.moving ? walk.rightArm : 'hip',
    lean: walk.moving ? 2.6 * walk.strideBlend : br * 1.1,
    headTilt: br * 1.4,
  };

  if (frame < EP05_PAN_SYARAT_FROM) {
    return {
      ...base,
      face: frame < EP05_PLAK_FRAME ? 'focus' : 'smug',
      stance: 'stand',
      rightArm: 'raise',
      rightHand: plakEnv.phase !== 'idle' ? { dx: 18 * plakEnv.value, dy: -10 * plakEnv.value } : undefined,
      leftArm: 'hip',
      lean: plakEnv.phase !== 'idle' ? 4 * plakEnv.value : 1.5,
    };
  }
  if (inLine('U2', frame, 4)) {
    const baca = frame >= wordFrame('U2', 'Baca') - 2;
    return { ...base, face: baca ? 'smug' : 'idea', rightArm: 'point', leftArm: 'hip', lean: 2.5 };
  }
  if (inLine('U3', frame, 6)) {
    return { ...base, face: 'laugh', rightArm: 'raise', leftArm: 'hip', fx: 'sparkle', lean: -2.2 };
  }
  if (inLine('U4', frame, 4)) {
    return { ...base, face: 'smug', leftArm: 'point', rightArm: 'hip' };
  }
  if (frame >= EP05_U5_SHOCK_FRAME && frame <= L('U5').endFrame + 8) {
    return {
      ...base,
      face: 'shock',
      stance: 'stand',
      hatPop: clamp(springPop(frame, EP05_U5_SHOCK_FRAME, 0.85, 14), 0, 1),
      leftArm: 'raise',
      rightArm: 'raise',
      fx: 'sweat',
    };
  }
  if (frame >= EP05_U6_SHOCK_FRAME && frame < EP05_BELANG_FROM) {
    return {
      ...base,
      face: 'shock',
      stance: 'stand',
      hatPop: clamp(springPop(frame, EP05_U6_SHOCK_FRAME, 0.95, 16), 0, 1),
      leftArm: 'raise',
      rightArm: 'raise',
      fx: 'shock',
      lean: -3.5,
    };
  }
  if (frame >= EP05_LOOP_POSE_FROM) {
    return {
      ...base,
      face: frame < EP05_FRAMES - 12 ? 'tired' : 'focus',
      stance: frame < EP05_FRAMES - 12 ? base.stance : 'stand',
      headTilt: frame < EP05_FRAMES - 12 ? -10 : 0,
      leftArm: 'hip',
      rightArm: frame < EP05_FRAMES - 12 ? 'hip' : 'raise',
    };
  }
  return base;
}

export function ebotPoseAt(frame: number, camPos: Vec3): ActorPose {
  const writing = inLine('E2', frame, 4) || inLine('E4', frame, 4) || inLine('E5', frame, 4) || inLine('E7', frame, 4);
  const yawDeg = inLine('E3', frame, 10) ? -48 : writing ? 56 : 34;
  const walk = computeWalkState(ebotPos, frame, 1.88, camPos, { fps: FPS, idleYawDeg: yawDeg });
  const br = Math.sin((2 * Math.PI * frame) / BREATH_PERIOD);

  const base: ActorPose = {
    view: walk.view,
    facing: walk.facing,
    face: 'neutral',
    blink: blinkLidAt(frame, 29, FPS),
    talk: talkFor('ebot', frame),
    stance: walk.stance,
    gait: walk.gait,
    walkPhase: walk.walkPhase,
    leftArm: walk.moving ? walk.leftArm : 'hip',
    rightArm: walk.moving ? walk.rightArm : 'hip',
    lean: walk.moving ? 2.2 * walk.strideBlend : br * 0.8,
    headTilt: br * 1.0,
  };
  if (inLine('E1', frame, 4)) return { ...base, face: 'skeptical', rightArm: 'point' };
  if (inLine('E3', frame, 4)) return { ...base, face: 'neutral', rightArm: 'raise', leftArm: 'point' };
  if (writing) {
    return {
      ...base,
      face: inLine('E7', frame, 4) ? 'neutral' : 'focus',
      rightArm: 'point',
      rightHand: { dx: Math.sin(frame * 0.35) * 9, dy: Math.cos(frame * 0.5) * 7 },
      leftArm: 'hip',
      lean: 5,
    };
  }
  if (inLine('E6', frame, 6)) return { ...base, face: 'happy', leftArm: 'raise', rightArm: 'raise', fx: 'sparkle' };
  return base;
}

export function udinPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = actorPositionAt('bangUdin', frame, camPos);
  if (!pos) return null;
  const { view, facing } = resolve25DView(pos, 46, camPos);
  const tapImpact = EP05_UDIN_TAPS.some((tf) => Math.abs(frame - tf) <= 4);
  const tapping = EP05_UDIN_TAPS.some((tf) => Math.abs(frame - tf) <= 7);
  let face: Expression = 'neutral';
  if (inLine('UD1', frame, 4)) face = 'happy';
  else if (tapping) face = 'strain';
  else if (inLine('UD2', frame, 4)) face = frame < EP05_UDIN_TAPS[0] ? 'smug' : 'nervous';
  else if (inLine('UD3', frame, 6)) face = 'angry';

  return {
    view,
    facing,
    face,
    blink: blinkLidAt(frame, 43, FPS),
    talk: talkFor('bangUdin', frame),
    stance: 'sit',
    sitHeight: tapImpact ? 0.45 : 0.58,
    leftArm: tapping ? 'raise' : 'hip',
    rightArm: inLine('UD3', frame, 4) ? 'point' : tapping ? 'raise' : 'hip',
    fx: tapping ? 'sweat' : inLine('UD3', frame, 4) ? 'anger' : 'none',
    lean: tapping ? Math.sin(frame * 0.95) * 10 : 0,
    headTilt: tapping ? Math.cos(frame * 0.95) * 7 : 0,
  };
}

export function rakaPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = actorPositionAt('raka', frame, camPos);
  if (!pos) return null;
  const { view, facing } = resolve25DView(pos, -42, camPos);
  const tapImpact = EP05_RAKA_TAPS.some((tf) => Math.abs(frame - tf) <= 3);
  const tapping = EP05_RAKA_TAPS.some((tf) => Math.abs(frame - tf) <= 6);
  let face: Expression = 'smug';
  if (tapping) face = 'strain';
  else if (inLine('R2', frame, 4)) face = 'nervous';
  else if (inLine('R3', frame, 6)) face = 'sad';

  return {
    view,
    facing,
    face,
    blink: blinkLidAt(frame, 53, FPS),
    talk: talkFor('raka', frame),
    stance: 'sit',
    sitHeight: tapImpact ? 0.45 : 0.58,
    leftArm: tapping || inLine('R1', frame, 4) ? 'raise' : 'hip',
    rightArm: tapping ? 'raise' : inLine('R3', frame, 4) ? 'hip' : 'point',
    fx: tapping ? 'sweat' : 'none',
    lean: tapping ? Math.sin(frame * 1.15) * 11 : 0,
    headTilt: tapping ? Math.cos(frame * 1.15) * 8 : 0,
  };
}

export function pakBudiPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = pakBudiPos(frame);
  if (!pos) return null;
  const seated = frame < EP05_PAKBUDI_STEP_OFF;
  const pushing = frame >= EP05_PAKBUDI_PUSH_START && frame <= EP05_PAKBUDI_PUSH_END;
  const yawDeg = pushing ? -68 : inLine('PB2', frame, 8) ? 48 : 32;
  const walk = computeWalkState((f) => pakBudiPos(f) ?? pos, frame, 1.94, camPos, {
    fps: FPS,
    idleYawDeg: yawDeg,
    startFrame: EP05_PAKBUDI_FROM,
  });

  return {
    view: seated ? resolve25DView(pos, yawDeg, camPos).view : walk.view,
    facing: seated ? resolve25DView(pos, yawDeg, camPos).facing : walk.facing,
    face: inLine('PB1', frame, 6) || inLine('PB2', frame, 6) ? 'smug' : 'neutral',
    blink: blinkLidAt(frame, 61, FPS),
    talk: talkFor('pakBudi', frame),
    stance: seated ? 'sit' : walk.stance,
    sitHeight: seated ? 0.56 : undefined,
    gait: seated ? undefined : walk.gait,
    walkPhase: seated ? undefined : walk.walkPhase,
    leftArm: pushing ? 'hold' : walk.moving ? walk.leftArm : 'hip',
    rightArm: inLine('PB2', frame, 6) ? 'point' : pushing ? 'hold' : walk.moving ? walk.rightArm : 'cross',
    leftHand: pushing ? { dx: -12, dy: -6 } : undefined,
    rightHand: pushing ? { dx: -6, dy: -4 } : undefined,
    lean: pushing ? 6 : walk.moving ? 2.4 * walk.strideBlend : Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 0.7,
    headTilt: inLine('PB1', frame, 6) ? -4 : 0,
  };
}

export function poseFor(id: Ep05HumanId, frame: number, camPos: Vec3): ActorPose | null {
  if (id === 'bangUtoh') return utohPoseAt(frame, camPos);
  if (id === 'ebot') return ebotPoseAt(frame, camPos);
  if (id === 'bangUdin') return udinPoseAt(frame, camPos);
  if (id === 'raka') return rakaPoseAt(frame, camPos);
  return pakBudiPoseAt(frame, camPos);
}

export function belangPoseAt(frame: number, camPos: Vec3): CatPose {
  const pos = belangPositionAt(frame, camPos);
  const { view, facing } = resolve25DView(pos, -22, camPos);
  const slowStart = L('B1').startFrame - 10;
  const inSlow = frame >= slowStart && frame < slowStart + 14;
  const slowLid = inSlow ? Math.sin((Math.PI * (frame - slowStart)) / 14) : 0;
  const startled =
    Math.abs(frame - EP05_PLAK_FRAME) <= 4 ||
    Math.abs(frame - EP05_U6_SHOCK_FRAME) <= 4;

  return {
    face: frame >= EP05_BELANG_FROM ? 'smug' : 'neutral',
    blink: inSlow ? slowLid : blinkLidAt(frame, 7, FPS),
    talk: talkFor('belang', frame),
    stance: 'sit',
    view,
    facing,
    pawRaise: inLine('B1', frame, 4) ? 'right' : 'none',
    pawAngle: inLine('B1', frame, 4) ? 16 : undefined,
    pawReach: inLine('B1', frame, 4) ? 0.75 : undefined,
    tailPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    breathPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    earTwitch: startled || Math.sin(frame * 0.04) > 0.96 ? 1 : 0,
    lean: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 0.8,
  };
}

export function setStateAt(frame: number): SetState {
  const m = motorStateAt(frame);
  let tallyMode: TallyMode = 'denda';
  if (frame >= L('E7').startFrame - 6 && frame < EP05_LOOP_POSE_FROM) tallyMode = 'total320';
  else if (frame >= EP05_TALLY80_FROM && frame < L('E7').startFrame - 6) tallyMode = 'tally80';
  else if (frame >= L('E5').startFrame - 6 && frame < EP05_TALLY80_FROM) tallyMode = 'raka';
  else if (frame >= L('E4').startFrame - 6 && frame < L('E5').startFrame - 6) tallyMode = 'udin';
  else if (frame >= L('E2').startFrame - 6 && frame < L('E4').startFrame - 6) tallyMode = 'target';

  const kardusPop = frame >= EP05_PLAK_FRAME ? clamp(springPop(frame, EP05_PLAK_FRAME, 1.0, 10), 0, 1) : 0;
  const suratVisible = frame >= EP05_SURAT_FROM && frame < EP05_SURAT_TO;
  const suratPop = suratVisible ? clamp(springPop(frame, EP05_SURAT_IMPACT, 1.0, 10), 0, 1) : 0;
  const cashVisible = inLine('UD3', frame, 4) || inLine('R3', frame, 4);
  const cashPos: Vec3 = [m.pos[0] + 0.42, 1.08, m.pos[2] + 0.12];

  return {
    frame,
    kardusPop,
    tallyMode,
    activeMotor: m.active,
    motorPos: m.pos,
    motorYaw: m.yaw,
    motorRoll: m.roll,
    suratVisible,
    suratPop,
    cashVisible,
    cashPos,
    floatingBills: frame >= EP05_TALLY80_FROM && frame < EP05_PAKBUDI_FROM,
  };
}
