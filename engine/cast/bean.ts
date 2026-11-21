/**
 * Karakter "bean" di kanvas 600x1000. Telapak kaki selalu di y = 960 supaya billboard menapak lantai.
 *
 * Aturan konstruksi (diukur dari gaya referensi, tokohnya sendiri orisinal):
 *  - kepala bulat sedikit lebih lebar dari tinggi (H/W 0.93), bukan elips tinggi
 *  - garis luar tebal-tipis: tipis di kiri-atas, tebal di kanan-bawah (sekitar 3x)
 *  - dewasa sekitar 3.5 tinggi kepala, torso bentuk kacang, kaki jenjang
 *  - kaki dan lengan satu goresan tinta tipis (0.055 lebar kepala), tangan titik tinta
 *  - mata rapat (0.26 W), alis tebal meruncing, fitur bergeser ke sisi yang dihadapi
 *  - bayangan wajah ungu muda, tanpa blush dan tanpa kilau di mata
 */
export type Face = 'neutral' | 'happy' | 'shock' | 'sad' | 'smug';

export type BeanLook = {
  skin: string;
  outfit: string;
  ink: string;
  /** Warna aksen (tali, pita topi). */
  accent?: string;
  /** Beanie dengan pompom. */
  hat?: string;
  /** Tidak dipakai lagi: kaki sekarang goresan tinta. Dipertahankan agar produksi lama tetap jalan. */
  pants?: string;
};

export type BeanPose = {
  face: Face;
  /** false/0 = terbuka, 0.5 = setengah tertutup (in-between), true/1 = tertutup penuh */
  blink: boolean | number;
  /** 0 = tangan turun, 1 = tangan terangkat tinggi */
  armsUp: number;
  /** -1..1 posisi langkah kaki */
  step: number;
  /** goyang badan, derajat */
  lean: number;
  /** -1..1 sisi yang dihadapi wajah (default 0.35) */
  facing?: number;
};

const BLINK_SHAPE = [0.5, 1, 1, 0.5] as const;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Kedip 4 frame bergaya referensi (half / shut / shut / half) dengan jeda tidak teratur 0.5-2.3 detik,
 * tidak pernah mulai tertutup di frame 0, dan otomatis mengedip menutupi setiap pergantian ekspresi.
 */
export function blinkLidAt(frame: number, seed: number, fps = 30, swapFrames: number[] = []): number {
  for (const sf of swapFrames) {
    const k = frame - (sf - 1);
    if (k >= 0 && k < 4) return BLINK_SHAPE[k];
  }
  const t = frame / fps;
  let next = 0.65 + 1.15 * hash01(seed * 19 + 7);
  for (let n = 0; next <= t + 0.2 && n < 300; n++) {
    const k = Math.floor((t - next) * fps);
    if (k >= 0 && k < 4) return BLINK_SHAPE[k];
    next += 0.5 + 1.8 * hash01(seed * 31 + n * 13 + 3);
  }
  return 0;
}

export const CANVAS_W = 600;
export const CANVAS_H = 1000;
export const SOLE_Y = 960;

export const DEFAULT_LOOK: BeanLook = {
  skin: '#f7dcc2',
  outfit: '#e2a33b',
  ink: '#2a1a33',
  accent: '#3f9a8a',
  hat: '#6fae5b',
};

// ---- ukuran dasar (semua turunan dari lebar kepala W) ----
const W = 240;
const H = W * 0.93;
const CX = 300;
const HEAD_TOP = 180;
const CY = HEAD_TOP + H / 2;
const CHIN = HEAD_TOP + H;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mul = (c: string, m: [number, number, number]) =>
  '#' + hex(c).map((v, i) => Math.min(255, Math.round(v * m[i])).toString(16).padStart(2, '0')).join('');
const SHADOW: [number, number, number] = [0.92, 0.9, 0.96];

type Ctx = CanvasRenderingContext2D;

