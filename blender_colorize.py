"""
OmniScan — Realistic PBR Colorizer (named exterior parts)
==========================================================
Run: Blender → Scripting tab → Open → ▶ Run Script

Color palette designed for a premium aerospace VTOL UAV.
"""

import bpy
import colorsys

# ─────────────────────────────────────────────────────────────────────────────
# sRGB hex → Blender linear RGB
# ─────────────────────────────────────────────────────────────────────────────
def hex_lin(h):
    h = h.lstrip('#')
    def s2l(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    return s2l(r), s2l(g), s2l(b)

# ─────────────────────────────────────────────────────────────────────────────
# Material factory
# ─────────────────────────────────────────────────────────────────────────────
_cache = {}

def make_mat(name, hex_color, metallic, roughness, alpha=1.0, emit_hex=None, emit_strength=0.0):
    if name in _cache:
        return _cache[name]

    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.blend_method = 'BLEND' if alpha < 1.0 else 'OPAQUE'

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    r, g, b = hex_lin(hex_color)
    bsdf.inputs['Base Color'].default_value   = (r, g, b, 1.0)
    bsdf.inputs['Metallic'].default_value     = metallic
    bsdf.inputs['Roughness'].default_value    = roughness
    bsdf.inputs['Alpha'].default_value        = alpha

    if emit_hex and emit_strength > 0:
        er, eg, eb = hex_lin(emit_hex)
        bsdf.inputs['Emission Color'].default_value    = (er, eg, eb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emit_strength

    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (400, 0)
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    _cache[name] = mat
    return mat

# ─────────────────────────────────────────────────────────────────────────────
# ── PALETTE ───────────────────────────────────────────────────────────────────
#
#  Design intent: premium aerospace VTOL
#   • Airframe / wings: near-black carbon composite — sleek and stealthy
#   • Control surfaces: same family, subtle differentiation
#   • Structural booms: carbon-black, ultra-dark
#   • Motors: brushed aluminium — mechanical contrast
#   • Props: light silver-grey — catch the light dramatically
#   • Tilt mechanism: warm polished steel
#   • Covers/lids (Tampa): anthracite with the brand indigo accent highlight
#   • Servo boxes: dark equipment grey
#   • Fallback (electronics with no name): charcoal
#
# ─────────────────────────────────────────────────────────────────────────────

MATS = {

    # ── Airframe surfaces ─────────────────────────────────────────────────────
    # Wings: carbon-fibre weave — almost black, slightly warm, semi-glossy
    'wing':     make_mat('Wing_Carbon',     '#161820', metallic=0.10, roughness=0.48),
    # Ailerons: same carbon family but just a shade lighter for visual separation
    'aileron':  make_mat('Aileron_Carbon',  '#252832', metallic=0.10, roughness=0.42),
    # Booms: structural arms — very dark matte carbon
    'boom':     make_mat('Boom_Carbon',     '#111318', metallic=0.05, roughness=0.60),

    # ── Propulsion ────────────────────────────────────────────────────────────
    # Motors: anodised brushed aluminium — dark metallic with high reflection
    'motor':    make_mat('Motor_Alu',       '#3a3f4b', metallic=0.92, roughness=0.22),
    # Props: light silver-grey — high metalness so they catch light
    'prop':     make_mat('Prop_Silver',     '#c5cdd6', metallic=0.88, roughness=0.16),
    # Tilt mechanism: polished warm steel — mechanical joint
    'tilt':     make_mat('Tilt_Steel',      '#8a96a3', metallic=0.95, roughness=0.12),

    # ── Covers & access panels ────────────────────────────────────────────────
    # Tampa (lid/cover): anthracite panel with the site's indigo accent
    # Achieved with a slight blue-grey tone so it reads as "payload door"
    'tampa':    make_mat('Tampa_Anthracite','#1e2336', metallic=0.25, roughness=0.55),
    # Servo box housing: dark functional grey, matches military-grade look
    'servo':    make_mat('ServoBox_Dark',   '#2b2f3a', metallic=0.40, roughness=0.50),

    # ── Fallback: electronics / unnamed ──────────────────────────────────────
    'default':  make_mat('Default_Charcoal','#2a2d35', metallic=0.45, roughness=0.50),
}

# ─────────────────────────────────────────────────────────────────────────────
# Name → material mapping  (case-insensitive prefix/keyword match)
# ─────────────────────────────────────────────────────────────────────────────
RULES = [
    # Exact prefixes / keywords (lowercased)
    (['asa'],              MATS['wing']),
    (['aileron'],          MATS['aileron']),
    (['boom'],             MATS['boom']),
    (['motor'],            MATS['motor']),
    (['.prop', 'prop'],    MATS['prop']),
    (['.tilt', 'tilt'],    MATS['tilt']),
    (['.tampa', 'tampa'],  MATS['tampa']),
    (['caixaservo', 'caixa_servo', 'servo'], MATS['servo']),
]

def classify(name):
    n = name.lower().replace('-', '_').replace(' ', '_')
    for keywords, mat in RULES:
        if any(n.startswith(kw.lower()) or kw.lower() in n for kw in keywords):
            return mat
    return None   # keep existing material or use default


# ─────────────────────────────────────────────────────────────────────────────
# PBR-upgrade helper for objects that already have a colour (electronics)
# ─────────────────────────────────────────────────────────────────────────────
def infer_pbr(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if v < 0.15 and s < 0.20: return 0.80, 0.30   # dark neutral → structural metal
    if v > 0.60 and s < 0.15: return 0.90, 0.20   # bright neutral → aluminium
    if s < 0.12:               return 0.65, 0.40   # grey
    if 0.22 < h < 0.44 and v < 0.45: return 0.08, 0.82  # green → PCB
    if 0.55 < h < 0.72:        return 0.15, 0.75   # blue → electronics
    if 0.05 < h < 0.12:        return 0.88, 0.28   # orange → copper
    return 0.05, 0.80   # coloured → plastic

def upgrade_existing_mat(mat):
    r, g, b, a = 0.35, 0.35, 0.38, 1.0
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type in ('BSDF_PRINCIPLED', 'BSDF_DIFFUSE'):
                col = node.inputs['Base Color'].default_value
                r, g, b = col[0], col[1], col[2]
                a = col[3] if len(col) > 3 else 1.0
                break
    else:
        dc = mat.diffuse_color
        r, g, b = dc[0], dc[1], dc[2]
        a = dc[3] if len(dc) > 3 else 1.0

    metallic, roughness = infer_pbr(r, g, b)
    mat.use_nodes = True
    mat.blend_method = 'BLEND' if a < 1.0 else 'OPAQUE'
    nodes = mat.node_tree.nodes
    nodes.clear()
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
    bsdf.inputs['Metallic'].default_value   = metallic
    bsdf.inputs['Roughness'].default_value  = roughness
    bsdf.inputs['Alpha'].default_value      = a
    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (400, 0)
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


# ─────────────────────────────────────────────────────────────────────────────
# Main pass
# ─────────────────────────────────────────────────────────────────────────────
named_colored     = 0
existing_upgraded = 0
fallback          = 0
skipped           = 0

# Collect ALL mesh objects (including nested children)
all_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f'\n[OmniScan] Found {len(all_meshes)} mesh objects total')

# Print first 30 names for diagnosis
print('[OmniScan] First 30 mesh names:')
for o in all_meshes[:30]:
    print(f'  · "{o.name}"')

for obj in all_meshes:
    # 1. Try to classify by name
    mat = classify(obj.name)
    if mat:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        named_colored += 1
        print(f'  ✓ Named: "{obj.name}" → {mat.name}')
        continue

    # 2. Object has its own material (electronics from SolidWorks)
    if obj.data.materials and obj.data.materials[0] is not None:
        upgrade_existing_mat(obj.data.materials[0])
        existing_upgraded += 1
        continue

    # 3. No name match, no material → default charcoal
    obj.data.materials.clear()
    obj.data.materials.append(MATS['default'])
    fallback += 1

total = named_colored + existing_upgraded + fallback
print(f'\n✅ OmniScan colorizer complete — {total} objects processed')
print(f'   Named exterior parts coloured : {named_colored}')
print(f'   Electronics colour upgraded   : {existing_upgraded}')
print(f'   Fallback (charcoal)           : {fallback}')

# ── Force viewport to Material Preview so colours are visible ─────────────────
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.shading.type = 'MATERIAL'
                print('\n🎨 Viewport switched to Material Preview mode')
                break

print('\nExport: File → Export → glTF 2.0 (.glb) with Materials: Export ✓')

