# Naskah EP02 — "Konsultan Oyen" (FINAL MASTER v6.1 — Gate G4 LULUS)

- **Format:** 9:16 · 1080×1920 · 30 fps · **74,33 detik / 2230 frame** (cut loop `f2215`), natural `1.0x`, tanpa `atempo`
- **Total kata:** **100 kata** (Bang Utoh 63 kata / 9 baris, Bu Siti 17 kata / 3 baris, Mbak Rara 20 kata / 3 baris) + 1 meong asli Si Oyen
- **Suara:** 15 rekaman final pengguna (`voice/utoh_01–09`, `buSiti_01–03`, `rara_01–03`) + `assets/voices/oyen.wav`. Nol placeholder.
- **Status:** **FINAL MASTER v6.1 — Gate G4 LULUS** (15 VO final terkunci, sinematika referensi *Move → Settle* `creepRate: 0`, `roll: 0`, nol clipping 3D).
- **Aturan visual:** **ZERO kotak HUD/banner 2D.** Satu-satunya teks 2D: subtitle + label pembicara di zona bawah (`y ≈ 1485 px`), transisi *cross-dissolve* / flash replay, dan tint sepia replay.
- Sumber kebenaran waktu: `voice/timeline.json` (kata, napas, tawa, jeda) dan `voice/rms.json` (amplitudo per frame).

Tanda `[ ... ]` adalah momen non-verbal yang ada di rekaman dan diberi timestamp. Teks tanpa tanda kurung adalah
kata yang diucapkan (dipakai ASR dan subtitle).

---

## Tabel Beat FINAL MASTER v6.1 (7 Beat · Sebab → Akibat · Seamless Loop)

