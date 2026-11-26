# Naskah EP03 — "Curhat ke Abang Bakmie" (FINAL MASTER v6 — Gate G4 LULUS)

- **Format:** 9:16 · 1080×1920 · 30 fps · **60,0 detik / 1800 frame**, *hard cut loop* di **f1785** → f0
- **Total kata:** **83 kata** (Utoh 42 · Tio 37 · Mbak Yuni 4) + 1 meong asli Si Oyen
- **Kepadatan:** 15 baris pendek (maks. total 36 dtk). Sisa ±24 dtk diisi aksi dan reaksi. Setiap beat punya ≥ 1 gag.
- **Revisi v3 (catatan pengguna):** cerita diganti menjadi **Bang Utoh curhat ke pedagang bakmie ayam (Tio)**.
  Premis pesanan massal dihapus seluruhnya.
- **Aturan visual:** ZERO kotak HUD/banner 2D. Teks 2D hanya subtitle + label pembicara (y ≈ 1485 px) dan flash putih 4f.
- **Sumber kebenaran waktu (setelah Fase 2):** `voice/timeline.json` + `voice/rms.json`. Frame di bawah boleh bergeser ±10f
  mengikuti VO, **kecuali total 1800f dan loop f1785**.

Tanda `[ … ]` adalah momen non-verbal yang ikut direkam. `{SFX}` adalah efek suara, bukan VO.

---

## Premis v3
Malam setelah EP02 (Oyen dapat nilai A, Utoh harus mengulang dari nol), Bang Utoh datang ke gerobak Bakmie Ayam Tio untuk
**curhat**. Tio menjanjikan "curhat gratis" dan menjawab setiap keluhan dengan **filosofi mie yang terdengar dalam tapi
tidak ada artinya**, yang selalu berakhir dengan tawaran tambahan pangsit. Ternyata Si Oyen, sumber masalah Utoh, sudah duduk
di belakangnya dan diperlakukan Tio sebagai pelanggan tetap. Setelah satu cerita Tio yang tulus (dan tetap lucu), Utoh bangkit
semangat, sampai bon datang: **"CURHAT: 20RB"**. Dompet Utoh kosong, dan yang membayar justru Oyen dengan **ikan asin dua**.
Utoh kalah lagi sama kucing, lalu video loop ke kalimat pembuka.

## Daftar gag (urut kemunculan)
1. Hook: "Bang… gue kalah sama kucing." (B1)
2. "Curhat gratis", tapi bon menagih curhat di akhir (B1 ↔ B6)
3. Filosofi mie tanpa makna: "Kelamaan direbus… lembek." → "Maksudnya apa?" → "Nggak tau. Tambah pangsit?" (B2)
4. Bon diegetik di papan gerobak bertambah setiap tawaran Tio (B2–B6)
5. Oyen muncul di belakang Utoh tanpa disadari, lalu face-to-face slow-blink (B3)
6. Mbak Yuni menyindir sambil menutup gerobak: "Curhat mulu, ngodingnya kapan?" (B3)
7. Tio pilih kasih: Oyen dilayani topping ayam tanpa memesan, dan ditagihkan ke bon Utoh (B4)
8. Cerita tulus Tio dipatahkan sendiri: "Sekarang? …Masih sepi sih." (B5)
9. Dompet Utoh kosong, lalu seekor ngengat terbang keluar (B6)
10. Satu bon dibayar ikan asin dua oleh Oyen; Utoh "kalah lagi sama kucing" → loop (B6)

## Bon diegetik (papan tulis kecil di gerobak, ditulis Tio dengan spidol)
| Muncul | Baris bon | Subtotal |
|---|---|---|
| B1 | `MIE AYAM 15RB` | 15RB |
| B2 | `+ PANGSIT 5RB` | 20RB |
| B4 | `+ AYAM (OYEN) ×3 45RB` | 65RB |
| B5 | `+ ES TEH 5RB` | 70RB |
| B6 | `+ CURHAT 20RB` → **`TOTAL 90RB`** | 90RB |

---

## Tabel beat (6 beat · sebab → akibat · seamless loop)

