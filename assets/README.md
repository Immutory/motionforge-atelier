# assets

Hanya aset dengan lisensi jelas. Catat setiap aset di tabel ini.

| File | Sumber | Lisensi | Catatan |
|------|--------|---------|---------|
| `characters/*` | Prosedural Canvas2D (`engine/cast/` & `productions/charlab/`) | Karya sendiri (MIT) | Katalog sheet, frame, & preview animasi 13 karakter orisinal (termasuk Bang Utoh & Ebot) + 3 kucing 2D |
| `sets/*`, `public/sets/*.glb`, `public/sets/*.boxes.json` | Model 3D Blender 5.3 (`assets/sets/blend/bang_utoh_sets.blend`) | Karya sendiri (MIT) | 4 Set Dunia 3D (`KampungSet`, `WarkopSet`, `KostSet`, `KampusSet`) + manifest AABB terintegrasi di `engine/sets/` |
| `sets/textures/*` | Dibuat dengan `sets/generate_pbr_textures.py` | Karya sendiri (MIT) | 54 peta tekstur PBR (`_diff` + `_norm`), termasuk varian lapuk v2 (cat kusam, plester retak, keramik teras, genteng berlumut, seng berkarat, aspal tambalan) |
| `voices/*` | Rekaman pemilik kanal & preset `Chatterbox-TTS-Indonesian` (`presets.json`) | Milik sendiri / MIT-Apache-2.0 | 13 preset manusia di `presets.json` (termasuk `ebot`), 12 klip referensi WAV 48 kHz + `oyen.wav` (`ebot.wav` menunggu rekaman pengguna) |

Folder: `characters/` (katalog karakter, 70 frame, sheet, & preview), `sets/` (file Blender `.blend`, skrip upgrade, & tekstur PBR di `sets/textures/`), `voices/` (klip referensi suara terkunci & `presets.json`).
