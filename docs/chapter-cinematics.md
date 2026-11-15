# Chapter and opening films

The game serves eleven 30-second H.264 chapter films from `assets/intro-video/` and a 31-second opening from `assets/opening.mp4`. Each chapter film uses two original pieces of realistic WWII artwork, four camera setups, and animated weather and lighting rendered in Blender. The campaign overlays the chapter text and plays the existing chapter music. Frosted Skies uses portrait video.

The title screen displays artwork from Chimney Road and scrolls the cast and production credits in a window below the title. The opening film uses four portrait Blender shots with the story captions built into the frames. Players can replay the opening and chapter films from an unlocked chapter menu.

## Render and edit

Install Blender 4.5 LTS and FFmpeg. Run these commands from the repository root.

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/render_fresh_chapter_films.py -- --output .\new-films
```

The Blender script reads the source plates from `assets/chapter-film-art/` and skips completed exports. Add a chapter ID to render just that chapter or add `--preview` to render stills. Review the exports before copying them into `assets/intro-video/`.

Render the opening film from `assets/opening-film-art/` with the same Blender and FFmpeg setup. Edit the caption text and shot times in `tools/render_realistic_opening.py`.

```powershell
blender --background --factory-startup --python-exit-code 1 --python tools/render_realistic_opening.py -- --output .\new-films\opening.mp4
```

Edit chapter prose in `campaign.js`. Update the cache version when publishing replacement media.

## Campaign progression

Start opens the rules. The prologue leads to ten scored chapters with ten WWII questions apiece. Five correct answers are required to play the minigame. Scores of eight through ten apply increasingly useful bonuses, including extra hull, decoys, health, chances, or equipment improvements depending on the game.

Each completion card gives the next chapter’s password and waits for the player to continue. A password opens that chapter and all prior chapters and intros. The completion password also opens the ending. The game remembers the furthest password on the device.
