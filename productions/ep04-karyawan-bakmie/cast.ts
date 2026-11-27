import {
  actorWalkCycleMeters,
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
  type ActorView,
  type CastPresetId,
  type CatPose,
  type CharacterSpec,
  type Expression,
  type TalkEvent,
  type TalkSample,
  type Vec3,
} from '../../engine';
import { BENCH_SEAT_Y, EP04_SPOTS, STOOLS, seatCardPos, type SetState } from './set';
import { EP04_FRAMES, NONVERBAL, lineById, rmsAt, wordFrame, wordsOf, type VoiceSpeaker } from './words';

/**
 * Milik agent character-animator. EP04 "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!"
 * Aturan mutlak:
 * - ZERO armPose 'rest' di balik konter (bangUtoh & mbakYuni selalu >= 1,04 m di atas konter 0,96 m).
 * - SODET_OUT = 20px menjauhi wajah.
 * - Planted gait 0 slip untuk Pak Ujang masuk/keluar & Utoh lateral step B5.
 * - hatPop: springPop(...) meluruh ke 0 di setiap shock.
 * - BREATH_PERIOD = 90 membagi habis TOTAL_FRAMES (2070 = 23 × 90); blink terkunci di 8f pertama & terakhir.
 */
export const FPS = 30;
export const BREATH_PERIOD = 90;

export type Ep04HumanId = 'bangUtoh' | 'tio' | 'pakUjang' | 'mbakYuni';
export type Ep04Actor = { id: Ep04HumanId; preset: CastPresetId; overrides?: Partial<CharacterSpec>; height: number };

export const ACTORS: Ep04Actor[] = [
  { id: 'bangUtoh', preset: 'bangUtoh', height: 1.96 },
  { id: 'tio', preset: 'tio', height: 1.96 },
  { id: 'pakUjang', preset: 'pakUjang', height: 1.92 },
  { id: 'mbakYuni', preset: 'mbakYuni', height: 1.86 },
];

export const OYEN_HEIGHT = 0.54;

const L = (id: string) => lineById(id);

export const EP04_OYEN_REVEAL_FROM = L('T1').endFrame + 3;
export const EP04_OYEN_BLINK1_FROM = L('O1').startFrame - 14;
export const EP04_U3_SHOCK_FRAME = L('U3').startFrame - 2;

export const EP04_UJANG_ENTER_FROM = L('T2').endFrame + 3;
export const EP04_UJANG_SEATED_FRAME = L('PU1').startFrame + 32;
export const EP04_BOWL_UJANG_FRAME = L('U5').startFrame - 6;
export const EP04_FLATLAY_PAW_IMPACT = L('O2').startFrame - 2;
export const EP04_AYAM_EXTRA_FRAME = wordFrame('T3', 'Tambahin');
export const EP04_U6_SHOCK_FRAME = L('U6').startFrame - 2;

export const EP04_POSTER_FROM = L('T4').endFrame - 26;
export const EP04_POSTER_IMPACT = EP04_POSTER_FROM + 4;

export const EP04_DEPLOY_FRAMES: readonly [number, number, number] = [
  wordFrame('U9', 'deploy', 0),
  wordFrame('U9', 'deploy', 1),
  wordFrame('U9', 'deploy', 2),
];
export const EP04_PROMOTE_FROM = L('T6').startFrame + 4;
export const EP04_PROMOTE_TO = EP04_PROMOTE_FROM + 18;

export const EP04_CASH_FRAME = L('PU2').startFrame + 16;
export const EP04_UJANG_EXIT_FROM = L('PU2').endFrame - 24;
export const EP04_UJANG_EXIT_TO = L('U10').startFrame - 2;

export const EP04_SLIP_FROM = L('T7').endFrame + 4;
export const EP04_SLIP_TO = L('U11').startFrame - 4;
export const EP04_U11_SHOCK_FRAME = L('U11').startFrame - 2;

export const EP04_LOOP_POSE_FROM = L('U12').startFrame - 6;

const yawVec = (deg: number): Vec3 => [Math.sin((deg * Math.PI) / 180), 0, Math.cos((deg * Math.PI) / 180)];

export function viewFor(pos: Vec3, forward: Vec3, camPos: Vec3): { view: ActorView; facing: number } {
  const { view, facing } = resolve25DView(pos, forward, camPos, { fourWayThresholds: [35, 75, 120] });
  return { view, facing };
}

