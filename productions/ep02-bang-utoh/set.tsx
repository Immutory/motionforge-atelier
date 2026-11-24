import React, { useEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import {
  KAMPUNG_SPOTS,
  KAMPUS_SPOTS,
  KampungSet,
  KampusSet,
  NOINK,
  WARKOP_SPOTS,
  WarkopSet,
  useTwoToneMaterial,
  type Vec3,
} from '../../engine';
import { BEATS, EP02_FRAMES, lineById, nonverbalOf, type Beat } from './words';

/**
 * Milik agent set-designer. EP02 "Konsultan Oyen" (Director's Cut Polish v4.0):
 * - `warkop`  : `<WarkopSet lightId="noon" bulbSwings={...} />` (B1–B4) — 3 bohlam gantung berayun fisik pasca-PLAK
 * - `kampung` : `<KampungSet mode="siang" />` (B5) — jalur transit kurva mulus tanpa sudut patah 90° (`sampleTransitCurve`)
 * - `lab`     : `<KampusSet lightId="noon" />` + `<LabProjectorScreen />` (B6–B7)
 *
 * PENTING: Pasang `showGround={false}` pada `<Stage>` karena set GLB sudah punya lantai sendiri.
 */

export type Ep02Location = 'warkop' | 'kampung' | 'lab';

/** Beat (1-based) per lokasi (7 Beat Sebab-Akibat Ketat v4.0). */
export const EP02_LOCATION_BEATS: ReadonlyArray<{ location: Ep02Location; beats: readonly number[] }> = [
  { location: 'warkop', beats: [1, 2, 3, 4] },
  { location: 'kampung', beats: [5] },
  { location: 'lab', beats: [6, 7] },
];

function beatWindow(nums: readonly number[]): { from: number; to: number } {
  const bs = nums.map((n) => {
    const b: Beat | undefined = BEATS.find((x) => x.beat === n);
    if (!b) throw new Error(`EP02 set: beat B${n} tidak ada di BEATS`);
    return b;
  });
  return { from: Math.min(...bs.map((b) => b.from)), to: Math.max(...bs.map((b) => b.to)) };
}

/** Rentang frame per lokasi (30 fps, `to` eksklusif), diturunkan dari `BEATS`. */
export const EP02_LOCATIONS: ReadonlyArray<{ location: Ep02Location; from: number; to: number }> =
  EP02_LOCATION_BEATS.map(({ location, beats }, i, all) => {
    const w = beatWindow(beats);
    return {
      location,
      from: i === 0 ? 0 : w.from,
      to: i === all.length - 1 ? Math.max(w.to, EP02_FRAMES) : w.to,
    };
  });

export function locationAt(frame: number): Ep02Location {
  for (const r of EP02_LOCATIONS) if (frame >= r.from && frame < r.to) return r.location;
  return frame < 0 ? 'warkop' : 'lab';
}

/**
 * Titik kontrol rute lari B5 di kampung.glb: paving bebas depan Warkop (1,27 m di depan bangku z <= 0,98!)
 * -> tepi jalan -> plaza Gedung FIK. Disampel sebagai kurva ber-fillet kuadratik (`sampleTransitCurve`) tanpa patah 90°!
 */
export const EP02_B5_START: Vec3 = [-0.85, 0, 2.25];
export const EP02_TRANSIT_PATH: Vec3[] = [
  EP02_B5_START,
  [-0.85, 0, 4.45], // keluar ke tepi jalan depan Warkop
  [12.6, 0, 4.45], // lari lurus menuju Gedung FIK
  KAMPUNG_SPOTS.kampusPlaza, // [12.6, 0, 3.2] tiba di plaza FIK
];

export const EP02_TRANSIT_BACK: Vec3[] = [
  KAMPUNG_SPOTS.kampusPlaza,
  [12.6, 0, 2.2],
];

type CurveLutPoint = { pos: Vec3; s: number };

function buildFilletCurve(pts: Vec3[], radii: number[], arcSteps = 18): CurveLutPoint[] {
  const out: Vec3[] = [pts[0]];
  const quad = (a: Vec3, b: Vec3, c: Vec3, t: number): Vec3 => {
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
      u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
      u * u * a[2] + 2 * u * t * b[2] + t * t * c[2],
    ];
  };
  const stepToward = (from: Vec3, to: Vec3, d: number): Vec3 => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const k = Math.min(d, len * 0.82) / len;
    return [from[0] + dx * k, from[1] + dy * k, from[2] + dz * k];
  };

  for (let i = 1; i < pts.length - 1; i++) {
    const r = radii[i - 1] ?? 1.0;
    const pIn = stepToward(pts[i], pts[i - 1], r);
    const pOut = stepToward(pts[i], pts[i + 1], r);
    out.push(pIn);
    for (let k = 1; k <= arcSteps; k++) {
      out.push(quad(pIn, pts[i], pOut, k / arcSteps));
    }
  }
  out.push(pts[pts.length - 1]);

  const lut: CurveLutPoint[] = [{ pos: out[0], s: 0 }];
  let acc = 0;
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    const seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
    if (seg < 1e-6) continue;
    acc += seg;
    lut.push({ pos: cur, s: acc });
  }
  return lut;
}

