"""Render the portrait opening with four in-frame story captions in Blender."""
import argparse
import random
import subprocess
import sys
from pathlib import Path

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from render_chapter_intros import card, emission_material, illustration, key_positions, quad
from render_fresh_chapter_films import FPS, light_and_weather

WIDTH = 720
HEIGHT = 1280
DURATION = 31

# Name, start time, caption, atmosphere, camera drift, and start/end lens positions.
SHOTS = [
    ("orders", 0, "Hitler orders\nSanta’s capture.", "dust", (.87, .47, .20), .36, (20.75, 19.60)),
    ("capture", 6, "Guards march Santa into\na Nazi concentration camp.", "snow", (.66, .79, .97), -.53, (20.45, 19.94)),
    ("gate", 13, "The guards attack Santa\nbehind the locked gate.", "mist", (.84, .45, .21), .32, (20.75, 18.92)),
    ("radio", 21, "The Allies pick up the first report.\nA rescue is still possible.", "dust", (.86, .57, .31), -.38, (19.20, 20.50)),
]


def solid(name, color):
    material, emission, _ = emission_material(name)
    emission.inputs["Color"].default_value = (*color, 1.0)
    return material


def add_caption(camera, caption, ink, backdrop):
    curve = bpy.data.curves.new("Story caption", 'FONT')
    curve.body = caption
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = .029
    curve.space_line = 1.08
    curve.materials.append(ink)
    text = bpy.data.objects.new("Story caption", curve)
    bpy.context.collection.objects.link(text)
    text.parent = camera
    text.location = (0, -.169, -1)
    bpy.context.view_layer.update()
    width, height, _ = text.dimensions
    scale = min(1, .235 / width)
    text.scale = (scale,) * 3

    plaque = card("Caption background", backdrop, (0, -.169, -1.005),
                  width * scale + .028, height * scale + .028)
    plaque.parent = camera


def create_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 2
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, DURATION * FPS

    ratio = WIDTH / HEIGHT
    ink = solid("Warm caption ink", (1, .93, .78))
    backdrop = quad("Caption background", solid("Midnight matte", (.004, .008, .012)))

    for index, (name, start, caption, weather, light, drift, (start_z, end_z)) in enumerate(SHOTS):
        center = 100 * index
        plate, aspect = illustration(f"assets/opening-film-art/{name}.webp")
        height = 11.5
        card(name, quad(name, plate), (center, 0, 0), height * aspect, height)
        look = "camp" if name == "capture" else name
        light_and_weather(look, center, ratio, weather, light, random.Random(1121 + index))

        first = start * FPS + 1
        last = SHOTS[index + 1][1] * FPS if index + 1 < len(SHOTS) else scene.frame_end
        lens = bpy.data.cameras.new(name)
        lens.sensor_fit = 'VERTICAL'
        lens.sensor_height, lens.lens = 24, 48
        camera = bpy.data.objects.new(name, lens)
        bpy.context.collection.objects.link(camera)
        key_positions(camera, [
            (first, (center - drift * .46, -.10, start_z)),
            (last, (center + drift * .54, .11, end_z)),
        ])
        add_caption(camera, caption, ink, backdrop)
        scene.timeline_markers.new(name, frame=first).camera = camera
        if index == 0:
            scene.camera = camera
    scene.frame_set(1)
    return scene


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", choices=[shot[0] for shot in SHOTS])
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    scene = create_scene()
    if args.preview:
        start = next(shot[1] for shot in SHOTS if shot[0] == args.preview)
        scene.frame_set((start + 2) * FPS + 1)
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        return

    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "REALTIME"
    master = output.with_name(f"{output.stem}-master-")
    scene.render.filepath = str(master)
    bpy.ops.render.render(animation=True)
    raw = master.with_name(f"{master.name}0001-{scene.frame_end:04}.mp4")
    subprocess.run([
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(raw),
        "-vf", "fade=t=in:st=0:d=0.45,fade=t=out:st=30.45:d=0.55",
        "-an", "-c:v", "libx264", "-threads", "4", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ], check=True)
    raw.unlink()


if __name__ == "__main__":
    main()
