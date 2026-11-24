---
name: atelier-quality-gate
description: Verify stills, previews and final video against automated spatial/QA checks and visual pixel inspection, producing a scored report with a numbered fix list. Use after every production phase, before every approval request, and when the user asks "is it good enough" or "cek kualitas".
---

# Quality Gate (Atelier v2.0)

A gate is a promise that the next phase can start without redoing this one. Every review uses **two layers**: (1) automated spatial/code/QA validation (`engine/core/spatial.ts`, `npm run check`, `npm run qa`), and (2) direct pixel-by-pixel visual inspection of stills and motion previews.

## The Four Gates
- **G1 Script:** facts sourced, 55–75 s, cast & voice sheet aligned, user approved.
- **G2 Stills (after Step 3.5 Spatial Audit):** hero stills pass **100% spatial zero-clipping** + visual review for style, framing, proportion, light, and palette.
- **G3 Motion:** per-beat previews approved for reference cinema camera, organic acting, lip-sync, and timing.
- **G4 Master:** final mp4 passes automated `npm run qa`, workspace junk cleaned, and user approved.

## Mandatory 5-Pillar Checklist (Every Shot at G2 & G3)
1. **Zero-Clipping & Spatial Audit (MUST PASS BEFORE VISUAL REVIEW — Auto-Reject Gate G2 on ANY failure!):**
   - Run `checkPropOverlap`, `checkBillboardSweep` (at active camera yaw!), `checkCounterVisibility`, `checkSafeFraming`, and `checkSightline` from `engine/core/spatial.ts`.
   - **Auto-reject Gate G2** if even 1 frame shows: crowded/penetrating props, billboard clipping a bench/table/pole, floating feet, **decapitated/sunken head behind a counter**, or any cropped face/ear/critical 3D sign (`WARKOP 24 JAM`, `MENU WARKOP`, `LAB KOMPUTER FIK 2.1`).
2. **Reference Character Motion (`contohvideo/` & `motion.md`):**
   - Planted feet (`gait: 'planted'`, zero skating), organic Bezier noodle-limbs, independent `headTilt`, authentic `sitHeight` on benches/chairs, `strikeEnvelope` impact grammar, 4-frame `blinkLidAt`, 2f reaction lead, RMS-gated `talkGated` lip-sync, and zero 1-frame stance/arm flicker (`walk ↔ sit`).
3. **Reference Cinema Camera (`contohvideo/`):**
   - **REJECT monotonous slow zoom-in (`creepRate`) across holds!**
   - Require confident settled holds (`creepRate: 0`) paired with purposeful 3D moves (*Move → Settle*, *Pull-Out Reveal*, *Orbit Arc*, *Top-Down Insert*, *Crane Transition*), clean symmetrical staging, and motivated transitions (`cut` / `dissolve` / `wipe` / `flash`).
4. **Motivated Light & Look Bible:**
   - Every light has a diegetic source, directional shadows, characters cleanly separated from backgrounds, never muddy or flat, faces always readable.
5. **Pure Cinema (Zero 2D HUD Clutter):**
   - Reject any floating 2D UI boxes, popup cards, alarm banners, or outro panels over the 3D scene; only clean bottom subtitles + speaker label and shot transitions are allowed.

## Scored Review
Score color, lighting, ink, textures, characters, depth, composition from 1 to 10. Each fix: number, frame, owner agent, one-line change. Keep each verdict under 200 words and inspect 1–3 images at a time.

## Automated Checks (`npm run check` & `npm run qa`)
- `npm run check`: 100% TypeScript + JS spatial/camera/cast tests + Python tests must pass.
- `npm run qa -- out/<slug>/<slug>_final.mp4`: reports black frames (`0`), frozen spans (`0`), and broadcast loudness (`≈ -16 LUFS`, `TP ≤ -1 dBTP`).
- **Static Camera vs True Freeze:** A settled camera hold (`creepRate: 0`) with live acting (blinks, RMS lip-sync, breathing, steam, monitor pulse, cursor blink, swaying lamps) is **valid and expected**! A `freeze_span` indicates a **true frozen frame** where 0 pixels change across the entire frame — fix it by animating living character/world micro-life, NEVER by adding artificial camera zoom creep.

## Fail Fast
If any Pillar 1 (Spatial Zero-Clipping) check fails, or more than two visual scores are below 5, stop immediately and return to the owning phase before advancing.
