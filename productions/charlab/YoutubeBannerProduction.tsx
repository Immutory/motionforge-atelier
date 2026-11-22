import React from 'react';
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
  PostStack,
  Stage,
  type CamPose,
  type PostParams,
  type Vec3,
} from '../../engine';
import { CharCard } from './CharCard';

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

// Kamera panoramik 16:9 (2560x1440) yang dihitung presisi agar:
// - Mobile Safe Zone (1546x423) memuat UTUH papan WARKOP 24 JAM + 2 kucing di atas kanopi +
//   12 karakter berdempetan (9 Warga + 3 Charlab: Atelier Indie, Squircle Plush, Ink-Pop Comic) +
//   Raka duduk bersila + Pak Budi duduk + 2 kucing di bawah!
// - Desktop Strip (2560x423) meluas rapi ke halaman Rumah Kos (kiri) & Kampus S1 TI (kanan)!
// - TV Canvas (2560x1440) memanjang indah ke langit senja skyline (atas) & jalan Kampung Rawa Sari (bawah)!
const BANNER_CAM: CamPose = {
  pos: [0.0, 1.72, 11.65],
  look: [0.0, 1.62, 0.0],
  fov: 57.5,
  roll: 0,
};

// Sembunyikan hanya tiang lampu/lampu lalu lintas/umbul yang memotong jalur lensa panorama Warkop 24 Jam
const HIDE_CENTER_POLES = [
  'KG_StreetPole_05',
  'KG_StreetArm_05',
  'KG_StreetHood_05',
  'KG_StreetBulb_05',
  'KG_P6_TrafficLight_West',
  'KG_P5_Umbul_Pole_2',
  'KG_P5_Umbul_Flag_2',
  'KG_P5_Umbul_Pole_3',
  'KG_P5_Umbul_Flag_3',
];

// Partikel cahaya hangat senja (bokeh halus di udara warkop — murni visual, tanpa teks ramai!)
const WARM_MOTES: { x: number; y: number; size: number; opacity: number; color: string }[] = [
  { x: 26, y: 39, size: 13, opacity: 0.45, color: '#ffe08a' },
  { x: 33, y: 36, size: 9, opacity: 0.35, color: '#ffb86c' },
  { x: 40, y: 41, size: 11, opacity: 0.38, color: '#fff0b3' },
  { x: 47, y: 35, size: 15, opacity: 0.34, color: '#ffd27d' },
  { x: 54, y: 37, size: 10, opacity: 0.4, color: '#ffe699' },
  { x: 61, y: 41, size: 12, opacity: 0.42, color: '#ffcb7a' },
  { x: 68, y: 36, size: 10, opacity: 0.36, color: '#ffe49e' },
  { x: 74, y: 42, size: 14, opacity: 0.4, color: '#ffd080' },
];

/**
 * YouTube Channel Banner (2560x1440) — **Foto Bareng Keluarga Besar Kampung Rawa Sari + Charlab di Warkop 24 Jam**:
 * - Seluruh **12 karakter** (9 Warga Indonesia + 3 Charlab: Atelier Indie, Squircle Plush, Ink-Pop Comic) berdempetan rapat & **100% tangan kosong** (zero hand props).
 * - **Raka SMA** bergaya **duduk bersila (`sitCross`)** di baris depan kanan; **Pak Budi** duduk santai di baris depan kiri.
 * - **Kucing 2D** di **atas tempat warkop** (Mpus Abu tidur & Si Belang duduk di atap kanopi) + di **bawah** (Si Oyen duduk angkat cakar & kucing oren kecil melompat).
 * - Frame 0: **Pure Visual Art** — 100% tanpa teks overlay tambahan.
 * - Frame 1: **Clean Minimal Signature** — 1 tanda tangan minimalis `BANG UTOH` di dinding bata.
 */
