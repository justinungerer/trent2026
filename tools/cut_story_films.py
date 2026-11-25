"""Cut the portrait story films from still artwork and bake in the captions."""
import argparse
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from burn_chapter_captions import make_caption

ROOT = Path(__file__).resolve().parents[1]
FPS = 24
SECOND_SHOT_WORDS = 16
# Numbers refer to new art. Letters refer to earlier production plates.
PLATES = {
    "cast": [["1"], ["2"], ["3"]],
    "opening": [
        [
            "1"
        ],
        [
            "a"
        ],
        [
            "2",
            "b"
        ],
        [
            "3"
        ],
        [
            "4"
        ],
        [
            "d",
            "prologue:4"
        ]
    ],
    "prologue": [
        [
            "1"
        ],
        [
            "a"
        ],
        [
            "2",
            "3"
        ],
        [
            "4",
            "b"
        ],
        [
            "4"
        ]
    ],
    "night": [
        ["chapter-one:broadcast-a"],
        ["2", "night:b"],
        ["chapter-one:broadcast-c"],
        ["chapter-one:blackout-b"],
        ["chapter-one:broadcast-d"],
        ["chapter-one:broken-a"],
    ],
    "frost": [
        [
            "1",
            "a"
        ],
        [
            "2"
        ],
        [
            "3"
        ],
        [
            "4"
        ],
        [
            "b"
        ],
        [
            "2"
        ]
    ],
    "rail": [
        [
            "1"
        ],
        [
            "2",
            "yard:1"
        ],
        [
            "a"
        ],
        [
            "1",
            "3"
        ],
        [
            "a"
        ],
        [
            "4",
            "b"
        ]
    ],
    "yard": [
        [
            "5"
        ],
        [
            "2"
        ],
        [
            "b",
            "2"
        ],
        [
            "3"
        ],
        [
            "4"
        ],
        [
            "a"
        ]
    ],
    "tower": [
        [
            "1"
        ],
        [
            "a"
        ],
        [
            "2"
        ],
        [
            "3",
            "b"
        ],
        [
            "4"
        ]
    ],
    "shelf": [
        [
            "1"
        ],
        [
            "2"
        ],
        [
            "3",
            "a"
        ],
        [
            "4",
            "b"
        ],
        [
            "4"
        ],
        [
            "b"
        ]
    ],
    "wire": [
        [
            "1",
            "a"
        ],
        [
            "2"
        ],
        [
            "b"
        ],
        [
            "3",
            "4"
        ],
        [
            "3"
        ],
        [
            "1"
        ]
    ],
    "camp": [
        [
            "2"
        ],
        [
            "1"
        ],
        [
            "a"
        ],
        [
            "4"
        ],
        [
            "3"
        ],
        [
            "2",
            "4"
        ]
    ],
    "wrap": [
        [
            "1"
        ],
        [
            "a"
        ],
        [
            "1",
            "2"
        ],
        [
            "3",
            "b"
        ],
        [
            "2",
            "3"
        ],
        [
            "4"
        ]
    ],
    "chimney": [
        [
            "1"
        ],
        [
            "2"
        ],
        [
            "3"
        ],
        [
            "4",
            "a"
        ],
        [
            "4"
        ],
        [
            "b"
        ]
    ]
}
CHAPTER_ONE_LEVEL_PLATES = {
    "the-broken-dispatch": [["broken-a"], ["broken-b", "broken-c"], ["broken-d"]],
    "lights-across-the-valley": [["valley-a"], ["valley-b", "valley-c"], ["valley-d"]],
    "beat-the-blackout": [["blackout-a", "blackout-b"], ["blackout-c"], ["blackout-d"]],
}
CHAPTER_ONE_CINEMATICS = {"night", *CHAPTER_ONE_LEVEL_PLATES}

OPENING_PLATES = dict(zip("abcd", ("orders", "capture", "gate", "radio")))


def read_films():
    extract = """
    const fs = require('node:fs'), vm = require('node:vm');
    const source = fs.readFileSync(process.argv[1], 'utf8');
    const filmData = source.slice(source.indexOf('var OPENING_FILM = '), source.indexOf('var PIN_TO_ID = '));
    console.log(JSON.stringify(vm.runInNewContext(filmData + '({opening:OPENING_FILM, cast:CAST_FILM, chapters:CHAPTERS})')));
    """
    data = json.loads(subprocess.check_output(["node", "-e", extract, str(ROOT / "campaign.js")]))
    return {"opening": data["opening"], "cast": data["cast"],
            **{chapter["id"]: chapter for chapter in data["chapters"]}}


def plate(film, key):
    if ":" in key:
        film, key = key.split(":", 1)
    if film == "chapter-one":
        return ROOT / "assets" / "chapter-one-film-art" / f"{key}.webp"
    if key.isdigit():
        return ROOT / "assets" / "story-film-art" / f"{film}-{key}.webp"
    if film == "opening":
        return ROOT / "assets" / "opening-film-art" / f"{OPENING_PLATES[key]}.webp"
    return ROOT / "assets" / "chapter-film-art" / f"{film}-{key}.webp"


