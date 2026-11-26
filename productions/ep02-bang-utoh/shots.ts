import type { CamKey, CamPose, Kick, Shot, Vec3 } from '../../engine';
import { lerp3 } from '../../engine';
import {
  EP02_B5_SPRINT_START,
  EP02_OYEN_STEP1_FRAME,
  EP02_OYEN_STEP2_FRAME,
  EP02_OYEN_WALK_KB_FROM,
  EP02_PLAK_FRAME,
  EP02_PROJECTOR_RUN_FRAME,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_SCREEN_OK_FRAME,
  EP02_TASKBAR_ALARM_FRAME,
  actorPositionAt,
  oyenPositionAt,
} from './cast';
import { EP02_SPOTS } from './set';
import { BEATS, EP02_FRAMES, WORDS, lineById, nonverbalOf } from './words';

export const FPS = 30;

const B1 = BEATS[0];
const B2 = BEATS[1];
const B3 = BEATS[2];
const B4 = BEATS[3];
const B5 = BEATS[4];
const B6 = BEATS[5];
const B7 = BEATS[6];

const L_S1 = lineById('S1');
const L_S2 = lineById('S2');
const L_U3 = lineById('U3');
const L_U5 = lineById('U5');
const L_S3 = lineById('S3');
const L_U7 = lineById('U7');
const L_R1 = lineById('R1');
const L_R2 = lineById('R2');
const L_R3 = lineById('R3');
const L_U9 = lineById('U9');

const W_LAP = EP02_SPOTS.warkop.laptop; // [-1.56, 0.77, 0.49]
const W_SITI = EP02_SPOTS.warkop.buSiti; // [-0.12, 0.4, -2.25] (kasir di atas riser, v6.1)
const L_UTOH = EP02_SPOTS.lab.utoh; // [0.08, 0, -1.35]
const L_RARA = EP02_SPOTS.lab.raraAtDesk; // [1.46, 0, -2.02] (bebas 100% dari KP2_LectDesk!)
const L_OYEN = EP02_SPOTS.lab.oyen; // [2.3, 0.76, -2.55]
const L_SCR = EP02_SPOTS.lab.screen; // [0, 1.9, -3.5]

/** Tinggi mata (m) kartu karakter, dikalibrasi dari still render. */
const EYE_UTOH_STAND = 1.24;
const EYE_UTOH_SIT = 1.1;
const EYE_RARA = 1.15;
const EYE_OYEN = 0.28;

// ---------------------------------------------------------------------------------------------
// Frame kunci turunan (nol hardcode angka frame)
// ---------------------------------------------------------------------------------------------

const wordStart = (speaker: string, text: string, from: number): number => {
  const w = WORDS.find((x) => x.speaker === speaker && x.text.startsWith(text) && Math.round(x.start * FPS) >= from);
  if (!w) throw new Error(`Kata ${text} (${speaker}) tidak ada setelah f${from}`);
  return Math.round(w.start * FPS);
};

/**
 * B1 (v6.1 G3, selevel mata): Insert 3/4 laptop ERROR 47 + Si Oyen utuh (diam mantap, "Error 47 semalem") -> hard cut
 * tepat setelah "semalem" ke Medium Utoh selevel mata dari kanan-depan ("WiFi kos mati,"; Oyen, Bu Siti, papan MENU
 * 100% di luar frame) -> hard cut 2f sebelum "ngungsi" ke Stage Warkop (Bu Siti utuh di kasir sejak frame pertama).
 * Pull-out/crane lama (kamera naik ke 3,5 m, tunduk 49°) dihapus: semua kamera episode selevel mata (lihat tes tunduk).
 */
export const EP02_B1_WIFI_FROM = Math.round(WORDS.find((w) => w.speaker === 'bangUtoh' && w.text.startsWith('semalem'))!.end * FPS) + 1; // f54
export const EP02_B1_STAGE_FROM = wordStart('bangUtoh', 'ngungsi', B1.from) - 2; // f138

/** B3 PLAK: Push-in tegas dimulai SETELAH "Ngopi dulu." selesai (`L_S1.endFrame + 2`), tiba tepat di `PLAK!`. */
export const EP02_PLAK_ROLL_FROM = L_S1.endFrame + 2;
const PLAK_PUSH_GLIDE = Math.max(16, EP02_PLAK_FRAME - EP02_PLAK_ROLL_FROM);

/** B6 Enter KLAK: CU ancang-ancang Enter sebelum benturan KLAK. */
export const EP02_ENTER_CU_FROM = EP02_PROJECTOR_RUN_FRAME - 24;

/** Jeda tajam R2 ("Kodenya juga... | nol."): clean comedic punch-in +18% 4 frame sebelum kata "nol". */
export const EP02_R2_PAUSE = nonverbalOf('R2', 1);
export const EP02_R2_PUNCH_FRAME = EP02_R2_PAUSE.endFrame - 4;
export const EP02_R2_PUNCH_SCALE = 1.18;

/** Reaksi kekehan sinis Mbak Rara di akhir R2 (`NV_R2_CHUCKLE`, ~0,70 dtk sebelum B7). */
export const EP02_R2_CHUCKLE = nonverbalOf('R2', 2);
export const EP02_R2_CHUCKLE_FROM = EP02_R2_CHUCKLE.startFrame - 2;

/** Desahan tengah R3: batas two-shot "Nilai A..." -> tight deadpan lurus Rara "Kamu minggu depan...". */
export const EP02_R3_SIGH = nonverbalOf('R3', 0);
export const EP02_R3_SPLIT_FRAME = Math.round((EP02_R3_SIGH.startFrame + EP02_R3_SIGH.endFrame) / 2);

