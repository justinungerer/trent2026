"""Render the illustrated opening film from the game's painted scenes and animation cels."""
from pathlib import Path
import math
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
W, H, FPS = 1280, 720, 24
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "opening.mp4"

def art(name):
    return Image.open(ROOT / name).convert("RGBA")

def cels(name, width, height, count):
    atlas = art("holding-camp/art/" + name + ".webp")
    return [atlas.crop((width*i, 0, width*(i+1), height)) for i in range(count)]

backgrounds = [
    art("chimney-road/art/panorama.webp"), art("assets/depot.webp"),
    art("holding-camp/art/scene.webp"), art("holding-camp/art/brawl-yard.webp"),
    art("night-broadcast/art/scene.webp"),
]
santa_walk = cels("brawl-santa-walk", 442, 476, 4)
santa_recoil = cels("brawl-santa-hit", 442, 476, 2)
santa_down = cels("brawl-santa-defeat", 442, 476, 2)
guards = cels("brawl-mid-walk", 378, 476, 2)
guard_strike = cels("brawl-heavy-punch", 426, 476, 4)
sentry = art("holding-camp/art/warden.webp")
radio = art("night-broadcast/art/radio.webp")

def layout(image, progress, zoom=0.12, offset=0.5):
    size = (round(W*(1+zoom*progress)), round(H*(1+zoom*progress)))
    surface = ImageOps.fit(image, size, Image.Resampling.BICUBIC, centering=(offset, .53))
    left = round((size[0]-W)*offset)
    top = (size[1]-H)//2
    return surface.crop((left,top,left+W,top+H))

def stage(frame, sprite, x, baseline, height, flip=False, shadow=False):
    width = max(1, round(sprite.width * height / sprite.height))
    sprite = sprite.resize((width,height),Image.Resampling.BICUBIC)
    if flip:
        sprite = ImageOps.mirror(sprite)
    if shadow:
        mask = sprite.getchannel("A")
        sprite = Image.new("RGBA",sprite.size,(12,18,24,255))
        sprite.putalpha(mask)
    frame.alpha_composite(sprite,(round(W*x-width/2),round(H*baseline-height)))

randomizer = random.Random(1912)
snow = [(randomizer.random(),randomizer.random(),randomizer.uniform(10,42)) for _ in range(85)]
def film_frame(time):
    if time < 5:
        shot, local, length = 0, time, 5
    elif time < 11:
        shot, local, length = 1, time-5, 6
    elif time < 17:
        shot, local, length = 2, time-11, 6
    elif time < 24:
        shot, local, length = 3, time-17, 7
    else:
        shot, local, length = 4, time-24, 7
    p = local/length
    frame=layout(backgrounds[shot],p, .24 if shot == 3 else .13, .63 if shot == 1 else .5)
    frame=ImageEnhance.Color(frame).enhance(.76 if shot in (1,3) else .88)
    frame=ImageEnhance.Brightness(frame).enhance(.70 if shot in (1,3) else .84)
    cycle=int(time*7)
    if shot==1:
        stage(frame,sentry,.74,.82,430,shadow=True)
        stage(frame,guards[cycle%2],.44+.14*p,.73,287)
        stage(frame,santa_walk[cycle%4],.32+.14*p,.76,306)
    elif shot==2:
        stage(frame,guards[cycle%2],.22+.33*p,.79,248)
        stage(frame,santa_walk[cycle%4],.36+.29*p,.81,310)
        stage(frame,guards[(cycle+1)%2],.48+.30*p,.78,279)
    elif shot==3:
        # Cut from the strike and recoil to Santa on the floor. Keep it in shadow.
        strike=min(3,int((local % 1.8)*5))
        stage(frame,guard_strike[strike],.42,.82,450,shadow=True)
        if local<4:
            stage(frame,santa_recoil[cycle%2],.62+.028*math.sin(local*4),.82,380,flip=True)
        else:
            stage(frame,santa_down[1],.65,.86,355,flip=True)
        bars = Image.new("RGBA",(W,H))
        painter=ImageDraw.Draw(bars)
        for x in range(70, W, 161):
            shift=int(x-50*p)
            painter.rectangle((shift,0,shift+17,H),fill=(3,12,19,172))
        frame.alpha_composite(bars)
    elif shot==4:
        stage(frame,radio,.62,.85,320)

    if shot in (0,2,4):
        particles = Image.new("RGBA",(W,H))
        draw=ImageDraw.Draw(particles)
        for x,y,speed in snow:
            px=int((x*W - time*speed*.45)%W)
            py=int((y*H + time*speed)%H)
            radius=2 if speed>30 else 1
            draw.ellipse((px-radius,py-radius,px+radius,py+radius),fill=(226,238,252,115))
        frame.alpha_composite(particles)
    fade = max(0,min(1,local/.18,(length-local)/.20))
    return Image.blend(Image.new("RGB",(W,H),(4,10,17)),frame.convert("RGB"),fade)

def main():
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    encoder=subprocess.Popen([
        "ffmpeg","-v","error","-nostdin","-y","-f","rawvideo","-pixel_format","rgb24",
        "-video_size",f"{W}x{H}","-framerate",str(FPS),"-i","pipe:0","-an","-c:v","libx264",
        "-threads","4","-preset","fast","-crf","21","-pix_fmt","yuv420p","-movflags","+faststart",str(OUTPUT)
    ],stdin=subprocess.PIPE)
    with encoder.stdin:
        for i in range(31*FPS):
            encoder.stdin.write(film_frame(i/FPS).tobytes())
    if encoder.wait():
        raise SystemExit(encoder.returncode)

if __name__=="__main__":
    main()
