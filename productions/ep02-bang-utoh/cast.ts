import {
  actorCanvasToWorldY,
  actorFaceAnchors,
  actorHandPoint,
  actorWalkCycleMeters,
  blinkLidAt,
  kopiRimPoint,
  talkGated,
  type ActorPose,
  type ActorStance,
  type ActorView,
  type ArmPose,
  type CastPresetId,
  type CatPose,
  type CharacterSpec,
  type ComicFx,
  type Expression,
  type HandProp,
  type HandRig,
  type TalkEvent,
  type TalkSample,
  type Vec3,
} from '../../engine';
import { EP02_PLAK_FRAME, EP02_SCREEN_OK_FRAME, type LaptopScreen } from './look';
import { EP02_PROJECTOR_RUN_FRAME, EP02_SITI_COUNTER_RISER, EP02_SPOTS, locationAt, sampleTransitCurve } from './set';
import { BEATS, NONVERBAL, WORDS, lineById, nonverbalOf, rmsAt, wordsOf, type VoiceSpeaker } from './words';

/** Diekspor ulang agar agent lain bisa mengambil semua frame koreografi dari satu modul. */
export { EP02_PLAK_FRAME, EP02_SCREEN_OK_FRAME, EP02_PROJECTOR_RUN_FRAME };

const FPS = 30;

export type Ep02HumanId = 'bangUtoh' | 'buSiti' | 'rara';

export type Ep02ActorDef = {
  id: Ep02HumanId;
  preset: CastPresetId;
  height: number;
  overrides?: Partial<CharacterSpec>;
};

/** Daftar pemeran manusia EP02. Si Oyen dirender via `<CatBillboard cat="oyen" />`. */
export const ACTORS: Ep02ActorDef[] = [
  { id: 'bangUtoh', preset: 'bangUtoh', height: 1.9 },
  { id: 'buSiti', preset: 'buSiti', height: 1.72 },
  { id: 'rara', preset: 'rara', height: 1.76 },
];

// ---------------------------------------------------------------------------------------------
// Utilitas gerak
// ---------------------------------------------------------------------------------------------

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const dist3 = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Kurva pegas overshoot untuk `hatPop` (headphone Bang Utoh):
 * naik cepat 3 frame ke puncak (peak), memantul turun 5 frame, lalu meluruh mulus ke 0.
 */
function hatPopSpring(frame: number, trigger: number, peak = 0.9, hold = 12): number {
  const dt = frame - trigger;
  if (dt < 0 || dt > hold + 14) return 0;
  if (dt < 3) return peak * smooth(dt / 3);
  if (dt < 8) {
    const u = (dt - 3) / 5;
    return peak * (1 - 0.28 * Math.sin(u * Math.PI));
  }
  if (dt < hold) return peak * 0.78;
  return peak * 0.78 * (1 - smooth((dt - hold) / 14));
}

/** Kunci bertahap (step): nilai kunci terakhir yang frame-nya <= frame. Kunci wajib terurut. */
type StepKey<T> = readonly [frame: number, value: T];
function stepAt<T>(keys: ReadonlyArray<StepKey<T>>, frame: number): T {
  let v = keys[0][1];
  for (const [f, x] of keys) {
    if (frame >= f) v = x;
    else break;
  }
  return v;
}

/**
 * Rantai easing: setiap kunci `[from, to, value]` menggeser nilai dari nilai sebelumnya ke `value`
 * dengan smoothstep di [from..to]. `from === to` = snap (khusus frame benturan PLAK / Enter).
 */
type EaseKey = readonly [from: number, to: number, value: number];
function chainAt(frame: number, initial: number, keys: ReadonlyArray<EaseKey>): number {
  let v = initial;
  for (const [a, b, val] of keys) {
    if (frame < a) return v;
    if (frame >= b) {
      v = val;
      continue;
    }
    return lerp(v, val, smooth((frame - a) / Math.max(1, b - a)));
  }
  return v;
}

/** Kelopak lambat trapesium (`len` frame, 3 frame menutup & 3 frame membuka). */
function lidWindow(frame: number, from: number, len: number, peak = 1): number {
  const k = frame - from;
  if (k < 0 || k >= len) return 0;
  const ramp = Math.min(3, Math.floor(len / 3));
  if (k < ramp) return (peak * (k + 1)) / (ramp + 1);
  if (k >= len - ramp) return (peak * (len - k)) / (ramp + 1);
  return peak;
}

// ---------------------------------------------------------------------------------------------
// Breakdown lengan & stance (nol pop 1-frame)
// ---------------------------------------------------------------------------------------------

/** Tingkat ketinggian lengan. Lompatan >= 2 tingkat (rest <-> raise/wave) wajib lewat breakdown `hip`. */
export const EP02_ARM_LEVEL: Record<ArmPose, number> = {
  rest: 0,
  hip: 1,
  hold: 1,
  point: 1,
  cross: 1,
  pray: 1,
  raise: 2,
  wave: 2,
};
/** Lama pose perantara (breakdown) sebelum kunci lengan besar. */
export const EP02_BREAKDOWN_FRAMES = 3;

const needsArmBreakdown = (a: ArmPose, b: ArmPose) => Math.abs(EP02_ARM_LEVEL[a] - EP02_ARM_LEVEL[b]) >= 2;

/** Trek lengan bertahap yang otomatis menyisipkan breakdown `hip` 3 frame sebelum lompatan besar. */
function armAt(keys: ReadonlyArray<StepKey<ArmPose>>, frame: number): ArmPose {
  let i = 0;
  for (let k = 0; k < keys.length; k++) {
    if (frame >= keys[k][0]) i = k;
    else break;
  }
  const cur = keys[i][1];
  const next = keys[i + 1];
  if (next && frame >= next[0] - EP02_BREAKDOWN_FRAMES && needsArmBreakdown(cur, next[1])) return 'hip';
  return cur;
}

// ---------------------------------------------------------------------------------------------
// Jam koreografi (semua frame diturunkan dari words.ts: BEATS, lineById, nonverbalOf, WORDS)
// ---------------------------------------------------------------------------------------------

const B2 = BEATS[1]; // Deadline & Kopi (Warkop)
const B3 = BEATS[2]; // Solusi Salah #1: TV Tabung (Warkop)
const B4 = BEATS[3]; // Solusi Ajaib #2: Konsultan Oyen (Warkop)
const B5 = BEATS[4]; // Kejar Waktu ke Lab FIK (Kampung)
const B6 = BEATS[5]; // Klimaks Demo Lab FIK (Lab)
const B7 = BEATS[6]; // Replay Bukti & Double Punchline (Lab + Replay Sepia)

const L_U2 = lineById('U2');
const L_S1 = lineById('S1');
const L_S2 = lineById('S2');
const L_U3 = lineById('U3');
const L_U4 = lineById('U4');
const L_U5 = lineById('U5');
const L_S3 = lineById('S3');
const L_U6 = lineById('U6');
const L_U7 = lineById('U7');
const L_R1 = lineById('R1');
const L_R2 = lineById('R2');
const L_U8 = lineById('U8');
const L_O1 = lineById('O1');
const L_R3 = lineById('R3');
const L_U9 = lineById('U9');

// Momen non-verbal rekaman (napas, desahan, hirupan, kekeh, tawa, jeda)
const NV_U1_SIGH = nonverbalOf('U1', 0);
const NV_U2_BREATH = nonverbalOf('U2', 0);
const NV_S1_CHUCKLE = nonverbalOf('S1', 0);
const NV_S1_SNIFF = nonverbalOf('S1', 1);
const NV_S2_LAUGH = nonverbalOf('S2', 0);
const NV_S2_PAUSE = nonverbalOf('S2', 1);
const NV_U3_CHUCKLE = nonverbalOf('U3', 0);
const NV_U4_SIGH = nonverbalOf('U4', 0);
const NV_U5_LAUGH = nonverbalOf('U5', 0);
const NV_S3_CHUCKLE = nonverbalOf('S3', 0);
const NV_U7_LAUGH = nonverbalOf('U7', 0);
const NV_R1_SIGH = nonverbalOf('R1', 0);
const NV_R2_SIGH = nonverbalOf('R2', 0);
const NV_R2_PAUSE = nonverbalOf('R2', 1);
const NV_R2_CHUCKLE = nonverbalOf('R2', 2);
const NV_R3_SIGH = nonverbalOf('R3', 0);
const NV_U9_SIGH = nonverbalOf('U9', 0);

/** Frame awal kata pertama di baris `lineId` yang diawali `prefix` (tanpa beda huruf besar). */
function wordFrame(lineId: string, prefix: string): number {
  const l = lineById(lineId);
  const p = prefix.toLowerCase();
  const w = WORDS.find(
    (x) =>
      x.speaker === l.speaker &&
      Math.round(x.start * FPS) >= l.startFrame - 1 &&
      Math.round(x.end * FPS) <= l.endFrame + 1 &&
      x.text.toLowerCase().startsWith(p),
  );
  if (!w) throw new Error(`Kata "${prefix}" tidak ada di baris ${lineId}`);
  return Math.round(w.start * FPS);
}

const W_U1_NGUNGSI = wordFrame('U1', 'ngungsi');
const W_U2_BU = wordFrame('U2', 'Bu');
const W_S1_GELAS = wordFrame('S1', 'Gelas');
const W_S1_NGOPI = wordFrame('S1', 'Ngopi');
const W_S2_DIGEPLAK = wordFrame('S2', 'digeplak');
const W_U3_BU = wordFrame('U3', 'Bu');
const W_U3_BUKAN = wordFrame('U3', 'bukan');
const W_U4_NGGAK = wordFrame('U4', 'nggak');
const W_U5_NOL = wordFrame('U5', 'Nol');
const W_U5_LO = wordFrame('U5', 'lo');
const W_S3_IKAN = wordFrame('S3', 'ikan');
const W_U6_AYO = wordFrame('U6', 'Ayo');
const W_U6_IKUT = wordFrame('U6', 'ikut');
const W_U7_KELAR = wordFrame('U7', 'Kelar');
const W_U7_NOL = wordFrame('U7', 'Nol');
const W_R1_JALANIN = wordFrame('R1', 'Jalanin');
const W_U8_YEN = wordFrame('U8', 'Yen');
const W_U9_GARA = wordFrame('U9', 'Gara');

const UTOH_WORDS = wordsOf('bangUtoh');
const SITI_WORDS = wordsOf('buSiti');
const RARA_WORDS = wordsOf('rara');
const OYEN_WORDS = wordsOf('oyen');

const eventsOf = (speaker: VoiceSpeaker): TalkEvent[] => NONVERBAL.filter((e) => e.speaker === speaker);

/**
 * Lip-sync RMS-gated semua tokoh: viseme kata (`talkAt`, lead +1 frame) x amplitudo rekaman `rmsAt`,
 * celah kecil saat napas/desah, getar saat kekeh/tawa, tertutup rapat saat jeda hening.
 */
export function talkFor(speaker: VoiceSpeaker, frame: number): TalkSample {
  const words =
    speaker === 'bangUtoh' ? UTOH_WORDS : speaker === 'buSiti' ? SITI_WORDS : speaker === 'rara' ? RARA_WORDS : OYEN_WORDS;
  return talkGated(words, frame, { rms: (f) => rmsAt(speaker, f), events: eventsOf(speaker), fps: FPS, leadFrames: 1 });
}

