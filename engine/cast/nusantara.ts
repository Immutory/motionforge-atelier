import type { Vec3 } from '../core/easing';
import {
  computeEyeGeom,
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

export type HeadShape = 'sculpted' | 'squircle' | 'faceted' | 'round';
export type HairStyle = 'short' | 'quiff' | 'hijab' | 'curtain' | 'bun' | 'parted' | 'spiky' | 'messy' | 'fadeCrop';
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

/** 13 Preset Karakter Orisinal Ala Indonesia siap pakai di produksi mana pun (Pemeran Utama #1: Bolohoutoh alias Bang Utoh). */
export const CAST_PRESETS: Record<CastPresetId, CharacterSpec> = {
  bangUtoh: {
    id: 'bangUtoh',
    name: 'Bolohoutoh (Bang Utoh)',
    role: 'Pemeran Utama #1 · Mahasiswa S1 Teknik Informatika',
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#efc29b',
    skinShadow: '#d8aa9e',
    ink: '#1f192d',
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
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#eec39d',
    skinShadow: '#d9ae9f',
    ink: '#26182b',
    hairStyle: 'short',
    hairColor: '#261c2c',
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
    headShape: 'round',
    eyeStyle: 'lash',
    skin: '#f7d4b8',
    skinShadow: '#e3bfc4',
    ink: '#24182e',
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
    headShape: 'squircle',
    eyeStyle: 'pill',
    skin: '#e6b58c',
    skinShadow: '#cfa096',
    ink: '#1c2038',
    hairStyle: 'short',
    hairColor: '#2c2224',
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
    headShape: 'faceted',
    eyeStyle: 'sclera',
    skin: '#e7b88e',
    skinShadow: '#d1a29c',
    ink: '#211526',
    hairStyle: 'spiky',
    hairColor: '#261a28',
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
    headShape: 'round',
    eyeStyle: 'classic',
    skin: '#e6b790',
    skinShadow: '#d0a096',
    ink: '#241828',
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
    headShape: 'round',
    eyeStyle: 'lash',
    skin: '#f2caa6',
    skinShadow: '#dfb3ad',
    ink: '#281829',
    hairStyle: 'bun',
    hairColor: '#2e1d26',
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
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#f4cfa9',
    skinShadow: '#dfb8b4',
    ink: '#1e1b30',
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
    headShape: 'sculpted',
    eyeStyle: 'classic',
    skin: '#e7b98f',
    skinShadow: '#cfa096',
    ink: '#191d2d',
    hairStyle: 'short',
    hairColor: '#222430',
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
    skinShadow: '#c79385',
    ink: '#221a24',
    hairStyle: 'short',
    hairColor: '#2a242c',
    hairHighlight: '#aeb6c4',
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
    skin: '#8a5a3c',
    skinShadow: '#6a4029',
    ink: '#120c0e',
    eyeShine: true,
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
    skin: '#f0c49e',
    skinShadow: '#daa99d',
    ink: '#24182a',
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
  darkenFar = false,
) {
  const bf = buildFactors(spec);
  const { sx, sy, hx, hy, bend } = resolveRiggedTarget(
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
  const { ink, skin, outfit, outfitColor, outfitSecondary } = spec;
  const lk = bf.limb;
  const isShortSleeve = outfit === 'kotakSarung' || outfit === 'dasterCelemek' || outfit === 'seragamSma';
  const baseSleeve =
    outfit === 'coach' || outfit === 'tenun' || outfit === 'ojol'
      ? (outfitSecondary ?? outfitColor)
      : outfitColor;
  const sleeveColor = darkenFar ? darkenHex(baseSleeve, 0.14) : baseSleeve;

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
    ctx.strokeStyle = skin;
    ctx.lineWidth = 14 * lk;
    ctx.stroke();

    ctx.strokeStyle = ink;
    ctx.lineWidth = 33 * lk;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + (c1x - sx) * 0.5, sy + (c1y - sy) * 0.5, sx + (hx - sx) * 0.36 + bend * 0.22, sy + (hy - sy) * 0.36);
    ctx.stroke();
    ctx.strokeStyle = outfitColor;
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
  return { hx, hy };
}

function drawTorsoAndSkirt(
  ctx: Ctx,
  torsoTop: number,
  tw: number,
  th: number,
  isBack: boolean,
  isSide: boolean,
  spec: CharacterSpec,
) {
  const { ink, outfit, outfitColor, outfitShade, outfitSecondary, accentColor } = spec;
  const bf = buildFactors(spec);
  const w = isSide ? tw * 0.72 : tw;

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
    for (const [fx, fy] of pts) {
      const px = CX + fx * (isSide ? 0.65 : 1);
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
    ctx.restore();

    if (!isBack) {
      const apronTop = torsoTop + 150;
      const aw = isSide ? 58 : 84;
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
    const sw = isSide ? 68 : 94;
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
    ctx.fillStyle = 'rgba(28, 36, 68, 0.45)';
    for (let x = CX - 110; x <= CX + 110; x += 48) ctx.fillRect(x, sarungTop, 18, sarungH + 20);
    for (let y = sarungTop + 26; y < sarungTop + sarungH; y += 48) ctx.fillRect(CX - 120, y, 240, 14);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    for (let x = CX - 92; x <= CX + 110; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, sarungTop);
      ctx.lineTo(x, sarungTop + sarungH + 20);
      ctx.stroke();
    }
    for (let y = sarungTop + 44; y < sarungTop + sarungH; y += 48) {
      ctx.beginPath();
      ctx.moveTo(CX - 120, y);
      ctx.lineTo(CX + 120, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#b44344';
    ctx.fillRect(CX - 115, sarungTop, 230, 22);
    ctx.restore();
  }

  // Torso kapsul/jaket standar
  const bottomY = outfit === 'kotakSarung' ? sarungTop + 14 : torsoTop + th;
  const torsoPath = () => {
    ctx.beginPath();
    // Perut (build 'big'): titik kontrol bawah melebar & turun, pinggul bawah lebih lebar → siluet buncit ringan.
    const bl = bf.belly;
    const bc = 0.56 + 0.12 * bl;
    const be = 0.22 + 0.07 * bl;
    const bcy = 12 - 10 * bl;
    ctx.moveTo(CX - w * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - w * 0.62, torsoTop + th * 0.35, CX - w * bc, bottomY - bcy, CX - w * be, bottomY);
    ctx.quadraticCurveTo(CX, bottomY + 12 + 6 * bl, CX + w * be, bottomY);
    ctx.bezierCurveTo(CX + w * bc, bottomY - bcy, CX + w * 0.62, torsoTop + th * 0.35, CX + w * 0.42, torsoTop + 8);
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
    drawBatikKawung(ctx, CX - w * 0.65, torsoTop + 18, w * 1.3, th, accentColor, '#7d4d20');
    if (!isBack) {
      ctx.fillStyle = outfitShade;
      ctx.fillRect(CX - 6, torsoTop, 26, th);
      ctx.fillStyle = accentColor;
      for (const by of [torsoTop + 56, torsoTop + 106, torsoTop + 156, torsoTop + 200]) {
        ctx.beginPath();
        ctx.arc(CX + 7, by, 5, 0, TAU);
        ctx.fill();
      }
    }
  } else if (outfit === 'denim') {
    if (!isBack) {
      ctx.fillStyle = outfitSecondary ?? '#fff7ec';
      ctx.fillRect(CX - 28, torsoTop, 58, th);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.strokeRect(CX - 28, torsoTop - 4, 58, th + 8);
      ctx.strokeStyle = 'rgba(255,245,225,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeRect(CX + 40, torsoTop + 98, 32, 32);
      ctx.strokeRect(CX - 72, torsoTop + 98, 32, 32);
    } else {
      ctx.strokeStyle = 'rgba(255,245,225,0.45)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(CX - w, torsoTop + 68);
      ctx.lineTo(CX + w, torsoTop + 68);
      ctx.stroke();
    }
  } else if (outfit === 'coach') {
    ctx.fillStyle = '#fff5df';
    ctx.fillRect(CX - w, torsoTop + th - 16, w * 2, 16);
    if (!isBack) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CX + 6, torsoTop + 12);
      ctx.lineTo(CX + 6, torsoTop + th);
      ctx.stroke();
      ctx.fillStyle = '#fff5df';
      for (const by of [torsoTop + 56, torsoTop + 102, torsoTop + 148, torsoTop + 190]) {
        ctx.beginPath();
        ctx.arc(CX + 6, by, 5.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(CX - 46, torsoTop + 86, 16, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  } else if (outfit === 'tenun') {
    if (!isBack) {
      ctx.fillStyle = outfitSecondary ?? '#f7ecd6';
      ctx.beginPath();
      ctx.moveTo(CX - 32, torsoTop);
      ctx.lineTo(CX + 44, torsoTop);
      ctx.lineTo(CX + 10, torsoTop + 130);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(CX - 36, torsoTop + 6);
      ctx.lineTo(CX + 8, torsoTop + 138);
      ctx.lineTo(CX + 48, torsoTop + 6);
      ctx.stroke();
    }
    ctx.fillStyle = accentColor;
    ctx.fillRect(CX - w, torsoTop + th - 54, w * 2, 34);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(CX - w, torsoTop + th - 50, w * 2, 5);
    ctx.fillRect(CX - w, torsoTop + th - 26, w * 2, 5);
  } else if (outfit === 'kotakSarung') {
    ctx.strokeStyle = '#567eb8';
    ctx.lineWidth = 4;
    for (let x = CX - 130; x <= CX + 130; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, torsoTop);
      ctx.lineTo(x, bottomY + 12);
      ctx.stroke();
    }
    for (let y = torsoTop + 18; y < bottomY + 12; y += 32) {
      ctx.beginPath();
      ctx.moveTo(CX - 140, y);
      ctx.lineTo(CX + 140, y);
      ctx.stroke();
    }
    if (!isBack && !isSide) {
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
    if (!isBack) {
      ctx.fillStyle = '#d4dae6';
      ctx.fillRect(CX - 4, torsoTop + th - 46, 20, 12);
      if (!isSide) {
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
    if (!isBack) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(CX + 6, torsoTop);
      ctx.lineTo(CX + 6, torsoTop + th + 14);
      ctx.stroke();
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

    if (!isBack) {
      // Kantong kanguru hoodie di perut bawah
      const kw = isSide ? 42 : 66;
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
        const tx = CX + (isSide ? sx * 0.55 : sx);
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
      const lx = isSide ? CX + 10 : CX + 2;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(CX - (isSide ? 18 : 34), torsoTop + 6);
      ctx.lineTo(lx, torsoTop + 92);
      ctx.lineTo(CX + (isSide ? 24 : 38), torsoTop + 6);
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

      // Emblem kode </> kecil di dada kiri atas (rapi di antara lanyard dan tali ransel)
      if (!isSide) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        // <
        ctx.moveTo(CX + 40, torsoTop + 56);
        ctx.lineTo(CX + 32, torsoTop + 63);
        ctx.lineTo(CX + 40, torsoTop + 70);
        // >
        ctx.moveTo(CX + 48, torsoTop + 56);
        ctx.lineTo(CX + 56, torsoTop + 63);
        ctx.lineTo(CX + 48, torsoTop + 70);
        ctx.stroke();
      }

      if (spec.backpack) {
        ctx.fillStyle = '#182032';
        ctx.fillRect(CX - w * 0.43, torsoTop, 16, th - 48);
        ctx.fillRect(CX + w * 0.35, torsoTop, 16, th - 48);
      }
    }
  } else if (outfit === 'satpam') {
    // Seragam Satpam Kampung warna krem/cokelat muda: epolet bahu, saku kembar, lencana, tali kur peluit & ikat pinggang!
    const darkTrim = outfitSecondary ?? '#473426';
    // Epolet bahu cokelat tua + kancing kuningan
    ctx.fillStyle = darkTrim;
    ctx.fillRect(CX - w * 0.56, torsoTop, w * 0.34, 24);
    ctx.fillRect(CX + w * 0.22, torsoTop, w * 0.34, 24);
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(CX - w * 0.27, torsoTop + 12, 5.5, 0, TAU);
    ctx.arc(CX + w * 0.27, torsoTop + 12, 5.5, 0, TAU);
    ctx.fill();

    // Sabuk keamanan hitam-cokelat + kepala sabuk kuningan di pinggang
    ctx.fillStyle = '#251e1c';
    ctx.fillRect(CX - w, torsoTop + th - 48, w * 2, 24);
    if (!isBack) {
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(CX - 16, torsoTop + th - 45, 32, 18, 4);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Garis kancing tengah kemeja satpam
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

      if (!isSide) {
        // Saku dada kiri & kanan dengan penutup segitiga + name tag & lencana satpam
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
        // Name tag hitam di atas saku kanan
        ctx.fillStyle = '#1f232c';
        ctx.fillRect(CX - 70, torsoTop + 46, 42, 11);
        ctx.fillStyle = '#fff5df';
        ctx.fillRect(CX - 64, torsoTop + 50, 30, 3);

        // Lencana perisai emas keamanan di saku kiri
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(CX + 49, torsoTop + 78);
        ctx.lineTo(CX + 61, torsoTop + 83);
        ctx.lineTo(CX + 58, torsoTop + 98);
        ctx.lineTo(CX + 49, torsoTop + 104);
        ctx.lineTo(CX + 40, torsoTop + 98);
        ctx.lineTo(CX + 37, torsoTop + 83);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Tali kur peluit putih melengkung dari bahu kanan ke saku kanan
        ctx.strokeStyle = '#f8f4e8';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(CX - w * 0.44, torsoTop + 20);
        ctx.quadraticCurveTo(CX - 56, torsoTop + 92, CX - 48, torsoTop + 66);
        ctx.stroke();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  } else if (outfit === 'pedagangApron') {
    // Kemeja pedagang bersih + celemek masak full-bib (Tio Bakmie Ayam)
    const apronCol = outfitSecondary ?? '#a62828';
    if (!isBack) {
      const ak = bf.apron;
      // Tali leher celemek
      ctx.strokeStyle = apronCol;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(CX - 36, torsoTop + 4);
      ctx.lineTo(CX - 48 * ak, torsoTop + 58);
      ctx.moveTo(CX + 36, torsoTop + 4);
      ctx.lineTo(CX + 48 * ak, torsoTop + 58);
      ctx.stroke();

      // Badan celemek bib depan rapi
      const aw = (isSide ? 48 : 74) * ak;
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

      // List emas/krem di pinggir atas bib & kantong depan celemek
      ctx.fillStyle = accentColor;
      ctx.fillRect(CX - aw * 0.64, torsoTop + 58, aw * 1.28, 7);
      const pw = (isSide ? 32 : 52) * ak;
      ctx.fillStyle = '#fff5e0';
      ctx.beginPath();
      ctx.roundRect(CX - pw, torsoTop + 144, pw * 2, 54, 10);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.8;
      ctx.stroke();
      ctx.fillStyle = accentColor;
      ctx.fillRect(CX - pw + 4, torsoTop + 148, pw * 2 - 8, 9);
    } else {
      // Tali silang & ikatan celemek di punggung
      ctx.strokeStyle = apronCol;
      ctx.lineWidth = 12;
      ctx.beginPath();
      const ak = bf.apron;
      ctx.moveTo(CX - 42 * ak, torsoTop + 8);
      ctx.lineTo(CX + 42 * ak, torsoTop + 130);
      ctx.moveTo(CX + 42 * ak, torsoTop + 8);
      ctx.lineTo(CX - 42 * ak, torsoTop + 130);
      ctx.moveTo(CX - w * 0.52, torsoTop + 138);
      ctx.lineTo(CX + w * 0.52, torsoTop + 138);
      ctx.stroke();
    }
  } else if (outfit === 'lokalKnit') {
    // Gaya kasual lokal Ebot sesuai foto: kaos crew-neck cokelat-kopi tua + outer cardigan rajut kerah rib earth-tone!
    const innerTee = outfitSecondary ?? '#594742';
    ctx.fillStyle = outfitShade;
    ctx.fillRect(CX - w, torsoTop + th - 22, w * 2, 28);
    if (!isBack) {
      const openW = isSide ? 24 : 38;
      // Panel kaos dalam crew-neck cokelat hangat
      ctx.fillStyle = innerTee;
      ctx.beginPath();
      ctx.moveTo(CX - openW, torsoTop);
      ctx.lineTo(CX + openW, torsoTop);
      ctx.lineTo(CX + openW * 0.82, torsoTop + th - 20);
      ctx.lineTo(CX - openW * 0.82, torsoTop + th - 20);
      ctx.closePath();
      ctx.fill();

      // Garis kerah crew-neck kaos dalam
      ctx.strokeStyle = '#433430';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(CX - openW * 0.88, torsoTop + 10);
      ctx.quadraticCurveTo(CX, torsoTop + 28, CX + openW * 0.88, torsoTop + 10);
      ctx.stroke();

      // Pita kerah rajut rib (ribbed shawl collar) memanjang dari bahu ke bawah seperti di foto Ebot!
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

        // Tekstur garis rajut rib halus seperti di kerah foto asli
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

      // Saku samping kasual rapi
      if (!isSide) {
        for (const s of [-1, 1]) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.moveTo(CX + s * 64, torsoTop + 134);
          ctx.lineTo(CX + s * 78, torsoTop + 178);
          ctx.stroke();
        }
      }
    } else {
      // Jahitan yoke bahu belakang cardigan rajut
      ctx.strokeStyle = 'rgba(64, 48, 36, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CX - w, torsoTop + 56);
      ctx.quadraticCurveTo(CX, torsoTop + 68, CX + w, torsoTop + 56);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Kerah depan / tudung hoodie
  if (!isBack && (outfit === 'batik' || outfit === 'kotakSarung' || outfit === 'seragamSma' || outfit === 'satpam' || outfit === 'pedagangApron')) {
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
  } else if (outfit === 'ojol') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(CX - 58, torsoTop - 4, 116, 25, 10);
      },
      outfitSecondary ?? '#232838',
      ink,
      4.5,
      2,
      3,
    );
  } else if (outfit === 'hoodieTech') {
    // Tudung hoodie melingkar tebal di leher (depan maupun belakang!)
    inked(
      ctx,
      () => {
        ctx.beginPath();
        if (isBack) {
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

  // Ransel penuh di tampilan belakang (`view === 'back'`)!
  if (isBack && spec.backpack) {
    const bpCol = spec.backpackColor ?? '#d64545';
    const bpPocket = spec.backpackColor ? '#1c2538' : '#b53434';
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(CX - 82, torsoTop + 28, 164, 174, 28);
      },
      bpCol,
      ink,
      5.5,
      3.5,
      5,
    );
    ctx.fillStyle = bpPocket;
    ctx.beginPath();
    ctx.roundRect(CX - 62, torsoTop + 118, 124, 60, 14);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (outfit === 'hoodieTech') {
      // Aksen garis reflektor cyan di ransel laptop Bang Utoh
      ctx.fillStyle = accentColor;
      ctx.fillRect(CX - 54, torsoTop + 102, 108, 8);
    }
  }
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
) {
  const { ink, headgear, headgearColor, headgearAccent } = spec;
  if (headgear === 'none') return;

  if (headgear === 'peci') {
    const col = headgearColor ?? '#231e2f';
    ctx.save();
    ctx.translate(CX, headTop + 26 - pop * 46);
    ctx.rotate(pop > 0.2 ? -0.14 * pop : -0.05);
    const p = () => {
      ctx.beginPath();
      ctx.moveTo(-124, 18);
      ctx.lineTo(-110, -76);
      ctx.quadraticCurveTo(0, -96, 110, -76);
      ctx.lineTo(124, 18);
      ctx.quadraticCurveTo(0, 34, -124, 18);
      ctx.closePath();
    };
    const pg = ctx.createLinearGradient(-110, -80, 110, 20);
    pg.addColorStop(0, '#3c3550');
    pg.addColorStop(0.45, col);
    pg.addColorStop(1, '#161220');
    inked(ctx, p, pg, ink, 5.5, 3, 4.5);
    ctx.strokeStyle = headgearAccent ?? '#ebb44c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-116, 10);
    ctx.quadraticCurveTo(0, 24, 116, 10);
    ctx.stroke();
    ctx.restore();
  } else if (headgear === 'cap') {
    const col = headgearColor ?? '#249464';
    const front = headgearAccent ?? '#fff2d4';
    ctx.save();
    ctx.translate(CX, headTop + 34 - pop * 44);
    ctx.rotate(pop > 0.2 ? 0.14 * pop : 0.04);
    const brimDir = isBack ? (headFacing >= 0 ? 1 : -1) : -1;
    const brim = () => {
      ctx.beginPath();
      ctx.moveTo(brimDir * 124, 2);
      ctx.quadraticCurveTo(brimDir * 204, 10, brimDir * 194, 26);
      ctx.quadraticCurveTo(brimDir * 148, 32, brimDir * 102, 18);
      ctx.closePath();
    };
    const brimColor = col === '#249464' ? '#19704c' : col;
    inked(ctx, brim, brimColor, ink, 5, 2.5, 3.5);
    const crown = () => {
      ctx.beginPath();
      ctx.moveTo(-140, 10);
      ctx.bezierCurveTo(-144, -64, -76, -86, 0, -84);
      ctx.bezierCurveTo(78, -86, 144, -62, 140, 10);
      ctx.quadraticCurveTo(0, 26, -140, 10);
      ctx.closePath();
    };
    inked(ctx, crown, col, ink, 5.5, 3.5, 4.5);
    if (!isBack) {
      ctx.save();
      crown();
      ctx.clip();
      ctx.fillStyle = front;
      ctx.beginPath();
      ctx.ellipse(26, -24, 68, 72, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -88, 12, 0, TAU); }, '#f2c144', ink, 4, 1.5, 2);
    ctx.restore();
  } else if (headgear === 'iket') {
    const col = headgearColor ?? '#a32e35';
    const gold = headgearAccent ?? '#f2c14e';
    ctx.save();
    ctx.translate(0, -pop * 18);
    const wing = () => {
      ctx.beginPath();
      ctx.moveTo(CX + 26, headTop + 8);
      ctx.lineTo(CX + 114, headTop - 52);
      ctx.lineTo(CX + 122, headTop + 16);
      ctx.closePath();
    };
    inked(ctx, wing, col, ink, 5, 2.5, 3.5);
    const band = () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.52, headTop + 44);
      ctx.quadraticCurveTo(CX, headTop + 14, CX + W * 0.52, headTop + 40);
      ctx.lineTo(CX + W * 0.5, headTop - 4);
      ctx.quadraticCurveTo(CX, headTop - 24, CX - W * 0.5, headTop);
      ctx.closePath();
    };
    inked(ctx, band, col, ink, 5.5, 3, 4.5);
    ctx.save();
    band();
    ctx.clip();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let x = CX - 130; x <= CX + 130; x += 32) {
      ctx.moveTo(x, headTop - 16);
      ctx.lineTo(x + 16, headTop + 16);
      ctx.lineTo(x, headTop + 44);
    }
    ctx.stroke();
    ctx.restore();
    if (!isBack) {
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX + 4, headTop - 6, 36, 40, 12); }, '#b8373d', ink, 4.5, 2, 3);
    }
    ctx.restore();
  } else if (headgear === 'helmet') {
    const col = headgearColor ?? '#19ab58';
    const dark = headgearAccent ?? '#232838';
    ctx.save();
    ctx.translate(CX, cy - pop * 36);
    ctx.rotate(pop > 0.2 ? -0.1 * pop : 0);
    const helm = () => {
      ctx.beginPath();
      if (isBack && !isBack34) {
        ctx.arc(0, -14, 148, 0, TAU);
      } else if (isBack34) {
        // Bukaan sisi pipi halus pada tampak backThreeQuarter agar arah pandang & pipi tidak tertutup total
        const bDir = headFacing >= 0 ? 1 : -1;
        ctx.moveTo(bDir * 116, 62);
        ctx.quadraticCurveTo(bDir * 94, 4, bDir * 124, -42);
        ctx.bezierCurveTo(bDir * 136, -124, bDir * 52, -162, 0, -162);
        ctx.bezierCurveTo(-bDir * 96, -162, -bDir * 156, -86, -bDir * 148, 8);
        ctx.bezierCurveTo(-bDir * 142, 98, -bDir * 64, 134, 0, 134);
        ctx.bezierCurveTo(bDir * 52, 134, bDir * 96, 108, bDir * 116, 62);
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
    const hg = ctx.createLinearGradient(-140, -150, 140, 30);
    hg.addColorStop(0, '#23c266');
    hg.addColorStop(0.55, col);
    hg.addColorStop(1, '#128243');
    inked(ctx, helm, hg, ink, 5.5, 3.5, 5);
    ctx.save();
    helm();
    ctx.clip();
    ctx.fillStyle = dark;
    ctx.fillRect(-18, -160, 36, isBack ? 320 : 95);
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.beginPath();
    ctx.ellipse(-62, -106, 32, 14, -0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (!isBack) {
      const visor = () => {
        ctx.beginPath();
        ctx.moveTo(-132, -32);
        ctx.quadraticCurveTo(0, -56, 132, -32);
        ctx.quadraticCurveTo(138, -74, 110, -96);
        ctx.quadraticCurveTo(0, -116, -110, -96);
        ctx.quadraticCurveTo(-138, -74, -132, -32);
        ctx.closePath();
      };
      ctx.fillStyle = 'rgba(135, 206, 250, 0.45)';
      visor();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      for (const sx of [-130, 130]) {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(sx, -24, 11, 0, TAU); }, dark, ink, 3.5, 1, 2);
      }
    }
    ctx.restore();
  } else if (headgear === 'headphones') {
    // Headphone over-ear studio khas mahasiswa Teknik Informatika (ikut loncat saat shock!)
    const col = headgearColor ?? '#1f2638';
    const led = headgearAccent ?? '#38bdf8';
    ctx.save();
    ctx.translate(CX, cy - pop * 48);
    ctx.rotate(pop > 0.2 ? -0.1 * pop : 0);

    // Band melengkung atas
    ctx.strokeStyle = ink;
    ctx.lineWidth = 27;
    ctx.beginPath();
    ctx.arc(0, 6, W * 0.56, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 15;
    ctx.stroke();
    // Bantalan empuk bagian atas headband
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 6, W * 0.56, Math.PI * 1.32, Math.PI * 1.68);
    ctx.stroke();

    // Kedua earcup kiri & kanan dengan aksen cincin LED cyan
    for (const s of [-1, 1]) {
      const ex = s * (W * 0.52);
      const ey = 14;
      // Bantalan busa dalam
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(ex - (s > 0 ? 16 : 6), ey - 38, 22, 76, 10);
        },
        '#334155',
        ink,
        4,
        1.5,
        2.5,
      );
      // Cangkang luar earcup
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(ex - (s > 0 ? 2 : 28), ey - 42, 30, 84, 13);
        },
        col,
        ink,
        4.5,
        2,
        3,
      );
      // Garis LED cyan & aksen oranye kecil
      ctx.fillStyle = led;
      ctx.beginPath();
      ctx.roundRect(ex + (s > 0 ? 9 : -19), ey - 24, 10, 48, 5);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(ex + (s > 0 ? 14 : -14), ey + 18, 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  } else if (headgear === 'satpamCap') {
    // Topi pet petugas keamanan / satpam kampung dengan visor hitam, pita emas & emblem perisai!
    const col = headgearColor ?? '#473426';
    const gold = headgearAccent ?? '#f2c144';
    ctx.save();
    ctx.translate(CX, headTop + 30 - pop * 46);
    ctx.rotate(pop > 0.2 ? -0.12 * pop : -0.03);
    // Mahkota topi pet melebar rapi di atas
    const crown = () => {
      ctx.beginPath();
      ctx.moveTo(-124, 6);
      ctx.lineTo(-148, -56);
      ctx.quadraticCurveTo(0, -92, 148, -56);
      ctx.lineTo(124, 6);
      ctx.quadraticCurveTo(0, 22, -124, 6);
      ctx.closePath();
    };
    inked(ctx, crown, col, ink, 5.5, 3, 4.5);
    // Pita dasar topi cokelat gelap + tali emas
    const band = () => {
      ctx.beginPath();
      ctx.moveTo(-126, 8);
      ctx.quadraticCurveTo(0, 24, 126, 8);
      ctx.lineTo(122, -20);
      ctx.quadraticCurveTo(0, -8, -122, -20);
      ctx.closePath();
    };
    inked(ctx, band, '#241b17', ink, 4.5, 2, 3);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-118, -4);
    ctx.quadraticCurveTo(0, 10, 118, -4);
    ctx.stroke();
    // Visor depan hitam mengkilap (mengarah ke depan bila bukan tampilan belakang)
    if (!isBack) {
      const visor = () => {
        ctx.beginPath();
        ctx.moveTo(-114, 10);
        ctx.quadraticCurveTo(0, 44, 114, 10);
        ctx.quadraticCurveTo(0, 24, -114, 10);
        ctx.closePath();
      };
      inked(ctx, visor, '#1b1d24', ink, 4.5, 2, 3);
      // Emblem perisai emas keamanan di tengah mahkota depan
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(0, -64);
          ctx.lineTo(22, -52);
          ctx.lineTo(16, -24);
          ctx.lineTo(0, -14);
          ctx.lineTo(-16, -24);
          ctx.lineTo(-22, -52);
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
      ctx.arc(0, -40, 6.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Tata letak kanvas aktor (dipakai drawActor & helper verifikasi tangan/wajah agar selalu identik). */
function actorLayout(spec: CharacterSpec, pose: ActorPose) {
  const view: ActorView = pose.view ?? 'threeQuarter';
  const stance: ActorStance = pose.stance ?? 'stand';
  const isBack34 = view === 'backThreeQuarter';
  const isBack = view === 'back' || isBack34;
  const isSide = view === 'side';
  const isWalk = stance === 'walk';

  const fSign = (pose.facing ?? 1) >= 0 ? 1 : -1;
  const facing =
    view === 'front'
      ? (pose.facing ?? 0)
      : isSide
        ? fSign * 0.85
        : isBack34
          ? fSign * 0.72
          : (pose.facing ?? (pose.face === 'shock' ? 0.08 : 0.34));

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
  // terendah di Down (u ≈ 0.125/0.625, +14px), naik mantap di Passing (u ≈ 0.25/0.75, -4px), puncak bounce di Up (u ≈ 0.375/0.875, -22px -> 36px p-p ≈ 4.3% tinggi!).
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
  // Siklus torso lean saat walk ala (1).mp4: condong dinamis 3.4°..9.0° ke arah jalan + head counter-lag lembut!
  const lean =
    pose.lean !== undefined
      ? pose.lean
      : isWalk
        ? travelDir * (6.2 + 2.8 * Math.cos(ph * 2)) * strideBlend
        : pose.face === 'shock'
          ? -4.5
          : 1.2;
  const headTilt =
    pose.headTilt !== undefined
      ? pose.headTilt
      : isWalk
        ? -travelDir * 2.4 * Math.sin(ph * 2) * strideBlend
        : 0;

  const headTop = 192 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const bf = buildFactors(spec);
  const tw = (spec.headShape === 'squircle' ? 220 : spec.outfit === 'kotakSarung' ? 222 : 196) * bf.torso;
  const hipY = torsoTop + th - 12;
  return {
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
 * `rawX`/`rawY` = sebelum `lean` (ruang yang sama dengan `HandRig.reach` & `actorFaceAnchors`).
 */
export function actorHandPoint(
  actor: CastPresetId | CharacterSpec,
  pose: ActorPose,
  side: -1 | 1,
  overrides?: Partial<CharacterSpec>,
): { x: number; y: number; rawX: number; rawY: number; arm: ArmPose } {
  const spec = resolveActorSpec(actor, overrides);
  const L = actorLayout(spec, pose);
  const armPose: ArmPose =
    (side < 0 ? pose.leftArm : pose.rightArm) ??
    (pose.face === 'shock' ? 'raise' : (side < 0 ? pose.leftProp : pose.rightProp) && (side < 0 ? pose.leftProp : pose.rightProp) !== 'none' ? 'hold' : 'rest');
  const rig = side < 0 ? pose.leftHand : pose.rightHand;
  const { hx, hy } = resolveRiggedTarget(
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
  const a = (L.lean * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = hx - CX;
  const dy = hy - L.hipY;
  return { x: CX + dx * c - dy * s, y: L.hipY + dx * s + dy * c, rawX: hx, rawY: hy, arm: armPose };
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
 * Helper resmi 2,5D (Atelier v3.0): memetakan arah hadap dunia aktor terhadap posisi kamera aktif
 * menjadi sudut 8-arah mulus (`front`, `threeQuarter`, `side`, `backThreeQuarter`, `back`) beserta nilai `facing`.
 * `forwardOrYaw` dapat berupa vektor `Vec3` menghadap depan atau sudut `yaw` derajat (`0° = +Z`, `+90° = +X`).
 */
export function resolve25DView(
  actorPos: Vec3,
  forwardOrYaw: Vec3 | number,
  camPos: Vec3,
): { view: ActorView; facing: number; angleDeg: number } {
  const fwd: Vec3 =
    typeof forwardOrYaw === 'number'
      ? [Math.sin((forwardOrYaw * Math.PI) / 180), 0, Math.cos((forwardOrYaw * Math.PI) / 180)]
      : forwardOrYaw;
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
  if (angleDeg < 32) {
    return { view: 'front', facing: Math.max(-0.45, Math.min(0.45, side * 1.6)), angleDeg };
  }
  if (angleDeg < 72) {
    return { view: 'threeQuarter', facing: Math.min(0.75, 0.34 + Math.abs(side) * 0.42) * sign, angleDeg };
  }
  if (angleDeg < 112) {
    return { view: 'side', facing: 0.85 * sign, angleDeg };
  }
  if (angleDeg < 148) {
    return { view: 'backThreeQuarter', facing: 0.72 * sign, angleDeg };
  }
  return { view: 'back', facing: 0.35 * sign, angleDeg };
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
    leftArm: opts?.leftArmOverride ?? 'rest',
    rightArm: opts?.rightArmOverride ?? 'rest',
  };
}

/**
 * Jembatan Hybrid 2D-Hand → 3D-Prop (Atelier v3.0): mengonversi koordinat tangan kanvas 2D (`actorHandPoint`)
 * menjadi posisi dunia 3D (`Vec3`) tepat di ujung tangan aktor, memperhitungkan `yaw`, `seatRadius`, dan `tiltX`.
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
  const lz0 = opts?.forwardOffset ?? 0.02;

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
 */
export function drawActor(ctx: Ctx, actor: CastPresetId | CharacterSpec, pose: ActorPose, overrides?: Partial<CharacterSpec>) {
  const spec = resolveActorSpec(actor, overrides);
  const { ink, skin, skinShadow, hairStyle, hairColor, hairHighlight, pantsColor } = spec;
  const L = actorLayout(spec, pose);
  const { view, stance, isBack, isBack34, isSide, isWalk, facing, travelDir, strideBlend, ph, swing, lean, headTilt, W, H, headTop, cy, chin, torsoTop, tw, hipY } = L;
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

  ctx.clearRect(0, 0, ACTOR_W, ACTOR_H);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- 1. KAKI (mendukung stand, walk, sit, sitCross/bersila, jump & side profile) ---
  const isSkirted = spec.outfit === 'kotakSarung' || spec.outfit === 'dasterCelemek';
  // Urutan render kaki: pada tampak samping / 3-4, kaki jauh (*far leg*) digambar LEBIH DULU dengan warna digelapkan 16%
  // agar siluet langkah 2D terbaca jernih (tidak menyatu seperti gunting).
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

        // Hybrid 2-Bone Analytic Leg IK + Organic Curved Cartoon Spline ala referensi (1).mp4:
        // Solver IK menghitung posisi lutut fisik yang akurat (kaki tumpu tegak saat Passing, kaki ayun menekuk tajam),
        // lalu dirender sebagai kurva Bezier lembut melalui lutut (TANPA sudut tajam kaku '<' seperti robot!).
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

  // --- 2. ELEMEN BELAKANG (cepol rambut Bu Siti / ransel Raka di tampak depan) ---
  if (hairStyle === 'bun' && !isBack) {
    if (headTilt !== 0) {
      ctx.save();
      ctx.translate(CX, chin - 4);
      ctx.rotate((headTilt * Math.PI) / 180);
      ctx.translate(-CX, -(chin - 4));
    }
    const bunY = headTop - 36 - hatPop * 10;
    inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 10, bunY, 44, 0, TAU); }, hairColor, ink, 5.5, 3, 4);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX - 44, bunY + 20, 68, 16, 8); }, '#e04848', ink, 4, 2, 2.5);
    if (headTilt !== 0) ctx.restore();
  }
  if (spec.backpack && !isBack) {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(CX - (isSide ? 108 : 118), torsoTop + 24, 90, 158, 28);
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
  const leftHandPt = drawArm(ctx, -1, leftArm, leftProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.leftHand, view, travelDir, isSideOr34);

  // --- 4. TORSO & BAWAHAN (Sarung / Daster / Batik / Denim / Ojol / SMA / Tenun) ---
  drawTorsoAndSkirt(ctx, torsoTop, tw, th, isBack, isSide, spec);

  // --- 5. LENGAN KANAN (depan) ---
  const rightHandPt = drawArm(ctx, 1, rightArm, rightProp, torsoTop, tw, swing, isWalk, isSide, spec, pose.rightHand, view, travelDir, false);

  // Menoleh ke belakang (kepala saja): badan, lengan & langkah tetap mengikuti `facing`.
  const headFacing = headFacingOf(pose, isSide, facing);

  // --- 6. KEPALA, RAMBUT / HIJAB, WAJAH, KACAMATA, KUMIS, HEADGEAR ---
  // Kemiringan kepala independen (`headTilt`, pivot di pangkal leher) untuk ekspresi bertanya/deadpan/heran.
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
    ctx.strokeStyle = 'rgba(24, 58, 56, 0.35)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(CX - 94, torsoTop + 26);
    ctx.quadraticCurveTo(CX - 12, torsoTop + 72, CX + 98, torsoTop + 34);
    ctx.moveTo(CX - 76, torsoTop + 56);
    ctx.quadraticCurveTo(CX + 4, torsoTop + 86, CX + 82, torsoTop + 62);
    ctx.stroke();
    ctx.restore();

    if (!isBack) {
      const fx = CX + headFacing * 12;
      ctx.fillStyle = '#f7ead6';
      ctx.beginPath();
      ctx.ellipse(CX + headFacing * 8, cy + 4, W * 0.47, H * 0.47, 0, 0, TAU);
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
      ctx.ellipse(fx, cy + 10, W * 0.44, H * 0.44, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.stroke();
    } else if (isBack34) {
      // Intipan sisi pipi di tepi hijab saat tampak backThreeQuarter
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
    // Telinga (tertutup helm atau earcup headphone saat dipakai normal)
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
      const earX = isBack ? CX - W * 0.48 : CX + earSide * W * 0.49;
      drawOneEar(earX, -0.12, -earSide);
      // Tampak depan / 3-4 halus untuk earDetail menampilkan sedikit telinga sisi jauh agar siluet wajah bulat proporsional
      if (!isBack && !isSide && spec.earDetail && Math.abs(headFacing) < 0.55) {
        const farEarX = CX - earSide * W * 0.475;
        inked(ctx, () => { ctx.beginPath(); ctx.ellipse(farEarX, cy + 14, 13, 21, 0.12 * -earSide, 0, TAU); }, spec.skinShadow, ink, 4.2, 1.5, 2.5);
      }
      if (isBack) {
        drawOneEar(CX + W * 0.48, 0.12, -1);
      }
      if (spec.earrings) {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(earX, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
        if (isBack) {
          inked(ctx, () => { ctx.beginPath(); ctx.arc(CX + W * 0.48, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
        }
      }
    }

    // Bentuk kepala modular
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
    if (!isBack && spec.skinHighlight) {
      skG.addColorStop(0, spec.skinHighlight);
      skG.addColorStop(0.46, skin);
      skG.addColorStop(1, skinShadow);
    } else {
      skG.addColorStop(0, isBack ? hairColor : skin);
      skG.addColorStop(0.58, isBack ? hairColor : skin);
      skG.addColorStop(1, isBack ? hairColor : skinShadow);
    }
    inked(ctx, headPath, skG, ink, 5.5, 3.5, 5.5);

    if (isBack) {
      // Tampak belakang kepala (termasuk backThreeQuarter): kulit tengkuk bawah + rambut/cepol
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = skinShadow;
      ctx.fillRect(CX - W, chin - 44, W * 2, 54);
      if (hairStyle === 'fadeCrop') {
        // Gradasi taper fade pendek rapi di tengkuk bawah khas barbershop lokal
        const fg = ctx.createLinearGradient(0, chin - 78, 0, chin - 28);
        fg.addColorStop(0, hairColor);
        fg.addColorStop(0.55, 'rgba(54, 42, 44, 0.55)');
        fg.addColorStop(1, skinShadow);
        ctx.fillStyle = fg;
        ctx.fillRect(CX - W, chin - 78, W * 2, 54);
      }
      if (isBack34) {
        // Tampak belakang 3/4 (backThreeQuarter): sisi pipi dilukis DI ATAS tengkuk & fadeCrop agar tidak tertimpa
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
      if (hairStyle === 'bun') {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(CX, headTop - 16, 48, 0, TAU); }, hairColor, ink, 5.5, 3, 4);
        inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX - 34, headTop + 20, 68, 16, 8); }, '#e04848', ink, 4, 2, 2.5);
      } else if (hairStyle === 'messy') {
        const lift = -hatPop * 14;
        const ahoge = () => {
          ctx.beginPath();
          ctx.moveTo(CX - 14, headTop + 2 + lift);
          ctx.quadraticCurveTo(CX - 6, headTop - 42 + lift, CX - 42, headTop - 22 + lift);
          ctx.quadraticCurveTo(CX - 20, headTop - 8 + lift, CX + 12, headTop + 4 + lift);
          ctx.closePath();
        };
        inked(ctx, ahoge, hairColor, ink, 4.5, 2, 3);
      } else if (hairStyle === 'spiky' || hairStyle === 'quiff') {
        const backSpike = () => {
          ctx.beginPath();
          ctx.moveTo(CX - 46, headTop + 14);
          ctx.lineTo(CX - 12, headTop - 36);
          ctx.lineTo(CX + 18, headTop - 22);
          ctx.lineTo(CX + 46, headTop + 14);
          ctx.closePath();
        };
        inked(ctx, backSpike, hairColor, ink, 4.5, 2, 3);
      } else if (hairStyle === 'curtain' || hairStyle === 'parted' || hairStyle === 'fadeCrop') {
        // Siluet rambut belakang dengan garis belahan/kilau halus agar tampak belakang kaya dimensi
        ctx.strokeStyle = hairHighlight ?? 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(CX - W * 0.28, headTop + 34);
        ctx.quadraticCurveTo(CX, headTop + 14, CX + W * 0.28, headTop + 34);
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
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
    }
  }

  // Tali dagu helm (Ojol)
  if (!isBack && spec.headgear === 'helmet') {
    ctx.strokeStyle = spec.headgearAccent ?? '#232838';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.44, cy + 36);
    ctx.quadraticCurveTo(CX, chin + 8, CX + W * 0.44, cy + 36);
    ctx.stroke();
  }

  // --- 7. FITUR WAJAH (13 ekspresi + auto lip-sync + kacamata + kumis) ---
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
        // Kacamata kotak tipis anti-radiasi anak Teknik Informatika
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
          // Pantulan layar tipis diagonal di lensa
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
        ctx.stroke();
      } else if (spec.glassesStyle === 'thick') {
        // Kacamata bingkai tebal gelap (pedagang): lensa kotak-bulat, bingkai bertepi ink + kilau tipis agar
        // tetap terbaca di kulit gelap & adegan malam. Ikut terangkat (hatPop) saat kaget.
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
        // Jembatan hidung & gagang samping
        const bridge = () => {
          ctx.beginPath();
          ctx.moveTo(ex(-1) + (gw * lensScaleX(-1)) / 2 - 2, eyeY - 8);
          ctx.quadraticCurveTo(CX + shift, eyeY - 15, ex(1) - (gw * lensScaleX(1)) / 2 + 2, eyeY - 8);
          const far = headFacing >= 0 ? -1 : 1;
          ctx.moveTo(ex(far) + far * ((gw * lensScaleX(far)) / 2), eyeY - 10);
          ctx.lineTo(CX + far * W * 0.47, eyeY - 14);
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
        // Kilau bingkai atas + pantulan lensa
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

    // Rambut depan (di atas wajah)
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
        // Belahan samping rapi + helai sisiran melengkung ke kanan (rambut terbaca sebagai rambut, bukan kupluk)
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
      // Potongan rambut pendek bertekstur pria lokal sesuai foto Ebot:
      // atas hitam tebal bervolume lembut menyapu ke kanan + garis rambut dahi organik + sideburn taper rapi bersih!
      const lift = -hatPop * 10;
      const hp = () => {
        ctx.beginPath();
        // Jambang/sideburn pendek meruncing bersih di depan telinga kiri
        ctx.moveTo(CX - W * 0.485, cy + 4);
        ctx.quadraticCurveTo(CX - W * 0.525, cy - 28, CX - W * 0.475, headTop + 4);
        // Mahkota atas penuh bervolume lembut menyapu alami dari kiri ke kanan (persis siluet foto Ebot)
        ctx.bezierCurveTo(CX - W * 0.42, headTop - 48 + lift, CX - W * 0.08, headTop - 62 + lift, CX + W * 0.24, headTop - 50 + lift);
        ctx.bezierCurveTo(CX + W * 0.47, headTop - 38 + lift, CX + W * 0.525, headTop + 2, CX + W * 0.485, cy + 2);
        // Masuk dari jambang kanan naik ke garis rambut dahi dengan sedikit lekuk tekstur gelombang natural
        ctx.quadraticCurveTo(CX + W * 0.435, cy - 22, CX + W * 0.395, headTop + 34);
        ctx.quadraticCurveTo(CX + W * 0.22, headTop + 20, CX + W * 0.05, headTop + 27);
        ctx.quadraticCurveTo(CX - W * 0.14, headTop + 18, CX - W * 0.355, headTop + 32);
        ctx.quadraticCurveTo(CX - W * 0.43, cy - 18, CX - W * 0.485, cy + 4);
        ctx.closePath();
      };
      inked(ctx, hp, hairColor, ink, 5.2, 3, 4);

      // Tekstur helai gelombang pendek di mahkota rambut agar hidup seperti foto asli
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

    if (hairStyle === 'hijab') {
      inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 54, chin + 8, 7.5, 0, TAU); }, '#f5c43d', ink, 3, 1, 1.5);
    }
  }

  // --- 8. HEADGEAR (Peci / Cap / Iket / Helmet) ---
  drawHeadgear(ctx, spec, W, headTop, cy, hatPop, isBack, isBack34, headFacing);

  // --- 9. EFEK KOMIK 2D (ikut kemiringan kepala) ---
  const fx = pose.fx !== undefined ? pose.fx : isBack ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, CX, headTop - (spec.headgear !== 'none' ? 38 : 10), W, ink);

  if (headTilt !== 0) {
    ctx.restore();
  }

  // --- 8b. TANGAN + PROP DI DEPAN WAJAH (ruang torso, gelas di hidung/bibir) ---
  if (pose.leftHand?.front) drawHandAndProp(ctx, -1, leftArm, leftProp, leftHandPt.hx, leftHandPt.hy, lk, spec, pose.leftHand);
  if (pose.rightHand?.front) drawHandAndProp(ctx, 1, rightArm, rightProp, rightHandPt.hx, rightHandPt.hy, lk, spec, pose.rightHand);

  ctx.restore();
}
