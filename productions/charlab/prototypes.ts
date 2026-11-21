/**
 * 3 Prototipe Gaya Karakter Orisinal untuk Channel YouTube Edutainment.
 * Kanvas desain: 700 x 1100, telapak kaki di y = 1040 (selalu menapak lantai 3D).
 *
 * A = Atelier Indie  (Storybook Explorer — kepala sculpted, kacamata, jambul, rompi ochre + syal teal)
 * B = Squircle Plush (Geometric Mascot   — kepala squircle kotak-bulat, mata pill besar, hoodie coral)
 * C = Ink-Pop Comic  (Sharp Storyteller  — rahang tegas, rambut spiky, mata sklera melirik, blazer cobalt)
 */

export type ProtoId = 'A' | 'B' | 'C';
export type ProtoMode = 'idle' | 'explain' | 'shock';

export const CHAR_W = 700;
export const CHAR_H = 1100;
export const CHAR_SOLE_Y = 1040;

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const CX = 350;

/** Isi + garis luar tebal-tipis (tipis kiri-atas, ~3x lebih tebal di kanan-bawah). */
function inked(
  ctx: Ctx,
  path: () => void,
  fill: string | CanvasGradient,
  ink: string,
  thin = 5.5,
  dx = 3.5,
  dy = 5.5,
) {
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

function brow(ctx: Ctx, x: number, y: number, len: number, thick: number, angleDeg: number, ink: string) {
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

function drawShockTicks(ctx: Ctx, cx: number, cy: number, r: number, ink: string) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  for (const deg of [-148, -128, -52, -32]) {
    const a = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r + 34), cy + Math.sin(a) * (r + 34));
    ctx.stroke();
  }
  ctx.restore();
}

