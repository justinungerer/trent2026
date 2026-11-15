# Chapter cinematics

The prologue and all ten chapters play silent Blender renders from `assets/intro-video/`. The game layers the scene-setting crawl and the existing chapter theme over each clip. The chapter ID in `campaign.js` is the filename. Frosted Skies uses a portrait render. The other chapters use landscape renders.

## Render a chapter

Install [Blender 4.5 LTS](https://www.blender.org/releases/4-5/) and make Node.js and FFmpeg available on the command line. From the repository root, render a still first to check framing.

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/render_chapter_intros.py -- --preview --output .\intro-preview night
```

Render the 20-second H.264 clip at 24 frames per second after checking the still.

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/render_chapter_intros.py -- --output .\intro-preview night
```

Omit the chapter ID to render all scenes. Use `--save-project .\intro-preview` to save editable Blender projects with the artwork packed inside. The script skips complete MP4s already present in its output directory. Use a separate output directory when revising a shot, then copy the approved MP4 into `assets/intro-video/`.

The renderer reads the existing artwork and animation atlas paths from `campaign.js`. Adjust the camera travel, weather, lighting, and actor blocking in `tools/render_chapter_intros.py`. Edit the scrolling prose in the chapter's `lines` array in `campaign.js`.

## Playback checks

Serve the repository over HTTP and use the campaign test menu to replay introductions. Confirm that the right clip and theme start, the three text passages scroll in order, and Skip stops both the video and its theme. On a phone, check that the video pauses behind the rotate-screen prompt and continues after rotation. With reduced motion enabled or if video playback fails, the game uses its canvas artwork.
