import type { TalkSample } from './lipsync';

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

/** 13 ekspresi siap pakai untuk konten storytelling, edutainment, dan komedi YouTube (v2.0: tambah 'strain'). */
export type Expression =
  | 'neutral'
  | 'happy'
  | 'laugh'
  | 'shock'
  | 'sad'
  | 'angry'
  | 'smug'
  | 'skeptical'
  | 'nervous'
  | 'tired'
  | 'idea'
  | 'focus'
  | 'strain';

export type EyeStyle = 'classic' | 'pill' | 'sclera' | 'lash' | 'almond';
export type BrowStyle = 'block' | 'natural';
export type NoseStyle = 'hook' | 'rounded';
export type BeautyMark = 'none' | 'rightCheek' | 'leftCheek';
export type ComicFx = 'none' | 'shock' | 'sweat' | 'anger' | 'sparkle' | 'question';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function inked(ctx: Ctx, path: () => void, fill: string, ink: string, thin = 4.5, dx = 2, dy = 3) {
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

export function drawBrow(ctx: Ctx, x: number, y: number, len: number, thick: number, angleDeg: number, ink: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-len / 2, -thick * 0.25);
  ctx.lineTo(len / 2, -thick * 0.52);
  ctx.lineTo(len / 2, thick * 0.52);
  ctx.lineTo(-len / 2, thick * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawNaturalBrow(
  ctx: Ctx,
  x: number,
  y: number,
  side: -1 | 1,
  len: number,
  thick: number,
  angleDeg: number,
  ink: string,
  fill?: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  // Sisi dalam (dekat hidung) lebih lembut, melengkung alami lalu meruncing ke arah pelipis luar (side)
  const inX = -side * (len * 0.48);
  const outX = side * (len * 0.54);
  const archX = side * (len * 0.1);
  ctx.fillStyle = fill ?? ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(inX, thick * 0.16);
  ctx.quadraticCurveTo(inX, -thick * 0.36, inX + side * (len * 0.14), -thick * 0.42);
  ctx.quadraticCurveTo(archX, -thick * 0.66, outX, thick * 0.1);
  ctx.quadraticCurveTo(archX, -thick * 0.04, inX + side * (len * 0.1), thick * 0.38);
  ctx.quadraticCurveTo(inX, thick * 0.38, inX, thick * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawComicFx(ctx: Ctx, fx: ComicFx, cx: number, headTop: number, headW: number, ink: string) {
  if (fx === 'none') return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (fx === 'shock') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6.5;
    const r = headW * 0.55;
    for (const deg of [-148, -126, -54, -32]) {
      const a = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, headTop - 16 + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r + 34), headTop - 16 + Math.sin(a) * (r + 34));
      ctx.stroke();
    }
  } else if (fx === 'sweat') {
    const x = cx + headW * 0.4;
    const y = headTop + 68;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.bezierCurveTo(x + 15, y - 4, x + 20, y + 15, x, y + 20);
      ctx.bezierCurveTo(x - 20, y + 15, x - 15, y - 4, x, y - 26);
      ctx.closePath();
    };
    inked(ctx, path, '#9fe3ff', ink);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - 4, y + 4, 3.5, 6.5, -0.25, 0, TAU);
    ctx.fill();
  } else if (fx === 'anger') {
    const x = cx + headW * 0.56;
    const y = headTop - 4;
    const drawCross = (color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * 22, y + dy * 5);
        ctx.quadraticCurveTo(x + dx * 5, y + dy * 5, x + dx * 5, y + dy * 22);
        ctx.stroke();
      }
    };
    drawCross(ink, 13);
    drawCross('#ff4040', 6.5);
  } else if (fx === 'sparkle') {
    for (const [ox, oy, rad] of [
      [cx + headW * 0.56, headTop - 12, 22],
      [cx - headW * 0.54, headTop + 14, 15],
    ]) {
      const star = () => {
        ctx.beginPath();
        ctx.moveTo(ox, oy - rad);
        ctx.quadraticCurveTo(ox + 3, oy - 3, ox + rad, oy);
        ctx.quadraticCurveTo(ox + 3, oy + 3, ox, oy + rad);
        ctx.quadraticCurveTo(ox - 3, oy + 3, ox - rad, oy);
        ctx.quadraticCurveTo(ox - 3, oy - 3, ox, oy - rad);
        ctx.closePath();
      };
      inked(ctx, star, '#ffe066', ink, 3.5, 1.5, 2);
    }
  } else if (fx === 'question') {
    const qx = cx + headW * 0.54;
    const qy = headTop - 22;
    ctx.font = '900 64px system-ui, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = ink;
    ctx.strokeText('?', qx, qy);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('?', qx, qy);
  }
  ctx.restore();
}

