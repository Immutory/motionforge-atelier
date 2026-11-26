import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPECT_9_16,
  boxFromCenter,
  boxFromFoot,
  checkBillboardSweep,
  checkCounterVisibility,
  checkPropOverlap,
  checkSafeFraming,
  checkSightline,
  WARKOP_SPOT_META,
  type CamPose,
} from '../engine';

test('checkPropOverlap mendeteksi prop menembus, dempet (< minGap), dan meloloskan prop berjarak aman', () => {
  const laptop = boxFromFoot('laptop', [-1.56, 0.77, 0.49], 0.32, 0.24, 0.22);
  const cupClip = boxFromFoot('cup_clip', [-1.42, 0.77, 0.49], 0.09, 0.11, 0.09);
  const cupCrowded = boxFromFoot('cup_close', [-1.345, 0.77, 0.49], 0.09, 0.11, 0.09);
  const cupSafe = boxFromFoot('cup_safe', [-1.2, 0.77, 0.49], 0.09, 0.11, 0.09);

  const rClip = checkPropOverlap([laptop, cupClip], 0.03);
  assert.equal(rClip.ok, false);
  assert.equal(rClip.violations.length, 1);
  assert.equal(rClip.violations[0].penetrating, true);
  assert.ok(rClip.violations[0].distance < 0);

  const rCrowd = checkPropOverlap([laptop, cupCrowded], 0.03);
  assert.equal(rCrowd.ok, false);
  assert.equal(rCrowd.violations[0].penetrating, false);
  assert.ok(rCrowd.violations[0].distance >= 0 && rCrowd.violations[0].distance < 0.03);

  const rSafe = checkPropOverlap([laptop, cupSafe], 0.03);
  assert.equal(rSafe.ok, true);
  assert.equal(rSafe.violations.length, 0);
});

test('checkBillboardSweep: aman pada yaw 0° namun mendeteksi sapuan billboard pada yaw 45° dan 90°', () => {
  // Bangku tepat di belakang titik pijak karakter (z = 0.65..0.95); aktor berdiri di z = 1.06 (jarak bersih 0,11 m di sumbu Z).
  const bench = boxFromFoot('WK_BenchL_Top', [0, 0, 0.8], 1.4, 0.48, 0.3);
  const lampOverhead = boxFromCenter('WK_Lamp', [0, 2.75, 1.06], [0.3, 0.2, 0.3]);
  const actorPos: [number, number, number] = [0, 0, 1.06];
  const actorW = 1.15;
  const actorH = 1.75;

  // Kamera frontal (+Z, yaw 0°): bidang billboard sejajar X di z = 1.06 -> 0,11 m bersih dari bangku (margin 0,04 m)
  const front = checkBillboardSweep(actorPos, actorW, actorH, [0, 1.3, 3.5], [bench, lampOverhead], 0.04);
  assert.equal(front.ok, true);
  assert.ok(Math.abs(front.yawDeg) < 1e-6);

  // Kamera serong OTS 45° dari kanan-depan: ujung kanan billboard menyapu ke belakang (-Z) masuk ke bangku!
  const ots45 = checkBillboardSweep(actorPos, actorW, actorH, [2.0, 1.3, 3.06], [bench], 0.04);
  assert.equal(ots45.ok, false);
  assert.ok(Math.abs(ots45.yawDeg - 45) < 1);
  assert.equal(ots45.collisions[0].obstacle, 'WK_BenchL_Top');

  // Kamera samping 90° dari kanan (+X): billboard sejajar Z -> langsung menembus bangku!
  const side90 = checkBillboardSweep(actorPos, actorW, actorH, [2.5, 1.3, 1.06], [bench], 0.04);
  assert.equal(side90.ok, false);
  assert.ok(Math.abs(side90.yawDeg - 90) < 1);

  // Geser aktor cukup maju sehingga radius sapuan halfW + margin bersih dari bangku (z = 0.95 + 0.575 + 0.06 = 1.585)
  const safeSide = checkBillboardSweep([0, 0, 1.62], actorW, actorH, [2.5, 1.3, 1.62], [bench], 0.04);
  assert.equal(safeSide.ok, true);
});

