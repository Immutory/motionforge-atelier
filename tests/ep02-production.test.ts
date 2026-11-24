import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EP02_CUP4_POS,
  EP02_FG_NEAR_SCALE,
  nearCocPx,
  viewAxisFocus,
  EP02_SUBS,
  SUB_ACCENT,
  SUB_POP_FRAMES,
  flashOpacityAt,
  subtitleAt,
  subtitlePop,
  EP02_REPLAY_CLOCK,
  ep02LaptopScreenStateAt,
} from '../productions/ep02-bang-utoh/Production';
import {
  EP02_B5_SPRINT_START,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_TASKBAR_ALARM_FRAME,
  coffeeCountAt,
  ep02PhoneClockTextAt,
  ep02TaskbarClockAt,
} from '../productions/ep02-bang-utoh/cast';
import { EP02_SPOTS, firstFrameAtLeast } from '../productions/ep02-bang-utoh/set';
import { sampleCamera, shotAt } from '../engine';
import { CAMS, DOF, DOF_TARGET, FOREGROUND, SHOTS } from '../productions/ep02-bang-utoh/shots';
import { BEATS, EP02_LOOP_CUT_FRAME, VOICE_LINES, WORDS } from '../productions/ep02-bang-utoh/words';

const CHUNKS = EP02_SUBS;
const textOf = (c: { tokens: { text: string }[] }) => c.tokens.map((t) => t.text).join(' ');

test('subtitle: every spoken word appears exactly once, in order, no parentheses', () => {
  const flat = CHUNKS.flatMap((c) => c.tokens.map((t) => t.text));
  assert.deepEqual(flat, WORDS.map((w) => w.text));
  for (const t of flat) assert.ok(!/[()[\]]/.test(t), `non-verbal bracket in ${t}`);
});

test('subtitle: chunks are short, single-speaker and never overlap', () => {
  for (let i = 0; i < CHUNKS.length; i++) {
    const c = CHUNKS[i];
    assert.ok(c.tokens.length <= 3, textOf(c));
    assert.ok(c.to > c.from, textOf(c));
    if (i > 0) assert.ok(CHUNKS[i - 1].to <= c.from, `${textOf(CHUNKS[i - 1])} overlaps ${textOf(c)}`);
  }
});

test('subtitle: chunk text stays within its voice line', () => {
  for (const c of CHUNKS) {
    const line = VOICE_LINES.find((l) => c.from + 1 >= l.startFrame - 1 && c.from + 1 <= l.endFrame);
    assert.ok(line, `no line for ${textOf(c)}`);
    assert.equal(line.speaker, c.speaker);
  }
});

test('subtitle: keyword accents', () => {
  const colorOf = (word: string) =>
    CHUNKS.flatMap((c) => c.tokens).filter((t) => t.text.replace(/[^\w]/g, '').toLowerCase() === word.toLowerCase());
  for (const t of colorOf('47')) assert.equal(t.color, SUB_ACCENT.count);
  for (const t of colorOf('Meong')) assert.equal(t.color, SUB_ACCENT.gold);
  for (const t of colorOf('Nilai')) assert.equal(t.color, SUB_ACCENT.gold);
  for (const t of colorOf('A')) assert.equal(t.color, SUB_ACCENT.gold);
  // "nol error" (U5, U7, R2) hijau dan tidak terbelah; "nol." (R2 akhir) tetap putih.
  const nolErr = CHUNKS.filter((c) => /nol error/i.test(textOf(c)));
  assert.equal(nolErr.length, 3);
  for (const c of nolErr) {
    const i = c.tokens.findIndex((t) => /^nol$/i.test(t.text));
    assert.equal(c.tokens[i].color, SUB_ACCENT.ok);
    assert.equal(c.tokens[i + 1].color, SUB_ACCENT.ok);
  }
  const lastNol = CHUNKS.flatMap((c) => c.tokens).find((t) => t.text === 'nol.');
  assert.equal(lastNol?.color, undefined);
  assert.ok(CHUNKS.some((c) => /Nilai A/.test(textOf(c))));
});

test('subtitle: S1 visible near f390 and none after loop cut / during replay', () => {
  assert.equal(subtitleAt(CHUNKS, 390)?.speaker, 'buSiti');
  for (let f = EP02_REPLAY_FROM; f < EP02_REPLAY_TO; f++) assert.equal(subtitleAt(CHUNKS, f), null, `f${f}`);
  assert.ok(CHUNKS[CHUNKS.length - 1].to <= EP02_LOOP_CUT_FRAME);
});

test('subtitle: 3-frame pop-in is readable by frame 2 and settles', () => {
  assert.ok(subtitlePop(100, 100).opacity > 0);
  assert.equal(subtitlePop(101, 100).opacity, 1);
  assert.deepEqual(subtitlePop(100 + SUB_POP_FRAMES, 100), { opacity: 1, scale: 1 });
});

test('flash: exactly 4 frames at replay entry and exit', () => {
  const lit = [];
  for (let f = 0; f < 2300; f++) if (flashOpacityAt(f) > 0) lit.push(f);
  const inF = [0, 1, 2, 3].map((d) => EP02_REPLAY_FROM + d);
  const outF = [0, 1, 2, 3].map((d) => EP02_REPLAY_TO + d);
  assert.deepEqual(lit, [...inF, ...outF]);
  assert.equal(flashOpacityAt(EP02_REPLAY_FROM), 1);
  assert.equal(flashOpacityAt(EP02_REPLAY_TO), 1);
});

