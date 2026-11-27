"""Generator 40 Peta Tekstur PBR Hand-Painted & Realistic (terinspirasi Poly Haven CC0)
dengan detail frekuensi tinggi, kontras kaya, dan tanpa pola kotak berulang (low-frequency blotch)
untuk Blender 5.3.0 + Three.js (<KampungSet />, <WarkopSet />, <KostSet />, <KampusSet />).

Pakai: node pipeline/py.mjs assets/sets/generate_pbr_textures.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent / "textures"
OUT_DIR.mkdir(parents=True, exist_ok=True)
S = 1024
S_BG = 512

# Tekstur latar/atap/vegetasi di-resize ke 512px (quality=84) agar kampung.glb tetap <= 24 MB tanpa mengurangi ketajaman hero foreground.
BG_512_NAMES = {
    "terracotta_roof",
    "mossy_roof",
    "corrugated_zinc",
    "rusty_zinc",
    "foliage_canopy",
    "tropical_grass",
    "weathered_paint",
    "park_concrete",
    "vendor_paver",
    "court_terracotta",
    "dome_panel",
    "kali_water",
    "pot_clay",
    "banana_leaf",
}


def tileable_noise(res: int, scale: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    grid = rng.random((scale, scale), dtype=np.float32)
    pad = np.pad(grid, ((0, 1), (0, 1)), mode="wrap")
    im = Image.fromarray((pad * 255).astype(np.uint8), mode="L").resize(
        (res + res // scale, res + res // scale), Image.Resampling.BICUBIC
    )
    return np.array(im, dtype=np.float32)[:res, :res] / 255.0


def fbm_seamless(res: int, seed: int, octaves=(8, 16, 32, 64, 128), weights=(0.30, 0.26, 0.22, 0.14, 0.08)) -> np.ndarray:
    acc = np.zeros((res, res), dtype=np.float32)
    for idx, (sc, wt) in enumerate(zip(octaves, weights)):
        acc += tileable_noise(res, sc, seed + idx * 97) * wt
    mn, mx = float(acc.min()), float(acc.max())
    return (acc - mn) / max(1e-6, mx - mn)


def height_to_normal(height: np.ndarray, strength: float = 1.6) -> Image.Image:
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5 * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5 * strength
    dz = np.ones_like(height)
    norm = np.sqrt(dx * dx + dy * dy + dz * dz) + 1e-8
    nx = -dx / norm
    ny = dy / norm
    nz = dz / norm
    rgb = np.stack([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255], axis=-1)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), mode="RGB")


def _save_jpeg(img: Image.Image, path: Path, is_bg: bool = False) -> None:
    if is_bg and img.size != (S_BG, S_BG):
        img = img.resize((S_BG, S_BG), Image.Resampling.LANCZOS)
    img.save(path, quality=84 if is_bg else 88, optimize=True)


def save_pbr_pair(name: str, albedo_rgb: np.ndarray, height: np.ndarray, normal_strength: float = 1.6) -> None:
    is_bg = name in BG_512_NAMES
    # Kalibrasi soft-lit matte Atelier v3.5: tahan normal_strength di kisaran halus 1.2..2.0 agar bebas kilap pasir kasar.
    # Albedo hero foreground tetap tajam 1024px; normal map 512px cukup mulus untuk normalScale 0.35 dan menjaga kampung.glb <= 29 MB.
    soft_strength = min(2.0, max(1.2, normal_strength))
    alb_img = Image.fromarray(np.clip(albedo_rgb, 0, 255).astype(np.uint8), mode="RGB")
    nrm_img = height_to_normal(height, soft_strength)
    _save_jpeg(alb_img, OUT_DIR / f"{name}_diff.jpg", is_bg=is_bg)
    _save_jpeg(nrm_img, OUT_DIR / f"{name}_norm.jpg", is_bg=True)


def build_asphalt_road() -> None:
    """1. Aspal jalan raya abu-abu tropis Indonesia matte painterly (ban hitam & contact shadow langsung kontras)."""
    n_mid = fbm_seamless(S, 101, (8, 16, 32), (0.50, 0.34, 0.16))
    n_fine = fbm_seamless(S, 202, (32, 64, 128), (0.35, 0.40, 0.25))
    base = 72.0 + n_mid * 18.0 + (n_fine - 0.5) * 14.0
    rgb = np.stack([base * 0.99, base * 1.00, base * 1.03], axis=-1)
    speck = tileable_noise(S, 128, 303)
    rgb[speck > 0.84] += 10.0
    rgb[speck < 0.14] -= 8.0
    h = 0.5 + (n_fine - 0.5) * 0.36 + (n_mid - 0.5) * 0.20
    save_pbr_pair("asphalt_road", rgb, h, 1.45)


def build_paving_cobble() -> None:
    """2. Paving conblock halaman perkampungan & kampus matte lembut dengan nat halus."""
    im = Image.new("RGB", (S, S), (78, 72, 64))
    h_im = Image.new("L", (S, S), 48)
    draw = ImageDraw.Draw(im)
    hdraw = ImageDraw.Draw(h_im)
    rng = np.random.default_rng(404)
    rows, cols = 20, 10
    rh, cw = S // rows, S // cols
    pal = [(148, 138, 124), (136, 126, 114), (156, 145, 132), (130, 120, 108), (142, 132, 118)]
    for r in range(rows):
        y = r * rh
        shift = (r % 2) * (cw // 2)
        for c in range(-1, cols + 1):
            x = c * cw + shift
            col = pal[int(rng.integers(0, len(pal)))]
            jit = int(rng.integers(-7, 8))
            c_fill = (max(0, min(255, col[0] + jit)), max(0, min(255, col[1] + jit)), max(0, min(255, col[2] + jit)))
            box = [x + 3, y + 3, x + cw - 3, y + rh - 3]
            draw.rounded_rectangle(box, radius=6, fill=c_fill, outline=(102, 94, 84), width=2)
            hdraw.rounded_rectangle(box, radius=6, fill=215, outline=130, width=2)

    n = fbm_seamless(S, 405, (16, 32, 64), (0.45, 0.35, 0.20))
    arr = np.array(im, dtype=np.float32) + (n[..., None] - 0.5) * 16.0
    moss = fbm_seamless(S, 409, (8, 16, 32), (0.5, 0.3, 0.2))
    h_arr = np.array(h_im, dtype=np.float32) / 255.0
    is_joint = (h_arr < 0.45) & (moss > 0.58)
    arr[is_joint] = arr[is_joint] * 0.55 + np.array([68, 102, 52], dtype=np.float32) * 0.45
    save_pbr_pair("paving_cobble", arr, h_arr * 0.65 + n * 0.22, 1.8)


def build_brick_plaster_wall() -> None:
    """3. Dinding bata merah terakota & semen hangat matte (soft-lit painterly)."""
    n = fbm_seamless(S, 501, (8, 16, 32, 64), (0.40, 0.30, 0.18, 0.12))
    im = Image.new("RGB", (S, S), (124, 114, 102))
    h_im = Image.new("L", (S, S), 84)
    draw = ImageDraw.Draw(im)
    hdraw = ImageDraw.Draw(h_im)
    rng = np.random.default_rng(502)
    rows, cols = 20, 10
    rh, cw = S // rows, S // cols
    brick_pal = [(164, 82, 58), (152, 72, 50), (174, 90, 64), (144, 68, 48), (158, 78, 54)]
    for r in range(rows):
        y = r * rh
        shift = (r % 2) * (cw // 2)
        for c in range(-1, cols + 1):
            x = c * cw + shift
            col = brick_pal[int(rng.integers(0, len(brick_pal)))]
            box = [x + 4, y + 4, x + cw - 4, y + rh - 4]
            draw.rounded_rectangle(box, radius=4, fill=col)
            hdraw.rounded_rectangle(box, radius=4, fill=210)

    brick_arr = np.array(im, dtype=np.float32) + (n[..., None] - 0.5) * 18.0
    h_brick = np.array(h_im, dtype=np.float32) / 255.0
    save_pbr_pair("brick_plaster_wall", brick_arr, h_brick * 0.65 + n * 0.20, 1.8)


def build_kost_cream_wall() -> None:
    """4. Dinding plester krem hangat kosan dengan tekstur sapuan kuas & semen halus."""
    n_mid = fbm_seamless(S, 601, (8, 16, 32), (0.45, 0.35, 0.20))
    n_grain = fbm_seamless(S, 602, (32, 64, 128), (0.35, 0.40, 0.25))
    base = np.array([208, 178, 146], dtype=np.float32)[None, None, :]
    warm = np.array([192, 160, 128], dtype=np.float32)[None, None, :]
    rgb = base * n_mid[..., None] + warm * (1.0 - n_mid[..., None]) + (n_grain[..., None] - 0.5) * 18.0
    save_pbr_pair("kost_cream_wall", rgb, 0.5 + (n_grain - 0.5) * 0.45 + (n_mid - 0.5) * 0.25, 2.2)


def build_kampus_stone_wall() -> None:
    """5. Dinding blok beton/batu arsitektural gedung kampus S1 TI."""
    im = Image.new("RGB", (S, S), (138, 148, 162))
    h_im = Image.new("L", (S, S), 90)
    draw = ImageDraw.Draw(im)
    hdraw = ImageDraw.Draw(h_im)
    rng = np.random.default_rng(701)
    rows, cols = 12, 6
    rh, cw = S // rows, S // cols
    pal = [(174, 184, 198), (166, 176, 190), (182, 192, 206), (160, 170, 184)]
    for r in range(rows):
        y = r * rh
        shift = (r % 2) * (cw // 2)
        for c in range(-1, cols + 1):
            x = c * cw + shift
            col = pal[int(rng.integers(0, len(pal)))]
            box = [x + 3, y + 3, x + cw - 3, y + rh - 3]
            draw.rectangle(box, fill=col, outline=(126, 136, 150), width=2)
            hdraw.rectangle(box, fill=220, outline=125, width=2)
    n = fbm_seamless(S, 702, (16, 32, 64), (0.4, 0.35, 0.25))
    arr = np.array(im, dtype=np.float32) + (n[..., None] - 0.5) * 18.0
    h_arr = (np.array(h_im, dtype=np.float32) / 255.0) * 0.72 + n * 0.28
    save_pbr_pair("kampus_stone_wall", arr, h_arr, 2.8)


def build_terracotta_roof() -> None:
    """6. Atap genteng tanah liat (terracotta) kaya kontras & bayangan gelombang."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    rows, cols = 16, 20
    rh, cw = S / rows, S / cols
    ry = (yy % rh) / rh
    rx = ((xx + (np.floor(yy / rh) % 2) * (cw * 0.5)) % cw) / cw
    wave = 0.5 + 0.44 * np.sin(rx * np.pi * 2.0)
    overlap = np.clip((1.0 - ry) * 1.4, 0.18, 1.0)
    h = wave * 0.62 + overlap * 0.38
    n = fbm_seamless(S, 801, (8, 16, 64), (0.45, 0.35, 0.20))
    base_r = 166.0 * (0.62 + 0.48 * h) + (n - 0.5) * 24.0
    base_g = 76.0 * (0.60 + 0.48 * h) + (n - 0.5) * 16.0
    base_b = 48.0 * (0.58 + 0.48 * h) + (n - 0.5) * 12.0
    rgb = np.stack([base_r, base_g, base_b], axis=-1)
    moss = fbm_seamless(S, 805, (8, 16, 32), (0.5, 0.3, 0.2))
    m_mask = (moss > 0.65) & (ry > 0.55)
    rgb[m_mask] = rgb[m_mask] * 0.55 + np.array([58, 86, 44], dtype=np.float32) * 0.45
    save_pbr_pair("terracotta_roof", rgb, h * 0.82 + n * 0.18, 4.4)


