"""Render silent chapter cinematics using Blender 4.5 LTS.

Run from any directory with Blender in background mode and pass chapter IDs
after --. With no chapter IDs, render every chapter. Pass --preview for a still.
"""

import argparse
import json
import math
import random
import shutil
import subprocess
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
FPS = 24
FRAMES = 20 * FPS

# Camera travel in scene units, atmosphere, and an optional visible light source
# given as screen x/y fractions and its RGB color in linear space.
SHOTS = {
    "prologue": ((0.10, -0.08, 0.75), "spray", (0.70, 0.36, (1.00, 0.40, 0.15))),
    "night": ((0.48, -0.08, 0.95), "snow", (0.60, 0.69, (1.00, 0.34, 0.06))),
    "frost": ((-0.24, 0.82, 1.34), "flurry", (0.53, 0.23, (0.20, 0.58, 1.00))),
    "rail": ((0.72, 0.06, 0.45), "flurry", (0.55, 0.30, (1.00, 0.48, 0.24))),
    "yard": ((0.22, -0.44, 0.78), "snow", (0.82, 0.51, (1.00, 0.32, 0.06))),
    "tower": ((-0.58, -0.17, 0.84), "snow", (0.28, 0.54, (1.00, 0.33, 0.09))),
    "shelf": ((0.48, 0.03, 0.80), "snow", (0.72, 0.30, (1.00, 0.27, 0.05))),
    "wire": ((0.30, -0.12, 0.85), "flurry", (0.75, 0.44, (0.68, 0.82, 1.00))),
    "camp": ((0.46, 0.03, 0.78), "snow", (0.19, 0.50, (1.00, 0.34, 0.08))),
    "wrap": ((-0.30, -0.15, 0.88), "dust", (0.69, 0.38, (1.00, 0.42, 0.12))),
    "chimney": ((0.53, 0.24, 0.85), "flurry", (0.60, 0.20, (0.38, 0.63, 1.00))),
}

# Preserve the game's animated atlases while reblocking the larger video frame.
# Fields are display height and start/end screen positions.
BLOCKING = {
    "prologue": [(0.25, 0.20, 0.05, 0.78), (0.42, 0.94, 0.87, 0.74),
                 (0.42, 0.25, 0.67, 0.84)],
    "night": [(0.16, 0.62, 0.64, 0.82), (0.50, 0.77, 0.72, 0.82)],
    "frost": [(0.13, 0.88, 0.20, 0.34), (0.20, 0.28, 0.58, 0.57)],
    "rail": [(0.21, 0.24, 0.79, 0.79), (0.33, 0.24, 0.79, 0.68)],
    "yard": [(0.22, 0.82, 0.68, 0.68), (0.20, 0.27, 0.59, 0.76)],
    "tower": [(0.20, 0.06, 0.88, 0.70), (0.43, 0.72, 0.68, 0.84)],
    "wire": [(0.27, 0.18, 0.25, 0.77), (0.49, 0.68, 0.60, 0.83)],
    "camp": [(0.35, 0.34, 0.63, 0.78), (0.42, 0.48, 0.78, 0.77)],
    "wrap": [(0.17, 0.15, 0.83, 0.70), (0.42, 0.64, 0.67, 0.84)],
    "chimney": [(0.22, 0.44, 0.58, 0.76), (0.18, 0.87, 0.86, 0.61),
                (0.38, 0.25, 0.72, 0.78)],
}


def chapters():
    # Evaluate just the literal scene data, without the browser campaign router.
    extract = """
    const fs = require('node:fs');
    const vm = require('node:vm');
    const script = fs.readFileSync(process.argv[1], 'utf8');
    const start = script.indexOf('var CHAPTERS = ');
    const end = script.indexOf('var PIN_TO_ID = ', start);
    process.stdout.write(JSON.stringify(vm.runInNewContext(script.slice(start, end) + 'CHAPTERS')));
    """
    raw = subprocess.check_output(["node", "-e", extract, str(ROOT / "campaign.js")])
    return {chapter["id"]: chapter for chapter in json.loads(raw)}


def quad(name, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)],
                     [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new()
    for loop, xy in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = xy
    mesh.materials.append(material)
    return mesh


def card(name, mesh, position, width, height):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    obj.scale = (width, height, 1)
    return obj


def emission_material(name, tint=(1, 1, 1), alpha=False):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    links = material.node_tree.links
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*tint, 1)
    output = nodes.new("ShaderNodeOutputMaterial")
    if alpha:
        material.surface_render_method = 'BLENDED'
        mix = nodes.new("ShaderNodeMixShader")
        links.new(nodes.new("ShaderNodeBsdfTransparent").outputs[0], mix.inputs[1])
        links.new(emission.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], output.inputs["Surface"])
        return material, emission, mix.inputs[0]
    links.new(emission.outputs[0], output.inputs["Surface"])
    return material, emission, None


