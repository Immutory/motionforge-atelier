import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPoint, sampleCamera, screenSpeedPx, type CamPose } from '../engine/core/camera';
import {
  EP02_B5_ARRIVE_FRAME,
  EP02_B5_SPRINT_START,
  EP02_PLAK_FRAME,
  EP02_PROJECTOR_RUN_FRAME,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_OYEN_KB_ARRIVE_FRAME,
  EP02_OYEN_WALK_KB_FROM,
  EP02_SITI_OFFSCREEN_FROM,
  EP02_SITI_WALK1,
  EP02_SITI_WALK3,
  EP02_TASKBAR_ALARM_FRAME,
  actorPositionAt,
  oyenPositionAt,
} from '../productions/ep02-bang-utoh/cast';
import { SUB_TOP_PX } from '../productions/ep02-bang-utoh/Production';
import {
  B5_DOLLY_IN,
  CAMS,
  DOF,
  DOF_TARGET,
  B4_SITI_COUNTER,
  EP02_B1_STAGE_FROM,
  EP02_B1_WIFI_FROM,
  EP02_FLASH_FRAMES,
  EP02_OYEN_EYE_LAB,
  EP02_OYEN_EYE_REPLAY,
  EP02_R2_PUNCH_FRAME,
  EP02_R2_PUNCH_SCALE,
  EP02_R3_SPLIT_FRAME,
  EP02_U9_IMPACT_FRAME,
  FOREGROUND,
  KICKS,
  SHOTS,
} from '../productions/ep02-bang-utoh/shots';
import { EP02_SPOTS, locationAt } from '../productions/ep02-bang-utoh/set';
import { BEATS, EP02_FRAMES, WORDS, lineById, nonverbalOf } from '../productions/ep02-bang-utoh/words';

type V = [number, number, number];

const B5 = BEATS[4];
const B6 = BEATS[5];
const shot = (id: string) => {
  const s = SHOTS.find((x) => x.id === id);
  assert.ok(s, `shot ${id} ada`);
  return s;
};
const cam = (f: number) => sampleCamera(CAMS, f);
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub = (a: readonly number[], b: readonly number[]): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const camSpeed = (f: number) => dist(cam(f).pos, cam(f + 1).pos) + dist(cam(f).look, cam(f + 1).look);
const cutFrames = new Set(CAMS.filter((k) => k.cut).map((k) => k.frame));
/** Skala bingkai (tinggi frame di bidang fokus); rasio dua pose = berapa kali lebih rapat. */
const frameHeightAt = (p: CamPose, target: V) => 2 * projectPoint(p, target).depth * Math.tan((p.fov * Math.PI) / 360);

test('CAMS terurut, key B5 per frame, dan SHOTS menyambung dengan ID lama dipertahankan', () => {
  for (let i = 1; i < CAMS.length; i++) assert.ok(CAMS[i].frame > CAMS[i - 1].frame, `CAMS terurut di #${i}`);
  for (const id of [
    'b1-macro-laptop', 'b1-stage-warkop', 'b2-utoh-panik', 'b2-coffee-dolly', 'b2-stage-siti', 'b3-stage-plak',
    'b3-macro-48', 'b3-stage-heran', 'b3-cu-protes', 'b4-stage-nyerah', 'b4-oyen-walk-kb', 'b4-macro-0error',
    'b4-stage-girang', 'b4-siti-konsultan', 'b4-taskbar-0658', 'b5-establish', 'b5-sprint', 'b6-stage-lab',
    'b6-utoh-smug', 'b6-rara-run', 'b6-enter-klak', 'b6-screen-mmmm', 'b6-stage-nol', 'b6-cu-blank',
    'b7-cu-tanya', 'b7-replay-sepia', 'b7-oyen-meong', 'b7-rara-nilai', 'b7-rara-ngulang', 'b7-cu-outro',
  ]) {
    shot(id);
    assert.ok(id in DOF, `DOF punya entri ${id}`);
  }
  for (const s of SHOTS) assert.ok(s.id in DOF, `DOF punya entri ${s.id}`);
  assert.equal(SHOTS[SHOTS.length - 1].to, EP02_FRAMES);
});

