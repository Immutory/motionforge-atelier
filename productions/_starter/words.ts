import type { TalkEvent, Word } from '../../engine';
import raw from './voice/words.json';

/**
 * Jam utama produksi (pola modern v2.0 / v6.x). Diisi `voice-director`, dibaca semua agent lain.
 * Setelah Fase 2 selesai (generate `voice/timeline.json` & `voice/rms.json`), ganti konstanta
 * `VOICE_LINES`, `BEATS`, `NONVERBAL`, dan `rmsAt` di bawah untuk membaca langsung dari kedua JSON tersebut.
 */
export const WORDS: Word[] = raw;

export type VoiceSpeaker = 'bangUtoh' | 'rara';

export type VoiceLine = {
  id: string;
  beat: number;
  speaker: VoiceSpeaker;
  text: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
};

export type Beat = {
  beat: number;
  name: string;
  from: number;
  to: number;
  fromSec: number;
  toSec: number;
};

export type NonVerbal = TalkEvent & {
  line: string;
  speaker: VoiceSpeaker;
  label: string;
  start: number;
  end: number;
  voiced: boolean;
};

/** Contoh beat awal (otomatis disinkronkan dari `voice/timeline.json` setelah Fase 2). */
export const BEATS: Beat[] = [
  { beat: 1, name: 'Hook Pembuka', from: 0, to: 90, fromSec: 0, toSec: 3.0 },
  { beat: 2, name: 'Reaksi & Eskalasi', from: 90, to: 160, fromSec: 3.0, toSec: 5.33 },
  { beat: 3, name: 'Insert & Penutup', from: 160, to: 220, fromSec: 5.33, toSec: 7.33 },
];

export const VOICE_LINES: VoiceLine[] = [
  {
    id: 'U1',
    beat: 1,
    speaker: 'bangUtoh',
    text: WORDS.map((w) => w.text).join(' '),
    start: WORDS[0]?.start ?? 0.2,
    end: WORDS[WORDS.length - 1]?.end ?? 5.8,
    startFrame: Math.round((WORDS[0]?.start ?? 0.2) * 30),
    endFrame: Math.round((WORDS[WORDS.length - 1]?.end ?? 5.8) * 30),
  },
];

/** Momen non-verbal rekaman (`breath`, `sigh`, `laugh`, `pause`) dari `voice/timeline.json`. */
export const NONVERBAL: NonVerbal[] = [];

export const beatAt = (frame: number): Beat =>
  BEATS.find((b) => frame >= b.from && frame < b.to) ?? BEATS[BEATS.length - 1];

export const wordsOf = (speaker: VoiceSpeaker): Word[] =>
  WORDS.filter((w) => (w.speaker ?? 'bangUtoh') === speaker);

export const lineById = (id: string): VoiceLine => {
  const line = VOICE_LINES.find((x) => x.id === id);
  if (!line) throw new Error(`Baris suara ${id} tidak ada di VOICE_LINES`);
  return line;
};

/**
 * Amplitudo RMS per frame (0..1) untuk `talkGated`.
 * Sebelum `voice/rms.json` dibuat di Fase 2, mengembalikan 0.65 saat kata aktif agar lip-sync preview tetap berjalan.
 */
export const rmsAt = (speaker: VoiceSpeaker, frame: number, fps = 30): number => {
  const t = frame / fps;
  return wordsOf(speaker).some((w) => t >= w.start && t <= w.end) ? 0.65 : 0;
};

/**
 * Berkas suara untuk PRATINJAU di studio saja (`null` = tanpa suara).
 * Letakkan `voice.wav` di `public/<slug>/voice.wav` lalu isi, mis. `'starter/voice.wav'`.
 * Render akhir memakai `mix.wav` lewat `npm run mux`, bukan track ini.
 */
export const PREVIEW_VOICE: string | null = null;
