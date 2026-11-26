import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASPECT_9_16,
  CAT_PRESETS,
  KAMPUNG_SPOT_META,
  KOST_SPOT_META,
  LIGHTS,
  POST_HYBRID_25D,
  TONE,
  WARKOP_SPOT_META,
  actorFramingSubjects,
  actorHandWorldPos,
  actorHeadCenterY,
  applyHandheldBreathe,
  applyScalarLocalHeadroom,
  cameraBasis,
  checkBillboardSweep,
  checkCounterVisibility,
  checkScreenOcclusion,
  checkSightline,
  computeBillboardTiltX,
  computeEyeGeom,
  drawActor,
  drawCat,
  filterSetBoxes,
  findSetBox,
  kickOffset,
  orbitArc,
  orbitTo,
  resolve25DView,
  sampleCamera,
  seatCardPos,
  softClampLocalLight,
  storyDolly,
  syncShadeUniforms,
  viewAxisFocus,
  whipPan,
  type CamPose,
  type NamedBox,
  type Vec3,
} from '../engine';
import { loadSetBoxes } from '../engine/sets/boxesNode';

function mockCanvasCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop,
    restore: noop,
    clearRect: noop,
    fillRect: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    ellipse: noop,
    roundRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    strokeText: noop,
    fillText: noop,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
  } as unknown as CanvasRenderingContext2D;
}

test('v3.0 shade.ts: uLocalLight aktif default 1.0 & Reinhard soft-clamp selalu di bawah ambang bloom 1.0', () => {
  syncShadeUniforms(LIGHTS.night);
  assert.equal(TONE.uLocalLight.value, 1.0);
  assert.equal(softClampLocalLight(0), 0);
  assert.ok(softClampLocalLight(1.0) > 0.5 && softClampLocalLight(1.0) < 0.6);
  // Bahkan lampu lokal super ekstrem (raw = 100) tetap < 1.0 (0% over-bloom washout)
  assert.ok(softClampLocalLight(100) < 0.95);
  assert.ok(POST_HYBRID_25D.ink.strength < 0.6);
});

test('v3.0 2.5D character rig: resolve25DView 8-arah (termasuk backThreeQuarter), seatCardPos, tiltX, & actorHandWorldPos', () => {
  const pos: Vec3 = [0, 0, 0];
  const cam: Vec3 = [0, 1.5, 4];
  assert.equal(resolve25DView(pos, 0, cam).view, 'front');
  assert.equal(resolve25DView(pos, 50, cam).view, 'threeQuarter');
  assert.equal(resolve25DView(pos, 90, cam).view, 'side');
  assert.equal(resolve25DView(pos, 130, cam).view, 'backThreeQuarter');
  assert.equal(resolve25DView(pos, 180, cam).view, 'back');

  // Render backThreeQuarter pada manusia & kucing tidak crash
  const ctx = mockCanvasCtx();
  drawActor(ctx, 'bangUtoh', { face: 'neutral', view: 'backThreeQuarter', facing: 0.72 });
  drawCat(ctx, CAT_PRESETS.oyen, { face: 'smug', view: 'backThreeQuarter', stance: 'sit', facing: -0.72 });
  drawCat(ctx, CAT_PRESETS.oyen, { face: 'smug', view: 'backThreeQuarter', stance: 'stand', facing: 0.72 });

  // seatCardPos menggeser kartu +2 cm di depan tepi kursi arah kamera
  const shifted = seatCardPos([0, 0, 0], 0.17, [0, 1.4, 3]);
  assert.ok(Math.abs(shifted[2] - 0.19) < 1e-4);
  assert.equal(shifted[1], 0);

  // computeBillboardTiltX = 0 pada eye-level (|pitch| <= 12° terhadap mata/dada), aktif teredam (<= 24°) pada high-angle
  assert.equal(computeBillboardTiltX([0, 0, 0], [0, 1.5, 4], 1.96), 0);
  const highTilt = computeBillboardTiltX([0, 0, 0], [0, 3.2, 2.5], 1.96);
  assert.ok(highTilt < 0 && Math.abs((highTilt * 180) / Math.PI) <= 24.01);

  // actorHandWorldPos: posisi dunia 3D tangan kanan bergerak sesuai yaw & tetap di ketinggian wajar (0,8..1,6 m)
  const handPos = actorHandWorldPos(
    'bangUtoh',
    { face: 'happy', stance: 'stand', rightArm: 'hold' },
    1,
    [0, 0, 0],
    [0, 1.5, 4],
    1.96,
    { forwardOffset: 0.04 },
  );
  assert.ok(handPos[1] > 0.7 && handPos[1] < 1.6, `y tangan harus wajar, dapat ${handPos[1]}`);
  assert.ok(handPos[2] > 0.03, 'forwardOffset mendorong prop 3D ke depan bidang kartu');
});

