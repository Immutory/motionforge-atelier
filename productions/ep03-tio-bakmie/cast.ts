import {
  actorFaceAnchors,
  blinkLidAt,
  clamp,
  lerp,
  lerp3,
  resolve25DView,
  smootherstep,
  talkGated,
  type ActorPose,
  type ActorView,
  type ArmPose,
  type CastPresetId,
  type CatPose,
  type CharacterSpec,
  type Expression,
  type TalkEvent,
  type TalkSample,
  type Vec3,
} from '../../engine';
import { BENCH_SEAT_Y, BON_WRITE_FRAMES, EP03_SPOTS, STOOLS, bonLinesAt, seatCardPos, type SetState } from './set';
import { NONVERBAL, lineById, rmsAt, wordFrame, wordsOf, type VoiceSpeaker } from './words';

/**
 * Milik agent character-animator. Akting EP03 "Curhat ke Abang Bakmie".
 * Semua frame kunci diturunkan dari kata/momen rekaman (`voice/timeline.json`), jadi perubahan VO cukup build ulang.
 * Arah hadap tokoh disimpan sebagai vektor dunia; `viewFor` mengubahnya jadi `view` + `facing` terhadap kamera aktif
 * (karakter yang membelakangi kamera otomatis `view: 'back'`).
 */

export const FPS = 30;

export type Ep03HumanId = 'bangUtoh' | 'tio' | 'mbakYuni';

export type Ep03Actor = { id: Ep03HumanId; preset: CastPresetId; overrides?: Partial<CharacterSpec>; height: number };

export const ACTORS: Ep03Actor[] = [
  { id: 'bangUtoh', preset: 'bangUtoh', height: 1.96 },
  { id: 'tio', preset: 'tio', height: 1.96 },
  { id: 'mbakYuni', preset: 'mbakYuni', height: 1.86 },
];

/** Tinggi billboard Oyen (sama dengan EP02). */
export const OYEN_HEIGHT = 0.54;

// ---------------------------------------------------------------------------------------------
// Frame kunci (dari rekaman)
// ---------------------------------------------------------------------------------------------

const L = (id: string) => lineById(id);

/** Tio menyajikan mangkok saat "satu". */
export const EP03_BOWL_FRAME = wordFrame('T1', 'satu');
/** Isi papan bon ditulis Tio tepat setelah kata pemicunya. */
export const EP03_BON_FRAMES = {
  mie: L('T1').endFrame + 2,
  pangsit: L('T3').endFrame + 2,
  ayam: 0, // diisi di bawah (setelah piring ke-3)
  esteh: 0,
  curhat: wordFrame('T7', 'sembilan'),
  total: 0, // = curhat + BON_WRITE_FRAMES (ditulis tanpa jeda, diisi di bawah)
};
/** Oyen masuk dari timur saat Utoh mengoceh U4, lalu melompat ke bangku. */
export const EP03_OYEN_ENTER_FRAME = L('U4').startFrame + 4;
export const EP03_OYEN_HOP_FRAME = L('U4').endFrame - 10;
export const EP03_OYEN_SEATED_FRAME = EP03_OYEN_HOP_FRAME + 10;
/** Utoh menoleh ke kanan (ke Oyen) setelah "sekarang?", kaget melompat (strike) lalu tetap memandangi Oyen. */
export const EP03_UTOH_TURN_FROM = L('T4').endFrame + 4;
export const EP03_UTOH_TURN_TO = EP03_UTOH_TURN_FROM + 8;
/** Slow-blink Oyen 14 frame tepat saat bertatapan. */
export const EP03_OYEN_BLINK_FROM = EP03_UTOH_TURN_TO + 2;
/** Strike kaget: 4f wind-up -> 6f hold -> 1f lompat -> 8f follow (jatuh kembali duduk). */
export const EP03_SHOCK_FRAME = EP03_OYEN_BLINK_FROM + 14 + 10;
/** Tiga piring ayam diletakkan Tio (ting) sepanjang kekeh + "Pelanggan tetap.". */
export const EP03_PLATE_FRAMES = [L('U5').endFrame + 4, L('U5').endFrame + 16, L('T5').endFrame - 4] as const;
EP03_BON_FRAMES.ayam = EP03_PLATE_FRAMES[2] + 10;
/** Tio menuang es teh tanpa diminta saat Utoh bangkit semangat (U6). */
export const EP03_ESTEH_FRAME = wordFrame('U6', 'mulai');
EP03_BON_FRAMES.esteh = EP03_ESTEH_FRAME + 12;
EP03_BON_FRAMES.total = EP03_BON_FRAMES.curhat + BON_WRITE_FRAMES;
/** Dompet kosong Utoh + ngengat (setelah TOTAL selesai ditulis). */
export const EP03_WALLET_FROM_FRAME = EP03_BON_FRAMES.total + 22;
export const EP03_MOTH_FROM = EP03_WALLET_FROM_FRAME + 16;
export const EP03_MOTH_TO = EP03_MOTH_FROM + 40;

