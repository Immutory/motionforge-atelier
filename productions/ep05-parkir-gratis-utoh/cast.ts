import {
  actorWalkCycleMeters,
  blinkLidAt,
  clamp,
  lerp3,
  smootherstep,
  springPop,
  strikeEnvelope,
  talkGated,
  type ActorPose,
  type ActorView,
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
 * Milik agent character-animator. EP05 "Parkir Gratis 0 Rupiah, Tapi Keluarnya Bayar 10 Ribu?!"
 * - Manusia via <ActorBillboard /> (bangUtoh, ebot, bangUdin, raka, pakBudi).
 * - Kucing via <CatBillboard /> (belang).
 * - gait: 'planted' & walkPhase berbasis jarak meter riil (MAX_STEP <= 0,12 m/f, nol teleport).
 * - strikeEnvelope 4-6-1-8 pada PLAK kardus, 3 tapak Udin, 5 tapak Raka, & sodoran surat Pak Budi.
 * - hatPop: springPop(...) meluruh ke 0 pada setiap shock.
 * - BREATH_PERIOD = 90 membagi habis TOTAL_FRAMES; seam terkunci di 8f awal/akhir.
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

// Konstanta frame koreografi (sumber kebenaran tunggal untuk shots.ts & events.json)
export const EP05_PLAK_FRAME = 10;
export const EP05_PAN_SYARAT_FROM = 62;

export const EP05_UDIN_FROM = L('UD1').startFrame - 8;
export const EP05_UDIN_PARKED = L('UD1').startFrame + 22;
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
export const EP05_PAKBUDI_PUSH_START = L('U4').startFrame + 22;
export const EP05_PAKBUDI_PUSH_END = L('PB1').startFrame + 24;
export const EP05_U5_SHOCK_FRAME = L('U5').startFrame - 2;

export const EP05_SURAT_FROM = L('PB2').endFrame - 42;
export const EP05_SURAT_IMPACT = EP05_SURAT_FROM + 4;
export const EP05_SURAT_TO = L('E7').startFrame - 4;
export const EP05_U6_SHOCK_FRAME = L('U6').startFrame - 2;

export const EP05_BELANG_FROM = L('B1').startFrame - 12;
export const EP05_LOOP_POSE_FROM = L('U7').startFrame - 8;

const yawVec = (deg: number): Vec3 => [Math.sin((deg * Math.PI) / 180), 0, Math.cos((deg * Math.PI) / 180)];

export function viewFor(pos: Vec3, forward: Vec3, camPos: Vec3): { view: ActorView; facing: number } {
  const tx = camPos[0] - pos[0];
  const tz = camPos[2] - pos[2];
  const tl = Math.hypot(tx, tz) || 1;
  const fl = Math.hypot(forward[0], forward[2]) || 1;
  const fx = forward[0] / fl;
  const fz = forward[2] / fl;
  const cos = (fx * tx + fz * tz) / tl;
  const ang = (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;
  const side = (fx * tz - fz * tx) / tl;
  const sign = side >= 0 ? 1 : -1;
  if (ang < 35) return { view: 'front', facing: clamp(side * 1.6, -0.45, 0.45) };
  if (ang < 75) return { view: 'threeQuarter', facing: 0.7 * sign };
  if (ang < 120) return { view: 'side', facing: sign };
  return { view: 'back', facing: 0.4 * sign };
}

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
  // Beat 3: Motor Bang Udin (hijau ojol)
  if (frame >= EP05_UDIN_FROM && frame < EP05_UDIN_TO) {
    let pos: Vec3 = EP05_SPOTS.motorPark;
    if (frame < EP05_UDIN_PARKED) {
      pos = lerp3(EP05_SPOTS.motorEnter, EP05_SPOTS.motorPark, ease(frame, EP05_UDIN_FROM, EP05_UDIN_PARKED));
    } else if (frame >= EP05_UDIN_TAPS[0] - 8 && frame < L('E4').startFrame) {
      pos = lerp3(EP05_SPOTS.motorPark, EP05_SPOTS.motorExit, ease(frame, EP05_UDIN_TAPS[0] - 8, EP05_UDIN_TAPS[2] + 10));
    } else if (frame >= L('E4').startFrame) {
      pos = EP05_SPOTS.motorExit;
    }
    let roll = 0;
    for (let i = 0; i < EP05_UDIN_TAPS.length; i++) {
      const env = strikeEnvelope(frame, EP05_UDIN_TAPS[i], { windup: 4, hold: 4, follow: 6 });
      if (env.phase !== 'idle') roll += (i % 2 === 0 ? 1 : -1) * env.value * 0.22;
    }
    return { active: 'udin', pos, yaw: Math.PI, roll };
  }

  // Beat 4: Motor Raka (merah sporty)
  if (frame >= EP05_RAKA_FROM && frame < EP05_RAKA_TO) {
    let pos: Vec3 = EP05_SPOTS.motorPark;
    if (frame < EP05_RAKA_PARKED) {
      pos = lerp3(EP05_SPOTS.motorEnter, EP05_SPOTS.motorPark, ease(frame, EP05_RAKA_FROM, EP05_RAKA_PARKED));
    } else if (frame >= EP05_RAKA_TAPS[0] - 8 && frame < L('E5').startFrame) {
      pos = lerp3(EP05_SPOTS.motorPark, EP05_SPOTS.motorExit, ease(frame, EP05_RAKA_TAPS[0] - 8, EP05_RAKA_TAPS[4] + 10));
    } else if (frame >= L('E5').startFrame) {
      pos = EP05_SPOTS.motorExit;
    }
    let roll = 0;
    for (let i = 0; i < EP05_RAKA_TAPS.length; i++) {
      const env = strikeEnvelope(frame, EP05_RAKA_TAPS[i], { windup: 3, hold: 3, follow: 6 });
      if (env.phase !== 'idle') roll += (i % 2 === 0 ? -1 : 1) * env.value * 0.28;
    }
    return { active: 'raka', pos, yaw: Math.PI, roll };
  }

  // Beat 6–7: Motor Pak Budi (bebek hitam, didorong mundur sambil jalan kaki!)
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

export function actorPositionAt(id: Ep05HumanId, frame: number, _camPos?: Vec3): Vec3 | null {
  if (id === 'bangUtoh') {
    if (frame < EP05_PAN_SYARAT_FROM) {
      const t = ease(frame, 0, 24);
      return lerp3(EP05_SPOTS.utohPlak, EP05_SPOTS.utohDefault, t);
    }
    if (frame >= EP05_LOOP_POSE_FROM) {
      const t = ease(frame, EP05_LOOP_POSE_FROM, EP05_FRAMES - 12);
      return lerp3(EP05_SPOTS.utohDefault, EP05_SPOTS.utohPlak, t);
    }
    return EP05_SPOTS.utohDefault;
  }
  if (id === 'ebot') return EP05_SPOTS.ebotDefault;
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
  if (id === 'pakBudi') {
    if (frame < EP05_PAKBUDI_FROM || frame >= EP05_BELANG_FROM) return null;
    if (frame < EP05_PAKBUDI_PUSH_START) return EP05_SPOTS.pakBudiPushStart;
    if (frame <= EP05_PAKBUDI_PUSH_END) {
      return lerp3(EP05_SPOTS.pakBudiPushStart, EP05_SPOTS.pakBudiPushEnd, ease(frame, EP05_PAKBUDI_PUSH_START, EP05_PAKBUDI_PUSH_END));
    }
    if (frame >= L('PB2').startFrame - 8) {
      return lerp3(EP05_SPOTS.pakBudiPushEnd, EP05_SPOTS.pakBudiHandover, ease(frame, L('PB2').startFrame - 8, L('PB2').startFrame + 14));
    }
    return EP05_SPOTS.pakBudiPushEnd;
  }
  return null;
}

export function belangPositionAt(frame: number, camPos?: Vec3): Vec3 {
  void frame;
  return seatCardPos(EP05_SPOTS.belangSeat, KARDUS_BELANG_HALF, camPos);
}

export function utohPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = actorPositionAt('bangUtoh', frame, camPos)!;
  const { view, facing } = viewFor(pos, yawVec(0), camPos);
  const br = Math.sin((2 * Math.PI * frame) / BREATH_PERIOD);
  const plakEnv = strikeEnvelope(frame, EP05_PLAK_FRAME, { windup: 4, hold: 6, follow: 8 });

  const base: ActorPose = {
    view,
    facing,
    face: 'neutral',
    blink: nearSeam(frame) ? 0.25 : blinkLidAt(frame, 13, FPS, [EP05_U5_SHOCK_FRAME, EP05_U6_SHOCK_FRAME]),
    talk: talkFor('bangUtoh', frame),
    stance: 'stand',
    leftArm: 'hip',
    rightArm: 'hip',
    lean: br * 1.1,
    headTilt: br * 1.4,
  };

  if (frame < EP05_PAN_SYARAT_FROM) {
    return {
      ...base,
      face: frame < EP05_PLAK_FRAME ? 'focus' : 'smug',
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
      headTilt: frame < EP05_FRAMES - 12 ? -10 : 0,
      leftArm: 'hip',
      rightArm: frame < EP05_FRAMES - 12 ? 'hip' : 'raise',
    };
  }
  return base;
}

export function ebotPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = actorPositionAt('ebot', frame, camPos)!;
  const { view, facing } = viewFor(pos, yawVec(8), camPos);
  const br = Math.sin((2 * Math.PI * frame) / BREATH_PERIOD);
  const base: ActorPose = {
    view,
    facing,
    face: 'neutral',
    blink: blinkLidAt(frame, 29, FPS),
    talk: talkFor('ebot', frame),
    stance: 'stand',
    leftArm: 'hip',
    rightArm: 'hip',
    lean: br * 0.8,
    headTilt: br * 1.0,
  };
  if (inLine('E1', frame, 4)) return { ...base, face: 'skeptical', rightArm: 'point' };
  if (inLine('E2', frame, 4)) return { ...base, face: 'focus', rightArm: 'raise', leftArm: 'hip' };
  if (inLine('E3', frame, 4)) return { ...base, face: 'neutral', rightArm: 'point', leftArm: 'hip' };
  if (inLine('E4', frame, 4) || inLine('E5', frame, 4)) return { ...base, face: 'focus', rightArm: 'raise', leftArm: 'hip' };
  if (inLine('E6', frame, 6)) return { ...base, face: 'happy', leftArm: 'raise', rightArm: 'raise', fx: 'sparkle' };
  if (inLine('E7', frame, 6)) return { ...base, face: 'neutral', rightArm: 'point', leftArm: 'hip', headTilt: 4 };
  return base;
}

