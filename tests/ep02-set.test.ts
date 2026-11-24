import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACTOR_H, ACTOR_SOLE_Y, ACTOR_W, KAMPUNG_SPOTS, sampleCamera } from '../engine';
import {
  ACTORS,
  actorPositionAt,
  oyenPoseAt,
  oyenPositionAt,
  oyenReplayPoseAt,
  poseFor,
  EP02_B5_SPRINT_START,
  EP02_REPLAY_FROM,
  coffeeCountAt,
} from '../productions/ep02-bang-utoh/cast';
import { bulbSwingAt, EP02_PLAK_FRAME } from '../productions/ep02-bang-utoh/look';
import {
  EP02_B5_START,
  EP02_LOCATIONS,
  EP02_PROJECTOR_RUN_FRAME,
  EP02_SITI_COUNTER_RISER,
  EP02_SPOTS,
  coffeeSteamAt,
  firstFrameAtLeast,
  locationAt,
  projectorCursorOnAt,
  sampleTransitCurve,
} from '../productions/ep02-bang-utoh/set';
import { CAMS, DOF, SHOTS } from '../productions/ep02-bang-utoh/shots';
import { BEATS, EP02_FRAMES, lineById, nonverbalOf } from '../productions/ep02-bang-utoh/words';

const beat = (n: number) => {
  const b = BEATS.find((x) => x.beat === n);
  assert.ok(b, `B${n} ada`);
  return b;
};

const dist3 = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('EP02 lokasi diturunkan dari BEATS dan menutup seluruh master tanpa celah', () => {
  assert.deepEqual(
    EP02_LOCATIONS.map((r) => r.location),
    ['warkop', 'kampung', 'lab'],
  );
  assert.equal(EP02_LOCATIONS[0].from, 0);
  assert.equal(EP02_LOCATIONS[EP02_LOCATIONS.length - 1].to, EP02_FRAMES);
  for (let i = 1; i < EP02_LOCATIONS.length; i++) {
    assert.equal(EP02_LOCATIONS[i].from, EP02_LOCATIONS[i - 1].to, 'rentang bersambung');
  }
  const [warkop, kampung, lab] = EP02_LOCATIONS;
  assert.equal(warkop.to, beat(4).to);
  assert.deepEqual([kampung.from, kampung.to], [beat(5).from, beat(5).to]);
  assert.equal(lab.from, beat(6).from);
});

test('locationAt mengikuti batas beat', () => {
  assert.equal(locationAt(0), 'warkop');
  assert.equal(locationAt(beat(4).to - 1), 'warkop');
  assert.equal(locationAt(beat(5).from), 'kampung');
  assert.equal(locationAt(beat(6).from), 'lab');
  assert.equal(locationAt(EP02_FRAMES - 1), 'lab');
});

test('EP02_PROJECTOR_RUN_FRAME = Enter setelah R1, masih di B6', () => {
  const r1 = lineById('R1');
  assert.equal(EP02_PROJECTOR_RUN_FRAME, r1.endFrame + 10);
  assert.ok(EP02_PROJECTOR_RUN_FRAME >= beat(6).from && EP02_PROJECTOR_RUN_FRAME < beat(6).to);
  assert.equal(locationAt(EP02_PROJECTOR_RUN_FRAME), 'lab');
});

test('sampleTransitCurve mulus tanpa patah sudut 90° dan cocok titik awal/akhir', () => {
  const start = sampleTransitCurve(0);
  const end = sampleTransitCurve(1);
  assert.ok(dist3(start.pos, EP02_B5_START) < 1e-4);
  assert.ok(dist3(end.pos, KAMPUNG_SPOTS.kampusPlaza) < 1e-4);

  let prev = start.tangent;
  for (let i = 1; i <= 100; i++) {
    const cur = sampleTransitCurve(i / 100).tangent;
    const dot = Math.max(-1, Math.min(1, prev[0] * cur[0] + prev[1] * cur[1] + prev[2] * cur[2]));
    const deg = (Math.acos(dot) * 180) / Math.PI;
    assert.ok(deg < 22, `sudut belok antar sampel harus mulus, dapat ${deg.toFixed(1)}° di u=${i / 100}`);
    prev = cur;
  }
});

