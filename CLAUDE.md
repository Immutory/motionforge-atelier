# MotionForge Atelier (v4.0 — 2.5D Volumetric 360° + Soft-Lit 3D Polish)

Studio produksi untuk video animasi **2,5D-in-3D**: 1 siluet vektor karakter utuh bervolume 2,5D **bisa berputar penuh 360° (`rig360.ts` + `uReliefMap` per-piksel normal/AO/Fresnel)** dengan **artikulasi jalan 2D-grade (2-Bone IK + 4-pose foot roll + zero ice-skating)** di dalam dunia 3D Blender **soft-lit matte bebas kilap plastik**. Format utama Short 9:16 (`1080×1920`, `30 fps`, **`58–75 detik`**, fleksibel hingga **`90 detik`** khusus VO asli pengguna, kelipatan **`90 frame`** untuk loop sempurna); juga episode YouTube 16:9 (`1920×1080`) dan branding kanal.
Stack: Remotion, Three.js (`react-three-fiber`), Blender 5.3 untuk set (`.blend` → `public/sets/*.glb` + `*.boxes.json`), dan Python (`node pipeline/py.mjs` `-B`) untuk audio & QA.

**Acuan gaya utama studio (`contohvideo/`, `references/reports/`, `.agents/youtube-skills/`):**
1. **`contohvideo/download.mp4`** (99,9 dtk — dunia 3D *soft-lit atmospheric matte* bebas kilap plastik, integrasi cahaya/bayangan 2D-in-3D lembut, outline 3D tipis, & *frame-within-a-frame*).
2. **`contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4`** (65,3 dtk — 1 siluet karakter 2,5D utuh bervolume, artikulasi jalan & akting 2D jelas, interaksi tangan 2D → prop 3D murni, *shadow-on-wall*, & kamera sinematik).
3. Laporan terukur `references/reports/{motion,characters,lighting,depth,outlines,grade,textures}.md`, plus modul packaging & growth kanal `.claude/youtube/voice.md` & `.agents/youtube-skills/yt-*`.

## Definisi Resmi Karakter 2,5D Volumetrik 360° & Walk 2D-Grade (WAJIB Dipatuhi Semua Agent)
**BUKAN** memecah karakter menjadi papan berlapis di sumbu Z, melainkan **1 siluet vektor utuh bervolume 2,5D** (persisten Canvas2D di layer `NOINK`) dengan 7 mekanisme terintegrasi:
1. **Volumetric 360° Turnaround & `uReliefMap` Shading (`rig360.ts`, `nusantara.ts`, `cat.ts`, `shade.ts` v4.0)**: `yawDeg ∈ [-180°, 180°]` (manusia + 3 kucing) memproyeksikan bahu, lipatan torso silinder, pola kain, topi/headphone/konde/ransel Z-sorted, & fitur wajah sferis secara kontinu + `uReliefMap` (per-pixel normal, contact AO, Fresnel rim). Dialog standar tetap menghormati garis sumbu **180°**; shot orbit/turnaround mengaktifkan `yawDeg: v25.yawDeg` (**0% pop**). Mode legacy (`yawDeg === undefined`) tetap 100% kompatibel.
2. **2-Bone Analytic Leg IK & 4-Pose Foot Roll (`nusantara.ts`)**: `solveLegIK()` menjaga panjang paha/betis konstan dengan tekukan lutut tajam alami (`60–70°` saat Passing), far-leg digelapkan `16%`, foot roll 4-pose (`+18°` heel-strike, `0°` flat, `-24°` toe-off), counter-swing lengan `Math.cos(ph)`, dan default `gait: 'planted'` (manusia & kucing). **WAJIB pakai `computeWalkState()`** untuk semua perpindahan XZ (**dilarang keras geser XZ dalam `stance: 'stand'`** — 0% *ice-skating*!).
3. **Spherical Face & Feature Parallax** (*cosine foreshortening* wajah/mata/kacamata + 8-arah mulus termasuk `backThreeQuarter` & sudut kontinu `yawDeg` via `resolve25DView`).
4. **Weighted Asymmetric 2.5D Ink Outline & Full Cast Polish** (13 manusia `CAST_PRESETS` + 3 kucing `CAT_PRESETS` lengkap dengan *skin/hair highlight*, kilau mata, anatomi telinga, & lipatan kain halus).
5. **True 3D Light & Shadow Integration** (`receiveShadow` nyata, `uReliefMap` per-pixel normal/AO/Fresnel, `uLocalLight` *Reinhard soft-clamp* anti-overbloom, `LIGHTS.noon.card.castShadow = true` dengan `shadow.radius = 3.0`, serta contact shadow dinamis `blobY = 0,005`).
6. **Hybrid 2D-Hand → 3D-Prop Interaction** (tangan 2D memegang prop **3D murni** matte dari **16 prop di `engine/props/`** via `actorHandWorldPos` dengan kedalaman `rawZ` 3D, duduk anti-tembus via `seatRadius`, dan pijakan kayu berbilah via `PALLET_TOP_Y` / `ergonomicBaseY`).
7. **High-Angle X-Tilt Compensation** (`tiltX` halus berporos telapak kaki `y = 0` saat pitch kamera `> 12°`).

