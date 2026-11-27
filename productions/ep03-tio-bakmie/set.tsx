import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { KampungSet, NOINK, boxFromCenter, boxFromFoot, useTwoToneMaterial, type NamedBox, type Vec3 } from '../../engine';

/**
 * Milik agent set-designer. EP03 seluruhnya di Area Pedagang Rawa Sari (`KampungSet mode="malam"`), di depan gerobak
 * Bakmie Ayam Tio (`KG_Grb_BakmieTio_*`, x −14,22…−12,68 · z 17,25…18,01 · konter y 0,96 · serve ledge y 0,92).
 * Prop tambahan EP03 (semua menapak/bertumpu, terverifikasi `checkPropOverlap` di tests/ep03-spatial.test.ts):
 * dua kursi pembeli (kayu untuk Utoh, plastik merah untuk Oyen), pijakan papan Tio & Yuni, nota bon tulisan tangan
 * di etalase, karton `DICARI KARYAWAN`, mangkok Utoh, es teh, 3 piring topping Oyen, 2 ikan asin, ngengat, dan uap.
 *
 * Aturan duduk (revisi G4, atelier-set-craft + atelier-cast-craft): setiap tokoh duduk di KURSI SENDIRI yang kecil
 * (bukan bangku panjang), dan kartu billboard-nya digeser ke tepi kursi yang menghadap kamera aktif (`seatCardPos`).
 * Dengan begitu dudukan selalu di BELAKANG kartu dari sudut kamera mana pun: kaki & tangan tidak pernah "nembus".
 */

// ---------------------------------------------------------------------------------------------
// Titik & ukuran (meter, Three.js Y-up)
// ---------------------------------------------------------------------------------------------

/** Tinggi permukaan serve ledge gerobak (`KG_Grb_BakmieTio_ServeLedge` max y). */
export const LEDGE_TOP_Y = 0.92;
/** Tinggi konter gerobak (`KG_Grb_BakmieTio_Counter` max y). */
export const COUNTER_TOP_Y = 0.96;
/** Tinggi dudukan kursi pembeli (`seatY`, dipakai `sitHeight`). */
export const BENCH_SEAT_Y = 0.46;
export const SEAT_Y = BENCH_SEAT_Y;
/** Tinggi pijakan papan tempat Tio berdiri di balik gerobak (agar dada & bahu tampak di atas konter). */
export const PALLET_TOP_Y = 0.3;

export const EP03_SPOTS = {
  /** Pusat kursi kayu Utoh; Utoh duduk menghadap gerobak (+z). Posisi kartu final = `seatCardPos`. */
  utohSeat: [-13.38, 0, 16.8] as Vec3,
  /** Pusat kursi plastik Oyen (y = dudukan). */
  oyenSeat: [-12.8, BENCH_SEAT_Y, 16.8] as Vec3,
  /** Oyen masuk dari timur menjauhi kamera samping (terlihat di B3) lalu melompat ke kursinya. */
  oyenEnter: [-11.95, 0, 16.95] as Vec3,
  oyenHopFrom: [-12.4, 0, 16.82] as Vec3,
  /** Tio berdiri di atas pijakan di balik dandang, menghadap pembeli (−z). */
  tio: [-13.05, PALLET_TOP_Y, 18.4] as Vec3,
  /** Mbak Yuni di balik gerobak es buah (spot `esBuahYuniVendor`, pijakan setara). */
  yuni: [-9.62, PALLET_TOP_Y, 18.38] as Vec3,
  /** Benda di serve ledge. */
  bowl: [-13.38, LEDGE_TOP_Y, 17.17] as Vec3,
  esTeh: [-13.17, LEDGE_TOP_Y, 17.18] as Vec3,
  plates: [
    [-13.045, LEDGE_TOP_Y, 17.18],
    [-12.92, LEDGE_TOP_Y, 17.18],
    [-12.795, LEDGE_TOP_Y, 17.18],
  ] as Vec3[],
  /** Nota bon tulisan tangan, diselipkan di depan kaca etalase. */
  board: [-13.93, 1.35, 17.25] as Vec3,
  /**
   * Karton `DICARI KARYAWAN` berdiri di atas tutup etalase (`KG_Grb_BakmieTio_EtalaseTop` y 1,57), tepat di atas
   * papan bon, di sisi barat gerobak. Revisi G4 R-2: posisi lama (−13,56; 1,30) berada di garis kamera barat → wajah
   * Tio. Kini ≥ 0,6 m ke barat dari garis pandang wajah Tio di semua shot (dites `ep03-spatial`).
   */
  sign: [-13.94, 1.675, 17.33] as Vec3,
  /** Bohlam gerobak (tujuan terbang ngengat). */
  bulb: [-13.45, 1.86, 17.57] as Vec3,
} as const;

