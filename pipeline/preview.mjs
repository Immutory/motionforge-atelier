// Fase motion: potongan pendek per beat. node pipeline/preview.mjs <slug> --ranges 0-90,90-160
import { renderMedia } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug || !args.ranges) { console.error('Pakai: npm run preview -- <slug> --ranges 0-90,90-160 [--scale 0.5]'); process.exit(1); }
const scale = Number(args.scale ?? 0.5);

const { serveUrl, composition } = await prepare(slug);
const dir = outDir(slug, 'previews');
for (const r of String(args.ranges).split(',')) {
  const [from, to] = r.split('-').map(Number);
  const outputLocation = path.join(dir, `beat_${from}-${to}.mp4`);
  await renderMedia({ chromiumOptions: CHROMIUM, serveUrl, composition, codec: 'h264', outputLocation, frameRange: [from, Math.max(from, to - 1)], scale, crf: 20 });
  console.log('preview ->', outputLocation);
}
