# productions

Satu folder per video. `_starter` adalah cetak biru, jangan dipakai langsung untuk video akhir.

Buat produksi baru:

```bash
npm run forge:new -- <slug> "Judul Video"
```

Perintah itu menyalin `_starter`, mengganti nama komponen, dan mendaftarkannya di `registry.ts`.

Isi satu produksi:

```text
<slug>/
├── brief.md              story-architect
├── SCRIPT.md             story-architect
├── PRODUCTION_LOG.md     showrunner
├── voice/                voice-director   (voice.wav, words.json)
├── audio/events.json     sound-designer
├── shots.ts              cinematographer
├── set.tsx               set-designer
├── cast.ts               character-animator
├── look.ts               light-colorist
├── Production.tsx        post-compositor (wiring)
└── reports/              qa-inspector
```
