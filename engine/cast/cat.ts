import { drawComicFx, type ComicFx, type Expression } from './expressions';
import type { TalkSample } from './lipsync';
import type { ActorView } from './nusantara';

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
  /** Fase goyangan ekor kontinyu (radian atau `frame * 0.14`). */
  tailPhase?: number;
  /** -1..1 gerak kuping / ear twitch halus. */
  earTwitch?: number;
  /** Angkat kaki depan lucu (melambai / minta gorengan / mengais). */
  pawRaise?: 'none' | 'left' | 'right';
  /** Efek komik 2D di sekitar kepala (otomatis mengikuti ekspresi jika tidak diisi). */
  fx?: ComicFx;
  /** Kemiringan badan (derajat). */
  lean?: number;
  /** -1..1 arah hadap wajah / arah gerak (`+` kanan, `-` kiri). */
  facing?: number;
  /** Fase napas halus (terutama terlihat saat `sleep` & `sit`). */
  breathPhase?: number;
};

export const CAT_W = 720;
export const CAT_H = 660;
export const CAT_SOLE_Y = 595;

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
  const sway = Math.sin(phase) * (puffed ? 10 : 28);
  const swayTip = Math.sin(phase - 0.7) * (puffed ? 14 : 38);
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
    c1x = baseX + dir * 72;
    c1y = baseY + 14;
    c2x = baseX + dir * 110;
    c2y = baseY - 22 + sway * 0.25;
    p3x = baseX + dir * 68;
    p3y = baseY - 46 + swayTip * 0.2;
  } else if (puffed) {
    // Ekor mengembang tegak & kaku saat shock / marah!
    c1x = baseX + dir * 52;
    c1y = baseY - 58;
    c2x = baseX + dir * 82 + sway;
    c2y = baseY - 148;
    p3x = baseX + dir * 64 + swayTip;
    p3y = baseY - 208;
  } else {
    // Ekor berbentuk huruf S anggun bergoyang alami
    c1x = baseX + dir * 64;
    c1y = baseY - 18;
    c2x = baseX + dir * 102 + sway;
    c2y = baseY - 115;
    p3x = baseX + dir * 70 + swayTip;
    p3y = baseY - 178 + Math.cos(phase) * 14;
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
  const isBack = view === 'back';
  const isSide = view === 'side';
  const facing = pose.facing ?? (isSide ? 1 : view === 'threeQuarter' ? 0.32 : 0);
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
    face === 'angry' || face === 'shock' || face === 'nervous'
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
    // Tampak belakang kepala: loreng tabby punggung tengkuk
    ctx.strokeStyle = spec.stripeColor;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    for (const dy of [-headH * 0.28, -headH * 0.06, headH * 0.16]) {
      ctx.beginPath();
      ctx.moveTo(-headW * 0.34, dy - 6);
      ctx.quadraticCurveTo(0, dy + 14, headW * 0.34, dy - 6);
      ctx.stroke();
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

      // Alis ekspresif (untuk emosi kuat: angry, sad, nervous, skeptical, shock, focus)
      if (!isSleep && (face === 'angry' || face === 'sad' || face === 'nervous' || face === 'skeptical' || face === 'focus' || face === 'smug')) {
        const browY = eyeY - ry - 11;
        const angle =
          face === 'angry'
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
export function drawCat(ctx: Ctx, spec: CatSpec, pose: CatPose) {
  ctx.save();
  ctx.clearRect(0, 0, CAT_W, CAT_H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const stance: CatStance = pose.stance ?? 'sit';
  const view: ActorView = pose.view ?? 'threeQuarter';
  const isBack = view === 'back';
  const isSide = view === 'side';
  const facing = pose.facing ?? (isSide ? 1 : view === 'threeQuarter' ? 0.32 : 0);
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

    // Ekor bergoyang di belakang/samping
    const tailAnchorX = isBack ? CX : isSide ? bodyX - dir * 82 : bodyX - dir * 68;
    drawTabbyTail(ctx, spec, tailAnchorX, bodyBotY - 22, isBack ? 1 : -dir, tailPhase, isPuffed, false);

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
      const sideS = isSide ? -dir : -1;
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

      // Kaki depan kiri
      if (leftUp) {
        drawLeg(ctx, spec, baseFrontX - pawSpread, bodyTopY + 64, baseFrontX - pawSpread - 38, bodyTopY + 26, 21, 19, false, true, true);
      } else {
        drawLeg(ctx, spec, baseFrontX - pawSpread, bodyTopY + 66, baseFrontX - pawSpread - 4, CAT_SOLE_Y - 18, 22, 18, isSide && dir > 0, false, true);
      }

      // Kaki depan kanan
      if (rightUp) {
        drawLeg(ctx, spec, baseFrontX + pawSpread, bodyTopY + 64, baseFrontX + pawSpread + 42, bodyTopY + 22, 21, 19, false, true, true);
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

    // Saat back view, ekor menonjol rapi di atas pinggul belakang
    if (isBack) {
      drawTabbyTail(ctx, spec, CX, bodyBotY - 16, 1, tailPhase, isPuffed, false);
    }
  } else {
    // =========================================================================
    // POSE 3: STAND / WALK / JUMP (4 Kaki Dinamis — cocok untuk jalan di trotoar!)
    // =========================================================================
    const isWalk = stance === 'walk';
    const isJump = stance === 'jump';
    const isProfile = isSide || view === 'threeQuarter';
    const torsoW = isProfile ? 132 : 96;
    const torsoH = isJump ? 66 : 74;
    const torsoY = isJump ? 404 : 422 + breath * 0.4;
    const torsoX = CX;

    const p1 = Math.sin(walkPhase * TAU);
    const p2 = Math.sin((walkPhase + 0.5) * TAU);
    const lift1 = Math.max(0, Math.cos(walkPhase * TAU)) * 28;
    const lift2 = Math.max(0, Math.cos((walkPhase + 0.5) * TAU)) * 28;

    // Ekor dari pinggul belakang
    const hipX = isProfile ? torsoX - dir * (torsoW * 0.86) : torsoX;
    drawTabbyTail(ctx, spec, hipX, torsoY - 18, isProfile ? -dir : 1, tailPhase, isPuffed, false);

    // Kaki sisi jauh (belakang layar — sedikit digelapkan untuk kedalaman 3D)
    const backHipX = isProfile ? torsoX - dir * 78 : torsoX - 42;
    const frontShoulderX = isProfile ? torsoX + dir * 74 : torsoX + 42;
    const soleY = CAT_SOLE_Y - 18;

    if (isJump) {
      drawLeg(ctx, spec, backHipX - dir * 10, torsoY + 26, backHipX - dir * 68, soleY - 22, 24, 17, true, true);
      drawLeg(ctx, spec, frontShoulderX - dir * 8, torsoY + 22, frontShoulderX + dir * 62, soleY - 52, 22, 17, true, true);
    } else if (isWalk) {
      drawLeg(ctx, spec, backHipX, torsoY + 26, backHipX + dir * p2 * 44, soleY - lift2, 24, 17, true, false);
      drawLeg(ctx, spec, frontShoulderX, torsoY + 26, frontShoulderX + dir * p1 * 48, soleY - lift1, 22, 17, true, false);
    } else {
      drawLeg(ctx, spec, backHipX - dir * 12, torsoY + 26, backHipX - dir * 18, soleY, 24, 17, true, false);
      drawLeg(ctx, spec, frontShoulderX - dir * 12, torsoY + 26, frontShoulderX - dir * 12, soleY, 22, 17, true, false);
    }

    // Badan horizontal kucing (melengkung ke atas saat jump / shock!)
    const arch = isJump || isPuffed ? -26 : 0;
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

    // Perut & dada krem
    ctx.fillStyle = spec.cream;
    ctx.beginPath();
    ctx.ellipse(torsoX + (isProfile ? dir * 18 : 0), torsoY + torsoH * 0.62, torsoW * 0.82, torsoH * 0.45, 0, 0, TAU);
    ctx.fill();

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

    // Kaki sisi dekat (foreground)
    const nearHipX = isProfile ? torsoX - dir * 62 : torsoX - 30;
    const nearShoulderX = isProfile ? torsoX + dir * 88 : torsoX + 30;

    if (isJump) {
      drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX - dir * 56, soleY - 12, 25, 18, false, true, true);
      drawLeg(ctx, spec, nearShoulderX, torsoY + 26, nearShoulderX + dir * 72, soleY - 62, 23, 18, false, true, true);
    } else if (isWalk) {
      drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX + dir * p1 * 48, soleY - lift1, 25, 18, false, false, true);
      drawLeg(ctx, spec, nearShoulderX, torsoY + 28, nearShoulderX + dir * p2 * 50, soleY - lift2, 23, 18, false, false, true);
    } else {
      drawLeg(ctx, spec, nearHipX, torsoY + 30, nearHipX - dir * 6, soleY, 25, 18, false, false, true);
      if (pawRaise !== 'none' && !isBack) {
        drawLeg(ctx, spec, nearShoulderX, torsoY + 26, nearShoulderX + dir * 52, torsoY - 4, 22, 18, false, true, true);
      } else {
        drawLeg(ctx, spec, nearShoulderX, torsoY + 28, nearShoulderX + dir * 4, soleY, 23, 18, false, false, true);
      }
    }

    // Kalung opsional
    drawCollar(ctx, spec, isProfile ? torsoX + dir * 102 : torsoX, torsoY - 22, 86, isBack);

    // Kepala
    headX = isProfile ? torsoX + dir * 124 : torsoX + facing * 16;
    headY = torsoY - 82 + (isWalk ? Math.sin(walkPhase * TAU * 2) * 5 : 0);
    headTopY = headY - 98;
    drawCatHead(ctx, spec, headX, headY, pose, view, false);

    if (isBack) {
      drawTabbyTail(ctx, spec, CX, torsoY - 10, 1, tailPhase, isPuffed, false);
    }
  }

  // --- EFEK KOMIK 2D (shock, anger, sweat, sparkle, question) ---
  const fx = pose.fx !== undefined ? pose.fx : isBack ? 'none' : defaultFxFor(pose.face);
  drawComicFx(ctx, fx, headX, headTopY - 6, 220, spec.ink);

  ctx.restore();
}
