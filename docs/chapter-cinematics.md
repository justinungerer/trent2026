# Chapter and opening films

The game serves eleven 20-second H.264 chapter films from `assets/intro-video/` and a 31-second opening from `assets/opening.mp4`. The chapter clips combine the Blender motion plates with new scene-specific detail shots, reframing, and color grading. The campaign adds the scrolling text and plays the existing chapter music. Frosted Skies uses portrait video.

The opening uses the game’s illustrated environments and animated cels to stage the fictional capture sequence. Casting cards, story captions, and matching role/name credits are HTML so they remain readable over the film. The in-game opening and the chapter films can be replayed from an unlocked chapter menu.

## Render and edit

Install Blender 4.5 LTS, Node.js, Python with Pillow, and FFmpeg. Run these from the repository root.

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/render_chapter_intros.py -- --output .\raw-intros
python tools/edit_campaign_films.py .\raw-intros .\edited-intros
python tools/render_opening_film.py .\edited-intros\opening.mp4
```

Review the exports before copying the eleven chapter videos into `assets/intro-video/` and the opening video into `assets/`. For a Blender still preview, add `--preview` and one chapter ID. Use `--save-project .\projects` to save editable Blender scenes with the art packed inside. The Blender renderer skips MP4s already in its output directory.

Edit chapter prose and opening captions in `campaign.js`. Update the cache version when publishing replacement media.

## Campaign progression

Start opens the rules. The prologue leads to ten scored chapters with ten WWII questions apiece. Five correct answers are required to play the minigame. Scores of eight through ten apply increasingly useful bonuses, including extra hull, decoys, health, chances, or equipment improvements depending on the game.

Each completion card gives the next chapter’s password and waits for the player to continue. A password opens that chapter and all prior chapters and intros. The completion password also opens the ending. The game remembers the furthest password on the device.
