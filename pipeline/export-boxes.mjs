/**
 * Ekspor sidecar AABB manifest `public/sets/{warkop,kost,kampus,kampung}.boxes.json`
 * dari binary `.glb` (transform hierarki penuh T*R*S) agar tes spasial & audit v3.0
 * memakai satu sumber data bersih tanpa duplikasi parser biner GLB di 4 file berbeda.
 *
 * Jalankan: node pipeline/export-boxes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(THIS_FILE), '..');
const SETS = ['warkop', 'kost', 'kampus', 'kampung'];

function nodeMatrix(n) {
  if (n.matrix) return n.matrix;
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  }
  return o;
}

const r4 = (v) => Math.round(v * 10000) / 10000;

export function extractGlbBoxes(glbPath) {
  const buf = readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const nodes = gltf.nodes ?? [];
  const parent = new Map();
  nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)));

  const world = (i) => {
    let m = nodeMatrix(nodes[i]);
    let p = parent.get(i);
    while (p !== undefined) {
      m = mul(nodeMatrix(nodes[p]), m);
      p = parent.get(p);
    }
    return m;
  };

  const materials = gltf.materials ?? [];
  const isPrimTransparent = (prim) => {
    if (prim.material === undefined) return false;
    const mat = materials[prim.material];
    if (!mat) return false;
    const alpha = mat.pbrMetallicRoughness?.baseColorFactor?.[3];
    return mat.alphaMode === 'BLEND' || (typeof alpha === 'number' && alpha < 0.95);
  };

  const boxes = [];
  nodes.forEach((n, i) => {
    if (n.mesh === undefined || !n.name) return;
    const m = world(i);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let hasPos = false;
    const prims = gltf.meshes[n.mesh].primitives;
    let allTransparent = prims.length > 0;
    for (const prim of prims) {
      if (!isPrimTransparent(prim)) allTransparent = false;
      const acc = gltf.accessors[prim.attributes.POSITION];
      if (!acc?.min || !acc?.max) continue;
      hasPos = true;
      for (const cx of [acc.min[0], acc.max[0]]) {
        for (const cy of [acc.min[1], acc.max[1]]) {
          for (const cz of [acc.min[2], acc.max[2]]) {
            const p0 = m[0] * cx + m[4] * cy + m[8] * cz + m[12];
            const p1 = m[1] * cx + m[5] * cy + m[9] * cz + m[13];
            const p2 = m[2] * cx + m[6] * cy + m[10] * cz + m[14];
            if (p0 < min[0]) min[0] = p0;
            if (p1 < min[1]) min[1] = p1;
            if (p2 < min[2]) min[2] = p2;
            if (p0 > max[0]) max[0] = p0;
            if (p1 > max[1]) max[1] = p1;
            if (p2 > max[2]) max[2] = p2;
          }
        }
      }
    }
    if (hasPos) {
      boxes.push({
        name: n.name,
        min: [r4(min[0]), r4(min[1]), r4(min[2])],
        max: [r4(max[0]), r4(max[1]), r4(max[2])],
        ...(allTransparent ? { transparent: true } : {}),
      });
    }
  });
  return boxes;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === THIS_FILE;
if (isCli) {
  const setsDir = join(ROOT, 'public', 'sets');
  for (const id of SETS) {
    const glbPath = join(setsDir, `${id}.glb`);
    const boxes = extractGlbBoxes(glbPath);
    const outPath = join(setsDir, `${id}.boxes.json`);
    writeFileSync(outPath, JSON.stringify({ set: id, count: boxes.length, boxes }, null, 2) + '\n', 'utf8');
    const tCount = boxes.filter((b) => b.transparent).length;
    console.log(`BOXES ${id}.boxes.json (${boxes.length} mesh, ${tCount} transparan)`);
  }
}
