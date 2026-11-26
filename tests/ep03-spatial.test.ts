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
  boxFromFoot,
  sampleCamera,
  type CamPose,
  type FramingSubject,
  type NamedBox,
  type Vec3,
} from '../engine';
import { ACTORS, OYEN_HEIGHT, actorPositionAt, oyenPositionAt } from '../productions/ep03-tio-bakmie/cast';
import {
  COUNTER_TOP_Y,
  DANDANG_STEAM,
  EP03_HIDE_NAMES,
  EP03_PROP_BOXES,
  EP03_SPOTS,
  PLATE_SLIDE_FRAMES,
  platePosAt,
  steamPuffs,
} from '../productions/ep03-tio-bakmie/set';
import { CAMS, SHOTS } from '../productions/ep03-tio-bakmie/shots';

// ---------------------------------------------------------------------------------------------
// AABB dunia dari kampung.glb (transform hierarki penuh: T * R * S)
// ---------------------------------------------------------------------------------------------

type GNode = { name?: string; mesh?: number; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] };
type M4 = number[]; // kolom-mayor 4x4

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
  return out.filter((b) => !EP03_HIDE_NAMES.some((h) => b.name.startsWith(h)));
}

const AREA = loadAreaBoxes();
const box = (name: string) => {
  const b = AREA.find((x) => x.name === name);
  assert.ok(b, `mesh ${name} ada di kampung.glb`);
  return b!;
};

test('kampung.glb memuat gerobak Tio & Yuni di area pedagang', () => {
  assert.ok(AREA.filter((b) => b.name.startsWith('KG_Grb_BakmieTio_')).length > 50);
  assert.ok(box('KG_Grb_BakmieTio_Counter').max[1] > 0.95);
});

// ---------------------------------------------------------------------------------------------
// 1. Prop overlap
// ---------------------------------------------------------------------------------------------

/** Benda di serve ledge bertumpu pada ledge & bersandar ke badan gerobak: boleh bersentuhan, tidak boleh menembus. */
const LEDGE_ITEMS = /^EP03_(Bowl|EsTeh|Plate\d)$/;
const CART_BODY = /^KG_Grb_BakmieTio_(ServeLedge|Counter|FrontTrimT|FrontPanel|BodyCore)$/;
/**
 * Tumpuan lain (boleh bersentuhan, tidak boleh menembus): karton berdiri di tutup etalase (tepi bawahnya ≤ 2,5 cm
 * di atas kaca depan etalase yang menopang tutup itu) dan dandang EP03 yang duduk di tungku bawaan.
 */
const SUPPORTS: [RegExp, RegExp][] = [
  [LEDGE_ITEMS, CART_BODY],
  [/^EP03_SignKaryawan$/, /^KG_Grb_BakmieTio_(EtalaseTop|EtGlass_N)$/],
  [/^EP03_Dandang$/, /^KG_Grb_BakmieTio_StoveBase$/],
];
const isSupport = (prop: string, mesh: string) => SUPPORTS.some(([p, m]) => p.test(prop) && m.test(mesh));

test('Fase 3.5 · checkPropOverlap: prop EP03 tidak saling menembus/dempet', () => {
  const r = checkPropOverlap(EP03_PROP_BOXES, 0.03);
  assert.equal(r.violations.length, 0, r.violations.map((v) => v.message).join('\n'));
});

