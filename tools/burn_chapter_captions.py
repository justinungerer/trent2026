"""Burn campaign story beats into clean chapter MP4s without changing the shots."""
import argparse
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
# Half the opening's original 74.24 px em at a reference width of 720 px.
FONT_WIDTH_RATIO = 37.12 / 720


def chapter_lines():
    extract = """
    const fs = require('node:fs');
    const vm = require('node:vm');
    const script = fs.readFileSync(process.argv[1], 'utf8');
    const start = script.indexOf('var CHAPTERS = ');
    const end = script.indexOf('var PIN_TO_ID = ', start);
    const chapters = vm.runInNewContext(script.slice(start, end) + 'CHAPTERS');
    console.log(JSON.stringify(chapters.map(({id, lines}) => [id, lines])));
    """
    return json.loads(subprocess.check_output(["node", "-e", extract, str(ROOT / "campaign.js")]))


def make_caption(text, width, font_path):
    size = round(width * FONT_WIDTH_RATIO)
    font = ImageFont.truetype(str(font_path), size)
    lines = []
    line = ""
    for word in text.split():
        combined = f"{line} {word}".strip()
        if line and font.getlength(combined) > width * .86:
            lines.append(line)
            line = word
        else:
            line = combined
    lines.append(line)

    gap = round(size * .15)
    pad = round(size * .32)
    text = "\n".join(lines)
    sample = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    left, top, right, bottom = sample.multiline_textbbox((0, 0), text, font=font, spacing=gap)
    caption = Image.new("RGBA", (right - left + 2 * pad, bottom - top + 2 * pad), (7, 16, 24, 243))
    ImageDraw.Draw(caption).multiline_text(
        (pad - left, pad - top), text, font=font, fill="#fff1dc", align="center", spacing=gap
    )
    return caption


def burn(source, target, lines, font, scratch):
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width:format=duration", "-of", "json", str(source),
    ])
    meta = json.loads(probe)
    width = meta["streams"][0]["width"]
    duration = float(meta["format"]["duration"])
    inputs = []
    filters = []
    for index, text in enumerate(lines):
        caption = scratch / f"{index}.png"
        make_caption(text, width, font).save(caption)
        inputs += ["-i", str(caption)]
        start, end = (duration * step / len(lines) for step in (index, index + 1))
        layer = "0:v" if index == 0 else f"caption{index - 1}"
        filters.append(
            f"[{layer}][{index + 1}:v]overlay=x=(W-w)/2:y='min(0.84*H-h/2,0.96*H-h)':"
            f"enable='gte(t,{start:.6f})*lt(t,{end:.6f})'[caption{index}]"
        )
    subprocess.run([
        "ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(source), *inputs,
        "-filter_complex_threads", "2", "-filter_complex", ";".join(filters),
        "-map", f"[caption{len(lines) - 1}]", "-c:v", "libx264", "-threads", "4",
        "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(target),
    ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Clean chapter MP4s from Blender")
    parser.add_argument("output", type=Path)
    parser.add_argument("--font", type=Path, required=True, help="Path to a sans-serif TrueType font")
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error("Source and output must be separate directories.")
    args.output.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=args.output) as folder:
        scratch = Path(folder)
        for name, lines in chapter_lines():
            burn(args.source / f"{name}.mp4", args.output / f"{name}.mp4", lines, args.font, scratch)
            print(f"Captioned {name}", flush=True)


if __name__ == "__main__":
    main()
