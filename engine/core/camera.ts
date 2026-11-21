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
};

export type Kick = { frame: number; strength: number; length?: number };

/** Kecepatan push-in per frame saat kamera "menahan" pose. Tidak ada hold yang benar-benar diam. */
export const DEFAULT_CREEP = 0.0022;

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

/** Ambil pose kamera pada frame tertentu dari daftar key yang sudah terurut. */
export function sampleCamera(keys: CamKey[], frame: number, rate = DEFAULT_CREEP): CamPose {
  if (keys.length === 0) throw new Error('sampleCamera: keys kosong');
  let i = 0;
  for (let n = 0; n < keys.length; n++) if (keys[n].frame <= frame) i = n;
  const cur = keys[i];
  const next = keys[i + 1];
  if (!next || next.cut) return creep(cur.pose, frame - cur.frame, rate);

  // Glide tidak boleh mulai sebelum key saat ini tercapai, kalau tidak pose pertama terlewati.
  const glideStart = Math.max(next.frame - (next.glide ?? 24), cur.frame);
  const span = Math.max(1, next.frame - glideStart);
  const held = creep(cur.pose, Math.min(frame, glideStart) - cur.frame, rate);
  if (frame < glideStart) return held;
  return mix(held, next.pose, smootherstep((frame - glideStart) / span));
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