test('coffee steam sits on the 4th cup and starts when it is placed', () => {
  assert.deepEqual(EP02_CUP4_POS, [-1.83, EP02_SPOTS.warkop.laptop[1], 0.54]);
  const placed = firstFrameAtLeast(coffeeCountAt, 4);
  assert.equal(coffeeCountAt(placed), 4);
  assert.equal(coffeeCountAt(placed - 1), 3);
});

test('foreground OTS: near shoulder/head blur formula reaches 15-24 px @1080x1920; focus plane stays sharp', () => {
  assert.ok(nearCocPx(0.6, 2.0, 0.8, EP02_FG_NEAR_SCALE) >= 15);
  assert.ok(nearCocPx(0.6, 2.0, 2.0, EP02_FG_NEAR_SCALE) < 0.5);
  for (const [id, fg] of Object.entries(FOREGROUND)) {
    const shot = SHOTS.find((x) => x.id === id);
    assert.ok(shot, id);
    for (const f of [Math.max(fg.from, shot.from), shot.to - 1]) {
      if (f < fg.from || shotAt(SHOTS, f).id !== id) continue;
      const pose = sampleCamera(CAMS, f);
      const focus = viewAxisFocus(pose.pos, pose.look, DOF_TARGET[id] ?? pose.look);
      const dFg = viewAxisFocus(pose.pos, pose.look, fg.at);
      const blur = nearCocPx(DOF[id] ?? 0, focus, dFg, EP02_FG_NEAR_SCALE);
      assert.ok(blur >= 15 && blur <= 24, `${id} f${f}: ${blur.toFixed(1)} px (fg ${(dFg / focus).toFixed(2)}x)`);
      assert.ok(nearCocPx(DOF[id] ?? 0, focus, focus, EP02_FG_NEAR_SCALE) < 0.5, `${id} focus plane`);
    }
  }
});

test('subtitle: never outside [start, end+8f] of a voice line, and hold never crosses into the next line', () => {
  const inLine = (f: number) => VOICE_LINES.some((l) => f >= l.startFrame - 1 && f <= l.endFrame + 8);
  for (let f = 0; f < EP02_LOOP_CUT_FRAME + 20; f++) {
    const c = subtitleAt(CHUNKS, f);
    if (c) assert.ok(inLine(f), `f${f} shows "${textOf(c)}" outside any line window`);
  }
  for (const c of CHUNKS) {
    const l = VOICE_LINES.find((x) => x.id === c.line);
    assert.ok(l, `chunk "${textOf(c)}" has no line (${c.line})`);
    assert.equal(l.speaker, c.speaker);
    assert.ok(c.to <= l.endFrame + 8 + 1, `"${textOf(c)}" holds past ${l.id} end`);
  }
  // f750 = endFrame U3 (kata terakhir "tabung!" berakhir f749); subtitle U3 berhenti tepat di cut b4-stage-nyerah f751.
  assert.ok(subtitleAt(CHUNKS, 751) === null);
  for (const [a, b] of [[456, 486], [751, 775]]) {
    for (let f = a; f <= b; f++) assert.equal(subtitleAt(CHUNKS, f), null, `f${f}: ${textOf(subtitleAt(CHUNKS, f) ?? { tokens: [] })}`);
  }
  // Setiap kata tetap tampil sampai selesai diucapkan (kecuali hard cut Replay/loop).
  let wi = 0;
  for (const c of CHUNKS) {
    for (const _ of c.tokens) {
      const endF = Math.round(WORDS[wi].end * 30);
      if (endF < EP02_REPLAY_FROM) assert.ok(c.to >= endF, `"${WORDS[wi].text}" cut before spoken end (${c.to} < ${endF})`);
      wi++;
    }
  }
  // Hold di dalam baris tetap ada: jeda hirupan S1 (f370-f408) menahan "Tong.".
  assert.equal(subtitleAt(CHUNKS, 390)?.line, 'S1');
});

test('clock (U-3): laptop taskbar == Utoh phone clock at every frame of B1-B4, HH:MM with colon', () => {
  for (let f = BEATS[0].from; f < BEATS[3].to; f++) {
    const laptop = ep02LaptopScreenStateAt(f).clock;
    assert.match(laptop, /^\d\d:\d\d$/, `f${f}`);
    assert.equal(laptop, ep02PhoneClockTextAt(f), `f${f}`);
    assert.equal(laptop, ep02TaskbarClockAt(f), `f${f}`);
  }
  assert.equal(ep02LaptopScreenStateAt(BEATS[0].from).clock, '06:45');
  assert.equal(ep02LaptopScreenStateAt(EP02_TASKBAR_ALARM_FRAME - 1).clock, '06:45');
  assert.equal(ep02LaptopScreenStateAt(EP02_TASKBAR_ALARM_FRAME).clock, '06:58');
  assert.equal(ep02LaptopScreenStateAt(EP02_TASKBAR_ALARM_FRAME).mode, 'alarm0658');
  assert.equal(ep02LaptopScreenStateAt(EP02_B5_SPRINT_START).clock, '06:45');
});

test('clock (U-3): sepia replay of the Warkop morning shows the story clock 06:45', () => {
  assert.equal(EP02_REPLAY_CLOCK, '06:45');
  for (let f = EP02_REPLAY_FROM; f < EP02_REPLAY_TO; f++) {
    assert.equal(ep02LaptopScreenStateAt(f).clock, '06:45', `f${f}`);
    assert.match(ep02LaptopScreenStateAt(f).mode, /^replay/, `f${f}`);
  }
});
