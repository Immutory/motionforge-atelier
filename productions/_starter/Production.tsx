import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import {
  ActorBillboard,
  CameraRig,
  DrinkCup3D,
  PostStack,
  Stage,
  actorHandWorldPos,
  kickOffset,
  pxScale,
  sampleCamera,
  shotAt,
  viewAxisFocus,
  type Word,
} from '../../engine';
import { ACTORS, poseFor } from './cast';
import { LOOK, lightFor, postFor } from './look';
import { SetPieces } from './set';
import { CAMS, DOF, DOF_TARGET, FPS, KICKS, SHOTS } from './shots';
import { PREVIEW_VOICE, WORDS } from './words';

/** Zona subtitle vertikal 9:16 standar studio (`SUB_STACK = 'label-above'`, `y = 1485..1690` @1920; ZERO 2D HUD). */
export const SUB_STACK = 'label-above' as const;
const SUB_TOP_PX = 1485;
const SPEAKER_LABEL: Record<string, string> = {
  bangUtoh: 'BANG UTOH',
  rara: 'MBAK RARA',
};

export type StarterSubChunk = { speaker: string; text: string; from: number; to: number };

/** Bangun daftar chunk subtitle non-tumpang-tindih (tanpa delay ganti chunk maupun kedip tengah chunk). */
export function buildStarterSubtitles(words: readonly Word[], fps = FPS, maxWords = 3, holdFrames = 7): StarterSubChunk[] {
  const raw: StarterSubChunk[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const group = words.slice(i, i + maxWords);
    const spk = group[0]?.speaker ?? 'bangUtoh';
    const from = Math.round(group[0].start * fps);
    const to = Math.round(group[group.length - 1].end * fps) + holdFrames;
    raw.push({
      speaker: SPEAKER_LABEL[spk] ?? spk.toUpperCase(),
      text: group.map((w) => w.text).join(' '),
      from,
      to,
    });
  }
  for (let i = 0; i < raw.length - 1; i++) {
    raw[i].to = Math.min(raw[i].to, raw[i + 1].from);
  }
  return raw;
}

const SUB_CHUNKS = buildStarterSubtitles(WORDS, FPS);

export const StarterProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = sampleCamera(CAMS, frame);
  const shake = kickOffset(KICKS, frame, pose);
  const shot = shotAt(SHOTS, frame);
  const light = lightFor(shot.light);
  const focus = viewAxisFocus(pose.pos, pose.look, DOF_TARGET[shot.id] ?? pose.look);
  const post = postFor(shot.light, DOF[shot.id] ?? 0, focus);
  const sub = SUB_CHUNKS.find((c) => frame >= c.from && frame < c.to) ?? null;
  const s = pxScale(height);

  const utohActor = ACTORS[0];
  const utohPose = poseFor('bangUtoh', frame, pose.pos);
  const utohCupPos =
    utohPose.rightArm === 'hold'
      ? actorHandWorldPos('bangUtoh', utohPose, 1, utohActor.base, pose.pos, utohActor.height ?? 1.96, {
          seatRadius: utohActor.seatRadius,
          forwardOffset: 0.045,
        })
      : null;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {PREVIEW_VOICE ? <Audio src={staticFile(PREVIEW_VOICE)} /> : null}
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 800 }}
      >
        <CameraRig pose={pose} shake={shake} />
        <Stage light={light} ground={LOOK.ground} showGround={false} camPos={pose.pos} camLook={pose.look}>
          <SetPieces lightId={shot.light} />
          {/* Lampu bohlam praktis warkop (menguji uLocalLight Reinhard soft-clamp tanpa over-bloom!) */}
          <pointLight position={[0, 2.35, -0.55]} color="#ffd58c" intensity={shot.light === 'amber' ? 3.2 : 1.4} distance={9} decay={1.6} />

          {ACTORS.map((a) => {
            const p = a.id === 'bangUtoh' ? utohPose : poseFor(a.id, frame, pose.pos);
            return (
              <ActorBillboard
                key={a.id}
                actor={a.preset}
                overrides={a.overrides}
                position={a.base}
                faceTo={pose.pos}
                pose={p}
                height={a.height}
                seatRadius={a.seatRadius}
                castShadow={light.card.castShadow}
                blobColor={light.card.blob}
              />
            );
          })}

          {utohCupPos ? <DrinkCup3D position={utohCupPos} /> : null}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>

      {/* Zona subtitle bersih 9:16 (SUB_STACK = 'label-above', tanpa kotak HUD 2D) */}
      {sub ? (
        <div
          style={{
            position: 'absolute',
            top: SUB_TOP_PX * s,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6 * s,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'system-ui, Segoe UI, sans-serif',
              fontWeight: 900,
              fontSize: 28 * s,
              letterSpacing: 1.5 * s,
              color: '#fde047',
              textShadow: `0 ${2 * s}px ${4 * s}px rgba(0,0,0,0.9)`,
            }}
          >
            {sub.speaker}
          </span>
          <span
            style={{
              fontFamily: 'system-ui, Segoe UI, sans-serif',
              fontWeight: 900,
              fontSize: 64 * s,
              lineHeight: 1.08,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              WebkitTextStroke: `${3.5 * s}px #14101c`,
              paintOrder: 'stroke fill',
              textShadow: `0 ${4 * s}px ${10 * s}px rgba(0,0,0,0.75)`,
            }}
          >
            {sub.text}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
