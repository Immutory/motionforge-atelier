import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraBasis, type CamPose, type CameraShake } from './camera';

export type CameraRigProps = {
  pose: CamPose;
  shake?: CameraShake;
};

/**
 * Komponen `<CameraRig />` kanonik studio (Atelier v3.0).
 * Menggantikan duplikasi CameraRig di tiap produksi. Mendukung getaran berbasis ruang lokal kamera
 * (`shake.dz` terproyeksi dari `kickOffset(kicks, frame, pose)` maupun format lama `{ dx, dy, droll }`).
 */
export const CameraRig: React.FC<CameraRigProps> = ({ pose, shake }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  let ox = 0;
  let oy = 0;
  let oz = 0;
  const droll = shake?.droll ?? 0;

  if (shake && (shake.dx !== 0 || shake.dy !== 0 || (shake.dz ?? 0) !== 0)) {
    if (shake.dz !== undefined) {
      ox = shake.dx;
      oy = shake.dy;
      oz = shake.dz;
    } else {
      // Proyeksi otomatis `{ dx, dy }` ke basis lokal kamera (`right`, `up`) agar konsisten di semua sudut yaw.
      const { right, up } = cameraBasis(pose);
      ox = right[0] * shake.dx + up[0] * shake.dy;
      oy = right[1] * shake.dx + up[1] * shake.dy;
      oz = right[2] * shake.dx + up[2] * shake.dy;
    }
  }

  cam.position.set(pose.pos[0] + ox, pose.pos[1] + oy, pose.pos[2] + oz);
  cam.fov = pose.fov;
  cam.lookAt(pose.look[0] + ox, pose.look[1] + oy, pose.look[2] + oz);
  cam.rotateZ(((pose.roll + droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};
