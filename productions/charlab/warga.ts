/**
 * Paket NPC Sehari-hari Indonesia (ID-5 s/d ID-8) — karya prosedural orisinal MotionForge Atelier.
 * Kanvas desain: 700 x 1100, telapak kaki di y = 1040 (menapak lantai 3D).
 * Mendukung animasi penuh per frame: walkPhase (jalan bouncy), talk (lip-sync), blink (4-frame), mode akting.
 *
 * ID5 = Pak Budi  (Pak RT / Bapak-bapak Komplek — kemeja kotak, sarung tenun, kumis tebal, kopi tubruk)
 * ID6 = Bu Siti   (Ibu Warung / Emak-emak       — sanggul/cepol, daster bunga ceria, celemek, spatula)
 * ID7 = Raka      (Pelajar SMA Indonesia        — seragam putih-abu, dasi, badge OSIS, ransel, HP)
 * ID8 = Bang Udin (Abang Ojol / Kurir           — jaket hijau-hitam reflektor, helm visor, HP navigasi)
 */

export type WargaId = 'ID5' | 'ID6' | 'ID7' | 'ID8';
export type WargaMode = 'idle' | 'explain' | 'shock' | 'walk';

export type WargaPose = {
  mode: WargaMode;
  walkPhase?: number;
  talk?: number;
  blink?: number;
  facing?: number;
};

export const WARGA_W = 700;
export const WARGA_H = 1100;
export const WARGA_SOLE_Y = 1040;

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const CX = 350;

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
  for (const deg of [-148, -126, -54, -32]) {
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
    ctx.moveTo(x, y - 26);
    ctx.bezierCurveTo(x + 15, y - 4, x + 20, y + 15, x, y + 20);
    ctx.bezierCurveTo(x - 20, y + 15, x - 15, y - 4, x, y - 26);
    ctx.closePath();
  };
  inked(ctx, path, '#9fe3ff', ink, 4.5, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 4, y + 4, 3.5, 6.5, -0.25, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDynamicMouth(ctx: Ctx, mx: number, my: number, mode: WargaMode, talk: number, ink: string, teeth = true) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  if (mode === 'shock') {
    ctx.fillStyle = '#5c222d';
    ctx.beginPath();
    ctx.ellipse(mx, my + 5, 16, 22, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    return;
  }
  const open = mode === 'explain' ? Math.max(0.45, talk) : talk;
  if (open > 0.22) {
    const w = 18 + open * 11;
    const h = 10 + open * 19;
    ctx.beginPath();
    ctx.moveTo(mx - w, my - 3);
    ctx.quadraticCurveTo(mx, my - 7, mx + w, my - 3);
    ctx.quadraticCurveTo(mx + w * 0.9, my + h, mx, my + h);
    ctx.quadraticCurveTo(mx - w * 0.9, my + h, mx - w, my - 3);
    ctx.closePath();
    ctx.fillStyle = '#5c222d';
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (teeth) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - w, my - 8, w * 2, 11);
    }
    ctx.fillStyle = '#e57373';
    ctx.beginPath();
    ctx.ellipse(mx, my + h - 2, w * 0.55, h * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - 17, my + 1);
    ctx.quadraticCurveTo(mx + 3, my + 11, mx + 19, my - 3);
    ctx.stroke();
  }
}

function walkKinematics(pose: WargaPose) {
  const isWalk = pose.mode === 'walk';
  const ph = (pose.walkPhase ?? 0) * TAU;
  const swing = isWalk ? Math.sin(ph) : 0;
  const bob = isWalk ? -Math.abs(Math.sin(ph)) * 36 : 0;
  const lean = isWalk
    ? 3.2 + 3.0 * Math.cos(ph * 2)
    : pose.mode === 'explain'
      ? 2.8
      : pose.mode === 'shock'
        ? -4.5
        : 1.0;
  return { swing, bob, lean };
}

function drawEyes(
  ctx: Ctx,
  ex: (s: number) => number,
  eyeY: number,
  mode: WargaMode,
  blink: number,
  ink: string,
  opts: { liddedIdle?: boolean; lash?: boolean; shift?: number } = {},
) {
  const shift = opts.shift ?? 0;
  for (const s of [-1, 1]) {
    const x = ex(s);
    if (blink >= 0.85) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (opts.lash) ctx.arc(x, eyeY + 4, 15, Math.PI * 1.12, Math.PI * 1.88);
      else {
        ctx.moveTo(x - 18, eyeY);
        ctx.lineTo(x + 18, eyeY);
      }
      ctx.stroke();
    } else if (blink >= 0.25) {
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
    } else if (mode === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, eyeY, 26, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + shift * 0.14, eyeY, 7, 0, TAU);
      ctx.fill();
    } else if (opts.liddedIdle && mode === 'idle') {
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
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11.5, 16, 0, 0, TAU);
      ctx.fill();
      if (opts.lash) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + s * 9, eyeY - 10);
        ctx.lineTo(x + s * 16, eyeY - 14);
        ctx.stroke();
      }
    }
  }
}

