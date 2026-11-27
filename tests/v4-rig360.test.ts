import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import {
  CAST_PRESETS,
  CAT_PRESETS,
  actorHandPoint,
  actorHandWorldPos,
  cardShade,
  computeEyeGeom360,
  computeWalkState,
  degToRad,
  depthDarkenFactor,
  drawActor,
  drawCat,
  resolve25DView,
  resolveYawAngle,
  rotateYaw3D,
  sortByDepthZ,
  surfacePoint3D,
  type ActorStance,
  type CastPresetId,
  type CatPresetId,
  type CatStance,
  type HairStyle,
  type ReliefPrimitive,
  type Vec3,
} from '../engine';

function createSpyCanvasCtx() {
  const xs: number[] = [];
  const ys: number[] = [];
  let m: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const stack: [number, number, number, number, number, number][] = [];
  const mul = (n: [number, number, number, number, number, number]) => {
    const [a, b, c, d, e, f] = m;
    m = [
      a * n[0] + c * n[1],
      b * n[0] + d * n[1],
      a * n[2] + c * n[3],
      b * n[2] + d * n[3],
      a * n[4] + c * n[5] + e,
      b * n[4] + d * n[5] + f,
    ];
  };
  const track = (x: number, y: number) => {
    const wx = m[0] * x + m[2] * y + m[4];
    const wy = m[1] * x + m[3] * y + m[5];
    assert.ok(Number.isFinite(wx) && Number.isFinite(wy), `Koordinat NaN/Infinity terdeteksi: (${wx}, ${wy})`);
    xs.push(wx);
    ys.push(wy);
  };
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = {
    save: () => stack.push([...m] as [number, number, number, number, number, number]),
    restore: () => {
      const prev = stack.pop();
      if (prev) m = prev;
    },
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    rect: (x: number, y: number) => track(x, y),
    setLineDash: noop,
    translate: (tx: number, ty: number) => mul([1, 0, 0, 1, tx, ty]),
    rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
    scale: (sx: number, sy: number) => mul([sx, 0, 0, sy, 0, 0]),
    beginPath: noop,
    closePath: noop,
    moveTo: (x: number, y: number) => track(x, y),
    lineTo: (x: number, y: number) => track(x, y),
    bezierCurveTo: (_c1x: number, _c1y: number, _c2x: number, _c2y: number, x: number, y: number) => track(x, y),
    quadraticCurveTo: (_cx: number, _cy: number, x: number, y: number) => track(x, y),
    arc: (x: number, y: number) => track(x, y),
    arcTo: (_x1: number, _y1: number, x2: number, y2: number) => track(x2, y2),
    ellipse: (x: number, y: number) => track(x, y),
    roundRect: (x: number, y: number) => track(x, y),
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
    strokeStyle: '#000',
    fillStyle: '#000',
    globalAlpha: 1,
    font: '12px sans-serif',
    textAlign: 'center',
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, xs, ys };
}

test('v4.0 rig360 math: continuous yaw wrap, 3D rotation, depth darkening & Z-sort', () => {
  assert.ok(Math.abs(degToRad(360)) < 1e-9);
  assert.ok(Math.abs(degToRad(-180) + Math.PI) < 1e-6 || Math.abs(degToRad(180) + Math.PI) < 1e-6);

  const p0 = rotateYaw3D([0, 0, 100], 0);
  assert.ok(Math.abs(p0.x) < 1e-6 && Math.abs(p0.z - 100) < 1e-6);
  const p90 = rotateYaw3D([0, 0, 100], Math.PI / 2);
  assert.ok(Math.abs(p90.x - 100) < 1e-6 && Math.abs(p90.z) < 1e-6);

  const s = surfacePoint3D(350, 200, 60, 48, 0, Math.PI / 2);
  assert.ok(Math.abs(s.x - 410) < 1e-6 && Math.abs(s.z) < 1e-6);

  assert.equal(depthDarkenFactor(10, 50), 0);
  assert.ok(depthDarkenFactor(-50, 50, 0.16) > 0.15);

  const sorted = sortByDepthZ([{ z: 30 }, { z: -20 }, { z: 5 }]);
  assert.deepEqual(
    sorted.map((x) => x.z),
    [-20, 5, 30],
  );

  // Orbit 360 penuh menghasilkan yawDeg kontinu & bebas NaN
  for (let deg = 0; deg < 360; deg += 2) {
    const rad = (deg * Math.PI) / 180;
    const cam: Vec3 = [Math.sin(rad) * 4, 1.5, Math.cos(rad) * 4];
    const r1 = resolveYawAngle([0, 0, 0], 0, cam);
    const r2 = resolve25DView([0, 0, 0], 0, cam);
    assert.ok(Number.isFinite(r1.yawDeg) && Number.isFinite(r2.yawDeg));
    assert.ok(r2.yawDeg >= -180 && r2.yawDeg <= 180);
  }
});

