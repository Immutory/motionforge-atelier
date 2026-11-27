import type { Vec3 } from '../core/easing';
import {
  computeEyeGeom,
  computeEyeGeom360,
  drawComicFx,
  drawFaceFeatures,
  type BeautyMark,
  type BrowStyle,
  type ComicFx,
  type Expression,
  type EyeStyle,
  type NoseStyle,
} from './expressions';
import type { TalkSample } from './lipsync';
import { drawHandProp, type HandProp, type HandPropOptions } from './props2d';
import {
  cylSpan,
  degToRad,
  depthDarkenFactor,
  resolveYawAngle,
  rotateYaw3D,
  sortByDepthZ,
  surfacePoint3D,
  type ReliefPrimitive,
} from './rig360';

export type HeadShape = 'sculpted' | 'squircle' | 'faceted' | 'round';
export type HairStyle =
  | 'bald'
  | 'short'
  | 'quiff'
  | 'hijab'
  | 'curtain'
  | 'bun'
  | 'parted'
  | 'spiky'
  | 'messy'
  | 'fadeCrop';
export type Headgear = 'none' | 'peci' | 'cap' | 'iket' | 'helmet' | 'headphones' | 'satpamCap';
export type OutfitStyle =
  | 'batik'
  | 'denim'
  | 'coach'
  | 'tenun'
  | 'kotakSarung'
  | 'dasterCelemek'
  | 'seragamSma'
  | 'ojol'
  | 'hoodieTech'
  | 'satpam'
  | 'pedagangApron'
  | 'lokalKnit'
  | 'casual';
export type ShoeStyle = 'loafer' | 'sneaker' | 'sandal' | 'boot';
/** `pray` = kedua telapak menangkup di depan dada (memohon / berdoa). */
export type ArmPose = 'rest' | 'hip' | 'point' | 'raise' | 'hold' | 'wave' | 'cross' | 'pray';
/**
 * `swing` (default) = siklus kartun lama (kaki berayun di tempat).
 * `planted` = kaki menapak: selama fase tumpu sepatu bergerak mundur linear 2 × langkah per setengah siklus,
 * jadi bila badan maju `actorWalkCycleMeters(...)` per siklus, sepatu tidak meluncur (tampak samping / 3-4).
 */
export type ActorGait = 'swing' | 'planted';
export type ActorStance = 'stand' | 'walk' | 'sit' | 'sitCross' | 'squat' | 'jump';
export type ActorView = 'front' | 'threeQuarter' | 'side' | 'backThreeQuarter' | 'back';
export type BodyBuild = 'slim' | 'regular' | 'big';

export type CharacterSpec = {
  id: string;
  name: string;
  /** Label peran/karakter opsional (mis. Pemeran Utama #1 · Mahasiswa S1 Teknik Informatika). */
  role?: string;
  headShape: HeadShape;
  eyeStyle: EyeStyle;
  skin: string;
  /** Highlight terang opsional di sisi pipi/dahi terkena cahaya agar gradasi kulit sawo matang natural seperti foto. */
  skinHighlight?: string;
  skinShadow: string;
  ink: string;
  hairStyle: HairStyle;
  hairColor: string;
  hairHighlight?: string;
  /** Detail sisiran rapi (garis belahan + helai sisir) untuk `hairStyle: 'parted'` tanpa topi. Default false. */
  hairCombed?: boolean;
  headgear: Headgear;
  headgearColor?: string;
  headgearAccent?: string;
  glasses?: boolean;
  /** 'round' = bingkai emas tipis, 'tech' = kotak tipis, 'thick' = bingkai gelap tebal (pedagang). */
  glassesStyle?: 'round' | 'tech' | 'thick';
  mustache?: boolean;
  faintMustache?: boolean;
  earrings?: boolean;
  earDetail?: boolean;
  nose?: boolean;
  noseStyle?: NoseStyle;
  beautyMark?: BeautyMark;
  browThick?: number;
  browStyle?: BrowStyle;
  browColor?: string;
  /** Warna rongga mulut saat terbuka (default '#5c222d'). Gelapkan untuk kulit gelap agar tetap kontras. */
  mouthColor?: string;
  /** Warna lidah di dalam mulut (default '#e57373'). */
  tongueColor?: string;
  /** Pita bibir tipis di bawah garis mulut tertutup (default: tidak digambar). */
  lipColor?: string;
  /** Bibir dua-katup natural (katup atas & bawah lembut dengan cupid's bow halus). */
  fullLips?: boolean;
  upperLipColor?: string;
  /** Rona pipi lembut (default: tidak digambar). */
  blushColor?: string;
  /** Titik kilau putih di pupil agar mata tetap terbaca di kulit gelap / adegan malam (default false). */
  eyeShine?: boolean;
  /** Postur badan: 'regular' (default, tampilan lama), 'slim', atau 'big' (badan, perut, lengan & celemek lebih lebar). */
  build?: BodyBuild;
  outfit: OutfitStyle;
  outfitColor: string;
  outfitShade: string;
  outfitSecondary?: string;
  accentColor: string;
  pantsColor: string;
  shoeStyle: ShoeStyle;
  shoeColor: string;
  backpack?: boolean;
  backpackColor?: string;
  /** Prop bawaan bila tidak diisi di pose. */
  defaultProp?: HandProp;
};

/**
 * Penyetelan halus satu tangan (opsional, default = gambar lama identik):
 * breakdown kontinu antar pose lengan, raihan ke titik kanvas, tangan+prop di depan wajah, dan opsi prop.
 */
export type HandRig = {
  /** Pose asal breakdown: target tangan = lerp(target(`from`), target(pose lengan), `t`). */
  from?: ArmPose;
  /** 0..1 progres dari `from` ke pose lengan (default 1). */
  t?: number;
  /** Raihan ke titik kanvas (px, sebelum rotasi `lean`) dengan bobot `t` 0..1 (mis. gelas ke hidung). */
  reach?: { x: number; y: number; t: number };
  /** Geser akhir target tangan (px kanvas). */
  dx?: number;
  dy?: number;
  /** true = tangan + prop digambar DI DEPAN kepala/wajah (gelas di bibir/hidung). */
  front?: boolean;
  /** Kemiringan prop (radian, ruang layar). */
  propTilt?: number;
  /** Teks layar prop berteks (`phoneClock`), selalu tegak & tidak ter-mirror. */
  propText?: string;
  /** Pengali uap prop `kopi` (default 1). */
  steam?: number;
};

export type ActorPose = {
  face: Expression;
  /** 0 = terbuka, 0.5 = setengah tertutup, 1/true = tertutup penuh (pakai blinkLidAt). */
  blink?: boolean | number;
  /** 0..1 atau keluaran `talkAt(WORDS, frame, FPS)` untuk lip-sync otomatis. */
  talk?: number | TalkSample;
  stance?: ActorStance;
  view?: ActorView;
  leftArm?: ArmPose;
  rightArm?: ArmPose;
  leftProp?: HandProp;
  rightProp?: HandProp;
  /** Penyetelan halus tangan kiri/kanan (breakdown kontinu, raihan, depan wajah, teks/uap/kemiringan prop). */
  leftHand?: HandRig;
  rightHand?: HandRig;
  /** 0..1 angkat topi/peci/helm/kacamata. Otomatis 1 saat `face === 'shock'`. */
  hatPop?: number;
  /** Efek komik 2D di sekitar kepala. Otomatis mengikuti ekspresi jika tidak diisi. */
  fx?: ComicFx;
  /** 0..1 fase siklus langkah saat `stance === 'walk'`. */
  walkPhase?: number;
  /** Jenis siklus kaki saat `walk` (default `'planted'` di v3.5 agar bebas ice-skating). */
  gait?: ActorGait;
  /** Pengali panjang langkah saat `walk` (default 1; 1,6–1,9 untuk lari). */
  stride?: number;
  /** 0..1 faktor ease-in/out amplitudo langkah & ayunan saat transisi `stand ↔ walk` (default `1`). */
  strideBlend?: number;
  /** Kemiringan badan (derajat). */
  lean?: number;
  /** Kemiringan kepala independen dari `lean` badan (derajat; + miring kanan, - miring kiri). Default 0. */
  headTilt?: number;
  /**
   * Tinggi permukaan dudukan bangku/kursi (meter, mis. 0.475 untuk WK_BenchL_Top) saat `stance: 'sit'`.
   * Mengatur posisi pinggul & tekukan lutut agar benar-benar duduk di permukaan dudukan.
   */
  sitHeight?: number;
  /**
   * Tinggi billboard dunia aktual aktor (meter) untuk kalibrasi `sitHeight` saat `stance: 'sit'`.
   * Opsional; default tetap `1.8` m agar produksi lama (EP02/EP03) tidak berubah diam-diam.
   */
  actorHeight?: number;
  /** -1..1 arah hadap wajah (+ kanan, - kiri). */
  facing?: number;
  /**
   * 0..1 menoleh ke belakang, kepala saja (badan, lengan, dan langkah tetap mengikuti `facing`).
   * Tampak samping: >= 0,5 membalik arah kepala. Tampak lain: arah kepala bergeser halus `facing * (1 - 2 * lookBack)`.
   * Default 0 (gambar lama tidak berubah).
   */
  lookBack?: number;
  /**
   * Opsional (Atelier v4.0): sudut putar badan kontinu relatif kamera dalam derajat [-180, 180].
   * `0°` = hadap depan kamera, `+90°` = hadap kanan layar, `-90°` = hadap kiri layar, `±180°` = membelakangi kamera.
   * Mengaktifkan rig volumetrik 2,5D putar 360° mulus tanpa pop sudut.
   */
  yawDeg?: number;
  /** Opsional (v4.0): sudut putar kepala independen dalam derajat [-180, 180] relatif kamera. */
  headYawDeg?: number;
  /** Opsional (v4.0): kemiringan pitch kamera ringan (derajat) untuk foreshortening perspektif halus. */
  pitchDeg?: number;
};

export type StrikeEnvelopeResult = {
  phase: 'idle' | 'windup' | 'hold' | 'strike' | 'follow';
  /** Nilai gerak bertanda: `-1` = puncak tarikan wind-up/hold, `+1` = puncak benturan 1-frame, meluruh ke `0`. */
  value: number;
  /** `true` tepat pada 1-frame benturan (`frame === impactFrame`). */
  impact: boolean;
  /** Progres lokal 0..1 di dalam fase aktif. */
  progress: number;
};

/**
 * Action Impact Grammar (`motion.md`): 4f wind-up -> 6f tense hold -> 1-frame strike -> 8f damped follow-through.
 * Dipakai untuk pukulan, gebrak meja, hentakan kaki, atau reaksi kaget berenergi tinggi.
 */
export function strikeEnvelope(
  frame: number,
  impactFrame: number,
  opts?: { windup?: number; hold?: number; follow?: number },
): StrikeEnvelopeResult {
  const windup = Math.max(1, Math.round(opts?.windup ?? 4));
  const hold = Math.max(0, Math.round(opts?.hold ?? 6));
  const follow = Math.max(1, Math.round(opts?.follow ?? 8));
  const holdStart = impactFrame - hold;
  const windupStart = holdStart - windup;

  if (frame < windupStart || frame > impactFrame + follow) {
    return { phase: 'idle', value: 0, impact: false, progress: 0 };
  }
  if (frame < holdStart) {
    const p = (frame - windupStart) / windup;
    const ease = p * p * (3 - 2 * p);
    return { phase: 'windup', value: -ease, impact: false, progress: p };
  }
  if (frame < impactFrame) {
    const p = hold > 0 ? (frame - holdStart) / hold : 1;
    return { phase: 'hold', value: -1, impact: false, progress: p };
  }
  if (frame === impactFrame) {
    return { phase: 'strike', value: 1, impact: true, progress: 1 };
  }
  const p = (frame - impactFrame) / follow;
  const damped = Math.exp(-3.2 * p) * Math.cos(p * Math.PI * 1.5) * (1 - p);
  return { phase: 'follow', value: damped, impact: false, progress: p };
}

/**
 * Spring Overshoot: melesat dari 0 -> `peak` (default 1,25) lalu berayun teredam dan duduk tepat di 1
 * pada `triggerFrame + duration`. Cocok untuk `hatPop`, reaksi kaget, atau pop prop.
 */
export function springPop(frame: number, triggerFrame: number, peak = 1.25, duration = 12): number {
  const d = frame - triggerFrame;
  if (d < 0) return 0;
  const span = Math.max(2, Math.round(duration));
  if (d >= span) return 1;
  if (d === 0) return 0.65 * peak;
  if (d === 1) return peak;
  const t = (d - 1) / (span - 1);
  return 1 + (peak - 1) * Math.exp(-3.8 * t) * Math.cos(t * Math.PI * 2) * (1 - t);
}

export const ACTOR_W = 700;
export const ACTOR_H = 1100;
export const ACTOR_SOLE_Y = 1040;

/** Amplitudo langkah dasar (px desain) per tampak, dipakai gait `planted` dan `actorWalkCycleMeters`. */
export function actorStridePx(view: ActorView = 'threeQuarter', strideMul = 1, skirted = false): number {
  return (view === 'side' ? 110 : skirted ? 56 : 72) * strideMul;
}

/**
 * Jarak tempuh dunia (meter) untuk satu siklus `walkPhase` 0→1 dengan gait `planted`:
 * setiap setengah siklus satu kaki menapak dan menyapu 2 × amplitudo langkah, jadi satu siklus = 4 × amplitudo.
 * `walkPhase = jarakTempuh / actorWalkCycleMeters(...)` membuat sepatu diam di tanah.
 */
export function actorWalkCycleMeters(height: number, view: ActorView = 'threeQuarter', strideMul = 1, skirted = false): number {
  return (4 * actorStridePx(view, strideMul, skirted) * height) / ACTOR_H;
}

/**
 * Posisi kaki (px relatif, arah gerak positif) dan tinggi angkat untuk gait `planted`.
 * Fase tumpu u ∈ [0, 0,5): +amp → −amp linear. Fase ayun u ∈ [0,5, 1): −amp → +amp halus sambil terangkat.
 */
export function plantedFoot(walkPhase: number, side: -1 | 1, amp: number, liftAmp: number): { dx: number; lift: number; u: number } {
  const u = (((walkPhase + (side === 1 ? 0 : 0.5)) % 1) + 1) % 1;
  if (u < 0.5) return { dx: amp * (1 - 4 * u), lift: 0, u };
  const s = (u - 0.5) * 2;
  const e = s * s * (3 - 2 * s);
  return { dx: amp * (-1 + 2 * e), lift: Math.sin(Math.PI * s) * liftAmp, u };
}

/**
 * 2-Bone Analytic Leg IK (Atelier v3.5): menghitung titik lutut dan sudut tekukan lutut (derajat)
 * dengan panjang paha (`thighLen`) & betis (`shinLen`) selalu konstan (anti lutut karet / NaN).
 * `bendDir`: `+1` = lutut menekuk ke +X (hadap kanan), `-1` = lutut menekuk ke -X (hadap kiri).
 */
export function solveLegIK(
  hip: readonly [number, number],
  ankle: readonly [number, number],
  thighLen: number,
  shinLen: number,
  bendDir: -1 | 1,
): { knee: [number, number]; angleDeg: number } {
  const vx = ankle[0] - hip[0];
  const vy = ankle[1] - hip[1];
  const rawD = Math.hypot(vx, vy);
  const minD = Math.abs(thighLen - shinLen) + 1;
  const maxD = Math.max(minD + 1, thighLen + shinLen - 0.5);
  const d = Math.max(minD, Math.min(maxD, rawD));
  const ux = rawD > 1e-6 ? vx / rawD : 0;
  const uy = rawD > 1e-6 ? vy / rawD : 1;
  const a = (thighLen * thighLen - shinLen * shinLen + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, thighLen * thighLen - a * a));
  const mx = hip[0] + ux * a;
  const my = hip[1] + uy * a;
  // Di kanvas (+Y ke bawah), vektor tegak lurus `(uy, -ux)` selalu menunjuk +X ketika ankle di bawah hip.
  const px = bendDir * uy;
  const py = -bendDir * ux;
  const knee: [number, number] = [mx + px * h, my + py * h];
  const cosKnee = Math.max(-1, Math.min(1, (thighLen * thighLen + shinLen * shinLen - d * d) / (2 * thighLen * shinLen)));
  const angleDeg = 180 - (Math.acos(cosKnee) * 180) / Math.PI;
  return { knee, angleDeg };
}

/**
 * Kurva 4-Pose Foot Roll / Ankle Pitch klasik 2D (Atelier v3.5, dalam radian):
 * - Heel-Strike (`u ≈ 0.00`): `+18°` (ujung sepatu terangkat, tumit kontak lantai)
 * - Down / Flat Contact (`u ∈ [0.08, 0.36]`): `0°` (telapak rata penuh di tanah)
 * - Toe-Off / Push-Off (`u ∈ [0.38, 0.52]`): hingga `-24°` (tumit terangkat mendorong maju)
 * - Passing / Swing (`u ∈ [0.55, 0.92]`): transisi rileks `-12° → +14°`.
 */
export function footRollPitchRad(uRaw: number): number {
  const u = ((uRaw % 1) + 1) % 1;
  let deg: number;
  if (u < 0.08) {
    deg = 18 * (1 - u / 0.08);
  } else if (u <= 0.36) {
    deg = 0;
  } else if (u <= 0.5) {
    deg = -24 * ((u - 0.36) / 0.14);
  } else if (u <= 0.58) {
    deg = -24 + 12 * ((u - 0.5) / 0.08);
  } else if (u <= 0.92) {
    deg = -12 + 26 * ((u - 0.58) / 0.34);
  } else {
    deg = 14 + 4 * ((u - 0.92) / 0.08);
  }
  return (deg * Math.PI) / 180;
}

/** Gelapkan warna hex #rrggbb sebesar `factor` (mis. `0.16` = 16% lebih gelap untuk far-leg depth shading). */
export function darkenHex(hex: string, factor = 0.16): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const k = Math.max(0, Math.min(1, 1 - factor));
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Interpolasi linear mulus antara dua warna hex `#rrggbb` untuk transisi bayangan 360° tanpa kedipan. */
function lerpHex(hexA: string, hexB: string, tRaw: number): string {
  const mA = /^#?([0-9a-f]{6})$/i.exec(hexA.trim());
  const mB = /^#?([0-9a-f]{6})$/i.exec(hexB.trim());
  if (!mA || !mB) return tRaw < 0.5 ? hexA : hexB;
  const t = Math.max(0, Math.min(1, tRaw));
  const a = parseInt(mA[1], 16);
  const b = parseInt(mB[1], 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export type CastPresetId =
  | 'bangUtoh'
  | 'ebot'
  | 'arya'
  | 'rara'
  | 'dimas'
  | 'saka'
  | 'pakBudi'
  | 'buSiti'
  | 'raka'
  | 'bangUdin'
  | 'pakUjang'
  | 'tio'
  | 'mbakYuni';

/** 13 Preset Karakter Orisinal Ala Indonesia siap pakai (Atelier v4.0: polish highlight, eyeShine, earDetail & metadata peran merata). */
export const CAST_PRESETS: Record<CastPresetId, CharacterSpec> = {
  bangUtoh: {
    id: 'bangUtoh',
    name: 'Bolohoutoh (Bang Utoh)',
    role: 'Pemeran Utama #1 · Mahasiswa S1 Teknik Informatika',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#efc29b',
    skinHighlight: '#f7d6ba',
    skinShadow: '#d8aa9e',
    ink: '#1f192d',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4c1b24',
    tongueColor: '#e07a78',
    hairStyle: 'messy',
    hairColor: '#221f30',
    hairHighlight: '#3d3959',
    headgear: 'headphones',
    headgearColor: '#1f2638',
    headgearAccent: '#38bdf8',
    glasses: true,
    glassesStyle: 'tech',
    nose: true,
    browThick: 10.5,
    outfit: 'hoodieTech',
    outfitColor: '#24355c',
    outfitShade: '#192542',
    outfitSecondary: '#314778',
    accentColor: '#38bdf8',
    pantsColor: '#2b3142',
    shoeStyle: 'sneaker',
    shoeColor: '#f5f7fb',
    backpack: true,
    backpackColor: '#26334d',
    defaultProp: 'laptop',
  },
  ebot: {
    id: 'ebot',
    name: 'Ebot',
    role: 'Kreator & Pemuda Lokal · Gaya Kasual Earth-Tone',
    headShape: 'round',
    eyeStyle: 'almond',
    // Warna kulit kuning langsat - sawo matang muda hangat sesuai pencahayaan alami foto asli Ebot:
    // pipi terkena cahaya lembut (#e5bca2), midtone sawo matang cerah (#d9ab8e), kontur rahang hangat (#ba886c).
    skinHighlight: '#e5bca2',
    skin: '#d9ab8e',
    skinShadow: '#ba886c',
    ink: '#1c1518',
    eyeShine: true,
    hairStyle: 'fadeCrop',
    hairColor: '#1a1a24',
    hairHighlight: '#33364a',
    headgear: 'none',
    earDetail: true,
    nose: true,
    browThick: 10.5,
    browStyle: 'natural',
    browColor: '#231c20',
    faintMustache: true,
    fullLips: true,
    upperLipColor: '#ab7271',
    lipColor: '#c98e89',
    mouthColor: '#42161e',
    tongueColor: '#de7875',
    outfit: 'lokalKnit',
    outfitColor: '#ab947c',
    outfitShade: '#8c755e',
    outfitSecondary: '#5c4a44',
    accentColor: '#e2d5c1',
    pantsColor: '#2b2f3a',
    shoeStyle: 'sneaker',
    shoeColor: '#f4f0e8',
    defaultProp: 'coffeeCup',
  },
  arya: {
    id: 'arya',
    name: 'Mas Arya',
    role: 'Asisten Lab & Host Edutainment Kampus',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#eec39d',
    skinHighlight: '#f7d8bb',
    skinShadow: '#d9ae9f',
    ink: '#26182b',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4d1c26',
    tongueColor: '#e27d7b',
    hairStyle: 'bald',
    hairColor: '#261c2c',
    hairHighlight: '#f7d8bb',
    headgear: 'peci',
    headgearColor: '#231e2f',
    headgearAccent: '#ebb44c',
    nose: true,
    outfit: 'batik',
    outfitColor: '#293d6a',
    outfitShade: '#1d2b4e',
    accentColor: '#ebb44c',
    pantsColor: '#4a403c',
    shoeStyle: 'loafer',
    shoeColor: '#743d2a',
    defaultProp: 'book',
  },
  rara: {
    id: 'rara',
    name: 'Mbak Rara',
    role: 'Mahasiswi & Kreator Konten Kampus',
    headShape: 'round',
    eyeStyle: 'lash',
    skin: '#f7d4b8',
    skinHighlight: '#ffe5cf',
    skinShadow: '#e3bfc4',
    ink: '#24182e',
    eyeShine: true,
    mouthColor: '#4e1d29',
    tongueColor: '#e67f7d',
    lipColor: '#db8f8c',
    blushColor: 'rgba(235, 134, 134, 0.34)',
    hairStyle: 'hijab',
    hairColor: '#3b9f94',
    hairHighlight: '#297a74',
    headgear: 'none',
    glasses: true,
    browThick: 9,
    outfit: 'denim',
    outfitColor: '#4a77cb',
    outfitShade: '#3358a3',
    outfitSecondary: '#fff7ec',
    accentColor: '#f2c144',
    pantsColor: '#2c3558',
    shoeStyle: 'sneaker',
    shoeColor: '#fff5e6',
    defaultProp: 'mic',
  },
  dimas: {
    id: 'dimas',
    name: 'Bang Dimas',
    role: 'Pemuda Nongkrong Warkop · Tim Komentar',
    headShape: 'squircle',
    eyeStyle: 'pill',
    skin: '#e6b58c',
    skinHighlight: '#f3cca9',
    skinShadow: '#cfa096',
    ink: '#1c2038',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4a1b24',
    tongueColor: '#df7b78',
    hairStyle: 'short',
    hairColor: '#2c2224',
    hairHighlight: '#4b3d40',
    headgear: 'cap',
    headgearColor: '#249464',
    headgearAccent: '#fff2d4',
    outfit: 'coach',
    outfitColor: '#249464',
    outfitShade: '#19704c',
    outfitSecondary: '#f5ead3',
    accentColor: '#f2c144',
    pantsColor: '#2c334d',
    shoeStyle: 'sneaker',
    shoeColor: '#fff8ee',
    defaultProp: 'esteh',
  },
  saka: {
    id: 'saka',
    name: 'Saka Nusantara',
    role: 'Mahasiswa Senior & Aktivis Budaya Kampung',
    headShape: 'faceted',
    eyeStyle: 'sclera',
    skin: '#e7b88e',
    skinHighlight: '#f4cfac',
    skinShadow: '#d1a29c',
    ink: '#211526',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4b1a23',
    tongueColor: '#e07a78',
    hairStyle: 'spiky',
    hairColor: '#261a28',
    hairHighlight: '#46344a',
    headgear: 'iket',
    headgearColor: '#a32e35',
    headgearAccent: '#f2c14e',
    nose: true,
    outfit: 'tenun',
    outfitColor: '#c93f3b',
    outfitShade: '#98292b',
    outfitSecondary: '#f7ecd6',
    accentColor: '#27579a',
    pantsColor: '#2a2438',
    shoeStyle: 'boot',
    shoeColor: '#6d4029',
    defaultProp: 'map',
  },
  pakBudi: {
    id: 'pakBudi',
    name: 'Pak Budi (Pak RT)',
    role: 'Ketua RT 04 Kampung Rawa Sari',
    headShape: 'round',
    eyeStyle: 'classic',
    skin: '#e6b790',
    skinHighlight: '#f2ccaa',
    skinShadow: '#d0a096',
    ink: '#241828',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#481a22',
    tongueColor: '#df7a78',
    hairStyle: 'parted',
    hairColor: '#2c2530',
    hairHighlight: '#c5cad6',
    headgear: 'none',
    mustache: true,
    browThick: 13,
    outfit: 'kotakSarung',
    outfitColor: '#e8eef5',
    outfitShade: '#d5dfec',
    outfitSecondary: '#9c3638',
    accentColor: '#e8b95b',
    pantsColor: '#d0a096',
    shoeStyle: 'sandal',
    shoeColor: '#6c422c',
    defaultProp: 'kopi',
  },
  buSiti: {
    id: 'buSiti',
    name: 'Bu Siti (Warung)',
    role: 'Pemilik Warkop 24 Jam & Ibu Kos Rawa Sari',
    headShape: 'round',
    eyeStyle: 'lash',
    skin: '#f2caa6',
    skinHighlight: '#fbdec2',
    skinShadow: '#dfb3ad',
    ink: '#281829',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4e1d28',
    tongueColor: '#e57e7c',
    lipColor: '#d98a88',
    blushColor: 'rgba(232, 128, 128, 0.34)',
    hairStyle: 'bun',
    hairColor: '#2e1d26',
    hairHighlight: '#503744',
    headgear: 'none',
    earrings: true,
    browThick: 9.5,
    outfit: 'dasterCelemek',
    outfitColor: '#f29b38',
    outfitShade: '#d67824',
    outfitSecondary: '#389982',
    accentColor: '#e04f4f',
    pantsColor: '#dfb3ad',
    shoeStyle: 'sandal',
    shoeColor: '#c84b4b',
    defaultProp: 'sodet',
  },
  raka: {
    id: 'raka',
    name: 'Raka (SMA)',
    role: 'Pelajar SMA Rawa Sari · Adik Kelas Tongkrongan',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#f4cfa9',
    skinHighlight: '#fce0c3',
    skinShadow: '#dfb8b4',
    ink: '#1e1b30',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#4d1c26',
    tongueColor: '#e27d7b',
    hairStyle: 'curtain',
    hairColor: '#262336',
    hairHighlight: '#433f5e',
    headgear: 'none',
    outfit: 'seragamSma',
    outfitColor: '#fdfbf6',
    outfitShade: '#e3e4ee',
    outfitSecondary: '#78829a',
    accentColor: '#f2c144',
    pantsColor: '#78829a',
    shoeStyle: 'sneaker',
    shoeColor: '#262838',
    backpack: true,
    defaultProp: 'phone',
  },
  bangUdin: {
    id: 'bangUdin',
    name: 'Bang Udin (Ojol)',
    role: 'Driver Ojek Online Andalan Kampung Rawa Sari',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#e7b98f',
    skinHighlight: '#f4d0ae',
    skinShadow: '#cfa096',
    ink: '#191d2d',
    eyeShine: true,
    mouthColor: '#4b1a23',
    tongueColor: '#e07a78',
    hairStyle: 'short',
    hairColor: '#222430',
    hairHighlight: '#3e4257',
    headgear: 'helmet',
    headgearColor: '#19ab58',
    headgearAccent: '#232838',
    outfit: 'ojol',
    outfitColor: '#19ab58',
    outfitShade: '#128243',
    outfitSecondary: '#232838',
    accentColor: '#dce6f2',
    pantsColor: '#314975',
    shoeStyle: 'sneaker',
    shoeColor: '#242736',
    defaultProp: 'phoneMap',
  },
  pakUjang: {
    id: 'pakUjang',
    name: 'Pak Ujang (Satpam Kampung)',
    role: 'Petugas Keamanan Lingkungan · Pos Ronda RT 04 Rawa Sari',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#dfae85',
    skinHighlight: '#eec5a2',
    skinShadow: '#c79385',
    ink: '#221a24',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#471820',
    tongueColor: '#de7875',
    hairStyle: 'bald',
    hairColor: '#2a242c',
    hairHighlight: '#f7dec4',
    headgear: 'satpamCap',
    headgearColor: '#473426',
    headgearAccent: '#f2c144',
    mustache: true,
    nose: true,
    browThick: 12,
    outfit: 'satpam',
    outfitColor: '#e6d2a8',
    outfitShade: '#ceb585',
    outfitSecondary: '#473426',
    accentColor: '#f2c144',
    pantsColor: '#3d2e22',
    shoeStyle: 'boot',
    shoeColor: '#221d24',
    defaultProp: 'senter',
  },
  tio: {
    id: 'tio',
    name: 'Tio (Bakmie Ayam)',
    role: 'Pedagang Bakmie Ayam · Area Pedagang Rawa Sari',
    headShape: 'squircle',
    eyeStyle: 'classic',
    // Sawo matang gelap / hitam kecokelatan. Ink hampir hitam + kilau mata + rongga mulut gelap & bibir
    // rosewood agar mata, alis, mulut & bentuk lip-sync tetap terbaca di siang, golden hour, dan malam.
    skinHighlight: '#9c6b4c',
    skin: '#8a5a3c',
    skinShadow: '#6a4029',
    ink: '#120c0e',
    eyeShine: true,
    earDetail: true,
    mouthColor: '#2e0d12',
    tongueColor: '#d8756f',
    lipColor: '#a8574a',
    blushColor: '#9c4436',
    hairStyle: 'parted',
    hairColor: '#17131a',
    hairHighlight: '#4a4152',
    hairCombed: true,
    headgear: 'none',
    glasses: true,
    glassesStyle: 'thick',
    nose: true,
    browThick: 11,
    build: 'big',
    outfit: 'pedagangApron',
    outfitColor: '#fdf8ee',
    outfitShade: '#e8decb',
    outfitSecondary: '#a62828',
    accentColor: '#e8a832',
    pantsColor: '#2d3345',
    shoeStyle: 'sneaker',
    shoeColor: '#2f3545',
    defaultProp: 'bakmie',
  },
  mbakYuni: {
    id: 'mbakYuni',
    name: 'Mbak Yuni (Es Buah)',
    role: 'Pedagang Es Buah & Es Campur · Area Pedagang Rawa Sari',
    headShape: 'round',
    eyeStyle: 'lash',
    skinHighlight: '#fae0c6',
    skin: '#f0c49e',
    skinShadow: '#daa99d',
    ink: '#24182a',
    eyeShine: true,
    mouthColor: '#4e1d28',
    tongueColor: '#e57e7c',
    lipColor: '#df8892',
    blushColor: 'rgba(235, 130, 145, 0.34)',
    hairStyle: 'hijab',
    hairColor: '#e0566f',
    hairHighlight: '#b83c54',
    headgear: 'none',
    nose: true,
    browThick: 8.5,
    outfit: 'dasterCelemek',
    outfitColor: '#fff4dc',
    outfitShade: '#ebd8b5',
    outfitSecondary: '#2aa88f',
    accentColor: '#f6b73c',
    pantsColor: '#4c4352',
    shoeStyle: 'sandal',
    shoeColor: '#d9536f',
    defaultProp: 'esBuah',
  },
};

export function resolveActorSpec(actor: CastPresetId | CharacterSpec, overrides?: Partial<CharacterSpec>): CharacterSpec {
  const base = typeof actor === 'string' ? CAST_PRESETS[actor] : actor;
  return overrides ? { ...base, ...overrides } : base;
}

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const CX = 350;

/**
 * Faktor postur badan. 'regular' wajib bernilai netral (1 / 0) agar karakter lama render identik per piksel.
 * - torso: pengali lebar torso (tw) → bahu, perut, daster/sarung ikut melebar
 * - limb: pengali tebal lengan/kaki/tangan
 * - belly: 0..1 tonjolan perut bawah pada siluet torso
 * - armOut: geser target tangan keluar (px) agar lengan tidak menembus badan yang lebih lebar
 * - hipOut: geser pangkal paha & telapak keluar (px); telapak tetap di ACTOR_SOLE_Y
 * - apron: pengali lebar celemek pedagang
 */
type BuildFactors = { torso: number; limb: number; belly: number; armOut: number; hipOut: number; apron: number };
const BUILD_FACTORS: Record<BodyBuild, BuildFactors> = {
  slim: { torso: 0.9, limb: 0.88, belly: 0, armOut: -10, hipOut: -4, apron: 0.9 },
  regular: { torso: 1, limb: 1, belly: 0, armOut: 0, hipOut: 0, apron: 1 },
  big: { torso: 1.17, limb: 1.2, belly: 1, armOut: 18, hipOut: 9, apron: 1.2 },
};
export function buildFactors(spec: Pick<CharacterSpec, 'build'>): BuildFactors {
  return BUILD_FACTORS[spec.build ?? 'regular'];
}

function inked(
  ctx: Ctx,
  path: () => void,
  fill: string | CanvasGradient,
  ink: string,
  thin = 5.5,
  dx = 3.5,
  dy = 5.5,
) {
  ctx.save();
  ctx.translate(dx, dy);
  path();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = thin;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = thin;
  ctx.stroke();
}

function defaultFxFor(face: Expression): ComicFx {
  if (face === 'shock') return 'shock';
  if (face === 'angry') return 'anger';
  if (face === 'nervous') return 'sweat';
  if (face === 'idea') return 'sparkle';
  if (face === 'skeptical') return 'question';
  return 'none';
}

function drawBatikKawung(ctx: Ctx, x0: number, y0: number, w: number, h: number, gold: string, dark: string) {
  ctx.save();
  const step = 46;
  for (let y = y0; y < y0 + h + step; y += step) {
    for (let x = x0; x < x0 + w + step; x += step) {
      ctx.fillStyle = gold;
      for (const [dx, dy, rot] of [
        [-9, -9, Math.PI / 4],
        [9, -9, -Math.PI / 4],
        [-9, 9, -Math.PI / 4],
        [9, 9, Math.PI / 4],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, 9, 4.8, rot, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawShoe(
  ctx: Ctx,
  x: number,
  y: number,
  dir: number,
  spec: CharacterSpec,
  pitchRad = 0,
  scale = 1,
  shadeDark = false,
) {
  const { ink, shoeStyle, outfitColor } = spec;
  const shoeColor = shadeDark ? darkenHex(spec.shoeColor, 0.16) : spec.shoeColor;
  const stripeColor = shadeDark ? darkenHex(shoeColor === '#262838' ? '#ffffff' : outfitColor, 0.16) : shoeColor === '#262838' ? '#ffffff' : outfitColor;
  const needsTransform = Math.abs(pitchRad) > 1e-4 || Math.abs(scale - 1) > 1e-4;
  if (needsTransform) {
    ctx.save();
    ctx.translate(x, y - 6);
    if (Math.abs(pitchRad) > 1e-4) ctx.rotate(-dir * pitchRad);
    if (Math.abs(scale - 1) > 1e-4) ctx.scale(scale, scale);
    ctx.translate(-x, -(y - 6));
  }
  if (shoeStyle === 'sneaker') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(x - 25 + dir * 12, y - 30, 60, 30, [14, 14, 8, 8]);
      },
      shoeColor,
      ink,
      4.5,
      2,
      3.5,
    );
    ctx.fillStyle = stripeColor;
    ctx.fillRect(x - 18 + dir * 12, y - 10, 46, 5.5);
  } else if (shoeStyle === 'boot') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(x - dir * 14, y - 20);
        ctx.quadraticCurveTo(x + dir * 22, y - 22, x + dir * 42, y - 4);
        ctx.lineTo(x - dir * 16, y - 2);
        ctx.closePath();
      },
      shoeColor,
      ink,
      4.5,
      2,
      3,
    );
  } else {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.ellipse(x + dir * 13, y - 11, 31, 13, 0, 0, TAU);
      },
      shoeColor,
      ink,
      4.5,
      2,
      3.5,
    );
  }
  if (needsTransform) ctx.restore();
}

