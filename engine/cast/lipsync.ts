import type { Word } from '../core/timeline';

export type MouthShape = 'closed' | 'small' | 'mid' | 'wide' | 'o' | 'smile' | 'frown';

export type TalkSample = {
  /** 0 = mulut tertutup, 1 = terbuka penuh. */
  open: number;
  shape: MouthShape;
};

const CLOSED: TalkSample = { open: 0, shape: 'closed' };

function extractVowels(text: string): MouthShape[] {
  const clean = text.toLowerCase().replace(/[^a-z]/g, '');
  const out: MouthShape[] = [];
  let prevVowel = false;
  for (const ch of clean) {
    if ('aiueo'.includes(ch)) {
      if (!prevVowel) {
        if (ch === 'o' || ch === 'u') out.push('o');
        else if (ch === 'a') out.push('wide');
        else out.push('mid');
      }
      prevVowel = true;
    } else {
      prevVowel = false;
    }
  }
  return out.length > 0 ? out : ['mid'];
}

/**
 * Auto lip-sync on-ones langsung dari `words.json` (mendukung suku kata bahasa Indonesia & Inggris).
 * Mulut mendahului suara `leadFrames` (default 1 frame, sesuai references/reports/motion.md).
 */
export function talkAt(words: Word[], frame: number, fps = 30, leadFrames = 1): TalkSample {
  if (words.length === 0) return CLOSED;
  const t = (frame + leadFrames) / fps;
  const w = words.find((item) => t >= item.start && t <= item.end);
  if (!w) return CLOSED;

  const dur = Math.max(0.06, w.end - w.start);
  const progress = Math.max(0, Math.min(1, (t - w.start) / dur));
  const vowels = extractVowels(w.text);

  // Setiap vokal membentuk satu pulsa buka-tutup suku kata.
  const sylPos = progress * vowels.length;
  const idx = Math.min(vowels.length - 1, Math.floor(sylPos));
  const frac = sylPos - idx;
  const env = Math.sin(Math.PI * frac); // 0 di tepi suku kata, 1 di puncak vokal
  const edgeFade = Math.min(1, Math.min(progress, 1 - progress) / 0.08);
  const peak = vowels[idx] === 'wide' ? 0.95 : vowels[idx] === 'o' ? 0.8 : 0.72;
  const open = Number((env * peak * edgeFade).toFixed(3));

  if (open < 0.16) return { open: 0, shape: 'closed' };
  if (open < 0.34) return { open, shape: 'small' };
  return { open, shape: vowels[idx] };
}

/** Gelombang bicara cepat untuk preview tanpa words.json. */
export function talkWave(frame: number, active = true, seed = 1): TalkSample {
  if (!active) return CLOSED;
  const v = Math.sin(frame * 0.62 + seed * 1.7) * 0.5 + 0.5;
  const v2 = Math.sin(frame * 0.27 + seed) * 0.5 + 0.5;
  if (v < 0.22) return CLOSED;
  if (v < 0.42) return { open: v, shape: 'small' };
  const shape: MouthShape = v2 > 0.68 ? 'o' : v > 0.76 ? 'wide' : 'mid';
  return { open: Number((0.35 + v * 0.6).toFixed(3)), shape };
}