test('Fase 3.5 · checkPropOverlap: prop EP03 vs mesh kampung.glb (nol tembus, nol dempet kecuali tumpuan)', () => {
  const bad: string[] = [];
  for (const p of EP03_PROP_BOXES) {
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

// ---------------------------------------------------------------------------------------------
// 2. Counter visibility
// ---------------------------------------------------------------------------------------------

test('Fase 3.5 · checkCounterVisibility: Tio & Yuni tampak bahu/dada di atas konter gerobak', () => {
  const tio = ACTORS.find((a) => a.id === 'tio')!;
  const yuni = ACTORS.find((a) => a.id === 'mbakYuni')!;
  const rt = checkCounterVisibility(EP03_SPOTS.tio, tio.height, COUNTER_TOP_Y);
  const ry = checkCounterVisibility(EP03_SPOTS.yuni, yuni.height, box('KG_Grb_EsBuahYuni_Counter').max[1]);
  assert.ok(rt.ok, rt.message);
  assert.ok(ry.ok, ry.message);
});

// ---------------------------------------------------------------------------------------------
// 3. Billboard sweep pada yaw setiap kamera
// ---------------------------------------------------------------------------------------------

/** Lebar tubuh efektif (bagian kartu yang berpiksel). Duduk lebih ramping dari berdiri. */
const BODY_W = { bangUtoh: 0.5, tio: 0.6, mbakYuni: 0.55, oyen: 0.36 } as const;
const CART_OBSTACLES = AREA.filter((b) => /^KG_Grb_(BakmieTio|EsBuahYuni)_(Counter|BodyCore|ServeLedge|FrontPanel|Post_|EtGlass|DandangPot)/.test(b.name));
const TABLES = AREA.filter((b) => /CustTable|CustStoolSeat|Payung_(TableTop|Stool)/.test(b.name));

const shotPose = (i: number): CamPose => sampleCamera(CAMS, Math.min(SHOTS[i].to - 1, SHOTS[i].from + 40));

test('Fase 3.5 · checkBillboardSweep: nol sapuan billboard ke gerobak/meja di setiap shot', () => {
  const bad: string[] = [];
  SHOTS.forEach((s, i) => {
    const cam = shotPose(i).pos;
    const f = s.from + 20;
    for (const a of ACTORS) {
      const r = checkBillboardSweep(actorPositionAt(a.id, f, cam), BODY_W[a.id], a.height, cam, [...CART_OBSTACLES, ...TABLES]);
      if (!r.ok) bad.push(`${s.id} ${a.id}: ${r.collisions.map((c) => c.obstacle).join(',')}`);
    }
    const op = oyenPositionAt(f, cam);
    if (op) {
      const r = checkBillboardSweep(op, BODY_W.oyen, OYEN_HEIGHT, cam, [...CART_OBSTACLES, ...TABLES]);
      if (!r.ok) bad.push(`${s.id} oyen: ${r.collisions.map((c) => c.obstacle).join(',')}`);
    }
  });
  assert.deepEqual(bad, []);
});

// ---------------------------------------------------------------------------------------------
// 4. Safe framing (wajah/papan utuh, wajah bebas zona subtitle)
// ---------------------------------------------------------------------------------------------

const FACE = (name: string, c: Vec3, w = 0.16, h = 0.18): FramingSubject => ({ name, center: c, halfW: w, halfH: h, avoidSubtitle: true });
const Tf = FACE('wajah Tio', [EP03_SPOTS.tio[0], 1.64, EP03_SPOTS.tio[2]]);
const Y = FACE('wajah Yuni', [EP03_SPOTS.yuni[0], 1.56, EP03_SPOTS.yuni[2]]);
const BOARD: FramingSubject = { name: 'papan bon', center: EP03_SPOTS.board, halfW: 0.18, halfH: 0.15 };
const SIGN: FramingSubject = { name: 'karton DICARI KARYAWAN', center: EP03_SPOTS.sign, halfW: 0.15, halfH: 0.1 };
const PLATES: FramingSubject = { name: '3 piring', center: [-12.92, 0.94, 17.18], halfW: 0.17, halfH: 0.06 };
/** Wajah tokoh duduk mengikuti posisi kartu sebenarnya untuk kamera aktif (`seatCardPos`). */
const U = (cam: Vec3, f: number): FramingSubject => {
  const p = actorPositionAt('bangUtoh', f, cam);
  return FACE('wajah Utoh', [p[0], 1.26 + p[1], p[2]]);
};
const O = (cam: Vec3, f: number): FramingSubject => {
  const p = oyenPositionAt(f, cam) ?? EP03_SPOTS.oyenSeat;
  return FACE('wajah Oyen', [p[0], p[1] + 0.4, p[2]], 0.11, 0.1);
};
type Subj = FramingSubject | ((cam: Vec3, f: number) => FramingSubject);

/** Subjek wajib utuh per shot. */
export const FRAMING: Record<string, Subj[]> = {
  'b1-side-slump': [U],
  'b1-ots-tio': [Tf],
  'b2-rev-utoh': [U],
  'b2-tio-wisdom': [Tf],
  'b2-rev-blank': [U],
  'b2-west-board': [BOARD, SIGN],
  'b3-side-rant': [U],
  'b3-tio-whisper': [Tf],
  'b3-faceoff': [U, O],
  'b3-yuni': [Y],
  'b3-faceoff-react': [U, O],
  'b4-side-protest': [U, O],
  'b4-plates': [PLATES],
  'b4-board-ayam': [BOARD],
  'b5-tio-sincere': [Tf],
  'b5-rev-utoh': [U, O],
  'b6-board-total': [BOARD],
  'b6-wallet': [U],
  'b6-fish': [PLATES],
  'b6-oyen-meong': [O],
  'b6-side-slump': [U],
};
const resolve = (id: string, cam: Vec3, f: number): FramingSubject[] => FRAMING[id].map((s) => (typeof s === 'function' ? s(cam, f) : s));

test('Fase 3.5 · checkSafeFraming: semua subjek utuh & wajah bebas zona subtitle di setiap shot', () => {
  const bad: string[] = [];
  SHOTS.forEach((s, i) => {
    assert.ok(FRAMING[s.id], `shot ${s.id} punya daftar subjek framing`);
    // Shot moveSettle dicek di pose settle (akhir shot) dan di pose awal untuk subjek non-wajah.
    for (const f of [Math.min(s.to - 1, s.from + 40), s.to - 1]) {
      const pose = sampleCamera(CAMS, f);
      const r = checkSafeFraming(pose, resolve(s.id, pose.pos, f));
      for (const v of r.violations) bad.push(`${s.id}@f${f}: ${v.message}`);
    }
  });
  assert.deepEqual(bad, []);
});

// ---------------------------------------------------------------------------------------------
// 5. Sightline kamera -> subjek
// ---------------------------------------------------------------------------------------------

/** Subjek tidak dihitung menghalangi dirinya sendiri. */
const isSelf = (subject: string, mesh: string) =>
  (subject === 'papan bon' && mesh === 'EP03_BonBoard') ||
  (subject.startsWith('karton') && mesh === 'EP03_SignKaryawan') ||
  (subject === '3 piring' && /^EP03_Plate\d$/.test(mesh));

test('Fase 3.5 · checkSightline: tidak ada mesh/prop menghalangi kamera ke subjek utama', () => {
  const blockers = [...AREA.filter((b) => !/Glass/.test(b.name)), ...EP03_PROP_BOXES];
  const bad: string[] = [];
  SHOTS.forEach((s, i) => {
    const cam = shotPose(i).pos;
    for (const subj of resolve(s.id, cam, Math.min(s.to - 1, s.from + 40))) {
      const r = checkSightline(cam, subj.center, blockers.filter((b) => !isSelf(subj.name, b.name)));
      if (!r.ok) bad.push(`${s.id} -> ${subj.name}: ${r.blockedBy.map((h) => h.name).join(',')}`);
    }
  });
  assert.deepEqual(bad, []);
});

// ---------------------------------------------------------------------------------------------
// 6. Kamera setinggi mata (revisi G3: tidak ada kamera "dari atas")
// ---------------------------------------------------------------------------------------------

test('kamera setinggi mata: tunduk/tengadah ≤ 12° di setiap frame shot', () => {
  const bad: string[] = [];
  for (const s of SHOTS) {
    for (let f = s.from; f < s.to; f += 3) {
      const p = sampleCamera(CAMS, f);
      const dx = p.look[0] - p.pos[0];
      const dy = p.look[1] - p.pos[1];
      const dz = p.look[2] - p.pos[2];
      const pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
      if (Math.abs(pitch) > 12) {
        bad.push(`${s.id}@f${f}: ${pitch.toFixed(1)}°`);
        break;
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('arah hadap: Utoh menghadap gerobak (kiri layar) di profil timur & Utoh–Oyen saling hadap saat bertatapan', async () => {
  const { poseFor, oyenPoseAt } = await import('../productions/ep03-tio-bakmie/cast');
  const east = sampleCamera(CAMS, SHOTS.find((s) => s.id === 'b2-rev-utoh')!.from + 5).pos;
  const u = poseFor('bangUtoh', SHOTS.find((s) => s.id === 'b2-rev-utoh')!.from + 5, east);
  assert.equal(u.view, 'side');
  assert.ok((u.facing ?? 0) < 0, 'gerobak (+z) ada di kiri layar kamera timur');
  const fo = SHOTS.find((s) => s.id === 'b3-faceoff')!;
  const f = fo.from + 14;
  const cam = sampleCamera(CAMS, f).pos;
  const ut = poseFor('bangUtoh', f, cam);
  const oy = oyenPoseAt(f, cam)!;
  // Kamera depan memandang +z: Oyen (x lebih besar) di kiri layar, Utoh di kanan -> Utoh hadap kiri, Oyen hadap kanan.
  assert.ok((ut.facing ?? 0) < 0 && (oy.facing ?? 0) > 0, `utoh ${ut.facing} oyen ${oy.facing}`);
});

// ---------------------------------------------------------------------------------------------
// 7. Revisi G4 (R-2/R-3/R-7): wajah Tio bebas karton, dandang, & uap di setiap shot yang memuat Tio
// ---------------------------------------------------------------------------------------------

/**
 * Titik wajah Tio (kartu 1,96 m di pijakan 0,30): tengah, dahi, dagu, dan pipi kiri/kanan. Garis kamera -> tiap titik
 * tidak boleh memotong mesh gerobak, prop EP03 (termasuk karton & dandang baru), maupun gumpal uap dandang.
 */
const TIO_FACE_PTS: Vec3[] = (() => {
  const [x, , z] = EP03_SPOTS.tio;
  return [
    [x, 1.64, z],
    [x, 1.8, z],
    [x, 1.48, z],
    [x - 0.13, 1.64, z],
    [x + 0.13, 1.64, z],
  ];
})();

/**
 * Gumpal uap sebagai AABB. Sprite = gradasi radial yang memudar ke 0 di tepi; ≥ 70 % radius opasitasnya < 15 %
 * (praktis tembus), jadi kotak memakai 70 % setengah-sisi. Gumpal yang hampir lenyap (opasitas < 0,06) diabaikan.
 */
function steamBoxes(frame: number): NamedBox[] {
  const src = DANDANG_STEAM.source;
  return steamPuffs(frame, DANDANG_STEAM)
    .filter((p) => p.a >= 0.06)
    .map((p, i) => {
      const h = p.s * 0.5 * 0.7;
      const c: Vec3 = [src[0] + p.x, src[1] + p.y, src[2]];
      return { name: `EP03_DandangSteam#${i}`, min: [c[0] - h, c[1] - h, c[2] - h], max: [c[0] + h, c[1] + h, c[2] + h] };
    });
}

/**
 * Pengecualian sempit & beralasan: di b2-west-board Tio terlihat MENEMBUS kaca etalase (kaca tidak dihitung
 * penghalang). Tutup etalase bawaan (slab 3 cm, kamera & posisi Tio terkunci) melintas tipis di garis dahi/rambut;
 * itu bingkai etalase, bukan karton/dandang/uap yang direvisi. Hanya mesh ini, hanya shot ini.
 */
const TIO_FACE_EXEMPT: Record<string, RegExp> = { 'b2-west-board': /^KG_Grb_BakmieTio_EtalaseTop$/ };

const TIO_SHOTS = ['b1-ots-tio', 'b2-tio-wisdom', 'b2-west-board', 'b3-tio-whisper', 'b3-faceoff', 'b3-faceoff-react', 'b5-tio-sincere', 'b6-oyen-meong'];

test('R-2/R-3/R-7 · wajah Tio tidak terhalang karton, dandang, atau uap di setiap frame shot Tio', () => {
  const solid = [...AREA.filter((b) => !/Glass/.test(b.name)), ...EP03_PROP_BOXES];
  const bad = new Set<string>();
  for (const id of TIO_SHOTS) {
    const s = SHOTS.find((x) => x.id === id);
    assert.ok(s, `shot ${id} ada`);
    for (let f = s!.from; f < s!.to; f += 2) {
      const cam = sampleCamera(CAMS, f).pos;
      const blockers = [...solid, ...steamBoxes(f)];
      for (const pt of TIO_FACE_PTS) {
        const r = checkSightline(cam, pt, blockers);
        for (const h of r.blockedBy.filter((x) => !TIO_FACE_EXEMPT[id]?.test(x.name))) bad.add(`${id} -> wajah Tio y${pt[1]} x${pt[0].toFixed(2)}: ${h.name.replace(/#\d+$/, '')}`);
      }
    }
  }
  assert.deepEqual([...bad], []);
});

test('R-2 · karton DICARI KARYAWAN tetap terbaca utuh di b2-west-board (sepanjang shot)', () => {
  const s = SHOTS.find((x) => x.id === 'b2-west-board')!;
  const sign: FramingSubject = { name: 'karton', center: EP03_SPOTS.sign, halfW: 0.15, halfH: 0.1 };
  const bad: string[] = [];
  for (let f = s.from; f < s.to; f += 5) {
    const pose = sampleCamera(CAMS, f);
    for (const v of checkSafeFraming(pose, [sign]).violations) bad.push(`f${f}: ${v.message}`);
  }
  assert.deepEqual(bad, []);
});

test('R-8 · piring meluncur dari konter ke ledge dalam 4–6 f tanpa menembus gerobak/prop lain', () => {
  assert.ok(PLATE_SLIDE_FRAMES >= 4 && PLATE_SLIDE_FRAMES <= 6);
  const from = [100, 112, 130];
  // Tanpa `platesFrom`: perilaku lama (langsung di tempat).
  assert.deepEqual(platePosAt(1, 0, 2), EP03_SPOTS.plates[1]);
  assert.equal(platePosAt(2, 0, 2), null);
  const cart = AREA.filter((b) => b.name.startsWith('KG_Grb_BakmieTio_') && !CART_BODY.test(b.name));
  const others = EP03_PROP_BOXES.filter((b) => !/^EP03_Plate\d$/.test(b.name));
  const bad: string[] = [];
  for (let f = 95; f <= 140; f++) {
    const boxes: NamedBox[] = [];
    EP03_SPOTS.plates.forEach((_, i) => {
      const p = platePosAt(i, f, 0, from);
      if (!p) return;
      if (f === from[i]) {
        const off = Math.hypot(p[0] - EP03_SPOTS.plates[i][0], p[2] - EP03_SPOTS.plates[i][2]);
        assert.ok(Math.abs(off - 0.12) < 0.005, `piring ${i} mulai ±0,12 m dari tempatnya (${off.toFixed(3)})`);
        assert.ok(p[2] > EP03_SPOTS.plates[i][2], `piring ${i} datang dari belakang (sisi Tio)`);
      }
      if (f >= from[i] + PLATE_SLIDE_FRAMES) assert.deepEqual(p, EP03_SPOTS.plates[i]);
      boxes.push(boxFromFoot(`EP03_Plate${i}`, p, 0.09, 0.03, 0.09));
    });
    for (const v of checkPropOverlap([...boxes, ...cart, ...others], 0).violations) {
      if (v.penetrating && (v.a.startsWith('EP03_Plate') || v.b.startsWith('EP03_Plate'))) bad.push(`f${f}: ${v.message}`);
    }
  }
  assert.deepEqual(bad, []);
});
