# Zoning Kampung Rawa Sari RT 04 — v2

Status: denah disetujui (gate zoning), dibangun oleh `assets/sets/build_kampung_v2.py`, diekspor oleh
`assets/sets/export_kampung_glb.py`. Koordinat spot final ada di `engine/sets/KampungSet.tsx` (`KAMPUNG_SPOTS`),
dan untuk ruangan beberapa nilai sedikit bergeser dari tabel usulan di bawah supaya karakter tidak menabrak meja.

Pemilik: set-designer. Gambar denah: [sheets/zoning_kampung_v2.svg](sheets/zoning_kampung_v2.svg).

Koordinat ditulis dalam **Blender X/Y** (X ke timur, Y ke utara). Di Three.js: `x = X`, `z = −Y`, `y` = tinggi.
Angka "sekarang" diukur langsung dari `bang_utoh_sets.blend` (koleksi `KampungSet`, 2.742 objek, sekitar 314 ribu face).

## 1. Ukuran dunia

| | Sekarang | Usulan v2 |
|---|---|---|
| Tanah (`KG_GroundGrass`) | X −85,7…84,3 · Y −62,4…82,6 (sekitar 170 × 145 m) | X −132…132 · Y −100…120 (**264 × 220 m**) |
| Jalan utama (`KG_AsphaltRoad`) | X −85…85, Y −9,1…−3,9 | diperpanjang ke X −132…132 |
| Jalan kedua (`KG_BackAvenue`) | X −77,5…77,5, Y 15,6…19,4 | jadi **Jl. Kampung 2**, diperpanjang ke X −132…86 (berakhir di pertigaan Jl. Pendidikan) |

Bagian dunia yang sudah ada (ruko, masjid, kos, warkop, area pedagang, rumah, distrik kampus latar, skyline)
**tidak dipindah**. Perluasan hanya ke barat, timur, dan selatan, jadi `KAMPUNG_SPOTS` lama tetap valid.

## 2. Zona baru dan zona yang berubah

| Zona | Area (X · Y) | Isi |
|---|---|---|
| **Gedung Kampus FIK 3 lantai** | X 7,0…22,8 · Y 0,5…14,5 (15,8 × 14 m, tinggi sekitar 12,6 m) | Menggantikan `KG_KP_*` (lab 1 lantai) dan rumah `HouseRow1_08`, `_09`, `_10`. Plaza depan Y −3,7…0,5 dengan tiang bendera, pos satpam, dan palang parkir. |
| **Kompleks Sekolah SD + SMA** | X 90…128 · Y 1…34 | Gedung Y 16…28. Sayap SD X 90…109, sayap SMA X 109…128, dipisah **dinding api penuh 3 lantai di X 109**, dengan tangga dan papan nama sendiri-sendiri. Lapangan upacara bersama Y 1…14, gerbang bersama di X 107…111 di tepi jalan utama, kantin X 90…98 · Y 29…34, parkir sepeda X 120…128 · Y 29…34. |
| **Jl. Pendidikan + pertigaan** | X 85…88,6 · Y −3,9…36,2 | Jalan ke utara dari jalan utama sampai FarNorthRoad. Traffic light baru di (84,2; −9,6) dan (89,4; −3,6). |
| **Kali + jembatan** | X −100…−97 (lebar 3 m, dalam sekitar 1,5 m) | Membelah sisi barat dari utara ke selatan. Ada jembatan jalan di jalan utama dan **jembatan kecil** kayu/beton di Jl. Kampung 2. |
| **Bengkel motor** | X −96…−86 · Y −2…8 | Utara jalan, timur kali. |
| **Warung kelontong** | X −96…−88 · Y −20…−12 | Selatan jalan, timur kali. |
| **8 rumah warga baru** | X −128…−102: 4 rumah di Y −2…8 dan 4 rumah di Y −20…−12 | 1–2 lantai. Lebar 5,5–6,5 m dengan fasad, warna cat, pagar, dan atap yang berbeda-beda. |
| **Musala + taman kecil** | X −128…−104 · Y 22…34 | Utara Jl. Kampung 2. |
| **Gang Gapura / Gang Timur** | `KG_AlleyRoad_West` X −19,8…−16,5, `KG_AlleyRoad_East` X 23,4…27,6 | Sudah ada. Diubah jadi gang paving dengan got, lampu gang, kabel listrik menjuntai, dan jemuran. Inilah 2 gang penghubung jalan utama ke Jl. Kampung 2. |

