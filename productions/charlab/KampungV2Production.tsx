import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ActorBillboard,
  DEFAULT_POST,
  GRADE_PRESETS,
  KAMPUNG_MODES,
  KAMPUNG_SPOTS,
  KampungSet,
  PostStack,
  Stage,
  blinkLidAt,
  type ActorPose,
  type CamPose,
  type CastPresetId,
  type KampungTimeMode,
  type PostParams,
  type Vec3,
} from '../../engine';

/** Satu slide = 10 frame. Kamera dalam koordinat Three.js (x, tinggi, z = -BlenderY). */
type Slide = {
  mode: KampungTimeMode;
  pose: CamPose;
  title: string;
  actors?: { id: CastPresetId; at: Vec3; pose: Partial<ActorPose> }[];
};

const P = (pos: Vec3, look: Vec3, fov = 50): CamPose => ({ pos, look, fov, roll: 0 });
const S = KAMPUNG_SPOTS;

export const KAMPUNG_V2_SLIDES: Slide[] = [
  { mode: 'siang', pose: P([0, 120, 150], [0, 0, -10], 45), title: 'OVERVIEW UDARA — KAMPUNG RAWA SARI V2 (264 × 220 M)' },
  { mode: 'siang', pose: P([-4, 2.4, 7.6], [26, 3.5, 1], 55), title: 'JL. RAWA SARI RAYA — WARKOP, GEDUNG FIK, GANG TIMUR',
    actors: [{ id: 'bangUtoh', at: S.kampusPlaza, pose: { face: 'happy', rightProp: 'laptop', rightArm: 'hold' } }] },
  { mode: 'sore', pose: P([14.9, 2.0, 9.0], [14.9, 7.0, -2], 70), title: 'GEDUNG KAMPUS FIK 3 LANTAI — FASAD DEPAN (SORE)' },
  { mode: 'siang', pose: P([19.4, 5.8, -3.1], [19.4, 4.9, -12], 62), title: 'FIK LT 2 — LAB KOMPUTER',
    actors: [{ id: 'bangUtoh', at: S.kampusLab2, pose: { face: 'happy', talk: 0.6, rightProp: 'laptop', rightArm: 'hold' } }] },
  { mode: 'siang', pose: P([12.75, 5.8, -2.85], [12.75, 5.0, -8.4], 72), title: 'FIK LT 2 — KELAS 2A (KURSI KULIAH, PROYEKTOR, AC)',
    actors: [{ id: 'bangUtoh', at: S.kampusKelas2A, pose: { face: 'happy', leftArm: 'point' } }] },
  { mode: 'malam', pose: P([8.2, 9.8, -1.4], [22, 9.0, -1.6], 60), title: 'FIK LT 3 — SELASAR TERBUKA (MALAM)',
    actors: [{ id: 'bangUtoh', at: S.kampusSelasar3, pose: { face: 'focus' } }] },
  { mode: 'siang', pose: P([17.4, 9.8, -3.0], [21, 8.9, -12], 66), title: 'FIK LT 3 — LAB JARINGAN / SERVER',
    actors: [{ id: 'bangUtoh', at: S.kampusLab3, pose: { face: 'shock' } }] },
  { mode: 'siang', pose: P([109, 9, 30], [109, 5.5, -20], 50), title: 'KOMPLEKS SD + SMA RAWA SARI — SIANG',
    actors: [{ id: 'bangUtoh', at: S.sekolahGerbang, pose: { face: 'happy', leftArm: 'wave' } }] },
  { mode: 'malam', pose: P([109, 9, 30], [109, 5.5, -20], 50), title: 'KOMPLEKS SD + SMA RAWA SARI — MALAM' },
  { mode: 'siang', pose: P([95.25, 1.75, -18.7], [95.25, 1.4, -27.5], 72), title: 'SAYAP SD — KELAS 1 (PAPAN HITAM, VISI MISI, PIKET)',
    actors: [{ id: 'bangUtoh', at: S.sdKelas1, pose: { face: 'happy' } }] },
  { mode: 'siang', pose: P([117.0, 5.5, -18.6], [117.6, 4.5, -26.5], 66), title: 'SAYAP SMA — LAB IPA LT 2',
    actors: [{ id: 'bangUtoh', at: S.smaLabIpa, pose: { face: 'focus' } }] },
  { mode: 'sore', pose: P([-103, 6.5, 13], [-117, 2.2, -2], 55), title: 'SISI BARAT — RUMAH WARGA, PAGAR, MOTOR, JEMURAN (SORE)',
    actors: [{ id: 'bangUtoh', at: S.rumahWargaBarat, pose: { face: 'happy', stance: 'walk' } }] },
  { mode: 'siang', pose: P([-93, 3, -27], [-98.5, 0.4, -17.5], 55), title: 'KALI + JEMBATAN KECIL JL. KAMPUNG 2',
    actors: [{ id: 'bangUtoh', at: S.jembatanKali, pose: { face: 'happy' } }] },
  { mode: 'siang', pose: P([-91, 1.9, 9.5], [-91, 1.8, -3], 60), title: 'BENGKEL MOTOR JAYA',
    actors: [{ id: 'bangUtoh', at: S.bengkelMotor, pose: { face: 'happy', talk: 0.6 } }] },
  { mode: 'malam', pose: P([-92, 1.9, 4.6], [-92, 1.7, 15], 60), title: 'WARUNG KELONTONG BU SRI (MALAM)',
    actors: [{ id: 'bangUtoh', at: S.warungKelontong, pose: { face: 'happy' } }] },
  { mode: 'sore', pose: P([-18.15, 1.8, 4.8], [-18.15, 1.6, -18], 55), title: 'GANG GAPURA → JL. KAMPUNG 2 (SORE)' },
  { mode: 'siang', pose: P([-9.1, 2.25, 14.1], [-12.15, 1.28, 17.9], 54), title: 'AREA PEDAGANG — TIO (REVISI) DI GEROBAK BAKMIE',
    actors: [{ id: 'tio', at: S.bakmieTioVendor, pose: { face: 'happy', leftArm: 'hold', leftProp: 'sodet', rightArm: 'hold', rightProp: 'bakmie' } }] },
  { mode: 'malam', pose: P([-9.1, 2.25, 14.1], [-12.15, 1.28, 17.9], 54), title: 'AREA PEDAGANG — TIO (MALAM)',
    actors: [{ id: 'tio', at: S.bakmieTioVendor, pose: { face: 'happy', talk: 0.6, leftArm: 'hold', leftProp: 'sodet', rightArm: 'hold', rightProp: 'bakmie' } }] },
];

