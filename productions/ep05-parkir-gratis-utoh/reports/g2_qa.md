# Gate G2 Look-Dev & Visual QA Report — EP05 (`ep05-parkir-gratis-utoh`)

- **Produksi:** `"PARKIR GRATIS 0 RUPIAH, TAPI KELUARNYA BAYAR 10 RIBU?!"` (Bang Utoh #5)
- **Format:** `1080×1920` (9:16), `30 fps`, **`90,00 dtk` (`2700 frame = 30 × 90f`)**, `loopCutFrame = 2685`, `lastAudibleEnd = 88,84 dtk`, 22 VO pengguna + 1 meong Belang
- **Contact Sheet 4×4:** `out/ep05-parkir-gratis-utoh/G2_contact_sheet.jpg`
- **Automated Gate (`npm run check`):** **187/187 TS PASS + 19/19 Python PASS**

---

## Layer 1 — Automated Spatial & Production Audit (100% PASS)

| Cek | Status | Keterangan |
|---|---|---|
| `checkPropOverlap` (prop ↔ prop & prop ↔ `kampung.glb`) | **PASS** | Nol tembus / dempet antar prop EP05 & seluruh mesh `kampung.glb` |
| `checkBillboardSweep` (per-frame step 2f di 2700 frame) | **PASS** | Nol sapuan billboard menembus Minimarket, ATM, `KG_StreetPole_02`, atau Angkot |
| `checkSafeFraming` (9:16 + zona subtitle `1485–1690 px`) | **PASS** | Seluruh 25 shot subjek utuh & bebas zona subtitle |
| `checkSightline` (kamera → subjek) | **PASS** | Nol penghalang garis pandang di semua 25 shot |
| Eye-Level `|pitch| <= 12°` & `DEFAULT_CREEP === 0` | **PASS** | 25/25 shot eye-level, nol slow-zoom monoton |
| Anti-Teleport `MAX_STEP <= 0,16 m/f` & Loop `f2699 === f0` | **PASS** | Nol teleport di semua 6 karakter; kamera & pose Frame 2699 identik Frame 0 |

---

## Layer 2 — Inspeksi Visual Piksel per Piksel (16 Hero Stills)

### Perbaikan yang Ditangkap & Diselesaikan pada Putaran G2
1. **Engine Shader Fix (`engine/stage/shade.ts`):** Memperbaiki error kompilasi GLSL `if ( i == 0 ) sunVis = dShadow;` pada loop ter-unroll Three.js menjadi `if ( sunVisSet == 0 ) { sunVis = dShadow; sunVisSet = 1; }` → 0 WebGL shader error, seluruh dunia 3D & karakter 2.5D terender penuh dengan bayangan jatuh alami.
2. **Blocking Pak Budi B6–B7 (`f1942`, `f2052`, `f2455`):** Menggeser `pakBudiHandover` dari `x = -31,18` ke `x = -32,02` agar papan kapur **`120RB + 200RB = 320RB!`** tampil 100% terbuka di samping Ebot.

### Skor 6 Pilar Visual (Skala 1–10; Ambang Lulus ≥ 8,0)

| Pilar Visual | Skor | Catatan Inspeksi |
|---|---|---|
| 1. Komposisi & Framing 9:16 | **9,5 / 10** | 16/16 hero still bersih, hierarki visual siang hari Minimarket–ATM tajam |
| 2. Keterbacaan Prop Diegetik 3D (`NOINK`) | **9,8 / 10** | `PARKIR GRATIS!`, papan kapur 6 fase (`6RB`, `10RB`, `80RB!`, `320RB!`), & `SURAT DENDA RESMI Rp 200.000` + stempel merah terbaca tajam di HP; 0% 2D HUD |
| 3. Ekspresi & Akting 6 Karakter | **9,4 / 10** | Utoh `smug→laugh→shock`, Ebot deadpan, Udin & Raka oleng `> <` di atas motor 3D, Pak Budi `smug`, Belang `<CatBillboard />` cuek |
| 4. Pencahayaan Siang Soft-Lit (`download.mp4`) | **9,4 / 10** | Langit biru cerah, bayangan lembut, wajah cerah tanpa over-bloom |
| 5. Kebersihan Spasial (`ZERO CLIPPING`) | **9,7 / 10** | 0% penembusan aset; kucing Belang bertengger rapi via `seatCardPos` |
| 6. Subtitle Putih Polos (`#ffffff`) | **9,5 / 10** | 100% putih polos dengan outline gelap tegas di zona `1485–1690 px` |
| **Rata-rata Keseluruhan** | **9,6 / 10** | **LULUS GATE G2 — Siap ke Gate G3 (Motion Preview 30fps) setelah persetujuan pengguna** |
