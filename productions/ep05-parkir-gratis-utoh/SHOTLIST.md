# Shotlist — EP05 (`ep05-parkir-gratis-utoh`)

- **Aturan Kamera Mutlak:** `DEFAULT_CREEP = 0` di seluruh hold, seluruh shot eye-level (`|pitch| <= 12°`) kecuali `b5-tally-insert` (makro papan kapur), *camera kick* mikro hanya di momen *impact* (`strikeEnvelope`), dan `sampleCamera(CAMS, TOTAL_FRAMES - 1) === sampleCamera(CAMS, 0)`.

| # | Shot ID | Beat | Gerak Kamera | Fokus Subjek & Catatan |
|---|---|---|---|---|
| 1 | `b1-hook-plak` | B1 | Static hold (`f0`) | Mid-action Utoh menempel kardus `PARKIR GRATIS!` ke tiang `KG_StreetPole_02` + `KICKS` |
| 2 | `b1-pan-syarat` | B1 | `moveSettle` (lateral pan) | Meluncur cepat ke tulisan kecil `(SYARAT: MUNDUR TANPA KAKI TURUN)` + Ebot & papan kapur |
| 3 | `b2-ebot-tanya` | B2 | Static hold | Single medium Ebot + papan kapur |
| 4 | `b2-utoh-bug` | B2 | `moveSettle` | Two-shot Utoh presentasi "biaya kalibrasi gravitasi" menunjuk kardus |
| 5 | `b2-ebot-target` | B2 | Static hold | Medium Ebot menulis `TARGET: 120RB` |
| 6 | `b3-udin-enter` | B3 | `moveSettle` | Wide pelataran Minimarket — Bang Udin masuk mengendarai `MotorUdin3D` |
| 7 | `b3-ebot-stop` | B3 | Static hold | Medium Ebot menunjuk tulisan syarat di kardus |
| 8 | `b3-udin-oleng` | B3 | Static hold + 3× `KICKS` | Medium Udin oleng 3× tapak kaki di atas motor (`strikeEnvelope`) |
| 9 | `b3-tally-6rb` | B3 | Static hold | Insert papan kapur Ebot `UDIN: 3×2RB = 6RB` |
| 10 | `b3-udin-bayar` | B3 | Static hold | Medium Udin sewot menyerahkan uang `6RB` |
| 11 | `b4-raka-flex` | B4 | `moveSettle` | Medium Raka sok keren di atas `MotorRaka3D` |
| 12 | `b4-raka-oleng` | B4 | Static hold + 5× `KICKS` | Medium Raka oleng kiri-kanan 5× tapak kaki (`strikeEnvelope`) |
| 13 | `b4-tally-10rb` | B4 | Static hold | Insert papan kapur Ebot `RAKA: 5×2RB = 10RB` |
| 14 | `b4-raka-pasrah` | B4 | Static hold | Medium Raka lesu merogoh uang jajan |
| 15 | `b5-tally-insert` | B5 | Static hold (makro) | Insert makro papan kapur penuh coretan **`TERKUMPUL: 80RB!`** |
| 16 | `b5-utoh-bos` | B5 | `pullOutReveal` | Utoh tertawa sombong ala bos besar ("bebas dari Mandor Oyen!") |
| 17 | `b6-pakbudi-in` | B6 | `moveSettle` | Wide pelataran — Pak Budi tenang turun & jalan mundur `planted` mendorong motor |
| 18 | `b6-pakbudi-cu` | B6 | Static hold | Medium-CU Pak Budi `smug` berwibawa ("orang saya nggak naik!") |
| 19 | `b6-utoh-lho` | B6 | Static hold + `KICKS` | CU Utoh `shock` + `hatPop: springPop` |
| 20 | `b7-pakbudi-surat` | B7 | `moveSettle` | Two-shot Pak Budi menyodorkan surat resmi RT 04 |
| 21 | `b7-surat-makro` | B7 | Static hold + `KICKS` | Makro frontal 3D `SuratDendaRT3D` berstempel merah **`Rp 200.000`** (`NOINK`) |
| 22 | `b7-tally-320rb` | B7 | Static hold | Medium Ebot polos menunjuk papan kapur **`120RB + 200RB = 320RB!`** |
| 23 | `b7-utoh-shock` | B7 | Static hold + `KICKS` | CU Utoh `shock` mematung (`hatPop: springPop`, keringat) |
| 24 | `b8-belang-cuek` | B8 | Static hold | CU kucing `belang` (`<CatBillboard />`) tidur di atas kardus + slow-blink |
| 25 | `b8-loop-end` | B8 | Static hold (`=== f0`) | Identik matematis Frame 0 (`POSE_HOOK_PLAK`); Utoh pasrah → ekor 15f → loop ke `f0` |
