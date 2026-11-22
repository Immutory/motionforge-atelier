import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ActorBillboard,
  CatBillboard,
  DEFAULT_POST,
  GRADE_PRESETS,
  KAMPUNG_MODES,
  KampungSet,
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
import { SetPieces } from '../_starter/set';

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

// Kamera animasi live action di depan WARKOP 24 JAM (diambil dari sudut kiri jalan agar bebas tiang lampu x=0,z=4.4!)
const ANIM_CAMS: CamKey[] = [
  { frame: 150, pose: { pos: [-2.45, 1.72, 6.25], look: [0.08, 1.38, -0.35], fov: 48, roll: 0 }, cut: true },
  { frame: 186, pose: { pos: [-1.85, 1.48, 5.25], look: [0.22, 1.18, 0.15], fov: 46, roll: 0 }, glide: 22 },
  { frame: SHOCK_AT, pose: { pos: [-1.15, 1.18, 4.15], look: [0.35, 1.05, 0.65], fov: 44, roll: -1.8 }, cut: true },
];

const ANIM_KICKS: Kick[] = [{ frame: SHOCK_AT, strength: 1.1, length: 8 }];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Showcase & Animasi Resmi 30 FPS Karakter Kucing 2D Orisinal:
 * **Si Oyen (Kucing Warkop)** + varian `Mpus Abu` & `Si Belang` — diadaptasi dari
 * referensi tabby oranye (`12221_Cat_v1_l3` + `Cat_diffuse.jpg`), terintegrasi di `engine/cast/`.
 */
