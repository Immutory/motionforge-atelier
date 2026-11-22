# 01. Gambaran umum

MotionForge Atelier adalah template produksi video animasi. Idenya sederhana:
dunia 3D dimodelkan di Blender lalu diekspor ke `.glb`, tokoh 2D digambar di kanvas lalu ditempel sebagai
kartu yang menghadap kamera, dan kamera bergerak seperti film sungguhan.

Format utama adalah Short vertikal 9:16 (1080x1920, 55-70 detik). Template yang sama juga dipakai untuk
episode YouTube 16:9 (1920x1080) dan aset branding kanal (banner 2560x1440, profil 2048x2048).

## Kenapa pendekatan ini
- **Ringan.** Set dunia disimpan sebagai satu master `.blend` dan beberapa `.glb` kecil di `public/sets/`.
  Tokoh, ekspresi, dan efek post tetap lahir dari kode.
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

| Modul | Isi |
|-------|-----|
| `engine/core` | easing, kamera, timeline kata |
| `engine/stage` | Stage, langit, kabut, preset cahaya, shading |
| `engine/cast` | rig tokoh 2D (`ActorBillboard`), kucing 2D (`CatBillboard`), ekspresi, lip-sync, props 2D |
| `engine/sets` | `GlbSet` dan set siap pakai: `KampungSet`, `WarkopSet`, `KostSet`, `KampusSet` |
| `engine/textures` | tekstur cat prosedural |
| `engine/post` | ink, lens, bloom, tone map, grade (`PostStack`) |
| `assets/sets/blend` | master Blender semua set; ekspor ke `public/sets/*.glb` |
| `productions/charlab` | lab karakter, set, dan branding kanal (bukan video akhir) |
