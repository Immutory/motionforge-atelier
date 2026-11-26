export type StickerOutline = {
  color?: string;
  width?: number;
  outerColor?: string;
};

export const BLOB_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const BLOB_FRAG = /* glsl */ `
uniform vec3 uRatio;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float m = 1.0 - smoothstep(0.65, 1.0, r);
  gl_FragColor = vec4(mix(vec3(1.0), uRatio, m), 1.0);
}`;

/**
 * Helper bersama untuk mencetak outline stiker (ala thumbnail) di sekeliling siluet karakter 2D
 * tanpa menduplikasi `stampRing` antara `<ActorBillboard>` dan `<CatBillboard>`.
 */
export function stampStickerOutline(
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  heightPx: number,
  drawFull: (c: CanvasRenderingContext2D) => void,
  drawBodyOnly: (c: CanvasRenderingContext2D) => void,
  outline: StickerOutline,
): void {
  const off = document.createElement('canvas');
  off.width = widthPx;
  off.height = heightPx;
  const offCtx = off.getContext('2d')!;
  offCtx.scale(2, 2);
  drawFull(offCtx);

  const bodyOnly = document.createElement('canvas');
  bodyOnly.width = widthPx;
  bodyOnly.height = heightPx;
  const bodyCtx = bodyOnly.getContext('2d')!;
  bodyCtx.scale(2, 2);
  drawBodyOnly(bodyCtx);

  const sil = document.createElement('canvas');
  sil.width = widthPx;
  sil.height = heightPx;
  const silCtx = sil.getContext('2d')!;

  const stampRing = (col: string, radPx: number) => {
    silCtx.globalCompositeOperation = 'source-over';
    silCtx.clearRect(0, 0, sil.width, sil.height);
    silCtx.drawImage(bodyOnly, 0, 0);
    silCtx.globalCompositeOperation = 'source-in';
    silCtx.fillStyle = col;
    silCtx.fillRect(0, 0, sil.width, sil.height);

    const steps = 28;
    for (const r of [radPx * 0.55, radPx]) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ctx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
      }
    }
  };

  const wPx = (outline.width ?? 16) * 2;
  if (outline.outerColor) {
    stampRing(outline.outerColor, wPx + 9);
  }
  stampRing(outline.color ?? '#ffffff', wPx);
  ctx.drawImage(off, 0, 0);
}
