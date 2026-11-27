import { ACTOR_H, ACTOR_W, drawActor } from '../../engine';
import { CHAR_H, CHAR_W, drawPrototype, type ProtoId, type ProtoMode } from './prototypes';

export type ProfileCtx = CanvasRenderingContext2D;
export const PROFILE_TAU = Math.PI * 2;
export const PROFILE_INK = '#1f192d';
export const TT_CYAN = '#25F4EE';
export const TT_PINK = '#FE2C55';

/** Buat kanvas offscreen karakter + garis tepi stiker komik (putih + tinta luar + opsi glitch TikTok). */
export function makeStickerSprite(
  w: number,
  h: number,
  drawFn: (ctx: ProfileCtx) => void,
  outlineW: number,
  opts?: { innerColor?: string; outerColor?: string; glitchOffset?: number },
): HTMLCanvasElement {
  const innerColor = opts?.innerColor ?? '#fffaf0';
  const outerColor = opts?.outerColor ?? PROFILE_INK;
  const glitchOffset = opts?.glitchOffset ?? 0;

  const pad = Math.ceil(outlineW * 2.4 + Math.abs(glitchOffset)) + 14;
  const cw = w + pad * 2;
  const ch = h + pad * 2;

  const base = document.createElement('canvas');
  base.width = cw;
  base.height = ch;
  const bCtx = base.getContext('2d')!;
  bCtx.save();
  bCtx.translate(pad, pad);
  drawFn(bCtx);
  bCtx.restore();

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const oCtx = out.getContext('2d')!;

  const sil = document.createElement('canvas');
  sil.width = cw;
  sil.height = ch;
  const sCtx = sil.getContext('2d')!;

  const stampRing = (col: string, rad: number, ox = 0, oy = 0) => {
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.clearRect(0, 0, cw, ch);
    sCtx.drawImage(base, 0, 0);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = col;
    sCtx.fillRect(0, 0, cw, ch);

    const steps = 32;
    for (const r of [rad * 0.55, rad]) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * PROFILE_TAU;
        oCtx.drawImage(sil, ox + Math.cos(a) * r, oy + Math.sin(a) * r);
      }
    }
  };

  if (glitchOffset > 0) {
    stampRing(TT_CYAN, outlineW + 6, -glitchOffset, -glitchOffset * 0.35);
    stampRing(TT_PINK, outlineW + 6, glitchOffset, glitchOffset * 0.35);
  }
  if (outerColor) stampRing(outerColor, outlineW + 10);
  stampRing(innerColor, outlineW);
  oCtx.drawImage(base, 0, 0);
  return out;
}

export function drawProtoSprite(id: ProtoId, mode: ProtoMode, scale = 2.0, outlineW = 15): HTMLCanvasElement {
  const sw = Math.round(CHAR_W * scale);
  const sh = Math.round(CHAR_H * scale);
  return makeStickerSprite(
    sw,
    sh,
    (ctx) => {
      ctx.scale(scale, scale);
      drawPrototype(id, ctx, mode);
    },
    outlineW,
  );
}

export function drawBangUtohSprite(scale = 2.3, outlineW = 18, glitchOffset = 0): HTMLCanvasElement {
  const sw = Math.round(ACTOR_W * scale);
  const sh = Math.round(ACTOR_H * scale);
  return makeStickerSprite(
    sw,
    sh,
    (ctx) => {
      ctx.scale(scale, scale);
      drawActor(ctx, 'bangUtoh', {
        face: 'happy',
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'hip',
        rightArm: 'wave',
        leftProp: 'none',
        rightProp: 'none',
        facing: 0.08,
        lean: 0,
        fx: 'none',
      });
    },
    outlineW,
    { glitchOffset },
  );
}

export function drawHalftoneDots(
  ctx: ProfileCtx,
  cx: number,
  cy: number,
  maxR: number,
  color: string,
  spacing = 44,
  maxDotR = 13,
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let y = cy - maxR; y <= cy + maxR; y += spacing) {
    const rowShift = Math.round(y / spacing) % 2 === 0 ? 0 : spacing * 0.5;
    for (let x = cx - maxR; x <= cx + maxR; x += spacing) {
      const px = x + rowShift;
      const d = Math.hypot(px - cx, y - cy) / maxR;
      if (d > 1.05) continue;
      const r = maxDotR * Math.pow(Math.max(0, d - 0.18), 1.15);
      if (r > 1.4) {
        ctx.beginPath();
        ctx.arc(px, y, r, 0, PROFILE_TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function drawSparkleStar(ctx: ProfileCtx, x: number, y: number, r: number, fill: string, ink = PROFILE_INK) {
  ctx.save();
  ctx.translate(x, y);
  const starPath = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
    ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r, 0);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(4, 6);
  starPath();
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();

  starPath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}

export function drawPlacedSprite(
  ctx: ProfileCtx,
  sprite: HTMLCanvasElement,
  cx: number,
  cy: number,
  drawScale: number,
  rotDeg: number,
  shadowAlpha = 0.34,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotDeg * Math.PI) / 180);
  if (shadowAlpha > 0) {
    ctx.shadowColor = `rgba(18, 12, 34, ${shadowAlpha})`;
    ctx.shadowBlur = 38;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 18;
  }
  const dw = sprite.width * drawScale;
  const dh = sprite.height * drawScale;
  ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