test('nol teleport Bang Utoh B4 dan Si Oyen B5, serta nol moonwalk / lari tangan kosong', () => {
  const b4 = beat(4);
  for (let f = b4.from; f < b4.to - 1; f++) {
    const d = dist3(actorPositionAt('bangUtoh', f), actorPositionAt('bangUtoh', f + 1));
    assert.ok(d < 0.15, `Utoh B4 teleport di f${f}: ${d.toFixed(3)}m`);
  }

  const b5 = beat(5);
  assert.equal(oyenPoseAt(b5.from).stance, 'sit', 'Oyen duduk tenang sebelum mulai jalan di B5');
  for (let f = b5.from; f < b5.to - 1; f++) {
    const d = dist3(oyenPositionAt(f), oyenPositionAt(f + 1));
    assert.ok(d < 0.25, `Oyen B5 teleport di f${f}: ${d.toFixed(3)}m`);
  }

  // Utoh berlari tangan kosong selama sprint B5
  const midSprint = Math.floor((EP02_B5_SPRINT_START + b5.to) / 2);
  const p = poseFor('bangUtoh', midSprint);
  assert.equal(p.leftArm, 'rest');
  assert.equal(p.rightArm, 'rest');
  assert.equal(p.leftProp, undefined);
  assert.equal(p.rightProp, undefined);

  // Oyen hidup (mengangkat cakar kiri mengarah ke keyboard) selama Replay Sepia B7
  assert.equal(oyenReplayPoseAt(EP02_REPLAY_FROM + 6).pawRaise, 'left');
  assert.equal(oyenReplayPoseAt(EP02_REPLAY_FROM + 20).pawRaise, 'left');
});

test('SHOTS menutup 0..EP02_FRAMES tanpa celah, DOF ~30-35%, dan CAMS bebas rubber-banding', () => {
  assert.equal(SHOTS[0].from, 0);
  assert.equal(SHOTS[SHOTS.length - 1].to, EP02_FRAMES);
  let dofFrames = 0;
  for (let i = 0; i < SHOTS.length; i++) {
    assert.ok(SHOTS[i].to > SHOTS[i].from, `shot ${SHOTS[i].id} durasi positif`);
    if (i > 0) assert.equal(SHOTS[i].from, SHOTS[i - 1].to, `shot ${SHOTS[i].id} bersambung`);
    if ((DOF[SHOTS[i].id] ?? 0) > 0) dofFrames += SHOTS[i].to - SHOTS[i].from;
  }
  const dofRatio = dofFrames / EP02_FRAMES;
  assert.ok(dofRatio >= 0.28 && dofRatio <= 0.39, `rasio DOF harus ~30-35%, dapat ${(dofRatio * 100).toFixed(1)}%`);

  // Verifikasi B1 v6.0 (macro hold 22f -> pull-out reveal 32f monoton tanpa yoyo balik)
  let prevDist = 0;
  for (let f = 0; f <= 54; f++) {
    const c = sampleCamera(CAMS, f);
    const d = dist3(c.pos, c.look);
    assert.ok(d >= prevDist - 1e-6, `kamera yoyo pada B1 pull-out di f${f}`);
    prevDist = d;
  }
});

test('kursor proyektor: mati sebelum Enter, lalu siklus 15 frame nyala / 15 frame mati', () => {
  const run = EP02_PROJECTOR_RUN_FRAME;
  for (let f = beat(6).from; f < run; f++) assert.equal(projectorCursorOnAt(f), false, `kursor mati sebelum run f${f}`);
  for (let k = 0; k < 6; k++) {
    const c = run + k * 30;
    for (let d = 0; d < 15; d++) assert.equal(projectorCursorOnAt(c + d), true, `nyala f${c + d}`);
    for (let d = 15; d < 30; d++) assert.equal(projectorCursorOnAt(c + d), false, `mati f${c + d}`);
  }
  // Tetap berkedip sepanjang hening jangkrik (run .. R2) dan sampai akhir master.
  const silence = [run, lineById('R2').startFrame];
  let on = 0;
  for (let f = silence[0]; f < silence[1]; f++) if (projectorCursorOnAt(f)) on++;
  assert.ok(on > 0 && on < silence[1] - silence[0], 'kedip selama hening jangkrik');
  assert.equal(projectorCursorOnAt(run + 30 * 20), true);
});

