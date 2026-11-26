# Brief Produksi — EP05 (`ep05-parkir-gratis-utoh`)

- **Judul:** *"PARKIR GRATIS 0 RUPIAH, TAPI KELUARNYA BAYAR 10 RIBU?!"* (Bang Utoh #5)
- **Kontinuitas Canon:** Sekuel langsung dari **EP04 (`ep04-karyawan-bakmie`)** melalui jalur voting **`RESIGN`** — utang Bang Utoh di Bakmie Tio melonjak dari `90RB → 120RB` akibat potongan ayam VIP & biaya training Mandor Oyen.
- **Lokasi:** `KampungSet` (`mode="siang"`) — pelataran depan **Minimarket (`KG_RukoWest1_Body_3`, `X[-34.76, -30.44]`, `Z = 2.25`)**, **ATM (`KG_P5_ATM_BoothBody`, `X[-28.82, -27.47]`, `Z = 2.78`)**, dan tiang lampu jalan **`KG_StreetPole_02` (`[-30.00, 0, 4.25]`)**.
- **Format Master:** 9:16 vertikal (`1080×1920`, `30 fps`), target **`66,0–72,0 dtk`** (`1980` atau `2160` frame, kelipatan bersih `BREATH_PERIOD = 90`, *seamless hard-cut loop* `fLoopCut → f0`).
- **Acuan Visual & Komedi:**
  1. `contohvideo/download.mp4` — formula komedi *loophole* kampung + eskalasi korban + twist matematika/uang, 3D *soft-lit* siang bersih + karakter 2D vektor utuh + prop interaktif 3D nyata.
  2. `contohvideo/Panduan Analisis dan Produksi Video Animasi - Google Gemini (1).mp4` — *hook mid-action* Frame 0 + *lateral pan* cepat ke tulisan kecil diegetik, `topDownInsert`, `strikeEnvelope` impact + camera kick mikro, `DEFAULT_CREEP = 0`.
- **Cast Resmi (`engine/cast/`):**
  - Manusia (`<ActorBillboard />`): `bangUtoh` (dalang skema), `ebot` (pencatat papan kapur deadpan), `bangUdin` (korban #1 ojol, 3 tapak = 6RB), `raka` (korban #2 anak SMA freestyle, 5 tapak = 10RB), `pakBudi` (final boss Pak RT 04, mematahkan *loophole* & memberi Surat Denda 200RB).
  - Kucing (`<CatBillboard />` wajib): `belang` (kucing calico RT 04 yang santai tidur di atas kardus `PARKIR GRATIS` di Beat 8).
- **Aturan Visual & Audio Studio:**
  - **ZERO 2D HUD:** seluruh aturan, tally uang, & surat denda berupa prop diegetik 3D (`NOINK` pada tekstur teks).
  - **Subtitle:** putih polos (`#ffffff`, `label-above`, zona `1485–1690 px`), mati di ekor loop.
  - **Zero Clipping:** wajib lulus Fase 3.5 Spatial Audit (`checkPropOverlap`, `checkBillboardSweep`, `checkSafeFraming`, `checkSightline`, `MAX_STEP <= 0,12 m/f`).
  - **Audio Mastering:** `-14.5 LUFS` / `-1.5 dBTP` (lulus `npm run qa` rentang `-17..-13 LUFS` sekaligus dekat target `-14 LUFS`).
- **Distribusi 4 Platform & Voting EP06:** YouTube Shorts, Instagram Reels, Facebook Reels, TikTok (`UPLOAD.md` + `ep05_thumbnail_9x16.{png,jpg}` safe-zone `y = 295..1630, x < 920`) dengan voting EP06: **`BALIK KE OYEN`** vs **`JUAL LAPTOP`**.
