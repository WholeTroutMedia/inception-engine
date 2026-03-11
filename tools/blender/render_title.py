"""
render_title.py — Blender Headless 3D Title Card Renderer

Called by blender-renderer.ts via:
    blender --background title_card.blend --python render_title.py -- \
        --title "SUPER BOWL PARTY 2026" \
        --style cyberpunk \
        --output "d:/renders/title_card.png" \
        --width 1080 --height 1920

This script runs INSIDE Blender's Python environment.
It modifies the Text object in the scene, sets the output path, and renders.

Template requirements (create in Blender once, save as title_card.blend):
  - A Text object named "OmniTitle" with your desired font + extrusion
  - A Camera named "Camera" framed to capture the title
  - A World shader or Background providing the mood lighting
  - Render engine: CYCLES or EEVEE (set to your preference)
  - Output format: PNG (RGBA, 16-bit)

Style modifiers applied by this script:
  - 'cyberpunk'    : Emissive cyan/magenta material on text
  - 'golden-neon'  : Emissive warm gold material
  - 'chrome'       : Metallic silver BSDF, high roughness=0
  - 'minimal'      : White diffuse, clean background
  - default        : No material change (use template as-is)
"""

import bpy
import sys
import os

# ─────────────────────────────────────────────────────────────────────────────
# ARG PARSING (after -- separator in Blender CLI)
# ─────────────────────────────────────────────────────────────────────────────

def get_args():
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []

    args = {}
    i = 0
    while i < len(argv):
        if argv[i].startswith('--') and i + 1 < len(argv):
            args[argv[i][2:]] = argv[i + 1]
            i += 2
        else:
            i += 1
    return args

args = get_args()
title_text  = args.get('title',  'OMNIMEDIA V2')
style       = args.get('style',  'cinematic')
output_path = args.get('output', '/tmp/title_card.png')
width       = int(args.get('width',  '1920'))
height      = int(args.get('height', '1080'))

print(f"[BlenderRender] Title   : {title_text}")
print(f"[BlenderRender] Style   : {style}")
print(f"[BlenderRender] Output  : {output_path}")
print(f"[BlenderRender] Size    : {width}x{height}")

# ─────────────────────────────────────────────────────────────────────────────
# SCENE SETUP
# ─────────────────────────────────────────────────────────────────────────────

scene = bpy.context.scene

# Render resolution
scene.render.resolution_x = width
scene.render.resolution_y = height
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '16'

# Output path
os.makedirs(os.path.dirname(output_path), exist_ok=True)
scene.render.filepath = output_path

# ─────────────────────────────────────────────────────────────────────────────
# FIND AND UPDATE TEXT OBJECT
# ─────────────────────────────────────────────────────────────────────────────

text_obj = bpy.data.objects.get('OmniTitle')
if text_obj and text_obj.type == 'FONT':
    text_obj.data.body = title_text
    print(f"[BlenderRender] ✅ Text object 'OmniTitle' updated: {title_text}")
else:
    # Fallback: find any FONT object in the scene
    font_objects = [o for o in bpy.data.objects if o.type == 'FONT']
    if font_objects:
        font_objects[0].data.body = title_text
        print(f"[BlenderRender] ✅ Updated first font object: {font_objects[0].name}")
    else:
        # Last resort: create a new text object
        print("[BlenderRender] ⚠️  No Text object found — creating one...")
        bpy.ops.object.text_add(location=(0, 0, 0))
        text_obj = bpy.context.active_object
        text_obj.name = 'OmniTitle'
        text_obj.data.body = title_text
        text_obj.data.align_x = 'CENTER'
        text_obj.data.size = 1.5

# ─────────────────────────────────────────────────────────────────────────────
# STYLE MATERIAL INJECTION
# ─────────────────────────────────────────────────────────────────────────────

def create_emission_material(name, color, strength=3.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = color
    emission.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])
    return mat

def create_metallic_material(name, color, roughness=0.05):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = roughness
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat

style_lower = style.lower()
target_obj = text_obj or (bpy.data.objects.get('OmniTitle'))

if target_obj:
    if style_lower == 'cyberpunk':
        mat = create_emission_material('OmniTitle_Cyberpunk', (0.0, 0.9, 1.0, 1.0), strength=5.0)
        print("[BlenderRender] Style: cyberpunk — cyan emissive material")
    elif style_lower == 'golden-neon':
        mat = create_emission_material('OmniTitle_GoldenNeon', (1.0, 0.75, 0.0, 1.0), strength=4.0)
        print("[BlenderRender] Style: golden-neon — warm gold emissive material")
    elif style_lower == 'chrome':
        mat = create_metallic_material('OmniTitle_Chrome', (0.8, 0.8, 0.85, 1.0), roughness=0.02)
        print("[BlenderRender] Style: chrome — mirror metallic material")
    elif style_lower == 'minimal':
        mat = bpy.data.materials.new('OmniTitle_Minimal')
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1,1,1,1)
        print("[BlenderRender] Style: minimal — clean white diffuse")
    else:
        mat = None
        print(f"[BlenderRender] Style '{style}': using template material as-is")

    if mat:
        if target_obj.data.materials:
            target_obj.data.materials[0] = mat
        else:
            target_obj.data.materials.append(mat)

# ─────────────────────────────────────────────────────────────────────────────
# RENDER
# ─────────────────────────────────────────────────────────────────────────────

print(f"[BlenderRender] Rendering {width}x{height} → {output_path}")
bpy.ops.render.render(write_still=True)
print(f"[BlenderRender] ✅ Saved: {output_path}")
