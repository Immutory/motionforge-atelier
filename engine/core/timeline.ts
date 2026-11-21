export type Word = { text: string; start: number; end: number }; // detik
export type Shot = {
  id: string;
  from: number; // frame awal (inklusif)
  to: number;   // frame akhir (eksklusif)
  light: string;
  note?: string;
};

export const secToFrame = (sec: number, fps: number) => Math.round(sec * fps);

/**
 * Frame tempat sebuah reaksi visual harus mendarat.
 * Aturan studio: reaksi muncul 0-3 frame SEBELUM kata yang memicunya.
 */
export const reactionFrame = (words: Word[], index: number, fps: number, lead = 2) =>
  Math.max(0, secToFrame(words[index].start, fps) - lead);

export const shotAt = (shots: Shot[], frame: number): Shot =>
  shots.find((s) => frame >= s.from && frame < s.to) ?? shots[shots.length - 1];

/** Total durasi dari kata terakhir ditambah napas penutup. */
export const durationFromWords = (words: Word[], fps: number, tailSec = 1.2) =>
  words.length === 0 ? 0 : secToFrame(words[words.length - 1].end + tailSec, fps);
