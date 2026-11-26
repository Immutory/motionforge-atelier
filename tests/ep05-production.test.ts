import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CREEP, sampleCamera } from '../engine';
import { BREATH_PERIOD, actorPositionAt, belangPositionAt, poseFor } from '../productions/ep05-parkir-gratis-utoh/cast';
import { CAMS, POSE_HOOK_PLAK, SHOTS, TOTAL_FRAMES } from '../productions/ep05-parkir-gratis-utoh/shots';
import { EP05_LOOP_CUT_FRAME } from '../productions/ep05-parkir-gratis-utoh/words';
import {
  EP05_SUBS,
  SUB_STACK,
  SUB_ZONE_PX,
  subBlockHeight,
  subLayoutFor,
  subtitleAt,
} from '../productions/ep05-parkir-gratis-utoh/Production';

test('EP05 Produksi · durasi >= 60 dtk (1800f), kelipatan BREATH_PERIOD (90f), & SHOTS kontinu', () => {
  assert.ok(TOTAL_FRAMES >= 1800, `durasi ${TOTAL_FRAMES}f wajib >= 1800f (60 dtk)`);
  assert.equal(TOTAL_FRAMES % BREATH_PERIOD, 0, `TOTAL_FRAMES ${TOTAL_FRAMES} wajib kelipatan ${BREATH_PERIOD}`);
  assert.equal(SHOTS[0].from, 0);
  assert.equal(SHOTS[SHOTS.length - 1].to, TOTAL_FRAMES);
  for (let i = 0; i < SHOTS.length; i++) {
    assert.ok(SHOTS[i].to > SHOTS[i].from, `shot ${SHOTS[i].id} durasi > 0`);
    if (i > 0) assert.equal(SHOTS[i].from, SHOTS[i - 1].to, `shot ${SHOTS[i].id} kontinu`);
  }
});

test('EP05 Produksi · DEFAULT_CREEP === 0 & nol slow-zoom monoton pada semua key kamera', () => {
  assert.equal(DEFAULT_CREEP, 0);
  for (const k of CAMS) {
    assert.equal(k.creepRate ?? 0, 0, `key f${k.frame} creepRate wajib 0`);
  }
});

test('EP05 Produksi · kontinuitas matematis seamless loop f(TOTAL_FRAMES-1) -> f0', () => {
  assert.deepEqual(sampleCamera(CAMS, 0).pos, POSE_HOOK_PLAK.pos);
  assert.deepEqual(sampleCamera(CAMS, TOTAL_FRAMES - 1).pos, POSE_HOOK_PLAK.pos);
  const p0 = poseFor('bangUtoh', 0, POSE_HOOK_PLAK.pos)!;
  const pEnd = poseFor('bangUtoh', TOTAL_FRAMES - 1, POSE_HOOK_PLAK.pos)!;
  assert.equal(p0.face, pEnd.face);
  assert.equal(p0.blink, pEnd.blink);
  assert.equal(p0.leftArm, pEnd.leftArm);
  assert.equal(p0.rightArm, pEnd.rightArm);
});

test('EP05 Produksi · anti-teleport: MAX_STEP <= 0,16 m/f di semua 6 karakter pada frame non-cut', () => {
  const cuts = new Set(SHOTS.map((s) => s.from));
  const jumps: string[] = [];
  for (const id of ['bangUtoh', 'ebot', 'bangUdin', 'raka', 'pakBudi', 'belang'] as const) {
    let prev: [number, number, number] | null = null;
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const cam = sampleCamera(CAMS, f).pos;
      const p = id === 'belang' ? belangPositionAt(f, cam) : actorPositionAt(id, f, cam);
      if (prev && p && !cuts.has(f)) {
        const d = Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
        if (d > 0.16) jumps.push(`${id}@f${f}: ${d.toFixed(3)}m`);
      }
      prev = p;
    }
  }
  assert.deepEqual(jumps, []);
});

test('EP05 Produksi · subtitle label-above zona aman 1485-1690 & mati di ekor loop', () => {
  assert.equal(SUB_STACK, 'label-above');
  assert.ok(EP05_SUBS.length > 40);
  for (const s of SHOTS) {
    const l = subLayoutFor(s.id);
    const bottom = l.top + subBlockHeight(l);
    assert.ok(l.top >= SUB_ZONE_PX.top && bottom <= SUB_ZONE_PX.bottom, `${s.id} di luar zona 1485..1690`);
  }
  for (let f = EP05_LOOP_CUT_FRAME; f < TOTAL_FRAMES; f++) {
    assert.equal(subtitleAt(EP05_SUBS, f), null, `subtitle f${f} wajib mati di ekor loop`);
  }
});
