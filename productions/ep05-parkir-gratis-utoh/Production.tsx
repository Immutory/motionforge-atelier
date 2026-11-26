import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CatBillboard,
  PostStack,
  Stage,
  kickOffset,
  sampleCamera,
  shotAt,
  type CamPose,
  type Vec3,
  type Word,
} from '../../engine';
import { ACTORS, BELANG_HEIGHT, actorPositionAt, belangPoseAt, belangPositionAt, poseFor, setStateAt } from './cast';
import { LOOK, PRACTICALS, lightFor, postFor } from './look';
import { SetPieces } from './set';
import { CAMS, DOF, DOF_TARGET, FPS, KICKS, SHOTS } from './shots';
import { EP05_LOOP_CUT_FRAME, PREVIEW_VOICE, VOICE_LINES, WORDS } from './words';

/** Milik agent post-compositor: komposisi EP05, subtitle putih polos (label-above, zona 1485-1690), ZERO 2D HUD. */

const CameraRig: React.FC<{ pose: CamPose; shake: { dx: number; dy: number; droll: number } }> = ({ pose, shake }) => {
  const cam = useThree().camera as PerspectiveCamera;
  cam.position.set(pose.pos[0] + shake.dx, pose.pos[1] + shake.dy, pose.pos[2]);
  cam.fov = pose.fov;
  cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.rotateZ(((pose.roll + shake.droll) * Math.PI) / 180);
  cam.updateProjectionMatrix();
  return null;
};

export function viewAxisFocus(camPos: Vec3, camLook: Vec3, target: Vec3): number {
  const f = [camLook[0] - camPos[0], camLook[1] - camPos[1], camLook[2] - camPos[2]];
  const fl = Math.hypot(f[0], f[1], f[2]) || 1;
  const d = [target[0] - camPos[0], target[1] - camPos[1], target[2] - camPos[2]];
  return Math.max(0.25, (d[0] * f[0] + d[1] * f[1] + d[2] * f[2]) / fl);
}

export const SUB_CHUNK = { maxWords: 3, maxChars: 22, gapFrames: 6, holdFrames: 8, minFrames: 10, holdGapFrames: 45 } as const;
export const SUB_ZONE_PX = { top: 1485, bottom: 1690 } as const;
export const SUB_LINE_HEIGHT = { label: 1.2, text: 1.08 } as const;
export const SUB_STACK = 'label-above' as const;

export type SubLayout = { top: number; labelPx: number; textPx: number; gapPx: number; dx: number };
export const SUB_LAYOUT_DEFAULT: SubLayout = { top: 1495, labelPx: 28, textPx: 62, gapPx: 6, dx: 0 };

export const SUB_LAYOUT_BY_SHOT: Record<string, SubLayout> = {
  'b8-belang-cuek': { top: 1565, labelPx: 26, textPx: 56, gapPx: 4, dx: 0 },
};

export const subLayoutFor = (shotId: string): SubLayout => SUB_LAYOUT_BY_SHOT[shotId] ?? SUB_LAYOUT_DEFAULT;
export const subBlockHeight = (l: SubLayout): number => l.labelPx * SUB_LINE_HEIGHT.label + l.gapPx + l.textPx * SUB_LINE_HEIGHT.text;

export type SubToken = { text: string };
export type SubChunk = { speaker: string; line: string; tokens: SubToken[]; from: number; to: number };
type SubLine = { id: string; speaker: string; start: number; end: number };

const lineIdOf = (w: Word, lines: readonly SubLine[]) =>
  lines.find((x) => x.speaker === w.speaker && w.start >= x.start - 0.05 && w.start <= x.end + 0.05)?.id ?? `?${w.speaker}@${w.start}`;

export function buildSubtitleChunks(
  words: readonly Word[],
  fps: number,
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
  for (let i = 0; i < chunks.length; i++) {
    const cur = chunks[i];
    const nxt = chunks[i + 1];
    if (nxt) cur.to = Math.min(cur.to, nxt.from);
    for (const sc of shotCuts) {
      if (sc > cur.from + 4 && sc < cur.to) cur.to = sc;
    }
    if (cur.to > EP05_LOOP_CUT_FRAME) cur.to = EP05_LOOP_CUT_FRAME;
  }
  return chunks.filter((c) => c.to > c.from);
}

export const EP05_SUBS: SubChunk[] = buildSubtitleChunks(
  WORDS,
  FPS,
  VOICE_LINES,
  SHOTS.map((s) => s.from),
);

export const subtitleAt = (chunks: readonly SubChunk[], frame: number): SubChunk | null =>
  chunks.find((c) => frame >= c.from && frame < c.to) ?? null;

const SPEAKER_LABEL: Record<string, string> = {
  bangUtoh: 'BANG UTOH',
  ebot: 'EBOT',
  bangUdin: 'BANG UDIN',
  raka: 'RAKA',
  pakBudi: 'PAK BUDI (RT 04)',
  belang: 'BELANG',
};

const PracticalLights: React.FC = () => (
  <group name="EP05_Practicals">
    {PRACTICALS.map((p) => (
      <pointLight key={p.name} position={p.position} color={p.color} intensity={p.intensity} distance={p.distance} decay={p.decay} />
    ))}
  </group>
);

export const Ep05ParkirGratisUtohProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame);
  const shot = shotAt(SHOTS, frame);
  const light = lightFor(shot.light);
  const post = postFor(DOF[shot.id] ?? 0, viewAxisFocus(pose.pos, pose.look, DOF_TARGET[shot.id] ?? pose.look));
  const setState = setStateAt(frame);
  const belangPos = belangPositionAt(frame, pose.pos);
  const belangPose = belangPoseAt(frame, pose.pos);

  const s = height / 1920;
  const sub = frame >= EP05_LOOP_CUT_FRAME ? null : subtitleAt(EP05_SUBS, frame);
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
            cat="belang"
            position={belangPos}
            faceTo={pose.pos}
            pose={belangPose}
            height={BELANG_HEIGHT}
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
          {SPEAKER_LABEL[sub.speaker] && (
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
              {SPEAKER_LABEL[sub.speaker]}
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
                <span>{tk.text}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
