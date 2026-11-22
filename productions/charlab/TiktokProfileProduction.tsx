import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ACTOR_H, ACTOR_W, drawActor } from '../../engine';
import { CHAR_H, CHAR_W, drawPrototype, type ProtoId, type ProtoMode } from './prototypes';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const TT_CYAN = '#25F4EE';
const TT_PINK = '#FE2C55';
const INK = '#1f192d';

/** Buat kanvas offscreen karakter + garis tepi stiker komik (putih + tinta luar + opsi glitch TikTok) super tajam! */
function makeStickerSprite(
  w: number,
  h: number,
  drawFn: (ctx: Ctx) => void,
  outlineW: number,
  opts?: { innerColor?: string; outerColor?: string; glitchOffset?: number },
): HTMLCanvasElement {
  const innerColor = opts?.innerColor ?? '#fffaf0';
  const outerColor = opts?.outerColor ?? INK;
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
        const a = (i / steps) * TAU;
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

function drawProtoSprite(id: ProtoId, mode: ProtoMode, scale = 2.0, outlineW = 15): HTMLCanvasElement {
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

function drawBangUtohSprite(scale = 2.3, outlineW = 18, glitchOffset = 0): HTMLCanvasElement {
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

function drawHalftoneDots(
  ctx: Ctx,
  cx: number,
  cy: number,
  maxR: number,
  color: string,
  spacing = 42,
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
        ctx.arc(px, y, r, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawSparkleStar(ctx: Ctx, x: number, y: number, r: number, fill: string, ink = INK) {
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

/** Not musik kecil khas TikTok dengan split kromatik Cyan + Hot Pink + Putih */
function drawTikTokNote(ctx: Ctx, x: number, y: number, scale: number, rotDeg = 10) {
  const drawShape = (ox: number, oy: number, color: string) => {
    ctx.save();
    ctx.translate(x + ox, y + oy);
    ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;

    ctx.beginPath();
    ctx.moveTo(14, -74);
    ctx.lineTo(14, 34);
    ctx.arc(-18, 34, 32, 0, Math.PI * 1.55, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, -68);
    ctx.quadraticCurveTo(32, -26, 72, -22);
    ctx.stroke();
    ctx.restore();
  };

  drawShape(0, 6, INK);
  drawShape(-9 * scale, -5 * scale, TT_CYAN);
  drawShape(9 * scale, 5 * scale, TT_PINK);
  drawShape(0, 0, '#ffffff');
}

function drawPlacedSprite(
  ctx: Ctx,
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

function renderTiktokMatchingProfile(ctx: Ctx, size: number, variant: 0 | 1) {
  const S = size;
  const C = S / 2;
  ctx.clearRect(0, 0, S, S);

  const isCyberNeon = variant === 1;

  // 4 karakter yang SAMA PERSIS dengan Profil YouTube (Bang Utoh + Atelier Indie + Squircle Plush + Ink-Pop Comic)
  const bangUtoh = drawBangUtohSprite(2.3, 18, isCyberNeon ? 14 : 8);
  const atelier = drawProtoSprite('A', 'wave', 2.0, 15);
  const squircle = drawProtoSprite('B', 'wave', 2.0, 15);
  const inkpop = drawProtoSprite('C', 'idle', 2.0, 15);

  // 3 Panel Diagonal Berwarna Cerah — setiap karakter ter-clip rapi 100% DI DALAM garis panelnya sendiri!
  const panels: {
    a0: number;
    a1: number;
    c0: string;
    c1: string;
    sprite: HTMLCanvasElement;
    sx: number;
    sy: number;
    sc: number;
    rot: number;
  }[] = [
    // Atas: Squircle Plush (100% masuk di dalam garis panel atas!)
    {
      a0: -Math.PI * 0.84,
      a1: -Math.PI * 0.16,
      c0: isCyberNeon ? '#ff5c8a' : '#ff9a76',
      c1: isCyberNeon ? '#b80f48' : '#e63e62',
      sprite: squircle,
      sx: C,
      sy: C - S * 0.09,
      sc: 0.65,
      rot: 0,
    },
    // Kanan-Bawah: Ink-Pop Comic (100% masuk di dalam garis panel kanan!)
    {
      a0: -Math.PI * 0.16,
      a1: Math.PI * 0.5,
      c0: isCyberNeon ? '#25F4EE' : '#67e8f9',
      c1: isCyberNeon ? '#1d4ed8' : '#2563eb',
      sprite: inkpop,
      sx: C + S * 0.275,
      sy: C + S * 0.25,
      sc: 0.74,
      rot: 10,
    },
    // Kiri-Bawah: Atelier Indie (100% masuk di dalam garis panel kiri!)
    {
      a0: Math.PI * 0.5,
      a1: Math.PI * 1.16,
      c0: isCyberNeon ? '#c084fc' : '#fde68a',
      c1: isCyberNeon ? '#4c1d95' : '#ea580c',
      sprite: atelier,
      sx: C - S * 0.275,
      sy: C + S * 0.25,
      sc: 0.74,
      rot: -10,
    },
  ];

  for (const p of panels) {
    // 1. Latar gradien & halftone panel meluas hingga tepi kanvas kotak
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.arc(C, C, S * 0.85, p.a0, p.a1);
    ctx.closePath();
    const g = ctx.createRadialGradient(C, C, S * 0.05, C, C, S * 0.56);
    g.addColorStop(0, p.c0);
    g.addColorStop(1, p.c1);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    drawHalftoneDots(ctx, C, C, S * 0.56, 'rgba(31, 25, 45, 0.16)', 42, 13);

    // 2. Clip ganda (irisan panel ∩ bingkai lingkaran TikTok) -> karakter 100% rapi di dalam panel!
    ctx.beginPath();
    ctx.arc(C, C, S * 0.468, 0, TAU);
    ctx.clip();
    drawPlacedSprite(ctx, p.sprite, p.sx, p.sy, p.sc, p.rot, 0.3);
    ctx.restore();
  }

  // 3. Garis pemisah panel komik tebal DI ATAS ketiga panel (batas 100% bersih & tajam)
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 24;
  for (const a of [-Math.PI * 0.84, -Math.PI * 0.16, Math.PI * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + Math.cos(a) * S * 0.78, C + Math.sin(a) * S * 0.78);
    ctx.stroke();
  }
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = 8;
  for (const a of [-Math.PI * 0.84, -Math.PI * 0.16, Math.PI * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + Math.cos(a) * S * 0.78, C + Math.sin(a) * S * 0.78);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Medali tengah & Hero Bang Utoh (ter-clip rapi di dalam bingkai lingkaran!)
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, S * 0.468, 0, TAU);
  ctx.clip();

  ctx.save();
  const medR = S * 0.235;
  const medY = C + S * 0.23;

  // Sentuhan ring kromatik TikTok halus pada medali tengah
  ctx.lineWidth = 14;
  ctx.strokeStyle = TT_CYAN;
  ctx.beginPath();
  ctx.arc(C - 7, medY - 5, medR + 4, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = TT_PINK;
  ctx.beginPath();
  ctx.arc(C + 7, medY + 5, medR + 4, 0, TAU);
  ctx.stroke();

  const medG = ctx.createRadialGradient(C, medY - 40, 20, C, medY, medR);
  medG.addColorStop(0, isCyberNeon ? '#25F4EE' : '#38bdf8');
  medG.addColorStop(0.5, isCyberNeon ? '#141b38' : '#1e2b54');
  medG.addColorStop(1, '#0d1124');
  ctx.beginPath();
  ctx.arc(C, medY, medR, 0, TAU);
  ctx.fillStyle = medG;
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#fffaf0';
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();

  // HERO TENGAH: Bang Utoh menonjol keluar dari medali komik!
  drawPlacedSprite(ctx, bangUtoh, C, C + S * 0.39, 0.88, 0, 0.45);
  ctx.restore();

  // 5. Aksen not musik TikTok & bintang pop-art rapi di kiri-kanan panel atas (0 overlap!)
  drawTikTokNote(ctx, C + S * 0.27, C - S * 0.25, 0.78, 12);
  drawSparkleStar(ctx, C - S * 0.27, C - S * 0.24, 34, '#ffe066');
  drawSparkleStar(ctx, C - S * 0.17, C - S * 0.36, 22, TT_CYAN);
  drawSparkleStar(ctx, C + S * 0.18, C - S * 0.36, 22, '#ffffff');

  // 6. Bingkai lingkaran luar ganda khas TikTok (Cyan + Hot Pink + Putih + Tinta — tajam di avatar bulat!)
  ctx.save();
  ctx.strokeStyle = TT_CYAN;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(C - 9, C - 6, S * 0.474, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = TT_PINK;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(C + 9, C + 6, S * 0.474, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(C, C, S * 0.470, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(C, C, S * 0.479, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/**
 * TikTok Profile Picture (2048x2048 Native Vector Canvas2D) — Seragam dengan Profil YouTube!
 * **Bang Utoh + Atelier Indie + Squircle Plush + Ink-Pop Comic** (Pop-Art 3-Slice + Sentuhan TikTok):
 * - Frame 0: **TikTok Classic Sync** (warna identik YouTube + ring kromatik Cyan/Pink & not TikTok ♪)
 * - Frame 1: **TikTok Cyber-Neon** (layout identik YouTube + palet Hot Pink × Electric Cyan × Neon Violet)
 */
export const TiktokProfileProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const variant: 0 | 1 = frame >= 1 ? 1 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTiktokMatchingProfile(ctx, width, variant);
  }, [width, height, variant]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#161326' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </AbsoluteFill>
  );
};