// =================================================================================================
// ID-5: PAK BUDI (Pak RT / Bapak-bapak Komplek — Kemeja Kotak, Sarung Tenun, Kumis Tebal, Kopi Tubruk)
// =================================================================================================
function drawPakBudi(ctx: Ctx, pose: WargaPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.68 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.32);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#241828';
  const skin = '#e6b790';
  const skinShadow = '#d0a096';
  const hair = '#2c2530';
  const shirt = '#e8eef5';
  const shirtGrid = '#567eb8';
  const sarung = '#9c3638';
  const sarungDark = '#6e2328';
  const sarungStripe = '#e8b95b';
  const sandal = '#6c422c';

  const W = 258;
  const H = 240;
  const headTop = 192 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 224;
  const th = 232;
  const hipY = torsoTop + th - 10;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki bawah (keluar dari bawah sarung) + sandal kulit ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 56;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 26 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 68 : 50) + stepX;
    const fy = WARGA_SOLE_Y - liftY;
    const hx = CX + sgn * 44;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(hx, hipY + 95);
    ctx.lineTo(fx, fy - 18);
    ctx.stroke();
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 12;
    ctx.stroke();

    // Sandal kulit cokelat
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.ellipse(fx + sgn * 14, fy - 11, 32, 13, 0, 0, TAU);
      },
      sandal,
      ink,
      4.5,
      2,
      3.5,
    );
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 54;
  let lhx = CX - 134;
  let lhy = torsoTop + 178;
  let lbend = -36;
  if (mode === 'walk') {
    lhx = CX - 132 - swing * 48;
    lhy = torsoTop + 170 - Math.abs(swing) * 16;
    lbend = -18;
  } else if (mode === 'idle') {
    lhx = CX - 118;
    lhy = torsoTop + 176;
    lbend = -52; // bertolak pinggang wibawa!
  } else if (mode === 'explain') {
    lhx = CX - 156;
    lhy = torsoTop + 132;
    lbend = -26;
  } else if (mode === 'shock') {
    lhx = CX - 190;
    lhy = torsoTop - 34;
    lbend = -30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 16;
  ctx.stroke();
  // Lengan pendek kemeja
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.lineTo(lsx + (lhx - lsx) * 0.36, lsy + (lhy - lsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 22;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- SARUNG KOTAK-KOTAK TENUN (pinggang sampai bawah lutut!) ---
  const sarungTop = torsoTop + th - 66;
  const sarungH = 220;
  const sarungPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 94, sarungTop);
    ctx.lineTo(CX + 94, sarungTop);
    ctx.lineTo(CX + 106, sarungTop + sarungH);
    ctx.quadraticCurveTo(CX, sarungTop + sarungH + 14, CX - 106, sarungTop + sarungH);
    ctx.closePath();
  };
  const sg = ctx.createLinearGradient(CX - 100, sarungTop, CX + 105, sarungTop + sarungH);
  sg.addColorStop(0, sarung);
  sg.addColorStop(0.62, sarung);
  sg.addColorStop(1, sarungDark);
  inked(ctx, sarungPath, sg, ink, 5.5, 3.5, 5);

  // Pola kotak-kotak tenun khas sarung
  ctx.save();
  sarungPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(28, 36, 68, 0.45)';
  for (let x = CX - 108; x <= CX + 108; x += 48) ctx.fillRect(x, sarungTop, 18, sarungH + 20);
  for (let y = sarungTop + 26; y < sarungTop + sarungH; y += 48) ctx.fillRect(CX - 120, y, 240, 14);
  ctx.strokeStyle = sarungStripe;
  ctx.lineWidth = 3.5;
  for (let x = CX - 90; x <= CX + 108; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, sarungTop);
    ctx.lineTo(x, sarungTop + sarungH + 20);
    ctx.stroke();
  }
  for (let y = sarungTop + 44; y < sarungTop + sarungH; y += 48) {
    ctx.beginPath();
    ctx.moveTo(CX - 120, y);
    ctx.lineTo(CX + 120, y);
    ctx.stroke();
  }
  // Gulungan pinggang sarung
  ctx.fillStyle = '#b44344';
  ctx.fillRect(CX - 110, sarungTop, 220, 22);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX - 110, sarungTop + 22);
  ctx.lineTo(CX + 110, sarungTop + 22);
  ctx.stroke();
  ctx.restore();

  // --- Torso: Kemeja Kotak-kotak Biru-Krem (sedikit perut bapak-bapak hangat) ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.4, torsoTop + 8);
    ctx.bezierCurveTo(CX - tw * 0.6, torsoTop + th * 0.35, CX - tw * 0.58, torsoTop + th * 0.78, CX - 96, sarungTop + 8);
    ctx.quadraticCurveTo(CX, sarungTop + 20, CX + 96, sarungTop + 8);
    ctx.bezierCurveTo(CX + tw * 0.58, torsoTop + th * 0.78, CX + tw * 0.6, torsoTop + th * 0.35, CX + tw * 0.4, torsoTop + 8);
    ctx.closePath();
  };
  inked(ctx, torsoPath, shirt, ink, 5.5, 3.5, 5);

  ctx.save();
  torsoPath();
  ctx.clip();
  ctx.strokeStyle = shirtGrid;
  ctx.lineWidth = 4;
  for (let x = CX - 130; x <= CX + 130; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, torsoTop);
    ctx.lineTo(x, sarungTop + 25);
    ctx.stroke();
  }
  for (let y = torsoTop + 18; y < sarungTop + 25; y += 32) {
    ctx.beginPath();
    ctx.moveTo(CX - 140, y);
    ctx.lineTo(CX + 140, y);
    ctx.stroke();
  }
  // Saku kemeja + pulpen terselip di saku!
  ctx.fillStyle = '#dce5f2';
  ctx.fillRect(CX + 32, torsoTop + 68, 40, 44);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(CX + 32, torsoTop + 68, 40, 44);
  ctx.strokeStyle = '#c93c3c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CX + 58, torsoTop + 48);
  ctx.lineTo(CX + 54, torsoTop + 72);
  ctx.stroke();
  ctx.restore();

  // Kerah kemeja
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(CX - 56, torsoTop + 2);
      ctx.lineTo(CX - 22, torsoTop + 38);
      ctx.lineTo(CX + 8, torsoTop + 16);
      ctx.lineTo(CX + 38, torsoTop + 38);
      ctx.lineTo(CX + 62, torsoTop + 2);
      ctx.closePath();
    },
    '#ffffff',
    ink,
    4.5,
    2,
    3,
  );

  // --- Lengan depan (kanan) + Gelas Belimbing Kopi Tubruk di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 54;
  let rhx = CX + 142;
  let rhy = torsoTop + 180;
  let rbend = 22;
  if (mode === 'walk') {
    rhx = CX + 132 + swing * 48;
    rhy = torsoTop + 170 - Math.abs(swing) * 16;
    rbend = 18;
  } else if (mode === 'explain') {
    rhx = CX + 184;
    rhy = torsoTop - 8;
    rbend = 32;
  } else if (mode === 'shock') {
    rhx = CX + 194;
    rhy = torsoTop - 36;
    rbend = 30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.lineTo(rsx + (rhx - rsx) * 0.36, rsy + (rhy - rsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 22;
  ctx.stroke();

  if (mode === 'explain') {
    // Gelas Belimbing Kopi Tubruk Panas + uap halus
    ctx.save();
    ctx.translate(rhx + 14, rhy - 12);
    // Uap panas
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 4;
    for (const sx of [-9, 6]) {
      ctx.beginPath();
      ctx.moveTo(sx, -56);
      ctx.quadraticCurveTo(sx - 8, -72, sx + 4, -88);
      ctx.stroke();
    }
    const glassPath = () => {
      ctx.beginPath();
      ctx.moveTo(-24, -46);
      ctx.lineTo(24, -46);
      ctx.lineTo(18, 16);
      ctx.lineTo(-18, 16);
      ctx.closePath();
    };
    inked(ctx, glassPath, '#d9eef7', ink, 4.5, 2, 3);
    ctx.save();
    glassPath();
    ctx.clip();
    ctx.fillStyle = '#2d1c16';
    ctx.fillRect(-26, -24, 52, 46);
    ctx.fillStyle = '#5c3c2e';
    ctx.fillRect(-26, -28, 52, 8);
    // Garis belimbing vertikal
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2.5;
    for (const gx of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.moveTo(gx, -46);
      ctx.lineTo(gx * 0.85, 16);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Telinga ---
  inked(ctx, () => { ctx.beginPath(); ctx.ellipse(CX - W * 0.49, cy + 14, 19, 25, -0.15, 0, TAU); }, skin, ink, 5, 2, 3.5);

  // --- Kepala Bapak-bapak Bulat-Mantap ---
  const headPath = () => {
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 2.1 : 2.35; // rahang agak lebih penuh
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) x += facing * W * 0.035 * s;
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

  // --- Rambut Belah Pinggir Rapi + Aksen Uban Tipis di Pelipis ---
  const hairPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.49, cy - 8);
    ctx.bezierCurveTo(CX - W * 0.55, headTop - 14, CX - W * 0.2, headTop - 44, CX + W * 0.16, headTop - 36);
    ctx.bezierCurveTo(CX + W * 0.46, headTop - 34, CX + W * 0.56, headTop + 4, CX + W * 0.49, cy - 18);
    ctx.quadraticCurveTo(CX + W * 0.24, headTop + 20, CX - W * 0.18, headTop + 34);
    ctx.quadraticCurveTo(CX - W * 0.42, headTop + 44, CX - W * 0.49, cy - 8);
    ctx.closePath();
  };
  inked(ctx, hairPath, hair, ink, 5.5, 3, 4);
  // Uban tipis khas bapak-bapak
  ctx.strokeStyle = '#c5cad6';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(CX - W * 0.46, cy - 16);
  ctx.lineTo(CX - W * 0.36, cy - 30);
  ctx.stroke();

  // --- Wajah + Kumis Tebal Melengkung Khas Pak RT ---
  const shift = facing * W * 0.085;
  const ex = (s: number) => CX + shift + s * W * 0.15;
  const eyeY = cy + 6;
  drawEyes(ctx, ex, eyeY, mode, blink, ink, { liddedIdle: true, shift });

  const by = eyeY - 40;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 46, 13, -14, ink);
    brow(ctx, ex(1), by - 14, 46, 13, 14, ink);
  } else {
    brow(ctx, ex(-1), by, 44, 13, -5, ink);
    brow(ctx, ex(1), by, 44, 13, 5, ink);
  }

  // Mulut di bawah kumis
  const mx = CX + shift;
  const my = cy + 72;
  drawDynamicMouth(ctx, mx, my, mode, talk, ink, true);

  // Kumis tebal ikonik! (sedikit terangkat saat shock)
  const mustY = cy + 52 + (mode === 'shock' ? -8 : 0);
  const mustPath = () => {
    ctx.beginPath();
    ctx.moveTo(mx, mustY - 12);
    ctx.bezierCurveTo(mx + 22, mustY - 18, mx + 52, mustY - 2, mx + 56, mustY + 14);
    ctx.quadraticCurveTo(mx + 24, mustY + 12, mx, mustY + 4);
    ctx.quadraticCurveTo(mx - 24, mustY + 12, mx - 56, mustY + 14);
    ctx.bezierCurveTo(mx - 52, mustY - 2, mx - 22, mustY - 18, mx, mustY - 12);
    ctx.closePath();
  };
  inked(ctx, mustPath, hair, ink, 4.5, 2, 3);

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 22, 132, ink);
  ctx.restore();
}

