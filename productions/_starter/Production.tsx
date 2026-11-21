import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Billboard, PostStack, Stage, kickOffset, sampleCamera, shotAt, type CamPose, type Vec3 } from '../../engine';
import { ACTORS, poseFor } from './cast';
import { LOOK, POST, lightFor } from './look';
import { SetPieces } from './set';
import { CAMS, DOF, KICKS, SHOTS } from './shots';
import { PREVIEW_VOICE } from './words';

const CameraRig: React.FC<{ pose: CamPose; shake: { dx: number; dy: number; droll: number } }> = ({ pose, shake }) => {
  const cam = useThree().camera as PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const StarterProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame);
  const shot = shotAt(SHOTS, frame);
  const post = { ...POST, blur: DOF[shot.id] ?? 0, focus: dist(pose.pos, pose.look) };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {PREVIEW_VOICE ? <Audio src={staticFile(PREVIEW_VOICE)} /> : null}
      <ThreeCanvas width={width} height={height} camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}>
        <CameraRig pose={pose} shake={shake} />
        <Stage light={lightFor(shot.light)} ground={LOOK.ground}>
          <SetPieces />
          {ACTORS.map((a) => (
            <Billboard key={a.id} position={a.base as Vec3} faceTo={pose.pos} look={a.look} pose={poseFor(a.id, frame)} />
          ))}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