export const KucingOyenProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const isAnim = frame >= 150;
  const slideIdx = isAnim ? 4 : frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : 3;
  const isKampungSlide = slideIdx === 3 || isAnim;

  const isShock = frame >= SHOCK_AT;
  const kampungMode = slideIdx === 3 || isShock ? 'sore' : 'siang';
  const lightId: 'noon' | 'amber' = slideIdx === 3 || isShock ? 'amber' : 'noon';
  const light = isKampungSlide ? KAMPUNG_MODES[kampungMode].light : LIGHTS[lightId];
  const grade = GRADE_PRESETS[lightId];

  const staticCam: CamPose =
    slideIdx === 0
      ? { pos: [0, 0.92, 3.35], look: [0, 0.58, 0.2], fov: 36, roll: 0 }
      : slideIdx === 3
        ? { pos: [-2.55, 1.78, 6.45], look: [0.08, 1.52, -0.35], fov: 50, roll: 0 }
        : { pos: [0, 1.35, 9.6], look: [0, 0.55, 0], fov: 39, roll: 0 };

  const pose = isAnim ? sampleCamera(ANIM_CAMS, frame) : staticCam;
  const shake = isAnim ? kickOffset(ANIM_KICKS, frame) : { dx: 0, dy: 0, droll: 0 };

  const blur = slideIdx === 0 || isShock ? 0.5 : 0;
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

  // Animasi Live Action 30 FPS di depan Warkop 24 Jam (f150..239)
  const walkT = Math.max(0, Math.min(1, (frame - 150) / 30));
  const walkSmooth = walkT * walkT * (3 - 2 * walkT);
  const catX = -1.35 + 1.45 * walkSmooth; // Jalan dari kiri (-1.35) mendekat ke Bang Utoh (+0.10)
  const isWalking = frame >= 150 && frame < 180;
  const isMeowing = frame >= 186 && frame < SHOCK_AT;

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
  const s = height / 1920;

  const header =
    slideIdx === 0
      ? {
          title: 'KARAKTER KUCING 2D — SI OYEN (TABBY ORANYE)',
          sub: 'Referensi Tabby Oren · Tanda M Dahi · Mata Emas Pupil Celah · Ekor Cincin · engine/cast/',
        }
      : slideIdx === 1
        ? {
            title: 'SI OYEN — TURNAROUND 4 SUDUT PANDANG',
            sub: 'front (duduk manis) · threeQuarter (hero) · side (jalan 4 kaki) · back (loreng punggung)',
          }
        : slideIdx === 2
          ? {
              title: 'SI OYEN — 4 MOOD & POSE EKSPRESIF',
              sub: 'Duduk Ramah · Tidur Loaf (Zzz) · Minta Gorengan (Toe-Beans) · Kaget Loncat Ekor Mekar!',
            }
          : slideIdx === 3
            ? {
                title: 'WARKOP 24 JAM — SI OYEN + BANG UTOH + VARIAN KUCING',
                sub: 'Papan WARKOP 24 JAM (KOPI · GORENGAN · INDOMIE) + Karakter Kucing 2D Animasi (Non-3D)',
              }
            : {
                title: isShock
                  ? 'PLOT-TWIST: SI OYEN KAGET LONCAT DI WARKOP 24 JAM!'
                  : isWalking
                    ? 'LIVE ACTION 30 FPS — SI OYEN JALAN KE WARKOP 24 JAM'
                    : 'LIVE ACTION 30 FPS — DUDUK MANIS & MEONG KE BANG UTOH',
                sub: 'Karakter Kucing 2D <CatBillboard /> · Jalan 4 Kaki -> Duduk & Lip-Sync Meong -> Shock Jump!',
              };

  const labels =
    slideIdx === 0
      ? ['ID: oyen · <CatBillboard cat="oyen" /> · Siap Pakai di Semua Set 3D']
      : slideIdx === 1
        ? ['front (sit)', 'threeQuarter', 'side (walk)', 'back (mackerel)']
        : slideIdx === 2
          ? ['happy + sit', 'sleep (loaf)', 'smug + pawRaise', 'shock + jump']
          : slideIdx === 3
            ? ['Mpus Abu', 'Si Oyen (Lead)', 'Bang Utoh', 'Si Belang']
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
        <Stage
          light={light}
          showGround={!isKampungSlide}
          ground="#d9c59b"
          groundMap={groundMap}
          camPos={pose.pos}
          camLook={pose.look}
        >
          {!isKampungSlide && <SetPieces lightId={lightId} />}
          {isKampungSlide && <KampungSet mode={kampungMode} />}

          {/* Slide 0: Hero Close-Up Si Oyen */}
          {slideIdx === 0 && (
            <CatBillboard
              cat="oyen"
              position={[0, 0, 0.25]}
              faceTo={pose.pos}
              height={1.12}
              pose={{
                face: 'happy',
                stance: 'sit',
                view: 'threeQuarter',
                pawRaise: 'right',
                tailPhase: 0.7,
                facing: 0.28,
              }}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}

          {/* Slide 1: Turnaround 4 Sudut Pandang */}
          {slideIdx === 1 && (
            <>
              <CatBillboard
                cat="oyen"
                position={[-1.24, 0, -0.05]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'happy', stance: 'sit', view: 'front', tailPhase: 0.4 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[-0.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'neutral', stance: 'sit', view: 'threeQuarter', tailPhase: 1.1, facing: 0.34 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[0.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'focus', stance: 'walk', view: 'side', walkPhase: 0.22, tailPhase: 0.6, facing: 1 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[1.24, 0, -0.05]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'neutral', stance: 'sit', view: 'back', tailPhase: 0.9 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 2: 4 Mood & Pose Ekspresif */}
          {slideIdx === 2 && (
            <>
              <CatBillboard
                cat="oyen"
                position={[-1.24, 0, -0.05]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'laugh', stance: 'sit', view: 'threeQuarter', tailPhase: 0.6, facing: 0.24 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[-0.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'neutral', stance: 'sleep', view: 'threeQuarter', tailPhase: 0.2, facing: 0.3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[0.42, 0, 0.25]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'smug', stance: 'sit', view: 'front', pawRaise: 'right', tailPhase: 1.4, facing: -0.2 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[1.24, 0, -0.05]}
                faceTo={pose.pos}
                height={1.0}
                pose={{ face: 'shock', stance: 'jump', view: 'threeQuarter', tailPhase: 0.5, facing: -0.35 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 3: Warkop 24 Jam (KampungSet) + Bang Utoh + 3 Varian Kucing 2D */}
          {slideIdx === 3 && (
            <>
              <ActorBillboard
                actor="bangUtoh"
                position={[0.52, 0, 0.45]}
                faceTo={pose.pos}
                height={1.88}
                pose={{
                  face: 'happy',
                  leftArm: 'hold',
                  leftProp: 'coffeeCup',
                  rightArm: 'wave',
                  facing: -0.28,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="abu"
                position={[-1.18, 0, 0.72]}
                faceTo={pose.pos}
                height={0.68}
                pose={{ face: 'neutral', stance: 'sleep', view: 'threeQuarter', facing: 0.35 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[-0.32, 0, 0.75]}
                faceTo={pose.pos}
                height={0.72}
                pose={{ face: 'happy', stance: 'sit', view: 'threeQuarter', pawRaise: 'right', tailPhase: 0.8, facing: 0.3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="belang"
                position={[1.18, 0, 0.88]}
                faceTo={pose.pos}
                height={0.68}
                pose={{ face: 'idea', stance: 'stand', view: 'threeQuarter', tailPhase: 1.5, facing: -0.4 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Live Action 30 FPS (f150..239) di depan WARKOP 24 JAM */}
          {isAnim && (
            <>
              <ActorBillboard
                actor="bangUtoh"
                position={[0.85, 0, 0.45]}
                faceTo={pose.pos}
                height={1.88}
                pose={{
                  face: isShock ? 'shock' : isMeowing ? 'laugh' : 'happy',
                  blink: blinkLidAt(frame, 4, FPS),
                  leftArm: isShock ? 'raise' : 'hold',
                  leftProp: isShock ? 'none' : 'coffeeCup',
                  rightArm: isShock ? 'raise' : 'hip',
                  hatPop: isShock ? Math.min(1, (frame - SHOCK_AT + 1) / 3) : 0,
                  facing: -0.4,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CatBillboard
                cat="oyen"
                position={[catX, 0, 0.88]}
                faceTo={pose.pos}
                height={0.72}
                pose={{
                  face: isShock ? 'shock' : isWalking ? 'focus' : isMeowing ? 'happy' : 'neutral',
                  blink: isShock ? 0 : blinkLidAt(frame, 2, FPS, [198]),
                  talk: isShock ? 0.9 : talkWave(frame, isMeowing, 2),
                  stance: isShock ? 'jump' : isWalking ? 'walk' : 'sit',
                  view: isWalking ? 'side' : 'threeQuarter',
                  walkPhase: ((frame - 150) / 14) % 1,
                  tailPhase: frame * 0.22,
                  earTwitch: Math.sin(frame * 0.35) * 0.4,
                  pawRaise: isMeowing ? 'right' : 'none',
                  facing: isWalking ? 1 : isShock ? -0.35 : 0.38,
                  breathPhase: frame * 0.12,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
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
            border: `${3 * s}px solid rgba(240, 158, 88, 0.68)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.38)`,
          }}
        >
          <div style={{ fontSize: 29 * s, fontWeight: 800, letterSpacing: 0.6 }}>{header.title}</div>
          <div style={{ fontSize: 18 * s, fontWeight: 600, color: '#ffd59e', marginTop: 6 * s }}>{header.sub}</div>
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
                color: '#fff8ec',
                padding: `${10 * s}px ${16 * s}px`,
                borderRadius: 12 * s,
                fontSize: 19 * s,
                fontWeight: 800,
                border: `${2.5 * s}px solid rgba(240, 158, 88, 0.6)`,
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
