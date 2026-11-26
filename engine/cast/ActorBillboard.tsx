import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { cardShade } from '../stage/shade';
import {
  ACTOR_H,
  ACTOR_SOLE_Y,
  ACTOR_W,
  computeBillboardTiltX,
  drawActor,
  resolveActorSpec,
  seatCardPos,
  type ActorPose,
  type CastPresetId,
  type CharacterSpec,
} from './nusantara';
import { BLOB_FRAG, BLOB_VERT, stampStickerOutline, type StickerOutline } from './sticker';

export type ActorBillboardProps = {
  /** ID preset (13 karakter `CAST_PRESETS`: `'bangUtoh'`, `'ebot'`, `'arya'`, `'rara'`, `'dimas'`, `'saka'`, `'pakBudi'`, `'buSiti'`, `'raka'`, `'bangUdin'`, `'pakUjang'`, `'tio'`, `'mbakYuni'`) atau `CharacterSpec` kustom. */
  actor: CastPresetId | CharacterSpec;
  /** Override cepat per karakter (mis. ganti warna baju, lepas peci, tambah kacamata). */
  overrides?: Partial<CharacterSpec>;
  position: Vec3;
  /** Posisi kamera saat ini. Kartu selalu menghadap kamera. */
  faceTo: Vec3;
  pose: ActorPose;
  /** Tinggi karakter di dunia 3D dalam meter (default 1.96 m). */
  height?: number;
  /** true = kartu melempar bayangan siluet utuh ke lantai & dinding belakang (otomatis cocok dengan light.card.castShadow). */
  castShadow?: boolean;
  /** Warna multiply bayangan kontak di bawah kaki (linear RGB). */
  blobColor?: Vec3;
  /** Garis tepi stiker ala thumbnail YouTube (mis. `{ color: '#ffffff', width: 18, outerColor: '#0a090d' }`). */
  stickerOutline?: StickerOutline;
  /**
   * Radius setengah sisi kursi/bangku (meter, mis. `0.17` untuk kursi kayu).
   * Bila diisi, kartu otomatis digeser `+2 cm` ke tepi depan kursi arah `faceTo` via `seatCardPos` (0% tembus kursi!).
   */
  seatRadius?: number;
  /** Elevasi lantai sebenarnya (meter) untuk mengunci bayangan kontak blob (default sama dengan `position[1]`). */
  groundY?: number;
  /**
   * Kompensasi kemiringan X (*high-angle X-tilt*, berporos tepat di telapak kaki `y = 0`) saat pitch kamera `> 12°`.
   * Default `true` (bernilai `0` untuk semua shot eye-level `|pitch| <= 12°`).
   */
  tiltComp?: boolean;
};

/**
 * Serialisasi deterministik 100% properti `ActorPose` agar `useMemo` CanvasTexture di `<ActorBillboard>`
 * tidak pernah melewatkan perubahan animasi (termasuk `headTilt`, `sitHeight`, `lookBack`, `leftHand`, `rightHand`, `gait`, `stride`).
 */
export function actorPoseKey(pose: ActorPose): string {
  const talkKey =
    typeof pose.talk === 'number'
      ? `n${pose.talk.toFixed(3)}`
      : pose.talk
        ? `${pose.talk.shape}_${pose.talk.open.toFixed(3)}`
        : '0';
  const handKey = pose.leftHand || pose.rightHand ? JSON.stringify([pose.leftHand ?? null, pose.rightHand ?? null]) : '';
  return JSON.stringify([
    pose.face,
    pose.blink ?? 0,
    talkKey,
    pose.stance ?? 'stand',
    pose.view ?? 'threeQuarter',
    pose.leftArm ?? '',
    pose.rightArm ?? '',
    pose.leftProp ?? 'none',
    pose.rightProp ?? 'none',
    handKey,
    pose.hatPop ?? '',
    pose.fx ?? '',
    pose.walkPhase ?? 0,
    pose.gait ?? 'planted',
    pose.stride ?? 1,
    pose.strideBlend !== undefined ? pose.strideBlend.toFixed(3) : '1',
    pose.lean ?? '',
    pose.headTilt ?? 0,
    pose.sitHeight ?? '',
    pose.actorHeight ?? '',
    pose.facing ?? '',
    pose.lookBack ?? 0,
  ]);
}

/**
 * Komponen 2,5D resmi (Atelier v3.0) untuk 13 karakter Ala Indonesia (dan NPC kustom hasil override):
 * - 1 siluet vektor utuh bersupersample 2x Canvas2D di layer NOINK (tanpa outline ganda)
 * - Spherical face parallax + weighted 2.5D ink + `backThreeQuarter` 8-arah mulus
 * - `cardShade` + `receiveShadow` nyata + `uLocalLight` Reinhard soft-clamp + full silhouette `castShadow` (`DoubleSide` depth)
 * - Auto-inject `actorHeight` saat `sitHeight` aktif, `seatRadius` anti-tembus kursi, `groundY`, & `tiltComp` high-angle
 */
