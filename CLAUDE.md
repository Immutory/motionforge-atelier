# MotionForge Atelier (v2.0)

Studio produksi untuk video animasi bergaya karakter 2D di dunia 3D. Format utama Short 9:16
(1080×1920, 30 fps, 55–75 detik); juga episode YouTube 16:9 (1920×1080) dan branding kanal.
Stack: Remotion, Three.js (`react-three-fiber`), Blender 5.3 untuk set (`.blend` → `public/sets/*.glb`),
dan Python untuk audio & QA.

Acuan gaya utama studio: video referensi di `contohvideo/` (`(1).mp4` & `(4).mp4`) serta laporan terukur di `references/reports/`.

## Cara kerja dengan Claude Code
1. Jalankan showrunner sebagai sesi utama: `claude --agent showrunner`. Hanya dia yang memanggil agent lain lewat tool `Agent`.
2. Satu file punya satu pemilik. Lihat `docs/04-file-ownership.md`. Jangan edit file milik agent lain.
3. Wajib jalankan **Fase 3.5 — Spatial & Collision Audit** (`engine/core/spatial.ts`) sebelum Gate G2.
4. Berhenti di setiap gate (**G1 naskah**, **G2 stills**, **G3 motion**, **G4 master**) dan tunggu persetujuan eksplisit pengguna.
5. Cerita, tokoh, dan suara selalu orisinal. Referensi hanya untuk belajar gaya, gerak, dan bahasa kamera.

## Perintah penting
- `npm run doctor`                          cek lingkungan
- `npm run forge:new -- <slug> "Judul"`     buat produksi baru dari `_starter`
- `npm run studio`                          preview interaktif
- `npm run still | preview | render | mux | sound | qa`   lihat skill `atelier-render-ship`
- `npm run check`                           typecheck + seluruh tes spasial/engine/Python (wajib hijau sebelum minta persetujuan)

## Lima Pilar Studio (berlaku untuk setiap shot)
1. **Zero-Clipping & Spatial Safety (`engine/core/spatial.ts`)**: `checkPropOverlap`, `checkBillboardSweep` (termasuk proyeksi `yaw` kamera aktif), `checkCounterVisibility` (bahu/dada/lengan tampil utuh di atas konter, nol kepala terpenggal), `checkSafeFraming` (0 wajah/papan nama terpotong), dan `checkSightline` (`hideNames`).
2. **Reference Character Motion (`contohvideo/` & `motion.md`)**: 12 cast (`CAST_PRESETS`) + 3 kucing 2D (`CAT_PRESETS`), *organic noodle-limbs* Bezier 3-titik, `headTilt` independen, `sitHeight` duduk menapak di bangku, `view: 'back'` penuh, *planted gait*, `strikeEnvelope` (4f wind-up → 6f hold → 1f strike → 8f follow), `springPop`, kedip 4-frame, reaksi 2f lebih awal, dan *RMS-gated lip-sync*.
3. **Reference Cinema Camera (`contohvideo/`)**: *Purposeful 3D Move → Confident Settle* (`DEFAULT_CREEP = 0` pada hold dialog/panggung; nol *slow zoom* monoton!), memanfaatkan `moveSettle`, `pullOutReveal`, `orbitArc`, `topDownInsert`, `craneTransition`, serta transisi kelas satu (`cut` / `dissolve` 8–14f / `wipe` 8–12f / `flash`).
4. **Motivated Light & Look Bible**: sumber cahaya jelas, bayangan dingin terarah (`indoorLight` untuk interior), karakter terpisah dari latar, dan pencahayaan/DOF hanya berubah di *hard cut*.
5. **Pure Cinema (ZERO 2D HUD Clutter)**: dilarang menaruh kotak UI/banner/popup 2D di atas dunia 3D; seluruh informasi cerita tampil diegetik 3D, hanya subtitle bawah + label pembicara dan transisi shot yang diperbolehkan.

## Aturan teknis singkat
- Semua parameter berukuran piksel dikali `pxScale(outputHeight)` (`outputHeight / 1920`).
- Urutan post tetap: `InkPass` (dengan isolasi layer `NOINK` aktif untuk karakter 2D & papan nama 3D), `LensPass`, `UnrealBloomPass`, tone map netral, color grade, transisi editorial.
- Remotion menulis audio kosong, jadi mux selalu memetakan video dari input 0 dan audio dari input 1.
- Set `REMOTION_TMP` ke disk besar sebelum render, dan bersihkan file intermediate sampah sebelum menutup Gate G4.
