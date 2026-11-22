import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Vec3 } from '../core/easing';
import { NOINK } from '../post/layers';
import { twoTone } from '../stage/shade';

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<THREE.Group>>();

function loadGlbScene(url: string): Promise<THREE.Group> {
  const cached = gltfCache.get(url);
  if (cached) return cached;
  const p = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err),
    );
  });
  gltfCache.set(url, p);
  return p;
}

function isTextMesh(name: string): boolean {
  return (
    name.endsWith('_Curve') ||
    name.includes('Title') ||
    name.includes('SignMain') ||
    name.includes('SignSub') ||
    name.includes('MenuLine') ||
    name.includes('PosterCode') ||
    name.includes('PosterSub') ||
    name.includes('BoardHead') ||
    name.includes('CrestTxt')
  );
}

function isFlatPanel(name: string): boolean {
  return name.includes('SignBoxFace') || name.includes('WinGlass') || name.includes('Scr');
}

function isCeiling(name: string): boolean {
  return name.includes('Ceiling');
}

function clampAlbedoForBloom(col: THREE.Color, maxLum = 0.62): THREE.Color {
  const c = col.clone();
  const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  if (lum > maxLum) {
    c.multiplyScalar(maxLum / lum);
  }
  return c;
}

function hashName(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

export type TimeOfDayMode = 'day' | 'golden' | 'night';

function isStreetLampMesh(name: string): boolean {
  return (
    name.includes('StreetBulb') ||
    name.includes('ParkBollard_Glow') ||
    name.includes('PosRonda_Lamp') ||
    name.includes('WK_LampShade') ||
    name.includes('WK_LampBulb') ||
    name.includes('Kost_LampBulb')
  );
}

function isTrafficLightLens(name: string): 'red' | 'yel' | 'grn' | null {
  if (!name.includes('TrafficLight_')) return null;
  if (name.endsWith('_Red')) return 'red';
  if (name.endsWith('_Yel')) return 'yel';
  if (name.endsWith('_Grn')) return 'grn';
  return null;
}

function isWindowGlowMesh(name: string): boolean {
  return (
    name.includes('WinBand') ||
    name.includes('_Win1_') ||
    name.includes('_Win2_') ||
    name.includes('ATM_GlassFront') ||
    name.includes('Satpam_Win')
  );
}

function convertMaterial(
  meshName: string,
  src: THREE.Material,
  glowScale: number,
  noTextShadow: boolean,
  timeOfDay: TimeOfDayMode = 'day',
): { mat: THREE.Material; noInk: boolean; castShadow: boolean } {
  if (!(src instanceof THREE.MeshStandardMaterial)) {
    return { mat: src.clone(), noInk: noTextShadow, castShadow: !noTextShadow && !isCeiling(meshName) };
  }

  // 0. Override Dinamis Waktu (Mode Siang / Sore Golden Hour / Malam Hari)
  const tlLens = isTrafficLightLens(meshName);
  if (tlLens) {
    const tlBoost = timeOfDay === 'night' ? 2.1 : timeOfDay === 'golden' ? 1.65 : 1.15;
    const col =
      tlLens === 'red'
        ? new THREE.Color(1.0 * tlBoost, 0.14 * tlBoost, 0.12 * tlBoost)
        : tlLens === 'yel'
          ? new THREE.Color(1.0 * tlBoost, 0.82 * tlBoost, 0.12 * tlBoost)
          : new THREE.Color(0.14 * tlBoost, 0.95 * tlBoost, 0.34 * tlBoost);
    return { mat: new THREE.MeshBasicMaterial({ color: col }), noInk: true, castShadow: false };
  }

  if (isStreetLampMesh(meshName) && (timeOfDay === 'golden' || timeOfDay === 'night')) {
    const k = timeOfDay === 'night' ? 2.05 : 1.45;
    return {
      mat: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0 * k, 0.84 * k, 0.44 * k) }),
      noInk: true,
      castShadow: false,
    };
  }

  if (isWindowGlowMesh(meshName) && (timeOfDay === 'golden' || timeOfDay === 'night')) {
    const h = hashName(meshName);
    const litChance = timeOfDay === 'night' ? 72 : 38;
    if (meshName.includes('ATM_GlassFront') || h < litChance) {
      const warm = meshName.includes('ATM_GlassFront')
        ? new THREE.Color(0.75, 1.05, 1.35)
        : timeOfDay === 'night'
          ? h % 3 === 0
            ? new THREE.Color(1.38, 1.16, 0.72)
            : new THREE.Color(1.25, 0.96, 0.54)
          : new THREE.Color(1.05, 0.86, 0.52);
      return { mat: new THREE.MeshBasicMaterial({ color: warm }), noInk: true, castShadow: false };
    }
  }

  // 1. Material Emissive / Lampu / Layar Monitor (hanya lampu/kode kecil yang melampaui threshold bloom > 1.0)
  const em = src.emissive;
  const emLum = em.r * 0.299 + em.g * 0.587 + em.b * 0.114;
  if (emLum > 0.015 && src.emissiveIntensity > 0.12) {
    const hdr = em.clone();
    if (isFlatPanel(meshName)) {
      // Panel besar (papan neon, kaca jendela, layar dasar) tetap cerah self-lit tanpa bloom yang memudarkan teks!
      const peak = Math.max(hdr.r, hdr.g, hdr.b, 0.001);
      const nightPanelLift = timeOfDay === 'night' ? 1.12 : timeOfDay === 'golden' ? 0.98 : 0.86;
      const targetPeak = Math.min(nightPanelLift, peak * Math.max(0.85, src.emissiveIntensity * 0.72));
      hdr.multiplyScalar(targetPeak / peak);
    } else {
      const boost = Math.min(2.1, Math.max(1.05, src.emissiveIntensity * glowScale * 0.85));
      hdr.multiplyScalar(boost);
    }
    return {
      mat: new THREE.MeshBasicMaterial({ color: hdr }),
      noInk: noTextShadow || isFlatPanel(meshName),
      castShadow: false,
    };
  }

  // 2. Material Kaca / Transparan (etalase gorengan, galon air biru): masuk layer NOINK agar tembus pandang bersih!
  if (src.transparent || src.opacity < 0.95) {
    return {
      mat: new THREE.MeshLambertMaterial({
        color: src.color.clone(),
        transparent: true,
        opacity: Math.max(0.18, src.opacity),
        depthWrite: false,
      }),
      noInk: true,
      castShadow: false,
    };
  }

  // 3. Teks 3D / Papan Nama dari Blender: warna solid tajam di layer NOINK; menyala neon hangat saat mode Malam/Golden!
  if (noTextShadow) {
    const baseTxt = clampAlbedoForBloom(src.color, timeOfDay === 'night' ? 1.25 : 0.86);
    if (timeOfDay === 'night') {
      baseTxt.multiplyScalar(1.22);
    } else if (timeOfDay === 'golden') {
      baseTxt.multiplyScalar(1.08);
    }
    return {
      mat: new THREE.MeshBasicMaterial({ color: baseTxt }),
      noInk: true,
      castShadow: false,
    };
  }

  // 4. Material Dunia 3D Solid & PBR Textured: konversi ke shader twoTone() dengan dukungan penuh Albedo Map + Normal Map!
  const hasTex = Boolean(src.map);
  if (src.map) {
    src.map.colorSpace = THREE.SRGBColorSpace;
    src.map.anisotropy = 8;
  }
  const safeCol = clampAlbedoForBloom(src.color, hasTex ? 0.76 : 0.62);
  const ceil = isCeiling(meshName);
  if (src.metalness > 0.35 || src.normalMap || hasTex) {
    const params: THREE.MeshPhongMaterialParameters = {
      color: safeCol,
      shininess: src.metalness > 0.35 ? 48 : 16,
      specular: new THREE.Color(src.metalness > 0.35 ? 0x333842 : 0x141210),
    };
    if (src.map) params.map = src.map;
    if (src.normalMap) {
      params.normalMap = src.normalMap;
      params.normalScale = new THREE.Vector2(0.85, 0.85);
    }
    return {
      mat: twoTone(new THREE.MeshPhongMaterial(params)),
      noInk: false,
      castShadow: !ceil,
    };
  }

  const params: THREE.MeshLambertMaterialParameters = { color: safeCol };
  return {
    mat: twoTone(new THREE.MeshLambertMaterial(params)),
    noInk: false,
    castShadow: !ceil,
  };
}

