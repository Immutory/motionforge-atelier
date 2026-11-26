import * as THREE from 'three';
import type { LightPreset } from './lights';

/**
 * Shading dua-nada (two-tone) bergaya ilustrasi 2,5D (Atelier v3.0) untuk dunia 3D dan kartu karakter 2D.
 * Mendukung cahaya lokal (`<pointLight>`/`<spotLight>`) dengan Reinhard soft-clamp anti-overbloom,
 * serta `receiveShadow` nyata dari geometri 3D ke permukaan dunia & wajah/badan karakter 2D.
 */
export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.45, 1.38, 1.28) },
  uShadeCol: { value: new THREE.Vector3(0.76, 0.7, 0.84) },
  uShadeLift: { value: new THREE.Vector3(0, 0, 0) },
  uLambert: { value: 0.35 },
  uSideK: { value: 0.84 },
  uTerm: { value: 0.2 },
  /** Bobot cahaya lokal (`<pointLight>`/`<spotLight>`), aktif default 1.0 dengan Reinhard soft-clamp. */
  uLocalLight: { value: 1.0 },
};

export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1.02, 0.99, 0.97) },
  uCharShade: { value: 0.88 },
  uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.18 },
  uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

/**
 * Fungsi murni Reinhard soft-clamp anti-overbloom (cerminan eksak GLSL di `TWO_TONE_BODY` & `CARD_BODY`).
 * Menjaga kontribusi lampu lokal tetap hangat & hidup namun tidak pernah menembus ambang bloom `1.0`.
 */
export function softClampLocalLight(raw: number, localWeight = 1.0, maxOut = 0.92): number {
  const x = Math.max(0, raw * localWeight);
  return Math.min(x / (1 + x * 0.9), maxOut);
}

/**
 * Skala headroom skalar berbasis kanal maksimum (cerminan eksak GLSL) agar tambahan cahaya lokal
 * tidak pernah menggeser rona warna (hue-shift) maupun menembus ambang bloom `1.0`.
 */
export function applyScalarLocalHeadroom(
  base: readonly [number, number, number],
  localAdd: readonly [number, number, number],
  ceiling = 0.96,
): [number, number, number] {
  const maxBase = Math.max(base[0], base[1], base[2]);
  const maxAdd = Math.max(localAdd[0], localAdd[1], localAdd[2]);
  const scale = maxAdd > 1e-4 ? Math.min(1, Math.max(0, ceiling - maxBase) / maxAdd) : 0;
  return [base[0] + localAdd[0] * scale, base[1] + localAdd[1] * scale, base[2] + localAdd[2] * scale];
}

// Tangkap visibilitas bayangan directional light 0 (matahari utama) dan akumulasi cahaya lokal (point/spot) dari Three.js.
const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace(
    '#if ( NUM_DIR_LIGHTS > 0 )',
    'vec3 localDirect = reflectedLight.directDiffuse;\n#if ( NUM_DIR_LIGHTS > 0 )',
  )
  .replace(
    'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]',
    'float dShadow = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]',
  )
  .replace(
    'vDirectionalShadowCoord[ i ] ) : 1.0;',
    'vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tif ( sunVisSet == 0 ) { sunVis = dShadow; sunVisSet = 1; }\n\t\tdirectLight.color *= dShadow;',
  );

if (!LFB.includes('if ( sunVisSet == 0 ) { sunVis = dShadow; sunVisSet = 1; }')) {
  throw new Error('shade.ts: THREE.ShaderChunk.lights_fragment_begin tidak cocok');
}

// Wrapped diffuse khusus kartu karakter 2,5D agar lampu gantung di atas/sedikit di belakang bidang kartu tetap hangat saat orbit.
const CARD_LAMBERT_PARS = THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) * 0.55 + 0.45 );',
);

const TWO_TONE_DECL = /* glsl */ `#include <common>
uniform vec3 uLitCol;
uniform vec3 uShadeCol;
uniform vec3 uShadeLift;
uniform float uLambert;
uniform float uSideK;
uniform float uTerm;
uniform float uLocalLight;`;

