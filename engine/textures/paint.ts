import * as THREE from 'three';

type Rng = () => number;
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const CACHE = new Map<string, THREE.CanvasTexture>();

/** Generator angka acak deterministik (Mulberry32) supaya tekstur identik di setiap render. */
export function rng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length) % arr.length];
const randRange = (r: Rng, a: number, b: number) => a + (b - a) * r();

const wrapX = (W: number, x: number, w: number, fn: (xx: number) => void) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};

const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (xx: number, yy: number) => void) => {
  for (const ox of [0, -W, W]) {
    for (const oy of [0, -H, H]) {
      const X = x + ox;
      const Y = y + oy;
      if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
    }
  }
};

const roundedRect = (g: Ctx, x: number, y: number, w: number, h: number, rad: number) => {
  const k = Math.max(0, Math.min(rad, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
};

const blotch = (g: Ctx, x: number, y: number, rad: number, sx: number, rgb: string, alpha: number) => {
  g.save();
  g.translate(x, y);
  g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${alpha})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};

const woodGrain = (
  g: Ctx,
  r: Rng,
  W: number,
  x: number,
  y: number,
  len: number,
  amp: number,
  lw: number,
  col: string,
) => {
  const n = Math.max(2, Math.round(len / 140));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + (len * i) / n;
      g.quadraticCurveTo(
        x1 - len / n / 2,
        y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp,
        x1,
        y + dy[i],
      );
    }
    g.stroke();
  });
};

const nail = (g: Ctx, x: number, y: number, rad: number, col = '#3a2212') => {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, rad, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,240,215,0.55)';
  g.beginPath();
  g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.36, 0, TAU);
  g.fill();
};

export type CtexOptions = {
  repeat?: [number, number];
  clamp?: boolean;
  anisotropy?: number;
};

/** Lepaskan seluruh CanvasTexture di cache prosedural dari VRAM dan kosongkan cache. */
export function disposeTextureCache() {
  for (const tex of CACHE.values()) tex.dispose();
  CACHE.clear();
}

/** Buat dan cache CanvasTexture deterministik di ruang sRGB. */
export function ctex(
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx, r: Rng) => void,
  opts: CtexOptions = {},
): THREE.CanvasTexture {
  const aniso = opts.anisotropy ?? 8;
  const cacheKey = `${key}_${w}x${h}_${opts.repeat?.join('x') ?? '1x1'}_${opts.clamp ? 'c' : 'r'}_a${aniso}`;
  const hit = CACHE.get(cacheKey);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, rng(hashKey(key)));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.anisotropy = opts.anisotropy ?? 8;
  tex.needsUpdate = true;
  CACHE.set(cacheKey, tex);
  return tex;
}

/**
 * Papan kayu hand-painted (references/reports/textures.md):
 * warna papan cerah, celah tipis ~4% pitch, bibir terang/gelap, serat lembut & paku.
 */
