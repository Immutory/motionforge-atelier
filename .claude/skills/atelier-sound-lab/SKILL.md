---
name: atelier-sound-lab
description: Synthesize sound effects, music beds, ambience, loop crossfades, and final mixes with ducking and `-16.0 LUFS / TP <= -1.5 dBTP` loudness targets (Atelier v4.0).
---

# Sound Lab (Atelier v4.0)

Sound sells the picture. Every visible impact (`strikeEnvelope`, footsteps, prop drops, poster `PLAK!`, cat meows) has a frame-accurate sound.

## Workflow
1. Lock picture timing and `totalFrames` (`TOTAL_FRAMES % 90 === 0`) first.
2. Write `productions/<slug>/audio/events.json` supporting synthesized SFX (`"sfx"`), external 48 kHz WAV clips (`"file": "assets/voices/oyen.wav"`), music segments, ambience, `"master": { "lufs": -16.0, "true_peak_db": -1.5 }`, and **`"loop"`** crossfade aligned with `loopCutFrame` (`TOTAL_FRAMES - 15`) so Short loops wrap seamlessly with zero clicks!
3. Add new synthesized effects in `sound/sfx.py` using `sound/dsp.py` primitives (safe rounding `round(seconds * SR)` and short-duration guards).
4. Run `npm run sound -- <slug>`. Output: `out/<slug>/mix.wav`, 48 kHz mono, mastered directly to **`-16.0 LUFS`** and **`TP ≤ -1.5 dBTP`** (runaway-gain protected on silence/short clips).
5. Mux with `npm run mux -- <slug>` — auto-passthrough when already inside `-17..-13 LUFS` and `TP ≤ -1.5 dBTP` (zero double loudnorm, preserving 0.5 dB AAC headroom!).

## Mix Targets
- Music ~`-12 LU` below voice, ambience ~`-20 LU`, SFX ~`-6 dB` (ducked under voice + non-verbal windows).
- Studio master target: **`-16.0 LUFS`**, **`TP ≤ -1.5 dBTP`** (QA pass band: **`-17` to `-13 LUFS`**, **`TP ≤ -1.0 dBTP`**).
- Original synthesized music & SFX only — never sample copyrighted audio.