test('B5: satu gerakan kontinu crane-down -> dolly, kecepatan tidak pernah ~0 dan tanpa lompatan di batas shot', () => {
  const est = shot('b5-establish');
  const sprint = shot('b5-sprint');
  assert.equal(est.from, B5.from);
  assert.equal(est.to, sprint.from);
  assert.equal(sprint.from, EP02_B5_SPRINT_START);
  assert.equal(sprint.to, B6.from);
  for (let f = B5.from + 1; f < B6.from; f++) assert.ok(!cutFrames.has(f), `tidak ada cut di tengah B5 (f${f})`);

  // Kecepatan (pos + look, m/f) tidak pernah mendekati 0 sampai tiba di Gedung FIK.
  let minV = Infinity;
  for (let f = B5.from; f <= EP02_B5_ARRIVE_FRAME; f++) minV = Math.min(minV, camSpeed(f));
  assert.ok(minV > 0.01, `kecepatan minimum B5 ${minV.toFixed(4)} m/f`);

  // Percepatan halus di mana pun di B5, termasuk tepat di batas b5-establish -> b5-sprint.
  for (let f = B5.from + 1; f < B6.from - 1; f++) {
    const jump = Math.abs(camSpeed(f) - camSpeed(f - 1));
    assert.ok(jump < 0.02, `lompatan kecepatan B5 f${f}: ${jump.toFixed(4)} m/f`);
  }
  const b = sprint.from;
  const across = Math.abs(camSpeed(b) - camSpeed(b - 1));
  assert.ok(across < 0.006, `batas establish/sprint mulus (${across.toFixed(4)} m/f)`);
  assert.ok(Math.abs(cam(b - 1).pos[1] - cam(b).pos[1]) < 0.05, 'crane masih turun mulus melewati batas');

  // Crane-down: tinggi kamera turun monoton dari awal sampai dolly.
  for (let f = B5.from; f < B6.from - 1; f++) assert.ok(cam(f + 1).pos[1] <= cam(f).pos[1] + 1e-9, `crane naik lagi di f${f}`);
  assert.ok(cam(B5.from).pos[1] - cam(B6.from - 1).pos[1] > 0.6, 'crane benar-benar turun');
});

test('B5: Utoh dan Oyen tetap di dalam frame (profil Oyen baru, jarak maks 2,62 m)', () => {
  for (let f = B5.from; f < B6.from; f++) {
    const p = cam(f);
    const u = actorPositionAt('bangUtoh', f);
    const o = oyenPositionAt(f);
    const pu = projectPoint(p, [u[0], 1.0, u[2]]);
    const po = projectPoint(p, [o[0], 0.25, o[2]]);
    assert.ok(Math.abs(pu.x) < 0.75 && Math.abs(pu.y) < 0.8, `Utoh di frame f${f}: ${pu.x.toFixed(2)},${pu.y.toFixed(2)}`);
    assert.ok(Math.abs(po.x) < 0.75 && Math.abs(po.y) < 0.8, `Oyen di frame f${f}: ${po.x.toFixed(2)},${po.y.toFixed(2)}`);
  }
});

test('v6.0 Law #1 & #3: ZERO slow-zoom creep (creepRate === 0), B5_DOLLY_IN === 0, dan horizon lurus roll === 0', () => {
  assert.equal(B5_DOLLY_IN, 0, 'B5 tracking horizontal murni tanpa dolly slow zoom');
  for (const k of CAMS) {
    assert.equal(k.creepRate, 0, `key f${k.frame} harus creepRate === 0 (nol slow zoom!)`);
    assert.equal(k.pose.roll, 0, `key f${k.frame} harus roll === 0 (horizon lurus!)`);
  }
  for (let f = 0; f < EP02_FRAMES; f++) {
    assert.equal(cam(f).roll, 0, `frame f${f} roll harus 0`);
  }
});