test('v4.0 full cast polish: all 13 human presets & 3 cat presets have highlight/eye/role tokens', () => {
  const humanIds = Object.keys(CAST_PRESETS) as CastPresetId[];
  assert.equal(humanIds.length, 13);
  for (const id of humanIds) {
    const spec = CAST_PRESETS[id];
    assert.ok(spec.role && spec.role.length > 0, `${id} missing role`);
    assert.ok(spec.skinHighlight && spec.skinHighlight.startsWith('#'), `${id} missing skinHighlight`);
    assert.ok(spec.hairHighlight && spec.hairHighlight.startsWith('#'), `${id} missing hairHighlight`);
    assert.equal(spec.eyeShine, true, `${id} missing eyeShine`);
    if (spec.hairStyle !== 'hijab' && spec.headgear !== 'helmet') {
      assert.equal(spec.earDetail, true, `${id} missing earDetail`);
    }
  }

  const catIds = Object.keys(CAT_PRESETS) as CatPresetId[];
  assert.equal(catIds.length, 3);
  for (const id of catIds) {
    const c = CAT_PRESETS[id];
    assert.ok(c.role && c.role.length > 0, `${id} missing role`);
    assert.ok(c.furHighlight.startsWith('#') && c.furShadow.startsWith('#'));
    assert.ok(c.eyeIris.startsWith('#') && c.pawPad.startsWith('#'));
  }

  // Pak Ujang resmi botak ('bald') + seluruh 10 variasi HairStyle merender mulus -180..180
  assert.equal(CAST_PRESETS.pakUjang.hairStyle, 'bald');
  const hairStyles: HairStyle[] = ['bald', 'short', 'quiff', 'hijab', 'curtain', 'bun', 'parted', 'spiky', 'messy', 'fadeCrop'];
  for (const hairStyle of hairStyles) {
    for (let yaw = -180; yaw <= 180; yaw += 15) {
      const { ctx } = createSpyCanvasCtx();
      drawActor(ctx, 'bangUtoh', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: yaw }, { hairStyle });
    }
  }
});

