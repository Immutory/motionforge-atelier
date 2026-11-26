import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ACTOR_H,
  ACTOR_W,
  ActorBillboard,
  CAST_PRESETS,
  DEFAULT_POST,
  GRADE_PRESETS,
  KAMPUNG_MODES,
  KAMPUNG_SPOTS,
  KampungSet,
  PostStack,
  Stage,
  blinkLidAt,
  drawActor,
  type ActorPose,
  type CamPose,
  type CastPresetId,
  type KampungTimeMode,
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

/** Kartu karakter 2D langsung dari Canvas2D untuk inspeksi detail kostum, ekspresi & prop. */
const ActorCard: React.FC<{
  id: CastPresetId;
  pose: ActorPose;
  accent: string;
  tag: string;
  w: number;
  h: number;
}> = ({ id, pose, accent, tag, w, h }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spec = CAST_PRESETS[id];

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, ACTOR_W, ACTOR_H);
    drawActor(ctx, id, pose);
  }, [id, pose]);

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 28,
        background: 'linear-gradient(180deg, #fffdf7 0%, #f4ead6 100%)',
        border: `5px solid ${accent}`,
        boxShadow: '0 14px 36px rgba(18, 22, 36, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 18px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: accent,
          color: '#fff',
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: 1.1,
          padding: '6px 16px',
          borderRadius: 999,
          textTransform: 'uppercase',
        }}
      >
        {tag}
      </div>
      <canvas
        ref={canvasRef}
        width={ACTOR_W}
        height={ACTOR_H}
        style={{ height: h * 0.72, width: 'auto', display: 'block' }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#1e2230', lineHeight: 1.15 }}>
          {spec.name}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#4c5368', marginTop: 4 }}>
          {spec.role}
        </div>
      </div>
    </div>
  );
};

type SceneSlide = {
  mode: KampungTimeMode;
  pose: CamPose;
  title: string;
  subtitle: string;
};

const SCENE_SLIDES: SceneSlide[] = [
  {
    mode: 'siang',
    pose: { pos: [-9.1, 2.25, 14.1], look: [-12.15, 1.28, 17.9], fov: 54, roll: 0 },
    title: 'AREA PEDAGANG RAWA SARI — BAKMIE AYAM TIO & ES BUAH MBAK YUNI (SIANG)',
    subtitle: 'Tio aktif meracik bakmie di gerobak baru · Mbak Yuni melayani Es Buah & Campur di slot timur',
  },
  {
    mode: 'sore',
    pose: { pos: [-6.8, 2.6, 8.2], look: [-11.8, 1.35, 15.2], fov: 48, roll: 0 },
    title: 'PAK UJANG PATROLI POS RONDA RT 04 + SUASANA SORE AREA PEDAGANG',
    subtitle: 'Pak Ujang berjaga & menyapa warga dekat Pos Ronda · Lampu gerobak & jalan menyala hangat',
  },
  {
    mode: 'siang',
    pose: { pos: [5.4, 3.3, 9.2], look: [-1.4, 2.9, 6.2], fov: 48, roll: 0 },
    title: 'PERBAIKAN TIANG LISTRIK, KABEL RAPI & LAMPU LALU LINTAS BARAT',
    subtitle: 'Lampu jalan terpasang kokoh di lengan tiang · Traffic Light Barat menghadap jalur datang kendaraan (+X)',
  },
  {
    mode: 'sore',
    pose: { pos: [4.2, 3.4, 8.6], look: [10.6, 2.9, 6.4], fov: 48, roll: 0 },
    title: 'PERBAIKAN LAMPU LALU LINTAS TIMUR & INSTALASI TIANG LISTRIK (SORE)',
    subtitle: 'Traffic Light Timur menghadap arus kendaraan menuju Kampus (-X) · Kabel sejajar rapi di isolator',
  },
];

/**
 * Showcase QC Master Prompt — Penyempurnaan Area Kampung, Karakter Baru (Pak Ujang, Tio, Mbak Yuni),
 * Gerobak Bakmie Ayam Tio, Es Buah Mbak Yuni, Tiang Listrik, dan Traffic Light.
 */
