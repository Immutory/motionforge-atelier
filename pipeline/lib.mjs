import { bundle } from '@remotion/bundler';
import { selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Config.setChromiumOpenGlRenderer di remotion.config.ts hanya berlaku untuk CLI. API Node butuh opsi ini. */
export const CHROMIUM = { gl: 'angle' };

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bundle Remotion menyalin folder public/ ke temp. Arahkan temp ke disk besar lewat REMOTION_TMP. */
export function useBigTemp() {
  const dir = process.env.REMOTION_TMP || path.join(tmpdir(), 'motionforge-tmp');
  mkdirSync(dir, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.TMPDIR = dir;
  return dir;
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

export async function prepare(slug) {
  useBigTemp();
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'studio/index.ts') });
  const composition = await selectComposition({ serveUrl, id: slug, chromiumOptions: CHROMIUM });
  return { serveUrl, composition };
}

export const outDir = (slug, ...parts) => {
  const d = path.join(ROOT, 'out', slug, ...parts);
  mkdirSync(d, { recursive: true });
  return d;
};
