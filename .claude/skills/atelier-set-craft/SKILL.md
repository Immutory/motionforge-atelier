---
name: atelier-set-craft
description: Build and integrate Blender 3D sets (`.blend` -> `.glb` via `GlbSet`) and procedural 3D sets with physical grounding, day/golden/night lighting, and sight-line culling. Use for any environment, building upgrade, prop, material, or camera obstruction fix.
---

# Set Craft

MotionForge Atelier uses a **hybrid 3D world pipeline**: hero environments are modeled in **Blender 5.3** (`assets/sets/blend/bang_utoh_sets.blend`) with PBR textures, exported as `.glb` (`public/sets/*.glb`), and loaded in Three.js via `<GlbSet />` with automatic `twoTone()` cel shading, `InkPass` comic outlines, `UnrealBloomPass` HDR glow, and automatic `timeOfDay` (`day` / `golden` / `night`) switching. Procedural Three.js sets remain available for quick studio stages.

## Official 3D World Sets (`engine/sets/`)
1. **`<KampungSet mode="siang" | "sore" | "malam" />`** (`public/sets/kampung.glb`, `160m × 140m`) — **Kampung Rawa Sari RT 04** unified world:
   - **Kos Putra Rawa Sari (2 Lantai)** (`x = -12.2m`): Ground-floor rooms `01` (Bang Utoh) & `02`, terrace, shoe racks, low front fence with wide open gate; Lantai 2 rooms `03–05`, balcony iron railing with colorful hanging towels, 2 outdoor AC units, exterior side staircase, hip terracotta roof + orange *toren air*, signboard **`KOS PUTRA RAWA SARI`** (`TERIMA KOS MAHASISWA · FREE WIFI`).
   - **Warkop 24 Jam** (`x = 0m`): Wooden counter, gorengan glass case, instant noodles, thermos, kerupuk jar, green-cream canopy, neon box **`WARKOP 24 JAM`** (`KOPI · GORENGAN · INDOMIE`), 3 hanging enamel lamps, tables & plastic stools.
   - **Gedung Kampus S1 Teknik Informatika** (`x = +12.6m`), **Masjid Al-Khawarizmi** (`x = -23.0m`), **Gapura Kampung Rawa Sari RT 04** (`x = -17.5m`), **Pos Ronda RT 04**, **Lapangan Basket/Futsal**, **Area Pedagang Kaki Lima**, **Parkir Motor (10 Motor Bebek)**, & city skyline.
   - Pre-calibrated positions live in `KAMPUNG_SPOTS` (`engine/sets/KampungSet.tsx`).
2. **`<WarkopSet />`** (`public/sets/warkop.glb`) — Standalone close-up Warkop interior set.
3. **`<KostSet />`** (`public/sets/kost.glb`) — Standalone Bang Utoh bedroom interior (dual monitors with `errorAlert` red mode, gaming chair, bed, posters, galon, fan).
4. **`<KampusSet />`** (`public/sets/kampus.glb`) — Standalone Lab Komputer S1 TI interior.

## Blender Naming Conventions (Auto-wired in `engine/sets/GlbSet.tsx`)
Follow these exact mesh name substrings when modeling in Blender so Three.js applies shaders automatically:
- **3D Crisp Text (`NOINK`, no shadow casting)**: `SignMain`, `SignSub`, `Title`, `MenuLine`, `PosterCode`, `PosterSub`, `BoardHead`, `CrestTxt`.
- **Flat Luminous Panels (`NOINK`)**: `SignBoxFace`, `WinGlass`, `Scr`.
- **Auto-Glowing Windows (`day` sky-blue -> `golden`/`night` warm room glow)**: `WinBand`, `_Win1_`, `_Win2_`, `ATM_GlassFront`, `Satpam_Win`.
- **Auto-Glowing Lamps (`golden`/`night` HDR bloom)**: `StreetBulb`, `ParkBollard_Glow`, `PosRonda_Lamp`, `WK_LampShade`, `WK_LampBulb`, `Kost_LampBulb`.
- **Export rule**: Export selected collection only (`Export glTF 2.0`, `.glb`, `+Y Up`, Apply Modifiers) and save `bang_utoh_sets.blend`.
- **No 3D Cats**: Never place 3D cat meshes in Blender sets — always place 2D `<CatBillboard />` in Remotion!

## Principles & Sight-Line Culling
1. **Grounded**: Every object rests solidly on its floor/roof/counter (`z`-fighting free, glass panes proud of frames).
2. **Human scale**: Doors ~2.1 m, tables ~0.75 m, adults ~1.88–2.04 m, cats ~0.62–0.80 m.
3. **Sight-line culling via `hideNames`**: When a street pole, traffic light, or umbul-umbul sits between a wide camera and the focal set (e.g. `KG_StreetPole_05` at `x=0, z=4.4` in front of Warkop 24 Jam), pass `hideNames={[...]}` to `<KampungSet />` / `<GlbSet />` instead of deleting it from the master `.blend`.
4. **Verify**: Always inspect with Blender `look` (front + three_quarter) AND Remotion `npm run still` after re-exporting `.glb`.