// =================================================================================================
// ID-6: BU SITI (Ibu Warung / Emak-emak — Cepol Tinggi, Daster Motif Bunga, Celemek, Spatula)
// =================================================================================================
function drawBuSiti(ctx: Ctx, pose: WargaPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.32);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#281829';
  const skin = '#f2caa6';
  const skinShadow = '#dfb3ad';
  const hair = '#2e1d26';
  const daster = '#f29b38';
  const dasterShade = '#d67824';
  const apron = '#389982';
  const apronShade = '#277566';
  const sandal = '#c84b4b';

  const W = 244;
  const H = 230;
  const headTop = 202 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 210;
  const th = 228;
  const hipY = torsoTop + th - 8;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki keluar dari bawah daster + sandal selop merah ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 56;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 26 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 66 : 48) + stepX;
    const fy = WARGA_SOLE_Y - liftY;
    const hx = CX + sgn * 42;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 21;
    ctx.beginPath();
    ctx.moveTo(hx, hipY + 90);
    ctx.lineTo(fx, fy - 18);
    ctx.stroke();
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 11;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.ellipse(fx + sgn * 12, fy - 10, 29, 12, 0, 0, TAU);
      },
      sandal,
      ink,
      4.5,
      2,
      3,
    );
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Cepol / Sanggul Tinggi Ikonik (di belakang kepala!) ---
  const bunY = headTop - 36 + (mode === 'shock' ? -10 : 0);
  inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 12, bunY, 44, 0, TAU); }, hair, ink, 5.5, 3, 4);
  // Ikat / jepit merah-emas di dasar cepol
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(CX - 46, bunY + 20, 68, 16, 8);
    },
    '#e04848',
    ink,
    4,
    2,
    2.5,
  );

  // --- Lengan belakang (kiri) ---
  const lsx = CX - tw * 0.42;
  const lsy = torsoTop + 52;
  let lhx = CX - 134;
  let lhy = torsoTop + 174;
  let lbend = -36;
  if (mode === 'walk') {
    lhx = CX - 128 - swing * 48;
    lhy = torsoTop + 168 - Math.abs(swing) * 16;
    lbend = -18;
  } else if (mode === 'idle') {
    lhx = CX - 116;
    lhy = torsoTop + 170;
    lbend = -48; // tangan di pinggang khas emak-emak!
  } else if (mode === 'explain') {
    lhx = CX - 152;
    lhy = torsoTop + 126;
    lbend = -26;
  } else if (mode === 'shock') {
    lhx = CX - 184;
    lhy = torsoTop - 34;
    lbend = -28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.lineTo(lsx + (lhx - lsx) * 0.36, lsy + (lhy - lsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = daster;
  ctx.lineWidth = 22;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- DASTER PANJANG MOTIF BUNGA CERIA (terusan A-line sampai betis!) ---
  const dressH = 384;
  const dressPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 76, torsoTop + 6);
    ctx.quadraticCurveTo(CX, torsoTop - 4, CX + 76, torsoTop + 6);
    ctx.bezierCurveTo(CX + 114, torsoTop + 110, CX + 126, torsoTop + 260, CX + 118, torsoTop + dressH);
    ctx.quadraticCurveTo(CX, torsoTop + dressH + 18, CX - 118, torsoTop + dressH);
    ctx.bezierCurveTo(CX - 126, torsoTop + 260, CX - 114, torsoTop + 110, CX - 76, torsoTop + 6);
    ctx.closePath();
  };
  const dg = ctx.createLinearGradient(CX - 110, torsoTop, CX + 115, torsoTop + dressH);
  dg.addColorStop(0, daster);
  dg.addColorStop(0.6, daster);
  dg.addColorStop(1, dasterShade);
  inked(ctx, dressPath, dg, ink, 5.5, 3.5, 5.5);

  // Motif bunga daster ceria (di-clip)
  ctx.save();
  dressPath();
  ctx.clip();
  const flowerPos = [
    [-58, 56],
    [48, 48],
    [0, 102],
    [-68, 152],
    [66, 146],
    [-54, 248],
    [58, 256],
    [4, 308],
    [-74, 336],
    [76, 342],
  ];
  for (const [fx, fy] of flowerPos) {
    const px = CX + fx;
    const py = torsoTop + fy;
    ctx.fillStyle = '#fff5db';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * 10, py + Math.sin(a) * 10, 7.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#e04f4f';
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // --- Celemek Warung Hijau-Tosca + Saku Depan ---
  const apronTop = torsoTop + 152;
  const apronPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 84, apronTop);
    ctx.lineTo(CX + 84, apronTop);
    ctx.lineTo(CX + 96, apronTop + 154);
    ctx.quadraticCurveTo(CX, apronTop + 170, CX - 96, apronTop + 154);
    ctx.closePath();
  };
  const ag = ctx.createLinearGradient(CX - 90, apronTop, CX + 90, apronTop + 160);
  ag.addColorStop(0, apron);
  ag.addColorStop(0.65, apron);
  ag.addColorStop(1, apronShade);
  inked(ctx, apronPath, ag, ink, 4.5, 2.5, 3.5);
  // Saku celemek
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.roundRect(CX - 40, apronTop + 44, 80, 52, 12);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  // --- Lengan depan (kanan) + Spatula / Sodet Stainless di mode explain ---
  const rsx = CX + tw * 0.42;
  const rsy = torsoTop + 52;
  let rhx = CX + 138;
  let rhy = torsoTop + 176;
  let rbend = 24;
  if (mode === 'walk') {
    rhx = CX + 128 + swing * 48;
    rhy = torsoTop + 168 - Math.abs(swing) * 16;
    rbend = 18;
  } else if (mode === 'explain') {
    rhx = CX + 174;
    rhy = torsoTop - 18;
    rbend = 34;
  } else if (mode === 'shock') {
    rhx = CX + 186;
    rhy = torsoTop - 36;
    rbend = 30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.lineTo(rsx + (rhx - rsx) * 0.36, rsy + (rhy - rsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = daster;
  ctx.lineWidth = 22;
  ctx.stroke();

  if (mode === 'explain') {
    // Spatula / Sodet warung!
    ctx.save();
    ctx.translate(rhx + 4, rhy - 6);
    ctx.rotate(0.35);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-6, -42, 12, 56, 4); }, '#8d4c2c', ink, 3.5, 1.5, 2);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-4, -96, 8, 56, 3); }, '#cbd5e4', ink, 3.5, 1.5, 2);
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(-24, -142, 48, 50, [10, 10, 6, 6]);
      },
      '#dbe4f2',
      ink,
      4.5,
      2,
      3,
    );
    ctx.strokeStyle = '#68758c';
    ctx.lineWidth = 3.5;
    for (const sx of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.moveTo(sx, -132);
      ctx.lineTo(sx, -104);
      ctx.stroke();
    }
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Telinga + Anting Mutiara Kecil ---
  inked(ctx, () => { ctx.beginPath(); ctx.ellipse(CX - W * 0.49, cy + 14, 17, 22, -0.1, 0, TAU); }, skin, ink, 4.5, 2, 3);
  inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - W * 0.48, cy + 34, 7, 0, TAU); }, '#fff8e8', ink, 3, 1, 1.5);

  // --- Kepala Bulat Ramah ---
  const headPath = () => {
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 2.1 : 2.3;
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) x += facing * W * 0.03 * s;
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

  // --- Rambut Belah Tengah Rapi (menyambung ke cepol di belakang) ---
  const hairFront = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.5, cy - 2);
    ctx.bezierCurveTo(CX - W * 0.54, headTop - 16, CX - W * 0.14, headTop - 32, CX + 6, headTop - 22);
    ctx.bezierCurveTo(CX + W * 0.36, headTop - 30, CX + W * 0.56, headTop - 6, CX + W * 0.49, cy - 10);
    ctx.quadraticCurveTo(CX + W * 0.28, headTop + 26, CX + 8, headTop + 18);
    ctx.quadraticCurveTo(CX - W * 0.24, headTop + 44, CX - W * 0.5, cy - 2);
    ctx.closePath();
  };
  inked(ctx, hairFront, hair, ink, 5, 3, 4);

  // --- Wajah Ceria Bu Siti ---
  const shift = facing * W * 0.08;
  const ex = (s: number) => CX + shift + s * W * 0.148;
  const eyeY = cy + 12;
  drawEyes(ctx, ex, eyeY, mode, blink, ink, { lash: true, shift });

  const by = eyeY - 38;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 38, 9.5, -16, ink);
    brow(ctx, ex(1), by - 14, 38, 9.5, 16, ink);
  } else {
    brow(ctx, ex(-1), by - 2, 36, 9.5, -7, ink);
    brow(ctx, ex(1), by - 2, 36, 9.5, 7, ink);
  }

  drawDynamicMouth(ctx, CX + shift, cy + 68, mode, talk, ink, true);

  if (mode === 'shock') {
    drawSweatDrop(ctx, CX + W * 0.36, cy - 30, ink);
    drawShockTicks(ctx, CX, headTop - 52, 134, ink);
  }
  ctx.restore();
}

