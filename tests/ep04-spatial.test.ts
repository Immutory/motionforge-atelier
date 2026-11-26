import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkBillboardSweep,
  checkCounterVisibility,
  checkPropOverlap,
  checkSafeFraming,
  checkSightline,
  sampleCamera,
  type CamPose,
  type FramingSubject,
  type NamedBox,
  type Vec3,
} from '../engine';
import { ACTORS, OYEN_HEIGHT, actorPositionAt, oyenPositionAt, poseFor } from '../productions/ep04-karyawan-bakmie/cast';
import {
  COUNTER_TOP_Y,
  EP04_HIDE_NAMES,
  EP04_PROP_BOXES,
  EP04_SPOTS,
} from '../productions/ep04-karyawan-bakmie/set';
import { CAMS, SHOTS, TOP_DOWN_SHOT_IDS, TOTAL_FRAMES } from '../productions/ep04-karyawan-bakmie/shots';

type GNode = { name?: string; mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] };
type M4 = number[];

function nodeMatrix(n: GNode): M4 {
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
const mul = (a: M4, b: M4): M4 => {
  const o: number[] = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};

function loadAreaBoxes(): NamedBox[] {
  const buf = readFileSync(join(process.cwd(), 'public/sets/kampung.glb'));
  const len = buf.readUInt32LE(12);
  const g = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const nodes: GNode[] = g.nodes;
  const parent = new Map<number, number>();
  nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)));
  const world = (i: number): M4 => {
    let m = nodeMatrix(nodes[i]);
    let p = parent.get(i);
    while (p !== undefined) {
      m = mul(nodeMatrix(nodes[p]), m);
      p = parent.get(p);
    }
    return m;
  };
  const out: NamedBox[] = [];
  nodes.forEach((n, i) => {
    if (n.mesh === undefined || !n.name) return;
    const m = world(i);
    const acc = g.accessors[g.meshes[n.mesh].primitives[0].attributes.POSITION];
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const cx of [acc.min[0], acc.max[0]])
      for (const cy of [acc.min[1], acc.max[1]])
        for (const cz of [acc.min[2], acc.max[2]]) {
          const p = [0, 1, 2].map((r) => m[r] * cx + m[4 + r] * cy + m[8 + r] * cz + m[12 + r]);
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], p[k]);
            max[k] = Math.max(max[k], p[k]);
          }
        }
    if (max[0] > -16 && min[0] < -8 && max[2] > 14.5 && min[2] < 20 && max[1] > 0.06) out.push({ name: n.name, min, max });
  });
  return out.filter((b) => !EP04_HIDE_NAMES.some((h) => b.name.startsWith(h)));
}

const AREA = loadAreaBoxes();
const box = (name: string) => {
  const b = AREA.find((x) => x.name === name);
  assert.ok(b, `mesh ${name} ada di kampung.glb`);
  return b!;
};

const LEDGE_ITEMS = /^EP04_(BowlUjang|DeployBowl\d|MandorPlate|VipPlate)$/;
const CART_BODY = /^KG_Grb_BakmieTio_(ServeLedge|Counter|FrontTrimT|FrontPanel|BodyCore|FrontTrimB|LowerPanel)$/;
const SUPPORTS: [RegExp, RegExp][] = [
  [LEDGE_ITEMS, CART_BODY],
  [/^EP04_CartSign$/, /^KG_Grb_BakmieTio_(FrontPanel|BodyCore|FrontTrimT|ServeLedge|LowerPanel)$/],
  [/^EP04_SignKaryawan$/, /^KG_Grb_BakmieTio_(EtalaseTop|EtGlass_N)$/],
  [/^EP04_BestEmployee$/, /^KG_Grb_BakmieTio_(EtGlass_N|EtalaseFrame|EtalaseTop|Counter)$/],
  [/^EP04_Dandang$/, /^KG_Grb_BakmieTio_StoveBase$/],
];
const isSupport = (prop: string, mesh: string) => SUPPORTS.some(([p, m]) => p.test(prop) && m.test(mesh));

test('EP04 Fase 3.5 · checkPropOverlap: prop EP04 tidak saling menembus/dempet', () => {
  const r = checkPropOverlap(EP04_PROP_BOXES, 0.03);
  assert.equal(r.violations.length, 0, r.violations.map((v) => v.message).join('\n'));
});

