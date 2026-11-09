#!/usr/bin/env python3
"""
Split the shipped A-JET EC145 GLB into a static airframe plus independent
main-rotor and tail-rotor assemblies.

Why this exists
---------------
public/models/ajet-ec145.glb is a single mesh node with 23 material
primitives.  The four main blades and the tail blades are separate *loose
parts* inside that mesh, but they are not separate nodes, so they cannot be
rotated in three.js.  This script recovers the loose parts, parents them to
pivot empties, and re-exports with Draco compression.  The aircraft geometry
and materials are not modified.

Run (Blender 4.2+ / 5.x):
    blender --background --python scripts/blender/split-ec145-rotors.py -- \
        --input public/models/ajet-ec145.glb \
        --output public/models/ajet-ec145-hero.glb

Coordinates
-----------
Blender after glTF import is Z-up.  The shipped GLB is Y-up, nose toward -Z.
Pivots measured from the shipped GLB loose parts (Blender space):
    main rotor axis : (0.000, -0.450, 2.5875) m
    tail rotor axis : (-0.360, -7.000, 2.3600) m
Exported with +Y up, these become:
    main rotor axis : (0.000, 2.5875, 0.450) m
    tail rotor axis : (-0.360, 2.3600, 7.000) m
The main rotor spins about +Y; the tail rotor spins about -X.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from collections import defaultdict

import bpy
import bmesh
from mathutils import Vector


# Blender-space pivot positions measured from the shipped GLB.
MAIN_PIVOT = Vector((0.000, -0.450, 2.5875))
TAIL_PIVOT = Vector((-0.360, -7.000, 2.3600))


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="source GLB")
    p.add_argument("--output", required=True, help="destination GLB")
    p.add_argument("--blend-out", default="", help="optional .blend for inspection")
    return p.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def import_aircraft(path: str):
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"expected exactly one imported mesh, found {len(meshes)}")
    aircraft = meshes[0]
    # Drop any imported empties / cameras / lights, keep the aircraft only.
    for o in list(bpy.context.scene.objects):
        if o is not aircraft:
            bpy.data.objects.remove(o, do_unlink=True)
    return aircraft


def component_table(obj) -> list[dict]:
    """Connected components via mesh edges, with bbox, material and counts."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    parent = list(range(len(bm.verts)))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for e in bm.edges:
        union(e.verts[0].index, e.verts[1].index)

    verts_by_root: dict[int, list[int]] = defaultdict(list)
    for v in bm.verts:
        verts_by_root[find(v.index)].append(v.index)

    faces_by_root: dict[int, list[int]] = defaultdict(list)
    for f in bm.faces:
        faces_by_root[find(f.verts[0].index)].append(f.index)

    mats = [m.name if m else "" for m in obj.data.materials]
    components = []
    for root, vidx in verts_by_root.items():
        cos = [bm.verts[i].co for i in vidx]
        mn = Vector((min(c.x for c in cos), min(c.y for c in cos), min(c.z for c in cos)))
        mx = Vector((max(c.x for c in cos), max(c.y for c in cos), max(c.z for c in cos)))
        ctr = (mn + mx) * 0.5
        mat_counts: dict[str, int] = defaultdict(int)
        for fi in faces_by_root.get(root, []):
            mat_counts[mats[bm.faces[fi].material_index]] += 1
        components.append(
            {
                "root": root,
                "verts": vidx,
                "vert_count": len(vidx),
                "face_count": len(faces_by_root.get(root, [])),
                "min": mn,
                "max": mx,
                "center": ctr,
                "materials": sorted(mat_counts),
            }
        )
    bm.free()
    return components


def radial_xy(center: Vector, axis: Vector) -> tuple[float, float]:
    r_min = math.hypot(center.x - axis.x, center.y - axis.y)
    return r_min, r_min