// ---------------------------------------------------------------------------------------------
// Frame kunci yang diekspor (kamera, sound, look membacanya)
// ---------------------------------------------------------------------------------------------

/** B4: Oyen meregang lalu melangkah ke sisi kanan keyboard. */
export const EP02_OYEN_STRETCH_FROM = L_U4.endFrame - 18;
export const EP02_OYEN_WALK_KB_FROM = L_U4.endFrame + 2;
/** *tek* 2 (cakar kanan, tahan 5f) berakhir tepat sebelum layar hijau ✓ 0 ERROR. */
export const EP02_OYEN_STEP2_FRAME = EP02_SCREEN_OK_FRAME - 5;
/** *tek* 1 (cakar kiri, tahan 5f) lalu deadpan 3f sebelum STEP2. */
export const EP02_OYEN_STEP1_FRAME = EP02_OYEN_STEP2_FRAME - 8;
/** Oyen berhenti di keyboard (view threeQuarter tetap sampai akhir B4). */
export const EP02_OYEN_KB_ARRIVE_FRAME = EP02_OYEN_STEP1_FRAME - 4;
/** Oyen selesai menurunkan badan ke stance `sit` di keyboard (3f settle setelah tiba). */
export const EP02_OYEN_SIT_FRAME = EP02_OYEN_KB_ARRIVE_FRAME + 3;

/**
 * B2: Bu Siti meletakkan gelas ke-4 (milik Utoh, dibawa tangan KIRI sejak B1) di meja tepat di kata
 * "Gelas (keempat)" (meja jadi 4 gelas), jauh SEBELUM hirupan S1. Gelas kopinya SENDIRI tetap di tangan KANAN
 * sepanjang Warkop (B1–B4): kekeh = gelas di dada, hirupan = gelas di hidung, "Ngopi dulu." = menyesap.
 */
export const EP02_SITI_CUP_DOWN_FRAME = W_S1_GELAS;
/** Tangan kiri mulai turun meraih meja (8f) sebelum gelas ke-4 dilepas di EP02_SITI_CUP_DOWN_FRAME. */
export const EP02_SITI_PUTDOWN_FROM = EP02_SITI_CUP_DOWN_FRAME - 8;
/** Tangan kiri kembali ke pinggang setelah melepas gelas: tahan 3f lalu 6f breakdown. */
export const EP02_SITI_PUTDOWN_RETRACT_FROM = EP02_SITI_CUP_DOWN_FRAME + 3;
export const EP02_SITI_PUTDOWN_RETRACT_TO = EP02_SITI_CUP_DOWN_FRAME + 9;
/** Kekeh halus S1: gelas Bu Siti turun dari samping kepala ke dada (6f). */
export const EP02_SITI_CUP_CHEST_FROM = NV_S1_CHUCKLE.startFrame - 2;
export const EP02_SITI_CUP_CHEST_TO = NV_S1_CHUCKLE.startFrame + 4;
/** Hirupan panjang S1: gelas naik dari dada ke dekat hidung (6f), tiba 1f setelah suara hirupan mulai. */
export const EP02_SITI_CUP_RAISE_FROM = NV_S1_SNIFF.startFrame - 5;
export const EP02_SITI_CUP_AT_NOSE_FROM = NV_S1_SNIFF.startFrame + 1;
/** Gelas di hidung sampai hirupan selesai, lalu bergeser ke bibir. */
export const EP02_SITI_CUP_AT_NOSE_TO = NV_S1_SNIFF.endFrame;
/** "Ngopi dulu.": bibir gelas menyentuh bibir (frame SFX *sruput*) sampai SIP_TO; kata "Ngopi" jatuh di dalamnya. */
export const EP02_SITI_SIP_FROM = Math.max(W_S1_NGOPI - 3, EP02_SITI_CUP_AT_NOSE_TO + 3);
export const EP02_SITI_SIP_TO = W_S1_NGOPI + 6;
/** Gelas turun kembali ke dada (6f) dengan wajah puas lalu deadpan di "dulu.". */
export const EP02_SITI_CUP_LOWER_TO = EP02_SITI_SIP_TO + 6;
/** B2->B3: Bu Siti melangkah ke sisi laptop, tiba tepat saat wind-up PLAK dimulai (PLAK - 10). */
const SITI_SLAP_ARRIVE = EP02_PLAK_FRAME - 10;
const SITI_SLAP_WALK_FROM = SITI_SLAP_ARRIVE - 10;

/** B4: Utoh meluncur lemas sit -> squat sepanjang desahan U4 (18f), stance squat di tengahnya. */
const UTOH_SLIDE_FROM = NV_U4_SIGH.startFrame;
const UTOH_SLIDE_TO = NV_U4_SIGH.startFrame + 18;
export const EP02_UTOH_SQUAT_FRAME = NV_U4_SIGH.startFrame + 9;
/** B4: lompat berdiri syok "Hah?!" (reaction lead 2f). */
export const EP02_UTOH_JUMP_FRAME = L_U5.startFrame - 2;

export const EP02_TASKBAR_ALARM_FRAME = B5.from - 22; // Jam taskbar laptop 3D loncat 06:45 -> 06:58!
export const EP02_B5_SPRINT_START = B5.from + 22; // Utoh mulai sprint di kurva mulus
/** Oyen duduk tenang 12f menatap kepergian Utoh. */
export const EP02_B5_OYEN_WAIT_TO = EP02_B5_SPRINT_START + 12;
/** 3f bangkit (breakdown sit -> stand) lalu jalan santai setengah tempo manusia. */
export const EP02_B5_OYEN_WALK_START = EP02_B5_OYEN_WAIT_TO + 3;
/** Utoh menoleh sekilas ke belakang di "Ayo Yen, ikut!" (lead 2f) sampai kata "ikut!". */
export const EP02_B5_UTOH_LOOKBACK_FRAME = W_U6_AYO - 2;
export const EP02_B5_UTOH_LOOKBACK_TO = W_U6_IKUT - 2;

/**
 * Jam cerita yang tampil di taskbar laptop diegetik (aturan sama dengan Production.tsx `screenState`):
 * 06:45 di B1–B4, 06:58 sejak alarm sampai sprint B5. Layar HP `phoneClock` Utoh memakai jam yang sama.
 */
export function ep02TaskbarClockAt(frame: number): '06:45' | '06:58' {
  return frame >= EP02_TASKBAR_ALARM_FRAME && frame < EP02_B5_SPRINT_START ? '06:58' : '06:45';
}
/** Teks jam di layar HP Utoh (`phoneClock`) = jam taskbar pada frame yang sama. */
export const ep02PhoneClockTextAt = (frame: number): string => ep02TaskbarClockAt(frame);

export const EP02_REPLAY_FROM = L_U8.endFrame + 2; // Replay Sepia, ZERO tabrakan dialog!
export const EP02_REPLAY_TO = L_O1.startFrame - 2;
export const EP02_OUTRO_FROM = L_U9.endFrame + 4;

// Lintasan sprint B5 (kurva set.tsx TIDAK diubah; hanya view & tempo)
const SPRINT_STRIDE = 1.7;
const UTOH_CYCLE_3Q = actorWalkCycleMeters(1.9, 'threeQuarter', SPRINT_STRIDE, false);
const UTOH_CYCLE_SIDE = actorWalkCycleMeters(1.9, 'side', SPRINT_STRIDE, false);
const sprintU = (frame: number) => (frame - EP02_B5_SPRINT_START) / Math.max(1, B5.to - EP02_B5_SPRINT_START);
const utohSprintSample = (frame: number) => sampleTransitCurve(smooth(sprintU(frame)));

const OYEN_B5_END_U = 0.86;
/**
 * Profil tempo santai Oyen: percepatan lembut 16f -> jelajah kecepatan tetap -> perlambatan 40f.
 * Jelajah tetap (bukan smoothstep) menjaga jarak Utoh-Oyen <= ~2,6 m walau Oyen berangkat 15f lebih lambat,
 * sehingga keduanya tetap satu frame di dolly tracking B5.
 */
const OYEN_B5_ACCEL_F = 16;
const OYEN_B5_DECEL_F = 40;
function cruiseProfile(t: number, a: number, d: number): number {
  const x = clamp01(t);
  const v = 1 / (1 - a / 2 - d / 2);
  if (x < a) return (v * x * x) / (2 * a);
  if (x <= 1 - d) return v * (x - a / 2);
  return 1 - (v * (1 - x) * (1 - x)) / (2 * d);
}
const oyenB5U = (frame: number) => {
  if (frame < EP02_B5_OYEN_WALK_START) return 0;
  const span = Math.max(1, B5.to - EP02_B5_OYEN_WALK_START);
  return cruiseProfile((frame - EP02_B5_OYEN_WALK_START) / span, OYEN_B5_ACCEL_F / span, OYEN_B5_DECEL_F / span) * OYEN_B5_END_U;
};

const tangentTurnsX = (t: Vec3) => Math.abs(t[0]) >= Math.abs(t[2]);
function firstFrame(from: number, to: number, pred: (f: number) => boolean): number {
  for (let f = from; f < to; f++) if (pred(f)) return f;
  return to;
}

/** Frame tangen kurva Utoh berbelok dominan +X (menuju Gedung FIK): view threeQuarter -> side. */
export const EP02_B5_UTOH_TURN_FRAME = firstFrame(EP02_B5_SPRINT_START, B5.to, (f) =>
  tangentTurnsX(utohSprintSample(f).tangent),
);
/** Frame tangen kurva Oyen berbelok dominan +X: view threeQuarter -> side. */
export const EP02_B5_OYEN_TURN_FRAME = firstFrame(EP02_B5_OYEN_WALK_START, B5.to, (f) =>
  tangentTurnsX(sampleTransitCurve(oyenB5U(f)).tangent),
);
/** Utoh tiba di plaza FIK dan mengerem (stance walk -> stand). Untuk SFX skid. */
export const EP02_B5_ARRIVE_FRAME = firstFrame(EP02_B5_SPRINT_START, B5.to, (f) => sprintU(f) > 0.96);

const UTOH_TURN_DIST = utohSprintSample(EP02_B5_UTOH_TURN_FRAME).dist;

/**
 * Tempo Oyen = setengah kadens langkah Utoh: siklus langkah Oyen dihitung agar jumlah siklus per detik
 * rata-rata tepat 1/2 milik Utoh pada jarak tempuhnya sendiri.
 */
const UTOH_SPRINT_LEN = utohSprintSample(B5.to).dist;
const OYEN_B5_LEN = sampleTransitCurve(OYEN_B5_END_U).dist;
const UTOH_CADENCE = UTOH_SPRINT_LEN / UTOH_CYCLE_SIDE / Math.max(1, B5.to - EP02_B5_SPRINT_START);
export const EP02_B5_OYEN_CYCLE_M = OYEN_B5_LEN / Math.max(1, B5.to - EP02_B5_OYEN_WALK_START) / (0.5 * UTOH_CADENCE);

