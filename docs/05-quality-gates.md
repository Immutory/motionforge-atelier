# 05. Gate mutu

## G1 Naskah
- Semua fakta punya sumber yang bisa dibuka.
- Jumlah kata menghasilkan 55-70 detik pada 3,7 kata per detik.
- Ada hook, titik patah, penjelasan lewat analogi, dan callback.

## G2 Stills
- Tidak ada karakter atau benda melayang atau menembus benda lain.
- Setiap sumber cahaya bisa disebutkan.
- Aksi dan badge berada di area tengah 60% lebar.
- Skor QA: tidak ada area di bawah 5.
- `npm run check` hijau.

## G3 Motion
- Tidak ada bagian beku lebih dari 12 frame.
- Reaksi visual mendarat 0-3 frame sebelum kata pemicunya.
- Kick ada di kata pukulan, flash 4 frame ada di pergantian realitas.
- Kaki tidak meluncur saat berjalan.

## G4 Master
- `npm run qa` lulus: tanpa frame hitam, tanpa bagian beku, loudness antara -16 dan -13 LUFS, peak di bawah -1 dBFS.
- Ukuran file wajar (tanpa film grain).
- Pengguna menyetujui hasil akhir.

## Jebakan keterbacaan yang harus dicek tiap prop baru
- Ayunan dengan satu tali terbaca seperti orang tergantung. Pakai dua tali.
- Prop terlalu dekat lensa menjadi gumpalan besar terpotong.
- Semak terpotong tepi frame terbaca seperti bola hijau.
- Bendera dengan warna dan simbol tertentu bisa tak sengaja menyerupai bendera negara lain.
- Papan bertulisan yang kena cahaya samping jadi abu-abu. Beri material tanpa pencahayaan.
