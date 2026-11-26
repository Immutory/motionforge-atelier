import {
  moveSettle,
  pullOutReveal,
  type CamKey,
  type CamPose,
  type Kick,
  type Shot,
  type Vec3,
} from '../../engine';
import {
  EP05_BELANG_FROM,
  EP05_LOOP_POSE_FROM,
  EP05_PAKBUDI_FROM,
  EP05_PAN_SYARAT_FROM,
  EP05_PLAK_FRAME,
  EP05_RAKA_FROM,
  EP05_RAKA_TAPS,
  EP05_SURAT_FROM,
  EP05_SURAT_IMPACT,
  EP05_SURAT_TO,
  EP05_TALLY80_FROM,
  EP05_U5_SHOCK_FRAME,
  EP05_U6_SHOCK_FRAME,
  EP05_UDIN_FROM,
  EP05_UDIN_TAPS,
  EP05_UTOH_BOS_FROM,
} from './cast';
import { EP05_LIGHT_ID } from './look';
import { EP05_SPOTS } from './set';
import { EP05_FRAMES, lineById } from './words';

export const FPS = 30;
export const TOTAL_FRAMES = EP05_FRAMES;

const P = (pos: Vec3, look: Vec3, fov: number): CamPose => ({ pos, look, fov, roll: 0 });
const T = (id: string) => lineById(id);

const U_FACE: Vec3 = [EP05_SPOTS.utohDefault[0], 1.54, EP05_SPOTS.utohDefault[2]];
const E_FACE: Vec3 = [EP05_SPOTS.ebotDefault[0], 1.48, EP05_SPOTS.ebotDefault[2]];
const PAPAN_CENTER: Vec3 = [EP05_SPOTS.papanKapur[0], 1.24, EP05_SPOTS.papanKapur[2]];
const MOTOR_CENTER: Vec3 = [EP05_SPOTS.motorPark[0], 1.08, EP05_SPOTS.motorPark[2] + 0.35];
const BELANG_FACE: Vec3 = [EP05_SPOTS.belangSeat[0], EP05_SPOTS.belangSeat[1] + 0.32, EP05_SPOTS.belangSeat[2]];

/** B1 Hook (f0) & B8 Loop (fEnd): identik 100% secara matematis! */
export const POSE_HOOK_PLAK = P([-30.28, 1.38, 7.85], [-30.28, 1.34, 4.2], 44);
export const POSE_PAN_SYARAT = P([-30.48, 1.34, 8.35], [-30.48, 1.28, 4.15], 46);
export const POSE_EBOT_CU = P([-31.52, 1.44, 6.25], [-31.48, 1.36, 3.88], 38);
export const POSE_TWO_SETUP_START = P([-31.12, 1.42, 8.85], [-31.12, 1.34, 4.0], 48);
export const POSE_TWO_SETUP = P([-31.12, 1.42, 8.45], [-31.12, 1.34, 4.0], 48);
export const POSE_PARK_WIDE_START = P([-32.35, 1.36, 8.65], [-32.25, 1.24, 4.1], 48);
export const POSE_PARK_WIDE = P([-32.15, 1.36, 8.2], [-32.15, 1.24, 4.1], 48);
export const POSE_RIDER_CU = P([-32.55, 1.24, 7.15], [-32.65, 1.14, 4.25], 40);
export const POSE_PAPAN_MAKRO = P([-31.18, 1.26, 5.58], PAPAN_CENTER, 38);
export const POSE_UTOH_MACRO = P([-30.62, 1.54, 5.65], U_FACE, 32);
export const POSE_UTOH_CU = P([-30.62, 1.52, 6.25], U_FACE, 36);
export const POSE_PAKBUDI_WIDE_START = P([-31.85, 1.36, 8.55], [-31.95, 1.24, 4.2], 48);
export const POSE_PAKBUDI_WIDE = P([-31.85, 1.36, 7.95], [-31.95, 1.24, 4.2], 48);
export const POSE_PAKBUDI_CU = P([-32.16, 1.48, 6.95], [-32.16, 1.44, 4.78], 38);
export const POSE_HANDOVER_START = P([-31.32, 1.42, 9.15], [-31.32, 1.36, 4.35], 48);
export const POSE_HANDOVER = P([-31.32, 1.42, 8.75], [-31.32, 1.36, 4.35], 48);
export const POSE_SURAT_MAKRO = P([-31.18, 1.38, 6.45], EP05_SPOTS.suratInsert, 36);
export const POSE_TALLY_320 = P([-31.42, 1.34, 6.65], [-31.42, 1.28, 3.85], 42);
export const POSE_BELANG_CU = P([-29.42, 0.72, 5.65], BELANG_FACE, 38);