/** O1: Oyen mulai membuka mulut "Meong." (lip-sync RMS-gated). Kedip pelan 14f berakhir tepat di frame ini. */
export const EP02_OYEN_MEONG_OPEN_FRAME = firstFrame(L_O1.startFrame - 3, L_O1.endFrame, (f) => talkFor('oyen', f).open > 0);
export const EP02_OYEN_MEONG_BLINK_FROM = EP02_OYEN_MEONG_OPEN_FRAME - 14;

/** Keadaan layar laptop Warkop per frame (`err47` -> `err48` setelah PLAK -> `ok` setelah Oyen duduk -> `wipe` saat replay). */
export function laptopScreenAt(frame: number): LaptopScreen {
  if (frame >= EP02_REPLAY_FROM && frame < EP02_REPLAY_TO) return 'wipe';
  if (frame < EP02_PLAK_FRAME + 2) return 'err47';
  if (frame < EP02_SCREEN_OK_FRAME) return 'err48';
  return 'ok';
}

/** Jumlah gelas kopi di meja kiri Warkop (3 kosong; gelas ke-4 diletakkan Bu Siti di EP02_SITI_CUP_DOWN_FRAME). */
export function coffeeCountAt(frame: number): number {
  return frame >= EP02_SITI_CUP_DOWN_FRAME ? 4 : 3;
}

// ---------------------------------------------------------------------------------------------
// Micro-life: napas & tekanan bicara HANYA saat bicara / bernapas / bereaksi
// ---------------------------------------------------------------------------------------------

type Win = readonly [number, number];

function activityAt(frame: number, wins: ReadonlyArray<Win>, ramp = 6): number {
  let a = 0;
  for (const [s, e] of wins) a = Math.max(a, clamp01(Math.min(frame - (s - ramp), e + ramp - frame) / ramp));
  return smooth(a);
}

const wordWinsOf = (spk: VoiceSpeaker): Win[] =>
  wordsOf(spk).map((w) => [Math.round(w.start * FPS), Math.round(w.end * FPS)] as Win);
const WORD_WINS: Record<VoiceSpeaker, Win[]> = {
  bangUtoh: wordWinsOf('bangUtoh'),
  buSiti: wordWinsOf('buSiti'),
  rara: wordWinsOf('rara'),
  oyen: wordWinsOf('oyen'),
};

const rmsSmooth = (spk: VoiceSpeaker, f: number) => (rmsAt(spk, f - 1) + rmsAt(spk, f) + rmsAt(spk, f + 1)) / 3;

/** Sway napas ±1,0° + bob tekanan kata ±1,2° (total maks ±2,2°) pada `lean`, plus geser kecil `facing`. */
function microLife(
  spk: VoiceSpeaker,
  frame: number,
  wins: ReadonlyArray<Win>,
  seed: number,
  quiet: ReadonlyArray<Win> = [],
): { lean: number; facing: number } {
  // Diredam penuh di jendela benturan (grammar PLAK / Enter), memudar 6f di tepinya: nol pop.
  let q = 1;
  for (const [s, e] of quiet) q = Math.min(q, frame >= s && frame < e ? 0 : smooth(Math.min(Math.abs(frame - e + 1), Math.abs(s - frame)) / 6));
  const a = activityAt(frame, wins) * q;
  if (a <= 0) return { lean: 0, facing: 0 };
  const breath = Math.sin((2 * Math.PI * frame) / 44 + seed);
  // Bob tekanan hanya di dalam kata (bukan di desahan/tawa), memudar 3f di tepi kata.
  const inWords = activityAt(frame, WORD_WINS[spk], 3);
  const emph = inWords * clamp((rmsSmooth(spk, frame) - rmsSmooth(spk, frame - 3)) * 2.5, -1, 1);
  return {
    lean: a * clamp(1.0 * breath + 1.2 * emph, -2.2, 2.2),
    facing: a * 0.025 * Math.sin((2 * Math.PI * frame) / 58 + seed * 1.3),
  };
}

const lineWin = (id: string): Win => {
  const l = lineById(id);
  return [l.startFrame - 2, l.endFrame + 4];
};
const nvWins = (spk: VoiceSpeaker): Win[] => eventsOf(spk).map((e) => [e.startFrame, e.endFrame] as Win);
const inWin = (frame: number, w: Win) => frame >= w[0] && frame < w[1];

// ---------------------------------------------------------------------------------------------
// Posisi
// ---------------------------------------------------------------------------------------------

// Titik posisi kunci Warkop (terverifikasi bebas clipping billboard yaw vs WK_BenchL_Top z <= 0,98 & WK_TableL x <= -1,09)
const UTOH_SEAT: Vec3 = [-1.92, 0, 1.18];
const UTOH_PLAK_SHIFT: Vec3 = [-1.96, 0, 1.2];
/** Posisi jongkok & girang di sisi kiri meja: 0% menutupi layar laptop 3D (ERROR 48 & ✓ 0 ERROR utuh)! */
const UTOH_SQUAT_SPOT: Vec3 = [-2.04, 0, 1.26];
const UTOH_CHEER_SPOT: Vec3 = [-2.02, 0, 1.22];

const SITI_COUNTER: Vec3 = EP02_SPOTS.warkop.buSiti;
const SITI_TABLE_SIDE: Vec3 = [-0.62, 0, 0.92];
const SITI_SLAP_SIDE: Vec3 = [-0.68, 0, 0.94];

/**
 * Lintasan jalan Bu Siti TIDAK PERNAH memotong volume konter (WK_CounterTop x ±2,34, z −1,95..−1,09):
 * dari kasir ia turun lewat anak tangga kanan (`EP02_SITI_COUNTER_RISER.step`), menyusuri lorong belakang konter
 * (z −2,25) ke ujung kanan, memutar di luar ujung konter (x 2,70, bebas tiang x ≤ 2,48 & pot x ≥ 2,87),
 * lalu menyusuri depan konter (z ≈ −0,75). WALK1 seluruhnya di luar frame (b2-utoh-panik / b2-coffee-dolly);
 * WALK3 keluar frame ke kanan di b4-stage-nyerah dan baru kembali ke kasir saat kamera tidak melihatnya.
 */
const SITI_STEP_OUT_X = EP02_SITI_COUNTER_RISER.step.center[0] + EP02_SITI_COUNTER_RISER.step.size[0] / 2 + 0.12;
const SITI_BACK_Z = SITI_COUNTER[2];
const SITI_AROUND_X = 2.7;
const SITI_FRONT_Z = -0.78;
export const EP02_SITI_WALK1_PATH: Vec3[] = [
  SITI_COUNTER,
  [SITI_STEP_OUT_X, 0, SITI_BACK_Z],
  [SITI_AROUND_X, 0, SITI_BACK_Z],
  [SITI_AROUND_X, 0, SITI_FRONT_Z],
  [-0.3, 0, SITI_FRONT_Z + 0.06],
  SITI_TABLE_SIDE,
];
export const EP02_SITI_WALK3_PATH: Vec3[] = [
  SITI_SLAP_SIDE,
  [0.2, 0, SITI_FRONT_Z + 0.06],
  [SITI_AROUND_X, 0, SITI_FRONT_Z],
  [SITI_AROUND_X, 0, SITI_BACK_Z],
  [SITI_STEP_OUT_X, 0, SITI_BACK_Z],
  SITI_COUNTER,
];
/** B2: kasir -> sisi meja (di luar frame), tiba sebelum b2-stage-siti. */
export const EP02_SITI_WALK1: readonly [number, number] = [B2.from, B2.from + 146];
const SITI_WALK1 = EP02_SITI_WALK1;
const SITI_WALK2 = [SITI_SLAP_WALK_FROM, SITI_SLAP_ARRIVE] as const;
/**
 * B4: Bu Siti bertahan di sisi meja menatap Utoh lemas (paruh pertama b4-stage-nyerah, tetap di safe-frame), lalu
 * berjalan keluar frame kanan menyusuri depan konter (kaki planted, ~1,5 m/s), memutar ujung konter di luar layar,
 * dan tiba di kasir di EP02_SITI_WALK3[1] saat kamera tidak melihatnya (b4-macro-0error).
 */
export const EP02_SITI_WALK3: readonly [number, number] = [B4.from + 60, B4.from + 194];
/** Frame akhir kaki "keluar frame" B4 (tempo jalan terlihat); sisa lintasan di luar layar ditempuh lebih cepat. */
const SITI_WALK3_EXIT_FRAMES = 56;
const SITI_WALK3 = EP02_SITI_WALK3;

/** Tinggi pijakan di sekitar kasir: panggung y=0,40 (x <= tepi kanan panggung), anak tangga, lalu lantai. */
function sitiFloorY(x: number, z: number): number {
  const top = SITI_COUNTER[1];
  if (z > SITI_BACK_Z + 0.3 || top <= 0) return 0;
  const edge = EP02_SITI_COUNTER_RISER.platform.center[0] + EP02_SITI_COUNTER_RISER.platform.size[0] / 2;
  return top * (1 - smooth((x - edge) / Math.max(0.05, SITI_STEP_OUT_X - edge)));
}