const TWO_TONE_BODY = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, max( uTerm, 1e-4 ), ndl );
  float upDot = 0.5 + 0.5 * dot( geometryNormal, upV );
  float skyK = mix( uSideK, 1.0, upDot );
  vec3 hemiWrap = mix( vec3( 0.96, 0.96, 0.99 ), vec3( 1.03, 1.02, 1.00 ), upDot );
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );
  vec3 baseLit = diffuseColor.rgb * mix( uShadeCol, lit, sunTerm ) * skyK * hemiWrap + uShadeLift * ( 1.0 - sunTerm );
  vec3 rawLocal = max( localDirect * uLocalLight, vec3( 0.0 ) );
  vec3 localSoft = min( rawLocal / ( vec3( 1.0 ) + rawLocal * 0.9 ), vec3( 0.92 ) );
  float maxBase = max( baseLit.r, max( baseLit.g, baseLit.b ) );
  float maxAdd = max( localSoft.r, max( localSoft.g, localSoft.b ) );
  float localScale = maxAdd > 1e-4 ? min( 1.0, max( 0.0, 0.96 - maxBase ) / maxAdd ) : 0.0;
  reflectedLight.directDiffuse = baseLit + localSoft * localScale;
  reflectedLight.indirectDiffuse = vec3( 0.0 );
}
#endif
`;

const TWO_TONE_MATTE_SPEC_SUPPRESS = /* glsl */ `
if ( shininess <= 1.0 ) {
  reflectedLight.directSpecular = vec3( 0.0 );
}
`;

/**
 * Ubah MeshLambertMaterial atau MeshPhongMaterial (logam tetap punya specular, matte 0 specular) menjadi two-tone soft-lit.
 * Panggil sekali saat material dibuat, sebelum render pertama.
 */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(material: T): T {
  const isPhong = material instanceof THREE.MeshPhongMaterial;
  const body = isPhong ? TWO_TONE_BODY + TWO_TONE_MATTE_SPEC_SUPPRESS : TWO_TONE_BODY;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, TONE);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', TWO_TONE_DECL)
      .replace('#include <lights_fragment_begin>', 'float sunVis = 1.0; int sunVisSet = 0;\n' + LFB)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + body);
  };
  material.customProgramCacheKey = () => (isPhong ? 'atelierTwoTonePhongV35' : 'atelierTwoToneLambertV35');
  return material;
}

const CARD_DECL = /* glsl */ `#include <common>
uniform vec3 uCharTint;
uniform float uCharShade;
uniform float uGrad;
uniform float uBodyGrad;
uniform vec3 uSideTint;
uniform float uLocalLight;`;

const CARD_BODY = /* glsl */ `
vec3 outgoingLight = diffuseColor.rgb * uCharTint;
{
  vec2 cardUv = vec2( 0.5 );
  float cardDuSign = 1.0;
  #ifdef USE_MAP
  cardUv = vMapUv;
  cardDuSign = sign( dFdx( vMapUv.x ) + 1e-7 );
  #endif
#if NUM_DIR_LIGHTS > 0
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = clamp( sunV.x * 1.4, -1.0, 1.0 );
  float u = clamp( ( cardUv.x - 0.5 ) / 0.22, -1.0, 1.0 ) * cardDuSign;
  // Volume bola/silinder 2.5D: kepala memakai kelengkungan bola halus, torso memakai silinder lembut.
  float head = smoothstep( 0.57, 0.63, cardUv.y );
  float cylZ = sqrt( max( 0.04, 1.0 - u * u * 0.68 ) );
  float t = u * side;
  float g = mix( uBodyGrad, uGrad, head );
  float dark = smoothstep( 0.08, 1.0, -t );
  float wrap = mix( 0.94, 1.03, cylZ );
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, clamp( dark * ( g / max( uGrad, 1e-3 ) ) * 0.45, 0.0, 1.0 ) );
  float top = 1.0 + 0.05 * clamp( ( cardUv.y - 0.71 ) / 0.14, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.035 * max( t, 0.0 );
  // Bayangan nyata (receiveShadow) dari atap/pohon/konter jatuh ke badan & wajah, ekspresi tetap jernih.
  float shadowFactor = mix( uCharShade, 1.0, sunVis );
  outgoingLight *= shadowFactor * ( 1.0 - g * dark ) * sideK * top * lift * wrap;
#endif
  // Cahaya lokal (<pointLight>/<spotLight>) dengan Reinhard soft-clamp + scalar headroom anti hue-shift & anti over-bloom.
  vec3 rawCardLocal = max( localDirect * uLocalLight, vec3( 0.0 ) );
  vec3 cardLocalAdd = min( rawCardLocal / ( vec3( 1.0 ) + rawCardLocal * 0.9 ), vec3( 0.92 ) ) * 0.65;
  float maxCardBase = max( outgoingLight.r, max( outgoingLight.g, outgoingLight.b ) );
  float maxCardAdd = max( cardLocalAdd.r, max( cardLocalAdd.g, cardLocalAdd.b ) );
  float cardScale = maxCardAdd > 1e-4 ? min( 1.0, max( 0.0, 0.95 - maxCardBase ) / maxCardAdd ) : 0.0;
  outgoingLight += cardLocalAdd * cardScale;
}
`;

/**
 * Shading khusus kartu karakter 2,5D (billboard): volume bola/silinder mengikuti arah matahari,
 * menerima bayangan nyata (`receiveShadow`) dari dunia 3D, dan merespons lampu lokal dengan Reinhard soft-clamp.
 */
export function cardShade(material: THREE.MeshLambertMaterial): THREE.MeshLambertMaterial {
  material.emissive.set(0x000000);
  material.emissiveIntensity = 0;
  material.emissiveMap = null;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, CHAR, { uLocalLight: TONE.uLocalLight });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', CARD_DECL)
      .replace('#include <lights_lambert_pars_fragment>', CARD_LAMBERT_PARS)
      .replace('#include <lights_fragment_begin>', 'float sunVis = 1.0; int sunVisSet = 0;\n' + LFB)
      .replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        CARD_BODY,
      );
  };
  material.customProgramCacheKey = () => 'atelierCardV3c';
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
  TONE.uLocalLight.value = light.tone.localLight ?? 1.0;

  CHAR.uCharTint.value.set(...light.card.tint);
  CHAR.uCharShade.value = light.card.shadeFloor;
  CHAR.uGrad.value = light.card.headGrad;
  CHAR.uBodyGrad.value = light.card.bodyGrad;
  CHAR.uSideTint.value.set(...light.card.sideTint);
}
