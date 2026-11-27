import { Vec3, lerp, lerp3, smootherstep } from './easing';

export type CamPose = { pos: Vec3; look: Vec3; fov: number; roll: number };

export type CamPath = 'linear' | 'dolly' | 'whip' | 'orbit' | 'punch' | 'dive';

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
   * Cara interpolasi glide menuju key ini:
   * - `linear` (default): lerp pos/look/fov apa adanya.
   * - `dolly`: skala bingkai (jarak × tan(fov/2)) berubah geometris (log) untuk macro ↔ medium.
   * - `whip`: akselerasi cepat + damped spring settle 8–14f untuk reaksi komedi tajam.
   * - `orbit`: orbit melengkung C²-smooth analitis mengelilingi `orbitCenter` (default `next.pose.look`) hanya dengan 2 keyframe!
   * - `punch`: kurva simetris cepat + overshoot teredam lembut gaya punch-in referensi `(1).mp4`.
   * - `dive`: penurunan ketinggian eksponensial + skala dolly logaritmis untuk aerial crane dive.
   */
  path?: CamPath;
  /** Pusat orbit opsional untuk `path: 'orbit'` (default `next.pose.look`). */
  orbitCenter?: Vec3;
  /** Sudut putar orbit eksplisit dalam derajat (opsional, untuk orbit deterministik >= 180° / 360° tanpa membalik arah). */
  orbitDeltaDeg?: number;
  /**
   * Napas kamera organik lokal (`0` = mati/default, `1` = ±2,5 mm & ±0,07°).
   * Otomatis 0 pada shot makro (`dist < 0,85 m`) dan terkunci siklus `totalFrames` agar loop mulus.
   */
  handheld?: number;
};

export type KickMode = 'harmonic' | 'snap15hz' | 'trauma';
export type Kick = {
  frame: number;
  strength: number;
  length?: number;
  mode?: KickMode;
  fovPunch?: number;
};

export type CameraShake = {
  dx: number;
  dy: number;
  /** Offset Z dunia (diisi saat `kickOffset` menerima `pose` untuk getaran basis lokal kamera). */
  dz?: number;
  droll: number;
  /** Offset FOV opsional (derajat) untuk punch benturan skala besar gaya `(1).mp4`. */
  dfov?: number;
};

/**
 * Kecepatan push-in default per frame saat kamera menahan pose.
 * v2.0/v3.0 (Sinematika Referensi `contohvideo/`): `0` — hold dialog/panggung duduk mantap & percaya diri.
 * Untuk shot tensi gaya `contohvideo/(1).mp4` (median 0,14%/f di `motion.md`), gunakan `creepRate: REF_PUSH_CREEP`.
 */
export const DEFAULT_CREEP = 0;
export const REF_PUSH_CREEP = 0.0014;

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

/** Kurva whip-pan C∞-smooth: start & settle mulus (f'(0)=0, f'(1)=0), akselerasi cepat + overshoot teredam (~4%). */
function whipCurve(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const om = 1 - x;
  const base = 1 - om * om * om * om * (1 + 4 * x);
  const overshoot = 2.1 * x * x * x * om * om;
  return base + overshoot;
}

/** Kurva punch-in simetris cepat dengan sedikit settle lembut (~4,5% overshoot) gaya `(1).mp4`. */
function punchCurve(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const s = smootherstep(x);
  return s + 0.72 * x * x * (1 - x) * (1 - x);
}

/** Interpolasi `dive`: penurunan elevasi eksponensial + skala dolly logaritmis untuk aerial crane dive. */
const mixDive = (a: CamPose, b: CamPose, t: number): CamPose => {
  const dPos = mixDolly(a, b, t);
  const yCurve = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 1.65);
  return {
    ...dPos,
    pos: [dPos.pos[0], lerp(a.pos[1], b.pos[1], yCurve), dPos.pos[2]],
  };
};

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

