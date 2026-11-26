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

# Tekstur latar/atap/vegetasi di-resize ke 512px (quality=84) agar kampung.glb tetap <= 29 MB tanpa mengurangi ketajaman hero foreground.
BG_512_NAMES = {
    "terracotta_roof",
    "mossy_roof",
    "corrugated_zinc",
    "rusty_zinc",
    "foliage_canopy",
    "tropical_grass",
    "weathered_paint",
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
    """1. Aspal jalan raya matte painterly halus (tanpa noise kerikil kasar berkilau)."""
    n_mid = fbm_seamless(S, 101, (8, 16, 32), (0.50, 0.34, 0.16))
    n_fine = fbm_seamless(S, 202, (32, 64, 128), (0.35, 0.40, 0.25))
    base = 42.0 + n_mid * 15.0 + (n_fine - 0.5) * 12.0
    rgb = np.stack([base * 0.97, base * 0.99, base * 1.04], axis=-1)
    speck = tileable_noise(S, 128, 303)
    rgb[speck > 0.84] += 8.0
    rgb[speck < 0.14] -= 6.0
    h = 0.5 + (n_fine - 0.5) * 0.38 + (n_mid - 0.5) * 0.22
    save_pbr_pair("asphalt_road", rgb, h, 1.5)


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
    """11. Rumput tropis hijau subur halaman perkampungan Indonesia."""
    n_mid = fbm_seamless(S, 1301, (8, 16, 32), (0.45, 0.35, 0.20))
    n_blade = fbm_seamless(S, 1302, (32, 64, 128), (0.30, 0.40, 0.30))
    r = 68.0 + n_mid * 38.0 + (n_blade - 0.5) * 26.0
    g = 128.0 + n_mid * 44.0 + (n_blade - 0.5) * 34.0
    b = 44.0 + n_mid * 22.0 + (n_blade - 0.5) * 18.0
    rgb = np.stack([r, g, b], axis=-1)
    soil_mask = np.clip((0.26 - n_mid) * 3.0, 0.0, 0.7)[..., None]
    soil_col = np.array([118, 112, 64], dtype=np.float32)[None, None, :] + (n_blade[..., None] - 0.5) * 20.0
    rgb = rgb * (1.0 - soil_mask) + soil_col * soil_mask
    save_pbr_pair("tropical_grass", rgb, (0.4 + n_blade * 0.45 + n_mid * 0.15).astype(np.float32), 3.6)


def build_foliage_canopy() -> None:
    """12. Rimbun daun pohon peneduh kampung."""
    n1 = fbm_seamless(S, 1401, (8, 16, 32), (0.45, 0.35, 0.20))
    n2 = fbm_seamless(S, 1402, (32, 64, 128), (0.45, 0.35, 0.20))
    r = 48.0 + n1 * 42.0 + (n2 - 0.5) * 28.0
    g = 118.0 + n1 * 52.0 + (n2 - 0.5) * 36.0
    b = 44.0 + n1 * 28.0 + (n2 - 0.5) * 20.0
    rgb = np.stack([r, g, b], axis=-1)
    save_pbr_pair("foliage_canopy", rgb, (0.35 + n2 * 0.45 + n1 * 0.20).astype(np.float32), 3.8)


def build_tinted_variants() -> None:
    """13-20. Varian tekstur kayu, dinding hijau warkop, keramik kampus, kain, & kardus."""
    alb = np.array(Image.open(OUT_DIR / "teak_wood_planks_diff.jpg"), dtype=np.float32)
    nrm = Image.open(OUT_DIR / "teak_wood_planks_norm.jpg")
    light_wood = np.clip(alb * np.array([1.22, 1.24, 1.26]) + 16.0, 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(light_wood), OUT_DIR / "teak_wood_light_diff.jpg", is_bg=False)
    _save_jpeg(nrm, OUT_DIR / "teak_wood_light_norm.jpg", is_bg=False)

    dark_wood = np.clip(alb * np.array([0.58, 0.54, 0.50]), 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(dark_wood), OUT_DIR / "teak_wood_dark_diff.jpg", is_bg=False)
    _save_jpeg(nrm, OUT_DIR / "teak_wood_dark_norm.jpg", is_bg=False)

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
    tnrm = Image.open(OUT_DIR / "ceramic_floor_tile_norm.jpg")
    cool_tile = np.clip(tile * np.array([0.86, 0.94, 1.06]), 0, 255).astype(np.uint8)
    _save_jpeg(Image.fromarray(cool_tile), OUT_DIR / "kampus_tile_floor_diff.jpg", is_bg=False)
    _save_jpeg(tnrm, OUT_DIR / "kampus_tile_floor_norm.jpg", is_bg=False)

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

    # Aspal tambalan + bekas ban (1024px hero foreground): pakai normal asphalt_road yang sudah ada
    asp = np.array(Image.open(OUT_DIR / "asphalt_road_diff.jpg").convert("RGB"), np.float32)
    patch = (fbm_seamless(S, 2501, (4, 8, 16), (0.5, 0.3, 0.2)) > 0.72).astype(np.float32)
    tire = (np.exp(-((xx % (S // 2) - S * 0.18) ** 2) / 900.0) + np.exp(-((xx % (S // 2) - S * 0.32) ** 2) / 900.0))
    asp = asp * (1 - patch[..., None] * 0.28) + np.array([30, 31, 36], np.float32) * patch[..., None] * 0.28
    asp *= 1.0 - np.clip(tire, 0, 1)[..., None] * 0.14 * (0.6 + 0.4 * n_big[..., None])
    _save_jpeg(Image.fromarray(np.clip(asp, 0, 255).astype(np.uint8)), OUT_DIR / "patched_asphalt_diff.jpg", is_bg=False)


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
    files = sorted(OUT_DIR.glob("*.jpg"))
    print(f"Generated {len(files)} high-contrast PBR texture maps in {OUT_DIR}")


if __name__ == "__main__":
    main()
