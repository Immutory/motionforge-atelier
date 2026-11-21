---
name: atelier-cast-craft
description: Create and animate original 2D bean-head characters as lit billboards in a 3D scene. Use for character design, expressions, poses, blink timing, walk cycles, prop interaction, crowds, and text badges that must fit inside their box.
---

# Cast Craft

Characters are Canvas2D drawings placed on camera-facing cards inside the 3D world. They look like they belong because they are lit by the scene and cast a contact shadow.

## Drawing (engine/cast/bean.ts)
- Design canvas 600x1000, soles at y = 960, supersample 2x.
- Round head slightly WIDER than tall (H/W 0.93), uneven outline (thin top-left, ~3x thicker bottom-right), bean torso, adult ~3.5 head-heights. Limbs are single thin ink strokes (~0.055 head width), hands are ink dots, no fingers.
- A small face library: neutral (lidded deadpan), happy, shock (big white sclera, tiny pupils), sad, smug. Eyes sit close (0.26 head width apart) and shift toward the facing side. Always draw tapered brows. No blush, no eye catchlights.
- Keep your own ink color for characters so the world outline pass can skip them.

## Animation
- Blink for 4 frames at irregular intervals (0.5-2.3 s), offset per actor.
- Walk: small body bob, slight lean, feet planted without sliding.
- Acting follows narration: react before the word that triggers it.

## Physical interaction
Characters sit, hold, point, count, open doors. If a prop is described, the character touches it.

## Text on cards
Always shrink-to-fit with `ctx.measureText()` in a loop so text never exceeds its box. Badges stay within the central safe area.

## Originality
Invent a cast of your own with its own silhouette, palette and names. Do not trace reference characters.

## Readability traps
A swing drawn with a single rope can read as a hanging. Use two ropes. A foreground bush cut by the edge looks like a green ball. Make props recognizable or remove them.
