import test from 'node:test';
import assert from 'node:assert/strict';
import { blinkLidAt } from '../engine/cast/bean';
import { talkAt, talkWave } from '../engine/cast/lipsync';
import {
  CAST_PRESETS,
  actorFaceAnchors,
  actorHandPoint,
  resolveActorSpec,
  springPop,
  strikeEnvelope,
  type ActorPose,
  type ActorStance,
} from '../engine/cast/nusantara';
import { actorPoseKey } from '../engine/cast/ActorBillboard';
import { CAT_PRESETS, resolveCatSpec, type CatPose } from '../engine/cast/cat';
import { catPoseKey } from '../engine/cast/CatBillboard';
import { KAMPUNG_SPOTS, SET_PRESETS, WARKOP_SPOT_META, indoorLight } from '../engine/sets';
import { LIGHTS, cameraRelativeSun } from '../engine/stage/lights';
import { pxScale } from '../engine/post/scale';

test('blinkLidAt tidak mulai tertutup di frame 0 dan membentuk 4-frame half/shut/shut/half pada swap', () => {
  assert.equal(blinkLidAt(0, 1, 30), 0);
  assert.equal(blinkLidAt(0, 2, 30), 0);
  assert.deepEqual(
    [89, 90, 91, 92].map((f) => blinkLidAt(f, 1, 30, [90])),
    [0.5, 1, 1, 0.5],
  );
});

test('talkAt menyinkronkan vokal bahasa Indonesia dengan leadFrames', () => {
  const words = [
    { text: 'Halo', start: 0.2, end: 0.8 },
    { text: 'Nusantara', start: 1.2, end: 2.0 },
  ];
  // Di luar kata -> mulut tertutup
  assert.deepEqual(talkAt(words, 0, 30), { open: 0, shape: 'closed' });
  assert.deepEqual(talkAt(words, 30, 30), { open: 0, shape: 'closed' });

  // Suku kata pertama "Ha" (0.2..0.5s -> puncak ~0.35s, leadFrames=1 -> frame ~9..10)
  const ha = talkAt(words, 10, 30, 1);
  assert.ok(ha.open > 0.5, 'vokal "a" harus membuka mulut lebar');
  assert.equal(ha.shape, 'wide');

  // Suku kata kedua "lo" (0.5..0.8s -> puncak ~0.65s, leadFrames=1 -> frame ~18..19)
  const lo = talkAt(words, 19, 30, 1);
  assert.ok(lo.open > 0.4, 'vokal "o" harus membuka mulut membulat');
  assert.equal(lo.shape, 'o');

  // talkWave(active=false) harus selalu tertutup
  assert.deepEqual(talkWave(15, false), { open: 0, shape: 'closed' });
});

test('CAST_PRESETS memuat 12 karakter Indonesia (termasuk bangUtoh, pakUjang, tio, mbakYuni) dan resolveActorSpec tidak memutasi preset', () => {
  assert.deepEqual(Object.keys(CAST_PRESETS).sort(), [
    'arya',
    'bangUdin',
    'bangUtoh',
    'buSiti',
    'dimas',
    'mbakYuni',
    'pakBudi',
    'pakUjang',
    'raka',
    'rara',
    'saka',
    'tio',
  ]);
  assert.equal(CAST_PRESETS.bangUtoh.name, 'Bolohoutoh (Bang Utoh)');
  assert.equal(CAST_PRESETS.bangUtoh.headgear, 'headphones');
  assert.equal(CAST_PRESETS.bangUtoh.outfit, 'hoodieTech');
  assert.equal(CAST_PRESETS.bangUtoh.defaultProp, 'laptop');

  assert.equal(CAST_PRESETS.pakUjang.outfit, 'satpam');
  assert.equal(CAST_PRESETS.pakUjang.headgear, 'satpamCap');
  assert.equal(CAST_PRESETS.pakUjang.defaultProp, 'senter');
  assert.equal(CAST_PRESETS.tio.outfit, 'pedagangApron');
  assert.equal(CAST_PRESETS.tio.defaultProp, 'bakmie');
  assert.equal(CAST_PRESETS.mbakYuni.outfit, 'dasterCelemek');
  assert.equal(CAST_PRESETS.mbakYuni.defaultProp, 'esBuah');

  const custom = resolveActorSpec('bangUtoh', { headgear: 'none', outfitColor: '#b53b3b' });
  assert.equal(custom.name, 'Bolohoutoh (Bang Utoh)');
  assert.equal(custom.headgear, 'none');
  assert.equal(custom.outfitColor, '#b53b3b');
  // Preset asli tetap utuh
  assert.equal(CAST_PRESETS.bangUtoh.headgear, 'headphones');
});