def build_corrugated_zinc() -> None:
    """7. Atap seng gelombang warkop dengan guratan karat realistis."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    ribs = 28
    wave = 0.5 + 0.5 * np.sin((xx / S) * ribs * np.pi * 2.0)
    n = fbm_seamless(S, 901, (8, 16, 32, 64), (0.4, 0.3, 0.2, 0.1))
    rust = fbm_seamless(S, 902, (8, 16, 32), (0.5, 0.3, 0.2))
    metal_base = 96.0 + wave * 46.0 + (n - 0.5) * 20.0
    rgb = np.stack([metal_base * 0.95, metal_base * 1.0, metal_base * 1.06], axis=-1)
    r_mask = np.clip((rust - 0.50) * 4.0, 0.0, 1.0)[..., None]
    rust_col = np.array([138, 68, 38], dtype=np.float32)[None, None, :] + (n[..., None] - 0.5) * 22.0
    rgb = rgb * (1.0 - r_mask * 0.80) + rust_col * (r_mask * 0.80)
    save_pbr_pair("corrugated_zinc", rgb, wave * 0.82 + n * 0.18, 4.0)


def build_teak_wood_planks() -> None:
    """8. Papan kayu jati (teak wood) hangat dengan serat kayu tajam & celah papan."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    n_grain = fbm_seamless(S, 1001, (8, 16, 32, 64), (0.35, 0.30, 0.20, 0.15))
    grain_wave = 0.5 + 0.5 * np.sin((yy * 0.28) + n_grain * 15.0)
    planks = 10
    ph = S / planks
    plank_id = np.floor(yy / ph)
    seam = ((yy % ph) < 4.0) | ((yy % ph) > (ph - 3.0))
    tone_var = (np.sin(plank_id * 2.7 + 1.1) * 0.5 + 0.5) * 20.0
    r = 148.0 + grain_wave * 34.0 - 16.0 + tone_var + (n_grain - 0.5) * 16.0
    g = 96.0 + grain_wave * 26.0 - 12.0 + tone_var * 0.7 + (n_grain - 0.5) * 12.0
    b = 52.0 + grain_wave * 16.0 - 8.0 + tone_var * 0.4 + (n_grain - 0.5) * 10.0
    rgb = np.stack([r, g, b], axis=-1)
    rgb[seam] *= 0.36
    h = np.where(seam, 0.12, 0.55 + grain_wave * 0.32 + n_grain * 0.13)
    save_pbr_pair("teak_wood_planks", rgb, h.astype(np.float32), 3.2)


def build_dark_desk_wood() -> None:
    """9. Kayu walnut gelap untuk meja ngoding dual-monitor."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    n_grain = fbm_seamless(S, 1101, (8, 16, 64), (0.4, 0.35, 0.25))
    grain = 0.5 + 0.5 * np.sin((xx * 0.22) + n_grain * 12.0)
    r = 46.0 + grain * 18.0 + (n_grain - 0.5) * 10.0
    g = 52.0 + grain * 18.0 + (n_grain - 0.5) * 10.0
    b = 66.0 + grain * 20.0 + (n_grain - 0.5) * 12.0
    rgb = np.stack([r, g, b], axis=-1)
    save_pbr_pair("dark_desk_wood", rgb, (0.5 + grain * 0.35 + n_grain * 0.15).astype(np.float32), 2.4)


def build_ceramic_floor_tile() -> None:
    """10. Lantai keramik 40x40cm dengan garis nat tegas & corak marmer hangat."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    tiles = 8
    ts = S / tiles
    grout = ((xx % ts) < 4.5) | ((yy % ts) < 4.5)
    n = fbm_seamless(S, 1201, (8, 16, 32, 64), (0.4, 0.3, 0.2, 0.1))
    vein = 0.5 + 0.5 * np.sin((xx + yy) * 0.035 + n * 8.0)
    base_r = 188.0 + vein * 16.0 + (n - 0.5) * 12.0
    base_g = 168.0 + vein * 14.0 + (n - 0.5) * 12.0
    base_b = 144.0 + vein * 12.0 + (n - 0.5) * 10.0
    rgb = np.stack([base_r, base_g, base_b], axis=-1)
    rgb[grout] = np.array([104, 94, 82], dtype=np.float32)
    h = np.where(grout, 0.14, 0.80 + vein * 0.12)
    save_pbr_pair("ceramic_floor_tile", rgb, h.astype(np.float32), 3.2)


