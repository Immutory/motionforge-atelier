import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CREEP, sampleCamera } from '../engine';
import { BREATH_PERIOD, poseFor } from '../productions/ep04-karyawan-bakmie/cast';
import { CAMS, POSE_HOOK_UTOH, SHOTS, TOTAL_FRAMES } from '../productions/ep04-karyawan-bakmie/shots';
import { EP04_LOOP_CUT_FRAME } from '../productions/ep04-karyawan-bakmie/words';
import {
  EP04_SUBS,
  SUB_STACK,
  SUB_ZONE_PX,
  subBlockHeight,
  subLayoutFor,
  subtitleAt,
} from '../productions/ep04-karyawan-bakmie/Production';

test('EP04 Produksi · durasi >= 60 dtk (1800f), kelipatan BREATH_PERIOD (90f), & SHOTS kontinu', () => {
  assert.ok(TOTAL_FRAMES >= 1800, `durasi ${TOTAL_FRAMES}f wajib >= 1800f (60 dtk)`);
  assert.equal(TOTAL_FRAMES % BREATH_PERIOD, 0, `TOTAL_FRAMES ${TOTAL_FRAMES} wajib kelipatan ${BREATH_PERIOD}`);
  assert.equal(SHOTS[0].from, 0);
  assert.equal(SHOTS[SHOTS.length - 1].to, TOTAL_FRAMES);
  for (let i = 0; i < SHOTS.length; i++) {
    assert.ok(SHOTS[i].to > SHOTS[i].from, `shot ${SHOTS[i].id} durasi > 0`);
    if (i > 0) assert.equal(SHOTS[i].from, SHOTS[i - 1].to, `shot ${SHOTS[i].id} kontinu`);
  }
});

test('EP04 Produksi · DEFAULT_CREEP === 0 & nol slow-zoom monoton pada semua key kamera', () => {
  assert.equal(DEFAULT_CREEP, 0);
  for (const k of CAMS) {
    assert.equal(k.creepRate ?? 0, 0, `key f${k.frame} creepRate wajib 0`);
  }
});

test('EP04 Produksi · kontinuitas matematis seamless loop f(TOTAL_FRAMES-1) -> f0', () => {
  assert.deepEqual(sampleCamera(CAMS, 0).pos, POSE_HOOK_UTOH.pos);
  assert.deepEqual(sampleCamera(CAMS, TOTAL_FRAMES - 1).pos, POSE_HOOK_UTOH.pos);
  const p0 = poseFor('bangUtoh', 0, POSE_HOOK_UTOH.pos)!;
  const pEnd = poseFor('bangUtoh', TOTAL_FRAMES - 1, POSE_HOOK_UTOH.pos)!;
  assert.equal(p0.face, pEnd.face);
  assert.equal(p0.blink, pEnd.blink);
  assert.equal(p0.leftArm, pEnd.leftArm);
  assert.equal(p0.rightArm, pEnd.rightArm);
});

test('EP04 Produksi · subtitle label-above zona aman 1485-1690 & mati di ekor loop', () => {
  assert.equal(SUB_STACK, 'label-above');
  assert.ok(EP04_SUBS.length > 35);
  for (const s of SHOTS) {
    const l = subLayoutFor(s.id);
    const bottom = l.top + subBlockHeight(l);
    assert.ok(l.top >= SUB_ZONE_PX.top && bottom <= SUB_ZONE_PX.bottom, `${s.id} di luar zona 1485..1690`);
  }
  for (let f = EP04_LOOP_CUT_FRAME; f < TOTAL_FRAMES; f++) {
    assert.equal(subtitleAt(EP04_SUBS, f), null, `subtitle f${f} wajib mati di ekor loop`);
  }
});
