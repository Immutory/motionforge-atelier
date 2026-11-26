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
  actorWalkCycleMeters,
  blinkLidAt,
  cobbleTexture,
  kickOffset,
  sampleCamera,
  springPop,
  talkWave,
  type CamKey,
  type CamPose,
  type Kick,
  type PostParams,
  type Vec3,
} from '../../engine';
import { SetPieces } from './LabStageSet';

const FPS = 30;
const SHOCK_AT = 215;

const CameraRig: React.FC<{ pose: CamPose; shake: { dx: number; dy: number; droll: number } }> = ({ pose, shake }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

const ANIM_CAMS: CamKey[] = [
  { frame: 150, pose: { pos: [0, 1.82, 7.4], look: [0.15, 1.18, 0.25], fov: 38, roll: 0 }, cut: true },
  { frame: 186, pose: { pos: [0, 1.58, 4.55], look: [0, 1.28, 0.32], fov: 35, roll: 0 }, glide: 22 },
  { frame: SHOCK_AT, pose: { pos: [0.04, 1.54, 3.65], look: [0, 1.32, 0.32], fov: 34, roll: -1.5 }, cut: true },
];

const ANIM_KICKS: Kick[] = [{ frame: SHOCK_AT, strength: 0.055, length: 8 }];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Showcase & Animasi Resmi 30 FPS untuk Karakter Lokal: Ebot (`CAST_PRESETS.ebot`).
 * - Slide 0 (f0..29): Hero Portrait Close-Up (kemiripan wajah, kulit sawo matang hangat, outer earth-tone)
 * - Slide 1 (f30..59): Turnaround 4 Sudut Pandang (front · threeQuarter · side planted walk · back taper fade)
 * - Slide 2 (f60..89): 4 Mood & Gaya Lokal Ebot (Santai Kopi · Fokus Ngoding · Jongkok Warkop · Shock Plot-Twist)
 * - Slide 3 (f90..149): Ebot Bersama Cast Lokal + Varian Kostum Batik Nusantara
 * - Live Action 30 FPS (f150..239): Planted Gait Walk -> Sapa & Auto Lip-Sync -> Plot-Twist Shock!
 */
export const EbotProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const isAnim = frame >= 150;
  const slideIdx = isAnim ? 4 : frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : 3;

  const isShock = frame >= SHOCK_AT;
  const lightId: 'noon' | 'amber' = slideIdx === 3 || isShock ? 'amber' : 'noon';
  const light = LIGHTS[lightId];
  const grade = GRADE_PRESETS[lightId];

  const staticCam: CamPose =
    slideIdx === 0
      ? { pos: [0, 1.58, 4.35], look: [0, 1.24, 0.32], fov: 35, roll: 0 }
      : { pos: [0, 1.98, 10.9], look: [0, 1.32, 0], fov: 40, roll: 0 };

  const pose = isAnim ? sampleCamera(ANIM_CAMS, frame) : staticCam;
  const shake = isAnim ? kickOffset(ANIM_KICKS, frame) : { dx: 0, dy: 0, droll: 0 };

  const blur = slideIdx === 0 || slideIdx === 3 || isShock ? 0.6 : 0;
  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur,
    focus: dist(pose.pos, pose.look),
    grade,
  };

  // Animasi Live Action 30 FPS (frame 150..239) dengan planted gait bebas selip!
  const walkT = Math.max(0, Math.min(1, (frame - 150) / 30));
  const walkSmooth = walkT * walkT * (3 - 2 * walkT);
  const startX = 1.18;
  const animX = startX * (1 - walkSmooth);
  const traveledMeters = startX - animX;
  const cycleM = actorWalkCycleMeters(1.96, 'threeQuarter', 1);
  const plantedPhase = (traveledMeters / cycleM) % 1;
  const isWalking = frame >= 150 && frame < 180;
  const isSmug = frame >= 196 && frame < SHOCK_AT;

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
  const s = height / 1920;

  const header =
    slideIdx === 0
      ? {
          title: 'KARAKTER LOKAL ORISINAL — EBOT',
          sub: 'Wajah Mirip Referensi · Kulit Sawo Matang Hangat · Fade Crop · Outer Rajut Earth-Tone',
        }
      : slideIdx === 1
        ? {
            title: 'EBOT — TURNAROUND 4 SUDUT PANDANG',
            sub: 'front (sapa) · threeQuarter (santai) · side (planted walk) · back (taper fade & rajut)',
          }
        : slideIdx === 2
          ? {
              title: 'EBOT — 4 MOOD & GAYA TONGKRONGAN LOKAL',
              sub: 'Santai Es Kopi · Fokus Laptop · Jongkok Warkop + Es Teh · Shock Komedi!',
            }
          : slideIdx === 3
            ? {
                title: 'EBOT — BERSAMA CAST LOKAL & VARIAN BATIK',
                sub: 'Terintegrasi penuh di engine/cast/ (CAST_PRESETS.ebot + 1-baris override kostum)',
              }
            : {
                title: isShock
                  ? 'PLOT-TWIST: TAGIHAN NONGKRONG DATANG!'
                  : isWalking
                    ? 'LIVE ACTION 30 FPS — EBOT MASUK (PLANTED GAIT)'
                    : 'LIVE ACTION 30 FPS — AUTO LIP-SYNC & HEAD-TILT',
                sub: 'Ebot · Uji jalan menapak -> sapa & bicara lip-sync -> reaksi kaget ekspresif',
              };

  const labels =
    slideIdx === 0
      ? ['ID: ebot · Sawo Matang Hangat · Gaya Kasual Lokal']
      : slideIdx === 1
        ? ['front', 'threeQuarter', 'side (walk)', 'back (taper fade)']
        : slideIdx === 2
          ? ['happy + coffeeCup', 'focus + laptop', 'squat + esteh', 'shock + springPop']
          : slideIdx === 3
            ? ['Ebot (Kasual)', 'Ebot (Batik)', 'Bang Utoh', 'Bang Dimas']
            : [];

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} ground="#d9c59b" groundMap={groundMap} camPos={pose.pos} camLook={pose.look}>
          <SetPieces lightId={lightId} />

          {/* Slide 0: Hero Portrait Close-Up Ebot (sudut 3/4 kanan ke arah kiri sesuai foto asli!) */}
          {slideIdx === 0 && (
            <ActorBillboard
              actor="ebot"
              position={[0, 0, 0.34]}
              faceTo={pose.pos}
              height={1.98}
              pose={{
                face: 'neutral',
                view: 'threeQuarter',
                stance: 'stand',
                leftArm: 'rest',
                rightArm: 'hold',
                rightProp: 'coffeeCup',
                facing: 0.28,
                headTilt: -2.5,
                lean: 0.8,
              }}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}

          {/* Slide 1: 4 Sudut Pandang (front / 3-4 / side / back) */}
          {slideIdx === 1 && (
            <>
              <ActorBillboard
                actor="ebot"
                position={[-1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'happy', view: 'front', leftArm: 'hip', rightArm: 'wave' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[-0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'neutral', view: 'threeQuarter', leftArm: 'rest', rightArm: 'hip', facing: 0.32, headTilt: -3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{
                  face: 'happy',
                  view: 'side',
                  stance: 'walk',
                  gait: 'planted',
                  walkPhase: 0.22,
                  rightArm: 'hold',
                  rightProp: 'coffeeCup',
                  facing: 1,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'neutral', view: 'back', leftArm: 'rest', rightArm: 'rest' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 2: 4 Mood & Gaya Tongkrongan Lokal Ebot */}
          {slideIdx === 2 && (
            <>
              <ActorBillboard
                actor="ebot"
                position={[-1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'happy', leftArm: 'hip', rightArm: 'hold', rightProp: 'coffeeCup', facing: 0.28 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[-0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'focus', leftArm: 'rest', rightArm: 'hold', rightProp: 'laptop', facing: 0.22 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'smug', stance: 'squat', leftArm: 'rest', rightArm: 'hold', rightProp: 'esteh', facing: -0.24, headTilt: 5 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                position={[1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'shock', leftArm: 'raise', rightArm: 'raise', facing: -0.1 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 3: Ebot Kasual + Ebot Batik Lokal + Bang Utoh + Bang Dimas */}
          {slideIdx === 3 && (
            <>
              <ActorBillboard
                actor="ebot"
                position={[-1.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.96}
                pose={{
                  face: 'laugh',
                  leftArm: 'hip',
                  rightArm: 'wave',
                  facing: 0.32,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="ebot"
                overrides={{
                  outfit: 'batik',
                  outfitColor: '#3b2b24',
                  outfitShade: '#261a15',
                  accentColor: '#e2a94b',
                }}
                position={[-0.48, 0, 0.32]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'smug', leftArm: 'rest', rightArm: 'hold', rightProp: 'kopi', facing: 0.24, headTilt: -4 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[0.48, 0, 0.32]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'happy', leftArm: 'hold', leftProp: 'laptop', rightArm: 'point', facing: -0.28 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="dimas"
                position={[1.42, 0, -0.05]}
                faceTo={pose.pos}
                height={1.94}
                pose={{ face: 'happy', leftArm: 'hold', leftProp: 'esteh', rightArm: 'hip', facing: -0.32 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Live Action 30 FPS (f150..239): Ebot masuk planted gait -> bicara lip-sync -> shock komedi! */}
          {isAnim && (
            <ActorBillboard
              actor="ebot"
              position={[animX, 0, 0.35]}
              faceTo={pose.pos}
              height={1.98}
              pose={{
                face: isShock ? 'shock' : isWalking ? 'happy' : isSmug ? 'smug' : 'neutral',
                blink: blinkLidAt(frame, 7, FPS, [180, 196, SHOCK_AT - 2]),
                talk: isShock ? 0 : talkWave(frame, frame >= 166 && frame < SHOCK_AT, 2),
                stance: isWalking ? 'walk' : 'stand',
                gait: isWalking ? 'planted' : 'swing',
                walkPhase: isWalking ? plantedPhase : 0,
                leftArm: isShock ? 'raise' : isWalking ? 'rest' : 'hip',
                leftProp: 'none',
                rightArm: isShock ? 'raise' : isWalking ? 'hold' : isSmug ? 'point' : 'hold',
                rightProp: isShock || isSmug ? 'none' : 'coffeeCup',
                hatPop: isShock ? springPop(frame, SHOCK_AT, 1.25, 12) : 0,
                facing: isWalking ? -0.36 : isShock ? 0.08 : 0.28,
                headTilt: isShock ? -6 : isSmug ? 5 : Math.sin(frame / 15) * 2.5,
                lean: isShock ? -4.5 : isWalking ? undefined : Math.sin(frame / 14) * 1.3,
              }}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 52 * s,
          left: 34 * s,
          right: 34 * s,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(28, 22, 20, 0.9)',
            color: '#fdf8f2',
            padding: `${14 * s}px ${26 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(212, 168, 142, 0.65)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.38)`,
          }}
        >
          <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: 0.7 }}>{header.title}</div>
          <div style={{ fontSize: 19 * s, fontWeight: 600, color: '#e8c4a6', marginTop: 6 * s }}>{header.sub}</div>
        </div>
      </div>

      {/* Bottom labels */}
      {labels.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 118 * s,
            left: 18 * s,
            right: 18 * s,
            display: 'flex',
            justifyContent: 'space-around',
            gap: 10 * s,
            pointerEvents: 'none',
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          {labels.map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(28, 22, 20, 0.88)',
                color: '#fdf8f2',
                padding: `${10 * s}px ${16 * s}px`,
                borderRadius: 12 * s,
                fontSize: 19 * s,
                fontWeight: 800,
                border: `${2.5 * s}px solid rgba(212, 168, 142, 0.6)`,
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
