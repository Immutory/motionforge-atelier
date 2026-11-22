# 04. Peta kepemilikan file

Satu file, satu pemilik. Ini mencegah dua agent menimpa pekerjaan satu sama lain.

| File atau folder | Pemilik | Pembaca utama |
|------------------|---------|---------------|
| `productions/<slug>/brief.md`, `SCRIPT.md` | story-architect | semua |
| `productions/<slug>/voice/*` | voice-director | cinematographer, sound-designer |
| `productions/<slug>/words.ts` | voice-director | semua |
| `productions/<slug>/shots.ts` (termasuk tabel DOF) | cinematographer | post-compositor, sound-designer |
| `productions/<slug>/set.tsx` | set-designer | cinematographer |
| `productions/<slug>/cast.ts` | character-animator | cinematographer |
| `productions/<slug>/look.ts` (cahaya, grade, POST) | light-colorist | post-compositor |
| `productions/<slug>/Production.tsx` (wiring composer) | post-compositor | semua |
| `productions/<slug>/audio/events.json` | sound-designer | render-engineer |
| `productions/<slug>/reports/*` | qa-inspector | showrunner |
| `productions/<slug>/PRODUCTION_LOG.md` | showrunner | pengguna |
| `engine/core`, `engine/stage` | cinematographer dan light-colorist (sesuai isi) | semua |
| `engine/cast` | character-animator | semua |
| `engine/sets`, `engine/textures` | set-designer | cinematographer, light-colorist |
| `assets/sets/*`, `public/sets/*.glb` | set-designer | semua |
| `assets/sets/build_kampung_v2.py`, `export_kampung_glb.py`, `generate_pbr_textures.py`, `ZONING_KAMPUNG_V2.md` | set-designer | cinematographer, light-colorist |
| `productions/charlab/KampungV2Production.tsx` (komposisi QC dunia) | set-designer | qa-inspector |
| `productions/charlab/reports/*` | qa-inspector | showrunner |
| `assets/characters/*` | character-animator | semua |
| `engine/post` | post-compositor | semua |
| `productions/charlab/*` | character-animator (karakter), set-designer (set lab) | semua |
| `sound/*` | sound-designer | render-engineer |
| `pipeline/*`, `out/*` | render-engineer | semua |

## Catatan: episode 1 memakai tata letak lama
`productions/ep01_bang_utoh_vlog/` dan `productions/ep01_bang_utoh_short/` dibuat sebelum pola `_starter`
dipakai penuh. Shot, set, cast, dan look masih digabung di satu `Production.tsx`, dan kata-kata ada di
`voice/words_*.ts`. Untuk episode ini, `Production.tsx` dipegang showrunner yang meneruskan perubahan ke
spesialis satu per satu. Produksi baru selalu dibuat lewat `npm run forge:new` agar mengikuti tabel di atas.

## Kontrak antar pemilik
Konstanta yang diekspor adalah kontrak. Contoh: layer tanpa ink (post-compositor), tabel DOF
(cinematographer), preset cahaya (light-colorist). Mengubah kontrak berarti memberi tahu semua pembacanya.