| Beat & lokasi | Frame / dtk | Dialog | Aksi & akting inti |
|---|---|---|---|
| **B1 · Hook**<br>*(gerobak Tio, malam)* | `f0–f135`<br>0,0–4,5 | **U1 Utoh:** "Bang… gue kalah sama kucing."<br>**T1 Tio:** "*[tetap mengaduk]* Mie ayam satu, curhat gratis." | Utoh menjatuhkan dahi ke meja gerobak {duk}. Tio tidak menoleh, tetap mengaduk dandang yang berasap dalam cahaya bohlam. Di "curhat gratis", Tio menulis `MIE AYAM 15RB` di papan bon tanpa melihat. |
| **B2 · Filosofi mie** | `f135–f540`<br>4,5–18,0 | **U2 Utoh:** "Kucing warkop dapet nilai A. Gue disuruh ngulang dari nol."<br>**T2 Tio:** "Hidup itu kayak mie, To. *[jeda]* Kelamaan direbus… lembek."<br>**U3 Utoh:** "…Maksudnya apa, Bang?"<br>**T3 Tio:** "Nggak tau. Tambah pangsit?" | Tio menyajikan mangkok dengan khidmat; kacamata memantulkan bohlam saat "Hidup itu kayak mie" (lensa berkilau, uap naik). Jeda 0,6 dtk sebelum "lembek" (Tio mengangkat mi dengan sumpit, mi melorot lemas). Utoh menatap kosong. "Nggak tau" diucapkan datar, lalu Tio langsung menulis `+ PANGSIT 5RB`. |
| **B3 · Dia di belakangmu** | `f540–f870`<br>18,0–29,0 | **U4 Utoh:** "Tiap gue ngoding, kucing itu nongol terus!"<br>**T4 Tio:** "*[melirik ke balik bahu Utoh]* Kayak… sekarang?"<br>{Utoh menoleh: KAGET}<br>**Y1 Yuni:** "Curhat mulu, ngodingnya kapan?" | Selama Utoh mengoceh, Oyen pelan naik ke bangku di belakangnya (planted, tempo ½); Utoh tidak sadar. Tio melihat, keringat menetes. Utoh menoleh dan bertemu wajah Oyen tepat di depannya; Oyen slow-blink 14f. Utoh kaget (`strikeEnvelope` 4f wind-up → 6f hold → 1f lompat → 8f follow + kick kamera). Dari gerobak sebelah, Mbak Yuni menutup terpal es buah sambil menyindir tanpa menoleh. |
| **B4 · Pelanggan tetap** | `f870–f1110`<br>29,0–37,0 | **U5 Utoh:** "Bang! Dia nggak pesen!"<br>**T5 Tio:** "Pelanggan tetap." | Tio langsung menaruh piring kecil topping ayam di depan Oyen, lalu kedua, lalu ketiga (setiap piring {ting}). Oyen makan dengan anggun. Tio menulis `+ AYAM (OYEN) ×3 45RB` di **bon Utoh**. Utoh menunjuk papan dengan mulut menganga; Tio tidak menoleh. |
| **B5 · Cerita tulus Tio** | `f1110–f1500`<br>37,0–50,0 | **T6 Tio:** "Gue juga pernah ngulang, To. Gerobak pertama kebakar. *[jeda]* Sekarang? …Masih sepi sih."<br>**U6 Utoh:** "*[tawa kecil]* Oke, Bang. Besok gue mulai dari nol." | Momen hangat: kamera `moveSettle` pelan ke two-shot. Tio bersandar ke gerobak dan menatap bohlam; DOF tipis, uap backlit. Setelah jeda, Tio melirik gerobak sebelah yang tutup dan bangku kosong ("masih sepi sih"), lalu kembali datar. Utoh tertawa, bahu naik, menyeruput mi dengan semangat. Tio menuang es teh tanpa diminta dan menulis `+ ES TEH 5RB`. |
| **B6 · Tagihan + voting + loop** | `f1500–f1785` (+15f ekor loop ke `f1800`)<br>50,0–60,0 | **T7 Tio:** "Totalnya sembilan puluh ribu."<br>**O1 Oyen:** "Meong."<br>**U7 Utoh:** "Bang… gue kalah lagi sama kucing." | Insert papan bon: Tio menulis `+ CURHAT 20RB` → `TOTAL 90RB` (callback "curhat gratis"). Utoh membuka dompet: kosong, seekor ngengat terbang keluar ke arah bohlam. Jeda hening. Oyen mendorong **2 ikan asin** ke atas bon dengan kaki depan, lalu "Meong." Kacamata Tio melorot. Di belakang mereka, papan kecil gerobak `DICARI KARYAWAN` terlihat jelas; Utoh dan Oyen sama-sama meliriknya (umpan voting). Utoh menjatuhkan dahi ke meja: "Bang… gue kalah lagi sama kucing." **Hard cut f1785 → f0** (pose sama dengan B1). |

---

## Peta akting per tokoh
- **Bang Utoh:** lemas dan merajuk (B1–B2), heboh mengoceh (B3), kaget melompat (B3), protes (B4), luluh lalu bersemangat
  (B5), pasrah total (B6). Pose B6 terakhir identik dengan pose B1 agar loop mulus.
- **Tio:** **deadpan bijak palsu**. Hampir tidak pernah menoleh dari dandang. Kacamata berkilau saat "berfilosofi", melorot di
  B6. Satu-satunya momen tulus adalah B5, yang tetap dipatahkan oleh kejujurannya sendiri. Badan besar, napas tenang, kaki
  planted di `bakmieTioVendor`.
- **Si Oyen:** tempo ½, slow-blink 14f (B3), makan anggun (B4), mendorong ikan asin dengan kaki (B6), lalu meong.
- **Mbak Yuni:** satu kemunculan di B3, menutup terpal gerobak es buah dengan `smug`, tanpa menoleh.
- Lip-sync `talkGated` (RMS), kedip 4 frame, reaksi 2f lebih awal (`reactionFrame`).

## Callback ke EP01/EP02
Oyen dapat nilai A · Utoh mengulang dari nol · slow-blink 14f · **ikan asin dua** · Utoh kalah lagi oleh Oyen.

## Hook, retensi, dan loop
- Kalimat pertama sudah memancing rasa penasaran ("kalah sama kucing"), dan janji "curhat gratis" menanam punchline akhir.
- Progres terlihat: bon terus bertambah (15RB → 90RB).
- Loop: "kalah lagi sama kucing" (B6) langsung bersambung ke "kalah sama kucing" (B1), dengan pose yang sama.

## Umpan episode berikutnya (voting komentar)
"Siapa yang harus kerja di gerobak Tio buat bayar bon? **UTOH** / **OYEN**."
UTOH → "Karyawan Baru Bakmie Tio". OYEN → "Oyen Jadi Pelayan".
