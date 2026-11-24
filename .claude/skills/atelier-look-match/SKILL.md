---
name: atelier-look-match
description: Measure a reference style (`contohvideo/` & `references/reports/`) with numbers and tune your own look toward it in parallel sandboxes with one owner per file. Use when the user says "make it look like X", wants to match a style, or asks to improve overall visual quality across several areas at once.
---

# Look Match (Atelier v2.0)

Adjectives like "warmer" or "punchier" do not converge. Numbers and side-by-side images do.

## Primary Studio References
- **Video References (`contohvideo/`)**: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4` (organic character animation, 180° back turn, top-down flat-lay insert, deadpan-to-peak contrast) and `(4).mp4` (purposeful 3D camera move → settle, symmetrical staging, aerial crane-to-horizontal-track, cross-dissolve, ergonomic counter framing).
- **Measured Reports (`references/reports/`)**: `motion.md`, `characters.md`, `lighting.md`, `outlines.md`, `textures.md`, `depth.md`, `grade.md`.

## 1. Measure First
For each topic (motion, depth, textures, characters, lighting, outlines, grade) write or update a short report with measured values in `references/reports/<topic>.md` using `references/measure-template.md`. Measured reports + `contohvideo/` are the shared source of truth for every agent.

## 2. Own the Files
One agent owns each file group. See `docs/04-file-ownership.md`. Agents edit only their own files.

## 3. Sandboxes
Copy `productions/<slug>` to `productions/<slug>_cam`, `_world`, `_mat`, `_char`, `_post`. Each owner works in a sandbox and renders stills.

## 4. Merge
Merge owned files back into the main folder, run `npm run check` (typecheck + spatial/unit tests), then re-sync every sandbox from main before the next round.

## 5. Verify
A fresh `qa-inspector` runs `engine/core/spatial.ts` audits + compares side-by-side sheets (yours vs `contohvideo/` reference), scores each area, and returns a numbered fix list routed to each owner.

## 6. Contracts
Shared constants are contracts (`NOINK` layer, `DEFAULT_CREEP = 0`, `SpotMeta`, DOF table, light presets). If you change one, update every reader and test.

## Study, Not Copy
References teach the look, camera grammar, and motion craft. Your story, characters, voice, and shots stay 100% original. Reference frames are private study material — never publish them.
