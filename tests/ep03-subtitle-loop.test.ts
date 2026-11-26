import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleCamera, shotAt } from '../engine';
import {
  EP03_SUBS,
  SPEAKER_META,
  SUB_LAYOUT_BY_SHOT,
  SUB_LAYOUT_DEFAULT,
  SUB_LINE_HEIGHT,
  SUB_STACK,
  SUB_ZONE_PX,
  renderFrameOf,
  subBlockHeight,
  subLayoutFor,
  subtitleAt,
} from '../productions/ep03-tio-bakmie/Production';
import { CAMS, SHOTS, TOTAL_FRAMES } from '../productions/ep03-tio-bakmie/shots';
import { EP03_LOOP_CUT_FRAME } from '../productions/ep03-tio-bakmie/words';

/** Pop subtitle memuncak di skala 1.04 dengan origin 40% tinggi blok. */
const POP_MAX = 1.04;
/** Lebar rata-rata glyph Segoe UI Black (em), label kapital + letterSpacing 2 px. */
const TEXT_EM = 0.6;
const LABEL_EM = 0.75;
const SAFE_WIDTH = 1080 - 2 * 60;

for (const scale of [1, 0.5, 2]) {
  test(`(a) setiap chunk subtitle berada di zona studio 1485–1690 (pxScale ${scale})`, () => {
    for (const c of EP03_SUBS) {
      for (let f = c.from; f < c.to; f++) {
        const shot = shotAt(SHOTS, f);
        const l = subLayoutFor(shot.id);
        const h = subBlockHeight(l);
        const top = (l.top - 0.4 * h * (POP_MAX - 1)) * scale;
        const bottom = (l.top + h + 0.6 * h * (POP_MAX - 1)) * scale;
        const ctx = `"${c.tokens.map((t) => t.text).join(' ')}" f${f} ${shot.id}`;
        assert.ok(top >= SUB_ZONE_PX.top * scale - 1e-6, `${ctx}: atas ${top}`);
        assert.ok(bottom <= SUB_ZONE_PX.bottom * scale + 1e-6, `${ctx}: bawah ${bottom}`);
      }
    }
  });
}

test('(a) teks satu baris muat di lebar aman (nowrap tidak meluber)', () => {
  for (const c of EP03_SUBS) {
    const text = c.tokens.map((t) => t.text).join(' ');
    const label = SPEAKER_META[c.speaker]?.label ?? '';
    for (let f = c.from; f < c.to; f++) {
      const l = subLayoutFor(shotAt(SHOTS, f).id);
      const textW = text.length * TEXT_EM * l.textPx;
      const labelW = label.length * (LABEL_EM * l.labelPx + 2);
      const w = Math.max(textW, labelW) * POP_MAX;
      // Area konten: left 60+2dx, right 60 → lebar 960−2dx, pusat 540+dx (tetap di kanvas aman 60..1020).
      const avail = SAFE_WIDTH - 2 * Math.abs(l.dx);
      assert.ok(w <= avail, `"${text}" f${f}: lebar ${w.toFixed(0)} > ${avail}`);
    }
  }
});

test('label pembicara SELALU di atas teks (bertumpuk, tidak ada mode di samping) di semua shot', () => {
  assert.equal(SUB_STACK, 'label-above');
  for (const l of [SUB_LAYOUT_DEFAULT, ...Object.values(SUB_LAYOUT_BY_SHOT)]) {
    assert.ok(!('inline' in l), 'mode label-di-samping masih ada');
    const labelBottom = l.top + l.labelPx * SUB_LINE_HEIGHT.label;
    const textTop = labelBottom + l.gapPx;
    assert.ok(textTop > l.top && textTop >= labelBottom, 'teks harus di bawah label');
    // Tinggi blok = label + gap + teks (dua baris bertumpuk), bukan max(label, teks).
    assert.equal(subBlockHeight(l), l.labelPx * SUB_LINE_HEIGHT.label + l.gapPx + l.textPx * SUB_LINE_HEIGHT.text);
    // Keterbacaan HP: teks ≥ 48 px, label ≥ 22 px @1920.
    assert.ok(l.textPx >= 48 && l.labelPx >= 22, `font terlalu kecil: ${l.textPx}/${l.labelPx}`);
  }
  const src = readFileSync(new URL('../productions/ep03-tio-bakmie/Production.tsx', import.meta.url), 'utf8');
  assert.ok(!/flexDirection:\s*[^,]*'row'/.test(src), 'blok subtitle tidak boleh flex row');
});

