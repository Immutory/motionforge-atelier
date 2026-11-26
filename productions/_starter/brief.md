# Brief Produksi — Starter (Template v3.0)

- **Judul kerja:** Starter
- **Slug:** `starter`
- **Format final:** 1 master vertikal 9:16 (`1080×1920`, `30 fps`) untuk YouTube Shorts, Instagram Reels, dan TikTok.
- **Durasi target:** **58–75 detik** (fleksibel sampai `90 detik` untuk VO pengguna yang ekspresif, selalu dikunci kelipatan `90 frame`; ritme `3,5–3,8 kata/detik`).
- **Loop cut:** `f<total - 15>` → `f0` (hard cut loop seamless).

---

## Logline (Satu Kalimat)
*(Tulis premis visual sebab-akibat dalam satu kalimat.)*

## Pemeran & Suara
| Tokoh | Preset (`CAST_PRESETS` / `CAT_PRESETS`) | Peran | Sumber Suara |
|---|---|---|---|
| **Bang Utoh** | `bangUtoh` | Pemeran utama | Rekaman pengguna (`voice/utoh_*.wav`, natural 1.0x) |
| **Mbak Rara** | `rara` | Lawan main | Rekaman pengguna atau TTS lokal preset `rara` |

## Lokasi & Cahaya
- **Set resmi:** `<WarkopSet lightId="noon" />` (`showGround={false}` pada `<Stage>`, pencahayaan `indoorLight()`).
- **Info diegetik (ZERO 2D HUD):** Seluruh informasi cerita tampil di objek 3D; teks 2D hanya subtitle + label pembicara (`y ≈ 1485 px`).
