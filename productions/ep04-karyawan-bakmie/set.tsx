import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { KampungSet, NOINK, boxFromCenter, boxFromFoot, useTwoToneMaterial, type NamedBox, type Vec3 } from '../../engine';

/**
 * Milik agent set-designer. EP04 "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!"
 * Area Pedagang Rawa Sari (`KampungSet mode="malam"`), 100% prop diegetik 3D (`NOINK`, ZERO 2D HUD).
 */
export const LEDGE_TOP_Y = 0.92;
export const COUNTER_TOP_Y = 0.96;
export const BENCH_SEAT_Y = 0.46;
export const PALLET_TOP_Y = 0.3;

export const EP04_HIDE_NAMES: readonly string[] = [
  'KG_Grb_BakmieTio_ReadyBowl',
  'KG_Grb_BakmieTio_ReadyMie',
  'KG_Grb_BakmieTio_DandangPot',
  'KG_Grb_BakmieTio_DandangRim',
  'KG_Grb_BakmieTio_DandangBroth',
  'KG_Grb_BakmieTio_Skimmer',
  'KG_Grb_BakmieTio_LadleHandle',
  'KG_Grb_BakmieTio_LadleBowl',
  'KG_Grb_BakmieTio_SerokanBasket',
  'KG_Grb_BakmieTio_SerokanHandle',
];

export const EP04_SPOTS = {
  utohDefault: [-13.05, PALLET_TOP_Y, 18.4] as Vec3,
  utohWest: [-13.06, PALLET_TOP_Y, 18.4] as Vec3,
  utohStepLeft: [-13.18, PALLET_TOP_Y, 18.4] as Vec3,
  utohEast: [-13.1, PALLET_TOP_Y, 18.4] as Vec3,
  tioBoss: [-12.05, 0, 17.75] as Vec3,
  tioHandover: [-12.2, 0, 17.75] as Vec3,
  pakUjangSeat: [-13.38, 0, 16.8] as Vec3,
  pakUjangEnter: [-14.65, 0, 15.65] as Vec3,
  pakUjangApproach: [-13.45, 0, 15.65] as Vec3,
  pakUjangExit: [-14.75, 0, 15.65] as Vec3,
  oyenSeat: [-12.8, BENCH_SEAT_Y, 16.8] as Vec3,
  yuni: [-9.62, PALLET_TOP_Y, 18.38] as Vec3,
  bowlUjang: [-13.44, LEDGE_TOP_Y, 17.17] as Vec3,
  deployBowls: [
    [-14.11, LEDGE_TOP_Y, 17.17],
    [-13.28, LEDGE_TOP_Y, 17.17],
    [-13.12, LEDGE_TOP_Y, 17.17],
  ] as Vec3[],
  mandorPlate: [-12.94, LEDGE_TOP_Y, 17.17] as Vec3,
  vipPlate: [-12.75, LEDGE_TOP_Y, 17.17] as Vec3,
  cash: [-13.28, LEDGE_TOP_Y, 17.11] as Vec3,
  cartSign: [-13.26, 0.73, 17.22] as Vec3,
  signKaryawan: [-13.94, 1.675, 17.33] as Vec3,
  bestEmployee: [-13.93, 1.35, 17.24] as Vec3,
  slipInsert: [-12.46, 1.38, 17.26] as Vec3,
  bulb: [-13.45, 1.86, 17.57] as Vec3,
} as const;

export const CART_SIGN_SIZE: [number, number] = [0.56, 0.24];
export const SIGN_SIZE: [number, number] = [0.3, 0.2];
export const BEST_EMP_SIZE: [number, number] = [0.34, 0.3];
export const SLIP_SIZE: [number, number] = [0.36, 0.44];

export const DANDANG = { x: -12.91, z: 17.62, baseY: 1.01, radius: 0.14, height: 0.18 } as const;
export const DANDANG_TOP_Y = DANDANG.baseY + DANDANG.height + 0.015;
export const DANDANG_STEAM = {
  source: [DANDANG.x + 0.05, DANDANG_TOP_Y + 0.005, DANDANG.z - 0.02] as Vec3,
  count: 6,
  size: 0.7,
  alpha: 0.24,
  driftX: 0.22,
} as const;

