import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ActorBillboard,
  DEFAULT_POST,
  GRADE_PRESETS,
  LIGHTS,
  PostStack,
  Stage,
  blinkLidAt,
  cobbleTexture,
  kickOffset,
  sampleCamera,
  smootherstep,
  type ActorPose,
  type CamKey,
  type CamPose,
  type CastPresetId,
  type HandProp,
  type PostParams,
  type Vec3,
} from '../../engine';
import { SetPieces } from './LabStageSet';

const CameraRig: React.FC<{ pose: CamPose; shake?: { dx: number; dy: number; droll: number } }> = ({
  pose,
  shake = { dx: 0, dy: 0, droll: 0 },
}) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

type ShowcaseSlide = {
  from: number;
  to: number;
  light: 'noon' | 'amber';
  pose: CamPose;
  blur: number;
  title: string;
  subtitle: string;
  focusActor?: CastPresetId;
  explainProp?: HandProp;
};

const SLIDES: ShowcaseSlide[] = [
  {
    from: 0,
    to: 30,
    light: 'noon',
    pose: { pos: [0, 1.98, 10.9], look: [0, 1.32, 0], fov: 40, roll: 0 },
    blur: 0,
    title: 'LINEUP NPC WARGA SEHARI-HARI INDONESIA',
    subtitle: 'ID-5 Pak Budi (RT) · ID-6 Bu Siti (Warung) · ID-7 Raka (SMA) · ID-8 Bang Udin (Ojol)',
  },
  {
    from: 30,
    to: 60,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-5 — PAK BUDI (PAK RT / BAPAK KOMPLEK)',
    subtitle: 'Kemeja Kotak, Sarung Tenun & Kumis · Kiri: Kopi Tubruk · Kanan: Kaget Heboh',
    focusActor: 'pakBudi',
    explainProp: 'kopi',
  },
  {
    from: 60,
    to: 90,
    light: 'amber',
    pose: { pos: [0, 1.54, 6.7], look: [0, 1.26, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-6 — BU SITI (IBU WARUNG / EMAK-EMAK)',
    subtitle: 'Cepol Tinggi, Daster Bunga & Celemek · Kiri: Sodet/Spatula · Kanan: Kaget Heboh',
    focusActor: 'buSiti',
    explainProp: 'sodet',
  },
  {
    from: 90,
    to: 120,
    light: 'amber',
    pose: { pos: [0, 1.52, 6.7], look: [0, 1.24, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-7 — RAKA (PELAJAR SMA INDONESIA)',
    subtitle: 'Seragam Putih-Abu, Dasi OSIS & Ransel · Kiri: Smartphone · Kanan: Plot-Twist',
    focusActor: 'raka',
    explainProp: 'phone',
  },
  {
    from: 120,
    to: 150,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-8 — BANG UDIN (ABANG OJOL / KURIR)',
    subtitle: 'Jaket Hijau Reflektor & Helm Visor · Kiri: HP Peta · Kanan: Helm Loncat',
    focusActor: 'bangUdin',
    explainProp: 'phoneMap',
  },
];

// Segmen animasi live 30 fps (frame 150..239 = 3 detik):
// Pak Budi (Pak RT) & Bang Udin (Ojol) berjalan bouncy masuk -> ngobrol kopi & peta -> plot-twist helm loncat!
const ANIM_START = 150;
const SHOCK_F = 216;
const ANIM_CAMS: CamKey[] = [
  { frame: ANIM_START, pose: { pos: [0, 1.9, 8.8], look: [0, 1.32, 0.1], fov: 39, roll: 0 } },
  { frame: 186, glide: 30, pose: { pos: [0.2, 1.62, 6.4], look: [0, 1.3, 0.2], fov: 37, roll: 0 } },
  { frame: SHOCK_F, cut: true, pose: { pos: [0, 1.52, 5.5], look: [0, 1.3, 0.2], fov: 35, roll: -2.5 } },
];
const ANIM_KICKS = [{ frame: SHOCK_F, strength: 0.045, length: 7 }];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const WargaProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isAnim = frame >= ANIM_START;
  const slide = SLIDES.find((s) => frame >= s.from && frame < s.to) ?? SLIDES[0];

  const lightId: 'noon' | 'amber' = isAnim ? (frame >= SHOCK_F ? 'amber' : 'noon') : slide.light;
  const light = LIGHTS[lightId];
  const grade = GRADE_PRESETS[lightId];

  const camPose = isAnim ? sampleCamera(ANIM_CAMS, frame) : slide.pose;
  const shake = isAnim ? kickOffset(ANIM_KICKS, frame) : { dx: 0, dy: 0, droll: 0 };
  const blur = isAnim ? (frame >= SHOCK_F ? 0.78 : frame >= 186 ? 0.35 : 0) : slide.blur;

  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur,
    focus: dist(camPose.pos, camPose.look),
    grade,
  };

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
  const s = height / 1920;

  const walkT = smootherstep((frame - ANIM_START) / 34);
  const pakX = -1.75 + walkT * 1.15;
  const ojolX = 1.75 - walkT * 1.15;
  const walkPhase = ((frame - ANIM_START) / 22) % 1;
  const talkWaveVal = Math.max(0, Math.sin((frame - 186) * 0.65) * 0.5 + 0.5);

  const pakAnimPose: ActorPose =
    frame < 185
      ? { face: 'happy', stance: 'walk', walkPhase, blink: blinkLidAt(frame, 5, 30), facing: 0.38, view: 'threeQuarter' }
      : frame < SHOCK_F
        ? {
            face: 'happy',
            stance: 'stand',
            leftArm: 'point',
            rightArm: 'hold',
            rightProp: 'kopi',
            talk: talkWaveVal,
            blink: blinkLidAt(frame, 5, 30, [186, SHOCK_F]),
            facing: 0.32,
            view: 'threeQuarter',
          }
        : {
            face: 'shock',
            stance: 'stand',
            leftArm: 'raise',
            rightArm: 'raise',
            fx: 'shock',
            blink: blinkLidAt(frame, 5, 30, [SHOCK_F]),
            facing: 0.08,
            view: 'front',
          };

  const ojolAnimPose: ActorPose =
    frame < 185
      ? {
          face: 'happy',
          stance: 'walk',
          walkPhase: (walkPhase + 0.45) % 1,
          blink: blinkLidAt(frame, 8, 30),
          facing: -0.38,
          view: 'threeQuarter',
        }
      : frame < SHOCK_F
        ? {
            face: 'happy',
            stance: 'stand',
            leftArm: 'hold',
            leftProp: 'phoneMap',
            rightArm: 'hip',
            talk: Math.max(0, Math.sin((frame - 196) * 0.55) * 0.45),
            blink: blinkLidAt(frame, 8, 30, [SHOCK_F]),
            facing: -0.32,
            view: 'threeQuarter',
          }
        : {
            face: 'shock',
            stance: 'stand',
            leftArm: 'raise',
            rightArm: 'raise',
            hatPop: 1,
            fx: 'shock',
            blink: blinkLidAt(frame, 8, 30, [SHOCK_F]),
            facing: -0.08,
            view: 'front',
          };

  const title = isAnim
    ? frame < 185
      ? 'ANIMASI WARGA — JALAN BOUNCY (30 FPS)'
      : frame < SHOCK_F
        ? 'ANIMASI WARGA — NGOBROL KOPI & PETA OJOL'
        : 'ANIMASI WARGA — PLOT-TWIST HELM LONCAT!'
    : slide.title;
  const subtitle = isAnim
    ? 'Pak Budi (Pak RT) & Bang Udin (Ojol) · Bouncy Walk · 4-Frame Blink · Lip-Sync · Kick'
    : slide.subtitle;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: camPose.fov, position: camPose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={camPose} shake={shake} />
        <Stage light={light} ground="#d9c59b" groundMap={groundMap} camPos={camPose.pos} camLook={camPose.look}>
          <SetPieces lightId={lightId} />

          {isAnim ? (
            <>
              <ActorBillboard
                actor="pakBudi"
                pose={pakAnimPose}
                position={[pakX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUdin"
                pose={ojolAnimPose}
                position={[ojolX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : !slide.focusActor ? (
            <>
              <ActorBillboard
                actor="pakBudi"
                pose={{ face: 'happy', stance: 'stand', rightArm: 'hold', rightProp: 'kopi', facing: 0.34, view: 'threeQuarter' }}
                position={[-1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="buSiti"
                pose={{ face: 'happy', stance: 'stand', rightArm: 'hold', rightProp: 'sodet', facing: 0.24, view: 'threeQuarter' }}
                position={[-0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.9}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="raka"
                pose={{ face: 'happy', stance: 'stand', leftArm: 'hold', leftProp: 'phone', facing: -0.24, view: 'threeQuarter' }}
                position={[0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.88}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUdin"
                pose={{ face: 'happy', stance: 'stand', leftArm: 'hold', leftProp: 'phoneMap', facing: -0.34, view: 'threeQuarter' }}
                position={[1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={2.0}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : (
            <>
              <ActorBillboard
                actor={slide.focusActor}
                pose={{
                  face: 'happy',
                  stance: 'stand',
                  leftArm: 'point',
                  rightArm: 'hold',
                  rightProp: slide.explainProp ?? 'none',
                  talk: 0.78,
                  facing: 0.32,
                  view: 'threeQuarter',
                }}
                position={[-0.6, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusActor === 'raka' ? 1.9 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor={slide.focusActor}
                pose={{
                  face: 'shock',
                  stance: 'stand',
                  leftArm: 'raise',
                  rightArm: 'raise',
                  hatPop: 1,
                  fx: 'shock',
                  facing: 0.08,
                  view: 'front',
                }}
                position={[0.62, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusActor === 'raka' ? 1.9 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* Header label */}
      <div
        style={{
          position: 'absolute',
          top: 52 * s,
          left: 36 * s,
          right: 36 * s,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(24, 16, 36, 0.86)',
            color: '#fff8ec',
            padding: `${14 * s}px ${26 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(255, 224, 155, 0.42)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ fontSize: 31 * s, fontWeight: 800, letterSpacing: 0.8 }}>{title}</div>
          <div style={{ fontSize: 20 * s, fontWeight: 600, color: '#ffd998', marginTop: 6 * s }}>{subtitle}</div>
        </div>
      </div>

      {!isAnim && !slide.focusActor && (
        <div
          style={{
            position: 'absolute',
            bottom: 120 * s,
            left: 20 * s,
            right: 20 * s,
            display: 'flex',
            justifyContent: 'space-around',
            gap: 10 * s,
            pointerEvents: 'none',
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          {['ID-5 Pak Budi', 'ID-6 Bu Siti', 'ID-7 Raka', 'ID-8 Bang Udin'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(24, 16, 36, 0.86)',
                color: '#fff8ec',
                padding: `${9 * s}px ${15 * s}px`,
                borderRadius: 12 * s,
                fontSize: 20 * s,
                fontWeight: 800,
                border: `${2.5 * s}px solid rgba(255, 224, 155, 0.45)`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
