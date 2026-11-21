---
name: atelier-light-grade
description: Set up motivated lighting, sky, fog, palette and color grade for a scene. Use whenever a shot looks flat, muddy, too dark, over-saturated, or when the user asks for a mood such as golden hour, night, neon or noon.
---

# Light and Grade

Light tells the viewer where they are and how to feel. Pretty light with no source feels fake.

## Motivated sources
Name each source: window sun, tungsten bulb, LED tube, phone or monitor glow. Place the light where that source is. Add a rim light so the 2D character separates from the 3D background.

## Presets (engine/stage/lights.ts)
`noon`, `amber`, `dusk`, `neon`. Treat them as starting values. A production may override them in `look.ts`.

## Rules of thumb
- Sun direction is camera-relative and frozen per shot, so shading does not crawl while the camera moves.
- Fog color equals horizon color. Distance fades toward the horizon.
- Cool tint belongs in shade only. Shadows lean violet or blue, never brown.
- Do not crush blacks. Lit faces stay bright but not neon.
- Wood and stone albedos are muted. Avoid lemon yellow and lavender on lit faces.
- Signs with text use an unlit material or they turn grey under side sun.

## Rim light
Inner rim only, on head and torso. An offset outer copy of the sprite turns every hat into a picture frame.

## Check
Use `atelier-quality-gate` numeric checks on stills. Get G2 approval before motion work.
