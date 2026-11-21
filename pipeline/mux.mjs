// Gabung video bisu + mix audio, normalisasi loudness. node pipeline/mux.mjs <slug> [--lufs -14]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug) { console.error('Pakai: npm run mux -- <slug> [--lufs -14]'); process.exit(1); }
const lufs = String(args.lufs ?? -14);
const dir = path.join(ROOT, 'out', slug);
const video = path.join(dir, 'video_silent.mp4');
const audio = path.join(dir, 'mix.wav');
const final = path.join(dir, `${slug}_final.mp4`);

// apad + -shortest: audio yang lebih pendek diberi hening, yang lebih panjang dipotong di akhir video.
// Remotion menulis track audio kosong, jadi ambil video dari input 0 dan audio dari input 1.
const r = spawnSync('ffmpeg', [
  '-y', '-i', video, '-i', audio,
  '-map', '0:v:0', '-map', '1:a:0',
  '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11,apad`,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', final,
], { stdio: 'inherit' });
process.exit(r.status ?? 1);