def illustration(path, transparent=False, sheet=None):
    image = bpy.data.images.load(str(ROOT / path), check_existing=True)
    material, emission, alpha = emission_material(Path(path).stem, alpha=transparent)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = 'CLIP'
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    if alpha:
        links.new(texture.outputs["Alpha"], alpha)
    width, height = image.size[:]
    if not sheet:
        return material, width / height
    frame_width = sheet["fw"]
    frame_height = min(height, sheet.get("fh", height))
    uv = nodes.new("ShaderNodeTexCoord")
    atlas = nodes.new("ShaderNodeMapping")
    atlas.inputs["Scale"].default_value = (frame_width / width, frame_height / height, 1)
    links.new(uv.outputs["UV"], atlas.inputs["Vector"])
    links.new(atlas.outputs["Vector"], texture.inputs["Vector"])
    location = atlas.inputs["Location"]
    # Sample the game cycle at video frames, adding keys only when the cell changes.
    previous = None
    for frame in range(1, FRAMES + 1):
        elapsed = (frame - 1) * 1000 / FPS
        cell = sheet["start"] + int(elapsed / sheet["ms"]) % sheet["count"]
        if cell != previous:
            location.default_value = (cell * frame_width / width, 1 - frame_height / height, 0)
            location.keyframe_insert("default_value", frame=frame)
            previous = cell
    for channel in material.node_tree.animation_data.action.fcurves:
        for key in channel.keyframe_points:
            key.interpolation = 'CONSTANT'
    return material, frame_width / frame_height


def glow_material(name, color, opacity):
    material, _, alpha = emission_material(name, color, alpha=True)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    uv = nodes.new("ShaderNodeTexCoord")
    distance = nodes.new("ShaderNodeVectorMath")
    distance.operation = 'DISTANCE'
    distance.inputs[1].default_value = (0.5, 0.5, 0)
    links.new(uv.outputs["UV"], distance.inputs[0])
    fade = nodes.new("ShaderNodeMapRange")
    fade.interpolation_type = 'SMOOTHERSTEP'
    fade.inputs["From Max"].default_value = 0.5
    fade.inputs["To Min"].default_value = opacity
    fade.inputs["To Max"].default_value = 0.0
    links.new(distance.outputs["Value"], fade.inputs["Value"])
    links.new(fade.outputs["Result"], alpha)
    return material


def screen(x, y, z, ratio):
    view_height = (20 - z) * 0.5
    return ((x - 0.5) * view_height * ratio, (0.5 - y) * view_height, z)


def key_positions(obj, positions, linear=False):
    for frame, position in positions:
        obj.location = position
        obj.keyframe_insert(data_path="location", frame=frame)
    if linear:
        for channel in obj.animation_data.action.fcurves:
            for key in channel.keyframe_points:
                key.interpolation = 'LINEAR'


