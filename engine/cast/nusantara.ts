import {
  drawComicFx,
  drawFaceFeatures,
  type ComicFx,
  type Expression,
  type EyeStyle,
} from './expressions';
import type { TalkSample } from './lipsync';
import { drawHandProp, type HandProp } from './props2d';

export type HeadShape = 'sculpted' | 'squircle' | 'faceted' | 'round';
export type HairStyle = 'short' | 'quiff' | 'hijab' | 'curtain' | 'bun' | 'parted' | 'spiky' | 'messy';
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
  | 'casual';
export type ShoeStyle = 'loafer' | 'sneaker' | 'sandal' | 'boot';
export type ArmPose = 'rest' | 'hip' | 'point' | 'raise' | 'hold' | 'wave' | 'cross';
export type ActorStance = 'stand' | 'walk' | 'sit' | 'sitCross' | 'squat' | 'jump';
export type ActorView = 'front' | 'threeQuarter' | 'side' | 'back';

export type CharacterSpec = {
  id: string;
  name: string;
  /** Label peran/karakter opsional (mis. Pemeran Utama #1 · Mahasiswa S1 Teknik Informatika). */
  role?: string;
  headShape: HeadShape;
  eyeStyle: EyeStyle;
  skin: string;
  skinShadow: string;
  ink: string;
  hairStyle: HairStyle;
  hairColor: string;
  hairHighlight?: string;
  headgear: Headgear;
  headgearColor?: string;
  headgearAccent?: string;
  glasses?: boolean;
  glassesStyle?: 'round' | 'tech';
  mustache?: boolean;
  earrings?: boolean;
  nose?: boolean;
  browThick?: number;
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
  /** 0..1 angkat topi/peci/helm/kacamata. Otomatis 1 saat `face === 'shock'`. */
  hatPop?: number;
  /** Efek komik 2D di sekitar kepala. Otomatis mengikuti ekspresi jika tidak diisi. */
  fx?: ComicFx;
  /** 0..1 fase siklus langkah saat `stance === 'walk'`. */
  walkPhase?: number;
  /** Kemiringan badan (derajat). */
  lean?: number;
  /** -1..1 arah hadap wajah (+ kanan, - kiri). */
  facing?: number;
};

export const ACTOR_W = 700;
export const ACTOR_H = 1100;
export const ACTOR_SOLE_Y = 1040;

export type CastPresetId =
  | 'bangUtoh'
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

/** 12 Preset Karakter Orisinal Ala Indonesia siap pakai di produksi mana pun (Pemeran Utama #1: Bolohoutoh alias Bang Utoh). */
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
    skin: '#f6d8bc',
    skinShadow: '#e1beae',
    ink: '#211b2b',
    hairStyle: 'parted',
    hairColor: '#22202c',
    hairHighlight: '#413e54',
    headgear: 'cap',
    headgearColor: '#a62828',
    headgearAccent: '#fff4d6',
    nose: true,
    browThick: 9.5,
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

function drawShoe(ctx: Ctx, x: number, y: number, dir: number, spec: CharacterSpec) {
  const { ink, shoeStyle, shoeColor, outfitColor } = spec;
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
    ctx.fillStyle = shoeColor === '#262838' ? '#ffffff' : outfitColor;
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
}