test('v6.1 G3: B1 selevel mata = insert laptop+Oyen -> cut medium Utoh (setelah "semalem") -> cut stage (2f sebelum "ngungsi")', () => {
  const findWord = (t: string) => WORDS.find((w) => w.speaker === 'bangUtoh' && w.text.startsWith(t))!;
  assert.equal(shot('b1-macro-laptop').to, EP02_B1_WIFI_FROM);
  assert.equal(shot('b1-utoh-wifi').from, EP02_B1_WIFI_FROM);
  assert.equal(shot('b1-utoh-wifi').to, EP02_B1_STAGE_FROM);
  assert.ok(cutFrames.has(EP02_B1_WIFI_FROM) && cutFrames.has(EP02_B1_STAGE_FROM), 'B1 tersusun dari hard cut');
  // cut medium jatuh di jeda setelah "semalem" dan sebelum "WiFi"
  assert.ok(EP02_B1_WIFI_FROM > Math.round(findWord('semalem').end * 30) - 1);
  assert.ok(EP02_B1_WIFI_FROM < Math.round(findWord('WiFi').start * 30));
  const lead = Math.round(findWord('ngungsi').start * 30) - EP02_B1_STAGE_FROM;
  assert.ok(lead >= 0 && lead <= 3, `cut stage ${lead}f sebelum "ngungsi"`);
  // Setiap shot B1 diam mantap
  for (let f = 0; f < BEATS[1].from - 1; f++) {
    if (cutFrames.has(f + 1)) continue;
    assert.ok(camSpeed(f) < 1e-6, `B1 f${f} harus diam mantap`);
  }
  // Insert: layar laptop (ERROR 47) besar & utuh
  const lap = EP02_SPOTS.warkop.laptop;
  const xs = [-0.17, 0.17].map((dx) => projectPoint(cam(0), [lap[0] + dx, lap[1] + 0.15, lap[2] - 0.08]).x);
  assert.ok(Math.max(...xs) <= 0.92 && Math.min(...xs) >= -0.92 && Math.max(...xs) - Math.min(...xs) >= 0.75, 'layar ERROR 47 utuh & dominan');
  // Medium WiFi: Utoh utuh di frame
  const u = actorPositionAt('bangUtoh', EP02_B1_WIFI_FROM + 40);
  for (const [dx, y] of [[-0.36, 0], [0.36, 0], [-0.36, 1.45], [0.36, 1.45]]) {
    const q = projectPoint(cam(EP02_B1_WIFI_FROM + 40), [u[0] + dx, y, u[2]]);
    assert.ok(Math.abs(q.x) <= 0.92 && q.y <= 0.9, `Utoh utuh di b1-utoh-wifi (${q.x.toFixed(2)}, ${q.y.toFixed(2)})`);
  }
  // Tiga cut B1 bukan jump cut: tiap pasang beda arah >= 30 derajat atau ukuran >= 20%
  for (const cf of [EP02_B1_WIFI_FROM, EP02_B1_STAGE_FROM]) {
    const a = cam(cf - 1);
    const b = cam(cf);
    const fa = norm(sub(a.look, a.pos));
    const fb = norm(sub(b.look, b.pos));
    const ang = (Math.acos(Math.min(1, fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2])) * 180) / Math.PI;
    const size = frameHeightAt(b, lap as V) / frameHeightAt(a, lap as V);
    assert.ok(ang >= 30 || size >= 1.2 || size <= 1 / 1.2, `cut f${cf} terlalu mirip: ${ang.toFixed(1)} derajat, x${size.toFixed(2)}`);
  }

  // Impact kicks & calm ending settle
  for (const impact of [EP02_PLAK_FRAME, EP02_PROJECTOR_RUN_FRAME, EP02_U9_IMPACT_FRAME]) {
    assert.ok(KICKS.some((k) => k.frame === impact), `kick wajib di impact f${impact}`);
  }
  assert.ok(cutFrames.has(EP02_PROJECTOR_RUN_FRAME));
  for (let f = EP02_U9_IMPACT_FRAME; f < EP02_FRAMES - 1; f++) {
    assert.ok(camSpeed(f) < 1e-6, `ending settle f${f} harus diam mantap sebelum hard-cut loop`);
  }
});

test('v6.0 Law #2: semua deliberate glide smootherstep 16–32f tanpa yoyo arah, dan hold settled = 0 px/f', () => {
  // Setiap deliberate glide (di luar B5 tracking) berdurasi 16-32f dan tidak meloncat kasar antar-frame
  for (let i = 1; i < CAMS.length; i++) {
    const k = CAMS[i];
    if (k.cut || (k.frame > B5.from && k.frame < B6.from)) continue;
    const span = k.frame - Math.max(k.frame - (k.glide ?? 24), CAMS[i - 1].frame);
    assert.ok(span >= 16 && span <= 32, `glide key f${k.frame} = ${span}f`);
    // Verifikasi kurva jarak monoton (tidak yoyo bolak-balik di dalam satu glide)
    const startF = k.frame - span;
    const d0 = dist(cam(startF).pos, cam(startF).look);
    const d1 = dist(cam(k.frame).pos, cam(k.frame).look);
    const sign = Math.sign(d1 - d0);
    if (Math.abs(d1 - d0) > 0.05) {
      for (let f = startF; f < k.frame; f++) {
        const step = dist(cam(f + 1).pos, cam(f + 1).look) - dist(cam(f).pos, cam(f).look);
        assert.ok(step * sign >= -1e-4, `glide f${k.frame} yoyo di f${f}`);
      }
    }
  }
  // v6.1: SEMUA glide <= 25 px/f @720p. Satu-satunya pengecualian tercatat: B5 tracking subjek berlari (dites terpisah).
  for (let f = 0; f < EP02_FRAMES - 1; f++) {
    if (cutFrames.has(f + 1)) continue;
    if (f >= B5.from && f < B6.from) continue;
    const v = screenSpeedPx(cam(f), cam(f + 1));
    assert.ok(v <= 25, `glide > 25 px/f di ${shotAt(f).id} f${f} = ${v.toFixed(1)} px/f`);
  }
});