const WORDS_BY: Record<VoiceSpeaker, ReturnType<typeof wordsOf>> = {
  bangUtoh: wordsOf('bangUtoh'),
  tio: wordsOf('tio'),
  pakUjang: wordsOf('pakUjang'),
  mbakYuni: wordsOf('mbakYuni'),
  oyen: wordsOf('oyen'),
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

const inLine = (id: string, f: number, pad = 0) => f >= L(id).startFrame - pad && f <= L(id).endFrame + pad;
const ease = (f: number, a: number, b: number) => smootherstep((f - a) / Math.max(1, b - a));
const nearSeam = (frame: number) => frame < 8 || frame >= EP04_FRAMES - 8;

export function utohPositionAt(frame: number): Vec3 {
  // B5: planted lateral step singkat di atas pallet saat mode multithreading
  const stepStart = L('U9').startFrame;
  const stepMid = EP04_DEPLOY_FRAMES[0] - 6;
  const stepBack = EP04_DEPLOY_FRAMES[1] - 4;
  if (frame >= stepStart && frame < stepBack) {
    const t = frame < stepMid ? ease(frame, stepStart, stepMid) : 1 - ease(frame, stepMid, stepBack);
    return lerp3(EP04_SPOTS.utohDefault, EP04_SPOTS.utohStepLeft, t);
  }
  // B7: geser halus ke celah tengah terbuka saat serah slip gaji
  if (frame >= L('T7').startFrame - 8 && frame < EP04_LOOP_POSE_FROM) {
    const t = ease(frame, L('T7').startFrame - 8, L('T7').startFrame + 6);
    const back = ease(frame, L('O4').startFrame, EP04_LOOP_POSE_FROM);
    return lerp3(EP04_SPOTS.utohDefault, EP04_SPOTS.utohEast, clamp(t - back, 0, 1));
  }
  return EP04_SPOTS.utohDefault;
}

export function tioPositionAt(frame: number): Vec3 {
  if (frame >= L('T7').startFrame - 10 && frame < EP04_LOOP_POSE_FROM) {
    const t = ease(frame, L('T7').startFrame - 10, L('T7').startFrame + 8);
    const back = ease(frame, L('O4').startFrame, EP04_LOOP_POSE_FROM);
    return lerp3(EP04_SPOTS.tioBoss, EP04_SPOTS.tioHandover, clamp(t - back, 0, 1));
  }
  return EP04_SPOTS.tioBoss;
}

export function pakUjangPositionAt(frame: number, camPos?: Vec3): Vec3 | null {
  if (frame < EP04_UJANG_ENTER_FROM || frame >= EP04_UJANG_EXIT_TO) return null;
  const seat = seatCardPos(EP04_SPOTS.pakUjangSeat, STOOLS.pakUjang.half, camPos);
  if (frame < EP04_UJANG_SEATED_FRAME) {
    const enterStart: Vec3 = [-14.25, 0, 15.85];
    return lerp3(enterStart, seat, ease(frame, EP04_UJANG_ENTER_FROM, EP04_UJANG_SEATED_FRAME));
  }
  if (frame >= EP04_UJANG_EXIT_FROM) {
    const exitEnd: Vec3 = [-14.55, 0, 15.75];
    return lerp3(seat, exitEnd, ease(frame, EP04_UJANG_EXIT_FROM, EP04_UJANG_EXIT_TO));
  }
  return seat;
}

export function actorPositionAt(id: Ep04HumanId, frame: number, camPos?: Vec3): Vec3 | null {
  if (id === 'bangUtoh') return utohPositionAt(frame);
  if (id === 'tio') return tioPositionAt(frame);
  if (id === 'mbakYuni') return EP04_SPOTS.yuni;
  return pakUjangPositionAt(frame, camPos);
}

export function oyenPositionAt(frame: number, camPos?: Vec3): Vec3 {
  void frame;
  return seatCardPos(EP04_SPOTS.oyenSeat, STOOLS.oyen.half, camPos);
}

export function utohForwardAt(frame: number): Vec3 {
  if (inLine('T1', frame, 4) || inLine('T7', frame, 4) || inLine('T8', frame, 4)) return yawVec(152);
  if (inLine('U7', frame, 4)) return yawVec(162);
  return yawVec(180);
}

export function tioForwardAt(frame: number): Vec3 {
  if (inLine('T4', frame, 6) || inLine('O1', frame, 6) || inLine('O3', frame, 6)) return yawVec(-125);
  return yawVec(-105);
}

export function pakUjangForwardAt(frame: number): Vec3 {
  if (frame < EP04_UJANG_SEATED_FRAME) return yawVec(80);
  if (frame >= EP04_UJANG_EXIT_FROM) return yawVec(-85);
  if (frame >= L('U5').startFrame - 4 && frame < L('T3').startFrame - 4) return yawVec(62);
  return yawVec(0);
}

export function oyenForwardAt(frame: number): Vec3 {
  if (inLine('O1', frame, 14) || inLine('O3', frame, 12) || inLine('O4', frame, 14)) return yawVec(190);
  if (frame >= EP04_FLATLAY_PAW_IMPACT - 8 && frame < L('T3').startFrame + 10) return yawVec(-155);
  return yawVec(165);
}

const SODET_HAND = { x: 236, y: 566 };
const SODET_TILT = Math.PI - 0.3;
const sodetRig = (dx: number, dy: number) => ({
  reach: { x: SODET_HAND.x, y: SODET_HAND.y, t: 1 },
  dx: -20 + dx,
  dy,
  propTilt: SODET_TILT,
  front: true,
});

export function utohPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = utohPositionAt(frame);
  const { view, facing } = viewFor(pos, utohForwardAt(frame), camPos);
  const br = Math.sin((2 * Math.PI * frame) / BREATH_PERIOD);
  // Atelier v3.5: computeWalkState otomatis mengaktifkan planted walk di B5 lateral step MAUPUN B7 geser serah slip (0% sliding!)
  // sembari menjaga ZERO 'rest' di balik konter (leftArm='hold' sodet, rightArm='hip').
  const walk = computeWalkState(utohPositionAt, frame, 1.96, camPos, {
    stride: 0.8,
    leftArmOverride: 'hold',
    rightArmOverride: 'hip',
  });
  const isWalking = walk.stance === 'walk';

  // ZERO 'rest' di balik konter: default rightArm = 'hip' (tangan selalu >= 1,04 m)
  const base: ActorPose = {
    view,
    facing,
    face: 'neutral',
    blink: nearSeam(frame) ? 0.45 : blinkLidAt(frame, 11, FPS, [EP04_U3_SHOCK_FRAME, EP04_U6_SHOCK_FRAME, EP04_U11_SHOCK_FRAME]),
    talk: talkFor('bangUtoh', frame),
    stance: walk.stance,
    gait: isWalking ? walk.gait : undefined,
    walkPhase: isWalking ? walk.walkPhase : undefined,
    strideBlend: isWalking ? walk.strideBlend : undefined,
    leftArm: 'hold',
    leftProp: 'sodet',
    leftHand: sodetRig(Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 4, Math.cos((2 * Math.PI * frame) / BREATH_PERIOD) * 3),
    rightArm: 'hip',
    lean: br * 1.1,
    headTilt: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 1.6,
  };

  // B1 Hook & B8 Loop: identik secara matematis di f0 dan akhir B8!
  if (frame < L('U1').endFrame + 4 || frame >= EP04_LOOP_POSE_FROM) {
    const deadpan = frame > L('U1').startFrame + 55 && frame < L('U1').endFrame + 4;
    return {
      ...base,
      face: deadpan ? 'neutral' : 'tired',
      leftArm: 'hold',
      leftProp: 'sodet',
      leftHand: sodetRig(br * 4, br * 3),
      rightArm: 'hip',
      lean: 2.0 + br * 1.1,
      headTilt: 6.5 + br * 1.4,
    };
  }

  // B2: U3 shock + springPop meluruh ke 0
  if (frame >= EP04_U3_SHOCK_FRAME && frame < L('T2').startFrame) {
    return {
      ...base,
      face: 'shock',
      fx: 'shock',
      hatPop: clamp(springPop(frame, EP04_U3_SHOCK_FRAME, 1.2, 12), 0, 1.2),
      leftArm: 'raise',
      leftProp: 'none',
      leftHand: undefined,
      rightArm: 'raise',
      lean: -4.2,
      headTilt: -6,
    };
  }

  // B3: U5 smug pelit, U6 shock + springPop
  if (inLine('U5', frame, 6)) {
    return { ...base, face: 'smug', headTilt: 7, lean: 2.5 };
  }
  if (frame >= EP04_U6_SHOCK_FRAME && frame < L('Y1').startFrame - 4) {
    return {
      ...base,
      face: 'shock',
      fx: 'shock',
      hatPop: clamp(springPop(frame, EP04_U6_SHOCK_FRAME, 1.25, 12), 0, 1.25),
      leftArm: 'raise',
      leftProp: 'none',
      leftHand: undefined,
      rightArm: 'raise',
      lean: -4.8,
    };
  }

  // B4: U7 eskalasi skeptical -> nervous -> angry + leftArm 'point' mengarah ke Oyen di sisi kiri layar!
  if (inLine('U7', frame, 4)) {
    const prog = (frame - L('U7').startFrame) / Math.max(1, L('U7').endFrame - L('U7').startFrame);
    const expr: Expression = prog < 0.33 ? 'skeptical' : prog < 0.66 ? 'nervous' : 'angry';
    return {
      ...base,
      face: expr,
      fx: expr === 'angry' ? 'anger' : expr === 'nervous' ? 'sweat' : 'none',
      leftArm: 'point',
      leftProp: 'none',
      leftHand: undefined,
      rightArm: 'hip',
      lean: -3.5,
      headTilt: -5,
    };
  }
  if (frame >= EP04_POSTER_FROM && frame < L('T5').startFrame - 6) {
    return { ...base, face: 'tired', headTilt: 10, lean: 4.0, rightArm: 'hip' };
  }

  // B5: U9 3× deploy strikeEnvelope (4f wind-up -> 6f hold -> 1f strike -> 8f follow)
  for (const df of EP04_DEPLOY_FRAMES) {
    const env = strikeEnvelope(frame, df, { windup: 4, hold: 6, follow: 8 });
    if (env.phase !== 'idle') {
      return {
        ...base,
        face: env.phase === 'strike' ? 'strain' : 'focus',
        fx: env.impact ? 'sparkle' : 'sweat',
        leftArm: env.value < 0 ? 'raise' : 'point',
        rightArm: env.value < 0 ? 'raise' : 'hip',
        leftProp: 'sodet',
        leftHand: sodetRig(env.value * 20, env.value * -24),
        lean: env.value * 6.5,
        headTilt: env.value * -4.5,
      };
    }
  }
  if (inLine('U9', frame, 4)) {
    return { ...base, face: 'focus', fx: 'sweat', rightArm: 'hip', lean: 2.5, headTilt: -3 };
  }

  // B6: U10 happy bangga menagih lunas
  if (inLine('U10', frame, 6)) {
    return { ...base, face: 'happy', rightArm: 'raise', lean: -2.0 };
  }

  // B7: U11 shock mematung + hatPop meluruh ke 0
  if (frame >= EP04_U11_SHOCK_FRAME && frame < L('T8').startFrame) {
    const frozen = frame < EP04_U11_SHOCK_FRAME + 24;
    return {
      ...base,
      face: 'shock',
      fx: 'shock',
      blink: frozen ? 0 : base.blink,
      hatPop: clamp(springPop(frame, EP04_U11_SHOCK_FRAME, 1.3, 14), 0, 1.3),
      leftArm: 'raise',
      leftProp: 'none',
      leftHand: undefined,
      rightArm: 'raise',
      lean: -5.0 + (frozen ? 0 : Math.sin(frame * 0.45) * 1.1),
      headTilt: -7.5,
    };
  }
  if (frame >= L('T8').startFrame && frame < EP04_LOOP_POSE_FROM) {
    return { ...base, face: 'sad', headTilt: 9, lean: 3.5, rightArm: 'hip' };
  }

  return base;
}

