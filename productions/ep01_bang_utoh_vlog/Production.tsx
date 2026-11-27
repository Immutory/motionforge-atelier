import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CameraRig,
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
  EP01_AUDIO,
  EP01_CAPTIONS,
  EP01_FPS,
  EP01_SHOCK_FRAME,
  EP01_VOICE_ENV,
  EP01_WORDS,
} from './voice/words_ep01';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Lip-sync super presisi: menggabungkan bentuk vokal `talkAt()` dengan energi RMS nyata
 * dari rekaman VO asli user (`EP01_VOICE_ENV`, 1-frame mouth lead) agar mulut tertutup rapat saat jeda!
 */
function realTalkAt(frame: number): TalkSample {
  const env = EP01_VOICE_ENV[Math.min(EP01_VOICE_ENV.length - 1, frame + 1)] ?? 0;
  if (env < 10) return { open: 0, shape: 'closed' };
  const sample = talkAt(EP01_WORDS, frame, EP01_FPS, 1);
  if (sample.open < 0.16) {
    // Jika waveform aktif namun di tepi suku kata, beri bukaan transisi lembut
    return env > 24 ? { open: 0.32, shape: 'small' } : { open: 0, shape: 'closed' };
  }
  const scaled = Math.min(1, sample.open * (0.65 + (env / 100) * 0.55));
  return { open: Number(scaled.toFixed(3)), shape: sample.shape };
}

/**
 * 14 Shot Kamera Sinematik 16:9 (terinspirasi teknik kamera contohvideo):
 * High-angle swoop -> close-up push-in -> OOTD beat cuts -> foreground wipe ->
 * insert kasur -> dramatic reveal pull-back -> over-the-shoulder back view ->
 * right survival pan -> plot-twist shock kick -> warm sunset outro!
 */