test('v3.0 camera.ts: camera-local harmonic kickOffset, whipPan, analitis orbitTo, storyDolly, viewAxisFocus, & handheld loop-safe', () => {
  const poseYaw90: CamPose = { pos: [4, 1.5, 0], look: [0, 1.5, 0], fov: 40, roll: 0 };
  const kicks = [{ frame: 10, strength: 0.08, length: 8 }];
  const s0 = kickOffset(kicks, 10, poseYaw90);
  const sEnd = kickOffset(kicks, 18, poseYaw90);
  // Pada kamera menghadap -X (yaw 90°), sumbu right adalah -Z -> getaran lateral berada di dz, bukan dx!
  assert.ok(Math.abs(s0.dz ?? 0) > 0.02, `dz harus aktif pada kamera yaw 90°, dapat ${s0.dz}`);
  assert.ok(Math.abs(s0.dx) < 1e-6, `dx sepanjang forward harus ~0 pada yaw 90°, dapat ${s0.dx}`);
  assert.equal(sEnd.dx, 0);
  assert.equal(sEnd.dz, 0);

  // whipPan akselerasi cepat lalu duduk tepat di target
  const pA: CamPose = { pos: [0, 1.5, 4], look: [-1, 1.5, 0], fov: 40, roll: 0 };
  const pB: CamPose = { pos: [0, 1.5, 4], look: [1, 1.5, 0], fov: 40, roll: 0 };
  const whip = whipPan(0, pA, pB, 10);
  assert.ok(sampleCamera(whip, 5).look[0] > 0.7, 'whipPan melesat cepat di paruh pertama');
  assert.deepEqual(sampleCamera(whip, 10).look, pB.look);

  // Analitis orbitTo: 2 keyframe, radius konstan di tengah glide
  const c: Vec3 = [0, 1.2, 0];
  const oStart: CamPose = { pos: [0, 1.5, 3], look: c, fov: 40, roll: 0 };
  const oEnd: CamPose = { pos: [3, 1.5, 0], look: c, fov: 40, roll: 0 };
  const orb = orbitTo(0, oStart, oEnd, 20, c);
  assert.equal(orb.length, 2);
  const mid = sampleCamera(orb, 10);
  assert.ok(Math.abs(Math.hypot(mid.pos[0], mid.pos[2]) - 3) < 1e-3, 'radius orbitTo konstan');

  // storyDolly & viewAxisFocus
  const sd = storyDolly(0, pA, pB, 20);
  assert.equal(sampleCamera(sd, 30).look[0], pB.look[0]);
  assert.ok(Math.abs(viewAxisFocus([0, 1.5, 4], [0, 1.5, 0], [0.5, 1.5, 1]) - 3) < 1e-6);

  // Handheld loop-safe: frame 0 === frame 90, dan otomatis mati pada shot makro (< 0.85 m)
  const h0 = applyHandheldBreathe(pA, 0, 1, 90);
  const h90 = applyHandheldBreathe(pA, 90, 1, 90);
  assert.ok(Math.hypot(h0.pos[0] - h90.pos[0], h0.pos[1] - h90.pos[1], h0.pos[2] - h90.pos[2]) < 1e-9);
  const macro: CamPose = { pos: [0, 1.0, 0.5], look: [0, 1.0, 0], fov: 30, roll: 0 };
  assert.deepEqual(applyHandheldBreathe(macro, 15, 1, 90), macro);
});

