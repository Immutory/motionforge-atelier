import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { KampungSet, NOINK, boxFromCenter, boxFromFoot, seatCardPos, useTwoToneMaterial, type NamedBox, type Vec3 } from '../../engine';

/**
 * Milik agent set-designer (Atelier v3.5). EP05 "Parkir Gratis 0 Rupiah, Tapi Keluarnya Bayar 10 Ribu?!"
 * Pelataran Minimarket (`KG_RukoWest1_Body_3`) + ATM (`KG_P5_ATM_BoothBody`) + Tiang `KG_StreetPole_02`
 * (`KampungSet mode="siang"`):
 * - Backdrop dressing depan Minimarket (promo standee, tumpukan krat & galon, tempat sampah ganda, unit AC)
 * - Marka parkir cat putih + panah "PARKIR GRATIS ↓ MUNDUR", kanstin kuning-hitam, & 2 kerucut lalu lintas
 * - Kotak kapur & kaleng uang Ebot yang makin penuh sesuai progres tally
 * - 3 varian MotorParkir3D detail (Ojol hijau + box/windshield, Sporty merah + knalpot, Bebek hitam + keranjang)
 * - Efek lembaran rupiah melayang di Beat 5
 */
export const KARDUS_BELANG_TOP_Y = 0.34;
export const EP05_HIDE_NAMES: readonly string[] = [];

export const EP05_SPOTS = {
  // Karakter utama
  utohDefault: [-30.62, 0, 4.02] as Vec3,
  utohPlak: [-30.48, 0, 4.18] as Vec3,
  utohPitch: [-30.78, 0, 4.42] as Vec3,
  utohInspect: [-31.48, 0, 4.58] as Vec3,
  utohStrut: [-31.22, 0, 4.48] as Vec3,
  ebotDefault: [-31.72, 0, 3.88] as Vec3,
  ebotWrite: [-31.66, 0, 4.08] as Vec3,
  ebotStop: [-31.92, 0, 4.3] as Vec3,
  // Zona parkir motor
  motorPark: [-32.68, 0, 3.68] as Vec3,
  motorExit: [-32.68, 0, 4.85] as Vec3,
  motorEnter: [-34.65, 0, 4.85] as Vec3,
  // Pak Budi mendorong motor dari sisi timur (+X) motor
  pakBudiSeat: [-32.56, 0, 3.74] as Vec3,
  pakBudiPushStart: [-32.28, 0, 3.72] as Vec3,
  pakBudiPushEnd: [-32.28, 0, 4.88] as Vec3,
  pakBudiHandover: [-32.08, 0, 4.65] as Vec3,
  // Kucing Belang di atas kotak kardus kanan tiang
  belangSeat: [-29.38, KARDUS_BELANG_TOP_Y, 4.18] as Vec3,
  // Prop diegetik 3D
  kardusSign: [-30.0, 1.42, 4.41] as Vec3,
  papanKapur: [-31.18, 0, 3.82] as Vec3,
  kardusBelang: [-29.38, 0, 4.18] as Vec3,
  suratInsert: [-31.18, 1.38, 5.18] as Vec3,
  // Dressing pelataran Minimarket
  promoBanner: [-34.15, 0, 2.72] as Vec3,
  crateStack: [-31.65, 0, 2.68] as Vec3,
  trashBin: [-30.72, 0, 2.66] as Vec3,
  acUnit: [-30.85, 2.15, 2.48] as Vec3,
  coneW: [-33.62, 0, 3.48] as Vec3,
  coneE: [-31.88, 0, 3.48] as Vec3,
  ebotCrate: [-30.82, 0, 3.38] as Vec3,
} as const;

export const KARDUS_SIGN_SIZE: [number, number] = [0.68, 0.46];
export const PAPAN_BOARD_SIZE: [number, number] = [0.58, 0.72];
export const SURAT_SIZE: [number, number] = [0.42, 0.54];
export const KARDUS_BELANG_HALF = 0.22;

export { seatCardPos } from '../../engine';

