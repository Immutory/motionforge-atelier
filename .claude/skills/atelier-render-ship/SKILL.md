---
name: atelier-render-ship
description: Run stills (JPG or lossless PNG), previews, 4-platform thumbnails, 2K/4K master renders, branding exports, box manifest exports, sound mix, and mux commands safely (Atelier v3.0).
---

# Render and Ship (Atelier v3.0)

Lock visual code and pass `npm run check` (100% green) before master renders.

## Preflight
- `npm run doctor` must pass (Node, Python, FFmpeg, ffprobe, `numpy`, `scipy`, `Pillow`).
- `npm run check` must pass (TypeScript `tsc --noEmit` + all TS & Python tests).
- Set `REMOTION_TMP` to a folder on a large drive before long renders.

## Commands
- **Sidecar AABB Manifests (after Blender `.glb` export)**: `node pipeline/export-boxes.mjs`
- **Stills (JPG look-dev)**: `npm run still -- <slug> --frames 0,100,180 --scale 0.5`
- **Stills (Lossless PNG / 4K Master)**: `npm run still -- <slug> --frames 0,1 --scale 1.5 --png`
- **Previews (30 fps beat clips)**: `npm run preview -- <slug> --ranges 0-90,90-160 --scale 0.5`
- **Master Video**: native `1080×1920` via `npm run render -- <slug>` (`--scale 1.0`, default) or optional 2K supersample `--scale 1.3333 --crf 16`
- **Sound Mix**: `npm run sound -- <slug>` (masters directly to `-16.0 LUFS` / `TP ≤ -1.5 dBTP` + seamless loop crossfade)
- **Mux (Video 0 + Audio 1)**: `npm run mux -- <slug>` (auto-passthrough if `mix.wav` is already mastered in `-17..-13 LUFS / TP ≤ -1.0 dBTP`; pass `--loudnorm` or `--lufs -16` to normalize explicitly)
- **Contact Sheets**: `node pipeline/py.mjs pipeline/make_sheet.py`
- **QA Check**: `npm run qa -- out/<slug>/<slug>_final.mp4`

## Channel Branding & 4-Platform Thumbnails (`charlab`, 14 compositions)
- **Shorts Thumbnails (`shortsthumbs`, `1080 × 1920`)**: Verify **4-platform safe-zone** (`y = 295..1630 px`, `x < 920 px`) covering YT Shorts 2:3, IG/TikTok 3:4, FB/IG 4:5, & right-side UI buttons.
- **YouTube Banner (`youtubebanner`, `2560 × 1440`)**: `npm run still -- youtubebanner --frames 0,1 --scale 1.5 --png` (`3840 × 2160`, `< 6 MB`).
- **YouTube & TikTok Profiles (`youtubeprofile`, `tiktokprofile`, `2048 × 2048`)**: `--scale 1 --png` (`< 4 MB`), canonical `2048×2048` scaling, circular-safe crop.

## Gate G4 Cleanup Protocol
Before closing **Gate G4**, remove obsolete intermediates (`out/<slug>/video_silent.mp4`, orphan TTS drafts in `voice/`, temporary logs, old draft contact sheets, `__pycache__/`, `.blend1`) while keeping 100% of final VO assets (`voice.wav`, `words.json`, `timeline.json`, `rms.json`, `lines.json`, `user_vo/`), active code, `mix.wav`, thumbnail, `UPLOAD.md`, and `<slug>_final.mp4`. Ask the user before deleting old `remotion-webpack-bundle-*` folders in `REMOTION_TMP`.
