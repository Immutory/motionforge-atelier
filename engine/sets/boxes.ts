import type { NamedBox } from '../core/spatial';

export type SetBoxesManifest = {
  set: string;
  count: number;
  boxes: NamedBox[];
};

const stripNodePunct = (s: string) => s.replace(/[\[\].:/]/g, '');

/**
 * Filter manifest AABB set berdasarkan `hideNames` (mendukung pencocokan prefix nama Blender mentah
 * maupun nama tersanitasi tanpa tanda baca seperti `GlbSet.tsx:shouldHideGlbNode`) dan batas wilayah opsional.
 * Browser-safe (tanpa `node:fs`); untuk membaca file di Node/tes, gunakan `loadSetBoxes` dari `engine/sets/boxesNode.ts`.
 */
export function filterSetBoxes(
  boxes: readonly NamedBox[],
  opts?: {
    hideNames?: readonly string[];
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
  },
): NamedBox[] {
  const hide = (opts?.hideNames ?? []).map((h) => h.trim()).filter(Boolean);
  return boxes.filter((b) => {
    const cleanName = stripNodePunct(b.name);
    if (
      hide.some((h) => {
        const ch = stripNodePunct(h);
        return b.name.startsWith(h) || cleanName.startsWith(ch);
      })
    ) {
      return false;
    }
    if (opts?.minX !== undefined && b.max[0] <= opts.minX) return false;
    if (opts?.maxX !== undefined && b.min[0] >= opts.maxX) return false;
    if (opts?.minY !== undefined && b.max[1] <= opts.minY) return false;
    if (opts?.maxY !== undefined && b.min[1] >= opts.maxY) return false;
    if (opts?.minZ !== undefined && b.max[2] <= opts.minZ) return false;
    if (opts?.maxZ !== undefined && b.min[2] >= opts.maxZ) return false;
    return true;
  });
}

/** Gabungkan beberapa box bernama identik menjadi satu AABB menyeluruh. */
export function findSetBox(boxes: readonly NamedBox[], name: string): NamedBox | undefined {
  const hits = boxes.filter((b) => b.name === name);
  if (hits.length === 0) return undefined;
  return hits.reduce((a, b) => ({
    name,
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
    ...(a.transparent && b.transparent ? { transparent: true } : {}),
  }));
}