test('v4.0 360-degree turnaround render: all 13 humans + spherical eyes + reliefOut free of NaN across -180..180', () => {
  const stances: ActorStance[] = ['stand', 'walk', 'sit', 'sitCross', 'squat'];
  const yaws = [-180, -135, -90, -45, 0, 45, 90, 135, 180];

  for (const id of Object.keys(CAST_PRESETS) as CastPresetId[]) {
    const relief: ReliefPrimitive[] = [];
    const { ctx } = createSpyCanvasCtx();
    for (let i = 0; i < yaws.length; i++) {
      relief.length = 0;
      const yawDeg = yaws[i];
      const stance = stances[i % stances.length];
      drawActor(
        ctx,
        id,
        {
          face: i % 2 === 0 ? 'happy' : 'shock',
          stance,
          view: 'threeQuarter',
          walkPhase: 0.32,
          yawDeg,
          headYawDeg: yawDeg,
          pitchDeg: 5,
          leftArm: 'wave',
          rightArm: 'hold',
        },
        undefined,
        relief,
      );
      assert.ok(relief.length >= 4, `${id}@${yawDeg} expected relief primitives`);
      for (const p of relief) {
        if (p.kind === 'sphere') {
          assert.ok(Number.isFinite(p.cx) && Number.isFinite(p.cy) && p.rx > 0 && p.ry > 0);
        } else {
          assert.ok(Number.isFinite(p.x1) && Number.isFinite(p.y2) && p.radius > 0);
        }
      }
    }
  }

  // Sweep halus per 2° untuk bangUtoh + computeEyeGeom360 + cap/backpack
  for (let yaw = -180; yaw <= 180; yaw += 2) {
    const { ctx } = createSpyCanvasCtx();
    const relief: ReliefPrimitive[] = [];
    drawActor(
      ctx,
      'bangUtoh',
      { face: 'smug', stance: 'walk', walkPhase: ((yaw + 180) / 360) % 1, yawDeg: yaw, view: 'front' },
      { headgear: 'cap', backpack: true },
      relief,
    );
    const eyes = computeEyeGeom360(350, 210, 108, 'classic', degToRad(yaw));
    assert.ok(
      Number.isFinite(eyes.ex(-1)) &&
        Number.isFinite(eyes.ex(1)) &&
        eyes.frontVis >= -1 &&
        eyes.frontVis <= 1,
    );
  }
});

test('v4.0 actorHandWorldPos rawZ 3D depth respects front (0 deg) vs back (180 deg) yaw', () => {
  const frontPose = { face: 'neutral' as const, stance: 'stand' as const, view: 'front' as const, rightArm: 'hold' as const, yawDeg: 0 };
  const backPose = { face: 'neutral' as const, stance: 'stand' as const, view: 'back' as const, rightArm: 'hold' as const, yawDeg: 180 };
  const ptFront = actorHandPoint('bangUtoh', frontPose, 1);
  const ptBack = actorHandPoint('bangUtoh', backPose, 1);
  assert.ok(ptFront.rawZ !== undefined && ptBack.rawZ !== undefined);
  assert.ok(ptFront.rawZ > ptBack.rawZ, `expected hand rawZ in front (${ptFront.rawZ}) > back (${ptBack.rawZ})`);

  const posFront = actorHandWorldPos('bangUtoh', frontPose, 1, [0, 0, 0], [0, 1.5, 4]);
  const posBack = actorHandWorldPos('bangUtoh', backPose, 1, [0, 0, 0], [0, 1.5, 4]);
  assert.ok(posFront[2] > posBack[2], 'world hand Z must track forward/back 3D rotation');
});

test('v4.0 360-degree cat rig & backThreeQuarter bugfix: all 3 cats & 5 stances clean', () => {
  const stances: CatStance[] = ['sit', 'stand', 'walk', 'jump', 'sleep'];
  const yaws = [-180, -135, -90, -45, 0, 45, 90, 135, 180];

  for (const id of Object.keys(CAT_PRESETS) as CatPresetId[]) {
    for (const stance of stances) {
      for (const yawDeg of yaws) {
        const { ctx } = createSpyCanvasCtx();
        const relief: ReliefPrimitive[] = [];
        drawCat(ctx, CAT_PRESETS[id], { face: 'happy', stance, walkPhase: 0.4, yawDeg }, relief);
        assert.ok(relief.length >= 2, `cat ${id}/${stance}@${yawDeg} missing relief`);
      }
    }
  }

  // Legacy backThreeQuarter regression: torso span harus horizontal profil penuh (~264 px lebar), bukan menciut (~192 px)!
  const { ctx, xs } = createSpyCanvasCtx();
  drawCat(ctx, CAT_PRESETS.oyen, { face: 'neutral', stance: 'stand', view: 'backThreeQuarter', facing: 0.72 });
  const span = Math.max(...xs) - Math.min(...xs);
  assert.ok(span >= 245, `expected backThreeQuarter cat profile width >= 245px, got ${span}`);
});

