---
name: atelier-shot-plan
description: Design the shot list, camera keys, cuts, kicks, flashes and depth-of-field for a vertical 9:16 short. Use for any camera, framing, angle, push-in, transition, or "kenapa terasa kaku" problem, and whenever shots.ts needs to be written or revised.
---

# Shot Plan

Static cameras read as slideshows. The audience feels energy through how the camera moves and how often the view changes.

## Data model (productions/<slug>/shots.ts)
- `SHOTS`: id, from/to frames, light preset, note.
- `CAMS`: `{ frame, pose:{pos,look,fov,roll}, glide?, cut? }`. A key means "the pose reached at this frame".
- `KICKS`: `{ frame, strength, length? }` impact shakes.

## Grammar
- Break each 4-6 second beat into 2-3 sub-angles with strong size contrast: wide two-shot, medium reaction, macro prop insert.
- Hard cut on big changes of size or place. Otherwise glide 18-40 frames with smootherstep.
- Rolls of 3-5 degrees for tension. No hand-held wobble.
- `sampleCamera` adds a slow push-in to every hold, because a perfectly still hold is flagged as a freeze by QA.
- Kick on punch words. Impact shakes flip sign each frame and decay in 7 frames.
- Use a 4-frame white flash when reality changes (dream to cold fact).

## Sync
Visual reactions land 0-3 frames before their word. Use `reactionFrame(words, index, fps, lead)`.

## Vertical safe zone
Keep action and badges in the central ~60% of the width. Props nearer than ~2 m to a lens become giant cut-off blobs, so move the camera or remove the prop.

## Depth of field
Plan blur for about one third of screen time: close-ups and inserts. Wides stay sharp. Focus on the eyes.

## Check
Render a preview per beat before asking for G3 approval.
