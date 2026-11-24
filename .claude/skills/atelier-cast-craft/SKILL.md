---
name: atelier-cast-craft
description: Create and animate original 2D characters and 2D cats as lit billboards in a 3D scene (`ActorBillboard`, `CatBillboard`, `CharCard`) following studio reference animation standards (`contohvideo/` & `references/reports/motion.md`) with zero-clipping `checkBillboardSweep`. Use for character design, expressions, poses, stances, blink timing, lip-sync, walk cycles, impact grammar, and branding art.
---

# Cast Craft (Atelier v2.0)

Characters and animals are **2D Canvas2D vector drawings** placed on camera-facing billboards (`NOINK` layer) inside the 3D world. They integrate into 3D lighting via `cardShade`, `alphaToCoverage`, `customDepthMaterial`, and a multiply floor contact shadow. Primary motion & acting references: `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`, `references/reports/characters.md`, and `references/reports/motion.md`.

## Human Modular Rig (`engine/cast/nusantara.ts` + `ActorBillboard.tsx`)
- Design canvas `700 × 1100`, soles at `y = 1040`, supersample `2x` (`1400 × 2200`).
- **12 Official Indonesian Cast (`CAST_PRESETS`)**:
  - Lead #1: `bangUtoh` (**Bolohoutoh / Bang Utoh** — Mahasiswa S1 Teknik Informatika: navy HMTI hoodie, lanyard KTM, `</>` badge, cyan LED headphones, tech glasses, messy ahoge hair).
  - Supporting & Warga Kampung Rawa Sari RT 04: `arya` (Mas Arya), `rara` (Mbak Rara), `dimas` (Bang Dimas), `saka` (Saka Nusantara), `pakBudi` (Pak Budi / Pak RT), `buSiti` (Bu Siti / Warkop), `raka` (Raka SMA), `bangUdin` (Bang Udin Ojol), `pakUjang` (Pak Ujang, satpam kampung / Pos Ronda), `tio` (Tio, pedagang Bakmie Ayam: no hat, thick dark glasses, dark brown skin, `build: 'big'`), `mbakYuni` (Mbak Yuni, pedagang Es Buah).
- **Optional `CharacterSpec` fields** (all default off, preserving backward compatibility):
  - `build: 'slim' | 'regular' | 'big'` scales torso, belly, limbs, hands, and apron while keeping `ACTOR_SOLE_Y` grounded (`buildFactors(spec)`).
  - `glassesStyle: 'round' | 'tech' | 'thick'`, `hairCombed`, `mouthColor`, `tongueColor`, `lipColor`, `blushColor`, `eyeShine`.
- **13 Expressions** (`neutral`, `happy`, `laugh`, `shock`, `sad`, `angry`, `smug`, `skeptical`, `nervous`, `tired`, `idea`, `focus`, **`strain`**) + automatic/override **Comic FX** (`shock`, `sweat`, `anger`, `sparkle`, `question`). Pair **lidded deadpan** (`neutral`/`tired`) against sharp peaks (`shock`, `angry`, `laugh`, `strain`) for maximum comedic contrast.
- **6 Stances (`ActorStance`)**: `stand`, `walk`, `sit`, `sitCross` (duduk bersila), `squat` (jongkok warkop), `jump`.
- **4 Full Views (`ActorView`)**: `front`, `threeQuarter`, `side`, and complete **`back`** (back hair, hoodie hood, backpack, back outfit) enabling 180° turns facing boards/walls!
- **Acting Preference (Zero Hand Props Default)**: Keep characters tangan kosong (`leftProp: 'none', rightProp: 'none'`) unless the script explicitly requires a prop; never sprint with awkward props in both hands.

