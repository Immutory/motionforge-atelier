import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BakmieBowl3D,
  BoxSign3D,
  CAT_PRESETS,
  DiegeticNote3D,
  DrinkCup3D,
  LIGHTS,
  Laptop3D,
  Phone3D,
  actorHandPoint,
  actorWalkCycleMeters,
  catWalkCycleMeters,
  classifyGlbSurface,
  computeWalkState,
  darkenHex,
  drawActor,
  drawCat,
  footRollPitchRad,
  sampleCamera,
  solveLegIK,
  type Vec3,
} from '../engine';
import { tioPoseAt, tioPositionAt, utohPoseAt, utohPositionAt } from '../productions/ep04-karyawan-bakmie/cast';
import { CAMS as EP04_CAMS, TOTAL_FRAMES as EP04_TOTAL } from '../productions/ep04-karyawan-bakmie/shots';

function mockCanvasCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  const rotations: number[] = [];
  return {
    ctx: {
      save: noop,
      restore: noop,
      clearRect: noop,
      fillRect: noop,
      translate: noop,
      rotate: (a: number) => rotations.push(a),
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
    } as unknown as CanvasRenderingContext2D,
    rotations,
  };
}

test('v3.5 Fase 1 · solveLegIK: panjang paha & betis konstan, lutut menekuk alami sesuai bendDir, nol NaN', () => {
  const hip: [number, number] = [350, 638];
  const L1 = 196;
  const L2 = 196;

  // Fase Passing (kaki terangkat): lutut menekuk ~60-72° ke arah bendDir
  const passAnkle: [number, number] = [350, 960];
  const rightPass = solveLegIK(hip, passAnkle, L1, L2, 1);
  const leftPass = solveLegIK(hip, passAnkle, L1, L2, -1);
  assert.ok(rightPass.knee[0] > hip[0], 'bendDir=+1 harus menekuk lutut ke kanan (+X)');
  assert.ok(leftPass.knee[0] < hip[0], 'bendDir=-1 harus menekuk lutut ke kiri (-X)');
  assert.ok(rightPass.angleDeg >= 55 && rightPass.angleDeg <= 75, `sudut lutut Passing harus ~60-70°, dapat ${rightPass.angleDeg.toFixed(1)}°`);
  assert.ok(Math.abs(Math.hypot(rightPass.knee[0] - hip[0], rightPass.knee[1] - hip[1]) - L1) < 0.05);
  assert.ok(Math.abs(Math.hypot(passAnkle[0] - rightPass.knee[0], passAnkle[1] - rightPass.knee[1]) - L2) < 0.05);

  // Fase Contact penuh (target melebihi L1+L2) dan target terlalu dekat -> aman tanpa NaN
  const far = solveLegIK(hip, [520, 1080], L1, L2, 1);
  const near = solveLegIK(hip, [350, 638], L1, L2, 1);
  assert.ok(Number.isFinite(far.knee[0]) && Number.isFinite(far.knee[1]) && far.angleDeg < 12);
  assert.ok(Number.isFinite(near.knee[0]) && Number.isFinite(near.knee[1]));
});

test('v3.5 Fase 1 · footRollPitchRad & drawShoe: 4-pose klasik 2D (+18° heel-strike, 0° flat, -24° toe-off, swing)', () => {
  const deg = (u: number) => (footRollPitchRad(u) * 180) / Math.PI;
  assert.ok(Math.abs(deg(0.0) - 18) < 0.2, `Heel-strike harus +18°, dapat ${deg(0)}`);
  assert.equal(deg(0.15), 0, 'Down / Flat Contact harus 0°');
  assert.equal(deg(0.32), 0, 'Mid-stance harus 0°');
  assert.ok(Math.abs(deg(0.5) - -24) < 0.2, `Toe-off harus -24°, dapat ${deg(0.5)}`);
  assert.ok(deg(0.58) < -10 && deg(0.92) > 12, 'Passing/Swing harus transisi halus -12° -> +14°');

  // Render walk pada side, threeQuarter, front, back, serta kucing planted tanpa crash & menerapkan ankle pitch
  const { ctx, rotations } = mockCanvasCtx();
  for (const view of ['side', 'threeQuarter', 'front', 'back', 'backThreeQuarter'] as const) {
    drawActor(ctx, 'bangUtoh', { face: 'happy', stance: 'walk', view, walkPhase: 0.0, facing: 0.8 });
    drawActor(ctx, 'bangUtoh', { face: 'happy', stance: 'walk', view, walkPhase: 0.5, facing: -0.8 });
  }
  assert.ok(rotations.some((r) => Math.abs(r) > 0.2), 'drawShoe saat walk wajib menerapkan rotasi ankle pitch');

  // Far-leg darkening berfungsi deterministik
  assert.notEqual(darkenHex('#1a2238', 0.16), '#1a2238');

  // Arm-leg counter-swing: di walkPhase=0 (kaki kanan maju +X saat hadap kanan), tangan kiri (side=-1) lebih maju (+X) daripada tangan kanan (side=+1)
  const leftH = actorHandPoint('bangUtoh', { face: 'neutral', stance: 'walk', view: 'side', facing: 1, walkPhase: 0 }, -1);
  const rightH = actorHandPoint('bangUtoh', { face: 'neutral', stance: 'walk', view: 'side', facing: 1, walkPhase: 0 }, 1);
  assert.ok(leftH.rawX > rightH.rawX, `counter-swing side: tangan kiri (${leftH.rawX.toFixed(1)}) harus maju di depan tangan kanan (${rightH.rawX.toFixed(1)}) saat walkPhase=0`);

  // Cat planted gait tidak crash & catWalkCycleMeters positif
  drawCat(ctx, CAT_PRESETS.oyen, { face: 'neutral', stance: 'walk', view: 'side', walkPhase: 0.25, facing: 1 });
  assert.ok(catWalkCycleMeters(0.62) > 0.15);
});