test('(a) shot bermasalah R-1 memakai layout khusus dan menjauhi mulut/dagu terukur', () => {
  const ids = SHOTS.map((s) => s.id);
  for (const id of Object.keys(SUB_LAYOUT_BY_SHOT)) assert.ok(ids.includes(id), `shot ${id} tidak ada`);
  // Batas wajah terukur dari still (px kanvas 1920): [bawah fitur di atas blok, atas fitur di bawah blok].
  const clear: Record<string, [number, number]> = {
    'b2-rev-utoh': [1540, 1920], // mulut Utoh terbuka ≤1540
    'b2-rev-blank': [1488, 1920], // hidung ≤1488; mulut (x≈280–500) dihindari lewat geser horizontal, lihat tes di bawah
    'b3-side-rant': [1520, 1920], // dagu Oyen ≤1520
    'b4-side-protest': [1525, 1920],
    'b5-rev-utoh': [1500, 1920],
    'b6-oyen-meong': [1525, 1920], // mulut Oyen ≤1520
  };
  for (const [id, [above, below]] of Object.entries(clear)) {
    const l = subLayoutFor(id);
    const h = subBlockHeight(l);
    assert.ok(l.top - 0.4 * h * (POP_MAX - 1) >= above, `${id}: blok naik ke wajah`);
    assert.ok(l.top + h + 0.6 * h * (POP_MAX - 1) <= below, `${id}: blok menyentuh mulut`);
  }
});

test('b2-rev-blank: blok digeser ke kanan menjauhi mulut Utoh (x≈280–500)', () => {
  const l = subLayoutFor('b2-rev-blank');
  const longest = Math.max(...EP03_SUBS.filter((c) => shotAt(SHOTS, c.from).id === 'b2-rev-blank').map((c) => c.tokens.map((t) => t.text).join(' ').length));
  const half = (longest * TEXT_EM * l.textPx * POP_MAX) / 2;
  assert.ok(540 + l.dx - half >= 500, `tepi kiri blok ${(540 + l.dx - half).toFixed(0)} menyentuh mulut`);
});

test('(b) tidak ada pemetaan ulang frame di ekor loop', () => {
  for (let f = 0; f < TOTAL_FRAMES; f++) assert.equal(renderFrameOf(f), f);
  const src = readFileSync(new URL('../productions/ep03-tio-bakmie/Production.tsx', import.meta.url), 'utf8');
  assert.ok(!/frame\s*-\s*EP03_LOOP_CUT_FRAME/.test(src), 'Production.tsx masih memutar ulang f0–14 di ekor');
  assert.ok(!/=\s*renderFrameOf\(frame\)/.test(src), 'komposisi masih memakai renderFrameOf');
});

test('(b) ekor loop = shot penutup b6-side-slump yang berlanjut, kamera sama dengan f0, subtitle mati', () => {
  for (let f = EP03_LOOP_CUT_FRAME; f < TOTAL_FRAMES; f++) {
    assert.equal(shotAt(SHOTS, f).id, 'b6-side-slump', `f${f}`);
    assert.equal(subtitleAt(EP03_SUBS, f), null, `subtitle tampil di f${f}`);
  }
  assert.equal(shotAt(SHOTS, 0).id, 'b1-side-slump');
  assert.deepEqual(sampleCamera(CAMS, TOTAL_FRAMES - 1), sampleCamera(CAMS, 0));
  for (const c of EP03_SUBS) assert.ok(c.to <= EP03_LOOP_CUT_FRAME);
});
