import {
  moveSettle,
  orbitArc,
  pullOutReveal,
  type CamKey,
  type CamPose,
  type Kick,
  type Shot,
  type Vec3,
} from '../../engine';
import {
  EP04_DEPLOY_FRAMES,
  EP04_FLATLAY_PAW_IMPACT,
  EP04_LOOP_POSE_FROM,
  EP04_OYEN_REVEAL_FROM,
  EP04_POSTER_FROM,
  EP04_POSTER_IMPACT,
  EP04_SLIP_FROM,
  EP04_SLIP_TO,
  EP04_U11_SHOCK_FRAME,
  EP04_U3_SHOCK_FRAME,
  EP04_U6_SHOCK_FRAME,
  EP04_UJANG_ENTER_FROM,
} from './cast';
import { EP04_LIGHT_ID } from './look';
import { EP04_SPOTS } from './set';
import { EP04_FRAMES, lineById } from './words';

export const FPS = 30;
export const TOTAL_FRAMES = EP04_FRAMES;

const P = (pos: Vec3, look: Vec3, fov: number): CamPose => ({ pos, look, fov, roll: 0 });

const U_FACE: Vec3 = [EP04_SPOTS.utohDefault[0], 1.64, EP04_SPOTS.utohDefault[2]];
const T_FACE: Vec3 = [EP04_SPOTS.tioBoss[0], 1.34, EP04_SPOTS.tioBoss[2]];
const O_FACE: Vec3 = [EP04_SPOTS.oyenSeat[0], 0.86, EP04_SPOTS.oyenSeat[2]];
const PU_FACE: Vec3 = [EP04_SPOTS.pakUjangSeat[0], 1.24, EP04_SPOTS.pakUjangSeat[2]];
const Y_FACE: Vec3 = [EP04_SPOTS.yuni[0], 1.56, EP04_SPOTS.yuni[2]];

/** B1 Hook (f0) & B8 Loop (f2069): identik 100% secara matematis! */
export const POSE_HOOK_UTOH = P([-13.45, 1.18, 14.78], [-13.42, 1.02, 17.85], 40);
export const POSE_HOOK_PAN = P([-13.62, 1.24, 14.32], [-13.56, 1.14, 17.55], 44);
export const POSE_TWO_START = P([-12.5, 1.48, 13.75], [-12.55, 1.4, 18.0], 48);
export const POSE_TWO_UTOH_TIO = P([-12.55, 1.48, 14.25], [-12.55, 1.4, 18.0], 48);
export const POSE_MANDOR_MACRO = P([-12.92, 0.97, 16.12], [-12.92, 0.95, 17.17], 28);
export const POSE_OYEN_REVEAL = P([-12.86, 0.8, 14.55], [-12.86, 0.72, 16.85], 44);
export const POSE_UTOH_CU = P([-13.06, 1.6, 15.85], [-13.05, 1.62, 18.4], 34);
export const POSE_UTOH_EAST_CU = P([-13.12, 1.6, 15.85], [-13.1, 1.62, 18.4], 34);
export const POSE_UTOH_WIDE = P([-13.08, 1.46, 15.1], [-13.05, 1.46, 18.4], 42);
export const POSE_TIO_SINGLE = P([-11.96, 1.36, 15.45], [-12.05, 1.32, 17.75], 38);
export const POSE_UJANG_WIDE_START = P([-14.25, 1.32, 13.05], [-13.85, 1.2, 16.5], 50);
export const POSE_UJANG_WIDE = P([-13.55, 1.3, 13.55], [-13.38, 1.2, 16.8], 48);
/** B3 Medium shot eye-level memperlihatkan wajah Pak Ujang + mangkok serve ledge + cakar Oyen PLAK! */
export const POSE_TOPDOWN_MIE = P([-11.55, 1.26, 16.92], [-13.28, 1.08, 16.98], 44);
export const POSE_OYEN_CU = P([-12.82, 0.96, 15.55], [-12.84, 0.88, 16.82], 38);
export const POSE_YUNI_START = P([-9.85, 1.66, 15.65], [-9.62, 1.54, 18.38], 36);
export const POSE_YUNI = P([-9.75, 1.66, 16.05], [-9.62, 1.54, 18.38], 36);
export const POSE_POSTER_INSERT = P([-13.94, 1.36, 16.15], EP04_SPOTS.bestEmployee, 38);
export const POSE_DEPLOY_1 = P([-13.18, 1.44, 15.3], [-13.12, 1.42, 18.2], 42);
export const POSE_DEPLOY_2 = P([-12.95, 1.48, 15.55], [-13.05, 1.46, 18.3], 38);
export const POSE_DEPLOY_3 = P([-13.1, 1.52, 15.7], [-13.05, 1.5, 18.4], 35);
export const POSE_PROMOTE_STAGE = P([-12.95, 1.28, 14.75], [-12.98, 1.22, 17.6], 46);
export const POSE_HANDOVER_START = P([-12.66, 1.46, 13.85], [-12.6, 1.4, 18.0], 48);
export const POSE_HANDOVER = P([-12.68, 1.46, 14.35], [-12.6, 1.4, 18.0], 46);
export const POSE_SLIP_INSERT = P([-12.46, 1.38, 16.25], EP04_SPOTS.slipInsert, 36);
export const POSE_EXIT_WIDE = P([-13.4, 1.32, 13.7], [-13.25, 1.22, 17.1], 48);