test('R2: clean punch-in +18% tepat di jeda tajam sebelum "nol"', () => {
  const pause = nonverbalOf('R2', 1);
  assert.equal(pause.kind, 'pause');
  assert.ok(EP02_R2_PUNCH_FRAME >= pause.startFrame && EP02_R2_PUNCH_FRAME < pause.endFrame, `punch f${EP02_R2_PUNCH_FRAME} di jeda ${pause.startFrame}-${pause.endFrame}`);
  assert.equal(shot('b6-cu-blank').to, EP02_R2_PUNCH_FRAME);
  assert.equal(shot('b6-punch-nol').from, EP02_R2_PUNCH_FRAME);
  assert.ok(cutFrames.has(EP02_R2_PUNCH_FRAME), 'punch-in adalah cut bersih');
  const before = cam(EP02_R2_PUNCH_FRAME - 1);
  const after = cam(EP02_R2_PUNCH_FRAME);
  assert.ok(dist(before.pos, after.pos) < 0.01 && dist(before.look, after.look) < 1e-6, 'sumbu & posisi kamera sama');
  const target = DOF_TARGET['b6-punch-nol'] as V;
  const scale = frameHeightAt(before, target) / frameHeightAt(after, target);
  assert.ok(Math.abs(scale - EP02_R2_PUNCH_SCALE) < 0.02, `punch-in ${(scale * 100 - 100).toFixed(1)}%`);
  assert.equal(after.roll, 0);
});

test('R3: batas two-shot "Nilai A" -> tight deadpan "Kamu minggu depan" di desahan tengah', () => {
  const sigh = nonverbalOf('R3', 0);
  assert.equal(sigh.kind, 'sigh');
  assert.ok(EP02_R3_SPLIT_FRAME >= sigh.startFrame && EP02_R3_SPLIT_FRAME < sigh.endFrame, `split f${EP02_R3_SPLIT_FRAME} di desahan ${sigh.startFrame}-${sigh.endFrame}`);
  assert.equal(shot('b7-rara-nilai').to, EP02_R3_SPLIT_FRAME);
  assert.equal(shot('b7-rara-ngulang').from, EP02_R3_SPLIT_FRAME);
  assert.equal(shot('b7-rara-nilai').from, lineById('R3').startFrame - 6);
  // Shot A two-shot: Rara & Oyen di dalam frame. Shot B: Rara jauh lebih rapat, Oyen tidak jadi subjek.
  const a = cam(EP02_R3_SPLIT_FRAME - 1);
  const b = cam(EP02_R3_SPLIT_FRAME);
  const rara: V = [EP02_SPOTS.lab.raraAtDesk[0], 1.15, EP02_SPOTS.lab.raraAtDesk[2]];
  const oyen: V = [2.3, 1.04, -2.55];
  for (const pt of [rara, oyen]) {
    const q = projectPoint(a, pt);
    assert.ok(Math.abs(q.x) < 0.75 && Math.abs(q.y) < 0.8, 'two-shot memuat Rara & Oyen');
  }
  assert.ok(frameHeightAt(a, rara) / frameHeightAt(b, rara) > 1.75, 'shot B tight');
  const qr = projectPoint(b, rara);
  assert.ok(Math.abs(qr.x) < 0.3, 'Rara di tengah shot B');
});

test('foreground depth framing: setiap entri FOREGROUND (jika ada) di 0,35–0,52× jarak fokus', () => {
  for (const id of Object.keys(FOREGROUND)) {
    const s = shot(id);
    const fg = FOREGROUND[id];
    assert.ok(fg, `${id} punya foreground`);
    assert.ok((DOF[id] ?? 0) > 0, `${id} DOF aktif agar foreground blur`);
    const focus = DOF_TARGET[id] as V;
    for (const f of [Math.max(s.from, fg.from), s.to - 1]) {
      const p = cam(f);
      const ratio = projectPoint(p, fg.at).depth / projectPoint(p, focus).depth;
      assert.ok(ratio >= 0.35 && ratio <= 0.52, `${id} f${f} rasio foreground ${ratio.toFixed(2)}`);
      const qs = projectPoint(p, focus);
      assert.ok(Math.abs(qs.x) < 0.3, `${id} subjek di tengah (${qs.x.toFixed(2)})`);
      assert.ok(Math.abs(projectPoint(p, fg.at).x) > 0.9, `${id} pusat foreground di luar tepi`);
    }
  }
});

test('match-cut B4->B5 dan eye-line match Replay -> b7-oyen-meong + frame flash', () => {
  // Alarm macro push-in cepat sampai frame terakhir, lalu cut energi ke Utoh di depan Warkop.
  assert.equal(shot('b4-taskbar-0658').from, EP02_TASKBAR_ALARM_FRAME);
  assert.equal(shot('b4-taskbar-0658').to, B5.from);
  assert.ok(cutFrames.has(B5.from));
  const u = actorPositionAt('bangUtoh', B5.from);
  const q = projectPoint(cam(B5.from), [u[0], 1.2, u[2]]);
  assert.ok(Math.abs(q.x) < 0.25 && Math.abs(q.y) < 0.3, 'Utoh di tengah frame pertama B5');
  assert.ok(KICKS.some((k) => k.frame === B5.from));

  // Eye-line: mata Oyen Replay (laptop Warkop) di titik layar & ukuran yang sama dengan mata Oyen Lab.
  assert.equal(shot('b7-replay-sepia').from, EP02_REPLAY_FROM);
  assert.equal(shot('b7-replay-sepia').to, EP02_REPLAY_TO);
  assert.equal(shot('b7-oyen-meong').from, EP02_REPLAY_TO);
  const eyeReplay = EP02_OYEN_EYE_REPLAY;
  const eyeLab = EP02_OYEN_EYE_LAB;
  assert.ok(Math.abs(eyeReplay[0] - -1.26) < 1e-9 && Math.abs(eyeReplay[2] - 0.48) < 1e-9, 'posisi Oyen Replay = Production.tsx');
  const a = projectPoint(cam(EP02_REPLAY_TO - 1), eyeReplay);
  const b = projectPoint(cam(EP02_REPLAY_TO), eyeLab);
  assert.ok(Math.abs(a.x - b.x) < 0.02 && Math.abs(a.y - b.y) < 0.02, `eye-line ${a.x.toFixed(3)},${a.y.toFixed(3)} vs ${b.x.toFixed(3)},${b.y.toFixed(3)}`);
  assert.ok(Math.abs(a.depth / b.depth - 1) < 0.02, 'ukuran mata sama');
  assert.deepEqual([...EP02_FLASH_FRAMES], [EP02_REPLAY_FROM, EP02_REPLAY_TO]);
});

