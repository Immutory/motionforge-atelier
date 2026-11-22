---
name: atelier-cast-craft
description: Create and animate original 2D characters and 2D cats as lit billboards in a 3D scene (`ActorBillboard`, `CatBillboard`, `CharCard`). Use for character design, expressions, poses, stances (stand, walk, sit, sitCross, squat, jump), blink timing, lip-sync, walk cycles, crowds, and YouTube branding art.
---

# Cast Craft

Characters and animals are **2D Canvas2D vector drawings** placed on camera-facing billboards (`NOINK` layer) inside the 3D world. They integrate into 3D lighting via `cardShade`, `alphaToCoverage`, `customDepthMaterial`, and a multiply floor contact shadow.

## Human Modular Rig (`engine/cast/nusantara.ts` + `ActorBillboard.tsx`)
- Design canvas `700 × 1100`, soles at `y = 1040`, supersample `2x` (`1400 × 2200`).
- **9 Official Indonesian Cast (`CAST_PRESETS`)**:
  - Lead #1: `bangUtoh` (**Bolohoutoh / Bang Utoh** — Mahasiswa S1 Teknik Informatika: navy HMTI hoodie, lanyard KTM, `</>` badge, cyan LED headphones, tech glasses, messy ahoge hair).
  - Supporting & Warga Kampung Rawa Sari RT 04: `arya` (Mas Arya), `rara` (Mbak Rara), `dimas` (Bang Dimas), `saka` (Saka Nusantara), `pakBudi` (Pak Budi / Pak RT), `buSiti` (Bu Siti / Warkop), `raka` (Raka SMA), `bangUdin` (Bang Udin Ojol).
- **12 Expressions** (`neutral`, `happy`, `laugh`, `shock`, `sad`, `angry`, `smug`, `skeptical`, `nervous`, `tired`, `idea`, `focus`) + automatic/override **Comic FX** (`shock`, `sweat`, `anger`, `sparkle`, `question`).
- **6 Stances (`ActorStance`)**: `stand`, `walk`, `sit`, `sitCross` (duduk bersila), `squat` (jongkok nongkrong khas warkop), `jump`.
- **4 Views (`ActorView`)**: `front`, `threeQuarter`, `side`, `back`.
- **Charlab Global Prototypes** (`productions/charlab/prototypes.ts` + `CharCard.tsx`): `A` (Atelier Indie), `B` (Squircle Plush), `C` (Ink-Pop Comic) — supports prop-free `'idle'`, `'wave'`, `'shock'`, and `'explain'`.
- **Acting Preference (Zero Hand Props Default)**: Unless a script explicitly calls for holding a specific prop, keep characters **100% tangan kosong (`leftProp: 'none', rightProp: 'none'`)** and express personality through body language (`wave`, `raise`, `hip`, `point`, `cross`, `lean`, `sit`, `sitCross`, `squat`, `jump`).

## 2D Animated Cat Rig (`engine/cast/cat.ts` + `CatBillboard.tsx`)
- **Rule**: Cats are **ALWAYS 2D animated characters (`<CatBillboard />`)**, never 3D Blender meshes!
- Design canvas `720 × 660`, soles at `y = 595`, supersample `2x`. Default 3D height `0.62–0.78 m` (proportional to Bang Utoh `1.92–2.04 m`).
- **3 Presets (`CAT_PRESETS`)**:
  - `oyen` — **Si Oyen (Kucing Warkop)**: ginger-orange tabby with forehead "M" stripes, golden-amber slit-pupil eyes, cream muzzle/chest/paws, cocoa toe-beans, ringed tail.
  - `abu` — **Mpus Abu**: silver-grey mackerel tabby.
  - `belang` — **Si Belang**: Indonesian tri-color calico with red collar & gold bell.
- **5 Cat Stances (`CatStance`)**: `sit`, `stand`, `walk` (4-leg cycle), `sleep` (*loaf* + `Zzz`), `jump`.
- **Expressive Controls**: `pawRaise` (`'none' | 'left' | 'right'`, reveals toe-beans), `tailPhase` (auto-puffs when `shock`/`angry`), `earTwitch`, `blink` (`blinkLidAt`), and `talk` (`talkAt` / `talkWave` meow lip-sync).

## Legacy Simple Rig (`engine/cast/bean.ts`)
- Still available for minimalist sketches (`600 × 1000`, soles at `960`), but new productions default to `ActorBillboard` + `CatBillboard`.

## Animation & Lip-Sync
- **Blink**: `blinkLidAt(frame, seed, fps, swapFrames)` — 4-frame `0.5 / 1 / 1 / 0.5` lid timing, offset per actor.
- **Lip-Sync**: `talkAt(WORDS, frame, fps, 1)` (1-frame mouth lead) or RMS-gated `realTalkAt` for real recorded VO, `talkWave` for quick tests.
- **Walk**: small body bob, slight lean, translate position smoothly with `walkPhase` so feet never slide.

## Originality & Readability
- All characters are original procedural studio creations. Never trace external IP.
- Keep `stickerOutline` available for hero pop in thumbnails, banners, and YouTube profile avatars.
