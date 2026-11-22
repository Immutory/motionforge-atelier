import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ActorBillboard,
  DEFAULT_POST,
  GRADE_PRESETS,
  KostSet,
  LIGHTS,
  PostStack,
  Stage,
  blinkLidAt,
  indoorLight,
  kickOffset,
  lerp,
  sampleCamera,
  smootherstep,
  talkAt,
  type ActorPose,
  type CamKey,
  type CamPose,
  type Kick,
  type PostParams,
  type TalkSample,
  type Vec3,
} from '../../engine';
import {
  SHORT_AUDIO,
  SHORT_CAPTIONS,
  SHORT_CTA_FRAME,
  SHORT_FPS,
  SHORT_SHOCK_FRAME,
  SHORT_VOICE_ENV,
  SHORT_WORDS,
} from './voice/words_short';

const CameraRig: React.FC<{ pose: CamPose; shake: { dx: number; dy: number; droll: number } }> = ({ pose, shake }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function realShortTalkAt(frame: number): TalkSample {
  const env = SHORT_VOICE_ENV[Math.min(SHORT_VOICE_ENV.length - 1, frame + 1)] ?? 0;
  if (env < 10) return { open: 0, shape: 'closed' };
  const sample = talkAt(SHORT_WORDS, frame, SHORT_FPS, 1);
  if (sample.open < 0.16) {
    return env > 24 ? { open: 0.32, shape: 'small' } : { open: 0, shape: 'closed' };
  }
  const scaled = Math.min(1, sample.open * (0.65 + (env / 100) * 0.55));
  return { open: Number(scaled.toFixed(3)), shape: sample.shape };
}

/**
 * 11 Shot Kamera Vertikal 9:16 (1080x1920) hasil kalibrasi Subagent Viral Short-Form Director:
 * fov 39..43, pos.z 2.35..3.55 agar Bang Utoh & properti kamar <KostSet /> masuk proporsional di layar vertikal!
 */
const CAMS_9X16: CamKey[] = [
  // 1. Hook Fast Swoop (0.0s..1.6s, f0..48): "Halo teman-teman! Kenalin..."
  { frame: 0, pose: { pos: [0.0, 2.08, 3.55], look: [0.0, 1.18, -0.65], fov: 43, roll: 0 }, cut: true },
  { frame: 38, pose: { pos: [0.05, 1.46, 2.65], look: [0.02, 1.24, -0.35], fov: 40, roll: 0 }, glide: 38 },

  // 2. Name Push-In (1.6s..4.8s, f48..144): "nama asli gue Bolohoutoh. Tapi panggil aja Bang Utoh."
  { frame: 56, pose: { pos: [0.12, 1.44, 2.42], look: [0.02, 1.26, -0.35], fov: 39, roll: 0.8 }, glide: 14 },

  // 3. Identity S1 TI (4.8s..7.3s, f145..220): "Gue mahasiswa S1 Teknik Informatika"
  { frame: 158, pose: { pos: [-0.28, 1.46, 2.85], look: [0.0, 1.22, -0.55], fov: 41, roll: 0 }, glide: 16 },

  // 4. Rapid OOTD Cuts (7.36s..10.5s, f221..315): Hoodie -> Headphone -> Kacamata
  { frame: 221, pose: { pos: [-0.14, 1.36, 2.38], look: [0.02, 1.18, -0.30], fov: 39, roll: -1.0 }, cut: true },
  { frame: 251, pose: { pos: [0.14, 1.50, 2.28], look: [0.02, 1.32, -0.30], fov: 38, roll: 1.2 }, cut: true },
  { frame: 271, pose: { pos: [-0.12, 1.48, 2.32], look: [0.02, 1.30, -0.30], fov: 38, roll: -1.0 }, cut: true },

  // 5. Room Tour Lead & Kasur/Weker (10.5s..12.5s, f316..375): "Yuk, gue ajak tur markas kecil gue!"
  { frame: 316, pose: { pos: [-0.25, 1.46, 3.05], look: [-0.82, 1.12, -0.95], fov: 42, roll: 0 }, cut: true },

  // 6. Wipe #1 (f375) -> Over-The-Shoulder Back View Dual-Monitor (12.5s..14.1s, f376..423)
  { frame: 376, pose: { pos: [-0.38, 1.50, 2.45], look: [0.12, 1.24, -1.85], fov: 42, roll: 0 }, cut: true },

  // 7. Wipe #2 (f423) -> Survival Kit 2 Kardus Mie Instan (14.1s..15.5s, f424..466)
  { frame: 424, pose: { pos: [0.72, 1.42, 2.95], look: [1.45, 1.08, -0.75], fov: 41, roll: 0 }, cut: true },

  // 8. False Victory "Asyik! Kodingan tugas hari ini udah kelar 100%. Tinggal tidur nyenyak!" (15.5s..19.9s, f467..597)
  { frame: 467, pose: { pos: [0.04, 1.46, 2.75], look: [0.02, 1.22, -0.55], fov: 40, roll: 0 }, cut: true },
  { frame: 590, pose: { pos: [0.08, 1.44, 2.48], look: [0.02, 1.24, -0.45], fov: 39, roll: 0 }, glide: 115 },

  // 9. "Eh, tunggu..." (19.95s..20.65s, f598..619): Monitor belakang mulai berkedip merah!
  { frame: 599, pose: { pos: [0.08, 1.46, 2.62], look: [-0.02, 1.26, -0.85], fov: 40, roll: 0.8 }, cut: true },

  // 10. CLIFFHANGER EXPLOSION "LOH?! KOK TIBA-TIBA MUNCUL ERROR 47 BARIS?!" (20.65s..23.4s, f620..701)
  //     Tight 9:16 Two-Shot: Bang Utoh panik di kiri + Kedua Monitor Merah menyala di kanan-atas!
  { frame: SHORT_SHOCK_FRAME, pose: { pos: [0.14, 1.45, 2.68], look: [-0.04, 1.24, -0.95], fov: 41, roll: -2.2 }, cut: true },
  { frame: 700, pose: { pos: [0.08, 1.44, 2.52], look: [-0.04, 1.24, -0.95], fov: 40, roll: 1.5 }, glide: 75 },

  // 11. CTA YOUTUBE OUTRO (23.4s..26.0s, f702..779): Kartu "FULL EPISODE #1 DI YOUTUBE" di atas + Bang Utoh di bawah!
  { frame: SHORT_CTA_FRAME, pose: { pos: [0.0, 1.48, 2.95], look: [0.0, 1.32, -0.65], fov: 42, roll: 0 }, cut: true },
  { frame: 779, pose: { pos: [0.0, 1.52, 3.25], look: [0.0, 1.34, -0.75], fov: 43, roll: 0 }, glide: 74 },
];

const KICKS: Kick[] = [
  { frame: SHORT_SHOCK_FRAME, strength: 0.13, length: 9 },
  { frame: 668, strength: 0.08, length: 7 },
  { frame: 470, strength: 0.05, length: 5 },
];

/**
 * Koreografi Karakter 2D Bang Utoh untuk Teaser 9:16 (100% TANGAN KOSONG — ZERO HAND PROPS!)
 */
function bangUtohShortAt(frame: number): { pos: Vec3; pose: ActorPose } {
  const talk = realShortTalkAt(frame);
  const blink = blinkLidAt(frame, 1, SHORT_FPS, [48, 145, 221, 251, 271, 316, 376, 424, 467, 598, SHORT_SHOCK_FRAME - 2, SHORT_CTA_FRAME]);
  const walkPhase = (frame % 14) / 14;
  const gentleLean = Math.sin(frame / 14) * 1.5;

  // 1. Hook & Intro Name (f0..144, 0.0..4.8s)
  if (frame < 145) {
    const isBangUtoh = frame >= 98;
    const isBolo = frame >= 48 && frame < 98;
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: frame < 32 ? 'laugh' : isBangUtoh ? 'smug' : 'happy',
        blink,
        talk,
        stance: 'stand',
        view: frame < 48 ? 'front' : 'threeQuarter',
        leftArm: 'hip',
        rightArm: frame < 48 ? 'wave' : isBangUtoh ? 'point' : 'raise',
        fx: frame < 36 || isBolo ? 'sparkle' : 'none',
        lean: gentleLean,
        facing: frame < 48 ? 0 : 0.22,
      },
    };
  }

  // 2. Identity S1 TI (f145..220, 4.8..7.36s)
  if (frame < 221) {
    const walkIn = frame < 180;
    const t = smootherstep(Math.max(0, Math.min(1, (frame - 145) / 35)));
    return {
      pos: [lerp(-0.24, 0.04, t), 0, -0.28],
      pose: {
        face: 'happy',
        blink,
        talk,
        stance: walkIn ? 'walk' : 'stand',
        walkPhase,
        view: 'threeQuarter',
        leftArm: walkIn ? 'rest' : 'hip',
        rightArm: walkIn ? 'rest' : 'point',
        fx: !walkIn ? 'sparkle' : 'none',
        lean: walkIn ? undefined : gentleLean,
        facing: 0.25,
      },
    };
  }

  // 3. Rapid OOTD Cuts (f221..315, 7.36..10.5s) — ZERO HAND PROPS!
  if (frame < 251) {
    return {
      pos: [0.02, 0, -0.28],
      pose: { face: 'happy', blink, talk, stance: 'stand', view: 'front', leftArm: 'hip', rightArm: 'hip', fx: 'sparkle', lean: gentleLean },
    };
  }
  if (frame < 271) {
    const bounce = Math.sin(((frame - 251) / 20) * Math.PI) * 0.36;
    return {
      pos: [0.02, 0, -0.28],
      pose: { face: 'laugh', blink, talk, stance: 'stand', view: 'threeQuarter', leftArm: 'raise', rightArm: 'hip', hatPop: bounce, fx: 'sparkle', facing: -0.18 },
    };
  }
  if (frame < 316) {
    return {
      pos: [0.02, 0, -0.28],
      pose: { face: 'smug', blink, talk, stance: 'stand', view: 'threeQuarter', leftArm: 'cross', rightArm: 'cross', fx: 'sparkle', facing: 0.22 },
    };
  }

  // 4. Fast Room Tour (f316..466, 10.5..15.5s)
  if (frame < 376) {
    // Menunjuk Kasur & Weker Merah
    return {
      pos: [-0.48, 0, -0.15],
      pose: { face: 'happy', blink, talk, stance: 'stand', view: 'threeQuarter', leftArm: 'point', rightArm: 'hip', fx: 'sparkle', lean: gentleLean, facing: -0.28 },
    };
  }
  if (frame < 424) {
    // Back-View Over-The-Shoulder menghadap Dual-Monitor!
    return {
      pos: [-0.52, 0, -0.42],
      pose: { face: 'focus', blink, talk, stance: 'stand', view: 'back', leftArm: 'hip', rightArm: 'point', lean: Math.sin(frame / 10) * 1.5 },
    };
  }
  if (frame < 467) {
    // Survival Kit 2 Kardus Mie Instan
    return {
      pos: [0.95, 0, 0.16],
      pose: { face: 'laugh', blink, talk, stance: 'stand', view: 'threeQuarter', leftArm: 'hip', rightArm: 'point', fx: 'sparkle', lean: gentleLean, facing: 0.3 },
    };
  }

  // 5. Setup "Asyik! Kodingan tugas hari ini udah kelar 100%. Tinggal tidur nyenyak!" (f467..597, 15.5..19.9s)
  if (frame < 598) {
    const jumping = frame < 495;
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: jumping ? 'laugh' : 'smug',
        blink,
        talk,
        stance: jumping ? 'jump' : 'stand',
        view: 'threeQuarter',
        leftArm: jumping ? 'raise' : 'cross',
        rightArm: jumping ? 'raise' : 'cross',
        fx: 'sparkle',
        lean: jumping ? 0 : gentleLean,
        facing: 0.18,
      },
    };
  }

  // 6. "Eh, tunggu..." (f598..619, 19.95..20.65s) — Melirik curiga ke monitor belakang yang berkedip merah!
  if (frame < SHORT_SHOCK_FRAME) {
    return {
      pos: [-0.20, 0, -0.24],
      pose: {
        face: 'skeptical',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'hip',
        rightArm: 'rest',
        fx: 'question',
        lean: -1.8,
        facing: -0.28,
      },
    };
  }

  // 7. CLIFFHANGER EXPLOSION "LOH?! KOK TIBA-TIBA MUNCUL ERROR 47 BARIS?!" (f620..701, 20.65..23.4s)
  if (frame < SHORT_CTA_FRAME) {
    const after = frame - SHORT_SHOCK_FRAME;
    const panicWave = after >= 10 && after % 8 < 4;
    return {
      pos: [-0.26, 0, -0.24],
      pose: {
        face: 'shock',
        blink,
        talk: after < 9 ? { open: 0.9, shape: 'o' } : talk,
        stance: after < 10 ? 'jump' : 'stand',
        view: 'front',
        leftArm: panicWave ? 'wave' : 'raise',
        rightArm: panicWave ? 'raise' : 'wave',
        hatPop: Math.min(1, (after + 1) / 3),
        fx: 'shock',
        lean: -3.2 + Math.sin(frame * 1.2) * 1.6,
      },
    };
  }

  // 8. CTA YOUTUBE OUTRO (f702..779, 23.4..26.0s): Bang Utoh bergaris stiker putih menunjuk kartu YouTube di atas & melambai!
  const subJump = frame >= 742 && frame < 760;
  const byeWave = frame >= 760;
  return {
    pos: [0.0, 0, -0.18],
    pose: {
      face: subJump || byeWave ? 'laugh' : 'happy',
      blink,
      talk,
      stance: subJump ? 'jump' : 'stand',
      view: 'front',
      leftArm: byeWave ? 'wave' : subJump ? 'raise' : 'hip',
      rightArm: byeWave ? 'wave' : 'raise',
      fx: 'sparkle',
      lean: subJump ? 0 : gentleLean,
    },
  };
}

