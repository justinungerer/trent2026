from pathlib import Path
import concurrent.futures
from tempfile import TemporaryDirectory
from PIL import Image, ImageEnhance, ImageFilter
import subprocess
import sys

root=Path(sys.argv[1])
out=Path(sys.argv[2])
out.mkdir(parents=True,exist_ok=True)
plans = {
'prologue': ((.28,.68),(.79,.70),.12,-.04),
'night': ((.62,.73),(.77,.51),-.20,.07),
'frost': ((.49,.48),(.60,.62),-.04,.07),
'rail': ((.40,.68),(.67,.70),.05,.02),
'yard': ((.38,.56),(.72,.40),.10,-.03),
'tower': ((.33,.60),(.67,.63),-.08,.03),
'shelf': ((.22,.63),(.69,.52),-.06,.04),
'wire': ((.24,.62),(.67,.52),-.18,.08),
'camp': ((.50,.64),(.69,.52),-.13,.06),
'wrap': ((.43,.66),(.67,.58),.20,-.03),
'chimney': ((.48,.52),(.82,.41),-.08,.08),
}
ASSETS = Path(__file__).resolve().parents[1]
INSERTS = {
    'prologue':'prologue/art/hedgehog.webp',
    'night':'night-broadcast/art/radio.webp',
    'frost':'frosted-skies/art/hauler.webp',
    'rail':'white-rail/art/handcar.webp',
    'yard':'chapter-2/art/mail.webp',
    'tower':'switch-tower/art/board.webp',
    'shelf':'shelf-escape/art/props/depot-key.webp',
    'wire':'listening-wire/art/lamp.webp',
    'camp':'holding-camp/art/brawl-gate.webp',
    'wrap':'wrapping-line/art/present-ribbon.webp',
    'chimney':'chimney-road/art/sleigh.webp',
}

def detail(slug, source, folder, w, h):
    still = folder/'still.png'
    subprocess.run(['ffmpeg','-v','error','-y','-ss','5','-i',str(source),'-frames:v','1',str(still)],check=True)
    plate=Image.open(still).convert('RGB').filter(ImageFilter.GaussianBlur(max(12,w//48)))
    plate=ImageEnhance.Brightness(plate).enhance(.50)
    source_prop=Image.open(ASSETS/INSERTS[slug]).convert('RGBA')
    box=source_prop.getbbox()
    if box: source_prop=source_prop.crop(box)
    prop=source_prop.resize((round(source_prop.width * min(.62*w/source_prop.width,.54*h/source_prop.height)),
                             round(source_prop.height * min(.62*w/source_prop.width,.54*h/source_prop.height))),Image.Resampling.LANCZOS)
    target=folder/'insert.mp4'
    cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}',
         '-framerate','24','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','17',str(target)]
    task=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    with task.stdin:
        for frame in range(60):
            t=frame/59
            zoom=1+.16*(t*t*(3-2*t))
            carved=prop.resize((round(prop.width*zoom),round(prop.height*zoom)), Image.Resampling.BICUBIC)
            canvas=plate.copy()
            x=round(w*(.54 + .045*t) - carved.width/2)
            y=round(h*.49 - carved.height/2)
            canvas.paste(carved,(x,y),carved)
            task.stdin.write(canvas.tobytes())
    if task.wait(): raise RuntimeError(f'Failed to render the {slug} insert')
    return target

def render(item):
    slug,(a,b,red,blue)=item
    source=root/f'{slug}.mp4'
    w,h=(720,1280) if slug=='frost' else (1280,720)
    timings=[(0,4,1, .5,.5),(6.5,9,1.23,*a),(9,14,1.10,.5,.51),(14,18,1.26,*b),(18,20,1,.5,.5)]
    filters=[]
    for i,(start,end,z,x,y) in enumerate(timings):
        cw=int(w/z)//2*2; ch=int(h/z)//2*2
        left=min(w-cw,max(0,int(w*x-cw/2)))//2*2
        top=min(h-ch,max(0,int(h*y-ch/2)))//2*2
        filters.append(f'[src{i}]trim=start={start}:end={end},setpts=PTS-STARTPTS,crop={cw}:{ch}:{left}:{top},scale={w}:{h}:flags=lanczos,setsar=1[s{i}]')
    grade=f'colorbalance=rs={red*.28:.3f}:bs={blue:.3f},eq=contrast=1.04:saturation=0.92'
    graph='[0:v]split=5'+''.join(f'[src{i}]' for i in range(5))+';'+';'.join(filters)+';[1:v]setsar=1[cut];[s0][cut][s1][s2][s3][s4]'+f'concat=n=6:v=1:a=0,{grade},fade=t=in:st=0:d=0.20,fade=t=out:st=19.65:d=0.35[v]'
    target=out/f'{slug}.mp4'
    with TemporaryDirectory(dir=out) as temp:
        insert=detail(slug,source,Path(temp),w,h)
        subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(source),'-i',str(insert),'-filter_complex_threads','2',
            '-filter_complex',graph,'-map','[v]','-an','-r','24','-c:v','libx264','-threads','3','-preset','medium',
            '-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
    print(slug,target.stat().st_size,flush=True)
if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(render, plans.items()))