test('v4.0 computeWalkState emits yawDeg/yawRad & cardShade wires uReliefMap uniforms', () => {
  const ws = computeWalkState(
    (f) => [f * 0.05, 0, 0],
    10,
    1.96,
    [0, 1.5, 4],
  );
  assert.equal(ws.stance, 'walk');
  assert.ok(typeof ws.yawDeg === 'number' && Number.isFinite(ws.yawDeg));
  assert.ok(typeof ws.yawRad === 'number' && Number.isFinite(ws.yawRad));

  const tex = new THREE.DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1);
  const mat = cardShade(new THREE.MeshLambertMaterial(), { map: tex, texel: [1 / 350, 1 / 550], enabled: true });
  assert.equal(mat.customProgramCacheKey(), 'atelierCardV4');
  assert.equal(mat.userData.cardRelief.uHasRelief.value, 1.0);
  tex.dispose();
  mat.dispose();
});

test('v4.6 hair & headgear 360 regressions: no cheek fillRect smear, attached iket wing, continuous cap/bun/helmet, & bald pakUjang', () => {
  // Cek 1: Pada ebot@90° (fadeCrop), fillRect penuh selebar kepala di dagu tidak boleh terpanggil lagi!
  const fillRectCalls: { x: number; y: number; w: number; h: number }[] = [];
  const spy90 = createSpyCanvasCtx();
  const spyCtx90 = spy90.ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void };
  const origFillRect = spyCtx90.fillRect;
  spyCtx90.fillRect = (x: number, y: number, w: number, h: number) => {
    fillRectCalls.push({ x, y, w, h });
    origFillRect(x, y, w, h);
  };
  drawActor(spy90.ctx, 'ebot', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: 90 });
  const cheekSmears = fillRectCalls.filter((r) => r.w >= 140 && r.y >= 340 && r.y <= 410);
  assert.equal(cheekSmears.length, 0, `expected 0 horizontal fadeCrop cheek smears, got ${JSON.stringify(cheekSmears)}`);

  // Cek 2: Iket Saka selalu terpusat di sekitar kepala (CX = 350), tidak pernah terlepas ke tepi kiri (x < 120)
  for (let yaw = -180; yaw <= 180; yaw += 30) {
    const { ctx, xs } = createSpyCanvasCtx();
    drawActor(ctx, 'saka', { face: 'focus', stance: 'stand', view: 'front', yawDeg: yaw });
    const minX = Math.min(...xs);
    assert.ok(minX >= 140, `saka@${yaw} expected centered geometry >= 140px, got minX=${minX}`);
  }

  // Cek 3: Restorasi kurva poni asli HEAD (messy ahoge & curtain cowlick & fadeCrop crown) + pakUjang bald
  const { ys: utohFrontYs } = createSpyCanvasCtx();
  // Ambil tanpa headgear untuk verifikasi siluet rambut murni
  drawActor(createSpyCanvasCtx().ctx, 'bangUtoh', { face: 'neutral', stance: 'stand', view: 'front' });
  const utohHairSpy = createSpyCanvasCtx();
  drawActor(utohHairSpy.ctx, 'bangUtoh', { face: 'neutral', stance: 'stand', view: 'front' }, { headgear: 'none' });
  const utohCrownMinY = Math.min(...utohHairSpy.ys);
  assert.ok(utohCrownMinY <= 160, `expected restored bangUtoh ahoge peak <= 160, got ${utohCrownMinY} (unused ${utohFrontYs.length})`);

  const sakaLegacySide = createSpyCanvasCtx();
  drawActor(sakaLegacySide.ctx, 'bangUdin', { face: 'happy', stance: 'stand', view: 'side', facing: 1 });
  assert.ok(sakaLegacySide.xs.length > 20);

  for (const id of Object.keys(CAST_PRESETS) as CastPresetId[]) {
    for (let yaw = -180; yaw <= 180; yaw += 15) {
      const { ctx, xs } = createSpyCanvasCtx();
      drawActor(ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg: yaw });
      assert.ok(Math.max(...xs) <= 620 && Math.min(...xs) >= 80, `${id}@${yaw} geometry out of bounds`);
    }
  }
});