test('v3.0 spatial.ts: tiered/tilted sweep, perspective checkCounterVisibility, 5-ray sightline + ignoreGlass, & checkScreenOcclusion', () => {
  // 1. 3D tilted quad sweep: di y = 0 kaki aman, tapi tiltX ke belakang membuat kepala menyentuh dinding belakang
  const backWall: NamedBox = { name: 'BackWall', min: [-2, 1.0, -0.5], max: [2, 2.6, -0.25] };
  const upright = checkBillboardSweep([0, 0, 0], 0.8, 1.9, [0, 1.5, 3], [backWall], 0.04, { tiltX: 0 });
  assert.equal(upright.ok, true);
  const tilted = checkBillboardSweep([0, 0, 0], 0.8, 1.9, [0, 3.5, 2], [backWall], 0.04, { tiltX: -0.35 });
  assert.equal(tilted.ok, false, 'tiltX ke belakang harus terdeteksi menyapu dinding belakang');

  // 2. Perspective checkCounterVisibility: kamera rendah memenggal bahu penjual yang ortografisnya lolos
  const orthoOk = checkCounterVisibility([0, 0.30, 18.4], 1.96, 0.965, 0.32);
  assert.equal(orthoOk.ok, true);
  const lowCamFail = checkCounterVisibility([0, 0.30, 18.4], 1.96, 0.965, 0.32, [0, 0.55, 16.0], 17.25);
  assert.equal(lowCamFail.ok, false, 'kamera rendah 0,55 m harus terdeteksi memenggal bahu penjual di balik konter');
  assert.ok(lowCamFail.effectiveCounterY > 0.965);

  // 3. 5-ray checkSightline + ignoreGlass otomatis
  const glass: NamedBox = { name: 'KG_Grb_BakmieTio_EtGlass_N', min: [-1, 0.9, 1.9], max: [1, 1.6, 2.0] };
  const edgePole: NamedBox = { name: 'EdgePole', min: [0.09, 0, 1.9], max: [0.16, 2.5, 2.0] };
  const singleRay = checkSightline([0, 1.4, 4], [0, 1.4, 0], [glass, edgePole]);
  assert.equal(singleRay.ok, true, 'single ray pusat meleset dari tiang tepi dan mengabaikan kaca');
  const fiveRay = checkSightline([0, 1.4, 4], [0, 1.4, 0], [glass, edgePole], { targetRadius: 0.25 });
  assert.equal(fiveRay.ok, false, '5-ray face cone menangkap tiang tepi di radius wajah');
  assert.deepEqual(fiveRay.suggestedHideNames, ['EdgePole']);

  // 4. actorFramingSubjects & checkScreenOcclusion
  const cam: CamPose = { pos: [0, 1.4, 4], look: [0, 1.4, 0], fov: 40, roll: 0 };
  const [speaker, blocker] = actorFramingSubjects(
    [
      { name: 'Speaker', position: [0, 0, 0], height: 1.96 },
      { name: 'Blocker', position: [0.05, 0, 1.5], height: 1.96 },
    ],
    cam.pos,
  );
  const occ = checkScreenOcclusion(cam, speaker, [blocker], ASPECT_9_16, 0.2);
  assert.equal(occ.ok, false, 'karakter depan di jalur lensa harus terdeteksi menutupi wajah pembicara');
});

