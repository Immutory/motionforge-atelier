import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { NOINK, cardShade, type Vec3 } from '../../engine';
import { CHAR_H, CHAR_SOLE_Y, CHAR_W, drawPrototype, type ProtoId, type ProtoMode } from './prototypes';

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

export type CharCardProps = {
  id: ProtoId;
  mode: ProtoMode;
  position: Vec3;
  faceTo: Vec3;
  height?: number;
  castShadow?: boolean;
  blobColor?: Vec3;
};

/** Billboard 2D-in-3D untuk menguji prototipe karakter dengan shader & layer NOINK yang sama persis dengan engine. */
export const CharCard: React.FC<CharCardProps> = ({
  id,
  mode,
  position,
  faceTo,
  height = 1.95,
  castShadow = false,
  blobColor = [0.6, 0.56, 0.62],
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CHAR_W * 2;
    canvas.height = CHAR_H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    drawPrototype(id, ctx, mode);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [id, mode]);

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

  const w = height * (CHAR_W / CHAR_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  const lift = height * (1 - CHAR_SOLE_Y / CHAR_H);

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