const CAMS: CamKey[] = [
  // Shot 1 (0.0s..4.1s, f0..123): High-angle bird's-eye swoop turun ke Bang Utoh melambai!
  { frame: 0, pose: { pos: [0.0, 2.48, 3.55], look: [0.0, 1.18, -0.75], fov: 41, roll: 0 }, cut: true },
  { frame: 85, pose: { pos: [0.0, 1.50, 2.95], look: [0.0, 1.26, -0.55], fov: 38, roll: 0 }, glide: 85 },

  // Shot 2 (4.1s..8.8s, f124..264): Push-in close-up "Kenalin, Bolohoutoh / Bang Utoh!"
  { frame: 136, pose: { pos: [0.18, 1.46, 2.15], look: [0.02, 1.32, -0.30], fov: 36, roll: 0.8 }, glide: 18 },

  // Shot 3 (8.8s..15.8s, f265..474): Medium wide side-glide "Mahasiswa S1 Teknik Informatika..."
  { frame: 282, pose: { pos: [-0.62, 1.50, 2.98], look: [0.0, 1.24, -0.65], fov: 38, roll: 0 }, glide: 24 },
  { frame: 468, pose: { pos: [0.46, 1.48, 2.86], look: [0.0, 1.24, -0.65], fov: 38, roll: 0 }, glide: 186 },

  // Shot 4 (15.8s..22.1s, f475..664): Rapid OOTD Beat Cuts!
  // 4a. "hoodie himpunan" (15.8s = f475)
  { frame: 476, pose: { pos: [-0.22, 1.32, 2.02], look: [0.02, 1.18, -0.30], fov: 36, roll: -0.9 }, cut: true },
  // 4b. "headphone" (17.1s = f513)
  { frame: 513, pose: { pos: [0.16, 1.54, 1.92], look: [0.02, 1.40, -0.30], fov: 34, roll: 1.2 }, cut: true },
  // 4c. "kacamata anti-radiasi" (18.0s = f540)
  { frame: 540, pose: { pos: [-0.15, 1.50, 1.94], look: [0.02, 1.36, -0.30], fov: 34, roll: -1.1 }, cut: true },
  // 4d. "sama laptop yang hampir nggak pernah tidur" (19.6s = f588): whip-pan ke meja monitor belakang!
  { frame: 604, pose: { pos: [0.72, 1.48, 2.52], look: [0.18, 1.28, -1.65], fov: 38, roll: 0 }, glide: 18 },

  // Shot 5 (22.1s..24.6s, f664..738): "Yuk, gue ajak tur!" Bang Utoh jalan ke kiri -> FOREGROUND WIPE di f732!
  { frame: 682, pose: { pos: [-0.15, 1.52, 3.15], look: [-0.45, 1.22, -0.45], fov: 39, roll: 0 }, glide: 20 },

  // Shot 6 (24.6s..32.2s, f738..966): Insert sudut kiri — Kasur, Guling & Jam Weker Merah terlihat jelas!
  { frame: 738, pose: { pos: [-0.28, 1.46, 2.68], look: [-1.15, 1.06, -1.05], fov: 39, roll: 0 }, cut: true },
  { frame: 960, pose: { pos: [-0.45, 1.40, 2.38], look: [-1.22, 1.04, -1.05], fov: 37, roll: -0.6 }, glide: 220 },

  // Shot 7 (32.2s..35.7s, f966..1072): "Nah, di tengah ini surganya anak Informatika!" Dramatic Pull-Back Reveal!
  { frame: 968, pose: { pos: [0.15, 1.36, 1.65], look: [0.12, 1.30, -1.85], fov: 36, roll: 0 }, cut: true },
  { frame: 1055, pose: { pos: [0.22, 1.54, 3.25], look: [0.12, 1.34, -1.65], fov: 40, roll: 0 }, glide: 78 },

  // Shot 8 (35.7s..44.5s, f1072..1336): Over-The-Shoulder Back View -> Papan DEADLINE -> Poster </>!
  // 8a. Dual-monitor & PC biru (Bang Utoh di sepertiga kiri membelakangi kamera agar KEDUA monitor terlihat jelas!)
  { frame: 1082, pose: { pos: [-0.58, 1.54, 2.02], look: [0.22, 1.28, -1.95], fov: 38, roll: 0 }, cut: true },
  // 8b. Papan DEADLINE skripsi (38.9s = f1168) — Bang Utoh medium-shot di kiri menunjuk papan, bebas dari zona subtitle!
  { frame: 1188, pose: { pos: [0.08, 1.50, 2.82], look: [0.38, 1.36, -2.10], fov: 38, roll: 0.5 }, glide: 24 },
  // 8c. Poster kebanggaan S1 Informatika di dinding (41.8s = f1254) — Bang Utoh waist-up bersih di kiri!
  { frame: 1272, pose: { pos: [-0.22, 1.52, 2.75], look: [-0.15, 1.40, -2.15], fov: 38, roll: -0.5 }, glide: 22 },

  // Shot 9 (44.5s..55.0s, f1336..1652): FOREGROUND WIPE di f1336 -> Survival Kit Kanan (Rak, Mie, Galon, Kipas)!
  { frame: 1338, pose: { pos: [0.55, 1.52, 3.25], look: [1.55, 1.16, -0.75], fov: 39, roll: 0 }, cut: true },
  { frame: 1495, pose: { pos: [0.88, 1.36, 2.55], look: [1.85, 0.98, -0.85], fov: 37, roll: 0 }, glide: 150 },
  { frame: 1645, pose: { pos: [0.68, 1.48, 2.95], look: [1.68, 1.12, -0.45], fov: 38, roll: 0.5 }, glide: 140 },

  // Shot 10 (55.0s..60.5s, f1652..1816): "Asyik! Kelar 100%, tinggal tidur nyenyak!" (Jump -> Smug!)
  { frame: 1654, pose: { pos: [0.0, 1.50, 2.95], look: [0.0, 1.28, -0.55], fov: 38, roll: 0 }, cut: true },
  { frame: 1805, pose: { pos: [0.12, 1.48, 2.38], look: [0.02, 1.30, -0.45], fov: 36, roll: 0 }, glide: 145 },

  // Shot 11a (60.6s..61.5s, f1818..1845): "Eh, tunggu..." (skeptical + ? + monitor belakang berkedip merah!)
  { frame: 1820, pose: { pos: [0.08, 1.48, 2.35], look: [0.02, 1.34, -0.65], fov: 36, roll: 0.8 }, cut: true },

  // Shot 11b (61.55s..64.7s, f1846..1942): "LOH?! ERROR 47 BARIS?!" — TWO-SHOT BANG UTOH + KEDUA MONITOR MERAH!
  { frame: EP01_SHOCK_FRAME, pose: { pos: [0.16, 1.46, 2.32], look: [0.02, 1.32, -0.85], fov: 36, roll: -2.2 }, cut: true },
  { frame: 1938, pose: { pos: [0.10, 1.44, 2.15], look: [0.02, 1.30, -0.85], fov: 35, roll: 1.5 }, glide: 88 },

  // Shot 12 (64.8s..67.6s, f1944..2028): "Ya ampun, lupa titik koma! (;)" (Instant deflation + sweat!)
  { frame: 1948, pose: { pos: [0.0, 1.46, 2.42], look: [0.02, 1.30, -0.35], fov: 36, roll: 0 }, cut: true },

  // Shot 13 (67.6s..80.0s, f2028..2399): Outro Hangat Senja -> Maju dekat akrab -> Tarik mundur lembut Dadah!
  { frame: 2030, pose: { pos: [0.0, 1.50, 2.95], look: [0.0, 1.26, -0.60], fov: 38, roll: 0 }, cut: true },
  { frame: 2210, pose: { pos: [-0.15, 1.48, 2.40], look: [0.0, 1.30, -0.35], fov: 36, roll: 0 }, glide: 165 },
  { frame: 2399, pose: { pos: [0.0, 1.58, 3.65], look: [0.0, 1.25, -0.75], fov: 39, roll: 0 }, glide: 185 },
];