/** Oyen mendorong 2 ikan asin ke piring, lalu "Meong.". */
export const EP03_FISH_FROM = L('O1').startFrame - 22;
export const EP03_FISH_TO = EP03_FISH_FROM + 8;
/** Kacamata Tio melorot saat dibayar ikan asin. */
export const EP03_GLASSES_POP = L('O1').startFrame + 4;
/**
 * Batas shot (cermin `shots.ts`; tidak diimpor karena shots.ts mengimpor cast.ts — kesamaannya dites di
 * tests/ep03-production.test.ts). Perubahan arah hadap/pose besar mendarat TEPAT di cut, nol flicker < 3 f.
 */
export const EP03_CUTS = {
  sideRant: L('U4').startFrame - 6,
  faceoff: L('T4').endFrame + 5,
  sideProtest: L('U5').startFrame - 7,
  wallet: EP03_WALLET_FROM_FRAME - 2,
  fish: L('O1').startFrame - 28,
  oyenMeong: L('O1').startFrame - 4,
  sideSlump: L('U7').startFrame - 13,
} as const;
/** Utoh kembali menjatuhkan dahi ke gerobak (pose = f0, untuk loop) tepat di cut shot penutup. */
export const EP03_SLUMP_FROM = EP03_CUTS.sideSlump;

// ---------------------------------------------------------------------------------------------
// Arah hadap -> view billboard
// ---------------------------------------------------------------------------------------------

const yawVec = (deg: number): Vec3 => [Math.sin((deg * Math.PI) / 180), 0, Math.cos((deg * Math.PI) / 180)];

/**
 * Pilih `view` + `facing` dari arah hadap dunia tokoh (`forward`) dan posisi kamera:
 * sudut < 35° = front, < 75° = threeQuarter, < 120° = side, sisanya back.
 */
export function viewFor(pos: Vec3, forward: Vec3, camPos: Vec3): { view: ActorView; facing: number } {
  const { view, facing } = resolve25DView(pos, forward, camPos, { fourWayThresholds: [35, 75, 120] });
  return { view, facing };
}

// ---------------------------------------------------------------------------------------------
// Lip-sync
// ---------------------------------------------------------------------------------------------

const WORDS_BY: Record<VoiceSpeaker, ReturnType<typeof wordsOf>> = {
  bangUtoh: wordsOf('bangUtoh'),
  tio: wordsOf('tio'),
  mbakYuni: wordsOf('mbakYuni'),
  oyen: wordsOf('oyen'),
};
const eventsOf = (s: VoiceSpeaker): TalkEvent[] => NONVERBAL.filter((e) => e.speaker === s);

export function talkFor(speaker: VoiceSpeaker, frame: number): TalkSample {
  return talkGated(WORDS_BY[speaker], frame, { rms: (f) => rmsAt(speaker, f), events: eventsOf(speaker), fps: FPS, leadFrames: 1 });
}

const inLine = (id: string, f: number, pad = 0) => f >= L(id).startFrame - pad && f <= L(id).endFrame + pad;
const ease = (f: number, a: number, b: number) => smootherstep((f - a) / Math.max(1, b - a));

// ---------------------------------------------------------------------------------------------
// Posisi & arah hadap
// ---------------------------------------------------------------------------------------------

/** Lompatan kaget Utoh (strike envelope sederhana, meter). */
export function utohHopAt(frame: number): number {
  const d = frame - EP03_SHOCK_FRAME;
  if (d < -4 || d > 14) return 0;
  if (d < 0) return -0.02 * ((d + 4) / 4); // wind-up: mengkerut
  if (d < 6) return 0.16 * Math.sin((Math.PI * (d + 1)) / 7);
  return 0.16 * Math.max(0, 1 - (d - 6) / 8) * 0.25;
}