## Reference Character Animation Standards (v2.0)
1. **Organic Noodle-Limbs & Walk Rhythm**:
   - Arms and legs articulate via **3-point Bezier curves** (`shoulder → organic elbow → hand`, `hip → organic knee → foot`).
   - Walk cycles maintain **3–6% body height bob** (lowest at foot contact) and **1°–7° torso lean** synced to the step.
   - Always use **planted gait** (`gait: 'planted'`, `walkPhase = distance / actorWalkCycleMeters(...)`) whenever a character translates across ground — **ZERO moonwalk/skating**!
2. **Independent `headTilt` & Authentic `sitHeight`**:
   - Use `headTilt` (degrees, independent of torso `lean`) for questioning, deadpan, disbelief, or sigh beats.
   - Whenever `stance: 'sit'`, pass `sitHeight` from `SpotMeta.seatY` (e.g. `0.475` for `WK_BenchL_Top`) so hips sit cleanly on the bench/chair with natural knee bend.
3. **Action Impact Grammar & Spring Overshoot**:
   - Use **`strikeEnvelope(frame, impactFrame, { windup: 4, hold: 6, follow: 8 })`** for hits, desk slams, stomps, and emphatic gestures (*4f wind-up → 6f tense hold → 1f strike → 8f damped follow-through*).
   - Use **`springPop(frame, triggerFrame, peak)`** for snappy `hatPop`, shock pops, and prop pops.
4. **Blink, Reaction Lead & RMS-Gated Lip-Sync**:
   - **Blink**: `blinkLidAt(frame, seed, fps, swapFrames)` — mandatory **4-frame `0.5 / 1 / 1 / 0.5`** blink on every expression swap, staggered per character.
   - **Reaction Lead**: Land expression/pose swaps **2 frames before the triggering word** via `reactionFrame(words, index, fps, 2)`.
   - **Lip-Sync**: Use `talkAt(WORDS, frame, fps, 1)` or **RMS-gated `talkGated`** for recorded VO so pauses stay closed, breaths open slightly, laughs oscillate, and syllables lead by 1 frame.
   - **Zero 1-Frame Flicker**: Hold every stance/arm state `>= 3` frames and bridge large arm leaps with `HandRig` breakdown (`from`/`t`).
5. **100% Texture Reactivity**: `<ActorBillboard>` and `<CatBillboard>` serialize all pose fields via `actorPoseKey(pose)` / `catPoseKey(pose)` so no pose change can ever stall in `useMemo`.

## 2D Animated Cat Rig (`engine/cast/cat.ts` + `CatBillboard.tsx`)
- **Rule**: Cats are **ALWAYS 2D animated characters (`<CatBillboard />`)**, never 3D Blender meshes!
- Design canvas `720 × 660`, soles at `y = 595`, supersample `2x`. Height `0.56–0.78 m`.
- **3 Presets (`CAT_PRESETS`)**: `oyen`, `abu`, `belang`.
- **5 Cat Stances (`CatStance`)**: `sit`, `stand`, `walk` (planted 4-leg cycle), `sleep` (*loaf* + `Zzz`), `jump`.
- **Expressive Controls**: `pawRaise` + precision targeting via **`pawAngle`** (degrees) and **`pawReach`** (0.5–1.8×) to tap buttons/props; 3-stage wave-propagated **`tailPhase`** (auto-puffs on `shock`/`angry`); `stretch`, `earTwitch`, `breathPhase`, `blink`, and `talk`.

## Mandatory Spatial Safety Check (`checkBillboardSweep`)
Every `<ActorBillboard>` (width ~1.1–1.25 m) and `<CatBillboard>` (width ~0.59 m) rotates `yaw` to face the active camera. **Before G2**, run **`checkBillboardSweep(actorPos, width, height, camPos, obstacles, 0.04)`** from `engine/core/spatial.ts` at every key shot & OTS angle to guarantee **0% billboard clipping** into benches, tables, counters, walls, or poles!

## Originality & Readability
- All characters are original procedural studio creations. Never trace external IP.
- Keep `stickerOutline` available for thumbnails, banners, and profile avatars.
