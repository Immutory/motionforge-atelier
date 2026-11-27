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

/**
 * 1. Kentongan Bambu + Pemukul Kayu 3D matte (khas Pos Ronda & patroli malam Indonesia).
 */
export const Kentongan3D: React.FC<
  Prop3DBaseProps & {
    bambooColor?: string;
    withMallet?: boolean;
  }
> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, bambooColor = '#c8a15a', withMallet = true }) => {
  const bambooMat = useTwoToneMaterial({ color: bambooColor }, [bambooColor]);
  const slotMat = useTwoToneMaterial({ color: '#3b2412' }, []);
  const ropeMat = useTwoToneMaterial({ color: '#5c4632' }, []);
  const malletMat = useTwoToneMaterial({ color: '#7a4b26' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      {/* Tabung bambu */}
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow material={bambooMat}>
        <cylinderGeometry args={[0.056, 0.06, 0.48, 16]} />
      </mesh>
      {/* Ruas cincin bambu atas & bawah */}
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={slotMat}>
        <torusGeometry args={[0.06, 0.005, 6, 16]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={slotMat}>
        <torusGeometry args={[0.056, 0.005, 6, 16]} />
      </mesh>
      {/* Celah bunyi vertikal */}
      <mesh position={[0, 0.24, 0.055]} material={slotMat}>
        <boxGeometry args={[0.022, 0.28, 0.012]} />
      </mesh>
      {/* Tali gantung */}
      <mesh position={[0, 0.51, 0]} castShadow material={ropeMat}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
      </mesh>
      {withMallet ? (
        <group position={[0.09, 0.16, 0.03]} rotation={[0.1, 0.1, -0.35]}>
          <mesh castShadow material={malletMat}>
            <cylinderGeometry args={[0.013, 0.011, 0.26, 10]} />
          </mesh>
          <mesh position={[0, 0.12, 0]} castShadow material={malletMat}>
            <sphereGeometry args={[0.02, 10, 8]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

/**
 * 2. Sandal Jepit khas Indonesia 3D matte (mode sepasang atau tunggal).
 */
export const SandalJepit3D: React.FC<
  Prop3DBaseProps & {
    strapColor?: string;
    soleColor?: string;
    pair?: boolean;
  }
> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, strapColor = '#1d6ec2', soleColor = '#f4f1ea', pair = true }) => {
  const soleMat = useTwoToneMaterial({ color: soleColor }, [soleColor]);
  const strapMat = useTwoToneMaterial({ color: strapColor }, [strapColor]);
  const offsets = pair ? [-0.065, 0.065] : [0];

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      {offsets.map((ox, idx) => (
        <group key={idx} position={[ox, 0, 0]} rotation={[0, idx === 0 ? 0.06 : -0.08, 0]}>
          <mesh position={[0, 0.008, 0]} castShadow receiveShadow material={soleMat}>
            <boxGeometry args={[0.095, 0.016, 0.25]} />
          </mesh>
          <mesh position={[-0.022, 0.024, 0.02]} rotation={[0.32, 0.25, -0.25]} castShadow material={strapMat}>
            <cylinderGeometry args={[0.006, 0.006, 0.095, 8]} />
          </mesh>
          <mesh position={[0.022, 0.024, 0.02]} rotation={[0.32, -0.25, 0.25]} castShadow material={strapMat}>
            <cylinderGeometry args={[0.006, 0.006, 0.095, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * 3a. Toples Kerupuk Warung 3D (tabung bening bertutup warna + isi kerupuk putih).
 */
export const ToplesKerupuk3D: React.FC<
  Prop3DBaseProps & {
    lidColor?: string;
  }
> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, lidColor = '#1e64b8' }) => {
  const lidMat = useTwoToneMaterial({ color: lidColor }, [lidColor]);
  const kerupukMat = useTwoToneMaterial({ color: '#f3ebd8' }, []);
  const glassMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#dff2f8',
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => glassMat.dispose(), [glassMat]);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh
        position={[0, 0.13, 0]}
        material={glassMat}
        renderOrder={2}
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
      >
        <cylinderGeometry args={[0.095, 0.095, 0.26, 18]} />
      </mesh>
      {[0.055, 0.115, 0.175].map((ky, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -0.015 : 0.018, ky, i === 1 ? 0.015 : -0.01]} castShadow material={kerupukMat}>
          <dodecahedronGeometry args={[0.055, 0]} />
        </mesh>
      ))}
      <mesh position={[0, 0.275, 0]} castShadow receiveShadow material={lidMat}>
        <cylinderGeometry args={[0.1, 0.098, 0.036, 18]} />
      </mesh>
    </group>
  );
};

/**
 * 3b. Piring Gorengan + Cabai Rawit Hijau 3D matte (khas Warkop & Pos Ronda).
 */
export const GorenganPlate3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const plateMat = useTwoToneMaterial({ color: '#c88c42' }, []);
  const friedMat = useTwoToneMaterial({ color: '#c97c24' }, []);
  const chiliMat = useTwoToneMaterial({ color: '#3c9638' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow material={plateMat}>
        <cylinderGeometry args={[0.105, 0.075, 0.02, 18]} />
      </mesh>
      {[
        [-0.038, 0.03, -0.02, 0.2],
        [0.036, 0.03, -0.018, -0.35],
        [-0.02, 0.032, 0.036, 0.4],
        [0.022, 0.048, 0.015, -0.15],
      ].map(([gx, gy, gz, rotY], i) => (
        <mesh key={i} position={[gx, gy, gz]} rotation={[0.15, rotY, 0.08]} castShadow material={friedMat}>
          <boxGeometry args={[0.068, 0.022, 0.048]} />
        </mesh>
      ))}
      <mesh position={[0.06, 0.026, 0.04]} rotation={[0.2, 0.6, 1.3]} material={chiliMat}>
        <cylinderGeometry args={[0.004, 0.008, 0.038, 8]} />
      </mesh>
    </group>
  );
};

/**
 * 4a. Tabung Gas LPG 3 Kg ("Gas Melon" hijau khas Indonesia) 3D matte.
 */
export const TabungGas3kg3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const greenMat = useTwoToneMaterial({ color: '#6ba84f' }, []);
  const ringMat = useTwoToneMaterial({ color: '#4c7e38' }, []);
  const valveMat = useTwoToneMaterial({ color: '#b59442' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow material={ringMat}>
        <cylinderGeometry args={[0.115, 0.125, 0.04, 16]} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow material={greenMat}>
        <cylinderGeometry args={[0.13, 0.13, 0.28, 18]} />
      </mesh>
      <mesh position={[0, 0.32, 0]} scale={[1, 0.55, 1]} castShadow material={greenMat}>
        <sphereGeometry args={[0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.385, 0]} castShadow material={ringMat}>
        <cylinderGeometry args={[0.075, 0.082, 0.055, 14, 1, true]} />
      </mesh>
      <mesh position={[0, 0.38, 0]} material={valveMat}>
        <cylinderGeometry args={[0.014, 0.014, 0.05, 8]} />
      </mesh>
    </group>
  );
};

/**
 * 4b. Galon Air Mineral 19L 3D (biru bening bertutup biru tua).
 */
export const Galon3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const capMat = useTwoToneMaterial({ color: '#1b4f9c' }, []);
  const bodyMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#4da3e0',
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.19, 0]} castShadow material={bodyMat} renderOrder={2}>
        <cylinderGeometry args={[0.135, 0.135, 0.38, 18]} />
      </mesh>
      <mesh position={[0, 0.41, 0]} material={bodyMat} renderOrder={2}>
        <cylinderGeometry args={[0.036, 0.132, 0.065, 16]} />
      </mesh>
      <mesh position={[0, 0.455, 0]} castShadow material={capMat}>
        <cylinderGeometry args={[0.034, 0.034, 0.036, 12]} />
      </mesh>
    </group>
  );
};

/**
 * 5. Sapu Lidi 3D matte (berkas lidi kelapa + ikatan rotan + gagang).
 */
export const SapuLidi3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const lidiMat = useTwoToneMaterial({ color: '#b89452' }, []);
  const tieMat = useTwoToneMaterial({ color: '#6b3e22' }, []);
  const handleMat = useTwoToneMaterial({ color: '#8f6538' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow material={lidiMat}>
        <cylinderGeometry args={[0.028, 0.105, 0.48, 12]} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow material={tieMat}>
        <cylinderGeometry args={[0.032, 0.035, 0.07, 12]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow material={handleMat}>
        <cylinderGeometry args={[0.016, 0.022, 0.68, 10]} />
      </mesh>
    </group>
  );
};

/**
 * 6a. Papan Catur 8x8 + Bidak Miniatur 3D matte (untuk Pos Ronda & Warkop).
 */
export const PapanCatur3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const frameMat = useTwoToneMaterial({ color: '#4d311c' }, []);
  const whitePieceMat = useTwoToneMaterial({ color: '#f2ead8' }, []);
  const blackPieceMat = useTwoToneMaterial({ color: '#262320' }, []);
  const boardTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      const sq = 32;
      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 8; col++) {
          ctx.fillStyle = (r + col) % 2 === 0 ? '#efe3c6' : '#3a2a1e';
          ctx.fillRect(col * sq, r * sq, sq, sq);
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const boardMat = useMemo(() => new THREE.MeshBasicMaterial({ map: boardTex }), [boardTex]);
  useEffect(
    () => () => {
      boardMat.dispose();
      boardTex.dispose();
    },
    [boardMat, boardTex],
  );

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow material={frameMat}>
        <boxGeometry args={[0.38, 0.02, 0.38]} />
      </mesh>
      <mesh
        position={[0, 0.021, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={boardMat}
        ref={(m) => {
          if (m) m.layers.set(NOINK);
        }}
      >
        <planeGeometry args={[0.34, 0.34]} />
      </mesh>
      {[
        [-0.08, -0.09, true],
        [0.04, -0.04, true],
        [-0.02, 0.08, false],
        [0.09, 0.05, false],
      ].map(([px, pz, isW], idx) => (
        <mesh key={idx} position={[px as number, 0.042, pz as number]} castShadow material={isW ? whitePieceMat : blackPieceMat}>
          <cylinderGeometry args={[0.011, 0.015, 0.042, 8]} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * 6b. Kardus Mie Instan 3D matte (cokelat kraft + strip merah-kuning khas warung Indonesia).
 */
export const KardusMie3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const boxMat = useTwoToneMaterial({ color: '#b5844c' }, []);
  const stripeMat = useTwoToneMaterial({ color: '#c9342c' }, []);
  const tapeMat = useTwoToneMaterial({ color: '#d8be84' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      <mesh position={[0, 0.125, 0]} castShadow receiveShadow material={boxMat}>
        <boxGeometry args={[0.34, 0.25, 0.24]} />
      </mesh>
      <mesh position={[0, 0.14, 0.121]} material={stripeMat}>
        <boxGeometry args={[0.3, 0.06, 0.004]} />
      </mesh>
      <mesh position={[0, 0.251, 0]} material={tapeMat}>
        <boxGeometry args={[0.342, 0.004, 0.045]} />
      </mesh>
    </group>
  );
};

/**
 * 7. Megaphone / TOA Tangan 3D matte (corong putih + bibir merah + gagang) untuk pengumuman RT / ronda.
 */
export const MegaphoneToa3D: React.FC<Prop3DBaseProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const bodyMat = useTwoToneMaterial({ color: '#f0eee6' }, []);
  const redMat = useTwoToneMaterial({ color: '#c82e2b' }, []);
  const gripMat = useTwoToneMaterial({ color: '#2b2f38' }, []);

  return (
    <group position={position} rotation={rotation} scale={normalizeScale(scale)}>
      {/* Corong menghadap +Z */}
      <mesh position={[0, 0.1, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={bodyMat}>
        <cylinderGeometry args={[0.105, 0.044, 0.24, 18]} />
      </mesh>
      {/* Lis merah mulut corong */}
      <mesh position={[0, 0.1, 0.18]} castShadow material={redMat}>
        <torusGeometry args={[0.105, 0.008, 8, 18]} />
      </mesh>
      {/* Badan belakang speaker */}
      <mesh position={[0, 0.1, -0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow material={redMat}>
        <cylinderGeometry args={[0.045, 0.042, 0.09, 14]} />
      </mesh>
      {/* Gagang pistol */}
      <mesh position={[0, 0.02, -0.05]} rotation={[0.25, 0, 0]} castShadow material={gripMat}>
        <boxGeometry args={[0.032, 0.12, 0.042]} />
      </mesh>
    </group>
  );
};