/** B7 U9 Finale: push-in tegas 18f mendarat tepat di "Oyen!" + kick -> settle diam mantap s.d. loop f0. */
export const EP02_U9_IMPACT_FRAME = wordStart('bangUtoh', 'Oyen', L_U9.startFrame);
export const EP02_U9_SIGH = nonverbalOf('U9', 0);
export const EP02_U9_RELAX_FRAME = EP02_U9_IMPACT_FRAME;

/** Eye-line match keluar Replay: glide 24f membingkai mata Oyen utuh seperti frame pertama `b7-oyen-meong`. */
const REPLAY_EYELINE_GLIDE = 24;

/** B5: High-angle establishing -> Smooth Crane-Down 38f -> Pure Horizontal Side-Scrolling Tracking (0 dolly zoom). */
export const EP02_B5_CRANE_TO = B5.from + 38;

/**
 * EP02 "Konsultan Oyen" — FINAL MASTER v6.1 (Sinematika Kamera Gaya Referensi):
 * 1. ZERO SLOW ZOOM-IN: `creepRate: 0` di 100% hold dialog, reaksi, dan panggung.
 * 2. MOVE -> SETTLE TEGAS: setiap gerakan kamera bermotivasi (pull-out reveal, lateral pan kopi,
 *    push-in PLAK, cut+push-in Bu Siti heran (v6.1), dolly-in Oyen, pan Bu Siti konter, crane-down->side-scroll B5,
 *    pan Rara+Oyen, eye-line replay, push-in finale) lalu BERHENTI MANTAP.
 * 3. HORIZON LURUS (`roll: 0`): panggung simetris, papan `MENU WARKOP`, `WARKOP 24 JAM`, & `LAB KOMPUTER FIK 2.1`
 *    utuh 100%, Bu Siti proporsional di kasir (`y=0,4 m`), latar Rara bebas kotak hijau `OUTPUT` di kepala.
 */
