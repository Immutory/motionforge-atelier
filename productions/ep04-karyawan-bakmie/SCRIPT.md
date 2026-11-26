# Naskah EP04 — "Karyawan Baru Bakmie Tio, Bosnya Si Oyen?!" (FINAL PRODUKSI)

- **Format:** 9:16 · `1080×1920` · `30 fps` · **Durasi Master Aktual `87,00 dtk` (`2610 frame = 29 × 90f`, `loopCutFrame = 2595`, 20/20 VO asli pengguna + 4 meong Oyen)** *(rancangan awal G1: `66,0 dtk = 1980 frame`)*. *Hard cut loop* 15f sebelum akhir → `f0` (pose, cahaya, & kamera 100% identik Beat 1).
- **Total kata:** **225 kata** + **4 meong asli Oyen** (`assets/voices/oyen.wav`) — Bang Utoh 116 · Abang Tio 69 · Mbak Yuni 18 · Pak Ujang 17 (+ 5 kata ekstra? Tepatnya dihitung di tabel Bagian C: **225 kata**).
- **Pacing target (`atelier-story-forge`):** `225 kata ÷ 3,65 kata/dtk = 61,6 dtk` bicara + `±4,4–6,0 dtk` akting non-verbal (`moveSettle` pan, slow-blink 14f, `topDownInsert` PLAK, poster `PLAK!`, `strikeEnvelope`, makro Slip Gaji 120RB, ekor loop 15f) = **`66,0 dtk (1980 frame)`**.
- **Aturan visual:** ZERO 2D HUD. Semua tulisan diegetik 3D (`NOINK`), `DEFAULT_CREEP = 0`, subtitle `label-above` zona `1485–1690 px` (maks 3 kata/baris).

---

## A. Tiga Opsi Kalimat Hook Pembuka (0,0–3,0 dtk)

1. **Opsi A (Rekomendasi — Sesuai Brief & Paling Nendang untuk Loop):**
   - *"Gara-gara bon sembilan puluh ribu… gue resmi jadi tukang bakmie."* (9 kata)
   - **Kenapa kuat:** Langsung menjawab ekor Beat 8 (*"Bang… kok kerja sehari utang gue malah nambah…"* → *"Gara-gara bon sembilan puluh ribu…"*), menyebut angka 90RB sejak detik 0 yang dibayar di punchline 120RB Beat 7.
2. **Opsi B (Kontras Jurusan IT):**
   - *"Mahasiswa IT cicil bon sembilan puluh ribu… jadi tukang bakmie."* (10 kata)
   - **Kenapa kuat:** Langsung menjual kontras identitas anak IT + hoodie/headphone di balik dandang bakmie.
3. **Opsi C (Misteri Bos):**
   - *"Demi lunasin bon sembilan puluh ribu… bos baru gue bikin emosi."* (11 kata)
   - **Kenapa kuat:** Membangun rasa penasaran langsung ke reveal Si Oyen di Beat 2.

---

## B. Tabel 8 Beat Lengkap (Sebab → Akibat · Acuan Motion `(1).mp4`)

