import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NamedBox } from '../core/spatial';
import type { SetPresetId } from './index';
import type { SetBoxesManifest } from './boxes';

/**
 * Loader bersama sidecar `public/sets/<setId>.boxes.json` untuk skrip Node & tes spasial Fase 3.5.
 * Menggantikan duplikasi parser biner GLB di berbagai file tes.
 */
export function loadSetBoxes(setId: SetPresetId, rootDir = process.cwd()): NamedBox[] {
  const manifestPath = join(rootDir, 'public', 'sets', `${setId}.boxes.json`);
  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as SetBoxesManifest;
  return parsed.boxes;
}