/** Periode 90f membagi habis 2070f (23 × 90) sehingga uap menyambung 100% mulus di loop. */
export function steamPuffs(frame: number): { x: number; y: number; s: number; a: number }[] {
  const period = 90;
  return Array.from({ length: DANDANG_STEAM.count }, (_, i) => {
    const t = ((frame + i * Math.round(period / DANDANG_STEAM.count)) % period) / period;
    return {
      x: Math.sin((frame + i * 15) * (2 * Math.PI / period)) * 0.05 * DANDANG_STEAM.size * (0.4 + t) + DANDANG_STEAM.driftX * t,
      y: t * 0.62 * DANDANG_STEAM.size,
      s: (0.1 + t * 0.22) * DANDANG_STEAM.size,
      a: Math.sin(Math.PI * t) * DANDANG_STEAM.alpha,
    };
  });
}

export const STOOLS = {
  pakUjang: { center: [-13.38, 16.8] as [number, number], half: 0.17, color: '#8b5a34' },
  oyen: { center: [-12.8, 16.8] as [number, number], half: 0.15, color: '#c8343a' },
} as const;

export { seatCardPos } from '../../engine';

export const PALLET = { x0: -13.8, x1: -12.65, z0: 18.15, z1: 18.65 } as const;
export const PALLET_YUNI = { x0: -9.95, x1: -9.3, z0: 18.15, z1: 18.65 } as const;

export const EP04_PROP_BOXES: NamedBox[] = [
  boxFromFoot('EP04_StoolUjang', [STOOLS.pakUjang.center[0], 0, STOOLS.pakUjang.center[1]], STOOLS.pakUjang.half * 2, BENCH_SEAT_Y, STOOLS.pakUjang.half * 2),
  boxFromFoot('EP04_StoolOyen', [STOOLS.oyen.center[0], 0, STOOLS.oyen.center[1]], STOOLS.oyen.half * 2, BENCH_SEAT_Y, STOOLS.oyen.half * 2),
  boxFromFoot('EP04_Dandang', [DANDANG.x, DANDANG.baseY, DANDANG.z], DANDANG.radius * 2, DANDANG.height + 0.015, DANDANG.radius * 2),
  boxFromFoot('EP04_BowlUjang', EP04_SPOTS.bowlUjang, 0.13, 0.08, 0.13),
  ...EP04_SPOTS.deployBowls.map((p, i) => boxFromFoot(`EP04_DeployBowl${i}`, p, 0.11, 0.075, 0.11)),
  boxFromFoot('EP04_MandorPlate', EP04_SPOTS.mandorPlate, 0.13, 0.08, 0.05),
  boxFromFoot('EP04_VipPlate', EP04_SPOTS.vipPlate, 0.11, 0.05, 0.11),
  boxFromCenter('EP04_CartSign', EP04_SPOTS.cartSign, [CART_SIGN_SIZE[0], CART_SIGN_SIZE[1], 0.012]),
  boxFromCenter('EP04_SignKaryawan', EP04_SPOTS.signKaryawan, [SIGN_SIZE[0], SIGN_SIZE[1], 0.012]),
  boxFromCenter('EP04_BestEmployee', EP04_SPOTS.bestEmployee, [BEST_EMP_SIZE[0], BEST_EMP_SIZE[1], 0.012]),
];

export type SetState = {
  frame: number;
  bowlUjangVisible: boolean;
  ujangAyamCount: number;
  insertAyamLift: number;
  flatLayPawT: number;
  mandorPromoted: boolean;
  mandorFlipT: number;
  bestEmployeeVisible: boolean;
  bestEmployeePop: number;
  deployBowlsCount: number;
  slipInsertVisible: boolean;
  slipProgress: number;
  cashVisible: boolean;
};

function makeCanvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

const Stool: React.FC<{ center: [number, number]; half: number; color: string }> = ({ center, half, color }) => {
  const mat = useTwoToneMaterial({ color });
  const legOff = half - 0.03;
  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh position={[0, BENCH_SEAT_Y - 0.02, 0]} material={mat} castShadow receiveShadow>
        <boxGeometry args={[half * 2, 0.04, half * 2]} />
      </mesh>
      {[
        [-legOff, -legOff],
        [legOff, -legOff],
        [-legOff, legOff],
        [legOff, legOff],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, (BENCH_SEAT_Y - 0.04) / 2, lz]} material={mat} castShadow>
          <boxGeometry args={[0.036, BENCH_SEAT_Y - 0.04, 0.036]} />
        </mesh>
      ))}
    </group>
  );
};

