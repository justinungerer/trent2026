"""Render the new campaign films from original production keyframes in Blender."""
import argparse
import math
import random
import subprocess
import sys
from pathlib import Path

import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from render_chapter_intros import card, glow_material, illustration, key_positions, quad, screen

FPS = 24
FRAME_COUNT = 30 * FPS

# Foreground movement, light color, and camera travel for each location.
STYLES = {
    "prologue": ("spray", (0.62, 0.72, 0.82), -0.70, 0.06),
    "night": ("snow", (1.0, 0.42, 0.12), 0.38, -0.06),
    "frost": ("flurry", (0.41, 0.67, 1.0), -0.28, 0.70),
    "rail": ("snow", (0.96, 0.57, 0.24), 0.66, 0.05),
    "yard": ("mist", (1.0, 0.43, 0.12), 0.51, -0.11),
    "tower": ("snow", (1.0, 0.48, 0.13), -0.42, 0.05),
    "shelf": ("mist", (1.0, 0.48, 0.18), 0.42, -0.10),
    "wire": ("flurry", (0.56, 0.78, 1.0), -0.55, -0.08),
    "camp": ("snow", (0.70, 0.79, 0.95), 0.34, 0.10),
    "wrap": ("dust", (1.0, 0.55, 0.21), 0.49, -0.08),
    "chimney": ("flurry", (0.61, 0.77, 1.0), 0.66, 0.27),
}

def light_and_weather(name, center, ratio, weather, light, rng):
    # Stage the snow and fog at two depths so they pass the lens independently.
    wind, fall, count, stretch = {
        "spray": (-0.74, -0.06, 42, 2.6),
        "snow": (-0.18, 0.60, 48, 1.0),
        "flurry": (0.60, 0.68, 64, 1.7),
        "mist": (0.37, 0.09, 22, 1.45),
        "dust": (0.14, -0.28, 26, 1.0),
    }[weather]
    tint = (0.93, 0.66, 0.35) if weather == "dust" else (0.74, 0.87, 1.0)

    def place(x, y, z):
        position = screen(x, y, z, ratio)
        return (position[0] + center, position[1], position[2])

    for depth, opacity in [(2.5, .25), (7.0, .49)]:
        material = glow_material("Atmospheric scattering", tint, opacity)
        flake = quad("Particle", material)
        for _ in range(count // 2):
            x, y = rng.uniform(-.46, 1.45), rng.uniform(-.60, 1.3)
            size = rng.uniform(.018, .104) * (1.12 if depth > 3 else .65)
            speed = rng.uniform(.65, 1.35) * (1.15 if depth > 3 else .8)
            particle = card("Moving snow or dust", flake, place(x, y, depth), size * stretch, size)
            key_positions(particle, [(1, place(x, y, depth)),
                (FRAME_COUNT, place(x + wind * speed, y + fall * speed, depth))], linear=True)

    haze = quad("Low fog", glow_material("Fog scattering", (.54, .66, .79), .10))
    fog = card("Drifting low fog", haze, place(.25, .74, 1.25), 9.4, 1.8)
    key_positions(fog, [(1, place(.25, .74, 1.25)), (FRAME_COUNT, place(.73, .70, 1.25))], linear=True)
    lamp = quad("Practical light spill", glow_material("Practical spill", light, .12))
    glow = card("Moving lamp bloom", lamp, place(.70, .55, 1.0), 3.3, 2.2)
    key_positions(glow, [(1, place(.71, .55, 1.0)), (12 * FPS, place(.48, .50, 1.0)),
        (22 * FPS, place(.60, .52, 1.0)), (FRAME_COUNT, place(.71, .55, 1.0))])

    if name in {"wire", "camp", "yard", "tower"}:
        sweep = quad("Sweeping light", glow_material("Searchlight haze", (.61, .76, .95), .11))
        beam = card("Searchlight sweep", sweep, place(.08, .36, 2.0), 7.2, 1.3)
        key_positions(beam, [(1, place(.08, .36, 2.0)), (14 * FPS, place(.98, .51, 2.0)),
            (23 * FPS, place(.18, .57, 2.0)), (FRAME_COUNT, place(.92, .37, 2.0))])
        for frame, angle in [(1, -7), (14 * FPS, 13), (23 * FPS, -14), (FRAME_COUNT, 9)]:
            beam.rotation_euler.z = math.radians(angle)
            beam.keyframe_insert("rotation_euler", frame=frame)

def render_scene(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 2
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = (720, 1280) if name == "frost" else (1280, 720)
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, FRAME_COUNT
    ratio = scene.render.resolution_x / scene.render.resolution_y
    weather, light, travel_x, travel_y = STYLES[name]
    for index, side in enumerate(("a", "b")):
        center = 110.0 * index
        photo, aspect = illustration(f"assets/chapter-film-art/{name}-{side}.webp")
        height = max(1, ratio / aspect) * 11.5
        card("New production plate " + side, quad("Production plate", photo), (center, 0, 0), height * aspect, height)
        light_and_weather(name, center, ratio, weather, light, random.Random(2600 + index + sum(map(ord, name))))

    # Alternate the establishing shot, the character shot, and tighter inserts.
    shots = [
        (1, 215, 0, 20.8, 19.75),
        (216, 445, 1, 20.1, 18.95),
        (446, 592, 0, 17.7, 17.4),
        (593, FRAME_COUNT, 1, 18.5, 17.9),
    ]
    for index, (first, last, stage, z0, z1) in enumerate(shots, 1):
        lens = bpy.data.cameras.new("Cinematic lens")
        lens.sensor_fit = "VERTICAL"
        lens.sensor_height, lens.lens = 24, 48
        camera = bpy.data.objects.new(f"Shot {index}", lens)
        bpy.context.collection.objects.link(camera)
        center = 110.0 * stage
        direction = 1 if index in (1, 4) else -1
        dx, dy = travel_x * direction, travel_y * direction
        key_positions(camera, [
            (first, (center - .45 * dx, -.5 * dy, z0)),
            (last, (center + .58 * dx, .63 * dy, z1)),
        ])
        marker = scene.timeline_markers.new(f"Shot {index}", frame=first)
        marker.camera = camera
        if index == 1:
            scene.camera = camera
    scene.frame_set(1)
    return scene


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("chapter", nargs="*")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    for name in args.chapter or STYLES:
        if name not in STYLES:
            parser.error("Unknown chapter: " + name)
        target = output / f"{name}.mp4"
        if target.exists() and not args.preview:
            print(f"Already rendered {target}", flush=True)
            continue
        scene = render_scene(name)
        if args.preview:
            scene.frame_set(265)
            scene.render.image_settings.file_format = "PNG"
            scene.render.filepath = str(output / f"{name}.png")
            bpy.ops.render.render(write_still=True)
            continue
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.audio_codec = "NONE"
        scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
        scene.render.ffmpeg.ffmpeg_preset = "REALTIME"
        prefix = f"{name}-master-"
        scene.render.filepath = str(output / prefix)
        bpy.ops.render.render(animation=True)
        raw, = output.glob(prefix + "*.mp4")
        staged = output / f"{name}.staged.mp4"
        subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(raw), "-an",
            "-vf", "fade=t=in:st=0:d=0.28,fade=t=out:st=29.55:d=0.45",
            "-c:v", "libx264", "-threads", "4", "-preset", "medium", "-crf", "22",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(staged),
        ], check=True)
        staged.replace(target)
        raw.unlink()
        print(f"RENDERED {name}", flush=True)


if __name__ == "__main__":
    main()
