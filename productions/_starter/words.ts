import type { Word } from '../../engine';
import raw from './voice/words.json';

/** Jam utama produksi. Diisi voice-director, dibaca semua agent lain. */
export const WORDS: Word[] = raw;

/**
 * Berkas suara untuk PRATINJAU di studio saja (null = tanpa suara).
 * Letakkan voice.wav di public/<slug>/voice.wav lalu isi, misalnya: 'starter/voice.wav'.
 * Render akhir memakai mix.wav lewat `npm run mux`, bukan track ini.
 */
export const PREVIEW_VOICE: string | null = null;
