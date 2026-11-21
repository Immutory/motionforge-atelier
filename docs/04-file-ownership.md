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
| `engine/post` | post-compositor | semua |
| `sound/*` | sound-designer | render-engineer |
| `pipeline/*`, `out/*` | render-engineer | semua |

## Kontrak antar pemilik
Konstanta yang diekspor adalah kontrak. Contoh: layer tanpa ink (post-compositor), tabel DOF
(cinematographer), preset cahaya (light-colorist). Mengubah kontrak berarti memberi tahu semua pembacanya.
