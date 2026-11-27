# 02. Alur produksi studio (Atelier v4.0 — 2.5D Volumetric 360° Edition)

| Fase | Nama | Agent utama | Keluaran | Gate |
|------|------|-------------|----------|------|
| 0 | Brief | story-architect (diorganisasi showrunner) | `brief.md` | |
| 1 | Naskah | story-architect | `SCRIPT.md` dengan sumber & cast sheet | **G1** |
| 2 | Suara | voice-director | `voice.wav`, `words.json`, `timeline.json`, `rms.json` | |
| 3 | Blocking | cinematographer, set-designer, character-animator | `set.tsx`, `cast.ts`, `shots.ts` | |
| **3.5** | **Spatial & Rig360 Audit** | **set-designer, character-animator, cinematographer, qa-inspector** | **Lulus 100% `engine/core/spatial.ts`, `rig360` 360°, zero duplikat/leak, & `npm run check`** | **Wajib pra-G2** |
| 4 | Look-dev stills | set-designer, character-animator, light-colorist, qa-inspector | stills di `out/<slug>/stills` + laporan QA 2-lapis | **G2** |
| 5 | Motion preview | cinematographer, character-animator, qa-inspector | klip 1–3 detik per beat (Move → Settle, 360° orbit, akting & lip-sync) | **G3** |
| 6 | Sound | sound-designer | `mix.wav` | |
| 7 | Master render | render-engineer | `video_silent.mp4` | |
| 8 | Mux, QA & Cleanup | render-engineer, qa-inspector, showrunner | `<slug>_final.mp4`, `UPLOAD.md` (`.agents/youtube-skills/`), laporan `npm run qa`, workspace bersih (`__pycache__=0`, `.blend1=0`) | **G4** |

## Aturan gate & Spatial Audit
- **Fase 3.5 wajib hijau sebelum Gate G2**: Showrunner dilarang mempresentasikan still Gate G2 bila masih ada 1 pelanggaran spasial (aset dempet/nembus, billboard menyapu bangku/meja saat rotasi `yaw`, kepala penjaga konter tenggelam, atau wajah/papan nama terpotong).
- Pada setiap gate (G1–G4), showrunner menunjukkan bukti (tabel naskah, hasil audit spasial + gambar still, jalur klip preview, laporan QA akhir) lalu berhenti. Lanjut hanya setelah pengguna menulis persetujuan yang jelas.
- Sebelum menutup **G4**, showrunner membersihkan file intermediate/sampah (`video_silent.mp4`, log TTS lama, draf contact sheet usang, `__pycache__/`, `.blend1`) tanpa menyentuh VO final, skrip aktif, `mix.wav`, maupun `<slug>_final.mp4`.

## Kenapa urutannya begini
- Suara dikunci sebelum shot karena semua waktu akting & kamera mengikuti kata + envelope RMS.
- **Spatial Audit (Fase 3.5)** berjalan sebelum render still agar clipping 3D, rotasi `yaw` billboard, tinggi konter, dan safe framing selesai secara matematis sebelum biaya render keluar.
- Stills sebelum motion karena salah cahaya, proporsi, atau framing jauh lebih murah diperbaiki pada gambar diam.
- Sound setelah timing gambar terkunci, supaya tidak perlu dibuat ulang.
- Render master paling akhir karena paling mahal.

## Saran pemakaian model
Pekerjaan visual, spasial, dan sinematika (fase 3 sampai 5) paling diuntungkan model terkuat (`opus`). Tugas administratif, audio, dan eksekusi render memakai model hemat (`sonnet`/`haiku`). Pembagian ini sudah tertulis di kolom `model` pada tiap file agent.