def build_tropical_grass() -> None:
    """11. Rumput tropis hijau zaitun natural halaman kampung (tidak hijau neon datar)."""
    n_mid = fbm_seamless(S, 1301, (8, 16, 32), (0.45, 0.35, 0.20))
    n_blade = fbm_seamless(S, 1302, (32, 64, 128), (0.30, 0.40, 0.30))
    r = 76.0 + n_mid * 26.0 + (n_blade - 0.5) * 20.0
    g = 112.0 + n_mid * 30.0 + (n_blade - 0.5) * 24.0
    b = 52.0 + n_mid * 18.0 + (n_blade - 0.5) * 14.0
    rgb = np.stack([r, g, b], axis=-1)
    soil_mask = np.clip((0.30 - n_mid) * 2.8, 0.0, 0.65)[..., None]
    soil_col = np.array([116, 108, 74], dtype=np.float32)[None, None, :] + (n_blade[..., None] - 0.5) * 18.0
    rgb = rgb * (1.0 - soil_mask) + soil_col * soil_mask
    save_pbr_pair("tropical_grass", rgb, (0.4 + n_blade * 0.42 + n_mid * 0.18).astype(np.float32), 1.8)


def build_foliage_canopy() -> None:
    """12. Rimbun daun pohon peneduh kampung bervariasi rona zaitun & hijau tua alami."""
    n1 = fbm_seamless(S, 1401, (8, 16, 32), (0.45, 0.35, 0.20))
    n2 = fbm_seamless(S, 1402, (32, 64, 128), (0.45, 0.35, 0.20))
    r = 56.0 + n1 * 34.0 + (n2 - 0.5) * 24.0
    g = 104.0 + n1 * 42.0 + (n2 - 0.5) * 30.0
    b = 46.0 + n1 * 22.0 + (n2 - 0.5) * 16.0
    rgb = np.stack([r, g, b], axis=-1)
    save_pbr_pair("foliage_canopy", rgb, (0.35 + n2 * 0.45 + n1 * 0.20).astype(np.float32), 1.9)


def build_tinted_variants() -> None:
    """13-20. Varian tekstur kayu, dinding hijau warkop, keramik kampus, kain, & kardus.
    Varian kayu & keramik memakai normal map induk (`teak_wood_planks_norm.jpg` / `ceramic_floor_tile_norm.jpg`)
    tanpa duplikat file normal terpisah."""
    alb = np.array(Image.open(OUT_DIR / "teak_wood_planks_diff.jpg"), dtype=np.float32)
    light_wood = np.clip(alb * np.array([1.22, 1.24, 1.26]) + 16.0, 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(light_wood), OUT_DIR / "teak_wood_light_diff.jpg", is_bg=False)

    dark_wood = np.clip(alb * np.array([0.58, 0.54, 0.50]), 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(dark_wood), OUT_DIR / "teak_wood_dark_diff.jpg", is_bg=False)

    # Dinding plester hijau toska khas Warkop Indonesia (matte lembut)
    n_mid = fbm_seamless(S, 1701, (8, 16, 32), (0.48, 0.34, 0.18))
    n_gr = fbm_seamless(S, 1702, (32, 64, 128), (0.4, 0.35, 0.25))
    gw_rgb = np.stack([
        60.0 + n_mid * 22.0 + (n_gr - 0.5) * 12.0,
        136.0 + n_mid * 28.0 + (n_gr - 0.5) * 14.0,
        106.0 + n_mid * 24.0 + (n_gr - 0.5) * 12.0,
    ], axis=-1)
    save_pbr_pair("warkop_green_wall", gw_rgb, 0.5 + (n_gr - 0.5) * 0.36 + (n_mid - 0.5) * 0.20, 1.5)

    tile = np.array(Image.open(OUT_DIR / "ceramic_floor_tile_diff.jpg"), dtype=np.float32)
    cool_tile = np.clip(tile * np.array([0.86, 0.94, 1.06]), 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(cool_tile), OUT_DIR / "kampus_tile_floor_diff.jpg", is_bg=False)

    # Hapus normal map duplikat lama bila masih ada di disk
    for dup_norm in (
        "teak_wood_light_norm.jpg",
        "teak_wood_dark_norm.jpg",
        "kampus_tile_floor_norm.jpg",
        "mossy_roof_norm.jpg",
        "rusty_zinc_norm.jpg",
        "patched_asphalt_norm.jpg",
    ):
        p = OUT_DIR / dup_norm
        if p.exists():
            p.unlink()

    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    weave = 0.5 + 0.25 * np.sin(xx * 0.8) + 0.25 * np.sin(yy * 0.8)
    nf = fbm_seamless(S, 1501, (8, 16, 64), (0.5, 0.3, 0.2))
    h_fab = (weave * 0.55 + nf * 0.35).astype(np.float32)
    for fname, rgb0 in [
        ("fabric_blue", (48, 108, 198)),
        ("fabric_yellow", (226, 152, 38)),
        ("fabric_navy", (30, 56, 114)),
    ]:
        arr = np.array(rgb0, dtype=np.float32)[None, None, :] * (0.88 + 0.20 * h_fab[..., None])
        save_pbr_pair(fname, arr, h_fab, 1.4)

    nk = fbm_seamless(S, 1601, (8, 32, 128), (0.4, 0.35, 0.25))
    k_arr = np.array([178, 128, 78], dtype=np.float32)[None, None, :] + (nk[..., None] - 0.5) * 20.0
    save_pbr_pair("cardboard_kraft", k_arr, nk, 1.4)


def _streaks(res: int, seed: int, count: int = 60) -> np.ndarray:
    """Noda air hujan vertikal (0..1), turun dari tepi atas tile, makin tipis ke bawah."""
    rng = np.random.default_rng(seed)
    out = np.zeros((res, res), dtype=np.float32)
    ys = np.linspace(0.0, 1.0, res, dtype=np.float32)[:, None]
    for _ in range(count):
        x = int(rng.integers(0, res))
        w = int(rng.integers(2, 9))
        length = float(rng.uniform(0.15, 0.6))
        start = float(rng.uniform(0.0, 0.25))
        fall = np.clip(1.0 - (ys - start) / length, 0.0, 1.0) * (ys >= start)
        cols = np.arange(x - w, x + w) % res
        prof = 1.0 - np.abs(np.linspace(-1, 1, 2 * w, dtype=np.float32))
        out[:, cols] = np.maximum(out[:, cols], fall * prof[None, :] * float(rng.uniform(0.4, 1.0)))
    return out