| Beat & Waktu | Dialog Persis (ID & Tokoh) | Akting Non-Verbal, Pose, & Ekspresi | Kamera Referensi (`DEFAULT_CREEP = 0`) | Prop Diegetik 3D |
|---|---|---|---|---|
| **B1 · Mid-Action Hook + Pan Kertas**<br>`0,0–4,5 dtk` *(f0–f135)* | **U1 Utoh (9k):** "Gara-gara bon sembilan puluh ribu… *[helaan napas]* gue resmi jadi tukang bakmie." | Frame 0 langsung mengaduk dandang berasap (tangan kiri pegang sodet `SODET_OUT = 20px`, kanan di pinggang `>= 1,04m`), wajah `tired` → `deadpan`, headphone miring, kedip 4f setelah "ribu". | Buka medium Utoh setinggi mata → detik `1,8` **`moveSettle`** menyamping turun lembut menyorot karton depan gerobak & karton atas etalase lalu **settle mantap**. | Karton `KARYAWAN BARU — CICIL BON 90RB`, karton `DICARI` dicoret merah → `SUDAH DAPAT KARYAWAN`, dandang pendek + uap timur. |
| **B2 · Reveal Atasan Shift Malam**<br>`4,5–13,0 dtk` *(f135–f390)* | **U2 Utoh (10k):** "Santai, satu shift kelar, bon semalem langsung lunas kan, Bang?"<br>**T1 Tio (13k):** "Lunas gampang, To. Tapi karyawan baru wajib diawasi mandor. Kenalin atasan shift malam."<br>**O1 Oyen:** *[slow-blink 14f]* "Meong."<br>**U3 Utoh (6k):** "Hah?! Mandor QC-nya… kucing yang semalem?!"<br>**T2 Tio (5k):** "Iya. Karyawan senior, bergaji ayam." | Utoh optimis (`happy`, tangan kanan `'point'` ke Tio di sisi kiri layar? Pakai `leftArm: 'point'` arah `-x` / `HandRig.reach` akurat!). Tio bersedekap deadpan di luar timur gerobak, angkat dagu di "Kenalin". Oyen `smug` di kursi merah + slow-blink 14f. Utoh `shock` + `hatPop: springPop(...)` meluruh ke `0` (reaksi 2f lebih awal). | `moveSettle` two-shot Utoh–Tio → hard cut **`pullOutReveal`** dari makro papan `MANDOR QC` mundur membuka Oyen + piring VIP → hard cut CU Utoh `shock` + `KICKS` → hard cut single Tio deadpan. | Papan meja lipat `MANDOR QC`, piring ayam berbendera `VIP`, kursi plastik merah Oyen (`seatCardPos`). |
| **B3 · Pembeli Pertama (`pakUjang`) + `topDownInsert` Racik Mie**<br>`13,0–25,0 dtk` *(f390–f750)* | **PU1 Pak Ujang (8k):** *[ehem]* "Mas, bakmie ayam biasa siji. Sing cepet, nggih."<br>**U4 Utoh (10k):** "Siap Pak! Request masuk, kita proses algoritma porsi super hemat!"<br>**U5 Utoh (7k):** *[gumam]* "Optimasi resource… suwiran ayam cukup segini aja."<br>**O2 Oyen:** *[`pawRaise` `PLAK!`]* "Meong!"<br>**T3 Tio (14k):** "Bener kata Mandor, itu kurang. Tambahin ayamnya—potong dari cicilan bon lo ya, To."<br>**U6 Utoh (6k):** "Lho?! Kok malah potong bon gue?!" | Pak Ujang berjalan masuk (`gait: 'planted'`, 0 slip, `walkPhase` kontinu) & duduk di kursi kayu (`sitHeight: 0,46`, `seatCardPos`). Utoh sok sigap lalu pelit menaruh suwiran ayam tipis. Di flat-lay: cakar Oyen (`pawRaise`) mengetuk meja **`PLAK!`** (`strikeEnvelope` + `KICKS`). Tio deadpan menerjemahkan; Utoh `shock` + `springPop`. | Wide eye-level `moveSettle` mengikuti Pak Ujang duduk → OTS Pak Ujang ke Utoh → **hard cut `topDownInsert` (90° flat-lay tepat di atas serve ledge)** racik mie & cakar Oyen `PLAK!` → hard cut Tio → hard cut CU Utoh `shock` + `KICKS`. | Mangkok mie Pak Ujang (`EP04_BowlUjang`), suwiran ayam (2 → 4 potong), capit/sodet, papan `MANDOR QC`. |
| **B4 · Komentar Pedas (`mbakYuni`) & Promosi Kilat**<br>`25,0–36,5 dtk` *(f750–f1095)* | **Y1 Mbak Yuni (11k):** *[kekeh]* "Waduh, mahasiswa IT jauh-jauh kuliah, ujung-ujungnya disuruh-suruh kucing makan ayam, To?"<br>**U7 Utoh (14k):** "Bang, nggak adil! Dia dari tadi cuma duduk makan ayam, gue yang kerja keras!"<br>**O3 Oyen:** *[datar]* "Meong."<br>**T4 Tio (12k):** "Denger tuh, jiwa pemimpinnya kuat. Langsung aja—selamat, Mandor, karyawan terbaik bulan ini!"<br>**Y2 Mbak Yuni (7k):** "Baru sejam kerja, udah kalah pangkat, To." | Yuni menyindir santai di balik gerobak es buah (tangan di atas konter `>= 1,04m`). Eskalasi ekspresi Utoh bertahap: `skeptical` → `nervous` → `angry` menunjuk tepat ke arah Oyen di layar (`leftArm: 'point'`). Oyen datar jilat cakar `"Meong."`. Tio terharu lalu menempel poster **`KARYAWAN TERBAIK BULAN INI`** (`PLAK!` + `springPop`). | Hard cut single Yuni (`moveSettle` pendek) → medium Utoh marah → CU Oyen datar → single Tio → insert makro poster ditempel ke kaca etalase (`PLAK!` + `KICKS`) → **`orbitArc` pendek** (`≤ 12°`, bebas tiang & etalase) ke Utoh `tired` saat Y2. | Poster `KARYAWAN TERBAIK BULAN INI` + sketsa crayon wajah Oyen di kaca etalase, gerobak Es Buah Yuni. |
| **B5 · Kerja Keras & `strikeEnvelope` Multithreading**<br>`36,5–47,5 dtk` *(f1095–f1425)* | **T5 Tio (6k):** "Tiga pesanan masuk barengan nih, To."<br>**U8 Utoh (11k):** "Oke, cukup! Saatnya aktifin mode multithreading biar utang kelar malam ini!"<br>**U9 Utoh (11k):** "Rebus mie, tambah ayam, tuang kuah… deploy! Deploy! Deploy mangkok terakhir!"<br>**T6 Tio (8k):** "Mantap, tim rapi. Mandor resmi naik jadi Kepala." | Utoh panas hati, mondar-mandir gesit (`planted` lateral step di atas `EP04_Pallet`), wajah `focus` → `strain` berkeringat. Puncak 3× `"deploy!"` memakai **`strikeEnvelope` (4f wind-up → 6f hold → 1f strike + `KICKS` → 8f follow)** menyajikan 3 mangkok beruntun ke ledge! Di foreground kanan, Tio membalik papan `MANDOR QC` → **`KEPALA MANDOR`**. | Single Tio → medium Utoh fokus → 3× hard cut ritmis makin dekat (`POSE_DEPLOY_1/2/3`) + `KICKS` di tiap strike → medium panggung memperlihatkan 3 mangkok penuh & Tio membalik papan `KEPALA MANDOR`. | 3 mangkok mie penuh (`EP04_DeployBowls`), papan 2-sisi berputar menjadi `KEPALA MANDOR`. |
| **B6 · Ketenangan Semu Sebelum Badai**<br>`47,5–53,5 dtk` *(f1425–f1605)* | **PU2 Pak Ujang (9k):** "Wah, mantep tenan, Mas! Ini uangnya, matur nuwun, nggih."<br>**U10 Utoh (14k):** *[napas lega]* "Semua pesanan beres, pelanggan puas. Utang sembilan puluh ribu gue lunas dong, Bang?" | Pak Ujang `happy`, menaruh uang di ledge, berdiri dan berjalan keluar (`gait: 'planted'`, 0 slip, `z <= 15,65`) hingga bersih keluar frame. Utoh menghela napas lega (`[napas]`, `happy` bangga), melepas lelah sejenak dan menagih lunas ke Tio. | Wide eye-level mengikuti Pak Ujang bayar & keluar → medium Utoh lega menoleh penuh harap ke Tio (`DEFAULT_CREEP = 0`). | Uang kertas Pak Ujang (`EP04_Cash`) di serve ledge, kursi kayu kembali kosong seperti Frame 0. |
| **B7 · Punchline Slip Gaji Diegetik 3D**<br>`53,5–62,0 dtk` *(f1605–f1860)* | **T7 Tio (7k):** "Ini slip gaji shift pertamamu. Cek dulu."<br>*[hening ±1,6 dtk — baca nota]*<br>**U11 Utoh (10k):** "Hah?! Kerja semalaman, kok utang gue malah naik seratus duapuluh?!"<br>**T8 Tio (9k):** "Upah tiga puluh, dikurangi ayam VIP plus biaya training."<br>**O4 Oyen:** *[puas]* "Meong." | Tio melangkah tenang (`planted` 1 langkah) menyodorkan/menempel **`SLIP GAJI — SHIFT 1`**. Utoh membeku `shock` (`hatPop: springPop(...)`, keringat, 24f tanpa kedip). Tio deadpan merinci potongan. Oyen menatap kamera sambil menjilat cakar / `"Meong."` puas. | Two-shot `moveSettle` serah nota → **Shot Makro Frontal 3D (`NOINK`)** `SLIP GAJI — SHIFT 1` penuh terbaca → hard cut CU Utoh `shock` + `KICKS` → single Tio deadpan → CU Oyen puas. | Nota 3D `SLIP GAJI — SHIFT 1` (5 baris rincian + **`SISA UTANG BARU : 120rb`** dilingkari spidol merah + cap cakar oranye Oyen). |
| **B8 · Callback & Seamless Hard-Cut Loop**<br>`62,0–66,0 dtk` *(f1860–f1980)* | **U12 Utoh (8k):** "Bang… kok kerja sehari utang gue malah nambah…"<br>*[ekor hening 15f tanpa subtitle → hard cut `f1965 → f0`]* | Kamera, cahaya, dandang, dan posisi Bang Utoh kembali **100% identik secara matematis** dengan Frame 0 (`tired`/`deadpan` mengaduk dandang, `blink` terkunci di 8f terakhir). Subtitle mati di `[1965, 1980)`. | Hard cut kembali ke **pose & kamera Frame 0 persis** (`sampleCamera(CAMS, 1979) === sampleCamera(CAMS, 0)`), hold mantap (`DEFAULT_CREEP = 0`). | Karton `KARYAWAN BARU — CICIL BON 90RB` utuh, kursi kayu kosong seperti Frame 0. |

