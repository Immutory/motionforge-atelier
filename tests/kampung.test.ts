import test from 'node:test';
import assert from 'node:assert/strict';
import { KAMPUNG_SPOTS, KAMPUS_SPOTS } from '../engine/sets';
import { CAST_PRESETS, buildFactors } from '../engine/cast/nusantara';

type V3 = readonly [number, number, number];
const spots = Object.entries(KAMPUNG_SPOTS) as [string, V3][];

/** Ketinggian lantai sah di atas tanah (m). Selain ini, spot harus berada di tanah/trotoar/teras (0..0.16 m). */
const ELEVATED = {
  2.8: 'atap kanopi Warkop',
  3.48: 'balkon lantai 2 Kos',
  3.75: 'lantai 2 sekolah',
  7.35: 'lantai 3 sekolah',
  4.15: 'lantai 2 Gedung FIK',
  8.15: 'lantai 3 Gedung FIK',
} as const;

test('setiap KAMPUNG_SPOTS berdiri di tanah atau di lantai bertingkat yang sah', () => {
  for (const [name, [, y]] of spots) {
    if (y <= 0.16) {
      assert.ok(y >= -0.01, `${name} tenggelam di bawah tanah (y=${y})`);
      continue;
    }
    const ok = Object.keys(ELEVATED).some((h) => Math.abs(Number(h) - y) < 0.011);
    assert.ok(ok, `${name} melayang di y=${y}: bukan tinggi lantai yang dikenal`);
  }
});

test('setiap KAMPUNG_SPOTS berada di dalam batas dunia Kampung v2 (264 × 220 m)', () => {
  for (const [name, [x, y, z]] of spots) {
    assert.ok([x, y, z].every(Number.isFinite), `${name} bukan angka`);
    assert.ok(Math.abs(x) <= 132, `${name} di luar batas X (x=${x})`);
    assert.ok(z >= -120 && z <= 100, `${name} di luar batas Z (z=${z})`);
  }
});

test('spot lantai atas Gedung FIK dan sekolah berada di dalam tapak gedungnya', () => {
  for (const [name, [x, y, z]] of spots) {
    if (Math.abs(y - 4.15) < 0.011 || Math.abs(y - 8.15) < 0.011) {
      assert.ok(x > 7 && x < 22.8 && z < -0.5 && z > -14.5, `${name} di luar tapak FIK (x=${x}, z=${z})`);
    }
    if (Math.abs(y - 3.75) < 0.011 || Math.abs(y - 7.35) < 0.011) {
      assert.ok(x > 90 && x < 128 && z < -16 && z > -28, `${name} di luar tapak sekolah (x=${x}, z=${z})`);
    }
  }
});

/** Tapak bangunan di sekitar gang dan plaza FIK dalam koordinat Blender (X timur, Y utara): [x0, y0, x1, y1]. */
const FOOTPRINTS: Record<string, readonly [number, number, number, number]> = {
  'Gedung FIK': [7.0, 0.5, 22.8, 14.5],
  'Pos Satpam FIK': [16.63, -1.63, 18.38, 0.13],
  'Kos Putra': [-16.0, -2.3, -8.4, 2.85],
  Masjid: [-25.8, -2.0, -20.2, 3.6],
  HouseRow1_04: [-26.7, 6.9, -21.3, 11.5],
  HouseRow1_06: [-10.7, 6.9, -5.3, 11.5],
  'SideBuilding W1': [-82.0, 2.5, -72.0, 14.5],
  'SideBuilding E1': [72.0, 2.5, 82.0, 14.5],
};

test('gangGapura, posSatpam, halteKampus tidak masuk tapak bangunan (jarak badan 0,25 m)', () => {
  const r = 0.25;
  for (const key of ['gangGapura', 'posSatpam', 'halteKampus'] as const) {
    const [x, , z] = KAMPUNG_SPOTS[key];
    const by = -z; // Three.js z = -Blender Y
    for (const [fp, [x0, y0, x1, y1]] of Object.entries(FOOTPRINTS)) {
      const inside = x > x0 - r && x < x1 + r && by > y0 - r && by < y1 + r;
      assert.ok(!inside, `${key} (X ${x}, Y ${by}) masuk tapak ${fp}`);
    }
  }
  const [gx, gy, gz] = KAMPUNG_SPOTS.gangGapura;
  assert.ok(gx > -19.8 && gx < -16.5 && -gz > -3.6 && -gz < 15.35 && gy === 0.03, 'gangGapura harus di paving Gang Gapura');
  const [hx, hy, hz] = KAMPUNG_SPOTS.halteKampus;
  assert.ok(hx > 18.1 && hx < 21.5 && -hz > -3.62 && -hz < -2.28 && hy === 0.16, 'halteKampus harus di peron halte');
  const [sx, sy, sz] = KAMPUNG_SPOTS.posSatpam;
  assert.ok(sx > 7 && sx < 22.8 && -sz > -2.0 && -sz < 0.5 && sy === 0.08, 'posSatpam harus di paving plaza FIK');
});

test('spot yang dipakai produksi tidak berubah diam-diam', () => {
  assert.deepEqual([...KAMPUNG_SPOTS.bakmieTioVendor], [-13.02, 0.04, 18.38]);
  assert.deepEqual([...KAMPUNG_SPOTS.esBuahYuniVendor], [-9.62, 0.04, 18.38]);
  assert.deepEqual([...KAMPUNG_SPOTS.pakUjangPatrol], [-10.85, 0, 11.4]);
  assert.deepEqual([...KAMPUNG_SPOTS.kampusLab], [...KAMPUNG_SPOTS.kampusLab2]);
});

test('KAMPUS_SPOTS berada di lantai Lab Komputer FIK dan di dalam ruangannya', () => {
  for (const [name, [x, y, z]] of Object.entries(KAMPUS_SPOTS) as [string, V3][]) {
    assert.equal(y, 0, `${name} harus di lantai lab`);
    assert.ok(Math.abs(x) < 4.2 && Math.abs(z) < 3.7, `${name} di luar ruangan lab (x=${x}, z=${z})`);
  }
});

test('buildFactors: regular tetap identitas sehingga karakter lain tidak berubah', () => {
  assert.deepEqual(buildFactors({}), { torso: 1, limb: 1, belly: 0, armOut: 0, hipOut: 0, apron: 1 });
  assert.deepEqual(buildFactors({ build: 'regular' }), buildFactors({}));
  const big = buildFactors({ build: 'big' });
  const slim = buildFactors({ build: 'slim' });
  assert.ok(big.torso > 1 && big.limb > 1 && big.armOut > 0, 'big lebih besar dari regular');
  assert.ok(slim.torso < 1 && slim.limb < 1, 'slim lebih ramping dari regular');
  for (const [id, spec] of Object.entries(CAST_PRESETS)) {
    if (id !== 'tio') assert.equal(spec.build ?? 'regular', 'regular', `${id} seharusnya build regular`);
  }
});

test('revisi Tio: tanpa topi, kacamata tebal, kulit gelap, badan besar', () => {
  const tio = CAST_PRESETS.tio;
  assert.equal(tio.headgear, 'none');
  assert.equal(tio.glasses, true);
  assert.equal(tio.glassesStyle, 'thick');
  assert.equal(tio.build, 'big');
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  assert.ok(lum(tio.skin) < 0.5, `kulit Tio harus sawo matang gelap (luminans ${lum(tio.skin).toFixed(2)})`);
});
