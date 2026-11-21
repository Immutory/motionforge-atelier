# engine/post

Urutan pass (jangan diubah): scene, ink (world-only, `needsSwap = false`), lens (thin-lens DOF), bloom, `OutputPass` (NeutralToneMapping + sRGB), grade.

| File | Isi |
|------|-----|
| `layers.ts` | Konstanta kontrak `NOINK = 3` untuk billboard karakter, langit, awan, efek |
| `PostStack.tsx` | Composer, parameter per frame, `DEFAULT_POST`, `GRADE_PRESETS` |
| `passes.ts` | `InkPass` (world-only depth + normal/crease + oklusi karakter) dan `LensPass` (thin-lens scatter-as-gather) |
| `shaders.ts` | GLSL world normal, ink mask/composite (gamma-space + fog tint), thin-lens DOF, display grade + vignette |
| `scale.ts` | `pxScale(tinggiBuffer)` = tinggi / 1920 |