test('uap kopi: muncul saat gelas ke-4 diletakkan, puncak di hirupan S1, lalu luruh', () => {
  const placed = firstFrameAtLeast(coffeeCountAt, 4);
  assert.equal(coffeeCountAt(placed - 1), 3);
  assert.equal(coffeeCountAt(placed), 4);
  const sniff = nonverbalOf('S1', 1);
  assert.ok(placed < sniff.startFrame, 'gelas ke-4 sudah di meja sebelum hirupan');

  assert.equal(coffeeSteamAt(placed - 1, placed), 0, 'tidak ada uap sebelum gelas ke-4');
  assert.ok(coffeeSteamAt(placed + 2, placed) > 0, 'uap mulai segera setelah gelas diletakkan');

  let peakF = -1;
  let peak = -1;
  for (let f = placed; f < beat(4).to; f++) {
    const v = coffeeSteamAt(f, placed);
    assert.ok(v >= 0 && v <= 1);
    if (v > peak + 1e-9) {
      peak = v;
      peakF = f;
    }
  }
  assert.ok(peakF >= sniff.startFrame && peakF <= sniff.endFrame, `puncak f${peakF} di dalam hirupan ${sniff.startFrame}-${sniff.endFrame}`);
  assert.ok(Math.abs(peak - 1) < 1e-6);
  const mid = Math.round((sniff.startFrame + sniff.endFrame) / 2);
  assert.ok(coffeeSteamAt(mid, placed) > coffeeSteamAt(placed + 30, placed) + 0.3, 'hirupan jelas lebih tebal dari uap dasar');

  // Luruh monoton setelah hirupan sampai 0 sebelum B4 berakhir.
  for (let f = sniff.endFrame; f < sniff.endFrame + 120; f++) {
    assert.ok(coffeeSteamAt(f + 1, placed) <= coffeeSteamAt(f, placed) + 1e-9, `luruh monoton f${f}`);
  }
  assert.equal(coffeeSteamAt(beat(4).to - 1, placed), 0);
});

test('bohlam Warkop diam sebelum PLAK, berayun sesudahnya, dan tenang sebelum akhir B4', () => {
  for (let f = 0; f <= EP02_PLAK_FRAME; f++) {
    for (let i = 0; i < 3; i++) assert.equal(bulbSwingAt(f, i), 0, `bohlam ${i} diam di f${f}`);
  }
  const maxAfter = (i: number) => {
    let m = 0;
    for (let f = EP02_PLAK_FRAME; f < EP02_PLAK_FRAME + 60; f++) m = Math.max(m, Math.abs(bulbSwingAt(f, i)));
    return m;
  };
  for (let i = 0; i < 3; i++) assert.ok(maxAfter(i) > 0.05, `bohlam ${i} berayun setelah PLAK`);
  assert.ok(maxAfter(0) > maxAfter(1) && maxAfter(1) > maxAfter(2), 'getaran merambat melemah dari meja kiri');
  for (let i = 0; i < 3; i++) assert.equal(bulbSwingAt(beat(4).to - 1, i), 0, 'diam lagi di akhir B4');
});

// ---------------------------------------------------------------------------------------------------------
// U-1 (v6.1): kasir Bu Siti di balik konter Warkop — clearance yaw-projected & proporsi di atas WK_CounterTop
// ---------------------------------------------------------------------------------------------------------

type GlbBox = { min: [number, number, number]; max: [number, number, number] };

