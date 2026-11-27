import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CameraRig,
  CatBillboard,
  PostStack,
  Stage,
  kickOffset,
  sampleCamera,
  shotAt,
  viewAxisFocus,
  type Word,
} from '../../engine';
import { ACTORS, OYEN_HEIGHT, actorPositionAt, oyenPoseAt, oyenPositionAt, poseFor, setStateAt } from './cast';
import { LOOK, PRACTICALS, lightFor, postFor } from './look';
import { SetPieces } from './set';
import { CAMS, DOF, DOF_TARGET, FPS, KICKS, SHOTS } from './shots';
import { EP03_LOOP_CUT_FRAME, PREVIEW_VOICE, VOICE_LINES, WORDS } from './words';

/** Milik agent post-compositor: wiring komposisi, subtitle, dan loop. */

export { viewAxisFocus } from '../../engine';

/**
 * Loop kontinu (R-6): TIDAK ada lagi pemetaan ulang frame. Ekor f1785–1799 merender frame aslinya
 * (b6-side-slump berlanjut sampai f1799), lalu platform me-loop ke f0 yang memakai kamera & pose
 * slump yang sama. Dipertahankan sebagai identitas hanya agar import lama tetap terkompilasi.
 * @deprecated Identitas; jangan dipakai untuk logika baru.
 */
export const renderFrameOf = (frame: number): number => frame;

// ---------------------------------------------------------------------------------------------
// Subtitle 9:16 (satu-satunya teks 2D). Logika murni, dites di tests/ep03-production.test.ts.
// ---------------------------------------------------------------------------------------------

export const SUB_ACCENT = { money: '#facc15', zero: '#ff6b7a', cat: '#fdba74' } as const;
export const SUB_CHUNK = { maxWords: 3, maxChars: 22, gapFrames: 6, holdFrames: 8, minFrames: 12, holdGapFrames: 45 } as const;
export const SUB_POP_FRAMES = 3;
export const SUB_TOP_PX = 1485;

/**
 * Zona subtitle studio (kanvas 1920): NDC y [-0.76, -0.52] ≈ y 1485–1690. Di bawah 1690 = zona tombol UI platform.
 * Kamera terkunci, jadi blok subtitle digeser per shot (R-1) supaya tidak menutupi mulut/dagu yang sedang bicara.
 */
export const SUB_ZONE_PX = { top: 1485, bottom: 1690 } as const;
export const SUB_LINE_HEIGHT = { label: 1.2, text: 1.08 } as const;

export type SubLayout = {
  /** y atas blok (px kanvas 1920, dikali pxScale saat render). */
  top: number;
  labelPx: number;
  textPx: number;
  gapPx: number;
  /** Geser horizontal pusat blok dari tengah kanvas (px kanvas 1920). 0 = tengah. */
  dx: number;
};

/** Layout SELALU bertumpuk: label pembicara di atas, baris subtitle di bawah, rata tengah (revisi pengguna). */
export const SUB_STACK = 'label-above' as const;

export const SUB_LAYOUT_DEFAULT: SubLayout = { top: SUB_TOP_PX + 5, labelPx: 30, textPx: 68, gapPx: 6, dx: 0 };

/**
 * Posisi per `shot.id`, diukur dari still f205–315, 495–544, 707, 950–990, 1352–1436, 1614–1640:
 * - b2-rev-utoh: mulut Utoh y≈1460–1540 → blok bertumpuk di bawah mulut (1580–1678).
 * - b2-rev-blank: hidung ≤1488, mulut y≈1560–1680 di x≈280–500 → blok kecil 1490–1573, digeser ke kanan
 *   (pusat x≈720) supaya tidak di atas mulut. Kompromi: blok di pipi Utoh (kepala memenuhi frame).
 * - b3-side-rant / b4-side-protest / b5-rev-utoh: dagu Oyen y≈1420–1520 → blok turun ke ≥1535.
 * - b6-oyen-meong: mulut Oyen ≤1520, dagu ≈1560–1600 → blok 1598–1687 (menyentuh dada/dagu, bukan mulut).
 */
