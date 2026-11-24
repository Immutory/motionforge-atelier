import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PHONE_CLOCK_TEXT,
  actorFaceAnchors,
  actorHandPoint,
  drawHandProp,
  kopiRimPoint,
  projectPoint,
  sampleCamera,
  talkGated,
  type ActorPose,
  type ArmPose,
  type HandProp,
  type Vec3,
  type Word,
} from '../engine';
import { CAMS } from '../productions/ep02-bang-utoh/shots';
import {
  EP02_B5_ARRIVE_FRAME,
  EP02_B5_OYEN_TURN_FRAME,
  EP02_B5_OYEN_WAIT_TO,
  EP02_B5_OYEN_WALK_START,
  EP02_B5_SPRINT_START,
  EP02_B5_UTOH_LOOKBACK_FRAME,
  EP02_B5_UTOH_LOOKBACK_TO,
  EP02_B5_UTOH_TURN_FRAME,
  EP02_OUTRO_FROM,
  EP02_OYEN_KB_ARRIVE_FRAME,
  EP02_OYEN_MEONG_BLINK_FROM,
  EP02_OYEN_MEONG_OPEN_FRAME,
  EP02_OYEN_SIT_FRAME,
  EP02_OYEN_STEP1_FRAME,
  EP02_OYEN_STEP2_FRAME,
  EP02_OYEN_STRETCH_FROM,
  EP02_OYEN_WALK_KB_FROM,
  EP02_PLAK_FRAME,
  EP02_PROJECTOR_RUN_FRAME,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_SCREEN_OK_FRAME,
  EP02_COUNTER_TOP_Y,
  EP02_SITI_COUNTER_HAND_MAX_PX,
  EP02_SITI_COUNTER_HAND_MIN_Y,
  EP02_SITI_CUP_AT_NOSE_FROM,
  EP02_SITI_CUP_AT_NOSE_TO,
  EP02_SITI_CUP_DOWN_FRAME,
  EP02_SITI_CUP_HAND,
  EP02_SITI_CUP_LOWER_TO,
  EP02_SITI_CUP_RAISE_FROM,
  EP02_SITI_OFFSCREEN_FROM,
  EP02_SITI_PLAK_HAND,
  EP02_SITI_PUTDOWN_FROM,
  EP02_SITI_SIP_FROM,
  EP02_SITI_SIP_TO,
  EP02_SITI_WALK1,
  EP02_SITI_WALK3,
  EP02_TASKBAR_ALARM_FRAME,
  EP02_UTOH_JUMP_FRAME,
  EP02_UTOH_SQUAT_FRAME,
  actorPositionAt,
  actorVisibleAt,
  coffeeCountAt,
  ep02PhoneClockTextAt,
  ep02TaskbarClockAt,
  laptopScreenAt,
  oyenPoseAt,
  oyenPositionAt,
  oyenReplayPoseAt,
  poseFor,
  sitiCounterWeightAt,
  sitiHandWorldYAt,
  type Ep02HumanId,
} from '../productions/ep02-bang-utoh/cast';
import { locationAt, sampleTransitCurve } from '../productions/ep02-bang-utoh/set';
import { BEATS, EP02_FRAMES, EP02_LOOP_CUT_FRAME, NONVERBAL, WORDS, lineById, nonverbalOf } from '../productions/ep02-bang-utoh/words';

const FPS = 30;
const B4 = BEATS[3];
const B5 = BEATS[4];
const HUMANS: Ep02HumanId[] = ['bangUtoh', 'buSiti', 'rara'];

const openOf = (p: { talk?: ActorPose['talk'] }) =>
  typeof p.talk === 'number' ? p.talk : p.talk ? p.talk.open : 0;

const wordFrame = (lineId: string, prefix: string) => {
  const l = lineById(lineId);
  const w = WORDS.find(
    (x) =>
      x.speaker === l.speaker &&
      Math.round(x.start * FPS) >= l.startFrame - 1 &&
      Math.round(x.end * FPS) <= l.endFrame + 1 &&
      x.text.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  assert.ok(w, `kata ${prefix} di ${lineId}`);
  return Math.round(w.start * FPS);
};

test('kontrak ekspor cast.ts: semua frame koreografi berurutan dan di dalam master', () => {
  const frames = {
    EP02_OYEN_STRETCH_FROM,
    EP02_OYEN_WALK_KB_FROM,
    EP02_OYEN_KB_ARRIVE_FRAME,
    EP02_OYEN_SIT_FRAME,
    EP02_OYEN_STEP1_FRAME,
    EP02_OYEN_STEP2_FRAME,
    EP02_SCREEN_OK_FRAME,
    EP02_TASKBAR_ALARM_FRAME,
    EP02_B5_SPRINT_START,
    EP02_B5_UTOH_TURN_FRAME,
    EP02_B5_UTOH_LOOKBACK_FRAME,
    EP02_B5_ARRIVE_FRAME,
    EP02_PROJECTOR_RUN_FRAME,
    EP02_REPLAY_FROM,
    EP02_REPLAY_TO,
    EP02_OUTRO_FROM,
  };
  const vals = Object.values(frames);
  for (const [k, v] of Object.entries(frames)) {
    assert.ok(Number.isInteger(v) && v >= 0 && v < EP02_FRAMES, `${k}=${v} harus frame bulat di master`);
  }
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] > vals[i - 1], `urutan frame ke-${i} (${vals[i - 1]} -> ${vals[i]})`);
  assert.ok(EP02_OUTRO_FROM < EP02_LOOP_CUT_FRAME);
  assert.ok(EP02_PLAK_FRAME < EP02_SCREEN_OK_FRAME);
  assert.equal(EP02_OYEN_STEP2_FRAME + 5, EP02_SCREEN_OK_FRAME, 'cakar kanan 5f berakhir tepat sebelum layar hijau');
  assert.equal(EP02_OYEN_STEP2_FRAME - EP02_OYEN_STEP1_FRAME, 8, 'cakar kiri 5f + deadpan 3f');
});

