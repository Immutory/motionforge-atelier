---
name: atelier-quality-gate
description: Verify stills, previews and final video against numeric and visual checks and produce a scored report with a numbered fix list. Use after every production phase, before every approval request, and when the user asks "is it good enough" or "cek kualitas".
---

# Quality Gate

A gate is a promise that the next phase can start without redoing this one.

## The four gates
- **G1 Script:** facts sourced, 55-70 s, user approved.
- **G2 Stills:** hero stills approved for style, proportion, light and palette.
- **G3 Motion:** per-beat previews approved for camera, acting and timing.
- **G4 Master:** final mp4 passes automated QA and the user approved.

## Four pillars checklist (every shot)
1. Grounded: nothing floats or clips.
2. Light: every light has a source, characters separate from background.
3. Acting: characters use props and react to the words.
4. Camera: no static hold, 2-3 sub-angles per long beat.

## Scored review
Score color, lighting, ink, textures, characters, depth, composition from 1 to 10. Each fix: number, frame, owner agent, one-line change. Keep each verdict under 200 words and look at 1-3 images at a time.

## Automated checks
`npm run qa -- out/<slug>/<slug>_final.mp4` reports black frames, frozen spans and loudness.

## Fail fast
If more than two scores are below 5, stop and return to the owning phase instead of polishing.
