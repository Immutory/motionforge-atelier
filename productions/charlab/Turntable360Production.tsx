import React, { useEffect, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CameraRig,
  CatBillboard,
  GRADE_PRESETS,
  LIGHTS,
  Phone3D,
  POST_HYBRID_25D,
  PostStack,
  Stage,
  actorHandWorldPos,
  blinkLidAt,
  cobbleTexture,
  craneDive,
  kickOffset,
  orbitArc,
  punchIn,
  resolve25DView,
  sampleCamera,
  viewAxisFocus,
  type CamKey,
  type Kick,
  type PostParams,
  type Vec3,
} from '../../engine';
import { SetPieces } from './LabStageSet';

const FPS = 30;
const TURN_FRAMES = 120;

const HERO_SPOTS = {
  arya: [-3.7, 0, -0.92] as Vec3,
  dimas: [-2.49, 0, -0.98] as Vec3,
  tio: [-1.25, 0, -1.04] as Vec3,
  buSiti: [-0.12, 0, -1.06] as Vec3,
  pakBudi: [1.14, 0, -1.04] as Vec3,
  bangUdin: [2.49, 0, -0.98] as Vec3,
  mbakYuni: [3.7, 0, -0.92] as Vec3,
  raka: [-2.58, 0, 0.36] as Vec3,
  rara: [-1.52, 0, 0.45] as Vec3,
  utoh: [-0.5, 0, 0.54] as Vec3,
  ebot: [0.5, 0, 0.54] as Vec3,
  pakUjang: [1.62, 0, 0.45] as Vec3,
  saka: [2.58, 0, 0.36] as Vec3,
  oyen: [-1.42, 0, 1.08] as Vec3,
  belang: [0, 0, 1.12] as Vec3,
  abu: [1.42, 0, 1.08] as Vec3,
};

const ORBIT_KEYS = orbitArc(120, [0, 1.15, -0.1], 6.4, 0, 75, 1.65, 44, 26);
const CAMS: CamKey[] = [
  ...craneDive(
    0,
    { pos: [0, 3.25, 7.6], look: [0, 1.05, -0.1], fov: 44, roll: 0 },
    { pos: [0, 1.65, 6.8], look: [0, 1.05, -0.1], fov: 44, roll: 0 },
    12,
  ),
  {
    frame: 14,
    cut: false,
    glide: 2,
    creepRate: 0,
    pose: { pos: [0, 1.65, 6.8], look: [0, 1.05, -0.1], fov: 44, roll: 0 },
  },
  ...ORBIT_KEYS,
  ...punchIn(
    148,
    { pos: [1.44, 1.56, 4.65], look: [1.62, 1.38, 0.45], fov: 40, roll: 0 },
    [1.62, 1.52, 0.45],
    1.75,
    12,
    -1.5,
  ),
];

const KICKS: Kick[] = [{ frame: 158, strength: 0.05, length: 8, mode: 'snap15hz', fovPunch: -2.2 }];

/**
 * Turnaround QC 360° Resmi (Atelier v4.8 — Konsistensi 100% Gaya Rambut Lama HEAD di Seluruh Sudut 360°, Pak Ujang Botak):
 * - f0..119: `craneDive` -> turnaround penuh 0°..360° staggered bebas saling-tutupi untuk SEMUA 13 karakter manusia
 *   (`arya`, `dimas`, `tio`, `buSiti`, `pakBudi`, `bangUdin`, `mbakYuni`, `raka`, `rara`, `bangUtoh`, `ebot`, `pakUjang`, `saka`)
 *   + 3 kucing 2D (`oyen`, `belang`, `abu`).
 * - f120..179 (`amber` golden hour): `orbitArc` -> `punchIn` + `snap15hz` ke `pakUjang` shock (`hatPop: 1`, kepala botak berkilau!).
 */
