# 06. Look Bible "Atelier" (v4.0 — 2.5D Volumetric 360° + Soft-Lit 3D Polish)

Standar visual, putaran tubuh 360°, berjalan kaki 2D-grade, akting 2,5D, cahaya matte lembut, dan kamera MotionForge Atelier v4.0 — diselaraskan dengan kedua video referensi utama di disk:
1. **`contohvideo/download.mp4`** (dunia 3D *soft-lit atmospheric matte* bebas kilap plastik, integrasi cahaya/bayangan 2D-in-3D lembut, outline 3D tipis, & *frame-within-a-frame*).
2. **`contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`** (karakter 2,5D bervolume utuh, artikulasi berjalan kaki 2D jelas, *motion grammar*, prop 3D di tangan, *shadow-on-wall*, & kamera sinematik).
3. Laporan terukur di `references/reports/*.md`.

## Definisi Resmi Karakter 2,5D Volumetrik 360° (1 Siluet Utuh Bervolume)
- **BUKAN** memecah karakter menjadi beberapa papan kertas yang melayang terpisah di sumbu Z.
- **MELAINKAN** 1 siluet vektor utuh (`<ActorBillboard />` / `<CatBillboard />`, buffer canvas + `uReliefMap` persisten) dengan 6 mekanisme:
  1. **Volumetric 360° Projection & `uReliefMap` (`rig360.ts` & `shade.ts`)**: `yawDeg ∈ [-180°, 180°]` menggerakkan proyeksi bahu, pola kain silinder, rambut/konde/hijab, headgear/ransel Z-sorted, dan spherical eyes, ditambah `uReliefMap` per-piksel normal + contact AO + Fresnel rim.
  2. **Spherical Face & Feature Parallax** (*cosine foreshortening* mata/alis/kacamata + 8-arah & sudut kontinu via `resolve25DView`).
  3. **Weighted Asymmetric 2.5D Ink Outline & Full Cast Polish** (tipis di sisi terang, 2–3× lebih tegas di sisi bayangan `#1f192d`, seragam untuk semua 13 manusia & 3 kucing).
  4. **True 3D Light & Shadow Integration** (`receiveShadow` nyata ke wajah/badan, `uLocalLight` dengan *Reinhard soft-clamp* anti-overbloom, serta `castShadow` siluet penuh ke lantai & dinding belakang termasuk `LIGHTS.noon.card.castShadow = true`).
  5. **Hybrid 2D-Hand → 3D-Prop Interaction** (tangan 2D memegang prop **3D murni** matte dari **16 prop `engine/props/`** via `actorHandWorldPos` dengan kedalaman `rawZ` 3D, duduk anti-tembus via `seatRadius`, pijakan konter berbilah kayu via `PALLET_TOP_Y` / `ergonomicBaseY`).
  6. **High-Angle X-Tilt Compensation** (`tiltComp`: kemiringan halus `tiltX` berporos telapak `y = 0` saat pitch kamera `> 12°`).

## Warna, Material Matte, dan Cahaya (`download.mp4` Standard)
- **Anti-Plastic Matte 3D**: `classifyGlbSurface()` di `GlbSet.tsx` mematikan kilap plastik (`shininess: 0, specular: 0, normalScale: 0.35`) pada permukaan matte (`Roughness >= 0,82` di Blender, `Normal Strength <= 0,45`, normal map 512px, **`kampung.glb <= 24 MB` target / `<= 28 MB` cap**), diperkuat penekanan specular & *hemisphere sky-ground wrap* di `twoTone()` (`shade.ts`).
- **Bayangan Lembut**: `Stage.tsx` mengaktifkan `shadow-radius` (`3.0` di `noon`/`amber`/`dusk`), `LIGHTS.noon` memakai terminator lebar `term: 0.30` / `lambert: 0.46` dan `card.castShadow = true`.
- Siang (`noon`), Golden (`amber`/`sore`), Senja (`dusk`), Malam (`night`), & `neon`: setiap lampu punya sumber nyata (`indoorLight` untuk interior).
- **`uLocalLight` + Reinhard Soft-Clamp (`shade.ts`)**: lampu bohlam warkop/gerobak, layar laptop, dan lampu jalan malam menyinari dunia 3D dan wajah karakter secara hangat tanpa pernah *washout* putih atau over-bloom (`< 1.0`).
- Bayangan tidak pernah cokelat kusam (cenderung violet/biru), hitam tidak hancur, wajah tetap terbaca tajam. Preset cahaya, DOF, dan fokus hanya berubah pada **hard cut**.

