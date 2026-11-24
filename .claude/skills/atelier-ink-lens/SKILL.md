---
name: atelier-ink-lens
description: Configure the post-processing chain (`engine/post/`): ink outlines with `NOINK` mask, depth of field, bloom, neutral tone mapping, grade, and shot transitions (cross-dissolve, foreground wipe, flash). Use when outlines look wrong, blur overwrites lines, stills differ from final renders, or the user asks about DOF, bloom, or transitions.
---

# Ink and Lens (Atelier v2.0)

Post is where the 3D scene turns into a crisp hybrid 2D-in-3D illustration aligned with `contohvideo/` and `references/reports/outlines.md` + `depth.md` + `grade.md`. The order of passes matters more than any single parameter.

## Order (Do Not Change)
1. **Ink (`InkPass`)** — with **`NOINK` layer isolation** active!
2. **Lens / Depth of Field (`LensPass`)**
3. **Bloom (`UnrealBloomPass`)** — HDR emissives only, threshold ~1.0
4. **Neutral Tone Mapping**
5. **Color Grade**
6. **Editorial Transitions** (`cut`, `dissolve` 8–14f, `wipe` 8–12f, `flash` 4–6f)
MSAA 4 on the composer target.

## Why This Order
- Ink runs in its own pass **before** blur so DOF never erases or smears 3D set linework.
- Bloom runs **after** blur so practical lamp/neon/screen glow stays luminous and crisp.
- Neutral tone mapping runs before grade so grading operates on predictable linear values.

## Implementation (`engine/post/`)
- Code lives in `engine/post/`: `PostStack.tsx` (composer), `passes.ts` (ink & lens), `shaders.ts`, `layers.ts` (`NOINK`), `scale.ts` (`pxScale`).
- Per-production parameters live in `POST` (`look.ts`) and `DOF` (`shots.ts`).
- `LensPass` uses a 16-sample spiral kernel; upgrade to 2-pass only if bokeh artifacts appear in close-ups.

## Ink Rules (`NOINK` Active)
- Near-black ink color, thicker close to camera and thinner with distance.
- Lines on 3D silhouettes, depth discontinuities, and sharp creases only — no noisy lines on wall-floor joins or the horizon.
- **2D characters (`<ActorBillboard />`, `<CatBillboard />`) and crisp 3D signage (`SignMain`, `MenuLine`, etc.) live on the `NOINK` layer (`engine/post/layers.ts`)**, which `InkPass` excludes cleanly so 2D sprites keep their exact Canvas2D ink without double outlines.

## Resolution Scaling
Every pixel-sized parameter multiplies by `pxScale(outputHeight)` (`outputHeight / 1920`). Stills at scale `0.5` and master renders at `1.0` (`1080×1920`) must match visually apart from resolution sharpness.

## Grain
Default off. Film grain inflates file sizes and degrades under YouTube/TikTok compression.
