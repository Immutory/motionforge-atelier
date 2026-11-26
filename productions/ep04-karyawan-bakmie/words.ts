import type { Word } from '../../engine';
import raw from './voice/words.json';
import timeline from './voice/timeline.json';
import rms from './voice/rms.json';

/** Jam utama produksi EP04 "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!" (milik voice-director). */
export const WORDS: Word[] = raw;

export type VoiceSpeaker = 'bangUtoh' | 'tio' | 'pakUjang' | 'mbakYuni' | 'oyen';

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

export const EP04_FRAMES: number = timeline.totalFrames;
export const EP04_LOOP_CUT_FRAME: number = timeline.loopCutFrame;

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

export const wordsOf = (speaker: VoiceSpeaker): Word[] => WORDS.filter((w) => w.speaker === speaker);

export const lineById = (id: string): VoiceLine => {
  const l = VOICE_LINES.find((x) => x.id === id);
  if (!l) throw new Error(`Baris suara ${id} tidak ada di EP04`);
  return l;
};

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

export const PREVIEW_VOICE: string | null = null;
