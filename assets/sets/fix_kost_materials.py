"""Perbaikan material Kost: poster dan kursi tidak lagi memakai material bertekstur dinding/seng.

  blender --background assets/sets/blend/bang_utoh_sets.blend --python assets/sets/fix_kost_materials.py
  blender --background assets/sets/blend/bang_utoh_sets.blend --python assets/sets/export_kampung_glb.py -- KostSet kost

- `KS_PosterBg` memakai `KS_WallAccent` (tekstur brick_plaster_wall) -> `KS_PosterPaper` (kertas polos biru tua).
- `KS_Chair*` yang memakai `KS_Iron` (tekstur corrugated_zinc) -> `KS_ChairMetal` (logam gelap polos).

Hanya slot objek-objek itu yang diganti; `KS_WallAccent` dan `KS_Iron` sendiri tidak diubah. Mesh Kost dipakai
bersama oleh koleksi `KostSet` (`KS_*`) dan salinan interior Kost di `KampungSet` (`KG_KS_*`), jadi keduanya ikut.
Idempoten: material dibuat sekali (dicari berdasarkan nama) dan penggantian hanya terjadi pada slot yang masih salah.
`build_kampung_v2.py` memanggil `fix_objects()` dari `fix_existing()` untuk objek `KG_KS_*`.
"""
import sys

import bpy

POSTER_MAT = "KS_PosterPaper"
CHAIR_MAT = "KS_ChairMetal"


def plain_mat(name, rgb, rough, metal):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*rgb, 1.0)
        bs.inputs["Roughness"].default_value = rough
        bs.inputs["Metallic"].default_value = metal
        m.diffuse_color = (*rgb, 1.0)
    return m


def fix_objects(objects):
    """Ganti material poster/kursi pada objek `KS_*` atau `KG_KS_*`. Mengembalikan daftar objek yang diubah."""
    poster = plain_mat(POSTER_MAT, (0.035, 0.065, 0.15), 0.62, 0.0)
    chair = plain_mat(CHAIR_MAT, (0.03, 0.033, 0.04), 0.42, 0.6)
    changed = []
    for o in objects:
        if o.type != "MESH":
            continue
        base = o.name[3:] if o.name.startswith("KG_KS_") else o.name
        for slot in o.material_slots:
            cur = slot.material.name if slot.material else None
            if base == "KS_PosterBg" and cur == "KS_WallAccent":
                slot.material = poster
                changed.append(o.name)
            elif base.startswith("KS_Chair") and cur == "KS_Iron":
                slot.material = chair
                changed.append(o.name)
    return changed


def main():
    objs = list(bpy.data.collections["KostSet"].all_objects)
    objs += [o for o in bpy.data.collections["KampungSet"].all_objects if o.name.startswith("KG_KS_")]
    changed = fix_objects(objs)
    print("KSFIX diubah:", len(changed), changed)
    if "--no-save" not in sys.argv:
        bpy.ops.wm.save_mainfile()
        print("KSFIX disimpan:", bpy.data.filepath)


if __name__ == "__main__":
    main()