---

## C. Ringkasan Kata, Non-Verbal, & Estimasi Durasi

### C.1 Rincian Kata per Tokoh (Total = 225 Kata + 4 Meong Oyen)
| Tokoh | Baris | Total Kata |
|---|---|---:|
| **Bang Utoh** (`bangUtoh`) | U1–U12 (12 baris) | **116** |
| **Abang Tio** (`tio`) | T1–T8 (8 baris) | **74** |
| **Mbak Yuni** (`mbakYuni`) | Y1–Y2 (2 baris) | **18** |
| **Pak Ujang** (`pakUjang`) | PU1–PU2 (2 baris) | **17** |
| **Si Oyen** (`oyen`) | O1–O4 (4× `assets/voices/oyen.wav`) | *(SFX meong)* |
| **Total** | **24 baris manusia + 4 meong** | **225 kata** |

### C.2 Estimasi Durasi per Beat (Target `66,0 dtk = 1980 frame` @ `3,65 kata/dtk`)
| Beat | Kata | Bicara (`÷ 3,65`) | Akting Non-Verbal / Insert | Total | Rentang |
|---|---:|---:|---:|---:|---|
| B1 Mid-Action Hook + Pan | 9 | 2,5 dtk | 2,0 dtk (pan karton + napas) | **4,5 dtk** | `0,0–4,5` |
| B2 Reveal Mandor QC | 34 | 9,3 dtk? *(tepatnya 34 ÷ 3,65 = 9,3 dtk → rapatkan jeda jadi ~8,5 dtk)* | 1,2 dtk (slow-blink + O1) | **8,5–10,0 dtk** | `4,5–13,5` |
| B3 Pak Ujang + `topDownInsert` | 45 | 12,3 dtk | 1,2 dtk (`PLAK!` cakar + O2) | **12,0–13,5 dtk** | `13,5–26,0` |
| B4 Yuni + Poster Terbaik | 44 | 12,0 dtk | 1,0 dtk (O3 + poster `PLAK!`) | **11,5–13,0 dtk** | `26,0–37,5` |
| B5 Multithreading + `strikeEnvelope` | 36 | 9,9 dtk | 1,1 dtk (3× strike + flip papan) | **11,0 dtk** | `37,5–48,5` |
| B6 Ketenangan Semu | 23 | 6,3 dtk | 0,7 dtk (napas lega + keluar) | **6,0–7,0 dtk** | `48,5–54,5` |
| B7 Slip Gaji 120RB | 26 | 7,1 dtk | 2,0 dtk (makro nota + O4) | **8,5–9,0 dtk** | `54,5–63,0` |
| B8 Callback & Loop | 8 | 2,2 dtk | 1,3 dtk (settle + 15f ekor loop) | **3,5–4,0 dtk** | `63,0–66,0` |
| **Total** | **225** | **61,6 dtk** | **±4,4–6,4 dtk** | **≈66,0 dtk (`1980 f`)** | **`64–68 dtk`** |

