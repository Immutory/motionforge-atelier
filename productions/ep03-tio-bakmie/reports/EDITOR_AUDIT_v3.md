# EP03 "Curhat ke Abang Bakmie" — Audit Editor v3 (qa-inspector, independen)

Master: `out/ep03-tio-bakmie/ep03-tio-bakmie_final.mp4` (1080x1920, 30 fps, 1800 f).
Batasan pengguna dipatuhi: tidak ada usulan perubahan kamera (`shots.ts`) atau kursi/posisi duduk.

## Lapis 1 — Otomatis
- `npm run check`: EXIT 0. Node test 132/132 pass (termasuk 5 audit `spatial.ts`), Python 9/9 OK.
- `qa_check.py`: black_frames [] · freeze_spans [] · LUFS -15.2 · true peak -1.5 dBFS · **LULUS**.
- Seam loop (rata-rata selisih absolut luma, frame 270x480): f1784→f1785 1.4 · f1785 vs f0 3.8 · **f1799→f0 9.4** (normal antarframe 1–2).

## Lapis 2 — Visual
Diekstrak seluruh 1800 frame (270x480), contact sheet tiap 15 f + batas 21 shot + frame aksi kunci
(f134, 640–712, 765–810, 940–960, 995–1085, 1403–1415, 1536–1664, 1780–1799/0–5), plus close-up 540x960.

Lolos: lip-sync RMS hidup (U2 f207–234, U6 f1352–1388), kedip, Tio selalu memegang sodet (tidak ada mangkok di tangan),
nota bon tulisan tangan terbaca dan konsisten (15rb → 5rb → Ayam (Oyen) x3 45rb → Es teh 5rb → Curhat 20rb → Total 90),
piring 1–3 posisinya konsisten antarshot, tidak ada HUD 2D, tidak ada frame hitam/beku.

## Skor
Warna 7 · Cahaya 6 · Ink 7 · Tekstur 6 · Karakter 5 · Kedalaman 6 · Komposisi 4

## Daftar revisi (paling parah dulu)
- **R-1** Subtitle + label menutupi wajah. Lokasi: b2-rev-utoh f200–317 dan b2-rev-blank f492–544 (di mulut/dagu Utoh), b4-side-protest f948–994 (di mata–mulut Oyen), b6-oyen-meong f1614–1640 (di mulut Oyen), b3-side-rant f707–716 dan b5-rev-utoh f1352–1436 (menyentuh dagu Oyen). Penyebab: `Production.tsx:55` `SUB_TOP_PX = 1485` tetap untuk semua shot. Pemilik: post-compositor. Perbaikan: buat offset subtitle per shot sehingga baris turun ke y≈1720–1780 di shot-shot ini.
- **R-2** Wajah Tio tertutup saat ia bicara. Lokasi: b2-west-board f545–629 ("Nggak tau. Tambah pangsit?"); karton DICARI KARYAWAN menutupi wajahnya, hanya rambut dan kacamata yang mengintip. Penyebab: `set.tsx:54` `sign: [-13.56, 1.3, 17.25]`. Pemilik: set-designer. Perbaikan: geser/turunkan karton ke sisi luar papan bon supaya tidak berada di garis wajah Tio.
- **R-3** Tio "tenggelam" di balik dandang (pelanggaran `checkCounterVisibility`). Lokasi: b3-faceoff f766–821, b3-faceoff-react f905–939, b6-oyen-meong f1610–1659; hanya mata/kacamata di atas bibir panci, jadi gag kacamata melorot di f1618 tidak terbaca. Pemilik: set-designer. Perbaikan: geser dandang ±0.25 m ke samping atau perpendek tingginya.
- **R-4** Oyen melompat menyilang di depan dada Utoh. Lokasi: b3-side-rant f699–706; Oyen terlihat dari belakang melayang di torso Utoh, lalu muncul di kursi depan. Penyebab: `cast.ts:189-193` busur 0.22 m dari `oyenHopFrom` ke `oyenSeat`. Pemilik: character-animator. Perbaikan: busur ≤0.08 m dan naik dari sisi kursi (di bawah garis lutut).
- **R-5** Pose/view meloncat di sekitar cut.
  - f940: pose lama + fx "?" tampil 1 frame (`cast.ts:166/268`, batas U5−6 vs awal shot U5−7).
  - f948: Oyen snap dari back ke side (`cast.ts:203`).
  - ~f1647: Oyen snap dari depan ke belakang di tengah shot (`cast.ts:204`).
  - **f1660–1664**: Utoh tampak back view selama 5 f sebelum pose slump (`cast.ts:172`, batas 1665 vs shot 1660).

  Pemilik: character-animator. Perbaikan: samakan ambang dengan `from` shot dan beri ease putar 6–8 f.
- **R-6** Seam loop f1799→f0 menyentak (selisih 9.4). Penyebab: `Production.tsx:46` ekor memutar f0–14 lalu kembali ke f0. Pemilik: post-compositor (+character-animator untuk napas). Perbaikan: render ekor secara kontinu dan pakai periode napas yang membagi habis 1800 (mis. 90 f) supaya f1800 ≡ f0.
- **R-7** Uap dan gagang sodet melintang di wajah Tio di semua shot Tio (f120–317, 318–491, 716–765, 1080–1327); dahi dan mata tertutup selubung putih susu. Penyebab: `set.tsx:450` uap di x −13.01 (Tio di −13.05); stir `cast.ts:314`. Pemilik: set-designer / character-animator. Perbaikan: geser uap +0.2 m x atau turunkan alfanya, dan beri offset tangan sodet +20 px menjauhi wajah.
- **R-8** Prop muncul tanpa aksi. Piring di f997/1009/1044 muncul begitu saja tanpa tangan, dan Oyen tidak ada di insert. Ikan asin di f1592–1600 meluncur sendiri ke atas ayam di piring (bukan ke nota) tanpa kaki Oyen. Pemilik: set-designer / character-animator. Perbaikan: piring meluncur masuk 4 f dari kiri; tambahkan prop kaki Oyen dari tepi kiri yang mendorong ikan ke samping piring.
- **R-9** Gag dompet & ngengat tidak terbaca. Lokasi: b6-wallet f1538–1585; dompet kecil setinggi telinga di tepi kanan dan terpotong; ngengat tidak terlihat di frame sampel mana pun. Penyebab: `cast.ts:285-289` (`hold` + dy −30), `cast.ts:411-418`. Pemilik: character-animator. Perbaikan: dompet terbuka di depan dada tengah, dan ngengat keluar dari dompet melintasi tengah frame dengan skala lebih besar.
- **R-10** Arah tunjuk salah. Lokasi: f645–707 dan f941–994; telunjuk kanan Utoh mengarah ke kanan layar, menjauh dari gerobak dan Oyen ("Dia nggak pesen!"). Penyebab: `cast.ts:265,269`. Pemilik: character-animator. Perbaikan: tunjuk ke Oyen (bawah/kiri layar).

## Catatan (terkunci oleh batasan kamera, tidak dijadikan revisi)
- Telinga/headphone Utoh terpotong di b2-rev-utoh/b2-rev-blank.
- Papan BAKMIE AYAM TIO dan ES BUAH terpotong.
- Lengan Utoh yang terangkat saat kaget (f795–810) keluar frame. Ini bisa dikurangi lewat akting dengan `raise` yang lebih kecil.
