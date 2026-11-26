import type { Vec3 } from './easing';
import { ASPECT_9_16, cameraBasis, projectPoint, type CamPose } from './camera';
import type { ActorPose, ArmPose, BodyBuild } from '../cast/nusantara';
import { actorHeadCenterY, seatCardPos } from '../cast/nusantara';
import type { HandProp } from '../cast/props2d';

/** Kotak pembatas sumbu-sejajar (AABB) bernama dalam koordinat dunia Three.js (Y=up, meter). */
export type NamedBox = {
  name: string;
  /** Sudut minimum [minX, minY, minZ]. */
  min: Vec3;
  /** Sudut maksimum [maxX, maxY, maxZ]. */
  max: Vec3;
  /** true jika seluruh material mesh di GLB bersifat transparan (`BLEND` / `alpha < 0.95`). */
  transparent?: boolean;
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
  /** Zona vertikal yang terdampak bila menggunakan profil bertingkat. */
  tier?: 'legs' | 'torso' | 'shoulders' | 'full';
  message: string;
};

export type BillboardSweepOptions = {
  /** Profil postur badan untuk lebar bertingkat (Atelier v3.0). */
  build?: BodyBuild;
  leftArm?: ArmPose;
  rightArm?: ArmPose;
  leftProp?: HandProp;
  rightProp?: HandProp;
  /** Sudut kemiringan X (*high-angle tiltX* dalam radian, berporos `y = 0`). */
  tiltX?: number;
  /** Aktifkan profil lebar bertingkat kaki/pinggul/bahu+prop (otomatis aktif jika `build`/`leftArm`/`rightArm` diisi). */
  tiered?: boolean;
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

/** Jarak titik 2D `(px,pz)` ke kotak XZ. */
function pointToBoxDistanceXZ(px: number, pz: number, minX: number, maxX: number, minZ: number, maxZ: number): number {
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
  const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
  return Math.hypot(dx, dz);
}

/** Jarak titik 2D `(px,pz)` ke segmen `(x0,z0)->(x1,z1)`. */
function pointToSegmentDistanceXZ(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
  const sx = x1 - x0;
  const sz = z1 - z0;
  const lenSq = sx * sx + sz * sz;
  if (lenSq <= 1e-12) return Math.hypot(px - x0, pz - z0);
  const t = Math.max(0, Math.min(1, ((px - x0) * sx + (pz - z0) * sz) / lenSq));
  return Math.hypot(px - (x0 + sx * t), pz - (z0 + sz * t));
}

/** Jarak minimum analitis eksak segmen 2D ke kotak XZ (0 bila beririsan). */
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
  return Math.min(
    pointToBoxDistanceXZ(x0, z0, minX, maxX, minZ, maxZ),
    pointToBoxDistanceXZ(x1, z1, minX, maxX, minZ, maxZ),
    pointToSegmentDistanceXZ(minX, minZ, x0, z0, x1, z1),
    pointToSegmentDistanceXZ(maxX, minZ, x0, z0, x1, z1),
    pointToSegmentDistanceXZ(minX, maxZ, x0, z0, x1, z1),
    pointToSegmentDistanceXZ(maxX, maxZ, x0, z0, x1, z1),
  );
}

function armOutFactor(arm?: ArmPose, prop?: HandProp): number {
  let k = 1.0;
  if (arm === 'point' || arm === 'wave') k = 1.18;
  else if (arm === 'raise') k = 1.12;
  else if (arm === 'hold') k = 1.08;
  if (prop && prop !== 'none') k = Math.max(k, 1.15);
  return k;
}

/**
 * Hitung proyeksi bidang datar `<ActorBillboard>` / `<CatBillboard>` setelah berputar `yaw`
 * menghadap `camPos` (plus opsional profil lebar bertingkat & bidang miring 3D `tiltX` di Atelier v3.0),
 * lalu deteksi apakah ujung kiri/kanan bidang billboard menyapu masuk ke bangku, meja, konter, dinding, atau tiang.
 */
