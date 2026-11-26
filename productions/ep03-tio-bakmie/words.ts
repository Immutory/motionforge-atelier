import type { Word } from '../../engine';
import raw from './voice/words.json';
import timeline from './voice/timeline.json';
import rms from './voice/rms.json';

/**
 * Jam utama produksi EP03 "Curhat ke Abang Bakmie". Diisi voice-director, dibaca semua agent lain.
 * Semua baris = rekaman pengguna (`utoh_01–07`, `tio_01–07`, `yuni_01`) + meong asli Oyen, natural 1.0x.
 * Jangan edit `voice/words.json`, `voice/timeline.json`, atau `voice/rms.json` dengan tangan;
 * ubah `voice/lines.json` lalu jalankan `voice/build_voice.py`.
 */
export const WORDS: Word[] = raw;

export type VoiceSpeaker = 'bangUtoh' | 'tio' | 'mbakYuni' | 'oyen';

export type VoiceLine = {
  /** U1..U7 Utoh, T1..T7 Tio, Y1 Yuni, O1 meong Oyen */
  id: string;
  beat: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
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
}));

/** Durasi master (1800 f) dan hard cut loop ke f0 (1785 f). */
export const EP03_FRAMES: number = timeline.totalFrames;
export const EP03_LOOP_CUT_FRAME: number = timeline.loopCutFrame;

export type Beat = { beat: number; name: string; from: number; to: number; fromSec: number; toSec: number };
export const BEATS: Beat[] = timeline.beats;
export const beatAt = (frame: number): Beat =>
  BEATS.find((b) => frame >= b.from && frame < b.to) ?? BEATS[BEATS.length - 1];

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

const RMS: Record<string, number[]> = rms.speakers;
/** Amplitudo RMS rekaman per frame (0..1) untuk lip-sync RMS-gated. */
export const rmsAt = (speaker: VoiceSpeaker, frame: number): number => {
  const track = RMS[speaker];
  if (!track || frame < 0) return 0;
  return track[Math.min(track.length - 1, Math.floor(frame))] ?? 0;
};

export const wordsOf = (speaker: VoiceSpeaker): Word[] => WORDS.filter((w) => w.speaker === speaker);

export const lineById = (id: string): VoiceLine => {
  const l = VOICE_LINES.find((x) => x.id === id);
  if (!l) throw new Error(`Baris suara ${id} tidak ada`);
  return l;
};

/** Frame awal kata `text` (kemunculan ke-n) di baris `lineId`. */
export function wordFrame(lineId: string, text: string, n = 0, fps = 30): number {
  const l = lineById(lineId);
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = WORDS.filter(
    (w) => w.speaker === l.speaker && w.start >= l.start - 0.05 && w.start <= l.end + 0.05 && norm(w.text) === norm(text),
  );
  const w = hits[n];
  if (!w) throw new Error(`Kata "${text}" tidak ada di baris ${lineId}`);
  return Math.round(w.start * fps);
}

/**
 * Berkas suara untuk PRATINJAU di studio saja (null = tanpa suara).
 * Render akhir memakai mix.wav lewat `npm run mux`.
 */
export const PREVIEW_VOICE: string | null = null;
