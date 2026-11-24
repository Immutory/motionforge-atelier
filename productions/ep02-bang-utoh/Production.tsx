import React, { useEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CatBillboard,
  NOINK,
  PostStack,
  Stage,
  kickOffset,
  sampleCamera,
  shotAt,
  useTwoToneMaterial,
  type CamPose,
  type Vec3,
  type Word,
} from '../../engine';
import {
  ACTORS,
  EP02_B5_SPRINT_START,
  EP02_REPLAY_FROM,
  EP02_REPLAY_TO,
  EP02_OYEN_STEP1_FRAME,
  EP02_TASKBAR_ALARM_FRAME,
  actorPositionAt,
  actorVisibleAt,
  coffeeCountAt,
  ep02TaskbarClockAt,
  laptopScreenAt,
  oyenPoseAt,
  oyenPositionAt,
  oyenReplayPoseAt,
  poseFor,
} from './cast';
import {
  EP02_PLAK_FRAME,
  LOOK,
  bulbSwingAt,
  lightAt,
  postFor,
  practicalsAt,
  projectorScreenBrightness,
  setLightIdFor,
  type Practical,
} from './look';
import {
  CoffeeSteam,
  EP02_SPOTS,
  PROJECTOR_TEXT,
  SetPieces,
  firstFrameAtLeast,
  locationAt,
  type Ep02Location,
} from './set';
import { CAMS, DOF, DOF_TARGET, FOREGROUND, FPS, KICKS, SHOTS } from './shots';
import { EP02_LOOP_CUT_FRAME, PREVIEW_VOICE, VOICE_LINES, WORDS } from './words';

