# YouTube Agent Skills (`yt-*`)

Folder ini berisi **11 YouTube Agent Skills** ([Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill), lisensi MIT) yang **dipisahkan** dari skill produksi animasi internal MotionForge Atelier (`.claude/skills/atelier-*`).

## Struktur Pemisahan Skill

1. **Skill Produksi Animasi (`atelier-*`)** -> tetap berada di [`.claude/skills/`](../../.claude/skills/)
   - `atelier-story-forge`, `atelier-voice-sync`, `atelier-shot-plan`, `atelier-set-craft`, `atelier-cast-craft`, `atelier-light-grade`, `atelier-ink-lens`, `atelier-sound-lab`, `atelier-quality-gate`, `atelier-look-match`, `atelier-render-ship`.
2. **Skill Manajemen & Optimasi YouTube (`yt-*`)** -> dipisahkan di [`.agents/youtube-skills/`](./)
   - Didaftarkan secara eksplisit melalui [`.agents/skills.json`](../skills.json).
   - Profil suara & karakter Bang Utoh tersimpan di [`.claude/youtube/voice.md`](../../.claude/youtube/voice.md) dan [`voice.md`](./voice.md).

## Daftar 11 Skill YouTube & 6 Python Tools

| Skill | Fungsi Utama | Python Tool |
| :--- | :--- | :--- |
| [`yt-script`](./yt-script/SKILL.md) | Menulis naskah YouTube dari 21 formula hook + skor hook 5 dimensi | `node pipeline/py.mjs .agents/youtube-skills/yt-script/hookscore.py --hook "..."` |
| [`yt-package`](./yt-package/SKILL.md) | Merancang & me-lint pasangan Judul + Thumbnail agar tidak duplikat/terpotong | `node pipeline/py.mjs .agents/youtube-skills/yt-package/title.py --title "..." --thumb "..."` |
| [`yt-seo`](./yt-seo/SKILL.md) | Menulis deskripsi (2 baris pertama di atas lipatan), 3 target kueri pencarian, & tag | — |
| [`yt-chapters`](./yt-chapters/SKILL.md) | Membuat timestamp chapter dari SRT yang tervalidasi aturan YouTube (`00:00`, min 3, ≥10 dtk) | `node pipeline/py.mjs .agents/youtube-skills/yt-chapters/chapters.py <file.srt>` |
| [`yt-edit`](./yt-edit/SKILL.md) | Mengubah transkrip `.srt` menjadi Edit Decision List (dead air, filler, retake) | `node pipeline/py.mjs .agents/youtube-skills/yt-edit/deadair.py <file.srt>` |
| [`yt-shorts`](./yt-shorts/SKILL.md) | Mencari potongan Shorts (20–55 detik) dari video panjang + kalimat pembuka baru | — |
| [`yt-retention`](./yt-retention/SKILL.md) | Membaca CSV retensi penonton untuk mendeteksi hook leak, cliff, dan slide | `node pipeline/py.mjs .agents/youtube-skills/yt-retention/retention.py <file.csv>` |
| [`yt-viral`](./yt-viral/SKILL.md) | Meranking ide/video kompetitor berdasarkan outlier multiple terhadap median channel | `node pipeline/py.mjs .agents/youtube-skills/yt-viral/swipe.py <file.json> --min 2.0` |
| [`yt-comment`](./yt-comment/SKILL.md) | Triase komentar ke 4 kategori, draf balasan sesuai `voice.md`, & rekomendasi pin | — |
| [`yt-plan`](./yt-plan/SKILL.md) | Menyusun jadwal mingguan yang realistis (1 anchor, 1 video ringan, 3 Shorts) | — |
| [`yt-audit`](./yt-audit/SKILL.md) | Audit channel secara menyeluruh yang menghasilkan SATU perbaikan prioritas tertinggi | — |