/** Interpolasi `orbit` analitis C²-smooth: radius, elevasi, dan sudut azimuth (atau `orbitDeltaDeg` eksplisit) di sekitar `center`. */
const mixOrbit = (a: CamPose, b: CamPose, t: number, center?: Vec3, orbitDeltaDeg?: number): CamPose => {
  const c = center ?? b.look;
  const ax = Math.abs(a.pos[0] - c[0]) < 1e-12 ? 0 : a.pos[0] - c[0];
  const az = Math.abs(a.pos[2] - c[2]) < 1e-12 ? 0 : a.pos[2] - c[2];
  const bx = Math.abs(b.pos[0] - c[0]) < 1e-12 ? 0 : b.pos[0] - c[0];
  const bz = Math.abs(b.pos[2] - c[2]) < 1e-12 ? 0 : b.pos[2] - c[2];
  const ra = Math.hypot(ax, az);
  const rb = Math.hypot(bx, bz);
  const angA = Math.atan2(ax, az);
  let dAng: number;
  if (orbitDeltaDeg !== undefined) {
    dAng = (orbitDeltaDeg * Math.PI) / 180;
  } else {
    const angB = Math.atan2(bx, bz);
    dAng = angB - angA;
    while (dAng > Math.PI) dAng -= Math.PI * 2;
    while (dAng < -Math.PI) dAng += Math.PI * 2;
  }
  const ang = angA + dAng * t;
  const r = lerp(ra, rb, t);
  return {
    pos: [c[0] + Math.sin(ang) * r, lerp(a.pos[1], b.pos[1], t), c[2] + Math.cos(ang) * r],
    look: lerp3(a.look, b.look, t),
    fov: lerp(a.fov, b.fov, t),
    roll: lerp(a.roll, b.roll, t),
  };
};

/**
 * Napas kamera organik deterministik (Atelier v3.0): ±2,5 mm lokal right/up & ±0,07° roll.
 * - Mempertahankan siklus alami ~3 detik (`~90f`) sekaligus selalu mengunci jumlah siklus bulat penuh
 *   terhadap `totalFrames` sehingga loop 100% seamless pada durasi arbitrary.
 * - Otomatis nol pada shot makro (`dist < 0,85 m`) agar papan/nota 3D tetap tajam tanpa getar.
 */
export function applyHandheldBreathe(pose: CamPose, frame: number, amount = 0, totalFrames?: number): CamPose {
  if (amount <= 0) return pose;
  const d = Math.hypot(pose.pos[0] - pose.look[0], pose.pos[1] - pose.look[1], pose.pos[2] - pose.look[2]);
  if (d < 0.85) return pose;
  const macroFade = Math.min(1, (d - 0.85) / 0.5);
  const k = amount * macroFade;
  const period =
    totalFrames !== undefined && totalFrames >= 30
      ? totalFrames / Math.max(1, Math.round(totalFrames / 90))
      : 90;
  const w1 = (frame / period) * Math.PI * 2;
  const w2 = w1 * 2;
  const rOff = (Math.sin(w1) * 0.0022 + Math.sin(w2 + 0.7) * 0.0007) * k;
  const uOff = (Math.cos(w1 + 0.4) * 0.0018 + Math.sin(w2 - 0.5) * 0.0006) * k;
  const dRoll = Math.sin(w1 + 1.1) * 0.07 * k;
  const { right, up } = cameraBasis(pose);
  return {
    pos: [
      pose.pos[0] + right[0] * rOff + up[0] * uOff,
      pose.pos[1] + right[1] * rOff + up[1] * uOff,
      pose.pos[2] + right[2] * rOff + up[2] * uOff,
    ],
    look: pose.look,
    fov: pose.fov,
    roll: pose.roll + dRoll,
  };
}

