---
name: atelier-quality-gate
description: Verify stills, previews, thumbnails, and final video against automated 2.5D spatial/QA checks and visual pixel inspection, enforcing zero ice-skating, 2-bone IK + foot roll, soft-lit anti-plastic 3D materials, and zero clipping (Atelier v3.5).
---

# Quality Gate (Atelier v3.5 — 2D-Grade Walk + Soft-Lit 3D Polish)

Every review uses **two layers**: (1) automated 2.5D spatial/code/QA validation (`engine/core/spatial.ts`, `npm run check`, `npm run qa`), and (2) direct pixel-by-pixel visual inspection against `contohvideo/download.mp4` & `(1).mp4`.

## The Four Gates
- **G1 Script:** facts sourced (when factual), Short `58–75 s` (up to `90 s` for natural user VO, multiple of `90f` for seamless loop), 4-platform thumbnail plan (`y = 295..1630 px`, `x < 920 px`), user approved.
- **G2 Stills (after Step 3.5 Spatial Audit 2.5D):** hero stills + walk 4-pose check pass **100% spatial zero-clipping** + visual review (0% clipping, 0% plastic sheen, 0% over-bloom, clean 2.5D shadow grounding).
- **G3 Motion:** per-beat previews approved for 2D-grade articulated walk (zero ice-skating, bent IK knees, 4-pose foot roll, `Math.cos(ph)` counter-swing), Cinema Camera v3.0, 2.5D acting, lip-sync, and loop continuity.
- **G4 Master:** final mp4 passes `npm run qa`, 4-platform thumbnail exported, workspace junk cleaned, and user approved.

## Mandatory 5-Pillar Checklist (Every Shot at G2 & G3)
1. **Zero-Clipping & Spatial Audit 2.5D (Auto-Reject Gate G2 on ANY failure!):**
   - `checkPropOverlap` (vs `loadSetBoxes` sidecar manifests), tiered + 3D tilted `checkBillboardSweep`, perspective `checkCounterVisibility` (**ZERO `armPose: 'rest'` behind counters**, `handY >= counterTopY + 0.08 m`), `checkSafeFraming` (`actorFramingSubjects`), `checkScreenOcclusion`, and 5-ray `checkSightline` (dandang/uap/poles clear, glass auto-ignored).
   - Seated characters MUST use single stools/chairs + `seatRadius` (0% chair clipping).
2. **2D-Grade Walk & 2.5D Reference Motion (`(1).mp4`, `download.mp4`, `motion.md` — Auto-Reject on ANY walk flaw!):**
   - **ZERO Ice-Skating / Sliding**: Any character moving in XZ MUST use `computeWalkState()` + `gait: 'planted'` (default). **REJECT any XZ translation in `stance: 'stand'`!**
   - **Articulated 2-Bone Leg IK + Foot Roll**: Verify clear knee bend (`60–70°` Passing), far-leg `16%` depth darkening, 4-pose heel-toe roll (`+18° / 0° / -24°`), `Math.cos(ph)` arm-leg counter-swing, dynamic contact shadow (`blobY = 0.005`), and smooth `strideBlend` ease-out stop.
   - 1 whole 2.5D silhouette (`resolve25DView` 8-dir, spherical parallax, weighted ink, `actorHandWorldPos` for pure 3D hand props from `engine/props/`, `tiltComp` on high-angle `|pitch| > 12°`), `strikeEnvelope` (4-6-1-8), `springPop`, 4f `blinkLidAt`, 2f reaction lead, RMS `talkGated`, zero 1f flicker.
3. **Cinema Camera v3.0 (`(1).mp4` & `download.mp4`):**
   - **REJECT monotonous slow zoom-in!** Require `<CameraRig />`, `DEFAULT_CREEP = 0`, camera-local harmonic `kickOffset`, `moveSettle`, `pullOutReveal`, `whipPan`, analytical `orbit`, `storyDolly`, `topDownInsert` (**3D props only, never overhead on 2D billboards!**), loop-safe `handheld`, and *frame-within-a-frame*.
4. **Soft-Lit Matte 3D World, Shadow & Look Bible (`download.mp4` Standard):**
   - **REJECT plastic specular sheen** on asphalt, walls, wood, grass, curbs, or pallets (`classifyGlbSurface` matte `shininess: 0`, Blender `Roughness >= 0.82`, `Normal Strength <= 0.45`, `kampung.glb <= 29 MB`).
   - Verify soft PCF shadows (`shadow.radius = 3.0`), `LIGHTS.noon.card.castShadow = true`, `uLocalLight` Reinhard soft-clamp (**0% over-bloom / white washout**), real `receiveShadow` & floor/wall `castShadow`, and `POST_HYBRID_25D` or `DEFAULT_POST` parity.
5. **Pure Cinema, Loop & 4-Platform Safe Zone:**
   - ZERO 2D HUD boxes; `SUB_STACK = 'label-above'` (`1485–1690 px`) clear of mouths & off during loop tail; `TOTAL_FRAMES % 90 === 0` + audio `"loop"`; 4-platform thumbnail safe-zone (`y = 295..1630 px`, `x < 920 px`).

## Automated Checks & Fail-Fast Rule
- `npm run check`: 100% TS + Python tests must pass (`pycache=0`, `blend1=0`).
- `npm run qa -- out/<slug>/<slug>_final.mp4`: `black_frames: 0`, `freeze_spans: 0`, master target `-16.0 LUFS / TP ≤ -1.5 dBTP` (QA band `-17..-13 LUFS / TP ≤ -1.0 dBTP`). Valid settled camera holds with live acting are expected; fix true freezes with micro-life, never camera creep.
- **Every visual score `< 5` MUST be fixed before the gate can pass; `> 2` scores `< 5` = stop & return to owner phase.**