def build_shots(film, data):
    boundaries = [*data["captionFrames"], data["filmSeconds"] * FPS]
    if film in CHAPTER_ONE_LEVEL_PLATES:
        for i, (text, images) in enumerate(zip(data["lines"], CHAPTER_ONE_LEVEL_PLATES[film])):
            frames = boundaries[i + 1] - boundaries[i]
            for n, image in enumerate(images):
                yield text, plate("chapter-one", image), frames * (n + 1) // len(images) - frames * n // len(images)
        return
    if "levelPlate" in data:
        for index, (text, image) in enumerate(zip(data["lines"], data["levelPlate"])):
            yield text, image, boundaries[index + 1] - boundaries[index]
        return
    assert len(PLATES[film]) == len(data["lines"]) == len(boundaries) - 1
    for i, text in enumerate(data["lines"]):
        keys = PLATES[film][i]
        count = 2 if len(text.split()) >= SECOND_SHOT_WORDS else 1
        assert count <= len(keys), (film, i, text)
        frames = boundaries[i + 1] - boundaries[i]
        for n, key in enumerate(keys[:count]):
            yield text, plate(film, key), frames * (n + 1) // count - frames * n // count


def render_shot(image, caption, frames, output, index):
    zoom = f"1.032+0.082*on/{frames-1}"
    drift = f"0.46+0.07*on/{frames-1}" if index % 2 else f"0.54-0.07*on/{frames-1}"
    picture = (
        "[0:v]scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,"
        f"zoompan=z='{zoom}':x='(iw-iw/zoom)*({drift})':y='(ih-ih/zoom)*0.48':"
        f"d={frames}:s=720x1280:fps={FPS}"
    )
    filters = picture + ("[picture];[picture][1:v]overlay=x=(W-w)/2:y='min(0.81*H-h/2,0.95*H-h)'"
                         if caption else "") + ",format=yuv420p"
    inputs = ["-i", str(caption)] if caption else []
    subprocess.run([
        "ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(image), *inputs,
        "-filter_complex_threads", "1", "-filter_complex", filters, "-frames:v", str(frames),
        "-an", "-c:v", "libx264", "-threads", "2", "-preset", "ultrafast", "-crf", "20",
        str(output),
    ], check=True)


def render_film(film, data, output, font, blender=None):
    shots = list(build_shots(film, data))
    assert all(image.is_file() for _, image, _ in shots), (film, [str(image) for _, image, _ in shots])
    with TemporaryDirectory(dir=output) as folder:
        scratch = Path(folder)
        if blender:
            render_blender(shots, scratch, output / f"{film}.mp4", font, blender, motion=film in CHAPTER_ONE_CINEMATICS)
            print(f"{film}: {data['filmSeconds']} seconds, {len(shots)} Blender shots", flush=True)
            return
        names = []
        for index, (text, image, frames) in enumerate(shots):
            title = scratch / "caption.png" if text else None
            if title:
                make_caption(text, 720, font).save(title)
            name = f"shot-{index}.mp4"
            render_shot(image, title, frames, scratch / name, index)
            names.append(name)
        sequence = scratch / "cut.txt"
        sequence.write_text("".join(f"file '{name}'\n" for name in names), encoding="ascii")
        subprocess.run([
            "ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-f", "concat", "-safe", "1",
            "-i", str(sequence), "-c:v", "libx264", "-threads", "4", "-preset", "fast",
            "-crf", "21", "-movflags", "+faststart", str(output / f"{film}.mp4"),
        ], check=True)
    print(f"{film}: {data['filmSeconds']} seconds, {len(shots)} shots", flush=True)


def render_blender(shots, scratch, output, font, blender, motion=False):
    raw = scratch / "story.mp4"
    manifest = {"fps": FPS, "output": str(raw), "shots": [], "chapterOneMotion": motion}
    for index, (text, image, frames) in enumerate(shots):
        caption = scratch / f"caption-{index}.png" if text else None
        if caption:
            make_caption(text, 720, font).save(caption)
        manifest["shots"].append({
            "image": str(image), "caption": str(caption) if caption else None, "frames": frames,
        })
    job = scratch / "blender-story.json"
    job.write_text(json.dumps(manifest), encoding="utf-8")
    result = subprocess.run([
        str(blender), "-b", "-t", "4", "--factory-startup", "--python-exit-code", "1",
        "--python", str(Path(__file__).with_name("blender_story_sequence.py")), "--", str(job),
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout)
    # Keep the higher-motion plates compact enough for phone playback.
    encoding = ["-c:v", "libx264", "-threads", "3", "-preset", "fast",
                "-crf", "22", "-pix_fmt", "yuv420p"] if motion else ["-c", "copy"]
    subprocess.run([
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(raw),
        *encoding, "-movflags", "+faststart", str(output),
    ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--font", type=Path, required=True)
    parser.add_argument("--levels", action="store_true", help="Render minigame level films")
    parser.add_argument("--blender", type=Path, help="Assemble the film in Blender's video sequencer")
    parser.add_argument("film", nargs="*")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    films = read_level_films() if args.levels else read_films()
    for film in args.film or films:
        render_film(film, films[film], args.output.resolve(), args.font,
                    args.blender.resolve() if args.blender else None)


def read_level_films():
    source = (ROOT / "levels.js").read_text(encoding="utf-8")
    chapters = json.loads(source.split("window.TrentLevels = ", 1)[1].strip().removesuffix(";"))
    films = {}
    for chapter, levels in chapters.items():
        for index, level in enumerate(levels):
            if level is None:
                continue
            key = level["id"]
            original = ROOT / "assets" / "level-film-art" / f"{key}.webp"
            establishing = original if level.get("original") else plate(chapter, "1" if index == 0 else "4")
            if not establishing.is_file():
                establishing = original
            films[key] = {
                "filmSeconds": 24,
                "captionFrames": [0, 8 * FPS, 16 * FPS],
                "lines": level["lines"],
                "levelPlate": [establishing, original, original],
            }
    return films


if __name__ == "__main__":
    main()