export function udinPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = actorPositionAt('bangUdin', frame, camPos);
  if (!pos) return null;
  const { view, facing } = viewFor(pos, yawVec(16), camPos);
  const tapping = EP05_UDIN_TAPS.some((tf) => Math.abs(frame - tf) <= 6);
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
    sitHeight: 0.56,
    leftArm: tapping ? 'raise' : 'hip',
    rightArm: inLine('UD3', frame, 4) ? 'point' : tapping ? 'raise' : 'hip',
    fx: tapping ? 'sweat' : inLine('UD3', frame, 4) ? 'anger' : 'none',
    lean: tapping ? Math.sin(frame * 0.9) * 7 : 0,
  };
}

export function rakaPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = actorPositionAt('raka', frame, camPos);
  if (!pos) return null;
  const { view, facing } = viewFor(pos, yawVec(14), camPos);
  const tapping = EP05_RAKA_TAPS.some((tf) => Math.abs(frame - tf) <= 5);
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
    sitHeight: 0.56,
    leftArm: tapping || inLine('R1', frame, 4) ? 'raise' : 'hip',
    rightArm: tapping ? 'raise' : inLine('R3', frame, 4) ? 'hip' : 'point',
    fx: tapping ? 'sweat' : 'none',
    lean: tapping ? Math.sin(frame * 1.1) * 9 : 0,
  };
}

