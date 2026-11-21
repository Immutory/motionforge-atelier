---
name: atelier-render-ship
description: Run the stills, preview, master render and mux commands safely, manage disk and temp folders, and deliver the final file. Use when it is time to render, when a render fails or fills the disk, or when asked for 2K export.
---

# Render and Ship

Rendering is slow and disk hungry, so do it only after the visual code is locked.

## Preflight
`npm run doctor` must pass (Node, Python, FFmpeg, numpy).
Set `REMOTION_TMP` to a folder on a large drive. Each bundle copies `public/` into temp and Remotion does not delete it.

## Commands
- Stills: `npm run still -- <slug> --frames 0,100,180 --scale 0.5`
- Previews: `npm run preview -- <slug> --ranges 0-90,90-160`
- Master: `npm run render -- <slug> --scale 1.3333 --crf 16` (1440x2560)
- Sound: `npm run sound -- <slug>`
- Mux: `npm run mux -- <slug>`
- QA: `npm run qa -- out/<slug>/<slug>_final.mp4`

## Gotchas
- Node API renders pass `chromiumOptions: { gl: 'angle' }` (see `pipeline/lib.mjs`). `remotion.config.ts` only affects the CLI.
- Remotion writes a silent audio track, so mux maps video from input 0 and audio from input 1.
- Scratch `.ts` files inside `out/` break `tsc`. Name scratch files `.txt`.
- Expect 2K renders around 4 fps.
- Clean old `remotion-webpack-bundle-*` folders only after asking the user.

## Deliver
Share `out/<slug>/<slug>_final.mp4`, update `PRODUCTION_LOG.md`, and note any open fixes.