export const BOARD_SIZE: [number, number] = [0.36, 0.3];
export const SIGN_SIZE: [number, number] = [0.3, 0.2];

/**
 * Dandang EP03 (revisi G4 R-3): pengganti `KG_Grb_BakmieTio_DandangPot/Rim/Broth` + serokan bawaan yang setinggi
 * dagu Tio (bibir 1,33) sehingga dari kamera rendah (faceoff, oyen-meong) hanya mata Tio yang tampak.
 * Dandang rebus lebar-pendek (bibir 1,205), duduk di `KG_Grb_BakmieTio_StoveBase` (y 1,01), digeser 0,14 m ke timur
 * dari sumbu Tio (x −13,05) supaya mulut dandang + uap tidak segaris kamera → wajah Tio. Tangan sodet Tio tetap
 * menjangkau bibir barat dandang (x −13,05).
 */
export const DANDANG = { x: -12.91, z: 17.62, baseY: 1.01, radius: 0.14, height: 0.18 } as const;
export const DANDANG_TOP_Y = DANDANG.baseY + DANDANG.height + 0.015;
/**
 * Uap dandang (R-7): keluar dari sisi timur mulut dandang lalu condong ke timur (angin malam), alfa diturunkan.
 * `driftX` = pergeseran x di puncak naik (m). Dipakai komponen `Steam` DAN tes garis pandang wajah Tio.
 */
export const DANDANG_STEAM = {
  source: [DANDANG.x + 0.05, DANDANG_TOP_Y + 0.005, DANDANG.z - 0.02] as Vec3,
  count: 6,
  size: 0.7,
  alpha: 0.24,
  driftX: 0.22,
} as const;

/** Satu gumpal uap (relatif terhadap sumber). `s` = sisi sprite (m), `a` = opasitas. */
export type SteamPuff = { x: number; y: number; s: number; a: number };
export type SteamOpts = { count?: number; size?: number; alpha?: number; driftX?: number };

/** Posisi gumpal uap pada frame tertentu (pure, dipakai render & tes). */
export function steamPuffs(frame: number, { count = 6, size = 1, alpha = 0.34, driftX = 0 }: SteamOpts = {}): SteamPuff[] {
  const period = 54;
  return Array.from({ length: count }, (_, i) => {
    const t = ((frame + i * Math.round(period / count)) % period) / period;
    return {
      x: Math.sin((frame + i * 23) * 0.06) * 0.05 * size * (0.4 + t) + driftX * t,
      y: t * 0.62 * size,
      s: (0.1 + t * 0.22) * size,
      a: Math.sin(Math.PI * t) * alpha,
    };
  });
}

/**
 * Piring ayam (R-8) didorong Tio dari konter (belakang, sisi Tio) ke serve ledge: offset awal dari posisi akhir,
 * ±0,12 m, lalu meluncur `PLATE_SLIDE_FRAMES` f (ease-out) dan turun 4 cm dari konter (0,96) ke ledge (0,92).
 * Arah sedikit ke barat (ke Tio) agar piring ketiga tidak menyerempet `KG_Grb_BakmieTio_Post_NE`.
 */
export const PLATE_SLIDE_FROM: Vec3 = [-0.042, 0, 0.113];
export const PLATE_SLIDE_FRAMES = 5;

/** Posisi piring `i` pada frame; `null` bila belum muncul. Tanpa `platesFrom` = perilaku lama (langsung di tempat). */
export function platePosAt(i: number, frame: number, plates: number, platesFrom?: readonly number[]): Vec3 | null {
  const p = EP03_SPOTS.plates[i];
  if (!platesFrom) return i < plates ? p : null;
  const from = platesFrom[i];
  if (from === undefined || frame < from) return null;
  const u = Math.min(1, (frame - from) / PLATE_SLIDE_FRAMES);
  const k = 1 - (1 - u) ** 3; // ease-out: dorongan lalu berhenti
  const dz = PLATE_SLIDE_FROM[2] * (1 - k);
  const z = p[2] + dz;
  // Masih di atas konter (z ≥ 17,25) = 4 cm lebih tinggi dari ledge; turun mulus di bibir konter.
  const onCounter = Math.min(1, Math.max(0, (z - 17.22) / 0.05));
  return [p[0] + PLATE_SLIDE_FROM[0] * (1 - k), p[1] + (COUNTER_TOP_Y - LEDGE_TOP_Y) * onCounter, z];
}
/** Kursi pembeli (persegi, setengah sisi `half`). */
export const STOOLS = {
  utoh: { center: [-13.38, 16.8] as [number, number], half: 0.17, color: '#8b5a34' },
  oyen: { center: [-12.8, 16.8] as [number, number], half: 0.15, color: '#c8343a' },
} as const;