const NoodleBowl: React.FC<{ pos: Vec3; ayamCount: number; scale?: number }> = ({ pos, ayamCount, scale = 1 }) => {
  const bowlMat = useTwoToneMaterial({ color: '#e8ecf2' });
  const mieMat = useTwoToneMaterial({ color: '#eab308' });
  const ayamMat = useTwoToneMaterial({ color: '#92400e' });
  const sawiMat = useTwoToneMaterial({ color: '#22c55e' });
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.038, 0]} material={bowlMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.068, 0.046, 0.075, 16]} />
      </mesh>
      <mesh position={[0, 0.072, 0]} material={mieMat}>
        <cylinderGeometry args={[0.058, 0.058, 0.012, 14]} />
      </mesh>
      <mesh position={[0.024, 0.081, -0.012]} material={sawiMat}>
        <boxGeometry args={[0.03, 0.01, 0.024]} />
      </mesh>
      {Array.from({ length: ayamCount }, (_, i) => (
        <mesh key={i} position={[-0.022 + (i % 2) * 0.022, 0.082 + Math.floor(i / 2) * 0.01, 0.01 - Math.floor(i / 2) * 0.02]} material={ayamMat}>
          <boxGeometry args={[0.018, 0.012, 0.018]} />
        </mesh>
      ))}
    </group>
  );
};