export function checkBillboardSweep(
  actorPos: Vec3,
  actorWidth: number,
  actorHeight: number,
  camPos: Vec3,
  obstacles: NamedBox[],
  margin = 0.04,
  opts?: BillboardSweepOptions,
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

  const tiltX = opts?.tiltX ?? 0;
  const useTiered = Boolean(opts?.tiered || opts?.build || opts?.leftArm || opts?.rightArm || opts?.leftProp || opts?.rightProp);
  const buildMul = opts?.build === 'big' ? 1.16 : opts?.build === 'slim' ? 0.9 : 1.0;
  const shoulderMul = Math.max(armOutFactor(opts?.leftArm, opts?.leftProp), armOutFactor(opts?.rightArm, opts?.rightProp));

  type Tier = { name: 'legs' | 'torso' | 'shoulders' | 'full'; y0: number; y1: number; wFrac: number };
  const tiers: Tier[] = useTiered
    ? [
        { name: 'legs', y0: 0, y1: actorHeight * 0.4, wFrac: 0.62 * buildMul },
        { name: 'torso', y0: actorHeight * 0.4, y1: actorHeight * 0.68, wFrac: 0.82 * buildMul },
        { name: 'shoulders', y0: actorHeight * 0.68, y1: actorHeight, wFrac: Math.min(1.3, buildMul * shoulderMul) },
      ]
    : [{ name: 'full', y0: 0, y1: actorHeight, wFrac: 1 }];

  const collisions: BillboardSweepCollision[] = [];
  const cosT = Math.cos(tiltX);
  const sinT = Math.sin(tiltX);

  for (const box of obstacles) {
    let worstPen = 0;
    let worstRawDist = Infinity;
    let worstTier: Tier['name'] = 'full';

    for (const tier of tiers) {
      const worldY0 = actorPos[1] + tier.y0 * cosT;
      const worldY1 = actorPos[1] + tier.y1 * cosT;
      const tyMin = Math.min(worldY0, worldY1);
      const tyMax = Math.max(worldY0, worldY1);
      if (tyMax <= box.min[1] + 1e-4 || tyMin >= box.max[1] - 1e-4) continue;

      const tHalfW = halfW * tier.wFrac;
      const ovMin = Math.max(tyMin, box.min[1]);
      const ovMax = Math.min(tyMax, box.max[1]);

      if (Math.abs(tiltX) <= 1e-4) {
        const x0 = actorPos[0] - rx * tHalfW;
        const z0 = actorPos[2] - rz * tHalfW;
        const x1 = actorPos[0] + rx * tHalfW;
        const z1 = actorPos[2] + rz * tHalfW;
        const hitsExpanded = segmentIntersectsBoxXZ(
          x0,
          z0,
          x1,
          z1,
          box.min[0] - margin,
          box.max[0] + margin,
          box.min[2] - margin,
          box.max[2] + margin,
        );
        if (!hitsExpanded) continue;
        const rawDist = segmentToBoxDistanceXZ(x0, z0, x1, z1, box.min[0], box.max[0], box.min[2], box.max[2]);
        const pen = margin - rawDist;
        if (pen > worstPen) {
          worstPen = pen;
          worstRawDist = rawDist;
          worstTier = tier.name;
        }
      } else {
        // Eksak O(1) tanpa blind spot: proyeksi XZ dari quad miring 3D di [ovMin, ovMax] adalah OBB 2D
        // berorientasi basis ortonormal (right, forward) dengan setengah lebar tHalfW dan setengah kedalaman halfD.
        const invCos = Math.abs(cosT) > 1e-4 ? 1 / cosT : 1;
        const sf0 = (ovMin - actorPos[1]) * invCos * sinT;
        const sf1 = (ovMax - actorPos[1]) * invCos * sinT;
        const midSf = (sf0 + sf1) * 0.5;
        const halfD = Math.abs(sf1 - sf0) * 0.5;
        const obbCx = actorPos[0] + fx * midSf;
        const obbCz = actorPos[2] + fz * midSf;
        const boxCx = (box.min[0] + box.max[0]) * 0.5;
        const boxCz = (box.min[2] + box.max[2]) * 0.5;
        const boxHx = (box.max[0] - box.min[0]) * 0.5;
        const boxHz = (box.max[2] - box.min[2]) * 0.5;
        const dx = boxCx - obbCx;
        const dz = boxCz - obbCz;

        // Uji SAT 4 sumbu (X dunia, Z dunia, right OBB, forward OBB) terhadap kotak diperluas `margin`.
        const obbProjX = Math.abs(rx) * tHalfW + Math.abs(fx) * halfD;
        const obbProjZ = Math.abs(rz) * tHalfW + Math.abs(fz) * halfD;
        const sepX = Math.abs(dx) - (boxHx + obbProjX);
        const sepZ = Math.abs(dz) - (boxHz + obbProjZ);
        const sepR = Math.abs(dx * rx + dz * rz) - (tHalfW + boxHx * Math.abs(rx) + boxHz * Math.abs(rz));
        const sepF = Math.abs(dx * fx + dz * fz) - (halfD + boxHx * Math.abs(fx) + boxHz * Math.abs(fz));
        const maxSep = Math.max(sepX, sepZ, sepR, sepF);
        if (maxSep >= margin) continue;

        let rawDist: number;
        if (maxSep <= 0) {
          rawDist = 0;
        } else {
          // Jarak eksak antara 4 tepi OBB dan AABB (sekaligus titik sudut dalam kotak sudah tertangani maxSep <= 0)
          const c0x = obbCx - rx * tHalfW - fx * halfD;
          const c0z = obbCz - rz * tHalfW - fz * halfD;
          const c1x = obbCx + rx * tHalfW - fx * halfD;
          const c1z = obbCz + rz * tHalfW - fz * halfD;
          const c2x = obbCx + rx * tHalfW + fx * halfD;
          const c2z = obbCz + rz * tHalfW + fz * halfD;
          const c3x = obbCx - rx * tHalfW + fx * halfD;
          const c3z = obbCz - rz * tHalfW + fz * halfD;
          rawDist = Math.min(
            segmentToBoxDistanceXZ(c0x, c0z, c1x, c1z, box.min[0], box.max[0], box.min[2], box.max[2]),
            segmentToBoxDistanceXZ(c1x, c1z, c2x, c2z, box.min[0], box.max[0], box.min[2], box.max[2]),
            segmentToBoxDistanceXZ(c2x, c2z, c3x, c3z, box.min[0], box.max[0], box.min[2], box.max[2]),
            segmentToBoxDistanceXZ(c3x, c3z, c0x, c0z, box.min[0], box.max[0], box.min[2], box.max[2]),
          );
        }
        const pen = margin - rawDist;
        if (pen > worstPen) {
          worstPen = pen;
          worstRawDist = rawDist;
          worstTier = tier.name;
        }
      }
    }

    if (worstPen > 1e-9) {
      collisions.push({
        obstacle: box.name,
        penetration: worstPen,
        tier: useTiered ? worstTier : undefined,
        message:
          worstRawDist === 0
            ? `Billboard (yaw ${yawDeg.toFixed(1)}°) menembus ${box.name}${useTiered ? ` [tier: ${worstTier}]` : ''}`
            : `Billboard (yaw ${yawDeg.toFixed(1)}°) terlalu dekat dengan ${box.name} (jarak ${worstRawDist.toFixed(3)} m < margin ${margin.toFixed(3)} m)`,
      });
    }
  }

  return { ok: collisions.length === 0, yawDeg, endpoints: [pLeft, pRight], collisions };
}

