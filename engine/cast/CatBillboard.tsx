import React, { useEffect, useMemo } from 'react';
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

const blobVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const blobFrag = /* glsl */ `
uniform vec3 uRatio;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float m = 1.0 - smoothstep(0.65, 1.0, r);
  gl_FragColor = vec4(mix(vec3(1.0), uRatio, m), 1.0);
}`;

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
  /** true = kartu melempar bayangan panjang di lantai (otomatis cocok dengan `light.card.castShadow`). */
  castShadow?: boolean;
  /** Warna multiply bayangan kontak di bawah cakar (linear RGB). */
  blobColor?: Vec3;
  /** Garis tepi stiker ala thumbnail YouTube. */
  stickerOutline?: { color?: string; width?: number; outerColor?: string };
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
    pose.tailPhase ?? 0,
    pose.earTwitch ?? 0,
    pose.pawRaise ?? 'none',
    pose.pawAngle ?? '',
    pose.pawReach ?? '',
    pose.fx ?? '',
    pose.lean ?? 0,
    pose.facing ?? '',
    pose.breathPhase ?? 0,
    pose.stretch ?? 0,
  ]);
}

/**
 * Komponen 3D siap pakai untuk Karakter Animasi Kucing 2D (`Si Oyen`, `Mpus Abu`, `Si Belang`):
 * - Supersample 2x Canvas2D, layer `NOINK` (tanpa outline ganda)
 * - `cardShade` + `alphaToCoverage` (selalu cerah & menyatu dengan cahaya dunia 3D)
 * - `customDepthMaterial` (bayangan mengikuti siluet kucing & telinga)
 * - Bayangan kontak multiply otomatis di lantai
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
}) => {
  const spec = useMemo(() => resolveCatSpec(cat, overrides), [cat, overrides]);
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
      const off = document.createElement('canvas');
      off.width = CAT_W * 2;
      off.height = CAT_H * 2;
      const offCtx = off.getContext('2d')!;
      offCtx.scale(2, 2);
      drawCat(offCtx, spec, pose);

      const bodyOnly = document.createElement('canvas');
      bodyOnly.width = CAT_W * 2;
      bodyOnly.height = CAT_H * 2;
      const bodyCtx = bodyOnly.getContext('2d')!;
      bodyCtx.scale(2, 2);
      drawCat(bodyCtx, spec, { ...pose, fx: 'none' });

      const sil = document.createElement('canvas');
      sil.width = CAT_W * 2;
      sil.height = CAT_H * 2;
      const silCtx = sil.getContext('2d')!;

      const stampRing = (col: string, radPx: number) => {
        silCtx.globalCompositeOperation = 'source-over';
        silCtx.clearRect(0, 0, sil.width, sil.height);
        silCtx.drawImage(bodyOnly, 0, 0);
        silCtx.globalCompositeOperation = 'source-in';
        silCtx.fillStyle = col;
        silCtx.fillRect(0, 0, sil.width, sil.height);

        const steps = 28;
        for (const r of [radPx * 0.55, radPx]) {
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            ctx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
          }
        }
      };

      const wPx = (stickerOutline.width ?? 16) * 2;
      if (stickerOutline.outerColor) {
        stampRing(stickerOutline.outerColor, wPx + 9);
      }
      stampRing(stickerOutline.color ?? '#ffffff', wPx);
      ctx.drawImage(off, 0, 0);
    }

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
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
      }),
    [],
  );

  const blobMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uRatio: { value: new THREE.Color(...blobColor) } },
        vertexShader: blobVert,
        fragmentShader: blobFrag,
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

  cardMat.map = texture;
  depthMat.map = texture;
  (blobMat.uniforms.uRatio.value as THREE.Color).setRGB(blobColor[0], blobColor[1], blobColor[2]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(
    () => () => {
      cardMat.dispose();
      depthMat.dispose();
      blobMat.dispose();
    },
    [cardMat, depthMat, blobMat],
  );

  const w = height * (CAT_W / CAT_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  const lift = height * (1 - CAT_SOLE_Y / CAT_H);
  const blobScale = pose.stance === 'jump' ? 0.6 : pose.stance === 'sleep' ? 1.2 : 1;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
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
      <mesh
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        material={blobMat}
        renderOrder={0.5}
      >
        <planeGeometry args={[height * 0.92 * blobScale, height * 0.56 * blobScale]} />
      </mesh>
    </group>
  );
};
