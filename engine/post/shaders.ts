export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const LINEARIZE = /* glsl */ `
uniform float uNear;
uniform float uFar;
float linearDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
`;

/** Garis tepi dari lompatan kedalaman. Lebih tebal dekat kamera, lebih tipis di kejauhan. */
export const INK_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uThickness;
uniform float uStrength;
uniform float uThreshold;
uniform vec3 uInkColor;
varying vec2 vUv;
${LINEARIZE}
float depthAt(vec2 uv) { return linearDepth(texture2D(tDepth, uv).x); }
void main() {
  vec4 base = texture2D(tDiffuse, vUv);
  float dc = depthAt(vUv);
  float t = uThickness * clamp(10.0 / max(dc, 0.5), 0.5, 2.0);
  vec2 o = uTexel * t;
  float e = abs(depthAt(vUv + vec2(o.x, 0.0)) - dc)
          + abs(depthAt(vUv - vec2(o.x, 0.0)) - dc)
          + abs(depthAt(vUv + vec2(0.0, o.y)) - dc)
          + abs(depthAt(vUv - vec2(0.0, o.y)) - dc);
  float edge = smoothstep(uThreshold, uThreshold * 2.0, e / max(dc, 0.5));
  gl_FragColor = vec4(mix(base.rgb, uInkColor, edge * uStrength), base.a);
}
`;

/** Blur kedalaman satu pass: 16 sampel spiral, jari-jari mengikuti jarak dari bidang fokus. */
export const LENS_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uFocus;
uniform float uMaxRadius;
varying vec2 vUv;
${LINEARIZE}
void main() {
  float d = linearDepth(texture2D(tDepth, vUv).x);
  float coc = clamp(abs(d - uFocus) / max(uFocus, 0.5), 0.0, 1.0);
  float radius = coc * uMaxRadius;
  vec4 acc = texture2D(tDiffuse, vUv);
  if (radius < 0.5) { gl_FragColor = acc; return; }
  float total = 1.0;
  for (int i = 1; i < 16; i++) {
    float fi = float(i);
    float a = fi * 2.399963;
    float r = sqrt(fi / 16.0) * radius;
    vec2 off = vec2(cos(a), sin(a)) * r * uTexel;
    acc += texture2D(tDiffuse, vUv + off);
    total += 1.0;
  }
  gl_FragColor = acc / total;
}
`;

/** Grade akhir di ruang tampilan: lift, gain, kontras, saturasi. */
export const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uContrast;
uniform float uSaturation;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  vec3 rgb = c.rgb * uGain + uLift;
  rgb = (rgb - 0.5) * uContrast + 0.5;
  float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(l), rgb, uSaturation);
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), c.a);
}
`;
