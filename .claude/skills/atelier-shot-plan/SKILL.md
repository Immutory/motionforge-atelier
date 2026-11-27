---
name: atelier-shot-plan
description: Design the shot list, canonical `<CameraRig />` choreography, 180° screen geography vs 360° orbit yaw continuity, transitions (dissolve/wipe/flash), camera-local harmonic kicks, handheld micro-breathe, and depth-of-field following Cinema Camera v4.0 (`(1).mp4` & `download.mp4`). Use for any camera, framing, angle, staging, transition, or shots.ts task.
---

# Shot Plan — Cinema Camera v4.0 (Atelier v4.0)

Camera language follows the two primary studio references: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4` (dynamic impact grammar, 3D prop inserts, shadow reveals) and `contohvideo/download.mp4` (soft-lit 3D atmospheric staging, *frame-within-a-frame*, motivated dollies): **Purposeful 3D Move → Confident Settle**.

## Canonical Engine Rig & Data Model
- Always import **`<CameraRig pose={pose} shake={shake} />`** and **`viewAxisFocus(pose.pos, pose.look, target)`** from `engine` — never duplicate CameraRig in productions!
- `SHOTS`: `{ id, from, to, light, note?, transition?: 'cut' | 'flash' | 'dissolve' | 'wipe', transitionFrames?: number }`.
- `CAMS`: `{ frame, pose: { pos, look, fov, roll }, glide?, cut?, creepRate?, path?: 'linear' | 'dolly' | 'whip' | 'orbit', orbitCenter?, handheld? }`.
- `KICKS`: `{ frame, strength, length? }` — use **`kickOffset(KICKS, frame, pose)`** for **camera-local damped harmonic shake** (`right`, `up`, `roll`) so desk/wall impacts (`strikeEnvelope`) stay accurate at every camera yaw!

## Cinema Camera v4.5 Grammar (Synced with `contohvideo/(1).mp4`)
- **180° Screen Geography vs 360° Continuous Orbit**: Keep hard dialogue shot/reverse-shot cuts strictly on one side of the 180° action axis (`view` + `facing`). During continuous `orbitTo` / `orbitArc` moves around characters, drive poses with `yawDeg: v25.yawDeg` (`resolve25DView`) so characters turn smoothly through `0° → 360°` without popping!
- **Confident Holds vs Reference Push (`DEFAULT_CREEP = 0`, `REF_PUSH_CREEP = 0.0014`)**: Deadpan holds stay rock-steady (`creepRate: 0`, `roll: 0`); for living `(1).mp4`-style tension frames use explicit `creepRate: REF_PUSH_CREEP` (`0.14%/f`, matching `motion.md`).
- **Organic Micro-Breathe (`handheld?: number`, default `0`)**: Optional subtle camera-local breathing (`±2.5 mm`, `±0.07°`), auto-0 on macro shots (`dist < 0.85 m`) and locked to `totalFrames` (dividing `90f`) for seamless looping!
- **Purposeful 3D Camera Helpers (`engine/core/camera.ts`)**:
  - `moveSettle(fromFrame, startPose, endPose, glideFrames, path?)`: smooth `smootherstep` 18–32f → settle.
  - **`punchIn(fromFrame, basePose, targetLook, zoomFactor, glideFrames)`** (`path: 'punch'`): snappy symmetrical punch-in with ~4.5% settle (`(1).mp4` `00:02`, `00:08`, `00:19`).
  - **`swipeTrack(fromFrame, startPose, endPose, rollDeg, glideFrames)`**: motivated lateral pan/track with banking roll following prop strokes (`(1).mp4` `00:00–00:02`).
  - **`craneDive(fromFrame, aerialPose, groundPose, glideFrames)`** (`path: 'dive'`): exponential aerial altitude dive (`(1).mp4` `00:39–00:44`).
  - **`portalPush(fromFrame, framePose, interiorPose, glideFrames, holdBeforeFrames)`**: push straight through doorway/window/monitor frame into interior (`(1).mp4` `00:44–00:47`).
  - **`steppedEscalate(fromFrame, poses, stepHold, stepGlide)`**: rhythmic 3-beat escalation push before impact (`(1).mp4` `00:47–00:50`).
  - `pullOutReveal` (`path: 'dolly'`), **`whipPan`** (`path: 'whip'`), **analytical `orbitTo` / `orbitArc`** (`path: 'orbit'`), `storyDolly`, `topDownInsert` (**STRICTLY for pure 3D props on tables/counters!**), and `craneTransition`.
- **15 Hz Snap Impact & Trauma Shake (`kickOffset`)**: Supports `mode: 'harmonic' | 'snap15hz' | 'trauma'` (`(-1)^d` alternating-sign 15 Hz snap per `motion.md` L72) plus `fovPunch` wired into `<CameraRig />` (`dfov`)!
- **Frame-within-a-Frame & Transitions**: Frame subjects through doorways, warung canopies, or windows (`download.mp4`); use `Shot.transition` (`cut`, `dissolve` 8–14f, `wipe` 8–12f, `flash` 4–6f). Light, DOF, and focus change ONLY on hard cuts.

## Sync, Loop, & Spatial Audit 2.5D (`engine/core/spatial.ts`)
- Land visual reactions **2 frames early** via `reactionFrame(words, index, fps, 2)`.
- Seamless Short loop: `TOTAL_FRAMES % 90 === 0`, `sampleCamera(CAMS, TOTAL_FRAMES - 1)` matches `sampleCamera(CAMS, 0)`.
- Mandatory pre-G2 checks:
  - `checkSafeFraming` (`actorFramingSubjects`) + **`checkScreenOcclusion`** (0 cropped faces/signs, 0 foreground prop blocking speaker face, clear of `SUB_STACK = 'label-above'` zone `1485–1690 px`).
  - `checkBillboardSweep` (tiered + 3D tilted quad) + perspective `checkCounterVisibility(pos, h, counterTopY, 0.32, camPos, counterFrontZ)` + 5-ray `checkSightline` (`targetRadius`, glass auto-ignored).
- **ZERO 2D HUD boxes/banners**: tell everything diegetically in 3D!
