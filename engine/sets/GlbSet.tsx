import React, { useEffect, useLayoutEffect, useRef } from 'react';
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
      (err) => {
        gltfCache.delete(url);
        reject(err);
      },
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
    name.includes('FrontApronText') ||
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

export type GlbSurfaceClass = 'metal' | 'semiGloss' | 'transition' | 'matte';

export type GlbSurfaceParams = {
  kind: GlbSurfaceClass;
  shininess: number;
  specularHex: number;
  normalScale: number;
};

/**
 * Klasifikasi permukaan PBR GLB -> parameter shading soft-lit anti-plastik (Atelier v3.5).
 * Mematikan specular sepenuhnya pada permukaan matte (aspal, plester, kayu, paving, rumput, kain)
 * agar selaras dengan referensi dunia 3D matte `contohvideo/download.mp4`.
 */
export function classifyGlbSurface(metalness: number, roughness: number): GlbSurfaceParams {
  if (metalness > 0.35) {
    return { kind: 'metal', shininess: 48, specularHex: 0x333842, normalScale: 0.5 };
  }
  if (roughness < 0.45) {
    return { kind: 'semiGloss', shininess: 22, specularHex: 0x181a1e, normalScale: 0.42 };
  }
  if (roughness < 0.55) {
    return { kind: 'transition', shininess: 8, specularHex: 0x080808, normalScale: 0.38 };
  }
  return { kind: 'matte', shininess: 0, specularHex: 0x000000, normalScale: 0.35 };
}

