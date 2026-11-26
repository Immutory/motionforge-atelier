# Storyboard & 3D Spatial Blocking — EP05 (`ep05-parkir-gratis-utoh`)

## 1. Peta Koordinat 3D Pelataran Minimarket & ATM (`KampungSet mode="siang"`)

Semua koordinat diverifikasi langsung dari `public/sets/kampung.glb`:
- **Minimarket (`KG_RukoWest1_Body_3` + lis merah-biru-kuning):** `X[-34.76, -30.44]`, dinding depan `Z = 2.25`, awning `Z = 2.27..3.42` (`Y = 2.70`).
- **ATM Booth (`KG_P5_ATM_BoothBody`):** `X[-28.82, -27.47]`, kaca depan `Z = 2.78..2.82`.
- **Tiang Hero (`KG_StreetPole_02`):** `X[-30.08, -29.92]`, `Y[0.00, 5.24]`, `Z[4.16, 4.34]` — berdiri tepat di antara Minimarket & ATM!
- **Zona Parkir Bebas Hambatan:** `X[-34.0, -28.2]`, `Z[3.10, 5.15]` (bebas dari `KG_P5_Car_Angkot01` di `X[-26.88, -23.12], Z[5.44, 7.06]`).

| Aset / Karakter | Posisi Dunia `[x, y, z]` | Keterangan Blocking |
|---|---|---|
| `KardusParkir3D` | `[-30.00, 1.38, 4.38]` | Menempel sisi depan (`+Z`) tiang `KG_StreetPole_02` |
| `PapanKapurTally3D` | `[-31.15, 0.00, 3.85]` | Berdiri di atas kuda-kuda kayu di samping Ebot, menghadap `+Z` |
| `KardusBelang3D` | `[-29.52, 0.00, 4.18]` | Kotak kardus datar (`tinggi 0,34 m`) di kanan tiang untuk `belang` |
| `bangUtoh` (default) | `[-30.52, 0.00, 3.92]` | Berdiri di kiri tiang, tangan kanan menjangkau kardus saat `PLAK!` |
| `ebot` (default) | `[-31.55, 0.00, 3.88]` | Berdiri di samping `PapanKapurTally3D` memegang kapur |
| `MotorUdin3D` / `bangUdin` | `[-32.60, 0.00, 3.65]` → `[-32.60, 0.00, 4.65]` | Masuk & mundur di kotak parkir putih depan Minimarket |
| `MotorRaka3D` / `raka` | `[-32.60, 0.00, 3.65]` → `[-32.60, 0.00, 4.65]` | Masuk & oleng freestyle 5 tapak di kotak parkir putih |
| `MotorPakBudi3D` / `pakBudi` | `[-32.55, 0.00, 3.65]` → `[-32.55, 0.00, 4.85]` | Pak Budi turun di sisi timur motor (`x = -31.95`) lalu jalan mundur `planted` mendorong motor |
| `belang` (`<CatBillboard />`) | `[-29.52, 0.34, 4.18]` | Bertengger di atas `KardusBelang3D` (`seatCardPos` anti-clipping) |
| `SuratDendaRT3D` | `[-31.25, 1.36, 4.55]` | Disodorkan Pak Budi tepat frontal ke kamera makro Beat 7 (`NOINK`) |

## 2. Alur Visual 8 Beat
1. **Beat 1 (Hook + Pan):** Buka medium-tight di tiang `KG_StreetPole_02` saat Utoh menempel kardus `PARKIR GRATIS!` (`PLAK!`) → *lateral pan* (`moveSettle`) turun-kanan menyorot tulisan kecil `(SYARAT: MUNDUR TANPA KAKI TURUN)` dan Ebot memegang papan `DENDA 2RB / TAPAK`.
2. **Beat 2 (Setup):** Two-shot eye-level Utoh & Ebot dengan latar Minimarket merah-biru-kuning + ATM; Utoh menunjuk akurat ke tulisan kecil kardus; Ebot menulis `TARGET: 120RB`.
3. **Beat 3 (Bang Udin):** Wide pelataran parkir → Udin masuk dengan `MotorUdin3D` → close-up reaksi & 3× hentakan kaki (`strikeEnvelope` + `KICKS`) → cut ke papan kapur `3 × 2RB = 6RB` → Udin bayar sambil menggerutu.
4. **Beat 4 (Raka SMA):** Medium Raka sok keren di atas `MotorRaka3D` → 5× goyangan kiri-kanan + tapak kaki ritmis → cut ke papan kapur `5 × 2RB = 10RB` → Raka pasrah.
5. **Beat 5 (Tally 80RB):** `topDownInsert` / makro papan kapur penuh coretan tally `TERKUMPUL: 80RB!` → cut medium Utoh tertawa sombong ala bos.
6. **Beat 6 (Pak Budi Loophole Break):** Wide pelataran → Pak Budi tenang turun dari `MotorPakBudi3D`, lalu berjalan mundur (`gait: 'planted'`, 0 slip) mendorong motornya keluar garis putih → CU Utoh `shock`.
7. **Beat 7 (Surat Denda & 320RB):** Pak Budi menyodorkan `SuratDendaRT3D` → makro frontal 3D (`NOINK`) berstempel merah `DENDA PUNGLI: Rp 200.000` → cut papan kapur Ebot `120RB + 200RB = 320RB!` → CU Utoh `shock` (`hatPop: springPop`).
8. **Beat 8 (Belang & Seamless Loop):** CU kucing `belang` tidur cuek di atas kardus + slow-blink → hard-cut kembali ke framing identik Frame 0 (`Utoh` lemas menatap langit: *"Bot… ambil kardus baru."*) → ekor hening 15f → loop tak terlihat ke `f0`.
