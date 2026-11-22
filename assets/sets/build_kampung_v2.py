"""Bangun Kampung Rawa Sari RT 04 v2 di dalam bang_utoh_sets.blend (koleksi `KampungSet`).

Jalankan (Blender 5.3, mode background):
  blender --background assets/sets/blend/bang_utoh_sets.blend --python assets/sets/build_kampung_v2.py

Skrip idempoten: semua objek buatan skrip memakai awalan `KG2_` dan dihapus lalu dibangun ulang
setiap kali dijalankan. Denah dan koordinat mengikuti `assets/sets/ZONING_KAMPUNG_V2.md`.
Koordinat Blender: X timur, Y utara, Z atas. Di Three.js: x = X, y = Z, z = -Y.
"""
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

random.seed(4)
COL = bpy.data.collections["KampungSet"]
TEX_DIR = Path(bpy.path.abspath("//")).parent / "textures"
SAVE = "--no-save" not in sys.argv
LOG = []


def log(*a):
    LOG.append(" ".join(str(x) for x in a))


# ----------------------------------------------------------------------------- bersih-bersih
def remove_obj(o):
    me = o.data if o.type == "MESH" else None
    bpy.data.objects.remove(o, do_unlink=True)
    if me is not None and me.users == 0:
        bpy.data.meshes.remove(me)


def clean_previous():
    for o in [o for o in bpy.data.objects if o.name.startswith(("KG2_", "KP2_"))]:
        remove_obj(o)
    for me in [m for m in bpy.data.meshes if m.name.startswith(("KG2_", "KP2_")) and m.users == 0]:
        bpy.data.meshes.remove(me)
    for cu in [c for c in bpy.data.curves if c.name.startswith("KG2_") and c.users == 0]:
        bpy.data.curves.remove(cu)


def world_bb(o):
    ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (min(w.x for w in ws), min(w.y for w in ws), min(w.z for w in ws),
            max(w.x for w in ws), max(w.y for w in ws), max(w.z for w in ws))


PROTECT = ("Asphalt", "Road", "Curb", "Zebra", "Street", "Cable", "TrafficLight", "Courtyard",
           "Ground", "Halte", "Satpam", "Portal", "Alley")


def demolish_region(x0, y0, x1, y1, reason):
    gone = []
    for o in list(COL.all_objects):
        if o.name.startswith("KG2_") or any(p in o.name for p in PROTECT):
            continue
        bx0, by0, _, bx1, by1, _ = world_bb(o)
        if bx0 >= x0 and bx1 <= x1 and by0 >= y0 and by1 <= y1:
            gone.append(o.name)
            remove_obj(o)
    log(f"demolish {reason}: {len(gone)} objek")


def remove_prefix(prefixes):
    n = 0
    for o in list(COL.all_objects):
        if o.name.startswith(prefixes):
            remove_obj(o)
            n += 1
    log(f"remove {prefixes}: {n}")


def fix_existing():
    # Lab kampus lama + atribut gedungnya
    remove_prefix(("KG_KP_", "KG_KampusFlag", "KG_KampusParapet", "KG_KampusRoofCrown"))
    # Rumah yang terkena tapak gedung FIK (HouseRow1_10 juga menimpa Gang Timur)
    remove_prefix(("KG_HouseRow1_08_", "KG_HouseRow1_09_", "KG_HouseRow1_10_"))
    demolish_region(6.6, -3.0, 23.2, 14.9, "tapak FIK")
    # SideBuilding W2/E2 memotong badan jalan utama: geser ke selatan
    for o in COL.all_objects:
        if o.name.startswith(("KG_SideBuildingW2", "KG_SideBuildingE2")):
            if world_bb(o)[4] > -9.6:  # belum digeser
                o.location.y -= 7.4
    # Gedung latar yang namanya bentrok dengan gedung kampus baru
    for o in COL.all_objects:
        if o.name.startswith("KG_GedungFakultasTI"):
            o.name = o.name.replace("KG_GedungFakultasTI", "KG_GedungPascasarjana")
    # Pohon lama yang tumbuh di tengah badan gang
    for o in list(COL.all_objects):
        if o.name.startswith(("KG_TreeCrownMain", "KG_TreeTrunk")):
            bx0, by0, _, bx1, by1, _ = world_bb(o)
            cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
            if (-19.9 < cx < -16.4 or 23.3 < cx < 27.7) and -4.0 < cy < 15.5:
                log("pohon di gang dihapus:", o.name)
                remove_obj(o)
    # Tanah lama diganti tanah baru yang lebih luas (dengan celah kali)
    remove_prefix(("KG_GroundGrass",))


# ----------------------------------------------------------------------------- material
def load_img(fname, non_color=False):
    img = bpy.data.images.get(fname)
    if img is None:
        img = bpy.data.images.load(str(TEX_DIR / fname), check_existing=True)
        img.name = fname
        img.filepath = "//../textures/" + fname
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


TILE = {}


def tex_mat(name, diff, norm=None, rough=0.86, tile=2.0, strength=0.8):
    TILE[name] = tile
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes.get("Principled BSDF")
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = load_img(diff)
    nt.links.new(t.outputs["Color"], bs.inputs["Base Color"])
    if norm:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = load_img(norm, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = strength
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bs.inputs["Normal"])
    bs.inputs["Roughness"].default_value = rough
    return m


def col_mat(name, rgb, emit=0.0, rough=0.7, metal=0.0, emit_rgb=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*rgb, 1.0)
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Metallic"].default_value = metal
    if emit > 0:
        bs.inputs["Emission Color"].default_value = (*(emit_rgb or rgb), 1.0)
        bs.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*rgb, 1.0)
    return m


def existing(name, fallback_rgb=(0.5, 0.5, 0.5)):
    return bpy.data.materials.get(name) or col_mat(name, fallback_rgb)


def setup_materials():
    M = {}
    # Tekstur rumput lama ter-pack di .blend; pakai versi file terbaru (bercak tanah tidak lagi kemerahan).
    g = bpy.data.images.get("tropical_grass_diff.jpg")
    if g is not None and g.packed_file:
        g.unpack(method="USE_ORIGINAL")
    if g is not None:
        g.reload()
    M["grass"] = existing("KG_Grass"); TILE["KG_Grass"] = 6.0
    M["asphalt"] = tex_mat("KG2_AsphaltPatched", "patched_asphalt_diff.jpg", "asphalt_road_norm.jpg", 0.92, 6.0)
    M["cobble"] = existing("KG_Cobble"); TILE["KG_Cobble"] = 2.0
    M["plaster"] = tex_mat("KG2_CrackedPlaster", "cracked_plaster_diff.jpg", "cracked_plaster_norm.jpg", 0.9, 2.5)
    M["terrace"] = tex_mat("KG2_TerraceTile", "terrace_tile_diff.jpg", "terrace_tile_norm.jpg", 0.5, 1.2)
    M["roof_moss"] = tex_mat("KG2_MossyRoof", "mossy_roof_diff.jpg", "terracotta_roof_norm.jpg", 0.8, 2.5)
    M["zinc_rust"] = tex_mat("KG2_RustyZinc", "rusty_zinc_diff.jpg", "corrugated_zinc_norm.jpg", 0.7, 2.0)
    for c in ("white", "cream", "mint", "sky", "peach", "sage"):
        M["paint_" + c] = tex_mat(f"KG2_Paint_{c.title()}", f"weathered_paint_{c}_diff.jpg", "weathered_paint_norm.jpg", 0.88, 3.0, 0.6)
    M["stone"] = existing("KG_StoneWall"); TILE["KG_StoneWall"] = 2.5
    M["floor_tile"] = existing("KP_Floor") if bpy.data.materials.get("KP_Floor") else tex_mat(
        "KG2_FloorTile", "kampus_tile_floor_diff.jpg", "kampus_tile_floor_norm.jpg", 0.4, 1.6)
    M["floor_tile"] = tex_mat("KG2_FloorTile", "kampus_tile_floor_diff.jpg", "kampus_tile_floor_norm.jpg", 0.4, 1.6)
    M["ceramic"] = tex_mat("KG2_Ceramic", "ceramic_floor_tile_diff.jpg", "ceramic_floor_tile_norm.jpg", 0.45, 1.6)
    M["wood_dark"] = existing("KG_DarkWood"); TILE["KG_DarkWood"] = 1.5
    M["teak"] = existing("KG_TeakWood"); TILE["KG_TeakWood"] = 1.5
    M["desk_wood"] = tex_mat("KG2_DeskWood", "teak_wood_light_diff.jpg", "teak_wood_light_norm.jpg", 0.6, 1.2)
    M["roof_tile"] = existing("KG_RoofTile"); TILE["KG_RoofTile"] = 2.5
    M["brick"] = existing("KG_BrickWall"); TILE["KG_BrickWall"] = 2.5
    M["foliage"] = existing("KG_Foliage")
    M["chair_blue"] = tex_mat("KG2_ChairFabric", "fabric_blue_diff.jpg", "fabric_blue_norm.jpg", 0.9, 0.8)
    M["steel"] = existing("KG_Steel")
    M["iron"] = col_mat("KG2_IronDark", (0.08, 0.085, 0.1), rough=0.5, metal=0.6)
    M["chrome"] = col_mat("KG2_Chrome", (0.75, 0.77, 0.8), rough=0.25, metal=0.9)
    M["glass"] = col_mat("KG2_WinGlass", (0.16, 0.25, 0.33), rough=0.08)
    M["win_warm"] = existing("KG_WinWarm")
    M["win_cool"] = existing("KG_WinGlow")
    M["white"] = col_mat("KG2_WhitePaint", (0.9, 0.9, 0.87), rough=0.8)
    M["concrete"] = col_mat("KG2_Concrete", (0.58, 0.57, 0.54), rough=0.95)
    M["fik_blue"] = col_mat("KG2_FIKBlue", (0.07, 0.17, 0.42), rough=0.6)
    M["fik_accent"] = col_mat("KG2_FIKCyan", (0.1, 0.62, 0.86), rough=0.5)
    M["sd_red"] = col_mat("KG2_SDRed", (0.72, 0.13, 0.12), rough=0.7)
    M["sma_grey"] = col_mat("KG2_SMAGrey", (0.36, 0.4, 0.46), rough=0.7)
    M["whiteboard"] = col_mat("KG2_Whiteboard", (0.93, 0.95, 0.97), rough=0.2)
    M["blackboard"] = col_mat("KG2_Blackboard", (0.08, 0.24, 0.16), rough=0.9)
    M["screen"] = col_mat("KG2_Screen", (0.02, 0.05, 0.1), emit=0.9, emit_rgb=(0.25, 0.6, 1.0), rough=0.2)
    M["led_white"] = col_mat("KG2_CeilLed", (0.95, 0.95, 1.0), emit=2.0)
    M["led_green"] = col_mat("KG2_LedGreen", (0.1, 0.9, 0.3), emit=3.0)
    M["bulb"] = col_mat("KG2_LampBulbWarm", (1.0, 0.9, 0.7), rough=0.3)
    M["water"] = col_mat("KG2_KaliWater", (0.12, 0.3, 0.28), rough=0.15)
    M["mud"] = col_mat("KG2_KaliMud", (0.24, 0.2, 0.14), rough=1.0)
    M["black"] = existing("KG_TireBlack", (0.03, 0.03, 0.03))
    M["yellow"] = col_mat("KG2_SafetyYellow", (0.95, 0.75, 0.08), rough=0.6)
    M["red"] = col_mat("KG2_FlagRed", (0.8, 0.06, 0.07), rough=0.6)
    M["gold"] = existing("KG_Gold", (0.85, 0.65, 0.2))
    M["paper"] = col_mat("KG2_Paper", (0.95, 0.93, 0.86), rough=0.9)
    M["green_sign"] = col_mat("KG2_SignGreen", (0.05, 0.42, 0.22), rough=0.6)
    M["blue_sign"] = col_mat("KG2_SignBlue", (0.08, 0.26, 0.6), rough=0.6)
    M["orange"] = col_mat("KG2_Orange", (0.95, 0.45, 0.1), rough=0.6)
    M["lpg"] = col_mat("KG2_LpgGreen", (0.2, 0.55, 0.22), rough=0.4, metal=0.2)
    M["cable"] = existing("KG_CableBlack", (0.02, 0.02, 0.02))
    M["pole"] = existing("KG_Mat_PoleDark", (0.4, 0.4, 0.4))
    M["pot"] = col_mat("KG2_PotClay", (0.55, 0.28, 0.16), rough=0.9)
    M["leaf"] = col_mat("KG2_LeafGreen", (0.16, 0.42, 0.12), rough=0.8)
    M["banana"] = col_mat("KG2_BananaLeaf", (0.3, 0.56, 0.16), rough=0.7)
    M["trunk"] = col_mat("KG2_BananaTrunk", (0.42, 0.45, 0.24), rough=0.9)
    M["mattress"] = col_mat("KG2_Mattress", (0.85, 0.88, 0.9), rough=0.9)
    for i, rgb in enumerate([(0.75, 0.2, 0.15), (0.15, 0.4, 0.75), (0.9, 0.7, 0.15), (0.2, 0.6, 0.3), (0.55, 0.25, 0.6)]):
        M[f"book{i}"] = col_mat(f"KG2_Book{i}", rgb, rough=0.8)
    return M