function readWarkopBox(nodeName: string): GlbBox {
  const buf = readFileSync(join(process.cwd(), 'public/sets/warkop.glb'));
  const len = buf.readUInt32LE(12);
  const g = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const node = (g.nodes || []).find((n: { name?: string }) => n.name === nodeName);
  assert.ok(node && node.mesh !== undefined, `Node ${nodeName} ada di warkop.glb`);
  assert.ok(!node.rotation || Math.abs(node.rotation[3]) > 0.9999, `${nodeName} tanpa rotasi (AABB sahih)`);
  const t = node.translation ?? [0, 0, 0];
  const s = node.scale ?? [1, 1, 1];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of g.meshes[node.mesh].primitives) {
    const acc = g.accessors[p.attributes.POSITION];
    for (let k = 0; k < 3; k++) {
      const a = acc.min[k] * s[k] + t[k];
      const b = acc.max[k] * s[k] + t[k];
      min[k] = Math.min(min[k], a, b);
      max[k] = Math.max(max[k], a, b);
    }
  }
  return { min, max };
}

const WK_COUNTER_TOP = readWarkopBox('WK_CounterTop');
const WK_COUNTER_BODY = readWarkopBox('WK_CounterBody');
const WK_BACKWALL_LOW = readWarkopBox('WK_BackWall_Low');
const SITI_H = ACTORS.find((a) => a.id === 'buSiti')!.height;
/** Setengah lebar kartu billboard PENUH (bukan hanya siluet): `height * ACTOR_W / ACTOR_H / 2`. */
const SITI_CARD_HALF = (SITI_H * ACTOR_W) / ACTOR_H / 2;
/** Meter per piksel rig (kanvas ACTOR_H px = tinggi kartu). Posisi rig dari `nusantara.ts` (berdiri, bob 0). */
const SITI_M_PER_PX = SITI_H / ACTOR_H;
const RIG = { chin: 428, shoulder: 474, handRest: 600, hip: 638 } as const;
const rigWorldY = (soleY: number, px: number) => soleY + (ACTOR_SOLE_Y - px) * SITI_M_PER_PX;
const CARD_MARGIN = 0.1;

function sitiCounterFrames(): Array<{ f: number; shotId: string }> {
  const spot = EP02_SPOTS.warkop.buSiti;
  const out: Array<{ f: number; shotId: string }> = [];
  for (const s of SHOTS) {
    if (locationAt(s.from) !== 'warkop') continue;
    for (let f = s.from; f < s.to; f += 2) {
      if (dist3(actorPositionAt('buSiti', f), spot) < 1e-6) out.push({ f, shotId: s.id });
    }
  }
  return out;
}

test('U-1 kasir Bu Siti: kartu billboard penuh (yaw menghadap kamera) >= 0,10 m di belakang WK_CounterTop di semua kamera Warkop', () => {
  const [sx, , sz] = EP02_SPOTS.warkop.buSiti;
  const backEdge = WK_COUNTER_TOP.min[2];
  const frames = sitiCounterFrames();
  assert.ok(frames.length > 100, `Bu Siti berdiri di kasir di banyak frame Warkop (dapat ${frames.length})`);
  for (const { f, shotId } of frames) {
    const cam = sampleCamera(CAMS, f);
    const yaw = Math.atan2(cam.pos[0] - sx, cam.pos[2] - sz);
    // Ujung kartu yang berputar: (sx ± cos(yaw)·h, sz ∓ sin(yaw)·h). Ujung terdepan = sz + |sin(yaw)|·h.
    const frontZ = sz + Math.abs(Math.sin(yaw)) * SITI_CARD_HALF;
    assert.ok(
      frontZ <= backEdge - CARD_MARGIN,
      `${shotId} f${f}: ujung kartu Bu Siti z=${frontZ.toFixed(3)} terlalu dekat tepi belakang konter z=${backEdge.toFixed(3)} (yaw ${((yaw * 180) / Math.PI).toFixed(1)}°)`,
    );
    assert.ok(cam.pos[2] > WK_COUNTER_TOP.max[2], `${shotId} f${f}: kamera di depan konter`);
  }
  // Selubung: yaw sampai 25° pun tetap >= 5 cm di belakang tepi belakang konter dan bebas dinding belakang.
  const yaw25 = Math.sin((25 * Math.PI) / 180) * SITI_CARD_HALF;
  assert.ok(sz + yaw25 <= backEdge - 0.05, 'selubung yaw 25° bebas konter');
  assert.ok(sz - yaw25 >= WK_BACKWALL_LOW.max[2] + 0.05, 'selubung yaw 25° bebas WK_BackWall_Low');
});

