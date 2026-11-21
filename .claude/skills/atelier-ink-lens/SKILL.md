---
name: atelier-ink-lens
description: Configure the post-processing chain: ink outlines, depth of field, bloom, tone mapping and grade, including resolution scaling. Use when outlines look wrong, blur overwrites lines, stills differ from final renders, or the user asks about DOF or bloom.
---

# Ink and Lens

Post is where the 3D scene turns into a drawing. The order of passes matters more than any single parameter.

## Order (do not change)
1. ink
2. lens pre
3. lens main
4. bloom (HDR emissives only, threshold about 1.0)
5. neutral tone map
6. grade
MSAA 4 on the composer target.

## Why this order
- Ink must be its own pass before blur. If ink shares a pass with blur, the blur overwrites the lines.
- Bloom after blur so glow is not smeared by DOF.
- Tone map neutral before grade so grading acts on predictable values.

## Implementasi
Kode ada di `engine/post/`: `PostStack.tsx` (composer), `passes.ts` (ink dan lens), `shaders.ts`, `scale.ts`.
Parameter per produksi lewat `POST` di `look.ts` dan tabel `DOF` di `shots.ts`.
Lens saat ini satu pass (16 sampel spiral), bukan dua pass. Perlu ditingkatkan jika bokeh terlihat kasar.

## Ink rules
- Near-black line color, thicker near the camera and thinner far away.
- Lines on silhouettes, depth jumps and sharp creases only. No lines on wall-floor joins or the horizon.
- Character billboards should live on a no-ink layer. NOT implemented yet: today the ink pass also outlines card silhouettes. Keep `ink.strength` modest until a mask pass exists.

## Resolution scaling
Every pixel-sized parameter multiplies by `outputHeight / 1920`. Stills at scale 0.5 and the master at 1.3333 must look the same apart from sharpness. R3F clamps dpr to at least 1, so a 0.5 still still allocates a full-size buffer.

## Grain
Default off. It makes files several times larger and turns to mush after platform compression.
