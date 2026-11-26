import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCamera } from '../engine';
import {
  EP03_BON_FRAMES,
  EP03_CUTS,
  EP03_FISH_FROM,
  EP03_OYEN_ENTER_FRAME,
  EP03_OYEN_HOP_FRAME,
  EP03_OYEN_HOP_SIDE,
  EP03_OYEN_SEATED_FRAME,
  EP03_SLUMP_FROM,
  EP03_PLATE_FRAMES,
  EP03_SHOCK_FRAME,
  SLUMP_BREATH_PERIOD,
  oyenPoseAt,
  oyenPositionAt,
  poseFor,
  setStateAt,
} from '../productions/ep03-tio-bakmie/cast';
import { EP03_SUBS, renderFrameOf } from '../productions/ep03-tio-bakmie/Production';
import { BENCH_SEAT_Y, EP03_SPOTS, bonLinesAt } from '../productions/ep03-tio-bakmie/set';
import { CAMS, KICKS, SHOTS, TOTAL_FRAMES } from '../productions/ep03-tio-bakmie/shots';
import { EP03_FRAMES, EP03_LOOP_CUT_FRAME, VOICE_LINES, WORDS, lineById, wordFrame } from '../productions/ep03-tio-bakmie/words';
import { ep03TioBakmieMeta } from '../productions/ep03-tio-bakmie';

test('durasi terkunci 60 dtk = 1800 f, VO selesai sebelum f1785', () => {
  assert.equal(EP03_FRAMES, 1800);
  assert.equal(TOTAL_FRAMES, 1800);
  assert.equal(EP03_LOOP_CUT_FRAME, 1785);
  assert.equal(ep03TioBakmieMeta.durationInFrames, 1800);
  assert.equal(ep03TioBakmieMeta.width, 1080);
  assert.equal(ep03TioBakmieMeta.height, 1920);
});

test('semua suara selesai sebelum cut loop', () => {
  for (const l of VOICE_LINES) assert.ok(l.endFrame < EP03_LOOP_CUT_FRAME, `${l.id} berakhir f${l.endFrame}`);
});

test('shot berurutan tanpa celah, menutup 0..1800, minimal 24 frame', () => {
  assert.equal(SHOTS[0].from, 0);
  assert.equal(SHOTS[SHOTS.length - 1].to, 1800);
  for (let i = 0; i < SHOTS.length; i++) {
    if (i > 0) assert.equal(SHOTS[i].from, SHOTS[i - 1].to, `celah sebelum ${SHOTS[i].id}`);
    assert.ok(SHOTS[i].to - SHOTS[i].from >= 24, `${SHOTS[i].id} terlalu pendek (${SHOTS[i].to - SHOTS[i].from}f)`);
  }
});

test('kamera: setiap shot dimulai dengan hard cut dan hold tanpa slow-zoom (creepRate 0)', () => {
  for (const s of SHOTS) assert.ok(CAMS.some((k) => k.frame === s.from && k.cut), `${s.id} tanpa cut di f${s.from}`);
  for (const k of CAMS) assert.equal(k.creepRate, 0);
});

test('kamera diam saat hold: dua frame setelah settle punya pose identik', () => {
  for (const s of SHOTS) {
    const a = sampleCamera(CAMS, s.to - 3);
    const b = sampleCamera(CAMS, s.to - 2);
    assert.deepEqual(a, b, `${s.id} masih bergerak di akhir shot`);
  }
});

test('loop kontinu f1799 → f0 (platform me-loop): kamera, pose Utoh & napas slump tersambung, tanpa kedip di seam', () => {
  assert.equal(renderFrameOf(1790), 1790);
  assert.equal(renderFrameOf(1799), 1799);
  assert.deepEqual(sampleCamera(CAMS, 1799), sampleCamera(CAMS, 0));
  assert.equal(EP03_FRAMES % SLUMP_BREATH_PERIOD, 0, 'periode napas slump membagi habis 1800');
  const cam = sampleCamera(CAMS, 0).pos;
  const a = poseFor('bangUtoh', 0, cam);
  const z = poseFor('bangUtoh', EP03_FRAMES, cam); // f1800 ≡ f0
  const last = poseFor('bangUtoh', 1799, cam);
  assert.equal(a.face, 'tired');
  assert.equal(last.face, 'tired');
  // Fungsi pose periodik: f1800 identik dengan f0 (kecuali lip-sync, keduanya diam).
  for (const k of ['face', 'view', 'facing', 'stance', 'leftArm', 'rightArm', 'blink', 'lean', 'headTilt'] as const) {
    const va = a[k];
    const vz = z[k];
    if (typeof va === 'number' && typeof vz === 'number') assert.ok(Math.abs(va - vz) < 1e-9, `${k}: f1800 ${vz} vs f0 ${va}`);
    else assert.deepEqual(vz, va, k);
  }
  // Langkah f1799 → f0 sebesar langkah antarframe biasa.
  const step = (p: typeof a, q: typeof a) => Math.max(Math.abs((p.headTilt ?? 0) - (q.headTilt ?? 0)), Math.abs((p.lean ?? 0) - (q.lean ?? 0)));
  const normal = step(poseFor('bangUtoh', 1798, cam), last);
  assert.ok(step(last, a) <= normal * 1.5 + 1e-6, `seam ${step(last, a)} vs normal ${normal}`);
  // Tidak ada kedip di sekitar seam (mata setengah-pejam tetap).
  for (const f of [1792, 1795, 1799, 0, 3, 7]) assert.equal(poseFor('bangUtoh', f, cam).blink, 0.5, `kedip di f${f}`);
});