test('CAT_PRESETS memuat 3 karakter kucing 2D (oyen, abu, belang) dan resolveCatSpec tidak memutasi preset', () => {
  assert.deepEqual(Object.keys(CAT_PRESETS).sort(), ['abu', 'belang', 'oyen']);
  assert.equal(CAT_PRESETS.oyen.id, 'oyen');
  assert.equal(CAT_PRESETS.oyen.collarColor, undefined);

  const collared = resolveCatSpec('oyen', { collarColor: '#d9383a', bellColor: '#ffd54f' });
  assert.equal(collared.collarColor, '#d9383a');
  assert.equal(collared.furBase, CAT_PRESETS.oyen.furBase);
  assert.equal(CAT_PRESETS.oyen.collarColor, undefined);
});

test('cameraRelativeSun menempatkan backlight az=0 di depan arah kamera', () => {
  // Kamera di (0, 2, 10) menghadap (0, 1, 0) -> arah maju adalah -Z.
  const back = cameraRelativeSun([0, 2, 10], [0, 1, 0], 0, 10, 50);
  assert.ok(back[2] < -40, 'backlight harus berada di depan arah pandang kamera (-Z)');
  assert.ok(back[1] > 0, 'elevasi positif harus di atas horizon');

  const right = cameraRelativeSun([0, 2, 10], [0, 1, 0], 90, 45, 50);
  assert.ok(right[0] > 20, 'az=+90 harus berada di sisi kanan layar (+X)');
});

test('pxScale menjaga lebar piksel konsisten antara still 0.5x dan master', () => {
  assert.equal(pxScale(960), 0.5);
  assert.equal(pxScale(1920), 1);
});

test('SET_PRESETS memuat 4 set Blender (warkop, kost, kampus, kampung) dan indoorLight mematikan cameraRelative', () => {
  assert.deepEqual(Object.keys(SET_PRESETS).sort(), ['kampung', 'kampus', 'kost', 'warkop']);
  assert.equal(SET_PRESETS.warkop.glb, 'sets/warkop.glb');
  assert.equal(SET_PRESETS.kost.glb, 'sets/kost.glb');
  assert.equal(SET_PRESETS.kampus.glb, 'sets/kampus.glb');
  assert.equal(SET_PRESETS.kampung.glb, 'sets/kampung.glb');

  const interior = indoorLight(LIGHTS.dusk);
  assert.equal(interior.key.cameraRelative, false);
  assert.equal(LIGHTS.dusk.key.cameraRelative, true);
});

test('KAMPUNG_SPOTS memuat spot Kos Putra Rawa Sari 2 Lantai, Area Pedagang (Tio & Mbak Yuni), Pak Ujang, & kanopi Warkop', () => {
  assert.ok(KAMPUNG_SPOTS.kostDoor01[1] > 0, 'teras Lantai 1 Kos berada di atas lantai dasar');
  assert.ok(KAMPUNG_SPOTS.kostBalcony2[1] > 3.2, 'balkon Lantai 2 Kos berada di ketinggian lantai 2');
  assert.equal(KAMPUNG_SPOTS.warkopCanopyLeft[1], 2.8);
  assert.equal(KAMPUNG_SPOTS.warkopCanopyRight[1], 2.8);
  assert.equal(KAMPUNG_SPOTS.bakmieTioVendor[1], 0.04);
  assert.equal(KAMPUNG_SPOTS.esBuahYuniVendor[1], 0.04);
  assert.equal(KAMPUNG_SPOTS.pakUjangPatrol[1], 0);

  const stances: ActorStance[] = ['stand', 'walk', 'sit', 'sitCross', 'squat', 'jump'];
  assert.equal(stances.length, 6);
});

