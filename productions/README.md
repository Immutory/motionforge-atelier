# productions

Satu folder per video. `_starter` adalah cetak biru **Atelier v3.0 (2.5D Reference Edition)**, jangan dipakai langsung untuk video akhir.

Buat produksi baru:

```bash
npm run forge:new -- <slug> "Judul Video"
```

Perintah itu menyalin `_starter`, mengganti nama komponen, dan mendaftarkannya di `registry.ts`.

Isi satu produksi (pola modern v3.0):

```text
<slug>/
├── brief.md              story-architect
├── SCRIPT.md             story-architect
├── PRODUCTION_LOG.md     showrunner
├── UPLOAD.md             showrunner (paket judul, deskripsi, tag & thumbnail 4-platform siap unggah)
├── voice/                voice-director   (voice.wav, words.json, timeline.json, rms.json, lines.json, RECORDING_SHEET.md)
├── words.ts              voice-director   (BEATS, VOICE_LINES, NONVERBAL, lineById, wordsOf, rmsAt)
├── audio/events.json     sound-designer   (SFX, musik, ambien, loop crossfade, -16 LUFS / -1,5 dBTP)
├── shots.ts              cinematographer  (SHOTS, CAMS via moveSettle/whipPan/orbitTo/storyDolly, KICKS, DOF, DOF_TARGET)
├── set.tsx               set-designer     (GLB set + NamedBox kontrak spasial Fase 3.5 + prop 3D diegetik)
├── cast.ts               character-animator (13 cast + 3 kucing, resolve25DView, talkGated, blinkLidAt, seatRadius)
├── look.ts               light-colorist   (indoorLight / KAMPUNG_MODES, POST_HYBRID_25D / DEFAULT_POST, uLocalLight)
├── Production.tsx        post-compositor  (<CameraRig />, viewAxisFocus, actorHandWorldPos, SUB_STACK = 'label-above')
└── reports/              qa-inspector     (laporan audit spasial Fase 3.5 + QA G2/G3/G4)
```
