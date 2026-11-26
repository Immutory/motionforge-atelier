import React, { useMemo } from 'react';
import * as THREE from 'three';
import { KampungSet, NOINK, boxFromCenter, boxFromFoot, useTwoToneMaterial, type NamedBox, type Vec3 } from '../../engine';

/**
 * Milik agent set-designer. EP05 "Parkir Gratis 0 Rupiah, Tapi Keluarnya Bayar 10 Ribu?!"
 * Lokasi: Pelataran Minimarket (`KG_RukoWest1_Body_3`) + ATM (`KG_P5_ATM_BoothBody`) + Tiang `KG_StreetPole_02`
 * pada `KampungSet mode="siang"`. 100% prop diegetik 3D (`NOINK`, ZERO 2D HUD).
 */
export const KARDUS_BELANG_TOP_Y = 0.34;
export const EP05_HIDE_NAMES: readonly string[] = [];

export const EP05_SPOTS = {
  // Karakter utama (menghadap +Z ke arah jalan & kamera)
  utohDefault: [-30.62, 0, 4.02] as Vec3,
  utohPlak: [-30.48, 0, 4.18] as Vec3,
  ebotDefault: [-31.72, 0, 3.88] as Vec3,
  // Zona parkir motor (kotak parkir putih depan Minimarket, bebas Angkot01 & tiang)
  motorPark: [-32.68, 0, 3.68] as Vec3,
  motorExit: [-32.68, 0, 4.85] as Vec3,
  motorEnter: [-34.65, 0, 4.85] as Vec3,
  // Pak Budi mendorong motor dari sisi timur (+X) motor (bebas Ebot & bebas papan kapur!)
  pakBudiPushStart: [-32.16, 0, 3.72] as Vec3,
  pakBudiPushEnd: [-32.16, 0, 4.88] as Vec3,
  pakBudiHandover: [-32.02, 0, 4.78] as Vec3,
  // Kucing Belang bertengger di atas kotak kardus di kanan tiang KG_StreetPole_02
  belangSeat: [-29.38, KARDUS_BELANG_TOP_Y, 4.18] as Vec3,
  // Prop diegetik 3D
  kardusSign: [-30.0, 1.42, 4.38] as Vec3,
  papanKapur: [-31.18, 0, 3.82] as Vec3,
  kardusBelang: [-29.38, 0, 4.18] as Vec3,
  suratInsert: [-31.18, 1.38, 5.18] as Vec3,
} as const;

export const KARDUS_SIGN_SIZE: [number, number] = [0.68, 0.46];
export const PAPAN_BOARD_SIZE: [number, number] = [0.58, 0.72];
export const SURAT_SIZE: [number, number] = [0.42, 0.54];
export const KARDUS_BELANG_HALF = 0.22;

export function seatCardPos(seat: Vec3, half: number, camPos?: Vec3): Vec3 {
  if (!camPos) return seat;
  const dx = camPos[0] - seat[0];
  const dz = camPos[2] - seat[2];
  const l = Math.hypot(dx, dz) || 1;
  const ux = dx / l;
  const uz = dz / l;
  const d = half / Math.max(Math.abs(ux), Math.abs(uz), 1e-3) + 0.02;
  return [seat[0] + ux * d, seat[1], seat[2] + uz * d];
}

export const EP05_PROP_BOXES: NamedBox[] = [
  boxFromCenter('EP05_KardusSign', EP05_SPOTS.kardusSign, [KARDUS_SIGN_SIZE[0], KARDUS_SIGN_SIZE[1], 0.016]),
  boxFromFoot('EP05_PapanKapur', EP05_SPOTS.papanKapur, 0.6, 1.62, 0.28),
  boxFromFoot('EP05_KardusBelang', EP05_SPOTS.kardusBelang, KARDUS_BELANG_HALF * 2, KARDUS_BELANG_TOP_Y, KARDUS_BELANG_HALF * 2),
];

