# 02. Alur produksi sembilan fase

| Fase | Nama | Agent utama | Keluaran | Gate |
|------|------|-------------|----------|------|
| 0 | Brief | showrunner | `brief.md` | |
| 1 | Naskah | story-architect | `SCRIPT.md` dengan sumber | **G1** |
| 2 | Suara | voice-director | `voice.wav`, `words.json` | |
| 3 | Blocking | cinematographer | `shots.ts` | |
| 4 | Look-dev stills | set-designer, character-animator, light-colorist | stills di `out/<slug>/stills` | **G2** |
| 5 | Motion preview | cinematographer, character-animator | klip 1-3 detik per beat | **G3** |
| 6 | Sound | sound-designer | `mix.wav` | |
| 7 | Master render | render-engineer | `video_silent.mp4` | |
| 8 | Mux dan QA | render-engineer, qa-inspector | `<slug>_final.mp4` | **G4** |

## Aturan gate
Pada gate, showrunner menunjukkan bukti (tabel naskah, gambar still, jalur klip preview, laporan QA)
lalu berhenti. Lanjut hanya setelah pengguna menulis persetujuan yang jelas.

## Kenapa urutannya begini
- Suara dikunci sebelum shot karena semua waktu mengikuti kata.
- Stills sebelum motion karena salah cahaya atau proporsi jauh lebih murah diperbaiki pada gambar diam.
- Sound setelah timing gambar terkunci, supaya tidak perlu dibuat ulang.
- Render master paling akhir karena paling mahal.

## Saran pemakaian model
Pekerjaan visual dan spasial (fase 3 sampai 5) paling diuntungkan model terkuat. Tugas administratif
dan menjalankan perintah render cukup model hemat. Pembagian ini sudah tertulis di kolom `model`
pada tiap file agent.
