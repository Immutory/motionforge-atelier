import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
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
import { CharCard } from './CharCard';
import type { ProtoId } from './prototypes';

const CameraRig: React.FC<{ pose: CamPose }> = ({ pose }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(...pose.pos);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ((pose.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

type Slide = {
  from: number;
  to: number;
  light: 'noon' | 'amber';
  pose: CamPose;
  blur: number;
  title: string;
  subtitle: string;
  focusProto?: ProtoId;
};

const SLIDES: Slide[] = [
  {
    from: 0,
    to: 30,
    light: 'noon',
    pose: { pos: [0, 1.9, 9.4], look: [0, 1.35, 0], fov: 40, roll: 0 },
    blur: 0,
    title: 'LINEUP PROTOTIPE KARAKTER ORISINAL',
    subtitle: 'A · Atelier Indie   |   B · Squircle Plush   |   C · Ink-Pop Comic',
  },
  {
    from: 30,
    to: 60,
    light: 'amber',
    pose: { pos: [0, 1.55, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'PROTOTIPE A — ATELIER INDIE',
    subtitle: 'Storybook Explorer · Kacamata, Jambul & Syal · Kiri: Menjelaskan · Kanan: Plot-Twist',
    focusProto: 'A',
  },
  {
    from: 60,
    to: 90,
    light: 'amber',
    pose: { pos: [0, 1.5, 6.7], look: [0, 1.24, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'PROTOTIPE B — SQUIRCLE PLUSH',
    subtitle: 'Geometric Mascot · Kepala Squircle & Hoodie · Kiri: Menjelaskan · Kanan: Plot-Twist',
    focusProto: 'B',
  },
  {
    from: 90,
    to: 120,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.3, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'PROTOTIPE C — INK-POP COMIC',
    subtitle: 'Sharp Storyteller · Mata Melirik & Blazer · Kiri: Menjelaskan · Kanan: Plot-Twist',
    focusProto: 'C',
  },
];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const CharlabProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const slide = SLIDES.find((s) => frame >= s.from && frame < s.to) ?? SLIDES[0];
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
          {!slide.focusProto ? (
            <>
              <CharCard
                id="A"
                mode="idle"
                position={[-1.12, 0, -0.05]}
                faceTo={slide.pose.pos}
                height={1.96}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CharCard
                id="B"
                mode="idle"
                position={[0, 0, 0.35]}
                faceTo={slide.pose.pos}
                height={1.86}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CharCard
                id="C"
                mode="idle"
                position={[1.12, 0, -0.05]}
                faceTo={slide.pose.pos}
                height={2.02}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : (
            <>
              <CharCard
                id={slide.focusProto}
                mode="explain"
                position={[-0.6, 0, 0.2]}
                faceTo={slide.pose.pos}
                height={slide.focusProto === 'B' ? 1.88 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <CharCard
                id={slide.focusProto}
                mode="shock"
                position={[0.62, 0, 0.2]}
                faceTo={slide.pose.pos}
                height={slide.focusProto === 'B' ? 1.88 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          )}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* Label overlay bersih untuk perbandingan desain */}
      <div
        style={{
          position: 'absolute',
          top: 56 * s,
          left: 44 * s,
          right: 44 * s,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(24, 16, 36, 0.84)',
            color: '#fff8ec',
            padding: `${16 * s}px ${30 * s}px`,
            borderRadius: 18 * s,
            border: `${3 * s}px solid rgba(255, 236, 195, 0.35)`,
            textAlign: 'center',
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ fontSize: 34 * s, fontWeight: 800, letterSpacing: 1.2 }}>{slide.title}</div>
          <div style={{ fontSize: 22 * s, fontWeight: 600, color: '#ffd998', marginTop: 6 * s }}>{slide.subtitle}</div>
        </div>
      </div>

      {!slide.focusProto && (
        <div
          style={{
            position: 'absolute',
            bottom: 130 * s,
            left: 32 * s,
            right: 32 * s,
            display: 'flex',
            justifyContent: 'space-around',
            pointerEvents: 'none',
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          {['A · Atelier Indie', 'B · Squircle Plush', 'C · Ink-Pop Comic'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(24, 16, 36, 0.85)',
                color: '#fff8ec',
                padding: `${10 * s}px ${20 * s}px`,
                borderRadius: 14 * s,
                fontSize: 24 * s,
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