test('(a) Oyen B4: jalan planted side, lalu satu view threeQuarter tanpa kembali ke walk; cakar kiri/kanan tepat', () => {
  for (let f = EP02_OYEN_WALK_KB_FROM; f < EP02_OYEN_KB_ARRIVE_FRAME; f++) {
    const p = oyenPoseAt(f);
    assert.equal(p.stance, 'walk', `f${f} masih berjalan ke keyboard`);
    assert.equal(p.view, 'side', `f${f} jalan tampak samping`);
  }
  for (let f = EP02_OYEN_KB_ARRIVE_FRAME; f < B4.to; f++) {
    const p = oyenPoseAt(f);
    assert.notEqual(p.stance, 'walk', `f${f}: Oyen tidak boleh kembali walk setelah tiba`);
    assert.equal(p.view, 'threeQuarter', `f${f}: view harus konstan threeQuarter`);
    if (f >= EP02_OYEN_SIT_FRAME) assert.equal(p.stance, 'sit', `f${f}: duduk konsisten (nol flicker walk/sit)`);
  }
  for (let k = 0; k < 5; k++) {
    assert.equal(oyenPoseAt(EP02_OYEN_STEP1_FRAME + k).pawRaise, 'left', `STEP1+${k} cakar kiri menghadap keyboard`);
    assert.equal(oyenPoseAt(EP02_OYEN_STEP2_FRAME + k).pawRaise, 'left', `STEP2+${k} cakar kiri menghadap keyboard`);
  }
  for (let f = EP02_OYEN_STEP1_FRAME + 5; f < EP02_OYEN_STEP2_FRAME; f++) {
    assert.equal(oyenPoseAt(f).pawRaise, 'none', `f${f} deadpan 3f di antara dua tekan`);
  }
  const ok = oyenPoseAt(EP02_SCREEN_OK_FRAME);
  assert.equal(ok.stance, 'sit');
  assert.equal(ok.pawRaise, 'none', 'duduk tenang tepat saat ✓ 0 ERROR');
  assert.equal(laptopScreenAt(EP02_SCREEN_OK_FRAME), 'ok');
  // posisi keyboard tercapai saat tiba dan tidak bergeser lagi
  const kb = oyenPositionAt(EP02_OYEN_KB_ARRIVE_FRAME);
  for (let f = EP02_OYEN_KB_ARRIVE_FRAME; f < B4.to; f++) assert.deepEqual(oyenPositionAt(f), kb);
});

test('(b) Utoh B5: threeQuarter sebelum tangen berbelok +X, side sesudahnya, tanpa bolak-balik', () => {
  const tanAt = (f: number) => {
    const u = (f - EP02_B5_SPRINT_START) / (B5.to - EP02_B5_SPRINT_START);
    const x = Math.max(0, Math.min(1, u));
    return sampleTransitCurve(x * x * (3 - 2 * x)).tangent;
  };
  const t0 = tanAt(EP02_B5_UTOH_TURN_FRAME);
  const tPrev = tanAt(EP02_B5_UTOH_TURN_FRAME - 1);
  assert.ok(Math.abs(t0[0]) >= Math.abs(t0[2]), 'di titik belok tangen dominan X');
  assert.ok(Math.abs(tPrev[0]) < Math.abs(tPrev[2]), 'sebelum titik belok tangen dominan Z');

  let changes = 0;
  let prev = poseFor('bangUtoh', EP02_B5_SPRINT_START).view;
  for (let f = EP02_B5_SPRINT_START; f < B5.to; f++) {
    const p = poseFor('bangUtoh', f);
    assert.equal(p.view, f < EP02_B5_UTOH_TURN_FRAME ? 'threeQuarter' : 'side', `view Utoh f${f}`);
    if (p.view !== prev) changes++;
    prev = p.view;
    if (f < EP02_B5_ARRIVE_FRAME) {
      assert.equal(p.stance, 'walk');
      assert.equal(p.gait, 'planted');
    }
  }
  assert.equal(changes, 1, 'tepat satu pergantian view');

  // walkPhase kontinu di titik belok (nol pop kaki)
  const a = poseFor('bangUtoh', EP02_B5_UTOH_TURN_FRAME - 1).walkPhase ?? 0;
  const b = poseFor('bangUtoh', EP02_B5_UTOH_TURN_FRAME).walkPhase ?? 0;
  const d = (b - a + 1) % 1;
  assert.ok(d < 0.35, `walkPhase melompat ${d.toFixed(2)} di titik belok`);

  // Menoleh sekilas ke belakang di "Ayo Yen, ikut!"
  assert.equal(EP02_B5_UTOH_LOOKBACK_FRAME, wordFrame('U6', 'Ayo') - 2);
  assert.ok(EP02_B5_UTOH_LOOKBACK_FRAME > EP02_B5_UTOH_TURN_FRAME);
  assert.ok((poseFor('bangUtoh', wordFrame('U6', 'Ayo') + 2).lookBack ?? 0) >= 0.5);
  assert.equal(poseFor('bangUtoh', EP02_B5_UTOH_LOOKBACK_TO + 1).lookBack ?? 0, 0);
  assert.equal(poseFor('bangUtoh', EP02_B5_UTOH_LOOKBACK_FRAME - 1).lookBack ?? 0, 0);
});