export const SHOTS: Shot[] = [
  // B1 Hook & Smooth 3D Pull-Out Reveal
  { id: 'b1-macro-laptop', from: B1.from, to: EP02_B1_WIFI_FROM, light: 'warkop-layar', note: 'Insert 3/4 selevel mata laptop ERROR 47 + Oyen utuh (diam mantap): Error 47 semalem' },
  { id: 'b1-utoh-wifi', from: EP02_B1_WIFI_FROM, to: EP02_B1_STAGE_FROM, light: 'warkop-pagi', note: 'Hard cut: Medium-wide selevel mata Utoh dominan + Oyen + Bu Siti utuh, MENU utuh (diam mantap): WiFi kos mati,' },
  { id: 'b1-stage-warkop', from: EP02_B1_STAGE_FROM, to: B2.from, light: 'warkop-pagi', note: 'Hard cut di "ngungsi": Full-body Symmetrical Stage Warkop (diam mantap, MENU WARKOP utuh, Bu Siti utuh di kasir)' },

  // B2 Deadline & Kopi ke-4
  { id: 'b2-utoh-panik', from: B2.from, to: B2.from + 105, light: 'warkop-pagi', note: 'Clean Centered Medium Utoh panik (roll 0, diam mantap, headphone & tangan utuh)' },
  { id: 'b2-coffee-dolly', from: B2.from + 105, to: L_S1.startFrame - 6, light: 'warkop-pagi', note: 'Smooth Lateral Pan Kiri->Kanan (32f -> settle) menyusuri 4 gelas kopi & uap' },
  { id: 'b2-stage-siti', from: L_S1.startFrame - 6, to: EP02_PLAK_ROLL_FROM, light: 'warkop-pagi', note: 'Symmetrical Three-Shot Warkop (diam mantap saat Bu Siti hirup kopi & Ngopi dulu)' },

  // B3 Solusi Salah #1: TV Tabung — PLAK!
  { id: 'b3-stage-plak', from: EP02_PLAK_ROLL_FROM, to: EP02_PLAK_FRAME + 16, light: 'warkop-pagi', note: 'Push-In Tegas 16f ke PLAK + Kick 7f tajam -> settle bohlam berayun (roll 0)' },
  { id: 'b3-macro-48', from: EP02_PLAK_FRAME + 16, to: L_S2.startFrame + 56, light: 'warkop-layar', note: 'Macro Insert 3D Laptop ERROR 48 (+1!) diam mantap (nol slow zoom)' },
  { id: 'b3-stage-heran', from: L_S2.startFrame + 56, to: L_U3.startFrame - 6, light: 'warkop-pagi', note: 'Hard cut ke Medium Bu Siti utuh -> Push-In 28f (settle) ke wajah polos (tanpa sapuan masuk tepi frame)' },
  { id: 'b3-cu-protes', from: L_U3.startFrame - 6, to: B4.from, light: 'warkop-layar', note: 'Clean Centered CU Utoh protes bukan TV tabung (diam mantap, utuh 100%)' },

  // B4 Solusi Ajaib #2: Konsultan Oyen
  { id: 'b4-stage-nyerah', from: B4.from, to: EP02_OYEN_WALK_KB_FROM - 10, light: 'warkop-pagi', note: 'Symmetrical Stage Warkop (diam mantap): Utoh jongkok kiri (48 utuh!) + Bu Siti konter proporsional' },
  { id: 'b4-oyen-walk-kb', from: EP02_OYEN_WALK_KB_FROM - 10, to: EP02_SCREEN_OK_FRAME, light: 'warkop-layar', note: 'Hard cut (cahaya layar berganti di cut) -> Push-In 26f (<= 25 px/f) ke meja: Oyen tekan cakar kiri *tek tek*' },
  { id: 'b4-macro-0error', from: EP02_SCREEN_OK_FRAME, to: L_U5.startFrame + 16, light: 'warkop-layar', note: 'Macro Settled (diam mantap + kick mikro): layar hijau ✓ 0 ERROR + Oyen utuh' },
  { id: 'b4-stage-girang', from: L_U5.startFrame + 16, to: L_S3.startFrame - 6, light: 'warkop-pagi', note: 'Symmetrical Stage Warkop (diam mantap): Utoh lompat girang kiri + ✓ 0 ERROR + Bu Siti konter' },
  { id: 'b4-siti-konsultan', from: L_S3.startFrame - 6, to: EP02_TASKBAR_ALARM_FRAME, light: 'warkop-pagi', note: 'Hard cut 6f sebelum S3 -> Push-In 26f (<= 25 px/f) ke Bu Siti di konter frontal (dada+bahu+gelas utuh, MENU WARKOP utuh)' },
  { id: 'b4-taskbar-0658', from: EP02_TASKBAR_ALARM_FRAME, to: B5.from, light: 'warkop-layar', note: 'Macro Alarm 06:58 diam mantap berdenyut + kick alarm -> match-cut B5' },

  // B5 Kejar Waktu ke Lab FIK — Crane-Down -> Pure Horizontal Side-Scrolling Tracking (0 dolly zoom)
  { id: 'b5-establish', from: B5.from, to: EP02_B5_SPRINT_START, light: 'kampung-siang', note: 'High-Angle Establishing WARKOP 24 JAM utuh -> Smooth Crane-Down' },
  { id: 'b5-sprint', from: EP02_B5_SPRINT_START, to: B6.from, light: 'kampung-siang', note: 'Pure Horizontal Side-Scrolling Tracking (0 dolly zoom, Utoh ~38%, aspal ≤ 18%)' },

  // B6 Klimaks Demo Lab FIK
  { id: 'b6-stage-lab', from: B6.from, to: L_U7.startFrame + 82, light: 'lab-led', note: 'Clean Symmetrical Stage Lab (LAB KOMPUTER FIK 2.1 utuh, diam mantap)' },
  { id: 'b6-utoh-smug', from: L_U7.startFrame + 82, to: L_R1.startFrame - 6, light: 'lab-led', note: 'Clean Medium Utoh Smug (diam mantap): Nol error!' },
  { id: 'b6-rara-run', from: L_R1.startFrame - 6, to: EP02_ENTER_CU_FROM, light: 'lab-led', note: 'Hard cut 6f sebelum R1 -> Push-In 26f (<= 25 px/f) ke Two-Shot Rara+Oyen (bebas OUTPUT di kepala)' },
  { id: 'b6-enter-klak', from: EP02_ENTER_CU_FROM, to: EP02_PROJECTOR_RUN_FRAME, light: 'lab-led', note: 'CU Utoh Enter KLAK (diam mantap + kick tajam di Enter)' },
  { id: 'b6-screen-mmmm', from: EP02_PROJECTOR_RUN_FRAME, to: L_R2.startFrame - 4, light: 'lab-proyektor', note: 'Symmetrical Full Projector 1 mmmmmmmmmeeeeeeeeeeeeeee| + kursor kedip (diam mantap)' },
  { id: 'b6-stage-nol', from: L_R2.startFrame - 4, to: L_R2.startFrame + 64, light: 'lab-led', note: 'Symmetrical Stage Lab (diam mantap): Emang nol error, To.' },
  { id: 'b6-cu-blank', from: L_R2.startFrame + 64, to: EP02_R2_PUNCH_FRAME, light: 'lab-proyektor', note: 'CU Lurus Utoh pucat (diam mantap): Kodenya juga...' },
  { id: 'b6-punch-nol', from: EP02_R2_PUNCH_FRAME, to: EP02_R2_CHUCKLE_FROM, light: 'lab-proyektor', note: 'Crisp Comedic Punch-In Cut (+18%, diam mantap) tepat di kata "nol."' },
  { id: 'b6-rara-chuckle', from: EP02_R2_CHUCKLE_FROM, to: B7.from, light: 'lab-led', note: 'Crisp Reaction Cut CU Mbak Rara smug + kekeh sinis (diam mantap, bebas OUTPUT di kepala)' },

  // B7 Replay Bukti + Double Punchline + Hero Settle Loop
  { id: 'b7-cu-tanya', from: B7.from, to: EP02_REPLAY_FROM, light: 'lab-proyektor', note: 'Clean 3/4 CU Utoh melotot tanya (diam mantap): Yen!' },
  { id: 'b7-replay-sepia', from: EP02_REPLAY_FROM, to: EP02_REPLAY_TO, light: 'warkop-layar', note: 'Cross-Dissolve 10f -> Macro Replay Sepia diam mantap -> 24f Eye-Line Glide -> Dissolve 8f' },
  { id: 'b7-oyen-meong', from: EP02_REPLAY_TO, to: L_R3.startFrame - 6, light: 'lab-siluet', note: 'Hero CU Si Oyen (diam mantap di atas subtitle): kedip 14f -> Meong.' },
  { id: 'b7-rara-nilai', from: L_R3.startFrame - 6, to: EP02_R3_SPLIT_FRAME, light: 'lab-led', note: 'Two-Shot Rara + Oyen (diam mantap): Nilai A buat konsultan kamu' },
  { id: 'b7-rara-ngulang', from: EP02_R3_SPLIT_FRAME, to: L_U9.startFrame - 6, light: 'lab-led', note: 'Clean Centered CU Rara (diam mantap, buku+pena utuh, bebas OUTPUT di kepala)' },
  { id: 'b7-cu-outro', from: L_U9.startFrame - 6, to: EP02_FRAMES, light: 'lab-proyektor', note: 'Confident Push-In 18f ke Aduh Oyen! + kick -> Settle diam mantap (roll 0) -> hard-cut loop f0' },
];

