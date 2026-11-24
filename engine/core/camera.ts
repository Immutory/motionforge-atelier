import { Vec3, lerp, lerp3, smootherstep } from './easing';

export type CamPose = { pos: Vec3; look: Vec3; fov: number; roll: number };

export type CamKey = {
  /** Frame saat pose ini sudah tercapai penuh. */
  frame: number;
  pose: CamPose;
  /** Lama glide menuju key ini (frame). Default 24. */
  glide?: number;
  /** true = potong keras ke pose ini tanpa glide. */
  cut?: boolean;
  /** Override kecepatan push-in per frame selama hold key ini; `0` membekukan push-in (mis. saat frame impact). */
  creepRate?: number;
  /**
   * Cara interpolasi glide menuju key ini. `linear` (default) = lerp pos/look/fov apa adanya.
   * `dolly` = pull-out/push-in dengan laju zoom seragam: arah pandang di-lerp lalu dinormalisasi,
   * jarak pos→look dan tan(fov/2) diinterpolasi geometris (log). Dipakai untuk rasio skala besar
   * (mis. macro → medium 6x) supaya kecepatan gambar tidak memuncak di awal glide.
   */
  path?: 'linear' | 'dolly';
};

export type Kick = { frame: number; strength: number; length?: number };

/**
 * Kecepatan push-in default per frame saat kamera menahan pose.
 * v2.0 (Sinematika Referensi `contohvideo/`): `0` — hold dialog/panggung duduk mantap & percaya diri.
 * Opsi `creepRate` per key atau argumen `rate` tetap didukung penuh bila sebuah beat secara sadar
 * membutuhkan slow tension push-in.
 */
export const DEFAULT_CREEP = 0;

const creep = (p: CamPose, framesIn: number, rate: number): CamPose => {
  const k = Math.min(Math.max(framesIn, 0) * rate, 0.35);
  return { ...p, pos: lerp3(p.pos, p.look, k) };
};

const mix = (a: CamPose, b: CamPose, t: number): CamPose => ({
  pos: lerp3(a.pos, b.pos, t),
  look: lerp3(a.look, b.look, t),
  fov: lerp(a.fov, b.fov, t),
  roll: lerp(a.roll, b.roll, t),
});

/** Interpolasi `dolly`: skala bingkai (jarak × tan(fov/2)) berubah dengan laju log seragam. */
const mixDolly = (a: CamPose, b: CamPose, t: number): CamPose => {
  const va: Vec3 = [a.pos[0] - a.look[0], a.pos[1] - a.look[1], a.pos[2] - a.look[2]];
  const vb: Vec3 = [b.pos[0] - b.look[0], b.pos[1] - b.look[1], b.pos[2] - b.look[2]];
  const da = Math.hypot(va[0], va[1], va[2]) || 1e-6;
  const db = Math.hypot(vb[0], vb[1], vb[2]) || 1e-6;
  const ta = Math.tan((a.fov * Math.PI) / 360);
  const tb = Math.tan((b.fov * Math.PI) / 360);
  const ha = da * ta;
  const hb = db * tb;
  const h = ha * Math.pow(hb / ha, t);
  // Titik look bergeser sebanding pertumbuhan bingkai -> pergeseran relatif-layar seragam (tidak meledak saat macro).
  const w = Math.abs(hb - ha) > 1e-6 * Math.max(ha, hb) ? (h - ha) / (hb - ha) : t;
  const look = lerp3(a.look, b.look, w);
  const dir = lerp3([va[0] / da, va[1] / da, va[2] / da], [vb[0] / db, vb[1] / db, vb[2] / db], w);
  const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1e-6;
  const d = da * Math.pow(db / da, t);
  const fov = (2 * Math.atan(ta * Math.pow(tb / ta, t)) * 180) / Math.PI;
  return {
    pos: [look[0] + (dir[0] / dl) * d, look[1] + (dir[1] / dl) * d, look[2] + (dir[2] / dl) * d],
    look,
    fov,
    roll: lerp(a.roll, b.roll, t),
  };
};