test('(b2) Oyen B5: duduk menatap 12f setelah Utoh sprint, bangkit, lalu jalan; view tidak bolak-balik; tetap dekat Utoh', () => {
  assert.equal(EP02_B5_OYEN_WAIT_TO - EP02_B5_SPRINT_START, 12);
  for (let f = B5.from; f < EP02_B5_OYEN_WAIT_TO; f++) assert.equal(oyenPoseAt(f).stance, 'sit', `f${f} Oyen duduk menatap`);
  for (let f = EP02_B5_OYEN_WAIT_TO; f < EP02_B5_OYEN_WALK_START; f++) assert.equal(oyenPoseAt(f).stance, 'stand');
  let changes = 0;
  let prev = oyenPoseAt(EP02_B5_OYEN_WALK_START).view;
  for (let f = EP02_B5_OYEN_WALK_START; f < B5.to; f++) {
    const p = oyenPoseAt(f);
    assert.equal(p.stance, 'walk');
    assert.equal(p.view, f < EP02_B5_OYEN_TURN_FRAME ? 'threeQuarter' : 'side');
    if (p.view !== prev) changes++;
    prev = p.view;
  }
  assert.equal(changes, 1);
  for (let f = B5.from; f < B5.to; f++) {
    const u = actorPositionAt('bangUtoh', f);
    const o = oyenPositionAt(f);
    const gap = Math.hypot(u[0] - o[0], u[2] - o[2]);
    assert.ok(gap < 2.9, `f${f}: jarak Utoh-Oyen ${gap.toFixed(2)} m keluar dari dolly tracking`);
  }
});

test('(c) mulut tertutup rapat di setiap momen jeda (pause) dan saat hening', () => {
  const pauses = NONVERBAL.filter((e) => e.kind === 'pause');
  assert.ok(pauses.length >= 2);
  for (const e of pauses) {
    const id = e.speaker as Ep02HumanId;
    const mid = Math.floor((e.startFrame + e.endFrame) / 2);
    assert.equal(openOf(poseFor(id, mid)), 0, `${e.line} jeda tengah f${mid}`);
    for (let f = e.startFrame; f < e.endFrame - 1; f++) assert.equal(openOf(poseFor(id, f)), 0, `${e.line} jeda f${f}`);
  }
  // hening setelah helaan napas akhir U9 sampai hard-cut loop
  const u9 = nonverbalOf('U9', 0);
  for (let f = u9.endFrame + 1; f < EP02_LOOP_CUT_FRAME; f++) assert.equal(openOf(poseFor('bangUtoh', f)), 0, `f${f}`);
});

test('(c2) napas = mulut terbuka kecil, tawa = bergetar, kata = sinkron lead 1f', () => {
  const sigh = nonverbalOf('U1', 0);
  const mid = Math.floor((sigh.startFrame + sigh.endFrame) / 2);
  const t = poseFor('bangUtoh', mid).talk;
  assert.ok(t && typeof t === 'object' && t.open > 0.16 && t.shape === 'small', 'helaan napas U1 = celah kecil');

  for (const [line, n, id] of [
    ['U5', 0, 'bangUtoh'],
    ['U7', 0, 'bangUtoh'],
    ['S2', 0, 'buSiti'],
    ['U3', 0, 'bangUtoh'],
  ] as const) {
    const e = nonverbalOf(line, n);
    const opens = new Set<number>();
    for (let f = e.startFrame; f < e.endFrame - 2; f++) opens.add(openOf(poseFor(id, f)));
    assert.ok(opens.size >= 3, `${line} tawa/kekeh harus bergetar, dapat ${[...opens].join(',')}`);
  }
  // sniff Bu Siti: mata terpejam, mulut tertutup
  const sniff = nonverbalOf('S1', 1);
  const sm = poseFor('buSiti', Math.floor((sniff.startFrame + sniff.endFrame) / 2));
  assert.equal(sm.blink, 1);
  assert.equal(openOf(sm), 0);
});