// =================================================================================================
// ID-7: RAKA (Pelajar SMA Indonesia — Seragam Putih-Abu, Dasi, Badge OSIS, Ransel, Smartphone)
// =================================================================================================
function drawRakaSMA(ctx: Ctx, pose: WargaPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.34);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#1e1b30';
  const skin = '#f4cfa9';
  const skinShadow = '#dfb8b4';
  const hair = '#262336';
  const hairHi = '#433f5e';
  const shirt = '#fdfbf6';
  const shirtShade = '#e3e4ee';
  const grey = '#78829a';
  const greyDark = '#5b647a';
  const bag = '#d64545';
  const shoe = '#262838';

  const W = 240;
  const H = 228;
  const headTop = 190 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 186;
  const th = 220;
  const hipY = torsoTop + th - 12;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki celana abu-abu SMA + sneakers hitam-putih ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 72;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 34 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 76 : 54) + stepX;
    const fy = WARGA_SOLE_Y - liftY;
    const hx = CX + sgn * 34;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - sgn * 5, (hipY + fy) / 2, fx, fy - 24);
    ctx.stroke();
    ctx.strokeStyle = grey;
    ctx.lineWidth = 17;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(fx - 25 + sgn * 12, fy - 30, 60, 30, [14, 14, 8, 8]);
      },
      shoe,
      ink,
      4.5,
      2,
      3.5,
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 19 + sgn * 12, fy - 9, 50, 6);
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Tas Ransel Merah Mengintip di Belakang Punggung ---
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(CX - 118, torsoTop + 24, 90, 158, 28);
    },
    bag,
    ink,
    5,
    3,
    4,
  );

  // --- Lengan belakang (kiri) lengan pendek putih ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 50;
  let lhx = CX - 126;
  let lhy = torsoTop + 174;
  let lbend = -32;
  if (mode === 'walk') {
    lhx = CX - 122 - swing * 54;
    lhy = torsoTop + 168 - Math.abs(swing) * 18;
    lbend = -20;
  } else if (mode === 'explain') {
    lhx = CX - 148;
    lhy = torsoTop + 124;
    lbend = -26;
  } else if (mode === 'shock') {
    lhx = CX - 182;
    lhy = torsoTop - 40;
    lbend = -28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.lineTo(lsx + (lhx - lsx) * 0.36, lsy + (lhy - lsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 20;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso: Kemeja Seragam Putih SMA + Dasi Abu + Tali Ransel + Badge OSIS ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - tw * 0.6, torsoTop + th * 0.35, CX - tw * 0.54, torsoTop + th * 0.94, CX - tw * 0.16, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.24, torsoTop + th * 1.03, CX + tw * 0.58, torsoTop + th * 0.92, CX + tw * 0.54, torsoTop + th * 0.45);
    ctx.bezierCurveTo(CX + tw * 0.52, torsoTop + th * 0.16, CX + tw * 0.46, torsoTop + 8, CX + tw * 0.42, torsoTop + 8);
    ctx.closePath();
  };
  const shg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  shg.addColorStop(0, shirt);
  shg.addColorStop(0.62, shirt);
  shg.addColorStop(1, shirtShade);
  inked(ctx, torsoPath, shg, ink, 5.5, 3.5, 5);

  ctx.save();
  torsoPath();
  ctx.clip();
  // Ikat pinggang hitam & celana abu atas
  ctx.fillStyle = grey;
  ctx.fillRect(CX - tw, torsoTop + th - 36, tw * 2, 42);
  ctx.fillStyle = '#252636';
  ctx.fillRect(CX - tw, torsoTop + th - 48, tw * 2, 16);
  ctx.fillStyle = '#d4dae6';
  ctx.fillRect(CX - 4, torsoTop + th - 46, 20, 12);

  // Saku dada + Badge OSIS kuning-biru ikonik SMA Indonesia
  ctx.strokeStyle = 'rgba(30,27,48,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(CX + 26, torsoTop + 66, 36, 42);
  ctx.fillStyle = '#f2c144';
  ctx.fillRect(CX + 34, torsoTop + 76, 20, 22);
  ctx.fillStyle = '#335fc4';
  ctx.fillRect(CX + 38, torsoTop + 80, 12, 14);

  // Dasi Abu-Abu SMA
  ctx.fillStyle = greyDark;
  ctx.beginPath();
  ctx.moveTo(CX - 6, torsoTop + 18);
  ctx.lineTo(CX + 18, torsoTop + 18);
  ctx.lineTo(CX + 24, torsoTop + 132);
  ctx.lineTo(CX + 6, torsoTop + 156);
  ctx.lineTo(CX - 12, torsoTop + 132);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Tali ransel hitam di kedua bahu
  ctx.fillStyle = '#2a2b3d';
  ctx.fillRect(CX - 72, torsoTop, 20, th - 46);
  ctx.fillRect(CX + 62, torsoTop, 20, th - 46);
  ctx.restore();

  // Kerah putih
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(CX - 54, torsoTop + 2);
      ctx.lineTo(CX - 18, torsoTop + 36);
      ctx.lineTo(CX + 6, torsoTop + 18);
      ctx.lineTo(CX + 32, torsoTop + 36);
      ctx.lineTo(CX + 58, torsoTop + 2);
      ctx.closePath();
    },
    '#ffffff',
    ink,
    4.5,
    2,
    3,
  );

  // --- Lengan depan (kanan) + Smartphone di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 50;
  let rhx = CX + 130;
  let rhy = torsoTop + 174;
  let rbend = 24;
  if (mode === 'walk') {
    rhx = CX + 122 + swing * 54;
    rhy = torsoTop + 168 - Math.abs(swing) * 18;
    rbend = 20;
  } else if (mode === 'explain') {
    rhx = CX + 172;
    rhy = torsoTop - 16;
    rbend = 32;
  } else if (mode === 'shock') {
    rhx = CX + 184;
    rhy = torsoTop - 42;
    rbend = 28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.lineTo(rsx + (rhx - rsx) * 0.36, rsy + (rhy - rsy) * 0.36);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 20;
  ctx.stroke();

  if (mode === 'explain') {
    // Smartphone menyala
    ctx.save();
    ctx.translate(rhx + 10, rhy - 20);
    ctx.rotate(0.18);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-22, -48, 46, 76, 10); }, '#222638', ink, 4, 2, 3);
    ctx.fillStyle = '#89d4ff';
    ctx.beginPath();
    ctx.roundRect(-16, -40, 34, 58, 5);
    ctx.fill();
    ctx.fillStyle = '#fff5b8';
    ctx.fillRect(-10, -28, 22, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -10, 18, 6);
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Telinga ---
  inked(ctx, () => { ctx.beginPath(); ctx.ellipse(CX - W * 0.49, cy + 12, 17, 23, -0.15, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Kepala Pelajar Muda ---
  const headPath = () => {
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 2.15 : 2.15;
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) {
        x *= 1 - 0.11 * s;
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

  // --- Wajah Antusias ---
  const shift = facing * W * 0.085;
  const ex = (s: number) => CX + shift + s * W * 0.15;
  const eyeY = cy + 14;
  drawEyes(ctx, ex, eyeY, mode, blink, ink, { shift });

  const by = eyeY - 40;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 38, 10.5, -16, ink);
    brow(ctx, ex(1), by - 14, 38, 10.5, 16, ink);
  } else {
    brow(ctx, ex(-1), by - 4, 38, 10.5, -8, ink);
    brow(ctx, ex(1), by + 1, 36, 10.5, 6, ink);
  }

  drawDynamicMouth(ctx, CX + shift, cy + 68, mode, talk, ink, true);

  // --- Rambut Curtain Bangs Gaya Anak SMA ---
  const lift = mode === 'shock' ? -12 : 0;
  const hairPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.5, cy - 6);
    ctx.bezierCurveTo(CX - W * 0.58, headTop - 18, CX - W * 0.28, headTop - 54 + lift, CX + 4, headTop - 44 + lift);
    ctx.quadraticCurveTo(CX + 26, headTop - 78 + lift, CX + 64, headTop - 48 + lift);
    ctx.bezierCurveTo(CX + W * 0.54, headTop - 36, CX + W * 0.6, headTop + 2, CX + W * 0.49, cy - 12);
    // Poni belah natural (curtain bangs)
    ctx.quadraticCurveTo(CX + W * 0.3, headTop + 42, CX + W * 0.16, headTop + 14);
    ctx.quadraticCurveTo(CX + 6, headTop + 56, CX - 10, headTop + 16);
    ctx.quadraticCurveTo(CX - W * 0.28, headTop + 52, CX - W * 0.5, cy - 6);
    ctx.closePath();
  };
  inked(ctx, hairPath, hair, ink, 5.5, 3.5, 4.5);

  ctx.save();
  hairPath();
  ctx.clip();
  ctx.strokeStyle = hairHi;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(CX - 70, headTop - 10);
  ctx.quadraticCurveTo(CX + 4, headTop - 28, CX + 72, headTop - 8);
  ctx.stroke();
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 36, 134, ink);
  ctx.restore();
}

