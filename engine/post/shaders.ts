export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Normal + alpha cut-out pass khusus dunia 3D (Mesh & InstancedMesh), bebas objek layer NOINK. */
export const WORLD_NORMAL_VERT = /* glsl */ `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;

export const WORLD_NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  gl_FragColor = vec4(n, 1.0);
}`;

/**
 * Masker garis tinta dunia 3D:
 * - Depth jump (turunan kedua 1/z, tepat 0 di bidang datar -> tanpa garis palsu di lantai miring)
 * - Normal crease & contact fold (sudut antar-bidang di kedalaman sama)
 * - Lebar relatif konstan di layar (skala log jarak), AA kontinu, bebas oklusi karakter (tMainDepth)
 * - Output: R = cakupan tinta, G = faktor kabut kedalaman (untuk mengangkat warna tinta di kejauhan)
 */
export const INK_MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float uStrength;
uniform float useMain;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;

const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 6

float distAt(sampler2D t, vec2 uv) {
  return -perspectiveDepthToViewZ(textureLod(t, clamp(uv, vec2(0.0), vec2(1.0)), 0.0).x, uNear, uFar);
}

vec3 viewPos(vec2 uv, float d) {
  vec2 n = uv * 2.0 - 1.0;
  return vec3(n.x * d / p00, n.y * d / p11, -d);
}

