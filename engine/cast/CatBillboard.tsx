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
  ]);
}

/**
 * Komponen 2,5D siap pakai untuk Karakter Animasi Kucing 2D (`Si Oyen`, `Mpus Abu`, `Si Belang`):
 * - Supersample 2x Canvas2D di layer `NOINK` (tanpa outline ganda)
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

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CAT_W * 2;
    canvas.height = CAT_H * 2;
    const ctx = canvas.getContext('2d')!;
    if (!stickerOutline) {
      ctx.scale(2, 2);
      drawCat(ctx, spec, pose);
    } else {
      stampStickerOutline(
        ctx,
        CAT_W * 2,
        CAT_H * 2,
        (c) => drawCat(c, spec, pose),
        (c) => drawCat(c, spec, { ...pose, fx: 'none' }),
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
