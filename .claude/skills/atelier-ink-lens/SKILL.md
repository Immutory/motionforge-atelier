---
name: atelier-ink-lens
description: Configure the post-processing chain (`engine/post/`): `POST_HYBRID_25D` (recommended default for new v3.5 productions) & `DEFAULT_POST` ink outlines with `NOINK` mask, thin-lens DOF, bloom, neutral tone mapping, grade, canonical `<CameraRig />` wiring, `SUB_STACK = 'label-above'` subtitles, and shot transitions.
---

# Ink and Lens (Atelier v3.5 — Soft-Lit 2.5D Polish)

Post turns the soft-lit matte 3D scene and 2.5D characters into a cohesive illustration aligned with `contohvideo/download.mp4`, `contohvideo/(1).mp4`, and `references/reports/{outlines,depth,grade}.md`.

## Order (Do Not Change)
1. **Ink (`InkPass`)** — with **`NOINK` layer isolation** active (also 3×3 max `fogK` anti-halo on fogged silhouettes).
2. **Lens / Depth of Field (`LensPass`)** — 16-sample spiral thin-lens DOF, focused via canonical `viewAxisFocus(pose.pos, pose.look, target)`.
3. **Bloom (`UnrealBloomPass`)** — HDR emissives only, threshold `1.0` (protected by `uLocalLight` Reinhard soft-clamp).
4. **Neutral Tone Mapping (`OutputPass`)**
5. **Color Grade (`GRADE_PRESETS`: `noon`, `amber`, `dusk`, `night`, `neon`)**
6. **Editorial Transitions** (`cut`, `dissolve` 8–14f, `wipe` 8–12f, `flash` 4–6f)
MSAA 4 on the composer target; automatic `composer.setSize` sync on DPR/buffer resize.

## Post Presets (`engine/post/PostStack.tsx`)
- **`POST_HYBRID_25D` (Recommended v3.5 Default for New Episodes)**: Subtle world outlines (`strength: 0.42`, `thickness: 1.6`), atmospheric depth, and foreground/background shallow DOF (`nearScale: 1.6`) so 2D characters with Canvas2D ink *pop* cleanly against soft-lit matte 3D worlds (`download.mp4`).
- **`DEFAULT_POST`**: Crisp comic world outlines (`strength: 0.96`, `thickness: 3.4`) — 100% preserved for EP01–EP04 backward compatibility.

## Wiring, Subtitles & Resolution Scaling (`Production.tsx`)
- Import `<CameraRig />`, `viewAxisFocus`, `actorHandWorldPos`, and reusable 3D props (`engine/props/`) directly from `engine`.
- Multiply every pixel-sized parameter by `pxScale(outputHeight)` (`outputHeight / 1920`) so 0.5x stills, native `1.0` (`1080×1920`) masters, and optional `--scale 1.3333` 2K renders match identically apart from sharpness.
- **Pure Cinema & `SUB_STACK = 'label-above'`**: ZERO 2D HUD boxes/banners. Bottom subtitles sit strictly in `1485–1690 px` (`@1920`), speaker label above text, max 3 words/line, clear of mouths, and off during the closing loop tail (`loopCutFrame..TOTAL_FRAMES`).
- **Film grain**: Default off.
