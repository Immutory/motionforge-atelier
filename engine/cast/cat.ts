import { drawComicFx, type ComicFx, type Expression } from './expressions';
import type { TalkSample } from './lipsync';
import { plantedFoot, type ActorGait, type ActorView } from './nusantara';
import {
  degToRad,
  rotateYaw3D,
  sortByDepthZ,
  type ReliefPrimitive,
} from './rig360';

export type CatPresetId = 'oyen' | 'abu' | 'belang';
export type CatStance = 'sit' | 'stand' | 'walk' | 'sleep' | 'jump';

export type CatSpec = {
  id: string;
  name: string;
  role?: string;
  /** Warna dasar bulu utama. */
  furBase: string;
  /** Highlight hangat bulu di sisi cahaya. */
  furHighlight: string;
  /** Bayangan bulu di sisi bawah/belakang. */
  furShadow: string;
  /** Warna loreng tabby utama (dahi M, punggung, ekor, kaki). */
  stripeColor: string;
  /** Warna loreng gelap / ujung ekor. */
  stripeDark: string;
  /** Warna krem/putih di moncong, dagu, dada, perut, dan kaus kaki cakar. */
  cream: string;
  /** Warna bagian dalam telinga. */
  innerEar: string;
  /** Warna hidung segitiga kucing. */
  noseColor: string;
  /** Warna iris mata kucing (emas-amber / kuning-hijau khas referensi). */
  eyeIris: string;
  /** Ring gelap hangat di sekeliling iris mata. */
  eyeRim: string;
  /** Warna bantalan cakar (toe-beans). */
  pawPad: string;
  /** Warna garis tinta komik serasi dengan cast manusia (`#1f192d`). */
  ink: string;
  /** Opsional: warna bercak gelap tambahan (untuk kucing calico / belang telon). */
  calicoPatch?: string;
  /** Opsional: warna kalung leher (undefined = kucing kampung bebas tanpa kalung). */
  collarColor?: string;
  /** Opsional: warna lonceng kalung. */
  bellColor?: string;
};

export type CatPose = {
  face: Expression;
  /** 0 = terbuka, 0.5 = setengah tertutup, 1/true = tertutup penuh (pakai `blinkLidAt`). */
  blink?: boolean | number;
  /** 0..1 atau keluaran `talkAt` / `talkWave` untuk animasi mengeong & lip-sync! */
  talk?: number | TalkSample;
  stance?: CatStance;
  view?: ActorView;
  /** 0..1 fase siklus langkah 4 kaki saat `stance === 'walk'`. */
  walkPhase?: number;
  /** Jenis siklus langkah kucing saat `walk` (default `'planted'` di v3.5 agar bebas selip). */
  gait?: ActorGait;
  /** Fase goyangan ekor kontinyu (radian atau `frame * 0.14`). */
  tailPhase?: number;
  /** -1..1 gerak kuping / ear twitch halus. */
  earTwitch?: number;
  /** Angkat kaki depan lucu (melambai / minta gorengan / mengais / menekan tombol). */
  pawRaise?: 'none' | 'left' | 'right';
  /** Sudut arah uluran cakar saat `pawRaise !== 'none'` (derajat dari garis keluar horizontal; + ke bawah, - ke atas). */
  pawAngle?: number;
  /** Pengali jangkauan cakar saat `pawRaise !== 'none'` (default 1; 0.5..1.8). */
  pawReach?: number;
  /** Efek komik 2D di sekitar kepala (otomatis mengikuti ekspresi jika tidak diisi). */
  fx?: ComicFx;
  /** Kemiringan badan (derajat). */
  lean?: number;
  /** -1..1 arah hadap wajah / arah gerak (`+` kanan, `-` kiri). */
  facing?: number;
  /** Fase napas halus (terutama terlihat saat `sleep` & `sit`). */
  breathPhase?: number;
  /** Sudut yaw badan kontinu 360° (derajat: `0` = hadap depan, `+90` = kanan, `±180` = belakang). Jika diisi, mengaktifkan rig 2.5D volumetrik 360°. */
  yawDeg?: number;
  /** Sudut yaw kepala independen relatif kamera (derajat). */
  headYawDeg?: number;
  /** Sudut pitch kepala (derajat). */
  pitchDeg?: number;
  /**
   * 0..1 regang / membungkuk mengintip (hanya `stance: 'stand'`, tampak samping / 3-4). Dada dan kepala turun ke
   * depan, pinggul tetap; keempat cakar tetap menapak di `CAT_SOLE_Y`. Default 0 (gambar lama tidak berubah).
   */
  stretch?: number;
};

export const CAT_W = 720;
export const CAT_H = 660;
export const CAT_SOLE_Y = 595;

/** Jarak tempuh dunia (meter) untuk 1 siklus langkah kucing `walkPhase` 0→1 pada gait `planted`. */
export function catWalkCycleMeters(height = 0.62): number {
  return (4 * 48 * height) / CAT_H;
}

/**
 * 3 Preset Karakter Kucing 2D Orisinal MotionForge Atelier.
 * Preset utama `'oyen'` diadaptasi langsung dari referensi tekstur tabby oranye
 * (`12221_Cat_v1_l3` + `Cat_diffuse.jpg`): bulu jahe-oranye loreng coklat karat,
 * tanda "M" di dahi, moncong-dada-cakar krem, mata kuning-emas pupil celah vertikal,
 * telinga dalam abu-krem, hidung terakota, dan bantalan cakar coklat.
 */
export const CAT_PRESETS: Record<CatPresetId, CatSpec> = {
  oyen: {
    id: 'oyen',
    name: 'Si Oyen (Kucing Warkop)',
    role: 'Maskot Kampung Rawa Sari · Tabby Oranye',
    furBase: '#de7c34',
    furHighlight: '#f09e58',
    furShadow: '#bd5c1d',
    stripeColor: '#913c14',
    stripeDark: '#6e2a0c',
    cream: '#f6e5cf',
    innerEar: '#8d7b74',
    noseColor: '#c9725a',
    eyeIris: '#dec945',
    eyeRim: '#8d2f16',
    pawPad: '#7a4124',
    ink: '#1f192d',
  },
  abu: {
    id: 'abu',
    name: 'Mpus Abu (Tabby Perak)',
    role: 'Kucing Kost & Kampus · Tabby Abu-Abu',
    furBase: '#9399a6',
    furHighlight: '#b7bdc9',
    furShadow: '#6d7382',
    stripeColor: '#525766',
    stripeDark: '#383c48',
    cream: '#eff1f6',
    innerEar: '#c29ea3',
    noseColor: '#c4838a',
    eyeIris: '#b8d455',
    eyeRim: '#4a5534',
    pawPad: '#5c535b',
    ink: '#1f192d',
  },
  belang: {
    id: 'belang',
    name: 'Si Belang (Kucing Telon)',
    role: 'Kucing Pos Ronda · Calico 3 Warna',
    furBase: '#f7eee0',
    furHighlight: '#fffaf2',
    furShadow: '#dfd0bc',
    stripeColor: '#de7c34',
    stripeDark: '#9c4318',
    cream: '#fff9ef',
    innerEar: '#d9a49c',
    noseColor: '#d97c74',
    eyeIris: '#e2bd3d',
    eyeRim: '#854516',
    pawPad: '#a86a62',
    ink: '#1f192d',
    calicoPatch: '#363342',
    collarColor: '#d9383a',
    bellColor: '#f7ca44',
  },
};

export function resolveCatSpec(cat: CatPresetId | CatSpec, overrides?: Partial<CatSpec>): CatSpec {
  const base = typeof cat === 'string' ? CAT_PRESETS[cat] : cat;
  return overrides ? { ...base, ...overrides } : base;
}

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const CX = CAT_W / 2; // 360

