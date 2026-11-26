# 01. Gambaran umum — MotionForge Atelier v3.0 (2.5D Reference Edition)

MotionForge Atelier adalah studio produksi video animasi **2,5D-in-3D**: dunia 3D dimodelkan di Blender lalu diekspor ke `.glb` (+ manifest AABB `*.boxes.json`), tokoh 2D digambar sebagai **1 siluet vektor utuh bervolume 2,5D** (*spherical face parallax*, *weighted ink*, `receiveShadow`/`castShadow` nyata, interaksi prop 3D via `actorHandWorldPos`, kompensasi `tiltX` pada *high-angle*), dan kamera bergerak sinematik mengikuti acuan `(1).mp4` & `download.mp4`.

Format utama adalah Short vertikal 9:16 (`1080×1920`, `30 fps`, **`58–75 detik`**, fleksibel hingga **`90 detik`** khusus VO asli pengguna, kelipatan **`90 frame`** untuk loop seamless). Template yang sama juga dipakai untuk episode YouTube 16:9 (`1920×1080`) dan aset branding kanal (banner `2560×1440`, profil `2048×2048`, thumbnail 4-platform `1080×1920`).

## Kenapa pendekatan ini
- **Ringan.** Set dunia disimpan sebagai satu master `.blend` dan beberapa `.glb` kecil di `public/sets/`.
  Tokoh, ekspresi, dan efek post tetap lahir dari kode.
- **Bisa diulang.** Satu folder per produksi, satu perintah untuk membuat yang baru.
- **Terbagi jelas.** Tiap agent punya file sendiri, jadi perubahan tidak saling menimpa.
- **Terjaga mutunya.** Empat gate (plus Fase 3.5 Spatial Audit) memaksa persetujuan sebelum tahap mahal dimulai.

## Lima Pilar Studio v3.0
1. **Zero-Clipping & Spatial Safety 2,5D (`engine/core/spatial.ts`)**: tidak ada benda melayang, dempet, atau saling menembus (`checkPropOverlap`, `checkBillboardSweep` bertingkat + 3D tilted quad, `checkCounterVisibility` perspektif + nol `armPose: 'rest'` di balik konter, `checkSafeFraming` / `actorFramingSubjects`, `checkScreenOcclusion`, dan 5-ray `checkSightline`).
2. **2.5D Reference Character Motion (`(1).mp4` & `motion.md`)**: **13 Indonesian Cast (`CAST_PRESETS`, termasuk `ebot`)** + **3 Kucing 2D (`CAT_PRESETS`)**, *spherical face parallax*, 8-arah (`backThreeQuarter` via `resolve25DView`), prop 3D murni di tangan via `actorHandWorldPos`, `seatRadius`, `tiltComp`, *noodle-limbs*, `headTilt`, auto-inject `actorHeight` pada `sitHeight`, *planted gait*, `strikeEnvelope`, kedip 4-frame, dan *RMS-gated lip-sync*.
3. **Cinema Camera v3.0 (`(1).mp4` & `download.mp4`)**: `<CameraRig />` kanonik, `viewAxisFocus`, `DEFAULT_CREEP = 0` pada hold dialog/panggung (tanpa *slow zoom* monoton), camera-local harmonic `kickOffset`, `moveSettle`, `pullOutReveal`, `whipPan`, analitis `orbit`, `storyDolly`, `topDownInsert` khusus prop 3D, `craneTransition`, `handheld` loop-safe, *frame-within-a-frame*, dan transisi kelas satu (`cut`/`dissolve`/`wipe`/`flash`).
4. **True 2.5D Light, Shadow & Look Bible**: `uLocalLight` dengan *Reinhard soft-clamp* anti-overbloom, `receiveShadow` nyata + `castShadow` siluet utuh ke lantai & dinding belakang, bayangan dingin, `POST_HYBRID_25D` untuk dunia 3D lembut.
5. **Pure Cinema, Loop, & 4-Platform Safe Zone**: ZERO 2D HUD boxes; hanya subtitle `SUB_STACK = 'label-above'` (`1485–1690 px`) bebas mulut & transisi shot; loop matematis & audio (`TOTAL_FRAMES % 90 === 0`); thumbnail safe-zone 4 platform (`y = 295..1630 px`, `x < 920 px`).

## Peta modul
`engine/` berisi hal yang dipakai semua video. `productions/<slug>/` berisi hal yang khas satu video.
Aturan praktis: jika dua video akan memakainya, naikkan ke `engine/`.

| Modul | Isi |
|-------|-----|
| `engine/core` | easing, `camera.ts`, `<CameraRig />`, timeline kata, spatial audit 2,5D (`spatial.ts`) |
| `engine/stage` | Stage, langit, kabut, preset cahaya, `shade.ts` (`uLocalLight` Reinhard soft-clamp) |
| `engine/cast` | 13 cast (`ActorBillboard`, `nusantara`), 3 kucing (`CatBillboard`, `cat`), 13 ekspresi + `blinkLidAt`, lip-sync, 23 props 2D, `sticker.ts` |
| `engine/sets` | `GlbSet`, `boxes.ts`/`boxesNode.ts`, `KampungSet`, `WarkopSet`, `KostSet`, `KampusSet` |
| `engine/textures` | tekstur cat prosedural + `disposeTextureCache` |
| `engine/post` | ink, lens, bloom, tone map, grade (`PostStack`, `DEFAULT_POST`, `POST_HYBRID_25D`) |
| `assets/sets/blend` | master Blender semua set (`bang_utoh_sets.blend`); ekspor ke `public/sets/*.glb` + `*.boxes.json` |
| `productions/charlab` | lab karakter, set, branding kanal, & thumbnail (14 komposisi) |
