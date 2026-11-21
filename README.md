# MotionForge Atelier

Studio template untuk membuat video animasi **2D-in-3D vertikal**: tokoh kartun 2D berdiri di dunia 3D
yang dibangun murni dari kode, lalu dirender dengan Remotion dan three.js. Setiap tahap punya agent
dan skill sendiri, jadi Claude Code bisa bekerja seperti satu studio kecil.

## Mulai cepat

```bash
npm install
npm run doctor                    # cek Node, Python, FFmpeg, numpy
npm run check                     # typecheck + tes
npm run studio                    # lihat komposisi "starter"
npm run forge:new -- jembatan-roboh "Jembatan Roboh"
```

Lalu jalankan showrunner sebagai sesi utama Claude Code di folder ini:

```bash
claude --agent showrunner
```

Dan katakan: *"Aku mau bikin short tentang ..."*. Showrunner yang memanggil agent lain, karena
subagent tidak bisa diandalkan untuk memanggil subagent lain.

## Struktur folder

```text
motionforge-atelier/
├── CLAUDE.md                  Otak proyek untuk Claude Code
├── .claude/
│   ├── agents/                11 agent spesialis
│   └── skills/                11 skill (atelier-*)
├── docs/                      Panduan: alur, roster, gate, look bible, kebijakan orisinalitas
├── engine/                    Mesin yang dipakai ulang semua produksi
│   ├── core/                  easing, kamera, timeline kata
│   ├── stage/                 langit, kabut, lampu, preset cahaya
│   ├── cast/                  karakter bean + billboard
│   └── post/                  ink, lens, bloom, tone map, grade (PostStack)
├── productions/               Satu folder per video
│   ├── _starter/              Cetak biru bersih
│   ├── registry.ts            Daftar komposisi (diisi otomatis oleh forge:new)
│   └── <slug>/                brief, naskah, voice, audio, shots, set, cast, look, reports
├── studio/                    Entry Remotion
├── tests/                     Tes kamera, timeline, QA
├── .github/workflows/         CI
├── pipeline/                  Skrip still, preview, render, mux, QA, voice
├── sound/                     Lab audio sintetis (dsp, sfx, mix)
├── assets/                    props, textures, fonts (hanya yang lisensinya jelas)
├── references/                Materi belajar gaya (privat, jangan dipublikasikan)
└── out/                       Hasil render
```

## Tim agent

| Agent | Tugas | Memiliki file |
|-------|-------|---------------|
| showrunner | Produser, mengatur fase dan gate | PRODUCTION_LOG.md |
| story-architect | Riset fakta dan naskah | brief.md, SCRIPT.md |
| voice-director | Suara dan waktu per kata | voice/ |
| cinematographer | Shot, kamera, kick, DOF | shots.ts |
| set-designer | Dunia 3D, props, tekstur | set.tsx |
| character-animator | Tokoh, ekspresi, akting | cast.ts |
| light-colorist | Cahaya, palet, grade | look.ts |
| post-compositor | Ink, lens, bloom | engine/post |
| sound-designer | SFX, musik, mix | audio/, sound/ |
| qa-inspector | Verifikasi dan skor | reports/ |
| render-engineer | Render dan mux | pipeline/, out/ |

Detail lengkap: [docs/03-agent-roster.md](docs/03-agent-roster.md).

## Lisensi dan orisinalitas
Kode MIT. Template ini terinspirasi dari alur kerja proyek `2d-in-3d-animation-agent` (MIT), tetapi
nama, struktur, agent, skill, dan kode ditulis ulang, tetapi sebagian aturan teknis diadaptasi. Lihat `NOTICE` dan [docs/07-originality-policy.md](docs/07-originality-policy.md).
