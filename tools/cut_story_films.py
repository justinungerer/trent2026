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
        [
            "1"
        ],
        [
            "2",
            "b"
        ],
        [
            "3"
        ],
        [
            "yard:3",
            "yard:2"
        ],
        [
            "4"
        ],
        [
            "a"
        ]
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
            "1"
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
OPENING_PLATES = dict(zip("abcd", ("orders", "capture", "gate", "radio")))


def read_films():
    extract = """
    const fs = require('node:fs'), vm = require('node:vm');
    const source = fs.readFileSync(process.argv[1], 'utf8');
    const filmData = source.slice(source.indexOf('var OPENING_FILM = '), source.indexOf('var PIN_TO_ID = '));
    console.log(JSON.stringify(vm.runInNewContext(filmData + '({opening:OPENING_FILM, chapters:CHAPTERS})')));
    """
    data = json.loads(subprocess.check_output(["node", "-e", extract, str(ROOT / "campaign.js")]))
    return {"opening": data["opening"], **{chapter["id"]: chapter for chapter in data["chapters"]}}


def plate(film, key):
    if ":" in key:
        film, key = key.split(":", 1)
    if key.isdigit():
        return ROOT / "assets" / "story-film-art" / f"{film}-{key}.webp"
    if film == "opening":
        return ROOT / "assets" / "opening-film-art" / f"{OPENING_PLATES[key]}.webp"
    return ROOT / "assets" / "chapter-film-art" / f"{film}-{key}.webp"


def build_shots(film, data):
    boundaries = [*data["captionFrames"], data["filmSeconds"] * FPS]
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
    filters = (
        "[0:v]scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,"
        f"zoompan=z='{zoom}':x='(iw-iw/zoom)*({drift})':y='(ih-ih/zoom)*0.48':"
        f"d={frames}:s=720x1280:fps={FPS}[picture];"
        "[picture][1:v]overlay=x=(W-w)/2:y='min(0.81*H-h/2,0.95*H-h)',format=yuv420p"
    )
    subprocess.run([
        "ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(image), "-i", str(caption),
        "-filter_complex_threads", "1", "-filter_complex", filters, "-frames:v", str(frames),
        "-an", "-c:v", "libx264", "-threads", "2", "-preset", "ultrafast", "-crf", "20",
        str(output),
    ], check=True)


def render_film(film, data, output, font):
    shots = list(build_shots(film, data))
    assert all(image.is_file() for _, image, _ in shots), (film, [str(image) for _, image, _ in shots])
    with TemporaryDirectory(dir=output) as folder:
        scratch = Path(folder)
        names = []
        for index, (text, image, frames) in enumerate(shots):
            title = scratch / "caption.png"
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--font", type=Path, required=True)
    parser.add_argument("film", nargs="*")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    films = read_films()
    for film in args.film or films:
        render_film(film, films[film], args.output.resolve(), args.font)


if __name__ == "__main__":
    main()
