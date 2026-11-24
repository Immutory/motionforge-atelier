---
name: atelier-shot-plan
description: Design the shot list, camera keys, cuts, transitions (dissolve/wipe/flash), kicks, and depth-of-field for vertical 9:16 shorts following studio Reference Cinema Camera (`contohvideo/`). Use for any camera, framing, angle, staging, transition, or shots.ts task.
---

# Shot Plan — Reference Cinema Camera (Atelier v2.0)

Camera language follows the studio reference (`contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (4).mp4` & `(1).mp4`): **Purposeful 3D Move → Confident Settle**. Every move has a storytelling motivation; when the camera settles on dialogue or stage acting, it holds **steady and confident (`creepRate: 0`, `roll: 0`)** so the audience reads the acting instead of suffering monotonous slow zoom-ins.

## Data Model (`productions/<slug>/shots.ts`)
- `SHOTS`: `{ id, from, to, light, note?, transition?: 'cut' | 'flash' | 'dissolve' | 'wipe', transitionFrames?: number }`.
- `CAMS`: `{ frame, pose: { pos, look, fov, roll }, glide?, cut?, creepRate?, path?: 'linear' | 'dolly' }`.
- `KICKS`: `{ frame, strength, length? }` impact shakes (sign-flipping decay, default 7f).

## Reference Cinema Camera Grammar (v2.0)
- **Confident Settled Holds (`DEFAULT_CREEP = 0`)**:
  - Dialogue holds and symmetrical stage shots hold **rock-steady (`creepRate: 0`, `roll: 0`)**. **NEVER apply monotonous slow zoom-in across every shot!**
  - Explicit `creepRate` (e.g. `0.0018`) is reserved strictly for rare, deliberate high-tension beats.
  - Keep frames organically alive during settled holds via living acting & micro-life (blinks, RMS lip-sync, breathing, steam, monitor pulse, swaying lamps) — never fake camera creep.
- **Purposeful 3D Camera Helpers (`engine/core/camera.ts`)**:
  - **`moveSettle(fromFrame, startPose, endPose, glideFrames, path?)`**: Confident dolly-in or lateral pan (`smootherstep`, 18–32f, peak speed ≤ 25 px/f @720p) → **hard settle (`creepRate: 0`)**.
  - **`pullOutReveal(fromFrame, holdMacroFrames, macroPose, widePose, glideFrames)`**: Open on a macro 3D prop, then pull back logarithmically (`path: 'dolly'`) to unveil the full stage and settle.
  - **`orbitArc(fromFrame, center, radius, azFromDeg, azToDeg, y, fov, frames)`**: Curved 3D orbital shift that showcases genuine foreground/subject/background parallax, then settles.
  - **`topDownInsert(center, height, fov, rollDeg?)`**: Flat-lay 90° overhead insert directly above table/props (gimbal-safe).
  - **`craneTransition(fromFrame, highPose, lowPose, frames)`**: Smooth swoop from bird's-eye/aerial establishing down to eye-level or into pure horizontal side-scrolling tracking (zero double-hitch).
- **Shot Variety & Rhythm**:
  - Break each 4–6 second beat into 2–3 contrasting shot sizes (wide establishing, symmetrical medium two-shot, macro 3D prop insert, top-down flat-lay, OTS).
  - Hard cut on large scale or location changes; keep eye-level camera pitch consistent (`≤ 12°` tilt unless intentionally crane/top-down).
- **First-Class Transitions (`Shot.transition`)**:
  - `'cut'`: Crisp editorial cut (default).
  - `'dissolve'` (`transitionFrames: 8–14`): Cinematic cross-dissolve for time/space transitions or emotional reflection.
  - `'wipe'` (`transitionFrames: 8–12`): Foreground object wipe across the lens.
  - `'flash'` (`transitionFrames: 4–6`): Brief white flash when reality snaps (dream → cold fact, or instant replay).
- **Impact Kicks**: Use `KICKS` on punch impacts (`PLAK!`, desk slam, jump land), synced with `strikeEnvelope`.

## Sync
Visual reactions land **2 frames before** their triggering word (`0–3f` lead). Always compute via `reactionFrame(words, index, fps, 2)`.

## Safe Framing, Zero-Clipping & Diegetic Storytelling
- **Mandatory `checkSafeFraming` & `checkBillboardSweep` (`engine/core/spatial.ts`)**:
  - Every key shot MUST pass `checkSafeFraming(pose, subjects, ASPECT_9_16, 0.88, 0.88)`: **0 cropped faces, heads, ears, or critical 3D signage (`WARKOP 24 JAM`, `MENU WARKOP`, `LAB KOMPUTER FIK 2.1`)**.
  - Keep faces and primary prop actions **clear of the 9:16 subtitle safe zone (`y ≈ 76–88%`, NDC `y ∈ [-0.76, -0.52]`)**.
  - Avoid extreme side OTS yaw angles (`> 35°` when seated near benches/tables) unless verified clear by `checkBillboardSweep`.
  - Run `checkSightline` against poles/cables/props and add any blocker to `hideNames`.
- **ZERO 2D HUD Boxes / Banners**:
  - **NEVER** place floating 2D HUD boxes, popup cards, alarm banners, or outro panels over the 3D scene. Tell everything **diegetically inside the 3D world** (3D laptop screens, 3D whiteboards, 3D clocks, character acting).
  - The only permitted 2D layer over 3D is clean **bottom subtitles + speaker label** (`y ≈ 1485 px` on 1920 height) and shot transitions (`flash` / `dissolve` / `wipe`).

## Depth of Field & Consistency
- Use shallow DOF on ~1/3 of screen time (close-ups & macro inserts, focused on eyes/hero prop); keep wides sharp.
- Light presets, DOF enable state, and focus targets only change on **hard cuts** (zero mid-shot pops).

## Check
Pass `checkSafeFraming` + `checkBillboardSweep` + `checkSightline` before G2 stills, then render per-beat motion previews before G3 approval.
