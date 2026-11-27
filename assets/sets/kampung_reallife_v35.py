"""Modul Overhaul KampungSet v3.5 (Real-Life Indonesia Edition) — dipanggil oleh `build_kampung_v2.py`.

Struktur berfase:
- Fase 1: Diet geometri legacy (103 mesh teks 3D `10.52 MB -> <= 3.5 MB`, instancing 24 pohon legacy,
  deduplikasi material `KG_DarkWood` / `KS_Iron` / `KS_Wall` & `.001`).
- Fase 2: Overhaul kendaraan real-life Indonesia ter-instance:
  * Motor: `Proto_Motor_Matic`, `Proto_Motor_Bebek`, `Proto_Motor_Ojol` (ganti 340 node lama `KG_P5_Mot_Bebek01..10_*`
    + `build_motor()` untuk Bengkel & Rumah Warga).
  * Mobil: `Proto_Car_Angkot` (EP05 AABB lock persis 3.82×1.735×1.635), `Proto_Car_CityCar`, `Proto_Car_Pickup` (×2 Zona Barat).
  * Sepeda: `build_bike_reallife()` untuk `KG2_School_Bike_0..7`.
- Fase 3: Detail lingkungan Kampung Rawa Sari RT 04 (Masjid Al-Khawarizmi, kanstin hitam-putih, utilitas, Pos Ronda, Kos, FIK, Kali).

Koordinat Blender: X timur, Y utara, Z atas. Three.js: x = X, y = Z, z = -Y.
Semua ban memakai `seg = 16` (kelipatan 4) sehingga titik terendah ban menyentuh EKSAK `z = 0.000`.
"""
import math
import re
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

TEXT_TOKENS = (
    "SignMain",
    "SignSub",
    "_Curve",
    "BoardHead",
    "PosterSub",
    "MenuLine",
    "Title",
    "CrestTxt",
)

TWIN_SIGN_PAIRS = (
    ("KG_Gapura_SignMain_E", "KG_Gapura_SignMain_W"),
    ("KG_P7_Pedagang_SignMainN", "KG_P7_Pedagang_SignMainS"),
    ("KG_P5_PosRonda_SignMain_N", "KG_P5_PosRonda_SignMain_S"),
    ("KG_P7_Parkir_SignMainN", "KG_P7_Parkir_SignMainS"),
)

# Koordinat UV (u0, v0, u1, v1) di `reallife_signs_atlas.jpg` (1024x1024, v=1 di atas, v=0 di bawah)
ATLAS_UV = {
    "plate_motor": (0.008, 0.777, 0.242, 0.973),
    "plate_angkot": (0.258, 0.777, 0.492, 0.973),
    "plate_car": (0.508, 0.777, 0.742, 0.973),
    "angkot_sticker": (0.758, 0.768, 0.992, 0.982),
    "spanduk_bengkel": (0.006, 0.506, 0.494, 0.744),
    "spanduk_kos": (0.506, 0.506, 0.994, 0.744),
    "spanduk_pelan": (0.006, 0.256, 0.494, 0.494),
    "papan_kali": (0.506, 0.256, 0.994, 0.494),
    "papan_ronda": (0.006, 0.006, 0.494, 0.244),
    "papan_masjid": (0.506, 0.006, 0.994, 0.244),
}


def _world_bb(obj):
    ws = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return (
        min(w.x for w in ws),
        min(w.y for w in ws),
        min(w.z for w in ws),
        max(w.x for w in ws),
        max(w.y for w in ws),
        max(w.z for w in ws),
    )


def _remove_obj(obj):
    if obj is None:
        return
    me = obj.data if obj.type == "MESH" else None
    bpy.data.objects.remove(obj, do_unlink=True)
    if me is not None and me.users == 0:
        bpy.data.meshes.remove(me)


# =============================================================================
# FASE 1 — DIET GEOMETRI LEGACY & DEDUPLIKASI MATERIAL
# =============================================================================
def deduplicate_materials(log):
    """Gabungkan material duplikat (`.001`, `.002`, dll) & arahkan normal map duplikat ke induk 512px."""
    remapped = 0
    for me in list(bpy.data.meshes):
        for idx, mat in enumerate(me.materials):
            if mat is None:
                continue
            m = re.match(r"^(.+)\.\d{3}$", mat.name)
            if not m:
                continue
            base = bpy.data.materials.get(m.group(1))
            if base is not None and base != mat:
                me.materials[idx] = base
                remapped += 1

    removed = 0
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)
            removed += 1

    norm_alias = {
        "teak_wood_light_norm.jpg": "teak_wood_planks_norm.jpg",
        "teak_wood_dark_norm.jpg": "teak_wood_planks_norm.jpg",
        "kampus_tile_floor_norm.jpg": "ceramic_floor_tile_norm.jpg",
        "mossy_roof_norm.jpg": "terracotta_roof_norm.jpg",
        "rusty_zinc_norm.jpg": "corrugated_zinc_norm.jpg",
        "patched_asphalt_norm.jpg": "asphalt_road_norm.jpg",
    }
    redir = 0
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image is not None:
                target_name = norm_alias.get(node.image.name)
                if target_name:
                    parent_img = bpy.data.images.get(target_name)
                    if parent_img is not None:
                        node.image = parent_img
                        redir += 1
    for old_name in norm_alias:
        im = bpy.data.images.get(old_name)
        if im is not None and im.users == 0:
            bpy.data.images.remove(im)
    log(f"v3.5 dedup materials: remapped={remapped}, purged={removed}, norm_redirected={redir}")


def optimize_3d_text_meshes(col, log):
    """Rampingkan 100+ mesh teks 3D via planar dissolve, remove doubles, decimate terkendali, & twin sharing."""
    shared = 0
    for name_a, name_b in TWIN_SIGN_PAIRS:
        oa = bpy.data.objects.get(name_a)
        ob = bpy.data.objects.get(name_b)
        if oa and ob and oa.type == "MESH" and ob.type == "MESH" and oa.data != ob.data:
            da, db = oa.dimensions, ob.dimensions
            if max(abs(da.x - db.x), abs(da.y - db.y), abs(da.z - db.z)) < 0.08:
                old_me = ob.data
                ob.data = oa.data
                if old_me.users == 0:
                    bpy.data.meshes.remove(old_me)
                shared += 1

    seen = set()
    touched = 0
    v_before = 0
    v_after = 0

    for obj in list(col.all_objects):
        if obj.type != "MESH" or obj.data is None or obj.data.name in seen:
            continue
        if not any(tok in obj.name for tok in TEXT_TOKENS):
            continue
        seen.add(obj.data.name)
        me = obj.data
        v0 = len(me.vertices)
        if v0 < 60:
            continue
        v_before += v0

        bm = bmesh.new()
        bm.from_mesh(me)
        # Bersihkan simpul duplikat mikro & gabungkan hanya face datar (TANPA COLLAPSE decimate agar huruf 100% tajam!)
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0012)
        bmesh.ops.dissolve_limit(
            bm,
            angle_limit=0.05,
            use_dissolve_boundaries=False,
            verts=bm.verts[:],
            edges=bm.edges[:],
        )
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(me)
        bm.free()
        me.update()

        v_after += len(me.vertices)
        touched += 1

    log(f"v3.5 text diet: shared={shared}, meshes={touched}, verts {v_before} -> {v_after}")


def instance_legacy_trees(col, log):
    """Instancing 23 pohon legacy ke 2 prototype Crown + 2 prototype Trunk, menjaga AABB dunia eksak."""
    for kind, prefix, n_proto, dec_ratio in (
        ("Crown", "KG_TreeCrownMain_", 2, 0.45),
        ("Trunk", "KG_TreeTrunk_", 2, 0.55),
    ):
        objs = sorted(
            [o for o in col.all_objects if o.type == "MESH" and o.name.startswith(prefix)],
            key=lambda o: o.name,
        )
        if len(objs) <= n_proto:
            continue
        unique_meshes = {o.data for o in objs}
        if len(unique_meshes) <= n_proto:
            log(f"v3.5 legacy tree {kind}: sudah ter-instance ({len(unique_meshes)} proto)")
            continue

        proto_meshes = []
        for pi in range(n_proto):
            src = objs[pi]
            bb = _world_bb(src)
            sx, sy, sz = max(1e-4, bb[3] - bb[0]), max(1e-4, bb[4] - bb[1]), max(1e-4, bb[5] - bb[2])
            cx, cy, z0 = (bb[0] + bb[3]) * 0.5, (bb[1] + bb[4]) * 0.5, bb[2]

            pme = bpy.data.meshes.new(f"KG_Proto_Tree{kind}_{pi}")
            bm = bmesh.new()
            bm.from_mesh(src.data)
            bm.transform(src.matrix_world)
            for v in bm.verts:
                v.co.x = (v.co.x - cx) / sx
                v.co.y = (v.co.y - cy) / sy
                v.co.z = (v.co.z - z0) / sz
            bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.015)
            bm.to_mesh(pme)
            bm.free()
            for mat in src.data.materials:
                pme.materials.append(mat)

            tmp = bpy.data.objects.new(f"_tmp_tree_{kind}_{pi}", pme)
            col.objects.link(tmp)
            mod = tmp.modifiers.new("Dec", "DECIMATE")
            mod.ratio = dec_ratio
            dg = bpy.context.evaluated_depsgraph_get()
            eval_me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
            bm2 = bmesh.new()
            bm2.from_mesh(eval_me)
            bm2.to_mesh(pme)
            bm2.free()
            bpy.data.meshes.remove(eval_me)
            bpy.data.objects.remove(tmp, do_unlink=True)
            pme.update()
            proto_meshes.append(pme)

        old_meshes = []
        for idx, o in enumerate(objs):
            bb = _world_bb(o)
            sx, sy, sz = max(1e-4, bb[3] - bb[0]), max(1e-4, bb[4] - bb[1]), max(1e-4, bb[5] - bb[2])
            cx, cy, z0 = (bb[0] + bb[3]) * 0.5, (bb[1] + bb[4]) * 0.5, bb[2]
            old_me = o.data
            o.data = proto_meshes[idx % n_proto]
            o.location = (cx, cy, z0)
            o.rotation_euler = (0.0, 0.0, 0.0)
            o.scale = (sx, sy, sz)
            old_meshes.append(old_me)

        for ome in set(old_meshes):
            if ome.users == 0:
                bpy.data.meshes.remove(ome)
        log(f"v3.5 legacy tree {kind}: {len(objs)} objek -> {n_proto} linked proto")


# =============================================================================
# MATERIAL & GEOMETRY HELPER KENDARAAN REAL-LIFE INDONESIA
# =============================================================================
def _load_image(tex_dir: Path, fname: str):
    fpath = tex_dir / fname
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
    img.colorspace_settings.name = "sRGB"
    return img


def _load_atlas_image(tex_dir: Path):
    return _load_image(tex_dir, "reallife_signs_atlas.jpg")