test('perubahan arah/pose besar mendarat di batas shot (R-5): batas cermin cast.ts = shots.ts, nol flicker < 3 f', () => {
  const from = (id: string) => SHOTS.find((s) => s.id === id)!.from;
  assert.equal(EP03_CUTS.sideRant, from('b3-side-rant'));
  assert.equal(EP03_CUTS.faceoff, from('b3-faceoff'));
  assert.equal(EP03_CUTS.sideProtest, from('b4-side-protest'));
  assert.equal(EP03_CUTS.wallet, from('b6-wallet'));
  assert.equal(EP03_CUTS.fish, from('b6-fish'));
  assert.equal(EP03_CUTS.oyenMeong, from('b6-oyen-meong'));
  assert.equal(EP03_CUTS.sideSlump, from('b6-side-slump'));
  assert.equal(EP03_SLUMP_FROM, from('b6-side-slump'));
  // Tepat di cut b4-side-protest: Utoh sudah protes (tanpa fx "?") dan Oyen sudah tampak samping.
  const f = from('b4-side-protest');
  const cam = sampleCamera(CAMS, f).pos;
  assert.equal(poseFor('bangUtoh', f, cam).face, 'angry');
  assert.equal(oyenPoseAt(f, cam)!.view, oyenPoseAt(f + 10, cam)!.view, 'Oyen tidak berputar di awal b4-side-protest');
  // Pindai seluruh durasi: setiap run view/stance yang seluruhnya di dalam satu shot harus >= 3 f;
  // dan di dalam satu shot view Oyen tidak boleh lompat front<->back.
  const bad: string[] = [];
  for (const s of SHOTS) {
    const views: Record<string, string[]> = { utoh: [], oyen: [] };
    for (let k = s.from; k < s.to; k++) {
      const c = sampleCamera(CAMS, k).pos;
      const u = poseFor('bangUtoh', k, c);
      views.utoh.push(`${u.view}|${u.stance}`);
      const o = oyenPoseAt(k, c);
      views.oyen.push(o ? `${o.view}|${o.stance}` : 'none');
    }
    for (const [who, v] of Object.entries(views)) {
      let start = 0;
      for (let k = 1; k <= v.length; k++) {
        if (k === v.length || v[k] !== v[start]) {
          const len = k - start;
          if (len < 3 && start > 0 && k < v.length) bad.push(`${s.id} ${who} ${v[start]} ${len}f @f${s.from + start}`);
          start = k;
        }
      }
      for (let k = 1; k < v.length; k++) {
        const pair = [v[k - 1].split('|')[0], v[k].split('|')[0]].sort().join('-');
        if (pair === 'back-front') bad.push(`${s.id} ${who} snap front<->back @f${s.from + k}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('Oyen naik ke kursi plastik dengan lompatan rendah dari samping kursi (R-4)', () => {
  const cam = sampleCamera(CAMS, EP03_OYEN_HOP_FRAME).pos;
  const seat = oyenPositionAt(EP03_OYEN_SEATED_FRAME, cam)!;
  let maxArc = 0;
  for (let f = EP03_OYEN_HOP_FRAME; f < EP03_OYEN_SEATED_FRAME; f++) {
    const p = oyenPositionAt(f, cam)!;
    const t = (f - EP03_OYEN_HOP_FRAME) / (EP03_OYEN_SEATED_FRAME - EP03_OYEN_HOP_FRAME);
    maxArc = Math.max(maxArc, p[1] - seat[1] * t);
    assert.ok(p[1] <= seat[1] + 0.08 + 1e-9, `f${f} melayang ${p[1].toFixed(3)} m`);
  }
  assert.ok(maxArc <= 0.08 + 1e-9, `busur ${maxArc.toFixed(3)} m`);
  // Tolakan dari samping kursi (di luar tapak kursi pada sumbu z), bukan dari depan kursi.
  assert.ok(Math.abs(EP03_OYEN_HOP_SIDE[2] - EP03_SPOTS.oyenSeat[2]) > 0.15 + 0.1);
});

test('aksi prop: Oyen meraih ikan asin di insert, Tio memasak dengan sodet (tidak pernah mangkok), dompet di dada', () => {
  const fishCam = sampleCamera(CAMS, EP03_FISH_FROM + 4).pos;
  const o = oyenPoseAt(EP03_FISH_FROM + 4, fishCam)!;
  assert.equal(o.pawRaise, 'right');
  assert.ok((o.pawReach ?? 0) > 1.3 && o.view !== 'back');
  for (let f = 0; f < 1800; f += 3) {
    const t = poseFor('tio', f, sampleCamera(CAMS, f).pos);
    assert.ok(t.leftProp === 'sodet' || t.rightProp === 'sodet', `Tio tanpa sodet di f${f}`);
    assert.ok(t.leftProp !== 'bakmie' && t.rightProp !== 'bakmie', `Tio memegang mangkok di f${f}`);
  }
  const wf = SHOTS.find((s) => s.id === 'b6-wallet')!.from;
  const w = poseFor('bangUtoh', wf, sampleCamera(CAMS, wf).pos);
  assert.equal(w.rightProp, 'walletEmpty');
  assert.ok(w.rightHand?.front && w.rightHand.reach);
  assert.deepEqual(setStateAt(1200).platesFrom, [...EP03_PLATE_FRAMES]);
});

test('bon: urutan ditulis setelah kata pemicu & totalnya benar-benar 90RB', () => {
  assert.ok(EP03_BON_FRAMES.mie > lineById('T1').endFrame);
  assert.ok(EP03_BON_FRAMES.pangsit > wordFrame('T3', 'pangsit'));
  assert.ok(EP03_BON_FRAMES.ayam > EP03_PLATE_FRAMES[2]);
  assert.ok(EP03_BON_FRAMES.curhat >= wordFrame('T7', 'sembilan'));
  const order = [EP03_BON_FRAMES.mie, EP03_BON_FRAMES.pangsit, EP03_BON_FRAMES.ayam, EP03_BON_FRAMES.esteh, EP03_BON_FRAMES.curhat, EP03_BON_FRAMES.total];
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], `urutan bon ke-${i}`);
  const lines = bonLinesAt(1799, EP03_BON_FRAMES);
  const sum = lines.filter((l) => !l.total).reduce((n, l) => n + Number(/(\d+)rb/.exec(l.price)![1]), 0);
  assert.equal(sum, 90);
  const last = lines[lines.length - 1];
  assert.ok(last.total && last.price === '90rb', 'baris terakhir = Total 90rb');
  // TOTAL terbaca sebelum shot insert bon berakhir.
  const ins = SHOTS.find((s) => s.id === 'b6-board-total')!;
  assert.ok(EP03_BON_FRAMES.total < ins.to - 10);
});

test('prop muncul mengikuti aksi: mangkok di "satu", 3 piring berurutan, ikan asin sebelum "Meong."', () => {
  assert.equal(setStateAt(wordFrame('T1', 'satu') - 1).bowlVisible, false);
  assert.equal(setStateAt(wordFrame('T1', 'satu')).bowlVisible, true);
  assert.deepEqual([EP03_PLATE_FRAMES[0], EP03_PLATE_FRAMES[1], EP03_PLATE_FRAMES[2]].map((f) => setStateAt(f).plates), [1, 2, 3]);
  assert.equal(setStateAt(lineById('O1').startFrame).fish, 1);
});

test('Oyen: tidak ada sebelum masuk, lalu duduk tepat di dudukan bangku', () => {
  assert.equal(oyenPositionAt(EP03_OYEN_ENTER_FRAME - 1), null);
  const p = oyenPositionAt(EP03_SHOCK_FRAME)!;
  assert.deepEqual(p, EP03_SPOTS.oyenSeat);
  assert.equal(p[1], BENCH_SEAT_Y);
});

test('kick kaget mendarat di frame lompat Utoh dan di dalam shot faceoff', () => {
  assert.equal(KICKS[0].frame, EP03_SHOCK_FRAME);
  const s = SHOTS.find((x) => x.id === 'b3-faceoff')!;
  assert.ok(EP03_SHOCK_FRAME >= s.from && EP03_SHOCK_FRAME < s.to);
});

test('subtitle: tidak tumpang tindih, tidak melewati loop, setiap kata tampil', () => {
  for (let i = 1; i < EP03_SUBS.length; i++) assert.ok(EP03_SUBS[i].from >= EP03_SUBS[i - 1].to, `tumpang tindih di #${i}`);
  for (const c of EP03_SUBS) assert.ok(c.to <= EP03_LOOP_CUT_FRAME);
  const shown = EP03_SUBS.reduce((n, c) => n + c.tokens.length, 0);
  assert.equal(shown, WORDS.length);
});