export function pakBudiPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = actorPositionAt('pakBudi', frame, camPos);
  if (!pos) return null;
  const { view, facing } = viewFor(pos, yawVec(12), camPos);
  const pushing = frame >= EP05_PAKBUDI_PUSH_START && frame <= EP05_PAKBUDI_PUSH_END;
  const steppingToUtoh = frame >= L('PB2').startFrame - 8 && frame <= L('PB2').startFrame + 14;
  const isWalking = pushing || steppingToUtoh;

  let walkPhase = 0;
  if (isWalking) {
    const cycleM = actorWalkCycleMeters(1.94, view, 0.9);
    const origin = pushing ? EP05_SPOTS.pakBudiPushStart : EP05_SPOTS.pakBudiPushEnd;
    const dist = Math.hypot(pos[0] - origin[0], pos[2] - origin[2]);
    walkPhase = (dist / cycleM) % 1;
  }

  return {
    view,
    facing,
    face: inLine('PB1', frame, 6) || inLine('PB2', frame, 6) ? 'smug' : 'neutral',
    blink: blinkLidAt(frame, 61, FPS),
    talk: talkFor('pakBudi', frame),
    stance: isWalking ? 'walk' : 'stand',
    gait: isWalking ? 'planted' : undefined,
    walkPhase: isWalking ? walkPhase : undefined,
    leftArm: pushing ? 'hold' : 'hip',
    rightArm: inLine('PB2', frame, 6) ? 'point' : pushing ? 'hold' : 'cross',
    lean: isWalking ? undefined : Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 0.7,
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
  const { view, facing } = viewFor(pos, yawVec(0), camPos);
  const slowStart = L('B1').startFrame - 10;
  const inSlow = frame >= slowStart && frame < slowStart + 14;
  const slowLid = inSlow ? Math.sin((Math.PI * (frame - slowStart)) / 14) : 0;

  return {
    face: frame >= EP05_BELANG_FROM ? 'smug' : 'neutral',
    blink: inSlow ? slowLid : blinkLidAt(frame, 7, FPS),
    talk: talkFor('belang', frame),
    stance: 'sit',
    view,
    facing,
    pawRaise: 'none',
    tailPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    breathPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    earTwitch: Math.sin(frame * 0.04) > 0.96 ? 1 : 0,
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
  };
}