const TRANSIT_CURVE_LUT = buildFilletCurve(EP02_TRANSIT_PATH, [1.45, 0.95], 20);
export const EP02_TRANSIT_LENGTH = TRANSIT_CURVE_LUT[TRANSIT_CURVE_LUT.length - 1].s;

/**
 * Sampel lintasan kurva mulus B5 dengan parameterisasi panjang busur (`u` dalam 0..1).
 * Tanpa patah 90°; mengembalikan posisi, jarak tempuh aktual (meter), arah X, dan vektor tangen ternormalisasi.
 */
export function sampleTransitCurve(u: number): {
  pos: Vec3;
  dist: number;
  totalLen: number;
  dirX: number;
  tangent: Vec3;
} {
  const clamped = Math.max(0, Math.min(1, u));
  const target = clamped * EP02_TRANSIT_LENGTH;
  const lut = TRANSIT_CURVE_LUT;

  for (let i = 0; i < lut.length - 1; i++) {
    const a = lut[i];
    const b = lut[i + 1];
    if (b.s >= target || i === lut.length - 2) {
      const span = Math.max(1e-6, b.s - a.s);
      const t = Math.max(0, Math.min(1, (target - a.s) / span));
      const pos: Vec3 = [
        a.pos[0] + (b.pos[0] - a.pos[0]) * t,
        a.pos[1] + (b.pos[1] - a.pos[1]) * t,
        a.pos[2] + (b.pos[2] - a.pos[2]) * t,
      ];
      const dx = b.pos[0] - a.pos[0];
      const dy = b.pos[1] - a.pos[1];
      const dz = b.pos[2] - a.pos[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      return {
        pos,
        dist: target,
        totalLen: EP02_TRANSIT_LENGTH,
        dirX: Math.abs(dx) < 1e-4 ? 1 : Math.sign(dx),
        tangent: [dx / len, dy / len, dz / len],
      };
    }
  }
  return { pos: lut[0].pos, dist: 0, totalLen: EP02_TRANSIT_LENGTH, dirX: 1, tangent: [1, 0, 0] };
}

/** Layar proyektor tarik di Lab FIK (Three.js). Kanvas menghadap +z (ke lorong/kamera). */
export const LAB_SCREEN = {
  center: [0, 1.9, -3.5] as Vec3,
  width: 2.0,
  height: 1.125,
  projectorLens: [0, 3.19, -0.26] as Vec3,
};

/** Jeda (frame) dari akhir baris R1 "Oke. Jalanin." sampai Utoh menekan Enter (4f angkat jari + 6f hold = 10f). */
export const EP02_PROJECTOR_ENTER_DELAY = 10;

/** Frame saat layar berganti dari putih kosong ke baris "mmmm": momen Enter KLAK setelah R1. */
export const EP02_PROJECTOR_RUN_FRAME = lineById('R1').endFrame + EP02_PROJECTOR_ENTER_DELAY;

export type ProjectorState = 'off' | 'blank' | 'text';

/** Spot pemeran per lokasi. Semua sudah diverifikasi raycast ke GLB terkait. */
export const EP02_SPOTS = {
  warkop: {
    utoh: WARKOP_SPOTS.leftTable,
    laptop: WARKOP_SPOTS.laptopTable,
    oyen: WARKOP_SPOTS.catTable,
    /**
     * Posisi kasir Bu Siti di balik konter (v6.1, temuan U-1). Telapak di atas panggung kasir y=0,40 m
     * (`EP02_SITI_COUNTER_RISER`) sehingga pinggang rig (px 638 -> y=1,03) 6 cm dan tangan `rest`/`hip`
     * (px 594-600 -> y=1,09-1,10) 12 cm di atas WK_CounterTop (y=0,97); garis potong konter jatuh di rig px ~676
     * (pinggul bawah), bukan lagi di pergelangan tangan (v6.0: px ~601-621 = tangan "tenggelam").
     * z=-2,25: kartu billboard penuh (setengah lebar 0,547 m) tetap >= 0,10 m di belakang tepi belakang konter
     * (z=-1,95) untuk semua kamera Warkop. x=-0,12: kepala bebas teks papan menu (teks berakhir x=-0,34).
     */
    buSiti: [-0.12, 0.4, -2.25] as Vec3,
  },
  kampung: {
    start: EP02_B5_START,
    overshoot: [20.4, 0, 4.45] as Vec3,
    stop: KAMPUNG_SPOTS.kampusPlaza,
  },
  lab: {
    utoh: KAMPUS_SPOTS.presenter,
    rara: KAMPUS_SPOTS.lecturer,
    /** 0,59 m kiri + 0,18 m depan sudut KP2_LectDesk (x >= 2,05, z <= -2,20): 0% clipping di segala sudut yaw! */
    raraAtDesk: [1.46, 0, -2.02] as Vec3,
    oyen: KAMPUS_SPOTS.catDesk,
    screen: LAB_SCREEN.center,
  },
} as const;

/**
 * Panggung kasir Bu Siti (Three.js, bukan bagian warkop.glb). Puncak platform = telapak `EP02_SPOTS.warkop.buSiti[1]`
 * (0,40 m), tapak 0,80 x 0,44 m berpusat di spot; anak tangga 0,20 m di sisi +x (arah lorong kasir). Seluruhnya di
 * z -2,47..-2,03: 8 cm di belakang WK_CounterTop (z >= -1,95) dan 27 cm di depan WK_BackWall_Low (z <= -2,74).
 */
export const EP02_SITI_COUNTER_RISER = (() => {
  const [x, y, z] = EP02_SPOTS.warkop.buSiti;
  const w = 0.8;
  const d = 0.44;
  const stepW = 0.3;
  const stepH = Math.round((y / 2) * 1000) / 1000;
  return {
    platform: { center: [x, y / 2, z] as Vec3, size: [w, y, d] as [number, number, number] },
    step: { center: [x + w / 2 + stepW / 2, stepH / 2, z] as Vec3, size: [stepW, stepH, d] as [number, number, number] },
  };
})();

export const PROJECTOR_TEXT = 'mmmmmmmmmmmeeeeeeeeeeeeeee';

/** Kursor terminal di ujung baris "mmmm": kedip lambat 15 frame nyala / 15 frame mati (0,5 dtk @30fps). */
export const PROJECTOR_CURSOR_ON = 15;
export const PROJECTOR_CURSOR_OFF = 15;

/**
 * true bila kursor `|` di layar proyektor menyala pada `frame`. Hanya setelah Enter KLAK
 * (`EP02_PROJECTOR_RUN_FRAME`), dimulai NYALA tepat di frame run, lalu siklus 15/15 terus
 * selama layar menampilkan hasil run (termasuk hening jangkrik dan sisa B6–B7 di lab).
 */
export function projectorCursorOnAt(frame: number, runFrame: number = EP02_PROJECTOR_RUN_FRAME): boolean {
  if (frame < runFrame) return false;
  const period = PROJECTOR_CURSOR_ON + PROJECTOR_CURSOR_OFF;
  return (frame - runFrame) % period < PROJECTOR_CURSOR_ON;
}

function makeScreenTexture(state: ProjectorState, text: string, cursorOn: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || state === 'off') return null;
  const W = 1600;
  const H = 900;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;

  g.fillStyle = '#fbfbf8';
  g.fillRect(0, 0, W, H);

  if (state === 'text') {
    // Bar judul editor diegetik di kain proyektor (kontras tajam: "0 errors" tapi kodenya cuma 1 baris mmmm!)
    g.fillStyle = '#eceef2';
    g.fillRect(18, 18, W - 36, 74);
    g.fillStyle = '#334155';
    g.font = '700 32px "JetBrains Mono", Consolas, monospace';
    g.textBaseline = 'middle';
    g.fillText('tugas_final.py   —   DEMO LAB FIK', 48, 55);
    g.fillStyle = '#15803d';
    g.font = '800 30px "JetBrains Mono", Consolas, monospace';
    g.fillText('✓ 0 ERRORS', W - 260, 55);

    // Gutter nomor baris
    g.fillStyle = '#f3f4f6';
    g.fillRect(18, 92, 118, H - 110);
    g.strokeStyle = '#e2e8f0';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(136, 92);
    g.lineTo(136, H - 18);
    g.stroke();

    // Satu nomor baris + satu baris teks mmmm, selebihnya hening kosong
    g.textBaseline = 'top';
    g.font = '700 66px "JetBrains Mono", Consolas, "Courier New", monospace';
    g.fillStyle = '#9aa0a8';
    g.fillText('1', 62, 146);
    g.fillStyle = '#1f2328';
    const maxTextW = W - 220;
    g.fillText(text, 168, 146, maxTextW);

    // Kursor terminal `|` tepat di ujung teks (lebar teks terukur, dijepit seperti fillText maxWidth).
    if (cursorOn) {
      const drawnW = Math.min(g.measureText(text).width, maxTextW);
      g.fillStyle = '#1f2328';
      g.fillRect(168 + drawnW + 8, 140, 7, 76);
    }

    // Garis footer status editor diegetik
    g.fillStyle = '#e2e8f0';
    g.fillRect(18, H - 72, W - 36, 54);
    g.fillStyle = '#475569';
    g.font = '600 26px "JetBrains Mono", Consolas, monospace';
    g.fillText('Ln 1, Col 27    |    1 line total    |    UTF-8', 48, H - 58);
  }

  // Bingkai hitam tipis khas kain layar proyektor.
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 18;
  g.strokeRect(9, 9, W - 18, H - 18);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Layar proyektor tarik untuk Lab FIK.
 */
export const LabProjectorScreen: React.FC<{
  state?: ProjectorState;
  text?: string;
  brightness?: number;
  /** Kursor `|` di ujung teks (lihat `projectorCursorOnAt`). Hanya tergambar pada state 'text'. */
  cursorOn?: boolean;
}> = ({ state = 'blank', text = PROJECTOR_TEXT, brightness = 1, cursorOn = false }) => {
  const [cx, cy, cz] = LAB_SCREEN.center;
  const { width: w, height: h } = LAB_SCREEN;
  const caseMat = useTwoToneMaterial({ color: '#e6e8eb' }, []);
  const bracketMat = useTwoToneMaterial({ color: '#5b6066' }, []);
  const clothMat = useTwoToneMaterial({ color: '#d8dadc' }, []);
  const cursor = state === 'text' && cursorOn;
  const tex = useMemo(() => makeScreenTexture(state, text, cursor), [state, text, cursor]);
  useEffect(() => () => tex?.dispose(), [tex]);
  const glow = useMemo(() => new THREE.Color(1, 1, 1).multiplyScalar(brightness), [brightness]);
  const top = cy + h / 2;

  return (
    <group name="EP02_LabProjectorScreen">
      <mesh position={[cx, top + 0.04, -3.51]} castShadow receiveShadow material={caseMat}>
        <boxGeometry args={[w + 0.16, 0.08, 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx + s * (w / 2 - 0.05), top + 0.04, -3.6075]} material={bracketMat}>
          <boxGeometry args={[0.05, 0.05, 0.075]} />
        </mesh>
      ))}
      <mesh position={[cx, cy - h / 2 - 0.01, cz]} castShadow material={bracketMat}>
        <boxGeometry args={[w + 0.04, 0.02, 0.025]} />
      </mesh>
      {state === 'off' || !tex ? (
        <mesh position={[cx, cy, cz]} receiveShadow material={clothMat}>
          <planeGeometry args={[w, h]} />
        </mesh>
      ) : (
        <mesh
          position={[cx, cy, cz]}
          ref={(m) => {
            if (m) m.layers.set(NOINK);
          }}
        >
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} color={glow} />
        </mesh>
      )}
    </group>
  );
};

