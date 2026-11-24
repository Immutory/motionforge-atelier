import {
  DEFAULT_POST,
  GRADE_PRESETS,
  LIGHTS,
  WARKOP_SPOTS,
  type GradeParams,
  type LightPreset,
  type PostParams,
  type Vec3,
} from '../../engine';
import { EP02_PROJECTOR_RUN_FRAME, EP02_SPOTS, LAB_SCREEN, locationAt, type Ep02Location } from './set';
import { BEATS, lineById } from './words';

/**
 * Milik agent light-colorist. EP02 "Konsultan Oyen": tiga lokasi siang/pagi, setiap cahaya punya sumber.
 *
 * KONTRAK EKSPOR (dibaca post-compositor di Production.tsx, cinematographer di shots.ts):
 * - `EP02_LIGHT_IDS`               id cahaya resmi untuk `Shot.light`, per lokasi.
 * - `lightFor(id)`                 preset statis (untuk tes / still tanpa frame).
 * - `lightAt(id, frame, opts)`     preset per frame: tambah tumpahan layar laptop, ayunan bohlam, proyektor
 *                                  lewat uniform kartu/tone. PAKAI INI di `<Stage light=...>`.
 * - `postFor(id, blur, focus)`     PostParams per shot (ink, bloom, grade, kabut tinta = kabut cahaya).
 * - `setLightIdFor(id)`            id yang diteruskan ke `<SetPieces lightId>` / WarkopSet / KampusSet
 *                                  (set memakai 'noon' untuk glow siang; id EP02 bukan 'noon').
 * - `practicalsAt(frame, opts)`    daftar lampu praktis TETAP 6 entri (4 point + 2 spot), urutan stabil.
 * - `bulbSwingAt(frame, i)`        sudut ayun bohlam Warkop i (0..2) setelah PLAK, untuk mesh set.
 * - `projectorScreenBrightness(f)` nilai `brightness` untuk `<LabProjectorScreen>`.
 * - `LOOK`                         ground (tetap ada walau `showGround={false}`).
 */

export type Ep02LightId =
  | 'warkop-pagi'
  | 'warkop-layar'
  | 'kampung-siang'
  | 'lab-led'
  | 'lab-proyektor'
  | 'lab-siluet';

/** Sama dengan `Ep02Location` milik set.tsx (rentang dari BEATS: warkop B1–B5, kampung B6, lab B7–B9). */
export type Ep02LightLocation = Ep02Location;

/** Layar laptop (sama dengan `laptopScreenAt(frame)` di cast.ts milik character-animator). */
export type LaptopScreen = 'err47' | 'err48' | 'ok' | 'wipe';

export const EP02_LIGHT_IDS: Record<Ep02LightId, { location: Ep02LightLocation; use: string; sources: string }> = {
  'warkop-pagi': {
    location: 'warkop',
    use: 'Wide/medium Warkop B1–B5 (dua tokoh, Bu Siti di konter, deret gelas).',
    sources:
      'KEY sinar pagi 06.30 masuk dari kanan-depan, lewat tepi kanopi (z > -0,25). ' +
      'FILL 3 bohlam gantung WK_LampBulb (hangat, di bawah kanopi; Bu Siti di konter hanya kena ini). ' +
      'RIM layar laptop merah/hijau di sisi bayangan kartu (tipis).',
  },
  'warkop-layar': {
    location: 'warkop',
    use: 'ECU/close-up wajah di depan laptop: B1 kaca pembesar, B3 hidung di layar, B5 merah→hijau, insert keyboard.',
    sources: 'Sama dengan warkop-pagi, tetapi RIM layar laptop kuat (wajah diterangi layar dari depan-bawah).',
  },
  'kampung-siang': {
    location: 'kampung',
    use: 'B6 transit warkopFront → posSatpam → kampusPlaza.',
    sources:
      'KEY matahari pagi menjelang siang (06.58 di HP), kanan-depan, tinggi 42°. ' +
      'FILL langit biru (bayangan biru, bukan lavender). RIM tidak perlu: nilai langit vs kartu sudah memisah.',
  },
  'lab-led': {
    location: 'lab',
    use: 'Lab FIK B7 dan B9 umum (Rara, Utoh di presenter, Oyen di meja dosen).',
    sources:
      'KEY panel LED plafon KP2_LedPanel_2 (kiri-atas presenter), searah jendela. ' +
      'FILL jendela koridor KP2_WinGlass (dinding kiri, siang biru-putih) di bayangan. ' +
      'RIM monitor lab + pantulan layar proyektor (tint kartu sejuk, menguat setelah Run).',
  },
  'lab-proyektor': {
    location: 'lab',
    use: 'B7 sesudah Enter dan B9 "wajah Utoh pucat": close-up Utoh menghadap kelas / layar.',
    sources:
      'KEY panel LED. FRONT sinar proyektor dari lensa plafon [0, 3.19, -0.26] (putih sejuk, membuat wajah pucat). ' +
      'FILL jendela koridor.',
  },
  'lab-siluet': {
    location: 'lab',
    use: 'B8 Oyen sebagai siluet: kamera di sisi kanan-belakang meja dosen menghadap jendela kiri.',
    sources:
      'KEY/BACKLIGHT jendela koridor KP2_WinGlass dari kiri, rendah (siang). ' +
      'FILL panel LED (angkat bayangan, tidak hancur). Kartu sengaja gelap tetapi tidak hitam.',
  },
};

