# Campaign films

The game serves a 34-second opening and eleven portrait chapter films that run 28 to 43 seconds. Story captions are built into the MP4s. Captions with at least 16 words stay on screen across two shots. The campaign plays each chapter’s music separately. The 22-second widescreen closing film has its own story captions.

The start screen displays the approved portrait of Trent at 18. The 15-second portrait cast film introduces Trent, Mac, and Buddy. Justin Ungerer's production credits then scroll over the Chimney Road game backdrop in an 84-second repeating cycle; Begin can be tapped at any time to start the opening story film. With reduced motion, the credits are available in a scrollable list. Players can replay the opening story and chapter films from the chapter menu.

## Render and edit

Edit the caption text, caption start frames at 24 fps, and runtimes in `campaign.js`. Shot selections are in `tools/cut_story_films.py`. The cut uses new stills in `assets/story-film-art/` and earlier Blender plates in `assets/chapter-film-art/` and `assets/opening-film-art/`.

Install Blender 4.5, FFmpeg, Node.js, and Python with Pillow. The Blender video sequencer uses the portrait artwork and the caption timings to assemble the cut. The opening shot of Trent with the sealed letter has an empty caption. Run this from the repository root.

```powershell
python -B tools/cut_story_films.py --blender "C:/path/to/blender.exe" --output .\story-films --font C:/Windows/Fonts/segoeui.ttf
```

Add film IDs to the command to export specific cuts. Add `--levels` to render the 24-second minigame films from the scripts in `levels.js`. Copy the cast and opening films to `assets/`, chapter files to `assets/intro-video/`, and minigame files to `assets/level-video/`. Update the media cache version when publishing.

## Campaign progression

Start begins a new game when the password field is empty and opens the chapter menu with a valid password. How to play opens the rules. The prologue leads to ten scored chapters with ten WWII questions apiece. Each chapter has its own minigame with three progressively more difficult levels. Five correct answers are required to play the minigame. Scores of eight through ten grant a fresh bonus loadout on each level.

Each completion card gives the next chapter’s password and waits for the player to continue. A password opens that chapter and all prior chapters and intros. The completion password also opens the ending. The game remembers the furthest password on the device.