// ---------------------------------------------------------------------------------------------
// Helper pose
// ---------------------------------------------------------------------------------------------

const withFov = (p: CamPose, fov: number, roll = p.roll): CamPose => ({ ...p, fov, roll });
/** Pose yang sama ditarik mundur sepanjang sumbu pandang (k > 1) -> titik awal push-in pendek setelah hard cut. */
const pulledBack = (p: CamPose, k: number): CamPose => ({
  ...p,
  pos: [0, 1, 2].map((i) => p.look[i] + (p.pos[i] - p.look[i]) * k) as Vec3,
});
/** Push-in pendek setelah cut (pengganti glide/pan lintas ruang > 25 px/f). */
export const EP02_CUT_PUSH_GLIDE = 26;

// ---------------------------------------------------------------------------------------------
// B5: High-Angle Establishing -> Smooth Crane-Down -> Pure Horizontal Side-Scrolling (0 zoom!)
// ---------------------------------------------------------------------------------------------

const B5_SMOOTH = 10;
const B5_LEAD = 0.16;
/** ZERO slow dolly zoom-in selama tracking horizontal B5 (v6.1 Law #1 & #4)! */
export const B5_DOLLY_IN = 0;

/**
 * B5_CRANE: High-angle establishing depan Warkop (`WARKOP 24 JAM` 100% utuh + margin lega kanan-kiri + Utoh & Oyen).
 */
const B5_CRANE: { pos: Vec3; look: Vec3; fov: number } = { pos: [0.52, 2.74, 6.45], look: [0.52, 1.44, -1.0], fov: 53 };
/**
 * B5_DOLLY: Pure side-scrolling tracking (~6,05 m, fov 47°) -> Utoh ~38% tinggi layar, aspal bawah ≤ 18%!
 */
const B5_DOLLY: { pos: Vec3; look: Vec3; fov: number } = { pos: [0, 1.72, 6.05], look: [0, 1.66, -0.4], fov: 47 };

const b5Raw = (f: number): Vec3 => {
  const c = Math.min(B5.to - 1, Math.max(B5.from, f));
  const u = actorPositionAt('bangUtoh', c);
  const o = oyenPositionAt(c);
  return [(u[0] + o[0]) / 2, 0, (u[2] + o[2]) / 2];
};

export function b5Target(f: number): Vec3 {
  let sx = 0;
  let sz = 0;
  let sw = 0;
  for (let k = -B5_SMOOTH; k <= B5_SMOOTH; k++) {
    const w = B5_SMOOTH + 1 - Math.abs(k);
    const p = b5Raw(f + k);
    sx += p[0] * w;
    sz += p[2] * w;
    sw += w;
  }
  return [sx / sw, 0, sz / sw];
}

const craneProgress = (t: number, m0 = 1): number => {
  const x = Math.min(1, Math.max(0, t));
  return m0 * (x - 2 * x * x + x * x * x) + (3 * x * x - 2 * x * x * x);
};

export function b5PoseAt(f: number): CamPose {
  const t = b5Target(f);
  const w = craneProgress((f - B5.from) / (EP02_B5_CRANE_TO - B5.from));
  const v = (b5Target(f + 1)[0] - b5Target(f - 1)[0]) / 2;
  const lead = B5_LEAD * Math.tanh((v * 3) / B5_LEAD);
  const off = lerp3(B5_CRANE.pos, B5_DOLLY.pos, w);
  const lk = lerp3(B5_CRANE.look, B5_DOLLY.look, w);
  return {
    pos: [t[0] + off[0] + lead * 0.5, off[1], t[2] + off[2]],
    look: [t[0] + lk[0] + lead, lk[1], t[2] + lk[2]],
    fov: B5_CRANE.fov + (B5_DOLLY.fov - B5_CRANE.fov) * w,
    roll: 0,
  };
}

const B5_KEYS: CamKey[] = [];
for (let f = B5.from; f < B6.from; f++) {
  B5_KEYS.push(
    f === B5.from
      ? { frame: f, cut: true, creepRate: 0, pose: b5PoseAt(f) }
      : { frame: f, glide: 1, creepRate: 0, pose: b5PoseAt(f) },
  );
}

// ---------------------------------------------------------------------------------------------
// Pose kunci terkalibrasi (semua hold = creepRate: 0, horizon lurus roll: 0!)
// ---------------------------------------------------------------------------------------------

/** B1 Insert selevel mata (tunduk 3,9°): layar laptop ERROR 47 (~0,86 lebar frame) + Si Oyen utuh, Bu Siti & Utoh di luar. */
const B1_MACRO_LAPTOP: CamPose = { pos: [-0.65, 1.1, 2.5], look: [-1.375, 0.95, 0.45], fov: 34, roll: 0 };
/**
 * B1 Medium-wide selevel mata (kamera 1,1 m, tunduk 1,7°), sedikit dari kiri: Utoh utuh dominan (laptop di belakang
 * lengannya = oklusi alami, tidak terpotong tepi), Oyen utuh,
 * Bu Siti utuh di kasir (terpisah dari Oyen) dan teks MENU WARKOP utuh. Medium dari kanan-depan selalu memotong layar
 * laptop di tepi (Utoh menunjuk ke laptop), jadi dipilih komposisi yang memuat semuanya utuh sejak frame pertama.
 */
