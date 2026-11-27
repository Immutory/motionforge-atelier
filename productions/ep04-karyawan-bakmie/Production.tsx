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
import { EP04_LOOP_CUT_FRAME, PREVIEW_VOICE, VOICE_LINES, WORDS } from './words';

/** Milik agent post-compositor: komposisi EP04, subtitle bertumpuk (label-above, zona 1485-1690), ZERO 2D HUD. */

export const SUB_CHUNK = { maxWords: 3, maxChars: 22, gapFrames: 6, holdFrames: 8, minFrames: 10, holdGapFrames: 45 } as const;
export const SUB_POP_FRAMES = 3;
export const SUB_ZONE_PX = { top: 1485, bottom: 1690 } as const;
export const SUB_LINE_HEIGHT = { label: 1.2, text: 1.08 } as const;
export const SUB_STACK = 'label-above' as const;

export type SubLayout = { top: number; labelPx: number; textPx: number; gapPx: number; dx: number };
export const SUB_LAYOUT_DEFAULT: SubLayout = { top: 1495, labelPx: 28, textPx: 62, gapPx: 6, dx: 0 };

export const SUB_LAYOUT_BY_SHOT: Record<string, SubLayout> = {
  'b2-oyen-reveal': { top: 1565, labelPx: 26, textPx: 56, gapPx: 4, dx: 0 },
  'b4-oyen-flat': { top: 1565, labelPx: 26, textPx: 56, gapPx: 4, dx: 0 },
  'b7-oyen-puas': { top: 1565, labelPx: 26, textPx: 56, gapPx: 4, dx: 0 },
};

export const subLayoutFor = (shotId: string): SubLayout => SUB_LAYOUT_BY_SHOT[shotId] ?? SUB_LAYOUT_DEFAULT;
export const subBlockHeight = (l: SubLayout): number => l.labelPx * SUB_LINE_HEIGHT.label + l.gapPx + l.textPx * SUB_LINE_HEIGHT.text;

export type SubToken = { text: string; color?: string };
export type SubChunk = { speaker: string; line: string; tokens: SubToken[]; from: number; to: number };
type SubLine = { id: string; speaker: string; start: number; end: number };

const lineIdOf = (w: Word, lines: readonly SubLine[]) =>
  lines.find((x) => x.speaker === w.speaker && w.start >= x.start - 0.05 && w.start <= x.end + 0.05)?.id ?? `?${w.speaker}@${w.start}`;

export function buildSubtitleChunks(
  words: readonly Word[],
  fps: number,
  cuts: readonly number[],
  lines: readonly SubLine[],
  shotCuts: readonly number[],
): SubChunk[] {
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
    return {
      speaker: g.speaker,
      line: g.line,
      tokens: g.idx.map((k) => ({ text: words[k].text })),
      from,
      to: Math.max(lastEnd, from + SUB_CHUNK.minFrames),
    };
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

export const EP04_SUBS = buildSubtitleChunks(WORDS, FPS, [EP04_LOOP_CUT_FRAME], VOICE_LINES, SHOTS.map((s) => s.from));

export const SPEAKER_META: Record<string, { label: string; color: string }> = {
  bangUtoh: { label: 'BANG UTOH', color: '#38bdf8' },
  tio: { label: 'BANG TIO', color: '#f87171' },
  pakUjang: { label: 'PAK UJANG', color: '#86efac' },
  mbakYuni: { label: 'MBAK YUNI', color: '#f9a8d4' },
  oyen: { label: 'MANDOR OYEN', color: '#facc15' },
};

const PracticalLights: React.FC = () => (
  <group name="EP04_Practicals">
    {PRACTICALS.map((p) => (
      <pointLight key={p.name} position={p.position} color={p.color} intensity={p.intensity} distance={p.distance} decay={p.decay} />
    ))}
  </group>
);

export const Ep04KaryawanBakmieProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame);
  const shot = shotAt(SHOTS, frame);
  const light = lightFor(shot.light);
  const post = postFor(DOF[shot.id] ?? 0, viewAxisFocus(pose.pos, pose.look, DOF_TARGET[shot.id] ?? pose.look));
  const setState = setStateAt(frame);
  const oyenPos = oyenPositionAt(frame, pose.pos);
  const oyenPose = oyenPoseAt(frame, pose.pos);

  const s = height / 1920;
  const sub = frame >= EP04_LOOP_CUT_FRAME ? null : subtitleAt(EP04_SUBS, frame);
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
          {ACTORS.map((a) => {
            const p = actorPositionAt(a.id, frame, pose.pos);
            const ap = poseFor(a.id, frame, pose.pos);
            if (!p || !ap) return null;
            return (
              <ActorBillboard
                key={a.id}
                actor={a.preset}
                overrides={a.overrides}
                position={p}
                faceTo={pose.pos}
                pose={ap}
                height={a.height}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            );
          })}
          <CatBillboard
            cat="oyen"
            position={oyenPos}
            faceTo={pose.pos}
            pose={oyenPose}
            height={OYEN_HEIGHT}
            castShadow={light.card.castShadow}
            blobColor={light.card.blob}
          />
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
          }}
        >
          {SPEAKER_META[sub.speaker] && (
            <div
              style={{
                color: '#ffffff',
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
