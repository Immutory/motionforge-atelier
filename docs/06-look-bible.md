# 06. Look Bible "Atelier" (v2.0)

Standar visual, akting, dan kamera MotionForge Atelier — diselaraskan dengan video referensi studio di `contohvideo/` (`(1).mp4` & `(4).mp4`) dan hasil pengukuran numerik di `references/reports/`. Ukur dan sesuaikan memakai skill `atelier-look-match` bila memulai gaya baru.

## Warna dan cahaya
- Siang (`noon`): langit atas biru sedang, horizon pucat, kabut berwarna sama dengan horizon.
- Golden (`amber` / `sore`): matahari rendah hangat, bayangan ungu kebiruan, kabut peach.
- Malam (`night` / `dusk` / `neon`): lampu jalan, jendela, dan bohlam praktis menyala hangat (`GlbSet` otomatis); interior memakai `indoorLight(LIGHTS.xxx)` agar cahaya utama tidak terhalang dinding belakang.
- Bayangan tidak pernah cokelat kusam. Tint dingin hanya di area bayangan.
- Hitam tidak boleh hancur. Wajah terang dan terbaca, tidak neon.
- Preset cahaya, status DOF, dan titik fokus hanya berubah pada **hard cut** (nol pop di tengah shot).

## Ink (`NOINK` aktif)
- Garis dunia 3D (`InkPass`) nyaris hitam, tebal dekat kamera dan tipis di kejauhan.
- Hanya siluet, lompatan kedalaman, dan lipatan tajam — bukan pertemuan lantai-dinding atau horizon.
- Tokoh 2D (`<ActorBillboard />`, `<CatBillboard />`) dan papan nama 3D (`SignMain`, `MenuLine`, `BoardHead`) berada di **layer `NOINK`** (`engine/post/layers.ts`) sehingga memakai garis tinta ungu tua Canvas2D sendiri tanpa outline ganda.

## Tokoh & Animasi Referensi
- **Cast Resmi**: 12 karakter Indonesia (`CAST_PRESETS`) + 3 kucing 2D (`CAT_PRESETS`: `oyen`, `abu`, `belang` — selalu 2D, tidak pernah mesh 3D).
- **Proporsi & Garis**: kepala sedikit lebih lebar dari tinggi, garis luar tebal-tipis (`#1f192d`), bayangan wajah lembut, `build: 'slim' | 'regular' | 'big'`, dan 13 ekspresi (lidded deadpan `neutral`/`tired` kontras tajam dengan `shock`, `angry`, `laugh`, `strain`).
- **Artikulasi Organik**: *organic noodle-limbs* Bezier 3-titik pada lengan & kaki, *walk body bob* 3–6% tinggi tubuh, siklus *torso lean* 1°–7°, `headTilt` independen dari badan, `sitHeight` menapak alami di atas bangku/kursi (`SpotMeta.seatY`), dan `view: 'back'` penuh untuk putaran 180°.
- **Timing & Impact**: kedip 4-frame (`0.5 / 1 / 1 / 0.5`) di setiap pergantian ekspresi, reaksi mendarat 2 frame sebelum kata (`reactionFrame`), *planted gait* (`gait: 'planted'`, nol selip), *RMS-gated lip-sync* (`talkGated`), `strikeEnvelope` (4f wind-up → 6f hold → 1f strike → 8f follow-through), dan `springPop`.
- **Anti-Clipping**: seluruh billboard wajib lolos `checkBillboardSweep` pada sudut `yaw` kamera aktif dan `checkCounterVisibility` saat di balik konter.

## Kamera — Sinematika Referensi `contohvideo/`
- **Paradigma Utama**: *Purposeful 3D Move → Confident Settle* (`DEFAULT_CREEP = 0`). Hold dialog dan panggung duduk **mantap stabil (`creepRate: 0`, `roll: 0`)** — **TIDAK menggunakan slow zoom-in monoton pada setiap shot!**
- **Variasi Gerak 3D (`engine/core/camera.ts`)**:
  - `moveSettle` (glide mulus `smootherstep` 18–32f, peak ≤ 25 px/f @720p → settle mantap),
  - `pullOutReveal` (macro prop → mundur logaritmis `path: 'dolly'` membuka panggung utuh),
  - `orbitArc` (geser orbit melengkung 3D menonjolkan paralaks ruang),
  - `topDownInsert` (flat-lay 90° overhead di atas meja/prop),
  - `craneTransition` (aerial bird's-eye menukik ke eye-level / horizontal tracking).
- **Transisi & Ritme**: hard cut pada lompatan skala/ruang besar, **Cross-Dissolve (8–14f)**, **Foreground Object Wipe (8–12f)**, dan **White Flash (4–6f)** pada pergantian realitas via `Shot.transition`.
- **Safe Framing**: seluruh shot kunci wajib lolos `checkSafeFraming` (0 wajah/telinga/papan nama terpotong; bersih dari zona subtitle 9:16 `y ≈ 76–88%`).
- **Pure Cinema**: ZERO kotak HUD/banner 2D di atas dunia 3D.

## Kedalaman
- Blur latar (`LensPass`) pada sekitar sepertiga durasi: close-up dan macro insert. Wide & establishing tetap tajam.
- Fokus pada mata atau prop hero 3D.