export function tioPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = tioPositionAt(frame);
  const { view, facing } = viewFor(pos, tioForwardAt(frame), camPos);
  // Atelier v3.5: computeWalkState otomatis mengaktifkan planted walk saat Tio melangkah di B7 (0% sliding!)
  const walk = computeWalkState(tioPositionAt, frame, 1.96, camPos, {
    stride: 0.85,
    leftArmOverride: 'cross',
    rightArmOverride: 'cross',
  });
  const isWalking = walk.stance === 'walk';
  const base: ActorPose = {
    view,
    facing,
    face: 'neutral',
    blink: blinkLidAt(frame, 23, FPS),
    talk: talkFor('tio', frame),
    stance: walk.stance,
    gait: isWalking ? walk.gait : undefined,
    walkPhase: isWalking ? walk.walkPhase : undefined,
    strideBlend: isWalking ? walk.strideBlend : undefined,
    leftArm: isWalking ? 'rest' : 'cross',
    rightArm: isWalking ? 'rest' : 'cross',
    lean: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 0.7,
    headTilt: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD + 0.7) * 1.2,
  };
  if (inLine('T1', frame, 4)) {
    const kenalin = frame >= wordFrame('T1', 'kenalin') - 2;
    return { ...base, headTilt: kenalin ? -6 : 0, rightArm: kenalin ? 'point' : 'cross' };
  }
  if (inLine('T4', frame, 4)) return { ...base, face: 'happy', rightArm: 'raise', leftArm: 'hip' };
  if (frame >= EP04_PROMOTE_FROM && frame <= EP04_PROMOTE_TO + 8) {
    return { ...base, face: 'smug', leftArm: 'point', rightArm: 'hip', lean: 2 };
  }
  if (inLine('T7', frame, 6)) return { ...base, face: 'happy', rightArm: 'point', leftArm: 'hip', lean: 2.2 };
  if (inLine('T8', frame, 4)) return { ...base, face: 'neutral', rightArm: 'point', headTilt: -3.5 };
  return base;
}

