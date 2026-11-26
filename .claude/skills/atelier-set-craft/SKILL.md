---
name: atelier-set-craft
description: Build and integrate soft-lit matte Blender 5.3 3D sets (`.blend` -> `.glb` + `*.boxes.json` manifests via anti-plastic `GlbSet`), reusable matte 3D props (`engine/props/`), physical grounding, Pre-Blocking Spatial Audit 2.5D (`engine/core/spatial.ts`), day/golden/night lighting, and sight-line culling. Use for any environment, building upgrade, 3D prop, material, or camera obstruction fix.
---

# Set Craft (Atelier v3.5 — Soft-Lit Matte 3D Polish)

MotionForge Atelier uses a **soft-lit matte 2.5D-in-3D world pipeline** aligned with `contohvideo/download.mp4`, `contohvideo/(1).mp4`, and `engine/core/spatial.ts`: hero environments are modeled in **Blender 5.3** (`assets/sets/blend/bang_utoh_sets.blend`), exported to `public/sets/*.glb` + sidecar AABB manifests `public/sets/*.boxes.json` (`node pipeline/export-boxes.mjs`), and loaded via anti-plastic `<GlbSet />` (`classifyGlbSurface`: matte `shininess: 0, specular: 0, normalScale: 0.35`, preserved `aoMap`, `twoTone()` + soft-clamped `uLocalLight`, `DoubleSide` showcase glass `renderOrder: 2`, `NOINK` signage, and `day`/`golden`/`night` switching).

## Anti-Plastic Matte Material Rules (`download.mp4` Standard)
- **Zero Plastic Sheen**: Every non-metal, non-glass, non-water architectural/organic surface (asphalt, plaster, brick, wood, paving, concrete, curbs, grass, foliage, fabric, roof, pallets) MUST have Blender **`Roughness >= 0.82`** (`>= 0.88` on asphalt/concrete/wood/plaster), **`Normal Map Strength <= 0.45`**, and soft PBR normal strength `1.2–2.0` in `generate_pbr_textures.py` (`512px` normal maps & background diffuse maps so **`kampung.glb <= 29 MB`** while foreground hero albedos stay crisp `1024px`).
- **Slatted Beveled Wooden Pallets**: Vendor/cashier pallets (`KG_Grb_BakmieTio_VendorPallet`, `KG_Grb_EsBuahYuni_VendorPallet`, `KG_WK_CounterPallet`, `WK_CounterPallet`) use textured teak wood slats with beveled edges while preserving exact `maxY` (`0.30 m` / `0.44 m`).

## Official Calibrated 3D World Sets (`engine/sets/`) & Reusable Prop Library (`engine/props/`)
1. **`<KampungSet mode="siang" | "sore" | "malam" />`** (`public/sets/kampung.glb` ≤ 29 MB + `kampung.boxes.json`, `264m × 220m`):
   - Bakmie Tio cart with calibrated short-wide dandang (`bibir y = 1.205 m`, `x = -12.91, z = 17.62`) + slatted textured wooden pallets (`0.30 m`, `0.30 m`, `0.44 m`).
   - `KAMPUNG_SPOT_META` calibrated to exact GLB AABBs (`bakmieTioVendor`, `esBuahYuniVendor`, `warkopCounter`).
2. **`<WarkopSet />`** (`warkop.glb` + `warkop.boxes.json`): `WK_CounterTop = 0.97 m`, slatted `WK_CounterPallet = 0.44 m`, `WK_BenchL_Top = 0.475 m`, `WK_StoolRed2_Seat = 0.483 m`, `WK_TableL/R_Top = 0.77 m`.
3. **`<KostSet />`** (`kost.glb` + `kost.boxes.json`): `KS_DeskTop = 0.79 m`, `KS_ChairSeat = 0.49 m`, `KS_BedFrame = 0.32 m`.
4. **`<KampusSet />`** (`kampus.glb` + `kampus.boxes.json`): `KP2_Whiteboard` (`z = -3.7`) separated from `KP2_ProjectorMount` (`z = +0.2`), `KP2_LectDesk = 0.76 m`.
5. **Reusable Matte 3D Props (`engine/props/`)**: Always reuse calibrated components from `engine` (`BakmieBowl3D`, `DrinkCup3D`, `DiegeticNote3D`, `BoxSign3D`, `Phone3D`, `Laptop3D` — zero plastic shine, auto `.dispose()`, `NOINK` text) instead of copy-pasting primitive cylinders/boxes per production!

## Spatial Audit 2.5D & Blender Rules (WAJIB Pra-G2!)
1. Always run `node pipeline/export-boxes.mjs` after Blender exports and import **`loadSetBoxes(setId)`** (`engine/sets/boxesNode.ts`) in spatial tests.
2. Seat characters on **individual stools/chairs** paired with `seatRadius` — 0% chair clipping.
3. Automated checks (`engine/core/spatial.ts`): `checkPropOverlap(props, 0.03)`, perspective `checkCounterVisibility`, and 5-ray `checkSightline` (transparent glass auto-ignored; add solid blockers to `hideNames`).
4. Edit `generate_pbr_textures.py` / `build_kampung_v2.py` / `upgrade_sets_v3.py`, re-export all 4 `.glb` files (`kampung.glb <= 29 MB`), run `export-boxes.mjs`, leave **0 `.blend1` files**, and **never place 3D cat meshes**.
