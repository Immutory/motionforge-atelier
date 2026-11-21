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
import { WargaCard } from './WargaCard';
import type { WargaId, WargaPose } from './warga';

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
  focusId?: WargaId;
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
    focusId: 'ID5',
  },
  {
    from: 60,
    to: 90,
    light: 'amber',
    pose: { pos: [0, 1.54, 6.7], look: [0, 1.26, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-6 — BU SITI (IBU WARUNG / EMAK-EMAK)',
    subtitle: 'Cepol Tinggi, Daster Bunga & Celemek · Kiri: Sodet/Spatula · Kanan: Kaget Heboh',
    focusId: 'ID6',
  },
  {
    from: 90,
    to: 120,
    light: 'amber',
    pose: { pos: [0, 1.52, 6.7], look: [0, 1.24, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-7 — RAKA (PELAJAR SMA INDONESIA)',
    subtitle: 'Seragam Putih-Abu, Dasi OSIS & Ransel · Kiri: Smartphone · Kanan: Plot-Twist',
    focusId: 'ID7',
  },
  {
    from: 120,
    to: 150,
    light: 'amber',
    pose: { pos: [0, 1.56, 6.7], look: [0, 1.28, 0.2], fov: 38, roll: 0 },
    blur: 0.78,
    title: 'ID-8 — BANG UDIN (ABANG OJOL / KURIR)',
    subtitle: 'Jaket Hijau Reflektor & Helm Visor · Kiri: HP Peta · Kanan: Helm Loncat',
    focusId: 'ID8',
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
  const talkWave = Math.max(0, Math.sin((frame - 186) * 0.65) * 0.5 + 0.5);

  const pakAnimPose: WargaPose =
    frame < 185
      ? { mode: 'walk', walkPhase, blink: blinkLidAt(frame, 5, 30), facing: 0.38 }
      : frame < SHOCK_F
        ? { mode: 'explain', talk: talkWave, blink: blinkLidAt(frame, 5, 30, [186, SHOCK_F]), facing: 0.32 }
        : { mode: 'shock', blink: blinkLidAt(frame, 5, 30, [SHOCK_F]), facing: 0.08 };

  const ojolAnimPose: WargaPose =
    frame < 185
      ? { mode: 'walk', walkPhase: (walkPhase + 0.45) % 1, blink: blinkLidAt(frame, 8, 30), facing: -0.38 }
      : frame < SHOCK_F
        ? {
            mode: 'explain',
            talk: Math.max(0, Math.sin((frame - 196) * 0.55) * 0.45),
            blink: blinkLidAt(frame, 8, 30, [SHOCK_F]),
            facing: -0.32,
          }
        : { mode: 'shock', blink: blinkLidAt(frame, 8, 30, [SHOCK_F]), facing: -0.08 };

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
              <WargaCard
                id="ID5"
                pose={pakAnimPose}
                position={[pakX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <WargaCard
                id="ID8"
                pose={ojolAnimPose}
                position={[ojolX, 0, 0.2]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : !slide.focusId ? (
            <>
              <WargaCard
                id="ID5"
                pose={{ mode: 'idle', facing: 0.34 }}
                position={[-1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <WargaCard
                id="ID6"
                pose={{ mode: 'idle', facing: 0.24 }}
                position={[-0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.9}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <WargaCard
                id="ID7"
                pose={{ mode: 'idle', facing: -0.24 }}
                position={[0.48, 0, 0.35]}
                faceTo={camPose.pos}
                height={1.88}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <WargaCard
                id="ID8"
                pose={{ mode: 'idle', facing: -0.34 }}
                position={[1.42, 0, -0.15]}
                faceTo={camPose.pos}
                height={2.0}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            </>
          ) : (
            <>
              <WargaCard
                id={slide.focusId}
                pose={{ mode: 'explain', talk: 0.78, facing: 0.32 }}
                position={[-0.6, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusId === 'ID7' ? 1.9 : 1.98}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
              <WargaCard
                id={slide.focusId}
                pose={{ mode: 'shock', facing: 0.08 }}
                position={[0.62, 0, 0.2]}
                faceTo={camPose.pos}
                height={slide.focusId === 'ID7' ? 1.9 : 1.98}
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
