# 05. Gate mutu (Atelier v3.5 — 2D-Grade Walk + Soft-Lit 3D Polish)

## G1 Naskah
- Semua fakta punya sumber yang bisa dibuka.
- Jumlah kata menghasilkan **`58–75 detik`** untuk Short 9:16 (fleksibel hingga **`90 detik`** khusus rekaman VO asli pengguna, kelipatan **`90 frame`** agar loop matematis & audio seamless; ritme `3,5–3,8 kata/detik`).
- Ada hook, titik patah, eskalasi visual, callback loop, serta rencana thumbnail 4-platform (`y = 295..1630 px`, `x < 920 px`).

## G2 Stills (setelah Fase 3.5 Spatial & Collision Audit 2,5D)
- **Auto-Reject Gate G2** jika ada 1 saja pelanggaran `engine/core/spatial.ts` atau standar visual v3.5:
  - `checkPropOverlap` gagal (prop dempet/nembus atau bentrok prop GLB bawaan).
  - `checkBillboardSweep` gagal (termasuk profil bertingkat & bidang miring 3D `tiltX` pada sudut `yaw` kamera aktif; tokoh duduk wajib pakai kursi tunggal + `seatRadius`).
  - `checkCounterVisibility` gagal (termasuk proyeksi perspektif kamera rendah; dada atas, bahu, & lengan wajib tampak `≥ 0,32 m` di atas konter; **dilarang `armPose: 'rest'` di balik konter** — semua `handY >= counterTopY + 0,08 m`).
  - `checkSafeFraming` / `checkScreenOcclusion` gagal (wajah/telinga/papan penting terpotong atau tertutup prop depan, atau masuk zona subtitle `SUB_STACK = 'label-above'` `1485–1690 px`).
  - `checkSightline` (*5-ray face cone*, filter kaca otomatis) menemukan tiang/dandang/uap/kabel menghalangi wajah tanpa `hideNames`.
  - **Kilap plastik pada permukaan matte** (aspal, tembok, kayu, paving, rumput, trotoar, palet): wajib `classifyGlbSurface` matte (`shininess: 0`), Blender `Roughness >= 0,82`, `Normal Strength <= 0,45`, `shadow.radius = 3.0`, dan `kampung.glb <= 29 MB`.
- Tidak ada karakter atau benda melayang, nol over-bloom (berkat `uLocalLight` Reinhard soft-clamp), setiap sumber cahaya bisa disebutkan, dan `LIGHTS.noon.card.castShadow = true` memberi bayangan jatuh lembut.
- **ZERO 2D HUD boxes/banners**: hanya subtitle bawah `SUB_STACK = 'label-above'` bebas mulut dan transisi shot yang diperbolehkan.
- Skor QA visual: **setiap skor < 5 wajib diperbaiki sebelum gate lulus; > 2 skor < 5 = stop & kembali ke fase pemilik**; `npm run check` hijau 100%.

## G3 Motion
- **2D-Grade Articulated Walk (`nusantara.ts` v3.5 — ZERO Ice-Skating!)**:
  - **DILARANG karakter bergeser XZ dalam `stance: 'stand'`!** Semua pergerakan horizontal wajib memakai **`computeWalkState()`** + **`gait: 'planted'`** (default manusia & kucing).
  - Verifikasi 4-pose berjalan: 2-Bone Analytic Leg IK (lutut menekuk alami `60–70°` di Passing), far-leg digelapkan `16%`, foot roll 4-pose (`+18°` heel-strike, `0°` flat, `-24°` toe-off), counter-swing lengan `Math.cos(ph)`, contact shadow dinamis (`blobY = 0,005`), dan `strideBlend` ease-out mulus saat berhenti.
- **Cinema Camera v3.0 (`(1).mp4` & `download.mp4`)**: tolak *slow zoom* monoton pada hold dialog; gunakan hold mantap (`creepRate: 0`) dan gerak 3D bermotivasi (`moveSettle`, `pullOutReveal`, `whipPan`, analitis `orbit`, `storyDolly`, `topDownInsert` khusus prop 3D murni, `craneTransition`, `handheld` loop-safe).
- Tidak ada frame benar-benar beku lebih dari 12 frame (**kamera diam dengan akting hidup** — kedip, lip-sync RMS, napas, uap, pulsa layar — adalah valid dan diharapkan!).
- Reaksi visual mendarat 2 frame (0–3f) sebelum kata pemicunya (`reactionFrame`).
- `strikeEnvelope` (4f wind-up → 6f hold → 1f strike → 8f follow) + camera-local harmonic `KICKS` pada benturan; `flash` 4f pada pergantian realitas.
- Nol flicker stance/lengan 1-frame, dan loop Short mulus (`TOTAL_FRAMES % 90 === 0`, kamera & pose akhir = `f0`).

## G4 Master
- `npm run qa` lulus: `0` frame hitam, `0` bagian beku, target master `-16,0 LUFS` / `TP ≤ -1,5 dBTP` (band lulus QA `-17` s/d `-13 LUFS`, `TP ≤ -1,0 dBTP`), loop audio (`events.json` `"loop"`) bersih tanpa klik.
- `npm run check` lulus 100%, `pycache=0`, `blend1=0`, ukuran file wajar (tanpa film grain), thumbnail 4-platform safe-zone (`y = 295..1630 px`, `x < 920 px`) siap, file intermediate sampah sudah dibersihkan.
- Pengguna menyetujui hasil akhir.

## Jebakan keterbacaan yang harus dicek tiap prop & shot baru
- Ayunan dengan satu tali terbaca seperti orang tergantung — pakai dua tali.
- Prop terlalu dekat lensa (< ~0,6 m tanpa maksud macro) menjadi gumpalan besar terpotong.
- Semak terpotong tepi frame terbaca seperti bola hijau.
- Bendera dengan warna dan simbol tertentu bisa tak sengaja menyerupai bendera negara lain.
- Papan bertulisan yang kena cahaya samping jadi abu-abu — beri material unlit `NOINK`.
- Penjaga di balik konter berdiri di `y = 0` tampak seperti kepala terpenggal — wajib pakai `SpotMeta.ergonomicBaseY` dan verifikasi `checkCounterVisibility`.