const CameraRig: React.FC<{ pose: CamPose; shake: { dx: number; dy: number; droll: number } }> = ({ pose, shake }) => {
  const cam = useThree().camera as PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

/**
 * Jarak fokus sepanjang sumbu pandang kamera (`references/reports/depth.md`):
 * proyeksi vektor `(target - camPos)` pada arah pandang ternormalisasi `normalize(camLook - camPos)`.
 */
export function viewAxisFocus(camPos: Vec3, camLook: Vec3, target: Vec3): number {
  const fx = camLook[0] - camPos[0];
  const fy = camLook[1] - camPos[1];
  const fz = camLook[2] - camPos[2];
  const fl = Math.hypot(fx, fy, fz) || 1;
  const dx = target[0] - camPos[0];
  const dy = target[1] - camPos[1];
  const dz = target[2] - camPos[2];
  return Math.max(0.25, (dx * fx + dy * fy + dz * fz) / fl);
}

/**
 * Pengali CoC sisi dekat untuk shot OTS ber-foreground (`FOREGROUND` di shots.ts). Dengan DOF 0,6
 * (cInf 8,4 px @1080x1920) foreground di 0,35–0,5x jarak fokus mendapat 16,8–24 px (batas uMaxCoC),
 * sesuai depth.md §5. Shot lain memakai default engine 1,2.
 */
export const EP02_FG_NEAR_SCALE = 2.0;
/** Batas jari-jari CoC engine (px @1080x1920), sama dengan `uMaxCoC` di PostStack. */
export const LENS_MAX_COC_1080 = 24;

/** Jari-jari CoC sisi dekat (px @1080x1920) untuk objek di jarak `d` saat fokus di `focus`. */
export function nearCocPx(dof: number, focus: number, d: number, nearScale: number): number {
  const c = dof * 14 * (1 - focus / Math.max(d, 1e-3));
  return Math.min(LENS_MAX_COC_1080, Math.abs(c < 0 ? c * nearScale : c));
}

/** 6 lampu praktis EP02 urutan tetap (4 point + 2 spot) dari `look.ts` agar shader tidak kompilasi ulang. */
const PracticalLights: React.FC<{ list: Practical[] }> = ({ list }) => {
  const spotRefs = useRef<(THREE.SpotLight | null)[]>([]);
  const targetRefs = useRef<(THREE.Object3D | null)[]>([]);

  useEffect(() => {
    list.forEach((p, idx) => {
      if (p.kind !== 'spot') return;
      const light = spotRefs.current[idx];
      const tgt = targetRefs.current[idx];
      if (light && tgt && p.target) {
        tgt.position.set(p.target[0], p.target[1], p.target[2]);
        light.target = tgt;
        tgt.updateMatrixWorld();
      }
    });
  }, [list]);

  return (
    <group name="EP02_PracticalLights">
      {list.map((p, idx) =>
        p.kind === 'point' ? (
          <pointLight
            key={p.id}
            position={p.position}
            color={p.color}
            intensity={p.intensity}
            distance={p.distance}
            decay={p.decay}
          />
        ) : (
          <React.Fragment key={p.id}>
            <object3D
              ref={(el) => {
                targetRefs.current[idx] = el;
              }}
              position={p.target ?? [0, 1, 0]}
            />
            <spotLight
              ref={(el) => {
                spotRefs.current[idx] = el;
              }}
              position={p.position}
              color={p.color}
              intensity={p.intensity}
              distance={p.distance}
              angle={p.angle ?? 0.6}
              penumbra={p.penumbra ?? 0.5}
              decay={p.decay}
            />
          </React.Fragment>
        ),
      )}
    </group>
  );
};

export type LaptopRenderState = {
  mode: 'err47' | 'err48' | 'ok' | 'alarm0658' | 'replaySelect' | 'replayDelete' | 'replayType' | 'replayDone';
  clock: ReturnType<typeof ep02TaskbarClockAt>;
  pulse: number; // 0..1 denyut lampu error
  typedChars: number; // 0..16 jumlah karakter progresif pada replayType
};

/**
 * Kanvas layar laptop 3D diegetik beresolusi tinggi (ZERO kotak HUD 2D!):
 * - Taskbar OS dengan jam diegetik `06:45` (B1–B4) -> `06:58` + notifikasi alarm (akhir B4)
 * - Highlight baris error merah berdenyut (`ERROR 47`, `48 +1!`), hijau `✓ 0 ERROR`
 * - Animasi progresif per frame pada Replay Sepia (`CTRL+A` -> `DELETE` -> ketik `mmmmmmmeeeeee` -> `✓ 0 ERROR`)
 */
function makeLaptopScreenTex(st: LaptopRenderState): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 640;
  const H = 400;
  const TB = 46; // tinggi taskbar OS bawah
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;

  if (st.mode === 'err47' || st.mode === 'err48') {
    const count = st.mode === 'err47' ? '47' : '48';
    g.fillStyle = '#140c16';
    g.fillRect(0, 0, W, H - TB);

    // Header bar merah berdenyut
    const redR = Math.round(220 + 35 * st.pulse);
    g.fillStyle = `rgb(${redR}, 46, 62)`;
    g.fillRect(0, 0, W, 68);
    g.fillStyle = '#ffffff';
    g.font = '900 38px "Segoe UI", sans-serif';
    g.fillText(`ERROR ${count} BARIS`, 24, 48);

    // Gutter & baris kode editor realistis dengan highlight merah error
    g.fillStyle = '#1e1624';
    g.fillRect(0, 68, 52, H - TB - 68);
    const widths = [230, 310, 275, 190, 340, 220];
    for (let i = 0; i < 6; i++) {
      const y = 88 + i * 40;
      const isErr = i === 1 || i === 3 || i === 4;
      if (isErr) {
        g.fillStyle = `rgba(239, 68, 68, ${(0.18 + 0.14 * st.pulse).toFixed(2)})`;
        g.fillRect(52, y - 8, W - 52, 30);
      }
      g.fillStyle = '#64748b';
      g.font = '700 20px monospace';
      g.fillText(String(i + 12), 16, y + 12);
      g.fillStyle = isErr ? '#fca5a5' : '#94a3b8';
      g.fillRect(68, y, widths[i], 13);
      if (isErr) {
        g.fillStyle = '#ff4d5e';
        g.fillRect(68, y + 16, widths[i] * 0.72, 4);
      }
    }

    // Angka raksasa mudah dibaca di macro insert 3D
    g.fillStyle = '#ff4d5e';
    g.font = '900 124px "Segoe UI", sans-serif';
    g.fillText(count, 442, 316);
    if (st.mode === 'err48') {
      g.fillStyle = '#fde047';
      g.font = '900 44px "Segoe UI", sans-serif';
      g.fillText('+1!', 468, 178);
    }
  } else if (st.mode === 'ok' || st.mode === 'alarm0658' || st.mode === 'replayDone') {
    g.fillStyle = '#082014';
    g.fillRect(0, 0, W, H - TB);
    // Denyut cahaya hijau monitor lembut 30fps agar layar ✓ 0 ERROR hidup alami (nol freeze saat kamera diam mantap)
    const okPulse = st.mode === 'ok' ? st.pulse : 0.5;
    g.fillStyle = `rgb(${Math.round(24 + 24 * okPulse)}, ${Math.round(182 + 38 * okPulse)}, ${Math.round(84 + 24 * okPulse)})`;
    g.fillRect(0, 0, W, 68);
    g.fillStyle = '#041f0e';
    g.font = '900 36px "Segoe UI", sans-serif';
    g.fillText('BUILD SUCCESS  ·  tugas_final.py', 24, 47);

    g.fillStyle = `rgb(${Math.round(58 + 34 * okPulse)}, ${Math.round(224 + 31 * okPulse)}, ${Math.round(126 + 32 * okPulse)})`;
    g.font = '900 104px "Segoe UI", sans-serif';
    g.fillText('✓ 0 ERROR', 54, 224);

    g.fillStyle = '#bbf7d0';
    g.font = '800 30px monospace';
    g.fillText(st.mode === 'replayDone' ? '0 BARIS KODE!' : 'Siap Demo Lab FIK', 130, 286);

    // Notifikasi alarm diegetik berdenyut live di tengah layar OS laptop saat taskbar meloncat 06:58!
    if (st.mode === 'alarm0658') {
      const aRed = Math.round(196 + 59 * st.pulse);
      const aGreen = Math.round(24 + 28 * st.pulse);
      g.fillStyle = `rgb(${aRed}, ${aGreen}, 36)`;
      g.fillRect(56, 152, 528, 174);
      g.strokeStyle = `rgb(254, ${Math.round(205 + 45 * st.pulse)}, ${Math.round(45 + 95 * st.pulse)})`;
      g.lineWidth = 6 + Math.round(3 * st.pulse);
      g.strokeRect(56, 152, 528, 174);
      g.fillStyle = '#fde047';
      g.font = '900 34px "Segoe UI", sans-serif';
      g.fillText(`ALARM   ${st.clock}`, 84, 200);
      g.fillStyle = '#ffffff';
      g.font = '900 44px "Segoe UI", sans-serif';
      g.fillText('DEMO 2 MENIT LAGI!', 84, 256);
      g.fillStyle = '#fecaca';
      g.font = '700 26px monospace';
      g.fillText('Lab Komputer FIK · 07:00', 84, 300);
    }
  } else if (st.mode === 'replaySelect') {
    g.fillStyle = '#111827';
    g.fillRect(0, 0, W, H - TB);
    g.fillStyle = '#1d4ed8';
    g.fillRect(24, 88, 592, 232);
    g.fillStyle = '#93c5fd';
    g.font = '900 34px monospace';
    g.fillText('CTRL + A   (SELECT ALL)', 26, 56);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      g.fillRect(46, 114 + i * 38, 280 + ((i * 97) % 240), 14);
    }
  } else if (st.mode === 'replayDelete') {
    g.fillStyle = '#0f172a';
    g.fillRect(0, 0, W, H - TB);
    g.fillStyle = '#dc2626';
    g.fillRect(0, 0, W, 62);
    g.fillStyle = '#ffffff';
    g.font = '900 34px monospace';
    g.fillText('DELETE  —  47 BARIS TERHAPUS!', 24, 44);
    g.fillStyle = '#94a3b8';
    g.font = '700 46px monospace';
    g.fillText('1  |', 36, 198);
  } else {
    // replayType: ketikan progresif karakter per karakter (`mmmmmmmeeeeee`)
    g.fillStyle = '#0f172a';
    g.fillRect(0, 0, W, H - TB);
    g.fillStyle = '#f59e0b';
    g.fillRect(0, 0, W, 62);
    g.fillStyle = '#14121f';
    g.font = '900 32px monospace';
    g.fillText('tugas_final.py   (1 baris)', 24, 43);
    const typed = PROJECTOR_TEXT.slice(0, Math.max(1, st.typedChars));
    g.fillStyle = '#64748b';
    g.font = '700 42px monospace';
    g.fillText('1', 26, 206);
    g.fillStyle = '#f8fafc';
    g.font = '900 42px monospace';
    g.fillText(`${typed}_`, 68, 206, W - 90);
  }

  // Taskbar OS diegetik di bagian bawah layar 3D (menampilkan jam live 06:45 / 06:58!)
  g.fillStyle = '#0b1120';
  g.fillRect(0, H - TB, W, TB);
  g.fillStyle = '#1e293b';
  g.fillRect(0, H - TB, W, 3);
  g.fillStyle = '#38bdf8';
  g.fillRect(18, H - TB + 11, 24, 24);
  g.fillStyle = '#cbd5e1';
  g.font = '700 22px monospace';
  g.fillText('tugas_final.py', 56, H - 15);

  // Jam diegetik kanan taskbar (menyala merah-kuning saat 06:58!)
  const isAlarm = st.clock === ep02TaskbarClockAt(EP02_TASKBAR_ALARM_FRAME);
  if (isAlarm) {
    g.fillStyle = '#dc2626';
    g.fillRect(W - 154, H - TB + 5, 142, TB - 10);
  }
  g.fillStyle = isAlarm ? '#fde047' : '#f8fafc';
  g.font = '900 30px monospace';
  g.fillText(st.clock, W - 134, H - 12);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Prop 3D meja Warkop: Laptop diegetik dengan taskbar OS + deret 4 gelas kopi progress bar begadang. */
