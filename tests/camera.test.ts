import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CREEP,
  REF_PUSH_CREEP,
  sampleCamera,
  kickOffset,
  moveSettle,
  pullOutReveal,
  punchIn,
  craneDive,
  portalPush,
  steppedEscalate,
  swipeTrack,
  orbitArc,
  topDownInsert,
  craneTransition,
  cameraBasis,
  projectPoint,
  unprojectPoint,
  screenSpeedPx,
  type CamKey,
  type CamPose,
} from '../engine/core/camera';

const pose = (x: number): CamPose => ({ pos: [x, 0, 10], look: [0, 0, 0], fov: 35, roll: 0 });
const distToLook = (p: CamPose) =>
  Math.hypot(p.pos[0] - p.look[0], p.pos[1] - p.look[1], p.pos[2] - p.look[2]);

test('DEFAULT_CREEP === 0 (Sinematika Referensi v2.0: hold duduk mantap tanpa slow-zoom monoton)', () => {
  assert.equal(DEFAULT_CREEP, 0);
  const keys: CamKey[] = [{ frame: 0, pose: pose(0) }];
  assert.deepEqual(sampleCamera(keys, 40).pos, sampleCamera(keys, 0).pos);
});

test('pose pertama tidak terlewati saat glide lebih panjang dari hold', () => {
  const keys: CamKey[] = [
    { frame: 0, pose: pose(0) },
    { frame: 10, pose: pose(5), glide: 24 },
  ];
  assert.ok(Math.abs(sampleCamera(keys, 0).pos[0]) < 1e-9, 'frame 0 harus tepat di pose pertama');
  assert.ok(Math.abs(sampleCamera(keys, 10).pos[0] - 5) < 1e-6, 'frame 10 tiba di pose kedua');
});

test('cut melompat tepat di frame key', () => {
  const keys: CamKey[] = [
    { frame: 0, pose: pose(0) },
    { frame: 30, pose: pose(8), cut: true },
  ];
  assert.ok(sampleCamera(keys, 29).pos[0] < 1);
  assert.equal(Math.round(sampleCamera(keys, 30).pos[0]), 8);
});

test('creepRate: 0 menghentikan push-in sepenuhnya selama hold (termasuk sebelum glide)', () => {
  const holdOnly: CamKey[] = [{ frame: 0, pose: pose(2), creepRate: 0 }];
  const p0 = sampleCamera(holdOnly, 0);
  const p40 = sampleCamera(holdOnly, 40);
  assert.deepEqual(p40.pos, p0.pos);

  const beforeGlide: CamKey[] = [
    { frame: 0, pose: pose(2), creepRate: 0 },
    { frame: 80, pose: pose(6), glide: 20 },
  ];
  const g0 = sampleCamera(beforeGlide, 0);
  const g59 = sampleCamera(beforeGlide, 59);
  assert.deepEqual(g59.pos, g0.pos);
});

test('backward-compatibility: creepRate eksplisit & parameter rate mendorong maju monoton tanpa rubber-banding', () => {
  const slowRate = 0.0022;
  const fastRate = 0.0055;
  const slowKeys: CamKey[] = [{ frame: 0, pose: pose(3), creepRate: slowRate }];
  const fastKeys: CamKey[] = [{ frame: 0, pose: pose(3), creepRate: fastRate }];
  const argRateKeys: CamKey[] = [{ frame: 0, pose: pose(1.5) }];

  let prevFast = distToLook(sampleCamera(fastKeys, 0));
  let prevArg = distToLook(sampleCamera(argRateKeys, 0, slowRate));
  for (let f = 1; f <= 60; f++) {
    const dFast = distToLook(sampleCamera(fastKeys, f));
    const dSlow = distToLook(sampleCamera(slowKeys, f));
    const dArg = distToLook(sampleCamera(argRateKeys, f, slowRate));
    assert.ok(dFast < prevFast, `frame ${f} harus lebih dekat ke look tanpa rubber-banding`);
    assert.ok(dFast < dSlow, `frame ${f} dengan creepRate ${fastRate} harus lebih maju dari ${slowRate}`);
    assert.ok(dArg < prevArg, `frame ${f} dengan argumen rate eksplisit harus mendekat monoton`);
    prevFast = dFast;
    prevArg = dArg;
  }
});