const CameraRig: React.FC<{ pose: CamPose }> = ({ pose }) => {
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.set(...pose.pos);
  cam.fov = pose.fov;
  cam.lookAt(...pose.look);
  cam.updateProjectionMatrix();
  return null;
};

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** QC Kampung Rawa Sari v2: satu slide per zona baru, tiap 10 frame, mode siang/sore/malam. */
export const KampungV2Production: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const s = KAMPUNG_V2_SLIDES[Math.min(KAMPUNG_V2_SLIDES.length - 1, Math.floor(frame / 10))];
  const light = KAMPUNG_MODES[s.mode].light;
  const post: PostParams = {
    ...DEFAULT_POST,
    ink: { ...DEFAULT_POST.ink, fogColor: light.fog.color, fogNear: light.fog.near, fogFar: light.fog.far },
    blur: 0,
    focus: dist(s.pose.pos, s.pose.look),
    grade: GRADE_PRESETS[s.mode === 'siang' ? 'noon' : 'amber'],
  };
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        shadows={{ type: THREE.PCFShadowMap }}
        width={width}
        height={height}
        camera={{ fov: s.pose.fov, position: s.pose.pos, near: 0.1, far: 900 }}
      >
        <CameraRig pose={s.pose} />
        <Stage light={light} showGround={false} camPos={s.pose.pos} camLook={s.pose.look}>
          <KampungSet mode={s.mode} />
          {(s.actors ?? []).map((a, i) => (
            <ActorBillboard
              key={`${a.id}-${i}`}
              actor={a.id}
              position={a.at}
              faceTo={s.pose.pos}
              height={a.id === 'tio' ? 1.88 : 1.78}
              blobColor={light.card.blob}
              pose={{ face: 'happy', blink: blinkLidAt(frame, i + 1, fps), stance: 'stand', view: 'front', ...a.pose } as ActorPose}
            />
          ))}
        </Stage>
        <PostStack params={post} />
      </ThreeCanvas>
      <div
        style={{
          position: 'absolute', left: 32, right: 32, bottom: 24, padding: '12px 22px', borderRadius: 16,
          background: 'rgba(15,20,32,0.82)', border: '2px solid rgba(242,193,68,0.7)', color: '#f9d66b',
          fontFamily: 'system-ui, sans-serif', fontSize: 24, fontWeight: 900, display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>{s.title}</span>
        <span style={{ color: '#fff', textTransform: 'uppercase' }}>Mode: {s.mode}</span>
      </div>
    </AbsoluteFill>
  );
};