const LEVEL: Record<ArmPose, number> = { rest: 0, hip: 1, hold: 1, point: 1, cross: 1, pray: 1, raise: 2, wave: 2 };
const BAD_STANCE = new Set(['sit>jump', 'jump>sit', 'sit>walk', 'walk>sit', 'squat>walk', 'walk>squat', 'walk>jump', 'jump>walk']);

test('(d) nol pop 1-frame: setiap pose lengan/stance bertahan >= 3f dan lompatan besar lewat breakdown', () => {
  for (const id of HUMANS) {
    for (const key of ['leftArm', 'rightArm', 'stance'] as const) {
      let runStart = 0;
      let prev = poseFor(id, 0)[key];
      for (let f = 1; f <= EP02_FRAMES; f++) {
        const cur = f < EP02_FRAMES ? poseFor(id, f)[key] : undefined;
        if (cur === prev) continue;
        const cut = f < EP02_FRAMES && locationAt(f) !== locationAt(f - 1);
        const visible = actorVisibleAt(id, f - 1);
        if (visible && !cut && f < EP02_FRAMES) {
          assert.ok(f - runStart >= 3, `${id}.${key}=${prev} hanya ${f - runStart}f (f${runStart}-${f - 1})`);
          if (key === 'stance') {
            assert.ok(!BAD_STANCE.has(`${prev}>${cur}`), `${id} stance ${prev}->${cur} tanpa perantara di f${f}`);
          } else {
            const jump = Math.abs(LEVEL[prev as ArmPose] - LEVEL[cur as ArmPose]);
            assert.ok(jump <= 1, `${id}.${key} ${prev}->${cur} tanpa breakdown di f${f}`);
          }
        }
        runStart = f;
        prev = cur;
      }
    }
  }
});

test('grammar PLAK & Enter tetap: 4f wind-up, 6f hold, 1f hit, 8f follow-through', () => {
  const P = EP02_PLAK_FRAME;
  for (let f = P - 10; f < P; f++) assert.equal(poseFor('buSiti', f).leftArm, 'raise', `wind-up/hold f${f}`);
  assert.equal(poseFor('buSiti', P - 1).lean, 7);
  assert.equal(poseFor('buSiti', P).leftArm, 'point');
  assert.equal(poseFor('buSiti', P).lean, -10);
  assert.ok(Math.abs(poseFor('buSiti', P + 10).lean ?? 0) < 0.5, 'follow-through selesai');
  assert.ok(Math.abs((poseFor('buSiti', P + 10).lean ?? 0) - (poseFor('buSiti', P + 9).lean ?? 0)) < 0.6, 'nol pop setelah follow-through');
  assert.equal(poseFor('buSiti', P - 10).stance, 'stand', 'Bu Siti sudah tiba sebelum wind-up');

  const R = EP02_PROJECTOR_RUN_FRAME;
  for (let f = R - 10; f < R; f++) assert.equal(poseFor('bangUtoh', f).rightArm, 'raise');
  assert.equal(poseFor('bangUtoh', R).rightArm, 'point');
  assert.equal(poseFor('bangUtoh', R).lean, 9);
});