export const SUB_LAYOUT_BY_SHOT: Record<string, SubLayout> = {
  'b2-rev-utoh': { top: 1580, labelPx: 26, textPx: 58, gapPx: 4, dx: 0 },
  'b2-rev-blank': { top: 1490, labelPx: 22, textPx: 50, gapPx: 3, dx: 180 },
  'b3-side-rant': { top: 1545, labelPx: 28, textPx: 62, gapPx: 5, dx: 0 },
  'b4-side-protest': { top: 1550, labelPx: 28, textPx: 62, gapPx: 5, dx: 0 },
  'b5-rev-utoh': { top: 1535, labelPx: 28, textPx: 62, gapPx: 5, dx: 0 },
  'b6-oyen-meong': { top: 1598, labelPx: 24, textPx: 52, gapPx: 4, dx: 0 },
};

export const subLayoutFor = (shotId: string): SubLayout => SUB_LAYOUT_BY_SHOT[shotId] ?? SUB_LAYOUT_DEFAULT;

/** Tinggi blok subtitle (px kanvas 1920, tanpa pop-scale). Satu baris teks dijamin oleh `whiteSpace: nowrap`. */
export function subBlockHeight(l: SubLayout): number {
  const label = l.labelPx * SUB_LINE_HEIGHT.label;
  const text = l.textPx * SUB_LINE_HEIGHT.text;
  return label + l.gapPx + text;
}

export type SubToken = { text: string; color?: string };
export type SubChunk = { speaker: string; line: string; tokens: SubToken[]; from: number; to: number };
type SubLine = { id: string; speaker: string; start: number; end: number };

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Aksen: "gratis" & nominal uang emas, "nol" merah, "kucing" oranye. */
export function accentColors(words: readonly Word[]): (string | undefined)[] {
  const out: (string | undefined)[] = words.map(() => undefined);
  words.forEach((w, i) => {
    const n = norm(w.text);
    if (n === 'gratis' || n === 'sembilan' || n === 'puluh' || n === 'ribu' || n === 'pangsit') out[i] = SUB_ACCENT.money;
    else if (n === 'nol') out[i] = SUB_ACCENT.zero;
    else if (n === 'kucing' || n === 'meong') out[i] = SUB_ACCENT.cat;
  });
  return out;
}

const lineIdOf = (w: Word, lines: readonly SubLine[]) =>
  lines.find((x) => x.speaker === w.speaker && w.start >= x.start - 0.05 && w.start <= x.end + 0.05)?.id ?? `?${w.speaker}@${w.start}`;

