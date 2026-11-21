import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { FULLSCREEN_VERT, INK_FRAG, LENS_FRAG } from './shaders';

/** Tempat berbagi tekstur depth adegan antar pass. Buffer yang memegang adegan berganti tiap frame. */
export type SharedDepth = { tex: THREE.Texture | null };

abstract class DepthPass extends Pass {
  protected material: THREE.ShaderMaterial;
  protected quad: FullScreenQuad;
  constructor(frag: string, uniforms: Record<string, THREE.IUniform>, protected shared: SharedDepth) {
    super();
    this.material = new THREE.ShaderMaterial({ uniforms, vertexShader: FULLSCREEN_VERT, fragmentShader: frag });
    this.quad = new FullScreenQuad(this.material);
  }
  get u() {
    return this.material.uniforms;
  }
  setSize(w: number, h: number) {
    this.u.uTexel.value.set(1 / w, 1 / h);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
  protected draw(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.u.tDiffuse.value = readBuffer.texture;
    this.u.tDepth.value = this.shared.tex;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

export class InkPass extends DepthPass {
  constructor(shared: SharedDepth) {
    super(
      INK_FRAG,
      {
        tDiffuse: { value: null }, tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 }, uFar: { value: 800 },
        uThickness: { value: 1.5 }, uStrength: { value: 0.9 }, uThreshold: { value: 0.012 },
        uInkColor: { value: new THREE.Color('#1b1020') },
      },
      shared,
    );
  }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    // RenderPass baru saja menulis adegan ke readBuffer, jadi depth adegan ada di sini.
    this.shared.tex = readBuffer.depthTexture;
    this.draw(renderer, writeBuffer, readBuffer);
  }
}

export class LensPass extends DepthPass {
  constructor(shared: SharedDepth) {
    super(
      LENS_FRAG,
      {
        tDiffuse: { value: null }, tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 }, uFar: { value: 800 },
        uFocus: { value: 5 }, uMaxRadius: { value: 0 },
      },
      shared,
    );
  }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.draw(renderer, writeBuffer, readBuffer);
  }
}