type PolyLut = { pts: Vec3[]; cum: number[]; len: number };
function polyLut(pts: Vec3[]): PolyLut {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function polyAt(l: PolyLut, d: number): Vec3 {
  const x = clamp(d, 0, l.len);
  let i = 1;
  while (i < l.cum.length - 1 && l.cum[i] < x) i++;
  const k = (x - l.cum[i - 1]) / Math.max(1e-6, l.cum[i] - l.cum[i - 1]);
  const a = l.pts[i - 1];
  const b = l.pts[i];
  const px = a[0] + (b[0] - a[0]) * k;
  const pz = a[2] + (b[2] - a[2]) * k;
  return [px, sitiFloorY(px, pz), pz];
}
const SITI_LUT1 = polyLut(EP02_SITI_WALK1_PATH);
const SITI_LUT3 = polyLut(EP02_SITI_WALK3_PATH);
const SITI_DIST_TO_SLAP = dist3(SITI_TABLE_SIDE, SITI_SLAP_SIDE);

/** Profil jarak tempuh jalan Bu Siti (percepatan 8f, jelajah tetap, perlambatan 10f) — kaki planted, nol skating. */
function sitiWalkDist(frame: number, w: readonly [number, number], len: number): number {
  if (w === EP02_SITI_WALK3) return siti3Dist(frame);
  const span = Math.max(1, w[1] - w[0]);
  return cruiseProfile((frame - w[0]) / span, 8 / span, 10 / span) * len;
}

/** Jarak di lintasan WALK3 saat pusat badan mencapai x = 1,45 m di depan konter (penuh di luar frame kanan). */
const SITI3_EXIT_DIST = (() => {
  const [, a, b] = EP02_SITI_WALK3_PATH;
  return SITI_LUT3.cum[1] + (1.45 - a[0]) * (Math.hypot(b[0] - a[0], b[2] - a[2]) / (b[0] - a[0]));
})();
/** WALK3 dua tempo: kaki terlihat (percepatan 8f, jelajah) sampai keluar frame, lalu sisa jalan di luar layar. */
function siti3Dist(frame: number): number {
  const t0 = EP02_SITI_WALK3[0];
  const tA = t0 + SITI_WALK3_EXIT_FRAMES;
  if (frame < tA) {
    const span = SITI_WALK3_EXIT_FRAMES;
    // percepatan 8f lalu jelajah tetap (tanpa perlambatan) -> kecepatan konstan saat melewati tepi frame
    const a = 8 / span;
    const x = clamp01((frame - t0) / span);
    const v = 1 / (1 - a / 2);
    return (x < a ? (v * x * x) / (2 * a) : v * (x - a / 2)) * SITI3_EXIT_DIST;
  }
  const span = Math.max(1, EP02_SITI_WALK3[1] - tA);
  return SITI3_EXIT_DIST + cruiseProfile((frame - tA) / span, 0, 10 / span) * (SITI_LUT3.len - SITI3_EXIT_DIST);
}
const UTOH_LAB_ENTRY: Vec3 = [0.08, 0, 0.9];
const UTOH_LAB_ENTRY_DIST = dist3(UTOH_LAB_ENTRY, EP02_SPOTS.lab.utoh);

// Offset B5 Si Oyen: mulai bersih di samping kiri Utoh ([-1,85, 0, 2,25], bebas bangku z <= 0,98), lalu menyatu ke jalur
const OYEN_B5_START_OFFSET: Vec3 = [-1.0, 0, 0.0];
const OYEN_B5_RUN_OFFSET: Vec3 = [-0.2, 0, -0.22];

// Posisi kunci Oyen di Warkop (cakar rata di y=0,77, 14 cm kanan bezel laptop x=-1,40, cakar kiri menjangkau tuts!)
const OYEN_WK_BASE: Vec3 = [-1.18, 0.77, 0.44];
const OYEN_WK_ON_KB: Vec3 = [-1.26, 0.77, 0.48];
const OYEN_WK_DIST = dist3(OYEN_WK_BASE, OYEN_WK_ON_KB);

/**
 * B4 (b4-stage-nyerah): frame pertama Bu Siti sudah keluar PENUH dari frame kanan (pusat badan x >= 1,20 m di depan
 * konter; kartu billboard selebar 1,1 m tidak lagi menyentuh tepi layar). Ia baru kembali ke kasir di
 * `EP02_SITI_WALK3[1]` saat kamera tidak melihatnya (b4-macro-0error), dan tampil lagi di b4-stage-girang.
 */
export const EP02_SITI_OFFSCREEN_FROM = (() => {
  for (let f = EP02_SITI_WALK3[0]; f < EP02_SITI_WALK3[1]; f++) {
    if (polyAt(SITI_LUT3, sitiWalkDist(f, EP02_SITI_WALK3, SITI_LUT3.len))[0] >= 1.2) return f;
  }
  return EP02_SITI_WALK3[1];
})();

export function actorVisibleAt(id: Ep02HumanId, frame: number): boolean {
  const loc = locationAt(frame);
  if (id === 'bangUtoh') return true;
  if (id === 'buSiti') return loc === 'warkop';
  if (id === 'rara') return loc === 'lab';
  return false;
}

const windowU = (frame: number, w: readonly [number, number]) => smooth((frame - w[0]) / Math.max(1, w[1] - w[0]));

export function actorPositionAt(id: Ep02HumanId, frame: number): Vec3 {
  const loc = locationAt(frame);

  if (id === 'bangUtoh') {
    if (loc === 'warkop') {
      // B3: tergeser halus ke kiri-belakang saat Bu Siti maju menepuk laptop
      if (frame >= B3.from && frame < B4.from) {
        const push = smooth((frame - B3.from) / 14);
        const back = smooth((frame - (B4.from - 18)) / 16);
        return lerp3(UTOH_SEAT, UTOH_PLAK_SHIFT, push * (1 - back));
      }
      if (frame >= B4.from) {
        // B4: meluncur lemas dari bangku ke jongkok sepanjang desahan (18f), lalu lompat girang (10f)
        if (frame < EP02_UTOH_JUMP_FRAME) {
          return lerp3(UTOH_SEAT, UTOH_SQUAT_SPOT, smooth((frame - UTOH_SLIDE_FROM) / (UTOH_SLIDE_TO - UTOH_SLIDE_FROM)));
        }
        return lerp3(UTOH_SQUAT_SPOT, UTOH_CHEER_SPOT, smooth((frame - EP02_UTOH_JUMP_FRAME) / 10));
      }
      return UTOH_SEAT;
    }

    if (loc === 'kampung') {
      if (frame < EP02_B5_SPRINT_START) return sampleTransitCurve(0).pos;
      return utohSprintSample(frame).pos;
    }

    // Lab FIK: berjalan cepat masuk ke spot presenter di awal B6 (18f)
    if (frame < B6.from + 18) {
      return lerp3(UTOH_LAB_ENTRY, EP02_SPOTS.lab.utoh, smooth((frame - B6.from) / 18));
    }
    return EP02_SPOTS.lab.utoh;
  }

  if (id === 'buSiti') {
    if (frame < SITI_WALK1[0]) return SITI_COUNTER;
    if (frame < SITI_WALK1[1]) return polyAt(SITI_LUT1, sitiWalkDist(frame, SITI_WALK1, SITI_LUT1.len));
    if (frame < SITI_WALK2[0]) return SITI_TABLE_SIDE;
    if (frame < SITI_WALK2[1]) return lerp3(SITI_TABLE_SIDE, SITI_SLAP_SIDE, windowU(frame, SITI_WALK2));
    if (frame < SITI_WALK3[0]) return SITI_SLAP_SIDE;
    if (frame < SITI_WALK3[1]) return polyAt(SITI_LUT3, sitiWalkDist(frame, SITI_WALK3, SITI_LUT3.len));
    return SITI_COUNTER;
  }

  // Mbak Rara di Lab FIK: berdiri di meja dosen bersama Si Oyen
  return EP02_SPOTS.lab.raraAtDesk;
}

// ---------------------------------------------------------------------------------------------
// BANG UTOH
// ---------------------------------------------------------------------------------------------

const ENTER_WINDUP = EP02_PROJECTOR_RUN_FRAME - 10;
const ENTER_HOLD = EP02_PROJECTOR_RUN_FRAME - 6;
const RUN = EP02_PROJECTOR_RUN_FRAME;
const PLAK = EP02_PLAK_FRAME;
const OK = EP02_SCREEN_OK_FRAME;
const JUMP = EP02_UTOH_JUMP_FRAME;
const ALARM_REACT = EP02_TASKBAR_ALARM_FRAME + 2;

const UTOH_STANCE: StepKey<ActorStance>[] = [
  [0, 'sit'],
  [EP02_UTOH_SQUAT_FRAME, 'squat'],
  [JUMP, 'jump'],
  [JUMP + 6, 'stand'],
  [EP02_B5_SPRINT_START, 'walk'],
  [EP02_B5_ARRIVE_FRAME, 'stand'],
  [B6.from, 'walk'],
  [B6.from + 18, 'stand'],
];

const UTOH_RIGHT: StepKey<ArmPose>[] = [
  [0, 'point'],
  [NV_U1_SIGH.startFrame + 3, 'rest'], // bahu melorot, tangan jatuh
  [W_U1_NGUNGSI - 2, 'point'], // "ngungsi ke warkop"
  [B2.from, 'rest'],
  [W_U2_BU - 3, 'raise'], // "Bu!" (breakdown hip otomatis)
  [L_U2.endFrame - 3, 'rest'],
  [PLAK - 2, 'raise'], // syok PLAK
  [PLAK + 24, 'hip'],
  [PLAK + 34, 'rest'],
  [NV_U3_CHUCKLE.startFrame, 'hip'], // kekeh getir
  [W_U3_BU - 2, 'hold'], // "Bu, ini laptop,"
  [W_U3_BUKAN - 2, 'point'], // tunjuk laptop "bukan TV tabung!"
  [UTOH_SLIDE_FROM, 'rest'], // lemas
  [JUMP, 'raise'],
  [NV_U5_LAUGH.startFrame - 2, 'pray'], // memuja Oyen
  [W_U5_LO - 2, 'point'], // "lo benerin?!"
  [L_S3.startFrame - 2, 'rest'],
  [ALARM_REACT, 'raise'],
  [EP02_B5_SPRINT_START, 'rest'], // lari tangan kosong
  [B6.from, 'wave'],
  [W_U7_KELAR - 2, 'raise'],
  [NV_U7_LAUGH.startFrame - 2, 'cross'], // busung dada silang tangan
  [ENTER_WINDUP, 'raise'],
  [RUN, 'point'],
  [RUN + 4, 'rest'],
  [B7.from, 'point'], // "Yen!"
  [L_U8.endFrame, 'rest'],
  [L_U9.startFrame - 2, 'raise'], // "Aduh Oyen!"
  [W_U9_GARA - 2, 'hold'],
  [NV_U9_SIGH.startFrame + 2, 'rest'], // tangan jatuh lemas
];

const UTOH_LEFT: StepKey<ArmPose>[] = [
  [0, 'rest'],
  [NV_U2_BREATH.startFrame - 1, 'hold'], // angkat HP jam
  [NV_S1_CHUCKLE.startFrame - 2, 'rest'],
  [PLAK - 2, 'raise'],
  [PLAK + 24, 'hip'],
  [PLAK + 34, 'rest'],
  [W_U3_BUKAN - 2, 'hip'],
  [UTOH_SLIDE_FROM, 'rest'],
  [JUMP, 'raise'],
  [NV_U5_LAUGH.startFrame - 2, 'pray'],
  [W_U5_LO - 2, 'rest'],
  [ALARM_REACT, 'raise'],
  [EP02_B5_SPRINT_START, 'rest'],
  [W_U7_KELAR - 2, 'raise'],
  [NV_U7_LAUGH.startFrame - 2, 'cross'],
  [ENTER_WINDUP, 'hip'],
  [RUN + 2, 'rest'],
  [L_U9.startFrame - 2, 'raise'],
  [W_U9_GARA - 2, 'hold'],
  [NV_U9_SIGH.startFrame + 2, 'rest'],
];

const UTOH_FACE: StepKey<Expression>[] = [
  [0, 'nervous'],
  [NV_U1_SIGH.startFrame, 'tired'], // helaan napas berat
  [NV_U1_SIGH.endFrame, 'nervous'], // menatap laptop merah berkeringat
  [NV_S1_CHUCKLE.startFrame - 2, 'tired'],
  [PLAK - 2, 'shock'],
  [L_S2.startFrame + 14, 'nervous'],
  [W_U3_BUKAN - 2, 'angry'],
  [UTOH_SLIDE_FROM, 'tired'],
  [OK + 6, 'skeptical'],
  [JUMP, 'shock'],
  [W_U5_NOL - 2, 'idea'],
  [NV_U5_LAUGH.startFrame - 2, 'laugh'],
  [NV_U5_LAUGH.endFrame, 'happy'],
  [ALARM_REACT, 'shock'],
  [EP02_B5_SPRINT_START, 'nervous'],
  [B6.from, 'happy'],
  [NV_U7_LAUGH.startFrame - 2, 'laugh'],
  [W_U7_NOL - 2, 'smug'],
  [RUN + 2, 'nervous'],
  [B7.from, 'shock'],
  [W_U8_YEN + 16, 'angry'],
  [EP02_REPLAY_TO, 'tired'],
  [L_U9.startFrame - 2, 'shock'],
  [wordFrame('U9', 'Oyen') + 17, 'sad'],
  [NV_U9_SIGH.startFrame, 'tired'],
];

const UTOH_FX: StepKey<ComicFx>[] = [
  [0, 'sweat'],
  [PLAK - 2, 'shock'],
  [L_S2.startFrame + 14, 'sweat'],
  [W_U3_BUKAN - 2, 'anger'],
  [UTOH_SLIDE_FROM, 'sweat'],
  [OK + 6, 'none'],
  [JUMP, 'shock'],
  [W_U5_NOL - 2, 'sparkle'],
  [L_U5.endFrame + 6, 'none'],
  [ALARM_REACT, 'shock'],
  [EP02_B5_SPRINT_START, 'sweat'],
  [B6.from, 'none'],
  [NV_U7_LAUGH.startFrame - 2, 'sparkle'],
  [L_U7.endFrame + 8, 'none'],
  [ENTER_WINDUP, 'sparkle'],
  [RUN + 2, 'sweat'],
  [B7.from, 'shock'],
  [W_U8_YEN + 16, 'anger'],
  [EP02_REPLAY_TO, 'sweat'],
  [L_U9.startFrame - 2, 'shock'],
  [wordFrame('U9', 'Oyen') + 17, 'sweat'],
  [NV_U9_SIGH.startFrame, 'none'],
];

const UTOH_LEAN: EaseKey[] = [
  [NV_U1_SIGH.startFrame, NV_U1_SIGH.startFrame + 12, 8], // bahu melorot lambat 12f
  [NV_U1_SIGH.endFrame + 6, NV_U1_SIGH.endFrame + 18, 5],
  [NV_U2_BREATH.startFrame, NV_U2_BREATH.startFrame + 6, -2], // tarik napas panik
  [NV_S1_CHUCKLE.startFrame - 2, NV_S1_CHUCKLE.startFrame + 6, 3],
  [PLAK - 2, PLAK + 4, -8],
  [PLAK + 24, PLAK + 40, 2],
  [NV_U3_CHUCKLE.startFrame, NV_U3_CHUCKLE.startFrame + 8, 4],
  [W_U3_BUKAN - 2, W_U3_BUKAN + 3, 6],
  [L_U3.endFrame, L_U3.endFrame + 6, 4],
  [UTOH_SLIDE_FROM, EP02_UTOH_SQUAT_FRAME, 9], // breakdown: condong maju masih duduk
  [EP02_UTOH_SQUAT_FRAME, UTOH_SLIDE_TO, 11],
  [OK + 4, OK + 20, 8], // kepala terangkat pelan melihat layar hijau
  [JUMP, JUMP + 8, -3],
  [NV_U5_LAUGH.startFrame - 2, NV_U5_LAUGH.startFrame + 4, 2],
  [L_S3.startFrame, L_S3.startFrame + 8, 0],
  [ALARM_REACT, ALARM_REACT + 6, -5],
  [B6.from, B6.from, 5],
  [B6.from + 18, B6.from + 24, -2],
  [NV_U7_LAUGH.startFrame - 2, NV_U7_LAUGH.startFrame + 2, -5], // busung dada
  [ENTER_WINDUP, ENTER_HOLD, 3],
  [RUN, RUN, 9],
  [RUN + 2, RUN + 10, 3],
  [B7.from, B7.from + 6, 5],
  [EP02_REPLAY_TO, EP02_REPLAY_TO + 8, 4],
  [L_U9.startFrame - 2, L_U9.startFrame + 4, -8],
  [W_U9_GARA - 2, W_U9_GARA + 8, 2],
  [NV_U9_SIGH.startFrame, NV_U9_SIGH.startFrame + 12, 10], // bahu jatuh lemas
];

const UTOH_FACING: EaseKey[] = [
  [B2.from, B2.from + 8, 0.48],
  [PLAK - 2, PLAK + 4, 0.42],
  [W_U3_BUKAN - 2, W_U3_BUKAN + 3, 0.3],
  [UTOH_SLIDE_FROM, UTOH_SLIDE_FROM + 12, 0.25],
  [OK + 4, OK + 16, 0.35],
  [JUMP, JUMP + 6, 0.28],
  [NV_U5_LAUGH.startFrame - 2, NV_U5_LAUGH.startFrame + 6, 0.6], // menoleh memuja Oyen
  [L_S3.startFrame - 2, L_S3.startFrame + 8, 0.38],
  [ALARM_REACT, ALARM_REACT + 4, 0.25],
  [B6.from, B6.from, 0.25],
  [B6.from + 18, B6.from + 24, 0.3],
  [ENTER_WINDUP, ENTER_HOLD, 0.28],
  [RUN, RUN + 4, 0.25],
  [RUN + 10, RUN + 14, 0.22],
  [B7.from, B7.from + 8, 0.65],
  [EP02_REPLAY_TO, EP02_REPLAY_TO + 6, 0.28],
  [NV_U9_SIGH.startFrame, NV_U9_SIGH.startFrame + 12, 0.12], // tatapan kosong
];

const UTOH_BLINK_SWAPS = [
  B2.from,
  NV_S1_CHUCKLE.startFrame - 2,
  PLAK - 2,
  W_U3_BUKAN - 2,
  OK + 6,
  JUMP,
  NV_U5_LAUGH.startFrame - 2,
  ALARM_REACT,
  B6.from + 18,
  RUN + 2,
  B7.from,
  L_U9.startFrame - 2,
];

const UTOH_MICRO_WINS: Win[] = [
  ...['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'].map(lineWin),
  ...nvWins('bangUtoh'),
  [NV_S1_SNIFF.startFrame, NV_S1_SNIFF.endFrame], // napas lelah menunggu Bu Siti menghirup kopi
  [PLAK - 2, PLAK + 40], // reaksi PLAK
  [OK + 4, OK + 22], // melihat layar hijau
  [ALARM_REACT, EP02_B5_SPRINT_START],
  [RUN, L_R2.endFrame], // napas gugup saat hening jangkrik & mendengar vonis Rara
  [NV_U9_SIGH.startFrame, 2300], // napas pasrah tenang di ending settle sebelum loop cut
];

/** Kepala makin menunduk ketika volume "nggak bakal kelar" mengecil (dipandu RMS), pulih setelah layar hijau. */
function utohHeadDrop(frame: number): number {
  const from = W_U4_NGGAK - 2;
  if (frame < from || frame >= OK + 20) return 0;
  const span = L_U4.endFrame + 2 - from;
  const k = Math.min(frame, L_U4.endFrame + 2);
  const quiet = 1 - clamp01(rmsSmooth('bangUtoh', k));
  const drop = 5 * smooth((k - from) / span) * (0.55 + 0.45 * quiet);
  return drop * (1 - smooth((frame - (OK + 4)) / 16));
}

function utohPose(frame: number): ActorPose {
  const loc = locationAt(frame);
  const talk = talkFor('bangUtoh', frame);
  const blink = Math.max(
    blinkLidAt(frame, 1, FPS, UTOH_BLINK_SWAPS),
    lidWindow(frame, NV_U1_SIGH.startFrame + 2, 12), // kedip lelah di helaan napas U1
    frame >= NV_U9_SIGH.startFrame + 2 ? 0.45 * smooth((frame - NV_U9_SIGH.startFrame - 2) / 6) : 0, // tatapan kosong
  );
  const stance = stepAt(UTOH_STANCE, frame);
  const leftArm = armAt(UTOH_LEFT, frame);
  const rightArm = armAt(UTOH_RIGHT, frame);
  const leftProp: HandProp = leftArm === 'hold' && frame < B3.from ? 'phoneClock' : 'none';
  const leftHand: HandRig | undefined = leftProp === 'phoneClock' ? { propText: ep02PhoneClockTextAt(frame) } : undefined;
  const hatPop = Math.max(
    hatPopSpring(frame, PLAK, 0.9, 14),
    hatPopSpring(frame, JUMP, 0.82, 10),
    hatPopSpring(frame, ALARM_REACT, 0.7, 8),
    hatPopSpring(frame, B5.from + 2, 0.92, 10),
    hatPopSpring(frame, B7.from, 0.58, 10),
    hatPopSpring(frame, L_U9.startFrame - 2, 0.94, 18),
  );
  const face = stepAt(UTOH_FACE, frame);
  const fx = stepAt(UTOH_FX, frame);

  // B5: sprint tangan kosong di kurva mulus; view threeQuarter saat dominan +Z, side setelah tangen berbelok +X
  if (loc === 'kampung' && frame >= EP02_B5_SPRINT_START) {
    const s = utohSprintSample(frame);
    const sideView = frame >= EP02_B5_UTOH_TURN_FRAME;
    const view: ActorView = sideView ? 'side' : 'threeQuarter';
    const walkPhase = sideView
      ? (UTOH_TURN_DIST / UTOH_CYCLE_3Q + (s.dist - UTOH_TURN_DIST) / UTOH_CYCLE_SIDE) % 1
      : (s.dist / UTOH_CYCLE_3Q) % 1;
    const lookBack =
      frame >= EP02_B5_UTOH_LOOKBACK_FRAME && frame < EP02_B5_UTOH_LOOKBACK_TO
        ? clamp01(Math.min(frame - EP02_B5_UTOH_LOOKBACK_FRAME + 1, EP02_B5_UTOH_LOOKBACK_TO - frame) / 2)
        : 0;
    const arrived = frame >= EP02_B5_ARRIVE_FRAME;
    return {
      face,
      blink,
      talk,
      stance,
      gait: 'planted',
      stride: SPRINT_STRIDE,
      walkPhase,
      view,
      leftArm,
      rightArm,
      lean: arrived
        ? lerp(11, 2, smooth((frame - EP02_B5_ARRIVE_FRAME) / Math.max(1, B5.to - EP02_B5_ARRIVE_FRAME)))
        : chainAt(frame, -4, [[EP02_B5_SPRINT_START, EP02_B5_SPRINT_START + 6, 11]]),
      facing: sideView ? s.dirX * 0.85 : 0.3,
      lookBack,
      fx,
    };
  }

  // B6: jalan masuk planted ke spot presenter
  if (loc === 'lab' && frame < B6.from + 18) {
    const u = smooth((frame - B6.from) / 18);
    const cycle = actorWalkCycleMeters(1.9, 'threeQuarter', 1.3, false);
    return {
      face,
      blink,
      talk,
      stance,
      gait: 'planted',
      stride: 1.3,
      walkPhase: ((UTOH_LAB_ENTRY_DIST * u) / cycle) % 1,
      view: 'threeQuarter',
      leftArm,
      rightArm,
      lean: 5,
      facing: 0.25,
      fx,
    };
  }

  const micro = microLife('bangUtoh', frame, UTOH_MICRO_WINS, 0.7, [[ENTER_WINDUP, RUN + 10]]);
  const lean = chainAt(frame, 2, UTOH_LEAN) + utohHeadDrop(frame) + micro.lean;
  const facing = chainAt(frame, 0.35, UTOH_FACING) + micro.facing;

  return {
    face,
    blink,
    talk,
    stance,
    view: 'threeQuarter',
    leftArm,
    rightArm,
    leftProp,
    ...(leftHand ? { leftHand } : {}),
    hatPop,
    lean: r2(lean),
    facing: r2(facing),
    fx,
  };
}

// ---------------------------------------------------------------------------------------------
// BU SITI
// ---------------------------------------------------------------------------------------------

const SITI_STANCE: StepKey<ActorStance>[] = [
  [0, 'stand'],
  [SITI_WALK1[0], 'walk'],
  [SITI_WALK1[1], 'stand'],
  [SITI_WALK2[0], 'walk'],
  [SITI_WALK2[1], 'stand'],
  [SITI_WALK3[0], 'walk'],
  [SITI_WALK3[1], 'stand'],
];

/**
 * Tangan kanan Bu Siti = gelas kopinya SENDIRI sepanjang Warkop (B1–B4). Pose lengan dasar tetap `hold`;
 * posisi gelas (samping kepala -> dada -> hidung -> bibir -> dada -> angkat) digerakkan KONTINU lewat
 * `HandRig.reach` (breakdown >= 4f, nol pop). Tangan kiri = tangan BEBAS (gelas ke-4 Utoh, lalu PLAK).
 */
const SITI_RIGHT: StepKey<ArmPose>[] = [[0, 'hold']];

const SITI_LEFT: StepKey<ArmPose>[] = [
  [0, 'hold'], // membawa gelas ke-4 milik Utoh di depan perut
  [EP02_SITI_CUP_DOWN_FRAME, 'hip'], // gelas dilepas di meja -> tangan kembali ke pinggang
  [SITI_SLAP_ARRIVE, 'raise'], // 4f wind-up (breakdown kontinu dari hip) -> 6f hold
  [PLAK, 'point'], // 1f PLAK menghantam sisi laptop (snap, grammar benturan)
  [PLAK + 6, 'hold'], // menatap tangannya, bingung
  [NV_S2_PAUSE.endFrame, 'hip'],
  [W_S2_DIGEPLAK - 2, 'point'], // "digeplak"
  [L_S2.endFrame + 4, 'hip'], // sisa Warkop: tangan di pinggang (smug di konter)
];
/** Tangan Bu Siti yang dipakai untuk PLAK (tangan bebas); gelas kopinya di tangan lain. */
export const EP02_SITI_PLAK_HAND = 'left' as const;
export const EP02_SITI_CUP_HAND = 'right' as const;
/** Pergantian pose lengan kiri yang SENGAJA snap (grammar benturan PLAK). */
const SITI_LEFT_SNAPS = new Set<number>([PLAK]);
/** Lama breakdown kontinu antar pose lengan Bu Siti (>= EP02_BREAKDOWN_FRAMES). */
export const EP02_SITI_ARM_BLEND_FRAMES = 4;

const SITI_FACE: StepKey<Expression>[] = [
  [0, 'neutral'],
  [B2.from, 'happy'],
  [SITI_WALK1[1], 'neutral'],
  [NV_S1_CHUCKLE.startFrame - 2, 'happy'], // kekeh halus, senyum hangat, gelas di dada
  [EP02_SITI_SIP_TO, 'neutral'], // puas menyesap -> "dulu." deadpan
  [SITI_SLAP_ARRIVE, 'focus'],
  [PLAK + 2, 'neutral'],
  [NV_S2_LAUGH.startFrame, 'skeptical'], // tawa kaget kecil, kepala miring bingung
  [NV_S2_PAUSE.endFrame, 'neutral'],
  [NV_S3_CHUCKLE.startFrame - 2, 'smug'],
];

const SITI_LEAN: EaseKey[] = [
  [NV_S1_SNIFF.startFrame, NV_S1_SNIFF.startFrame + 8, -3], // condong ke gelas, menghirup aroma dalam-dalam
  [NV_S1_SNIFF.endFrame - 2, EP02_SITI_SIP_FROM, -2], // menyesap
  [EP02_SITI_SIP_TO, EP02_SITI_CUP_LOWER_TO, 0],
  [SITI_SLAP_ARRIVE, PLAK - 6, 7], // 4f wind-up (condong menjauh dari laptop ke kanan)
  [PLAK, PLAK, -10], // 1f PLAK (menerjang ke kiri tepat ke sisi laptop!)
  [PLAK + 2, PLAK + 10, 0], // 8f follow-through
  [PLAK + 10, PLAK + 15, 6], // kepala miring bingung
  [NV_S2_LAUGH.endFrame, NV_S2_LAUGH.endFrame + 6, 0],
];

const SITI_FACING: EaseKey[] = [
  [B2.from, B2.from + 6, -0.5],
  [SITI_WALK1[1], SITI_WALK1[1] + 6, -0.55],
  [SITI_SLAP_ARRIVE, PLAK - 6, -0.62],
  [PLAK, PLAK, -0.65],
  [PLAK + 2, PLAK + 10, -0.6],
  [PLAK + 10, PLAK + 15, -0.3], // menatap tangannya
  [NV_S2_LAUGH.endFrame, NV_S2_LAUGH.endFrame + 6, -0.58],
  [SITI_WALK3[1], SITI_WALK3[1] + 8, -0.25],
  [NV_S3_CHUCKLE.startFrame - 2, NV_S3_CHUCKLE.startFrame + 2, -0.55], // melirik Oyen
  [W_S3_IKAN - 2, W_S3_IKAN + 4, -0.25],
];

const SITI_MICRO_WINS: Win[] = [...['S1', 'S2', 'S3'].map(lineWin), ...nvWins('buSiti')];
const SITI_CYCLE = actorWalkCycleMeters(1.72, 'threeQuarter', 1.0, false);
const SITI_HEIGHT = ACTORS.find((a) => a.id === 'buSiti')!.height;
const ACTOR_CANVAS_H_PX = 1100;
const ACTOR_SOLE_PX = 1040;

/** Arah hadap saat berjalan = arah gerak layar-X (dihaluskan ±4f), dicampur 6f ke trek facing di awal/akhir jalan. */
function sitiWalkFacing(frame: number, w: readonly [number, number], chain: number): number {
  const a = actorPositionAt('buSiti', Math.max(w[0], frame - 4));
  const b = actorPositionAt('buSiti', Math.min(w[1] - 1, frame + 4));
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const n = Math.hypot(dx, dz);
  const walkF = n < 1e-4 ? chain : 0.55 * clamp((dx / n) * 1.6, -1, 1);
  const k = Math.min(smooth((frame - w[0]) / 6), 1 - smooth((frame - (w[1] - 6)) / 6));
  return lerp(chain, walkF, k);
}

// --- Tinggi tangan di balik konter (U-1) ---------------------------------------------------------

/** Permukaan `WK_CounterTop` (m, warkop.glb). */
export const EP02_COUNTER_TOP_Y = 0.97;
/** Jarak minimum pusat tangan Bu Siti di atas permukaan konter (>= 8 cm, brief set-designer v6.1). */
export const EP02_SITI_HAND_CLEARANCE_M = 0.08;
/** Tinggi dunia minimum pusat tangan Bu Siti saat berdiri di spot kasir (m). */
export const EP02_SITI_COUNTER_HAND_MIN_Y = EP02_COUNTER_TOP_Y + EP02_SITI_HAND_CLEARANCE_M;
/**
 * Batas rig: di spot kasir pusat tangan wajib di y kanvas <= nilai ini (px rig 700x1100; makin kecil = makin tinggi).
 * Dengan spot v6.1 (pijakan 0,40 m, tinggi 1,72 m) = 624 px.
 */
export const EP02_SITI_COUNTER_HAND_MAX_PX = Math.floor(
  ACTOR_SOLE_PX - ((EP02_SITI_COUNTER_HAND_MIN_Y - EP02_SPOTS.warkop.buSiti[1]) * ACTOR_CANVAS_H_PX) / SITI_HEIGHT,
);

/** 1 = Bu Siti berdiri di spot kasir, 0 = >= 0,35 m darinya (memudar mulus saat berjalan). */
export function sitiCounterWeightAt(frame: number): number {
  const p = actorPositionAt('buSiti', frame);
  const c = EP02_SPOTS.warkop.buSiti;
  const d = Math.hypot(p[0] - c[0], p[2] - c[2]);
  return 1 - smooth((d - 0.05) / 0.3);
}

// --- Jalur gelas (titik kanvas sebelum lean, dihitung ulang tiap frame dari jangkar wajah) ------------

export type SitiCupState = 'high' | 'chest' | 'nose' | 'lips' | 'toast';
type CupKey = readonly [from: number, to: number, state: SitiCupState];
const SITI_CUP_KEYS: CupKey[] = [
  [EP02_SITI_CUP_CHEST_FROM, EP02_SITI_CUP_CHEST_TO, 'chest'], // kekeh: gelas di dada
  [EP02_SITI_CUP_RAISE_FROM, EP02_SITI_CUP_AT_NOSE_FROM, 'nose'], // hirupan panjang: gelas di hidung
  [EP02_SITI_CUP_AT_NOSE_TO, EP02_SITI_SIP_FROM, 'lips'], // "Ngopi": menyesap
  [EP02_SITI_SIP_TO, EP02_SITI_CUP_LOWER_TO, 'chest'], // turunkan gelas
  [W_S3_IKAN - 4, W_S3_IKAN + 1, 'toast'], // "ikan asin dua." angkat gelas, smug
  [L_S3.endFrame + 2, L_S3.endFrame + 8, 'chest'],
];

/** Keadaan gelas tangan kanan Bu Siti di frame ini: asal, tujuan, progres 0..1 (1 = mantap di tujuan). */
export function sitiCupStateAt(frame: number): { from: SitiCupState; to: SitiCupState; u: number } {
  let cur: SitiCupState = 'high';
  for (const [a, b, st] of SITI_CUP_KEYS) {
    if (frame < a) break;
    if (frame >= b) {
      cur = st;
      continue;
    }
    return { from: cur, to: st, u: smooth((frame - a + 1) / Math.max(1, b - a + 1)) };
  }
  return { from: cur, to: cur, u: 1 };
}

const KOPI_TILT_SIP = 0.5;

/** Titik tangan & kemiringan gelas untuk satu keadaan, dari pose dasar (tanpa rig) di frame ini. */
function sitiCupTarget(state: SitiCupState, base: ActorPose): { x: number; y: number; tilt: number } {
  const face = actorFaceAnchors('buSiti', base);
  const toward = (base.facing ?? 0) < 0 ? -1 : 1;
  const handFromRim = (rx: number, ry: number, tilt: number) => {
    const off = kopiRimPoint(0, 0, 1, tilt);
    return { x: rx - off.x, y: ry - off.y, tilt };
  };
  if (state === 'chest') return handFromRim(350 + 34, face.torsoTop + 46, 0);
  if (state === 'nose') return handFromRim(face.mouthX + toward * 4, face.noseY + 8, 0);
  if (state === 'lips') return handFromRim(face.mouthX + toward * 8, face.mouthY + 10, -toward * KOPI_TILT_SIP);
  const arm: ArmPose = state === 'toast' ? 'raise' : 'hold';
  const h = actorHandPoint('buSiti', { ...base, rightArm: arm, rightHand: undefined }, 1);
  return { x: h.rawX, y: h.rawY, tilt: 0 };
}

/** Tangan kiri: titik bawa gelas ke-4 (depan perut kiri) dan titik meletakkan (raih ke meja kiri-bawah). */
function sitiCarryPoint(base: ActorPose) {
  return { x: 350 - 112, y: actorFaceAnchors('buSiti', base).torsoTop + 92 };
}
function sitiPutdownPoint(base: ActorPose) {
  return { x: 350 - 222, y: actorFaceAnchors('buSiti', base).torsoTop + 128 };
}

/** Breakdown kontinu antar pose lengan bertahap: pose asal + progres (0..1) di EP02_SITI_ARM_BLEND_FRAMES frame pertama. */
function armBlendAt(keys: ReadonlyArray<StepKey<ArmPose>>, frame: number, snaps: ReadonlySet<number>): { from?: ArmPose; t: number } {
  for (let k = keys.length - 1; k > 0; k--) {
    const [f0, pose] = keys[k];
    if (frame < f0) continue;
    const dt = frame - f0;
    if (dt >= EP02_SITI_ARM_BLEND_FRAMES || snaps.has(f0) || keys[k - 1][1] === pose) return { t: 1 };
    return { from: keys[k - 1][1], t: smooth((dt + 1) / EP02_SITI_ARM_BLEND_FRAMES) };
  }
  return { t: 1 };
}

/** Uap 2D gelas Bu Siti: menguat x2,2 dan berdenyut alami selama hirupan, kembali normal 8f setelahnya. */
export function sitiSteamAt(frame: number): number {
  const base = chainAt(frame, 1, [
    [NV_S1_SNIFF.startFrame - 2, NV_S1_SNIFF.startFrame + 6, 2.2],
    [NV_S1_SNIFF.endFrame, NV_S1_SNIFF.endFrame + 8, 1],
  ]);
  if (frame >= NV_S1_SNIFF.startFrame && frame < NV_S1_SNIFF.endFrame) {
    return base + 0.3 * Math.sin((frame - NV_S1_SNIFF.startFrame) * 0.6);
  }
  return base;
}

const inSitiWord = (frame: number) => WORD_WINS.buSiti.some(([s, e]) => frame >= s - 1 && frame < e + 1);

function sitiPose(frame: number): ActorPose {
  let talk: ActorPose['talk'] = talkFor('buSiti', frame);
  const sipping = frame >= EP02_SITI_SIP_FROM && frame < EP02_SITI_SIP_TO;
  // Mulut tertutup saat bibir menempel gelas, kecuali di dalam kata ("Ngopi").
  if (sipping && !inSitiWord(frame)) talk = 0;
  const blink = Math.max(
    blinkLidAt(frame, 2, FPS, [B2.from, NV_S1_CHUCKLE.startFrame - 2, SITI_SLAP_ARRIVE, NV_S2_LAUGH.startFrame, NV_S2_PAUSE.endFrame, NV_S3_CHUCKLE.startFrame - 2]),
    lidWindow(frame, NV_S1_SNIFF.startFrame, NV_S1_SNIFF.endFrame - NV_S1_SNIFF.startFrame), // mata terpejam menghirup kopi
    lidWindow(frame, EP02_SITI_SIP_FROM, EP02_SITI_SIP_TO - EP02_SITI_SIP_FROM, 0.55), // mata sayu menikmati sesapan
  );
  const stance = stepAt(SITI_STANCE, frame);
  const rightArm = stepAt(SITI_RIGHT, frame);
  const leftArm = stepAt(SITI_LEFT, frame);
  const inWarkop = frame < B5.from;
  const rightProp: HandProp = inWarkop ? 'kopi' : 'none';
  const leftProp: HandProp = inWarkop && frame < EP02_SITI_CUP_DOWN_FRAME ? 'kopi' : 'none';
  const face = stepAt(SITI_FACE, frame);

  let walkPhase: number | undefined;
  let walkWin: readonly [number, number] | undefined;
  if (stance === 'walk') {
    if (frame < SITI_WALK1[1]) {
      walkWin = SITI_WALK1;
      walkPhase = (sitiWalkDist(frame, SITI_WALK1, SITI_LUT1.len) / SITI_CYCLE) % 1;
    } else if (frame < SITI_WALK2[1]) {
      walkPhase = ((SITI_DIST_TO_SLAP * windowU(frame, SITI_WALK2)) / SITI_CYCLE) % 1;
    } else {
      walkWin = SITI_WALK3;
      walkPhase = (sitiWalkDist(frame, SITI_WALK3, SITI_LUT3.len) / SITI_CYCLE) % 1;
    }
  }

  const micro =
    stance === 'walk' ? { lean: 0, facing: 0 } : microLife('buSiti', frame, SITI_MICRO_WINS, 2.1, [[SITI_SLAP_ARRIVE, PLAK + 10]]);
  const chainFacing = chainAt(frame, -0.4, SITI_FACING);
  const facing = walkWin && stance === 'walk' ? sitiWalkFacing(frame, walkWin, chainFacing) : chainFacing + micro.facing;

  const base: ActorPose = {
    face,
    blink,
    talk,
    stance,
    ...(walkPhase !== undefined ? { gait: 'planted' as const, stride: 1.0, walkPhase } : {}),
    view: 'threeQuarter',
    leftArm,
    rightArm,
    leftProp,
    rightProp,
    lean: r2(chainAt(frame, 0, SITI_LEAN) + micro.lean),
    facing: r2(facing),
  };

  // Tangan kanan: gelas kopi sendiri di jalur kontinu, digambar di depan wajah (bibir gelas di hidung/bibir).
  const cs = sitiCupStateAt(frame);
  const ca = sitiCupTarget(cs.from, base);
  const cb = sitiCupTarget(cs.to, base);
  const rightHand: HandRig = {
    reach: { x: r2(lerp(ca.x, cb.x, cs.u)), y: r2(lerp(ca.y, cb.y, cs.u)), t: 1 },
    propTilt: r2(lerp(ca.tilt, cb.tilt, cs.u)),
    steam: r2(sitiSteamAt(frame)),
    front: true,
  };

  // Tangan kiri: bawa gelas ke-4 -> raih meja & lepas -> pinggang -> PLAK, breakdown kontinu.
  const lb = armBlendAt(SITI_LEFT, frame, SITI_LEFT_SNAPS);
  const leftHand: HandRig = { front: true, ...(lb.from ? { from: lb.from, t: r2(lb.t) } : {}) };
  if (frame < EP02_SITI_CUP_DOWN_FRAME) {
    const c = sitiCarryPoint(base);
    const d = sitiPutdownPoint(base);
    const k = smooth((frame - EP02_SITI_PUTDOWN_FROM + 1) / (EP02_SITI_CUP_DOWN_FRAME - EP02_SITI_PUTDOWN_FROM));
    leftHand.reach = { x: r2(lerp(c.x, d.x, k)), y: r2(lerp(c.y, d.y, k)), t: 1 };
  } else if (frame < EP02_SITI_PUTDOWN_RETRACT_TO) {
    const d = sitiPutdownPoint(base);
    const t = 1 - smooth((frame - EP02_SITI_PUTDOWN_RETRACT_FROM + 1) / (EP02_SITI_PUTDOWN_RETRACT_TO - EP02_SITI_PUTDOWN_RETRACT_FROM));
    delete leftHand.from;
    delete leftHand.t;
    leftHand.reach = { x: r2(d.x), y: r2(d.y), t: r2(t) };
  }

  const pose: ActorPose = { ...base, leftHand, rightHand };

  // U-1: di spot kasir pusat tangan wajib >= EP02_SITI_COUNTER_HAND_MIN_Y (tidak "tenggelam" di WK_CounterTop).
  const w = sitiCounterWeightAt(frame);
  if (w > 0) {
    const posY = actorPositionAt('buSiti', frame)[1];
    for (const side of [-1, 1] as const) {
      const hp = actorHandPoint('buSiti', pose, side);
      const need = EP02_SITI_COUNTER_HAND_MIN_Y + 0.003 - actorCanvasToWorldY(hp.y, SITI_HEIGHT, posY);
      if (need > 0) {
        const rig = side < 0 ? leftHand : rightHand;
        rig.dy = r2((rig.dy ?? 0) - Math.ceil((need * ACTOR_CANVAS_H_PX) / SITI_HEIGHT) * w);
      }
    }
  }
  return pose;
}

/** Tinggi dunia (m) pusat tangan Bu Siti (kiri = -1, kanan = +1) pada frame ini — verifikasi set & kamera. */
export function sitiHandWorldYAt(frame: number, side: -1 | 1): number {
  const hp = actorHandPoint('buSiti', sitiPose(frame), side);
  return actorCanvasToWorldY(hp.y, SITI_HEIGHT, actorPositionAt('buSiti', frame)[1]);
}

// ---------------------------------------------------------------------------------------------
// MBAK RARA
// ---------------------------------------------------------------------------------------------

const RARA_RIGHT: StepKey<ArmPose>[] = [
  [0, 'rest'],
  [W_R1_JALANIN - 2, 'point'], // tunjuk dingin "Jalanin."
  [L_R1.endFrame + 8, 'rest'],
  [L_R3.startFrame - 2, 'hold'], // mencoret buku nilai
  [NV_R3_SIGH.startFrame + 3, 'rest'], // tutup buku
];

const RARA_FACE: StepKey<Expression>[] = [
  [0, 'neutral'],
  [NV_R1_SIGH.startFrame, 'tired'],
  [NV_R1_SIGH.endFrame, 'neutral'],
  [NV_R2_SIGH.startFrame - 2, 'tired'], // desahan lelah menatap proyektor
  [NV_R2_PAUSE.startFrame, 'neutral'], // jeda tajam: menoleh ke Utoh
  [NV_R2_CHUCKLE.startFrame, 'tired'],
  [NV_R2_CHUCKLE.startFrame + 6, 'smug'], // kekeh sinis
  [B7.from + 12, 'neutral'],
  [L_R3.startFrame - 2, 'happy'], // hangat ke Oyen
  [NV_R3_SIGH.startFrame + 8, 'neutral'], // deadpan ke Utoh
];

const RARA_FACING: EaseKey[] = [
  [RUN + 12, RUN + 20, -0.22],
  [NV_R2_SIGH.startFrame, NV_R2_SIGH.startFrame + 8, -0.18],
  [NV_R2_PAUSE.startFrame, NV_R2_PAUSE.startFrame + 3, -0.52], // menoleh tajam
  [EP02_REPLAY_TO, EP02_REPLAY_TO + 6, -0.45],
  [L_R3.startFrame - 2, L_R3.startFrame + 6, 0.14],
  [NV_R3_SIGH.endFrame - 6, NV_R3_SIGH.endFrame - 3, -0.52], // berbalik tajam
];

const RARA_LEAN: EaseKey[] = [
  [NV_R1_SIGH.startFrame, NV_R1_SIGH.startFrame + 6, 3], // sedikit menunduk
  [NV_R1_SIGH.endFrame, NV_R1_SIGH.endFrame + 6, 0],
  [RUN + 12, RUN + 20, 4],
  [NV_R2_PAUSE.startFrame, NV_R2_PAUSE.startFrame + 3, 0],
  [L_R3.startFrame - 2, L_R3.startFrame + 6, 2],
  [NV_R3_SIGH.startFrame + 4, NV_R3_SIGH.startFrame + 10, 0],
];

const RARA_MICRO_WINS: Win[] = [...['R1', 'R2', 'R3'].map(lineWin), ...nvWins('rara')];

function raraPose(frame: number): ActorPose {
  const talk = talkFor('rara', frame);
  const blink = Math.max(
    blinkLidAt(frame, 3, FPS, [RUN, NV_R2_SIGH.startFrame - 2, NV_R2_PAUSE.startFrame, NV_R2_CHUCKLE.startFrame + 6, L_R3.startFrame - 2, NV_R3_SIGH.startFrame + 8]),
    lidWindow(frame, NV_R1_SIGH.startFrame + 1, 12), // kedip lambat di helaan napas dingin
  );
  const rightArm = armAt(RARA_RIGHT, frame);
  const writing = frame >= L_R3.startFrame && frame < NV_R3_SIGH.startFrame;
  const writingBob = writing ? Math.sin((frame - L_R3.startFrame) * 0.45) * 1.6 : 0;
  const micro = writing ? { lean: 0, facing: 0 } : microLife('rara', frame, RARA_MICRO_WINS, 4.2);

  return {
    face: stepAt(RARA_FACE, frame),
    blink,
    talk,
    stance: 'stand',
    view: 'threeQuarter',
    leftArm: 'hold',
    leftProp: 'book',
    rightArm,
    rightProp: rightArm === 'hold' ? 'pen' : 'none',
    lean: r2(chainAt(frame, 0, RARA_LEAN) + writingBob + micro.lean),
    facing: r2(chainAt(frame, -0.45, RARA_FACING) + micro.facing),
  };
}

export function poseFor(id: Ep02HumanId, frame: number): ActorPose {
  if (id === 'bangUtoh') return utohPose(frame);
  if (id === 'buSiti') return sitiPose(frame);
  return raraPose(frame);
}

// ---------------------------------------------------------------------------------------------
// SI OYEN
// ---------------------------------------------------------------------------------------------

/** Kedip pelan khas Si Oyen (15 frame simetris: lambat, polos, deadpan). */
function slowCatBlinkAt(frame: number, centers: number[]): number {
  for (const c of centers) {
    const d = Math.abs(frame - c);
    if (d <= 4) return 1;
    if (d <= 7) return 0.5;
  }
  return 0;
}

/** Kedip O1 14 frame tepat sebelum mulut membuka "Meong." (berlaku juga di ekor Replay -> match-cut). */
const oyenMeongBlink = (frame: number) => lidWindow(frame, EP02_OYEN_MEONG_BLINK_FROM, 14);

export function oyenPositionAt(frame: number): Vec3 {
  const loc = locationAt(frame);

  if (loc === 'warkop') {
    if (frame >= EP02_OYEN_WALK_KB_FROM && frame < EP02_OYEN_KB_ARRIVE_FRAME) {
      const u = smooth((frame - EP02_OYEN_WALK_KB_FROM) / Math.max(1, EP02_OYEN_KB_ARRIVE_FRAME - EP02_OYEN_WALK_KB_FROM));
      return lerp3(OYEN_WK_BASE, OYEN_WK_ON_KB, u);
    }
    if (frame >= EP02_OYEN_KB_ARRIVE_FRAME) return OYEN_WK_ON_KB;
    return OYEN_WK_BASE;
  }

  if (loc === 'kampung') {
    // Mulai bersih di paving depan ([-1,85, 0, 2,25], bebas bangku Warkop & tidak tumpang-tindih Utoh), lalu menyatu halus ke jalur!
    const uO = oyenB5U(frame);
    const blend = smooth(uO / 0.14);
    const s = sampleTransitCurve(uO);
    return [
      s.pos[0] + lerp(OYEN_B5_START_OFFSET[0], OYEN_B5_RUN_OFFSET[0], blend),
      s.pos[1],
      s.pos[2] + lerp(OYEN_B5_START_OFFSET[2], OYEN_B5_RUN_OFFSET[2], blend),
    ];
  }

  return EP02_SPOTS.lab.oyen;
}

export function oyenPoseAt(frame: number): CatPose {
  const loc = locationAt(frame);
  const blink = Math.max(
    slowCatBlinkAt(frame, [
      NV_U1_SIGH.endFrame,
      NV_S1_CHUCKLE.startFrame,
      PLAK + 20,
      OK + 28,
      EP02_B5_SPRINT_START + 4,
      L_R3.startFrame + 36,
    ]),
    oyenMeongBlink(frame),
  );

  if (loc === 'warkop') {
    // B3: saat PLAK hanya telinga berkedut tenang & tetap deadpan
    if (frame >= PLAK && frame < PLAK + 24) {
      return {
        face: 'neutral',
        blink,
        stance: 'sit',
        view: 'threeQuarter',
        facing: -0.45,
        earTwitch: Math.sin((frame - PLAK) * 0.5) * 0.85,
        tailPhase: frame * 0.08,
      };
    }
    // B4: meregang halus sebelum naik keyboard
    if (frame >= EP02_OYEN_STRETCH_FROM && frame < EP02_OYEN_WALK_KB_FROM) {
      const u = clamp01((frame - EP02_OYEN_STRETCH_FROM) / Math.max(1, EP02_OYEN_WALK_KB_FROM - EP02_OYEN_STRETCH_FROM));
      return {
        face: 'neutral',
        blink,
        stance: 'stand',
        stretch: Number((Math.sin(u * Math.PI) * 0.88).toFixed(3)),
        view: 'side',
        facing: -0.82,
        tailPhase: frame * 0.1,
      };
    }
    // B4: jalan planted (side) sampai sisi kanan keyboard
    if (frame >= EP02_OYEN_WALK_KB_FROM && frame < EP02_OYEN_KB_ARRIVE_FRAME) {
      const u = smooth((frame - EP02_OYEN_WALK_KB_FROM) / Math.max(1, EP02_OYEN_KB_ARRIVE_FRAME - EP02_OYEN_WALK_KB_FROM));
      return {
        face: 'neutral',
        blink,
        stance: 'walk',
        walkPhase: ((OYEN_WK_DIST * u) / 0.34) % 1,
        view: 'side',
        facing: -0.85,
        tailPhase: frame * 0.14,
      };
    }
    // B4: berhenti di keyboard dalam SATU view threeQuarter: settle 3f -> duduk -> cakar kiri (mengarah ke keyboard!)
    // pada STEP1 & STEP2 (dengan lean lebih dalam pada ketukan kedua), tidak pernah melayang keluar ke kanan bezel!
    if (frame >= EP02_OYEN_KB_ARRIVE_FRAME && frame < B5.from) {
      const step1 = frame >= EP02_OYEN_STEP1_FRAME && frame < EP02_OYEN_STEP1_FRAME + 5;
      const step2 = frame >= EP02_OYEN_STEP2_FRAME && frame < EP02_OYEN_STEP2_FRAME + 5;
      const pawRaise: CatPose['pawRaise'] = step1 || step2 ? 'left' : 'none';
      const lean = step2 ? -7 : step1 ? -4 : 0;
      return {
        face: 'neutral',
        blink,
        stance: frame < EP02_OYEN_SIT_FRAME ? 'stand' : 'sit',
        pawRaise,
        lean,
        view: 'threeQuarter',
        facing: -0.58,
        tailPhase: frame * (frame < OK ? 0.12 : 0.08),
      };
    }
    return { face: 'neutral', blink, stance: 'sit', view: 'threeQuarter', facing: -0.4, tailPhase: frame * 0.08 };
  }

  if (loc === 'kampung') {
    // Duduk tenang menatap Utoh sprint duluan (12f) -> bangkit 3f -> jalan santai setengah tempo manusia
    if (frame < EP02_B5_OYEN_WAIT_TO) {
      const watching = frame >= EP02_B5_SPRINT_START;
      return {
        face: 'neutral',
        blink,
        stance: 'sit',
        view: 'threeQuarter',
        facing: watching ? lerp(0.5, 0.62, smooth((frame - EP02_B5_SPRINT_START) / 8)) : 0.5,
        earTwitch: watching && frame < EP02_B5_SPRINT_START + 6 ? 0.6 : 0,
        tailPhase: frame * 0.06,
      };
    }
    if (frame < EP02_B5_OYEN_WALK_START) {
      return { face: 'neutral', blink, stance: 'stand', view: 'threeQuarter', facing: 0.6, tailPhase: frame * 0.08 };
    }
    const s = sampleTransitCurve(oyenB5U(frame));
    const sideView = frame >= EP02_B5_OYEN_TURN_FRAME;
    return {
      face: 'neutral',
      blink,
      stance: 'walk',
      walkPhase: (s.dist / EP02_B5_OYEN_CYCLE_M) % 1,
      view: sideView ? 'side' : 'threeQuarter',
      facing: sideView ? s.dirX * 0.85 : 0.6,
      tailPhase: frame * 0.09,
    };
  }

  // B7: satu-satunya "Meong." polos di seluruh episode (lip-sync RMS-gated)
  if (frame >= L_O1.startFrame - 2 && frame <= L_O1.endFrame + 2) {
    return {
      face: 'neutral',
      blink,
      talk: talkFor('oyen', frame),
      stance: 'sit',
      view: 'front',
      facing: -0.08,
      tailPhase: frame * 0.08,
    };
  }

  // B7 akhir: kibas ekor santai bangga dapat Nilai A
  const proud = frame >= L_R3.startFrame - 2;
  return {
    face: proud ? 'smug' : 'neutral',
    blink,
    stance: 'sit',
    view: 'threeQuarter',
    facing: -0.45,
    earTwitch: frame >= W_U8_YEN && frame < W_U8_YEN + 8 ? 0.7 : 0,
    tailPhase: proud ? (frame - L_R3.startFrame) * 0.24 : frame * 0.08,
  };
}

/**
 * Pose hidup Si Oyen selama Replay Sepia B7 (TIDAK beku!):
 * cakar kiri tekan CTRL+A -> cakar kanan/kiri mengetik `mmmmmmmeeeeee` -> duduk polos, lalu kedip pelan O1 dimulai
 * (match-cut ke CU Lab, mulut membuka "Meong." tepat setelah kedip selesai).
 */
export function oyenReplayPoseAt(frame: number): CatPose {
  const rf = Math.max(0, frame - EP02_REPLAY_FROM);
  const blink = oyenMeongBlink(frame);
  if (rf < 18) {
    const pressing = rf >= 3 && rf <= 15;
    return {
      face: 'neutral',
      blink,
      stance: 'sit',
      pawRaise: pressing ? 'left' : 'none',
      lean: pressing ? -5 : 0,
      earTwitch: rf >= 6 && rf <= 12 ? 0.55 : 0,
      view: 'threeQuarter',
      facing: -0.52,
      tailPhase: rf * 0.14,
    };
  }
  if (rf < 44) {
    // Ketikan progresif `mmmm`: cakar kiri (mengarah ke tombol keyboard di kiri Oyen!) mengetuk ritmis!
    const pressing = (rf - 18) % 7 < 4;
    return {
      face: 'neutral',
      blink,
      stance: 'sit',
      pawRaise: pressing ? 'left' : 'none',
      lean: pressing ? -7 : -2,
      view: 'threeQuarter',
      facing: -0.52,
      tailPhase: rf * 0.16,
    };
  }
  return {
    face: 'smug',
    blink,
    stance: 'sit',
    pawRaise: 'none',
    lean: 0,
    view: 'threeQuarter',
    facing: -0.4,
    tailPhase: rf * 0.1,
  };
}