export type FaceRenderParams = {
  cx: number;
  cy: number;
  headW: number;
  skin: string;
  ink: string;
  eyeStyle: EyeStyle;
  face: Expression;
  blink: number;
  talk?: number | TalkSample;
  facing: number;
  browThick?: number;
  browStyle?: BrowStyle;
  browColor?: string;
  nose?: boolean;
  noseStyle?: NoseStyle;
  skinShadow?: string;
  beautyMark?: BeautyMark;
  /** Bibir dua-katup natural (katup atas & bawah lembut dengan cupid's bow halus). */
  fullLips?: boolean;
  /** Warna bibir atas opsional saat `fullLips: true` (default diturunkan dari `lipColor`). */
  upperLipColor?: string;
  /** Bayangan kumis tipis samar di atas bibir atas (khas pemuda lokal). */
  faintMustache?: boolean;
  /** Rongga mulut terbuka (default '#5c222d'). */
  mouthColor?: string;
  /** Lidah (default '#e57373'). */
  tongueColor?: string;
  /** Pita bibir di bawah garis mulut tertutup (opsional, default tidak digambar). */
  lipColor?: string;
  /** Rona pipi (opsional, default tidak digambar). */
  blushColor?: string;
  /** Titik kilau putih di pupil (opsional, default false). */
  eyeShine?: boolean;
};

/**
 * Geometri mata & spherical cosine foreshortening bersama (dipakai `drawFaceFeatures` dan kacamata di `nusantara.ts`)
 * agar posisi lensa dekat/jauh dan mata selalu 100% sinkron pada semua `eyeStyle` (termasuk `almond`) & sudut `facing`.
 */
export function computeEyeGeom(cx: number, cy: number, headW: number, eyeStyle: EyeStyle, facing: number) {
  const fAbs = Math.min(1, Math.abs(facing));
  const fSign = facing >= 0 ? 1 : -1;
  const shift = facing * headW * 0.085;
  const eyeSpread = eyeStyle === 'almond' ? 0.174 : 0.148;
  const farCos = fAbs > 0.12 ? Math.cos((fAbs - 0.12) * 0.62) : 1;
  const ex = (s: number) => {
    const compress = s === fSign ? 0.86 + 0.14 * farCos : 1;
    return cx + shift + s * headW * eyeSpread * compress;
  };
  const eyeScaleX = (s: number) => (s === fSign ? Math.max(0.76, farCos) : 1);
  const eyeY = cy + (eyeStyle === 'almond' ? 8 : 12);
  return { fAbs, fSign, shift, farCos, ex, eyeScaleX, eyeY };
}