const KICKS: Kick[] = [
  { frame: EP01_SHOCK_FRAME, strength: 0.14, length: 9 }, // "LOH?!" (entakan tajam 14cm tanpa melempar kamera ke plafon!)
  { frame: 1900, strength: 0.09, length: 7 },             // "error 47 baris?!"
  { frame: 1658, strength: 0.05, length: 5 },             // "Asyik!" (pantulan lompat kecil)
];

/**
 * Koreografi Karakter 2D Bang Utoh (100% TANGAN KOSONG — ZERO HAND PROPS!):
 * Menggunakan variasi gestur lengan, 4 stance (stand/walk/sit/jump), dan 4 sudut (front/3-4/side/back).
 */
function bangUtohAt(frame: number): { pos: Vec3; pose: ActorPose } {
  const talk = realTalkAt(frame);
  const blink = blinkLidAt(
    frame,
    1,
    EP01_FPS,
    [124, 266, 475, 513, 540, 664, 738, 968, 1082, 1170, 1338, 1654, 1820, EP01_SHOCK_FRAME - 2, 1946, 2030],
  );
  const walkPhase = (frame % 16) / 16;
  const gentleLean = Math.sin(frame / 16) * 1.4;

  // --- Shot 1: Opening (0..123, 0.0..4.1s) — Melambai sapa ceria tangan kosong! ---
  if (frame < 124) {
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: frame < 45 ? 'laugh' : 'happy',
        blink,
        talk,
        stance: 'stand',
        view: 'front',
        leftArm: 'hip',
        rightArm: frame < 95 ? 'wave' : 'raise',
        fx: frame >= 8 && frame < 55 ? 'sparkle' : 'none',
        lean: gentleLean,
      },
    };
  }

  // --- Shot 2: Kenalin Bolohoutoh / Bang Utoh (124..264, 4.1..8.8s) ---
  if (frame < 265) {
    const bangUtohBeat = frame >= 205;
    const kenalinWave = frame < 162;
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: bangUtohBeat ? 'smug' : 'happy',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'hip',
        rightArm: kenalinWave ? 'wave' : bangUtohBeat ? 'point' : 'raise',
        fx: frame >= 155 && frame < 235 ? 'sparkle' : 'none',
        lean: gentleLean,
        facing: 0.22,
      },
    };
  }

  // --- Shot 3: Mahasiswa S1 TI & Anak Kos (265..474, 8.8..15.8s) ---
  if (frame < 475) {
    // Jalan santai 2 langkah kecil di awal segmen lalu berhenti bergaya tangan terlipat / pinggang!
    const walkingIn = frame >= 270 && frame < 320;
    const t = smootherstep(Math.max(0, Math.min(1, (frame - 270) / 50)));
    const x = lerp(-0.32, 0.06, t);
    return {
      pos: [x, 0, -0.28],
      pose: {
        face: frame > 410 ? 'smug' : 'happy',
        blink,
        talk,
        stance: walkingIn ? 'walk' : 'stand',
        walkPhase,
        view: 'threeQuarter',
        leftArm: walkingIn ? 'rest' : frame > 370 ? 'cross' : 'hip',
        rightArm: walkingIn ? 'rest' : frame > 370 ? 'cross' : 'point',
        lean: walkingIn ? undefined : gentleLean,
        facing: walkingIn ? 0.42 : 0.2,
      },
    };
  }

  // --- Shot 4: Rapid OOTD Beats (475..663, 15.8..22.1s) — ZERO PROP DI TANGAN! ---
  if (frame < 513) {
    // "hoodie himpunan"
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: 'happy',
        blink,
        talk,
        stance: 'stand',
        view: 'front',
        leftArm: 'hip',
        rightArm: 'hip',
        fx: 'sparkle',
        lean: gentleLean,
      },
    };
  }
  if (frame < 540) {
    // "headphone" -> headphone memantul lucu kecil!
    const bounce = Math.sin(((frame - 513) / 27) * Math.PI) * 0.34;
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: 'laugh',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'raise',
        rightArm: 'hip',
        hatPop: bounce,
        fx: 'sparkle',
        facing: -0.18,
      },
    };
  }
  if (frame < 588) {
    // "kacamata anti-radiasi"
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: 'smug',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'cross',
        rightArm: 'cross',
        fx: 'sparkle',
        facing: 0.24,
      },
    };
  }
  if (frame < 664) {
    // "sama laptop yang hampir nggak pernah tidur" -> menunjuk bersih ke meja monitor belakang (bebas lampu meja)!
    return {
      pos: [-0.50, 0, -0.32],
      pose: {
        face: 'tired',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'hip',
        rightArm: 'point',
        fx: 'sweat',
        lean: gentleLean,
        facing: 0.38,
      },
    };
  }

  // --- Shot 5: "Yuk, gue ajak tur markas kecil gue!" (664..737, 22.1..24.6s) — Jalan ke kiri! ---
  if (frame < 738) {
    const t = smootherstep(Math.max(0, Math.min(1, (frame - 670) / 62)));
    return {
      pos: [lerp(0.05, -1.12, t), 0, lerp(-0.25, 0.05, t)],
      pose: {
        face: 'happy',
        blink,
        talk,
        stance: 'walk',
        walkPhase,
        view: frame > 692 ? 'side' : 'threeQuarter',
        leftArm: 'wave',
        rightArm: 'rest',
        facing: -1,
      },
    };
  }

  // --- Shot 6: Tour Kasur & Jam Weker Merah (738..965, 24.6..32.2s) — Berdiri di kanan nakas agar Jam Weker Merah terlihat utuh! ---
  if (frame < 966) {
    const sleepy = frame >= 845; // "selalu kalah lawan rasa ngantuk kuliah jam tujuh"
    return {
      pos: [-0.48, 0, -0.15],
      pose: {
        face: sleepy ? 'tired' : 'happy',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'point',
        rightArm: sleepy ? 'rest' : 'hip',
        fx: sleepy ? 'sweat' : 'none',
        lean: sleepy ? -4.8 : gentleLean,
        facing: -0.28,
      },
    };
  }

  // --- Shot 7: "Nah, di tengah ini surganya anak Informatika!" (966..1071, 32.2..35.7s) — LOMPAT ANTUSIAS! ---
  if (frame < 1072) {
    const jumping = frame >= 1002 && frame < 1034;
    return {
      pos: [-0.62, 0, -0.58],
      pose: {
        face: jumping ? 'laugh' : 'idea',
        blink,
        talk,
        stance: jumping ? 'jump' : 'stand',
        view: 'threeQuarter',
        leftArm: jumping ? 'raise' : 'hip',
        rightArm: jumping ? 'raise' : 'point',
        fx: 'sparkle',
        lean: jumping ? 2.5 : gentleLean,
        facing: 0.34,
      },
    };
  }

  // --- Shot 8a: "Meja ngoding dual-monitor, PC menyala biru" (1072..1167, 35.7..38.9s) — BACK VIEW OVER-THE-SHOULDER! ---
  if (frame < 1168) {
    return {
      pos: [-0.74, 0, -0.42],
      pose: {
        face: 'focus',
        blink,
        talk,
        stance: 'stand',
        view: 'back',
        leftArm: 'hip',
        rightArm: 'point',
        lean: Math.sin(frame / 14) * 1.5,
      },
    };
  }

  // --- Shot 8b-c: Papan DEADLINE & Poster S1 Informatika (1168..1335, 38.9..44.5s) — Medium-shot bersih di kiri! ---
  if (frame < 1336) {
    const posterBeat = frame >= 1254;
    return {
      pos: [posterBeat ? -0.58 : -0.62, 0, -0.35],
      pose: {
        face: posterBeat ? 'idea' : 'nervous',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'hip',
        rightArm: posterBeat ? 'raise' : 'point',
        fx: posterBeat ? 'sparkle' : 'sweat',
        lean: gentleLean,
        facing: 0.32,
      },
    };
  }

  // --- Shot 9: Survival Kit Anak Kos Kanan (1336..1651, 44.5..55.0s) — Jalur jalan di ruang kosong kanan kursi hitam! ---
  if (frame < 1652) {
    const walking = frame < 1410;
    const t = smootherstep(Math.max(0, Math.min(1, (frame - 1336) / 74)));
    const x = lerp(0.76, 1.08, t);
    const mieBeat = frame >= 1490 && frame < 1545;
    return {
      pos: [x, 0, 0.18],
      pose: {
        face: mieBeat ? 'laugh' : 'happy',
        blink,
        talk,
        stance: walking ? 'walk' : 'stand',
        walkPhase,
        view: walking ? 'side' : 'threeQuarter',
        leftArm: walking ? 'rest' : 'hip',
        rightArm: walking ? 'rest' : 'point',
        fx: mieBeat ? 'sparkle' : 'none',
        lean: walking ? undefined : gentleLean,
        facing: walking ? 1 : 0.3,
      },
    };
  }

  // --- Shot 10: "Asyik! Kodingan tugas kelar 100%, tinggal tidur nyenyak!" (1652..1817, 55.0..60.6s) ---
  if (frame < 1818) {
    const asyikJump = frame >= 1656 && frame < 1686;
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: asyikJump ? 'laugh' : 'smug',
        blink,
        talk,
        stance: asyikJump ? 'jump' : 'stand',
        view: 'threeQuarter',
        leftArm: asyikJump ? 'raise' : 'cross',
        rightArm: asyikJump ? 'raise' : 'cross',
        fx: 'sparkle',
        lean: asyikJump ? 0 : gentleLean,
        facing: 0.18,
      },
    };
  }

  // --- Shot 11a: "Eh, tunggu..." (1818..1845, 60.6..61.5s) — Melirik curiga ke monitor belakang yang berkedip merah! ---
  if (frame < EP01_SHOCK_FRAME) {
    return {
      pos: [-0.24, 0, -0.24],
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
        facing: -0.26,
      },
    };
  }

  // --- Shot 11b: "LOH?! KOK TIBA-TIBA MUNCUL ERROR 47 BARIS?!" (1846..1943, 61.55..64.8s) — TWO-SHOT SHOCK + MONITOR MERAH! ---
  if (frame < 1944) {
    const after = frame - EP01_SHOCK_FRAME;
    const panicWave = after >= 12 && after % 10 < 5;
    return {
      pos: [-0.36, 0, -0.22],
      pose: {
        face: 'shock',
        blink,
        talk: after < 10 ? { open: 0.9, shape: 'o' } : talk,
        stance: after < 10 ? 'jump' : 'stand',
        view: 'front',
        leftArm: panicWave ? 'wave' : 'raise',
        rightArm: panicWave ? 'raise' : 'wave',
        hatPop: Math.min(1, (after + 1) / 3),
        fx: 'shock',
        lean: -3.5 + Math.sin(frame * 1.1) * 1.6,
      },
    };
  }

  // --- Shot 12: "Ya ampun, lupa titik koma! (;)" (1944..2027, 64.8..67.6s) — Instant Deflation Lunglai + Sweat! ---
  if (frame < 2028) {
    return {
      pos: [0.02, 0, -0.28],
      pose: {
        face: frame < 1982 ? 'tired' : 'sad',
        blink,
        talk,
        stance: 'stand',
        view: 'threeQuarter',
        leftArm: 'rest',
        rightArm: 'rest',
        hatPop: Math.max(0, 1 - (frame - 1944) / 10),
        fx: 'sweat',
        lean: -5.5,
        facing: -0.15,
      },
    };
  }

  // --- Shot 13: Outro Hangat & 3-Beat CTA "like, komen, dan subscribe... Dadah!" (2028..2399, 67.6..80.0s) ---
  const walkingForward = frame >= 2105 && frame < 2145;
  const wf = smootherstep(Math.max(0, Math.min(1, (frame - 2105) / 40)));
  const zOut = lerp(-0.28, 0.12, wf);
  const likeBeat = frame >= 2214 && frame < 2233;
  const komenBeat = frame >= 2233 && frame < 2248;
  const subBeat = frame >= 2248 && frame < 2274;
  const waveEnd = frame >= 2295;
  return {
    pos: [0.02, 0, zOut],
    pose: {
      face: frame < 2095 || subBeat ? 'laugh' : 'happy',
      blink,
      talk,
      stance: walkingForward ? 'walk' : subBeat ? 'jump' : 'stand',
      walkPhase,
      view: 'front',
      leftArm: walkingForward ? 'rest' : waveEnd ? 'wave' : likeBeat || subBeat ? 'raise' : 'hip',
      rightArm: walkingForward ? 'rest' : waveEnd ? 'wave' : subBeat ? 'raise' : komenBeat ? 'point' : 'hip',
      fx: waveEnd || likeBeat || subBeat || frame < 2075 ? 'sparkle' : 'none',
      lean: walkingForward || subBeat ? undefined : gentleLean,
    },
  };
}

