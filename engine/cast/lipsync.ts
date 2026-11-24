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

/**
 * Momen non-verbal rekaman untuk `talkGated` (subset dari `NonVerbal` produksi).
 * `kind`: breath | sigh | sniff | chuckle | laugh | pause (lainnya diperlakukan seperti napas).
 * `voiced === false` berarti jeda hening.
 */
export type TalkEvent = { startFrame: number; endFrame: number; kind: string; voiced?: boolean };

export type TalkGateOptions = {
  /** Amplitudo RMS rekaman pembicara per frame (0..1, 1 = puncak bicara wajar). */
  rms: (frame: number) => number;
  /** Momen non-verbal milik pembicara yang sama. */
  events?: TalkEvent[];
  fps?: number;
  /** Mulut mendahului suara (default 1 frame). */
  leadFrames?: number;
  /** RMS di bawah ambang ini = hening, mulut tertutup rapat (default 0,04). */
  silence?: number;
};

const round3 = (v: number) => Number(v.toFixed(3));

function sampleFromOpen(open: number, shape: MouthShape): TalkSample {
  if (open < 0.16) return CLOSED;
  if (open < 0.34) return { open: round3(open), shape: 'small' };
  return { open: round3(open), shape };
}

/**
 * Lip-sync RMS-gated: viseme kata dari `talkAt` (lead 1 frame) dikalikan amplitudo rekaman, ditambah akting mulut
 * untuk momen non-verbal:
 * - `pause` / `voiced:false`  -> tertutup rapat (juga di tengah kata).
 * - `sigh` / `breath`         -> terbuka kecil (`small`) mengikuti napas, memudar 3 frame di tepi.
 * - `sniff`                   -> tertutup (menghirup lewat hidung).
 * - `chuckle` / `laugh`       -> bergetar alami (pulsa 5 / 4 frame) di antara `small` dan `mid` / `wide`.
 * - di luar kata & momen, atau RMS < `silence` saat kata -> tertutup.
 */
export function talkGated(words: Word[], frame: number, opts: TalkGateOptions): TalkSample {
  const fps = opts.fps ?? 30;
  const lead = opts.leadFrames ?? 1;
  const silence = opts.silence ?? 0.04;
  const af = frame + lead;
  const ev = opts.events?.find((e) => af >= e.startFrame && af < e.endFrame);
  if (ev && (ev.kind === 'pause' || ev.voiced === false)) return CLOSED;

  const r = Math.max(0, opts.rms(af) || 0);
  const base = talkAt(words, frame, fps, lead);
  if (base.open > 0) {
    if (r < silence) return CLOSED;
    const gain = 0.62 + 0.38 * Math.min(1, r / 0.55);
    return sampleFromOpen(Math.max(0.17, base.open * gain), base.shape);
  }
  if (!ev) return CLOSED;

  const k = af - ev.startFrame;
  const edge = Math.min(1, (k + 1) / 3, (ev.endFrame - af) / 3);
  if (ev.kind === 'sniff') return CLOSED;
  if (ev.kind === 'chuckle' || ev.kind === 'laugh') {
    const laugh = ev.kind === 'laugh';
    const period = laugh ? 4 : 5;
    const pulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * k) / period);
    const drive = 0.55 + 0.45 * Math.min(1, r / 0.4);
    const open = (laugh ? 0.3 : 0.2) + (laugh ? 0.5 : 0.3) * pulse * drive;
    const shape: MouthShape = pulse > 0.5 ? (laugh ? 'wide' : 'mid') : 'small';
    const o = Math.max(0.17, open * Math.max(0.6, edge));
    return { open: round3(o), shape: o < 0.34 ? 'small' : shape };
  }
  // sigh / breath / lainnya: celah kecil bernapas
  const open = (0.2 + 0.22 * Math.min(1, r / 0.3)) * edge;
  return open < 0.16 ? CLOSED : { open: round3(open), shape: 'small' };
}