export type TallyMode = 'denda' | 'target' | 'udin' | 'raka' | 'tally80' | 'total320';

export type SetState = {
  frame: number;
  kardusPop: number;
  tallyMode: TallyMode;
  activeMotor: 'none' | 'udin' | 'raka' | 'pakBudi';
  motorPos: Vec3;
  motorYaw: number;
  motorRoll: number;
  suratVisible: boolean;
  suratPop: number;
  cashVisible: boolean;
  cashPos: Vec3;
};

function makeCanvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const MotorParkir3D: React.FC<{ pos: Vec3; yaw: number; roll: number; bodyColor: string; accentColor: string }> = ({
  pos,
  yaw,
  roll,
  bodyColor,
  accentColor,
}) => {
  const bodyMat = useTwoToneMaterial({ color: bodyColor });
  const accentMat = useTwoToneMaterial({ color: accentColor });
  const tireMat = useTwoToneMaterial({ color: '#1e293b' });
  const seatMat = useTwoToneMaterial({ color: '#27272a' });
  const chromeMat = useTwoToneMaterial({ color: '#cbd5e1' });
  const lampMat = useTwoToneMaterial({ color: '#fef08a' });

  return (
    <group name="EP05_Motor3D" position={pos} rotation={[0, yaw, roll]}>
      {/* Roda belakang & depan */}
      <mesh position={[0, 0.22, -0.44]} rotation={[0, 0, Math.PI / 2]} material={tireMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
      </mesh>
      <mesh position={[0, 0.22, 0.46]} rotation={[0, 0, Math.PI / 2]} material={tireMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
      </mesh>
      {/* Dek & bodi utama skuter */}
      <mesh position={[0, 0.36, 0.02]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.26, 0.96]} />
      </mesh>
      {/* Dek depan + lampu utama */}
      <mesh position={[0, 0.68, 0.38]} rotation={[0.18, 0, 0]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.46, 0.18]} />
      </mesh>
      <mesh position={[0, 0.78, 0.49]} material={lampMat} layers={NOINK}>
        <boxGeometry args={[0.18, 0.1, 0.04]} />
      </mesh>
      {/* Lis aksen samping */}
      <mesh position={[0, 0.42, -0.08]} material={accentMat}>
        <boxGeometry args={[0.36, 0.08, 0.56]} />
      </mesh>
      {/* Jok hitam */}
      <mesh position={[0, 0.56, -0.14]} material={seatMat} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.58]} />
      </mesh>
      {/* Setang + spion */}
      <mesh position={[0, 0.94, 0.34]} rotation={[0, 0, Math.PI / 2]} material={chromeMat} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.56, 10]} />
      </mesh>
      <mesh position={[-0.24, 1.03, 0.34]} material={chromeMat}>
        <boxGeometry args={[0.08, 0.06, 0.03]} />
      </mesh>
      <mesh position={[0.24, 1.03, 0.34]} material={chromeMat}>
        <boxGeometry args={[0.08, 0.06, 0.03]} />
      </mesh>
    </group>
  );
};