/** Ambil pose kamera pada frame tertentu dari daftar key yang sudah terurut. */
export function sampleCamera(
  keys: CamKey[],
  frame: number,
  rate = DEFAULT_CREEP,
  opts?: { totalFrames?: number },
): CamPose {
  if (keys.length === 0) throw new Error('sampleCamera: keys kosong');
  let i = 0;
  for (let n = 0; n < keys.length; n++) if (keys[n].frame <= frame) i = n;
  const cur = keys[i];
  const next = keys[i + 1];
  const curRate = cur.creepRate ?? rate;

  let pose: CamPose;
  let hh = cur.handheld ?? 0;
  if (!next || next.cut) {
    pose = creep(cur.pose, frame - cur.frame, curRate);
  } else {
    // Glide tidak boleh mulai sebelum key saat ini tercapai, kalau tidak pose pertama terlewati.
    const glideStart = Math.max(next.frame - (next.glide ?? 24), cur.frame);
    const span = Math.max(1, next.frame - glideStart);
    const held = creep(cur.pose, Math.min(frame, glideStart) - cur.frame, curRate);
    if (frame < glideStart) {
      pose = held;
    } else {
      const u = (frame - glideStart) / span;
      const su = smootherstep(u);
      hh = lerp(cur.handheld ?? 0, next.handheld ?? 0, su);
      if (next.path === 'whip') {
        pose = mix(held, next.pose, whipCurve(u));
      } else if (next.path === 'punch') {
        pose = mixDolly(held, next.pose, punchCurve(u));
      } else if (next.path === 'dive') {
        pose = mixDive(held, next.pose, su);
      } else if (next.path === 'orbit') {
        pose = mixOrbit(held, next.pose, su, next.orbitCenter, next.orbitDeltaDeg);
      } else if (next.path === 'dolly') {
        pose = mixDolly(held, next.pose, su);
      } else {
        pose = mix(held, next.pose, su);
      }
    }
  }

  return hh > 0 ? applyHandheldBreathe(pose, frame, hh, opts?.totalFrames) : pose;
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

/**
 * Jarak fokus sepanjang sumbu pandang kamera (`camPos -> camLook`) menuju `target` (meter).
 * Kanonik untuk parameter `post.focus` pada thin-lens DOF `<PostStack />`.
 */
export function viewAxisFocus(camPos: Vec3, camLook: Vec3, target: Vec3): number {
  const lookVec = sub3(camLook, camPos);
  const lookDist = Math.hypot(lookVec[0], lookVec[1], lookVec[2]);
  if (lookDist < 1e-6) return 0.3;
  const fwd: Vec3 = [lookVec[0] / lookDist, lookVec[1] / lookDist, lookVec[2] / lookDist];
  const d = dot3(sub3(target, camPos), fwd);
  return Math.max(0.3, d > 0 ? d : lookDist);
}

/** Basis kamera dunia (forward, right, up) setelah roll. */
export function cameraBasis(p: CamPose): { forward: Vec3; right: Vec3; up: Vec3 } {
  const forward = norm3(sub3(p.look, p.pos));
  const refUp: Vec3 = Math.abs(forward[1]) > 0.999999 ? [0, 0, -1] : [0, 1, 0];
  const r0 = norm3(cross3(forward, refUp));
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
      if (q.depth <= 1e-3 || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return Infinity;
      const dx = ((q.x - x) * width) / 2;
      const dy = ((q.y - y) * height) / 2;
      max = Math.max(max, Math.hypot(dx, dy));
    }
  }
  return max;
}

/**
 * Entakan benturan (Atelier v3.0): **Damped Harmonic Shake** pada basis lokal kamera (`right`, `up`, `roll`).
 * - Jika `pose` disertakan, `dx/dy/dz` adalah vektor dunia yang sudah terproyeksi ke basis lokal kamera sehingga
 *   gebrakan meja/dinding tetap akurat di semua sudut `yaw` kamera.
 * - Jika `pose` diabaikan (backward-compatible), `dx`/`dy` adalah amplitudo lokal `right`/`up` dan `dz` = `undefined`.
 */
export function kickOffset(kicks: Kick[], frame: number, pose?: CamPose): CameraShake {
  let rightAmp = 0;
  let upAmp = 0;
  let droll = 0;
  let dfov = 0;
  for (const k of kicks) {
    const len = Math.max(1, k.length ?? 8);
    const d = frame - k.frame;
    if (d < 0 || d >= len) continue;
    const p = d / len;
    const mode = k.mode ?? 'harmonic';
    let oscR: number;
    let oscU: number;
    let env: number;
    if (mode === 'snap15hz') {
      // Pembalikan tanda tiap frame (15 Hz di 30fps) sesuai pengukuran motion.md pada benturan referensi (1).mp4!
      const alt = d % 2 === 0 ? 1 : -1;
      env = Math.exp(-2.8 * p) * (1 - p);
      oscR = alt;
      oscU = alt * 0.72;
    } else if (mode === 'trauma') {
      const alt = d % 2 === 0 ? 1 : -1;
      env = Math.exp(-2.1 * p) * (1 - p);
      oscR = alt * 0.78 + Math.sin(d * 3.1) * 0.35;
      oscU = alt * 0.65 + Math.cos(d * 2.7) * 0.4;
    } else {
      env = Math.exp(-3.2 * p) * (1 - p);
      oscR = Math.cos(d * 2.15);
      oscU = Math.cos(d * 1.85 + 0.3);
    }
    rightAmp += k.strength * env * oscR * 0.62;
    upAmp += -k.strength * env * oscU;
    droll += k.strength * env * oscR * (mode === 'snap15hz' ? 1.85 : 1.3);
    if (k.fovPunch) dfov += k.fovPunch * env;
  }
  if (pose) {
    const { right, up } = cameraBasis(pose);
    return {
      dx: right[0] * rightAmp + up[0] * upAmp,
      dy: right[1] * rightAmp + up[1] * upAmp,
      dz: right[2] * rightAmp + up[2] * upAmp,
      droll,
      ...(dfov !== 0 ? { dfov } : {}),
    };
  }
  return { dx: rightAmp, dy: upAmp, droll, ...(dfov !== 0 ? { dfov } : {}) };
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
  path: CamPath = 'linear',
): CamKey[] {
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: span, path, creepRate: 0 },
  ];
}