/** Foreground Wipe Transition ala contohvideo (c01.jpg): tiang kayu buram melintas cepat menutupi cut! */
const ForegroundWipe: React.FC<{ frame: number; at: number; width: number }> = ({ frame, at, width }) => {
  const span = 12;
  const rel = frame - (at - span / 2);
  if (rel < 0 || rel > span) return null;
  const t = rel / span;
  const x = lerp(width * 1.15, -width * 0.55, smootherstep(t));
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: x,
        width: width * 0.42,
        background: 'linear-gradient(90deg, #4b2d18 0%, #7c4d2b 35%, #5e381e 75%, #2d180c 100%)',
        boxShadow: '0 0 65px rgba(0,0,0,0.65)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Subtitle 1-2 kata punchy bergaya contohvideo (3-Tier Color System):
 * - 'normal': Putih murni ExtraBold
 * - 'yellow': Kuning emas (#ffe047) untuk keyword identitas, punchline, dan CTA
 * - 'red': Merah elektrik (#ff4d5e) khusus ledakan plot-twist error!
 */
const ContohStyleSubtitle: React.FC<{
  text: string;
  ageFrames: number;
  tone: 'normal' | 'yellow' | 'red';
  width: number;
  height: number;
}> = ({ text, ageFrames, tone, width, height }) => {
  // Pop-bounce snappy dalam 4 frame (0.82 -> 1.09 -> 1.0)
  const pop =
    ageFrames < 2
      ? lerp(0.82, 1.09, ageFrames / 2)
      : ageFrames < 5
        ? lerp(1.09, 1.0, (ageFrames - 2) / 3)
        : 1.0;

  const isEmph = tone !== 'normal';
  const s = height / 1080;
  const fontSize = (tone === 'red' ? 84 : isEmph ? 78 : 68) * s;
  const strokeW = (isEmph ? 18 : 15) * s;
  const fillColor = tone === 'red' ? '#ff4d5e' : tone === 'yellow' ? '#ffe047' : '#ffffff';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: height * 0.068,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `scale(${pop})`,
      }}
    >
      <svg width={width} height={150 * s} viewBox={`0 0 ${width} ${150 * s}`} style={{ overflow: 'visible' }}>
        <defs>
          <filter id="subShadow" x="-10%" y="-20%" width="120%" height="150%">
            <feDropShadow dx="0" dy={5 * s} stdDeviation={4 * s} floodColor="#000000" floodOpacity="0.65" />
          </filter>
        </defs>
        <text
          x={width / 2}
          y={95 * s}
          textAnchor="middle"
          fill={fillColor}
          stroke="#0a090d"
          strokeWidth={strokeW}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#subShadow)"
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

const YELLOW_KEYWORDS = [
  'bolohoutoh',
  'bang utoh',
  's1 teknik',
  'informatika',
  'headphone',
  'surganya',
  'dual-monitor',
  'mie instan',
  'asyik',
  '100%',
  'titik koma',
  'like',
  'subscribe',
  'dadah',
];

/**
 * Episode #1 REBUILD (16:9 · 1920x1080 · 30 fps · 80.0 detik — Rekaman VO Asli User!):
 * - Gaya visual & subtitle 1-2 kata punchy terinspirasi contohvideo (layar bersih tanpa kotak HUD!).
 * - Bang Utoh 100% tangan kosong (ZERO hand props), berakting penuh dengan walk/sit/jump/back-view/headphone pop.
 * - 14 shot kamera sinematik + 2 foreground wipe transitions + plot-twist error merah di <KostSet /> Blender!
 */
export const Ep01BangUtohVlog: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sec = frame / EP01_FPS;

  const isShock = frame >= EP01_SHOCK_FRAME && frame < 1944;
  // Dramatic irony: monitor belakang berkedip merah 2x saat "Eh, tunggu..." sebelum Bang Utoh sadar di "Loh?!"
  const isPreShockFlicker = (frame >= 1824 && frame <= 1829) || (frame >= 1835 && frame <= 1840);
  const isErrorAlert = isShock || isPreShockFlicker;
  const isWarmOutro = frame >= 2028;
  const isBrightIntro = frame < 738;

  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame);
  const actor = bangUtohAt(frame);

  // Pergeseran atmosfer cahaya sesuai alur cerita (seperti contohvideo):
  // Intro cerah (noon) -> Room tour cozy malam anak kos (dusk) -> Shock error (amber) -> Outro hangat (dusk/amber)!
  const lightId: 'noon' | 'dusk' | 'amber' = isShock ? 'amber' : isBrightIntro ? 'noon' : isWarmOutro ? 'amber' : 'dusk';
  const light = indoorLight(LIGHTS[lightId], isShock ? 26 : isBrightIntro ? 38 : -30, 44);
  const grade = GRADE_PRESETS[lightId];

  const post: PostParams = {
    ...DEFAULT_POST,
    ink: {
      ...DEFAULT_POST.ink,
      thickness: 3.1,
      widthFar: 2.1,
      fogColor: light.fog.color,
      fogNear: light.fog.near,
      fogFar: light.fog.far,
    },
    blur: isShock ? 0.45 : frame >= 124 && frame < 265 ? 0.38 : 0.2,
    focus: dist(pose.pos, actor.pos),
    grade,
  };

  // Cari kata subtitle aktif saat ini dengan interval setengah-terbuka [start, end) — 0 overlap, 0 celah kedip!
  const activeCap = EP01_CAPTIONS.find((c) => sec >= c.start - 0.001 && sec < c.end - 0.001) ?? null;
  const capAge = activeCap ? Math.max(0, frame - Math.round(activeCap.start * EP01_FPS)) : 0;
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
      <Audio src={staticFile(EP01_AUDIO)} />
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
          />
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* 2 Foreground Wooden Wipe Transitions ala contohvideo! */}
      <ForegroundWipe frame={frame} at={736} width={width} />
      <ForegroundWipe frame={frame} at={1336} width={width} />

      {/* Subtitle 1-2 kata punchy ala contohvideo (tanpa box, 3-tier color, outline tebal, pop bounce!) */}
      {activeCap && (
        <ContohStyleSubtitle
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
