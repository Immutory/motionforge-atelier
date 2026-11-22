"""Kumpulkan hasil render karakter orisinal (Global, Nusantara, Warga Indonesia) ke folder assets/characters/
dan susun menjadi Character Contact Sheet siap lihat/cetak.

Pakai: node pipeline/py.mjs pipeline/make_sheet.py
"""
from pathlib import Path
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
CHAR_DIR = ROOT / "assets" / "characters"
FRAMES_DIR = CHAR_DIR / "frames"
SHEETS_DIR = CHAR_DIR / "sheets"
PREVIEWS_DIR = CHAR_DIR / "previews"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    )
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def build_grid_sheet(
    items: list[tuple[Path, str]],
    cols: int,
    title: str,
    subtitle: str,
    dest: Path,
    cell_w: int = 420,
    cell_h: int = 746,
) -> None:
    rows = (len(items) + cols - 1) // cols
    pad = 22
    header_h = 110
    label_h = 44
    canvas_w = pad + cols * (cell_w + pad)
    canvas_h = header_h + pad + rows * (cell_h + label_h + pad)

    bg = (22, 18, 34)
    card_bg = (34, 28, 52)
    accent = (255, 214, 138)
    sheet = Image.new("RGB", (canvas_w, canvas_h), bg)
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(34, bold=True)
    sub_font = load_font(20, bold=False)
    lbl_font = load_font(19, bold=True)

    draw.rectangle([0, 0, canvas_w, header_h], fill=(30, 24, 48))
    draw.line([(0, header_h - 2), (canvas_w, header_h - 2)], fill=(96, 82, 132), width=3)
    draw.text((pad, 20), title, fill=(255, 248, 236), font=title_font)
    draw.text((pad, 66), subtitle, fill=accent, font=sub_font)

    for idx, (img_path, label) in enumerate(items):
        r = idx // cols
        c = idx % cols
        x = pad + c * (cell_w + pad)
        y = header_h + pad + r * (cell_h + label_h + pad)

        draw.rounded_rectangle(
            [x - 4, y - 4, x + cell_w + 4, y + cell_h + label_h + 4],
            radius=14,
            fill=card_bg,
            outline=(84, 72, 118),
            width=2,
        )
        if img_path.exists():
            im = Image.open(img_path).convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
        else:
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(50, 42, 70))
            draw.text((x + 24, y + cell_h // 2), "BELUM DIRENDER", fill=(255, 160, 160), font=lbl_font)

        bbox = draw.textbbox((0, 0), label, font=lbl_font)
        tw = bbox[2] - bbox[0]
        draw.text((x + (cell_w - tw) // 2, y + cell_h + 10), label, fill=(255, 246, 232), font=lbl_font)

    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, quality=93)
    print(f"sheet -> {dest} ({canvas_w}x{canvas_h})")


def copy_if_exists(src: Path, dst: Path) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copy2(src, dst)
        print(f"copy  -> {dst}")
    return dst


def main() -> None:
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    SHEETS_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

    g_src = OUT / "charlab" / "stills"
    n_src = OUT / "nusantara" / "stills"
    w_src = OUT / "warga" / "stills"
    r_src = OUT / "riglab" / "stills"
    u_src = OUT / "bangutoh" / "stills"
    k_src = OUT / "kucingoyen" / "stills"
    s_src = OUT / "setlab" / "stills"

    global_items = [
        (copy_if_exists(g_src / "f0000.jpg", FRAMES_DIR / "global_lineup.jpg"), "Lineup Global (A / B / C)"),
        (copy_if_exists(g_src / "f0030.jpg", FRAMES_DIR / "global_A_atelier_indie.jpg"), "A · Atelier Indie"),
        (copy_if_exists(g_src / "f0060.jpg", FRAMES_DIR / "global_B_squircle_plush.jpg"), "B · Squircle Plush"),
        (copy_if_exists(g_src / "f0090.jpg", FRAMES_DIR / "global_C_inkpop_comic.jpg"), "C · Ink-Pop Comic"),
    ]

    nusa_items = [
        (copy_if_exists(n_src / "f0000.jpg", FRAMES_DIR / "nusantara_lineup.jpg"), "Lineup Nusantara (ID-1..ID-4)"),
        (copy_if_exists(n_src / "f0030.jpg", FRAMES_DIR / "id1_mas_arya.jpg"), "ID-1 · Mas Arya (Batik & Peci)"),
        (copy_if_exists(n_src / "f0060.jpg", FRAMES_DIR / "id2_mbak_rara.jpg"), "ID-2 · Mbak Rara (Hijab & Mic)"),
        (copy_if_exists(n_src / "f0090.jpg", FRAMES_DIR / "id3_bang_dimas.jpg"), "ID-3 · Bang Dimas (Coach & Es Teh)"),
        (copy_if_exists(n_src / "f0120.jpg", FRAMES_DIR / "id4_saka_nusantara.jpg"), "ID-4 · Saka Nusantara (Iket & Tenun)"),
    ]

    warga_items = [
        (copy_if_exists(w_src / "f0000.jpg", FRAMES_DIR / "warga_lineup.jpg"), "Lineup Warga (ID-5..ID-8)"),
        (copy_if_exists(w_src / "f0030.jpg", FRAMES_DIR / "id5_pak_budi_rt.jpg"), "ID-5 · Pak Budi (Pak RT & Kopi)"),
        (copy_if_exists(w_src / "f0060.jpg", FRAMES_DIR / "id6_bu_siti_warung.jpg"), "ID-6 · Bu Siti (Daster & Sodet)"),
        (copy_if_exists(w_src / "f0090.jpg", FRAMES_DIR / "id7_raka_sma.jpg"), "ID-7 · Raka (Pelajar SMA & HP)"),
        (copy_if_exists(w_src / "f0120.jpg", FRAMES_DIR / "id8_bang_udin_ojol.jpg"), "ID-8 · Bang Udin (Ojol & Helm)"),
    ]

    nusa_anim = [
        (n_src / "f0150.jpg", "f150 · Walk Start"),
        (n_src / "f0160.jpg", "f160 · Walk Step 1"),
        (n_src / "f0170.jpg", "f170 · Walk Step 2"),
        (n_src / "f0180.jpg", "f180 · Arrive & Glide"),
        (n_src / "f0192.jpg", "f192 · Talk Lip-Sync 1"),
        (n_src / "f0204.jpg", "f204 · Talk Lip-Sync 2"),
        (n_src / "f0217.jpg", "f217 · Plot-Twist Kick!"),
        (n_src / "f0232.jpg", "f232 · Golden Shock Hold"),
    ]
    for src, _ in nusa_anim:
        if src.exists():
            copy_if_exists(src, FRAMES_DIR / f"anim_{src.name}")

    warga_anim = [
        (w_src / "f0150.jpg", "f150 · Walk Start"),
        (w_src / "f0160.jpg", "f160 · Walk Step 1"),
        (w_src / "f0170.jpg", "f170 · Walk Step 2"),
        (w_src / "f0180.jpg", "f180 · Arrive & Glide"),
        (w_src / "f0192.jpg", "f192 · Kopi & Peta Ojol 1"),
        (w_src / "f0204.jpg", "f204 · Kopi & Peta Ojol 2"),
        (w_src / "f0217.jpg", "f217 · Helm Loncat Kick!"),
        (w_src / "f0232.jpg", "f232 · Golden Shock Hold"),
    ]
    for src, _ in warga_anim:
        if src.exists():
            copy_if_exists(src, FRAMES_DIR / f"warga_anim_{src.name}")

    build_grid_sheet(
        global_items,
        cols=4,
        title="MOTIONFORGE ATELIER — SHEET PROTOTIPE KARAKTER GLOBAL",
        subtitle="3 Gaya Orisinal (Atelier Indie · Squircle Plush · Ink-Pop Comic) dirender di dunia 3D",
        dest=SHEETS_DIR / "sheet_global_prototypes.jpg",
    )

    build_grid_sheet(
        nusa_items,
        cols=5,
        title="MOTIONFORGE ATELIER — SHEET KARAKTER ALA INDONESIA (HOST NUSANTARA)",
        subtitle="4 Tokoh Host Nusantara: Mas Arya · Mbak Rara · Bang Dimas · Saka Nusantara",
        dest=SHEETS_DIR / "sheet_nusantara.jpg",
        cell_w=380,
        cell_h=675,
    )

    build_grid_sheet(
        nusa_anim,
        cols=4,
        title="NUSANTARA ANIMATION STRIP — 30 FPS LIVE ACTION TEST",
        subtitle="Siklus Jalan Bouncy -> Lip-Sync Bicara & Prop -> Plot-Twist Peci Loncat + Golden Hour + Camera Kick",
        dest=SHEETS_DIR / "sheet_nusantara_anim_strip.jpg",
        cell_w=380,
        cell_h=675,
    )

    if any(p.exists() for p, _ in warga_items):
        build_grid_sheet(
            warga_items,
            cols=5,
            title="MOTIONFORGE ATELIER — SHEET NPC WARGA SEHARI-HARI INDONESIA",
            subtitle="4 NPC Khas Indonesia: Pak Budi (Pak RT) · Bu Siti (Ibu Warung) · Raka (SMA) · Bang Udin (Ojol)",
            dest=SHEETS_DIR / "sheet_warga_indonesia.jpg",
            cell_w=380,
            cell_h=675,
        )

        build_grid_sheet(
            warga_anim,
            cols=4,
            title="WARGA INDONESIA ANIMATION STRIP — 30 FPS LIVE ACTION TEST",
            subtitle="Pak RT & Bang Ojol: Jalan Bouncy -> Ngobrol Kopi & Peta -> Plot-Twist Helm Loncat + Golden Hour",
            dest=SHEETS_DIR / "sheet_warga_anim_strip.jpg",
            cell_w=380,
            cell_h=675,
        )

        # Master Sheet Seluruh 8 Karakter Ala Indonesia (2 baris x 4 kolom)
        indo_all = [
            nusa_items[1],
            nusa_items[2],
            nusa_items[3],
            nusa_items[4],
            warga_items[1],
            warga_items[2],
            warga_items[3],
            warga_items[4],
        ]
        build_grid_sheet(
            indo_all,
            cols=4,
            title="MOTIONFORGE ATELIER — MASTER CAST ALA INDONESIA (8 KARAKTER)",
            subtitle="Baris Atas: Host Nusantara (ID-1..ID-4)   |   Baris Bawah: Warga Sehari-hari (ID-5..ID-8)",
            dest=SHEETS_DIR / "sheet_master_indonesia_all.jpg",
            cell_w=390,
            cell_h=693,
        )

    master_items = [
        global_items[1],
        global_items[2],
        global_items[3],
        global_items[0],
        nusa_items[1],
        nusa_items[2],
        nusa_items[3],
        nusa_items[4],
    ]
    build_grid_sheet(
        master_items,
        cols=4,
        title="MOTIONFORGE ATELIER — MASTER CATALOG (GLOBAL + HOST NUSANTARA)",
        subtitle="Baris Atas: Prototipe Global (A, B, C)   |   Baris Bawah: Seri Host Nusantara (ID-1 s/d ID-4)",
        dest=SHEETS_DIR / "sheet_master_catalog.jpg",
        cell_w=390,
        cell_h=693,
    )

    rig_items = [
        (copy_if_exists(r_src / "f0000.jpg", FRAMES_DIR / "rig_01_expressions_fx.jpg"), "12 Ekspresi & Comic FX"),
        (copy_if_exists(r_src / "f0030.jpg", FRAMES_DIR / "rig_02_props_stances.jpg"), "Tukar Prop & Stance (Sit/Point/Jump)"),
        (copy_if_exists(r_src / "f0060.jpg", FRAMES_DIR / "rig_03_multi_angle.jpg"), "Multi-Angle (Front/3-4/Side/Back)"),
        (copy_if_exists(r_src / "f0090.jpg", FRAMES_DIR / "rig_04_lipsync_npc.jpg"), "Auto Lip-Sync & NPC 1-Baris"),
    ]

    if any(p.exists() for p, _ in rig_items):
        build_grid_sheet(
            rig_items,
            cols=4,
            title="MOTIONFORGE ATELIER — MODULAR RIG SHOWCASE (engine/cast)",
            subtitle="12 Ekspresi + 13 Hand Prop + 4 Stance + 4 Sudut Pandang + Auto Lip-Sync words.json + Override NPC 1-Baris",
            dest=SHEETS_DIR / "sheet_modular_rig_showcase.jpg",
            cell_w=420,
            cell_h=746,
        )

    utoh_items = [
        (copy_if_exists(u_src / "f0000.jpg", FRAMES_DIR / "lead1_bang_utoh_hero.jpg"), "Hero · Bang Utoh (S1 TI)"),
        (copy_if_exists(u_src / "f0030.jpg", FRAMES_DIR / "lead1_bang_utoh_turnaround.jpg"), "Turnaround 4 Sudut Pandang"),
        (copy_if_exists(u_src / "f0060.jpg", FRAMES_DIR / "lead1_bang_utoh_moods.jpg"), "4 Mood Mahasiswa Informatika"),
        (copy_if_exists(u_src / "f0090.jpg", FRAMES_DIR / "lead1_bang_utoh_cast.jpg"), "Pemeran #1 + Cast Utama"),
    ]
    utoh_anim = [
        (u_src / "f0150.jpg", "f150 · Walk Masuk Lab"),
        (u_src / "f0160.jpg", "f160 · Walk Step 1"),
        (u_src / "f0170.jpg", "f170 · Walk Step 2"),
        (u_src / "f0180.jpg", "f180 · Fokus Ngoding"),
        (u_src / "f0192.jpg", "f192 · Lip-Sync Kode 1"),
        (u_src / "f0204.jpg", "f204 · Smug Demo Lancar"),
        (u_src / "f0217.jpg", "f217 · Shock Headphone Pop!"),
        (u_src / "f0232.jpg", "f232 · Golden Error Hold"),
    ]
    for src, _ in utoh_anim:
        if src.exists():
            copy_if_exists(src, FRAMES_DIR / f"utoh_anim_{src.name}")

    if any(p.exists() for p, _ in utoh_items):
        build_grid_sheet(
            utoh_items,
            cols=4,
            title="MOTIONFORGE ATELIER — PEMERAN UTAMA #1: BOLOHOUTOH (BANG UTOH)",
            subtitle="Mahasiswa S1 Teknik Informatika · Hoodie HMTI · Headphone · Kacamata Tech · Laptop & Kopi · Resmi di engine/cast/",
            dest=SHEETS_DIR / "sheet_bang_utoh_main.jpg",
            cell_w=420,
            cell_h=746,
        )

    if any(p.exists() for p, _ in utoh_anim):
        build_grid_sheet(
            utoh_anim,
            cols=4,
            title="BANG UTOH ANIMATION STRIP — 30 FPS LIVE ACTION TEST",
            subtitle="Pemeran Utama #1 (S1 TI): Jalan Bouncy -> Presentasi Laptop & Lip-Sync -> Plot-Twist Error + Headphone Loncat!",
            dest=SHEETS_DIR / "sheet_bang_utoh_anim_strip.jpg",
            cell_w=380,
            cell_h=675,
        )

    kucing_items = [
        (copy_if_exists(k_src / "f0000.jpg", FRAMES_DIR / "kucing_oyen_hero.jpg"), "Hero · Si Oyen (Tabby Oranye)"),
        (copy_if_exists(k_src / "f0030.jpg", FRAMES_DIR / "kucing_oyen_turnaround.jpg"), "Turnaround 4 Sudut Pandang"),
        (copy_if_exists(k_src / "f0060.jpg", FRAMES_DIR / "kucing_oyen_moods.jpg"), "4 Mood & Pose Ekspresif"),
        (copy_if_exists(k_src / "f0090.jpg", FRAMES_DIR / "kucing_oyen_warkop.jpg"), "Warkop 24 Jam + Bang Utoh + Cast Kucing"),
    ]
    kucing_anim = [
        (k_src / "f0150.jpg", "f150 · Walk Masuk Warkop"),
        (k_src / "f0160.jpg", "f160 · Walk Step 1"),
        (k_src / "f0170.jpg", "f170 · Walk Step 2"),
        (k_src / "f0180.jpg", "f180 · Duduk Manis"),
        (k_src / "f0192.jpg", "f192 · Meong & Angkat Cakar 1"),
        (k_src / "f0204.jpg", "f204 · Meong & Angkat Cakar 2"),
        (k_src / "f0217.jpg", "f217 · Shock Jump Ekor Mekar!"),
        (k_src / "f0232.jpg", "f232 · Golden Shock Hold"),
    ]
    for src, _ in kucing_anim:
        if src.exists():
            copy_if_exists(src, FRAMES_DIR / f"kucing_anim_{src.name}")

    if any(p.exists() for p, _ in kucing_items):
        build_grid_sheet(
            kucing_items,
            cols=4,
            title="MOTIONFORGE ATELIER — KARAKTER KUCING 2D: SI OYEN (TABBY ORANYE)",
            subtitle="Referensi Tabby Oren (12221_Cat_v1_l3) · 4 Sudut · 5 Stance · 12 Ekspresi · Lip-Sync Meong · Resmi di engine/cast/",
            dest=SHEETS_DIR / "sheet_kucing_oyen_main.jpg",
            cell_w=420,
            cell_h=746,
        )

    if any(p.exists() for p, _ in kucing_anim):
        build_grid_sheet(
            kucing_anim,
            cols=4,
            title="SI OYEN ANIMATION STRIP — 30 FPS LIVE ACTION DI WARKOP 24 JAM",
            subtitle="Karakter Kucing 2D <CatBillboard />: Jalan 4 Kaki -> Duduk & Meong ke Bang Utoh -> Plot-Twist Kaget Loncat!",
            dest=SHEETS_DIR / "sheet_kucing_oyen_anim_strip.jpg",
            cell_w=380,
            cell_h=675,
        )

    sets_dir = ROOT / "assets" / "sets"
    set_items = [
        (copy_if_exists(s_src / "f0000.jpg", sets_dir / "frames" / "set_01_warkop_siang.jpg"), "Warkop Ngoding (Siang)"),
        (copy_if_exists(s_src / "f0030.jpg", sets_dir / "frames" / "set_02_warkop_senja.jpg"), "Warkop Ngoding (Senja + Bloom)"),
        (copy_if_exists(s_src / "f0060.jpg", sets_dir / "frames" / "set_03_kost_malam.jpg"), "Kamar Kost Anak S1 TI (Malam)"),
        (copy_if_exists(s_src / "f0090.jpg", sets_dir / "frames" / "set_04_kampus_lab.jpg"), "Lab Komputer S1 Informatika"),
    ]
    if any(p.exists() for p, _ in set_items):
        build_grid_sheet(
            set_items,
            cols=4,
            title="MOTIONFORGE ATELIER — PAKET SET DUNIA 3D BLENDER (engine/sets)",
            subtitle="Dimodelkan di Blender 5.3 (.blend + .glb) -> Shader twoTone + InkPass + HDR Bloom · Siap pakai <WarkopSet /> <KostSet /> <KampusSet />",
            dest=sets_dir / "sheets" / "sheet_blender_sets_showcase.jpg",
            cell_w=420,
            cell_h=746,
        )

    for src, dst_name in [
        (OUT / "bangutoh" / "previews" / "beat_150-240.mp4", "bang_utoh_anim_preview.mp4"),
        (OUT / "kucingoyen" / "previews" / "beat_150-240.mp4", "kucing_oyen_anim_preview.mp4"),
        (OUT / "nusantara" / "previews" / "beat_150-240.mp4", "nusantara_anim_preview.mp4"),
        (OUT / "warga" / "previews" / "beat_150-240.mp4", "warga_anim_preview.mp4"),
    ]:
        if src.exists():
            copy_if_exists(src, PREVIEWS_DIR / dst_name)


if __name__ == "__main__":
    main()
