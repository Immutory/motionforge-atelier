# Gate G2 Look-Dev & Visual QA Report — EP04 (`ep04-karyawan-bakmie`)

- **Produksi:** `"Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!"` (Bang Utoh #4)
- **Format:** `1080×1920` (9:16), `30 fps`, **Master Aktual (pasca-G3 VO pengguna): `87,00 dtk` (`2610 frame = 29 × 90f`, `loopCutFrame = 2595`, `lastAudibleEnd = 84,78 dtk`)** *(snapshot G2 awal berbasis TTS lokal: `69,00 dtk / 2070 frame`)*.
- **Contact Sheet 4×4:** `out/ep04-karyawan-bakmie/G2_contact_sheet.jpg`
- **Automated Gate (`npm run check`):** **170/170 TS PASS + 20/20 Python PASS** (termasuk 7 tes Fase 3.5 Spatial Audit & 4 tes EP04 Production Contract)

---

## Layer 1 — Automated Spatial & Production Audit (100% PASS)

| Cek | Status | Keterangan |
|---|---|---|
| `checkPropOverlap` (prop ↔ prop & prop ↔ `kampung.glb`) | **PASS** | Nol tembus / dempet antar 15 prop EP04 & seluruh mesh `kampung.glb` |
| `checkCounterVisibility` + nol `armPose: 'rest'` di balik konter | **PASS** | Kepala & lengan Utoh + Mbak Yuni 100% bersih di atas `LEDGE_TOP_Y` |
| `checkBillboardSweep` (per-frame step 2f di 2070 frame) | **PASS** | Nol sapuan billboard menembus gerobak/etalase/kursi |
| `checkSafeFraming` (9:16 + zona subtitle `1485–1690 px`) | **PASS** | Seluruh wajah subjek & papan diegetik utuh dan bebas zona subtitle |
| `checkSightline` (kamera → subjek & 5 titik wajah Utoh) | **PASS** | Nol penghalang; `LadleHandle`, `LadleBowl`, `SerokanBasket`, & `SerokanHandle` disembunyikan via `EP04_HIDE_NAMES` |
| Kamera Eye-Level `|pitch| <= 12°` & `DEFAULT_CREEP === 0` | **PASS** | Seluruh 30/30 shot eye-level `|pitch| <= 12°` (termasuk `b3-topdown-mie` yang direvisi ke *eye-level close-up* `-8,3°` atas arahan pengguna) |
| Loop Matematis `f2069 === f0` & Durasi `62–70 dtk` | **PASS** | `sampleCamera(CAMS, 2069) === sampleCamera(CAMS, 0)`, uap periode `90f`, durasi `69,00 dtk (2070f)` |

---

## Layer 2 — Inspeksi Visual Piksel per Piksel (16 Hero Stills)

### Perbaikan Visual yang Ditangkap & Diselesaikan pada Putaran G2
1. **Menyembunyikan `KG_Grb_BakmieTio_SerokanBasket` & `KG_Grb_BakmieTio_SerokanHandle`** di `EP04_HIDE_NAMES` → membersihkan batang cokelat & keranjang abu-abu yang sebelumnya melintang di depan kacamata Bang Utoh pada 11 still.
2. **Re-frame `b2-oyen-reveal` (`f0241`)**: mempercepat `pullOutReveal` (`holdMacro: 4, glide: 10`) dan memundurkan `POSE_OYEN_REVEAL` 0,5 m sehingga Si Oyen di kursi merah, papan `MANDOR QC ★ SI OYEN ★`, piring ayam `VIP`, dan Bang Utoh di belakang dandang tampil utuh dalam satu komposisi hero.
3. **Upgrade 3D Cakar Oyen di `b3-topdown-mie` (`f0622`)**: membentuk lengan oranye belang + telapak bulat + 3 jari krem yang menepuk meja di samping mangkok Pak Ujang.
4. **Perluasan Pan `b1-pan-karton` (`f0085`)**: menampilkan penuh `BAKMIE AYAM TIO`, karton `DICARI` (dicoret merah) → `SUDAH DAPAT KARYAWAN`, sekaligus karton depan `KARYAWAN BARU — CICIL BON 90RB`.
5. **Polishing `b5-deploy-1` (`f1190`) & `b7-slip-insert` (`f1658`)**: menjaga langkah lateral Utoh (`utohStepLeft.x = -13.18`) bebas bingkai etalase, dan memberi ruang napas antara teks `SISA UTANG BARU` dan oval merah `120rb`.

### Skor 6 Pilar Visual (Skala 1–10; Ambang Lulus ≥ 8,0)

| Pilar Visual | Skor | Catatan Inspeksi |
|---|---|---|
| 1. Komposisi & Framing 9:16 | **9,5 / 10** | 16/16 hero still bersih, hierarki visual jelas, `topDownInsert` 90° & `pullOutReveal` Oyen ikonik |
| 2. Keterbacaan Prop Diegetik 3D (`NOINK`) | **9,8 / 10** | `KARYAWAN BARU — CICIL BON 90RB`, `SUDAH DAPAT KARYAWAN`, `MANDOR QC ↔ KEPALA MANDOR`, `KARYAWAN TERBAIK BULAN INI`, & `SLIP GAJI — SHIFT 1` (`120rb` + cap cakar oranye) terbaca tajam di layar HP; 0% 2D HUD |
| 3. Ekspresi, Siluet & Arah Jari Karakter | **9,4 / 10** | Eskalasi `tired → shock → nervous → angry → strain (> <) → shock`, `hatPop: springPop`, dan `sodet` 20px tampil jernih |
| 4. Pencahayaan & Mood Malam Rawa Sari | **9,2 / 10** | Kontinuitas langsung malam EP03; bohlam gerobak hangat + fill Tio & bounce bangku menjaga kontras wajah tetap terang |
| 5. Kebersihan Spasial (`ZERO CLIPPING`) | **9,8 / 10** | 0% penembusan aset; semua `Serokan`/`Ladle` penghalang disembunyikan |
| 6. Zona Subtitle `label-above` | **9,3 / 10** | Konsisten di `1485–1690 px`, kontras tinggi, tidak menutup wajah utama maupun papan punchline |
| **Rata-rata Keseluruhan** | **9,5 / 10** | **LULUS GATE G2 — Siap ke Gate G3 (Motion Preview 30fps) setelah persetujuan pengguna** |
