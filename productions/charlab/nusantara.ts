/**
 * 4 Karakter Orisinal "Ala Indonesia / Nusantara" untuk Konten YouTube Edutainment & Storytelling.
 * Kanvas desain: 700 x 1100, telapak kaki di y = 1040 (menapak lantai 3D).
 * Mendukung animasi penuh per frame: walkPhase (jalan bouncy), talk (lip-sync), blink (4-frame), mode akting.
 *
 * ID1 = Mas Arya       (Batik Kawung Indigo-Emas + Peci Beludru — Host Fakta & Sejarah)
 * ID2 = Mbak Rara      (Hijab Sage-Teal Modern + Jaket Denim + Mic — Host Kreator Muda)
 * ID3 = Bang Dimas     (Jaket Coach Hijau-Krem + Topi Miring + Es Teh — Komedi / Relatable)
 * ID4 = Saka Nusantara (Iket Batik Merah-Emas + Rompi Tenun + Peta — Kisah Rakyat / Petualangan)
 */

export type NusantaraId = 'ID1' | 'ID2' | 'ID3' | 'ID4';
export type NusantaraMode = 'idle' | 'explain' | 'shock' | 'walk';

export type NusantaraPose = {
  mode: NusantaraMode;
  /** 0..1 fase siklus langkah jalan (1.0 = dua langkah penuh). */
  walkPhase?: number;
  /** 0..1 bukaan mulut lip-sync (0 = tertutup/senyum, 0.5 = sedang, 1 = lebar). */
  talk?: number;
  /** 0 = mata terbuka, 0.5 = setengah tertutup, 1 = tertutup penuh. */
  blink?: number;
  /** -1..1 arah hadap wajah (default positif = menghadap kanan). */
  facing?: number;
};

export const NUSA_W = 700;
export const NUSA_H = 1100;
export const NUSA_SOLE_Y = 1040;

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

/** Gambar mulut dinamis untuk idle, bicara lip-sync (talk 0..1), atau shock. */
function drawDynamicMouth(ctx: Ctx, mx: number, my: number, mode: NusantaraMode, talk: number, ink: string, teeth = true) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  if (mode === 'shock') {
    ctx.fillStyle = '#5c222d';
    ctx.beginPath();
    ctx.ellipse(mx, my + 5, 16, 23, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    return;
  }
  const open = mode === 'explain' ? Math.max(0.45, talk) : talk;
  if (open > 0.22) {
    const w = 18 + open * 12;
    const h = 10 + open * 20;
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
    ctx.ellipse(mx, my + h - 2, w * 0.55, h * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - 18, my + 1);
    ctx.quadraticCurveTo(mx + 3, my + 11, mx + 20, my - 3);
    ctx.stroke();
  }
}

/** Hitung bob vertikal (px), ayunan langkah (-1..1), dan lean (derajat) saat berjalan. */
function walkKinematics(pose: NusantaraPose) {
  const isWalk = pose.mode === 'walk';
  const ph = (pose.walkPhase ?? 0) * TAU;
  const swing = isWalk ? Math.sin(ph) : 0;
  // Bob 2x per siklus (terendah saat kontak), ~4.5% tinggi tubuh = ~42 px
  const bob = isWalk ? -Math.abs(Math.sin(ph)) * 38 : 0;
  const lean = isWalk
    ? 3.5 + 3.2 * Math.cos(ph * 2)
    : pose.mode === 'explain'
      ? 3
      : pose.mode === 'shock'
        ? -4.5
        : 1.2;
  return { swing, bob, lean };
}