function drawSweatDrop(ctx: Ctx, x: number, y: number, ink: string) {
  ctx.save();
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.bezierCurveTo(x + 16, y - 4, x + 22, y + 16, x, y + 22);
    ctx.bezierCurveTo(x - 22, y + 16, x - 16, y - 4, x, y - 28);
    ctx.closePath();
  };
  inked(ctx, path, '#9fe3ff', ink, 4.5, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 4, y + 4, 4, 7, -0.25, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// =================================================================================================
// PROTOTYPE A: ATELIER INDIE (Storybook Explorer)
// =================================================================================================
function drawAtelierIndie(ctx: Ctx, mode: ProtoMode) {
  const ink = '#26182b';
  const skin = '#fde1c6';
  const skinShadow = '#ebd0c4';
  const hair = '#39233c';
  const hairHi = '#5d3e62';
  const vest = '#eba93b';
  const vestShade = '#cf862a';
  const shirt = '#fdf6ea';
  const scarf = '#2b9c92';
  const scarfShade = '#1f7772';
  const pants = '#323a56';
  const shoe = '#7b3e2f';

  const facing = mode === 'shock' ? 0.1 : 0.34;
  const W = 250;
  const H = 236;
  const headTop = 185;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 192;
  const th = 228;
  const hipY = torsoTop + th - 14;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lean = mode === 'explain' ? 3.5 : mode === 'shock' ? -4.5 : 1.5;
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Kaki ramping celana + sepatu bundar ---
  for (const side of [-1, 1]) {
    const spread = mode === 'shock' ? 76 : 56;
    const fx = CX + side * spread;
    const hx = CX + side * 38;
    const midX = (hx + fx) / 2 + side * (mode === 'shock' ? -12 : -5);
    const midY = (hipY + CHAR_SOLE_Y) / 2;

    // Celana ramping
    ctx.strokeStyle = ink;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo(midX, midY, fx, CHAR_SOLE_Y - 22);
    ctx.stroke();

    ctx.strokeStyle = pants;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo(midX, midY, fx, CHAR_SOLE_Y - 22);
    ctx.stroke();

    // Sepatu
    const shoePath = () => {
      ctx.beginPath();
      ctx.ellipse(fx + side * 14, CHAR_SOLE_Y - 12, 32, 14, 0, 0, TAU);
    };
    inked(ctx, shoePath, shoe, ink, 4.5, 2, 3.5);
  }

  // --- Ekor syal di belakang ---
  const scarfTailPath = () => {
    const lift = mode === 'shock' ? -55 : mode === 'explain' ? -18 : 0;
    ctx.beginPath();
    ctx.moveTo(CX - 66, torsoTop + 26);
    ctx.quadraticCurveTo(CX - 128, torsoTop + 58 + lift, CX - 142, torsoTop + 132 + lift);
    ctx.lineTo(CX - 102, torsoTop + 142 + lift);
    ctx.quadraticCurveTo(CX - 94, torsoTop + 78 + lift * 0.6, CX - 42, torsoTop + 54);
    ctx.closePath();
  };
  inked(ctx, scarfTailPath, scarfShade, ink, 5, 3, 4);

  // --- Lengan belakang (kiri) ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 52;
  let lhx = CX - 132;
  let lhy = torsoTop + 178;
  let lbend = -26;
  if (mode === 'idle') {
    lhx = CX - 106;
    lhy = torsoTop + 172;
    lbend = -52; // tangan di pinggang
  } else if (mode === 'explain') {
    lhx = CX - 156;
    lhy = torsoTop + 126;
    lbend = -28;
  } else if (mode === 'shock') {
    lhx = CX - 178;
    lhy = torsoTop - 36;
    lbend = -30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(lhx, lhy, 17, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Torso: kemeja + rompi explorer ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - tw * 0.62, torsoTop + th * 0.35, CX - tw * 0.56, torsoTop + th * 0.94, CX - tw * 0.14, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.24, torsoTop + th * 1.03, CX + tw * 0.6, torsoTop + th * 0.92, CX + tw * 0.56, torsoTop + th * 0.45);
    ctx.bezierCurveTo(CX + tw * 0.52, torsoTop + th * 0.16, CX + tw * 0.46, torsoTop + 8, CX + tw * 0.42, torsoTop + 8);
    ctx.closePath();
  };
  const vg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.6, torsoTop + th);
  vg.addColorStop(0, vest);
  vg.addColorStop(0.62, vest);
  vg.addColorStop(1, vestShade);
  inked(ctx, torsoPath, vg, ink, 5.5, 3.5, 5);

  // Detail kemeja V & saku + kancing (di-clip ke torso)
  ctx.save();
  torsoPath();
  ctx.clip();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(CX - 34, torsoTop);
  ctx.lineTo(CX + 46, torsoTop);
  ctx.lineTo(CX + 12, torsoTop + 98);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Kancing rompi
  ctx.fillStyle = ink;
  for (const by of [torsoTop + 120, torsoTop + 158, torsoTop + 194]) {
    ctx.beginPath();
    ctx.arc(CX + 14, by, 5.5, 0, TAU);
    ctx.fill();
  }
  // Saku kecil
  ctx.strokeStyle = 'rgba(38,24,43,0.45)';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(CX + 38, torsoTop + 132, 36, 30);
  ctx.restore();

  // Syal melingkar di leher
  const scarfNeckPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 82, torsoTop - 2);
    ctx.quadraticCurveTo(CX, torsoTop + 26, CX + 82, torsoTop - 2);
    ctx.quadraticCurveTo(CX + 90, torsoTop + 24, CX + 72, torsoTop + 44);
    ctx.quadraticCurveTo(CX, torsoTop + 62, CX - 72, torsoTop + 44);
    ctx.quadraticCurveTo(CX - 90, torsoTop + 24, CX - 82, torsoTop - 2);
    ctx.closePath();
  };
  inked(ctx, scarfNeckPath, scarf, ink, 5, 3, 4);

  // --- Lengan depan (kanan) + prop pointer di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 56;
  let rhx = CX + 136;
  let rhy = torsoTop + 188;
  let rbend = 24;
  if (mode === 'explain') {
    rhx = CX + 178;
    rhy = torsoTop - 26;
    rbend = 32;
  } else if (mode === 'shock') {
    rhx = CX + 184;
    rhy = torsoTop - 44;
    rbend = 34;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();

  if (mode === 'explain') {
    // Prop kartu fakta / buku catatan kecil di tangan kanan
    ctx.save();
    ctx.translate(rhx + 12, rhy - 18);
    ctx.rotate(0.22);
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(-24, -46, 56, 70, 8);
      },
      '#fff4cc',
      ink,
      4.5,
      2.5,
      3.5,
    );
    ctx.strokeStyle = '#d4862a';
    ctx.lineWidth = 4;
    for (const ly of [-26, -12, 2]) {
      ctx.beginPath();
      ctx.moveTo(-12, ly);
      ctx.lineTo(20, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(rhx, rhy, 17, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Telinga mungil di sisi kiri ---
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.ellipse(CX - W * 0.49, cy + 12, 18, 24, -0.15, 0, TAU);
    },
    skin,
    ink,
    5,
    2,
    3.5,
  );

  // --- Kepala sculpted lembut (pipi penuh, rahang meruncing ke arah pandang) ---
  const headPath = () => {
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 2.15 : 2.25;
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) {
        x *= 1 - 0.1 * s; // taper halus ke dagu
        x += facing * W * 0.04 * s;
      }
      const px = CX + x;
      const py = cy + y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  const skG = ctx.createLinearGradient(CX - W * 0.35, headTop, CX + W * 0.45, chin);
  skG.addColorStop(0, skin);
  skG.addColorStop(0.58, skin);
  skG.addColorStop(1, skinShadow);
  inked(ctx, headPath, skG, ink, 5.5, 3.5, 5.5);

  // --- Wajah + Kacamata bundar khas Host ---
  const shift = facing * W * 0.085;
  const ex = (s: number) => CX + shift + s * W * 0.15;
  const eyeY = cy + 6;
  const glassLift = mode === 'shock' ? -10 : 0;

  // Mata
  for (const s of [-1, 1]) {
    const x = ex(s);
    if (mode === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, eyeY, 27, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + shift * 0.15, eyeY, 7, 0, TAU);
      ctx.fill();
    } else if (mode === 'explain') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11, 16, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x - 18, eyeY - 4);
      ctx.lineTo(x + 18, eyeY - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY - 3, 15, 13, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  // Kacamata bundar tipis emas
  ctx.save();
  ctx.strokeStyle = '#b9832c';
  ctx.lineWidth = 6;
  const gr = 34;
  for (const s of [-1, 1]) {
    const x = ex(s);
    ctx.fillStyle = 'rgba(215, 240, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(x, eyeY + glassLift, gr, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Kilau lensa diagonal sangat halus
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 18, eyeY + glassLift - 12);
    ctx.lineTo(x - 6, eyeY + glassLift - 22);
    ctx.stroke();
    ctx.strokeStyle = '#b9832c';
    ctx.lineWidth = 6;
  }
  // Jembatan & tangkai kacamata
  ctx.beginPath();
  ctx.moveTo(ex(-1) + gr - 2, eyeY + glassLift);
  ctx.quadraticCurveTo(CX + shift, eyeY + glassLift - 6, ex(1) - gr + 2, eyeY + glassLift);
  ctx.moveTo(ex(-1) - gr, eyeY + glassLift - 2);
  ctx.lineTo(CX - W * 0.46, eyeY + glassLift - 4);
  ctx.stroke();
  ctx.restore();

  // Alis
  const by = eyeY - 48;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 42, 11, -12, ink);
    brow(ctx, ex(1), by - 14, 42, 11, 12, ink);
  } else if (mode === 'explain') {
    brow(ctx, ex(-1), by - 6, 40, 11, -10, ink);
    brow(ctx, ex(1), by + 2, 40, 11, 6, ink);
  } else {
    brow(ctx, ex(-1), by, 40, 11, -4, ink);
    brow(ctx, ex(1), by, 40, 11, 4, ink);
  }

  // Hidung mungil editorial (goresan kecil halus)
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX + shift + 4, eyeY + 22);
  ctx.quadraticCurveTo(CX + shift + 12, eyeY + 29, CX + shift + 4, eyeY + 34);
  ctx.stroke();

  // Mulut
  const mx = CX + shift;
  const my = cy + 68;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  if (mode === 'explain') {
    // Mulut bicara ekspresif dengan gigi atas + rongga plum
    ctx.beginPath();
    ctx.moveTo(mx - 24, my - 4);
    ctx.quadraticCurveTo(mx, my - 8, mx + 24, my - 4);
    ctx.quadraticCurveTo(mx + 22, my + 24, mx, my + 24);
    ctx.quadraticCurveTo(mx - 22, my + 24, mx - 24, my - 4);
    ctx.closePath();
    ctx.fillStyle = '#5c222d';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 24, my - 8, 48, 12);
    ctx.restore();
    ctx.stroke();
  } else if (mode === 'shock') {
    ctx.fillStyle = '#5c222d';
    ctx.beginPath();
    ctx.ellipse(mx, my + 6, 15, 22, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - 18, my + 2);
    ctx.quadraticCurveTo(mx + 4, my + 12, mx + 22, my - 4);
    ctx.stroke();
  }

  // --- Rambut Jambul Swept Quiff Ikonik ---
  const hairPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.49, cy - 10);
    ctx.bezierCurveTo(CX - W * 0.56, headTop - 16, CX - W * 0.25, headTop - 68, CX + W * 0.12, headTop - 52);
    ctx.bezierCurveTo(CX + W * 0.42, headTop - 62, CX + W * 0.62, headTop - 10, CX + W * 0.48, cy - 28);
    // Garis poni menyapu ke kanan
    ctx.bezierCurveTo(CX + W * 0.25, headTop + 26, CX - W * 0.06, headTop + 34, CX - W * 0.34, headTop + 56);
    ctx.quadraticCurveTo(CX - W * 0.44, cy - 2, CX - W * 0.49, cy - 10);
    ctx.closePath();
  };
  inked(ctx, hairPath, hair, ink, 5.5, 3, 4.5);

  // Highlight lengkung rambut
  ctx.save();
  hairPath();
  ctx.clip();
  ctx.strokeStyle = hairHi;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(CX - 62, headTop - 16);
  ctx.quadraticCurveTo(CX + 8, headTop - 36, CX + 72, headTop - 10);
  ctx.stroke();
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 18, 128, ink);
  ctx.restore();
}

