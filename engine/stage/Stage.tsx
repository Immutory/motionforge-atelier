import React, { useMemo } from 'react';
import * as THREE from 'three';
import { LightPreset, sunPosition } from './lights';

const skyVert = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFrag = `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
void main(){ float h = clamp(vDir.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(uHorizon, uTop, h), 1.0); }`;

export const Sky: React.FC<{ light: LightPreset }> = ({ light }) => {
  const uniforms = useMemo(
    () => ({ uTop: { value: new THREE.Color(light.sky.top) }, uHorizon: { value: new THREE.Color(light.sky.horizon) } }),
    [light],
  );
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[400, 24, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={skyVert} fragmentShader={skyFrag} />
    </mesh>
  );
};

/** Panggung dasar: langit, kabut, tiga lampu, dan lantai. Set spesifik masuk sebagai children. */
export const Stage: React.FC<{ light: LightPreset; ground?: string; children?: React.ReactNode }> = ({
  light,
  ground = '#c9b48a',
  children,
}) => {
  const sun = sunPosition(light.key.azimuth, light.key.elevation);
  return (
    <>
      <color attach="background" args={[light.sky.horizon]} />
      <fog attach="fog" args={[light.fog.color, light.fog.near, light.fog.far]} />
      <Sky light={light} />
      <ambientLight color={light.ambient.color} intensity={light.ambient.intensity} />
      <directionalLight color={light.key.color} intensity={light.key.intensity} position={sun} />
      <directionalLight color={light.fill.color} intensity={light.fill.intensity} position={[-sun[0], 12, -sun[2]]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshLambertMaterial color={ground} />
      </mesh>
      {children}
    </>
  );
};
