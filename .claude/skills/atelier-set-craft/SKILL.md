---
name: atelier-set-craft
description: Build procedural 3D sets, props and painted canvas textures with physical grounding. Use whenever the user asks for an environment, room, street, prop, material, or fixes clipping, floating objects, or props blocking the camera.
---

# Set Craft

The world is made of code, so it is light, fast and fully yours. The cost is that nothing is free: you must place every object deliberately.

## Principles
1. **Grounded.** Each object touches a floor, table, wall or hook. Nothing hovers. Nothing passes through another solid.
2. **Human scale.** Doors ~2.1 m, tables ~0.75 m, adults ~1.7 m. Characters stand at y = 0.
3. **One set per mood.** A different atmosphere deserves a different room, different material and different light.
4. **Painted, not photographic.** Canvas2D textures with simple shapes. Paint seams as darker tints rather than adding line geometry.
5. **Muted palette.** Desaturate walls and floors so characters and key props pop.

## Sight-line culling
Before rendering, test each camera ray in `CAMS` against set solids and hide any solid in the way. Also hide any prop closer than ~2 m to a lens.

## Efficiency
Merge static geometry with `BufferGeometryUtils.mergeGeometries` when a set has many repeated pieces.

## Assets
Use only code, your own drawings, or CC0 props listed in `assets/README.md`. Recolor imported materials by name to match the palette.

## Check
Look-dev stills from every camera. Ask: does anything float, clip, or crop awkwardly?