/**
 * Posisi kartu tokoh. Utoh duduk di kursinya: dengan `camPos`, kartu digeser ke tepi kursi yang menghadap kamera
 * (`seatCardPos`) supaya dudukan tidak pernah menutupi kaki/tangan (revisi G4 "nembus").
 */
export function actorPositionAt(id: Ep03HumanId, frame: number, camPos?: Vec3): Vec3 {
  if (id === 'tio') return EP03_SPOTS.tio;
  if (id === 'mbakYuni') return EP03_SPOTS.yuni;
  const s = seatCardPos(EP03_SPOTS.utohSeat, STOOLS.utoh.half, camPos);
  return [s[0], s[1] + utohHopAt(frame), s[2]];
}

/** Arah hadap dunia Utoh: ke gerobak (+z); menoleh ke Oyen (+x) setelah "sekarang?" sampai protes U5. */
export function utohForwardAt(frame: number): Vec3 {
  // Kembali menghadap gerobak tepat di cut ke b4-side-protest (bukan 1 f setelahnya).
  if (frame >= EP03_UTOH_TURN_FROM && frame < EP03_CUTS.sideProtest) {
    return yawVec(lerp(0, 88, ease(frame, EP03_UTOH_TURN_FROM, EP03_UTOH_TURN_TO)));
  }
  // Memeriksa dompet: berpaling dari Tio (malu) ke arah barat-depan, mulai tepat di cut b6-wallet.
  if (frame >= EP03_CUTS.wallet && frame < EP03_CUTS.fish) return yawVec(-70);
  if (frame >= EP03_CUTS.fish && frame < EP03_SLUMP_FROM) return yawVec(70);
  return yawVec(0);
}

/** Arah hadap Tio: ke pembeli (−z); melirik Oyen di T4, menatap bohlam di awal T6. */
export function tioForwardAt(frame: number): Vec3 {
  if (inLine('T4', frame, 4)) return yawVec(160);
  if (frame >= L('T6').startFrame && frame < wordFrame('T6', 'Sekarang')) return yawVec(205);
  return yawVec(180);
}

/**
 * Titik tolak lompatan Oyen: di lantai SAMPING kursi plastiknya (sisi −z, kanan layar kamera timur b3-side-rant),
 * bukan dari depan kursi. Dari sini Oyen naik menyamping, rendah, ke dudukan — tidak melayang di depan dada Utoh.
 */
export const EP03_OYEN_HOP_SIDE: Vec3 = [EP03_SPOTS.oyenSeat[0] + 0.17, 0, EP03_SPOTS.oyenSeat[2] - STOOLS.oyen.half - 0.24];
/** Tinggi busur lompatan di atas garis lurus lantai→dudukan (m). */
export const EP03_OYEN_HOP_ARC = 0.06;

/**
 * Insert ikan asin: Oyen berdiri dengan kaki belakang di sudut kursinya yang dekat ledge (kartu dinaikkan setinggi
 * badan yang terjulur; dudukan & kaki di luar frame insert), condong & meraih piring. Kursi tidak bergeser.
 */
const OYEN_FISH_CARD: Vec3 = [EP03_SPOTS.oyenSeat[0] + 0.17, BENCH_SEAT_Y + 0.25, EP03_SPOTS.oyenSeat[2] + 0.13];

export function oyenPositionAt(frame: number, camPos?: Vec3): Vec3 | null {
  if (frame < EP03_OYEN_ENTER_FRAME) return null;
  if (frame < EP03_OYEN_HOP_FRAME) {
    const t = ease(frame, EP03_OYEN_ENTER_FRAME, EP03_OYEN_HOP_FRAME);
    return lerp3(EP03_SPOTS.oyenEnter, EP03_OYEN_HOP_SIDE, t);
  }
  const seat = seatCardPos(EP03_SPOTS.oyenSeat, STOOLS.oyen.half, camPos);
  if (frame < EP03_OYEN_SEATED_FRAME) {
    const t = (frame - EP03_OYEN_HOP_FRAME) / (EP03_OYEN_SEATED_FRAME - EP03_OYEN_HOP_FRAME);
    const s = smootherstep(t);
    // Lateral dulu (rendah, di bawah garis lutut), naik ke dudukan di paruh akhir; busur kecil, mendarat = kartu duduk.
    return [
      lerp(EP03_OYEN_HOP_SIDE[0], seat[0], s),
      seat[1] * smootherstep(clamp((t - 0.25) / 0.75, 0, 1)) + Math.sin(Math.PI * t) * EP03_OYEN_HOP_ARC,
      lerp(EP03_OYEN_HOP_SIDE[2], seat[2], s),
    ];
  }
  if (frame >= EP03_CUTS.fish && frame < EP03_CUTS.oyenMeong) return OYEN_FISH_CARD;
  return seat;
}