test('peta akting non-verbal mendarat di frame suara', () => {
  // U1: bahu melorot 2 -> 8 selama 12f helaan napas
  const u1 = nonverbalOf('U1', 0);
  const l0 = poseFor('bangUtoh', u1.startFrame).lean ?? 0;
  const l1 = poseFor('bangUtoh', u1.startFrame + 12).lean ?? 0;
  assert.ok(l1 - l0 > 4, `U1 lean ${l0} -> ${l1}`);
  assert.equal(poseFor('bangUtoh', u1.startFrame + 4).face, 'tired');
  // S1: gelas ke-4 (tangan kiri) diletakkan di "Gelas keempat" (sebelum hirupan); gelas Bu Siti sendiri tetap di tangan kanan
  const sniff = nonverbalOf('S1', 1);
  assert.ok(EP02_SITI_CUP_DOWN_FRAME < sniff.startFrame);
  assert.equal(poseFor('buSiti', sniff.startFrame + 5).rightProp, 'kopi');
  assert.ok((poseFor('buSiti', sniff.startFrame + 8).lean ?? 0) < -1.5, 'condong menghirup');
  assert.equal(poseFor('buSiti', EP02_SITI_CUP_DOWN_FRAME - 1).leftProp, 'kopi');
  assert.equal(coffeeCountAt(EP02_SITI_CUP_DOWN_FRAME - 1), 3);
  assert.equal(poseFor('buSiti', EP02_SITI_CUP_DOWN_FRAME).leftProp, 'none');
  assert.equal(coffeeCountAt(EP02_SITI_CUP_DOWN_FRAME), 4);
  // U3: angry + tunjuk tepat di "bukan TV tabung!"
  const bukan = wordFrame('U3', 'bukan');
  assert.equal(poseFor('bangUtoh', bukan).face, 'angry');
  assert.equal(poseFor('bangUtoh', bukan).rightArm, 'point');
  // U4: sit -> squat sepanjang desahan
  const u4 = nonverbalOf('U4', 0);
  assert.equal(poseFor('bangUtoh', u4.startFrame).stance, 'sit');
  assert.equal(poseFor('bangUtoh', EP02_UTOH_SQUAT_FRAME).stance, 'squat');
  assert.ok(EP02_UTOH_SQUAT_FRAME < u4.endFrame);
  // U5: syok + lompat di "Hah?!", tawa + sparkle menoleh ke Oyen
  assert.equal(poseFor('bangUtoh', EP02_UTOH_JUMP_FRAME).stance, 'jump');
  assert.equal(poseFor('bangUtoh', EP02_UTOH_JUMP_FRAME).face, 'shock');
  const u5 = nonverbalOf('U5', 0);
  const lp = poseFor('bangUtoh', u5.startFrame + 4);
  assert.equal(lp.face, 'laugh');
  assert.equal(lp.fx, 'sparkle');
  assert.ok((lp.facing ?? 0) > 0.45, 'menoleh memuja ke Oyen');
  // S3: smug + tangan di pinggang saat kekeh
  const s3 = nonverbalOf('S3', 0);
  assert.equal(poseFor('buSiti', s3.startFrame).face, 'smug');
  assert.equal(poseFor('buSiti', s3.startFrame).leftArm, 'hip');
  assert.equal(poseFor('buSiti', s3.startFrame).rightProp, 'kopi');
  // U7: busung dada silang tangan saat tawa sombong
  const u7 = nonverbalOf('U7', 0);
  const sp = poseFor('bangUtoh', u7.startFrame + 6);
  assert.equal(sp.leftArm, 'cross');
  assert.equal(sp.rightArm, 'cross');
  assert.ok((sp.lean ?? 0) < -2.5);
  // R2: menoleh tajam di jeda
  const r2p = nonverbalOf('R2', 1);
  assert.ok((poseFor('rara', r2p.startFrame + 4).facing ?? 0) < -0.45);
  // O1: kedip pelan 14f berakhir tepat saat mulut membuka
  assert.equal(EP02_OYEN_MEONG_OPEN_FRAME - EP02_OYEN_MEONG_BLINK_FROM, 14);
  assert.ok(openOf(oyenPoseAt(EP02_OYEN_MEONG_OPEN_FRAME)) > 0);
  assert.equal(oyenPoseAt(EP02_OYEN_MEONG_OPEN_FRAME).blink, 0);
  assert.equal(oyenPoseAt(EP02_OYEN_MEONG_BLINK_FROM + 7).blink, 1);
  for (let f = EP02_OYEN_MEONG_BLINK_FROM; f < EP02_OYEN_MEONG_OPEN_FRAME; f++) {
    const p = f < EP02_REPLAY_TO ? oyenReplayPoseAt(f) : oyenPoseAt(f);
    assert.ok((p.blink as number) > 0, `kedip O1 aktif f${f}`);
  }
  // U9: tangan jatuh lemas di helaan napas akhir
  const u9 = nonverbalOf('U9', 0);
  const end = poseFor('bangUtoh', u9.endFrame + 4);
  assert.equal(end.face, 'tired');
  assert.equal(end.leftArm, 'rest');
  assert.equal(end.rightArm, 'rest');
});

test('micro-life hanya saat bicara/bernapas: figuran diam tidak bergoyang loop, saat bicara ±1..2,2°', () => {
  // Bu Siti diam di konter (B4) sebelum S3: lean konstan
  const s3 = lineById('S3');
  const idle = new Set<number>();
  for (let f = B4.from + 70; f < s3.startFrame - 10; f++) idle.add(poseFor('buSiti', f).lean ?? 0);
  assert.equal(idle.size, 1, 'tidak ada loop idle figuran');
  // Saat bicara S3 (lean dasar 0): sway ada dan dibatasi 2,2°
  let maxAbs = 0;
  for (let f = s3.startFrame + 6; f < s3.endFrame; f++) maxAbs = Math.max(maxAbs, Math.abs(poseFor('buSiti', f).lean ?? 0));
  assert.ok(maxAbs >= 1.0 && maxAbs <= 2.2 + 1e-6, `sway bicara ${maxAbs.toFixed(2)}°`);
});

test('talkGated: jeda menutup, napas celah kecil, tawa bergetar, hening menggerbang viseme', () => {
  const words: Word[] = [{ text: 'halo', start: 1.0, end: 1.6 }];
  const loud = () => 0.8;
  const quiet = () => 0;
  const mid = 33; // (33 + 1) / 30 = 1,133 dtk, puncak suku kata pertama
  assert.ok(talkGated(words, mid, { rms: loud }).open > 0.3, 'kata terbuka saat ada suara');
  assert.equal(talkGated(words, mid, { rms: quiet }).open, 0, 'RMS hening menutup viseme');
  assert.equal(
    talkGated(words, mid, { rms: loud, events: [{ startFrame: 30, endFrame: 40, kind: 'pause', voiced: false }] }).open,
    0,
    'jeda menutup walau di dalam kata',
  );
  const sigh = talkGated([], 105, { rms: () => 0.15, events: [{ startFrame: 100, endFrame: 112, kind: 'sigh' }] });
  assert.equal(sigh.shape, 'small');
  assert.ok(sigh.open > 0.16 && sigh.open < 0.5);
  assert.equal(talkGated([], 105, { rms: loud, events: [{ startFrame: 100, endFrame: 112, kind: 'sniff' }] }).open, 0);
  const laugh = new Set<number>();
  for (let f = 100; f < 112; f++) {
    const s = talkGated([], f, { rms: () => 0.5, events: [{ startFrame: 100, endFrame: 114, kind: 'laugh' }] });
    assert.ok(s.open > 0.16, 'tawa tidak pernah menutup penuh');
    laugh.add(s.open);
  }
  assert.ok(laugh.size >= 3, 'tawa bergetar');
  assert.equal(talkGated([], 200, { rms: loud }).open, 0, 'di luar kata & momen = tertutup');
});