// ---------------------------------------------------------------------------------------------------------
// Waktu cerita (semua dari BEATS / timeline, bukan waktu lama SCRIPT.md)
// ---------------------------------------------------------------------------------------------------------

/** Lokasi per frame: satu sumber kebenaran di set.tsx (`locationAt`, diturunkan dari BEATS). */
export const lightLocationAt = (frame: number): Ep02LightLocation => locationAt(frame);

/**
 * Frame PLAK (B4): satu detik sebelum Bu Siti berkata "Lho, nambah" (S2). Bohlam mulai berayun di sini.
 * Bila cinematographer mengekspor frame PLAK sendiri (kick), samakan dengan konstanta ini.
 */
export const EP02_PLAK_FRAME: number = lineById('S2').startFrame - 30;

/** Fallback layar laptop bila cast.ts belum mengekspor `laptopScreenAt`. */
export const EP02_SCREEN_OK_FRAME: number = lineById('U5').startFrame - 24;
export function fallbackScreenAt(frame: number): LaptopScreen {
  if (frame < EP02_PLAK_FRAME + 4) return 'err47';
  if (frame < EP02_SCREEN_OK_FRAME) return 'err48';
  return 'ok';
}

// ---------------------------------------------------------------------------------------------------------
// Preset cahaya EP02 (turunan lokal; LIGHTS engine tidak diubah)
// ---------------------------------------------------------------------------------------------------------

const WARKOP_PAGI: LightPreset = {
  id: 'warkop-pagi',
  sky: {
    // Langit pagi di atas warkop terbuka: horizon krem hangat, zenit biru sedang. Kabut = horizon.
    top: '#4f8fdc',
    horizon: '#f0e4cf',
    stops: ['#f0e4cf', '#bcd8ee', '#7fb3e8', '#4f8fdc'],
    elevations: [4, 14, 32],
  },
  fog: { color: '#f0e4cf', near: 30, far: 420 },
  // Sinar pagi dari kanan-depan; lewat tepi kanopi (z > -0,25), tidak terhalang dinding kanan (x 4,4, z ≤ 2,15).
  key: { color: '#ffe4bf', intensity: 2.2, azimuth: 40, elevation: 30, cameraRelative: false },
  fill: { color: '#ffc98a', intensity: 0.4 },
  ambient: { color: '#c8c6dc', intensity: 0.6 },
  tone: {
    lit: [1.44, 1.34, 1.18],
    // Bayangan di bawah kanopi: diangkat bohlam hangat + langit; condong ungu tipis, tidak cokelat.
    shade: [0.8, 0.75, 0.86],
    lift: [0.02, 0.016, 0.028],
    lambert: 0.32,
    sideK: 0.86,
    term: 0.18,
  },
  card: {
    tint: [1.03, 1.0, 0.96],
    shadeFloor: 0.9,
    headGrad: 0.06,
    bodyGrad: 0.15,
    sideTint: [0.92, 0.9, 0.97],
    blob: [0.58, 0.54, 0.64],
    castShadow: false,
  },
  shadow: { bias: -0.0004, normalBias: 0.02, range: 10 },
};