// ---------------------------------------------------------------------------------------------
// v6.1 U-1: Bu Siti masuk penuh / keluar penuh di seluruh Warkop (B1–B4)
// ---------------------------------------------------------------------------------------------

/** Siluet tubuh Bu Siti (torso + gelas di tangan, dikalibrasi dari still f40/f600) dan tinggi kartu. */
const SITI_HALF_W = 0.24;
const SITI_H = 1.72;
type Fit = 'in' | 'out' | 'edge';
/** Kartu billboard (yaw menghadap kamera) diproyeksikan; `in` = utuh horizontal & kepala di bawah tepi atas. */
function sitiFit(f: number): { fit: Fit; x0: number; x1: number; y0: number; y1: number } {
  const c = cam(f);
  const p = actorPositionAt('buSiti', f);
  const yaw = Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]);
  const rx = Math.cos(yaw) * SITI_HALF_W;
  const rz = -Math.sin(yaw) * SITI_HALF_W;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of [-1, 1]) {
    for (const h of [0, SITI_H]) {
      const q = projectPoint(c, [p[0] + s * rx, p[1] + h, p[2] + s * rz]);
      assert.ok(q.depth > 0.2, `Bu Siti di belakang/menempel kamera f${f}`);
      xs.push(q.x);
      ys.push(q.y);
    }
  }
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const out = x0 > 1 || x1 < -1 || y0 > 1 || y1 < -1;
  const inside = x0 >= -1 && x1 <= 1 && y1 <= 1;
  return { fit: out ? 'out' : inside ? 'in' : 'edge', x0, x1, y0, y1 };
}
const inCounter = (p: readonly number[]) => p[0] > -2.34 && p[0] < 2.34 && p[2] > -1.95 && p[2] < -1.09;
const shotAt = (f: number) => SHOTS.find((s) => f >= s.from && f < s.to)!;

test('v6.1 U-1: setiap frame Warkop kartu Bu Siti utuh di dalam ATAU utuh di luar frame (kecuali jalan keluar b4-stage-nyerah)', () => {
  // Satu-satunya jendela "edge" yang disengaja: Bu Siti BERJALAN keluar tepi kanan di b4-stage-nyerah.
  const exitFrom = EP02_SITI_WALK3[0];
  const exitTo = EP02_SITI_OFFSCREEN_FROM;
  assert.ok(exitTo <= shot('b4-stage-nyerah').to, 'Bu Siti sudah keluar penuh sebelum dolly b4-oyen-walk-kb');
  const edges: number[] = [];
  for (let f = 0; f < B5.from; f++) {
    const r = sitiFit(f);
    if (r.fit === 'edge') {
      assert.ok(
        f >= exitFrom && f < exitTo,
        `${shotAt(f).id} f${f}: Bu Siti kissing edge x=[${r.x0.toFixed(2)},${r.x1.toFixed(2)}] y1=${r.y1.toFixed(2)}`,
      );
      edges.push(f);
    }
    // Lintasan memotong volume konter -> wajib tak terlihat (di luar frame).
    if (inCounter(actorPositionAt('buSiti', f))) assert.equal(r.fit, 'out', `f${f}: Bu Siti terlihat di dalam volume konter`);
  }
  // Keluar kanan terbaca jelas: bergerak monoton ke kanan, kaki di atas blok subtitle (label y = SUB_TOP_PX).
  assert.ok(edges.length > 0, 'keluar frame terjadi di jendela jalan');
  const subTopNdc = 1 - (2 * SUB_TOP_PX) / 1920;
  for (let i = 0; i < edges.length; i++) {
    const r = sitiFit(edges[i]);
    assert.equal(shotAt(edges[i]).id, 'b4-stage-nyerah');
    assert.ok(r.x0 > 0, `keluar lewat tepi KANAN f${edges[i]}`);
    assert.ok(r.y0 > subTopNdc, `kaki Bu Siti tertutup subtitle saat keluar f${edges[i]} (y0=${r.y0.toFixed(3)})`);
    if (i > 0) assert.ok(r.x0 >= sitiFit(edges[i - 1]).x0 - 1e-9, `keluar frame mundur di f${edges[i]}`);
  }
  // Sejak OFFSCREEN_FROM sampai kembali di b4-stage-girang: tak terlihat sama sekali (termasuk dolly f876–894).
  for (let f = exitTo; f < shot('b4-stage-girang').from; f++) assert.equal(sitiFit(f).fit, 'out', `f${f} Bu Siti masih terlihat`);
  // WALK1 (B2) seluruhnya di luar layar.
  for (let f = EP02_SITI_WALK1[0]; f < EP02_SITI_WALK1[1]; f++) assert.equal(sitiFit(f).fit, 'out', `WALK1 f${f} terlihat`);
});