test('EP04 Fase 3.5 · checkPropOverlap: prop EP04 vs mesh kampung.glb (nol tembus kecuali tumpuan)', () => {
  const bad: string[] = [];
  for (const p of EP04_PROP_BOXES) {
    for (const a of AREA) {
      const r = checkPropOverlap([p, a], 0.03);
      for (const v of r.violations) {
        if (isSupport(p.name, a.name) && !v.penetrating) continue;
        bad.push(v.message);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('EP04 Fase 3.5 · checkCounterVisibility & nol armPose rest di balik konter', () => {
  const utoh = ACTORS.find((a) => a.id === 'bangUtoh')!;
  const yuni = ACTORS.find((a) => a.id === 'mbakYuni')!;
  const ru = checkCounterVisibility(EP04_SPOTS.utohDefault, utoh.height, COUNTER_TOP_Y);
  const ry = checkCounterVisibility(EP04_SPOTS.yuni, yuni.height, box('KG_Grb_EsBuahYuni_Counter').max[1]);
  assert.ok(ru.ok, ru.message);
  assert.ok(ry.ok, ry.message);
  const badArms: string[] = [];
  for (let f = 0; f < TOTAL_FRAMES; f += 5) {
    const cam = sampleCamera(CAMS, f).pos;
    for (const id of ['bangUtoh', 'mbakYuni'] as const) {
      const ap = poseFor(id, f, cam)!;
      if (ap.leftArm === 'rest' || ap.rightArm === 'rest') badArms.push(`${id}@f${f}: ${ap.leftArm}/${ap.rightArm}`);
    }
  }
  assert.deepEqual(badArms, []);
});

const BODY_W = { bangUtoh: 0.52, tio: 0.58, pakUjang: 0.5, mbakYuni: 0.55, oyen: 0.36 } as const;
const CART_OBSTACLES = AREA.filter((b) => /^KG_Grb_(BakmieTio|EsBuahYuni)_(Counter|BodyCore|ServeLedge|FrontPanel|Post_|EtGlass|DandangPot)/.test(b.name));
const TABLES = AREA.filter((b) => /CustTable|CustStoolSeat|Payung_(TableTop|Stool)/.test(b.name));

test('EP04 Fase 3.5 · checkBillboardSweep per-frame (step 2f) di semua shot eye-level', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    if (TOP_DOWN_SHOT_IDS.has(s.id)) continue;
    for (let f = s.from; f < s.to; f += 2) {
      const cam = sampleCamera(CAMS, f).pos;
      for (const a of ACTORS) {
        const p = actorPositionAt(a.id, f, cam);
        if (!p) continue;
        const r = checkBillboardSweep(p, BODY_W[a.id], a.height, cam, [...CART_OBSTACLES, ...TABLES]);
        if (!r.ok) {
          bad.push(`${s.id}@f${f} ${a.id}: ${r.collisions.map((c) => c.obstacle).join(',')}`);
          break;
        }
      }
      const op = oyenPositionAt(f, cam);
      const ro = checkBillboardSweep(op, BODY_W.oyen, OYEN_HEIGHT, cam, [...CART_OBSTACLES, ...TABLES]);
      if (!ro.ok) {
        bad.push(`${s.id}@f${f} oyen: ${ro.collisions.map((c) => c.obstacle).join(',')}`);
        break;
      }
    }
  }
  assert.deepEqual(bad, []);
});

const FACE = (name: string, c: Vec3, w = 0.16, h = 0.18): FramingSubject => ({ name, center: c, halfW: w, halfH: h, avoidSubtitle: true });
const U = (_cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('bangUtoh', f)!;
  return FACE('wajah Utoh', [p[0], 1.64, p[2]]);
};
const Tf = (_cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('tio', f)!;
  return FACE('wajah Tio', [p[0], 1.34, p[2]]);
};
const PU = (cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('pakUjang', f, cam) ?? EP04_SPOTS.pakUjangSeat;
  return FACE('wajah Pak Ujang', [p[0], 1.24, p[2]]);
};
const Y = FACE('wajah Yuni', [EP04_SPOTS.yuni[0], 1.56, EP04_SPOTS.yuni[2]]);
const O = (cam: Vec3, f: number): FramingSubject => {
  const p = oyenPositionAt(f, cam);
  return FACE('wajah Oyen', [p[0], p[1] + 0.4, p[2]], 0.11, 0.1);
};
const CART_SIGN: FramingSubject = { name: 'karton 90RB', center: EP04_SPOTS.cartSign, halfW: 0.25, halfH: 0.12 };
const MANDOR_PLATE: FramingSubject = { name: 'papan MANDOR', center: [EP04_SPOTS.mandorPlate[0], 0.96, EP04_SPOTS.mandorPlate[2]], halfW: 0.08, halfH: 0.045 };
const BOWL_UJANG: FramingSubject = { name: 'mangkok Pak Ujang', center: [EP04_SPOTS.bowlUjang[0], 0.96, EP04_SPOTS.bowlUjang[2]], halfW: 0.08, halfH: 0.06 };
const POSTER: FramingSubject = { name: 'poster KARYAWAN TERBAIK', center: EP04_SPOTS.bestEmployee, halfW: 0.16, halfH: 0.14 };
const SLIP: FramingSubject = { name: 'nota Slip Gaji', center: EP04_SPOTS.slipInsert, halfW: 0.16, halfH: 0.2 };

type Subj = FramingSubject | ((cam: Vec3, f: number) => FramingSubject);
const FRAMING: Record<string, Subj[]> = {
  'b1-hook-utoh': [U, CART_SIGN],
  'b1-pan-karton': [U, CART_SIGN],
  'b2-two-tio': [U, Tf],
  'b2-oyen-reveal': [O, MANDOR_PLATE],
  'b2-utoh-qc': [U],
  'b2-tio-senior': [Tf],
  'b3-ujang-enter': [PU],
  'b3-topdown-mie': [BOWL_UJANG],
  'b3-tio-potong': [Tf],
  'b3-utoh-lho': [U],
  'b4-yuni-1': [Y],
  'b4-utoh-protes': [U],
  'b4-oyen-flat': [O],
  'b4-tio-terharu': [Tf],
  'b4-poster-insert': [POSTER],
  'b4-orbit-utoh': [U],
  'b5-tio-order': [Tf],
  'b5-utoh-multi': [U],
  'b5-deploy-1': [U],
  'b5-deploy-2': [U],
  'b5-deploy-3': [U],
  'b5-promote-stage': [U, MANDOR_PLATE],
  'b6-ujang-exit': [U],
  'b6-utoh-lega': [U],
  'b7-handover': [U, Tf],
  'b7-slip-insert': [SLIP],
  'b7-utoh-shock': [U],
  'b7-tio-fee': [Tf],
  'b7-oyen-puas': [O],
  'b8-hook-loop': [U, CART_SIGN],
};

const resolve = (id: string, cam: Vec3, f: number): FramingSubject[] => FRAMING[id].map((s) => (typeof s === 'function' ? s(cam, f) : s));

test('EP04 Fase 3.5 · checkSafeFraming: semua subjek utuh & wajah bebas zona subtitle 9:16', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    assert.ok(FRAMING[s.id], `shot ${s.id} punya daftar subjek`);
    const f = s.id === 'b3-ujang-enter' ? Math.min(s.to - 1, s.from + 55) : Math.min(s.to - 1, s.from + 30);
    const pose = sampleCamera(CAMS, f);
    const r = checkSafeFraming(pose, resolve(s.id, pose.pos, f));
    for (const v of r.violations) bad.push(`${s.id}@f${f}: ${v.message}`);
  }
  assert.deepEqual(bad, []);
});

const isSelf = (subject: string, mesh: string) =>
  (subject === 'karton 90RB' && mesh === 'EP04_CartSign') ||
  (subject === 'papan MANDOR' && mesh === 'EP04_MandorPlate') ||
  (subject === 'mangkok Pak Ujang' && (mesh === 'EP04_BowlUjang' || mesh.startsWith('EP04_DeployBowl'))) ||
  (subject === 'poster KARYAWAN TERBAIK' && mesh === 'EP04_BestEmployee');

test('EP04 Fase 3.5 · checkSightline: nol penghalang kamera -> subjek & 5 titik wajah Utoh bebas dandang', () => {
  const blockers = [...AREA.filter((b) => !/Glass/.test(b.name)), ...EP04_PROP_BOXES];
  const bad: string[] = [];
  for (const s of SHOTS) {
    const f = Math.min(s.to - 1, s.from + 24);
    const cam = sampleCamera(CAMS, f).pos;
    for (const subj of resolve(s.id, cam, f)) {
      const r = checkSightline(cam, subj.center, blockers.filter((b) => !isSelf(subj.name, b.name)));
      if (!r.ok) bad.push(`${s.id} -> ${subj.name}: ${r.blockedBy.map((h) => h.name).join(',')}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('EP04 Fase 3.5 · kamera eye-level |pitch| <= 12° (kecuali topDownInsert Beat 3)', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    if (TOP_DOWN_SHOT_IDS.has(s.id)) continue;
    for (let f = s.from; f < s.to; f += 5) {
      const p: CamPose = sampleCamera(CAMS, f);
      const pitch = (Math.atan2(p.look[1] - p.pos[1], Math.hypot(p.look[0] - p.pos[0], p.look[2] - p.pos[2])) * 180) / Math.PI;
      if (Math.abs(pitch) > 12) {
        bad.push(`${s.id}@f${f}: ${pitch.toFixed(1)}°`);
        break;
      }
    }
  }
  assert.deepEqual(bad, []);
});