export const Turntable360Production: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame, pose);
  const isOrbitPhase = frame >= TURN_FRAMES;
  const lightId: 'noon' | 'amber' = isOrbitPhase || frame >= 60 ? 'amber' : 'noon';
  const light = LIGHTS[lightId];
  const grade = GRADE_PRESETS[lightId];
  const focusTarget = frame >= 148 ? ([1.62, 1.52, 0.45] as Vec3) : HERO_SPOTS.utoh;
  const focus = viewAxisFocus(pose.pos, pose.look, focusTarget);

  const post: PostParams = {
    ...POST_HYBRID_25D,
    ink: {
      ...POST_HYBRID_25D.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: isOrbitPhase ? 0.35 : 0,
    focus,
    grade,
  };

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
  useEffect(() => () => groundMap.dispose(), [groundMap]);

  const turnAngle = isOrbitPhase ? 0 : ((frame % TURN_FRAMES) / TURN_FRAMES) * 360;
  const wrappedYaw = ((turnAngle + 180) % 360) - 180;
  const yawForSpot = (spot: Vec3) =>
    isOrbitPhase ? resolve25DView(spot, 0, pose.pos).yawDeg : wrappedYaw;

  const walkPh = (frame % 30) / 30;
  const utohYaw = yawForSpot(HERO_SPOTS.utoh);
  const utohView = resolve25DView(HERO_SPOTS.utoh, isOrbitPhase ? 0 : -utohYaw, pose.pos);
  const utohPose = {
    face: isOrbitPhase ? ('happy' as const) : ('smug' as const),
    blink: blinkLidAt(frame, 1, FPS),
    stance: 'stand' as const,
    view: utohView.view,
    facing: utohView.facing,
    yawDeg: utohYaw,
    rightArm: 'hold' as const,
    leftArm: 'wave' as const,
    leftProp: 'none' as const,
    rightProp: 'none' as const,
  };
  const phonePos = actorHandWorldPos('bangUtoh', utohPose, 1, HERO_SPOTS.utoh, pose.pos, 1.96, {
    forwardOffset: 0.03,
  });

  const isUjangShock = frame >= 156;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} groundMap={groundMap} showGround camPos={pose.pos} camLook={pose.look}>
          <SetPieces lightId={lightId} />

          <ActorBillboard
            actor="raka"
            position={HERO_SPOTS.raka}
            faceTo={pose.pos}
            height={1.9}
            castShadow={light.card.castShadow}
            pose={{
              face: 'smug',
              blink: blinkLidAt(frame, 8, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.raka),
              leftArm: 'rest',
              rightArm: 'wave',
            }}
          />

          <ActorBillboard
            actor="buSiti"
            position={HERO_SPOTS.buSiti}
            faceTo={pose.pos}
            height={1.86}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 9, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.buSiti),
              leftArm: 'hip',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="saka"
            position={HERO_SPOTS.saka}
            faceTo={pose.pos}
            height={1.93}
            castShadow={light.card.castShadow}
            pose={{
              face: 'focus',
              blink: blinkLidAt(frame, 10, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.saka),
              leftArm: 'rest',
              rightArm: 'hip',
            }}
          />

          <ActorBillboard
            actor="arya"
            position={HERO_SPOTS.arya}
            faceTo={pose.pos}
            height={1.96}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 11, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.arya),
              leftArm: 'rest',
              rightArm: 'wave',
            }}
          />

          <ActorBillboard
            actor="dimas"
            position={HERO_SPOTS.dimas}
            faceTo={pose.pos}
            height={1.92}
            castShadow={light.card.castShadow}
            pose={{
              face: 'smug',
              blink: blinkLidAt(frame, 12, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.dimas),
              leftArm: 'hip',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="tio"
            position={HERO_SPOTS.tio}
            faceTo={pose.pos}
            height={1.93}
            castShadow={light.card.castShadow}
            pose={{
              face: 'neutral',
              blink: blinkLidAt(frame, 13, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.tio),
              leftArm: 'rest',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="pakBudi"
            position={HERO_SPOTS.pakBudi}
            faceTo={pose.pos}
            height={1.95}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 14, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.pakBudi),
              leftArm: 'hip',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="bangUdin"
            position={HERO_SPOTS.bangUdin}
            faceTo={pose.pos}
            height={1.96}
            castShadow={light.card.castShadow}
            pose={{
              face: 'focus',
              blink: blinkLidAt(frame, 15, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.bangUdin),
              leftArm: 'rest',
              rightArm: 'wave',
            }}
          />

          <ActorBillboard
            actor="mbakYuni"
            position={HERO_SPOTS.mbakYuni}
            faceTo={pose.pos}
            height={1.87}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 16, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.mbakYuni),
              leftArm: 'hip',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="rara"
            position={HERO_SPOTS.rara}
            faceTo={pose.pos}
            height={1.88}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 2, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.rara),
              leftArm: 'hip',
              rightArm: 'rest',
            }}
          />

          <ActorBillboard
            actor="bangUtoh"
            position={HERO_SPOTS.utoh}
            faceTo={pose.pos}
            height={1.96}
            castShadow={light.card.castShadow}
            pose={utohPose}
          />
          <Phone3D position={phonePos} rotation={[0, (utohYaw * Math.PI) / 180, 0]} />

          <ActorBillboard
            actor="ebot"
            position={HERO_SPOTS.ebot}
            faceTo={pose.pos}
            height={1.95}
            castShadow={light.card.castShadow}
            pose={{
              face: 'focus',
              blink: blinkLidAt(frame, 3, FPS),
              stance: 'walk',
              walkPhase: walkPh,
              strideBlend: 1,
              view: 'front',
              yawDeg: yawForSpot(HERO_SPOTS.ebot),
            }}
          />

          <ActorBillboard
            actor="pakUjang"
            position={HERO_SPOTS.pakUjang}
            faceTo={pose.pos}
            height={1.98}
            castShadow={light.card.castShadow}
            pose={{
              face: isUjangShock ? 'shock' : 'neutral',
              hatPop: isUjangShock ? 1 : 0,
              blink: blinkLidAt(frame, 4, FPS),
              stance: 'stand',
              view: 'front',
              yawDeg: isUjangShock ? 10 : yawForSpot(HERO_SPOTS.pakUjang),
              leftArm: isUjangShock ? 'raise' : 'rest',
              rightArm: isUjangShock ? 'raise' : 'wave',
            }}
          />

          <CatBillboard
            cat="oyen"
            position={HERO_SPOTS.oyen}
            faceTo={pose.pos}
            height={0.62}
            castShadow={light.card.castShadow}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 5, FPS),
              stance: 'walk',
              walkPhase: walkPh,
              tailPhase: frame * 0.14,
              yawDeg: yawForSpot(HERO_SPOTS.oyen),
            }}
          />

          <CatBillboard
            cat="belang"
            position={HERO_SPOTS.belang}
            faceTo={pose.pos}
            height={0.6}
            castShadow={light.card.castShadow}
            pose={{
              face: 'smug',
              blink: blinkLidAt(frame, 6, FPS),
              stance: 'sit',
              tailPhase: frame * 0.12,
              yawDeg: yawForSpot(HERO_SPOTS.belang),
            }}
          />

          <CatBillboard
            cat="abu"
            position={HERO_SPOTS.abu}
            faceTo={pose.pos}
            height={0.62}
            castShadow={light.card.castShadow}
            pose={{
              face: 'neutral',
              blink: blinkLidAt(frame, 7, FPS),
              stance: 'stand',
              tailPhase: frame * 0.15,
              yawDeg: yawForSpot(HERO_SPOTS.abu),
            }}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
