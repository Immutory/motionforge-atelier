import { moveSettle, type CamKey, type CamPose, type Kick, type Shot, type Vec3 } from '../../engine';
import { EP03_BON_FRAMES, EP03_SHOCK_FRAME, EP03_WALLET_FROM_FRAME } from './cast';
import { EP03_SPOTS } from './set';
import { lineById } from './words';

export const FPS = 30;
const LIGHT = 'ep03-malam';

/**
 * Milik agent cinematographer. Bahasa kamera EP03 (9:16 sempit):
 * - Utoh duduk menghadap gerobak dan Tio menghadap balik, jadi two-shot selalu bertumpuk KEDALAMAN (OTS), bukan sejajar.
 * - Hold dialog diam mantap (`creepRate: 0`); gerak hanya `moveSettle` bermotivasi di awal beat Tio.
 * - Shot pembuka & penutup memakai pose yang SAMA (profil Utoh dari barat) supaya loop f1785 → f0 mulus.
 * - Semua kamera setinggi mata (tunduk/tengadah maks. 12 derajat, dites); insert makro 3/4 untuk piring, frontal untuk papan bon.
 */

const P = (pos: Vec3, look: Vec3, fov: number): CamPose => ({ pos, look, fov, roll: 0 });

const U_FACE: Vec3 = [EP03_SPOTS.utohSeat[0], 1.26, EP03_SPOTS.utohSeat[2]];
const T_FACE: Vec3 = [EP03_SPOTS.tio[0], 1.64, EP03_SPOTS.tio[2]];
const O_FACE: Vec3 = [EP03_SPOTS.oyenSeat[0], 0.86, EP03_SPOTS.oyenSeat[2]];
const Y_FACE: Vec3 = [EP03_SPOTS.yuni[0], 1.56, EP03_SPOTS.yuni[2]];
const PLATES_C: Vec3 = [-12.92, 0.92, 17.18];

/** Profil Utoh dari barat: dahi ke gerobak (hook & penutup loop). */
export const POSE_SIDE_W = P([-14.98, 1.2, 16.86], [-13.5, 1.12, 16.86], 54);
/** OTS di balik punggung Utoh ke Tio. */
export const POSE_OTS_TIO = P([-13.25, 1.45, 15.93], [-13.05, 1.63, 18.4], 36);
export const POSE_OTS_TIO_TIGHT = P([-13.2, 1.5, 16.2], [-13.05, 1.68, 18.4], 28);
/** Profil Utoh dari timur setinggi mata: Utoh menghadap gerobak (kiri layar). Satu sisi sumbu aksi untuk B2–B5. */
export const POSE_PROFILE_E = P([-12.0, 1.22, 16.8], [-13.25, 1.18, 16.8], 38);
export const POSE_PROFILE_E_TIGHT = P([-11.95, 1.24, 16.8], [-13.25, 1.22, 16.8], 34);
/** Tio "berfilosofi": push bermotivasi dari OTS ke single, lalu diam. */
export const POSE_TIO_WIDE = P([-13.15, 1.38, 15.4], [-13.05, 1.68, 18.4], 32);
export const POSE_TIO_HERO = P([-13.12, 1.42, 16.05], [-13.05, 1.68, 18.4], 32);
export const POSE_TIO_WIDE2 = P([-13.2, 1.36, 15.25], [-13.05, 1.66, 18.4], 28);
export const POSE_TIO_CLOSE = P([-13.13, 1.42, 15.95], [-13.05, 1.66, 18.4], 26);
/** Dua-shot depan-barat: papan bon + karton karyawan + Tio di belakang. */
export const POSE_WEST_TWO = P([-14.2, 1.35, 15.35], [-13.72, 1.4, 17.6], 46);
/** Samping timur rendah: Oyen di depan bangku, Utoh di belakangnya. */
export const POSE_SIDE_E = P([-11.45, 1.1, 16.8], [-13.3, 0.88, 16.8], 43);
/** Varian lebih rendah & sempit untuk B5 (Oyen makan di depan, Utoh tertawa di belakang). */
export const POSE_SIDE_E2 = P([-11.5, 1.06, 16.8], [-13.3, 0.86, 16.8], 48);
/** Depan bangku: Utoh & Oyen saling tatap (profil), Tio di latar. */
export const POSE_FACEOFF = P([-13.12, 1.0, 14.6], [-13.12, 0.98, 16.8], 46);
export const POSE_YUNI = P([-9.75, 1.78, 15.9], [-9.62, 1.6, 18.38], 34);
export const POSE_BOARD = P([-13.95, 1.35, 16.15], EP03_SPOTS.board, 40);
/** Insert makro 3/4 setinggi ledge (bukan top-down): Oyen di kiri, piring di kanan. */
export const POSE_PLATES = P([-12.5, 1.08, 16.5], [-12.92, 0.97, 17.18], 46);
export const POSE_WALLET = P([-14.85, 1.1, 16.72], [-13.5, 0.98, 16.8], 48);
export const POSE_OYEN_LOW = P([-12.82, 1.0, 15.75], [-12.84, 0.9, 16.75], 44);

type ShotDef = { id: string; from: number; pose: CamPose; note: string; settleFrom?: CamPose; glide?: number; dof: number; target: Vec3 };

const T = (id: string) => lineById(id);

