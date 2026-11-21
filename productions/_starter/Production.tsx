import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import * as THREE from 'three';
import {
  ActorBillboard,
  PostStack,
  Stage,
  cobbleTexture,
  kickOffset,
  sampleCamera,
  shotAt,
  type CamPose,
  type Vec3,
} from '../../engine';
import { ACTORS, poseFor } from './cast';
import { LOOK, lightFor, postFor } from './look';
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
  const light = lightFor(shot.light);
  const post = postFor(shot.light, DOF[shot.id] ?? 0, dist(pose.pos, pose.look));
  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {PREVIEW_VOICE ? <Audio src={staticFile(PREVIEW_VOICE)} /> : null}
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} ground={LOOK.ground} groundMap={groundMap} camPos={pose.pos} camLook={pose.look}>
          <SetPieces lightId={shot.light} />
          {ACTORS.map((a) => (
            <ActorBillboard
              key={a.id}
              actor={a.preset}
              overrides={a.overrides}
              position={a.base}
              faceTo={pose.pos}
              pose={poseFor(a.id, frame)}
              height={a.height}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          ))}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
