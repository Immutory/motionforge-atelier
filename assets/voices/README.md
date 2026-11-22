# Referensi Suara Karakter (`assets/voices/`)

Folder ini menyimpan klip audio referensi pendek (**5–10 detik, suara bersih tanpa musik latar**) untuk *zero-shot voice cloning* lokal menggunakan **`Chatterbox-TTS-Indonesian`** (lisensi komersial aman MIT / Apache 2.0).

## Penamaan Otomatis
Beri nama file persis seperti `CastPresetId` di `engine/cast/nusantara.ts`, maka `npm run vo:gen` akan otomatis memakainya saat mensintesis dialog karakter tersebut:

- `pakUjang.wav` — **Pak Ujang** (Satpam Kampung · **terkunci** untuk `npm run vo:gen`, parameter di `presets.json`)
- `tio.wav` — **Tio** (contoh referensi **suara asli teman** — untuk produksi Tio selalu memakai voice note asli teman lewat `npm run vo:align`, bukan TTS!)
- `mbakYuni.wav` — Mbak Yuni (Pedagang Es Buah & Campur)
- `buSiti.wav` — Bu Siti (Warung / Warkop)
- `rara.wav` — Rara (Mahasiswi)
- `dimas.wav` — Bang Dimas
- `pakBudi.wav` — Pak Budi (Pak RT)
- `raka.wav` — Raka (SMA)
- `bangUdin.wav` — Bang Udin (Ojol)

> **Catatan**: **Bang Utoh** (suara pemilik channel) dan **Tio** (suara voice note asli teman) selalu menggunakan rekaman suara manusia asli, lalu langsung di-normalisasi & dibuatkan `words.json` lip-sync otomatis dengan `npm run vo:align`.