const KAMPUNG_SIANG: LightPreset = {
  id: 'kampung-siang',
  sky: {
    top: '#3384e0',
    horizon: '#e4edf1',
    stops: ['#e4edf1', '#a9d2f2', '#5fa8ec', '#3384e0'],
    elevations: [3, 12, 30],
  },
  fog: { color: '#e4edf1', near: 30, far: 380 },
  key: { color: '#fff1dc', intensity: 2.3, azimuth: 35, elevation: 42, cameraRelative: false },
  fill: { color: '#8fb6e8', intensity: 0.45 },
  ambient: { color: '#bcd2ec', intensity: 0.62 },
  tone: {
    lit: [1.42, 1.36, 1.25],
    // Biru langit, r ≤ g: menghindari lavender keabuan (keluhan QA kampung sore).
    shade: [0.72, 0.76, 0.9],
    lift: [0.008, 0.012, 0.024],
    lambert: 0.35,
    sideK: 0.85,
    term: 0.2,
  },
  card: {
    tint: [1.02, 1.0, 0.97],
    shadeFloor: 0.88,
    headGrad: 0.06,
    bodyGrad: 0.16,
    sideTint: [0.92, 0.94, 0.99],
    blob: [0.55, 0.58, 0.68],
    castShadow: false,
  },
  shadow: { bias: -0.0003, normalBias: 0.018, range: 16 },
};

const LAB_LED: LightPreset = {
  id: 'lab-led',
  sky: {
    // Ruang tertutup; langit hanya terlihat sebagai latar/kabut. Disamakan dengan cahaya jendela siang.
    top: '#9cc4ec',
    horizon: '#e6eef6',
    stops: ['#e6eef6', '#cfe0f2', '#b4d1ef', '#9cc4ec'],
    elevations: [4, 14, 32],
  },
  fog: { color: '#e6eef6', near: 40, far: 420 },
  // Panel LED KP2_LedPanel_2 di kiri-atas presenter, searah jendela koridor kiri. Plafon tidak melempar bayangan.
  key: { color: '#f4f8ff', intensity: 2.1, azimuth: -60, elevation: 58, cameraRelative: false },
  fill: { color: '#cfe0ff', intensity: 0.5 },
  ambient: { color: '#d4def0', intensity: 0.7 },
  tone: {
    // LED putih netral-sejuk; panel luas = terminator lembut, lambert rendah.
    lit: [1.34, 1.34, 1.32],
    shade: [0.8, 0.83, 0.93],
    lift: [0.014, 0.018, 0.032],
    lambert: 0.25,
    sideK: 0.9,
    term: 0.3,
  },
  card: {
    tint: [1.0, 1.0, 1.02],
    shadeFloor: 0.9,
    headGrad: 0.05,
    bodyGrad: 0.12,
    sideTint: [0.9, 0.93, 1.0],
    blob: [0.58, 0.6, 0.7],
    castShadow: false,
  },
  shadow: { bias: -0.0004, normalBias: 0.02, range: 10 },
};

const LAB_PROYEKTOR: LightPreset = {
  ...LAB_LED,
  id: 'lab-proyektor',
  card: {
    ...LAB_LED.card,
    // Wajah pucat: sedikit sejuk dan lebih terang dari depan, gradasi samping lebih tipis (sorot frontal).
    tint: [1.0, 1.0, 1.02],
    headGrad: 0.04,
    bodyGrad: 0.1,
    sideTint: [0.9, 0.94, 1.02],
  },
};