/** Gambar mata, alis, hidung opsional, dan mulut (terintegrasi penuh dengan lip-sync talkAt & spherical 2,5D face parallax). */
export function drawFaceFeatures(ctx: Ctx, p: FaceRenderParams) {
  const { cx, cy, headW: W, skin, ink, eyeStyle, face, blink, facing } = p;
  const { fSign, shift, ex, eyeScaleX, eyeY } = computeEyeGeom(cx, cy, W, eyeStyle, facing);
  const talkSample: TalkSample =
    typeof p.talk === 'number'
      ? { open: p.talk, shape: p.talk > 0.65 ? 'wide' : p.talk > 0.3 ? 'mid' : p.talk > 0.16 ? 'small' : 'closed' }
      : (p.talk ?? { open: 0, shape: 'closed' });
  const mouthFill = p.mouthColor ?? '#5c222d';
  const tongueFill = p.tongueColor ?? '#e57373';
  const shine = (x: number, y: number, r: number) => {
    if (!p.eyeShine) return;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + r * 0.9, y - r * 1.1, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  // --- 0. RONA PIPI (opsional) ---
  if (p.blushColor && face !== 'shock') {
    ctx.save();
    ctx.globalAlpha = face === 'happy' || face === 'laugh' || face === 'nervous' ? 0.7 : 0.45;
    ctx.fillStyle = p.blushColor;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(ex(s) + s * 14, eyeY + 38, 24, 11, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- 1. MATA ---
  for (const s of [-1, 1]) {
    const x = ex(s);
    const sx = eyeScaleX(s);
    ctx.save();
    if (sx < 0.999) {
      ctx.translate(x, eyeY);
      ctx.scale(sx, 1);
      ctx.translate(-x, -eyeY);
    }
    if (blink >= 0.85 || face === 'laugh') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (face === 'laugh' || eyeStyle === 'lash') {
        ctx.arc(x, eyeY + 5, 16, Math.PI * 1.1, Math.PI * 1.9);
      } else {
        ctx.moveTo(x - 18, eyeY);
        ctx.lineTo(x + 18, eyeY);
      }
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (blink >= 0.25) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, eyeY);
      ctx.lineTo(x + 18, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY + 1, 13, 5.5, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (face === 'strain') {
      // Mata memicing tajam `> <` (kontras tinggi terhadap deadpan berlapis saat tenaga/benturan/ngeri)
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.moveTo(x + s * 16, eyeY - 12);
      ctx.lineTo(x - s * 10, eyeY);
      ctx.lineTo(x + s * 16, eyeY + 12);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (face === 'shock' || face === 'nervous') {
      const rad = face === 'shock' ? 26 : 22;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, eyeY, rad, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + shift * 0.16, eyeY + (face === 'nervous' ? 3 : 0), face === 'shock' ? 6.8 : 7.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (eyeStyle === 'sclera') {
      const rx = 21;
      const ry = 20;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      const lookX = Math.max(-7, Math.min(7, facing * 18));
      const lookY = face === 'idea' ? -4 : face === 'sad' ? 4 : 1;
      ctx.beginPath();
      ctx.arc(x + lookX, eyeY + lookY, 8, 0, TAU);
      ctx.fill();
      shine(x + lookX - 3, eyeY + lookY + 2, 2.5);

      if (face === 'neutral' || face === 'smug' || face === 'tired' || face === 'skeptical' || face === 'angry') {
        const lidH =
          face === 'tired'
            ? 20
            : face === 'smug' || face === 'skeptical'
              ? s === -1 && face === 'skeptical'
                ? 7
                : 15
              : face === 'angry'
                ? 14
                : 11;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, eyeY, rx + 2, ry + 2, 0, 0, TAU);
        ctx.clip();
        ctx.fillStyle = skin;
        ctx.fillRect(x - rx - 4, eyeY - ry - 4, (rx + 4) * 2, lidH + 4);
        ctx.restore();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(x - rx - 2, eyeY - ry + lidH);
        ctx.lineTo(x + rx + 2, eyeY - ry + lidH);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (eyeStyle === 'almond') {
      const rx = 25;
      const ry = face === 'idea' || face === 'happy' ? 14 : 12.8;
      const lookX = Math.max(-6, Math.min(6, facing * 15));
      const lookY = face === 'idea' ? -2.5 : face === 'sad' ? 2.5 : 0.5;
      const lidDrop =
        face === 'tired'
          ? 9.5
          : face === 'smug'
            ? 5
            : face === 'skeptical'
              ? s === -1
                ? 1.5
                : 5.5
              : face === 'angry'
                ? 5
                : face === 'neutral'
                  ? 2.6
                  : 0.8;

      // Lipatan kelopak mata atas tipis alami (double-eyelid crease khas wajah lokal)
      ctx.save();
      ctx.strokeStyle = 'rgba(72, 44, 34, 0.34)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.84, eyeY - ry + lidDrop - 4.5);
      ctx.quadraticCurveTo(x, eyeY - ry * 1.44 + lidDrop - 4.5, x + rx * 0.86, eyeY - ry + lidDrop - 3.5);
      ctx.stroke();
      ctx.restore();

      const almondPath = () => {
        ctx.beginPath();
        ctx.moveTo(x - rx, eyeY + 1.5);
        ctx.quadraticCurveTo(x - rx * 0.2, eyeY - ry * 1.38 + lidDrop, x + rx, eyeY);
        ctx.quadraticCurveTo(x + rx * 0.18, eyeY + ry * 1.24, x - rx, eyeY + 1.5);
        ctx.closePath();
      };

      // Sklera putih hangat lembut
      ctx.save();
      almondPath();
      ctx.fillStyle = '#fcf8f4';
      ctx.fill();
      ctx.clip();

      // Iris cokelat-hitam gelap besar + pupil pekat + titik kilau mata hidup seperti di foto
      ctx.fillStyle = '#241718';
      ctx.beginPath();
      ctx.arc(x + lookX, eyeY + lookY - 0.5, 11.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + lookX, eyeY + lookY - 0.5, 6.8, 0, TAU);
      ctx.fill();
      shine(x + lookX - 3.4, eyeY + lookY + 1, 2.9);
      if (p.eyeShine) {
        ctx.fillStyle = 'rgba(255,255,255,0.58)';
        ctx.beginPath();
        ctx.arc(x + lookX + 4, eyeY + lookY + 3.4, 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // Garis kelopak bawah lembut + bulu mata atas tegas meruncing alami
      ctx.strokeStyle = 'rgba(56, 34, 30, 0.44)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(x - rx * 0.84, eyeY + 2.2);
      ctx.quadraticCurveTo(x + rx * 0.12, eyeY + ry * 1.18, x + rx * 0.9, eyeY + 1);
      ctx.stroke();

      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.6;
      ctx.beginPath();
      ctx.moveTo(x - rx - 1.5, eyeY + 1.8);
      ctx.quadraticCurveTo(x - rx * 0.2, eyeY - ry * 1.38 + lidDrop, x + rx + 1.5, eyeY + 0.4);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (face === 'tired' || face === 'smug' || (face === 'skeptical' && s === 1) || (face === 'neutral' && eyeStyle === 'classic')) {
      const w = 18;
      const h = face === 'tired' ? 8 : face === 'smug' ? 11 : 13;
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x - w, eyeY - 3);
      ctx.lineTo(x + w, eyeY - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY - 2, w * 0.85, h, 0, 0, Math.PI);
      ctx.fill();
      if (face !== 'tired') shine(x - 6, eyeY + 5, 2.8);
      if (face === 'tired') {
        ctx.strokeStyle = 'rgba(70,50,90,0.35)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x, eyeY + 8, 12, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    } else if (eyeStyle === 'pill') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(x - 12, eyeY - 19, 24, 38, 12);
      ctx.fill();
      shine(x - 4, eyeY - 4, 3.5);
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11.5, face === 'idea' || face === 'happy' ? 17 : 15.5, 0, 0, TAU);
      ctx.fill();
      shine(x - 4, eyeY - 2, 3.6);
      if (eyeStyle === 'lash') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + s * 9, eyeY - 10);
        ctx.lineTo(x + s * 16, eyeY - 14);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- 2. ALIS ---
  const by = eyeY - (eyeStyle === 'almond' ? 31 : 40);
  const blen = eyeStyle === 'almond' ? 44 : 39;
  const bt = p.browThick ?? 10.5;
  const putBrow = (s: -1 | 1, bx: number, byPos: number, len: number, thick: number, deg: number) => {
    const scaledLen = len * eyeScaleX(s);
    if (p.browStyle === 'natural') {
      drawNaturalBrow(ctx, bx, byPos, s, scaledLen * 1.14, thick, deg, ink, p.browColor);
    } else {
      drawBrow(ctx, bx, byPos, scaledLen, thick, deg, ink);
    }
  };
  switch (face) {
    case 'shock':
      putBrow(-1, ex(-1), by - 14, blen, bt, -15);
      putBrow(1, ex(1), by - 14, blen, bt, 15);
      break;
    case 'angry':
    case 'strain':
      putBrow(-1, ex(-1), by + 4, blen + 4, bt + 2, 20);
      putBrow(1, ex(1), by + 4, blen + 4, bt + 2, -20);
      break;
    case 'sad':
    case 'nervous':
      putBrow(-1, ex(-1), by + 2, blen, bt, -18);
      putBrow(1, ex(1), by + 2, blen, bt, 18);
      break;
    case 'smug':
    case 'skeptical':
      putBrow(-1, ex(-1), by - 10, blen, bt, -12);
      putBrow(1, ex(1), by + 4, blen, bt, 8);
      break;
    case 'idea':
    case 'happy':
    case 'laugh':
      putBrow(-1, ex(-1), by - 7, blen, bt, -8);
      putBrow(1, ex(1), by - 7, blen, bt, 8);
      break;
    case 'tired':
      putBrow(-1, ex(-1), by + 5, blen, bt, -4);
      putBrow(1, ex(1), by + 5, blen, bt, 4);
      break;
    case 'focus':
      putBrow(-1, ex(-1), by + 2, blen, bt, 10);
      putBrow(1, ex(1), by + 2, blen, bt, -10);
      break;
    default:
      putBrow(-1, ex(-1), by - 1, blen, bt, -4);
      putBrow(1, ex(1), by - 1, blen, bt, 4);
  }

  // --- 2b. TAHI LALAT KHAS (opsional, mis. di tulang pipi kanan bawah mata Ebot) ---
  if (p.beautyMark && p.beautyMark !== 'none') {
    const ms = p.beautyMark === 'rightCheek' ? -1 : 1;
    ctx.save();
    ctx.fillStyle = '#38211d';
    ctx.beginPath();
    ctx.arc(ex(ms) + ms * 2, eyeY + 27, 2.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // --- 3. HIDUNG OPSIONAL ---
  if (p.nose) {
    if (p.noseStyle === 'rounded') {
      const nx = cx + shift;
      const ny = eyeY + 32;
      const dir = facing >= 0 ? 1 : -1;
      ctx.save();
      // Bayangan lembut hangat di bawah ujung hidung membulat khas lokal
      ctx.fillStyle = 'rgba(146, 90, 64, 0.28)';
      ctx.beginPath();
      ctx.ellipse(nx + dir * 2, ny + 6, 13, 5, 0, 0, TAU);
      ctx.fill();
      // Highlight lembut di ujung hidung
      ctx.fillStyle = 'rgba(255, 242, 232, 0.36)';
      ctx.beginPath();
      ctx.ellipse(nx + dir * 2.5, ny - 1, 5.5, 3.8, 0, 0, TAU);
      ctx.fill();
      // Garis batang tipis lembut + lengkung ujung hidung bersih
      ctx.strokeStyle = 'rgba(92, 54, 40, 0.32)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx + dir * 3.5, eyeY + 13);
      ctx.quadraticCurveTo(nx + dir * 6.5, eyeY + 22, nx + dir * 7.5, ny - 1);
      ctx.stroke();

      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(nx - 8.5, ny + 4.5);
      ctx.quadraticCurveTo(nx + dir * 2, ny + 9.5, nx + 9.5, ny + 3.5);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + shift + 4 * fSign, eyeY + 19);
      ctx.quadraticCurveTo(cx + shift + 12 * fSign, eyeY + 27, cx + shift + 4 * fSign, eyeY + 32);
      ctx.stroke();
    }
  }

  // --- 4. MULUT (sinkron dengan lip-sync talkAt jika aktif, atau bentuk ekspresi) ---
  const mx = cx + shift;
  const my = cy + (eyeStyle === 'almond' ? 66 : 70);
  if (p.faintMustache && face !== 'shock') {
    ctx.save();
    ctx.fillStyle = 'rgba(96, 64, 54, 0.08)';
    ctx.beginPath();
    ctx.ellipse(mx, my - 11, 24, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 5.5;

  if (talkSample.open > 0.16 && face !== 'shock') {
    const sh = talkSample.shape;
    if (sh === 'o') {
      const r = 10 + talkSample.open * 10;
      ctx.fillStyle = mouthFill;
      ctx.beginPath();
      ctx.ellipse(mx, my + 2, r * 0.82, r, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (sh === 'small') {
      ctx.fillStyle = mouthFill;
      ctx.beginPath();
      ctx.ellipse(mx, my + 1, 14, 7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      const w = sh === 'wide' ? 28 : 23;
      const h = sh === 'wide' ? 26 : 19;
      const frownCurve = face === 'angry' || face === 'sad' ? -4 : 0;
      ctx.beginPath();
      ctx.moveTo(mx - w, my - 3 - frownCurve);
      ctx.quadraticCurveTo(mx, my - 7 + frownCurve, mx + w, my - 3 - frownCurve);
      ctx.quadraticCurveTo(mx + w * 0.9, my + h, mx, my + h);
      ctx.quadraticCurveTo(mx - w * 0.9, my + h, mx - w, my - 3 - frownCurve);
      ctx.closePath();
      ctx.fillStyle = mouthFill;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - w, my - 8, w * 2, 11);
      ctx.fillStyle = tongueFill;
      ctx.beginPath();
      ctx.ellipse(mx, my + h - 2, w * 0.55, h * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.stroke();
    }
    return;
  }

  // Pita bibir opsional: garis mulut tertutup digambar dulu dengan warna bibir tebal, lalu garis ink di atasnya.
  const lipStroke = () => {
    if (p.fullLips) {
      const upCol = p.upperLipColor ?? '#ab7271';
      const lowCol = p.lipColor ?? '#c98e89';
      // Bentuk katup bibir atas & bawah mengikuti lengkung ekspresi (senyum ramah alami saat neutral/happy/smug!)
      const cornerDy =
        face === 'happy' || face === 'idea'
          ? -5
          : face === 'smug'
            ? -3.5
            : face === 'sad' || face === 'angry'
              ? 4.5
              : -2;
      const midSag = face === 'sad' || face === 'angry' ? -4 : face === 'happy' || face === 'idea' ? 6 : 3;
      const wLip = face === 'tired' ? 14 : 21;
      ctx.save();
      // Katup bibir bawah lembut natural + titik kilau bibir tipis seperti di foto Ebot
      ctx.fillStyle = lowCol;
      ctx.beginPath();
      ctx.moveTo(mx - wLip, my + cornerDy);
      ctx.quadraticCurveTo(mx, my + midSag + 10, mx + wLip, my + cornerDy);
      ctx.quadraticCurveTo(mx, my + midSag, mx - wLip, my + cornerDy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 238, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(mx - 5, my + midSag + 4.5);
      ctx.lineTo(mx + 5, my + midSag + 4.5);
      ctx.stroke();
      // Katup bibir atas dengan lekuk cupid's bow lembut menyatu alami dengan kulit
      ctx.fillStyle = upCol;
      ctx.beginPath();
      ctx.moveTo(mx - wLip, my + cornerDy);
      ctx.quadraticCurveTo(mx - wLip * 0.38, my - 5.5 + cornerDy * 0.3, mx, my - 3 + cornerDy * 0.3);
      ctx.quadraticCurveTo(mx + wLip * 0.38, my - 5.5 + cornerDy * 0.3, mx + wLip, my + cornerDy);
      ctx.quadraticCurveTo(mx, my + midSag, mx - wLip, my + cornerDy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Garis senyum/ekspresi tengah bibir yang luwes & bersih
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(mx - wLip - 1, my + cornerDy);
      ctx.quadraticCurveTo(mx, my + midSag, mx + wLip + 1, my + cornerDy);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (p.lipColor) {
      ctx.save();
      ctx.strokeStyle = p.lipColor;
      ctx.lineWidth = 13;
      ctx.stroke();
      ctx.restore();
    }
    ctx.stroke();
  };

  switch (face) {
    case 'shock':
      ctx.fillStyle = mouthFill;
      ctx.beginPath();
      ctx.ellipse(mx, my + 5, 16, 23, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    case 'happy':
    case 'idea':
      ctx.beginPath();
      ctx.arc(mx, my - 6, 20, 0.12 * Math.PI, 0.88 * Math.PI);
      lipStroke();
      break;
    case 'laugh':
      ctx.beginPath();
      ctx.moveTo(mx - 26, my - 4);
      ctx.lineTo(mx + 26, my - 4);
      ctx.quadraticCurveTo(mx + 24, my + 24, mx, my + 24);
      ctx.quadraticCurveTo(mx - 24, my + 24, mx - 26, my - 4);
      ctx.closePath();
      ctx.fillStyle = mouthFill;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 26, my - 6, 52, 10);
      ctx.fillStyle = tongueFill;
      ctx.beginPath();
      ctx.ellipse(mx, my + 20, 15, 9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      break;
    case 'sad':
      ctx.beginPath();
      ctx.arc(mx, my + 22, 18, 1.15 * Math.PI, 1.85 * Math.PI);
      lipStroke();
      break;
    case 'angry':
      ctx.beginPath();
      ctx.moveTo(mx - 20, my + 8);
      ctx.quadraticCurveTo(mx, my - 6, mx + 20, my + 8);
      lipStroke();
      break;
    case 'nervous':
      ctx.beginPath();
      ctx.moveTo(mx - 20, my + 4);
      ctx.quadraticCurveTo(mx - 10, my - 4, mx, my + 4);
      ctx.quadraticCurveTo(mx + 10, my + 12, mx + 20, my + 4);
      lipStroke();
      break;
    case 'smug':
      ctx.beginPath();
      ctx.moveTo(mx - 16, my + 3);
      ctx.quadraticCurveTo(mx + 6, my + 12, mx + 24, my - 7);
      lipStroke();
      break;
    case 'skeptical':
    case 'focus':
      ctx.beginPath();
      ctx.moveTo(mx - 16, my + 2);
      ctx.lineTo(mx + 16, my - 2);
      lipStroke();
      break;
    case 'strain':
      // Gigi terkatup menggeram / menahan tenaga (clenched teeth ala referensi)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(mx - 24, my - 5, 48, 22, 7);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(mx - 22, my + 6);
      ctx.lineTo(mx + 22, my + 6);
      for (const gx of [-11, 0, 11]) {
        ctx.moveTo(mx + gx, my - 5);
        ctx.lineTo(mx + gx, my + 17);
      }
      ctx.stroke();
      ctx.lineWidth = 5.5;
      break;
    case 'tired':
      ctx.beginPath();
      ctx.ellipse(mx, my + 5, 11, 7, 0, 0, TAU);
      lipStroke();
      break;
    default:
      ctx.beginPath();
      ctx.moveTo(mx - 17, my + 1);
      ctx.quadraticCurveTo(mx + 3, my + 10, mx + 19, my - 2);
      lipStroke();
  }
}
