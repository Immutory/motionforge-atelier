// Fase look-dev: node pipeline/stills.mjs <slug> --frames 0,100,180 --scale 0.5
import { renderStill } from '@remotion/renderer';
import path from 'node:path';
import { CHROMIUM, outDir, parseArgs, prepare } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const slug = args._[0];
if (!slug) { console.error('Pakai: npm run still -- <slug> --frames 0,100 [--scale 0.5]'); process.exit(1); }
const frames = String(args.frames ?? '0').split(',').map(Number);
const scale = Number(args.scale ?? 0.5);
const usePng = Boolean(args.png);

const { serveUrl, composition } = await prepare(slug);
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