const LAB_SILUET: LightPreset = {
  ...LAB_LED,
  id: 'lab-siluet',
  // Matahari siang lewat jendela koridor (dinding kiri, x -4,3) = backlight dari arah kamera menghadap jendela.
  key: { color: '#eef4ff', intensity: 2.4, azimuth: -100, elevation: 22, cameraRelative: false },
  tone: {
    lit: [1.32, 1.34, 1.38],
    shade: [0.62, 0.66, 0.82],
    lift: [0.02, 0.024, 0.044],
    lambert: 0.3,
    sideK: 0.86,
    term: 0.18,
  },
  card: {
    // Siluet terbaca: ~0,5 dari albedo (oranye Oyen tetap oranye), bayangan biru-ungu, tidak hitam.
    tint: [0.84, 0.86, 0.94],
    shadeFloor: 0.62,
    headGrad: 0.1,
    bodyGrad: 0.2,
    sideTint: [0.8, 0.84, 1.0],
    blob: [0.46, 0.48, 0.62],
    castShadow: false,
  },
};

const WARKOP_LAYAR: LightPreset = { ...WARKOP_PAGI, id: 'warkop-layar' };

export const EP02_LIGHTS: Record<Ep02LightId, LightPreset> = {
  'warkop-pagi': WARKOP_PAGI,
  'warkop-layar': WARKOP_LAYAR,
  'kampung-siang': KAMPUNG_SIANG,
  'lab-led': LAB_LED,
  'lab-proyektor': LAB_PROYEKTOR,
  'lab-siluet': LAB_SILUET,
};

const isEp02Id = (id: string): id is Ep02LightId => id in EP02_LIGHTS;

/** Preset statis. Id lama engine ('noon', 'amber', ...) tetap jalan untuk shot sementara. */
export const lightFor = (id: string): LightPreset =>
  isEp02Id(id) ? EP02_LIGHTS[id] : ((LIGHTS as Record<string, LightPreset>)[id] ?? WARKOP_PAGI);

/** Semua lokasi EP02 adalah siang: set memakai glow siang. Teruskan hasil ini ke `<SetPieces lightId>`. */
export const setLightIdFor = (id: string): string => (isEp02Id(id) ? 'noon' : id);

/** Lokasi milik sebuah id cahaya (id asing: ikut frame). */
export const locationOfLight = (id: string, frame: number): Ep02LightLocation =>
  isEp02Id(id) ? EP02_LIGHT_IDS[id].location : lightLocationAt(frame);

// ---------------------------------------------------------------------------------------------------------
// Sumber praktis: bohlam berayun, layar laptop, proyektor, jendela
// ---------------------------------------------------------------------------------------------------------

/** Bohlam WK_LampBulb (warkop.glb): titik gantung kabel di y 2,87, bohlam y 2,38 (panjang tali 0,49 m). */
export const WARKOP_BULBS: ReadonlyArray<{ pivot: Vec3; bulb: Vec3 }> = [-1.35, 0, 1.35].map((x) => ({
  pivot: [x, 2.87, -0.68] as Vec3,
  bulb: [x, 2.38, -0.68] as Vec3,
}));
const BULB_LEN = 0.49;
/** Periode bandul 2π√(L/g) ≈ 1,40 dtk = 42 frame @30fps. */
const BULB_PERIOD = 2 * Math.PI * Math.sqrt(BULB_LEN / 9.81) * 30;

/** Konstanta waktu redaman kental (udara + kabel) dalam frame. */
const BULB_TAU = 180;
/** Frame semua bohlam tepat diam: 5 frame sebelum akhir B4 (BEATS[3].to). */
const B4_END = BEATS.find((b) => b.beat === 4)?.to ?? 1175;
export const EP02_BULB_SETTLE_FRAME: number = B4_END - 5;

/**
 * Sudut ayun bohlam i (radian, rotasi sumbu Z di sekitar `WARKOP_BULBS[i].pivot`, ayun ke kiri-kanan layar).
 * 0 sampai dan termasuk PLAK; 14° awal, tiap bohlam tertinggal 3 frame dan amplitudo turun 15%
 * (getaran merambat dari meja kiri). Pakai untuk mesh WK_LampCord/Shade/Bulb_<x>.
 *
 * Redaman: kental (eksponensial, τ = 180 f) ditambah gesek kering kecil di kait kabel, sehingga amplitudo
 * menyentuh nol dalam waktu terbatas, tepat di EP02_BULB_SETTLE_FRAME (bukan ekor eksponensial tak berujung):
 *   env(t) = (e^(-t/τ) - e^(-T/τ)) / (1 - e^(-T/τ)),  T = settle - plak - 3i.
 * Kira-kira 2,5° di awal B4 (f751), 0,65° di f950, 0 di f1170..1175.
 */
