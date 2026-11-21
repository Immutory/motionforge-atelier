import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { NOINK } from './layers';
import {
  COPY_FRAG,
  FULLSCREEN_VERT,
  INK_COMP_FRAG,
  INK_MASK_FRAG,
  LENS_FRAG,
  WORLD_NORMAL_FRAG,
  WORLD_NORMAL_VERT,
} from './shaders';

/**
 * World-only ink pass (depth jump + normal crease + contact fold), berjalan SEBELUM DOF.
 * - `needsSwap = false`: komposit ke tmpRT lalu salin warna kembali ke readBuffer,
 *   sehingga readBuffer.depthTexture (main scene depth) tetap utuh untuk LensPass.
 * - Objek di layer `NOINK` (karakter 2D, langit, awan) dikecualikan dari normal/depth dunia
 *   dan dilindungi oleh uji oklusi `tMainDepth` agar tidak pernah mendapat outline ganda.
 */
export class InkPass extends Pass {
  /** 0 = normal, 1 = masker tinta, 2 = buffer normal dunia */
  debug = 0;

  private world: THREE.Scene;
  private cam: THREE.PerspectiveCamera;
  private worldRT: THREE.WebGLRenderTarget;
  private maskRT: THREE.WebGLRenderTarget;
  private tmpRT: THREE.WebGLRenderTarget;
  private normalMat: THREE.ShaderMaterial;
  private maskMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private copyMat: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  private clearCol = new THREE.Color();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    super();
    this.world = scene;
    this.cam = camera;
    this.cam.layers.enable(NOINK);
    this.needsSwap = false;

    this.worldRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
      samples: 0,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false,
    });
    this.tmpRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
    });

    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: WORLD_NORMAL_VERT,
      fragmentShader: WORLD_NORMAL_FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        tCut: { value: null },
        cut: { value: 0 },
        cutUv: { value: new THREE.Matrix3() },
      },
    });
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {
      const mat = (object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const gi = (group as unknown as { materialIndex?: number } | null)?.materialIndex ?? 0;
      const src = (Array.isArray(mat) ? mat[gi] : mat) as THREE.MeshLambertMaterial;
      const u = this.normalMat.uniforms;
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map;
      u.cut.value = map ? src.alphaTest : 0;
      if (map) {
        map.updateMatrix();
        (u.cutUv.value as THREE.Matrix3).copy(map.matrix);
      }
      this.normalMat.uniformsNeedUpdate = true;
    };

    const texel = new THREE.Vector2(1, 1);
    const fs = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });

    this.maskMat = fs(INK_MASK_FRAG, {
      tNormal: { value: this.worldRT.texture },
      tDepth: { value: this.worldRT.depthTexture },
      tMainDepth: { value: null },
      uTexel: { value: texel },
      uNear: { value: 0.1 },
      uFar: { value: 800 },
      p00: { value: 1 },
      p11: { value: 1 },
      wNear: { value: 3.4 },
      wFar: { value: 2.2 },
      dNear: { value: 6 },
      dFar: { value: 90 },
      creaseScale: { value: 0.64 },
      depthLo: { value: 0.02 },
      depthHi: { value: 0.05 },
      cosLo: { value: Math.cos((50 * Math.PI) / 180) },
      cosHi: { value: Math.cos((65 * Math.PI) / 180) },
      concaveGain: { value: 0.7 },
      farOpacity: { value: 0.75 },
      fadeNear: { value: 150 },
      fadeFar: { value: 450 },
      uStrength: { value: 0.95 },
      useMain: { value: 0 },
      uFogNear: { value: 25 },
      uFogFar: { value: 420 },
    });

    this.compMat = fs(INK_COMP_FRAG, {
      tDiffuse: { value: null },
      tMask: { value: this.maskRT.texture },
      tNormal: { value: this.worldRT.texture },
      uTexel: { value: texel },
      uInkColor: { value: new THREE.Color('#0b0a0c') },
      uFogColor: { value: new THREE.Color('#c4ddf4') },
      uDebug: { value: 0 },
    });

    this.copyMat = fs(COPY_FRAG, { tSrc: { value: this.tmpRT.texture } });
    this.quad = new FullScreenQuad(this.maskMat);
  }

  get maskUniforms() {
    return this.maskMat.uniforms;
  }

  get compUniforms() {
    return this.compMat.uniforms;
  }

  setSize(w: number, h: number) {
    this.worldRT.setSize(w, h);
    this.maskRT.setSize(w, h);
    this.tmpRT.setSize(w, h);
    (this.maskMat.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const scene = this.world;
    const cam = this.cam;
    const autoClear = renderer.autoClear;
    const shadowAuto = renderer.shadowMap.autoUpdate;
    const layerMask = cam.layers.mask;
    const override = scene.overrideMaterial;
    const background = scene.background;
    renderer.getClearColor(this.clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;

    // 1) Normal + depth khusus dunia 3D (tanpa karakter/langit/awan, tanpa render ulang shadow map).
    cam.layers.disable(NOINK);
    scene.overrideMaterial = this.normalMat;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.worldRT);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    cam.layers.mask = layerMask;
    scene.overrideMaterial = override;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clearCol, clearAlpha);

    // 2) Hitung masker tepi (depth jump + crease + contact + oklusi karakter via readBuffer.depthTexture).
    const u = this.maskMat.uniforms;
    const e = cam.projectionMatrix.elements;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.p00.value = e[0];
    u.p11.value = e[5];
    u.tMainDepth.value = readBuffer.depthTexture ?? null;
    u.useMain.value = readBuffer.depthTexture ? 1 : 0;
    this.quad.material = this.maskMat;
    renderer.setRenderTarget(this.maskRT);
    this.quad.render(renderer);

    // 3) Komposit tinta ke tmpRT, lalu salin warna kembali ke readBuffer (depthTexture readBuffer tetap utuh).
    this.compMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.compMat.uniforms.uDebug.value = this.debug;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.tmpRT);
    this.quad.render(renderer);

    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.quad.render(renderer);

    renderer.autoClear = autoClear;
  }

  dispose() {
    this.worldRT.depthTexture?.dispose();
    this.worldRT.dispose();
    this.maskRT.dispose();
    this.tmpRT.dispose();
    this.normalMat.dispose();
    this.maskMat.dispose();
    this.compMat.dispose();
    this.copyMat.dispose();
    this.quad.dispose();
  }
}

/**
 * Thin-lens scatter-as-gather DOF pass.
 * Membaca warna (sudah bertinta) dan depth langsung dari readBuffer, lalu menulis ke writeBuffer (needsSwap = true).
 */
export class LensPass extends Pass {
  private material: THREE.ShaderMaterial;
  private quad: FullScreenQuad;

  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: LENS_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 },
        uFar: { value: 800 },
        uFocus: { value: 5 },
        uCInf: { value: 0 },
        uNearScale: { value: 1.2 },
        uMaxCoC: { value: 24 },
      },
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get u() {
    return this.material.uniforms;
  }

  setSize(w: number, h: number) {
    (this.u.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.u.tDiffuse.value = readBuffer.texture;
    this.u.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}