export const YoutubeBannerProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const showMinimalSignature = frame >= 1;

  const light = KAMPUNG_MODES.sore.light;
  const grade = GRADE_PRESETS.amber;
  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: 0,
    focus: dist(BANNER_CAM.pos, [0, 1.3, 0.8]),
    grade,
  };

  const s = height / 1440;

  return (
    <AbsoluteFill style={{ backgroundColor: '#130e1c' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: BANNER_CAM.fov, position: BANNER_CAM.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={BANNER_CAM} />
        <Stage light={light} showGround={false} camPos={BANNER_CAM.pos} camLook={BANNER_CAM.look}>
          <KampungSet mode="sore" glowScale={1.45} hideNames={HIDE_CENTER_POLES} />

          {/* Cahaya isi hangat lembut menyorot kelompok 12 karakter di tengah Warkop 24 Jam */}
          <pointLight position={[0, 2.7, 3.4]} color="#ffe2a8" intensity={3.5} distance={16} decay={1.4} />
          <pointLight position={[-3.6, 2.4, 2.8]} color="#ffd494" intensity={1.8} distance={12} decay={1.5} />
          <pointLight position={[3.6, 2.4, 2.8]} color="#ffd494" intensity={1.8} distance={12} decay={1.5} />

          {/* =================================================================
              KUCING DI ATAS TEMPAT WARKOP (Atap Kanopi Kiri & Kanan, Y = 2.80m)
          ================================================================== */}

          {/* Atas Kiri Kanopi Warkop: Mpus Abu tidur loaf santai (Zzz) di samping papan WARKOP 24 JAM! */}
          <CatBillboard
            cat="abu"
            position={[-2.14, 2.8, -0.3]}
            faceTo={BANNER_CAM.pos}
            height={0.76}
            pose={{
              face: 'neutral',
              stance: 'sleep',
              view: 'threeQuarter',
              tailPhase: 0.25,
              facing: 0.38,
            }}
            castShadow={false}
            blobColor={light.card.blob}
          />

          {/* Atas Kanan Kanopi Warkop: Si Belang duduk santai gaya smug melirik ke bawah sambil angkat cakar! */}
          <CatBillboard
            cat="belang"
            position={[2.14, 2.8, -0.3]}
            faceTo={BANNER_CAM.pos}
            height={0.76}
            pose={{
              face: 'smug',
              stance: 'sit',
              view: 'threeQuarter',
              pawRaise: 'left',
              tailPhase: 1.35,
              facing: -0.38,
            }}
            castShadow={false}
            blobColor={light.card.blob}
          />

          {/* =================================================================
              BARIS BELAKANG (Di belakang konter & berdiri rapat — 100% TANGAN KOSONG!)
          ================================================================== */}

          {/* Bu Siti melambai ceria di belakang konter warkop */}
          <ActorBillboard
            actor="buSiti"
            position={[0.56, 0, -1.65]}
            faceTo={BANNER_CAM.pos}
            height={2.02}
            pose={{
              face: 'laugh',
              leftArm: 'wave',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'none',
              facing: -0.06,
            }}
            castShadow={false}
            blobColor={light.card.blob}
          />

          {/* CHARLAB C — Ink-Pop Comic (blazer biru, rambut spiky, gaya smug keren, tangan kosong!) */}
          <CharCard
            id="C"
            mode="idle"
            position={[-3.32, 0, 0.42]}
            faceTo={BANNER_CAM.pos}
            height={1.96}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Bang Udin Ojol berdempetan di samping Ink-Pop Comic, angkat tangan semangat! */}
          <ActorBillboard
            actor="bangUdin"
            position={[-2.62, 0, 0.32]}
            faceTo={BANNER_CAM.pos}
            height={1.96}
            pose={{
              face: 'laugh',
              stance: 'stand',
              leftArm: 'raise',
              rightArm: 'hip',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.42,
              lean: 4.5,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Mas Arya berdiri rapat di celah kiri belakang Pak Budi, melambai ramah! */}
          <ActorBillboard
            actor="arya"
            position={[-1.92, 0, 0.24]}
            faceTo={BANNER_CAM.pos}
            height={1.98}
            pose={{
              face: 'happy',
              stance: 'stand',
              leftArm: 'hip',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.32,
              lean: 3.5,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Saka Nusantara berdiri keren tangan bersedekap (cross) rapat di belakang Raka! */}
          <ActorBillboard
            actor="saka"
            position={[1.76, 0, 0.24]}
            faceTo={BANNER_CAM.pos}
            height={1.98}
            pose={{
              face: 'smug',
              stance: 'stand',
              leftArm: 'cross',
              rightArm: 'cross',
              leftProp: 'none',
              rightProp: 'none',
              facing: -0.32,
              lean: -3.5,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* CHARLAB A — Atelier Indie (rompi kuning + syal teal + kacamata bulat, melambai tangan kosong!) */}
          <CharCard
            id="A"
            mode="wave"
            position={[2.48, 0, 0.34]}
            faceTo={BANNER_CAM.pos}
            height={1.96}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* CHARLAB B — Squircle Plush (hoodie coral + kepala squircle, melambai ceria tangan kosong!) */}
          <CharCard
            id="B"
            mode="wave"
            position={[3.22, 0, 0.46]}
            faceTo={BANNER_CAM.pos}
            height={1.92}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* =================================================================
              BARIS TENGAH (BERDEMPETAN RAPAT BAHU-MEMBAHU BERSAMA BANG UTOH!)
              100% TANGAN KOSONG (ZERO HAND PROPS!)
          ================================================================== */}

          {/* Bang Dimas berdempetan di kiri Bang Utoh, gaya santai menunjuk ke Bang Utoh! */}
          <ActorBillboard
            actor="dimas"
            position={[-0.82, 0, 0.78]}
            faceTo={BANNER_CAM.pos}
            height={1.92}
            pose={{
              face: 'smug',
              stance: 'stand',
              leftArm: 'hip',
              rightArm: 'point',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.36,
              lean: 4.5,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* HERO TENGAH: Bang Utoh gaya keren bertolak pinggang & melambai ceria! */}
          <ActorBillboard
            actor="bangUtoh"
            position={[-0.04, 0, 0.98]}
            faceTo={BANNER_CAM.pos}
            height={2.04}
            pose={{
              face: 'happy',
              stance: 'stand',
              view: 'threeQuarter',
              leftArm: 'hip',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.12,
              lean: 1,
            }}
            stickerOutline={{ color: '#fff9ec', width: 7 }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Mbak Rara berdempetan di kanan Bang Utoh, gaya ramah melambai & bertolak pinggang! */}
          <ActorBillboard
            actor="rara"
            position={[0.98, 0, 0.8]}
            faceTo={BANNER_CAM.pos}
            height={1.9}
            pose={{
              face: 'idea',
              stance: 'stand',
              leftArm: 'wave',
              rightArm: 'hip',
              leftProp: 'none',
              rightProp: 'none',
              facing: -0.34,
              lean: -4.5,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* =================================================================
              BARIS DEPAN (PAK BUDI DUDUK + RAKA DUDUK BERSILA + KUCING DI BAWAH!)
          ================================================================== */}

          {/* Pak Budi (Pak RT) bergaya DUDUK santai tertawa ramah di depan kiri! */}
          <ActorBillboard
            actor="pakBudi"
            position={[-1.44, 0, 1.32]}
            faceTo={BANNER_CAM.pos}
            height={1.86}
            pose={{
              face: 'laugh',
              stance: 'sit',
              leftArm: 'hip',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.34,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Raka SMA bergaya JONGKOK NONGKRONG (squat) unik khas warkop sambil menunjuk ceria ke kucing kecil! */}
          <ActorBillboard
            actor="raka"
            position={[1.76, 0, 1.38]}
            faceTo={BANNER_CAM.pos}
            height={1.88}
            pose={{
              face: 'smug',
              stance: 'squat',
              leftArm: 'point',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'none',
              facing: -0.32,
              lean: -3,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Kucing di Bawah (Hero Maskot): Si Oyen duduk centil angkat cakar tepat di depan kaki Bang Utoh! */}
          <CatBillboard
            cat="oyen"
            position={[-0.48, 0, 1.64]}
            faceTo={BANNER_CAM.pos}
            height={0.78}
            pose={{
              face: 'happy',
              stance: 'sit',
              view: 'threeQuarter',
              pawRaise: 'right',
              tailPhase: 0.78,
              facing: 0.32,
            }}
            stickerOutline={{ color: '#fff9ec', width: 6 }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />

          {/* Kucing di Bawah (Sisi Kanan Depan): Kucing oren kecil berkalung merah melompat ceria di dekat Raka bersila! */}
          <CatBillboard
            cat="oyen"
            overrides={{
              id: 'oyenKecil',
              furBase: '#e89b4a',
              stripeColor: '#a6501c',
              collarColor: '#d9383a',
              bellColor: '#ffd54f',
            }}
            position={[0.74, 0, 1.62]}
            faceTo={BANNER_CAM.pos}
            height={0.6}
            pose={{
              face: 'laugh',
              stance: 'jump',
              view: 'threeQuarter',
              tailPhase: 0.45,
              facing: -0.36,
            }}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* Sentuhan bokeh cahaya hangat senja yang lembut (murni atmosfer visual) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {WARM_MOTES.map((m, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: m.size * s,
              height: m.size * s,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${m.color} 0%, rgba(255,210,120,0) 72%)`,
              opacity: m.opacity,
              filter: `blur(${1.5 * s}px)`,
            }}
          />
        ))}
      </div>

      {/* Vignette hangat tipis di tepi layar agar fokus mata tertuju ke geng Kampung Rawa Sari */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 76% 58% at 50% 50%, rgba(0,0,0,0) 58%, rgba(16,10,24,0.38) 100%)',
        }}
      />

      {/* Frame 1 saja: 1 Tanda tangan super minimalis menyatu di dinding bata kiri dalam zona aman */}
      {showMinimalSignature && (
        <div
          style={{
            position: 'absolute',
            left: 695 * s * (width / 2560),
            top: 562 * s,
            pointerEvents: 'none',
            fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
            transform: 'rotate(-2deg)',
          }}
        >
          <div
            style={{
              fontSize: 38 * s,
              fontWeight: 900,
              letterSpacing: 1.6 * s,
              color: '#fff6de',
              textShadow: `0 ${3.5 * s}px 0 #1f192d, ${2.5 * s}px 0 0 #1f192d, -${2.5 * s}px 0 0 #1f192d, 0 -${2.5 * s}px 0 #1f192d, 0 ${6 * s}px ${14 * s}px rgba(0,0,0,0.5)`,
              lineHeight: 1,
            }}
          >
            BANG UTOH
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