test('v6.1 U-1: insert B1 tidak menampakkan Bu Siti; medium-wide B1 (sejak frame pertama), stage & medium Warkop memuatnya utuh', () => {
  for (let f = 0; f < EP02_B1_WIFI_FROM; f++) assert.equal(sitiFit(f).fit, 'out', `B1 insert f${f} menampakkan Bu Siti`);
  for (const id of ['b1-utoh-wifi', 'b1-stage-warkop', 'b2-stage-siti', 'b3-stage-plak', 'b3-stage-heran', 'b4-stage-girang', 'b4-siti-konsultan']) {
    const s = shot(id);
    for (let f = s.from; f < s.to; f++) assert.equal(sitiFit(f).fit, 'in', `${id} f${f} Bu Siti tidak utuh`);
  }
  // b3-stage-heran: cut + push-in (bukan pan yang menyapunya masuk dari tepi), <= 25 px/f.
  const heran = shot('b3-stage-heran');
  assert.ok(cutFrames.has(heran.from), 'b3-stage-heran masuk lewat cut');
  for (let f = heran.from; f < heran.to - 1; f++) {
    const v = screenSpeedPx(cam(f), cam(f + 1));
    assert.ok(v <= 25, `b3-stage-heran f${f} = ${v.toFixed(1)} px/f`);
  }
});

test('v6.1: B4_SITI_COUNTER frontal (pos.x = look.x, yaw 0, roll 0), Bu Siti utuh <= 0,35 NDC & teks MENU WARKOP utuh', () => {
  const w = EP02_SPOTS.warkop.buSiti;
  assert.equal(B4_SITI_COUNTER.pos[0], B4_SITI_COUNTER.look[0], 'yaw 0: pos.x = look.x');
  assert.equal(B4_SITI_COUNTER.look[2], w[2]);
  assert.equal(B4_SITI_COUNTER.roll, 0);
  const settled = cam(shot('b4-siti-konsultan').to - 1);
  assert.deepEqual(settled.pos, B4_SITI_COUNTER.pos);
  const q = projectPoint(settled, [w[0], w[1] + 1.2, w[2]]);
  assert.ok(Math.abs(q.x) <= 0.35, `Bu Siti dekat sumbu (x=${q.x.toFixed(3)})`);
  // Teks papan menu (WK_MenuTitle/Line1/Line2: x -1,36..-0,34, y 1,74..2,24, z -2,66) utuh di frame.
  for (const x of [-1.36, -0.34]) {
    for (const y of [1.74, 2.24]) {
      const t = projectPoint(settled, [x, y, -2.66]);
      assert.ok(Math.abs(t.x) <= 0.95 && Math.abs(t.y) <= 0.95, `teks MENU WARKOP terpotong (${t.x.toFixed(2)}, ${t.y.toFixed(2)})`);
    }
  }
});

test('v6.1: preset cahaya, DOF, dan titik fokus hanya boleh berubah di hard cut (nol pop di tengah gerak/hold)', () => {
  for (let i = 1; i < SHOTS.length; i++) {
    const a = SHOTS[i - 1];
    const b = SHOTS[i];
    if (cutFrames.has(b.from)) continue;
    assert.equal(b.light, a.light, `preset cahaya berubah tanpa cut di f${b.from} (${a.id} -> ${b.id})`);
    assert.equal(DOF[b.id] ?? 0, DOF[a.id] ?? 0, `DOF berubah tanpa cut di f${b.from} (${a.id} -> ${b.id})`);
    if ((DOF[b.id] ?? 0) > 0) {
      assert.deepEqual(DOF_TARGET[b.id], DOF_TARGET[a.id], `titik fokus berubah tanpa cut di f${b.from} (${a.id} -> ${b.id})`);
    }
  }
});

