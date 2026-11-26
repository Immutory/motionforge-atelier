import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { useTwoToneMaterial } from '../stage/Stage';

export type Prop3DBaseProps = {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
};

function normalizeScale(scale?: number | Vec3): Vec3 {
  if (scale === undefined) return [1, 1, 1];
  return typeof scale === 'number' ? [scale, scale, scale] : scale;
}

/**
 * Mangkuk Bakmie 3D matte terkalibrasi (`useTwoToneMaterial`, zero kilap plastik).
 * Cocok ditempel langsung ke tangan karakter 2D via `actorHandWorldPos()` atau diletakkan di meja/konter.
 */
export const BakmieBowl3D: React.FC<
  Prop3DBaseProps & {
    bowlColor?: string;
    rimColor?: string;
    withChopsticks?: boolean;
  }
> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, bowlColor = '#f4efe4', rimColor = '#c9473a', withChopsticks = true }) => {
  const bowlMat = useTwoToneMaterial({ color: bowlColor }, [bowlColor]);
  const rimMat = useTwoToneMaterial({ color: rimColor }, [rimColor]);
  const noodleMat = useTwoToneMaterial({ color: '#e6b84c' }, []);
  const brothMat = useTwoToneMaterial({ color: '#b57b3a' }, []);
  const greenMat = useTwoToneMaterial({ color: '#4d8a3f' }, []);
  const chickenMat = useTwoToneMaterial({ color: '#c48d56' }, []);
  const stickMat = useTwoToneMaterial({ color: '#8f5d38' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      {/* Kaki mangkuk */}
      <mesh position={[0, 0.009, 0]} castShadow receiveShadow material={bowlMat}>
        <cylinderGeometry args={[0.044, 0.04, 0.018, 18]} />
      </mesh>
      {/* Badan mangkuk */}
      <mesh position={[0, 0.046, 0]} castShadow receiveShadow material={bowlMat}>
        <cylinderGeometry args={[0.088, 0.046, 0.068, 20]} />
      </mesh>
      {/* Lis bibir mangkuk khas ayam jago */}
      <mesh position={[0, 0.079, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={rimMat}>
        <torusGeometry args={[0.088, 0.0045, 8, 22]} />
      </mesh>
      {/* Permukaan kuah */}
      <mesh position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={brothMat}>
        <circleGeometry args={[0.081, 20]} />
      </mesh>
      {/* Gundukan mie kuning */}
      <mesh position={[0, 0.072, 0]} scale={[1, 0.34, 1]} castShadow receiveShadow material={noodleMat}>
        <sphereGeometry args={[0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
      {/* Topping ayam kecap & sawi hijau */}
      <mesh position={[-0.025, 0.082, 0.015]} scale={[1.1, 0.55, 0.9]} castShadow material={chickenMat}>
        <sphereGeometry args={[0.024, 12, 10]} />
      </mesh>
      <mesh position={[0.028, 0.08, -0.012]} scale={[1.2, 0.45, 0.85]} castShadow material={greenMat}>
        <sphereGeometry args={[0.024, 12, 10]} />
      </mesh>
      {withChopsticks ? (
        <group position={[0.02, 0.088, 0.01]} rotation={[0.08, 0.42, -0.18]}>
          <mesh position={[0, 0, -0.006]} rotation={[0, 0, Math.PI / 2]} castShadow material={stickMat}>
            <cylinderGeometry args={[0.0028, 0.0038, 0.19, 8]} />
          </mesh>
          <mesh position={[0, 0, 0.006]} rotation={[0, 0.06, Math.PI / 2]} castShadow material={stickMat}>
            <cylinderGeometry args={[0.0028, 0.0038, 0.19, 8]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

/**
 * Gelas Kopi / Minuman 3D matte terkalibrasi (`useTwoToneMaterial`), siap dipakai di tangan via `actorHandWorldPos()`.
 */
export const DrinkCup3D: React.FC<
  Prop3DBaseProps & {
    cupColor?: string;
    rimColor?: string;
    liquidColor?: string;
    withStraw?: boolean;
  }
> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  cupColor = '#d97736',
  rimColor = '#f7eee2',
  liquidColor = '#2b1810',
  withStraw = false,
}) => {
  const cupMat = useTwoToneMaterial({ color: cupColor }, [cupColor]);
  const rimMat = useTwoToneMaterial({ color: rimColor }, [rimColor]);
  const liquidMat = useTwoToneMaterial({ color: liquidColor }, [liquidColor]);
  const strawMat = useTwoToneMaterial({ color: '#e5534b' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh castShadow receiveShadow material={cupMat}>
        <cylinderGeometry args={[0.044, 0.036, 0.098, 18]} />
      </mesh>
      <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow material={rimMat}>
        <torusGeometry args={[0.044, 0.004, 8, 18]} />
      </mesh>
      <mesh position={[0, 0.044, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={liquidMat}>
        <circleGeometry args={[0.04, 18]} />
      </mesh>
      {withStraw ? (
        <mesh position={[0.012, 0.072, 0]} rotation={[0, 0, -0.22]} castShadow material={strawMat}>
          <cylinderGeometry args={[0.0032, 0.0032, 0.09, 8]} />
        </mesh>
      ) : null}
    </group>
  );
};

function makeNoteTexture(
  title: string,
  subtitle: string | undefined,
  bgColor: string,
  inkColor: string,
  borderColor: string,
): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = inkColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 58px system-ui, Segoe UI, sans-serif';
    ctx.fillText(title, w / 2, subtitle ? h * 0.4 : h * 0.5, w - 64);
    if (subtitle) {
      ctx.font = '700 34px system-ui, Segoe UI, sans-serif';
      ctx.globalAlpha = 0.86;
      ctx.fillText(subtitle, w / 2, h * 0.68, w - 64);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Catatan / Kertas Laminated Diegetik 3D (`CanvasTexture` bersih di layer `NOINK`, dispose otomatis).
 */
export const DiegeticNote3D: React.FC<
  Prop3DBaseProps & {
    title: string;
    subtitle?: string;
    width?: number;
    height?: number;
    bgColor?: string;
    inkColor?: string;
    borderColor?: string;
  }
> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  title,
  subtitle,
  width = 0.34,
  height = 0.21,
  bgColor = '#f7eed8',
  inkColor = '#211c17',
  borderColor = '#b54a35',
}) => {
  const backingMat = useTwoToneMaterial({ color: '#d8cdb8' }, []);
  const tex = useMemo(
    () => makeNoteTexture(title, subtitle, bgColor, inkColor, borderColor),
    [title, subtitle, bgColor, inkColor, borderColor],
  );
  const faceMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex }), [tex]);

  useEffect(
    () => () => {
      faceMat.dispose();
      tex.dispose();
    },
    [faceMat, tex],
  );

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh castShadow receiveShadow material={backingMat}>
        <boxGeometry args={[width, height, 0.008]} />
      </mesh>
      <mesh
        position={[0, 0, 0.0048]}
        material={faceMat}
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
      >
        <planeGeometry args={[width * 0.96, height * 0.94]} />
      </mesh>
    </group>
  );
};

/**
 * Papan Nama / Plang 3D berbingkai kayu/besi matte dengan wajah teks tajam anti-ink (`NOINK`).
 */
export const BoxSign3D: React.FC<
  Prop3DBaseProps & {
    title: string;
    subtitle?: string;
    width?: number;
    height?: number;
    depth?: number;
    frameColor?: string;
    faceColor?: string;
    textColor?: string;
  }
> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  title,
  subtitle,
  width = 0.72,
  height = 0.34,
  depth = 0.05,
  frameColor = '#4a3525',
  faceColor = '#f5ecd7',
  textColor = '#1e1916',
}) => {
  const frameMat = useTwoToneMaterial({ color: frameColor }, [frameColor]);
  const tex = useMemo(
    () => makeNoteTexture(title, subtitle, faceColor, textColor, frameColor),
    [title, subtitle, faceColor, textColor, frameColor],
  );
  const faceMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex }), [tex]);

  useEffect(
    () => () => {
      faceMat.dispose();
      tex.dispose();
    },
    [faceMat, tex],
  );

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh castShadow receiveShadow material={frameMat}>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      <mesh
        position={[0, 0, depth * 0.5 + 0.002]}
        material={faceMat}
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
      >
        <planeGeometry args={[width * 0.92, height * 0.86]} />
      </mesh>
    </group>
  );
};