export function pakUjangPoseAt(frame: number, camPos: Vec3): ActorPose | null {
  const pos = pakUjangPositionAt(frame, camPos);
  if (!pos) return null;
  const { view, facing } = viewFor(pos, pakUjangForwardAt(frame), camPos);
  const walkingIn = frame < EP04_UJANG_SEATED_FRAME;
  const walkingOut = frame >= EP04_UJANG_EXIT_FROM;
  const isWalking = walkingIn || walkingOut;

  let walkPhase = 0;
  if (isWalking) {
    const cycleM = actorWalkCycleMeters(1.92, 'side', 1);
    const origin: Vec3 = walkingIn ? [-14.25, 0, 15.85] : seatCardPos(EP04_SPOTS.pakUjangSeat, STOOLS.pakUjang.half, camPos);
    const dist = Math.hypot(pos[0] - origin[0], pos[2] - origin[2]);
    walkPhase = (dist / cycleM) % 1;
  }

  let face: Expression = 'neutral';
  let rightArm: ActorPose['rightArm'] = 'hip';
  if (inLine('PU1', frame, 4)) {
    face = 'happy';
    rightArm = 'raise';
  } else if (inLine('PU2', frame, 6)) {
    face = 'happy';
    rightArm = 'raise';
  }

  return {
    view: isWalking ? 'side' : view,
    facing: isWalking ? (walkingIn ? -1 : 1) : facing,
    face,
    blink: blinkLidAt(frame, 41, FPS),
    talk: talkFor('pakUjang', frame),
    stance: isWalking ? 'walk' : 'sit',
    sitHeight: isWalking ? undefined : BENCH_SEAT_Y,
    gait: isWalking ? 'planted' : undefined,
    walkPhase,
    leftArm: 'hip',
    rightArm: isWalking ? 'hip' : rightArm,
    lean: isWalking ? undefined : Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 1.1,
    headTilt: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 1.4,
  };
}

