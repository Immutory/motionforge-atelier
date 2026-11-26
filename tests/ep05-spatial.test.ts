import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkBillboardSweep,
  checkPropOverlap,
  checkSafeFraming,
  checkSightline,
  sampleCamera,
  type CamPose,
  type FramingSubject,
  type NamedBox,
  type Vec3,
} from '../engine';
import { ACTORS, BELANG_HEIGHT, actorPositionAt, belangPositionAt } from '../productions/ep05-parkir-gratis-utoh/cast';
import { EP05_HIDE_NAMES, EP05_PROP_BOXES, EP05_SPOTS } from '../productions/ep05-parkir-gratis-utoh/set';
import { CAMS, SHOTS, TOTAL_FRAMES } from '../productions/ep05-parkir-gratis-utoh/shots';

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
    if (max[0] > -36 && min[0] < -26 && max[2] > 1.0 && min[2] < 8.5 && max[1] > 0.12 && !/Cable|Curbs|Bulb|Paving/.test(n.name)) {
      out.push({ name: n.name, min, max });
    }
  });
  return out.filter((b) => !EP05_HIDE_NAMES.some((h) => b.name.startsWith(h)));
}

const AREA = loadAreaBoxes();

test('EP05 Fase 3.5 · checkPropOverlap: prop EP05 tidak saling menembus/dempet', () => {
  const r = checkPropOverlap(EP05_PROP_BOXES, 0.03);
  assert.equal(r.violations.length, 0, r.violations.map((v) => v.message).join('\n'));
});

test('EP05 Fase 3.5 · checkPropOverlap: prop EP05 vs mesh kampung.glb (nol tembus kecuali tiang tumpuan kardus)', () => {
  const bad: string[] = [];
  for (const p of EP05_PROP_BOXES) {
    for (const a of AREA) {
      const r = checkPropOverlap([p, a], 0.03);
      for (const v of r.violations) {
        if (p.name === 'EP05_KardusSign' && a.name === 'KG_StreetPole_02' && !v.penetrating) continue;
        bad.push(v.message);
      }
    }
  }
  assert.deepEqual(bad, []);
});

const BODY_W = { bangUtoh: 0.52, ebot: 0.5, bangUdin: 0.52, raka: 0.48, pakBudi: 0.52, belang: 0.34 } as const;
const OBSTACLES = AREA.filter((b) => /KG_RukoWest1_Body|KG_P5_ATM_BoothBody|KG_StreetPole_02|KG_P5_Car_Angkot/.test(b.name));

test('EP05 Fase 3.5 · checkBillboardSweep per-frame (step 2f) di semua 25 shot', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    for (let f = s.from; f < s.to; f += 2) {
      const cam = sampleCamera(CAMS, f).pos;
      for (const a of ACTORS) {
        const p = actorPositionAt(a.id, f, cam);
        if (!p) continue;
        const r = checkBillboardSweep(p, BODY_W[a.id], a.height, cam, OBSTACLES);
        if (!r.ok) {
          bad.push(`${s.id}@f${f} ${a.id}: ${r.collisions.map((c) => c.obstacle).join(',')}`);
          break;
        }
      }
      const bp = belangPositionAt(f, cam);
      const rb = checkBillboardSweep(bp, BODY_W.belang, BELANG_HEIGHT, cam, OBSTACLES);
      if (!rb.ok) {
        bad.push(`${s.id}@f${f} belang: ${rb.collisions.map((c) => c.obstacle).join(',')}`);
        break;
      }
    }
  }
  assert.deepEqual(bad, []);
});

