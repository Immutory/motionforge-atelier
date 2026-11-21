import type { TalkSample } from './lipsync';

/** 12 ekspresi siap pakai untuk konten storytelling, edutainment, dan komedi YouTube. */
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
  | 'focus';

export type EyeStyle = 'classic' | 'pill' | 'sclera' | 'lash';
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
  nose?: boolean;
};

/** Gambar mata, alis, hidung opsional, dan mulut (terintegrasi penuh dengan lip-sync talkAt). */
export function drawFaceFeatures(ctx: Ctx, p: FaceRenderParams) {
  const { cx, cy, headW: W, skin, ink, eyeStyle, face, blink, facing } = p;
  const shift = facing * W * 0.085;
  const ex = (s: number) => cx + shift + s * W * 0.148;
  const eyeY = cy + 12;
  const talkSample: TalkSample =
    typeof p.talk === 'number'
      ? { open: p.talk, shape: p.talk > 0.65 ? 'wide' : p.talk > 0.3 ? 'mid' : p.talk > 0.16 ? 'small' : 'closed' }
      : (p.talk ?? { open: 0, shape: 'closed' });

  // --- 1. MATA ---
  for (const s of [-1, 1]) {
    const x = ex(s);
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
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11.5, face === 'idea' || face === 'happy' ? 17 : 15.5, 0, 0, TAU);
      ctx.fill();
      if (eyeStyle === 'lash') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + s * 9, eyeY - 10);
        ctx.lineTo(x + s * 16, eyeY - 14);
        ctx.stroke();
      }
    }
  }

  // --- 2. ALIS ---
  const by = eyeY - 40;
  const blen = 39;
  const bt = p.browThick ?? 10.5;
  switch (face) {
    case 'shock':
      drawBrow(ctx, ex(-1), by - 14, blen, bt, -15, ink);
      drawBrow(ctx, ex(1), by - 14, blen, bt, 15, ink);
      break;
    case 'angry':
      drawBrow(ctx, ex(-1), by + 4, blen + 4, bt + 2, 20, ink);
      drawBrow(ctx, ex(1), by + 4, blen + 4, bt + 2, -20, ink);
      break;
    case 'sad':
    case 'nervous':
      drawBrow(ctx, ex(-1), by + 2, blen, bt, -18, ink);
      drawBrow(ctx, ex(1), by + 2, blen, bt, 18, ink);
      break;
    case 'smug':
    case 'skeptical':
      drawBrow(ctx, ex(-1), by - 10, blen, bt, -12, ink);
      drawBrow(ctx, ex(1), by + 4, blen, bt, 8, ink);
      break;
    case 'idea':
    case 'happy':
    case 'laugh':
      drawBrow(ctx, ex(-1), by - 7, blen, bt, -8, ink);
      drawBrow(ctx, ex(1), by - 7, blen, bt, 8, ink);
      break;
    case 'tired':
      drawBrow(ctx, ex(-1), by + 5, blen, bt, -4, ink);
      drawBrow(ctx, ex(1), by + 5, blen, bt, 4, ink);
      break;
    case 'focus':
      drawBrow(ctx, ex(-1), by + 2, blen, bt, 10, ink);
      drawBrow(ctx, ex(1), by + 2, blen, bt, -10, ink);
      break;
    default:
      drawBrow(ctx, ex(-1), by - 1, blen, bt, -4, ink);
      drawBrow(ctx, ex(1), by - 1, blen, bt, 4, ink);
  }

  // --- 3. HIDUNG OPSIONAL ---
  if (p.nose) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + shift + 4, eyeY + 19);
    ctx.quadraticCurveTo(cx + shift + 12, eyeY + 27, cx + shift + 4, eyeY + 32);
    ctx.stroke();
  }

  // --- 4. MULUT (sinkron dengan lip-sync talkAt jika aktif, atau bentuk ekspresi) ---
  const mx = cx + shift;
  const my = cy + 70;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 5.5;

  if (talkSample.open > 0.16 && face !== 'shock') {
    const sh = talkSample.shape;
    if (sh === 'o') {
      const r = 10 + talkSample.open * 10;
      ctx.fillStyle = '#5c222d';
      ctx.beginPath();
      ctx.ellipse(mx, my + 2, r * 0.82, r, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (sh === 'small') {
      ctx.fillStyle = '#5c222d';
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
      ctx.fillStyle = '#5c222d';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - w, my - 8, w * 2, 11);
      ctx.fillStyle = '#e57373';
      ctx.beginPath();
      ctx.ellipse(mx, my + h - 2, w * 0.55, h * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.stroke();
    }
    return;
  }

  switch (face) {
    case 'shock':
      ctx.fillStyle = '#5c222d';
      ctx.beginPath();
      ctx.ellipse(mx, my + 5, 16, 23, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    case 'happy':
    case 'idea':
      ctx.beginPath();
      ctx.arc(mx, my - 6, 20, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      break;
    case 'laugh':
      ctx.beginPath();
      ctx.moveTo(mx - 26, my - 4);
      ctx.lineTo(mx + 26, my - 4);
      ctx.quadraticCurveTo(mx + 24, my + 24, mx, my + 24);
      ctx.quadraticCurveTo(mx - 24, my + 24, mx - 26, my - 4);
      ctx.closePath();
      ctx.fillStyle = '#5c222d';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 26, my - 6, 52, 10);
      ctx.fillStyle = '#e57373';
      ctx.beginPath();
      ctx.ellipse(mx, my + 20, 15, 9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      break;
    case 'sad':
      ctx.beginPath();
      ctx.arc(mx, my + 22, 18, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      break;
    case 'angry':
      ctx.beginPath();
      ctx.moveTo(mx - 20, my + 8);
      ctx.quadraticCurveTo(mx, my - 6, mx + 20, my + 8);
      ctx.stroke();
      break;
    case 'nervous':
      ctx.beginPath();
      ctx.moveTo(mx - 20, my + 4);
      ctx.quadraticCurveTo(mx - 10, my - 4, mx, my + 4);
      ctx.quadraticCurveTo(mx + 10, my + 12, mx + 20, my + 4);
      ctx.stroke();
      break;
    case 'smug':
      ctx.beginPath();
      ctx.moveTo(mx - 16, my + 3);
      ctx.quadraticCurveTo(mx + 6, my + 12, mx + 24, my - 7);
      ctx.stroke();
      break;
    case 'skeptical':
    case 'focus':
      ctx.beginPath();
      ctx.moveTo(mx - 16, my + 2);
      ctx.lineTo(mx + 16, my - 2);
      ctx.stroke();
      break;
    case 'tired':
      ctx.beginPath();
      ctx.ellipse(mx, my + 5, 11, 7, 0, 0, TAU);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.moveTo(mx - 17, my + 1);
      ctx.quadraticCurveTo(mx + 3, my + 10, mx + 19, my - 2);
      ctx.stroke();
  }
}
