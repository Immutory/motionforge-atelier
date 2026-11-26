// Fase motion: potongan pendek per beat. node pipeline/preview.mjs <slug> --ranges 0-90,90-160
import { renderMedia } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare, requireFiniteNumber } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug || !args.ranges || args.ranges === true) {
  console.error('Pakai: npm run preview -- <slug> --ranges 0-90,90-160 [--scale 0.5]');
  process.exit(1);
}
const scale = requireFiniteNumber(args.scale, 0.5, 'scale', { min: 0.05, max: 4 });
const ranges = String(args.ranges)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((spec) => {
    const parts = spec.split('-');
    if (parts.length !== 2) {
      console.error(`Rentang tidak valid: "${spec}" (pakai format from-to, mis. 0-90).`);
      process.exit(1);
    }
    const [from, to] = parts.map(Number);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from) {
      console.error(`Rentang frame tidak valid: "${spec}" (harus bilangan bulat 0 <= from < to).`);
      process.exit(1);
    }
    return [from, to];
  });
if (ranges.length === 0) {
  console.error('Minimal 1 rentang wajib diisi pada --ranges.');
  process.exit(1);
}

const { serveUrl, composition } = await prepare(slug);
for (const [from, to] of ranges) {
  if (from >= composition.durationInFrames) {
    console.error(`Rentang ${from}-${to} di luar durasi komposisi ${slug} (${composition.durationInFrames} frame).`);
    process.exit(1);
  }
}
const dir = outDir(slug, 'previews');
for (const [from, to] of ranges) {
  const clampedTo = Math.min(composition.durationInFrames, to);
  const outputLocation = path.join(dir, `beat_${from}-${clampedTo}.mp4`);
  await renderMedia({
    chromiumOptions: CHROMIUM,
    serveUrl,
    composition,
    codec: 'h264',
    outputLocation,
    frameRange: [from, Math.max(from, clampedTo - 1)],
    scale,
    crf: 20,
  });
  console.log('preview ->', outputLocation);
}