export function oyenForwardAt(frame: number): Vec3 {
  if (frame < EP03_OYEN_HOP_FRAME) {
    const a = EP03_SPOTS.oyenEnter;
    const b = EP03_OYEN_HOP_SIDE;
    return [b[0] - a[0], 0, b[2] - a[2]];
  }
  if (frame < EP03_OYEN_SEATED_FRAME) return yawVec(0); // lompat menyamping ke dudukan (+z)
  // Menatap Utoh sejak cut faceoff sampai cut b4-side-protest (tanpa snap di tengah shot).
  if (frame >= EP03_CUTS.faceoff && frame < EP03_CUTS.sideProtest) return yawVec(-90);
  // "Meong." ke kamera/Utoh sepanjang shot b6-oyen-meong (tanpa snap depan→belakang di f1647).
  if (frame >= EP03_CUTS.oyenMeong && frame < EP03_CUTS.sideSlump) return yawVec(200);
  return yawVec(0); // ke ledge (makan)
}

// ---------------------------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------------------------

const SIT = { stance: 'sit' as const, sitHeight: 0.46 };

/** Pose "dahi ke gerobak" Utoh (identik di f0 dan akhir loop). */
const SLUMP = { face: 'tired' as Expression, lean: 9, headTilt: 16, leftArm: 'rest' as ArmPose, rightArm: 'rest' as ArmPose };

/**
 * Napas berat saat slump. Periode 90 f membagi habis durasi 1800 f: loop kini kontinu (platform memutar f1799 → f0),
 * jadi f1800 ≡ f0 dan napas tersambung tanpa loncatan.
 */
export const SLUMP_BREATH_PERIOD = 90;
/** Jendela di sekitar seam loop (f1800 ≡ f0) tempat kedip ditahan setengah-pejam (tidak ada kedip tepat di seam). */
export const EP03_SEAM_HOLD = 8;
const nearSeam = (frame: number) => frame < EP03_SEAM_HOLD || frame >= 1800 - EP03_SEAM_HOLD;

/**
 * Tunjuk ke Oyen di shot samping-timur (b3-side-rant / b4-side-protest): Oyen duduk di depan-bawah Utoh, di layar
 * tepat di bawah dagunya (kepala Oyen ≈ kanvas Utoh (350, 700)). Jari telunjuk mode 'point' selalu mengarah ke +x
 * kanvas (kanan layar), jadi tangan kanan diulurkan ke depan-bawah, di KIRI kepala Oyen, dan menunjuk balik ke Oyen.
 */
const POINT_AT_OYEN = { x: 246, y: 688 };
const slumpBreath = (frame: number) => Math.sin((2 * Math.PI * frame) / SLUMP_BREATH_PERIOD);

/** Target tangan (kanvas) memegang dompet di tengah dada. Dompet digambar di tangan kanan + (14, −16). */
function walletHandsAt(pose: ActorPose) {
  const { torsoTop } = actorFaceAnchors('bangUtoh', pose);
  const cy = torsoTop + 98; // tengah dada
  return { right: { x: 350 - 14, y: cy + 16 }, left: { x: 350 - 46, y: cy + 22 } };
}