| Beat & Lokasi | Waktu (frame / dtk) | Dialog final (rekaman) | Aksi & akting inti |
|---|---|---|---|
| **B1 · Hook Sambung EP01**<br>*(Warkop, 06:45)* | `f0–f172`<br>0,00–5,73 | **U1 Utoh:** "Error 47 semalem... *[helaan napas berat]* WiFi kos mati, ngungsi ke warkop." | Macro layar laptop 3D `ERROR 47 BARIS` + taskbar `06:45` → stage Warkop (parallax truck). Di helaan napas (`f69–f86`) bahu Utoh melorot `lean 2 → 8` selama 12f, kedip lelah, keringat dingin. |
| **B2 · Deadline & Kopi ke-4**<br>*(Warkop, 06:45)* | `f172–f444`<br>5,73–14,80 | **U2 Utoh:** "*[helaan napas panik]* Jam tujuh demo, Bu! Satu error nggak ketemu!"<br>**S1 Bu Siti:** "*[kekehan halus]* Gelas keempat, Tong. *[hirupan panjang aroma kopi]* Ngopi dulu." | Bu Siti antar gelas ke-4 (planted). Kekeh (`f307–f334`) = senyum hangat; hirupan (`f371–f401`) = gelas naik ke hidung, mata terpejam, `lean -3`, uap kopi 3D memuncak; "Ngopi dulu." = gelas diletakkan mantap, deadpan. |
| **B3 · Solusi Salah #1: TV Tabung**<br>*(Warkop)* | `f444–f751`<br>14,80–25,03 | *(jeda aksi: 4f wind-up → 6f hold → 1f **PLAK!** → 8f follow-through)*<br>**S2 Bu Siti:** "*[tawa kaget kecil]* Lho, nambah? *[jeda heran]* Biasanya TV Ibu digeplak bener."<br>**U3 Utoh:** "*[kekehan frustrasi]* Bu, ini laptop, bukan TV tabung!" | PLAK + tension roll (1) → 3 bohlam berayun `bulbSwingAt()`, layar `47 → 48 (+1!)`. Bu Siti memiringkan kepala menatap tangannya sendiri. Utoh: senyum getir di kekeh (`f619–f649`) → meledak `angry` + tunjuk laptop di "bukan TV tabung!". |
| **B4 · Solusi Ajaib #2: Konsultan Oyen**<br>*(Warkop, 06:45 → 06:58)* | `f751–f1175`<br>25,03–39,17 | **U4 Utoh:** "*[desahan pasrah panjang]* Udahlah, nyerah... nggak bakal kelar."<br>*(jeda aksi 1,95 dtk: Oyen jalan planted → `threeQuarter` → cakar kiri 5f → deadpan 3f → cakar kanan 5f → duduk → **TING!** `✓ 0 ERROR`)*<br>**U5 Utoh:** "Hah?! Nol error?! *[tawa kaget bahagia]* Yen... lo benerin?!"<br>**S3 Bu Siti:** "Jasa konsultan... *[kekehan santai]* ikan asin dua." | Utoh meluncur `sit → squat` sepanjang desahan (`f757–f777`). U5: `shock` + hatPop + lompat → di tawa (`f991–f1010`) `laugh` + sparkle menoleh ke Oyen. S3: Bu Siti `smug`, tangan di pinggang, melirik Oyen. Akhir beat taskbar `06:58` + alarm. |
| **B5 · Kejar Waktu ke Lab FIK**<br>*(Kampung Siang, 06:58)* | `f1175–f1306`<br>39,17–43,53 | **U6 Utoh:** "Waduh, jam tujuh kurang dua! Ayo Yen, ikut!" | Match-cut macro `ALARM 06:58` → Utoh kaget. Satu gerakan crane-down-to-dolly tanpa berhenti. Utoh sprint duluan (`threeQuarter` lalu `side` saat kurva belok ke +X), menoleh di "Ayo Yen, ikut!"; Oyen duduk 12f menatap, lalu jalan santai ½ tempo. `skid` di plaza FIK. |
| **B6 · Klimaks Demo Lab FIK**<br>*(Lab Komputer FIK)* | `f1306–f1733`<br>43,53–57,77 | **U7 Utoh:** "Mbak Rara! Kelar seratus persen! *[tawa sombong]* Nol error!"<br>**R1 Rara:** "Oke... *[helaan napas datar dingin]* Jalanin."<br>*(jeda aksi 2,15 dtk: 4f angkat jari → 6f hold → 1f **Enter KLAK!** → proyektor `1  mmmmmmmmmmmeeeeeeeeeeeeeee|` kursor berkedip + jangkrik)*<br>**R2 Rara:** "*[desahan lelah]* Emang nol error, To. Kodenya juga... *[jeda tajam]* nol. *[kekehan sinis]*" | U7: busung dada `lean -5`, silang tangan, `laugh → smug` di tawa (`f1397–f1416`), sparkle di "Nol error!". R1: kedip lambat + menunduk di helaan napas (`f1487–f1501`), tunjuk dingin di "Jalanin.". Tension roll (2) ke KLAK. R2: menatap proyektor di desahan, menoleh tajam di jeda (`f1686–f1700`, **punch-in +18%**), `tired → smug` di kekeh sinis (`f1714–f1729`). |
| **B7 · Replay Bukti + Double Punchline + Loop**<br>*(Lab FIK + Replay Sepia Warkop)* | `f1733–f2215` (+15f loop tail ke `f2230`)<br>57,77–73,83 | **U8 Utoh:** "Yen! Di warkop lo apain laptop gue?!"<br>*(jeda aksi 2,25 dtk: 4f white flash → Replay Sepia: `CTRL+A` → `DELETE` → `mmmmmmmeeeeee` → `✓ 0 ERROR` → 4f white flash)*<br>**O1 Oyen:** "Meong."<br>**R3 Rara:** "Nilai A buat konsultan kamu. *[desahan penutup]* Kamu minggu depan ngulang dari awal."<br>**U9 Utoh:** "Aduh Oyen! Gara-gara error 47 lagi dong... *[helaan napas pasrah akhir]*" | Eye-line match ke Oyen kedip 14f → "Meong.". R3 Shot A: two-shot Rara + Oyen, coret buku nilai, Oyen kibas ekor; desahan (`f1981–f1998`) = tutup buku → Shot B tight Rara ke Utoh. U9: `shock` + hatPop + tension roll (3) → bahu jatuh di helaan napas (`f2187–f2197`) → hard-cut loop ke `f0`. |

---

## Durasi & Lima Pilar Studio v2.0
- **Durasi:** 74,33 dtk (masuk rentang fleksibel Short 55–75 dtk karena rekaman final memuat 17 momen akting non-verbal napas/tawa, total ±9 dtk, dipakai utuh pada `1.0x`).
- **5 Pilar:** Zero-Clipping & Spatial Safety (nol teleport/skating/clipping), Reference Character Motion (akting tangan kosong + prop diegetik: laptop 3D, gelas kopi + uap, buku nilai, cakar Oyen), Reference Cinema Camera (*Move → Settle* dengan `creepRate: 0` & `roll: 0`), Motivated Light (sinar pagi, 3 bohlam berayun, rim laptop, proyektor), Pure Cinema (ZERO 2D HUD boxes).
- **Umpan EP03:** Oyen dapat nilai A sementara Bang Utoh mengulang.
