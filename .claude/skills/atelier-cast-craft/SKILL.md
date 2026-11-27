---
name: atelier-cast-craft
description: Create and animate original 2.5D volumetric 360° characters and 2D cats (`ActorBillboard`, `CatBillboard`, `CharCard`) following Atelier v4.0 standards (`contohvideo/(1).mp4`, `download.mp4`, `references/reports/motion.md`) with continuous `-180°..+180°` rig360 projection, `uReliefMap` 3D normal/AO/Fresnel shading, persistent VRAM canvases, 2-Bone Analytic Leg IK, 4-pose foot roll, far-leg depth shading, `Math.cos(ph)` arm counter-swing, `computeWalkState()`, `resolve25DView`, `actorHandWorldPos` `rawZ`, `seatRadius`, `tiltComp`, and `checkBillboardSweep`.
---

# Cast Craft (Atelier v4.0 — 2.5D Volumetric 360° + Full Cast Polish)

Characters and cats remain **1 whole 2.5D vector silhouette** drawn via Canvas2D (`NOINK` layer) — **NEVER** split into floating Z-planes. They achieve full 360° "ala 3D" depth via `rig360.ts` continuous projection, per-pixel `uReliefMap` normals/contact-AO/Fresnel rim (`shade.ts`), persistent zero-leak canvases, weighted asymmetric 2.5D ink, `receiveShadow`/`castShadow`, `uLocalLight` soft-clamped lighting, `actorHandWorldPos` (`rawZ` 3D depth), `seatRadius`, high-angle `tiltComp`, and **2D-grade articulated locomotion**. Primary references: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`, `contohvideo/download.mp4`, and `references/reports/{characters,motion}.md`.

## Human Modular Rig (`engine/cast/nusantara.ts`, `rig360.ts`, `expressions.ts`, `ActorBillboard.tsx`)
- Design canvas `700 × 1100`, soles at `y = 1040`, supersample `2x` (`1400 × 2200`) + half-res `350 × 550` `uReliefMap` (persistent canvas/texture allocated once, updated on `poseKey` change).
- **13 Official Indonesian Cast (`CAST_PRESETS`) — Full v4.0 Polish**:
  - Lead #1: `bangUtoh` (**Bolohoutoh / Bang Utoh**), plus **`ebot`** (pemuda kasual lokal ber-outer rajut earth-tone, fade crop).
  - Supporting & Warga Kampung Rawa Sari RT 04: `arya`, `rara`, `dimas`, `saka`, `pakBudi`, `buSiti`, `raka`, `bangUdin`, `pakUjang`, `tio`, `mbakYuni`. All 13 carry `skinHighlight`, `hairHighlight`, `eyeShine`, `earDetail`, clothing folds, and 360° headgear/hair/backpack sorting.
- **13 Expressions** (`neutral`, `happy`, `laugh`, `shock`, `sad`, `angry`, `smug`, `skeptical`, `nervous`, `tired`, `idea`, `focus`, **`strain`** `> <`) + Comic FX.
- **6 Stances (`ActorStance`)**: `stand`, `walk`, `sit`, `sitCross`, `squat`, `jump`.
- **8-Direction + Continuous 360° (`resolve25DView` & `rig360.ts`)**: `front`, `threeQuarter`, `side`, `backThreeQuarter`, `back` PLUS continuous `yawDeg ∈ [-180, 180]` (`headYawDeg`, `pitchDeg`). Standard dialogue shots honor the 180° camera rule; `orbitTo`/`orbitArc` and full turnarounds pass `yawDeg: v25.yawDeg` (`computeWalkState` also emits `yawDeg` & `yawRad`) for 100% seamless 360° turns!

## Atelier v4.0 2.5D Volumetric 360° & 2D-Grade Walk Standards
1. **Volumetric 360° Projection & `uReliefMap` Shading (`rig360.ts` & `shade.ts` v4.0)**:
   - When `pose.yawDeg !== undefined`, `drawActor` / `drawCat` rotate anchors smoothly with `rotateYaw3D` / `surfacePoint3D`, wrap chest/batik/sarung/daster textures around the cylindrical torso (without double-shrinking aprons!), render **Atelier v5.0 2-Zone Classic `HEAD` 360° Hair** (`Zone A` back/side skull crescent 100% clipped inside `headPath360` with zero overhang shelf or cheek cut + `Zone B` classic `HEAD` crown/bangs cap locked flush to `±0.495 W360` temples for zero far-temple skin gap/double-outline, symmetric left/right profile bangs, bilateral `pakBudi` gray temples, and `'bald'` strictly for `pakUjang`), keep full-width profile C-contour ears (`rx ≈ 17.5 px` at the jaw-nape boundary, behind jaw for `|yaw| <= 58°`), bias backpacks (`z - 14`) & `buSiti` bun (`z < 18`) cleanly behind torso/head at `±90°`, render 3D-ribbon `drawHeadphoneBand360` (`dz = ±10.5`), dynamic-colored `hijab` folds + upper-forehead `ciput`, anti-symmetric `peci`/`cap`, jaw-hugging `helmet` chinstrap + clipped visor, and export `ReliefPrimitive[]` (`sphere` / `capsule`) for `cardShade`.
   - Legacy calls (`pose.yawDeg === undefined`) remain 100% backward compatible (with verbatim `HEAD` `drawFrontHairStyle` front curves) while fixing `side`/`backThreeQuarter`/`bun`/`cap`/`satpamCap`/`helmet` profiles.
2. **3D Sagittal 2-Bone Analytic Leg IK & 4-Pose Foot Roll**:
   - Walking uses **`solveLegIK`**, solved in sagittal `(stepAlong, y)` 3D space in `renderLeg360` and projected via `rotateYaw3D` so knees bend forward `+Z` naturally (crisp `60–70°` Passing knee bend in profile, straight natural foreshortening at `0°/180°` with zero bow-leg or X-crossing!), far-leg `16%` darkening (`darkenHex` / `depthDarkenFactor`), 4-pose `footRollPitchRad` (`+18°` / `0°` / `-24°` / `-12°→+14°`), and `Math.cos(ph)` arm-leg counter-swing.
3. **ZERO Ice-Skating Rule (`computeWalkState` + Default `gait: 'planted'`)**:
   - **`gait` defaults to `'planted'`** on both humans and cats (`ActorBillboard`, `CatBillboard`). Whenever XZ position moves (`|ΔXZ| > 0.002 m/frame`), drive pose via **`computeWalkState(posFn, frame, actorHeight, camPos, opts)`**. **FORBIDDEN: sliding XZ in `stance: 'stand'`!**
4. **Pure 3D Hand Props (`rawZ`), Seating, Counter Rules, & `tiltComp`**:
   - Attach pure 3D props from the **16 props in `engine/props/`** (`BakmieBowl3D`, `DrinkCup3D`, `DiegeticNote3D`, `BoxSign3D`, `Phone3D`, `Laptop3D`, `Kentongan3D`, `SandalJepit3D`, `ToplesKerupuk3D`, `GorenganPlate3D`, `TabungGas3kg3D`, `Galon3D`, `SapuLidi3D`, `PapanCatur3D`, `KardusMie3D`, `MegaphoneToa3D`) via **`actorHandWorldPos(...)`** (now 3D depth-aware via `rawZ`; keep `leftProp`/`rightProp: 'none'` when holding a 3D mesh).
   - Seat characters on **single stools/chairs** with `seatRadius` + `sitHeight` (`SpotMeta.seatY`). **FORBIDDEN: `armPose: 'rest'` behind any counter/cart!** Keep every hand `>= counterTopY + 0.08 m`. Keep `tiltComp` enabled on high-angle `|pitch| > 12°`.
5. **Motion Grammar & Timing**: `strikeEnvelope` (4f→6f→1f→8f), `springPop` on `hatPop`, 4-frame `blinkLidAt`, 2f reaction lead, RMS-gated `talkGated`, zero 1f flicker (`>= 3f` holds), `BREATH_PERIOD = 90`.

## 2D Animated Cat Rig 360° (`engine/cast/cat.ts` + `CatBillboard.tsx`)
- **Rule**: Cats are **ALWAYS `<CatBillboard />`**, never 3D Blender meshes!
- **3 Presets (`CAT_PRESETS`)**: `oyen`, `abu`, `belang`. Supports continuous `yawDeg`/`headYawDeg`/`pitchDeg` 360° body, 4 Z-sorted legs, 3D Bezier tail, ears, muzzle, & `uReliefMap` across all 5 stances (`sit`, `stand`, `walk`, `sleep`, `jump`), fixed `backThreeQuarter` body span, default `gait: 'planted'`, `catWalkCycleMeters`, `seatRadius`, `groundY`, `tiltComp`.

## Mandatory Spatial Sweep Audit (`checkBillboardSweep`)
Before G2, run **`checkBillboardSweep(actorPos, width, height, camPos, obstacles, 0.04, { build, leftArm, rightArm, tiltX })`** across all key shots & orbit/OTS angles to guarantee **0% clipping**!
