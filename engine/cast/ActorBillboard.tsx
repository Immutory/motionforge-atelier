import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { cardShade } from '../stage/shade';
import {
  ACTOR_H,
  ACTOR_SOLE_Y,
  ACTOR_W,
  drawActor,
  resolveActorSpec,
  type ActorPose,
  type CastPresetId,
  type CharacterSpec,
} from './nusantara';

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

export type ActorBillboardProps = {
  /** ID preset (`'arya'`, `'rara'`, `'dimas'`, `'saka'`, `'pakBudi'`, `'buSiti'`, `'raka'`, `'bangUdin'`) atau CharacterSpec kustom. */
  actor: CastPresetId | CharacterSpec;
  /** Override cepat per karakter (mis. ganti warna baju, lepas peci, tambah kacamata). */
  overrides?: Partial<CharacterSpec>;
  position: Vec3;
  /** Posisi kamera saat ini. Kartu selalu menghadap kamera. */
  faceTo: Vec3;
  pose: ActorPose;
  /** Tinggi karakter di dunia 3D dalam meter (default 1.96 m). */
  height?: number;
  /** true = kartu melempar bayangan panjang di lantai (otomatis cocok dengan light.card.castShadow). */
  castShadow?: boolean;
  /** Warna multiply bayangan kontak di bawah kaki (linear RGB). */
  blobColor?: Vec3;
};

/**
 * Komponen 3D siap pakai untuk 8 karakter Ala Indonesia (dan NPC kustom hasil override):
 * - Supersample 2x Canvas2D, layer NOINK (tanpa outline ganda)
 * - cardShade + alphaToCoverage (wajah selalu cerah di siang maupun golden hour)
 * - customDepthMaterial (bayangan mengikuti siluet karakter)
 * - Bayangan kontak multiply otomatis di lantai
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
}) => {
  const spec = useMemo(() => resolveActorSpec(actor, overrides), [actor, overrides]);
  const talkKey = typeof pose.talk === 'number' ? `n${pose.talk.toFixed(2)}` : pose.talk ? `${pose.talk.shape}_${pose.talk.open.toFixed(2)}` : '0';

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = ACTOR_W * 2;
    canvas.height = ACTOR_H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    drawActor(ctx, spec, pose);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [
    spec,
    pose.face,
    pose.blink,
    talkKey,
    pose.stance,
    pose.view,
    pose.leftArm,
    pose.rightArm,
    pose.leftProp,
    pose.rightProp,
    pose.hatPop,
    pose.fx,
    pose.walkPhase,
    pose.lean,
    pose.facing,
  ]);

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

  const w = height * (ACTOR_W / ACTOR_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  const lift = height * (1 - ACTOR_SOLE_Y / ACTOR_H);
  const blobScale = pose.stance === 'jump' ? 0.65 : 1;

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
        <planeGeometry args={[height * 0.56 * blobScale, height * 0.4 * blobScale]} />
      </mesh>
    </group>
  );
};
