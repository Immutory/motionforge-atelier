import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { NOINK, cardShade, type Vec3 } from '../../engine';
import { WARGA_H, WARGA_SOLE_Y, WARGA_W, drawWarga, type WargaId, type WargaPose } from './warga';

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

export type WargaCardProps = {
  id: WargaId;
  pose: WargaPose;
  position: Vec3;
  faceTo: Vec3;
  height?: number;
  castShadow?: boolean;
  blobColor?: Vec3;
};

/** Billboard 2D-in-3D animasi penuh untuk Paket NPC Sehari-hari Indonesia (ID-5..ID-8). */
export const WargaCard: React.FC<WargaCardProps> = ({
  id,
  pose,
  position,
  faceTo,
  height = 1.98,
  castShadow = false,
  blobColor = [0.6, 0.56, 0.62],
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WARGA_W * 2;
    canvas.height = WARGA_H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    drawWarga(id, ctx, pose);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [id, pose.mode, pose.walkPhase, pose.talk, pose.blink, pose.facing]);

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

  const w = height * (WARGA_W / WARGA_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  const lift = height * (1 - WARGA_SOLE_Y / WARGA_H);

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
        <planeGeometry args={[height * 0.56, height * 0.4]} />
      </mesh>
    </group>
  );
};