export function planksTexture(opts: { key?: string; fills?: string[]; repeat?: [number, number] } = {}) {
  const fills = opts.fills ?? ['#efbd82', '#e8b47a', '#f4c58b', '#e3ae74', '#ecb97e'];
  return ctex(
    opts.key ?? `atelier_planks_${fills.join(',')}`,
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      const B = 128;
      const GAP = 4;
      for (let i = 0; i < 8; i++) {
        const y = i * B;
        g.save();
        g.beginPath();
        g.rect(0, y, S, B);
        g.clip();
        g.fillStyle = pick(r, fills);
        g.fillRect(0, y, S, B);

        for (let k = 0; k < 5; k++) {
          const x = randRange(r, 0, S);
          const rad = randRange(r, 60, 130);
          const light = r() > 0.5;
          wrapX(S, x - rad * 3, rad * 6, (xx) =>
            blotch(g, xx + rad * 3, y + B / 2, rad, 3, light ? '255,236,200' : '150,90,40', light ? 0.12 : 0.08),
          );
        }
        for (let k = 0; k < 8; k++) {
          const light = r() < 0.3;
          woodGrain(
            g,
            r,
            S,
            randRange(r, 0, S),
            y + randRange(r, 10, B - 10),
            randRange(r, 260, 720),
            randRange(r, 1, 3.5),
            randRange(r, 1, 2.2),
            light ? 'rgba(255,238,205,0.14)' : 'rgba(140,82,36,0.13)',
          );
        }
        if (r() < 0.35) {
          const kx = randRange(r, 60, S - 60);
          const ky = y + randRange(r, 35, B - 35);
          const rx = randRange(r, 7, 13);
          const ry = rx * randRange(r, 0.45, 0.6);
          g.strokeStyle = 'rgba(140,82,36,0.20)';
          g.lineWidth = 1.4;
          g.beginPath();
          g.ellipse(kx, ky, rx * 2.2, ry * 1.9, 0, 0, TAU);
          g.stroke();
          g.fillStyle = 'rgba(150,88,38,0.28)';
          g.beginPath();
          g.ellipse(kx, ky, rx, ry, 0, 0, TAU);
          g.fill();
        }
        g.fillStyle = 'rgba(255,238,200,0.35)';
        g.fillRect(0, y + GAP / 2 + 1, S, 2);
        const sh = g.createLinearGradient(0, y + B - GAP / 2 - 10, 0, y + B - GAP / 2);
        sh.addColorStop(0, 'rgba(80,35,10,0)');
        sh.addColorStop(1, 'rgba(80,35,10,0.24)');
        g.fillStyle = sh;
        g.fillRect(0, y + B - GAP / 2 - 10, S, 10);

        const jx = randRange(r, 50, S - 50);
        g.fillStyle = '#66300f';
        g.fillRect(jx - 1.5, y, 3, B);
        g.fillStyle = 'rgba(255,238,200,0.30)';
        g.fillRect(jx + 1.5, y, 1.5, B);
        for (const nx of [jx - 14, jx + 14]) {
          for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 2.8);
        }
        g.restore();
      }
      for (let i = 0; i <= 8; i++) {
        g.fillStyle = 'rgba(102,48,15,0.45)';
        g.fillRect(0, i * B - GAP / 2 - 1, S, GAP + 2);
        g.fillStyle = '#66300f';
        g.fillRect(0, i * B - GAP / 2, S, GAP);
      }
    },
    { repeat: opts.repeat },
  );
}

/** Balok / panel kayu hangat (tidak jatuh ke hitam di bayangan). */
export function beamTexture(opts: { key?: string; fills?: string[]; repeat?: [number, number] } = {}) {
  const fills = opts.fills ?? ['#b67e47', '#a8743f', '#c28a52'];
  return ctex(
    opts.key ?? `atelier_beam_${fills.join(',')}`,
    1024,
    512,
    (g, r) => {
      const W = 1024;
      const H = 512;
      const T = H / 6;
      for (let k = 0; k < 6; k++) {
        const y = k * T;
        g.save();
        g.beginPath();
        g.rect(0, y, W, T);
        g.clip();
        g.fillStyle = pick(r, fills);
        g.fillRect(0, y, W, T);
        for (let i = 0; i < 6; i++) {
          const light = r() < 0.3;
          woodGrain(
            g,
            r,
            W,
            randRange(r, 0, W),
            y + randRange(r, 8, T - 8),
            randRange(r, 250, 700),
            randRange(r, 1.5, 4),
            randRange(r, 1.5, 3),
            light ? 'rgba(255,232,190,0.14)' : 'rgba(85,48,20,0.16)',
          );
        }
        g.fillStyle = 'rgba(255,235,195,0.30)';
        g.fillRect(0, y + 3, W, 3);
        const sh = g.createLinearGradient(0, y + T - 12, 0, y + T);
        sh.addColorStop(0, 'rgba(60,28,8,0)');
        sh.addColorStop(1, 'rgba(60,28,8,0.24)');
        g.fillStyle = sh;
        g.fillRect(0, y + T - 12, W, 12);
        const jx = randRange(r, 120, W - 120);
        g.fillStyle = '#532a12';
        g.fillRect(jx - 2, y, 4, T);
        for (const bx of [jx - 26, jx + 26]) nail(g, bx, y + T / 2, 5.5, '#342c2c');
        g.restore();
        g.fillStyle = '#532a12';
        g.fillRect(0, y - 1.5, W, 3);
      }
    },
    { repeat: opts.repeat },
  );
}