export function utohPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = actorPositionAt('bangUtoh', frame);
  const { view, facing } = viewFor(pos, utohForwardAt(frame), camPos);
  const base: ActorPose = {
    ...SIT,
    view,
    facing,
    face: 'neutral',
    blink: blinkLidAt(frame, 11, FPS, [EP03_SHOCK_FRAME]),
    talk: talkFor('bangUtoh', frame),
    leftArm: 'rest',
    rightArm: 'rest',
    // Napas idle yang terbaca (bukan beku): badan     lean: Math.sin(frame / 22) * 0.8, kepala bergoyang halus, fase beda.
    lean: Math.sin(frame / 14) * 1.8,
    headTilt: Math.sin(frame / 11 + 1.3) * 2.2,
  };

  // Lompat kaget: lengan terangkat dipendekkan (kamera faceoff terkunci; tangan kanan sebelumnya keluar frame).
  if (frame >= EP03_SHOCK_FRAME - 4 && frame < EP03_SHOCK_FRAME + 14) {
    return {
      ...base,
      face: 'shock',
      fx: 'shock',
      hatPop: 1,
      leftArm: 'raise',
      rightArm: 'raise',
      leftHand: { dx: 18, dy: 34 },
      rightHand: { dx: -72, dy: 40 },
      stance: frame >= EP03_SHOCK_FRAME && frame < EP03_SHOCK_FRAME + 6 ? 'jump' : 'sit',
    };
  }
  if (frame < L('U1').endFrame + 30 || frame >= EP03_SLUMP_FROM) {
    // Dahi ke gerobak; sedikit bangkit di "kucing" lalu turun lagi.
    const lift = frame < 200 ? ease(frame, L('U1').endFrame, L('U1').endFrame + 24) : 0;
    const br = slumpBreath(frame);
    return {
      ...base,
      ...SLUMP,
      headTilt: lerp(SLUMP.headTilt + br * 1.8, 4, lift),
      lean: lerp(SLUMP.lean + br * 1.4, 2, lift),
      blink: nearSeam(frame) ? 0.5 : frame < 60 || frame >= EP03_SLUMP_FROM ? Math.max(0.5, Number(base.blink)) : base.blink,
    };
  }
  if (frame < L('U2').startFrame) return { ...base, face: 'sad', headTilt: 4 };
  if (inLine('U2', frame, 2)) {
    const nol = frame >= wordFrame('U2', 'nol') - 2;
    return { ...base, face: nol ? 'angry' : 'sad', leftArm: 'raise', rightArm: nol ? 'raise' : 'rest', lean: -2 };
  }
  if (frame < L('U3').startFrame) return { ...base, face: frame > wordFrame('T2', 'lembek') ? 'skeptical' : 'neutral', headTilt: 3 };
  if (frame < L('T3').startFrame) return { ...base, face: 'skeptical', headTilt: -10 };
  if (frame < L('U4').startFrame) return { ...base, face: 'tired', headTilt: 6 };
  if (frame < EP03_UTOH_TURN_FROM) {
    if (inLine('U4', frame, 2)) {
      return { ...base, face: 'angry', leftArm: 'raise', rightArm: 'point', rightHand: { reach: { ...POINT_AT_OYEN, t: 1 } }, lean: -3, headTilt: 5 };
    }
    return { ...base, face: 'nervous', headTilt: -4 }; // T4: membeku
  }
  if (frame < EP03_CUTS.sideProtest) return { ...base, face: frame < EP03_SHOCK_FRAME ? 'nervous' : 'skeptical', headTilt: 3 };
  if (frame < L('U5').endFrame + 20) {
    return { ...base, face: 'angry', rightArm: 'point', rightHand: { reach: { ...POINT_AT_OYEN, t: 1 } }, leftArm: 'hip', lean: -3, headTilt: 5 };
  }
  if (frame < L('T6').startFrame) return { ...base, face: 'skeptical', leftArm: 'cross', rightArm: 'cross' };
  if (frame < L('U6').startFrame - 26) {
    const sepi = frame >= wordFrame('T6', 'Masih');
    return { ...base, face: sepi ? 'skeptical' : 'sad', headTilt: sepi ? -6 : 5 };
  }
  if (frame < L('T7').startFrame) {
    const nol = frame >= wordFrame('U6', 'mulai');
    return { ...base, face: frame < wordFrame('U6', 'Oke') ? 'laugh' : 'happy', rightArm: nol ? 'raise' : 'rest', leftArm: 'hip', lean: -2 };
  }
  if (frame < EP03_CUTS.wallet) return { ...base, face: frame >= wordFrame('T7', 'sembilan') ? 'nervous' : 'happy' };
  if (frame < EP03_CUTS.fish) {
    // Dompet TERBUKA dipegang dua tangan di depan dada tengah (digambar di depan tubuh), tepat sejak cut b6-wallet.
    const w = walletHandsAt(base);
    return {
      ...base,
      face: frame < EP03_MOTH_FROM ? 'nervous' : 'sad',
      leftArm: 'hold',
      rightArm: 'hold',
      rightProp: 'walletEmpty',
      rightHand: { front: true, reach: { x: w.right.x, y: w.right.y, t: 1 } },
      leftHand: { front: true, reach: { x: w.left.x, y: w.left.y, t: 1 } },
      headTilt: 8,
    };
  }
  return { ...base, face: 'shock', hatPop: frame < EP03_FISH_FROM + 6 ? 1 : 0 };
}