type ShotDef = {
  id: string;
  from: number;
  pose: CamPose;
  note: string;
  move?: 'static' | 'settle' | 'pullout' | 'orbit';
  startPose?: CamPose;
  glide?: number;
  holdMacro?: number;
  orbit?: { center: Vec3; radius: number; azFrom: number; azTo: number; y: number; fov: number; frames: number };
  dof: number;
  target: Vec3;
  isTopDown?: boolean;
};

const T = (id: string) => lineById(id);

const DEFS: ShotDef[] = [
  // B1: Mid-Action Hook + moveSettle pan ke karton 90RB
  { id: 'b1-hook-utoh', from: 0, pose: POSE_HOOK_UTOH, note: 'Frame 0 mid-action aduk dandang', dof: 0.25, target: U_FACE },
  { id: 'b1-pan-karton', from: 54, pose: POSE_HOOK_PAN, move: 'settle', startPose: POSE_HOOK_UTOH, glide: 24, note: 'moveSettle ke karton 90RB & SUDAH DAPAT KARYAWAN', dof: 0.25, target: EP04_SPOTS.cartSign },
  // B2: Reveal Atasan Shift Malam
  { id: 'b2-two-tio', from: T('T1').startFrame - 6, pose: POSE_TWO_UTOH_TIO, move: 'settle', startPose: POSE_TWO_START, glide: 22, note: 'Two-shot Utoh & Tio: atasan shift malam', dof: 0.2, target: [-12.55, 1.45, 18.0] },
  { id: 'b2-oyen-reveal', from: EP04_OYEN_REVEAL_FROM, pose: POSE_OYEN_REVEAL, move: 'pullout', startPose: POSE_MANDOR_MACRO, holdMacro: 4, glide: 10, note: 'pullOutReveal MANDOR QC -> Oyen + piring VIP', dof: 0.4, target: O_FACE },
  { id: 'b2-utoh-qc', from: EP04_U3_SHOCK_FRAME, pose: POSE_UTOH_CU, note: 'Utoh shock: Mandor QC-nya kucing?!', dof: 0.5, target: U_FACE },
  { id: 'b2-tio-senior', from: T('T2').startFrame - 4, pose: POSE_TIO_SINGLE, note: 'Tio: Karyawan senior, bergaji ayam', dof: 0.45, target: T_FACE },
  // B3: Pak Ujang + topDownInsert 90° flat-lay
  { id: 'b3-ujang-enter', from: EP04_UJANG_ENTER_FROM, pose: POSE_UJANG_WIDE, move: 'settle', startPose: POSE_UJANG_WIDE_START, glide: 28, note: 'Pak Ujang planted walk & duduk', dof: 0.15, target: PU_FACE },
  { id: 'b3-topdown-mie', from: T('U5').startFrame - 4, pose: POSE_TOPDOWN_MIE, note: 'Close-up eye-level racik mie + cakar Oyen PLAK!', dof: 0.25, target: EP04_SPOTS.bowlUjang },
  { id: 'b3-tio-potong', from: T('T3').startFrame - 4, pose: POSE_TIO_SINGLE, note: 'Tio: Tambahin ayamnya, potong bon lo', dof: 0.45, target: T_FACE },
  { id: 'b3-utoh-lho', from: EP04_U6_SHOCK_FRAME, pose: POSE_UTOH_CU, note: 'Utoh shock: Kok malah potong bon gue?!', dof: 0.5, target: U_FACE },
  // B4: Mbak Yuni + Poster Karyawan Terbaik
  { id: 'b4-yuni-1', from: T('Y1').startFrame - 8, pose: POSE_YUNI, move: 'settle', startPose: POSE_YUNI_START, glide: 20, note: 'Mbak Yuni menyindir dari gerobak es buah', dof: 0.45, target: Y_FACE },
  { id: 'b4-utoh-protes', from: T('U7').startFrame - 4, pose: POSE_UTOH_WIDE, note: 'Utoh protes menunjuk Oyen (skeptical->nervous->angry)', dof: 0.35, target: U_FACE },
  { id: 'b4-oyen-flat', from: T('O3').startFrame - 8, pose: POSE_OYEN_CU, note: 'Oyen meong datar pendek', dof: 0.45, target: O_FACE },
  { id: 'b4-tio-terharu', from: T('T4').startFrame - 4, pose: POSE_TIO_SINGLE, note: 'Tio terharu: jiwa pemimpin kuat', dof: 0.45, target: T_FACE },
  { id: 'b4-poster-insert', from: EP04_POSTER_FROM, pose: POSE_POSTER_INSERT, note: 'Insert makro poster KARYAWAN TERBAIK BULAN INI', dof: 0.25, target: EP04_SPOTS.bestEmployee },
  {
    id: 'b4-orbit-utoh',
    from: EP04_POSTER_FROM + 18,
    pose: POSE_UTOH_WIDE,
    move: 'orbit',
    orbit: { center: [-13.06, 1.54, 18.4], radius: 3.1, azFrom: -189, azTo: -181, y: 1.54, fov: 40, frames: 20 },
    note: 'orbitArc pendek bersih ke Utoh tired',
    dof: 0.35,
    target: [-13.06, 1.58, 18.4],
  },
  // B5: Multithreading + strikeEnvelope + KEPALA MANDOR
  { id: 'b5-tio-order', from: T('T5').startFrame - 6, pose: POSE_TIO_SINGLE, note: 'Tio: Tiga pesanan masuk barengan', dof: 0.45, target: T_FACE },
  { id: 'b5-utoh-multi', from: T('U9').startFrame - 4, pose: POSE_UTOH_WIDE, note: 'Utoh planted lateral step fokus', dof: 0.35, target: U_FACE },
  { id: 'b5-deploy-1', from: EP04_DEPLOY_FRAMES[0] - 4, pose: POSE_DEPLOY_1, note: 'Deploy #1 + strikeEnvelope', dof: 0.3, target: U_FACE },
  { id: 'b5-deploy-2', from: EP04_DEPLOY_FRAMES[1] - 4, pose: POSE_DEPLOY_2, note: 'Deploy #2 + kick', dof: 0.35, target: U_FACE },
  { id: 'b5-deploy-3', from: EP04_DEPLOY_FRAMES[2] - 4, pose: POSE_DEPLOY_3, note: 'Deploy #3 + kick', dof: 0.4, target: U_FACE },
  { id: 'b5-promote-stage', from: T('T6').startFrame - 4, pose: POSE_PROMOTE_STAGE, note: '3 mangkok jadi + Tio balik papan KEPALA MANDOR', dof: 0.25, target: U_FACE },
  // B6: Ketenangan Semu Sebelum Badai
  { id: 'b6-ujang-exit', from: T('PU2').startFrame - 6, pose: POSE_EXIT_WIDE, note: 'Pak Ujang bayar & jalan keluar planted', dof: 0.15, target: PU_FACE },
  { id: 'b6-utoh-lega', from: T('U10').startFrame - 6, pose: POSE_UTOH_WIDE, note: 'Utoh happy bangga menagih lunas 90RB', dof: 0.35, target: U_FACE },
  // B7: Punchline Slip Gaji 120RB
  { id: 'b7-handover', from: T('T7').startFrame - 8, pose: POSE_HANDOVER, move: 'settle', startPose: POSE_HANDOVER_START, glide: 20, note: 'Tio menyodorkan Slip Gaji Shift 1', dof: 0.25, target: [-12.5, 1.42, 18.0] },
  { id: 'b7-slip-insert', from: EP04_SLIP_FROM, pose: POSE_SLIP_INSERT, note: 'Makro Frontal 3D SLIP GAJI 120RB + cap cakar Oyen', dof: 0.15, target: EP04_SPOTS.slipInsert },
  { id: 'b7-utoh-shock', from: EP04_SLIP_TO, pose: POSE_UTOH_EAST_CU, note: 'Utoh shock mematung: naik 120rb?!', dof: 0.5, target: U_FACE },
  { id: 'b7-tio-fee', from: T('T8').startFrame - 4, pose: POSE_TIO_SINGLE, note: 'Tio merinci potongan ayam VIP + training', dof: 0.45, target: T_FACE },
  { id: 'b7-oyen-puas', from: T('O4').startFrame - 10, pose: POSE_OYEN_CU, note: 'Oyen slow-blink puas + jilat cakar', dof: 0.45, target: O_FACE },
  // B8: Callback & Seamless Loop (identik f0!)
  { id: 'b8-hook-loop', from: EP04_LOOP_POSE_FROM, pose: POSE_HOOK_UTOH, note: 'Callback & seamless hard-cut loop ke f0', dof: 0.25, target: U_FACE },
];