export const B1_UTOH_WIFI: CamPose = { pos: [-2.0, 1.1, 4.6], look: [-1.625, 1.0, 1.18], fov: 44, roll: 0 };

/** Stage Symmetrical Warkop (B1, B2, B4): Utoh kiri (-1,92..-2,04), laptop+Oyen tengah, Bu Siti kanan (kasir -0,12 / sisi meja -0,62..-0,68) 100% utuh! */
const WARKOP_STAGE: CamPose = { pos: [-1.26, 1.48, 5.48], look: [-1.26, 1.34, 0.55], fov: 49.5, roll: 0 };
/** B3 PLAK Push-In tegas (16f): sedikit merapat ke ayunan Bu Siti + 3 tokoh (tangan kiri Utoh utuh!) & bohlam utuh! */
const WARKOP_PLAK_PUSH: CamPose = { pos: [-1.32, 1.48, 5.2], look: [-1.32, 1.34, 0.55], fov: 48.5, roll: 0 };

/** B2 Lateral Pan 4 gelas kopi di sisi KIRI laptop -> uap kopi & jam laptop 06:45 (<= 22 px/f). */
const COFFEE_A: CamPose = { pos: [-1.98, 1.08, 2.02], look: [-1.96, 0.85, 0.5], fov: 32, roll: 0 };
const COFFEE_B: CamPose = { pos: [-1.76, 1.08, 2.0], look: [-1.74, 0.87, 0.5], fov: 32, roll: 0 };

/**
 * B3 Macro 48 -> hard cut ke Medium Close-Up 3/4 Bu Siti dari kiri-depan (reverse dari CU Utoh b3-cu-protes; sudah utuh
 * di frame) -> Push-In kecil 1,08x 28f (`dolly`) -> settle di wajah polos. Oyen (di belakang-kiri Bu Siti) 100% di luar
 * tepi kiri, papan MENU di luar frame (nol teks terpotong) sepanjang shot. v6.1: pan lama 32f dari laptop menyapu Bu Siti masuk dari tepi kanan (80 px/f) dan Oyen
 * terpotong tepi kiri -> diganti cut.
 */
const B3_MACRO_48: CamPose = { pos: [-1.48, 1.04, 1.86], look: [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.08], fov: 30, roll: 0 };
const B3_SITI_HERAN: CamPose = { pos: [-1.8, 1.3, 2.2], look: [-0.76, 1.25, 0.94], fov: 44, roll: 0 };
const B3_SITI_OPEN_K = 1.08;
const B3_SITI_OPEN: CamPose = {
  ...B3_SITI_HERAN,
  pos: [0, 1, 2].map((i) => B3_SITI_HERAN.look[i] + (B3_SITI_HERAN.pos[i] - B3_SITI_HERAN.look[i]) * B3_SITI_OPEN_K) as Vec3,
};

/** B4 Macro Laptop + Oyen (3D Dolly-In dari WARKOP_STAGE -> settle mantap untuk *tek tek* & ✓ 0 ERROR). */
const B4_MACRO_OYEN: CamPose = { pos: [-1.37, 1.05, 2.66], look: [-1.37, 0.91, 0.48], fov: 37, roll: 0 };
/**
 * B4 *tek tek* (v6.1): insert 3/4 dari kanan-depan khusus b4-oyen-walk-kb + b4-macro-0error (Replay tetap B4_MACRO_OYEN).
 * Siluet jongkok Utoh TERUKUR dari still f880 (kepala+headphone condong ±0,42 m dari pusat kartu, y 0,3..1,25 m) kini
 * >= 0,1 NDC di luar tepi kiri di setiap frame f870–951 — pose lama (pos.x -1,37) menyisakan sliver kepala di tepi kiri.
 * Laptop 48 + Oyen (jalan & duduk) utuh, gelas ke-4 jauh dari Oyen. Dolly lintas ruang lama (55,6 px/f + pop cahaya
 * pagi->layar tanpa cut) -> hard cut f870 ke pose ini ditarik 1,1x + push-in 26f.
 */
export const B4_KB_OYEN: CamPose = { pos: [-0.85, 1.2, 2.66], look: [-1.32, 0.91, 0.48], fov: 39, roll: 0 };
const B4_OYEN_OPEN_K = 1.1;

/**
 * B4 Bu Siti di balik konter (`W_SITI = [-0.12, 0.4, -2.25]`): kamera frontal yaw 0° (pos.x = look.x, roll 0) — tidak
 * lagi pos.x -0,36 hardcode vs look W_SITI (yaw 3,7°). Sumbu digeser 0,30 m ke kiri dari Bu Siti agar SELURUH teks
 * papan MENU WARKOP (x -1,36..-0,34) tetap utuh di frame; sumbu tepat di W_SITI[0] memotong "MENU WARKOP" di tepi kiri.
 * Bu Siti di garis sepertiga kanan (NDC ≈ +0,33), dada+bahu+gelas utuh.
 */
export const B4_SITI_AXIS_X = W_SITI[0] - 0.3;
export const B4_SITI_COUNTER: CamPose = { pos: [B4_SITI_AXIS_X, 1.5, 1.48], look: [B4_SITI_AXIS_X, 1.34, W_SITI[2]], fov: 47, roll: 0 };
/** v6.1: pan lintas ruang dari stage (57 px/f) -> hard cut di awal S3 ke pose ini ditarik 1,12x + push-in pendek. */
const B4_SITI_OPEN_K = 1.12;

