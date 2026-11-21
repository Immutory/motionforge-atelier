import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { LightPreset, cameraRelativeSun, sunPosition } from './lights';
import { syncShadeUniforms, twoTone } from './shade';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFrag = /* glsl */ `
uniform vec3 c0;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
uniform vec3 uElev;
varying vec3 vDir;
void main() {
  float el = asin(clamp(vDir.y, -1.0, 1.0));
  vec3 c = mix(c0, c1, smoothstep(0.0, uElev.x, el));
  c = mix(c, c2, smoothstep(uElev.x, uElev.y, el));
  c = mix(c, c3, smoothstep(uElev.y, uElev.z, el));
  gl_FragColor = vec4(c, 1.0);
}`;

/** Kubah langit 4-stop berdasarkan elevasi (derajat), di layer NOINK agar tidak memicu ink outline. */
export const Sky: React.FC<{ light: LightPreset }> = ({ light }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      c0: { value: new THREE.Color(light.sky.stops[0]) },
      c1: { value: new THREE.Color(light.sky.stops[1]) },
      c2: { value: new THREE.Color(light.sky.stops[2]) },
      c3: { value: new THREE.Color(light.sky.stops[3]) },
      uElev: {
        value: new THREE.Vector3(
          ...((light.sky.elevations.map((d) => (d * Math.PI) / 180)) as [number, number, number]),
        ),
      },
    }),
    [],
  );

  uniforms.c0.value.set(light.sky.stops[0]);
  uniforms.c1.value.set(light.sky.stops[1]);
  uniforms.c2.value.set(light.sky.stops[2]);
  uniforms.c3.value.set(light.sky.stops[3]);
  uniforms.uElev.value.set(
    (light.sky.elevations[0] * Math.PI) / 180,
    (light.sky.elevations[1] * Math.PI) / 180,
    (light.sky.elevations[2] * Math.PI) / 180,
  );

  useEffect(() => {
    meshRef.current?.layers.set(NOINK);
  }, []);

  return (
    <mesh
      ref={(m) => {
        meshRef.current = m;
        if (m) m.layers.set(NOINK);
      }}
      renderOrder={-1}
    >
      <sphereGeometry args={[400, 24, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={skyVert}
        fragmentShader={skyFrag}
      />
    </mesh>
  );
};

/** Helper hook untuk membuat MeshLambertMaterial two-tone yang aman di-dispose otomatis. */
export function useTwoToneMaterial(params: THREE.MeshLambertMaterialParameters, deps: React.DependencyList = []) {
  const mat = useMemo(() => twoTone(new THREE.MeshLambertMaterial(params)), deps);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

export type StageProps = {
  light: LightPreset;
  ground?: string;
  groundMap?: THREE.Texture | null;
  /** Posisi kamera & target saat ini (opsional; dipakai jika preset key.cameraRelative = true). */
  camPos?: Vec3;
  camLook?: Vec3;
  /** Ukuran setengah frustum bayangan matahari dalam meter. */
  shadowRange?: number;
  children?: React.ReactNode;
};

/**
 * Panggung dasar: langit 4-stop, kabut horizon, matahari dengan shadow map, uniform two-tone,
 * dan lantai berbayangan two-tone. Set spesifik produksi masuk sebagai children.
 */
export const Stage: React.FC<StageProps> = ({
  light,
  ground = '#d9c59b',
  groundMap = null,
  camPos,
  camLook,
  shadowRange,
  children,
}) => {
  // Sinkronkan uniform two-tone & cardShade sebelum frame dirender.
  syncShadeUniforms(light);

  const sun =
    light.key.cameraRelative && camPos && camLook
      ? cameraRelativeSun(camPos, camLook, light.key.azimuth, light.key.elevation, 55)
      : sunPosition(light.key.azimuth, light.key.elevation, 55);

  const keyRef = useRef<THREE.DirectionalLight>(null);
  const range = shadowRange ?? light.shadow.range;

  const groundMat = useTwoToneMaterial(
    { color: groundMap ? '#ffffff' : ground, map: groundMap ?? undefined },
    [ground, groundMap],
  );

  useEffect(() => {
    const dir = keyRef.current;
    if (!dir) return;
    dir.target.position.set(camLook?.[0] ?? 0, 0, camLook?.[2] ?? 0);
    dir.target.updateMatrixWorld();
  }, [camLook?.[0], camLook?.[2]]);

  return (
    <>
      <color attach="background" args={[light.sky.stops[0]]} />
      <fog attach="fog" args={[light.fog.color, light.fog.near, light.fog.far]} />
      <Sky light={light} />
      <ambientLight color={light.ambient.color} intensity={light.ambient.intensity} />
      <directionalLight
        ref={keyRef}
        castShadow
        color={light.key.color}
        intensity={light.key.intensity}
        position={sun}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-range}
        shadow-camera-right={range}
        shadow-camera-top={range}
        shadow-camera-bottom={-range}
        shadow-bias={light.shadow.bias}
        shadow-normalBias={light.shadow.normalBias}
      />
      <directionalLight color={light.fill.color} intensity={light.fill.intensity} position={[-sun[0], 14, -sun[2]]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={groundMat}>
        <planeGeometry args={[600, 600]} />
      </mesh>
      {children}
    </>
  );
};
