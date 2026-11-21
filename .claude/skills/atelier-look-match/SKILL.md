---
name: atelier-look-match
description: Measure a reference style with numbers and tune your own look toward it in parallel sandboxes with one owner per file. Use when the user says "make it look like X", wants to match a style, or asks to improve overall visual quality across several areas at once.
---

# Look Match

Adjectives like "warmer" or "punchier" do not converge. Numbers and side-by-side images do.

## 1. Measure first
For each topic (motion, depth, textures, characters, lighting, outlines, grade) write a short report with measured values in `references/reports/<topic>.md`. Use `references/measure-template.md`. Reports become the source of truth for everyone.

## 2. Own the files
One agent owns each file group. See `docs/04-file-ownership.md`. Agents edit only their own files.

## 3. Sandboxes
Copy `productions/<slug>` to `productions/<slug>_cam`, `_world`, `_mat`, `_char`, `_post`. Each owner works in a sandbox and renders stills.

## 4. Merge
Merge owned files back into the main folder, run `npm run typecheck`, then re-sync every sandbox from main before the next round.

## 5. Verify
A fresh `qa-inspector` compares side-by-side sheets (yours vs reference), scores each area, and returns a numbered fix list. Route each fix to its owner.

## 6. Contracts
Shared constants are contracts (the no-ink layer, the DOF table, the light presets). If you change one, tell every reader.

## Study, not copy
References teach the look. Your story, characters, voice and shots stay original. Reference frames are private study material. Never publish them.