/** B6 Medium Utoh -> Smooth Lateral Pan Kanan ke Two-Shot Rara+Oyen (pos.x=1,52, pos.y=1,56 bebas OUTPUT di kepala!). */
const B6_UTOH_SMUG: CamPose = { pos: [0.08, 1.5, 2.38], look: [L_UTOH[0], 1.38, L_UTOH[2]], fov: 42, roll: 0 };
const B6_RARA_TWOSHOT: CamPose = { pos: [1.54, 1.56, 1.72], look: [1.8, 1.16, -2.2], fov: 43, roll: 0 };
/**
 * Stage Lab simetris v6.1 (b6-stage-lab & b6-stage-nol): sumbu frontal x=0,9 (yaw 0), fov 56 -> papan
 * `LAB KOMPUTER FIK 2.1`, Utoh, Rara, dan Oyen di meja dosen (x=2,3) SEMUA utuh (pose lama memotong Oyen di tepi kanan).
 */
/** v6.1: pan Utoh->Rara (53 px/f) -> hard cut 6f sebelum R1 ke two-shot ditarik 1,12x + push-in pendek. */
const B6_RARA_OPEN_K = 1.12;
const LAB_STAGE: CamPose = { pos: [0.9, 1.55, 3.8], look: [0.9, 1.5, -1.9], fov: 56, roll: 0 };

/** B6 CU Blank -> Crisp +18% Comedic Punch-In Cut tepat di kata "nol." (sumbu identik, diam mantap). */
const CU_BLANK: CamPose = { pos: [0.08, 1.38, 1.48], look: [L_UTOH[0], 1.16, L_UTOH[2]], fov: 37, roll: 0 };
const PUNCH_FOV =
  (2 * Math.atan(Math.tan((CU_BLANK.fov * Math.PI) / 360) / EP02_R2_PUNCH_SCALE) * 180) / Math.PI;

/** B6/B7 CU Mbak Rara (pos.x=1,14, pos.y=1,56 -> kotak hijau OUTPUT bergeser bersih ke kiri luar kepala!). */
const RARA_CHUCKLE_CU: CamPose = { pos: [1.14, 1.56, 0.35], look: [L_RARA[0], 1.14, L_RARA[2]], fov: 35, roll: 0 };
const RARA_NGULANG_CU: CamPose = { pos: [1.14, 1.56, 0.25], look: [L_RARA[0], 1.12, L_RARA[2]], fov: 34, roll: 0 };

/** Mata Oyen di Lab & di Replay (posisi kartu Replay = [-1.26, 0.77, 0.48]). */
export const EP02_OYEN_EYE_LAB: Vec3 = [L_OYEN[0], L_OYEN[1] + EYE_OYEN, L_OYEN[2]];
export const EP02_OYEN_EYE_REPLAY: Vec3 = [-1.26, W_LAP[1] + EYE_OYEN + 0.02, 0.48];
const OYEN_EYE_LAB = EP02_OYEN_EYE_LAB;
const OYEN_EYE_REPLAY = EP02_OYEN_EYE_REPLAY;

/** Hero CU Oyen "Meong." (diam mantap, kepala & cakar nyaman di atas subtitle y ≈ 78%). */
const OYEN_MEONG: CamPose = { pos: [2.3, 1.06, -1.12], look: [L_OYEN[0], L_OYEN[1] + 0.14, L_OYEN[2]], fov: 35, roll: 0 };
const shiftPose = (p: CamPose, d: Vec3): CamPose => ({
  ...p,
  pos: [p.pos[0] + d[0], p.pos[1] + d[1], p.pos[2] + d[2]],
  look: [p.look[0] + d[0], p.look[1] + d[1], p.look[2] + d[2]],
});
const REPLAY_EYELINE = shiftPose(OYEN_MEONG, [
  OYEN_EYE_REPLAY[0] - OYEN_EYE_LAB[0],
  OYEN_EYE_REPLAY[1] - OYEN_EYE_LAB[1],
  OYEN_EYE_REPLAY[2] - OYEN_EYE_LAB[2],
]);

/** B7 Hero Finale U9: Confident Push-In 18f mendarat di "Aduh Oyen!" -> Settle diam mantap (roll 0) -> loop f0. */
const OUTRO_START: CamPose = { pos: [0.08, 1.48, 1.74], look: [L_UTOH[0], 1.34, L_UTOH[2]], fov: 41, roll: 0 };
const OUTRO_SETTLED: CamPose = { pos: [0.08, 1.48, 1.44], look: [L_UTOH[0], 1.34, L_UTOH[2]], fov: 38, roll: 0 };

