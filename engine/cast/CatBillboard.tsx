import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { cardShade } from '../stage/shade';
import {
  CAT_H,
  CAT_SOLE_Y,
  CAT_W,
  drawCat,
  resolveCatSpec,
  type CatPose,
  type CatPresetId,
  type CatSpec,
} from './cat';
import { computeBillboardTiltX, seatCardPos } from './nusantara';
import { paintReliefPrimitives, type ReliefPrimitive } from './rig360';
import { BLOB_FRAG, BLOB_VERT, stampStickerOutline, type StickerOutline } from './sticker';

export type CatBillboardProps = {
  /** ID preset (`'oyen'`, `'abu'`, `'belang'`) atau `CatSpec` kustom. Default `'oyen'`. */
  cat?: CatPresetId | CatSpec;
  /** Override cepat (mis. tambah kalung merah `collarColor: '#d9383a'`, ganti warna mata, dll). */
  overrides?: Partial<CatSpec>;
  position: Vec3;
  /** Posisi kamera saat ini. Kartu selalu menghadap kamera. */
  faceTo: Vec3;
  pose: CatPose;
  /** Tinggi karakter kucing di dunia 3D dalam meter (default `0.62` m — proporsional dengan Bang Utoh 1.92 m). */
  height?: number;
  /** true = kartu melempar bayangan siluet utuh ke lantai & dinding belakang (cocok dengan `light.card.castShadow`). */
  castShadow?: boolean;
  /** Warna multiply bayangan kontak di bawah cakar (linear RGB). */
  blobColor?: Vec3;
  /** Garis tepi stiker ala thumbnail YouTube. */
  stickerOutline?: StickerOutline;
  /** Radius setengah sisi kursi/dudukan (meter, mis. `0.15` untuk kursi merah Oyen) agar 0% tembus kursi. */
  seatRadius?: number;
  /** Elevasi permukaan lantai/dudukan untuk mengunci bayangan kontak blob (default `position[1]`). */
  groundY?: number;
  /** Kompensasi kemiringan X (*high-angle X-tilt*, berporos cakar `y = 0`) saat pitch kamera `> 12°`. Default `true`. */
  tiltComp?: boolean;
};

/**
 * Serialisasi deterministik 100% properti `CatPose` agar `useMemo` CanvasTexture di `<CatBillboard>`
 * tidak pernah melewatkan perubahan animasi (termasuk `pawRaise`, `pawAngle`, `pawReach`, `stretch`, `breathPhase`).
 */
export function catPoseKey(pose: CatPose): string {
  const talkKey =
    typeof pose.talk === 'number'
      ? `n${pose.talk.toFixed(3)}`
      : pose.talk
        ? `${pose.talk.shape}_${pose.talk.open.toFixed(3)}`
        : '0';
  return JSON.stringify([
    pose.face,
    pose.blink ?? 0,
    talkKey,
    pose.stance ?? 'sit',
    pose.view ?? 'threeQuarter',
    pose.walkPhase ?? 0,
    pose.gait ?? 'planted',
    pose.tailPhase ?? 'u',
    pose.earTwitch ?? 0,
    pose.pawRaise ?? 'none',
    pose.pawAngle ?? '',
    pose.pawReach ?? '',
    pose.fx ?? '',
    pose.lean ?? 'u',
    pose.facing ?? '',
    pose.breathPhase ?? 'u',
    pose.stretch ?? 0,
    pose.yawDeg !== undefined ? pose.yawDeg.toFixed(1) : '',
    pose.headYawDeg !== undefined ? pose.headYawDeg.toFixed(1) : '',
    pose.pitchDeg !== undefined ? pose.pitchDeg.toFixed(1) : '',
  ]);
}

