import test from 'node:test';
import assert from 'node:assert/strict';
import { durationFromWords, reactionFrame, secToFrame, shotAt, type Word } from '../engine/core/timeline';

const words: Word[] = [
  { text: 'a', start: 0.5, end: 0.9 },
  { text: 'b', start: 3.0, end: 3.4 },
];

test('durationFromWords aman untuk daftar kosong', () => {
  assert.equal(durationFromWords([], 30), 0);
});

test('durasi = kata terakhir + napas penutup', () => {
  assert.equal(durationFromWords(words, 30, 1), secToFrame(4.4, 30));
});

test('reaksi mendarat sebelum kata dan tidak negatif', () => {
  assert.equal(reactionFrame(words, 1, 30, 2), 88);
  assert.equal(reactionFrame([{ text: 'x', start: 0, end: 0.2 }], 0, 30, 5), 0);
});

test('shotAt memilih shot yang benar dan jatuh ke shot terakhir', () => {
  const shots = [
    { id: 's1', from: 0, to: 10, light: 'noon' },
    { id: 's2', from: 10, to: 20, light: 'noon' },
  ];
  assert.equal(shotAt(shots, 9).id, 's1');
  assert.equal(shotAt(shots, 10).id, 's2');
  assert.equal(shotAt(shots, 99).id, 's2');
});
