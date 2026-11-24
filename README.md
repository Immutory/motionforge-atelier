# MotionForge Atelier

Studio template untuk membuat video animasi **2D-in-3D**: tokoh kartun 2D (digambar dengan kode Canvas2D)
berdiri di dunia 3D yang dimodelkan di Blender dan diekspor ke `.glb`, lalu dirender dengan Remotion dan
three.js. Setiap tahap punya agent dan skill sendiri, jadi Claude Code bisa bekerja seperti satu studio kecil.

Format yang didukung:

| Format | Ukuran | Contoh komposisi di repo |
|--------|--------|--------------------------|
| Short / Reels / TikTok | 1080x1920 (9:16), 55-70 detik | `ep02-bang-utoh`, `ep01-bang-utoh-short`, `starter` |
| Episode YouTube | 1920x1080 (16:9) | `ep01-bang-utoh-vlog`, `kampungupgrade` |
| Branding kanal | 2560x1440 banner, 2048x2048 profil | `youtubebanner`, `youtubeprofile`, `tiktokprofile` |

Nama di kolom kanan adalah **ID komposisi** (yang muncul di Remotion Studio dan dipakai perintah render),
bukan nama folder. Contoh: `ep01-bang-utoh-short` ada di `productions/ep01_bang_utoh_short/`, sedangkan
`kampungupgrade`, `youtubebanner`, `youtubeprofile`, dan `tiktokprofile` adalah komposisi di dalam
`productions/charlab/`. Daftar lengkapnya ada di `productions/registry.ts`.

## Mulai cepat

```bash
npm install
npm run doctor                    # cek Node, Python, FFmpeg, numpy
npm run check                     # typecheck + tes
npm run studio                    # lihat komposisi "starter"
npm run forge:new -- jembatan-roboh "Jembatan Roboh"
```

Suara (butuh venv Python `.venv-vo/`, lihat skill `atelier-voice-sync`):

```bash
npm run vo:doctor                 # cek TTS lokal dan aligner
npm run vo:gen -- --script productions/<slug>/voice/script.json --out-dir productions/<slug>/voice
npm run vo:align -- rekaman.wav productions/<slug>/voice/words.json   # rekaman asli -> words.json
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
│   ├── skills/                11 skill (atelier-*)
│   └── youtube/               Panduan suara kanal
├── .agents/
│   ├── skills.json            Daftar folder skill yang dimuat
│   └── youtube-skills/        10 skill kanal YouTube (yt-*), sebagian dengan skrip Python
├── docs/                      Panduan: alur, roster, gate, look bible, kebijakan orisinalitas
├── engine/                    Mesin yang dipakai ulang semua produksi
│   ├── core/                  easing, kamera, timeline kata
│   ├── stage/                 Stage, langit, kabut, lampu, preset cahaya, shading
│   ├── cast/                  Rig tokoh 2D (ActorBillboard, nusantara), kucing (CatBillboard),
│   │                          ekspresi, lip-sync, props 2D, bentuk dasar bean
│   ├── sets/                  GlbSet + KampungSet, WarkopSet, KostSet, KampusSet (memuat public/sets/*.glb)
│   ├── textures/              Tekstur cat prosedural
│   └── post/                  ink, lens, bloom, tone map, grade (PostStack)
├── productions/               Satu folder per video
│   ├── _starter/              Cetak biru bersih
│   ├── charlab/               Lab karakter, rig, set, Kampung v2, dan branding kanal
│   │                          (12 komposisi: charlab, nusantara, warga, riglab, bangutoh,
│   │                          setlab, kucingoyen, kampungv2, kampungupgrade, youtubebanner,
│   │                          youtubeprofile, tiktokprofile)
│   ├── ep01_bang_utoh_vlog/   Episode 1 versi YouTube 16:9 (tata letak lama, lihat docs/04)
│   ├── ep01_bang_utoh_short/  Episode 1 versi Short 9:16 (tata letak lama)
│   ├── ep02-bang-utoh/        Episode 2 Short 9:16 (pola _starter penuh)
│   ├── registry.ts            Daftar komposisi (diisi otomatis oleh forge:new)
│   └── <slug>/                brief, naskah, voice, audio, shots, set, cast, look, reports
├── studio/                    Entry Remotion (satu Composition per entri registry)
├── tests/                     Tes TS (kamera, timeline, engine, spot set, Kampung, set EP02)
│                              dan Python (QA, pipeline voice)
├── .github/workflows/         CI: typecheck, tes, cek sintaks pipeline
├── pipeline/                  Skrip still, preview, render, mux, contact sheet
│   ├── qa/                    Pemeriksa kualitas otomatis
│   └── voice/                 TTS lokal (Chatterbox), aligner (faster-whisper), SRT -> words
├── sound/                     Lab audio sintetis (dsp, sfx, mix)
├── assets/
│   ├── characters/            Sheet, frame, dan preview karakter
│   ├── sets/                  Master Blender (.blend), builder Kampung v2, tekstur PBR, sheet dan frame
│   ├── voices/                Referensi suara terkunci (*.wav) dan presets.json
│   └── props/, textures/, fonts/   (hanya yang lisensinya jelas)
├── public/sets/               Set 3D siap render (.glb): kampung, kampus, kost, warkop
├── references/                Materi belajar gaya (privat, jangan dipublikasikan)
└── out/                       Hasil render (tidak masuk git)
```

## Tim agent

| Agent | Tugas | Memiliki file |
|-------|-------|---------------|
| showrunner | Produser, mengatur fase dan gate | PRODUCTION_LOG.md |
| story-architect | Riset fakta dan naskah | brief.md, SCRIPT.md |
| voice-director | Suara dan waktu per kata | voice/, words.ts, assets/voices, pipeline/voice |
| cinematographer | Shot, kamera, kick, DOF | shots.ts |
| set-designer | Dunia 3D (Blender ke GLB), props, tekstur | set.tsx, engine/sets, assets/sets, public/sets |
| character-animator | Tokoh, kucing, ekspresi, akting | cast.ts, engine/cast |
| light-colorist | Cahaya, palet, grade | look.ts |
| post-compositor | Ink, lens, bloom | engine/post |
| sound-designer | SFX, musik, mix | audio/, sound/ |
| qa-inspector | Verifikasi dan skor | reports/ |
| render-engineer | Render dan mux | pipeline/ (kecuali voice/), out/ |

Detail lengkap: [docs/03-agent-roster.md](docs/03-agent-roster.md).

## Lisensi dan orisinalitas
Kode MIT. Template ini terinspirasi dari alur kerja proyek `2d-in-3d-animation-agent` (MIT), tetapi
nama, struktur, agent, skill, dan kode ditulis ulang. Sebagian aturan teknis diadaptasi. Lihat `NOTICE` dan [docs/07-originality-policy.md](docs/07-originality-policy.md).
