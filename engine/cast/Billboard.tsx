import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { BeanLook, BeanPose, CANVAS_H, CANVAS_W, DEFAULT_LOOK, drawBean } from './bean';

export type BillboardProps = {
  position: Vec3;
  /** Posisi kamera saat ini. Kartu selalu menghadap ke sini. */
  faceTo: Vec3;
  pose: BeanPose;
  look?: BeanLook;
  /** Tinggi karakter di dunia, meter. */
  height?: number;
};

const blobTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(10,6,20,0.55)');
    grad.addColorStop(1, 'rgba(10,6,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

/** Karakter 2D sebagai kartu yang menyala oleh lampu scene, plus bayangan kontak di lantai. */
export const Billboard: React.FC<BillboardProps> = ({ position, faceTo, pose, look = DEFAULT_LOOK, height = 1.8 }) => {
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
  }, [look, pose.face, pose.blink, pose.armsUp, pose.step, pose.lean]);

  // Kartu harus berasio sama dengan kanvas gambar, kalau tidak karakter melar.
  // Lepaskan memori GPU dan kanvas setiap kali texture diganti (satu texture baru per frame).
  useEffect(() => () => texture.dispose(), [texture]);

  const w = height * (CANVAS_W / CANVAS_H);
  const yaw = Math.atan2(faceTo[0] - position[0], faceTo[2] - position[2]);
  // telapak kaki ada di 96% tinggi kanvas
  const lift = height * 0.04;

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, height / 2 - lift, 0]}>
        <planeGeometry args={[w, height * 1.0]} />
        <meshLambertMaterial map={texture} transparent alphaTest={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[height * 0.32, 24]} />
        <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} />
      </mesh>
    </group>
  );
};