export function yuniPoseAt(frame: number, camPos: Vec3): ActorPose {
  const { view, facing } = viewFor(EP04_SPOTS.yuni, yawVec(195), camPos);
  const slice = Math.sin((2 * Math.PI * frame) / 15);
  const speaking = inLine('Y1', frame, 6);
  // ZERO 'rest' di balik konter: leftArm = 'hip'/'hold', rightArm = 'hold'
  return {
    view,
    facing,
    face: speaking ? 'smug' : 'neutral',
    blink: blinkLidAt(frame, 37, FPS),
    talk: talkFor('mbakYuni', frame),
    stance: 'stand',
    leftArm: speaking ? 'hip' : 'hold',
    rightArm: 'hold',
    rightHand: { dy: slice * 8 },
    lean: Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 0.6,
    headTilt: speaking ? -5 : 0,
  };
}

export function poseFor(id: Ep04HumanId, frame: number, camPos: Vec3): ActorPose | null {
  if (id === 'bangUtoh') return utohPoseAt(frame, camPos);
  if (id === 'tio') return tioPoseAt(frame, camPos);
  if (id === 'mbakYuni') return yuniPoseAt(frame, camPos);
  return pakUjangPoseAt(frame, camPos);
}

export function oyenPoseAt(frame: number, camPos: Vec3): CatPose {
  const pos = oyenPositionAt(frame, camPos);
  const { view, facing } = viewFor(pos, oyenForwardAt(frame), camPos);
  const slow1 = frame >= EP04_OYEN_BLINK1_FROM && frame < EP04_OYEN_BLINK1_FROM + 14;
  const slow4 = frame >= L('O4').startFrame - 14 && frame < L('O4').startFrame;
  const slowLid = slow1
    ? Math.sin((Math.PI * (frame - EP04_OYEN_BLINK1_FROM)) / 14)
    : slow4
      ? Math.sin((Math.PI * (frame - (L('O4').startFrame - 14))) / 14)
      : 0;
  const qcReject = frame >= EP04_FLATLAY_PAW_IMPACT - 4 && frame < L('T3').startFrame + 14;
  const lickO = (frame >= L('O3').startFrame - 12 && frame < L('O3').startFrame) || (frame >= L('O4').startFrame - 10 && frame < L('O4').endFrame);

  return {
    face: inLine('O1', frame, 10) || inLine('O2', frame, 10) || inLine('O3', frame, 10) || inLine('O4', frame, 12) || frame >= EP04_PROMOTE_FROM ? 'smug' : 'neutral',
    blink: slow1 || slow4 ? slowLid : blinkLidAt(frame, 5, FPS),
    talk: talkFor('oyen', frame),
    stance: 'sit',
    view,
    facing,
    pawRaise: qcReject ? 'left' : lickO ? 'right' : 'none',
    pawAngle: qcReject ? -12 : lickO ? -55 : undefined,
    pawReach: qcReject ? 1.45 : lickO ? 0.9 : undefined,
    tailPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    breathPhase: (2 * Math.PI * frame) / BREATH_PERIOD,
    earTwitch: Math.sin(frame * 0.05) > 0.96 ? 1 : 0,
    lean: qcReject ? 5 : Math.sin((2 * Math.PI * frame) / BREATH_PERIOD) * 1.1,
  };
}