function inked(
  ctx: Ctx,
  path: () => void,
  fill: string | CanvasGradient,
  ink: string,
  thin = 5.5,
  dx = 3.2,
  dy = 4.8,
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

function drawTabbyTail(
  ctx: Ctx,
  spec: CatSpec,
  baseX: number,
  baseY: number,
  dir: number,
  phase: number,
  puffed: boolean,
  curled: boolean,
) {
  // Propagasi gelombang 3-tahap (pangkal -> tengah -> ujung) agar ekor kucing melengkung cair
  const swayBase = Math.sin(phase) * (puffed ? 6 : 16);
  const sway = Math.sin(phase - 0.65) * (puffed ? 10 : 28);
  const swayTip = Math.sin(phase - 1.35) * (puffed ? 14 : 40);
  const thick = puffed ? 34 : 23;

  const p0x = baseX;
  const p0y = baseY;
  let c1x: number;
  let c1y: number;
  let c2x: number;
  let c2y: number;
  let p3x: number;
  let p3y: number;

  if (curled) {
    // Ekor melingkar rapi menyapu samping badan saat tidur / duduk santai
    c1x = baseX + dir * 72 + swayBase * 0.15;
    c1y = baseY + 14;
    c2x = baseX + dir * 110;
    c2y = baseY - 22 + sway * 0.25;
    p3x = baseX + dir * 68;
    p3y = baseY - 46 + swayTip * 0.2;
  } else if (puffed) {
    // Ekor mengembang tegak & kaku saat shock / marah!
    c1x = baseX + dir * 52 + swayBase * 0.3;
    c1y = baseY - 58;
    c2x = baseX + dir * 82 + sway;
    c2y = baseY - 148;
    p3x = baseX + dir * 64 + swayTip;
    p3y = baseY - 208;
  } else {
    // Ekor berbentuk huruf S anggun bergoyang alami
    c1x = baseX + dir * 64 + swayBase * 0.45;
    c1y = baseY - 18;
    c2x = baseX + dir * 102 + sway;
    c2y = baseY - 115;
    p3x = baseX + dir * 70 + swayTip;
    p3y = baseY - 178 + Math.cos(phase - 0.9) * 14;
  }

  // Hitung sampel titik di sepanjang kurva Bezier kubik untuk poligon ekor tebal + belang cincin
  const steps = 16;
  const pts: { x: number; y: number; nx: number; ny: number; r: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * p0x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p3x;
    const y = u * u * u * p0y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p3y;
    const dx =
      3 * u * u * (c1x - p0x) + 6 * u * t * (c2x - c1x) + 3 * t * t * (p3x - c2x);
    const dy =
      3 * u * u * (c1y - p0y) + 6 * u * t * (c2y - c1y) + 3 * t * t * (p3y - c2y);
    const len = Math.hypot(dx, dy) || 1;
    const taper = puffed ? 1 + Math.sin(t * Math.PI) * 0.25 : 1 - t * 0.26;
    const spike = puffed && i > 1 && i < steps ? (i % 2 === 0 ? 5.5 : -2.5) : 0;
    pts.push({ x, y, nx: -dy / len, ny: dx / len, r: thick * 0.5 * taper + spike });
  }

  const tailPath = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x + pts[0].nx * pts[0].r, pts[0].y + pts[0].ny * pts[0].r);
    for (let i = 1; i <= steps; i++) {
      ctx.lineTo(pts[i].x + pts[i].nx * pts[i].r, pts[i].y + pts[i].ny * pts[i].r);
    }
    const last = pts[steps];
    const prev = pts[steps - 1];
    const tdx = last.x - prev.x;
    const tdy = last.y - prev.y;
    const tlen = Math.hypot(tdx, tdy) || 1;
    const tx = tdx / tlen;
    const ty = tdy / tlen;
    // Ujung ekor membulat mulus mengikuti arah tangen kurva (tanpa lekukan!)
    ctx.quadraticCurveTo(
      last.x + (last.nx + tx * 1.35) * last.r,
      last.y + (last.ny + ty * 1.35) * last.r,
      last.x + tx * last.r * 1.15,
      last.y + ty * last.r * 1.15,
    );
    ctx.quadraticCurveTo(
      last.x + (-last.nx + tx * 1.35) * last.r,
      last.y + (-last.ny + ty * 1.35) * last.r,
      last.x - last.nx * last.r,
      last.y - last.ny * last.r,
    );
    for (let i = steps - 1; i >= 0; i--) {
      ctx.lineTo(pts[i].x - pts[i].nx * pts[i].r, pts[i].y - pts[i].ny * pts[i].r);
    }
    ctx.closePath();
  };

  inked(ctx, tailPath, spec.furBase, spec.ink, 5, 2.8, 4.2);

  // Loreng cincin tabby di ekor (di-clip ke siluet ekor)
  ctx.save();
  tailPath();
  ctx.clip();
  for (const idx of [3, 6, 9, 12, 14]) {
    const pt = pts[idx];
    const ang = Math.atan2(pt.ny, pt.nx);
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(ang);
    ctx.fillStyle = idx >= 12 ? spec.stripeDark : spec.stripeColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.r * 1.25, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Ujung ekor gelap / lembut
  ctx.fillStyle = spec.calicoPatch ?? spec.stripeDark;
  ctx.beginPath();
  ctx.arc(pts[steps].x, pts[steps].y, pts[steps].r * 1.15, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Garis ulang kontur ekor agar tajam
  tailPath();
  ctx.strokeStyle = spec.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawPaw(
  ctx: Ctx,
  spec: CatSpec,
  x: number,
  y: number,
  rx: number,
  ry: number,
  showBeans: boolean,
  rot = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  const pawPath = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  };
  inked(ctx, pawPath, spec.cream, spec.ink, 4.8, 2.2, 3.2);

  if (showBeans) {
    // Bantalan cakar (toe-beans coklat khas Cat_diffuse.jpg!)
    ctx.fillStyle = spec.pawPad;
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.22, rx * 0.38, ry * 0.3, 0, 0, TAU);
    ctx.fill();
    for (const [bx, by] of [
      [-rx * 0.42, -ry * 0.16],
      [0, -ry * 0.34],
      [rx * 0.42, -ry * 0.16],
    ]) {
      ctx.beginPath();
      ctx.ellipse(bx, by, rx * 0.17, ry * 0.2, 0, 0, TAU);
      ctx.fill();
    }
  } else {
    // Garis jari cakar imut
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    for (const dx of [-rx * 0.32, rx * 0.32]) {
      ctx.beginPath();
      ctx.moveTo(dx, ry * 0.15);
      ctx.lineTo(dx * 0.92, ry * 0.88);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLeg(
  ctx: Ctx,
  spec: CatSpec,
  topX: number,
  topY: number,
  botX: number,
  botY: number,
  wTop: number,
  wBot: number,
  darken = false,
  showBeans = false,
  blendTop = false,
) {
  const dx = botX - topX;
  const dy = botY - topY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // Siluet kaki dengan pangkal bahu membulat mulus (bukan potongan lurus!)
  const legPath = () => {
    ctx.beginPath();
    ctx.moveTo(topX - nx * wTop, topY - ny * wTop);
    ctx.quadraticCurveTo(
      topX - ux * wTop * 1.15,
      topY - uy * wTop * 1.15,
      topX + nx * wTop,
      topY + ny * wTop,
    );
    ctx.quadraticCurveTo(
      (topX + botX) * 0.5 + nx * ((wTop + wBot) * 0.52),
      (topY + botY) * 0.5 + ny * ((wTop + wBot) * 0.52),
      botX + nx * wBot,
      botY + ny * wBot,
    );
    ctx.lineTo(botX - nx * wBot, botY - ny * wBot);
    ctx.quadraticCurveTo(
      (topX + botX) * 0.5 - nx * ((wTop + wBot) * 0.52),
      (topY + botY) * 0.5 - ny * ((wTop + wBot) * 0.52),
      topX - nx * wTop,
      topY - ny * wTop,
    );
    ctx.closePath();
  };

  if (blendTop) {
    // Kaki menempel organik ke bahu/dada tanpa garis potong mendatar di pangkal!
    legPath();
    ctx.fillStyle = darken ? spec.furShadow : spec.furBase;
    ctx.fill();
  } else {
    inked(ctx, legPath, darken ? spec.furShadow : spec.furBase, spec.ink, 5, 2.5, 3.8);
  }

  // Loreng tabby kecil di kaki
  ctx.save();
  legPath();
  ctx.clip();
  ctx.strokeStyle = spec.stripeColor;
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  for (const t of [0.35, 0.62]) {
    const mx = topX + dx * t;
    const my = topY + dy * t;
    ctx.beginPath();
    ctx.moveTo(mx - nx * (wTop * 1.1), my - ny * (wTop * 1.1));
    ctx.lineTo(mx + nx * (wTop * 0.7), my + ny * (wTop * 0.7));
    ctx.stroke();
  }
  ctx.restore();

  // Garis kontur kaki (jika blendTop, gambar hanya sisi samping kiri & kanan agar menyatu alami ke badan!)
  ctx.strokeStyle = spec.ink;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  if (blendTop) {
    ctx.beginPath();
    ctx.moveTo(topX + nx * wTop, topY + ny * wTop);
    ctx.quadraticCurveTo(
      (topX + botX) * 0.5 + nx * ((wTop + wBot) * 0.52),
      (topY + botY) * 0.5 + ny * ((wTop + wBot) * 0.52),
      botX + nx * wBot,
      botY + ny * wBot,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(topX - nx * wTop, topY - ny * wTop);
    ctx.quadraticCurveTo(
      (topX + botX) * 0.5 - nx * ((wTop + wBot) * 0.52),
      (topY + botY) * 0.5 - ny * ((wTop + wBot) * 0.52),
      botX - nx * wBot,
      botY - ny * wBot,
    );
    ctx.stroke();
  } else {
    legPath();
    ctx.stroke();
  }

  drawPaw(ctx, spec, botX, botY + 2, wBot * 1.18, wBot * 0.78, showBeans, Math.atan2(dy, dx) - Math.PI / 2);
}

function drawCatEar(
  ctx: Ctx,
  spec: CatSpec,
  x: number,
  y: number,
  side: -1 | 1,
  tiltDeg: number,
  isBack: boolean,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((tiltDeg * Math.PI) / 180);
  ctx.scale(scale, scale);

  const outerPath = () => {
    ctx.beginPath();
    ctx.moveTo(-side * 34, 24);
    ctx.quadraticCurveTo(-side * 22, -40, side * 14, -76);
    ctx.quadraticCurveTo(side * 42, -26, side * 34, 30);
    ctx.quadraticCurveTo(0, 38, -side * 34, 24);
    ctx.closePath();
  };

  const earFill = spec.calicoPatch && side === 1 ? spec.calicoPatch : spec.furBase;
  inked(ctx, outerPath, earFill, spec.ink, 5.2, 2.8, 4.2);

  if (!isBack) {
    // Bagian dalam telinga (warna abu-hangat + bulu halus khas Cat_diffuse.jpg)
    ctx.beginPath();
    ctx.moveTo(-side * 16, 16);
    ctx.quadraticCurveTo(-side * 10, -24, side * 11, -50);
    ctx.quadraticCurveTo(side * 24, -18, side * 19, 18);
    ctx.closePath();
    ctx.fillStyle = spec.innerEar;
    ctx.fill();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Helaian bulu telinga krem di pangkal
    ctx.strokeStyle = spec.cream;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-side * 12, 10);
    ctx.lineTo(side * 4, 2);
    ctx.moveTo(-side * 8, 18);
    ctx.lineTo(side * 10, 14);
    ctx.stroke();
  } else {
    // Loreng di belakang daun telinga
    ctx.save();
    outerPath();
    ctx.clip();
    ctx.fillStyle = spec.stripeColor;
    ctx.beginPath();
    ctx.ellipse(side * 8, -22, 22, 9, side * 0.35, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawCatHead(
  ctx: Ctx,
  spec: CatSpec,
  hx: number,
  hy: number,
  pose: CatPose,
  view: ActorView,
  isSleep: boolean,
) {
  const isBack34 = view === 'backThreeQuarter';
  const isBack = view === 'back' || isBack34;
  const isSide = view === 'side';
  const facing = pose.facing ?? (isSide ? 1 : isBack34 ? 0.72 : view === 'threeQuarter' ? 0.32 : 0);
  const face = pose.face;
  const blink =
    typeof pose.blink === 'number' ? pose.blink : pose.blink ? 1 : 0;
  const talkSample: TalkSample =
    typeof pose.talk === 'number'
      ? {
          open: pose.talk,
          shape:
            pose.talk > 0.65
              ? 'wide'
              : pose.talk > 0.3
                ? 'mid'
                : pose.talk > 0.16
                  ? 'small'
                  : 'closed',
        }
      : (pose.talk ?? { open: 0, shape: 'closed' });

  const earTwitch = pose.earTwitch ?? 0;
  const flatEars =
    face === 'angry' || face === 'shock' || face === 'nervous' || face === 'strain'
      ? 22
      : face === 'sad' || face === 'tired' || isSleep
        ? 14
        : 0;
  const perkEars = face === 'idea' || face === 'happy' || face === 'focus' ? -5 : 0;

  const headW = isSide ? 196 : 228;
  const headH = isSide ? 174 : 184;

  ctx.save();
  ctx.translate(hx, hy);

  // --- 1. TELINGA (belakang kepala saat side, kiri & kanan saat front/3-4/back) ---
  if (isSide) {
    const dir = facing >= 0 ? 1 : -1;
    // Telinga jauh (sedikit lebih belakang)
    drawCatEar(ctx, spec, dir * 18, -headH * 0.42, dir, (dir * (10 + flatEars * 0.6)) + earTwitch * 6, false, 0.88);
  } else {
    drawCatEar(ctx, spec, -headW * 0.34, -headH * 0.42, -1, -(12 + flatEars + perkEars) + earTwitch * 8, isBack, 1);
    drawCatEar(ctx, spec, headW * 0.34, -headH * 0.42, 1, 12 + flatEars + perkEars + earTwitch * 5, isBack, 1);
  }

  // --- 2. BENTUK KEPALA KUCING (pipi lembut sedikit melebar khas kucing!) ---
  const headPath = () => {
    ctx.beginPath();
    if (isSide) {
      const d = facing >= 0 ? 1 : -1;
      ctx.moveTo(0, -headH * 0.5);
      // Dahi -> moncong profil
      ctx.bezierCurveTo(d * headW * 0.42, -headH * 0.5, d * headW * 0.52, -headH * 0.14, d * headW * 0.58, headH * 0.06);
      ctx.bezierCurveTo(d * headW * 0.62, headH * 0.28, d * headW * 0.42, headH * 0.48, d * headW * 0.08, headH * 0.5);
      // Bagian belakang kepala
      ctx.bezierCurveTo(-d * headW * 0.48, headH * 0.5, -d * headW * 0.54, -headH * 0.46, 0, -headH * 0.5);
    } else {
      ctx.moveTo(0, -headH * 0.5);
      ctx.bezierCurveTo(headW * 0.42, -headH * 0.5, headW * 0.55, -headH * 0.14, headW * 0.53, headH * 0.14);
      // Pipi bulat kucing (cheek fluff)
      ctx.bezierCurveTo(headW * 0.5, headH * 0.44, headW * 0.24, headH * 0.52, 0, headH * 0.52);
      ctx.bezierCurveTo(-headW * 0.24, headH * 0.52, -headW * 0.5, headH * 0.44, -headW * 0.53, headH * 0.14);
      ctx.bezierCurveTo(-headW * 0.55, -headH * 0.14, -headW * 0.42, -headH * 0.5, 0, -headH * 0.5);
    }
    ctx.closePath();
  };

  inked(ctx, headPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);

  // --- 3. SHADING, LORENG TABBY "M" DAHI, PIPI, & MONCONG KREM (di-clip ke kepala) ---
  ctx.save();
  headPath();
  ctx.clip();

  // Highlight lembut atas kepala
  ctx.fillStyle = spec.furHighlight;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(-headW * 0.08, -headH * 0.28, headW * 0.34, headH * 0.22, -0.1, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bayangan bawah dagu
  ctx.fillStyle = spec.furShadow;
  ctx.globalAlpha = 0.38;
  ctx.beginPath();
  ctx.ellipse(0, headH * 0.46, headW * 0.55, headH * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bercak Calico (khusus Si Belang)
  if (spec.calicoPatch) {
    ctx.fillStyle = spec.calicoPatch;
    ctx.beginPath();
    ctx.ellipse(headW * 0.28, -headH * 0.26, headW * 0.32, headH * 0.28, 0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = spec.stripeColor;
    ctx.beginPath();
    ctx.ellipse(-headW * 0.32, -headH * 0.2, headW * 0.26, headH * 0.24, -0.3, 0, TAU);
    ctx.fill();
  }

  const faceShift = isSide ? (facing >= 0 ? 1 : -1) * headW * 0.22 : facing * headW * 0.09;

  if (!isBack) {
    // Loreng dahi "M" khas kucing tabby oranye (dari Cat_diffuse.jpg!)
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (!isSide) {
      ctx.lineWidth = 9.5;
      // 3 garis tengah dahi membentuk M
      ctx.beginPath();
      ctx.moveTo(faceShift, -headH * 0.54);
      ctx.lineTo(faceShift, -headH * 0.24);
      ctx.moveTo(faceShift - 24, -headH * 0.52);
      ctx.quadraticCurveTo(faceShift - 18, -headH * 0.3, faceShift - 10, -headH * 0.22);
      ctx.moveTo(faceShift + 24, -headH * 0.52);
      ctx.quadraticCurveTo(faceShift + 18, -headH * 0.3, faceShift + 10, -headH * 0.22);
      ctx.stroke();

      // 2 pasang loreng pipi kiri & kanan
      ctx.lineWidth = 8.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * headW * 0.56, headH * 0.02);
        ctx.quadraticCurveTo(s * headW * 0.36, headH * 0.05, s * headW * 0.31, headH * 0.08);
        ctx.moveTo(s * headW * 0.54, headH * 0.2);
        ctx.quadraticCurveTo(s * headW * 0.36, headH * 0.22, s * headW * 0.3, headH * 0.24);
        ctx.stroke();
      }
    } else {
      const d = facing >= 0 ? 1 : -1;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-d * 10, -headH * 0.5);
      ctx.quadraticCurveTo(d * 8, -headH * 0.32, d * 24, -headH * 0.26);
      ctx.moveTo(-d * 34, -headH * 0.42);
      ctx.quadraticCurveTo(-d * 14, -headH * 0.24, d * 2, -headH * 0.16);
      // Loreng pipi profil
      ctx.moveTo(-d * 48, headH * 0.08);
      ctx.lineTo(-d * 12, headH * 0.12);
      ctx.moveTo(-d * 46, headH * 0.24);
      ctx.lineTo(-d * 16, headH * 0.26);
      ctx.stroke();
    }

    // Area moncong + dagu krem/putih lembut (khas Cat_diffuse.jpg)
    ctx.fillStyle = spec.cream;
    ctx.beginPath();
    if (isSide) {
      const d = facing >= 0 ? 1 : -1;
      ctx.ellipse(d * headW * 0.36, headH * 0.24, headW * 0.28, headH * 0.26, 0, 0, TAU);
    } else {
      ctx.ellipse(faceShift, headH * 0.26, headW * 0.32, headH * 0.24, 0, 0, TAU);
    }
    ctx.fill();
  } else {
    // Tampak belakang kepala (termasuk backThreeQuarter): loreng tabby punggung tengkuk
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    for (const dy of [-headH * 0.28, -headH * 0.06, headH * 0.16]) {
      ctx.beginPath();
      ctx.moveTo(-headW * 0.34, dy - 6);
      ctx.quadraticCurveTo(0, dy + 14, headW * 0.34, dy - 6);
      ctx.stroke();
    }
    if (isBack34) {
      // Intipan pipi krem & kumis di sisi arah pandang untuk transisi 360° mulus
      const d = facing >= 0 ? 1 : -1;
      ctx.fillStyle = spec.cream;
      ctx.beginPath();
      ctx.ellipse(d * headW * 0.44, headH * 0.24, headW * 0.18, headH * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      for (const [wy, ang] of [[headH * 0.18, -0.14], [headH * 0.26, 0.04], [headH * 0.34, 0.2]] as const) {
        ctx.beginPath();
        ctx.moveTo(d * headW * 0.44, wy);
        ctx.lineTo(d * (headW * 0.64), wy + Math.sin(ang) * 20);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // Garis ulang kontur kepala
  headPath();
  ctx.strokeStyle = spec.ink;
  ctx.lineWidth = 5.5;
  ctx.stroke();

  // Telinga depan (khusus side view) digambar di atas kepala agar kedalaman pas
  if (isSide) {
    const d: -1 | 1 = facing >= 0 ? 1 : -1;
    const opp: -1 | 1 = d === 1 ? -1 : 1;
    drawCatEar(ctx, spec, -d * 20, -headH * 0.38, opp, -d * (14 + flatEars) + earTwitch * 8, false, 1);
  }

  // --- 4. WAJAH KUCING (MATA EMAS PUPIL CELAH, HIDUNG TERAKOTA, MULUT :3 / MEOW, KUMIS) ---
  if (!isBack) {
    const eyeY = -headH * 0.02;
    const eyeSides: number[] = isSide ? [facing >= 0 ? 1 : -1] : [-1, 1];
    const eyeOffset = isSide ? headW * 0.22 : headW * 0.21;

    for (const s of eyeSides) {
      const ex = isSide ? s * eyeOffset : faceShift + s * eyeOffset;
      const rx = face === 'shock' ? 25 : 23;
      const ry = face === 'shock' ? 26 : face === 'smug' || face === 'tired' ? 16 : 22;

      if (blink >= 0.85 || face === 'laugh' || isSleep) {
        // Mata terpejam manis (^ ^ saat tertawa / happy, u u saat tidur)
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 5.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (face === 'laugh' || (face === 'happy' && !isSleep)) {
          ctx.arc(ex, eyeY + 6, 17, Math.PI * 1.12, Math.PI * 1.88);
        } else if (isSleep) {
          ctx.arc(ex, eyeY - 2, 16, Math.PI * 0.14, Math.PI * 0.86);
        } else {
          ctx.moveTo(ex - 18, eyeY + 2);
          ctx.quadraticCurveTo(ex, eyeY + 7, ex + 18, eyeY + 2);
        }
        ctx.stroke();
      } else if (face === 'strain') {
        // Mata memicing tajam `> <` saat tegang / menahan tenaga (konsisten dengan expressions.ts)
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 5.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(ex + s * 16, eyeY - 12);
        ctx.lineTo(ex - s * 10, eyeY);
        ctx.lineTo(ex + s * 16, eyeY + 12);
        ctx.stroke();
      } else {
        // Mata kucing khas Cat_diffuse.jpg: ring luar merah-coklat, iris emas-kuning, pupil celah vertikal!
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, rx, ry, 0, 0, TAU);
        ctx.fillStyle = spec.eyeRim;
        ctx.fill();

        const irisGrad = ctx.createRadialGradient(ex - 3, eyeY - 4, 2, ex, eyeY, rx * 0.88);
        irisGrad.addColorStop(0, '#f4e878');
        irisGrad.addColorStop(0.7, spec.eyeIris);
        irisGrad.addColorStop(1, '#b58d22');
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, rx * 0.84, ry * 0.84, 0, 0, TAU);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Pupil celah vertikal kucing (membesar bulat saat shock/happy/idea, menyipit saat smug/angry)
        const pupilW =
          face === 'shock'
            ? rx * 0.56
            : face === 'happy' || face === 'idea' || face === 'sad'
              ? rx * 0.42
              : face === 'angry' || face === 'smug' || face === 'focus'
                ? rx * 0.22
                : rx * 0.3;
        const pupilH = face === 'shock' ? ry * 0.68 : ry * 0.72;
        const lookX = isSide ? s * 4 : facing * 4.5;
        ctx.fillStyle = '#181114';
        ctx.beginPath();
        ctx.ellipse(ex + lookX, eyeY, pupilW, pupilH, 0, 0, TAU);
        ctx.fill();

        // Kilau putih catchlight agar mata hidup!
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + lookX - pupilW * 0.45 - 3, eyeY - ry * 0.28, face === 'shock' ? 6.5 : 5.2, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + lookX + pupilW * 0.4 + 2, eyeY + ry * 0.26, 2.5, 0, TAU);
        ctx.fill();

        // Kelopak atas setengah tertutup saat kedip / smug / tired / skeptical
        const lidClose =
          blink >= 0.35
            ? 0.52
            : face === 'tired'
              ? 0.45
              : face === 'smug'
                ? 0.38
                : face === 'skeptical' && s > 0
                  ? 0.36
                  : 0;
        if (lidClose > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, eyeY, rx + 2, ry + 2, 0, 0, TAU);
          ctx.clip();
          ctx.fillStyle = spec.furBase;
          ctx.fillRect(ex - rx - 4, eyeY - ry - 4, (rx + 4) * 2, ry * 2 * lidClose + 4);
          ctx.strokeStyle = spec.ink;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(ex - rx - 2, eyeY - ry + ry * 2 * lidClose);
          ctx.lineTo(ex + rx + 2, eyeY - ry + ry * 2 * lidClose);
          ctx.stroke();
          ctx.restore();
        }

        // Garis luar mata tegas
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, rx, ry, 0, 0, TAU);
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.restore();
      }

      // Alis ekspresif (untuk emosi kuat: angry, strain, sad, nervous, skeptical, shock, focus)
      if (
        !isSleep &&
        (face === 'angry' ||
          face === 'strain' ||
          face === 'sad' ||
          face === 'nervous' ||
          face === 'skeptical' ||
          face === 'focus' ||
          face === 'smug')
      ) {
        const browY = eyeY - ry - 11;
        const angle =
          face === 'angry' || face === 'strain'
            ? -s * 0.38
            : face === 'sad' || face === 'nervous'
              ? s * 0.32
              : face === 'focus'
                ? -s * 0.2
                : face === 'skeptical'
                  ? s > 0
                    ? -0.22
                    : 0.14
                  : -s * 0.1;
        ctx.save();
        ctx.translate(ex, browY);
        ctx.rotate(angle);
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Hidung segitiga terakota-pink khas kucing
    const noseX = isSide ? (facing >= 0 ? 1 : -1) * headW * 0.46 : faceShift;
    const noseY = headH * 0.14;
    ctx.beginPath();
    ctx.moveTo(noseX - 12, noseY - 6);
    ctx.lineTo(noseX + 12, noseY - 6);
    ctx.lineTo(noseX, noseY + 8);
    ctx.closePath();
    ctx.fillStyle = spec.noseColor;
    ctx.fill();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Mulut kucing (:3 / w) + animasi mengeong / lip-sync
    const mouthY = noseY + 11;
    const isMeowing = talkSample.open > 0.15 || face === 'shock' || face === 'laugh';
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';

    if (isMeowing) {
      const openH =
        face === 'shock'
          ? 28
          : face === 'laugh'
            ? 24
            : 12 + talkSample.open * 20;
      const openW =
        talkSample.shape === 'o'
          ? 14
          : face === 'shock'
            ? 19
            : 21;
      // Garis pendek dari hidung ke mulut
      ctx.beginPath();
      ctx.moveTo(noseX, noseY + 8);
      ctx.lineTo(noseX, mouthY + 2);
      ctx.stroke();

      // Rongga mulut mengeong
      ctx.beginPath();
      ctx.ellipse(noseX, mouthY + openH * 0.48, openW, openH * 0.56, 0, 0, TAU);
      ctx.fillStyle = '#5e1a27';
      ctx.fill();
      // Lidah pink imut
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f27c8d';
      ctx.beginPath();
      ctx.ellipse(noseX, mouthY + openH * 0.86, openW * 0.72, openH * 0.38, 0, 0, TAU);
      ctx.fill();
      // Taring mungil lucu saat mengeong / shock
      ctx.fillStyle = '#ffffff';
      for (const tx of [-openW * 0.48, openW * 0.48]) {
        ctx.beginPath();
        ctx.moveTo(noseX + tx - 3.5, mouthY + 3);
        ctx.lineTo(noseX + tx + 3.5, mouthY + 3);
        ctx.lineTo(noseX + tx, mouthY + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(noseX, mouthY + openH * 0.48, openW, openH * 0.56, 0, 0, TAU);
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (face === 'strain') {
      // Gigi rapat / meringis tegang (clenched teeth konsisten dengan expressions.ts)
      ctx.beginPath();
      ctx.moveTo(noseX, noseY + 8);
      ctx.lineTo(noseX, mouthY + 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(noseX - 20, mouthY + 2, 40, 17, 6);
      ctx.fill();
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 3.8;
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(noseX - 18, mouthY + 10.5);
      ctx.lineTo(noseX + 18, mouthY + 10.5);
      for (const gx of [-9, 0, 9]) {
        ctx.moveTo(noseX + gx, mouthY + 2);
        ctx.lineTo(noseX + gx, mouthY + 19);
      }
      ctx.stroke();
    } else if (face === 'angry' || face === 'sad') {
      // Mulut cemberut / mengeram kecil
      ctx.beginPath();
      ctx.moveTo(noseX, noseY + 8);
      ctx.lineTo(noseX, mouthY + 4);
      ctx.moveTo(noseX - 18, mouthY + 14);
      ctx.quadraticCurveTo(noseX, mouthY + 1, noseX + 18, mouthY + 14);
      ctx.stroke();
    } else {
      // Mulut ":3" klasik kucing ramah!
      ctx.beginPath();
      ctx.moveTo(noseX, noseY + 8);
      ctx.lineTo(noseX, mouthY + 5);
      ctx.moveTo(noseX - 20, mouthY + 4);
      ctx.quadraticCurveTo(noseX - 10, mouthY + 17, noseX, mouthY + 5);
      ctx.quadraticCurveTo(noseX + 10, mouthY + 17, noseX + 20, mouthY + 4);
      ctx.stroke();
    }

    // Rona pipi hangat saat happy / laugh
    if (face === 'happy' || face === 'laugh') {
      ctx.fillStyle = 'rgba(255, 130, 120, 0.35)';
      for (const s of eyeSides) {
        const bx = isSide ? s * (headW * 0.16) : faceShift + s * (headW * 0.32);
        ctx.beginPath();
        ctx.ellipse(bx, headH * 0.18, 15, 8.5, 0, 0, TAU);
        ctx.fill();
      }
    }

    // Kumis kucing lentik (3 helai per pipi)
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    const whiskerSides = isSide ? [facing >= 0 ? 1 : -1] : [-1, 1];
    for (const s of whiskerSides) {
      const wx = isSide ? s * headW * 0.36 : faceShift + s * headW * 0.24;
      const wy = headH * 0.2;
      for (const [dy0, dy1, len] of [
        [-8, -18, 56],
        [1, 0, 62],
        [10, 16, 54],
      ]) {
        ctx.beginPath();
        ctx.moveTo(wx, wy + dy0);
        ctx.quadraticCurveTo(wx + s * len * 0.55, wy + dy0 + (dy1 - dy0) * 0.35, wx + s * len, wy + dy1);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawCollar(ctx: Ctx, spec: CatSpec, cx: number, cy: number, width: number, isBack: boolean) {
  if (!spec.collarColor) return;
  const collarPath = () => {
    ctx.beginPath();
    ctx.roundRect(cx - width * 0.5, cy - 11, width, 22, 11);
  };
  inked(ctx, collarPath, spec.collarColor, spec.ink, 4.5, 2, 3);
  if (!isBack) {
    const bellPath = () => {
      ctx.beginPath();
      ctx.arc(cx, cy + 16, 13, 0, TAU);
    };
    inked(ctx, bellPath, spec.bellColor ?? '#f7ca44', spec.ink, 4, 1.5, 2.5);
    ctx.fillStyle = spec.ink;
    ctx.beginPath();
    ctx.arc(cx, cy + 19, 3, 0, TAU);
    ctx.fill();
  }
}

/** Gambar 1 frame karakter kucing 2D ekspresif ke Canvas2D (`CAT_W x CAT_H`, sole di `CAT_SOLE_Y`). */
export function drawCat(
  ctx: Ctx,
  spec: CatSpec,
  pose: CatPose,
  reliefOut?: ReliefPrimitive[],
) {
  if (pose.yawDeg !== undefined) {
    drawCat360(ctx, spec, pose, reliefOut);
    return;
  }
  ctx.save();
  ctx.clearRect(0, 0, CAT_W, CAT_H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const stance: CatStance = pose.stance ?? 'sit';
  const view: ActorView = pose.view ?? 'threeQuarter';
  const isBack34 = view === 'backThreeQuarter';
  const isBack = view === 'back' || isBack34;
  const isSide = view === 'side';
  const facing = pose.facing ?? (isSide ? 1 : isBack34 ? 0.72 : view === 'threeQuarter' ? 0.32 : 0);
  const dir = facing >= 0 ? 1 : -1;
  const walkPhase = pose.walkPhase ?? 0;
  const tailPhase = pose.tailPhase ?? walkPhase * TAU;
  const breath = Math.sin(pose.breathPhase ?? tailPhase * 0.7) * 3.5;
  const isPuffed = pose.face === 'shock' || pose.face === 'angry';
  const isSleep = stance === 'sleep';
  const pawRaise = pose.pawRaise ?? 'none';

  // Bounce alami saat berjalan atau melompat
  const walkBob = stance === 'walk' ? Math.abs(Math.sin(walkPhase * TAU)) * -14 : 0;
  const jumpLift = stance === 'jump' ? -78 : 0;
  const shockHop = pose.face === 'shock' && stance !== 'jump' ? -18 : 0;
  const leanRad = ((pose.lean ?? (stance === 'walk' ? dir * 2.5 : 0)) * Math.PI) / 180;

  ctx.translate(CX, CAT_SOLE_Y);
  ctx.rotate(leanRad);
  ctx.translate(-CX, -CAT_SOLE_Y + walkBob + jumpLift + shockHop);

  let headX = CX;
  let headY = 235;
  let headTopY = 140;

  if (stance === 'sleep') {
    // =========================================================================
    // POSE 1: SLEEP / LOAF (Melingkar tidur siang santai di teras warkop!)
    // =========================================================================
    const bx = CX;
    const by = CAT_SOLE_Y - 78 + breath * 0.4;

    // Ekor melingkar lembut di sisi
    drawTabbyTail(ctx, spec, bx - dir * 96, by + 30, -dir, tailPhase * 0.45, false, true);

    // Badan loaf melingkar empuk
    const loafPath = () => {
      ctx.beginPath();
      ctx.moveTo(bx - 135, CAT_SOLE_Y - 14);
      ctx.bezierCurveTo(bx - 150, by - 68 - breath, bx - 40, by - 95 - breath, bx + 48, by - 72 - breath);
      ctx.bezierCurveTo(bx + 148, by - 46, bx + 150, CAT_SOLE_Y - 12, bx + 115, CAT_SOLE_Y - 6);
      ctx.lineTo(bx - 115, CAT_SOLE_Y - 6);
      ctx.closePath();
    };
    inked(ctx, loafPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);

    // Loreng tabby melengkung di punggung loaf
    ctx.save();
    loafPath();
    ctx.clip();
    if (spec.calicoPatch) {
      ctx.fillStyle = spec.calicoPatch;
      ctx.beginPath();
      ctx.ellipse(bx - 52, by - 25, 62, 50, -0.2, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 14;
    for (const ox of [-72, -24, 24, 68]) {
      ctx.beginPath();
      ctx.moveTo(bx + ox - 10, by - 95);
      ctx.quadraticCurveTo(bx + ox + 14, by - 30, bx + ox - 4, by + 26);
      ctx.stroke();
    }
    ctx.restore();
    loafPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    // Cakar depan terselip di bawah dagu
    drawPaw(ctx, spec, bx + dir * 68, CAT_SOLE_Y - 18, 28, 17, false);
    drawPaw(ctx, spec, bx + dir * 20, CAT_SOLE_Y - 16, 26, 16, false);

    headX = bx + dir * 52;
    headY = by - 12 + breath * 0.6;
    headTopY = headY - 96;
    drawCatHead(ctx, spec, headX, headY, { ...pose, blink: 1 }, view, true);

    // Gelembung "Zzz" tidur imut
    ctx.save();
    ctx.font = '900 36px system-ui, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    const zFloat = Math.sin(tailPhase * 0.8) * 6;
    for (const [zx, zy, txt, sz] of [
      [headX + dir * 102, headY - 64 + zFloat, 'z', 30],
      [headX + dir * 130, headY - 96 - zFloat, 'Z', 42],
    ] as const) {
      ctx.font = `900 ${sz}px system-ui, Segoe UI, sans-serif`;
      ctx.lineWidth = 8;
      ctx.strokeStyle = spec.ink;
      ctx.strokeText(txt, zx, zy);
      ctx.fillStyle = '#9fe3ff';
      ctx.fillText(txt, zx, zy);
    }
    ctx.restore();
  } else if (stance === 'sit') {
    // =========================================================================
    // POSE 2: SIT (Duduk manis klasik kucing warkop — front / 3-4 / side / back)
    // =========================================================================
    const bodyX = isSide ? CX - dir * 24 : CX;
    const bodyTopY = 344 + breath * 0.4;
    const bodyBotY = CAT_SOLE_Y - 18;
    const bodyW = isSide ? 116 : view === 'front' || isBack ? 108 : 114;

    // Ekor bergoyang di belakang/samping (saat back view digambar sekali di lapisan depan punggung)
    if (!isBack) {
      const tailAnchorX = isSide ? bodyX - dir * 82 : bodyX - dir * 68;
      drawTabbyTail(ctx, spec, tailAnchorX, bodyBotY - 22, -dir, tailPhase, isPuffed, false);
    }

    // Paha belakang (haunch) menonjol khas kucing duduk
    if (!isBack && view !== 'front') {
      const hxPos = bodyX - dir * 48;
      const haunchPath = () => {
        ctx.beginPath();
        ctx.ellipse(hxPos, bodyBotY - 48, 62, 74, dir * 0.14, 0, TAU);
      };
      inked(ctx, haunchPath, spec.furShadow, spec.ink, 5.2, 2.8, 4);
      // Cakar kaki belakang
      drawPaw(ctx, spec, hxPos - dir * 18, CAT_SOLE_Y - 16, 28, 17, false);
    } else if (view === 'front' || isBack) {
      for (const s of [-1, 1]) {
        const hp = () => {
          ctx.beginPath();
          ctx.ellipse(bodyX + s * 66, bodyBotY - 46, 46, 66, s * 0.12, 0, TAU);
        };
        inked(ctx, hp, spec.furShadow, spec.ink, 5, 2.4, 3.8);
      }
    }

    // Badan duduk berbentuk pir lembut
    const torsoPath = () => {
      ctx.beginPath();
      ctx.moveTo(bodyX, bodyTopY);
      ctx.bezierCurveTo(bodyX + bodyW * 0.72, bodyTopY + 10, bodyX + bodyW * 0.96, bodyBotY - 72, bodyX + bodyW * 0.82, bodyBotY);
      ctx.quadraticCurveTo(bodyX, bodyBotY + 24, bodyX - bodyW * 0.82, bodyBotY);
      ctx.bezierCurveTo(bodyX - bodyW * 0.96, bodyBotY - 72, bodyX - bodyW * 0.72, bodyTopY + 10, bodyX, bodyTopY);
      ctx.closePath();
    };
    inked(ctx, torsoPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);

    // Clip: bulu dada krem + loreng tabby punggung & samping
    ctx.save();
    torsoPath();
    ctx.clip();

    if (spec.calicoPatch) {
      ctx.fillStyle = spec.calicoPatch;
      ctx.beginPath();
      ctx.ellipse(bodyX - dir * 44, bodyTopY + 95, 65, 72, 0.2, 0, TAU);
      ctx.fill();
    }

    if (!isBack) {
      // Bulu dada & perut krem lembut (khas Cat_diffuse.jpg)
      const chestX = isSide ? bodyX + dir * 56 : bodyX + facing * 22;
      ctx.fillStyle = spec.cream;
      ctx.beginPath();
      ctx.ellipse(chestX, bodyTopY + 115, isSide ? 48 : 54, 108, 0, 0, TAU);
      ctx.fill();
    }

    // Loreng tabby melengkung di punggung / sisi badan
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 13;
    if (isBack) {
      // Garis punggung tengah + tulang ikan mackerel tabby
      ctx.beginPath();
      ctx.moveTo(bodyX, bodyTopY);
      ctx.lineTo(bodyX, bodyBotY + 10);
      ctx.stroke();
      for (const yy of [bodyTopY + 55, bodyTopY + 105, bodyTopY + 155]) {
        ctx.beginPath();
        ctx.moveTo(bodyX - 95, yy + 14);
        ctx.quadraticCurveTo(bodyX, yy - 12, bodyX + 95, yy + 14);
        ctx.stroke();
      }
    } else {
      const sideS = -dir;
      const sidesToStripe = view === 'front' ? [-1, 1] : [sideS];
      for (const s of sidesToStripe) {
        for (const yy of [bodyTopY + 62, bodyTopY + 110, bodyTopY + 158]) {
          ctx.beginPath();
          ctx.moveTo(bodyX + s * bodyW * 0.92, yy - 10);
          ctx.quadraticCurveTo(bodyX + s * bodyW * 0.56, yy + 4, bodyX + s * bodyW * 0.34, yy + 14);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    torsoPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    // Kaki depan duduk rapi (atau 1 kaki diangkat melambai / minta gorengan!)
    if (!isBack) {
      const pawSpread = isSide ? 18 : 34;
      const baseFrontX = isSide ? bodyX + dir * 48 : bodyX + facing * 14;
      const leftUp = pawRaise === 'left';
      const rightUp = pawRaise === 'right';

      const hasPawTarget = pose.pawAngle !== undefined || pose.pawReach !== undefined;
      const pawReach = Math.max(0.5, Math.min(1.8, pose.pawReach ?? 1));
      const pawRad = ((pose.pawAngle ?? -38) * Math.PI) / 180;

      // Kaki depan kiri
      if (leftUp) {
        const sx = baseFrontX - pawSpread;
        const sy = bodyTopY + 64;
        const tx = hasPawTarget ? sx - Math.cos(pawRad) * 56 * pawReach : sx - 38;
        const ty = hasPawTarget ? sy + Math.sin(pawRad) * 56 * pawReach : bodyTopY + 26;
        drawLeg(ctx, spec, sx, sy, tx, ty, 21, 19, false, true, true);
      } else {
        drawLeg(ctx, spec, baseFrontX - pawSpread, bodyTopY + 66, baseFrontX - pawSpread - 4, CAT_SOLE_Y - 18, 22, 18, isSide && dir > 0, false, true);
      }

      // Kaki depan kanan
      if (rightUp) {
        const sx = baseFrontX + pawSpread;
        const sy = bodyTopY + 64;
        const tx = hasPawTarget ? sx + Math.cos(pawRad) * 58 * pawReach : sx + 42;
        const ty = hasPawTarget ? sy + Math.sin(pawRad) * 58 * pawReach : bodyTopY + 22;
        drawLeg(ctx, spec, sx, sy, tx, ty, 21, 19, false, true, true);
      } else {
        drawLeg(ctx, spec, baseFrontX + pawSpread, bodyTopY + 66, baseFrontX + pawSpread + 4, CAT_SOLE_Y - 18, 22, 18, isSide && dir < 0, false, true);
      }
    }

    // Kalung opsional
    drawCollar(ctx, spec, isSide ? bodyX + dir * 32 : bodyX, bodyTopY + 12, 108, isBack);

    // Kepala
    headX = isSide ? bodyX + dir * 42 : bodyX + facing * 12;
    headY = 250 + breath * 0.8;
    headTopY = headY - 98;
    drawCatHead(ctx, spec, headX, headY, pose, view, false);

    // Saat back view, ekor menonjol rapi di atas pinggul belakang (backThreeQuarter melengkung ke sisi menjauhi wajah)
    if (isBack) {
      drawTabbyTail(ctx, spec, CX, bodyBotY - 16, isBack34 ? -dir : 1, tailPhase, isPuffed, false);
    }
  } else {
    // =========================================================================
    // POSE 3: STAND / WALK / JUMP (4 Kaki Dinamis — cocok untuk jalan di trotoar!)
    // =========================================================================
    const isWalk = stance === 'walk';
    const isJump = stance === 'jump';
    const isProfile = isSide || view === 'threeQuarter' || isBack34;
    const torsoW = isProfile ? 132 : 96;
    const torsoH = isJump ? 66 : 74;
    const torsoY = isJump ? 404 : 422 + breath * 0.4;
    const torsoX = CX;

    const catPlanted = isWalk && (pose.gait ?? 'planted') === 'planted';
    const pf1 = catPlanted ? plantedFoot(walkPhase, 1, 48, 28) : null;
    const pf2 = catPlanted ? plantedFoot(walkPhase, -1, 48, 28) : null;
    const dx1 = pf1 ? pf1.dx : Math.sin(walkPhase * TAU) * 48;
    const dx2 = pf2 ? pf2.dx : Math.sin((walkPhase + 0.5) * TAU) * 48;
    const lift1 = pf1 ? pf1.lift : Math.max(0, Math.cos(walkPhase * TAU)) * 28;
    const lift2 = pf2 ? pf2.lift : Math.max(0, Math.cos((walkPhase + 0.5) * TAU)) * 28;

    // Ekor dari pinggul belakang (saat back view digambar sekali di lapisan depan punggung)
    if (!isBack) {
      const hipX = isProfile ? torsoX - dir * (torsoW * 0.86) : torsoX;
      drawTabbyTail(ctx, spec, hipX, torsoY - 18, isProfile ? -dir : 1, tailPhase, isPuffed, false);
    }

    // Kaki sisi jauh (belakang layar — sedikit digelapkan untuk kedalaman 3D)
    const backHipX = isProfile ? torsoX - dir * 78 : torsoX - 42;
    const frontShoulderX = isProfile ? torsoX + dir * 74 : torsoX + 42;
    const soleY = CAT_SOLE_Y - 18;

    // Regang / membungkuk: badan & kepala berputar di sekitar pinggul belakang, cakar depan tetap di lantai.
    const stretch = !isWalk && !isJump && isProfile ? Math.max(0, Math.min(1, pose.stretch ?? 0)) : 0;
    const sAng = dir * stretch * 0.24;
    const pivotX = torsoX - dir * torsoW * 0.7;
    const pivotY = torsoY;
    const rp = (x: number, y: number): [number, number] => {
      if (stretch === 0) return [x, y];
      const dx = x - pivotX;
      const dy = y - pivotY;
      const c = Math.cos(sAng);
      const sn = Math.sin(sAng);
      return [pivotX + dx * c - dy * sn, pivotY + dx * sn + dy * c];
    };
    const reach = dir * stretch * 36;

    const raiseFarFront = !isBack && isProfile && ((dir > 0 && pawRaise === 'left') || (dir < 0 && pawRaise === 'right'));
    const raiseNearFront =
      !isBack && (isProfile ? (dir > 0 && pawRaise === 'right') || (dir < 0 && pawRaise === 'left') : pawRaise === 'right');
    const raiseNearLeft = !isBack && !isProfile && pawRaise === 'left';

    if (isJump) {
      drawLeg(ctx, spec, backHipX - dir * 10, torsoY + 26, backHipX - dir * 68, soleY - 22, 24, 17, true, true);
      drawLeg(ctx, spec, frontShoulderX - dir * 8, torsoY + 22, frontShoulderX + dir * 62, soleY - 52, 22, 17, true, true);
    } else if (isWalk) {
      drawLeg(ctx, spec, backHipX, torsoY + 26, backHipX + dir * dx2 * 0.92, soleY - lift2, 24, 17, true, false);
      drawLeg(ctx, spec, frontShoulderX, torsoY + 26, frontShoulderX + dir * dx1, soleY - lift1, 22, 17, true, false);
    } else {
      drawLeg(ctx, spec, backHipX - dir * 12, torsoY + 26, backHipX - dir * 18, soleY, 24, 17, true, false);
      const [fsx, fsy] = rp(frontShoulderX - dir * 12, torsoY + 26);
      if (raiseFarFront) {
        const hasPawTarget = pose.pawAngle !== undefined || pose.pawReach !== undefined;
        const pawReach = Math.max(0.5, Math.min(1.8, pose.pawReach ?? 1));
        const pawRad = ((pose.pawAngle ?? -30) * Math.PI) / 180;
        const [fpx, fpy] = hasPawTarget
          ? rp(frontShoulderX - dir * 12 + dir * Math.cos(pawRad) * 60 * pawReach, torsoY + 26 + Math.sin(pawRad) * 60 * pawReach)
          : rp(frontShoulderX - dir * 12 + dir * 52, torsoY - 4);
        drawLeg(ctx, spec, fsx, fsy, fpx, fpy, 22, 17, true, true);
      } else {
        drawLeg(ctx, spec, fsx, fsy, frontShoulderX - dir * 12 + reach, soleY, 22, 17, true, false);
      }
    }

    // Badan horizontal kucing (melengkung ke atas saat jump / shock!)
    const arch = isJump || isPuffed ? -26 : 0;
    if (stretch > 0) {
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(sAng);
      ctx.translate(-pivotX, -pivotY);
    }
    const bodyPath = () => {
      ctx.beginPath();
      ctx.moveTo(torsoX - torsoW, torsoY + 4);
      ctx.bezierCurveTo(
        torsoX - torsoW * 0.72,
        torsoY - torsoH + arch,
        torsoX + torsoW * 0.72,
        torsoY - torsoH + arch,
        torsoX + torsoW,
        torsoY + 2,
      );
      ctx.bezierCurveTo(
        torsoX + torsoW * 0.94,
        torsoY + torsoH * 0.88,
        torsoX - torsoW * 0.94,
        torsoY + torsoH * 0.88,
        torsoX - torsoW,
        torsoY + 4,
      );
      ctx.closePath();
    };
    inked(ctx, bodyPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);

    // Clip: perut krem + loreng mackerel tabby punggung
    ctx.save();
    bodyPath();
    ctx.clip();

    if (spec.calicoPatch) {
      ctx.fillStyle = spec.calicoPatch;
      ctx.beginPath();
      ctx.ellipse(torsoX - dir * 32, torsoY - 18, 66, 48, -0.15, 0, TAU);
      ctx.fill();
    }

    // Perut & dada krem (hanya tampak depan/samping, bukan pada tampak punggung/belakang)
    if (!isBack) {
      ctx.fillStyle = spec.cream;
      ctx.beginPath();
      ctx.ellipse(torsoX + (isProfile ? dir * 18 : 0), torsoY + torsoH * 0.62, torsoW * 0.82, torsoH * 0.45, 0, 0, TAU);
      ctx.fill();
    }

    // 4 loreng melengkung khas tabby mackerel di punggung
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 14;
    for (const ox of [-72, -26, 20, 66]) {
      ctx.beginPath();
      ctx.moveTo(torsoX + ox, torsoY - torsoH - 18);
      ctx.quadraticCurveTo(torsoX + ox + dir * 14, torsoY - 12, torsoX + ox - dir * 6, torsoY + 34);
      ctx.stroke();
    }
    ctx.restore();

    bodyPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();
    if (stretch > 0) ctx.restore();

    // Kaki sisi dekat (foreground)
    const nearHipX = isProfile ? torsoX - dir * 62 : torsoX - 30;
    const nearShoulderX = isProfile ? torsoX + dir * 88 : torsoX + 30;

    if (isJump) {
      drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX - dir * 56, soleY - 12, 25, 18, false, true, true);
      drawLeg(ctx, spec, nearShoulderX, torsoY + 26, nearShoulderX + dir * 72, soleY - 62, 23, 18, false, true, true);
    } else if (isWalk) {
      drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX + dir * dx1, soleY - lift1, 25, 18, false, false, true);
      drawLeg(ctx, spec, nearShoulderX, torsoY + 28, nearShoulderX + dir * dx2 * 1.04, soleY - lift2, 23, 18, false, false, true);
    } else {
      if (raiseNearLeft) {
        const [lsx, lsy] = rp(nearHipX, torsoY + 26);
        const hasPawTarget = pose.pawAngle !== undefined || pose.pawReach !== undefined;
        const pawReach = Math.max(0.5, Math.min(1.8, pose.pawReach ?? 1));
        const pawRad = ((pose.pawAngle ?? -30) * Math.PI) / 180;
        const [lpx, lpy] = hasPawTarget
          ? rp(nearHipX - Math.cos(pawRad) * 60 * pawReach, torsoY + 26 + Math.sin(pawRad) * 60 * pawReach)
          : rp(nearHipX - 52, torsoY - 4);
        drawLeg(ctx, spec, lsx, lsy, lpx, lpy, 22, 18, false, true, true);
      } else {
        drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX - dir * 6, soleY, 25, 18, false, false, true);
      }
      if (raiseNearFront) {
        const sideDir = isProfile ? dir : 1;
        const [nsx, nsy] = rp(nearShoulderX, torsoY + 26);
        const hasPawTarget = pose.pawAngle !== undefined || pose.pawReach !== undefined;
        const pawReach = Math.max(0.5, Math.min(1.8, pose.pawReach ?? 1));
        const pawRad = ((pose.pawAngle ?? -30) * Math.PI) / 180;
        const [npx, npy] = hasPawTarget
          ? rp(nearShoulderX + sideDir * Math.cos(pawRad) * 60 * pawReach, torsoY + 26 + Math.sin(pawRad) * 60 * pawReach)
          : rp(nearShoulderX + sideDir * 52, torsoY - 4);
        drawLeg(ctx, spec, nsx, nsy, npx, npy, 22, 18, false, true, true);
      } else {
        const [nsx, nsy] = rp(nearShoulderX, torsoY + 28);
        drawLeg(ctx, spec, nsx, nsy, nearShoulderX + dir * 4 + reach, soleY, 23, 18, false, false, true);
      }
    }

    // Kalung opsional
    const [colX, colY] = rp(isProfile ? torsoX + dir * 102 : torsoX, torsoY - 22);
    drawCollar(ctx, spec, colX, colY, 86, isBack);

    // Kepala (tetap tegak; saat regang ikut turun ke depan seperti mengintip)
    const [hx0, hy0] = rp(
      isProfile ? torsoX + dir * 124 : torsoX + facing * 16,
      torsoY - 82 + (isWalk ? Math.sin(walkPhase * TAU * 2) * 5 : 0),
    );
    headX = hx0 + dir * stretch * 8;
    headY = hy0;
    headTopY = headY - 98;
    drawCatHead(ctx, spec, headX, headY, pose, view, false);

    if (isBack) {
      drawTabbyTail(ctx, spec, CX, torsoY - 10, isBack34 ? -dir : 1, tailPhase, isPuffed, false);
    }
  }

  // --- EFEK KOMIK 2D (shock, anger, sweat, sparkle, question) ---
  const fx = pose.fx !== undefined ? pose.fx : isBack ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, headX, headTopY - 6, 220, spec.ink);

  ctx.restore();
}

// =============================================================================
// 2.5D VOLUMETRIC 360° CAT RIG (`pose.yawDeg !== undefined`)
// =============================================================================

function drawCatHead360(
  ctx: Ctx,
  spec: CatSpec,
  hx: number,
  hy: number,
  pose: CatPose,
  headYawRad: number,
  isSleep: boolean,
  reliefOut?: ReliefPrimitive[],
) {
  const sinY = Math.sin(headYawRad);
  const cosY = Math.cos(headYawRad);
  const pitchOffset = ((pose.pitchDeg ?? 0) * Math.PI) / 180;
  const faceVis = Math.max(-1, Math.min(1, cosY));
  const face = pose.face;
  const blink = typeof pose.blink === 'number' ? pose.blink : pose.blink ? 1 : 0;
  const talkSample: TalkSample =
    typeof pose.talk === 'number'
      ? {
          open: pose.talk,
          shape:
            pose.talk > 0.65
              ? 'wide'
              : pose.talk > 0.3
                ? 'mid'
                : pose.talk > 0.16
                  ? 'small'
                  : 'closed',
        }
      : (pose.talk ?? { open: 0, shape: 'closed' });

  const earTwitch = pose.earTwitch ?? 0;
  const flatEars =
    face === 'angry' || face === 'shock' || face === 'nervous' || face === 'strain'
      ? 20
      : face === 'sad' || face === 'tired' || isSleep
        ? 12
        : 0;
  const perkEars = face === 'idea' || face === 'happy' || face === 'focus' ? -5 : 0;

  const absS = Math.abs(sinY);
  const headRx = 114 - 16 * absS;
  const headRy = 92;
  const headRz = 94;

  // Proyeksi kedua telinga dalam 3D agar selalu sort tepat di belakang vs depan kepala
  const earPts = ([-1, 1] as const).map((side) => {
    const p = rotateYaw3D([side * 70, -headRy * 0.72, 12], headYawRad);
    return { side, ...p };
  });

  const drawEar3D = (ep: (typeof earPts)[number]) => {
    const isBackFacing = cosY < -0.15;
    const earScale = 0.88 + 0.14 * Math.max(-1, Math.min(1, ep.z / 75));
    const tilt = ep.side * (12 + flatEars + perkEars) * (0.4 + 0.6 * Math.abs(cosY)) + earTwitch * 7;
    drawCatEar(ctx, spec, hx + ep.x, hy + ep.y, ep.side, tilt, isBackFacing, earScale);
    if (reliefOut) {
      reliefOut.push({
        kind: 'sphere',
        cx: hx + ep.x,
        cy: hy + ep.y - 18,
        rx: 28 * earScale,
        ry: 42 * earScale,
        z: 100 + ep.z * 0.35,
        heightScale: 0.72,
        ao: 0.9,
      });
    }
  };

  for (const ep of earPts) {
    if (ep.z < 0) drawEar3D(ep);
  }

  // Siluet tengkorak membulat 360° dengan proyeksi moncong 3D lembut
  const muzProjX = sinY * 22;
  const muzBulge = Math.max(0, absS - 0.35) * 18 * Math.sign(sinY || 1);
  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(hx, hy - headRy);
    ctx.bezierCurveTo(
      hx + headRx * 0.84 + Math.max(0, muzBulge),
      hy - headRy,
      hx + headRx * 1.06 + Math.max(0, muzBulge),
      hy - headRy * 0.24,
      hx + headRx * 1.04 + Math.max(0, muzBulge * 1.15),
      hy + headRy * 0.22,
    );
    ctx.bezierCurveTo(
      hx + headRx * 0.92,
      hy + headRy * 0.88,
      hx + headRx * 0.44,
      hy + headRy * 1.02,
      hx,
      hy + headRy * 1.02,
    );
    ctx.bezierCurveTo(
      hx - headRx * 0.44,
      hy + headRy * 1.02,
      hx - headRx * 0.92,
      hy + headRy * 0.88,
      hx - headRx * 1.04 + Math.min(0, muzBulge * 1.15),
      hy + headRy * 0.22,
    );
    ctx.bezierCurveTo(
      hx - headRx * 1.06 + Math.min(0, muzBulge),
      hy - headRy * 0.24,
      hx - headRx * 0.84 + Math.min(0, muzBulge),
      hy - headRy,
      hx,
      hy - headRy,
    );
    ctx.closePath();
  };

  inked(ctx, headPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);
  if (reliefOut) {
    reliefOut.push({
      kind: 'sphere',
      cx: hx + muzBulge * 0.2,
      cy: hy,
      rx: headRx * 1.05,
      ry: headRy * 1.02,
      z: 100,
      heightScale: 1.0,
    });
  }

  // Clip detail di dalam kepala
  ctx.save();
  headPath();
  ctx.clip();

  // Highlight mahkota & bayangan dagu
  ctx.fillStyle = spec.furHighlight;
  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  ctx.ellipse(hx - headRx * 0.08, hy - headRy * 0.48, headRx * 0.56, headRy * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = spec.furShadow;
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.ellipse(hx, hy + headRy * 0.72, headRx * 0.64, headRy * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bercak Calico berputar mulus mengelilingi kepala
  if (spec.calicoPatch) {
    const cp1 = rotateYaw3D([56, -42, 42], headYawRad);
    if (cp1.z > -headRz * 0.7) {
      ctx.fillStyle = spec.calicoPatch;
      ctx.beginPath();
      ctx.ellipse(hx + cp1.x, hy + cp1.y, 44 * Math.max(0.45, Math.abs(Math.cos(headYawRad - 0.6))), 38, 0.2, 0, TAU);
      ctx.fill();
    }
    const cp2 = rotateYaw3D([-62, -32, 34], headYawRad);
    if (cp2.z > -headRz * 0.7) {
      ctx.fillStyle = spec.stripeColor;
      ctx.beginPath();
      ctx.ellipse(hx + cp2.x, hy + cp2.y, 38 * Math.max(0.45, Math.abs(Math.cos(headYawRad + 0.6))), 34, -0.25, 0, TAU);
      ctx.fill();
    }
  }

  // Loreng dahi M + tengkuk belakang melingkar 360°
  if (cosY > -0.25) {
    const alphaF = Math.min(1, (cosY + 0.25) / 0.45);
    ctx.save();
    ctx.globalAlpha = alphaF;
    const fc = rotateYaw3D([0, -headRy * 0.52, headRz * 0.85], headYawRad);
    const fxS = hx + fc.x;
    const fyShift = Math.sin(pitchOffset) * 14;
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fxS, hy - headRy * 0.88 + fyShift);
    ctx.lineTo(fxS, hy - headRy * 0.4 + fyShift);
    ctx.moveTo(fxS - 22 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.84 + fyShift);
    ctx.quadraticCurveTo(fxS - 15 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.5, fxS - 9 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.36);
    ctx.moveTo(fxS + 22 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.84 + fyShift);
    ctx.quadraticCurveTo(fxS + 15 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.5, fxS + 9 * Math.max(0.4, Math.abs(cosY)), hy - headRy * 0.36);
    ctx.stroke();
    ctx.restore();
  }
  if (cosY < 0.25) {
    const alphaB = Math.min(1, (0.25 - cosY) / 0.45);
    ctx.save();
    ctx.globalAlpha = alphaB;
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 10.5;
    ctx.lineCap = 'round';
    const bShift = -sinY * 32;
    for (const dy of [-headRy * 0.56, -headRy * 0.28, -headRy * 0.02]) {
      ctx.beginPath();
      ctx.moveTo(hx + bShift - headRx * 0.38, hy + dy - 5);
      ctx.quadraticCurveTo(hx + bShift, hy + dy + 11, hx + bShift + headRx * 0.38, hy + dy - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Moncong krem bulat (selalu mengikuti arah hidung 3D)
  const muzPt = rotateYaw3D([0, headRy * 0.4 + Math.sin(pitchOffset) * 16, headRz * 0.84], headYawRad);
  if (muzPt.z > -headRz * 0.45) {
    const mScale = Math.max(0.55, 0.72 + 0.28 * Math.max(0, cosY));
    ctx.fillStyle = spec.cream;
    ctx.beginPath();
    ctx.ellipse(hx + muzPt.x, hy + muzPt.y, 44 * mScale, 32, 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore(); // end head clip

  headPath();
  ctx.strokeStyle = spec.ink;
  ctx.lineWidth = 5.5;
  ctx.stroke();

  // Fitur wajah (mata, alis, hidung, mulut, kumis) pada belahan depan bola kepala
  if (faceVis > -0.22) {
    const pyOff = Math.sin(pitchOffset) * 16;
    const eyes = ([-1, 1] as const)
      .map((s) => {
        const p = rotateYaw3D([s * 46, -headRy * 0.04 + pyOff, headRz * 0.84], headYawRad);
        const foreshorten = Math.max(0.28, (s * sinY * -0.35 + cosY) * 0.85 + 0.15);
        return { s, ...p, foreshorten };
      })
      .filter((e) => e.z > -headRz * 0.18);

    for (const eye of sortByDepthZ(eyes)) {
      const ex = hx + eye.x;
      const ey = hy + eye.y;
      const rx = (face === 'shock' ? 24 : 22) * eye.foreshorten;
      const ry = face === 'shock' ? 25 : face === 'smug' || face === 'tired' ? 15 : 21;

      if (blink >= 0.85 || face === 'laugh' || isSleep) {
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 5.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (face === 'laugh' || (face === 'happy' && !isSleep)) {
          ctx.arc(ex, ey + 6, Math.max(8, 15 * eye.foreshorten), Math.PI * 1.12, Math.PI * 1.88);
        } else if (isSleep) {
          ctx.arc(ex, ey - 2, Math.max(8, 14 * eye.foreshorten), Math.PI * 0.14, Math.PI * 0.86);
        } else {
          ctx.moveTo(ex - rx * 0.8, ey + 2);
          ctx.quadraticCurveTo(ex, ey + 7, ex + rx * 0.8, ey + 2);
        }
        ctx.stroke();
      } else if (face === 'strain') {
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 5.6;
        ctx.beginPath();
        ctx.moveTo(ex + eye.s * rx * 0.7, ey - 11);
        ctx.lineTo(ex - eye.s * rx * 0.45, ey);
        ctx.lineTo(ex + eye.s * rx * 0.7, ey + 11);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
        ctx.fillStyle = spec.eyeRim;
        ctx.fill();

        const irisGrad = ctx.createRadialGradient(ex - 2, ey - 3, 1.5, ex, ey, Math.max(4, rx * 0.88));
        irisGrad.addColorStop(0, '#f4e878');
        irisGrad.addColorStop(0.7, spec.eyeIris);
        irisGrad.addColorStop(1, '#b58d22');
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx * 0.84, ry * 0.84, 0, 0, TAU);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        const pupilW =
          (face === 'shock' ? 0.56 : face === 'happy' || face === 'idea' || face === 'sad' ? 0.42 : face === 'angry' || face === 'smug' || face === 'focus' ? 0.22 : 0.3) *
          rx;
        const pupilH = (face === 'shock' ? 0.68 : 0.72) * ry;
        const lookX = sinY * 4.5;
        ctx.fillStyle = '#181114';
        ctx.beginPath();
        ctx.ellipse(ex + lookX, ey, pupilW, pupilH, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + lookX - pupilW * 0.4 - 2, ey - ry * 0.28, face === 'shock' ? 5.8 : 4.6, 0, TAU);
        ctx.fill();

        const lidClose =
          blink >= 0.35 ? 0.52 : face === 'tired' ? 0.45 : face === 'smug' ? 0.38 : face === 'skeptical' && eye.s > 0 ? 0.36 : 0;
        if (lidClose > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, ey, rx + 2, ry + 2, 0, 0, TAU);
          ctx.clip();
          ctx.fillStyle = spec.furBase;
          ctx.fillRect(ex - rx - 4, ey - ry - 4, (rx + 4) * 2, ry * 2 * lidClose + 4);
          ctx.strokeStyle = spec.ink;
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          ctx.moveTo(ex - rx - 2, ey - ry + ry * 2 * lidClose);
          ctx.lineTo(ex + rx + 2, ey - ry + ry * 2 * lidClose);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
        ctx.strokeStyle = spec.ink;
        ctx.lineWidth = 4.3;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Hidung & mulut :3 / meow terproyeksi 3D
    const nosePt = rotateYaw3D([0, headRy * 0.24 + pyOff, headRz * 0.96], headYawRad);
    if (nosePt.z > -headRz * 0.15) {
      const nx = hx + nosePt.x;
      const ny = hy + nosePt.y;
      const nw = Math.max(5, 11 * Math.max(0.5, cosY));
      ctx.beginPath();
      ctx.moveTo(nx - nw, ny - 5);
      ctx.lineTo(nx + nw, ny - 5);
      ctx.lineTo(nx, ny + 8);
      ctx.closePath();
      ctx.fillStyle = spec.noseColor;
      ctx.fill();
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      const mouthY = ny + 10;
      const isMeowing = talkSample.open > 0.15 || face === 'shock' || face === 'laugh';
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      if (isMeowing) {
        const openH = face === 'shock' ? 26 : face === 'laugh' ? 22 : 11 + talkSample.open * 19;
        const openW = Math.max(7, (talkSample.shape === 'o' ? 14 : 19) * Math.max(0.55, cosY));
        ctx.beginPath();
        ctx.moveTo(nx, ny + 8);
        ctx.lineTo(nx, mouthY + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(nx, mouthY + openH * 0.46, openW, openH * 0.54, 0, 0, TAU);
        ctx.fillStyle = '#5e1a27';
        ctx.fill();
        ctx.stroke();
      } else {
        const mw = Math.max(9, 18 * Math.max(0.5, cosY));
        ctx.beginPath();
        ctx.moveTo(nx, ny + 8);
        ctx.lineTo(nx, mouthY + 5);
        ctx.moveTo(nx - mw, mouthY + 4);
        ctx.quadraticCurveTo(nx - mw * 0.5, mouthY + 15, nx, mouthY + 5);
        ctx.quadraticCurveTo(nx + mw * 0.5, mouthY + 15, nx + mw, mouthY + 4);
        ctx.stroke();
      }
    }

    // Kumis terproyeksi 3D pada pipi kiri & kanan
    for (const s of [-1, 1] as const) {
      const wp = rotateYaw3D([s * 54, headRy * 0.34 + pyOff, headRz * 0.72], headYawRad);
      if (wp.z < -headRz * 0.25) continue;
      const wx = hx + wp.x;
      const wy = hy + wp.y;
      const wDir = s * cosY + sinY * 0.55;
      const wScale = Math.sign(wDir || s) * (0.45 + 0.55 * Math.abs(cosY));
      ctx.strokeStyle = spec.ink;
      ctx.lineWidth = 3.4;
      for (const [dy0, dy1, len] of [
        [-7, -16, 50],
        [1, 0, 56],
        [9, 15, 48],
      ]) {
        ctx.beginPath();
        ctx.moveTo(wx, wy + dy0);
        ctx.quadraticCurveTo(wx + wScale * len * 0.52, wy + dy0 + (dy1 - dy0) * 0.35, wx + wScale * len, wy + dy1);
        ctx.stroke();
      }
    }
  }

  for (const ep of earPts) {
    if (ep.z >= 0) drawEar3D(ep);
  }
}

function drawCat360(
  ctx: Ctx,
  spec: CatSpec,
  pose: CatPose,
  reliefOut?: ReliefPrimitive[],
) {
  ctx.save();
  ctx.clearRect(0, 0, CAT_W, CAT_H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const stance: CatStance = pose.stance ?? 'sit';
  const yawRad = degToRad(pose.yawDeg ?? 0);
  const headYawRad = degToRad(pose.headYawDeg ?? pose.yawDeg ?? 0);
  const sinY = Math.sin(yawRad);
  const cosY = Math.cos(yawRad);
  const dir = sinY >= 0 ? 1 : -1;
  const walkPhase = pose.walkPhase ?? 0;
  const tailPhase = pose.tailPhase ?? walkPhase * TAU;
  const breath = Math.sin(pose.breathPhase ?? tailPhase * 0.7) * 3.5;
  const isPuffed = pose.face === 'shock' || pose.face === 'angry';
  const walkBob = stance === 'walk' ? Math.abs(Math.sin(walkPhase * TAU)) * -12 : 0;
  const jumpLift = stance === 'jump' ? -72 : 0;
  const shockHop = pose.face === 'shock' && stance !== 'jump' ? -16 : 0;
  const leanRad = ((pose.lean ?? 0) * Math.PI) / 180;

  ctx.translate(CX, CAT_SOLE_Y);
  ctx.rotate(leanRad);
  ctx.translate(-CX, -CAT_SOLE_Y + walkBob + jumpLift + shockHop);

  const legItems: { z: number; draw: () => void }[] = [];
  const soleY = CAT_SOLE_Y - 18;
  let headAnchor = { x: CX, y: 245 };

  if (stance === 'sleep') {
    const bodyShiftX = sinY * 14;
    const pRump = rotateYaw3D([0, 0, -68], yawRad);
    const pChest = rotateYaw3D([0, 0, 58], yawRad);
    const by = CAT_SOLE_Y - 76 + breath * 0.4;
    const loafRx = 98 + Math.abs(sinY) * 44;
    const tailAnchor = rotateYaw3D([0, 12, -96], yawRad);
    const loafPath = () => {
      ctx.beginPath();
      ctx.ellipse(CX + bodyShiftX, by + 6, loafRx, 66 - breath * 0.4, 0, 0, TAU);
    };

    const tailDraw = () => {
      drawTabbyTail(ctx, spec, CX + tailAnchor.x, by + tailAnchor.y + 8, sinY >= 0 ? -1 : 1, tailPhase * 0.45, false, true);
    };
    if (tailAnchor.z < 0) tailDraw();

    inked(ctx, loafPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);
    if (reliefOut) {
      reliefOut.push({ kind: 'sphere', cx: CX + bodyShiftX, cy: by + 6, rx: loafRx, ry: 66, z: 40, heightScale: 0.9 });
    }
    ctx.save();
    loafPath();
    ctx.clip();
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 13;
    for (const ox of [-56, -18, 18, 56]) {
      ctx.beginPath();
      ctx.moveTo(CX + bodyShiftX + ox * 0.85, by - 64);
      ctx.quadraticCurveTo(CX + bodyShiftX + ox * 0.95 + sinY * 12, by - 12, CX + bodyShiftX + ox * 0.78, by + 56);
      ctx.stroke();
    }
    ctx.restore();
    loafPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    if (tailAnchor.z >= 0) tailDraw();
    const hp = rotateYaw3D([0, -24, 52], yawRad);
    headAnchor = { x: CX + pChest.x * 0.65 + hp.x * 0.35, y: by - 18 + breath * 0.5 };
    drawCatHead360(ctx, spec, headAnchor.x, headAnchor.y, { ...pose, blink: 1 }, headYawRad, true, reliefOut);
  } else if (stance === 'sit') {
    const bodyTopY = 344 + breath * 0.4;
    const bodyBotY = CAT_SOLE_Y - 18;
    const bodyW = 104 + Math.abs(sinY) * 18;
    const tailBase = rotateYaw3D([0, bodyBotY - 24, -74], yawRad);

    if (tailBase.z < 0) {
      drawTabbyTail(ctx, spec, CX + tailBase.x, tailBase.y, sinY >= 0 ? -1 : 1, tailPhase, isPuffed, false);
    }

    // Haunches kiri/kanan di-sort berdasarkan Z
    for (const s of [-1, 1] as const) {
      const hp = rotateYaw3D([s * 54, bodyBotY - 46, -24], yawRad);
      legItems.push({
        z: hp.z,
        draw: () => {
          const haunchPath = () => {
            ctx.beginPath();
            ctx.ellipse(CX + hp.x, hp.y, 48 + Math.abs(sinY) * 14, 68, (s * 0.12) + sinY * 0.1, 0, TAU);
          };
          inked(ctx, haunchPath, hp.z < 0 ? spec.furShadow : spec.furBase, spec.ink, 5, 2.5, 3.8);
          drawPaw(ctx, spec, CX + hp.x + sinY * 14, CAT_SOLE_Y - 16, 26, 16, false);
        },
      });
    }
    for (const item of legItems) if (item.z < 0) item.draw();

    const torsoPath = () => {
      const offX = -sinY * 16;
      ctx.beginPath();
      ctx.moveTo(CX + offX, bodyTopY);
      ctx.bezierCurveTo(CX + offX + bodyW * 0.76, bodyTopY + 10, CX + offX + bodyW * 0.96, bodyBotY - 72, CX + offX + bodyW * 0.82, bodyBotY);
      ctx.quadraticCurveTo(CX + offX, bodyBotY + 24, CX + offX - bodyW * 0.82, bodyBotY);
      ctx.bezierCurveTo(CX + offX - bodyW * 0.96, bodyBotY - 72, CX + offX - bodyW * 0.76, bodyTopY + 10, CX + offX, bodyTopY);
      ctx.closePath();
    };
    inked(ctx, torsoPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);
    if (reliefOut) {
      reliefOut.push({ kind: 'capsule', x1: CX - sinY * 14, y1: bodyTopY + 34, x2: CX - sinY * 14, y2: bodyBotY - 32, radius: bodyW * 0.78, z: 50, heightScale: 0.96 });
    }

    ctx.save();
    torsoPath();
    ctx.clip();
    if (cosY > -0.25) {
      ctx.fillStyle = spec.cream;
      ctx.globalAlpha = Math.min(1, (cosY + 0.25) / 0.45);
      ctx.beginPath();
      ctx.ellipse(CX + sinY * 34, bodyTopY + 115, 50 * Math.max(0.55, cosY * 0.7 + 0.3), 106, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 12;
    const stripeShift = -sinY * 36;
    for (const yy of [bodyTopY + 58, bodyTopY + 108, bodyTopY + 156]) {
      ctx.beginPath();
      ctx.moveTo(CX + stripeShift - 86, yy + 10);
      ctx.quadraticCurveTo(CX + stripeShift, yy - 12, CX + stripeShift + 86, yy + 10);
      ctx.stroke();
    }
    ctx.restore();
    torsoPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    for (const item of legItems) if (item.z >= 0) item.draw();

    // Kaki depan duduk
    for (const s of [-1, 1] as const) {
      const fp = rotateYaw3D([s * 30, bodyTopY + 68, 48], yawRad);
      if (fp.z > -38) {
        drawLeg(ctx, spec, CX + fp.x, fp.y, CX + fp.x + s * 2, CAT_SOLE_Y - 18, 21, 17, fp.z < 12, false, true);
      }
    }

    const colP = rotateYaw3D([0, bodyTopY + 14, 30], yawRad);
    drawCollar(ctx, spec, CX + colP.x, colP.y, 98, cosY < -0.15);

    const hP = rotateYaw3D([0, 250 + breath * 0.8, 18], yawRad);
    headAnchor = { x: CX + hP.x, y: hP.y };
    drawCatHead360(ctx, spec, headAnchor.x, headAnchor.y, pose, headYawRad, false, reliefOut);

    if (tailBase.z >= 0) {
      drawTabbyTail(ctx, spec, CX + tailBase.x, tailBase.y, sinY >= 0 ? -1 : 1, tailPhase, isPuffed, false);
    }
  } else {
    // STAND / WALK / JUMP 360° (4-kaki penuh berputar mulus sepanjang sumbu Y!)
    const isWalk = stance === 'walk';
    const isJump = stance === 'jump';
    const torsoY = isJump ? 404 : 422 + breath * 0.4;
    const catPlanted = isWalk && (pose.gait ?? 'planted') === 'planted';
    const pf1 = catPlanted ? plantedFoot(walkPhase, 1, 48, 28) : null;
    const pf2 = catPlanted ? plantedFoot(walkPhase, -1, 48, 28) : null;
    const dz1 = pf1 ? pf1.dx : Math.sin(walkPhase * TAU) * 48;
    const dz2 = pf2 ? pf2.dx : Math.sin((walkPhase + 0.5) * TAU) * 48;
    const lift1 = pf1 ? pf1.lift : Math.max(0, Math.cos(walkPhase * TAU)) * 28;
    const lift2 = pf2 ? pf2.lift : Math.max(0, Math.cos((walkPhase + 0.5) * TAU)) * 28;

    const pRump = rotateYaw3D([0, torsoY, -78], yawRad);
    const pChest = rotateYaw3D([0, torsoY - 4, 78], yawRad);
    const bodySpanX = Math.abs(pChest.x - pRump.x);
    const torsoRx = Math.max(82, bodySpanX * 0.55 + 68);
    const torsoRy = isJump ? 66 : 72;

    const tailBase = rotateYaw3D([0, torsoY - 14, -92], yawRad);
    const tailDir = Math.abs(sinY) > 0.22 ? -dir : 1;
    if (tailBase.z < 0) {
      drawTabbyTail(ctx, spec, CX + tailBase.x, tailBase.y, tailDir, tailPhase, isPuffed, false);
    }

    // 4 kaki: [sideX, hipZ, strideDz, lift, isFront]
    const quadLegs: [number, number, number, number, boolean][] = [
      [-32, -68, isWalk ? dz2 : 0, isWalk ? lift2 : isJump ? 22 : 0, false],
      [32, -68, isWalk ? dz1 : 0, isWalk ? lift1 : isJump ? 14 : 0, false],
      [-32, 72, isWalk ? dz1 : 0, isWalk ? lift1 : isJump ? 54 : 0, true],
      [32, 72, isWalk ? dz2 * 1.02 : 0, isWalk ? lift2 : isJump ? 60 : 0, true],
    ];
    for (const [lx, lz, stride, lift, isFront] of quadLegs) {
      const top = rotateYaw3D([lx, torsoY + 26, lz], yawRad);
      const bot = rotateYaw3D([lx * 0.94, soleY - lift, lz + (isJump ? (isFront ? 58 : -54) : stride)], yawRad);
      const isDark = top.z < -8;
      legItems.push({
        z: top.z,
        draw: () => {
          drawLeg(ctx, spec, CX + top.x, top.y, CX + bot.x, bot.y, isFront ? 22 : 24, 17, isDark, isJump, top.z >= 0);
          if (reliefOut) {
            reliefOut.push({ kind: 'capsule', x1: CX + top.x, y1: top.y, x2: CX + bot.x, y2: bot.y, radius: 20, z: 30 + top.z * 0.4, ao: isDark ? 0.84 : 0.94 });
          }
        },
      });
    }
    const sortedLegs = sortByDepthZ(legItems);
    for (const item of sortedLegs) if (item.z < 0) item.draw();

    const arch = isJump || isPuffed ? -24 : 0;
    const midX = CX + (pRump.x + pChest.x) * 0.5;
    const bodyPath = () => {
      ctx.beginPath();
      ctx.moveTo(midX - torsoRx, torsoY + 4);
      ctx.bezierCurveTo(midX - torsoRx * 0.7, torsoY - torsoRy + arch, midX + torsoRx * 0.7, torsoY - torsoRy + arch, midX + torsoRx, torsoY + 2);
      ctx.bezierCurveTo(midX + torsoRx * 0.94, torsoY + torsoRy * 0.88, midX - torsoRx * 0.94, torsoY + torsoRy * 0.88, midX - torsoRx, torsoY + 4);
      ctx.closePath();
    };
    inked(ctx, bodyPath, spec.furBase, spec.ink, 5.5, 3.2, 4.8);
    if (reliefOut) {
      reliefOut.push({ kind: 'capsule', x1: CX + pRump.x * 0.85, y1: torsoY, x2: CX + pChest.x * 0.85, y2: torsoY - 4, radius: torsoRy * 0.92, z: 50, heightScale: 0.96 });
    }

    ctx.save();
    bodyPath();
    ctx.clip();
    if (cosY > -0.25) {
      ctx.fillStyle = spec.cream;
      ctx.globalAlpha = Math.min(1, (cosY + 0.25) / 0.45);
      ctx.beginPath();
      ctx.ellipse(midX + pChest.x * 0.35, torsoY + torsoRy * 0.58, torsoRx * 0.75, torsoRy * 0.44, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 13;
    for (const t of [-0.55, -0.18, 0.18, 0.55]) {
      const sx = midX + t * torsoRx;
      ctx.beginPath();
      ctx.moveTo(sx, torsoY - torsoRy - 14);
      ctx.quadraticCurveTo(sx + dir * 12, torsoY - 10, sx - dir * 5, torsoY + 34);
      ctx.stroke();
    }
    ctx.restore();
    bodyPath();
    ctx.strokeStyle = spec.ink;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    for (const item of sortedLegs) if (item.z >= 0) item.draw();

    const colP = rotateYaw3D([0, torsoY - 22, 86], yawRad);
    drawCollar(ctx, spec, CX + colP.x, colP.y, 82, cosY < -0.15);

    const hP = rotateYaw3D([0, torsoY - 84 + (isWalk ? Math.sin(walkPhase * TAU * 2) * 4 : 0), 106], yawRad);
    headAnchor = { x: CX + hP.x, y: hP.y };
    drawCatHead360(ctx, spec, headAnchor.x, headAnchor.y, pose, headYawRad, false, reliefOut);

    if (tailBase.z >= 0) {
      drawTabbyTail(ctx, spec, CX + tailBase.x, tailBase.y, tailDir, tailPhase, isPuffed, false);
    }
  }

  const fx = pose.fx !== undefined ? pose.fx : cosY < -0.2 ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, headAnchor.x, headAnchor.y - 104, 220, spec.ink);
  ctx.restore();
}