test('v3.0 Blender sets & boxes.json manifests: SpotMeta cocok 100% dengan AABB aktual, dandang pendek, pallet permanen, whiteboard terpisah, & preset suara ebot', () => {
  const wk = loadSetBoxes('warkop');
  const ks = loadSetBoxes('kost');
  const kp = loadSetBoxes('kampus');
  const kg = loadSetBoxes('kampung');

  // 1. Warkop: WK_CounterTop maxY === 0.97 & WK_CounterPallet baked at 0.44
  const wkCounter = findSetBox(wk, 'WK_CounterTop');
  const wkPallet = findSetBox(wk, 'WK_CounterPallet');
  assert.ok(wkCounter && Math.abs(wkCounter.max[1] - (WARKOP_SPOT_META.counterKeeper?.counterTopY ?? 0)) < 0.005);
  assert.ok(wkPallet && Math.abs(wkPallet.max[1] - 0.44) < 0.005);

  // 2. Kost: KS_DeskTop === 0.79 & KS_ChairSeat === 0.49
  const ksDesk = findSetBox(ks, 'KS_DeskTop');
  const ksChair = findSetBox(ks, 'KS_ChairSeat');
  assert.ok(ksDesk && Math.abs(ksDesk.max[1] - (KOST_SPOT_META.desk?.tableTopY ?? 0)) < 0.005);
  assert.ok(ksChair && Math.abs(ksChair.max[1] - (KOST_SPOT_META.desk?.seatY ?? 0)) < 0.005);

  // 3. Kampus: KP2_Whiteboard terpisah bersih dari KP2_ProjectorMount
  const wb = findSetBox(kp, 'KP2_Whiteboard');
  const proj = findSetBox(kp, 'KP2_ProjectorMount');
  assert.ok(wb && wb.max[2] < -3.0, `KP2_Whiteboard harus di dinding belakang z<-3, dapat maxZ=${wb?.max[2]}`);
  assert.ok(proj && proj.min[2] > -1.0, `KP2_ProjectorMount harus di plafon tengah, dapat minZ=${proj?.min[2]}`);

  // 4. Kampung: dandang pendek-lebar (bibir 1.205 m), serokan tinggi dihapus, 3 pallet permanen baked, ukuran < 35 MB
  const dandangRim = findSetBox(kg, 'KG_Grb_BakmieTio_DandangRim');
  assert.ok(dandangRim && Math.abs(dandangRim.max[1] - 1.205) < 0.005);
  assert.equal(findSetBox(kg, 'KG_Grb_BakmieTio_SerokanHandle'), undefined);
  assert.ok(findSetBox(kg, 'KG_Grb_BakmieTio_VendorPallet'));
  assert.ok(findSetBox(kg, 'KG_Grb_EsBuahYuni_VendorPallet'));
  assert.ok(findSetBox(kg, 'KG_WK_CounterPallet'));
  assert.equal(KAMPUNG_SPOT_META.bakmieTioVendor?.counterTopY, 0.965);
  assert.equal(KAMPUNG_SPOT_META.bakmieTioVendor?.tableTopY, 0.92);
  const kgMb = statSync(join(process.cwd(), 'public', 'sets', 'kampung.glb')).size / 1e6;
  assert.ok(kgMb < 35, `kampung.glb harus < 35 MB, dapat ${kgMb.toFixed(2)} MB`);

  // 5. Preset suara ebot tersedia di assets/voices/presets.json
  const presets = JSON.parse(readFileSync(join(process.cwd(), 'assets', 'voices', 'presets.json'), 'utf8')) as Record<string, unknown>;
  assert.ok('ebot' in presets, 'presets.json harus memiliki entri ebot');

  // 6. Kalibrasi SpotMeta bedside & halteKampus + flag transparent di boxes.json
  const ksMattress = findSetBox(ks, 'KS_Mattress');
  assert.ok(ksMattress && Math.abs(ksMattress.max[1] - (KOST_SPOT_META.bedside?.seatY ?? 0)) < 0.005);
  const kgHalteBench = findSetBox(kg, 'KG_P5_Halte_Bench');
  assert.ok(kgHalteBench && Math.abs(kgHalteBench.max[1] - (KAMPUNG_SPOT_META.halteKampus?.seatY ?? 0)) < 0.005);
  assert.equal(findSetBox(wk, 'WK_KerupukJar')?.transparent, true);
  assert.equal(findSetBox(kp, 'KP2_WinGlass')?.transparent, undefined);
});