/** Siluet Oyen duduk (dikalibrasi dari still f1480: lebar ±0,11 m + ekor, tinggi telinga 0,38 m); jalan menyamping lebih lebar. */
const OYEN_HALF_W = 0.13;
const OYEN_WALK_HALF_W = 0.24;
const OYEN_H = 0.42;
/** Batas "tangen": tokoh di dalam harus >= 0,03 NDC dari tepi kiri/kanan/atas. */
const EDGE_IN = 0.97;
const EP02_B4_OYEN_WALK = [EP02_OYEN_WALK_KB_FROM, EP02_OYEN_KB_ARRIVE_FRAME] as const;
const replayOyen = (): V => [-1.26, EP02_SPOTS.warkop.laptop[1], 0.48];

test('v6.1: Si Oyen utuh di dalam ATAU utuh di luar frame di setiap shot (kecuali foreground blur terdaftar & B5)', () => {
  const hidden = new Set(['b4-taskbar-0658']); // Production menyembunyikan Oyen di macro alarm
  for (let f = 0; f < EP02_FRAMES; f++) {
    const s = shotAt(f);
    if (hidden.has(s.id) || s.id in FOREGROUND) continue;
    if (f >= B5.from && f < B6.from) continue; // tracking B5: dites "Utoh dan Oyen tetap di dalam frame"
    const c = cam(f);
    const p = f >= EP02_REPLAY_FROM && f < EP02_REPLAY_TO ? replayOyen() : (oyenPositionAt(f) as V);
    const walking = f >= EP02_B4_OYEN_WALK[0] && f < EP02_B4_OYEN_WALK[1];
    const hw = walking ? OYEN_WALK_HALF_W : OYEN_HALF_W;
    const yaw = Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const k of [-1, 1]) {
      for (const h of [0, OYEN_H]) {
        const q = projectPoint(c, [p[0] + k * Math.cos(yaw) * hw, p[1] + h, p[2] - k * Math.sin(yaw) * hw]);
        assert.ok(q.depth > 0.1, `Oyen di belakang kamera f${f}`);
        xs.push(q.x);
        ys.push(q.y);
      }
    }
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const out = x0 > 1 || x1 < -1 || y0 > 1 || y1 < -1;
    const inside = x0 >= -EDGE_IN && x1 <= EDGE_IN && y1 <= EDGE_IN && y0 >= -1;
    assert.ok(out || inside, `${s.id} f${f}: Oyen terpotong tepi x=[${x0.toFixed(2)},${x1.toFixed(2)}] y=[${y0.toFixed(2)},${y1.toFixed(2)}]`);
  }
});

test('v6.1: glide lintas ruang lama diganti hard cut + push-in pendek (b4-oyen-walk-kb, b4-siti-konsultan, b6-rara-run)', () => {
  for (const id of ['b4-oyen-walk-kb', 'b4-siti-konsultan', 'b6-rara-run']) {
    const s = shot(id);
    assert.ok(cutFrames.has(s.from), `${id} masuk lewat hard cut`);
    // Push-in monoton (anti-yoyo) lalu diam mantap
    const push = CAMS.find((k) => k.frame > s.from && k.frame < s.to && !k.cut);
    assert.ok(push && push.path === 'dolly', `${id} punya push-in dolly`);
    for (let f = s.from; f < push.frame; f++) {
      assert.ok(dist(cam(f + 1).pos, cam(f + 1).look) <= dist(cam(f).pos, cam(f).look) + 1e-9, `${id} push-in yoyo f${f}`);
    }
    for (let f = push.frame; f < s.to - 1; f++) assert.ok(camSpeed(f) < 1e-6, `${id} settle f${f} diam mantap`);
  }
  // b4-oyen-walk-kb: cut terjadi sebelum Oyen mulai berjalan; Bu Siti sudah keluar penuh.
  assert.ok(shot('b4-oyen-walk-kb').from < EP02_B4_OYEN_WALK[0]);
  assert.ok(shot('b4-oyen-walk-kb').from >= EP02_SITI_OFFSCREEN_FROM);
});

/** Teks papan set: MENU WARKOP (WK_MenuTitle/Line1/Line2) & LAB KOMPUTER FIK 2.1 (KP2_SignMain_Title). */
const SIGN_TEXT: Record<'warkop' | 'lab', V[]> = {
  warkop: [[-1.36, 1.66, -2.66], [-0.34, 1.66, -2.66], [-1.36, 2.26, -2.66], [-0.34, 2.26, -2.66]],
  lab: [[-1.02, 3.0, -3.7], [0.99, 3.0, -3.7], [-1.02, 3.22, -3.7], [0.99, 3.22, -3.7]],
};
/**
 * Temuan lama (pra-v6.1, belum diputuskan): CU/insert di depan papan yang memotong teks papan di tepi frame.
 * Dicatat eksplisit supaya shot lain (termasuk semua shot yang diubah v6.1) tidak boleh menambah kasus baru.
 */
const KNOWN_SIGN_CROP = new Set([
  'b2-utoh-panik', 'b2-coffee-dolly', 'b3-macro-48', 'b3-cu-protes', 'b4-oyen-walk-kb', 'b4-macro-0error',
  'b6-rara-run', 'b7-replay-sepia', 'b7-rara-nilai', 'b7-cu-outro',
]);