export function setStateAt(frame: number): SetState {
  const liftStart = L('U5').startFrame + 8;
  const liftPeak = liftStart + 18;
  const liftEnd = EP04_FLATLAY_PAW_IMPACT - 4;
  let insertAyamLift = 0;
  if (frame >= liftStart && frame <= liftEnd) {
    insertAyamLift = frame < liftPeak ? ease(frame, liftStart, liftPeak) : 1 - ease(frame, liftPeak, liftEnd);
  }
  const pawEnv = strikeEnvelope(frame, EP04_FLATLAY_PAW_IMPACT, { windup: 4, hold: 6, follow: 8 });
  const flatLayPawT = pawEnv.phase !== 'idle' ? clamp((pawEnv.value + 1) * 0.5, 0, 1) : frame > EP04_FLATLAY_PAW_IMPACT && frame < L('T3').startFrame ? 0.9 : 0;

  const mandorFlipT = frame < EP04_PROMOTE_FROM ? 0 : ease(frame, EP04_PROMOTE_FROM, EP04_PROMOTE_TO);
  const deployBowlsCount = EP04_DEPLOY_FRAMES.filter((f) => frame >= f).length;
  const slipInsertVisible = frame >= EP04_SLIP_FROM && frame < EP04_SLIP_TO;
  const slipProgress = slipInsertVisible ? ease(frame, EP04_SLIP_FROM, EP04_SLIP_TO - 8) : 0;

  return {
    frame,
    bowlUjangVisible: frame >= EP04_BOWL_UJANG_FRAME && frame < EP04_UJANG_EXIT_TO,
    ujangAyamCount: frame >= EP04_AYAM_EXTRA_FRAME ? 4 : 2,
    insertAyamLift,
    flatLayPawT,
    mandorPromoted: frame >= Math.round((EP04_PROMOTE_FROM + EP04_PROMOTE_TO) / 2),
    mandorFlipT,
    bestEmployeeVisible: frame >= EP04_POSTER_FROM && frame < EP04_LOOP_POSE_FROM,
    bestEmployeePop: frame >= EP04_POSTER_IMPACT ? clamp(springPop(frame, EP04_POSTER_IMPACT, 1.0, 10), 0, 1) : 0,
    deployBowlsCount: frame < EP04_LOOP_POSE_FROM ? deployBowlsCount : 0,
    slipInsertVisible,
    slipProgress,
    cashVisible: frame >= EP04_CASH_FRAME && frame < EP04_LOOP_POSE_FROM,
  };
}