### C.3 Isi Nota 3D `SLIP GAJI — SHIFT 1` (Beat 7, `NOINK` Diegetik)
```text
SLIP GAJI — SHIFT 1
Karyawan : Utoh
1. Upah Shift Malam       : +30rb
2. Ayam VIP Mandor x3     : -45rb
3. Biaya Training Mandor  : -15rb
4. Utang Lama (EP03)      : -90rb
---------------------------------
SISA UTANG BARU           : 120rb  (dilingkari spidol merah tebal)
ACC Mandor : [Cap Cakar Oranye Si Oyen]
```
*(Aritmetika konsisten 100%: `+30 - 45 - 15 - 90 = -120` → **Sisa Utang Baru Rp 120.000**).*

### C.4 Catatan Penting Sumber Suara & Tempo untuk Fase 2 (`voice-director`)
- Pada kecepatan percakapan sigap **3,5–3,8 kata/dtk** (TTS Lokal `Chatterbox-TTS-Indonesian` atau rekaman bertempo cepat), **225 kata** mendarat presisi di **64–68 detik (`1980 frame`)**.
- **Perhatian dari pengalaman EP03 & EP04 sebelumnya:** bila seluruh 24 baris direkam manual dengan tempo santai (~2,1–2,4 kata/dtk), durasi akan melebar ke ~100–115 dtk. Karena itu, di **Gate G1** mohon pilih sumber suara untuk Fase 2:
  1. **TTS Lokal Studio (Semua 4 tokoh manusia via `Chatterbox-TTS-Indonesian` + `assets/voices/oyen.wav`)** — langsung jadi & terkunci presisi **66,0 dtk (`1980f`)**.
  2. **Hybrid** (`bangUtoh` rekaman pengguna bertempo sigap + `tio`/`pakUjang`/`mbakYuni` TTS lokal + `oyen.wav`).
  3. **Full Rekaman Pengguna** (rekam ulang 24 baris bertempo cepat ~3,6 kata/dtk, minim jeda panjang).
