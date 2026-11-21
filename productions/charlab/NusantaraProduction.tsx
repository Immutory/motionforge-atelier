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
  blinkLidAt,
  cobbleTexture,
  kickOffset,
  sampleCamera,
  smootherstep,
  type CamKey,
  type CamPose,
  type PostParams,
  type Vec3,
} from '../../engine';
import { SetPieces } from '../_starter/set';
import { NusantaraCard } from './NusantaraCard';
import type { NusantaraId, NusantaraPose } from './nusantara';

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
  focusId?: NusantaraId;
};

const SLIDES: ShowcaseSlide[] = [
  {
    from: 0,
    to: 30,
    light: 'noon',
    pose: { pos: [0, 1.98, 10.9], look: [0, 1.32, 0], fov: 40, roll: 0 },
    blur: 0,
    title: 'LINEUP KARAKTER ALA INDONESIA (NUSANTARA)',
    subtitle: 'ID-1 Mas Arya · ID-2 Mbak Rara · ID-3 Bang Dimas · ID-4 Saka Nusantara',
  },
  {
    from: 30,
    to: 60,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-1 — MAS ARYA (BATIK & PECI MODERN)',
    subtitle: 'Host Fakta & Sejarah Nusantara · Kiri: Menjelaskan · Kanan: Plot-Twist Peci Loncat',
    focusId: 'ID1',
  },
  {
    from: 60,
    to: 90,
    light: 'amber',
    pose: { pos: [0, 1.54, 6.7], look: [0, 1.26, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-2 — MBAK RARA (HIJAB MODERN & DENIM)',
    subtitle: 'Host Kreator Muda & Edutainment · Kiri: Podcast Mic · Kanan: Reaksi Kaget',
    focusId: 'ID2',
  },
  {
    from: 90,
    to: 120,
    light: 'amber',
    pose: { pos: [0, 1.52, 6.7], look: [0, 1.24, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-3 — BANG DIMAS (STREETWEAR & ES TEH)',
    subtitle: 'Komedi & Relatable Sehari-hari · Kiri: Nongkrong + Es Teh · Kanan: Topi Loncat',
    focusId: 'ID3',
  },
  {
    from: 120,
    to: 150,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-4 — SAKA NUSANTARA (IKET & TENUN)',
    subtitle: 'Kisah Rakyat & Petualangan · Kiri: Gulungan Peta · Kanan: Plot-Twist',
    focusId: 'ID4',
  },
];

// Segmen animasi live 30 fps (frame 150..239 = 3 detik):
// 150..185 jalan bouncy masuk frame -> 186..215 Mas Arya bicara lip-sync -> 216..239 plot-twist shock + golden hour + kick!
const ANIM_START = 150;
const SHOCK_F = 216;
const ANIM_CAMS: CamKey[] = [
  { frame: ANIM_START, pose: { pos: [0, 1.9, 8.8], look: [0, 1.32, 0.1], fov: 39, roll: 0 } },
  { frame: 186, glide: 30, pose: { pos: [-0.25, 1.62, 6.4], look: [0, 1.3, 0.2], fov: 37, roll: 0 } },
  { frame: SHOCK_F, cut: true, pose: { pos: [0, 1.52, 5.5], look: [0, 1.3, 0.2], fov: 35, roll: 2.5 } },
];
const ANIM_KICKS = [{ frame: SHOCK_F, strength: 0.045, length: 7 }];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const NusantaraProduction: React.FC = () => {
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

  // Hitung posisi & pose animasi untuk segmen gerak 150..239
  const walkT = smootherstep((frame - ANIM_START) / 34);
  const aryaX = -1.75 + walkT * 1.15; // berjalan dari kiri ke x = -0.60
  const raraX = 1.75 - walkT * 1.15; // berjalan dari kanan ke x = +0.60
  const walkPhase = ((frame - ANIM_START) / 22) % 1; // ~2.7 steps/sec (matching motion.md)
  const talkWave = Math.max(0, Math.sin((frame - 186) * 0.65) * 0.5 + 0.5);

  const aryaAnimPose: NusantaraPose =
    frame < 185
      ? { mode: 'walk', walkPhase, blink: blinkLidAt(frame, 1, 30), facing: 0.4 }
      : frame < SHOCK_F
        ? { mode: 'explain', talk: talkWave, blink: blinkLidAt(frame, 1, 30, [186, SHOCK_F]), facing: 0.35 }
        : { mode: 'shock', blink: blinkLidAt(frame, 1, 30, [SHOCK_F]), facing: 0.1 };

  const raraAnimPose: NusantaraPose =
    frame < 185
      ? { mode: 'walk', walkPhase: (walkPhase + 0.42) % 1, blink: blinkLidAt(frame, 2, 30), facing: -0.4 }
      : frame < SHOCK_F
        ? { mode: 'explain', talk: Math.max(0, Math.sin((frame - 196) * 0.5) * 0.4), blink: blinkLidAt(frame, 2, 30, [SHOCK_F]), facing: -0.32 }
        : { mode: 'shock', blink: blinkLidAt(frame, 2, 30, [SHOCK_F]), facing: -0.1 };

  const title = isAnim
    ? frame < 185
      ? 'ANIMASI GERAK — SIKLUS JALAN BOUNCY (30 FPS)'
      : frame < SHOCK_F
        ? 'ANIMASI GERAK — LIP-SYNC & AKTING PROP'
        : 'ANIMASI GERAK — PLOT-TWIST + CAMERA KICK'
    : slide.title;
  const subtitle = isAnim
    ? 'Mas Arya & Mbak Rara · Bouncy Walk · 4-Frame Blink · Lip-Sync · Golden Hour Shock'
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
              <NusantaraCard
                id="ID1"
                pose={aryaAnimPose}
                position={[aryaX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <NusantaraCard
                id="ID2"
                pose={raraAnimPose}
                position={[raraX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.92}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : !slide.focusId ? (
            <>
              <NusantaraCard
                id="ID1"
                pose={{ mode: 'idle', facing: 0.34 }}
                position={[-1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <NusantaraCard
                id="ID2"
                pose={{ mode: 'idle', facing: 0.24 }}
                position={[-0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.9}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <NusantaraCard
                id="ID3"
                pose={{ mode: 'idle', facing: -0.24 }}
                position={[0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.88}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <NusantaraCard
                id="ID4"
                pose={{ mode: 'idle', facing: -0.34 }}
                position={[1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={2.02}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : (
            <>
              <NusantaraCard
                id={slide.focusId}
                pose={{ mode: 'explain', talk: 0.78, facing: 0.34 }}
                position={[-0.6, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusId === 'ID3' ? 1.9 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <NusantaraCard
                id={slide.focusId}
                pose={{ mode: 'shock', facing: 0.08 }}
                position={[0.62, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusId === 'ID3' ? 1.9 : 1.98}
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

      {!isAnim && !slide.focusId && (
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
          {['ID-1 Arya', 'ID-2 Rara', 'ID-3 Dimas', 'ID-4 Saka'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(24, 16, 36, 0.86)',
                color: '#fff8ec',
                padding: `${9 * s}px ${16 * s}px`,
                borderRadius: 12 * s,
                fontSize: 21 * s,
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