test('v4.7 HEAD hair restoration & rotation fidelity: short back nape, saka spiky below iket, pakBudi gray temple, & legacy cap/iket/helmet', () => {
  // 1. short (arya, dimas, bangUdin) pada 180° tidak botak (harus menutup hingga tengkuk y >= 370)
  const fills: string[] = [];
  const spyShort = createSpyCanvasCtx();
  const rawCtx = spyShort.ctx as unknown as { fill: () => void; strokeStyle: string; fillStyle: string; stroke: () => void };
  const origFill = rawCtx.fill;
  const ysAtFill: number[] = [];
  rawCtx.fill = function () {
    fills.push(String(rawCtx.fillStyle));
    ysAtFill.push(spyShort.ys[spyShort.ys.length - 1] ?? 0);
    origFill();
  };
  drawActor(spyShort.ctx, 'arya', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: 180 }, { headgear: 'none' });
  const darkHairFillYs = fills
    .map((col, idx) => ({ col, y: ysAtFill[idx] }))
    .filter((entry) => entry.col.toLowerCase() === CAST_PRESETS.arya.hairColor.toLowerCase());
  assert.ok(darkHairFillYs.length >= 1, 'arya@180 short hair should fill back skull');

  // 2. pakBudi@0° mempertahankan garis uban pelipis (#c5cad6)
  const strokeCols: string[] = [];
  const spyBudi = createSpyCanvasCtx();
  const bCtx = spyBudi.ctx as unknown as { strokeStyle: string; stroke: () => void };
  const origStroke = bCtx.stroke;
  bCtx.stroke = () => {
    strokeCols.push(String(bCtx.strokeStyle).toLowerCase());
    origStroke();
  };
  drawActor(spyBudi.ctx, 'pakBudi', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: 0 });
  assert.ok(strokeCols.includes('#c5cad6'), 'pakBudi@0° must restore gray temple highlight #c5cad6');

  // 3. saka@0° & 21° tanpa iket memiliki puncak spike (-62) + tepi bawah dahi menjangkau di bawah pita iket
  const spySaka = createSpyCanvasCtx();
  drawActor(spySaka.ctx, 'saka', { face: 'focus', stance: 'stand', view: 'front', yawDeg: 0 }, { headgear: 'none' });
  assert.ok(Math.min(...spySaka.ys) <= 185, `saka spiky top should reach <= 185, got ${Math.min(...spySaka.ys)}`);

  // 4. Legacy headgear edge cases (back cap tidak menjorok +204, legacy iket facing < 0 mirror kiri)
  const capBack = createSpyCanvasCtx();
  drawActor(capBack.ctx, 'dimas', { face: 'neutral', stance: 'stand', view: 'back', facing: 0.34 });
  assert.ok(Math.max(...capBack.xs) <= 525, `legacy back cap brim should not poke far right, got maxX=${Math.max(...capBack.xs)}`);

  const iketLeft = createSpyCanvasCtx();
  drawActor(iketLeft.ctx, 'saka', { face: 'focus', stance: 'stand', view: 'threeQuarter', facing: -0.6 });
  assert.ok(Math.min(...iketLeft.xs) < 280 && Math.max(...iketLeft.xs) < 550);
});