test('Atelier v2.0 rig: headTilt, sitHeight, view back, strikeEnvelope, springPop, dan WARKOP_SPOT_META', () => {
  // headTilt memutar jangkar mulut di sekitar pangkal leher secara independen dari lean
  const baseFace = actorFaceAnchors('bangUtoh', { face: 'neutral' });
  const tiltedFace = actorFaceAnchors('bangUtoh', { face: 'neutral', headTilt: 14 });
  assert.notEqual(tiltedFace.mouthX, baseFace.mouthX);

  // sitHeight mengatur elevasi duduk secara ergonomis (bangku rendah lebih turun dari bangku tinggi)
  const sitLow = actorFaceAnchors('bangUtoh', { face: 'neutral', stance: 'sit', sitHeight: 0.36 });
  const sitBench = actorFaceAnchors('bangUtoh', { face: 'neutral', stance: 'sit', sitHeight: 0.475 });
  const sitHigh = actorFaceAnchors('bangUtoh', { face: 'neutral', stance: 'sit', sitHeight: 0.6 });
  assert.ok(sitLow.torsoTop > sitBench.torsoTop && sitBench.torsoTop > sitHigh.torsoTop);
  assert.equal(WARKOP_SPOT_META.leftTable?.seatY, 0.475);
  assert.equal(WARKOP_SPOT_META.counterKeeper?.ergonomicBaseY, 0.44);

  // view: 'back' dan ekspresi 'strain' bekerja penuh
  const backHand = actorHandPoint('bangUtoh', { face: 'strain', view: 'back', rightArm: 'point' }, 1);
  assert.ok(Number.isFinite(backHand.x) && Number.isFinite(backHand.y));

  // Action Impact Grammar: 4f wind-up -> 6f hold -> 1f strike -> 8f follow-through
  assert.equal(strikeEnvelope(89, 100).phase, 'idle');
  assert.equal(strikeEnvelope(92, 100).phase, 'windup');
  assert.ok(strikeEnvelope(92, 100).value < 0);
  assert.equal(strikeEnvelope(96, 100).phase, 'hold');
  assert.equal(strikeEnvelope(96, 100).value, -1);
  const hit = strikeEnvelope(100, 100);
  assert.equal(hit.phase, 'strike');
  assert.equal(hit.impact, true);
  assert.equal(hit.value, 1);
  assert.equal(strikeEnvelope(103, 100).phase, 'follow');
  assert.equal(strikeEnvelope(109, 100).phase, 'idle');

  // Spring Overshoot: 0 sebelum trigger -> peak di trigger+1 -> duduk tepat di 1
  assert.equal(springPop(49, 50, 1.25, 12), 0);
  assert.equal(springPop(51, 50, 1.25, 12), 1.25);
  assert.equal(springPop(62, 50, 1.25, 12), 1);
});

test('ActorBillboard & CatBillboard useMemo reactivity: setiap perubahan field pose mengubah poseKey', () => {
  const baseActor: ActorPose = { face: 'neutral', stance: 'stand', view: 'threeQuarter' };
  const baseActorKey = actorPoseKey(baseActor);
  const actorMutations: Partial<ActorPose>[] = [
    { face: 'strain' },
    { blink: 0.5 },
    { talk: 0.6 },
    { stance: 'sit' },
    { view: 'back' },
    { leftArm: 'raise' },
    { rightArm: 'point' },
    { leftProp: 'laptop' },
    { rightProp: 'kopi' },
    { leftHand: { dx: 12 } },
    { rightHand: { front: true } },
    { hatPop: 0.8 },
    { fx: 'sweat' },
    { walkPhase: 0.25 },
    { gait: 'planted' },
    { stride: 1.5 },
    { lean: 6 },
    { headTilt: -10 },
    { sitHeight: 0.475 },
    { facing: -0.5 },
    { lookBack: 0.7 },
  ];
  for (const patch of actorMutations) {
    assert.notEqual(
      actorPoseKey({ ...baseActor, ...patch }),
      baseActorKey,
      `actorPoseKey harus berubah saat ${Object.keys(patch).join(',')} diubah`,
    );
  }

  const baseCat: CatPose = { face: 'neutral', stance: 'sit', view: 'threeQuarter' };
  const baseCatKey = catPoseKey(baseCat);
  const catMutations: Partial<CatPose>[] = [
    { face: 'shock' },
    { blink: 1 },
    { talk: 0.5 },
    { stance: 'walk' },
    { view: 'side' },
    { walkPhase: 0.3 },
    { tailPhase: 1.2 },
    { earTwitch: 0.4 },
    { pawRaise: 'left' },
    { pawAngle: 25 },
    { pawReach: 1.35 },
    { fx: 'sparkle' },
    { lean: 4 },
    { facing: -1 },
    { breathPhase: 0.8 },
    { stretch: 0.6 },
  ];
  for (const patch of catMutations) {
    assert.notEqual(
      catPoseKey({ ...baseCat, ...patch }),
      baseCatKey,
      `catPoseKey harus berubah saat ${Object.keys(patch).join(',')} diubah`,
    );
  }
});
