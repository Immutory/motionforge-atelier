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
import { paintReliefPrimitives, type ReliefPrimitive } from './rig360';
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
    pose.yawDeg !== undefined ? pose.yawDeg.toFixed(1) : '',
    pose.headYawDeg !== undefined ? pose.headYawDeg.toFixed(1) : '',
    pose.pitchDeg !== undefined ? pose.pitchDeg.toFixed(1) : '',
  ]);
}

/**
 * Komponen 2,5D resmi (Atelier v4.0) untuk 13 karakter Ala Indonesia (dan NPC kustom hasil override):
 * - 1 siluet vektor utuh bersupersample 2x Canvas2D persisten di layer NOINK (tanpa outline ganda / alokasi ulang VRAM)
 * - Rig volumetrik 360° + `uReliefMap` per-piksel normal/AO/Fresnel saat `yawDeg` aktif (kompatibel 100% mode legacy)
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

  const RELIEF_W = ACTOR_W / 2;
  const RELIEF_H = ACTOR_H / 2;

  const buffers = useMemo(() => {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = ACTOR_W * 2;
    colorCanvas.height = ACTOR_H * 2;
    const colorCtx = colorCanvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(colorCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const reliefCanvas = document.createElement('canvas');
    reliefCanvas.width = RELIEF_W;
    reliefCanvas.height = RELIEF_H;
    const reliefCtx = reliefCanvas.getContext('2d')!;
    const reliefTex = new THREE.CanvasTexture(reliefCanvas);
    reliefTex.colorSpace = THREE.NoColorSpace;
    reliefTex.minFilter = THREE.LinearFilter;
    reliefTex.magFilter = THREE.LinearFilter;
    reliefTex.generateMipmaps = false;

    return { colorCanvas, colorCtx, texture, reliefCanvas, reliefCtx, reliefTex };
  }, [RELIEF_W, RELIEF_H]);

  const cardMat = useMemo(() => {
    const m = cardShade(
      new THREE.MeshLambertMaterial({
        map: buffers.texture,
        transparent: false,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      }),
      {
        map: buffers.reliefTex,
        texel: [1 / RELIEF_W, 1 / RELIEF_H],
        enabled: false,
      },
    );
    m.alphaToCoverage = true;
    return m;
  }, [buffers, RELIEF_W, RELIEF_H]);

  const depthMat = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: buffers.texture,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      }),
    [buffers],
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
    const reliefPrimitives: ReliefPrimitive[] = [];
    const wantRelief = effectivePose.yawDeg !== undefined;
    const { colorCtx, texture, reliefCtx, reliefTex } = buffers;
    colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.clearRect(0, 0, ACTOR_W * 2, ACTOR_H * 2);

    if (!stickerOutline) {
      colorCtx.save();
      colorCtx.scale(2, 2);
      drawActor(colorCtx, spec, effectivePose, undefined, wantRelief ? reliefPrimitives : undefined);
      colorCtx.restore();
    } else {
      stampStickerOutline(
        colorCtx,
        ACTOR_W * 2,
        ACTOR_H * 2,
        (c) => drawActor(c, spec, effectivePose, undefined, wantRelief ? reliefPrimitives : undefined),
        (c) => drawActor(c, spec, { ...effectivePose, fx: 'none' }),
        stickerOutline,
      );
    }
    texture.needsUpdate = true;

    const rUniform = cardMat.userData.cardRelief as
      | { uHasRelief: { value: number } }
      | undefined;
    if (wantRelief && reliefPrimitives.length > 0) {
      paintReliefPrimitives(reliefCtx, RELIEF_W, RELIEF_H, ACTOR_W, ACTOR_H, reliefPrimitives);
      reliefTex.needsUpdate = true;
      if (rUniform) rUniform.uHasRelief.value = 1.0;
    } else {
      if (rUniform) rUniform.uHasRelief.value = 0.0;
    }

    (blobMat.uniforms.uRatio.value as THREE.Color).setRGB(blobColor[0], blobColor[1], blobColor[2]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, poseKey, stickerKey, buffers, cardMat, blobMat, RELIEF_W, RELIEF_H, blobColor[0], blobColor[1], blobColor[2]]);

  useEffect(
    () => () => {
      buffers.texture.dispose();
      buffers.reliefTex.dispose();
      cardMat.dispose();
      depthMat.dispose();
      blobMat.dispose();
    },
    [buffers, cardMat, depthMat, blobMat],
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