def build_weathered_v2() -> None:
    """21+. Varian lapuk matte untuk Kampung v2: cat kusam + noda hujan + kelupas, plester retak,
    keramik teras, genteng berlumut, seng berkarat, aspal tambalan + bekas ban.
    Tekstur latar (weathered_paint_*, mossy_roof, rusty_zinc) disimpan 512px agar kampung.glb <= 29 MB."""
    n_big = fbm_seamless(S, 2101, (4, 8, 16), (0.5, 0.3, 0.2))
    n_fine = fbm_seamless(S, 2102, (32, 64, 128), (0.3, 0.4, 0.3))
    streak = _streaks(S, 2103)
    peel = (fbm_seamless(S, 2104, (16, 32, 64), (0.5, 0.3, 0.2)) > 0.87).astype(np.float32)
    ys = np.linspace(0.0, 1.0, S, dtype=np.float32)[:, None]
    grime = np.clip((ys - 0.88) / 0.12, 0.0, 1.0) ** 1.6 * (0.6 + 0.4 * n_big) * 0.45
    h_paint = 0.5 + (n_fine - 0.5) * 0.14 - peel * 0.18 + (n_big - 0.5) * 0.06
    _save_jpeg(height_to_normal(h_paint, 1.5), OUT_DIR / "weathered_paint_norm.jpg", is_bg=True)
    paints = {
        "white": (232, 230, 222), "cream": (236, 219, 182), "mint": (170, 218, 196),
        "sky": (166, 203, 232), "peach": (240, 190, 156), "sage": (176, 190, 150),
    }
    plaster = np.array([196, 188, 174], np.float32)
    for name, col in paints.items():
        c = np.array(col, np.float32)
        rgb = np.broadcast_to(c, (S, S, 3)).copy()
        rgb *= (0.92 + n_big[..., None] * 0.12) * (0.97 + (n_fine[..., None] - 0.5) * 0.06)
        rgb = rgb * (1 - peel[..., None] * 0.48) + 0.48 * plaster * (0.9 + n_fine[..., None] * 0.12) * peel[..., None]
        rgb *= 1.0 - streak[..., None] * 0.18
        rgb = rgb * (1 - grime[..., None] * 0.32) + np.array([92, 98, 70], np.float32) * grime[..., None] * 0.32
        _save_jpeg(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), OUT_DIR / f"weathered_paint_{name}_diff.jpg", is_bg=True)

    # Plester semen retak (dinding pagar, sisi gedung, trotoar, saluran air)
    cr = fbm_seamless(S, 2201, (16, 32, 64), (0.4, 0.35, 0.25))
    crack = (np.abs(cr - 0.5) < 0.0045).astype(np.float32)
    base = 154 + n_big * 32 + (n_fine - 0.5) * 20
    rgb = np.stack([base, base * 0.97, base * 0.93], -1) * (1 - crack[..., None] * 0.48)
    rgb *= 1.0 - streak[..., None] * 0.14
    save_pbr_pair("cracked_plaster", rgb, 0.5 + (n_fine - 0.5) * 0.28 - crack * 0.42, 1.7)

    # Keramik teras 30x30 motif (teras rumah, selasar sekolah)
    yy, xx = np.mgrid[0:S, 0:S]
    cell = S // 4
    gx, gy = xx % cell, yy % cell
    grout = ((gx < 5) | (gy < 5)).astype(np.float32)
    motif = (np.abs((gx - cell / 2)) + np.abs((gy - cell / 2)) < cell * 0.22).astype(np.float32)
    base = np.stack([212 + n_fine * 16, 196 + n_fine * 14, 170 + n_fine * 12], -1)
    base = base * (1 - motif[..., None] * 0.25) + np.array([150, 70, 52], np.float32) * motif[..., None] * 0.25
    rgb = base * (1 - grout[..., None]) + np.array([120, 116, 108], np.float32) * grout[..., None]
    rgb *= 0.94 + n_big[..., None] * 0.08
    save_pbr_pair("terrace_tile", rgb, 0.55 - grout * 0.38 + (n_fine - 0.5) * 0.05, 1.6)

    # Genteng berlumut (512px): pakai normal terracotta_roof yang sudah ada
    roof_im = Image.open(OUT_DIR / "terracotta_roof_diff.jpg").convert("RGB").resize((S, S), Image.Resampling.BICUBIC)
    roof = np.array(roof_im, np.float32)
    moss = np.clip((fbm_seamless(S, 2301, (8, 16, 32), (0.5, 0.3, 0.2)) - 0.56) * 2.8, 0, 1)
    roof = roof * (1 - moss[..., None] * 0.65) + np.array([78, 96, 52], np.float32) * moss[..., None] * 0.65
    roof *= 1.0 - streak[..., None] * 0.14
    _save_jpeg(Image.fromarray(np.clip(roof, 0, 255).astype(np.uint8)), OUT_DIR / "mossy_roof_diff.jpg", is_bg=True)

    # Seng berkarat (512px): pakai normal corrugated_zinc yang sudah ada
    zinc_im = Image.open(OUT_DIR / "corrugated_zinc_diff.jpg").convert("RGB").resize((S, S), Image.Resampling.BICUBIC)
    zinc = np.array(zinc_im, np.float32)
    rust = np.clip((fbm_seamless(S, 2401, (8, 16, 64), (0.4, 0.4, 0.2)) - 0.62) * 2.4, 0, 1)
    rust = np.maximum(rust, streak * 0.72)
    zinc = zinc * (1 - rust[..., None] * 0.72) + np.array([132, 70, 34], np.float32) * rust[..., None] * 0.72
    _save_jpeg(Image.fromarray(np.clip(zinc, 0, 255).astype(np.uint8)), OUT_DIR / "rusty_zinc_diff.jpg", is_bg=True)

    # Aspal tambalan + bekas ban (1024px hero foreground, abu-abu tropis natural): pakai normal asphalt_road induk
    asp = np.array(Image.open(OUT_DIR / "asphalt_road_diff.jpg").convert("RGB"), np.float32)
    patch = (fbm_seamless(S, 2501, (4, 8, 16), (0.5, 0.3, 0.2)) > 0.72).astype(np.float32)
    tire = (np.exp(-((xx % (S // 2) - S * 0.18) ** 2) / 900.0) + np.exp(-((xx % (S // 2) - S * 0.32) ** 2) / 900.0))
    asp = asp * (1 - patch[..., None] * 0.22) + np.array([52, 54, 58], np.float32) * patch[..., None] * 0.22
    asp *= 1.0 - np.clip(tire, 0, 1)[..., None] * 0.12 * (0.6 + 0.4 * n_big[..., None])
    _save_jpeg(Image.fromarray(np.clip(asp, 0, 255).astype(np.uint8)), OUT_DIR / "patched_asphalt_diff.jpg", is_bg=False)


def _load_font(size: int):
    from PIL import ImageFont
    for cand in (
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/seguisb.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "DejaVuSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(cand, size)
        except Exception:
            continue
    return ImageFont.load_default()


def build_reallife_v35_textures() -> None:
    """Tekstur matte 512px tambahan untuk permukaan col_mat polos + 1 atlas UV tanda/plat/spanduk Indonesia."""
    n_mid = fbm_seamless(S_BG, 3101, (8, 16, 32), (0.5, 0.3, 0.2))
    n_fine = fbm_seamless(S_BG, 3102, (32, 64, 128), (0.35, 0.4, 0.25))
    yy, xx = np.mgrid[0:S_BG, 0:S_BG].astype(np.float32)

    # 1. Beton taman / trotoar halus (park_concrete_diff.jpg)
    seam = ((xx % 128) < 3) | ((yy % 128) < 3)
    base = 166.0 + n_mid * 18.0 + (n_fine - 0.5) * 14.0
    rgb = np.stack([base * 1.01, base * 0.99, base * 0.95], axis=-1)
    rgb[seam] *= 0.78
    _save_jpeg(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), OUT_DIR / "park_concrete_diff.jpg", is_bg=True)

    # 2. Paving area pedagang hangat (vendor_paver_diff.jpg)
    im = Image.new("RGB", (S_BG, S_BG), (92, 84, 74))
    dr = ImageDraw.Draw(im)
    rng = np.random.default_rng(3201)
    rows, cols = 16, 8
    rh, cw = S_BG // rows, S_BG // cols
    pal = [(164, 146, 126), (154, 138, 120), (174, 156, 134), (146, 132, 114)]
    for r in range(rows):
        y = r * rh
        shift = (r % 2) * (cw // 2)
        for c in range(-1, cols + 1):
            x = c * cw + shift
            col = pal[int(rng.integers(0, len(pal)))]
            dr.rounded_rectangle([x + 2, y + 2, x + cw - 2, y + rh - 2], radius=4, fill=col)
    arr = np.array(im, dtype=np.float32) + (n_fine[..., None] - 0.5) * 14.0
    _save_jpeg(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), OUT_DIR / "vendor_paver_diff.jpg", is_bg=True)

    # 3. Cat lapangan basket/futsal matte 1024x512 dengan garis lapangan lengkap (court_lines_diff.jpg)
    cw, ch = 1024, 512
    n_c1 = fbm_seamless(S_BG, 3111, (8, 16, 32), (0.5, 0.3, 0.2))
    n_c2 = fbm_seamless(S_BG, 3112, (32, 64, 128), (0.35, 0.4, 0.25))
    n_cm = np.concatenate([n_c1, np.fliplr(n_c1)], axis=1)
    n_cf = np.concatenate([n_c2, np.fliplr(n_c2)], axis=1)
    c_base = np.array([58, 114, 80], dtype=np.float32)[None, None, :]
    c_rgb = c_base * (0.90 + n_cm[..., None] * 0.16) + (n_cf[..., None] - 0.5) * 12.0
    c_im = Image.fromarray(np.clip(c_rgb, 0, 255).astype(np.uint8), mode="RGB")
    cd = ImageDraw.Draw(c_im)
    # Area Key Basket kiri & kanan (cat terakota-okre kusam matte khas lapangan kampung Indonesia)
    key_col = (162, 92, 54)
    line_col = (232, 230, 222)
    m = 16
    cd.rectangle([m, 160, 196, ch - 160], fill=key_col, outline=line_col, width=5)
    cd.rectangle([cw - 196, 160, cw - m, ch - 160], fill=key_col, outline=line_col, width=5)
    # Free-throw circles
    cd.arc([136, 160, 256, ch - 160], start=270, end=90, fill=line_col, width=5)
    cd.arc([cw - 256, 160, cw - 136, ch - 160], start=90, end=270, fill=line_col, width=5)
    # Garis batas luar lapangan + garis tengah + lingkaran tengah + titik kick-off
    cd.rectangle([m, m, cw - m, ch - m], outline=line_col, width=7)
    cd.line([(cw // 2, m), (cw // 2, ch - m)], fill=line_col, width=6)
    cd.ellipse([cw // 2 - 96, ch // 2 - 86, cw // 2 + 96, ch // 2 + 86], outline=line_col, width=6)
    cd.ellipse([cw // 2 - 9, ch // 2 - 9, cw // 2 + 9, ch // 2 + 9], fill=line_col)
    # Busur penalti futsal & 3-point basket di kedua ujung + titik penalti
    cd.arc([m - 178, ch // 2 - 164, m + 178, ch // 2 + 164], start=280, end=80, fill=line_col, width=5)
    cd.arc([cw - m - 178, ch // 2 - 164, cw - m + 178, ch // 2 + 164], start=100, end=260, fill=line_col, width=5)
    cd.ellipse([232, ch // 2 - 7, 246, ch // 2 + 7], fill=line_col)
    cd.ellipse([cw - 246, ch // 2 - 7, cw - 232, ch // 2 + 7], fill=line_col)
    # Sedikit efek lapuk/scuff beton di atas garis putih agar menyatu alami (bukan garis vektor neon)
    c_final = np.array(c_im, dtype=np.float32) * (0.94 + n_cf[..., None] * 0.09)
    Image.fromarray(np.clip(c_final, 0, 255).astype(np.uint8)).save(OUT_DIR / "court_lines_diff.jpg", quality=85, optimize=True)

    # 3b. Beton cat terakota luar lapangan (court_terracotta_diff.jpg, 512x512)
    t_seam = ((xx % 128) < 2.5) | ((yy % 128) < 2.5)
    t_base = np.array([156, 76, 56], dtype=np.float32)[None, None, :]
    t_rgb = t_base * (0.88 + n_mid[..., None] * 0.20) + (n_fine[..., None] - 0.5) * 14.0
    t_rgb[t_seam] *= 0.80
    _save_jpeg(Image.fromarray(np.clip(t_rgb, 0, 255).astype(np.uint8)), OUT_DIR / "court_terracotta_diff.jpg", is_bg=True)

    # 4. Panel kubah masjid hijau zamrud matte (dome_panel_diff.jpg)
    rib = ((xx % 32) < 2.5) | ((yy % 48) < 2.5)
    d_base = np.array([34, 118, 72], dtype=np.float32)[None, None, :]
    d_rgb = d_base * (0.88 + n_mid[..., None] * 0.20) + (n_fine[..., None] - 0.5) * 10.0
    d_rgb[rib] *= 0.72
    _save_jpeg(Image.fromarray(np.clip(d_rgb, 0, 255).astype(np.uint8)), OUT_DIR / "dome_panel_diff.jpg", is_bg=True)

    # 5. Air kali tropis tenang (kali_water_diff.jpg)
    rip = 0.5 + 0.5 * np.sin(yy * 0.22 + n_mid * 9.0)
    k_rgb = np.stack([
        34.0 + rip * 16.0 + n_mid * 10.0,
        74.0 + rip * 22.0 + n_mid * 14.0,
        66.0 + rip * 18.0 + n_mid * 12.0,
    ], axis=-1)
    _save_jpeg(Image.fromarray(np.clip(k_rgb, 0, 255).astype(np.uint8)), OUT_DIR / "kali_water_diff.jpg", is_bg=True)

    # 6. Pot gerabah terakota (pot_clay_diff.jpg)
    p_rgb = np.stack([
        156.0 + n_mid * 24.0 + (n_fine - 0.5) * 16.0,
        82.0 + n_mid * 14.0 + (n_fine - 0.5) * 10.0,
        52.0 + n_mid * 10.0 + (n_fine - 0.5) * 8.0,
    ], axis=-1)
    _save_jpeg(Image.fromarray(np.clip(p_rgb, 0, 255).astype(np.uint8)), OUT_DIR / "pot_clay_diff.jpg", is_bg=True)

    # 7. Daun pisang tropis berurat (banana_leaf_diff.jpg)
    vein = 0.5 + 0.5 * np.sin((xx * 0.45 + yy * 0.12) + n_mid * 4.0)
    b_rgb = np.stack([
        72.0 + vein * 18.0 + n_mid * 18.0,
        136.0 + vein * 28.0 + n_mid * 22.0,
        44.0 + vein * 10.0 + n_mid * 12.0,
    ], axis=-1)
    _save_jpeg(Image.fromarray(np.clip(b_rgb, 0, 255).astype(np.uint8)), OUT_DIR / "banana_leaf_diff.jpg", is_bg=True)

    # 8. Atlas UV tanda, plat nomor, stiker angkot, jadwal ronda, kas masjid, & spanduk kampung (1024x1024)
    atlas = Image.new("RGB", (S, S), (236, 232, 224))
    ad = ImageDraw.Draw(atlas)
    f_xl = _load_font(46)
    f_lg = _load_font(34)
    f_md = _load_font(24)
    f_sm = _load_font(18)

    def center_txt(box, txt, font, fill, y_off=0):
        x0, y0, x1, y1 = box
        bb = ad.textbbox((0, 0), txt, font=font)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        ad.text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2 + y_off), txt, font=font, fill=fill)

    # Row 0 (y: 0..256 -> UV v: 0.75..1.00)
    # [0,0..256,256] Plat Motor Hitam
    ad.rectangle([8, 28, 248, 228], fill=(24, 26, 30), outline=(232, 234, 238), width=6)
    center_txt((8, 28, 248, 168), "B 4123 RS", f_lg, (244, 244, 244))
    center_txt((8, 155, 248, 220), "08 · 29", f_md, (218, 220, 224))

    # [256,0..512,256] Plat Angkot Kuning
    ad.rectangle([264, 28, 504, 228], fill=(232, 186, 32), outline=(22, 22, 24), width=6)
    center_txt((264, 28, 504, 168), "B 1742 UK", f_lg, (20, 20, 22))
    center_txt((264, 155, 504, 220), "04 · 28", f_md, (24, 24, 26))

    # [512,0..768,256] Plat Mobil Putih (standar baru Indonesia)
    ad.rectangle([520, 28, 760, 228], fill=(240, 240, 238), outline=(24, 24, 28), width=6)
    center_txt((520, 28, 760, 168), "B 2089 RW", f_lg, (22, 22, 26))
    center_txt((520, 155, 760, 220), "11 · 29", f_md, (36, 38, 42))

    # [768,0..1024,256] Stiker Kaca Atas Angkot
    ad.rectangle([768, 0, 1024, 256], fill=(20, 108, 146))
    ad.rectangle([776, 18, 1016, 238], fill=(238, 192, 34), outline=(18, 62, 86), width=5)
    center_txt((776, 22, 1016, 140), "04", f_xl, (18, 48, 78))
    center_txt((776, 132, 1016, 230), "RAWA SARI", f_md, (18, 48, 78))

    # Row 1 (y: 256..512 -> UV v: 0.50..0.75)
    # [0,256..512,512] Spanduk TAMBAL BAN
    ad.rectangle([6, 262, 506, 506], fill=(236, 194, 42), outline=(24, 64, 142), width=8)
    ad.rectangle([16, 272, 496, 356], fill=(24, 64, 142))
    center_txt((16, 272, 496, 356), "TAMBAL BAN & SERVIS", f_lg, (248, 238, 188))
    center_txt((16, 360, 496, 442), "ISI ANGIN · GANTI OLI · TUBELESS", f_md, (24, 38, 86))
    center_txt((16, 442, 496, 496), "BENGKEL MOTOR JAYA - BUKA TIAP HARI", f_sm, (164, 34, 28))

    # [512,256..1024,512] Spanduk TERIMA KOS PUTRA
    ad.rectangle([518, 262, 1018, 506], fill=(242, 240, 232), outline=(26, 114, 66), width=8)
    ad.rectangle([528, 272, 1008, 356], fill=(26, 114, 66))
    center_txt((528, 272, 1008, 356), "TERIMA KOS PUTRA", f_lg, (248, 248, 242))
    center_txt((528, 362, 1008, 434), "BERSIH · AMAN · FREE WIFI · DEKAT FIK", f_md, (28, 78, 52))
    center_txt((528, 436, 1008, 496), "HUBUNGI BU KOS — RT 04 RAWA SARI", f_sm, (176, 46, 34))

    # Row 2 (y: 512..768 -> UV v: 0.25..0.50)
    # [0,512..512,768] Spanduk JALAN PELAN
    ad.rectangle([6, 518, 506, 762], fill=(238, 198, 48), outline=(176, 32, 28), width=8)
    center_txt((16, 530, 496, 622), "JALAN PELAN-PELAN", f_xl, (176, 28, 24))
    center_txt((16, 622, 496, 700), "BANYAK ANAK-ANAK", f_lg, (26, 26, 30))
    center_txt((16, 700, 496, 752), "WARGA RT 04 / RW 07 RAWA SARI", f_sm, (32, 58, 98))

    # [512,512..1024,768] Papan DILARANG BUANG SAMPAH KE KALI
    ad.rectangle([518, 518, 1018, 762], fill=(178, 34, 30), outline=(244, 240, 232), width=8)
    ad.rectangle([532, 532, 1004, 748], fill=(244, 240, 232))
    center_txt((536, 540, 1000, 620), "DILARANG BUANG", f_lg, (178, 30, 26))
    center_txt((536, 616, 1000, 694), "SAMPAH KE KALI!", f_lg, (178, 30, 26))
    center_txt((536, 696, 1000, 742), "JAGA KEBERSIHAN KALI RAWA SARI", f_sm, (28, 86, 52))

    # Row 3 (y: 768..1024 -> UV v: 0.00..0.25)
    # [0,768..512,1024] Papan JADWAL RONDA RT 04
    ad.rectangle([6, 774, 506, 1018], fill=(238, 234, 220), outline=(28, 92, 52), width=8)
    ad.rectangle([14, 782, 498, 834], fill=(28, 92, 52))
    center_txt((14, 782, 498, 834), "JADWAL RONDA RT 04", f_md, (248, 244, 224))
    days = [
        ("SENIN  : Pak Ujang, Utoh, Budi", 846),
        ("RABU   : Tio, Dedi, Hendra", 882),
        ("JUMAT  : Agus, Slamet, Rudi", 918),
        ("MINGGU : Kerja Bakti & Patroli", 954),
    ]
    for line, ly in days:
        ad.text((28, ly), line, font=f_sm, fill=(32, 36, 34))
        ad.line([(24, ly + 26), (488, ly + 26)], fill=(184, 180, 168), width=1)

    # [512,768..1024,1024] Papan KAS MASJID AL-KHAWARIZMI
    ad.rectangle([518, 774, 1018, 1018], fill=(22, 84, 52), outline=(218, 178, 62), width=8)
    ad.rectangle([528, 784, 1008, 842], fill=(16, 62, 38))
    center_txt((528, 784, 1008, 842), "KAS MASJID AL-KHAWARIZMI", f_md, (238, 206, 98))
    kas_lines = [
        ("Saldo Pekan Lalu : Rp 4.850.000", 856),
        ("Infaq Jumat      : Rp 1.120.000", 892),
        ("Pengeluaran      : Rp   640.000", 928),
        ("SALDO AKHIR      : Rp 5.330.000", 966),
    ]
    for line, ly in kas_lines:
        ad.text((544, ly), line, font=f_sm, fill=(244, 242, 232))

    _save_jpeg(atlas, OUT_DIR / "reallife_signs_atlas.jpg", is_bg=False)

    # 9. Atlas Fasad & Interior Real-Life Indonesia v3.6 (1024x1024, 4 kuadran)
    fac = Image.new("RGB", (S, S), (226, 224, 218))
    fd = ImageDraw.Draw(fac)
    rng_f = np.random.default_rng(3601)

    # Kuadran 1 (x: 0..512, y: 0..512 -> UV u: 0..0.5, v: 0.5..1.0): MINIMARKET 24 JAM GLASS STOREFRONT
    fd.rectangle([0, 0, 512, 512], fill=(224, 232, 238))
    # Header strip khas minimarket Indonesia (merah, biru, kuning)
    fd.rectangle([0, 0, 512, 26], fill=(198, 36, 36))
    fd.rectangle([0, 26, 512, 46], fill=(24, 78, 168))
    fd.rectangle([0, 46, 512, 60], fill=(238, 194, 34))
    # Interior toko terlihat di balik kaca (plafon terang + lorong rak snack & chiller minuman)
    fd.rectangle([16, 68, 496, 496], fill=(232, 236, 234))
    fd.rectangle([16, 68, 496, 128], fill=(244, 246, 240))  # plafon + lampu neon
    for lx in (80, 220, 360):
        fd.rectangle([lx, 84, lx + 92, 98], fill=(255, 254, 244))
    # Rak produk warna-warni di sisi kiri & kanan
    shelf_cols = [(214, 58, 48), (44, 122, 196), (236, 174, 36), (54, 152, 76), (228, 112, 38), (240, 236, 224)]
    for rx0, rx1 in ((26, 168), (344, 486)):
        fd.rectangle([rx0, 148, rx1, 476], fill=(196, 202, 206), outline=(120, 128, 136), width=3)
        for row in range(5):
            ry = 160 + row * 60
            fd.rectangle([rx0 + 4, ry + 42, rx1 - 4, ry + 50], fill=(96, 102, 110))
            px = rx0 + 8
            while px < rx1 - 24:
                pw = int(rng_f.integers(18, 30))
                col = shelf_cols[int(rng_f.integers(0, len(shelf_cols)))]
                fd.rectangle([px, ry + 8, min(px + pw, rx1 - 8), ry + 41], fill=col, outline=(70, 74, 80), width=1)
                px += pw + 4
    # Bingkai aluminium pintu kaca ganda di tengah (x: 176..336)
    fd.rectangle([14, 66, 498, 498], outline=(168, 174, 182), width=10)
    fd.rectangle([176, 86, 336, 494], fill=(182, 212, 226), outline=(154, 160, 168), width=8)
    fd.line([(256, 86), (256, 494)], fill=(142, 148, 156), width=6)
    # Gagang pintu stainless & stiker BUKA 24 JAM
    fd.rectangle([238, 260, 248, 354], fill=(224, 228, 232), outline=(88, 92, 98), width=2)
    fd.rectangle([264, 260, 274, 354], fill=(224, 228, 232), outline=(88, 92, 98), width=2)
    fd.rectangle([194, 176, 318, 232], fill=(24, 78, 168), outline=(238, 194, 34), width=3)
    center_txt((194, 176, 318, 206), "BUKA 24 JAM", f_sm, (250, 248, 240))
    center_txt((194, 202, 318, 230), "DORONG · TARIK", _load_font(13), (242, 212, 92))
    # Pantulan diagonal kaca lembut
    fd.polygon([(184, 96), (230, 96), (184, 260)], fill=(214, 234, 244))
    fd.polygon([(352, 110), (412, 110), (352, 300)], fill=(214, 234, 244))

    # Kuadran 2 (x: 512..1024, y: 0..512 -> UV u: 0.5..1.0, v: 0.5..1.0): ATM 24 JAM GLASS BOOTH & MACHINE
    fd.rectangle([512, 0, 1024, 512], fill=(28, 72, 124))
    fd.rectangle([528, 18, 1008, 494], fill=(210, 226, 238), outline=(144, 154, 166), width=12)
    # Interior ruang booth ATM
    fd.rectangle([544, 34, 992, 478], fill=(184, 204, 220))
    fd.rectangle([544, 34, 992, 94], fill=(24, 74, 146))
    center_txt((544, 36, 992, 92), "ATM 24 JAM · TARIK TUNAI", f_md, (248, 246, 236))
    # Mesin ATM di tengah ruangan
    fd.rectangle([668, 128, 868, 474], fill=(216, 222, 228), outline=(74, 84, 98), width=5)
    fd.rectangle([684, 144, 852, 182], fill=(20, 68, 138))
    center_txt((684, 144, 852, 182), "BANK NUSANTARA", _load_font(15), (248, 220, 86))
    # Layar ATM menyala biru lembut
    fd.rectangle([694, 196, 804, 282], fill=(72, 168, 232), outline=(42, 54, 68), width=4)
    fd.rectangle([702, 206, 796, 224], fill=(232, 246, 255))
    fd.rectangle([702, 234, 752, 248], fill=(208, 236, 252))
    fd.rectangle([702, 254, 768, 268], fill=(208, 236, 252))
    # Slot kartu & struk di kanan layar
    fd.rectangle([814, 212, 846, 238], fill=(38, 144, 84), outline=(36, 42, 48), width=2)
    fd.rectangle([814, 252, 846, 268], fill=(44, 48, 54))
    # Keypad metalik & slot uang keluar
    fd.rectangle([698, 298, 838, 356], fill=(162, 168, 176), outline=(78, 84, 92), width=3)
    for kr in range(3):
        for kc in range(4):
            fd.rectangle([708 + kc * 28, 306 + kr * 15, 728 + kc * 28, 317 + kr * 15], fill=(228, 232, 236))
    fd.rectangle([708, 376, 828, 404], fill=(42, 46, 52), outline=(92, 98, 106), width=3)
    # Stiker garis pintu kaca & gagang
    fd.rectangle([544, 268, 992, 284], fill=(238, 192, 34))
    fd.rectangle([944, 240, 960, 344], fill=(232, 236, 240), outline=(80, 86, 94), width=2)

    # Kuadran 3 (x: 0..512, y: 512..1024 -> UV u: 0..0.5, v: 0..0.5): RAK WARUNG KELONTONG BU SRI + RENTENGAN SACHET
    fd.rectangle([0, 512, 512, 1024], fill=(168, 134, 98))
    # Baris rentengan sachet kopi/sampo/snack menggantung di atas
    sachet_cols = [(198, 36, 36), (34, 136, 68), (234, 176, 30), (36, 94, 186), (144, 52, 162), (226, 104, 28)]
    for col_i in range(11):
        sx = 16 + col_i * 44
        sc = sachet_cols[col_i % len(sachet_cols)]
        for row_i in range(3):
            sy = 524 + row_i * 34
            fd.rectangle([sx, sy, sx + 34, sy + 28], fill=sc, outline=(244, 240, 228), width=2)
    # 4 tingkat rak kayu sembako padat
    for r in range(4):
        ry = 646 + r * 92
        fd.rectangle([12, ry + 72, 500, ry + 86], fill=(104, 64, 34))
        px = 18
        while px < 484:
            bw = int(rng_f.integers(24, 54))
            bh = int(rng_f.integers(40, 68))
            col = shelf_cols[int(rng_f.integers(0, len(shelf_cols)))]
            fd.rectangle([px, ry + 72 - bh, min(px + bw, 492), ry + 72], fill=col, outline=(62, 42, 26), width=2)
            fd.rectangle([px + 4, ry + 72 - bh + 8, min(px + bw - 4, 488), ry + 72 - bh + 20], fill=(246, 242, 230))
            px += bw + 6

    # Kuadran 4 (x: 512..1024, y: 512..1024 -> UV u: 0.5..1.0, v: 0..0.5): DINDING BENGKEL MOTOR JAYA
    fd.rectangle([512, 512, 1024, 1024], fill=(192, 184, 168))
    # Papan daftar harga servis (kiri)
    fd.rectangle([532, 536, 774, 796], fill=(242, 238, 224), outline=(26, 72, 148), width=6)
    fd.rectangle([538, 542, 768, 594], fill=(26, 72, 148))
    center_txt((538, 542, 768, 594), "DAFTAR SERVIS", f_md, (248, 226, 92))
    for li, txt in enumerate(("• Tambal Ban   : 15rb", "• Ganti Oli    : 45rb", "• Servis Ringan: 50rb", "• Isi Angin    :  3rb", "• Tune Up CVT  : 65rb")):
        fd.text((550, 610 + li * 34), txt, font=f_sm, fill=(28, 32, 38))
    # Poster oli motor (kanan atas)
    fd.rectangle([796, 536, 1004, 796], fill=(208, 42, 34), outline=(238, 198, 42), width=6)
    center_txt((796, 548, 1004, 626), "OLI MATIC", f_lg, (250, 236, 98))
    center_txt((796, 626, 1004, 704), "SAE 10W-30", f_md, (250, 248, 242))
    center_txt((796, 712, 1004, 780), "TARIKAN ENTENG!", f_sm, (250, 226, 112))
    # Rak botol oli & sparepart (bawah)
    fd.rectangle([532, 820, 1004, 996], fill=(86, 90, 96), outline=(44, 48, 54), width=4)
    for row in range(2):
        ry = 832 + row * 78
        fd.rectangle([538, ry + 62, 998, ry + 70], fill=(48, 52, 58))
        for bi in range(12):
            bx = 548 + bi * 37
            bcol = [(214, 174, 34), (196, 42, 36), (34, 98, 178), (44, 146, 74)][bi % 4]
            fd.rectangle([bx, ry + 14, bx + 26, ry + 62], fill=bcol, outline=(36, 38, 42), width=2)
            fd.rectangle([bx + 7, ry + 4, bx + 19, ry + 14], fill=(24, 26, 30))

    _save_jpeg(fac, OUT_DIR / "reallife_facades_atlas.jpg", is_bg=False)

    # 10. Tekstur Jendela Malam Berbingkai & Tirai Lembut (`window_night_warm.jpg`, 512x512)
    win = Image.new("RGB", (S_BG, S_BG), (218, 176, 108))
    w_arr = np.zeros((S_BG, S_BG, 3), dtype=np.float32)
    ny = np.linspace(0.0, 1.0, S_BG, dtype=np.float32)[:, None]
    nx = np.linspace(-1.0, 1.0, S_BG, dtype=np.float32)[None, :]
    # Cahaya hangat ruang lebih terang di tengah-atas, lembut meredup ke tepi
    glow = np.clip(1.0 - 0.35 * (nx ** 2) - 0.28 * ((ny - 0.38) ** 2), 0.45, 1.0)
    w_arr[..., 0] = 242.0 * glow
    w_arr[..., 1] = 194.0 * glow
    w_arr[..., 2] = 118.0 * glow
    # Siluet tirai kain lembut di kiri & kanan jendela
    curtain = (np.abs(nx) > 0.72).astype(np.float32)
    pleat = 0.85 + 0.15 * np.sin(nx * 44.0)
    w_arr = w_arr * (1.0 - curtain[..., None] * 0.48) + np.array([138, 102, 68], np.float32) * (curtain[..., None] * 0.48 * pleat[..., None])
    win = Image.fromarray(np.clip(w_arr, 0, 255).astype(np.uint8))
    wd = ImageDraw.Draw(win)
    # Kusen jendela salib tipis
    wd.rectangle([0, 0, S_BG - 1, S_BG - 1], outline=(64, 48, 36), width=16)
    wd.rectangle([S_BG // 2 - 7, 0, S_BG // 2 + 7, S_BG], fill=(68, 52, 38))
    wd.rectangle([0, S_BG // 2 - 7, S_BG, S_BG // 2 + 7], fill=(68, 52, 38))
    _save_jpeg(win, OUT_DIR / "window_night_warm.jpg", is_bg=True)

    # 11. Bayangan Kontak Kolong Kendaraan (`contact_shadow_alpha.png`, 256x256 RGBA)
    cs_res = 256
    cy, cx = np.mgrid[0:cs_res, 0:cs_res].astype(np.float32)
    ux = (cx / (cs_res - 1)) * 2.0 - 1.0
    uy = (cy / (cs_res - 1)) * 2.0 - 1.0
    # Super-ellipse (rounded rectangle shadow di bawah kolong mobil/motor)
    dist = (np.abs(ux) ** 3.2 + np.abs(uy) ** 3.2) ** (1.0 / 3.2)
    alpha_f = np.clip((1.0 - dist) / 0.45, 0.0, 1.0) ** 1.55 * 0.62
    rgba = np.zeros((cs_res, cs_res, 4), dtype=np.uint8)
    rgba[..., 0] = 10
    rgba[..., 1] = 12
    rgba[..., 2] = 16
    rgba[..., 3] = np.clip(alpha_f * 255.0, 0, 255).astype(np.uint8)
    Image.fromarray(rgba, mode="RGBA").save(OUT_DIR / "contact_shadow_alpha.png", optimize=True)

    # 12. Atlas v3.7: Spanduk Lapangan RT 04, Pos Satpam FIK, Papan Rute Halte, & Backboard Basket (1024x512)
    v37 = Image.new("RGB", (1024, 512), (236, 234, 228))
    vd = ImageDraw.Draw(v37)

    def v37_center(box, txt, font, fill, y_off=0):
        x0, y0, x1, y1 = box
        bb = vd.textbbox((0, 0), txt, font=font)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        vd.text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2 + y_off), txt, font=font, fill=fill)

    # Kuadran TL (0,0..512,256 -> UV u:0..0.5, v:0.5..1.0): SPANDUK LAPANGAN RT 04 RAWA SARI
    vd.rectangle([6, 6, 506, 250], fill=(242, 240, 232), outline=(24, 108, 64), width=8)
    vd.rectangle([16, 16, 496, 100], fill=(24, 108, 64))
    vd.rectangle([16, 100, 496, 114], fill=(236, 190, 34))
    v37_center((16, 16, 496, 100), "LAPANGAN RT 04 RAWA SARI", _load_font(30), (248, 248, 242))
    v37_center((16, 122, 496, 186), "FUTSAL · BASKET · SENAM WARGA", _load_font(22), (24, 54, 88))
    v37_center((16, 188, 496, 240), "JAGA KEBERSIHAN & SPORTIVITAS BERSAMA", _load_font(16), (176, 46, 32))

    # Kuadran TR (512,0..1024,256 -> UV u:0.5..1.0, v:0.5..1.0): PAPAN POS SATPAM FIK
    vd.rectangle([518, 6, 1018, 250], fill=(22, 52, 106), outline=(232, 192, 44), width=8)
    vd.rectangle([530, 18, 1006, 112], fill=(16, 38, 82))
    v37_center((530, 20, 1006, 110), "POS SATPAM FIK", _load_font(40), (246, 212, 68))
    v37_center((530, 122, 1006, 184), "TAMU HARAP LAPOR · KEAMANAN 24 JAM", _load_font(20), (242, 244, 248))
    v37_center((530, 186, 1006, 238), "KAMPUS S1 TEKNIK INFORMATIKA RAWA SARI", _load_font(16), (186, 206, 234))

    # Kuadran BL (0,256..512,512 -> UV u:0..0.5, v:0.0..0.5): PAPAN INFORMASI HALTE BUS KAMPUS FIK
    vd.rectangle([6, 262, 506, 506], fill=(240, 242, 245), outline=(24, 72, 146), width=8)
    vd.rectangle([16, 272, 496, 332], fill=(24, 72, 146))
    v37_center((16, 272, 496, 332), "HALTE BUS KAMPUS FIK", _load_font(28), (248, 248, 250))
    # Diagram rute horizontal
    vd.line([(56, 382), (456, 382)], fill=(214, 152, 24), width=8)
    for sx, lbl in ((64, "STASIUN"), (192, "PASAR"), (320, "RAWA SARI"), (448, "FIK")):
        vd.ellipse([sx - 12, 370, sx + 12, 394], fill=(24, 72, 146), outline=(248, 248, 250), width=3)
        v37_center((sx - 46, 398, sx + 46, 424), lbl, _load_font(13), (30, 38, 52))
    v37_center((16, 434, 496, 466), "ANGKOT 04 · BUS KAMPUS · 06:00 - 21:00", _load_font(17), (26, 86, 56))
    v37_center((16, 466, 496, 496), "ANTRE TERTIB · JAGA BARANG BAWAAN", _load_font(15), (92, 98, 108))

    # Kuadran BR (512,256..1024,512 -> UV u:0.5..1.0, v:0.0..0.5): PAPAN PANTUL BASKET (BACKBOARD)
    vd.rectangle([512, 256, 1024, 512], fill=(230, 228, 220))
    # Sedikit bercak lapuk outdoor pada papan pantul
    rng_bb = np.random.default_rng(3701)
    for _ in range(35):
        bx = int(rng_bb.integers(530, 1000))
        by = int(rng_bb.integers(270, 495))
        br = int(rng_bb.integers(4, 14))
        vd.ellipse([bx - br, by - br, bx + br, by + br], fill=(214, 212, 204))
    # Bingkai luar merah-gelap + kotak target shooter's square merah tepat di atas posisi ring
    vd.rectangle([528, 270, 1008, 498], outline=(186, 36, 32), width=12)
    vd.rectangle([676, 360, 860, 474], outline=(186, 36, 32), width=10)
    # Garis sambungan panel tipis & baut
    vd.rectangle([518, 262, 1018, 506], outline=(58, 62, 68), width=6)

    v37.save(OUT_DIR / "reallife_v37_signs.jpg", quality=86, optimize=True)

    # 13. Tekstur Bola Basket & Bola Futsal (256x256 matte)
    bsz = 256
    byy, bxx = np.mgrid[0:bsz, 0:bsz].astype(np.float32)
    bn = fbm_seamless(bsz, 3710, (8, 16, 32), (0.4, 0.35, 0.25))
    # Bola basket oranye matte bertekstur kulit + garis rusuk hitam
    bb_rgb = np.stack([198.0 + bn * 24.0, 92.0 + bn * 14.0, 34.0 + bn * 8.0], axis=-1)
    bb_im = Image.fromarray(np.clip(bb_rgb, 0, 255).astype(np.uint8))
    bbd = ImageDraw.Draw(bb_im)
    bbd.line([(0, bsz // 2), (bsz, bsz // 2)], fill=(28, 26, 24), width=6)
    bbd.line([(bsz // 2, 0), (bsz // 2, bsz)], fill=(28, 26, 24), width=6)
    bbd.arc([-40, 28, bsz // 2 - 12, bsz - 28], start=280, end=80, fill=(28, 26, 24), width=5)
    bbd.arc([bsz // 2 + 12, 28, bsz + 40, bsz - 28], start=100, end=260, fill=(28, 26, 24), width=5)
    bb_im.save(OUT_DIR / "ball_basket_diff.jpg", quality=85, optimize=True)

    # Bola futsal putih matte dengan panel heksagonal klasik hitam/hijau
    bf_rgb = np.stack([232.0 + (bn - 0.5) * 14.0, 230.0 + (bn - 0.5) * 14.0, 224.0 + (bn - 0.5) * 14.0], axis=-1)
    bf_im = Image.fromarray(np.clip(bf_rgb, 0, 255).astype(np.uint8))
    bfd = ImageDraw.Draw(bf_im)
    for gy_i in range(4):
        for gx_i in range(4):
            cx_p = gx_i * 64 + (32 if gy_i % 2 else 0) + 16
            cy_p = gy_i * 64 + 32
            pts = [(cx_p + 18 * np.cos(a), cy_p + 18 * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 6, endpoint=False)]
            bfd.polygon(pts, fill=(32, 38, 46) if (gx_i + gy_i) % 2 == 0 else (28, 108, 66), outline=(72, 76, 82))
    bf_im.save(OUT_DIR / "ball_futsal_diff.jpg", quality=85, optimize=True)


def main() -> None:
    build_asphalt_road()
    build_paving_cobble()
    build_brick_plaster_wall()
    build_kost_cream_wall()
    build_kampus_stone_wall()
    build_terracotta_roof()
    build_corrugated_zinc()
    build_teak_wood_planks()
    build_dark_desk_wood()
    build_ceramic_floor_tile()
    build_tropical_grass()
    build_foliage_canopy()
    build_tinted_variants()
    build_weathered_v2()
    build_reallife_v35_textures()
    files = sorted(OUT_DIR.glob("*.jpg"))
    print(f"Generated {len(files)} high-contrast PBR texture maps in {OUT_DIR}")


if __name__ == "__main__":
    main()