export const CAMS: CamKey[] = [
  // B1: Insert laptop+Oyen selevel mata -> cut Medium Utoh (WiFi kos mati) -> cut "ngungsi" ke Stage Warkop
  { frame: B1.from, cut: true, creepRate: 0, pose: B1_MACRO_LAPTOP },
  { frame: EP02_B1_WIFI_FROM, cut: true, creepRate: 0, pose: B1_UTOH_WIFI },
  { frame: EP02_B1_STAGE_FROM, cut: true, creepRate: 0, pose: WARKOP_STAGE },

  // B2: Clean Medium Utoh (diam mantap) -> Smooth Lateral Pan Kopi (24f -> settle) -> Symmetrical Three-Shot (diam mantap)
  {
    frame: B2.from,
    cut: true,
    creepRate: 0,
    pose: { pos: [-1.86, 1.32, 3.45], look: [-1.92, 1.12, 1.18], fov: 39, roll: 0 },
  },
  { frame: B2.from + 105, cut: true, creepRate: 0, pose: COFFEE_A },
  { frame: L_S1.startFrame - 10, glide: 32, creepRate: 0, pose: COFFEE_B },
  { frame: L_S1.startFrame - 6, cut: true, creepRate: 0, pose: WARKOP_STAGE },

  // B3: Push-In Tegas 16f ke PLAK + Kick -> Macro 48 diam mantap -> cut Medium Bu Siti -> Push-In 28f (settle) -> CU Utoh
  { frame: EP02_PLAK_FRAME, glide: PLAK_PUSH_GLIDE, creepRate: 0, pose: WARKOP_PLAK_PUSH },
  { frame: EP02_PLAK_FRAME + 16, cut: true, creepRate: 0, pose: B3_MACRO_48 },
  { frame: L_S2.startFrame + 56, cut: true, creepRate: 0, pose: B3_SITI_OPEN },
  { frame: L_S2.startFrame + 56 + 28, glide: 28, path: 'dolly', creepRate: 0, pose: B3_SITI_HERAN },
  {
    frame: L_U3.startFrame - 6,
    cut: true,
    creepRate: 0,
    pose: { pos: [-1.88, 1.34, 3.35], look: [-1.96, 1.12, 1.2], fov: 38, roll: 0 },
  },

  // B4: Stage Nyerah (diam mantap) -> Confident 3D Dolly-In 26f ke Oyen+Laptop -> settle (0 ERROR) -> Stage Girang -> Pan Kanan 28f ke Bu Siti Konter -> Macro Alarm 06:58
  { frame: B4.from, cut: true, creepRate: 0, pose: WARKOP_STAGE },
  { frame: EP02_OYEN_WALK_KB_FROM - 10, cut: true, creepRate: 0, pose: pulledBack(B4_KB_OYEN, B4_OYEN_OPEN_K) },
  { frame: EP02_OYEN_WALK_KB_FROM - 10 + EP02_CUT_PUSH_GLIDE, glide: EP02_CUT_PUSH_GLIDE, path: 'dolly', creepRate: 0, pose: B4_KB_OYEN },
  { frame: L_U5.startFrame + 16, cut: true, creepRate: 0, pose: WARKOP_STAGE },
  { frame: L_S3.startFrame - 6, cut: true, creepRate: 0, pose: pulledBack(B4_SITI_COUNTER, B4_SITI_OPEN_K) },
  { frame: L_S3.startFrame - 6 + EP02_CUT_PUSH_GLIDE, glide: EP02_CUT_PUSH_GLIDE, path: 'dolly', creepRate: 0, pose: B4_SITI_COUNTER },
  {
    frame: EP02_TASKBAR_ALARM_FRAME,
    cut: true,
    creepRate: 0,
    pose: { pos: [-1.56, 1.02, 1.46], look: [W_LAP[0] - 0.01, W_LAP[1] + 0.12, W_LAP[2] - 0.08], fov: 29, roll: 0 },
  },

  // B5: High-Angle Establishing -> Smooth Crane-Down -> Pure Horizontal Side-Scrolling Tracking (0 dolly zoom)
  ...B5_KEYS,

  // B6: Stage Lab (diam mantap) -> Medium Utoh -> Smooth Lateral Pan Kanan 24f ke Rara+Oyen -> Enter KLAK -> Projector -> Stage -> CU Blank -> Punch-In +18% -> CU Rara Chuckle
  {
    frame: B6.from,
    cut: true,
    creepRate: 0,
    pose: LAB_STAGE,
  },
  { frame: L_U7.startFrame + 82, cut: true, creepRate: 0, pose: B6_UTOH_SMUG },
  { frame: L_R1.startFrame - 6, cut: true, creepRate: 0, pose: pulledBack(B6_RARA_TWOSHOT, B6_RARA_OPEN_K) },
  { frame: L_R1.startFrame - 6 + EP02_CUT_PUSH_GLIDE, glide: EP02_CUT_PUSH_GLIDE, path: 'dolly', creepRate: 0, pose: B6_RARA_TWOSHOT },
  {
    frame: EP02_ENTER_CU_FROM,
    cut: true,
    creepRate: 0,
    pose: { pos: [0.08, 1.44, 1.52], look: [L_UTOH[0], 1.24, L_UTOH[2]], fov: 36, roll: 0 },
  },
  {
    frame: EP02_PROJECTOR_RUN_FRAME,
    cut: true,
    creepRate: 0,
    pose: { pos: [0.0, 1.86, 1.6], look: [L_SCR[0], L_SCR[1] - 0.08, L_SCR[2]], fov: 48, roll: 0 },
  },
  {
    frame: L_R2.startFrame - 4,
    cut: true,
    creepRate: 0,
    pose: LAB_STAGE,
  },
  { frame: L_R2.startFrame + 64, cut: true, creepRate: 0, pose: CU_BLANK },
  { frame: EP02_R2_PUNCH_FRAME, cut: true, creepRate: 0, pose: withFov(CU_BLANK, PUNCH_FOV) },
  { frame: EP02_R2_CHUCKLE_FROM, cut: true, creepRate: 0, pose: RARA_CHUCKLE_CU },

  // B7: Clean CU Utoh -> Cross-Dissolve Replay Sepia (diam mantap -> 24f Eye-Line Glide) -> Hero CU Oyen -> Two-Shot Rara -> Tight CU Rara -> Push-In Finale 18f -> Calm Settle -> Loop f0
  {
    frame: B7.from,
    cut: true,
    creepRate: 0,
    pose: { pos: [0.42, 1.38, 1.35], look: [L_UTOH[0], 1.18, L_UTOH[2]], fov: 35, roll: 0 },
  },
  { frame: EP02_REPLAY_FROM, cut: true, creepRate: 0, pose: B4_MACRO_OYEN },
  { frame: EP02_REPLAY_TO - 1, glide: REPLAY_EYELINE_GLIDE, creepRate: 0, pose: REPLAY_EYELINE },
  { frame: EP02_REPLAY_TO, cut: true, creepRate: 0, pose: OYEN_MEONG },
  {
    frame: L_R3.startFrame - 6,
    cut: true,
    creepRate: 0,
    pose: { pos: [1.56, 1.56, 1.85], look: [1.8, 1.16, -2.2], fov: 43, roll: 0 },
  },
  { frame: EP02_R3_SPLIT_FRAME, cut: true, creepRate: 0, pose: RARA_NGULANG_CU },
  { frame: L_U9.startFrame - 6, cut: true, creepRate: 0, pose: OUTRO_START },
  {
    frame: EP02_U9_IMPACT_FRAME,
    glide: Math.min(20, Math.max(18, EP02_U9_IMPACT_FRAME - (L_U9.startFrame - 6))),
    creepRate: 0,
    pose: OUTRO_SETTLED,
  },
];