/** Gambar motif batik kawung/geometris bersih di dalam clip torso. */
function drawBatikKawung(ctx: Ctx, x0: number, y0: number, w: number, h: number, gold: string, dark: string) {
  ctx.save();
  const step = 46;
  for (let y = y0; y < y0 + h + step; y += step) {
    for (let x = x0; x < x0 + w + step; x += step) {
      // 4 kelopak kawung miring
      ctx.fillStyle = gold;
      for (const [dx, dy, rot] of [
        [-9, -9, Math.PI / 4],
        [9, -9, -Math.PI / 4],
        [-9, 9, -Math.PI / 4],
        [9, 9, Math.PI / 4],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, 9, 4.8, rot, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// =================================================================================================
// ID-1: MAS ARYA — Batik Kawung Indigo-Emas + Peci Beludru Modern (Host Fakta & Sejarah Nusantara)
// =================================================================================================
function drawMasArya(ctx: Ctx, pose: NusantaraPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.34);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#26182b';
  const skin = '#eec39d';
  const skinShadow = '#d9ae9f';
  const hair = '#261c2c';
  const peci = '#231e2f';
  const peciHi = '#3c3550';
  const batikBg = '#293d6a';
  const batikShade = '#1d2b4e';
  const batikGold = '#ebb44c';
  const pants = '#4a403c';
  const shoe = '#743d2a';

  const W = 250;
  const H = 236;
  const headTop = 186 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 6;
  const tw = 194;
  const th = 228;
  const hipY = torsoTop + th - 14;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki (telapak menapak NUSA_SOLE_Y saat berdiri/kontak, terangkat saat langkah ayun) ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 72;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 34 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 76 : 54) + stepX;
    const fy = NUSA_SOLE_Y - liftY;
    const hx = CX + sgn * 36;
    const midX = (hx + fx) / 2 + sgn * -5;
    const midY = (hipY + fy) / 2;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo(midX, midY, fx, fy - 22);
    ctx.stroke();
    ctx.strokeStyle = pants;
    ctx.lineWidth = 17;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.ellipse(fx + sgn * 14, fy - 12, 32, 14, 0, 0, TAU);
      },
      shoe,
      ink,
      4.5,
      2,
      3.5,
    );
  }

  // Rotasi badan bagian atas (lean)
  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 54;
  let lhx = CX - 118;
  let lhy = torsoTop + 178;
  let lbend = -38;
  if (mode === 'walk') {
    lhx = CX - 124 - swing * 54;
    lhy = torsoTop + 172 - Math.abs(swing) * 18;
    lbend = -22;
  } else if (mode === 'explain') {
    lhx = CX - 150;
    lhy = torsoTop + 132;
    lbend = -28;
  } else if (mode === 'shock') {
    lhx = CX - 182;
    lhy = torsoTop - 36;
    lbend = -32;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = batikBg;
  ctx.lineWidth = 17;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso: Kemeja Batik Kawung Modern ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.42, torsoTop + 8);
    ctx.bezierCurveTo(CX - tw * 0.62, torsoTop + th * 0.35, CX - tw * 0.56, torsoTop + th * 0.94, CX - tw * 0.16, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.24, torsoTop + th * 1.03, CX + tw * 0.6, torsoTop + th * 0.92, CX + tw * 0.56, torsoTop + th * 0.45);
    ctx.bezierCurveTo(CX + tw * 0.52, torsoTop + th * 0.16, CX + tw * 0.46, torsoTop + 8, CX + tw * 0.42, torsoTop + 8);
    ctx.closePath();
  };
  const bg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.6, torsoTop + th);
  bg.addColorStop(0, batikBg);
  bg.addColorStop(0.62, batikBg);
  bg.addColorStop(1, batikShade);
  inked(ctx, torsoPath, bg, ink, 5.5, 3.5, 5);

  ctx.save();
  torsoPath();
  ctx.clip();
  drawBatikKawung(ctx, CX - tw * 0.6, torsoTop + 18, tw * 1.25, th, batikGold, '#7d4d20');
  // Plaket kancing tengah polos indigo + kancing emas
  ctx.fillStyle = batikShade;
  ctx.fillRect(CX - 6, torsoTop, 28, th);
  ctx.strokeStyle = batikGold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CX - 6, torsoTop);
  ctx.lineTo(CX - 6, torsoTop + th);
  ctx.moveTo(CX + 22, torsoTop);
  ctx.lineTo(CX + 22, torsoTop + th);
  ctx.stroke();
  ctx.fillStyle = batikGold;
  for (const by of [torsoTop + 56, torsoTop + 106, torsoTop + 156, torsoTop + 200]) {
    ctx.beginPath();
    ctx.arc(CX + 8, by, 5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Kerah Kemeja Batik rapi
  const collarPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 62, torsoTop + 2);
    ctx.lineTo(CX - 28, torsoTop + 42);
    ctx.lineTo(CX + 6, torsoTop + 18);
    ctx.lineTo(CX + 40, torsoTop + 42);
    ctx.lineTo(CX + 66, torsoTop + 2);
    ctx.quadraticCurveTo(CX, torsoTop - 8, CX - 62, torsoTop + 2);
    ctx.closePath();
  };
  inked(ctx, collarPath, '#354f85', ink, 4.5, 2, 3);

  // --- Lengan depan (kanan) + Buku Fakta Merah-Emas di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 54;
  let rhx = CX + 132;
  let rhy = torsoTop + 184;
  let rbend = 24;
  if (mode === 'walk') {
    rhx = CX + 124 + swing * 54;
    rhy = torsoTop + 172 - Math.abs(swing) * 18;
    rbend = 22;
  } else if (mode === 'explain') {
    rhx = CX + 178;
    rhy = torsoTop - 22;
    rbend = 34;
  } else if (mode === 'shock') {
    rhx = CX + 186;
    rhy = torsoTop - 42;
    rbend = 32;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = batikBg;
  ctx.lineWidth = 17;
  ctx.stroke();

  if (mode === 'explain') {
    // Buku Fakta Nusantara sampul merah-emas
    ctx.save();
    ctx.translate(rhx + 14, rhy - 18);
    ctx.rotate(0.2);
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(-28, -50, 64, 78, 8);
      },
      '#d4463b',
      ink,
      4.5,
      2.5,
      3.5,
    );
    ctx.fillStyle = '#f8e6c0';
    ctx.fillRect(28, -44, 7, 66);
    ctx.fillStyle = batikGold;
    ctx.fillRect(-16, -34, 34, 14);
    ctx.fillRect(-16, -10, 26, 6);
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 17, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Telinga ---
  inked(ctx, () => { ctx.beginPath(); ctx.ellipse(CX - W * 0.49, cy + 12, 18, 24, -0.15, 0, TAU); }, skin, ink, 5, 2, 3.5);

  // --- Kepala ---
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
        x *= 1 - 0.1 * s;
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

  // Rambut hitam mengintip di pelipis
  ctx.save();
  headPath();
  ctx.clip();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(CX, headTop + 18, W * 0.54, 48, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  headPath();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  ctx.stroke();

  // --- Wajah ---
  const shift = facing * W * 0.085;
  const ex = (s: number) => CX + shift + s * W * 0.145;
  const eyeY = cy + 12;

  for (const s of [-1, 1]) {
    const x = ex(s);
    if (blink >= 0.85) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, eyeY);
      ctx.lineTo(x + 18, eyeY);
      ctx.stroke();
    } else if (blink >= 0.25) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, eyeY - 1);
      ctx.lineTo(x + 18, eyeY - 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 13, 6, 0, 0, Math.PI);
      ctx.fill();
    } else if (mode === 'shock') {
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
    } else if (mode === 'explain' || mode === 'walk') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11.5, 16.5, 0, 0, TAU);
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

  // Alis ramah-cerdas
  const by = eyeY - 44;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 42, 11, -14, ink);
    brow(ctx, ex(1), by - 14, 42, 11, 14, ink);
  } else if (mode === 'explain') {
    brow(ctx, ex(-1), by - 6, 40, 11, -9, ink);
    brow(ctx, ex(1), by + 1, 40, 11, 5, ink);
  } else {
    brow(ctx, ex(-1), by, 40, 11, -4, ink);
    brow(ctx, ex(1), by, 40, 11, 4, ink);
  }

  // Hidung minimalis
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX + shift + 3, eyeY + 20);
  ctx.quadraticCurveTo(CX + shift + 11, eyeY + 28, CX + shift + 3, eyeY + 33);
  ctx.stroke();

  drawDynamicMouth(ctx, CX + shift, cy + 72, mode, talk, ink, true);

  // --- PECI / KOPIAH BELUDRU HITAM (loncat saat shock!) ---
  const peciPop = mode === 'shock' ? -46 : 0;
  const peciTilt = mode === 'shock' ? -0.14 : -0.05;
  ctx.save();
  ctx.translate(CX, headTop + 26 + peciPop);
  ctx.rotate(peciTilt);
  const peciPath = () => {
    ctx.beginPath();
    ctx.moveTo(-124, 18);
    ctx.lineTo(-110, -76);
    ctx.quadraticCurveTo(0, -96, 110, -76);
    ctx.lineTo(124, 18);
    ctx.quadraticCurveTo(0, 34, -124, 18);
    ctx.closePath();
  };
  const pg = ctx.createLinearGradient(-110, -80, 110, 20);
  pg.addColorStop(0, peciHi);
  pg.addColorStop(0.45, peci);
  pg.addColorStop(1, '#161220');
  inked(ctx, peciPath, pg, ink, 5.5, 3, 4.5);

  // Aksen lipatan tipis beludru & garis emas halus di tepi bawah peci
  ctx.strokeStyle = 'rgba(235,180,76,0.75)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-116, 10);
  ctx.quadraticCurveTo(0, 24, 116, 10);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-78, -56);
  ctx.quadraticCurveTo(-10, -68, 52, -58);
  ctx.stroke();
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 52, 134, ink);
  ctx.restore();
}