test('v3.5 Fase 1 · computeWalkState: auto walk/stand, ease-out strideBlend, proyeksi bidang kamera anti ice-skating', () => {
  const camPos: Vec3 = [0, 1.5, 6];
  // Karakter jalan ke kanan +X (x: -1 -> +1.5 selama 60f, lalu diam f60..90)
  const posSide = (f: number): Vec3 => {
    const t = Math.max(0, Math.min(1, f / 60));
    return [-1 + 2.5 * t, 0, 0];
  };
  const mid = computeWalkState(posSide, 30, 1.96, camPos);
  const stopped = computeWalkState(posSide, 75, 1.96, camPos);
  assert.equal(mid.stance, 'walk');
  assert.equal(mid.gait, 'planted');
  assert.equal(mid.strideBlend, 1);
  assert.equal(mid.leftArm, 'rest');
  assert.equal(mid.rightArm, 'rest');
  assert.equal(stopped.stance, 'stand');
  assert.equal(stopped.strideBlend, 0);

  // Proyeksi diagonal 45°: perpindahan lateral lebih kecil (sin 45° ≈ 0.707) sehingga walkPhase terproyeksi tepat
  const posDiag = (f: number): Vec3 => {
    const t = Math.max(0, Math.min(1, f / 60));
    const s = 2.0 * t;
    return [s * Math.SQRT1_2, 0, s * Math.SQRT1_2];
  };
  const diag = computeWalkState(posDiag, 30, 1.96, camPos, { rightArmOverride: 'hold' });
  assert.equal(diag.stance, 'walk');
  assert.equal(diag.rightArm, 'hold');
  assert.equal(diag.leftArm, 'rest');
  assert.ok(actorWalkCycleMeters(1.96, 'threeQuarter') > 0.5);
});

test('v3.5 Fase 2 · Anti-plastic GlbSet classifyGlbSurface, LIGHTS.noon soft-lit shadow, & engine/props exports', () => {
  // Matte (aspal, plester, kayu): ZERO specular & normalScale lembut 0.35
  const matte = classifyGlbSurface(0.0, 0.85);
  assert.equal(matte.kind, 'matte');
  assert.equal(matte.shininess, 0);
  assert.equal(matte.specularHex, 0x000000);
  assert.ok(matte.normalScale <= 0.36);

  // Semi-gloss (keramik/kaca opaque): terkendali
  const semi = classifyGlbSurface(0.0, 0.35);
  assert.equal(semi.kind, 'semiGloss');
  assert.equal(semi.shininess, 22);

  // Logam (dandang/tiang besi): specular terkendali
  const metal = classifyGlbSurface(0.85, 0.3);
  assert.equal(metal.kind, 'metal');
  assert.equal(metal.shininess, 48);

  // LIGHTS.noon soft-lit terminator & castShadow aktif + radius lembut
  assert.equal(LIGHTS.noon.card.castShadow, true);
  assert.ok(LIGHTS.noon.tone.term >= 0.28 && LIGHTS.noon.tone.lambert >= 0.44);
  assert.ok((LIGHTS.noon.shadow.radius ?? 0) >= 2.5);

  // Pustaka Prop 3D reusable engine/props diekspor penuh
  for (const comp of [BakmieBowl3D, DrinkCup3D, DiegeticNote3D, BoxSign3D, Phone3D, Laptop3D]) {
    assert.equal(typeof comp, 'function');
  }
});

