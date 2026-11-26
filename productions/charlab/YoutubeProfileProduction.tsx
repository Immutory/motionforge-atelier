import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ACTOR_H, ACTOR_W, drawActor } from '../../engine';
import { CHAR_H, CHAR_W, drawPrototype, type ProtoId, type ProtoMode } from './prototypes';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Buat kanvas offscreen karakter + garis tepi stiker komik (putih + tinta luar) super tajam! */
function makeStickerSprite(
  w: number,
  h: number,
  drawFn: (ctx: Ctx) => void,
  outlineW: number,
  innerColor = '#fffaf0',
  outerColor = '#1f192d',
): HTMLCanvasElement {
  const pad = Math.ceil(outlineW * 2.4) + 12;
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

  const stampRing = (col: string, rad: number) => {
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
        oCtx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
      }
    }
  };

  if (outerColor) stampRing(outerColor, outlineW + 10);
  stampRing(innerColor, outlineW);
  oCtx.drawImage(base, 0, 0);
  return out;
}

function drawProtoSprite(id: ProtoId, mode: ProtoMode, scale = 2.2, outlineW = 16): HTMLCanvasElement {
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

function drawBangUtohSprite(scale = 2.4, outlineW = 20): HTMLCanvasElement {
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
  );
}

function drawHalftoneDots(
  ctx: Ctx,
  cx: number,
  cy: number,
  maxR: number,
  color: string,
  spacing = 46,
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

function drawSparkleStar(ctx: Ctx, x: number, y: number, r: number, fill: string, ink = '#1f192d') {
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

function renderProfileCanvas(ctx: Ctx, size: number, variant: 0 | 1) {
  const S = size;
  const C = S / 2;
  ctx.clearRect(0, 0, S, S);

  // Buat sprite vektor super tajam 1x (resolusi native tinggi!)
  const bangUtoh = drawBangUtohSprite(2.3, 18);
  const atelier = drawProtoSprite('A', 'wave', 2.0, 15);
  const squircle = drawProtoSprite('B', 'wave', 2.0, 15);
  const inkpop = drawProtoSprite('C', 'idle', 2.0, 15);

  if (variant === 0) {
    // =========================================================================
    // OPTION A: COMIC SUNBURST SQUAD (Serasi dengan Banner Senja Warkop 24 Jam!)
    // =========================================================================
    const bg = ctx.createRadialGradient(C, C * 0.92, S * 0.06, C, C, S * 0.65);
    bg.addColorStop(0, '#fff3b0');
    bg.addColorStop(0.28, '#ffb74d');
    bg.addColorStop(0.62, '#e85d75');
    bg.addColorStop(0.88, '#4a256d');
    bg.addColorStop(1, '#1d1536');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // Sinar komik sunburst berputar dari pusat
    ctx.save();
    ctx.translate(C, C * 0.95);
    const rays = 18;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * TAU;
      const a1 = a0 + (0.46 / rays) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, S * 0.85, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 246, 200, 0.22)' : 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
    }
    ctx.restore();

    // Titik halftone komik halus di tepi luar
    drawHalftoneDots(ctx, C, C, S * 0.56, 'rgba(31, 25, 45, 0.18)', 44, 14);

    // Lingkaran cahaya cyan-emas di belakang karakter agar 4 wajah makin POP!
    const halo = ctx.createRadialGradient(C, C * 0.98, S * 0.08, C, C * 0.98, S * 0.42);
    halo.addColorStop(0, 'rgba(255, 250, 224, 0.92)');
    halo.addColorStop(0.62, 'rgba(255, 222, 130, 0.36)');
    halo.addColorStop(1, 'rgba(255, 222, 130, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(C, C * 0.98, S * 0.42, 0, TAU);
    ctx.fill();

    // --- SUSUNAN 4 KARAKTER (BUST-UP BESAR & SEMUA WAJAH 100% TERLIHAT DI DALAM LINGKARAN!) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, S * 0.471, 0, TAU);
    ctx.clip();

    // 1. Belakang Atas-Tengah: Squircle Plush (WAJAH + HOODIE CORAL TERLIHAT UTUH DI ATAS BANG UTOH!)
    drawPlacedSprite(ctx, squircle, C, C - S * 0.08, 0.72, -3, 0.3);

    // 2. Kiri Tengah: Atelier Indie (rompi kuning + syal teal + kacamata bulat, miring ceria!)
    drawPlacedSprite(ctx, atelier, C - S * 0.255, C + S * 0.24, 0.76, -11, 0.34);

    // 3. Kanan Tengah: Ink-Pop Comic (blazer biru + rambut spiky + gaya smug, miring keren!)
    drawPlacedSprite(ctx, inkpop, C + S * 0.255, C + S * 0.24, 0.76, 11, 0.34);

    // 4. DEPAN BAWAH-TENGAH (HERO UTAMA): Bang Utoh paling besar & tajam dengan outline stiker ganda!
    drawPlacedSprite(ctx, bangUtoh, C, C + S * 0.38, 0.9, 0, 0.44);

    ctx.restore();

    // Bintang komik & kilau neon kecil di sela atas
    drawSparkleStar(ctx, C - S * 0.3, C - S * 0.22, 36, '#ffe066');
    drawSparkleStar(ctx, C + S * 0.3, C - S * 0.22, 34, '#7dd3fc');
    drawSparkleStar(ctx, C - S * 0.2, C - S * 0.34, 24, '#ffffff');
    drawSparkleStar(ctx, C + S * 0.21, C - S * 0.33, 24, '#ffe066');

    // Bingkai ring tipis komik tepat di tepi zona lingkaran YouTube (r = 0.472 * S)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 248, 224, 0.94)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(C, C, S * 0.472, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = '#1f192d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(C, C, S * 0.481, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else {
    // =========================================================================
    // OPTION B: POP-ART 3-SLICE COMIC EMBLEM + BANG UTOH CENTER BURST!
    // =========================================================================
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
      // Atas: Squircle Plush (masuk utuh rapi di dalam panel coral-magenta!)
      {
        a0: -Math.PI * 0.84,
        a1: -Math.PI * 0.16,
        c0: '#ff9a76',
        c1: '#e63e62',
        sprite: squircle,
        sx: C,
        sy: C - S * 0.09,
        sc: 0.65,
        rot: 0,
      },
      // Kanan-Bawah: Ink-Pop Comic (masuk utuh rapi di dalam panel cyan-cobalt!)
      {
        a0: -Math.PI * 0.16,
        a1: Math.PI * 0.5,
        c0: '#67e8f9',
        c1: '#2563eb',
        sprite: inkpop,
        sx: C + S * 0.275,
        sy: C + S * 0.25,
        sc: 0.74,
        rot: 10,
      },
      // Kiri-Bawah: Atelier Indie (masuk utuh rapi di dalam panel emas-amber!)
      {
        a0: Math.PI * 0.5,
        a1: Math.PI * 1.16,
        c0: '#fde68a',
        c1: '#ea580c',
        sprite: atelier,
        sx: C - S * 0.275,
        sy: C + S * 0.25,
        sc: 0.74,
        rot: -10,
      },
    ];

    for (const p of panels) {
      // 1. Latar gradien & halftone panel meluas hingga tepi kanvas kotak (bebas celah sudut)
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

      // 2. Clip ganda (irisan panel ∩ bingkai lingkaran YouTube) -> karakter 100% masuk di dalam garis panel!
      ctx.beginPath();
      ctx.arc(C, C, S * 0.471, 0, TAU);
      ctx.clip();
      drawPlacedSprite(ctx, p.sprite, p.sx, p.sy, p.sc, p.rot, 0.3);
      ctx.restore();
    }

    // 3. Garis pemisah panel komik tebal digambar DI ATAS ketiga panel sehingga batas tiap panel 100% bersih & tajam!
    ctx.save();
    ctx.strokeStyle = '#1f192d';
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

    // 4. Medali tengah & Hero Bang Utoh di atas pertemuan garis panel (ter-clip rapi di bingkai lingkaran!)
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, S * 0.471, 0, TAU);
    ctx.clip();

    ctx.save();
    const medR = S * 0.235;
    const medY = C + S * 0.23;
    const medG = ctx.createRadialGradient(C, medY - 40, 20, C, medY, medR);
    medG.addColorStop(0, '#38bdf8');
    medG.addColorStop(0.55, '#1e2b54');
    medG.addColorStop(1, '#131830');
    ctx.beginPath();
    ctx.arc(C, medY, medR, 0, TAU);
    ctx.fillStyle = medG;
    ctx.fill();
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#fffaf0';
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1f192d';
    ctx.stroke();
    ctx.restore();

    // HERO TENGAH: Bang Utoh menonjol keluar dari medali komik!
    drawPlacedSprite(ctx, bangUtoh, C, C + S * 0.39, 0.88, 0, 0.45);
    ctx.restore();

    // Kilau bintang pop-art
    drawSparkleStar(ctx, C - S * 0.28, C - S * 0.24, 34, '#ffe066');
    drawSparkleStar(ctx, C + S * 0.28, C - S * 0.24, 34, '#7dd3fc');
    drawSparkleStar(ctx, C - S * 0.17, C - S * 0.36, 22, '#ffffff');
    drawSparkleStar(ctx, C + S * 0.18, C - S * 0.35, 22, '#ffe066');

    // Lingkar bingkai emblem luar
    ctx.save();
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(C, C, S * 0.472, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#1f192d';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(C, C, S * 0.481, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * YouTube Channel Profile Picture (2048x2048 Native Vector Canvas2D) —
 * **Bang Utoh + Atelier Indie + Squircle Plush + Ink-Pop Comic**:
 * - Frame 0: **Option A — Comic Sunburst Squad** (serasi hangat senja dengan Banner Warkop 24 Jam!)
 * - Frame 1: **Option B — Pop-Art 3-Slice Comic Emblem** (panel diagonal pop-art + medali tengah Bang Utoh!)
 */
export const YoutubeProfileProduction: React.FC = () => {
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
    renderProfileCanvas(ctx, 2048, variant);
    ctx.restore();
  }, [width, height, variant]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1d1536' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />
    </AbsoluteFill>
  );
};