## Cara kerja dengan Claude Code
1. Jalankan showrunner sebagai sesi utama: `claude --agent showrunner`. Hanya dia yang memanggil agent lain lewat tool `Agent`.
2. Satu file punya satu pemilik. Lihat `docs/04-file-ownership.md`. Jangan edit file milik agent lain.
3. Wajib jalankan **Fase 3.5 — Spatial & Collision Audit** (`engine/core/spatial.ts`) sebelum Gate G2, bebas duplikat (`CameraRig`, `viewAxisFocus`, `seatCardPos`, `viewFor`) dan bebas kebocoran `CanvasTexture`.
4. Berhenti di setiap gate (**G1 naskah**, **G2 stills**, **G3 motion**, **G4 master**) dan tunggu persetujuan eksplisit pengguna.
5. Cerita, tokoh, dan suara selalu orisinal. Referensi hanya untuk belajar gaya, gerak, dan bahasa kamera.

## Perintah penting
- `npm run doctor`                          cek lingkungan (Node, FFmpeg, ffprobe, Python, numpy, scipy, Pillow)
- `npm run forge:new -- <slug> "Judul"`     buat produksi baru dari `_starter` v4.0
- `npm run studio`                          preview interaktif
- `npm run still | preview | render | mux | sound | qa`   lihat skill `atelier-render-ship`
- `node pipeline/export-boxes.mjs`          regenerasi sidecar `public/sets/*.boxes.json` usai ekspor Blender
- `npm run check`                           typecheck + seluruh tes spasial/engine/rig360/walk/matte/Python (wajib hijau 100%)

## Lima Pilar Studio v4.0 (berlaku untuk setiap shot)
1. **Zero-Clipping & Spatial Safety 2,5D (`engine/core/spatial.ts`)**: `checkPropOverlap`, `checkBillboardSweep` (profil bertingkat + 3D tilted quad), `checkCounterVisibility` (termasuk proyeksi perspektif kamera rendah; nol `armPose: 'rest'` di balik konter, `handY >= counterTopY + 0.08 m`), `checkSafeFraming` (`actorFramingSubjects`), `checkScreenOcclusion`, dan `checkSightline` (*5-ray face cone* bebas dandang/uap, filter kaca otomatis).
2. **2,5D Volumetric 360° & Walk 2D-Grade (`(1).mp4`, `download.mp4`, `motion.md`)**: **13 Indonesian Cast (`CAST_PRESETS`, termasuk `ebot`)** + **3 Kucing 2D (`CAT_PRESETS`)**, proyeksi 360° kontinu (`rig360.ts` + `yawDeg`), `uReliefMap`, 2-Bone Leg IK + far-leg shading + 4-pose foot roll + `Math.cos(ph)` counter-swing + **`computeWalkState()`** (nol ice-skating!), `resolve25DView` 8-arah + `yawDeg`, `actorHandWorldPos` (`rawZ`), `seatRadius`, `tiltComp`, `headTilt`, auto-inject `actorHeight` pada `sitHeight`, `strikeEnvelope` (4-6-1-8), `springPop`, kedip 4-frame, reaksi 2f lebih awal, dan *RMS-gated lip-sync*.
3. **Cinema Camera v4.0 (`(1).mp4` & `download.mp4`)**: `<CameraRig />` kanonik, `viewAxisFocus`, `DEFAULT_CREEP = 0` (**nol slow-zoom monoton!**), aturan garis sumbu 180° dialog vs `yawDeg` kontinu pada `orbitTo`/`orbitArc`, camera-local harmonic `kickOffset`, `moveSettle`, `pullOutReveal`, `whipPan`, `storyDolly`, `topDownInsert` (khusus prop 3D murni!), `craneTransition`, `handheld` loop-safe, serta transisi (`cut`/`dissolve`/`wipe`/`flash`) dan *frame-within-a-frame*.
4. **Soft-Lit Matte 3D World, Shadow & Look Bible**: `classifyGlbSurface()` anti-plastik (`shininess: 0`, Blender `Roughness >= 0,82`, `Normal Strength <= 0,45`, **`kampung.glb <= 24 MB` target / `<= 28 MB` cap**), `twoTone()` hemisphere wrap + specular suppression, `shadow.radius = 3.0`, `LIGHTS.noon.card.castShadow = true`, `uLocalLight` Reinhard soft-clamp, **16 pustaka prop 3D `engine/props/`**, `POST_HYBRID_25D` (rekomendasi default episode baru), dan perubahan cahaya/DOF hanya pada *hard cut*.
5. **Pure Cinema, Loop, YouTube Growth & 4-Platform Safe Zone**: ZERO 2D HUD boxes; hanya `SUB_STACK = 'label-above'` (`1485–1690 px`) bebas mulut & transisi shot; loop matematis & audio (`TOTAL_FRAMES % 90 === 0`, `events.json` `"loop"`); thumbnail 4-platform safe-zone (`y = 295..1630 px`, `x < 920 px`); metadata packaging via `.claude/youtube/voice.md` & `.agents/youtube-skills/`.

## Aturan teknis singkat
- Semua parameter berukuran piksel dikali `pxScale(outputHeight)` (`outputHeight / 1920`).
- Urutan post tetap: `InkPass` (`NOINK` aktif), `LensPass`, `UnrealBloomPass`, tone map netral, color grade, transisi editorial.
- Remotion menulis audio kosong, jadi mux selalu memetakan video dari input 0 dan audio dari input 1.
- Set `REMOTION_TMP` ke disk besar sebelum render; jalankan Python lewat `node pipeline/py.mjs` (`-B`), dan bersihkan file intermediate sampah (`pycache=0`, `blend1=0`) sebelum menutup Gate G4.