/**
 * Revisi R-7: sodet dipegang tangan KIRI Tio (kiri layar = timur = sisi dandang baru, `DANDANG` x −12.91) dengan bilah
 * menghadap ke BAWAH masuk ke mulut dandang (`propTilt` ≈ π). Tangan berada di atas bibir dandang yang terproyeksi
 * ke kartu Tio (≈ kanvas (215, 598)), digeser `SODET_OUT` px ke luar (menjauhi wajah): tidak ada gagang di depan kacamata.
 */
export const SODET_OUT = 20;
const SODET_HAND = { x: 236, y: 566 };
const SODET_TILT = Math.PI - 0.3;

function sodetRig(dx: number, dy: number) {
  return { reach: { x: SODET_HAND.x, y: SODET_HAND.y, t: 1 }, dx: -SODET_OUT + dx, dy, propTilt: SODET_TILT, front: true };
}

export function tioPoseAt(frame: number, camPos: Vec3): ActorPose {
  const pos = actorPositionAt('tio', frame);
  const { view, facing } = viewFor(pos, tioForwardAt(frame), camPos);
  // Revisi G4: Tio SELALU memasak bakmie, tidak pernah memegang mangkok. Siklus 72 f: mengaduk dandang dengan sodet,
  // lalu 18 f mengangkat & meniriskan mi (tangan naik, badan condong), kembali mengaduk.
  const stir = Math.sin(frame * 0.32);
  const cyc = frame % 72;
  const lifting = cyc >= 54;
  const liftT = lifting ? Math.sin((Math.PI * (cyc - 54)) / 18) : 0;
  const base: ActorPose = {
    view,
    facing,
    face: 'neutral',
    blink: blinkLidAt(frame, 23, FPS, [EP03_GLASSES_POP]),
    talk: talkFor('tio', frame),
    stance: 'stand',
    leftArm: 'hold',
    leftProp: 'sodet',
    leftHand: lifting ? sodetRig(Math.sin(frame * 0.9) * 4, -liftT * 34) : sodetRig(stir * 12, Math.cos(frame * 0.32) * 5),
    rightArm: 'rest',
    lean: Math.sin(frame / 26) * 0.6 + liftT * 2.5,
  };
  const bonFrames = Object.values(EP03_BON_FRAMES);
  const writing = bonFrames.some((b) => b > 0 && frame >= b - 14 && frame < b + 2);
  if (writing) {
    // Menulis bon (papan di barat = kanan layar) dengan tangan kanan; tangan kiri tetap mengaduk.
    return { ...base, rightArm: 'point', rightProp: 'pen', rightHand: { dx: Math.sin(frame * 0.9) * 12, dy: Math.cos(frame * 0.7) * 6 }, headTilt: 6 + Math.sin(frame * 0.5) * 3 };
  }
  if (frame >= EP03_GLASSES_POP && frame < EP03_GLASSES_POP + 40) return { ...base, face: 'shock', hatPop: 1 };
  // Mi untuk Utoh diangkat dari dandang (sodet naik) tepat sebelum mangkok muncul di ledge.
  if (frame >= EP03_BOWL_FRAME - 14 && frame < EP03_BOWL_FRAME + 2) return { ...base, leftHand: sodetRig(0, -34), lean: 2 };
  if (inLine('T1', frame, 4)) return { ...base, face: 'happy' };
  if (inLine('T2', frame, 6)) {
    const mie = frame >= wordFrame('T2', 'Kelamaan');
    // "Kelamaan direbus… lembek": mengangkat mi dari dandang dengan sodet, bukan memegang mangkok.
    return { ...base, face: 'smug', headTilt: -6, blink: 0.3, leftHand: mie ? sodetRig(0, -38 + Math.sin(frame * 0.4) * 4) : base.leftHand };
  }
  if (inLine('T3', frame, 4)) return { ...base, face: 'neutral', blink: 0.25 };
  if (inLine('T4', frame, 6)) return { ...base, face: 'nervous', leftHand: sodetRig(0, 0) };
  if (frame > L('T4').endFrame && frame < L('U5').startFrame) return { ...base, face: frame < EP03_SHOCK_FRAME + 10 ? 'nervous' : 'neutral' };
  if (frame >= EP03_PLATE_FRAMES[0] - 8 && frame < EP03_PLATE_FRAMES[2] + 4) {
    const chuckle = NONVERBAL.find((n) => n.line === 'T5');
    const laughing = chuckle ? frame >= chuckle.startFrame && frame < chuckle.endFrame : false;
    // Tangan kanan menyodorkan piring (luncur di set), tangan kiri tetap di sodet.
    return { ...base, face: laughing ? 'laugh' : 'neutral', rightArm: 'point' };
  }
  if (inLine('T6', frame, 6)) {
    const sekarang = frame >= wordFrame('T6', 'Sekarang');
    const sepi = frame >= wordFrame('T6', 'Masih');
    // Bercerita sambil tetap mengaduk pelan (tangan kiri di dandang).
    return {
      ...base,
      face: sepi ? 'tired' : sekarang ? 'smug' : 'sad',
      // Napas & kepala termenung tetap hidup di close-up (jeda tulus T6 bukan frame beku).
      lean: (sekarang ? 0 : -3) + Math.sin(frame * 0.21) * 1.6,
      headTilt: Math.sin(frame * 0.15 + 0.8) * 3.2,
      leftHand: sodetRig(Math.sin(frame * 0.12) * 6, 0),
      rightArm: sekarang && !sepi ? 'hip' : 'rest',
    };
  }
  if (frame >= EP03_ESTEH_FRAME - 14 && frame < EP03_ESTEH_FRAME + 4) return { ...base, face: 'happy', rightArm: 'point', rightProp: 'esteh' };
  if (inLine('T7', frame, 4)) return { ...base, face: 'happy' };
  return base;
}

