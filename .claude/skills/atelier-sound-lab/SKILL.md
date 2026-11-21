---
name: atelier-sound-lab
description: Synthesize sound effects and build the final audio mix with ducking and loudness targets. Use for SFX, music bed, mix, ducking, LUFS, or any request about making the video sound good and stay in sync.
---

# Sound Lab

Sound sells the picture. Every visible action should have a sound at the frame of impact.

## Workflow
1. Lock picture timing first. Timing changes later mean re-running the mix.
2. Write `productions/<slug>/audio/events.json`: `{ "events": [{ "at": 1.25, "sfx": "whoosh", "gain_db": -6 }] }`.
3. Add new effects as functions in `sound/sfx.py` using `sound/dsp.py` primitives (sine, noise, envelope, filters, sweep).
4. Run `npm run sound -- <slug>`. Output: `out/<slug>/mix.wav`, 48 kHz mono.
5. Mux with `npm run mux -- <slug>`, which applies loudnorm.

## Mix targets
- SFX about -6 dB, music about +3 dB relative to the SFX bed, voice unchanged.
- SFX duck under voice.
- Final -14 LUFS (acceptable -16 to -13), true peak below -1.5 dBTP.

## Effect ideas
whoosh for cuts, thud for impacts, ding for reveals, pop for small actions, snap for breaks. Layer two sounds for big moments (a low thud plus a bright crack).

## Music
Write an original short loop. Do not sample copyrighted music.