/** Ambil pose kamera pada frame tertentu dari daftar key yang sudah terurut. */
export function sampleCamera(keys: CamKey[], frame: number, rate = DEFAULT_CREEP): CamPose {
  if (keys.length === 0) throw new Error('sampleCamera: keys kosong');
  let i = 0;
  for (let n = 0; n < keys.length; n++) if (keys[n].frame <= frame) i = n;
  const cur = keys[i];
  const next = keys[i + 1];
  const curRate = cur.creepRate ?? rate;
  if (!next || next.cut) return creep(cur.pose, frame - cur.frame, curRate);

  // Glide tidak boleh mulai sebelum key saat ini tercapai, kalau tidak pose pertama terlewati.
  const glideStart = Math.max(next.frame - (next.glide ?? 24), cur.frame);
  const span = Math.max(1, next.frame - glideStart);
  const held = creep(cur.pose, Math.min(frame, glideStart) - cur.frame, curRate);
  if (frame < glideStart) return held;
  const t = smootherstep((frame - glideStart) / span);
  return next.path === 'dolly' ? mixDolly(held, next.pose, t) : mix(held, next.pose, t);
}

// ---------------------------------------------------------------------------------------------
// Geometri layar (dipakai tes framing & batas kecepatan glide). Sama dengan `CameraRig`:
// `camera.lookAt(look)` lalu `rotateZ(roll°)` di sumbu lokal kamera.
// ---------------------------------------------------------------------------------------------

/** Rasio aspek Short vertikal 9:16. */
export const ASPECT_9_16 = 9 / 16;

const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Basis kamera dunia (forward, right, up) setelah roll. */
export function cameraBasis(p: CamPose): { forward: Vec3; right: Vec3; up: Vec3 } {
  const forward = norm3(sub3(p.look, p.pos));
  const r0 = norm3(cross3(forward, [0, 1, 0]));
  const u0 = cross3(r0, forward);
  const a = (p.roll * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const right: Vec3 = [c * r0[0] + s * u0[0], c * r0[1] + s * u0[1], c * r0[2] + s * u0[2]];
  const up: Vec3 = [-s * r0[0] + c * u0[0], -s * r0[1] + c * u0[1], -s * r0[2] + c * u0[2]];
  return { forward, right, up };
}

/** Proyeksi titik dunia ke NDC (-1..1, y ke atas) + kedalaman sepanjang sumbu pandang (m). */
export function projectPoint(p: CamPose, pt: Vec3, aspect = ASPECT_9_16): { x: number; y: number; depth: number } {
  const { forward, right, up } = cameraBasis(p);
  const rel = sub3(pt, p.pos);
  const depth = dot3(rel, forward);
  const ty = Math.tan((p.fov * Math.PI) / 360);
  return { x: dot3(rel, right) / (depth * ty * aspect), y: dot3(rel, up) / (depth * ty), depth };
}

/** Titik dunia pada NDC (x, y) di kedalaman `depth` sepanjang sumbu pandang. */
export function unprojectPoint(p: CamPose, x: number, y: number, depth: number, aspect = ASPECT_9_16): Vec3 {
  const { forward, right, up } = cameraBasis(p);
  const ty = Math.tan((p.fov * Math.PI) / 360);
  const rx = x * depth * ty * aspect;
  const uy = y * depth * ty;
  return [0, 1, 2].map((i) => p.pos[i] + forward[i] * depth + right[i] * rx + up[i] * uy) as Vec3;
}

/**
 * Kecepatan gambar maksimum (px/frame) antara dua pose berurutan, diukur seperti `motion.md`:
 * 9 titik probe di bidang fokus (jarak pos→look) pada pose `a`, diproyeksikan ulang di pose `b`.
 * Default resolusi 720p vertikal (720 × 1280).
 */
export function screenSpeedPx(a: CamPose, b: CamPose, width = 720, height = 1280): number {
  const depth = Math.hypot(a.look[0] - a.pos[0], a.look[1] - a.pos[1], a.look[2] - a.pos[2]);
  const aspect = width / height;
  let max = 0;
  for (const x of [-0.6, 0, 0.6]) {
    for (const y of [-0.6, 0, 0.6]) {
      const w = unprojectPoint(a, x, y, depth, aspect);
      const q = projectPoint(b, w, aspect);
      const dx = ((q.x - x) * width) / 2;
      const dy = ((q.y - y) * height) / 2;
      max = Math.max(max, Math.hypot(dx, dy));
    }
  }
  return max;
}

/** Entakan benturan: tanda berganti tiap frame dan meluruh. */
export function kickOffset(kicks: Kick[], frame: number) {
  let dx = 0, dy = 0, droll = 0;
  for (const k of kicks) {
    const len = k.length ?? 7;
    const d = frame - k.frame;
    if (d < 0 || d >= len) continue;
    const decay = 1 - d / len;
    const sign = d % 2 === 0 ? 1 : -1;
    dx += sign * k.strength * decay * 0.6;
    dy += -sign * k.strength * decay;
    droll += sign * k.strength * decay * 1.2;
  }
  return { dx, dy, droll };
}

// ---------------------------------------------------------------------------------------------
// Preset & Helper Sinematika Referensi `contohvideo/` (Purposeful 3D Move -> Confident Settle)
// ---------------------------------------------------------------------------------------------

/**
 * Move -> Settle: meluncur mulus (`smootherstep`, biasanya 18-32f) dari `startPose` ke `endPose`
 * lalu berhenti mantap (`creepRate: 0`) tanpa slow zoom-in monoton.
 */
export function moveSettle(
  fromFrame: number,
  startPose: CamPose,
  endPose: CamPose,
  glideFrames = 24,
  path: 'linear' | 'dolly' = 'linear',
): CamKey[] {
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: span, path, creepRate: 0 },
  ];
}

