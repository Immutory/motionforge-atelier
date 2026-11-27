"""Upgrade geometri & material soft-lit matte master Bang Utoh Sets (Atelier v3.5):
1. KampungSet:
   - Pertahankan dandang pendek-lebar terkalibrasi (bibir y = 1,205 m di Three.js, x = -12,91, z = 17,62).
   - Upgrade pijakan papan kayu ergonomis (`KG_Grb_BakmieTio_VendorPallet`, `KG_Grb_EsBuahYuni_VendorPallet`,
     `KG_WK_CounterPallet`) menjadi palet kayu berbilah dengan bevel & tekstur kayu jati matte
     (`teak_wood_planks_diff.jpg`/`_norm.jpg`), sambil menjaga persis AABB `maxY` (`0,30 m` & `0,44 m`).
   - Tambahkan material plester/beton matte bertekstur halus pada trotoar/kanstin foreground bila polos.
2. WarkopSet:
   - Upgrade `WK_CounterPallet` (`maxY = 0,44 m`) menjadi palet kayu berbilah bertekstur matte.
3. KampusSet:
   - Pastikan `KP2_Whiteboard` bersih terpisah dari `KP2_ProjectorMount`.
4. Audit & Kalibrasi Soft-Lit Matte di SELURUH 4 Koleksi (`KampungSet`, `WarkopSet`, `KostSet`, `KampusSet`):
   - Muat ulang semua tekstur terbaru dari `assets/sets/textures/` (termasuk background 512px) ke dalam `.blend`.
   - Enforce `Roughness >= 0.82`, turunkan `Normal Map Strength <= 0.45`, dan tekan `Specular IOR Level`
     pada seluruh permukaan matte (aspal, tembok, kayu, paving, tanah, rumput, atap, kain, trotoar).
5. Simpan `bang_utoh_sets.blend` (tanpa `.blend1`) dan ekspor ulang:
   `kampung.glb` (<= 29 MB), `warkop.glb`, `kost.glb`, `kampus.glb`.

Jalankan:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background assets/sets/blend/bang_utoh_sets.blend --python assets/sets/upgrade_sets_v3.py
"""
from pathlib import Path
import bmesh
import bpy

ROOT = Path(bpy.path.abspath("//")).parents[2]
TEX_DIR = ROOT / "assets" / "sets" / "textures"


def find_collection(name: str):
    return bpy.data.collections.get(name)


def find_layer_collection(lc, name: str):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        hit = find_layer_collection(ch, name)
        if hit:
            return hit
    return None


def unlink_and_remove(obj):
    if obj is None:
        return
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    mesh = obj.data if obj.type == "MESH" else None
    bpy.data.objects.remove(obj, do_unlink=True)
    if mesh and mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def load_or_reload_texture(fname: str, non_color: bool = False):
    fpath = TEX_DIR / fname
    if not fpath.exists():
        return None
    img = bpy.data.images.get(fname)
    if img is None:
        img = bpy.data.images.load(str(fpath), check_existing=True)
        img.name = fname
    else:
        if img.packed_file is not None:
            try:
                img.unpack(method="REMOVE")
            except Exception:
                pass
        img.filepath = str(fpath)
        img.reload()
    img.filepath = "//../textures/" + fname
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    else:
        img.colorspace_settings.name = "sRGB"
    return img


def reload_all_textures_from_disk() -> int:
    """Segarkan seluruh gambar yang cocok di `assets/sets/textures/` agar ukuran 512px & normal halus masuk ke GLB."""
    reloaded = 0
    for img in list(bpy.data.images):
        cand = TEX_DIR / img.name
        if not cand.exists() and img.filepath:
            cand = TEX_DIR / Path(bpy.path.abspath(img.filepath)).name
        if not cand.exists():
            continue
        is_norm = "_norm" in cand.name.lower()
        if img.packed_file is not None:
            try:
                img.unpack(method="REMOVE")
            except Exception:
                pass
        img.filepath = str(cand)
        try:
            img.reload()
            img.filepath = "//../textures/" + cand.name
            img.colorspace_settings.name = "Non-Color" if is_norm else "sRGB"
            reloaded += 1
        except Exception as exc:
            print(f"WARN reload {img.name}: {exc}")
    print(f"RELOADED {reloaded} textures from {TEX_DIR}")
    return reloaded