function resolveArmTarget(
  side: -1 | 1,
  armPose: ArmPose,
  torsoTop: number,
  tw: number,
  swing: number,
  isWalk: boolean,
  isSide: boolean,
) {
  const sx = CX + (isSide ? side * 14 : side * tw * 0.44);
  const sy = torsoTop + 52;
  let hx = CX + side * (isSide ? 42 : 134);
  let hy = torsoTop + 178;
  let bend = side * 24;

  if (armPose === 'rest' && isWalk) {
    hx = CX + (isSide ? side * 90 * swing : side * (126 + swing * 52));
    hy = torsoTop + 168 - Math.abs(swing) * 18;
    bend = side * 20;
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
  }
  return { sx, sy, hx, hy, bend };
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
) {
  const { sx, sy, hx, hy, bend } = resolveArmTarget(side, armPose, torsoTop, tw, swing, isWalk, isSide);
  const { ink, skin, outfit, outfitColor, outfitSecondary } = spec;
  const isShortSleeve = outfit === 'kotakSarung' || outfit === 'dasterCelemek' || outfit === 'seragamSma';
  const sleeveColor =
    outfit === 'coach' || outfit === 'tenun' || outfit === 'ojol'
      ? (outfitSecondary ?? outfitColor)
      : outfitColor;

  if (isShortSleeve) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 25;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + hx) / 2 + bend, (sy + hy) / 2, hx, hy);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.strokeStyle = ink;
    ctx.lineWidth = 33;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (hx - sx) * 0.36, sy + (hy - sy) * 0.36);
    ctx.stroke();
    ctx.strokeStyle = outfitColor;
    ctx.lineWidth = 21;
    ctx.stroke();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + hx) / 2 + bend, (sy + hy) / 2, hx, hy);
    ctx.stroke();
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = 18;
    ctx.stroke();
  }

  if (prop !== 'none') {
    drawHandProp(ctx, prop, hx, hy, ink, side);
  }

  // Tangan (dengan jari telunjuk mini saat mode 'point'!)
  if (armPose === 'point') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(hx, hy, 16, 0, TAU);
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
        ctx.arc(hx, hy, 17, 0, TAU);
      },
      skin,
      ink,
      4.5,
      2,
      3,
    );
  }
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
    ctx.moveTo(CX - w * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - w * 0.62, torsoTop + th * 0.35, CX - w * 0.56, bottomY - 12, CX - w * 0.22, bottomY);
    ctx.quadraticCurveTo(CX, bottomY + 12, CX + w * 0.22, bottomY);
    ctx.bezierCurveTo(CX + w * 0.56, bottomY - 12, CX + w * 0.62, torsoTop + th * 0.35, CX + w * 0.42, torsoTop + 8);
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
      // Tali leher celemek
      ctx.strokeStyle = apronCol;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(CX - 36, torsoTop + 4);
      ctx.lineTo(CX - 48, torsoTop + 58);
      ctx.moveTo(CX + 36, torsoTop + 4);
      ctx.lineTo(CX + 48, torsoTop + 58);
      ctx.stroke();

      // Badan celemek bib depan rapi
      const aw = isSide ? 48 : 74;
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
      const pw = isSide ? 32 : 52;
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
      ctx.moveTo(CX - 42, torsoTop + 8);
      ctx.lineTo(CX + 42, torsoTop + 130);
      ctx.moveTo(CX + 42, torsoTop + 8);
      ctx.lineTo(CX - 42, torsoTop + 130);
      ctx.moveTo(CX - w * 0.52, torsoTop + 138);
      ctx.lineTo(CX + w * 0.52, torsoTop + 138);
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

