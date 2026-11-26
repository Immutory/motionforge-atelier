# Referensi Suara Karakter & Kucing (`assets/voices/`)

Seluruh file audio di folder ini adalah **rekaman/referensi suara yang diberikan langsung oleh pemilik kanal** (48 kHz mono PCM WAV — tanpa suara buatan sintetis).

## Karakter Manusia (Rekaman Asli → `npm run vo:align`)
- `bangUtoh.wav` — Rekaman suara asli pemilik kanal (selalu rekaman asli; preset referensi tersimpan di `presets.json`)
- `tio.wav` — Rekaman suara asli teman (mendukung voice note asli via `npm run vo:align` maupun TTS lokal Take B di `presets.json`)

## Karakter Manusia (Referensi TTS Lokal `Chatterbox-TTS-Indonesian` → `npm run vo:gen`)
13 karakter manusia sudah terdaftar preset-nya di `presets.json`; 12 di antaranya memiliki klip referensi WAV 48 kHz di folder ini (`bangUtoh` & `tio` di atas + 10 karakter pendukung berikut), sedangkan `ebot.wav` menunggu rekaman referensi pemilik kanal:
- `pakUjang.wav` — Pak Ujang (Satpam Kampung)
- `mbakYuni.wav` — Mbak Yuni (Es Buah & Campur)
- `buSiti.wav` — Bu Siti (Warkop 24 Jam)
- `pakBudi.wav` — Pak Budi (Pak RT)
- `raka.wav` — Raka (Pelajar SMA)
- `bangUdin.wav` — Bang Udin (Ojol)
- `arya.wav` — Mas Arya (Host Nusantara)
- `rara.wav` — Mbak Rara (Host / Mahasiswi)
- `dimas.wav` — Bang Dimas (Sidekick Komedi)
- `saka.wav` — Saka Nusantara (Petualang)

## Suara Kucing 2D
- `oyen.wav` — Rekaman suara kucing asli yang diberikan pemilik kanal (langsung dipakai di `sound/mix.py`)
