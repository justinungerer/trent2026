"""Assemble a portrait story cut in Blender's video sequencer."""

import json
import sys
from pathlib import Path

import bpy


WIDTH, HEIGHT = 720, 1280


def assemble(manifest):
    scene = bpy.context.scene
    strips = scene.sequence_editor_create().strips
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.fps = manifest["fps"]
    scene.render.use_sequencer = True
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.ffmpeg.constant_rate_factor = "HIGH"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.filepath = manifest["output"]

    frame = 1
    for index, shot in enumerate(manifest["shots"]):
        last = frame + shot["frames"] - 1
        plate = strips.new_image(f"Shot {index + 1}", shot["image"], 1, frame)
        plate.frame_final_duration = shot["frames"]
        media = plate.elements[0]
        scale = max(WIDTH / media.orig_width, HEIGHT / media.orig_height)
        direction = 1 if index % 2 == 0 else -1
        transform = plate.transform
        motion = [(frame, 1.045, -6, 0), (last, 1.122, 12, 0)]
        if manifest.get("chapterOneMotion"):
            start, end, lift = [(1.045, 1.125, 11), (1.14, 1.055, -9), (1.065, 1.165, 14)][index % 3]
            motion = [(frame, start, -5, 0), (last, end, 12, lift)]
        for at, zoom, drift, vertical in motion:
            transform.scale_x = transform.scale_y = scale * zoom
            transform.offset_x = drift * direction
            transform.offset_y = vertical
            for property_name in ("scale_x", "scale_y", "offset_x", "offset_y"):
                transform.keyframe_insert(property_name, frame=at)

        if shot["caption"]:
            caption = strips.new_image(f"Caption {index + 1}", shot["caption"], 2, frame)
            caption.frame_final_duration = shot["frames"]
            caption.blend_type = "ALPHA_OVER"
            h = caption.elements[0].orig_height
            caption.transform.offset_y = HEIGHT / 2 - min(0.81 * HEIGHT, 0.95 * HEIGHT - h / 2)
        frame = last + 1

    scene.frame_start = 1
    scene.frame_end = frame - 1
    bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    manifest_path = Path(sys.argv[sys.argv.index("--") + 1])
    assemble(json.loads(manifest_path.read_text(encoding="utf-8")))
