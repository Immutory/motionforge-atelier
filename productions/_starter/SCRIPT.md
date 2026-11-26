# Naskah — Starter (Template v3.0 · menunggu G1)

- **Format:** 9:16 · 1080×1920 · 30 fps · **58–75 detik** (fleksibel hingga 90 dtk VO pengguna, kelipatan `90f` · 3,5–3,8 kata/detik)
- **Aturan visual:** ZERO kotak HUD/banner 2D. Teks 2D hanya subtitle + label pembicara (`y ≈ 1485 px`) dan transisi shot (`cut`/`dissolve`/`wipe`/`flash`).
- **Sumber fakta (wajib bila topik faktual/edutainment):**
  - *(URL sumber + tanggal akses)*

---

## Cast Sheet & Suara
| Tokoh | Preset | Suara | Gaya Akting |
|---|---|---|---|
| Bang Utoh | `bangUtoh` | Rekaman asli | Ekspresif tangan kosong, kontras deadpan → shock |
| Mbak Rara | `rara` | Rekaman / TTS lokal | Deadpan tajam |

---

## Tabel Beat (7–9 Beat · Sebab → Akibat · Seamless Loop)

| Beat & Lokasi | Speaker | Dialog (tanda `[ ... ]` = non-verbal) | Aksi & Kamera (*Move → Settle*, `creepRate: 0`) |
|---|---|---|---|
| **B1 · Hook (0–3 dtk)** | `bangUtoh` | *(Kalimat hook singkat)* | *(Visual hook & shot pembuka)* |
| **B2 · Setup** | `rara` | *(Reaksi / setup)* | *(Two-shot simetris, hold mantap)* |
| **B3–B5 · Eskalasi & Snap** | `bangUtoh` | *(Eskalasi komedi/konflik)* | *(Insert 3D / `strikeEnvelope` + `KICKS`)* |
| **B6–B7 · Punchline & Loop** | `bangUtoh` | *(Callback ke hook)* | *(Hard cut loop ke f0)* |
