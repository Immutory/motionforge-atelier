# Brief Produksi — EP04 "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!" (Bang Utoh #4)

> Status: **FINAL PRODUKSI (`G1–G3` LULUS, Master Render `87,00 dtk / 2610f` VO Asli Pengguna).**
> Folder produksi: `productions/ep04-karyawan-bakmie/` (terdaftar di `productions/registry.ts`).

- **Judul kerja:** `Karyawan Baru Bakmie Tio, Bosnya Si Oyen?! | Bang Utoh #4`
- **Slug:** `ep04-karyawan-bakmie`
- **Kontinuitas Canon:** Sekuel langsung **EP03 ("Curhat ke Abang Bakmie")** — malam berikutnya di Area Pedagang Kampung Rawa Sari RT 04. Bon EP03 `TOTAL 90RB` (termasuk Curhat 20rb + 3 piring ayam Oyen 45rb) belum lunas; 2 ikan asin dari Oyen ditolak sebagai alat bayar; karton `DICARI KARYAWAN` dari EP03 kini dicoret jadi `SUDAH DAPAT KARYAWAN`; hasil voting EP03 (`UTOH` vs `OYEN`) dikabulkan sekaligus — Utoh kerja di balik gerobak, Oyen direkrut jadi `MANDOR QC` bergaji ayam!
- **Format & Distribusi:** 1 Master Vertikal **9:16 (`1080×1920`, `30 fps`)** untuk **YouTube Shorts, Instagram Reels, TikTok, & Facebook Reels**.
- **Durasi Master Aktual:** **`87,00 dtk = 2610 frame`** (`29 × 90f`, `loopCutFrame = 2595`, `lastAudibleEnd = 84,78 dtk`, 20/20 VO asli pengguna + 4 meong Oyen; rancangan awal G1 `66,0 dtk = 1980f`).
- **Acuan Motion & Kamera:** `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4` & `contohvideo/download.mp4` (`DEFAULT_CREEP = 0`, `moveSettle`, `pullOutReveal`, `topDownInsert`, `orbitArc`, `strikeEnvelope` 4-6-1-8 + `KICKS`, `gait: 'planted'`, `ZERO 2D HUD`).

---

## 1. Logline & Premis Visual
Demi mencicil bon Rp 90.000 dari EP03, Bang Utoh resmi kerja shift malam di balik gerobak Bakmie Ayam Tio — namun atasannya ternyata Si Oyen (`MANDOR QC` bergaji ayam VIP). Semakin keras Utoh kerja memakai "Mode Multithreading", semakin tinggi jabatan Oyen (`KARYAWAN TERBAIK` → `KEPALA MANDOR`), sampai Slip Gaji Shift 1 membuat utang Utoh bukannya lunas malah **naik jadi Rp 120.000**.

## 2. Pemeran (100% Native `CAST_PRESETS` & `CAT_PRESETS`)
| Tokoh | Preset | Tinggi | Peran EP04 | Opsi Sumber Suara (Pilih di G1) |
|---|---|---:|---|---|
| **Bang Utoh** | `bangUtoh` | `1,96 m` | Karyawan baru di pijakan balik gerobak (`y = 0,30`), sok pakai jargon IT, eskalasi `tired → skeptical → nervous → angry → strain → happy → shock` | Rekaman pengguna (tempo sigap) / TTS lokal `bangUtoh` |
| **Abang Tio** | `tio` | `1,96 m` | Bos gerobak di tanah sisi timur (`[-12,05, 0, 17,75]`), deadpan HRD absolut | TTS lokal `tio` (`presets.json` Take B) / Rekaman pengguna |
| **Si Oyen** | `CAT_PRESETS.oyen` | `0,54 m` | `MANDOR QC` → `KEPALA MANDOR`, duduk di kursi plastik merah (`[-12,80, 0,46, 16,80]`), `smug`, slow-blink 14f, `pawRaise` presisi | `assets/voices/oyen.wav` (4× variasi trim/gain, terkunci) |
| **Pak Ujang** | `pakUjang` | `1,92 m` | Pembeli pertama (*straight man*, logat Jawa tenang), masuk & keluar `gait: 'planted'`, duduk kursi kayu (`[-13,38, 0, 16,80]`, `sitHeight: 0,46`) | TTS lokal `pakUjang` (`presets.json` Take B) / Rekaman pengguna |
| **Mbak Yuni** | `mbakYuni` | `1,86 m` | Pedagang Es Buah di pijakan gerobak sebelah (`[-9,62, 0,30, 18,38]`), komentator pedas santai | TTS lokal `mbakYuni` / Rekaman pengguna |

## 3. Lokasi, Pencahayaan, & Prop Diegetik 3D (ZERO 2D HUD)
- **Set:** `<KampungSet mode="malam" />` Area Pedagang Rawa Sari (`showGround={false}` di `<Stage>`), dengan `EP04_HIDE_NAMES` menyembunyikan mesh bawaan yang bentrok (`ReadyBowl`, `ReadyMie`, `DandangPot/Rim/Broth`, serokan bawaan, tiang/kabel penghalang).
- **Cahaya:** Key hangat dari bohlam gerobak Tio + rim dingin lampu jalan + neon gerobak Mbak Yuni + uap dandang `driftX: 0,22` menjauhi 5 titik wajah Utoh.
- **Daftar Prop Diegetik 3D (`NOINK` layer) & Rencana Koordinat:**