/**
 * Whip-Pan Reaksi Komedi (Atelier v3.0): akselerasi cepat + spring-damped settle (8–14 frame).
 */
export function whipPan(
  fromFrame: number,
  startPose: CamPose,
  endPose: CamPose,
  glideFrames = 11,
): CamKey[] {
  const span = Math.max(4, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: span, path: 'whip', creepRate: 0 },
  ];
}

/**
 * Story Dolly (Atelier v3.0): dolly/pan terarah mengikuti aksi cerita (mis. pan ke kertas diegetik
 * `(1).mp4` 00:02 atau dorongan lembut ke jendela `download.mp4` 00:47), selalu ditutup confident settle (`creepRate: 0`).
 */
export function storyDolly(
  fromFrame: number,
  startPose: CamPose,
  endPose: CamPose,
  glideFrames = 26,
  holdBeforeFrames = 0,
  path: 'dolly' | 'linear' = 'dolly',
): CamKey[] {
  const hold = Math.max(0, Math.round(holdBeforeFrames));
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: fromFrame + hold + span, pose: endPose, glide: span, path, creepRate: 0 },
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
 * Orbit Analitis C²-Smooth (Atelier v3.0): hanya 2 keyframe bersih tanpa membengkakkan array `CAMS`.
 */
export function orbitTo(
  fromFrame: number,
  startPose: CamPose,
  endPose: CamPose,
  glideFrames = 28,
  orbitCenter?: Vec3,
): CamKey[] {
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: span, path: 'orbit', orbitCenter, creepRate: 0 },
  ];
}

/**
 * Orbit Arc: geser orbit melengkung 3D mengelilingi `center` pada radius `radius` dan elevasi `y`
 * dari `azFromDeg` ke `azToDeg` (0° = +Z, +90° = +X), menonjolkan paralaks ruang lalu settle mantap.
 * (Tetap dipertahankan 100% kompatibel; secara internal kini memakai 2 keyframe `path: 'orbit'` analitis!)
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
  const r0 = (azFromDeg * Math.PI) / 180;
  const r1 = (azToDeg * Math.PI) / 180;
  const startPose: CamPose = {
    pos: [center[0] + Math.sin(r0) * radius, y, center[2] + Math.cos(r0) * radius],
    look: [center[0], center[1], center[2]],
    fov,
    roll: 0,
  };
  const endPose: CamPose = {
    pos: [center[0] + Math.sin(r1) * radius, y, center[2] + Math.cos(r1) * radius],
    look: [center[0], center[1], center[2]],
    fov,
    roll: 0,
  };
  // Selalu 2 keyframe tunggal dengan orbitDeltaDeg eksplisit -> 1 kurva C² mulus tanpa henti di midpoint maupun balik arah pada 180°/360°!
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    {
      frame: fromFrame + span,
      pose: endPose,
      glide: span,
      path: 'orbit',
      orbitCenter: center,
      orbitDeltaDeg: azToDeg - azFromDeg,
      creepRate: 0,
    },
  ];
}

/**
 * Top-Down Flat-Lay Insert (90° overhead) tepat di atas meja/prop 3D (khusus prop 3D murni, bukan karakter 2D!).
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
  path: CamPath = 'linear',
): CamKey[] {
  const span = Math.max(1, Math.round(frames));
  return [
    { frame: fromFrame, pose: highPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: lowPose, glide: span, path, creepRate: 0 },
  ];
}

/**
 * Punch-In Referensi (`(1).mp4` 00:02 nota, 00:08 kartu P-618, 00:19 stopwatch):
 * luncuran simetris cepat + settle lembut mendekat ke `targetLook` dengan faktor zoom `zoomFactor`.
 */
