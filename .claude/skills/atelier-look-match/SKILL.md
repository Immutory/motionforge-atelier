---
name: atelier-look-match
description: Measure reference style (`contohvideo/download.mp4`, `(1).mp4`, & `references/reports/`) with numbers and tune your look toward Atelier v4.0 (2.5D volumetric 360° + soft-lit matte 3D polish) in parallel sandboxes with one owner per file.
---

# Look Match (Atelier v4.0 — 2.5D Volumetric 360° + Soft-Lit 3D Polish)

Adjectives like "warmer" or "punchier" do not converge. Numbers and side-by-side images do.

## Primary Studio References
1. **`contohvideo/download.mp4`** (99.9 s): clean 2D vector characters walking/acting inside a **soft-lit matte 3D world** (zero plastic sheen, `classifyGlbSurface` matte `shininess: 0`, `Roughness >= 0.82`, soft `shadow.radius = 3.0`, `POST_HYBRID_25D` thin world ink, seamless 2D-in-3D `receiveShadow` integration, *frame-within-a-frame*, motivated `storyDolly`).
2. **`contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`** (65.3 s): 1 whole 2.5D character silhouette with articulated 2-bone IK walk & 4-pose foot roll, spherical face parallax, weighted asymmetric ink, pure 3D prop grip (`engine/props/`), floor & wall silhouette shadows, `strikeEnvelope` + camera-local harmonic shake, `topDownInsert` on 3D props, and high-angle `tiltX`.
3. **Measured Reports (`references/reports/`)**: `CONTEXT.md`, `motion.md`, `characters.md`, `lighting.md`, `outlines.md`, `textures.md`, `depth.md`, `grade.md`.

## Workflow
1. **Measure First**: Update `references/reports/<topic>.md` with concrete measured metrics.
2. **Own the Files**: Strictly follow `docs/04-file-ownership.md` — one agent per file group.
3. **Sandboxes & Merge**: Tune per owner, merge cleanly, and verify `npm run check` (typecheck + spatial/engine/Python tests).
4. **Verify**: Fresh `qa-inspector` runs `spatial.ts` + walk-cycle 4-pose & anti-plastic matte audits + compares stills pixel-by-pixel against `download.mp4` & `(1).mp4`.
5. **Study, Not Copy**: References teach craft and numbers; story, characters, voice, and shots stay 100% original. Never publish private reference material.
