"""Run in Blender background mode with the source .blend open. Never saves it.
blender --background --disable-autoexec source.blend --python scripts/export-aircraft.py -- public/models/ajet-ec145.glb
"""
import bpy
import json
import sys
from pathlib import Path

output = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
collection = bpy.data.collections.get('EC145_REFERENCE_REBUILD')
if not collection:
    raise RuntimeError('Expected EC145_REFERENCE_REBUILD collection is missing.')
bpy.context.window.scene = bpy.data.scenes['AJET_Model_Review']
bpy.context.scene.frame_set(1)
for child in [collection, *collection.children_recursive]:
    child.hide_viewport = False
    child.hide_render = False
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    obj.select_set(False)
objects = [obj for obj in collection.all_objects if obj.type in {'MESH', 'CURVE', 'FONT'}]
for obj in objects:
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.convert(target='MESH')
# Reduce the dense procedural fuselage while retaining the separate livery and hardware.
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH' and len(obj.data.vertices) > 30000:
        modifier = obj.modifiers.new('Web mesh optimisation', 'DECIMATE')
        modifier.ratio = 0.42
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
# No articulated animation is needed for orbit viewing. One mesh with material
# groups avoids hundreds of separate draw calls on mobile GPUs.
bpy.context.view_layer.objects.active = next(obj for obj in bpy.context.selected_objects if obj.type == 'MESH')
bpy.ops.object.join()
bpy.context.object.name = 'AJET_EC145_WEB'
bpy.ops.export_scene.gltf(
    filepath=str(output), export_format='GLB', use_selection=True,
    export_apply=True, export_animations=False, export_cameras=False,
    export_lights=False, export_extras=False, export_materials='EXPORT',
    export_yup=True, export_texcoords=True, export_normals=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
)
print('AJET_EXPORT', json.dumps({'file':str(output),'bytes':output.stat().st_size,'objects':len(bpy.context.selected_objects)}))
