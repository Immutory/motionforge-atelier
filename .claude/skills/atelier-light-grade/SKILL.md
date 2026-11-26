---
name: atelier-light-grade
description: Set up soft-lit matte 2.5D lighting, hemisphere sky-ground wrap, soft PCF shadows (`shadow.radius = 3.0`), motivated sky/fog, soft-clamped local lights (`uLocalLight`), real `receiveShadow`/`castShadow` (active even on `LIGHTS.noon`), palette, and color grade aligned with `contohvideo/download.mp4`, `(1).mp4`, and `references/reports/{lighting,grade}.md`.
---

# Light and Grade (Atelier v3.5 — Soft-Lit Matte 3D Polish)

Light integrates 2D characters physically into a soft-lit matte 3D world (`download.mp4` & `(1).mp4`). Every light must have a motivated diegetic source and zero plastic specular sheen.

## True 2.5D Soft-Lit Lighting & Shadow Integration (`engine/stage/shade.ts` & `lights.ts` v3.5)
- **Anti-Plastic Matte Suppression & Hemisphere Wrap (`twoTone()` v3.5)**:
  - `twoTone()` suppresses `directSpecular` completely whenever `shininess <= 1.0` (paired with `classifyGlbSurface` matte `shininess: 0`) and blends subtle sky-ground hemisphere wrap (`hemiWrap`) for painterly matte depth like `download.mp4`.
- **Soft-Lit Terminator & Soft PCF Shadows (`lights.ts` & `Stage.tsx` v3.5)**:
  - `LIGHTS.noon` uses soft terminator `term: 0.30`, `lambert: 0.46`, `shadow.radius = 3.0`, and **`card.castShadow = true`** so characters cast real soft shadows on floors & walls even in broad daylight!
  - All presets configure `shadow.radius` (`2.8–3.0`) passed to `<directionalLight shadow-radius={...} />` in `Stage.tsx` to eliminate jagged shadow edges.
- **`uLocalLight` + Reinhard Soft-Clamp (Anti-Overbloom)**:
  - Active by default (`TONE.uLocalLight = 1.0`, configurable via `LightPreset.tone.localLight`), clamping `<pointLight>`/`<spotLight>` below bloom threshold `1.0` with scalar headroom anti-hue-shift (**0% white washout**).
- **Spherical/Cylindrical Volume + `receiveShadow` + `castShadow`**:
  - `cardShade()` applies smooth spherical head / cylindrical torso wrap and receives real directional shadows (`receiveShadow`) while keeping facial expressions crisp.
  - Pair with `POST_HYBRID_25D` in `look.ts` for `download.mp4`-style atmospheric depth where 2D characters pop naturally.

## Presets (`engine/stage/lights.ts` & `engine/sets/`)
- 5 core presets: `noon`, `amber`, `dusk`, `night`, `neon` (matched 5-to-5 with `GRADE_PRESETS`).
- Interior sets (`<WarkopSet />`, `<KostSet />`, `<KampusSet />`): wrap with **`indoorLight(LIGHTS.xxx)`** (`cameraRelative: false`).
- Unified world (`<KampungSet mode="siang" | "sore" | "malam" />`): uses `KAMPUNG_MODES` automatically.

## Rules of Thumb
- **Hard-cut discipline**: Light preset, sun direction, DOF, and focus change ONLY on hard cuts.
- **Fog = Horizon**, cool violet/blue shadows only (never muddy brown), never crush blacks, unlit `NOINK` for 3D signs.
- Verify stills against `atelier-quality-gate` (0% plastic sheen, 0% over-bloom, clean soft shadow integration) before G2 approval.