/** Camera kicks (7-frame alternating sign decay) sinkron tepat di frame benturan fisik cerita. */
export const KICKS: Kick[] = [
  { frame: EP02_PLAK_FRAME, strength: 0.056 },
  { frame: EP02_OYEN_STEP1_FRAME, strength: 0.012 },
  { frame: EP02_OYEN_STEP2_FRAME, strength: 0.014 },
  { frame: EP02_SCREEN_OK_FRAME, strength: 0.026 },
  { frame: EP02_TASKBAR_ALARM_FRAME + 2, strength: 0.02 },
  { frame: B5.from, strength: 0.02 },
  { frame: EP02_PROJECTOR_RUN_FRAME, strength: 0.034 },
  { frame: EP02_U9_IMPACT_FRAME, strength: 0.032 },
];

/** DOF aktif di ~33-37% durasi (macro insert 3D + B1 pull-out/high-angle & tight CU); stage wide, medium & Kampung tajam. */
export const DOF: Record<string, number> = {
  'b1-macro-laptop': 0.52,
  'b1-utoh-wifi': 0,
  'b1-stage-warkop': 0,
  'b2-utoh-panik': 0,
  'b2-coffee-dolly': 0.48,
  'b2-stage-siti': 0,
  'b3-stage-plak': 0,
  'b3-macro-48': 0.62,
  'b3-stage-heran': 0, // v6.1: medium cut-in tajam (pan macro->Siti diganti cut); menjaga rasio DOF <= 39%
  'b3-cu-protes': 0.36,
  'b4-stage-nyerah': 0,
  'b4-oyen-walk-kb': 0.56, // = b4-macro-0error (batas f912 tanpa cut -> nol pop DOF)
  'b4-macro-0error': 0.56,
  'b4-stage-girang': 0,
  'b4-siti-konsultan': 0,
  'b4-taskbar-0658': 0.62,
  'b5-establish': 0,
  'b5-sprint': 0,
  'b6-stage-lab': 0,
  'b6-utoh-smug': 0,
  'b6-rara-run': 0,
  'b6-enter-klak': 0.38,
  'b6-screen-mmmm': 0,
  'b6-stage-nol': 0,
  'b6-cu-blank': 0.4,
  'b6-punch-nol': 0.42,
  'b6-rara-chuckle': 0.38,
  'b7-cu-tanya': 0.4,
  'b7-replay-sepia': 0.58,
  'b7-oyen-meong': 0.62,
  'b7-rara-nilai': 0,
  'b7-rara-ngulang': 0.34,
  'b7-cu-outro': 0,
};

/** Titik fokus 3D sejati (mata karakter / permukaan layar 3D) untuk jarak fokus sumbu pandang (`depth.md`). */
export const DOF_TARGET: Record<string, Vec3> = {
  'b1-macro-laptop': [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.09],
  'b2-coffee-dolly': [-1.94, 0.85, 0.52],
  'b3-macro-48': [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.09],
  'b3-stage-heran': [-0.68, 1.45, 0.94],
  'b3-cu-protes': [-1.96, EYE_UTOH_SIT, 1.2],
  'b4-oyen-walk-kb': [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.09], // = b4-macro-0error (nol rack-focus pop di f912)
  'b4-macro-0error': [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.09],
  'b4-taskbar-0658': [W_LAP[0] + 0.04, W_LAP[1] + 0.11, W_LAP[2] - 0.09],
  'b6-enter-klak': [L_UTOH[0], EYE_UTOH_STAND, L_UTOH[2]],
  'b6-cu-blank': [L_UTOH[0], EYE_UTOH_STAND, L_UTOH[2]],
  'b6-punch-nol': [L_UTOH[0], EYE_UTOH_STAND, L_UTOH[2]],
  'b6-rara-chuckle': [L_RARA[0], EYE_RARA, L_RARA[2]],
  'b7-cu-tanya': [L_UTOH[0], EYE_UTOH_STAND, L_UTOH[2]],
  'b7-replay-sepia': [W_LAP[0], W_LAP[1] + 0.13, W_LAP[2] - 0.09],
  'b7-oyen-meong': OYEN_EYE_LAB,
  'b7-rara-ngulang': [L_RARA[0], EYE_RARA, L_RARA[2]],
};

/** Foreground framing bebas clipping: seluruh CU memakai sudut bersih tanpa dinding blur menutupi wajah. */
export const FOREGROUND: Record<string, { what: string; at: Vec3; from: number }> = {};

/** Frame flash putih 4f (dipadukan dengan cross-dissolve hangat di `Production.tsx`): masuk & keluar Replay. */
export const EP02_FLASH_FRAMES: readonly number[] = [EP02_REPLAY_FROM, EP02_REPLAY_TO];