export type SetPiecesProps = {
  lightId?: string;
  location?: Ep02Location;
  projector?: ProjectorState;
  projectorText?: string;
  projectorBrightness?: number;
  hideNames?: string[];
  /** Sudut ayun fisik 3 bohlam gantung Warkop (radian, dari `bulbSwingAt`). */
  bulbSwings?: readonly [number, number, number];
  /** Frame cerita (mis. `rf` pada loop tail). Default `useCurrentFrame()`. */
  frame?: number;
};

/** Set EP02 per lokasi. Hanya satu GLB dipasang per frame. */
export const SetPieces: React.FC<SetPiecesProps> = ({
  lightId = 'noon',
  location,
  projector,
  projectorText,
  projectorBrightness,
  hideNames,
  bulbSwings,
  frame: frameProp,
}) => {
  const currentFrame = useCurrentFrame();
  const frame = frameProp ?? currentFrame;
  const loc = location ?? locationAt(frame);
  const riserMat = useTwoToneMaterial({ color: '#6b472a' }, []);

  if (loc === 'kampung') {
    return <KampungSet mode="siang" hideNames={hideNames} />;
  }
  if (loc === 'lab') {
    const screen = projector ?? (frame >= EP02_PROJECTOR_RUN_FRAME ? 'text' : 'blank');
    return (
      <group>
        <KampusSet lightId={lightId} hideNames={hideNames} />
        <LabProjectorScreen
          state={screen}
          text={projectorText}
          brightness={projectorBrightness}
          cursorOn={projectorCursorOnAt(frame)}
        />
      </group>
    );
  }
  return (
    <group>
      <WarkopSet lightId={lightId} hideNames={hideNames} bulbSwings={bulbSwings} />
      {/* Panggung kasir 3D di balik konter tempat Bu Siti berpijak (tersembunyi di balik WK_CounterBody y<=0,90) */}
      <mesh name="EP02_SitiCounterRiser" position={EP02_SITI_COUNTER_RISER.platform.center} receiveShadow castShadow material={riserMat}>
        <boxGeometry args={EP02_SITI_COUNTER_RISER.platform.size} />
      </mesh>
      <mesh name="EP02_SitiCounterStep" position={EP02_SITI_COUNTER_RISER.step.center} receiveShadow castShadow material={riserMat}>
        <boxGeometry args={EP02_SITI_COUNTER_RISER.step.size} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------------------
// Uap kopi 3D (B2): pita uap tipis di atas gelas kopi ke-4 Bu Siti
// ---------------------------------------------------------------------------------------------------------

/** Frame pertama saat `countAt(f) >= n` (mis. `firstFrameAtLeast(coffeeCountAt, 4)` = gelas ke-4 diletakkan). */
export function firstFrameAtLeast(countAt: (frame: number) => number, n: number, limit: number = EP02_FRAMES): number {
  for (let f = 0; f < limit; f++) if (countAt(f) >= n) return f;
  return limit;
}

/** Konstanta uap: naik 18f setelah gelas diletakkan ke level dasar, puncak 1,0 di hirupan S1, lalu luruh τ 50f. */
export const COFFEE_STEAM = {
  riseFrames: 18,
  base: 0.55,
  /** Dorongan mulai 12f sebelum hirupan dan penuh 6f setelah hirupan dimulai. */
  boostLead: 12,
  boostRamp: 18,
  decayTau: 50,
} as const;

const smooth01 = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/**
 * Intensitas uap kopi 0..1 per frame. 0 sebelum gelas ke-4 diletakkan (`placedFrame`); naik ke 0,55;
 * memuncak 1,0 di dalam jendela hirupan panjang Bu Siti (`nonverbalOf('S1', 1)`); setelah hirupan
 * selesai meluruh eksponensial (kopi mulai dingin) sampai benar-benar 0.
 */
export function coffeeSteamAt(
  frame: number,
  placedFrame: number,
  sniff: { startFrame: number; endFrame: number } = nonverbalOf('S1', 1),
): number {
  if (frame < placedFrame) return 0;
  const S = COFFEE_STEAM;
  const appear = smooth01((frame - placedFrame) / S.riseFrames);
  if (frame <= sniff.endFrame) {
    const boost = smooth01((frame - (sniff.startFrame - S.boostLead)) / S.boostRamp);
    return appear * (S.base + (1 - S.base) * boost);
  }
  const v = appear * Math.exp(-(frame - sniff.endFrame) / S.decayTau);
  return v < 0.01 ? 0 : v;
}

const STEAM_TMP_A = new THREE.Vector3();
const STEAM_TMP_B = new THREE.Vector3();
const STEAM_TMP_C = new THREE.Vector3();

const STEAM_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Tiga helai uap prosedural: kurva sinus yang melebar & memudar ke atas, bergulung ikut waktu. */
const STEAM_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uLean;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float y = vUv.y;
  float a = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float cx = 0.5 + (fk - 1.0) * 0.07 * (1.0 - y) + uLean * y * y
      + sin(y * 6.2 - uTime * 1.6 + fk * 2.1) * 0.13 * y
      + sin(y * 13.0 - uTime * 2.4 + fk * 1.3) * 0.035 * y;
    float w = 0.06 + 0.11 * y;
    float d = (vUv.x - cx) / w;
    float band = 0.6 + 0.4 * sin(y * 9.0 - uTime * 3.1 + fk * 1.7);
    a += exp(-d * d) * band * (fk == 1.0 ? 1.0 : 0.75);
  }
  // Kabut lembut di sekitar helai agar pita terbaca sebagai uap (bukan garis), tetap tipis.
  float hx = (vUv.x - 0.5 - uLean * y * y) / (0.16 + 0.14 * y);
  a = a * 1.35 + 0.24 * exp(-hx * hx);
  float topCut = mix(0.45, 1.0, uIntensity);
  float fade = smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(topCut * 0.6, topCut, y));
  float alpha = clamp(a, 0.0, 1.0) * fade * uIntensity * 0.85;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export type CoffeeSteamProps = {
  /** Posisi dasar gelas (y = permukaan meja), mis. `[-1.35, EP02_SPOTS.warkop.laptop[1], 0.62]`. */
  position: Vec3;
  /** Frame cerita (`rf`). */
  frame: number;
  /** Frame gelas ke-4 diletakkan: `firstFrameAtLeast(coffeeCountAt, 4)`. */
  placedFrame: number;
  /** Tinggi gelas (bibir gelas = position.y + cupHeight). Default 0,09 m seperti mesh gelas Warkop. */
  cupHeight?: number;
  /**
   * Condong helai ke kanan layar di puncak pita (fraksi lebar pita, 0..0,35). Default 0,26: uap mengalir ke
   * sisi Bu Siti (kanan layar di b2-stage-siti), makin condong saat hirupan, dan keluar dari bayangan kepala Utoh.
   */
  lean?: number;
  /**
   * Geser pita ke arah kamera di sepanjang sinar pandang (meter, diskalakan agar ukuran & posisi layar tetap
   * menempel di bibir gelas). Mencegah billboard Oyen di samping gelas menutupi uap. Default 0,16.
   */
  depthBias?: number;
};