# ----------------------------------------------------------------------------- mesh builder
class MB:
    """Kumpulan kotak/prisma dalam satu mesh (hemat node GLB), UV box-projection skala dunia."""

    def __init__(self, origin=(0, 0, 0)):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.mats = []
        self.o = Vector(origin)

    def mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _uv_face(self, f, mat):
        tile = TILE.get(mat.name, 2.0)
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for loop in f.loops:
            p = loop.vert.co + self.o
            if ax == 0:
                u, v = p.y, p.z
            elif ax == 1:
                u, v = p.x, p.z
            else:
                u, v = p.x, p.y
            loop[self.uv].uv = (u / tile, v / tile)

    def poly(self, pts, mat):
        vs = [self.bm.verts.new(Vector(p) - self.o) for p in pts]
        f = self.bm.faces.new(vs)
        f.material_index = self.mi(mat)
        f.normal_update()
        self._uv_face(f, mat)
        return f

    def hull(self, bottom, top, mat):
        """Prisma dari 2 cincin titik (urutan berlawanan jarum jam dilihat dari atas)."""
        b = [self.bm.verts.new(Vector(p) - self.o) for p in bottom]
        t = [self.bm.verts.new(Vector(p) - self.o) for p in top]
        n = len(b)
        faces = [self.bm.faces.new(list(reversed(b))), self.bm.faces.new(t)]
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new([b[i], b[j], t[j], t[i]]))
        idx = self.mi(mat)
        for f in faces:
            f.material_index = idx
            f.normal_update()
            self._uv_face(f, mat)

    def box(self, x0, y0, z0, x1, y1, z1, mat):
        if x1 < x0: x0, x1 = x1, x0
        if y1 < y0: y0, y1 = y1, y0
        if z1 < z0: z0, z1 = z1, z0
        if min(x1 - x0, y1 - y0, z1 - z0) <= 1e-5:
            return
        ring = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        self.hull([(x, y, z0) for x, y in ring], [(x, y, z1) for x, y in ring], mat)

    def cbox(self, cx, cy, cz, sx, sy, sz, mat):
        self.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, mat)

    def cyl(self, cx, cy, z0, z1, r, mat, seg=10, r1=None):
        r1 = r if r1 is None else r1
        bot = [(cx + r * math.cos(2 * math.pi * i / seg), cy + r * math.sin(2 * math.pi * i / seg), z0) for i in range(seg)]
        top = [(cx + r1 * math.cos(2 * math.pi * i / seg), cy + r1 * math.sin(2 * math.pi * i / seg), z1) for i in range(seg)]
        self.hull(bot, top, mat)

    def hcyl(self, cx, cy, cz, length, r, mat, axis="x", seg=10):
        """Silinder mendatar (roda, talang, pipa)."""
        pts0, pts1 = [], []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            u, v = r * math.cos(a), r * math.sin(a)
            if axis == "x":
                pts0.append((cx - length / 2, cy + u, cz + v)); pts1.append((cx + length / 2, cy + u, cz + v))
            else:
                pts0.append((cx + u, cy - length / 2, cz + v)); pts1.append((cx + u, cy + length / 2, cz + v))
        # orientasi hull: perlakukan pts0 sebagai "bawah"
        self.hull(pts0, pts1, mat)

    def beam(self, p0, p1, w, mat):
        """Balok tipis dari p0 ke p1 (kabel, rangka, tangga miring)."""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        if d.length < 1e-6:
            return
        z = d.normalized()
        up = Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((1, 0, 0))
        x = z.cross(up).normalized() * (w / 2)
        y = z.cross(x).normalized() * (w / 2)
        ring = [x + y, -x + y, -x - y, x - y]
        self.hull([p0 + r for r in ring], [p1 + r for r in ring], mat)

    def finish(self, name, bevel=0.0, loc=None):
        if not self.bm.faces:
            self.bm.free()
            return None
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        if bevel > 0:
            # Bevel langsung di mesh (bukan modifier) supaya linked duplicate tetap berbagi satu mesh di GLB.
            edges = [e for e in self.bm.edges if e.is_manifold and e.calc_face_angle(0.0) > math.radians(40)]
            if edges:
                bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, profile=0.5,
                                affect="EDGES", clamp_overlap=True)
            self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        ob.location = loc if loc is not None else self.o
        COL.objects.link(ob)
        return ob


def instance(proto, name, loc, rot_z=0.0, scale=None):
    ob = bpy.data.objects.new(name, proto.data)
    ob.location = loc
    ob.rotation_euler = (0, 0, rot_z)
    if scale is None and proto.name.endswith("_Motor"):
        scale = 1.35
    if scale:
        ob.scale = (scale, scale, scale)
    COL.objects.link(ob)
    return ob


PROTOS = {}


def proto(key, build):
    """Mesh furnitur dibuat sekali di asal (0,0,0), lalu dipakai ulang sebagai linked duplicate."""
    if key not in PROTOS:
        mb = MB()
        bev = build(mb)
        ob = mb.finish("KG2_Proto_" + key, bevel=bev or 0.0)
        ob.hide_render = True
        ob.hide_viewport = True
        ob.location = (0, 0, -50)
        PROTOS[key] = ob
    return PROTOS[key]