/** Dinding plester hand-painted: bidang warna hangat, bercak lembut lebar, plinth bawah, dan retak halus. */
export function plasterTexture(opts: { key?: string; wall?: string; plinth?: boolean; repeat?: [number, number] } = {}) {
  const wall = opts.wall ?? '#f0dfc8';
  const plinth = opts.plinth !== false ? 1 : 0;
  return ctex(
    opts.key ?? `atelier_plaster_${wall}_p${plinth}`,
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      g.fillStyle = wall;
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) {
        const light = r() > 0.5;
        const rad = randRange(r, 90, 260);
        wrap2(S, S, randRange(r, 0, S), randRange(r, 0, S), rad * 1.4, (xx, yy) =>
          blotch(g, xx, yy, rad, 1.4, light ? '255,252,244' : '150,115,85', light ? 0.08 : 0.06),
        );
      }
      for (let i = 0; i < 6; i++) {
        let x = randRange(r, 60, S - 60);
        let y = randRange(r, 60, S * 0.8);
        g.strokeStyle = 'rgba(130,105,85,0.30)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += randRange(r, -18, 18);
          y += randRange(r, 12, 30);
          g.lineTo(x, y);
        }
        g.stroke();
      }
      if (opts.plinth !== false) {
        g.fillStyle = 'rgba(110,88,72,0.22)';
        g.fillRect(0, S - 110, S, 110);
        g.fillStyle = 'rgba(95,74,60,0.32)';
        g.fillRect(0, S - 110, S, 4);
      }
    },
    { repeat: opts.repeat },
  );
}

/** Batu ashlar bergaya ilustrasi dengan mortar tipis terang, bevel atas-kiri, bintik dan retak halus. */
export function stoneTexture(
  opts: { key?: string; colors?: string[]; mortar?: string; repeat?: [number, number] } = {},
) {
  const colors = opts.colors ?? ['#e3d7c6', '#d8cab8', '#ebe0d1', '#cfc1ae'];
  const mortar = opts.mortar ?? '#a89a89';
  return ctex(
    opts.key ?? `atelier_stone_${mortar}_${colors.join(',')}`,
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      const RH = 128;
      const J = 7;
      g.fillStyle = mortar;
      g.fillRect(0, 0, S, S);
      for (let row = 0; row < S / RH; row++) {
        const y = row * RH;
        const ws: number[] = [];
        let sum = 0;
        while (sum < S) {
          const w = randRange(r, 200, 360);
          ws.push(w);
          sum += w;
        }
        const k = S / sum;
        let x = (row % 2) * 140 + randRange(r, 0, 60);
        for (const w0 of ws) {
          const w = w0 * k;
          const col = pick(r, colors);
          const dl = randRange(r, -1, 1);
          const sp = Array.from({ length: 12 }, () => [r(), r(), randRange(r, 1, 2.2), r() < 0.6 ? 1 : 0]);
          const crack = r() < 0.15 ? Array.from({ length: 4 }, () => [r(), r()]) : null;
          wrapX(S, x % S, w, (xx) => {
            const X = xx + J / 2;
            const Y = y + J / 2;
            const BW = w - J;
            const BH = RH - J;
            roundedRect(g, X, Y, BW, BH, 5);
            g.fillStyle = col;
            g.fill();
            g.fillStyle = dl > 0 ? `rgba(255,252,245,${0.07 * dl})` : `rgba(70,55,45,${-0.06 * dl})`;
            g.fill();
            g.fillStyle = 'rgba(255,252,245,0.22)';
            g.fillRect(X + 3, Y, BW - 6, 6);
            g.fillStyle = 'rgba(255,252,245,0.10)';
            g.fillRect(X, Y + 4, 4, BH - 8);
            g.fillStyle = 'rgba(70,55,45,0.14)';
            g.fillRect(X + 3, Y + BH - 5, BW - 6, 5);
            for (const [u, v, s, dark] of sp) {
              g.fillStyle = dark ? 'rgba(95,82,72,0.34)' : 'rgba(255,255,255,0.32)';
              g.beginPath();
              g.arc(X + 6 + u * (BW - 12), Y + 8 + v * (BH - 16), s, 0, TAU);
              g.fill();
            }
            if (crack) {
              g.strokeStyle = 'rgba(110,95,85,0.42)';
              g.lineWidth = 1.2;
              g.beginPath();
              crack.forEach(([u, v], i) => {
                const px = X + 10 + u * (BW - 20);
                const py = Y + 10 + v * (BH - 20);
                if (i) g.lineTo(px, py);
                else g.moveTo(px, py);
              });
              g.stroke();
            }
          });
          x += w;
        }
      }
    },
    { repeat: opts.repeat },
  );
}