/** Transisi Tiang Kayu Foreground Wipe untuk 9:16 */
const ForegroundWipe: React.FC<{ frame: number; at: number; width: number }> = ({ frame, at, width }) => {
  const span = 10;
  const rel = frame - (at - span / 2);
  if (rel < 0 || rel > span) return null;
  const t = rel / span;
  const x = lerp(width * 1.15, -width * 0.65, smootherstep(t));
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: x,
        width: width * 0.52,
        background: 'linear-gradient(90deg, #4b2d18 0%, #7c4d2b 35%, #5e381e 75%, #2d180c 100%)',
        boxShadow: '0 0 65px rgba(0,0,0,0.65)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    />
  );
};

const YELLOW_KEYWORDS = [
  'bolohoutoh',
  'bang utoh',
  's1 teknik',
  'informatika',
  'headphone',
  'dual-monitor',
  'mie instan',
  'asyik',
  '100%',
  'like',
  'subscribe',
  'dadah',
];

/**
 * Subtitle 9:16 di Golden Sweet-Spot (`bottom: 24.5%`) — 100% bebas dari tertutup caption & tombol kanan TikTok/Reels/Shorts!
 */
const ShortSafeSubtitle: React.FC<{
  text: string;
  ageFrames: number;
  tone: 'normal' | 'yellow' | 'red';
  width: number;
  height: number;
}> = ({ text, ageFrames, tone, width, height }) => {
  const pop =
    ageFrames < 2
      ? lerp(0.82, 1.10, ageFrames / 2)
      : ageFrames < 5
        ? lerp(1.10, 1.0, (ageFrames - 2) / 3)
        : 1.0;

  const isEmph = tone !== 'normal';
  const s = width / 1080;
  const fontSize = (tone === 'red' ? 84 : isEmph ? 76 : 68) * s;
  const strokeW = (isEmph ? 18 : 15) * s;
  const fillColor = tone === 'red' ? '#ff4d5e' : tone === 'yellow' ? '#ffe047' : '#ffffff';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: height * 0.245,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `scale(${pop})`,
      }}
    >
      <svg width={width} height={160 * s} viewBox={`0 0 ${width} ${160 * s}`} style={{ overflow: 'visible' }}>
        <defs>
          <filter id="shortSubShadow" x="-10%" y="-20%" width="120%" height="150%">
            <feDropShadow dx="0" dy={6 * s} stdDeviation={4 * s} floodColor="#000000" floodOpacity="0.7" />
          </filter>
        </defs>
        <text
          x={width * 0.48}
          y={102 * s}
          textAnchor="middle"
          fill={fillColor}
          stroke="#0a090d"
          strokeWidth={strokeW}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#shortSubShadow)"
          style={{
            paintOrder: 'stroke fill',
            fontFamily: '"Segoe UI", "Arial Black", Impact, system-ui, sans-serif',
            fontWeight: 900,
            fontSize,
            letterSpacing: 0.5 * s,
          }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
};

