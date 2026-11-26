import test from 'node:test';
import assert from 'node:assert/strict';
import { blinkLidAt } from '../engine/cast/expressions';
import { talkAt, talkWave } from '../engine/cast/lipsync';
import {
  CAST_PRESETS,
  actorFaceAnchors,
  actorHandPoint,
  drawActor,
  resolveActorSpec,
  springPop,
  strikeEnvelope,
  type ActorPose,
  type ActorStance,
} from '../engine/cast/nusantara';
import { actorPoseKey } from '../engine/cast/ActorBillboard';
import { CAT_PRESETS, drawCat, resolveCatSpec, type CatPose } from '../engine/cast/cat';
import { catPoseKey } from '../engine/cast/CatBillboard';
import { KAMPUNG_SPOTS, SET_PRESETS, WARKOP_SPOT_META, indoorLight, shouldHideGlbNode } from '../engine/sets';
import { LIGHTS, cameraRelativeSun } from '../engine/stage/lights';
import { GRADE_PRESETS } from '../engine/post/PostStack';
import { pxScale } from '../engine/post/scale';
import { checkBillboardSweep } from '../engine/core/spatial';

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

test('CAST_PRESETS memuat 13 karakter Indonesia (termasuk bangUtoh, ebot, pakUjang, tio, mbakYuni) dan resolveActorSpec tidak memutasi preset', () => {
  assert.deepEqual(Object.keys(CAST_PRESETS).sort(), [
    'arya',
    'bangUdin',
    'bangUtoh',
    'buSiti',
    'dimas',
    'ebot',
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

  assert.equal(CAST_PRESETS.ebot.name, 'Ebot');
  assert.equal(CAST_PRESETS.ebot.eyeStyle, 'almond');
  assert.equal(CAST_PRESETS.ebot.hairStyle, 'fadeCrop');
  assert.equal(CAST_PRESETS.ebot.outfit, 'lokalKnit');
  assert.equal(CAST_PRESETS.ebot.beautyMark ?? 'none', 'none');
  assert.equal(CAST_PRESETS.ebot.noseStyle ?? 'hook', 'hook');
  assert.equal(CAST_PRESETS.ebot.fullLips, true);

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
    { gait: 'swing' },
    { stride: 1.5 },
    { strideBlend: 0.45 },
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

/** Mock ringan CanvasRenderingContext2D untuk uji regresi drawCat & drawActor di Node. */
function makeRecordingCtx() {
  const fills: { style: unknown; ops: string[] }[] = [];
  const ops: string[] = [];
  let curOps: string[] = [];
  const grad = { addColorStop() {} };
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save() { ops.push('save'); },
    restore() { ops.push('restore'); },
    clearRect() {},
    translate(x: number, y: number) { ops.push(`tr:${x.toFixed(1)},${y.toFixed(1)}`); },
    rotate() {},
    scale() {},
    clip() {},
    beginPath() { curOps = []; },
    closePath() {},
    moveTo(x: number, y: number) { curOps.push(`M:${x.toFixed(1)},${y.toFixed(1)}`); },
    lineTo(x: number, y: number) { curOps.push(`L:${x.toFixed(1)},${y.toFixed(1)}`); },
    bezierCurveTo() { curOps.push('C'); },
    quadraticCurveTo() { curOps.push('Q'); },
    arc(x: number, y: number, r: number) { curOps.push(`A:${x.toFixed(1)},${y.toFixed(1)},${r.toFixed(1)}`); },
    ellipse(x: number, y: number, rx: number, ry: number) { curOps.push(`E:${x.toFixed(1)},${y.toFixed(1)},${rx.toFixed(1)},${ry.toFixed(1)}`); },
    roundRect(x: number, y: number, w: number, h: number) { curOps.push(`RR:${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)}`); },
    fill() { fills.push({ style: ctx.fillStyle, ops: [...curOps] }); },
    stroke() { ops.push(`S:${curOps.join('|')}`); },
    fillRect() { fills.push({ style: ctx.fillStyle, ops: ['FR'] }); },
    strokeText() {},
    fillText() {},
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, ops };
}

test('v2.1 regresi cat.ts: view back hanya menggambar ekor SEKALI (sit & stand/walk), ekspresi strain & pawRaise stand akurat', () => {
  const oyen = CAT_PRESETS.oyen;
  // 1. view: 'back' pada sit, stand, walk -> drawTabbyTail dipanggil tepat 1x (3 fill stripeDark per ekor)
  for (const stance of ['sit', 'stand', 'walk'] as const) {
    const rec = makeRecordingCtx();
    drawCat(rec.ctx, oyen, { face: 'neutral', stance, view: 'back', tailPhase: 0.5 });
    const darkTailFills = rec.fills.filter((f) => f.style === oyen.stripeDark).length;
    assert.equal(darkTailFills, 3, `view: 'back' pada stance '${stance}' tidak boleh menggambar ekor ganda (ditemukan ${darkTailFills} fill stripeDark)`);
  }

  // 2. Ekspresi 'strain' menggambar gigi rapat (roundRect putih) dan berbeda dari 'neutral'
  const recStrain = makeRecordingCtx();
  drawCat(recStrain.ctx, oyen, { face: 'strain', stance: 'sit', view: 'front' });
  const teethRects = recStrain.fills.filter((f) => f.style === '#ffffff' && f.ops.some((o) => o.startsWith('RR:')));
  assert.equal(teethRects.length, 1, "ekspresi 'strain' pada cat.ts harus menggambar gigi rapat (roundRect putih)");

  // 3. pawRaise pada stance: 'stand' membedakan 'left' vs 'right' secara akurat
  const recLeft = makeRecordingCtx();
  const recRight = makeRecordingCtx();
  drawCat(recLeft.ctx, oyen, { face: 'neutral', stance: 'stand', view: 'side', facing: 1, pawRaise: 'left' });
  drawCat(recRight.ctx, oyen, { face: 'neutral', stance: 'stand', view: 'side', facing: 1, pawRaise: 'right' });
  assert.notDeepEqual(recLeft.fills, recRight.fills, "stance: 'stand' harus membedakan pawRaise 'left' vs 'right'");
});

test('v2.1 regresi CatBillboard catPoseKey: membedakan undefined vs 0 untuk tailPhase, lean, breathPhase', () => {
  const base: CatPose = { face: 'neutral', stance: 'walk', walkPhase: 0.3 };
  assert.notEqual(catPoseKey(base), catPoseKey({ ...base, tailPhase: 0 }), 'tailPhase undefined != 0');
  assert.notEqual(catPoseKey(base), catPoseKey({ ...base, lean: 0 }), 'lean undefined != 0');
  assert.notEqual(catPoseKey(base), catPoseKey({ ...base, breathPhase: 0 }), 'breathPhase undefined != 0');
});

test('v2.1 regresi GlbSet shouldHideGlbNode: sanitize titik (.) & menolak string kosong ""', () => {
  // String kosong / spasi / titik tunggal TIDAK BOLEH menyembunyikan seluruh dunia!
  assert.equal(shouldHideGlbNode('WK_Floor', ['']), false);
  assert.equal(shouldHideGlbNode('WK_Floor', ['   ']), false);
  assert.equal(shouldHideGlbNode('WK_Floor', ['.']), false);
  assert.equal(shouldHideGlbNode('WK_Floor', []), false);

  // Cocokkan nama mentah Blender maupun nama tersanitasi GLTFLoader (`.` dibuang)
  assert.equal(shouldHideGlbNode('WK_LampBulb_-135', ['WK_LampBulb_-1.35']), true);
  assert.equal(shouldHideGlbNode('WK_LampBulb_-1.35', ['WK_LampBulb_-1.35']), true);
  assert.equal(shouldHideGlbNode('KG_StreetPole_05_Top', ['KG_StreetPole_05']), true);
  assert.equal(shouldHideGlbNode('WK_Floor', ['WK_LampBulb_-1.35']), false);
});

test('v2.1 regresi nusantara.ts: view back menggambar 2 anting, headTilt memutar eyeY/noseY/headTop, sitHeight hormati actorHeight', () => {
  // 1. view: 'back' dengan earrings: true -> 2 anting (#fff8e8)
  const rec = makeRecordingCtx();
  const spec = resolveActorSpec('rara', { hairStyle: 'bun', earrings: true, headgear: 'none' });
  drawActor(rec.ctx, spec, { face: 'neutral', view: 'back' });
  const earrings = rec.fills.filter((f) => f.style === '#fff8e8');
  assert.equal(earrings.length, 2, "view: 'back' dengan earrings harus menggambar 2 anting (kiri dan kanan)");

  // 2. actorFaceAnchors memutar eyeY, noseY, dan headTop secara konsisten saat headTilt != 0
  const flat = actorFaceAnchors('bangUtoh', { face: 'neutral', headTilt: 0 });
  const tilted = actorFaceAnchors('bangUtoh', { face: 'neutral', headTilt: 18 });
  assert.notEqual(tilted.eyeY, flat.eyeY, 'headTilt harus memutar eyeY');
  assert.notEqual(tilted.noseY, flat.noseY, 'headTilt harus memutar noseY');
  assert.notEqual(tilted.headTop, flat.headTop, 'headTilt harus memutar headTop');

  // 3. sitHeight menerima actorHeight opsional (default 1.8 tidak berubah)
  const defaultSit = actorFaceAnchors('bangUtoh', { face: 'neutral', stance: 'sit', sitHeight: 0.475 });
  const tallSit = actorFaceAnchors('bangUtoh', { face: 'neutral', stance: 'sit', sitHeight: 0.475, actorHeight: 2.0 });
  assert.notEqual(tallSit.torsoTop, defaultSit.torsoTop, 'actorHeight kustom harus mengkalibrasi posisi duduk sitHeight');
});

test('v2.1 regresi GRADE_PRESETS.night & checkBillboardSweep tidak pernah melaporkan penetration 0', () => {
  // GRADE_PRESETS lengkap 5-lawan-5 dengan LIGHTS
  assert.deepEqual(Object.keys(GRADE_PRESETS).sort(), Object.keys(LIGHTS).sort());
  assert.ok(GRADE_PRESETS.night.contrast > 1 && GRADE_PRESETS.night.saturation > 1);

  // Sudut kotak dekat margin (L-infinity hit tapi L2 > margin): tidak boleh lapor collision ber-penetration 0
  const cornerBox = { name: 'CornerTable', min: [0.5, 0, 0.5] as [number, number, number], max: [1.5, 1.0, 1.5] as [number, number, number] };
  const res = checkBillboardSweep([0.465, 0, 0.465], 0.01, 1.8, [0.465, 1.5, 3], [cornerBox], 0.04);
  for (const c of res.collisions) {
    assert.ok(c.penetration > 0, `collision tidak boleh punya penetration === 0 (${c.message})`);
  }
});

test('Karakter lokal Ebot: merender mulus di 4 sudut pandang, tanpa tahi lalat, hidung standar studio', () => {
  for (const view of ['front', 'threeQuarter', 'side', 'back'] as const) {
    const recEbot = makeRecordingCtx();
    drawActor(recEbot.ctx, 'ebot', {
      face: view === 'side' ? 'happy' : 'neutral',
      view,
      stance: view === 'side' ? 'walk' : 'stand',
      gait: 'planted',
      walkPhase: 0.25,
    });
    assert.ok(recEbot.fills.length > 8, `Ebot view '${view}' harus menggambar path penuh`);
    if (view !== 'back') {
      const moleFills = recEbot.fills.filter((f) => f.style === '#38211d').length;
      assert.equal(moleFills, 0, `Ebot view '${view}' tidak boleh menggambar tahi lalat (#38211d)`);
    }
  }
});
