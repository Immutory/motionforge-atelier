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

function convertMaterial(
  meshName: string,
  src: THREE.Material,
  glowScale: number,
  noTextShadow: boolean,
): { mat: THREE.Material; noInk: boolean; castShadow: boolean } {
  if (!(src instanceof THREE.MeshStandardMaterial)) {
    return { mat: src.clone(), noInk: noTextShadow, castShadow: !noTextShadow && !isCeiling(meshName) };
  }

  // 1. Material Emissive / Lampu / Layar Monitor (hanya lampu/kode kecil yang melampaui threshold bloom > 1.0)
  const em = src.emissive;
  const emLum = em.r * 0.299 + em.g * 0.587 + em.b * 0.114;
  if (emLum > 0.015 && src.emissiveIntensity > 0.12) {
    const hdr = em.clone();
    if (isFlatPanel(meshName)) {
      // Panel besar (papan neon, kaca jendela, layar dasar) tetap cerah self-lit tanpa bloom yang memudarkan teks!
      const peak = Math.max(hdr.r, hdr.g, hdr.b, 0.001);
      const targetPeak = Math.min(0.86, peak * Math.max(0.85, src.emissiveIntensity * 0.72));
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

  // 3. Teks 3D dari Blender: warna solid tajam di layer NOINK agar tidak buram oleh outline InkPass
  if (noTextShadow) {
    return {
      mat: new THREE.MeshBasicMaterial({ color: clampAlbedoForBloom(src.color, 0.82) }),
      noInk: true,
      castShadow: false,
    };
  }

  // 4. Material Dunia 3D Solid: konversi otomatis ke shader twoTone() MotionForge Atelier!
  // Batasi luminans albedo <= 0.62 agar permukaan putih (papan tulis/dinding) tidak memicu HDR Bloom > 1.0.
  const safeCol = clampAlbedoForBloom(src.color, 0.62);
  const ceil = isCeiling(meshName);
  if (src.metalness > 0.35) {
    const params: THREE.MeshPhongMaterialParameters = { color: safeCol, shininess: 46 };
    if (src.map) params.map = src.map;
    return {
      mat: twoTone(new THREE.MeshPhongMaterial(params)),
      noInk: false,
      castShadow: !ceil,
    };
  }

  const params: THREE.MeshLambertMaterialParameters = { color: safeCol };
  if (src.map) params.map = src.map;
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
}) => {
  const mountRef = useRef<THREE.Group>(null);
  const { advance, invalidate } = useThree();
  const url = staticFile(src);

  // Registrasi delayRender secara sinkron saat render pertama agar Remotion tidak memotret frame kosong!
  const pendingKeyRef = useRef<string | null>(null);
  const handleRef = useRef<number | null>(null);
  const key = `${url}|${glowScale}`;
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
        clone.traverse((node) => {
          node.visible = true;
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;
          const textFlag = isTextMesh(node.name);
          const orig = node.material;
          if (Array.isArray(orig)) {
            let anyNoInk = false;
            let anyCast = false;
            node.material = orig.map((m) => {
              const res = convertMaterial(node.name, m, glowScale, textFlag);
              createdMats.push(res.mat);
              if (res.noInk) anyNoInk = true;
              if (res.castShadow) anyCast = true;
              return res.mat;
            });
            node.castShadow = anyCast;
            node.receiveShadow = !textFlag;
            if (anyNoInk) node.layers.set(NOINK);
          } else if (orig) {
            const res = convertMaterial(node.name, orig, glowScale, textFlag);
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
  }, [url, src, glowScale, advance, invalidate]);

  const s: Vec3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return <group ref={mountRef} position={position} rotation={rotation} scale={s} />;
};
