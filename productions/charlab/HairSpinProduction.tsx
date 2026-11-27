import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CAST_PRESETS, blinkLidAt, drawActor, type CastPresetId } from '../../engine';

/**
 * QC Rambut 360° Close-Up (Atelier v5.0) — 15 detik @30fps (450 frame), murni Canvas2D (tanpa three.js):
 * - f0..239   : putaran LAMBAT 0°→360° (1,5°/frame) — transisi depan → ¾ → profil → belakang terlihat jelas.
 * - f240..359 : putaran NORMAL 0°→360° (3°/frame) — kecepatan seperti di adegan.
 * - f360..449 : putaran `shock` 0°→360° (4°/frame) — topi/helm terangkat (`hatPop: 1`), cek rambut di balik headgear.
 */
const ROW_TOP: CastPresetId[] = ['arya', 'dimas', 'tio', 'buSiti', 'pakBudi', 'bangUdin', 'mbakYuni'];
const ROW_BOTTOM: CastPresetId[] = ['raka', 'rara', 'bangUtoh', 'ebot', 'pakUjang', 'saka'];
const NAMES: Record<CastPresetId, string> = {
  arya: 'Arya',
  dimas: 'Dimas',
  tio: 'Tio',
  buSiti: 'Bu Siti',
  pakBudi: 'Pak Budi',
  bangUdin: 'Bang Udin',
  mbakYuni: 'Mbak Yuni',
  raka: 'Raka',
  rara: 'Rara',
  bangUtoh: 'Bang Utoh',
  ebot: 'Ebot',
  pakUjang: 'Pak Ujang',
  saka: 'Saka',
};

const SRC_X = 80;
const SRC_Y = 0;
const SRC_W = 540;
const SRC_H = 620;
const CELL_W = 262;
const CELL_H = Math.round((CELL_W * SRC_H) / SRC_W);

export const HAIRSPIN_FRAMES = 450;

function phaseAt(frame: number) {
  if (frame < 240) return { yaw: (frame / 240) * 360, label: 'PUTARAN LAMBAT', shock: false };
  if (frame < 360) return { yaw: ((frame - 240) / 120) * 360, label: 'PUTARAN NORMAL', shock: false };
  return { yaw: ((frame - 360) / 90) * 360, label: 'SHOCK · TOPI/HELM TERANGKAT', shock: true };
}

function viewName(yaw: number) {
  const a = Math.abs(yaw);
  if (a <= 15) return 'DEPAN';
  if (a <= 67) return yaw > 0 ? '¾ KANAN' : '¾ KIRI';
  if (a <= 112) return yaw > 0 ? 'PROFIL KANAN' : 'PROFIL KIRI';
  if (a <= 165) return yaw > 0 ? '¾ BELAKANG KANAN' : '¾ BELAKANG KIRI';
  return 'BELAKANG';
}

export const HairSpinProduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 700;
    c.height = 1100;
    return c;
  }, []);

  const { yaw, label, shock } = phaseAt(frame);
  const wrapped = ((((yaw + 180) % 360) + 360) % 360) - 180;

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const octx = off.getContext('2d')!;

    // Latar studio abu lembut + grid tipis agar siluet rambut kontras
    ctx.fillStyle = '#e9e6ef';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(60, 50, 80, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const drawRow = (ids: CastPresetId[], top: number) => {
      const gap = 10;
      const rowW = ids.length * CELL_W + (ids.length - 1) * gap;
      const x0 = (width - rowW) / 2;
      ids.forEach((id, i) => {
        const x = x0 + i * (CELL_W + gap);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.roundRect(x, top, CELL_W, CELL_H + 44, 16);
        ctx.fill();

        const blink = blinkLidAt(frame, i * 7 + (top > 400 ? 3 : 0));
        drawActor(octx, id, {
          face: shock ? 'shock' : 'neutral',
          stance: 'stand',
          view: 'front',
          yawDeg: wrapped,
          blink: shock ? 0 : blink,
          hatPop: shock ? 1 : 0,
          fx: 'none',
        });
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, top, CELL_W, CELL_H, 16);
        ctx.clip();
        ctx.drawImage(off, SRC_X, SRC_Y, SRC_W, SRC_H, x, top, CELL_W, CELL_H);
        ctx.restore();

        ctx.fillStyle = '#1d1a26';
        ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(NAMES[id], x + CELL_W / 2, top + CELL_H + 22);
        ctx.fillStyle = '#6b6478';
        ctx.font = '500 15px "Segoe UI", Arial, sans-serif';
        ctx.fillText(CAST_PRESETS[id].hairStyle, x + CELL_W / 2, top + CELL_H + 39);
      });
    };
    drawRow(ROW_TOP, 112);
    drawRow(ROW_BOTTOM, 112 + CELL_H + 62);

    // HUD sudut yaw
    ctx.fillStyle = '#1d1a26';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 430, 18, 860, 74, 20);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`YAW ${Math.round(wrapped)}°  ·  ${viewName(wrapped)}`, width / 2, 58);
    ctx.fillStyle = '#9fd6ff';
    ctx.font = '600 17px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`QC RAMBUT 360° · ${label} · ${(frame / 30).toFixed(1)} s / 15 s`, width / 2, 82);

    // Progres putaran
    ctx.fillStyle = 'rgba(29, 26, 38, 0.15)';
    ctx.fillRect(80, height - 18, width - 160, 6);
    ctx.fillStyle = shock ? '#ff7a59' : '#4f8cff';
    ctx.fillRect(80, height - 18, ((width - 160) * frame) / (HAIRSPIN_FRAMES - 1), 6);
  }, [frame, width, height, off, wrapped, shock, label]);

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