/**
 * Uap kopi 3D tipis di atas gelas. Dua pita silang 0,28 × 0,38 m (0° & 90°) yang juga diputar yaw menghadap kamera
 * agar terbaca dari sudut mana pun di 9:16. Layer `NOINK` (tidak digaris InkPass), tanpa bayangan,
 * `depthWrite` mati, warna di bawah ambang bloom.
 */
export const CoffeeSteam: React.FC<CoffeeSteamProps> = ({
  position,
  frame,
  placedFrame,
  cupHeight = 0.09,
  lean = 0.26,
  depthBias = 0.16,
}) => {
  const intensity = coffeeSteamAt(frame, placedFrame);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STEAM_VERT,
        fragmentShader: STEAM_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uLean: { value: 0 },
          // Putih sedikit dingin (linear ≈ 0,87–0,91) agar kontras dengan kayu hangat, tetap < ambang bloom 1,0.
          uColor: { value: new THREE.Color('#f0f3f6') },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  mat.uniforms.uTime.value = frame / 30;
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uLean.value = lean * (0.6 + 0.4 * intensity);

  if (intensity <= 0) return null;
  const W = 0.28;
  const H = 0.38;
  const [x, y, z] = position;

  return (
    <group name="EP02_CoffeeSteam" position={[x, y + cupHeight - 0.006, z]}>
      {[0, Math.PI / 2].map((ry) => (
        <mesh
          key={ry}
          position={[0, H / 2, 0]}
          rotation={[0, ry, 0]}
          material={mat}
          renderOrder={10}
          ref={(m) => {
            if (!m) return;
            m.layers.set(NOINK);
            m.castShadow = false;
            m.receiveShadow = false;
            // Yaw-billboard: pita pertama selalu menghadap kamera, pita kedua tegak lurus (volume).
            m.onBeforeRender = (_r, _s, cam) => {
              const wp = STEAM_TMP_A;
              const cp = STEAM_TMP_B.setFromMatrixPosition(cam.matrixWorld);
              if (m.parent) wp.setFromMatrixPosition(m.parent.matrixWorld);
              const yaw = Math.atan2(cp.x - wp.x, cp.z - wp.z);
              m.rotation.y = yaw + ry;
              // Dorong ke arah kamera di sinar pandang bibir gelas, lalu skala k = (d - o) / d agar proyeksinya tetap.
              const dir = STEAM_TMP_C.subVectors(cp, wp);
              const d = dir.length();
              const o = Math.min(depthBias, d * 0.3);
              const k = d > 1e-4 ? (d - o) / d : 1;
              dir.multiplyScalar(d > 1e-4 ? o / d : 0);
              m.position.set(dir.x, dir.y + (H / 2) * k, dir.z);
              m.scale.setScalar(k);
              m.updateMatrixWorld(); // renderer menghitung modelViewMatrix sesudah hook ini
            };
          }}
        >
          <planeGeometry args={[W, H]} />
        </mesh>
      ))}
    </group>
  );
};
