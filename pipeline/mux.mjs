// Gabung video bisu + mix audio (standar studio: -16.0 LUFS, TP <= -1.5 dBTP).
// node pipeline/mux.mjs <slug> [--lufs -16] [--loudnorm | --no-loudnorm]
// Bila mix.wav sudah di-master sound/mix.py dalam band aman (-17..-13 LUFS, TP <= -1.5 dBTP),
// mux memakai passthrough (`apad`) agar tidak terjadi double loudness normalization sekaligus menyisakan headroom AAC.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, requireFiniteNumber } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { booleans: ['loudnorm', 'no-loudnorm'] });
const slug = args._[0];
if (!slug) {
  console.error('Pakai: npm run mux -- <slug> [--lufs -16] [--loudnorm | --no-loudnorm]');
  process.exit(1);
}
const hasExplicitLufs = args.lufs !== undefined;
const lufsNum = requireFiniteNumber(args.lufs, -16, 'lufs', { min: -70, max: -5 });
const lufs = String(lufsNum);
const dir = path.join(ROOT, 'out', slug);
const video = path.join(dir, 'video_silent.mp4');
const audio = path.join(dir, 'mix.wav');
const final = path.join(dir, `${slug}_final.mp4`);

if (!existsSync(video)) {
  console.error(`[mux] File video tidak ditemukan: ${video}`);
  process.exit(1);
}
if (!existsSync(audio)) {
  console.error(`[mux] File audio tidak ditemukan: ${audio}`);
  process.exit(1);
}

function probeLoudness(wavPath) {
  const res = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', wavPath, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (res.error || res.status !== 0) {
    return { ok: false, lufs: null, peak: null };
  }
  const stderr = res.stderr || '';
  if (!stderr.includes('Summary:')) {
    return { ok: false, lufs: null, peak: null };
  }
  const summary = stderr.split('Summary:').pop() || '';
  const iMatch = summary.match(/I:\s+(-?[\d.]+)\s+LUFS/);
  const pMatch = summary.match(/Peak:\s+(-?[\d.]+)\s+dBFS/);
  return {
    ok: Boolean(iMatch),
    lufs: iMatch ? Number(iMatch[1]) : null,
    peak: pMatch ? Number(pMatch[1]) : null,
  };
}

if (args.loudnorm && args['no-loudnorm']) {
  console.error('[mux] Flag --loudnorm dan --no-loudnorm tidak boleh dipakai bersamaan.');
  process.exit(1);
}
let useLoudnorm = Boolean(args.loudnorm || hasExplicitLufs);
if (args['no-loudnorm']) {
  useLoudnorm = false;
} else if (!useLoudnorm) {
  const measured = probeLoudness(audio);
  const inBand =
    measured.ok &&
    measured.lufs !== null &&
    measured.lufs >= -17.0 &&
    measured.lufs <= -13.0 &&
    measured.peak !== null &&
    measured.peak <= -1.5;
  if (inBand) {
    console.log(
      `[mux] mix.wav sudah ter-master (${measured.lufs.toFixed(1)} LUFS, peak ${measured.peak?.toFixed(1) ?? '?'} dBTP) -> passthrough tanpa double loudnorm.`,
    );
  } else {
    console.log(
      `[mux] mix.wav di luar band master (${measured.lufs ?? '?'} LUFS, peak ${measured.peak ?? '?'} dBTP) -> aktifkan loudnorm target ${lufs} LUFS / -1.5 dBTP.`,
    );
    useLoudnorm = true;
  }
}

const af = useLoudnorm ? `loudnorm=I=${lufs}:TP=-1.5:LRA=11,apad` : 'apad';

// apad + -shortest: audio yang lebih pendek diberi hening, yang lebih panjang dipotong di akhir video.
// Remotion menulis track audio kosong, jadi ambil video dari input 0 dan audio dari input 1.
const r = spawnSync(
  'ffmpeg',
  [
    '-y', '-i', video, '-i', audio,
    '-map', '0:v:0', '-map', '1:a:0',
    '-af', af,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', final,
  ],
  { stdio: 'inherit' },
);
if (r.error) {
  console.error(`[mux] Gagal menjalankan ffmpeg: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