export { seatCardPos } from '../../engine';
const PALLET = { x0: -13.45, x1: -12.65, z0: 18.15, z1: 18.65 };
const PALLET_YUNI = { x0: -10.0, x1: -9.3, z0: 18.13, z1: 18.63 };

/** Kotak AABB semua prop tambahan EP03 (dipakai audit spasial; palet pedagang memakai mesh berbilah dari kampung.glb). */
export const EP03_PROP_BOXES: NamedBox[] = [
  ...Object.entries(STOOLS).map(([k, s]) => ({
    name: `EP03_Stool_${k}`,
    min: [s.center[0] - s.half, 0, s.center[1] - s.half] as Vec3,
    max: [s.center[0] + s.half, BENCH_SEAT_Y, s.center[1] + s.half] as Vec3,
  })),
  boxFromCenter('EP03_BonBoard', EP03_SPOTS.board, [BOARD_SIZE[0], BOARD_SIZE[1], 0.02]),
  boxFromCenter('EP03_SignKaryawan', EP03_SPOTS.sign, [SIGN_SIZE[0], SIGN_SIZE[1], 0.02]),
  boxFromFoot('EP03_Bowl', EP03_SPOTS.bowl, 0.15, 0.08, 0.15),
  boxFromFoot('EP03_EsTeh', EP03_SPOTS.esTeh, 0.07, 0.13, 0.07),
  ...EP03_SPOTS.plates.map((p, i) => boxFromFoot(`EP03_Plate${i}`, p, 0.09, 0.03, 0.09)),
  // Dandang + kuping (±x 0,025) di atas tungku; tinggi sampai bibir.
  {
    name: 'EP03_Dandang',
    min: [DANDANG.x - DANDANG.radius - 0.025, DANDANG.baseY, DANDANG.z - DANDANG.radius],
    max: [DANDANG.x + DANDANG.radius + 0.025, DANDANG_TOP_Y, DANDANG.z + DANDANG.radius],
  },
];

/** Mesh bawaan kampung.glb yang diganti prop EP03 (mangkok siap saji di ledge = mangkok Utoh milik EP03). */
export const EP03_HIDE_NAMES = [
  'KG_Grb_BakmieTio_ReadyBowl',
  'KG_Grb_BakmieTio_ReadyMie',
  // Gagang sayur bawaan menghalangi POV Tio -> Utoh; Tio memegang sodet sendiri.
  'KG_Grb_BakmieTio_LadleHandle',
  // R-3: dandang bawaan (bibir y 1,33) + serokan (gagang s.d. 1,63) menenggelamkan Tio dari kamera rendah;
  // diganti `EP03_Dandang` yang pendek & bergeser ke timur.
  'KG_Grb_BakmieTio_DandangPot',
  'KG_Grb_BakmieTio_DandangRim',
  'KG_Grb_BakmieTio_DandangBroth',
  'KG_Grb_BakmieTio_SerokanBasket',
  'KG_Grb_BakmieTio_SerokanHandle',
];

// ---------------------------------------------------------------------------------------------
// Timeline prop (pure, dites)
// ---------------------------------------------------------------------------------------------

/** Satu baris nota: nama pesanan (kiri) + harga (kanan). `text` = gabungan untuk tes/aksesibilitas. */
export type BonLine = { item: string; price: string; text: string; from: number; total?: boolean };