/**
 * Ponsel 3D matte dengan layar menyala lembut di bawah ambang bloom (`0.88`).
 */
export const Phone3D: React.FC<
  Prop3DBaseProps & {
    bodyColor?: string;
    screenColor?: string;
  }
> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, bodyColor = '#242933', screenColor = '#7ec8e3' }) => {
  const bodyMat = useTwoToneMaterial({ color: bodyColor }, [bodyColor]);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ color: screenColor }), [screenColor]);
  useEffect(() => () => screenMat.dispose(), [screenMat]);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh castShadow receiveShadow material={bodyMat}>
        <boxGeometry args={[0.074, 0.148, 0.009]} />
      </mesh>
      <mesh
        position={[0, 0.002, 0.0052]}
        material={screenMat}
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
      >
        <planeGeometry args={[0.066, 0.132]} />
      </mesh>
    </group>
  );
};

/**
 * Laptop 3D matte siap pakai di meja warkop/kost/kampus atau digenggam karakter.
 */
export const Laptop3D: React.FC<
  Prop3DBaseProps & {
    bodyColor?: string;
    screenColor?: string;
    /** Sudut bukaan layar dalam derajat (default 108°). */
    lidAngleDeg?: number;
  }
> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  bodyColor = '#3a404a',
  screenColor = '#2c3d55',
  lidAngleDeg = 108,
}) => {
  const bodyMat = useTwoToneMaterial({ color: bodyColor }, [bodyColor]);
  const keysMat = useTwoToneMaterial({ color: '#1d2026' }, []);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ color: screenColor }), [screenColor]);
  useEffect(() => () => screenMat.dispose(), [screenMat]);

  const lidRad = -((180 - lidAngleDeg) * Math.PI) / 180;

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      {/* Base laptop */}
      <mesh position={[0, 0.008, 0]} castShadow receiveShadow material={bodyMat}>
        <boxGeometry args={[0.32, 0.015, 0.22]} />
      </mesh>
      {/* Keyboard deck */}
      <mesh position={[0, 0.0162, 0.008]} receiveShadow material={keysMat}>
        <boxGeometry args={[0.275, 0.002, 0.115]} />
      </mesh>
      {/* Engsel + layar */}
      <group position={[0, 0.014, -0.106]} rotation={[lidRad, 0, 0]}>
        <mesh position={[0, 0.108, 0]} castShadow receiveShadow material={bodyMat}>
          <boxGeometry args={[0.32, 0.215, 0.009]} />
        </mesh>
        <mesh
          position={[0, 0.108, 0.0052]}
          material={screenMat}
          ref={(m) => {
            if (m) m.layers.set(NOINK);
          }}
        >
          <planeGeometry args={[0.295, 0.188]} />
        </mesh>
      </group>
    </group>
  );
};
