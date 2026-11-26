import React, { useEffect, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CatBillboard,
  NOINK,
  PostStack,
  Stage,
  WARKOP_SPOTS,
  WarkopSet,
  useTwoToneMaterial,
  type CamPose,
  type PostParams,
  type Vec3,
} from '../../engine';
import {
  EP02_PLAK_FRAME,
  EP02_SCREEN_OK_FRAME,
  LOOK as EP02_LOOK,
  lightAt as ep02LightAt,
  postFor as ep02PostFor,
} from '../ep02-bang-utoh/look';
import {
  BENCH_SEAT_Y,
  EP03_SPOTS,
  STOOLS,
  SetPieces as Ep03SetPieces,
  bonLinesAt as ep03BonLinesAt,
  seatCardPos,
  type SetState as Ep03SetState,
} from '../ep03-tio-bakmie/set';
import { EP03_BON_FRAMES } from '../ep03-tio-bakmie/cast';
import {
  LOOK as EP03_LOOK,
  PRACTICALS as EP03_PRACTICALS,
  lightFor as ep03LightFor,
  postFor as ep03PostFor,
} from '../ep03-tio-bakmie/look';
import {
  EP04_SPOTS,
  STOOLS as EP04_STOOLS,
  SetPieces as Ep04SetPieces,
  seatCardPos as ep04SeatCardPos,
  type SetState as Ep04SetState,
} from '../ep04-karyawan-bakmie/set';
import {
  LOOK as EP04_LOOK,
  PRACTICALS as EP04_PRACTICALS,
  lightFor as ep04LightFor,
  postFor as ep04PostFor,
} from '../ep04-karyawan-bakmie/look';

/**
 * Komposisi Thumbnail 9:16 (1080×1920) bergaya YouTube Shorts / Reels / TikTok viral:
 * - Frame 0: EP02 "Konsultan Oyen"  (`47 ERROR` / `HILANG?!` + pill `KODENYA JUGA!`)
 * - Frame 1: EP03 "Curhat ke Abang Bakmie" (`CURHAT` / `GRATIS?!` + pill `DITAGIH 90RB!`)
 *
 * Struktur hierarki visual 3 tingkat:
 * 1. Atas (~5%–31%): Headline 2 baris kuning-emas ber-gradient + outline tebal gelap + pill badge krem-marun.
 * 2. Tengah (~31%–68%): Karakter 2D/3D ekspresif di set 3D toon-shaded hangat (Warkop / Gerobak Bakmie).
 * 3. Bawah-Tengah (~56%–84%): Prop fokus bercahaya (Laptop ✓ 0 ERROR hijau / Dandang & Bakmie hangat)
 *    + semburan asap/uap kartun kerucut bergaya flat-toon dengan bintik kecil.
 */

