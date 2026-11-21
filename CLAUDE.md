# MotionForge Atelier

Studio template untuk video animasi vertikal 9:16 (1080x1920, 30 fps, 55-70 detik) bergaya
karakter 2D di dunia 3D prosedural. Stack: Remotion, three.js (react-three-fiber), Python untuk audio.

## Cara kerja dengan Claude Code
1. Jalankan showrunner sebagai sesi utama: `claude --agent showrunner`. Hanya dia yang memanggil agent lain lewat tool `Agent`.
2. Satu file punya satu pemilik. Lihat `docs/04-file-ownership.md`. Jangan edit file milik agent lain.
3. Berhenti di setiap gate (G1 naskah, G2 stills, G3 motion, G4 master) dan tunggu persetujuan pengguna.
4. Cerita, tokoh, dan suara selalu orisinal. Referensi hanya untuk belajar gaya.

## Perintah penting
- `npm run doctor`            cek lingkungan
- `npm run forge:new -- <slug> "Judul"`   buat produksi baru dari `_starter`
- `npm run studio`            preview interaktif
- `npm run still | preview | render | mux | sound | qa`   lihat skill `atelier-render-ship`
- `npm run check`             typecheck + tes (wajib hijau sebelum minta persetujuan)

## Empat Pilar (berlaku untuk setiap shot)
Grounded, Motivated light, Acting with props, Moving camera.

## Aturan teknis singkat
- Semua parameter berukuran piksel dikali `outputHeight / 1920`.
- Urutan post: ink, lens pre, lens main, bloom, tone map netral, grade.
- Remotion menulis audio kosong, jadi mux selalu memetakan video dari input 0 dan audio dari input 1.
- Set `REMOTION_TMP` ke disk besar sebelum render.