export function bulbSwingAt(frame: number, i: number, plakFrame: number = EP02_PLAK_FRAME): number {
  const t = frame - plakFrame - i * 3;
  if (t < 0) return 0;
  const T = EP02_BULB_SETTLE_FRAME - plakFrame - i * 3;
  if (T <= 0 || t >= T) return 0;
  const floor = Math.exp(-T / BULB_TAU);
  const env = (Math.exp(-t / BULB_TAU) - floor) / (1 - floor);
  const amp = ((14 * Math.PI) / 180) * Math.pow(0.85, i) * env;
  return amp * Math.sin((2 * Math.PI * t) / BULB_PERIOD);
}

/** Posisi bohlam i saat berayun. */
export function bulbPositionAt(frame: number, i: number, plakFrame: number = EP02_PLAK_FRAME): Vec3 {
  const { pivot } = WARKOP_BULBS[i];
  const a = bulbSwingAt(frame, i, plakFrame);
  return [pivot[0] + Math.sin(a) * BULB_LEN, pivot[1] - Math.cos(a) * BULB_LEN, pivot[2]];
}

/** Warna layar (linear-ish RGB untuk tint kartu) dan hex untuk lampu. "47" merah = #ff4d5e (SCRIPT.md). */
const SCREEN_RGB: Record<LaptopScreen, Vec3> = {
  err47: [1.0, 0.3, 0.37],
  err48: [1.0, 0.3, 0.37],
  ok: [0.42, 1.0, 0.6],
  wipe: [0.8, 0.88, 1.0],
};
const SCREEN_HEX: Record<LaptopScreen, string> = {
  err47: '#ff4d5e',
  err48: '#ff4d5e',
  ok: '#4dff8f',
  wipe: '#d6e4ff',
};

/** 0 di luar lab; 0,7 saat layar putih kosong; naik ke 1 dalam 6 frame mulai EP02_PROJECTOR_RUN_FRAME. */
export function projectorLevelAt(frame: number): number {
  if (lightLocationAt(frame) !== 'lab') return 0;
  const k = Math.min(1, Math.max(0, (frame - EP02_PROJECTOR_RUN_FRAME) / 6));
  return 0.7 + 0.3 * k;
}

/**
 * `brightness` untuk `<LabProjectorScreen>`: kanvas tetap di bawah ambang bloom (≤ 0,9 linear),
 * putih terbaca, teks "mmmm" tidak terbakar.
 */
export const projectorScreenBrightness = (frame: number): number => 0.8 + 0.1 * projectorLevelAt(frame);

/** Jendela koridor KP2_WinGlass (dinding kiri lab): pusat kaca, sedikit masuk ke ruangan. */
export const LAB_WINDOW: Vec3 = [-4.2, 1.7, 0.9];

export type Practical = {
  /** Id stabil; urutan array juga stabil (jangan difilter: jumlah lampu berubah = semua shader kompilasi ulang). */
  id: 'laptop' | 'bulb0' | 'bulb1' | 'bulb2' | 'window' | 'projector';
  kind: 'point' | 'spot';
  /** Sumber nyata yang dimotivasi (untuk gate G2). */
  source: string;
  position: Vec3;
  /** Hanya untuk spot. */
  target?: Vec3;
  /** Setengah sudut kerucut (radian), hanya spot. */
  angle?: number;
  penumbra?: number;
  color: string;
  /** 0 = mati di lokasi/frame ini (tetap dirender). */
  intensity: number;
  distance: number;
  decay: number;
};

