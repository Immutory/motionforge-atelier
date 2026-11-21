import test from 'node:test';
import assert from 'node:assert/strict';
import { blinkLidAt } from '../engine/cast/bean';
import { talkAt, talkWave } from '../engine/cast/lipsync';
import { CAST_PRESETS, resolveActorSpec } from '../engine/cast/nusantara';
import { cameraRelativeSun } from '../engine/stage/lights';
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

test('CAST_PRESETS memuat 9 karakter Indonesia (termasuk Pemeran #1 bangUtoh) dan resolveActorSpec tidak memutasi preset', () => {
  assert.deepEqual(Object.keys(CAST_PRESETS).sort(), [
    'arya',
    'bangUdin',
    'bangUtoh',
    'buSiti',
    'dimas',
    'pakBudi',
    'raka',
    'rara',
    'saka',
  ]);
  assert.equal(CAST_PRESETS.bangUtoh.name, 'Bolohoutoh (Bang Utoh)');
  assert.equal(CAST_PRESETS.bangUtoh.headgear, 'headphones');
  assert.equal(CAST_PRESETS.bangUtoh.outfit, 'hoodieTech');
  assert.equal(CAST_PRESETS.bangUtoh.defaultProp, 'laptop');

  const custom = resolveActorSpec('bangUtoh', { headgear: 'none', outfitColor: '#b53b3b' });
  assert.equal(custom.name, 'Bolohoutoh (Bang Utoh)');
  assert.equal(custom.headgear, 'none');
  assert.equal(custom.outfitColor, '#b53b3b');
  // Preset asli tetap utuh
  assert.equal(CAST_PRESETS.bangUtoh.headgear, 'headphones');
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
