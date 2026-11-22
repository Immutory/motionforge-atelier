"""Ekspor satu koleksi dari bang_utoh_sets.blend ke public/sets/<nama>.glb.

  blender --background assets/sets/blend/bang_utoh_sets.blend --python assets/sets/export_kampung_glb.py
  blender --background ... --python assets/sets/export_kampung_glb.py -- KampusSet kampus
"""
import sys
from pathlib import Path

import bpy

ROOT = Path(bpy.path.abspath("//")).parents[2]
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
COLLECTION = ARGS[0] if ARGS else "KampungSet"
OUT = ROOT / "public" / "sets" / f"{ARGS[1] if len(ARGS) > 1 else 'kampung'}.glb"


def find_layer(lc, name):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        hit = find_layer(ch, name)
        if hit:
            return hit
    return None


lc = find_layer(bpy.context.view_layer.layer_collection, COLLECTION)
# Koleksi set lain sering disembunyikan (ikon mata) karena semuanya berada di sekitar titik asal.
lc.exclude = False
lc.hide_viewport = False
lc.collection.hide_viewport = False
for o in lc.collection.all_objects:
    if o and not o.name.startswith("KG2_Proto_"):
        o.hide_set(False)
        o.hide_viewport = False
bpy.context.view_layer.active_layer_collection = lc
assert bpy.context.view_layer.active_layer_collection.collection.name == COLLECTION
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
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
print("KG2EXPORT", OUT, round(OUT.stat().st_size / 1e6, 2), "MB")