/** Jalan batu paving / granit berselang-seling dengan bevel halus (tanpa pola bintik polkadot). */
export function cobbleTexture(opts: { key?: string; repeat?: [number, number] } = {}) {
  return ctex(
    opts.key ?? 'atelier_cobble',
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      const N = 20;
      const CH = S / N;
      const J = 5;
      g.fillStyle = '#9c8e78';
      g.fillRect(0, 0, S, S);
      const cols = ['#d2c8b6', '#c8bda9', '#dcd3c2', '#c1b5a1', '#d6cdbc', '#ccc3b4'];
      for (let row = 0; row < N; row++) {
        const y = row * CH;
        const ws: number[] = [];
        let sum = 0;
        while (sum < S) {
          const w = randRange(r, 56, 86);
          ws.push(w);
          sum += w;
        }
        const k = S / sum;
        let x = randRange(r, 0, 70);
        for (const w0 of ws) {
          const w = w0 * k;
          const col = pick(r, cols);
          const dy = randRange(r, -1.5, 1.5);
          const rad = randRange(r, 7, 12);
          wrapX(S, x % S, w, (xx) => {
            const X = xx + J / 2;
            const Y = y + J / 2 + dy;
            const W = w - J;
            const H = CH - J;
            roundedRect(g, X, Y, W, H, rad);
            g.fillStyle = col;
            g.fill();
            g.save();
            roundedRect(g, X, Y, W, H, rad);
            g.clip();
            const gr = g.createLinearGradient(X, Y, X + W * 0.6, Y + H);
            gr.addColorStop(0, 'rgba(255,250,240,0.20)');
            gr.addColorStop(0.5, 'rgba(255,250,240,0)');
            gr.addColorStop(1, 'rgba(70,58,45,0.16)');
            g.fillStyle = gr;
            g.fillRect(X, Y, W, H);
            g.restore();
          });
          x += w;
        }
      }
      for (let i = 0; i < 12; i++) {
        const rad = randRange(r, 60, 150);
        wrap2(S, S, randRange(r, 0, S), randRange(r, 0, S), rad * 1.3, (xx, yy) =>
          blotch(g, xx, yy, rad, 1.3, '80,70,55', 0.06),
        );
      }
    },
    { repeat: opts.repeat },
  );
}

/** Rumput datar jenuh dengan variasi bidang lebar, helai V-tuft, dan bunga jarang. */
export function grassTexture(opts: { key?: string; repeat?: [number, number] } = {}) {
  return ctex(
    opts.key ?? 'atelier_grass',
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      g.fillStyle = '#75b53f';
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) {
        const rad = randRange(r, 120, 300);
        const light = r() > 0.5;
        wrap2(S, S, randRange(r, 0, S), randRange(r, 0, S), rad * 1.4, (xx, yy) =>
          blotch(g, xx, yy, rad, 1.4, light ? '144,202,84' : '92,154,48', 0.34),
        );
      }
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = 0; i < 1100; i++) {
        const x = randRange(r, 0, S);
        const y = randRange(r, 0, S);
        const h = randRange(r, 7, 16);
        const lean = randRange(r, -3, 3);
        const light = r() < 0.4;
        wrap2(S, S, x, y, 20, (xx, yy) => {
          g.strokeStyle = light ? 'rgba(165,218,98,0.35)' : 'rgba(78,138,38,0.42)';
          g.beginPath();
          g.moveTo(xx - 3 + lean, yy - h);
          g.lineTo(xx, yy);
          g.lineTo(xx + 3 + lean, yy - h * 0.8);
          g.stroke();
        });
      }
      for (let i = 0; i < 12; i++) {
        const c = pick(r, ['#f7f3e8', '#f4d24a', '#f3a9bb', '#f7f3e8']);
        wrap2(S, S, randRange(r, 0, S), randRange(r, 0, S), 8, (xx, yy) => {
          g.fillStyle = c;
          g.beginPath();
          g.arc(xx, yy, 3.5, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(240,190,60,0.9)';
          g.beginPath();
          g.arc(xx, yy, 1.3, 0, TAU);
          g.fill();
        });
      }
    },
    { repeat: opts.repeat },
  );
}

