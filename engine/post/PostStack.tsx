import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { InkPass, LensPass } from './passes';
import { FULLSCREEN_VERT, GRADE_FRAG } from './shaders';
import { pxScale } from './scale';

export type GradeParams = {
  lift: [number, number, number];
  gain: [number, number, number];
  contrast: number;
  saturation: number;
  /** [kekuatan 0..0.4, radius awal 0..1]. Default [0.10, 0.45]. */
  vignette?: [number, number];
  /** Pengali saturasi per zona [shadow, mid, highlight]. */
  satZones?: [number, number, number];
  /** Tint warna per zona (ruang sRGB 0..1). */
  tintS?: [number, number, number];
  tintM?: [number, number, number];
  tintH?: [number, number, number];
  /** Kurva Hermite 7-knot opsional pada x = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]. */
  curveY?: [number, number, number, number, number, number, number];
  curveM?: [number, number, number, number, number, number, number];
  /** Campuran grade (0 = mentah, 1 = penuh). Default 1. */
  amount?: number;
};

export type PostParams = {
  ink: {
    /** Lebar garis siluet dekat dalam piksel pada tinggi 1920 (referensi ~3.4 px). */
    thickness: number;
    /** Lebar garis siluet jauh pada 90 m (referensi ~2.2 px). */
    widthFar?: number;
    /** Rasio lebar garis lipatan/crease terhadap siluet (referensi ~0.64). */
    creaseScale?: number;
    /** Kekuatan garis kontak lantai / lipatan cekung (0 di interior, 0.7 di eksterior). */
    concaveGain?: number;
    strength: number;
    color: string;
    fogColor?: string;
    fogNear?: number;
    fogFar?: number;
  };
  /** 0 = tajam, 1 = penuh (~14 px CoC @1080x1920). Diabaikan jika `cInf` diisi. */
  blur: number;
  /** Jari-jari blur maksimum di tak hingga (px pada 1080x1920). Opsional, lebih presisi daripada `blur`. */
  cInf?: number;
  /**
   * Pengali CoC sisi dekat (foreground di depan bidang fokus). Opsional, default 1.2.
   * Naikkan (mis. 2.0) untuk shot OTS agar bahu/kepala dekat mencapai blur 15–24 px @1080x1920.
   */
  nearScale?: number;
  /** Jarak bidang fokus dari kamera sepanjang sumbu pandang (meter). */
  focus: number;
  bloom: { strength: number; radius: number; threshold: number };
  grade: GradeParams;
};

const ID_KY: [number, number, number, number, number, number, number] = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
const ID_KM: [number, number, number, number, number, number, number] = [1, 1, 1, 1, 1, 1, 1];

/** Preset grade siap pakai berdasarkan references/reports/grade.md (disesuaikan untuk pipeline two-tone cerah). */
export const GRADE_PRESETS: Record<'noon' | 'amber' | 'dusk' | 'neon', GradeParams> = {
  noon: {
    lift: [0.022, 0.012, 0.014],
    gain: [1.02, 1.01, 1.0],
    contrast: 1.04,
    saturation: 1.06,
    satZones: [0.98, 1.08, 1.12],
    tintS: [0.018, -0.004, -0.008],
    tintM: [-0.005, 0.0, 0.012],
    tintH: [0.002, 0.002, 0.0],
    vignette: [0.1, 0.45],
    amount: 1,
  },
  amber: {
    lift: [0.026, 0.012, 0.02],
    gain: [1.02, 1.0, 1.01],
    contrast: 1.05,
    saturation: 1.03,
    satZones: [0.96, 1.02, 1.1],
    tintS: [0.012, -0.006, 0.028],
    tintM: [0.004, -0.004, 0.014],
    tintH: [0.012, 0.004, -0.008],
    vignette: [0.16, 0.4],
    amount: 1,
  },
  dusk: {
    lift: [0.018, 0.012, 0.028],
    gain: [1.0, 0.99, 1.03],
    contrast: 1.06,
    saturation: 1.05,
    satZones: [0.95, 1.05, 1.08],
    tintS: [0.008, -0.004, 0.024],
    tintM: [0.004, -0.002, 0.01],
    tintH: [0.01, 0.0, 0.004],
    vignette: [0.2, 0.36],
    amount: 1,
  },
  neon: {
    lift: [0.01, 0.008, 0.025],
    gain: [1.02, 1.02, 1.04],
    contrast: 1.08,
    saturation: 1.12,
    satZones: [1.0, 1.1, 1.15],
    tintS: [0.006, -0.004, 0.022],
    tintM: [0.0, 0.0, 0.008],
    tintH: [0.0, 0.005, 0.01],
    vignette: [0.24, 0.34],
    amount: 1,
  },
};

export const DEFAULT_POST: PostParams = {
  ink: {
    thickness: 3.4,
    widthFar: 2.2,
    creaseScale: 0.64,
    concaveGain: 0.7,
    strength: 0.96,
    color: '#0b0a0c',
    fogColor: '#c4ddf4',
    fogNear: 25,
    fogFar: 420,
  },
  blur: 0,
  focus: 5,
  bloom: { strength: 0.35, radius: 0.6, threshold: 1.0 },
  grade: GRADE_PRESETS.noon,
};

/**
 * Urutan wajib: scene, ink (world-only, needsSwap=false), lens (thin-lens DOF), bloom, tone map netral, grade.
 * Mengambil alih render R3F lewat useFrame berprioritas 1. Di Remotion, ThreeCanvas memanggil
 * advance() per frame sehingga callback ini jalan tepat sekali per frame.
 */
