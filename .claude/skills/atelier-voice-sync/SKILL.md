---
name: atelier-voice-sync
description: Produce the 48 kHz mono narration wav, RMS envelopes, beat timeline, and word-level timings (words.json, timeline.json, rms.json) locked to multiples of 90 frames for Atelier v3.0.
---

# Voice Sync (Atelier v3.0)

`words.json`, `timeline.json`, and `rms.json` are the master clock of the production.

## Steps
1. Verify environment health with `npm run vo:doctor` (verifies Python, CUDA/CPU fallback, Chatterbox, faster-whisper, torchaudio, perth, soundfile, ffmpeg — exits non-zero if any dependency is missing).
2. **Real human recordings (`bangUtoh`, `tio`, user VO)**: normalize atomically (temp-file + `os.replace`) to 48 kHz mono and align words via:
   `npm run vo:align -- input.m4a productions/<slug>/voice/words.json --speaker bangUtoh --normalize-wav productions/<slug>/voice/voice.wav`
3. **Multi-character / Hybrid episodes (`script.json` / `build_voice.py`)**:
   - **13 human cast presets (including `ebot`)** are configured in `assets/voices/presets.json`, with **12 locked human WAV references + `oyen.wav`** on disk (`ebot.wav` awaits user reference recording).
   - Combine user recordings (`"audio"`), commercial-safe local TTS (`Chatterbox-TTS-Indonesian`, auto-normalizes `RT04`, `RT 100`, `WiFi`, `S1 TI`, `24 jam`), and cat SFX (`assets/voices/oyen.wav`) via `npm run vo:gen`.
4. **Loop-Locked Frame Budget**: Snap `totalFrames` to a clean multiple of **`90 frames`** (`BREATH_PERIOD = 90`, `loopCutFrame = totalFrames - 15`). Shorts target `58–75 s` (up to `90 s` for expressive user VO).
5. Hand-verify punchline words & beat boundaries within 2 frames at 30 fps. Clean up any temporary/draft TTS `.wav` files once final `voice.wav` is locked.

## Rules
- Never edit script wording; route wording changes to `story-architect`.
- Confirm commercial licensing before any TTS line enters a monetized upload (Chatterbox-TTS-Indonesian MIT/Apache-2.0 safe; avoid `CC-BY-NC` weights).
- Always notify `cinematographer` and `sound-designer` if `words.json` changes after blocking.