/**
 * Badge Hook Pembuka (0.0s..3.2s) di Zona Aman Atas 9:16 (`top: 11.5%`)
 */
const TopHookBadge: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  if (frame > 96) return null;
  const enter = frame < 5 ? lerp(0.7, 1.06, frame / 5) : frame < 9 ? lerp(1.06, 1.0, (frame - 5) / 4) : 1.0;
  const exit = frame > 88 ? lerp(1.0, 0.0, (frame - 88) / 8) : 1.0;
  const s = width / 1080;

  return (
    <div
      style={{
        position: 'absolute',
        top: height * 0.115,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `scale(${enter * exit}) rotate(-1.2deg)`,
        opacity: exit,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #11224d 0%, #1a3570 100%)',
          border: `${5 * s}px solid #ffffff`,
          outline: `${4 * s}px solid #0a090d`,
          borderRadius: 24 * s,
          padding: `${14 * s}px ${28 * s}px`,
          boxShadow: `0 ${10 * s}px ${25 * s}px rgba(0,0,0,0.55)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: '#ffe047',
            fontFamily: '"Segoe UI", "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: 30 * s,
            letterSpacing: 1 * s,
            textShadow: `0 ${3 * s}px 0 #0a090d`,
          }}
        >
          POV: ANAK KOS S1 INFORMATIKA
        </div>
        <div
          style={{
            color: '#ffffff',
            fontFamily: '"Segoe UI", "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: 38 * s,
            marginTop: 2 * s,
            textShadow: `0 ${3 * s}px 0 #0a090d`,
          }}
        >
          VLOG PERTAMA BANG UTOH!
        </div>
      </div>
    </div>
  );
};