// =================================================================================================
// ID-2: MBAK RARA — Hijab Sage-Teal Modern + Jaket Denim + Kacamata + Mic (Host Kreator Muda)
// =================================================================================================
function drawMbakRara(ctx: Ctx, pose: NusantaraPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.32);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#24182e';
  const skin = '#f7d4b8';
  const skinShadow = '#e3bfc4';
  const hijab = '#3b9f94';
  const hijabShade = '#297a74';
  const hijabInner = '#f7ead6';
  const denim = '#4a77cb';
  const denimShade = '#3358a3';
  const blouse = '#fff7ec';
  const pants = '#2c3558';
  const sneaker = '#fff5e6';

  const W = 238;
  const H = 228;
  const headTop = 196 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 4;
  const tw = 196;
  const th = 224;
  const hipY = torsoTop + th - 12;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki kulot rapi + sneakers krem-teal ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 68;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 32 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 72 : 52) + stepX;
    const fy = NUSA_SOLE_Y - liftY;
    const hx = CX + sgn * 36;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - sgn * 4, (hipY + fy) / 2, fx, fy - 24);
    ctx.stroke();
    ctx.strokeStyle = pants;
    ctx.lineWidth = 19;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(fx - 24 + sgn * 12, fy - 30, 58, 30, [14, 14, 8, 8]);
      },
      sneaker,
      ink,
      4.5,
      2,
      3.5,
    );
    ctx.fillStyle = hijab;
    ctx.fillRect(fx - 16 + sgn * 12, fy - 10, 44, 5);
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) denim ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 56;
  let lhx = CX - 118;
  let lhy = torsoTop + 176;
  let lbend = -36;
  if (mode === 'walk') {
    lhx = CX - 120 - swing * 52;
    lhy = torsoTop + 170 - Math.abs(swing) * 16;
    lbend = -20;
  } else if (mode === 'explain') {
    lhx = CX - 148;
    lhy = torsoTop + 128;
    lbend = -28;
  } else if (mode === 'shock') {
    lhx = CX - 180;
    lhy = torsoTop - 32;
    lbend = -30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = denim;
  ctx.lineWidth = 17;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso: Jaket Denim di atas Blus Krem ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.4, torsoTop + 10);
    ctx.bezierCurveTo(CX - tw * 0.6, torsoTop + th * 0.35, CX - tw * 0.58, torsoTop + th * 0.92, CX - tw * 0.24, torsoTop + th);
    ctx.quadraticCurveTo(CX, torsoTop + th + 10, CX + tw * 0.24, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.58, torsoTop + th * 0.92, CX + tw * 0.6, torsoTop + th * 0.35, CX + tw * 0.4, torsoTop + 10);
    ctx.closePath();
  };
  const dg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  dg.addColorStop(0, denim);
  dg.addColorStop(0.6, denim);
  dg.addColorStop(1, denimShade);
  inked(ctx, torsoPath, dg, ink, 5.5, 3.5, 5);

  ctx.save();
  torsoPath();
  ctx.clip();
  // Blus krem di tengah
  ctx.fillStyle = blouse;
  ctx.fillRect(CX - 30, torsoTop, 64, th);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(CX - 30, torsoTop - 4, 64, th + 8);
  // Saku denim + kancing kuningan
  ctx.strokeStyle = 'rgba(255,245,225,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(CX + 44, torsoTop + 98, 34, 34);
  ctx.strokeRect(CX - 76, torsoTop + 98, 34, 34);
  ctx.fillStyle = '#f2c144';
  for (const [bx, by] of [
    [CX + 61, torsoTop + 106],
    [CX - 59, torsoTop + 106],
  ]) {
    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // --- Lengan depan (kanan) + Mikrofon Handheld di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 56;
  let rhx = CX + 130;
  let rhy = torsoTop + 180;
  let rbend = 24;
  if (mode === 'walk') {
    rhx = CX + 120 + swing * 52;
    rhy = torsoTop + 170 - Math.abs(swing) * 16;
    rbend = 20;
  } else if (mode === 'explain') {
    rhx = CX + 168;
    rhy = torsoTop - 16;
    rbend = 34;
  } else if (mode === 'shock') {
    rhx = CX + 182;
    rhy = torsoTop - 36;
    rbend = 30;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = denim;
  ctx.lineWidth = 17;
  ctx.stroke();

  if (mode === 'explain') {
    // Mikrofon handheld kreator
    ctx.save();
    ctx.translate(rhx + 4, rhy - 6);
    ctx.rotate(-0.32);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-8, -32, 16, 48, 5); }, '#2e3148', ink, 4, 2, 2.5);
    ctx.fillStyle = '#f2c144';
    ctx.fillRect(-8, -28, 16, 6);
    inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -48, 22, 0, TAU); }, '#c8d2e2', ink, 4.5, 2, 3);
    ctx.strokeStyle = '#6c7791';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -48);
    ctx.lineTo(20, -48);
    ctx.stroke();
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- HIJAB MODERN SAGE-TEAL (siluet belakang kepala + drape jatuh elegan di bahu) ---
  const hijabOuterPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 140, cy + 16);
    ctx.bezierCurveTo(CX - 152, headTop - 36, CX - 80, headTop - 52, CX, headTop - 48);
    ctx.bezierCurveTo(CX + 86, headTop - 52, CX + 150, headTop - 30, CX + 140, cy + 18);
    ctx.bezierCurveTo(CX + 144, torsoTop + 58, CX + 104, torsoTop + 98, CX + 44, torsoTop + 96);
    ctx.quadraticCurveTo(CX, torsoTop + 104, CX - 56, torsoTop + 92);
    ctx.bezierCurveTo(CX - 122, torsoTop + 88, CX - 148, torsoTop + 50, CX - 140, cy + 16);
    ctx.closePath();
  };
  const hbg = ctx.createLinearGradient(CX - 130, headTop - 40, CX + 140, torsoTop + 100);
  hbg.addColorStop(0, hijab);
  hbg.addColorStop(0.58, hijab);
  hbg.addColorStop(1, hijabShade);
  inked(ctx, hijabOuterPath, hbg, ink, 5.5, 3.5, 5.5);

  // Lipatan lembut kain hijab di leher/dada
  ctx.save();
  hijabOuterPath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(24, 58, 56, 0.35)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(CX - 94, torsoTop + 26);
  ctx.quadraticCurveTo(CX - 12, torsoTop + 72, CX + 98, torsoTop + 34);
  ctx.moveTo(CX - 76, torsoTop + 56);
  ctx.quadraticCurveTo(CX + 4, torsoTop + 86, CX + 82, torsoTop + 62);
  ctx.stroke();
  ctx.restore();

  // Inner hijab krem + Wajah lembut di dalam bingkai hijab
  const facePath = () => {
    ctx.beginPath();
    ctx.ellipse(CX + facing * 12, cy + 10, W * 0.44, H * 0.44, 0, 0, TAU);
  };
  ctx.fillStyle = hijabInner;
  ctx.beginPath();
  ctx.ellipse(CX + facing * 8, cy + 4, W * 0.47, H * 0.47, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.stroke();

  const skG = ctx.createLinearGradient(CX - 90, headTop + 10, CX + 95, chin);
  skG.addColorStop(0, skin);
  skG.addColorStop(0.6, skin);
  skG.addColorStop(1, skinShadow);
  ctx.save();
  facePath();
  ctx.fillStyle = skG;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  // --- Wajah + Kacamata tipis + bulu mata minimalis ---
  const shift = facing * W * 0.08;
  const ex = (s: number) => CX + shift + s * W * 0.145;
  const eyeY = cy + 12;
  const glassLift = mode === 'shock' ? -9 : 0;

  for (const s of [-1, 1]) {
    const x = ex(s);
    if (blink >= 0.85) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(x, eyeY + 4, 15, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    } else if (blink >= 0.25) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x - 16, eyeY);
      ctx.lineTo(x + 16, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY + 1, 12, 5, 0, 0, Math.PI);
      ctx.fill();
    } else if (mode === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, eyeY, 24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, eyeY, 6.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 11, 15.5, 0, 0, TAU);
      ctx.fill();
      // Ujung bulu mata halus di sudut luar
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + s * 9, eyeY - 10);
      ctx.lineTo(x + s * 16, eyeY - 14);
      ctx.stroke();
    }
  }

  // Kacamata bundar tipis krem-emas
  ctx.save();
  ctx.strokeStyle = '#c58f38';
  ctx.lineWidth = 5;
  const gr = 30;
  for (const s of [-1, 1]) {
    const x = ex(s);
    ctx.fillStyle = 'rgba(220, 245, 255, 0.16)';
    ctx.beginPath();
    ctx.arc(x, eyeY + glassLift, gr, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(ex(-1) + gr - 2, eyeY + glassLift);
  ctx.quadraticCurveTo(CX + shift, eyeY + glassLift - 5, ex(1) - gr + 2, eyeY + glassLift);
  ctx.stroke();
  ctx.restore();

  // Alis ramping ramah
  const by = eyeY - 40;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 12, 36, 9, -14, ink);
    brow(ctx, ex(1), by - 12, 36, 9, 14, ink);
  } else {
    brow(ctx, ex(-1), by - 2, 34, 9, -6, ink);
    brow(ctx, ex(1), by - 2, 34, 9, 6, ink);
  }

  drawDynamicMouth(ctx, CX + shift, cy + 66, mode, talk, ink, true);

  // Pin kecil di sisi hijab
  inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - 54, chin + 8, 7.5, 0, TAU); }, '#f5c43d', ink, 3, 1, 1.5);

  if (mode === 'shock') drawSweatDrop(ctx, CX + 96, cy - 32, ink);
  ctx.restore();
}