Isian kepadatan di semua zona: tiang dan kabel listrik antar tiang, jemuran, pot, motor di teras, spanduk,
papan RT/RW, tong sampah, polisi tidur (di Jl. Kampung 2 dan gang), pohon mangga dan pisang.
Benda yang berulang dibuat sebagai instance (linked duplicate). Saat ini sudah ada 340 objek motor dan 120 kabel.

## 3. Isi gedung (tinggi lantai)

**Kampus FIK** — tinggi antar lantai 4,0 m. Lantai jadi berada di Y tinggi 0,15 / 4,15 / 8,15.
Selasar terbuka 2 m di sisi depan (Y 0,5…2,5) pada lantai 2 dan 3, tangga utama di sisi barat, ruangan di Y 2,5…14,5.
- **Lt 1:** lobi dan resepsionis, tata usaha, kantin kecil, toilet.
- **Lt 2:** Kelas 2A, Kelas 2B, Lab Komputer (isi lab lama dipindah ke sini).
- **Lt 3:** Lab Jaringan/Server, ruang dosen, ruang rapat/perpustakaan mini.

**Sekolah** — tinggi antar lantai 3,6 m. Lantai jadi berada di Y tinggi 0,15 / 3,75 / 7,35.
Selasar menghadap lapangan (Y 16…18), dan setiap sayap punya 3 kelas per lantai.
- **SD:** kelas warna cerah, UKS, ruang guru SD.
- **SMA:** kelas, lab IPA, lab komputer, perpustakaan, ruang guru SMA.

## 4. Tabel spot final (Three.js `[x, y, z]`)

Disalin dari `engine/sets/KampungSet.tsx` (sumber kebenaran). Semua spot sudah dicek dengan raycast di Blender:
tinggi lantai cocok dalam 6 cm dan tidak ada geometri dalam radius 0,25 m dari badan karakter.
`kampusLab` sekarang menunjuk ke Lab Komputer lantai 2. Spot lama yang dikoreksi saat audit:
`kostTerrace`, `areaPedagang`, `gerobakNasgor`, `posRonda` (sebelumnya menabrak benda), `posSatpam`, `sekolahGerbang` (sebelumnya tenggelam).

