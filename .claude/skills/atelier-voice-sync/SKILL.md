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

## Multi-voice (Hybrid: Rekaman Asli + TTS Lokal 11 Karakter + Kucing Asli)
- **Semua 12 karakter manusia + kucing 2D sudah terkunci** di `assets/voices/` (`assets/voices/presets.json` menyimpan setelan optimal per karakter, termasuk `pakUjang` & `tio` Take B `cfg=0.35, ex=0.52`).
- **Bang Utoh** (pemilik kanal) selalu memakai rekaman suara asli (`npm run vo:align`). **Tio** bisa memakai voice note asli teman (`"audio": "..."`) maupun TTS lokal (`presets.json` Take B).
- **Mode Hybrid `script.json`**: gabungkan rekaman asli (`"audio"`), TTS lokal (`"text"` — singkatan Indonesia seperti `RT 04`, `WiFi`, `S1 TI`, `24 jam` dinormalisasi otomatis!), dan suara kucing (`{"speaker":"oyen","audio":"assets/voices/oyen.wav"}`) dalam 1 file:
  ```bash
  npm run vo:gen -- --script productions/<slug>/voice/script.json --out-dir productions/<slug>/voice --seed 42
  ```
  Otomatis merender 48 kHz mono per baris, menggabungkan `voice.wav` dengan jeda natural, dan menghasilkan `words.json` ber-`"speaker"` via `faster-whisper` CUDA (dengan *auto-offline cache fallback*).
- Verifikasi kesiapan GPU/engine kapan saja dengan `npm run vo:doctor`.
- `talkAt` itself has no speaker filter, so pass each character only its own words: `talkAt(WORDS.filter((w) => w.speaker === 'tio'), frame, FPS)`.
- Confirm commercial licensing before a TTS line goes into a monetized upload (Chatterbox-TTS-Indonesian is MIT/Apache-2.0 safe; avoid `CC-BY-NC` weights such as Fish Speech 1.5 for monetized uploads).

## Rules
- Do not edit script wording here. Wording changes go back to `story-architect`.
- If words.json changes after shots are locked, tell `cinematographer` and `sound-designer`, because both re-time.
