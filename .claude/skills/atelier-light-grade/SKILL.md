---
name: atelier-light-grade
description: Set up motivated lighting, sky, fog, palette, and color grade aligned with `contohvideo/` and `references/reports/lighting.md` + `grade.md`. Use whenever a shot looks flat, muddy, too dark, over-saturated, or when configuring siang/sore/malam/neon moods.
---

# Light and Grade (Atelier v2.0)

Light tells the viewer where they are and how to feel. Pretty light with no source feels fake. Calibrate against `contohvideo/` and `references/reports/lighting.md` + `grade.md`.

## Motivated Sources
Name each diegetic source: window sun, warm tungsten hanging lamp, lab fluorescent tube, street lamp pool, or monitor/phone glow. Place lights where the source lives and ensure 2D characters separate cleanly from the 3D background.

## Presets (`engine/stage/lights.ts` & `engine/sets/`)
- Core presets: `noon`, `amber`, `dusk`, `night`, `neon` (`LIGHTS`).
- Interior sets (`<WarkopSet />`, `<KostSet />`, `<KampusSet />`): wrap with **`indoorLight(LIGHTS.xxx)`** (`cameraRelative: false`) so front-top directional light is never blocked by back walls.
- Unified world (`<KampungSet mode="siang" | "sore" | "malam" />`): uses `KAMPUNG_MODES` to switch sky, fog, practical lamps, and window glow automatically.
- Override per production in `look.ts` when needed.

## Rules of Thumb
- **Freeze per shot**: Light preset, sun direction, DOF enable state, and focus target only change on **hard cuts** — never pop or crawl mid-shot!
- **Fog = Horizon**: Fog color matches the horizon so distant silhouettes fade cleanly.
- **Cool shadows only**: Shadows lean violet/blue, never muddy brown. Do not crush blacks; lit faces stay bright and readable without blowing out neon.
- **Muted natural albedos**: Wood, brick, and stone stay grounded; avoid harsh lemon yellow or lavender casts on lit skin.
- **Unlit 3D signage**: Signs with text (`SignMain`, `MenuLine`, `BoardHead`) use unlit `NOINK` materials so lettering stays sharp under any sun angle.

## Rim Light
Inner rim only, on head and torso. Never use an offset outer sprite copy that turns hats or heads into floating picture frames.

## Check
Verify stills against `atelier-quality-gate` (Pillar 4: Motivated Light & Look Bible) and obtain G2 approval before motion work.
