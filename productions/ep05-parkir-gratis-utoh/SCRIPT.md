# Naskah EP05 — "PARKIR GRATIS 0 RUPIAH, TAPI KELUARNYA BAYAR 10 RIBU?!" (DRAF GATE G1)

- **Format:** 9:16 · `1080×1920` · `30 fps` · target **`66,0–72,0 dtk`** (`1980`–`2160` frame, `TOTAL_FRAMES % 90 === 0`, *hard-cut loop* `fLoopCut → f0`).
- **Total Kata:** **234 kata** + **1 meong cuek `belang`** (`assets/voices/oyen.wav` pitch-shifted / trim) — target ritme **`3,65 kata/dtk`** → `234 ÷ 3,65 = 64,1 dtk` bicara + `±4,9 dtk` aksi non-verbal & insert = **`69,0 dtk (2070 frame = 23 × 90f)`**.
- **Aritmetika Twist 100% Konsisten:**
  - Target awal (utang EP04 Bakmie Tio): **`120RB`**
  - Korban #1 (`bangUdin`): `3 tapak × 2RB = 6RB`
  - Korban #2 (`raka`): `5 tapak × 2RB = 10RB`
  - Montage terkumpul: **`80RB`** *(kurang `40RB` lagi dari `120RB`)*
  - Denda Resmi Kas RT 04 (`pakBudi`): **`200RB`**
  - Aritmetika akhir papan kapur Ebot: **`120RB + 200RB = 320RB!`**

---

## A. Tiga Opsi Hook Pembuka (0,0–3,0 dtk)

1. **Opsi A (Rekomendasi — Sesuai Brief & Nyambung Loop EP04):**
   - *"Resign dari bakmie! Modal kardus ini, utang seratus dua puluh ribu lunas sejam!"* (13 kata)
   - **Kenapa kuat:** Langsung menyambung hasil voting EP04 (`RESIGN`, utang `120RB`), dibarengi hentakan fisik `PLAK!` menempel kardus `PARKIR GRATIS!` di Frame 0.
2. **Opsi B (Kontras Angka 0 vs 10RB):**
   - *"Parkir nol rupiah, keluarnya bayar sepuluh ribu! Modal kardus, utang bakmie lunas!"* (12 kata)
   - **Kenapa kuat:** Langsung mengunci judul video dalam 2 detik pertama.
3. **Opsi C (Gaya Anak IT Startup):**
   - *"Resign dari Mandor Oyen! Saatnya monetisasi bug parkir minimarket!"* (9 kata)
   - **Kenapa kuat:** Sangat ringkas (< 10 kata), kental identitas mahasiswa TI.

---

## B. Naskah Lengkap 8 Beat (22 Baris Dialog Manusia + 1 Meong Belang)