/** Batas shot diturunkan dari VO (cut mendarat di awal/akhir baris). */
const DEFS: ShotDef[] = [
  { id: 'b1-side-slump', from: 0, pose: POSE_SIDE_W, note: 'Hook: profil Utoh, dahi ke gerobak', dof: 0.25, target: U_FACE },
  { id: 'b1-ots-tio', from: T('T1').startFrame, pose: POSE_OTS_TIO, note: 'Tio: "curhat gratis"', dof: 0.55, target: T_FACE },
  { id: 'b2-rev-utoh', from: T('U2').startFrame - 7, pose: POSE_PROFILE_E, note: 'Profil Utoh curhat ke gerobak', dof: 0.5, target: U_FACE },
  {
    id: 'b2-tio-wisdom',
    from: T('T2').startFrame - 6,
    pose: POSE_TIO_HERO,
    settleFrom: POSE_TIO_WIDE,
    glide: 28,
    note: 'Filosofi mie: push bermotivasi lalu diam',
    dof: 0.45,
    target: T_FACE,
  },
  { id: 'b2-rev-blank', from: T('U3').startFrame - 7, pose: POSE_PROFILE_E_TIGHT, note: '"Maksudnya apa, Bang?"', dof: 0.5, target: U_FACE },
  { id: 'b2-west-board', from: T('T3').startFrame - 5, pose: POSE_WEST_TWO, note: '"Tambah pangsit?" + bon ditulis', dof: 0.2, target: T_FACE },
  { id: 'b3-side-rant', from: T('U4').startFrame - 6, pose: POSE_SIDE_E, note: 'Utoh mengoceh, Oyen naik ke bangku', dof: 0.35, target: U_FACE },
  { id: 'b3-tio-whisper', from: T('T4').startFrame - 5, pose: POSE_OTS_TIO_TIGHT, note: '"Kayak… sekarang?"', dof: 0.6, target: T_FACE },
  { id: 'b3-faceoff', from: T('T4').endFrame + 5, pose: POSE_FACEOFF, note: 'Utoh menoleh, slow-blink Oyen, lompat kaget', dof: 0.3, target: [-13.12, 1.1, 16.8] },
  { id: 'b3-yuni', from: T('Y1').startFrame - 4, pose: POSE_YUNI, note: 'Yuni menyindir', dof: 0.5, target: Y_FACE },
  { id: 'b3-faceoff-react', from: T('Y1').endFrame + 5, pose: POSE_FACEOFF, note: 'Utoh & Oyen bengong', dof: 0.3, target: [-13.12, 1.1, 16.8] },
  { id: 'b4-side-protest', from: T('U5').startFrame - 7, pose: POSE_SIDE_E, note: '"Dia nggak pesen!"', dof: 0.35, target: U_FACE },
  { id: 'b4-plates', from: T('U5').endFrame + 2, pose: POSE_PLATES, note: 'Insert: 3 piring ayam (ting ×3)', dof: 0.3, target: PLATES_C },
  { id: 'b4-board-ayam', from: T('T5').endFrame + 4, pose: POSE_BOARD, note: 'Bon: + AYAM (OYEN) x3', dof: 0.3, target: EP03_SPOTS.board },
  {
    id: 'b5-tio-sincere',
    from: T('T6').startFrame - 45,
    pose: POSE_TIO_CLOSE,
    settleFrom: POSE_TIO_WIDE2,
    glide: 36,
    note: 'Cerita tulus Tio',
    dof: 0.55,
    target: T_FACE,
  },
  { id: 'b5-rev-utoh', from: T('U6').startFrame - 24, pose: POSE_SIDE_E2, note: 'Utoh tertawa & bangkit (Oyen di depan)', dof: 0.55, target: U_FACE },
  { id: 'b6-board-total', from: EP03_BON_FRAMES.curhat - 6, pose: POSE_BOARD, note: 'Bon: + CURHAT 20RB → TOTAL 90RB', dof: 0.3, target: EP03_SPOTS.board },
  { id: 'b6-wallet', from: EP03_WALLET_FROM_FRAME - 2, pose: POSE_WALLET, note: 'Dompet kosong + ngengat', dof: 0.45, target: [-13.3, 1.0, 16.9] },
  { id: 'b6-fish', from: T('O1').startFrame - 28, pose: POSE_PLATES, note: 'Insert: Oyen bayar 2 ikan asin', dof: 0.3, target: PLATES_C },
  { id: 'b6-oyen-meong', from: T('O1').startFrame - 4, pose: POSE_OYEN_LOW, note: '"Meong." + kacamata Tio melorot', dof: 0.4, target: O_FACE },
  { id: 'b6-side-slump', from: T('U7').startFrame - 13, pose: POSE_SIDE_W, note: 'Penutup = pose hook (loop)', dof: 0.25, target: U_FACE },
];

export const TOTAL_FRAMES = 1800;

export const SHOTS: Shot[] = DEFS.map((d, i) => ({
  id: d.id,
  from: d.from,
  to: i + 1 < DEFS.length ? DEFS[i + 1].from : TOTAL_FRAMES,
  light: LIGHT,
  note: d.note,
  transition: 'cut',
}));

export const CAMS: CamKey[] = DEFS.flatMap((d) =>
  d.settleFrom
    ? moveSettle(d.from, d.settleFrom, d.pose, d.glide ?? 28)
    : [{ frame: d.from, pose: d.pose, cut: true, creepRate: 0 }],
);

/** Blur latar per shot (0 = tajam). */
export const DOF: Record<string, number> = Object.fromEntries(DEFS.map((d) => [d.id, d.dof]));
/** Titik fokus per shot (jarak fokus dihitung sepanjang sumbu pandang). */
export const DOF_TARGET: Record<string, Vec3> = Object.fromEntries(DEFS.map((d) => [d.id, d.target]));

/** Entakan kamera: lompat kaget Utoh. */
export const KICKS: Kick[] = [{ frame: EP03_SHOCK_FRAME, strength: 0.03, length: 8 }];