test('moveSettle meluncur halus lalu berhenti mantap (creepRate: 0)', () => {
  const a = pose(0);
  const b = pose(4);
  const keys = moveSettle(10, a, b, 24);
  assert.deepEqual(sampleCamera(keys, 10).pos, a.pos);
  assert.ok(Math.abs(sampleCamera(keys, 22).pos[0] - 2) < 1e-6, 'titik tengah glide tepat di x=2');
  assert.deepEqual(sampleCamera(keys, 34).pos, b.pos);
  assert.deepEqual(sampleCamera(keys, 80).pos, b.pos, 'settle mantap setelah glide selesai');
});

test('pullOutReveal menahan macro lalu mundur logaritmis (dolly) dan settle di wide', () => {
  const macro: CamPose = { pos: [0, 1, 1], look: [0, 1, 0], fov: 28, roll: 0 };
  const wide: CamPose = { pos: [0, 1.4, 5], look: [0, 1.1, 0], fov: 48, roll: 0 };
  const keys = pullOutReveal(0, 15, macro, wide, 30);

  // Hold macro stabil selama 15 frame
  assert.deepEqual(sampleCamera(keys, 0).pos, macro.pos);
  assert.deepEqual(sampleCamera(keys, 15).pos, macro.pos);

  // Mundur monoton sepanjang 30 frame glide
  let prevD = distToLook(sampleCamera(keys, 15));
  for (let f = 16; f <= 45; f++) {
    const d = distToLook(sampleCamera(keys, f));
    assert.ok(d >= prevD - 1e-9, `jarak harus membesar monoton di f${f}`);
    prevD = d;
  }
  assert.deepEqual(sampleCamera(keys, 45).pos, wide.pos);
  assert.deepEqual(sampleCamera(keys, 90).pos, wide.pos, 'settle mantap di widePose');
});

test('orbitArc mempertahankan radius konstan di sekitar center dan settle di akhir', () => {
  const center: [number, number, number] = [-1.2, 1.1, 0.5];
  const radius = 2.4;
  const keys = orbitArc(20, center, radius, -30, 30, 1.3, 38, 30);
  for (let f = 20; f <= 50; f++) {
    const p = sampleCamera(keys, f);
    const r = Math.hypot(p.pos[0] - center[0], p.pos[2] - center[2]);
    assert.ok(Math.abs(r - radius) < 1e-6, `radius di f${f} (${r}) harus = ${radius}`);
    assert.equal(p.pos[1], 1.3);
  }
  assert.ok(sampleCamera(keys, 20).pos[0] < center[0], 'mulai di azimuth negatif (-X)');
  assert.ok(sampleCamera(keys, 50).pos[0] > center[0], 'berakhir di azimuth positif (+X)');
  assert.deepEqual(sampleCamera(keys, 75).pos, sampleCamera(keys, 50).pos, 'settle setelah orbit selesai');
});

test('topDownInsert menghasilkan kamera flat-lay 90° bebas singularitas gimbal', () => {
  const center: [number, number, number] = [-1.5, 0.77, 0.45];
  const p = topDownInsert(center, 1.4, 34, 0);
  const b = cameraBasis(p);
  assert.ok(Number.isFinite(b.right[0]) && Number.isFinite(b.up[2]));
  assert.ok(Math.abs(Math.hypot(...b.right) - 1) < 1e-6);
  assert.ok(b.forward[1] < -0.999, 'mengarah lurus ke bawah (-Y)');
  const proj = projectPoint(p, center);
  assert.ok(Math.abs(proj.x) < 1e-6 && Math.abs(proj.y) < 1e-6, 'center berada tepat di tengah layar');
  assert.ok(Math.abs(proj.depth - 1.4) < 0.01);
});