def text_mesh(name, body, loc, size, mat, rot=(math.pi / 2, 0, 0), extrude=0.02, align="CENTER"):
    cu = bpy.data.curves.new(name + "_Font", "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = "CENTER"
    fo = bpy.data.objects.new(name + "_Font", cu)
    COL.objects.link(fo)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(fo.evaluated_get(dg))
    bpy.data.objects.remove(fo, do_unlink=True)
    bpy.data.curves.remove(cu)
    me.name = name
    me.materials.clear()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = rot
    COL.objects.link(ob)
    return ob


ROT_FACE = {"S": (math.pi / 2, 0, 0), "N": (math.pi / 2, 0, math.pi), "E": (math.pi / 2, 0, math.pi / 2), "W": (math.pi / 2, 0, -math.pi / 2)}


# ----------------------------------------------------------------------------- dinding dengan bukaan
def wall_x(mb, y0, y1, x0, x1, z0, z1, mat, openings=()):
    """Dinding sejajar sumbu X (tebal y0..y1). openings: (xa, xb, zb, zt)."""
    cur = x0
    for xa, xb, zb, zt in sorted(openings):
        mb.box(cur, y0, z0, xa, y1, z1, mat)
        mb.box(xa, y0, z0, xb, y1, zb, mat)
        mb.box(xa, y0, zt, xb, y1, z1, mat)
        cur = xb
    mb.box(cur, y0, z0, x1, y1, z1, mat)


def wall_y(mb, x0, x1, y0, y1, z0, z1, mat, openings=()):
    cur = y0
    for ya, yb, zb, zt in sorted(openings):
        mb.box(x0, cur, z0, x1, ya, z1, mat)
        mb.box(x0, ya, z0, x1, yb, zb, mat)
        mb.box(x0, ya, zt, x1, yb, z1, mat)
        cur = yb
    mb.box(x0, cur, z0, x1, y1, z1, mat)


def window_x(frame, glass, y, xa, xb, zb, zt, M, bars=False, t=0.06):
    """Kusen + kaca + (opsional) teralis untuk bukaan di dinding sejajar X pada bidang y."""
    k = 0.07
    frame.box(xa, y - t, zb, xb, y + t, zb + k, M["wood_dark"])
    frame.box(xa, y - t, zt - k, xb, y + t, zt, M["wood_dark"])
    frame.box(xa, y - t, zb, xa + k, y + t, zt, M["wood_dark"])
    frame.box(xb - k, y - t, zb, xb, y + t, zt, M["wood_dark"])
    mid = (xa + xb) / 2
    frame.box(mid - k / 2, y - t, zb, mid + k / 2, y + t, zt, M["wood_dark"])
    frame.box(xa - 0.05, y - t - 0.12, zb - 0.06, xb + 0.05, y + t + 0.02, zb, M["concrete"])  # ambang
    glass.box(xa + k, y - 0.01, zb + k, xb - k, y + 0.01, zt - k, M["glass"])
    if bars:
        n = max(3, int((xb - xa) / 0.14))
        for i in range(1, n):
            x = xa + (xb - xa) * i / n
            frame.box(x - 0.012, y - t - 0.05, zb + k, x + 0.012, y - t - 0.03, zt - k, M["iron"])
        frame.box(xa, y - t - 0.05, (zb + zt) / 2 - 0.012, xb, y - t - 0.03, (zb + zt) / 2 + 0.012, M["iron"])


def window_y(frame, glass, x, ya, yb, zb, zt, M, t=0.06):
    k = 0.07
    frame.box(x - t, ya, zb, x + t, yb, zb + k, M["wood_dark"])
    frame.box(x - t, ya, zt - k, x + t, yb, zt, M["wood_dark"])
    frame.box(x - t, ya, zb, x + t, ya + k, zt, M["wood_dark"])
    frame.box(x - t, yb - k, zb, x + t, yb, zt, M["wood_dark"])
    glass.box(x - 0.01, ya + k, zb + k, x + 0.01, yb - k, zt - k, M["glass"])


def door_x(mb, y, xa, xb, z0, M, open_into=1, leaf_mat=None):
    """Kusen pintu + daun pintu terbuka 75 derajat (agar kamera bisa masuk), gagang krom."""
    k = 0.08
    h = 2.1
    mb.box(xa - k, y - 0.08, z0, xa, y + 0.08, z0 + h + k, M["wood_dark"])
    mb.box(xb, y - 0.08, z0, xb + k, y + 0.08, z0 + h + k, M["wood_dark"])
    mb.box(xa - k, y - 0.08, z0 + h, xb + k, y + 0.08, z0 + h + k, M["wood_dark"])
    w = xb - xa
    a = math.radians(75)
    hx, hy = xa + math.cos(a) * w, y + open_into * math.sin(a) * w
    mb.beam((xa, y, z0 + 0.01), (xa, y, z0 + h - 0.01), 0.001, leaf_mat or M["teak"])  # engsel kecil
    p = [(xa, y, z0 + 0.02), (hx, hy, z0 + 0.02)]
    mb.hull([(xa, y - 0.02, z0 + 0.02), (hx, hy - 0.02, z0 + 0.02), (hx, hy + 0.02, z0 + 0.02), (xa, y + 0.02, z0 + 0.02)],
            [(xa, y - 0.02, z0 + h - 0.02), (hx, hy - 0.02, z0 + h - 0.02), (hx, hy + 0.02, z0 + h - 0.02), (xa, y + 0.02, z0 + h - 0.02)],
            leaf_mat or M["teak"])
    gx, gy = xa + math.cos(a) * (w - 0.08), y + open_into * math.sin(a) * (w - 0.08)
    mb.cbox(gx, gy, z0 + 1.0, 0.04, 0.12, 0.03, M["chrome"])


# ----------------------------------------------------------------------------- furnitur
def build_lecture_chair(mb):
    s, i = mb, None
    s.box(-0.22, -0.22, 0.43, 0.22, 0.2, 0.47, MATS["chair_blue"])
    s.box(-0.22, 0.2, 0.47, 0.22, 0.24, 0.86, MATS["chair_blue"])
    s.box(0.18, -0.32, 0.7, 0.46, 0.08, 0.72, MATS["desk_wood"])  # meja lipat lengan
    s.box(0.2, -0.04, 0.47, 0.23, 0.0, 0.7, MATS["iron"])
    for x in (-0.19, 0.19):
        for y in (-0.19, 0.19):
            s.box(x - 0.015, y - 0.015, 0, x + 0.015, y + 0.015, 0.43, MATS["iron"])
    return 0.01


def build_desk_pair(mb, w=0.7, d=0.5, h=0.74, ch=0.45, small=False):
    M = MATS
    mb.box(-w / 2, -d / 2, h - 0.03, w / 2, d / 2, h, M["desk_wood"])
    mb.box(-w / 2 + 0.03, -d / 2 + 0.05, h - 0.2, w / 2 - 0.03, d / 2 - 0.02, h - 0.17, M["desk_wood"])
    for x in (-w / 2 + 0.03, w / 2 - 0.05):
        for y in (-d / 2 + 0.03, d / 2 - 0.05):
            mb.box(x, y, 0, x + 0.03, y + 0.03, h - 0.03, M["iron"])
    cy = -d / 2 - 0.32
    mb.box(-0.2, cy - 0.18, ch - 0.03, 0.2, cy + 0.18, ch, M["teak"])
    mb.box(-0.2, cy - 0.21, ch, 0.2, cy - 0.18, ch + 0.35, M["teak"])
    for x in (-0.18, 0.16):
        for y in (cy - 0.17, cy + 0.15):
            mb.box(x, y, 0, x + 0.025, y + 0.025, ch - 0.03, M["iron"])
    return 0.008


def build_teacher_desk(mb):
    M = MATS
    mb.box(-0.7, -0.35, 0.72, 0.7, 0.35, 0.76, M["teak"])
    mb.box(-0.7, -0.35, 0.0, -0.4, 0.35, 0.72, M["teak"])
    mb.box(0.4, -0.35, 0.0, 0.7, 0.35, 0.72, M["teak"])
    mb.box(-0.4, 0.3, 0.2, 0.4, 0.35, 0.72, M["wood_dark"])
    mb.box(-0.2, -0.05, 0.76, 0.15, 0.2, 0.8, M["paper"])
    return 0.01


def build_pc_desk(mb):
    M = MATS
    mb.box(-0.6, -0.32, 0.72, 0.6, 0.32, 0.75, M["desk_wood"])
    for x in (-0.57, 0.54):
        mb.box(x, -0.3, 0, x + 0.03, 0.3, 0.72, M["iron"])
    mb.box(-0.6, 0.28, 0.25, 0.6, 0.31, 0.72, M["wood_dark"])
    for ox in (-0.3, 0.3):
        mb.box(ox - 0.27, 0.12, 0.85, ox + 0.27, 0.15, 1.17, M["iron"])
        mb.box(ox - 0.25, 0.115, 0.87, ox + 0.25, 0.12, 1.15, M["screen"])
        mb.box(ox - 0.03, 0.14, 0.75, ox + 0.03, 0.18, 0.86, M["iron"])
        mb.box(ox - 0.1, 0.1, 0.75, ox + 0.1, 0.22, 0.765, M["iron"])
        mb.box(ox - 0.2, -0.2, 0.75, ox + 0.2, -0.06, 0.77, M["iron"])
        mb.box(ox + 0.18, -0.25, 0.0, ox + 0.27, 0.15, 0.42, M["iron"])  # CPU
        mb.box(ox + 0.19, -0.255, 0.3, ox + 0.21, -0.25, 0.32, MATS["led_green"])
    return 0.008


def build_office_chair(mb):
    M = MATS
    mb.box(-0.23, -0.23, 0.44, 0.23, 0.21, 0.5, M["chair_blue"])
    mb.box(-0.22, 0.21, 0.52, 0.22, 0.26, 0.98, M["chair_blue"])
    mb.cyl(0, 0, 0.08, 0.44, 0.025, M["chrome"], 8)
    for i in range(5):
        a = 2 * math.pi * i / 5
        mb.beam((0, 0, 0.08), (0.27 * math.cos(a), 0.27 * math.sin(a), 0.04), 0.03, M["iron"])
    return 0.01


def build_server_rack(mb):
    M = MATS
    mb.box(-0.3, -0.5, 0, 0.3, 0.5, 2.0, M["iron"])
    for i in range(12):
        z = 0.15 + i * 0.15
        mb.box(-0.31, -0.42, z, -0.30, 0.42, z + 0.1, M["sma_grey"])
        mb.box(-0.315, -0.38 + (i % 3) * 0.1, z + 0.04, -0.31, -0.35 + (i % 3) * 0.1, z + 0.06, M["led_green"])
    return 0.01


def build_bookshelf(mb, w=1.6, h=2.0):
    M = MATS
    mb.box(-w / 2, 0.0, 0, w / 2, 0.35, 0.03, M["teak"])
    mb.box(-w / 2, 0.0, h - 0.03, w / 2, 0.35, h, M["teak"])
    mb.box(-w / 2, 0.0, 0, -w / 2 + 0.03, 0.35, h, M["teak"])
    mb.box(w / 2 - 0.03, 0.0, 0, w / 2, 0.35, h, M["teak"])
    mb.box(-w / 2, 0.32, 0, w / 2, 0.35, h, M["wood_dark"])
    rnd = random.Random(11)
    for s in range(5):
        z = 0.03 + s * (h / 5)
        mb.box(-w / 2, 0.0, z, w / 2, 0.35, z + 0.02, M["teak"])
        x = -w / 2 + 0.05
        while x < w / 2 - 0.1:
            bw = rnd.uniform(0.03, 0.07)
            bh = rnd.uniform(0.22, h / 5 - 0.06)
            mb.box(x, 0.05, z + 0.02, x + bw, 0.3, z + 0.02 + bh, M[f"book{rnd.randrange(5)}"])
            x += bw + 0.005
    return 0.0


def build_lab_ipa_bench(mb):
    M = MATS
    mb.box(-1.2, -0.45, 0.86, 1.2, 0.45, 0.9, M["black"])
    mb.box(-1.15, -0.4, 0, 1.15, 0.4, 0.86, M["white"])
    mb.box(-0.2, -0.15, 0.82, 0.2, 0.15, 0.9, M["chrome"])  # wastafel
    mb.beam((0, 0.3, 0.9), (0, 0.3, 1.2), 0.02, M["chrome"])
    mb.beam((0, 0.3, 1.2), (0, 0.15, 1.2), 0.02, M["chrome"])
    for i, x in enumerate((-0.9, -0.7, 0.6, 0.85)):
        mb.cyl(x, 0.1, 0.9, 0.9 + 0.12 + 0.04 * (i % 2), 0.035, M["glass"], 8, 0.025)
    return 0.008


def build_bike(mb):
    M = MATS
    for x in (-0.5, 0.5):
        mb.hcyl(x, 0, 0.33, 0.04, 0.33, M["black"], axis="y", seg=14)
    mb.beam((-0.5, 0, 0.33), (0.0, 0, 0.75), 0.04, M["sd_red"])
    mb.beam((0.5, 0, 0.33), (0.35, 0, 0.85), 0.04, M["sd_red"])
    mb.beam((0.0, 0, 0.75), (0.35, 0, 0.75), 0.04, M["sd_red"])
    mb.beam((0.0, 0, 0.75), (0.0, 0, 0.3), 0.04, M["sd_red"])
    mb.box(-0.12, -0.08, 0.8, 0.12, 0.08, 0.84, M["black"])
    mb.box(0.33, -0.25, 0.9, 0.37, 0.25, 0.93, M["chrome"])
    return 0.0


def build_canteen_set(mb):
    M = MATS
    mb.box(-0.9, -0.4, 0.72, 0.9, 0.4, 0.76, M["teak"])
    for x in (-0.8, 0.77):
        mb.box(x, -0.35, 0, x + 0.04, 0.35, 0.72, M["iron"])
    for y in (-0.75, 0.75):
        mb.box(-0.9, y - 0.15, 0.42, 0.9, y + 0.15, 0.46, M["teak"])
        for x in (-0.8, 0.77):
            mb.box(x, y - 0.12, 0, x + 0.04, y + 0.12, 0.42, M["iron"])
    return 0.01


def build_uks_bed(mb):
    M = MATS
    mb.box(-0.95, -0.45, 0.5, 0.95, 0.45, 0.62, M["mattress"])
    mb.box(-0.95, -0.45, 0.45, 0.95, 0.45, 0.5, M["chrome"])
    for x in (-0.92, 0.89):
        for y in (-0.42, 0.39):
            mb.box(x, y, 0, x + 0.03, y + 0.03, 0.45, M["chrome"])
    mb.box(-0.98, -0.45, 0.45, -0.95, 0.45, 1.0, M["chrome"])
    mb.box(-0.9, -0.3, 0.62, -0.6, 0.3, 0.72, M["paper"])
    return 0.01


def build_ac(mb):
    M = MATS
    mb.box(-0.45, -0.12, -0.15, 0.45, 0.12, 0.15, M["white"])
    mb.box(-0.4, -0.125, -0.12, 0.4, -0.12, -0.08, M["iron"])
    return 0.02


def build_ceiling_lamp(mb):
    mb.box(-0.6, -0.15, -0.05, 0.6, 0.15, 0.0, MATS["white"])
    mb.box(-0.55, -0.1, -0.06, 0.55, 0.1, -0.05, MATS["led_white"])
    return 0.0


def build_clock(mb):
    mb.hcyl(0, 0, 0, 0.04, 0.17, MATS["iron"], axis="y", seg=16)
    mb.hcyl(0, -0.015, 0, 0.02, 0.15, MATS["paper"], axis="y", seg=16)
    mb.box(-0.005, -0.04, 0, 0.005, -0.03, 0.11, MATS["black"])
    mb.box(0, -0.04, -0.005, 0.08, -0.03, 0.005, MATS["red"])
    return 0.0


def build_flag_small(mb):
    mb.beam((0, 0, 0), (0, -0.25, 0.25), 0.015, MATS["chrome"])
    mb.box(-0.003, -0.25, 0.25, 0.003, -0.25 + 0.003, 0.25, MATS["red"])
    mb.box(-0.2, -0.26, 0.1, 0.2, -0.255, 0.25, MATS["red"])
    mb.box(-0.2, -0.26, -0.05, 0.2, -0.255, 0.1, MATS["white"])
    return 0.0


def build_motor(mb):
    """Motor bebek sederhana untuk teras dan bengkel (bentuk dasar sendiri, bukan merek)."""
    M = MATS
    for x in (-0.62, 0.62):
        mb.hcyl(x, 0, 0.3, 0.1, 0.3, M["black"], axis="y", seg=14)
        mb.hcyl(x, 0, 0.3, 0.11, 0.16, M["chrome"], axis="y", seg=10)
    mb.hull([(-0.55, -0.15, 0.45), (0.25, -0.15, 0.45), (0.25, 0.15, 0.45), (-0.55, 0.15, 0.45)],
            [(-0.6, -0.15, 0.72), (0.2, -0.15, 0.72), (0.2, 0.15, 0.72), (-0.6, 0.15, 0.72)], M["blue_sign"])
    mb.box(-0.55, -0.14, 0.72, 0.05, 0.14, 0.8, M["black"])
    mb.hull([(0.2, -0.16, 0.3), (0.55, -0.16, 0.3), (0.55, 0.16, 0.3), (0.2, 0.16, 0.3)],
            [(0.35, -0.12, 0.95), (0.6, -0.12, 0.95), (0.6, 0.12, 0.95), (0.35, 0.12, 0.95)], M["blue_sign"])
    mb.box(0.5, -0.35, 1.0, 0.56, 0.35, 1.03, M["chrome"])
    mb.box(0.58, -0.08, 0.86, 0.66, 0.08, 0.98, M["paper"])
    mb.beam((-0.62, 0.12, 0.25), (0.1, 0.12, 0.3), 0.06, M["chrome"])
    return 0.01


def build_tire_stack(mb):
    for i in range(5):
        mb.cyl(0, 0, i * 0.18, i * 0.18 + 0.17, 0.32, MATS["black"], 14)
    return 0.0


def build_drum(mb):
    mb.cyl(0, 0, 0, 0.88, 0.29, MATS["blue_sign"], 14)
    mb.cyl(0, 0, 0.88, 0.9, 0.27, MATS["iron"], 14)
    return 0.0


def build_lpg(mb):
    mb.cyl(0, 0, 0, 0.3, 0.13, MATS["lpg"], 10)
    mb.cyl(0, 0, 0.3, 0.36, 0.06, MATS["iron"], 8)
    return 0.0


def build_galon(mb):
    mb.cyl(0, 0, 0, 0.42, 0.14, MATS["glass"], 10)
    mb.cyl(0, 0, 0.42, 0.48, 0.04, MATS["blue_sign"], 8)
    return 0.0


def build_pot_plant(mb):
    mb.cyl(0, 0, 0, 0.32, 0.18, MATS["pot"], 10, 0.22)
    for i in range(7):
        a = 2 * math.pi * i / 7
        mb.beam((0, 0, 0.3), (0.32 * math.cos(a), 0.32 * math.sin(a), 0.75 + 0.1 * (i % 3)), 0.09, MATS["leaf"])
    return 0.0


def build_banana(mb):
    mb.cyl(0, 0, 0, 2.6, 0.14, MATS["trunk"], 8, 0.1)
    for i in range(7):
        a = 2 * math.pi * i / 7 + 0.3
        tip = (1.6 * math.cos(a), 1.6 * math.sin(a), 2.5 + 0.4 * math.sin(i))
        mid = (0.8 * math.cos(a), 0.8 * math.sin(a), 3.0)
        mb.beam((0, 0, 2.6), mid, 0.06, MATS["banana"])
        px, py = -math.sin(a) * 0.3, math.cos(a) * 0.3
        mb.poly([(0, 0, 2.6), (mid[0] + px, mid[1] + py, mid[2]), tip, (mid[0] - px, mid[1] - py, mid[2])], MATS["banana"])
        mb.poly([(mid[0] - px, mid[1] - py, mid[2]), tip, (mid[0] + px, mid[1] + py, mid[2]), (0, 0, 2.6)], MATS["banana"])
    return 0.0


def build_jemuran(mb):
    M = MATS
    for x in (-1.0, 1.0):
        mb.box(x - 0.02, -0.02, 0, x + 0.02, 0.02, 1.7, M["chrome"])
    mb.box(-1.0, -0.01, 1.68, 1.0, 0.01, 1.7, M["chrome"])
    cols = ["sd_red", "blue_sign", "yellow", "white", "green_sign"]
    x = -0.9
    i = 0
    while x < 0.8:
        w = 0.3 + 0.15 * (i % 2)
        mb.box(x, -0.01, 1.05 + 0.1 * (i % 3), x + w, 0.01, 1.66, M[cols[i % 5]])
        x += w + 0.06
        i += 1
    return 0.0


def build_trash(mb):
    mb.cyl(0, 0, 0, 0.8, 0.28, MATS["green_sign"], 12, 0.3)
    mb.cyl(0, 0, 0.8, 0.86, 0.31, MATS["iron"], 12)
    return 0.0


def build_speed_bump(mb, length=3.4):
    for i in range(int(length / 0.4)):
        y = -length / 2 + i * 0.4
        mb.hull([(-0.25, y, 0.0), (0.25, y, 0.0), (0.25, y + 0.4, 0.0), (-0.25, y + 0.4, 0.0)],
                [(-0.08, y, 0.09), (0.08, y, 0.09), (0.08, y + 0.4, 0.09), (-0.08, y + 0.4, 0.09)],
                MATS["yellow"] if i % 2 == 0 else MATS["black"])
    return 0.0


def build_power_pole(mb):
    M = MATS
    mb.cyl(0, 0, 0, 9.0, 0.16, M["concrete"], 10, 0.11)
    mb.box(-0.9, -0.06, 8.3, 0.9, 0.06, 8.42, M["iron"])
    for x in (-0.75, 0.0, 0.75):
        mb.cyl(x, 0, 8.42, 8.58, 0.04, M["white"], 6)
    mb.box(-0.25, -0.35, 6.4, 0.25, -0.15, 7.0, M["sma_grey"])  # trafo kecil
    return 0.0


def build_lamp_post(mb):
    M = MATS
    mb.cyl(0, 0, 0, 4.2, 0.06, M["iron"], 8)
    mb.beam((0, 0, 4.1), (0, -0.7, 4.3), 0.05, M["iron"])
    mb.box(-0.15, -0.85, 4.2, 0.15, -0.55, 4.32, M["iron"])
    return 0.0


# ----------------------------------------------------------------------------- tanah, jalan, kali
def build_ground_roads():
    M = MATS
    g = MB()
    z = -0.06
    g.box(-132, -100, z - 0.05, -100.2, 120, z, M["grass"])
    g.box(-96.8, -100, z - 0.05, 132, 120, z, M["grass"])
    g.finish("KG2_Ground_Grass")

    r = MB()
    # Jalan utama: perpanjangan barat & timur (tetap menyambung di atas kali sebagai jembatan)
    for xa, xb in ((-132, -85.0), (85.0, 132)):
        r.box(xa, -9.1, -0.1, xb, -3.9, 0.0, M["asphalt"])
    # Jl. Kampung 2 (BackAvenue) diperpanjang
    r.box(-132, 15.6, -0.1, -77.5, 19.4, 0.0, M["asphalt"])
    r.box(77.5, 15.6, -0.1, 85.0, 19.4, 0.0, M["asphalt"])
    # Jl. Pendidikan (pertigaan) + sambungan FarNorthRoad
    r.box(85.0, -3.9, -0.1, 88.6, 36.2, 0.0, M["asphalt"])
    r.box(80.0, 31.8, -0.1, 85.0, 36.2, 0.0, M["asphalt"])
    r.finish("KG2_Road_Extension")

    c = MB()
    for xa, xb in ((-132, -83.0), (83.0, 132)):
        c.box(xa, -9.35, -0.1, xb, -9.05, 0.12, M["concrete"])
        c.box(xa, -3.95, -0.1, xb, -3.65, 0.12, M["concrete"])
        c.box(xa, -10.9, -0.1, xb, -9.35, 0.1, M["cobble"])  # trotoar selatan
        c.box(xa, -3.65, -0.1, xb, -2.2, 0.1, M["cobble"])  # trotoar utara
    for xa, xb in ((-132, -77.5), (77.5, 85.0)):
        c.box(xa, 15.35, -0.1, xb, 15.6, 0.1, M["concrete"])
        c.box(xa, 19.4, -0.1, xb, 19.65, 0.1, M["concrete"])
    c.box(84.75, -2.2, -0.1, 85.0, 15.35, 0.1, M["concrete"])
    c.box(88.6, -3.65, -0.1, 88.85, 36.2, 0.1, M["concrete"])
    c.finish("KG2_Road_Curbs", bevel=0.02)

    lines = MB()
    for xa, xb in ((-132, -85.0), (85.0, 132)):
        x = xa + 1.0
        while x < xb - 3:
            if not (-101.5 < x < -95.5):
                lines.box(x, -6.6, 0.0, x + 3.0, -6.4, 0.005, existing("KG_WhiteLine", (0.95, 0.95, 0.95)))
            x += 6.0
    y = 0.0
    while y < 34:
        lines.box(86.7, y, 0.0, 86.9, y + 2.5, 0.005, existing("KG_WhiteLine"))
        y += 5.0
    # zebra cross di gerbang sekolah
    for i in range(8):
        x = 106.6 + i * 0.6
        lines.box(x, -8.8, 0.0, x + 0.35, -4.2, 0.006, existing("KG_WhiteLine"))
    lines.finish("KG2_Road_Lines")

    # Kali (saluran) + jembatan
    k = MB()
    for xa, xb in ((-100.2, -100.0), (-97.0, -96.8)):
        k.box(xa, -100, -1.7, xb, 120, 0.02, M["plaster"])
    k.box(-100.0, -100, -1.75, -97.0, 120, -1.6, M["mud"])
    k.finish("KG2_Kali_Walls")
    w = MB()
    w.box(-100.0, -100, -1.2, -97.0, 120, -1.15, M["water"])
    w.finish("KG2_Kali_Water")
    j = MB()
    # jembatan jalan utama (deck beton + railing)
    j.box(-100.6, -9.4, -0.45, -96.4, -3.6, -0.1, M["concrete"])
    j.box(-100.6, -9.4, -0.1, -96.4, -3.9, 0.0, M["asphalt"]) if False else None
    for y in (-9.45, -3.55):
        j.box(-100.8, y - 0.12, 0.0, -96.2, y + 0.12, 0.75, M["concrete"])
        j.box(-100.9, y - 0.15, 0.75, -96.1, y + 0.15, 0.85, M["white"])
    # jembatan kecil Jl. Kampung 2
    j.box(-100.5, 15.6, -0.35, -96.5, 19.4, 0.0, M["concrete"])
    for y in (15.5, 19.5):
        for x in (-100.4, -98.5, -96.6):
            j.box(x - 0.06, y - 0.06, 0.0, x + 0.06, y + 0.06, 1.0, M["iron"])
        j.box(-100.5, y - 0.04, 0.95, -96.5, y + 0.04, 1.02, M["iron"])
        j.box(-100.5, y - 0.03, 0.5, -96.5, y + 0.03, 0.55, M["iron"])
    j.finish("KG2_Kali_Bridges", bevel=0.015)
    # sambungan aspal di atas jembatan utama
    a = MB()
    a.box(-100.6, -9.1, -0.1, -96.4, -3.9, 0.0, M["asphalt"])
    a.box(-100.6, 15.6, -0.1, -96.5, 19.4, 0.0, M["asphalt"])
    a.finish("KG2_Kali_BridgeDeck")


# ----------------------------------------------------------------------------- gedung bertingkat generik
def multistorey(prefix, x0, y0, x1, y1, floors, fh, wall_mat, base_mat, rooms, stair, front_corridor, sign,
                win_mat_lower, win_mat_upper, roof="flat", accent=None):
    """Gedung bertingkat dengan selasar depan (sisi selatan, y0), ruangan di belakang selasar.

    rooms: list per lantai -> list of (rx0, rx1, ry0, ry1, label, kind)
    stair: (sx0, sx1) pada sisi barat/timur, memakai lebar penuh kedalaman ruangan.
    """
    M = MATS
    t = 0.2
    slab = 0.25
    ry0 = y0 + front_corridor
    for f in range(floors):
        z = 0.15 + f * fh
        shell = MB()
        frame = MB()
        glass = MB()
        # lantai + plafon
        shell.box(x0, y0 if f > 0 else ry0, z - slab, x1, y1, z, M["concrete"])
        flo = MB()
        flo.box(x0 + t, ry0 + t, z, x1 - t, y1 - t, z + 0.01, M["floor_tile"])
        if f > 0 or front_corridor > 0:
            flo.box(x0, y0, z, x1, ry0, z + 0.01, M["terrace"])
        flo.finish(f"{prefix}_F{f+1}_Floor")
        ceil = MB()
        ceil.box(x0 + t, y0, z + fh - slab - 0.02, x1 - t, y1 - t, z + fh - slab, M["white"])
        ceil.finish(f"{prefix}_F{f+1}_Ceiling")
        zt = z + fh - slab
        # dinding belakang + samping dengan jendela
        back_ops, side_ops = [], []
        xx = x0 + 1.2
        while xx + 1.4 < x1 - 0.8:
            back_ops.append((xx, xx + 1.4, z + 2.35, z + 2.95))
            xx += 2.6
        wall_x(shell, y1 - t, y1, x0, x1, z, zt, wall_mat, back_ops)
        for xa, xb, zb, ztt in back_ops:
            window_x(frame, glass, y1 - t / 2, xa, xb, zb, ztt, M)
        yy = ry0 + 1.2
        while yy + 1.4 < y1 - 0.8:
            side_ops.append((yy, yy + 1.4, z + 0.9, z + 2.4))
            yy += 2.8
        for x_side in (x0, x1 - t):
            wall_y(shell, x_side, x_side + t, ry0, y1, z, zt, wall_mat, side_ops)
            for ya, yb, zb, ztt in side_ops:
                window_y(frame, glass, x_side + t / 2, ya, yb, zb, ztt, M)
        # dinding depan ruangan (menghadap selasar) dengan pintu + jendela per ruangan
        front_ops, doors = [], []
        for (rx0, rx1, rr0, rr1, label, kind) in rooms[f]:
            if abs(rr0 - ry0) < 0.01:  # ruangan yang menempel selasar
                d0 = rx0 + 0.5
                doors.append((d0, d0 + 0.95))
                front_ops.append((d0, d0 + 0.95, z, z + 2.1))
                wx = d0 + 1.5
                while wx + 1.2 < rx1 - 0.4:
                    front_ops.append((wx, wx + 1.2, z + 0.95, z + 2.3))
                    wx += 1.7
        sx0, sx1 = stair
        front_ops.append((sx0 + 0.1, sx1 - 0.1, z, zt - 0.01))  # tangga terbuka ke selasar
        wall_x(shell, ry0, ry0 + t, x0, x1, z, zt, wall_mat, front_ops)
        for xa, xb, zb, ztt in front_ops:
            if zb > z + 0.5:
                window_x(frame, glass, ry0 + t / 2, xa, xb, zb, ztt, M, bars=False)
        for da, db in doors:
            door_x(frame, ry0 + t / 2, da, db, z, M, open_into=1)
        # sekat antar ruangan + dinding tangga
        part = MB()
        for (rx0, rx1, rr0, rr1, label, kind) in rooms[f]:
            if rx1 < x1 - 0.3:
                part.box(rx1 - t / 2, rr0, z, rx1 + t / 2, rr1, zt, wall_mat)
            if rr1 < y1 - 0.3:
                part.box(rx0, rr1 - t / 2, z, rx1, rr1 + t / 2, zt, wall_mat)
                door_y_x = rx0 + 0.6
                # bukaan pintu antar ruangan belakang dibiarkan sebagai lubang di sekat
        part.box(sx1 - t / 2 if sx0 <= x0 + 0.01 else sx0 - t / 2, ry0, z,
                 sx1 + t / 2 if sx0 <= x0 + 0.01 else sx0 + t / 2, y1, zt, wall_mat)
        part.finish(f"{prefix}_F{f+1}_Partitions")
        # selasar: kolom, railing (lantai 2+), plafon selasar
        if front_corridor > 0:
            cx = x0 + 0.15
            n = max(2, int((x1 - x0) / 3.8))
            for i in range(n + 1):
                xc = x0 + 0.15 + (x1 - x0 - 0.3) * i / n
                shell.box(xc - 0.18, y0, z, xc + 0.18, y0 + 0.36, zt, base_mat if f == 0 else wall_mat)
            if f > 0:
                frame.box(x0, y0 + 0.02, z, x1, y0 + 0.12, z + 0.5, wall_mat)  # pagar bawah
                for i in range(int((x1 - x0) / 0.22)):
                    xb_ = x0 + 0.1 + i * 0.22
                    frame.box(xb_, y0 + 0.05, z + 0.5, xb_ + 0.025, y0 + 0.08, z + 1.05, M["iron"])
                frame.box(x0, y0 + 0.0, z + 1.05, x1, y0 + 0.14, z + 1.1, accent or M["iron"])
        # plint bawah dinding luar
        shell.box(x0 - 0.02, y1 - 0.02, z, x1 + 0.02, y1 + 0.02, z + 0.35, base_mat)
        shell.finish(f"{prefix}_F{f+1}_Shell", bevel=0.025)
        frame.finish(f"{prefix}_F{f+1}_Frames")
        glass.finish(f"{prefix}_F{f+1}_{'Win1' if f == 0 else 'Win2'}_Glass")
        # tangga beton 2 bordes per lantai
        if f < floors - 1:
            st = MB()
            risers = int(round(fh / 0.17))
            half = risers // 2
            rh = fh / risers
            run = 0.28
            w2 = (sx1 - sx0) / 2
            ys = ry0 + 0.6
            for i in range(half):
                st.box(sx0 + 0.1, ys + i * run, z, sx0 + w2, ys + (i + 1) * run, z + (i + 1) * rh, M["terrace"])
            land_y = ys + half * run
            st.box(sx0 + 0.1, land_y, z, sx1 - 0.1, land_y + 1.3, z + half * rh, M["terrace"])
            for i in range(risers - half):
                yy0 = land_y - (i + 1) * run
                st.box(sx0 + w2, yy0, z, sx1 - 0.1, yy0 + run, z + half * rh + (i + 1) * rh, M["terrace"])
            st.beam((sx0 + w2, ys, z + 1.0), (sx0 + w2, land_y, z + half * rh + 1.0), 0.05, M["iron"])
            st.finish(f"{prefix}_F{f+1}_Stair", bevel=0.01)
    # atap
    ztop = 0.15 + floors * fh - slab
    rf = MB()
    if roof == "flat":
        rf.box(x0 - 0.2, y0 - 0.2, ztop, x1 + 0.2, y1 + 0.2, ztop + 0.3, M["concrete"])
        rf.box(x0 - 0.2, y0 - 0.2, ztop + 0.3, x1 + 0.2, y0 + 0.05, ztop + 1.2, wall_mat)
        rf.box(x0 - 0.2, y1 - 0.05, ztop + 0.3, x1 + 0.2, y1 + 0.2, ztop + 1.2, wall_mat)
        rf.box(x0 - 0.2, y0, ztop + 0.3, x0 + 0.05, y1, ztop + 1.2, wall_mat)
        rf.box(x1 - 0.05, y0, ztop + 0.3, x1 + 0.2, y1, ztop + 1.2, wall_mat)
        if accent:
            rf.box(x0 - 0.25, y0 - 0.25, ztop + 1.0, x1 + 0.25, y0 - 0.15, ztop + 1.2, accent)
        rf.cyl(x1 - 2.0, y1 - 2.0, ztop + 0.3, ztop + 2.3, 0.7, existing("KG_TorenOrange", (0.9, 0.5, 0.1)), 14)
        for i in range(3):
            rf.box(x0 + 2 + i * 1.4, y1 - 1.6, ztop + 0.3, x0 + 3 + i * 1.4, y1 - 1.0, ztop + 1.0, M["white"])
    else:
        ov = 0.8
        h = 2.4
        ym = (y0 + y1) / 2
        rf.box(x0, y0, ztop, x1, y1, ztop + 0.25, M["concrete"])
        for sgn in (-1, 1):
            ya = y0 - ov if sgn < 0 else y1 + ov
            rf.hull([(x0 - ov, ya, ztop + 0.25), (x1 + ov, ya, ztop + 0.25), (x1 + ov, ym, ztop + 0.25 + h), (x0 - ov, ym, ztop + 0.25 + h)],
                    [(x0 - ov, ya, ztop + 0.37), (x1 + ov, ya, ztop + 0.37), (x1 + ov, ym, ztop + 0.37 + h), (x0 - ov, ym, ztop + 0.37 + h)],
                    M["roof_moss"])
        for xg in (x0, x1):
            rf.poly([(xg, y0, ztop + 0.25), (xg, y1, ztop + 0.25), (xg, ym, ztop + 0.25 + h)], wall_mat)
            rf.poly([(xg, ym, ztop + 0.25 + h), (xg, y1, ztop + 0.25), (xg, y0, ztop + 0.25)], wall_mat)
        for ya in (y0 - ov, y1 + ov):  # lisplang + talang
            rf.box(x0 - ov, ya - 0.04, ztop + 0.12, x1 + ov, ya + 0.04, ztop + 0.4, M["white"])
            rf.hcyl((x0 + x1) / 2, ya + (-0.12 if ya < ym else 0.12), ztop + 0.15, x1 - x0 + 2 * ov, 0.07, M["sma_grey"], axis="x", seg=8)
    rf.finish(f"{prefix}_Roof", bevel=0.02)
    if sign:
        text, loc, size, face = sign
        text_mesh(f"{prefix}_SignMain_Title", text, loc, size, MATS["white"] if accent is None else MATS["gold"], ROT_FACE[face])


def furnish_room(prefix, rx0, rx1, ry0, ry1, z, fh, kind, idx):
    """Isi ruangan sesuai jenisnya. Papan tulis di dinding utara (belakang), murid menghadap utara."""
    M = MATS
    cx = (rx0 + rx1) / 2
    zt = z + fh - 0.27
    deco = MB()
    lamp = proto("CeilLamp", build_ceiling_lamp)
    nx = max(1, int((rx1 - rx0) / 2.6))
    ny = max(1, int((ry1 - ry0) / 3.0))
    for i in range(nx):
        for j in range(ny):
            instance(lamp, f"{prefix}_Lamp_{i}{j}", (rx0 + (rx1 - rx0) * (i + 0.5) / nx, ry0 + (ry1 - ry0) * (j + 0.5) / ny, zt - 0.02))
    instance(proto("AC", build_ac), f"{prefix}_AC", (rx0 + 0.9, ry1 - 0.35, zt - 0.4))
    instance(proto("Clock", build_clock), f"{prefix}_Clock", (rx1 - 0.8, ry1 - 0.12, z + 2.55))
    if kind in ("kelas", "kelas_sd", "kelas_sma", "kuliah", "lab", "labipa", "jaringan"):
        board = M["blackboard"] if kind == "kelas_sd" else M["whiteboard"]
        bw = min(3.6, rx1 - rx0 - 1.6)
        deco.box(cx - bw / 2 - 0.05, ry1 - 0.16, z + 0.85, cx + bw / 2 + 0.05, ry1 - 0.12, z + 2.15, M["teak"])
        deco.box(cx - bw / 2, ry1 - 0.17, z + 0.9, cx + bw / 2, ry1 - 0.16, z + 2.1, board)
        deco.box(cx - bw / 2, ry1 - 0.3, z + 0.86, cx + bw / 2, ry1 - 0.16, z + 0.89, M["teak"])
        instance(proto("Flag", build_flag_small), f"{prefix}_Flag", (cx + bw / 2 + 0.35, ry1 - 0.12, z + 1.75))
    if kind in ("kelas_sd", "kelas_sma"):
        # papan visi misi + jadwal piket di dinding samping
        deco.box(rx0 + 0.12, ry0 + 1.0, z + 1.3, rx0 + 0.14, ry0 + 2.0, z + 2.0, M["paper"])
        deco.box(rx0 + 0.12, ry0 + 2.3, z + 1.3, rx0 + 0.14, ry0 + 3.1, z + 2.0, M["paper"])
        text_mesh(f"{prefix}_PosterSub_VisiMisi", "VISI & MISI", (rx0 + 0.15, ry0 + 1.5, z + 1.88), 0.13, M["blue_sign"], ROT_FACE["E"], 0.002)
        text_mesh(f"{prefix}_PosterSub_Piket", "JADWAL PIKET", (rx0 + 0.15, ry0 + 2.7, z + 1.88), 0.11, M["sd_red"], ROT_FACE["E"], 0.002)
    if kind in ("kelas_sd", "kelas_sma"):
        for li in range(5):
            deco.box(rx0 + 0.145, ry0 + 1.1, z + 1.4 + li * 0.07, rx0 + 0.15, ry0 + 1.9, z + 1.42 + li * 0.07, M["black"])
            deco.box(rx0 + 0.145, ry0 + 2.4, z + 1.4 + li * 0.07, rx0 + 0.15, ry0 + 3.0, z + 1.42 + li * 0.07, M["black"])
    if kind == "kelas_sd":
        for i, col in enumerate(("sd_red", "yellow", "blue_sign", "green_sign")):
            deco.box(rx1 - 0.14, ry0 + 0.8 + i * 0.9, z + 1.5, rx1 - 0.12, ry0 + 1.5 + i * 0.9, z + 2.2, M[col])
    deco.finish(f"{prefix}_Decor", bevel=0.005)

    def grid(pkey, builder, sx, sy, margin_front=2.2, margin_back=0.9):
        p = proto(pkey, builder)
        cols = max(1, int((rx1 - rx0 - 1.2) / sx))
        rows = max(1, int((ry1 - ry0 - margin_front - margin_back) / sy))
        ox = cx - (cols - 1) * sx / 2
        for r in range(rows):
            for c in range(cols):
                instance(p, f"{prefix}_{pkey}_{r}{c}", (ox + c * sx, ry0 + margin_back + 0.5 + r * sy, z))
        return rows * cols

    if kind in ("kelas_sd",):
        grid("DeskSD", lambda mb: build_desk_pair(mb, 0.6, 0.42, 0.6, 0.34), 1.0, 1.25)
        instance(proto("TeacherDesk", build_teacher_desk), f"{prefix}_TeacherDesk", (rx0 + 1.4, ry1 - 1.4, z))
    elif kind in ("kelas_sma", "kelas"):
        grid("DeskSMA", lambda mb: build_desk_pair(mb), 1.1, 1.4)
        instance(proto("TeacherDesk", build_teacher_desk), f"{prefix}_TeacherDesk", (rx0 + 1.4, ry1 - 1.4, z))
    elif kind == "kuliah":
        grid("LectureChair", build_lecture_chair, 0.85, 1.05)
        instance(proto("TeacherDesk", build_teacher_desk), f"{prefix}_TeacherDesk", (rx0 + 1.4, ry1 - 1.4, z))
        deco2 = MB()
        deco2.box(cx - 0.3, ry0 + (ry1 - ry0) / 2 - 0.2, zt - 0.35, cx + 0.3, ry0 + (ry1 - ry0) / 2 + 0.2, zt - 0.2, M["white"])
        deco2.finish(f"{prefix}_Projector")
    elif kind == "lab":
        p = proto("PCDesk", build_pc_desk)
        ch = proto("OfficeChair", build_office_chair)
        cols = 2
        rows = max(1, int((ry1 - ry0 - 3.0) / 1.5))
        for r in range(rows):
            for c in range(cols):
                x = rx0 + 1.1 + c * (rx1 - rx0 - 2.2)
                y = ry0 + 1.2 + r * 1.5
                instance(p, f"{prefix}_PC_{r}{c}", (x, y, z))
                for k in (-0.3, 0.3):
                    instance(ch, f"{prefix}_Chair_{r}{c}{'a' if k < 0 else 'b'}", (x + k, y - 0.6, z), math.pi)
        instance(proto("TeacherDesk", build_teacher_desk), f"{prefix}_TeacherDesk", (rx0 + 1.4, ry1 - 1.4, z))
    elif kind == "jaringan":
        rk = proto("ServerRack", build_server_rack)
        for i in range(4):
            instance(rk, f"{prefix}_Rack_{i}", (rx1 - 0.6, ry0 + 2.0 + i * 1.1, z))
        p = proto("PCDesk", build_pc_desk)
        for i in range(3):
            instance(p, f"{prefix}_PC_{i}", (rx0 + 1.5, ry0 + 1.4 + i * 2.2, z))
            instance(proto("OfficeChair", build_office_chair), f"{prefix}_PCChair_{i}", (rx0 + 1.5, ry0 + 0.8 + i * 2.2, z), math.pi)
    elif kind == "labipa":
        b = proto("LabIpaBench", build_lab_ipa_bench)
        for i in range(max(1, int((ry1 - ry0 - 3) / 2.0))):
            instance(b, f"{prefix}_Bench_{i}", (cx, ry0 + 1.5 + i * 2.0, z))
        instance(proto("Bookshelf", build_bookshelf), f"{prefix}_Shelf", (rx0 + 0.95, ry0 + 0.4, z), math.pi)
    elif kind in ("perpus",):
        s = proto("Bookshelf", build_bookshelf)
        for i in range(int((rx1 - rx0 - 1) / 1.7)):
            instance(s, f"{prefix}_Shelf_{i}", (rx0 + 1.0 + i * 1.7, ry1 - 0.4, z))
        instance(proto("Canteen", build_canteen_set), f"{prefix}_ReadTable", (cx, ry0 + 2.2, z))
    elif kind in ("guru", "dosen", "tu"):
        d = proto("TeacherDesk", build_teacher_desk)
        ch = proto("OfficeChair", build_office_chair)
        k = 0
        for yy in (ry0 + 1.6, ry0 + 3.4):
            for xx in (rx0 + 1.3, rx1 - 1.3):
                if yy < ry1 - 1.0:
                    instance(d, f"{prefix}_Desk_{k}", (xx, yy, z))
                    instance(ch, f"{prefix}_Chair_{k}", (xx, yy + 0.7, z))
                    k += 1
        instance(proto("Bookshelf", build_bookshelf), f"{prefix}_Shelf", (cx, ry1 - 0.4, z))
    elif kind == "rapat":
        tb = MB()
        tb.box(cx - 1.6, ry0 + 1.6, z + 0.72, cx + 1.6, ry1 - 1.6, z + 0.76, M["teak"])
        tb.box(cx - 1.4, ry0 + 1.8, z, cx + 1.4, ry1 - 1.8, z + 0.72, M["wood_dark"])
        tb.finish(f"{prefix}_MeetingTable", bevel=0.01)
        ch = proto("OfficeChair", build_office_chair)
        for i in range(4):
            yy = ry0 + 2.0 + i * (ry1 - ry0 - 4.0) / 3
            instance(ch, f"{prefix}_ChairL_{i}", (cx - 2.0, yy, z), -math.pi / 2)
            instance(ch, f"{prefix}_ChairR_{i}", (cx + 2.0, yy, z), math.pi / 2)
    elif kind == "uks":
        bd = proto("UksBed", build_uks_bed)
        for i in range(2):
            instance(bd, f"{prefix}_Bed_{i}", (cx, ry0 + 1.5 + i * 1.4, z))
    elif kind in ("kantin",):
        c = proto("Canteen", build_canteen_set)
        for i in range(2):
            instance(c, f"{prefix}_Table_{i}", (cx, ry0 + 2.0 + i * 2.4, z))
    elif kind == "lobby":
        rc = MB()
        rc.box(cx - 1.5, ry1 - 2.2, z, cx + 1.5, ry1 - 1.6, z + 1.05, M["fik_blue"])
        rc.box(cx - 1.6, ry1 - 2.3, z + 1.05, cx + 1.6, ry1 - 1.5, z + 1.1, M["desk_wood"])
        rc.finish(f"{prefix}_Reception", bevel=0.01)
        bench = proto("Canteen", build_canteen_set)
        instance(proto("PotPlant", build_pot_plant), f"{prefix}_Pot_a", (rx0 + 0.6, ry0 + 0.8, z))
        instance(proto("PotPlant", build_pot_plant), f"{prefix}_Pot_b", (rx1 - 0.6, ry0 + 0.8, z))
    elif kind == "toilet":
        t = MB()
        for i in range(3):
            t.box(rx0 + 0.3 + i * 0.7, ry1 - 0.55, z + 0.8, rx0 + 0.8 + i * 0.7, ry1 - 0.15, z + 0.9, M["white"])
        t.box(rx0 + 0.25, ry1 - 0.14, z + 1.2, rx0 + 2.4, ry1 - 0.12, z + 1.9, M["glass"])
        t.finish(f"{prefix}_Sinks", bevel=0.01)


# ----------------------------------------------------------------------------- Gedung Kampus FIK
def build_fik():
    M = MATS
    x0, y0, x1, y1 = 7.0, 0.5, 22.8, 14.5
    fh = 4.0
    stair = (7.0, 9.5)
    R = [
        [(9.5, 16.0, 2.5, 9.0, "Lobi", "lobby"), (16.0, 22.8, 2.5, 9.0, "Tata Usaha", "tu"),
         (9.5, 16.0, 9.0, 14.5, "Kantin", "kantin"), (16.0, 22.8, 9.0, 14.5, "Toilet", "toilet")],
        [(9.5, 16.0, 2.5, 8.5, "Kelas 2A", "kuliah"), (9.5, 16.0, 8.5, 14.5, "Kelas 2B", "kuliah"),
         (16.0, 22.8, 2.5, 14.5, "Lab Komputer", "lab")],
        [(9.5, 16.0, 2.5, 8.5, "Ruang Dosen", "dosen"), (9.5, 16.0, 8.5, 14.5, "Ruang Rapat", "rapat"),
         (16.0, 22.8, 2.5, 14.5, "Lab Jaringan", "jaringan")],
    ]
    multistorey("KG2_FIK", x0, y0, x1, y1, 3, fh, M["paint_white"], M["stone"], R, stair, 2.0,
                ("FAKULTAS ILMU KOMPUTER", (14.9, y0 - 0.32, 13.15), 0.62, "S"),
                M["win_cool"], M["win_cool"], roof="flat", accent=M["fik_blue"])
    for f, rooms in enumerate(R):
        z = 0.15 + f * fh
        for i, (rx0, rx1, ry0, ry1, label, kind) in enumerate(rooms):
            furnish_room(f"KG2_FIK_F{f+1}_R{i}", rx0 + 0.1, rx1 - 0.1, ry0 + 0.1, ry1 - 0.2, z, fh, kind, i)
            if abs(ry0 - 2.5) < 0.01:
                text_mesh(f"KG2_FIK_F{f+1}_R{i}_BoardHead", label.upper(), ((rx0 + rx1) / 2 + 0.9, 2.34, z + 2.55), 0.16, M["fik_blue"], ROT_FACE["S"], 0.01)
    # aksen fasad: sirip vertikal biru + kanopi lobi
    a = MB()
    for xf in (9.6, 16.1, 22.6):
        a.box(xf - 0.12, y0 - 0.25, 0.15, xf + 0.12, y0 + 0.05, 12.95, M["fik_blue"])
    a.box(10.5, -1.6, 3.3, 15.2, 0.5, 3.45, M["fik_blue"])
    a.box(10.5, -1.62, 3.2, 15.2, -1.55, 3.3, M["fik_accent"])
    a.finish("KG2_FIK_FacadeAccent", bevel=0.02)
    # plaza: paving, tiang bendera, taman kecil, papan nama berdiri
    p = MB()
    p.box(7.0, -2.2, 0.0, 22.8, 0.5, 0.08, M["cobble"])
    p.box(7.0, -2.2, 0.0, 22.8, -2.0, 0.18, M["concrete"])
    p.cyl(21.2, -1.2, 0.08, 8.5, 0.05, M["chrome"], 10, 0.035)
    p.box(21.2, -1.22, 7.4, 22.6, -1.18, 7.85, M["red"])
    p.box(21.2, -1.22, 6.95, 22.6, -1.18, 7.4, M["white"])
    p.box(20.6, -1.8, 0.08, 21.8, -0.6, 0.3, M["stone"])
    p.box(7.6, -1.9, 0.08, 9.4, -0.3, 0.45, M["stone"])
    p.box(7.7, -1.8, 0.45, 9.3, -0.4, 0.5, M["grass"])
    p.box(11.0, -1.9, 0.08, 14.6, -1.6, 1.0, M["fik_blue"])
    p.finish("KG2_FIK_Plaza", bevel=0.015)
    text_mesh("KG2_FIK_SignSub_Plaza", "FIK RAWA SARI", (12.8, -1.92, 0.6), 0.28, M["white"], ROT_FACE["S"], 0.02)
    instance(proto("Banana", build_banana), "KG2_FIK_Banana", (8.5, -1.1, 0.5))


# ----------------------------------------------------------------------------- Kompleks Sekolah SD + SMA
def build_school():
    M = MATS
    fh = 3.6
    # Sayap SD (barat), tangga di ujung barat
    sd_rooms = [
        [(92.5, 98.0, 18.0, 28.0, "Kelas 1", "kelas_sd"), (98.0, 103.4, 18.0, 28.0, "Kelas 2", "kelas_sd"),
         (103.4, 108.8, 18.0, 23.0, "Ruang Guru", "guru"), (103.4, 108.8, 23.0, 28.0, "UKS", "uks")],
        [(92.5, 98.0, 18.0, 28.0, "Kelas 3", "kelas_sd"), (98.0, 103.4, 18.0, 28.0, "Kelas 4", "kelas_sd"),
         (103.4, 108.8, 18.0, 28.0, "Kelas 5", "kelas_sd")],
        [(92.5, 98.0, 18.0, 28.0, "Kelas 6A", "kelas_sd"), (98.0, 103.4, 18.0, 28.0, "Kelas 6B", "kelas_sd"),
         (103.4, 108.8, 18.0, 28.0, "Perpustakaan", "perpus")],
    ]
    multistorey("KG2_SD", 90.0, 16.0, 108.8, 28.0, 3, fh, M["paint_mint"], M["sd_red"], sd_rooms, (90.0, 92.5), 2.0,
                ("SD NEGERI RAWA SARI 04", (99.4, 15.55, 7.0), 0.5, "S"), M["win_warm"], M["win_warm"], roof="gable")
    sma_rooms = [
        [(109.2, 114.6, 18.0, 28.0, "X-1", "kelas_sma"), (114.6, 120.0, 18.0, 28.0, "X-2", "kelas_sma"),
         (120.0, 125.5, 18.0, 28.0, "Ruang Guru", "guru")],
        [(109.2, 114.6, 18.0, 28.0, "XI-1", "kelas_sma"), (114.6, 120.0, 18.0, 28.0, "Lab IPA", "labipa"),
         (120.0, 125.5, 18.0, 28.0, "Lab Komputer", "lab")],
        [(109.2, 114.6, 18.0, 28.0, "XII-1", "kelas_sma"), (114.6, 120.0, 18.0, 28.0, "XII-2", "kelas_sma"),
         (120.0, 125.5, 18.0, 28.0, "Perpustakaan", "perpus")],
    ]
    multistorey("KG2_SMA", 109.2, 16.0, 128.0, 28.0, 3, fh, M["paint_white"], M["sma_grey"], sma_rooms, (125.5, 128.0), 2.0,
                ("SMA NEGERI RAWA SARI", (117.4, 15.55, 7.0), 0.5, "S"), M["win_cool"], M["win_cool"], roof="gable",
                accent=M["blue_sign"])
    for wing, rooms_all in (("SD", sd_rooms), ("SMA", sma_rooms)):
        for f, rooms in enumerate(rooms_all):
            z = 0.15 + f * fh
            for i, (rx0, rx1, ry0, ry1, label, kind) in enumerate(rooms):
                furnish_room(f"KG2_{wing}_F{f+1}_R{i}", rx0 + 0.1, rx1 - 0.1, ry0 + 0.1, ry1 - 0.2, z, fh, kind, i)
                if abs(ry0 - 18.0) < 0.01:
                    text_mesh(f"KG2_{wing}_F{f+1}_R{i}_BoardHead", label.upper(), ((rx0 + rx1) / 2 + 0.9, 17.84, z + 2.5), 0.15,
                              M["sd_red"] if wing == "SD" else M["blue_sign"], ROT_FACE["S"], 0.01)
    # Dinding api pemisah penuh 3 lantai + atap di antara sayap
    d = MB()
    d.box(108.8, 15.6, 0.0, 109.2, 28.4, 11.2, M["plaster"])
    d.finish("KG2_School_Firewall", bevel=0.02)
    # Lapangan upacara, tiang bendera, pagar depan + gerbang, kantin, parkir sepeda
    L = MB()
    L.box(90.0, 1.0, 0.0, 128.0, 14.0, 0.05, M["concrete"])
    for xx in range(92, 128, 4):
        L.box(xx, 1.0, 0.05, xx + 0.06, 14.0, 0.056, existing("KG_WhiteLine"))
    L.box(108.2, 11.6, 0.05, 109.8, 13.2, 0.45, M["stone"])
    L.cyl(109.0, 12.4, 0.45, 9.5, 0.06, M["chrome"], 10, 0.04)
    L.box(109.0, 12.38, 8.4, 110.6, 12.42, 8.95, M["red"])
    L.box(109.0, 12.38, 7.85, 110.6, 12.42, 8.4, M["white"])
    L.box(90.0, 14.0, 0.0, 128.0, 16.0, 0.12, M["terrace"])
    L.finish("KG2_School_Lapangan", bevel=0.01)
    F = MB()
    for xa, xb in ((90.0, 106.8), (111.2, 128.0)):
        F.box(xa, -2.2, 0.0, xb, -1.9, 0.7, M["plaster"])
        n = int((xb - xa) / 0.24)
        for i in range(n):
            x = xa + 0.09 + i * 0.24
            F.box(x, -2.07, 0.7, x + 0.025, -2.03, 1.9, M["iron"])
        F.box(xa, -2.1, 1.9, xb, -2.0, 1.96, M["iron"])
        for x in (xa, xb - 0.5):
            F.box(x, -2.3, 0.0, x + 0.5, -1.8, 2.1, M["plaster"])
    for x in (90.0, 127.7):
        F.box(x, -2.2, 0.0, x + 0.3, 30.0, 1.9, M["plaster"])
    F.box(90.0, 34.0, 0.0, 128.0, 34.3, 1.9, M["plaster"])
    # gerbang bersama
    F.box(106.4, -2.6, 0.0, 107.0, -1.6, 4.2, M["stone"])
    F.box(111.0, -2.6, 0.0, 111.6, -1.6, 4.2, M["stone"])
    F.box(106.2, -2.5, 3.6, 111.8, -1.7, 4.3, M["green_sign"])
    F.finish("KG2_School_Fence")
    text_mesh("KG2_School_SignMain_Gate", "SD - SMA RAWA SARI", (109.0, -2.55, 3.95), 0.34, M["gold"], ROT_FACE["S"], 0.02)
    # kantin
    k = MB()
    k.box(90.4, 29.0, 0.0, 98.0, 34.0, 0.1, M["terrace"])
    for x, y in ((90.5, 29.1), (97.7, 29.1), (90.5, 33.7), (97.7, 33.7)):
        k.box(x, y, 0.1, x + 0.2, y + 0.2, 3.0, M["iron"])
    k.box(90.0, 28.8, 3.0, 98.4, 34.2, 3.08, M["zinc_rust"])
    k.box(91.0, 33.0, 0.1, 97.4, 33.7, 1.0, M["teak"])
    k.box(91.0, 33.0, 1.0, 97.4, 33.8, 1.05, M["paper"])
    k.finish("KG2_School_Kantin", bevel=0.01)
    c = proto("Canteen", build_canteen_set)
    for i in range(3):
        instance(c, f"KG2_School_KantinTable_{i}", (92.0 + i * 2.4, 31.0, 0.1))
    text_mesh("KG2_School_SignSub_Kantin", "KANTIN SEHAT", (94.2, 28.75, 2.6), 0.3, M["sd_red"], ROT_FACE["S"], 0.02)
    # parkir sepeda
    pk = MB()
    pk.box(120.0, 29.0, 0.0, 127.5, 34.0, 0.08, M["concrete"])
    for x, y in ((120.1, 29.1), (127.2, 29.1), (120.1, 33.7), (127.2, 33.7)):
        pk.box(x, y, 0.08, x + 0.15, y + 0.15, 2.5, M["iron"])
    pk.box(119.8, 28.8, 2.5, 127.8, 34.2, 2.56, M["zinc_rust"])
    pk.finish("KG2_School_ParkirSepeda", bevel=0.01)
    bike = proto("Bike", build_bike)
    for i in range(8):
        instance(bike, f"KG2_School_Bike_{i}", (120.8 + (i % 4) * 1.8, 30.2 + (i // 4) * 2.4, 0.08), math.pi / 2)
    for i, (x, y) in enumerate(((91.5, 2.5), (126.5, 2.5), (91.5, 12.5), (126.5, 12.5))):
        instance(proto("Banana", build_banana) if i % 2 else PROTOS.get("Mango") or proto("Banana", build_banana),
                 f"KG2_School_Tree_{i}", (x, y, 0.0))


# ----------------------------------------------------------------------------- rumah warga, bengkel, kelontong, musala
HOUSE_PAINTS = ["paint_cream", "paint_peach", "paint_sage", "paint_sky", "paint_white", "paint_mint", "paint_peach", "paint_cream"]


def house(prefix, x0, x1, ybody0, ybody1, facing, floors, paint, roof_mat, fence_col):
    """Rumah warga 1-2 lantai. facing 'S' (depan di y kecil) atau 'N' (depan di y besar)."""
    M = MATS
    fh = 3.2
    t = 0.18
    yf, yb = (ybody0, ybody1) if facing == "S" else (ybody1, ybody0)
    sgn = -1 if facing == "S" else 1  # arah keluar rumah
    sh = MB(); fr = MB(); gl = MB()
    wall = M[paint]
    for f in range(floors):
        z = 0.15 + f * fh
        zt = z + fh
        # depan: pintu (lantai 1) + 2 jendela
        w = x1 - x0
        ops = []
        if f == 0:
            ops.append((x0 + w * 0.42, x0 + w * 0.42 + 0.9, z, z + 2.1))
        ops.append((x0 + 0.7, x0 + 1.9, z + 0.9, z + 2.2))
        ops.append((x1 - 1.9, x1 - 0.7, z + 0.9, z + 2.2))
        yfa, yfb = (yf, yf + t) if facing == "S" else (yf - t, yf)
        wall_x(sh, yfa, yfb, x0, x1, z, zt, wall, ops)
        for xa, xb, zb, ztt in ops:
            if zb > z + 0.5:
                window_x(fr, gl, (yfa + yfb) / 2, xa, xb, zb, ztt, M, bars=True)
            else:
                door_x(fr, (yfa + yfb) / 2, xa, xb, z, M, open_into=-sgn)
        yba, ybb = (yb - t, yb) if facing == "S" else (yb, yb + t)
        wall_x(sh, yba, ybb, x0, x1, z, zt, wall, [(x0 + 1.0, x0 + 2.0, z + 1.0, z + 2.1)])
        for xs in (x0, x1 - t):
            wall_y(sh, xs, xs + t, min(yf, yb), max(yf, yb), z, zt, wall, [(min(yf, yb) + 2.2, min(yf, yb) + 3.2, z + 1.0, z + 2.1)])
        sh.box(x0, min(yf, yb), z - 0.15, x1, max(yf, yb), z, M["concrete"])
        sh.box(x0 - 0.02, yf - 0.03 if facing == "S" else yf - 0.0, z, x1 + 0.02, yf + 0.03 if facing == "S" else yf + 0.03, z + 0.4, M["plaster"])
        if f == 1:  # balkon kecil lantai 2
            by0, by1 = (yf - 1.0, yf) if facing == "S" else (yf, yf + 1.0)
            sh.box(x0 + 0.5, by0, z - 0.15, x1 - 0.5, by1, z, M["concrete"])
            yr = by0 if facing == "S" else by1
            for i in range(int((x1 - x0 - 1.0) / 0.14)):
                xx = x0 + 0.55 + i * 0.14
                fr.box(xx, yr - 0.02, z, xx + 0.025, yr + 0.02, z + 1.0, M["iron"])
            fr.box(x0 + 0.5, yr - 0.04, z + 1.0, x1 - 0.5, yr + 0.04, z + 1.05, M["iron"])
    ztop = 0.15 + floors * fh
    # atap pelana searah jalan + lisplang + talang
    ov = 0.6
    h = 1.6
    ym = (ybody0 + ybody1) / 2
    for side in (ybody0 - ov, ybody1 + ov):
        sh.hull([(x0 - ov, side, ztop), (x1 + ov, side, ztop), (x1 + ov, ym, ztop + h), (x0 - ov, ym, ztop + h)],
                [(x0 - ov, side, ztop + 0.1), (x1 + ov, side, ztop + 0.1), (x1 + ov, ym, ztop + h + 0.1), (x0 - ov, ym, ztop + h + 0.1)],
                roof_mat)
        sh.box(x0 - ov, side - 0.03, ztop - 0.12, x1 + ov, side + 0.03, ztop + 0.12, M["white"])
        sh.hcyl((x0 + x1) / 2, side + (-0.1 if side < ym else 0.1), ztop - 0.08, x1 - x0 + 2 * ov, 0.06, M["sma_grey"], "x", 8)
    for xg in (x0, x1):
        sh.poly([(xg, ybody0, ztop), (xg, ybody1, ztop), (xg, ym, ztop + h)], wall)
        sh.poly([(xg, ym, ztop + h), (xg, ybody1, ztop), (xg, ybody0, ztop)], wall)
    # teras: lantai keramik + 2 tiang + kanopi seng
    ty0, ty1 = (yf - 1.6, yf) if facing == "S" else (yf, yf + 1.6)
    sh.box(x0, ty0, 0.0, x1, ty1, 0.15, M["terrace"])
    if floors == 1:
        for xx in (x0 + 0.2, x1 - 0.4):
            yy = ty0 + 0.1 if facing == "S" else ty1 - 0.3
            sh.box(xx, yy, 0.15, xx + 0.2, yy + 0.2, 2.8, M["white"])
        sh.hull([(x0 - 0.2, ty0 - 0.2 if facing == "S" else ty1 + 0.2, 2.75), (x1 + 0.2, ty0 - 0.2 if facing == "S" else ty1 + 0.2, 2.75),
                 (x1 + 0.2, yf, 3.05), (x0 - 0.2, yf, 3.05)],
                [(x0 - 0.2, ty0 - 0.2 if facing == "S" else ty1 + 0.2, 2.8), (x1 + 0.2, ty0 - 0.2 if facing == "S" else ty1 + 0.2, 2.8),
                 (x1 + 0.2, yf, 3.1), (x0 - 0.2, yf, 3.1)], M["zinc_rust"])
    # pagar depan + pintu pagar
    yfe = ty0 - 1.2 if facing == "S" else ty1 + 1.2
    fence = M[fence_col]
    sh.box(x0, yfe - 0.1, 0.0, x0 + (x1 - x0) * 0.35, yfe + 0.1, 0.6, M["plaster"])
    sh.box(x0 + (x1 - x0) * 0.65, yfe - 0.1, 0.0, x1, yfe + 0.1, 0.6, M["plaster"])
    for seg0, seg1 in ((x0, x0 + (x1 - x0) * 0.35), (x0 + (x1 - x0) * 0.65, x1)):
        for i in range(int((seg1 - seg0) / 0.16)):
            xx = seg0 + 0.08 + i * 0.16
            fr.box(xx, yfe - 0.02, 0.6, xx + 0.03, yfe + 0.02, 1.4, fence)
        fr.box(seg0, yfe - 0.03, 1.4, seg1, yfe + 0.03, 1.45, fence)
    gx0, gx1 = x0 + (x1 - x0) * 0.35, x0 + (x1 - x0) * 0.65
    for i in range(int((gx1 - gx0) / 0.12)):
        xx = gx0 + 0.06 + i * 0.12
        fr.box(xx, yfe - 0.02, 0.05, xx + 0.025, yfe + 0.02, 1.4, fence)
    fr.box(gx0, yfe - 0.03, 1.35, gx1, yfe + 0.03, 1.4, fence)
    # halaman paving
    sh.box(x0, min(yfe, ty0), -0.02, x1, max(yfe, ty1), 0.04, M["cobble"])
    sh.finish(prefix + "_Body", bevel=0.02)
    fr.finish(prefix + "_Frames")
    g = gl.finish(prefix + "_Win1_Glass")
    # props teras: motor, pot, jemuran
    my = (ty0 + yfe) / 2 if facing == "S" else (ty1 + yfe) / 2
    if random.random() < 0.75:
        instance(proto("Motor", build_motor), prefix + "_Motor", (x0 + 1.6, my, 0.04), random.choice((0.0, math.pi)))
    pot = proto("PotPlant", build_pot_plant)
    for i in range(3):
        instance(pot, f"{prefix}_Pot_{i}", (x1 - 0.5 - i * 0.55, (ty0 + 0.35) if facing == "S" else (ty1 - 0.35), 0.15))
    if random.random() < 0.6:
        instance(proto("Jemuran", build_jemuran), prefix + "_Jemuran", ((x0 + x1) / 2, yb + (0.9 if facing == "S" else -0.9), 0.0))


def build_west_zone():
    M = MATS
    rnd = random.Random(7)
    xs = [(-128.0, -122.0), (-121.0, -115.0), (-114.0, -108.0), (-107.0, -101.5)]
    roofs = [M["roof_moss"], M["roof_tile"], M["zinc_rust"], M["roof_moss"]]
    fences = ["iron", "sd_red", "green_sign", "blue_sign"]
    for i, (a, b) in enumerate(xs):
        house(f"KG2_Rumah_N{i}", a, b, 1.2, 7.6, "S", 2 if i in (0, 2) else 1, HOUSE_PAINTS[i], roofs[i], fences[i])
        house(f"KG2_Rumah_S{i}", a, b, -19.6, -14.4, "N", 2 if i in (1, 3) else 1, HOUSE_PAINTS[4 + i], roofs[(i + 1) % 4], fences[(i + 2) % 4])
    # Bengkel motor (utara jalan, timur kali), terbuka ke selatan
    b = MB()
    b.box(-96.0, -2.0, 0.0, -86.0, 8.0, 0.12, M["concrete"])
    wall_x(b, 7.8, 8.0, -96.0, -86.0, 0.12, 4.2, M["paint_cream"])
    for xs_ in (-96.0, -86.2):
        b.box(xs_, 0.0, 0.12, xs_ + 0.2, 8.0, 4.2, M["paint_cream"])
    for x in (-96.0, -91.1, -86.2):
        b.box(x, -2.0, 0.12, x + 0.2, -1.8, 4.2, M["iron"])
    b.hull([(-96.6, -2.6, 4.1), (-85.4, -2.6, 4.1), (-85.4, 8.4, 4.8), (-96.6, 8.4, 4.8)],
           [(-96.6, -2.6, 4.18), (-85.4, -2.6, 4.18), (-85.4, 8.4, 4.88), (-96.6, 8.4, 4.88)], M["zinc_rust"])
    b.box(-95.5, 6.6, 0.12, -91.0, 7.6, 1.0, M["wood_dark"])  # meja kerja
    b.box(-95.4, 7.7, 1.2, -91.1, 7.75, 2.6, M["iron"])  # papan perkakas
    for i in range(10):
        b.box(-95.2 + i * 0.42, 7.6, 1.5 + (i % 3) * 0.35, -95.1 + i * 0.42, 7.66, 1.8 + (i % 3) * 0.35, M["chrome"])
    b.box(-90.5, 6.8, 0.12, -89.7, 7.6, 1.0, M["sd_red"])  # kompresor
    b.cyl(-90.1, 7.2, 1.0, 1.3, 0.25, M["sd_red"], 10)
    b.box(-96.2, -2.25, 3.2, -85.8, -2.05, 4.1, M["yellow"])
    b.finish("KG2_Bengkel_Body", bevel=0.015)
    text_mesh("KG2_Bengkel_SignMain", "BENGKEL MOTOR JAYA", (-91.0, -2.3, 3.65), 0.42, M["blue_sign"], ROT_FACE["S"], 0.03)
    ts = proto("TireStack", build_tire_stack)
    for i, p in enumerate(((-95.2, 5.4), (-94.4, 5.6), (-87.2, 6.8))):
        instance(ts, f"KG2_Bengkel_Tires_{i}", (p[0], p[1], 0.12))
    for i, p in enumerate(((-87.4, 4.8), (-87.0, 3.9))):
        instance(proto("Drum", build_drum), f"KG2_Bengkel_Drum_{i}", (p[0], p[1], 0.12))
    for i in range(3):
        instance(proto("Motor", build_motor), f"KG2_Bengkel_Motor_{i}", (-94.0 + i * 2.6, 1.5 + (i % 2) * 1.6, 0.12), math.pi / 2)
    # Warung kelontong (selatan jalan, timur kali), menghadap utara
    w = MB()
    w.box(-96.0, -20.0, 0.0, -88.0, -12.0, 0.15, M["terrace"])
    wall_x(w, -20.0, -19.8, -96.0, -88.0, 0.15, 3.4, M["paint_peach"])
    for xs_ in (-96.0, -88.2):
        w.box(xs_, -20.0, 0.15, xs_ + 0.2, -14.0, 3.4, M["paint_peach"])
    wall_x(w, -14.2, -14.0, -96.0, -88.0, 0.15, 3.4, M["paint_peach"], [(-95.2, -90.4, 0.15, 2.6), (-89.6, -88.8, 0.15, 2.2)])
    w.box(-95.2, -14.6, 0.15, -90.4, -14.1, 1.0, M["teak"])  # etalase
    w.box(-95.2, -14.6, 1.0, -90.4, -14.1, 1.05, M["glass"])
    rnd2 = random.Random(5)
    for s in range(4):
        z = 1.2 + s * 0.4
        w.box(-95.6, -19.7, z, -88.6, -19.3, z + 0.03, M["teak"])
        x = -95.5
        while x < -88.8:
            bw = rnd2.uniform(0.12, 0.3)
            w.box(x, -19.65, z + 0.03, x + bw, -19.35, z + rnd2.uniform(0.15, 0.32), M[rnd2.choice(["book0", "book1", "book2", "book3", "yellow", "orange"])])
            x += bw + 0.03
    w.hull([(-96.6, -12.0, 3.0), (-87.4, -12.0, 3.0), (-87.4, -14.0, 3.4), (-96.6, -14.0, 3.4)],
           [(-96.6, -12.0, 3.06), (-87.4, -12.0, 3.06), (-87.4, -14.0, 3.46), (-96.6, -14.0, 3.46)], M["zinc_rust"])
    w.hull([(-96.4, -20.4, 3.4), (-87.6, -20.4, 3.4), (-87.6, -13.8, 4.4), (-96.4, -13.8, 4.4)],
           [(-96.4, -20.4, 3.5), (-87.6, -20.4, 3.5), (-87.6, -13.8, 4.5), (-96.4, -13.8, 4.5)], M["roof_moss"])
    w.box(-96.2, -13.95, 2.6, -87.8, -13.8, 3.3, M["orange"])
    w.finish("KG2_Kelontong_Body", bevel=0.012)
    lb = MB()
    for bx in (-94.5, -91.5, -89.0):
        lb.cyl(bx, -13.3, 2.85, 3.0, 0.08, M["bulb"], 8)
        lb.beam((bx, -13.3, 3.0), (bx, -13.3, 3.25), 0.015, M["cable"])
    lb.finish("KG2_Kelontong_LampBulb")
    text_mesh("KG2_Kelontong_SignMain", "WARUNG KELONTONG BU SRI", (-92.0, -13.75, 2.95), 0.3, M["white"], ROT_FACE["N"], 0.02)
    for i in range(5):
        instance(proto("Galon", build_galon), f"KG2_Kelontong_Galon_{i}", (-89.0 + (i % 3) * 0.3, -13.0 + (i // 3) * 0.3, 0.15))
    for i in range(4):
        instance(proto("Lpg", build_lpg), f"KG2_Kelontong_Lpg_{i}", (-95.6 + i * 0.3, -12.6, 0.15))
    # Musala + taman
    m = MB()
    m.box(-128.0, 22.0, 0.0, -104.0, 34.0, 0.05, M["grass"])
    m.box(-126.0, 27.0, 0.0, -118.0, 33.0, 0.4, M["terrace"])
    wall_x(m, 27.6, 27.8, -125.6, -118.4, 0.4, 3.6, M["paint_white"], [(-122.5, -121.5, 0.4, 2.5), (-125.0, -123.8, 1.3, 2.6), (-120.2, -119.0, 1.3, 2.6)])
    wall_x(m, 32.4, 32.6, -125.6, -118.4, 0.4, 3.6, M["paint_white"])
    for xs_ in (-125.6, -118.6):
        m.box(xs_, 27.6, 0.4, xs_ + 0.2, 32.6, 3.6, M["paint_white"])
    m.hull([(-126.2, 27.0, 3.6), (-117.8, 27.0, 3.6), (-117.8, 33.2, 3.6), (-126.2, 33.2, 3.6)],
           [(-122.6, 29.6, 6.0), (-121.4, 29.6, 6.0), (-121.4, 30.6, 6.0), (-122.6, 30.6, 6.0)], M["green_sign"])
    m.cyl(-122.0, 30.1, 6.0, 7.2, 0.5, M["gold"], 10, 0.05)
    # jalan setapak + bangku taman
    m.box(-114.0, 19.6, 0.0, -112.6, 27.0, 0.08, M["cobble"])
    m.box(-122.6, 26.4, 0.0, -112.6, 27.0, 0.08, M["cobble"])
    for x in (-110.0, -107.0):
        m.box(x, 24.0, 0.42, x + 1.6, 24.4, 0.47, M["teak"])
        m.box(x + 0.1, 24.1, 0.0, x + 0.2, 24.3, 0.42, M["iron"])
        m.box(x + 1.4, 24.1, 0.0, x + 1.5, 24.3, 0.42, M["iron"])
    m.finish("KG2_Musala_Taman", bevel=0.015)
    text_mesh("KG2_Musala_SignMain", "MUSALA AL-IKHLAS", (-122.0, 27.55, 3.2), 0.32, M["green_sign"], ROT_FACE["S"], 0.02)
    ban = proto("Banana", build_banana)
    for i, p in enumerate(((-127.0, 21.0), (-105.0, 33.0), (-108.0, 21.5), (-99.0, 10.0), (-99.0, -20.0), (-84.0, 12.0))):
        instance(ban, f"KG2_West_Banana_{i}", (p[0], p[1], 0.0))
    tr = PROTOS.get("Mango")
    if tr:
        for i, p in enumerate(((-116.0, 31.0), (-110.0, 30.0), (-130.0, -6.0), (-104.0, -24.0), (-125.0, -26.0))):
            instance(tr, f"KG2_West_Mango_{i}", (p[0], p[1], 0.0))
    # papan RT/RW + spanduk + tong sampah
    s = MB()
    s.box(-102.0, -2.6, 0.0, -101.9, -2.5, 2.4, M["iron"])
    s.box(-103.0, -2.62, 1.6, -101.9, -2.58, 2.3, M["green_sign"])
    s.finish("KG2_West_PapanRT", bevel=0.0)
    text_mesh("KG2_West_SignSub_RT", "RT 04 / RW 07", (-102.45, -2.64, 1.95), 0.14, M["white"], ROT_FACE["S"], 0.005)
    tb = proto("Trash", build_trash)
    for i, x in enumerate((-126.0, -112.0, -103.0, -89.0)):
        instance(tb, f"KG2_West_Trash_{i}", (x, -2.6, 0.1))


# ----------------------------------------------------------------------------- kepadatan: tiang listrik, kabel, lampu, polisi tidur
def catenary(mb, p0, p1, sag, w, mat, seg=8):
    p0, p1 = Vector(p0), Vector(p1)
    pts = []
    for i in range(seg + 1):
        t = i / seg
        p = p0.lerp(p1, t)
        p.z -= sag * 4 * t * (1 - t)
        pts.append(p)
    for a, b in zip(pts, pts[1:]):
        mb.beam(a, b, w, mat)


def build_utilities():
    M = MATS
    pole = proto("PowerPole", build_power_pole)
    lines = []  # daftar deret tiang
    lines.append([(x, 20.2) for x in range(-130, 86, 24)])          # Jl. Kampung 2 sisi utara
    lines.append([(x, -2.4) for x in range(-130, -84, 22)] + [(-82.0, -2.4)])  # jalan utama barat
    lines.append([(x, -2.4) for x in range(90, 133, 21)])           # jalan utama timur
    lines.append([(89.4, y) for y in range(2, 37, 16)])              # Jl. Pendidikan
    lines.append([(-16.0, y) for y in (-2.0, 6.0, 14.0)])            # Gang Gapura
    lines.append([(28.2, y) for y in (-2.0, 6.0, 14.0)])             # Gang Timur
    cab = MB()
    k = 0
    for line in lines:
        ew = abs(line[-1][1] - line[0][1]) < 1e-6  # deret timur-barat: travers menghadap utara-selatan
        for i, (x, y) in enumerate(line):
            instance(pole, f"KG2_P5_PowerPole_{k}", (x, y, 0.0), math.pi / 2 if ew else 0.0)
            k += 1
        for (xa, ya), (xb, yb) in zip(line, line[1:]):
            for j, off in enumerate((-0.75, 0.0, 0.75)):
                if ew:
                    p0, p1 = (xa, ya + off, 8.55), (xb, yb + off, 8.55)
                else:
                    p0, p1 = (xa + off, ya, 8.55), (xb + off, yb, 8.55)
                catenary(cab, p0, p1, 0.6 + 0.1 * j, 0.025, M["cable"])
            # kabel sambungan rumah yang menjuntai (acak)
            if random.random() < 0.5:
                catenary(cab, (xa, ya, 8.0), (xa + 3.0, ya - 4.5 if ya > 0 else ya + 4.5, 4.0), 0.5, 0.02, M["cable"], 6)
    cab.finish("KG2_P5_Cable_All")
    # lampu gang + lampu jalan tambahan (bohlam terpisah agar menyala di sore/malam)
    lp = proto("LampPost", build_lamp_post)
    bulbs = MB()
    spots = [(-18.2, 3.0), (-18.2, 11.0), (25.5, 3.0), (25.5, 11.0)]
    spots += [(x, 20.0) for x in range(-126, 86, 16)]
    spots += [(x, -2.6) for x in range(-128, -84, 14)] + [(x, -2.6) for x in range(92, 132, 14)]
    spots += [(89.6, y) for y in (6, 14, 24)]
    for i, (x, y) in enumerate(spots):
        instance(lp, f"KG2_LampPost_{i}", (x, y, 0.0))
        bulbs.box(x - 0.1, y - 0.8, 4.12, x + 0.1, y - 0.6, 4.2, M["bulb"])
    bulbs.finish("KG2_StreetBulb_All")
    # polisi tidur
    sb = proto("SpeedBump", build_speed_bump)
    for i, x in enumerate((-110.0, -60.0, -20.0, 30.0, 70.0)):
        instance(sb, f"KG2_PolisiTidur_JK2_{i}", (x, 17.5, 0.0))
    for i, (x, y) in enumerate(((-18.15, 2.0), (25.5, 2.0), (86.8, 8.0))):
        instance(sb, f"KG2_PolisiTidur_Gang_{i}", (x, y, 0.0), math.pi / 2)
    # paving gang + got
    g = MB()
    for xa, xb in ((-19.8, -16.5), (23.4, 27.6)):
        g.box(xa, -3.6, 0.0, xb, 15.35, 0.03, M["cobble"])
        g.box(xa - 0.35, -3.6, -0.3, xa, 15.35, 0.06, M["plaster"])
        g.box(xb, -3.6, -0.3, xb + 0.35, 15.35, 0.06, M["plaster"])
    g.finish("KG2_Gang_Paving", bevel=0.01)
    # spanduk antar tiang di gang
    sp = MB()
    for x0_, x1_, y in ((-19.6, -16.7, 13.0), (23.6, 27.4, 13.0)):
        sp.box(x0_, y - 0.01, 3.2, x1_, y + 0.01, 3.9, M["yellow"])
    sp.finish("KG2_Gang_Spanduk")
    text_mesh("KG2_Gang_SignSub_Spanduk1", "KERJA BAKTI MINGGU PAGI", (-18.15, 12.98, 3.55), 0.17, M["sd_red"], ROT_FACE["S"], 0.002)
    text_mesh("KG2_Gang_SignSub_Spanduk2", "HATI-HATI ANAK SEKOLAH", (25.5, 12.98, 3.55), 0.17, M["blue_sign"], ROT_FACE["S"], 0.002)


def copy_traffic_lights():
    src = [o for o in COL.all_objects if o.name.startswith("KG_P6_TrafficLight_West_")]
    if not src:
        log("traffic light sumber tidak ditemukan")
        return
    pivot = Vector((-1.6, -9.45, 0.0))
    for tag, target, rot in (("PendS", Vector((84.2, -9.6, 0.0)), 0.0), ("PendN", Vector((89.4, -3.3, 0.0)), math.pi)):
        R = Matrix.Rotation(rot, 4, "Z")
        for o in src:
            n = o.copy()
            n.data = o.data
            n.name = o.name.replace("KG_P6_TrafficLight_West_", f"KG2_P6_TrafficLight_{tag}_")
            rel = o.matrix_world.translation - pivot
            n.matrix_world = Matrix.Translation(target + R @ rel) @ R @ o.matrix_world.to_3x3().to_4x4()
            COL.objects.link(n)


def make_mango_proto():
    """Gabungkan pohon peneduh yang sudah ada (mahkota + batang) jadi satu mesh untuk dipakai ulang."""
    crown = trunk = None
    for i in range(40):
        crown = bpy.data.objects.get(f"KG_TreeCrownMain_{i:02d}")
        trunk = bpy.data.objects.get(f"KG_TreeTrunk_{i:02d}")
        if crown and trunk:
            break
    if not (crown and trunk):
        return
    bm = bmesh.new()
    mats = []
    base = Vector((trunk.matrix_world.translation.x, trunk.matrix_world.translation.y, 0.0))
    for o in (trunk, crown):
        tmp = bmesh.new()
        tmp.from_mesh(o.data)
        tmp.transform(Matrix.Translation(-base) @ o.matrix_world)
        offs = []
        for m in o.data.materials:
            if m not in mats:
                mats.append(m)
            offs.append(mats.index(m))
        for f in tmp.faces:
            f.material_index = offs[f.material_index] if offs else 0
        me_tmp = bpy.data.meshes.new("KG2_tmp")
        tmp.to_mesh(me_tmp)
        tmp.free()
        bm.from_mesh(me_tmp)
        bpy.data.meshes.remove(me_tmp)
    me = bpy.data.meshes.new("KG2_Proto_Mango")
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new("KG2_Proto_Mango", me)
    ob.location = (0, 0, -50)
    ob.hide_render = ob.hide_viewport = True
    COL.objects.link(ob)
    PROTOS["Mango"] = ob


def build_greenery_far():
    """Isi tepi dunia baru (selatan & utara) dengan pohon mangga/pisang dan rumah latar sederhana."""
    M = MATS
    rnd = random.Random(21)

    def build_far_tree(mb):  # pohon latar low-poly (~60 face) agar dunia luas tetap ringan
        mb.cyl(0, 0, 0, 2.2, 0.22, MATS["trunk"], 6, 0.16)
        mb.cyl(0, 0, 1.8, 3.6, 2.2, MATS["foliage"], 8, 2.6)
        mb.cyl(0, 0, 3.6, 5.4, 2.6, MATS["foliage"], 8, 1.2)
        mb.cyl(0, 0, 5.4, 6.2, 1.2, MATS["foliage"], 8, 0.2)
        return 0.0

    tr = proto("FarTree", build_far_tree)
    ban = PROTOS.get("Banana")
    k = 0
    for _ in range(70):
        x = rnd.uniform(-130, 130)
        y = rnd.choice([rnd.uniform(-98, -40), rnd.uniform(70, 118)])
        if -101 < x < -96:
            continue
        p = tr if (tr and rnd.random() < 0.6) else ban
        if p is None:
            continue
        o = instance(p, f"KG2_Far_Tree_{k}", (x, y, -0.06), rnd.uniform(0, 6.28))
        s = rnd.uniform(0.8, 1.25)
        o.scale = (s, s, s)
        k += 1
    bg = MB()
    for i in range(24):
        x = -125 + i * 10.5 + rnd.uniform(-1, 1)
        if -103 < x < -94:
            continue
        y = rnd.uniform(-58, -45)
        w, d, h = rnd.uniform(5, 7), rnd.uniform(5, 7), rnd.choice((3.2, 6.4))
        bg.box(x, y, 0, x + w, y + d, h, M[rnd.choice(["paint_cream", "paint_peach", "paint_sage", "paint_white"])])
        bg.hull([(x - 0.4, y - 0.4, h), (x + w + 0.4, y - 0.4, h), (x + w + 0.4, y + d + 0.4, h), (x - 0.4, y + d + 0.4, h)],
                [(x + 0.4, y + d / 2 - 0.1, h + 1.4), (x + w - 0.4, y + d / 2 - 0.1, h + 1.4), (x + w - 0.4, y + d / 2 + 0.1, h + 1.4), (x + 0.4, y + d / 2 + 0.1, h + 1.4)],
                rnd.choice([M["roof_moss"], M["roof_tile"], M["zinc_rust"]]))
    bg.finish("KG2_Far_HousesSouth", bevel=0.0)


# ----------------------------------------------------------------------------- set mandiri KampusSet (kampus.glb)
def build_kampus_standalone():
    """Lab Komputer FIK versi set mandiri (`<KampusSet />`): ruang 8,8 x 7,8 m, sisi depan (selatan) terbuka
    untuk kamera. Papan tulis di dinding utara (Three.js -z), cocok dengan `KAMPUS_SPOTS` yang sudah ada."""
    global COL
    main_col = COL
    COL = bpy.data.collections["KampusSet"]
    old = [o for o in COL.all_objects if o and o.name.startswith("KP_")]
    for o in old:
        remove_obj(o)
    log(f"KampusSet lama dihapus: {len(old)} objek")
    M = MATS
    x0, x1, y0, y1 = -4.4, 4.4, -3.9, 3.9
    z, zt = 0.0, 3.4
    sh, fr, gl = MB(), MB(), MB()
    sh.box(x0, y0, -0.1, x1, y1, 0.0, M["concrete"])
    fl = MB()
    fl.box(x0 + 0.2, y0, 0.0, x1 - 0.2, y1 - 0.2, 0.01, M["floor_tile"])
    fl.box(-0.9, y0, 0.01, 0.9, y1 - 0.3, 0.012, M["blue_sign"])  # karpet lorong
    fl.finish("KP2_Floor")
    wall_x(sh, y1 - 0.2, y1, x0, x1, z, zt, M["paint_white"])
    sh.box(x0, y1 - 0.24, z, x1, y1 - 0.2, 1.05, M["fik_blue"])  # lis dinding bawah biru
    wall_y(sh, x0, x0 + 0.2, y0, y1, z, zt, M["paint_white"], [(-2.6, -1.2, 1.0, 2.4), (-0.6, 0.8, 1.0, 2.4)])
    for ya, yb in ((-2.6, -1.2), (-0.6, 0.8)):
        window_y(fr, gl, x0 + 0.1, ya, yb, 1.0, 2.4, M)
    wall_y(sh, x1 - 0.2, x1, y0, y1, z, zt, M["paint_white"], [(1.6, 2.55, z, z + 2.1)])
    fr.box(x1 - 0.25, 1.5, 0.0, x1 + 0.05, 1.6, 2.2, M["wood_dark"])
    fr.box(x1 - 0.25, 2.55, 0.0, x1 + 0.05, 2.65, 2.2, M["wood_dark"])
    fr.box(x1 - 0.25, 1.5, 2.1, x1 + 0.05, 2.65, 2.2, M["wood_dark"])
    fr.box(x1 - 1.0, 1.58, 0.01, x1 - 0.2, 1.62, 2.08, M["teak"])  # daun pintu terbuka ke dalam
    for ws in (x0 + 0.2, x1 - 0.2):
        sh.box(ws - 0.02, y0, z, ws + 0.02, y1, 0.35, M["stone"])
    sh.finish("KP2_Shell", bevel=0.02)
    fr.finish("KP2_Frames")
    g = gl.finish("KP2_WinGlass")
    c = MB()
    c.box(x0, y0, zt, x1, y1, zt + 0.1, M["white"])
    c.finish("KP2_Ceiling")
    # papan tulis + flowchart, lambang, jam, AC, proyektor + layar
    wb = MB()
    wb.box(-1.9, y1 - 0.26, 1.25, 1.9, y1 - 0.2, 2.55, M["chrome"])
    wb.box(-1.85, y1 - 0.27, 1.3, 1.85, y1 - 0.26, 2.5, M["whiteboard"])
    wb.box(-1.9, y1 - 0.38, 1.23, 1.9, y1 - 0.26, 1.27, M["chrome"])
    for (bx, bz, col) in ((-1.2, 2.25, "blue_sign"), (-1.2, 1.85, "green_sign"), (-1.2, 1.45, "blue_sign"), (0.2, 1.85, "sd_red"), (1.3, 1.85, "green_sign")):
        wb.box(bx - 0.32, y1 - 0.28, bz - 0.11, bx + 0.32, y1 - 0.275, bz + 0.11, M[col])
    for (ax0, az0, ax1, az1) in ((-1.2, 2.14, -1.2, 1.96), (-1.2, 1.74, -1.2, 1.56), (-0.88, 1.85, -0.12, 1.85), (0.52, 1.85, 0.98, 1.85)):
        wb.box(min(ax0, ax1) - 0.012, y1 - 0.281, min(az0, az1) - 0.012, max(ax0, ax1) + 0.012, y1 - 0.278, max(az0, az1) + 0.012, M["black"])
    wb.box(-0.22, y1 - 0.23, 2.56, 0.22, y1 - 0.2, 2.9, M["gold"])
    wb.box(-0.19, y1 - 0.24, 2.59, 0.19, y1 - 0.23, 2.87, M["fik_blue"])
    wb.box(-0.35, -0.2, zt - 0.3, 0.35, 0.25, zt - 0.12, M["white"])  # proyektor
    wb.box(-0.05, 0.0, zt - 0.12, 0.05, 0.08, zt, M["iron"])
    wb.finish("KP2_Whiteboard", bevel=0.005)
    for i, (txt, bx, bz) in enumerate((("MULAI", -1.2, 2.25), ("INPUT", -1.2, 1.85), ("SELESAI", -1.2, 1.45), ("PROSES", 0.2, 1.85), ("OUTPUT", 1.3, 1.85))):
        text_mesh(f"KP2_BoardHead_{i}", txt, (bx, y1 - 0.29, bz), 0.09, M["white"], ROT_FACE["S"], 0.002)
    text_mesh("KP2_CrestTxt", "FIK", (0.0, y1 - 0.25, 2.72), 0.16, M["gold"], ROT_FACE["S"], 0.01)
    text_mesh("KP2_SignMain_Title", "LAB KOMPUTER FIK 2.1", (0.0, y1 - 0.22, 3.12), 0.2, M["fik_blue"], ROT_FACE["S"], 0.01)
    instance(proto("Clock", build_clock), "KP2_Clock", (-2.8, y1 - 0.2, 2.6))
    instance(proto("AC", build_ac), "KP2_AC", (2.9, y1 - 0.35, 2.95))
    instance(proto("Flag", build_flag_small), "KP2_Flag", (2.25, y1 - 0.2, 1.9))
    lamp = proto("CeilLamp", build_ceiling_lamp)
    for i, (lx, ly) in enumerate(((-2.0, -1.5), (2.0, -1.5), (-2.0, 1.6), (2.0, 1.6))):
        instance(lamp, f"KP2_LedPanel_{i}", (lx, ly, zt - 0.02))
    # 4 meja PC lab (masing-masing 2 monitor) di kiri-kanan lorong + kursi menghadap papan
    pc = proto("PCDesk", build_pc_desk)
    ch = proto("OfficeChair", build_office_chair)
    k = 0
    for sx in (-1.75, 1.75):
        for sy in (-2.6, -1.0):
            instance(pc, f"KP2_Lab_PC_{k}", (sx, sy, 0.0))
            for d in (-0.3, 0.3):
                instance(ch, f"KP2_Lab_Chair_{k}{'a' if d < 0 else 'b'}", (sx + d, sy - 0.62, 0.0), math.pi)
            k += 1
    instance(proto("TeacherDesk", build_teacher_desk), "KP2_LectDesk", (2.75, 2.55, 0.0))
    instance(ch, "KP2_LectChair", (2.75, 3.25, 0.0))
    instance(proto("PotPlant", build_pot_plant), "KP2_Pot", (-3.9, 3.3, 0.0))
    instance(proto("Bookshelf", build_bookshelf), "KP2_Shelf", (-2.9, 3.3, 0.0))
    COL = main_col


# ----------------------------------------------------------------------------- main
def main():
    global MATS
    clean_previous()
    fix_existing()
    MATS = setup_materials()
    make_mango_proto()
    build_ground_roads()
    copy_traffic_lights()
    build_fik()
    build_school()
    build_west_zone()
    build_utilities()
    build_greenery_far()
    build_kampus_standalone()
    n_obj = len(COL.all_objects)
    faces = sum(len(o.data.polygons) for o in COL.all_objects if o.type == "MESH" and not o.hide_render)
    log(f"KampungSet: {n_obj} objek, ~{faces} face (sebelum bevel)")
    groups = {}
    for o in COL.all_objects:
        if o.type == "MESH" and o.name.startswith("KG2_") and not o.hide_render:
            key = "_".join(o.name.split("_")[:2]) + ("_" + o.data.name.split("_")[2] if o.data.name.startswith("KG2_Proto_") else "")
            groups[key] = groups.get(key, 0) + len(o.data.polygons)
    for key, n in sorted(groups.items(), key=lambda kv: -kv[1])[:15]:
        log(f"  {key}: {n}")
    if SAVE:
        bpy.ops.wm.save_mainfile()
        log("disimpan:", bpy.data.filepath)
    for line in LOG:
        print("KG2LOG", line)


MATS = {}
main()
