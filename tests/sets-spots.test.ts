import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PropertyBinding } from 'three';
import {
  KAMPUNG_SPOTS,
  KAMPUNG_SPOT_META,
  KAMPUS_SPOTS,
  KOST_SPOTS,
  KOST_SPOT_META,
  WARKOP_LAMP_NODES,
  WARKOP_SPOTS,
} from '../engine/sets';

/**
 * Uji spot interior terhadap GLB hasil ekspor (bukan angka salinan): kotak AABB per primitive dibaca dari
 * accessor POSITION min/max + transform node (hierarki GLB set datar). AABB selalu ≥ geometri asli, jadi
 * jarak yang lolos di sini juga lolos pada raycast Blender (lihat laporan set-designer EP02).
 */
type V3 = readonly [number, number, number];
type Box = { name: string; min: [number, number, number]; max: [number, number, number] };

type GltfNode = { name?: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] };
type Gltf = {
  nodes: GltfNode[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};

function rotate(q: number[], v: number[]): number[] {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

function loadBoxes(file: string): Box[] {
  const buf = readFileSync(join(process.cwd(), 'public', 'sets', file));
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as Gltf;
  const out: Box[] = [];
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const t = node.translation ?? [0, 0, 0];
    const r = node.rotation ?? [0, 0, 0, 1];
    const s = node.scale ?? [1, 1, 1];
    for (const prim of gltf.meshes[node.mesh].primitives) {
      const acc = gltf.accessors[prim.attributes.POSITION];
      if (!acc.min || !acc.max) continue;
      const min: [number, number, number] = [Infinity, Infinity, Infinity];
      const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < 8; i++) {
        const c = [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]];
        const p = rotate(r, [c[0] * s[0], c[1] * s[1], c[2] * s[2]]);
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], p[k] + t[k]);
          max[k] = Math.max(max[k], p[k] + t[k]);
        }
      }
      out.push({ name: node.name ?? '', min, max });
    }
  }
  return out;
}

/** Jarak horizontal (XZ) titik ke kotak; 0 bila di dalam tapak. */
const distXZ = (p: V3, b: Box) =>
  Math.hypot(Math.max(b.min[0] - p[0], 0, p[0] - b.max[0]), Math.max(b.min[2] - p[2], 0, p[2] - b.max[2]));
const overlapsY = (b: Box, y0: number, y1: number) => b.max[1] > y0 && b.min[1] < y1;
const one = (boxes: Box[], name: string) => {
  const hit = boxes.filter((b) => b.name === name);
  assert.ok(hit.length > 0, `mesh ${name} tidak ada di GLB`);
  return hit.reduce((a, b) => ({
    name,
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  }));
};

/** Jarak minimum badan (segmen vertikal y0..y1 di XZ spot) ke kotak mana pun, kecuali nama yang dikecualikan. */
function clearance(boxes: Box[], p: V3, y0: number, y1: number, exclude: (n: string) => boolean) {
  let best = { d: Infinity, name: '' };
  for (const b of boxes) {
    if (exclude(b.name) || !overlapsY(b, y0, y1)) continue;
    const d = distXZ(p, b);
    if (d < best.d) best = { d, name: b.name };
  }
  return best;
}

const WK = loadBoxes('warkop.glb');
const KP = loadBoxes('kampus.glb');
const BODY = 0.25;
const CAT_GAP = 0.15;

test('spot Warkop berdiri: telapak di lantai dan badan ≥ 0,25 m dari geometri', () => {
  const floor = one(WK, 'WK_Floor');
  for (const key of ['center', 'counterKeeper'] as const) {
    const p = WARKOP_SPOTS[key];
    assert.ok(Math.abs(p[1] - floor.max[1]) <= 0.06, `${key} tidak menapak WK_Floor (y=${p[1]})`);
    const c = clearance(WK, p, 0.05, 1.8, (n) => n === 'WK_Floor' || (key === 'counterKeeper' && n === 'WK_CounterPallet'));
    assert.ok(c.d >= BODY, `${key} hanya ${c.d.toFixed(3)} m dari ${c.name}`);
  }
});

