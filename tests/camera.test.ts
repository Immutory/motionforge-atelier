import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCamera, kickOffset, type CamKey, type CamPose } from '../engine/core/camera';

const pose = (x: number): CamPose => ({ pos: [x, 0, 10], look: [0, 0, 0], fov: 35, roll: 0 });

test('pose pertama tidak terlewati saat glide lebih panjang dari hold', () => {
  const keys: CamKey[] = [
    { frame: 0, pose: pose(0) },
    { frame: 10, pose: pose(5), glide: 24 },
  ];
  assert.ok(Math.abs(sampleCamera(keys, 0).pos[0]) < 1e-9, 'frame 0 harus tepat di pose pertama');
  assert.ok(Math.abs(sampleCamera(keys, 10).pos[0] - 5) < 1e-6, 'frame 10 tiba di pose kedua');
});

test('cut melompat tepat di frame key', () => {
  const keys: CamKey[] = [
    { frame: 0, pose: pose(0) },
    { frame: 30, pose: pose(8), cut: true },
  ];
  assert.ok(sampleCamera(keys, 29).pos[0] < 1);
  assert.equal(Math.round(sampleCamera(keys, 30).pos[0]), 8);
});

test('hold tidak pernah diam sepenuhnya (creep push-in)', () => {
  const keys: CamKey[] = [{ frame: 0, pose: pose(0) }];
  assert.notEqual(sampleCamera(keys, 0).pos[2], sampleCamera(keys, 40).pos[2]);
});

test('kick meluruh dan berhenti', () => {
  const a = Math.abs(kickOffset([{ frame: 10, strength: 1 }], 10).dy);
  const b = Math.abs(kickOffset([{ frame: 10, strength: 1 }], 15).dy);
  assert.ok(a > b);
  assert.equal(kickOffset([{ frame: 10, strength: 1 }], 20).dy, 0);
});