test('v3.5 Fase 2 · Aset GLB & boxes.json sinkron: kampung.glb <= 29 MB & pallet maxY persis 0.30 / 0.44 m', () => {
  const root = process.cwd();
  const kampungGlb = path.join(root, 'public', 'sets', 'kampung.glb');
  const sizeMb = fs.statSync(kampungGlb).size / 1e6;
  assert.ok(sizeMb <= 29.0, `kampung.glb (${sizeMb.toFixed(2)} MB) wajib <= 29.0 MB`);

  for (const stem of ['kampung', 'warkop', 'kost', 'kampus']) {
    assert.ok(fs.existsSync(path.join(root, 'public', 'sets', `${stem}.glb`)), `${stem}.glb wajib ada`);
    assert.ok(fs.existsSync(path.join(root, 'public', 'sets', `${stem}.boxes.json`)), `${stem}.boxes.json wajib ada`);
  }

  const kgBoxes = JSON.parse(fs.readFileSync(path.join(root, 'public', 'sets', 'kampung.boxes.json'), 'utf8')) as {
    boxes: { name: string; min: [number, number, number]; max: [number, number, number] }[];
  };
  const tioPallet = kgBoxes.boxes.find((b) => b.name === 'KG_Grb_BakmieTio_VendorPallet');
  const yuniPallet = kgBoxes.boxes.find((b) => b.name === 'KG_Grb_EsBuahYuni_VendorPallet');
  const wkPallet = kgBoxes.boxes.find((b) => b.name === 'KG_WK_CounterPallet');
  assert.ok(tioPallet && Math.abs(tioPallet.max[1] - 0.3) < 0.005, `tioPallet maxY harus 0.30 m, dapat ${tioPallet?.max[1]}`);
  assert.ok(yuniPallet && Math.abs(yuniPallet.max[1] - 0.3) < 0.005, `yuniPallet maxY harus 0.30 m, dapat ${yuniPallet?.max[1]}`);
  assert.ok(wkPallet && Math.abs(wkPallet.max[1] - 0.44) < 0.005, `wkPallet maxY harus 0.44 m, dapat ${wkPallet?.max[1]}`);
});

test('v3.5 Fase 4 · EP04 ZERO XZ sliding: setiap frame perpindahan bangUtoh & tio wajib stance walk + planted', () => {
  let utohWalkFrames = 0;
  let tioWalkFrames = 0;
  for (let f = 1; f < EP04_TOTAL - 1; f++) {
    const camPos = sampleCamera(EP04_CAMS, f).pos;
    const uPrev = utohPositionAt(f - 1);
    const uNext = utohPositionAt(f + 1);
    const uSpeed = Math.hypot(uNext[0] - uPrev[0], uNext[2] - uPrev[2]) * 0.5;
    if (uSpeed > 0.006) {
      const p = utohPoseAt(f, camPos);
      assert.equal(p.stance, 'walk', `EP04 bangUtoh f${f} bergerak (${uSpeed.toFixed(4)} m/f) tapi stance=${p.stance}`);
      assert.equal(p.gait, 'planted', `EP04 bangUtoh f${f} wajib gait='planted'`);
      assert.notEqual(p.leftArm, 'rest', `EP04 bangUtoh f${f} dilarang leftArm='rest' di balik konter`);
      assert.notEqual(p.rightArm, 'rest', `EP04 bangUtoh f${f} dilarang rightArm='rest' di balik konter`);
      utohWalkFrames++;
    }

    const tPrev = tioPositionAt(f - 1);
    const tNext = tioPositionAt(f + 1);
    const tSpeed = Math.hypot(tNext[0] - tPrev[0], tNext[2] - tPrev[2]) * 0.5;
    if (tSpeed > 0.006) {
      const p = tioPoseAt(f, camPos);
      assert.equal(p.stance, 'walk', `EP04 tio f${f} bergerak (${tSpeed.toFixed(4)} m/f) tapi stance=${p.stance}`);
      assert.equal(p.gait, 'planted', `EP04 tio f${f} wajib gait='planted'`);
      tioWalkFrames++;
    }
  }
  assert.ok(utohWalkFrames >= 12, `EP04 bangUtoh wajib punya frame jalan nyata, dapat ${utohWalkFrames}`);
  assert.ok(tioWalkFrames >= 12, `EP04 tio wajib punya frame jalan nyata, dapat ${tioWalkFrames}`);
});
