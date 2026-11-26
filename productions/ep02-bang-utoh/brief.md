# Brief Produksi — EP02 "Konsultan Oyen" (FINAL MASTER v6.1 — Gate G4 LULUS)

- **Judul kerja:** EP02 — Konsultan Oyen
- **Slug:** `ep02-bang-utoh`
- **Format final:** **1 master vertikal 9:16 (1080×1920, 30 fps)** untuk YouTube Shorts, Instagram Reels, dan TikTok. Tanpa versi 16:9.
- **Durasi final terkunci:** **74,33 detik / 2230 frame** (cut loop `f2215`, natural `1.0x`, tanpa `atempo`; 15 VO final + 17 momen non-verbal utuh).
- **Status:** **FINAL MASTER v6.1 — Gate G4 LULUS** (15 VO final & `mix.wav` terkunci utuh, sinematika referensi *Move → Settle* `creepRate: 0`, `roll: 0`, nol clipping 3D).
- **Kontinuitas:** Langsung menyambung cliffhanger EP01 (`ERROR 47 BARIS!`).

---

## Logline (Satu Kalimat)
Langsung setelah kena `ERROR 47 BARIS` di EP01 dan WiFi kos mati, Bang Utoh mengungsi ke Warkop menjelang demo jam 07:00; Bu Siti menepuk laptopnya seperti TV tabung hingga error naik jadi 48, lalu Si Oyen melangkah santai menginjak keyboard hingga berubah hijau `0 ERROR` — namun di Lab FIK ketahuan kodenya ikut terhapus jadi `mmmmmmmeeeeee`, sehingga Si Oyen dapat nilai A sementara Bang Utoh divonis mengulang dari awal (dan video langsung loop ke detik 0).

---

## Pemeran & Suara Final (Natural `1.0x`, Tanpa `atempo`)
| Tokoh | Peran | Sumber Suara Terkunci | Baris / Kata |
|---|---|---|---|
| **Bang Utoh** | Pemeran utama, mahasiswa S1 TI | Rekaman final pengguna `voice/utoh_01–09.wav` | 9 baris / 63 kata |
| **Bu Siti** | Pemilik Warkop 24 Jam (*deadpan*) | Rekaman final pengguna `voice/buSiti_01–03.wav` | 3 baris / 17 kata |
| **Mbak Rara** | Kakak tingkat & asisten Lab FIK (*deadpan* tajam) | Rekaman final pengguna `voice/rara_01–03.wav` | 3 baris / 20 kata |
| **Si Oyen** | "Konsultan" (*deadpan* total, tempo ½, 14f slow blink, 1 meong) | Meong kucing asli (`assets/voices/oyen.wav`) | 1 meong / 0 kata |

---

## Lokasi Resmi (3 Set GLB, `showGround={false}`)
1. **Warkop 24 Jam (`WarkopSet lightId="noon"`, B1–B4):** Pagi 06:45, sinar pagi dari tepi kanopi + 3 bohlam gantung fisik (`WK_Lamp*` berayun dengan `bulbSwingAt()` setelah `PLAK`) + rim layar laptop 3D (merah `47`/`48`, hijau `0 ERROR`, taskbar jam diegetik `06:45` → `06:58`).
2. **Kampung Rawa Sari (`KampungSet mode="siang"`, B5):** Pagi cerah 06:58, *high-angle establishing* → *wide side-scrolling* sepanjang lintasan kurva mulus (tanpa patah 90°), Utoh sprint tangan kosong, Oyen menyusul di belakang tempo ½ tanpa teleport.
3. **Lab Komputer FIK Lt. 2 (`KampusSet lightId="noon"` + `LabProjectorScreen`, B6–B7):** LED plafon + jendela koridor + proyektor `1  mmmmmmmmmmmeeeeeeeeeeeeeee` + Replay Sepia 3D di laptop Warkop (transisi *4-frame white flash*).

---

## Standar Teknis FINAL MASTER v6.1 (Lima Pilar Studio v2.0 + ZERO 2D HUD Boxes)
- **ZERO 2D HUD Boxes:** Tidak ada kotak banner/jam/replay/outro 2D mengambang. Semua informasi (`ERROR 47`, `48 +1!`, `✓ 0 ERROR`, jam `06:45`/`06:58`, replay `CTRL+A → Delete → mmmm`) tampil **diegetik di layar laptop 3D & proyektor 3D**. Satu-satunya teks 2D adalah **subtitle + nama pembicara bersih di bawah (`y ≈ 1485 px`)**.
- **Reference Cinema Camera (`contohvideo/`):** *Move → Settle* dengan `creepRate: 0` dan horizon lurus `roll: 0` di seluruh hold dialog/panggung (nol slow zoom monoton), glide simetris smootherstep `18–32f` (≤ 25 px/f @720p), 2–3 sub-angle kontras per beat, dan DOF *view-axis* ~30–35% durasi.
- **Animasi On Ones & Planted:** `CatBillboard` (`stretch`, `pawRaise`) & `ActorBillboard` (`gait: 'planted'`, `stride`, `headTilt`), nol teleport/skating, *reaction lead* `2f` tertutup kedip 4-frame, *wind-up → 6f hold → 1f strike* pada `PLAK` & `Enter KLAK`, Oyen aktif `pawRaise` di B4 & Replay Sepia B7.

## Umpan EP03
Si Oyen resmi dapat **nilai A** dari Mbak Rara sementara Bang Utoh ngulang — membuka EP03: Bang Utoh terpaksa berguru/jadi asisten Si Oyen di Lab FIK.
