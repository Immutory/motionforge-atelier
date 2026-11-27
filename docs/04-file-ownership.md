# 04. Peta kepemilikan file

Satu file, satu pemilik. Ini mencegah dua agent menimpa pekerjaan satu sama lain.

| File atau folder | Pemilik | Pembaca utama |
|------------------|---------|---------------|
| `productions/<slug>/brief.md`, `SCRIPT.md` | story-architect | semua |
| `productions/<slug>/voice/*` (termasuk `script.json`, `lines.json`, skrip `*.py` per produksi, `RECORDING_SHEET.md`) | voice-director | cinematographer, sound-designer |
| `productions/<slug>/words.ts` | voice-director | semua |
| `productions/<slug>/shots.ts` (termasuk tabel DOF) | cinematographer | post-compositor, sound-designer |
| `productions/<slug>/set.tsx` | set-designer | cinematographer |
| `productions/<slug>/cast.ts` | character-animator | cinematographer |
| `productions/<slug>/look.ts` (cahaya, grade, POST) | light-colorist | post-compositor |
| `productions/<slug>/Production.tsx` (wiring composer) | post-compositor | semua |
| `productions/<slug>/audio/events.json` | sound-designer | render-engineer |
| `productions/<slug>/reports/*` | qa-inspector | showrunner |
| `productions/<slug>/PRODUCTION_LOG.md`, `UPLOAD.md` | showrunner | pengguna |
| `engine/core/*` (termasuk `camera.ts`, `CameraRig.tsx`, `easing.ts`, `timeline.ts`, `spatial.ts`) | cinematographer | semua (`set-designer`, `character-animator`, `qa-inspector` konsumen utama `spatial.ts`) |
| `engine/stage/*` | light-colorist | semua |
| `engine/cast/*` | character-animator | semua |
| `engine/sets/*`, `engine/props/*`, `engine/textures/*` | set-designer | cinematographer, light-colorist |
| `assets/sets/*`, `public/sets/*.glb`, `public/sets/*.boxes.json` | set-designer | semua |
| `assets/sets/build_kampung_v2.py`, `kampung_reallife_v35.py`, `upgrade_sets_v3.py`, `export_kampung_glb.py`, `generate_pbr_textures.py`, `ZONING_KAMPUNG_V2.md` | set-designer | cinematographer, light-colorist |
| `productions/charlab/KampungV2Production.tsx` (komposisi QC dunia) | set-designer | qa-inspector |
| `productions/charlab/reports/*` | qa-inspector | showrunner |
| `assets/characters/*` | character-animator | semua |
| `engine/post/*` | post-compositor | semua |
| `productions/charlab/*` | character-animator (karakter), set-designer (set lab) | semua |
| `assets/voices/*.wav`, `assets/voices/presets.json` (referensi suara terkunci) | voice-director | sound-designer |
| `pipeline/voice/*` (TTS lokal, aligner, SRT ke words) | voice-director | render-engineer |
| `sound/*` | sound-designer | render-engineer |
| `pipeline/*` (selain `pipeline/voice/`), `studio/*`, `out/*` | render-engineer | semua |
| `productions/registry.ts` | showrunner (otomatis diperbarui lewat `forge:new`) | semua |
| `tests/*` | pemilik file yang dites (mis. `tests/camera.test.ts` & `tests/spatial.test.ts` milik cinematographer, `tests/sets-spots.test.ts` milik set-designer) | qa-inspector |
| `.claude/agents/*`, `.claude/skills/*`, `docs/*`, `references/*`, `CLAUDE.md`, `README.md` | showrunner (mengubah hanya atas persetujuan pengguna) | semua |

## Catatan: episode 1 memakai tata letak lama
`productions/ep01_bang_utoh_vlog/` dan `productions/ep01_bang_utoh_short/` dibuat sebelum pola `_starter`
dipakai penuh. Shot, set, cast, dan look masih digabung di satu `Production.tsx`, dan kata-kata ada di
`voice/words_*.ts`. Untuk episode ini, `Production.tsx` dipegang showrunner yang meneruskan perubahan ke
spesialis satu per satu. Produksi baru selalu dibuat lewat `npm run forge:new` agar mengikuti tabel di atas.

## Penamaan folder dan ID komposisi
- Folder produksi baru memakai **kebab-case** sesuai slug `forge:new`, misalnya `productions/ep02-bang-utoh/`.
  ID komposisinya sama dengan slug.
- Folder EP01 (`ep01_bang_utoh_vlog`, `ep01_bang_utoh_short`) memakai snake_case karena dibuat lebih dulu.
  ID komposisinya tetap kebab-case (`ep01-bang-utoh-vlog`, `ep01-bang-utoh-short`). Jangan mengganti nama
  folder ini tanpa memperbarui `registry.ts` dan skrip audio di dalamnya.
- Komposisi di `productions/charlab/` (mis. `kampungupgrade`, `youtubebanner`) tidak punya folder sendiri.

## Nama peran di PRODUCTION_LOG
Kolom Agent di `PRODUCTION_LOG.md` hanya memakai nama dari roster resmi (`docs/03-agent-roster.md`):
showrunner, story-architect, voice-director, cinematographer, set-designer, character-animator,
light-colorist, post-compositor, sound-designer, qa-inspector, render-engineer, atau `pengguna`.
Jangan memakai nama bebas seperti "director", "compositor", atau "engine-specialist", supaya setiap
perubahan bisa dilacak ke pemilik file di tabel atas.

## Kontrak antar pemilik
Konstanta yang diekspor adalah kontrak. Contoh: layer tanpa ink (post-compositor), tabel DOF
(cinematographer), preset cahaya (light-colorist). Mengubah kontrak berarti memberi tahu semua pembacanya.