test('v6.1: teks papan MENU WARKOP / LAB KOMPUTER FIK 2.1 utuh di dalam atau utuh di luar frame (kecuali temuan lama tercatat)', () => {
  for (let f = 0; f < EP02_FRAMES; f++) {
    const s = shotAt(f);
    if (KNOWN_SIGN_CROP.has(s.id)) continue;
    const loc = locationAt(f);
    const key = s.id === 'b7-replay-sepia' || loc === 'warkop' ? 'warkop' : loc === 'lab' ? 'lab' : undefined;
    if (!key) continue;
    const q = SIGN_TEXT[key].map((p) => projectPoint(cam(f), p));
    if (q.some((v) => v.depth <= 0)) continue;
    const xs = q.map((v) => v.x);
    const ys = q.map((v) => v.y);
    const inside = q.every((v) => Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1);
    const out = Math.min(...xs) > 1 || Math.max(...xs) < -1 || Math.min(...ys) > 1 || Math.max(...ys) < -1;
    assert.ok(inside || out, `${s.id} f${f}: teks papan ${key} terpotong tepi frame`);
  }
});

/**
 * Siluet jongkok Utoh TERUKUR dari still f880 resolusi penuh (pose lama): tepi kanan sliver kepala/headphone di x=90 px
 * dengan pusat kartu di x=-670 px dan skala 1912 px/m -> ±0,40 m (+ margin 0,02) dari pusat kartu, y 0,3..1,25 m.
 */
const UTOH_SQUAT_HALF_W = 0.42;
const UTOH_SQUAT_Y: readonly [number, number] = [0.3, 1.25];

test('v6.1: b4-oyen-walk-kb + b4-macro-0error: Utoh jongkok (siluet terukur) 100% di luar frame; Oyen & laptop 48 utuh', () => {
  const from = shot('b4-oyen-walk-kb').from;
  const to = shot('b4-macro-0error').to;
  assert.ok(cutFrames.has(from), 'cut di awal b4-oyen-walk-kb');
  for (let f = from; f < to; f++) {
    const c = cam(f);
    const p = actorPositionAt('bangUtoh', f);
    const yaw = Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]);
    const xs: number[] = [];
    for (const k of [-1, 1]) {
      for (const y of UTOH_SQUAT_Y) {
        const q = projectPoint(c, [p[0] + k * Math.cos(yaw) * UTOH_SQUAT_HALF_W, y, p[2] - k * Math.sin(yaw) * UTOH_SQUAT_HALF_W]);
        xs.push(q.x);
      }
    }
    assert.ok(Math.max(...xs) < -1.03 || Math.min(...xs) > 1.03, `f${f}: sliver Utoh di tepi frame (x=[${Math.min(...xs).toFixed(2)},${Math.max(...xs).toFixed(2)}])`);
    const lap = EP02_SPOTS.warkop.laptop;
    for (const [dx, dy, dz] of [[-0.17, 0.03, -0.06], [0.17, 0.03, -0.06], [-0.17, 0.29, -0.13], [0.17, 0.29, -0.13]]) {
      const q = projectPoint(c, [lap[0] + dx, lap[1] + dy, lap[2] + dz]);
      assert.ok(Math.abs(q.x) <= 0.95 && Math.abs(q.y) <= 0.95, `f${f}: layar laptop terpotong`);
    }
  }
});

/**
 * v6.1 G3 "kamera harus konsisten": seluruh episode selevel mata. Tunduk (look ke bawah) & tengadah <= 12 derajat,
 * tinggi kamera <= 1,9 m. Pengecualian bernama: crane B5 (b5-establish / b5-sprint) <= 3,0 m, tetap <= 12 derajat.
 */
const MAX_TILT_DEG = 12;
const MAX_CAM_Y = 1.9;
const CRANE_IDS = new Set(['b5-establish', 'b5-sprint']);
const CRANE_MAX_Y = 3.0;

test('v6.1 G3: konsistensi kamera selevel mata di setiap frame (tunduk/tengadah <= 12 derajat, tinggi <= 1,9 m; crane B5 <= 3,0 m)', () => {
  for (let f = 0; f < EP02_FRAMES; f++) {
    const c = cam(f);
    const d = sub(c.look, c.pos);
    const tilt = (Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI;
    const id = shotAt(f).id;
    assert.ok(Math.abs(tilt) <= MAX_TILT_DEG, `${id} f${f}: ${tilt < 0 ? 'tunduk' : 'tengadah'} ${Math.abs(tilt).toFixed(1)} derajat > ${MAX_TILT_DEG}`);
    const maxY = CRANE_IDS.has(id) ? CRANE_MAX_Y : MAX_CAM_Y;
    assert.ok(c.pos[1] <= maxY, `${id} f${f}: tinggi kamera ${c.pos[1].toFixed(2)} m > ${maxY} m`);
  }
});
