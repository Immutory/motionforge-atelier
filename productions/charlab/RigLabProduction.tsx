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
  cobbleTexture,
  type CamPose,
  type PostParams,
  type Vec3,
} from '../../engine';
import { SetPieces } from './LabStageSet';

const CameraRig: React.FC<{ pose: CamPose }> = ({ pose }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(...pose.pos);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ((pose.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

type RigSlide = {
  from: number;
  to: number;
  light: 'noon' | 'amber';
  pose: CamPose;
  blur: number;
  title: string;
  subtitle: string;
  labels: string[];
};

const SLIDES: RigSlide[] = [
  {
    from: 0,
    to: 30,
    light: 'noon',
    pose: { pos: [0, 1.98, 10.9], look: [0, 1.32, 0], fov: 40, roll: 0 },
    blur: 0,
    title: 'MODULAR RIG — 13 EKSPRESI & EFEK KOMIK',
    subtitle: 'angry · laugh · skeptical · idea (terintegrasi penuh di engine/cast/)',
    labels: ['angry + anger', 'laugh', 'skeptical + ?', 'idea + sparkle'],
  },
  {
    from: 30,
    to: 60,
    light: 'amber',
    pose: { pos: [0, 1.96, 10.9], look: [0, 1.3, 0], fov: 40, roll: 0 },
    blur: 0.65,
    title: 'MODULAR RIG — TUKAR PROP BEBAS & STANCE',
    subtitle: 'Duduk + Es Teh · Menunjuk + Mic · Lompat + Uang · Santai + Kopi Tubruk',
    labels: ['sit + esteh', 'point + mic', 'jump + money', 'hip + kopi'],
  },
  {
    from: 60,
    to: 90,
    light: 'noon',
    pose: { pos: [0, 1.98, 10.9], look: [0, 1.32, 0], fov: 40, roll: 0 },
    blur: 0,
    title: 'MODULAR RIG — MULTI-ANGLE (8-ARAH / 5 VIEW)',
    subtitle: 'front · threeQuarter · side (profil) · back (tampak punggung + ransel)',
    labels: ['front', 'threeQuarter', 'side', 'back'],
  },
  {
    from: 90,
    to: 120,
    light: 'amber',
    pose: { pos: [0, 1.96, 10.9], look: [0, 1.3, 0], fov: 40, roll: 0 },
    blur: 0.65,
    title: 'MODULAR RIG — AUTO LIP-SYNC & NPC 1-BARIS',
    subtitle: 'Override cepat CAST_PRESETS + 4 bentuk mulut vokal (wide · o · mid · small)',
    labels: ['wide ("A")', 'o ("O/U")', 'mid ("E/I")', 'small (transisi)'],
  },
];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const RigLabProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const slideIdx = Math.min(SLIDES.length - 1, Math.floor(frame / 30));
  const slide = SLIDES[slideIdx];
  const light = LIGHTS[slide.light];
  const grade = GRADE_PRESETS[slide.light];

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

  const groundMap = useMemo(() => cobbleTexture({ repeat: [150, 150] }), []);
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
        <Stage light={light} ground="#d9c59b" groundMap={groundMap} camPos={slide.pose.pos} camLook={slide.pose.look}>
          <SetPieces lightId={slide.light} />

          {slideIdx === 0 && (
            <>
              <ActorBillboard
                actor="arya"
                position={[-1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                pose={{ face: 'angry', leftArm: 'cross', rightArm: 'cross', facing: 0.3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="rara"
                position={[-0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.9}
                pose={{ face: 'laugh', leftArm: 'hip', rightArm: 'wave', facing: 0.25 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="saka"
                position={[0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={2.0}
                pose={{ face: 'skeptical', leftArm: 'hip', rightArm: 'hold', rightProp: 'magnifier', facing: -0.3 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="dimas"
                position={[1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                height={1.88}
                pose={{ face: 'idea', leftArm: 'rest', rightArm: 'hold', rightProp: 'lightbulb', facing: -0.25 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {slideIdx === 1 && (
            <>
              <ActorBillboard
                actor="pakBudi"
                position={[-1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                pose={{ face: 'smug', stance: 'sit', leftArm: 'rest', rightArm: 'hold', rightProp: 'esteh', facing: 0.35 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="buSiti"
                position={[-0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.9}
                pose={{ face: 'happy', stance: 'stand', leftArm: 'hold', leftProp: 'mic', rightArm: 'point', facing: 0.28 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="bangUdin"
                position={[0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.98}
                pose={{ face: 'laugh', stance: 'jump', leftArm: 'raise', rightArm: 'hold', rightProp: 'money', facing: -0.2 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="rara"
                position={[1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                height={1.9}
                pose={{ face: 'focus', stance: 'stand', leftArm: 'hip', rightArm: 'hold', rightProp: 'kopi', facing: -0.32 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {slideIdx === 2 && (
            <>
              <ActorBillboard
                actor="raka"
                position={[-1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{ face: 'happy', view: 'front', leftArm: 'rest', rightArm: 'wave' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="raka"
                position={[-0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{ face: 'happy', view: 'threeQuarter', rightArm: 'hold', rightProp: 'book', facing: 0.36 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="arya"
                position={[0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.96}
                pose={{ face: 'focus', view: 'side', stance: 'walk', walkPhase: 0.22, facing: 1 }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="raka"
                position={[1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                height={1.92}
                pose={{ face: 'neutral', view: 'back', leftArm: 'rest', rightArm: 'rest' }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}

          {slideIdx === 3 && (
            <>
              {/* 4 NPC Indonesia baru hasil override 1 baris + 4 bentuk mulut auto lip-sync! */}
              <ActorBillboard
                actor="arya"
                overrides={{
                  name: 'Pak Guru',
                  headgear: 'none',
                  hairStyle: 'parted',
                  glasses: true,
                  outfitColor: '#7b2d3b',
                  outfitShade: '#571d29',
                }}
                position={[-1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                pose={{
                  face: 'happy',
                  talk: { open: 0.95, shape: 'wide' },
                  rightArm: 'hold',
                  rightProp: 'pointer',
                  facing: 0.34,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="rara"
                overrides={{
                  name: 'Barista',
                  hairColor: '#c95c72',
                  hairHighlight: '#9c3e52',
                  outfitColor: '#2d6e5e',
                  outfitShade: '#1d4f43',
                }}
                position={[-0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.9}
                pose={{
                  face: 'idea',
                  talk: { open: 0.8, shape: 'o' },
                  rightArm: 'hold',
                  rightProp: 'kopi',
                  facing: 0.25,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="dimas"
                overrides={{
                  name: 'Kurir Biru',
                  headgearColor: '#2f65c4',
                  outfitColor: '#2f65c4',
                  outfitShade: '#1f4794',
                }}
                position={[0.48, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.88}
                pose={{
                  face: 'smug',
                  talk: { open: 0.65, shape: 'mid' },
                  rightArm: 'hold',
                  rightProp: 'sign',
                  facing: -0.26,
                }}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <ActorBillboard
                actor="saka"
                overrides={{
                  name: 'Detektif',
                  headgear: 'peci',
                  headgearColor: '#7a252a',
                  glasses: true,
                  outfitColor: '#3b4a78',
                  outfitShade: '#263257',
                }}
                position={[1.42, 0, -0.15]}
                faceTo={slide.pose.pos}
                height={1.98}
                pose={{
                  face: 'nervous',
                  talk: { open: 0.28, shape: 'small' },
                  rightArm: 'hold',
                  rightProp: 'magnifier',
                  facing: -0.34,
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
            background: 'rgba(24, 16, 36, 0.88)',
            color: '#fff8ec',
            padding: `${14 * s}px ${26 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(255, 224, 155, 0.42)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: 0.8 }}>{slide.title}</div>
          <div style={{ fontSize: 20 * s, fontWeight: 600, color: '#ffd998', marginTop: 6 * s }}>{slide.subtitle}</div>
        </div>
      </div>

      {/* Bottom per-character labels */}
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
        {slide.labels.map((label) => (
          <div
            key={label}
            style={{
              background: 'rgba(24, 16, 36, 0.86)',
              color: '#fff8ec',
              padding: `${9 * s}px ${14 * s}px`,
              borderRadius: 12 * s,
              fontSize: 19 * s,
              fontWeight: 800,
              border: `${2.5 * s}px solid rgba(255, 224, 155, 0.45)`,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