export const TOP_DOWN_SHOT_IDS = new Set(DEFS.filter((d) => d.isTopDown).map((d) => d.id));

export const SHOTS: Shot[] = DEFS.map((d, i) => ({
  id: d.id,
  from: d.from,
  to: i + 1 < DEFS.length ? DEFS[i + 1].from : TOTAL_FRAMES,
  light: EP04_LIGHT_ID,
  note: d.note,
  transition: 'cut',
}));

export const CAMS: CamKey[] = DEFS.flatMap((d) => {
  if (d.move === 'settle' && d.startPose) return moveSettle(d.from, d.startPose, d.pose, d.glide ?? 24);
  if (d.move === 'pullout' && d.startPose) return pullOutReveal(d.from, d.holdMacro ?? 10, d.startPose, d.pose, d.glide ?? 16);
  if (d.move === 'orbit' && d.orbit) {
    const o = d.orbit;
    return orbitArc(d.from, o.center, o.radius, o.azFrom, o.azTo, o.y, o.fov, o.frames);
  }
  return [{ frame: d.from, pose: d.pose, cut: true, creepRate: 0 }];
});

export const DOF: Record<string, number> = Object.fromEntries(DEFS.map((d) => [d.id, d.dof]));
export const DOF_TARGET: Record<string, Vec3> = Object.fromEntries(DEFS.map((d) => [d.id, d.target]));

export const KICKS: Kick[] = [
  { frame: EP04_U3_SHOCK_FRAME, strength: 0.025, length: 7 },
  { frame: EP04_FLATLAY_PAW_IMPACT, strength: 0.026, length: 7 },
  { frame: EP04_U6_SHOCK_FRAME, strength: 0.028, length: 7 },
  { frame: EP04_POSTER_IMPACT, strength: 0.024, length: 6 },
  { frame: EP04_DEPLOY_FRAMES[0], strength: 0.022, length: 6 },
  { frame: EP04_DEPLOY_FRAMES[1], strength: 0.024, length: 6 },
  { frame: EP04_DEPLOY_FRAMES[2], strength: 0.03, length: 7 },
  { frame: EP04_U11_SHOCK_FRAME, strength: 0.032, length: 8 },
];
