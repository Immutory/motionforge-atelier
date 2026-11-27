import type { Vec3 } from '../core/easing';

const TAU = Math.PI * 2;

export type Pt3 = readonly [x: number, y: number, z: number];
export type ProjPt = { x: number; y: number; z: number };

/**
 * Konversi sudut derajat ke radian terbungkus dalam [-PI, PI].
 */
export function degToRad(deg: number): number {
  const w = ((((deg + 180) % 360) + 360) % 360) - 180;
  return (w * Math.PI) / 180;
}

/**
 * Hitung sudut yaw kontinu relatif kamera dalam radian [-PI, PI] dan derajat [-180, 180].
 * `0°` = menghadap kamera (+Z lokal ke kamera), `+90°` = hadap kanan layar, `±180°` = membelakangi kamera.
 */
export function resolveYawAngle(actorPos: Vec3, forwardOrYaw: Vec3 | number, camPos: Vec3): { yawRad: number; yawDeg: number } {
  const fwd: Vec3 =
    typeof forwardOrYaw === 'number'
      ? [Math.sin((forwardOrYaw * Math.PI) / 180), 0, Math.cos((forwardOrYaw * Math.PI) / 180)]
      : forwardOrYaw;
  const tx = camPos[0] - actorPos[0];
  const tz = camPos[2] - actorPos[2];
  const tl = Math.hypot(tx, tz) || 1;
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const fx = fwd[0] / fl;
  const fz = fwd[2] / fl;
  const fwdDot = (fx * tx + fz * tz) / tl;
  const sideDot = (fx * tz - fz * tx) / tl;
  const yawRad = Math.atan2(sideDot, fwdDot);
  return { yawRad, yawDeg: (yawRad * 180) / Math.PI };
}

/**
 * Rotasi titik 3D lokal `(x, y, z)` di sekitar sumbu vertikal Y (`yawRad`):
 * `+x` = kanan saat `yaw=0`, `+y` = bawah (px kanvas), `+z` = maju ke kamera.
 */
export function rotateYaw3D(p: Pt3, yawRad: number, pivot: Pt3 = [0, 0, 0]): ProjPt {
  const dx = p[0] - pivot[0];
  const dz = p[2] - pivot[2];
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return {
    x: pivot[0] + dx * c + dz * s,
    y: p[1],
    z: -dx * s + dz * c,
  };
}

/**
 * Proyeksi titik pada permukaan silinder/elipsoid vertikal berpusat `(cx, cy)`
 * dengan jari-jari `(rx, rz)` pada azimut lokal `thetaRad` (`0` = tengah depan).
 */
export function surfacePoint3D(
  cx: number,
  cy: number,
  rx: number,
  rz: number,
  thetaRad: number,
  yawRad: number,
): { x: number; y: number; z: number; nx: number; nz: number; vis: number } {
  const a = thetaRad + yawRad;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  return {
    x: cx + rx * sa,
    y: cy,
    z: rz * ca,
    nx: sa,
    nz: ca,
    vis: ca,
  };
}

/** Faktor penggelapan halus proporsional berdasarkan kedalaman `z` anggota tubuh jauh (0..maxDark). */
export function depthDarkenFactor(zDepth: number, refRadius: number, maxDark = 0.16): number {
  if (zDepth >= 0 || refRadius <= 1e-4) return 0;
  return Math.max(0, Math.min(maxDark, (-zDepth / refRadius) * maxDark));
}

/** Pengurutan stabil dari `z` terkecil (terjauh) ke terbesar (terdekat ke kamera). */
export function sortByDepthZ<T extends { z: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.z - b.z);
}

// ---------------------------------------------------------------------------------------------
// Height+AO Relief Map Rasterizer (`uReliefMap`: Channel R = tinggi 0..1, G = contact AO 0.72..1.0)
// ---------------------------------------------------------------------------------------------

export type ReliefPrimitive =
  | {
      kind: 'sphere';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      z: number;
      heightScale?: number;
      ao?: number;
    }
  | {
      kind: 'capsule';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      radius: number;
      z: number;
      heightScale?: number;
      ao?: number;
    };

let SPHERE_SPRITE: HTMLCanvasElement | null = null;

function getUnitSphereSprite(): HTMLCanvasElement {
  if (SPHERE_SPRITE) return SPHERE_SPRITE;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const half = S * 0.5;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const nx = (px + 0.5 - half) / half;
      const ny = (py + 0.5 - half) / half;
      const d2 = nx * nx + ny * ny;
      const idx = (py * S + px) * 4;
      if (d2 >= 1) {
        img.data[idx] = 0;
        img.data[idx + 1] = 255;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = 0;
      } else {
        const h = Math.sqrt(1 - d2);
        const rimAlpha = d2 > 0.88 ? Math.max(0, Math.min(1, (1 - d2) / 0.12)) : 1;
        img.data[idx] = Math.round(h * 255);
        img.data[idx + 1] = 255;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = Math.round(rimAlpha * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  SPHERE_SPRITE = c;
  return c;
}

/**
 * Gambar peta ketinggian (`R`) + contact AO (`G`) pada resolusi 0.5x untuk normal shader 3D per-piksel.
 * Memakai pengurutan depth Z agar bagian lebih dekat memberi bayangan/AO halus terhadap bagian belakang.
 */
export function paintReliefPrimitives(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  designW: number,
  designH: number,
  primitives: readonly ReliefPrimitive[],
): void {
  const sx = w / designW;
  const sy = h / designH;
  const sprite = getUnitSphereSprite();

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgb(0, 255, 0)';
  ctx.fillRect(0, 0, w, h);

  const ordered = sortByDepthZ(primitives);

  // Tahap 1: gabungkan tinggi kelengkungan skalar pada channel R (mode 'lighten' = max(h1, h2))
  ctx.globalCompositeOperation = 'lighten';
  for (const p of ordered) {
    const k = Math.max(0.2, Math.min(1, p.heightScale ?? 1));
    ctx.globalAlpha = k;
    if (p.kind === 'sphere') {
      const rx = Math.max(2, p.rx * sx);
      const ry = Math.max(2, p.ry * sy);
      ctx.drawImage(sprite, p.cx * sx - rx, p.cy * sy - ry, rx * 2, ry * 2);
    } else {
      const x1 = p.x1 * sx;
      const y1 = p.y1 * sy;
      const x2 = p.x2 * sx;
      const y2 = p.y2 * sy;
      const r = Math.max(2, p.radius * ((sx + sy) * 0.5));
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const steps = Math.max(3, Math.ceil(len / Math.max(2, r * 0.45)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        ctx.drawImage(sprite, cx - r, cy - r, r * 2, r * 2);
      }
    }
  }

  // Tahap 2: contact AO halus pada channel G untuk bagian yang berada di belakang (z < 0)
  ctx.globalCompositeOperation = 'multiply';
  for (const p of ordered) {
    const ao = p.ao ?? (p.z < -4 ? 0.84 : 1);
    if (ao >= 0.995) continue;
    const gVal = Math.round(Math.max(165, Math.min(255, ao * 255)));
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(255, ${gVal}, 255)`;
    ctx.beginPath();
    if (p.kind === 'sphere') {
      ctx.ellipse(p.cx * sx, p.cy * sy, p.rx * sx * 0.92, p.ry * sy * 0.92, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgb(255, ${gVal}, 255)`;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, p.radius * ((sx + sy) * 0.5) * 1.75);
      ctx.moveTo(p.x1 * sx, p.y1 * sy);
      ctx.lineTo(p.x2 * sx, p.y2 * sy);
      ctx.stroke();
    }
  }

  ctx.restore();
}
