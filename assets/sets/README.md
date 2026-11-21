# Paket Set Dunia 3D Khas Bang Utoh — Blender 5.3 + Three.js (`engine/sets/`)

Seluruh set dunia 3D di folder ini **dimodelkan langsung di Blender 5.3.0**, disimpan dalam file master `.blend` agar bisa diedit bebas kapan saja di Blender, dan diekspor ke `.glb` (`public/sets/*.glb`) untuk langsung dipakai di Remotion + Three.js dengan konversi otomatis ke shader `twoTone()`, `InkPass` garis komik 3D, dan `UnrealBloomPass` HDR glow!

## File Sumber & Output
- **Master Blender File:** [bang_utoh_sets.blend](file:///c:/xampp/htdocs/motionforge-atelier/assets/sets/blend/bang_utoh_sets.blend)
  - Berisi 3 koleksi terpisah rapi di Outliner (`WarkopSet`, `KostSet`, `KampusSet`) + `_PreviewRig` (kamera & lampu preview Blender).
  - Untuk mengedit set tertentu di Blender, cukup klik ikon mata pada koleksi yang diinginkan, ubah geometri/warnanya, lalu ekspor koleksi tersebut ke `public/sets/<nama>.glb` (`Export glTF 2.0`, `Selected Objects`, `+Y Up`).
- **Asset glTF Siap Render (`public/sets/`):**
  - `public/sets/warkop.glb` — **Warkop Ngoding 24 Jam** (konter kayu, etalase kaca gorengan, mie instan, termos, toples kerupuk, kanopi hijau-krem, neon box `WARKOP 24 JAM`, 3 bohlam gantung, meja & kursi plastik bakso)
  - `public/sets/kost.glb` — **Kamar Kost Anak S1 Teknik Informatika** (meja dual-monitor kode menyala, PC RGB, kursi gaming, kasur + guling, jendela berteralis + tirai, poster `</> S1 INFORMATIKA`, papan `DEADLINE!`, rak buku + dus mie instan, dispenser galon, kipas angin berdiri)
  - `public/sets/kampus.glb` — **Lab Komputer S1 Teknik Informatika** (whiteboard lebar + flowchart algoritma, jam dinding, lambang `TI`, AC split, proyektor plafon, 2 lampu panel LED, meja dosen, 4 workstation PC lab + kursi biru, jendela koridor & pintu kelas)
- **Contact Sheet & Stills:** `assets/sets/sheets/sheet_blender_sets_showcase.jpg` & `assets/sets/frames/*.jpg`

## Cara Pakai 1 Baris di Produksi Mana Pun (`engine/sets/`)
```tsx
import {
  ActorBillboard,
  Stage,
  LIGHTS,
  WarkopSet,
  WARKOP_SPOTS,
  KostSet,
  KOST_SPOTS,
  KampusSet,
  KAMPUS_SPOTS,
  indoorLight,
} from '../../engine';

// Contoh: Bang Utoh di Warkop Ngoding saat senja/malam
const light = indoorLight(LIGHTS.amber);

<Stage light={light} showGround={false} camPos={pose.pos} camLook={pose.look}>
  <WarkopSet lightId="amber" />
  <ActorBillboard actor="bangUtoh" position={WARKOP_SPOTS.center} faceTo={pose.pos} pose={{ face: 'happy', rightProp: 'laptop' }} />
</Stage>
```

## Regenerasi Showcase & Sheet
```bash
npm run still -- setlab --frames 0,30,60,90 --scale 0.5
node pipeline/py.mjs pipeline/make_sheet.py
```