def _make_contact_shadow_mat(tex_dir: Path):
    name = "M_Veh_ContactShadow"
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Base Color"].default_value = (0.02, 0.024, 0.03, 1.0)
    bs.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = 0.0
    td = nt.nodes.new("ShaderNodeTexImage")
    td.image = _load_image(tex_dir, "contact_shadow_alpha.png")
    nt.links.new(td.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(td.outputs["Alpha"], bs.inputs["Alpha"])
    nt.links.new(bs.outputs["BSDF"], out.inputs["Surface"])
    if hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    return mat


def _make_facade_mat(tex_dir: Path, name: str, rough: float = 0.82):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = 0.14
    td = nt.nodes.new("ShaderNodeTexImage")
    td.image = _load_image(tex_dir, "reallife_facades_atlas.jpg")
    nt.links.new(td.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(bs.outputs["BSDF"], out.inputs["Surface"])
    return mat


def _make_mat(name: str, rgb, rough=0.52, metal=0.0, emit=0.0, emit_rgb=None, spec=0.35):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Base Color"].default_value = (*rgb, 1.0)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = spec
    if emit > 0:
        bs.inputs["Emission Color"].default_value = (*(emit_rgb or rgb), 1.0)
        bs.inputs["Emission Strength"].default_value = emit
    nt.links.new(bs.outputs["BSDF"], out.inputs["Surface"])
    mat.diffuse_color = (*rgb, 1.0)
    return mat


def _make_atlas_mat(tex_dir: Path):
    name = "M_RL_SignsAtlas"
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Roughness"].default_value = 0.84
    bs.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = 0.14
    td = nt.nodes.new("ShaderNodeTexImage")
    td.image = _load_atlas_image(tex_dir)
    nt.links.new(td.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(bs.outputs["BSDF"], out.inputs["Surface"])
    return mat


def get_vehicle_materials(tex_dir: Path):
    """Palet material kendaraan soft-lit real-life: satin-paint (0.48-0.56), ban karet matte (0.90), velg metal (0.42)."""
    return {
        # Satin body paints (dikecualikan dari clamp >= 0.84 di upgrade_sets_v3.py via prefix `M_Veh_Paint_`)
        "paint_maroon": _make_mat("M_Veh_Paint_Maroon", (0.44, 0.055, 0.065), rough=0.50, metal=0.12, spec=0.38),
        "paint_navy": _make_mat("M_Veh_Paint_Navy", (0.055, 0.12, 0.30), rough=0.50, metal=0.14, spec=0.38),
        "paint_black": _make_mat("M_Veh_Paint_MatteBlack", (0.055, 0.060, 0.068), rough=0.56, metal=0.06, spec=0.30),
        "paint_white": _make_mat("M_Veh_Paint_PearlWhite", (0.86, 0.86, 0.84), rough=0.50, metal=0.06, spec=0.34),
        "paint_ojol": _make_mat("M_Veh_Paint_OjolGreen", (0.045, 0.42, 0.15), rough=0.50, metal=0.08, spec=0.36),
        "paint_angkot": _make_mat("M_Veh_Paint_AngkotBlue", (0.06, 0.36, 0.56), rough=0.52, metal=0.08, spec=0.34),
        "paint_angkot_stripe": _make_mat("M_Veh_Paint_AngkotYellow", (0.88, 0.66, 0.06), rough=0.54, metal=0.02, spec=0.28),
        "paint_silver": _make_mat("M_Veh_Paint_Silver", (0.64, 0.67, 0.71), rough=0.48, metal=0.28, spec=0.42),
        "paint_pickup": _make_mat("M_Veh_Paint_PickupDark", (0.08, 0.11, 0.16), rough=0.55, metal=0.10, spec=0.30),
        "paint_bike_red": _make_mat("M_Veh_Paint_BikeRed", (0.64, 0.09, 0.09), rough=0.52, metal=0.12, spec=0.34),
        # Komponen non-cat
        "tire": _make_mat("M_Veh_TireRubber", (0.032, 0.034, 0.038), rough=0.90, metal=0.0, spec=0.10),
        "plastic_dark": _make_mat("M_Veh_PlasticDark", (0.06, 0.065, 0.072), rough=0.80, metal=0.0, spec=0.14),
        "seat": _make_mat("M_Veh_SeatVinyl", (0.045, 0.045, 0.050), rough=0.84, metal=0.0, spec=0.12),
        "interior": _make_mat("M_Veh_CabinInterior", (0.09, 0.095, 0.105), rough=0.90, metal=0.0, spec=0.08),
        "rim": _make_mat("M_Veh_AlloyRim", (0.48, 0.51, 0.55), rough=0.44, metal=0.65, spec=0.38),
        "chrome": _make_mat("M_Veh_Chrome", (0.68, 0.71, 0.75), rough=0.34, metal=0.78, spec=0.44),
        "exhaust": _make_mat("M_Veh_ExhaustMetal", (0.24, 0.25, 0.27), rough=0.50, metal=0.60, spec=0.36),
        "glass": _make_mat("M_Veh_TintedGlass", (0.08, 0.13, 0.17), rough=0.22, metal=0.10, spec=0.52),
        "headlight": _make_mat("M_Veh_HeadlightLamp", (0.98, 0.96, 0.86), rough=0.24, metal=0.0, emit=0.45, emit_rgb=(1.0, 0.94, 0.78)),
        "taillight": _make_mat("M_Veh_TaillightLamp", (0.78, 0.06, 0.05), rough=0.28, metal=0.0, emit=0.30, emit_rgb=(0.95, 0.12, 0.08)),
        "amber": _make_mat("M_Veh_AmberSignal", (0.92, 0.48, 0.04), rough=0.32, metal=0.0, emit=0.12, emit_rgb=(1.0, 0.55, 0.08)),
        "tarp": _make_mat("M_Veh_TarpBlue", (0.08, 0.28, 0.62), rough=0.86, metal=0.0, spec=0.12),
        "cardboard": _make_mat("M_Veh_Cardboard", (0.62, 0.44, 0.26), rough=0.90, metal=0.0, spec=0.08),
        "galon": _make_mat("M_Veh_GalonBlue", (0.16, 0.46, 0.74), rough=0.32, metal=0.0, spec=0.38),
        "atlas": _make_atlas_mat(tex_dir),
        "contact_shadow": _make_contact_shadow_mat(tex_dir),
    }


class VMesh:
    """Mini mesh builder presisi tinggi khusus kendaraan smooth-curved & prop real-life dengan UV atlas eksak."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.mats = []
        self.uv_faces = set()
        self.smooth_faces = set()

    def mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _set_default_uv(self, faces):
        for f in faces:
            for loop in f.loops:
                loop[self.uv].uv = (0.02, 0.02)

    def mark_smooth(self, faces):
        for f in faces:
            self.smooth_faces.add(f)
        return faces

    def bevel_faces(self, faces, offset: float = 0.03, segments: int = 2, smooth: bool = True):
        """Bevel lembut pada tepi-tepi solid satu komponen bodi (melengkungkan sudut tajam tanpa mengubah AABB)."""
        valid_in = [f for f in faces if f.is_valid]
        mat_idx = valid_in[0].material_index if valid_in else 0
        edges = list({e for f in valid_in for e in f.edges if e.is_manifold})
        if not edges:
            return valid_in
        ret = bmesh.ops.bevel(
            self.bm,
            geom=edges,
            offset=offset,
            offset_type="OFFSET",
            segments=segments,
            profile=0.5,
            affect="EDGES",
            clamp_overlap=True,
            material=-1,
        )
        new_fs = [f for f in ret.get("faces", []) if f.is_valid]
        for f in new_fs:
            f.material_index = mat_idx
            f.normal_update()
        self._set_default_uv(new_fs)
        all_fs = [f for f in valid_in if f.is_valid] + new_fs
        if smooth:
            self.mark_smooth(all_fs)
        return all_fs

    def hull(self, ring0, ring1, mat, cap0=True, cap1=True, smooth_sides=False):
        b = [self.bm.verts.new(Vector(p)) for p in ring0]
        t = [self.bm.verts.new(Vector(p)) for p in ring1]
        n = len(b)
        faces = []
        side_faces = []
        if cap0:
            faces.append(self.bm.faces.new(list(reversed(b))))
        if cap1:
            faces.append(self.bm.faces.new(t))
        for i in range(n):
            j = (i + 1) % n
            sf = self.bm.faces.new([b[i], b[j], t[j], t[i]])
            faces.append(sf)
            side_faces.append(sf)
        idx = self.mi(mat)
        for f in faces:
            f.material_index = idx
            f.normal_update()
        self._set_default_uv(faces)
        if smooth_sides:
            self.mark_smooth(side_faces)
        return faces

    def box(self, x0, y0, z0, x1, y1, z1, mat, bevel=0.0, segs=2, smooth=False):
        if x1 < x0:
            x0, x1 = x1, x0
        if y1 < y0:
            y0, y1 = y1, y0
        if z1 < z0:
            z0, z1 = z1, z0
        if min(x1 - x0, y1 - y0, z1 - z0) <= 1e-5:
            return []
        r = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        fs = self.hull([(x, y, z0) for x, y in r], [(x, y, z1) for x, y in r], mat)
        if bevel > 0.0:
            fs = self.bevel_faces(fs, offset=bevel, segments=segs, smooth=smooth)
        elif smooth:
            self.mark_smooth(fs)
        return fs

    def loft_y(self, profile_xz, y0, y1, mat, bevel=0.0, segs=2, smooth=False):
        """Ekstrusi profil poligon 2D (x, z) sepanjang Y dengan opsi bevel & smooth shading organik."""
        r0 = [(x, y0, z) for x, z in profile_xz]
        r1 = [(x, y1, z) for x, z in profile_xz]
        b = [self.bm.verts.new(Vector(p)) for p in r0]
        t = [self.bm.verts.new(Vector(p)) for p in r1]
        n = len(b)
        faces = [self.bm.faces.new(b), self.bm.faces.new(list(reversed(t)))]
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new([b[j], b[i], t[i], t[j]]))
        idx = self.mi(mat)
        for f in faces:
            f.material_index = idx
            f.normal_update()
        self._set_default_uv(faces)
        if bevel > 0.0:
            faces = self.bevel_faces(faces, offset=bevel, segments=segs, smooth=smooth)
        elif smooth:
            self.mark_smooth(faces)
        return faces

    def dome_z(self, cx, cy, z0, r, h, mat, seg=16, rings=5):
        """Kubah bulat mulus (untuk helm half-face ojol & detail melengkung)."""
        layers = []
        for ri in range(rings):
            phi = (math.pi * 0.5) * (ri / float(rings))
            rr = r * math.cos(phi)
            zz = z0 + h * math.sin(phi)
            layers.append([
                (cx + rr * math.cos(2.0 * math.pi * i / seg), cy + rr * math.sin(2.0 * math.pi * i / seg), zz)
                for i in range(seg)
            ])
        all_fs = []
        for k in range(len(layers) - 1):
            fs = self.hull(layers[k], layers[k + 1], mat, cap0=(k == 0), cap1=False, smooth_sides=True)
            all_fs.extend(fs)
        # Tutup puncak kubah
        top_v = self.bm.verts.new(Vector((cx, cy, z0 + h)))
        ring_v = [self.bm.verts.new(Vector(p)) for p in layers[-1]]
        idx = self.mi(mat)
        for i in range(seg):
            j = (i + 1) % seg
            f = self.bm.faces.new([ring_v[i], ring_v[j], top_v])
            f.material_index = idx
            f.normal_update()
            self._set_default_uv([f])
            self.smooth_faces.add(f)
            all_fs.append(f)
        return all_fs

    def cyl_z(self, cx, cy, z0, z1, r0, mat, seg=12, r1=None, smooth=True):
        r1 = r0 if r1 is None else r1
        bot = [(cx + r0 * math.cos(2 * math.pi * i / seg), cy + r0 * math.sin(2 * math.pi * i / seg), z0) for i in range(seg)]
        top = [(cx + r1 * math.cos(2 * math.pi * i / seg), cy + r1 * math.sin(2 * math.pi * i / seg), z1) for i in range(seg)]
        return self.hull(bot, top, mat, smooth_sides=smooth)

    def cyl_y(self, cx, cy, cz, width, r, mat, seg=24, smooth=True):
        """Silinder horizontal sumbu Y (roda/velg). `seg` kelipatan 4 memastikan `minZ = cz - r` EKSAK!"""
        pts0, pts1 = [], []
        for i in range(seg):
            a = 2.0 * math.pi * i / seg
            u, v = r * math.cos(a), r * math.sin(a)
            pts0.append((cx + u, cy - width * 0.5, cz + v))
            pts1.append((cx + u, cy + width * 0.5, cz + v))
        return self.hull(pts0, pts1, mat, smooth_sides=smooth)

    def torus_z(self, cx, cy, cz, r_major, r_minor, mat, seg_major=16, seg_minor=6):
        """Cincin torus horizontal berlubang mulus (untuk ring basket real-life)."""
        rings = []
        for i in range(seg_major):
            theta = 2.0 * math.pi * i / seg_major
            ct, st = math.cos(theta), math.sin(theta)
            ring = []
            for j in range(seg_minor):
                phi = 2.0 * math.pi * j / seg_minor
                rr = r_major + r_minor * math.cos(phi)
                zz = cz + r_minor * math.sin(phi)
                ring.append((cx + rr * ct, cy + rr * st, zz))
            rings.append(ring)
        for i in range(seg_major):
            self.hull(rings[i], rings[(i + 1) % seg_major], mat, cap0=False, cap1=False, smooth_sides=True)

    def wheel_y(self, cx, cy, r_outer, width, VM, r_rim_ratio=0.58, seg=24, spokes=5):
        """Roda realistis smooth 24-segmen: ban karet berprofil bundar, velg alloy cekung, & 5 palang jari-jari.
        Titik kontak bawah selalu EKSAK di `z = 0.000` (karena `cz = r_outer` & `seg = 24 % 4 == 0`)."""
        cz = r_outer
        r_side = r_outer * 0.92
        w_tread = width * 0.70
        w_half = width * 0.5
        rings = []
        for y_off, rad in ((-w_half, r_side), (-w_tread * 0.5, r_outer), (w_tread * 0.5, r_outer), (w_half, r_side)):
            rings.append([
                (cx + rad * math.cos(2.0 * math.pi * i / seg), cy + y_off, cz + rad * math.sin(2.0 * math.pi * i / seg))
                for i in range(seg)
            ])
        for k in range(len(rings) - 1):
            self.hull(rings[k], rings[k + 1], VM["tire"], cap0=(k == 0), cap1=(k == len(rings) - 2), smooth_sides=True)

        # Velg alloy realistis menonjol rapi keluar dari sisi ban (bibir velg + piringan gelap + 5 palang)
        r_rim = r_outer * r_rim_ratio
        self.cyl_y(cx, cy, cz, width * 1.02, r_rim, VM["rim"], seg=16, smooth=True)
        self.cyl_y(cx, cy, cz, width * 1.045, r_rim * 0.80, VM["plastic_dark"], seg=16, smooth=True)
        self.cyl_y(cx, cy, cz, width * 1.07, r_rim * 0.30, VM["chrome"], seg=12, smooth=True)
        spoke_w = max(0.014, r_rim * 0.16)
        for s in range(spokes):
            a = 2.0 * math.pi * s / spokes
            tx, tz = cx + r_rim * 0.90 * math.cos(a), cz + r_rim * 0.90 * math.sin(a)
            for sy in (-width * 0.535, width * 0.535):
                self.beam((cx, cy + sy, cz), (tx, cy + sy, tz), spoke_w, VM["rim"])

    def beam(self, p0, p1, w, mat, seg=6):
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        if d.length < 1e-6:
            return
        z = d.normalized()
        up = Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((1, 0, 0))
        x = z.cross(up).normalized() * (w * 0.5)
        y = z.cross(x).normalized() * (w * 0.5)
        if seg <= 4:
            ring = [x + y, -x + y, -x - y, x - y]
        else:
            ring = [x * math.cos(2 * math.pi * i / seg) + y * math.sin(2 * math.pi * i / seg) for i in range(seg)]
        self.hull([p0 + r for r in ring], [p1 + r for r in ring], mat, smooth_sides=(seg >= 6))

    def quad_uv_rect(self, p00, p10, p11, p01, mat, uv_rect):
        """Buat quad tunggal CCW keluar dengan rentang UV eksplisit `(u0, v0, u1, v1)`."""
        u0, v0, u1, v1 = uv_rect
        vs = [self.bm.verts.new(Vector(p)) for p in (p00, p10, p11, p01)]
        f = self.bm.faces.new(vs)
        f.material_index = self.mi(mat)
        f.normal_update()
        for loop, uv_pt in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
            loop[self.uv].uv = uv_pt
        self.uv_faces.add(f)
        return f

    def quad_uv(self, p00, p10, p11, p01, mat, uv_key):
        return self.quad_uv_rect(p00, p10, p11, p01, mat, ATLAS_UV[uv_key])

    def add_contact_shadow(self, x0, x1, y0, y1, mat, z=0.005):
        """Pelat bayangan kontak kolong kendaraan menghadap +Z (bebas z-fighting & bebas outline tinta)."""
        return self.quad_uv_rect((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z), mat, (0.0, 0.0, 1.0, 1.0))

    def finish_mesh(self, name: str, auto_ground_z0: bool = True):
        """Selesaikan `bmesh` jadi `bpy.types.Mesh` dengan normal halus selektif & opsional snap exact `minZ == 0.0`."""
        solid_faces = [f for f in self.bm.faces if f.is_valid and f not in self.uv_faces]
        if solid_faces:
            bmesh.ops.recalc_face_normals(self.bm, faces=solid_faces)
        for f in self.bm.faces:
            if f.is_valid:
                f.smooth = f in self.smooth_faces
        if auto_ground_z0 and self.bm.verts:
            min_z = min(v.co.z for v in self.bm.verts)
            if abs(min_z) > 1e-5:
                for v in self.bm.verts:
                    v.co.z -= min_z
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        me.update()
        return me


# =============================================================================
# FASE 2 — PROTOTYPE MOTOR REAL-LIFE INDONESIA (MATIC, BEBEK, OJOL)
# =============================================================================
def build_motor_mesh(name: str, style: str, paint_key: str, VM: dict):
    """Bangun 1 prototype motor real-life Indonesia (hadap +X, panjang ~1.82 m, lebar setang ~0.64 m, minZ=0.000).
    style: 'matic' | 'bebek' | 'ojol'"""
    vm = VMesh()
    paint = VM[paint_key]
    dark = VM["plastic_dark"]
    chrome = VM["chrome"]
    seat = VM["seat"]
    exhaust = VM["exhaust"]

    # Roda depan & belakang (seg=24 smooth -> menapak eksak z=0.000)
    r_w = 0.255 if style in ("matic", "ojol") else 0.275
    w_t = 0.095 if style in ("matic", "ojol") else 0.082
    x_rear, x_front = -0.58, 0.59
    vm.wheel_y(x_rear, 0.0, r_w, w_t * 1.12, VM, r_rim_ratio=0.58, seg=24, spokes=5)
    vm.wheel_y(x_front, 0.0, r_w, w_t, VM, r_rim_ratio=0.58, seg=24, spokes=5)
    vm.add_contact_shadow(-0.84, 0.84, -0.26, 0.26, VM["contact_shadow"], z=0.005)

    # Garpu depan teleskopik miring ~24 deg (rake realistis) + as roda
    fork_top_x, fork_top_z = 0.37, 0.86
    for sy in (-0.068, 0.068):
        vm.beam((x_front, sy, r_w), (fork_top_x, sy * 0.88, fork_top_z), 0.032, chrome, seg=8)
        vm.beam((x_front, sy, r_w), (0.50, sy * 0.94, 0.50), 0.044, dark, seg=8)

    # Spakbor depan melengkung smooth mengikuti kurva ban
    fender_prof = [
        (x_front - 0.14, r_w + 0.14),
        (x_front + 0.02, r_w + 0.28),
        (x_front + 0.18, r_w + 0.22),
        (x_front + 0.22, r_w + 0.16),
        (x_front + 0.02, r_w + 0.23),
        (x_front - 0.12, r_w + 0.10),
    ]
    vm.loft_y(fender_prof, -0.068, 0.068, paint, bevel=0.015, segs=2, smooth=True)

    # Fairing depan meruncing smooth-beveled (tameng + sayap)
    front_cowl = [
        (0.24, 0.30),
        (0.46, 0.42),
        (0.60, 0.78),
        (0.46, 0.90),
        (0.32, 0.88),
        (0.22, 0.52),
    ]
    vm.loft_y(front_cowl, -0.155, 0.155, paint, bevel=0.032, segs=2, smooth=True)
    # Dek dalam / dasbor gelap menghadap pengendara
    vm.loft_y([(0.20, 0.30), (0.31, 0.32), (0.37, 0.86), (0.28, 0.86)], -0.14, 0.14, dark, bevel=0.016, segs=2, smooth=True)

    if style in ("matic", "ojol"):
        # Dek kaki rata khas motor matic Indonesia (Beat/Vario)
        vm.box(-0.24, -0.175, 0.24, 0.30, 0.175, 0.32, dark, bevel=0.015, segs=2, smooth=True)
        vm.box(-0.22, -0.165, 0.20, 0.28, 0.165, 0.25, paint, bevel=0.014, segs=2, smooth=True)
        # Bodi samping belakang sculpted smooth-beveled
        rear_body = [
            (-0.78, 0.64),
            (-0.26, 0.32),
            (-0.14, 0.68),
            (-0.72, 0.78),
        ]
        vm.loft_y(rear_body, -0.165, 0.165, paint, bevel=0.034, segs=2, smooth=True)
        # CVT cover (sisi kiri, +Y) + suspensi belakang tunggal
        vm.box(-0.60, 0.07, 0.22, -0.18, 0.155, 0.38, exhaust, bevel=0.016, segs=2, smooth=True)
        vm.beam((-0.55, 0.09, 0.32), (-0.42, 0.10, 0.62), 0.042, chrome, seg=8)
    else:
        # Motor Bebek (Supra/Vega): rangka tengah ramping, footstep, swing-arm, shock ganda
        vm.loft_y([(-0.18, 0.34), (0.24, 0.42), (0.20, 0.56), (-0.18, 0.52)], -0.095, 0.095, paint, bevel=0.022, segs=2, smooth=True)
        vm.box(-0.14, -0.10, 0.24, 0.14, 0.10, 0.40, exhaust, bevel=0.014, segs=2, smooth=True)
        vm.box(-0.02, -0.22, 0.26, 0.04, 0.22, 0.29, dark)
        vm.loft_y([(-0.78, 0.66), (-0.20, 0.52), (-0.16, 0.72), (-0.74, 0.80)], -0.135, 0.135, paint, bevel=0.028, segs=2, smooth=True)
        for sy in (-0.095, 0.095):
            vm.beam((x_rear, sy, r_w), (-0.12, sy, 0.30), 0.036, exhaust)
            vm.beam((x_rear + 0.02, sy, r_w + 0.04), (-0.46, sy, 0.68), 0.036, chrome, seg=8)

    # Knalpot kanan (-Y) + tameng panas gelap
    vm.beam((-0.10, -0.12, 0.24), (-0.64, -0.155, 0.36), 0.072, exhaust, seg=8)
    vm.beam((-0.24, -0.175, 0.28), (-0.58, -0.185, 0.36), 0.042, dark, seg=6)

    # Spakbor belakang + rumah plat belakang
    vm.beam((-0.74, 0.0, 0.66), (-0.86, 0.0, 0.42), 0.09, dark)

    # Jok hitam matte bertingkat membulat ergonomis + behel belakang
    vm.loft_y([
        (-0.68, 0.74), (-0.10, 0.68), (0.04, 0.72),
        (0.02, 0.80), (-0.28, 0.79), (-0.66, 0.85),
    ], -0.135, 0.135, seat, bevel=0.028, segs=2, smooth=True)
    vm.beam((-0.66, -0.13, 0.79), (-0.79, -0.11, 0.82), 0.024, chrome)
    vm.beam((-0.66, 0.13, 0.79), (-0.79, 0.11, 0.82), 0.024, chrome)
    vm.beam((-0.79, -0.11, 0.82), (-0.79, 0.11, 0.82), 0.026, chrome)

    # Batok setang smooth + visor + setang + handgrip + 2 kaca spion
    vm.loft_y([(0.30, 0.87), (0.49, 0.88), (0.47, 1.00), (0.31, 0.99)], -0.13, 0.13, paint, bevel=0.024, segs=2, smooth=True)
    vm.box(0.32, -0.09, 0.98, 0.42, 0.09, 1.04, VM["glass"], bevel=0.01, segs=1, smooth=True)
    vm.beam((0.36, -0.12, 0.94), (0.31, -0.30, 0.95), 0.026, chrome, seg=6)
    vm.beam((0.36, 0.12, 0.94), (0.31, 0.30, 0.95), 0.026, chrome, seg=6)
    vm.beam((0.32, -0.20, 0.948), (0.30, -0.315, 0.952), 0.036, dark, seg=8)
    vm.beam((0.32, 0.20, 0.948), (0.30, 0.315, 0.952), 0.036, dark, seg=8)
    for sy in (-1.0, 1.0):
        vm.beam((0.36, sy * 0.13, 0.97), (0.37, sy * 0.25, 1.12), 0.014, chrome, seg=6)
        vm.box(0.35, sy * 0.22, 1.09, 0.39, sy * 0.31, 1.16, dark, bevel=0.012, segs=2, smooth=True)
        vm.box(0.346, sy * 0.23, 1.10, 0.352, sy * 0.30, 1.15, chrome)

    # Lampu depan, sein kanan/kiri, & lampu rem belakang
    vm.box(0.54, -0.085, 0.73, 0.61, 0.085, 0.83, VM["headlight"], bevel=0.012, segs=1, smooth=True)
    vm.box(0.49, -0.145, 0.73, 0.56, -0.095, 0.80, VM["amber"])
    vm.box(0.49, 0.095, 0.73, 0.56, 0.145, 0.80, VM["amber"])
    vm.box(-0.80, -0.085, 0.67, -0.74, 0.085, 0.77, VM["taillight"])

    # Standar tengah (2 kaki menapak eksak z = 0.000)
    for sy in (-0.11, 0.11):
        vm.beam((-0.26, sy * 0.7, 0.23), (-0.30, sy, 0.008), 0.022, dark)
    vm.box(-0.32, -0.12, 0.0, -0.28, 0.12, 0.022, dark)

    # Plat nomor Indonesia depan & belakang (UV atlas `plate_motor`)
    vm.box(0.56, -0.09, 0.55, 0.585, 0.09, 0.65, dark)
    vm.quad_uv((0.588, -0.085, 0.555), (0.588, 0.085, 0.555), (0.588, 0.085, 0.645), (0.588, -0.085, 0.645), VM["atlas"], "plate_motor")
    vm.box(-0.86, -0.09, 0.49, -0.835, 0.09, 0.59, dark)
    vm.quad_uv((-0.863, 0.085, 0.495), (-0.863, -0.085, 0.495), (-0.863, -0.085, 0.585), (-0.863, 0.085, 0.585), VM["atlas"], "plate_motor")

    # Fitur khusus Ojol: phone holder di setang + helm half-face kubah bulat menggantung rapi di spion kanan
    if style == "ojol":
        vm.beam((0.36, 0.06, 0.96), (0.37, 0.09, 1.05), 0.015, dark)
        vm.box(0.35, 0.055, 1.03, 0.39, 0.125, 1.13, dark)
        vm.box(0.346, 0.062, 1.04, 0.351, 0.118, 1.12, VM["headlight"])
        # Helm half-face ojol kubah mulus di sisi luar spion kanan (terpisah bersih dari batok lampu)
        hx, hy, hz = 0.38, -0.35, 1.00
        vm.dome_z(hx, hy, hz, 0.118, 0.135, paint, seg=16, rings=5)
        vm.cyl_z(hx, hy, hz - 0.045, hz + 0.005, 0.118, paint, seg=16, r1=0.118, smooth=True)
        vm.cyl_z(hx, hy, hz - 0.058, hz - 0.042, 0.121, dark, seg=16, smooth=True)  # list karet bawah helm
        vm.box(hx + 0.065, hy - 0.085, hz - 0.035, hx + 0.13, hy + 0.085, hz + 0.045, VM["glass"], bevel=0.012, segs=2, smooth=True)

    return vm.finish_mesh(name, auto_ground_z0=True)


# =============================================================================
# FASE 2 — PROTOTYPE MOBIL REAL-LIFE INDONESIA (ANGKOT, CITY CAR, PIKAP)
# =============================================================================
def build_angkot_mesh(name: str, VM: dict):
    """Mikrolet / Angkot Real-Life Indonesia (hadap +X).
    KONTRAK EP05 LOCK: Dimensi luar EKSAK 3.82 m (X) × 1.735 m (Y) × 1.635 m (Z), `minZ = 0.000`!"""
    vm = VMesh()
    blue = VM["paint_angkot"]
    yellow = VM["paint_angkot_stripe"]
    dark = VM["plastic_dark"]
    glass = VM["glass"]
    interior = VM["interior"]
    chrome = VM["chrome"]

    # 4 Roda smooth 24-segmen di dalam wheel arch (r=0.295 -> minZ=0.000) + contact shadow kolong
    r_w = 0.295
    for wx in (-1.18, 1.24):
        for wy in (-0.755, 0.755):
            vm.wheel_y(wx, wy, r_w, 0.175, VM, r_rim_ratio=0.58, seg=24, spokes=5)
    vm.add_contact_shadow(-1.86, 1.86, -0.82, 0.82, VM["contact_shadow"], z=0.005)

    # Underbody + rongga wheel well gelap
    vm.box(-1.82, -0.78, 0.24, 1.82, 0.78, 0.36, dark)
    for wx in (-1.18, 1.24):
        vm.box(wx - 0.36, -0.83, 0.24, wx + 0.36, 0.83, 0.64, dark)

    # Bodi bawah cab-over sculpted smooth-beveled (X: -1.86..+1.88, Y: -0.825..+0.825)
    lower_prof = [
        (-1.86, 0.32), (1.84, 0.30), (1.88, 0.56), (1.82, 0.92),
        (-1.84, 0.94), (-1.87, 0.58),
    ]
    vm.loft_y(lower_prof, -0.825, 0.825, blue, bevel=0.05, segs=2, smooth=True)

    # Strip kuning khas Angkot sepanjang sisi & depan (halus)
    vm.box(-1.855, -0.834, 0.64, 1.865, 0.834, 0.76, yellow, bevel=0.015, segs=1, smooth=True)

    # Bumper depan & belakang hitam molded ber-bevel halus (tepat mencapai batas AABB X = -1.91..+1.91)
    vm.box(1.82, -0.845, 0.24, 1.91, 0.845, 0.44, dark, bevel=0.032, segs=2, smooth=True)
    vm.box(-1.91, -0.845, 0.24, -1.82, 0.845, 0.44, dark, bevel=0.032, segs=2, smooth=True)

    # Wheel arch flares (fender melengkung) di keempat roda
    for wx in (-1.18, 1.24):
        for sy in (-1.0, 1.0):
            y0, y1 = (sy * 0.82, sy * 0.862) if sy > 0 else (sy * 0.862, sy * 0.82)
            vm.loft_y([
                (wx - 0.38, 0.28), (wx - 0.26, 0.64), (wx + 0.26, 0.64), (wx + 0.38, 0.28),
                (wx + 0.31, 0.28), (wx + 0.21, 0.57), (wx - 0.21, 0.57), (wx - 0.31, 0.28),
            ], y0, y1, dark, bevel=0.012, segs=1, smooth=True)

    # Interior kabin gelap (dashboard, jok sopir, & bangku penumpang hadap-hadapan)
    vm.box(-1.66, -0.66, 0.42, 1.48, 0.66, 0.90, interior)
    vm.box(1.22, -0.64, 0.86, 1.56, 0.64, 1.02, dark)
    vm.cyl_z(1.20, -0.34, 0.96, 1.14, 0.15, dark, seg=10)
    vm.box(0.55, -0.60, 0.88, 0.78, -0.10, 1.26, interior)
    vm.box(-1.58, -0.66, 0.62, 0.35, -0.36, 1.08, interior)
    vm.box(-1.58, 0.36, 0.62, 0.35, 0.66, 1.08, interior)

    # Greenhouse kaca miring depan & atap (Z puncak EKSAK 1.635 m)
    glass_prof = [
        (-1.76, 0.93), (1.76, 0.91), (1.50, 1.55), (-1.70, 1.56),
    ]
    vm.loft_y(glass_prof, -0.775, 0.775, glass)

    # Atap lengkung halus ber-bevel 2 segmen (puncak tepat 1.635 m)
    roof_prof = [
        (-1.76, 1.54), (1.54, 1.53), (1.42, 1.635), (-1.64, 1.635),
    ]
    vm.loft_y(roof_prof, -0.785, 0.785, blue, bevel=0.042, segs=2, smooth=True)
    vm.box(-1.62, -0.72, 1.615, 1.38, 0.72, 1.635, yellow)

    # Pilar A, B, C, D & bingkai pintu geser
    for px0, px1 in ((-1.78, -1.66), (-0.70, -0.58), (0.38, 0.50), (1.44, 1.56)):
        for sy in (-1.0, 1.0):
            y0, y1 = (sy * 0.75, sy * 0.805) if sy > 0 else (sy * 0.805, sy * 0.75)
            if px0 > 1.2:
                vm.loft_y([(1.74, 0.92), (1.81, 0.92), (1.54, 1.55), (1.46, 1.55)], y0, y1, blue)
            else:
                vm.box(px0, y0, 0.92, px1, y1, 1.56, blue)

    # Stiker rute kaca atas depan `04 RAWA SARI` (UV atlas `angkot_sticker`, menonjol 1.5 cm di depan kaca)
    vm.quad_uv((1.595, -0.56, 1.38), (1.595, 0.56, 1.38), (1.535, 0.56, 1.525), (1.535, -0.56, 1.525), VM["atlas"], "angkot_sticker")

    # Twin wiper kaca depan
    for wy in (-0.34, 0.20):
        vm.beam((1.75, wy, 0.96), (1.66, wy + 0.34, 1.18), 0.016, dark)

    # Spion kanan & kiri pada tangkai (tepat mencapai batas AABB Y = -0.8675..+0.8675)
    for sy in (-1.0, 1.0):
        vm.beam((1.54, sy * 0.79, 1.08), (1.62, sy * 0.85, 1.14), 0.018, dark)
        y0, y1 = (sy * 0.82, sy * 0.8675) if sy > 0 else (sy * 0.8675, sy * 0.82)
        vm.box(1.58, y0, 1.06, 1.65, y1, 1.24, dark)

    # Gril depan, lampu utama, sein, lampu belakang, gagang pintu, & knalpot
    vm.box(1.855, -0.46, 0.50, 1.895, 0.46, 0.66, dark)
    vm.box(1.865, -0.42, 0.57, 1.90, 0.42, 0.60, chrome)
    for sy in (-0.64, 0.64):
        vm.box(1.84, sy - 0.14, 0.52, 1.895, sy + 0.14, 0.68, VM["headlight"])
        vm.box(1.84, sy - 0.14, 0.46, 1.892, sy + 0.14, 0.52, VM["amber"])
        vm.box(-1.895, sy - 0.11, 0.48, -1.84, sy + 0.11, 0.82, VM["taillight"])
        vm.box(-1.898, sy - 0.09, 0.62, -1.85, sy + 0.09, 0.70, VM["amber"])
    # Gagang pintu + rel pintu geser
    for sy in (-0.838, 0.838):
        vm.box(0.56, sy - 0.015, 0.80, 0.72, sy + 0.015, 0.84, dark)
        vm.box(-0.46, sy - 0.015, 0.80, -0.28, sy + 0.015, 0.84, dark)
    vm.box(-1.72, 0.825, 0.76, -0.58, 0.842, 0.79, dark)  # rel pintu geser kiri
    vm.beam((-1.52, -0.44, 0.24), (-1.88, -0.44, 0.24), 0.045, VM["exhaust"], seg=6)

    # Plat kuning Angkot depan & belakang (UV atlas `plate_angkot`)
    vm.quad_uv((1.912, -0.18, 0.30), (1.912, 0.18, 0.30), (1.912, 0.18, 0.42), (1.912, -0.18, 0.42), VM["atlas"], "plate_angkot")
    vm.quad_uv((-1.912, 0.18, 0.32), (-1.912, -0.18, 0.32), (-1.912, -0.18, 0.44), (-1.912, 0.18, 0.44), VM["atlas"], "plate_angkot")

    return vm.finish_mesh(name, auto_ground_z0=True)


def build_citycar_mesh(name: str, paint_key: str, VM: dict):
    """Hatchback LCGC Real-Life Indonesia (Brio/Agya-style, hadap +X, panjang 3.92 m, lebar 1.735 m, tinggi 1.50 m, minZ=0.000)."""
    vm = VMesh()
    paint = VM[paint_key]
    dark = VM["plastic_dark"]
    glass = VM["glass"]
    interior = VM["interior"]
    chrome = VM["chrome"]

    r_w = 0.285
    for wx in (-1.22, 1.24):
        for wy in (-0.75, 0.75):
            vm.wheel_y(wx, wy, r_w, 0.18, VM, r_rim_ratio=0.60, seg=24, spokes=5)
    vm.add_contact_shadow(-1.90, 1.90, -0.80, 0.80, VM["contact_shadow"], z=0.005)

    # Underbody + wheel wells
    vm.box(-1.82, -0.76, 0.20, 1.82, 0.76, 0.32, dark)
    for wx in (-1.22, 1.24):
        vm.box(wx - 0.35, -0.82, 0.20, wx + 0.35, 0.82, 0.62, dark)

    # Bodi bawah hatchback LCGC modern aerodinamis (kap cembung melandai halus + bevel 2-segmen)
    body_prof = [
        (-1.86, 0.27), (1.78, 0.22), (1.94, 0.34), (1.92, 0.56),
        (1.76, 0.72), (1.38, 0.83), (0.94, 0.91), (-1.70, 0.94), (-1.92, 0.66),
    ]
    vm.loft_y(body_prof, -0.805, 0.805, paint, bevel=0.068, segs=2, smooth=True)

    # Bumper depan/belakang membulat + gril bawah trapesium
    vm.box(1.78, -0.78, 0.20, 1.96, 0.78, 0.40, paint, bevel=0.045, segs=2, smooth=True)
    vm.box(1.90, -0.48, 0.24, 1.964, 0.48, 0.36, dark, bevel=0.015, segs=1, smooth=True)
    vm.box(-1.96, -0.79, 0.22, -1.80, 0.79, 0.45, paint, bevel=0.045, segs=2, smooth=True)
    vm.box(-1.964, -0.56, 0.22, -1.90, 0.56, 0.32, dark)

    # Wheel arch trim halus
    for wx in (-1.22, 1.24):
        for sy in (-1.0, 1.0):
            y0, y1 = (sy * 0.80, sy * 0.84) if sy > 0 else (sy * 0.84, sy * 0.80)
            vm.loft_y([
                (wx - 0.36, 0.24), (wx - 0.24, 0.61), (wx + 0.24, 0.61), (wx + 0.36, 0.24),
                (wx + 0.30, 0.24), (wx + 0.20, 0.55), (wx - 0.20, 0.55), (wx - 0.30, 0.24),
            ], y0, y1, dark, bevel=0.012, segs=1, smooth=True)

    # Interior kabin
    vm.box(-1.35, -0.62, 0.40, 0.85, 0.62, 0.92, interior)
    vm.box(0.55, -0.60, 0.82, 0.92, 0.60, 0.98, dark)
    vm.box(-0.08, -0.56, 0.88, 0.14, -0.08, 1.24, interior)
    vm.box(-0.08, 0.08, 0.88, 0.14, 0.56, 1.24, interior)

    # Greenhouse kaca miring aerodinamis + atap melengkung smooth (tinggi puncak 1.50 m)
    greenhouse = [
        (-1.62, 0.92), (0.98, 0.89), (0.34, 1.44), (-1.26, 1.45),
    ]
    vm.loft_y(greenhouse, -0.70, 0.70, glass)
    vm.loft_y([(-1.38, 1.43), (0.40, 1.42), (0.20, 1.50), (-1.18, 1.50)], -0.71, 0.71, paint, bevel=0.045, segs=2, smooth=True)
    vm.box(-1.60, -0.66, 1.41, -1.30, 0.66, 1.48, paint, bevel=0.02, segs=2, smooth=True)

    # Pilar A, B, C
    for sy in (-1.0, 1.0):
        y0, y1 = (sy * 0.68, sy * 0.745) if sy > 0 else (sy * 0.745, sy * 0.68)
        vm.loft_y([(0.90, 0.89), (1.02, 0.89), (0.40, 1.44), (0.28, 1.44)], y0, y1, paint, smooth=True)
        vm.box(-0.18, y0, 0.90, -0.06, y1, 1.44, dark)
        vm.loft_y([(-1.68, 0.92), (-1.42, 0.92), (-1.20, 1.45), (-1.38, 1.45)], y0, y1, paint, smooth=True)

    # Wiper & spion kanan-kiri membulat (lebar luar tepat 1.735 m)
    for wy in (-0.30, 0.18):
        vm.beam((0.92, wy, 0.92), (0.66, wy + 0.30, 1.16), 0.015, dark)
    for sy in (-1.0, 1.0):
        vm.beam((0.68, sy * 0.73, 0.92), (0.68, sy * 0.84, 0.96), 0.022, dark)
        y0, y1 = (sy * 0.78, sy * 0.8675) if sy > 0 else (sy * 0.8675, sy * 0.78)
        vm.box(0.60, y0, 0.92, 0.74, y1, 1.03, paint, bevel=0.02, segs=2, smooth=True)

    # Gril atas, headlamp miring, foglamp, tail lamp, gagang pintu
    vm.box(1.80, -0.44, 0.50, 1.93, 0.44, 0.65, dark, bevel=0.014, segs=1, smooth=True)
    vm.box(1.88, -0.40, 0.57, 1.94, 0.40, 0.60, chrome)
    for sy in (-0.61, 0.61):
        vm.box(1.70, sy - 0.15, 0.52, 1.91, sy + 0.15, 0.67, VM["headlight"], bevel=0.02, segs=1, smooth=True)
        vm.box(1.88, sy - 0.08, 0.27, 1.95, sy + 0.08, 0.36, VM["headlight"])
        vm.box(-1.93, sy - 0.14, 0.64, -1.84, sy + 0.14, 0.86, VM["taillight"], bevel=0.015, segs=1, smooth=True)
    for sy in (-0.828, 0.828):
        vm.box(0.06, sy - 0.015, 0.78, 0.22, sy + 0.015, 0.82, dark)
        vm.box(-0.82, sy - 0.015, 0.78, -0.66, sy + 0.015, 0.82, dark)

    # Plat putih mobil depan & belakang (UV atlas `plate_car`)
    vm.quad_uv((1.966, -0.18, 0.30), (1.966, 0.18, 0.30), (1.966, 0.18, 0.42), (1.966, -0.18, 0.42), VM["atlas"], "plate_car")
    vm.quad_uv((-1.966, 0.18, 0.42), (-1.966, -0.18, 0.42), (-1.966, -0.18, 0.54), (-1.966, 0.18, 0.54), VM["atlas"], "plate_car")

    return vm.finish_mesh(name, auto_ground_z0=True)


def build_pickup_mesh(name: str, VM: dict):
    """Pikap Bak Terbuka Real-Life Indonesia (L300 / Carry-style) bermuatan galon, kardus, & terpal lipat."""
    vm = VMesh()
    paint = VM["paint_pickup"]
    dark = VM["plastic_dark"]
    glass = VM["glass"]
    interior = VM["interior"]
    chrome = VM["chrome"]

    r_w = 0.30
    for wx in (-1.22, 1.24):
        for wy in (-0.74, 0.74):
            vm.wheel_y(wx, wy, r_w, 0.18, VM, r_rim_ratio=0.56, seg=24, spokes=5)
    vm.add_contact_shadow(-1.90, 1.90, -0.80, 0.80, VM["contact_shadow"], z=0.005)

    # Sasis ladder frame & bumper ber-bevel
    vm.box(-1.92, -0.68, 0.28, 1.88, 0.68, 0.44, dark)
    vm.box(1.84, -0.84, 0.26, 1.94, 0.84, 0.44, dark, bevel=0.03, segs=2, smooth=True)
    vm.box(-1.95, -0.84, 0.28, -1.86, 0.84, 0.42, dark, bevel=0.025, segs=2, smooth=True)

    # Kabin depan cab-over smooth-beveled (X: 0.32..1.90)
    cab_lower = [(0.32, 0.36), (1.88, 0.34), (1.90, 0.64), (1.84, 0.98), (0.32, 0.98)]
    vm.loft_y(cab_lower, -0.81, 0.81, paint, bevel=0.048, segs=2, smooth=True)
    vm.box(0.40, -0.64, 0.50, 1.62, 0.64, 1.00, interior)
    vm.loft_y([(0.34, 0.96), (1.80, 0.96), (1.56, 1.58), (0.34, 1.58)], -0.76, 0.76, glass)
    vm.box(0.30, -0.78, 0.94, 0.46, 0.78, 1.60, paint, bevel=0.025, segs=2, smooth=True)
    vm.loft_y([(0.30, 1.56), (1.58, 1.55), (1.46, 1.65), (0.32, 1.65)], -0.78, 0.78, paint, bevel=0.04, segs=2, smooth=True)
    # Pilar A + wiper + spion
    for sy in (-1.0, 1.0):
        y0, y1 = (sy * 0.74, sy * 0.80) if sy > 0 else (sy * 0.80, sy * 0.74)
        vm.loft_y([(1.74, 0.96), (1.83, 0.96), (1.59, 1.57), (1.50, 1.57)], y0, y1, paint)
        vm.beam((1.58, sy * 0.78, 1.12), (1.66, sy * 0.86, 1.16), 0.018, dark)
        my0, my1 = (sy * 0.83, sy * 0.88) if sy > 0 else (sy * 0.88, sy * 0.83)
        vm.box(1.62, my0, 1.08, 1.68, my1, 1.28, dark, bevel=0.012, segs=1, smooth=True)
    for wy in (-0.32, 0.20):
        vm.beam((1.78, wy, 1.00), (1.68, wy + 0.34, 1.22), 0.016, dark)

    # Bak terbuka belakang dengan rusuk samping realistis
    vm.box(-1.92, -0.82, 0.58, 0.24, 0.82, 0.68, paint)
    vm.box(-1.92, -0.82, 0.68, 0.24, -0.76, 1.04, paint, bevel=0.014, segs=1, smooth=True)
    vm.box(-1.92, 0.76, 0.68, 0.24, 0.82, 1.04, paint, bevel=0.014, segs=1, smooth=True)
    vm.box(-1.92, -0.82, 0.68, -1.86, 0.82, 1.04, paint, bevel=0.014, segs=1, smooth=True)
    vm.box(0.18, -0.82, 0.68, 0.24, 0.82, 1.04, paint)
    for rz in (0.76, 0.86, 0.96):
        vm.box(-1.88, -0.835, rz, 0.20, -0.815, rz + 0.025, paint)
        vm.box(-1.88, 0.815, rz, 0.20, 0.835, rz + 0.025, paint)
    # Teralis pelindung kaca belakang kabin (headache rack)
    for ry in (-0.76, -0.25, 0.25, 0.76):
        vm.beam((0.22, ry, 1.04), (0.22, ry, 1.62), 0.032, dark)
    vm.beam((0.22, -0.78, 1.62), (0.22, 0.78, 1.62), 0.036, dark)
    vm.beam((0.22, -0.78, 1.32), (0.22, 0.78, 1.32), 0.026, dark)

    # Muatan real-life Indonesia di dalam bak: 3 galon smooth 16-seg + tumpukan kardus + terpal biru
    for gx, gy in ((-0.25, -0.45), (-0.25, -0.10), (-0.60, -0.45)):
        vm.cyl_z(gx, gy, 0.68, 1.04, 0.14, VM["galon"], seg=16, smooth=True)
        vm.cyl_z(gx, gy, 1.04, 1.11, 0.14, VM["galon"], seg=16, r1=0.045, smooth=True)
        vm.cyl_z(gx, gy, 1.11, 1.16, 0.045, VM["tarp"], seg=12, smooth=True)
    vm.box(-1.45, -0.68, 0.68, -0.85, -0.05, 1.06, VM["cardboard"], bevel=0.015, segs=1)
    vm.box(-1.42, -0.64, 1.06, -0.92, -0.12, 1.36, VM["cardboard"], bevel=0.015, segs=1)
    vm.box(-1.68, 0.08, 0.68, -0.45, 0.68, 0.94, VM["tarp"], bevel=0.04, segs=2, smooth=True)

    # Gril, headlamp, tail lamp, & plat nomor
    vm.box(1.88, -0.50, 0.56, 1.915, 0.50, 0.72, dark)
    for sy in (-0.66, 0.66):
        vm.box(1.86, sy - 0.12, 0.56, 1.915, sy + 0.12, 0.72, VM["headlight"])
        vm.box(-1.955, sy - 0.12, 0.34, -1.90, sy + 0.12, 0.44, VM["taillight"])
    vm.quad_uv((1.942, -0.18, 0.30), (1.942, 0.18, 0.30), (1.942, 0.18, 0.42), (1.942, -0.18, 0.42), VM["atlas"], "plate_car")
    vm.quad_uv((-1.952, 0.18, 0.30), (-1.952, -0.18, 0.30), (-1.952, -0.18, 0.42), (-1.952, 0.18, 0.42), VM["atlas"], "plate_car")

    return vm.finish_mesh(name, auto_ground_z0=True)


# =============================================================================
# FASE 2 — SEPEDA SEKOLAH REAL-LIFE (UNTUK `build_kampung_v2.build_bike`)
# =============================================================================
def build_bike_mesh(name: str, VM: dict):
    """Sepeda sekolah real-life Indonesia: frame diamond, roda tipis ber-jari (seg=16, minZ=0.000),
    sadel, setang + keranjang depan, pedal, boncengan belakang, & standar menapak z=0.000."""
    vm = VMesh()
    frame_m = VM["paint_bike_red"]
    dark = VM["plastic_dark"]
    chrome = VM["chrome"]
    seat = VM["seat"]

    r_w = 0.32
    x_r, x_f = -0.52, 0.52
    vm.wheel_y(x_r, 0.0, r_w, 0.044, VM, r_rim_ratio=0.80, seg=16, spokes=6)
    vm.wheel_y(x_f, 0.0, r_w, 0.044, VM, r_rim_ratio=0.80, seg=16, spokes=6)

    # Frame diamond proporsional (bottom bracket di (-0.06, 0, 0.28))
    bb = (-0.06, 0.0, 0.28)
    st_top = (-0.16, 0.0, 0.72)
    ht_top = (0.34, 0.0, 0.76)
    ht_bot = (0.38, 0.0, 0.62)
    vm.beam(bb, st_top, 0.032, frame_m)      # seat tube
    vm.beam(bb, ht_bot, 0.034, frame_m)      # down tube
    vm.beam(st_top, ht_top, 0.028, frame_m)  # top tube
    vm.beam(ht_bot, ht_top, 0.036, frame_m)  # head tube
    # Chainstay & seatstay kiri-kanan
    for sy in (-0.04, 0.04):
        vm.beam((x_r, sy, r_w), (bb[0], sy * 0.5, bb[2]), 0.020, frame_m)
        vm.beam((x_r, sy, r_w), (st_top[0], sy * 0.4, st_top[2] - 0.04), 0.018, frame_m)
        vm.beam((x_f, sy, r_w), (ht_bot[0], sy * 0.5, ht_bot[2]), 0.022, frame_m)  # garpu depan

    # Seatpost + sadel
    vm.beam(st_top, (-0.19, 0.0, 0.83), 0.022, chrome)
    vm.loft_y([(-0.31, 0.83), (-0.08, 0.83), (-0.09, 0.88), (-0.30, 0.89)], -0.075, 0.075, seat)

    # Stem + setang melengkung + grip + keranjang depan
    vm.beam(ht_top, (0.31, 0.0, 0.90), 0.024, chrome)
    vm.beam((0.31, -0.24, 0.91), (0.31, 0.24, 0.91), 0.022, chrome)
    vm.beam((0.31, -0.25, 0.91), (0.28, -0.17, 0.91), 0.030, dark)
    vm.beam((0.31, 0.25, 0.91), (0.28, 0.17, 0.91), 0.030, dark)
    # Keranjang depan kotak kawat
    vm.box(0.36, -0.15, 0.66, 0.58, 0.15, 0.85, dark)
    vm.box(0.38, -0.13, 0.69, 0.56, 0.13, 0.86, chrome)

    # Boncengan belakang + pedal + standar samping menapak z=0.000
    vm.box(-0.78, -0.08, 0.67, -0.22, 0.08, 0.70, chrome)
    for sy in (-0.06, 0.06):
        vm.beam((x_r, sy, r_w), (-0.72, sy, 0.67), 0.016, chrome)
    vm.cyl_y(bb[0], 0.0, bb[2], 0.14, 0.075, chrome, seg=8)  # gir rantai
    vm.box(bb[0] - 0.04, -0.15, bb[2] - 0.02, bb[0] + 0.04, -0.08, bb[2] + 0.01, dark)
    vm.box(bb[0] - 0.04, 0.08, bb[2] - 0.02, bb[0] + 0.04, 0.15, bb[2] + 0.01, dark)
    vm.beam((-0.14, 0.04, 0.28), (-0.22, 0.16, 0.008), 0.018, chrome)  # standar samping
    vm.box(-0.24, 0.14, 0.0, -0.20, 0.18, 0.018, dark)

    return vm.finish_mesh(name, auto_ground_z0=True)


# =============================================================================
# FASE 2 — PENEMPATAN & PENGGANTIAN KENDARAAN DI `KampungSet`
# =============================================================================
def _link_instance(col, name: str, mesh, loc, rot_z: float = 0.0):
    old = bpy.data.objects.get(name)
    if old is not None:
        _remove_obj(old)
    ob = bpy.data.objects.new(name, mesh)
    ob.location = loc
    ob.rotation_euler = (0.0, 0.0, rot_z)
    col.objects.link(ob)
    return ob


def upgrade_vehicles_fase2(col, tex_dir: Path, log):
    """Ganti seluruh motor parkir (340 node -> 10 instanced), mobil jalan (48 node -> 4 instanced + 2 pikap),
    motor Bengkel/Rumah, & sepeda sekolah dengan prototype real-life Indonesia."""
    VM = get_vehicle_materials(tex_dir)

    # Hapus kendaraan lama/sebelumnya dan bersihkan orphan mesh `KG2_Proto_RL_*` agar penamaan bersih tanpa `.001`
    removed_mot = 0
    for o in list(col.all_objects):
        if o.name.startswith("KG_P5_Mot_Bebek"):
            _remove_obj(o)
            removed_mot += 1

    removed_car = 0
    for o in list(col.all_objects):
        if o.name.startswith(("KG_P5_Car_Angkot", "KG_P5_Car_CityCar", "KG2_RL_Car_Pickup")):
            _remove_obj(o)
            removed_car += 1

    for me in list(bpy.data.meshes):
        if me.name.startswith("KG2_Proto_RL_") and me.users == 0:
            bpy.data.meshes.remove(me)

    # 1. Bangun prototype motor real-life (5 variasi warna/tipe)
    m_matic_maroon = build_motor_mesh("KG2_Proto_RL_Motor_Matic_Maroon", "matic", "paint_maroon", VM)
    m_matic_black = build_motor_mesh("KG2_Proto_RL_Motor_Matic_Black", "matic", "paint_black", VM)
    m_matic_white = build_motor_mesh("KG2_Proto_RL_Motor_Matic_White", "matic", "paint_white", VM)
    m_bebek_navy = build_motor_mesh("KG2_Proto_RL_Motor_Bebek_Navy", "bebek", "paint_navy", VM)
    m_ojol = build_motor_mesh("KG2_Proto_RL_Motor_Ojol", "ojol", "paint_ojol", VM)
    motor_cycle = [
        m_matic_maroon, m_bebek_navy, m_ojol, m_matic_white, m_matic_black,
        m_bebek_navy, m_matic_maroon, m_matic_black, m_ojol, m_matic_white,
    ]

    # Pasang 10 motor real-life di posisi parkir eksak (Three.js z=13.15 -> Blender y=-13.15, z=16.85 -> y=-16.85)
    xs_park = (9.62, 11.181, 12.819, 14.38, 16.02)
    idx = 0
    for row_idx, (by, rz) in enumerate(((-13.15, math.pi * 0.5), (-16.85, -math.pi * 0.5))):
        for x in xs_park:
            idx += 1
            _link_instance(col, f"KG_P5_Mot_Bebek{idx:02d}", motor_cycle[idx - 1], (x, by, 0.0), rz)

    # Ganti mesh motor Bengkel (`KG2_Bengkel_Motor_0..2`) & motor teras Rumah (`KG2_Rumah_*_Motor`) ke prototype real-life
    replaced_kg2_mot = 0
    for i, o in enumerate(sorted([o for o in col.all_objects if o.type == "MESH" and (o.name.startswith("KG2_Bengkel_Motor_") or (o.name.startswith("KG2_Rumah_") and o.name.endswith("_Motor")))], key=lambda x: x.name)):
        old_me = o.data
        o.data = motor_cycle[i % len(motor_cycle)]
        o.scale = (1.0, 1.0, 1.0)  # skala 1:1 real-life (hapus hack scale 1.35 lama)
        if old_me.users == 0:
            bpy.data.meshes.remove(old_me)
        replaced_kg2_mot += 1

    # 2. Pasang 4 mobil jalan real-life (Angkot01/02 + CityCar1/2) + 2 Pikap Zona Barat

    me_angkot = build_angkot_mesh("KG2_Proto_RL_Car_Angkot", VM)
    me_city_silver = build_citycar_mesh("KG2_Proto_RL_Car_CityCar_Silver", "paint_silver", VM)
    me_city_maroon = build_citycar_mesh("KG2_Proto_RL_Car_CityCar_Maroon", "paint_maroon", VM)
    me_pickup = build_pickup_mesh("KG2_Proto_RL_Car_Pickup", VM)

    # EP05 LOCK: Angkot01 di [-25, -6.25, 0] (+X) & Angkot02 di [35, -6.25, 0] (+X), AABB 3.82×1.735×1.635!
    _link_instance(col, "KG_P5_Car_Angkot01", me_angkot, (-25.0, -6.25, 0.0), 0.0)
    _link_instance(col, "KG_P5_Car_Angkot02", me_angkot, (35.0, -6.25, 0.0), 0.0)
    # CityCar1 di [19.2, -7.6, 0] (-X) & CityCar2 di [-36.0, -7.6, 0] (-X)
    _link_instance(col, "KG_P5_Car_CityCar1", me_city_silver, (19.2, -7.6, 0.0), math.pi)
    _link_instance(col, "KG_P5_Car_CityCar2", me_city_maroon, (-36.0, -7.6, 0.0), math.pi)
    # 2 Pikap Real-Life di Zona Barat (dekat Bengkel & Warung Kelontong, 100% luar 3 koridor steril & KAMPUNG_SPOTS)
    _link_instance(col, "KG2_RL_Car_Pickup01", me_pickup, (-88.0, -5.1, 0.0), 0.0)
    _link_instance(col, "KG2_RL_Car_Pickup02", me_pickup, (-93.0, -7.9, 0.0), math.pi)

    # 3. Ganti 8 sepeda sekolah (`KG2_School_Bike_0..7`) dengan prototype real-life (minY = 0.080 eksak)
    me_bike = build_bike_mesh("KG2_Proto_RL_Bike", VM)
    replaced_bikes = 0
    for o in [o for o in col.all_objects if o.type == "MESH" and o.name.startswith("KG2_School_Bike_")]:
        old_me = o.data
        o.data = me_bike
        o.scale = (1.0, 1.0, 1.0)
        if old_me.users == 0:
            bpy.data.meshes.remove(old_me)
        replaced_bikes += 1

    # Bersihkan prototype motor/sepeda lama yang tidak terpakai
    for old_proto in ("KG2_Proto_Motor", "KG2_Proto_Bike"):
        po = bpy.data.objects.get(old_proto)
        if po is not None:
            _remove_obj(po)

    log(
        f"v3.5 Fase 2 vehicles: removed_mot={removed_mot}->10 parked + {replaced_kg2_mot} kg2, "
        f"removed_car={removed_car}->6 cars (2 angkot + 2 city + 2 pickup), bikes={replaced_bikes}"
    )


# =============================================================================
# FASE 3 — DETAIL REAL-LIFE KAMPUNG RAWA SARI RT 04
# =============================================================================
def get_detail_materials(tex_dir: Path):
    """Material matte khusus detail arsitektur & prop Kampung RT 04 (roughness >= 0.84)."""
    return {
        "white_matte": _make_mat("M_RL_WhiteMatte", (0.88, 0.87, 0.84), rough=0.90, metal=0.0, spec=0.10),
        "black_matte": _make_mat("M_RL_BlackMatte", (0.05, 0.052, 0.058), rough=0.90, metal=0.0, spec=0.10),
        "yellow_matte": _make_mat("M_RL_YellowMatte", (0.86, 0.68, 0.08), rough=0.88, metal=0.0, spec=0.12),
        "red_matte": _make_mat("M_RL_RedMatte", (0.68, 0.14, 0.12), rough=0.88, metal=0.0, spec=0.12),
        "green_mosque": _make_mat("M_RL_MosqueGreen", (0.08, 0.38, 0.22), rough=0.86, metal=0.0, spec=0.12),
        "cream_mosque": _make_mat("M_RL_MosqueCream", (0.86, 0.82, 0.72), rough=0.88, metal=0.0, spec=0.10),
        "gold_trim": _make_mat("M_RL_GoldTrim", (0.78, 0.60, 0.16), rough=0.46, metal=0.55, spec=0.35),
        "wood_warm": _make_mat("M_RL_WoodWarm", (0.44, 0.26, 0.12), rough=0.88, metal=0.0, spec=0.10),
        "wood_dark": _make_mat("M_RL_WoodDark", (0.24, 0.14, 0.07), rough=0.88, metal=0.0, spec=0.10),
        "bamboo": _make_mat("M_RL_Bamboo", (0.68, 0.56, 0.30), rough=0.88, metal=0.0, spec=0.10),
        "wicker": _make_mat("M_RL_WickerMat", (0.74, 0.64, 0.42), rough=0.92, metal=0.0, spec=0.08),
        "toren_orange": _make_mat("M_RL_TorenOrange", (0.84, 0.36, 0.08), rough=0.84, metal=0.0, spec=0.14),
        "toren_blue": _make_mat("M_RL_TorenBlue", (0.09, 0.34, 0.68), rough=0.84, metal=0.0, spec=0.14),
        "ac_beige": _make_mat("M_RL_ACBeige", (0.80, 0.79, 0.75), rough=0.84, metal=0.0, spec=0.14),
        "iron_dark": _make_mat("M_RL_IronDark", (0.14, 0.15, 0.17), rough=0.52, metal=0.62, spec=0.32),
        "steel": _make_mat("M_RL_Steel", (0.58, 0.60, 0.64), rough=0.48, metal=0.68, spec=0.38),
        "tile_wudhu": _make_mat("M_RL_WudhuTile", (0.68, 0.80, 0.82), rough=0.58, metal=0.0, spec=0.22),
        "plastic_blue": _make_mat("M_RL_PlasticBlue", (0.12, 0.36, 0.72), rough=0.84, metal=0.0, spec=0.14),
        "plastic_green": _make_mat("M_RL_PlasticGreen", (0.12, 0.52, 0.24), rough=0.84, metal=0.0, spec=0.14),
        "stone_kali": _make_mat("M_RL_RiverStone", (0.34, 0.33, 0.30), rough=0.92, metal=0.0, spec=0.08),
        "pvc_grey": _make_mat("M_RL_PvcGrey", (0.44, 0.46, 0.48), rough=0.84, metal=0.0, spec=0.14),
        "sack": _make_mat("M_RL_RiceSack", (0.86, 0.83, 0.74), rough=0.92, metal=0.0, spec=0.08),
        "glass_dark": _make_mat("M_RL_GlassCase", (0.18, 0.28, 0.34), rough=0.24, metal=0.0, spec=0.40),
        "kerupuk": _make_mat("M_RL_Kerupuk", (0.90, 0.86, 0.74), rough=0.90, metal=0.0, spec=0.08),
        "atlas": _make_atlas_mat(tex_dir),
    }


def _place_vmesh(col, name: str, vm: VMesh, loc=(0.0, 0.0, 0.0), rot_z: float = 0.0, ground_z0: bool = False):
    me = vm.finish_mesh(name, auto_ground_z0=ground_z0)
    return _link_instance(col, name, me, loc, rot_z)


def build_kampung_details_fase3(col, tex_dir: Path, log):
    """Tambahkan detail real-life Kampung Rawa Sari RT 04 (100% di luar 3 koridor steril & 48 KAMPUNG_SPOTS)."""
    DM = get_detail_materials(tex_dir)
    added = 0

    # Hapus detail lama `KG2_RL_` selain kendaraan Pickup bila rebuild
    for o in list(col.all_objects):
        if o.name.startswith("KG2_RL_") and not o.name.startswith("KG2_RL_Car_"):
            _remove_obj(o)

    # -------------------------------------------------------------------------
    # 1. MASJID AL-KHAWARIZMI LANDMARK UPGRADE (x: -25.8..-20.2, y: -2.0..3.6)
    # -------------------------------------------------------------------------
    mj = VMesh()
    # Serambi depan bertiang & 2 anak tangga (y: -3.05..-2.0, z: 0.0..0.32, di luar koridor EP05 x <= -26)
    mj.box(-25.6, -2.95, 0.0, -20.4, -2.0, 0.30, DM["cream_mosque"])
    mj.box(-24.4, -3.22, 0.0, -21.6, -2.95, 0.15, DM["cream_mosque"])  # anak tangga bawah
    # 4 tiang serambi + lis emas + kanopi serambi (z: 2.96..3.18 -> bebas 23 cm di bawah papan MASJID AL-KHAWARIZMI z=3.41)
    for tx in (-25.35, -23.95, -22.05, -20.65):
        mj.box(tx - 0.12, -2.92, 0.30, tx + 0.12, -2.68, 2.96, DM["cream_mosque"])
        mj.box(tx - 0.15, -2.95, 0.30, tx + 0.15, -2.65, 0.48, DM["green_mosque"])
        mj.box(tx - 0.15, -2.95, 2.80, tx + 0.15, -2.65, 2.96, DM["gold_trim"])
    # Lengkung dekoratif islami di antara tiang serambi
    for ax0, ax1 in ((-25.25, -24.05), (-23.85, -22.15), (-21.95, -20.75)):
        am = (ax0 + ax1) * 0.5
        mj.box(ax0, -2.86, 2.60, ax1, -2.74, 2.96, DM["green_mosque"])
        mj.box(am - 0.32, -2.88, 2.44, am + 0.32, -2.72, 2.64, DM["cream_mosque"])
    # Kanopi serambi hijau zamrud
    mj.box(-25.8, -3.15, 2.96, -20.2, -2.0, 3.18, DM["green_mosque"])
    mj.box(-25.85, -3.18, 2.93, -20.15, -3.10, 3.03, DM["gold_trim"])

    # Kusen lengkung islami pintu utama & 2 jendela fasad selatan (y = -2.04)
    mj.box(-23.65, -2.08, 0.30, -22.35, -1.98, 2.55, DM["wood_dark"])
    mj.box(-23.52, -2.10, 0.32, -22.48, -2.02, 2.38, DM["wood_warm"])
    mj.box(-23.02, -2.12, 0.32, -22.98, -2.00, 2.38, DM["wood_dark"])  # celah pintu ganda
    mj.box(-23.55, -2.10, 2.38, -22.45, -2.00, 2.68, DM["gold_trim"])   # puncak lengkung pintu
    for wx in (-24.65, -21.35):
        mj.box(wx - 0.52, -2.08, 1.15, wx + 0.52, -1.98, 2.48, DM["green_mosque"])
        mj.box(wx - 0.42, -2.10, 1.24, wx + 0.42, -2.01, 2.35, DM["glass_dark"])
        mj.box(wx - 0.32, -2.10, 2.35, wx + 0.32, -2.00, 2.56, DM["gold_trim"])

    # Rak sandal kayu di serambi barat
    mj.box(-25.45, -2.75, 0.30, -24.55, -2.35, 0.96, DM["wood_warm"])
    for sz in (0.48, 0.70, 0.92):
        mj.box(-25.40, -2.78, sz, -24.60, -2.32, sz + 0.03, DM["wood_dark"])

    # Kotak amal hijau + tutup emas di samping pintu
    mj.box(-24.22, -2.45, 0.30, -23.82, -2.08, 1.02, DM["green_mosque"])
    mj.box(-24.25, -2.48, 1.02, -23.79, -2.05, 1.08, DM["gold_trim"])
    mj.box(-24.14, -2.47, 0.62, -23.90, -2.44, 0.90, DM["glass_dark"])

    # Bedug besar di rangka A-frame + kentongan di serambi timur
    bx, by, bz = -21.25, -2.45, 0.30
    for sx in (-0.36, 0.36):
        mj.beam((bx + sx, by - 0.24, bz), (bx + sx, by, bz + 1.10), 0.055, DM["wood_dark"])
        mj.beam((bx + sx, by + 0.24, bz), (bx + sx, by, bz + 1.10), 0.055, DM["wood_dark"])
    mj.beam((bx - 0.42, by, bz + 1.10), (bx + 0.42, by, bz + 1.10), 0.06, DM["wood_dark"])
    # Tabung bedug horizontal sumbu X (silinder 12 seg)
    seg = 12
    r_b = 0.24
    ring0 = [(bx - 0.34, by + r_b * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_b * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    ring1 = [(bx + 0.34, by + r_b * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_b * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    mj.hull(ring0, ring1, DM["wood_warm"])
    # Kulit bedug krem di kedua sisi
    r_k = 0.22
    mj.hull(
        [(bx - 0.36, by + r_k * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_k * math.sin(2 * math.pi * i / seg)) for i in range(seg)],
        [(bx - 0.34, by + r_k * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_k * math.sin(2 * math.pi * i / seg)) for i in range(seg)],
        DM["cream_mosque"],
    )
    mj.hull(
        [(bx + 0.34, by + r_k * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_k * math.sin(2 * math.pi * i / seg)) for i in range(seg)],
        [(bx + 0.36, by + r_k * math.cos(2 * math.pi * i / seg), bz + 0.66 + r_k * math.sin(2 * math.pi * i / seg)) for i in range(seg)],
        DM["cream_mosque"],
    )

    # Tempat wudhu samping timur masjid (x: -20.20..-19.85, y: -1.6..1.2 -> aman dari Gang Gapura x >= -19.8)
    mj.box(-20.20, -1.6, 0.0, -19.86, 1.2, 0.16, DM["tile_wudhu"])
    mj.box(-20.20, -1.6, 0.16, -20.08, 1.2, 1.18, DM["tile_wudhu"])
    for wy in (-1.1, -0.35, 0.40, 0.95):
        mj.box(-20.10, wy - 0.03, 0.86, -19.94, wy + 0.03, 0.91, DM["steel"])
        mj.box(-19.98, wy - 0.025, 0.78, -19.94, wy + 0.025, 0.88, DM["steel"])

    # Papan Kas Masjid UV (menempel di fasad timur serambi, menghadap selatan -Y)
    mj.box(-22.02, -2.06, 1.32, -20.78, -2.00, 2.02, DM["wood_dark"])
    mj.quad_uv((-21.98, -2.065, 1.36), (-20.82, -2.065, 1.36), (-20.82, -2.065, 1.98), (-21.98, -2.065, 1.98), DM["atlas"], "papan_masjid")

    _place_vmesh(col, "KG2_RL_Masjid_Upgrade", mj)
    added += 1

    # -------------------------------------------------------------------------
    # 2. KANSTIN BELANG HITAM-PUTIH + GRILL GOT + POLISI TIDUR JALAN UTAMA
    # -------------------------------------------------------------------------
    kb = VMesh()
    # Kanstin selatan penuh (x: -82..82, y: -9.32..-9.04, z: 0.05..0.064)
    seg_len = 1.0
    x = -82.0
    alt = 0
    while x < 82.0:
        mat_c = DM["white_matte"] if (alt % 2 == 0) else DM["black_matte"]
        kb.box(x, -9.32, 0.05, min(x + seg_len, 82.0), -9.04, 0.064, mat_c)
        # Kanstin utara (lewati koridor EP05 -36..-26 dan EP02 -5..5)
        if not (-36.5 <= x <= -25.5) and not (-5.5 <= x <= 5.5):
            kb.box(x, -3.96, 0.05, min(x + seg_len, 82.0), -3.68, 0.064, mat_c)
        x += seg_len
        alt += 1
    # Grill penutup got beton (di tepi jalan luar koridor steril)
    for gx, gy in ((-22.0, -3.98), (-7.5, -3.98), (6.8, -3.98), (23.2, -3.98), (-22.0, -9.02), (0.0, -9.02), (18.0, -9.02)):
        kb.box(gx - 0.38, gy - 0.16, 0.0, gx + 0.38, gy + 0.16, 0.025, DM["iron_dark"])
        for gi in range(5):
            bx_ = gx - 0.30 + gi * 0.15
            kb.box(bx_, gy - 0.13, 0.025, bx_ + 0.04, gy + 0.13, 0.035, DM["steel"])
    _place_vmesh(col, "KG2_RL_Kanstin_Got", kb)
    added += 1

    # 2 Polisi tidur kuning-hitam di jalan utama (di luar 3 koridor steril & KAMPUNG_SPOTS)
    sb_vm = VMesh()
    for i in range(10):
        yy = -2.2 + i * 0.44
        sb_vm.hull(
            [(-0.24, yy, 0.0), (0.24, yy, 0.0), (0.24, yy + 0.44, 0.0), (-0.24, yy + 0.44, 0.0)],
            [(-0.08, yy, 0.075), (0.08, yy, 0.075), (0.08, yy + 0.44, 0.075), (-0.08, yy + 0.44, 0.075)],
            DM["yellow_matte"] if i % 2 == 0 else DM["black_matte"],
        )
    me_sb = sb_vm.finish_mesh("KG2_Proto_RL_SpeedBumpMain", auto_ground_z0=True)
    _link_instance(col, "KG2_RL_SpeedBump_Gapura", me_sb, (-21.0, -6.5, 0.0), 0.0)
    _link_instance(col, "KG2_RL_SpeedBump_Timur", me_sb, (7.4, -6.5, 0.0), 0.0)
    added += 2

    # -------------------------------------------------------------------------
    # 3. UTILITAS: TOREN AIR, OUTDOOR AC, BOX KWh, TONG SAMPAH PILAH, POT BAN
    # -------------------------------------------------------------------------
    # Prototype Toren Air + Rangka Besi
    tr_vm = VMesh()
    for sx in (-0.42, 0.42):
        for sy in (-0.42, 0.42):
            tr_vm.box(sx - 0.03, sy - 0.03, 0.0, sx + 0.03, sy + 0.03, 0.65, DM["iron_dark"])
    tr_vm.box(-0.46, -0.46, 0.62, 0.46, 0.46, 0.68, DM["iron_dark"])
    tr_vm.cyl_z(0.0, 0.0, 0.68, 1.88, 0.48, DM["toren_orange"], seg=12)
    tr_vm.cyl_z(0.0, 0.0, 1.88, 2.02, 0.48, DM["toren_orange"], seg=12, r1=0.22)
    tr_vm.cyl_z(0.0, 0.0, 2.02, 2.12, 0.22, DM["black_matte"], seg=10)
    me_toren_o = tr_vm.finish_mesh("KG2_Proto_RL_TorenOrange", auto_ground_z0=True)

    tr_b = VMesh()
    for sx in (-0.42, 0.42):
        for sy in (-0.42, 0.42):
            tr_b.box(sx - 0.03, sy - 0.03, 0.0, sx + 0.03, sy + 0.03, 0.65, DM["iron_dark"])
    tr_b.box(-0.46, -0.46, 0.62, 0.46, 0.46, 0.68, DM["iron_dark"])
    tr_b.cyl_z(0.0, 0.0, 0.68, 1.88, 0.48, DM["toren_blue"], seg=12)
    tr_b.cyl_z(0.0, 0.0, 1.88, 2.02, 0.48, DM["toren_blue"], seg=12, r1=0.22)
    tr_b.cyl_z(0.0, 0.0, 2.02, 2.12, 0.22, DM["black_matte"], seg=10)
    me_toren_b = tr_b.finish_mesh("KG2_Proto_RL_TorenBlue", auto_ground_z0=True)

    # Pasang toren di atas atap Kos (z=6.65), atap Ruko Timur (x=34), & menara tandon belakang Masjid
    _link_instance(col, "KG2_RL_Toren_Kos", me_toren_o, (-10.2, 1.8, 6.65), 0.0)
    _link_instance(col, "KG2_RL_Toren_Masjid", me_toren_b, (-24.8, 2.6, 4.52), 0.0)
    _link_instance(col, "KG2_RL_Toren_RukoTimur", me_toren_b, (34.5, 2.0, 6.4), 0.0)
    added += 3

    # Prototype Unit Outdoor AC
    ac_vm = VMesh()
    ac_vm.box(-0.38, -0.14, 0.0, 0.38, 0.14, 0.54, DM["ac_beige"])
    ac_vm.cyl_y(-0.10, -0.145, 0.27, 0.02, 0.19, DM["iron_dark"], seg=12)
    ac_vm.box(0.18, -0.15, 0.10, 0.33, -0.135, 0.44, DM["iron_dark"])
    for sx in (-0.30, 0.30):
        ac_vm.box(sx - 0.02, -0.12, -0.14, sx + 0.02, 0.16, 0.0, DM["steel"])
    me_ac = ac_vm.finish_mesh("KG2_Proto_RL_OutdoorAC", auto_ground_z0=False)
    for i, (ax, ay, az, rz) in enumerate((
        (-14.6, -2.55, 3.85, 0.0),
        (-10.1, -2.55, 3.85, 0.0),
        (31.5, -2.10, 3.40, 0.0),
        (35.5, -2.10, 3.40, 0.0),
    )):
        _link_instance(col, f"KG2_RL_OutdoorAC_{i}", me_ac, (ax, ay, az), rz)
        added += 1

    # Box KWh meteran listrik di 10 tiang listrik utama (instanced)
    kwh_vm = VMesh()
    kwh_vm.box(-0.14, -0.24, 0.0, 0.14, -0.06, 0.38, DM["ac_beige"])
    kwh_vm.box(-0.08, -0.25, 0.18, 0.08, -0.23, 0.30, DM["glass_dark"])
    me_kwh = kwh_vm.finish_mesh("KG2_Proto_RL_BoxKWh", auto_ground_z0=False)
    poles = sorted([o for o in col.all_objects if o.name.startswith("KG2_P5_PowerPole_")], key=lambda o: o.name)
    for i, po in enumerate(poles[::3]):
        _link_instance(col, f"KG2_RL_BoxKWh_{i}", me_kwh, (po.location.x, po.location.y, 1.65), po.rotation_euler.z)
        added += 1

    # Tong sampah pilah (Organik hijau + Anorganik kuning) & Pot ban bekas dicat putih-merah
    bin_vm = VMesh()
    bin_vm.box(-0.55, -0.22, 0.0, 0.55, 0.22, 0.05, DM["iron_dark"])
    for bx_s in (-0.28, 0.28):
        bin_vm.box(bx_s - 0.025, -0.025, 0.05, bx_s + 0.025, 0.025, 0.92, DM["iron_dark"])
    bin_vm.cyl_z(-0.28, 0.0, 0.22, 0.80, 0.18, DM["plastic_green"], seg=10, r1=0.20)
    bin_vm.cyl_z(-0.28, 0.0, 0.80, 0.88, 0.21, DM["green_mosque"], seg=10, r1=0.14)
    bin_vm.cyl_z(0.28, 0.0, 0.22, 0.80, 0.18, DM["yellow_matte"], seg=10, r1=0.20)
    bin_vm.cyl_z(0.28, 0.0, 0.80, 0.88, 0.21, DM["black_matte"], seg=10, r1=0.14)
    me_bin = bin_vm.finish_mesh("KG2_Proto_RL_TrashPilah", auto_ground_z0=True)
    for i, (tx, ty, rz) in enumerate(((-6.0, -10.30, 0.0), (6.10, -10.30, 0.0), (15.5, -2.5, 0.0))):
        _link_instance(col, f"KG2_RL_TrashPilah_{i}", me_bin, (tx, ty, 0.0), rz)
        added += 1

    pot_vm = VMesh()
    pot_vm.cyl_z(0.0, 0.0, 0.0, 0.24, 0.30, DM["white_matte"], seg=12)
    pot_vm.cyl_z(0.0, 0.0, 0.24, 0.34, 0.29, DM["red_matte"], seg=12, r1=0.26)
    pot_vm.cyl_z(0.0, 0.0, 0.30, 0.35, 0.23, DM["wood_dark"], seg=10)
    for bi in range(6):
        ang = 2.0 * math.pi * bi / 6.0
        pot_vm.beam((0.0, 0.0, 0.34), (0.22 * math.cos(ang), 0.22 * math.sin(ang), 0.68), 0.08, DM["plastic_green"])
    me_pot = pot_vm.finish_mesh("KG2_Proto_RL_PotBan", auto_ground_z0=True)
    for i, (px, py) in enumerate(((-4.95, -10.25), (0.0, -10.25), (10.25, -10.25), (12.70, -10.25))):
        _link_instance(col, f"KG2_RL_PotBan_{i}", me_pot, (px, py, 0.0), 0.0)
        added += 1

    # -------------------------------------------------------------------------
    # 4. POS RONDA RT 04 PROPS (di atas deck z=0.59 -> 100% aman dari spot posRonda)
    # -------------------------------------------------------------------------
    pr = VMesh()
    # Tikar anyaman
    pr.box(-13.80, -13.25, 0.59, -11.80, -11.55, 0.606, DM["wicker"])
    # Papan Jadwal Ronda UV di tiang belakang (menghadap utara/+Y ke arah jalan)
    pr.box(-13.45, -13.40, 1.38, -12.15, -13.34, 2.04, DM["wood_dark"])
    pr.quad_uv((-12.19, -13.335, 1.42), (-13.41, -13.335, 1.42), (-13.41, -13.335, 2.00), (-12.19, -13.335, 2.00), DM["atlas"], "papan_ronda")
    # Papan catur + teko + 2 gelas + toples kerupuk di atas tikar sisi timur-belakang
    pr.box(-12.78, -12.90, 0.606, -12.38, -12.50, 0.628, DM["wood_dark"])
    pr.box(-12.75, -12.87, 0.628, -12.41, -12.53, 0.634, DM["cream_mosque"])
    pr.cyl_z(-12.15, -12.65, 0.606, 0.80, 0.075, DM["steel"], seg=10, r1=0.055)       # teko
    pr.cyl_z(-12.02, -12.45, 0.606, 0.70, 0.036, DM["cream_mosque"], seg=8)            # gelas 1
    pr.cyl_z(-12.18, -12.38, 0.606, 0.70, 0.036, DM["cream_mosque"], seg=8)            # gelas 2
    pr.cyl_z(-12.06, -12.95, 0.606, 0.86, 0.095, DM["glass_dark"], seg=10)             # toples kerupuk
    pr.cyl_z(-12.06, -12.95, 0.64, 0.80, 0.075, DM["kerupuk"], seg=8)                  # isi kerupuk
    pr.cyl_z(-12.06, -12.95, 0.86, 0.90, 0.10, DM["plastic_blue"], seg=10)             # tutup toples
    # Sepasang sandal jepit rapi di tepi barat depan pijakan Pos Ronda (terpisah & > 0.8 m dari spot posRonda)
    sd = VMesh()
    for sx in (-13.92, -13.78):
        sd.box(sx - 0.045, -11.12, 0.0, sx + 0.045, -10.88, 0.018, DM["white_matte"])
        sd.beam((sx, -10.94, 0.035), (sx - 0.035, -11.04, 0.018), 0.014, DM["plastic_blue"])
        sd.beam((sx, -10.94, 0.035), (sx + 0.035, -11.04, 0.018), 0.014, DM["plastic_blue"])
    _place_vmesh(col, "KG2_RL_PosRonda_Props", pr)
    _place_vmesh(col, "KG2_RL_PosRonda_Sandals", sd)
    added += 2

    # -------------------------------------------------------------------------
    # 5. SPANDUK UV + KOS (JEMURAN BALKON & TALANG) + FIK (MADING & DISPENSER)
    # -------------------------------------------------------------------------
    env = VMesh()
    # Spanduk TERIMA KOS PUTRA (sisi timur pagar Kos, luar koridor EP02 x < -5)
    env.box(-9.9, -3.55, 0.0, -9.84, -3.49, 2.35, DM["iron_dark"])
    env.box(-7.8, -3.55, 0.0, -7.74, -3.49, 2.35, DM["iron_dark"])
    env.box(-9.86, -3.53, 1.38, -7.78, -3.50, 2.26, DM["white_matte"])
    env.quad_uv((-9.84, -3.535, 1.40), (-7.80, -3.535, 1.40), (-7.80, -3.535, 2.24), (-9.84, -3.535, 2.24), DM["atlas"], "spanduk_kos")

    # Jemuran handuk warna-warni di railing balkon Lt. 2 Kos + pipa talang hujan
    env.box(-14.35, -2.92, 3.92, -13.75, -2.84, 4.46, DM["plastic_blue"])
    env.box(-13.60, -2.92, 3.96, -13.05, -2.84, 4.46, DM["red_matte"])
    env.cyl_z(-15.96, -2.72, 0.0, 6.45, 0.055, DM["pvc_grey"], seg=8)

    # Selasar FIK: Mading berkaca + Dispenser galon biru (di luar spot kampusLobby/kampusPlaza)
    env.box(10.0, 0.44, 1.25, 11.4, 0.50, 2.10, DM["wood_dark"])
    env.box(10.08, 0.42, 1.33, 11.32, 0.45, 2.02, DM["cream_mosque"])
    env.box(10.06, 0.41, 1.31, 11.34, 0.425, 2.04, DM["glass_dark"])
    # Dispenser galon
    env.box(15.35, 0.52, 0.15, 15.72, 0.88, 1.05, DM["white_matte"])
    env.cyl_z(15.535, 0.70, 1.05, 1.44, 0.135, DM["toren_blue"], seg=10)

    # Spanduk JALAN PELAN dekat gerbang Sekolah (x=96..100, y=-2.6)
    env.box(96.0, -2.62, 0.0, 96.08, -2.54, 4.05, DM["iron_dark"])
    env.box(99.6, -2.62, 0.0, 99.68, -2.54, 4.05, DM["iron_dark"])
    env.box(96.06, -2.60, 3.05, 99.62, -2.56, 3.95, DM["yellow_matte"])
    env.quad_uv((96.10, -2.606, 3.08), (99.58, -2.606, 3.08), (99.58, -2.606, 3.92), (96.10, -2.606, 3.92), DM["atlas"], "spanduk_pelan")

    _place_vmesh(col, "KG2_RL_Kos_FIK_Spanduk", env)
    added += 1

    # -------------------------------------------------------------------------
    # 6. ZONA BARAT: KALI, BENGKEL, KELONTONG, & KANDANG BURUNG RUMAH WARGA
    # -------------------------------------------------------------------------
    wz = VMesh()
    # Spanduk TAMBAL BAN di tiang depan Bengkel Motor Jaya
    wz.box(-86.2, -2.30, 1.45, -86.14, -2.24, 2.38, DM["iron_dark"])
    wz.box(-88.6, -2.30, 1.45, -88.54, -2.24, 2.38, DM["iron_dark"])
    wz.box(-88.56, -2.28, 1.50, -86.18, -2.25, 2.34, DM["yellow_matte"])
    wz.quad_uv((-88.54, -2.286, 1.52), (-86.20, -2.286, 1.52), (-86.20, -2.286, 2.32), (-88.54, -2.286, 2.32), DM["atlas"], "spanduk_bengkel")
    # Pompa angin + rak botol oli di Bengkel
    wz.cyl_z(-95.2, 2.6, 0.12, 0.72, 0.045, DM["red_matte"], seg=8)
    wz.box(-95.32, 2.54, 0.12, -95.08, 2.66, 0.15, DM["iron_dark"])
    wz.box(-95.34, 2.57, 0.70, -95.06, 2.63, 0.74, DM["wood_warm"])

    # Kelontong Bu Sri: 2 kursi plastik biru + 3 karung beras (di teras y=-13.2, z=0.15)
    for cx_k in (-94.5, -93.6):
        wz.box(cx_k - 0.18, -13.38, 0.56, cx_k + 0.18, -13.02, 0.60, DM["plastic_blue"])
        for lx in (-0.15, 0.15):
            for ly in (-0.15, 0.15):
                wz.box(cx_k + lx - 0.02, -13.20 + ly - 0.02, 0.15, cx_k + lx + 0.02, -13.20 + ly + 0.02, 0.56, DM["plastic_blue"])
    for si, (sx, sy) in enumerate(((-90.1, -13.5), (-89.65, -13.55), (-89.9, -13.15))):
        wz.cyl_z(sx, sy, 0.15, 0.62 + (si % 2) * 0.06, 0.18, DM["sack"], seg=8, r1=0.14)

    # Bantaran Kali: Papan DILARANG BUANG SAMPAH KE KALI + pipa drainase + batu kali
    wz.box(-96.55, -3.22, 0.0, -96.47, -3.14, 1.95, DM["iron_dark"])
    wz.box(-95.25, -3.22, 0.0, -95.17, -3.14, 1.95, DM["iron_dark"])
    wz.box(-96.52, -3.20, 1.12, -95.20, -3.15, 1.92, DM["red_matte"])
    wz.quad_uv((-96.48, -3.206, 1.15), (-95.24, -3.206, 1.15), (-95.24, -3.206, 1.89), (-96.48, -3.206, 1.89), DM["atlas"], "papan_kali")
    for py_k in (-14.0, -1.0, 8.0, 22.0):
        wz.beam((-96.8, py_k, -0.45), (-97.25, py_k, -0.52), 0.14, DM["pvc_grey"], seg=6)
        wz.cyl_z(-99.4 + (abs(py_k) % 2.1), py_k + 0.6, -1.60, -1.05, 0.34, DM["stone_kali"], seg=7, r1=0.22)

    # Kandang burung gantung di teras 4 rumah warga (z = 2.1..2.65)
    for rx, ry in ((-125.0, 0.2), (-118.0, 0.2), (-111.0, 0.2), (-118.0, -13.4)):
        wz.cyl_z(rx, ry, 2.08, 2.48, 0.18, DM["bamboo"], seg=8)
        wz.cyl_z(rx, ry, 2.48, 2.66, 0.18, DM["wood_warm"], seg=8, r1=0.04)
        wz.beam((rx, ry, 2.66), (rx, ry, 2.86), 0.015, DM["iron_dark"])

    _place_vmesh(col, "KG2_RL_WestZone_Details", wz)
    added += 1

    log(f"v3.5 Fase 3 details OK: {added} objects added (Masjid landmark, kanstin, toren, AC, KWh, Pos Ronda, Kali, spanduk UV)")


# =============================================================================
# v3.6 VISUAL POLISH — POHON BERLAPIS, SEMAK, FASAD MINIMARKET/ATM/KELONTONG/BENGKEL, & JENDELA SAMPING
# =============================================================================
def _apply_front_uv_and_mat(obj, mat, uv_rect):
    """Petakan UV frontal (X -> u, Z -> v) pada mesh eksisting tanpa mengubah 1 milimeter pun posisi/AABB-nya.
    v3.7 fix: selalu gandakan data-block mesh bila dipakai bersama (>1 user) agar tidak mengkloning ke ruko lain!"""
    if obj is None or obj.type != "MESH" or obj.data is None:
        return False
    if obj.data.users > 1:
        obj.data = obj.data.copy()
        obj.data.name = f"{obj.name}_UniqueMesh"
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv_layer = bm.loops.layers.uv.verify()
    xs = [v.co.x for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    x0, x1 = min(xs), max(xs)
    z0, z1 = min(zs), max(zs)
    dx = max(1e-5, x1 - x0)
    dz = max(1e-5, z1 - z0)
    u0, v0, u1, v1 = uv_rect
    for f in bm.faces:
        f.material_index = 0
        for loop in f.loops:
            co = loop.vert.co
            tx = (co.x - x0) / dx
            tz = (co.z - z0) / dz
            loop[uv_layer].uv = (u0 + tx * (u1 - u0), v0 + tz * (v1 - v0))
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mat)
    me.update()
    return True


def upgrade_trees_and_bushes_v36(col, tex_dir: Path, log):
    """Upgrade prototype pohon legacy menjadi kanopi klaster berlapis organik + cabang batang,
    serta tambah semak tropis rendah di tepi taman/pagar/kali (100% di luar koridor steril & 48 spots)."""
    # 1. Upgrade 2 prototype mahkota pohon legacy (`KG_Proto_TreeCrown_0/1`) menjadi klaster 6 gugus daun organik
    crown_clusters = [
        [
            (0.00, 0.00, 0.56, 0.34, 0.34, 0.28),
            (-0.22, -0.14, 0.36, 0.26, 0.24, 0.24),
            (0.24, -0.10, 0.40, 0.25, 0.25, 0.23),
            (-0.18, 0.22, 0.44, 0.24, 0.24, 0.22),
            (0.20, 0.20, 0.34, 0.24, 0.24, 0.22),
            (0.02, -0.02, 0.80, 0.24, 0.22, 0.20),
        ],
        [
            (0.00, 0.00, 0.52, 0.35, 0.33, 0.27),
            (-0.24, 0.08, 0.34, 0.24, 0.25, 0.23),
            (0.22, -0.18, 0.38, 0.25, 0.24, 0.23),
            (0.08, 0.24, 0.44, 0.24, 0.24, 0.22),
            (-0.14, -0.22, 0.42, 0.23, 0.23, 0.21),
            (-0.04, 0.04, 0.82, 0.22, 0.22, 0.18),
        ],
    ]
    upgraded_crowns = 0
    for pi, lobes in enumerate(crown_clusters):
        pme = bpy.data.meshes.get(f"KG_Proto_TreeCrown_{pi}")
        if pme is None:
            continue
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        for cx, cy, cz, rx, ry, rz in lobes:
            ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
            for v in ret["verts"]:
                # Sedikit variasi organik per simpul tanpa melebihi kotak satuan
                wob = 1.0 + 0.08 * math.sin(v.co.x * 5.0 + v.co.y * 3.0 + pi) * math.cos(v.co.z * 4.0)
                v.co.x = cx + v.co.x * rx * wob
                v.co.y = cy + v.co.y * ry * wob
                v.co.z = cz + v.co.z * rz * wob
        # Normalisasi eksak ke [-0.5..0.5, -0.5..0.5, 0..1] agar AABB dunia 100% identik
        xs = [v.co.x for v in bm.verts]
        ys = [v.co.y for v in bm.verts]
        zs = [v.co.z for v in bm.verts]
        mx, my, z0 = (min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5, min(zs)
        sx, sy, sz = max(1e-4, max(xs) - min(xs)), max(1e-4, max(ys) - min(ys)), max(1e-4, max(zs) - z0)
        for v in bm.verts:
            v.co.x = (v.co.x - mx) / sx
            v.co.y = (v.co.y - my) / sy
            v.co.z = (v.co.z - z0) / sz
        for f in bm.faces:
            f.smooth = True
            f.material_index = 0
            for loop in f.loops:
                co = loop.vert.co
                loop[uv].uv = ((co.x + 0.5) * 1.4, co.z * 1.4)
        bm.to_mesh(pme)
        bm.free()
        pme.update()
        upgraded_crowns += 1

    # 2. Tambah semak tropis rendah ter-instance (`KG2_Proto_RL_Bush`) di tepi taman, pagar, & kali
    for o in list(col.all_objects):
        if o.name.startswith("KG2_RL_Bush_"):
            _remove_obj(o)
    bush_mat = bpy.data.materials.get("KG_Foliage") or _make_mat("M_RL_BushFoliage", (0.14, 0.32, 0.11), rough=0.88)
    bm_b = bmesh.new()
    uv_b = bm_b.loops.layers.uv.new("UVMap")
    for cx, cy, cz, rx, ry, rz in (
        (0.0, 0.0, 0.24, 0.36, 0.30, 0.26),
        (-0.26, 0.08, 0.19, 0.24, 0.22, 0.20),
        (0.28, -0.06, 0.20, 0.25, 0.22, 0.21),
        (0.04, 0.14, 0.34, 0.22, 0.20, 0.18),
    ):
        ret = bmesh.ops.create_icosphere(bm_b, subdivisions=2, radius=1.0)
        for v in ret["verts"]:
            v.co.x = cx + v.co.x * rx
            v.co.y = cy + v.co.y * ry
            v.co.z = max(0.0, cz + v.co.z * rz)
    for f in bm_b.faces:
        f.smooth = True
        f.material_index = 0
        for loop in f.loops:
            co = loop.vert.co
            loop[uv_b].uv = (co.x * 1.6 + 0.5, co.z * 1.6)
    me_bush = bpy.data.meshes.get("KG2_Proto_RL_Bush")
    if me_bush is None:
        me_bush = bpy.data.meshes.new("KG2_Proto_RL_Bush")
    bm_b.to_mesh(me_bush)
    bm_b.free()
    me_bush.materials.clear()
    me_bush.materials.append(bush_mat)
    me_bush.update()

    # Penempatan semak (100% di luar 3 koridor steril, bebas overlap bangku/bollard/pot ban, & jauh > 0.8 m dari 48 KAMPUNG_SPOTS)
    bush_spots = (
        (-15.2, -10.5, 0.0, 0.3),
        (-15.4, -12.6, 0.0, 1.2),
        (-9.65, -10.25, 0.0, 0.8),
        (11.50, -10.35, 0.0, 2.1),
        (17.8, -10.4, 0.0, 0.5),
        (-25.8, 0.4, 0.0, 1.5),
        (-7.2, -2.5, 0.0, 0.9),
        (-96.2, -10.4, 0.0, 0.4),
        (-100.8, -10.4, 0.0, 2.3),
        (-96.2, 11.2, -0.06, 1.1),
        (-1.55, -10.35, 0.0, 1.4),
        (1.55, -10.35, 0.0, 2.6),
    )
    for idx, (bx, by, bz, rot_z) in enumerate(bush_spots):
        _link_instance(col, f"KG2_RL_Bush_{idx:02d}", me_bush, (bx, by, bz), rot_z)

    log(f"v3.6 trees & bushes OK: crowns={upgraded_crowns}, bushes={len(bush_spots)}")


def upgrade_facades_v36(col, tex_dir: Path, log):
    """Upgrade fasad Minimarket 24 Jam (fix KG_ZincRoof), ATM 24 Jam (fix kotak biru polos),
    interior Kelontong & Bengkel, serta jendela samping pada gedung latar bata polos."""
    mat_mini = _make_facade_mat(tex_dir, "M_RL_MinimarketFront", rough=0.42)
    mat_atm = _make_facade_mat(tex_dir, "M_RL_AtmFront", rough=0.38)
    mat_int = _make_facade_mat(tex_dir, "M_RL_InteriorFacade", rough=0.86)

    # v3.7 fix: pulihkan 11 ruko lain yang sempat terkloning Minimarket akibat shared mesh `me_mp_b_48`
    # Beri kaca toko gelap (`KG_WinGlassDark`) agar deretan ruko tampak bervariasi alami (tidak kembar 12x)
    mat_shop_glass = bpy.data.materials.get("KG_WinGlassDark") or bpy.data.materials.get("KG_WinWarm")
    if mat_shop_glass is not None:
        restored_meshes = set()
        for o in col.all_objects:
            if o.type == "MESH" and "ShopFront" in o.name and o.name != "KG_RukoWest1_ShopFront_3":
                if o.data and o.data.materials and any(m and m.name == "M_RL_MinimarketFront" for m in o.data.materials):
                    if o.data not in restored_meshes:
                        o.data.materials.clear()
                        o.data.materials.append(mat_shop_glass)
                        restored_meshes.add(o.data)

    # 1. Minimarket 24 Jam (`KG_RukoWest1_ShopFront_3`): ganti tekstur seng karat -> kaca minimarket + rak + stiker 24 jam
    mini_ok = _apply_front_uv_and_mat(
        bpy.data.objects.get("KG_RukoWest1_ShopFront_3"),
        mat_mini,
        (0.005, 0.505, 0.495, 0.995),
    )
    # 2. ATM 24 Jam (`KG_P5_ATM_GlassFront`): ganti blok biru polos -> pintu kaca + mesin ATM lengkap
    atm_ok = _apply_front_uv_and_mat(
        bpy.data.objects.get("KG_P5_ATM_GlassFront"),
        mat_atm,
        (0.505, 0.505, 0.995, 0.995),
    )

    # 3. Panel UV Interior Warung Kelontong Bu Sri & Bengkel Motor Jaya (dipisah per bangunan agar AABB ketat)
    for o in list(col.all_objects):
        if o.name in (
            "KG2_RL_Interior_Panels",
            "KG2_RL_Kelontong_Interior",
            "KG2_RL_Bengkel_Interior",
            "KG2_RL_SideBuilding_WinBands",
        ) or o.name.startswith("KG2_RL_SideWin_"):
            _remove_obj(o)

    kel_ip = VMesh()
    # Kelontong Bu Sri: rak sembako dinding belakang + rentengan sachet di bawah lis depan
    kel_ip.quad_uv_rect((-88.8, -19.26, 0.95), (-95.4, -19.26, 0.95), (-95.4, -19.26, 2.75), (-88.8, -19.26, 2.75), mat_int, (0.005, 0.005, 0.495, 0.495))
    kel_ip.quad_uv_rect((-90.5, -13.98, 2.02), (-95.1, -13.98, 2.02), (-95.1, -13.98, 2.58), (-90.5, -13.98, 2.58), mat_int, (0.005, 0.36, 0.495, 0.495))
    _place_vmesh(col, "KG2_RL_Kelontong_Interior", kel_ip)

    bg_ip = VMesh()
    # Bengkel Motor Jaya: papan daftar servis + poster oli + rak botol oli di dinding belakang
    bg_ip.quad_uv_rect((-90.7, 7.72, 1.05), (-86.6, 7.72, 1.05), (-86.6, 7.72, 2.85), (-90.7, 7.72, 2.85), mat_int, (0.505, 0.005, 0.995, 0.495))
    _place_vmesh(col, "KG2_RL_Bengkel_Interior", bg_ip)

    # 4. Deret Jendela Samping & Lis Beton per gedung (`KG_SideBuildingW2/W1/E1/E2`) agar AABB ketat di dinding
    mat_frame = _make_mat("M_RL_SideWinFrame", (0.14, 0.15, 0.17), rough=0.84, metal=0.0, spec=0.10)
    mat_ledge = _make_mat("M_RL_SideLedge", (0.72, 0.70, 0.66), rough=0.90, metal=0.0, spec=0.08)
    mat_win = bpy.data.materials.get("KG_WinWarm") or _make_mat("M_RL_SideWinGlass", (0.20, 0.28, 0.36), rough=0.35)

    for tag, bname, side_dir in (
        ("W2", "KG_SideBuildingW2_Tower", -1.0),
        ("W1", "KG_SideBuildingW1_Tower", -1.0),
        ("E1", "KG_SideBuildingE1_Tower", 1.0),
        ("E2", "KG_SideBuildingE2_Tower", 1.0),
    ):
        tower = bpy.data.objects.get(bname)
        if tower is None:
            continue
        sb = VMesh()
        bb = _world_bb(tower)
        x_face = bb[0] if side_dir < 0 else bb[3]
        y0, y1 = bb[1] + 1.2, bb[4] - 1.2
        z_max = bb[5]
        fl = 0
        while 1.2 + fl * 3.2 < z_max - 1.5:
            zb = 1.1 + fl * 3.2
            zt = zb + 1.35
            sb.box(x_face + side_dir * 0.01, bb[1] - 0.05, zb - 0.95, x_face + side_dir * 0.14, bb[4] + 0.05, zb - 0.78, mat_ledge)
            span = (y1 - y0) / 3.0
            for wi in range(3):
                wy0 = y0 + wi * span + 0.35
                wy1 = wy0 + span - 0.70
                wym = (wy0 + wy1) * 0.5
                zm = (zb + zt) * 0.52
                sb.box(x_face, wy0 - 0.08, zb - 0.08, x_face + side_dir * 0.06, wy1 + 0.08, zt + 0.08, mat_frame)
                sb.box(x_face + side_dir * 0.02, wy0, zb, x_face + side_dir * 0.08, wy1, zt, mat_win)
                # Palang kusen jendela (mullion vertikal + horizontal) agar tidak tampak seperti kotak krem polos
                sb.box(x_face + side_dir * 0.04, wym - 0.035, zb, x_face + side_dir * 0.10, wym + 0.035, zt, mat_frame)
                sb.box(x_face + side_dir * 0.04, wy0, zm - 0.035, x_face + side_dir * 0.10, wy1, zm + 0.035, mat_frame)
            fl += 1
        _place_vmesh(col, f"KG2_RL_SideWin_{tag}", sb)

    log(f"v3.6 facades OK: minimarket={mini_ok}, atm={atm_ok}, interior_panels=2, side_winbands=4")


# =============================================================================
# v3.7 REAL-LIFE COURT, FUTSAL GOALS, BASKETBALL HOOPS, BRC FENCE, SATPAM & HALTE
# =============================================================================
def _make_tex_mat(tex_dir: Path, name: str, fname: str, rough: float = 0.88, spec: float = 0.12):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bs.inputs:
        bs.inputs["Specular IOR Level"].default_value = spec
    td = nt.nodes.new("ShaderNodeTexImage")
    td.image = _load_image(tex_dir, fname)
    nt.links.new(td.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(bs.outputs["BSDF"], out.inputs["Surface"])
    return mat


def _replace_obj_with_vmesh(col, name: str, vm: VMesh):
    """Ganti geometri mesh objek eksisting di tempat (world-space) sambil mempertahankan nama & origin (`location`) persis
    agar `fix_existing()` di `build_kampung_v2.py` tetap 100% idempoten."""
    old = bpy.data.objects.get(name)
    keep_loc = old.location.copy() if (old is not None and old.type == "MESH") else Vector((0.0, 0.0, 0.0))
    if keep_loc.length > 1e-6:
        for v in vm.bm.verts:
            v.co -= keep_loc
    me = vm.finish_mesh(f"{name}_MeshV37", auto_ground_z0=False)
    if old is not None and old.type == "MESH":
        old_me = old.data
        old.data = me
        old.location = keep_loc
        old.rotation_euler = (0.0, 0.0, 0.0)
        old.scale = (1.0, 1.0, 1.0)
        if old_me is not None and old_me.users == 0:
            bpy.data.meshes.remove(old_me)
        return old
    if old is not None:
        _remove_obj(old)
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    return obj


def _rebuild_uv_sphere(col, name: str, center, radius: float, mat):
    """Bangun ulang bola UV-mapped mulus di posisi dunia eksak."""
    old = bpy.data.objects.get(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=radius)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        f.smooth = True
        f.material_index = 0
        for loop in f.loops:
            p = loop.vert.co
            u = 0.5 + math.atan2(p.y, p.x) / (2.0 * math.pi)
            v = 0.5 + math.asin(max(-1.0, min(1.0, p.z / max(1e-5, radius)))) / math.pi
            loop[uv].uv = (u, v)
    me = bpy.data.meshes.new(f"{name}_V37")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    me.update()
    if old is not None and old.type == "MESH":
        old_me = old.data
        old.data = me
        old.location = center
        old.rotation_euler = (0.0, 0.0, 0.0)
        old.scale = (1.0, 1.0, 1.0)
        if old_me is not None and old_me.users == 0:
            bpy.data.meshes.remove(old_me)
        return old
    if old is not None:
        _remove_obj(old)
    obj = bpy.data.objects.new(name, me)
    obj.location = center
    col.objects.link(obj)
    return obj


def upgrade_court_v37(col, tex_dir: Path, log):
    """v3.7 Overhaul Lapangan Serbaguna RT 04:
    - Permukaan lapangan bertekstur garis futsal + area key basket lengkap (0 objek neon).
    - 2x Gawang Futsal lengkap berjaring 3D & rangka pipa bulat (instanced, tinggi 1.55 m, sejajar endline).
    - 2x Ring Basket Gooseneck kantilever + papan pantul UV kotak target merah + cincin torus berlubang + jaring (instanced, Z=3.05 m).
    - Pagar Kawat BRC modular ter-instance di 3 sisi (Utara, Timur, Barat + bukaan gerbang barat-daya 1.48 m) + Spanduk UV RT 04.
    - Upgrade bola basket (Ø 0.24 m) & bola futsal (Ø 0.20 m) bertekstur panel matte.
    - Hapus semak/bunga kubus legacy & upgrade 4 bangku taman menghadap lapangan.
    """
    # 1. Bersihkan aset lapangan/taman legacy rusak & hasil build sebelumnya
    for o in list(col.all_objects):
        if (
            o.name.startswith((
                "KG_P5_Court_Goal",
                "KG_P5_Court_Key_",
                "KG_P5_Court_EndL_",
                "KG_P5_Court_SideL_",
                "KG_P5_Hoop_",
                "KG_P5_ParkShrub_",
                "KG_P5_ParkFlower_",
                "KG_P5_ParkBench_",
                "KG2_RL_Court_",
            ))
            or o.name == "KG_P5_Court_MidLine"
        ):
            _remove_obj(o)

    mat_signs = _make_tex_mat(tex_dir, "M_RL_V37Signs", "reallife_v37_signs.jpg", rough=0.84, spec=0.12)
    mat_court_in = _make_tex_mat(tex_dir, "M_RL_CourtInner", "court_lines_diff.jpg", rough=0.88, spec=0.10)
    mat_court_out = _make_tex_mat(tex_dir, "M_RL_CourtOuter", "court_terracotta_diff.jpg", rough=0.90, spec=0.10)
    mat_ball_b = _make_tex_mat(tex_dir, "M_RL_BallBasket", "ball_basket_diff.jpg", rough=0.88, spec=0.12)
    mat_ball_f = _make_tex_mat(tex_dir, "M_RL_BallFutsal", "ball_futsal_diff.jpg", rough=0.86, spec=0.14)

    mat_goal_pipe = _make_mat("M_RL_GoalPipe", (0.90, 0.90, 0.87), rough=0.86, metal=0.0, spec=0.14)
    mat_net = _make_mat("M_RL_NetWhite", (0.86, 0.85, 0.82), rough=0.92, metal=0.0, spec=0.08)
    mat_galv = _make_mat("M_RL_GalvSteel", (0.50, 0.53, 0.56), rough=0.48, metal=0.65, spec=0.34)
    mat_dark = _make_mat("M_RL_PoleDark", (0.14, 0.16, 0.19), rough=0.62, metal=0.45, spec=0.24)
    mat_pad = _make_mat("M_RL_PolePadNavy", (0.10, 0.20, 0.38), rough=0.88, metal=0.0, spec=0.10)
    mat_rim = _make_mat("M_RL_RimOrange", (0.82, 0.20, 0.06), rough=0.46, metal=0.45, spec=0.32)
    mat_conc = _make_mat("M_RL_ConcreteBase", (0.56, 0.55, 0.52), rough=0.92, metal=0.0, spec=0.08)
    mat_bb_back = _make_mat("M_RL_BackboardBack", (0.76, 0.75, 0.72), rough=0.86, metal=0.0, spec=0.12)
    mat_teak = bpy.data.materials.get("KG_TeakWood") or _make_mat("M_RL_BenchTeak", (0.44, 0.26, 0.12), rough=0.88, spec=0.10)

    # 2. Permukaan Lapangan (`KG_P5_Court_Inner` & `KG_P5_Court_Outer`): pertahankan posisi & elevasi eksak, rapikan UV
    ci = bpy.data.objects.get("KG_P5_Court_Inner")
    if ci and ci.type == "MESH":
        bb = _world_bb(ci)
        vm_ci = VMesh()
        vm_ci.box(bb[0], bb[1], bb[2], bb[3], bb[4], bb[5], mat_court_in)
        for f in vm_ci.bm.faces:
            if f.normal.z > 0.5:
                for loop in f.loops:
                    p = loop.vert.co
                    u = (p.x - bb[0]) / max(1e-4, bb[3] - bb[0])
                    v = (p.y - bb[1]) / max(1e-4, bb[4] - bb[1])
                    loop[vm_ci.uv].uv = (u, v)
                vm_ci.uv_faces.add(f)
        _replace_obj_with_vmesh(col, "KG_P5_Court_Inner", vm_ci)

    co = bpy.data.objects.get("KG_P5_Court_Outer")
    if co and co.type == "MESH":
        bb = _world_bb(co)
        vm_co = VMesh()
        vm_co.box(bb[0], bb[1], bb[2], bb[3], bb[4], bb[5], mat_court_out)
        for f in vm_co.bm.faces:
            for loop in f.loops:
                p = loop.vert.co
                loop[vm_co.uv].uv = ((p.x - bb[0]) * 0.35, (p.y - bb[1]) * 0.35)
            vm_co.uv_faces.add(f)
        _replace_obj_with_vmesh(col, "KG_P5_Court_Outer", vm_co)

    # 3. Prototype Gawang Futsal Real-Life (hadap -X, lebar 2.20 m, tinggi 1.55 m, kedalaman 0.74 m)
    #    Rangka pipa bulat + top depth bar + rear angled posts + ground rail + jaring 3D penuh (4 sisi)
    gf = VMesh()
    gw = 1.10   # half-width -> 2.20 m total
    gh = 1.55   # height
    gd_top = 0.54
    gd_bot = 0.74
    # Tiang depan & palang atas depan (pipa bulat seg=10)
    gf.cyl_z(0.0, -gw, 0.0, gh, 0.034, mat_goal_pipe, seg=10)
    gf.cyl_z(0.0, gw, 0.0, gh, 0.034, mat_goal_pipe, seg=10)
    gf.beam((0.0, -gw - 0.03, gh), (0.0, gw + 0.03, gh), 0.068, mat_goal_pipe, seg=10)
    # Palang atas belakang, tiang belakang miring, & palang lantai keliling
    for sy in (-gw, gw):
        gf.beam((0.0, sy, gh), (gd_top, sy, gh - 0.05), 0.044, mat_goal_pipe, seg=8)
        gf.beam((gd_top, sy, gh - 0.05), (gd_bot, sy, 0.025), 0.042, mat_goal_pipe, seg=8)
        gf.beam((0.0, sy, 0.025), (gd_bot, sy, 0.025), 0.044, mat_goal_pipe, seg=8)
    gf.beam((gd_top, -gw, gh - 0.05), (gd_top, gw, gh - 0.05), 0.040, mat_goal_pipe, seg=8)
    gf.beam((gd_bot, -gw, 0.025), (gd_bot, gw, 0.025), 0.044, mat_goal_pipe, seg=8)
    # Jaring belakang (mengikuti kemiringan rangka belakang)
    for yi in range(11):
        yy = -gw + 0.08 + yi * ((2.0 * gw - 0.16) / 10.0)
        gf.beam((gd_top, yy, gh - 0.05), (gd_bot, yy, 0.03), 0.011, mat_net, seg=4)
    for zi in range(1, 8):
        t = zi / 8.0
        xx = gd_bot * (1.0 - t) + gd_top * t
        zz = 0.03 * (1.0 - t) + (gh - 0.05) * t
        gf.beam((xx, -gw + 0.02, zz), (xx, gw - 0.02, zz), 0.011, mat_net, seg=4)
    # Jaring samping kiri & kanan
    for sy in (-gw + 0.015, gw - 0.015):
        for fi in (0.28, 0.58, 0.84):
            x_top = gd_top * fi
            x_bot = gd_bot * fi
            z_top = gh - 0.05 * fi
            gf.beam((x_top, sy, z_top), (x_bot, sy, 0.03), 0.010, mat_net, seg=4)
        for zi in range(1, 8):
            t = zi / 8.0
            x_rear = gd_bot * (1.0 - t) + gd_top * t
            zz = 0.03 * (1.0 - t) + (gh - 0.05) * t
            gf.beam((0.02, sy, zz), (x_rear, sy, zz), 0.010, mat_net, seg=4)
    # Jaring atap atas gawang
    for yi in range(9):
        yy = -gw + 0.12 + yi * ((2.0 * gw - 0.24) / 8.0)
        gf.beam((0.02, yy, gh), (gd_top, yy, gh - 0.05), 0.010, mat_net, seg=4)
    for xi in (0.25, 0.50, 0.75):
        xx = gd_top * xi
        zz = gh - 0.05 * xi
        gf.beam((xx, -gw + 0.02, zz), (xx, gw - 0.02, zz), 0.010, mat_net, seg=4)

    me_goal = gf.finish_mesh("KG2_Proto_RL_GoalFutsal", auto_ground_z0=True)
    _link_instance(col, "KG2_RL_Court_GoalFutsal_E", me_goal, (6.20, -15.60, 0.003), 0.0)
    _link_instance(col, "KG2_RL_Court_GoalFutsal_W", me_goal, (-6.20, -15.60, 0.003), math.pi)

    # 4. Prototype Tiang & Ring Basket Gooseneck Real-Life (hadap -X, tinggi ring Z = 3.05 m, 0% melayang)
    bh = VMesh()
    # Base beton oktagonal + pelat baut baja
    bh.cyl_z(0.0, 0.0, 0.0, 0.22, 0.24, mat_conc, seg=8, r1=0.20)
    bh.box(-0.14, -0.14, 0.22, 0.14, 0.14, 0.25, mat_dark)
    # Tiang baja galvanis utama + busa pelindung benturan (khas lapangan kampung/sekolah)
    bh.cyl_z(0.0, 0.0, 0.22, 3.60, 0.068, mat_galv, seg=12)
    bh.cyl_z(0.0, 0.0, 0.45, 1.92, 0.084, mat_pad, seg=12)
    # Lengan gooseneck kantilever + strut diagonal + twin V-brace menyambung rapat ke papan pantul
    bh.beam((0.0, 0.0, 2.74), (-0.54, 0.0, 3.38), 0.092, mat_galv, seg=10)
    bh.beam((-0.54, 0.0, 3.38), (-0.95, 0.0, 3.38), 0.088, mat_galv, seg=10)
    bh.beam((0.0, 0.0, 2.38), (-0.95, 0.0, 3.04), 0.056, mat_dark, seg=8)
    for sy in (-0.46, 0.46):
        bh.beam((-0.56, 0.0, 3.36), (-0.95, sy, 3.56), 0.028, mat_dark, seg=6)
        bh.beam((-0.56, 0.0, 2.86), (-0.95, sy, 3.00), 0.028, mat_dark, seg=6)
    bh.box(-0.985, -0.16, 2.98, -0.925, 0.16, 3.44, mat_dark)
    # Papan pantul (1.20 x 0.84 m) dengan bingkai baja & tekstur UV kotak target merah
    bh.box(-0.990, -0.60, 2.88, -0.955, 0.60, 3.72, mat_bb_back)
    bh.box(-1.005, -0.615, 2.865, -0.950, 0.615, 2.905, mat_dark)
    bh.box(-1.005, -0.615, 3.695, -0.950, 0.615, 3.735, mat_dark)
    bh.box(-1.005, -0.615, 2.865, -0.950, -0.575, 3.735, mat_dark)
    bh.box(-1.005, 0.575, 2.865, -0.950, 0.615, 3.735, mat_dark)
    bh.quad_uv_rect(
        (-0.994, 0.58, 2.90),
        (-0.994, -0.58, 2.90),
        (-0.994, -0.58, 3.70),
        (-0.994, 0.58, 3.70),
        mat_signs,
        (0.506, 0.008, 0.994, 0.492),
    )
    # Bracket ring + Cincin Torus berlubang sejati (Z = 3.05 m, Ø 0.45 m, pusat X = -1.24)
    bh.box(-1.035, -0.075, 2.97, -0.990, 0.075, 3.09, mat_rim)
    bh.beam((-1.02, -0.055, 2.99), (-1.12, -0.11, 3.05), 0.018, mat_rim, seg=6)
    bh.beam((-1.02, 0.055, 2.99), (-1.12, 0.11, 3.05), 0.018, mat_rim, seg=6)
    ring_cx, ring_cz, ring_r = -1.24, 3.05, 0.225
    bh.torus_z(ring_cx, 0.0, ring_cz, ring_r, 0.012, mat_rim, seg_major=16, seg_minor=6)
    # Jaring basket kerucut-jam pasir (10 tali silang realistis)
    n_str = 10
    z_top, z_mid, z_bot = ring_cz - 0.01, ring_cz - 0.26, ring_cz - 0.44
    r_top, r_mid, r_bot = ring_r - 0.01, 0.135, 0.150
    for i in range(n_str):
        a0 = 2.0 * math.pi * i / n_str
        a1 = 2.0 * math.pi * (i + 0.5) / n_str
        a2 = 2.0 * math.pi * (i - 0.5) / n_str
        p_t = (ring_cx + r_top * math.cos(a0), r_top * math.sin(a0), z_top)
        p_m1 = (ring_cx + r_mid * math.cos(a1), r_mid * math.sin(a1), z_mid)
        p_m2 = (ring_cx + r_mid * math.cos(a2), r_mid * math.sin(a2), z_mid)
        p_b = (ring_cx + r_bot * math.cos(a0), r_bot * math.sin(a0), z_bot)
        bh.beam(p_t, p_m1, 0.009, mat_net, seg=4)
        bh.beam(p_t, p_m2, 0.009, mat_net, seg=4)
        bh.beam(p_m1, p_b, 0.009, mat_net, seg=4)
        bh.beam(p_m2, p_b, 0.009, mat_net, seg=4)

    me_hoop = bh.finish_mesh("KG2_Proto_RL_BasketHoop", auto_ground_z0=True)
    _link_instance(col, "KG2_RL_Court_BasketPole_E", me_hoop, (7.12, -15.60, 0.0), 0.0)
    _link_instance(col, "KG2_RL_Court_BasketPole_W", me_hoop, (-7.12, -15.60, 0.0), math.pi)

    # 5. Bola Basket (Ø 0.24 m) & Bola Futsal (Ø 0.20 m) bertekstur panel matte, menapak eksak di z=0.003
    _rebuild_uv_sphere(col, "KG_P5_Court_BallBasket", (-1.35, -15.10, 0.123), 0.12, mat_ball_b)
    _rebuild_uv_sphere(col, "KG_P5_Court_BallFutsal", (1.45, -16.15, 0.103), 0.10, mat_ball_f)

    # 6. Pagar Kawat BRC Modular Ter-instance (Utara, Timur, & Barat dengan bukaan pintu 1.48 m di Barat-Daya)
    fb = VMesh()
    bw, bh_f = 1.20, 2.32
    for sx in (-bw, bw):
        fb.box(sx - 0.07, -0.07, 0.0, sx + 0.07, 0.07, 0.14, mat_conc)
        fb.cyl_z(sx, 0.0, 0.10, bh_f, 0.028, mat_galv, seg=8)
    for rz_h in (0.18, 1.24, 2.26):
        fb.beam((-bw, 0.0, rz_h), (bw, 0.0, rz_h), 0.028, mat_galv, seg=6)
    for vi in range(1, 10):
        vx = -bw + vi * (2.0 * bw / 10.0)
        fb.beam((vx, 0.0, 0.18), (vx, 0.0, 2.26), 0.011, mat_galv, seg=4)
    for hi in (0.48, 0.78, 1.04, 1.50, 1.76, 2.02):
        fb.beam((-bw, 0.0, hi), (bw, 0.0, hi), 0.010, mat_galv, seg=4)
    me_fence = fb.finish_mesh("KG2_Proto_RL_FenceBay", auto_ground_z0=True)

    # Sisi Utara (Y = -11.18, X = -7.38..+7.38 -> 6 bay x 2.46 m)
    for i in range(6):
        cx_f = -6.15 + i * 2.46
        obj_f = _link_instance(col, f"KG2_RL_Court_FenceN_{i}", me_fence, (cx_f, -11.18, 0.0), 0.0)
        obj_f.scale = (2.46 / 2.40, 1.0, 1.0)
    # Sisi Timur (X = +7.38, Y = -19.90..-11.18 -> 4 bay x 2.18 m)
    for i in range(4):
        cy_f = -12.27 - i * 2.18
        obj_f = _link_instance(col, f"KG2_RL_Court_FenceE_{i}", me_fence, (7.38, cy_f, 0.0), math.pi * 0.5)
        obj_f.scale = (2.18 / 2.40, 1.0, 1.0)
    # Sisi Barat (X = -7.38, Y = -18.42..-11.18 -> 3 bay x 2.413 m; bukaan pintu 1.48 m di Barat-Daya!)
    for i in range(3):
        cy_f = -12.39 - i * 2.413
        obj_f = _link_instance(col, f"KG2_RL_Court_FenceW_{i}", me_fence, (-7.38, cy_f, 0.0), math.pi * 0.5)
        obj_f.scale = (2.413 / 2.40, 1.0, 1.0)

    # Spanduk UV "LAPANGAN RT 04 RAWA SARI" di tengah pagar utara (menghadap jalan +Y)
    sp = VMesh()
    sp.box(-2.06, -11.15, 1.48, 2.06, -11.11, 2.24, mat_dark)
    sp.quad_uv_rect(
        (2.02, -11.106, 1.51),
        (-2.02, -11.106, 1.51),
        (-2.02, -11.106, 2.21),
        (2.02, -11.106, 2.21),
        mat_signs,
        (0.008, 0.510, 0.492, 0.990),
    )
    _place_vmesh(col, "KG2_RL_Court_SpandukN", sp)

    # 7. Bangku Taman Real-Life Berbilah Kayu + Rangka Besi (Menghadap Lapangan -Y, maxZ dudukan = 0.48 m)
    pb = VMesh()
    # 3 pasang kaki besi + sandaran miring + sandaran tangan
    for lx in (-0.68, 0.0, 0.68):
        pb.box(lx - 0.025, -0.22, 0.0, lx + 0.025, -0.17, 0.45, mat_dark)
        pb.box(lx - 0.025, 0.17, 0.0, lx + 0.025, 0.22, 0.45, mat_dark)
        pb.box(lx - 0.025, -0.22, 0.41, lx + 0.025, 0.22, 0.45, mat_dark)
        pb.beam((lx, 0.20, 0.44), (lx, 0.27, 0.92), 0.036, mat_dark, seg=6)
    for lx in (-0.76, 0.76):
        pb.box(lx - 0.022, -0.20, 0.44, lx + 0.022, -0.16, 0.64, mat_dark)
        pb.box(lx - 0.026, -0.22, 0.63, lx + 0.026, 0.24, 0.67, mat_dark)
    # 4 bilah dudukan kayu jati (top tepat z = 0.480)
    for si in range(4):
        sy0 = -0.21 + si * 0.105
        pb.box(-0.78, sy0, 0.445, 0.78, sy0 + 0.088, 0.480, mat_teak, bevel=0.005, segs=1)
    # 3 bilah sandaran kayu jati di sisi +Y (sehingga dudukan menghadap lapangan -Y!)
    for bi in range(3):
        bz0 = 0.56 + bi * 0.115
        by_c = 0.215 + bi * 0.018
        pb.box(-0.78, by_c - 0.016, bz0, 0.78, by_c + 0.016, bz0 + 0.095, mat_teak, bevel=0.005, segs=1)
    me_bench = pb.finish_mesh("KG2_Proto_RL_ParkBench", auto_ground_z0=True)
    for i, bx in enumerate((-8.20, -3.80, 3.80, 8.20)):
        _link_instance(col, f"KG_P5_ParkBench_{i}", me_bench, (bx, -10.68, 0.0), 0.0)

    log("v3.7 court overhaul OK: 2x futsal goal + net, 2x gooseneck hoop + torus + net, 13x BRC fence bay, spanduk RT 04, 4x slatted benches facing court")


def upgrade_satpam_halte_v37(col, tex_dir: Path, log):
    """v3.7 Upgrade Pos Satpam FIK, Palang Parkir Kampus, & Halte Bus Kampus secara in-place.
    Menjaga 100% test locks:
    - KG_P5_Satpam_Booth footprint [16.625..18.375, -1.625..0.125, 0.075..2.435]
    - KG_P5_Satpam_Roof minZ <= 2.435 (duduk rapat di atas booth)
    - KG_P5_Halte_Platform maxZ = 0.160
    - KG_P5_Halte_Bench maxZ = 0.500 (±0.005 m) — sandaran diletakkan di BackWall!
    """
    mat_signs = _make_tex_mat(tex_dir, "M_RL_V37Signs", "reallife_v37_signs.jpg", rough=0.84, spec=0.12)
    mat_navy = _make_mat("M_RL_HalteBlue", (0.09, 0.24, 0.52), rough=0.84, metal=0.0, spec=0.14)
    mat_cream = _make_mat("M_RL_SatpamWall", (0.86, 0.84, 0.78), rough=0.90, metal=0.0, spec=0.10)
    mat_plinth = _make_mat("M_RL_SatpamPlinth", (0.42, 0.43, 0.45), rough=0.90, metal=0.0, spec=0.10)
    mat_soffit = _make_mat("M_RL_CanopySoffit", (0.84, 0.85, 0.86), rough=0.88, metal=0.0, spec=0.10)
    mat_galv = bpy.data.materials.get("M_RL_GalvSteel") or _make_mat("M_RL_GalvSteel", (0.50, 0.53, 0.56), rough=0.48, metal=0.65, spec=0.34)
    mat_dark = bpy.data.materials.get("M_RL_PoleDark") or _make_mat("M_RL_PoleDark", (0.14, 0.16, 0.19), rough=0.62, metal=0.45, spec=0.24)
    mat_glass = bpy.data.materials.get("M_Veh_TintedGlass") or _make_mat("M_RL_TintedGlass", (0.10, 0.16, 0.22), rough=0.26, metal=0.08, spec=0.45)
    mat_teak = bpy.data.materials.get("KG_TeakWood") or _make_mat("M_RL_BenchTeak", (0.44, 0.26, 0.12), rough=0.88, spec=0.10)
    mat_stone = bpy.data.materials.get("KG_StoneWall") or mat_plinth
    mat_yellow = _make_mat("M_RL_TactileYellow", (0.86, 0.68, 0.10), rough=0.88, metal=0.0, spec=0.10)
    mat_orange = _make_mat("M_RL_PortalOrange", (0.86, 0.36, 0.08), rough=0.82, metal=0.0, spec=0.16)
    mat_red = _make_mat("M_RL_PortalRed", (0.78, 0.10, 0.09), rough=0.84, metal=0.0, spec=0.14)
    mat_white = _make_mat("M_RL_PortalWhite", (0.90, 0.90, 0.88), rough=0.86, metal=0.0, spec=0.14)
    mat_lamp = _make_mat("M_RL_PorchLamp", (0.96, 0.92, 0.78), rough=0.40, metal=0.0, emit=0.55, emit_rgb=(1.0, 0.90, 0.68))
    mat_led_g = _make_mat("M_RL_PortalLedG", (0.12, 0.88, 0.32), rough=0.30, metal=0.0, emit=1.2, emit_rgb=(0.15, 0.95, 0.35))

    # -------------------------------------------------------------------------
    # 1. POS SATPAM FIK (footprint eksak: X[16.625..18.375], Y[-1.625..0.125], Z[0.075..2.435])
    # -------------------------------------------------------------------------
    sb = VMesh()
    x0, x1, y0, y1, z0, z1 = 16.625, 18.375, -1.625, 0.125, 0.075, 2.435
    sb.box(x0, y0, z0, x1, y1, 0.42, mat_plinth)
    sb.box(x0 + 0.015, y0 + 0.015, 0.42, x1 - 0.015, y1 - 0.015, 0.98, mat_stone)
    sb.box(x0 + 0.02, y0 + 0.02, 0.98, x1 - 0.02, y1 - 0.02, z1, mat_cream)
    # 4 pilar sudut & lis atas biru
    for px in (x0, x1 - 0.10):
        for py in (y0, y1 - 0.10):
            sb.box(px, py, 0.42, px + 0.10, py + 0.10, z1, mat_plinth)
    sb.box(x0, y0, 2.30, x1, y1, z1, mat_navy)
    # Jendela samping kiri (X=16.625) & kanan (X=18.375) berkusen aluminium + kaca gelap
    for sx_f, side_s in ((x0, -1.0), (x1, 1.0)):
        ox0 = sx_f if side_s > 0 else sx_f - 0.04
        ox1 = sx_f + 0.04 if side_s > 0 else sx_f
        sb.box(ox0, -1.25, 1.02, ox1, -0.30, 1.92, mat_dark)
        sb.box(ox0 - side_s * 0.005, -1.20, 1.07, ox1 + side_s * 0.005, -0.35, 1.87, mat_glass)
        sb.box(ox0 - side_s * 0.002, -0.795, 1.07, ox1 + side_s * 0.008, -0.755, 1.87, mat_dark)
    # Pintu belakang (Y=0.125) + gagang stainless
    sb.box(17.08, y1 - 0.02, 0.10, 17.92, y1 + 0.025, 2.12, mat_dark)
    sb.box(17.13, y1 - 0.01, 0.12, 17.87, y1 + 0.032, 2.07, mat_teak)
    sb.box(17.76, y1 + 0.03, 1.02, 17.82, y1 + 0.06, 1.18, mat_galv)
    # Meja loket depan di bawah jendela utama
    sb.box(16.82, y0 - 0.08, 0.92, 18.18, y0 + 0.02, 0.98, mat_plinth)
    _replace_obj_with_vmesh(col, "KG_P5_Satpam_Booth", sb)

    # Jendela depan Pos Satpam berkusen aluminium + mullion geser + kaca gelap (BUKAN putih polos!)
    sw = VMesh()
    sw.box(16.875, -1.665, 0.98, 18.125, -1.610, 1.03, mat_dark)
    sw.box(16.875, -1.665, 1.88, 18.125, -1.610, 1.93, mat_dark)
    sw.box(16.875, -1.665, 0.98, 16.925, -1.610, 1.93, mat_dark)
    sw.box(18.075, -1.665, 0.98, 18.125, -1.610, 1.93, mat_dark)
    sw.box(17.475, -1.668, 1.03, 17.525, -1.615, 1.88, mat_dark)  # mullion tengah
    sw.box(16.925, -1.668, 1.62, 18.075, -1.615, 1.66, mat_dark)  # transom atas
    sw.box(16.925, -1.655, 1.03, 18.075, -1.620, 1.88, mat_glass)
    _replace_obj_with_vmesh(col, "KG_P5_Satpam_Win", sw)

    # Atap Kanopi Miring Pos Satpam + Lisplang Matte + Lampu Teras + Papan UV "POS SATPAM FIK"
    sr = VMesh()
    # Soffit rata duduk rapat di z = 2.425 (<= booth maxZ 2.435!)
    sr.box(16.40, -1.92, 2.425, 18.60, 0.30, 2.50, mat_soffit)
    # Profil atap miring ke belakang (depan lebih tinggi 2.78, belakang 2.56)
    sr.hull(
        [(16.38, -1.94, 2.50), (18.62, -1.94, 2.50), (18.62, 0.32, 2.50), (16.38, 0.32, 2.50)],
        [(16.38, -1.94, 2.78), (18.62, -1.94, 2.78), (18.62, 0.32, 2.56), (16.38, 0.32, 2.56)],
        mat_navy,
    )
    # Lampu tempel kecil di bawah overhang depan
    sr.box(17.34, -1.82, 2.38, 17.66, -1.70, 2.425, mat_lamp)
    # Papan UV "POS SATPAM FIK" di lisplang depan (-Y)
    sr.quad_uv_rect(
        (16.58, -1.946, 2.46),
        (18.42, -1.946, 2.46),
        (18.42, -1.946, 2.76),
        (16.58, -1.946, 2.76),
        mat_signs,
        (0.506, 0.510, 0.994, 0.990),
    )
    _replace_obj_with_vmesh(col, "KG_P5_Satpam_Roof", sr)

    # -------------------------------------------------------------------------
    # 2. PALANG PARKIR KAMPUS (X[22.29..22.61], Y[-1.16..-0.84], Z[0.075..1.175])
    # -------------------------------------------------------------------------
    pb_g = VMesh()
    pb_g.box(22.27, -1.18, 0.075, 22.63, -0.82, 0.14, mat_dark)
    pb_g.box(22.29, -1.16, 0.14, 22.61, -0.84, 1.09, mat_orange, bevel=0.025, segs=2, smooth=True)
    pb_g.box(22.28, -1.17, 1.09, 22.62, -0.83, 1.175, mat_dark, bevel=0.015, segs=1)
    # Panel pembaca kartu + LED indikator hijau di sisi depan (-Y)
    pb_g.box(22.36, -1.175, 0.56, 22.54, -1.155, 0.92, mat_dark)
    pb_g.box(22.42, -1.180, 0.84, 22.48, -1.172, 0.89, mat_led_g)
    # Poros engsel lengan di sisi timur (+X)
    pb_g.cyl_y(22.62, -1.00, 0.98, 0.14, 0.055, mat_galv, seg=12)
    _replace_obj_with_vmesh(col, "KG_P5_Portal_Base", pb_g)

    pa = VMesh()
    pa.box(22.60, -1.055, 0.96, 22.74, -0.945, 1.12, mat_dark)
    # Lengan palang belang merah-putih 8 segmen (terangkat tegak Z=1.12..3.57 agar Gang Timur terbuka)
    n_seg = 8
    z_start, z_end = 1.12, 3.57
    dz_s = (z_end - z_start) / n_seg
    for si in range(n_seg):
        za = z_start + si * dz_s
        zb = za + dz_s
        pa.box(22.63, -1.035, za, 22.71, -0.965, zb, mat_red if si % 2 == 0 else mat_white)
    pa.box(22.625, -1.04, z_end - 0.04, 22.715, -0.96, z_end, mat_dark)
    _replace_obj_with_vmesh(col, "KG_P5_Portal_Arm", pa)

    # -------------------------------------------------------------------------
    # 3. HALTE BUS KAMPUS FIK (LOCKED: Platform maxZ=0.160, Bench maxZ=0.500!)
    # -------------------------------------------------------------------------
    # Platform: jaga eksak X[18.10..21.50], Y[-3.625..-2.275], Z[0.0..0.160] + strip kuning taktil depan
    hp = VMesh()
    hp.box(18.10, -3.48, 0.0, 21.50, -2.275, 0.160, mat_stone)
    hp.box(18.10, -3.625, 0.0, 21.50, -3.48, 0.145, mat_plinth)
    hp.box(18.10, -3.625, 0.145, 21.50, -3.48, 0.160, mat_yellow)
    _replace_obj_with_vmesh(col, "KG_P5_Halte_Platform", hp)

    # Bangku Halte: WAJIB maxZ = 0.500 (bilah kayu jati + rangka & kaki besi menapak di platform z=0.160)
    hb = VMesh()
    for lx in (18.78, 19.80, 20.82):
        hb.box(lx - 0.025, -2.92, 0.160, lx + 0.025, -2.87, 0.460, mat_dark)
        hb.box(lx - 0.025, -2.61, 0.160, lx + 0.025, -2.56, 0.460, mat_dark)
        hb.box(lx - 0.025, -2.93, 0.425, lx + 0.025, -2.55, 0.462, mat_dark)
    hb.box(18.68, -2.77, 0.36, 20.92, -2.72, 0.40, mat_dark)
    for si in range(4):
        sy0 = -2.955 + si * 0.105
        hb.box(18.60, sy0, 0.462, 21.00, sy0 + 0.090, 0.500, mat_teak, bevel=0.005, segs=1)
    _replace_obj_with_vmesh(col, "KG_P5_Halte_Bench", hb)

    # 2 Tiang Utama Silinder Baja Galvanis + Konsol Kantilever Atap (gantikan KG_ZincRoof!)
    for pname, px in (("KG_P5_Halte_Post_18.4", 18.40), ("KG_P5_Halte_Post_21.2", 21.20)):
        pt = VMesh()
        pt.box(px - 0.09, -2.54, 0.160, px + 0.09, -2.36, 0.195, mat_dark)
        pt.cyl_z(px, -2.45, 0.195, 2.40, 0.048, mat_galv, seg=12)
        # Lengan kantilever miring menopang atap ke depan
        pt.beam((px, -2.45, 2.08), (px, -3.50, 2.38), 0.052, mat_galv, seg=8)
        pt.beam((px, -2.45, 2.38), (px, -3.55, 2.40), 0.058, mat_galv, seg=8)
        _replace_obj_with_vmesh(col, pname, pt)

    # Dinding Belakang Halte: rangka baja 4-kolom + kaca gelap + sandaran bangku kayu + Papan Rute UV!
    hw = VMesh()
    hw.box(18.25, -2.48, 0.160, 21.35, -2.38, 0.24, mat_dark)
    hw.box(18.25, -2.48, 2.30, 21.35, -2.38, 2.38, mat_dark)
    hw.box(18.25, -2.48, 1.05, 21.35, -2.38, 1.11, mat_dark)
    for mx in (18.25, 19.30, 20.30, 21.30):
        hw.box(mx, -2.48, 0.160, mx + 0.055, -2.38, 2.38, mat_dark)
    hw.box(18.30, -2.45, 0.24, 21.30, -2.41, 2.30, mat_glass)
    # Sandaran bangku 3 bilah kayu jati terpasang aman pada BackWall (tidak mengubah Bench maxZ=0.500!)
    for bi in range(3):
        bz0 = 0.56 + bi * 0.115
        hw.box(18.62, -2.535, bz0, 20.98, -2.495, bz0 + 0.092, mat_teak, bevel=0.005, segs=1)
    # Papan Informasi Rute UV "HALTE BUS KAMPUS FIK" di panel kiri (menghadap penumpang -Y)
    hw.box(18.42, -2.505, 1.18, 19.62, -2.465, 1.98, mat_dark)
    hw.quad_uv_rect(
        (18.45, -2.510, 1.21),
        (19.59, -2.510, 1.21),
        (19.59, -2.510, 1.95),
        (18.45, -2.510, 1.95),
        mat_signs,
        (0.008, 0.008, 0.492, 0.492),
    )
    _replace_obj_with_vmesh(col, "KG_P5_Halte_BackWall", hw)

    # Atap Kanopi Miring Ber-rusuk + Lisplang Matte Navy + Lampu Plafon (gantikan KG_SignBlue neon!)
    hr = VMesh()
    hr.box(18.02, -3.68, 2.36, 21.58, -2.16, 2.41, mat_soffit)
    hr.hull(
        [(18.00, -3.70, 2.41), (21.60, -3.70, 2.41), (21.60, -2.14, 2.41), (18.00, -2.14, 2.41)],
        [(18.00, -3.70, 2.60), (21.60, -3.70, 2.60), (21.60, -2.14, 2.48), (18.00, -2.14, 2.48)],
        mat_navy,
    )
    for rx_r in (18.40, 19.33, 20.27, 21.20):
        hr.box(rx_r - 0.03, -3.62, 2.32, rx_r + 0.03, -2.22, 2.36, mat_dark)
    hr.box(19.25, -3.02, 2.32, 20.35, -2.86, 2.36, mat_lamp)
    _replace_obj_with_vmesh(col, "KG_P5_Halte_Roof", hr)

    # Papan nama Halte: ganti material dari neon KG_SignBlue -> matte navy M_RL_HalteBlue
    sb_h = bpy.data.objects.get("KG_P5_Halte_SignBoard")
    if sb_h and sb_h.type == "MESH" and sb_h.data:
        if sb_h.data.users > 1:
            sb_h.data = sb_h.data.copy()
        sb_h.data.materials.clear()
        sb_h.data.materials.append(mat_navy)

    log("v3.7 Satpam, Portal, & Halte upgrade OK (locked AABBs preserved: Satpam booth/roof, Halte platform=0.16, bench=0.50)")


def apply_fase1_diet(col, log):
    deduplicate_materials(log)
    optimize_3d_text_meshes(col, log)
    instance_legacy_trees(col, log)


def apply_all(col, tex_dir: Path, log):
    apply_fase1_diet(col, log)
    upgrade_vehicles_fase2(col, tex_dir, log)
    build_kampung_details_fase3(col, tex_dir, log)
    upgrade_trees_and_bushes_v36(col, tex_dir, log)
    upgrade_facades_v36(col, tex_dir, log)
    upgrade_court_v37(col, tex_dir, log)
    upgrade_satpam_halte_v37(col, tex_dir, log)