/** Atap genteng / slate tanpa garis tinta hitam di setiap genteng. */
export function roofTexture(color = '#d27a62', slate = false, repeat?: [number, number]) {
  return ctex(
    `atelier_roof_${color}_${slate ? 's' : 't'}`,
    1024,
    1024,
    (g, r) => {
      const S = 1024;
      const C = 64;
      const TW = slate ? 52 : 77;
      g.fillStyle = color;
      g.fillRect(0, 0, S, S);
      for (let row = 0; row < S / C; row++) {
        const y = row * C;
        const off = ((row % 2) * TW) / 2 + randRange(r, -6, 6);
        const n = Math.ceil(S / TW) + 1;
        for (let i = 0; i < n; i++) {
          const x = i * TW - off;
          const tone = randRange(r, -1, 1);
          const fill = tone > 0 ? `rgba(255,240,225,${0.1 * tone})` : `rgba(60,25,20,${-0.1 * tone})`;
          wrapX(S, x, TW, (xx) => {
            g.fillStyle = fill;
            g.fillRect(xx, y, TW, C);
            const gr = g.createLinearGradient(xx, 0, xx + TW, 0);
            gr.addColorStop(0, 'rgba(255,240,225,0.12)');
            gr.addColorStop(0.55, 'rgba(255,240,225,0)');
            gr.addColorStop(1, slate ? 'rgba(20,25,35,0.10)' : 'rgba(60,25,20,0.12)');
            g.fillStyle = gr;
            g.fillRect(xx, y, TW, C);
            g.fillStyle = slate ? 'rgba(20,25,35,0.25)' : 'rgba(60,25,20,0.22)';
            g.fillRect(xx, y, 2, C);
          });
        }
        g.fillStyle = slate ? 'rgba(220,230,245,0.18)' : 'rgba(255,235,220,0.22)';
        g.fillRect(0, y + C - 9, S, 3);
        g.fillStyle = slate ? 'rgba(15,20,30,0.30)' : 'rgba(55,22,18,0.30)';
        g.fillRect(0, y + C - 5, S, 5);
      }
    },
    { repeat },
  );
}

export type CloudPalette = { lit: string; mid: string; shade: string };
export const CLOUD_DAY: CloudPalette = { lit: '#fbf8f1', mid: '#e1e5f3', shade: '#c3cbe9' };
export const CLOUD_GOLD: CloudPalette = { lit: '#ffd2a8', mid: '#f2a08f', shade: '#a98fc4' };

/** Sprite awan cumulus 3-nada (mahkota terang, badan sedang, perut lavender) dengan dasar rata lembut. */
export function cloudTexture(seed = 1, pal: CloudPalette = CLOUD_DAY) {
  return ctex(
    `atelier_cloud_${pal.lit}_${pal.mid}_${pal.shade}_${seed}`,
    1024,
    512,
    (g) => {
      const r = rng(seed * 7919 + 17);
      const W = 1024;
      const H = 512;
      const base = 400;
      const n = 6 + Math.floor(r() * 4);
      const lobes: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const rad = (60 + 110 * Math.pow(Math.sin(Math.PI * t), 0.8)) * randRange(r, 0.75, 1.15);
        lobes.push({ x: 150 + t * 724 + randRange(r, -30, 30), y: base - rad * randRange(r, 0.35, 0.65), r: rad });
      }
      for (let i = 0; i < Math.floor(n / 2); i++) {
        const t = randRange(r, 0.25, 0.75);
        const rad = randRange(r, 60, 110);
        lobes.push({ x: 150 + t * 724, y: base - 150 - rad * randRange(r, 0.3, 0.7), r: rad });
      }
      const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
        g.save();
        g.filter = `blur(${blur}px)`;
        g.fillStyle = col;
        g.beginPath();
        for (const l of lobes) {
          const x = l.x + dx * l.r;
          const y = l.y + dy * l.r;
          g.moveTo(x + l.r * k, y);
          g.arc(x, y, l.r * k, 0, TAU);
        }
        g.fill();
        g.restore();
      };
      layer(0, 0, 1.0, pal.shade, 6);
      layer(-0.04, -0.12, 0.9, pal.mid, 8);
      layer(-0.1, -0.26, 0.72, pal.lit, 10);
      g.globalCompositeOperation = 'destination-in';
      const m = g.createLinearGradient(0, base - 18, 0, base + 6);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    },
    { clamp: true },
  );
}
