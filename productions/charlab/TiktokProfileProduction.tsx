import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  PROFILE_INK as INK,
  PROFILE_TAU as TAU,
  TT_CYAN,
  TT_PINK,
  drawBangUtohSprite,
  drawHalftoneDots,
  drawPlacedSprite,
  drawProtoSprite,
  drawSparkleStar,
  type ProfileCtx as Ctx,
} from './profileCanvasShared';

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
    ctx.save();
    ctx.setTransform(width / 2048, 0, 0, height / 2048, 0, 0);
    renderTiktokMatchingProfile(ctx, 2048, variant);
    ctx.restore();
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
