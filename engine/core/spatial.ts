import type { Vec3 } from './easing';
import { ASPECT_9_16, cameraBasis, projectPoint, type CamPose } from './camera';

/** Kotak pembatas sumbu-sejajar (AABB) bernama dalam koordinat dunia Three.js (Y=up, meter). */
export type NamedBox = {
  name: string;
  /** Sudut minimum [minX, minY, minZ]. */
  min: Vec3;
  /** Sudut maksimum [maxX, maxY, maxZ]. */
  max: Vec3;
};

/** Helper membuat `NamedBox` dari titik pusat dan ukuran `[w, h, d]`. */
export function boxFromCenter(name: string, center: Vec3, size: Vec3): NamedBox {
  return {
    name,
    min: [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2],
    max: [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2],
  };
}

/** Helper membuat `NamedBox` dari titik alas `[x, bottomY, z]` dan ukuran `[w, h, d]`. */
export function boxFromFoot(name: string, foot: Vec3, width: number, height: number, depth: number): NamedBox {
  return {
    name,
    min: [foot[0] - width / 2, foot[1], foot[2] - depth / 2],
    max: [foot[0] + width / 2, foot[1] + height, foot[2] + depth / 2],
  };
}

export type PropOverlapViolation = {
  a: string;
  b: string;
  /** Jarak bersih antar-box (m). Negatif = saling menembus/irisan. */
  distance: number;
  minGap: number;
  penetrating: boolean;
  message: string;
};

export type PropOverlapResult = {
  ok: boolean;
  violations: PropOverlapViolation[];
};

/**
 * Deteksi prop/aset yang saling dempet (< `minGap`) atau menembus satu sama lain (3D AABB).
 * Dipakai untuk memastikan gelas, laptop, meja, atau prop GLB bawaan tidak pernah bertabrakan.
 */
