/**
 * Pustaka 23 prop tangan 2D yang dapat dipasang di tangan kiri atau kanan karakter mana pun.
 * Digambar pada sistem koordinat lokal tangan (0, 0).
 */

export type HandProp =
  | 'none'
  | 'book'
  | 'mic'
  | 'esteh'
  | 'kopi'
  | 'sodet'
  | 'phone'
  | 'phoneMap'
  | 'map'
  | 'lightbulb'
  | 'magnifier'
  | 'money'
  | 'pointer'
  | 'sign'
  | 'laptop'
  | 'coffeeCup'
  | 'bakmie'
  | 'esBuah'
  | 'senter'
  | 'pen'
  | 'lap'
  | 'phoneClock'
  | 'glassEmpty'
  | 'walletEmpty';

/**
 * Jam bawaan di layar prop `phoneClock` bila pose tidak mengisi `HandPropOptions.text`
 * (format `HH:MM`, sama dengan jam taskbar laptop diegetik). Produksi mengatur jam per frame lewat
 * `ActorPose.leftHand/rightHand.propText`.
 */
export const PHONE_CLOCK_TEXT = '06:58';

/** Opsi gambar prop per tangan (semua opsional; default = gambar lama identik). */
export type HandPropOptions = {
  /** Teks layar prop berteks (`phoneClock`). Default `PHONE_CLOCK_TEXT`. */
  text?: string;
  /** Pengali uap prop panas (`kopi`): 0 = tanpa uap, 1 = default, >1 = uap menguat (mis. saat dihirup). */
  steam?: number;
  /** Kemiringan prop di ruang layar (radian, + = searah jarum jam), mis. gelas dimiringkan saat menyesap. */
  tilt?: number;
};

/** Geometri gelas `kopi` relatif titik tangan (tangan kanan, sebelum `tilt`): bibir gelas & dasar gelas. */
export const KOPI_GLASS = { dx: 14, rimY: -58, baseY: 4, halfW: 24 } as const;

/** Titik tengah bibir gelas `kopi` (px kanvas) untuk tangan di (x, y), arah `dir` (+1 kanan, -1 kiri), dan `tilt`. */
export function kopiRimPoint(x: number, y: number, dir: 1 | -1 = 1, tilt = 0): { x: number; y: number } {
  const lx = dir * KOPI_GLASS.dx;
  const ly = KOPI_GLASS.rimY;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return { x: x + lx * c - ly * s, y: y + lx * s + ly * c };
}

/**
 * Tulis teks yang SELALU tegak dan tidak ter-mirror, apa pun transform kanvas saat ini
 * (prop di tangan kiri digambar dengan `scale(-1, 1)`, plus rotasi prop/lean badan).
 * - determinan matriks < 0 (ter-mirror) -> dibalik lagi secara lokal pada sumbu X
 * - sumbu Y lokal mengarah ke atas layar (terbalik) -> diputar 180°
 */