/**
 * Komponen 2,5D siap pakai (Atelier v4.0) untuk Karakter Animasi Kucing 2D (`Si Oyen`, `Mpus Abu`, `Si Belang`):
 * - Supersample 2x Canvas2D persisten di layer `NOINK` (tanpa outline ganda / alokasi ulang VRAM)
 * - Rig volumetrik 360° + `uReliefMap` per-piksel normal/AO/Fresnel saat `yawDeg` aktif
 * - `cardShade` + `receiveShadow` + `uLocalLight` Reinhard soft-clamp + `DoubleSide` silhouette `castShadow`
 * - `seatRadius` anti-tembus kursi, `groundY`, & `tiltComp` berporos cakar `y = 0`
 */
export const CatBillboard: React.FC<CatBillboardProps> = ({
  cat = 'oyen',
  overrides,
  position,
  faceTo,
  pose,
  height = 0.62,
  castShadow = false,
  blobColor = [0.6, 0.56, 0.62],
  stickerOutline,
  seatRadius,
  groundY,
  tiltComp = true,
}) => {
  const catKey = typeof cat === 'string' ? cat : JSON.stringify(cat);
  const overridesKey = overrides ? JSON.stringify(overrides) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => resolveCatSpec(cat, overrides), [catKey, overridesKey]);
  const poseKey = catPoseKey(pose);
  const stickerKey = stickerOutline
    ? `${stickerOutline.color ?? '#fff'}_${stickerOutline.width ?? 16}_${stickerOutline.outerColor ?? ''}`
    : '';

  const RELIEF_W = CAT_W / 2;
  const RELIEF_H = CAT_H / 2;

  const buffers = useMemo(() => {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = CAT_W * 2;
    colorCanvas.height = CAT_H * 2;
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
    const wantRelief = pose.yawDeg !== undefined;
    const { colorCtx, texture, reliefCtx, reliefTex } = buffers;
    colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.clearRect(0, 0, CAT_W * 2, CAT_H * 2);

    if (!stickerOutline) {
      colorCtx.save();
      colorCtx.scale(2, 2);
      drawCat(colorCtx, spec, pose, wantRelief ? reliefPrimitives : undefined);
      colorCtx.restore();
    } else {
      stampStickerOutline(
        colorCtx,
        CAT_W * 2,
        CAT_H * 2,
        (c) => drawCat(c, spec, pose, wantRelief ? reliefPrimitives : undefined),
        (c) => drawCat(c, spec, { ...pose, fx: 'none' }),
        stickerOutline,
      );
    }
    texture.needsUpdate = true;

    const rUniform = cardMat.userData.cardRelief as
      | { uHasRelief: { value: number } }
      | undefined;
    if (wantRelief && reliefPrimitives.length > 0) {
      paintReliefPrimitives(reliefCtx, RELIEF_W, RELIEF_H, CAT_W, CAT_H, reliefPrimitives);
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
  const w = height * (CAT_W / CAT_H);
  const yaw = Math.atan2(faceTo[0] - effectivePos[0], faceTo[2] - effectivePos[2]);
  const tiltX = tiltComp ? computeBillboardTiltX(effectivePos, faceTo, height) : 0;
  const lift = height * (1 - CAT_SOLE_Y / CAT_H);
  const isWalk = pose.stance === 'walk';
  const walkPh = (pose.walkPhase ?? 0) * Math.PI * 2;
  const blobScaleX =
    pose.stance === 'jump' ? 0.6 : pose.stance === 'sleep' ? 1.2 : isWalk ? 1 + 0.1 * Math.abs(Math.cos(walkPh)) : 1;
  const blobScaleZ =
    pose.stance === 'jump' ? 0.6 : pose.stance === 'sleep' ? 1.2 : isWalk ? 1 - 0.06 * Math.abs(Math.sin(walkPh)) : 1;
  const blobY = groundY !== undefined ? groundY - effectivePos[1] + 0.005 : 0.005;

  return (
    <group position={effectivePos} rotation={[0, yaw, 0]}>
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
        <planeGeometry args={[height * 0.92, height * 0.56]} />
      </mesh>
    </group>
  );
};