/**
 * Kartu Cliffhanger Penutup (20.8s..26.0s):
 * - Saat "Loh?! ... error 47 baris?!" (f625..701): Badge merah "KENAPA TIBA-TIBA ERROR 47 BARIS?!"
 * - Saat CTA Outro (f702..780): Kartu Stiker "FULL EPISODE #1 UDAH TAYANG DI YOUTUBE: BANG UTOH!"
 */
const CliffhangerYoutubeCard: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  if (frame < SHORT_SHOCK_FRAME + 4) return null;
  const isCta = frame >= SHORT_CTA_FRAME;
  const rel = isCta ? frame - SHORT_CTA_FRAME : frame - (SHORT_SHOCK_FRAME + 4);
  const pop = rel < 4 ? lerp(0.78, 1.08, rel / 4) : rel < 8 ? lerp(1.08, 1.0, (rel - 4) / 4) : 1.0;
  const pulse = 1 + Math.sin(frame * 0.25) * 0.018;
  const s = width / 1080;

  if (!isCta) {
    // Badge Cliffhanger Misteri di Atas saat Monitor Merah Menyala!
    return (
      <div
        style={{
          position: 'absolute',
          top: height * 0.115,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `scale(${pop * pulse}) rotate(1deg)`,
        }}
      >
        <div
          style={{
            background: '#d91b38',
            border: `${5 * s}px solid #ffffff`,
            outline: `${4 * s}px solid #0a090d`,
            borderRadius: 22 * s,
            padding: `${12 * s}px ${26 * s}px`,
            boxShadow: `0 ${10 * s}px ${28 * s}px rgba(0,0,0,0.65)`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#ffe047',
              fontFamily: '"Segoe UI", "Arial Black", sans-serif',
              fontWeight: 900,
              fontSize: 34 * s,
              textShadow: `0 ${3 * s}px 0 #0a090d`,
            }}
          >
            PADAHAL UDAH KELAR 100%...
          </div>
          <div
            style={{
              color: '#ffffff',
              fontFamily: '"Segoe UI", "Arial Black", sans-serif',
              fontWeight: 900,
              fontSize: 40 * s,
              textShadow: `0 ${3 * s}px 0 #0a090d`,
            }}
          >
            KOK ERROR 47 BARIS?!
          </div>
        </div>
      </div>
    );
  }

  // Kartu CTA YouTube Utama (f702..780): Mengumumkan Episode #1 Sudah Upload di YouTube!
  return (
    <div
      style={{
        position: 'absolute',
        top: height * 0.105,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `scale(${pop * pulse})`,
      }}
    >
      <div
        style={{
          width: 880 * s,
          background: 'linear-gradient(160deg, #131b36 0%, #1c2852 100%)',
          border: `${7 * s}px solid #ffffff`,
          outline: `${5 * s}px solid #0a090d`,
          borderRadius: 32 * s,
          padding: `${20 * s}px ${26 * s}px`,
          boxShadow: `0 ${16 * s}px ${40 * s}px rgba(0,0,0,0.75)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: '#ff2e4c',
            color: '#ffffff',
            fontFamily: '"Segoe UI", "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: 28 * s,
            padding: `${6 * s}px ${18 * s}px`,
            borderRadius: 14 * s,
            border: `${3 * s}px solid #0a090d`,
            marginBottom: 10 * s,
          }}
        >
          PENASARAN PENYEBAB ERROR-NYA?!
        </div>
        <div
          style={{
            color: '#ffe047',
            fontFamily: '"Segoe UI", "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: 46 * s,
            lineHeight: 1.12,
            textShadow: `0 ${4 * s}px 0 #0a090d`,
          }}
        >
          FULL EPISODE #1 UDAH TAYANG!
        </div>
        <div
          style={{
            marginTop: 14 * s,
            background: '#ff0033',
            color: '#ffffff',
            fontFamily: '"Segoe UI", "Arial Black", sans-serif',
            fontWeight: 900,
            fontSize: 36 * s,
            padding: `${12 * s}px ${22 * s}px`,
            borderRadius: 20 * s,
            border: `${4 * s}px solid #ffffff`,
            boxShadow: `0 ${5 * s}px 0 #0a090d`,
          }}
        >
          ▶ TONTON DI YOUTUBE: BANG UTOH
        </div>
      </div>
    </div>
  );
};

