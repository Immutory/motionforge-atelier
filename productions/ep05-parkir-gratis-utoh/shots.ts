import {
  moveSettle,
  storyDolly,
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

/**
 * Milik agent cinematographer (Cinema Camera v3.0 — 180° Cohesive Coverage).
 * Seluruh 25 shot terkunci di koridor Selatan (`|yaw| <= 5.1°`, `|pitch| <= 5.8°`) sehingga
 * geografi layar 100% konsisten sepanjang 8 beat (Kiri: Motor/Korban, Tengah: Ebot & Papan Kapur,
 * Kanan: Bang Utoh, Tiang Kardus, & Belang). Nol whip-pan acak, nol orbit memusingkan,
 * DEFAULT_CREEP = 0 di seluruh shot statis, & loop mulus f2699 === f0.
 */
export const FPS = 30;
export const TOTAL_FRAMES = EP05_FRAMES;

const P = (pos: Vec3, look: Vec3, fov: number): CamPose => ({ pos, look, fov, roll: 0 });
const T = (id: string) => lineById(id);

const U_FACE: Vec3 = [EP05_SPOTS.utohDefault[0], 1.54, EP05_SPOTS.utohDefault[2]];
const E_FACE: Vec3 = [EP05_SPOTS.ebotDefault[0], 1.48, EP05_SPOTS.ebotDefault[2]];
const PAPAN_CENTER: Vec3 = [EP05_SPOTS.papanKapur[0], 1.24, EP05_SPOTS.papanKapur[2]];
const MOTOR_CENTER: Vec3 = [EP05_SPOTS.motorPark[0], 1.08, EP05_SPOTS.motorPark[2] + 0.35];
const BELANG_FACE: Vec3 = [EP05_SPOTS.belangSeat[0], EP05_SPOTS.belangSeat[1] + 0.32, EP05_SPOTS.belangSeat[2]];

/** B1 Hook (f0) & B8 Loop (fEnd): Medium Hook tenang + lateral storyDolly reveal syarat & papan kapur */
export const POSE_HOOK_PLAK = P([-30.05, 1.38, 7.75], [-30.34, 1.34, 4.22], 44);
export const POSE_PAN_SYARAT = P([-30.6, 1.38, 9.15], [-30.72, 1.32, 4.1], 48);

/** B2: Clean CU Ebot -> Medium Two-Shot Ebot–Utoh -> Medium-Close Ebot + Papan Kapur */
export const POSE_EBOT_CU = P([-31.86, 1.44, 6.2], [-31.72, 1.4, 3.88], 36);
export const POSE_TWO_SETUP_START = P([-31.05, 1.42, 8.65], [-31.22, 1.36, 4.1], 45);
export const POSE_TWO_SETUP = P([-31.12, 1.42, 8.25], [-31.22, 1.36, 4.1], 45);
export const POSE_EBOT_PAPAN = P([-31.48, 1.36, 6.95], [-31.42, 1.3, 3.92], 42);

/** B3: Wide tracking Udin -> Hard-cut CU Ebot -> Rider oleng & bayar (satu sumbu Selatan, 0 flip!) */
export const POSE_UDIN_WIDE_START = P([-33.25, 1.38, 8.75], [-33.2, 1.24, 4.2], 47);
export const POSE_UDIN_WIDE = P([-32.88, 1.38, 8.35], [-32.92, 1.24, 4.0], 47);
export const POSE_EBOT_STOP = P([-31.82, 1.42, 6.45], [-31.88, 1.38, 4.2], 37);
export const POSE_RIDER_OLENG = P([-32.55, 1.26, 7.65], [-32.68, 1.18, 4.35], 43);
export const POSE_PAPAN_INSERT = P([-31.12, 1.26, 5.65], PAPAN_CENTER, 38);
export const POSE_RIDER_PAY = P([-32.55, 1.32, 7.45], [-32.64, 1.26, 4.88], 39);

/** B4: Wide tracking rendah Raka sporty (sumbu Selatan konsisten) */
export const POSE_RAKA_WIDE_START = P([-33.25, 1.26, 8.65], [-33.15, 1.18, 4.2], 46);
export const POSE_RAKA_WIDE = P([-32.78, 1.26, 8.25], [-32.82, 1.18, 4.0], 46);

/** B5: Heroic slow push-in dolly Bang Utoh Boss (menggantikan orbitArc yang memusingkan) */
export const POSE_UTOH_BOS_START = P([-30.72, 1.34, 7.35], [-30.82, 1.44, 4.25], 39);
export const POSE_UTOH_BOS = P([-30.78, 1.34, 6.85], [-30.82, 1.44, 4.25], 39);

/** B6: Wide tracking Pak Budi dorong motor -> Low-angle CU Pak Budi berwibawa -> Hard-cut CU Utoh shock */
export const POSE_PAKBUDI_WIDE_START = P([-32.55, 1.36, 8.65], [-32.52, 1.24, 3.95], 46);
export const POSE_PAKBUDI_WIDE = P([-32.45, 1.36, 8.35], [-32.45, 1.24, 4.45], 46);
export const POSE_PAKBUDI_CU = P([-32.22, 1.32, 6.85], [-32.28, 1.48, 4.88], 34);
export const POSE_UTOH_CU = P([-30.52, 1.46, 6.25], U_FACE, 36);

/** B7: Medium Two-Shot Pak Budi (kiri)–Utoh (kanan) -> Makro Surat RT 04 -> Ebot+Papan 320RB -> Tight Low-angle Shock Utoh */
export const POSE_HANDOVER_START = P([-31.28, 1.42, 9.35], [-31.35, 1.38, 4.3], 47);
export const POSE_HANDOVER = P([-31.32, 1.42, 9.05], [-31.35, 1.38, 4.3], 47);
export const POSE_SURAT_MAKRO = P([-31.18, 1.38, 6.38], EP05_SPOTS.suratInsert, 36);
export const POSE_UTOH_SHOCK_LOW = P([-30.52, 1.34, 6.0], U_FACE, 34);

/** B8: Cat-level CU Belang -> Callback statis identik POSE_HOOK_PLAK */
export const POSE_BELANG_CU = P([-29.25, 0.68, 5.65], BELANG_FACE, 38);

type ShotDef = {
  id: string;
  from: number;
  pose: CamPose;
  note: string;
  move?: 'static' | 'settle' | 'dolly';
  startPose?: CamPose;
  glide?: number;
  dof: number;
  target: Vec3;
};

const DEFS: ShotDef[] = [
  // Beat 1 — Hook & Reveal Syarat
  { id: 'b1-hook-plak', from: 0, pose: POSE_HOOK_PLAK, note: 'Hero Hook Medium Frame 0 mid-action PLAK kardus', dof: 0.25, target: EP05_SPOTS.kardusSign },
  { id: 'b1-pan-syarat', from: EP05_PAN_SYARAT_FROM, pose: POSE_PAN_SYARAT, move: 'dolly', startPose: POSE_HOOK_PLAK, glide: 26, note: 'Lateral storyDolly reveal syarat kecil & papan kapur', dof: 0.25, target: EP05_SPOTS.kardusSign },
  // Beat 2 — Setup Loophole
  { id: 'b2-ebot-tanya', from: T('E1').startFrame - 6, pose: POSE_EBOT_CU, note: 'Clean reaction CU Ebot bertanya polos', dof: 0.4, target: E_FACE },
  { id: 'b2-utoh-bug', from: T('U2').startFrame - 4, pose: POSE_TWO_SETUP, move: 'settle', startPose: POSE_TWO_SETUP_START, glide: 22, note: 'Medium Two-Shot tenang presentasi kalibrasi gravitasi', dof: 0.25, target: U_FACE },
  { id: 'b2-ebot-target', from: T('E2').startFrame - 4, pose: POSE_EBOT_PAPAN, note: 'Medium-Close Ebot menulis TARGET: 120RB', dof: 0.3, target: PAPAN_CENTER },
  // Beat 3 — Eskalasi #1: Bang Udin Ojol
  { id: 'b3-udin-enter', from: EP05_UDIN_FROM, pose: POSE_UDIN_WIDE, move: 'dolly', startPose: POSE_UDIN_WIDE_START, glide: 26, note: 'Wide tracking Bang Udin masuk kotak parkir', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b3-ebot-stop', from: T('E3').startFrame - 4, pose: POSE_EBOT_STOP, note: 'Hard-cut reaction CU Ebot menghadang Udin', dof: 0.4, target: E_FACE },
  { id: 'b3-udin-oleng', from: T('UD2').startFrame - 4, pose: POSE_RIDER_OLENG, note: 'Medium-Close Bang Udin oleng 3x tapak kaki + KICKS', dof: 0.35, target: MOTOR_CENTER },
  { id: 'b3-tally-6rb', from: T('E4').startFrame - 4, pose: POSE_PAPAN_INSERT, note: 'Insert jernih papan kapur 3x2RB = 6RB', dof: 0.2, target: PAPAN_CENTER },
  { id: 'b3-udin-bayar', from: T('UD3').startFrame - 4, pose: POSE_RIDER_PAY, note: 'Clean reaction Medium-Close Bang Udin bayar 6RB', dof: 0.35, target: MOTOR_CENTER },
  // Beat 4 — Eskalasi #2: Raka SMA Freestyle
  { id: 'b4-raka-flex', from: EP05_RAKA_FROM, pose: POSE_RAKA_WIDE, move: 'dolly', startPose: POSE_RAKA_WIDE_START, glide: 26, note: 'Low-ish wide tracking Raka masuk pamer motor sporty merah', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b4-raka-oleng', from: T('R2').startFrame - 4, pose: POSE_RIDER_OLENG, note: 'Medium-Close Raka oleng freestyle 5x tapak kaki', dof: 0.35, target: MOTOR_CENTER },
  { id: 'b4-tally-10rb', from: T('E5').startFrame - 4, pose: POSE_PAPAN_INSERT, note: 'Insert jernih papan kapur 5x2RB = 10RB!', dof: 0.2, target: PAPAN_CENTER },
  { id: 'b4-raka-pasrah', from: T('R3').startFrame - 4, pose: POSE_RIDER_PAY, note: 'Clean reaction Medium-Close Raka pasrah bayar 10RB', dof: 0.35, target: MOTOR_CENTER },
  // Beat 5 — Montage Kemenangan 80RB
  { id: 'b5-tally-insert', from: EP05_TALLY80_FROM, pose: POSE_PAPAN_INSERT, note: 'Insert jernih papan kapur TERKUMPUL: 80RB!', dof: 0.15, target: PAPAN_CENTER },
  { id: 'b5-utoh-bos', from: EP05_UTOH_BOS_FROM, pose: POSE_UTOH_BOS, move: 'dolly', startPose: POSE_UTOH_BOS_START, glide: 50, note: 'Heroic slow push-in dolly Bang Utoh Boss + uang melayang', dof: 0.38, target: U_FACE },
  // Beat 6 — Final Boss Pak Budi
  { id: 'b6-pakbudi-in', from: EP05_PAKBUDI_FROM, pose: POSE_PAKBUDI_WIDE, move: 'dolly', startPose: POSE_PAKBUDI_WIDE_START, glide: 36, note: 'Wide tracking dolly Pak Budi turun & mendorong motor jalan kaki', dof: 0.2, target: MOTOR_CENTER },
  { id: 'b6-pakbudi-cu', from: T('PB1').startFrame - 4, pose: POSE_PAKBUDI_CU, note: 'Low-angle authoritative CU Pak Budi kalem', dof: 0.4, target: [-32.28, 1.48, 4.88] },
  { id: 'b6-utoh-lho', from: EP05_U5_SHOCK_FRAME, pose: POSE_UTOH_CU, note: 'Hard-cut reaction CU Utoh shock: Kok didorong jalan kaki?!', dof: 0.45, target: U_FACE },
  // Beat 7 — Twist Surat Denda RT 04 & Total 320RB
  { id: 'b7-pakbudi-surat', from: T('PB2').startFrame - 6, pose: POSE_HANDOVER, move: 'settle', startPose: POSE_HANDOVER_START, glide: 22, note: 'Medium Two-Shot Pak Budi (kiri) menyodorkan Surat RT 04 ke Utoh (kanan)', dof: 0.25, target: U_FACE },
  { id: 'b7-surat-makro', from: EP05_SURAT_FROM, pose: POSE_SURAT_MAKRO, note: 'Makro 3D SURAT DENDA RESMI RT 04 Rp 200.000', dof: 0.15, target: EP05_SPOTS.suratInsert },
  { id: 'b7-tally-320rb', from: EP05_SURAT_TO, pose: POSE_EBOT_PAPAN, note: 'Medium-Close Ebot menunjuk 120RB + 200RB = 320RB!', dof: 0.25, target: PAPAN_CENTER },
  { id: 'b7-utoh-shock', from: EP05_U6_SHOCK_FRAME, pose: POSE_UTOH_SHOCK_LOW, note: 'Tight low-angle dramatic CU Utoh shock: 320 ribu?!', dof: 0.45, target: U_FACE },
  // Beat 8 — Button Belang & Seamless Loop
  { id: 'b8-belang-cuek', from: EP05_BELANG_FROM, pose: POSE_BELANG_CU, note: 'Cat-level clean CU Belang tidur cuek + slow-blink', dof: 0.4, target: BELANG_FACE },
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
  if (d.move === 'dolly' && d.startPose) return storyDolly(d.from, d.startPose, d.pose, d.glide ?? 26);
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