// =================================================================================================
// ID-3: BANG DIMAS — Jaket Coach Hijau-Krem + Topi Miring + Es Teh Plastik (Relatable / Komedi)
// =================================================================================================
function drawBangDimas(ctx: Ctx, pose: NusantaraPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.08 : 0.3);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#1c2038';
  const skin = '#e6b58c';
  const skinShadow = '#cfa096';
  const hair = '#2c2224';
  const jacket = '#249464';
  const jacketShade = '#19704c';
  const sleeve = '#f5ead3';
  const capFront = '#fff2d4';
  const pants = '#2c334d';
  const sneaker = '#fff8ee';

  const W = 278;
  const H = 240;
  const headTop = 212 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 12;
  const tw = 222;
  const th = 222;
  const hipY = torsoTop + th - 10;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki santai + sneakers hijau-putih ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 68;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 32 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 82 : 60) + stepX;
    const fy = NUSA_SOLE_Y - liftY;
    const hx = CX + sgn * 44;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 27;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - sgn * 6, (hipY + fy) / 2, fx, fy - 24);
    ctx.stroke();
    ctx.strokeStyle = pants;
    ctx.lineWidth = 16;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.roundRect(fx - 26 + sgn * 12, fy - 32, 62, 32, [15, 15, 9, 9]);
      },
      sneaker,
      ink,
      4.5,
      2.5,
      3.5,
    );
    ctx.fillStyle = jacket;
    ctx.fillRect(fx - 18 + sgn * 12, fy - 11, 48, 6);
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) lengan jaket krem ---
  const lsx = CX - tw * 0.44;
  const lsy = torsoTop + 56;
  let lhx = CX - 138;
  let lhy = torsoTop + 170;
  if (mode === 'walk') {
    lhx = CX - 132 - swing * 54;
    lhy = torsoTop + 166 - Math.abs(swing) * 18;
  } else if (mode === 'explain') {
    lhx = CX - 160;
    lhy = torsoTop + 126;
  } else if (mode === 'shock') {
    lhx = CX - 194;
    lhy = torsoTop - 18;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 - 18, (lsy + lhy) / 2 + 10, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 20;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 18, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso Jaket Coach / Varsity Lokal Hijau-Krem ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.4, torsoTop + 12);
    ctx.bezierCurveTo(CX - tw * 0.56, torsoTop + th * 0.3, CX - tw * 0.6, torsoTop + th * 0.86, CX - tw * 0.34, torsoTop + th);
    ctx.quadraticCurveTo(CX, torsoTop + th + 14, CX + tw * 0.34, torsoTop + th);
    ctx.bezierCurveTo(CX + tw * 0.6, torsoTop + th * 0.86, CX + tw * 0.56, torsoTop + th * 0.3, CX + tw * 0.4, torsoTop + 12);
    ctx.closePath();
  };
  const jg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  jg.addColorStop(0, jacket);
  jg.addColorStop(0.58, jacket);
  jg.addColorStop(1, jacketShade);
  inked(ctx, torsoPath, jg, ink, 5.5, 3.5, 5.5);

  ctx.save();
  torsoPath();
  ctx.clip();
  // Strip krem bagian bawah & kancing snap depan
  ctx.fillStyle = '#fff5df';
  ctx.fillRect(CX - tw, torsoTop + th - 16, tw * 2, 16);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX + 6, torsoTop + 12);
  ctx.lineTo(CX + 6, torsoTop + th);
  ctx.stroke();
  ctx.fillStyle = '#fff5df';
  for (const by of [torsoTop + 56, torsoTop + 102, torsoTop + 148, torsoTop + 190]) {
    ctx.beginPath();
    ctx.arc(CX + 6, by, 5.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // Emblem huruf "ID" kecil di dada kiri
  ctx.fillStyle = '#f2c144';
  ctx.beginPath();
  ctx.arc(CX - 48, torsoTop + 86, 17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- Lengan depan (kanan) + Es Teh Manis / Kopi Susu Sedotan di mode explain ---
  const rsx = CX + tw * 0.44;
  const rsy = torsoTop + 56;
  let rhx = CX + 142;
  let rhy = torsoTop + 170;
  if (mode === 'walk') {
    rhx = CX + 132 + swing * 54;
    rhy = torsoTop + 166 - Math.abs(swing) * 18;
  } else if (mode === 'explain') {
    rhx = CX + 178;
    rhy = torsoTop - 10;
  } else if (mode === 'shock') {
    rhx = CX + 194;
    rhy = torsoTop - 22;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + 18, (rsy + rhy) / 2 + 10, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 20;
  ctx.stroke();

  if (mode === 'explain') {
    // Gelas Es Teh Manis + Es Batu + Sedotan!
    ctx.save();
    ctx.translate(rhx + 12, rhy - 12);
    ctx.rotate(0.08);
    // Sedotan merah-putih
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(4, -52);
    ctx.lineTo(14, -92);
    ctx.stroke();
    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth = 5;
    ctx.stroke();
    // Gelas plastik
    const cupPath = () => {
      ctx.beginPath();
      ctx.moveTo(-24, -56);
      ctx.lineTo(26, -56);
      ctx.lineTo(19, 14);
      ctx.lineTo(-17, 14);
      ctx.closePath();
    };
    inked(ctx, cupPath, '#d97828', ink, 4.5, 2, 3);
    ctx.save();
    cupPath();
    ctx.clip();
    ctx.fillStyle = '#f2a444';
    ctx.fillRect(-26, -56, 54, 24);
    // 2 kotak es batu
    ctx.fillStyle = 'rgba(255,250,240,0.72)';
    ctx.fillRect(-14, -46, 14, 14);
    ctx.fillRect(4, -40, 13, 13);
    ctx.restore();
    // Tutup plastik
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-28, -62, 58, 10, 5); }, '#eef7ff', ink, 3.5, 1, 2);
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 18, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Kuping ---
  inked(ctx, () => { ctx.beginPath(); ctx.arc(CX - W * 0.49, cy + 16, 19, 0, TAU); }, skin, ink, 5, 2, 3);

  // --- Kepala Squircle-Oval Ramah ---
  const headPath = () => {
    ctx.beginPath();
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const n = s < 0 ? 2.85 : 3.05;
      let x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = (H / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s > 0) x *= 1 + 0.03 * s;
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
  inked(ctx, headPath, skG, ink, 5.5, 4, 5.5);

  // Rambut acak mengintip di samping & dahi
  ctx.save();
  headPath();
  ctx.clip();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(CX, headTop + 26, W * 0.56, 52, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  headPath();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5.5;
  ctx.stroke();

  // --- Wajah ---
  const shift = facing * W * 0.075;
  const ex = (s: number) => CX + shift + s * W * 0.155;
  const eyeY = cy + 18;

  for (const s of [-1, 1]) {
    const x = ex(s);
    if (blink >= 0.85) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 18, eyeY);
      ctx.lineTo(x + 18, eyeY);
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
      ctx.ellipse(x, eyeY + 1, 12, 6, 0, 0, Math.PI);
      ctx.fill();
    } else if (mode === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(x, eyeY, 30, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, eyeY, 7.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(x - 12, eyeY - 19, 24, 38, 12);
      ctx.fill();
    }
  }

  const by = eyeY - 46;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 38, 12, -16, ink);
    brow(ctx, ex(1), by - 14, 38, 12, 16, ink);
  } else {
    brow(ctx, ex(-1), by - 3, 36, 11, -7, ink);
    brow(ctx, ex(1), by + 2, 36, 11, 5, ink);
  }

  drawDynamicMouth(ctx, CX + shift, cy + 72, mode, talk, ink, false);

  // --- TOPI BASEBALL SANTAI HIJAU-KREM (loncat saat shock!) ---
  const capPop = mode === 'shock' ? -44 : 0;
  ctx.save();
  ctx.translate(CX, headTop + 34 + capPop);
  ctx.rotate(mode === 'shock' ? 0.14 : 0.04);
  // Lidah topi miring ke kiri-belakang (gaya anak nongkrong santai)
  const brimPath = () => {
    ctx.beginPath();
    ctx.moveTo(-128, 2);
    ctx.quadraticCurveTo(-206, 10, -196, 26);
    ctx.quadraticCurveTo(-150, 32, -104, 18);
    ctx.closePath();
  };
  inked(ctx, brimPath, jacketShade, ink, 5, 2.5, 3.5);

  const crownPath = () => {
    ctx.beginPath();
    ctx.moveTo(-142, 10);
    ctx.bezierCurveTo(-146, -64, -76, -86, 0, -84);
    ctx.bezierCurveTo(78, -86, 146, -62, 142, 10);
    ctx.quadraticCurveTo(0, 26, -142, 10);
    ctx.closePath();
  };
  inked(ctx, crownPath, jacket, ink, 5.5, 3.5, 4.5);

  // Panel depan topi warna krem + tombol puncak
  ctx.save();
  crownPath();
  ctx.clip();
  ctx.fillStyle = capFront;
  ctx.beginPath();
  ctx.ellipse(26, -24, 68, 72, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(0, -88, 12, 0, TAU); }, '#f2c144', ink, 4, 1.5, 2);
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 48, 142, ink);
  ctx.restore();
}

