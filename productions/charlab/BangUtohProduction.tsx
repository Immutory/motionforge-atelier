import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CameraRig,
  DEFAULT_POST,
  GRADE_PRESETS,
  LIGHTS,
  PostStack,
  Stage,
  blinkLidAt,
  cobbleTexture,
  kickOffset,
  sampleCamera,
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

const ANIM_CAMS: CamKey[] = [
  { frame: 150, pose: { pos: [0, 1.85, 7.6], look: [0.15, 1.15, 0.2], fov: 38, roll: 0 }, cut: true },
  { frame: 186, pose: { pos: [0, 1.62, 5.2], look: [0, 1.18, 0.3], fov: 36, roll: 0 }, glide: 22 },
  { frame: SHOCK_AT, pose: { pos: [0.05, 1.56, 3.85], look: [0, 1.28, 0.3], fov: 35, roll: -1.6 }, cut: true },
];

const ANIM_KICKS: Kick[] = [{ frame: SHOCK_AT, strength: 0.06, length: 8 }];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Showcase & Animasi Resmi 30 FPS untuk Pemeran Utama #1:
 * Bolohoutoh alias Bang Utoh — Mahasiswa S1 Teknik Informatika (memakai engine/cast/).
 */
export const BangUtohProduction: React.FC = () => {
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
      ? { pos: [0, 1.62, 5.1], look: [0, 1.15, 0.25], fov: 37, roll: 0 }
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

  // Animasi Live Action 30 FPS (frame 150..239)
  const walkT = Math.max(0, Math.min(1, (frame - 150) / 30));
  const walkSmooth = walkT * walkT * (3 - 2 * walkT);
  const animX = 1.15 * (1 - walkSmooth);
  const isWalking = frame >= 150 && frame < 180;
  const isSmug = frame >= 196 && frame < SHOCK_AT;

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
  const s = height / 1920;

  const header =
    slideIdx === 0
      ? {
          title: 'PEMERAN UTAMA #1 — BOLOHOUTOH (BANG UTOH)',
          sub: 'Mahasiswa S1 Teknik Informatika · Hoodie HMTI · Headphone · Kacamata Tech · Laptop',
        }
      : slideIdx === 1
        ? {
            title: 'BANG UTOH — TURNAROUND 4 SUDUT PANDANG',
            sub: 'front (sapa) · threeQuarter (laptop) · side (jalan + kopi) · back (hoodie + ransel laptop)',
          }
        : slideIdx === 2
          ? {
              title: 'BANG UTOH — 4 MOOD MAHASISWA S1 INFORMATIKA',
              sub: 'Ngoding Fokus · Begadang Kopi · Ide Ketemu Solusi · Shock Bug Pas Demo!',
            }
          : slideIdx === 3
            ? {
                title: 'BANG UTOH — PEMERAN #1 BERSAMA CAST UTAMA',
                sub: 'Terintegrasi penuh di engine/cast/ (CAST_PRESETS.bangUtoh + prop laptop & coffeeCup)',
              }
            : {
                title: isShock
                  ? 'PLOT-TWIST: ERROR PAS DEMO SKRIPSI!'
                  : isWalking
                    ? 'LIVE ACTION 30 FPS — BANG UTOH MASUK LAB'
                    : 'LIVE ACTION 30 FPS — LIP-SYNC & PRESENTASI KODE',
                sub: 'Bolohoutoh alias Bang Utoh · Uji jalan bouncy -> bicara lip-sync -> shock headphone loncat',
              };

  const labels =
    slideIdx === 0
      ? ['ID: bangUtoh · Pemeran Utama #1 · S1 Teknik Informatika']
      : slideIdx === 1
        ? ['front', 'threeQuarter', 'side (walk)', 'back (ransel)']
        : slideIdx === 2
          ? ['focus + laptop', 'tired + coffeeCup', 'idea + lightbulb', 'shock + headphone pop']
          : slideIdx === 3
            ? ['Bang Utoh (#1)', 'Mas Arya', 'Mbak Rara', 'Raka SMA']
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

          {/* Slide 0: Hero Portrait Pemeran Utama #1 */}
          {slideIdx === 0 && (
            <ActorBillboard
              actor="bangUtoh"
              position={[0, 0, 0.32]}
              faceTo={pose.pos}
              height={1.98}
              pose={{
                face: 'happy',
                view: 'threeQuarter',
                stance: 'stand',
                leftArm: 'hold',
                leftProp: 'coffeeCup',
                rightArm: 'hold',
                rightProp: 'laptop',
                facing: 0.25,
                lean: 1,
              }}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}

          {/* Slide 1: 4 Sudut Pandang (front / 3-4 / side / back) */}
          {slideIdx === 1 && (
            <>
              <ActorBillboard
                actor="bangUtoh"
                position={[-1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'happy', view: 'front', leftArm: 'hip', rightArm: 'wave' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[-0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'smug', view: 'threeQuarter', leftArm: 'hip', rightArm: 'hold', rightProp: 'laptop', facing: 0.34 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{
                  face: 'focus',
                  view: 'side',
                  stance: 'walk',
                  walkPhase: 0.22,
                  rightArm: 'hold',
                  rightProp: 'coffeeCup',
                  facing: 1,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'neutral', view: 'back', leftArm: 'rest', rightArm: 'rest' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 2: 4 Mood Ekspresi Anak Teknik Informatika */}
          {slideIdx === 2 && (
            <>
              <ActorBillboard
                actor="bangUtoh"
                position={[-1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'focus', leftArm: 'hip', rightArm: 'hold', rightProp: 'laptop', facing: 0.3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[-0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'tired', fx: 'sweat', leftArm: 'rest', rightArm: 'hold', rightProp: 'coffeeCup', facing: 0.2 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[0.48, 0, 0.34]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'idea', leftArm: 'hip', rightArm: 'hold', rightProp: 'lightbulb', facing: -0.22 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUtoh"
                position={[1.42, 0, -0.12]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'shock', leftArm: 'raise', rightArm: 'raise', facing: -0.1 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 3: Interaksi Pemeran Utama #1 bersama Cast Utama */}
          {slideIdx === 3 && (
            <>
              <ActorBillboard
                actor="bangUtoh"
                position={[-1.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.96}
                pose={{
                  face: 'laugh',
                  stance: 'sit',
                  leftArm: 'hold',
                  leftProp: 'coffeeCup',
                  rightArm: 'hold',
                  rightProp: 'laptop',
                  facing: 0.34,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="arya"
                position={[-0.48, 0, 0.32]}
                faceTo={pose.pos}
                height={1.96}
                pose={{ face: 'happy', leftArm: 'hip', rightArm: 'point', facing: -0.25 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="rara"
                position={[0.48, 0, 0.32]}
                faceTo={pose.pos}
                height={1.9}
                pose={{ face: 'idea', leftArm: 'hold', leftProp: 'mic', rightArm: 'hip', facing: -0.28 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="raka"
                position={[1.42, 0, -0.05]}
                faceTo={pose.pos}
                height={1.92}
                pose={{ face: 'happy', leftArm: 'hold', leftProp: 'phone', rightArm: 'wave', facing: -0.32 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Live Action 30 FPS (f150..239): Bang Utoh jalan -> presentasi lip-sync -> shock headphone loncat! */}
          {isAnim && (
            <ActorBillboard
              actor="bangUtoh"
              position={[animX, 0, 0.35]}
              faceTo={pose.pos}
              height={1.98}
              pose={{
                face: isShock ? 'shock' : isWalking ? 'happy' : isSmug ? 'smug' : 'focus',
                blink: blinkLidAt(frame, 3, FPS, [196, SHOCK_AT - 2]),
                talk: isShock ? 0 : talkWave(frame, frame >= 164 && frame < SHOCK_AT, 2),
                stance: isWalking ? 'walk' : 'stand',
                walkPhase: ((frame - 150) / 18) % 1,
                leftArm: isShock ? 'raise' : 'hold',
                leftProp: isShock ? 'none' : isWalking ? 'laptop' : 'coffeeCup',
                rightArm: isShock ? 'raise' : isWalking ? 'rest' : 'hold',
                rightProp: isShock || isWalking ? 'none' : 'laptop',
                hatPop: isShock ? Math.min(1, (frame - SHOCK_AT + 1) / 3) : 0,
                facing: isWalking ? -0.38 : isShock ? 0.06 : 0.25,
                lean: isShock ? -4.5 : isWalking ? undefined : Math.sin(frame / 14) * 1.4,
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
            background: 'rgba(18, 22, 40, 0.9)',
            color: '#f8fbff',
            padding: `${14 * s}px ${26 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(56, 189, 248, 0.58)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.38)`,
          }}
        >
          <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: 0.7 }}>{header.title}</div>
          <div style={{ fontSize: 19 * s, fontWeight: 600, color: '#7dd3fc', marginTop: 6 * s }}>{header.sub}</div>
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
                background: 'rgba(18, 22, 40, 0.88)',
                color: '#f8fbff',
                padding: `${10 * s}px ${16 * s}px`,
                borderRadius: 12 * s,
                fontSize: 19 * s,
                fontWeight: 800,
                border: `${2.5 * s}px solid rgba(56, 189, 248, 0.55)`,
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