test('spot Warkop duduk: di atas dudukan, badan ≥ 0,25 m dari meja dan prop', () => {
  const seats = { leftTable: 'WK_BenchL', rightTableSeat: 'WK_StoolRed2' } as const;
  for (const [key, seat] of Object.entries(seats) as [keyof typeof seats, string][]) {
    const p = WARKOP_SPOTS[key];
    assert.equal(p[1], 0, `${key}: y spot duduk = telapak di lantai`);
    const top = one(WK, `${seat}${seat === 'WK_BenchL' ? '_Top' : '_Seat'}`);
    assert.ok(distXZ(p, top) === 0, `${key} tidak berada di atas ${top.name}`);
    const inset = Math.min(p[0] - top.min[0], top.max[0] - p[0], p[2] - top.min[2], top.max[2] - p[2]);
    assert.ok(inset >= 0.05, `${key} terlalu di tepi ${top.name} (${inset.toFixed(3)} m)`);
    // Badan duduk mulai dari dudukan (≈0,45 m) sampai kepala; kaki dudukan sendiri dikecualikan.
    const c = clearance(WK, p, top.max[1] + 0.02, 1.5, (n) => n.startsWith(seat) || n === 'WK_Floor');
    assert.ok(c.d >= BODY, `${key} hanya ${c.d.toFixed(3)} m dari ${c.name}`);
  }
});

test('laptopTable dan catTable tepat di permukaan meja kiri, tidak menabrak prop meja', () => {
  const table = one(WK, 'WK_TableL_Top');
  const props = WK.filter(
    (b) => b.name !== 'WK_TableL_Top' && b.min[1] >= table.max[1] - 0.01 && b.min[1] < table.max[1] + 0.3 &&
      b.max[0] > table.min[0] && b.min[0] < table.max[0] && b.max[2] > table.min[2] && b.min[2] < table.max[2],
  );
  assert.ok(props.some((b) => b.name === 'WK_TableCup1'), 'prop meja (gelas) harus terdeteksi');
  for (const key of ['laptopTable', 'catTable'] as const) {
    const p = WARKOP_SPOTS[key];
    assert.ok(Math.abs(p[1] - table.max[1]) <= 0.006, `${key} y=${p[1]} bukan permukaan meja (${table.max[1].toFixed(3)})`);
    const inset = Math.min(p[0] - table.min[0], table.max[0] - p[0], p[2] - table.min[2], table.max[2] - p[2]);
    assert.ok(inset >= 0.1, `${key} terlalu dekat tepi meja (${inset.toFixed(3)} m)`);
  }
  // Tapak laptop 0,32 × 0,22 m tidak menembus prop lain.
  const [lx, , lz] = WARKOP_SPOTS.laptopTable;
  const laptop: Box = { name: 'laptop', min: [lx - 0.16, table.max[1], lz - 0.11], max: [lx + 0.16, table.max[1] + 0.25, lz + 0.11] };
  for (const b of props) {
    const sep = Math.max(b.min[0] - laptop.max[0], laptop.min[0] - b.max[0], b.min[2] - laptop.max[2], laptop.min[2] - b.max[2]);
    assert.ok(sep >= 0, `tapak laptop menembus ${b.name}`);
  }
  assert.ok(
    lx >= table.min[0] + 0.16 && lx <= table.max[0] - 0.16 && lz + 0.11 <= table.max[2],
    'tapak laptop keluar dari meja',
  );
  // Kucing ≥ 0,15 m dari prop meja dan dari tapak laptop.
  const cat = WARKOP_SPOTS.catTable;
  for (const b of [...props, laptop]) {
    assert.ok(distXZ(cat, b) >= CAT_GAP, `catTable hanya ${distXZ(cat, b).toFixed(3)} m dari ${b.name}`);
  }
});

test('spot Warkop lama yang dipakai charlab tidak berubah diam-diam', () => {
  assert.deepEqual([...WARKOP_SPOTS.center], [-0.08, 0, -0.35]);
  assert.deepEqual([...WARKOP_SPOTS.behindCounter], [0.58, 0, -2.08]);
  assert.deepEqual([...WARKOP_SPOTS.rightTable], [1.05, 0, 0.25]);
});

