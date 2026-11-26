// Fase look-dev: node pipeline/stills.mjs <slug> --frames 0,100,180 --scale 0.5 [--png]
import { renderStill } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare, requireFiniteNumber } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { booleans: ['png'] });
const slug = args._[0];
if (!slug) {
  console.error('Pakai: npm run still -- <slug> --frames 0,100 [--scale 0.5] [--png]');
  process.exit(1);
}
if (args.frames === true) {
  console.error('Flag --frames membutuhkan daftar frame (mis. --frames 0,100,180).');
  process.exit(1);
}
const rawFrames = String(args.frames ?? '0')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const frames = rawFrames.map((s) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`Frame tidak valid: "${s}"`);
    process.exit(1);
  }
  return n;
});
if (frames.length === 0) {
  console.error('Minimal 1 frame wajib diisi pada --frames.');
  process.exit(1);
}
const scale = requireFiniteNumber(args.scale, 0.5, 'scale', { min: 0.05, max: 4 });
const usePng = Boolean(args.png);

const { serveUrl, composition } = await prepare(slug);
const maxFrame = composition.durationInFrames - 1;
for (const frame of frames) {
  if (frame > maxFrame) {
    console.error(`Frame ${frame} melampaui durasi komposisi ${slug} (0..${maxFrame}).`);
    process.exit(1);
  }
}
const dir = outDir(slug, 'stills');
for (const frame of frames) {
  const ext = usePng ? 'png' : 'jpg';
  const output = path.join(dir, `f${String(frame).padStart(4, '0')}.${ext}`);
  await renderStill({
    chromiumOptions: CHROMIUM,
    serveUrl,
    composition,
    frame,
    output,
    scale,
    imageFormat: usePng ? 'png' : 'jpeg',
    ...(usePng ? {} : { jpegQuality: 95 }),
  });
  console.log('still ->', output);
}