// =================================================================================================
// v6.1: U-3 (HP tegak & jam 06:45), U-2 (gelas kopi Bu Siti), U-1 (tangan di atas konter), lintasan konter
// =================================================================================================

/** Kanvas tiruan minimal: melacak matriks transform dan merekam matriks saat `fillText`. */
function mockCtx() {
  type M = { a: number; b: number; c: number; d: number; e: number; f: number };
  let m: M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack: M[] = [];
  const texts: { text: string; m: M }[] = [];
  const mul = (n: M): M => ({
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  });
  const api: Record<string, unknown> = {
    save: () => stack.push({ ...m }),
    restore: () => {
      m = stack.pop() ?? m;
    },
    translate: (x: number, y: number) => {
      m = mul({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
    },
    scale: (x: number, y: number) => {
      m = mul({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
    },
    rotate: (r: number) => {
      m = mul({ a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 });
    },
    getTransform: () => ({ ...m }),
    fillText: (text: string) => texts.push({ text, m: { ...m } }),
  };
  const ctx = new Proxy(api, { get: (t, k: string) => (k in t ? t[k] : () => undefined), set: () => true });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

test('U-3 (a) teks prop berteks selalu tegak & tidak ter-mirror di tangan mana pun, rotasi apa pun', () => {
  const TEXT_PROPS: HandProp[] = ['phoneClock'];
  for (const prop of TEXT_PROPS) {
    for (const dir of [1, -1]) {
      for (const tilt of [0, 0.4, -0.4, Math.PI * 0.9]) {
        for (const lean of [0, 12, -12]) {
          const { ctx, texts } = mockCtx();
          ctx.scale(2, 2); // supersample ActorBillboard
          ctx.rotate((lean * Math.PI) / 180);
          drawHandProp(ctx, prop, 120, 300, '#000', dir, { text: '06:45', tilt });
          assert.equal(texts.length, 1, `${prop} menulis tepat satu teks`);
          const t = texts[0];
          assert.equal(t.text, '06:45');
          assert.ok(t.m.a * t.m.d - t.m.b * t.m.c > 0, `${prop} dir=${dir} tilt=${tilt}: teks ter-mirror`);
          assert.ok(t.m.d > 0, `${prop} dir=${dir} tilt=${tilt} lean=${lean}: teks terbalik`);
        }
      }
    }
  }
  assert.equal(PHONE_CLOCK_TEXT, '06:58', 'jam bawaan prop tetap format HH:MM');
});

test('U-3 (a2) HP Utoh di B2 menampilkan 06:45 = jam taskbar laptop pada frame yang sama', () => {
  const B2 = BEATS[1];
  let shown = 0;
  for (let f = 0; f < EP02_FRAMES; f++) {
    const p = poseFor('bangUtoh', f);
    if (p.leftProp !== 'phoneClock' && p.rightProp !== 'phoneClock') continue;
    shown++;
    const rig = p.leftProp === 'phoneClock' ? p.leftHand : p.rightHand;
    assert.equal(rig?.propText, ep02TaskbarClockAt(f), `f${f}: jam HP = jam taskbar`);
    assert.equal(ep02PhoneClockTextAt(f), ep02TaskbarClockAt(f));
    if (f >= B2.from && f < B2.to) assert.equal(rig?.propText, '06:45', `f${f}: B2 jam cerita 06:45`);
  }
  assert.ok(shown >= 30, `HP jam tampil ${shown}f`);
  assert.equal(poseFor('bangUtoh', 210).leftProp, 'phoneClock', 'HP terlihat di f210');
  assert.equal(ep02TaskbarClockAt(EP02_TASKBAR_ALARM_FRAME - 1), '06:45');
  assert.equal(ep02TaskbarClockAt(EP02_TASKBAR_ALARM_FRAME), '06:58');
});

const rimOf = (p: ActorPose) => {
  const h = actorHandPoint('buSiti', p, 1);
  return kopiRimPoint(h.rawX, h.rawY, 1, p.rightHand?.propTilt ?? 0);
};

test('U-2 (b) Bu Siti memegang gelas kopinya di semua frame Warkop; gelas ke-4 hanya sampai diletakkan (nol gelas ganda)', () => {
  const B5f = BEATS[4].from;
  for (let f = 0; f < B5f; f++) {
    const p = poseFor('buSiti', f);
    assert.equal(p.rightProp, 'kopi', `f${f}: gelas Bu Siti di tangan kanan`);
    assert.notEqual(p.rightArm, 'rest', `f${f}: tangan gelas tidak jatuh`);
    const carrying = p.leftProp === 'kopi';
    assert.equal(carrying, f < EP02_SITI_CUP_DOWN_FRAME, `f${f}: gelas ke-4 di tangan kiri hanya sebelum diletakkan`);
    assert.ok(!(carrying && coffeeCountAt(f) >= 4), `f${f}: gelas ke-4 tidak sekaligus di tangan & di meja`);
  }
  // Raihan meletakkan terlihat: tangan kiri turun ke titik meja selama 8f sebelum dilepas
  const yA = actorHandPoint('buSiti', poseFor('buSiti', EP02_SITI_PUTDOWN_FROM - 1), -1).rawY;
  const yB = actorHandPoint('buSiti', poseFor('buSiti', EP02_SITI_CUP_DOWN_FRAME - 1), -1).rawY;
  assert.ok(yB - yA > 20, `tangan kiri turun meletakkan gelas (${yA.toFixed(0)} -> ${yB.toFixed(0)})`);
});

test('U-2 (b2) peta S1: kekeh di dada, hirupan di hidung (mata terpejam, uap menguat), sesap di "Ngopi", lalu turun', () => {
  const chuckle = nonverbalOf('S1', 0);
  const sniff = nonverbalOf('S1', 1);
  const ngopi = wordFrame('S1', 'Ngopi');
  const cm = poseFor('buSiti', chuckle.startFrame + 8);
  assert.ok(rimOf(cm).y > actorFaceAnchors('buSiti', cm).chinY, 'kekeh: gelas di dada');
  assert.ok(EP02_SITI_CUP_AT_NOSE_FROM - EP02_SITI_CUP_RAISE_FROM >= 3, 'breakdown naik >= 3f');
  for (let f = EP02_SITI_CUP_AT_NOSE_FROM; f < EP02_SITI_CUP_AT_NOSE_TO; f++) {
    const p = poseFor('buSiti', f);
    const face = actorFaceAnchors('buSiti', p);
    const rim = rimOf(p);
    assert.ok(Math.abs(rim.y - face.noseY) <= 20, `f${f}: bibir gelas dekat hidung (dy=${(rim.y - face.noseY).toFixed(1)})`);
    assert.ok(Math.abs(rim.x - face.mouthX) <= 30, `f${f}: gelas di depan wajah`);
    assert.ok(p.rightHand?.front, `f${f}: gelas digambar di depan wajah`);
  }
  const mid = Math.floor((sniff.startFrame + sniff.endFrame) / 2);
  assert.equal(poseFor('buSiti', mid).blink, 1, 'mata terpejam saat menghirup');
  assert.ok((poseFor('buSiti', mid).rightHand?.steam ?? 1) > 1.5, 'uap gelas menguat saat dihirup');
  assert.ok(Math.abs((poseFor('buSiti', mid).lean ?? 0) + 3) <= 1.3, 'lean ~ -3 saat menghirup');
  assert.ok(EP02_SITI_SIP_FROM <= ngopi && ngopi < EP02_SITI_SIP_TO, 'fase sesap jatuh di kata "Ngopi"');
  assert.ok(EP02_SITI_SIP_FROM - EP02_SITI_CUP_AT_NOSE_TO >= 3, 'breakdown hidung -> bibir >= 3f');
  const words = WORDS.filter((w) => w.speaker === 'buSiti').map((w) => [Math.round(w.start * FPS), Math.round(w.end * FPS)]);
  for (let f = EP02_SITI_SIP_FROM; f < EP02_SITI_SIP_TO; f++) {
    const p = poseFor('buSiti', f);
    const face = actorFaceAnchors('buSiti', p);
    const rim = rimOf(p);
    assert.ok(Math.abs(rim.y - face.mouthY) <= 16, `f${f}: bibir gelas menyentuh bibir (dy=${(rim.y - face.mouthY).toFixed(1)})`);
    assert.ok(Math.abs(p.rightHand?.propTilt ?? 0) >= 0.3, `f${f}: gelas dimiringkan saat menyesap`);
    const inWord = words.some(([s, e]) => f >= s - 1 && f < e + 1);
    if (!inWord) assert.equal(openOf(p), 0, `f${f}: mulut tertutup saat menyesap (di luar kata)`);
  }
  assert.ok(EP02_SITI_CUP_LOWER_TO - EP02_SITI_SIP_TO >= 3);
  const after = poseFor('buSiti', EP02_SITI_CUP_LOWER_TO + 2);
  assert.ok(rimOf(after).y > actorFaceAnchors('buSiti', after).chinY, 'gelas sudah turun ke dada');
  assert.equal(after.face, 'neutral');
});

test('U-2 (b3) PLAK pakai tangan BEBAS (kiri), gelas tetap di tangan kanan; tangan nol pop (kecuali benturan PLAK)', () => {
  assert.equal(EP02_SITI_PLAK_HAND, 'left');
  assert.equal(EP02_SITI_CUP_HAND, 'right');
  const P = EP02_PLAK_FRAME;
  for (let f = P - 10; f <= P + 8; f++) {
    const p = poseFor('buSiti', f);
    assert.equal(p.leftProp, 'none', `f${f}: tangan PLAK kosong`);
    assert.equal(p.rightProp, 'kopi', `f${f}: gelas tetap dipegang saat menggeplak`);
  }
  const y0 = actorHandPoint('buSiti', poseFor('buSiti', P - 11), -1).rawY;
  const y1 = actorHandPoint('buSiti', poseFor('buSiti', P - 10), -1).rawY;
  const y4 = actorHandPoint('buSiti', poseFor('buSiti', P - 7), -1).rawY;
  assert.ok(Math.abs(y1 - y0) < Math.abs(y4 - y0), 'wind-up bertahap');
  for (const side of [-1, 1] as const) {
    let prev = actorHandPoint('buSiti', poseFor('buSiti', 0), side);
    for (let f = 1; f < BEATS[4].from; f++) {
      const p = poseFor('buSiti', f);
      const h = actorHandPoint('buSiti', p, side);
      const d = Math.hypot(h.x - prev.x, h.y - prev.y);
      prev = h;
      if (f === P || p.stance === 'walk') continue;
      assert.ok(d <= 90, `f${f} tangan ${side < 0 ? 'kiri' : 'kanan'} melompat ${d.toFixed(0)} px`);
    }
  }
});

test('U-1 (c) tangan Bu Siti di spot kasir: tidak `rest`, pusat tangan >= 8 cm di atas WK_CounterTop', () => {
  const glb = readFileSync(join(process.cwd(), 'public/sets/warkop.glb'));
  const g = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const node = g.nodes.find((n: { name?: string }) => n.name === 'WK_CounterTop');
  const acc = g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION];
  const top = acc.max[1] * (node.scale?.[1] ?? 1) + (node.translation?.[1] ?? 0);
  assert.ok(Math.abs(top - EP02_COUNTER_TOP_Y) < 0.01, `EP02_COUNTER_TOP_Y=${EP02_COUNTER_TOP_Y} vs GLB ${top.toFixed(3)}`);
  assert.ok(EP02_SITI_COUNTER_HAND_MIN_Y >= top + 0.08 - 0.005);
  assert.equal(EP02_SITI_COUNTER_HAND_MAX_PX, 624);
  let counterFrames = 0;
  for (let f = 0; f < BEATS[4].from; f++) {
    if (sitiCounterWeightAt(f) < 0.999) continue;
    counterFrames++;
    const p = poseFor('buSiti', f);
    assert.notEqual(p.leftArm, 'rest', `f${f}: lengan kiri rest di konter`);
    assert.notEqual(p.rightArm, 'rest', `f${f}: lengan kanan rest di konter`);
    for (const side of [-1, 1] as const) {
      const y = sitiHandWorldYAt(f, side);
      assert.ok(y >= EP02_SITI_COUNTER_HAND_MIN_Y - 1e-6, `f${f}: tangan ${side} y=${y.toFixed(3)} m tenggelam di konter`);
      assert.ok(actorHandPoint('buSiti', p, side).y <= EP02_SITI_COUNTER_HAND_MAX_PX + 0.5, `f${f}: tangan ${side} di bawah px 624`);
    }
  }
  assert.ok(counterFrames > 400, `frame di konter ${counterFrames}`);
  const s3 = lineById('S3');
  for (let f = s3.startFrame; f < s3.endFrame; f++) assert.ok(sitiCounterWeightAt(f) > 0.999, `S3 f${f} di kasir`);
});

test('lintasan Bu Siti tidak pernah memotong volume konter; ia keluar/masuk frame penuh', () => {
  const inCounter = (p: Vec3) => p[0] > -2.34 && p[0] < 2.34 && p[2] > -1.95 && p[2] < -1.09;
  for (let f = 0; f < BEATS[4].from; f++) {
    const p = actorPositionAt('buSiti', f);
    const cam = sampleCamera(CAMS, f);
    const visible = [0.05, 0.9, 1.7].some((dy) =>
      [-0.55, 0, 0.55].some((dx) => {
        const q = projectPoint(cam, [p[0] + dx, p[1] + dy, p[2]]);
        return q.depth > 0 && Math.abs(q.x) < 1.1 && Math.abs(q.y) < 1.1;
      }),
    );
    assert.ok(!(inCounter(p) && visible), `f${f}: Bu Siti melintas konter di depan kamera`);
    assert.ok(!inCounter(p), `f${f}: lintasan memotong volume konter (${p.map((v) => v.toFixed(2))})`);
  }
  const centerNdc = (f: number) => {
    const p = actorPositionAt('buSiti', f);
    return projectPoint(sampleCamera(CAMS, f), [p[0], p[1] + 0.9, p[2]]);
  };
  for (let f = EP02_SITI_WALK1[0] + 1; f < EP02_SITI_WALK1[1]; f++) assert.ok(Math.abs(centerNdc(f).x) > 1.3, `WALK1 f${f} terlihat`);
  for (let f = EP02_SITI_OFFSCREEN_FROM; f < EP02_SITI_WALK3[1]; f++) {
    assert.ok(Math.abs(centerNdc(f).x) > 1.3, `WALK3 f${f} masih/sudah terlihat`);
  }
});