export const SetPieces: React.FC<{ state: SetState }> = ({ state }) => {
  const woodMat = useTwoToneMaterial({ color: '#784826' });
  const cardBoxMat = useTwoToneMaterial({ color: '#c48f52' });
  const tapeMat = useTwoToneMaterial({ color: '#e7d2a8' });
  const cashMat = useTwoToneMaterial({ color: '#86efac' });

  const kardusTex = useMemo(
    () =>
      makeCanvasTex(680, 460, (ctx, w, h) => {
        ctx.fillStyle = '#d49b57';
        ctx.fillRect(0, 0, w, h);
        // Tekstur serat kardus halus
        ctx.strokeStyle = 'rgba(120, 72, 38, 0.16)';
        ctx.lineWidth = 3;
        for (let y = 18; y < h; y += 22) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.strokeStyle = '#5c3a14';
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        // Lakban atas-bawah
        ctx.fillStyle = '#e7d5b2';
        ctx.fillRect(w / 2 - 70, 0, 140, 26);
        ctx.fillRect(w / 2 - 70, h - 26, 140, 26);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#18181b';
        ctx.font = '900 108px "Segoe UI", sans-serif';
        ctx.fillText('PARKIR', w / 2, 152);
        ctx.fillStyle = '#dc2626';
        ctx.font = '900 112px "Segoe UI", sans-serif';
        ctx.fillText('GRATIS!', w / 2, 264);

        // Garis pemisah tipis + tulisan syarat kecil licik
        ctx.strokeStyle = '#5c3a14';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(46, 304);
        ctx.lineTo(w - 46, 304);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = '800 28px "Segoe UI", sans-serif';
        ctx.fillText('(SYARAT: MUNDUR TANPA KAKI TURUN)', w / 2, 354);
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 32px "Segoe UI", sans-serif';
        ctx.fillText('TURUN KAKI = RP 2.000 / TAPAK', w / 2, 404);
      }),
    [],
  );

  const tallyTextures = useMemo(() => {
    const mk = (drawBody: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) =>
      makeCanvasTex(580, 720, (ctx, w, h) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 22;
        ctx.strokeRect(11, 11, w - 22, h - 22);
        ctx.textAlign = 'center';
        drawBody(ctx, w, h);
      });

    return {
      denda: mk((ctx, w) => {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 54px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('ATURAN RESMI', w / 2, 120);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 66px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('DENDA 2RB', w / 2, 265);
        ctx.fillText('/ TAPAK', w / 2, 355);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '800 38px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('KALIBRASI GRAVITASI', w / 2, 495);
        ctx.fillStyle = '#86efac';
        ctx.font = '900 42px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('PARKIR = 0 RP!', w / 2, 595);
      }),
      target: mk((ctx, w) => {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 52px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('DENDA 2RB/TAPAK', w / 2, 130);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(54, 180);
        ctx.lineTo(w - 54, 180);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 48px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('TARGET LUNAS:', w / 2, 305);
        ctx.fillStyle = '#4ade80';
        ctx.font = '900 92px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('120RB', w / 2, 430);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 34px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('(Utang Bakmie EP04)', w / 2, 540);
      }),
      udin: mk((ctx, w) => {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 48px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('KORBAN #1: UDIN', w / 2, 120);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 64px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('| | |', w / 2, 240);
        ctx.font = '900 54px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('3 x 2RB =', w / 2, 360);
        ctx.fillStyle = '#4ade80';
        ctx.font = '900 108px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('6RB', w / 2, 505);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 32px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('Target: 120RB', w / 2, 620);
      }),
      raka: mk((ctx, w) => {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 48px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('KORBAN #2: RAKA', w / 2, 120);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 64px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('| | | | |', w / 2, 240);
        ctx.font = '900 54px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('5 x 2RB =', w / 2, 360);
        ctx.fillStyle = '#4ade80';
        ctx.font = '900 104px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('10RB!', w / 2, 505);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 32px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('Skill Sirkuit = 10RB', w / 2, 620);
      }),
      tally80: mk((ctx, w) => {
        ctx.fillStyle = '#fde047';
        ctx.font = '900 48px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('TERKUMPUL:', w / 2, 125);
        ctx.fillStyle = '#4ade80';
        ctx.font = '900 116px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('80RB!', w / 2, 270);
        // Coretan tally kapur ramai
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 6;
        for (let row = 0; row < 2; row++) {
          for (let grp = 0; grp < 4; grp++) {
            const gx = 78 + grp * 116;
            const gy = 345 + row * 95;
            for (let k = 0; k < 4; k++) {
              ctx.beginPath();
              ctx.moveTo(gx + k * 18, gy);
              ctx.lineTo(gx + k * 18, gy + 56);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(gx - 8, gy + 48);
            ctx.lineTo(gx + 68, gy + 8);
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 40px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('KURANG 40RB LAGI!', w / 2, 620);
      }),
      total320: mk((ctx, w) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 36px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('UTANG BAKMIE (EP04)', w / 2, 115);
        ctx.fillStyle = '#facc15';
        ctx.font = '900 58px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('120RB', w / 2, 185);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '800 36px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('+ DENDA KAS RT 04', w / 2, 275);
        ctx.fillStyle = '#f87171';
        ctx.font = '900 58px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('+ 200RB', w / 2, 345);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(68, 390);
        ctx.lineTo(w - 68, 390);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('TOTAL UTANG:', w / 2, 465);
        ctx.fillStyle = '#ff6b7a';
        ctx.font = '900 106px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('320RB!', w / 2, 590);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.ellipse(w / 2, 558, 215, 76, -0.04, 0, Math.PI * 2);
        ctx.stroke();
      }),
    };
  }, []);

  const suratTex = useMemo(
    () =>
      makeCanvasTex(680, 860, (ctx, w, h) => {
        ctx.fillStyle = '#fffdf7';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.strokeRect(18, 18, w - 36, h - 36);

        // Kop surat RT 04
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 36px "Segoe UI", sans-serif';
        ctx.fillText('PENGURUS RT 04 / RW 02', w / 2, 82);
        ctx.font = '700 26px "Segoe UI", sans-serif';
        ctx.fillText('KAMPUNG RAWA SARI', w / 2, 118);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(48, 140);
        ctx.lineTo(w - 48, 140);
        ctx.stroke();

        // Judul surat
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 44px "Segoe UI", sans-serif';
        ctx.fillText('SURAT DENDA RESMI', w / 2, 220);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 30px "Segoe UI", sans-serif';
        ctx.fillText('Nama     : Bang Utoh', 58, 296);
        ctx.fillText('Pelanggaran:', 58, 356);
        ctx.fillStyle = '#991b1b';
        ctx.font = '900 34px "Segoe UI", sans-serif';
        ctx.fillText('PUNGLI FASILITAS UMUM', 58, 404);
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 28px "Segoe UI", sans-serif';
        ctx.fillText('(Parkir Gratis Modus Tapak)', 58, 448);

        // Kotak nominal denda 200.000
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(54, 495, w - 108, 130);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 6;
        ctx.strokeRect(54, 495, w - 108, 130);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#7f1d1d';
        ctx.font = '800 28px "Segoe UI", sans-serif';
        ctx.fillText('DENDA WAJIB KAS RT 04:', w / 2, 536);
        ctx.fillStyle = '#dc2626';
        ctx.font = '900 66px "Segoe UI", sans-serif';
        ctx.fillText('Rp 200.000', w / 2, 606);

        // Tanda tangan & Stempel merah RT 04
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 26px "Segoe UI", sans-serif';
        ctx.fillText('Ketua RT 04,', 74, 710);
        ctx.font = '900 30px "Segoe UI", sans-serif';
        ctx.fillText('Pak Budi', 74, 795);

        ctx.save();
        ctx.translate(495, 735);
        ctx.rotate(-0.18);
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.88)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.textAlign = 'center';
        ctx.font = '900 28px "Segoe UI", sans-serif';
        ctx.fillText('KAS RT 04', 0, -4);
        ctx.font = '900 24px "Segoe UI", sans-serif';
        ctx.fillText('LUNAS WAJIB', 0, 26);
        ctx.restore();
      }),
    [],
  );

  const activeTallyTex = tallyTextures[state.tallyMode];
  const motorColors =
    state.activeMotor === 'udin'
      ? { body: '#16a34a', accent: '#facc15' }
      : state.activeMotor === 'raka'
        ? { body: '#dc2626', accent: '#ffffff' }
        : { body: '#1e293b', accent: '#94a3b8' };

  return (
    <group name="EP05_Set">
      <KampungSet mode="siang" hideNames={[...EP05_HIDE_NAMES]} />

      {/* Garis kotak parkir putih di aspal depan Minimarket (NOINK) */}
      <group position={[-32.68, 0.015, 4.18]} layers={NOINK}>
        <mesh position={[-0.72, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} layers={NOINK}>
          <planeGeometry args={[0.08, 1.55]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0.72, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} layers={NOINK}>
          <planeGeometry args={[0.08, 1.55]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 0, 0.74]} rotation={[-Math.PI / 2, 0, 0]} layers={NOINK}>
          <planeGeometry args={[1.52, 0.08]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Prop 1: Kardus PARKIR GRATIS! menempel di sisi depan (+Z) tiang KG_StreetPole_02 */}
      <mesh
        name="EP05_KardusSign"
        position={EP05_SPOTS.kardusSign}
        scale={1 + state.kardusPop * 0.14}
        layers={NOINK}
      >
        <planeGeometry args={KARDUS_SIGN_SIZE} />
        <meshBasicMaterial map={kardusTex} side={THREE.DoubleSide} />
      </mesh>

      {/* Prop 2: Papan Kapur Tally 3D berdiri di kuda-kuda kayu */}
      <group name="EP05_PapanKapur" position={EP05_SPOTS.papanKapur}>
        {/* Kaki kuda-kuda kiri & kanan */}
        <mesh position={[-0.22, 0.62, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.055, 1.24, 0.06]} />
        </mesh>
        <mesh position={[0.22, 0.62, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.055, 1.24, 0.06]} />
        </mesh>
        <mesh position={[0, 0.42, -0.06]} material={woodMat}>
          <boxGeometry args={[0.48, 0.045, 0.045]} />
        </mesh>
        {/* Papan tulis slate + tekstur kapur dinamis (NOINK) */}
        <mesh position={[0, 1.24, 0.02]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[PAPAN_BOARD_SIZE[0] + 0.03, PAPAN_BOARD_SIZE[1] + 0.03, 0.035]} />
        </mesh>
        <mesh position={[0, 1.24, 0.042]} layers={NOINK}>
          <planeGeometry args={PAPAN_BOARD_SIZE} />
          <meshBasicMaterial map={activeTallyTex} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Prop 3: Kotak kardus tempat Kucing Belang tidur cuek di kanan tiang */}
      <group name="EP05_KardusBelang" position={EP05_SPOTS.kardusBelang}>
        <mesh position={[0, KARDUS_BELANG_TOP_Y / 2, 0]} material={cardBoxMat} castShadow receiveShadow>
          <boxGeometry args={[KARDUS_BELANG_HALF * 2, KARDUS_BELANG_TOP_Y, KARDUS_BELANG_HALF * 2]} />
        </mesh>
        <mesh position={[0, KARDUS_BELANG_TOP_Y + 0.002, 0]} material={tapeMat}>
          <boxGeometry args={[0.08, 0.006, KARDUS_BELANG_HALF * 2]} />
        </mesh>
      </group>

      {/* Prop 4: Motor 3D aktif (Udin / Raka / Pak Budi) */}
      {state.activeMotor !== 'none' && (
        <MotorParkir3D
          pos={state.motorPos}
          yaw={state.motorYaw}
          roll={state.motorRoll}
          bodyColor={motorColors.body}
          accentColor={motorColors.accent}
        />
      )}

      {/* Uang kertas saat Udin / Raka membayar */}
      {state.cashVisible && (
        <mesh position={state.cashPos} rotation={[0, 0.2, 0.12]} material={cashMat} layers={NOINK}>
          <boxGeometry args={[0.11, 0.055, 0.008]} />
        </mesh>
      )}

      {/* Prop 5: Surat Denda Resmi Kas RT 04 berstempel merah (Beat 7 makro, NOINK) */}
      {state.suratVisible && (
        <mesh
          name="EP05_SuratDenda"
          position={EP05_SPOTS.suratInsert}
          scale={0.92 + state.suratPop * 0.08}
          layers={NOINK}
        >
          <planeGeometry args={SURAT_SIZE} />
          <meshBasicMaterial map={suratTex} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