export function fillTextUpright(ctx: Ctx, text: string, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  const m = ctx.getTransform();
  if (m.a * m.d - m.b * m.c < 0) ctx.scale(-1, 1);
  const u = ctx.getTransform();
  if (u.d < 0) ctx.rotate(Math.PI);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

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

/**
 * Gambar prop tangan 2D pada posisi (x, y). `dir` = +1 untuk tangan kanan, -1 untuk tangan kiri
 * (tangan kiri = gambar dicerminkan; teks prop tetap tegak lewat `fillTextUpright`).
 */
export function drawHandProp(ctx: Ctx, prop: HandProp, x: number, y: number, ink: string, dir = 1, opts: HandPropOptions = {}) {
  if (prop === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  if (opts.tilt) ctx.rotate(opts.tilt);
  ctx.scale(dir, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (prop) {
    case 'book': {
      ctx.translate(14, -18);
      ctx.rotate(0.2);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-28, -50, 64, 78, 8); }, '#d4463b', ink);
      ctx.fillStyle = '#f8e6c0';
      ctx.fillRect(28, -44, 7, 66);
      ctx.fillStyle = '#ebb44c';
      ctx.fillRect(-16, -34, 34, 14);
      ctx.fillRect(-16, -10, 26, 6);
      break;
    }
    case 'mic': {
      ctx.translate(4, -6);
      ctx.rotate(-0.32);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-8, -32, 16, 48, 5); }, '#2e3148', ink, 4);
      ctx.fillStyle = '#f2c144';
      ctx.fillRect(-8, -28, 16, 6);
      inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -48, 22, 0, TAU); }, '#c8d2e2', ink, 4.5);
      ctx.strokeStyle = '#6c7791';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, -48);
      ctx.lineTo(20, -48);
      ctx.stroke();
      break;
    }
    case 'esteh': {
      ctx.translate(12, -12);
      ctx.rotate(0.08);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(4, -52);
      ctx.lineTo(14, -92);
      ctx.stroke();
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 5;
      ctx.stroke();

      const cupPath = () => {
        ctx.beginPath();
        ctx.moveTo(-24, -56);
        ctx.lineTo(26, -56);
        ctx.lineTo(19, 14);
        ctx.lineTo(-17, 14);
        ctx.closePath();
      };
      inked(ctx, cupPath, '#d97828', ink);
      ctx.save();
      cupPath();
      ctx.clip();
      ctx.fillStyle = '#f2a444';
      ctx.fillRect(-26, -56, 54, 24);
      ctx.fillStyle = 'rgba(255,250,240,0.72)';
      ctx.fillRect(-14, -46, 14, 14);
      ctx.fillRect(4, -40, 13, 13);
      ctx.restore();
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-28, -62, 58, 10, 5); }, '#eef7ff', ink, 3.5, 1, 2);
      break;
    }
    case 'kopi': {
      ctx.translate(14, -12);
      // Uap 2D: default 2 helai (identik gambar lama); `steam` > 1 = 3 helai lebih panjang & pekat.
      const steam = Math.max(0, opts.steam ?? 1);
      if (steam > 0) {
        const len = 1 + 0.4 * Math.max(0, steam - 1);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.95, 0.78 * Math.min(1, steam) + 0.12 * Math.max(0, steam - 1))})`;
        ctx.lineWidth = 4 * (steam > 1 ? 1 + 0.15 * (steam - 1) : 1);
        for (const sx of steam > 1.4 ? [-14, -2, 9] : [-9, 6]) {
          ctx.beginPath();
          ctx.moveTo(sx, -56);
          ctx.quadraticCurveTo(sx - 8, -56 - 16 * len, sx + 4, -56 - 32 * len);
          ctx.stroke();
        }
      }
      const glassPath = () => {
        ctx.beginPath();
        ctx.moveTo(-24, -46);
        ctx.lineTo(24, -46);
        ctx.lineTo(18, 16);
        ctx.lineTo(-18, 16);
        ctx.closePath();
      };
      inked(ctx, glassPath, '#d9eef7', ink);
      ctx.save();
      glassPath();
      ctx.clip();
      ctx.fillStyle = '#2d1c16';
      ctx.fillRect(-26, -24, 52, 46);
      ctx.fillStyle = '#5c3c2e';
      ctx.fillRect(-26, -28, 52, 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2.5;
      for (const gx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(gx, -46);
        ctx.lineTo(gx * 0.85, 16);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'sodet': {
      ctx.translate(4, -6);
      ctx.rotate(0.35);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-6, -42, 12, 56, 4); }, '#8d4c2c', ink, 3.5, 1.5, 2);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-4, -96, 8, 56, 3); }, '#cbd5e4', ink, 3.5, 1.5, 2);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-24, -142, 48, 50, [10, 10, 6, 6]); }, '#dbe4f2', ink);
      ctx.strokeStyle = '#68758c';
      ctx.lineWidth = 3.5;
      for (const sx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(sx, -132);
        ctx.lineTo(sx, -104);
        ctx.stroke();
      }
      break;
    }
    case 'phone': {
      ctx.translate(10, -20);
      ctx.rotate(0.18);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-22, -48, 46, 76, 10); }, '#222638', ink, 4);
      ctx.fillStyle = '#89d4ff';
      ctx.beginPath();
      ctx.roundRect(-16, -40, 34, 58, 5);
      ctx.fill();
      ctx.fillStyle = '#fff5b8';
      ctx.fillRect(-10, -28, 22, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -10, 18, 6);
      break;
    }
    case 'phoneMap': {
      ctx.translate(12, -22);
      ctx.rotate(0.16);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-24, -52, 50, 82, 10); }, '#1e2230', ink);
      ctx.fillStyle = '#e7f5e8';
      ctx.beginPath();
      ctx.roundRect(-18, -44, 38, 64, 5);
      ctx.fill();
      ctx.strokeStyle = '#19ab58';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.lineTo(-10, -14);
      ctx.lineTo(10, -28);
      ctx.stroke();
      ctx.fillStyle = '#e84848';
      ctx.beginPath();
      ctx.arc(10, -30, 6.5, 0, TAU);
      ctx.fill();
      break;
    }
    case 'map': {
      ctx.translate(8, -12);
      ctx.rotate(0.42);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-14, -52, 28, 92, 10); }, '#f7e1b5', ink);
      ctx.fillStyle = '#c93f3b';
      ctx.fillRect(-14, -12, 28, 16);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-14, -12, 28, 16);
      break;
    }
    case 'lightbulb': {
      const bx = 10;
      const by = -58;
      ctx.fillStyle = 'rgba(255, 224, 110, 0.36)';
      ctx.beginPath();
      ctx.arc(bx, by, 44, 0, TAU);
      ctx.fill();
      inked(ctx, () => { ctx.beginPath(); ctx.arc(bx, by, 26, 0, TAU); }, '#ffe169', ink);
      ctx.fillStyle = '#fff9d6';
      ctx.beginPath();
      ctx.arc(bx - 7, by - 8, 8, 0, TAU);
      ctx.fill();
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(bx - 11, by + 22, 22, 14, 4); }, '#9da7c4', ink, 4, 1.5, 2);
      break;
    }
    case 'magnifier': {
      ctx.translate(8, -6);
      ctx.rotate(0.45);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-6, -34, 12, 42, 4); }, '#8d522f', ink, 4);
      inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -64, 34, 0, TAU); }, '#f5c43d', ink, 5);
      ctx.fillStyle = '#c8f0ff';
      ctx.beginPath();
      ctx.arc(0, -64, 24, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -64, 14, Math.PI * 1.1, Math.PI * 1.55);
      ctx.stroke();
      break;
    }
    case 'money': {
      ctx.translate(16, -14);
      ctx.rotate(-0.22);
      // Kipas 2 lembar uang merah-emas ala Rupiah
      for (const [rot, col] of [
        [-0.25, '#e66c6c'],
        [0.12, '#e25454'],
      ] as const) {
        ctx.save();
        ctx.rotate(rot);
        inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-34, -22, 74, 40, 6); }, col, ink, 4);
        ctx.fillStyle = '#ffd998';
        ctx.beginPath();
        ctx.arc(4, -2, 11, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff5df';
        ctx.fillRect(-24, -14, 12, 8);
        ctx.fillRect(18, 2, 14, 8);
        ctx.restore();
      }
      break;
    }
    case 'walletEmpty': {
      // Dompet kulit cokelat terbuka, isinya kosong melompong (gag "dompet kosong").
      ctx.translate(14, -16);
      ctx.rotate(-0.12);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-36, -26, 72, 46, 7); }, '#8a5634', ink, 4);
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(-28, -18, 56, 26);
      ctx.strokeStyle = '#c99267';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-32, -22, 64, 38);
      ctx.setLineDash([]);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(0, 20);
      ctx.stroke();
      break;
    }
    case 'pointer': {
      ctx.rotate(0.55);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-5, -138, 10, 146, 5); }, '#c78c4e', ink, 4, 1.5, 2);
      inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -140, 9, 0, TAU); }, '#e04848', ink, 3.5, 1, 1.5);
      break;
    }
    case 'sign': {
      ctx.translate(8, -8);
      ctx.rotate(0.1);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-5, -48, 10, 60, 4); }, '#8d522f', ink, 4);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-42, -112, 84, 68, 10); }, '#fff3c4', ink, 4.5);
      ctx.fillStyle = '#d93d3d';
      ctx.fillRect(-5, -100, 10, 28);
      ctx.beginPath();
      ctx.arc(0, -60, 6, 0, TAU);
      ctx.fill();
      break;
    }
    case 'laptop': {
      ctx.translate(18, -14);
      ctx.rotate(-0.08);
      // Layar laptop anak IT (VS Code dark mode)
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(-42, -74, 88, 60, [8, 8, 3, 3]);
        },
        '#25314d',
        ink,
        4.5,
      );
      ctx.fillStyle = '#121a2e';
      ctx.beginPath();
      ctx.roundRect(-35, -67, 74, 46, 4);
      ctx.fill();
      // Baris sintaks kode berwarna cerah agar langsung terbaca dari jauh
      const codeLines: [number, number, number, string][] = [
        [-28, -59, 32, '#38bdf8'],
        [-22, -49, 44, '#4ade80'],
        [-22, -39, 36, '#facc15'],
        [-28, -29, 26, '#fb7185'],
      ];
      for (const [lx, ly, lw, col] of codeLines) {
        ctx.fillStyle = col;
        ctx.fillRect(lx, ly, lw, 5.5);
      }
      // Alas keyboard laptop metalik
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(-48, -14);
          ctx.lineTo(52, -14);
          ctx.lineTo(62, 6);
          ctx.lineTo(-38, 6);
          ctx.closePath();
        },
        '#cfd9e8',
        ink,
        4.5,
        2,
        3,
      );
      ctx.fillStyle = '#687791';
      ctx.fillRect(-26, -8, 56, 7);
      break;
    }
    case 'coffeeCup': {
      // Cup es kopi susu begadang anak kuliah (beda dari kopi tubruk gelas belimbing)
      ctx.translate(12, -14);
      ctx.rotate(0.06);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(4, -56);
      ctx.lineTo(14, -92);
      ctx.stroke();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      const bodyPath = () => {
        ctx.beginPath();
        ctx.moveTo(-24, -54);
        ctx.lineTo(24, -54);
        ctx.lineTo(17, 14);
        ctx.lineTo(-17, 14);
        ctx.closePath();
      };
      inked(ctx, bodyPath, '#d6a472', ink, 4.5);
      ctx.save();
      bodyPath();
      ctx.clip();
      // Lapisan susu & gula aren
      ctx.fillStyle = '#f3e1c6';
      ctx.fillRect(-26, -54, 52, 22);
      ctx.fillStyle = '#8b5734';
      ctx.fillRect(-26, -2, 52, 20);
      // Sleeve kardus kopi
      ctx.fillStyle = '#9c6844';
      ctx.fillRect(-26, -30, 52, 26);
      ctx.fillStyle = '#fff5e4';
      ctx.beginPath();
      ctx.arc(0, -17, 8, 0, TAU);
      ctx.fill();
      ctx.restore();
      // Tutup cup putih
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-28, -62, 56, 11, 5); }, '#fff8ee', ink, 3.5, 1, 2);
      break;
    }
    case 'bakmie': {
      // Mangkok Ayam Jago berisi bakmie ayam kuning hangat, ayam kecap, sawi hijau & sumpit
      ctx.translate(18, -10);
      ctx.rotate(0.05);
      // Uap hangat bakmie
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.lineWidth = 4;
      for (const sx of [-14, 2, 18]) {
        ctx.beginPath();
        ctx.moveTo(sx, -56);
        ctx.quadraticCurveTo(sx - 8, -72, sx + 5, -88);
        ctx.stroke();
      }
      // Sumpit bambu miring di sisi kanan mangkok
      for (const [rot, dy] of [[-0.36, 0], [-0.24, 6]] as const) {
        ctx.save();
        ctx.translate(16, -40 + dy);
        ctx.rotate(rot);
        inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-4, -52, 8, 66, 3); }, '#d9a45b', ink, 3, 1, 1.5);
        ctx.restore();
      }
      // Gundukan mie kuning, topping ayam kecap & sawi hijau
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -34, 38, 17, 0, Math.PI, 0); ctx.closePath(); }, '#f2bf3c', ink, 4);
      inked(ctx, () => { ctx.beginPath(); ctx.arc(-10, -40, 12, 0, TAU); }, '#8d4824', ink, 3.5, 1, 1.5);
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(14, -39, 13, 8, -0.25, 0, TAU); }, '#349946', ink, 3.5, 1, 1.5);
      // Mangkok keramik putih bergaris merah khas mangkok ayam jago
      const bowlPath = () => {
        ctx.beginPath();
        ctx.moveTo(-42, -32);
        ctx.lineTo(42, -32);
        ctx.quadraticCurveTo(38, 12, 18, 16);
        ctx.lineTo(-18, 16);
        ctx.quadraticCurveTo(-38, 12, -42, -32);
        ctx.closePath();
      };
      inked(ctx, bowlPath, '#fff9ee', ink, 4.5);
      ctx.save();
      bowlPath();
      ctx.clip();
      ctx.fillStyle = '#c82b2b';
      ctx.fillRect(-44, -27, 88, 7);
      // Aksen mini siluet ayam jago merah
      ctx.fillStyle = '#d63333';
      ctx.beginPath();
      ctx.arc(0, -6, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2d8a4e';
      ctx.fillRect(-14, 2, 28, 5);
      ctx.restore();
      // Kaki dasar mangkok
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-20, 14, 40, 8, 3); }, '#eee5d5', ink, 3.5, 1, 1.5);
      break;
    }
    case 'esBuah': {
      // Cup Es Buah & Es Campur Segar Mbak Yuni (sirup cocopandan pink, es serut, potongan buah & sedotan)
      ctx.translate(12, -12);
      ctx.rotate(0.06);
      // Sedotan kuning-mangga
      ctx.strokeStyle = ink;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(5, -58);
      ctx.lineTo(16, -96);
      ctx.stroke();
      ctx.strokeStyle = '#f6b73c';
      ctx.lineWidth = 5;
      ctx.stroke();
      // Kubah es serut di atas cup
      inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -52, 24, Math.PI, 0); ctx.closePath(); }, '#eef9ff', ink, 4, 1.5, 2);
      // Badan gelas plastik transparan berisi sirup pink & potongan buah warna-warni
      const cupPath = () => {
        ctx.beginPath();
        ctx.moveTo(-25, -54);
        ctx.lineTo(25, -54);
        ctx.lineTo(18, 15);
        ctx.lineTo(-18, 15);
        ctx.closePath();
      };
      inked(ctx, cupPath, '#f26a82', ink, 4.5);
      ctx.save();
      cupPath();
      ctx.clip();
      ctx.fillStyle = '#ff9cb0';
      ctx.fillRect(-26, -54, 52, 22);
      // Potongan buah (mangga kuning, melon hijau, alpukat, cincau)
      ctx.fillStyle = '#f5b82e';
      ctx.fillRect(-14, -44, 12, 11);
      ctx.fillStyle = '#45b85b';
      ctx.fillRect(4, -40, 12, 11);
      ctx.fillStyle = '#a9d86b';
      ctx.fillRect(-10, -24, 12, 11);
      ctx.fillStyle = '#2c2430';
      ctx.fillRect(6, -18, 10, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(-18, -50, 7, 56);
      ctx.restore();
      // Bibir cup
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-28, -58, 56, 9, 4); }, '#ffffff', ink, 3.5, 1, 2);
      break;
    }
    case 'pen': {
      // Pena tinta biru: badan ramping, ujung logam, klip.
      ctx.rotate(0.6);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-5, -70, 10, 74, 4); }, '#2f5fd0', ink, 3.5, 1, 1.5);
      inked(ctx, () => { ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.lineTo(0, 18); ctx.closePath(); }, '#d9d4c7', ink, 3, 0.5, 1);
      ctx.fillStyle = '#e8edf7';
      ctx.fillRect(4, -64, 3, 26);
      break;
    }
    case 'lap': {
      // Lap kain kotak-kotak terlipat yang menjuntai dari kepalan.
      ctx.translate(0, 8);
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(-22, -10);
          ctx.quadraticCurveTo(0, -18, 22, -10);
          ctx.lineTo(26, 46);
          ctx.quadraticCurveTo(4, 54, -18, 48);
          ctx.closePath();
        },
        '#e9eef2',
        ink,
        4,
      );
      ctx.strokeStyle = '#d24b4b';
      ctx.lineWidth = 4;
      for (const yy of [6, 22, 38]) {
        ctx.beginPath();
        ctx.moveTo(-20, yy);
        ctx.lineTo(24, yy + 2);
        ctx.stroke();
      }
      for (const xx of [-8, 8]) {
        ctx.beginPath();
        ctx.moveTo(xx, -12);
        ctx.lineTo(xx + 2, 50);
        ctx.stroke();
      }
      break;
    }
    case 'phoneClock': {
      // HP dengan jam besar (alarm telat). Digit dibuat besar agar terbaca di insert close-up.
      ctx.translate(10, -24);
      ctx.rotate(0.12);
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-26, -54, 54, 88, 10); }, '#222638', ink, 4);
      ctx.fillStyle = '#10131f';
      ctx.beginPath();
      ctx.roundRect(-20, -46, 42, 72, 5);
      ctx.fill();
      ctx.fillStyle = '#ff4d5e';
      ctx.fillRect(-14, -40, 30, 5);
      ctx.font = '900 17px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      fillTextUpright(ctx, opts.text ?? PHONE_CLOCK_TEXT, 1, -12);
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(1, 12, 6, 0, TAU);
      ctx.fill();
      break;
    }
    case 'glassEmpty': {
      // Gelas kopi bening yang sudah habis (ampas di dasar).
      ctx.translate(14, -10);
      inked(ctx, () => { ctx.beginPath(); ctx.moveTo(-17, -34); ctx.lineTo(17, -34); ctx.lineTo(13, 18); ctx.lineTo(-13, 18); ctx.closePath(); }, '#e6f3f8', ink, 4);
      ctx.fillStyle = '#5a3a24';
      ctx.fillRect(-12, 9, 24, 8);
      break;
    }
    case 'senter': {
      // Senter patroli keamanan kampung (Pak Ujang)
      ctx.translate(10, -14);
      ctx.rotate(-0.35);
      // Cahaya hangat kecil di ujung depan
      ctx.fillStyle = 'rgba(255, 232, 130, 0.36)';
      ctx.beginPath();
      ctx.moveTo(-18, -62);
      ctx.lineTo(18, -62);
      ctx.lineTo(34, -108);
      ctx.lineTo(-34, -108);
      ctx.closePath();
      ctx.fill();
      // Gagang senter hitam tangguh
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-11, -44, 22, 66, 7); }, '#252a36', ink, 4.5);
      // Kepala senter melebar + aksen kuning keamanan
      const headPath = () => {
        ctx.beginPath();
        ctx.moveTo(-13, -42);
        ctx.lineTo(13, -42);
        ctx.lineTo(20, -64);
        ctx.lineTo(-20, -64);
        ctx.closePath();
      };
      inked(ctx, headPath, '#3b4254', ink, 4.5);
      ctx.fillStyle = '#f2c144';
      ctx.fillRect(-12, -38, 24, 8);
      // Lensa kaca senter menyala
      inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-18, -68, 36, 8, 4); }, '#fff2a6', ink, 3.5, 1, 1.5);
      break;
    }
  }
  ctx.restore();
}