export type CounterVisibilityResult = {
  ok: boolean;
  /** Ketinggian bahu/dada atas karakter (m). */
  shoulderY: number;
  /** Ketinggian puncak kepala karakter (m). */
  headTopY: number;
  /** Ketinggian bibir konter terproyeksi ke bidang aktor dari elevasi kamera aktif (m). */
  effectiveCounterY: number;
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
 * Atelier v3.0: bila `camPos` & `counterFrontZ` diberikan, menghitung proyeksi perspektif bibir konter
 * dari elevasi kamera (menangkap kamera rendah yang secara optik memenggal bahu penjual!).
 */
export function checkCounterVisibility(
  actorPos: Vec3,
  actorHeight: number,
  counterTopY: number,
  minUpperBodyVisible = 0.32,
  camPos?: Vec3,
  counterFrontZ?: number,
): CounterVisibilityResult {
  const shoulderY = actorPos[1] + actorHeight * SHOULDER_RATIO;
  const headTopY = actorPos[1] + actorHeight * HEAD_TOP_RATIO;

  let effectiveCounterY = counterTopY;
  if (camPos && counterFrontZ !== undefined) {
    const dLip = counterFrontZ - camPos[2];
    const dActor = actorPos[2] - camPos[2];
    if (dLip * dActor <= 0 || Math.abs(dActor) <= Math.abs(dLip)) {
      // Kamera di sisi yang sama dengan aktor (atau di belakang konter) -> konter tidak menghalangi aktor sama sekali.
      effectiveCounterY = actorPos[1];
    } else if (Math.abs(dLip) <= 1e-4) {
      effectiveCounterY = camPos[1] < counterTopY ? 1e6 : counterTopY;
    } else {
      const projectedY = camPos[1] + ((counterTopY - camPos[1]) * dActor) / dLip;
      effectiveCounterY = Math.max(counterTopY, projectedY);
    }
  }

  const torsoAboveCounter = shoulderY - effectiveCounterY;
  const headTopAboveCounter = headTopY - effectiveCounterY;
  const recommendedBaseY = Math.max(0, effectiveCounterY + minUpperBodyVisible - actorHeight * SHOULDER_RATIO);
  const ok = torsoAboveCounter >= minUpperBodyVisible - 1e-6;
  const message = ok
    ? `Visibilitas konter aman: bahu/dada ${torsoAboveCounter.toFixed(2)} m di atas konter (min ${minUpperBodyVisible.toFixed(2)} m).`
    : `Karakter tenggelam di balik konter: torso di atas konter hanya ${torsoAboveCounter.toFixed(2)} m < ${minUpperBodyVisible.toFixed(2)} m (efektif konter ${effectiveCounterY.toFixed(2)} m). Naikkan pijakan ke y >= ${recommendedBaseY.toFixed(2)} m.`;
  return { ok, shoulderY, headTopY, effectiveCounterY, torsoAboveCounter, headTopAboveCounter, recommendedBaseY, message };
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

export type ActorFramingInput = {
  name: string;
  position: Vec3;
  height?: number;
  pose?: Partial<Pick<ActorPose, 'stance' | 'sitHeight' | 'actorHeight'>>;
  seatRadius?: number;
  avoidSubtitle?: boolean;
};

/**
 * Helper v3.0 untuk membentuk `FramingSubject[]` wajah/kepala aktor secara otomatis
 * (sinkron 100% dengan `actorHeadCenterY` di `nusantara.ts` untuk `sit`, `sitHeight`, `sitCross`, `squat`, `jump`, & `seatRadius`).
 */
export function actorFramingSubjects(actors: ActorFramingInput[], camPos?: Vec3): FramingSubject[] {
  return actors.map((a) => {
    const h = a.height ?? 1.96;
    const base = a.seatRadius && camPos ? seatCardPos(a.position, a.seatRadius, camPos) : a.position;
    const poseForHead: Partial<ActorPose> | undefined =
      a.pose && a.pose.sitHeight !== undefined && a.pose.actorHeight === undefined && (a.seatRadius ?? 0) > 0
        ? { ...a.pose, actorHeight: h }
        : a.pose;
    const headCenterY = base[1] + actorHeadCenterY(h, poseForHead);
    return {
      name: a.name,
      center: [base[0], headCenterY, base[2]],
      halfW: h * 0.15,
      halfH: h * 0.14,
      avoidSubtitle: a.avoidSubtitle ?? true,
    };
  });
}

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
/** Zona subtitle lanskap 16:9 standar studio (y layar 87%–97% dari atas -> NDC [-0.94, -0.74]). */
export const SUBTITLE_ZONE_NDC_16_9 = { minY: -0.94, maxY: -0.74 } as const;

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
    const subZone = aspect < 1 ? SUBTITLE_ZONE_NDC_9_16 : SUBTITLE_ZONE_NDC_16_9;
    if (s.avoidSubtitle && maxNdcY > subZone.minY && minNdcY < subZone.maxY) {
      violations.push({
        subject: s.name,
        reason: 'subtitleOverlap',
        maxAbsX,
        maxAbsY,
        message: `${s.name} masuk ke zona subtitle ${aspect < 1 ? '9:16' : '16:9'} (NDC y [${minNdcY.toFixed(2)}, ${maxNdcY.toFixed(2)}]).`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

export type ScreenOcclusionHit = {
  occluder: string;
  overlapRatio: number;
  message: string;
};

export type ScreenOcclusionResult = {
  ok: boolean;
  hits: ScreenOcclusionHit[];
};

function projectSubjectRect(
  camPose: CamPose,
  s: FramingSubject,
  aspect: number,
  clampNearLens = false,
): { minX: number; maxX: number; minY: number; maxY: number; depth: number } | null {
  const { forward, right, up } = cameraBasis(camPose);
  const relC: Vec3 = [s.center[0] - camPose.pos[0], s.center[1] - camPose.pos[1], s.center[2] - camPose.pos[2]];
  const centerDepth = relC[0] * forward[0] + relC[1] * forward[1] + relC[2] * forward[2];
  if (centerDepth <= 0) return null;
  if (!clampNearLens && centerDepth <= 0.05) return null;
  const effDepth = Math.max(0.05, centerDepth);
  const ty = Math.tan((camPose.fov * Math.PI) / 360);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const rx = relC[0] + right[0] * sx * s.halfW + up[0] * sy * s.halfH;
      const ry = relC[1] + right[1] * sx * s.halfW + up[1] * sy * s.halfH;
      const rz = relC[2] + right[2] * sx * s.halfW + up[2] * sy * s.halfH;
      const d = rx * forward[0] + ry * forward[1] + rz * forward[2];
      if (!clampNearLens && d <= 0.05) return null;
      const cd = Math.max(0.05, d);
      const px = (rx * right[0] + ry * right[1] + rz * right[2]) / (cd * ty * aspect);
      const py = (rx * up[0] + ry * up[1] + rz * up[2]) / (cd * ty);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  return { minX, maxX, minY, maxY, depth: effDepth };
}

/**
 * Audit oklusi layar 2,5D (Atelier v3.0): mendeteksi bila prop atau karakter yang lebih dekat ke kamera
 * menutupi wajah pembicara (`target`) melebihi `maxOverlapRatio` (default `0.20` = 20% luas wajah) pada framing 9:16.
 */
export function checkScreenOcclusion(
  camPose: CamPose,
  target: FramingSubject,
  occluders: FramingSubject[],
  aspect = ASPECT_9_16,
  maxOverlapRatio = 0.2,
): ScreenOcclusionResult {
  const tr = projectSubjectRect(camPose, target, aspect);
  if (!tr) return { ok: true, hits: [] };
  const targetArea = Math.max(1e-6, (tr.maxX - tr.minX) * (tr.maxY - tr.minY));
  const hits: ScreenOcclusionHit[] = [];

  for (const occ of occluders) {
    if (occ.name === target.name) continue;
    const or = projectSubjectRect(camPose, occ, aspect, true);
    if (!or || or.depth >= tr.depth - 0.05) continue;
    const ix = Math.max(0, Math.min(tr.maxX, or.maxX) - Math.max(tr.minX, or.minX));
    const iy = Math.max(0, Math.min(tr.maxY, or.maxY) - Math.max(tr.minY, or.minY));
    const overlapRatio = (ix * iy) / targetArea;
    if (overlapRatio > maxOverlapRatio + 1e-6) {
      hits.push({
        occluder: occ.name,
        overlapRatio,
        message: `${occ.name} (di depan kamera) menutupi ${(overlapRatio * 100).toFixed(1)}% wajah ${target.name} (> ${(maxOverlapRatio * 100).toFixed(0)}%).`,
      });
    }
  }
  return { ok: hits.length === 0, hits };
}

export type SightlineHit = {
  name: string;
  /** Fraksi sepanjang segmen kamera -> target (0..1) tempat ray masuk ke AABB. */
  tEnter: number;
  /** Fraksi tempat ray keluar dari AABB. */
  tExit: number;
  hitPoint: Vec3;
};

export type SightlineOptions = {
  /** Radius kerucut wajah/prop (m). Bila > 0, menembakkan 5-ray face cone (pusat + 4 tepi). */
  targetRadius?: number;
  /** Abaikan otomatis mesh kaca transparan (`/glass/i`). Default `true`. */
  ignoreGlass?: boolean;
};

export type SightlineResult = {
  ok: boolean;
  blockedBy: SightlineHit[];
  /** Daftar nama mesh yang disarankan dimasukkan ke `hideNames` di `GlbSet`. */
  suggestedHideNames: string[];
};

function intersectRayBox(origin: Vec3, dir: Vec3, box: NamedBox): { tEnter: number; tExit: number } | null {
  const rayLen = Math.hypot(dir[0], dir[1], dir[2]);
  const epsT = Math.min(0.01, 0.02 / Math.max(rayLen, 1e-3));
  let tMin = epsT;
  let tMax = 1 - epsT;
  for (let axis = 0; axis < 3; axis++) {
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-12) {
      if (o < box.min[axis] || o > box.max[axis]) return null;
    } else {
      let t1 = (box.min[axis] - o) / d;
      let t2 = (box.max[axis] - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return { tEnter: tMin, tExit: tMax };
}

/**
 * Deteksi tiang, kabel, lampu, atau furnitur yang memotong garis pandang `camPos -> targetPos`.
 * Atelier v3.0: mendukung opsi `targetRadius` (*5-ray face cone* pusat + 4 tepi wajah/prop) dan
 * filter otomatis kaca transparan (`ignoreGlass`, default `true`).
 */
export function checkSightline(
  camPos: Vec3,
  targetPos: Vec3,
  blockingBoxes: NamedBox[],
  opts?: SightlineOptions,
): SightlineResult {
  const ignoreGlass = opts?.ignoreGlass ?? true;
  const radius = Math.max(0, opts?.targetRadius ?? 0);

  const targets: Vec3[] = [targetPos];
  if (radius > 0) {
    const fx = targetPos[0] - camPos[0];
    const fy = targetPos[1] - camPos[1];
    const fz = targetPos[2] - camPos[2];
    const fl = Math.hypot(fx, fy, fz) || 1;
    const f: Vec3 = [fx / fl, fy / fl, fz / fl];
    const refUp: Vec3 = Math.abs(f[1]) > 0.99 ? [0, 0, -1] : [0, 1, 0];
    const rx = f[1] * refUp[2] - f[2] * refUp[1];
    const ry = f[2] * refUp[0] - f[0] * refUp[2];
    const rz = f[0] * refUp[1] - f[1] * refUp[0];
    const rl = Math.hypot(rx, ry, rz) || 1;
    const r: Vec3 = [rx / rl, ry / rl, rz / rl];
    const u: Vec3 = [
      r[1] * f[2] - r[2] * f[1],
      r[2] * f[0] - r[0] * f[2],
      r[0] * f[1] - r[1] * f[0],
    ];
    for (const [sr, su] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      targets.push([
        targetPos[0] + (r[0] * sr + u[0] * su) * radius,
        targetPos[1] + (r[1] * sr + u[1] * su) * radius,
        targetPos[2] + (r[2] * sr + u[2] * su) * radius,
      ]);
    }
  }

  const bestByName = new Map<string, SightlineHit>();
  for (const box of blockingBoxes) {
    const isTransparentGlass = box.transparent === true || (box.transparent === undefined && /glass/i.test(box.name));
    if (ignoreGlass && isTransparentGlass) continue;
    for (const tp of targets) {
      const dir: Vec3 = [tp[0] - camPos[0], tp[1] - camPos[1], tp[2] - camPos[2]];
      const hit = intersectRayBox(camPos, dir, box);
      if (!hit) continue;
      const prev = bestByName.get(box.name);
      if (!prev || hit.tEnter < prev.tEnter) {
        bestByName.set(box.name, {
          name: box.name,
          tEnter: hit.tEnter,
          tExit: hit.tExit,
          hitPoint: [
            camPos[0] + dir[0] * hit.tEnter,
            camPos[1] + dir[1] * hit.tEnter,
            camPos[2] + dir[2] * hit.tEnter,
          ],
        });
      }
    }
  }

  const blockedBy = [...bestByName.values()].sort((a, b) => a.tEnter - b.tEnter);
  return {
    ok: blockedBy.length === 0,
    blockedBy,
    suggestedHideNames: blockedBy.map((b) => b.name),
  };
}