export type PracticalOpts = {
  /** Keadaan layar laptop; berikan `laptopScreenAt(frame)` dari cast.ts. Default: fallback dari timeline. */
  screen?: LaptopScreen;
  /** Pusat layar laptop. Default: di atas `WARKOP_SPOTS.laptopTable`, sisi belakang tapak, menghadap bangku. */
  laptopScreen?: Vec3;
  /** Posisi wajah Utoh di lab (target sinar proyektor). Default: presenter + 1,63 m. */
  utohFace?: Vec3;
  /** Posisi Oyen di lab (target backlight jendela). Default: EP02_SPOTS.lab.oyen + 0,25 m. */
  oyen?: Vec3;
  plakFrame?: number;
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Lampu praktis per frame. SELALU 6 entri dengan urutan tetap:
 * [laptop(point), bulb0(point), bulb1(point), bulb2(point), window(spot), projector(spot)].
 * Render semuanya (intensity 0 = mati). `castShadow` jangan dinyalakan (biaya shadow map).
 *
 * CATATAN ENGINE: shader twoTone() dan cardShade() saat ini menimpa `reflectedLight.directDiffuse`,
 * jadi lampu ini hanya memberi kilap specular di material Phong (set bertekstur). Efek yang terlihat
 * di kartu tokoh dan tone dunia sudah dibawa `lightAt()` lewat uniform. Lihat laporan light-colorist.
 */
export function practicalsAt(frame: number, opts: PracticalOpts = {}): Practical[] {
  const loc = lightLocationAt(frame);
  const plak = opts.plakFrame ?? EP02_PLAK_FRAME;
  const screen = opts.screen ?? fallbackScreenAt(frame);
  const inWarkop = loc === 'warkop';
  const inLab = loc === 'lab';
  const lap = WARKOP_SPOTS.laptopTable;
  const laptopPos = opts.laptopScreen ?? ([lap[0], lap[1] + 0.15, lap[2] - 0.07] as Vec3);
  const utohFace = opts.utohFace ?? add(EP02_SPOTS.lab.utoh, [0, 1.63, 0]);
  const oyen = opts.oyen ?? add(EP02_SPOTS.lab.oyen, [0, 0.25, 0]);
  const proj = projectorLevelAt(frame);
  const b7 = BEATS.find((b) => b.beat === 7);
  const backlit = b7 && frame >= b7.from && frame < b7.to ? 1 : 0;

  const bulbs: Practical[] = WARKOP_BULBS.map((_, i) => ({
    id: `bulb${i}` as Practical['id'],
    kind: 'point',
    source: `Bohlam gantung Warkop WK_LampBulb_${['-1.35', '0.0', '1.35'][i]} (tungsten hangat, berayun setelah PLAK)`,
    position: bulbPositionAt(frame, i, plak),
    color: '#ffc477',
    intensity: inWarkop ? 1.2 : 0,
    distance: 6,
    decay: 1.6,
  }));

  return [
    {
      id: 'laptop',
      kind: 'point',
      source: `Layar laptop Utoh (${screen}) di meja kiri Warkop`,
      position: laptopPos,
      color: SCREEN_HEX[screen],
      intensity: inWarkop ? (screen === 'ok' ? 1.0 : 0.9) : 0,
      distance: 2.2,
      decay: 2,
    },
    ...bulbs,
    {
      id: 'window',
      kind: 'spot',
      source: 'Jendela koridor KP2_WinGlass (siang), backlight Oyen di B8',
      position: LAB_WINDOW,
      target: oyen,
      angle: 0.9,
      penumbra: 0.8,
      color: '#e8f0ff',
      intensity: inLab ? 1.2 + 1.4 * backlit : 0,
      distance: 9,
      decay: 1.4,
    },
    {
      id: 'projector',
      kind: 'spot',
      source: 'Lensa proyektor gantung (LAB_SCREEN.projectorLens), sorot ke wajah Utoh',
      position: LAB_SCREEN.projectorLens,
      target: utohFace,
      angle: 0.29,
      penumbra: 0.5,
      color: '#eef3ff',
      intensity: inLab ? 3.4 * proj : 0,
      distance: 7,
      decay: 1.5,
    },
  ];
}

// ---------------------------------------------------------------------------------------------------------
// Preset per frame: praktis yang terlihat lewat uniform kartu/tone (bekerja dengan shader sekarang)
// ---------------------------------------------------------------------------------------------------------

/** Kekuatan tumpahan layar laptop per id: [tint wajah, rim di sisi bayangan]. */
const SCREEN_SPILL: Partial<Record<Ep02LightId, [number, number]>> = {
  'warkop-pagi': [0.035, 0.45],
  'warkop-layar': [0.08, 0.8],
};
/** Kekuatan sinar/pantulan proyektor di kartu per id lab. */
const PROJ_SPILL: Partial<Record<Ep02LightId, number>> = {
  'lab-led': 0.4,
  'lab-proyektor': 1,
  'lab-siluet': 0,
};

const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const mul3 = (a: Vec3, b: Vec3): Vec3 => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export type LightAtOpts = { screen?: LaptopScreen; plakFrame?: number };

/**
 * Preset per frame untuk `<Stage light>` dan `light.card.*` ActorBillboard/CatBillboard.
 * - Warkop: layar laptop mewarnai wajah (tint kecil) dan rim sisi bayangan (sideTint); bohlam berayun
 *   setelah PLAK membuat bayangan & wajah berdenyut ±5% / ±2,5% mengikuti fase ayun.
 * - Lab: sorot/pantulan proyektor mencerahkan dan menyejukkan wajah, menguat di Run.
 */
export function lightAt(id: string, frame: number, opts: LightAtOpts = {}): LightPreset {
  const base = lightFor(id);
  if (!isEp02Id(id)) return base;
  const loc = EP02_LIGHT_IDS[id].location;

  if (loc === 'warkop') {
    const screen = opts.screen ?? fallbackScreenAt(frame);
    const rgb = SCREEN_RGB[screen];
    const [wT, wS] = SCREEN_SPILL[id] ?? [0, 0];
    // Denyut cahaya = ayunan bohlam yang sama (meluruh ke 0 bersama mesh sebelum akhir B4).
  const swing = WARKOP_BULBS.reduce((s, _, i) => s + bulbSwingAt(frame, i, opts.plakFrame), 0) / 3;
    // Normalisasi ke ±1 terhadap amplitudo awal 14°.
    const sway = Math.max(-1, Math.min(1, swing / ((14 * Math.PI) / 180)));
    const faceTint = scale3(mix3(base.card.tint, mul3(base.card.tint, rgb), wT), 1 + 0.025 * sway);
    return {
      ...base,
      tone: { ...base.tone, shade: scale3(base.tone.shade, 1 + 0.05 * sway) },
      card: {
        ...base.card,
        tint: faceTint,
        sideTint: mix3(base.card.sideTint, mul3(base.card.sideTint, rgb), wS),
      },
    };
  }

  if (loc === 'lab') {
    const p = projectorLevelAt(frame) * (PROJ_SPILL[id] ?? 0);
    if (p <= 0) return base;
    return {
      ...base,
      card: {
        ...base.card,
        tint: mix3(base.card.tint, mul3(base.card.tint, [1.01, 1.03, 1.05]), p),
        headGrad: base.card.headGrad * (1 - 0.3 * p),
      },
    };
  }

  return base;
}

// ---------------------------------------------------------------------------------------------------------
// Grade & post per lokasi
// ---------------------------------------------------------------------------------------------------------

/** Seri: EP01 Kost malam/senja; EP02 pagi-siang. Bayangan condong biru/ungu tipis, tidak cokelat, tidak lavender abu. */
export const EP02_GRADES: Record<Ep02LightLocation | 'siluet', GradeParams> = {
  warkop: {
    lift: [0.016, 0.014, 0.024],
    gain: [1.03, 1.01, 0.98],
    contrast: 1.05,
    saturation: 1.04,
    satZones: [0.96, 1.06, 1.06],
    tintS: [0.004, -0.002, 0.016],
    tintM: [0.006, 0.002, -0.004],
    tintH: [0.012, 0.006, -0.006],
    vignette: [0.14, 0.42],
    amount: 1,
  },
  kampung: {
    // Siang netral hangat. tintS biru (r ≤ g), tanpa tambahan merah di bayangan.
    lift: [0.012, 0.012, 0.016],
    gain: [1.02, 1.01, 0.99],
    contrast: 1.05,
    saturation: 1.06,
    satZones: [0.98, 1.06, 1.08],
    tintS: [-0.002, 0.0, 0.012],
    tintM: [0.006, 0.003, -0.004],
    tintH: [0.008, 0.004, -0.004],
    vignette: [0.1, 0.45],
    amount: 1,
  },
  lab: {
    // LED sejuk-netral; sorotan tidak diwarnai agar layar proyektor tetap putih.
    lift: [0.014, 0.016, 0.022],
    gain: [1.0, 1.005, 1.015],
    contrast: 1.04,
    saturation: 1.02,
    satZones: [0.96, 1.02, 1.0],
    tintS: [-0.004, 0.0, 0.016],
    tintM: [-0.002, 0.0, 0.006],
    tintH: [0.0, 0.0, 0.0],
    vignette: [0.12, 0.42],
    amount: 1,
  },
  siluet: {
    lift: [0.018, 0.02, 0.03],
    gain: [1.0, 1.005, 1.02],
    contrast: 1.08,
    saturation: 1.02,
    satZones: [0.98, 1.02, 1.0],
    tintS: [0.0, 0.0, 0.02],
    tintM: [-0.002, 0.0, 0.006],
    tintH: [0.0, 0.0, 0.0],
    vignette: [0.2, 0.36],
    amount: 1,
  },
};

/**
 * Bloom: hanya emissive HDR (bohlam, LED, lampu kecil) yang melewati ambang. Jendela siang (≤ 0,86),
 * layar proyektor (≤ 0,9 lewat `projectorScreenBrightness`) dan layar laptop tetap di bawah ambang,
 * jadi tidak meledak putih di belakang tokoh.
 */
const EP02_BLOOM: Record<Ep02LightLocation, PostParams['bloom']> = {
  warkop: { strength: 0.26, radius: 0.5, threshold: 1.0 },
  kampung: { strength: 0.16, radius: 0.4, threshold: 1.1 },
  lab: { strength: 0.2, radius: 0.45, threshold: 1.05 },
};

/** Ink per lokasi, nilai px pada tinggi 1920 (PostStack mengalikan outputHeight / 1920). */
const EP02_INK: Record<Ep02LightLocation, Pick<PostParams['ink'], 'thickness' | 'widthFar' | 'concaveGain'>> = {
  // Warkop semi-terbuka: garis kontak tipis membantu grounded (gelas, siku di meja).
  warkop: { thickness: 3.2, widthFar: 2.1, concaveGain: 0.35 },
  kampung: { thickness: 3.4, widthFar: 2.2, concaveGain: 0.7 },
  // Interior tertutup: tanpa garis cekung agar dinding & plafon bersih.
  lab: { thickness: 3.1, widthFar: 2.0, concaveGain: 0 },
};

export const LOOK = {
  /** Dipakai Stage meski `showGround={false}` (set GLB punya lantai sendiri, lihat set.tsx). */
  ground: '#d9c59b',
  showGround: false,
};

/** Parameter post dasar. */
export const POST: PostParams = {
  ...DEFAULT_POST,
};

/** Parameter post per shot: kabut tinta = kabut cahaya aktif, ink/bloom/grade per lokasi. */
export function postFor(lightId: string, blur: number, focus: number): PostParams {
  const light = lightFor(lightId);
  if (!isEp02Id(lightId)) {
    const grade = (GRADE_PRESETS as Record<string, GradeParams>)[lightId] ?? GRADE_PRESETS.noon;
    return {
      ...POST,
      ink: { ...POST.ink, fogColor: light.fog.color, fogNear: light.fog.near, fogFar: light.fog.far },
      blur,
      focus,
      grade,
    };
  }
  const loc = EP02_LIGHT_IDS[lightId].location;
  return {
    ...POST,
    ink: {
      ...POST.ink,
      ...EP02_INK[loc],
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur,
    focus,
    bloom: EP02_BLOOM[loc],
    grade: lightId === 'lab-siluet' ? EP02_GRADES.siluet : EP02_GRADES[loc],
  };
}