/** Kepala: superellipse tidak sempurna, rahang menonjol ke sisi yang dihadapi. */
function headPath(ctx: Ctx, facing: number) {
  ctx.beginPath();
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const n = s < 0 ? 2.3 : 2.1; // atas sedikit lebih kotak
    let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    if (s > 0) x += facing * W * 0.035 * s; // rahang
    const px = CX + x, py = CY + y;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function torsoPath(ctx: Ctx, top: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(CX - w * 0.4, top);
  ctx.bezierCurveTo(CX - w * 0.62, top + h * 0.3, CX - w * 0.6, top + h * 0.95, CX - w * 0.15, top + h);
  ctx.bezierCurveTo(CX + w * 0.2, top + h * 1.04, CX + w * 0.64, top + h * 0.92, CX + w * 0.58, top + h * 0.45);
  ctx.bezierCurveTo(CX + w * 0.55, top + h * 0.15, CX + w * 0.45, top, CX + w * 0.4, top);
  ctx.closePath();
}

/** Garis luar tebal-tipis: salinan tinta digeser ke kanan-bawah di belakang bentuk utama. */
function inked(ctx: Ctx, path: () => void, fill: string | CanvasGradient, ink: string, thin = 5, dx = 3, dy = 4.5) {
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

function brow(ctx: Ctx, x: number, y: number, len: number, angleDeg: number, ink: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  const t = W * 0.05;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-len / 2, -t * 0.25);
  ctx.lineTo(len / 2, -t * 0.5);
  ctx.lineTo(len / 2, t * 0.5);
  ctx.lineTo(-len / 2, t * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function limb(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, bend: number, ink: string) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = W * 0.055;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
}

function drawHat(ctx: Ctx, look: BeanLook) {
  const hat = look.hat!;
  const accent = look.accent ?? '#3f9a8a';
  const l = CX - W * 0.53, r = CX + W * 0.53, base = HEAD_TOP + H * 0.18, top = HEAD_TOP;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(l, base);
    ctx.bezierCurveTo(l - 4, top - 6, CX - W * 0.3, top - 30, CX, top - 28);
    ctx.bezierCurveTo(CX + W * 0.3, top - 30, r + 4, top - 6, r, base);
    ctx.bezierCurveTo(CX + W * 0.2, base + 9, CX - W * 0.2, base + 9, l, base);
    ctx.closePath();
  };
  inked(ctx, path, hat, look.ink, 5, 3, 4);
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(l - 10, base - 17, W * 1.2, 50);
  ctx.strokeStyle = look.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(l - 10, base - 17);
  ctx.lineTo(r + 10, base - 17);
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = look.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(CX, top - 32, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawBean(ctx: Ctx, look: BeanLook, pose: BeanPose) {
  const ink = look.ink;
  const facing = pose.facing ?? 0.35;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const torsoTop = CHIN - 10;
  const tw = W * 0.74, th = 200;
  const hipY = torsoTop + th - 16;

  ctx.translate(CX, hipY);
  ctx.rotate((pose.lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // kaki: satu goresan tinta, sikap A, telapak kecil
  for (const side of [-1, 1]) {
    const swing = side * pose.step * 40;
    const fx = CX + side * W * 0.225 + swing;
    limb(ctx, CX + side * W * 0.15, hipY, fx, SOLE_Y - 6, side * -6, ink);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(fx + side * 9, SOLE_Y - 4, 21, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // torso kacang dengan bayangan lembut
  const g = ctx.createLinearGradient(CX - tw * 0.6, torsoTop, CX + tw * 0.6, torsoTop + th);
  g.addColorStop(0, look.outfit);
  g.addColorStop(0.55, look.outfit);
  g.addColorStop(1, mul(look.outfit, [0.82, 0.76, 0.84]));
  inked(ctx, () => torsoPath(ctx, torsoTop, tw, th), g, ink, 5, 3, 4.5);

  // tali tas diagonal, dipotong ke bentuk torso
  if (look.accent) {
    ctx.save();
    torsoPath(ctx, torsoTop, tw, th);
    ctx.clip();
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.55, torsoTop + 8);
    ctx.lineTo(CX + tw * 0.6, torsoTop + th * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // lengan: goresan tipis dari dalam sisi torso, tangan titik tinta
  for (const side of [-1, 1]) {
    const sx = CX + side * tw * 0.46, sy = torsoTop + 48;
    const dx = CX + side * (tw * 0.62 + 20), dy = torsoTop + th * 0.92;
    const ux = CX + side * (tw * 0.95 + 18), uy = torsoTop - 55;
    const hx = dx + (ux - dx) * pose.armsUp, hy = dy + (uy - dy) * pose.armsUp;
    limb(ctx, sx, sy, hx, hy, side * 14, ink);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(hx, hy, W * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }

  // kepala
  const skinG = ctx.createLinearGradient(CX - W * 0.3, HEAD_TOP, CX + W * 0.4, CHIN);
  skinG.addColorStop(0, look.skin);
  skinG.addColorStop(0.5, look.skin);
  skinG.addColorStop(1, mul(look.skin, SHADOW));
  inked(ctx, () => headPath(ctx, facing), skinG, ink, 5, 3, 5);

  // wajah
  const shift = facing * W * 0.08;
  const ex = (side: number) => CX + shift + side * W * 0.13;
  const eyeY = CY + H * 0.02;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  const f = pose.face;
  const lid = pose.blink === true ? 1 : pose.blink === false ? 0 : Math.max(0, Math.min(1, pose.blink));
  for (const side of [-1, 1]) {
    const x = ex(side);
    if (lid >= 0.85) {
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - W * 0.08, eyeY);
      ctx.lineTo(x + W * 0.08, eyeY);
      ctx.stroke();
    } else if (lid >= 0.25) {
      // in-between half-lid: kelopak turun setengah dengan celah tipis di bawahnya
      const w = W * 0.075;
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - w, eyeY - 1);
      ctx.lineTo(x + w, eyeY - 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY, w * 0.78, W * 0.028, 0, 0, Math.PI);
      ctx.fill();
    } else if (f === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, eyeY - 2, W * 0.115, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + shift * 0.25, eyeY, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (f === 'neutral' || f === 'smug') {
      // mata berkelopak: garis kelopak + setengah cakram di bawahnya
      const w = W * 0.075, h = f === 'smug' ? W * 0.05 : W * 0.07;
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - w, eyeY - 4);
      ctx.lineTo(x + w, eyeY - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY - 3, w * 0.95, h, 0, 0, Math.PI);
      ctx.fill();
    } else {
      // happy dan sad: oval tegak
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, W * 0.045, W * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // alis
  const by = eyeY - W * 0.2;
  const blen = W * 0.175;
  if (f === 'shock') {
    brow(ctx, ex(-1), by - 12, blen, -8, ink);
    brow(ctx, ex(1), by - 12, blen, 8, ink);
  } else if (f === 'sad') {
    brow(ctx, ex(-1), by + 2, blen, 16, ink);
    brow(ctx, ex(1), by + 2, blen, -16, ink);
  } else if (f === 'smug') {
    brow(ctx, ex(-1), by - 10, blen, -10, ink);
    brow(ctx, ex(1), by + 3, blen, 4, ink);
  } else if (f === 'happy') {
    brow(ctx, ex(-1), by - 4, blen, -6, ink);
    brow(ctx, ex(1), by - 4, blen, 6, ink);
  } else {
    brow(ctx, ex(-1), by, blen, -3, ink);
    brow(ctx, ex(1), by, blen, 3, ink);
  }

  // mulut
  const mx = CX + shift, my = CY + H * 0.3;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  switch (f) {
    case 'happy':
      ctx.arc(mx, my - 10, W * 0.11, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      break;
    case 'sad':
      ctx.arc(mx, my + 16, W * 0.09, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      break;
    case 'shock':
      ctx.ellipse(mx, my + 2, W * 0.05, W * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'smug':
      ctx.moveTo(mx - W * 0.07, my + 2);
      ctx.quadraticCurveTo(mx + W * 0.04, my + 12, mx + W * 0.1, my - 6);
      ctx.stroke();
      break;
    default:
      ctx.moveTo(mx - W * 0.06, my);
      ctx.lineTo(mx + W * 0.06, my);
      ctx.stroke();
  }

  if (look.hat) drawHat(ctx, look);
  ctx.restore();
}
