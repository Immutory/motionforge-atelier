# 01. Gambaran umum

MotionForge Atelier adalah template produksi video pendek vertikal. Idenya sederhana:
dunia 3D dibuat dari kode, tokoh 2D digambar di kanvas lalu ditempel sebagai kartu yang menghadap kamera,
dan kamera bergerak seperti film sungguhan.

## Kenapa pendekatan ini
- **Ringan.** Tidak ada file model 3D besar. Semua set, tekstur, dan efek lahir dari kode.
- **Bisa diulang.** Satu folder per produksi, satu perintah untuk membuat yang baru.
- **Terbagi jelas.** Tiap agent punya file sendiri, jadi perubahan tidak saling menimpa.
- **Terjaga mutunya.** Empat gate memaksa persetujuan sebelum tahap mahal dimulai.

## Empat Pilar visual
1. **Grounded**: tidak ada yang melayang atau menembus benda lain.
2. **Motivated light**: setiap lampu punya sumber nyata di dalam scene.
3. **Acting with props**: tokoh menyentuh dan memakai benda di sekitarnya.
4. **Moving camera**: tidak ada shot yang diam, tiap beat dipecah jadi 2-3 sudut.

## Peta modul
`engine/` berisi hal yang dipakai semua video. `productions/<slug>/` berisi hal yang khas satu video.
Aturan praktis: jika dua video akan memakainya, naikkan ke `engine/`.
