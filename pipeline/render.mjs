// Fase master: node pipeline/render.mjs <slug> [--scale 1.3333] [--crf 16]
import { renderMedia } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug) { console.error('Pakai: npm run render -- <slug> [--scale 1.3333] [--crf 16]'); process.exit(1); }

const { serveUrl, composition } = await prepare(slug);
const outputLocation = path.join(outDir(slug), 'video_silent.mp4');
await renderMedia({
  chromiumOptions: CHROMIUM,
  serveUrl, composition, codec: 'h264', outputLocation,
  scale: Number(args.scale ?? 1), crf: Number(args.crf ?? 16),
  onProgress: ({ progress }) => process.stdout.write(`\rrender ${(progress * 100).toFixed(1)}%`),
});
console.log('\nvideo ->', outputLocation);