function resolveArmTarget(
  side: -1 | 1,
  armPose: ArmPose,
  torsoTop: number,
  tw: number,
  swing: number,
  isWalk: boolean,
  isSide: boolean,
  armOut = 0,
  view: ActorView = 'threeQuarter',
  travelDir: -1 | 1 = 1,
) {
  const sx = CX + (isSide ? (isWalk ? -travelDir * 4 : side * 14) : side * tw * 0.44);
  const sy = torsoTop + 52;
  let hx = CX + side * (isSide ? 42 : 134);
  let hy = torsoTop + 178;
  let bend = side * 24;

  if (armPose === 'rest' && isWalk) {
    // Counter-swing ekspresif ala referensi (1).mp4: saat kaki kanan (side=+1) maju di u=0 (swing = +cos(0) = +1),
    // lengan kiri (side=-1) mengayun jauh ke depan (+travelDir) DI LUAR siluet dada & lengan kanan (side=+1) ke belakang (-travelDir) DI LUAR punggung!
    const fwdSigned = -side * swing;
    if (isSide) {
      const reachX = fwdSigned >= 0 ? fwdSigned * 132 : fwdSigned * 124;
      hx = CX + travelDir * reachX;
      hy = torsoTop + 168 - (fwdSigned >= 0 ? fwdSigned * 34 : -fwdSigned * 18);
      bend = fwdSigned >= 0 ? -travelDir * (26 + fwdSigned * 22) : travelDir * (14 + -fwdSigned * 18);
    } else if (view === 'threeQuarter' || view === 'backThreeQuarter') {
      // Pada 3/4, kedua tangan mengayun berlawanan sepanjang sumbu gerak di luar siluet badan
      hx = CX + side * 94 + travelDir * fwdSigned * 86;
      hy = torsoTop + 170 - (fwdSigned >= 0 ? fwdSigned * 26 : -fwdSigned * 14);
      bend = fwdSigned >= 0 ? -travelDir * (18 + fwdSigned * 18) + side * 10 : travelDir * (10 + -fwdSigned * 12) + side * 12;
    } else {
      // Tampak front/back: foreshortened vertical swing bergantian ekspresif
      const depthSign = -side * swing;
      hx = CX + side * (128 + depthSign * 14);
      hy = torsoTop + 174 - depthSign * 26;
      bend = side * (24 + Math.abs(swing) * 14);
    }
  } else if (armPose === 'hip') {
    hx = CX + side * (isSide ? 16 : 108);
    hy = torsoTop + 172;
    bend = side * 52;
  } else if (armPose === 'hold') {
    hx = CX + side * (isSide ? 136 : 176);
    hy = torsoTop - 14;
    bend = side * 32;
  } else if (armPose === 'point') {
    hx = CX + side * (isSide ? 168 : 204);
    hy = torsoTop - 26;
    bend = side * 24;
  } else if (armPose === 'raise') {
    hx = CX + side * (isSide ? 110 : 188);
    hy = torsoTop - 44;
    bend = side * 30;
  } else if (armPose === 'wave') {
    hx = CX + side * (isSide ? 124 : 182);
    hy = torsoTop - 68;
    bend = side * 40;
  } else if (armPose === 'cross') {
    hx = CX - side * 26;
    hy = torsoTop + 116;
    bend = side * 46;
  } else if (armPose === 'pray') {
    hx = CX + side * 12;
    hy = torsoTop + 40;
    bend = side * 58;
  }
  if (armOut !== 0 && armPose !== 'cross' && armPose !== 'pray') hx += side * (isSide ? armOut * 0.5 : armOut);
  return { sx, sy, hx, hy, bend };
}

/** Target tangan setelah `HandRig` (breakdown `from`/`t`, `reach`, `dx`/`dy`). Koordinat kanvas sebelum `lean`. */
function resolveRiggedTarget(
  side: -1 | 1,
  armPose: ArmPose,
  rig: HandRig | undefined,
  torsoTop: number,
  tw: number,
  swing: number,
  isWalk: boolean,
  isSide: boolean,
  armOut: number,
  view: ActorView = 'threeQuarter',
  travelDir: -1 | 1 = 1,
) {
  const base = resolveArmTarget(side, armPose, torsoTop, tw, swing, isWalk, isSide, armOut, view, travelDir);
  if (!rig) return base;
  let { hx, hy, bend } = base;
  const t = rig.t === undefined ? 1 : Math.max(0, Math.min(1, rig.t));
  if (rig.from && t < 1) {
    const f = resolveArmTarget(side, rig.from, torsoTop, tw, swing, isWalk, isSide, armOut, view, travelDir);
    hx = f.hx + (hx - f.hx) * t;
    hy = f.hy + (hy - f.hy) * t;
    bend = f.bend + (bend - f.bend) * t;
  }
  if (rig.reach && rig.reach.t > 0) {
    const r = Math.max(0, Math.min(1, rig.reach.t));
    hx += (rig.reach.x - hx) * r;
    hy += (rig.reach.y - hy) * r;
    bend += (side * 36 - bend) * r;
  }
  hx += rig.dx ?? 0;
  hy += rig.dy ?? 0;
  return { sx: base.sx, sy: base.sy, hx, hy, bend };
}

const propOptionsOf = (rig?: HandRig): HandPropOptions => ({ text: rig?.propText, steam: rig?.steam, tilt: rig?.propTilt });

function drawHandAndProp(ctx: Ctx, side: -1 | 1, armPose: ArmPose, prop: HandProp, hx: number, hy: number, lk: number, spec: CharacterSpec, rig?: HandRig) {
  const { ink, skin } = spec;
  if (prop !== 'none') {
    drawHandProp(ctx, prop, hx, hy, ink, side, propOptionsOf(rig));
  }

  // Tangan (dengan jari telunjuk mini saat mode 'point'!)
  if (armPose === 'point') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(hx, hy, 16 * (1 + (lk - 1) * 0.5), 0, TAU);
      },
      skin,
      ink,
      4.5,
      2,
      3,
    );
    ctx.strokeStyle = ink;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(hx + side * 8, hy - 4);
    ctx.lineTo(hx + side * 30, hy - 14);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 6.5;
    ctx.stroke();
  } else {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(hx, hy, 17 * (1 + (lk - 1) * 0.5), 0, TAU);
      },
      skin,
      ink,
      4.5,
      2,
      3,
    );
  }
}

function resolveArmTarget360(
  side: -1 | 1,
  armPose: ArmPose,
  torsoTop: number,
  tw: number,
  swing: number,
  isWalk: boolean,
  armOut: number,
  yawRad: number,
): { sx: number; sy: number; sz: number; hx: number; hy: number; hz: number; bendX: number } {
  const rx = tw * 0.45;
  const sh = rotateYaw3D([side * rx, torsoTop + 52, 0], yawRad);
  let lx = side * 134;
  let hy = torsoTop + 178;
  let lz = 10;
  let bendLocalX = side * 24;
  let bendLocalZ = -18;

  if (armPose === 'rest' && isWalk) {
    const fwdSigned = -side * swing;
    lx = side * 124;
    lz = fwdSigned * 124;
    hy = torsoTop + 168 - (fwdSigned >= 0 ? fwdSigned * 32 : -fwdSigned * 16);
    bendLocalZ = fwdSigned >= 0 ? -(18 + fwdSigned * 22) : 14 + -fwdSigned * 16;
    bendLocalX = side * 16;
  } else if (armPose === 'hip') {
    lx = side * 118;
    hy = torsoTop + 170;
    lz = 10;
    bendLocalX = side * 62;
    bendLocalZ = -12;
  } else if (armPose === 'hold') {
    lx = side * 72;
    hy = torsoTop + 26;
    lz = 136;
    bendLocalX = side * 26;
    bendLocalZ = -24;
  } else if (armPose === 'point') {
    lx = side * 62;
    hy = torsoTop + 12;
    lz = 172;
    bendLocalX = side * 20;
  } else if (armPose === 'raise') {
    lx = side * 136;
    hy = torsoTop - 44;
    lz = 62;
    bendLocalX = side * 30;
  } else if (armPose === 'wave') {
    lx = side * 146;
    hy = torsoTop - 68;
    lz = 52;
    bendLocalX = side * 38;
  } else if (armPose === 'cross') {
    lx = -side * 24;
    hy = torsoTop + 116;
    lz = 68;
    bendLocalX = side * 44;
  } else if (armPose === 'pray') {
    lx = side * 12;
    hy = torsoTop + 40;
    lz = 76;
    bendLocalX = side * 52;
  }
  if (armOut !== 0 && armPose !== 'cross' && armPose !== 'pray') {
    lx += side * armOut;
  }
  const hProj = rotateYaw3D([lx, hy, lz], yawRad);
  const bProj = rotateYaw3D([bendLocalX, 0, bendLocalZ], yawRad);
  return {
    sx: CX + sh.x,
    sy: sh.y,
    sz: sh.z,
    hx: CX + hProj.x,
    hy: hProj.y,
    hz: hProj.z,
    bendX: bProj.x,
  };
}

function drawArm(
  ctx: Ctx,
  side: -1 | 1,
  armPose: ArmPose,
  prop: HandProp,
  torsoTop: number,
  tw: number,
  swing: number,
  isWalk: boolean,
  isSide: boolean,
  spec: CharacterSpec,
  rig?: HandRig,
  view: ActorView = 'threeQuarter',
  travelDir: -1 | 1 = 1,
  darkenFar: boolean | number = false,
  yawRad?: number,
) {
  const bf = buildFactors(spec);
  let sx: number;
  let sy: number;
  let hx: number;
  let hy: number;
  let bend: number;
  let hz = 0;

  if (yawRad !== undefined) {
    const r3 = resolveArmTarget360(side, armPose, torsoTop, tw, swing, isWalk, bf.armOut, yawRad);
    sx = r3.sx;
    sy = r3.sy;
    hx = r3.hx;
    hy = r3.hy;
    hz = r3.hz;
    bend = r3.bendX;
    if (rig) {
      const t = rig.t === undefined ? 1 : Math.max(0, Math.min(1, rig.t));
      if (rig.from && t < 1) {
        const f = resolveArmTarget360(side, rig.from, torsoTop, tw, swing, isWalk, bf.armOut, yawRad);
        hx = f.hx + (hx - f.hx) * t;
        hy = f.hy + (hy - f.hy) * t;
        hz = f.hz + (hz - f.hz) * t;
        bend = f.bendX + (bend - f.bendX) * t;
      }
      if (rig.reach && rig.reach.t > 0) {
        const r = Math.max(0, Math.min(1, rig.reach.t));
        hx += (rig.reach.x - hx) * r;
        hy += (rig.reach.y - hy) * r;
      }
      hx += rig.dx ?? 0;
      hy += rig.dy ?? 0;
    }
  } else {
    const res = resolveRiggedTarget(
      side,
      armPose,
      rig,
      torsoTop,
      tw,
      swing,
      isWalk,
      isSide,
      bf.armOut,
      view,
      travelDir,
    );
    sx = res.sx;
    sy = res.sy;
    hx = res.hx;
    hy = res.hy;
    bend = res.bend;
  }

  const { ink, skin, outfit, outfitColor, outfitSecondary } = spec;
  const lk = bf.limb;
  const isShortSleeve = outfit === 'kotakSarung' || outfit === 'dasterCelemek' || outfit === 'seragamSma';
  const baseSleeve =
    outfit === 'coach' || outfit === 'tenun' || outfit === 'ojol'
      ? (outfitSecondary ?? outfitColor)
      : outfitColor;
  const darkK = typeof darkenFar === 'number' ? darkenFar : darkenFar ? 0.14 : 0;
  const sleeveColor = darkK > 0.005 ? darkenHex(baseSleeve, darkK) : baseSleeve;
  const armSkin = darkK > 0.005 ? darkenHex(skin, darkK * 0.75) : skin;

  // Kurva Bezier 3-titik organik (shoulder -> organic elbow bend -> forearm -> hand)
  const c1x = sx + (hx - sx) * 0.38 + bend * 0.85;
  const c1y = sy + (hy - sy) * 0.42 + Math.abs(bend) * 0.14;
  const c2x = sx + (hx - sx) * 0.72 + bend * 0.55;
  const c2y = sy + (hy - sy) * 0.76 + Math.abs(bend) * 0.08;

  if (isShortSleeve) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 25 * lk;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, hx, hy);
    ctx.stroke();
    ctx.strokeStyle = armSkin;
    ctx.lineWidth = 14 * lk;
    ctx.stroke();

    ctx.strokeStyle = ink;
    ctx.lineWidth = 33 * lk;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + (c1x - sx) * 0.5, sy + (c1y - sy) * 0.5, sx + (hx - sx) * 0.36 + bend * 0.22, sy + (hy - sy) * 0.36);
    ctx.stroke();
    ctx.strokeStyle = darkK > 0.005 ? darkenHex(outfitColor, darkK) : outfitColor;
    ctx.lineWidth = 21 * lk;
    ctx.stroke();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 30 * lk;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, hx, hy);
    ctx.stroke();
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = 18 * lk;
    ctx.stroke();
  }

  // Tangan + prop di depan wajah digambar belakangan (setelah kepala) oleh drawActor.
  if (!rig?.front) drawHandAndProp(ctx, side, armPose, prop, hx, hy, lk, spec, rig);
  return { sx, sy, hx, hy, hz };
}