// =================================================================================================
// ID-8: BANG UDIN (Abang Ojol / Kurir — Jaket Hijau-Hitam Reflektor, Helm Half-Face Visor, HP Peta)
// =================================================================================================
function drawBangUdin(ctx: Ctx, pose: WargaPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.32);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#191d2d';
  const skin = '#e7b98f';
  const skinShadow = '#cfa096';
  const ojolGreen = '#19ab58';
  const ojolShade = '#128243';
  const ojolDark = '#232838';
  const reflector = '#dce6f2';
  const jeans = '#314975';
  const shoe = '#242736';

  const W = 250;
  const H = 236;
  const headTop = 190 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 210;
  const th = 228;
  const hipY = torsoTop + th - 12;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki Jeans Biru Gelap + Sneakers Hitam-Hijau ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 72;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 34 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 78 : 56) + stepX;
    const fy = WARGA_SOLE_Y - liftY;
    const hx = CX + sgn * 38;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - sgn * 6, (hipY + fy) / 2, fx, fy - 24);
    ctx.stroke();
    ctx.strokeStyle = jeans;
    ctx.lineWidth = 17;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(fx - 26 + sgn * 12, fy - 32, 62, 32, [15, 15, 9, 9]);
      },
      shoe,
      ink,
      4.5,
      2.5,
      3.5,
    );
    ctx.fillStyle = ojolGreen;
    ctx.fillRect(fx - 18 + sgn * 12, fy - 11, 48, 6);
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) lengan jaket hitam-hijau ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 54;
  let lhx = CX - 134;
  let lhy = torsoTop + 174;
  let lbend = -30;
  if (mode === 'walk') {
    lhx = CX - 128 - swing * 54;
    lhy = torsoTop + 168 - Math.abs(swing) * 18;
    lbend = -20;
  } else if (mode === 'explain') {
    lhx = CX - 154;
    lhy = torsoTop + 126;
    lbend = -26;
  } else if (mode === 'shock') {
    lhx = CX - 190;
    lhy = torsoTop - 32;
    lbend = -28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = ojolDark;
  ctx.lineWidth = 20;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso: Jaket Ojol Hijau Terang + Panel Hitam + Strip Reflektor ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.42, torsoTop + 10);
    ctx.bezierCurveTo(CX - tw * 0.6, torsoTop + th * 0.32, CX - tw * 0.58, torsoTop + th * 0.9, CX - tw * 0.28, torsoTop + th);
    ctx.quadraticCurveTo(CX, torsoTop + th + 12, CX + tw * 0.28, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.58, torsoTop + th * 0.9, CX + tw * 0.6, torsoTop + th * 0.32, CX + tw * 0.42, torsoTop + 10);
    ctx.closePath();
  };
  const og = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  og.addColorStop(0, ojolGreen);
  og.addColorStop(0.58, ojolGreen);
  og.addColorStop(1, ojolShade);
  inked(ctx, torsoPath, og, ink, 5.5, 3.5, 5.5);

  ctx.save();
  torsoPath();
  ctx.clip();
  // Panel bahu hitam + panel bawah hitam khas jaket ojol
  ctx.fillStyle = ojolDark;
  ctx.fillRect(CX - tw, torsoTop, tw * 2, 56);
  ctx.fillRect(CX - tw, torsoTop + th - 48, tw * 2, 60);
  // Strip reflektor perak terang di dada!
  ctx.fillStyle = reflector;
  ctx.fillRect(CX - tw, torsoTop + 56, tw * 2, 12);
  ctx.fillRect(CX - tw, torsoTop + th - 58, tw * 2, 10);
  // Resleting tengah
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(CX + 6, torsoTop);
  ctx.lineTo(CX + 6, torsoTop + th + 14);
  ctx.stroke();
  ctx.restore();

  // Kerah tinggi jaket
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(CX - 62, torsoTop - 4, 124, 26, 10);
    },
    ojolDark,
    ink,
    4.5,
    2,
    3,
  );

  // --- Lengan depan (kanan) + HP Navigasi Map di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 54;
  let rhx = CX + 138;
  let rhy = torsoTop + 174;
  let rbend = 22;
  if (mode === 'walk') {
    rhx = CX + 128 + swing * 54;
    rhy = torsoTop + 168 - Math.abs(swing) * 18;
    rbend = 20;
  } else if (mode === 'explain') {
    rhx = CX + 178;
    rhy = torsoTop - 16;
    rbend = 34;
  } else if (mode === 'shock') {
    rhx = CX + 192;
    rhy = torsoTop - 36;
    rbend = 28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = ojolDark;
  ctx.lineWidth = 20;
  ctx.stroke();

  if (mode === 'explain') {
    // HP Navigasi Ojol (layar peta rute + pin lokasi!)
    ctx.save();
    ctx.translate(rhx + 12, rhy - 22);
    ctx.rotate(0.16);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-24, -52, 50, 82, 10); }, '#1e2230', ink, 4.5, 2, 3);
    ctx.fillStyle = '#e7f5e8';
    ctx.beginPath();
    ctx.roundRect(-18, -44, 38, 64, 5);
    ctx.fill();
    // Garis rute hijau + pin merah
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
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Kepala di dalam Helm ---
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
      if (s > 0) x += facing * W * 0.035 * s;
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

  // Tali dagu helm hitam
  ctx.strokeStyle = ojolDark;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(CX - W * 0.44, cy + 36);
  ctx.quadraticCurveTo(CX, chin + 8, CX + W * 0.44, cy + 36);
  ctx.stroke();

  // --- Wajah Ramah ---
  const shift = facing * W * 0.085;
  const ex = (s: number) => CX + shift + s * W * 0.148;
  const eyeY = cy + 16;
  drawEyes(ctx, ex, eyeY, mode, blink, ink, { liddedIdle: true, shift });

  const by = eyeY - 38;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 40, 11, -16, ink);
    brow(ctx, ex(1), by - 14, 40, 11, 16, ink);
  } else {
    brow(ctx, ex(-1), by - 2, 38, 11, -6, ink);
    brow(ctx, ex(1), by - 2, 38, 11, 6, ink);
  }
  drawDynamicMouth(ctx, CX + shift, cy + 70, mode, talk, ink, true);

  // --- HELM HALF-FACE HIJAU-HITAM + VISOR KACA TERANGKAT (loncat saat shock!) ---
  const helmPop = mode === 'shock' ? -36 : 0;
  ctx.save();
  ctx.translate(CX, cy + helmPop);
  ctx.rotate(mode === 'shock' ? -0.1 : 0);

  // Cangkang luar helm melingkupi sisi kiri-kanan & atas kepala
  const helmPath = () => {
    ctx.beginPath();
    ctx.moveTo(-144, 34);
    ctx.bezierCurveTo(-158, -74, -92, -152, 0, -150);
    ctx.bezierCurveTo(96, -152, 158, -74, 144, 34);
    ctx.lineTo(122, 26);
    ctx.bezierCurveTo(128, -42, 92, -76, 0, -76);
    ctx.bezierCurveTo(-92, -76, -128, -42, -122, 26);
    ctx.closePath();
  };
  const hg = ctx.createLinearGradient(-140, -150, 140, 30);
  hg.addColorStop(0, '#23c266');
  hg.addColorStop(0.55, ojolGreen);
  hg.addColorStop(1, ojolShade);
  inked(ctx, helmPath, hg, ink, 5.5, 3.5, 5);

  // Strip tengah hitam + highlight kilap helm
  ctx.save();
  helmPath();
  ctx.clip();
  ctx.fillStyle = ojolDark;
  ctx.fillRect(-18, -156, 36, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.beginPath();
  ctx.ellipse(-62, -106, 32, 14, -0.45, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Visor Kaca Biru Muda Transparan Terangkat di Dahi!
  const visorPath = () => {
    ctx.beginPath();
    ctx.moveTo(-132, -32);
    ctx.quadraticCurveTo(0, -56, 132, -32);
    ctx.quadraticCurveTo(138, -74, 110, -96);
    ctx.quadraticCurveTo(0, -116, -110, -96);
    ctx.quadraticCurveTo(-138, -74, -132, -32);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(135, 206, 250, 0.45)';
  visorPath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  // Kilau visor
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-82, -78);
  ctx.lineTo(-34, -84);
  ctx.stroke();
  // Engsel visor kiri-kanan
  for (const sx of [-130, 130]) {
    inked(ctx, () => { ctx.beginPath(); ctx.arc(sx, -24, 11, 0, TAU); }, ojolDark, ink, 3.5, 1, 2);
  }
  ctx.restore();

  if (mode === 'shock') {
    drawSweatDrop(ctx, CX + 98, cy - 16, ink);
    drawShockTicks(ctx, CX, headTop - 56, 146, ink);
  }
  ctx.restore();
}

export function drawWarga(id: WargaId, ctx: Ctx, pose: WargaPose) {
  ctx.clearRect(0, 0, WARGA_W, WARGA_H);
  if (id === 'ID5') drawPakBudi(ctx, pose);
  else if (id === 'ID6') drawBuSiti(ctx, pose);
  else if (id === 'ID7') drawRakaSMA(ctx, pose);
  else drawBangUdin(ctx, pose);
}
