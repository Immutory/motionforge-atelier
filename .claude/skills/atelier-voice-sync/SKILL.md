---
name: atelier-voice-sync
description: Produce the narration wav and a word-level timing file (words.json) that the whole production syncs to. Use after the script is approved, when voice is re-recorded, or when anything seems out of sync with the narration.
---

# Voice Sync

Every cut, kick and sound effect is timed to `words.json`, so an error here spreads everywhere. Treat it as the master clock.

## Steps
1. Obtain the voice. Keep one steady tone across the short.
2. Convert: `ffmpeg -i input.m4a -ar 48000 -ac 1 productions/<slug>/voice/voice.wav`.
3. Get per-word timestamps from a speech-to-text tool that supports word times. If you only have an SRT, run `python3 pipeline/voice/srt_to_words.py voice.srt productions/<slug>/voice/words.json` and expect to fix times by hand.
4. Format: `[{ "text": "Halo", "start": 0.0, "end": 0.42 }]` with times in seconds.
5. Hand-verify the first word, each beat boundary, and every punchline word by listening.
6. Report total seconds and frames at 30 fps (`durationFromWords` in `engine/core/timeline.ts` adds a closing breath).

## Rules
- Do not edit script wording here. Wording changes go back to `story-architect`.
- If words.json changes after shots are locked, tell `cinematographer` and `sound-designer`, because both re-time.