export const ActorBillboard: React.FC<ActorBillboardProps> = ({
  actor,
  overrides,
  position,
  faceTo,
  pose,
  height = 1.96,
  castShadow = false,
  blobColor = [0.6, 0.56, 0.62],
  stickerOutline,
  seatRadius,
  groundY,
  tiltComp = true,
}) => {
  const actorKey = typeof actor === 'string' ? actor : JSON.stringify(actor);
  const overridesKey = overrides ? JSON.stringify(overrides) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => resolveActorSpec(actor, overrides), [actorKey, overridesKey]);

  // Auto-inject tinggi aktor aktual ke `sitHeight` hanya bila memakai kalibrasi duduk v3.0 (`seatRadius > 0`),
  // sehingga produksi lama (EP02/EP03/EP04) tetap identik dengan referensi default 1,8 m kecuali `pose.actorHeight` eksplisit.
  const effectivePose: ActorPose =
    pose.sitHeight !== undefined && pose.actorHeight === undefined && (seatRadius ?? 0) > 0
      ? { ...pose, actorHeight: height }
      : pose;
  const poseKey = actorPoseKey(effectivePose);
  const stickerKey = stickerOutline ? `${stickerOutline.color ?? '#fff'}_${stickerOutline.width ?? 16}_${stickerOutline.outerColor ?? ''}` : '';

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = ACTOR_W * 2;
    canvas.height = ACTOR_H * 2;
    const ctx = canvas.getContext('2d')!;
    if (!stickerOutline) {
      ctx.scale(2, 2);
      drawActor(ctx, spec, effectivePose);
    } else {
      stampStickerOutline(
        ctx,
        ACTOR_W * 2,
        ACTOR_H * 2,
        (c) => drawActor(c, spec, effectivePose),
        (c) => drawActor(c, spec, { ...effectivePose, fx: 'none' }),
        stickerOutline,
      );
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, poseKey, stickerKey]);

  const cardMat = useMemo(() => {
    const m = cardShade(
      new THREE.MeshLambertMaterial({
        map: texture,
        transparent: false,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    m.alphaToCoverage = true;
    return m;
  }, []);

  const depthMat = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: texture,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const blobMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uRatio: { value: new THREE.Color(...blobColor) } },
        vertexShader: BLOB_VERT,
        fragmentShader: BLOB_FRAG,
        transparent: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.ZeroFactor,
        blendDst: THREE.SrcColorFactor,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );

  useLayoutEffect(() => {
    cardMat.map = texture;
    depthMat.map = texture;
    (blobMat.uniforms.uRatio.value as THREE.Color).setRGB(blobColor[0], blobColor[1], blobColor[2]);
  }, [cardMat, depthMat, blobMat, texture, blobColor[0], blobColor[1], blobColor[2]]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(
    () => () => {
      cardMat.dispose();
      depthMat.dispose();
      blobMat.dispose();
    },
    [cardMat, depthMat, blobMat],
  );

  const effectivePos = seatRadius ? seatCardPos(position, seatRadius, faceTo) : position;
  const w = height * (ACTOR_W / ACTOR_H);
  const yaw = Math.atan2(faceTo[0] - effectivePos[0], faceTo[2] - effectivePos[2]);
  const tiltX = tiltComp ? computeBillboardTiltX(effectivePos, faceTo, height) : 0;
  const lift = height * (1 - ACTOR_SOLE_Y / ACTOR_H);
  const isWalk = effectivePose.stance === 'walk';
  const walkPh = (effectivePose.walkPhase ?? 0) * Math.PI * 2;
  const walkBlend = isWalk ? Math.max(0, Math.min(1, effectivePose.strideBlend ?? 1)) : 0;
  const blobScaleX =
    effectivePose.stance === 'jump'
      ? 0.65
      : isWalk
        ? 1 + 0.14 * Math.abs(Math.cos(walkPh)) * walkBlend
        : 1;
  const blobScaleZ =
    effectivePose.stance === 'jump'
      ? 0.65
      : isWalk
        ? 1 - 0.08 * Math.abs(Math.sin(walkPh)) * walkBlend
        : 1;
  // v3.5: blobY turun ke 0.005 m (aman dengan polygonOffset -2) agar menempel mantap di lantai tanpa celah.
  const blobY = groundY !== undefined ? groundY - effectivePos[1] + 0.005 : 0.005;

  return (
    <group position={effectivePos} rotation={[0, yaw, 0]}>
      {/* Pivot rotasi tiltX tepat di telapak kaki (y = 0) agar sepatu tidak bergeser pada high-angle / crane shot */}
      <group rotation={[tiltX, 0, 0]}>
        <mesh
          ref={(m) => {
            if (m) m.layers.set(NOINK);
          }}
          position={[0, height / 2 - lift, 0]}
          material={cardMat}
          customDepthMaterial={depthMat}
          castShadow={castShadow}
          receiveShadow
          renderOrder={1}
        >
          <planeGeometry args={[w, height]} />
        </mesh>
      </group>
      <mesh
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, blobY, 0]}
        material={blobMat}
        scale={[blobScaleX, blobScaleZ, 1]}
        renderOrder={0.5}
      >
        <planeGeometry args={[height * 0.56, height * 0.4]} />
      </mesh>
    </group>
  );
};