const WarkopTableProps: React.FC<{ frame: number; screenState: LaptopRenderState }> = ({ frame, screenState }) => {
  const [lx, ly, lz] = EP02_SPOTS.warkop.laptop;
  const bodyMat = useTwoToneMaterial({ color: '#273046' }, []);
  const keyMat = useTwoToneMaterial({ color: '#141926' }, []);
  const glassMat = useTwoToneMaterial({ color: '#dbeeff' }, []);
  const coffeeMat = useTwoToneMaterial({ color: '#3b2012' }, []);
  const stateKey = `${screenState.mode}|${screenState.clock}|${screenState.pulse.toFixed(2)}|${screenState.typedChars}`;
  const tex = useMemo(() => makeLaptopScreenTex(screenState), [stateKey]);
  useEffect(() => () => tex?.dispose(), [tex]);

  const cups = coffeeCountAt(frame);
  // 4 gelas kopi berjejer rapi di sisi KIRI laptop (x <= -1,83), bebas total dari Si Oyen (x = -1,26)!
  const cupPositions: Vec3[] = [
    [-2.14, ly, 0.48],
    [-2.04, ly, 0.5],
    [-1.94, ly, 0.52],
    EP02_CUP4_POS,
  ];

  return (
    <group name="EP02_WarkopTableProps">
      <group position={[lx, ly, lz]}>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow material={bodyMat}>
          <boxGeometry args={[0.32, 0.022, 0.22]} />
        </mesh>
        <mesh position={[0, 0.025, 0.01]} material={keyMat}>
          <boxGeometry args={[0.27, 0.006, 0.14]} />
        </mesh>
        <group position={[0, 0.02, -0.105]} rotation={[-0.22, 0, 0]}>
          <mesh position={[0, 0.105, 0]} castShadow material={bodyMat}>
            <boxGeometry args={[0.32, 0.21, 0.016]} />
          </mesh>
          {tex && (
            <mesh
              position={[0, 0.105, 0.011]}
              ref={(m) => {
                if (m) m.layers.set(NOINK);
              }}
            >
              <planeGeometry args={[0.295, 0.185]} />
              <meshBasicMaterial map={tex} />
            </mesh>
          )}
        </group>
      </group>

      {cupPositions.slice(0, cups).map(([cx, cy, cz], idx) => {
        const full = idx === 3;
        return (
          <group key={idx} position={[cx, cy, cz]}>
            <mesh position={[0, 0.045, 0]} castShadow material={glassMat}>
              <cylinderGeometry args={[0.028, 0.023, 0.09, 12]} />
            </mesh>
            <mesh position={[0, full ? 0.04 : 0.012, 0]} material={coffeeMat}>
              <cylinderGeometry args={[0.025, 0.021, full ? 0.068 : 0.016, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------------------
// Subtitle 9:16 bersih (satu-satunya layer teks 2D). Logika murni, dites di `tests/ep02-production.test.ts`.
// ---------------------------------------------------------------------------------------------------------

export const SUB_ACCENT = {
  count: '#ff6b7a', // "47" / "48"
  ok: '#4dff8f', // "nol error" / "Nol error"
  gold: '#facc15', // "Nilai A", "Meong."
} as const;

/** Batas potongan frasa: maks 3 kata / 22 karakter, putus di tanda baca atau jeda > 6 frame. */
export const SUB_CHUNK = { maxWords: 3, maxChars: 22, gapFrames: 6, leadFrames: 0, holdFrames: 8, minFrames: 12, holdGapFrames: 45 } as const;
/** Pop-in mikro 3 frame. */
export const SUB_POP_FRAMES = 3;
/** Baseline atas blok subtitle pada kanvas 1920 (zona aman UI Shorts/Reels/TikTok). */
export const SUB_TOP_PX = 1485;

export type SubToken = { text: string; color?: string };
/** `line` = id baris `VOICE_LINES` (hold jeda hanya di dalam baris yang sama). */
export type SubChunk = { speaker: string; line: string; tokens: SubToken[]; from: number; to: number };
export type SubLine = { id: string; speaker: string; start: number; end: number };

/** Id baris suara milik kata (speaker sama, awal kata di dalam jendela baris). */
export function lineIdOf(w: Word, lines: readonly SubLine[]): string {
  const l = lines.find((x) => x.speaker === w.speaker && w.start >= x.start - 0.05 && w.start <= x.end + 0.05);
  return l ? l.id : `?${w.speaker}@${w.start}`;
}

const normWord = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Warna aksen per kata (indeks sejajar `words`). Pasangan "nol error" & "Nilai A" diwarnai berdua. */
export function accentColors(words: readonly Word[]): (string | undefined)[] {
  const out: (string | undefined)[] = words.map(() => undefined);
  words.forEach((w, i) => {
    const n = normWord(w.text);
    const nx = words[i + 1] && words[i + 1].speaker === w.speaker ? normWord(words[i + 1].text) : '';
    if (n === '47' || n === '48') out[i] = SUB_ACCENT.count;
    else if (n === 'meong') out[i] = SUB_ACCENT.gold;
    else if (n === 'nol' && nx === 'error') out[i] = out[i + 1] = SUB_ACCENT.ok;
    else if (n === 'nilai' && nx === 'a') out[i] = out[i + 1] = SUB_ACCENT.gold;
  });
  return out;
}

/** Kelompokkan kata yang diucapkan menjadi potongan frasa pendek yang terbaca dalam 0,2 dtk. */
export function buildSubtitleChunks(
  words: readonly Word[],
  fps: number = FPS,
  /** Hard cut (mis. masuk Replay, loop cut): tidak ada subtitle yang melewatinya. */
  cuts: readonly number[] = [],
  /** Baris suara; tanpa ini setiap pembicara dianggap satu baris per kata berurutan. */
  lines: readonly SubLine[] = [],
  /** Cut shot: frasa TERAKHIR sebuah baris tidak ditahan melewati cut pertama sesudah kata terakhirnya. */
  shotCuts: readonly number[] = [],
): SubChunk[] {
  const colors = accentColors(words);
  const lineOf = words.map((w) => (lines.length ? lineIdOf(w, lines) : w.speaker ?? ''));
  const groups: { speaker: string; line: string; idx: number[] }[] = [];
  words.forEach((w, i) => {
    const g = groups[groups.length - 1];
    const prevI = g ? g.idx[g.idx.length - 1] : -1;
    const prev = prevI >= 0 ? words[prevI] : undefined;
    // Pasangan aksen tidak boleh terbelah.
    const pairLock = prev !== undefined && colors[prevI] !== undefined && colors[prevI] === colors[i] && colors[i] !== SUB_ACCENT.count;
    const chars = g ? g.idx.reduce((n, k) => n + words[k].text.length + 1, 0) + w.text.length : 0;
    const split =
      !g ||
      !prev ||
      prev.speaker !== w.speaker ||
      lineOf[prevI] !== lineOf[i] ||
      (!pairLock &&
        (/[.,!?…]$/.test(prev.text) ||
          Math.round(w.start * fps) - Math.round(prev.end * fps) > SUB_CHUNK.gapFrames ||
          g.idx.length >= SUB_CHUNK.maxWords ||
          chars > SUB_CHUNK.maxChars));
    if (split) groups.push({ speaker: w.speaker ?? '', line: lineOf[i], idx: [i] });
    else g.idx.push(i);
  });

  const chunks: SubChunk[] = groups.map((g) => {
    const first = words[g.idx[0]];
    const last = words[g.idx[g.idx.length - 1]];
    const from = Math.round(first.start * fps) - SUB_CHUNK.leadFrames;
    const lastEnd = Math.round(last.end * fps) + SUB_CHUNK.holdFrames;
    const to = Math.min(Math.max(lastEnd, from + SUB_CHUNK.minFrames), lastEnd);
    return { speaker: g.speaker, line: g.line, tokens: g.idx.map((k) => ({ text: words[k].text, color: colors[k] })), from, to };
  });
  // Tidak pernah tumpang tindih: potongan berikutnya selalu memotong yang sebelumnya. Jeda napas/hirupan
  // di DALAM satu baris (id VOICE_LINES sama, <= holdGapFrames) menahan frasa terakhir agar tidak berkedip;
  // di akhir baris subtitle hilang paling lambat holdFrames setelah kata terakhir.
  for (let i = 0; i + 1 < chunks.length; i++) {
    const next = chunks[i + 1];
    const inLinePause = next.line === chunks[i].line && next.from - chunks[i].to <= SUB_CHUNK.holdGapFrames;
    chunks[i].to = inLinePause ? next.from : Math.min(chunks[i].to, next.from);
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const lineFinal = i + 1 === chunks.length || chunks[i + 1].line !== c.line;
    const spokenEnd = Math.round(words[groups[i].idx[groups[i].idx.length - 1]].end * fps);
    if (lineFinal) for (const cut of shotCuts) if (cut >= spokenEnd && c.to > cut) c.to = cut;
    for (const cut of cuts) if (c.from < cut && c.to > cut) c.to = cut;
  }
  return chunks;
}

/** Potongan aktif pada `frame` (eksklusif di `to`). */
export function subtitleAt(chunks: readonly SubChunk[], frame: number): SubChunk | null {
  return chunks.find((c) => frame >= c.from && frame < c.to) ?? null;
}

const POP_SCALE = [0.86, 0.97, 1.04] as const;
const POP_OPACITY = [0.55, 1, 1] as const;

/** Pop-in mikro 3 frame: skala 0,86 -> 0,97 -> 1,04 -> 1 (terbaca penuh sejak frame ke-2). */
export function subtitlePop(frame: number, from: number): { opacity: number; scale: number } {
  const t = frame - from;
  if (t < 0) return { opacity: 0, scale: POP_SCALE[0] };
  if (t >= SUB_POP_FRAMES) return { opacity: 1, scale: 1 };
  return { opacity: POP_OPACITY[t], scale: POP_SCALE[t] };
}

/** Cut aksi keras: PLAK (B3), masuk Replay, loop cut. */
export const EP02_SUB_CUTS: readonly number[] = [EP02_PLAK_FRAME, EP02_REPLAY_FROM, EP02_LOOP_CUT_FRAME];
export const EP02_SUBS = buildSubtitleChunks(
  WORDS,
  FPS,
  EP02_SUB_CUTS,
  VOICE_LINES,
  SHOTS.map((x) => x.from),
);

export const SPEAKER_META: Record<string, { label: string; color: string }> = {
  bangUtoh: { label: 'BANG UTOH', color: '#38bdf8' },
  buSiti: { label: 'BU SITI', color: '#fb923c' },
  rara: { label: 'MBAK RARA', color: '#c4b5fd' },
  oyen: { label: 'SI OYEN', color: '#facc15' },
};

/** Mesh tiang jalan, umbul-umbul biru, lampu lalu lintas, & mobil parkir yang menghalangi kamera tracking B5 di KampungSet. */
const KAMPUNG_CAM_CLEAR_HIDE = [
  'KG_StreetPole_',
  'KG_StreetArm_',
  'KG_StreetHood_',
  'KG_StreetBulb_',
  'KG_StreetFit_',
  'KG_P5_Cable_',
  'KG_P5_Umbul_',
  'KG_P6_TrafficLight_',
  'KG_P5_Car_CityCar1_',
];

/**
 * Mesh bawaan warkop.glb yang dibersihkan di shot interior meja kiri (v6.0):
 * - WK_TableCup1*: gelas bawaan yang bertabrakan dengan prop diegetik laptop
 * - WK_TissueBox: kotak biru kecil yang menempel di belakang telinga Utoh (f0770)
 * - WK_Kerupuk*: toples kerupuk konter yang berimpit dengan badan Bu Siti
 * - WK_Sign*: papan atap eksterior (x∈[-1,7..+1,7]) yang terpotong setengah ("WARK/NGODIN") pada stage meja kiri
 *   (di B5 KampungSet, papan `WARKOP 24 JAM` tetap tampil 100% utuh!)
 */
const WARKOP_CAM_CLEAR_HIDE = [
  'WK_TableCup1',
  'WK_TableCup1_L',
  'WK_TissueBox',
  'WK_KerupukJar',
  'WK_KerupukLid',
  'WK_Kerupuk_',
  'WK_SignBoxFace',
  'WK_SignBoxFrame',
  'WK_SignMain',
  'WK_SignSub',
];

/** Sepia murni untuk Replay B7 (filter CSS pada kanvas 3D, bukan kotak overlay). */
export const SEPIA_FILTER = 'sepia(0.92) saturate(1.12) contrast(1.04)';

/**
 * Cross-dissolve hangat sinematik (gaya referensi Row 3 Col 2–3) masuk & keluar Replay Sepia:
 * - Masuk (10f: EP02_REPLAY_FROM - 5 .. + 5) & Keluar (8f: EP02_REPLAY_TO - 4 .. + 4).
 */
export function replayDissolveOpacityAt(frame: number): number {
  const dIn = Math.abs(frame - EP02_REPLAY_FROM);
  if (dIn <= 5) return Math.max(0, 1 - dIn / 5) * 0.58;
  const dOut = Math.abs(frame - EP02_REPLAY_TO);
  if (dOut <= 4) return Math.max(0, 1 - dOut / 4) * 0.52;
  return 0;
}

/** 4-frame white flash (atelier-shot-plan) saat perpindahan realitas masuk & keluar Replay Sepia. */
export function flashOpacityAt(frame: number): number {
  const fIn = frame - EP02_REPLAY_FROM;
  if (fIn >= 0 && fIn < 4) return 1 - fIn / 4;
  const fOut = frame - EP02_REPLAY_TO;
  if (fOut >= 0 && fOut < 4) return 1 - fOut / 4;
  return 0;
}

/**
 * Jam replay sepia = jam cerita saat kejadian aslinya di Warkop (Oyen menginjak keyboard di B4),
 * diturunkan dari `ep02TaskbarClockAt` (satu sumber kebenaran dengan taskbar & HP Utoh).
 */
export const EP02_REPLAY_CLOCK = ep02TaskbarClockAt(EP02_OYEN_STEP1_FRAME);

/** State layar laptop diegetik per frame (pure; jam selalu dari `ep02TaskbarClockAt`). */
export function ep02LaptopScreenStateAt(rf: number): LaptopRenderState {
  const pulse = 0.5 + 0.5 * Math.sin(rf * 0.28);
  if (rf >= EP02_REPLAY_FROM && rf < EP02_REPLAY_TO) {
    const clock = EP02_REPLAY_CLOCK;
    const dt = rf - EP02_REPLAY_FROM;
    if (dt < 18) return { mode: 'replaySelect', clock, pulse: 0, typedChars: 0 };
    if (dt < 24) return { mode: 'replayDelete', clock, pulse: 0, typedChars: 0 };
    if (dt < 46) {
      const chars = Math.min(16, Math.max(1, Math.floor(((dt - 24) / 22) * 16) + 1));
      return { mode: 'replayType', clock, pulse: 0, typedChars: chars };
    }
    return { mode: 'replayDone', clock, pulse: 0, typedChars: 16 };
  }
  const clock = ep02TaskbarClockAt(rf);
  if (rf >= EP02_TASKBAR_ALARM_FRAME && rf < EP02_B5_SPRINT_START) {
    return { mode: 'alarm0658', clock, pulse, typedChars: 0 };
  }
  const base = laptopScreenAt(rf);
  const mode = base === 'wipe' ? 'replayType' : base;
  return { mode, clock, pulse, typedChars: 0 };
}

/** Gelas ke-4 Bu Siti diletakkan di sisi kiri laptop (pemicu uap kopi; bebas 100% dari Si Oyen di kanan laptop!). */
const EP02_CUP4_FRAME = firstFrameAtLeast(coffeeCountAt, 4);
export const EP02_CUP4_POS: Vec3 = [-1.83, EP02_SPOTS.warkop.laptop[1], 0.54];

export const Ep02BangUtohProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Seamless hard-cut loop: setelah EP02_LOOP_CUT_FRAME langsung potong bersih ke f0 (ERROR 47 macro) tanpa kartu 2D!
  const isLoopTail = frame >= EP02_LOOP_CUT_FRAME;
  const rf = isLoopTail ? frame - EP02_LOOP_CUT_FRAME : frame;

  const isReplay = rf >= EP02_REPLAY_FROM && rf < EP02_REPLAY_TO;
  const pose: CamPose = sampleCamera(CAMS, rf);
  const shake = kickOffset(KICKS, rf);
  const shot = shotAt(SHOTS, rf);

  // B5 (crane-down ke dolly) sudah dipanggang per frame di CAMS oleh shots.ts: tidak ada override di sini.

  const baseScreen = laptopScreenAt(rf);
  const screenState: LaptopRenderState = useMemo(() => ep02LaptopScreenStateAt(rf), [rf]);

  const activeLoc: Ep02Location = isReplay ? 'warkop' : locationAt(rf);
  const light = lightAt(shot.light, rf, { screen: baseScreen, plakFrame: EP02_PLAK_FRAME });

  // Jarak fokus DOF dihitung sepanjang sumbu pandang (`depth.md`) ke target mata/layar 3D sejati!
  const focusTarget = DOF_TARGET[shot.id] ?? pose.look;
  const focusDist = viewAxisFocus(pose.pos, pose.look, focusTarget);
  const post = {
    ...postFor(shot.light, DOF[shot.id] ?? 0, focusDist),
    ...(FOREGROUND[shot.id] ? { nearScale: EP02_FG_NEAR_SCALE } : {}),
  };
  const practicals = practicalsAt(rf, { screen: baseScreen, plakFrame: EP02_PLAK_FRAME });

  // Ayunan fisik 3 bohlam gantung Warkop pasca-PLAK (tersambung langsung ke WarkopSet -> GlbSet!)
  const bulbSwings: readonly [number, number, number] | undefined =
    activeLoc === 'warkop' && !isReplay
      ? [
          bulbSwingAt(rf, 0, EP02_PLAK_FRAME),
          bulbSwingAt(rf, 1, EP02_PLAK_FRAME),
          bulbSwingAt(rf, 2, EP02_PLAK_FRAME),
        ]
      : undefined;

  const s = height / 1920;
  const sub = isLoopTail ? null : subtitleAt(EP02_SUBS, frame);
  const pop = sub ? subtitlePop(frame, sub.from) : { opacity: 0, scale: 1 };
  const flashOp = isLoopTail ? 0 : flashOpacityAt(rf);
  const dissolveOp = isLoopTail ? 0 : replayDissolveOpacityAt(rf);
  // Hanya sembunyikan Utoh pada macro lensa super dekat (z <= 1,50) agar B1 pull-out & B4 dolly-in 100% organik!
  const isMacroLaptop = shot.id === 'b3-macro-48' || shot.id === 'b4-taskbar-0658';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {PREVIEW_VOICE ? <Audio src={staticFile(PREVIEW_VOICE)} /> : null}
      {/* Wrapper tetap terpasang (kanvas tidak remount); hanya filter sepia yang berganti saat Replay B7. */}
      <AbsoluteFill style={{ filter: isReplay ? SEPIA_FILTER : undefined }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} ground={LOOK.ground} showGround={false} camPos={pose.pos} camLook={pose.look}>
          <SetPieces
            lightId={setLightIdFor(shot.light)}
            location={activeLoc}
            projectorBrightness={projectorScreenBrightness(rf) * (1 + 0.014 * Math.sin(rf * 1.35))}
            hideNames={
              activeLoc === 'kampung'
                ? KAMPUNG_CAM_CLEAR_HIDE
                : activeLoc === 'warkop'
                  ? WARKOP_CAM_CLEAR_HIDE
                  : undefined
            }
            bulbSwings={bulbSwings}
            frame={rf}
          />
          <PracticalLights list={practicals} />

          {activeLoc === 'warkop' && <WarkopTableProps frame={rf} screenState={screenState} />}
          {activeLoc === 'warkop' && <CoffeeSteam position={EP02_CUP4_POS} frame={rf} placedFrame={EP02_CUP4_FRAME} />}

          {ACTORS.filter((a) => !isReplay && !(isMacroLaptop && a.id === 'bangUtoh') && actorVisibleAt(a.id, rf)).map(
            (a) => (
              <ActorBillboard
                key={a.id}
                actor={a.preset}
                overrides={a.overrides}
                position={actorPositionAt(a.id, rf)}
                faceTo={pose.pos}
                pose={poseFor(a.id, rf)}
                height={a.height}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            ),
          )}

          {/* Sembunyikan Oyen hanya pada macro layar murni `b4-taskbar-0658` agar alarm 06:58 100% utuh */}
          {shot.id !== 'b4-taskbar-0658' && (
            <CatBillboard
              cat="oyen"
              position={
                isReplay
                  ? [-1.26, EP02_SPOTS.warkop.laptop[1], 0.48]
                  : oyenPositionAt(rf)
              }
              faceTo={pose.pos}
              pose={isReplay ? oyenReplayPoseAt(rf) : oyenPoseAt(rf)}
              height={0.54}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>
      </AbsoluteFill>

      {/* Cross-dissolve hangat sinematik (10f masuk / 8f keluar Replay Sepia) + 4f white flash eye-line */}
      {dissolveOp > 0 && (
        <AbsoluteFill
          style={{
            background: `rgba(245, 230, 200, ${dissolveOp.toFixed(2)})`,
            pointerEvents: 'none',
          }}
        />
      )}
      {flashOp > 0 && (
        <AbsoluteFill
          style={{
            background: `rgba(255, 255, 255, ${flashOp.toFixed(2)})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* SUBTITLE + LABEL PEMBICARA (satu-satunya teks 2D; tanpa kotak/banner latar, hanya outline tipis) */}
      {sub && (
        <div
          style={{
            position: 'absolute',
            left: 60 * s,
            right: 60 * s,
            top: SUB_TOP_PX * s,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6 * s,
            pointerEvents: 'none',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            opacity: pop.opacity,
            transform: `scale(${pop.scale})`,
            transformOrigin: '50% 40%',
          }}
        >
          {SPEAKER_META[sub.speaker] && (
            <div
              style={{
                color: SPEAKER_META[sub.speaker].color,
                fontSize: 30 * s,
                fontWeight: 900,
                letterSpacing: 2 * s,
                WebkitTextStroke: `${4 * s}px #14121f`,
                paintOrder: 'stroke fill',
                textShadow: `0 ${3 * s}px ${4 * s}px rgba(0,0,0,0.55)`,
              }}
            >
              {SPEAKER_META[sub.speaker].label}
            </div>
          )}
          <div
            style={{
              fontSize: 68 * s,
              fontWeight: 900,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.08,
              WebkitTextStroke: `${6 * s}px #14121f`,
              paintOrder: 'stroke fill',
              textShadow: `0 ${5 * s}px ${6 * s}px rgba(0,0,0,0.6)`,
            }}
          >
            {sub.tokens.map((tk, k) => (
              <React.Fragment key={k}>
                {k > 0 ? ' ' : null}
                <span style={tk.color ? { color: tk.color } : undefined}>{tk.text}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