/**
 * Teaser Vertikal 9:16 (1080x1920 @ 30 fps · 26.0 detik = 780 frame)
 * Siap Upload ke: YouTube Shorts, TikTok, Instagram Reels, dan Facebook Reels!
 */
export const Ep01BangUtohShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sec = frame / SHORT_FPS;

  const isShock = frame >= SHORT_SHOCK_FRAME && frame < SHORT_CTA_FRAME;
  const isPreFlicker = (frame >= 604 && frame <= 608) || (frame >= 612 && frame <= 616);
  const isErrorAlert = isShock || isPreFlicker;
  const isCtaOutro = frame >= SHORT_CTA_FRAME;
  const isBrightIntro = frame < 316;

  const pose = sampleCamera(CAMS_9X16, frame);
  const shake = kickOffset(KICKS, frame);
  const actor = bangUtohShortAt(frame);

  const lightId: 'noon' | 'dusk' | 'amber' = isShock || isCtaOutro ? 'amber' : isBrightIntro ? 'noon' : 'dusk';
  const light = indoorLight(LIGHTS[lightId], isShock ? 26 : isBrightIntro ? 38 : -30, 44);
  const grade = GRADE_PRESETS[lightId];

  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      thickness: 3.0,
      widthFar: 2.0,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: isShock ? 0.42 : 0.22,
    focus: dist(pose.pos, actor.pos),
    grade,
  };

  const activeCap = SHORT_CAPTIONS.find((c) => sec >= c.start - 0.001 && sec < c.end - 0.001) ?? null;
  const capAge = activeCap ? Math.max(0, frame - Math.round(activeCap.start * SHORT_FPS)) : 0;
  const lowText = activeCap ? activeCap.text.toLowerCase() : '';
  const capTone: 'normal' | 'yellow' | 'red' =
    activeCap === null
      ? 'normal'
      : activeCap.tag === 'shock_hit' || (activeCap.tag === 'shock_err' && (lowText.includes('error') || lowText.includes('47')))
        ? 'red'
        : YELLOW_KEYWORDS.some((k) => lowText.includes(k))
          ? 'yellow'
          : 'normal';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Audio src={staticFile(SHORT_AUDIO)} />
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} showGround={false} camPos={pose.pos} camLook={pose.look}>
          <KostSet lightId={lightId} errorAlert={isErrorAlert} />
          <ActorBillboard
            actor="bangUtoh"
            position={actor.pos}
            faceTo={pose.pos}
            height={1.88}
            pose={actor.pose}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
            stickerOutline={isCtaOutro ? { color: '#ffffff', width: 16, outerColor: '#0a090d' } : undefined}
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* 2 Foreground Wooden Wipe Transitions */}
      <ForegroundWipe frame={frame} at={375} width={width} />
      <ForegroundWipe frame={frame} at={423} width={width} />

      {/* Top Hook Badge (0.0s..3.2s) */}
      <TopHookBadge frame={frame} width={width} height={height} />

      {/* Cliffhanger & YouTube Episode #1 CTA Card (20.8s..26.0s) */}
      <CliffhangerYoutubeCard frame={frame} width={width} height={height} />

      {/* Subtitle 9:16 Safe-Zone (`bottom: 24.5%`) */}
      {activeCap && (
        <ShortSafeSubtitle
          text={activeCap.text}
          ageFrames={capAge}
          tone={capTone}
          width={width}
          height={height}
        />
      )}
    </AbsoluteFill>
  );
};