function drawTorsoAndSkirt(
  ctx: Ctx,
  torsoTop: number,
  tw: number,
  th: number,
  isBack: boolean,
  isSide: boolean,
  spec: CharacterSpec,
  yawRad?: number,
) {
  const { ink, outfit, outfitColor, outfitShade, outfitSecondary, accentColor } = spec;
  const bf = buildFactors(spec);
  const is360 = yawRad !== undefined;
  const rxTorso = tw * 0.5;
  const rzTorso = tw * 0.36;
  const w = is360
    ? Math.hypot(rxTorso * Math.cos(yawRad!), rzTorso * Math.sin(yawRad!)) * 2
    : isSide
      ? tw * 0.72
      : tw;
  const frontVis = is360 ? Math.cos(yawRad!) : isBack ? -1 : 1;
  const effBack = is360 ? frontVis < 0 : isBack;
  const effSide = is360 ? false : isSide;
  const cShift = is360 ? Math.sin(yawRad!) * rzTorso * 0.78 : 0;

  // Geseran pola periodik 2π terkuantisasi: `yaw = -π` dan `yaw = +π` identik 100% (nol loncatan motif batik/kotak/sarung/bunga!)
  const periodicScroll = (period: number) => {
    if (!is360) return 0;
    const k = Math.max(1, Math.round((TAU * rxTorso * 0.68) / period));
    const raw = (yawRad! / TAU) * k * period;
    return ((raw % period) + period) % period;
  };

  // Proyeksi permukaan silinder 3D murni (Atelier v5.1): foreshortening kosinus sampai 0 -> NOL pop di ±90° maupun ±71.3°!
  const withCylSurface = (theta: number, fn: () => void, rScale = 0.86) => {
    if (!is360) {
      fn();
      return;
    }
    const alpha = yawRad! + theta;
    const vis = Math.cos(alpha);
    if (vis <= 0.015) return;
    const sx = CX + w * 0.5 * rScale * Math.sin(alpha);
    ctx.save();
    ctx.translate(sx, 0);
    ctx.scale(vis, 1);
    ctx.translate(-CX, 0);
    fn();
    ctx.restore();
  };

  // Helper kompatibilitas untuk jalur legacy (non-360)
  const withCylWrap = (fn: () => void) => {
    if (!is360) {
      fn();
      return;
    }
    withCylSurface(0, fn, 0.86);
  };

  // Daster terusan (Bu Siti)
  if (outfit === 'dasterCelemek') {
    const dressH = 382;
    const dressPath = () => {
      ctx.beginPath();
      ctx.moveTo(CX - w * 0.36, torsoTop + 6);
      ctx.quadraticCurveTo(CX, torsoTop - 4, CX + w * 0.36, torsoTop + 6);
      ctx.bezierCurveTo(CX + w * 0.56, torsoTop + 110, CX + w * 0.62, torsoTop + 260, CX + w * 0.56, torsoTop + dressH);
      ctx.quadraticCurveTo(CX, torsoTop + dressH + 18, CX - w * 0.56, torsoTop + dressH);
      ctx.bezierCurveTo(CX - w * 0.62, torsoTop + 260, CX - w * 0.56, torsoTop + 110, CX - w * 0.36, torsoTop + 6);
      ctx.closePath();
    };
    const dg = ctx.createLinearGradient(CX - w * 0.5, torsoTop, CX + w * 0.55, torsoTop + dressH);
    dg.addColorStop(0, outfitColor);
    dg.addColorStop(0.6, outfitColor);
    dg.addColorStop(1, outfitShade);
    inked(ctx, dressPath, dg, ink, 5.5, 3.5, 5.5);

    ctx.save();
    dressPath();
    ctx.clip();
    const pts = [
      [-54, 56],
      [46, 48],
      [0, 102],
      [-64, 152],
      [62, 146],
      [-50, 248],
      [54, 256],
      [4, 308],
      [-68, 336],
      [70, 342],
    ];
    const dScroll = periodicScroll(360);
    for (const [fx, fy] of pts) {
      const span = 180;
      const rawX = is360 ? (((fx + dScroll + span) % (span * 2) + span * 2) % (span * 2)) - span : fx * (isSide ? 0.65 : 1);
      const px = CX + rawX;
      const py = torsoTop + fy;
      ctx.fillStyle = '#fff5db';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * 10, py + Math.sin(a) * 10, 7.5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, TAU);
      ctx.fill();
    }

    if (is360) {
      // Celemek depan (θ = 0) & tali ikat belakang (θ = π) ter-clip rapi di dalam `dressPath()` -> menyempit mulus ke 0 di ±90°!
      withCylSurface(Math.PI, () => {
        ctx.strokeStyle = outfitSecondary ?? '#389982';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(CX - w * 0.56, torsoTop + 156);
        ctx.lineTo(CX + w * 0.56, torsoTop + 156);
        ctx.stroke();
      }, 0.92);
      withCylSurface(0, () => {
        const apronTop = torsoTop + 150;
        const aw = 84;
        const apronPath = () => {
          ctx.beginPath();
          ctx.moveTo(CX - aw, apronTop);
          ctx.lineTo(CX + aw, apronTop);
          ctx.lineTo(CX + aw * 1.12, apronTop + 154);
          ctx.quadraticCurveTo(CX, apronTop + 170, CX - aw * 1.12, apronTop + 154);
          ctx.closePath();
        };
        inked(ctx, apronPath, outfitSecondary ?? '#389982', ink, 4.5, 2.5, 3.5);
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath();
        ctx.roundRect(CX - aw * 0.48, apronTop + 44, aw * 0.96, 52, 12);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.stroke();
      }, 0.92);
      ctx.restore();
      dressPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
      return;
    }
    ctx.restore();

    if (!effBack) {
      withCylWrap(() => {
        const apronTop = torsoTop + 150;
        const aw = effSide ? 58 : 84;
        const apronPath = () => {
          ctx.beginPath();
          ctx.moveTo(CX - aw, apronTop);
          ctx.lineTo(CX + aw, apronTop);
          ctx.lineTo(CX + aw * 1.12, apronTop + 154);
          ctx.quadraticCurveTo(CX, apronTop + 170, CX - aw * 1.12, apronTop + 154);
          ctx.closePath();
        };
        inked(ctx, apronPath, outfitSecondary ?? '#389982', ink, 4.5, 2.5, 3.5);
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath();
        ctx.roundRect(CX - aw * 0.48, apronTop + 44, aw * 0.96, 52, 12);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.stroke();
      });
    } else {
      // Tali celemek ikat pita di punggung!
      ctx.strokeStyle = outfitSecondary ?? '#389982';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(CX - w * 0.45, torsoTop + 156);
      ctx.lineTo(CX + w * 0.45, torsoTop + 156);
      ctx.stroke();
    }
    return;
  }

  // Sarung tenun kotak-kotak (Pak Budi) di bawah kemeja
  const sarungTop = torsoTop + th - 66;
  if (outfit === 'kotakSarung') {
    const sarungH = 220;
    const sw = is360 ? w * 0.48 : isSide ? 68 : 94;
    const sarungPath = () => {
      ctx.beginPath();
      ctx.moveTo(CX - sw, sarungTop);
      ctx.lineTo(CX + sw, sarungTop);
      ctx.lineTo(CX + sw * 1.12, sarungTop + sarungH);
      ctx.quadraticCurveTo(CX, sarungTop + sarungH + 14, CX - sw * 1.12, sarungTop + sarungH);
      ctx.closePath();
    };
    const sg = ctx.createLinearGradient(CX - sw, sarungTop, CX + sw, sarungTop + sarungH);
    sg.addColorStop(0, outfitSecondary ?? '#9c3638');
    sg.addColorStop(0.62, outfitSecondary ?? '#9c3638');
    sg.addColorStop(1, '#6e2328');
    inked(ctx, sarungPath, sg, ink, 5.5, 3.5, 5);
    ctx.save();
    sarungPath();
    ctx.clip();
    const sScroll = periodicScroll(48);
    ctx.fillStyle = 'rgba(28, 36, 68, 0.45)';
    for (let x = CX - 140 + sScroll; x <= CX + 140; x += 48) ctx.fillRect(x, sarungTop, 18, sarungH + 20);
    for (let y = sarungTop + 26; y < sarungTop + sarungH; y += 48) ctx.fillRect(CX - 140, y, 280, 14);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    for (let x = CX - 122 + sScroll; x <= CX + 140; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, sarungTop);
      ctx.lineTo(x, sarungTop + sarungH + 20);
      ctx.stroke();
    }
    for (let y = sarungTop + 44; y < sarungTop + sarungH; y += 48) {
      ctx.beginPath();
      ctx.moveTo(CX - 140, y);
      ctx.lineTo(CX + 140, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#b44344';
    ctx.fillRect(CX - 140, sarungTop, 280, 22);
    ctx.restore();
  }

  // Torso kapsul/jaket standar
  const bottomY = outfit === 'kotakSarung' ? sarungTop + 14 : torsoTop + th;
  const bellyFwd = is360 ? bf.belly * Math.sin(yawRad!) * 16 : 0;
  const torsoPath = () => {
    ctx.beginPath();
    // Perut (build 'big'): titik kontrol bawah melebar & turun, pinggul bawah lebih lebar → siluet buncit ringan.
    const bl = bf.belly;
    const bc = 0.56 + 0.12 * bl;
    const be = 0.22 + 0.07 * bl;
    const bcy = 12 - 10 * bl;
    ctx.moveTo(CX - w * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - w * 0.62, torsoTop + th * 0.35, CX - w * bc + Math.min(0, bellyFwd), bottomY - bcy, CX - w * be, bottomY);
    ctx.quadraticCurveTo(CX + bellyFwd * 0.4, bottomY + 12 + 6 * bl, CX + w * be, bottomY);
    ctx.bezierCurveTo(CX + w * bc + Math.max(0, bellyFwd), bottomY - bcy, CX + w * 0.62, torsoTop + th * 0.35, CX + w * 0.42, torsoTop + 8);
    ctx.closePath();
  };
  const tg = ctx.createLinearGradient(CX - w * 0.5, torsoTop, CX + w * 0.55, bottomY);
  tg.addColorStop(0, outfitColor);
  tg.addColorStop(0.6, outfitColor);
  tg.addColorStop(1, outfitShade);
  inked(ctx, torsoPath, tg, ink, 5.5, 3.5, 5);

  ctx.save();
  torsoPath();
  ctx.clip();

  if (outfit === 'batik') {
    const bOff = periodicScroll(46);
    drawBatikKawung(ctx, CX - w * 0.65 - 46 + bOff, torsoTop + 18, w * 1.3 + 92, th, accentColor, '#7d4d20');
    if (is360 || !effBack) {
      withCylSurface(0.06, () => {
        ctx.fillStyle = outfitShade;
        ctx.fillRect(CX - 13, torsoTop, 26, th);
        ctx.fillStyle = accentColor;
        for (const by of [torsoTop + 56, torsoTop + 106, torsoTop + 156, torsoTop + 200]) {
          ctx.beginPath();
          ctx.arc(CX, by, 5, 0, TAU);
          ctx.fill();
        }
      });
    }
  } else if (outfit === 'denim') {
    if (is360 || !effBack) {
      withCylSurface(0, () => {
        ctx.fillStyle = outfitSecondary ?? '#fff7ec';
        ctx.fillRect(CX - 28, torsoTop, 58, th);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.strokeRect(CX - 28, torsoTop - 4, 58, th + 8);
        if (!is360) {
          ctx.strokeStyle = 'rgba(255,245,225,0.6)';
          ctx.lineWidth = 3;
          ctx.strokeRect(CX + 40, torsoTop + 98, 32, 32);
          ctx.strokeRect(CX - 72, torsoTop + 98, 32, 32);
        }
      });
      if (is360) {
        for (const s of [-1, 1]) {
          withCylSurface(s * 0.56, () => {
            ctx.strokeStyle = 'rgba(255,245,225,0.6)';
            ctx.lineWidth = 3;
            ctx.strokeRect(CX - 16, torsoTop + 98, 32, 32);
          });
        }
      }
    }
    if (is360 || effBack) {
      withCylSurface(Math.PI, () => {
        ctx.strokeStyle = 'rgba(255,245,225,0.45)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(CX - w, torsoTop + 68);
        ctx.lineTo(CX + w, torsoTop + 68);
        ctx.stroke();
      });
    }
  } else if (outfit === 'coach') {
    ctx.fillStyle = '#fff5df';
    ctx.fillRect(CX - w, torsoTop + th - 16, w * 2, 16);
    if (is360 || !effBack) {
      withCylSurface(0.05, () => {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(CX, torsoTop + 12);
        ctx.lineTo(CX, torsoTop + th);
        ctx.stroke();
        ctx.fillStyle = '#fff5df';
        for (const by of [torsoTop + 56, torsoTop + 102, torsoTop + 148, torsoTop + 190]) {
          ctx.beginPath();
          ctx.arc(CX, by, 5.5, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        if (!is360) {
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(CX - 52, torsoTop + 86, 16, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      });
      if (is360) {
        withCylSurface(-0.44, () => {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 4;
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(CX, torsoTop + 86, 16, 0, TAU);
          ctx.fill();
          ctx.stroke();
        });
      }
    }
  } else if (outfit === 'tenun') {
    if (is360 || !effBack) {
      withCylSurface(0.04, () => {
        ctx.fillStyle = outfitSecondary ?? '#f7ecd6';
        ctx.beginPath();
        ctx.moveTo(CX - 36, torsoTop);
        ctx.lineTo(CX + 40, torsoTop);
        ctx.lineTo(CX + 6, torsoTop + 130);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.strokeStyle = '#f2c14e';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(CX - 40, torsoTop + 6);
        ctx.lineTo(CX + 4, torsoTop + 138);
        ctx.lineTo(CX + 44, torsoTop + 6);
        ctx.stroke();
      });
    }
    ctx.fillStyle = accentColor;
    ctx.fillRect(CX - w, torsoTop + th - 54, w * 2, 34);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(CX - w, torsoTop + th - 50, w * 2, 5);
    ctx.fillRect(CX - w, torsoTop + th - 26, w * 2, 5);
  } else if (outfit === 'kotakSarung') {
    const kScroll = periodicScroll(32);
    ctx.strokeStyle = '#567eb8';
    ctx.lineWidth = 4;
    for (let x = CX - 160 + kScroll; x <= CX + 160; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, torsoTop);
      ctx.lineTo(x, bottomY + 12);
      ctx.stroke();
    }
    for (let y = torsoTop + 18; y < bottomY + 12; y += 32) {
      ctx.beginPath();
      ctx.moveTo(CX - 160, y);
      ctx.lineTo(CX + 160, y);
      ctx.stroke();
    }
    if (is360) {
      withCylSurface(0.46, () => {
        ctx.fillStyle = '#dce5f2';
        ctx.fillRect(CX - 19, torsoTop + 68, 38, 42);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(CX - 19, torsoTop + 68, 38, 42);
        ctx.strokeStyle = '#c93c3c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(CX + 5, torsoTop + 48);
        ctx.lineTo(CX + 1, torsoTop + 72);
        ctx.stroke();
      });
    } else if (!effBack && !effSide) {
      ctx.fillStyle = '#dce5f2';
      ctx.fillRect(CX + 32, torsoTop + 68, 38, 42);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(CX + 32, torsoTop + 68, 38, 42);
      ctx.strokeStyle = '#c93c3c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(CX + 56, torsoTop + 48);
      ctx.lineTo(CX + 52, torsoTop + 72);
      ctx.stroke();
    }
  } else if (outfit === 'seragamSma') {
    ctx.fillStyle = outfitSecondary ?? '#78829a';
    ctx.fillRect(CX - w, torsoTop + th - 36, w * 2, 42);
    ctx.fillStyle = '#252636';
    ctx.fillRect(CX - w, torsoTop + th - 48, w * 2, 16);
    if (is360) {
      withCylSurface(0.04, () => {
        ctx.fillStyle = '#d4dae6';
        ctx.fillRect(CX - 10, torsoTop + th - 46, 20, 12);
        ctx.fillStyle = '#5b647a';
        ctx.beginPath();
        ctx.moveTo(CX - 12, torsoTop + 18);
        ctx.lineTo(CX + 12, torsoTop + 18);
        ctx.lineTo(CX + 17, torsoTop + 130);
        ctx.lineTo(CX, torsoTop + 154);
        ctx.lineTo(CX - 17, torsoTop + 130);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.stroke();
      });
      withCylSurface(0.4, () => {
        ctx.strokeStyle = 'rgba(30,27,48,0.45)';
        ctx.lineWidth = 3;
        ctx.strokeRect(CX - 17, torsoTop + 66, 34, 40);
        ctx.fillStyle = accentColor;
        ctx.fillRect(CX - 10, torsoTop + 75, 20, 22);
        ctx.fillStyle = '#335fc4';
        ctx.fillRect(CX - 6, torsoTop + 79, 12, 14);
      });
      if (spec.backpack) {
        for (const s of [-1, 1]) {
          withCylSurface(s * 0.66, () => {
            ctx.fillStyle = '#2a2b3d';
            ctx.fillRect(CX - 9, torsoTop, 18, th - 46);
          });
        }
      }
    } else if (!effBack) {
      ctx.fillStyle = '#d4dae6';
      ctx.fillRect(CX - 4, torsoTop + th - 46, 20, 12);
      if (!effSide) {
        ctx.strokeStyle = 'rgba(30,27,48,0.45)';
        ctx.lineWidth = 3;
        ctx.strokeRect(CX + 26, torsoTop + 66, 34, 40);
        ctx.fillStyle = accentColor;
        ctx.fillRect(CX + 33, torsoTop + 75, 20, 22);
        ctx.fillStyle = '#335fc4';
        ctx.fillRect(CX + 37, torsoTop + 79, 12, 14);
      }
      ctx.fillStyle = '#5b647a';
      ctx.beginPath();
      ctx.moveTo(CX - 6, torsoTop + 18);
      ctx.lineTo(CX + 18, torsoTop + 18);
      ctx.lineTo(CX + 23, torsoTop + 130);
      ctx.lineTo(CX + 6, torsoTop + 154);
      ctx.lineTo(CX - 11, torsoTop + 130);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.stroke();
      if (spec.backpack) {
        ctx.fillStyle = '#2a2b3d';
        ctx.fillRect(CX - w * 0.39, torsoTop, 18, th - 46);
        ctx.fillRect(CX + w * 0.31, torsoTop, 18, th - 46);
      }
    }
  } else if (outfit === 'ojol') {
    ctx.fillStyle = outfitSecondary ?? '#232838';
    ctx.fillRect(CX - w, torsoTop, w * 2, 56);
    ctx.fillRect(CX - w, torsoTop + th - 48, w * 2, 60);
    ctx.fillStyle = accentColor;
    ctx.fillRect(CX - w, torsoTop + 56, w * 2, 12);
    ctx.fillRect(CX - w, torsoTop + th - 58, w * 2, 10);
    if (is360 || !effBack) {
      withCylSurface(0.05, () => {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(CX, torsoTop);
        ctx.lineTo(CX, torsoTop + th + 14);
        ctx.stroke();
      });
    }
  } else if (outfit === 'hoodieTech') {
    // Strip manset bawah hoodie + aksen cyan tipis khas HMTI S1 Teknik Informatika
    ctx.fillStyle = outfitShade;
    ctx.fillRect(CX - w, torsoTop + th - 26, w * 2, 32);
    ctx.fillStyle = accentColor;
    ctx.fillRect(CX - w, torsoTop + th - 30, w * 2, 5);
    // Panel bahu hoodie yang sedikit lebih terang
    ctx.fillStyle = outfitSecondary ?? '#314778';
    ctx.fillRect(CX - w, torsoTop, w * 2, 42);

    if (is360 || !effBack) {
      withCylSurface(0.02, () => {
        // Kantong kanguru hoodie di perut bawah
        const kw = effSide ? 42 : 66;
        ctx.fillStyle = outfitShade;
        ctx.beginPath();
        ctx.moveTo(CX - kw * 0.78, torsoTop + 132);
        ctx.lineTo(CX + kw * 0.78, torsoTop + 132);
        ctx.lineTo(CX + kw, torsoTop + th - 34);
        ctx.lineTo(CX - kw, torsoTop + th - 34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.8;
        ctx.stroke();

        // Tali hoodie putih-krem dengan ujung cyan
        for (const sx of [-18, 22]) {
          const tx = CX + (effSide ? sx * 0.55 : sx);
          ctx.strokeStyle = '#f5f0e2';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(tx, torsoTop + 18);
          ctx.quadraticCurveTo(tx + (sx < 0 ? -4 : 5), torsoTop + 56, tx, torsoTop + 82);
          ctx.stroke();
          ctx.fillStyle = accentColor;
          ctx.fillRect(tx - 3, torsoTop + 78, 6, 10);
        }

        // Lanyard KTM Mahasiswa S1 Teknik Informatika di dada!
        const lx = effSide ? CX + 10 : CX + 2;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(CX - (effSide ? 18 : 34), torsoTop + 6);
        ctx.lineTo(lx, torsoTop + 92);
        ctx.lineTo(CX + (effSide ? 24 : 38), torsoTop + 6);
        ctx.stroke();

        // Kartu KTM putih-biru tergantung di ujung lanyard
        ctx.fillStyle = '#f8fbff';
        ctx.beginPath();
        ctx.roundRect(lx - 18, torsoTop + 88, 36, 46, 5);
        ctx.fill();
        ctx.fillStyle = accentColor;
        ctx.fillRect(lx - 18, torsoTop + 88, 36, 12);
        ctx.fillStyle = '#25355c';
        ctx.fillRect(lx - 11, torsoTop + 106, 11, 14);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(lx + 4, torsoTop + 107, 9, 4);
        ctx.fillRect(lx + 4, torsoTop + 114, 9, 4);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(lx - 18, torsoTop + 88, 36, 46, 5);
        ctx.stroke();

        if (!is360 && !effSide) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(CX + 40, torsoTop + 56);
          ctx.lineTo(CX + 32, torsoTop + 63);
          ctx.lineTo(CX + 40, torsoTop + 70);
          ctx.moveTo(CX + 48, torsoTop + 56);
          ctx.lineTo(CX + 56, torsoTop + 63);
          ctx.lineTo(CX + 48, torsoTop + 70);
          ctx.stroke();
        }
        if (!is360 && spec.backpack) {
          ctx.fillStyle = '#182032';
          ctx.fillRect(CX - w * 0.43, torsoTop, 16, th - 48);
          ctx.fillRect(CX + w * 0.35, torsoTop, 16, th - 48);
        }
      });
      if (is360) {
        withCylSurface(0.46, () => {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(CX - 4, torsoTop + 56);
          ctx.lineTo(CX - 12, torsoTop + 63);
          ctx.lineTo(CX - 4, torsoTop + 70);
          ctx.moveTo(CX + 4, torsoTop + 56);
          ctx.lineTo(CX + 12, torsoTop + 63);
          ctx.lineTo(CX + 4, torsoTop + 70);
          ctx.stroke();
        });
        if (spec.backpack) {
          for (const s of [-1, 1]) {
            withCylSurface(s * 0.68, () => {
              ctx.fillStyle = '#182032';
              ctx.fillRect(CX - 8, torsoTop, 16, th - 48);
            });
          }
        }
      }
    }
  } else if (outfit === 'satpam') {
    const darkTrim = outfitSecondary ?? '#473426';
    if (is360) {
      // Epaulette bahu berputar mengikuti bahu 3D (tidak statis di tepi 2D layar!)
      for (const s of [-1, 1]) {
        const ep = rotateYaw3D([s * tw * 0.38, torsoTop + 10, 0], yawRad!);
        const epW = 28 + 32 * Math.abs(frontVis);
        ctx.fillStyle = darkTrim;
        ctx.fillRect(CX + ep.x - epW * 0.5, torsoTop, epW, 24);
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(CX + ep.x - s * epW * 0.28 * frontVis, torsoTop + 12, 5.2, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = darkTrim;
      ctx.fillRect(CX - w * 0.56, torsoTop, w * 0.34, 24);
      ctx.fillRect(CX + w * 0.22, torsoTop, w * 0.34, 24);
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(CX - w * 0.27, torsoTop + 12, 5.5, 0, TAU);
      ctx.arc(CX + w * 0.27, torsoTop + 12, 5.5, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = '#251e1c';
    ctx.fillRect(CX - w, torsoTop + th - 48, w * 2, 24);
    if (is360) {
      withCylSurface(0.03, () => {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(CX - 16, torsoTop + th - 45, 32, 18, 4);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(CX, torsoTop + 16);
        ctx.lineTo(CX, torsoTop + th - 48);
        ctx.stroke();
        ctx.fillStyle = darkTrim;
        for (const by of [torsoTop + 56, torsoTop + 100, torsoTop + 144]) {
          ctx.beginPath();
          ctx.arc(CX, by, 4.5, 0, TAU);
          ctx.fill();
        }
      });
      // Saku dada kiri (nametag + tali peluit) & kanan (perisai emas) diproyeksikan di azimut sebenarnya!
      withCylSurface(-0.46, () => {
        ctx.fillStyle = outfitShade;
        ctx.fillRect(CX - 21, torsoTop + 62, 42, 44);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(CX - 21, torsoTop + 62, 42, 44);
        ctx.beginPath();
        ctx.moveTo(CX - 21, torsoTop + 62);
        ctx.lineTo(CX, torsoTop + 76);
        ctx.lineTo(CX + 21, torsoTop + 62);
        ctx.stroke();
        ctx.fillStyle = '#1f232c';
        ctx.fillRect(CX - 21, torsoTop + 46, 42, 11);
        ctx.fillStyle = '#fff5df';
        ctx.fillRect(CX - 15, torsoTop + 50, 30, 3);
        ctx.strokeStyle = '#f8f4e8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(CX - 34, torsoTop + 20);
        ctx.quadraticCurveTo(CX - 14, torsoTop + 88, CX, torsoTop + 72);
        ctx.stroke();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      withCylSurface(0.46, () => {
        ctx.fillStyle = outfitShade;
        ctx.fillRect(CX - 21, torsoTop + 62, 42, 44);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(CX - 21, torsoTop + 62, 42, 44);
        ctx.beginPath();
        ctx.moveTo(CX - 21, torsoTop + 62);
        ctx.lineTo(CX, torsoTop + 76);
        ctx.lineTo(CX + 21, torsoTop + 62);
        ctx.stroke();
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(CX, torsoTop + 80);
        ctx.lineTo(CX + 11, torsoTop + 85);
        ctx.lineTo(CX + 8, torsoTop + 99);
        ctx.lineTo(CX, torsoTop + 104);
        ctx.lineTo(CX - 8, torsoTop + 99);
        ctx.lineTo(CX - 11, torsoTop + 85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();
      });
    } else if (!effBack) {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(CX - 16, torsoTop + th - 45, 32, 18, 4);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(CX + 4, torsoTop + 16);
      ctx.lineTo(CX + 4, torsoTop + th - 48);
      ctx.stroke();
      ctx.fillStyle = darkTrim;
      for (const by of [torsoTop + 56, torsoTop + 100, torsoTop + 144]) {
        ctx.beginPath();
        ctx.arc(CX + 4, by, 4.5, 0, TAU);
        ctx.fill();
      }
      if (!effSide) {
        for (const px of [CX - 70, CX + 28]) {
          ctx.fillStyle = outfitShade;
          ctx.fillRect(px, torsoTop + 62, 42, 44);
          ctx.strokeStyle = ink;
          ctx.lineWidth = 3.5;
          ctx.strokeRect(px, torsoTop + 62, 42, 44);
          ctx.beginPath();
          ctx.moveTo(px, torsoTop + 62);
          ctx.lineTo(px + 21, torsoTop + 76);
          ctx.lineTo(px + 42, torsoTop + 62);
          ctx.stroke();
        }
        ctx.fillStyle = '#1f232c';
        ctx.fillRect(CX - 70, torsoTop + 46, 42, 11);
        ctx.fillStyle = '#fff5df';
        ctx.fillRect(CX - 64, torsoTop + 50, 30, 3);
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(CX + 49, torsoTop + 80);
        ctx.lineTo(CX + 60, torsoTop + 85);
        ctx.lineTo(CX + 57, torsoTop + 99);
        ctx.lineTo(CX + 49, torsoTop + 104);
        ctx.lineTo(CX + 41, torsoTop + 99);
        ctx.lineTo(CX + 38, torsoTop + 85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.strokeStyle = '#f8f4e8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(CX - w * 0.42, torsoTop + 20);
        ctx.quadraticCurveTo(CX - 62, torsoTop + 88, CX - 49, torsoTop + 72);
        ctx.stroke();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  } else if (outfit === 'pedagangApron') {
    const apronCol = outfitSecondary ?? '#a62828';
    const ak = bf.apron;
    // Di mode 360°, celemek depan (θ = 0) & tali X belakang (θ = π) berjalan kontinu tanpa pop ±90°!
    if (is360 || effBack) {
      withCylSurface(Math.PI, () => {
        ctx.strokeStyle = apronCol;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(CX - 42 * ak, torsoTop + 8);
        ctx.lineTo(CX + 42 * ak, torsoTop + 130);
        ctx.moveTo(CX + 42 * ak, torsoTop + 8);
        ctx.lineTo(CX - 42 * ak, torsoTop + 130);
        ctx.moveTo(CX - w * 0.56, torsoTop + 138);
        ctx.lineTo(CX + w * 0.56, torsoTop + 138);
        ctx.stroke();
      }, 0.92);
    }
    if (is360 || !effBack) {
      withCylSurface(0, () => {
        ctx.strokeStyle = apronCol;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(CX - 36, torsoTop + 4);
        ctx.lineTo(CX - 48 * ak, torsoTop + 58);
        ctx.moveTo(CX + 36, torsoTop + 4);
        ctx.lineTo(CX + 48 * ak, torsoTop + 58);
        ctx.stroke();

        const aw = (is360 ? 74 : effSide ? 48 : 74) * ak;
        ctx.fillStyle = apronCol;
        ctx.beginPath();
        ctx.moveTo(CX - aw * 0.68, torsoTop + 52);
        ctx.lineTo(CX + aw * 0.68, torsoTop + 52);
        ctx.lineTo(CX + aw * 0.88, torsoTop + 128);
        ctx.lineTo(CX + aw, torsoTop + th + 6);
        ctx.lineTo(CX - aw, torsoTop + th + 6);
        ctx.lineTo(CX - aw * 0.88, torsoTop + 128);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.2;
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.fillRect(CX - aw * 0.64, torsoTop + 58, aw * 1.28, 7);
        const pw = (is360 ? 52 : effSide ? 32 : 52) * ak;
        ctx.fillStyle = '#fff5e0';
        ctx.beginPath();
        ctx.roundRect(CX - pw, torsoTop + 144, pw * 2, 54, 10);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3.8;
        ctx.stroke();
        ctx.fillStyle = accentColor;
        ctx.fillRect(CX - pw + 4, torsoTop + 148, pw * 2 - 8, 9);
      }, 0.92);
    }
  } else if (outfit === 'lokalKnit') {
    const innerTee = outfitSecondary ?? '#594742';
    ctx.fillStyle = outfitShade;
    ctx.fillRect(CX - w, torsoTop + th - 22, w * 2, 28);
    if (is360 || !effBack) {
      withCylSurface(0, () => {
        const openW = effSide ? 24 : 38;
        ctx.fillStyle = innerTee;
        ctx.beginPath();
        ctx.moveTo(CX - openW, torsoTop);
        ctx.lineTo(CX + openW, torsoTop);
        ctx.lineTo(CX + openW * 0.82, torsoTop + th - 20);
        ctx.lineTo(CX - openW * 0.82, torsoTop + th - 20);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#433430';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(CX - openW * 0.88, torsoTop + 10);
        ctx.quadraticCurveTo(CX, torsoTop + 28, CX + openW * 0.88, torsoTop + 10);
        ctx.stroke();

        for (const s of [-1, 1]) {
          const ribOuter = s * (openW + 20);
          const ribInner = s * (openW - 2);
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.moveTo(CX + ribInner, torsoTop);
          ctx.lineTo(CX + ribOuter, torsoTop);
          ctx.quadraticCurveTo(CX + ribOuter * 0.92, torsoTop + th * 0.5, CX + ribOuter * 0.78, torsoTop + th);
          ctx.lineTo(CX + ribInner * 0.8, torsoTop + th);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = 3.8;
          ctx.stroke();

          ctx.strokeStyle = 'rgba(72, 54, 42, 0.34)';
          ctx.lineWidth = 2.4;
          for (let ry = torsoTop + 18; ry < torsoTop + th - 22; ry += 13) {
            const k = 1 - ((ry - torsoTop) / th) * 0.18;
            ctx.beginPath();
            ctx.moveTo(CX + ribInner * k + s * 2, ry);
            ctx.lineTo(CX + ribOuter * k - s * 2, ry + 2);
            ctx.stroke();
          }
        }

        if (!is360 && !effSide) {
          for (const s of [-1, 1]) {
            ctx.strokeStyle = ink;
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            ctx.moveTo(CX + s * 64, torsoTop + 134);
            ctx.lineTo(CX + s * 78, torsoTop + 178);
            ctx.stroke();
          }
        }
      }, 0.88);
      if (is360) {
        for (const s of [-1, 1]) {
          withCylSurface(s * 0.68, () => {
            ctx.strokeStyle = ink;
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            ctx.moveTo(CX - s * 7, torsoTop + 134);
            ctx.lineTo(CX + s * 7, torsoTop + 178);
            ctx.stroke();
          });
        }
      }
    }
    if (is360 || effBack) {
      withCylSurface(Math.PI, () => {
        ctx.strokeStyle = 'rgba(64, 48, 36, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(CX - w, torsoTop + 56);
        ctx.quadraticCurveTo(CX, torsoTop + 68, CX + w, torsoTop + 56);
        ctx.stroke();
      });
    }
  }
  ctx.restore();

  // Kerah depan / tudung hoodie (di mode 360° menyempit mulus ke 0 saat ±90°, tudung hoodie membesar kontinu di belakang!)
  if ((is360 || !effBack) && (outfit === 'batik' || outfit === 'kotakSarung' || outfit === 'seragamSma' || outfit === 'satpam' || outfit === 'pedagangApron')) {
    const colAlpha = is360 ? smoothstepHair(0.02, 0.24, frontVis) : 1;
    if (colAlpha > 0.01) {
      ctx.save();
      if (colAlpha < 0.999) ctx.globalAlpha *= colAlpha;
      withCylSurface(0, () => {
        inked(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(CX - 54, torsoTop + 2);
            ctx.lineTo(CX - 20, torsoTop + 36);
            ctx.lineTo(CX + 6, torsoTop + 18);
            ctx.lineTo(CX + 34, torsoTop + 36);
            ctx.lineTo(CX + 58, torsoTop + 2);
            ctx.closePath();
          },
          outfit === 'batik' ? '#354f85' : outfit === 'satpam' ? outfitColor : '#ffffff',
          ink,
          4.5,
          2,
          3,
        );
      }, 0.78);
      ctx.restore();
    }
  } else if (outfit === 'ojol') {
    const neckW = is360 ? 116 * (0.72 + 0.28 * Math.abs(frontVis)) : 116;
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(CX - neckW * 0.5, torsoTop - 4, neckW, 25, 10);
      },
      outfitSecondary ?? '#232838',
      ink,
      4.5,
      2,
      3,
    );
  } else if (outfit === 'hoodieTech') {
    if (is360) {
      const neckW = 132 * (0.74 + 0.26 * Math.abs(frontVis));
      const hoodBack = smoothstepHair(-0.1, 0.65, -frontVis);
      const hoodX = CX - Math.sin(yawRad!) * 16;
      const hoodDrop = 22 + 50 * hoodBack;
      const hoodHalfW = neckW * 0.5 * (1 - hoodBack) + 76 * hoodBack;
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(hoodX - hoodHalfW, torsoTop + 4);
          ctx.quadraticCurveTo(hoodX, torsoTop - 10 - 6 * hoodBack, hoodX + hoodHalfW, torsoTop + 4);
          ctx.quadraticCurveTo(hoodX + hoodHalfW * 0.88, torsoTop + hoodDrop * 0.88, hoodX, torsoTop + hoodDrop);
          ctx.quadraticCurveTo(hoodX - hoodHalfW * 0.88, torsoTop + hoodDrop * 0.88, hoodX - hoodHalfW, torsoTop + 4);
          ctx.closePath();
        },
        outfitSecondary ?? '#314778',
        ink,
        4.5,
        2,
        3,
      );
    } else {
      inked(
        ctx,
        () => {
          ctx.beginPath();
          if (effBack) {
            ctx.moveTo(CX - 76, torsoTop + 4);
            ctx.quadraticCurveTo(CX, torsoTop - 16, CX + 76, torsoTop + 4);
            ctx.quadraticCurveTo(CX + 66, torsoTop + 64, CX, torsoTop + 72);
            ctx.quadraticCurveTo(CX - 66, torsoTop + 64, CX - 76, torsoTop + 4);
          } else {
            ctx.roundRect(CX - 66, torsoTop - 6, 132, 28, 14);
          }
          ctx.closePath();
        },
        outfitSecondary ?? '#314778',
        ink,
        4.5,
        2,
        3,
      );
    }
  }

  // Ransel penuh di tampilan belakang (mode non-360; di mode 360° ransel di-render lewat depth-sort queue tersendiri!)
  if (!is360 && effBack && spec.backpack) {
    drawBackpackMesh(ctx, CX, torsoTop, spec, false, 1);
  }
}

function drawBackpackMesh(
  ctx: Ctx,
  bx: number,
  torsoTop: number,
  spec: CharacterSpec,
  sideView: boolean,
  backVis = 1,
  yawRad?: number,
) {
  const { ink, outfit, accentColor } = spec;
  const bpCol = spec.backpackColor ?? '#d64545';
  const bpPocket = spec.backpackColor ? '#1c2538' : '#b53434';
  const is360 = yawRad !== undefined;
  // Mode 360°: proyeksi kapsul 3D kontinu tanpa boolean `sideMode` (nol lompatan lebar +32px di ±65°/±115°!)
  const packW = is360
    ? 2 * Math.hypot(82 * Math.cos(yawRad!), 44 * Math.sin(yawRad!))
    : sideView
      ? 90
      : 92 + 72 * Math.max(0, Math.min(1, backVis));
  const packY = torsoTop + (is360 ? 26 : sideView ? 24 : 28);
  const packH = is360 ? 170 : sideView ? 158 : 174;
  const packPath = () => {
    ctx.beginPath();
    ctx.roundRect(bx - packW / 2, packY, packW, packH, 28);
  };
  inked(ctx, packPath, bpCol, ink, 5.5, 3.5, 5);
  if (is360) {
    const bv = Math.max(0, -Math.cos(yawRad!));
    if (bv > 0.03) {
      ctx.save();
      packPath();
      ctx.clip();
      const pxShift = -Math.sin(yawRad!) * 34;
      const pw = 124 * bv;
      ctx.fillStyle = bpPocket;
      ctx.beginPath();
      ctx.roundRect(bx + pxShift - pw * 0.5, packY + 90, pw, 60, 14);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.stroke();
      if (outfit === 'hoodieTech') {
        const sw = 108 * bv;
        ctx.fillStyle = accentColor;
        ctx.fillRect(bx + pxShift - sw * 0.5, packY + 74, sw, 8);
      }
      ctx.restore();
    }
  } else if (packW > 110) {
    ctx.fillStyle = bpPocket;
    ctx.beginPath();
    ctx.roundRect(bx - packW * 0.38, packY + 90, packW * 0.76, 60, 14);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (outfit === 'hoodieTech') {
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx - packW * 0.33, packY + 74, packW * 0.66, 8);
    }
  }
}

function draw3DBrimPass(
  ctx: Ctx,
  hy: number,
  pass: 'back' | 'front',
  outerRx: number,
  outerY0: number,
  outerYCos: number,
  outerRz: number,
  innerRx: number,
  innerY0: number,
  innerYCos: number,
  innerRz: number,
  fill: string,
  ink: string,
  lw: number,
  shX: number,
  shY: number,
) {
  const N = 32;
  const tMin = -0.46 * Math.PI;
  const tMax = 0.46 * Math.PI;
  const outerAt = (t: number) =>
    rotateYaw3D([outerRx * Math.sin(t), outerY0 + outerYCos * Math.cos(t), outerRz * Math.cos(t)], hy);
  const innerAt = (t: number) =>
    rotateYaw3D([innerRx * Math.sin(t), innerY0 + innerYCos * Math.cos(t), innerRz * Math.cos(t)], hy);

  // Sisipkan titik potong eksak z = 0 agar perpindahan segmen 'back' (z < 0) <-> 'front' (z >= 0) 100% kontinu!
  const ts: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = tMin + (i / N) * (tMax - tMin);
    if (i > 0) {
      const tPrev = tMin + ((i - 1) / N) * (tMax - tMin);
      const z0 = (outerAt(tPrev).z + innerAt(tPrev).z) * 0.5;
      const z1 = (outerAt(t).z + innerAt(t).z) * 0.5;
      if ((z0 < 0 && z1 > 0) || (z0 > 0 && z1 < 0)) {
        const frac = -z0 / (z1 - z0);
        ts.push(tPrev + frac * (t - tPrev));
      }
    }
    ts.push(t);
  }

  const segs: {
    o0: { x: number; y: number; z: number };
    o1: { x: number; y: number; z: number };
    i0: { x: number; y: number; z: number };
    i1: { x: number; y: number; z: number };
    zMid: number;
  }[] = [];
  for (let k = 0; k < ts.length - 1; k++) {
    const o0 = outerAt(ts[k]);
    const o1 = outerAt(ts[k + 1]);
    const i0 = innerAt(ts[k]);
    const i1 = innerAt(ts[k + 1]);
    segs.push({ o0, o1, i0, i1, zMid: (o0.z + o1.z + i0.z + i1.z) * 0.25 });
  }

  const keep = pass === 'back' ? (z: number) => z < 0 : (z: number) => z >= 0;
  let runStart = -1;
  const flushRun = (a: number, b: number) => {
    const ribbon = () => {
      ctx.beginPath();
      ctx.moveTo(segs[a].o0.x, segs[a].o0.y);
      for (let i = a; i <= b; i++) ctx.lineTo(segs[i].o1.x, segs[i].o1.y);
      for (let i = b; i >= a; i--) ctx.lineTo(segs[i].i1.x, segs[i].i1.y);
      ctx.lineTo(segs[a].i0.x, segs[a].i0.y);
      ctx.closePath();
    };
    inked(ctx, ribbon, fill, ink, lw, shX, shY);
  };
  for (let i = 0; i < segs.length; i++) {
    if (keep(segs[i].zMid)) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      flushRun(runStart, i - 1);
      runStart = -1;
    }
  }
  if (runStart >= 0) flushRun(runStart, segs.length - 1);
}

function drawHeadgear(
  ctx: Ctx,
  spec: CharacterSpec,
  W: number,
  headTop: number,
  cy: number,
  pop: number,
  isBack: boolean,
  isBack34 = false,
  headFacing = 0,
  headYawRad?: number,
  isSide = false,
  pass: 'back' | 'front' | 'both' = 'both',
) {
  const { ink, headgear, headgearColor, headgearAccent } = spec;
  if (headgear === 'none') return;
  const is360 = headYawRad !== undefined;
  const hy = headYawRad ?? 0;
  const frontVis = is360 ? Math.cos(hy) : isBack ? -1 : 1;
  const sideSin = is360 ? Math.sin(hy) : Math.max(-1, Math.min(1, headFacing));
  const effBack = is360 ? frontVis < -0.1 : isBack;
  const drawBack = pass === 'back' || pass === 'both';
  const drawFront = pass === 'front' || pass === 'both';

  const wPop = smoothstepHair(0, 0.35, pop);
  if (headgear === 'peci') {
    if (!drawFront) return;
    const col = headgearColor ?? '#231e2f';
    // Oval 3D dinamis: memanjang alami di profil samping (0.48 -> 0.57) & lipatan tengah terproyeksi kontinu
    const pw = is360 ? W * (0.48 + 0.09 * sideSin * sideSin) : Math.max(124, W * 0.495);
    const archTop = is360 ? 20 - 5 * sideSin * sideSin : 20;
    const archBot = is360 ? 16 - 4 * sideSin * sideSin : 16;
    ctx.save();
    ctx.translate(CX + sideSin * 6, headTop + 26 - pop * 46);
    const baseRot = is360 ? sideSin * 0.035 : -0.04;
    ctx.rotate(baseRot * (1 - wPop) + -0.14 * pop * wPop);
    const p = () => {
      ctx.beginPath();
      ctx.moveTo(-pw, 18);
      ctx.lineTo(-pw * 0.88, -76);
      ctx.quadraticCurveTo(0, -76 - archTop, pw * 0.88, -76);
      ctx.lineTo(pw, 18);
      ctx.quadraticCurveTo(0, 18 + archBot, -pw, 18);
      ctx.closePath();
    };
    const pg = ctx.createLinearGradient(-pw * 0.88, -80, pw * 0.88, 20);
    pg.addColorStop(0, '#3c3550');
    pg.addColorStop(0.45, col);
    pg.addColorStop(1, '#161220');
    inked(ctx, p, pg, ink, 5.5, 3, 4.5);
    if (is360) {
      // Proyeksi lipatan tengah atas peci mengikuti silinder oval 3D
      const creaseX = pw * 0.78 * sideSin;
      const creaseVis = smoothstepHair(-0.15, 0.35, frontVis);
      if (creaseVis > 0.02) {
        ctx.save();
        p();
        ctx.clip();
        ctx.globalAlpha *= 0.24 * creaseVis;
        ctx.strokeStyle = '#7c7398';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(creaseX, -88);
        ctx.quadraticCurveTo(creaseX * 0.94, -32, creaseX * 0.88, 12);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.strokeStyle = headgearAccent ?? '#ebb44c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.93, 10);
    ctx.quadraticCurveTo(0, 10 + archBot * 0.88, pw * 0.93, 10);
    ctx.stroke();
    ctx.restore();
  } else if (headgear === 'cap') {
    const col = headgearColor ?? '#249464';
    const front = headgearAccent ?? '#fff2d4';
    ctx.save();
    ctx.translate(CX + (is360 ? sideSin * 6 : 0), headTop + 34 - pop * 44);
    const baseRot = is360 ? sideSin * 0.035 : 0.04;
    ctx.rotate(baseRot * (1 - wPop) + 0.14 * pop * wPop);
    const brimDir = isBack ? (headFacing >= 0 ? 1 : -1) : Math.abs(headFacing) >= 0.08 ? (headFacing >= 0 ? 1 : -1) : 1;
    const brimColor = col === '#249464' ? '#19704c' : col;
    const cw = is360 ? Math.max(138, W * 0.515) : 140;
    const brimTipDrop = 18 + 6 * Math.max(0, frontVis);

    const drawCapCrown = () => {
      const crown = () => {
        ctx.beginPath();
        ctx.moveTo(-cw, 10);
        ctx.bezierCurveTo(-cw * 1.03, -64, -cw * 0.54, -86, 0, -84);
        ctx.bezierCurveTo(cw * 0.56, -86, cw * 1.03, -62, cw, 10);
        ctx.quadraticCurveTo(0, 26, -cw, 10);
        ctx.closePath();
      };
      inked(ctx, crown, col, ink, 5.5, 3.5, 4.5);
      // Panel putih depan silindris sejati via cylSpan (melengkung & menyusut tepat ke 0 px di tepi siluet!)
      if (is360) {
        const panelSpan = cylSpan(hy, -0.58, 0.58, cw);
        if (panelSpan !== null) {
          ctx.save();
          crown();
          ctx.clip();
          ctx.fillStyle = front;
          const pw = panelSpan.x1 - panelSpan.x0;
          ctx.beginPath();
          ctx.moveTo(panelSpan.x0, 26);
          ctx.bezierCurveTo(panelSpan.x0 - pw * 0.06, -42, panelSpan.x0 + pw * 0.16, -84, panelSpan.midX, -86);
          ctx.bezierCurveTo(panelSpan.x1 - pw * 0.16, -84, panelSpan.x1 + pw * 0.06, -42, panelSpan.x1, 26);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        }
        // Tali pengatur belakang silindris sejati via cylSpan(hy + PI)
        const strapSpan = cylSpan(hy + Math.PI, -0.44, 0.44, cw);
        if (strapSpan !== null && strapSpan.x1 - strapSpan.x0 > 6) {
          const sw = strapSpan.x1 - strapSpan.x0;
          ctx.save();
          crown();
          ctx.clip();
          ctx.globalAlpha *= smoothstepHair(0.05, 0.35, strapSpan.vis);
          inked(
            ctx,
            () => {
              ctx.beginPath();
              ctx.roundRect(strapSpan.x0, -4, sw, 18, Math.min(9, sw * 0.45));
            },
            brimColor,
            ink,
            4,
            1.5,
            2,
          );
          ctx.restore();
        }
      } else if (frontVis > -0.1) {
        const panelX = Math.abs(headFacing) < 0.08 && !isSide ? 0 : 26 * brimDir;
        ctx.save();
        crown();
        ctx.clip();
        ctx.fillStyle = front;
        ctx.beginPath();
        ctx.ellipse(panelX, -24, 68, 72, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }
      inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -88, 12, 0, TAU); }, '#f2c144', ink, 4, 1.5, 2);
    };

    if (is360) {
      if (drawBack) {
        draw3DBrimPass(ctx, hy, 'back', 102, 12, brimTipDrop, 162, 98, -3, 4, 96, brimColor, ink, 5, 2.5, 3.5);
      }
      if (drawFront) {
        drawCapCrown();
        draw3DBrimPass(ctx, hy, 'front', 102, 12, brimTipDrop, 162, 98, -3, 4, 96, brimColor, ink, 5, 2.5, 3.5);
      }
    } else if (drawFront) {
      const drawLegacyBrim = () => {
        if (isBack && !isBack34) {
          inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-42, -10, 84, 20, 10); }, brimColor, ink, 4, 1.5, 2);
        } else if (!isBack && !isSide && Math.abs(headFacing) < 0.08) {
          const brim = () => {
            ctx.beginPath();
            ctx.moveTo(-108, 8);
            ctx.quadraticCurveTo(0, 42, 108, 8);
            ctx.quadraticCurveTo(0, 18, -108, 8);
            ctx.closePath();
          };
          inked(ctx, brim, brimColor, ink, 5, 2.5, 3.5);
        } else {
          const brim = () => {
            ctx.beginPath();
            ctx.moveTo(brimDir * 116, 2);
            ctx.quadraticCurveTo(brimDir * 204, 10, brimDir * 194, 26);
            ctx.quadraticCurveTo(brimDir * 148, 32, brimDir * 92, 18);
            ctx.closePath();
          };
          inked(ctx, brim, brimColor, ink, 5, 2.5, 3.5);
        }
      };
      if (!isBack) {
        drawCapCrown();
        drawLegacyBrim();
      } else {
        drawLegacyBrim();
        drawCapCrown();
      }
    }
    ctx.restore();
  } else if (headgear === 'iket') {
    const col = headgearColor ?? '#a32e35';
    const gold = headgearAccent ?? '#f2c14e';
    ctx.save();
    ctx.translate(0, -pop * 18);
    const legDir = headFacing >= 0 ? 1 : -1;
    const bw = is360 ? W * (0.495 + 0.03 * sideSin * sideSin) : W * 0.52;
    // Jangkar pangkal sayap tepat pada radius silinder pita (rBand) agar selalu menempel rapat di 0°, 89°, 111°, & 180°!
    const rBand = bw * 0.96;
    const wA = is360 ? rotateYaw3D([rBand * Math.sin(0.46), headTop + 6, -rBand * Math.cos(0.46)], hy) : { x: legDir * 38, y: headTop + 8, z: 0 };
    const wB = is360 ? rotateYaw3D([rBand * 1.18 * Math.sin(0.84), headTop - 52, -rBand * 0.55 * Math.cos(0.84)], hy) : { x: legDir * 110, y: headTop - 50, z: 0 };
    const wC = is360 ? rotateYaw3D([rBand * Math.sin(1.12), headTop + 16, -rBand * Math.cos(1.12)], hy) : { x: legDir * 116, y: headTop + 16, z: 0 };
    const wingMidZ = (wA.z + wB.z + wC.z) / 3;
    const drawWing = () => {
      const wingScale = is360 ? 0.9 + 0.1 * smoothstepHair(-90, 90, wingMidZ) : 1;
      const cxW = (wA.x + wB.x + wC.x) / 3;
      const cyW = (wA.y + wB.y + wC.y) / 3;
      const wing = () => {
        ctx.beginPath();
        ctx.moveTo(CX + cxW + (wA.x - cxW) * wingScale, cyW + (wA.y - cyW) * wingScale);
        ctx.lineTo(CX + cxW + (wB.x - cxW) * wingScale, cyW + (wB.y - cyW) * wingScale);
        ctx.lineTo(CX + cxW + (wC.x - cxW) * wingScale, cyW + (wC.y - cyW) * wingScale);
        ctx.closePath();
      };
      inked(ctx, wing, col, ink, 5, 2.5, 3.5);
    };

    if (is360) {
      if (drawBack && wingMidZ < 0) drawWing();
      if (drawFront) {
        const band = () => {
          ctx.beginPath();
          ctx.moveTo(CX - bw, headTop + 42);
          ctx.quadraticCurveTo(CX, headTop + 16, CX + bw, headTop + 40);
          ctx.lineTo(CX + bw * 0.96, headTop - 2);
          ctx.quadraticCurveTo(CX, headTop - 22, CX - bw * 0.96, headTop);
          ctx.closePath();
        };
        inked(ctx, band, col, ink, 5.5, 3, 4.5);
        ctx.save();
        band();
        ctx.clip();
        // Motif chevron diproyeksikan ke permukaan silinder via sudut azimut (menyempit perspektif di tepi siluet!)
        const chevCount = 14;
        const stepAng = TAU / chevCount;
        ctx.strokeStyle = gold;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        for (let k = 0; k < chevCount; k++) {
          const a0 = k * stepAng;
          const aMid = a0 + stepAng * 0.5;
          const p0 = surfacePoint3D(CX, headTop, bw, bw, a0, hy);
          const pm = surfacePoint3D(CX, headTop, bw, bw, aMid, hy);
          if (p0.vis > -0.15 || pm.vis > -0.15) {
            const sag0 = 14 * (1 - p0.nx * p0.nx);
            const sagM = 14 * (1 - pm.nx * pm.nx);
            ctx.moveTo(p0.x, headTop - 16 + sag0 * 0.4);
            ctx.lineTo(pm.x, headTop + 16 - sagM * 0.2);
            ctx.lineTo(p0.x, headTop + 44 - sag0 * 0.3);
          }
        }
        ctx.stroke();
        ctx.restore();
        if (wingMidZ >= 0) drawWing();
        // Simpul depan silindris via cylSpan (menyusut mulus sampai 0 px!)
        const knotSpan = cylSpan(hy, -0.18, 0.18, bw * 0.92);
        if (knotSpan !== null && knotSpan.x1 - knotSpan.x0 > 3) {
          const kw = knotSpan.x1 - knotSpan.x0;
          ctx.save();
          ctx.globalAlpha *= smoothstepHair(0.05, 0.3, knotSpan.vis);
          inked(
            ctx,
            () => {
              ctx.beginPath();
              ctx.roundRect(CX + knotSpan.x0, headTop - 4, kw, 38, Math.min(11, kw * 0.45));
            },
            '#b8373d',
            ink,
            4.5,
            2,
            3,
          );
          ctx.restore();
        }
      }
    } else if (drawFront) {
      drawWing();
      const band = () => {
        ctx.beginPath();
        ctx.moveTo(CX - bw, headTop + 42);
        ctx.quadraticCurveTo(CX, headTop + 16, CX + bw, headTop + 40);
        ctx.lineTo(CX + bw * 0.96, headTop - 2);
        ctx.quadraticCurveTo(CX, headTop - 22, CX - bw * 0.96, headTop);
        ctx.closePath();
      };
      inked(ctx, band, col, ink, 5.5, 3, 4.5);
      ctx.save();
      band();
      ctx.clip();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      for (let x = CX - 160; x <= CX + 160; x += 32) {
        ctx.moveTo(x, headTop - 16);
        ctx.lineTo(x + 16, headTop + 16);
        ctx.lineTo(x, headTop + 44);
      }
      ctx.stroke();
      ctx.restore();
      if (frontVis > 0.1) {
        const knotX = CX + 22 * legDir;
        inked(ctx, () => { ctx.beginPath(); ctx.roundRect(knotX - 18, headTop - 4, 36, 38, 11); }, '#b8373d', ink, 4.5, 2, 3);
      }
    }
    ctx.restore();
  } else if (headgear === 'helmet') {
    const col = headgearColor ?? '#19ab58';
    const dark = headgearAccent ?? '#232838';
    ctx.save();
    ctx.translate(CX, cy - pop * 36);
    ctx.rotate(-0.1 * pop * wPop);

    const helmRx = 144;
    // Batok bawah helm naik rapi di sekitar pipi (y=36) saat tampak depan/samping & turun penuh menutupi tengkuk (y=128) di tampak belakang!
    const backDrop = is360 ? 36 + 92 * smoothstepHair(0.25, -0.58, frontVis) : 130;
    const helmOuter = () => {
      ctx.beginPath();
      ctx.moveTo(-helmRx, 28);
      ctx.bezierCurveTo(-helmRx - 10, -76, -88, -152, 0, -150);
      ctx.bezierCurveTo(88, -152, helmRx + 10, -76, helmRx, 28);
      ctx.bezierCurveTo(helmRx - 8, 28 + (backDrop - 28) * 0.68, 72, backDrop, 0, backDrop);
      ctx.bezierCurveTo(-72, backDrop, -helmRx + 8, 28 + (backDrop - 28) * 0.68, -helmRx, 28);
      ctx.closePath();
    };
    const hg = ctx.createLinearGradient(-140, -150, 140, 30);
    hg.addColorStop(0, '#23c266');
    hg.addColorStop(0.55, col);
    hg.addColorStop(1, '#128243');

    if (is360) {
      if (drawBack) {
        // Cangkang belakang helm solid simetris (digambar di belakang kepala/wajah)
        inked(ctx, helmOuter, hg, ink, 5.5, 3.5, 5);
      }
      if (drawFront) {
        // Bukaan wajah dihitung langsung dari proyeksi silinder cylSpan (simetri cermin kiri-kanan 100% presisi!)
        const openSpan = cylSpan(hy, -1.12, 1.12, 134);
        const traceHelmetFrontShell = () => {
          helmOuter();
          if (openSpan !== null && openSpan.x1 - openSpan.x0 > 3) {
            const ox0 = openSpan.x0;
            const ox1 = openSpan.x1;
            const omid = openSpan.midX;
            const browY = -74 + 14 * (1 - openSpan.vis);
            const jawY = 146;
            // Winding berlawanan arah (CCW) agar 'evenodd' / nonzero memotong bukaan wajah bersih di tengah cangkang!
            ctx.moveTo(ox0, jawY);
            ctx.lineTo(ox0, 18);
            ctx.bezierCurveTo(ox0, browY + 28, ox0 + (omid - ox0) * 0.45, browY, omid, browY);
            ctx.bezierCurveTo(ox1 - (ox1 - omid) * 0.45, browY, ox1, browY + 28, ox1, 18);
            ctx.lineTo(ox1, jawY);
            ctx.closePath();
          }
        };

        ctx.save();
        helmOuter();
        ctx.clip();
        ctx.fillStyle = hg;
        traceHelmetFrontShell();
        ctx.fill('evenodd');
        ctx.clip('evenodd');

        // Pita meridian 3D (stripeR = 136 < helmRx = 144 & p.z >= -24 agar selalu terlihat utuh di 0°, 89°, 111°, & 180°!)
        const SN = 36;
        const stripeR = 136;
        ctx.strokeStyle = dark;
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let penDown = false;
        for (let i = 0; i <= SN; i++) {
          const t = -0.35 * Math.PI + (i / SN) * (1.7 * Math.PI);
          const p = rotateYaw3D([0, -stripeR * Math.sin(t), stripeR * Math.cos(t)], hy);
          if (p.z >= -24) {
            if (!penDown) {
              ctx.moveTo(p.x, p.y);
              penDown = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            penDown = false;
          }
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(-62, -106, 32, 14, -0.45, 0, TAU);
        ctx.fill();
        ctx.restore();

        // Outline luar helm + rim bukaan wajah simetris
        ctx.strokeStyle = ink;
        ctx.lineWidth = 5.5;
        if (openSpan !== null && openSpan.x1 - openSpan.x0 > 3) {
          const ox0 = openSpan.x0;
          const ox1 = openSpan.x1;
          const omid = openSpan.midX;
          const browY = -74 + 14 * (1 - openSpan.vis);
          ctx.save();
          ctx.beginPath();
          ctx.rect(-148, -152, 296, 292);
          ctx.moveTo(ox0, 140);
          ctx.lineTo(ox0, 18);
          ctx.bezierCurveTo(ox0, browY + 28, ox0 + (omid - ox0) * 0.45, browY, omid, browY);
          ctx.bezierCurveTo(ox1 - (ox1 - omid) * 0.45, browY, ox1, browY + 28, ox1, 18);
          ctx.lineTo(ox1, 140);
          ctx.closePath();
          ctx.clip('evenodd');
          helmOuter();
          ctx.stroke();
          ctx.restore();

          // Rim lengkung dahi bukaan wajah
          ctx.save();
          helmOuter();
          ctx.clip();
          ctx.beginPath();
          ctx.moveTo(ox0, 134);
          ctx.lineTo(ox0, 18);
          ctx.bezierCurveTo(ox0, browY + 28, ox0 + (omid - ox0) * 0.45, browY, omid, browY);
          ctx.bezierCurveTo(ox1 - (ox1 - omid) * 0.45, browY, ox1, browY + 28, ox1, 18);
          ctx.lineTo(ox1, 134);
          ctx.stroke();
          ctx.restore();
        } else {
          helmOuter();
          ctx.stroke();
        }

        // Visor 3D melengkung sejati memeluk dahi helm
        const visorAlpha = smoothstepHair(-0.18, 0.14, frontVis);
        if (visorAlpha > 0.02) {
          ctx.save();
          if (visorAlpha < 0.999) ctx.globalAlpha *= visorAlpha;
          const VN = 18;
          const vR = 132;
          const ptsBot: { x: number; y: number }[] = [];
          const ptsTop: { x: number; y: number }[] = [];
          for (let i = 0; i <= VN; i++) {
            const t = -0.36 * Math.PI + (i / VN) * (0.72 * Math.PI);
            const pb = rotateYaw3D([vR * Math.sin(t), -34 - 16 * Math.cos(t), vR * Math.cos(t)], hy);
            const pt = rotateYaw3D([vR * 0.88 * Math.sin(t), -94 - 14 * Math.cos(t), vR * 0.88 * Math.cos(t)], hy);
            if (pb.z > -16) {
              ptsBot.push({ x: Math.max(-helmRx * 0.9, Math.min(helmRx * 0.9, pb.x)), y: pb.y });
              ptsTop.push({ x: Math.max(-helmRx * 0.84, Math.min(helmRx * 0.84, pt.x)), y: pt.y });
            }
          }
          if (ptsBot.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(ptsBot[0].x, ptsBot[0].y);
            for (let i = 1; i < ptsBot.length; i++) ctx.lineTo(ptsBot[i].x, ptsBot[i].y);
            for (let i = ptsTop.length - 1; i >= 0; i--) ctx.lineTo(ptsTop[i].x, ptsTop[i].y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(135, 206, 250, 0.45)';
            ctx.fill();
            ctx.strokeStyle = ink;
            ctx.lineWidth = 4.5;
            ctx.stroke();
          }
          ctx.restore();
        }

        for (const s of [-1, 1] as const) {
          const rv = rotateYaw3D([s * 126, -24, 22], hy);
          const rvVis = smoothstepHair(-28, 12, rv.z);
          if (rvVis > 0.04) {
            const rxClamp = Math.max(-helmRx + 4, Math.min(helmRx - 4, rv.x));
            ctx.save();
            ctx.globalAlpha *= rvVis;
            inked(ctx, () => { ctx.beginPath(); ctx.ellipse(rxClamp, -26, 10 * rvVis, 10, 0, 0, TAU); }, dark, ink, 3.5, 1, 2);
            ctx.restore();
          }
        }
      }
    } else if (drawFront) {
      const helm = () => {
        ctx.beginPath();
        if (isBack && !isBack34) {
          ctx.arc(0, -14, 148, 0, TAU);
        } else if (isBack34 || isSide) {
          const bDir = headFacing >= 0 ? 1 : -1;
          const openEdge = isSide ? 86 : 116;
          ctx.moveTo(bDir * openEdge, 62);
          ctx.quadraticCurveTo(bDir * (openEdge - 22), 4, bDir * (openEdge + 8), -42);
          ctx.bezierCurveTo(bDir * 136, -124, bDir * 52, -162, 0, -162);
          ctx.bezierCurveTo(-bDir * 96, -162, -bDir * 156, -86, -bDir * 148, 8);
          ctx.bezierCurveTo(-bDir * 142, 98, -bDir * 64, 134, 0, 134);
          ctx.bezierCurveTo(bDir * 52, 134, bDir * 96, 108, bDir * openEdge, 62);
          ctx.closePath();
        } else {
          ctx.moveTo(-144, 34);
          ctx.bezierCurveTo(-158, -74, -92, -152, 0, -150);
          ctx.bezierCurveTo(96, -152, 158, -74, 144, 34);
          ctx.lineTo(122, 26);
          ctx.bezierCurveTo(128, -42, 92, -76, 0, -76);
          ctx.bezierCurveTo(-92, -76, -128, -42, -122, 26);
          ctx.closePath();
        }
      };
      inked(ctx, helm, hg, ink, 5.5, 3.5, 5);
      ctx.save();
      helm();
      ctx.clip();
      ctx.fillStyle = dark;
      ctx.fillRect(-18, -160, 36, effBack ? 320 : 95);
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.beginPath();
      ctx.ellipse(-62, -106, 32, 14, -0.45, 0, TAU);
      ctx.fill();
      ctx.restore();
      if (frontVis > -0.15) {
        const vxShift = isSide ? (headFacing >= 0 ? 1 : -1) * 56 : headFacing * 24;
        const vwScale = isSide ? 0.56 : 0.88;
        const vLeft = vxShift - 132 * vwScale;
        const vRight = vxShift + 132 * vwScale;
        const vMid = (vLeft + vRight) * 0.5;
        ctx.fillStyle = 'rgba(135, 206, 250, 0.45)';
        ctx.beginPath();
        ctx.moveTo(vLeft, -34);
        ctx.quadraticCurveTo(vMid, -54, vRight, -34);
        ctx.quadraticCurveTo(vRight, -72, vRight - 18 * vwScale, -94);
        ctx.quadraticCurveTo(vMid, -110, vLeft + 18 * vwScale, -94);
        ctx.quadraticCurveTo(vLeft, -72, vLeft, -34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.5;
        ctx.stroke();
        const rivetList = !isSide ? [-130 * vwScale + vxShift, 130 * vwScale + vxShift] : [-(headFacing >= 0 ? 1 : -1) * 72 + vxShift];
        for (const sx of rivetList) {
          inked(ctx, () => { ctx.beginPath(); ctx.arc(sx, -24, 11, 0, TAU); }, dark, ink, 3.5, 1, 2);
        }
      }
    }
    ctx.restore();
  } else if (headgear === 'headphones') {
    const col = headgearColor ?? '#1f2638';
    const led = headgearAccent ?? '#38bdf8';
    if (is360) {
      const cups360 = (
        [
          { s: -1 as const, p: rotateYaw3D([-W * 0.56, cy + 14 - pop * 48, 0], hy) },
          { s: 1 as const, p: rotateYaw3D([W * 0.56, cy + 14 - pop * 48, 0], hy) },
        ] as const
      )
        .map((c) => ({ s: c.s, p: c.p, z: c.p.z }))
        .sort((a, b) => a.z - b.z);
      if (drawBack) {
        for (const c of cups360) {
          if (c.p.z < 0) drawHeadphoneCup(ctx, CX + c.p.x, c.p.y, c.s, col, led, ink, 1, hy);
        }
        drawHeadphoneBand360(ctx, spec, W, cy, pop, hy, 'back');
      }
      if (drawFront) {
        drawHeadphoneBand360(ctx, spec, W, cy, pop, hy, 'front');
        for (const c of cups360) {
          if (c.p.z >= 0) drawHeadphoneCup(ctx, CX + c.p.x, c.p.y, c.s, col, led, ink, 1, hy);
        }
      }
    } else if (drawFront) {
      ctx.save();
      ctx.translate(CX, cy - pop * 48);
      ctx.rotate(-0.1 * pop * wPop);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 27;
      ctx.beginPath();
      ctx.ellipse(0, 6, W * 0.56, W * 0.56, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 15;
      ctx.stroke();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, 6, W * 0.56, W * 0.56, 0, Math.PI * 1.32, Math.PI * 1.68);
      ctx.stroke();
      const sideCups: readonly (-1 | 1)[] = isSide ? [headFacing >= 0 ? -1 : 1] : [-1, 1];
      for (const s of sideCups) {
        drawHeadphoneCup(ctx, s * (W * 0.52), 14, s, col, led, ink);
      }
      ctx.restore();
    }
  } else if (headgear === 'satpamCap') {
    const col = headgearColor ?? '#473426';
    const gold = headgearAccent ?? '#f2c144';
    ctx.save();
    ctx.translate(CX + sideSin * 11, headTop + 30 - pop * 46);
    // Anti-simetris murni terhadap sideSin di mode 360° agar simetri kiri-kanan 100% presisi!
    const baseRot = is360 ? sideSin * 0.04 : -0.03 + sideSin * 0.04;
    ctx.rotate(baseRot * (1 - wPop) + -0.12 * pop * wPop);
    const cw = is360 ? 124 * (1 - 0.08 * sideSin * sideSin) : 124;

    if (is360) {
      if (drawBack) {
        draw3DBrimPass(ctx, hy, 'back', 108, 22, 12, 156, 102, 6, 6, 92, '#1b1d24', ink, 4.5, 2, 3);
      }
      if (drawFront) {
        const crown = () => {
          ctx.beginPath();
          ctx.moveTo(-cw, 6);
          ctx.lineTo(-cw * 1.19, -56);
          ctx.quadraticCurveTo(0, -92, cw * 1.19, -56);
          ctx.lineTo(cw, 6);
          ctx.quadraticCurveTo(0, 22, -cw, 6);
          ctx.closePath();
        };
        inked(ctx, crown, col, ink, 5.5, 3, 4.5);
        const band = () => {
          ctx.beginPath();
          ctx.moveTo(-cw * 1.02, 8);
          ctx.quadraticCurveTo(0, 24, cw * 1.02, 8);
          ctx.lineTo(cw * 0.98, -20);
          ctx.quadraticCurveTo(0, -8, -cw * 0.98, -20);
          ctx.closePath();
        };
        inked(ctx, band, '#241b17', ink, 4.5, 2, 3);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(-cw * 0.95, -4);
        ctx.quadraticCurveTo(0, 10, cw * 0.95, -4);
        ctx.stroke();

        draw3DBrimPass(ctx, hy, 'front', 108, 22, 12, 156, 102, 6, 6, 92, '#1b1d24', ink, 4.5, 2, 3);

        // Lencana emas silindris sejati via cylSpan ter-clip ke mahkota topi
        const embSpan = cylSpan(hy, -0.22, 0.22, cw * 0.92);
        if (embSpan !== null && embSpan.x1 - embSpan.x0 > 3) {
          const embX = embSpan.midX;
          const halfW = (embSpan.x1 - embSpan.x0) * 0.5;
          ctx.save();
          crown();
          ctx.clip();
          ctx.globalAlpha *= smoothstepHair(0.05, 0.3, embSpan.vis);
          inked(
            ctx,
            () => {
              ctx.beginPath();
              ctx.moveTo(embX, -64);
              ctx.lineTo(embX + halfW, -52);
              ctx.lineTo(embX + halfW * 0.72, -24);
              ctx.lineTo(embX, -14);
              ctx.lineTo(embX - halfW * 0.72, -24);
              ctx.lineTo(embX - halfW, -52);
              ctx.closePath();
            },
            gold,
            ink,
            4,
            1.5,
            2,
          );
          ctx.fillStyle = '#fff5d1';
          ctx.beginPath();
          ctx.ellipse(embX, -40, Math.max(1.5, halfW * 0.3), 6.5, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (drawFront) {
      const drawLegacySatpamVisor = () => {
        if (!isBack || isBack34) {
          const vs = headFacing * 48;
          const visor = () => {
            ctx.beginPath();
            ctx.moveTo(-114 + vs * 0.6, 10);
            ctx.quadraticCurveTo(vs * 1.25, 44, 114 + vs * 0.6, 10);
            ctx.quadraticCurveTo(vs * 0.6, 24, -114 + vs * 0.6, 10);
            ctx.closePath();
          };
          inked(ctx, visor, '#1b1d24', ink, 4.5, 2, 3);
        }
      };
      const crown = () => {
        ctx.beginPath();
        ctx.moveTo(-cw, 6);
        ctx.lineTo(-cw * 1.19, -56);
        ctx.quadraticCurveTo(0, -92, cw * 1.19, -56);
        ctx.lineTo(cw, 6);
        ctx.quadraticCurveTo(0, 22, -cw, 6);
        ctx.closePath();
      };
      inked(ctx, crown, col, ink, 5.5, 3, 4.5);
      const band = () => {
        ctx.beginPath();
        ctx.moveTo(-cw * 1.02, 8);
        ctx.quadraticCurveTo(0, 24, cw * 1.02, 8);
        ctx.lineTo(cw * 0.98, -20);
        ctx.quadraticCurveTo(0, -8, -cw * 0.98, -20);
        ctx.closePath();
      };
      inked(ctx, band, '#241b17', ink, 4.5, 2, 3);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(-cw * 0.95, -4);
      ctx.quadraticCurveTo(0, 10, cw * 0.95, -4);
      ctx.stroke();
      drawLegacySatpamVisor();
      if (frontVis > 0.08) {
        const embX = Math.abs(headFacing) < 0.08 && !isSide ? 0 : headFacing * 56;
        inked(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(embX, -64);
            ctx.lineTo(embX + 22, -52);
            ctx.lineTo(embX + 16, -24);
            ctx.lineTo(embX, -14);
            ctx.lineTo(embX - 16, -24);
            ctx.lineTo(embX - 22, -52);
            ctx.closePath();
          },
          gold,
          ink,
          4,
          1.5,
          2,
        );
        ctx.fillStyle = '#fff5d1';
        ctx.beginPath();
        ctx.ellipse(embX, -40, 6.5, 6.5, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawHeadphoneCup(
  ctx: Ctx,
  ex: number,
  ey: number,
  side: -1 | 1,
  col: string,
  led: string,
  ink: string,
  scaleX = 1,
  hyRad?: number,
) {
  ctx.save();
  ctx.translate(ex, ey);
  if (hyRad !== undefined) {
    // Proporsi earcup kapsul ramping (`30 → 42 px`, radius penuh) agar tetap elegan di samping (bukan kotak gemuk 52 px!)
    const faceAmt = Math.abs(Math.sin(hyRad));
    const edgeDir = side * Math.cos(hyRad);
    const padX = -edgeDir * 9;
    const padW = 22 + 6 * faceAmt;
    const shellX = edgeDir * 10;
    const shellW = 30 + 12 * faceAmt;
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(padX - padW * 0.5, -38, padW, 76, padW * 0.45); }, '#334155', ink, 4, 1.5, 2.5);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(shellX - shellW * 0.5, -42, shellW, 84, shellW * 0.48); }, col, ink, 4.5, 2, 3);
    const ledX = shellX + edgeDir * 5;
    const ledW = 10 + 2 * faceAmt;
    ctx.fillStyle = led;
    ctx.beginPath();
    ctx.roundRect(ledX - ledW * 0.5, -24, ledW, 48, 5);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(ledX, 18, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.scale(scaleX, 1);
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(-(side > 0 ? 16 : 6), -38, 22, 76, 10);
    },
    '#334155',
    ink,
    4,
    1.5,
    2.5,
  );
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(-(side > 0 ? 2 : 28), -42, 30, 84, 13);
    },
    col,
    ink,
    4.5,
    2,
    3,
  );
  ctx.fillStyle = led;
  ctx.beginPath();
  ctx.roundRect(side > 0 ? 9 : -19, -24, 10, 48, 5);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(side > 0 ? 14 : -14, 18, 4.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Tata letak kanvas aktor (dipakai drawActor & helper verifikasi tangan/wajah agar selalu identik). */
function actorLayout(spec: CharacterSpec, pose: ActorPose) {
  const is360 = pose.yawDeg !== undefined;
  const yawRad = is360 ? degToRad(pose.yawDeg!) : undefined;
  const headYawRad = is360
    ? degToRad(pose.headYawDeg !== undefined ? pose.headYawDeg : pose.yawDeg! + (pose.lookBack ?? 0) * 180)
    : undefined;

  let view: ActorView = pose.view ?? 'threeQuarter';
  let facing = pose.facing ?? 0;
  if (is360 && yawRad !== undefined) {
    const angleDeg = (Math.abs(yawRad) * 180) / Math.PI;
    const sideSin = Math.sin(yawRad);
    const sign = sideSin >= 0 ? 1 : -1;
    view =
      pose.view ??
      (angleDeg < 32
        ? 'front'
        : angleDeg < 72
          ? 'threeQuarter'
          : angleDeg < 112
            ? 'side'
            : angleDeg < 148
              ? 'backThreeQuarter'
              : 'back');
    facing = pose.facing ?? (angleDeg < 32 ? sideSin * 0.8 : Math.min(0.95, 0.25 + Math.abs(sideSin) * 0.7) * sign);
  }
  const stance: ActorStance = pose.stance ?? 'stand';
  const isBack34 = view === 'backThreeQuarter';
  const isBack = view === 'back' || isBack34;
  const isSide = view === 'side';
  const isWalk = stance === 'walk';

  const fSign = facing >= 0 ? 1 : -1;
  if (!is360) {
    facing =
      view === 'front'
        ? (pose.facing ?? 0)
        : isSide
          ? fSign * 0.85
          : isBack34
            ? fSign * 0.72
            : (pose.facing ?? (pose.face === 'shock' ? 0.08 : 0.34));
  }

  const ph = (pose.walkPhase ?? 0) * TAU;
  const strideBlend = isWalk ? Math.max(0, Math.min(1, pose.strideBlend ?? 1)) : 0;
  const travelDir: -1 | 1 = facing >= 0 ? 1 : -1;
  // Counter-swing sinkron dengan plantedFoot (u=0 -> kaki kanan maju penuh -> cos(0)=+1 -> lengan kiri maju).
  const swing = isWalk ? Math.cos(ph) * strideBlend : 0;
  const W = spec.headShape === 'squircle' ? 276 : spec.hairStyle === 'hijab' ? 238 : spec.hairStyle === 'fadeCrop' ? 252 : 250;
  const H = spec.headShape === 'squircle' ? 240 : spec.hairStyle === 'fadeCrop' ? 244 : 236;
  const th = 228;
  // Duduk ergonomis: jika `sitHeight` (m) diisi, pinggul tepat duduk di atas permukaan bangku/kursi.
  // Default tinggi referensi tetap 1.8 m (kecuali `pose.actorHeight` diisi) agar produksi lama tetap identik.
  const sitRefHeight = Math.max(0.8, pose.actorHeight ?? 1.8);
  const baseHipAtBob0 = 192 + H - 6 + th - 12; // 638 (non-squircle) / 642 (squircle)
  const sitBob =
    pose.sitHeight !== undefined
      ? Math.max(
          20,
          Math.min(
            240,
            ACTOR_SOLE_Y - (Math.max(0.25, Math.min(0.72, pose.sitHeight)) / sitRefHeight) * ACTOR_H - baseHipAtBob0,
          ),
        )
      : 105;
  // Walk body bob 4-pose referensi (1).mp4 & motion.md (3-7% tinggi):
  const walkBob = (Math.sin(ph * 2) * 18 - 4) * strideBlend;
  const bob = isWalk
    ? walkBob
    : stance === 'sit'
      ? sitBob
      : stance === 'sitCross'
        ? 268
        : stance === 'squat'
          ? 205
          : stance === 'jump'
            ? -82
            : 0;
  const leanDir = is360 && yawRad !== undefined ? Math.sin(yawRad) : travelDir;
  const lean =
    pose.lean !== undefined
      ? pose.lean
      : isWalk
        ? leanDir * (6.2 + 2.8 * Math.cos(ph * 2)) * strideBlend
        : pose.face === 'shock'
          ? -4.5
          : 1.2 * (is360 && yawRad !== undefined ? Math.cos(yawRad) : 1);
  const headTilt =
    pose.headTilt !== undefined
      ? pose.headTilt
      : isWalk
        ? -leanDir * 2.4 * Math.sin(ph * 2) * strideBlend
        : 0;

  const headTop = 192 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const bf = buildFactors(spec);
  const tw = (spec.headShape === 'squircle' ? 220 : spec.outfit === 'kotakSarung' ? 222 : 196) * bf.torso;
  const hipY = torsoTop + th - 12;
  return {
    is360,
    yawRad,
    headYawRad,
    view,
    stance,
    isBack,
    isBack34,
    isSide,
    isWalk,
    facing,
    travelDir,
    strideBlend,
    ph,
    swing,
    bob,
    lean,
    headTilt,
    W,
    H,
    headTop,
    cy,
    chin,
    torsoTop,
    tw,
    hipY,
  };
}

/** Arah kepala efektif (memperhitungkan `lookBack`), sama seperti yang dipakai drawActor untuk wajah. */
function headFacingOf(pose: ActorPose, isSide: boolean, facing: number) {
  const lookBack = Math.max(0, Math.min(1, pose.lookBack ?? 0));
  return isSide ? (lookBack >= 0.5 ? -facing : facing) : facing * (1 - 2 * lookBack);
}

/**
 * Titik pusat tangan aktor di kanvas 700x1100 (px). `x`/`y` = setelah rotasi `lean` (posisi tampil),
 * `rawX`/`rawY` = sebelum `lean`, `rawZ` = kedalaman 3D (+ = depan kamera, - = belakang badan).
 */
export function actorHandPoint(
  actor: CastPresetId | CharacterSpec,
  pose: ActorPose,
  side: -1 | 1,
  overrides?: Partial<CharacterSpec>,
): { x: number; y: number; rawX: number; rawY: number; rawZ?: number; arm: ArmPose } {
  const spec = resolveActorSpec(actor, overrides);
  const L = actorLayout(spec, pose);
  const armPose: ArmPose =
    (side < 0 ? pose.leftArm : pose.rightArm) ??
    (pose.face === 'shock' ? 'raise' : (side < 0 ? pose.leftProp : pose.rightProp) && (side < 0 ? pose.leftProp : pose.rightProp) !== 'none' ? 'hold' : 'rest');
  const rig = side < 0 ? pose.leftHand : pose.rightHand;
  let hx: number;
  let hy: number;
  let rawZ: number | undefined;
  if (L.is360 && L.yawRad !== undefined) {
    const bf = buildFactors(spec);
    const res = resolveArmTarget360(side, armPose, L.torsoTop, L.tw, L.swing, L.isWalk, bf.armOut, L.yawRad);
    hx = res.hx;
    hy = res.hy;
    rawZ = res.hz;
    if (rig) {
      const t = rig.t === undefined ? 1 : Math.max(0, Math.min(1, rig.t));
      if (rig.from && t < 1) {
        const f = resolveArmTarget360(side, rig.from, L.torsoTop, L.tw, L.swing, L.isWalk, bf.armOut, L.yawRad);
        hx = f.hx + (hx - f.hx) * t;
        hy = f.hy + (hy - f.hy) * t;
        rawZ = f.hz + (rawZ - f.hz) * t;
      }
      if (rig.reach && rig.reach.t > 0) {
        const r = Math.max(0, Math.min(1, rig.reach.t));
        hx += (rig.reach.x - hx) * r;
        hy += (rig.reach.y - hy) * r;
      }
      hx += rig.dx ?? 0;
      hy += rig.dy ?? 0;
    }
  } else {
    const res = resolveRiggedTarget(
      side,
      armPose,
      rig,
      L.torsoTop,
      L.tw,
      L.swing,
      L.isWalk,
      L.isSide,
      buildFactors(spec).armOut,
      L.view,
      L.travelDir,
    );
    hx = res.hx;
    hy = res.hy;
  }
  const a = (L.lean * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = hx - CX;
  const dy = hy - L.hipY;
  return { x: CX + dx * c - dy * s, y: L.hipY + dx * s + dy * c, rawX: hx, rawY: hy, rawZ, arm: armPose };
}

/** Jangkar wajah aktor (px kanvas, sebelum rotasi `lean`): mulut, hidung, mata, dagu. */
export function actorFaceAnchors(
  actor: CastPresetId | CharacterSpec,
  pose: ActorPose,
  overrides?: Partial<CharacterSpec>,
): { mouthX: number; mouthY: number; noseY: number; eyeY: number; chinY: number; headTop: number; headW: number; torsoTop: number } {
  const spec = resolveActorSpec(actor, overrides);
  const L = actorLayout(spec, pose);
  const hf = headFacingOf(pose, L.isSide, L.facing);
  const hfSign = hf >= 0 ? 1 : -1;
  const shift = (L.isSide ? hfSign * 0.65 : hf) * L.W * 0.085;
  const rawEyeY = L.cy + (spec.eyeStyle === 'almond' ? 8 : 12);
  const rawNoseY = rawEyeY + (spec.noseStyle === 'rounded' ? 32 : 26);
  const rawMouthX = CX + shift;
  const rawMouthY = L.cy + (spec.eyeStyle === 'almond' ? 66 : 70);
  let mouthX = rawMouthX;
  let mouthY = rawMouthY;
  let eyeY = rawEyeY;
  let noseY = rawNoseY;
  let headTop = L.headTop;
  if (L.headTilt !== 0) {
    const a = (L.headTilt * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pivotY = L.chin - 4;
    const rotPt = (px: number, py: number): [number, number] => {
      const dx = px - CX;
      const dy = py - pivotY;
      return [CX + dx * c - dy * s, pivotY + dx * s + dy * c];
    };
    [mouthX, mouthY] = rotPt(rawMouthX, rawMouthY);
    [, eyeY] = rotPt(rawMouthX, rawEyeY);
    [, noseY] = rotPt(rawMouthX, rawNoseY);
    [, headTop] = rotPt(CX, L.headTop);
  }
  return {
    mouthX,
    mouthY,
    noseY,
    eyeY,
    chinY: L.chin,
    headTop,
    headW: L.W,
    torsoTop: L.torsoTop,
  };
}

/** Konversi y kanvas aktor (px) ke tinggi dunia (m) untuk billboard setinggi `height` m dengan telapak di `baseY`. */
export function actorCanvasToWorldY(py: number, height: number, baseY = 0): number {
  return baseY + ((ACTOR_SOLE_Y - py) * height) / ACTOR_H;
}

/**
 * Elevasi dunia (meter relatif `baseY`) pusat kepala aktor — sinkron 100% dengan `actorLayout`
 * (menghormati `sit`, `sitHeight`, `actorHeight`, `sitCross`, `squat`, `jump`, dan `headShape`).
 */
export function actorHeadCenterY(
  height: number,
  pose?: Partial<ActorPose>,
  actor: CastPresetId | CharacterSpec = 'bangUtoh',
): number {
  const spec = resolveActorSpec(actor);
  const L = actorLayout(spec, { face: 'neutral', ...pose });
  return actorCanvasToWorldY(L.cy, height, 0);
}

/**
 * Helper resmi 2,5D (Atelier v4.0): memetakan arah hadap dunia aktor terhadap posisi kamera aktif
 * menjadi sudut 8-arah + sudut yaw kontinu (`yawDeg ∈ [-180, 180]`, `yawRad ∈ [-PI, PI]`) untuk putaran 360° mulus.
 * `forwardOrYaw` dapat berupa vektor `Vec3` menghadap depan atau sudut `yaw` derajat (`0° = +Z`, `+90° = +X`).
 */
export function resolve25DView(
  actorPos: Vec3,
  forwardOrYaw: Vec3 | number,
  camPos: Vec3,
  options?: { fourWayThresholds?: readonly [number, number, number] },
): { view: ActorView; facing: number; angleDeg: number; yawDeg: number; yawRad: number } {
  const fwd: Vec3 =
    typeof forwardOrYaw === 'number'
      ? [Math.sin((forwardOrYaw * Math.PI) / 180), 0, Math.cos((forwardOrYaw * Math.PI) / 180)]
      : forwardOrYaw;
  const { yawRad, yawDeg } = resolveYawAngle(actorPos, fwd, camPos);
  const tx = camPos[0] - actorPos[0];
  const tz = camPos[2] - actorPos[2];
  const tl = Math.hypot(tx, tz) || 1;
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const fx = fwd[0] / fl;
  const fz = fwd[2] / fl;
  const cos = Math.max(-1, Math.min(1, (fx * tx + fz * tz) / tl));
  const angleDeg = (Math.acos(cos) * 180) / Math.PI;
  // Cross product (toCam × fwd).y: positif = karakter menghadap ke kanan layar kamera.
  const side = (fx * tz - fz * tx) / tl;
  const sign = side >= 0 ? 1 : -1;
  if (options?.fourWayThresholds) {
    const [tFront, tThreeQ, tSide] = options.fourWayThresholds;
    if (angleDeg < tFront) {
      return { view: 'front', facing: Math.max(-0.45, Math.min(0.45, side * 1.6)), angleDeg, yawDeg, yawRad };
    }
    if (angleDeg < tThreeQ) {
      return { view: 'threeQuarter', facing: 0.7 * sign, angleDeg, yawDeg, yawRad };
    }
    if (angleDeg < tSide) {
      return { view: 'side', facing: sign, angleDeg, yawDeg, yawRad };
    }
    return { view: 'back', facing: 0.4 * sign, angleDeg, yawDeg, yawRad };
  }
  if (angleDeg < 32) {
    return { view: 'front', facing: Math.max(-0.45, Math.min(0.45, side * 1.6)), angleDeg, yawDeg, yawRad };
  }
  if (angleDeg < 72) {
    return { view: 'threeQuarter', facing: Math.min(0.75, 0.34 + Math.abs(side) * 0.42) * sign, angleDeg, yawDeg, yawRad };
  }
  if (angleDeg < 112) {
    return { view: 'side', facing: 0.85 * sign, angleDeg, yawDeg, yawRad };
  }
  if (angleDeg < 148) {
    return { view: 'backThreeQuarter', facing: 0.72 * sign, angleDeg, yawDeg, yawRad };
  }
  return { view: 'back', facing: 0.35 * sign, angleDeg, yawDeg, yawRad };
}

/**
 * Posisi kartu billboard tokoh yang duduk (native engine v3.0): menggeser titik pusat kursi
 * sejauh `seatRadius + 0.02 m` ke tepi kursi menghadap kamera agar 0% menembus bangku/kursi.
 */
export function seatCardPos(seat: Vec3, seatRadius: number, faceTo?: Vec3): Vec3 {
  if (!faceTo || seatRadius <= 0) return seat;
  const dx = faceTo[0] - seat[0];
  const dz = faceTo[2] - seat[2];
  const l = Math.hypot(dx, dz) || 1;
  const ux = dx / l;
  const uz = dz / l;
  const d = seatRadius / Math.max(Math.abs(ux), Math.abs(uz), 1e-3) + 0.02;
  return [seat[0] + ux * d, seat[1], seat[2] + uz * d];
}

/**
 * Kompensasi kemiringan X (*high-angle X-tilt*) berporos di telapak kaki (`y = 0`) saat kamera memandang dari atas (`pitch > 12°`).
 * Hanya aktif untuk high-angle (`dy > 0`, tidak pernah memiringkan karakter tinggi ke depan pada shot rendah/makro),
 * dan mengembalikan `0` untuk seluruh shot eye-level (`|camPitch| <= 12°` atau tinggi mata referensi) agar EP01–EP04 100% identik.
 */
export function computeBillboardTiltX(
  position: Vec3,
  faceTo: Vec3,
  actorHeight = 1.96,
  maxTiltDeg = 24,
  camLook?: Vec3,
): number {
  const horiz = Math.hypot(faceTo[0] - position[0], faceTo[2] - position[2]);
  if (horiz < 1e-4) return 0;
  // Bila camLook diketahui dan kamera sendiri datar (|pitch kamera| <= 12°), jangan pernah miringkan kartu.
  if (camLook) {
    const ch = Math.hypot(faceTo[0] - camLook[0], faceTo[2] - camLook[2]);
    if (ch > 1e-4) {
      const camPitchDeg = Math.abs((Math.atan2(faceTo[1] - camLook[1], ch) * 180) / Math.PI);
      if (camPitchDeg <= 12) return 0;
    }
  }
  // Lantai referensi mata minimal 1,10 m di atas lantai agar kucing/subjek pendek pada shot eye-level manusia tetap tegak.
  const refY = position[1] + Math.max(1.1, actorHeight * 0.72);
  const dy = faceTo[1] - refY;
  // Hanya kompensasi high-angle (kamera di atas subjek); shot low-angle/makro rendah tetap tegak lurus vertikal.
  if (dy <= 0) return 0;
  const pitchDeg = (Math.atan2(dy, horiz) * 180) / Math.PI;
  if (pitchDeg <= 12) return 0;
  const excess = pitchDeg - 12;
  const tiltDeg = Math.min(maxTiltDeg, excess * 0.55);
  // Kamera di atas (dy > 0) -> kartu miring ke belakang (-X rotasi lokal billboard menghadap +Z) agar menghadap kamera.
  return (-tiltDeg * Math.PI) / 180;
}

/**
 * Auto-Locomotion 3D → 2D (Atelier v3.5): menghitung status berjalan otomatis dari kurva posisi dunia `posAt(f)`.
 * - Otomatis mengaktifkan `stance: 'walk'` saat bergerak XZ & *ease-out* halus via `strideBlend` ke `'stand'` saat berhenti.
 * - Memproyeksikan perpindahan XZ ke bidang kamera (`sin θ` terhadap garis pandang) sebelum dibagi `actorWalkCycleMeters`
 *   sehingga 0% *ice-skating* baik saat berjalan samping, 3/4, maupun diagonal.
 * - Otomatis membebaskan lengan ke `'rest'` selama berjalan kecuali ada *override* memegang prop 3D.
 */
export type WalkStateOptions = {
  /** Frame per detik (default `30`). */
  fps?: number;
  /** Frame awal integrasi jarak (default `0`). */
  startFrame?: number;
  /** Pengali panjang langkah (default `1`). */
  stride?: number;
  /** Apakah karakter mengenakan rok/sarung (default `false`). */
  skirted?: boolean;
  /** Arah hadap dunia (derajat, `0° = +Z`, `+90° = +X`) saat diam (`stand`). */
  idleYawDeg?: number;
  /** Ambang kecepatan berhenti (m/detik, default `0.04`). */
  stopSpeed?: number;
  /** Kecepatan penuh untuk `strideBlend = 1` (m/detik, default `0.35`). */
  fullSpeed?: number;
  /** Override lengan kiri/kanan saat memegang prop 3D. */
  leftArmOverride?: ArmPose;
  rightArmOverride?: ArmPose;
};

export type ComputedWalkState = {
  moving: boolean;
  speedMps: number;
  stance: 'walk' | 'stand';
  gait: 'planted';
  walkPhase: number;
  strideBlend: number;
  view: ActorView;
  facing: number;
  yawDeg: number;
  yawRad: number;
  leftArm: ArmPose;
  rightArm: ArmPose;
};

export function computeWalkState(
  posAt: (f: number) => Vec3,
  frame: number,
  height: number,
  camPos: Vec3,
  opts?: WalkStateOptions,
): ComputedWalkState {
  const fps = opts?.fps ?? 30;
  const startFrame = Math.max(0, Math.floor(opts?.startFrame ?? 0));
  const f = Math.max(startFrame, Math.floor(frame));
  const strideMul = opts?.stride ?? 1;
  const skirted = opts?.skirted ?? false;
  const stopSpeed = opts?.stopSpeed ?? 0.04;
  const fullSpeed = Math.max(stopSpeed + 0.05, opts?.fullSpeed ?? 0.35);

  const cur = posAt(f);
  const prev = posAt(Math.max(startFrame, f - 1));
  const next = posAt(f + 1);
  const vx = f > startFrame ? (next[0] - prev[0]) * 0.5 : next[0] - cur[0];
  const vz = f > startFrame ? (next[2] - prev[2]) * 0.5 : next[2] - cur[2];
  const stepDist = Math.hypot(vx, vz);
  const speedMps = stepDist * fps;

  const moving = speedMps > stopSpeed;
  const rawBlend = Math.max(0, Math.min(1, (speedMps - stopSpeed) / (fullSpeed - stopSpeed)));
  const strideBlend = rawBlend * rawBlend * (3 - 2 * rawBlend);

  const forwardOrYaw: Vec3 | number = moving ? [vx, 0, vz] : (opts?.idleYawDeg ?? 0);
  const resolved = resolve25DView(cur, forwardOrYaw, camPos);

  let phase = 0;
  let prevP = posAt(startFrame);
  for (let k = startFrame + 1; k <= f; k++) {
    const p = posAt(k);
    const dx = p[0] - prevP[0];
    const dz = p[2] - prevP[2];
    const d = Math.hypot(dx, dz);
    if (d > 1e-5) {
      const tx = camPos[0] - p[0];
      const tz = camPos[2] - p[2];
      const tl = Math.hypot(tx, tz) || 1;
      const toCamX = tx / tl;
      const toCamZ = tz / tl;
      // Vektor kanan bidang kamera di XZ (tegak lurus garis pandang) -> proyeksi `sin(θ)` agar langkah 3/4 & diagonal nol selip!
      const camRightX = toCamZ;
      const camRightZ = -toCamX;
      const stepRes = resolve25DView(p, [dx, 0, dz], camPos);
      const isDepthWalk = stepRes.view === 'front' || stepRes.view === 'back';
      const projected = isDepthWalk
        ? Math.abs(dx * toCamX + dz * toCamZ)
        : Math.abs(dx * camRightX + dz * camRightZ);
      const cycleM = actorWalkCycleMeters(height, isDepthWalk ? 'threeQuarter' : stepRes.view, strideMul, skirted);
      phase += projected / Math.max(0.05, cycleM);
    }
    prevP = p;
  }

  const walkPhase = ((phase % 1) + 1) % 1;
  return {
    moving,
    speedMps,
    stance: moving ? 'walk' : 'stand',
    gait: 'planted',
    walkPhase,
    strideBlend: moving ? strideBlend : 0,
    view: resolved.view,
    facing: resolved.facing,
    yawDeg: resolved.yawDeg,
    yawRad: resolved.yawRad,
    leftArm: opts?.leftArmOverride ?? 'rest',
    rightArm: opts?.rightArmOverride ?? 'rest',
  };
}

/**
 * Jembatan Hybrid 2D-Hand → 3D-Prop (Atelier v4.0): mengonversi koordinat tangan kanvas 2D (`actorHandPoint`)
 * menjadi posisi dunia 3D (`Vec3`) tepat di ujung tangan aktor, memperhitungkan `yaw`, `seatRadius`, `tiltX`, dan depth `rawZ` 360°.
 */
export function actorHandWorldPos(
  actor: CastPresetId | CharacterSpec,
  pose: ActorPose,
  side: -1 | 1,
  actorPos: Vec3,
  faceTo: Vec3,
  height = 1.96,
  opts?: {
    overrides?: Partial<CharacterSpec>;
    seatRadius?: number;
    tiltComp?: boolean;
    /** Offset maju ke arah kamera (meter, default 0.02) agar prop 3D bebas Z-fighting dengan telapak 2D. */
    forwardOffset?: number;
  },
): Vec3 {
  const effectivePose =
    pose.sitHeight !== undefined && pose.actorHeight === undefined && (opts?.seatRadius ?? 0) > 0
      ? { ...pose, actorHeight: height }
      : pose;
  const pt = actorHandPoint(actor, effectivePose, side, opts?.overrides);
  const basePos = opts?.seatRadius ? seatCardPos(actorPos, opts.seatRadius, faceTo) : actorPos;
  const yaw = Math.atan2(faceTo[0] - basePos[0], faceTo[2] - basePos[2]);
  const tiltX = opts?.tiltComp === false ? 0 : computeBillboardTiltX(basePos, faceTo, height);

  const w = height * (ACTOR_W / ACTOR_H);
  const lx = ((pt.x - ACTOR_W / 2) / ACTOR_W) * w;
  const ly0 = ((ACTOR_SOLE_Y - pt.y) / ACTOR_H) * height;
  const fwdOff = opts?.forwardOffset ?? 0.02;
  const lz0 =
    pt.rawZ !== undefined
      ? (pt.rawZ / ACTOR_H) * height + (pt.rawZ >= -5 ? fwdOff : -fwdOff)
      : fwdOff;

  // Rotasi tiltX di sekitar sumbu X lokal berporos telapak (y = 0)
  const ct = Math.cos(tiltX);
  const st = Math.sin(tiltX);
  const ly = ly0 * ct - lz0 * st;
  const lz = ly0 * st + lz0 * ct;

  // Rotasi yaw di sekitar sumbu Y dunia
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const wx = basePos[0] + lx * cy + lz * sy;
  const wy = basePos[1] + ly;
  const wz = basePos[2] - lx * sy + lz * cy;
  return [wx, wy, wz];
}

/**
 * Gambar karakter Nusantara/Indonesia modular ke Canvas2D 700x1100 (telapak kaki di y = 1040).
 * Mendukung jalur legacy (`pose.yawDeg === undefined`) dan jalur 2,5D volumetrik putar 360° mulus (`pose.yawDeg !== undefined`)
 * plus ekspor primitif ketinggian+AO (`reliefOut`) untuk normal shading 3D per-piksel.
 */
export function drawActor(
  ctx: Ctx,
  actor: CastPresetId | CharacterSpec,
  pose: ActorPose,
  overrides?: Partial<CharacterSpec>,
  reliefOut?: ReliefPrimitive[],
) {
  const spec = resolveActorSpec(actor, overrides);
  const { ink, skin, skinShadow, hairStyle, hairColor, hairHighlight, pantsColor } = spec;
  const L = actorLayout(spec, pose);
  const { is360, yawRad, headYawRad, view, stance, isBack, isBack34, isSide, isWalk, facing, travelDir, strideBlend, ph, swing, lean, headTilt, W, H, headTop, cy, chin, torsoTop, tw, hipY } = L;
  const blink = pose.blink === true ? 1 : pose.blink === false ? 0 : (pose.blink ?? 0);
  const hatPop = pose.hatPop !== undefined ? pose.hatPop : pose.face === 'shock' ? 1 : 0;

  const leftArm: ArmPose = pose.leftArm ?? (pose.face === 'shock' ? 'raise' : pose.leftProp && pose.leftProp !== 'none' ? 'hold' : 'rest');
  const rightArm: ArmPose =
    pose.rightArm ?? (pose.face === 'shock' ? 'raise' : pose.rightProp && pose.rightProp !== 'none' ? 'hold' : 'rest');
  const leftProp: HandProp = pose.leftProp ?? 'none';
  const rightProp: HandProp = pose.rightProp ?? 'none';

  const bf = buildFactors(spec);
  const lk = bf.limb;
  const ho = bf.hipOut;
  const th = 228;
  const isSkirted = spec.outfit === 'kotakSarung' || spec.outfit === 'dasterCelemek';
  const yRad = yawRad ?? 0;
  const hyRad = headYawRad ?? yRad;

  ctx.clearRect(0, 0, ACTOR_W, ACTOR_H);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Helper menggambar 1 kaki dengan proyeksi 3D kontinu (saat is360 aktif) + 2-Bone IK + 4-Pose Foot Roll
  const renderLeg360 = (side: -1 | 1): { hx: number; startY: number; fx: number; fy: number; z: number } => {
    const startY = isSkirted ? hipY + 90 : hipY;
    const baseHip3 = rotateYaw3D([side * (36 + ho), startY, 0], yRad);
    const hx = CX + baseHip3.x;

    let kx: number;
    let ky: number;
    let fx: number;
    let fy: number;
    let footZ: number;
    let shoePitch = 0;
    let shoeScale = 1;
    let shoeDir: -1 | 1 = Math.abs(Math.sin(yRad)) > 0.25 ? (Math.sin(yRad) >= 0 ? 1 : -1) : side;
    let isBezierKnee = true;
    let legPants = pantsColor;

    if (stance === 'sitCross') {
      const pHip = rotateYaw3D([side * (34 + ho), hipY - 8, 8], yRad);
      const pKnee = rotateYaw3D([side * (138 + ho), hipY + (side > 0 ? 48 : 38), 64], yRad);
      const pFoot = rotateYaw3D([-side * 72, ACTOR_SOLE_Y - (side > 0 ? 10 : 18), 72 + (side > 0 ? 8 : 0)], yRad);
      kx = CX + pKnee.x;
      ky = pKnee.y;
      fx = CX + pFoot.x;
      fy = pFoot.y;
      footZ = (pHip.z + pKnee.z + pFoot.z) / 3 + (side > 0 ? 6 : -6);
      shoeDir = side > 0 ? -1 : 1;
      legPants = darkenHex(pantsColor, depthDarkenFactor(footZ, tw * 0.5, 0.14));
      isBezierKnee = false;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30 * lk;
      ctx.beginPath();
      ctx.moveTo(CX + pHip.x, pHip.y);
      ctx.quadraticCurveTo((CX + pHip.x + kx) * 0.5 + side * 14 * Math.cos(yRad), pHip.y + 8, kx, ky);
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = 18 * lk;
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 28 * lk;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.quadraticCurveTo((kx + fx) * 0.5, ACTOR_SOLE_Y - 14, fx, fy - 12);
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = 17 * lk;
      ctx.stroke();
      drawShoe(ctx, fx, fy, shoeDir, spec, 0, 1, footZ < -4);
      if (reliefOut) {
        reliefOut.push({ kind: 'capsule', x1: CX + pHip.x, y1: pHip.y, x2: kx, y2: ky, radius: 16 * lk, z: footZ });
        reliefOut.push({ kind: 'capsule', x1: kx, y1: ky, x2: fx, y2: fy - 12, radius: 15 * lk, z: footZ });
      }
      return { hx: CX + pHip.x, startY: pHip.y, fx, fy, z: footZ };
    } else if (stance === 'squat') {
      const pHip = rotateYaw3D([side * (34 + ho), hipY - 6, 0], yRad);
      const pKnee = rotateYaw3D([side * (112 + ho * 1.4), hipY - 42, 74], yRad);
      const pFoot = rotateYaw3D([side * (72 + ho), ACTOR_SOLE_Y - 4, 24], yRad);
      kx = CX + pKnee.x;
      ky = pKnee.y;
      fx = CX + pFoot.x;
      fy = pFoot.y;
      footZ = (pHip.z + pKnee.z + pFoot.z) / 3;
      legPants = darkenHex(pantsColor, depthDarkenFactor(footZ, tw * 0.5, 0.16));
      isBezierKnee = false;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30 * lk;
      ctx.beginPath();
      ctx.moveTo(CX + pHip.x, pHip.y);
      ctx.quadraticCurveTo((CX + pHip.x + kx) * 0.5, pHip.y - 34, kx, ky);
      ctx.quadraticCurveTo(kx + side * 8 * Math.cos(yRad), (ky + fy) * 0.52, fx, fy - 18);
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = 18 * lk;
      ctx.stroke();
      drawShoe(ctx, fx, fy, shoeDir, spec, 0, 1 + (footZ / 300) * 0.08, footZ < -4);
      if (reliefOut) {
        reliefOut.push({ kind: 'capsule', x1: CX + pHip.x, y1: pHip.y, x2: kx, y2: ky, radius: 16 * lk, z: footZ });
        reliefOut.push({ kind: 'capsule', x1: kx, y1: ky, x2: fx, y2: fy - 18, radius: 15 * lk, z: footZ });
      }
      return { hx: CX + pHip.x, startY: pHip.y, fx, fy, z: footZ };
    } else if (stance === 'sit') {
      const highSeatLift = pose.sitHeight !== undefined && pose.sitHeight > 0.54 ? (pose.sitHeight - 0.54) * 260 : 0;
      const lowSeatKneeLift = pose.sitHeight !== undefined && pose.sitHeight < 0.44 ? (0.44 - pose.sitHeight) * 220 : 0;
      const pHip = rotateYaw3D([side * (42 + ho), hipY, 0], yRad);
      const pKnee = rotateYaw3D([side * (72 + ho), hipY + 56 - lowSeatKneeLift, 114], yRad);
      const pFoot = rotateYaw3D([side * (66 + ho), ACTOR_SOLE_Y - 12 - highSeatLift, 120], yRad);
      kx = CX + pKnee.x;
      ky = pKnee.y;
      fx = CX + pFoot.x;
      fy = pFoot.y;
      footZ = (pHip.z + pKnee.z + pFoot.z) / 3;
      legPants = darkenHex(pantsColor, depthDarkenFactor(footZ, tw * 0.5, 0.16));
      ctx.strokeStyle = ink;
      ctx.lineWidth = 28 * lk;
      ctx.beginPath();
      ctx.moveTo(CX + pHip.x, pHip.y);
      ctx.bezierCurveTo(CX + pHip.x + (kx - (CX + pHip.x)) * 0.65, hipY + 4, kx, ky - 24, kx, ky);
      ctx.quadraticCurveTo(kx + (fx - kx) * 0.4, (ky + fy) * 0.52, fx, fy - 20);
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = 17 * lk;
      ctx.stroke();
      drawShoe(ctx, fx, fy, shoeDir, spec, 0, 1 + Math.max(-0.08, Math.min(0.1, footZ / 500)), footZ < -4);
      if (reliefOut) {
        reliefOut.push({ kind: 'capsule', x1: CX + pHip.x, y1: pHip.y, x2: kx, y2: ky, radius: 15 * lk, z: footZ });
        reliefOut.push({ kind: 'capsule', x1: kx, y1: ky, x2: fx, y2: fy - 20, radius: 14 * lk, z: footZ });
      }
      return { hx: CX + pHip.x, startY: pHip.y, fx, fy, z: footZ };
    } else if (stance === 'jump') {
      const pHip = rotateYaw3D([side * (38 + ho), hipY, 0], yRad);
      const pKnee = rotateYaw3D([side * (78 + ho), hipY + 110, 42], yRad);
      const pFoot = rotateYaw3D([side * (54 + ho), hipY + 210, 16], yRad);
      kx = CX + pKnee.x;
      ky = pKnee.y;
      fx = CX + pFoot.x;
      fy = pFoot.y;
      footZ = (pHip.z + pKnee.z + pFoot.z) / 3;
      legPants = darkenHex(pantsColor, depthDarkenFactor(footZ, tw * 0.5, 0.16));
      ctx.strokeStyle = ink;
      ctx.lineWidth = 28 * lk;
      ctx.beginPath();
      ctx.moveTo(CX + pHip.x, pHip.y);
      ctx.quadraticCurveTo(kx, ky, fx, fy - 18);
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = 17 * lk;
      ctx.stroke();
      drawShoe(ctx, fx, fy, shoeDir, spec, 0, 1, footZ < -4);
      if (reliefOut) {
        reliefOut.push({ kind: 'capsule', x1: CX + pHip.x, y1: pHip.y, x2: fx, y2: fy - 18, radius: 15 * lk, z: footZ });
      }
      return { hx: CX + pHip.x, startY: pHip.y, fx, fy, z: footZ };
    } else {
      const strideMul = pose.stride ?? 1;
      const sideFactor = Math.abs(Math.sin(yRad));
      const stride = ((isSkirted ? 56 : 72 + 38 * sideFactor) * strideMul);
      const planted = isWalk && (pose.gait ?? 'planted') === 'planted';
      const liftAmp = (54 + 20 * sideFactor) * Math.min(1.6, Math.sqrt(strideMul)) * strideBlend;
      const pf = planted ? plantedFoot(pose.walkPhase ?? 0, side, stride * strideBlend, liftAmp) : null;
      const u = pf ? pf.u : (((pose.walkPhase ?? 0) + (side === 1 ? 0 : 0.5)) % 1 + 1) % 1;
      const stepAlong = pf ? pf.dx : isWalk ? Math.cos(ph) * side * stride * strideBlend : side * 14;
      const liftY = pf ? pf.lift : isWalk ? Math.max(0, -Math.sin(ph) * side) * 64 * strideBlend : 0;
      const latSpread = side * ((pose.face === 'shock' ? 74 : isSkirted ? 48 : 54) + ho) * (1 - 0.62 * sideFactor * sideFactor);
      const pFoot = rotateYaw3D([latSpread, ACTOR_SOLE_Y - liftY, stepAlong], yRad);
      fx = CX + pFoot.x;
      // Tambahkan foreshortening Y halus ketika kaki bergerak mendekat/menjauh di sumbu Z
      fy = pFoot.y + pFoot.z * 0.14 * (1 - sideFactor);
      footZ = pFoot.z;
      shoeScale = 1 + Math.max(-0.1, Math.min(0.1, pFoot.z / 700));
      if (isWalk) shoePitch = footRollPitchRad(u) * (0.42 + 0.58 * sideFactor) * strideBlend;
      legPants = darkenHex(pantsColor, depthDarkenFactor(footZ, tw * 0.5, 0.16));

      const ankleY = fy - 22;
      const baseHipY = 192 + H - 6 + th - 12;
      const standReach = Math.max(120, ACTOR_SOLE_Y - 22 - (isSkirted ? baseHipY + 90 : baseHipY));
      const thighLen = standReach * 0.522;
      const shinLen = standReach * 0.522;
      let knee: [number, number];
      if (isWalk) {
        // IK 3D sagital: lutut selalu menekuk maju (+Z lokal), sehingga lurus proporsional di 0°/180° (bebas bow-leg/silang!) & tajam 60-70° di profil
        const sagAnkleY = ACTOR_SOLE_Y - liftY - 22;
        const { knee: [kneeZ, kneeY] } = solveLegIK([0, startY], [stepAlong, sagAnkleY], thighLen, shinLen, 1);
        const kneeLat = (side * (36 + ho) + latSpread) * 0.5;
        const pKnee = rotateYaw3D([kneeLat, kneeY, kneeZ], yRad);
        knee = [CX + pKnee.x, pKnee.y + pKnee.z * 0.08 * (1 - sideFactor)];
      } else {
        knee = [hx + (fx - hx) * 0.5 + (Math.sin(yRad) * 8 - side * 4 * Math.cos(yRad)), startY + (ankleY - startY) * 0.5];
      }

      ctx.strokeStyle = ink;
      ctx.lineWidth = (isSkirted ? 22 : 28) * lk;
      ctx.beginPath();
      ctx.moveTo(hx, startY);
      if (isBezierKnee && isWalk) {
        const kPull = 0.78;
        ctx.bezierCurveTo(
          hx + (knee[0] - hx) * kPull,
          startY + (knee[1] - startY) * kPull,
          fx + (knee[0] - fx) * kPull,
          ankleY + (knee[1] - ankleY) * kPull,
          fx,
          ankleY,
        );
      } else {
        ctx.quadraticCurveTo(knee[0], knee[1], fx, ankleY);
      }
      ctx.stroke();
      ctx.strokeStyle = legPants;
      ctx.lineWidth = (isSkirted ? 12 : 17) * lk;
      ctx.stroke();
      drawShoe(ctx, fx, fy, shoeDir, spec, shoePitch, shoeScale, footZ < -4);
      if (reliefOut) {
        reliefOut.push({ kind: 'capsule', x1: hx, y1: startY, x2: knee[0], y2: knee[1], radius: 15 * lk, z: footZ });
        reliefOut.push({ kind: 'capsule', x1: knee[0], y1: knee[1], x2: fx, y2: ankleY, radius: 14 * lk, z: footZ });
      }
      return { hx, startY, fx, fy, z: footZ };
    }
  };

  let leftHandPt: { hx: number; hy: number } = { hx: CX - 134, hy: torsoTop + 178 };
  let rightHandPt: { hx: number; hy: number } = { hx: CX + 134, hy: torsoTop + 178 };

  if (is360) {
    // =========================================================================
    // JALUR 2.5D VOLUMETRIK PUTAR 360° KONTINU (Atelier v4.0)
    // =========================================================================
    // 1. Kaki diurutkan berdasarkan kedalaman Z aktual (terjauh dulu -> terdekat belakangan)
    const legOrder = [
      { side: -1 as const, z: rotateYaw3D([-44, hipY, stance === 'sit' ? 60 : 0], yRad).z },
      { side: 1 as const, z: rotateYaw3D([44, hipY, stance === 'sit' ? 60 : 0], yRad).z },
    ];
    for (const item of sortByDepthZ(legOrder)) {
      renderLeg360(item.side);
    }

    // Rotasi badan atas sesuai lean
    ctx.translate(CX, hipY);
    ctx.rotate((lean * Math.PI) / 180);
    ctx.translate(-CX, -hipY);

    // 2. Bangun Render Queue Depth-Sorted untuk Lengan Kiri/Kanan, Ransel, Cepol, dan Torso
    const rxT = tw * 0.5;
    const rzT = tw * 0.36;
    const bp3 = rotateYaw3D([0, torsoTop + 102, -(rzT + 38)], yRad);
    const shL = rotateYaw3D([-tw * 0.44, torsoTop + 52, 0], yRad);
    const shR = rotateYaw3D([tw * 0.44, torsoTop + 52, 0], yRad);
    const hL3 = resolveArmTarget360(-1, leftArm, torsoTop, tw, swing, isWalk, bf.armOut, yRad);
    const hR3 = resolveArmTarget360(1, rightArm, torsoTop, tw, swing, isWalk, bf.armOut, yRad);
    const armLZ = (shL.z + hL3.hz) * 0.5;
    const armRZ = (shR.z + hR3.hz) * 0.5;

    const torsoQueue: { z: number; draw: () => void }[] = [
      {
        z: 0,
        draw: () => {
          drawTorsoAndSkirt(ctx, torsoTop, tw, th, isBack, isSide, spec, yRad);
          if (reliefOut) {
            const effW = Math.hypot(rxT * Math.cos(yRad), rzT * Math.sin(yRad));
            reliefOut.push({ kind: 'sphere', cx: CX, cy: torsoTop + th * 0.5, rx: effW * 1.04, ry: th * 0.54, z: 0, heightScale: 0.96, ao: 1 });
          }
        },
      },
      {
        z: armLZ,
        draw: () => {
          const dk = depthDarkenFactor(armLZ, rxT, 0.15);
          const pt = drawArm(ctx, -1, leftArm, leftProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.leftHand, view, travelDir, dk, yRad);
          leftHandPt = pt;
          if (reliefOut) reliefOut.push({ kind: 'capsule', x1: pt.sx, y1: pt.sy, x2: pt.hx, y2: pt.hy, radius: 16 * lk, z: armLZ, ao: armLZ < -4 ? 0.85 : 1 });
        },
      },
      {
        z: armRZ,
        draw: () => {
          const dk = depthDarkenFactor(armRZ, rxT, 0.15);
          const pt = drawArm(ctx, 1, rightArm, rightProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.rightHand, view, travelDir, dk, yRad);
          rightHandPt = pt;
          if (reliefOut) reliefOut.push({ kind: 'capsule', x1: pt.sx, y1: pt.sy, x2: pt.hx, y2: pt.hy, radius: 16 * lk, z: armRZ, ao: armRZ < -4 ? 0.85 : 1 });
        },
      },
    ];

    if (spec.backpack) {
      torsoQueue.push({
        // Bias -14 px agar pada ±90° (bp3.z = 0) ransel selalu digambar di BELAKANG punggung baju (tidak menimpa kemeja/hoodie!)
        z: bp3.z - 14,
        draw: () => {
          const backVis = Math.max(0, -Math.cos(yRad));
          drawBackpackMesh(ctx, CX + bp3.x, torsoTop, spec, false, backVis, yRad);
          const rxBp = Math.hypot(82 * Math.cos(yRad), 44 * Math.sin(yRad));
          if (reliefOut) reliefOut.push({ kind: 'sphere', cx: CX + bp3.x, cy: torsoTop + 106, rx: rxBp, ry: 82, z: bp3.z - 14, heightScale: 0.9, ao: bp3.z < 0 ? 0.86 : 1 });
        },
      });
    }

    for (const item of sortByDepthZ(torsoQueue)) {
      item.draw();
    }

    // 3. Kepala, Telinga, Hijab 2.5D, Rambut 2.5D Klasik & Headgear 2-Pass (Atelier v6.1)
    const hyFrontVis = Math.cos(hyRad);
    const hySideSin = Math.sin(hyRad);
    const hyShowBack = hyFrontVis < 0.08;
    const W360 = W * (1 - 0.1 * hySideSin * hySideSin);
    const hLift = headTilt !== 0;
    if (hLift) {
      ctx.save();
      ctx.translate(CX, chin - 4);
      ctx.rotate((headTilt * Math.PI) / 180);
      ctx.translate(-CX, -(chin - 4));
    }

    // Pass belakang 2.5D (sebelum telinga & kepala: brim/helm/sayap iket/headphone belakang + sanggul/ahoge belakang)
    drawHeadgear(ctx, spec, W360, headTop, cy, hatPop, hyShowBack, isBack34, hySideSin, hyRad, false, 'back');
    renderHairBackPass360(ctx, spec, W360, headTop, cy, hatPop, hyRad, reliefOut);

    // Telinga 360° murni setia `HEAD` (warna bayangan, earDetail, & anting mutiara tetap terbaca di profil ±90°!)
    const showEars360 = hairStyle !== 'hijab' && spec.headgear !== 'helmet';
    if (showEars360) {
      const pureBackRestore = smoothstepHair(-0.35, -0.78, hyFrontVis);
      const drawClassicEar360 = (s: -1 | 1) => {
        const isFrontCheekSide = s * hySideSin > 0;
        const tuckFrontCheek = isFrontCheekSide ? smoothstepHair(0.32, 0.72, Math.abs(hySideSin)) * (1 - pureBackRestore) : 0;
        if (tuckFrontCheek > 0.96) return;
        const uEarPos = s * (0.488 - 0.3 * tuckFrontCheek);
        const exPos = CX + W360 * uEarPos;
        const rxEar = 18 * (1 - 0.22 * tuckFrontCheek);
        const shadowAmt = isFrontCheekSide ? smoothstepHair(0.18, 0.42, Math.abs(hySideSin)) * smoothstepHair(-0.45, -0.15, hyFrontVis) : 0;
        const fill = shadowAmt > 0.01 ? lerpHex(skin, spec.skinShadow, shadowAmt) : skin;
        inked(ctx, () => { ctx.beginPath(); ctx.ellipse(exPos, cy + 13, rxEar, 24, -0.12 * s, 0, TAU); }, fill, ink, 4.5, 2, 3);
        const detailAlpha = smoothstepHair(-0.32, -0.08, hyFrontVis) * (1 - smoothstepHair(0.25, 0.55, tuckFrontCheek));
        if (spec.earDetail && detailAlpha > 0.02) {
          ctx.save();
          ctx.globalAlpha *= detailAlpha;
          ctx.strokeStyle = spec.skinShadow;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(exPos + s * 2, cy + 13, 9, s < 0 ? Math.PI * 0.65 : -Math.PI * 0.35, s < 0 ? Math.PI * 1.45 : Math.PI * 0.45);
          ctx.stroke();
          ctx.restore();
        }
        const earringScale = 1 - smoothstepHair(0.76, 0.98, tuckFrontCheek);
        if (spec.earrings && earringScale > 0.04) {
          inked(ctx, () => { ctx.beginPath(); ctx.arc(exPos, cy + 34, 7 * earringScale, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
        }
      };
      const earOrder: Array<-1 | 1> = hySideSin >= 0 ? [1, -1] : [-1, 1];
      for (const s of earOrder) drawClassicEar360(s);
    }

    // Hijab 2.5D Teardrop Organik atau Kepala + Rambut 2.5D Klasik (Atelier v6.1)
    let hijabFaceClip360: (() => void) | null = null;
    if (hairStyle === 'hijab') {
      const sideSq = hySideSin * hySideSin;
      const hOuterW = 140 * (1 - 0.025 * sideSq);
      const backDrapeFlare = 16 * sideSq;
      const hoodShift = -hySideSin * 10;
      const hijabOuter = () => {
        ctx.beginPath();
        ctx.moveTo(CX - hOuterW, cy + 16);
        ctx.bezierCurveTo(
          CX - hOuterW * 1.07 + hoodShift * 0.5,
          headTop - 36,
          CX - 82 + hoodShift,
          headTop - 52,
          CX + hoodShift * 0.6,
          headTop - 48,
        );
        ctx.bezierCurveTo(
          CX + 86 + hoodShift,
          headTop - 52,
          CX + hOuterW * 1.07 + hoodShift * 0.5,
          headTop - 30,
          CX + hOuterW,
          cy + 18,
        );
        ctx.bezierCurveTo(
          CX + hOuterW * 1.04 + (hySideSin < 0 ? backDrapeFlare : 0),
          torsoTop + 58,
          CX + 106,
          torsoTop + 98,
          CX + 46,
          torsoTop + 96,
        );
        ctx.quadraticCurveTo(CX, torsoTop + 106, CX - 56, torsoTop + 94);
        ctx.bezierCurveTo(
          CX - 118,
          torsoTop + 90,
          CX - hOuterW * 1.04 - (hySideSin > 0 ? backDrapeFlare : 0),
          torsoTop + 52,
          CX - hOuterW,
          cy + 16,
        );
        ctx.closePath();
      };
      const hbg = ctx.createLinearGradient(CX - 130, headTop - 40, CX + 140, torsoTop + 100);
      hbg.addColorStop(0, hairColor);
      hbg.addColorStop(0.58, hairColor);
      hbg.addColorStop(1, hairHighlight ?? '#297a74');
      inked(ctx, hijabOuter, hbg, ink, 5.5, 3.5, 5.5);

      ctx.save();
      hijabOuter();
      ctx.clip();
      ctx.save();
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = darkenHex(hairHighlight ?? hairColor, 0.28);
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(CX - 94, torsoTop + 26);
      ctx.quadraticCurveTo(CX - 12 + hySideSin * 36, torsoTop + 72, CX + 98, torsoTop + 34);
      ctx.moveTo(CX - 76, torsoTop + 56);
      ctx.quadraticCurveTo(CX + 4 + hySideSin * 30, torsoTop + 86, CX + 82, torsoTop + 62);
      ctx.stroke();
      ctx.restore();

      // Bukaan wajah hijab solid 100% berbasis cylSpan lega agar kacamata Rara tidak terhimpit di 89°!
      const faceSpan = cylSpan(hyRad, -1.12, 1.12, hOuterW * 0.96);
      if (faceSpan !== null && faceSpan.x1 - faceSpan.x0 > 6) {
        const faceRx = (faceSpan.x1 - faceSpan.x0) * 0.5;
        const fx = CX + faceSpan.midX;
        hijabFaceClip360 = () => {
          ctx.beginPath();
          ctx.ellipse(fx, cy + 10, faceRx, H * 0.44, 0, 0, TAU);
        };
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx - faceRx - 8, headTop - 30, (faceRx + 8) * 2, cy - 10 - (headTop - 30));
        ctx.clip();
        ctx.fillStyle = '#f7ead6';
        ctx.beginPath();
        ctx.ellipse(fx + hySideSin * 2, cy + 4, faceRx * 1.02, H * 0.462, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        const skG = ctx.createLinearGradient(fx - 90, headTop + 10, fx + 95, chin);
        skG.addColorStop(0, spec.skinHighlight ?? skin);
        skG.addColorStop(0.6, skin);
        skG.addColorStop(1, skinShadow);
        ctx.fillStyle = skG;
        hijabFaceClip360();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      const drapeAlpha = smoothstepHair(0.48, 0.1, hyFrontVis);
      if (drapeAlpha > 0.02) {
        ctx.save();
        ctx.globalAlpha *= drapeAlpha;
        ctx.strokeStyle = hairHighlight ?? 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 4.2;
        const drapeX = CX - hySideSin * 26;
        ctx.beginPath();
        ctx.moveTo(drapeX - 24, cy - 10);
        ctx.quadraticCurveTo(drapeX - 6, torsoTop + 32, drapeX - 28, torsoTop + 78);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      hijabOuter();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    } else {
      const headPath360 = () => {
        ctx.beginPath();
        if (spec.headShape === 'faceted') {
          // Simetris penuh terhadap tanda `hySideSin`: pipi menghadap depan selalu proporsional baik ke kanan (+90°) maupun ke kiri (-90°)!
          const jawR = 0.49 + 0.015 * hySideSin;
          const jawL = 0.49 - 0.015 * hySideSin;
          const chinR = 0.31 + 0.03 * hySideSin;
          const chinL = 0.31 - 0.03 * hySideSin;
          ctx.moveTo(CX - W360 * 0.47, cy - 26);
          ctx.bezierCurveTo(CX - W360 * 0.48, headTop - 10, CX + W360 * 0.48, headTop - 10, CX + W360 * 0.47, cy - 26);
          ctx.bezierCurveTo(CX + W360 * jawR, cy + 38, CX + W360 * chinR, chin - 14, CX + hySideSin * 22, chin);
          ctx.bezierCurveTo(CX - W360 * chinL, chin - 14, CX - W360 * jawL, cy + 38, CX - W360 * 0.47, cy - 26);
          ctx.closePath();
        } else {
          const N = 76;
          for (let i = 0; i <= N; i++) {
            const t = (i / N) * TAU;
            const c = Math.cos(t);
            const s = Math.sin(t);
            const n =
              spec.headShape === 'squircle' ? (s < 0 ? 2.85 : 3.1) : spec.headShape === 'round' ? (s < 0 ? 2.1 : 2.3) : 2.2;
            let x = (W360 / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
            const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
            if (spec.headShape === 'sculpted' && s > 0) x *= 1 - 0.1 * s;
            if (s > 0) x += hySideSin * W360 * 0.045 * s;
            const px = CX + x;
            const py = cy + y;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      };
      const skG = ctx.createLinearGradient(CX - W360 * 0.38, headTop + 12, CX + W360 * 0.46, chin);
      const backShadeT = smoothstepHair(0.05, -0.25, hyFrontVis);
      const hiLightT = spec.skinHighlight ? smoothstepHair(0.05, 0.4, hyFrontVis) : 0;
      const topCol = hiLightT > 0.01 ? lerpHex(skin, spec.skinHighlight!, hiLightT) : lerpHex(skin, skinShadow, backShadeT);
      const midStop = 0.6 - 0.14 * hiLightT;
      skG.addColorStop(0, topCol);
      skG.addColorStop(midStop, skin);
      skG.addColorStop(1, skinShadow);
      inked(ctx, headPath360, skG, ink, 5.5, 3.5, 5.5);

      // Rambut 2.5D Bezier Klasik (-180°..+180°): 6-station anatomical cutout + proyeksi silindris poni klasik (Atelier v6.1)
      if (hairStyle === 'bald') {
        ctx.save();
        headPath360();
        ctx.clip();
        ctx.fillStyle = spec.skinHighlight ?? '#f8dec2';
        ctx.globalAlpha = 0.46;
        ctx.beginPath();
        ctx.ellipse(CX - hySideSin * 18 - 14, headTop + 34, W360 * 0.25, 16, -0.14, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (hairStyle === 'short') {
        renderShortHair360(ctx, spec, headPath360, skG, W360, H, headTop, chin, hyRad, hyFrontVis, hySideSin);
      } else {
        renderUnifiedHair360(ctx, spec, headPath360, skG, W, W360, H, headTop, cy, chin, hatPop, hyRad, hyFrontVis, hySideSin);
      }
    }

    if (reliefOut) {
      reliefOut.push({ kind: 'sphere', cx: CX, cy, rx: W360 * 0.52, ry: H * 0.52, z: 100, heightScale: 1, ao: 1 });
    }

    // Tali dagu helm (Ojol): solid 100%, jangkar dari tepi pipi helm (z = -18) memeluk bawah dagu (nol garis abu miring di pipi!)
    if (spec.headgear === 'helmet' && hyFrontVis > 0.04) {
      const bJaw = headWidthBoundsAtY(spec, W360, H, cy, cy + 46, hySideSin);
      const pL = rotateYaw3D([-W360 * 0.48, cy + 36, -18], hyRad);
      const pR = rotateYaw3D([W360 * 0.48, cy + 36, -18], hyRad);
      const cL = rotateYaw3D([-W360 * 0.24, chin + 16, W360 * 0.3], hyRad);
      const cR = rotateYaw3D([W360 * 0.24, chin + 16, W360 * 0.3], hyRad);
      ctx.save();
      ctx.strokeStyle = spec.headgearAccent ?? '#232838';
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.max(bJaw.xL + 2, Math.min(bJaw.xR - 2, CX + pL.x)), pL.y);
      ctx.bezierCurveTo(CX + cL.x, cL.y, CX + cR.x, cR.y, Math.max(bJaw.xL + 2, Math.min(bJaw.xR - 2, CX + pR.x)), pR.y);
      ctx.stroke();
      ctx.restore();
    }

    // Wajah, Kacamata, Kumis (wajib ter-clip `hijabFaceClip360` untuk hijab — nol mata/kacamata bocor di atas kain hijab!)
    if (hyFrontVis > -0.28 && (hairStyle !== 'hijab' || hijabFaceClip360 !== null)) {
      if (hijabFaceClip360) {
        ctx.save();
        hijabFaceClip360();
        ctx.clip();
      }
      drawFaceFeatures(ctx, {
        cx: CX,
        cy,
        headW: W360,
        skin,
        ink,
        eyeStyle: spec.eyeStyle,
        face: pose.face,
        blink,
        talk: pose.talk,
        facing: hySideSin,
        yawRad: hyRad,
        browThick: spec.browThick,
        browStyle: spec.browStyle,
        browColor: spec.browColor,
        nose: true,
        noseAlpha: spec.nose ? 1 : smoothstepHair(0.26, 0.56, Math.abs(hySideSin)),
        noseStyle: spec.noseStyle,
        skinShadow: spec.skinShadow,
        beautyMark: spec.beautyMark,
        fullLips: spec.fullLips,
        upperLipColor: spec.upperLipColor,
        faintMustache: spec.faintMustache,
        mouthColor: spec.mouthColor,
        tongueColor: spec.tongueColor,
        lipColor: spec.lipColor,
        blushColor: spec.blushColor,
        eyeShine: spec.eyeShine,
      });

      const eg = computeEyeGeom360(CX, cy, W360, spec.eyeStyle, hyRad);
      const glassesFrontA = smoothstepHair(-0.14, 0.04, hyFrontVis);
      if (spec.glasses && glassesFrontA > 0.02) {
        const eyeY = eg.eyeY - hatPop * 9;
        const bTemple = headWidthBoundsAtY(spec, W360, H, cy, eyeY - 6, hySideSin);
        const templeTargetX = (s: number) => (s < 0 ? bTemple.xL + 1 : bTemple.xR - 1);
        const bridgeAlpha = Math.min(eg.eyeAlpha(-1), eg.eyeAlpha(1)) * glassesFrontA;
        ctx.save();
        if (glassesFrontA < 0.999) ctx.globalAlpha *= glassesFrontA;
        if (spec.glassesStyle === 'tech') {
          const gw = 58;
          const gh = 44;
          for (const s of [-1, 1]) {
            const a = eg.eyeAlpha(s);
            if (a <= 0.01) continue;
            const sx = eg.eyeScaleX(s);
            const wS = gw * sx;
            const lx = eg.ex(s) - wS / 2;
            const ly = eyeY - gh / 2;
            ctx.save();
            ctx.globalAlpha *= a;
            ctx.fillStyle = 'rgba(150, 224, 255, 0.19)';
            ctx.beginPath();
            ctx.roundRect(lx, ly, wS, gh, 10);
            ctx.fill();
            ctx.strokeStyle = '#1f2638';
            ctx.lineWidth = 5;
            ctx.stroke();
            const armA = hairStyle !== 'hijab' ? smoothstepHair(0.28, 0.08, s * hySideSin) : 0;
            if (armA > 0.02) {
              ctx.globalAlpha *= armA;
              ctx.beginPath();
              ctx.moveTo(eg.ex(s) + s * (wS * 0.5), eyeY - 4);
              ctx.lineTo(templeTargetX(s), eyeY - 6);
              ctx.stroke();
            }
            ctx.restore();
          }
          if (bridgeAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha *= bridgeAlpha;
            ctx.strokeStyle = '#1f2638';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(eg.ex(-1) + (gw * eg.eyeScaleX(-1)) / 2, eyeY - 4);
            ctx.lineTo(eg.ex(1) - (gw * eg.eyeScaleX(1)) / 2, eyeY - 4);
            ctx.stroke();
            ctx.restore();
          }
        } else if (spec.glassesStyle === 'thick') {
          const gw = 62;
          const gh = 48;
          const frame = '#1d1719';
          const lens = (s: number) => {
            const wS = gw * eg.eyeScaleX(s);
            ctx.beginPath();
            ctx.roundRect(eg.ex(s) - wS / 2, eyeY - gh / 2, wS, gh, 16);
          };
          for (const [col, lw] of [[ink, 12], [frame, 8]] as const) {
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            for (const s of [-1, 1]) {
              const a = eg.eyeAlpha(s);
              if (a <= 0.01) continue;
              ctx.save();
              ctx.globalAlpha *= a;
              lens(s);
              ctx.stroke();
              const armA = hairStyle !== 'hijab' ? smoothstepHair(0.28, 0.08, s * hySideSin) : 0;
              if (armA > 0.02) {
                ctx.globalAlpha *= armA;
                ctx.beginPath();
                ctx.moveTo(eg.ex(s) + s * ((gw * eg.eyeScaleX(s)) / 2), eyeY - 10);
                ctx.lineTo(templeTargetX(s), eyeY - 11);
                ctx.stroke();
              }
              ctx.restore();
            }
            if (bridgeAlpha > 0.01) {
              ctx.save();
              ctx.globalAlpha *= bridgeAlpha;
              ctx.beginPath();
              ctx.moveTo(eg.ex(-1) + (gw * eg.eyeScaleX(-1)) / 2 - 2, eyeY - 8);
              ctx.quadraticCurveTo(CX + eg.shift, eyeY - 15, eg.ex(1) - (gw * eg.eyeScaleX(1)) / 2 + 2, eyeY - 8);
              ctx.stroke();
              ctx.restore();
            }
          }
        } else {
          ctx.strokeStyle = '#c58f38';
          ctx.lineWidth = 5;
          const gr = 30;
          for (const s of [-1, 1]) {
            const a = eg.eyeAlpha(s);
            if (a <= 0.01) continue;
            const rx = gr * eg.eyeScaleX(s);
            ctx.save();
            ctx.globalAlpha *= a;
            ctx.fillStyle = 'rgba(220, 245, 255, 0.16)';
            ctx.beginPath();
            ctx.ellipse(eg.ex(s), eyeY, rx, gr, 0, 0, TAU);
            ctx.fill();
            ctx.stroke();
            const ear3 = rotateYaw3D([s * W * 0.44, eyeY - 4, -W * 0.04], hyRad);
            const armA = smoothstepHair(-8, 16, ear3.z) * (hairStyle === 'hijab' ? smoothstepHair(0.22, 0.02, s * hySideSin) : 1);
            if (armA > 0.02) {
              ctx.globalAlpha *= armA;
              ctx.beginPath();
              ctx.moveTo(eg.ex(s) + s * rx, eyeY - 2);
              ctx.lineTo(CX + ear3.x, ear3.y);
              ctx.stroke();
            }
            ctx.restore();
          }
          if (bridgeAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha *= bridgeAlpha;
            ctx.beginPath();
            ctx.moveTo(eg.ex(-1) + gr * eg.eyeScaleX(-1) - 2, eyeY);
            ctx.quadraticCurveTo(CX + eg.shift, eyeY - 5, eg.ex(1) - gr * eg.eyeScaleX(1) + 2, eyeY);
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();
      }

      if (spec.mustache && eg.mouthAlpha > 0.01) {
        const mx = CX + eg.mouthShift;
        const mustY = cy + 52 - hatPop * 8;
        ctx.save();
        if (eg.mouthAlpha < 0.999) ctx.globalAlpha *= eg.mouthAlpha;
        ctx.translate(mx, mustY);
        ctx.scale(eg.mouthScaleX, 1);
        ctx.translate(-mx, -mustY);
        const mp = () => {
          ctx.beginPath();
          ctx.moveTo(mx, mustY - 12);
          ctx.bezierCurveTo(mx + 22, mustY - 18, mx + 52, mustY - 2, mx + 56, mustY + 14);
          ctx.quadraticCurveTo(mx + 24, mustY + 12, mx, mustY + 4);
          ctx.quadraticCurveTo(mx - 24, mustY + 12, mx - 56, mustY + 14);
          ctx.bezierCurveTo(mx - 52, mustY - 2, mx - 22, mustY - 18, mx, mustY - 12);
          ctx.closePath();
        };
        inked(ctx, mp, hairColor, ink, 4.5, 2, 3);
        ctx.restore();
      }
      if (hijabFaceClip360) ctx.restore();

      if (hairStyle === 'hijab') {
        const pin3 = rotateYaw3D([-52, chin + 8, W360 * 0.44], hyRad);
        const pinVis = smoothstepHair(-8, 28, pin3.z);
        if (pinVis > 0.03) {
          ctx.save();
          ctx.globalAlpha *= pinVis;
          inked(
            ctx,
            () => {
              ctx.beginPath();
              ctx.arc(CX + pin3.x, pin3.y, 7.5 * (0.45 + 0.55 * pinVis), 0, TAU);
            },
            '#f5c43d',
            ink,
            3,
            1,
            1.5,
          );
          ctx.restore();
        }
      }
    }

    // Sanggul depan Bu Siti (z >= 0) & Headgear 2.5D Bezier pass depan (Atelier v6.1)
    renderHairFrontFeatures360(ctx, spec, W360, headTop, cy, hatPop, hyRad, reliefOut);
    drawHeadgear(ctx, spec, W360, headTop, cy, hatPop, hyShowBack, isBack34, hySideSin, hyRad, false, 'front');

    const fx = pose.fx !== undefined ? pose.fx : defaultFxFor(pose.face);
    const fxAlpha = pose.fx !== undefined ? 1 : smoothstepHair(0, 0.25, hyFrontVis);
    if (fx !== 'none' && fxAlpha > 0.02) {
      ctx.save();
      if (fxAlpha < 0.999) ctx.globalAlpha *= fxAlpha;
      // Naikkan ComicFx mengikuti hatPop dengan ruang aman kanvas agar ke-4 garis kejut shock Pak Ujang utuh 100% di atas topi satpam!
      drawComicFx(ctx, fx, CX, headTop - (spec.headgear !== 'none' ? 38 + hatPop * 34 : 10), W360, ink);
      ctx.restore();
    }
    if (hLift) ctx.restore();

    if (pose.leftHand?.front) drawHandAndProp(ctx, -1, leftArm, leftProp, leftHandPt.hx, leftHandPt.hy, lk, spec, pose.leftHand);
    if (pose.rightHand?.front) drawHandAndProp(ctx, 1, rightArm, rightProp, rightHandPt.hx, rightHandPt.hy, lk, spec, pose.rightHand);
    ctx.restore();
    return;
  }

  // =========================================================================
  // JALUR LEGACY (EP01–EP05, pose.yawDeg === undefined — 100% Backward Compatible!)
  // =========================================================================
  const farSide: -1 | 1 = travelDir >= 0 ? -1 : 1;
  const nearSide: -1 | 1 = farSide === -1 ? 1 : -1;
  const legSides: readonly (-1 | 1)[] =
    isSide || view === 'threeQuarter' || isBack34 ? [farSide, nearSide] : [-1, 1];
  if (stance === 'sitCross') {
    // Duduk bersila santai di lantai (kaki kiri terlipat di bawah, kaki kanan menyilang di depan!)
    const drawCrossedLeg = (side: -1 | 1, inFront: boolean) => {
      const hx = CX + side * (34 + ho);
      const hy = hipY - 8;
      const kx = CX + side * (144 + ho);
      const ky = hipY + (inFront ? 48 : 38);
      const fx = CX - side * 78;
      const fy = ACTOR_SOLE_Y - (inFront ? 10 : 18);

      // Paha keluar ke lutut
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30 * lk;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(CX + side * (112 + ho), hy + 8, kx, ky);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 18 * lk;
      ctx.stroke();

      // Betis melipat menyilang ke sisi berlawanan
      ctx.strokeStyle = ink;
      ctx.lineWidth = 28 * lk;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.quadraticCurveTo(CX + side * 42, ACTOR_SOLE_Y - 14, fx, fy - 12);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 17 * lk;
      ctx.stroke();

      drawShoe(ctx, fx, fy, -side, spec);
    };
    drawCrossedLeg(-1, false);
    drawCrossedLeg(1, true);
  } else if (stance === 'squat') {
    // Gaya jongkok nongkrong khas warkop: lutut naik lebar di kiri-kanan, kaki menapak mantap!
    for (const side of legSides) {
      const hx = CX + side * (34 + ho);
      const hy = hipY - 6;
      const kx = CX + side * (124 + ho * 1.5);
      const ky = hipY - 42;
      const fx = CX + side * (72 + ho);
      const fy = ACTOR_SOLE_Y - 4;

      // Paha naik keluar ke lutut tinggi
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30 * lk;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(CX + side * (96 + ho * 1.5), hy - 34, kx, ky);
      // Betis turun menapak ke sepatu
      ctx.quadraticCurveTo(kx + side * 8, (ky + fy) * 0.52, fx, fy - 18);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 18 * lk;
      ctx.stroke();

      drawShoe(ctx, fx, fy, side, spec);
    }
  } else {
    for (const side of legSides) {
      const dir = isSide ? (facing >= 0 ? 1 : -1) : side;
      if (stance === 'sit') {
        // Duduk ergonomis di bangku/kursi: paha maju di atas dudukan, tekukan lutut organik Bezier, kaki menapak/menggantung wajar
        const hx = CX + (isSide ? side * 14 : side * (46 + ho));
        const highSeatLift = pose.sitHeight !== undefined && pose.sitHeight > 0.54 ? (pose.sitHeight - 0.54) * 260 : 0;
        const lowSeatKneeLift = pose.sitHeight !== undefined && pose.sitHeight < 0.44 ? (0.44 - pose.sitHeight) * 220 : 0;
        const kx = CX + (isSide ? dir * 116 + side * 14 : side * (90 + ho));
        const ky = hipY + 56 - lowSeatKneeLift;
        const fx = CX + (isSide ? dir * 122 + side * 14 : side * (74 + ho));
        const fy = ACTOR_SOLE_Y - 12 - highSeatLift;

        ctx.strokeStyle = ink;
        ctx.lineWidth = 28 * lk;
        ctx.beginPath();
        ctx.moveTo(hx, hipY);
        ctx.bezierCurveTo(hx + (kx - hx) * 0.65, hipY + 4, kx + (isSide ? dir * 10 : side * 8), ky - 24, kx, ky);
        ctx.quadraticCurveTo(kx + (fx - kx) * 0.4, (ky + fy) * 0.52, fx, fy - 20);
        ctx.stroke();
        ctx.strokeStyle = pantsColor;
        ctx.lineWidth = 17 * lk;
        ctx.stroke();
        drawShoe(ctx, fx, fy, dir, spec);
      } else if (stance === 'jump') {
        const hx = CX + side * (38 + ho);
        const kx = CX + side * (86 + ho);
        const ky = hipY + 110;
        const fx = CX + side * (54 + ho);
        const fy = hipY + 210;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 28 * lk;
        ctx.beginPath();
        ctx.moveTo(hx, hipY);
        ctx.quadraticCurveTo(kx, ky, fx, fy - 18);
        ctx.stroke();
        ctx.strokeStyle = pantsColor;
        ctx.lineWidth = 17 * lk;
        ctx.stroke();
        drawShoe(ctx, fx, fy, dir, spec);
      } else {
        const strideMul = pose.stride ?? 1;
        const stride = actorStridePx(view, strideMul, isSkirted);
        // v3.5: default gait adalah 'planted' (hanya 'swing' bila diminta eksplisit).
        const planted = isWalk && (pose.gait ?? 'planted') === 'planted';
        const isDepthWalk = view === 'front' || view === 'back';
        const isFarLeg = (isSide || view === 'threeQuarter' || isBack34) && side === farSide;
        const legPants = isFarLeg ? darkenHex(pantsColor, 0.16) : pantsColor;
        // Angkatan kaki ekspresif ala referensi (1).mp4 (~74px pada side/3/4 agar langkah bouncy & hidup, bukan diseret!)
        const liftAmp = (isDepthWalk ? 54 : 74) * Math.min(1.6, Math.sqrt(strideMul)) * strideBlend;
        const pf = planted
          ? isDepthWalk
            ? plantedFoot(pose.walkPhase ?? 0, side, 1, liftAmp)
            : plantedFoot(pose.walkPhase ?? 0, side, stride * strideBlend, liftAmp)
          : null;

        const baseSpread = isSide ? side * 20 : side * ((pose.face === 'shock' ? 74 : isSkirted ? 48 : 54) + ho);
        const hipShiftX = isWalk && isDepthWalk ? Math.cos(ph) * 10 * strideBlend : 0;
        const hx = CX + hipShiftX + (isSide ? side * 8 : side * (36 + ho));
        const startY = isSkirted ? hipY + 90 : hipY;

        let fx: number;
        let fy: number;
        let shoePitch = 0;
        let shoeScale = 1;
        if (isWalk && isDepthWalk) {
          // Tampak front/back: foreshortened depth stride bouncy (pergeseran Y + skala sepatu 0.90..1.10)
          const u = pf ? pf.u : (((pose.walkPhase ?? 0) + (side === 1 ? 0 : 0.5)) % 1 + 1) % 1;
          const depthWave = Math.cos(u * TAU);
          const liftY = pf ? pf.lift : Math.max(0, -Math.sin(ph) * side) * 46 * strideBlend;
          fx = CX + hipShiftX + baseSpread;
          fy = ACTOR_SOLE_Y - liftY + depthWave * 16 * strideBlend;
          shoeScale = 1 + depthWave * 0.1 * strideBlend;
          shoePitch = footRollPitchRad(u) * 0.4 * strideBlend;
        } else {
          const stepX = pf ? travelDir * pf.dx : isWalk ? Math.cos(ph) * side * stride * strideBlend : 0;
          const liftY = pf ? pf.lift : isWalk ? Math.max(0, -Math.sin(ph) * side) * 64 * strideBlend : 0;
          fx = CX + baseSpread + stepX;
          fy = ACTOR_SOLE_Y - liftY;
          if (isWalk) {
            const u = pf ? pf.u : (((pose.walkPhase ?? 0) + (side === 1 ? 0 : 0.5)) % 1 + 1) % 1;
            shoePitch = footRollPitchRad(u) * strideBlend;
          }
        }

        const ankleY = fy - 22;
        const baseHipY = 192 + H - 6 + th - 12;
        const standReach = Math.max(120, ACTOR_SOLE_Y - 22 - (isSkirted ? baseHipY + 90 : baseHipY));
        const thighLen = standReach * 0.522;
        const shinLen = standReach * 0.522;
        const bendDir: -1 | 1 = isDepthWalk ? side : travelDir;
        const { knee } = isWalk
          ? solveLegIK([hx, startY], [fx, ankleY], thighLen, shinLen, bendDir)
          : { knee: [hx + (fx - hx) * 0.5 - side * 4, startY + (ankleY - startY) * 0.5] as [number, number] };

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = ink;
        ctx.lineWidth = (isSkirted ? 22 : 28) * lk;
        ctx.beginPath();
        ctx.moveTo(hx, startY);
        if (isWalk) {
          const kPull = 0.78;
          const c1x = hx + (knee[0] - hx) * kPull;
          const c1y = startY + (knee[1] - startY) * kPull;
          const c2x = fx + (knee[0] - fx) * kPull;
          const c2y = ankleY + (knee[1] - ankleY) * kPull;
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, fx, ankleY);
        } else {
          ctx.quadraticCurveTo(knee[0], knee[1], fx, ankleY);
        }
        ctx.stroke();
        ctx.strokeStyle = legPants;
        ctx.lineWidth = (isSkirted ? 12 : 17) * lk;
        ctx.stroke();
        drawShoe(ctx, fx, fy, isDepthWalk ? side : travelDir, spec, shoePitch, shoeScale, isFarLeg);
      }
    }
  }

  // Rotasi badan atas sesuai lean
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  const headFacing = headFacingOf(pose, isSide, facing);

  // --- 2. ELEMEN BELAKANG (cepol rambut Bu Siti / ransel Raka di tampak depan) ---
  if (hairStyle === 'bun' && !isBack) {
    if (headTilt !== 0) {
      ctx.save();
      ctx.translate(CX, chin - 4);
      ctx.rotate((headTilt * Math.PI) / 180);
      ctx.translate(-CX, -(chin - 4));
    }
    const bunY = headTop - 36 - hatPop * 10;
    const bunShift = isSide ? (headFacing >= 0 ? -1 : 1) * 32 : -headFacing * 28;
    inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 10 + bunShift, bunY, 44, 0, TAU); }, hairColor, ink, 5.5, 3, 4);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX - 44 + bunShift, bunY + 20, 68, 16, 8); }, '#e04848', ink, 4, 2, 2.5);
    if (headTilt !== 0) ctx.restore();
  }
  if (spec.backpack && !isBack) {
    const bpSideDir = isSide ? travelDir : 1;
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(CX - (isSide ? bpSideDir * 108 : 118) - (isSide && bpSideDir < 0 ? 90 : 0), torsoTop + 24, 90, 158, 28);
      },
      spec.backpackColor ?? '#d64545',
      ink,
      5,
      3,
      4,
    );
  }

  // --- 3. LENGAN KIRI (belakang, sedikit digelapkan pada side/3-4 agar kedalaman lengan terbaca jelas) ---
  const isSideOr34 = isSide || view === 'threeQuarter' || isBack34;
  leftHandPt = drawArm(ctx, -1, leftArm, leftProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.leftHand, view, travelDir, isSideOr34);

  // --- 4. TORSO & BAWAHAN (Sarung / Daster / Batik / Denim / Ojol / SMA / Tenun) ---
  drawTorsoAndSkirt(ctx, torsoTop, tw, th, isBack, isSide, spec);

  // --- 5. LENGAN KANAN (depan) ---
  rightHandPt = drawArm(ctx, 1, rightArm, rightProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.rightHand, view, travelDir, false);

  // --- 6. KEPALA, RAMBUT / HIJAB, WAJAH, KACAMATA, KUMIS, HEADGEAR ---
  if (headTilt !== 0) {
    ctx.save();
    ctx.translate(CX, chin - 4);
    ctx.rotate((headTilt * Math.PI) / 180);
    ctx.translate(-CX, -(chin - 4));
  }
  if (hairStyle === 'hijab') {
    const hijabOuter = () => {
      ctx.beginPath();
      ctx.moveTo(CX - 140, cy + 16);
      ctx.bezierCurveTo(CX - 152, headTop - 36, CX - 80, headTop - 52, CX, headTop - 48);
      ctx.bezierCurveTo(CX + 86, headTop - 52, CX + 150, headTop - 30, CX + 140, cy + 18);
      ctx.bezierCurveTo(CX + 144, torsoTop + 58, CX + 104, torsoTop + 98, CX + 44, torsoTop + 96);
      ctx.quadraticCurveTo(CX, torsoTop + 104, CX - 56, torsoTop + 92);
      ctx.bezierCurveTo(CX - 122, torsoTop + 88, CX - 148, torsoTop + 50, CX - 140, cy + 16);
      ctx.closePath();
    };
    const hbg = ctx.createLinearGradient(CX - 130, headTop - 40, CX + 140, torsoTop + 100);
    hbg.addColorStop(0, hairColor);
    hbg.addColorStop(0.58, hairColor);
    hbg.addColorStop(1, hairHighlight ?? '#297a74');
    inked(ctx, hijabOuter, hbg, ink, 5.5, 3.5, 5.5);

    ctx.save();
    hijabOuter();
    ctx.clip();
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = darkenHex(hairHighlight ?? hairColor, 0.28);
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(CX - 94, torsoTop + 26);
      ctx.quadraticCurveTo(CX - 12, torsoTop + 72, CX + 98, torsoTop + 34);
      ctx.moveTo(CX - 76, torsoTop + 56);
      ctx.quadraticCurveTo(CX + 4, torsoTop + 86, CX + 82, torsoTop + 62);
      ctx.stroke();
      ctx.restore();
    ctx.restore();

    if (!isBack) {
      const fx = CX + (isSide ? (headFacing >= 0 ? 1 : -1) * 30 : headFacing * 12);
      ctx.fillStyle = '#f7ead6';
      ctx.beginPath();
      ctx.ellipse(CX + (isSide ? (headFacing >= 0 ? 1 : -1) * 24 : headFacing * 8), cy + 4, W * 0.47, H * 0.47, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      const skG = ctx.createLinearGradient(CX - 90, headTop + 10, CX + 95, chin);
      skG.addColorStop(0, skin);
      skG.addColorStop(0.6, skin);
      skG.addColorStop(1, skinShadow);
      ctx.fillStyle = skG;
      ctx.beginPath();
      ctx.ellipse(fx, cy + 10, W * (isSide ? 0.39 : 0.44), H * 0.44, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.stroke();
    } else if (isBack34) {
      const bDir = headFacing >= 0 ? 1 : -1;
      ctx.save();
      hijabOuter();
      ctx.clip();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(CX + bDir * 96, cy + 12, 34, 58, bDir * 0.08, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.restore();
      hijabOuter();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    }
  } else {
    if (spec.headgear !== 'helmet' && !(spec.headgear === 'headphones' && hatPop < 0.25)) {
      const drawOneEar = (exPos: number, tiltRad: number, flip: number) => {
        inked(ctx, () => { ctx.beginPath(); ctx.ellipse(exPos, cy + 13, 18, 24, tiltRad, 0, TAU); }, skin, ink, 4.5, 2, 3);
        if (spec.earDetail && !isBack) {
          ctx.save();
          ctx.strokeStyle = spec.skinShadow;
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.arc(exPos + flip * 2, cy + 13, 9.5, flip > 0 ? Math.PI * 0.65 : -Math.PI * 0.35, flip > 0 ? Math.PI * 1.45 : Math.PI * 0.45);
          ctx.stroke();
          ctx.restore();
        }
      };
      const earSide = headFacing >= 0 ? -1 : 1;
      const earX = isBack ? (headFacing < 0 ? CX + W * 0.48 : CX - W * 0.48) : CX + earSide * W * 0.49;
      if (!isBack34) {
        drawOneEar(earX, -0.12, -earSide);
      } else {
        drawOneEar(CX - (headFacing >= 0 ? 1 : -1) * W * 0.48, headFacing >= 0 ? -0.12 : 0.12, headFacing >= 0 ? 1 : -1);
      }
      if (!isBack && !isSide && spec.earDetail && Math.abs(headFacing) < 0.55) {
        const farEarX = CX - earSide * W * 0.475;
        inked(ctx, () => { ctx.beginPath(); ctx.ellipse(farEarX, cy + 14, 13, 21, 0.12 * -earSide, 0, TAU); }, spec.skinShadow, ink, 4.2, 1.5, 2.5);
      }
      if (isBack && !isBack34) {
        drawOneEar(CX + W * 0.48, 0.12, -1);
      }
      if (spec.earrings) {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(earX, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
        if (isBack && !isBack34) {
          inked(ctx, () => { ctx.beginPath(); ctx.arc(CX + W * 0.48, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
        }
      }
    }

    const headPath = () => {
      ctx.beginPath();
      if (spec.headShape === 'faceted') {
        ctx.moveTo(CX - W * 0.46, cy - 28);
        ctx.bezierCurveTo(CX - W * 0.48, headTop - 10, CX + W * 0.48, headTop - 10, CX + W * 0.48, cy - 24);
        ctx.bezierCurveTo(CX + W * 0.5, cy + 36, CX + W * 0.34, chin - 16, CX + headFacing * 22, chin);
        ctx.bezierCurveTo(CX - W * 0.28, chin - 12, CX - W * 0.46, cy + 40, CX - W * 0.46, cy - 28);
        ctx.closePath();
      } else {
        const N = 76;
        for (let i = 0; i <= N; i++) {
          const t = (i / N) * TAU;
          const c = Math.cos(t);
          const s = Math.sin(t);
          const n =
            spec.headShape === 'squircle'
              ? s < 0
                ? 2.85
                : 3.1
              : spec.headShape === 'round'
                ? s < 0
                  ? 2.1
                  : 2.3
                : 2.2;
          let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
          const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
          if (spec.headShape === 'sculpted' && s > 0) x *= 1 - 0.1 * s;
          if (!isBack && s > 0) x += headFacing * W * 0.035 * s;
          const px = CX + x;
          const py = cy + y;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
    };
    const skG = ctx.createLinearGradient(CX - W * 0.38, headTop + 12, CX + W * 0.46, chin);
    const fillBackHair = isBack && hairStyle !== 'bald';
    if (!fillBackHair && spec.skinHighlight) {
      skG.addColorStop(0, spec.skinHighlight);
      skG.addColorStop(0.46, skin);
      skG.addColorStop(1, skinShadow);
    } else {
      skG.addColorStop(0, fillBackHair ? hairColor : skin);
      skG.addColorStop(0.58, fillBackHair ? hairColor : skin);
      skG.addColorStop(1, fillBackHair ? hairColor : skinShadow);
    }
    inked(ctx, headPath, skG, ink, 5.5, 3.5, 5.5);

    if (isBack && hairStyle === 'bald') {
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = spec.skinHighlight ?? '#f8dec2';
      ctx.globalAlpha = 0.44;
      ctx.beginPath();
      ctx.ellipse(CX - 14, headTop + 34, W * 0.25, 16, -0.12, 0, TAU);
      ctx.fill();
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    } else if (isBack) {
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = skinShadow;
      ctx.fillRect(CX - W, chin - 44, W * 2, 54);
      if (hairStyle === 'fadeCrop') {
        const fg = ctx.createLinearGradient(0, chin - 78, 0, chin - 28);
        fg.addColorStop(0, hairColor);
        fg.addColorStop(0.55, 'rgba(54, 42, 44, 0.55)');
        fg.addColorStop(1, skinShadow);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(CX - W, chin - 74);
        ctx.quadraticCurveTo(CX, chin - 66, CX + W, chin - 74);
        ctx.lineTo(CX + W, chin - 24);
        ctx.lineTo(CX - W, chin - 24);
        ctx.closePath();
        ctx.fill();
      }
      if (isBack34) {
        const bDir = headFacing >= 0 ? 1 : -1;
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.ellipse(CX + bDir * W * 0.42, cy + 16, W * 0.24, H * 0.36, bDir * 0.1, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
      if (isBack34) {
        const bDir = headFacing >= 0 ? 1 : -1;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(CX + bDir * W * 0.36, cy - 18);
        ctx.lineTo(CX + bDir * W * 0.46, cy - 14);
        ctx.stroke();
      }
      const bShift = isBack34 ? (headFacing >= 0 ? -1 : 1) * 20 : 0;
      if (hairStyle === 'bun') {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(CX + bShift, headTop - 16, 48, 0, TAU); }, hairColor, ink, 5.5, 3, 4);
        inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX - 34 + bShift, headTop + 20, 68, 16, 8); }, '#e04848', ink, 4, 2, 2.5);
      } else if (hairStyle === 'messy') {
        const lift = -hatPop * 14;
        const ahoge = () => {
          ctx.beginPath();
          ctx.moveTo(CX - 14 + bShift, headTop + 2 + lift);
          ctx.quadraticCurveTo(CX - 6 + bShift, headTop - 42 + lift, CX - 42 + bShift, headTop - 22 + lift);
          ctx.quadraticCurveTo(CX - 20 + bShift, headTop - 8 + lift, CX + 12 + bShift, headTop + 4 + lift);
          ctx.closePath();
        };
        inked(ctx, ahoge, hairColor, ink, 4.5, 2, 3);
      } else if (hairStyle === 'spiky' || hairStyle === 'quiff') {
        const backSpike = () => {
          ctx.beginPath();
          ctx.moveTo(CX - 46 + bShift, headTop + 14);
          ctx.lineTo(CX - 12 + bShift, headTop - 36);
          ctx.lineTo(CX + 18 + bShift, headTop - 22);
          ctx.lineTo(CX + 46 + bShift, headTop + 14);
          ctx.closePath();
        };
        inked(ctx, backSpike, hairColor, ink, 4.5, 2, 3);
      } else if (hairStyle === 'curtain' || hairStyle === 'parted' || hairStyle === 'fadeCrop') {
        ctx.strokeStyle = hairHighlight ?? 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(CX - W * 0.28 + bShift, headTop + 34);
        ctx.quadraticCurveTo(CX + bShift, headTop + 14, CX + W * 0.28 + bShift, headTop + 34);
        ctx.stroke();
      }
    } else if (hairStyle === 'short') {
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(CX, headTop + 22, W * 0.56, 50, 0, 0, TAU);
      ctx.fill();
      if (isSide) {
        const sd = headFacing >= 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(CX - sd * W * 0.6, headTop - 10);
        ctx.lineTo(CX - sd * W * 0.18, headTop - 10);
        ctx.quadraticCurveTo(CX - sd * W * 0.35, cy - 14, CX - sd * W * 0.39, cy + 16);
        ctx.lineTo(CX - sd * W * 0.43, chin - 32);
        ctx.lineTo(CX - sd * W * 0.6, chin - 30);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    } else if (isSide) {
      // Profil samping (legacy side): tutup hanya sisi tengkorak di belakang telinga tanpa menyentuh pipi/mata/dagu
      const sd = headFacing >= 0 ? 1 : -1;
      const napeEndY = hairStyle === 'fadeCrop' ? chin - 58 : hairStyle === 'bun' ? chin - 44 : chin - 28;
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(CX - sd * W * 0.62, headTop - 16);
      ctx.lineTo(CX - sd * W * 0.14, headTop - 16);
      ctx.quadraticCurveTo(CX - sd * W * 0.34, cy - 16, CX - sd * W * 0.38, cy + 16);
      ctx.lineTo(CX - sd * W * 0.42, napeEndY);
      ctx.lineTo(CX - sd * W * 0.62, napeEndY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    }
  }

  if (!isBack && spec.headgear === 'helmet') {
    const sdH = isSide ? (headFacing >= 0 ? 1 : -1) : 0;
    ctx.strokeStyle = spec.headgearAccent ?? '#232838';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(isSide ? CX - sdH * 20 : CX - W * 0.44, cy + 36);
    ctx.quadraticCurveTo(CX + sdH * 24, chin + 8, isSide ? CX + sdH * W * 0.44 : CX + W * 0.44, cy + 36);
    ctx.stroke();
  }

  if (!isBack) {
    const effFacing = isSide ? (headFacing >= 0 ? 1 : -1) * 0.65 : headFacing;
    drawFaceFeatures(ctx, {
      cx: CX,
      cy,
      headW: W,
      skin,
      ink,
      eyeStyle: spec.eyeStyle,
      face: pose.face,
      blink,
      talk: pose.talk,
      facing: effFacing,
      browThick: spec.browThick,
      browStyle: spec.browStyle,
      browColor: spec.browColor,
      nose: spec.nose || isSide,
      noseStyle: spec.noseStyle,
      skinShadow: spec.skinShadow,
      beautyMark: spec.beautyMark,
      fullLips: spec.fullLips,
      upperLipColor: spec.upperLipColor,
      faintMustache: spec.faintMustache,
      mouthColor: spec.mouthColor,
      tongueColor: spec.tongueColor,
      lipColor: spec.lipColor,
      blushColor: spec.blushColor,
      eyeShine: spec.eyeShine,
    });

    const eyeG = computeEyeGeom(CX, cy, W, spec.eyeStyle, effFacing);
    const shift = eyeG.shift;
    if (spec.glasses) {
      const ex = eyeG.ex;
      const lensScaleX = eyeG.eyeScaleX;
      const eyeY = eyeG.eyeY - hatPop * 9;
      ctx.save();
      if (spec.glassesStyle === 'tech') {
        ctx.strokeStyle = '#1f2638';
        ctx.lineWidth = 5;
        const gw = 58;
        const gh = 44;
        for (const s of [-1, 1]) {
          const sx = lensScaleX(s);
          const wS = gw * sx;
          const lx = ex(s) - wS / 2;
          const ly = eyeY - gh / 2;
          ctx.fillStyle = 'rgba(150, 224, 255, 0.19)';
          ctx.beginPath();
          ctx.roundRect(lx, ly, wS, gh, 10);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lx + 10 * sx, ly + 14);
          ctx.lineTo(lx + 20 * sx, ly + 6);
          ctx.stroke();
          ctx.strokeStyle = '#1f2638';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(lx, ly, wS, gh, 10);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(ex(-1) + (gw * lensScaleX(-1)) / 2, eyeY - 4);
        ctx.lineTo(ex(1) - (gw * lensScaleX(1)) / 2, eyeY - 4);
        for (const s of [-1, 1]) {
          if (isSide && s === (headFacing >= 0 ? 1 : -1)) continue;
          ctx.moveTo(ex(s) + s * ((gw * lensScaleX(s)) / 2), eyeY - 6);
          ctx.lineTo(CX + s * W * 0.48, eyeY - 8);
        }
        ctx.stroke();
      } else if (spec.glassesStyle === 'thick') {
        const gw = 62;
        const gh = 48;
        const frame = '#1d1719';
        const lens = (s: number) => {
          const wS = gw * lensScaleX(s);
          ctx.beginPath();
          ctx.roundRect(ex(s) - wS / 2, eyeY - gh / 2, wS, gh, 16);
        };
        for (const s of [-1, 1]) {
          ctx.fillStyle = 'rgba(225, 240, 255, 0.07)';
          lens(s);
          ctx.fill();
        }
        const bridge = () => {
          ctx.beginPath();
          ctx.moveTo(ex(-1) + (gw * lensScaleX(-1)) / 2 - 2, eyeY - 8);
          ctx.quadraticCurveTo(CX + shift, eyeY - 15, ex(1) - (gw * lensScaleX(1)) / 2 + 2, eyeY - 8);
          const armSides: readonly (-1 | 1)[] = Math.abs(headFacing) < 0.08 && !isSide ? [-1, 1] : [headFacing >= 0 ? -1 : 1];
          for (const far of armSides) {
            ctx.moveTo(ex(far) + far * ((gw * lensScaleX(far)) / 2), eyeY - 10);
            ctx.lineTo(CX + far * W * 0.47, eyeY - 14);
          }
        };
        for (const [col, lw] of [[ink, 12], [frame, 8]] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          for (const s of [-1, 1]) {
            lens(s);
            ctx.stroke();
          }
          bridge();
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
          const wS = gw * lensScaleX(s);
          const lx = ex(s) - wS / 2;
          const ly = eyeY - gh / 2;
          ctx.beginPath();
          ctx.moveTo(lx + 12 * lensScaleX(s), ly - 1);
          ctx.lineTo(lx + 28 * lensScaleX(s), ly - 1);
          ctx.moveTo(lx + wS - 16 * lensScaleX(s), ly + 12);
          ctx.lineTo(lx + wS - 24 * lensScaleX(s), ly + 22);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = '#c58f38';
        ctx.lineWidth = 5;
        const gr = 30;
        for (const s of [-1, 1]) {
          const rx = gr * lensScaleX(s);
          ctx.fillStyle = 'rgba(220, 245, 255, 0.16)';
          ctx.beginPath();
          ctx.ellipse(ex(s), eyeY, rx, gr, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(ex(-1) + gr * lensScaleX(-1) - 2, eyeY);
        ctx.quadraticCurveTo(CX + shift, eyeY - 5, ex(1) - gr * lensScaleX(1) + 2, eyeY);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (spec.mustache) {
      const mx = CX + shift;
      const mustY = cy + 52 - hatPop * 8;
      const mp = () => {
        ctx.beginPath();
        ctx.moveTo(mx, mustY - 12);
        ctx.bezierCurveTo(mx + 22, mustY - 18, mx + 52, mustY - 2, mx + 56, mustY + 14);
        ctx.quadraticCurveTo(mx + 24, mustY + 12, mx, mustY + 4);
        ctx.quadraticCurveTo(mx - 24, mustY + 12, mx - 56, mustY + 14);
        ctx.bezierCurveTo(mx - 52, mustY - 2, mx - 22, mustY - 18, mx, mustY - 12);
        ctx.closePath();
      };
      inked(ctx, mp, hairColor, ink, 4.5, 2, 3);
    }

    if (isSide && hairStyle !== 'bald' && hairStyle !== 'hijab') {
      const sd = headFacing >= 0 ? 1 : -1;
      const rx0 = sd > 0 ? CX - W * 0.28 : 0;
      const rx1 = sd > 0 ? CX + W * 0.68 : CX + W * 0.28;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx0, 0);
      ctx.lineTo(rx1, 0);
      ctx.lineTo(rx1, 1100);
      ctx.lineTo(rx0, 1100);
      ctx.closePath();
      ctx.clip();
      drawFrontHairStyle(ctx, spec, W, headTop, cy, hatPop, effFacing);
      ctx.restore();
    } else {
      drawFrontHairStyle(ctx, spec, W, headTop, cy, hatPop, effFacing);
    }

    if (hairStyle === 'hijab') {
      const legPinX = CX - 54 * (1 - Math.abs(headFacing) * 0.35) + headFacing * 34;
      inked(ctx, () => { ctx.beginPath(); ctx.arc(legPinX, chin + 8, 7.5, 0, TAU); }, '#f5c43d', ink, 3, 1, 1.5);
    }
  }

  drawHeadgear(ctx, spec, W, headTop, cy, hatPop, isBack, isBack34, headFacing, undefined, isSide);
  const fx = pose.fx !== undefined ? pose.fx : isBack ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, CX, headTop - (spec.headgear !== 'none' ? 38 : 10), W, ink);

  if (headTilt !== 0) {
    ctx.restore();
  }

  if (pose.leftHand?.front) drawHandAndProp(ctx, -1, leftArm, leftProp, leftHandPt.hx, leftHandPt.hy, lk, spec, pose.leftHand);
  if (pose.rightHand?.front) drawHandAndProp(ctx, 1, rightArm, rightProp, rightHandPt.hx, rightHandPt.hy, lk, spec, pose.rightHand);

  ctx.restore();
}

function smoothstepHair(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function drawHeadphoneBand360(
  ctx: Ctx,
  spec: CharacterSpec,
  W: number,
  cy: number,
  pop: number,
  hy: number,
  pass: 'back' | 'front',
) {
  const col = spec.headgearColor ?? '#1f2638';
  const N = 48;
  const bandRx = W * 0.56;
  const bandRy = 140;
  const halfStrapZ = 9.5;
  const zSplit = -6;

  // Bangun daftar titik t dengan lengkung Z kontur tengkorak (-12 sin t) agar di profil samping melengkung alami (bukan palang lurus!)
  const ts: number[] = [];
  const zAt = (t: number) => rotateYaw3D([-bandRx * Math.cos(t), 6 - bandRy * Math.sin(t), -12 * Math.sin(t)], hy).z;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI;
    if (i > 0) {
      const tPrev = ((i - 1) / N) * Math.PI;
      const z0 = zAt(tPrev) - zSplit;
      const z1 = zAt(t) - zSplit;
      if ((z0 < 0 && z1 > 0) || (z0 > 0 && z1 < 0)) {
        const frac = -z0 / (z1 - z0);
        ts.push(tPrev + frac * (t - tPrev));
      }
    }
    ts.push(t);
  }

  const segs: { f0: { x: number; y: number; z: number }; f1: { x: number; y: number; z: number }; b0: { x: number; y: number; z: number }; b1: { x: number; y: number; z: number }; zMid: number; tMid: number }[] = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const t0 = ts[i];
    const t1 = ts[i + 1];
    const zArch0 = -12 * Math.sin(t0);
    const zArch1 = -12 * Math.sin(t1);
    const f0 = rotateYaw3D([-bandRx * Math.cos(t0), 6 - bandRy * Math.sin(t0), zArch0 + halfStrapZ], hy);
    const f1 = rotateYaw3D([-bandRx * Math.cos(t1), 6 - bandRy * Math.sin(t1), zArch1 + halfStrapZ], hy);
    const b0 = rotateYaw3D([-bandRx * Math.cos(t0), 6 - bandRy * Math.sin(t0), zArch0 - halfStrapZ], hy);
    const b1 = rotateYaw3D([-bandRx * Math.cos(t1), 6 - bandRy * Math.sin(t1), zArch1 - halfStrapZ], hy);
    segs.push({
      f0,
      f1,
      b0,
      b1,
      zMid: (f0.z + f1.z + b0.z + b1.z) * 0.25,
      tMid: (t0 + t1) * 0.5,
    });
  }

  ctx.save();
  ctx.translate(CX, cy - pop * 48);
  ctx.rotate(-0.1 * pop * smoothstepHair(0, 0.35, pop));
  const keep = pass === 'back' ? (z: number) => z < zSplit : (z: number) => z >= zSplit;

  // Bangun pita kontinu dari segmen-segmen yang lolos filter kedalaman
  let runStart = -1;
  const flushRun = (i0: number, i1: number) => {
    const traceBand = () => {
      ctx.beginPath();
      ctx.moveTo(segs[i0].f0.x, segs[i0].f0.y);
      for (let i = i0; i <= i1; i++) ctx.lineTo(segs[i].f1.x, segs[i].f1.y);
      for (let i = i1; i >= i0; i--) ctx.lineTo(segs[i].b0.x, segs[i].b0.y);
      ctx.closePath();
    };
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 12;
    traceBand();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 7;
    ctx.stroke();
    if (pass === 'front') {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      let padStarted = false;
      for (let i = i0; i <= i1; i++) {
        if (segs[i].tMid >= Math.PI * 0.32 && segs[i].tMid <= Math.PI * 0.68) {
          const mx = (segs[i].f0.x + segs[i].b0.x) * 0.5;
          const my = (segs[i].f0.y + segs[i].b0.y) * 0.5;
          if (!padStarted) {
            ctx.moveTo(mx, my);
            padStarted = true;
          } else {
            ctx.lineTo(mx, my);
          }
        }
      }
      if (padStarted) ctx.stroke();
    }
  };

  for (let i = 0; i < segs.length; i++) {
    if (keep(segs[i].zMid)) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      flushRun(runStart, i - 1);
      runStart = -1;
    }
  }
  if (runStart >= 0) flushRun(runStart, segs.length - 1);
  ctx.restore();
}

function quadBezierPt(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number): [number, number] {
  const m = 1 - t;
  return [m * m * x0 + 2 * m * t * cx + t * t * x1, m * m * y0 + 2 * m * t * cy + t * t * y1];
}

function cubicBezierPt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number,
): [number, number] {
  const m = 1 - t;
  return [
    m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3,
    m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3,
  ];
}

function sampleQuadChain(
  pts: Array<[number, number, number, number]>,
  xStart: number,
  yStart: number,
  stepsPerSeg = 8,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [{ x: xStart, y: yStart }];
  let px = xStart;
  let py = yStart;
  for (const [cx, cy, nx, ny] of pts) {
    for (let i = 1; i <= stepsPerSeg; i++) {
      const [sx, sy] = quadBezierPt(px, py, cx, cy, nx, ny, i / stepsPerSeg);
      out.push({ x: sx, y: sy });
    }
    px = nx;
    py = ny;
  }
  return out;
}

function resamplePolylineUniform(pts: readonly { x: number; y: number }[], count: number): { x: number; y: number }[] {
  if (pts.length === 0) return [];
  if (pts.length === 1 || count <= 0) return [{ ...pts[0] }];
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = cum[cum.length - 1] || 1;
  const out: { x: number; y: number }[] = [];
  let seg = 0;
  for (let k = 0; k <= count; k++) {
    const target = (k / count) * total;
    while (seg < pts.length - 2 && cum[seg + 1] < target) seg++;
    const segLen = Math.max(1e-6, cum[seg + 1] - cum[seg]);
    const t = Math.max(0, Math.min(1, (target - cum[seg]) / segLen));
    out.push({
      x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
      y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * t,
    });
  }
  return out;
}

/**
 * Lebar setengah kepala aktual `{ xL, xR }` dari `headPath360` pada koordinat vertikal `y`,
 * tepat & simetris terhadap tanda `hySideSin` untuk semua `headShape` (`round`, `sculpted`, `squircle`, `faceted`).
 */
function headWidthBoundsAtY(
  spec: CharacterSpec,
  W360: number,
  H: number,
  cy: number,
  y: number,
  hySideSin: number,
): { xL: number; xR: number } {
  const headTop = cy - H / 2;
  const chin = cy + H / 2;
  const yc = Math.max(headTop, Math.min(chin, y));
  if (spec.headShape === 'faceted') {
    const jawR = 0.49 + 0.015 * hySideSin;
    const jawL = 0.49 - 0.015 * hySideSin;
    const chinR = 0.31 + 0.03 * hySideSin;
    const chinL = 0.31 - 0.03 * hySideSin;
    let minX = CX;
    let maxX = CX;
    let bestDL = 1e9;
    let bestDR = 1e9;
    const scanSeg = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, side: 'L' | 'R' | 'top') => {
      for (let i = 0; i <= 24; i++) {
        const [px, py] = cubicBezierPt(x0, y0, x1, y1, x2, y2, x3, y3, i / 24);
        const d = Math.abs(py - yc);
        if ((side === 'L' || (side === 'top' && px <= CX)) && d < bestDL) {
          bestDL = d;
          minX = px;
        }
        if ((side === 'R' || (side === 'top' && px >= CX)) && d < bestDR) {
          bestDR = d;
          maxX = px;
        }
      }
    };
    scanSeg(CX - W360 * 0.47, cy - 26, CX - W360 * 0.48, headTop - 10, CX + W360 * 0.48, headTop - 10, CX + W360 * 0.47, cy - 26, 'top');
    scanSeg(CX + W360 * 0.47, cy - 26, CX + W360 * jawR, cy + 38, CX + W360 * chinR, chin - 14, CX + hySideSin * 22, chin, 'R');
    scanSeg(CX + hySideSin * 22, chin, CX - W360 * chinL, chin - 14, CX - W360 * jawL, cy + 38, CX - W360 * 0.47, cy - 26, 'L');
    if (bestDL > 1e8) minX = CX - W360 * 0.47;
    if (bestDR > 1e8) maxX = CX + W360 * 0.47;
    return { xL: minX, xR: maxX };
  }
  const v = Math.max(-0.998, Math.min(0.998, (yc - cy) / (H / 2)));
  const n =
    spec.headShape === 'squircle'
      ? v < 0
        ? 2.85
        : 3.1
      : spec.headShape === 'round'
        ? v < 0
          ? 2.1
          : 2.3
        : 2.2;
  let xMag = (W360 / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), n)), 1 / n);
  if (spec.headShape === 'sculpted' && v > 0) xMag *= 1 - 0.1 * v;
  const shiftX = v > 0 ? hySideSin * W360 * 0.045 * v : 0;
  return { xL: CX + shiftX - xMag, xR: CX + shiftX + xMag };
}

/**
 * Kurva `top` (L -> mahkota -> R) & `bot` (L -> poni -> R) EKSAK dari `HEAD` per `HairStyle`,
 * dalam koordinat lokal `(dx = x - CX, y)`.
 */
function getHeadHairPolylines(
  hairStyle: HairStyle,
  W: number,
  headTop: number,
  cy: number,
  hatPop: number,
): { top: { x: number; y: number }[]; bot: { x: number; y: number }[]; foreProj: number } {
  const pushCubic = (out: { x: number; y: number }[], x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, steps = 10) => {
    const p0 = out[out.length - 1];
    for (let i = 1; i <= steps; i++) {
      const [sx, sy] = cubicBezierPt(p0.x, p0.y, x1, y1, x2, y2, x3, y3, i / steps);
      out.push({ x: sx, y: sy });
    }
  };
  const pushQuad = (out: { x: number; y: number }[], cx: number, cyP: number, x1: number, y1: number, steps = 8) => {
    const p0 = out[out.length - 1];
    for (let i = 1; i <= steps; i++) {
      const [sx, sy] = quadBezierPt(p0.x, p0.y, cx, cyP, x1, y1, i / steps);
      out.push({ x: sx, y: sy });
    }
  };
  const pushLine = (out: { x: number; y: number }[], x1: number, y1: number, steps = 8) => {
    const p0 = out[out.length - 1];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      out.push({ x: p0.x + (x1 - p0.x) * t, y: p0.y + (y1 - p0.y) * t });
    }
  };

  if (hairStyle === 'messy') {
    const lift = -hatPop * 14;
    const top: { x: number; y: number }[] = [{ x: -W * 0.5, y: cy - 10 }];
    pushCubic(top, -W * 0.56, headTop - 16, -W * 0.28, headTop - 44 + lift, -10, headTop - 36 + lift, 10);
    pushQuad(top, 6, headTop - 76 + lift, 44, headTop - 54 + lift, 8);
    pushQuad(top, 26, headTop - 42 + lift, 34, headTop - 36 + lift, 6);
    pushCubic(top, W * 0.44, headTop - 40, W * 0.58, headTop - 4, W * 0.5, cy - 12, 10);

    const bot = sampleQuadChain(
      [
        [-W * 0.44, headTop + 34, -W * 0.34, headTop + 18],
        [-W * 0.22, headTop + 46, -W * 0.04, headTop + 12],
        [W * 0.08, headTop + 44, W * 0.2, headTop + 14],
        [W * 0.34, headTop + 34, W * 0.5, cy - 12],
      ],
      -W * 0.5,
      cy - 10,
      8,
    );
    return { top, bot, foreProj: 12 };
  }
  if (hairStyle === 'curtain') {
    const lift = -hatPop * 12;
    const top: { x: number; y: number }[] = [{ x: -W * 0.5, y: cy - 6 }];
    pushCubic(top, -W * 0.58, headTop - 18, -W * 0.28, headTop - 54 + lift, 4, headTop - 44 + lift, 10);
    pushQuad(top, 26, headTop - 78 + lift, 64, headTop - 48 + lift, 8);
    pushCubic(top, W * 0.54, headTop - 36, W * 0.6, headTop + 2, W * 0.49, cy - 12, 10);

    const bot = sampleQuadChain(
      [
        [-W * 0.28, headTop + 52, -10, headTop + 16],
        [6, headTop + 56, W * 0.16, headTop + 14],
        [W * 0.3, headTop + 42, W * 0.49, cy - 12],
      ],
      -W * 0.5,
      cy - 6,
      10,
    );
    return { top, bot, foreProj: 12 };
  }
  if (hairStyle === 'fadeCrop') {
    const lift = -hatPop * 10;
    const top: { x: number; y: number }[] = [{ x: -W * 0.485, y: cy + 4 }];
    pushQuad(top, -W * 0.525, cy - 28, -W * 0.475, headTop + 4, 6);
    pushCubic(top, -W * 0.42, headTop - 48 + lift, -W * 0.08, headTop - 62 + lift, W * 0.24, headTop - 50 + lift, 12);
    pushCubic(top, W * 0.47, headTop - 38 + lift, W * 0.525, headTop + 2, W * 0.485, cy + 2, 10);

    const bot = sampleQuadChain(
      [
        [-W * 0.43, cy - 18, -W * 0.355, headTop + 32],
        [-W * 0.14, headTop + 18, W * 0.05, headTop + 27],
        [W * 0.22, headTop + 20, W * 0.395, headTop + 34],
        [W * 0.435, cy - 22, W * 0.485, cy + 2],
      ],
      -W * 0.485,
      cy + 4,
      8,
    );
    return { top, bot, foreProj: 8 };
  }
  if (hairStyle === 'parted') {
    const top: { x: number; y: number }[] = [{ x: -W * 0.49, y: cy - 8 }];
    pushCubic(top, -W * 0.55, headTop - 14, -W * 0.2, headTop - 44, W * 0.16, headTop - 36, 12);
    pushCubic(top, W * 0.46, headTop - 34, W * 0.56, headTop + 4, W * 0.49, cy - 18, 12);

    const bot = sampleQuadChain(
      [
        [-W * 0.42, headTop + 44, -W * 0.18, headTop + 34],
        [W * 0.24, headTop + 20, W * 0.49, cy - 18],
      ],
      -W * 0.49,
      cy - 8,
      14,
    );
    return { top, bot, foreProj: 6 };
  }
  if (hairStyle === 'bun') {
    const top: { x: number; y: number }[] = [{ x: -W * 0.5, y: cy - 2 }];
    pushCubic(top, -W * 0.54, headTop - 16, -W * 0.14, headTop - 32, 6, headTop - 22, 12);
    pushCubic(top, W * 0.36, headTop - 30, W * 0.56, headTop - 6, W * 0.49, cy - 10, 12);

    const bot = sampleQuadChain(
      [
        [-W * 0.24, headTop + 44, 8, headTop + 18],
        [W * 0.28, headTop + 26, W * 0.49, cy - 10],
      ],
      -W * 0.5,
      cy - 2,
      14,
    );
    return { top, bot, foreProj: 4 };
  }
  // spiky / quiff (Saka Nusantara): garis bawah dahi terangkat bersih di balik pita iket
  const top: { x: number; y: number }[] = [{ x: -W * 0.48, y: cy - 16 }];
  pushQuad(top, -W * 0.54, headTop - 14, -W * 0.16, headTop - 44, 10);
  pushLine(top, W * 0.04, headTop - 62, 8);
  pushLine(top, W * 0.24, headTop - 36, 8);
  pushQuad(top, W * 0.56, headTop - 16, W * 0.48, cy - 18, 10);
  const bot = sampleQuadChain(
    [
      [-W * 0.36, headTop + 28, -W * 0.22, headTop + 26],
      [0, headTop + 22, W * 0.22, headTop + 26],
      [W * 0.36, headTop + 28, W * 0.48, cy - 18],
    ],
    -W * 0.48,
    cy - 16,
    8,
  );
  return { top, bot, foreProj: 8 };
}

/**
 * Cangkang Rambut Penuh 360° + 6-Station Anatomical `cylSpan` Cutout (Atelier v6.1):
 * - Mengisi volume rambut penuh di dalam `headPath360` dengan lengkung tengkuk organik melengkung lembut.
 * - Mengekspos jendela wajah memakai profil azimut anatomis 6-stasiun (dahi -> pelipis -> jambang -> lengkung telinga -> pipi -> dagu)
 *   disambung kurva Bezier kuadratik halus (NOL dinding pipi lurus vertikal, NOL percabangan arah diskrit!).
 */
function fillContinuousHairShellWithFaceCutout(
  ctx: Ctx,
  spec: CharacterSpec,
  headPath360: () => void,
  skG: CanvasGradient,
  W360: number,
  H: number,
  headTop: number,
  cy: number,
  chin: number,
  hyRad: number,
  hySideSin: number,
  napeSolidY: number,
  foreheadY: number,
) {
  const { ink, hairColor, hairStyle } = spec;
  ctx.save();
  headPath360();
  ctx.clip();

  // 1. Cangkang rambut penuh dari puncak kepala hingga tengkuk belakang melengkung organik
  const napeCenterY = napeSolidY - 7;
  const napeSideY = napeSolidY + 3;
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.moveTo(CX - W360 * 0.72, headTop - 6);
  ctx.lineTo(CX + W360 * 0.72, headTop - 6);
  ctx.lineTo(CX + W360 * 0.72, napeSideY);
  ctx.quadraticCurveTo(CX, napeCenterY, CX - W360 * 0.72, napeSideY);
  ctx.closePath();
  ctx.fill();

  if (hairStyle === 'fadeCrop') {
    const fadeStart = chin - 76;
    const fadeEnd = chin - 24;
    const fg = ctx.createLinearGradient(0, fadeStart, 0, fadeEnd);
    fg.addColorStop(0, hairColor);
    fg.addColorStop(0.52, 'rgba(54, 42, 44, 0.54)');
    fg.addColorStop(1, 'rgba(54, 42, 44, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(CX - W360 * 0.72, fadeStart);
    ctx.lineTo(CX + W360 * 0.72, fadeStart);
    ctx.lineTo(CX + W360 * 0.72, fadeEnd);
    ctx.lineTo(CX - W360 * 0.72, fadeEnd);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Profil azimut anatomis 6-stasiun via cylSpan(hyRad) + kurva Bezier kuadratik halus
  const isFade = hairStyle === 'fadeCrop';
  const stations: ReadonlyArray<readonly [y: number, ang: number]> = [
    [foreheadY, isFade ? 1.22 : 1.14],
    [cy - 18, isFade ? 1.16 : 1.06],
    [cy + 14, isFade ? 1.34 : 1.24],
    [cy + 28, isFade ? 1.56 : 1.48],
    [chin - 34, isFade ? 1.74 : 1.66],
    [chin + 8, isFade ? 1.80 : 1.72],
  ];

  const leftPts: { x: number; y: number }[] = [];
  const rightPts: { x: number; y: number }[] = [];
  for (const [sy, ang] of stations) {
    const b = headWidthBoundsAtY(spec, W360, H, cy, sy, hySideSin);
    const rxK = Math.max(24, (b.xR - b.xL) * 0.525);
    const sp = cylSpan(hyRad, -ang, ang, rxK);
    if (sp !== null && sp.x1 - sp.x0 > 1.5) {
      leftPts.push({ x: CX + sp.x0, y: sy });
      rightPts.push({ x: CX + sp.x1, y: sy });
    }
  }

  if (leftPts.length >= 2) {
    // Susun poligon tertutup: kiri bawah -> kiri atas -> dahi -> kanan atas -> kanan bawah
    const poly: { x: number; y: number }[] = [];
    for (let i = leftPts.length - 1; i >= 0; i--) poly.push(leftPts[i]);
    const topL = leftPts[0];
    const topR = rightPts[0];
    const archSpan = Math.min(1, (topR.x - topL.x) / Math.max(1, W360 * 0.85));
    poly.push({ x: (topL.x + topR.x) * 0.5, y: topL.y - (isFade ? 6 : 11) * archSpan });
    for (let i = 0; i < rightPts.length; i++) poly.push(rightPts[i]);

    const traceFaceWindow = () => {
      ctx.beginPath();
      const n = poly.length;
      const startX = (poly[n - 1].x + poly[0].x) * 0.5;
      const startY = (poly[n - 1].y + poly[0].y) * 0.5;
      ctx.moveTo(startX, startY);
      for (let i = 0; i < n; i++) {
        const cur = poly[i];
        const nxt = poly[(i + 1) % n];
        ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) * 0.5, (cur.y + nxt.y) * 0.5);
      }
      ctx.closePath();
    };

    // Untuk fadeCrop (Ebot), tambahkan feather skin-fade lembut sepanjang batas pelipis/samping (89°)!
    if (isFade) {
      ctx.save();
      ctx.strokeStyle = 'rgba(54, 42, 44, 0.34)';
      ctx.lineWidth = 15;
      ctx.lineJoin = 'round';
      traceFaceWindow();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = skG;
    traceFaceWindow();
    ctx.fill();
  }

  ctx.restore();
  headPath360();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  ctx.stroke();
}

/**
 * Rambut `'short'` (`dimas`, `bangUdin`) 360° Kontinu (Atelier v6.1):
 * Cangkang penuh + 6-station anatomical cutout dengan lengkung dahi turun hingga `headTop + 62`
 * sehingga rambut pendek & jambang Dimas terlihat rapi di bawah tepi topi pada `0°`.
 */
function renderShortHair360(
  ctx: Ctx,
  spec: CharacterSpec,
  headPath360: () => void,
  skG: CanvasGradient,
  W360: number,
  H: number,
  headTop: number,
  chin: number,
  hyRad: number,
  hyFrontVis: number,
  hySideSin: number,
) {
  const { hairHighlight } = spec;
  const cy = (headTop + chin) * 0.5;
  fillContinuousHairShellWithFaceCutout(
    ctx,
    spec,
    headPath360,
    skG,
    W360,
    H,
    headTop,
    cy,
    chin,
    hyRad,
    hySideSin,
    chin - 38,
    headTop + 62,
  );

  const backHiliteA = smoothstepHair(0.45, 0.08, hyFrontVis);
  if (backHiliteA > 0.01) {
    ctx.save();
    headPath360();
    ctx.clip();
    ctx.globalAlpha *= backHiliteA;
    ctx.strokeStyle = hairHighlight ?? 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const hxShift = -hySideSin * 18;
    ctx.moveTo(CX + hxShift - W360 * 0.26, headTop + 32);
    ctx.quadraticCurveTo(CX + hxShift, headTop + 14, CX + hxShift + W360 * 0.26, headTop + 32);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Proyeksi Silindris 2.5D Kurva Poni Klasik `getHeadHairPolylines().bot`:
 * Memetakan setiap titik `(dx_i, y_i)` dari poni klasik `drawFrontHairStyle` ke sudut azimut silinder
 * `theta = asin(dx / R0)`, memutarnya sebesar `hyRad`, lalu memotong presisi pada batas siluet `±PI/2` (`z >= 0`).
 * Pada `0°` hasilnya 100% identik dengan `drawFrontHairStyle`; saat berputar, poni meluncur alami membungkus dahi!
 */
function projectClassicFrontHairline(
  botPts: readonly { x: number; y: number }[],
  W: number,
  W360: number,
  hyRad: number,
): { x: number; y: number }[] {
  const R0 = Math.max(1, W * 0.5);
  const Rh = W360 * 0.502;
  const halfPi = Math.PI * 0.5;
  const wrapPi = (a: number) => {
    let r = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
    if (r <= -Math.PI) r += TAU;
    return r;
  };

  // Konversi semua titik ke pasangan (phi, y) dengan sudut unwrapped berurutan
  const phis: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < botPts.length; i++) {
    const u = Math.max(-0.985, Math.min(0.985, botPts[i].x / R0));
    const th = Math.asin(u);
    phis.push(wrapPi(th + hyRad));
    ys.push(botPts[i].y);
  }

  // Ekstrak run kontinu di belahan depan phi ∈ [-PI/2, +PI/2] dengan interpolasi eksak di batas ±PI/2
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < phis.length - 1; i++) {
    let p0 = phis[i];
    let p1 = phis[i + 1];
    // Pastikan p1 - p0 adalah jarak terpendek (menangani wrap di ±PI)
    if (p1 - p0 > Math.PI) p1 -= TAU;
    if (p1 - p0 < -Math.PI) p1 += TAU;
    const y0 = ys[i];
    const y1 = ys[i + 1];

    // Klip segmen [p0, p1] terhadap [-halfPi, +halfPi]
    const lo = Math.min(p0, p1);
    const hi = Math.max(p0, p1);
    if (hi < -halfPi || lo > halfPi) continue;

    const dP = p1 - p0;
    let t0 = 0;
    let t1 = 1;
    if (Math.abs(dP) > 1e-6) {
      const ta = (-halfPi - p0) / dP;
      const tb = (halfPi - p0) / dP;
      t0 = Math.max(0, Math.min(ta, tb));
      t1 = Math.min(1, Math.max(ta, tb));
    }
    if (t1 < t0) continue;

    const pa = p0 + dP * t0;
    const ya = y0 + (y1 - y0) * t0;
    const pb = p0 + dP * t1;
    const yb = y0 + (y1 - y0) * t1;
    const xa = CX + Rh * Math.sin(pa);
    const xb = CX + Rh * Math.sin(pb);

    if (out.length === 0 || Math.hypot(xa - out[out.length - 1].x, ya - out[out.length - 1].y) > 0.5) {
      out.push({ x: xa, y: ya });
    }
    if (Math.hypot(xb - xa, yb - ya) > 0.5) {
      out.push({ x: xb, y: yb });
    }
  }
  return out;
}

/**
 * Helper menggambar sanggul tinggi Bu Siti + pita merah `#e04848` (selalu terlihat dari 0° sampai 180°!).
 */
function drawClassicBun360(
  ctx: Ctx,
  spec: CharacterSpec,
  headTop: number,
  hatPop: number,
  hyRad: number,
  pass: 'back' | 'front',
  reliefOut?: ReliefPrimitive[],
) {
  if (spec.hairStyle !== 'bun') return;
  const bun3 = rotateYaw3D([-6, headTop - 40 - hatPop * 10, -44], hyRad);
  if ((pass === 'back' && bun3.z >= 0) || (pass === 'front' && bun3.z < 0)) return;
  const bx = CX + bun3.x;
  const by = bun3.y;
  const bunRad = 44;
  const hySideSin = Math.sin(hyRad);
  inked(ctx, () => { ctx.beginPath(); ctx.arc(bx, by, bunRad, 0, TAU); }, spec.hairColor, spec.ink, 5.5, 3, 4);
  ctx.save();
  ctx.translate(bx, by + 18);
  ctx.rotate(hySideSin * 0.22);
  inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-33, -8, 66, 16, 8); }, '#e04848', spec.ink, 4, 2, 2.5);
  ctx.restore();
  if (reliefOut) {
    reliefOut.push({ kind: 'sphere', cx: bx, cy: by, rx: bunRad, ry: bunRad, z: bun3.z + 200, heightScale: 0.92, ao: bun3.z < 0 ? 0.85 : 1 });
  }
}

/**
 * Helper menggambar jambul `ahoge` 2.5D Bezier murni Bang Utoh (`Tip.z = -14` agar selalu melengkung di 89°!).
 */
function drawClassicAhoge360(
  ctx: Ctx,
  spec: CharacterSpec,
  headTop: number,
  hatPop: number,
  hyRad: number,
  pass: 'back' | 'front',
) {
  if (spec.hairStyle !== 'messy') return;
  const lift = -hatPop * 14;
  const p0 = rotateYaw3D([-10, headTop - 36 + lift, 10], hyRad);
  const c1 = rotateYaw3D([6, headTop - 76 + lift, 14], hyRad);
  const tip = rotateYaw3D([44, headTop - 54 + lift, -14], hyRad);
  const c2 = rotateYaw3D([26, headTop - 42 + lift, -6], hyRad);
  const p1 = rotateYaw3D([34, headTop - 36 + lift, 6], hyRad);
  const zMid = (p0.z + tip.z) * 0.5;
  if ((pass === 'back' && zMid >= -12) || (pass === 'front' && zMid < -12)) return;

  ctx.save();
  ctx.fillStyle = spec.hairColor;
  ctx.beginPath();
  ctx.moveTo(CX + p0.x, p0.y);
  ctx.quadraticCurveTo(CX + c1.x, c1.y, CX + tip.x, tip.y);
  ctx.quadraticCurveTo(CX + c2.x, c2.y, CX + p1.x, p1.y);
  ctx.closePath();
  ctx.fill();
  // Stroke HANYA busur luar (nol garis sambungan di pangkal mahkota!)
  ctx.strokeStyle = spec.ink;
  ctx.lineWidth = 5.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(CX + p0.x, p0.y);
  ctx.quadraticCurveTo(CX + c1.x, c1.y, CX + tip.x, tip.y);
  ctx.quadraticCurveTo(CX + c2.x, c2.y, CX + p1.x, p1.y);
  ctx.stroke();
  ctx.restore();
}

function renderHairBackPass360(
  ctx: Ctx,
  spec: CharacterSpec,
  _W360: number,
  headTop: number,
  _cy: number,
  hatPop: number,
  hyRad: number,
  reliefOut?: ReliefPrimitive[],
) {
  drawClassicBun360(ctx, spec, headTop, hatPop, hyRad, 'back', reliefOut);
  drawClassicAhoge360(ctx, spec, headTop, hatPop, hyRad, 'back');
}

function renderHairFrontFeatures360(
  ctx: Ctx,
  spec: CharacterSpec,
  _W360: number,
  headTop: number,
  _cy: number,
  hatPop: number,
  hyRad: number,
  reliefOut?: ReliefPrimitive[],
) {
  drawClassicBun360(ctx, spec, headTop, hatPop, hyRad, 'front', reliefOut);
}

/**
 * Arsitektur Rambut 2.5D Bezier Murni Klasik (Atelier v6.1):
 * - 6-station anatomical `cylSpan` face cutout (nol dinding pipi lurus vertikal, nol flip diskrit).
 * - Kubah mahkota luar 2.5D tinggi KONSTAN sepanjang 0°..360° (nol penyusutan di belakang!).
 * - Proyeksi silindris 2.5D kurva poni klasik `getHeadHairPolylines().bot` menyatu dalam satu `traceCrownPath`
 *   (nol stiker segitiga memudar, 100% setia gaya klasik `drawFrontHairStyle`!).
 */
function renderUnifiedHair360(
  ctx: Ctx,
  spec: CharacterSpec,
  headPath360: () => void,
  skG: CanvasGradient,
  W: number,
  W360: number,
  H: number,
  headTop: number,
  cy: number,
  chin: number,
  hatPop: number,
  hyRad: number,
  hyFrontVis: number,
  hySideSin: number,
) {
  const { ink, hairStyle, hairColor, hairHighlight } = spec;
  const lift = -hatPop * (hairStyle === 'messy' ? 14 : hairStyle === 'curtain' ? 12 : 10);

  // 1. Cangkang Rambut Penuh + 6-Station Anatomical Face-Cutout (100% kontinu!)
  const napeSolidY = hairStyle === 'fadeCrop' ? chin - 74 : hairStyle === 'bun' ? chin - 44 : chin - 36;
  const foreheadY =
    hairStyle === 'fadeCrop'
      ? headTop + 26
      : hairStyle === 'spiky' || hairStyle === 'quiff'
        ? headTop + 28
        : headTop + 34;
  fillContinuousHairShellWithFaceCutout(
    ctx,
    spec,
    headPath360,
    skG,
    W360,
    H,
    headTop,
    cy,
    chin,
    hyRad,
    hySideSin,
    napeSolidY,
    foreheadY,
  );

  // 2. Kubah Mahkota Luar 2.5D Tinggi KONSTAN 0°..360° (nol penyusutan 45% di belakang!)
  const wPureBack = smoothstepHair(-0.12, -0.72, hyFrontVis);
  const yTemBase =
    hairStyle === 'fadeCrop'
      ? cy + 2
      : hairStyle === 'spiky' || hairStyle === 'quiff'
        ? cy - 16
        : hairStyle === 'bun'
          ? cy - 6
          : cy - 10;
  const yAnchor = yTemBase * (1 - wPureBack) + (cy - 14) * wPureBack;
  const bAnchor = headWidthBoundsAtY(spec, W360, H, cy, yAnchor, hySideSin);
  const anchorL = { x: bAnchor.xL - 1.5, y: yAnchor };
  const anchorR = { x: bAnchor.xR + 1.5, y: yAnchor };

  const crownH =
    hairStyle === 'fadeCrop'
      ? 54
      : hairStyle === 'curtain'
        ? 46
        : hairStyle === 'spiky' || hairStyle === 'quiff'
          ? 44
          : hairStyle === 'messy'
            ? 42
            : hairStyle === 'parted'
              ? 38
              : 28;
  const apexX = CX + hySideSin * W360 * (hairStyle === 'fadeCrop' ? 0.08 : 0.05);
  const apexY = headTop - crownH + lift * 0.85;

  const parietalSpread =
    hairStyle === 'curtain'
      ? 0.545
      : hairStyle === 'messy'
        ? 0.54
        : hairStyle === 'fadeCrop'
          ? 0.532
          : 0.53;
  const flatTopSpan = hairStyle === 'fadeCrop' ? 0.34 : 0.24;

  const ctrl1LX = Math.min(anchorL.x - 4, CX - W360 * parietalSpread);
  const ctrl1LY = headTop - crownH * (hairStyle === 'fadeCrop' ? 0.72 : 0.46) + lift * 0.5;
  const ctrl2LX = apexX - W360 * flatTopSpan;
  const ctrl2LY = apexY + (hairStyle === 'fadeCrop' ? 2 : 4);

  const ctrl1RX = apexX + W360 * flatTopSpan;
  const ctrl1RY = apexY + (hairStyle === 'fadeCrop' ? 2 : 4);
  const ctrl2RX = Math.max(anchorR.x + 4, CX + W360 * parietalSpread);
  const ctrl2RY = headTop - crownH * (hairStyle === 'fadeCrop' ? 0.72 : 0.46) + lift * 0.5;

  const M = 36;
  const outerCrown: { x: number; y: number }[] = [];
  for (let k = 0; k <= M; k++) {
    const u = k / M;
    const [sx, sy] =
      u <= 0.5
        ? cubicBezierPt(anchorL.x, anchorL.y, ctrl1LX, ctrl1LY, ctrl2LX, ctrl2LY, apexX, apexY, u * 2)
        : cubicBezierPt(apexX, apexY, ctrl1RX, ctrl1RY, ctrl2RX, ctrl2RY, anchorR.x, anchorR.y, (u - 0.5) * 2);
    outerCrown.push({ x: sx, y: sy });
  }

  // 3. Proyeksi Silindris 2.5D Poni Klasik `getHeadHairPolylines().bot` menyatu dalam SATU `traceCrownPath`!
  const classicPoly = getHeadHairPolylines(hairStyle, W, headTop, cy, hatPop);
  const rawVisBot = projectClassicFrontHairline(classicPoly.bot, W, W360, hyRad);
  // Kunci setiap titik visBot di dalam batas kepala aktual pada elevasinya (nol celah putih 3px di tepi dahi 45°/89°!)
  const visBot = rawVisBot.map((p) => {
    const b = headWidthBoundsAtY(spec, W360, H, cy, p.y, hySideSin);
    return { x: Math.max(b.xL + 0.5, Math.min(b.xR - 0.5, p.x)), y: p.y };
  });

  const traceCrownPath = () => {
    ctx.beginPath();
    ctx.moveTo(anchorL.x, anchorL.y);
    for (let i = 0; i < outerCrown.length; i++) ctx.lineTo(outerCrown[i].x, outerCrown[i].y);
    ctx.lineTo(anchorR.x, anchorR.y);
    if (visBot.length >= 2) {
      for (let i = visBot.length - 1; i >= 0; i--) ctx.lineTo(visBot[i].x, visBot[i].y);
    } else {
      ctx.quadraticCurveTo(CX, cy - 18, anchorL.x, anchorL.y);
    }
    ctx.closePath();
  };

  // Bayangan jatuh lembut mahkota (memudar mulus ke belakang)
  const shadowAlpha = smoothstepHair(-0.08, 0.25, hyFrontVis);
  if (shadowAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha *= shadowAlpha;
    ctx.translate(hySideSin * 2.5, 3.5);
    traceCrownPath();
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.restore();
  }

  traceCrownPath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  // Outline mahkota luar utuh
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.moveTo(anchorL.x, anchorL.y);
  for (let i = 0; i < outerCrown.length; i++) ctx.lineTo(outerCrown[i].x, outerCrown[i].y);
  ctx.lineTo(anchorR.x, anchorR.y);
  ctx.stroke();

  // Outline garis poni klasik HANYA pada segmen depan `visBot` yang berada di atas kulit wajah (nol garis di belakang!)
  const frontBangAlpha = smoothstepHair(-0.18, 0.14, hyFrontVis);
  if (visBot.length >= 2 && frontBangAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha *= frontBangAlpha;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(visBot[0].x, visBot[0].y);
    for (let i = 1; i < visBot.length; i++) ctx.lineTo(visBot[i].x, visBot[i].y);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Fitur Khas 2.5D Bezier Puncak Mahkota (Raka wave lembut, Saka puncak tunggal klasik, Bang Utoh ahoge!)
  if (hairStyle === 'curtain') {
    const p0 = rotateYaw3D([4, headTop - 44 + lift, 12], hyRad);
    const c1 = rotateYaw3D([26, headTop - 76 + lift, 16], hyRad);
    const p1 = rotateYaw3D([62, headTop - 46 + lift, 8], hyRad);
    const base = rotateYaw3D([30, headTop - 28 + lift, 8], hyRad);
    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(CX + p0.x, p0.y);
    ctx.quadraticCurveTo(CX + c1.x, c1.y, CX + p1.x, p1.y);
    ctx.quadraticCurveTo(CX + base.x, base.y, CX + p0.x, p0.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX + p0.x, p0.y);
    ctx.quadraticCurveTo(CX + c1.x, c1.y, CX + p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
  } else if (hairStyle === 'spiky' || hairStyle === 'quiff') {
    // Puncak tengah tebal klasik Saka + punggung mahkota halus di belakang (menggantikan 6 kerucut tipis!)
    const pL = rotateYaw3D([-W360 * 0.16, headTop - 42 + lift, 14], hyRad);
    const peak = rotateYaw3D([W360 * 0.04, headTop - 64 + lift, 6], hyRad);
    const pR = rotateYaw3D([W360 * 0.24, headTop - 36 + lift, 14], hyRad);
    const pBack = rotateYaw3D([0, headTop - 52 + lift, -24], hyRad);
    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(CX + pL.x, pL.y);
    ctx.lineTo(CX + peak.x, peak.y);
    ctx.lineTo(CX + pR.x, pR.y);
    ctx.quadraticCurveTo(CX + pBack.x, pBack.y + 18, CX + pL.x, pL.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(CX + pL.x, pL.y);
    ctx.lineTo(CX + peak.x, peak.y);
    ctx.lineTo(CX + pR.x, pR.y);
    ctx.stroke();
    ctx.restore();
  } else if (hairStyle === 'messy') {
    drawClassicAhoge360(ctx, spec, headTop, hatPop, hyRad, 'front');
  }

  // 5. Highlight permukaan 3D terklip di dalam mahkota (Ebot waves, Bang Utoh sheen, Pak Budi uban tegas, Tio sisiran!)
  ctx.save();
  traceCrownPath();
  ctx.clip();
  const rSurf = W360 * 0.48;
  const rotPt = (lx: number, absY: number, dZ = 0) => {
    const u = Math.max(-0.98, Math.min(0.98, lx / (W360 * 0.52)));
    const cz = Math.sqrt(Math.max(0, 1 - u * u)) * rSurf + dZ;
    const p = rotateYaw3D([lx, absY, cz], hyRad);
    return { x: CX + p.x, y: p.y, z: p.z };
  };

  if (hairStyle === 'fadeCrop') {
    ctx.strokeStyle = hairHighlight ?? '#33364a';
    ctx.lineWidth = 4.8;
    for (const [ox, oy, dx, dy] of [
      [-0.22, -16, 0.44, 0],
      [-0.18, -32, 0.36, 0],
      [-0.24, 2, 0.48, 0],
    ]) {
      const p0 = rotPt(W360 * ox, headTop + oy + lift);
      const pc = rotPt(W360 * (ox + dx * 0.5), headTop + oy - 12 + lift, 8);
      const p1 = rotPt(W360 * (ox + dx), headTop + oy + dy + lift);
      const a = smoothstepHair(-W360 * 0.24, W360 * 0.04, pc.z);
      if (a > 0.02) {
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  } else if (hairStyle === 'messy' && hairHighlight) {
    const p0 = rotPt(-34, headTop - 14);
    const pc = rotPt(0, headTop - 26, 10);
    const p1 = rotPt(38, headTop - 10);
    const a = smoothstepHair(-W360 * 0.24, W360 * 0.04, pc.z);
    if (a > 0.02) {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    }
  } else if (hairStyle === 'parted') {
    if (hairHighlight && !spec.hairCombed) {
      // Uban pelipis tegas Pak Budi (#c5cad6) pada kedua sisi pelipis (terbaca jelas di 0° maupun 89°!)
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 6.2;
      for (const s of [-1, 1] as const) {
        const g0 = rotateYaw3D([s * W360 * 0.45, cy - 12, W360 * 0.14], hyRad);
        const gc = rotateYaw3D([s * W360 * 0.4, cy - 30, W360 * 0.2], hyRad);
        const g1 = rotateYaw3D([s * W360 * 0.3, cy - 42, W360 * 0.24], hyRad);
        const a = smoothstepHair(-16, 16, gc.z);
        if (a > 0.02) {
          ctx.save();
          ctx.globalAlpha *= a;
          ctx.beginPath();
          ctx.moveTo(CX + g0.x, g0.y);
          ctx.quadraticCurveTo(CX + gc.x, gc.y, CX + g1.x, g1.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    if (spec.hairCombed) {
      const pLift = -hatPop * 6;
      const b0 = rotPt(-W360 * 0.2, headTop + 28);
      const bc = rotPt(-W360 * 0.24, headTop - 6 + pLift, 6);
      const b1 = rotPt(-W360 * 0.16, headTop - 36 + pLift, 8);
      const partA = smoothstepHair(-W360 * 0.18, W360 * 0.06, bc.z) * smoothstepHair(-0.08, 0.25, hyFrontVis);
      if (partA > 0.02) {
        ctx.save();
        ctx.globalAlpha *= partA;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b0.x, b0.y);
        ctx.quadraticCurveTo(bc.x, bc.y, b1.x, b1.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = hairHighlight ?? '#4a4152';
      ctx.lineWidth = 4.6;
      const combFrontFade = smoothstepHair(-0.12, 0.32, hyFrontVis);
      if (combFrontFade > 0.02) {
        for (const [ox, oy, len] of [
          [-0.1, -24, 0.5],
          [-0.12, -8, 0.56],
          [-0.15, 10, 0.5],
        ]) {
          const s0 = rotPt(W360 * ox, headTop + oy + pLift);
          const sc = rotPt(W360 * (ox + len * 0.5), headTop + oy - 14 + pLift, 8);
          const s1 = rotPt(W360 * (ox + len), headTop + oy + 12 + pLift);
          const a = combFrontFade * smoothstepHair(-24, 14, sc.z);
          if (a > 0.02) {
            ctx.save();
            ctx.globalAlpha *= a;
            ctx.beginPath();
            ctx.moveTo(s0.x, s0.y);
            ctx.quadraticCurveTo(sc.x, sc.y, s1.x, s1.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
  }
  if (hairStyle === 'curtain' || hairStyle === 'parted' || hairStyle === 'fadeCrop' || hairStyle === 'spiky' || hairStyle === 'quiff') {
    const b0 = rotateYaw3D([-W360 * 0.26, headTop + 22, -rSurf * 0.85], hyRad);
    const bc = rotateYaw3D([0, headTop + 4, -rSurf], hyRad);
    const b1 = rotateYaw3D([W360 * 0.26, headTop + 22, -rSurf * 0.85], hyRad);
    const backA = smoothstepHair(0.45, 0.1, hyFrontVis) * smoothstepHair(-W360 * 0.26, W360 * 0.04, bc.z);
    if (backA > 0.02) {
      ctx.save();
      ctx.globalAlpha *= backA;
      ctx.strokeStyle = hairHighlight ?? 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(CX + b0.x, b0.y);
      ctx.quadraticCurveTo(CX + bc.x, bc.y, CX + b1.x, b1.y);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawFrontHairStyle(ctx: Ctx, spec: CharacterSpec, W: number, headTop: number, cy: number, hatPop: number, facing = 0) {
  const { ink, hairStyle, hairColor, hairHighlight } = spec;
  if (hairStyle === 'bald') return;
  const shiftFront = Math.abs(facing) > 0.08 ? facing * W * 0.04 : 0;
  if (shiftFront !== 0) {
    ctx.save();
    ctx.translate(shiftFront, 0);
  }
  if (hairStyle === 'parted') {
    const hp = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.49, cy - 8);
      ctx.bezierCurveTo(CX - W * 0.55, headTop - 14, CX - W * 0.2, headTop - 44, CX + W * 0.16, headTop - 36);
      ctx.bezierCurveTo(CX + W * 0.46, headTop - 34, CX + W * 0.56, headTop + 4, CX + W * 0.49, cy - 18);
      ctx.quadraticCurveTo(CX + W * 0.24, headTop + 20, CX - W * 0.18, headTop + 34);
      ctx.quadraticCurveTo(CX - W * 0.42, headTop + 44, CX - W * 0.49, cy - 8);
      ctx.closePath();
    };
    inked(ctx, hp, hairColor, ink, 5.5, 3, 4);
    if (hairHighlight) {
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.46, cy - 16);
      ctx.lineTo(CX - W * 0.36, cy - 30);
      ctx.stroke();
    }
    if (spec.hairCombed) {
      // Belahan samping rapi + helai sisiran melengkung ke kanan
      ctx.save();
      hp();
      ctx.clip();
      const lift = -hatPop * 6;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.2, headTop + 30);
      ctx.quadraticCurveTo(CX - W * 0.24, headTop - 6 + lift, CX - W * 0.16, headTop - 40 + lift);
      ctx.stroke();
      ctx.strokeStyle = hairHighlight ?? '#4a4152';
      ctx.lineWidth = 4.5;
      for (const [ox, oy, len] of [
        [-0.1, -26, 0.5],
        [-0.12, -8, 0.56],
        [-0.15, 12, 0.5],
      ]) {
        ctx.beginPath();
        ctx.moveTo(CX + W * ox, headTop + oy + lift);
        ctx.quadraticCurveTo(CX + W * (ox + len * 0.5), headTop + oy - 16 + lift, CX + W * (ox + len), headTop + oy + 14 + lift);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (hairStyle === 'bun') {
    const hf = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.5, cy - 2);
      ctx.bezierCurveTo(CX - W * 0.54, headTop - 16, CX - W * 0.14, headTop - 32, CX + 6, headTop - 22);
      ctx.bezierCurveTo(CX + W * 0.36, headTop - 30, CX + W * 0.56, headTop - 6, CX + W * 0.49, cy - 10);
      ctx.quadraticCurveTo(CX + W * 0.28, headTop + 26, CX + 8, headTop + 18);
      ctx.quadraticCurveTo(CX - W * 0.24, headTop + 44, CX - W * 0.5, cy - 2);
      ctx.closePath();
    };
    inked(ctx, hf, hairColor, ink, 5, 3, 4);
  } else if (hairStyle === 'curtain') {
    const lift = -hatPop * 12;
    const hp = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.5, cy - 6);
      ctx.bezierCurveTo(CX - W * 0.58, headTop - 18, CX - W * 0.28, headTop - 54 + lift, CX + 4, headTop - 44 + lift);
      ctx.quadraticCurveTo(CX + 26, headTop - 78 + lift, CX + 64, headTop - 48 + lift);
      ctx.bezierCurveTo(CX + W * 0.54, headTop - 36, CX + W * 0.6, headTop + 2, CX + W * 0.49, cy - 12);
      ctx.quadraticCurveTo(CX + W * 0.3, headTop + 42, CX + W * 0.16, headTop + 14);
      ctx.quadraticCurveTo(CX + 6, headTop + 56, CX - 10, headTop + 16);
      ctx.quadraticCurveTo(CX - W * 0.28, headTop + 52, CX - W * 0.5, cy - 6);
      ctx.closePath();
    };
    inked(ctx, hp, hairColor, ink, 5.5, 3.5, 4.5);
  } else if (hairStyle === 'messy') {
    // Rambut mahasiswa Teknik Informatika: poni dinamis + jambul ahoge ikonik!
    const lift = -hatPop * 14;
    const hp = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.5, cy - 10);
      ctx.bezierCurveTo(CX - W * 0.56, headTop - 16, CX - W * 0.28, headTop - 44 + lift, CX - 10, headTop - 36 + lift);
      // Jambul ahoge santai di puncak rambut
      ctx.quadraticCurveTo(CX + 6, headTop - 76 + lift, CX + 44, headTop - 54 + lift);
      ctx.quadraticCurveTo(CX + 26, headTop - 42 + lift, CX + 34, headTop - 36 + lift);
      ctx.bezierCurveTo(CX + W * 0.44, headTop - 40, CX + W * 0.58, headTop - 4, CX + W * 0.5, cy - 12);
      // Poni berlayer rapi tapi sedikit acak anak ngoding
      ctx.quadraticCurveTo(CX + W * 0.34, headTop + 34, CX + W * 0.2, headTop + 14);
      ctx.quadraticCurveTo(CX + W * 0.08, headTop + 44, CX - W * 0.04, headTop + 12);
      ctx.quadraticCurveTo(CX - W * 0.22, headTop + 46, CX - W * 0.34, headTop + 18);
      ctx.quadraticCurveTo(CX - W * 0.44, headTop + 34, CX - W * 0.5, cy - 10);
      ctx.closePath();
    };
    inked(ctx, hp, hairColor, ink, 5.5, 3.5, 4.5);
    if (hairHighlight) {
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(CX - 34, headTop - 14);
      ctx.quadraticCurveTo(CX, headTop - 26, CX + 38, headTop - 10);
      ctx.stroke();
    }
  } else if (hairStyle === 'fadeCrop') {
    // Potongan rambut pendek bertekstur pria lokal: mahkota bervolume + dahi gelombang + sideburn taper
    const lift = -hatPop * 10;
    const hp = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.485, cy + 4);
      ctx.quadraticCurveTo(CX - W * 0.525, cy - 28, CX - W * 0.475, headTop + 4);
      ctx.bezierCurveTo(CX - W * 0.42, headTop - 48 + lift, CX - W * 0.08, headTop - 62 + lift, CX + W * 0.24, headTop - 50 + lift);
      ctx.bezierCurveTo(CX + W * 0.47, headTop - 38 + lift, CX + W * 0.525, headTop + 2, CX + W * 0.485, cy + 2);
      ctx.quadraticCurveTo(CX + W * 0.435, cy - 22, CX + W * 0.395, headTop + 34);
      ctx.quadraticCurveTo(CX + W * 0.22, headTop + 20, CX + W * 0.05, headTop + 27);
      ctx.quadraticCurveTo(CX - W * 0.14, headTop + 18, CX - W * 0.355, headTop + 32);
      ctx.quadraticCurveTo(CX - W * 0.43, cy - 18, CX - W * 0.485, cy + 4);
      ctx.closePath();
    };
    inked(ctx, hp, hairColor, ink, 5.2, 3, 4);
    ctx.save();
    hp();
    ctx.clip();
    ctx.strokeStyle = hairHighlight ?? '#33364a';
    ctx.lineWidth = 4.8;
    for (const [ox, oy, dx, dy] of [
      [-0.26, -16, 0.38, -8],
      [-0.1, -34, 0.36, 2],
      [-0.16, 4, 0.42, -2],
    ]) {
      ctx.beginPath();
      ctx.moveTo(CX + W * ox, headTop + oy + lift);
      ctx.quadraticCurveTo(CX + W * (ox + dx * 0.5), headTop + oy - 14 + lift, CX + W * (ox + dx), headTop + oy + dy + lift);
      ctx.stroke();
    }
    ctx.restore();
  } else if (hairStyle === 'spiky' || hairStyle === 'quiff') {
    const hp = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.48, cy - 16);
      ctx.quadraticCurveTo(CX - W * 0.54, headTop - 14, CX - W * 0.16, headTop - 44);
      ctx.lineTo(CX + W * 0.04, headTop - 62);
      ctx.lineTo(CX + W * 0.24, headTop - 36);
      ctx.quadraticCurveTo(CX + W * 0.56, headTop - 16, CX + W * 0.48, cy - 18);
      ctx.quadraticCurveTo(CX, headTop + 10, CX - W * 0.48, cy - 16);
      ctx.closePath();
    };
    inked(ctx, hp, hairColor, ink, 5, 3, 4);
  }
  if (shiftFront !== 0) {
    ctx.restore();
  }
}
