import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { InkPass, LensPass, SharedDepth } from './passes';
import { FULLSCREEN_VERT, GRADE_FRAG } from './shaders';
import { pxScale } from './scale';

export type PostParams = {
  ink: { thickness: number; strength: number; color: string };
  /** 0 = tajam. Jari-jari blur maksimum dalam piksel pada tinggi 1920. */
  blur: number;
  /** Jarak fokus dari kamera, meter. */
  focus: number;
  bloom: { strength: number; radius: number; threshold: number };
  grade: { lift: [number, number, number]; gain: [number, number, number]; contrast: number; saturation: number };
};

export const DEFAULT_POST: PostParams = {
  ink: { thickness: 1.5, strength: 0.9, color: '#1b1020' },
  blur: 0,
  focus: 5,
  bloom: { strength: 0.25, radius: 0.5, threshold: 1.0 },
  grade: { lift: [0, 0, 0.01], gain: [1, 1, 1], contrast: 1.04, saturation: 1.06 },
};

/**
 * Urutan wajib: scene, ink, lens, bloom, tone map netral, grade.
 * Mengambil alih render R3F lewat useFrame berprioritas 1. Di Remotion, ThreeCanvas memanggil
 * advance() per frame sehingga callback ini jalan tepat sekali per frame.
 */
export const PostStack: React.FC<{ params: PostParams }> = ({ params }) => {
  const { gl, scene, camera, size } = useThree();
  const latest = useRef(params);
  latest.current = params;

  const stack = useMemo(() => {
    const drawing = gl.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(drawing.x, drawing.y, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(drawing.x, drawing.y),
    });
    const composer = new EffectComposer(gl, target);
    composer.setPixelRatio(1);
    composer.setSize(drawing.x, drawing.y);
    const shared: SharedDepth = { tex: null };
    const ink = new InkPass(shared);
    const lens = new LensPass(shared);
    const bloom = new UnrealBloomPass(new THREE.Vector2(drawing.x, drawing.y), 0.25, 0.5, 1.0);
    const output = new OutputPass();
    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uLift: { value: new THREE.Vector3() }, uGain: { value: new THREE.Vector3(1, 1, 1) },
        uContrast: { value: 1 }, uSaturation: { value: 1 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GRADE_FRAG,
    });
    for (const p of [new RenderPass(scene, camera), ink, lens, bloom, output, grade]) composer.addPass(p);
    return { composer, ink, lens, bloom, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => () => stack.composer.dispose(), [stack]);

  useFrame(() => {
    const p = latest.current;
    const cam = camera as THREE.PerspectiveCamera;
    const drawing = gl.getDrawingBufferSize(new THREE.Vector2());
    const s = pxScale(drawing.y);

    gl.toneMapping = THREE.NeutralToneMapping; // dipakai OutputPass
    for (const pass of [stack.ink, stack.lens]) {
      pass.u.uNear.value = cam.near;
      pass.u.uFar.value = cam.far;
    }
    stack.ink.u.uThickness.value = p.ink.thickness * s;
    stack.ink.u.uStrength.value = p.ink.strength;
    stack.ink.u.uInkColor.value.set(p.ink.color);
    stack.lens.u.uFocus.value = p.focus;
    stack.lens.u.uMaxRadius.value = p.blur * 18 * s;
    stack.lens.enabled = p.blur > 0;
    stack.bloom.enabled = p.bloom.strength > 0;
    stack.bloom.strength = p.bloom.strength;
    stack.bloom.radius = p.bloom.radius;
    stack.bloom.threshold = p.bloom.threshold;
    stack.grade.uniforms.uLift.value.set(...p.grade.lift);
    stack.grade.uniforms.uGain.value.set(...p.grade.gain);
    stack.grade.uniforms.uContrast.value = p.grade.contrast;
    stack.grade.uniforms.uSaturation.value = p.grade.saturation;
    stack.composer.render();
  }, 1);

  return null;
};
