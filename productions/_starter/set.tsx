import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  CLOUD_DAY,
  CLOUD_GOLD,
  NOINK,
  beamTexture,
  cloudTexture,
  planksTexture,
  plasterTexture,
  stoneTexture,
  twoTone,
  useTwoToneMaterial,
} from '../../engine';

/** Milik agent set-designer. Props prosedural bergaya ilustrasi, semua menapak lantai y = 0. */
export const SetPieces: React.FC<{ lightId?: string }> = ({ lightId = 'noon' }) => {
  const planks = useMemo(() => planksTexture({ repeat: [1.5, 1] }), []);
  const beam = useMemo(() => beamTexture({ repeat: [1, 1] }), []);
  const plaster = useMemo(() => plasterTexture({ wall: '#f0dfc8', repeat: [2, 1] }), []);
  const stone = useMemo(() => stoneTexture({ repeat: [1, 1.5] }), []);
  const cloudTex = useMemo(
    () => cloudTexture(2, lightId === 'amber' || lightId === 'dusk' ? CLOUD_GOLD : CLOUD_DAY),
    [lightId],
  );

  const tableTopMat = useTwoToneMaterial({ map: planks }, [planks]);
  const woodMat = useTwoToneMaterial({ map: beam }, [beam]);
  const wallMat = useTwoToneMaterial({ map: plaster }, [plaster]);
  const pillarMat = useTwoToneMaterial({ map: stone }, [stone]);
  const roofMat = useTwoToneMaterial({ color: '#d27a62' }, []);

  // Prop logam kuningan dengan sorotan specular Phong (twoTone menjaga specular logam).
  const brassMat = useMemo(
    () =>
      twoTone(
        new THREE.MeshPhongMaterial({
          color: '#f0c44d',
          specular: '#fff4d2',
          shininess: 55,
        }),
      ),
    [],
  );
  useEffect(() => () => brassMat.dispose(), [brassMat]);

  const isWarm = lightId === 'amber' || lightId === 'dusk';

  return (
    <group>
      {/* Meja kerja kayu: permukaan papan + empat kaki (semua berdiri di lantai y = 0) */}
      <group position={[0, 0, -1.25]}>
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow material={tableTopMat}>
          <boxGeometry args={[1.85, 0.1, 0.92]} />
        </mesh>
        <mesh position={[0, 0.67, 0]} castShadow receiveShadow material={woodMat}>
          <boxGeometry args={[1.66, 0.12, 0.76]} />
        </mesh>
        {[
          [-0.76, -0.32],
          [0.76, -0.32],
          [-0.76, 0.32],
          [0.76, 0.32],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.37, lz]} castShadow receiveShadow material={woodMat}>
            <boxGeometry args={[0.1, 0.74, 0.1]} />
          </mesh>
        ))}

        {/* Prop insert di atas meja: lentera kuningan berangka terbuka + kaca menyala HDR */}
        <group position={[0.42, 0.83, 0.08]}>
          <mesh position={[0, 0.035, 0]} castShadow receiveShadow material={brassMat}>
            <cylinderGeometry args={[0.15, 0.17, 0.07, 20]} />
          </mesh>
          {/* Kaca inti menyala HDR saat golden hour agar bloom aktif khusus pada sumber cahaya */}
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.085, 0.09, 0.2, 18]} />
            <meshBasicMaterial color={isWarm ? new THREE.Color(2.4, 1.8, 0.95) : new THREE.Color('#fff7dc')} />
          </mesh>
          {/* 4 tiang rangka kuningan mengelilingi kaca */}
          {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((ang, i) => (
            <mesh
              key={i}
              position={[Math.cos(ang) * 0.115, 0.17, Math.sin(ang) * 0.115]}
              castShadow
              material={brassMat}
            >
              <cylinderGeometry args={[0.014, 0.014, 0.22, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 0.285, 0]} castShadow receiveShadow material={brassMat}>
            <cylinderGeometry args={[0.15, 0.14, 0.035, 20]} />
          </mesh>
          <mesh position={[0, 0.345, 0]} castShadow receiveShadow material={brassMat}>
            <coneGeometry args={[0.16, 0.095, 20]} />
          </mesh>
          <mesh position={[0, 0.405, 0]} castShadow material={brassMat}>
            <sphereGeometry args={[0.025, 12, 10]} />
          </mesh>
        </group>
      </group>

      {/* Dinding halaman rendah berplester + pilar batu (cahaya golden bisa mengalir masuk & langit terlihat) */}
      <group position={[0, 0, -4.6]}>
        {/* Dinding rendah kiri-kanan & tengah dengan bukaan di atas */}
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[14, 1.24, 0.36]} />
        </mesh>
        <mesh position={[0, 1.3, 0.02]} castShadow receiveShadow material={roofMat}>
          <boxGeometry args={[14.3, 0.14, 0.5]} />
        </mesh>
        {[-2.8, 2.8].map((px, i) => (
          <group key={i} position={[px, 0, 0.08]}>
            <mesh position={[0, 1.25, 0]} castShadow receiveShadow material={pillarMat}>
              <boxGeometry args={[0.62, 2.5, 0.62]} />
            </mesh>
            <mesh position={[0, 2.58, 0]} castShadow receiveShadow material={roofMat}>
              <boxGeometry args={[0.78, 0.16, 0.78]} />
            </mesh>
          </group>
        ))}
        {/* Bangunan latar jauh agar aerial haze + DOF terlihat berlapis */}
        <mesh position={[-5.2, 2.1, -9]} castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[4.4, 4.2, 3.2]} />
        </mesh>
        <mesh position={[-5.2, 4.5, -9]} castShadow receiveShadow material={roofMat}>
          <coneGeometry args={[3.4, 1.6, 4]} />
        </mesh>
        <mesh position={[5.6, 1.8, -12]} castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[4.8, 3.6, 3.4]} />
        </mesh>
        <mesh position={[5.6, 3.9, -12]} castShadow receiveShadow material={roofMat}>
          <coneGeometry args={[3.6, 1.4, 4]} />
        </mesh>
      </group>

      {/* Awan cumulus 3-nada di langit (layer NOINK agar bebas outline 3D) */}
      <mesh
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
        position={[-7.5, 11.5, -42]}
      >
        <planeGeometry args={[18, 9]} />
        <meshBasicMaterial map={cloudTex} transparent depthWrite={false} fog={false} />
      </mesh>
      <mesh
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
        position={[8.5, 13.5, -52]}
      >
        <planeGeometry args={[22, 11]} />
        <meshBasicMaterial map={cloudTex} transparent depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
};