export const EP05_PROP_BOXES: NamedBox[] = [
  boxFromCenter('EP05_KardusSign', EP05_SPOTS.kardusSign, [KARDUS_SIGN_SIZE[0], KARDUS_SIGN_SIZE[1], 0.016]),
  boxFromFoot('EP05_PapanKapur', EP05_SPOTS.papanKapur, 0.6, 1.62, 0.28),
  boxFromFoot('EP05_KardusBelang', EP05_SPOTS.kardusBelang, KARDUS_BELANG_HALF * 2, KARDUS_BELANG_TOP_Y, KARDUS_BELANG_HALF * 2),
  boxFromFoot('EP05_PromoBanner', EP05_SPOTS.promoBanner, 0.56, 1.35, 0.36),
  boxFromFoot('EP05_CrateStack', EP05_SPOTS.crateStack, 0.84, 0.72, 0.42),
  boxFromFoot('EP05_TrashBin', EP05_SPOTS.trashBin, 0.68, 0.78, 0.36),
  boxFromFoot('EP05_ConeW', EP05_SPOTS.coneW, 0.28, 0.54, 0.28),
  boxFromFoot('EP05_ConeE', EP05_SPOTS.coneE, 0.28, 0.54, 0.28),
  boxFromFoot('EP05_EbotCrate', EP05_SPOTS.ebotCrate, 0.36, 0.38, 0.36),
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
  floatingBills: boolean;
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

const TrafficCone: React.FC<{ pos: Vec3 }> = ({ pos }) => {
  const orangeMat = useTwoToneMaterial({ color: '#ea580c' });
  const whiteMat = useTwoToneMaterial({ color: '#f8fafc' });
  return (
    <group position={pos}>
      <mesh position={[0, 0.025, 0]} material={orangeMat} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.05, 0.28]} />
      </mesh>
      <mesh position={[0, 0.29, 0]} material={orangeMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.032, 0.11, 0.48, 12]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={whiteMat} layers={NOINK}>
        <cylinderGeometry args={[0.055, 0.072, 0.08, 12]} />
      </mesh>
      <mesh position={[0, 0.18, 0]} material={whiteMat} layers={NOINK}>
        <cylinderGeometry args={[0.082, 0.098, 0.08, 12]} />
      </mesh>
    </group>
  );
};