| Beat & Waktu | ID & Tokoh | Dialog Persis | Ekspresi & Akting (`engine` valid) | Prop Diegetik 3D (`NOINK`) |
|---|---|---|---|---|
| **B1 · Hook Mid-Action + Lateral Pan**<br>`0,0–4,0 dtk` | **`U1` Bang Utoh** (13k) | "Resign dari bakmie! Modal kardus ini, utang seratus dua puluh ribu lunas sejam!" | Frame 0 menempel kardus ke tiang `PLAK!` (`strikeEnvelope` + `KICKS`), ekspresi `smug` → `happy`. Ebot (`neutral`) mengangkat papan kapur. | `KardusParkir3D` (`PARKIR GRATIS!` + kecil `(SYARAT: MUNDUR TANPA KAKI TURUN)`), `PapanKapurTally3D` (`DENDA 2RB / TAPAK`). |
| **B2 · Setup Loophole**<br>`4,0–12,0 dtk` | **`E1` Ebot** (7k)<br>**`U2` Bang Utoh** (21k)<br>**`E2` Ebot** (7k) | **E1:** "Tapi tulisannya gratis, To. Duitnya dari mana?"<br>**U2:** "Baca bawahnya, Bot! Parkir nol rupiah, tapi kalau keluar kaki nyentuh aspal, kena biaya kalibrasi gravitasi dua ribu per tapak!"<br>**E2:** "Oh… pinter banget. Target seratus dua puluh ribu." | Ebot `skeptical` menunjuk kardus → Utoh `smug`/`idea` bergaya presentasi startup (`leftArm: 'point'` ke tulisan kecil) → Ebot `neutral` deadpan menulis `TARGET: 120RB` di papan kapur. | `PapanKapurTally3D` berubah ke `DENDA 2RB / TAPAK` + `TARGET: 120RB`. |
| **B3 · Eskalasi #1: Bang Udin Ojol**<br>`12,0–23,0 dtk` | **`UD1` Bang Udin** (6k)<br>**`E3` Ebot** (8k)<br>**`UD2` Bang Udin** (11k)<br>**`E4` Ebot** (7k)<br>**`UD3` Bang Udin** (7k) | **UD1:** "Sip, parkir gratis! Buruan nih, orderan mepet!"<br>**E3:** "Eits, Bang! Mundur tanpa kaki turun, ya."<br>**UD2:** "Gampang! Gini doang mah—eh, eh, aduh! Kok oleng sih?!"<br>**E4:** "Satu, dua, tiga tapak. Jadi enam ribu."<br>**UD3:** "Ck, ya udah nih! Parkir apaan sih!" | Udin (`nervous` → `smug`) mencoba mundur di atas `MotorUdin3D` → oleng **3× tapak kaki** (`strikeEnvelope` + `KICKS`, ekspresi `strain` → `angry`). Ebot mencatat `3 × 2RB = 6RB`, Udin menyodorkan uang `6RB`. | `MotorUdin3D` (hijau ojol), `PapanKapurTally3D` (`UDIN: 3×2RB = 6RB`), `UangKertas3D`. |
| **B4 · Eskalasi #2: Raka SMA Freestyle**<br>`23,0–35,0 dtk` | **`R1` Raka** (11k)<br>**`R2` Raka** (11k)<br>**`E5` Ebot** (8k)<br>**`R3` Raka** (6k) | **R1:** "Haha, gitu doang jatuh? Liat nih, skill anak sirkuit, Bang!"<br>**R2:** "Tahan… tahan… eh kiri, eh kanan, waduh! Ampun, jatuh lagi!"<br>**E5:** "Lima tapak kali dua ribu… pas sepuluh ribu."<br>**R3:** "Aduh, uang jajan gue melayang…" | Raka (`smug`) pamer gaya di atas `MotorRaka3D` → oleng ekstrem kanan-kiri **5× tapak kaki** (`strikeEnvelope` + `KICKS`, `nervous` → `strain` → `sad`). Ebot menulis cepat `5 × 2RB = 10RB`. | `MotorRaka3D` (merah sporty), `PapanKapurTally3D` (`RAKA: 5×2RB = 10RB`). |
| **B5 · Montage Kemenangan & Tally**<br>`35,0–44,0 dtk` | **`E6` Ebot** (8k)<br>**`U3` Bang Utoh** (13k) | **E6:** "Udah kekumpul delapan puluh ribu nih, To!"<br>**U3:** "Hahaha! Tinggal empat puluh ribu lagi, gue bebas total dari Mandor Oyen!" | `topDownInsert` / makro papan kapur penuh coretan tally **`TERKUMPUL: 80RB!`**. Cut ke Utoh `laugh` berpose bos besar (`rightArm: 'raise'`, `leftArm: 'hip'`). | `PapanKapurTally3D` (`TERKUMPUL: 80RB!`, penuh coretan tally). |
| **B6 · Final Boss Pak Budi & Pematahan Loophole**<br>`44,0–54,5 dtk` | **`U4` Bang Utoh** (8k)<br>**`PB1` Pak Budi** (11k)<br>**`U5` Bang Utoh** (6k) | **U4:** "Eh, Pak RT! Siap-siap catat tapaknya, Bot!"<br>**PB1:** "Kaki saya nggak turun dari motor, To—orang saya nggak naik!"<br>**U5:** "Lho?! Kok didorong jalan kaki, Pak?!" | Pak Budi (`smug`, tenang berwibawa) **turun duluan** dari `MotorPakBudi3D`, lalu berjalan mundur (`gait: 'planted'`, 0 slip) mendorong motornya melewati garis parkir putih! Utoh `shock` (`hatPop: springPop`). | `MotorPakBudi3D` (bebek hitam), garis parkir putih aspal. |
| **B7 · Twist Surat Denda RT & Matematika Akhir**<br>`54,5–64,0 dtk` | **`PB2` Pak Budi** (14k)<br>**`E7` Ebot** (13k)<br>**`U6` Bang Utoh** (7k) | **PB2:** "Aturanmu pinter, To. Tapi ini surat denda pungli fasilitas umum, dua ratus ribu."<br>**E7:** "Utang bakmie seratus dua puluh, tambah denda dua ratus… total tiga ratus dua puluh!"<br>**U6:** "Hah?! Tiga ratus dua puluh ribu?!" | Pak Budi menyodorkan **Surat Resmi Kas RT 04** (`strikeEnvelope` + `KICKS`) → makro frontal 3D surat berstempel merah `Rp 200.000` → Ebot (`neutral` polos) menulis `120RB + 200RB = 320RB!` → Utoh `shock` (`hatPop: springPop`, keringat). | `SuratDendaRT3D` (berkop + stempel merah `Rp 200.000`), `PapanKapurTally3D` (`120RB + 200RB = 320RB!`). |
| **B8 · Button Belang & Seamless Loop**<br>`64,0–69,0 dtk` | **`B1` Belang**<br>**`U7` Bang Utoh** (4k) | **B1:** *[meong cuek]* "Meong."<br>**U7:** "Bot… ambil kardus baru."<br>*[ekor hening 15f tanpa subtitle → hard-cut ke Frame 0]* | Kucing `belang` (`<CatBillboard />`) santai tidur di atas kardus `PARKIR GRATIS` + slow-blink menghadap kamera. Utoh `tired` / `sad` menatap langit pasrah → kembali ke komposisi identik Frame 0 (`fLoopCut → f0`). | `KardusBelang3D` + `KardusParkir3D` utuh di tiang `KG_StreetPole_02`. |

---

## C. Ringkasan Kata per Tokoh (Total = 205 Kata + 1 Meong)
| Tokoh | Baris | Total Kata |
|---|---|---:|
| **Bang Utoh** (`bangUtoh`) | U1–U7 (7 baris) | **72** |
| **Ebot** (`ebot`) | E1–E7 (7 baris) | **58** |
| **Bang Udin** (`bangUdin`) | UD1–UD3 (3 baris) | **24** |
| **Raka** (`raka`) | R1–R3 (3 baris) | **28** |
| **Pak Budi** (`pakBudi`) | PB1–PB2 (2 baris) | **25** |
| **Belang** (`belang`) | B1 (1× meong cuek) | *(SFX meong)* |
| **Total** | **22 baris manusia + 1 meong** | **207 kata** |

*(Pada tempo natural 3,2–3,65 kata/dtk + aksi fisik 3× tapak Udin, 5× tapak Raka, Pak Budi mendorong motor, makro Surat RT 04, & ekor loop 15f → mendarat presisi di **`66,0–72,0 dtk`** = `1980`–`2160` frame!)*