const CameraRig: React.FC<{ pose: CamPose }> = ({ pose }) => {
  const cam = useThree().camera as PerspectiveCamera;
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.rotateZ((pose.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

// ---------------------------------------------------------------------------------------------------------
// Overlay 2D/SVG: Headline 2 baris kuning-emas, Pill Badge krem-marun, Focal Glow, & Cartoon Smoke Jets
// ---------------------------------------------------------------------------------------------------------

type SmokeJetSpec = {
  /** Titik asal (ekor kerucut semburan) pada kanvas 1080×1920. */
  ox: number;
  oy: number;
  /** Titik kepala awan (ujung puff) pada kanvas 1080×1920. */
  tx: number;
  ty: number;
  /** Skala ukuran puff awan (1.0 ≈ radius utama ~64px). */
  scale: number;
  opacity?: number;
  tint?: string;
  shade?: string;
  speckColor?: string;
};

/** Semburan asap/uap kartun kerucut + puff awan 5-lobus + bintik gelap halus. */
const CartoonSmokeJet: React.FC<SmokeJetSpec> = ({
  ox,
  oy,
  tx,
  ty,
  scale,
  opacity = 0.9,
  tint = '#DFDAD2',
  shade = '#C6C0B7',
  speckColor = '#3C3236',
}) => {
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.hypot(dx, dy) || 1;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const coneW = 36 * scale;
  const r = 46 * scale;

  return (
    <g transform={`translate(${ox}, ${oy}) rotate(${angleDeg})`} opacity={opacity}>
      {/* Ekor kerucut mengecil ke sumber panas */}
      <path
        d={`M 0,0 L ${len - r * 0.25},${-coneW * 0.92} L ${len - r * 0.25},${coneW * 0.92} Z`}
        fill={tint}
      />
      {/* Bayangan lembut sisi bawah kerucut */}
      <path
        d={`M 0,0 L ${len - r * 0.3},${coneW * 0.15} L ${len - r * 0.25},${coneW * 0.92} Z`}
        fill={shade}
        opacity={0.45}
      />
      {/* Awan puff 5-lobus di ujung */}
      <g transform={`translate(${len}, 0)`}>
        <circle cx={-r * 0.42} cy={-r * 0.44} r={r * 0.72} fill={tint} />
        <circle cx={-r * 0.36} cy={r * 0.48} r={r * 0.68} fill={shade} opacity={0.55} />
        <circle cx={-r * 0.38} cy={r * 0.44} r={r * 0.64} fill={tint} />
        <circle cx={r * 0.18} cy={-r * 0.56} r={r * 0.78} fill={tint} />
        <circle cx={r * 0.24} cy={r * 0.52} r={r * 0.72} fill={tint} />
        <circle cx={r * 0.52} cy={0} r={r * 0.84} fill={tint} />
        <circle cx={0} cy={0} r={r * 0.88} fill={tint} />
        {/* Highlight bagian atas awan */}
        <circle cx={r * 0.12} cy={-r * 0.34} r={r * 0.44} fill="#F2EFEA" opacity={0.55} />
      </g>
      {/* Bintik abu / partikel kartun di dalam kerucut & awan */}
      <circle cx={len * 0.46} cy={-4 * scale} r={3.4 * scale} fill={speckColor} opacity={0.72} />
      <circle cx={len * 0.62} cy={8 * scale} r={4.2 * scale} fill={speckColor} opacity={0.62} />
      <circle cx={len * 0.78} cy={-12 * scale} r={3.0 * scale} fill={speckColor} opacity={0.65} />
      <circle cx={len * 0.96} cy={14 * scale} r={4.5 * scale} fill={speckColor} opacity={0.55} />
      <circle cx={len * 1.1} cy={-18 * scale} r={3.6 * scale} fill={speckColor} opacity={0.52} />
      <circle cx={len * 0.88} cy={-26 * scale} r={2.6 * scale} fill={speckColor} opacity={0.6} />
    </g>
  );
};

/** Mini puff awan melayang terpisah di sekitar sumber uap. */
const MiniCloudPuff: React.FC<{ cx: number; cy: number; r: number; opacity?: number; tint?: string }> = ({
  cx,
  cy,
  r,
  opacity = 0.72,
  tint = '#E2DDD5',
}) => (
  <g transform={`translate(${cx}, ${cy})`} opacity={opacity}>
    <circle cx={-r * 0.55} cy={r * 0.12} r={r * 0.62} fill={tint} />
    <circle cx={r * 0.52} cy={r * 0.14} r={r * 0.58} fill={tint} />
    <circle cx={0} cy={-r * 0.25} r={r * 0.72} fill={tint} />
    <circle cx={0} cy={r * 0.18} r={r * 0.66} fill={tint} />
    <circle cx={r * 0.12} cy={-r * 0.04} r={r * 0.1} fill="#3C3236" opacity={0.5} />
    <circle cx={-r * 0.28} cy={r * 0.14} r={r * 0.08} fill="#3C3236" opacity={0.45} />
  </g>
);

type ShortsOverlayProps = {
  line1: string;
  line2: string;
  pillText: string;
  /** Ukuran font headline (default 118 — compact & aman di YouTube Shorts shelf/grid). */
  headlineSize?: number;
  /** Lebar pill badge (default 620 — margin kiri-kanan lega di 9:16). */
  pillWidth?: number;
  /** Geser vertikal seluruh blok teks (px pada kanvas 1920; default 0 -> mulai aman di y ≈ 225px / 11.7% dari atas). */
  topOffset?: number;
  /** Tambahan elemen SVG FX (glow / smoke jets / sparkles) yang dirender DI BELAKANG teks headline. */
  fxLayer?: React.ReactNode;
};

const ShortsThumbOverlay: React.FC<ShortsOverlayProps> = ({
  line1,
  line2,
  pillText,
  headlineSize = 106,
  pillWidth = 570,
  topOffset = 0,
  fxLayer,
}) => {
  // Zona aman 4-Platform (YT Shorts 2:3, IG/TikTok 3:4 Grid, DAN FB/IG 4:5 Feed y=285..1635!):
  // Puncak stroke baris 1 mulai aman di y ≈ 300px (+15px di bawah garis 4:5 y=285), pill berakhir di y ≈ 594px!
  const line1Y = 388 + topOffset;
  const line2Y = 492 + topOffset;
  const pillH = 78;
  const pillX = (1080 - pillWidth) / 2;
  const pillY = 516 + topOffset;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg
        viewBox="0 0 1080 1920"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Gradient emas-kuning cerah headline */}
          <linearGradient id="shortsHeadlineGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF270" />
            <stop offset="48%" stopColor="#FFD833" />
            <stop offset="100%" stopColor="#F2A911" />
          </linearGradient>

          {/* Vignette atas & bawah lembut agar headline & safe-zone terbaca tajam */}
          <linearGradient id="shortsTopShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B1018" stopOpacity="0.42" />
            <stop offset="68%" stopColor="#1B1018" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#1B1018" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="shortsBottomShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#180F16" stopOpacity="0" />
            <stop offset="100%" stopColor="#180F16" stopOpacity="0.42" />
          </linearGradient>

          {/* Bayangan solid tegas di bawah huruf & pill */}
          <filter id="shortsHardShadow" x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="3" floodColor="#180C14" floodOpacity="0.62" />
          </filter>
          <filter id="shortsPillShadow" x="-15%" y="-20%" width="130%" height="160%">
            <feDropShadow dx="0" dy="7" stdDeviation="4.5" floodColor="#180C14" floodOpacity="0.52" />
          </filter>
        </defs>

        {/* Layer FX kartun (cahaya prop & asap/uap) */}
        {fxLayer}

        {/* Vignette atas & bawah */}
        <rect x="0" y="0" width="1080" height="660" fill="url(#shortsTopShade)" />
        <rect x="0" y="1600" width="1080" height="320" fill="url(#shortsBottomShade)" />

        {/* HEADLINE 2 BARIS KUNING EMAS (100% lulus YT Shorts 2:3, IG/TikTok 3:4, & FB/IG 4:5 Feed!) */}
        <g filter="url(#shortsHardShadow)">
          <text
            x="540"
            y={line1Y}
            textAnchor="middle"
            fontFamily="'Arial Black', 'Segoe UI Black', 'Impact', sans-serif"
            fontWeight="900"
            fontSize={headlineSize}
            letterSpacing="-1.2"
            fill="url(#shortsHeadlineGold)"
            stroke="#21141C"
            strokeWidth="20"
            strokeLinejoin="round"
            paintOrder="stroke fill"
          >
            {line1}
          </text>
          <text
            x="540"
            y={line2Y}
            textAnchor="middle"
            fontFamily="'Arial Black', 'Segoe UI Black', 'Impact', sans-serif"
            fontWeight="900"
            fontSize={headlineSize}
            letterSpacing="-1.2"
            fill="url(#shortsHeadlineGold)"
            stroke="#21141C"
            strokeWidth="20"
            strokeLinejoin="round"
            paintOrder="stroke fill"
          >
            {line2}
          </text>
        </g>

        {/* PILL BADGE KREM BER-BORDER TEBAL + TEKS MARUN */}
        <g filter="url(#shortsPillShadow)">
          <rect
            x={pillX}
            y={pillY}
            width={pillWidth}
            height={pillH}
            rx={pillH / 2}
            ry={pillH / 2}
            fill="#FFF7E8"
            stroke="#21141C"
            strokeWidth="9"
          />
          <text
            x="540"
            y={pillY + 53}
            textAnchor="middle"
            fontFamily="'Arial Black', 'Segoe UI Black', 'Montserrat', sans-serif"
            fontWeight="900"
            fontSize="41"
            letterSpacing="0.8"
            fill="#7A131C"
          >
            {pillText}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------
// FRAME 0: EP02 "KONSULTAN OYEN" — 47 ERROR / HILANG?! · KODENYA JUGA!
// ---------------------------------------------------------------------------------------------------------

const WARKOP_THUMB_HIDE = [
  'WK_TableCup1',
  'WK_TableCup1_L',
  'WK_TissueBox',
  'WK_KerupukJar',
  'WK_KerupukLid',
  'WK_Kerupuk_',
  'WK_SignBoxFace',
  'WK_SignBoxFrame',
  'WK_SignMain',
  'WK_SignSub',
  // Sembunyikan bangku depan WK_BenchL & kursi belakang meja agar framing frontal bersih tanpa potongan kursi acak!
  'WK_BenchL',
  'WK_StoolRed',
  'WK_StoolBlue',
];

function makeThumbLaptopTex(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 640;
  const H = 400;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;

  // Latar terminal hijau gelap berkilau
  g.fillStyle = '#062013';
  g.fillRect(0, 0, W, H);

  // Header bar hijau neon cerah
  g.fillStyle = '#22e575';
  g.fillRect(0, 0, W, 74);
  g.fillStyle = '#041f0e';
  g.font = '900 38px "Segoe UI", sans-serif';
  g.fillText('BUILD SUCCESS  ·  0 BARIS', 28, 50);

  // Teks raksasa ✓ 0 ERROR sangat kontras agar terbaca di ukuran thumbnail feed!
  g.fillStyle = '#4eff95';
  g.font = '900 112px "Segoe UI", sans-serif';
  g.fillText('✓ 0 ERROR', 34, 224);

  // Baris punchline kecil di bawah: mmmmmmeeeeee
  g.fillStyle = '#fef08a';
  g.font = '900 40px monospace';
  g.fillText('1 | mmmmmmeeeeee_', 44, 314);

  // Taskbar bawah gelap
  g.fillStyle = '#0a1622';
  g.fillRect(0, H - 44, W, 44);
  g.fillStyle = '#38bdf8';
  g.fillRect(16, H - 34, 24, 24);
  g.fillStyle = '#e2e8f0';
  g.font = '700 22px monospace';
  g.fillText('tugas_final.py', 52, H - 14);
  g.fillStyle = '#fde047';
  g.font = '900 28px monospace';
  g.fillText('06:58', W - 114, H - 12);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const Ep02ThumbLaptopAndCups: React.FC = () => {
  const ly = WARKOP_SPOTS.laptopTable[1]; // 0.77
  const bodyMat = useTwoToneMaterial({ color: '#273046' }, []);
  const keyMat = useTwoToneMaterial({ color: '#141926' }, []);
  const glassMat = useTwoToneMaterial({ color: '#e4f2ff' }, []);
  const coffeeMat = useTwoToneMaterial({ color: '#3b2012' }, []);
  const tex = useMemo(() => makeThumbLaptopTex(), []);
  useEffect(() => () => tex?.dispose(), [tex]);

  // 3 gelas kopi begadang berjejer rapi di sisi kiri meja (bebas laptop & keluar uap kartun!)
  const cups: Vec3[] = [
    [-2.07, ly, 0.62],
    [-1.97, ly, 0.54],
    [-1.88, ly, 0.65],
  ];

  return (
    <group name="Thumb_EP02_TableProps">
      {/* Laptop diperbesar (1.42×) & menghadap kamera depan agar ✓ 0 ERROR jadi focal prop super terbaca! */}
      <group position={[-1.56, ly, 0.56]} rotation={[0, 0.05, 0]} scale={[1.42, 1.42, 1.42]}>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow material={bodyMat}>
          <boxGeometry args={[0.34, 0.024, 0.22]} />
        </mesh>
        <mesh position={[0, 0.026, 0.01]} material={keyMat}>
          <boxGeometry args={[0.29, 0.006, 0.14]} />
        </mesh>
        <group position={[0, 0.022, -0.105]} rotation={[-0.14, 0, 0]}>
          <mesh position={[0, 0.11, 0]} castShadow material={bodyMat}>
            <boxGeometry args={[0.34, 0.22, 0.016]} />
          </mesh>
          {tex && (
            <mesh
              position={[0, 0.11, 0.011]}
              ref={(m) => {
                if (m) m.layers.set(NOINK);
              }}
            >
              <planeGeometry args={[0.315, 0.196]} />
              <meshBasicMaterial map={tex} />
            </mesh>
          )}
        </group>
      </group>

      {/* 3 gelas kopi begadang penuh di sisi kiri */}
      {cups.map(([cx, cy, cz], idx) => (
        <group key={idx} position={[cx, cy, cz]} scale={[1.22, 1.22, 1.22]}>
          <mesh position={[0, 0.045, 0]} castShadow material={glassMat}>
            <cylinderGeometry args={[0.029, 0.023, 0.09, 12]} />
          </mesh>
          <mesh position={[0, 0.042, 0]} material={coffeeMat}>
            <cylinderGeometry args={[0.026, 0.021, 0.072, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const EP02_THUMB_CAM: CamPose = {
  pos: [-1.42, 1.32, 2.74],
  look: [-1.42, 1.33, 0.18],
  fov: 45,
  roll: 0,
};

const Ep02ShortsThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  const baseLight = ep02LightAt('warkop-layar', EP02_SCREEN_OK_FRAME + 24, {
    screen: 'ok',
    plakFrame: EP02_PLAK_FRAME,
  });
  const basePost = ep02PostFor('warkop-layar', 0.06, 2.7);
  const post: PostParams = {
    ...basePost,
    ink: { ...basePost.ink, strength: 1.0 },
    bloom: { ...basePost.bloom, strength: 0.42 },
    grade: {
      ...basePost.grade,
      saturation: 1.16,
      contrast: 1.08,
    },
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#1b1412' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: EP02_THUMB_CAM.fov, position: EP02_THUMB_CAM.pos, near: 0.1, far: 400 }}
      >
        <CameraRig pose={EP02_THUMB_CAM} />
        <Stage
          light={baseLight}
          ground={EP02_LOOK.ground}
          showGround={false}
          camPos={EP02_THUMB_CAM.pos}
          camLook={EP02_THUMB_CAM.look}
        >
          <WarkopSet lightId="noon" hideNames={WARKOP_THUMB_HIDE} />

          {/* Lampu praktis hangat warkop + glow hijau neon kuat dari layar laptop ✓ 0 ERROR */}
          <pointLight position={[-1.35, 2.35, -0.4]} color="#ffd58a" intensity={2.4} distance={6} decay={2} />
          <pointLight position={[-1.56, 1.02, 0.72]} color="#2eff88" intensity={3.8} distance={2.8} decay={1.6} />
          <pointLight position={[-1.58, 1.38, 0.45]} color="#42ff96" intensity={1.8} distance={2.4} decay={2} />

          <Ep02ThumbLaptopAndCups />

          {/* Bang Utoh berdiri di balik meja kiri, syok berat — kepala aman di bawah pill & bergeser kiri menjauhi tombol UI kanan! */}
          <ActorBillboard
            actor="bangUtoh"
            position={[-1.72, 0.0, -0.06]}
            faceTo={EP02_THUMB_CAM.pos}
            height={1.98}
            pose={{
              face: 'shock',
              stance: 'stand',
              view: 'front',
              leftArm: 'raise',
              rightArm: 'raise',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0.04,
              lean: -0.02,
              fx: 'sweat',
              hatPop: 0.8,
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />

          {/* Si Oyen duduk super smug di atas meja kanan laptop — geser ke x=-1.21 agar 100% bebas zona UI buttons x=920..1080! */}
          <CatBillboard
            cat="oyen"
            position={[-1.21, WARKOP_SPOTS.laptopTable[1], 0.48]}
            faceTo={EP02_THUMB_CAM.pos}
            height={0.56}
            pose={{
              face: 'smug',
              stance: 'sit',
              facing: -0.25,
              tailPhase: 0.9,
              earTwitch: -0.2,
              pawRaise: 'left',
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      <ShortsThumbOverlay
        line1="47 ERROR"
        line2="HILANG?!"
        pillText="KODENYA JUGA!"
        headlineSize={104}
        pillWidth={555}
        topOffset={0}
        fxLayer={
          <g>
            <defs>
              {/* Cahaya hijau neon memancar lembut dari layar laptop ✓ 0 ERROR */}
              <radialGradient id="ep02LaptopGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6EFFA8" stopOpacity="0.52" />
                <stop offset="46%" stopColor="#18E06A" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Aura hijau memancar dari laptop (100% bebas wajah!) */}
            <ellipse cx="425" cy="1390" rx="310" ry="215" fill="url(#ep02LaptopGlow)" />

            {/* 2 semburan uap kopi kartun kerucut murni keluar dari gelas kopi kiri (bebas bezel laptop & bebas pergelangan tangan Utoh!) */}
            <CartoonSmokeJet ox={72} oy={1490} tx={64} ty={1225} scale={0.78} opacity={0.88} />
            <CartoonSmokeJet ox={142} oy={1510} tx={168} ty={1265} scale={0.66} opacity={0.84} />
            <MiniCloudPuff cx={112} cy={1135} r={26} opacity={0.68} />

            {/* Bintang komik kecil aksen di luar siluet wajah & bebas tombol kanan */}
            <g fill="#FFF270" stroke="#21141C" strokeWidth="5" strokeLinejoin="round">
              <polygon points="785,1035 794,1055 816,1059 799,1074 803,1095 785,1084 767,1095 771,1074 754,1059 776,1055" />
              <polygon points="104,705 111,722 129,725 115,737 119,755 104,745 89,755 93,737 79,725 97,722" />
            </g>
          </g>
        }
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------
// FRAME 1: EP03 "CURHAT KE ABANG BAKMIE" — CURHAT / GRATIS?! · DITAGIH 90RB!
// Catatan sumbu kamera (+Z): +X = KIRI layar, -X = KANAN layar!
// ---------------------------------------------------------------------------------------------------------

const EP03_THUMB_CAM: CamPose = {
  // Geser fokus ke -X (-13.48) & mundur sedikit (13.38) agar Bon 90rb bebas UI kanan (x<920) & Oyen aman di atas garis 4:5 (y<1635)!
  pos: [-13.48, 1.32, 13.38],
  look: [-13.48, 1.24, 17.55],
  fov: 46,
  roll: 0,
};

const EP03_THUMB_SET_STATE: Ep03SetState = {
  frame: 1800,
  bon: ep03BonLinesAt(1800, EP03_BON_FRAMES),
  bowlVisible: true,
  esTehVisible: true,
  plates: 3,
  fish: 1,
  moth: null,
};

const Ep03ShortsThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  const baseLight = ep03LightFor('ep03-malam');
  const basePost = ep03PostFor(0.05, 3.3);
  const post: PostParams = {
    ...basePost,
    ink: { ...basePost.ink, strength: 1.0 },
    bloom: { ...basePost.bloom, strength: 0.45 },
    grade: {
      ...basePost.grade,
      saturation: 1.18,
      contrast: 1.08,
    },
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#12101a' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: EP03_THUMB_CAM.fov, position: EP03_THUMB_CAM.pos, near: 0.08, far: 600 }}
      >
        <CameraRig pose={EP03_THUMB_CAM} />
        <Stage
          light={baseLight}
          ground={EP03_LOOK.ground}
          showGround={false}
          camPos={EP03_THUMB_CAM.pos}
          camLook={EP03_THUMB_CAM.look}
        >
          <Ep03SetPieces state={EP03_THUMB_SET_STATE} />

          {/* Lampu praktis malam EP03 + cahaya api/dandang hangat keemasan menyala dari gerobak bakmie */}
          <group name="Thumb_EP03_Lights">
            {EP03_PRACTICALS.map((p) => (
              <pointLight
                key={p.name}
                position={p.position}
                color={p.color}
                intensity={p.intensity * 1.15}
                distance={p.distance}
                decay={p.decay}
              />
            ))}
            <pointLight position={[-13.06, 1.32, 17.52]} color="#ff9224" intensity={4.2} distance={3.8} decay={1.6} />
            <pointLight position={[-13.12, 1.65, 16.5]} color="#ffd89e" intensity={1.6} distance={3.5} decay={2} />
          </group>

          {/* Abang Tio berdiri gagah di balik gerobak bakmie sambil pegang sodet (pusat komposisi!) */}
          <ActorBillboard
            actor="tio"
            position={[-13.12, 0.36, EP03_SPOTS.tio[2]]}
            faceTo={EP03_THUMB_CAM.pos}
            height={2.02}
            pose={{
              face: 'smug',
              stance: 'stand',
              view: 'front',
              leftArm: 'point',
              rightArm: 'wave',
              leftProp: 'none',
              rightProp: 'sodet',
              facing: 0.02,
              lean: 0.02,
              fx: 'none',
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />

          {/* Bang Utoh syok berat duduk pas di kursi kayunya via seatCardPos + sitHeight (0% nembus bangku!) */}
          <ActorBillboard
            actor="bangUtoh"
            position={seatCardPos(EP03_SPOTS.utohSeat, STOOLS.utoh.half, EP03_THUMB_CAM.pos)}
            faceTo={EP03_THUMB_CAM.pos}
            height={1.82}
            pose={{
              face: 'shock',
              stance: 'sit',
              sitHeight: BENCH_SEAT_Y,
              view: 'front',
              leftArm: 'raise',
              rightArm: 'raise',
              leftProp: 'none',
              rightProp: 'none',
              facing: 0,
              lean: 0,
              fx: 'sweat',
              hatPop: 0.65,
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />

          {/* Si Oyen duduk santai super smug pas di tengah kursi merah via seatCardPos (0% nembus bangku!) */}
          <CatBillboard
            cat="oyen"
            position={seatCardPos(EP03_SPOTS.oyenSeat, STOOLS.oyen.half, EP03_THUMB_CAM.pos)}
            faceTo={EP03_THUMB_CAM.pos}
            height={0.58}
            pose={{
              face: 'smug',
              stance: 'sit',
              facing: 0.2,
              tailPhase: 1.1,
              earTwitch: -0.15,
              pawRaise: 'right',
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      <ShortsThumbOverlay
        line1="CURHAT"
        line2="GRATIS?!"
        pillText="DITAGIH 90RB!"
        headlineSize={108}
        pillWidth={575}
        topOffset={10}
        fxLayer={
          <g>
            <defs>
              {/* Cahaya api / kuah panas oranye-kuning memancar tepat dari dandang & mangkok bakmie */}
              <radialGradient id="ep03StoveGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF078" stopOpacity="0.65" />
                <stop offset="40%" stopColor="#FF8E1C" stopOpacity="0.34" />
                <stop offset="74%" stopColor="#E63B0E" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#E63B0E" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Aura api kompor bakmie hangat tepat di dandang kiri (dipersempit agar 100% bebas headphone Utoh & 3 piring ayam!) */}
            <ellipse cx="215" cy="1085" rx="160" ry="110" fill="url(#ep03StoveGlow)" />

            {/* Lidah api kompor ringkas tepat di bawah bibir kiri-tengah dandang (x=162..264, y=1072..1124 -> 0% sentuh headphone x>=290 & di atas 3 piring ayam!) */}
            <g opacity="0.82" transform="translate(-85, 396) scale(0.57)">
              <path
                d="M 435,1270 Q 450,1208 476,1245 Q 500,1176 530,1238 Q 558,1194 580,1250 Q 600,1218 614,1270 Z"
                fill="#FF6B14"
                opacity="0.7"
              />
              <path
                d="M 462,1270 Q 480,1225 504,1250 Q 526,1205 550,1248 Q 570,1228 588,1270 Z"
                fill="#FFD83B"
                opacity="0.82"
              />
            </g>

            {/* Semburan uap panas kartun kerucut keluar tepat dari mulut dandang kiri (100% bebas wajah, headphone, & kaca etalase!) */}
            <CartoonSmokeJet ox={205} oy={1095} tx={82} ty={905} scale={0.94} opacity={0.9} />
            <CartoonSmokeJet ox={260} oy={1082} tx={206} ty={910} scale={0.68} opacity={0.85} />
            <MiniCloudPuff cx={142} cy={805} r={34} opacity={0.74} />
          </g>
        }
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------
// Frame 2: EP04 — "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!" (`KERJA LUNASIN` / `BON 90RB?!` + `BOSNYA SI OYEN!`)
// ---------------------------------------------------------------------------------------------------------

const EP04_THUMB_CAM: CamPose = {
  pos: [-12.68, 1.38, 13.35],
  look: [-12.68, 1.32, 17.6],
  fov: 48,
  roll: 0,
};

const Ep04ShortsThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  const baseLight = ep04LightFor('night');
  const post = ep04PostFor(0.18, 3.8);

  const setState: Ep04SetState = {
    frame: 42,
    bowlUjangVisible: false,
    ujangAyamCount: 2,
    insertAyamLift: 0,
    flatLayPawT: 0,
    mandorPromoted: false,
    mandorFlipT: 0,
    bestEmployeeVisible: true,
    bestEmployeePop: 0,
    deployBowlsCount: 0,
    slipInsertVisible: false,
    slipProgress: 0,
    cashVisible: false,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1022' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: EP04_THUMB_CAM.fov, position: EP04_THUMB_CAM.pos, near: 0.08, far: 800 }}
      >
        <CameraRig pose={EP04_THUMB_CAM} />
        <Stage
          light={baseLight}
          ground={EP04_LOOK.ground}
          showGround={false}
          camPos={EP04_THUMB_CAM.pos}
          camLook={EP04_THUMB_CAM.look}
        >
          <Ep04SetPieces state={setState} />
          <group name="EP04_ThumbLights">
            {EP04_PRACTICALS.map((p) => (
              <pointLight
                key={p.name}
                position={p.position}
                color={p.color}
                intensity={p.intensity * 1.15}
                distance={p.distance}
                decay={p.decay}
              />
            ))}
            <pointLight position={[-12.95, 1.35, 17.4]} color="#ff9224" intensity={3.8} distance={3.8} decay={1.6} />
          </group>

          {/* Bang Utoh syok berkeringat di balik gerobak pegang sodet */}
          <ActorBillboard
            actor="bangUtoh"
            position={EP04_SPOTS.utohDefault}
            faceTo={EP04_THUMB_CAM.pos}
            height={1.96}
            pose={{
              face: 'shock',
              stance: 'stand',
              view: 'front',
              leftArm: 'hold',
              leftProp: 'sodet',
              leftHand: { reach: { x: 236, y: 566, t: 1 }, dx: -20, dy: -8, propTilt: Math.PI - 0.3, front: true },
              rightArm: 'raise',
              facing: 0,
              lean: -2,
              fx: 'sweat',
              hatPop: 0.65,
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />

          {/* Abang Tio bersedekap puas di sisi timur (utuh 100% di dalam bingkai!) */}
          <ActorBillboard
            actor="tio"
            position={[-12.22, 0, 17.55]}
            faceTo={EP04_THUMB_CAM.pos}
            height={1.96}
            pose={{
              face: 'smug',
              stance: 'stand',
              view: 'front',
              leftArm: 'cross',
              rightArm: 'point',
              facing: -0.25,
              lean: 1,
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />

          {/* Si Oyen duduk angkuh di kursi merah di depan papan MANDOR QC */}
          <CatBillboard
            cat="oyen"
            position={ep04SeatCardPos(EP04_SPOTS.oyenSeat, EP04_STOOLS.oyen.half, EP04_THUMB_CAM.pos)}
            faceTo={EP04_THUMB_CAM.pos}
            height={0.58}
            pose={{
              face: 'smug',
              stance: 'sit',
              facing: 0.15,
              tailPhase: 1.1,
              earTwitch: -0.1,
              pawRaise: 'left',
            }}
            castShadow={baseLight.card.castShadow}
            blobColor={baseLight.card.blob}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      <ShortsThumbOverlay
        line1="KERJA LUNASIN"
        line2="BON 90RB?!"
        pillText="BOSNYA SI OYEN!"
        headlineSize={96}
        pillWidth={610}
        topOffset={10}
        fxLayer={
          <g>
            <CartoonSmokeJet ox={575} oy={1015} tx={455} ty={855} scale={0.82} opacity={0.86} />
            <CartoonSmokeJet ox={610} oy={1005} tx={555} ty={860} scale={0.6} opacity={0.8} />
          </g>
        }
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------
// Komposisi Utama: Frame 0 = EP02, Frame 1 = EP03, Frame 2 = EP04
// ---------------------------------------------------------------------------------------------------------

export const ShortsThumbnailsProduction: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame === 1) return <Ep03ShortsThumb />;
  if (frame === 2) return <Ep04ShortsThumb />;
  return <Ep02ShortsThumb />;
};
