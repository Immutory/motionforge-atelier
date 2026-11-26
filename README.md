# MotionForge Atelier v3.0 (2.5D Reference Edition)

Studio produksi animasi **2,5D-in-3D**: 1 siluet vektor karakter utuh bervolume 2,5D (Canvas2D + *spherical face parallax*, *weighted ink*, `receiveShadow`/`castShadow` nyata, interaksi prop 3D via `actorHandWorldPos`) berdiri di dunia 3D Blender (`.glb` + `*.boxes.json`), dirender dengan Remotion dan Three.js. Setiap tahap punya agent dan skill sendiri di `.claude/`.

Format yang didukung:

| Format | Ukuran | Contoh komposisi di repo |
|--------|--------|--------------------------|
| Short / Reels / TikTok | 1080×1920 (9:16), 58–75 dtk (hingga 90 dtk khusus VO asli pengguna, kelipatan `90f`) | `ep04-karyawan-bakmie`, `ep03-tio-bakmie`, `ep02-bang-utoh`, `ep01-bang-utoh-short`, `starter` |
| Episode YouTube | 1920×1080 (16:9) | `ep01-bang-utoh-vlog`, `kampungupgrade`, `kampungv2` |
| Branding & Thumbnail | 2560×1440 banner, 2048×2048 profil, 1080×1920 thumbnail 4-platform | `youtubebanner`, `youtubeprofile`, `tiktokprofile`, `shortsthumbs` |

Daftar lengkap ID komposisi ada di `productions/registry.ts`.

## Mulai cepat

```bash
npm install
npm run doctor                    # cek Node, Python, FFmpeg, ffprobe, numpy, scipy, Pillow
npm run check                     # typecheck + seluruh tes TS & Python
npm run studio                    # lihat komposisi "starter" v3.0
npm run forge:new -- jembatan-roboh "Jembatan Roboh"
```

Suara (butuh venv Python `.venv-vo/`, lihat skill `atelier-voice-sync`):

```bash
npm run vo:doctor                 # cek TTS lokal dan aligner
npm run vo:gen -- --script productions/<slug>/voice/script.json --out-dir productions/<slug>/voice
npm run vo:align -- rekaman.wav productions/<slug>/voice/words.json   # rekaman asli -> words.json
```

Jalankan showrunner sebagai sesi utama Claude Code:

```bash
claude --agent showrunner
```

## Struktur folder