def classify(components: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {
        "main_blades": [],
        "main_hub": [],
        "tail_blades": [],
        "tail_hub": [],
    }
    for c in components:
        mn, mx, ctr = c["min"], c["max"], c["center"]
        mats = " ".join(c["materials"])
        radius = math.hypot(ctr.x - MAIN_PIVOT.x, ctr.y - MAIN_PIVOT.y)
        radius_max = max(
            math.hypot(x - MAIN_PIVOT.x, y - MAIN_PIVOT.y)
            for x in (mn.x, mx.x)
            for y in (mn.y, mx.y)
        )

        # Main blades: thin, in the rotor plane, outboard of the hub.
        if (
            mn.z > 2.45
            and mx.z < 2.75
            and radius_max > 1.0
            and radius_max < 5.8
            and ctr.y > -6.0
        ):
            groups["main_blades"].append(c)
            continue

        # Main hub / grips / pitch links / mast top: tight cylinder on axis.
        if (
            mn.z >= 2.45
            and mx.z <= 2.90
            and radius_max < 1.1
            and ctr.y > -2.0
        ):
            groups["main_hub"].append(c)
            continue

        # Tail rotor lives on the left side of the fin.
        if ctr.x < -0.30 and -7.40 < ctr.y < -6.60 and 2.00 < ctr.z < 2.75:
            if "Gloss_Black_Paint" in mats and c["vert_count"] > 200:
                groups["tail_blades"].append(c)
                continue
            if ("Brushed_Titanium" in mats or "Polished_Stainless" in mats) and "Oxidized_Metal" not in mats:
                groups["tail_hub"].append(c)
                continue
    return groups


def duplicate_with_components(obj, components: list[dict], name: str):
    """Copy obj, keep only the listed components, return the new object."""
    keep = set()
    for c in components:
        keep.update(c["verts"])

    new_obj = obj.copy()
    new_obj.data = obj.data.copy()
    new_obj.name = name
    new_obj.data.name = name + "_mesh"
    bpy.context.collection.objects.link(new_obj)

    bm = bmesh.new()
    bm.from_mesh(new_obj.data)
    bm.verts.ensure_lookup_table()
    doomed = [v for v in bm.verts if v.index not in keep]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(new_obj.data)
    bm.free()
    new_obj.data.update()
    return new_obj


def remove_components(obj, components: list[dict]) -> None:
    doomed_idx = set()
    for c in components:
        doomed_idx.update(c["verts"])
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    doomed = [v for v in bm.verts if v.index in doomed_idx]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def set_origin_to(obj, pivot: Vector) -> None:
    """Move the origin to pivot without moving the object in world space."""
    offset = pivot - obj.location
    for v in obj.data.vertices:
        v.co -= offset
    obj.location = pivot


def parent_keep_transform(child, parent) -> None:
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = world


def main() -> None:
    args = parse_args()
    in_path = os.path.abspath(args.input)
    out_path = os.path.abspath(args.output)
    if not os.path.isfile(in_path):
        raise FileNotFoundError(in_path)

    reset_scene()
    aircraft = import_aircraft(in_path)
    print(f"Imported {aircraft.name}: {len(aircraft.data.vertices)} verts, {len(aircraft.data.polygons)} faces")

    components = component_table(aircraft)
    print(f"Loose components: {len(components)}")
    groups = classify(components)
    for name, comps in groups.items():
        print(f"  {name}: {len(comps)} components, {sum(c['vert_count'] for c in comps)} verts")

    if len(groups["main_blades"]) != 4:
        raise RuntimeError(f"expected 4 main blades, found {len(groups['main_blades'])}")
    if len(groups["tail_blades"]) != 2:
        raise RuntimeError(f"expected 2 tail blades, found {len(groups['tail_blades'])}")

    # Build the four rotor objects from the source mesh, then remove their
    # geometry from the static airframe.
    rotor_specs = [
        ("MainRotor_Blades", "main_blades", MAIN_PIVOT),
        ("MainRotor_Hub", "main_hub", MAIN_PIVOT),
        ("TailRotor_Blades", "tail_blades", TAIL_PIVOT),
        ("TailRotor_Hub", "tail_hub", TAIL_PIVOT),
    ]
    rotor_objects = []
    for obj_name, group_name, pivot in rotor_specs:
        comps = groups[group_name]
        if not comps:
            continue
        robj = duplicate_with_components(aircraft, comps, obj_name)
        set_origin_to(robj, pivot)
        rotor_objects.append((robj, pivot))
        print(f"Created {obj_name}: {len(robj.data.vertices)} verts at pivot {tuple(pivot)}")

    all_rotor_comps = (
        groups["main_blades"] + groups["main_hub"] + groups["tail_blades"] + groups["tail_hub"]
    )
    remove_components(aircraft, all_rotor_comps)
    aircraft.name = "EC145_Static"
    aircraft.data.name = "EC145_Static_mesh"
    aircraft.location = (0, 0, 0)
    print(f"Static airframe: {len(aircraft.data.vertices)} verts, {len(aircraft.data.polygons)} faces")

    # Pivot empties.
    main_empty = bpy.data.objects.new("MainRotor_Pivot", None)
    main_empty.empty_display_type = "PLAIN_AXES"
    main_empty.empty_display_size = 0.25
    main_empty.location = MAIN_PIVOT
    bpy.context.collection.objects.link(main_empty)

    tail_empty = bpy.data.objects.new("TailRotor_Pivot", None)
    tail_empty.empty_display_type = "PLAIN_AXES"
    tail_empty.empty_display_size = 0.15
    tail_empty.location = TAIL_PIVOT
    bpy.context.collection.objects.link(tail_empty)

    for robj, pivot in rotor_objects:
        parent = main_empty if pivot == MAIN_PIVOT else tail_empty
        parent_keep_transform(robj, parent)

    # The glTF importer can leave extra empty scenes behind; keep only the
    # scene that owns the aircraft so the web loader gets one default scene.
    for sc in list(bpy.data.scenes):
        if sc is not bpy.context.scene:
            bpy.data.scenes.remove(sc)

    # Export only the aircraft + rotor hierarchy.
    bpy.ops.object.select_all(action="DESELECT")
    for o in [aircraft, main_empty, tail_empty] + [r[0] for r in rotor_objects]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = aircraft

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
    )
    print(f"Wrote {out_path} ({os.path.getsize(out_path)} bytes)")

    manifest = {
        "source": os.path.relpath(in_path),
        "output": os.path.relpath(out_path),
        "units": "meters",
        "gltf_up": "+Y",
        "gltf_forward": "+Z after 180-degree yaw normalization in the web app",
        "pivots_gltf": {
            "MainRotor_Pivot": [0.0, 2.5875, 0.450],
            "TailRotor_Pivot": [-0.360, 2.3600, 7.000],
        },
        "axes": {
            "MainRotor_Pivot": "+Y (glTF)",
            "TailRotor_Pivot": "-X (glTF)",
        },
        "groups": {k: len(v) for k, v in groups.items()},
        "rotor_objects": [o.name for o, _ in rotor_objects],
        "export_bytes": os.path.getsize(out_path),
    }
    manifest_path = os.path.splitext(out_path)[0] + ".manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {manifest_path}")

    if args.blend_out:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.blend_out))


if __name__ == "__main__":
    main()
