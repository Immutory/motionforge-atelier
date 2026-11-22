---
name: atelier-render-ship
description: Run stills (JPG or lossless PNG), previews, 2K/4K master renders, YouTube branding exports (4K Banner & 2048x2048 Profile), sound mix, and mux commands safely. Use when rendering, exporting 4K/FHD assets, or debugging render failures.
---

# Render and Ship

Rendering is slow and disk hungry, so lock visual code and pass `npm run check` before final renders.

## Preflight
- `npm run doctor` must pass (Node, Python, FFmpeg, numpy, Pillow).
- `npm run check` must pass (TypeScript `tsc --noEmit` + JS & Python unit tests).
- Set `REMOTION_TMP` to a folder on a large drive before long video renders.

## Commands
- **Stills (JPG look-dev)**: `npm run still -- <slug> --frames 0,100,180 --scale 0.5`
- **Stills (Lossless PNG / 4K Master)**: `npm run still -- <slug> --frames 0,1 --scale 1.5 --png`
- **Previews (30 fps beat clips)**: `npm run preview -- <slug> --ranges 0-90,90-160 --scale 0.5`
- **Master Video**: `npm run render -- <slug> --scale 1.3333 --crf 16`
- **Sound Mix**: `npm run sound -- <slug>`
- **Mux (Video 0 + Audio 1)**: `npm run mux -- <slug>`
- **Contact Sheets & Sync**: `node pipeline/py.mjs pipeline/make_sheet.py`
- **QA Check**: `npm run qa -- out/<slug>/<slug>_final.mp4`

## YouTube Channel Branding Exports
- **YouTube Banner (`youtubebanner`, base `2560 × 1440`)**:
  - Render native 4K lossless PNG: `npm run still -- youtubebanner --frames 0,1 --scale 1.5 --png` (`3840 × 2160`, `blur: 0`).
  - Verify YouTube safe zones: **Mobile `1546 × 423`**, **Desktop `2560 × 423`**, **TV `2560 × 1440`** (file size `< 6 MB` for YouTube upload).
- **YouTube Profile Picture (`youtubeprofile`, native vector `2048 × 2048`)**:
  - Render native lossless PNG: `npm run still -- youtubeprofile --frames 0,1 --scale 1 --png` (`< 4 MB` YouTube cap) + `800 × 800` supersampled export.
  - Verify circular crop at Channel (`440px`), Mobile (`136px`), and Comment (`56px`) sizes.

## Gotchas
- Node API renders pass `chromiumOptions: { gl: 'angle' }` (`pipeline/lib.mjs`). `remotion.config.ts` only affects the CLI.
- Remotion writes a silent audio track, so mux always maps video from input 0 and audio from input 1.
- Scratch `.ts` files inside `out/` break `tsc`; name scratch files `.txt`.
- Clean old `remotion-webpack-bundle-*` folders only after asking the user.

## Deliver
Share `out/<slug>/<slug>_final.mp4` (or exported PNG/JPG assets), verify visually via contact sheet/preview, update `PRODUCTION_LOG.md`, and note any open items.
