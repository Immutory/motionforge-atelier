import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectPoint, sampleCamera, type Vec3 } from '../engine';
import {
  EP02_OYEN_STEP1_FRAME,
  EP02_OYEN_STEP2_FRAME,
  EP02_PLAK_FRAME,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_SCREEN_OK_FRAME,
  actorPositionAt,
  oyenPositionAt,
} from '../productions/ep02-bang-utoh/cast';
import { EP02_CUP4_POS } from '../productions/ep02-bang-utoh/Production';
import { EP02_SPOTS } from '../productions/ep02-bang-utoh/set';
import {
  CAMS,
  EP02_PLAK_ROLL_FROM,
  EP02_R2_CHUCKLE_FROM,
  EP02_R3_SPLIT_FRAME,
  SHOTS,
} from '../productions/ep02-bang-utoh/shots';
import { BEATS, lineById } from '../productions/ep02-bang-utoh/words';

type Box = { min: Vec3; max: Vec3 };

function readGlbBox(relPath: string, nodeName: string): Box {
  const buf = readFileSync(join(process.cwd(), relPath));
  const len = buf.readUInt32LE(12);
  const g = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const node = (g.nodes || []).find((n: { name?: string }) => n.name === nodeName);
  assert.ok(node && node.mesh !== undefined, `Node ${nodeName} ada di ${relPath}`);
  const t: Vec3 = node.translation ?? [0, 0, 0];
  const s: Vec3 = node.scale ?? [1, 1, 1];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
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

/** Uji perpotongan segmen horizontal XZ (bidang billboard terproyeksi yaw) dengan AABB furnitur. */
function segmentIntersectsBoxXZ(a: [number, number], b: [number, number], box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const checks: [number, number][] = [
    [-dx, a[0] - box.min[0]],
    [dx, box.max[0] - a[0]],
    [-dz, a[1] - box.min[2]],
    [dz, box.max[2] - a[1]],
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

/** Segmen lebar tubuh aktual billboard yang diputar `yaw` menghadap kamera aktif. */
function billboardSegmentXZ(pos: Vec3, camPos: Vec3, halfWidth: number): [[number, number], [number, number]] {
  const yaw = Math.atan2(camPos[0] - pos[0], camPos[2] - pos[2]);
  const rx = Math.cos(yaw) * halfWidth;
  const rz = -Math.sin(yaw) * halfWidth;
  return [
    [pos[0] - rx, pos[2] - rz],
    [pos[0] + rx, pos[2] + rz],
  ];
}

const WK_BENCH = readGlbBox('public/sets/warkop.glb', 'WK_BenchL_Top');
const WK_TABLE = readGlbBox('public/sets/warkop.glb', 'WK_TableL_Top');
const WK_COUNTER = readGlbBox('public/sets/warkop.glb', 'WK_CounterTop');
const KG_BENCH = readGlbBox('public/sets/kampung.glb', 'KG_WK_BenchL_Top');
const KP_DESK = readGlbBox('public/sets/kampus.glb', 'KP2_LectDesk');

const shot = (id: string) => {
  const s = SHOTS.find((x) => x.id === id);
  assert.ok(s, `shot ${id} ada`);
  return s;
};
const midOf = (id: string) => {
  const s = shot(id);
  return Math.floor((s.from + s.to) / 2);
};

test('anti-clipping 3D yaw billboard: Warkop (Utoh & Bu Siti vs bangku & meja kiri)', () => {
  const b4 = BEATS[3];
  const macroIds = new Set(['b1-macro-laptop', 'b3-macro-48', 'b4-taskbar-0658']);
  for (const s of SHOTS) {
    if (s.to > b4.to || macroIds.has(s.id)) continue;
    for (const f of [s.from, Math.floor((s.from + s.to) / 2), s.to - 1]) {
      const cam = sampleCamera(CAMS, f);
      const uPos = actorPositionAt('bangUtoh', f);
      const uProj = projectPoint(cam, [uPos[0], 1.0, uPos[2]]);
      if (uProj.depth > 0.2 && Math.abs(uProj.x) <= 1.3) {
        const uSeg = billboardSegmentXZ(uPos, cam.pos, 0.34);
        assert.ok(
          !segmentIntersectsBoxXZ(uSeg[0], uSeg[1], WK_BENCH),
          `Utoh menembus WK_BenchL_Top di ${s.id} f${f} (pos=${uPos.map((v) => v.toFixed(2))}, cam=${cam.pos.map((v) => v.toFixed(2))})`,
        );
        assert.ok(
          !segmentIntersectsBoxXZ(uSeg[0], uSeg[1], WK_TABLE),
          `Utoh menembus WK_TableL_Top di ${s.id} f${f}`,
        );
      }

      const sPos = actorPositionAt('buSiti', f);
      const sProj = projectPoint(cam, [sPos[0], 1.0, sPos[2]]);
      if (sProj.depth > 0.2 && Math.abs(sProj.x) <= 1.3) {
        const sSeg = billboardSegmentXZ(sPos, cam.pos, 0.34);
        assert.ok(
          !segmentIntersectsBoxXZ(sSeg[0], sSeg[1], WK_TABLE),
          `Bu Siti menembus WK_TableL_Top di ${s.id} f${f} (pos=${sPos.map((v) => v.toFixed(2))})`,
        );
        assert.ok(
          !segmentIntersectsBoxXZ(sSeg[0], sSeg[1], WK_BENCH),
          `Bu Siti menembus WK_BenchL_Top di ${s.id} f${f}`,
        );
      }
    }
  }
});

test('anti-clipping 3D yaw billboard: Kampung B5 (Utoh & Oyen vs bangku Warkop)', () => {
  const b5 = BEATS[4];
  for (let f = b5.from; f < b5.to; f += 2) {
    const cam = sampleCamera(CAMS, f);
    const uSeg = billboardSegmentXZ(actorPositionAt('bangUtoh', f), cam.pos, 0.34);
    const oSeg = billboardSegmentXZ(oyenPositionAt(f), cam.pos, 0.24);
    assert.ok(!segmentIntersectsBoxXZ(uSeg[0], uSeg[1], KG_BENCH), `Utoh menembus KG_WK_BenchL_Top di f${f}`);
    assert.ok(!segmentIntersectsBoxXZ(oSeg[0], oSeg[1], KG_BENCH), `Oyen menembus KG_WK_BenchL_Top di f${f}`);
  }
  // Di b5-establish (f awal B5), Utoh & Oyen berdiri terpisah bersih (tidak saling tumpang tindih)
  const u0 = actorPositionAt('bangUtoh', b5.from);
  const o0 = oyenPositionAt(b5.from);
  assert.ok(Math.hypot(u0[0] - o0[0], u0[2] - o0[2]) >= 0.85, 'Utoh dan Oyen terpisah bersih di depan Warkop');
});

test('anti-clipping 3D yaw billboard: Lab FIK (Mbak Rara vs KP2_LectDesk di semua shot Lab)', () => {
  const b6 = BEATS[5];
  for (const s of SHOTS) {
    if (s.from < b6.from || s.id === 'b7-replay-sepia') continue;
    for (const f of [s.from, Math.floor((s.from + s.to) / 2), s.to - 1]) {
      const cam = sampleCamera(CAMS, f);
      const rPos = actorPositionAt('rara', f);
      const rSeg = billboardSegmentXZ(rPos, cam.pos, 0.44);
      assert.ok(
        !segmentIntersectsBoxXZ(rSeg[0], rSeg[1], KP_DESK),
        `Mbak Rara menembus KP2_LectDesk di ${s.id} f${f} (pos=${rPos.map((v) => v.toFixed(2))}, cam=${cam.pos.map((v) => v.toFixed(2))})`,
      );
    }
  }
});

test('safe-framing NDC [-0.88, +0.88]: semua subjek utama & layar laptop utuh di setiap shot kunci', () => {
  const checkIn = (label: string, f: number, pt: Vec3, limitX = 0.88, limitY = 0.92) => {
    const q = projectPoint(sampleCamera(CAMS, f), pt);
    assert.ok(q.depth > 0.2, `${label} f${f} di belakang kamera`);
    assert.ok(
      Math.abs(q.x) <= limitX && Math.abs(q.y) <= limitY,
      `${label} f${f} keluar margin aman: ndc=(${q.x.toFixed(2)}, ${q.y.toFixed(2)})`,
    );
  };

  // B1 & B4 stage Warkop: Utoh, Oyen, & Bu Siti di balik konter semua masuk utuh dalam margin aman!
  for (const id of ['b1-stage-warkop', 'b4-stage-nyerah', 'b4-stage-girang']) {
    const f = midOf(id);
    const u = actorPositionAt('bangUtoh', f);
    const o = oyenPositionAt(f);
    const s = actorPositionAt('buSiti', f);
    checkIn(`${id} Utoh`, f, [u[0], 1.15, u[2]]);
    checkIn(`${id} Oyen`, f, [o[0], o[1] + 0.25, o[2]]);
    checkIn(`${id} BuSiti-counter`, f, [s[0], s[1] + 1.25, s[2]], 0.86);
  }
  // B4 Bu Siti di balik konter: torso/bahu >= 0,25 m di atas WK_CounterTop (y=0,97 m) & utuh di b4-siti-konsultan!
  const sitiCounter = EP02_SPOTS.warkop.buSiti;
  const sitiShoulderY = sitiCounter[1] + 0.98;
  assert.ok(
    sitiShoulderY - WK_COUNTER.max[1] >= 0.25,
    `bahu Bu Siti harus >= 0,25 m di atas konter (dapat ${(sitiShoulderY - WK_COUNTER.max[1]).toFixed(2)} m)`,
  );
  checkIn('b4-siti-konsultan BuSiti', shot('b4-siti-konsultan').to - 8, [sitiCounter[0], sitiCounter[1] + 1.2, sitiCounter[2]], 0.35);

  for (const f of [midOf('b2-stage-siti'), EP02_PLAK_FRAME, EP02_PLAK_FRAME + 14]) {
    const u = actorPositionAt('bangUtoh', f);
    const s = actorPositionAt('buSiti', f);
    const o = oyenPositionAt(f);
    checkIn('stage-3shot Utoh', f, [u[0], 1.15, u[2]]);
    checkIn('stage-3shot BuSiti', f, [s[0], 1.15, s[2]]);
    checkIn('stage-3shot Oyen', f, [o[0], o[1] + 0.25, o[2]]);
  }
  // B3 b3-stage-heran: 3D Pan Kanan mendarat di wajah polos Bu Siti
  const fHeran = shot('b3-stage-heran').to - 8;
  const sHeran = actorPositionAt('buSiti', fHeran);
  checkIn('b3-stage-heran BuSiti', fHeran, [sHeran[0], 1.18, sHeran[2]], 0.35);

  // Tension roll #1 mulai STRICTLY setelah S1 ("Ngopi dulu.") selesai!
  assert.ok(EP02_PLAK_ROLL_FROM >= lineById('S1').endFrame + 2, 'roll #1 tidak boleh dimulai saat S1 masih bicara');

  // Macro laptop + Oyen (B4 & Replay Sepia): tepi kiri layar & sisi kanan kepala Oyen utuh 100%!
  for (const f of [EP02_OYEN_STEP1_FRAME, EP02_OYEN_STEP2_FRAME, EP02_SCREEN_OK_FRAME + 10, EP02_REPLAY_FROM + 10]) {
    const lap = EP02_SPOTS.warkop.laptop;
    checkIn('macro laptop-left', f, [lap[0] - 0.15, lap[1] + 0.13, lap[2] - 0.08]);
    checkIn('macro oyen-right-ear', f, [-1.26 + 0.2, lap[1] + 0.34, 0.48]);
  }

  // B6 Lab & R2 chuckle & B7 Rara/Oyen/Outro
  checkIn('b6-rara-run Rara', midOf('b6-rara-run'), [EP02_SPOTS.lab.raraAtDesk[0], 1.15, EP02_SPOTS.lab.raraAtDesk[2]]);
  checkIn('b6-rara-run Oyen', midOf('b6-rara-run'), [EP02_SPOTS.lab.oyen[0], 1.02, EP02_SPOTS.lab.oyen[2]]);
  checkIn('b6-rara-chuckle Rara', EP02_R2_CHUCKLE_FROM + 8, [EP02_SPOTS.lab.raraAtDesk[0], 1.15, EP02_SPOTS.lab.raraAtDesk[2]], 0.35);
  checkIn('b7-oyen-meong Oyen', EP02_REPLAY_TO + 15, [EP02_SPOTS.lab.oyen[0], 1.04, EP02_SPOTS.lab.oyen[2]], 0.35);
  checkIn('b7-rara-ngulang Rara', EP02_R3_SPLIT_FRAME + 15, [EP02_SPOTS.lab.raraAtDesk[0], 1.15, EP02_SPOTS.lab.raraAtDesk[2]], 0.35);
  // Di b7-rara-ngulang, Oyen bersih di luar frame (tidak terpotong separuh wajah secara canggung!)
  const qOyenNgulang = projectPoint(sampleCamera(CAMS, EP02_R3_SPLIT_FRAME + 15), [EP02_SPOTS.lab.oyen[0], 1.04, EP02_SPOTS.lab.oyen[2]]);
  assert.ok(Math.abs(qOyenNgulang.x) > 1.05, `Oyen masih masuk pinggir frame b7-rara-ngulang: x=${qOyenNgulang.x.toFixed(2)}`);
});

test('gelas kopi ke-4 tidak pernah overlap secara layar 2D dengan Si Oyen di B4 & Replay Sepia', () => {
  for (const f of [EP02_OYEN_STEP1_FRAME, EP02_OYEN_STEP2_FRAME, EP02_SCREEN_OK_FRAME + 10, EP02_REPLAY_FROM + 12]) {
    const cam = sampleCamera(CAMS, f);
    const cup = projectPoint(cam, [EP02_CUP4_POS[0], EP02_CUP4_POS[1] + 0.045, EP02_CUP4_POS[2]]);
    const oyenPos: Vec3 = f >= EP02_REPLAY_FROM && f < EP02_REPLAY_TO ? [-1.26, EP02_SPOTS.warkop.laptop[1], 0.48] : oyenPositionAt(f);
    const oyen = projectPoint(cam, [oyenPos[0], oyenPos[1] + 0.22, oyenPos[2]]);
    assert.ok(
      Math.abs(cup.x - oyen.x) > 0.65,
      `gelas ke-4 terlalu dekat Oyen di f${f}: |${cup.x.toFixed(2)} - ${oyen.x.toFixed(2)}|`,
    );
  }
});
