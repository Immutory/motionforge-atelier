---
name: atelier-voice-sync
description: Produce the narration wav and a word-level timing file (words.json) that the whole production syncs to. Use after the script is approved, when voice is re-recorded, or when anything seems out of sync with the narration.
---

# Voice Sync

Every cut, kick and sound effect is timed to `words.json`, so an error here spreads everywhere. Treat it as the master clock.

## Steps
1. Obtain the voice. Keep one steady tone across the short.
2. Convert & auto-align in one command using local CUDA `faster-whisper`:
   `npm run vo:align -- input.m4a productions/<slug>/voice/words.json --speaker bangUtoh --normalize-wav productions/<slug>/voice/voice.wav`
   *(Fallback manual: `ffmpeg -i input.m4a -ar 48000 -ac 1 productions/<slug>/voice/voice.wav` + `python3 pipeline/voice/srt_to_words.py voice.srt productions/<slug>/voice/words.json`.)*
3. Format: `[{ "text": "Halo", "start": 0.0, "end": 0.42, "speaker": "bangUtoh" }]` with times in seconds.
4. Hand-verify the first word, each beat boundary, and every punchline word by listening.
5. Report total seconds and frames at 30 fps (`durationFromWords` in `engine/core/timeline.ts` adds a closing breath).

## Multi-voice (Bang Utoh + Tio + supporting cast)
- **Bang Utoh** (pemilik kanal) dan **Tio** (rekaman voice note asli teman) **selalu memakai rekaman suara asli** — jangan diganti TTS! Cukup normalkan & sinkronkan otomatis dengan `npm run vo:align -- <vn.ogg> <words.json> --speaker tio --normalize-wav <tio.wav>`.
- **Pak Ujang** & NPC pendukung lainnya menggunakan **Local Commercial-Safe TTS (`Chatterbox-TTS-Indonesian`, MIT/Apache-2.0)** via `npm run vo:gen`:
  - Referensi suara terkunci di `assets/voices/<character>.wav` (mis. `pakUjang.wav`) dengan parameter di `assets/voices/presets.json`.
  - Write `productions/<slug>/voice/script.json` (`[{"speaker":"pakUjang","text":"...","gap":0.24}]`) and run:
    `npm run vo:gen -- --script productions/<slug>/voice/script.json --out-dir productions/<slug>/voice`
  - This automatically generates 48 kHz mono per-line clips (`01_pakUjang.wav`, ...), concatenates `voice.wav` with natural gaps, and builds speaker-tagged `words.json` via `faster-whisper` CUDA!
  - *(Optional cloud alternative: ElevenLabs `eleven_v4` on a commercial plan for flagship takes, documented in `assets/characters/README.md`.)*
- `talkAt` itself has no speaker filter, so pass each character only its own words: `talkAt(WORDS.filter((w) => w.speaker === 'tio'), frame, FPS)`.
- Confirm commercial licensing before a TTS line goes into a monetized upload (avoid `CC-BY-NC` weights such as Fish Speech 1.5 for monetized uploads).

## Rules
- Do not edit script wording here. Wording changes go back to `story-architect`.
- If words.json changes after shots are locked, tell `cinematographer` and `sound-designer`, because both re-time.
