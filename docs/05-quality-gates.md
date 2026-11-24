# 05. Gate mutu (Atelier v2.0)

## G1 Naskah
- Semua fakta punya sumber yang bisa dibuka.
- Jumlah kata menghasilkan 55–75 detik (3,5–3,8 kata/detik) dengan ritme dialog alami.
- Ada hook, titik patah, penjelasan/eskalasi visual, dan callback.

## G2 Stills (setelah Fase 3.5 Spatial & Collision Audit)
- **Auto-Reject Gate G2** jika ada 1 saja pelanggaran `engine/core/spatial.ts`:
  - `checkPropOverlap` gagal (prop dempet/nembus atau bentrok prop GLB bawaan).
  - `checkBillboardSweep` gagal (karakter/kucing menyapu masuk ke bangku, meja, konter, atau tiang pada sudut `yaw` kamera aktif).
  - `checkCounterVisibility` gagal (penjaga konter tenggelam / hanya terlihat kepala; dada atas, bahu, & lengan wajib tampak `≥ 0,32 m` di atas konter).
  - `checkSafeFraming` gagal (wajah, kepala, telinga, atau papan nama penting `WARKOP 24 JAM` / `MENU WARKOP` / `LAB KOMPUTER FIK 2.1` terpotong tepi frame, atau wajah bertabrakan dengan zona subtitle 9:16 `y ≈ 76–88%`).
  - `checkSightline` menemukan tiang/kabel menghalangi subjek tanpa `hideNames`.
- Tidak ada karakter atau benda melayang; setiap sumber cahaya bisa disebutkan.
- **ZERO 2D HUD boxes/banners**: hanya subtitle bawah + label pembicara yang diperbolehkan.
- Skor QA visual: tidak ada area di bawah 5; `npm run check` hijau 100%.

## G3 Motion
- **Reference Cinema Camera (`contohvideo/`)**: tolak *slow zoom* monoton pada hold dialog; gunakan hold mantap (`creepRate: 0`) dan variasi gerak 3D bermotivasi (*Move → Settle*, *Pull-Out Reveal*, *Orbit Arc*, *Top-Down Insert*, *Crane Transition*, *Cross-Dissolve* / *Wipe*).
- Tidak ada frame benar-benar beku lebih dari 12 frame (**kamera diam dengan akting hidup** — kedip, lip-sync RMS, napas, uap, pulsa layar — adalah valid dan diharapkan!).
- Reaksi visual mendarat 2 frame (0–3f) sebelum kata pemicunya (`reactionFrame`).
- `strikeEnvelope` (4f wind-up → 6f hold → 1f strike → 8f follow) + `KICKS` pada momen benturan; `flash` 4f pada pergantian realitas.
- Kaki menapak mantap (`gait: 'planted'`, nol meluncur/moonwalk), nol flicker stance/lengan 1-frame.

## G4 Master
- `npm run qa` lulus: `0` frame hitam, `0` bagian beku, loudness antara `-16` dan `-13 LUFS`, true peak `≤ -1 dBTP`.
- `npm run check` lulus 100%, ukuran file wajar (tanpa film grain), file intermediate sampah sudah dibersihkan.
- Pengguna menyetujui hasil akhir.

## Jebakan keterbacaan yang harus dicek tiap prop & shot baru
- Ayunan dengan satu tali terbaca seperti orang tergantung — pakai dua tali.
- Prop terlalu dekat lensa (< ~0,6 m tanpa maksud macro) menjadi gumpalan besar terpotong.
- Semak terpotong tepi frame terbaca seperti bola hijau.
- Bendera dengan warna dan simbol tertentu bisa tak sengaja menyerupai bendera negara lain.
- Papan bertulisan yang kena cahaya samping jadi abu-abu — beri material unlit `NOINK`.
- Penjaga di balik konter berdiri di `y = 0` tampak seperti kepala terpenggal — wajib pakai `SpotMeta.ergonomicBaseY` dan verifikasi `checkCounterVisibility`.