/** Daftar pesanan di nota bon Utoh (tulisan tangan Tio). Frame ditulis tepat setelah kata pemicu (`EP03_BON_FRAMES`). */
export function bonLinesAt(frame: number, at: Readonly<Record<'mie' | 'pangsit' | 'ayam' | 'esteh' | 'curhat' | 'total', number>>): BonLine[] {
  const L = (item: string, price: string, from: number, total = false): BonLine => ({ item, price, text: `${item} ${price}`, from, total });
  const all: BonLine[] = [
    L('1. Mie ayam', '15rb', at.mie),
    L('2. Pangsit', '5rb', at.pangsit),
    L('3. Ayam (Oyen) x3', '45rb', at.ayam),
    L('4. Es teh', '5rb', at.esteh),
    L('5. Curhat', '20rb', at.curhat),
    L('Total', '90rb', at.total, true),
  ];
  return all.filter((l) => frame >= l.from);
}

// ---------------------------------------------------------------------------------------------
// Komponen kecil
// ---------------------------------------------------------------------------------------------

const BOARD_PX: [number, number] = [480, 400];

/** Lama tulisan tangan satu baris bon (frame); huruf muncul bertahap agar insert tidak beku. */
export const BON_WRITE_FRAMES = 20;

const HAND_FONT = '"Ink Free", "Segoe Print", "Comic Sans MS", cursive';
const INK = '#1e3a9a';

/** Acak deterministik per huruf (tulisan tangan tidak boleh berkedip antar frame). */
const jitter = (seed: number) => {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};

/** Tulis teks huruf demi huruf dengan goyangan baseline, ukuran, & kemiringan kecil seperti pulpen di tangan. */
function handText(g: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, seed: number, align: 'left' | 'right' = 'left') {
  g.font = `${px}px ${HAND_FONT}`;
  const widths = [...text].map((ch) => g.measureText(ch).width * 0.97);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'right' ? x - total : x;
  [...text].forEach((ch, i) => {
    const j = jitter(seed * 31 + i);
    g.save();
    g.translate(cx, y + j * 3 + Math.sin(i * 0.7 + seed) * 1.2);
    g.rotate(jitter(seed * 17 + i) * 0.09 - 0.02);
    g.font = `${px * (1 + jitter(seed * 7 + i) * 0.06)}px ${HAND_FONT}`;
    g.fillText(ch, 0, 0);
    g.restore();
    cx += widths[i];
  });
  return total;
}

/** Nota bon kertas bergaris, ditulis tangan pulpen biru; total dilingkari spidol merah. */
const BonBoard: React.FC<{ lines: BonLine[]; frame: number }> = ({ lines, frame }) => {
  const progress = lines.map((l) => Math.min(1, (frame - l.from + 1) / BON_WRITE_FRAMES));
  const key = lines.map((l, i) => `${l.text}:${progress[i].toFixed(2)}`).join('|');
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    [c.width, c.height] = BOARD_PX;
    const g = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    // Kertas nota agak kekuningan, tepi atas sobekan.
    g.fillStyle = '#f6f0dc';
    g.beginPath();
    g.moveTo(0, 14);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, 8 + (jitter(x) + 0.5) * 12);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.closePath();
    g.fill();
    // Garis buku biru muda + margin merah.
    g.strokeStyle = 'rgba(90,140,210,0.45)';
    g.lineWidth = 2;
    for (let y = 120; y < H - 10; y += 44) {
      g.beginPath();
      g.moveTo(10, y + 6);
      g.lineTo(W - 10, y + 6);
      g.stroke();
    }
    g.strokeStyle = 'rgba(210,70,70,0.55)';
    g.beginPath();
    g.moveTo(52, 30);
    g.lineTo(52, H - 6);
    g.stroke();
    // Judul tulisan tangan + garis bawah goyang.
    g.fillStyle = INK;
    const tw = handText(g, 'Bon Utoh', 70, 60, 40, 3);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(68, 70);
    g.quadraticCurveTo(68 + tw / 2, 76, 70 + tw, 68);
    g.stroke();
    // Daftar pesanan: nama kiri, harga kanan, huruf muncul bertahap seperti ditulis.
    lines.forEach((l, i) => {
      const p = progress[i];
      const y = 120 + i * 44;
      const total = Math.ceil((l.item.length + l.price.length) * p);
      const itemShown = l.item.slice(0, Math.min(l.item.length, total));
      const priceShown = l.price.slice(0, Math.max(0, total - l.item.length));
      g.fillStyle = l.total ? '#b3141f' : INK;
      const px = l.total ? 34 : 29;
      if (l.total) {
        // Garis pemisah sebelum total.
        g.strokeStyle = INK;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(300, y - 30);
        g.lineTo(W - 24, y - 33);
        g.stroke();
      }
      handText(g, itemShown, 62, y, px, 11 + i * 5);
      if (priceShown) handText(g, priceShown, W - 28, y, px, 41 + i * 5, 'right');
      if (l.total && p >= 1) {
        // Lingkaran spidol merah di total.
        g.strokeStyle = '#d0182a';
        g.lineWidth = 4;
        g.beginPath();
        g.ellipse(W - 80, y - 10, 70, 28, -0.06, 0.2, Math.PI * 2 + 0.5);
        g.stroke();
      }
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    // Bidang menghadap −z (ke pembeli/kamera); sedikit miring seperti kertas yang diselipkan.
    // Kertas bergoyang halus tertiup angin malam (hidup di insert, bukan frame beku).
    <mesh
      position={EP03_SPOTS.board}
      rotation={[Math.sin(frame * 0.11) * 0.06, Math.PI + Math.sin(frame * 0.07 + 1) * 0.05, 0.035 + Math.sin(frame * 0.13) * 0.018]}
      ref={(m) => m?.layers.set(NOINK)}
      name="EP03_BonBoard"
    >
      <planeGeometry args={BOARD_SIZE} />
      <meshBasicMaterial map={tex} toneMapped={false} color="#d6d0c2" transparent alphaTest={0.5} />
    </mesh>
  );
};

