---
name: atelier-cast-craft
description: Create and animate original 2.5D characters and 2D cats (`ActorBillboard`, `CatBillboard`, `CharCard`) following Atelier v3.5 standards (`contohvideo/(1).mp4`, `download.mp4`, `references/reports/motion.md`) with 2-Bone Analytic Leg IK, 4-pose foot roll, far-leg depth shading, `Math.cos(ph)` arm counter-swing, `computeWalkState()`, default `gait: 'planted'`, 1 whole 2.5D silhouette, `resolve25DView` 8-dir, `actorHandWorldPos`, `seatRadius`, `tiltComp`, and `checkBillboardSweep`.
---

# Cast Craft (Atelier v3.5 — 2D-Grade Walk in 2.5D)

Characters and cats are **1 whole 2.5D vector silhouette** drawn via Canvas2D (`NOINK` layer) — **NEVER** split into floating Z-planes. They integrate physically into 3D worlds via spherical face parallax, weighted asymmetric 2.5D ink, `receiveShadow`/`castShadow` (floor + back wall via `DoubleSide` depth), `uLocalLight` soft-clamped lighting, `actorHandWorldPos` pure 3D hand props, `seatRadius`, high-angle `tiltComp`, and **2D-grade articulated locomotion**. Primary references: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`, `contohvideo/download.mp4`, and `references/reports/{characters,motion}.md`.

## Human Modular Rig (`engine/cast/nusantara.ts` + `ActorBillboard.tsx`)
- Design canvas `700 × 1100`, soles at `y = 1040`, supersample `2x` (`1400 × 2200`).
- **13 Official Indonesian Cast (`CAST_PRESETS`)**:
  - Lead #1: `bangUtoh` (**Bolohoutoh / Bang Utoh**), plus **`ebot`** (pemuda kasual lokal ber-outer rajut earth-tone, fade crop).
  - Supporting & Warga Kampung Rawa Sari RT 04: `arya`, `rara`, `dimas`, `saka`, `pakBudi`, `buSiti`, `raka`, `bangUdin`, `pakUjang`, `tio`, `mbakYuni`.
- **13 Expressions** (`neutral`, `happy`, `laugh`, `shock`, `sad`, `angry`, `smug`, `skeptical`, `nervous`, `tired`, `idea`, `focus`, **`strain`** `> <`) + Comic FX.
- **6 Stances (`ActorStance`)**: `stand`, `walk`, `sit`, `sitCross`, `squat`, `jump`.
- **5 Views / 8-Direction Smooth Turns (`ActorView` + `resolve25DView`)**: `front`, `threeQuarter`, `side`, **`backThreeQuarter`**, and `back`. Always use `resolve25DView(actorPos, forwardOrYaw, camPos)` instead of duplicating `viewFor()` per episode!

## Atelier v3.5 2D-Grade Walk & 2.5D Character Standards
1. **2-Bone Analytic Leg IK & Articulated Foot Roll (`nusantara.ts` v3.5)**:
   - Walking uses **`solveLegIK(hip, ankle, thighLen, shinLen, bendDir)`** for rigid thigh/shin bone lengths with crisp `60–70°` knee bend during Passing/Swing and full extension on Contact/Push-off (zero rubber noodle legs!).
   - **Far-Leg Depth Shading (`darkenHex`)**: On `side` & `threeQuarter`, the far leg renders behind the near leg darkened by `16%` so stride silhouettes never merge into scissors.
   - **4-Pose Classic 2D Foot Roll (`footRollPitchRad`)**: Heel-Strike `+18°`, Down/Flat Contact `0°`, Toe-Off `-24°`, Passing/Swing `-12° → +14°`.
   - **Correct Arm-Leg Counter-Swing & Vertical Bob**: Uses `Math.cos(ph)` counter-swing (front right leg pairs with front left arm) across `side`, `threeQuarter`/`backThreeQuarter`, and foreshortened depth stride on `front`/`back`; lowest bob at Down (`u ≈ 0.12`), highest at Up (`u ≈ 0.37`), forward lean aligned with `travelDir`.
2. **ZERO Ice-Skating Rule (`computeWalkState` + Default `gait: 'planted'`)**:
   - **`gait` defaults to `'planted'`** on both humans and cats (`ActorBillboard`, `CatBillboard`).
   - **MANDATORY**: Whenever an actor's XZ position moves (`|ΔXZ| > 0.002 m/frame`), drive pose via **`computeWalkState(posFn, frame, actorHeight, camPos, opts)`**! It projects horizontal speed onto the camera-facing billboard plane (`strideBlend` 0..1 with smooth ease-out settle), auto-switches `'walk'` ↔ `'stand'`, and unlocks natural arm swing unless overridden (`leftArmOverride`/`rightArmOverride`). **FORBIDDEN: sliding XZ in `stance: 'stand'`!**
   - Dynamic floor contact shadow (`blobY = 0.005`, `blobScaleX`/`blobScaleZ` breathing with walk phase).
3. **Spherical Face Parallax, Weighted Ink, & Pure 3D Hand Props**:
   - Cosine foreshortening on far facial features + weighted ink (`#1f192d`).
   - Attach pure 3D props from `engine/props/` (`BakmieBowl3D`, `DrinkCup3D`, `DiegeticNote3D`, `BoxSign3D`, `Phone3D`, `Laptop3D`) via **`actorHandWorldPos(...)`** (keep `leftProp`/`rightProp: 'none'` when holding a 3D mesh).
4. **Ergonomic Seating, Counter Rules, & High-Angle `tiltComp`**:
   - Seat characters on **single stools/chairs** with `seatRadius` + `sitHeight` from `SpotMeta.seatY` (auto-injects `actorHeight: height`).
   - **FORBIDDEN: `armPose: 'rest'` behind any counter/cart!** Keep every hand `>= counterTopY + 0.08 m`.
   - `tiltComp` (default `true`) tilts smoothly around soles `y = 0` when camera `|pitch| > 12°`.
5. **Motion Grammar & Timing**: `strikeEnvelope` (4f wind-up → 6f hold → 1f strike → 8f follow), `springPop` decaying to `0` on shock `hatPop`, 4-frame `blinkLidAt` (locked on first/last 8f), 2f reaction lead, RMS-gated `talkGated`, zero 1f flicker (`>= 3f` holds), `BREATH_PERIOD = 90`.

## 2D Animated Cat Rig (`engine/cast/cat.ts` + `CatBillboard.tsx`)
- **Rule**: Cats are **ALWAYS 2D (`<CatBillboard />`)**, never 3D Blender meshes!
- **3 Presets (`CAT_PRESETS`)**: `oyen`, `abu`, `belang`. Default **`gait: 'planted'`** + **`catWalkCycleMeters(height, stride)`** (0% cat paw sliding!), `backThreeQuarter`, `seatRadius`, `groundY`, `tiltComp`, `pawRaise` + `pawAngle`/`pawReach`, wave-propagated `tailPhase` (drawn once cleanly on `back`/`backThreeQuarter`), `stretch`, `blink`, `talk`.

## Mandatory Spatial Sweep Audit (`checkBillboardSweep`)
Before G2, run **`checkBillboardSweep(actorPos, width, height, camPos, obstacles, 0.04, { build, leftArm, rightArm, tiltX })`** across all key shots & OTS angles to guarantee **0% clipping**!
