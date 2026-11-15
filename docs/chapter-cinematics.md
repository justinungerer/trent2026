# Campaign films

The game serves a 34-second opening and eleven portrait chapter films that run 28 to 43 seconds. Story captions are built into the MP4s. Captions with at least 16 words stay on screen across two shots. The campaign plays each chapter’s music separately. The 22-second widescreen closing film has its own story captions.

The title screen displays artwork from Chimney Road and scrolls cast and production credits below the title. Players can replay the opening and chapter films from an unlocked chapter menu.

## Render and edit

Edit the caption text, caption start frames at 24 fps, and runtimes in `campaign.js`. Shot selections are in `tools/cut_story_films.py`. The cut uses new stills in `assets/story-film-art/` and earlier Blender plates in `assets/chapter-film-art/` and `assets/opening-film-art/`.

Install FFmpeg, Node.js, and Python with Pillow. Run this from the repository root.

```powershell
python tools/cut_story_films.py --output .\story-films --font C:/Windows/Fonts/segoeui.ttf
```

Add film IDs to the command to export specific cuts. Copy the approved opening to `assets/opening.mp4` and the eleven chapter files to `assets/intro-video/`. Update the media cache version when publishing.

## Campaign progression

Start opens the rules. The prologue leads to ten scored chapters with ten WWII questions apiece. Five correct answers are required to play the minigame. Scores of eight through ten apply increasingly useful bonuses, including extra hull, decoys, health, chances, or equipment improvements depending on the game.

Each completion card gives the next chapter’s password and waits for the player to continue. A password opens that chapter and all prior chapters and intros. The completion password also opens the ending. The game remembers the furthest password on the device.