def ensure_wood_pallet_material():
    """Material kayu jati matte bertekstur + normal halus untuk palet pijakan pedagang/kasir."""
    name = "M_VendorPallet_Wood"
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.88
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.12
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    diff_img = load_or_reload_texture("teak_wood_planks_diff.jpg", non_color=False)
    norm_img = load_or_reload_texture("teak_wood_planks_norm.jpg", non_color=True)
    if diff_img is not None:
        tex_d = nt.nodes.new("ShaderNodeTexImage")
        tex_d.image = diff_img
        # Sedikit gelapkan warna jati agar palet kaki terasa grounded di bawah sepatu
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 0.72
        mix.inputs[7].default_value = (0.76, 0.70, 0.64, 1.0)
        nt.links.new(tex_d.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (0.31, 0.20, 0.11, 1.0)

    if norm_img is not None:
        tex_n = nt.nodes.new("ShaderNodeTexImage")
        tex_n.image = norm_img
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = 0.38
        nt.links.new(tex_n.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def _apply_box_uv(bm: bmesh.types.BMesh, scale: float = 1.6) -> None:
    uv_layer = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in f.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                u, v = co.x * scale, co.y * scale
            elif ax >= ay:
                u, v = co.y * scale, co.z * scale
            else:
                u, v = co.x * scale, co.z * scale
            loop[uv_layer].uv = (u, v)


def _add_local_box(bm: bmesh.types.BMesh, cx: float, cy: float, cz: float, sx: float, sy: float, sz: float, bevel_w: float = 0.005):
    ret = bmesh.ops.create_cube(bm, size=1.0)
    verts = ret["verts"]
    edges = list({e for v in verts for e in v.link_edges})
    for v in verts:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    if bevel_w > 0 and min(sx, sy, sz) > bevel_w * 3.0:
        bmesh.ops.bevel(
            bm,
            geom=edges,
            offset=bevel_w,
            segments=1,
            affect="EDGES",
            clamp_overlap=True,
        )


def add_slatted_pallet_mesh(col, name: str, min_three, max_three, mat):
    """Bangun palet kayu berbilah + runner bawah + bevel halus dengan AABB persis (min_three..max_three).
    Menjaga `maxY` persis (0.30 m gerobak Tio/Yuni, 0.44 m kasir Warkop) agar ketinggian pijakan aktor 100% kompatibel."""
    old = bpy.data.objects.get(name)
    if old:
        unlink_and_remove(old)

    x0, y0, z0 = min_three
    x1, y1, z1 = max_three
    # Three.js (x, y, z) -> Blender (x, -z, y)
    bx0, bx1 = x0, x1
    by0, by1 = -z1, -z0
    bz0, bz1 = y0, y1

    cx, cy, cz = (bx0 + bx1) / 2.0, (by0 + by1) / 2.0, (bz0 + bz1) / 2.0
    sx, sy, sz = (bx1 - bx0), (by1 - by0), (bz1 - bz0)

    deck_thick = min(0.036, sz * 0.22)
    runner_h = max(0.04, sz - deck_thick)
    runner_w = min(0.075, sy * 0.22)
    # 3 balok penyangga memanjang X (depan, tengah, belakang) di bawah papan
    runner_z = -sz * 0.5 + runner_h * 0.5
    bm = bmesh.new()
    for ry in (-sy * 0.5 + runner_w * 0.52, 0.0, sy * 0.5 - runner_w * 0.52):
        _add_local_box(bm, 0.0, ry, runner_z, sx * 0.96, runner_w, runner_h, bevel_w=0.004)

    # 5 bilah papan atas memanjang X sepanjang lebar Y (celah tipis 8 mm) tepat menyentuh +sz/2
    n_slats = 5
    gap = 0.008
    slat_y = (sy - gap * (n_slats - 1)) / n_slats
    deck_z = sz * 0.5 - deck_thick * 0.5
    for i in range(n_slats):
        py = -sy * 0.5 + slat_y * 0.5 + i * (slat_y + gap)
        _add_local_box(bm, 0.0, py, deck_z, sx, slat_y, deck_thick, bevel_w=0.004)

    _apply_box_uv(bm, scale=1.5)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.location = (cx, cy, cz)
    if mat:
        obj.data.materials.append(mat)
    col.objects.link(obj)
    return obj


def add_cylinder_mesh(col, name: str, center_three, radius: float, height: float, mat, segs=24):
    old = bpy.data.objects.get(name)
    if old:
        unlink_and_remove(old)
    tx, ty, tz = center_three
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius,
        depth=height,
    )
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (tx, -tz, ty)
    if mat:
        obj.data.materials.append(mat)
    col.objects.link(obj)
    return obj


def upgrade_kampung():
    col = find_collection("KampungSet")
    assert col is not None, "Collection KampungSet tidak ditemukan"

    pot_old = bpy.data.objects.get("KG_Grb_BakmieTio_DandangPot")
    rim_old = bpy.data.objects.get("KG_Grb_BakmieTio_DandangRim")
    broth_old = bpy.data.objects.get("KG_Grb_BakmieTio_DandangBroth")
    pot_mat = pot_old.data.materials[0] if (pot_old and pot_old.data.materials) else None
    rim_mat = rim_old.data.materials[0] if (rim_old and rim_old.data.materials) else pot_mat
    broth_mat = broth_old.data.materials[0] if (broth_old and broth_old.data.materials) else None

    for nm in (
        "KG_Grb_BakmieTio_DandangPot",
        "KG_Grb_BakmieTio_DandangRim",
        "KG_Grb_BakmieTio_DandangBroth",
        "KG_Grb_BakmieTio_SerokanBasket",
        "KG_Grb_BakmieTio_SerokanHandle",
    ):
        unlink_and_remove(bpy.data.objects.get(nm))

    dx, dz = -12.91, 17.62
    add_cylinder_mesh(col, "KG_Grb_BakmieTio_DandangPot", (dx, 1.01 + 0.09, dz), 0.14, 0.18, pot_mat, segs=24)
    add_cylinder_mesh(col, "KG_Grb_BakmieTio_DandangRim", (dx, 1.19 + 0.0075, dz), 0.148, 0.015, rim_mat, segs=24)
    add_cylinder_mesh(col, "KG_Grb_BakmieTio_DandangBroth", (dx, 1.18, dz), 0.132, 0.01, broth_mat, segs=24)

    pallet_mat = ensure_wood_pallet_material()
    add_slatted_pallet_mesh(col, "KG_Grb_BakmieTio_VendorPallet", (-13.60, 0.04, 18.15), (-12.65, 0.30, 18.65), pallet_mat)
    add_slatted_pallet_mesh(col, "KG_Grb_EsBuahYuni_VendorPallet", (-9.95, 0.04, 18.15), (-9.30, 0.30, 18.65), pallet_mat)
    add_slatted_pallet_mesh(col, "KG_WK_CounterPallet", (-0.55, 0.0, -2.48), (0.75, 0.44, -2.05), pallet_mat)
    print("UPGRADE KampungSet OK (slatted textured pallets + calibrated dandang)")


def upgrade_warkop():
    col = find_collection("WarkopSet")
    assert col is not None, "Collection WarkopSet tidak ditemukan"
    pallet_mat = ensure_wood_pallet_material()
    add_slatted_pallet_mesh(col, "WK_CounterPallet", (-0.55, 0.0, -2.48), (0.75, 0.44, -2.05), pallet_mat)
    print("UPGRADE WarkopSet OK (slatted textured pallet)")


def upgrade_kampus():
    col = find_collection("KampusSet")
    assert col is not None, "Collection KampusSet tidak ditemukan"
    wb = bpy.data.objects.get("KP2_Whiteboard")
    if wb is None or wb.type != "MESH":
        print("SKIP KampusSet: KP2_Whiteboard tidak ditemukan")
        return

    mw = wb.matrix_world
    world_three_z = [-(mw @ v.co).y for v in wb.data.vertices]
    if max(world_three_z) < -1.5:
        print("SKIP KampusSet: KP2_Whiteboard sudah bersih terpisah")
        return

    old_proj = bpy.data.objects.get("KP2_ProjectorMount")
    if old_proj:
        unlink_and_remove(old_proj)

    bm_wb = bmesh.new()
    bm_wb.from_mesh(wb.data)
    bm_wb.faces.ensure_lookup_table()

    bm_proj = bmesh.new()
    bm_proj.from_mesh(wb.data)
    bm_proj.faces.ensure_lookup_table()

    wb_del_faces = []
    proj_del_faces = []
    for idx, f in enumerate(bm_wb.faces):
        center_w = mw @ f.calc_center_median()
        three_z = -center_w.y
        if three_z >= -1.5:
            wb_del_faces.append(bm_wb.faces[idx])
        else:
            proj_del_faces.append(bm_proj.faces[idx])

    bmesh.ops.delete(bm_wb, geom=wb_del_faces, context="FACES")
    bmesh.ops.delete(bm_proj, geom=proj_del_faces, context="FACES")

    orphan_wb = [v for v in bm_wb.verts if len(v.link_faces) == 0]
    if orphan_wb:
        bmesh.ops.delete(bm_wb, geom=orphan_wb, context="VERTS")
    orphan_proj = [v for v in bm_proj.verts if len(v.link_faces) == 0]
    if orphan_proj:
        bmesh.ops.delete(bm_proj, geom=orphan_proj, context="VERTS")

    bm_wb.to_mesh(wb.data)
    bm_wb.free()
    wb.data.update()

    proj_mesh = bpy.data.meshes.new("KP2_ProjectorMount")
    bm_proj.to_mesh(proj_mesh)
    bm_proj.free()
    for m in wb.data.materials:
        proj_mesh.materials.append(m)

    proj_obj = bpy.data.objects.new("KP2_ProjectorMount", proj_mesh)
    proj_obj.matrix_world = mw.copy()
    col.objects.link(proj_obj)
    print("UPGRADE KampusSet OK: KP2_Whiteboard dipisah dari KP2_ProjectorMount")


def polish_materials_soft_matte():
    """Kalibrasi material soft-lit matte di semua 4 koleksi (`KampungSet`, `WarkopSet`, `KostSet`, `KampusSet`):
    - Pastikan permukaan non-logam/non-kaca memiliki `Roughness >= 0.84` (aspal/plester/beton/kayu/rumput `>= 0.88`).
    - Turunkan `NormalMap.Strength <= 0.44` agar permukaan tidak tampak bergerigi/plastik basah.
    - Beri tekstur beton halus pada `KG2_Concrete` / kanstin polos bila belum bertekstur.
    """
    skip_tokens = (
        "glass",
        "win",
        "chrome",
        "steel",
        "metal",
        "iron",
        "water",
        "mirror",
        "lamp",
        "bulb",
        "glow",
        "neon",
        "screen",
        "scr",
        "led",
        "code",
        "broth",
        "kuah",
        "oil",
        "minyak",
        "ceramic",
        "tile",
        "floor_tile",
        "kp_floor",
        "terrace",
    )
    extra_matte_tokens = (
        "asphalt",
        "road",
        "plaster",
        "wall",
        "concrete",
        "curb",
        "wood",
        "teak",
        "pallet",
        "grass",
        "foliage",
        "cobble",
        "paving",
        "brick",
        "roof",
        "fabric",
        "paint",
        "cardboard",
        "ground",
        "dirt",
    )

    updated = 0
    norms_softened = 0

    for mat in bpy.data.materials:
        if not mat.use_nodes or mat.node_tree is None:
            continue
        lname = mat.name.lower()
        bsdf = None
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                bsdf = node
                break
        if bsdf is None:
            continue

        # Haluskan semua Normal Map yang terlalu kuat (> 0.45)
        for node in mat.node_tree.nodes:
            if node.type == "NORMAL_MAP":
                cur_s = node.inputs["Strength"].default_value
                if cur_s > 0.45:
                    node.inputs["Strength"].default_value = 0.42
                    norms_softened += 1

        # v3.7 fix: matikan emisi neon siang hari pada 6 material non-lampu (297 mesh) agar tidak jadi blok datar menyilaukan
        if mat.name in ("KG_SignBlue", "KG_SignOrange", "KG_SignYellow"):
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 0.0
            bsdf.inputs["Roughness"].default_value = 0.86
            bsdf.inputs["Metallic"].default_value = 0.0
            if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked:
                bsdf.inputs["Specular IOR Level"].default_value = 0.14
            updated += 1
            continue
        if mat.name == "KG_Gold":
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 0.0
            bsdf.inputs["Roughness"].default_value = 0.42
            bsdf.inputs["Metallic"].default_value = 0.65
            if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked:
                bsdf.inputs["Specular IOR Level"].default_value = 0.35
            updated += 1
            continue
        if mat.name in ("KG_WinWarm", "KG_WinGlow"):
            # Siang: shaded berkusen/tirai (`window_night_warm.jpg`); Sore/Malam: dinyalakan dinamis oleh `GlbSet.tsx`
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 0.0
            bsdf.inputs["Roughness"].default_value = 0.48
            bsdf.inputs["Metallic"].default_value = 0.0
            if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked:
                bsdf.inputs["Specular IOR Level"].default_value = 0.22
            updated += 1
            continue

        # Lewati emissive, kaca/transparan, logam, cat kendaraan satin (`M_Veh_Paint_*`), dan keramik semi-gloss
        emit_s = bsdf.inputs["Emission Strength"].default_value if "Emission Strength" in bsdf.inputs else 0.0
        alpha = bsdf.inputs["Alpha"].default_value if "Alpha" in bsdf.inputs else 1.0
        metal = bsdf.inputs["Metallic"].default_value if "Metallic" in bsdf.inputs else 0.0
        trans = bsdf.inputs["Transmission Weight"].default_value if "Transmission Weight" in bsdf.inputs else 0.0
        if emit_s > 0.1 or alpha < 0.95 or metal > 0.35 or trans > 0.1:
            continue

        # Cat bodi kendaraan real-life & fasad UV/bayangan kontak dikecualikan dari clamp matte polos
        if lname.startswith(("m_veh_paint_", "m_veh_contactshadow", "m_rl_minimarketfront", "m_rl_atmfront")):
            continue

        # Bug fix v3.5: cek `rooftile` / `roof` SEBELUM `tile` agar KG_RoofTile mendapat matte 0.88 (bukan keramik 0.58)
        if "rooftile" in lname or "roof_tile" in lname:
            bsdf.inputs["Roughness"].default_value = 0.88
            if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked:
                bsdf.inputs["Specular IOR Level"].default_value = 0.14
            updated += 1
            continue

        # Keramik & ubin tetap semi-matte (0.58) agar tidak tampak seperti cermin plastik
        if any(k in lname for k in ("ceramic", "tile", "terrace", "kp_floor")):
            r_in = bsdf.inputs["Roughness"]
            if not r_in.is_linked and r_in.default_value < 0.56:
                r_in.default_value = 0.58
                updated += 1
            continue

        if any(k in lname for k in skip_tokens):
            continue

        target_rough = 0.88 if any(k in lname for k in extra_matte_tokens) else 0.84
        r_in = bsdf.inputs["Roughness"]
        if not r_in.is_linked and r_in.default_value < target_rough:
            r_in.default_value = target_rough
            updated += 1
        if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked:
            if bsdf.inputs["Specular IOR Level"].default_value > 0.18:
                bsdf.inputs["Specular IOR Level"].default_value = 0.14

    # Beri tekstur matte 512px pada permukaan col_mat polos utama (Fase 3 v3.5)
    flat_tex_bindings = {
        "KG2_Concrete": ("cracked_plaster_diff.jpg", "cracked_plaster_norm.jpg", 0.92, 0.34),
        "KG_ParkConcrete": ("park_concrete_diff.jpg", None, 0.90, 0.0),
        "KG_VendorPaver": ("vendor_paver_diff.jpg", None, 0.88, 0.0),
        "KG_CourtGreen": ("court_lines_diff.jpg", None, 0.88, 0.0),
        "KG_CourtTerracotta": ("court_terracotta_diff.jpg", None, 0.90, 0.0),
        "KG_WoodPlank": ("teak_wood_planks_diff.jpg", "teak_wood_planks_norm.jpg", 0.88, 0.34),
        "KG_GerobakWoodFrame": ("teak_wood_planks_diff.jpg", "teak_wood_planks_norm.jpg", 0.88, 0.34),
        "KG_DomeGreen": ("dome_panel_diff.jpg", None, 0.84, 0.0),
        "KG2_KaliWater": ("kali_water_diff.jpg", None, 0.24, 0.0),
        "KG2_PotClay": ("pot_clay_diff.jpg", None, 0.90, 0.0),
        "KG2_LeafGreen": ("banana_leaf_diff.jpg", None, 0.84, 0.0),
        "KG2_BananaLeaf": ("banana_leaf_diff.jpg", None, 0.84, 0.0),
        "KG2_BananaTrunk": ("teak_wood_dark_diff.jpg", None, 0.90, 0.0),
    }
    bound_count = 0
    for mat_name, (diff_f, norm_f, rough_v, norm_s) in flat_tex_bindings.items():
        m = bpy.data.materials.get(mat_name)
        if not (m and m.use_nodes and m.node_tree):
            continue
        nt = m.node_tree
        has_img = any(n.type == "TEX_IMAGE" for n in nt.nodes)
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if has_img or bsdf is None:
            continue
        d_img = load_or_reload_texture(diff_f, non_color=False)
        if d_img is not None:
            td = nt.nodes.new("ShaderNodeTexImage")
            td.image = d_img
            nt.links.new(td.outputs["Color"], bsdf.inputs["Base Color"])
            bound_count += 1
        if norm_f:
            n_img = load_or_reload_texture(norm_f, non_color=True)
            if n_img is not None:
                tn = nt.nodes.new("ShaderNodeTexImage")
                tn.image = n_img
                nm = nt.nodes.new("ShaderNodeNormalMap")
                nm.inputs["Strength"].default_value = norm_s
                nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
                nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = rough_v
        if "Specular IOR Level" in bsdf.inputs and not bsdf.inputs["Specular IOR Level"].is_linked and rough_v >= 0.80:
            bsdf.inputs["Specular IOR Level"].default_value = 0.12

    # Kalibrasi spesifik material non-standar (Fase 3 v3.5)
    explicit_tweaks = {
        "KG_WarkopTitleDark": (0.0, 0.86),
        "M_Tio_LampShade": (0.0, 0.78),
        "KG_Steel": (0.65, 0.52),
    }
    for mat_name, (met_v, rgh_v) in explicit_tweaks.items():
        m = bpy.data.materials.get(mat_name)
        if m and m.use_nodes and m.node_tree:
            bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf is not None:
                bsdf.inputs["Metallic"].default_value = met_v
                bsdf.inputs["Roughness"].default_value = rgh_v
                updated += 1

    # v3.6: Pasang tekstur jendela malam bertirai & berkusen (`window_night_warm.jpg`) pada KG_WinWarm & KG_WinGlow
    win_img = load_or_reload_texture("window_night_warm.jpg", non_color=False)
    if win_img is not None:
        for wname in ("KG_WinWarm", "KG_WinGlow"):
            wm = bpy.data.materials.get(wname)
            if wm and wm.use_nodes and wm.node_tree:
                nt = wm.node_tree
                bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
                has_img = any(n.type == "TEX_IMAGE" for n in nt.nodes)
                if bsdf is not None and not has_img:
                    td = nt.nodes.new("ShaderNodeTexImage")
                    td.image = win_img
                    nt.links.new(td.outputs["Color"], bsdf.inputs["Base Color"])
                    bound_count += 1

    print(f"POLISH soft-matte OK: {updated} materials raised to matte, {norms_softened} normal maps softened, {bound_count} flat mats textured")


def optimize_heavy_sign_meshes():
    """Rampingkan face datar berlebih pada mesh teks 3D (`*_SignMain*`/`*_SignSub*`) tanpa mengubah siluet huruf/AABB."""
    col = find_collection("KampungSet")
    if col is None:
        return
    saved_verts = 0
    touched = 0
    seen = set()
    for obj in col.all_objects:
        if obj.type != "MESH" or obj.data is None or obj.data.name in seen:
            continue
        if ("SignMain" not in obj.name and "SignSub" not in obj.name) or len(obj.data.polygons) <= 600:
            continue
        seen.add(obj.data.name)
        me = obj.data
        v_before = len(me.vertices)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.dissolve_limit(bm, angle_limit=0.04, verts=bm.verts[:], edges=bm.edges[:])
        bm.to_mesh(me)
        bm.free()
        me.update()
        diff = v_before - len(me.vertices)
        if diff > 0:
            saved_verts += diff
            touched += 1
    print(f"OPTIMIZE heavy sign meshes OK: {touched} meshes, -{saved_verts} redundant vertices")


def export_collection(col_name: str, out_stem: str):
    lc = find_layer_collection(bpy.context.view_layer.layer_collection, col_name)
    assert lc is not None, f"Layer collection {col_name} tidak ditemukan"
    lc.exclude = False
    lc.hide_viewport = False
    lc.collection.hide_viewport = False
    for o in lc.collection.all_objects:
        if o and not o.name.startswith("KG2_Proto_"):
            o.hide_set(False)
            o.hide_viewport = False
    bpy.context.view_layer.active_layer_collection = lc
    out_path = ROOT / "public" / "sets" / f"{out_stem}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        use_active_collection=True,
        use_visible=True,
        export_apply=True,
        export_yup=True,
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )
    size_mb = round(out_path.stat().st_size / 1e6, 2)
    print(f"EXPORT {out_stem}.glb -> {size_mb} MB")
    if out_stem == "kampung" and size_mb > 28.0:
        raise RuntimeError(f"kampung.glb melampaui hard-cap v3.5 28.0 MB ({size_mb} MB)")


def main():
    reload_all_textures_from_disk()
    upgrade_kampung()
    upgrade_warkop()
    upgrade_kampus()
    polish_materials_soft_matte()
    optimize_heavy_sign_meshes()

    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    print("SAVED bang_utoh_sets.blend")

    export_collection("KampungSet", "kampung")
    export_collection("WarkopSet", "warkop")
    export_collection("KostSet", "kost")
    export_collection("KampusSet", "kampus")


if __name__ == "__main__":
    main()