## Ink & Post-Processing (`NOINK` aktif)
- Urutan wajib: `InkPass` (`NOINK` aktif untuk karakter 2D & papan nama 3D) → `LensPass` → `UnrealBloomPass` → tone map netral → color grade → transisi editorial.
- **`POST_HYBRID_25D` (Rekomendasi Default v4.0 untuk episode baru)**: outline dunia 3D tipis (`strength: 0.42`, `thickness: 1.6`) + *atmospheric depth* + shallow DOF foreground/background agar karakter 2.5D ber-ink *pop* maksimal seperti `download.mp4`. `DEFAULT_POST` tetap dipertahankan 100% untuk EP01–EP04.

## Tokoh & Berjalan Kaki 2D-Grade (`rig360.ts`, `nusantara.ts`, `cat.ts` v4.0)
- **Cast Resmi**: **13 Indonesian Cast (`CAST_PRESETS`, termasuk `ebot`)** + **3 Kucing 2D (`CAT_PRESETS`: `oyen`, `abu`, `belang` — selalu 2D, never 3D!)**.
- **Walk Cycle 2D-Grade (ZERO Ice-Skating)**: 2-Bone Analytic Leg IK (`solveLegIK`, tekukan lutut `60–70°` saat Passing), far-leg digelapkan `16%`, 4-pose foot roll (`+18°` heel-strike, `0°` flat, `-24°` toe-off), counter-swing lengan `Math.cos(ph)` pada `side`/`threeQuarter`/`front`/`back`, default `gait: 'planted'` (manusia & kucing), contact shadow dinamis (`blobY = 0,005`), serta wajib **`computeWalkState()`** (`strideBlend` ease-out) untuk semua perpindahan XZ.
- **Artikulasi & Ergonomi**: `headTilt` independen, auto-inject `actorHeight` pada `sitHeight`, kursi tunggal + `seatRadius`, **larangan `armPose: 'rest'` di balik konter (`handY >= counterTopY + 0,08 m`)**, `strikeEnvelope` (4-6-1-8), `springPop`, kedip 4-frame (`blinkLidAt`), reaksi 2f lebih awal, dan *RMS-gated lip-sync* (`talkGated`).

## Kamera — Cinema Camera v4.5 (Selaras `contohvideo/(1).mp4`)
- **`<CameraRig />` kanonik (`dfov` suportif) & `viewAxisFocus`** dari `engine` (tanpa duplikasi di tiap produksi).
- **Paradigma Utama**: *Purposeful 3D Move → Confident Settle* (`DEFAULT_CREEP = 0`, atau `REF_PUSH_CREEP = 0.0014` untuk beat tensi `0.14%/f` sesuai `motion.md`), plus garis sumbu 180° dialog vs `yawDeg` 360° pada `orbitTo`/`orbitArc`.
- **Helper Resmi (`engine/core/camera.ts`)**: `punchIn` (`path: 'punch'`), `craneDive` (`path: 'dive'`), `portalPush`, `steppedEscalate`, `swipeTrack`, `moveSettle`, `pullOutReveal`, `whipPan` (`path: 'whip'`), analitis `orbit` (`orbitTo` / `orbitArc`, C²-smooth 2 keyframe), `storyDolly`, `topDownInsert` (**khusus prop 3D murni**, bukan karakter 2D!), `craneTransition`, `handheld` loop-safe, `kickOffset` (`harmonic`, `snap15hz` 15 Hz, `trauma` + `fovPunch`), *frame-within-a-frame*, dan transisi (`cut`/`dissolve`/`wipe`/`flash`).
- **Pure Cinema, Subtitle, Loop & Thumbnail**: ZERO 2D HUD boxes; subtitle `SUB_STACK = 'label-above'` (`1485–1690 px`) bebas mulut; loop `TOTAL_FRAMES % 90 === 0`; thumbnail 4-platform safe-zone (`y = 295..1630 px`, `x < 920 px`).