const MotorParkir3D: React.FC<{
  pos: Vec3;
  yaw: number;
  roll: number;
  variant: 'udin' | 'raka' | 'pakBudi';
}> = ({ pos, yaw, roll, variant }) => {
  const palette =
    variant === 'udin'
      ? { body: '#16a34a', accent: '#facc15' }
      : variant === 'raka'
        ? { body: '#dc2626', accent: '#f8fafc' }
        : { body: '#1e293b', accent: '#94a3b8' };

  const bodyMat = useTwoToneMaterial({ color: palette.body }, [palette.body]);
  const accentMat = useTwoToneMaterial({ color: palette.accent }, [palette.accent]);
  const tireMat = useTwoToneMaterial({ color: '#18181b' });
  const rimMat = useTwoToneMaterial({ color: '#cbd5e1' });
  const seatMat = useTwoToneMaterial({ color: '#27272a' });
  const chromeMat = useTwoToneMaterial({ color: '#94a3b8' });
  const lampMat = useTwoToneMaterial({ color: '#fef08a' });
  const boxMat = useTwoToneMaterial({ color: '#15803d' });
  const visorMat = useTwoToneMaterial({ color: '#334155' });

  return (
    <group name="EP05_Motor3D" position={pos} rotation={[0, yaw, roll]}>
      {/* Roda belakang + pelek alloy */}
      <mesh position={[0, 0.22, -0.46]} rotation={[0, 0, Math.PI / 2]} material={tireMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
      </mesh>
      <mesh position={[0, 0.22, -0.46]} rotation={[0, 0, Math.PI / 2]} material={rimMat}>
        <cylinderGeometry args={[0.12, 0.12, 0.13, 12]} />
      </mesh>
      {/* Roda depan + pelek + shock teleskopik */}
      <mesh position={[0, 0.22, 0.48]} rotation={[0, 0, Math.PI / 2]} material={tireMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.11, 16]} />
      </mesh>
      <mesh position={[0, 0.22, 0.48]} rotation={[0, 0, Math.PI / 2]} material={rimMat}>
        <cylinderGeometry args={[0.12, 0.12, 0.12, 12]} />
      </mesh>
      <mesh position={[0, 0.36, 0.46]} rotation={[0.25, 0, 0]} material={bodyMat} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.28]} />
      </mesh>
      {/* Dek bawah + bodi belakang ramping */}
      <mesh position={[0, 0.33, 0.04]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.18, 0.96]} />
      </mesh>
      <mesh position={[0, 0.46, -0.22]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.24, 0.54]} />
      </mesh>
      {/* Lis aksen samping */}
      <mesh position={[0, 0.48, -0.2]} material={accentMat}>
        <boxGeometry args={[0.38, 0.07, 0.48]} />
      </mesh>
      {/* Tameng depan miring + lampu utama */}
      <mesh position={[0, 0.66, 0.4]} rotation={[0.22, 0, 0]} material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.5, 0.16]} />
      </mesh>
      <mesh position={[0, 0.78, 0.5]} material={lampMat} layers={NOINK}>
        <boxGeometry args={[0.18, 0.1, 0.04]} />
      </mesh>
      {/* Knalpot samping kanan */}
      <mesh position={[0.21, 0.28, -0.32]} rotation={[variant === 'raka' ? -0.22 : -0.06, 0, 0]} material={chromeMat} castShadow>
        <cylinderGeometry args={[0.04, 0.048, 0.48, 10]} />
      </mesh>
      {/* Jok bertingkat */}
      <mesh position={[0, 0.6, -0.18]} material={seatMat} castShadow>
        <boxGeometry args={[0.29, 0.12, 0.62]} />
      </mesh>
      {/* Setang + grip + spion */}
      <mesh position={[0, 0.96, 0.35]} rotation={[0, 0, Math.PI / 2]} material={chromeMat} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.58, 10]} />
      </mesh>
      <mesh position={[-0.25, 1.06, 0.35]} material={chromeMat}>
        <boxGeometry args={[0.09, 0.06, 0.03]} />
      </mesh>
      <mesh position={[0.25, 1.06, 0.35]} material={chromeMat}>
        <boxGeometry args={[0.09, 0.06, 0.03]} />
      </mesh>

      {/* Aksesori khas per varian */}
      {variant === 'udin' && (
        <group>
          {/* Box thermal Ojol di rak belakang */}
          <mesh position={[0, 0.78, -0.56]} material={boxMat} castShadow>
            <boxGeometry args={[0.36, 0.32, 0.34]} />
          </mesh>
          <mesh position={[0, 0.78, -0.56]} material={accentMat}>
            <boxGeometry args={[0.37, 0.07, 0.35]} />
          </mesh>
          {/* Windshield ojol */}
          <mesh position={[0, 1.08, 0.43]} rotation={[0.2, 0, 0]} material={visorMat}>
            <boxGeometry args={[0.26, 0.2, 0.02]} />
          </mesh>
        </group>
      )}
      {variant === 'raka' && (
        <group>
          {/* Visor sporty smoked + spoiler belakang */}
          <mesh position={[0, 1.02, 0.44]} rotation={[0.38, 0, 0]} material={visorMat}>
            <boxGeometry args={[0.22, 0.14, 0.02]} />
          </mesh>
          <mesh position={[0, 0.66, -0.52]} rotation={[-0.25, 0, 0]} material={accentMat}>
            <boxGeometry args={[0.3, 0.05, 0.14]} />
          </mesh>
        </group>
      )}
      {variant === 'pakBudi' && (
        <group>
          {/* Keranjang kawat depan khas motor bebek Pak RT */}
          <mesh position={[0, 0.74, 0.58]} material={chromeMat} castShadow>
            <boxGeometry args={[0.28, 0.22, 0.18]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const SetPieces: React.FC<{ state: SetState }> = ({ state }) => {
  const woodMat = useTwoToneMaterial({ color: '#784826' });
  const cardBoxMat = useTwoToneMaterial({ color: '#c48f52' });
  const tapeMat = useTwoToneMaterial({ color: '#e7d2a8' });
  const cashMat = useTwoToneMaterial({ color: '#86efac' });
  const crateBlueMat = useTwoToneMaterial({ color: '#2563eb' });
  const crateRedMat = useTwoToneMaterial({ color: '#dc2626' });
  const gallonMat = useTwoToneMaterial({ color: '#7dd3fc' });
  const binGreenMat = useTwoToneMaterial({ color: '#15803d' });
  const binYelMat = useTwoToneMaterial({ color: '#eab308' });
  const acMat = useTwoToneMaterial({ color: '#e2e8f0' });
  const grilleMat = useTwoToneMaterial({ color: '#334155' });
  const tinMat = useTwoToneMaterial({ color: '#d97706' });

  const promoTex = useMemo(
    () =>
      makeCanvasTex(320, 640, (ctx, w, h) => {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, 0, w, 145);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(0, h - 100, w, 100);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 54px "Segoe UI", sans-serif';
        ctx.fillText('PROMO', w / 2, 72);
        ctx.font = '900 44px "Segoe UI", sans-serif';
        ctx.fillText('JSM!', w / 2, 126);
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 46px "Segoe UI", sans-serif';
        ctx.fillText('MIE INSTAN', w / 2, 265);
        ctx.fillText('& ES TEH', w / 2, 330);
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 62px "Segoe UI", sans-serif';
        ctx.fillText('5RB AJA!', w / 2, 455);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 32px "Segoe UI", sans-serif';
        ctx.fillText('MINIMARKET 24J', w / 2, h - 40);
      }),
    [],
  );

  const asphaltTex = useMemo(
    () =>
      makeCanvasTex(520, 580, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
        ctx.lineWidth = 18;
        ctx.strokeRect(20, 20, w - 40, h - 40);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.textAlign = 'center';
        ctx.font = '900 48px "Segoe UI", sans-serif';
        ctx.fillText('PARKIR GRATIS', w / 2, 470);
        ctx.font = '900 42px "Segoe UI", sans-serif';
        ctx.fillText('↓ MUNDUR ↓', w / 2, 528);
      }),
    [],
  );

  const kardusTex = useMemo(
    () =>
      makeCanvasTex(680, 460, (ctx, w, h) => {
        ctx.fillStyle = '#d49b57';
        ctx.fillRect(0, 0, w, h);
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

  useEffect(
    () => () => {
      promoTex.dispose();
      asphaltTex.dispose();
      kardusTex.dispose();
      Object.values(tallyTextures).forEach((t) => t.dispose());
      suratTex.dispose();
    },
    [promoTex, asphaltTex, kardusTex, tallyTextures, suratTex],
  );

  const moneyStackLevel =
    state.tallyMode === 'tally80' ? 3 : state.tallyMode === 'raka' ? 2 : state.tallyMode === 'udin' ? 1 : 0;

  return (
    <group name="EP05_Set">
      <KampungSet mode="siang" hideNames={[...EP05_HIDE_NAMES]} />

      {/* Dressing pelataran depan Minimarket (memecah rolling door datar!) */}
      <group name="EP05_PromoBanner" position={EP05_SPOTS.promoBanner} rotation={[0, 0.22, 0]}>
        <mesh position={[0, 0.67, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.56, 1.34, 0.06]} />
        </mesh>
        <mesh position={[0, 0.68, 0.036]} layers={NOINK}>
          <planeGeometry args={[0.52, 1.24]} />
          <meshBasicMaterial map={promoTex} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Tumpukan krat minuman & 2 galon air */}
      <group name="EP05_CrateStack" position={EP05_SPOTS.crateStack}>
        <mesh position={[-0.2, 0.16, 0]} material={crateBlueMat} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.32, 0.36]} />
        </mesh>
        <mesh position={[-0.2, 0.48, 0]} material={crateRedMat} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.32, 0.36]} />
        </mesh>
        <mesh position={[0.22, 0.24, 0]} material={gallonMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.44, 14]} />
        </mesh>
      </group>

      {/* Tempat sampah ganda Minimarket (hijau & kuning) */}
      <group name="EP05_TrashBin" position={EP05_SPOTS.trashBin}>
        <mesh position={[-0.17, 0.36, 0]} material={binGreenMat} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.72, 0.32]} />
        </mesh>
        <mesh position={[0.17, 0.36, 0]} material={binYelMat} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.72, 0.32]} />
        </mesh>
      </group>

      {/* Unit AC outdoor di dinding atas */}
      <group name="EP05_ACUnit" position={EP05_SPOTS.acUnit}>
        <mesh material={acMat} castShadow>
          <boxGeometry args={[0.72, 0.5, 0.26]} />
        </mesh>
        <mesh position={[-0.1, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={grilleMat}>
          <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        </mesh>
      </group>

      {/* Kanstin kuning-hitam + marka kotak parkir putih "PARKIR GRATIS ↓ MUNDUR" */}
      <group name="EP05_CurbStripes" layers={NOINK}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[-34.2 + i * 0.68, 0.056, 3.82]} layers={NOINK}>
            <boxGeometry args={[0.64, 0.012, 0.24]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#facc15' : '#1e293b'} />
          </mesh>
        ))}
      </group>
      <mesh position={[-32.68, 0.016, 4.25]} rotation={[-Math.PI / 2, 0, 0]} layers={NOINK}>
        <planeGeometry args={[1.65, 1.85]} />
        <meshBasicMaterial map={asphaltTex} transparent />
      </mesh>

      {/* 2 Kerucut lalu lintas merah-putih */}
      <TrafficCone pos={EP05_SPOTS.coneW} />
      <TrafficCone pos={EP05_SPOTS.coneE} />

      {/* Kotak kayu Ebot + kotak kapur + kaleng uang yang makin penuh */}
      <group name="EP05_EbotCrate" position={EP05_SPOTS.ebotCrate}>
        <mesh position={[0, 0.19, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.38, 0.36]} />
        </mesh>
        <mesh position={[0.06, 0.45, 0.02]} material={tinMat} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.14, 14]} />
        </mesh>
        {moneyStackLevel > 0 && (
          <mesh position={[0.06, 0.52 + moneyStackLevel * 0.015, 0.02]} rotation={[0.1, 0.4, 0.15]} material={cashMat} layers={NOINK}>
            <boxGeometry args={[0.1, 0.04 + moneyStackLevel * 0.025, 0.05]} />
          </mesh>
        )}
      </group>

      {/* Prop 1: Kardus PARKIR GRATIS! di tiang KG_StreetPole_02 */}
      <mesh name="EP05_KardusSign" position={EP05_SPOTS.kardusSign} scale={1 + state.kardusPop * 0.14} layers={NOINK}>
        <planeGeometry args={KARDUS_SIGN_SIZE} />
        <meshBasicMaterial map={kardusTex} side={THREE.DoubleSide} />
      </mesh>

      {/* Prop 2: Papan Kapur Tally 3D */}
      <group name="EP05_PapanKapur" position={EP05_SPOTS.papanKapur}>
        <mesh position={[-0.22, 0.62, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.055, 1.24, 0.06]} />
        </mesh>
        <mesh position={[0.22, 0.62, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[0.055, 1.24, 0.06]} />
        </mesh>
        <mesh position={[0, 0.42, -0.06]} material={woodMat}>
          <boxGeometry args={[0.48, 0.045, 0.045]} />
        </mesh>
        <mesh position={[0, 1.24, 0.02]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[PAPAN_BOARD_SIZE[0] + 0.03, PAPAN_BOARD_SIZE[1] + 0.03, 0.035]} />
        </mesh>
        <mesh position={[0, 1.24, 0.042]} layers={NOINK}>
          <planeGeometry args={PAPAN_BOARD_SIZE} />
          <meshBasicMaterial map={tallyTextures[state.tallyMode]} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Prop 3: Kotak kardus tempat Kucing Belang */}
      <group name="EP05_KardusBelang" position={EP05_SPOTS.kardusBelang}>
        <mesh position={[0, KARDUS_BELANG_TOP_Y / 2, 0]} material={cardBoxMat} castShadow receiveShadow>
          <boxGeometry args={[KARDUS_BELANG_HALF * 2, KARDUS_BELANG_TOP_Y, KARDUS_BELANG_HALF * 2]} />
        </mesh>
        <mesh position={[0, KARDUS_BELANG_TOP_Y + 0.002, 0]} material={tapeMat}>
          <boxGeometry args={[0.08, 0.006, KARDUS_BELANG_HALF * 2]} />
        </mesh>
      </group>

      {/* Prop 4: Motor 3D detail sesuai varian (key={state.activeMotor} + deps warna -> 100% anti warna-warni antar tab render) */}
      {state.activeMotor !== 'none' && (
        <MotorParkir3D
          key={state.activeMotor}
          pos={state.motorPos}
          yaw={state.motorYaw}
          roll={state.motorRoll}
          variant={state.activeMotor}
        />
      )}

      {/* Lembaran uang kertas saat bayar */}
      {state.cashVisible && (
        <mesh position={state.cashPos} rotation={[0, 0.25, 0.14]} material={cashMat} layers={NOINK}>
          <boxGeometry args={[0.11, 0.055, 0.008]} />
        </mesh>
      )}

      {/* Efek komedi lembaran rupiah melayang di Beat 5 */}
      {state.floatingBills && (
        <group name="EP05_FloatingBills" layers={NOINK}>
          {Array.from({ length: 8 }, (_, i) => {
            const cyc = ((state.frame * 0.022 + i * 0.19) % 1.45);
            const x = -31.1 + Math.sin(i * 1.9 + state.frame * 0.06) * 0.72;
            const y = 0.75 + cyc;
            const z = 4.35 + Math.cos(i * 1.3) * 0.28;
            return (
              <mesh key={i} position={[x, y, z]} rotation={[0.1, i * 0.5, Math.sin(state.frame * 0.18 + i) * 0.45]} layers={NOINK}>
                <planeGeometry args={[0.14, 0.068]} />
                <meshBasicMaterial color={i % 2 === 0 ? '#4ade80' : '#38bdf8'} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Prop 5: Surat Denda Resmi Kas RT 04 berstempel merah */}
      {state.suratVisible && (
        <mesh name="EP05_SuratDenda" position={EP05_SPOTS.suratInsert} scale={0.92 + state.suratPop * 0.08} layers={NOINK}>
          <planeGeometry args={SURAT_SIZE} />
          <meshBasicMaterial map={suratTex} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