export function yuniPoseAt(frame: number, camPos: Vec3): ActorPose {
  const { view, facing } = viewFor(EP03_SPOTS.yuni, yawVec(195), camPos);
  // Periodik terhadap 1800 f (15 f & 180 f membagi habis) supaya seam loop kontinu bila Yuni tertangkap tepi frame.
  const shave = Math.sin((2 * Math.PI * frame) / 15);
  return {
    view,
    facing,
    face: inLine('Y1', frame, 6) ? 'smug' : 'neutral',
    blink: blinkLidAt(frame, 37, FPS),
    talk: talkFor('mbakYuni', frame),
    stance: 'stand',
    leftArm: inLine('Y1', frame, 6) ? 'hip' : 'hold',
    rightArm: 'hold',
    rightHand: { dy: shave * 8 },
    lean: Math.sin((2 * Math.PI * frame) / 180) * 0.5,
  };
}

export function poseFor(id: Ep03HumanId, frame: number, camPos: Vec3): ActorPose {
  if (id === 'tio') return tioPoseAt(frame, camPos);
  if (id === 'mbakYuni') return yuniPoseAt(frame, camPos);
  return utohPoseAt(frame, camPos);
}

export function oyenPoseAt(frame: number, camPos: Vec3): CatPose | null {
  const pos = oyenPositionAt(frame, camPos);
  if (!pos) return null;
  const { view, facing } = viewFor(pos, oyenForwardAt(frame), camPos);
  const slow = frame >= EP03_OYEN_BLINK_FROM && frame < EP03_OYEN_BLINK_FROM + 14;
  const slowLid = slow ? Math.sin((Math.PI * (frame - EP03_OYEN_BLINK_FROM)) / 14) : 0;
  const base: CatPose = {
    face: 'neutral',
    blink: slow ? slowLid : blinkLidAt(frame, 5, FPS),
    talk: talkFor('oyen', frame),
    stance: 'sit',
    view,
    facing,
    tailPhase: frame * 0.12,
    breathPhase: frame * 0.1,
    earTwitch: Math.sin(frame * 0.05) > 0.96 ? 1 : 0,
  };
  if (frame < EP03_OYEN_HOP_FRAME) return { ...base, stance: 'walk', walkPhase: ((frame - EP03_OYEN_ENTER_FRAME) / 18) % 1 };
  if (frame < EP03_OYEN_SEATED_FRAME) return { ...base, stance: 'jump' };
  // Makan: kepala mematuk ke piring berirama (hidup, bukan beku).
  if (frame >= EP03_PLATE_FRAMES[0] && frame < L('T6').startFrame) return { ...base, face: 'happy', lean: 6 + Math.max(0, Math.sin(frame * 0.45)) * 8 };
  // Insert ikan asin (R-8): Oyen tampak samping menghadap piring (kanan layar), condong lalu cakar kanan meraih &
  // mendorong ikan tepat di EP03_FISH_FROM..TO; kursi tetap, Oyen hanya bergeser ke sudut dudukannya yang dekat ledge.
  if (frame >= EP03_CUTS.fish && frame < EP03_CUTS.oyenMeong) {
    const reach = ease(frame, EP03_FISH_FROM - 4, EP03_FISH_FROM + 2);
    const push = ease(frame, EP03_FISH_FROM, EP03_FISH_TO);
    const back = ease(frame, EP03_FISH_TO + 2, EP03_FISH_TO + 8);
    const r = Math.max(0, reach - back);
    return {
      ...base,
      view: 'side',
      facing: 1,
      face: r > 0.2 ? 'smug' : 'neutral',
      lean: 3 + r * 6,
      pawRaise: r > 0.05 ? 'right' : 'none',
      pawAngle: lerp(-62, -40, push),
      pawReach: lerp(1.0, 1.8, r * (0.6 + 0.4 * push)),
    };
  }
  if (inLine('O1', frame, 2)) return { ...base, face: 'smug' };
  return base;
}