def atmosphere(kind, ratio, seed):
    rng = random.Random(seed)
    tint = (1.0, 0.66, 0.28) if kind == "dust" else (0.79, 0.89, 1.0)
    drift, fall, count = {
        "spray": (0.56, -0.13, 44),
        "snow": (-0.11, 0.40, 42),
        "flurry": (-0.44, 0.72, 50),
        "dust": (0.18, -0.17, 28),
    }[kind]
    for depth, opacity in [(2.8, 0.30), (7, 0.50)]:
        mesh = quad("Air particle", glow_material("Particle scattering", tint, opacity))
        for _ in range(count // 2):
            x, y = rng.uniform(-0.25, 1.3), rng.uniform(-0.55, 1.08)
            size = rng.uniform(0.014, 0.078) * (1.5 if depth > 3 else 1)
            stretch = 2.0 if kind == "spray" else 1.0
            particle = card("Foreground atmosphere", mesh, screen(x, y, depth, ratio), size * stretch, size)
            speed = rng.uniform(0.5, 1.5) * (1.4 if depth > 3 else 0.8)
            key_positions(particle, [(1, screen(x, y, depth, ratio)),
                                     (FRAMES, screen(x + drift * speed, y + fall * speed, depth, ratio))],
                          linear=True)


def yard_set(ratio):
    shelf, aspect = illustration("chapter-2/art/shelf.webp", transparent=True)
    mesh = quad("Freight shelf", shelf)
    for x, y, depth, height in [(0.25, 0.55, 2.4, 0.84), (0.74, 0.40, 1.4, 0.75),
                                (0.97, 0.69, 2.9, 1.04)]:
        card("Freight shelf", mesh, screen(x, y, depth, ratio), height * aspect, height)
    mail, aspect = illustration("chapter-2/art/mail.webp", transparent=True)
    envelope = card("Dispatch", quad("Dispatch", mail), screen(0.75, 0.35, 2.1, ratio), 0.42 * aspect, 0.42)
    envelope.rotation_euler.z = math.radians(-8)


def searchlight(ratio):
    material, _, alpha = emission_material("Searchlight", (0.74, 0.87, 1.0), alpha=True)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    uv = nodes.new("ShaderNodeTexCoord")
    split = nodes.new("ShaderNodeSeparateXYZ")
    links.new(uv.outputs["UV"], split.inputs[0])
    edge = nodes.new("ShaderNodeMath")
    edge.operation = 'PINGPONG'
    edge.inputs[1].default_value = 0.5
    links.new(split.outputs["Y"], edge.inputs[0])
    distance = nodes.new("ShaderNodeMapRange")
    distance.interpolation_type = 'SMOOTHERSTEP'
    distance.inputs["To Min"].default_value = 0.48
    distance.inputs["To Max"].default_value = 0.0
    links.new(split.outputs["X"], distance.inputs["Value"])
    opacity = nodes.new("ShaderNodeMath")
    opacity.operation = 'MULTIPLY'
    links.new(edge.outputs[0], opacity.inputs[0])
    links.new(distance.outputs["Result"], opacity.inputs[1])
    links.new(opacity.outputs[0], alpha)

    mesh = quad("Searchlight beam", material)
    for vertex, xy in zip(mesh.vertices, [(0, -0.045), (10.5, -1.25), (10.5, 1.25), (0, 0.045)]):
        vertex.co = (*xy, 0)
    beam = card("Searchlight beam", mesh, screen(0.20, 0.62, 3.05, ratio), 1, 1)
    key_positions(beam, [(1, screen(0.20, 0.62, 3.05, ratio)),
                         (FRAMES, screen(0.27, 0.62, 3.05, ratio))])
    for frame, angle in [(1, 8), (FRAMES // 3, 29), (2 * FRAMES // 3, -7), (FRAMES, 20)]:
        beam.rotation_euler.z = math.radians(angle)
        beam.keyframe_insert(data_path="rotation_euler", frame=frame)


def prepare_scene(chapter, preview):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples = 4
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x, scene.render.resolution_y = (720, 1280) if chapter.get("portrait") else (1280, 720)
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, FRAMES
    ratio = scene.render.resolution_x / scene.render.resolution_y
    name = chapter["id"]
    travel, weather, light = SHOTS[name]
    spec = chapter["intro"]

    lens = bpy.data.cameras.new("Chapter camera")
    lens.sensor_fit = 'VERTICAL'
    lens.sensor_height = 24
    lens.lens = 48
    camera = bpy.data.objects.new("Chapter camera", lens)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    dx, dy, dolly = travel
    key_positions(camera, [(1, (-0.4 * dx, -0.4 * dy, 20.4)),
                           (int(FRAMES * 0.55), (0.32 * dx, 0.60 * dy, 20.1 - dolly * 0.35)),
                           (FRAMES, (dx, dy, 20.0 - dolly))])

    backdrop, aspect = illustration(spec["bg"])
    background_height = 11.7 * max(1, ratio / aspect)
    card("Painted environment", quad("Environment", backdrop), (0, 0, 0),
         background_height * aspect, background_height)

    if name == "yard":
        yard_set(ratio)
    if name == "wire":
        searchlight(ratio)

    if name == "shelf":
        # This painting already includes Buddy. Stage a guard further down the platform.
        layers = [{"src": "shelf-escape/art/guard.webp"}]
        blocking = [(0.29, 0.90, 0.66, 0.68)]
    else:
        layers = spec["layers"]
        blocking = BLOCKING[name]
    for index, (layer, (height, start_x, end_x, bottom)) in enumerate(zip(layers, blocking, strict=True)):
        depth = 3.1 + index * 0.36
        material, aspect = illustration(layer["src"], transparent=True, sheet=layer.get("sheet"))
        position = screen(start_x, bottom - height / 2, depth, ratio)
        units = height * (20 - depth) * 0.5
        actor = card(Path(layer["src"]).stem, quad("Actor card", material), position, units * aspect, units)
        key_positions(actor, [(1, position),
                              (int(FRAMES * 0.48), screen(start_x * 0.55 + end_x * 0.45,
                                                          bottom - height / 2 - (0.021 if layer.get("bob") else 0),
                                                          depth, ratio)),
                              (FRAMES, screen(end_x, bottom - height / 2, depth, ratio))])
        if name != "frost" and height >= 0.16:
            shadow_depth = depth - 0.16
            shadow_mesh = quad("Contact shadow", glow_material("Contact shadow", (0.018, 0.032, 0.05), 0.44))
            shadow = card("Contact shadow", shadow_mesh, screen(start_x, bottom - 0.006, shadow_depth, ratio),
                          units * max(0.35, min(aspect, 1.0)) * 0.85, units * 0.12)
            key_positions(shadow, [(1, screen(start_x, bottom - 0.006, shadow_depth, ratio)),
                                   (int(FRAMES * 0.48), screen(start_x * 0.55 + end_x * 0.45,
                                                               bottom - 0.006, shadow_depth, ratio)),
                                   (FRAMES, screen(end_x, bottom - 0.006, shadow_depth, ratio))])
        # Slow pitch and roll make the sleigh feel suspended during its climb.
        if layer.get("bob"):
            for frame, angle in [(1, -5), (FRAMES // 3, 9), (2 * FRAMES // 3, -4), (FRAMES, 3)]:
                actor.rotation_euler.z = math.radians(angle)
                actor.keyframe_insert(data_path="rotation_euler", frame=frame)

    light_x, light_y, color = light
    lamp = card("Light spill", quad("Soft light", glow_material("Light spill", color, 0.21)),
                screen(light_x, light_y, 0.8, ratio), 4.8, 3.6)
    for frame, scale in [(1, 1.0), (FRAMES // 3, 1.13), (2 * FRAMES // 3, 1.02), (FRAMES, 1.11)]:
        lamp.scale = (4.8 * scale, 3.6 * scale, 1)
        lamp.keyframe_insert(data_path="scale", frame=frame)
    atmosphere(weather, ratio, chapter["number"] + 2026)
    # Frame the portrait shot at full height. Render stills at the same camera position.
    scene.frame_set(240 if preview else 1)
    return scene


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "intro-video")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--save-project", type=Path)
    parser.add_argument("chapter", nargs="*")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not args.preview and not shutil.which("ffmpeg"):
        parser.error("FFmpeg must be available on PATH for the web export.")
    source = chapters()
    names = args.chapter or list(source)
    unknown = set(names) - source.keys()
    if unknown:
        parser.error("Unknown chapter IDs: " + ", ".join(sorted(unknown)))
    args.output.mkdir(parents=True, exist_ok=True)
    for name in names:
        output = args.output.resolve()
        target = output / f"{name}.mp4"
        if not args.preview and target.is_file():
            print(f"Already rendered {target}", flush=True)
            continue
        scene = prepare_scene(source[name], args.preview)
        if args.save_project:
            args.save_project.mkdir(parents=True, exist_ok=True)
            bpy.ops.file.pack_all()
            bpy.ops.wm.save_as_mainfile(filepath=str((args.save_project / f"{name}.blend").resolve()))
        if args.preview:
            scene.render.image_settings.file_format = 'PNG'
            scene.render.filepath = str(output / f"{name}.png")
            bpy.ops.render.render(write_still=True)
        else:
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = 'MPEG4'
            scene.render.ffmpeg.codec = 'H264'
            scene.render.ffmpeg.audio_codec = 'NONE'
            scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
            scene.render.ffmpeg.ffmpeg_preset = 'REALTIME'
            prefix = f"{name}-render-"
            scene.render.filepath = str(output / prefix)
            bpy.ops.render.render(animation=True)
            files = list(output.glob(prefix + "*.mp4"))
            if len(files) != 1 or files[0].stat().st_size == 0:
                raise RuntimeError(f"Expected one Blender render for {name}, got {files}")
            web = output / f".{name}.encoding.mp4"
            subprocess.run([
                "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(files[0]),
                "-map", "0:v:0", "-an", "-c:v", "libx264", "-threads", "4",
                "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", str(web),
            ], check=True)
            web.replace(target)
            files[0].unlink()
            print(f"RENDERED {target}", flush=True)


if __name__ == "__main__":
    main()