test('checkCounterVisibility mendeteksi kepala tenggelam di balik konter dan meloloskan ergonomicBaseY', () => {
  const counterTopY = WARKOP_SPOT_META.counterKeeper?.counterTopY ?? 1.04;
  const ergoY = WARKOP_SPOT_META.counterKeeper?.ergonomicBaseY ?? 0.44;

  // Bug klasik Bu Siti di y = 0 (hanya kepala mengintip di atas konter WK_CounterTop = 0,97 m)
  const sunken = checkCounterVisibility([0.1, 0, -2.22], 1.65, counterTopY, 0.32);
  assert.equal(sunken.ok, false);
  assert.ok(sunken.torsoAboveCounter < 0, 'bahu berada di bawah permukaan konter');
  assert.ok(sunken.recommendedBaseY > 0.35 && sunken.recommendedBaseY <= ergoY);

  // Posisi ergonomis resmi (ergonomicBaseY = 0.44 m): bahu, dada atas & lengan tampak utuh ≥ 0,32 m
  const fixed = checkCounterVisibility([0.1, ergoY, -2.22], 1.65, counterTopY, 0.32);
  assert.equal(fixed.ok, true);
  assert.ok(fixed.torsoAboveCounter >= 0.32);
});

test('checkSafeFraming mendeteksi wajah/papan terpotong, di belakang kamera, dan tabrakan zona subtitle 9:16', () => {
  const cam: CamPose = { pos: [0, 1.2, 4.0], look: [0, 1.2, 0], fov: 40, roll: 0 };

  const good = checkSafeFraming(
    cam,
    [{ name: 'Wajah Utoh', center: [0, 1.35, 0], halfW: 0.25, halfH: 0.25, avoidSubtitle: true }],
    ASPECT_9_16,
    0.88,
    0.88,
  );
  assert.equal(good.ok, true);

  // Papan nama melampaui tepi kanan layar 9:16
  const croppedX = checkSafeFraming(
    cam,
    [{ name: 'WARKOP 24 JAM', center: [0.85, 1.4, 0], halfW: 0.45, halfH: 0.15 }],
    ASPECT_9_16,
    0.88,
    0.88,
  );
  assert.equal(croppedX.ok, false);
  assert.ok(croppedX.violations.some((v) => v.reason === 'croppedX'));

  // Subjek berada di belakang lensa kamera
  const behind = checkSafeFraming(
    cam,
    [{ name: 'Prop Belakang', center: [0, 1.2, 5.0], halfW: 0.2, halfH: 0.2 }],
    ASPECT_9_16,
  );
  assert.equal(behind.ok, false);
  assert.equal(behind.violations[0].reason, 'behindCamera');

  // Wajah jatuh tepat di zona subtitle 9:16 (NDC y ∈ [-0.76, -0.52])
  // Pada depth=4, fov=40 -> halfHeight = 4 * tan(20°) = 1.456 -> y = 1.2 - 0.64 * 1.456 ≈ 0.27
  const subOverlap = checkSafeFraming(
    cam,
    [{ name: 'Wajah Rendah', center: [0, 0.27, 0], halfW: 0.2, halfH: 0.15, avoidSubtitle: true }],
    ASPECT_9_16,
  );
  assert.equal(subOverlap.ok, false);
  assert.ok(subOverlap.violations.some((v) => v.reason === 'subtitleOverlap'));
});

test('checkSightline mendeteksi tiang di jalur kamera -> target dan mengurutkan suggestedHideNames dari yang terdekat', () => {
  const poleNear = boxFromFoot('KG_StreetPole_05', [0, 0, 3.0], 0.25, 5.0, 0.25);
  const signMid = boxFromFoot('WK_HangingSign', [0, 1.0, 1.5], 0.6, 0.6, 0.1);
  const poleSide = boxFromFoot('KG_StreetPole_Side', [3.0, 0, 2.0], 0.25, 5.0, 0.25);

  const blocked = checkSightline([0, 1.3, 5.0], [0, 1.3, 0], [signMid, poleSide, poleNear]);
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.suggestedHideNames, ['KG_StreetPole_05', 'WK_HangingSign']);

  const clear = checkSightline([0, 1.3, 5.0], [0, 1.3, 0], [poleSide]);
  assert.equal(clear.ok, true);
  assert.deepEqual(clear.suggestedHideNames, []);
});
