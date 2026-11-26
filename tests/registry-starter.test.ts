import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASPECT_9_16,
  cameraBasis,
  checkBillboardSweep,
  checkCounterVisibility,
  checkSafeFraming,
  drawFaceFeatures,
  sampleCamera,
  screenSpeedPx,
  type CamPose,
} from '../engine';
import { PRODUCTIONS } from '../productions/registry';
import { ACTORS } from '../productions/_starter/cast';
import { buildStarterSubtitles } from '../productions/_starter/Production';
import { STARTER_OBSTACLES, STARTER_SPOTS } from '../productions/_starter/set';
import { CAMS, FPS, SHOTS } from '../productions/_starter/shots';
import { WORDS } from '../productions/_starter/words';

test('productions/registry.ts: semua ID komposisi unik, metadata valid, dan marker @forge utuh', () => {
  const ids = new Set<string>();
  for (const entry of PRODUCTIONS) {
    assert.ok(entry.meta.id.length > 0, 'id komposisi wajib terisi');
    assert.ok(!ids.has(entry.meta.id), `duplikat ID komposisi: ${entry.meta.id}`);
    ids.add(entry.meta.id);
    assert.ok(entry.meta.width > 0 && entry.meta.height > 0, `dimensi tidak valid pada ${entry.meta.id}`);
    assert.ok(entry.meta.fps > 0 && entry.meta.durationInFrames > 0, `fps/durasi tidak valid pada ${entry.meta.id}`);
  }
  const src = readFileSync(join(process.cwd(), 'productions/registry.ts'), 'utf8');
  assert.ok(src.includes('// @forge:imports'), 'marker // @forge:imports hilang di registry.ts');
  assert.ok(src.includes('// @forge:register'), 'marker // @forge:register hilang di registry.ts');
});

test('_starter lulus Fase 3.5 Spatial Audit: checkSafeFraming, checkBillboardSweep, checkCounterVisibility, & subtitle non-tumpang-tindih', () => {
  // 1. wide-two (f0, f24 settle, f89): kedua karakter utuh di dalam 9:16 dan tidak menyapu furnitur
  for (const f of [0, 24, 89]) {
    const cam = sampleCamera(CAMS, f);
    const framing = checkSafeFraming(
      cam,
      ACTORS.map((a) => ({
        name: a.id,
        center: [a.base[0], a.base[1] + (a.height ?? 1.9) * 0.72, a.base[2]],
        halfW: 0.25,
        halfH: 0.28,
        avoidSubtitle: true,
      })),
      ASPECT_9_16,
    );
    assert.equal(framing.ok, true, `wide-two f${f} gagal safe framing: ${framing.violations.map((v) => v.message).join('; ')}`);

    for (const a of ACTORS) {
      const sweep = checkBillboardSweep(a.base, 0.7, a.height ?? 1.9, cam.pos, STARTER_OBSTACLES, 0.04);
      assert.equal(sweep.ok, true, `wide-two f${f} ${a.id} sweep clipping: ${sweep.collisions.map((c) => c.message).join('; ')}`);
    }
  }

  // 2. medium-react (f90, f159): Bang Utoh terbingkai utuh & bebas zona subtitle
  for (const f of [90, 159]) {
    const cam = sampleCamera(CAMS, f);
    const utoh = ACTORS[0];
    const framing = checkSafeFraming(
      cam,
      [{ name: 'utoh', center: [utoh.base[0], 1.38, utoh.base[2]], halfW: 0.24, halfH: 0.26, avoidSubtitle: true }],
      ASPECT_9_16,
    );
    assert.equal(framing.ok, true, `medium-react f${f} gagal safe framing: ${framing.violations.map((v) => v.message).join('; ')}`);
  }

  // 3. macro-prop (f160, f180 settle, f219): WK_TableCup1 terbingkai aman
  for (const f of [160, 180, 219]) {
    const cam = sampleCamera(CAMS, f);
    const framing = checkSafeFraming(
      cam,
      [{ name: 'WK_TableCup1', center: STARTER_SPOTS.tableProp, halfW: 0.08, halfH: 0.1 }],
      ASPECT_9_16,
    );
    assert.equal(framing.ok, true, `macro-prop f${f} gagal safe framing: ${framing.violations.map((v) => v.message).join('; ')}`);
  }

  // 4. counterKeeper lulus checkCounterVisibility terhadap WK_CounterTop (y=0.97)
  const vis = checkCounterVisibility(STARTER_SPOTS.counterKeeper, 1.88, 0.97, 0.32);
  assert.equal(vis.ok, true, vis.message);

  // 5. Subtitle chunk non-tumpang-tindih & tidak berkedip di tengah chunk
  const chunks = buildStarterSubtitles(WORDS, FPS);
  assert.ok(chunks.length >= 2);
  for (let i = 0; i < chunks.length - 1; i++) {
    assert.ok(chunks[i].to <= chunks[i + 1].from, `chunk ${i} dan ${i + 1} tumpang tindih`);
  }
  assert.equal(SHOTS[0].from, 0);
});

test('cameraBasis tegak lurus & screenSpeedPx tahan titik di belakang kamera (nol NaN)', () => {
  const vertical: CamPose = { pos: [0, 5, 0], look: [0, 0, 0], fov: 35, roll: 0 };
  const basis = cameraBasis(vertical);
  for (const v of [...basis.forward, ...basis.right, ...basis.up]) {
    assert.ok(Number.isFinite(v), 'cameraBasis vertikal tidak boleh menghasilkan NaN');
  }

  const a: CamPose = { pos: [0, 1.5, 4], look: [0, 1.5, 0], fov: 40, roll: 0 };
  const bFlipped: CamPose = { pos: [0, 1.5, 4], look: [0, 1.5, 8], fov: 40, roll: 0 };
  const spd = screenSpeedPx(a, bFlipped);
  assert.ok(!Number.isNaN(spd), 'screenSpeedPx tidak boleh mengembalikan NaN saat titik probe di belakang kamera b');
});

test('expressions.ts strain eyes mengarah ke dalam (> <) konsisten dengan cat.ts', () => {
  const moves: [number, number][] = [];
  const lines: [number, number][] = [];
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    beginPath() {},
    closePath() {},
    moveTo(x: number, y: number) { moves.push([x, y]); },
    lineTo(x: number, y: number) { lines.push([x, y]); },
    ellipse() {},
    arc() {},
    roundRect() {},
    fill() {},
    stroke() {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;

  drawFaceFeatures(ctx, {
    cx: 350,
    cy: 300,
    headW: 250,
    skin: '#f0c8a0',
    ink: '#1f192d',
    eyeStyle: 'classic',
    face: 'strain',
    blink: 0,
    facing: 0,
  });

  // Mata kiri (s=-1, ex=313): titik awal di kiri luar (x-16=297), puncak lancip di kanan dalam (x+10=323) -> '>'
  assert.ok(moves[0][0] < lines[0][0], `mata kiri strain harus membentuk '>' (awal ${moves[0][0]} < puncak ${lines[0][0]})`);
  // Mata kanan (s=+1, ex=387): titik awal di kanan luar (x+16=403), puncak lancip di kiri dalam (x-10=377) -> '<'
  assert.ok(moves[1][0] > lines[2][0], `mata kanan strain harus membentuk '<' (awal ${moves[1][0]} > puncak ${lines[2][0]})`);
});