// ---------------------------------------------------------------------------------------------
// State prop untuk set.tsx
// ---------------------------------------------------------------------------------------------

/**
 * Ngengat (R-9): keluar dari dompet terbuka di dada Utoh (sisi kamera b6-wallet, di DEPAN kartu Utoh x≈−13.57),
 * naik & mendekat ke kamera melintasi tengah frame (lebih dekat = tampak lebih besar), lalu terbang ke bohlam.
 */
const MOTH_PATH: { f: number; p: Vec3 }[] = [
  { f: 0, p: [-13.7, 0.76, 16.83] }, // mulut dompet
  { f: 10, p: [-13.86, 0.9, 16.76] }, // naik keluar dompet
  { f: 20, p: [-14.05, 1.02, 16.72] }, // tengah frame, dekat kamera
  { f: 28, p: [-14.02, 1.08, 16.86] }, // melintas ke kanan tengah
  { f: 40, p: [-13.45, 1.86, 17.57] }, // bohlam
];

export function mothPosAt(frame: number): Vec3 | null {
  if (frame < EP03_MOTH_FROM || frame >= EP03_MOTH_TO) return null;
  const k = ((frame - EP03_MOTH_FROM) / (EP03_MOTH_TO - EP03_MOTH_FROM)) * 40;
  let i = 0;
  while (i < MOTH_PATH.length - 2 && k >= MOTH_PATH[i + 1].f) i++;
  const a = MOTH_PATH[i];
  const b = MOTH_PATH[i + 1];
  const t = clamp((k - a.f) / (b.f - a.f), 0, 1);
  // Catmull-Rom antar titik supaya jalur melengkung tanpa patahan.
  const p0 = MOTH_PATH[Math.max(0, i - 1)].p;
  const p3 = MOTH_PATH[Math.min(MOTH_PATH.length - 1, i + 2)].p;
  const cr = (j: 0 | 1 | 2) => {
    const v0 = p0[j], v1 = a.p[j], v2 = b.p[j], v3 = p3[j];
    return 0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t * t + (-v0 + 3 * v1 - 3 * v2 + v3) * t * t * t);
  };
  const flutter = Math.min(1, k / 6);
  return [cr(0), cr(1) + Math.sin(frame * 0.9) * 0.025 * flutter, cr(2) + Math.sin(frame * 0.55) * 0.03 * flutter];
}

export function setStateAt(frame: number): SetState {
  const moth = mothPosAt(frame);
  return {
    frame,
    bon: bonLinesAt(frame, EP03_BON_FRAMES),
    bowlVisible: frame >= EP03_BOWL_FRAME,
    esTehVisible: frame >= EP03_ESTEH_FRAME,
    plates: EP03_PLATE_FRAMES.filter((f) => frame >= f).length,
    platesFrom: EP03_PLATE_FRAMES,
    fish: frame < EP03_FISH_FROM ? 0 : Math.min(1, (frame - EP03_FISH_FROM) / (EP03_FISH_TO - EP03_FISH_FROM)),
    moth: moth ? { pos: moth, flap: frame * 1.7 } : null,
  };
}