export const PostStack: React.FC<{ params: PostParams; debugInk?: 0 | 1 | 2 }> = ({ params, debugInk = 0 }) => {
  const { gl, scene, camera, size } = useThree();
  const latest = useRef({ params, debugInk });
  latest.current = { params, debugInk };

  const stack = useMemo(() => {
    const drawing = gl.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(drawing.x, drawing.y, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(drawing.x, drawing.y, THREE.UnsignedIntType),
    });
    const composer = new EffectComposer(gl, target);
    composer.setPixelRatio(1);
    composer.setSize(drawing.x, drawing.y);

    const ink = new InkPass(scene, camera as THREE.PerspectiveCamera);
    const lens = new LensPass();
    const bloom = new UnrealBloomPass(new THREE.Vector2(drawing.x, drawing.y), 0.35, 0.6, 1.0);
    const output = new OutputPass();
    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uLift: { value: new THREE.Vector3() },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uContrast: { value: 1 },
        uSaturation: { value: 1 },
        uSatZones: { value: new THREE.Vector3(1, 1, 1) },
        uTintS: { value: new THREE.Vector3() },
        uTintM: { value: new THREE.Vector3() },
        uTintH: { value: new THREE.Vector3() },
        uVig: { value: new THREE.Vector2(0.1, 0.45) },
        uAmount: { value: 1 },
        uUseCurve: { value: 0 },
        uKy: { value: [...ID_KY] },
        uKm: { value: [...ID_KM] },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GRADE_FRAG,
    });

    for (const p of [new RenderPass(scene, camera), ink, lens, bloom, output, grade]) {
      composer.addPass(p);
    }
    return { composer, ink, lens, bloom, output, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(
    () => () => {
      stack.ink.dispose();
      stack.lens.dispose();
      stack.bloom.dispose();
      stack.output.dispose();
      stack.grade.dispose();
      stack.composer.dispose();
    },
    [stack],
  );

  useFrame(() => {
    const { params: p, debugInk: dbg } = latest.current;
    const cam = camera as THREE.PerspectiveCamera;
    const drawing = gl.getDrawingBufferSize(new THREE.Vector2());
    const s = pxScale(drawing.y);

    gl.toneMapping = THREE.NeutralToneMapping;

    // Ink pass (semua lebar piksel dikali pxScale agar 0.5x still == 1.33x master)
    const mu = stack.ink.maskUniforms;
    const cu = stack.ink.compUniforms;
    const wNear = p.ink.thickness * s;
    const wFar = (p.ink.widthFar ?? p.ink.thickness * 0.65) * s;
    mu.wNear.value = wNear;
    mu.wFar.value = wFar;
    mu.creaseScale.value = p.ink.creaseScale ?? 0.64;
    mu.concaveGain.value = p.ink.concaveGain ?? 0.7;
    mu.uStrength.value = p.ink.strength;
    mu.uFogNear.value = p.ink.fogNear ?? 25;
    mu.uFogFar.value = p.ink.fogFar ?? 420;
    (cu.uInkColor.value as THREE.Color).set(p.ink.color);
    (cu.uFogColor.value as THREE.Color).set(p.ink.fogColor ?? '#c4ddf4');
    stack.ink.debug = dbg;
    stack.ink.enabled = p.ink.strength > 0 || dbg > 0;

    // Lens DOF pass (thin-lens scatter-as-gather)
    const cInf1080 = p.cInf !== undefined ? p.cInf : p.blur * 14;
    stack.lens.u.uNear.value = cam.near;
    stack.lens.u.uFar.value = cam.far;
    stack.lens.u.uFocus.value = Math.max(0.3, p.focus);
    stack.lens.u.uCInf.value = cInf1080 * s;
    stack.lens.u.uMaxCoC.value = 24 * s;
    stack.lens.u.uNearScale.value = p.nearScale ?? 1.2;
    stack.lens.enabled = cInf1080 > 0.25 && dbg === 0;

    // Bloom (hanya sumber emissive HDR > threshold 1.0)
    stack.bloom.enabled = p.bloom.strength > 0 && dbg === 0;
    stack.bloom.strength = p.bloom.strength;
    stack.bloom.radius = p.bloom.radius;
    stack.bloom.threshold = p.bloom.threshold;

    // Grade (display sRGB sesudah OutputPass)
    const gu = stack.grade.uniforms;
    const g = p.grade;
    gu.uLift.value.set(...g.lift);
    gu.uGain.value.set(...g.gain);
    gu.uContrast.value = g.contrast;
    gu.uSaturation.value = g.saturation;
    gu.uSatZones.value.set(...(g.satZones ?? [1, 1, 1]));
    gu.uTintS.value.set(...(g.tintS ?? [0, 0, 0]));
    gu.uTintM.value.set(...(g.tintM ?? [0, 0, 0]));
    gu.uTintH.value.set(...(g.tintH ?? [0, 0, 0]));
    gu.uVig.value.set(...(g.vignette ?? [0.1, 0.45]));
    gu.uAmount.value = dbg === 0 ? (g.amount ?? 1) : 0;
    gu.uUseCurve.value = g.curveY && g.curveM ? 1 : 0;
    if (g.curveY && g.curveM) {
      gu.uKy.value = g.curveY;
      gu.uKm.value = g.curveM;
    }

    stack.composer.render();
  }, 1);

  return null;
};