export function buildSubtitleChunks(words: readonly Word[], fps: number, cuts: readonly number[], lines: readonly SubLine[], shotCuts: readonly number[]): SubChunk[] {
  const colors = accentColors(words);
  const lineOf = words.map((w) => lineIdOf(w, lines));
  const groups: { speaker: string; line: string; idx: number[] }[] = [];
  words.forEach((w, i) => {
    const g = groups[groups.length - 1];
    const prevI = g ? g.idx[g.idx.length - 1] : -1;
    const prev = prevI >= 0 ? words[prevI] : undefined;
    const chars = g ? g.idx.reduce((n, k) => n + words[k].text.length + 1, 0) + w.text.length : 0;
    const split =
      !g ||
      !prev ||
      prev.speaker !== w.speaker ||
      lineOf[prevI] !== lineOf[i] ||
      /[.,!?…]$/.test(prev.text) ||
      Math.round(w.start * fps) - Math.round(prev.end * fps) > SUB_CHUNK.gapFrames ||
      g.idx.length >= SUB_CHUNK.maxWords ||
      chars > SUB_CHUNK.maxChars;
    if (split) groups.push({ speaker: w.speaker ?? '', line: lineOf[i], idx: [i] });
    else g.idx.push(i);
  });
  const chunks: SubChunk[] = groups.map((g) => {
    const first = words[g.idx[0]];
    const last = words[g.idx[g.idx.length - 1]];
    const from = Math.round(first.start * fps);
    const lastEnd = Math.round(last.end * fps) + SUB_CHUNK.holdFrames;
    return { speaker: g.speaker, line: g.line, tokens: g.idx.map((k) => ({ text: words[k].text, color: colors[k] })), from, to: Math.max(lastEnd, from + SUB_CHUNK.minFrames) };
  });
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

export const subtitleAt = (chunks: readonly SubChunk[], frame: number): SubChunk | null =>
  chunks.find((c) => frame >= c.from && frame < c.to) ?? null;

const POP_SCALE = [0.86, 0.97, 1.04] as const;
const POP_OPACITY = [0.55, 1, 1] as const;
export function subtitlePop(frame: number, from: number): { opacity: number; scale: number } {
  const t = frame - from;
  if (t < 0) return { opacity: 0, scale: POP_SCALE[0] };
  if (t >= SUB_POP_FRAMES) return { opacity: 1, scale: 1 };
  return { opacity: POP_OPACITY[t], scale: POP_SCALE[t] };
}

export const EP03_SUBS = buildSubtitleChunks(WORDS, FPS, [EP03_LOOP_CUT_FRAME], VOICE_LINES, SHOTS.map((s) => s.from));

export const SPEAKER_META: Record<string, { label: string; color: string }> = {
  bangUtoh: { label: 'BANG UTOH', color: '#38bdf8' },
  tio: { label: 'BANG TIO', color: '#f87171' },
  mbakYuni: { label: 'MBAK YUNI', color: '#f9a8d4' },
  oyen: { label: 'SI OYEN', color: '#facc15' },
};

// ---------------------------------------------------------------------------------------------

const PracticalLights: React.FC = () => (
  <group name="EP03_Practicals">
    {PRACTICALS.map((p) => (
      <pointLight key={p.name} position={p.position} color={p.color} intensity={p.intensity} distance={p.distance} decay={p.decay} />
    ))}
  </group>
);

export const Ep03TioBakmieProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rf = frame; // loop kontinu: tidak ada pemetaan ulang ekor (R-6)
  const pose = sampleCamera(CAMS, rf);
  const shake = kickOffset(KICKS, rf);
  const shot = shotAt(SHOTS, rf);
  const light = lightFor(shot.light);
  const post = postFor(DOF[shot.id] ?? 0, viewAxisFocus(pose.pos, pose.look, DOF_TARGET[shot.id] ?? pose.look));
  const setState = setStateAt(rf);
  const oyenPos = oyenPositionAt(rf, pose.pos);
  const oyenPose = oyenPoseAt(rf, pose.pos);

  const s = height / 1920;
  const sub = frame >= EP03_LOOP_CUT_FRAME ? null : subtitleAt(EP03_SUBS, frame);
  const pop = sub ? subtitlePop(frame, sub.from) : { opacity: 0, scale: 1 };
  const lay = subLayoutFor(shot.id);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {PREVIEW_VOICE ? <Audio src={staticFile(PREVIEW_VOICE)} /> : null}
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.08, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} ground={LOOK.ground} showGround={false} camPos={pose.pos} camLook={pose.look}>
          <SetPieces state={setState} />
          <PracticalLights />
          {ACTORS.map((a) => (
            <ActorBillboard
              key={a.id}
              actor={a.preset}
              overrides={a.overrides}
              position={actorPositionAt(a.id, rf, pose.pos)}
              faceTo={pose.pos}
              pose={poseFor(a.id, rf, pose.pos)}
              height={a.height}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          ))}
          {oyenPos && oyenPose && (
            <CatBillboard
              cat="oyen"
              position={oyenPos}
              faceTo={pose.pos}
              pose={oyenPose}
              height={OYEN_HEIGHT}
              castShadow={light.card.castShadow}
              blobColor={light.card.blob}
            />
          )}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {sub && (
        <div
          style={{
            position: 'absolute',
            left: (60 + 2 * lay.dx) * s,
            right: 60 * s,
            top: lay.top * s,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: lay.gapPx * s,
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
                fontSize: lay.labelPx * s,
                lineHeight: SUB_LINE_HEIGHT.label,
                whiteSpace: 'nowrap',
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
              fontSize: lay.textPx * s,
              fontWeight: 900,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: SUB_LINE_HEIGHT.text,
              whiteSpace: 'nowrap',
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