const SignKaryawan: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = 240;
    const g = c.getContext('2d')!;
    g.fillStyle = '#c99a62';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#3a2412';
    g.textAlign = 'center';
    g.font = '900 52px "Comic Sans MS", "Segoe Print", sans-serif';
    g.fillText('DICARI', c.width / 2, 100);
    g.fillText('KARYAWAN', c.width / 2, 170);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    // Berdiri di tutup etalase, sedikit miring seperti karton yang disandarkan (sudut turun ≤ 5 mm, tetap di tutup).
    <mesh position={EP03_SPOTS.sign} rotation={[0, Math.PI, 0.03]} ref={(m) => m?.layers.set(NOINK)} name="EP03_SignKaryawan">
      <planeGeometry args={SIGN_SIZE} />
      <meshBasicMaterial map={tex} toneMapped={false} color="#cfc6b6" />
    </mesh>
  );
};

/** Gumpalan lembut untuk uap & sayap ngengat. */
function blobTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Uap naik berulang (dandang backlit oleh bohlam; ayam panas di piring). `size` = pengali skala & tinggi naik. */
const Steam: React.FC<{ frame: number; position: Vec3; name: string } & SteamOpts> = ({ frame, position, name, ...opts }) => {
  const tex = useMemo(() => blobTexture('rgba(255,244,225,0.85)'), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group name={name} position={position}>
      {steamPuffs(frame, opts).map((p, i) => (
        <sprite key={i} position={[p.x, p.y, 0]} scale={[p.s, p.s, p.s]} ref={(m) => m?.layers.set(NOINK)}>
          <spriteMaterial map={tex} transparent opacity={p.a} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
};

/** Bentang sayap ngengat (m) saat terbuka penuh & tinggi sprite. */
export const MOTH_SPAN = 0.17;
export const MOTH_H = 0.12;

/**
 * Tekstur ngengat (R-9): siluet 2 lobus per sisi (sayap depan besar + sayap belakang kecil), krem pucat dengan
 * garis tinta cokelat tua, bintik mata, badan & antena gelap — kontras terhadap latar malam biru-ungu.
 */
function mothTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 180;
  const g = c.getContext('2d')!;
  const cx = 128;
  const cy = 92;
  g.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    // Sayap belakang (lobus bawah).
    g.beginPath();
    g.ellipse(cx + sd * 44, cy + 30, 44, 30, sd * 0.5, 0, Math.PI * 2);
    g.fillStyle = '#e9d3a2';
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = '#3b2412';
    g.stroke();
    // Sayap depan (lobus atas, lebih besar).
    g.beginPath();
    g.ellipse(cx + sd * 62, cy - 18, 64, 38, -sd * 0.38, 0, Math.PI * 2);
    g.fillStyle = '#fbf0d4';
    g.fill();
    g.stroke();
    // Bintik mata + garis tepi sayap.
    g.beginPath();
    g.arc(cx + sd * 74, cy - 20, 13, 0, Math.PI * 2);
    g.fillStyle = '#8a5a2b';
    g.fill();
    g.beginPath();
    g.arc(cx + sd * 74, cy - 20, 5, 0, Math.PI * 2);
    g.fillStyle = '#2a170a';
    g.fill();
    g.beginPath();
    g.ellipse(cx + sd * 62, cy - 18, 46, 22, -sd * 0.38, sd > 0 ? -0.6 : Math.PI - 0.9, sd > 0 ? 0.9 : Math.PI + 0.6);
    g.lineWidth = 4;
    g.strokeStyle = '#a07040';
    g.stroke();
    // Antena.
    g.beginPath();
    g.moveTo(cx + sd * 4, cy - 48);
    g.quadraticCurveTo(cx + sd * 14, cy - 76, cx + sd * 30, cy - 84);
    g.lineWidth = 4;
    g.strokeStyle = '#2a170a';
    g.stroke();
  }
  // Badan.
  g.beginPath();
  g.ellipse(cx, cy, 12, 50, 0, 0, Math.PI * 2);
  g.fillStyle = '#5a3a1e';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#2a170a';
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ngengat yang terbang dari dompet kosong Utoh menuju bohlam; kepak = sayap menyempit/melebar (sprite selalu hadap kamera). */
const Moth: React.FC<{ pos: Vec3; flap: number }> = ({ pos, flap }) => {
  const tex = useMemo(() => mothTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const open = 0.3 + 0.7 * Math.abs(Math.cos(flap));
  return (
    <group position={pos} name="EP03_Moth">
      <sprite scale={[MOTH_SPAN * open, MOTH_H, 1]} ref={(m) => m?.layers.set(NOINK)}>
        <spriteMaterial map={tex} transparent alphaTest={0.3} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
};

export type SetState = {
  frame: number;
  bon: BonLine[];
  bowlVisible: boolean;
  esTehVisible: boolean;
  /** Jumlah piring topping ayam Oyen di ledge (0–3). */
  plates: number;
  /**
   * Opsional (R-8): frame mulai tiap piring. Bila ada, piring ke-i muncul di `platesFrom[i]` dan meluncur dari konter
   * (`PLATE_SLIDE_FROM`, `PLATE_SLIDE_FRAMES` f) ke ledge; `plates` diabaikan. Bila tidak ada, perilaku lama.
   */
  platesFrom?: readonly number[];
  /** 0 = belum ada, 0..1 = sedang didorong Oyen ke piring, 1 = di piring. */
  fish: number;
  moth: { pos: Vec3; flap: number } | null;
};

export const SetPieces: React.FC<{ state: SetState }> = ({ state }) => {
  const woodMat = useTwoToneMaterial({ color: '#8b5a34' }, []);
  const woodDark = useTwoToneMaterial({ color: '#5e3a22' }, []);
  const plasticMat = useTwoToneMaterial({ color: STOOLS.oyen.color }, []);
  const bowlMat = useTwoToneMaterial({ color: '#f2efe6' }, []);
  const mieMat = useTwoToneMaterial({ color: '#e6b85c' }, []);
  const plateMat = useTwoToneMaterial({ color: '#e9eef2' }, []);
  const ayamMat = useTwoToneMaterial({ color: '#b5652c' }, []);
  const tehMat = useTwoToneMaterial({ color: '#9c4a18', transparent: true, opacity: 0.9 }, []);
  const fishMat = useTwoToneMaterial({ color: '#b9a27c' }, []);
  const potMat = useTwoToneMaterial({ color: '#b8c0c8' }, []);
  const brothMat = useTwoToneMaterial({ color: '#c99545' }, []);
  const plateAt = (i: number) => platePosAt(i, state.frame, state.plates, state.platesFrom);
  const platePos = EP03_SPOTS.plates.map((_, i) => plateAt(i));

  return (
    <group name="EP03_Set">
      <KampungSet mode="malam" hideNames={EP03_HIDE_NAMES} />

      {/* Dua kursi pembeli: kayu (Utoh) & plastik merah (Oyen) */}
      {(Object.keys(STOOLS) as (keyof typeof STOOLS)[]).map((k) => {
        const s = STOOLS[k];
        const top = k === 'utoh' ? woodMat : plasticMat;
        const leg = k === 'utoh' ? woodDark : plasticMat;
        const w = s.half * 2;
        return (
          <group key={k} name={`EP03_Stool_${k}`} position={[s.center[0], 0, s.center[1]]}>
            <mesh position={[0, BENCH_SEAT_Y - 0.02, 0]} castShadow receiveShadow material={top}>
              <boxGeometry args={[w, 0.04, w]} />
            </mesh>
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sz) => (
                <mesh key={`${sx}${sz}`} position={[sx * (s.half - 0.03), (BENCH_SEAT_Y - 0.04) / 2, sz * (s.half - 0.03)]} castShadow material={leg}>
                  <boxGeometry args={[0.04, BENCH_SEAT_Y - 0.04, 0.04]} />
                </mesh>
              )),
            )}
          </group>
        );
      })}

      {/* Pijakan Tio & Mbak Yuni memakai palet kayu berbilah bertekstur langsung dari kampung.glb */}

      <BonBoard lines={state.bon} frame={state.frame} />
      <SignKaryawan />

      {state.bowlVisible && (
        <group name="EP03_Bowl" position={EP03_SPOTS.bowl}>
          <mesh position={[0, 0.04, 0]} castShadow material={bowlMat}>
            <cylinderGeometry args={[0.075, 0.048, 0.08, 20]} />
          </mesh>
          <mesh position={[0, 0.078, 0]} material={mieMat}>
            <cylinderGeometry args={[0.065, 0.065, 0.01, 20]} />
          </mesh>
        </group>
      )}

      {state.esTehVisible && (
        <mesh name="EP03_EsTeh" position={[EP03_SPOTS.esTeh[0], LEDGE_TOP_Y + 0.065, EP03_SPOTS.esTeh[2]]} castShadow material={tehMat}>
          <cylinderGeometry args={[0.035, 0.03, 0.13, 16]} />
        </mesh>
      )}

      {platePos.map((p, i) =>
        p ? (
        <group key={i} name={`EP03_Plate${i}`} position={p}>
          <mesh position={[0, 0.008, 0]} castShadow material={plateMat}>
            <cylinderGeometry args={[0.045, 0.038, 0.016, 18]} />
          </mesh>
          <mesh position={[0, 0.022, 0]} material={ayamMat}>
            <sphereGeometry args={[0.027, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
        ) : null,
      )}

      {/* Dandang EP03 (R-3): pendek & bergeser ke timur, duduk di tungku bawaan. */}
      <group name="EP03_Dandang" position={[DANDANG.x, DANDANG.baseY, DANDANG.z]}>
        <mesh position={[0, DANDANG.height / 2, 0]} castShadow receiveShadow material={potMat}>
          <cylinderGeometry args={[DANDANG.radius, DANDANG.radius * 0.96, DANDANG.height, 28]} />
        </mesh>
        <mesh position={[0, DANDANG.height + 0.0075, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={potMat}>
          <torusGeometry args={[DANDANG.radius, 0.0075, 8, 32]} />
        </mesh>
        {/* Kuah sedikit di atas tutup silinder (tidak z-fight), di dalam bibir torus. */}
        <mesh position={[0, DANDANG.height + 0.003, 0]} material={brothMat}>
          <cylinderGeometry args={[DANDANG.radius - 0.006, DANDANG.radius - 0.006, 0.004, 28]} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * (DANDANG.radius + 0.012), DANDANG.height - 0.035, 0]} material={potMat}>
            <boxGeometry args={[0.025, 0.014, 0.06]} />
          </mesh>
        ))}
      </group>

      {state.fish > 0 &&
        [0, 1].map((i) => {
          const target = EP03_SPOTS.plates[1 + i];
          const z = target[2] - 0.12 * (1 - Math.min(1, state.fish));
          return (
            <mesh key={i} name={`EP03_IkanAsin${i}`} position={[target[0], LEDGE_TOP_Y + 0.035, z]} rotation={[0, 0.4 - i * 0.8, 0]} material={fishMat}>
              <boxGeometry args={[0.09, 0.008, 0.03]} />
            </mesh>
          );
        })}

      <Steam
        name="EP03_DandangSteam"
        frame={state.frame}
        position={DANDANG_STEAM.source}
        count={DANDANG_STEAM.count}
        size={DANDANG_STEAM.size}
        alpha={DANDANG_STEAM.alpha}
        driftX={DANDANG_STEAM.driftX}
      />
      {platePos.map((p, i) =>
        p ? <Steam key={i} name={`EP03_PlateSteam${i}`} frame={state.frame + i * 17} position={[p[0], p[1] + 0.04, p[2]]} count={3} size={0.26} alpha={0.2} /> : null,
      )}
      {state.moth && <Moth pos={state.moth.pos} flap={state.moth.flap} />}
    </group>
  );
};
