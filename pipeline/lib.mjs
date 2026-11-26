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

/**
 * Parser argumen CLI deterministik:
 * - Mendukung `--key=value` dan `--key value`
 * - Flag yang terdaftar di `opts.booleans` tidak pernah menelan argumen posisional sesudahnya (mis. `--png ep02`)
 */
export function parseArgs(argv, opts = {}) {
  const boolSet = new Set(opts.booleans ?? []);
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      args._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        args[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        if (boolSet.has(key)) {
          args[key] = true;
        } else {
          const next = argv[i + 1];
          if (next === undefined || next.startsWith('--')) {
            args[key] = true;
          } else {
            args[key] = next;
            i++;
          }
        }
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

export function requireFiniteNumber(raw, fallback, label, { min = -Infinity, max = Infinity } = {}) {
  if (raw === undefined) return fallback;
  if (raw === true || raw === '') {
    console.error(`Flag --${label} membutuhkan nilai angka.`);
    process.exit(1);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    console.error(`Nilai --${label} tidak valid: ${raw}`);
    process.exit(1);
  }
  return n;
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