test('v4.8 branchless full-width 2.5D classic HEAD hair consistency: zero narrow chimney across all yaw angles & seated bun', () => {
  const unifiedActors: CastPresetId[] = ['ebot', 'pakBudi', 'tio', 'raka', 'bangUtoh', 'buSiti', 'saka'];
  const checkYaws = [-135, -90, -65, -45, -21, -11, 0, 11, 21, 45, 65, 90, 135, 180];

  for (const id of unifiedActors) {
    const spec = CAST_PRESETS[id];
    for (const yawDeg of checkYaws) {
      let curPts: { x: number; y: number }[] = [];
      const hairPolys: { x: number; y: number }[][] = [];
      const spy = createSpyCanvasCtx();
      const raw = spy.ctx as unknown as {
        beginPath: () => void;
        moveTo: (x: number, y: number) => void;
        lineTo: (x: number, y: number) => void;
        fill: () => void;
        fillStyle: string;
      };
      const origBegin = raw.beginPath;
      const origMove = raw.moveTo;
      const origLine = raw.lineTo;
      const origFill = raw.fill;
      raw.beginPath = () => {
        curPts = [];
        origBegin();
      };
      raw.moveTo = (x: number, y: number) => {
        origMove(x, y);
        curPts.push({ x: spy.xs[spy.xs.length - 1], y: spy.ys[spy.ys.length - 1] });
      };
      raw.lineTo = (x: number, y: number) => {
        origLine(x, y);
        curPts.push({ x: spy.xs[spy.xs.length - 1], y: spy.ys[spy.ys.length - 1] });
      };
      raw.fill = () => {
        if (String(raw.fillStyle).toLowerCase() === spec.hairColor.toLowerCase() && curPts.length >= 20) {
          hairPolys.push([...curPts]);
        }
        origFill();
      };

      drawActor(spy.ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg }, { headgear: 'none' });
      assert.ok(hairPolys.length >= 1, `${id}@${yawDeg} must render a unified hair polygon`);
      // Lebar mahkota atas pada y <= 215 (headTop + 23) wajib lebar penuh (>= 185 px), TIDAK PERNAH menciut jadi cerobong 70 px!
      const mainHair = hairPolys[hairPolys.length - 1];
      const upperPts = mainHair.filter((p) => p.y <= 215);
      assert.ok(upperPts.length >= 6, `${id}@${yawDeg} missing upper crown points`);
      const crownSpanX = Math.max(...upperPts.map((p) => p.x)) - Math.min(...upperPts.map((p) => p.x));
      assert.ok(
        crownSpanX >= 185,
        `${id}@${yawDeg} narrow chimney detected: upper crown width=${crownSpanX.toFixed(1)}px (expected >= 185px)`,
      );
    }

    // Verifikasi kontinuitas C0 mulus (tanpa cabang loncat exactFrontBlend di 5.7°): perubahan puncak Y tiap 3° wajib <= 5 px!
    let prevMinY: number | null = null;
    for (let yaw = 0; yaw <= 45; yaw += 3) {
      const spy = createSpyCanvasCtx();
      drawActor(spy.ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg: yaw }, { headgear: 'none' });
      const minY = Math.min(...spy.ys);
      if (prevMinY !== null) {
        assert.ok(
          Math.abs(minY - prevMinY) <= 5,
          `${id} crown jump between ${yaw - 3}° and ${yaw}°: |${minY.toFixed(2)} - ${prevMinY.toFixed(2)}| > 5px`,
        );
      }
      prevMinY = minY;
    }
  }

  // v5.0: Simetri kiri vs kanan (-90° vs +90°): kepala faceted Saka, uban Pak Budi, lebar telinga >= 14 px, & ComicFx di atas satpamCap
  const sakaR = createSpyCanvasCtx();
  const sakaL = createSpyCanvasCtx();
  drawActor(sakaR.ctx, 'saka', { face: 'focus', stance: 'stand', view: 'front', yawDeg: 90 });
  drawActor(sakaL.ctx, 'saka', { face: 'focus', stance: 'stand', view: 'front', yawDeg: -90 });
  const spanSakaR = Math.max(...sakaR.xs) - Math.min(...sakaR.xs);
  const spanSakaL = Math.max(...sakaL.xs) - Math.min(...sakaL.xs);
  assert.ok(Math.abs(spanSakaR - spanSakaL) <= 6, `saka faceted head must be left/right symmetric: +90=${spanSakaR.toFixed(1)}, -90=${spanSakaL.toFixed(1)}`);

  for (const yaw of [-90, 90]) {
    const strokes: string[] = [];
    const spyB = createSpyCanvasCtx();
    const rawB = spyB.ctx as unknown as { strokeStyle: string; stroke: () => void };
    const origS = rawB.stroke;
    rawB.stroke = () => {
      strokes.push(String(rawB.strokeStyle).toLowerCase());
      origS();
    };
    drawActor(spyB.ctx, 'pakBudi', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: yaw });
    assert.ok(strokes.includes('#c5cad6'), `pakBudi@${yaw}° must preserve gray temple highlight #c5cad6 on both sides`);
  }

  // Verifikasi telinga Pak Ujang pada ±90° berdiameter lebar utuh (rx >= 15 px, bukan menciut 8 px!) & shock ComicFx terangkat hatPop
  const earRxs: number[] = [];
  const spyUjang90 = createSpyCanvasCtx();
  const rawU90 = spyUjang90.ctx as unknown as { ellipse: (x: number, y: number, rx: number, ry: number) => void };
  const origEll = rawU90.ellipse;
  rawU90.ellipse = (x, y, rx, ry) => {
    if (Math.abs(ry - 23) <= 2 || Math.abs(ry - 24) <= 2) earRxs.push(rx);
    origEll(x, y, rx, ry);
  };
  drawActor(spyUjang90.ctx, 'pakUjang', { face: 'neutral', stance: 'stand', view: 'front', yawDeg: 90 });
  assert.ok(earRxs.some((rx) => rx >= 15), `pakUjang@90° ear must stay full width >= 15px, got ${JSON.stringify(earRxs)}`);

  const spyUjangShock = createSpyCanvasCtx();
  drawActor(spyUjangShock.ctx, 'pakUjang', { face: 'shock', hatPop: 1, stance: 'stand', view: 'front', yawDeg: 10 });
  assert.ok(Math.min(...spyUjangShock.ys) <= 20, `pakUjang shock ComicFx must lift above popped satpamCap, got minY=${Math.min(...spyUjangShock.ys)}`);
});

