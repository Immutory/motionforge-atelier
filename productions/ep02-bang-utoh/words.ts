import type { Word } from '../../engine';
import raw from './voice/words.json';
import timeline from './voice/timeline.json';
import rms from './voice/rms.json';

/**
 * Jam utama produksi EP02 (Master Cut v5.0). Diisi voice-director, dibaca semua agent lain.
 *
 * Semua baris memakai 15 REKAMAN FINAL pengguna (`voice/utoh_01-09`, `buSiti_01-03`, `rara_01-03`)
 * pada kecepatan natural 1.0x, plus meong asli Oyen. Tidak ada placeholder (`VOICE_IS_PLACEHOLDER === false`).
 * Jangan edit `voice/words.json`, `voice/timeline.json`, atau `voice/rms.json` dengan tangan;
 * ubah `voice/lines.json` lalu jalankan `voice/build_voice.py`.
 */
export const WORDS: Word[] = raw;

export type VoiceSpeaker = 'bangUtoh' | 'buSiti' | 'rara' | 'oyen';

export type VoiceLine = {
  /** U1..U9 Bang Utoh, S1..S3 Bu Siti, R1..R5 Rara, O1 meong Oyen */
  id: string;
  beat: number;
  speaker: string;
  text: string;
  /** detik kata pertama / akhir kata terakhir */
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
  /** true = audio baris ini masih TTS sementara dan wajib diganti rekaman asli */
  placeholder: boolean;
  source: string;
};

export const VOICE_LINES: VoiceLine[] = timeline.lines.map((l) => ({
  id: l.id,
  beat: l.beat,
  speaker: l.speaker,
  text: l.text,
  start: l.start,
  end: l.end,
  startFrame: l.startFrame,
  endFrame: l.endFrame,
  placeholder: l.placeholder,
  source: l.source,
}));

/**
 * Durasi master EP02, diturunkan dari layout 15 rekaman final (lihat voice/lines.json).
 * Hard cut loop ke f0 di EP02_LOOP_CUT_FRAME (= total - 15).
 */
export const EP02_FRAMES: number = timeline.totalFrames;
export const EP02_LOOP_CUT_FRAME: number = timeline.loopCutFrame;

export type Beat = {
  beat: number;
  name: string;
  /** frame awal (inklusif) dan akhir (eksklusif) jendela beat BARU, @30fps */
  from: number;
  to: number;
  fromSec: number;
  toSec: number;
};

/** Jendela beat baru yang diturunkan dari layout suara; setiap baris dialog dijamin berada di dalamnya. */
export const BEATS: Beat[] = timeline.beats;

export const beatAt = (frame: number): Beat =>
  BEATS.find((b) => frame >= b.from && frame < b.to) ?? BEATS[BEATS.length - 1];

/** ID baris yang masih placeholder (kosong = semua suara final). */
export const VOICE_PLACEHOLDER_IDS: string[] = timeline.placeholderLines;
export const VOICE_IS_PLACEHOLDER = VOICE_PLACEHOLDER_IDS.length > 0;

/**
 * Momen non-verbal rekaman (napas, desahan, hirupan kopi, kekeh, tawa, jeda) dengan frame presisi.
 * `kind`: breath | sigh | sniff | chuckle | laugh | pause. `voiced=false` berarti jeda hening.
 * Dipakai character-animator (akting napas), cinematographer (punch-in di jeda), sound-designer (ducking).
 */
export type NonVerbal = {
  line: string;
  speaker: string;
  kind: string;
  label: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
  voiced: boolean;
};

export const NONVERBAL: NonVerbal[] = timeline.nonverbal;

/** Momen non-verbal ke-n (0-based) dari satu baris, mis. `nonverbalOf('S1', 1)` = hirupan aroma kopi. */
export const nonverbalOf = (lineId: string, n = 0): NonVerbal => {
  const e = NONVERBAL.filter((x) => x.line === lineId)[n];
  if (!e) throw new Error(`Momen non-verbal ${lineId}#${n} tidak ada`);
  return e;
};

/** Amplitudo RMS rekaman per frame (0..1, 1 = puncak bicara wajar) untuk lip-sync RMS-gated. */
const RMS: Record<string, number[]> = rms.speakers;

export const rmsAt = (speaker: VoiceSpeaker, frame: number): number => {
  const track = RMS[speaker];
  if (!track || frame < 0) return 0;
  return track[Math.min(track.length - 1, Math.floor(frame))] ?? 0;
};

/** `talkAt` tidak punya filter speaker: berikan setiap karakter hanya kata miliknya. */
export const wordsOf = (speaker: VoiceSpeaker): Word[] => WORDS.filter((w) => w.speaker === speaker);

export const lineById = (id: string): VoiceLine => {
  const l = VOICE_LINES.find((x) => x.id === id);
  if (!l) throw new Error(`Baris suara ${id} tidak ada`);
  return l;
};

/**
 * Berkas suara untuk PRATINJAU di studio saja (null = tanpa suara).
 * voice/voice.wav sudah ada; untuk pratinjau salin ke public/ep02-bang-utoh/voice.wav (milik showrunner/render)
 * lalu isi 'ep02-bang-utoh/voice.wav'. Render akhir memakai mix.wav lewat `npm run mux`.
 */
export const PREVIEW_VOICE: string | null = null;
