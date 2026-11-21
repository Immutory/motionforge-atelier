import * as THREE from 'three';
import type { LightPreset } from './lights';

/**
 * Shading dua-nada (two-tone) bergaya ilustrasi untuk dunia 3D dan kartu karakter 2D.
 * Diadaptasi dari studi referensi (references/reports/lighting.md) untuk Three.js r187.
 */
export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.45, 1.38, 1.28) },
  uShadeCol: { value: new THREE.Vector3(0.76, 0.7, 0.84) },
  uShadeLift: { value: new THREE.Vector3(0, 0, 0) },
  uLambert: { value: 0.35 },
  uSideK: { value: 0.84 },
  uTerm: { value: 0.2 },
};

export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1.02, 0.99, 0.97) },
  uCharShade: { value: 0.88 },
  uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.18 },
  uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

// Tangkap visibilitas bayangan directional light 0 (matahari utama) langsung dari loop cahaya Three.js.
const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace(
    'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]',
    'sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]',
  )
  .replace(
    'vDirectionalShadowCoord[ i ] ) : 1.0;',
    'vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;',
  );

if (!LFB.includes('directLight.color *= sunVis')) {
  throw new Error('shade.ts: THREE.ShaderChunk.lights_fragment_begin tidak cocok');
}

const TWO_TONE_DECL = /* glsl */ `#include <common>
uniform vec3 uLitCol;
uniform vec3 uShadeCol;
uniform vec3 uShadeLift;
uniform float uLambert;
uniform float uSideK;
uniform float uTerm;`;

const TWO_TONE_BODY = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );
  reflectedLight.directDiffuse = diffuseColor.rgb * mix( uShadeCol, lit, sunTerm ) * skyK + uShadeLift * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );
}
#endif
`;

/**
 * Ubah MeshLambertMaterial atau MeshPhongMaterial (logam tetap punya specular) menjadi two-tone bergaya.
 * Panggil sekali saat material dibuat, sebelum render pertama.
 */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TONE);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', TWO_TONE_DECL)
      .replace('#include <lights_fragment_begin>', 'float sunVis = 1.0;\n' + LFB)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + TWO_TONE_BODY);
  };
  material.customProgramCacheKey = () => 'atelierTwoToneV1';
  return material;
}

const CARD_DECL = /* glsl */ `#include <common>
uniform vec3 uCharTint;
uniform float uCharShade;
uniform float uGrad;
uniform float uBodyGrad;
uniform vec3 uSideTint;`;

const CARD_BODY = /* glsl */ `
vec3 outgoingLight = diffuseColor.rgb * uCharTint;
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = clamp( sunV.x * 1.4, -1.0, 1.0 );
  float u = clamp( ( vMapUv.x - 0.5 ) / 0.20, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 );
  float t = u * side;
  float head = smoothstep( 0.57, 0.63, vMapUv.y );
  float g = mix( uBodyGrad, uGrad, head );
  float dark = smoothstep( 0.1, 1.0, -t );
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * ( g / max( uGrad, 1e-3 ) ) * 0.45 );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - 0.71 ) / 0.14, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.03 * max( t, 0.0 );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift;
}
#endif
`;

/**
 * Shading khusus kartu karakter 2D (billboard): wajah selalu terbaca cerah (tidak abu-abu/lumpur),
 * tetap menyerap warna cahaya scene, punya gradasi lembut ke arah matahari, dan meredup tipis saat kena bayangan.
 */
export function cardShade(material: THREE.MeshLambertMaterial): THREE.MeshLambertMaterial {
  material.emissive.set(0x000000);
  material.emissiveIntensity = 0;
  material.emissiveMap = null;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, CHAR);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', CARD_DECL)
      .replace('#include <lights_fragment_begin>', 'float sunVis = 1.0;\n' + LFB)
      .replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        CARD_BODY,
      );
  };
  material.customProgramCacheKey = () => 'atelierCardV1';
  return material;
}

/** Sinkronkan uniform shader two-tone dan kartu karakter dari preset cahaya aktif. */
export function syncShadeUniforms(light: LightPreset) {
  TONE.uLitCol.value.set(...light.tone.lit);
  TONE.uShadeCol.value.set(...light.tone.shade);
  TONE.uShadeLift.value.set(...light.tone.lift);
  TONE.uLambert.value = light.tone.lambert;
  TONE.uSideK.value = light.tone.sideK;
  TONE.uTerm.value = light.tone.term;

  CHAR.uCharTint.value.set(...light.card.tint);
  CHAR.uCharShade.value = light.card.shadeFloor;
  CHAR.uGrad.value = light.card.headGrad;
  CHAR.uBodyGrad.value = light.card.bodyGrad;
  CHAR.uSideTint.value.set(...light.card.sideTint);
}
