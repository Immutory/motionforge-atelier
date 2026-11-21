import React from 'react';

/** Milik agent set-designer. Props prosedural sederhana, semua berdiri di lantai y = 0. */
export const SetPieces: React.FC = () => (
  <group>
    {/* meja kecil */}
    <mesh position={[0, 0.4, -1.2]}>
      <boxGeometry args={[1.6, 0.8, 0.8]} />
      <meshLambertMaterial color="#b9784a" />
    </mesh>
    {/* prop insert untuk shot macro */}
    <mesh position={[0.9, 0.9, -1.1]}>
      <cylinderGeometry args={[0.12, 0.12, 0.2, 16]} />
      <meshLambertMaterial color="#e8c34a" />
    </mesh>
    {/* dinding belakang */}
    <mesh position={[0, 2, -4]}>
      <boxGeometry args={[14, 4, 0.2]} />
      <meshLambertMaterial color="#d9a98a" />
    </mesh>
  </group>
);
