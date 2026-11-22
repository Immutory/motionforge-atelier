# Katalog Karakter Orisinal — MotionForge Atelier

Seluruh karakter, sheet, dan preview animasi di folder ini adalah **karya prosedural orisinal** milik studio ini (Canvas2D di dunia 3D Remotion + Three.js), bebas hak cipta pihak ketiga, dan siap dipakai untuk konten YouTube / Shorts / Reels.

## Struktur Folder
- `sheets/` — Contact sheet gabungan siap lihat & referensi casting:
  - `sheet_bang_utoh_main.jpg` — **Pemeran Utama #1: Bolohoutoh alias Bang Utoh** (Mahasiswa S1 Teknik Informatika: Hero, Turnaround 4 sudut, 4 Mood, & Cast Utama)
  - `sheet_bang_utoh_anim_strip.jpg` — Filmstrip 8-frame uji animasi 30 fps Bang Utoh (Jalan Bouncy -> Lip-Sync Laptop -> Shock Headphone Loncat!)
  - `sheet_kucing_oyen_main.jpg` — **Karakter Kucing 2D: Si Oyen (Tabby Oranye Warkop 24 Jam)** (diadaptasi dari referensi `12221_Cat_v1_l3` + `Cat_diffuse.jpg`: Hero, Turnaround 4 sudut, 4 Mood & Pose, & Showcase Warkop 24 Jam + Bang Utoh + Mpus Abu & Si Belang)
  - `sheet_kucing_oyen_anim_strip.jpg` — Filmstrip 8-frame uji animasi 30 fps Si Oyen di Warkop 24 Jam (Jalan 4 Kaki -> Duduk & Lip-Sync Meong -> Kaget Loncat Ekor Mekar!)
  - `sheet_modular_rig_showcase.jpg` — **Modular Rig Showcase (`engine/cast/`)**: 12 ekspresi + comic FX, 15 hand prop, 4 stance (`stand/walk/sit/jump`), 4 sudut pandang (`front/threeQuarter/side/back`), auto lip-sync `words.json`, & override NPC 1-baris
  - `sheet_master_indonesia_all.jpg` — **Master Cast 8 Karakter Pendukung Ala Indonesia** (Baris atas: Host Nusantara `ID-1..ID-4`, Baris bawah: NPC Warga Sehari-hari `ID-5..ID-8`)
  - `sheet_warga_indonesia.jpg` — 4 NPC Sehari-hari Indonesia (`ID-5 Pak Budi`, `ID-6 Bu Siti`, `ID-7 Raka SMA`, `ID-8 Bang Udin Ojol`)
  - `sheet_warga_anim_strip.jpg` — Filmstrip 8-frame uji animasi 30 fps Pak RT & Bang Ojol
  - `sheet_nusantara.jpg` — 4 Host Nusantara (`ID-1 Mas Arya`, `ID-2 Mbak Rara`, `ID-3 Bang Dimas`, `ID-4 Saka Nusantara`)
  - `sheet_nusantara_anim_strip.jpg` — Filmstrip 8-frame uji animasi 30 fps Mas Arya & Mbak Rara
  - `sheet_global_prototypes.jpg` — 3 prototipe gaya global (`A · Atelier Indie`, `B · Squircle Plush`, `C · Ink-Pop Comic`)
  - `sheet_master_catalog.jpg` — Gabungan Prototipe Global + Host Nusantara
