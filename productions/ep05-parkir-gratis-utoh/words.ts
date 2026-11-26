import type { Word } from '../../engine';
import raw from './voice/words.json';
import timeline from './voice/timeline.json';
import rms from './voice/rms.json';

/** Jam utama produksi EP05 "Parkir Gratis 0 Rupiah, Tapi Keluarnya Bayar 10 Ribu?!" (milik voice-director). */
export const WORDS: Word[] = raw;

export type VoiceSpeaker = 'bangUtoh' | 'ebot' | 'bangUdin' | 'raka' | 'pakBudi' | 'belang';

export type VoiceLine = {
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

export const EP05_FRAMES: number = timeline.totalFrames;
export const EP05_LOOP_CUT_FRAME: number = timeline.loopCutFrame;

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
export const NONVERBAL: NonVerbal[] = timeline.nonverbal as NonVerbal[];

const RMS: Record<string, number[]> = rms.speakers;
export const rmsAt = (speaker: VoiceSpeaker, frame: number): number => {
  const track = RMS[speaker];
  if (!track || frame < 0) return 0;
  return track[Math.min(track.length - 1, Math.floor(frame))] ?? 0;
};

export const lineById = (id: string): VoiceLine => {
  const found = VOICE_LINES.find((l) => l.id === id);
  if (!found) throw new Error(`Voice line "${id}" tidak ditemukan di timeline EP05`);
  return found;
};

export const wordsOf = (speaker: VoiceSpeaker): Word[] => WORDS.filter((w) => w.speaker === speaker);

export function wordFrame(lineId: string, needle: string, occurrence = 0, fps = 30): number {
  const ln = lineById(lineId);
  const norm = (s: string) => s.toLowerCase().replace(/[^0-9a-z]/g, '');
  const want = norm(needle);
  const matches = WORDS.filter(
    (w) => w.speaker === ln.speaker && w.start >= ln.start - 0.15 && w.end <= ln.end + 0.15 && norm(w.text).includes(want),
  );
  const hit = matches[Math.min(occurrence, Math.max(0, matches.length - 1))];
  return hit ? Math.round(hit.start * fps) : ln.startFrame;
}

export const PREVIEW_VOICE: string | null = null;