export function checkPropOverlap(props: NamedBox[], minGap = 0.03): PropOverlapResult {
  const violations: PropOverlapViolation[] = [];
  for (let i = 0; i < props.length; i++) {
    const a = props[i];
    for (let j = i + 1; j < props.length; j++) {
      const b = props[j];
      const gx = Math.max(a.min[0] - b.max[0], b.min[0] - a.max[0]);
      const gy = Math.max(a.min[1] - b.max[1], b.min[1] - a.max[1]);
      const gz = Math.max(a.min[2] - b.max[2], b.min[2] - a.max[2]);
      const penetrating = gx < 0 && gy < 0 && gz < 0;
      const distance = penetrating
        ? Math.max(gx, gy, gz)
        : Math.hypot(Math.max(0, gx), Math.max(0, gy), Math.max(0, gz));
      if (distance < minGap - 1e-9) {
        violations.push({
          a: a.name,
          b: b.name,
          distance,
          minGap,
          penetrating,
          message: penetrating
            ? `${a.name} menembus ${b.name} (irisan ${(-distance).toFixed(3)} m)`
            : `${a.name} terlalu dempet dengan ${b.name} (jarak ${distance.toFixed(3)} m < ${minGap.toFixed(3)} m)`,
        });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

export type BillboardSweepCollision = {
  obstacle: string;
  /** Kedalaman sapuan masuk ke AABB + margin (m). */
  penetration: number;
  message: string;
};

export type BillboardSweepResult = {
  ok: boolean;
  /** Sudut rotasi yaw billboard menghadap kamera (derajat, 0 = menghadap +Z). */
  yawDeg: number;
  /** Dua ujung kiri & kanan bidang datar billboard pada elevasi `actorPos[1]`. */
  endpoints: [Vec3, Vec3];
  collisions: BillboardSweepCollision[];
};

/** Uji irisan segmen 2D `(x0,z0)->(x1,z1)` terhadap kotak XZ `[minX,maxX] × [minZ,maxZ]` (Liang-Barsky). */
function segmentIntersectsBoxXZ(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const checks: [number, number][] = [
    [-dx, x0 - minX],
    [dx, maxX - x0],
    [-dz, z0 - minZ],
    [dz, maxZ - z0],
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

/** Jarak minimum segmen 2D ke kotak XZ (0 bila beririsan). */
function segmentToBoxDistanceXZ(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): number {
  if (segmentIntersectsBoxXZ(x0, z0, x1, z1, minX, maxX, minZ, maxZ)) return 0;
  let best = Infinity;
  const samples = 16;
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const px = x0 + (x1 - x0) * t;
    const pz = z0 + (z1 - z0) * t;
    const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
    const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
    const d = Math.hypot(dx, dz);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Hitung proyeksi bidang datar `<ActorBillboard>` / `<CatBillboard>` setelah berputar `yaw`
 * menghadap `camPos`, lalu deteksi apakah ujung kiri/kanan bidang billboard menyapu masuk ke
 * bangku, meja, konter, dinding, atau tiang.
 */
export function checkBillboardSweep(
  actorPos: Vec3,
  actorWidth: number,
  actorHeight: number,
  camPos: Vec3,
  obstacles: NamedBox[],
  margin = 0.04,
): BillboardSweepResult {
  const dx = camPos[0] - actorPos[0];
  const dz = camPos[2] - actorPos[2];
  const len = Math.hypot(dx, dz);
  const fx = len > 1e-6 ? dx / len : 0;
  const fz = len > 1e-6 ? dz / len : 1;
  // Sumbu kanan horizontal bidang billboard tegak lurus arah pandang ke kamera.
  const rx = fz;
  const rz = -fx;
  const halfW = actorWidth / 2;

  const pLeft: Vec3 = [actorPos[0] - rx * halfW, actorPos[1], actorPos[2] - rz * halfW];
  const pRight: Vec3 = [actorPos[0] + rx * halfW, actorPos[1], actorPos[2] + rz * halfW];
  const yawDeg = (Math.atan2(fx, fz) * 180) / Math.PI;

  const yMin = actorPos[1];
  const yMax = actorPos[1] + actorHeight;
  const collisions: BillboardSweepCollision[] = [];

  for (const box of obstacles) {
    // Abaikan halangan yang sepenuhnya di atas kepala atau di bawah telapak kaki.
    if (yMax <= box.min[1] + 1e-4 || yMin >= box.max[1] - 1e-4) continue;
    const hitsExpanded = segmentIntersectsBoxXZ(
      pLeft[0],
      pLeft[2],
      pRight[0],
      pRight[2],
      box.min[0] - margin,
      box.max[0] + margin,
      box.min[2] - margin,
      box.max[2] + margin,
    );
    if (!hitsExpanded) continue;
    const rawDist = segmentToBoxDistanceXZ(
      pLeft[0],
      pLeft[2],
      pRight[0],
      pRight[2],
      box.min[0],
      box.max[0],
      box.min[2],
      box.max[2],
    );
    const penetration = Math.max(0, margin - rawDist);
    collisions.push({
      obstacle: box.name,
      penetration,
      message:
        rawDist === 0
          ? `Billboard (yaw ${yawDeg.toFixed(1)}°) menembus ${box.name}`
          : `Billboard (yaw ${yawDeg.toFixed(1)}°) terlalu dekat dengan ${box.name} (jarak ${rawDist.toFixed(3)} m < margin ${margin.toFixed(3)} m)`,
    });
  }

  return { ok: collisions.length === 0, yawDeg, endpoints: [pLeft, pRight], collisions };
}

export type CounterVisibilityResult = {
  ok: boolean;
  /** Ketinggian bahu/dada atas karakter (m). */
  shoulderY: number;
  /** Ketinggian puncak kepala karakter (m). */
  headTopY: number;
  /** Tinggi torso atas (bahu + dada + lengan) yang tampak di atas konter (m). */
  torsoAboveCounter: number;
  /** Tinggi total kepala + torso yang tampak di atas konter (m). */
  headTopAboveCounter: number;
  /** Ketinggian pijakan `actorPos[1]` minimum yang direkomendasikan agar lolos. */
  recommendedBaseY: number;
  message: string;
};

// Rasio vertikal kanvas Nusantara (`ACTOR_H = 1100`, `ACTOR_SOLE_Y = 1040`, `headTop = 192`, `torsoTop = 422`).
const HEAD_TOP_RATIO = (1040 - 192) / 1100;
const SHOULDER_RATIO = (1040 - 422) / 1100;

/**
 * Cegah bug "kepala terpenggal/tenggelam di balik konter": menjamin dada atas, bahu, & lengan
 * karakter terlihat jelas (`>= minUpperBodyVisible`, default `0.32 m`) di atas permukaan konter.
 */
export function checkCounterVisibility(
  actorPos: Vec3,
  actorHeight: number,
  counterTopY: number,
  minUpperBodyVisible = 0.32,
): CounterVisibilityResult {
  const shoulderY = actorPos[1] + actorHeight * SHOULDER_RATIO;
  const headTopY = actorPos[1] + actorHeight * HEAD_TOP_RATIO;
  const torsoAboveCounter = shoulderY - counterTopY;
  const headTopAboveCounter = headTopY - counterTopY;
  const recommendedBaseY = Math.max(0, counterTopY + minUpperBodyVisible - actorHeight * SHOULDER_RATIO);
  const ok = torsoAboveCounter >= minUpperBodyVisible - 1e-6;
  const message = ok
    ? `Visibilitas konter aman: bahu/dada ${torsoAboveCounter.toFixed(2)} m di atas konter (min ${minUpperBodyVisible.toFixed(2)} m).`
    : `Karakter tenggelam di balik konter: torso di atas konter hanya ${torsoAboveCounter.toFixed(2)} m < ${minUpperBodyVisible.toFixed(2)} m. Naikkan pijakan ke y >= ${recommendedBaseY.toFixed(2)} m.`;
  return { ok, shoulderY, headTopY, torsoAboveCounter, headTopAboveCounter, recommendedBaseY, message };
}

export type FramingSubject = {
  name: string;
  /** Titik pusat subjek/wajah/papan nama dalam koordinat dunia. */
  center: Vec3;
  /** Setengah lebar subjek (m) sepanjang sumbu kanan kamera. */
  halfW: number;
  /** Setengah tinggi subjek (m) sepanjang sumbu atas kamera. */
  halfH: number;
  /** Jika true, subjek tidak boleh masuk zona subtitle 9:16 (y layar ~76–88% -> NDC y ∈ [-0.76, -0.52]). */
  avoidSubtitle?: boolean;
};

export type FramingViolation = {
  subject: string;
  reason: 'behindCamera' | 'croppedX' | 'croppedY' | 'subtitleOverlap';
  maxAbsX: number;
  maxAbsY: number;
  message: string;
};

export type SafeFramingResult = {
  ok: boolean;
  violations: FramingViolation[];
};

/** Zona subtitle vertikal 9:16 standar studio (y layar 76%–88% dari atas -> NDC [-0.76, -0.52]). */
export const SUBTITLE_ZONE_NDC_9_16 = { minY: -0.76, maxY: -0.52 } as const;

/**
 * Verifikasi framing memakai `projectPoint()` dari `engine/core/camera.ts`:
 * menjamin 0 wajah/kepala/telinga/papan nama terpotong tepi layar dan opsional bersih dari zona subtitle 9:16.
 */
export function checkSafeFraming(
  camPose: CamPose,
  subjects: FramingSubject[],
  aspect = ASPECT_9_16,
  marginX = 0.88,
  marginY = 0.88,
): SafeFramingResult {
  const { right, up } = cameraBasis(camPose);
  const violations: FramingViolation[] = [];

  for (const s of subjects) {
    let behind = false;
    let maxAbsX = 0;
    let maxAbsY = 0;
    let minNdcY = Infinity;
    let maxNdcY = -Infinity;

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const corner: Vec3 = [
          s.center[0] + right[0] * sx * s.halfW + up[0] * sy * s.halfH,
          s.center[1] + right[1] * sx * s.halfW + up[1] * sy * s.halfH,
          s.center[2] + right[2] * sx * s.halfW + up[2] * sy * s.halfH,
        ];
        const p = projectPoint(camPose, corner, aspect);
        if (p.depth <= 0.05) {
          behind = true;
          continue;
        }
        maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
        maxAbsY = Math.max(maxAbsY, Math.abs(p.y));
        minNdcY = Math.min(minNdcY, p.y);
        maxNdcY = Math.max(maxNdcY, p.y);
      }
    }

    if (behind) {
      violations.push({
        subject: s.name,
        reason: 'behindCamera',
        maxAbsX,
        maxAbsY,
        message: `${s.name} berada di belakang/terlalu dekat dengan lensa kamera.`,
      });
      continue;
    }
    if (maxAbsX > marginX + 1e-6) {
      violations.push({
        subject: s.name,
        reason: 'croppedX',
        maxAbsX,
        maxAbsY,
        message: `${s.name} melewati batas aman horizontal (|x|=${maxAbsX.toFixed(2)} > ${marginX.toFixed(2)}).`,
      });
    }
    if (maxAbsY > marginY + 1e-6) {
      violations.push({
        subject: s.name,
        reason: 'croppedY',
        maxAbsX,
        maxAbsY,
        message: `${s.name} melewati batas aman vertikal (|y|=${maxAbsY.toFixed(2)} > ${marginY.toFixed(2)}).`,
      });
    }
    if (
      s.avoidSubtitle &&
      maxNdcY > SUBTITLE_ZONE_NDC_9_16.minY &&
      minNdcY < SUBTITLE_ZONE_NDC_9_16.maxY
    ) {
      violations.push({
        subject: s.name,
        reason: 'subtitleOverlap',
        maxAbsX,
        maxAbsY,
        message: `${s.name} masuk ke zona subtitle 9:16 (NDC y [${minNdcY.toFixed(2)}, ${maxNdcY.toFixed(2)}]).`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

export type SightlineHit = {
  name: string;
  /** Fraksi sepanjang segmen kamera -> target (0..1) tempat ray masuk ke AABB. */
  tEnter: number;
  /** Fraksi tempat ray keluar dari AABB. */
  tExit: number;
  hitPoint: Vec3;
};

export type SightlineResult = {
  ok: boolean;
  blockedBy: SightlineHit[];
  /** Daftar nama mesh yang disarankan dimasukkan ke `hideNames` di `GlbSet`. */
  suggestedHideNames: string[];
};

/**
 * Deteksi tiang, kabel, lampu, atau furnitur yang memotong garis pandang `camPos -> targetPos`.
 * Mengembalikan `suggestedHideNames` yang siap dimasukkan ke prop `hideNames` di `GlbSet`.
 */
export function checkSightline(camPos: Vec3, targetPos: Vec3, blockingBoxes: NamedBox[]): SightlineResult {
  const dir: Vec3 = [targetPos[0] - camPos[0], targetPos[1] - camPos[1], targetPos[2] - camPos[2]];
  const blockedBy: SightlineHit[] = [];

  for (const box of blockingBoxes) {
    let tMin = 0.01;
    let tMax = 0.99;
    let hit = true;
    for (let axis = 0; axis < 3; axis++) {
      const o = camPos[axis];
      const d = dir[axis];
      if (Math.abs(d) < 1e-12) {
        if (o < box.min[axis] || o > box.max[axis]) {
          hit = false;
          break;
        }
      } else {
        let t1 = (box.min[axis] - o) / d;
        let t2 = (box.max[axis] - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          hit = false;
          break;
        }
      }
    }
    if (hit) {
      const hitPoint: Vec3 = [
        camPos[0] + dir[0] * tMin,
        camPos[1] + dir[1] * tMin,
        camPos[2] + dir[2] * tMin,
      ];
      blockedBy.push({ name: box.name, tEnter: tMin, tExit: tMax, hitPoint });
    }
  }

  blockedBy.sort((a, b) => a.tEnter - b.tEnter);
  return {
    ok: blockedBy.length === 0,
    blockedBy,
    suggestedHideNames: blockedBy.map((b) => b.name),
  };
}
