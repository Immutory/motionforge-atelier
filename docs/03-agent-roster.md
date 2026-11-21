# 03. Roster agent

Setiap agent adalah file di `.claude/agents/`. Skill yang dipakai ada di `.claude/skills/`.

| # | Agent | Model | Tugas ringkas | Skill utama |
|---|-------|-------|---------------|-------------|
| 1 | showrunner | opus | Mengatur fase, memanggil agent, menjaga gate, mencatat log | semua (pembaca) |
| 2 | story-architect | sonnet | Memilih cerita, memverifikasi fakta, menulis naskah sembilan beat | atelier-story-forge |
| 3 | voice-director | sonnet | Menyiapkan suara 48 kHz dan `words.json` | atelier-voice-sync |
| 4 | cinematographer | opus | Merancang shot, kamera, kick, flash, DOF | atelier-shot-plan |
| 5 | set-designer | opus | Membangun set dan props 3D prosedural | atelier-set-craft |
| 6 | character-animator | opus | Menggambar dan menganimasikan tokoh | atelier-cast-craft |
| 7 | light-colorist | opus | Cahaya, kabut, palet, grade | atelier-light-grade |
| 8 | post-compositor | opus | Ink, lens blur, bloom, urutan composer | atelier-ink-lens |
| 9 | sound-designer | sonnet | SFX, musik, mix, loudness | atelier-sound-lab |
| 10 | qa-inspector | opus | Verifikasi independen dan daftar perbaikan | atelier-quality-gate, atelier-look-match |
| 11 | render-engineer | haiku | Menjalankan render dan mux, mengurus disk | atelier-render-ship |

## Siapa memanggil siapa
Showrunner berjalan sebagai **sesi utama** (`claude --agent showrunner`) dan memanggil semua agent lain
lewat tool `Agent`. Subagent tidak bisa diandalkan memanggil subagent lain, jadi spesialis tidak saling
memanggil. qa-inspector tidak pernah memperbaiki sendiri, dia melapor ke showrunner yang meneruskan ke pemilik file.

## Contoh perintah
- "Showrunner, mulai produksi baru tentang jembatan yang runtuh karena derap kaki."
- "Cinematographer, shot 2 terasa kaku, pecah jadi dua sudut dan tambah kick di kata 'patah'."
- "QA-inspector, bandingkan still 100 dan 400 dengan referensi dan beri skor."
