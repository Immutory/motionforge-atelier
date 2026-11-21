# engine/post

Urutan pass (jangan diubah): scene, ink, lens, bloom, OutputPass (tone map netral), grade.

| File | Isi |
|------|-----|
| `PostStack.tsx` | Composer, parameter per frame, `DEFAULT_POST` |
| `passes.ts` | `InkPass` (tepi dari depth) dan `LensPass` (blur depth satu pass) |
| `shaders.ts` | GLSL ink, lens, grade |
| `scale.ts` | `pxScale(tinggiBuffer)` = tinggi / 1920 |

Status: lolos typecheck. Belum diverifikasi lewat render sungguhan, jalankan `npm run still` dulu.
Celah yang diketahui: layer tanpa ink untuk karakter belum ada (outline juga menggaris tepi kartu karakter).