type ShotDef = {
  id: string;
  from: number;
  pose: CamPose;
  note: string;
  move?: 'static' | 'settle' | 'pullout';
  startPose?: CamPose;
  glide?: number;
  holdMacro?: number;
  dof: number;
  target: Vec3;
};

const DEFS: ShotDef[] = [
  // Beat 1: Hook Mid-Action + Lateral Pan ke tulisan kecil syarat
  { id: 'b1-hook-plak', from: 0, pose: POSE_HOOK_PLAK, note: 'Frame 0 mid-action Utoh tempel kardus PARKIR GRATIS!', dof: 0.25, target: EP05_SPOTS.kardusSign },
  { id: 'b1-pan-syarat', from: EP05_PAN_SYARAT_FROM, pose: POSE_PAN_SYARAT, move: 'settle', startPose: POSE_HOOK_PLAK, glide: 24, note: 'Lateral pan ke syarat kecil & papan kapur Ebot', dof: 0.25, target: EP05_SPOTS.kardusSign },
  // Beat 2: Setup Loophole
  { id: 'b2-ebot-tanya', from: T('E1').startFrame - 6, pose: POSE_EBOT_CU, note: 'Ebot bertanya duitnya dari mana', dof: 0.4, target: E_FACE },
  { id: 'b2-utoh-bug', from: T('U2').startFrame - 4, pose: POSE_TWO_SETUP, move: 'settle', startPose: POSE_TWO_SETUP_START, glide: 22, note: 'Two-shot Utoh presentasi biaya kalibrasi gravitasi', dof: 0.25, target: U_FACE },
  { id: 'b2-ebot-target', from: T('E2').startFrame - 4, pose: POSE_TALLY_320, note: 'Ebot menulis TARGET: 120RB di papan kapur', dof: 0.3, target: PAPAN_CENTER },
  // Beat 3: Bang Udin Ojol (3 tapak = 6RB)
  { id: 'b3-udin-enter', from: EP05_UDIN_FROM, pose: POSE_PARK_WIDE, move: 'settle', startPose: POSE_PARK_WIDE_START, glide: 26, note: 'Bang Udin masuk pelataran parkir minimarket', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b3-ebot-stop', from: T('E3').startFrame - 4, pose: POSE_EBOT_CU, note: 'Ebot menghadang menunjuk syarat tanpa kaki turun', dof: 0.4, target: E_FACE },
  { id: 'b3-udin-oleng', from: T('UD2').startFrame - 4, pose: POSE_RIDER_CU, note: 'Bang Udin oleng 3x tapak kaki + KICKS', dof: 0.35, target: MOTOR_CENTER },
  { id: 'b3-tally-6rb', from: T('E4').startFrame - 4, pose: POSE_PAPAN_MAKRO, note: 'Insert papan kapur 3x2RB = 6RB', dof: 0.2, target: PAPAN_CENTER },
  { id: 'b3-udin-bayar', from: T('UD3').startFrame - 4, pose: POSE_RIDER_CU, note: 'Bang Udin sewot bayar 6RB', dof: 0.35, target: MOTOR_CENTER },
  // Beat 4: Raka SMA Freestyle (5 tapak = 10RB)
  { id: 'b4-raka-flex', from: EP05_RAKA_FROM, pose: POSE_PARK_WIDE, move: 'settle', startPose: POSE_PARK_WIDE_START, glide: 24, note: 'Raka sok keren skill anak sirkuit', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b4-raka-oleng', from: T('R2').startFrame - 4, pose: POSE_RIDER_CU, note: 'Raka oleng freestyle 5x tapak kaki + KICKS', dof: 0.35, target: MOTOR_CENTER },
  { id: 'b4-tally-10rb', from: T('E5').startFrame - 4, pose: POSE_PAPAN_MAKRO, note: 'Insert papan kapur 5x2RB = 10RB', dof: 0.2, target: PAPAN_CENTER },
  { id: 'b4-raka-pasrah', from: T('R3').startFrame - 4, pose: POSE_RIDER_CU, note: 'Raka lesu uang jajan melayang', dof: 0.35, target: MOTOR_CENTER },
  // Beat 5: Montage Kemenangan & Tally 80RB
  { id: 'b5-tally-insert', from: EP05_TALLY80_FROM, pose: POSE_PAPAN_MAKRO, note: 'Makro papan kapur penuh coretan TERKUMPUL: 80RB!', dof: 0.15, target: PAPAN_CENTER },
  { id: 'b5-utoh-bos', from: EP05_UTOH_BOS_FROM, pose: POSE_UTOH_CU, move: 'pullout', startPose: POSE_UTOH_MACRO, holdMacro: 6, glide: 14, note: 'Utoh tertawa sombong ala bos besar', dof: 0.4, target: U_FACE },
  // Beat 6: Final Boss Pak Budi Mematahkan Loophole
  { id: 'b6-pakbudi-in', from: EP05_PAKBUDI_FROM, pose: POSE_PAKBUDI_WIDE, move: 'settle', startPose: POSE_PAKBUDI_WIDE_START, glide: 26, note: 'Pak Budi turun duluan & mendorong motor jalan kaki planted', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b6-pakbudi-cu', from: T('PB1').startFrame - 4, pose: POSE_PAKBUDI_CU, note: 'Pak Budi kalem: orang saya nggak naik!', dof: 0.4, target: [-32.0, 1.48, 4.7] },
  { id: 'b6-utoh-lho', from: EP05_U5_SHOCK_FRAME, pose: POSE_UTOH_CU, note: 'Utoh shock: Kok didorong jalan kaki, Pak?!', dof: 0.45, target: U_FACE },
  // Beat 7: Twist Surat Denda RT 200RB -> Total 320RB
  { id: 'b7-pakbudi-surat', from: T('PB2').startFrame - 6, pose: POSE_HANDOVER, move: 'settle', startPose: POSE_HANDOVER_START, glide: 20, note: 'Pak Budi menyodorkan Surat Resmi RT 04', dof: 0.25, target: U_FACE },
  { id: 'b7-surat-makro', from: EP05_SURAT_FROM, pose: POSE_SURAT_MAKRO, note: 'Makro frontal 3D SURAT DENDA RESMI RT 04 Rp 200.000', dof: 0.15, target: EP05_SPOTS.suratInsert },
  { id: 'b7-tally-320rb', from: EP05_SURAT_TO, pose: POSE_TALLY_320, note: 'Ebot polos menjumlahkan 120RB + 200RB = 320RB!', dof: 0.25, target: PAPAN_CENTER },
  { id: 'b7-utoh-shock', from: EP05_U6_SHOCK_FRAME, pose: POSE_UTOH_CU, note: 'Utoh shock berat: 320 ribu?!', dof: 0.45, target: U_FACE },
  // Beat 8: Button Belang & Seamless Loop (identik f0!)
  { id: 'b8-belang-cuek', from: EP05_BELANG_FROM, pose: POSE_BELANG_CU, note: 'Kucing Belang tidur cuek di atas kardus + slow-blink', dof: 0.4, target: BELANG_FACE },
  { id: 'b8-loop-end', from: EP05_LOOP_POSE_FROM, pose: POSE_HOOK_PLAK, note: 'Callback pasrah & seamless loop identik f0', dof: 0.25, target: EP05_SPOTS.kardusSign },
];

export const SHOTS: Shot[] = DEFS.map((d, i) => ({
  id: d.id,
  from: d.from,
  to: i + 1 < DEFS.length ? DEFS[i + 1].from : TOTAL_FRAMES,
  light: EP05_LIGHT_ID,
  note: d.note,
  transition: 'cut',
}));

export const CAMS: CamKey[] = DEFS.flatMap((d) => {
  if (d.move === 'settle' && d.startPose) return moveSettle(d.from, d.startPose, d.pose, d.glide ?? 24);
  if (d.move === 'pullout' && d.startPose) return pullOutReveal(d.from, d.holdMacro ?? 8, d.startPose, d.pose, d.glide ?? 14);
  return [{ frame: d.from, pose: d.pose, cut: true, creepRate: 0 }];
});

export const DOF: Record<string, number> = Object.fromEntries(DEFS.map((d) => [d.id, d.dof]));
export const DOF_TARGET: Record<string, Vec3> = Object.fromEntries(DEFS.map((d) => [d.id, d.target]));

export const KICKS: Kick[] = [
  { frame: EP05_PLAK_FRAME, strength: 0.032, length: 7 },
  ...EP05_UDIN_TAPS.map((frame) => ({ frame, strength: 0.024, length: 6 })),
  ...EP05_RAKA_TAPS.map((frame) => ({ frame, strength: 0.022, length: 5 })),
  { frame: EP05_U5_SHOCK_FRAME, strength: 0.026, length: 7 },
  { frame: EP05_SURAT_IMPACT, strength: 0.03, length: 7 },
  { frame: EP05_U6_SHOCK_FRAME, strength: 0.036, length: 8 },
];