const FACE = (name: string, c: Vec3, w = 0.16, h = 0.18): FramingSubject => ({ name, center: c, halfW: w, halfH: h, avoidSubtitle: true });
const U = (_cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('bangUtoh', f)!;
  return FACE('wajah Utoh', [p[0], 1.54, p[2]]);
};
const E = FACE('wajah Ebot', [EP05_SPOTS.ebotDefault[0], 1.48, EP05_SPOTS.ebotDefault[2]]);
const UD = (cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('bangUdin', f, cam) ?? EP05_SPOTS.motorPark;
  return FACE('wajah Udin', [p[0], 1.32, p[2]]);
};
const RK = (cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('raka', f, cam) ?? EP05_SPOTS.motorPark;
  return FACE('wajah Raka', [p[0], 1.28, p[2]]);
};
const PB = (cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('pakBudi', f, cam) ?? EP05_SPOTS.pakBudiPushEnd;
  return FACE('wajah Pak Budi', [p[0], 1.52, p[2]]);
};
const BL = (cam: Vec3, f: number): FramingSubject => {
  const p = belangPositionAt(f, cam);
  return FACE('wajah Belang', [p[0], p[1] + 0.34, p[2]], 0.11, 0.1);
};
const KARDUS: FramingSubject = { name: 'kardus PARKIR GRATIS', center: EP05_SPOTS.kardusSign, halfW: 0.3, halfH: 0.2 };
const PAPAN: FramingSubject = { name: 'papan kapur tally', center: [EP05_SPOTS.papanKapur[0], 1.24, EP05_SPOTS.papanKapur[2]], halfW: 0.26, halfH: 0.32 };
const SURAT: FramingSubject = { name: 'surat denda RT 04', center: EP05_SPOTS.suratInsert, halfW: 0.18, halfH: 0.24 };

type Subj = FramingSubject | ((cam: Vec3, f: number) => FramingSubject);
const FRAMING: Record<string, Subj[]> = {
  'b1-hook-plak': [U, KARDUS],
  'b1-pan-syarat': [U, KARDUS],
  'b2-ebot-tanya': [E],
  'b2-utoh-bug': [U, E],
  'b2-ebot-target': [E, PAPAN],
  'b3-udin-enter': [UD],
  'b3-ebot-stop': [E],
  'b3-udin-oleng': [UD],
  'b3-tally-6rb': [PAPAN],
  'b3-udin-bayar': [UD],
  'b4-raka-flex': [RK],
  'b4-raka-oleng': [RK],
  'b4-tally-10rb': [PAPAN],
  'b4-raka-pasrah': [RK],
  'b5-tally-insert': [PAPAN],
  'b5-utoh-bos': [U],
  'b6-pakbudi-in': [PB],
  'b6-pakbudi-cu': [PB],
  'b6-utoh-lho': [U],
  'b7-pakbudi-surat': [U, PB],
  'b7-surat-makro': [SURAT],
  'b7-tally-320rb': [E, PAPAN],
  'b7-utoh-shock': [U],
  'b8-belang-cuek': [BL],
  'b8-loop-end': [U, KARDUS],
};

const resolve = (id: string, cam: Vec3, f: number): FramingSubject[] => FRAMING[id].map((s) => (typeof s === 'function' ? s(cam, f) : s));

test('EP05 Fase 3.5 · checkSafeFraming: semua subjek utuh & bebas zona subtitle 9:16', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    assert.ok(FRAMING[s.id], `shot ${s.id} punya daftar subjek`);
    const f = Math.min(s.to - 1, s.from + 26);
    const pose = sampleCamera(CAMS, f);
    const r = checkSafeFraming(pose, resolve(s.id, pose.pos, f));
    for (const v of r.violations) bad.push(`${s.id}@f${f}: ${v.message}`);
  }
  assert.deepEqual(bad, []);
});

const isSelf = (subject: string, mesh: string) =>
  (subject === 'kardus PARKIR GRATIS' && (mesh === 'EP05_KardusSign' || mesh === 'KG_StreetPole_02')) ||
  (subject === 'papan kapur tally' && mesh === 'EP05_PapanKapur');

test('EP05 Fase 3.5 · checkSightline: nol penghalang kamera -> subjek', () => {
  const blockers = [...AREA, ...EP05_PROP_BOXES];
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

test('EP05 Fase 3.5 · semua 25 shot eye-level |pitch| <= 12°', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
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