test('v3.0.1 audit regresi: scalar headroom, OBB tilt sweep, 360° orbitArc, handheld long-video, & transparent sightline', () => {
  // 1. Scalar local-light headroom: tidak pernah tembus ceiling 0.96 & jaga rasio rona warna
  const over = applyScalarLocalHeadroom([1.05, 0.9, 0.8], [0.5, 0.5, 0.5], 0.96);
  assert.deepEqual(over, [1.05, 0.9, 0.8], 'permukaan >= 0.96 tidak boleh ditambah localLight (anti-bloom leak)');
  const warm = applyScalarLocalHeadroom([0.85, 0.45, 0.25], [0.4, 0.4, 0.4], 0.95);
  assert.ok(Math.max(...warm) <= 0.9501);
  assert.ok(Math.abs((warm[0] - 0.85) - (warm[1] - 0.45)) < 1e-6, 'tambahan skalar menjaga rona warna tanpa hue-shift');

  // 2. computeBillboardTiltX: 0 pada kucing eye-level & 0 pada low-angle makro (dy <= 0)
  assert.equal(computeBillboardTiltX([0, 0, 0], [0, 1.1, 1.4], 0.54), 0, 'kucing eye-level tidak boleh miring');
  assert.equal(computeBillboardTiltX([0, 0.3, 0], [0, 0.97, 2.28], 1.96), 0, 'aktor tinggi pada makro rendah tidak miring ke depan');
  assert.equal(
    computeBillboardTiltX([0, 0, 0], [0, 1.4, 2.0], 0.54, 24, [0, 1.35, 0]),
    0,
    'kamera datar (|camPitch| <= 12°) selalu mengembalikan 0',
  );

  // 3. computeEyeGeom & actorHeadCenterY sinkron
  const eg = computeEyeGeom(350, 300, 250, 'almond', 0.5);
  assert.ok(eg.eyeScaleX(1) < 1 && eg.eyeScaleX(-1) === 1);
  assert.ok(actorHeadCenterY(1.96, { stance: 'sitCross' }) < actorHeadCenterY(1.96, { stance: 'stand' }) - 0.4);
  const [sitCrossSubj] = actorFramingSubjects([{ name: 'u', position: [0, 0, 0], height: 1.96, pose: { stance: 'sitCross' } }]);
  assert.ok(Math.abs(sitCrossSubj.center[1] - actorHeadCenterY(1.96, { stance: 'sitCross' })) < 1e-6);

  // 4. orbitArc 360° (45° -> 405°): 2 keyframe tunggal, berputar penuh 360° searah tanpa balik arah di midpoint
  const orb360 = orbitArc(0, [0, 1.2, 0], 3, 45, 405, 1.5, 40, 40);
  assert.equal(orb360.length, 2);
  const q1 = sampleCamera(orb360, 10);
  const q2 = sampleCamera(orb360, 20);
  const q3 = sampleCamera(orb360, 30);
  const ang1 = Math.atan2(q1.pos[0], q1.pos[2]);
  const ang2 = Math.atan2(q2.pos[0], q2.pos[2]);
  const ang3 = Math.atan2(q3.pos[0], q3.pos[2]);
  assert.ok(Math.abs(Math.hypot(q2.pos[0], q2.pos[2]) - 3) < 1e-3);
  // Di f20 (t=0.5), harus berada di 225° (-135°), dan di f10 vs f30 berada di sisi berlawanan (bukan menyapu setengah busur yang sama!)
  assert.ok(Math.abs(ang2 + (3 * Math.PI) / 4) < 0.05, `tengah orbit 45->405 harus di -135°, dapat ${(ang2 * 180) / Math.PI}°`);
  assert.ok(Math.hypot(q1.pos[0] - q3.pos[0], q1.pos[2] - q3.pos[2]) > 2.0, 'f10 dan f30 tidak boleh simetris membalik arah');
  assert.ok(Number.isFinite(ang1) && Number.isFinite(ang3));

  // 5. Handheld loop-safe pada durasi panjang & durasi bukan kelipatan 90f, sambil mempertahankan frekuensi ~3 dtk
  const basePose: CamPose = { pos: [0, 1.5, 4], look: [0, 1.5, 0], fov: 40, roll: 0 };
  const h900_0 = applyHandheldBreathe(basePose, 0, 1, 900);
  const h900_90 = applyHandheldBreathe(basePose, 90, 1, 900);
  const h900_900 = applyHandheldBreathe(basePose, 900, 1, 900);
  assert.ok(Math.hypot(h900_0.pos[0] - h900_90.pos[0], h900_0.pos[1] - h900_90.pos[1]) < 1e-9, 'video 900f tetap berperiode 90f');
  assert.ok(Math.hypot(h900_0.pos[0] - h900_900.pos[0], h900_0.pos[1] - h900_900.pos[1]) < 1e-9);
  const h400_0 = applyHandheldBreathe(basePose, 0, 1, 400);
  const h400_400 = applyHandheldBreathe(basePose, 400, 1, 400);
  assert.ok(Math.hypot(h400_0.pos[0] - h400_400.pos[0], h400_0.pos[1] - h400_400.pos[1]) < 1e-9, 'durasi 400f tetap loop-safe');

  // 6. checkBillboardSweep OBB eksak: menangkap tiang 8 cm yang dulu lolos di antara 3 slice diskrit
  const thinPost: NamedBox = { name: 'ThinPost', min: [-0.04, 0, -0.22], max: [0.04, 2.5, -0.14] };
  const sweepPost = checkBillboardSweep([0, 0, 0], 0.8, 1.96, [0, 3.5, 2], [thinPost], 0.04, { tiltX: -0.35 });
  assert.equal(sweepPost.ok, false, 'OBB sweep harus menangkap tiang tipis tanpa blind spot 3-slice');

  // 7. checkCounterVisibility saat kamera di belakang aktor / sisi sama -> ok: true
  const behindCam = checkCounterVisibility([0, 0, 18.4], 1.88, 0.965, 0.32, [0, 1.4, 20.0], 17.25);
  assert.equal(behindCam.ok, true, 'kamera di sisi yang sama dengan aktor tidak terhalang konter');

  // 8. checkScreenOcclusion menangkap occluder tepat di depan lensa (0 < depth <= 0.05)
  const nearCam: CamPose = { pos: [0, 1.4, 4], look: [0, 1.4, 0], fov: 40, roll: 0 };
  const nearOcc = checkScreenOcclusion(
    nearCam,
    { name: 'Speaker', center: [0, 1.4, 0], halfW: 0.25, halfH: 0.25 },
    [{ name: 'LensBlocker', center: [0, 1.4, 3.97], halfW: 0.2, halfH: 0.2 }],
  );
  assert.equal(nearOcc.ok, false, 'occluder 3 cm di depan lensa tidak boleh lolos');

  // 9. checkSightline pakai flag `transparent` & filterSetBoxes sanitasi titik
  const realJar: NamedBox = { name: 'WK_KerupukJar', min: [-0.3, 1.0, 1.9], max: [0.3, 1.7, 2.1], transparent: true };
  const opaqueWin: NamedBox = { name: 'KP2_WinGlass', min: [-0.3, 1.0, 1.9], max: [0.3, 1.7, 2.1], transparent: false };
  assert.equal(checkSightline([0, 1.4, 4], [0, 1.4, 0], [realJar]).ok, true);
  assert.equal(checkSightline([0, 1.4, 4], [0, 1.4, 0], [opaqueWin]).ok, false);
  const dotted: NamedBox[] = [{ name: 'WK_LampBulb_-1.35', min: [0, 0, 0], max: [1, 1, 1] }];
  assert.equal(filterSetBoxes(dotted, { hideNames: ['WK_LampBulb_-135'] }).length, 0);
});