function drawHeadgear(ctx: Ctx, spec: CharacterSpec, W: number, headTop: number, cy: number, pop: number, isBack: boolean) {
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
    const brimDir = isBack ? 1 : -1;
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
      if (isBack) {
        ctx.arc(0, -14, 148, 0, TAU);
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

/**
 * Gambar karakter Nusantara/Indonesia modular ke Canvas2D 700x1100 (telapak kaki di y = 1040).
 */
export function drawActor(ctx: Ctx, actor: CastPresetId | CharacterSpec, pose: ActorPose, overrides?: Partial<CharacterSpec>) {
  const spec = resolveActorSpec(actor, overrides);
  const { ink, skin, skinShadow, hairStyle, hairColor, hairHighlight, pantsColor } = spec;
  const view: ActorView = pose.view ?? 'threeQuarter';
  const stance: ActorStance = pose.stance ?? 'stand';
  const isBack = view === 'back';
  const isSide = view === 'side';
  const isWalk = stance === 'walk';

  const facing =
    view === 'front' ? 0 : isSide ? Math.sign(pose.facing ?? 1) * 0.85 : (pose.facing ?? (pose.face === 'shock' ? 0.08 : 0.34));
  const blink = pose.blink === true ? 1 : pose.blink === false ? 0 : (pose.blink ?? 0);
  const hatPop = pose.hatPop !== undefined ? pose.hatPop : pose.face === 'shock' ? 1 : 0;

  const ph = (pose.walkPhase ?? 0) * TAU;
  const swing = isWalk ? Math.sin(ph) : 0;
  const bob = isWalk
    ? -Math.abs(Math.sin(ph)) * 36
    : stance === 'sit'
      ? 105
      : stance === 'sitCross'
        ? 268
        : stance === 'squat'
          ? 205
          : stance === 'jump'
            ? -82
            : 0;
  const lean =
    pose.lean !== undefined
      ? pose.lean
      : isWalk
        ? 3.2 + 3.0 * Math.cos(ph * 2)
        : pose.face === 'shock'
          ? -4.5
          : 1.2;

  const leftArm: ArmPose = pose.leftArm ?? (pose.face === 'shock' ? 'raise' : pose.leftProp && pose.leftProp !== 'none' ? 'hold' : 'rest');
  const rightArm: ArmPose =
    pose.rightArm ?? (pose.face === 'shock' ? 'raise' : pose.rightProp && pose.rightProp !== 'none' ? 'hold' : 'rest');
  const leftProp: HandProp = pose.leftProp ?? 'none';
  const rightProp: HandProp = pose.rightProp ?? 'none';

  const W = spec.headShape === 'squircle' ? 276 : spec.hairStyle === 'hijab' ? 238 : 250;
  const H = spec.headShape === 'squircle' ? 240 : 236;
  const headTop = 192 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = spec.headShape === 'squircle' ? 220 : spec.outfit === 'kotakSarung' ? 222 : 196;
  const th = 228;
  const hipY = torsoTop + th - 12;

  ctx.clearRect(0, 0, ACTOR_W, ACTOR_H);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- 1. KAKI (mendukung stand, walk, sit, sitCross/bersila, jump & side profile) ---
  const isSkirted = spec.outfit === 'kotakSarung' || spec.outfit === 'dasterCelemek';
  const legSides: (-1 | 1)[] = isSide ? [-1, 1] : [-1, 1];
  if (stance === 'sitCross') {
    // Duduk bersila santai di lantai (kaki kiri terlipat di bawah, kaki kanan menyilang di depan!)
    const drawCrossedLeg = (side: -1 | 1, inFront: boolean) => {
      const hx = CX + side * 34;
      const hy = hipY - 8;
      const kx = CX + side * 144;
      const ky = hipY + (inFront ? 48 : 38);
      const fx = CX - side * 78;
      const fy = ACTOR_SOLE_Y - (inFront ? 10 : 18);

      // Paha keluar ke lutut
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(CX + side * 112, hy + 8, kx, ky);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 18;
      ctx.stroke();

      // Betis melipat menyilang ke sisi berlawanan
      ctx.strokeStyle = ink;
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.quadraticCurveTo(CX + side * 42, ACTOR_SOLE_Y - 14, fx, fy - 12);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 17;
      ctx.stroke();

      drawShoe(ctx, fx, fy, -side, spec);
    };
    drawCrossedLeg(-1, false);
    drawCrossedLeg(1, true);
  } else if (stance === 'squat') {
    // Gaya jongkok nongkrong khas warkop: lutut naik lebar di kiri-kanan, kaki menapak mantap!
    for (const side of legSides) {
      const hx = CX + side * 34;
      const hy = hipY - 6;
      const kx = CX + side * 124;
      const ky = hipY - 42;
      const fx = CX + side * 72;
      const fy = ACTOR_SOLE_Y - 4;

      // Paha naik keluar ke lutut tinggi
      ctx.strokeStyle = ink;
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(CX + side * 96, hy - 34, kx, ky);
      // Betis turun menapak ke sepatu
      ctx.quadraticCurveTo(kx + side * 8, (ky + fy) * 0.52, fx, fy - 18);
      ctx.stroke();
      ctx.strokeStyle = pantsColor;
      ctx.lineWidth = 18;
      ctx.stroke();

      drawShoe(ctx, fx, fy, side, spec);
    }
  } else {
    for (const side of legSides) {
      const dir = isSide ? (facing >= 0 ? 1 : -1) : side;
      if (stance === 'sit') {
        // Duduk di bangku/kursi: paha maju/keluar, lutut menekuk turun
        const hx = CX + (isSide ? side * 14 : side * 46);
        const kx = CX + (isSide ? dir * 108 + side * 14 : side * 84);
        const ky = hipY + 72;
        const fx = CX + (isSide ? dir * 116 + side * 14 : side * 72);
        const fy = ACTOR_SOLE_Y - 12;

        ctx.strokeStyle = ink;
        ctx.lineWidth = 28;
        ctx.beginPath();
        ctx.moveTo(hx, hipY);
        ctx.quadraticCurveTo(kx, hipY + 12, kx, ky);
        ctx.lineTo(fx, fy - 20);
        ctx.stroke();
        ctx.strokeStyle = pantsColor;
        ctx.lineWidth = 17;
        ctx.stroke();
        drawShoe(ctx, fx, fy, dir, spec);
      } else if (stance === 'jump') {
        const hx = CX + side * 38;
        const kx = CX + side * 86;
        const ky = hipY + 110;
        const fx = CX + side * 54;
        const fy = hipY + 210;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 28;
        ctx.beginPath();
        ctx.moveTo(hx, hipY);
        ctx.quadraticCurveTo(kx, ky, fx, fy - 18);
        ctx.stroke();
        ctx.strokeStyle = pantsColor;
        ctx.lineWidth = 17;
        ctx.stroke();
        drawShoe(ctx, fx, fy, dir, spec);
      } else {
        const stride = isSide ? 110 : isSkirted ? 56 : 72;
        const stepX = swing * side * stride;
        const liftY = isWalk ? Math.max(0, -swing * side) * 34 : 0;
        const baseSpread = isSide ? side * 20 : side * (pose.face === 'shock' ? 74 : isSkirted ? 48 : 54);
        const fx = CX + baseSpread + stepX;
        const fy = ACTOR_SOLE_Y - liftY;
        const hx = CX + (isSide ? side * 8 : side * 36);
        const startY = isSkirted ? hipY + 90 : hipY;

        ctx.strokeStyle = ink;
        ctx.lineWidth = isSkirted ? 22 : 28;
        ctx.beginPath();
        ctx.moveTo(hx, startY);
        ctx.quadraticCurveTo((hx + fx) / 2 - side * 5, (startY + fy) / 2, fx, fy - 22);
        ctx.stroke();
        ctx.strokeStyle = pantsColor;
        ctx.lineWidth = isSkirted ? 12 : 17;
        ctx.stroke();
        drawShoe(ctx, fx, fy, dir, spec);
      }
    }
  }

  // Rotasi badan atas sesuai lean
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- 2. ELEMEN BELAKANG (cepol rambut Bu Siti / ransel Raka di tampak depan) ---
  if (hairStyle === 'bun' && !isBack) {
    const bunY = headTop - 36 - hatPop * 10;
    inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 10, bunY, 44, 0, TAU); }, hairColor, ink, 5.5, 3, 4);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(CX - 44, bunY + 20, 68, 16, 8); }, '#e04848', ink, 4, 2, 2.5);
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

  // --- 3. LENGAN KIRI (belakang) ---
  drawArm(ctx, -1, leftArm, leftProp, torsoTop, tw, swing, isWalk, isSide, spec);

  // --- 4. TORSO & BAWAHAN (Sarung / Daster / Batik / Denim / Ojol / SMA / Tenun) ---
  drawTorsoAndSkirt(ctx, torsoTop, tw, th, isBack, isSide, spec);

  // --- 5. LENGAN KANAN (depan) ---
  drawArm(ctx, 1, rightArm, rightProp, torsoTop, tw, swing, isWalk, isSide, spec);

  // --- 6. KEPALA, RAMBUT / HIJAB, WAJAH, KACAMATA, KUMIS, HEADGEAR ---
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
      const fx = CX + facing * 12;
      ctx.fillStyle = '#f7ead6';
      ctx.beginPath();
      ctx.ellipse(CX + facing * 8, cy + 4, W * 0.47, H * 0.47, 0, 0, TAU);
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
    }
  } else {
    // Telinga (tertutup helm atau earcup headphone saat dipakai normal)
    if (spec.headgear !== 'helmet' && !(spec.headgear === 'headphones' && hatPop < 0.25)) {
      const earX = isBack ? CX - W * 0.48 : CX - (facing >= 0 ? 1 : -1) * W * 0.49;
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(earX, cy + 13, 18, 23, -0.12, 0, TAU); }, skin, ink, 4.5, 2, 3);
      if (isBack) {
        inked(ctx, () => { ctx.beginPath(); ctx.ellipse(CX + W * 0.48, cy + 13, 18, 23, 0.12, 0, TAU); }, skin, ink, 4.5, 2, 3);
      }
      if (spec.earrings) {
        inked(ctx, () => { ctx.beginPath(); ctx.arc(earX, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);
      }
    }

    // Bentuk kepala modular
    const headPath = () => {
      ctx.beginPath();
      if (spec.headShape === 'faceted') {
        ctx.moveTo(CX - W * 0.46, cy - 28);
        ctx.bezierCurveTo(CX - W * 0.48, headTop - 10, CX + W * 0.48, headTop - 10, CX + W * 0.48, cy - 24);
        ctx.bezierCurveTo(CX + W * 0.5, cy + 36, CX + W * 0.34, chin - 16, CX + facing * 22, chin);
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
          if (!isBack && s > 0) x += facing * W * 0.035 * s;
          const px = CX + x;
          const py = cy + y;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
    };
    const skG = ctx.createLinearGradient(CX - W * 0.35, headTop, CX + W * 0.45, chin);
    skG.addColorStop(0, isBack ? hairColor : skin);
    skG.addColorStop(0.58, isBack ? hairColor : skin);
    skG.addColorStop(1, isBack ? hairColor : skinShadow);
    inked(ctx, headPath, skG, ink, 5.5, 3.5, 5.5);

    if (isBack) {
      // Tampak belakang kepala: kulit tengkuk bawah + rambut/cepol
      ctx.save();
      headPath();
      ctx.clip();
      ctx.fillStyle = skinShadow;
      ctx.fillRect(CX - W, chin - 44, W * 2, 54);
      ctx.restore();
      headPath();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.stroke();
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

  // --- 7. FITUR WAJAH (12 ekspresi + auto lip-sync + kacamata + kumis) ---
  if (!isBack) {
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
      facing: isSide ? Math.sign(facing) * 0.65 : facing,
      browThick: spec.browThick,
      nose: spec.nose || isSide,
    });

    const shift = (isSide ? Math.sign(facing) * 0.65 : facing) * W * 0.085;
    if (spec.glasses) {
      const ex = (s: number) => CX + shift + s * W * 0.148;
      const eyeY = cy + 12 - hatPop * 9;
      ctx.save();
      if (spec.glassesStyle === 'tech') {
        // Kacamata kotak tipis anti-radiasi anak Teknik Informatika
        ctx.strokeStyle = '#1f2638';
        ctx.lineWidth = 5;
        const gw = 58;
        const gh = 44;
        for (const s of [-1, 1]) {
          const lx = ex(s) - gw / 2;
          const ly = eyeY - gh / 2;
          ctx.fillStyle = 'rgba(150, 224, 255, 0.19)';
          ctx.beginPath();
          ctx.roundRect(lx, ly, gw, gh, 10);
          ctx.fill();
          // Pantulan layar tipis diagonal di lensa
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lx + 10, ly + 14);
          ctx.lineTo(lx + 20, ly + 6);
          ctx.stroke();
          ctx.strokeStyle = '#1f2638';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(lx, ly, gw, gh, 10);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(ex(-1) + gw / 2, eyeY - 4);
        ctx.lineTo(ex(1) - gw / 2, eyeY - 4);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#c58f38';
        ctx.lineWidth = 5;
        const gr = 30;
        for (const s of [-1, 1]) {
          ctx.fillStyle = 'rgba(220, 245, 255, 0.16)';
          ctx.beginPath();
          ctx.arc(ex(s), eyeY, gr, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(ex(-1) + gr - 2, eyeY);
        ctx.quadraticCurveTo(CX + shift, eyeY - 5, ex(1) - gr + 2, eyeY);
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
  drawHeadgear(ctx, spec, W, headTop, cy, hatPop, isBack);

  // --- 9. EFEK KOMIK 2D ---
  const fx = pose.fx !== undefined ? pose.fx : isBack ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, CX, headTop - (spec.headgear !== 'none' ? 38 : 10), W, ink);

  ctx.restore();
}