test('craneTransition menukik mulus dari aerial ke eye-level lalu settle mantap', () => {
  const high: CamPose = { pos: [0, 5.2, 7.5], look: [0, 1.0, 0], fov: 44, roll: 0 };
  const low: CamPose = { pos: [0, 1.45, 4.2], look: [0, 1.2, 0], fov: 38, roll: 0 };
  const keys = craneTransition(100, high, low, 36);
  assert.deepEqual(sampleCamera(keys, 100).pos, high.pos);
  assert.ok(sampleCamera(keys, 118).pos[1] < high.pos[1] && sampleCamera(keys, 118).pos[1] > low.pos[1]);
  assert.deepEqual(sampleCamera(keys, 136).pos, low.pos);
  assert.deepEqual(sampleCamera(keys, 160).pos, low.pos);
});

test('kick meluruh dan berhenti', () => {
  const a = Math.abs(kickOffset([{ frame: 10, strength: 1 }], 10).dy);
  const b = Math.abs(kickOffset([{ frame: 10, strength: 1 }], 15).dy);
  assert.ok(a > b);
  assert.equal(kickOffset([{ frame: 10, strength: 1 }], 20).dy, 0);
});

test('projectPoint: look di tengah, roll memutar gambar, unproject kebalikan project', () => {
  const p: CamPose = { pos: [0, 1, 5], look: [0, 1, 0], fov: 40, roll: 0 };
  const c = projectPoint(p, [0, 1, 0]);
  assert.ok(Math.abs(c.x) < 1e-9 && Math.abs(c.y) < 1e-9);
  assert.ok(Math.abs(c.depth - 5) < 1e-9);
  assert.ok(projectPoint(p, [0.5, 1, 0]).x > 0);
  assert.ok(projectPoint(p, [0, 1.5, 0]).y > 0);
  const top = Math.tan((40 * Math.PI) / 360) * 5;
  assert.ok(Math.abs(projectPoint(p, [0, 1 + top, 0]).y - 1) < 1e-9);
  assert.ok(projectPoint({ ...p, roll: 10 }, [0.5, 1, 0]).y < 0);
  const w = unprojectPoint(p, 0.3, -0.4, 3);
  const q = projectPoint(p, w);
  assert.ok(Math.abs(q.x - 0.3) < 1e-9 && Math.abs(q.y + 0.4) < 1e-9 && Math.abs(q.depth - 3) < 1e-9);
  assert.ok(screenSpeedPx(p, p) < 1e-9);
  assert.ok(screenSpeedPx(p, { ...p, pos: [0.05, 1, 5], look: [0.05, 1, 0] }) > 1);
});

test("path 'dolly': ujung pose tepat, skala bingkai geometris (laju zoom seragam), default 'linear' tidak berubah", () => {
  const a: CamPose = { pos: [0, 1, 1], look: [0, 1, 0], fov: 27, roll: 0 };
  const b: CamPose = { pos: [1, 3, 5], look: [-0.2, 0.9, 0.5], fov: 53, roll: 0 };
  const keys: CamKey[] = [
    { frame: 0, pose: a, creepRate: 0 },
    { frame: 40, pose: b, glide: 40, creepRate: 0, path: 'dolly' },
  ];
  const h = (p: CamPose) => distToLook(p) * Math.tan((p.fov * Math.PI) / 360);
  const s0 = sampleCamera(keys, 0);
  const s1 = sampleCamera(keys, 40);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(s0.pos[i] - a.pos[i]) < 1e-9 && Math.abs(s1.pos[i] - b.pos[i]) < 1e-9, 'pos ujung tepat');
    assert.ok(Math.abs(s1.look[i] - b.look[i]) < 1e-9, 'look ujung tepat');
  }
  assert.ok(Math.abs(s1.fov - b.fov) < 1e-9);
  const mid = sampleCamera(keys, 20);
  assert.ok(Math.abs(h(mid) - Math.sqrt(h(a) * h(b))) < 1e-9, `skala tengah ${h(mid)} vs ${Math.sqrt(h(a) * h(b))}`);
  for (let f = 0; f < 40; f++) {
    const p = sampleCamera(keys, f);
    const q = sampleCamera(keys, f + 1);
    assert.ok(h(q) >= h(p) - 1e-12, `skala mundur di f${f}`);
    assert.ok(distToLook(q) >= distToLook(p) - 1e-12, `jarak yoyo di f${f}`);
  }
  const lin: CamKey[] = [keys[0], { ...keys[1], path: undefined }];
  const m = sampleCamera(lin, 20);
  assert.ok(Math.abs(m.pos[2] - (a.pos[2] + b.pos[2]) / 2) < 1e-9 && Math.abs(m.fov - (a.fov + b.fov) / 2) < 1e-9);
});