```text
motionforge-atelier/
├── CLAUDE.md                  Otak proyek v3.0 untuk Claude Code
├── .claude/
│   ├── agents/                11 agent spesialis
│   └── skills/                11 skill (atelier-*)
├── docs/                      Panduan v3.0: alur, roster, kepemilikan, gate, look bible, orisinalitas
├── engine/                    Mesin 2,5D yang dipakai ulang semua produksi
│   ├── core/                  easing, camera.ts, CameraRig.tsx, spatial.ts (audit 2,5D), timeline.ts
│   ├── stage/                 Stage, langit, kabut, lampu, preset cahaya, shade.ts (uLocalLight soft-clamp)
│   ├── cast/                  13 cast (ActorBillboard, nusantara), 3 kucing (CatBillboard, cat),
│   │                          13 ekspresi + blinkLidAt, lip-sync, 23 props 2D, sticker.ts
│   ├── sets/                  GlbSet, boxes.ts/boxesNode.ts + KampungSet, WarkopSet, KostSet, KampusSet
│   ├── textures/              Tekstur cat prosedural + disposeTextureCache
│   └── post/                  ink, lens, bloom, tone map, grade (PostStack + POST_HYBRID_25D)
├── productions/               Satu folder per video
│   ├── _starter/              Cetak biru bersih v3.0 (2.5D Reference Edition)
│   ├── charlab/               Lab karakter, rig, set, Kampung v2, branding & thumbnail
│   │                          (14 komposisi: charlab, nusantara, warga, riglab, bangutoh, ebot,
│   │                          setlab, kucingoyen, kampungv2, kampungupgrade, youtubebanner,
│   │                          youtubeprofile, tiktokprofile, shortsthumbs)
│   ├── ep01_bang_utoh_vlog/   Episode 1 versi YouTube 16:9
│   ├── ep01_bang_utoh_short/  Episode 1 versi Short 9:16
│   ├── ep02-bang-utoh/        Episode 2 Short 9:16 (FINAL MASTER v6.1, Gate G4 LULUS)
│   ├── ep03-tio-bakmie/       Episode 3 Short 9:16 (FINAL MASTER v6, Gate G4 LULUS)
│   ├── ep04-karyawan-bakmie/  Episode 4 Short 9:16 (FINAL MASTER 87 dtk VO pengguna)
│   ├── registry.ts            Daftar komposisi (diisi otomatis oleh forge:new)
│   └── <slug>/                brief, naskah, voice, audio, shots, set, cast, look, reports, UPLOAD.md
├── studio/                    Entry Remotion (satu Composition per entri registry)
├── tests/                     Tes TS (kamera, timeline, engine, spatial 2,5D, spot set, EP02–EP04) & Python (QA, sound, voice)
├── .github/workflows/         CI: typecheck, tes, cek sintaks pipeline & sound
├── pipeline/                  Skrip still, preview, render, mux, contact sheet, export-boxes.mjs
│   ├── qa/                    Pemeriksa kualitas otomatis (qa_check.py)
│   └── voice/                 TTS lokal (Chatterbox), aligner (faster-whisper), SRT -> words
├── sound/                     Lab audio sintetis (dsp, sfx, music, loudness, mix — -16 LUFS / -1,5 dBTP)
├── assets/
│   ├── characters/            Sheet, frame, dan preview karakter (13 cast + 3 kucing)
│   ├── sets/                  Master Blender (.blend), builder Kampung v2, upgrade_sets_v3.py, tekstur PBR
│   └── voices/                Referensi suara terkunci (*.wav) dan presets.json (termasuk ebot)
├── public/sets/               Set 3D siap render (.glb) + sidecar AABB manifest (*.boxes.json)
├── contohvideo/               Video referensi privat: (1).mp4 & download.mp4 (jangan dipublikasikan)
├── references/                Laporan terukur gaya & motion privat (jangan dipublikasikan)
└── out/                       Hasil render (tidak masuk git)
```

## Tim agent

| Agent | Tugas | Memiliki file |
|-------|-------|---------------|
| showrunner | Produser, mengatur fase dan gate | `PRODUCTION_LOG.md`, `productions/registry.ts`, `.claude/*`, `docs/*`, `references/*`, `CLAUDE.md`, `README.md` |
| story-architect | Riset fakta dan naskah | `brief.md`, `SCRIPT.md` |
| voice-director | Suara dan waktu per kata | `voice/`, `words.ts`, `assets/voices/`, `pipeline/voice/` |
| cinematographer | Shot, kamera, kick, DOF, spatial audit | `shots.ts`, `engine/core/` (`camera.ts`, `CameraRig.tsx`, `spatial.ts`) |
| set-designer | Dunia 3D (Blender ke GLB + boxes.json), props, tekstur | `set.tsx`, `engine/sets/`, `engine/textures/`, `assets/sets/`, `public/sets/`, `charlab/KampungV2Production.tsx` |
| character-animator | Tokoh 2,5D, kucing, ekspresi, akting | `cast.ts`, `engine/cast/`, `assets/characters/` |
| light-colorist | Cahaya 2,5D, palet, grade | `look.ts`, `engine/stage/` |
| post-compositor | Ink, lens, bloom, composer, transisi | `Production.tsx`, `engine/post/` |
| sound-designer | SFX, musik, mix | `audio/`, `sound/` |
| qa-inspector | Verifikasi 2-lapis dan skor | `reports/`, `productions/charlab/reports/` |
| render-engineer | Render, mux, studio entry | `pipeline/` (kecuali `pipeline/voice/`), `studio/`, `out/` |

Detail lengkap: [docs/03-agent-roster.md](docs/03-agent-roster.md).

## Lisensi dan orisinalitas
Kode MIT. Template ini terinspirasi dari alur kerja proyek `2d-in-3d-animation-agent` (MIT), tetapi nama, struktur, agent, skill, dan kode ditulis ulang. Lihat `NOTICE` dan [docs/07-originality-policy.md](docs/07-originality-policy.md).