test('catDesk tepat di permukaan meja dosen Lab FIK, ≥ 0,15 m dari kertas dan tepi', () => {
  const parts = KP.filter((b) => b.name === 'KP2_LectDesk');
  const desk = one(KP, 'KP2_LectDesk');
  // Kertas = primitive yang duduk di atas daun meja; alasnya = tinggi permukaan meja.
  const paper = parts.find((b) => b.min[1] > 0.7);
  assert.ok(paper, 'kertas di meja dosen tidak ditemukan');
  const p = KAMPUS_SPOTS.catDesk;
  assert.ok(Math.abs(p[1] - paper.min[1]) <= 0.006, `catDesk y=${p[1]} bukan permukaan meja (${paper.min[1].toFixed(3)})`);
  assert.ok(distXZ(p, paper) >= CAT_GAP, `catDesk hanya ${distXZ(p, paper).toFixed(3)} m dari kertas`);
  const inset = Math.min(p[0] - desk.min[0], desk.max[0] - p[0], p[2] - desk.min[2], desk.max[2] - p[2]);
  assert.ok(inset >= CAT_GAP, `catDesk terlalu dekat tepi meja (${inset.toFixed(3)} m)`);
  // Kucing di sebelah dosen: lecturerDesk ≤ 1 m dari kucing, badan ≥ 0,25 m dari meja.
  const s = KAMPUS_SPOTS.lecturerDesk;
  assert.ok(Math.hypot(s[0] - p[0], s[2] - p[2]) <= 1.0, 'lecturerDesk terlalu jauh dari catDesk');
  // Mesh skala ruangan (lantai, cangkang, plafon, kusen) dan KP2_Whiteboard dikecualikan dari uji AABB:
  // primitive chrome papan tulis ikut memuat faset bevel proyektor plafon sehingga AABB-nya melar se-ruangan.
  const c = clearance(KP, s, 0.05, 1.8, (n) =>
    ['KP2_Floor', 'KP2_Shell', 'KP2_Ceiling', 'KP2_Frames', 'KP2_Whiteboard'].includes(n),
  );
  assert.ok(c.d >= BODY, `lecturerDesk hanya ${c.d.toFixed(3)} m dari ${c.name}`);
  const board = KP.filter((b) => b.name === 'KP2_Whiteboard' && b.max[1] < 3.0);
  for (const b of board) assert.ok(distXZ(s, b) >= BODY, `lecturerDesk terlalu dekat papan tulis (${distXZ(s, b).toFixed(3)} m)`);
});

test('node lampu gantung Warkop ditemukan setelah GLTFLoader menyaring nama (ayun bohlam benar-benar terpasang)', () => {
  const buf = readFileSync(join(process.cwd(), 'public', 'sets', 'warkop.glb'));
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as Gltf;
  const loaded = new Set(gltf.nodes.map((n) => PropertyBinding.sanitizeNodeName(n.name ?? '')));
  assert.equal(WARKOP_LAMP_NODES.length, 3);
  for (const parts of WARKOP_LAMP_NODES) {
    for (const raw of parts) {
      assert.ok(loaded.has(raw) || loaded.has(PropertyBinding.sanitizeNodeName(raw)), `${raw} ada di warkop.glb`);
    }
  }
});

test('v2.1 regresi KOST_SPOTS: menapak KS_Floor, di dalam dinding kamar, dan ≥ 0,25 m dari furnitur kost.glb', () => {
  const KS = loadBoxes('kost.glb');
  const floor = one(KS, 'KS_Floor');
  const wallL = one(KS, 'KS_SideWall_L');
  const wallR = one(KS, 'KS_SideWall_R');
  const wallB = one(KS, 'KS_BackWall');
  for (const [key, p] of Object.entries(KOST_SPOTS)) {
    assert.ok(Math.abs(p[1] - floor.max[1]) <= 0.06, `KOST_SPOTS.${key} tidak menapak KS_Floor (y=${p[1]})`);
    assert.ok(p[0] > wallL.max[0] + BODY && p[0] < wallR.min[0] - BODY, `KOST_SPOTS.${key} terlalu dekat dinding samping`);
    assert.ok(p[2] > wallB.max[2] + BODY, `KOST_SPOTS.${key} terlalu dekat dinding belakang`);
    const c = clearance(KS, p, 0.05, 1.8, (n) => ['KS_Floor', 'KS_Rug', 'KS_Ceiling'].includes(n));
    assert.ok(c.d >= BODY, `KOST_SPOTS.${key} hanya ${c.d.toFixed(3)} m dari ${c.name}`);
  }
  assert.equal(KOST_SPOT_META.desk?.seatY, 0.49);
  assert.equal(KOST_SPOT_META.desk?.tableTopY, 0.79);
  assert.equal(KOST_SPOT_META.bedside?.seatY, 0.54);
});

test('v2.1/v3.0 regresi KAMPUNG_SPOT_META.warkopCounter sesuai posisi depan etalase (tanpa ergonomicBaseY konter belakang)', () => {
  assert.deepEqual([...KAMPUNG_SPOTS.warkopCounter], [0.85, 0, 0.35]);
  assert.equal(KAMPUNG_SPOT_META.warkopCounter?.ergonomicBaseY, undefined);
  assert.equal(KAMPUNG_SPOT_META.warkopCounter?.tableTopY, 0.97);
});
