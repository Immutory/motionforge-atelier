// Fase master: node pipeline/render.mjs <slug> [--scale 1] [--crf 16] [--concurrency 3] [--timeout 120000]
import { renderMedia } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare, requireFiniteNumber } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug) {
  console.error('Pakai: npm run render -- <slug> [--scale 1] [--crf 16] [--concurrency 3] [--timeout 120000]');
  process.exit(1);
}
const scale = requireFiniteNumber(args.scale, 1, 'scale', { min: 0.1, max: 4 });
const crf = requireFiniteNumber(args.crf, 16, 'crf', { min: 0, max: 51 });
const concurrency = args.concurrency !== undefined
  ? Math.round(requireFiniteNumber(args.concurrency, 3, 'concurrency', { min: 1, max: 16 }))
  : undefined;
const timeoutInMilliseconds = Math.round(requireFiniteNumber(args.timeout, 120000, 'timeout', { min: 10000, max: 600000 }));

const { serveUrl, composition } = await prepare(slug);
const outputLocation = path.join(outDir(slug), 'video_silent.mp4');
await renderMedia({
  chromiumOptions: CHROMIUM,
  serveUrl,
  composition,
  codec: 'h264',
  imageFormat: 'jpeg',
  jpegQuality: 92,
  outputLocation,
  scale,
  crf,
  ...(concurrency !== undefined ? { concurrency } : {}),
  timeoutInMilliseconds,
  onProgress: ({ progress }) => process.stdout.write(`\rrender ${(progress * 100).toFixed(1)}%`),
});
console.log('\nvideo ->', outputLocation);