test('Atelier v4.5 referensi (1).mp4: REF_PUSH_CREEP, punchIn, craneDive, portalPush, steppedEscalate, swipeTrack, snap15hz & dfov', () => {
  assert.equal(REF_PUSH_CREEP, 0.0014);
  const base: CamPose = { pos: [0, 1.5, 6], look: [0, 1.2, 0], fov: 40, roll: 0 };

  // punchIn mendekat logaritmis ke targetLook & settle
  const pk = punchIn(0, base, [0.2, 1.3, 0], 1.6, 12);
  assert.ok(distToLook(sampleCamera(pk, 12)) < distToLook(base));
  assert.deepEqual(sampleCamera(pk, 30).pos, sampleCamera(pk, 12).pos);

  // craneDive turun eksponensial dari aerial tinggi
  const aerial: CamPose = { pos: [0, 18, 12], look: [0, 0.5, 0], fov: 46, roll: 0 };
  const diveK = craneDive(0, aerial, base, 40);
  assert.ok(sampleCamera(diveK, 20).pos[1] < 10 && sampleCamera(diveK, 20).pos[1] > base.pos[1]);

  // portalPush, steppedEscalate, swipeTrack
  const pp = portalPush(0, base, { pos: [0, 1.4, 2.2], look: [0, 1.3, 0], fov: 36, roll: 0 }, 20, 4);
  const ppHold = sampleCamera(pp, 4);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(ppHold.pos[i] - base.pos[i]) < 1e-6);
  }
  assert.ok(sampleCamera(pp, 24).pos[2] < 2.3);

  const esc = steppedEscalate(0, [base, { ...base, pos: [0, 1.5, 4.5], roll: -1.5 }, { ...base, pos: [0, 1.5, 3.2], roll: 2 }], 10, 6);
  assert.equal(esc.length, 3);
  assert.equal(sampleCamera(esc, 16).roll, -1.5);

  const st = swipeTrack(0, pose(-2), pose(2), 4.0, 20);
  assert.ok(Math.abs(sampleCamera(st, 9).roll - 4.0) < 1e-6);
  assert.ok(Math.abs(sampleCamera(st, 20).roll) < 1e-6);

  // snap15hz membalik tanda setiap frame dan memancarkan dfov saat fovPunch disetel
  const k0 = kickOffset([{ frame: 10, strength: 0.1, length: 8, mode: 'snap15hz', fovPunch: -3 }], 10);
  const k1 = kickOffset([{ frame: 10, strength: 0.1, length: 8, mode: 'snap15hz', fovPunch: -3 }], 11);
  assert.ok(k0.dx * k1.dx < 0, 'snap15hz harus membalik tanda tiap frame');
  assert.ok((k0.dfov ?? 0) < 0 && Math.abs((k0.dfov ?? 0) + 3) < 1e-6);
  const kEnd = kickOffset([{ frame: 10, strength: 0.1, length: 8, mode: 'snap15hz', fovPunch: -3 }], 18);
  assert.equal(kEnd.dx, 0);
  assert.equal(kEnd.dfov ?? 0, 0);
});