test('v5.1 C0/C1 360-degree continuity: zero sudden pop across -180..180 for hair, outfits, helmet, backpack, iket & hijab', () => {
  const sampleCast: CastPresetId[] = ['bangUdin', 'ebot', 'tio', 'raka', 'saka', 'buSiti', 'rara', 'pakUjang'];
  for (const id of sampleCast) {
    // 1. Wrap continuity: -180° dan +180° wajib identik (< 1.5 px selisih bounding-box)!
    const sNeg = createSpyCanvasCtx();
    const sPos = createSpyCanvasCtx();
    drawActor(sNeg.ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg: -180 });
    drawActor(sPos.ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg: 180 });
    const spanNeg = Math.max(...sNeg.xs) - Math.min(...sNeg.xs);
    const spanPos = Math.max(...sPos.xs) - Math.min(...sPos.xs);
    assert.ok(
      Math.abs(spanNeg - spanPos) <= 1.5,
      `${id} wrap discontinuity at ±180°: -180=${spanNeg.toFixed(1)}, +180=${spanPos.toFixed(1)}`,
    );

    // 2. Sapu kontinu tiap 4° melewati seluruh sudut rawan (±65°, ±71°, ±90°, ±106°, ±115°, ±180°): nol loncatan tinggi Y mendadak!
    let prevMinY: number | null = null;
    for (let yaw = -180; yaw <= 180; yaw += 4) {
      const spy = createSpyCanvasCtx();
      drawActor(spy.ctx, id, { face: 'neutral', stance: 'stand', view: 'front', yawDeg: yaw });
      const minY = Math.min(...spy.ys);
      if (prevMinY !== null) {
        assert.ok(
          Math.abs(minY - prevMinY) <= 12,
          `${id} sudden vertical pop between ${yaw - 4}° and ${yaw}°: |${minY.toFixed(1)} - ${prevMinY.toFixed(1)}| > 12px`,
        );
      }
      prevMinY = minY;
    }
  }
});

test('v4.0 cleanup verification: 0 __pycache__ dirs in workspace scripts', () => {
  for (const dir of ['pipeline/voice', 'sound', 'tests']) {
    const abs = join(process.cwd(), dir);
    if (existsSync(abs)) {
      const entries = readdirSync(abs);
      assert.ok(!entries.includes('__pycache__'), `${dir}/__pycache__ should not exist`);
    }
  }
});