/**
 * Pull-Out Reveal: buka di macro prop selama `holdMacroFrames`, lalu mundur logaritmis
 * (`path: 'dolly'`) membuka panggung utuh selama `glideFrames` dan settle mantap.
 */
export function pullOutReveal(
  fromFrame: number,
  holdMacroFrames: number,
  macroPose: CamPose,
  widePose: CamPose,
  glideFrames = 28,
): CamKey[] {
  const hold = Math.max(0, Math.round(holdMacroFrames));
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: macroPose, cut: true, creepRate: 0 },
    { frame: fromFrame + hold + span, pose: widePose, glide: span, path: 'dolly', creepRate: 0 },
  ];
}

/**
 * Orbit Arc: geser orbit melengkung 3D mengelilingi `center` pada radius `radius` dan elevasi `y`
 * dari `azFromDeg` ke `azToDeg` (0° = +Z, +90° = +X), menonjolkan paralaks ruang lalu settle mantap.
 */
export function orbitArc(
  fromFrame: number,
  center: Vec3,
  radius: number,
  azFromDeg: number,
  azToDeg: number,
  y: number,
  fov: number,
  frames: number,
): CamKey[] {
  const span = Math.max(1, Math.round(frames));
  const keys: CamKey[] = [];
  for (let k = 0; k <= span; k++) {
    const s = smootherstep(k / span);
    const rad = (lerp(azFromDeg, azToDeg, s) * Math.PI) / 180;
    const pose: CamPose = {
      pos: [center[0] + Math.sin(rad) * radius, y, center[2] + Math.cos(rad) * radius],
      look: [center[0], center[1], center[2]],
      fov,
      roll: 0,
    };
    keys.push(
      k === 0
        ? { frame: fromFrame, pose, cut: true, creepRate: 0 }
        : { frame: fromFrame + k, pose, glide: 1, creepRate: 0 },
    );
  }
  return keys;
}

/**
 * Top-Down Flat-Lay Insert (90° overhead) tepat di atas meja/prop.
 * Menggunakan offset Z mikro (+0,002 m) agar terbebas dari singularitas gimbal `lookAt`
 * sementara sumbu atas layar tetap lurus ke -Z secara deterministik.
 */
export function topDownInsert(center: Vec3, height: number, fov = 34, rollDeg = 0): CamPose {
  return {
    pos: [center[0], center[1] + Math.max(0.05, height), center[2] + 0.002],
    look: [center[0], center[1], center[2]],
    fov,
    roll: rollDeg,
  };
}

/**
 * Crane Transition: menukik mulus dari bird's-eye / aerial establishing (`highPose`) turun ke
 * level mata atau posisi awal horizontal tracking (`lowPose`), lalu settle mantap (`creepRate: 0`).
 */
export function craneTransition(
  fromFrame: number,
  highPose: CamPose,
  lowPose: CamPose,
  frames = 36,
  path: 'linear' | 'dolly' = 'linear',
): CamKey[] {
  const span = Math.max(1, Math.round(frames));
  return [
    { frame: fromFrame, pose: highPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: lowPose, glide: span, path, creepRate: 0 },
  ];
}
