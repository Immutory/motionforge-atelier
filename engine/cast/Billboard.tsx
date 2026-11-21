import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { cardShade } from '../stage/shade';
import { BeanLook, BeanPose, CANVAS_H, CANVAS_W, DEFAULT_LOOK, drawBean } from './bean';

export type BillboardProps = {
  position: Vec3;
  /** Posisi kamera saat ini. Kartu selalu menghadap ke sini. */
  faceTo: Vec3;
  pose: BeanPose;
  look?: BeanLook;
  /** Tinggi karakter di dunia, meter. */
  height?: number;
  /** true = kartu melempar bayangan panjang di lantai (mis. saat golden hour). */
  castShadow?: boolean;
  /** Warna multiply bayangan kontak di bawah kaki (linear RGB). */
  blobColor?: Vec3;
};

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

/**
 * Karakter 2D sebagai kartu di layer NOINK (bebas outline ganda dari InkPass),
 * memakai cardShade agar wajah tetap cerah dan menyatu dengan arah cahaya scene,
 * dilengkapi customDepthMaterial (bayangan mengikuti siluet karakter) dan bayangan kontak multiply di lantai.
 */
export const Billboard: React.FC<BillboardProps> = ({
  position,
  faceTo,
  pose,
  look = DEFAULT_LOOK,
  height = 1.8,
  castShadow = false,
  blobColor = [0.6, 0.56, 0.62],
}) => {
  const cardRef = useRef<THREE.Mesh>(null);
  const blobRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W * 2; // supersample 2x
    canvas.height = CANVAS_H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    drawBean(ctx, look, pose);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [look, pose.face, pose.blink, pose.armsUp, pose.step, pose.lean, pose.facing]);

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

  useEffect(() => {
    cardRef.current?.layers.set(NOINK);
    blobRef.current?.layers.set(NOINK);
  }, []);

  const w = height * (CANVAS_W / CANVAS_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  // telapak kaki ada di 96% tinggi kanvas
  const lift = height * 0.04;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh
        ref={(m) => {
          cardRef.current = m;
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
          blobRef.current = m;
          if (m) m.layers.set(NOINK);
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        material={blobMat}
        renderOrder={0.5}
      >
        <planeGeometry args={[height * 0.56, height * 0.42]} />
      </mesh>
    </group>
  );
};