// =================================================================================================
// PROTOTYPE B: SQUIRCLE PLUSH (Geometric Mascot)
// =================================================================================================
function drawSquirclePlush(ctx: Ctx, mode: ProtoMode) {
  const ink = '#1b1f3b';
  const skin = '#ffe6cc';
  const skinShadow = '#ebd2d4';
  const hair = '#4d2f2b';
  const hairHi = '#764d44';
  const hoodie = '#ee664d';
  const hoodieShade = '#cc483b';
  const stringCol = '#fff6e5';
  const pants = '#2c3560';
  const sneaker = '#fff6e8';

  const facing = mode === 'shock' ? 0.08 : 0.3;
  const W = 290;
  const H = 250;
  const headTop = 215;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 14;
  const tw = 228;
  const th = 220;
  const hipY = torsoTop + th - 10;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lean = mode === 'explain' ? 3 : mode === 'shock' ? -4 : 1;
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Kaki + Sneakers chunky ---
  for (const side of [-1, 1]) {
    const fx = CX + side * (mode === 'shock' ? 84 : 62);
    const hx = CX + side * 46;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - side * 6, (hipY + CHAR_SOLE_Y) / 2, fx, CHAR_SOLE_Y - 26);
    ctx.stroke();
    ctx.strokeStyle = pants;
    ctx.lineWidth = 15;
    ctx.stroke();

    // Sneaker krem + strip coral
    const shoePath = () => {
      ctx.beginPath();
      ctx.roundRect(fx - 26 + side * 12, CHAR_SOLE_Y - 34, 62, 34, [16, 16, 10, 10]);
    };
    inked(ctx, shoePath, sneaker, ink, 5, 2.5, 3.5);
    ctx.fillStyle = hoodie;
    ctx.fillRect(fx - 18 + side * 12, CHAR_SOLE_Y - 11, 48, 6);
  }

  // --- Lengan belakang (kiri) berlengan hoodie ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 56;
  let lhx = CX - 144;
  let lhy = torsoTop + 168;
  if (mode === 'explain') {
    lhx = CX - 166;
    lhy = torsoTop + 124;
  } else if (mode === 'shock') {
    lhx = CX - 196;
    lhy = torsoTop - 16;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 - 20, (lsy + lhy) / 2 + 12, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = hoodie;
  ctx.lineWidth = 22;
  ctx.stroke();
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(lhx, lhy, 19, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Torso Hoodie Oversized (trapezoid-bulat menggemaskan) ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.4, torsoTop + 12);
    ctx.bezierCurveTo(CX - tw * 0.56, torsoTop + th * 0.3, CX - tw * 0.62, torsoTop + th * 0.85, CX - tw * 0.36, torsoTop + th);
    ctx.quadraticCurveTo(CX, torsoTop + th + 16, CX + tw * 0.36, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.62, torsoTop + th * 0.85, CX + tw * 0.56, torsoTop + th * 0.3, CX + tw * 0.4, torsoTop + 12);
    ctx.closePath();
  };
  const hg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  hg.addColorStop(0, hoodie);
  hg.addColorStop(0.58, hoodie);
  hg.addColorStop(1, hoodieShade);
  inked(ctx, torsoPath, hg, ink, 5.5, 3.5, 5.5);

  // Detail Hoodie: saku depan + kerah + tali krem
  ctx.save();
  torsoPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(27,31,59,0.12)';
  ctx.beginPath();
  ctx.roundRect(CX - 64, torsoTop + 118, 128, 66, 18);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Rib bawah hoodie
  ctx.fillStyle = 'rgba(27,31,59,0.14)';
  ctx.fillRect(CX - tw, torsoTop + th - 16, tw * 2, 32);
  ctx.restore();

  // Tali hoodie
  const bounce = mode === 'shock' ? -18 : 0;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 12;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 22, torsoTop + 18);
    ctx.quadraticCurveTo(CX + s * 28, torsoTop + 62 + bounce, CX + s * 20 + (mode === 'shock' ? s * 22 : 0), torsoTop + 98 + bounce);
    ctx.stroke();
    ctx.strokeStyle = stringCol;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 12;
  }

  // --- Lengan depan (kanan) + prop bohlam ide di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 58;
  let rhx = CX + 148;
  let rhy = torsoTop + 168;
  if (mode === 'explain') {
    rhx = CX + 186;
    rhy = torsoTop - 16;
  } else if (mode === 'shock') {
    rhx = CX + 198;
    rhy = torsoTop - 22;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + 20, (rsy + rhy) / 2 + 10, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = hoodie;
  ctx.lineWidth = 22;
  ctx.stroke();

  if (mode === 'explain') {
    // Bohlam ide menyala di atas tangan
    const bx = rhx + 12;
    const by = rhy - 62;
    ctx.fillStyle = 'rgba(255, 224, 110, 0.35)';
    ctx.beginPath();
    ctx.arc(bx, by, 44, 0, TAU);
    ctx.fill();
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(bx, by, 26, 0, TAU);
      },
      '#ffe169',
      ink,
      4.5,
      2,
      3,
    );
    ctx.fillStyle = '#fff9d6';
    ctx.beginPath();
    ctx.arc(bx - 7, by - 8, 8, 0, TAU);
    ctx.fill();
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(bx - 11, by + 22, 22, 14, 4);
      },
      '#9da7c4',
      ink,
      4,
      1.5,
      2,
    );
  }

  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(rhx, rhy, 19, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Kuping bulat mungil kiri & kanan ---
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(CX - W * 0.49, cy + 18, 20, 0, TAU);
    },
    skin,
    ink,
    5,
    2,
    3,
  );

  // --- Kepala SQUIRCLE (kotak-bulat lembut superellipse n=3.2) ---
  const headPath = () => {
    ctx.beginPath();
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 3.1 : 3.35; // kotak-bulat lembut, pipi empuk di bawah
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) x *= 1 + 0.04 * s;
      const px = CX + x;
      const py = cy + y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  const skG = ctx.createLinearGradient(CX - W * 0.35, headTop, CX + W * 0.45, chin);
  skG.addColorStop(0, skin);
  skG.addColorStop(0.56, skin);
  skG.addColorStop(1, skinShadow);
  inked(ctx, headPath, skG, ink, 5.5, 4, 6);

  // --- Wajah Squircle: mata pill besar, alis melayang, mulut lucu ---
  const shift = facing * W * 0.075;
  const ex = (s: number) => CX + shift + s * W * 0.16;
  const eyeY = cy + 16;

  for (const s of [-1, 1]) {
    const x = ex(s);
    if (mode === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(x, eyeY, 32, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, eyeY, 7.5, 0, TAU);
      ctx.fill();
    } else if (mode === 'explain') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(x - 13, eyeY - 22, 26, 44, 13);
      ctx.fill();
    } else {
      // Pill eye sedikit mengantuk/santai
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(x - 13, eyeY - 18, 26, 36, 13);
      ctx.fill();
    }
  }

  // Alis melayang bulat
  const by = eyeY - 46;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 38, 12, -14, ink);
    brow(ctx, ex(1), by - 14, 38, 12, 14, ink);
  } else if (mode === 'explain') {
    brow(ctx, ex(-1), by - 4, 36, 12, -8, ink);
    brow(ctx, ex(1), by - 4, 36, 12, 8, ink);
  } else {
    brow(ctx, ex(-1), by, 36, 12, -2, ink);
    brow(ctx, ex(1), by, 36, 12, 2, ink);
  }

  // Mulut
  const mx = CX + shift;
  const my = cy + 68;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  if (mode === 'explain') {
    ctx.beginPath();
    ctx.arc(mx, my - 4, 24, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#5c2230';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#f28482';
    ctx.beginPath();
    ctx.ellipse(mx, my + 16, 15, 10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else if (mode === 'shock') {
    ctx.fillStyle = '#5c2230';
    ctx.beginPath();
    ctx.roundRect(mx - 22, my - 8, 44, 30, 14);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(mx, my - 8, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // --- Rambut Chunky Plush + Jambul Kecil Ikonik ---
  const hairPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.51, cy - 18);
    ctx.bezierCurveTo(CX - W * 0.55, headTop - 30, CX - W * 0.2, headTop - 52, CX + 6, headTop - 44);
    // Jambul ikonik mencuat lucu di atas
    ctx.quadraticCurveTo(CX + 22, headTop - 92, CX + 64, headTop - 64);
    ctx.quadraticCurveTo(CX + 46, headTop - 44, CX + 52, headTop - 36);
    ctx.bezierCurveTo(CX + W * 0.48, headTop - 42, CX + W * 0.57, headTop - 8, CX + W * 0.5, cy - 26);
    // Poni chunky 3 lekuk lembut
    ctx.quadraticCurveTo(CX + W * 0.28, headTop + 42, CX + W * 0.12, headTop + 18);
    ctx.quadraticCurveTo(CX - W * 0.08, headTop + 50, CX - W * 0.28, headTop + 26);
    ctx.quadraticCurveTo(CX - W * 0.42, headTop + 46, CX - W * 0.51, cy - 18);
    ctx.closePath();
  };
  inked(ctx, hairPath, hair, ink, 5.5, 3.5, 5);

  ctx.save();
  hairPath();
  ctx.clip();
  ctx.strokeStyle = hairHi;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(CX - 80, headTop - 6);
  ctx.quadraticCurveTo(CX - 10, headTop - 26, CX + 70, headTop - 4);
  ctx.stroke();
  ctx.restore();

  if (mode === 'shock') drawSweatDrop(ctx, CX + W * 0.34, cy - 36, ink);
  ctx.restore();
}

// =================================================================================================
// PROTOTYPE C: INK-POP COMIC (Expressive Sharp Storyteller)
// =================================================================================================
function drawInkPopComic(ctx: Ctx, mode: ProtoMode) {
  const ink = '#1b1224';
  const skin = '#ffe8d4';
  const skinShadow = '#e6cdd6';
  const hair = '#242a48';
  const hairAccent = '#4c6ef5';
  const blazer = '#3b5bdb';
  const blazerShade = '#273d9e';
  const tee = '#fffdf8';
  const badge = '#f5c43d';
  const legCol = '#251c33';

  const facing = mode === 'shock' ? 0.12 : 0.38;
  const W = 242;
  const H = 244;
  const headTop = 162;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 2;
  const tw = 204;
  const th = 238;
  const hipY = torsoTop + th - 14;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lean = mode === 'explain' ? 4 : mode === 'shock' ? -5.5 : 2;
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Kaki jenjang ekspresif ---
  for (const side of [-1, 1]) {
    const spread = mode === 'shock' ? 84 : 60;
    const fx = CX + side * spread;
    const hx = CX + side * 36;
    ctx.strokeStyle = legCol;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - side * 10, (hipY + CHAR_SOLE_Y) / 2, fx, CHAR_SOLE_Y - 14);
    ctx.stroke();

    // Sepatu lancip-bulat elegan
    const shoePath = () => {
      ctx.beginPath();
      ctx.moveTo(fx - side * 14, CHAR_SOLE_Y - 22);
      ctx.quadraticCurveTo(fx + side * 24, CHAR_SOLE_Y - 24, fx + side * 44, CHAR_SOLE_Y - 4);
      ctx.lineTo(fx - side * 16, CHAR_SOLE_Y - 2);
      ctx.closePath();
    };
    inked(ctx, shoePath, legCol, ink, 4.5, 2, 3);
  }

  // --- Lengan belakang (kiri) ---
  const lsx = CX - tw * 0.46;
  const lsy = torsoTop + 44;
  let lhx = CX - 118;
  let lhy = torsoTop + 174;
  let lbend = -46;
  if (mode === 'explain') {
    lhx = CX - 154;
    lhy = torsoTop + 114;
    lbend = -36;
  } else if (mode === 'shock') {
    lhx = CX - 190;
    lhy = torsoTop - 52;
    lbend = -26;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(lhx, lhy, 16, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Torso Blazer Cobalt tajam-kartunis ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.48, torsoTop + 14);
    ctx.quadraticCurveTo(CX, torsoTop - 4, CX + tw * 0.48, torsoTop + 14);
    ctx.bezierCurveTo(CX + tw * 0.56, torsoTop + th * 0.45, CX + tw * 0.44, torsoTop + th * 0.92, CX + tw * 0.3, torsoTop + th);
    ctx.lineTo(CX - tw * 0.3, torsoTop + th);
    ctx.bezierCurveTo(CX - tw * 0.44, torsoTop + th * 0.92, CX - tw * 0.56, torsoTop + th * 0.45, CX - tw * 0.48, torsoTop + 14);
    ctx.closePath();
  };
  const bg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  bg.addColorStop(0, blazer);
  bg.addColorStop(0.6, blazer);
  bg.addColorStop(1, blazerShade);
  inked(ctx, torsoPath, bg, ink, 5.5, 4, 5.5);

  // Kaos V putih + kerah lapel + pin bintang emas
  ctx.save();
  torsoPath();
  ctx.clip();
  ctx.fillStyle = tee;
  ctx.beginPath();
  ctx.moveTo(CX - 38, torsoTop);
  ctx.lineTo(CX + 50, torsoTop);
  ctx.lineTo(CX + 14, torsoTop + 142);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Kerah lapel kanan-kiri
  ctx.fillStyle = '#5374f2';
  for (const [x1, x2, x3] of [
    [CX - 38, CX - 62, CX + 14],
    [CX + 50, CX + 72, CX + 14],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, torsoTop + 2);
    ctx.lineTo(x2, torsoTop + 78);
    ctx.lineTo(x3, torsoTop + 132);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Pin lencana emas di dada
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(CX - 46, torsoTop + 98, 12, 0, TAU);
    },
    badge,
    ink,
    3.5,
    1.5,
    2,
  );

  // --- Lengan depan (kanan) + prop kaca pembesar di mode explain ---
  const rsx = CX + tw * 0.46;
  const rsy = torsoTop + 44;
  let rhx = CX + 146;
  let rhy = torsoTop + 186;
  let rbend = 26;
  if (mode === 'explain') {
    rhx = CX + 184;
    rhy = torsoTop - 30;
    rbend = 36;
  } else if (mode === 'shock') {
    rhx = CX + 194;
    rhy = torsoTop - 54;
    rbend = 30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();

  if (mode === 'explain') {
    // Prop kaca pembesar komik
    ctx.save();
    ctx.translate(rhx + 8, rhy - 6);
    ctx.rotate(0.45);
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(-6, -34, 12, 42, 4);
      },
      '#8d522f',
      ink,
      4,
      2,
      2,
    );
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(0, -64, 34, 0, TAU);
      },
      badge,
      ink,
      5,
      2.5,
      3,
    );
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
    ctx.restore();
  }

  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(rhx, rhy, 16, 0, TAU);
    },
    skin,
    ink,
    4.5,
    2,
    3,
  );

  // --- Telinga geometris kiri ---
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(CX - W * 0.44, cy - 8);
      ctx.quadraticCurveTo(CX - W * 0.62, cy + 4, CX - W * 0.5, cy + 32);
      ctx.lineTo(CX - W * 0.4, cy + 28);
      ctx.closePath();
    },
    skin,
    ink,
    5,
    2,
    3.5,
  );

  // --- Kepala Faceted Comic (rahang meruncing tegas, siluet dinamis) ---
  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.46, cy - 30);
    ctx.bezierCurveTo(CX - W * 0.48, headTop - 10, CX + W * 0.48, headTop - 10, CX + W * 0.48, cy - 26);
    ctx.bezierCurveTo(CX + W * 0.5, cy + 36, CX + W * 0.34, chin - 16, CX + facing * 24, chin);
    ctx.bezierCurveTo(CX - W * 0.28, chin - 12, CX - W * 0.46, cy + 42, CX - W * 0.46, cy - 30);
    ctx.closePath();
  };
  const skG = ctx.createLinearGradient(CX - W * 0.4, headTop, CX + W * 0.45, chin);
  skG.addColorStop(0, skin);
  skG.addColorStop(0.55, skin);
  skG.addColorStop(0.62, skinShadow); // cel-shadow lebih tegas khas komik!
  skG.addColorStop(1, skinShadow);
  inked(ctx, headPath, skG, ink, 5.5, 4, 6);

  // --- Wajah Ink-Pop: mata bersklera putih melirik + alis tajam ---
  const shift = facing * W * 0.095;
  const ex = (s: number) => CX + shift + s * W * 0.145;
  const eyeY = cy + 6;
  const pupilShift = mode === 'explain' ? 8 : mode === 'shock' ? 0 : 6;

  for (const s of [-1, 1]) {
    const x = ex(s);
    const rx = mode === 'shock' ? 27 : 22;
    const ry = mode === 'shock' ? 30 : 21;
    // Sklera putih
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, eyeY, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Pupil melirik
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(x + pupilShift, eyeY + (mode === 'shock' ? 0 : 1), mode === 'shock' ? 6.5 : 8.5, 0, TAU);
    ctx.fill();

    // Kelopak atas deadpan-witty saat idle / explain
    if (mode !== 'shock') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, eyeY, rx + 2, ry + 2, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = skin;
      const lidH = mode === 'idle' ? 14 : 9;
      ctx.fillRect(x - rx - 4, eyeY - ry - 4, (rx + 4) * 2, lidH + 4);
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x - rx - 2, eyeY - ry + (mode === 'idle' ? 14 : 9));
      ctx.lineTo(x + rx + 2, eyeY - ry + (mode === 'idle' ? 14 : 9));
      ctx.stroke();
    }
  }

  // Alis komik tajam asimetris
  const by = eyeY - 38;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 16, 42, 11, -18, ink);
    brow(ctx, ex(1), by - 16, 42, 11, 18, ink);
  } else if (mode === 'explain') {
    brow(ctx, ex(-1), by - 10, 44, 12, -14, ink);
    brow(ctx, ex(1), by + 4, 42, 12, 10, ink);
  } else {
    brow(ctx, ex(-1), by - 6, 44, 12, -10, ink);
    brow(ctx, ex(1), by + 2, 42, 12, 6, ink);
  }

  // Hidung runcing komik minimalis
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(CX + shift + 6, eyeY + 18);
  ctx.lineTo(CX + shift + 16, eyeY + 32);
  ctx.lineTo(CX + shift + 4, eyeY + 36);
  ctx.stroke();

  // Mulut
  const mx = CX + shift;
  const my = cy + 68;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  if (mode === 'explain') {
    ctx.beginPath();
    ctx.moveTo(mx - 26, my - 2);
    ctx.lineTo(mx + 28, my - 6);
    ctx.quadraticCurveTo(mx + 22, my + 24, mx - 2, my + 24);
    ctx.quadraticCurveTo(mx - 24, my + 24, mx - 26, my - 2);
    ctx.closePath();
    ctx.fillStyle = '#5c1f2e';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 28, my - 8, 58, 12);
    ctx.restore();
    ctx.stroke();
  } else if (mode === 'shock') {
    ctx.fillStyle = '#5c1f2e';
    ctx.beginPath();
    ctx.moveTo(mx - 20, my - 4);
    ctx.quadraticCurveTo(mx, my - 16, mx + 22, my - 4);
    ctx.quadraticCurveTo(mx + 26, my + 30, mx, my + 32);
    ctx.quadraticCurveTo(mx - 24, my + 30, mx - 20, my - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Smirk cerdas
    ctx.beginPath();
    ctx.moveTo(mx - 18, my + 4);
    ctx.quadraticCurveTo(mx + 8, my + 12, mx + 26, my - 8);
    ctx.stroke();
  }

  // --- Rambut Spiky-Messy Tajam + Aksen Cobalt ---
  const spikeLift = mode === 'shock' ? -16 : 0;
  const hairPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.48, cy - 16);
    ctx.lineTo(CX - W * 0.62, headTop + 22 + spikeLift * 0.4);
    ctx.lineTo(CX - W * 0.36, headTop + 4 + spikeLift * 0.5);
    ctx.lineTo(CX - W * 0.42, headTop - 44 + spikeLift);
    ctx.lineTo(CX - W * 0.1, headTop - 22 + spikeLift * 0.6);
    ctx.lineTo(CX + W * 0.1, headTop - 68 + spikeLift);
    ctx.lineTo(CX + W * 0.28, headTop - 26 + spikeLift * 0.6);
    ctx.lineTo(CX + W * 0.58, headTop - 36 + spikeLift);
    ctx.lineTo(CX + W * 0.44, headTop + 10);
    ctx.lineTo(CX + W * 0.6, cy - 26);
    ctx.lineTo(CX + W * 0.46, cy - 18);
    // Poni lancip menyapu dahi
    ctx.quadraticCurveTo(CX + W * 0.24, headTop + 26, CX + W * 0.08, headTop + 56);
    ctx.quadraticCurveTo(CX - W * 0.04, headTop + 26, CX - W * 0.16, headTop + 52);
    ctx.quadraticCurveTo(CX - W * 0.34, headTop + 22, CX - W * 0.48, cy - 16);
    ctx.closePath();
  };
  inked(ctx, hairPath, hair, ink, 5.5, 3.5, 5);

  ctx.save();
  hairPath();
  ctx.clip();
  ctx.strokeStyle = hairAccent;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(CX - 66, headTop + 2 + spikeLift * 0.5);
  ctx.quadraticCurveTo(CX + 6, headTop - 24 + spikeLift * 0.7, CX + 72, headTop + 6 + spikeLift * 0.5);
  ctx.stroke();
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 24, 138, ink);
  ctx.restore();
}

export function drawPrototype(id: ProtoId, ctx: Ctx, mode: ProtoMode) {
  ctx.clearRect(0, 0, CHAR_W, CHAR_H);
  if (id === 'A') drawAtelierIndie(ctx, mode);
  else if (id === 'B') drawSquirclePlush(ctx, mode);
  else drawInkPopComic(ctx, mode);
}
