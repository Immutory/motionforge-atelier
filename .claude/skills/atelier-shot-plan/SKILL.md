---
name: atelier-shot-plan
description: Design the shot list, canonical `<CameraRig />` choreography, cuts, transitions (dissolve/wipe/flash), camera-local harmonic kicks, handheld micro-breathe, and depth-of-field following Cinema Camera v3.0 (`(1).mp4` & `download.mp4`). Use for any camera, framing, angle, staging, transition, or shots.ts task.
---

# Shot Plan — Cinema Camera v3.0 (Atelier v3.0)

Camera language follows the two primary studio references: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4` (dynamic impact grammar, 3D prop inserts, shadow reveals) and `contohvideo/download.mp4` (soft-lit 3D atmospheric staging, *frame-within-a-frame*, motivated dollies): **Purposeful 3D Move → Confident Settle**.

## Canonical Engine Rig & Data Model
- Always import **`<CameraRig pose={pose} shake={shake} />`** and **`viewAxisFocus(pose.pos, pose.look, target)`** from `engine` — never duplicate CameraRig in productions!
- `SHOTS`: `{ id, from, to, light, note?, transition?: 'cut' | 'flash' | 'dissolve' | 'wipe', transitionFrames?: number }`.
- `CAMS`: `{ frame, pose: { pos, look, fov, roll }, glide?, cut?, creepRate?, path?: 'linear' | 'dolly' | 'whip' | 'orbit', orbitCenter?, handheld? }`.
- `KICKS`: `{ frame, strength, length? }` — use **`kickOffset(KICKS, frame, pose)`** for **camera-local damped harmonic shake** (`right`, `up`, `roll`) so desk/wall impacts (`strikeEnvelope`) stay accurate at every camera yaw!

## Cinema Camera v3.0 Grammar
- **Confident Settled Holds (`DEFAULT_CREEP = 0`)**: Hold dialogue & symmetrical shots rock-steady (`creepRate: 0`, `roll: 0`) — **ZERO monotonous slow zoom-in!**
- **Organic Micro-Breathe (`handheld?: number`, default `0`)**: Optional subtle camera-local breathing (`±2.5 mm`, `±0.07°`), auto-0 on macro shots (`dist < 0.85 m`) and locked to `totalFrames` (dividing `90f`) for seamless looping!
- **Purposeful 3D Camera Helpers (`engine/core/camera.ts`)**:
  - `moveSettle(fromFrame, startPose, endPose, glideFrames, path?)`: smooth `smootherstep` 18–32f → settle.
  - `pullOutReveal(fromFrame, holdMacroFrames, macroPose, widePose, glideFrames)`: macro → logarithmic `dolly` wide reveal.
  - **`whipPan(fromFrame, startPose, endPose, glideFrames = 11)`** (`path: 'whip'`): fast acceleration + damped spring settle (8–14f) for sharp comedy reactions.
  - **Analytical `orbitTo` / `orbitArc`** (`path: 'orbit'`): C²-smooth 3D orbital curve inside `sampleCamera()` using only **2 clean keyframes**!
  - **`storyDolly(fromFrame, startPose, endPose, glideFrames, holdBeforeFrames?, path?)`**: motivated dolly/pan following action (`(1).mp4` `00:02`, `download.mp4` `00:47`), always ending in confident settle.
  - **`topDownInsert(center, height, fov, rollDeg?)`**: 90° flat-lay **STRICTLY for pure 3D props on tables/counters (`(1).mp4` `00:06`), NEVER overhead on 2D character billboards!**
  - `craneTransition(fromFrame, highPose, lowPose, frames)`: aerial → eye-level (triggers automatic `tiltComp` while `|pitch| > 12°`).
- **Frame-within-a-Frame & Transitions**: Frame subjects through doorways, warung canopies, or windows (`download.mp4`); use `Shot.transition` (`cut`, `dissolve` 8–14f, `wipe` 8–12f, `flash` 4–6f). Light, DOF, and focus change ONLY on hard cuts.

## Sync, Loop, & Spatial Audit 2.5D (`engine/core/spatial.ts`)
- Land visual reactions **2 frames early** via `reactionFrame(words, index, fps, 2)`.
- Seamless Short loop: `TOTAL_FRAMES % 90 === 0`, `sampleCamera(CAMS, TOTAL_FRAMES - 1)` matches `sampleCamera(CAMS, 0)`.
- Mandatory pre-G2 checks:
  - `checkSafeFraming` (`actorFramingSubjects`) + **`checkScreenOcclusion`** (0 cropped faces/signs, 0 foreground prop blocking speaker face, clear of `SUB_STACK = 'label-above'` zone `1485–1690 px`).
  - `checkBillboardSweep` (tiered + 3D tilted quad) + perspective `checkCounterVisibility(pos, h, counterTopY, 0.32, camPos, counterFrontZ)` + 5-ray `checkSightline` (`targetRadius`, glass auto-ignored).
- **ZERO 2D HUD boxes/banners**: tell everything diegetically in 3D!
