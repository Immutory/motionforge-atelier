# Log Produksi — Starter (Atelier v3.0)

| Tanggal | Fase | Agent | Ringkasan | Status Gate |
|---|---|---|---|---|
| YYYY-MM-DD | 0 Brief | `story-architect` | Draft `brief.md` dibuat | — |
| | 1 Naskah | `story-architect` | `SCRIPT.md` + cast sheet | Menunggu **G1** |
| | 2 Suara | `voice-director` | `voice.wav`, `words.json`, `timeline.json`, `rms.json` | — |
| | 3 Blocking | `cinematographer`, `set-designer`, `character-animator` | `shots.ts`, `set.tsx`, `cast.ts` | — |
| | **3.5 Spatial Audit** | `set-designer`, `character-animator`, `cinematographer`, `qa-inspector` | Lulus 100% `engine/core/spatial.ts` & `npm run check` | Wajib pra-G2 |
| | 4 Look-dev Stills | `light-colorist`, `qa-inspector` | Stills & laporan QA 2-lapis | Menunggu **G2** |
| | 5 Motion Preview | `cinematographer`, `character-animator`, `qa-inspector` | Preview per beat | Menunggu **G3** |
| | 6 Sound | `sound-designer` | `mix.wav` (`-16.0 LUFS`, `TP <= -1.5 dBTP`) | — |
| | 7–8 Render, Mux, QA & Cleanup | `render-engineer`, `qa-inspector`, `showrunner` | `<slug>_final.mp4`, `npm run qa` LULUS, cleanup G4 | Menunggu **G4** |