export type GlbSetProps = {
  /** Path relatif di dalam folder `public/` (mis. `sets/warkop.glb`). */
  src: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  /** Pengali kekuatan cahaya emissive/lampu/layar (default 0.95 siang, 1.35 malam/senja). */
  glowScale?: number;
  /** Mode waktu untuk menghidupkan lampu jalan, traffic light, neon sign, dan jendela gedung (`day` / `golden` / `night`). */
  timeOfDay?: TimeOfDayMode;
  /** Mode darurat/error: mengubah cahaya kode monitor & LED strip menjadi merah HDR dramatis! */
  errorAlert?: boolean;
  /** Daftar nama mesh yang disembunyikan sementara (mis. tiang lampu yang menghalangi kamera wide). */
  hideNames?: string[];
};

/**
 * Loader set 3D hasil Blender (.glb) untuk Remotion + Three.js:
 * - Menahan render Remotion via `delayRender` sejak mount hingga model masuk scene & selesai tergambar di WebGL.
 * - Otomatis mengonversi material Blender ke shader `twoTone()` agar menyatu dengan karakter 2D dan InkPass.
 * - Menjaga kaca transparan & teks 3D di layer `NOINK` agar tetap bening dan terbaca tajam.
 */
export const GlbSet: React.FC<GlbSetProps> = ({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  glowScale = 1.0,
  timeOfDay = 'day',
  errorAlert = false,
  hideNames,
}) => {
  const mountRef = useRef<THREE.Group>(null);
  const { advance, invalidate } = useThree();
  const url = staticFile(src);
  const hideKey = hideNames?.join(',') ?? '';

  // Registrasi delayRender secara sinkron saat render pertama agar Remotion tidak memotret frame kosong!
  const pendingKeyRef = useRef<string | null>(null);
  const handleRef = useRef<number | null>(null);
  const key = `${url}|${glowScale}|${timeOfDay}|${errorAlert ? 1 : 0}|${hideKey}`;
  if (pendingKeyRef.current !== key) {
    if (handleRef.current !== null) {
      continueRender(handleRef.current);
      handleRef.current = null;
    }
    pendingKeyRef.current = key;
    handleRef.current = delayRender(`GlbSet:${src}`);
  }

  useEffect(() => {
    let alive = true;
    const handle = handleRef.current;
    const createdMats: THREE.Material[] = [];
    let attached: THREE.Group | null = null;

    loadGlbScene(url)
      .then((template) => {
        if (!alive) return;
        const clone = template.clone(true);
        const hideSet = hideNames && hideNames.length > 0 ? new Set(hideNames) : null;
        clone.traverse((node) => {
          if (hideSet && (hideSet.has(node.name) || [...hideSet].some((h) => node.name.startsWith(h)))) {
            node.visible = false;
            return;
          }
          node.visible = true;
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;
          const textFlag = isTextMesh(node.name);
          const orig = node.material;
          const isAlertMesh =
            errorAlert &&
            (node.name.includes('Code') || node.name.includes('LedStrip') || node.name.includes('PCStrip') || node.name.includes('PCFan'));
          if (isAlertMesh) {
            const errMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.16, 0.2) });
            createdMats.push(errMat);
            node.material = errMat;
            node.castShadow = false;
            node.receiveShadow = false;
            return;
          }
          if (Array.isArray(orig)) {
            let anyNoInk = false;
            let anyCast = false;
            node.material = orig.map((m) => {
              const res = convertMaterial(node.name, m, glowScale, textFlag, timeOfDay);
              createdMats.push(res.mat);
              if (res.noInk) anyNoInk = true;
              if (res.castShadow) anyCast = true;
              return res.mat;
            });
            node.castShadow = anyCast;
            node.receiveShadow = !textFlag;
            if (anyNoInk) node.layers.set(NOINK);
          } else if (orig) {
            const res = convertMaterial(node.name, orig, glowScale, textFlag, timeOfDay);
            createdMats.push(res.mat);
            node.material = res.mat;
            node.castShadow = res.castShadow;
            node.receiveShadow = !textFlag;
            if (res.noInk) node.layers.set(NOINK);
          }
        });

        const host = mountRef.current;
        if (host) {
          host.clear();
          host.add(clone);
          host.updateMatrixWorld(true);
          attached = clone;
        }
        // Di Remotion (<ThreeCanvas frameloop="never">), advance() wajib dipanggil agar PostStack merender GLB!
        advance(performance.now());
        invalidate();

        requestAnimationFrame(() => {
          if (!alive) return;
          advance(performance.now());
          invalidate();
          if (handle !== null && handleRef.current === handle) {
            handleRef.current = null;
            continueRender(handle);
          }
        });
      })
      .catch((err) => {
        console.error(`GlbSet gagal memuat ${src}:`, err);
        if (handle !== null && handleRef.current === handle) {
          handleRef.current = null;
          continueRender(handle);
        }
      });

    return () => {
      alive = false;
      if (attached && mountRef.current) {
        mountRef.current.remove(attached);
      }
      for (const m of createdMats) m.dispose();
      if (handle !== null && handleRef.current === handle) {
        handleRef.current = null;
        continueRender(handle);
      }
    };
  }, [url, src, glowScale, timeOfDay, errorAlert, hideKey, advance, invalidate]);

  const s: Vec3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return <group ref={mountRef} position={position} rotation={rotation} scale={s} />;
};