export function punchIn(
  fromFrame: number,
  basePose: CamPose,
  targetLook: Vec3 = basePose.look,
  zoomFactor = 1.45,
  glideFrames = 14,
  rollDeg = basePose.roll,
): CamKey[] {
  const span = Math.max(4, Math.round(glideFrames));
  const z = Math.max(1.05, zoomFactor);
  const dx = basePose.pos[0] - targetLook[0];
  const dy = basePose.pos[1] - targetLook[1];
  const dz = basePose.pos[2] - targetLook[2];
  const endPose: CamPose = {
    pos: [targetLook[0] + dx / z, targetLook[1] + dy / z, targetLook[2] + dz / z],
    look: targetLook,
    fov: basePose.fov,
    roll: rollDeg,
  };
  return [
    { frame: fromFrame, pose: basePose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: span, path: 'punch', creepRate: 0 },
  ];
}

/**
 * Aerial-to-Ground Crane Dive (`(1).mp4` 00:39-00:44): turunan eksponensial logaritmis mulus
 * dari establishing udara tinggi turun hingga level aksi di permukaan.
 */
export function craneDive(
  fromFrame: number,
  aerialPose: CamPose,
  groundPose: CamPose,
  glideFrames = 56,
): CamKey[] {
  const span = Math.max(8, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: aerialPose, cut: true, creepRate: 0 },
    { frame: fromFrame + span, pose: groundPose, glide: span, path: 'dive', creepRate: 0 },
  ];
}

/**
 * Portal / Frame-Through Push (`(1).mp4` 00:44 -> 00:47): dorongan logaritmis menembus
 * kusen pintu/jendela/monitor masuk ke ruang inti.
 */
export function portalPush(
  fromFrame: number,
  framePose: CamPose,
  interiorPose: CamPose,
  glideFrames = 26,
  holdBeforeFrames = 0,
): CamKey[] {
  const hold = Math.max(0, Math.round(holdBeforeFrames));
  const span = Math.max(1, Math.round(glideFrames));
  return [
    { frame: fromFrame, pose: framePose, cut: true, creepRate: 0 },
    { frame: fromFrame + hold + span, pose: interiorPose, glide: span, path: 'dolly', creepRate: 0 },
  ];
}

/**
 * Stepped Escalation (`(1).mp4` 00:47 -> 00:50): eskalasi berirama multi-tahap semakin dekat
 * untuk dialog hitungan mundur/tensi sebelum klimaks benturan.
 */
export function steppedEscalate(
  fromFrame: number,
  poses: readonly CamPose[],
  stepHold = 16,
  stepGlide = 8,
): CamKey[] {
  if (poses.length === 0) return [];
  const hold = Math.max(1, Math.round(stepHold));
  const glide = Math.max(1, Math.round(stepGlide));
  const out: CamKey[] = [{ frame: fromFrame, pose: poses[0], cut: true, creepRate: 0 }];
  let cursor = fromFrame;
  for (let i = 1; i < poses.length; i++) {
    cursor += hold + glide;
    out.push({ frame: cursor, pose: poses[i], glide, path: 'punch', creepRate: 0 });
  }
  return out;
}

/**
 * Swipe-Track (`(1).mp4` 00:00-00:02): pan/track bermotivasi mengikuti ayunan tangan/prop
 * dengan sedikit banking `rollDeg` di puncak gerak lalu kembali tegak saat settle.
 */
export function swipeTrack(
  fromFrame: number,
  startPose: CamPose,
  endPose: CamPose,
  rollDeg = 3.5,
  glideFrames = 22,
): CamKey[] {
  const span = Math.max(6, Math.round(glideFrames));
  const midFrame = fromFrame + Math.round(span * 0.45);
  const midPose: CamPose = {
    pos: lerp3(startPose.pos, endPose.pos, 0.45),
    look: lerp3(startPose.look, endPose.look, 0.45),
    fov: lerp(startPose.fov, endPose.fov, 0.45),
    roll: rollDeg,
  };
  return [
    { frame: fromFrame, pose: startPose, cut: true, creepRate: 0 },
    { frame: midFrame, pose: midPose, glide: midFrame - fromFrame, path: 'linear', creepRate: 0 },
    { frame: fromFrame + span, pose: endPose, glide: fromFrame + span - midFrame, path: 'linear', creepRate: 0 },
  ];
}
