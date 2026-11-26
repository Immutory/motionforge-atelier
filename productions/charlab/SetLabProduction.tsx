import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ActorBillboard,
  DEFAULT_POST,
  GRADE_PRESETS,
  KAMPUS_SPOTS,
  KOST_SPOTS,
  LIGHTS,
  PostStack,
  Stage,
  WARKOP_SPOTS,
  KampusSet,
  KostSet,
  WarkopSet,
  indoorLight,
  type CamPose,
  type PostParams,
  type Vec3,
} from '../../engine';

const CameraRig: React.FC<{ pose: CamPose }> = ({ pose }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(...pose.pos);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ((pose.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

type SetSlide = {
  set: 'warkop' | 'kost' | 'kampus';
  lightId: 'noon' | 'amber' | 'dusk';
  pose: CamPose;
  blur: number;
  title: string;
  subtitle: string;
  badge: string;
};

const SLIDES: SetSlide[] = [
  {
    set: 'warkop',
    lightId: 'noon',
    pose: { pos: [0, 1.85, 7.3], look: [0, 1.48, -1.0], fov: 44, roll: 0 },
    blur: 0,
    title: 'SET 3D BLENDER #1 — WARKOP NGODING (SIANG)',
    subtitle: '<WarkopSet /> · Konter Kayu · Etalase Gorengan · Mie · Neon Box · Bangku Bakso',
    badge: 'public/sets/warkop.glb + twoTone + InkPass',
  },
  {
    set: 'warkop',
    lightId: 'amber',
    pose: { pos: [-0.35, 1.78, 6.7], look: [0, 1.45, -1.0], fov: 44, roll: 0 },
    blur: 0.55,
    title: 'SET 3D BLENDER #1 — WARKOP NGODING (SENJA / MALAM)',
    subtitle: '3 Bohlam Enamel & Neon Box WARKOP 24 JAM menyala otomatis dengan HDR Bloom!',
    badge: '<WarkopSet lightId="amber" /> · Bang Utoh + Bu Siti + Bang Dimas',
  },
  {
    set: 'kost',
    lightId: 'dusk',
    pose: { pos: [0.0, 1.82, 7.1], look: [0, 1.38, -1.0], fov: 44, roll: 0 },
    blur: 0.45,
    title: 'SET 3D BLENDER #2 — KAMAR KOST ANAK S1 TI',
    subtitle: '<KostSet /> · Dual-Monitor Kode · PC RGB · Kasur · Galon · Kipas · Dus Mie Instan',
    badge: 'public/sets/kost.glb · Mode Begadang Ngoding Jam 2 Pagi',
  },
  {
    set: 'kampus',
    lightId: 'noon',
    pose: { pos: [0.0, 1.85, 6.9], look: [0, 1.42, -1.0], fov: 44, roll: 0 },
    blur: 0,
    title: 'SET 3D BLENDER #3 — LAB KOMPUTER S1 INFORMATIKA',
    subtitle: '<KampusSet /> · Whiteboard Flowchart · 4 PC Lab · Meja Dosen · AC · Proyektor',
    badge: 'public/sets/kampus.glb · Presentasi Skripsi Bang Utoh',
  },
];

/**
 * Showcase resmi 3 Set Dunia 3D hasil Blender 5.3 (`engine/sets/`) dirender di Three.js + Remotion
 * bersama Pemeran Utama #1 Bolohoutoh alias Bang Utoh dan cast Indonesia lainnya.
 */
export const SetLabProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const idx = Math.min(SLIDES.length - 1, Math.floor(frame / 30));
  const slide = SLIDES[idx];

  const light = indoorLight(LIGHTS[slide.lightId], slide.lightId === 'dusk' ? -32 : 38, 44);
  const grade = GRADE_PRESETS[slide.lightId];
  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: slide.blur,
    focus: dist(slide.pose.pos, slide.pose.look),
    grade,
  };

  const s = height / 1920;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: slide.pose.fov, position: slide.pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={slide.pose} />
        <Stage light={light} showGround={false} camPos={slide.pose.pos} camLook={slide.pose.look}>
          {/* Slide 0 & 1: Warkop Ngoding 24 Jam */}
          {slide.set === 'warkop' && (
            <>
              <WarkopSet lightId={slide.lightId} />
              {/* Bu Siti di belakang konter melayani warkop (spot counterKeeper + ergonomicBaseY agar dada/bahu utuh) */}
              <ActorBillboard
                actor="buSiti"
                position={[WARKOP_SPOTS.counterKeeper[0], 0.44, WARKOP_SPOTS.counterKeeper[2]]}
                faceTo={slide.pose.pos}
                height={1.88}
                pose={{ face: 'happy', leftArm: 'hip', rightArm: 'hold', rightProp: 'kopi', facing: 0.15 }}
                castShadow={false}
                blobColor={light.card.blob}
              />
              {/* Pemeran Utama #1: Bang Utoh di tengah depan konter */}
              <ActorBillboard
                actor="bangUtoh"
                position={WARKOP_SPOTS.center}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{
                  face: idx === 1 ? 'idea' : 'happy',
                  leftArm: 'hold',
                  leftProp: 'coffeeCup',
                  rightArm: 'hold',
                  rightProp: 'laptop',
                  facing: 0.25,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              {/* Bang Dimas duduk di area meja kanan (spot rightTableSeat + seatRadius & sitHeight terkalibrasi v3.0) */}
              <ActorBillboard
                actor="dimas"
                position={WARKOP_SPOTS.rightTableSeat}
                faceTo={slide.pose.pos}
                height={1.84}
                seatRadius={0.16}
                pose={{ face: 'laugh', stance: 'sit', sitHeight: 0.483, leftArm: 'rest', rightArm: 'hold', rightProp: 'esteh', facing: -0.35 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 2: Kamar Kost Anak S1 Teknik Informatika */}
          {slide.set === 'kost' && (
            <>
              <KostSet lightId={slide.lightId} />
              <ActorBillboard
                actor="bangUtoh"
                position={KOST_SPOTS.center}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{
                  face: 'tired',
                  fx: 'sweat',
                  leftArm: 'hold',
                  leftProp: 'coffeeCup',
                  rightArm: 'hold',
                  rightProp: 'laptop',
                  facing: 0.22,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="raka"
                position={KOST_SPOTS.bedside}
                faceTo={slide.pose.pos}
                height={1.84}
                pose={{ face: 'shock', leftArm: 'raise', rightArm: 'hold', rightProp: 'phone', facing: 0.4 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {/* Slide 3: Lab Komputer S1 Teknik Informatika */}
          {slide.set === 'kampus' && (
            <>
              <KampusSet lightId={slide.lightId} />
              <ActorBillboard
                actor="bangUtoh"
                position={KAMPUS_SPOTS.presenter}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{
                  face: 'smug',
                  leftArm: 'hold',
                  leftProp: 'laptop',
                  rightArm: 'point',
                  facing: 0.2,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="rara"
                position={KAMPUS_SPOTS.rightLab}
                faceTo={slide.pose.pos}
                height={1.86}
                pose={{ face: 'happy', leftArm: 'hold', leftProp: 'mic', rightArm: 'hip', facing: -0.32 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="arya"
                position={KAMPUS_SPOTS.lecturer}
                faceTo={slide.pose.pos}
                height={1.9}
                pose={{ face: 'skeptical', leftArm: 'hip', rightArm: 'hold', rightProp: 'book', facing: 0.35 }}
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
          top: 48 * s,
          left: 30 * s,
          right: 30 * s,
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
            padding: `${13 * s}px ${24 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(56, 189, 248, 0.58)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.4)`,
          }}
        >
          <div style={{ fontSize: 28 * s, fontWeight: 800, letterSpacing: 0.6 }}>{slide.title}</div>
          <div style={{ fontSize: 18 * s, fontWeight: 600, color: '#7dd3fc', marginTop: 6 * s }}>{slide.subtitle}</div>
        </div>
      </div>

      {/* Bottom badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 112 * s,
          left: 24 * s,
          right: 24 * s,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(18, 22, 40, 0.88)',
            color: '#fff8ec',
            padding: `${10 * s}px ${20 * s}px`,
            borderRadius: 12 * s,
            fontSize: 19 * s,
            fontWeight: 800,
            border: `${2.5 * s}px solid rgba(255, 214, 138, 0.52)`,
          }}
        >
          {slide.badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};
