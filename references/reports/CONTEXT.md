# Look-Match Study Context — MotionForge Atelier v3.0 (2.5D Reference Edition)

## Tujuan
Acuan gaya & teknis terukur untuk seluruh produksi animasi **2,5D-in-3D** di **MotionForge Atelier v3.0** (semesta *Bang Utoh · Kampung Rawa Sari RT 04*). Semua angka di `references/reports/*.md` adalah aturan visual & motion umum — cerita, tokoh (`CAST_PRESETS` 13 karakter + `CAT_PRESETS` 3 kucing), set 3D Blender (`kampung.glb`, `warkop.glb`, `kost.glb`, `kampus.glb`), suara, dan shot 100% orisinal studio.

## Materi Referensi Utama (Studi Privat — Jangan Pernah Dipublikasikan)
1. **`contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`** (65,3 dtk):
   - Acuan utama **Karakter 2,5D Utuh** (1 siluet vektor utuh dengan *spherical face parallax*, *weighted asymmetric 2.5D ink*, bayangan siluet nyata ke lantai & dinding belakang, interaksi tangan 2D → prop 3D murni), **Motion Grammar** (`DEFAULT_CREEP = 0`, `moveSettle`, `strikeEnvelope` 4-6-1-8 + *camera-local harmonic shake*, *high-angle* `tiltX` tanpa gepeng, `topDownInsert` khusus prop 3D), dan *diegetic 3D storytelling*.
2. **`contohvideo/download.mp4`** (99,9 dtk):
   - Acuan utama **Atmosfer Dunia 3D Lembut** (*soft-lit atmospheric 3D world*, integrasi cahaya & bayangan 2D-in-3D nyata dengan `receiveShadow` + `uLocalLight` soft-clamped, *frame-within-a-frame*, dan `POST_HYBRID_25D` outline lingkungan tipis + shallow DOF).
3. **Laporan Terukur (`references/reports/`):**
   - `motion.md`, `characters.md`, `lighting.md`, `depth.md`, `outlines.md`, `grade.md`, `textures.md`.

## Stack Produksi MotionForge Atelier v3.0
- **Render & 3D:** Remotion + Three.js + `@react-three/fiber` + Three.js `EffectComposer` (`engine/post/PostStack.tsx`) (`1080×1920` 9:16 Short & `1920×1080` 16:9 Episode, `30 fps`).
- **Engine (`engine/`):**
  - `engine/core/`: `camera.ts` (`DEFAULT_CREEP = 0`, `moveSettle`, `pullOutReveal`, `whipPan`, analitis `orbit`, `storyDolly`, `topDownInsert`, `craneTransition`, `handheld`, camera-local harmonic `kickOffset`, `viewAxisFocus`), `CameraRig.tsx`, `spatial.ts` (audit spasial 2,5D Fase 3.5).
  - `engine/cast/`: `ActorBillboard.tsx` & `nusantara.ts` (13 karakter `CAST_PRESETS`, *spherical face parallax*, 8-arah termasuk `backThreeQuarter`, `resolve25DView`, `actorHandWorldPos`, `seatRadius`, `tiltX`), `CatBillboard.tsx` & `cat.ts` (3 kucing `CAT_PRESETS`), `expressions.ts` (13 ekspresi + `blinkLidAt`), `lipsync.ts`, `props2d.ts`, `sticker.ts`.
  - `engine/stage/`: `Stage.tsx`, `lights.ts` (`noon`, `amber`, `dusk`, `night`, `neon`), `shade.ts` (`twoTone` + `cardShade` dengan `uLocalLight` Reinhard soft-clamp & `receiveShadow` nyata).
  - `engine/sets/`: `GlbSet.tsx`, `KampungSet.tsx`, `WarkopSet.tsx`, `KostSet.tsx`, `KampusSet.tsx` (`public/sets/*.glb` + `*.boxes.json`).
  - `engine/post/`: `PostStack.tsx` (`DEFAULT_POST` + `POST_HYBRID_25D`), `passes.ts`, `shaders.ts`.
- **Sound & Voice:** `sound/` (`-16,0 LUFS`, `≤ -1,5 dBTP`), `pipeline/voice/` (Chatterbox TTS lokal / VO pengguna + `faster-whisper`).