test('U-1 kasir Bu Siti: pinggang & tangan di atas konter, garis potong konter di bawah pinggul dari setiap kamera', () => {
  const [, sy, sz] = EP02_SPOTS.warkop.buSiti;
  const top = WK_COUNTER_TOP.max[1];
  const hipY = rigWorldY(sy, RIG.hip);
  assert.ok(hipY - top >= 0.03 && hipY - top <= 0.15, `pinggang sedikit di atas konter (dapat ${(hipY - top).toFixed(3)} m)`);
  assert.ok(rigWorldY(sy, RIG.handRest) - top >= 0.08, 'tangan rest >= 8 cm di atas permukaan konter (tidak "tenggelam")');
  assert.ok(rigWorldY(sy, RIG.shoulder) - top >= 0.25, 'bahu >= 25 cm di atas konter');
  assert.ok(rigWorldY(sy, RIG.chin) - top >= 0.35, 'dagu >= 35 cm di atas konter (tidak terbenam sampai leher)');

  const front = WK_COUNTER_TOP.max[2];
  const back = WK_COUNTER_TOP.min[2];
  for (const { f, shotId } of sitiCounterFrames()) {
    const cam = sampleCamera(CAMS, f);
    const [, cy, cz] = cam.pos;
    // Tinggi garis potong di bidang Bu Siti oleh tepi depan & belakang permukaan konter (proyeksi sinar kamera).
    const occFront = top + (top - cy) * ((front - sz) / (cz - front));
    const occBack = top + (top - cy) * ((back - sz) / (cz - back));
    const occ = Math.max(occFront, occBack);
    assert.ok(occ <= hipY - 0.04, `${shotId} f${f}: garis potong konter y=${occ.toFixed(3)} menutupi pinggang y=${hipY.toFixed(3)}`);
  }
});

test('U-1 panggung kasir 3D: telapak Bu Siti tepat di puncak platform, tersembunyi di balik konter, bebas konter & dinding', () => {
  const [sx, sy, sz] = EP02_SPOTS.warkop.buSiti;
  const { platform, step } = EP02_SITI_COUNTER_RISER;
  assert.ok(Math.abs(platform.center[1] + platform.size[1] / 2 - sy) < 0.006, 'puncak platform = telapak (< 6 mm)');
  assert.ok(Math.abs(platform.center[1] - platform.size[1] / 2) < 1e-6, 'platform menapak lantai y=0');
  assert.ok(Math.abs(step.center[1] - step.size[1] / 2) < 1e-6, 'anak tangga menapak lantai y=0');
  assert.ok(Math.abs(platform.center[0] - sx) < 1e-6 && Math.abs(platform.center[2] - sz) < 1e-6, 'platform berpusat di spot');
  for (const b of [platform, step]) {
    assert.ok(b.center[2] + b.size[2] / 2 <= WK_COUNTER_TOP.min[2] - 0.05, 'platform >= 5 cm di belakang konter');
    assert.ok(b.center[2] - b.size[2] / 2 >= WK_BACKWALL_LOW.max[2] + 0.05, 'platform >= 5 cm di depan dinding belakang');
    assert.ok(b.center[1] + b.size[1] / 2 <= WK_COUNTER_BODY.max[1] - 0.3, 'platform tersembunyi di balik badan konter');
  }
  assert.ok(platform.size[0] >= 0.6 && platform.size[2] >= 0.4, 'tapak cukup untuk kedua kaki rig');
  assert.ok(step.center[0] - step.size[0] / 2 >= platform.center[0] + platform.size[0] / 2 - 1e-6, 'anak tangga di samping platform');
});