function isStreetLampMesh(name: string): boolean {
  return (
    name.includes('StreetBulb') ||
    name.includes('ParkBollard_Glow') ||
    name.includes('PosRonda_Lamp') ||
    name.includes('WK_LampShade') ||
    name.includes('WK_LampBulb') ||
    name.includes('Kost_LampBulb') ||
    name.includes('LampBulb') ||
    name.includes('CaseLight')
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

  const matName = src.name ?? '';

  // 0a. Bayangan kontak kolong kendaraan (`M_Veh_ContactShadow`): transparan lembut di layer NOINK, nol garis tinta kotak
  if (matName === 'M_Veh_ContactShadow') {
    if (src.map) {
      src.map.colorSpace = THREE.SRGBColorSpace;
    }
    return {
      mat: new THREE.MeshBasicMaterial({
        map: src.map ?? null,
        color: new THREE.Color(0x0b0d12),
        transparent: true,
        opacity: timeOfDay === 'night' ? 0.55 : 0.76,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      noInk: true,
      castShadow: false,
    };
  }

  // 0b. Fasad kaca Minimarket & ATM 24 Jam ber-UV (`M_RL_MinimarketFront`, `M_RL_AtmFront`):
  // Siang tampil natural berbayangan, Sore/Malam menyala terang lembut tanpa berubah jadi blok biru/kuning polos!
  if (matName === 'M_RL_MinimarketFront' || matName === 'M_RL_AtmFront') {
    if (src.map) {
      src.map.colorSpace = THREE.SRGBColorSpace;
      src.map.anisotropy = 8;
    }
    if (timeOfDay === 'golden' || timeOfDay === 'night') {
      const tint =
        matName === 'M_RL_AtmFront'
          ? new THREE.Color(0.92, 0.98, 1.06)
          : new THREE.Color(1.04, 1.0, 0.92);
      return {
        mat: new THREE.MeshBasicMaterial({ map: src.map ?? null, color: tint }),
        noInk: true,
        castShadow: false,
      };
    }
    return {
      mat: twoTone(new THREE.MeshLambertMaterial({ map: src.map ?? null, color: 0xffffff })),
      noInk: false,
      castShadow: true,
    };
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

  if ((isWindowGlowMesh(meshName) || matName === 'KG_WinWarm' || matName === 'KG_WinGlow') && (timeOfDay === 'golden' || timeOfDay === 'night')) {
    const h = hashName(meshName);
    const litChance = timeOfDay === 'night' ? 72 : 38;
    if (meshName.includes('ATM_GlassFront') || h < litChance) {
      const warm = meshName.includes('ATM_GlassFront')
        ? new THREE.Color(0.85, 0.96, 1.08)
        : timeOfDay === 'night'
          ? h % 3 === 0
            ? new THREE.Color(1.22, 1.06, 0.72)
            : new THREE.Color(1.12, 0.92, 0.58)
          : new THREE.Color(1.02, 0.88, 0.62);
      if (src.map) {
        src.map.colorSpace = THREE.SRGBColorSpace;
        return { mat: new THREE.MeshBasicMaterial({ map: src.map, color: warm }), noInk: true, castShadow: false };
      }
      return { mat: new THREE.MeshBasicMaterial({ color: warm }), noInk: true, castShadow: false };
    }
  }

  // 1. Material Emissive / Lampu / Layar Monitor (hanya lampu/kode kecil yang melampaui threshold bloom > 1.0)
  if (matName === 'M_Veh_HeadlightLamp' || matName === 'M_Veh_TaillightLamp') {
    const isHead = matName === 'M_Veh_HeadlightLamp';
    if (timeOfDay === 'night' || timeOfDay === 'golden') {
      const k = timeOfDay === 'night' ? (isHead ? 1.55 : 1.28) : isHead ? 1.15 : 1.05;
      const col = isHead ? new THREE.Color(1.0 * k, 0.94 * k, 0.78 * k) : new THREE.Color(0.95 * k, 0.12 * k, 0.08 * k);
      return { mat: new THREE.MeshBasicMaterial({ color: col }), noInk: true, castShadow: false };
    }
    return {
      mat: twoTone(new THREE.MeshPhongMaterial({ color: isHead ? 0xe8e4d4 : 0xa61c18, shininess: 22, specular: new THREE.Color(0x181a1e) })),
      noInk: false,
      castShadow: false,
    };
  }
  const em = src.emissive;
  const emLum = em.r * 0.299 + em.g * 0.587 + em.b * 0.114;
  if (emLum > 0.015 && src.emissiveIntensity > 0.12) {
    const hdr = em.clone();
    if (isFlatPanel(meshName) || src.map) {
      // Panel besar / material bertekstur tetap cerah self-lit tanpa bloom yang memudarkan detail tekstur
      const peak = Math.max(hdr.r, hdr.g, hdr.b, 0.001);
      const nightPanelLift = timeOfDay === 'night' ? 1.12 : timeOfDay === 'golden' ? 0.98 : 0.86;
      const targetPeak = Math.min(nightPanelLift, peak * Math.max(0.85, src.emissiveIntensity * 0.72));
      hdr.multiplyScalar(targetPeak / peak);
    } else {
      const boost = Math.min(2.1, Math.max(1.05, src.emissiveIntensity * glowScale * 0.85));
      hdr.multiplyScalar(boost);
    }
    if (src.map) {
      src.map.colorSpace = THREE.SRGBColorSpace;
    }
    return {
      mat: new THREE.MeshBasicMaterial({ ...(src.map ? { map: src.map } : {}), color: hdr }),
      noInk: noTextShadow || isFlatPanel(meshName),
      castShadow: false,
    };
  }

  // 2. Material Kaca / Transparan (etalase gorengan/bakmie/es buah, galon air biru):
  // Hanya untuk material yang memang transparan di GLB (`BLEND`/`opacity < 0.95`) atau kaca etalase khusus;
  // jendela gedung & cermin opaque (`WinGlass`/`WinGlassDark`, `alpha = 1.0`) tetap solid agar tidak tembus ke rongga dinding!
  const isShowcaseGlassName = /(etglass|caseglass|m_grb_glass|wk_glass)/i;
  if (
    src.transparent ||
    src.opacity < 0.95 ||
    isShowcaseGlassName.test(meshName) ||
    isShowcaseGlassName.test(src.name ?? '')
  ) {
    return {
      mat: new THREE.MeshLambertMaterial({
        color: src.color.clone(),
        transparent: true,
        opacity: Math.max(0.18, Math.min(0.45, src.opacity)),
        depthWrite: false,
        side: THREE.DoubleSide,
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

  // 4. Material Dunia 3D Solid & PBR Textured: konversi ke shader twoTone() soft-lit anti-plastik (Atelier v3.5)
  const hasTex = Boolean(src.map);
  if (src.map) {
    src.map.colorSpace = THREE.SRGBColorSpace;
    src.map.anisotropy = 8;
  }
  const safeCol = clampAlbedoForBloom(src.color, hasTex ? 0.76 : 0.62);
  const ceil = isCeiling(meshName);
  const surf = classifyGlbSurface(src.metalness, src.roughness);

  if (surf.kind !== 'matte' || src.normalMap) {
    const params: THREE.MeshPhongMaterialParameters = {
      color: safeCol,
      shininess: surf.shininess,
      specular: new THREE.Color(surf.specularHex),
    };
    if (src.map) params.map = src.map;
    if (src.aoMap) {
      params.aoMap = src.aoMap;
      params.aoMapIntensity = 0.65;
    }
    if (src.normalMap) {
      params.normalMap = src.normalMap;
      params.normalScale = new THREE.Vector2(surf.normalScale, surf.normalScale);
    }
    return {
      mat: twoTone(new THREE.MeshPhongMaterial(params)),
      noInk: false,
      castShadow: !ceil,
    };
  }

  const params: THREE.MeshLambertMaterialParameters = { color: safeCol };
  if (src.map) params.map = src.map;
  if (src.aoMap) {
    params.aoMap = src.aoMap;
    params.aoMapIntensity = 0.65;
  }
  return {
    mat: twoTone(new THREE.MeshLambertMaterial(params)),
    noInk: false,
    castShadow: !ceil,
  };
}

/**
 * Cocokkan nama node GLB terhadap daftar `hideNames`:
 * - Abaikan string kosong / spasi agar tidak pernah menyembunyikan seluruh dunia.
 * - Mendukung nama mentah Blender maupun nama tersanitasi GLTFLoader (`PropertyBinding.sanitizeNodeName`, mis. `.` dibuang).
 */
export function shouldHideGlbNode(nodeName: string, hideNames?: readonly string[]): boolean {
  if (!hideNames || hideNames.length === 0) return false;
  const sanitizedNode = THREE.PropertyBinding.sanitizeNodeName(nodeName);
  for (const raw of hideNames) {
    const h = raw.trim();
    if (!h) continue;
    if (nodeName === h || nodeName.startsWith(h)) return true;
    const sh = THREE.PropertyBinding.sanitizeNodeName(h);
    if (sh && (nodeName === sh || nodeName.startsWith(sh) || sanitizedNode === sh || sanitizedNode.startsWith(sh))) {
      return true;
    }
  }
  return false;
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
  /** Callback ringan per-frame untuk memutasi transform anak GLB yang sudah terpasang tanpa re-clone. */
  onUpdate?: (root: THREE.Group) => void;
  /** Kunci perubahan untuk memicu `onUpdate` tanpa memicu reload GLB atau `delayRender`. */
  updateKey?: string;
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
  onUpdate,
  updateKey,
}) => {
  const mountRef = useRef<THREE.Group>(null);
  const cloneRef = useRef<THREE.Group | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const { advance, invalidate } = useThree();
  const url = staticFile(src);
  const hideKey = hideNames?.join(',') ?? '';

  // Registrasi & pelepasan delayRender di dalam useLayoutEffect (aman di StrictMode & tanpa leak render dibatalkan).
  useLayoutEffect(() => {
    let alive = true;
    const handle = delayRender(`GlbSet:${src}`);
    let released = false;
    const done = () => {
      if (released) return;
      released = true;
      continueRender(handle);
    };
    const createdMats: THREE.Material[] = [];
    let attached: THREE.Group | null = null;

    loadGlbScene(url)
      .then((template) => {
        if (!alive) return;
        const clone = template.clone(true);
        clone.traverse((node) => {
          if (shouldHideGlbNode(node.name, hideNames)) {
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
            let anyGlass = false;
            node.material = orig.map((m) => {
              const res = convertMaterial(node.name, m, glowScale, textFlag, timeOfDay);
              createdMats.push(res.mat);
              if (res.noInk) anyNoInk = true;
              if (res.castShadow) anyCast = true;
              if (res.mat.transparent) anyGlass = true;
              return res.mat;
            });
            node.castShadow = anyCast;
            node.receiveShadow = !textFlag && !anyGlass;
            if (anyGlass) node.renderOrder = 2;
            if (anyNoInk) node.layers.set(NOINK);
          } else if (orig) {
            const res = convertMaterial(node.name, orig, glowScale, textFlag, timeOfDay);
            createdMats.push(res.mat);
            node.material = res.mat;
            node.castShadow = res.castShadow;
            node.receiveShadow = !textFlag && !res.mat.transparent;
            if (res.mat.transparent) node.renderOrder = 2;
            if (res.noInk) node.layers.set(NOINK);
          }
        });

        const host = mountRef.current;
        if (host) {
          host.clear();
          host.add(clone);
          cloneRef.current = clone;
          onUpdateRef.current?.(clone);
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
          done();
        });
      })
      .catch((err) => {
        console.error(`GlbSet gagal memuat ${src}:`, err);
        done();
      });

    return () => {
      alive = false;
      if (attached && cloneRef.current === attached) {
        cloneRef.current = null;
      }
      if (attached && mountRef.current) {
        mountRef.current.remove(attached);
      }
      for (const m of createdMats) m.dispose();
      done();
    };
  }, [url, src, glowScale, timeOfDay, errorAlert, hideKey, advance, invalidate]);

  useEffect(() => {
    if (cloneRef.current && onUpdateRef.current) {
      onUpdateRef.current(cloneRef.current);
      cloneRef.current.updateMatrixWorld(true);
      advance(performance.now());
      invalidate();
    }
  }, [updateKey, advance, invalidate]);

  const s: Vec3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return <group ref={mountRef} position={position} rotation={rotation} scale={s} />;
};