float creaseAt(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, clamp(uq, vec2(0.0), vec2(1.0)), 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float zc = distAt(tDepth, vUv);

  // Jika karakter/kartu di layer NOINK berada lebih dekat daripada dunia 3D, jangan timpa dengan tinta dunia.
  if (useMain > 0.5) {
    float zm = distAt(tMainDepth, vUv);
    zm = min(zm, distAt(tMainDepth, vUv + vec2(uTexel.x, 0.0)));
    zm = min(zm, distAt(tMainDepth, vUv - vec2(uTexel.x, 0.0)));
    zm = min(zm, distAt(tMainDepth, vUv + vec2(0.0, uTexel.y)));
    zm = min(zm, distAt(tMainDepth, vUv - vec2(0.0, uTexel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(max(zc, 0.1) / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t);
  float hc = 0.5 * w * creaseScale;
  float Wc = 1.0 / max(zc, 0.05);
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0;
  float eN = 0.0;

  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * uTexel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = distAt(tDepth, vUv - o);
      float z2 = distAt(tDepth, vUv + o);
      float s = (1.0 / max(z1, 0.05) + 1.0 / max(z2, 0.05) - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      if (ch > 0.0) {
        eN = max(eN, max(creaseAt(n0, P0, zc, vUv - o, z1), creaseAt(n0, P0, zc, vUv + o, z2)) * ch);
      }
    }
  }

  float ink = max(eD, eN) * uStrength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float fogK = clamp((zc - uFogNear) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0);
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`;

/** Komposit masker tinta dengan filter tent 3x3 (AA), tint kabut jarak jauh, dan blend gamma tampilan. */
export const INK_COMP_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 uTexel;
uniform vec3 uInkColor;
uniform vec3 uFogColor;
uniform int uDebug;
varying vec2 vUv;

float mAt(float x, float y) {
  return textureLod(tMask, clamp(vUv + vec2(x, y) * uTexel, vec2(0.0), vec2(1.0)), 0.0).r;
}

void main() {
  float a = (
    4.0 * mAt(0.0, 0.0)
    + 2.0 * (mAt(1.0, 0.0) + mAt(-1.0, 0.0) + mAt(0.0, 1.0) + mAt(0.0, -1.0))
    + mAt(1.0, 1.0) + mAt(-1.0, 1.0) + mAt(1.0, -1.0) + mAt(-1.0, -1.0)
  ) / 16.0;
  vec4 c = textureLod(tDiffuse, vUv, 0.0);
  if (uDebug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }
  if (uDebug == 2) { gl_FragColor = vec4(textureLod(tNormal, vUv, 0.0).xyz * 0.5 + 0.5, 1.0); return; }
  float fogK = textureLod(tMask, vUv, 0.0).g;
  vec3 inkLin = mix(uInkColor, uFogColor, fogK * 0.6);
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  vec3 gi = pow(max(inkLin, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(pow(mix(g, gi, a), vec3(2.2)), c.a);
}`;

export const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = textureLod(tSrc, vUv, 0.0);
}`;

/**
 * Depth-of-field thin-lens scatter-as-gather (references/reports/depth.md 6.1):
 * - Pass 1 (48 tap): gather blur piksel sendiri, latar belakang diblokir agar tidak bocor ke subjek fokus.
 * - Pass 2 (24 tap): objek latar depan yang blur dibiarkan meluber halus di depan latar/subjek tajam.
 * - Semua fetch dalam loop memakai textureLod agar bersih tanpa warning ANGLE X3595.
 */
export const LENS_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uCInf;
uniform float uNearScale;
uniform float uMaxCoC;
varying vec2 vUv;

#define TAPS 48
#define NEAR_TAPS 24
#define GOLDEN 2.39996323

float cocAt(float d) {
  float c = uCInf * (1.0 - uFocus / max(d, 1e-3));
  if (c < 0.0) c *= uNearScale;
  return clamp(c, -uMaxCoC, uMaxCoC);
}

float distAt(vec2 uv) {
  return -perspectiveDepthToViewZ(textureLod(tDepth, clamp(uv, vec2(0.0), vec2(1.0)), 0.0).x, uNear, uFar);
}

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 base = textureLod(tDiffuse, vUv, 0.0);
  if (uCInf < 0.25) { gl_FragColor = base; return; }

  float d0 = distAt(vUv);
  float r0 = abs(cocAt(d0));
  float rot = hash12(gl_FragCoord.xy) * 6.2831853;

  vec3 acc = base.rgb;
  float wsum = 1.0;
  if (r0 > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * r0;
      float a = float(i) * GOLDEN + rot;
      vec2 suv = clamp(vUv + vec2(cos(a), sin(a)) * rr * uTexel, vec2(0.0), vec2(1.0));
      float ds = distAt(suv);
      float rs = abs(cocAt(ds));
      if (ds > d0) rs = min(rs, r0);
      float w = clamp(rs - rr + 0.5, 0.0, 1.0);
      acc += textureLod(tDiffuse, suv, 0.0).rgb * w;
      wsum += w;
    }
  }
  vec3 col = acc / wsum;

  vec3 fg = vec3(0.0);
  float fw = 0.0;
  float cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * uMaxCoC;
    if (rr <= r0) continue;
    float a = float(i) * GOLDEN + rot + 1.0;
    vec2 suv = clamp(vUv + vec2(cos(a), sin(a)) * rr * uTexel, vec2(0.0), vec2(1.0));
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;
    float rs = abs(cocAt(ds));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += textureLod(tDiffuse, suv, 0.0).rgb * w;
    fw += w;
    cov += w * (uMaxCoC * uMaxCoC) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) {
    col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
  }
  gl_FragColor = vec4(col, base.a);
}`;

/**
 * Grade akhir di ruang tampilan sRGB (sesudah OutputPass / NeutralToneMapping):
 * - Lift / gain / kontras (+ kurva Hermite 7-knot opsional)
 * - Saturasi 3 zona (bayangan / midtone / sorotan)
 * - Tint warna 3 zona (lifted warm blacks / shadow tint)
 * - Vignette radial halus (references/reports/grade.md)
 */
export const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uSatZones;
uniform vec3 uTintS;
uniform vec3 uTintM;
uniform vec3 uTintH;
uniform vec2 uVig;
uniform float uAmount;
uniform float uUseCurve;
uniform float uKy[7];
uniform float uKm[7];
varying vec2 vUv;

const float KX[7] = float[7](0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0);

float evalCurve(float x) {
  float xc = clamp(x, 0.0, 1.0);
  for (int i = 0; i < 6; i++) {
    if (xc <= KX[i + 1] || i == 5) {
      float h = KX[i + 1] - KX[i];
      float t = clamp((xc - KX[i]) / h, 0.0, 1.0);
      float t2 = t * t;
      float t3 = t2 * t;
      return (2.0 * t3 - 3.0 * t2 + 1.0) * uKy[i]
           + (t3 - 2.0 * t2 + t) * h * uKm[i]
           + (-2.0 * t3 + 3.0 * t2) * uKy[i + 1]
           + (t3 - t2) * h * uKm[i + 1];
    }
  }
  return xc;
}

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  vec3 src = clamp(c.rgb, 0.0, 1.0);
  vec3 rgb = src;

  if (uUseCurve > 0.5) {
    rgb = vec3(evalCurve(rgb.r), evalCurve(rgb.g), evalCurve(rgb.b));
  }
  rgb = rgb * uGain + uLift;
  rgb = (rgb - 0.5) * uContrast + 0.5;
  rgb = clamp(rgb, 0.0, 1.0);

  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(rgb, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y);
  float wH = smoothstep(0.45, 1.0, y);
  float wM = max(0.0, 1.0 - wS - wH);

  float sat = (uSatZones.y + (uSatZones.x - uSatZones.y) * wS + (uSatZones.z - uSatZones.y) * wH) * uSaturation;
  rgb = vec3(y) + sat * (rgb - vec3(y));
  rgb += wS * uTintS + wM * uTintM + wH * uTintH;

  float r = length(vUv * 2.0 - 1.0) * 0.70710678;
  rgb *= 1.0 - uVig.x * smoothstep(uVig.y, 1.0, r);

  rgb = mix(src, clamp(rgb, 0.0, 1.0), uAmount);
  gl_FragColor = vec4(rgb, c.a);
}`;