- `frames/` — Still 3D terpisah untuk tiap lineup, close-up, turnaround, rig showcase, dan frame animasi (46 file JPG).
- `previews/` — Klip preview animasi gerak 30 fps (semua lulus `npm run qa`):
  - `bang_utoh_anim_preview.mp4` (**Pemeran Utama #1 — Bolohoutoh alias Bang Utoh**)
  - `kucing_oyen_anim_preview.mp4` (**Karakter Kucing 2D — Si Oyen di Warkop 24 Jam**)
  - `nusantara_anim_preview.mp4` (Mas Arya & Mbak Rara)
  - `warga_anim_preview.mp4` (Pak Budi & Bang Udin Ojol)

## Cara Pakai Modular Rig (`engine/cast/`) di Produksi Baru
Seluruh 12 karakter (dipimpin **Pemeran Utama #1: `bangUtoh`**) resmi terintegrasi di `engine/cast/` (`ActorBillboard`, `CAST_PRESETS`, `talkAt`, `blinkLidAt`) dan dipakai langsung di cetak biru `productions/_starter/`.

```tsx
import { ActorBillboard, blinkLidAt, talkAt } from '../../engine';

<ActorBillboard
  actor="bangUtoh"                         // Pemeran Utama #1: Bolohoutoh (S1 Teknik Informatika)
  position={[-1, 0, 0]}
  faceTo={pose.pos}
  pose={{
    face: 'happy',                         // 12 ekspresi: neutral|happy|laugh|shock|sad|angry|smug|skeptical|nervous|tired|idea|focus
    blink: blinkLidAt(frame, 1, FPS),      // kedip 4-frame otomatis
    talk: talkAt(WORDS, frame, FPS),       // auto lip-sync vokal dari words.json
    stance: 'stand',                       // stand | walk | sit | jump
    view: 'threeQuarter',                  // front | threeQuarter | side | back
    leftArm: 'hold',
    leftProp: 'coffeeCup',                 // 15 prop termasuk laptop & coffeeCup!
    rightArm: 'hold',
    rightProp: 'laptop',
  }}
/>
```

## Daftar Lengkap 12 Tokoh Ala Indonesia (`CAST_PRESETS`)
| Preset ID | Nama | Ciri Visual | Prop & Reaksi | Cocok untuk Konten |
|---|---|---|---|---|
| `bangUtoh` | **Bolohoutoh (Bang Utoh) — Pemeran Utama #1** | Mahasiswa S1 Teknik Informatika: Hoodie HMTI navy + lanyard KTM + badge `</>`, headphone over-ear LED cyan, kacamata kotak tech, rambut berjambul, ransel laptop | Laptop kode VS Code + cup es kopi susu · **headphone loncat** | **Pemeran Utama #1**, teknologi, kuliah IT, storytelling, komedi |
| `arya` | **Mas Arya** | Batik Kawung indigo-emas, peci beludru | Buku fakta · peci loncat | Host sejarah, fakta unik Nusantara |
| `rara` | **Mbak Rara** | Hijab sage-teal, jaket denim, kacamata emas | Mikrofon podcast · kacamata naik | Host kreator muda, edukasi |
| `dimas` | **Bang Dimas** | Jaket coach hijau-krem, topi baseball miring | Gelas es teh manis sedotan · topi loncat | Komedi, tongkrongan, sidekick |
| `saka` | **Saka Nusantara** | Iket batik merah-emas, rompi tenun, mata melirik | Gulungan peta/lontar · iket naik | Kisah rakyat, legenda, petualangan |
| `pakBudi` | **Pak Budi (Pak RT)** | Kemeja kotak + pulpen saku, sarung tenun, kumis tebal | Gelas belimbing kopi tubruk beruap | Bapak komplek, ronda, warga senior |
| `buSiti` | **Bu Siti (Warung)** | Cepol tinggi + jepit merah, daster bunga, celemek | Spatula / sodet warung | Emak-emak, pemilik warung, gosip gang |
| `raka` | **Raka (Pelajar SMA)** | Seragam putih-abu, dasi + badge OSIS, ransel merah | Smartphone | Cerita sekolah, pelajar, penanya muda |
| `bangUdin` | **Bang Udin (Ojol)** | Jaket hijau-hitam strip reflektor, helm visor biru | HP peta rute · helm loncat | Abang ojol, kurir, cerita jalanan kota |
| `pakUjang` | **Pak Ujang (Satpam Kampung)** | Seragam satpam, topi, kumis | Senter · patroli Pos Ronda RT 04 | Keamanan lingkungan, komedi ronda |
| `tio` | **Tio (Bakmie Ayam)** | Tanpa topi, rambut belah samping rapi, kacamata bingkai tebal gelap, kulit sawo matang gelap, badan agak besar (`build: 'big'`), kemeja + celemek | Sodet & mangkuk bakmie · gerobak di `bakmieTioVendor` | Pedagang kaki lima, kuliner kampung |
| `mbakYuni` | **Mbak Yuni (Es Buah)** | Hijab, celemek pedagang | Gelas es buah · gerobak di `esBuahYuniVendor` | Pedagang kaki lima, minuman segar |
| `oyen` (`<CatBillboard />`) | **Si Oyen (Kucing Warkop)** | Tabby oranye-jahe loreng coklat (tanda M dahi, mata emas pupil celah, moncong/dada/cakar krem, ekor cincin) | 5 stance (`sit`/`stand`/`walk`/`sleep`/`jump`), 4 sudut, angkat cakar (toe-beans), lip-sync meong, ekor mekar saat shock | Maskot Warkop 24 Jam, komedi kampung, sidekick Bang Utoh (plus varian `abu` & `belang`) |

## Suara Karakter (casting terkunci)
Supaya suara tiap tokoh konsisten di semua episode, pakai suara di bawah ini. Bang Utoh selalu memakai rekaman suara asli pemilik kanal.
Suara pendukung dibuat dengan TTS ElevenLabs (model `eleven_v4`, bahasa Indonesia) dari pustaka suara; uji coba disetujui 22 Nov 2026.

| Tokoh | Sumber suara | Voice ID | Ciri |
|---|---|---|---|
| `bangUtoh` | Rekaman asli pemilik kanal | – | Suara utama, narator |
| `tio` | ElevenLabs: Genesius | `2lcxSPWqG78QhJnKPyMX` | Pria dewasa, santai, ekspresif |
| `mbakYuni` | ElevenLabs: Damayanti | `DrldqYsaKOiBNak7yH5o` | Ceria, ekspresif, nyeletuk |
| `pakUjang` | ElevenLabs: Arga Dahana | `CyYm0pDg8bfmn6QckQk4` | Paruh baya, logat Jawa, serius (straight man) |

Catatan lisensi: pakai suara TTS di video yang dimonetisasi hanya bila paket akun ElevenLabs mengizinkan pemakaian komersial
(umumnya paket berbayar). Tokoh lain belum punya suara terkunci; tambahkan barisnya di sini saat pertama kali dicasting.

## Perintah Regenerasi Sheet & Preview
```bash
npm run still -- charlab --frames 0,30,60,90 --scale 0.5
npm run still -- nusantara --frames 0,30,60,90,120,150,160,170,180,192,204,217,232 --scale 0.5
npm run still -- warga --frames 0,30,60,90,120,150,160,170,180,192,204,217,232 --scale 0.5
npm run still -- riglab --frames 0,30,60,90 --scale 0.5
npm run still -- bangutoh --frames 0,30,60,90,150,160,170,180,192,204,217,232 --scale 0.5
npm run still -- kucingoyen --frames 0,30,60,90,150,160,170,180,192,204,217,232 --scale 0.5
npm run preview -- bangutoh --ranges 150-240 --scale 0.5
npm run preview -- kucingoyen --ranges 150-240 --scale 0.5
npm run preview -- nusantara --ranges 150-240 --scale 0.5
npm run preview -- warga --ranges 150-240 --scale 0.5
node pipeline/py.mjs pipeline/make_sheet.py
```