| Spot | Koordinat |
|---|---|
| `streetCenter` | `[0.0, 0, 6.5]` |
| `gapuraEntrance` | `[-17.5, 0, 6.5]` |
| `kostTerrace` | `[-12.43, 0.13, 2.65]` |
| `kostDoor01` | `[-14.85, 0.14, 2.55]` |
| `kostDoor02` | `[-11.05, 0.14, 2.55]` |
| `kostGate` | `[-12.2, 0, 4.05]` |
| `kostBalcony2` | `[-12.2, 3.48, 2.72]` |
| `kostDesk` | `[-12.2, 0, -0.3]` |
| `warkopFront` | `[-1.2, 0, 1.35]` |
| `warkopCounter` | `[0.85, 0, 0.35]` |
| `warkopCanopyLeft` | `[-2.14, 2.8, -0.3]` |
| `warkopCanopyRight` | `[2.14, 2.8, -0.3]` |
| `kampusPlaza` | `[12.6, 0, 3.2]` |
| `kampusLab` | `[19.4, 4.15, -9.0]` |
| `kampusLobby` | `[12.75, 0.15, -5.0]` |
| `kampusKelas2A` | `[12.75, 4.15, -6.8]` |
| `kampusLab2` | `[19.4, 4.15, -9.0]` |
| `kampusLab3` | `[19.4, 8.15, -8.5]` |
| `kampusRuangDosen` | `[12.75, 8.15, -5.0]` |
| `kampusSelasar2` | `[14.5, 4.15, -1.5]` |
| `kampusSelasar3` | `[14.5, 8.15, -1.5]` |
| `atmMinimarket` | `[-28.15, 0, 3.2]` |
| `areaPedagang` | `[-11.46, 0.04, 16.34]` |
| `gerobakNasgor` | `[-13.16, 0.04, 18.34]` |
| `bakmieTioVendor` | `[-13.02, 0.04, 18.38]` |
| `bakmieTioCustomer` | `[-12.55, 0.04, 16.65]` |
| `esBuahYuniVendor` | `[-9.62, 0.04, 18.38]` |
| `esBuahYuniCustomer` | `[-10.95, 0.04, 16.65]` |
| `parkirMotor` | `[12.9, 0, 15.0]` |
| `posRonda` | `[-12.98, 0, 10.82]` |
| `pakUjangPatrol` | `[-10.85, 0, 11.4]` |
| `lapanganBasket` | `[0.0, 0, 15.6]` |
| `halteKampus` | `[19.8, 0, 3.3]` |
| `posSatpam` | `[19.5, 0.08, 0.2]` |
| `sekolahGerbang` | `[109.0, 0.1, 2.5]` |
| `lapanganUpacara` | `[109.0, 0.05, -7.0]` |
| `sdKelas1` | `[95.25, 0.15, -25.2]` |
| `smaKelas1` | `[111.9, 0.15, -25.2]` |
| `smaLabIpa` | `[117.3, 3.75, -26.0]` |
| `kantinSekolah` | `[94.2, 0.1, -29.6]` |
| `pertigaanPendidikan` | `[86.8, 0, 6.5]` |
| `jalanKampung2` | `[0.0, 0, -17.5]` |
| `jembatanKali` | `[-98.5, 0, -17.5]` |
| `gangGapura` | `[-18.15, 0.03, -8.0]` |
| `gangTimur` | `[25.5, 0.03, -8.0]` |
| `bengkelMotor` | `[-91.0, 0.1, 3.0]` |
| `warungKelontong` | `[-92.0, 0.1, 10.4]` |
| `rumahWargaBarat` | `[-118.0, 0.1, 2.8]` |
| `musalaTaman` | `[-113.3, 0.08, -23.0]` |

`streetLampPositions` di `KampungSet.tsx` (sekarang 6 titik di X −30…20) diganti dengan lampu jalan setiap 10 m
di sepanjang X −130…130 sisi utara jalan utama, ditambah lampu di Jl. Kampung 2, Jl. Pendidikan, dan kedua gang.

## 5. Masalah yang ditemukan di file sekarang (diperbaiki sekalian)
- `HouseRow1_10` (X 21,3…26,7) menimpa `KG_AlleyRoad_East` (X 23,4…27,6). Rumah ini ikut dibongkar untuk gedung kampus.
- `SideBuildingW2` dan `SideBuildingE2` (Y −15,4…−2,8) memotong badan jalan utama (Y −9,1…−3,9). Gedungnya akan digeser ke selatan jalan.
- Ada gedung latar low-poly bernama `GedungFakultasTI` di distrik kampus (Y 37…46). Gedung ini diganti nama menjadi `GedungPascasarjana` supaya tidak tertukar dengan gedung kampus baru.

## 6. Anggaran performa
- Sekarang: `kampung.glb` 22 MB, sekitar 314 ribu face, 42 gambar tekstur.
- Target v2: ≤ 35 MB dan ≤ 550 ribu face, dicapai dengan:
  - instancing untuk benda berulang,
  - LOD rendah untuk gedung latar,
  - tekstur 1K–2K dengan kompresi JPEG/WebP,
  - interior hanya dimodelkan untuk ruangan yang punya spot.
- Kalau target terlampaui, `kampung.glb` dipecah per zona (`kampung_core`, `kampung_barat`, `kampung_pendidikan`) dan dimuat bersama oleh `KampungSet`.