export const KampungUpgradeProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const slideIdx = Math.min(4, Math.floor(frame / 30));

  // Slide 0: Lineup 3 karakter animasi baru (Pak Ujang, Tio, Mbak Yuni)
  if (slideIdx === 0) {
    const f = frame % 30;
    const blink1 = blinkLidAt(f, 1, fps);
    const blink2 = blinkLidAt(f, 2, fps);
    const blink3 = blinkLidAt(f, 3, fps);
    return (
      <AbsoluteFill
        style={{
          background: 'linear-gradient(135deg, #1b2236 0%, #2a3450 55%, #1d293d 100%)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: '44px 56px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f2c144', letterSpacing: 2 }}>
              KAMPUNG RAWA SARI RT 04 · KARAKTER ANIMASI BARU
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', marginTop: 4 }}>
              Pak Ujang · Tio Bakmie Ayam · Mbak Yuni Es Buah
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#e5ecf8',
              padding: '10px 18px',
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Modular 2D Rig · Nusantara Cast Preset
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, alignItems: 'center' }}>
          <ActorCard
            id="pakUjang"
            accent="#8b623b"
            tag="Petugas Keamanan · Pos Ronda"
            w={560}
            h={820}
            pose={{
              face: 'happy',
              blink: blink1,
              stance: 'stand',
              view: 'threeQuarter',
              facing: 0.25,
              leftArm: 'wave',
              rightArm: 'hold',
              rightProp: 'senter',
            }}
          />
          <ActorCard
            id="tio"
            accent="#b82929"
            tag="Pedagang Bakmie Ayam · Slot Barat"
            w={560}
            h={820}
            pose={{
              face: 'happy',
              blink: blink2,
              stance: 'stand',
              view: 'threeQuarter',
              facing: -0.15,
              leftArm: 'hold',
              leftProp: 'sodet',
              rightArm: 'hold',
              rightProp: 'bakmie',
            }}
          />
          <ActorCard
            id="mbakYuni"
            accent="#2aa88f"
            tag="Pedagang Es Buah · Slot Timur (Agent)"
            w={560}
            h={820}
            pose={{
              face: 'laugh',
              blink: blink3,
              stance: 'stand',
              view: 'threeQuarter',
              facing: -0.2,
              leftArm: 'wave',
              rightArm: 'hold',
              rightProp: 'esBuah',
            }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  // Slides 1..4: 3D KampungSet renders
  const s3d = SCENE_SLIDES[slideIdx - 1];
  const kMode = KAMPUNG_MODES[s3d.mode];
  const light = kMode.light;
  const grade = GRADE_PRESETS[s3d.mode === 'siang' ? 'noon' : 'amber'];
  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: 0,
    focus: dist(s3d.pose.pos, s3d.pose.look),
    grade,
  };

  const localF = frame % 30;
  const walkPh = (localF / 30) % 1;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: s3d.pose.fov, position: s3d.pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={s3d.pose} />
        <Stage light={light} showGround={false} camPos={s3d.pose.pos} camLook={s3d.pose.look}>
          <KampungSet mode={s3d.mode} />

          {/* Pak Ujang berjaga / patroli santai & menyapa warga dekat Pos Ronda RT 04 */}
          <ActorBillboard
            actor="pakUjang"
            position={KAMPUNG_SPOTS.pakUjangPatrol}
            faceTo={s3d.pose.pos}
            height={1.82}
            blobColor={light.card.blob}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 1, fps),
              stance: slideIdx === 2 ? 'walk' : 'stand',
              walkPhase: walkPh,
              view: 'front',
              facing: 0.18,
              leftArm: 'wave',
              rightArm: 'hold',
              rightProp: 'senter',
            }}
          />

          {/* Tio aktif memasak & menyajikan Bakmie Ayam di atas pallet permanen (ergonomicBaseY = 0.30 m) */}
          <ActorBillboard
            actor="tio"
            position={[KAMPUNG_SPOTS.bakmieTioVendor[0], 0.3, KAMPUNG_SPOTS.bakmieTioVendor[2]]}
            faceTo={s3d.pose.pos}
            height={1.88}
            castShadow={false}
            blobColor={light.card.blob}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 2, fps),
              stance: 'stand',
              view: 'front',
              facing: 0.12,
              lean: 2.5,
              leftArm: 'hold',
              leftProp: 'sodet',
              rightArm: 'hold',
              rightProp: 'bakmie',
            }}
          />

          {/* Mbak Yuni aktif melayani Es Buah & Campur Segar di atas pallet permanen (ergonomicBaseY = 0.30 m) */}
          <ActorBillboard
            actor="mbakYuni"
            position={[KAMPUNG_SPOTS.esBuahYuniVendor[0], 0.3, KAMPUNG_SPOTS.esBuahYuniVendor[2]]}
            faceTo={s3d.pose.pos}
            height={1.82}
            castShadow={false}
            blobColor={light.card.blob}
            pose={{
              face: 'laugh',
              blink: blinkLidAt(frame, 3, fps),
              stance: 'stand',
              view: 'front',
              facing: -0.15,
              lean: 2,
              leftArm: 'wave',
              rightArm: 'hold',
              rightProp: 'esBuah',
            }}
          />

          {/* Bang Utoh & Rara sebagai warga pelanggan di Area Pedagang Rawa Sari (di samping meja pelanggan, tidak menutupi gerobak) */}
          <ActorBillboard
            actor="bangUtoh"
            position={[-14.32, 0.04, 16.05]}
            faceTo={s3d.pose.pos}
            height={1.74}
            blobColor={light.card.blob}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 4, fps),
              stance: 'stand',
              view: 'threeQuarter',
              facing: 0.35,
              leftArm: 'hip',
              rightArm: 'hold',
              rightProp: 'bakmie',
            }}
          />
          <ActorBillboard
            actor="rara"
            position={[-8.88, 0.04, 16.55]}
            faceTo={s3d.pose.pos}
            height={1.68}
            blobColor={light.card.blob}
            pose={{
              face: 'happy',
              blink: blinkLidAt(frame, 5, fps),
              stance: 'stand',
              view: 'threeQuarter',
              facing: -0.3,
              leftArm: 'wave',
              rightArm: 'hold',
              rightProp: 'esBuah',
            }}
          />
        </Stage>

        <PostStack params={post} />
      </ThreeCanvas>

      {/* Banner label QC rapi di bagian bawah */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          bottom: 28,
          background: 'rgba(15, 20, 32, 0.84)',
          border: '2px solid rgba(242, 193, 68, 0.72)',
          borderRadius: 18,
          padding: '14px 24px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f9d66b', letterSpacing: 0.5 }}>
            {s3d.title}
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#e2e8f5', marginTop: 2 }}>
            {s3d.subtitle}
          </div>
        </div>
        <div
          style={{
            background: s3d.mode === 'siang' ? '#2563eb' : '#d97706',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            padding: '7px 14px',
            borderRadius: 999,
            textTransform: 'uppercase',
          }}
        >
          Mode: {s3d.mode}
        </div>
      </div>
    </AbsoluteFill>
  );
};