// =================================================================================================
// ID-4: SAKA NUSANTARA — Iket/Udeng Batik + Rompi Tenun Merah-Emas + Peta (Kisah Rakyat / Petualang)
// =================================================================================================
function drawSakaNusantara(ctx: Ctx, pose: NusantaraPose) {
  const { mode } = pose;
  const blink = pose.blink ?? 0;
  const talk = pose.talk ?? (mode === 'explain' ? 0.72 : 0);
  const facing = pose.facing ?? (mode === 'shock' ? 0.1 : 0.36);
  const { swing, bob, lean } = walkKinematics(pose);

  const ink = '#211526';
  const skin = '#e7b88e';
  const skinShadow = '#d1a29c';
  const hair = '#261a28';
  const iket = '#a32e35';
  const iketGold = '#f2c14e';
  const vest = '#c93f3b';
  const vestShade = '#98292b';
  const shirt = '#f7ecd6';
  const sash = '#27579a';
  const pants = '#2a2438';

  const W = 244;
  const H = 240;
  const headTop = 172 + bob;
  const cy = headTop + H / 2;
  const chin = headTop + H;
  const torsoTop = chin - 4;
  const tw = 202;
  const th = 234;
  const hipY = torsoTop + th - 14;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Kaki pangsi gelap + alas kaki petualang ---
  for (const side of [-1, 1]) {
    const sgn = side;
    const stepX = swing * sgn * 72;
    const liftY = mode === 'walk' ? Math.max(0, -swing * sgn) * 34 : 0;
    const fx = CX + sgn * (mode === 'shock' ? 82 : 58) + stepX;
    const fy = NUSA_SOLE_Y - liftY;
    const hx = CX + sgn * 36;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((hx + fx) / 2 - sgn * 8, (hipY + fy) / 2, fx, fy - 18);
    ctx.stroke();
    ctx.strokeStyle = pants;
    ctx.lineWidth = 17;
    ctx.stroke();

    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(fx - sgn * 14, fy - 20);
        ctx.quadraticCurveTo(fx + sgn * 22, fy - 22, fx + sgn * 42, fy - 4);
        ctx.lineTo(fx - sgn * 16, fy - 2);
        ctx.closePath();
      },
      '#6d4029',
      ink,
      4.5,
      2,
      3,
    );
  }

  ctx.translate(CX, hipY);
  ctx.rotate((lean * Math.PI) / 180);
  ctx.translate(-CX, -hipY);

  // --- Lengan belakang (kiri) baju gading ---
  const lsx = CX - tw * 0.46;
  const lsy = torsoTop + 48;
  let lhx = CX - 122;
  let lhy = torsoTop + 174;
  let lbend = -42;
  if (mode === 'walk') {
    lhx = CX - 124 - swing * 54;
    lhy = torsoTop + 170 - Math.abs(swing) * 18;
    lbend = -22;
  } else if (mode === 'explain') {
    lhx = CX - 154;
    lhy = torsoTop + 118;
    lbend = -34;
  } else if (mode === 'shock') {
    lhx = CX - 188;
    lhy = torsoTop - 48;
    lbend = -26;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(lsx, lsy);
  ctx.quadraticCurveTo((lsx + lhx) / 2 + lbend, (lsy + lhy) / 2, lhx, lhy);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 17;
  ctx.stroke();
  inked(ctx, () => { ctx.beginPath(); ctx.arc(lhx, lhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Torso: Rompi Tenun Nusantara Merah-Emas + Baju Gading + Sabuk Biru-Emas ---
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - tw * 0.46, torsoTop + 12);
    ctx.quadraticCurveTo(CX, torsoTop - 4, CX + tw * 0.46, torsoTop + 12);
    ctx.bezierCurveTo(CX + tw * 0.56, torsoTop + th * 0.45, CX + tw * 0.48, torsoTop + th * 0.92, CX + tw * 0.32, torsoTop + th);
    ctx.lineTo(CX - tw * 0.32, torsoTop + th);
    ctx.bezierCurveTo(CX - tw * 0.48, torsoTop + th * 0.92, CX - tw * 0.56, torsoTop + th * 0.45, CX - tw * 0.46, torsoTop + 12);
    ctx.closePath();
  };
  const vg = ctx.createLinearGradient(CX - tw * 0.5, torsoTop, CX + tw * 0.55, torsoTop + th);
  vg.addColorStop(0, vest);
  vg.addColorStop(0.6, vest);
  vg.addColorStop(1, vestShade);
  inked(ctx, torsoPath, vg, ink, 5.5, 4, 5.5);

  ctx.save();
  torsoPath();
  ctx.clip();
  // Baju gading V di tengah
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(CX - 34, torsoTop);
  ctx.lineTo(CX + 46, torsoTop);
  ctx.lineTo(CX + 12, torsoTop + 132);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Strip motif tenun geometris emas di pinggir rompi & bawah
  ctx.strokeStyle = iketGold;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(CX - 38, torsoTop + 6);
  ctx.lineTo(CX + 8, torsoTop + 140);
  ctx.lineTo(CX + 50, torsoTop + 6);
  ctx.stroke();

  // Sabuk kain tenun biru-emas di pinggang
  ctx.fillStyle = sash;
  ctx.fillRect(CX - tw, torsoTop + th - 54, tw * 2, 34);
  ctx.fillStyle = iketGold;
  ctx.fillRect(CX - tw, torsoTop + th - 50, tw * 2, 5);
  ctx.fillRect(CX - tw, torsoTop + th - 26, tw * 2, 5);
  ctx.restore();

  // --- Lengan depan (kanan) + Gulungan Peta / Lontar di mode explain ---
  const rsx = CX + tw * 0.46;
  const rsy = torsoTop + 48;
  let rhx = CX + 140;
  let rhy = torsoTop + 182;
  let rbend = 24;
  if (mode === 'walk') {
    rhx = CX + 124 + swing * 54;
    rhy = torsoTop + 170 - Math.abs(swing) * 18;
    rbend = 22;
  } else if (mode === 'explain') {
    rhx = CX + 182;
    rhy = torsoTop - 26;
    rbend = 34;
  } else if (mode === 'shock') {
    rhx = CX + 190;
    rhy = torsoTop - 48;
    rbend = 28;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(rsx, rsy);
  ctx.quadraticCurveTo((rsx + rhx) / 2 + rbend, (rsy + rhy) / 2, rhx, rhy);
  ctx.stroke();
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 17;
  ctx.stroke();

  if (mode === 'explain') {
    // Gulungan peta / lontar Nusantara dengan pita merah
    ctx.save();
    ctx.translate(rhx + 8, rhy - 12);
    ctx.rotate(0.45);
    inked(ctx, () => { ctx.beginPath(); ctx.roundRect(-14, -52, 28, 92, 10); }, '#f7e1b5', ink, 4.5, 2, 3);
    ctx.fillStyle = vest;
    ctx.fillRect(-14, -12, 28, 16);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-14, -12, 28, 16);
    ctx.restore();
  }
  inked(ctx, () => { ctx.beginPath(); ctx.arc(rhx, rhy, 16, 0, TAU); }, skin, ink, 4.5, 2, 3);

  // --- Telinga ---
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

  // --- Kepala Faceted Dinamis ---
  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.46, cy - 28);
    ctx.bezierCurveTo(CX - W * 0.48, headTop - 10, CX + W * 0.48, headTop - 10, CX + W * 0.48, cy - 24);
    ctx.bezierCurveTo(CX + W * 0.5, cy + 36, CX + W * 0.34, chin - 16, CX + facing * 22, chin);
    ctx.bezierCurveTo(CX - W * 0.28, chin - 12, CX - W * 0.46, cy + 40, CX - W * 0.46, cy - 28);
    ctx.closePath();
  };
  const skG = ctx.createLinearGradient(CX - W * 0.4, headTop, CX + W * 0.45, chin);
  skG.addColorStop(0, skin);
  skG.addColorStop(0.56, skin);
  skG.addColorStop(0.64, skinShadow);
  skG.addColorStop(1, skinShadow);
  inked(ctx, headPath, skG, ink, 5.5, 4, 5.5);

  // --- Mata bersklera putih melirik + alis komik tajam ---
  const shift = facing * W * 0.09;
  const ex = (s: number) => CX + shift + s * W * 0.145;
  const eyeY = cy + 12;
  const pupilShift = mode === 'explain' ? 7 : mode === 'shock' ? 0 : 5;

  for (const s of [-1, 1]) {
    const x = ex(s);
    if (blink >= 0.85) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 20, eyeY);
      ctx.lineTo(x + 20, eyeY);
      ctx.stroke();
    } else if (blink >= 0.25) {
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x - 20, eyeY - 1);
      ctx.lineTo(x + 20, eyeY - 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 14, 6, 0, 0, Math.PI);
      ctx.fill();
    } else {
      const rx = mode === 'shock' ? 26 : 21;
      const ry = mode === 'shock' ? 28 : 20;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(x, eyeY, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + pupilShift, eyeY + (mode === 'shock' ? 0 : 1), mode === 'shock' ? 6.5 : 8, 0, TAU);
      ctx.fill();

      if (mode !== 'shock') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, eyeY, rx + 2, ry + 2, 0, 0, TAU);
        ctx.clip();
        ctx.fillStyle = skin;
        const lidH = mode === 'idle' ? 13 : 8;
        ctx.fillRect(x - rx - 4, eyeY - ry - 4, (rx + 4) * 2, lidH + 4);
        ctx.restore();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(x - rx - 2, eyeY - ry + (mode === 'idle' ? 13 : 8));
        ctx.lineTo(x + rx + 2, eyeY - ry + (mode === 'idle' ? 13 : 8));
        ctx.stroke();
      }
    }
  }

  const by = eyeY - 36;
  if (mode === 'shock') {
    brow(ctx, ex(-1), by - 14, 42, 11, -18, ink);
    brow(ctx, ex(1), by - 14, 42, 11, 18, ink);
  } else {
    brow(ctx, ex(-1), by - 7, 42, 11, -12, ink);
    brow(ctx, ex(1), by + 2, 40, 11, 8, ink);
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(CX + shift + 5, eyeY + 18);
  ctx.lineTo(CX + shift + 14, eyeY + 30);
  ctx.lineTo(CX + shift + 3, eyeY + 34);
  ctx.stroke();

  drawDynamicMouth(ctx, CX + shift, cy + 70, mode, talk, ink, true);

  // --- Rambut gelap + IKET / UDENG BATIK NUSANTARA (simpul khas di atas dahi) ---
  const hairTop = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.48, cy - 16);
    ctx.quadraticCurveTo(CX - W * 0.54, headTop - 14, CX - W * 0.16, headTop - 44);
    ctx.lineTo(CX + W * 0.04, headTop - 62);
    ctx.lineTo(CX + W * 0.24, headTop - 36);
    ctx.quadraticCurveTo(CX + W * 0.56, headTop - 16, CX + W * 0.48, cy - 18);
    ctx.quadraticCurveTo(CX, headTop + 10, CX - W * 0.48, cy - 16);
    ctx.closePath();
  };
  inked(ctx, hairTop, hair, ink, 5, 3, 4);

  // Band Iket / Udeng batik merah-emas melilit dahi + sayap segitiga khas Nusantara
  const iketPop = mode === 'shock' ? -16 : 0;
  ctx.save();
  ctx.translate(0, iketPop);
  // Sayap puncak iket (kanan-atas)
  const wingPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX + 26, headTop + 8);
    ctx.lineTo(CX + 114, headTop - 52);
    ctx.lineTo(CX + 122, headTop + 16);
    ctx.closePath();
  };
  inked(ctx, wingPath, iket, ink, 5, 2.5, 3.5);

  const bandPath = () => {
    ctx.beginPath();
    ctx.moveTo(CX - W * 0.52, headTop + 44);
    ctx.quadraticCurveTo(CX, headTop + 14, CX + W * 0.52, headTop + 40);
    ctx.lineTo(CX + W * 0.5, headTop - 4);
    ctx.quadraticCurveTo(CX, headTop - 24, CX - W * 0.5, headTop);
    ctx.closePath();
  };
  inked(ctx, bandPath, iket, ink, 5.5, 3, 4.5);

  // Garis motif batik emas di pita iket
  ctx.save();
  bandPath();
  ctx.clip();
  ctx.strokeStyle = iketGold;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  for (let x = CX - 130; x <= CX + 130; x += 32) {
    ctx.moveTo(x, headTop - 16);
    ctx.lineTo(x + 16, headTop + 16);
    ctx.lineTo(x, headTop + 44);
  }
  ctx.stroke();
  ctx.restore();

  // Simpul iket di depan-tengah
  inked(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(CX + 4, headTop - 6, 36, 40, 12);
    },
    '#b8373d',
    ink,
    4.5,
    2,
    3,
  );
  ctx.restore();

  if (mode === 'shock') drawShockTicks(ctx, CX, headTop - 46, 138, ink);
  ctx.restore();
}

export function drawNusantara(id: NusantaraId, ctx: Ctx, pose: NusantaraPose) {
  ctx.clearRect(0, 0, NUSA_W, NUSA_H);
  if (id === 'ID1') drawMasArya(ctx, pose);
  else if (id === 'ID2') drawMbakRara(ctx, pose);
  else if (id === 'ID3') drawBangDimas(ctx, pose);
  else drawSakaNusantara(ctx, pose);
}