| Prop ID | Teks / Visual 3D | Muncul | Rencana Koordinat (`x, y, z`) | Catatan Spasial |
|---|---|---|---|---|
| `EP04_Pallet` | Pijakan kayu balik gerobak Tio | B1–B8 | `x -13,80..-12,65, y 0..0,30, z 18,15..18,65` | `torsoAboveCounter >= 0,32 m`, semua tangan Utoh `>= 1,04 m` |
| `EP04_PalletYuni` | Pijakan balik gerobak Es Buah | B1–B8 | `x -9,95..-9,30, y 0..0,30, z 18,15..18,65` | Bahu/lengan Yuni utuh di atas konter |
| `EP04_Stools` | Kursi kayu (`half 0,17`) & kursi plastik merah (`half 0,15`) | B1–B8 | `[-13,38, 0, 16,80]` & `[-12,80, 0, 16,80]` | Kartu Pak Ujang & Oyen via `seatCardPos(seat, half, camPos)` |
| `EP04_Dandang` | Dandang pendek-lebar + uap condong timur | B1–B8 | `[-12,91, 1,01, 17,62]` (bibir `1,205 m`) | 5 titik wajah Utoh 100% bebas dandang & uap |
| `EP04_CartSign` | Karton `KARYAWAN BARU — CICIL BON 90RB` | B1–B8 (loop) | `[-13,26, 0,73, 17,22]` | Bebas ≥ 3 cm di bawah `ServeLedge` (`0,88`) & di atas subtitle |
| `EP04_SignKaryawan` | Karton `DICARI` (dicoret merah) → `SUDAH DAPAT KARYAWAN` | B1–B8 | `[-13,94, 1,675, 17,33]` | Kontinuitas langsung EP03 di atas tutup etalase |
| `EP04_MandorPlate` | Papan meja lipat 2-sisi `MANDOR QC` → `KEPALA MANDOR` | B2–B8 | `[-12,94, 0,92, 17,17]` | Dibalik Tio di Beat 5 |
| `EP04_VipPlate` | Piring ayam VIP Oyen + bendera tusuk gigi `VIP` | B2–B8 | `[-12,75, 0,92, 17,17]` | Bebas ≥ 3 cm dari `MandorPlate` |
| `EP04_BowlUjang` | Mangkok mie Pak Ujang + suwiran ayam (2 → 4 potong) | B3–B6 | `[-13,44, 0,92, 17,17]` | Target `topDownInsert` 90° flat-lay Beat 3 |
| `EP04_BestEmployee` | Poster `KARYAWAN TERBAIK BULAN INI` + sketsa Oyen | B4–B8 | `[-13,93, 1,35, 17,24]` | Ditempel di kaca etalase (`PLAK!` + `springPop`) |
| `EP04_DeployBowls` | 3 mangkok mode multithreading (mendarat 1→2→3) | B5–B6 | `[-14,11 / -13,28 / -13,12, 0,92, 17,17]` | Bebas botol kecap/saus/sambal/sumpit bawaan GLB |
| `EP04_Cash` | Uang kertas bayar Pak Ujang | B6–B7 | `[-13,28, 0,92, 17,11]` | Ditaruh sebelum Pak Ujang berjalan keluar |
| `EP04_SlipGaji` | Nota tulisan tangan `SLIP GAJI — SHIFT 1` (`SISA UTANG BARU : 120rb` dilingkari merah + cap cakar Oyen) | B7 | `[-12,46, 1,38, 17,26]` (atau frontal di kaca etalase) | Shot makro frontal 3D `NOINK`, terbaca penuh tanpa tiang |

## 4. Konsep Thumbnail 9:16 (4-Platform Safe Zone)
- **Komposisi (`ShortsThumbnailsProduction.tsx`):**
  - Zona aman **YT Shorts 2:3**, **IG/TikTok 3:4 Grid**, **FB/IG 4:5 Feed (`y = 285..1635`)**, & bebas tombol UI kanan (`x < 920`).
  - **Headline 2 baris (atas):** `KERJA LUNASIN` / `BON 90RB?!`
  - **Pill badge (bawah):** `BOSNYA SI OYEN!`
  - **Visual utama:** Bang Utoh `shock` di balik gerobak + Si Oyen `smug` di kursi merah depan papan `MANDOR QC` + cuplikan lingkaran merah `120RB`.

## 5. Umpan Voting Komentar Menuju EP05
> *"Kerja semalaman, utang Bang Utoh malah naik jadi 120 ribu gara-gara Mandor Oyen! Menurut kalian di EP05 Bang Utoh harus **LEMBUR** (shift kedua balas dendam ke Kepala Mandor) atau **RESIGN** (kabur lalu ditagih Pak Ujang)? Komen di bawah!"*