export const SetPieces: React.FC<{ state: SetState }> = ({ state }) => {
  const palletMat = useTwoToneMaterial({ color: '#7c5230' });
  const metalMat = useTwoToneMaterial({ color: '#8a96a8' });
  const brothMat = useTwoToneMaterial({ color: '#d97706' });
  const plateMat = useTwoToneMaterial({ color: '#f1f5f9' });
  const ayamMat = useTwoToneMaterial({ color: '#9a3412' });
  const flagMat = useTwoToneMaterial({ color: '#dc2626' });
  const pawMat = useTwoToneMaterial({ color: '#f97316' });
  const cashMat = useTwoToneMaterial({ color: '#4ade80' });

  const cartSignTex = useMemo(
    () =>
      makeCanvasTex(640, 280, (ctx, w, h) => {
        ctx.fillStyle = '#d49a4a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#6b4214';
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = 'rgba(255,248,220,0.65)';
        ctx.fillRect(28, 12, 90, 22);
        ctx.fillRect(w - 118, 12, 90, 22);
        ctx.fillStyle = '#18181b';
        ctx.font = '900 54px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KARYAWAN BARU', w / 2, 118);
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 50px "Segoe UI", sans-serif';
        ctx.fillText('CICIL BON 90RB', w / 2, 200);
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(110, 218);
        ctx.lineTo(w - 110, 218);
        ctx.stroke();
      }),
    [],
  );

  const signKaryawanTex = useMemo(
    () =>
      makeCanvasTex(420, 280, (ctx, w, h) => {
        ctx.fillStyle = '#d8a252';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#5c3a10';
        ctx.lineWidth = 8;
        ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.fillStyle = '#18181b';
        ctx.textAlign = 'center';
        ctx.font = '900 54px "Segoe UI", sans-serif';
        ctx.fillText('DICARI', w / 2, 86);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(65, 68);
        ctx.lineTo(w - 65, 68);
        ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 38px "Segoe UI", sans-serif';
        ctx.fillText('SUDAH DAPAT', w / 2, 158);
        ctx.fillStyle = '#18181b';
        ctx.font = '900 48px "Segoe UI", sans-serif';
        ctx.fillText('KARYAWAN', w / 2, 224);
      }),
    [],
  );

  const mandorFrontTex = useMemo(
    () =>
      makeCanvasTex(360, 200, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 12;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '900 48px "Segoe UI", sans-serif';
        ctx.fillText('MANDOR QC', w / 2, 106);
        ctx.fillStyle = '#facc15';
        ctx.font = '800 24px "Segoe UI", sans-serif';
        ctx.fillText('★ SI OYEN ★', w / 2, 158);
      }),
    [],
  );

  const mandorBackTex = useMemo(
    () =>
      makeCanvasTex(360, 200, (ctx, w, h) => {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 12;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.font = '900 42px "Segoe UI", sans-serif';
        ctx.fillText('KEPALA', w / 2, 86);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 46px "Segoe UI", sans-serif';
        ctx.fillText('MANDOR', w / 2, 148);
      }),
    [],
  );

  const bestEmpTex = useMemo(
    () =>
      makeCanvasTex(720, 630, (ctx, w, h) => {
        // Kertas poster krem hangat + bingkai emas ganda
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 14;
        ctx.strokeRect(14, 14, w - 28, h - 28);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(28, 28, w - 56, h - 56);

        // Header
        ctx.fillStyle = '#b91c1c';
        ctx.textAlign = 'center';
        ctx.font = '900 50px "Segoe UI", sans-serif';
        ctx.fillText('KARYAWAN TERBAIK', w / 2, 92);
        ctx.fillStyle = '#92400e';
        ctx.font = '800 34px "Segoe UI", sans-serif';
        ctx.fillText('BULAN INI!', w / 2, 138);

        // Bingkai foto studio (potret realistis Si Oyen)
        const px = 175;
        const py = 158;
        const pw = 370;
        const ph = 350;
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();

        // Latar studio foto korporat (biru-abu lembut bergradasi hangat)
        const bg = ctx.createRadialGradient(w / 2, py + 150, 30, w / 2, py + 175, 250);
        bg.addColorStop(0, '#f1f5f9');
        bg.addColorStop(0.65, '#cbd5e1');
        bg.addColorStop(1, '#64748b');
        ctx.fillStyle = bg;
        ctx.fillRect(px, py, pw, ph);

        const cx = w / 2;
        const cy = py + 196;

        // Dada & bahu berbulu oranye-putih
        const chestG = ctx.createRadialGradient(cx, cy + 125, 18, cx, cy + 120, 145);
        chestG.addColorStop(0, '#fff7ed');
        chestG.addColorStop(0.55, '#fed7aa');
        chestG.addColorStop(1, '#c2410c');
        ctx.fillStyle = chestG;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 145, 138, 105, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Kerah putih kecil & dasi merah korporat
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx - 48, cy + 92);
        ctx.lineTo(cx, cy + 118);
        ctx.lineTo(cx - 18, cy + 132);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 48, cy + 92);
        ctx.lineTo(cx, cy + 118);
        ctx.lineTo(cx + 18, cy + 132);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy + 112);
        ctx.lineTo(cx + 13, cy + 112);
        ctx.lineTo(cx + 18, cy + 168);
        ctx.lineTo(cx - 18, cy + 168);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 114, 13, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Telinga realistis (kiri & kanan)
        for (const s of [-1, 1]) {
          const earG = ctx.createLinearGradient(cx + s * 35, cy - 135, cx + s * 105, cy - 25);
          earG.addColorStop(0, '#9a3412');
          earG.addColorStop(0.45, '#ea580c');
          earG.addColorStop(1, '#f97316');
          ctx.fillStyle = earG;
          ctx.beginPath();
          ctx.moveTo(cx + s * 28, cy - 82);
          ctx.quadraticCurveTo(cx + s * 78, cy - 156, cx + s * 102, cy - 134);
          ctx.quadraticCurveTo(cx + s * 116, cy - 84, cx + s * 96, cy - 26);
          ctx.closePath();
          ctx.fill();

          // Bagian dalam telinga pink lembut
          const inG = ctx.createLinearGradient(cx + s * 46, cy - 115, cx + s * 92, cy - 42);
          inG.addColorStop(0, '#fda4af');
          inG.addColorStop(0.6, '#fecdd3');
          inG.addColorStop(1, '#fed7aa');
          ctx.fillStyle = inG;
          ctx.beginPath();
          ctx.moveTo(cx + s * 44, cy - 76);
          ctx.quadraticCurveTo(cx + s * 76, cy - 126, cx + s * 90, cy - 112);
          ctx.quadraticCurveTo(cx + s * 98, cy - 76, cx + s * 84, cy - 38);
          ctx.closePath();
          ctx.fill();

          // Bulu halus dalam telinga
          ctx.strokeStyle = 'rgba(255, 247, 237, 0.85)';
          ctx.lineWidth = 2.5;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.moveTo(cx + s * (46 + k * 7), cy - 72 + k * 6);
            ctx.lineTo(cx + s * (64 + k * 5), cy - 84 + k * 5);
            ctx.stroke();
          }
        }

        // Bentuk kepala kucing realistis (pipi penuh + dahi lembut)
        const headG = ctx.createRadialGradient(cx - 18, cy - 22, 16, cx, cy + 4, 118);
        headG.addColorStop(0, '#fdba74');
        headG.addColorStop(0.45, '#f97316');
        headG.addColorStop(0.82, '#ea580c');
        headG.addColorStop(1, '#9a3412');
        ctx.fillStyle = headG;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 94);
        ctx.bezierCurveTo(cx + 68, cy - 94, cx + 108, cy - 42, cx + 106, cy + 16);
        ctx.bezierCurveTo(cx + 104, cy + 68, cx + 62, cy + 98, cx, cy + 96);
        ctx.bezierCurveTo(cx - 62, cy + 98, cx - 104, cy + 68, cx - 106, cy + 16);
        ctx.bezierCurveTo(cx - 108, cy - 42, cx - 68, cy - 94, cx, cy - 94);
        ctx.closePath();
        ctx.fill();

        // Tekstur bulu radial halus di sekeliling wajah & pipi
        for (let i = 0; i < 160; i++) {
          const ang = (i / 160) * Math.PI * 2;
          const r = 82 + (i % 5) * 5;
          const fx = cx + Math.cos(ang) * r * 1.06;
          const fy = cy + Math.sin(ang) * r * 0.92;
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,237,213,0.45)' : 'rgba(154,52,18,0.32)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(ang) * 14, fy + Math.sin(ang) * 12);
          ctx.stroke();
        }

        // Corak belang tabby "M" realistis di dahi & garis pipi
        ctx.strokeStyle = 'rgba(124, 45, 18, 0.72)';
        ctx.lineCap = 'round';
        ctx.lineWidth = 7;
        for (const [x0, y0, x1, y1, x2, y2] of [
          [cx, cy - 88, cx, cy - 64, cx, cy - 42],
          [cx - 16, cy - 84, cx - 14, cy - 62, cx - 26, cy - 44],
          [cx + 16, cy - 84, cx + 14, cy - 62, cx + 26, cy - 44],
          [cx - 34, cy - 76, cx - 40, cy - 54, cx - 54, cy - 36],
          [cx + 34, cy - 76, cx + 40, cy - 54, cx + 54, cy - 36],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x1, y1, x2, y2);
          ctx.stroke();
        }
        // Garis belang pipi
        ctx.lineWidth = 6;
        for (const s of [-1, 1]) {
          for (const dy of [-2, 16, 34]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 56, cy + dy);
            ctx.quadraticCurveTo(cx + s * 80, cy + dy + 4, cx + s * 98, cy + dy + 10);
            ctx.stroke();
          }
        }

        // Moncong & dagu krem-putih lembut bervolume
        const muzG = ctx.createRadialGradient(cx, cy + 44, 6, cx, cy + 48, 56);
        muzG.addColorStop(0, '#ffffff');
        muzG.addColorStop(0.65, '#ffedd5');
        muzG.addColorStop(1, 'rgba(253, 186, 116, 0)');
        ctx.fillStyle = muzG;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 48, 60, 44, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mata kuning-amber realistis + tatapan smug mandor
        for (const s of [-1, 1]) {
          const ex = cx + s * 40;
          const ey = cy - 6;
          // Lingkar mata putih krem lembut
          ctx.fillStyle = 'rgba(255, 247, 237, 0.55)';
          ctx.beginPath();
          ctx.ellipse(ex, ey, 28, 20, s * -0.08, 0, Math.PI * 2);
          ctx.fill();

          // Iris kuning keemasan bergradasi
          const eyeG = ctx.createRadialGradient(ex, ey, 4, ex, ey, 22);
          eyeG.addColorStop(0, '#fef08a');
          eyeG.addColorStop(0.55, '#eab308');
          eyeG.addColorStop(0.88, '#a16207');
          eyeG.addColorStop(1, '#422006');
          ctx.fillStyle = eyeG;
          ctx.beginPath();
          ctx.ellipse(ex, ey, 22, 16, s * -0.08, 0, Math.PI * 2);
          ctx.fill();

          // Pupil vertikal kucing
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.ellipse(ex, ey + 1, 5.5, 13.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Kelopak atas sedikit turun (ekspresi smug/berwibawa)
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.rect(ex - 26, ey - 22, 52, 14);
          ctx.fill();

          // Eyeliner gelap & catchlight realistis
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(ex, ey, 22, 16, s * -0.08, 0.08 * Math.PI, 0.92 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex - 23, ey - 8);
          ctx.quadraticCurveTo(ex, ey - 10, ex + 23, ey - 8);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - 7, ey - 3, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex + 6, ey + 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hidung pink-terakota realistis + kilap
        const noseG = ctx.createLinearGradient(cx, cy + 16, cx, cy + 36);
        noseG.addColorStop(0, '#fda4af');
        noseG.addColorStop(0.6, '#e11d48');
        noseG.addColorStop(1, '#9f1239');
        ctx.fillStyle = noseG;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy + 20);
        ctx.quadraticCurveTo(cx, cy + 15, cx + 14, cy + 20);
        ctx.quadraticCurveTo(cx + 8, cy + 34, cx, cy + 36);
        ctx.quadraticCurveTo(cx - 8, cy + 34, cx - 14, cy + 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy + 21, 5, 2.2, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Mulut kucing + senyum tenang berwibawa
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 36);
        ctx.lineTo(cx, cy + 46);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy + 48);
        ctx.quadraticCurveTo(cx - 10, cy + 56, cx, cy + 46);
        ctx.quadraticCurveTo(cx + 10, cy + 56, cx + 22, cy + 48);
        ctx.stroke();

        // Titik pori kumis & kumis putih panjang realistis
        ctx.fillStyle = 'rgba(124, 45, 18, 0.45)';
        for (const s of [-1, 1]) {
          for (const [dx, dy] of [
            [18, 36],
            [26, 40],
            [20, 46],
            [30, 48],
          ]) {
            ctx.beginPath();
            ctx.arc(cx + s * dx, cy + dy, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2.2;
          for (const [yStart, yEnd, len] of [
            [36, 26, 128],
            [42, 42, 136],
            [48, 60, 124],
          ]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * 22, cy + yStart);
            ctx.quadraticCurveTo(cx + s * 74, cy + (yStart + yEnd) / 2 - 4, cx + s * len, cy + yEnd);
            ctx.stroke();
          }
        }
        ctx.restore();

        // Bingkai foto emas tipis di sekeliling potret
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 6;
        ctx.strokeRect(px, py, pw, ph);

        // Footer nama
        ctx.fillStyle = '#18181b';
        ctx.font = '900 44px "Segoe UI", sans-serif';
        ctx.fillText('★ MANDOR OYEN ★', w / 2, 570);
      }),
    [],
  );

  const slipTex = useMemo(
    () =>
      makeCanvasTex(680, 840, (ctx, w, h) => {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        for (let y = 135; y < h - 40; y += 64) {
          ctx.beginPath();
          ctx.moveTo(28, y);
          ctx.lineTo(w - 28, y);
          ctx.stroke();
        }
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, 24);
        ctx.lineTo(64, h - 24);
        ctx.stroke();

        ctx.fillStyle = '#111827';
        ctx.font = '900 44px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('SLIP GAJI — SHIFT 1', 84, 82);
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '700 30px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('Karyawan : Bang Utoh', 84, 126);

        const rows: [string, string, string][] = [
          ['1. Upah Shift Malam', '+30rb', '#15803d'],
          ['2. Ayam VIP Mandor x3', '-45rb', '#b91c1c'],
          ['3. Biaya Training Mandor', '-15rb', '#b91c1c'],
          ['4. Utang Lama (EP03)', '-90rb', '#1e3a8a'],
        ];
        rows.forEach(([k, v, col], idx) => {
          const y = 200 + idx * 78;
          ctx.fillStyle = '#1e293b';
          ctx.font = '700 30px "Comic Sans MS", "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(k, 84, y);
          ctx.fillStyle = col;
          ctx.font = '900 34px "Comic Sans MS", "Segoe UI", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(v, w - 42, y);
        });

        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(80, 480);
        ctx.lineTo(w - 36, 480);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#b91c1c';
        ctx.font = '900 34px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('SISA UTANG BARU', 80, 552);
        ctx.textAlign = 'right';
        ctx.font = '900 48px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('120rb', w - 54, 556);

        // Bold red circle around 120rb
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.ellipse(w - 126, 540, 94, 44, -0.05, 0, Math.PI * 2);
        ctx.stroke();

        // Orange Oyen paw stamp
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = '700 32px "Comic Sans MS", "Segoe UI", sans-serif';
        ctx.fillText('ACC Mandor :', 84, 710);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(445, 715, 42, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const [dx, dy] of [
          [-46, -34],
          [-18, -50],
          [18, -50],
          [46, -34],
        ]) {
          ctx.beginPath();
          ctx.ellipse(445 + dx, 715 + dy, 14, 18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );

  useEffect(
    () => () => {
      cartSignTex.dispose();
      signKaryawanTex.dispose();
      mandorFrontTex.dispose();
      mandorBackTex.dispose();
      bestEmpTex.dispose();
      slipTex.dispose();
    },
    [cartSignTex, signKaryawanTex, mandorFrontTex, mandorBackTex, bestEmpTex, slipTex],
  );

  const puffs = steamPuffs(state.frame);

  return (
    <group name="EP04_Set">
      <KampungSet mode="malam" hideNames={[...EP04_HIDE_NAMES]} />

      {/* Pijakan Utoh & Mbak Yuni memakai palet kayu berbilah bertekstur dari kampung.glb */}

      {/* Kursi Pak Ujang & Si Oyen */}
      <Stool center={STOOLS.pakUjang.center} half={STOOLS.pakUjang.half} color={STOOLS.pakUjang.color} />
      <Stool center={STOOLS.oyen.center} half={STOOLS.oyen.half} color={STOOLS.oyen.color} />

      {/* Dandang pendek + uap miring timur */}
      <group position={[DANDANG.x, DANDANG.baseY, DANDANG.z]}>
        <mesh position={[0, DANDANG.height / 2, 0]} material={metalMat} castShadow receiveShadow>
          <cylinderGeometry args={[DANDANG.radius, DANDANG.radius * 0.96, DANDANG.height, 18]} />
        </mesh>
        <mesh position={[0, DANDANG.height - 0.008, 0]} material={brothMat}>
          <cylinderGeometry args={[DANDANG.radius * 0.92, DANDANG.radius * 0.92, 0.014, 16]} />
        </mesh>
      </group>
      <group position={DANDANG_STEAM.source}>
        {puffs.map((p, i) => (
          <mesh key={i} position={[p.x, p.y, 0]} layers={NOINK}>
            <sphereGeometry args={[p.s * 0.45, 8, 8]} />
            <meshBasicMaterial color="#fffbeb" transparent opacity={p.a} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Karton depan KARYAWAN BARU — CICIL BON 90RB (NOINK) */}
      <mesh position={EP04_SPOTS.cartSign} rotation={[0, Math.PI, 0]} layers={NOINK}>
        <planeGeometry args={CART_SIGN_SIZE} />
        <meshBasicMaterial map={cartSignTex} side={THREE.DoubleSide} />
      </mesh>

      {/* Karton atas etalase DICARI dicoret -> SUDAH DAPAT KARYAWAN (NOINK) */}
      <mesh position={EP04_SPOTS.signKaryawan} rotation={[0, Math.PI, 0]} layers={NOINK}>
        <planeGeometry args={SIGN_SIZE} />
        <meshBasicMaterial map={signKaryawanTex} side={THREE.DoubleSide} />
      </mesh>

      {/* Papan meja 2-sisi MANDOR QC <-> KEPALA MANDOR (NOINK) */}
      <group position={[EP04_SPOTS.mandorPlate[0], EP04_SPOTS.mandorPlate[1] + 0.04, EP04_SPOTS.mandorPlate[2]]} rotation={[0, Math.PI + state.mandorFlipT * Math.PI, 0]}>
        <mesh layers={NOINK}>
          <boxGeometry args={[0.13, 0.075, 0.012]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0, 0.007]} layers={NOINK}>
          <planeGeometry args={[0.128, 0.073]} />
          <meshBasicMaterial map={mandorFrontTex} />
        </mesh>
        <mesh position={[0, 0, -0.007]} rotation={[0, Math.PI, 0]} layers={NOINK}>
          <planeGeometry args={[0.128, 0.073]} />
          <meshBasicMaterial map={mandorBackTex} />
        </mesh>
      </group>

      {/* Piring ayam VIP Oyen + bendera tusuk gigi */}
      <group position={EP04_SPOTS.vipPlate}>
        <mesh position={[0, 0.01, 0]} material={plateMat} receiveShadow>
          <cylinderGeometry args={[0.056, 0.042, 0.014, 14]} />
        </mesh>
        <mesh position={[-0.012, 0.024, 0]} material={ayamMat}>
          <sphereGeometry args={[0.018, 8, 8]} />
        </mesh>
        <mesh position={[0.014, 0.024, 0.006]} material={ayamMat}>
          <sphereGeometry args={[0.016, 8, 8]} />
        </mesh>
        <mesh position={[0, 0.05, 0]} material={palletMat}>
          <cylinderGeometry args={[0.0025, 0.0025, 0.06, 6]} />
        </mesh>
        <mesh position={[0.016, 0.068, 0]} material={flagMat} layers={NOINK}>
          <boxGeometry args={[0.032, 0.02, 0.004]} />
        </mesh>
      </group>

      {/* Mangkok Pak Ujang + capit ayam + cakar Oyen saat topDownInsert */}
      {state.bowlUjangVisible && (
        <group>
          <NoodleBowl pos={EP04_SPOTS.bowlUjang} ayamCount={state.ujangAyamCount} />
          {state.insertAyamLift > 0.01 && (
            <group position={[EP04_SPOTS.bowlUjang[0], EP04_SPOTS.bowlUjang[1] + 0.1 + state.insertAyamLift * 0.09, EP04_SPOTS.bowlUjang[2]]}>
              <mesh position={[0, 0.05, 0]} material={metalMat}>
                <boxGeometry args={[0.014, 0.11, 0.008]} />
              </mesh>
              <mesh position={[0, -0.008, 0]} material={ayamMat}>
                <boxGeometry args={[0.022, 0.018, 0.022]} />
              </mesh>
            </group>
          )}
          {state.flatLayPawT > 0.01 && (
            <group
              position={[
                EP04_SPOTS.bowlUjang[0] + 0.175 - state.flatLayPawT * 0.045,
                EP04_SPOTS.bowlUjang[1] + 0.035,
                EP04_SPOTS.bowlUjang[2] - 0.115 + state.flatLayPawT * 0.035,
              ]}
              rotation={[0, 0.35, 0]}
              layers={NOINK}
            >
              {/* Lengan berbulu oranye + garis belang */}
              <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={pawMat} layers={NOINK}>
                <capsuleGeometry args={[0.022, 0.07, 6, 12]} />
              </mesh>
              <mesh position={[0.035, 0.019, 0]} layers={NOINK}>
                <boxGeometry args={[0.012, 0.008, 0.038]} />
                <meshBasicMaterial color="#9a3412" />
              </mesh>
              <mesh position={[0.06, 0.019, 0]} layers={NOINK}>
                <boxGeometry args={[0.012, 0.008, 0.036]} />
                <meshBasicMaterial color="#9a3412" />
              </mesh>
              {/* Telapak cakar + 3 jari krem */}
              <mesh position={[-0.018, 0, 0]} material={pawMat} layers={NOINK}>
                <sphereGeometry args={[0.026, 12, 12]} />
              </mesh>
              {[-0.017, 0, 0.017].map((dz, ti) => (
                <mesh key={ti} position={[-0.042, 0.002, dz]} layers={NOINK}>
                  <sphereGeometry args={[0.011, 10, 10]} />
                  <meshBasicMaterial color="#ffedd5" />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}

      {/* 3 Mangkok Mode Multithreading (Beat 5) */}
      {EP04_SPOTS.deployBowls.slice(0, state.deployBowlsCount).map((p, i) => (
        <NoodleBowl key={i} pos={p} ayamCount={3} scale={0.9} />
      ))}

      {/* Poster KARYAWAN TERBAIK BULAN INI (Beat 4, NOINK) */}
      {state.bestEmployeeVisible && (
        <mesh
          position={EP04_SPOTS.bestEmployee}
          rotation={[0, Math.PI, 0]}
          scale={1 + state.bestEmployeePop * 0.12}
          layers={NOINK}
        >
          <planeGeometry args={BEST_EMP_SIZE} />
          <meshBasicMaterial map={bestEmpTex} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Uang Pak Ujang (Beat 6) */}
      {state.cashVisible && (
        <mesh position={EP04_SPOTS.cash} rotation={[-Math.PI / 2, 0, 0.18]} material={cashMat}>
          <boxGeometry args={[0.085, 0.042, 0.006]} />
        </mesh>
      )}

      {/* Nota 3D SLIP GAJI — SHIFT 1 (Beat 7, NOINK) */}
      {state.slipInsertVisible && (
        <mesh position={EP04_SPOTS.slipInsert} rotation={[0, Math.PI, 0]} scale={0.92 + state.slipProgress * 0.08} layers={NOINK}>
          <planeGeometry args={SLIP_SIZE} />
          <meshBasicMaterial map={slipTex} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
